# Multi-Dashboard Application

A comprehensive multi-dashboard React application with TypeScript and Supabase integration, featuring Elections, Finance, Sports, Weather, News, Agents, Media Library, and School Closings dashboards.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase account** (for backend functionality)

### Installation

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The app will automatically open at `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

   Production files will be in the `/build` directory

## 🎨 Styling System

### Tailwind CSS v4.0

This project uses **Tailwind CSS v4.0** which is configured directly in the `/styles/globals.css` file.

**Important Notes:**
- ❌ **DO NOT create a `tailwind.config.js` file** - Tailwind v4.0 uses CSS-based configuration
- ✅ All Tailwind configuration is in `/styles/globals.css`
- ✅ Custom design tokens and colors are defined as CSS variables
- ✅ Dark mode is fully configured and works out of the box

### How Tailwind v4.0 Works Here

1. **Configuration Location**: `/styles/globals.css`
   - Contains all color tokens, spacing, and theme variables
   - Defines both light and dark mode colors
   - Uses the `@theme` directive for Tailwind v4.0

2. **No Config File Needed**
   - Tailwind v4.0 automatically detects your CSS configuration
   - The build process (Vite) automatically processes Tailwind classes
   - No additional setup required!

3. **Custom Tokens**
   ```css
   :root {
     --background: #ffffff;
     --foreground: oklch(0.145 0 0);
     --primary: #030213;
     /* ... more tokens */
   }
   ```

### If You Don't Have Tailwind Working

**Symptoms:**
- Classes like `flex`, `grid`, `bg-primary` don't work
- No styling appears on components

**Solution:**
Tailwind CSS should work automatically, but if it doesn't:

1. **Verify `/styles/globals.css` is imported in `/main.tsx`**
   ```typescript
   import './styles/globals.css';
   ```

2. **Check package.json includes required dependencies**
   ```json
   {
     "dependencies": {
       "tailwind-merge": "*",
       "clsx": "*"
     }
   }
   ```

3. **Reinstall dependencies**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Restart the dev server**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
/
├── components/           # React components
│   ├── ui/              # shadcn/ui components (don't modify)
│   ├── *Dashboard.tsx   # Dashboard components
│   └── ...              # Feature components
├── data/                # Mock data and data loaders
├── types/               # TypeScript type definitions
├── utils/               # Utility functions and hooks
├── styles/
│   └── globals.css      # Tailwind v4.0 configuration + global styles
├── supabase/
│   └── functions/       # Edge functions for backend
├── App.tsx              # Main application component
├── main.tsx             # Application entry point
└── vite.config.ts       # Vite configuration
```

## 🎯 Key Features

### Desktop-Only Mode

By default, the app is configured for **desktop-only mode**. To change this:

Edit `/components/ui/use-mobile.ts`:
```typescript
const FORCE_DESKTOP_MODE = true;  // Set to false to enable mobile detection
```

### Dashboard Configuration

Press **CTRL + SHIFT + G + M** to open the dashboard configuration modal where you can:
- Enable/disable dashboards
- Reorder dashboards
- Configure visibility settings

### Dark Mode

Dark mode is automatically available via the theme toggle in the top menu bar.

## 🔧 Configuration

### Supabase Setup

The app supports **three configuration modes**:

1. **Hardcoded Config** (Current Default) - Uses `/utils/supabase/info.tsx`
2. **Environment Variables** - Uses `.env.local` file (recommended)
3. **Local Supabase** - Full local development environment

**Configuration Status:**
- ✅ Supabase client supports environment variables
- ⚠️ Direct API fetch calls still use hardcoded values (30 files)
- See `SUPABASE_CONFIG_STATUS.md` for details

**Quick Setup for Remote Supabase:**

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Create `.env.local` file in project root:
   ```bash
   cp .env.example .env.local
   ```

3. Add your credentials to `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. Get credentials from Supabase Dashboard → Project Settings → API

5. Restart dev server:
   ```bash
   npm run dev
   ```

**For local Supabase development**, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for complete instructions.

**Fallback**: If no `.env.local` exists, the app uses hardcoded values from `/utils/supabase/info.tsx`.

### Media Storage

The app uses Supabase Storage with the following structure:
- **Bucket**: `media`
- **Folders**: `image/`, `video/`, `audio/` (singular, not plural)

**Important**: These folder names are standardized across the app.

## 📦 Dependencies

### Core Framework
- React 18.3.1
- TypeScript
- Vite 6.3.5

### UI Components
- shadcn/ui (Radix UI primitives)
- Tailwind CSS v4.0
- Lucide React (icons)

### Data & State
- Supabase JS Client
- React Hook Form
- Custom hooks for data fetching

### Visualization
- Recharts (charts and graphs)
- Motion (formerly Framer Motion)

## 🐛 Troubleshooting

### Styles Not Loading

1. Check that `/styles/globals.css` exists
2. Verify it's imported in `/main.tsx`
3. Clear browser cache and restart dev server

### TypeScript Errors

```bash
# Clear cache and rebuild
rm -rf node_modules build .vite
npm install
npm run dev
```

### Port Already in Use

The default port is 3000. To change it, edit `vite.config.ts`:
```typescript
server: {
  port: 3001, // Change to any available port
}
```

### Build Fails

1. Ensure all dependencies are installed: `npm install`
2. Check for TypeScript errors: Look at console output
3. Verify all imports exist and are correct

## 📝 Development Guidelines

### Adding New Components

- Place in `/components` directory
- Import and use existing shadcn/ui components from `/components/ui`
- Follow existing naming conventions

### Styling Best Practices

- Use Tailwind utility classes
- Reference design tokens from `globals.css`
- **DO NOT** override font-size, font-weight, or line-height unless necessary
- Use existing color variables: `bg-background`, `text-foreground`, etc.

### Working with Data

- Mock data is in `/data` directory
- Custom hooks for fetching are in `/utils`
- Supabase integration is via `/utils/supabase/client.tsx`

## 🚢 Deployment

### Build Production Bundle

```bash
npm run build
```

This creates an optimized production build in `/build` directory.

### Deploy Options

- **Vercel**: Connect your repo and deploy automatically
- **Netlify**: Drag and drop the `/build` folder
- **Static Hosting**: Upload `/build` contents to any static host

### Environment Variables

Create `.env` file for local development:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 📚 Additional Resources

- [Tailwind CSS v4.0 Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

## 🤝 Support

For issues with:
- **Tailwind not working**: Check the "Styling System" section above
- **Build errors**: See "Troubleshooting" section
- **Supabase connection**: Verify credentials in `/utils/supabase/info.tsx`

---

**Note**: This application is configured for Tailwind CSS v4.0 which uses CSS-based configuration. Do not create a `tailwind.config.js` file as it will conflict with the v4.0 setup.