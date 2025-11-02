# SharedTopMenuBar - All-In-One Setup Guide

Everything you need to use the SharedTopMenuBar in another project, all in one file.

---

## ⚡ SUPER QUICK VERSION (2 Minutes)

### Step 1: Copy Files

Copy these files to your new project:

```
FROM Nova Dashboard              TO Your New Project
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
components/shared/
  SharedTopMenuBar.tsx      →    components/shared/SharedTopMenuBar.tsx

components/ui/
  button.tsx                →    components/ui/button.tsx
  dropdown-menu.tsx         →    components/ui/dropdown-menu.tsx
```

### Step 2: Install Package

In your new project:

```bash
npm install lucide-react
```

### Step 3: Create Your Menu

Create a new file `components/MyTopMenuBar.tsx`:

```tsx
import { SharedTopMenuBar } from './shared/SharedTopMenuBar';

export function MyTopMenuBar() {
  return (
    <SharedTopMenuBar
      branding={{
        appName: 'My App',
        onLogoClick: () => window.location.href = '/',
      }}
      menus={{}}
    />
  );
}
```

### Step 4: Use It

In your `App.tsx`:

```tsx
import { MyTopMenuBar } from './components/MyTopMenuBar';

export default function App() {
  return (
    <>
      <MyTopMenuBar />
      <main>Your content here</main>
    </>
  );
}
```

### Done! ✅

That's it! You now have a working navigation bar.

---

## 📚 COMPLETE GUIDE (15 Minutes)

### Prerequisites

Before starting, make sure your project has:
- ✅ React 18+
- ✅ TypeScript
- ✅ Tailwind CSS configured

### Detailed Step 1: Copy Files

**Required Files:**

1. **Main Component** (REQUIRED)
   - File: `components/shared/SharedTopMenuBar.tsx`
   - Copy to: `your-project/components/shared/SharedTopMenuBar.tsx`

2. **UI Components** (REQUIRED)
   
   Option A - Copy from Nova:
   - File: `components/ui/button.tsx`
   - Copy to: `your-project/components/ui/button.tsx`
   - File: `components/ui/dropdown-menu.tsx`
   - Copy to: `your-project/components/ui/dropdown-menu.tsx`
   
   Option B - Use ShadCN CLI:
   ```bash
   cd your-project
   npx shadcn-ui@latest add button dropdown-menu
   ```

**Optional Files (for reference):**
- `SharedTopMenuBar.README.md` - Full documentation
- `SharedTopMenuBar.example.tsx` - Code examples

### Detailed Step 2: Install Dependencies

```bash
cd your-project

# Required: Icons library
npm install lucide-react

# If you don't have React 18:
npm install react@^18.0.0 react-dom@^18.0.0

# If you don't have Tailwind CSS:
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Detailed Step 3: Configure Tailwind (if needed)

If Tailwind isn't set up, configure it:

**tailwind.config.js:**
```js
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**styles/globals.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Detailed Step 4: Create Configuration

Create `components/MyTopMenuBar.tsx`:

```tsx
import { SharedTopMenuBar } from './shared/SharedTopMenuBar';
import { 
  LayoutGrid, 
  Wrench, 
  Settings, 
  HelpCircle, 
  BookOpen 
} from 'lucide-react';
import { useState, useEffect } from 'react';

export function MyTopMenuBar() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Configure branding
  const branding = {
    // Option 1: Use images
    logoLight: '/logo-light.png',
    logoDark: '/logo-dark.png',
    logoAlt: 'My App Logo',
    
    // Option 2: Use icon + text
    appIcon: (
      <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">
        M
      </div>
    ),
    appName: 'My Application',
    
    onLogoClick: () => {
      // Navigate to home
      window.location.href = '/';
    },
  };

  // Configure Apps menu
  const appsMenu = {
    id: 'apps',
    label: 'Apps',
    icon: LayoutGrid,
    sections: [
      {
        label: 'Main Apps',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutGrid,
            onClick: () => console.log('Navigate to dashboard'),
          },
          {
            id: 'analytics',
            label: 'Analytics',
            icon: LayoutGrid,
            onClick: () => console.log('Navigate to analytics'),
          },
        ],
      },
    ],
  };

  // Configure Tools menu
  const toolsMenu = {
    id: 'tools',
    label: 'Tools',
    icon: Wrench,
    sections: [
      {
        items: [
          {
            id: 'calculator',
            label: 'Calculator',
            icon: Wrench,
            onClick: () => console.log('Open calculator'),
          },
        ],
      },
    ],
  };

  // Configure Settings menu
  const settingsMenu = {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    sections: [
      {
        items: [
          {
            id: 'preferences',
            label: 'Preferences',
            icon: Settings,
            onClick: () => console.log('Open preferences'),
          },
        ],
      },
    ],
  };

  // Configure Help menu
  const helpMenu = {
    id: 'help',
    label: 'Help',
    icon: HelpCircle,
    sections: [
      {
        items: [
          {
            id: 'docs',
            label: 'Documentation',
            icon: BookOpen,
            onClick: () => window.open('https://docs.example.com'),
          },
        ],
      },
    ],
  };

  return (
    <SharedTopMenuBar
      branding={branding}
      menus={{
        apps: appsMenu,
        tools: toolsMenu,
        settings: settingsMenu,
        help: helpMenu,
      }}
      isDarkMode={isDarkMode}
      onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
      currentUser={{
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '/avatar.png',
      }}
      onAccountSettings={() => console.log('Open account settings')}
      onLogout={() => {
        console.log('Logout');
        // Add your logout logic here
      }}
    />
  );
}
```

