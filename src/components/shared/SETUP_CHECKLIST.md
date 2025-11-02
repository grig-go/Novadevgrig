# ✅ SharedTopMenuBar Setup Checklist

Use this checklist when copying SharedTopMenuBar to a new project.

## 📋 Pre-Setup Checklist

- [ ] I have access to the Nova Dashboard project
- [ ] I have access to the new project where I want to use it
- [ ] The new project uses React 18+
- [ ] The new project has Tailwind CSS configured

## 1️⃣ Copy Files

### Required (Must Copy)

- [ ] `components/shared/SharedTopMenuBar.tsx` → Copy to new project

### UI Components (Must Have)

Choose one option:

**Option A: Copy from Nova**
- [ ] `components/ui/button.tsx` → Copy to new project
- [ ] `components/ui/dropdown-menu.tsx` → Copy to new project

**Option B: Use ShadCN CLI**
- [ ] Run: `npx shadcn-ui@latest add button dropdown-menu`

### Optional (Recommended)

- [ ] `components/shared/SharedTopMenuBar.README.md` → For reference
- [ ] `components/shared/SharedTopMenuBar.example.tsx` → For examples

## 2️⃣ Install Dependencies

In your new project terminal:

```bash
# Required
- [ ] npm install lucide-react

# If missing React 18
- [ ] npm install react@^18.0.0 react-dom@^18.0.0

# If missing Tailwind CSS
- [ ] npm install -D tailwindcss postcss autoprefixer
- [ ] npx tailwindcss init -p
```

## 3️⃣ Configure Tailwind (If Needed)

If Tailwind is not set up:

- [ ] Update `tailwind.config.js` to include components path:
```js
content: [
  "./components/**/*.{js,ts,jsx,tsx}",
  "./app/**/*.{js,ts,jsx,tsx}",
]
```

- [ ] Enable dark mode:
```js
darkMode: 'class',
```

- [ ] Import Tailwind in your CSS:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 4️⃣ Create Configuration File

- [ ] Create `components/MyTopMenuBar.tsx` (or similar name)
- [ ] Import SharedTopMenuBar
- [ ] Configure branding object
- [ ] Configure menus object
- [ ] Add dark mode state (if needed)
- [ ] Add user state (if needed)

**Minimum required:**
```tsx
<SharedTopMenuBar
  branding={{ appName: 'My App', onLogoClick: () => {} }}
  menus={{}}
/>
```

## 5️⃣ Integrate into App

- [ ] Import your configured menu bar component
- [ ] Add to your main layout or App.tsx
- [ ] Place at the top of your app

```tsx
import { MyTopMenuBar } from './components/MyTopMenuBar';

function App() {
  return (
    <>
      <MyTopMenuBar />
      <main>{/* Your content */}</main>
    </>
  );
}
```

## 6️⃣ Test

- [ ] App compiles without errors
- [ ] Menu bar displays correctly
- [ ] App name/logo shows
- [ ] Menus open when clicked (if configured)
- [ ] Dark mode toggle works (if configured)
- [ ] User menu works (if configured)
- [ ] Responsive on mobile
- [ ] No console errors

## 🎨 Customization Checklist (Optional)

- [ ] Add custom logo images
- [ ] Configure Apps menu
- [ ] Configure Tools menu
- [ ] Configure Settings menu
- [ ] Configure Help menu
- [ ] Add custom menu sections
- [ ] Connect Account Settings dialog
- [ ] Connect Logout functionality
- [ ] Style with custom colors (if needed)

## 🐛 Troubleshooting

If something doesn't work, check:

- [ ] All files are copied to correct locations
- [ ] Import paths are correct (may need adjustment)
- [ ] All dependencies are installed
- [ ] Tailwind CSS is properly configured
- [ ] No TypeScript errors
- [ ] lucide-react icons are available

## 📊 Quick File Location Reference

```
Your New Project/
├── components/
│   ├── shared/
│   │   └── SharedTopMenuBar.tsx        ← Copy here
│   ├── ui/
│   │   ├── button.tsx                  ← Copy or install
│   │   └── dropdown-menu.tsx           ← Copy or install
│   └── MyTopMenuBar.tsx                ← Create this
├── App.tsx                             ← Import menu here
└── package.json                        ← Check dependencies
```

## ✅ Final Verification

Once everything is complete:

- [ ] Run `npm run dev` or `npm start`
- [ ] App loads without errors
- [ ] Menu bar appears at top
- [ ] Menus are functional
- [ ] Styling looks correct
- [ ] Dark mode works (if enabled)
- [ ] Ready for production!

## 🎯 Success!

If all items are checked, your SharedTopMenuBar is successfully integrated! 🎉

## 📚 Need Help?

- **Full documentation**: `SharedTopMenuBar.README.md`
- **Examples**: `SharedTopMenuBar.example.tsx`
- **Copy guide**: `COPY_TO_NEW_PROJECT.md`

---

**Time to complete**: ~10-15 minutes (first time), ~5 minutes (after experience)
