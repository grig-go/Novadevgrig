# Local Development Guide

This guide explains how to run the application with a local Supabase instance for development.

## 🎯 Overview

The app supports **three configuration modes**:

1. **Hardcoded Config** (Default) - Uses values from `/utils/supabase/info.tsx`
2. **Environment Variables** - Uses `.env` or `.env.local` file
3. **Local Supabase** - Runs against local Supabase instance

## 📋 Current Configuration

### How It Works

The app uses a **priority system** for configuration:

```
Priority 1: Environment Variables (.env.local or .env)
           ↓ (if not found)
Priority 2: Hardcoded values (/utils/supabase/info.tsx)
```

This means:
- ✅ Environment variables **override** hardcoded values
- ✅ You can switch between local and remote without code changes
- ✅ Fallback to hardcoded values if no `.env` file exists

### Configuration Location

Open `/utils/supabase/client.tsx` to see the configuration logic:

```typescript
function getSupabaseUrl(): string {
  if (import.meta.env.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;  // Environment variable
  }
  return `https://${projectId}.supabase.co`;    // Fallback
}
```

## 🚀 Setup for Local Development

### Option 1: Remote Supabase with .env

**Use Case**: You want to use environment variables instead of hardcoded values.

1. **Create `.env.local` file** in project root:
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Get your credentials** from [Supabase Dashboard](https://app.supabase.com):
   - Go to Project Settings → API
   - Copy "Project URL" → `VITE_SUPABASE_URL`
   - Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

4. **Restart dev server**:
   ```bash
   npm run dev
   ```

5. **Verify** in browser console:
   ```
   🔧 Supabase Configuration: {
     url: "https://your-project-id.supabase.co",
     usingEnvVars: true,
     mode: "REMOTE"
   }
   ```

### Option 2: Local Supabase Instance

**Use Case**: You want to develop completely offline with a local database.

#### Prerequisites

Install Supabase CLI:
```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

Or using npm:
```bash
npm install -g supabase
```

#### Setup Steps

1. **Initialize Supabase** (if not already done):
   ```bash
   supabase init
   ```

2. **Start local Supabase**:
   ```bash
   supabase start
   ```
   
   This will output:
   ```
   Started supabase local development setup.
   
   API URL: http://localhost:54321
   GraphQL URL: http://localhost:54321/graphql/v1
   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
   Studio URL: http://localhost:54323
   Inbucket URL: http://localhost:54324
   JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Create `.env.local`**:
   ```bash
   cp .env.local.example .env.local
   ```

4. **Update `.env.local`** with the values from `supabase start`:
   ```env
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   
   **Note**: Use the `anon key` from the terminal output.

5. **Apply migrations** (if you have any):
   ```bash
   supabase db reset
   ```

6. **Start your app**:
   ```bash
   npm run dev
   ```

7. **Verify** in browser console:
   ```
   🔧 Supabase Configuration: {
     url: "http://127.0.0.1:54321",
     usingEnvVars: true,
     mode: "LOCAL"
   }
   ```

8. **Access Supabase Studio** at http://localhost:54323

## 🔄 Switching Between Local and Remote

### Quick Switch

Just change `.env.local`:

**For Local:**
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**For Remote:**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

**No Env File (Use Hardcoded):**
```bash
# Just delete or rename .env.local
mv .env.local .env.local.backup
```

Then restart the dev server: `npm run dev`

## 📁 File Structure

```
/
├── .env.example              # Template for remote config
├── .env.local.example        # Template for local config
├── .env.local               # Your actual config (gitignored)
├── .gitignore               # Ensures .env files are not committed
├── utils/
│   └── supabase/
│       ├── client.tsx       # Supabase client with env support
│       └── info.tsx         # Fallback hardcoded config
└── supabase/
    ├── config.toml          # Local Supabase configuration
    └── migrations/          # Database migrations
```

## 🔍 Debugging

### Check Current Configuration

The app logs configuration on startup in development mode:

1. Open browser DevTools (F12)
2. Look for console message:
   ```
   🔧 Supabase Configuration: {
     url: "...",
     usingEnvVars: true/false,
     mode: "LOCAL" or "REMOTE"
   }
   ```

### Environment Variables Not Working?

**Symptoms:**
- Console shows `usingEnvVars: false`
- App still uses hardcoded config

**Solutions:**

1. **Check file name**:
   ```bash
   # Must be exactly .env.local (not .env.local.txt)
   ls -la | grep .env
   ```

