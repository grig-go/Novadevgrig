import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

console.log("[media-library] Edge Function started");

serve(async (req) => {
  console.log(`[media-library] Incoming request: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // ============================================================
    // ✅ GET /systems — fetch all systems
    // ============================================================
    if (method === "GET" && url.pathname.endsWith("/systems")) {
      const { data, error } = await supabase
        .from("systems")
        .select(
          "id, name, ip_address, port, system_type, description, channel, created_at"
        )
        .order("name", { ascending: true });

      if (error)
        return new Response(
          JSON.stringify({
            error: "Failed to fetch systems",
            details: error.message,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      return new Response(JSON.stringify({ data: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // GET /distribute — fetch distributions for an asset
    // ============================================================
    if (method === "GET" && url.pathname.endsWith("/distribute")) {
      const media_asset_id = url.searchParams.get("media_asset_id");
      if (!media_asset_id)
        return new Response(
          JSON.stringify({ error: "Missing required parameter: media_asset_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      const { data, error } = await supabase
        .from("media_distribution")
        .select(
          `
          id, path, status, last_sync,
          systems ( id, name, ip_address, port, system_type, channel )
        `
        )
        .eq("media_id", media_asset_id)
        .order("created_at", { ascending: false });

      if (error)
        return new Response(
          JSON.stringify({ error: "Failed to fetch distributions", details: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      return new Response(JSON.stringify({ data: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

      let query = supabase
        .from("media_assets")
        .select(
          `
          id, name, file_name, description, file_url, thumbnail_url, storage_path,
          media_type, created_by, ai_model_used, tags, created_at, metadata,
          media_distribution (
            id, path, status, last_sync,
            systems ( name, ip_address, port, system_type, channel )
          )
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) query = query.eq("media_type", type);
      if (source) query = query.ilike("created_by", `%${source}%`);
      if (model) query = query.ilike("ai_model_used", `%${model}%`);
      if (search)
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

      const { data, error, count } = await query;

      if (error)
        return new Response(
          JSON.stringify({
            error: "Failed to fetch media assets",
            details: error.message,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      const formatted = (data || []).map((asset) => {
        const dist = (asset.media_distribution || []).map((d) => ({
          system_name: d.systems?.name,
          system_type: d.systems?.system_type,
          ip_address: d.systems?.ip_address,
          port: d.systems?.port,
          path: d.path,
          status: d.status,
          last_sync: d.last_sync,
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
          distribution: dist,
        };
      });

      return new Response(JSON.stringify({ data: formatted, count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        const updateData: any = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (tags) updateData.tags = tags;
        if (mediaType) updateData.media_type = mediaType;
        if (createdBy) updateData.created_by = createdBy;
        if (aiModelUsed) updateData.ai_model_used = aiModelUsed;

        const { data, error } = await supabase
          .from("media_assets")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error)
          return new Response(
            JSON.stringify({ error: "Failed to update asset", details: error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!file)
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      // Upload — now with subfolders by type
      const bucketName = "media";
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();

      const folder =
        mediaType === "video" ? "video"
        : mediaType === "audio" ? "audio"
        : "image";

      const storagePath = `${folder}/${timestamp}_${crypto.randomUUID()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError)
        return new Response(
          JSON.stringify({ error: "Failed to upload file", details: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uploadData.path);

      // Insert DB record
      const { data: assetData, error: dbError } = await supabase
        .from("media_assets")
        .insert({
          name: name || file.name,
          file_name: file.name,
          description,
          storage_path: uploadData.path, // now includes "image/", "audio/", etc.
          file_url: urlData.publicUrl,
          thumbnail_url: urlData.publicUrl,
          media_type: mediaType,
          created_by: createdBy,
          ai_model_used: aiModelUsed,
          tags,
          metadata: { size: file.size, mimeType: file.type },
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from(bucketName).remove([uploadData.path]);
        return new Response(
          JSON.stringify({ error: "Failed to create database record", details: dbError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data: assetData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // DELETE /media/:id — delete asset + file
    // ============================================================
    if (method === "DELETE" && url.pathname.includes("/media/")) {
      const parts = url.pathname.split("/");
      const mediaId = parts[parts.length - 1];

      if (!mediaId)
        return new Response(JSON.stringify({ error: "Missing media ID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      const { data: asset, error: fetchError } = await supabase
        .from("media_assets")
        .select("storage_path")
        .eq("id", mediaId)
        .single();

      if (fetchError || !asset)
        return new Response(
          JSON.stringify({ error: fetchError?.message || "Asset not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      const { error: dbError } = await supabase
        .from("media_assets")
        .delete()
        .eq("id", mediaId);

      if (dbError)
        return new Response(JSON.stringify({ error: dbError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      if (asset?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("media")
          .remove([asset.storage_path]);
        if (storageError)
          console.warn("⚠️ File removal failed:", storageError.message);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // Default — Method not allowed
    // ============================================================
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("❌ Error in media-library function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});