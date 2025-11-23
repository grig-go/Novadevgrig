# Tailwind CSS v4.0 Setup Guide

This project uses **Tailwind CSS v4.0** with CSS-based configuration. This is different from traditional Tailwind setups.

## 🎯 Quick Summary

- ✅ **Tailwind is already configured** - no additional setup needed
- ❌ **DO NOT create `tailwind.config.js`** - it will break the setup
- ✅ All configuration is in `/styles/globals.css`
- ✅ Vite automatically processes Tailwind classes

## 📦 How It Works

### Traditional Tailwind (v3.x)
```
tailwind.config.js ❌ (Old way - DON'T USE)
```

### Tailwind v4.0 (This Project)
```
/styles/globals.css ✅ (New way - Already configured)
```

## 🔍 Verifying Tailwind Is Working

### 1. Check the Import

Open `/main.tsx` and verify this line exists:
```typescript
import './styles/globals.css';
```

### 2. Test a Component

Create a simple test in any component:
```tsx
<div className="flex items-center justify-center bg-primary text-primary-foreground p-4 rounded-lg">
  Tailwind is working! 🎉
</div>
```

If you see styled content, Tailwind is working.

### 3. Check Browser DevTools

1. Open browser DevTools (F12)
2. Inspect an element
3. Look for Tailwind utility classes like `flex`, `bg-primary`, etc.
4. If they have CSS rules applied, Tailwind is working

## 🐛 Troubleshooting

### Problem: No Styles Appear

**Symptoms:**
- Components have no styling
- Tailwind classes don't work
- Page looks unstyled

**Solution:**

1. **Verify globals.css is imported**
   ```bash
   # Check main.tsx contains:
   import './styles/globals.css';
   ```

2. **Clear cache and restart**
   ```bash
   rm -rf node_modules .vite build
   npm install
   npm run dev
   ```

3. **Check browser console for errors**
   - Open DevTools (F12)
   - Look for CSS or import errors
   - Check Network tab for failed CSS requests

### Problem: Some Classes Don't Work

**Possible Causes:**

1. **Typo in class name**
   ```tsx
   ❌ <div className="flexxx">           // Typo
   ✅ <div className="flex">
   ```

2. **Using arbitrary values**
   ```tsx
   ✅ <div className="w-[300px]">        // Arbitrary values work
   ✅ <div className="bg-[#ff0000]">     // Custom colors work
   ```

3. **Conflicting custom styles**
   - Check if you have conflicting CSS in other files
   - Tailwind uses PostCSS processing, conflicting styles may override

### Problem: Dark Mode Not Working

**Check `/styles/globals.css`:**
```css
.dark {
  --background: #0f1419;
  --foreground: #e4e8f0;
  /* ... more dark mode tokens ... */
}
```

**Verify dark mode toggle:**
- The app should have a theme toggle in the top menu
- HTML element should have `class="dark"` when enabled

## 🎨 Customizing Your Theme

All theme customization happens in `/styles/globals.css`.

### Adding Custom Colors

```css
:root {
  --my-custom-color: #ff6b6b;
}

@theme inline {
  --color-custom: var(--my-custom-color);
}
```

Then use in components:
```tsx
<div className="bg-custom text-custom">
  Custom color!
</div>
```

### Modifying Existing Colors

Edit the values in `:root` and `.dark` sections:
```css
:root {
  --primary: #030213;      /* Change this */
  --background: #ffffff;    /* Or this */
}

.dark {
  --primary: #5b7cff;      /* Dark mode primary */
  --background: #0f1419;    /* Dark mode background */
}
```

### Adding Custom Spacing

```css
@theme inline {
  --spacing-custom: 2.5rem;
}
```

Use with spacing utilities:
```tsx
<div className="p-[--spacing-custom]">
  Custom spacing
</div>
```

## 📚 What's Different in v4.0?

### Old Way (v3.x)
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#030213'
      }
    }
  }
}
```

### New Way (v4.0)
```css
/* styles/globals.css */
:root {
  --primary: #030213;
}

@theme inline {
  --color-primary: var(--primary);
}
```

## ✅ Build Process

### Development
```bash
npm run dev
```
- Vite watches `/styles/globals.css`
- Automatically processes Tailwind classes
- Hot reloads on changes

### Production
```bash
npm run build
```
- Vite bundles and optimizes CSS
- Removes unused Tailwind classes (tree-shaking)
- Outputs minified CSS

## 🔧 Advanced Configuration

### Adding Tailwind Plugins

Tailwind v4.0 plugins are added via CSS:

```css
@plugin "tailwindcss-animate";
@plugin "@tailwindcss/typography";
```

**Note**: Most plugins need to be v4.0 compatible. Check plugin documentation.

### Custom Variants

```css
@custom-variant hover-not-disabled (&:hover:not(:disabled));
```

Use in components:
```tsx
<button className="hover-not-disabled:bg-blue-500">
  Button
</button>
```

## 📦 Dependencies

The following packages are required for Tailwind to work:

```json
{
  "dependencies": {
    "tailwind-merge": "*",    // Merging Tailwind classes
    "clsx": "*"               // Conditional classes
  }
}
```

These are already in your `package.json`.

## 🚨 Common Mistakes

### 1. Creating tailwind.config.js
❌ **DON'T DO THIS:**
```bash
npx tailwindcss init  # Don't run this!
```

This creates a v3.x config file that conflicts with v4.0.

### 2. Installing old Tailwind versions
✅ **Correct**: Let Vite handle Tailwind (already configured)
❌ **Wrong**: Installing `tailwindcss` package separately

### 3. Modifying PostCSS config
The project doesn't need a separate PostCSS config. Vite handles this.

### 4. Using @tailwind directives
❌ **Old v3.x way:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

✅ **New v4.0 way:**
Already handled by the `@theme` directive in globals.css

## 📖 Learning Resources

- [Tailwind CSS v4.0 Alpha Docs](https://tailwindcss.com/docs/v4-beta)
- [Vite + Tailwind Guide](https://vitejs.dev/guide/)
- [CSS Variables in Tailwind](https://tailwindcss.com/docs/customizing-colors#using-css-variables)

## 🤝 Getting Help

**If Tailwind still isn't working:**

1. Check this file first
2. Verify `/styles/globals.css` exists and is imported
3. Clear all caches: `rm -rf node_modules .vite build && npm install`
4. Restart dev server: `npm run dev`
5. Check browser console for errors

**Still stuck?**
- Ensure Node.js version is 18+
- Try a different browser
- Check that port 3000 is not blocked by firewall

---

**Remember**: This is Tailwind v4.0 - if you see tutorials or docs mentioning `tailwind.config.js`, they're for v3.x and don't apply here! 🚀