### Detailed Step 5: Integrate into App

**App.tsx:**
```tsx
import { MyTopMenuBar } from './components/MyTopMenuBar';

export default function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <MyTopMenuBar />
      
      <main className="p-6">
        <h1 className="text-gray-900 dark:text-white">
          Welcome to My App
        </h1>
        {/* Your app content */}
      </main>
    </div>
  );
}
```

### Step 6: Test

Start your dev server and check:

- [ ] App compiles without errors
- [ ] Menu bar displays at top
- [ ] App name/logo shows correctly
- [ ] Menus open when clicked
- [ ] Menu items trigger onClick handlers
- [ ] Dark mode toggle works
- [ ] User menu appears (if configured)
- [ ] Responsive on mobile (menus collapse properly)

---

## 🎨 CUSTOMIZATION OPTIONS

### Adding Custom Logo

```tsx
const branding = {
  logoLight: '/my-logo-light.svg',
  logoDark: '/my-logo-dark.svg',
  logoAlt: 'My Company',
  onLogoClick: () => navigate('/'),
};
```

### Adding More Menu Items

```tsx
const myMenu = {
  id: 'my-menu',
  label: 'My Menu',
  icon: Star,
  sections: [
    {
      label: 'Section 1',
      items: [
        { id: 'item1', label: 'Item 1', onClick: () => {} },
        { id: 'item2', label: 'Item 2', onClick: () => {} },
      ],
    },
    {
      separator: true, // Adds a divider
    },
    {
      label: 'Section 2',
      items: [
        { id: 'item3', label: 'Item 3', onClick: () => {} },
      ],
    },
  ],
};
```

### Custom Menu Slot

You can add completely custom content:

```tsx
<SharedTopMenuBar
  branding={branding}
  menus={menus}
  customMenuSlot={
    <Button variant="outline">Custom Button</Button>
  }
/>
```

### Removing User Menu

Just don't provide `currentUser`:

```tsx
<SharedTopMenuBar
  branding={branding}
  menus={menus}
  // No currentUser prop = no user menu
/>
```

---

## 🐛 TROUBLESHOOTING

### Error: Cannot find module 'lucide-react'

**Solution:**
```bash
npm install lucide-react
```

### Error: Cannot find module '../ui/button'

**Solution:**
```bash
# Copy from Nova Dashboard
cp components/ui/button.tsx /path/to/your-project/components/ui/

# Or use ShadCN CLI
npx shadcn-ui@latest add button
```

### Error: Cannot find module '../ui/dropdown-menu'

**Solution:**
```bash
npx shadcn-ui@latest add dropdown-menu
```

### Styling looks wrong / No styles applied

**Check Tailwind config:**

1. Make sure `tailwind.config.js` includes your components:
```js
content: ["./components/**/*.{js,ts,jsx,tsx}"]
```

2. Make sure Tailwind CSS is imported in your main CSS file:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

3. Restart your dev server after config changes

### Dark mode not working

**Solution:**

1. Enable dark mode in Tailwind config:
```js
darkMode: 'class'
```

2. Apply the class to document:
```tsx
useEffect(() => {
  document.documentElement.classList.toggle('dark', isDarkMode);
}, [isDarkMode]);
```

### Import path errors

Adjust paths based on your project structure:

