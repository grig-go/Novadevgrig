# SharedTopMenuBar - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Copy the Files

Copy these files to your new project:
```
components/shared/
  ├── SharedTopMenuBar.tsx       (Required)
  ├── SharedTopMenuBar.README.md (Reference)
  └── SharedTopMenuBar.example.tsx (Examples)
```

### 2. Install Dependencies

```bash
npm install lucide-react
```

Make sure you have ShadCN UI components:
- Button
- DropdownMenu (and related components)

### 3. Create Your Implementation

```tsx
import { SharedTopMenuBar } from './components/shared/SharedTopMenuBar';
import { LayoutGrid, Wrench, Settings, HelpCircle } from 'lucide-react';

function App() {
  const branding = {
    logoLight: '/logo-light.png',
    logoDark: '/logo-dark.png', 
    logoAlt: 'My App',
    appIcon: <div className="w-8 h-8 bg-blue-500 rounded">A</div>,
    appName: 'My App',
    onLogoClick: () => navigate('/'),
  };

  return <SharedTopMenuBar branding={branding} menus={{}} />;
}
```

### 4. Add Menus (Optional)

```tsx
const appsMenu = {
  id: 'apps',
  label: 'Apps',
  icon: LayoutGrid,
  sections: [{
    items: [
      { id: 'app1', label: 'App 1', onClick: () => {} }
    ]
  }],
};

<SharedTopMenuBar 
  branding={branding} 
  menus={{ apps: appsMenu }} 
/>
```

## 📦 Keeping It Updated

### Option 1: Manual Copy
When updates are made:
1. Copy the updated `SharedTopMenuBar.tsx`
2. Paste into your project
3. Test and commit

### Option 2: Use the Sync Script
```bash
# Edit sync-shared-components.sh with your project paths
chmod +x scripts/sync-shared-components.sh
./scripts/sync-shared-components.sh
```

### Option 3: NPM Package
```bash
# Publish once
npm publish

# Update in projects
npm update @yourorg/shared-top-menu-bar
```

## 🔄 Update Workflow

**From Any Project:**

1. **Edit** `SharedTopMenuBar.tsx`
2. **Update** version number and changelog
3. **Test** in current project
4. **Sync** to other projects (using method above)
5. **Commit** changes

## 🎯 Key Points

✅ **Can update from any project** - Yes! Just sync after.
✅ **Version tracked** - Check `SHARED_TOP_MENU_BAR_VERSION`
✅ **Backwards compatible** - New props are optional
✅ **Type-safe** - Full TypeScript support

## 📚 More Info

- **Full Docs**: See `SharedTopMenuBar.README.md`
- **Examples**: See `SharedTopMenuBar.example.tsx`
- **Sync Guide**: See `SYNC_GUIDE.md`

## 🆘 Need Help?

1. Check if dependencies are installed
2. Verify import paths match your structure
3. Look at the example implementations
4. Check the README for advanced usage

---

**TL;DR**: Copy files → Add branding config → Use component → Sync updates when needed! 🚀
