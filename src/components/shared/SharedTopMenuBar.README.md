# SharedTopMenuBar Component

A reusable, configurable top menu bar component that can be used across multiple projects. This component provides a consistent navigation experience with customizable branding, menus, and functionality.

## Features

- **Customizable Branding**: Configure logo (light/dark variants), app icon, and app name
- **Flexible Menu System**: Support for Apps, Tools, Settings, Help, and custom menus
- **Dark Mode Support**: Built-in dark mode toggle with external or internal state management
- **Dropdown Menus**: Organized menu items with sections, icons, and separators
- **Account Settings Integration**: Slot for custom account settings dialog or other components
- **Responsive Design**: Works across different screen sizes
- **Type-Safe**: Full TypeScript support with comprehensive interfaces

## Installation

Copy the `SharedTopMenuBar.tsx` file to your project's components directory.

Required dependencies:
- `lucide-react` (for icons)
- ShadCN UI components: `Button`, `DropdownMenu` and related components

## Basic Usage

```tsx
import { SharedTopMenuBar } from './components/shared/SharedTopMenuBar';
import { LayoutGrid, Wrench, Settings, HelpCircle } from 'lucide-react';

function MyApp() {
  const branding = {
    logoLight: '/logo-light.png',
    logoDark: '/logo-dark.png',
    logoAlt: 'My App',
    appIcon: <div className="w-8 h-8 bg-blue-500 rounded">A</div>,
    appName: 'My App',
    onLogoClick: () => navigate('/'),
  };

  const appsMenu = {
    id: 'apps',
    label: 'Apps',
    icon: LayoutGrid,
    sections: [
      {
        items: [
          { id: 'app1', label: 'App 1', onClick: () => navigate('/app1') },
          { id: 'app2', label: 'App 2', onClick: () => navigate('/app2') },
        ],
      },
    ],
  };

  return (
    <SharedTopMenuBar
      branding={branding}
      menus={{ apps: appsMenu }}
    />
  );
}
```

## Props

### `BrandingConfig`

| Property | Type | Description |
|----------|------|-------------|
| `logoLight` | `string` | URL/path for logo in dark mode (light logo) |
| `logoDark` | `string` | URL/path for logo in light mode (dark logo) |
| `logoAlt` | `string` | Alt text for logo image |
| `appIcon` | `ReactNode` | Custom app icon component/element |
| `appName` | `string` | Name of the application |
| `onLogoClick` | `() => void` | Handler when logo is clicked |

### `MenuItem`

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for the menu item |
| `label` | `string` | Display text for the menu item |
| `icon?` | `LucideIcon` | Optional icon component |
| `onClick?` | `() => void` | Click handler |
| `disabled?` | `boolean` | Whether the item is disabled |
| `variant?` | `'default' \| 'destructive'` | Visual variant (e.g., red text for destructive) |

### `MenuSection`

| Property | Type | Description |
|----------|------|-------------|
| `label?` | `string` | Optional section label |
| `items` | `MenuItem[]` | Array of menu items in this section |

### `MenuDropdown`

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for the dropdown |
| `label` | `string` | Display text for the dropdown button |
| `icon` | `LucideIcon` | Icon for the dropdown button |
| `sections` | `MenuSection[]` | Array of sections containing menu items |

### `SharedTopMenuBarProps`

| Property | Type | Description |
|----------|------|-------------|
| `branding` | `BrandingConfig` | Branding configuration |
| `menus` | `object` | Object containing menu configurations |
| `menus.apps?` | `MenuDropdown` | Optional Apps dropdown menu |
| `menus.tools?` | `MenuDropdown` | Optional Tools dropdown menu |
| `menus.settings?` | `MenuDropdown` | Optional Settings dropdown menu |
| `menus.help?` | `MenuDropdown` | Optional Help dropdown menu |
| `darkMode?` | `boolean` | External dark mode state |
| `onDarkModeToggle?` | `() => void` | Handler for dark mode toggle |
| `accountSettingsDialog?` | `ReactNode` | Custom dialog/content to render |
| `customMenus?` | `MenuDropdown[]` | Additional custom menu dropdowns |

## Advanced Usage

### Dark Mode Toggle

The component supports two modes for dark mode:

