# 🚀 Copy SharedTopMenuBar to Another Project

## Quick 5-Step Setup

### Step 1: Copy Files to Your New Project

Copy these files/folders from Nova to your new project:

```bash
# Copy the shared component folder
cp -r components/shared/SharedTopMenuBar.tsx /path/to/new-project/components/shared/
cp -r components/shared/SharedTopMenuBar.README.md /path/to/new-project/components/shared/
cp -r components/shared/SharedTopMenuBar.example.tsx /path/to/new-project/components/shared/

# If your new project doesn't have components/shared folder yet:
mkdir -p /path/to/new-project/components/shared/
```

**Required file:**
- ✅ `SharedTopMenuBar.tsx` (main component)

**Optional but recommended:**
- 📖 `SharedTopMenuBar.README.md` (documentation)
- 💡 `SharedTopMenuBar.example.tsx` (examples)

### Step 2: Copy Required UI Components

SharedTopMenuBar depends on these ShadCN components. Copy them from Nova:

```bash
# Copy required UI components
cp components/ui/button.tsx /path/to/new-project/components/ui/
cp components/ui/dropdown-menu.tsx /path/to/new-project/components/ui/

# Or use ShadCN CLI in your new project:
npx shadcn-ui@latest add button dropdown-menu
```

**Required UI components:**
- ✅ `button.tsx`
- ✅ `dropdown-menu.tsx` (includes all dropdown components)

### Step 3: Install Dependencies

In your new project, install these npm packages:

```bash
cd /path/to/new-project

# Required: Lucide icons
npm install lucide-react

# If you don't have React 18:
npm install react@^18.0.0 react-dom@^18.0.0

# If you don't have Tailwind CSS setup, add it:
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Required dependencies:**
- ✅ `lucide-react` (for icons)
- ✅ React 18+
- ✅ Tailwind CSS v4.0 (or compatible)

### Step 4: Create Your Configuration

In your new project, create a file like `components/MyTopMenuBar.tsx`:

```tsx
import { SharedTopMenuBar } from './shared/SharedTopMenuBar';
import { LayoutGrid, Wrench, Settings, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export function MyTopMenuBar() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Configure your branding
  const branding = {
    logoLight: '/your-logo-light.png',
    logoDark: '/your-logo-dark.png',
    logoAlt: 'My App',
    appIcon: <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">M</div>,
    appName: 'My App',
    onLogoClick: () => {
      // Navigate to home
      console.log('Navigate to home');
    },
  };

  // Configure your Apps menu
  const appsMenu = {
    id: 'apps',
    label: 'Apps',
    icon: LayoutGrid,
    sections: [
      {
        label: 'My Apps',
        items: [
          {
            id: 'app1',
            label: 'App 1',
            icon: LayoutGrid,
            onClick: () => console.log('Navigate to App 1'),
          },
          {
            id: 'app2',
            label: 'App 2',
            icon: LayoutGrid,
            onClick: () => console.log('Navigate to App 2'),
          },
        ],
      },
    ],
  };

  // Configure your Settings menu
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

  return (
    <SharedTopMenuBar
      branding={branding}
      menus={{
        apps: appsMenu,
        settings: settingsMenu,
      }}
      isDarkMode={isDarkMode}
      onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
      currentUser={{
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '/avatar.png',
      }}
      onAccountSettings={() => console.log('Open account settings')}
      onLogout={() => console.log('Logout')}
    />
  );
}
```

### Step 5: Use in Your App

Import and use your configured menu bar:

```tsx
// App.tsx or your main layout
import { MyTopMenuBar } from './components/MyTopMenuBar';

export default function App() {
  return (
    <div className="min-h-screen">
      <MyTopMenuBar />
      
      <main>
        {/* Your app content */}
      </main>
    </div>
  );
}
```

## ✅ Checklist

Before using in your new project, make sure you have:

- [ ] Copied `SharedTopMenuBar.tsx` to `/components/shared/`
- [ ] Copied or installed `button.tsx` UI component
- [ ] Copied or installed `dropdown-menu.tsx` UI component
- [ ] Installed `lucide-react` package
- [ ] Have Tailwind CSS configured
- [ ] Created your configuration file
- [ ] Tested in development mode

## 🎨 Minimal Example

If you want the absolute minimum setup:

```tsx
import { SharedTopMenuBar } from './components/shared/SharedTopMenuBar';

function App() {
  return (
    <SharedTopMenuBar
      branding={{
        appName: 'My App',
        onLogoClick: () => {},
      }}
      menus={{}}
    />
  );
}
```

This gives you a basic menu bar with just the app name. You can add menus later!

## 🔧 Troubleshooting

### Import errors?

```
Error: Cannot find module 'lucide-react'
→ Solution: npm install lucide-react
```

```
Error: Cannot find module '../ui/button'
→ Solution: Copy button.tsx or run: npx shadcn-ui@latest add button
```

### Styling looks wrong?

Make sure Tailwind CSS is configured properly:

1. Check `tailwind.config.js` includes your components:
```js
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
}
```

2. Import Tailwind in your CSS:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Dark mode not working?

Make sure you have dark mode enabled in Tailwind:

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media'
}
```

And apply the dark class to your root element when toggling:

```tsx
useEffect(() => {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}, [isDarkMode]);
```

## 📚 More Help

- **Full API**: See `SharedTopMenuBar.README.md`
- **Examples**: See `SharedTopMenuBar.example.tsx`
- **Configuration**: See the examples in step 4 above

## 🎯 What You Get

After setup, you'll have:
- ✅ Professional navigation bar
- ✅ Customizable menus
- ✅ Dark mode support
- ✅ User account menu
- ✅ Responsive design
- ✅ Fully typed with TypeScript

---

**That's it!** Your SharedTopMenuBar is now ready to use in your new project. 🎉

**Need to update it later?** Just copy the updated `SharedTopMenuBar.tsx` file from Nova to your other projects!
