# Tabs Component Migration Guide

This guide provides specific recommendations for refactoring existing pages to use the new Tabs component.

## Overview

The following pages currently have inline tab implementations that can benefit from using the new reusable Tabs component:

1. **AnswerSheets.tsx** ✅ **COMPLETED**
2. **DateSheets.tsx** - Underline variant recommended
3. **CentreGuidelines.tsx** - Underline variant recommended
4. **SeatingPlan.tsx** - Card-based tabs (consider custom styling)

---

## 1. AnswerSheets.tsx ✅ COMPLETED

**Status**: Successfully refactored to use the new Tabs component.

**Implementation**: Uses pill variant with icons, badges, and color coding.

**Result**: 
- Reduced code from ~50 lines to ~60 lines (including tabs config)
- Added keyboard navigation
- Improved accessibility
- Consistent styling

---

## 2. DateSheets.tsx

### Current Implementation

```tsx
const [activeTab, setActiveTab] = useState<'all' | 'centre' | 'centre10th' | 'centre12th'>('all')
```

The page uses tabs to filter between:
- All datesheets (CBSE)
- Centre datesheets (all)
- Centre datesheets (Class 10th)
- Centre datesheets (Class 12th)

### Current Tab Style

Currently uses button-based tabs with conditional styling (appears to be underline style based on grep results).

### Recommended Refactoring

**Variant**: `underline` - Clean and minimal, perfect for content filtering

**Code Changes**:

```tsx
// Add import
import { Tabs } from '../components/common/Tabs'
import type { TabConfig } from '../components/common/Tabs'

// Define tabs configuration (add after state declarations)
const datesheetTabs: TabConfig<'all' | 'centre' | 'centre10th' | 'centre12th'>[] = [
  {
    id: 'all',
    label: 'CBSE Datesheet',
    badge: stats.fullDatesheet,
    color: 'blue',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'centre',
    label: 'Centre (All)',
    badge: stats.centre,
    color: 'emerald',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    id: 'centre10th',
    label: 'Class 10th',
    badge: stats.centre10th,
    color: 'purple',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  {
    id: 'centre12th',
    label: 'Class 12th',
    badge: stats.centre12th,
    color: 'amber',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  }
]

// Replace inline tabs with:
<Tabs
  tabs={datesheetTabs}
  activeTab={activeTab}
  onChange={setActiveTab}
  variant="underline"
  size="md"
  ariaLabel="Datesheet filters"
/>
```

### Benefits

- ✅ Consistent navigation across pages
- ✅ Keyboard navigation (Arrow keys, Home/End)
- ✅ Better accessibility (ARIA attributes)
- ✅ Badge support for showing counts
- ✅ Less code to maintain
- ✅ Automatic disabled state support if needed

### Estimated Effort

- **Time**: 15-20 minutes
- **Risk**: Low (straightforward replacement)
- **Lines Saved**: ~30-40 lines

---

## 3. CentreGuidelines.tsx

### Current Implementation

```tsx
const [activeTab, setActiveTab] = useState<'viewer' | 'chapters' | 'appendices' | 'search'>('viewer')
```

The page uses tabs to switch between:
- PDF Viewer
- Chapters navigation
- Appendices navigation
- Search results

### Current Tab Style

Currently uses button-based tabs with bottom border (underline style) based on code:
```tsx
className={`px-6 py-3 text-sm font-medium border-b-2 ${
  activeTab === 'viewer'
    ? 'border-blue-500 text-blue-600'
    : 'border-transparent text-gray-500 hover:text-gray-700'
}`}
```

### Recommended Refactoring

**Variant**: `underline` - Matches existing design language

**Code Changes**:

```tsx
// Add import
import { Tabs } from '../components/common/Tabs'
import type { TabConfig } from '../components/common/Tabs'

// Define tabs configuration
const guidelineTabs: TabConfig<'viewer' | 'chapters' | 'appendices' | 'search'>[] = [
  {
    id: 'viewer',
    label: 'Viewer',
    color: 'blue',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  },
  {
    id: 'chapters',
    label: 'Chapters',
    color: 'emerald',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    )
  },
  {
    id: 'appendices',
    label: 'Appendices',
    color: 'purple',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'search',
    label: 'Search Results',
    badge: searchResults.length > 0 ? searchResults.length : undefined,
    color: 'amber',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  }
]

// Replace inline tabs with:
<Tabs
  tabs={guidelineTabs}
  activeTab={activeTab}
  onChange={setActiveTab}
  variant="underline"
  size="md"
  ariaLabel="Centre guidelines navigation"
/>
```

### Special Considerations

- The search tab badge can dynamically show the number of search results
- Consider disabling the search tab when `searchResults.length === 0` initially

### Benefits

- ✅ Cleaner, more maintainable code
- ✅ Dynamic badge for search results count
- ✅ Better keyboard navigation
- ✅ Consistent with other pages

### Estimated Effort

- **Time**: 15-20 minutes
- **Risk**: Low
- **Lines Saved**: ~40-50 lines

---

## 4. SeatingPlan.tsx

### Current Implementation

```tsx
const [activeTab, setActiveTab] = useState<'mainGate' | 'roomFolderSlip' | 'roomDoorSlip' | 'cbseCopy'>('mainGate')
```

The page uses card-based tabs (large clickable cards) to switch between different seating plan types:
- Main Gate Display
- Room Folder Slip
- Room Door Slip
- CBSE Copy Format

### Current Tab Style

Uses large card-based buttons with icons, descriptions, and ring styling:
```tsx
<button
  onClick={() => setActiveTab('mainGate')}
  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all ${
    activeTab === 'mainGate' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
  }`}
