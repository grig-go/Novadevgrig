import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

console.log("[media-library] Edge Function started");

serve(async (req) => {
  console.log(`[media-library] Incoming request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[media-library] Handling OPTIONS (CORS preflight)");
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    
    console.log(`📨 ${method} ${url.pathname}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ============================================================
    // GET /systems - Fetch all systems
    // ============================================================
    if (method === "GET" && url.pathname.endsWith("/systems")) {
      console.log("📋 Fetching systems list");

      const { data, error } = await supabase
        .from("systems")
        .select("id, name, ip_address, port, system_type, description, channel, created_at")
        .order("name", { ascending: true });

      if (error) {
        console.error("❌ Error fetching systems:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch systems", details: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`✅ Found ${data?.length || 0} systems`);

      return new Response(
        JSON.stringify({ data: data || [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================================
    // GET - Fetch and filter media
    // ============================================================
    if (method === "GET") {
      const limit = Number(url.searchParams.get("limit")) || 24;
      const offset = Number(url.searchParams.get("offset")) || 0;
      const type = url.searchParams.get("type");
      const source = url.searchParams.get("source");
      const model = url.searchParams.get("model");
      const status = url.searchParams.get("status");
      const search = url.searchParams.get("search");

      console.log(`📁 Fetching media: limit=${limit}, offset=${offset}, filters:`, {
        type,
        source,
        model,
        status,
        search,
      });

      // Build query with joins
      let query = supabase
        .from("media_assets")
        .select(
          `
          id,
          name,
          file_name,
          description,
          file_url,
          thumbnail_url,
          media_type,
          created_by,
          ai_model_used,
          tags,
          created_at,
          metadata,
          media_distribution (
            id,
            path,
            status,
            last_sync,
            systems (
              name,
              system_type,
              ip_address
            )
          )
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (type) {
        query = query.eq("media_type", type);
      }

      if (source) {
        query = query.ilike("created_by", `%${source}%`);
      }

      if (model) {
        query = query.ilike("ai_model_used", `%${model}%`);
      }

      if (search) {
        // Search across name, tags, and description
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("❌ Error fetching media assets:", error);
        return new Response(
          JSON.stringify({ error: "Failed to fetch media assets", details: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Transform data to match expected format
      const formattedData = (data || []).map((asset: any) => {
        // Transform distribution data
        const distribution = (asset.media_distribution || []).map((dist: any) => ({
          system_name: dist.systems?.name || "Unknown",
          system_type: dist.systems?.system_type || "Unknown",
          path: dist.path,
          status: dist.status,
          last_sync: dist.last_sync,
        }));

        // Filter by distribution status if requested
        if (status && !distribution.some((d: any) => d.status === status)) {
          return null;
        }

        return {
          id: asset.id,
          name: asset.name,
          file_name: asset.file_name,
          file_url: asset.file_url,
          thumbnail_url: asset.thumbnail_url,
          media_type: asset.media_type,
          created_by: asset.created_by,
          ai_model_used: asset.ai_model_used,
          tags: asset.tags || [],
          created_at: asset.created_at,
          size: asset.metadata?.size || null,
          distribution,
        };
      }).filter(Boolean);

      console.log(`✅ Found ${formattedData.length} media assets (total: ${count})`);

      return new Response(
        JSON.stringify({
          data: formattedData,
          count: count || formattedData.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================================
    // POST - Upload or modify media data
    // ============================================================
    if (method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const id = formData.get("id") as string | null;

      const name = formData.get("name") as string | null;
      const description = formData.get("description") as string | null;
      const tags = formData.get("tags")
        ? JSON.parse(formData.get("tags") as string)
        : [];
      const media_type = formData.get("media_type") as string | null;
      const created_by = formData.get("created_by") as string | null;
      const ai_model_used = formData.get("ai_model_used") as string | null;

      console.log(`📁 ${id ? "Updating" : "Creating"} media asset:`, {
        name,
        media_type,
        created_by,
      });

      // If a file is provided → upload to Supabase Storage
      let file_url = formData.get("file_url") as string | null;
      let storage_path = formData.get("storage_path") as string | null;
      let thumbnail_url = formData.get("thumbnail_url") as string | null;
      let metadata: any = {};

      if (file) {
        const bucket = "media";
        const folderName = media_type || "other";
        const filePath = `${folderName}/${Date.now()}_${file.name}`;

        console.log(`📤 Uploading file to: ${bucket}/${filePath}`);

        // Ensure bucket exists (idempotent)
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.name === bucket);

        if (!bucketExists) {
          console.log(`📦 Creating bucket: ${bucket}`);
          const { error: createBucketError } = await supabase.storage.createBucket(
            bucket,
            {
              public: false, // Private bucket for security
            }
          );
          if (createBucketError) {
            console.error("❌ Error creating bucket:", createBucketError);
            throw createBucketError;
          }
        }

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error("❌ Error uploading file:", uploadError);
          throw uploadError;
        }

        // Get signed URL (since bucket is private)
        const { data: signedUrlData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

        file_url = signedUrlData?.signedUrl || null;
        storage_path = `${bucket}/${filePath}`;

        // Store file metadata
        metadata = {
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        };

        console.log(`✅ File uploaded successfully to: ${storage_path}`);
      }

      // Insert or update metadata in the database
      let dbResponse;

      if (id) {
        // Update existing record
        console.log(`🔄 Updating media asset: ${id}`);

        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (name) updateData.name = name;
        if (description !== null) updateData.description = description;
        if (tags) updateData.tags = tags;
        if (media_type) updateData.media_type = media_type;
        if (created_by) updateData.created_by = created_by;
        if (ai_model_used) updateData.ai_model_used = ai_model_used;
        if (file_url) updateData.file_url = file_url;
        if (storage_path) updateData.storage_path = storage_path;
        if (thumbnail_url) updateData.thumbnail_url = thumbnail_url;
        if (Object.keys(metadata).length > 0) updateData.metadata = metadata;

        console.log(`🔄 Update data:`, updateData);

        dbResponse = await supabase
          .from("media_assets")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
        
        console.log(`🔄 Update response:`, { 
          hasData: !!dbResponse.data, 
          hasError: !!dbResponse.error,
          error: dbResponse.error 
        });
      } else {
        // Insert new record
        console.log(`➕ Creating new media asset: ${name}`);

        dbResponse = await supabase
          .from("media_assets")
          .insert([
            {
              name: name || file?.name || "Untitled",
              file_name: file ? file.name : name,
              description,
              media_type: media_type || "other",
              tags,
              created_by: created_by || "user",
              ai_model_used,
              file_url,
              storage_path,
              thumbnail_url,
              metadata,
            },
          ])
          .select()
          .single();
      }

      if (dbResponse.error) {
        console.error("❌ Database error:", JSON.stringify(dbResponse.error, null, 2));
        return new Response(
          JSON.stringify({
            error: "Database operation failed",
            details: dbResponse.error.message || JSON.stringify(dbResponse.error),
            code: dbResponse.error.code,
            hint: dbResponse.error.hint,
            fullError: dbResponse.error,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(
        `✅ Media asset ${id ? "updated" : "created"} successfully:`,
        dbResponse.data.id
      );

      return new Response(JSON.stringify({ data: dbResponse.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // DELETE - Delete a media asset and its associated files
    // ============================================================
    if (method === "DELETE") {
      const pathParts = url.pathname.split("/");
      const id = pathParts[pathParts.length - 1];

      if (!id) {
        return new Response(
          JSON.stringify({ error: "Missing asset ID" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`🗑️ Deleting media asset: ${id}`);

      // Get asset details first to delete from storage
      const { data: asset, error: fetchError } = await supabase
        .from("media_assets")
        .select("storage_path")
        .eq("id", id)
        .single();

      if (fetchError) {
        console.error("❌ Error fetching asset for deletion:", fetchError);
        return new Response(
          JSON.stringify({ error: "Asset not found", details: fetchError.message }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Delete from storage if storage_path exists
      if (asset?.storage_path) {
        const [bucket, ...pathParts] = asset.storage_path.split("/");
        const filePath = pathParts.join("/");

        console.log(`🗑️ Attempting to delete file from storage:`);
        console.log(`   Storage path: ${asset.storage_path}`);
        console.log(`   Bucket: ${bucket}`);
        console.log(`   File path: ${filePath}`);

        const { data: deleteData, error: storageError } = await supabase.storage
          .from(bucket)
          .remove([filePath]);

        if (storageError) {
          console.error("❌ Error deleting from storage:", storageError);
          console.error("❌ Storage error details:", JSON.stringify(storageError, null, 2));
          // Return error instead of silently continuing
          return new Response(
            JSON.stringify({ 
              error: "Failed to delete file from storage", 
              details: storageError.message,
              storage_path: asset.storage_path
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        } else {
          console.log(`✅ File deleted from storage successfully:`, deleteData);
        }
      } else {
        console.log(`⚠️ No storage_path found for asset ${id}, skipping storage deletion`);
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from("media_assets")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("❌ Error deleting asset from database:", deleteError);
        throw deleteError;
      }

      console.log(`✅ Media asset deleted successfully: ${id}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // PATCH - Bulk operations (delete, update tags, archive)
    // ============================================================
    if (method === "PATCH") {
      console.log("📥 PATCH request received");
      
      const body = await req.json();
      console.log("📥 Request body:", JSON.stringify(body));
      
      const { operation, ids, data } = body;

      if (!operation || !ids || !Array.isArray(ids) || ids.length === 0) {
        console.error("❌ Invalid bulk operation request:", { operation, ids: ids?.length, hasData: !!data });
        return new Response(
          JSON.stringify({ error: "Invalid bulk operation request", details: { operation, idsLength: ids?.length } }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`🔄 Bulk operation: ${operation} on ${ids.length} items`);

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // BULK DELETE
      if (operation === "delete") {
        for (const id of ids) {
          try {
            // Get asset details first to delete from storage
            const { data: asset, error: fetchError } = await supabase
              .from("media_assets")
              .select("storage_path")
              .eq("id", id)
              .single();

            if (fetchError) {
              results.failed++;
              results.errors.push(`Asset ${id}: ${fetchError.message}`);
              continue;
            }

            // Delete from storage if storage_path exists
            if (asset?.storage_path) {
              const [bucket, ...pathParts] = asset.storage_path.split("/");
              const filePath = pathParts.join("/");

              console.log(`🗑️ [Bulk] Deleting from storage: ${bucket}/${filePath}`);

              const { data: deleteData, error: storageError } = await supabase.storage
                .from(bucket)
                .remove([filePath]);

              if (storageError) {
                console.error(`❌ Error deleting storage for ${id}:`, storageError);
                console.error(`❌ Storage error details:`, JSON.stringify(storageError, null, 2));
                // Report storage deletion failure but continue with DB deletion
                results.errors.push(`Storage deletion failed for ${id}: ${storageError.message}`);
              } else {
                console.log(`✅ [Bulk] Storage file deleted for ${id}:`, deleteData);
              }
            } else {
              console.log(`⚠️ [Bulk] No storage_path for ${id}, skipping storage deletion`);
            }

            // Delete from database
            const { error: deleteError } = await supabase
              .from("media_assets")
              .delete()
              .eq("id", id);

            if (deleteError) {
              results.failed++;
              results.errors.push(`Asset ${id}: ${deleteError.message}`);
            } else {
              results.success++;
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`Asset ${id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // BULK UPDATE TAGS
      else if (operation === "addTags") {
        const tagsToAdd = data?.tags || [];
        
        if (!Array.isArray(tagsToAdd) || tagsToAdd.length === 0) {
          return new Response(
            JSON.stringify({ error: "No tags provided for bulk tag operation" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        for (const id of ids) {
          try {
            // Get current tags
            const { data: asset, error: fetchError } = await supabase
              .from("media_assets")
              .select("tags")
              .eq("id", id)
              .single();

            if (fetchError) {
              results.failed++;
              results.errors.push(`Asset ${id}: ${fetchError.message}`);
              continue;
            }

            // Merge tags (remove duplicates)
            const currentTags = asset?.tags || [];
            const mergedTags = [...new Set([...currentTags, ...tagsToAdd])];

            // Update with new tags
            const { error: updateError } = await supabase
              .from("media_assets")
              .update({ 
                tags: mergedTags,
                updated_at: new Date().toISOString()
              })
              .eq("id", id);

            if (updateError) {
              results.failed++;
              results.errors.push(`Asset ${id}: ${updateError.message}`);
            } else {
              results.success++;
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`Asset ${id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // BULK ARCHIVE
      else if (operation === "archive") {
        for (const id of ids) {
          try {
            // Get current metadata
            const { data: asset, error: fetchError } = await supabase
              .from("media_assets")
              .select("metadata")
              .eq("id", id)
              .single();

            if (fetchError) {
              results.failed++;
              results.errors.push(`Asset ${id}: ${fetchError.message}`);
              continue;
            }

            // Update metadata with archive flag
            const updatedMetadata = {
              ...(asset?.metadata || {}),
              archived: true,
              archived_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
              .from("media_assets")
              .update({ 
                metadata: updatedMetadata,
                updated_at: new Date().toISOString()
              })
              .eq("id", id);

            if (updateError) {
              results.failed++;
              results.errors.push(`Asset ${id}: ${updateError.message}`);
            } else {
              results.success++;
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`Asset ${id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      else {
        return new Response(
          JSON.stringify({ error: `Unknown bulk operation: ${operation}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`✅ Bulk operation complete: ${results.success} succeeded, ${results.failed} failed`);

      return new Response(
        JSON.stringify(results),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================================
    // POST /distribute - Assign systems to a media asset
    // ============================================================
    if (method === "POST" && url.pathname.endsWith("/distribute")) {
      const body = await req.json();
      const { media_asset_id, system_ids, path_template } = body;

      if (!media_asset_id || !system_ids || !Array.isArray(system_ids) || system_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: media_asset_id and system_ids array" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`🔄 Assigning ${system_ids.length} systems to asset ${media_asset_id}`);

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Get asset details for path generation
      const { data: asset, error: assetError } = await supabase
        .from("media_assets")
        .select("name, file_name, media_type")
        .eq("id", media_asset_id)
        .single();

      if (assetError) {
        return new Response(
          JSON.stringify({ error: "Asset not found", details: assetError.message }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create distribution records for each system
      for (const system_id of system_ids) {
        try {
          // Get system details
          const { data: system, error: systemError } = await supabase
            .from("systems")
            .select("name, connection_info")
            .eq("id", system_id)
            .single();

          if (systemError) {
            results.failed++;
            results.errors.push(`System ${system_id}: ${systemError.message}`);
            continue;
          }

          // Generate path for this system
          const basePath = system?.connection_info?.path || "/media";
          const fileName = asset?.file_name || asset?.name || "file";
          const distributionPath = `${basePath}/${fileName}`;

          // Insert or update distribution record
          const { error: upsertError } = await supabase
            .from("media_distribution")
            .upsert({
              media_asset_id,
              system_id,
              path: path_template || distributionPath,
              status: "pending",
              last_sync: null,
            }, {
              onConflict: "media_asset_id,system_id"
            });

          if (upsertError) {
            results.failed++;
            results.errors.push(`System ${system.name}: ${upsertError.message}`);
          } else {
            results.success++;
            console.log(`✅ Assigned to system: ${system.name}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`System ${system_id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`✅ Distribution complete: ${results.success} succeeded, ${results.failed} failed`);

      return new Response(
        JSON.stringify(results),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ============================================================
    // DELETE /distribute/:id - Remove a distribution
    // ============================================================
    if (method === "DELETE" && url.pathname.includes("/distribute/")) {
      const pathParts = url.pathname.split("/");
      const distributionId = pathParts[pathParts.length - 1];

      if (!distributionId) {
        return new Response(
          JSON.stringify({ error: "Missing distribution ID" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`🗑️ Removing distribution: ${distributionId}`);

      const { error: deleteError } = await supabase
        .from("media_distribution")
        .delete()
        .eq("id", distributionId);

      if (deleteError) {
        console.error("❌ Error removing distribution:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to remove distribution", details: deleteError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`✅ Distribution removed successfully`);

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Method not allowed
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("❌ Error in media library function:", error);
    console.error("❌ Error details:", JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : JSON.stringify(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