2. **Restart dev server**:
   ```bash
   # Vite only reads .env on startup
   # Stop server (Ctrl+C) then:
   npm run dev
   ```

3. **Verify environment variables**:
   ```typescript
   // Add to any component temporarily:
   console.log('ENV:', import.meta.env.VITE_SUPABASE_URL);
   ```

4. **Check for typos**:
   - Variable names must start with `VITE_`
   - Must be `VITE_SUPABASE_URL` (not `SUPABASE_URL`)

### Local Supabase Not Working?

**Check if Supabase is running:**
```bash
supabase status
```

**Restart Supabase:**
```bash
supabase stop
supabase start
```

**Reset database:**
```bash
supabase db reset
```

**Check Studio:**
Open http://localhost:54323 - if it doesn't load, Supabase isn't running.

## 🗄️ Database Management

### Create Migration

```bash
supabase migration new your_migration_name
```

Edit the generated file in `supabase/migrations/`, then apply:
```bash
supabase db reset
```

### Seed Data

Create `/supabase/seed.sql`:
```sql
INSERT INTO your_table (column1, column2) VALUES
  ('value1', 'value2'),
  ('value3', 'value4');
```

Apply seeds:
```bash
supabase db reset
```

### Sync Remote to Local

```bash
# Link to your project
supabase link --project-ref your-project-id

# Pull schema from remote
supabase db pull

# Pull storage buckets config
supabase storage pull
```

### Push Local to Remote

```bash
# Push migrations
supabase db push

# Deploy edge functions
supabase functions deploy
```

## 🚢 Deployment

### Using Environment Variables in Production

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL` → Your production URL
   - `VITE_SUPABASE_ANON_KEY` → Your production key
3. Redeploy

**Netlify:**
1. Go to Site Settings → Environment Variables
2. Add the same variables
3. Trigger new deploy

**Docker:**
```bash
docker build --build-arg VITE_SUPABASE_URL=https://... \
             --build-arg VITE_SUPABASE_ANON_KEY=... \
             -t myapp .
```

### Using Hardcoded Config (Current Default)

If you don't add environment variables, the app uses `/utils/supabase/info.tsx`:
- ✅ Simple deployment (no env vars needed)
- ❌ Values are in source code (committed to git)
- ⚠️ Less secure (anon key is public, but this is okay for Supabase's security model)

**To update hardcoded values:**
Edit `/utils/supabase/info.tsx`:
```typescript
export const projectId = "your-project-id"
export const publicAnonKey = "your-anon-key"
```

## 📝 Best Practices

### Development Workflow

```bash
# 1. Start local Supabase
supabase start

# 2. Start dev server with local config
npm run dev

# 3. Make changes and test

# 4. Create migrations for schema changes
supabase migration new add_new_table

# 5. When ready, push to remote
supabase db push
supabase functions deploy
```

### Security

- ✅ **Never commit** `.env` or `.env.local` files
- ✅ **Use environment variables** in production
- ✅ **Rotate keys** if accidentally committed
- ✅ **Use Row Level Security (RLS)** in Supabase for data protection
- ℹ️ **Anon key is public** - This is expected! RLS protects your data.

### Git

The `.gitignore` file already excludes:
```gitignore
.env
.env.local
.env.*.local
```

Verify before committing:
```bash
git status
# Should NOT show .env.local
```

## 🆘 Troubleshooting

### "Invalid API key" error

- Check that your anon key is correct in `.env.local`
- For local: Use the key from `supabase start` output
- For remote: Get from Supabase Dashboard → API

### CORS errors with local Supabase

Local Supabase should allow all origins. If you see CORS errors:
```bash
supabase stop
supabase start
```

### Changes not applying

Restart dev server after changing `.env.local`:
```bash
# Ctrl+C to stop, then:
npm run dev
```

### Can't connect to local database

```bash
# Check status
supabase status

# Check Docker is running
docker ps

# Restart everything
supabase stop
supabase start
```

## 📚 Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Quick Reference:**

| Mode | Config Source | Use Case |
|------|---------------|----------|
| **Default** | `/utils/supabase/info.tsx` | Simple deployment, no setup |
| **Remote with .env** | `.env.local` | Better security, multiple environments |
| **Local Supabase** | `.env.local` + `supabase start` | Offline development, testing |

**Priority:** `.env.local` → `info.tsx`
