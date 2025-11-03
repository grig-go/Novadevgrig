# Storage Bucket Rules

## ⚠️ CRITICAL RULE - DO NOT VIOLATE

### Media Storage Bucket Name

**ALWAYS use bucket name: `"media"`**

**NEVER change the storage bucket location unless explicitly specified by the user.**

---

## Current Configuration

All media assets (images, videos, audio, 3D models, etc.) are stored in:

```typescript
const bucketName = "media";
```

This applies to:
- User uploads
- AI-generated images
- AI-generated videos
- Any other media assets

---

## Locations Where This Rule Applies

### Backend (Edge Functions)
- `/supabase/functions/media-library/index.ts` - POST handler for file uploads
- Any future media handling endpoints

### Frontend
- The bucket name should never be hardcoded in frontend code
- All bucket interactions should go through the backend

---

## Why This Rule Exists

1. **Consistency**: All media assets must be in one location for easy management
2. **Backup/Recovery**: Single bucket simplifies backup procedures
3. **Access Control**: Unified bucket policies and permissions
4. **Migration**: Easier to migrate or sync data from a single source
5. **Cost Management**: Single bucket for monitoring storage costs

---

## If You Need to Change It

**Only change the bucket name if the user explicitly requests it.**

If a change is needed:
1. User must explicitly state the new bucket name
2. Confirm with user before making changes
3. Update ALL references to the bucket
4. Document the change
5. Consider data migration from old bucket to new bucket

---

## Last Updated
- Date: 2024
- Reason: Fixed incorrect bucket name change from `"media"` to `"media-8a536fc1"`
- Corrected to: `"media"`
