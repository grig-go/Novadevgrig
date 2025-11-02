# TL;DR - SharedTopMenuBar in Another Project

## 🚀 Super Quick Guide (2 Minutes)

### What You Need

```bash
# 1. Copy this file
SharedTopMenuBar.tsx → /new-project/components/shared/

# 2. Copy or install these
button.tsx → /new-project/components/ui/
dropdown-menu.tsx → /new-project/components/ui/

# 3. Install this
npm install lucide-react
```

### Minimum Code

```tsx
// components/MyTopMenuBar.tsx
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

```tsx
// App.tsx
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

That's literally it for the basics!

---

## 🎨 Want More? Add Menus

```tsx
import { LayoutGrid, Settings } from 'lucide-react';

const appsMenu = {
  id: 'apps',
  label: 'Apps',
  icon: LayoutGrid,
  sections: [{
    items: [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        onClick: () => navigate('/dashboard') 
      },
    ],
  }],
};

<SharedTopMenuBar
  branding={{ appName: 'My App', onLogoClick: () => {} }}
  menus={{ apps: appsMenu }}  // ← Add menus here
/>
```

---

## 🌙 Want Dark Mode?

```tsx
import { useState, useEffect } from 'react';

const [isDarkMode, setIsDarkMode] = useState(false);

useEffect(() => {
  document.documentElement.classList.toggle('dark', isDarkMode);
}, [isDarkMode]);

<SharedTopMenuBar
  branding={{ appName: 'My App', onLogoClick: () => {} }}
  menus={{}}
  isDarkMode={isDarkMode}
  onDarkModeToggle={() => setIsDarkMode(!isDarkMode)}
/>
```

---

## 👤 Want User Menu?

```tsx
<SharedTopMenuBar
  branding={{ appName: 'My App', onLogoClick: () => {} }}
  menus={{}}
  currentUser={{
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatar.png',
  }}
  onAccountSettings={() => console.log('Settings')}
  onLogout={() => console.log('Logout')}
/>
```

---

## 📦 Files Needed

| File | From | To | Required? |
|------|------|----|----|
| `SharedTopMenuBar.tsx` | `components/shared/` | `components/shared/` | ✅ Yes |
| `button.tsx` | `components/ui/` | `components/ui/` | ✅ Yes |
| `dropdown-menu.tsx` | `components/ui/` | `components/ui/` | ✅ Yes |
| `lucide-react` | npm | npm | ✅ Yes |

---

## 🐛 Not Working?

```bash
# Import error?
npm install lucide-react

# Button not found?
npx shadcn-ui@latest add button dropdown-menu

# Tailwind not working?
# Check tailwind.config.js includes "./components/**/*.{ts,tsx}"
```

---

## 📚 Need Full Details?

- **Copy guide**: `COPY_TO_NEW_PROJECT.md`
- **Checklist**: `SETUP_CHECKLIST.md`
- **Full docs**: `SharedTopMenuBar.README.md`
- **Examples**: `SharedTopMenuBar.example.tsx`

---

**That's it!** Really. Copy one file, install one package, write 10 lines of code. Done. 🎉
