# Dialog Component - Visual Guide

A visual reference for the Dialog component's features and appearance.

## Animation Styles

### Scale (Default)
```
┌─────────────────┐
│    Dialog       │ ← Zooms in with spring physics
│                 │
└─────────────────┘
```
Smooth zoom-in effect with bounce. Perfect for confirmations and alerts.

### Slide Up
```
                    
                    ↑
┌─────────────────┐ │
│    Dialog       │ │ Slides from bottom
│                 │
└─────────────────┘
```
Great for mobile-style action sheets and forms.

### Slide Down
```
┌─────────────────┐
│    Dialog       │ │
│                 │ ↓ Slides from top
└─────────────────┘
```
Ideal for notifications and banners.

### Slide Left/Right
```
┌──────┐               
│      │ ← Slides from edge
│      │
│      │
└──────┘
Full-height drawer
```
Perfect for settings panels, filters, and side navigation.

### Fade
Simple opacity transition. Subtle and elegant.

---

## Size Options

```
┌────┐          XS - Tiny (320px)
┌──────────┐    SM - Small (480px)
┌────────────────┐   MD - Medium (640px) [default]
┌────────────────────────┐   LG - Large (800px)
┌───────────────────────────────────┐   XL - Extra Large (1024px)
┌─────────────────────────────────────────────────┐   FULL - 90% viewport
```

---

## Positions

### Center (Default)
```
           ┌──────────┐
    Screen │  Dialog  │
           └──────────┘
```

### Top
```
           ┌──────────┐
    Screen │  Dialog  │
           │          │
           │          │
```

### Bottom
```
           │          │
    Screen │          │
           │  Dialog  │
           └──────────┘
```

### Left/Right (Drawers)
```
┌────┐              ┌────┐
│    │ Screen       │    │
│    │              │    │
└────┘              └────┘
  Left               Right
```

---

## Variants with Colors

### Default
```
┌─────────────────────────┐
│ 📄  Title               │
├─────────────────────────┤ Blue accent (primary)
│ Content here            │
└─────────────────────────┘
```

### Success
```
┌─────────────────────────┐
│ ✓  Success!             │
├─────────────────────────┤ Green accent
│ Operation completed     │
└─────────────────────────┘
```

### Warning
```
┌─────────────────────────┐
│ ⚠  Warning              │
├─────────────────────────┤ Yellow/Orange accent
│ Please review           │
└─────────────────────────┘
```

### Error
```
┌─────────────────────────┐
│ ✕  Error                │
├─────────────────────────┤ Red accent
│ Something went wrong    │
└─────────────────────────┘
```

### Info
```
┌─────────────────────────┐
│ ℹ  Information          │
├─────────────────────────┤ Blue accent
│ Helpful tip here        │
└─────────────────────────┘
```

---

## Component Structure

### Simple Usage
```tsx
<Dialog
  isOpen={isOpen}
  onClose={onClose}
  title="Dialog Title"
>
  Content goes here
</Dialog>
```

Renders as:
```
┌─────────────────────────┐
│ Dialog Title         [X]│ ← Header (auto-generated)
├─────────────────────────┤
│ Content goes here       │ ← Body (auto-generated)
└─────────────────────────┘
```

### With Actions
```tsx
<Dialog
  title="Confirm"
  actions={[
    { label: 'Cancel', variant: 'ghost' },
    { label: 'Confirm', variant: 'primary' }
  ]}
>
  Content
</Dialog>
```

Renders as:
```
┌─────────────────────────┐
│ Confirm              [X]│
├─────────────────────────┤
│ Content                 │
├─────────────────────────┤
│           [Cancel] [OK] │ ← Footer (auto-generated)
└─────────────────────────┘
```

### Compound Components
```tsx
<Dialog isOpen={isOpen} onClose={onClose}>
  <Dialog.Header icon={<Icon />}>
    Custom Header
  </Dialog.Header>
  <Dialog.Body>
    Custom Body
  </Dialog.Body>
  <Dialog.Footer>
    <button>Custom</button>
  </Dialog.Footer>
</Dialog>
```

