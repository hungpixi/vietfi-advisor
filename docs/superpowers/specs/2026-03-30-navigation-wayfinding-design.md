# Navigation & Wayfinding UX — Design Spec

## Context

VietFi Advisor's dashboard has 15 routes, some nested (e.g. `/dashboard/gurus/[id]`). Currently there are:
- **No breadcrumbs** — users on deep routes have no trail back
- **No back button** — mobile users lose context when sidebar is hidden
- **Sidebar fixed 260px** — no collapse option for power users who want more content space

## Components to Add

### 1. Breadcrumb Component

**File:** `src/components/ui/Breadcrumb.tsx`

A small, unobtrusive breadcrumb trail rendered at the top of the content area (above the page title). Auto-generates from the current route path using a config map.

**Config map (route → label):**
```typescript
const breadcrumbConfig: Record<string, { label: string; href?: string }[]> = {
  '/dashboard': [],
  '/dashboard/gurus': [{ label: 'Cố vấn AI', href: '/dashboard/gurus' }],
  '/dashboard/gurus/[id]': [
    { label: 'Cố vấn AI', href: '/dashboard/gurus' },
    { label: '{guruName}', href: null },  // current page, no link
  ],
  // future nested routes added here
};
```

**Behavior:**
- Renders nothing for routes not in the map (top-level dashboard pages)
- On nested routes, shows: `Trang chủ / Cố vấn AI / Livermore`
- Clickable segments navigate up the tree
- Mobile: same component, no change in behavior
- Styled with Lucide `ChevronRight` separators, muted text, hover underline

**Placement:** In `dashboard/layout.tsx`, above the page title slot. Use `<Breadcrumb />` as a shared component available to all dashboard pages.

### 2. BackButton Component

**File:** `src/components/ui/BackButton.tsx`

A simple back button for sub-pages that don't have a natural in-page back affordance. Consumes a route config to determine the destination.

**Config:**
```typescript
const backConfig: Record<string, string> = {
  '/dashboard/gurus/[id]': '/dashboard/gurus',
  // future sub-pages added here
};
```

**Behavior:**
- Renders nothing if no config entry for current path
- Shows: `← Quay lại` with hover state
- On mobile, this is critical since the sidebar overlay isn't always visible
- For `gurus/[id]`: navigates back to the guru list

**Placement:** `dashboard/gurus/[id]/page.tsx` — top-left of the page, before the guru name heading.

### 3. Collapsible Sidebar

**File:** `src/components/layout/Sidebar.tsx` (modified)

**State:** Persisted in localStorage (`vietfi_sidebar_collapsed: boolean`).

**Behavior:**
- Toggle button: chevron icon at the bottom of the sidebar
- **Expanded:** 260px, full labels visible
- **Collapsed:** 64px, icons only with tooltip on hover showing the label
- Smooth CSS transition (width: 200ms ease)
- When collapsed, sidebar items centered with icon + tooltip
- Gamification bar hidden when collapsed (too wide for 64px)
- Top bar stays visible regardless of state

**CSS approach:** Use a CSS class `.sidebar-collapsed` applied to the sidebar container. Width handled via CSS variable `--sidebar-width` (default 260px, collapsed 64px). Framer Motion AnimatePresence for smooth transition.

**Persistence:** localStorage, so state survives page reloads.

## Implementation Order

1. `Breadcrumb.tsx` — shared, used by layout
2. `BackButton.tsx` — simple, used by specific pages
3. Sidebar collapse — involves layout and state management

## Acceptance Criteria

- [ ] Breadcrumbs visible on `gurus/[id]` and any future nested routes
- [ ] Back button appears on `gurus/[id]` on mobile and desktop
- [ ] Sidebar collapse persists across page reloads
- [ ] Sidebar collapse works on mobile (icon-only mode)
- [ ] No regression in existing navigation behavior
- [ ] All new components have TypeScript types and follow existing code style

## Out of Scope

- Adding breadcrumbs to ALL pages (top-level pages don't need them)
- Sidebar collapse on non-dashboard routes
- Changes to the dot-progress indicators in the sidebar