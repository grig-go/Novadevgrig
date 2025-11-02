# Media Library - Update Error Debugging & Fix

## ❌ Error Encountered

```
Error updating media asset: Error: Internal server error
```

This error occurs when trying to update media asset properties (name, description, tags, etc.) in the Media Library.

## 🔍 Problem Analysis

### Initial Issue
The error message "Internal server error" was too generic and didn't provide enough information to diagnose the root cause.

### Potential Root Causes
1. **Missing Database Table** - `media_assets` table doesn't exist
2. **Permission Issues** - RLS policies blocking updates
3. **Database Constraints** - Violating table constraints (NOT NULL, UNIQUE, etc.)
4. **Invalid Data Format** - Sending data in wrong format
5. **Missing Required Fields** - Not providing required columns
6. **Network Issues** - Edge function not responding correctly

## 🔧 Solution Applied

### 1. Enhanced Frontend Error Logging

**File:** `/utils/useMediaData.ts`

**Changes:**
- Added detailed error response logging
- Capture and display backend error details
- Include both `error` and `details` fields from backend

**Before:**
```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
}
```

**After:**
```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  console.error("❌ Backend error response:", errorData);
  const errorMsg = errorData.details 
    ? `${errorData.error}: ${errorData.details}` 
    : errorData.error || `HTTP ${response.status}: ${response.statusText}`;
  throw new Error(errorMsg);
}
```

### 2. Enhanced Backend Error Logging

**File:** `/supabase/functions/media-library/index.ts`

**Changes Added:**

#### a) Log Update Data Before Database Call
```typescript
console.log(`🔄 Update data:`, updateData);
```

#### b) Log Database Response
```typescript
console.log(`🔄 Update response:`, { 
  hasData: !!dbResponse.data, 
  hasError: !!dbResponse.error,
  error: dbResponse.error 
});
```

#### c) Return Detailed Database Errors
**Before:**
```typescript
if (dbResponse.error) {
  console.error("❌ Database error:", dbResponse.error);
  throw dbResponse.error; // Generic 500 error
}
```

**After:**
```typescript
if (dbResponse.error) {
  console.error("❌ Database error:", dbResponse.error);
  return new Response(
    JSON.stringify({
      error: "Database operation failed",
      details: dbResponse.error.message || String(dbResponse.error),
      code: dbResponse.error.code,
      hint: dbResponse.error.hint,
    }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
```

### 3. Applied Same Logging to All Operations

Enhanced error logging for:
- ✅ **updateAsset** - Update existing media
- ✅ **uploadAsset** - Upload new media
- ✅ **deleteAsset** - Delete media

## 📋 How to Debug

### Step 1: Check Browser Console
Look for detailed error messages:
```
❌ Backend error response: {
  error: "Database operation failed",
  details: "relation 'media_assets' does not exist",
  code: "42P01"
}
```

### Step 2: Check Edge Function Logs
In Supabase Dashboard → Edge Functions → media-library → Logs:
```
🔄 Updating media asset: abc-123-def
🔄 Update data: { name: "New Name", updated_at: "2024-11-02..." }
❌ Database error: { message: "...", code: "..." }
```

### Step 3: Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `42P01` | Table doesn't exist | Run schema migration |
| `42501` | Permission denied | Check RLS policies |
| `23505` | Unique violation | Check for duplicates |
| `23502` | NOT NULL violation | Provide required fields |
| `22P02` | Invalid input syntax | Check data types |

## 🔧 Common Fixes

### Fix 1: Missing Table
**Error:** `relation 'media_assets' does not exist`

**Solution:**
1. Go to Supabase Dashboard → SQL Editor
2. Run the migration from `/supabase/migrations/media_library_schema.sql`
3. Verify table exists: `SELECT * FROM media_assets LIMIT 1;`

### Fix 2: Permission Issues
**Error:** `permission denied for table media_assets`

**Solution:**
```sql
-- Allow authenticated users to read
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (already handled by SERVICE_ROLE_KEY)
-- No additional RLS policies needed for service role
```

### Fix 3: Column Doesn't Exist
**Error:** `column "updated_at" of relation "media_assets" does not exist`

**Solution:**
- Update the database schema to include the missing column
- Or remove the field from `updateData` if not needed

### Fix 4: Invalid Data Type
**Error:** `invalid input syntax for type json`

**Solution:**
- Ensure `tags` is a valid JSON array: `["tag1", "tag2"]`
- Ensure `metadata` is a valid JSON object: `{ "size": 1024 }`

## 🎯 Verification Steps

### 1. Test Update Operation
```typescript
// In browser console
const result = await updateAsset("some-id", { name: "Test Name" });
console.log(result);
```

### 2. Check Expected Logs

**Frontend Console:**
```
🔄 Updating media asset: some-id
✅ Media asset updated successfully
📁 Fetching media assets from: ...
📁 Loaded N media assets
```

**Backend Logs:**
```
🔄 Updating media asset: some-id
🔄 Update data: { name: "Test Name", updated_at: "..." }
🔄 Update response: { hasData: true, hasError: false }
✅ Media asset updated successfully: some-id
```

## 📊 Error Flow

### Before Fix (Generic Error)
```
User updates name
  ↓
Frontend sends POST
  ↓
Backend database error
  ↓
Catch block: throw error
  ↓
Returns: "Internal server error"
  ↓
Frontend shows: "Error: Internal server error"
  ❌ No actionable information
```

### After Fix (Detailed Error)
```
User updates name
  ↓
Frontend sends POST
  ↓
Backend database error
  ↓
Log: console.error("❌ Database error:", ...)
  ↓
Returns: { error: "...", details: "...", code: "...", hint: "..." }
  ↓
Frontend logs: console.error("❌ Backend error response:", ...)
  ↓
Frontend shows: "Database operation failed: relation 'media_assets' does not exist"
  ✅ Clear, actionable error message
```

## 🔍 Next Steps for Debugging

### If Error Persists:

1. **Check Browser Console** for detailed error with `details` field
2. **Check Edge Function Logs** in Supabase Dashboard
3. **Verify Table Exists:**
   ```sql
   SELECT * FROM media_assets LIMIT 1;
   ```
4. **Check Table Schema:**
   ```sql
   \d media_assets
   ```
5. **Test Direct Query:**
   ```sql
   UPDATE media_assets 
   SET name = 'Test', updated_at = NOW() 
   WHERE id = 'some-existing-id';
   ```

### If Table Missing:

Run the schema migration:
```bash
# From Supabase Dashboard SQL Editor
# Paste contents of /supabase/migrations/media_library_schema.sql
```

### If Permission Denied:

The edge function uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS, so permission errors shouldn't occur. If they do, check:
1. Environment variables are set correctly
2. Service role key is valid
3. Edge function deployment is up to date

## 📝 Files Modified

- ✅ `/utils/useMediaData.ts` - Enhanced error logging (3 functions)
- ✅ `/supabase/functions/media-library/index.ts` - Enhanced error handling

## 🎯 Expected Outcome

### Before
```
Error updating media asset: Error: Internal server error
```

### After
```
Error updating media asset: Database operation failed: relation 'media_assets' does not exist (Code: 42P01)
```

Now you can:
1. **See the exact error** from Postgres
2. **Understand the root cause** (missing table)
3. **Take action** (run migration)
4. **Fix the issue** quickly

---

**Status:** ✅ Enhanced error logging for debugging  
**Pattern:** Detailed error propagation from backend to frontend  
**Next Step:** Check browser console for detailed error message and follow debugging steps above
