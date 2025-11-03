# Google AI Studio (Gemini) Image Generation Setup

## Overview
This application supports **Google AI Studio** (Gemini) for AI-powered image generation in the Media Library. This uses the simple Gemini API with just an API key - no complex OAuth2 or service accounts needed!

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
   - **Model**: `gemini-2.0-flash-exp` (supports image generation)
   - **Config** (optional): `{"image_model": "gemini-2.0-flash-exp"}`
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
   - **Model**: `gemini-2.0-flash-exp` (this model supports image generation)
   - **Config** (optional): For specific image model
     ```json
     {
       "image_model": "gemini-2.0-flash-exp"
     }
     ```
4. **Save** the provider
5. Go to **Dashboard Assignments** tab
6. **Assign to Media Library** with **Image Generation** capability enabled
7. **Test** by going to Media Library and clicking "AI Image Generation"

The backend will automatically:
- ✅ Use the simple Google AI Studio API (generativelanguage.googleapis.com)
- ✅ Authenticate with just the API key (no OAuth2 needed)
- ✅ Parse the response to extract generated images
- ✅ Return base64-encoded images to the frontend

## Supported Models

Google AI Studio models that support image generation:

- **`gemini-2.0-flash-exp`** (Recommended) - Experimental model with image generation
- **`gemini-2.5-flash-image`** - Dedicated image generation model (if available)
- **`gemini-1.5-pro`** - May support image generation in some contexts

You can specify a different model in the Config field:
```json
{
  "image_model": "gemini-2.5-flash-image"
}
```

The endpoint format is:
```
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}
```

## Troubleshooting

### 404 Not Found Error
The model doesn't exist or doesn't support the operation.

✅ **Check:**
1. **Model name is correct** - Use `gemini-2.0-flash-exp` or check available models
2. **Model supports image generation** - Not all Gemini models can generate images
3. **Endpoint is correct** - Should be `https://generativelanguage.googleapis.com/v1beta`

✅ **Fix:**
- Try changing the model in Config: `{"image_model": "gemini-2.0-flash-exp"}`
- Check Google AI Studio docs for currently available image generation models

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

## API Request Format

The Google AI Studio (Gemini) endpoint expects:
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "A high-resolution photo of a futuristic stadium"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95
  }
}
```

The response contains:
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "inline_data": {
              "mime_type": "image/png",
              "data": "base64-encoded-image-data"
            }
          }
        ]
      }
    }
  ]
}
```

## Testing

To test your configuration:
1. Go to **Media Library** dashboard
2. Click **AI Image Generation** button
3. Select your Vertex AI provider
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