>
  <div className="flex items-center">
    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" ...>
    </div>
    <div className="ml-4">
      <h3 className="text-lg font-semibold">Main Gate Display</h3>
      <p className="text-sm text-gray-600">Large format seating arrangement</p>
    </div>
  </div>
</button>
```

### Recommendation

**Option 1: Keep Current Implementation** ⭐ RECOMMENDED

The current card-based implementation is visually appropriate for this use case because:
- Each option needs more space for description text
- Cards provide better visual hierarchy
- The design pattern is distinct from other navigation (intentionally)
- Tabs component's variants don't naturally support this layout

**Option 2: Custom Tab Variant (Advanced)**

If consistency with other pages is critical, you could:
1. Add a new `card` variant to the Tabs component
2. Extend the TabConfig to support subtitle/description
3. Implement card-based styling in Tabs.tsx

However, this adds complexity for a single use case.

### Recommendation: Keep As-Is

**Reasoning**:
- Current implementation is clear and functional
- Card layout is semantically appropriate for this context
- Would require significant work to make Tabs component support this pattern
- Not all navigation needs to use the same component

### Alternative: Use Tabs for Sub-Navigation

If sub-navigation is added later (e.g., filtering by date or class), the Tabs component could be used there:

```tsx
// Future potential usage
<Tabs
  tabs={[
    { id: 'all', label: 'All Dates', badge: allDates.length },
    { id: 'today', label: 'Today', badge: todayCount },
    { id: 'upcoming', label: 'Upcoming', badge: upcomingCount }
  ]}
  activeTab={dateFilter}
  onChange={setDateFilter}
  variant="pill"
  size="sm"
/>
```

---

## Migration Checklist

For each page you migrate:

- [ ] Add imports for `Tabs` and `TabConfig`
- [ ] Create tabs configuration array with proper TypeScript typing
- [ ] Add icons (optional but recommended)
- [ ] Add badges where counts are shown
- [ ] Choose appropriate color per tab
- [ ] Select appropriate variant (`pill`, `underline`, or `enclosed`)
- [ ] Replace inline tab implementation
- [ ] Test keyboard navigation (Arrow keys, Home, End)
- [ ] Test with screen reader (if available)
- [ ] Verify dark mode appearance
- [ ] Remove old tab styling code
- [ ] Update any CSS classes that referenced old tabs

---

## General Best Practices

### 1. Choose the Right Variant

- **Pill**: Dashboard metrics, status views (e.g., AnswerSheets)
- **Underline**: Content filtering, document navigation (e.g., DateSheets, Guidelines)
- **Enclosed**: Form sections, step-by-step wizards
- **Keep as-is**: Card-based selections, complex options (e.g., SeatingPlan)

### 2. Use TypeScript Generics

Always type your tab IDs for better type safety:

```tsx
type TabIds = 'tab1' | 'tab2' | 'tab3'
const [activeTab, setActiveTab] = useState<TabIds>('tab1')
const tabs: TabConfig<TabIds>[] = [...]
```

### 3. Color Consistency

Use consistent color schemes across the app:
- **Blue**: Primary, Received, Default
- **Emerald/Green**: Success, Used, Completed
- **Amber/Yellow**: Warning, Pending, Balance
- **Rose/Red**: Danger, Discarded, Error
- **Purple**: Special, Premium features
- **Gray**: Neutral, Disabled

### 4. Badge Guidelines

- Only show badges when they provide value (counts, notifications)
- Don't show badges with 0 (undefined is better)
- Keep badge text short (numbers preferred)

### 5. Icons

- Use consistent icon libraries (lucide-react or SVG)
- Keep icons simple and recognizable
- Use 16px (w-4 h-4) for md size, 12px (w-3 h-3) for sm
- Ensure icons have proper contrast in both light and dark modes

---

## Testing After Migration

After migrating a page, test the following:

### Functionality
- [ ] Tab switching works correctly
- [ ] State updates properly on tab change
- [ ] Content displays correctly for each tab
- [ ] Loading states work (if applicable)

### Keyboard Navigation
- [ ] Tab key moves focus in/out of tabs
- [ ] Arrow keys navigate between tabs
- [ ] Home/End jump to first/last tab
- [ ] Enter/Space activate focused tab

### Accessibility
- [ ] Screen reader announces tab selection
- [ ] ARIA attributes are present (`role`, `aria-selected`, etc.)
- [ ] Focus indicators are visible
- [ ] Disabled tabs are properly announced

### Visual
- [ ] Tabs look correct in light mode
- [ ] Tabs look correct in dark mode
- [ ] Active state is clear
- [ ] Hover states work
- [ ] Icons and badges display properly
- [ ] Responsive layout works on mobile

---

## Priority Recommendations

1. **High Priority**: DateSheets.tsx
   - Similar usage pattern to AnswerSheets
   - Straightforward migration
   - High traffic page

2. **Medium Priority**: CentreGuidelines.tsx
   - Matches existing underline style
   - Would benefit from badge support
   - Moderate complexity

3. **Low Priority**: SeatingPlan.tsx
   - Current implementation is appropriate
   - Would require custom variant
   - Consider only if consistency is critical

---

## Questions?

If you have questions about migrating specific pages or need help with implementation, refer to:

- `README.md` - Full API documentation and examples
- `AnswerSheets.tsx` - Real-world implementation example
- `Tabs.tsx` - Component source code
- `TabsTypes.ts` - TypeScript interfaces

---

## Future Enhancements

Potential improvements to consider:

1. **Card Variant**: For SeatingPlan-style navigation
2. **Animated Indicator**: Sliding indicator for active tab
3. **Scroll Container**: Auto-scroll on mobile for many tabs
4. **Tab Overflow**: Show more dropdown for limited space
5. **Custom Render**: Support for fully custom tab content
6. **Router Integration**: Auto-sync with URL parameters

---

*Last Updated: January 2026*