```tsx
// If your project has different structure
import { SharedTopMenuBar } from '../shared/SharedTopMenuBar';
// or
import { SharedTopMenuBar } from '@/components/shared/SharedTopMenuBar';
```

### TypeScript errors

Make sure you have TypeScript and React types:
```bash
npm install --save-dev @types/react @types/react-dom typescript
```

---

## 📊 CONFIGURATION REFERENCE

### BrandingConfig

```tsx
interface BrandingConfig {
  logoLight?: string;           // Light mode logo URL
  logoDark?: string;            // Dark mode logo URL
  logoAlt?: string;             // Alt text for logo
  appIcon?: ReactNode;          // Icon element (instead of logo)
  appName?: string;             // App name text
  onLogoClick: () => void;      // Logo click handler (required)
}
```

### Menu Structure

```tsx
interface Menu {
  id: string;                   // Unique ID
  label: string;                // Menu button label
  icon: LucideIcon;             // Icon component
  sections: MenuSection[];      // Menu sections
}

interface MenuSection {
  label?: string;               // Section title (optional)
  separator?: boolean;          // Show separator line
  items?: MenuItem[];           // Menu items
}

interface MenuItem {
  id: string;                   // Unique ID
  label: string;                // Item label
  icon?: LucideIcon;            // Item icon (optional)
  onClick: () => void;          // Click handler
}
```

### Props

```tsx
interface SharedTopMenuBarProps {
  branding: BrandingConfig;                     // Required
  menus: Record<string, Menu>;                  // Required
  isDarkMode?: boolean;                         // Optional
  onDarkModeToggle?: () => void;                // Optional
  currentUser?: {                               // Optional
    name: string;
    email: string;
    avatar?: string;
  };
  onAccountSettings?: () => void;               // Optional
  onLogout?: () => void;                        // Optional
  customMenuSlot?: ReactNode;                   // Optional
}
```

---

## 📁 FILE LOCATIONS

After setup, your project should have:

```
your-project/
├── components/
│   ├── shared/
│   │   └── SharedTopMenuBar.tsx          ← Copied from Nova
│   ├── ui/
│   │   ├── button.tsx                    ← Copied or installed
│   │   └── dropdown-menu.tsx             ← Copied or installed
│   └── MyTopMenuBar.tsx                  ← You created this
├── App.tsx                                ← Updated to use menu
├── package.json                           ← Added lucide-react
└── tailwind.config.js                     ← Configured for dark mode
```

---

## 🎯 WHAT YOU GET

After setup, you'll have:

✅ Professional navigation bar at top of your app
✅ Customizable branding (logo/icon + app name)
✅ Multiple dropdown menus (Apps, Tools, Settings, Help, etc.)
✅ Dark mode toggle with system support
✅ User account menu with settings and logout
✅ Fully responsive (mobile-friendly)
✅ TypeScript type safety
✅ Accessible keyboard navigation
✅ Production ready

---

## 🔄 UPDATING THE COMPONENT

If SharedTopMenuBar gets updated in Nova Dashboard:

1. Copy the new `SharedTopMenuBar.tsx` to your project
2. Check the version number and changelog in the file header
3. Test in your project
4. Update your configuration if needed

Version tracking is in the file:
```tsx
/**
 * @version 1.0.0
 * @lastUpdated 2025-10-14
 */
export const SHARED_TOP_MENU_BAR_VERSION = "1.0.0";
```

---

## 📞 NEED MORE HELP?

All documentation is in `/components/shared/` folder:

- `TLDR.md` - Quick 2-minute version
- `COPY_TO_NEW_PROJECT.md` - This guide in original format
- `SETUP_CHECKLIST.md` - Interactive checklist
- `SharedTopMenuBar.README.md` - Complete API reference
- `SharedTopMenuBar.example.tsx` - More code examples
- `SYNC_GUIDE.md` - Multi-project sync strategies

Just open them directly in your text editor!

---

## ✅ SUCCESS CHECKLIST

You're done when:

- [ ] SharedTopMenuBar.tsx is in your project
- [ ] UI components (button, dropdown-menu) are available
- [ ] lucide-react is installed
- [ ] Tailwind CSS is configured
- [ ] You created MyTopMenuBar.tsx with your config
- [ ] You imported it in App.tsx
- [ ] App runs without errors
- [ ] Menu bar appears at top
- [ ] Menus open and work correctly
- [ ] Ready to deploy!

---

**🎉 Congratulations! You now have a professional navigation bar in your project!**

**Setup time: 10-15 minutes | Future updates: 2 minutes**
