# Google AI Studio (Gemini) Image Generation Setup

## Overview
This application supports **Google AI Studio** (Gemini) for AI-powered image generation in the Media Library. This uses the simple Gemini API with just an API key - no complex OAuth2 or service accounts needed!

## ⚠️ CRITICAL: HARDCODED MODEL CONFIGURATION

**IMPORTANT:** The Media Library uses a **HARDCODED** Gemini model for reliability. This configuration has been tested and verified working.

### Working Configuration (DO NOT MODIFY ✅):
```javascript
// Location: /components/MediaLibrary.tsx (line ~571)
const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

// Request body (NO "role" field!)
{
  contents: [
    {
      parts: [{ text: aiImagePrompt }]
    }
  ],
  generationConfig: {
    responseModalities: ["IMAGE"],
    imageConfig: { aspectRatio: "1:1" }
  }
}
```

### Key Points:
- **Model**: `gemini-2.5-flash-image` (hardcoded in endpoint)
- **NO `role: "user"` field** in request body
- **API Key**: Retrieved from backend via `/reveal` endpoint
- **Upload Method**: Use `fetch(dataUrl)` to convert to blob, NOT manual base64 decoding

**DO NOT CHANGE** the hardcoded model or request structure unless you have thoroughly tested a replacement!

## Quick Start (1 Minute)

The Gemini provider is already configured in your backend! You just need to:

1. **Go to AI Connections Dashboard**
2. **Find the existing "Google Gemini (Production)" provider** or create a new one
3. **Edit the provider** (if needed to update API key):
   - **Name**: "Google Gemini Image Generator"
   - **Provider**: Select "gemini"
   - **Type**: "multimodal" or "image"
   - **API Key**: Your Google AI Studio API key (e.g., `AIzaSy...`)
   - **Endpoint**: `https://generativelanguage.googleapis.com/v1beta`
   - **Model**: Can be anything (the hardcoded version ignores this field)
4. **Assign to Media Library** dashboard with image generation capability
5. **Done!** Start generating images

## Get a Google AI Studio API Key (If You Need a New One)

If you need to create a new API key or replace the existing one:

### 1. Go to Google AI Studio
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Select an existing Google Cloud project or create a new one
5. Copy the API key (format: `AIzaSy...`)

**Important:** This is **NOT** Vertex AI! This is the simpler Google AI Studio API.

### 2. Configure in AI Connections Dashboard
Everything is configured through the UI - no environment variables, no service accounts!

1. Go to **AI Connections Dashboard** in your application
2. Find the **"Google Gemini (Production)"** provider or click **Add AI Provider**
3. Fill in the form:
   - **Name**: "Google Gemini Image Generator"
   - **Provider Name**: Select **"gemini"**
   - **Type**: Select **"multimodal"** (supports text, image, and video)
   - **API Key**: Your Google AI Studio API key
     ```
     AIzaSyD0KVlIBYDqmjN7iQx_Ybi4EQbQ-lhPuH0
     ```
   - **Endpoint**: `https://generativelanguage.googleapis.com/v1beta`
   - **Model**: ⚠️ **CRITICAL** - Enter the exact image generation model name:
     - `gemini-2.0-flash-image-exp-001` (Recommended - dedicated image model)
     - `imagen-3.0-generate-001` (Google's Imagen 3 model)
     - `gemini-2.0-flash-exp` (May support image generation)
4. **Save** the provider
5. Go to **Dashboard Assignments** tab
6. **Assign to Media Library** with **Image Generation** capability enabled
7. **Test** by going to Media Library and clicking "AI Image Generation"

The backend will automatically:
- ✅ Use the simple Google AI Studio API (generativelanguage.googleapis.com)
- ✅ Authenticate with just the API key (no OAuth2 needed)
- ✅ Parse the response to extract generated images
- ✅ Return base64-encoded images to the frontend

## Working Implementation Details

### Current Hardcoded Configuration (VERIFIED WORKING ✅)

**Model**: `gemini-2.5-flash-image`  
**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`

### API Request Format (TESTED & WORKING)

```javascript
// Request body structure - DO NOT include "role" field!
{
  "contents": [
    {
      "parts": [
        {
          "text": "your image prompt here"
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

**CRITICAL**: Do NOT include `"role": "user"` in the contents array. This causes errors!

### Response Format

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "inlineData": {
              "mimeType": "image/png",
              "data": "base64-encoded-image-data-here"
            }
          }
        ]
      }
    }
  ]
}
```

### How the Code Works

1. **Fetch API Key**: Uses `/reveal` endpoint to unmask the API key from backend
   ```javascript
   const revealResponse = await fetch(
     `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/ai-providers/${selectedAIProvider}/reveal`,
     { method: 'POST', headers: { Authorization: `Bearer ${publicAnonKey}` } }
   );
   const { apiKey } = await revealResponse.json();
   ```

2. **Call Gemini API**: Direct REST API call with hardcoded endpoint
   ```javascript
   const geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
   const geminiResponse = await fetch(`${geminiEndpoint}?key=${apiKey}`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ /* request body above */ })
   });
   ```

3. **Extract Image**: Parse response and extract base64 image data
   ```javascript
   const geminiData = await geminiResponse.json();
   const imagePart = geminiData.candidates[0].content.parts.find(p => p.inlineData);
   const base64Image = imagePart.inlineData.data;
   const mimeType = imagePart.inlineData.mimeType || 'image/png';
   const dataUrl = `data:${mimeType};base64,${base64Image}`;
   ```

4. **Save to Library**: Convert data URL to blob using fetch() and upload
   ```javascript
   const response = await fetch(generatedImageUrl);
   const blob = await response.blob();
   const file = new File([blob], fileName, { type: blob.type });
   // ... upload via FormData to backend
   ```

## Supported Models (Reference Only)

⚠️ **NOTE:** The Media Library currently uses the hardcoded model above. This is for reference only.

Google AI Studio models that support image generation:

| Model Name | Description | Status |
|------------|-------------|--------|
| `gemini-2.5-flash-image` | **Currently Used (Hardcoded)** - Verified working | Stable |
| `gemini-2.0-flash-image-exp-001` | Experimental Gemini 2.0 image generation | Experimental |
| `imagen-3.0-generate-001` | Google's Imagen 3 model | Stable |
| `gemini-2.0-flash-exp` | Multimodal model (may support image generation) | Experimental |

## Troubleshooting

### "No image data in Gemini response" Error
This means the API returned successfully but didn't include image data.

✅ **Common Causes:**
1. **Wrong request format** - Check that `role: "user"` is NOT included
2. **Wrong model** - Make sure hardcoded model is `gemini-2.5-flash-image`
3. **Missing responseModalities** - Must include `"responseModalities": ["IMAGE"]`

✅ **Fix:**
- Check the code in `/components/MediaLibrary.tsx` around line 571
- Verify the endpoint is: `gemini-2.5-flash-image:generateContent`
- Check console logs for full response structure

### 404 Not Found Error
The model doesn't exist or the endpoint is wrong.

✅ **Check:**
1. **Hardcoded endpoint** - Should be `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`
2. **Model name spelling** - Must be exact: `gemini-2.5-flash-image`
3. **Base URL is correct** - Should be `https://generativelanguage.googleapis.com/v1beta`

