# Update Checklist for SharedTopMenuBar

Use this checklist whenever you update the SharedTopMenuBar component from any project.

## 📋 Pre-Update Checklist

- [ ] I understand the change I want to make
- [ ] I've checked if this will break existing implementations
- [ ] I've considered backwards compatibility
- [ ] I have access to test in at least one project

## 🔧 Making Changes

### Step 1: Edit the Component
- [ ] Edit `/components/shared/SharedTopMenuBar.tsx`
- [ ] Keep existing props optional when adding new features
- [ ] Add TypeScript types for new props
- [ ] Test changes locally in current project

### Step 2: Update Version Information

- [ ] Update version number in component header:
  ```tsx
  /**
   * @version 1.X.X  // <-- Update this
   * @lastUpdated YYYY-MM-DD
   */
  ```

- [ ] Update the exported version constant:
  ```tsx
  export const SHARED_TOP_MENU_BAR_VERSION = "1.X.X";
  ```

- [ ] Add entry to CHANGELOG in component header:
  ```tsx
  /**
   * CHANGELOG:
   * - 1.X.X (YYYY-MM-DD): Description of changes
   * - 1.0.0 (2025-10-14): Initial release
   */
  ```

### Step 3: Update Documentation

- [ ] Update `SharedTopMenuBar.README.md` if:
  - You added new props
  - You changed behavior
  - You added new features
  - You deprecated anything

- [ ] Update examples in `SharedTopMenuBar.example.tsx` if:
  - You added new props that should be demonstrated
  - You changed the recommended usage pattern

### Step 4: Version Number Guidelines

**Choose the right version bump:**

- [ ] **Patch** (1.0.X): Bug fixes, no new features
  - Fix dark mode toggle bug
  - Fix TypeScript type issue
  - Fix CSS styling bug

- [ ] **Minor** (1.X.0): New features, backwards compatible
  - Add new optional prop
  - Add new menu slot
  - Enhance existing functionality

- [ ] **Major** (X.0.0): Breaking changes
  - Remove deprecated props
  - Change required prop structure
  - Change component behavior significantly

## ✅ Testing Checklist

Test in your current project:

- [ ] Component renders without errors
- [ ] All menus open and close correctly
- [ ] Dark mode toggle works
- [ ] All click handlers fire correctly
- [ ] TypeScript compiles without errors
- [ ] No console warnings or errors
- [ ] Responsive layout works
- [ ] Custom menus work (if applicable)
- [ ] Account settings dialog works (if applicable)

## 📦 Sync to Other Projects

Choose your sync method:

### Option A: Manual Copy
- [ ] Copy `/components/shared/` folder to other projects
- [ ] Test in each project
- [ ] Commit in each project

### Option B: Sync Script
- [ ] Run `./scripts/sync-shared-components.sh`
- [ ] Review changes in each project
- [ ] Test in each project
- [ ] Commit in each project

### Option C: NPM Package
- [ ] Update version in `package.json`
- [ ] Run `npm publish`
- [ ] Update package in other projects: `npm update @yourorg/shared-top-menu-bar`
- [ ] Test in each project

## 📝 Documentation Updates

- [ ] Update version tracking in `SYNC_GUIDE.md`:
  ```markdown
  | Project | Version | Last Updated | Status |
  |---------|---------|--------------|--------|
  | Nova    | 1.X.X   | YYYY-MM-DD   | ✓      |
  ```

- [ ] If breaking changes, add migration guide to README

## 🔔 Communication

- [ ] Notify team of the update
- [ ] Share what changed
- [ ] Provide migration guide if needed (for breaking changes)
- [ ] Set timeline for adoption in other projects

## ✨ Post-Update

- [ ] All projects are synced and tested
- [ ] All projects are committed
- [ ] Documentation is up to date
- [ ] Team is notified
- [ ] Version tracking is updated

## 🚨 If Something Goes Wrong

### Rollback Process

1. **If you haven't synced yet:**
   - Just revert your changes in current project
   - `git checkout -- components/shared/`

2. **If you've synced to some projects:**
   - Check backups in `.backup-*` folders
   - Or use git to revert: `git checkout HEAD~1 -- components/shared/`

3. **If you've published to NPM:**
   - Publish a patch version fixing the issue
   - Or deprecate the bad version: `npm deprecate @yourorg/package@1.2.3 "Broken version"`

### Getting Help

- Check existing implementations in other projects
- Review the README for expected behavior
- Look at examples for usage patterns
- Ask team members who have used the component

## 📊 Version Decision Tree

```
Is it a bug fix?
├─ Yes → PATCH (1.0.X)
└─ No → Is it a new feature?
    ├─ Yes → Is it backwards compatible?
    │   ├─ Yes → MINOR (1.X.0)
    │   └─ No → MAJOR (X.0.0)
    └─ No → Is it a breaking change?
        ├─ Yes → MAJOR (X.0.0)
        └─ No → PATCH (1.0.X)
```

## ✅ Final Sign-Off

Before considering the update complete:

- [ ] All checkboxes above are checked
- [ ] Version number is updated correctly
- [ ] All target projects are synced
- [ ] All projects tested and working
- [ ] Documentation updated
- [ ] Team notified

---

**Remember**: The goal is to maintain a stable, well-documented shared component. Take your time, test thoroughly, and communicate changes! 🎯