**1. Internal State (Default)**
```tsx
<SharedTopMenuBar
  branding={branding}
  menus={menus}
  // No darkMode or onDarkModeToggle props
/>
```

**2. External State (Controlled)**
```tsx
const [darkMode, setDarkMode] = useState(false);

<SharedTopMenuBar
  branding={branding}
  menus={menus}
  darkMode={darkMode}
  onDarkModeToggle={() => setDarkMode(!darkMode)}
/>
```

### Settings Menu with Dark Mode

To include the dark mode toggle in the Settings menu, add an item with `id: 'dark-mode-toggle'`:

```tsx
const settingsMenu = {
  id: 'settings',
  label: 'Settings',
  icon: Settings,
  sections: [
    {
      label: 'Preferences',
      items: [
        { id: 'dark-mode-toggle', label: 'Dark Mode' }, // Special handling
      ],
    },
    {
      items: [
        { id: 'account', label: 'Account Settings', onClick: openSettings },
      ],
    },
  ],
};
```

### Account Settings Dialog

You can pass any React component to render below the menu bar:

```tsx
<SharedTopMenuBar
  branding={branding}
  menus={menus}
  accountSettingsDialog={
    <MyAccountDialog 
      open={isOpen} 
      onClose={() => setIsOpen(false)} 
    />
  }
/>
```

### Custom Menus

Add additional menu dropdowns beyond the standard four:

```tsx
const customMenu = {
  id: 'custom',
  label: 'Custom',
  icon: Star,
  sections: [
    {
      items: [
        { id: 'item1', label: 'Custom Item 1', onClick: handleClick },
      ],
    },
  ],
};

<SharedTopMenuBar
  branding={branding}
  menus={menus}
  customMenus={[customMenu]}
/>
```

### Menu Items with Icons

```tsx
const toolsMenu = {
  id: 'tools',
  label: 'Tools',
  icon: Wrench,
  sections: [
    {
      items: [
        { 
          id: 'tool1', 
          label: 'Data Analyzer', 
          icon: Database,
          onClick: () => navigate('/analyzer') 
        },
        { 
          id: 'tool2', 
          label: 'Reports', 
          icon: FileText,
          onClick: () => navigate('/reports') 
        },
      ],
    },
  ],
};
```

### Disabled Menu Items

```tsx
{
  items: [
    { id: 'active', label: 'Active Feature', onClick: handleClick },
    { id: 'coming-soon', label: 'Coming Soon', disabled: true },
  ],
}
```

### Destructive Actions

Use the `destructive` variant for dangerous actions like sign out:

```tsx
{
  items: [
    { 
      id: 'signout', 
      label: 'Sign Out', 
      icon: LogOut,
      variant: 'destructive',
      onClick: handleSignOut 
    },
  ],
}
```

## Complete Example

See `/components/TopMenuBar.tsx` for a complete implementation example with:
- Custom branding (EMERGENT logo + Nova app)
- All four standard menus (Apps, Tools, Settings, Help)
- Dark mode integration
- Account settings dialog integration
- Navigation handling
- User management integration

## Styling

The component uses Tailwind CSS classes and follows the ShadCN UI design system. Key classes:

- `sticky top-0 z-50`: Keeps the menu bar at the top
- `border-b bg-card`: Standard card styling with bottom border
- `h-14`: Standard height for the menu bar
- `container mx-auto px-4`: Responsive container

You can customize these by wrapping the component or modifying the classes in the source.

## Migration Guide

To migrate an existing top menu bar to use this shared component:

1. **Extract your branding configuration**:
   - Logo images (light and dark variants)
   - App icon
   - App name
   - Logo click handler

2. **Convert your menus to the MenuDropdown format**:
   - Identify all dropdown menus
   - Map items to MenuItem objects
   - Group items into sections

3. **Handle special cases**:
   - Dark mode toggle (use `id: 'dark-mode-toggle'`)
   - Account settings dialog (pass as prop)
   - Custom menus (use `customMenus` prop)

4. **Update imports and props**:
   - Import SharedTopMenuBar
   - Pass configuration objects
   - Remove old menu bar code

## Browser Support

- Modern browsers with ES6+ support
- React 16.8+ (hooks)
- TypeScript 4.0+

## License

This component is part of your project and follows your project's license.
