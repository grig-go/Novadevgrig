# Media Storage Bucket Fix

## Issue
Media files were being uploaded to `make-8a536fc1-media` bucket instead of the `media` bucket.

## Fix Applied
Changed the bucket name in `/supabase/functions/media-library/index.ts` on line 194:
```typescript
// OLD:
const bucket = "make-8a536fc1-media";

// NEW:
const bucket = "media";
```

## Current Behavior
All **new** uploads will now go to:
- **Bucket**: `media`
- **Folder structure**: `{media_type}/{timestamp}_{filename}`
- **Examples**:
  - Images: `media/image/1699999999_photo.jpg`
  - Videos: `media/video/1699999999_clip.mp4`
  - Audio: `media/audio/1699999999_track.mp3`

## Important Notes

### 1. Old Files Remain in Old Bucket
Files uploaded **before** this fix are still in the `make-8a536fc1-media` bucket. They will continue to work (the URLs are still valid), but they won't be moved automatically.

### 2. To Verify the Fix is Working
Upload a new file through the Media Library and check:
1. Open browser DevTools → Network tab
2. Upload a file
3. Look for the POST request to `media-library`
4. Check the console logs - you should see: `📤 Uploading file to: media/{type}/{filename}`
5. In Supabase Dashboard → Storage, verify the file appears in the `media` bucket

### 3. To Migrate Old Files (Optional)
If you want to move existing files from `make-8a536fc1-media` to `media`:

**Option A: Re-upload through UI**
- Download each file
- Delete the old entry
- Upload again (will go to correct bucket)

**Option B: Manual move in Supabase Dashboard**
- Go to Supabase Dashboard → Storage
- Select files in `make-8a536fc1-media` bucket
- Move them to `media` bucket
- Update the `storage_path` field in the `media_assets` table

**Option C: Leave them as-is**
- Old files will continue to work from the old bucket
- New files will use the correct bucket
- Over time, all new files will be in the correct location

## Verification Checklist
- [x] Code updated to use `media` bucket
- [x] No other references to `make-8a536fc1-media` in codebase
- [ ] Test upload a new file
- [ ] Verify file appears in `media` bucket
- [ ] (Optional) Migrate old files if needed

## Files Modified
- `/supabase/functions/media-library/index.ts` - Line 194: Changed bucket name
