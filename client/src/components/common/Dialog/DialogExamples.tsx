import React, { useState } from 'react'
import Dialog from './Dialog'
import { AlertTriangle, Check, Info, Settings, Trash2, User, Save } from 'lucide-react'

/**
 * Example 1: Simple Confirmation Dialog
 */
export const ConfirmationDialogExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = async () => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Item deleted')
    setIsOpen(false)
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-error">
        Delete Item
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        variant="warning"
        size="sm"
        title="Delete Item"
        icon={<AlertTriangle className="w-6 h-6" />}
        animation="scale"
        actions={[
          { label: 'Cancel', onClick: () => setIsOpen(false), variant: 'ghost' },
          { label: 'Delete', onClick: handleDelete, variant: 'error', icon: <Trash2 className="w-4 h-4" /> }
        ]}
      >
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      </Dialog>
    </>
  )
}

/**
 * Example 2: Form Dialog with Validation
 */
export const FormDialogExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setHasChanges(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate async save
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Form saved:', formData)
    setHasChanges(false)
    setIsOpen(false)
  }

  const handleBeforeClose = () => {
    if (hasChanges) {
      return window.confirm('You have unsaved changes. Are you sure you want to close?')
    }
    return true
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        Edit Profile
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="lg"
        title="Edit Profile"
        icon={<User className="w-6 h-6" />}
        animation="slide-up"
        onBeforeClose={handleBeforeClose}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input w-full"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input w-full"
              placeholder="Enter your email"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

/**
 * Example 3: Side Panel (Drawer) Dialog
 */
export const SidePanelExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState('general')

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-outline">
        <Settings className="w-4 h-4 mr-2" />
        Open Settings
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position="right"
        size="md"
        animation="slide-left"
        title="Settings"
        icon={<Settings className="w-6 h-6" />}
      >
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              onClick={() => setSelectedTab('general')}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedTab === 'general'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setSelectedTab('notifications')}
              className={`px-4 py-2 font-medium transition-colors ${
                selectedTab === 'notifications'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Notifications
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {selectedTab === 'general' && (
              <>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Enable dark mode</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Show tooltips</span>
                  </label>
                </div>
              </>
            )}
            {selectedTab === 'notifications' && (
              <>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Email notifications</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Push notifications</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
      </Dialog>
    </>
  )
}

/**
 * Example 4: Compound Components Pattern
 */
export const CompoundComponentsExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        Open Advanced Dialog
      </button>

      <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
        <Dialog.Header icon={<Check className="w-6 h-6" />} showClose>
          Custom Header with Compound Components
        </Dialog.Header>
        
        <Dialog.Body className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            This dialog uses the compound components pattern for maximum flexibility.
          </p>
          <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">
              Key Features:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-primary-800 dark:text-primary-200">
              <li>Fully customizable layout</li>
              <li>Independent component control</li>
              <li>Flexible styling options</li>
            </ul>
          </div>
        </Dialog.Body>
        
        <Dialog.Footer align="space-between">
          <button className="btn btn-ghost">Learn More</button>
          <div className="flex gap-2">
            <button onClick={() => setIsOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button className="btn btn-primary">
              Confirm
            </button>
          </div>
        </Dialog.Footer>
      </Dialog>
    </>
  )
}

/**
 * Example 5: Loading State Dialog
 */
export const LoadingDialogExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setLoading(false)
    setIsOpen(false)
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        Show Loading Dialog
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="md"
        title="Processing Request"
        loading={loading}
        actions={[
          { label: 'Cancel', onClick: () => setIsOpen(false), variant: 'ghost', disabled: loading },
          { label: 'Submit', onClick: handleSubmit, variant: 'primary', loading }
        ]}
      >
        <p>Click submit to see the loading state in action.</p>
      </Dialog>
    </>
  )
}

/**
 * Example 6: Success/Error/Warning/Info Variants
 */
export const VariantsExample: React.FC = () => {
  const [openDialog, setOpenDialog] = useState<string | null>(null)

  const dialogs = [
    { variant: 'success' as const, icon: <Check className="w-6 h-6" />, title: 'Success', message: 'Operation completed successfully!' },
    { variant: 'error' as const, icon: <AlertTriangle className="w-6 h-6" />, title: 'Error', message: 'An error occurred. Please try again.' },
    { variant: 'warning' as const, icon: <AlertTriangle className="w-6 h-6" />, title: 'Warning', message: 'Please review your changes before proceeding.' },
    { variant: 'info' as const, icon: <Info className="w-6 h-6" />, title: 'Information', message: 'Here is some helpful information for you.' },
  ]

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {dialogs.map(({ variant }) => (
          <button
            key={variant}
            onClick={() => setOpenDialog(variant)}
            className={`btn ${
              variant === 'success' ? 'btn-success' :
              variant === 'error' ? 'btn-error' :
              variant === 'warning' ? 'btn-warning' :
              'btn-primary'
            }`}
          >
            {variant.charAt(0).toUpperCase() + variant.slice(1)} Dialog
          </button>
        ))}
      </div>

      {dialogs.map(({ variant, icon, title, message }) => (
        <Dialog
          key={variant}
          isOpen={openDialog === variant}
          onClose={() => setOpenDialog(null)}
          variant={variant}
          size="sm"
          title={title}
          icon={icon}
          animation="scale"
          actions={[
            { label: 'Got it', onClick: () => setOpenDialog(null), variant: 'primary' }
          ]}
        >
          <p>{message}</p>
        </Dialog>
      ))}
    </>
  )
}

/**
 * Example 7: Different Animations
 */
export const AnimationsExample: React.FC = () => {
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null)

  const animations = [
    { type: 'scale' as const, label: 'Scale' },
    { type: 'slide-up' as const, label: 'Slide Up' },
    { type: 'slide-down' as const, label: 'Slide Down' },
    { type: 'slide-left' as const, label: 'Slide Left' },
    { type: 'slide-right' as const, label: 'Slide Right' },
    { type: 'fade' as const, label: 'Fade' },
  ]

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {animations.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setActiveAnimation(type)}
            className="btn btn-outline"
          >
            {label}
          </button>
        ))}
      </div>

      {animations.map(({ type, label }) => (
        <Dialog
          key={type}
          isOpen={activeAnimation === type}
          onClose={() => setActiveAnimation(null)}
          animation={type}
          size="md"
          title={`${label} Animation`}
          description="Watch how the dialog enters and exits with this animation style."
        >
          <p>This dialog uses the <strong>{label}</strong> animation.</p>
        </Dialog>
      ))}
    </>
  )
}

/**
 * All Examples Component for Testing
 */
export const AllDialogExamples: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Dialog Examples</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Explore various Dialog component patterns and use cases.
        </p>
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">1. Confirmation Dialog</h3>
        <ConfirmationDialogExample />
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">2. Form Dialog</h3>
        <FormDialogExample />
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">3. Side Panel (Drawer)</h3>
        <SidePanelExample />
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">4. Compound Components</h3>
        <CompoundComponentsExample />
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">5. Loading State</h3>
        <LoadingDialogExample />
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">6. Variants</h3>
        <VariantsExample />
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">7. Animations</h3>
        <AnimationsExample />
      </section>
    </div>
  )
}
