# Dialog Component - Quick Start Guide

Get started with the Dialog component in 5 minutes!

## 1. Basic Import

```tsx
import { Dialog } from '@/components/common/Dialog'
```

## 2. Simple Dialog

```tsx
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Dialog
      </button>
      
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Hello World"
      >
        <p>This is my first dialog!</p>
      </Dialog>
    </>
  )
}
```

## 3. With Actions

```tsx
<Dialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Delete"
  variant="warning"
  actions={[
    { 
      label: 'Cancel', 
      onClick: () => setIsOpen(false), 
      variant: 'ghost' 
    },
    { 
      label: 'Delete', 
      onClick: handleDelete, 
      variant: 'error' 
    }
  ]}
>
  <p>Are you sure?</p>
</Dialog>
```

## 4. Common Patterns

### Success Message

```tsx
<Dialog
  isOpen={showSuccess}
  onClose={() => setShowSuccess(false)}
  variant="success"
  size="sm"
  title="Success!"
>
  Your changes have been saved.
</Dialog>
```

### Form Dialog

```tsx
<Dialog
  isOpen={isOpen}
  onClose={onClose}
  size="lg"
  title="Edit Profile"
>
  <form onSubmit={handleSubmit}>
    <div className="space-y-4">
      <input className="input w-full" placeholder="Name" />
      <input className="input w-full" placeholder="Email" />
      <button type="submit" className="btn btn-primary">
        Save
      </button>
    </div>
  </form>
</Dialog>
```

### Side Panel

```tsx
<Dialog
  isOpen={isOpen}
  onClose={onClose}
  position="right"
  animation="slide-left"
  title="Settings"
>
  {/* Settings content */}
</Dialog>
```

## 5. Key Props

| Prop | Purpose | Example |
|------|---------|---------|
| `variant` | Color theme | `"success"`, `"warning"`, `"error"` |
| `size` | Width | `"sm"`, `"md"`, `"lg"`, `"xl"` |
| `animation` | Entrance style | `"scale"`, `"slide-up"`, `"fade"` |
| `position` | Location | `"center"`, `"top"`, `"right"` |
| `actions` | Footer buttons | Array of action objects |

## 6. Advanced: Compound Components

```tsx
<Dialog isOpen={isOpen} onClose={onClose}>
  <Dialog.Header icon={<CheckIcon />}>
    Custom Layout
  </Dialog.Header>
  
  <Dialog.Body>
    <p>Full control over structure</p>
  </Dialog.Body>
  
  <Dialog.Footer>
    <button className="btn btn-primary">OK</button>
  </Dialog.Footer>
</Dialog>
```

## Next Steps

- See [README.md](./README.md) for complete documentation
- Check [DialogExamples.tsx](./DialogExamples.tsx) for more examples
- Visit `/dialog-showcase` route to see live examples

---

**That's it!** You're ready to use the Dialog component. 🎉
