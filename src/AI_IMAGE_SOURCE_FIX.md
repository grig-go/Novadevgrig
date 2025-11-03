# AI Image Generator - Source Field Fix

## Issue
When adding AI-generated images to the Media Library, the `source` field (database column: `created_by`) was being set to `"user@emergent.tv"` instead of `"AI"`.

## Fix Applied
Updated `/components/MediaLibrary.tsx` in the `handleAddGeneratedImage` function:

**Before:**
```typescript
formData.append("created_by", "user@emergent.tv");
```

**After:**
```typescript
formData.append("created_by", "AI");
```

## Location
- **File:** `/components/MediaLibrary.tsx`
- **Function:** `handleAddGeneratedImage`
- **Line:** ~678

## Impact
Now when users generate images using the AI Image Generator and click "Add to Library", the media asset will be saved with:
- `created_by` = `"AI"`
- This allows proper filtering by source in the Media Library
- Users can filter to see only AI-generated content

## Related Files
- `/supabase/functions/media-library/index.ts` - Backend POST handler (already deployed)
- `/STORAGE_BUCKET_RULES.md` - Storage bucket naming rules

## Testing
1. Open Media Library
2. Click "Generate AI Image"
3. Generate an image with any provider
4. Click "Add to Library"
5. Filter by Source = "AI"
6. The new image should appear

## Notes
- Regular user uploads still use `created_by` = `"user@emergent.tv"`
- Only AI-generated content gets `created_by` = `"AI"`
- The `ai_model_used` field is also populated with the provider's model name
- Tags automatically include `['ai-generated', 'image']`

## Date
November 3, 2025
