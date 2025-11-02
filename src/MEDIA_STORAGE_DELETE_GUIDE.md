# Media Storage Delete Functionality Guide

## Overview
The delete function now properly removes media files from both the Supabase database AND the Supabase storage bucket.

## What Was Fixed

### 1. Enhanced Logging
Added detailed logging to track storage deletion:
- Shows the storage_path being processed
- Logs the bucket and file path separately
- Reports success/failure of storage operations
- Logs when no storage_path exists

### 2. Error Handling
- **Single Delete**: Now returns an error if storage deletion fails (instead of silently continuing)
- **Bulk Delete**: Reports storage deletion errors in the results but continues with database deletion

## How It Works

### Delete Flow
1. **Fetch asset** from database to get `storage_path`
2. **Parse storage_path** into bucket and file path
   - Example: `media/image/1699999999_photo.jpg`
   - Bucket: `media`
   - File path: `image/1699999999_photo.jpg`
3. **Delete from storage** using Supabase Storage API
4. **Delete from database** (only if storage deletion succeeds for single delete)

### Expected Storage Path Format
```
{bucket}/{type}/{timestamp}_{filename}
```

Examples:
- `media/image/1699999999_photo.jpg`
- `media/video/1699999999_clip.mp4`
- `media/audio/1699999999_track.mp3`

## Testing the Delete Function

### Step 1: Upload a Test File
1. Go to Media Library
2. Upload any image/video/audio file
3. Note the file ID

### Step 2: Check the Database
Open Supabase Dashboard → Table Editor → `media_assets`:
- Find your file by ID
- Check the `storage_path` column
- It should look like: `media/{type}/{timestamp}_{filename}`

### Step 3: Check the Storage
Open Supabase Dashboard → Storage → `media` bucket:
- Navigate to the appropriate folder (image/video/audio)
- Verify the file exists

### Step 4: Delete the File
1. In Media Library, delete the file
2. Open browser DevTools → Console
3. Look for these logs:

**Success logs:**
```
🗑️ Deleting media asset: {id}
🗑️ Attempting to delete file from storage:
   Storage path: media/image/1699999999_photo.jpg
   Bucket: media
   File path: image/1699999999_photo.jpg
✅ File deleted from storage successfully
✅ Media asset deleted successfully: {id}
```

**Error logs (if something goes wrong):**
```
❌ Error deleting from storage: {...}
❌ Storage error details: {...}
```

### Step 5: Verify Deletion
1. **Database**: Refresh the `media_assets` table → File should be gone
2. **Storage**: Refresh the `media` bucket → File should be gone

## Troubleshooting

### Issue: Storage deletion fails with "Object not found"
**Possible causes:**
- The `storage_path` in database doesn't match actual storage location
- File was manually deleted from storage but database entry remains
- Old files from before the bucket name change (were in `make-8a536fc1-media`, now trying to delete from `media`)

**Solution:**
Check the `storage_path` field in the database and verify it matches the actual bucket name.

### Issue: Permission denied
**Possible causes:**
- Service role key doesn't have permission to delete from storage
- Bucket policies are restricting deletion

**Solution:**
1. Go to Supabase Dashboard → Storage → Policies
2. Ensure service role has delete permissions
3. Or create a policy that allows deletion

### Issue: Files uploaded before bucket name change
**Problem:**
Old files have `storage_path` like: `make-8a536fc1-media/image/1699999999_photo.jpg`

When you try to delete them, the code will look in the `make-8a536fc1-media` bucket (which exists and has the file), so deletion should still work!

**If you want to prevent confusion:**
1. Migrate old files to new bucket (see MEDIA_STORAGE_FIX.md)
2. Or delete old bucket after migrating all files

## Bulk Delete

Bulk delete works the same way but:
- Processes multiple files in a loop
- Reports storage errors but continues with database deletion
- Returns a summary: `{ success: X, failed: Y, errors: [...] }`

### Bulk Delete Logs
```
🗑️ Bulk deleting 5 assets
🗑️ [Bulk] Deleting from storage: media/image/1699999999_photo1.jpg
✅ [Bulk] Storage file deleted for {id}
🗑️ [Bulk] Deleting from storage: media/image/1699999999_photo2.jpg
✅ [Bulk] Storage file deleted for {id}
...
✅ Bulk operation complete: 5 succeeded, 0 failed
```

## Verification Checklist

After deleting a file, verify:
- [ ] Console shows "✅ File deleted from storage successfully"
- [ ] Console shows "✅ Media asset deleted successfully"
- [ ] Database record is removed (media_assets table)
- [ ] Storage file is removed (media bucket)
- [ ] No error messages in console
- [ ] UI removes the file from the list

## Common Console Messages

### ✅ Success
- `✅ File deleted from storage successfully`
- `✅ Media asset deleted successfully: {id}`

### ⚠️ Warnings
- `⚠️ No storage_path found for asset {id}, skipping storage deletion`
  - This is okay if the file was never uploaded to storage (e.g., URL-only assets)

### ❌ Errors
- `❌ Error deleting from storage: {...}`
  - Check the error details in the console
  - Verify storage_path and bucket name
  - Check storage permissions

## Summary

The delete function now:
1. ✅ Fetches the storage path from database
2. ✅ Deletes the file from Supabase storage
3. ✅ Deletes the record from database
4. ✅ Logs detailed information for debugging
5. ✅ Returns errors if storage deletion fails (single delete)
6. ✅ Reports errors but continues (bulk delete)

Files are properly cleaned up from both storage and database!
