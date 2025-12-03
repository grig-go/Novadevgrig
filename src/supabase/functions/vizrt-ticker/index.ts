// File: supabase/functions/vizrt-ticker/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Get timezone from environment variable
    const timezone = Deno.env.get('TICKER_TIMEZONE') || 'UTC';
    console.log('Using timezone:', timezone);
    // Parse the URL to get channel name
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const channelName = pathParts[pathParts.length - 1] || '';
    if (!channelName) {
      return new Response(JSON.stringify({
        error: 'Channel name is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get query parameters
    const includeInactive = url.searchParams.get('include_inactive') === 'true';
    const includeIds = url.searchParams.get('includeIds') === 'true';
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // 1. Find the channel from the channels table (stores channel configuration)
    // The channel name should always be queried from this table
    const { data: channel, error: channelError } = await supabaseClient.from('channels').select('*').eq('name', decodeURIComponent(channelName)).single();
    if (channelError || !channel) {
      return new Response(JSON.stringify({
        error: `Channel "${channelName}" not found`
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // 2. Get playlists for this channel from channel_playlists (stores hierarchy)
    // Use channel_id to link playlists to their channel
    const playlistQuery = supabaseClient.from('channel_playlists').select('*').eq('channel_id', channel.id).eq('type', 'playlist').order('order');
    if (!includeInactive) {
      playlistQuery.eq('active', true);
    }
    const { data: playlists } = await playlistQuery;
    // 3. Build XML structure
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<!DOCTYPE tickerfeed SYSTEM "http://www.vizrt.com/ticker/tickerfeed-2.4.dtd">\n';
    xml += '<tickerfeed version="2.4">\n';
    // Track bucket instance counts across all playlists for unique IDs
    const bucketInstanceCounts: Map<string, number> = new Map();

    // 4. Process each playlist
    for (const playlist of playlists || []){
      const playlistXml = await buildPlaylistXml(playlist, supabaseClient, includeInactive, timezone, includeIds, bucketInstanceCounts);
      if (playlistXml) {
        xml += playlistXml;
      }
    }
    xml += '</tickerfeed>';
    // Return XML response
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function buildPlaylistXml(playlist, supabase, includeInactive, timezone, includeIds = false, bucketInstanceCounts: Map<string, number> = new Map()) {
  // Check if playlist is currently active based on its schedule
  if (!isCurrentlyActive(playlist.schedule, timezone)) {
    return null; // Skip this entire playlist if it's not scheduled to be active
  }
  // Get buckets for this playlist
  const bucketQuery = supabase.from('channel_playlists').select('*').eq('parent_id', playlist.id).eq('type', 'bucket').order('order');
  if (!includeInactive) {
    bucketQuery.eq('active', true);
  }
  const { data: buckets } = await bucketQuery;
  if (!buckets || buckets.length === 0) return null;
  // Filter buckets that are currently active
  const activeBuckets = [];
  for (const bucket of buckets){
    if (isCurrentlyActive(bucket.schedule, timezone)) {
      activeBuckets.push(bucket);
    }
  }
  if (activeBuckets.length === 0) return null;

  // Use playlist properties for XML attributes
  const playlistType = playlist.carousel_type || determinePlaylistType(playlist);
  const carouselName = playlist.carousel_name || playlist.name;
  const target = playlist.target || 'carousel';

  let xml = `  <playlist type="${playlistType}" name="${escapeXml(carouselName)}" target="${escapeXml(target)}">\n`;
  // Add defaults
  xml += '    <defaults>\n';
  xml += '      <template>default_template</template>\n';
  xml += `      <gui-color>${generateColorForPlaylist(playlist.name)}</gui-color>\n`;
  xml += '    </defaults>\n';
  // Build groups for each active bucket
  for (const bucket of activeBuckets){
    const groupXml = await buildGroupXml(bucket, supabase, includeInactive, timezone, includeIds, bucketInstanceCounts);
    if (groupXml) xml += groupXml;
  }
  xml += '  </playlist>\n';
  return xml;
}
async function buildGroupXml(bucket, supabase, includeInactive, timezone, includeIds = false, bucketInstanceCounts: Map<string, number> = new Map()) {
  const elements = await getElementsForBucket(bucket, supabase, includeInactive, timezone, bucketInstanceCounts);
  if (elements.length === 0) return null;
  let xml = `    <group use_existing="${bucket.content_id || ''}">\n`;
  xml += `      <description>${escapeXml(bucket.name)}</description>\n`;
  xml += `      <gui-color>${generateDistinctColorForBucket(bucket)}</gui-color>\n`;
  xml += '      <elements>\n';
  for (const element of elements){
    xml += buildElementXml(element, 4, includeIds);
  }
  xml += '      </elements>\n';
  xml += '    </group>\n';
  return xml;
}
async function getElementsForBucket(bucket, supabase, includeInactive, timezone, bucketInstanceCounts: Map<string, number> = new Map()) {
  const items = await getItemsForBucket(bucket, supabase, includeInactive, timezone);
  const elements = [];
  for (const item of items){
    const itemElements = await createElement(item, supabase);
    // createElement can now return either a single element or an array of elements
    if (Array.isArray(itemElements)) {
      elements.push(...itemElements);
    } else {
      elements.push(itemElements);
    }
  }

  // Check for generateItem config to prepend a generated element as first child
  if (bucket.content_id) {
    const { data: bucketContent } = await supabase
      .from('content')
      .select('bucket_config')
      .eq('id', bucket.content_id)
      .single();

    const generateItemConfig = bucketContent?.bucket_config?.generateItem;
    if (generateItemConfig?.enabled && generateItemConfig?.templateId) {
      // Fetch template name from templates table
      const { data: template } = await supabase
        .from('templates')
        .select('name')
        .eq('id', generateItemConfig.templateId)
        .single();

      if (template) {
        // Get and increment the instance count for this bucket
        const instanceIndex = bucketInstanceCounts.get(bucket.id) || 0;
        bucketInstanceCounts.set(bucket.id, instanceIndex + 1);

        const generatedElement: {
          id: string;
          template: string;
          fields: { name: string; value: string }[];
          duration?: string;
        } = {
          id: `${bucket.id}_${instanceIndex}`,  // Bucket-based ID with dynamic instance index
          template: template.name,
          fields: []
        };

        // Add field if configured
        if (generateItemConfig.fieldName && generateItemConfig.fieldValue) {
          generatedElement.fields.push({
            name: generateItemConfig.fieldName,
            value: generateItemConfig.fieldValue
          });
        }

        // Add duration if configured
        if (generateItemConfig.duration) {
          generatedElement.duration = generateItemConfig.duration.toString();
        }

        // Prepend as first element
        elements.unshift(generatedElement);
        console.log(`Generated item with template ${template.name} as first child (instance ${instanceIndex})`);
      }
    }
  }

  return elements;
}
async function getItemsForBucket(bucket, supabase, includeInactive, timezone) {
  if (!bucket.content_id) return [];

  // This function recursively gets all items from a container (bucket or itemFolder)
  async function getAllItemsRecursive(containerId) {
    const allItems = [];
    // Get all direct children of this container
    const query = supabase.from('content').select('*').eq('parent_id', containerId).order('order');
    if (!includeInactive) {
      query.eq('active', true);
    }
    const { data: children } = await query;
    for (const child of children || []){
      if (child.type === 'item') {
        // Check if this item is currently active based on its schedule
        if (isCurrentlyActive(child.schedule, timezone)) {
          allItems.push(child);
        }
      } else if (child.type === 'itemFolder') {
        // Check if this itemFolder is currently active based on its schedule
        if (isCurrentlyActive(child.schedule, timezone)) {
          // ItemFolder is active - recursively get all items from within it
          const itemsFromFolder = await getAllItemsRecursive(child.id);
          allItems.push(...itemsFromFolder);
        }
      // If itemFolder is not active, skip all its contents
      }
    // Note: We ignore other types that might be in the content tree
    }
    return allItems;
  }

  // Get regular items from the bucket
  const items = await getAllItemsRecursive(bucket.content_id);


  return items;
}
async function createElement(item, supabase) {
  // Get item fields
  const { data: fields } = await supabase.from('item_tabfields').select('*').eq('item_id', item.id);
  const element: {
    id: string;
    fields: { name: string; value: string }[];
    template?: string;
    duration?: string;
    ttl?: { action: string; value: string };
  } = {
    id: item.id,  // Include item ID for optional XML output
    fields: []
  };
  // Get template info including form schema for custom components
  let templateName = null;
  let formSchema = null;
  if (item.template_id) {
    // Get template name
    const { data: template, error: templateError } = await supabase.from('templates').select('name').eq('id', item.template_id).single();
    console.log(`Template lookup for item ${item.id}: template_id=${item.template_id}, found=${!!template}, error=${templateError?.message || 'none'}`);
    if (template) {
      templateName = template.name;
      element.template = template.name;
    }

    // Get form schema from template_forms table (separate from templates table)
    const { data: templateForm, error: formError } = await supabase.from('template_forms').select('schema').eq('template_id', item.template_id).single();
    console.log(`Template form lookup: found=${!!templateForm}, error=${formError?.message || 'none'}`);
    if (templateForm?.schema) {
      formSchema = templateForm.schema;
      console.log(`Form schema type: ${typeof formSchema}, has components: ${!!formSchema?.components}`);
      if (formSchema?.components) {
        console.log(`Form schema components: ${JSON.stringify(formSchema.components.map(c => ({ key: c.key, type: c.type })))}`);
      }
    }
  } else {
    console.log(`Item ${item.id} has no template_id`);
  }

  // Check if this item contains a school closings or election component that should generate multiple elements
  let hasSchoolClosingsComponent = false;
  for (const field of fields || []) {
    if (!field.name.startsWith('__')) {
      const componentConfig = formSchema ? findComponentInSchema(formSchema, field.name) : null;
      if (componentConfig?.type === 'schoolClosings') {
        hasSchoolClosingsComponent = true;
        // Process school closings and return multiple elements
        console.log(`Found schoolClosings component, processing...`);
        return await processSchoolClosingsComponent(field, componentConfig, supabase, item);
      }
      if (componentConfig?.type === 'election') {
        // Process election and return multiple elements
        console.log(`Found election component, processing...`);
        return await processElectionComponent(field, componentConfig, supabase, item);
      }
    }
  }

  // Add all fields, handling custom components
  for (const field of fields || []) {
    // Skip internal metadata fields
    if (field.name.startsWith('__')) {
      continue;
    }
    // Check if this field is a custom component that needs special handling
    const componentConfig = formSchema ? findComponentInSchema(formSchema, field.name) : null;

    console.log(`Processing field: ${field.name}, componentConfig type: ${componentConfig?.type}, formSchema exists: ${!!formSchema}`);

    if (componentConfig?.type === 'weatherCities' || componentConfig?.type === 'weatherLocations') {
      // Handle Weather Cities component - fetch fresh data
      // Support both 'weatherCities' (new) and 'weatherLocations' (legacy) types
      console.log(`Found ${componentConfig.type} component, processing...`);
      const weatherResult = await processWeatherCitiesComponent(field, componentConfig, supabase);
      element.fields.push(...weatherResult.fields);

      // Override template name if specified in component config
      if (weatherResult.templateName) {
        element.template = weatherResult.templateName;
      }
    } else if (componentConfig?.type === 'weatherForecast') {
      // Handle Weather Forecast component - fetch multi-day forecast
      console.log(`Found weatherForecast component, processing...`);
      const forecastResult = await processWeatherForecastComponent(field, componentConfig, supabase);
      element.fields.push(...forecastResult.fields);

      // Override template name if specified in component config
      if (forecastResult.templateName) {
        element.template = forecastResult.templateName;
      }
    } else {
      // Regular field
      element.fields.push({
        name: field.name,
        value: field.value
      });
    }
  }
  // Only add duration if explicitly set on the item
  if (item.duration && item.duration > 0) {
    element.duration = item.duration.toString();
  }
  // Add TTL for time-sensitive content
  if (hasTimeSensitiveField(fields || [])) {
    element.ttl = {
      action: 'remove',
      value: '3600'
    };
  }
  return element;
}

// Find a component in the form schema by its key
function findComponentInSchema(schema, key) {
  if (!schema?.components) {
    console.log('findComponentInSchema: No components in schema');
    return null;
  }

  console.log(`findComponentInSchema: Looking for key "${key}" in schema with ${schema.components.length} top-level components`);

  function searchComponents(components) {
    for (const component of components) {
      console.log(`  Checking component: key="${component.key}", type="${component.type}"`);
      if (component.key === key) {
        console.log(`  Found matching component!`);
        return component;
      }
      if (component.components) {
        const found = searchComponents(component.components);
        if (found) return found;
      }
      if (component.columns) {
        for (const col of component.columns) {
          if (col.components) {
            const found = searchComponents(col.components);
            if (found) return found;
          }
        }
      }
      // Handle tabs structure
      if (component.type === 'tabs' && Array.isArray(component.components)) {
        for (const tab of component.components) {
          if (tab.components) {
            const found = searchComponents(tab.components);
            if (found) return found;
          }
        }
      }
    }
    return null;
  }

  return searchComponents(schema.components);
}

// Process Weather Cities component - fetch fresh weather data
async function processWeatherCitiesComponent(field, config, supabase) {
  const fields = [];

  // Get component settings
  const templateName = config.templateName || '';
  const field1 = config.field1 || '01';
  const field2 = config.field2 || '02';
  const field3 = config.field3 || '03';
  const format = config.format || '{{name}} {{temperature}}°F';
  const fieldNames = [field1, field2, field3];

  // Parse the stored value to get selected city IDs
  let selectedCityIds = [];
  try {
    // The value might be stored as the XML output or as JSON array of IDs
    const value = field.value;
    if (value.startsWith('[')) {
      selectedCityIds = JSON.parse(value);
    } else {
      // Try to extract IDs from a different format, or re-query
      // For now, we'll need to store city IDs separately
      // Let's check if there's a companion field with IDs
      console.log('Weather Cities value is not JSON array, checking for city IDs');
    }
  } catch (e) {
    console.error('Error parsing weather cities value:', e);
  }

  // If we have city IDs, fetch fresh weather data
  if (selectedCityIds.length > 0) {
    // Fetch weather locations from database
    const { data: locations } = await supabase
      .from('weather_locations')
      .select('*')
      .in('id', selectedCityIds);

    // Create a map for quick lookup maintaining order
    const locationMap = new Map();
    for (const loc of locations || []) {
      locationMap.set(loc.id, loc);
    }

    // Fetch weather for each city and generate output
    for (let i = 0; i < selectedCityIds.length && i < 3; i++) {
      const cityId = selectedCityIds[i];
      const location = locationMap.get(cityId);

      if (location) {
        // Fetch current weather from Open-Meteo API
        const weather = await fetchWeatherData(location.lat, location.lon);

        // Build template variables
        const vars = {
          name: location.custom_name || location.name || 'Unknown',
          country: location.country || '',
          admin1: location.admin1 || '',
          temperature: weather?.temperature ? Math.round(weather.temperature) : 'N/A',
          conditions: weather?.conditions || 'N/A'
        };

        // Replace template variables in format string
        let formatted = format;
        for (const [key, value] of Object.entries(vars)) {
          formatted = formatted.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        }

        fields.push({
          name: fieldNames[i],
          value: formatted
        });
      }
    }
  }

  // Don't add _template field - the template is already handled by element.template
  // Return both fields and templateName for override
  return {
    fields,
    templateName: templateName || null
  };
}

// Process Weather Forecast component - fetch multi-day forecast data
async function processWeatherForecastComponent(field, config, supabase) {
  const fields = [];

  // Get component settings
  const templateName = config.templateName || '';
  const dayPrefix = config.dayPrefix || 'DAY';
  const highPrefix = config.highPrefix || 'HI';
  const lowPrefix = config.lowPrefix || 'LO';
  const conditionPrefix = config.conditionPrefix || 'COND';
  const numDays = config.numDays || 3;

  // Parse the stored value to get selected location ID
  let locationId = null;
  try {
    const value = field.value;
    if (value && typeof value === 'string') {
      // The value should be the location ID
      locationId = value;
    }
  } catch (e) {
    console.error('Error parsing weather forecast value:', e);
  }

  // If we have a location ID, fetch fresh forecast data
  if (locationId) {
    // Fetch weather location from database
    const { data: location } = await supabase
      .from('weather_locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (location) {
      // Fetch forecast from Open-Meteo API
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&timezone=auto&forecast_days=${numDays}`
      );
      const data = await response.json();

      if (data?.daily) {
        const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Generate fields for each day
        for (let i = 0; i < numDays && i < data.daily.time.length; i++) {
          const date = new Date(data.daily.time[i]);
          const dayAbbr = dayAbbreviations[date.getDay()];
          const high = Math.round(data.daily.temperature_2m_max[i]);
          const low = Math.round(data.daily.temperature_2m_min[i]);
          const condition = getWeatherDescription(data.daily.weather_code[i]);

          // Add fields with numeric suffix (0, 1, 2, etc.)
          fields.push(
            { name: `${dayPrefix}${i}`, value: dayAbbr },
            { name: `${highPrefix}${i}`, value: String(high) },
            { name: `${lowPrefix}${i}`, value: String(low) },
            { name: `${conditionPrefix}${i}`, value: condition }
          );
        }
      }
    }
  }

  return {
    fields,
    templateName: templateName || null
  };
}

// Process School Closings component - generates multiple elements, one per closing
async function processSchoolClosingsComponent(field, config, supabase, item) {
  const elements = [];

  // Get component settings
  const templateName = config.templateName || '';
  const field1 = config.field1 || '01';
  const field2 = config.field2 || '02';
  const format1 = config.format1 || '{{organization}}';
  const format2 = config.format2 || '{{status}}';
  const regionId = config.defaultRegionId || '';
  const zoneId = config.defaultZoneId || '';

  try {
    // Build query with optional filters
    let query = supabase
      .from('school_closings')
      .select('*');

    // Apply filters if provided
    if (regionId) {
      query = query.eq('region_id', regionId);
    }

    if (zoneId) {
      query = query.eq('zone_id', zoneId);
    }

    // Execute query with ordering
    const { data: closings, error } = await query.order('fetched_at', { ascending: false });

    if (error) {
      console.error('Error fetching school closings:', error);
      return [];
    }

    // Generate one element per closing
    for (let i = 0; i < (closings || []).length; i++) {
      const closing = closings[i];
      // Build template variables
      const vars = {
        organization: closing.organization_name || 'N/A',
        region: closing.region_name || closing.region_id || 'N/A',
        zone: closing.zone_name || closing.zone_id || 'N/A',
        status: closing.status_description || 'Closed',
        statusDay: closing.status_day || 'N/A',
        city: closing.city || '',
        county: closing.county_name || '',
        state: closing.state || ''
      };

      // Replace template variables in format strings
      let formatted1 = format1;
      let formatted2 = format2;
      for (const [key, value] of Object.entries(vars)) {
        formatted1 = formatted1.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
        formatted2 = formatted2.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }

      // Create element for this closing
      // ID format: <item_id>_<index>
      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_${i}`,
        fields: [
          { name: field1, value: formatted1 },
          { name: field2, value: formatted2 }
        ]
      };

      // Add template name if specified
      if (templateName) {
        element.template = templateName;
      }

      // Add duration from item if specified
      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }
  } catch (error) {
    console.error('Error processing school closings:', error);
  }

  return elements;
}

// Process Election component - generates multiple elements (header items, races, proposals, footer items)
async function processElectionComponent(field, config, supabase, item) {
  const elements = [];

  try {
    // Parse the component value to get election configuration
    let electionConfig;
    try {
      console.log('🗳️ Processing election component - field.value:', field.value);
      electionConfig = JSON.parse(field.value);
      console.log('🗳️ Parsed electionConfig:', JSON.stringify(electionConfig));
    } catch (e) {
      console.error('❌ Error parsing election component value:', e);
      return [];
    }

    const {
      electionId,
      regionId = '',
      showParty = false,
      showIncumbentStar = false,
      showZeroVotes = false,
      showEstimatedIn = true,
      headerItems = [],
      footerItems = [],
      raceTemplate = 'VOTE_{numCandidates}HEADS',
      proposalTemplate = 'VOTE_PUBLIC_QUESTION',
      partyMaterialPrefix = 'MATERIAL*ONLINE_2019/N12/MASTER_CONTROL/ELECTIONS/'
    } = electionConfig;

    console.log('🗳️ Election config:', {
      electionId,
      regionId,
      headerItemsCount: headerItems.length,
      footerItemsCount: footerItems.length,
      raceTemplate,
      proposalTemplate
    });

    if (!electionId) {
      console.log('⚠️ No electionId in election component config');
      return [];
    }

    // Generate header items
    for (let i = 0; i < headerItems.length; i++) {
      const headerItem = headerItems[i];

      // Extract template name from object or string
      let templateName = null;
      if (headerItem.template) {
        // Handle object format {label: "...", value: "..."}
        if (typeof headerItem.template === 'object' && headerItem.template.value) {
          templateName = headerItem.template.value;
        } else if (typeof headerItem.template === 'string') {
          templateName = headerItem.template;
        }
      } else if (headerItem.templateName) {
        templateName = headerItem.templateName;
      }

      // Skip if no template specified
      if (!templateName) {
        continue;
      }

      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_header_${i}`,
        fields: []
      };

      element.template = templateName;

      // Add fields from headerItem if provided
      if (headerItem.fields && Array.isArray(headerItem.fields)) {
        for (const fieldDef of headerItem.fields) {
          if (fieldDef.name && fieldDef.value !== undefined) {
            element.fields.push({
              name: fieldDef.name,
              value: String(fieldDef.value)
            });
          }
        }
      }

      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }

    // Fetch election race data from e_race_results (which has the actual vote counts)
    let query = supabase
      .from('e_race_results')
      .select(`
        id,
        race_id,
        precincts_reporting,
        precincts_total,
        percent_reporting,
        total_votes,
        precincts_reporting_override,
        precincts_total_override,
        percent_reporting_override,
        total_votes_override,
        e_races!inner (
          id,
          race_id,
          name,
          display_name,
          type,
          office,
          e_elections!inner (
            id,
            election_id,
            name,
            year
          ),
          e_geographic_divisions (
            code,
            fips_code,
            type
          )
        ),
        e_candidate_results (
          id,
          candidate_id,
          votes,
          vote_percentage,
          winner,
          votes_override,
          vote_percentage_override,
          winner_override,
          e_candidates (
            id,
            candidate_id,
            first_name,
            last_name,
            full_name,
            display_name,
            party_id,
            incumbent,
            incumbent_override,
            e_parties (
              name,
              abbreviation
            )
          )
        )
      `)
      .eq('e_races.e_elections.id', electionId);

    // Apply state filter if regionId is provided
    if (regionId) {
      query = query.eq('e_races.e_geographic_divisions.code', regionId.toUpperCase());
    }

    const { data: raceResults, error: racesError } = await query;

    if (racesError) {
      console.error('❌ Error fetching election races:', racesError);
    }

    console.log(`🗳️ Fetched ${(raceResults || []).length} race results from database`);

    // Also fetch e_race_candidates for withdrew status
    const raceIds = (raceResults || []).map(rr => rr.race_id).filter(Boolean);
    let raceCandidatesMap = new Map();

    if (raceIds.length > 0) {
      const { data: raceCandidatesData } = await supabase
        .from('e_race_candidates')
        .select('race_id, candidate_id, withdrew, withdrew_override')
        .in('race_id', raceIds);

      if (raceCandidatesData) {
        for (const rc of raceCandidatesData) {
          const key = `${rc.race_id}-${rc.candidate_id}`;
          raceCandidatesMap.set(key, rc);
        }
      }
    }

    // Generate race elements
    for (let raceIndex = 0; raceIndex < (raceResults || []).length; raceIndex++) {
      const raceResult = raceResults[raceIndex];
      const race = raceResult.e_races;
      if (!race) continue;

      const candidateResults = raceResult.e_candidate_results || [];

      // Filter out withdrawn candidates and get actual vote data
      let candidates = [];
      for (const candidateResult of candidateResults) {
        const candidate = candidateResult.e_candidates;
        if (!candidate) continue;

        // Check if withdrew
        const raceCandidateKey = `${raceResult.race_id}-${candidateResult.candidate_id}`;
        const raceCandidate = raceCandidatesMap.get(raceCandidateKey);
        const withdrew = raceCandidate?.withdrew_override !== null && raceCandidate?.withdrew_override !== undefined
          ? raceCandidate.withdrew_override
          : raceCandidate?.withdrew;

        if (withdrew) continue;

        // Use override values if present
        const votes = candidateResult.votes_override !== null && candidateResult.votes_override !== undefined
          ? candidateResult.votes_override
          : candidateResult.votes;
        const votePercentage = candidateResult.vote_percentage_override !== null && candidateResult.vote_percentage_override !== undefined
          ? candidateResult.vote_percentage_override
          : candidateResult.vote_percentage;
        const winner = candidateResult.winner_override !== null && candidateResult.winner_override !== undefined
          ? candidateResult.winner_override
          : candidateResult.winner;
        const incumbent = candidate.incumbent_override !== null && candidate.incumbent_override !== undefined
          ? candidate.incumbent_override
          : candidate.incumbent;

        candidates.push({
          votes: votes || 0,
          votePercentage: votePercentage || 0,
          winner: winner || false,
          candidate: candidate,
          incumbent: incumbent || false
        });
      }

      // Sort candidates by votes (descending)
      let sortedCandidates = [...candidates].sort((a, b) => (b.votes || 0) - (a.votes || 0));

      // Filter out candidates with zero votes if showZeroVotes is false
      if (!showZeroVotes) {
        sortedCandidates = sortedCandidates.filter(c => (c.votes || 0) > 0);
      }

      // Calculate total votes for percentages
      const totalVotes = sortedCandidates.reduce((sum, c) => sum + (c.votes || 0), 0);

      // Use override values for race-level data
      const percentReporting = raceResult.percent_reporting_override !== null && raceResult.percent_reporting_override !== undefined
        ? raceResult.percent_reporting_override
        : raceResult.percent_reporting;

      // Create element for this race
      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_race_${raceIndex}`,
        fields: []
      };

      // Regular race - determine template based on number of candidates (after filtering)
      const numCandidates = sortedCandidates.length;
      const templateName = raceTemplate.replace('{numCandidates}', String(numCandidates));
      element.template = templateName;

      // Extract district from geographic division
      const division = race.e_geographic_divisions;
      const district = division?.fips_code || '';

      // Add race-level fields
      element.fields.push(
        { name: 'raceId', value: race.race_id || String(race.id) },
        { name: 'raceName', value: race.display_name || race.name || '' },
        { name: 'district', value: district },
        { name: 'pctRpt', value: String(percentReporting || 0) },
        { name: 'showParty', value: showParty ? '1' : '0' },
        { name: 'repOption', value: showEstimatedIn ? '1' : '0' }
      );

      // Add candidate fields (numbered 1-N)
      for (let i = 0; i < sortedCandidates.length; i++) {
        const candidateData = sortedCandidates[i];
        const candidateInfo = candidateData.candidate;
        const partyInfo = candidateInfo?.e_parties;
        const candidateNum = i + 1;

        const votes = candidateData.votes || 0;
        const percent = candidateData.votePercentage?.toFixed(1) || '0.0';
        const rank = i + 1;
        const isWinner = candidateData.winner || false;
        const isIncumbent = candidateData.incumbent || false;

        // Party color material path
        let partyColorMaterial = '';
        if (showParty && partyInfo?.abbreviation) {
          partyColorMaterial = `${partyMaterialPrefix}${partyInfo.abbreviation.toUpperCase()}`;
        }

        // Format last name with incumbent star if configured
        let lastName = candidateInfo?.last_name || '';
        if (showIncumbentStar && isIncumbent) {
          lastName += '*';
        }

        element.fields.push(
          { name: `partyColor${candidateNum}.material`, value: partyColorMaterial },
          { name: `partyTxt${candidateNum}`, value: partyInfo?.abbreviation || '' },
          { name: `firstName${candidateNum}`, value: candidateInfo?.first_name || '' },
          { name: `lastName${candidateNum}`, value: lastName },
          { name: `percent${candidateNum}`, value: percent },
          { name: `votes${candidateNum}`, value: String(votes) },
          { name: `rank${candidateNum}`, value: String(rank) },
          { name: `winner${candidateNum}`, value: isWinner ? '1' : '0' }
        );
      }

      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }

    // Fetch ballot measures for this election
    console.log(`🗳️ Fetching ballot measures for election ${electionId}`);

    let ballotMeasureQuery = supabase
      .from('e_ballot_measure_results')
      .select(`
        id,
        measure_id,
        yes_votes,
        no_votes,
        yes_percentage,
        no_percentage,
        passed,
        precincts_reporting,
        precincts_total,
        percent_reporting,
        e_ballot_measures!inner (
          id,
          measure_id,
          number,
          title,
          summary,
          type,
          election_id,
          e_elections!inner (
            id,
            election_id
          ),
          e_geographic_divisions (
            code,
            fips_code
          )
        )
      `)
      .eq('e_ballot_measures.election_id', electionId);

    // Apply state filter if regionId is provided
    if (regionId) {
      ballotMeasureQuery = ballotMeasureQuery.eq('e_ballot_measures.e_geographic_divisions.code', regionId.toUpperCase());
    }

    const { data: ballotMeasureResults, error: ballotMeasuresError } = await ballotMeasureQuery;

    if (ballotMeasuresError) {
      console.error('❌ Error fetching ballot measures:', ballotMeasuresError);
    }

    console.log(`🗳️ Fetched ${(ballotMeasureResults || []).length} ballot measure results from database`);

    // Generate ballot measure/proposal elements
    for (let measureIndex = 0; measureIndex < (ballotMeasureResults || []).length; measureIndex++) {
      const measureResult = ballotMeasureResults[measureIndex];
      const measure = measureResult.e_ballot_measures;
      if (!measure) continue;

      // Create element for this ballot measure
      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_ballot_measure_${measureIndex}`,
        fields: [],
        template: proposalTemplate
      };

      // Get vote data
      const yesVotes = measureResult.yes_votes || 0;
      const noVotes = measureResult.no_votes || 0;
      const yesPercent = measureResult.yes_percentage?.toFixed(1) || '0.0';
      const noPercent = measureResult.no_percentage?.toFixed(1) || '0.0';
      const percentReporting = measureResult.percent_reporting || 0;
      const leading = yesVotes > noVotes ? 'YES' : 'NO';

      // Format measure name (e.g., "Prop 1" or just the title)
      const measureName = measure.number
        ? `${measure.type || 'Measure'} ${measure.number}: ${measure.title}`
        : measure.title;

      // Add proposal fields
      element.fields.push(
        { name: 'raceId', value: measure.measure_id || String(measure.id) },
        { name: 'raceName', value: measureName },
        { name: 'pctRpt', value: String(percentReporting) },
        { name: 'yesVotes', value: String(yesVotes) },
        { name: 'yesPercent', value: yesPercent },
        { name: 'noVotes', value: String(noVotes) },
        { name: 'noPercent', value: noPercent },
        { name: 'leading', value: leading }
      );

      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }

    // Generate footer items
    for (let i = 0; i < footerItems.length; i++) {
      const footerItem = footerItems[i];

      // Extract template name from object or string
      let templateName = null;
      if (footerItem.template) {
        // Handle object format {label: "...", value: "..."}
        if (typeof footerItem.template === 'object' && footerItem.template.value) {
          templateName = footerItem.template.value;
        } else if (typeof footerItem.template === 'string') {
          templateName = footerItem.template;
        }
      } else if (footerItem.templateName) {
        templateName = footerItem.templateName;
      }

      // Skip if no template specified
      if (!templateName) {
        continue;
      }

      const element: {
        id: string;
        fields: { name: string; value: string }[];
        template?: string;
        duration?: string;
      } = {
        id: `${item.id}_footer_${i}`,
        fields: []
      };

      element.template = templateName;

      // Add fields from footerItem if provided
      if (footerItem.fields && Array.isArray(footerItem.fields)) {
        for (const fieldDef of footerItem.fields) {
          if (fieldDef.name && fieldDef.value !== undefined) {
            element.fields.push({
              name: fieldDef.name,
              value: String(fieldDef.value)
            });
          }
        }
      }

      if (item.duration && item.duration > 0) {
        element.duration = item.duration.toString();
      }

      elements.push(element);
    }

  } catch (error) {
    console.error('❌ Error processing election component:', error);
  }

  console.log(`🗳️ Returning ${elements.length} total elements (headers + races + footers)`);
  return elements;
}

// Fetch current weather from Open-Meteo API
async function fetchWeatherData(lat, lon) {
  try {
    // Convert lat/lon to numbers if they're strings
    const latitude = typeof lat === 'string' ? parseFloat(lat) : lat;
    const longitude = typeof lon === 'string' ? parseFloat(lon) : lon;

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
    );
    const data = await response.json();

    return {
      temperature: data.current?.temperature_2m,
      conditions: getWeatherDescription(data.current?.weather_code)
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

// Get weather description from WMO code
function getWeatherDescription(code) {
  const weatherCodes = {
    0: 'Clear',
    1: 'Mainly Clear',
    2: 'Partly Cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light Drizzle',
    53: 'Drizzle',
    55: 'Heavy Drizzle',
    61: 'Light Rain',
    63: 'Rain',
    65: 'Heavy Rain',
    71: 'Light Snow',
    73: 'Snow',
    75: 'Heavy Snow',
    77: 'Snow Grains',
    80: 'Light Showers',
    81: 'Showers',
    82: 'Heavy Showers',
    85: 'Light Snow Showers',
    86: 'Snow Showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with Hail',
    99: 'Thunderstorm with Hail'
  };
  return weatherCodes[code] || 'Unknown';
}
function buildElementXml(element, indent, includeIds = false) {
  const spaces = '  '.repeat(indent);
  let xml = `${spaces}<element>\n`;
  // Add id if includeIds is enabled and element has an id
  if (includeIds && element.id) {
    xml += `${spaces}  <id>${escapeXml(element.id)}</id>\n`;
  }
  // Add template first if specified
  if (element.template) {
    xml += `${spaces}  <template>${escapeXml(element.template)}</template>\n`;
  }
  // Add fields
  for (const field of element.fields){
    xml += `${spaces}  <field name="${escapeXml(field.name)}">${escapeXml(field.value)}</field>\n`;
  }
  // Add optional properties
  if (element.duration) {
    xml += `${spaces}  <duration>${element.duration}</duration>\n`;
  }
  if (element.ttl) {
    xml += `${spaces}  <ttl action="${element.ttl.action}">${element.ttl.value}</ttl>\n`;
  }
  xml += `${spaces}</element>\n`;
  return xml;
}
// Schedule filtering functions with timezone support
function isCurrentlyActive(scheduleData, timezone = 'UTC') {
  // If no schedule, always active
  if (!scheduleData) {
    return true;
  }
  let schedule;
  // Handle both object (new JSON column) and string (legacy) formats
  if (typeof scheduleData === 'object' && scheduleData !== null) {
    // Already an object (JSON column format)
    schedule = scheduleData;
  } else if (typeof scheduleData === 'string') {
    const trimmedValue = scheduleData.trim();
    // Handle empty strings
    if (!trimmedValue || trimmedValue === 'null' || trimmedValue === 'undefined') {
      return true;
    }
    // Handle legacy text schedules (for backward compatibility)
    if (!trimmedValue.startsWith('{')) {
      // Legacy schedules like "Hourly", "Daily" etc. are always active
      return true;
    }
    // Try to parse JSON string
    try {
      schedule = JSON.parse(trimmedValue);
    } catch (error) {
      // If JSON parsing fails, treat as always active
      console.warn('Error parsing schedule JSON:', error);
      return true;
    }
  } else {
    // Invalid schedule format, always active
    return true;
  }
  // If not a valid object, always active
  if (!schedule || typeof schedule !== 'object' || Array.isArray(schedule)) {
    return true;
  }
  const now = new Date();
  console.log('Current UTC time:', now.toISOString());
  console.log('Checking schedule in timezone:', timezone);
  // Check start/end datetime filters
  if (!isWithinDateTimeRange(now, schedule.startDate, schedule.endDate, timezone)) {
    return false;
  }
  // Check days of week filter
  if (!isActiveOnCurrentDay(now, schedule.daysOfWeek, timezone)) {
    return false;
  }
  // Check time ranges filter
  if (!isWithinTimeRanges(now, schedule.timeRanges, timezone)) {
    return false;
  }
  return true;
}
function isWithinDateTimeRange(currentTime, startDate, endDate, timezone) {
  // If no start/end dates defined, active indefinitely
  if (!startDate && !endDate) {
    return true;
  }
  try {
    // Get current time in timezone
    const nowInTimezone = new Date(currentTime.toLocaleString("en-US", {
      timeZone: timezone
    }));
    // Check start date
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime()) && nowInTimezone < start) {
        return false;
      }
    }
    // Check end date
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime()) && nowInTimezone > end) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.warn('Error checking date range:', error);
    return true; // If error, don't filter out
  }
}
function isActiveOnCurrentDay(currentTime, daysOfWeek, timezone) {
  // If no days specified or invalid, active all days
  if (!daysOfWeek || typeof daysOfWeek !== 'object' || Array.isArray(daysOfWeek)) {
    return true;
  }
  // Check if any day is selected
  const hasSelectedDays = Object.values(daysOfWeek).some((selected)=>selected === true);
  // If no days selected, active all days
  if (!hasSelectedDays) {
    return true;
  }
  // Get the day in the specified timezone
  const localTime = new Date(currentTime.toLocaleString("en-US", {
    timeZone: timezone
  }));
  // Map current day to schedule format
  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
  const currentDayName = dayNames[localTime.getDay()];
  // Check if current day is selected
  return daysOfWeek[currentDayName] === true;
}
function isWithinTimeRanges(currentTime, timeRanges, timezone) {
  // If no time ranges specified or invalid, active all day
  if (!Array.isArray(timeRanges) || timeRanges.length === 0) {
    return true;
  }
  // Check if there are any valid time ranges
  const validTimeRanges = timeRanges.filter((range)=>range && typeof range === 'object' && range.start && range.end);
  // If no valid time ranges, active all day
  if (validTimeRanges.length === 0) {
    return true;
  }
  // Get current time in the specified timezone
  const options = {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const currentTimeString = formatter.format(currentTime);
  console.log('Current time in', timezone, ':', currentTimeString);
  // Check if current time falls within any of the time ranges
  for (const range of validTimeRanges){
    if (isTimeWithinRange(currentTimeString, range.start, range.end)) {
      return true;
    }
  }
  return false; // Not within any time range
}
function isTimeWithinRange(currentTime, startTime, endTime) {
  try {
    // Convert times to minutes since midnight for easier comparison
    const toMinutes = (timeStr)=>{
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const current = toMinutes(currentTime);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    // Handle ranges that span midnight (e.g., 22:00 to 06:00)
    if (start > end) {
      // Range spans midnight
      return current >= start || current <= end;
    } else {
      // Normal range within same day
      return current >= start && current <= end;
    }
  } catch (error) {
    console.warn('Error comparing times:', error);
    return true; // If error, don't filter out
  }
}
// Helper functions
function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function determinePlaylistType(playlist) {
  if (playlist.name.toLowerCase().includes('breaking') || playlist.name.toLowerCase().includes('urgent')) {
    return 'flipping_carousel';
  }
  return 'scrolling_carousel';
}
function generateColorForPlaylist(name) {
  const colors = [
    '#FF5733',
    '#33FF57',
    '#3357FF',
    '#FF33F5',
    '#F5FF33',
    '#33FFF5'
  ];
  let hash = 0;
  for(let i = 0; i < name.length; i++){
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
function generateDistinctColorForBucket(bucket) {
  // Extended color palette with distinct, vibrant colors
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#F7DC6F',
    '#BB8FCE',
    '#52C234',
    '#FF8C42',
    '#6C5CE7',
    '#A8E6CF',
    '#FFD93D',
    '#F8B195',
    '#C7CEEA',
    '#FF6B9D',
    '#2ECC71',
    '#E74C3C',
    '#3498DB',
    '#F39C12',
    '#9B59B6',
    '#1ABC9C',
    '#34495E'
  ];
  // Use bucket ID for more consistent coloring
  let hash = 0;
  const str = bucket.id || bucket.name;
  for(let i = 0; i < str.length; i++){
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
function hasTimeSensitiveField(fields) {
  const timeSensitiveKeywords = [
    'breaking',
    'urgent',
    'live',
    'now',
    'alert'
  ];
  return fields.some((field)=>timeSensitiveKeywords.some((keyword)=>field.name.toLowerCase().includes(keyword) || field.value.toLowerCase().includes(keyword)));
}