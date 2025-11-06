import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey"
};
console.log("[media-library] Edge Function started");
serve(async (req)=>{
  console.log(`[media-library] Incoming request: ${req.method} ${req.url}`);
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();
    const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    // ============================================================
    // ✅ GET /systems — fetch all systems
    // ============================================================
    if (method === "GET" && url.pathname.endsWith("/systems")) {
      console.log("📋 Fetching systems list");
      const { data, error } = await supabase.from("systems").select("id, name, ip_address, port, system_type, description, channel, created_at").order("name", {
        ascending: true
      });
      if (error) return new Response(JSON.stringify({
        error: "Failed to fetch systems",
        details: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      return new Response(JSON.stringify({
        data: data || []
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // GET /distribute — fetch distributions for an asset
    // ============================================================
    if (method === "GET" && url.pathname.endsWith("/distribute")) {
      const media_asset_id = url.searchParams.get("media_asset_id");
      if (!media_asset_id) return new Response(JSON.stringify({
        error: "Missing required parameter: media_asset_id"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const { data, error } = await supabase.from("media_distribution").select(`
          id,
          path,
          status,
          last_sync,
          systems (
            id,
            name,
            ip_address,
            port,
            system_type,
            channel
          )
        `).eq("media_id", media_asset_id).order("created_at", {
        ascending: false
      });
      if (error) return new Response(JSON.stringify({
        error: "Failed to fetch distributions",
        details: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      return new Response(JSON.stringify({
        data: data || []
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // GET — fetch and filter media
    // ============================================================
    if (method === "GET") {
      const limit = Number(url.searchParams.get("limit")) || 24;
      const offset = Number(url.searchParams.get("offset")) || 0;
      const type = url.searchParams.get("type");
      const source = url.searchParams.get("source");
      const model = url.searchParams.get("model");
      const search = url.searchParams.get("search");
      let query = supabase.from("media_assets").select(`
          id,
          name,
          file_name,
          description,
          file_url,
          thumbnail_url,
          storage_path,
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
              ip_address,
              port,
              system_type,
              channel
            )
          )
        `, {
        count: "exact"
      }).order("created_at", {
        ascending: false
      }).range(offset, offset + limit - 1);
      if (type) query = query.eq("media_type", type);
      if (source) query = query.ilike("created_by", `%${source}%`);
      if (model) query = query.ilike("ai_model_used", `%${model}%`);
      if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, error, count } = await query;
      if (error) return new Response(JSON.stringify({
        error: "Failed to fetch media assets",
        details: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const formatted = (data || []).map((asset)=>{
        const dist = (asset.media_distribution || []).map((d)=>({
            system_name: d.systems?.name,
            system_type: d.systems?.system_type,
            ip_address: d.systems?.ip_address,
            port: d.systems?.port,
            path: d.path,
            status: d.status,
            last_sync: d.last_sync
          }));
        return {
          id: asset.id,
          name: asset.name,
          file_name: asset.file_name,
          file_url: asset.file_url,
          thumbnail_url: asset.thumbnail_url,
          storage_path: asset.storage_path,
          media_type: asset.media_type,
          created_by: asset.created_by,
          ai_model_used: asset.ai_model_used,
          tags: asset.tags,
          created_at: asset.created_at,
          size: asset.metadata?.size || null,
          distribution: dist
        };
      });
      return new Response(JSON.stringify({
        data: formatted,
        count: count || formatted.length
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // POST /distribute — assign systems to a media asset
    // (handled BEFORE general POST)
    // ============================================================
    if (method === "POST" && url.pathname.match(/\/distribute\/?$/)) {
      console.log("📡 Handling /distribute route");
      const body = await req.json();
      const { media_asset_id, system_ids, path_template } = body;
      if (!media_asset_id || !Array.isArray(system_ids) || system_ids.length === 0) return new Response(JSON.stringify({
        error: "Missing media_asset_id or system_ids"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const { data: asset, error: assetError } = await supabase.from("media_assets").select("name, file_name, media_type").eq("id", media_asset_id).single();
      if (assetError) return new Response(JSON.stringify({
        error: "Asset not found",
        details: assetError.message
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      for (const system_id of system_ids){
        const { data: system, error: sysError } = await supabase.from("systems").select("name, ip_address, port, system_type, channel").eq("id", system_id).single();
        if (sysError || !system) {
          results.failed++;
          results.errors.push(`System ${system_id}: ${sysError?.message || "not found"}`);
          continue;
        }
        const basePath = system.channel ? `/channels/${system.channel}` : "/media";
        const fileName = asset.file_name || asset.name;
        const distributionPath = `${basePath}/${fileName}`;
        const { data: existing } = await supabase.from("media_distribution").select("id").eq("media_id", media_asset_id).eq("system_id", system_id).maybeSingle();
        if (existing) {
          const { error: updateError } = await supabase.from("media_distribution").update({
            path: path_template || distributionPath,
            status: "pending",
            last_sync: null
          }).eq("id", existing.id);
          if (updateError) results.errors.push(`${system.name}: ${updateError.message}`);
          else results.success++;
        } else {
          const { error: insertError } = await supabase.from("media_distribution").insert({
            media_id: media_asset_id,
            system_id,
            path: path_template || distributionPath,
            status: "pending",
            last_sync: null
          });
          if (insertError) results.errors.push(`${system.name}: ${insertError.message}`);
          else results.success++;
        }
      }
      return new Response(JSON.stringify(results), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // POST — upload or update media asset
    // ============================================================
    if (method === "POST") {
      console.log("📤 Handling media upload/update");
      const formData = await req.formData();
      const id = formData.get("id");
      const file = formData.get("file");
      const name = formData.get("name");
      const description = formData.get("description") || "";
      const tagsStr = formData.get("tags") || "[]";
      const tags = JSON.parse(tagsStr);
      const mediaType = formData.get("media_type") || "image";
      const createdBy = formData.get("created_by") || "user";
      const aiModelUsed = formData.get("ai_model_used");
      // Update metadata only
      if (id && !file) {
        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (tags) updateData.tags = tags;
        if (mediaType) updateData.media_type = mediaType;
        if (createdBy) updateData.created_by = createdBy;
        if (aiModelUsed) updateData.ai_model_used = aiModelUsed;
        const { data, error } = await supabase.from("media_assets").update(updateData).eq("id", id).select().single();
        if (error) return new Response(JSON.stringify({
          error: "Failed to update asset",
          details: error.message
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
        return new Response(JSON.stringify({
          data
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      if (!file) return new Response(JSON.stringify({
        error: "No file provided"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      // Upload
      const bucketName = "media";
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const fileName = `${timestamp}_${crypto.randomUUID()}.${fileExt}`;
      
      // Determine subfolder based on media type
      let subfolder = 'images'; // default
      if (mediaType === 'video') {
        subfolder = 'videos';
      } else if (mediaType === 'audio') {
        subfolder = 'audio';
      } else if (mediaType === 'image') {
        subfolder = 'images';
      }
      
      const storagePath = `${subfolder}/${fileName}`;
      console.log(`📁 Upload path: bucket="${bucketName}", path="${storagePath}", mediaType="${mediaType}"`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage.from(bucketName).upload(storagePath, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) return new Response(JSON.stringify({
        error: "Failed to upload file",
        details: uploadError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
      // ✅ Create DB record with required storage_path
      const { data: assetData, error: dbError } = await supabase.from("media_assets").insert({
        name: name || file.name,
        file_name: file.name,
        description,
        storage_path: uploadData.path,
        file_url: urlData.publicUrl,
        thumbnail_url: urlData.publicUrl,
        media_type: mediaType,
        created_by: createdBy,
        ai_model_used: aiModelUsed,
        tags,
        metadata: {
          size: file.size,
          mimeType: file.type
        }
      }).select().single();
      if (dbError) {
        await supabase.storage.from(bucketName).remove([
          uploadData.path
        ]);
        return new Response(JSON.stringify({
          error: "Failed to create database record",
          details: dbError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(JSON.stringify({
        data: assetData
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // DELETE /distribute/:id
    // ============================================================
    if (method === "DELETE" && url.pathname.includes("/distribute/")) {
      const pathParts = url.pathname.split("/");
      const distributionId = pathParts[pathParts.length - 1];
      if (!distributionId) return new Response(JSON.stringify({
        error: "Missing distribution ID"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const { error } = await supabase.from("media_distribution").delete().eq("id", distributionId);
      if (error) return new Response(JSON.stringify({
        error: "Failed to delete distribution",
        details: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      return new Response(JSON.stringify({
        success: true
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // ============================================================
    // Default — Method not allowed
    // ============================================================
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("❌ Error in media-library function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