Full control over layout and styling.

---

## Visual Features

### Backdrop Blur
```
████████████████████████████
██  Blurred Background  ████
████████████████████████████
        ┌──────────┐
        │  Dialog  │ ← Sharp, in focus
        └──────────┘
████████████████████████████
██  Blurred Background  ████
████████████████████████████
```

Options: `none`, `sm`, `md`, `lg`

### Close Button Positions

**Inside (default)**
```
┌─────────────────────────┐
│ Title                [X]│ ← Inside dialog
├─────────────────────────┤
│ Content                 │
└─────────────────────────┘
```

**Outside**
```
                       [X]  ← Outside dialog
┌─────────────────────────┐
│ Title                   │
├─────────────────────────┤
│ Content                 │
└─────────────────────────┘
```

### Loading State
```
┌─────────────────────────┐
│ Processing...        [X]│
├─────────────────────────┤
│                         │
│       ⟲ Loading...      │ ← Overlay
│                         │
└─────────────────────────┘
```

### Draggable Handle
```
┌─────────────────────────┐
│ ≡≡≡≡≡                   │ ← Drag handle
├─────────────────────────┤
│ Title                [X]│
├─────────────────────────┤
│ Content                 │
└─────────────────────────┘
```

---

## Dark Mode

All components fully support dark mode:

**Light Mode**
```
┌─────────────────────────┐
│ Title                [X]│ ← Light background
├─────────────────────────┤   Dark text
│ Content                 │
└─────────────────────────┘
```

**Dark Mode**
```
█████████████████████████
█ Title                [X]█ ← Dark background
█████████████████████████   Light text
█ Content                 █
█████████████████████████
```

Automatically switches based on user preference.

---

## Accessibility Features

```
┌─────────────────────────┐
│ Title [aria-labelledby] │ ← Screen reader announces
├─────────────────────────┤
│ [Focus Trap Active]     │ ← Tab cycles here only
│                         │
│ [Button] [Button]       │ ← Keyboard accessible
└─────────────────────────┘

Keyboard:
• ESC - Close dialog
• TAB - Next element
• SHIFT+TAB - Previous element
```

---

## Nested Dialogs

```
┌─────────────────────────┐
│ First Dialog         [X]│ ← z-index: 9000
├─────────────────────────┤
│ Content                 │
│   ┌─────────────────┐   │
│   │ Nested       [X]│   │ ← z-index: 9010
│   ├─────────────────┤   │
│   │ On top!         │   │
│   └─────────────────┘   │
└─────────────────────────┘
```

Automatically manages stacking.

---

## Quick Reference

| Feature | Prop | Values |
|---------|------|--------|
| **Size** | `size` | xs, sm, md, lg, xl, full |
| **Animation** | `animation` | scale, slide-up, slide-down, slide-left, slide-right, fade |
| **Variant** | `variant` | default, success, warning, error, info |
| **Position** | `position` | center, top, bottom, left, right |
| **Blur** | `backdropBlur` | none, sm, md, lg |
| **Close** | `closeOnBackdrop` | true/false |
| **Escape** | `closeOnEscape` | true/false |

---

## Usage Examples by Scenario

### ✓ Confirmation
- Size: `sm`
- Variant: `warning`
- Animation: `scale`
- Actions: Cancel + Confirm

### 📝 Form
- Size: `lg`
- Animation: `slide-up`
- Actions: Custom footer

### ⚙️ Settings Panel
- Position: `right`
- Animation: `slide-left`
- Size: `md`

### ✓ Success Message
- Size: `sm`
- Variant: `success`
- Animation: `scale`
- Auto-close: Optional timer

### ⚠️ Error Alert
- Size: `sm`
- Variant: `error`
- Animation: `scale`
- Actions: OK button

---

## Live Preview

To see all these features in action, navigate to:

**Route**: `/dialog-showcase`

Or run the app and visit the Dialog Showcase page!

---

**Happy Dialoging!** 🎉