✅ **Fix:**
- Revert to the working hardcoded version in the code
- Do NOT change the model name without testing thoroughly

### 400 Bad Request Error
The request format is wrong or the model doesn't support the operation.

✅ **Common Causes:**
1. **Model doesn't support image generation** - Try a different model
2. **Invalid prompt** - Some prompts may be rejected by safety filters
3. **Wrong request format** - The backend handles this, but check if the model changed

✅ **Debug:**
- Check backend logs for the full error message
- Look at the "Gemini API response" in logs
- Error message will say if the model doesn't support image generation

### 403/401 Authentication Error  
API key is invalid or doesn't have permission.

✅ **Check:**
1. **API key is correct** - Copy it again from Google AI Studio
2. **API key is active** - Keys can be disabled or deleted
3. **Billing is enabled** - Some Google AI features require billing
4. **API quota not exceeded** - Check your usage limits

✅ **Debug:**
- Check backend logs for authentication error details
- Try regenerating the API key in Google AI Studio
- Verify the key starts with `AIzaSy`

### No Image Returned
The API call succeeded but didn't return an image.

✅ **Common Issues:**
1. **Model returned text instead** - The model may not support image generation
   - Error will say: "Model returned text instead of image"
   - Try a different model that supports image generation
2. **Response format changed** - Google may have updated their API
   - Check backend logs for "Gemini API response"
   - Response should have `candidates[0].content.parts[0].inline_data.data`
3. **Safety filters blocked the image** - Prompt may violate content policies
   - Try a different, safer prompt

✅ **Debug:**
- Backend logs show full API response
- Look for `inline_data` in the response structure
- Check if `candidates[0].content.parts[0].text` exists (means text response, not image)

## Common Mistakes That Break It ❌

### 1. Including `role: "user"` in Request
**WRONG** ❌:
```json
{
  "contents": [
    {
      "role": "user",  // ← This breaks image generation!
      "parts": [{"text": "..."}]
    }
  ]
}
```

**CORRECT** ✅:
```json
{
  "contents": [
    {
      "parts": [{"text": "..."}]
    }
  ]
}
```

### 2. Using Wrong Model Name
The model MUST be `gemini-2.5-flash-image` in the endpoint URL, not `gemini-2.0-flash-exp` or other variants.

### 3. Manual Base64 Conversion for Upload
**WRONG** ❌: Using `atob()`, `charCodeAt()`, `Uint8Array` to manually decode
**CORRECT** ✅: Use `fetch(dataUrl)` to convert data URL to blob:
```javascript
const response = await fetch(generatedImageUrl);
const blob = await response.blob();
```

### 4. Forgetting `responseModalities: ["IMAGE"]`
Without this, Gemini may return text instead of an image.

## Testing

To test your configuration:
1. Go to **Media Library** dashboard
2. Click **AI Image Generation** button
3. Select your Gemini provider
4. Enter a prompt (e.g., "a futuristic football stadium at sunset")
5. Click **Generate**

Check the browser console and server logs for detailed debugging information.

## Cost Considerations

Google AI Studio pricing:
- Free tier available with rate limits
- Paid tier: Check current pricing at [Google AI Pricing](https://ai.google.dev/pricing)
- Typically more affordable than Vertex AI for development/prototyping

## Additional Resources

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [API Reference](https://ai.google.dev/api)
- [Image Generation with Gemini](https://ai.google.dev/gemini-api/docs/imagen)

## Differences from Vertex AI

| Feature | Google AI Studio (This Implementation) | Vertex AI |
|---------|--------------------------------------|-----------|
| **Authentication** | Simple API key | OAuth2 with service account JSON |
| **Endpoint** | generativelanguage.googleapis.com | {region}-aiplatform.googleapis.com |
| **Setup Complexity** | Very simple | Complex (service accounts, IAM) |
| **Cost** | Free tier + lower costs | Higher enterprise pricing |
| **Best For** | Development, prototyping, small apps | Enterprise, production at scale |

This implementation uses **Google AI Studio** because it's simpler and your API key (`AIzaSy...`) is already configured!
