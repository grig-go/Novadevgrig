# Shared Components Synchronization Guide

This guide explains how to keep shared components in sync across multiple projects.

## Current Version

- **SharedTopMenuBar**: v1.0.0 (Last updated: 2025-10-14)

## Updating from Any Project

Yes, you can update SharedTopMenuBar from any project! Follow these steps:

### Step 1: Make Your Changes

Edit the files in `/components/shared/`:
- `SharedTopMenuBar.tsx` - The main component
- `SharedTopMenuBar.README.md` - Documentation
- `SharedTopMenuBar.example.tsx` - Usage examples

### Step 2: Update Version Info

Update the version number and changelog in `SharedTopMenuBar.tsx`:

```tsx
/**
 * @version 1.1.0  // <-- Increment this
 * @lastUpdated 2025-10-15  // <-- Update date
 * 
 * CHANGELOG:
 * - 1.1.0 (2025-10-15): Added new feature X  // <-- Add entry
 * - 1.0.0 (2025-10-14): Initial release
 */

export const SHARED_TOP_MENU_BAR_VERSION = "1.1.0";  // <-- Update this too
```

### Step 3: Test Locally

Make sure the component still works in your current project:
- Test all menu interactions
- Test dark mode toggle
- Test responsive behavior
- Verify TypeScript types

### Step 4: Document Breaking Changes

If you made breaking changes, document them in the README under a "Migration" section.

### Step 5: Sync to Other Projects

Choose your synchronization method:

#### Method A: Manual Copy (Simplest)

1. Copy the entire `/components/shared/` folder
2. Paste into other projects
3. Update import paths if needed
4. Test in each project

**Files to copy:**
```
/components/shared/
  ├── SharedTopMenuBar.tsx
  ├── SharedTopMenuBar.README.md
  ├── SharedTopMenuBar.example.tsx
  └── SYNC_GUIDE.md (this file)
```

**Script to help:**
```bash
# From the source project
cp -r components/shared /path/to/other-project/components/

# Or create a sync script (see below)
```

#### Method B: Git-Based Sync

Create a shared repository for components:

```bash
# 1. Create a new repo for shared components
git init shared-components
cd shared-components
mkdir SharedTopMenuBar
# Copy files here

# 2. In each project, add as remote
git remote add shared-components git@github.com:yourorg/shared-components.git

# 3. Pull updates
git fetch shared-components
git checkout shared-components/main -- components/shared/

# 4. Commit to your project
git add components/shared/
git commit -m "Update SharedTopMenuBar to v1.1.0"
```

#### Method C: NPM Package (Advanced)

Publish as an internal or public NPM package:

```bash
# 1. Create package.json in /components/shared/
{
  "name": "@yourorg/shared-menu-bar",
  "version": "1.0.0",
  "main": "SharedTopMenuBar.tsx",
  "types": "SharedTopMenuBar.tsx"
}

# 2. Publish
npm publish

# 3. In other projects
npm install @yourorg/shared-menu-bar
npm update @yourorg/shared-menu-bar  # To get updates
```

## Quick Sync Script

Create this script in your project root as `sync-shared-components.sh`:

```bash
#!/bin/bash

# Configuration
SOURCE_PROJECT="/path/to/source/project"
TARGET_PROJECTS=(
  "/path/to/project1"
  "/path/to/project2"
  "/path/to/project3"
)

# Copy shared components to target projects
for target in "${TARGET_PROJECTS[@]}"; do
  echo "Syncing to $target..."
  cp -r "$SOURCE_PROJECT/components/shared/" "$target/components/shared/"
  echo "✓ Synced to $target"
done

echo "✓ All projects synced!"
```

**Usage:**
```bash
chmod +x sync-shared-components.sh
./sync-shared-components.sh
```

## Best Practices

### 1. **Semantic Versioning**

Follow semver (MAJOR.MINOR.PATCH):
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backwards compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

### 2. **Keep a Changelog**

Always update the changelog in the component file header:
```tsx
/**
 * CHANGELOG:
 * - 1.2.0 (2025-10-20): Added support for mobile menu
 * - 1.1.0 (2025-10-15): Added custom menu slots
 * - 1.0.0 (2025-10-14): Initial release
 */
```

### 3. **Backwards Compatibility**

Try to maintain backwards compatibility:
- Add new props as optional
- Deprecate old props before removing
- Provide migration guides

### 4. **Testing Before Sync**

Before syncing to other projects:
- ✓ Test in the current project
- ✓ Check TypeScript compilation
- ✓ Verify all examples still work
- ✓ Update documentation

### 5. **Communication**

When making updates:
- Announce to the team
- Document what changed
- Provide migration guide if needed
- Set a timeline for adoption

## Version Compatibility Matrix

Track which version is used in which project:

| Project | Version | Last Updated | Status |
|---------|---------|--------------|--------|
| Nova Dashboard | 1.0.0 | 2025-10-14 | ✓ Current |
| Pulsar | - | - | Not using |
| Fusion | - | - | Not using |
| Quasar | - | - | Not using |

## Troubleshooting

### Import Paths Don't Match

Different projects may have different structures. Update imports:

```tsx
// Original
import { Button } from "../ui/button";

// May need to be
import { Button } from "./ui/button";
// or
import { Button } from "../../ui/button";
```

### Missing Dependencies

Ensure target project has:
- `lucide-react`
- ShadCN UI components (Button, DropdownMenu, etc.)
- Tailwind CSS

### TypeScript Errors

Make sure TypeScript versions are compatible across projects.

### Styling Differences

If projects use different Tailwind configurations, you may need to adjust classes.

## Future Improvements

Consider these enhancements:
- [ ] Automated testing
- [ ] Storybook for component showcase
- [ ] Automated deployment to NPM
- [ ] CI/CD pipeline for testing across projects
- [ ] Visual regression testing

## Questions?

If you need help syncing or have questions:
1. Check the README.md for usage docs
2. Look at example.tsx for implementation patterns
3. Review this SYNC_GUIDE.md for process
4. Contact the Nova Dashboard team

---

**Remember**: The goal is to have a single, well-maintained component that works across all your projects. Update it from anywhere, but always sync changes to keep everything in harmony! 🎵
