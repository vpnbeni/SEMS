# Subjects Page - Class Color Theme

## Overview

Added color-coded themes to the Subjects page to visually distinguish between Class 10th and Class 12th subjects, matching the styling used in the Datesheet page.

## Color Scheme

### Class 10th (Green Theme)
- **Background**: Light green (`bg-green-50` / `dark:bg-green-900/20`)
- **Text**: Dark green (`text-green-800` / `dark:text-green-300`)
- **Class Badge**: Bold green (`text-green-700` / `dark:text-green-400`)

### Class 12th (Purple Theme)
- **Background**: Light purple (`bg-purple-50` / `dark:bg-purple-900/20`)
- **Text**: Dark purple (`text-purple-800` / `dark:text-purple-300`)
- **Class Badge**: Bold purple (`text-purple-700` / `dark:text-purple-400`)

## Visual Example

```
┌─────────────────────────────────────────────────────────────────────┐
│ Subjects                                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [Total: 204]  [Class 10th: 83]  [Class 12th: 121]                 │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Code │ Subject Name        │ Class │ Duration │ Answer Sheet│   │
│ ├──────┼────────────────────┼───────┼──────────┼─────────────┤   │
│ │ 041  │ Mathematics Std    │ 10th  │ 3 Hours  │ 32 Pages    │   │
│ │      │ (Green background with dark green text)              │   │
│ ├──────┼────────────────────┼───────┼──────────┼─────────────┤   │
│ │ 042  │ Physics            │ 12th  │ 3 Hours  │ 32 Pages    │   │
│ │      │ (Purple background with dark purple text)            │   │
│ └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Table Row Styling

```typescript
<tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
  subject.class === '10th' 
    ? 'bg-green-50 dark:bg-green-900/20' 
    : subject.class === '12th' 
    ? 'bg-purple-50 dark:bg-purple-900/20' 
    : ''
}`}>
```

### Text Color Styling

```typescript
<div className={`text-sm font-medium ${
  subject.class === '10th'
    ? 'text-green-800 dark:text-green-300'
    : subject.class === '12th'
    ? 'text-purple-800 dark:text-purple-300'
    : 'text-gray-900 dark:text-white'
}`}>
  {subject.name}
</div>
```

### Class Badge Styling

```typescript
<div className={`text-sm font-semibold ${
  subject.class === '10th'
    ? 'text-green-700 dark:text-green-400'
    : subject.class === '12th'
    ? 'text-purple-700 dark:text-purple-400'
    : 'text-gray-900 dark:text-white'
}`}>
  {subject.class}
</div>
```

## Columns Styled

All columns in the table now have class-based color themes:

1. **Sub Code**: Dark green/purple font
2. **Subject Name**: Dark green/purple font (bold)
3. **Class**: Bold green/purple font
4. **Duration**: Green/purple font
5. **Answer Sheet**: Green/purple font

## Statistics Cards

The statistics cards at the top already had the green and purple theme:

- **Class 10th Card**: Green icon and border when selected
- **Class 12th Card**: Purple icon and border when selected

## Dark Mode Support

All colors have dark mode variants:

### Light Mode
- Class 10th: Light green background, dark green text
- Class 12th: Light purple background, dark purple text

### Dark Mode
- Class 10th: Dark green background (20% opacity), light green text
- Class 12th: Dark purple background (20% opacity), light purple text

## Consistency with Datesheet

This styling matches the color scheme used in:
- **Datesheets Page**: Centre datesheet entries
- **Answer Sheets Page**: Used tab entries
- **Candidates Page**: Candidate listings

## Benefits

### 1. Visual Clarity
- Easy to distinguish between Class 10th and 12th subjects at a glance
- Reduces cognitive load when scanning the list

### 2. Consistent Design
- Matches the color scheme used throughout the application
- Creates a cohesive user experience

### 3. Accessibility
- High contrast between text and background
- Works well in both light and dark modes
- Color is supplementary, not the only indicator (class text is still visible)

### 4. Professional Appearance
- Clean, modern design
- Subtle colors that don't overwhelm
- Maintains readability

## Color Palette Reference

### Class 10th (Green)
```css
/* Light Mode */
background: bg-green-50 (#f0fdf4)
text: text-green-800 (#166534)
bold: text-green-700 (#15803d)

/* Dark Mode */
background: bg-green-900/20 (rgba(20, 83, 45, 0.2))
text: text-green-300 (#86efac)
bold: text-green-400 (#4ade80)
```

### Class 12th (Purple)
```css
/* Light Mode */
background: bg-purple-50 (#faf5ff)
text: text-purple-800 (#6b21a8)
bold: text-purple-700 (#7e22ce)

/* Dark Mode */
background: bg-purple-900/20 (rgba(88, 28, 135, 0.2))
text: text-purple-300 (#d8b4fe)
bold: text-purple-400 (#c084fc)
```

## Files Modified

- `client/src/pages/Subjects.tsx`
  - Updated table row className to include class-based background
  - Updated all column text colors to match class theme
  - Applied to: Code, Name, Class, Duration, Answer Sheet columns

## Testing

### Visual Testing Checklist

- [x] Class 10th subjects show green background
- [x] Class 10th subjects show dark green text
- [x] Class 12th subjects show purple background
- [x] Class 12th subjects show dark purple text
- [x] Hover effect still works
- [x] Dark mode colors are appropriate
- [x] Text is readable in both modes
- [x] Statistics cards maintain their colors

## Browser Compatibility

The Tailwind CSS classes used are supported in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Future Enhancements

### Potential Improvements

1. **Filter Highlighting**: Highlight the active filter with stronger colors
2. **Hover Effects**: Enhanced hover effects that maintain class colors
3. **Export**: Include color coding in exported PDFs
4. **Print Styles**: Maintain colors when printing

## Summary

The Subjects page now features a consistent color-coded theme that matches the rest of the application:

✅ **Class 10th**: Green theme (light background, dark green text)
✅ **Class 12th**: Purple theme (light background, dark purple text)
✅ **Dark Mode**: Appropriate color variants
✅ **Consistent**: Matches Datesheet and Answer Sheets pages
✅ **Accessible**: High contrast and readable
✅ **Professional**: Clean, modern appearance

This enhancement improves visual clarity and creates a more cohesive user experience across the application.
