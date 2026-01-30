# Dropdown Component

A professional, fully-featured dropdown/select component with support for search, virtualization, keyboard navigation, async loading, and more.

## Features

- ✅ Single-select and multi-select modes
- ✅ Searchable with debounced input
- ✅ Virtualization for large lists (1000+ items)
- ✅ Async data loading with infinite scroll
- ✅ Full keyboard navigation (↑↓, Enter, Esc, Home/End)
- ✅ Type-ahead search
- ✅ Multiple size variants (sm, md, lg)
- ✅ Error states and validation
- ✅ Dark mode support
- ✅ Portal rendering option
- ✅ Accessible (ARIA labels, screen reader support)
- ✅ Custom option rendering
- ✅ Disabled state
- ✅ Loading states
- ✅ Clear button
- ✅ Controlled and uncontrolled modes

## Installation

The component is already set up in your project. Dependencies:
- `@tanstack/react-virtual` - For virtualization (already installed)
- `lucide-react` - For icons (already available)

## Basic Usage

```tsx
import { Dropdown } from '@/components/common/Dropdown'

const MyComponent = () => {
  const [value, setValue] = useState('')

  return (
    <Dropdown
      options={[
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]}
      value={value}
      onChange={setValue}
      placeholder="Select status"
    />
  )
}
```

## Props

### Data Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `DropdownOption[]` | **required** | Array of options to display |
| `value` | `string \| number \| (string \| number)[]` | - | Controlled value |
| `defaultValue` | `string \| number \| (string \| number)[]` | - | Uncontrolled default value |
| `onChange` | `(value) => void` | - | Callback when value changes |

### Selection Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `multiple` | `boolean` | `false` | Enable multi-select mode |

### Search Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `searchable` | `boolean` | `false` | Enable search input |
| `onSearch` | `(query: string) => void` | - | Callback for search (async) |
| `filterFn` | `(option, query) => boolean` | - | Custom filter function |

### Async Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onLoadMore` | `() => Promise<void>` | - | Callback for loading more data |
| `hasMore` | `boolean` | `false` | Whether more data is available |

### UI Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size variant |
| `placeholder` | `string` | `'Select...'` | Placeholder text |
| `label` | `string` | - | Label text |
| `error` | `string` | - | Error message |
| `required` | `boolean` | `false` | Show required indicator |
| `disabled` | `boolean` | `false` | Disable interaction |
| `loading` | `boolean` | `false` | Show loading state |

### Advanced Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `clearable` | `boolean` | `true` | Show clear button (single-select) |
| `maxHeight` | `number` | `300` | Max height of dropdown list (px) |
| `position` | `'auto' \| 'top' \| 'bottom'` | `'auto'` | Dropdown position |
| `portal` | `boolean` | `false` | Render to document.body |
| `virtualized` | `boolean` | `false` | Enable virtualization |
| `renderOption` | `(option) => ReactNode` | - | Custom option renderer |
| `emptyMessage` | `string` | `'No options found'` | Empty state message |

### Styling Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Container class |
| `dropdownClassName` | `string` | - | Dropdown panel class |
| `id` | `string` | - | HTML id attribute |
| `name` | `string` | - | Form input name |

## Examples

### Multi-Select

```tsx
<Dropdown
  options={teachers}
  value={selectedTeachers}
  onChange={setSelectedTeachers}
  multiple
  searchable
  placeholder="Select teachers"
/>
```

### Virtualized Large List

```tsx
<Dropdown
  options={largeList} // 1000+ items
  value={value}
  onChange={setValue}
  searchable
  virtualized
  maxHeight={400}
/>
```

### Async Loading

```tsx
const [options, setOptions] = useState([])
const [hasMore, setHasMore] = useState(true)

const loadMore = async () => {
  const newData = await fetchMoreData()
  setOptions(prev => [...prev, ...newData])
  if (newData.length === 0) setHasMore(false)
}

<Dropdown
  options={options}
  value={value}
  onChange={setValue}
  onLoadMore={loadMore}
  hasMore={hasMore}
  searchable
/>
```

### With Validation

```tsx
<Dropdown
  label="Subject"
  options={subjects}
  value={subject}
  onChange={setSubject}
  required
  error={errors.subject}
  disabled={isSubmitting}
/>
```

### Custom Option Rendering

```tsx
<Dropdown
  options={users}
  renderOption={(option) => (
    <div className="flex items-center gap-2">
      <img src={option.avatar} className="w-6 h-6 rounded-full" />
      <span>{option.label}</span>
    </div>
  )}
/>
```

### Portal Rendering

Use when dropdown is inside a modal or container with overflow issues:

```tsx
<Dropdown
  options={options}
  portal
  position="auto"
/>
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` / `↑` | Navigate options |
| `Enter` | Select highlighted option |
| `Space` | Toggle dropdown |
| `Esc` | Close dropdown |
| `Home` / `End` | Jump to first/last option |
| `Tab` | Close and move focus |
| Type characters | Type-ahead search (when not searchable) |

## Type Definitions

```typescript
interface DropdownOption {
  value: string | number
  label: string
  disabled?: boolean
  group?: string
}

type DropdownValue = string | number | (string | number)[]
```

## Demo Page

Visit `/dropdown-examples` in your app to see all features in action with live examples.

## Accessibility

The component follows WAI-ARIA best practices:
- Proper ARIA roles and labels
- Screen reader announcements
- Keyboard-only navigation
- Focus management
- High contrast support

## Styling

The component uses your existing design system:
- Tailwind CSS classes
- Dark mode support with `dark:` variants
- Consistent with `.input`, `.btn`, and `.card` classes
- Uses your custom color palette (primary, secondary, error)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Performance

- Virtualization keeps large lists performant
- Debounced search reduces unnecessary renders
- Memoized filtered options
- Efficient keyboard navigation
- Only renders visible items

## Tips

1. **Large Lists**: Always use `virtualized` prop for 100+ items
2. **Async Search**: Use `onSearch` with debouncing for API calls
3. **Portal**: Use `portal` prop in modals to avoid z-index issues
4. **Custom Filtering**: Provide `filterFn` for complex search logic
5. **Controlled vs Uncontrolled**: Use `value` for controlled, `defaultValue` for uncontrolled
