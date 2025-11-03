# Media Library - Edit Image Feature

## Summary
Added an "Edit Image" feature to the Media Library that allows users to revise AI-generated images by sending the existing image back to the AI provider with new instructions.

## Implementation Date
November 3, 2025

## Changes Made

### 1. New State Variables (Lines ~106-110)
```typescript
// Image editing states - store the base64 data for revisions
const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);
const [generatedImageMimeType, setGeneratedImageMimeType] = useState<string>('image/png');
const [isEditMode, setIsEditMode] = useState(false);
```

### 2. Modified `handleGenerateAIImage` Function (Lines ~630-638)
**Purpose**: Capture and store the base64 image data when generating
```typescript
// Store the base64 data for potential editing
setGeneratedImageBase64(base64Image);
setGeneratedImageMimeType(mimeType);
```

### 3. New `handleEditImage` Function (Lines ~649-795)
**Purpose**: Send the stored image + revision prompt to Gemini API

**How it works**:
1. Validates that image data and prompt exist
2. Retrieves API key from backend
3. Calls Gemini API with:
   - `inlineData`: The base64 image from previous generation
   - `text`: The revision instructions from the user
4. Extracts and displays the revised image
5. Updates stored base64 data with new image (allows multiple revisions)

### 4. Updated UI Components

#### Prompt Textarea (Lines ~2277-2295)
- Label changes based on mode: "Prompt" vs "Revision Instructions"
- Placeholder text adapts to edit mode
- Shows helpful tip when in edit mode

#### Generate Button (Lines ~2334-2345)
- Calls `handleEditImage` when in edit mode
- Calls `handleGenerateAIImage` when in generate mode
- Button text changes: "Generate Image" / "Revise Image" / "Generating..." / "Revising..."

#### Action Buttons (Lines ~2347-2375)
Added "Edit Image" button next to "Generate Another":
- Activates edit mode
- Clears prompt for revision input
- Disabled when no base64 data available

## User Flow

### Initial Generation
1. User enters prompt → clicks "Generate Image"
2. Image is generated and displayed
3. Base64 data is stored automatically
4. Three buttons appear: "Generate Another" | "Edit Image" | "Add to Library"

### Editing Flow
1. User clicks "Edit Image"
2. Mode switches to edit mode
3. Prompt field clears and shows revision placeholder
4. User enters revision instructions (e.g., "Change sky to sunset colors")
5. User clicks "Revise Image"
6. Revised image replaces the current one
7. Can repeat editing multiple times

## API Integration
Uses Gemini 2.5 Flash Image API endpoint:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent
```

**Request Structure for Editing**:
```json
{
  "contents": [
    {
      "parts": [
        {
          "inlineData": {
            "mimeType": "image/png",
            "data": "<base64-image-data>"
          }
        },
        {
          "text": "<revision-instructions>"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {
      "aspectRatio": "1:1"
    }
  }
}
```

## How to Undo

If you need to revert these changes, remove/modify these sections:

1. **Remove state variables** (lines ~106-110):
   - `generatedImageBase64`
   - `generatedImageMimeType`
   - `isEditMode`

2. **Revert `handleGenerateAIImage`** (remove the 3 lines that set the base64 state)

3. **Delete `handleEditImage` function** entirely (~150 lines)

4. **Revert UI changes**:
   - Restore simple "Prompt" label (remove conditional)
   - Remove edit mode placeholder logic
   - Restore simple "Generate Image" button (remove conditional)
   - Remove "Edit Image" button from action buttons
   - Remove base64 cleanup from Cancel/Generate Another buttons

## Testing Checklist

- [ ] Generate a new image successfully
- [ ] Base64 data is stored (check dev tools React state)
- [ ] Click "Edit Image" → mode switches, prompt clears
- [ ] Enter revision instruction → click "Revise Image"
- [ ] Revised image appears
- [ ] Can edit multiple times in succession
- [ ] "Add to Library" still works after editing
- [ ] "Generate Another" clears everything and resets to generate mode
- [ ] Cancel button properly resets all state

## Notes

- Edit mode only works with Gemini 2.5 Flash Image provider
- The base64 image is kept in memory, so refreshing the page will lose it
- Each revision replaces the previous image
- The feature gracefully handles missing base64 data by disabling the Edit button
