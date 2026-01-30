import { useState } from 'react'
import { Dropdown } from '../components/common/Dropdown'
import type { DropdownOption } from '../components/common/Dropdown'

const DropdownExamples = () => {
  // Example 1: Basic Single Select
  const [basicValue, setBasicValue] = useState<string | number>('')
  
  // Example 2: Multi-Select
  const [multiValue, setMultiValue] = useState<(string | number)[]>([])
  
  // Example 3: Searchable
  const [searchableValue, setSearchableValue] = useState<string | number>('')
  
  // Example 4: With Virtualization (large list)
  const [virtualizedValue, setVirtualizedValue] = useState<string | number>('')
  
  // Example 5: With Error & Required
  const [validatedValue, setValidatedValue] = useState<string | number>('')
  const [hasError, setHasError] = useState(false)
  
  // Example 6: Async Loading
  const [asyncValue, setAsyncValue] = useState<string | number>('')
  const [asyncOptions, setAsyncOptions] = useState<DropdownOption[]>([])
  const [isLoadingAsync, setIsLoadingAsync] = useState(false)
  const [asyncHasMore, setAsyncHasMore] = useState(true)
  const [asyncPage, setAsyncPage] = useState(1)

  // Basic options
  const statusOptions: DropdownOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'archived', label: 'Archived' },
  ]

  // Teacher options for multi-select
  const teacherOptions: DropdownOption[] = [
    { value: 1, label: 'Dr. Smith' },
    { value: 2, label: 'Prof. Johnson' },
    { value: 3, label: 'Dr. Williams' },
    { value: 4, label: 'Prof. Brown' },
    { value: 5, label: 'Dr. Davis' },
    { value: 6, label: 'Prof. Miller' },
    { value: 7, label: 'Dr. Wilson' },
    { value: 8, label: 'Prof. Moore' },
  ]

  // Subject options with groups
  const subjectOptions: DropdownOption[] = [
    { value: 'math', label: 'Mathematics', group: 'Science' },
    { value: 'physics', label: 'Physics', group: 'Science' },
    { value: 'chemistry', label: 'Chemistry', group: 'Science' },
    { value: 'biology', label: 'Biology', group: 'Science' },
    { value: 'history', label: 'History', group: 'Humanities' },
    { value: 'geography', label: 'Geography', group: 'Humanities' },
    { value: 'english', label: 'English', group: 'Languages' },
    { value: 'spanish', label: 'Spanish', group: 'Languages' },
  ]

  // Large list for virtualization (1000+ items)
  const largeOptions: DropdownOption[] = Array.from({ length: 1000 }, (_, i) => ({
    value: i + 1,
    label: `Candidate ${String(i + 1).padStart(4, '0')} - John Doe`,
  }))

  // Simulate async loading
  const handleLoadMore = async () => {
    setIsLoadingAsync(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const newOptions: DropdownOption[] = Array.from({ length: 20 }, (_, i) => {
      const id = (asyncPage - 1) * 20 + i + 1
      return {
        value: id,
        label: `Item ${id} - Loaded Asynchronously`,
      }
    })
    
    setAsyncOptions(prev => [...prev, ...newOptions])
    setAsyncPage(prev => prev + 1)
    
    // Stop after 100 items
    if (asyncOptions.length + newOptions.length >= 100) {
      setAsyncHasMore(false)
    }
    
    setIsLoadingAsync(false)
  }

  // Initialize async options
  useState(() => {
    handleLoadMore()
  })

  const handleValidate = () => {
    if (!validatedValue) {
      setHasError(true)
    } else {
      setHasError(false)
      alert(`Valid! Selected: ${validatedValue}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dropdown Component Examples
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Comprehensive showcase of all dropdown features and variations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Example 1: Basic Single Select */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                1. Basic Single Select
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Status"
                options={statusOptions}
                value={basicValue}
                onChange={setBasicValue}
                placeholder="Select status"
                size="md"
              />
              <div className="mt-4 p-3 bg-secondary-50 dark:bg-secondary-900 rounded">
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  <strong>Selected:</strong> {basicValue || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Example 2: Multi-Select */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                2. Multi-Select with Chips
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Teachers"
                options={teacherOptions}
                value={multiValue}
                onChange={setMultiValue}
                placeholder="Select multiple teachers"
                multiple
                size="md"
              />
              <div className="mt-4 p-3 bg-secondary-50 dark:bg-secondary-900 rounded">
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  <strong>Selected ({multiValue.length}):</strong> {multiValue.join(', ') || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Example 3: Searchable */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                3. Searchable Dropdown
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Subject"
                options={subjectOptions}
                value={searchableValue}
                onChange={setSearchableValue}
                placeholder="Search subjects..."
                searchable
                size="md"
              />
              <div className="mt-4 p-3 bg-secondary-50 dark:bg-secondary-900 rounded">
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  <strong>Selected:</strong> {searchableValue || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Example 4: Virtualized Large List */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                4. Virtualized (1000+ Items)
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Candidate"
                options={largeOptions}
                value={virtualizedValue}
                onChange={setVirtualizedValue}
                placeholder="Search from 1000 candidates..."
                searchable
                virtualized
                size="md"
                maxHeight={400}
              />
              <div className="mt-4 p-3 bg-secondary-50 dark:bg-secondary-900 rounded">
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  <strong>Selected:</strong> {virtualizedValue || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Example 5: With Validation */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                5. Required with Validation
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Required Field"
                options={statusOptions}
                value={validatedValue}
                onChange={(val) => {
                  setValidatedValue(val)
                  setHasError(false)
                }}
                placeholder="This field is required"
                required
                error={hasError ? 'This field is required' : undefined}
                size="md"
              />
              <button
                onClick={handleValidate}
                className="mt-4 btn btn-primary"
              >
                Validate
              </button>
            </div>
          </div>

          {/* Example 6: Async Loading */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                6. Async Loading (Infinite Scroll)
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Async Items"
                options={asyncOptions}
                value={asyncValue}
                onChange={setAsyncValue}
                placeholder="Scroll to load more..."
                searchable
                onLoadMore={handleLoadMore}
                hasMore={asyncHasMore}
                loading={isLoadingAsync && asyncOptions.length === 0}
                size="md"
                maxHeight={300}
              />
              <div className="mt-4 p-3 bg-secondary-50 dark:bg-secondary-900 rounded">
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  <strong>Loaded Items:</strong> {asyncOptions.length}
                  <br />
                  <strong>Selected:</strong> {asyncValue || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Example 7: Different Sizes */}
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                7. Size Variants
              </h2>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Dropdown
                  label="Small"
                  options={statusOptions}
                  placeholder="Small size"
                  size="sm"
                />
                <Dropdown
                  label="Medium (Default)"
                  options={statusOptions}
                  placeholder="Medium size"
                  size="md"
                />
                <Dropdown
                  label="Large"
                  options={statusOptions}
                  placeholder="Large size"
                  size="lg"
                />
              </div>
            </div>
          </div>

          {/* Example 8: Disabled State */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                8. Disabled State
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Disabled Dropdown"
                options={statusOptions}
                value="active"
                placeholder="Cannot interact"
                disabled
                size="md"
              />
            </div>
          </div>

          {/* Example 9: With Portal */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                9. Portal Rendering
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Portal Dropdown"
                options={teacherOptions}
                placeholder="Renders to document.body"
                portal
                size="md"
              />
              <p className="mt-2 text-xs text-secondary-600 dark:text-secondary-400">
                Useful to avoid z-index issues in modals or scrollable containers
              </p>
            </div>
          </div>

          {/* Example 10: Keyboard Navigation */}
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                10. Keyboard Navigation Support
              </h2>
            </div>
            <div className="card-content">
              <Dropdown
                label="Try Keyboard Navigation"
                options={subjectOptions}
                placeholder="Focus and press keys"
                searchable
                size="md"
              />
              <div className="mt-4 p-4 bg-secondary-50 dark:bg-secondary-900 rounded">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Keyboard Shortcuts:
                </h3>
                <ul className="text-sm text-secondary-700 dark:text-secondary-300 space-y-1">
                  <li>• <kbd className="px-2 py-0.5 bg-white dark:bg-secondary-800 border rounded">↓</kbd> / <kbd className="px-2 py-0.5 bg-white dark:bg-secondary-800 border rounded">↑</kbd> - Navigate options</li>
                  <li>• <kbd className="px-2 py-0.5 bg-white dark:bg-secondary-800 border rounded">Enter</kbd> - Select highlighted option</li>
                  <li>• <kbd className="px-2 py-0.5 bg-white dark:bg-secondary-800 border rounded">Esc</kbd> - Close dropdown</li>
                  <li>• <kbd className="px-2 py-0.5 bg-white dark:bg-secondary-800 border rounded">Space</kbd> - Toggle dropdown</li>
                  <li>• <kbd className="px-2 py-0.5 bg-white dark:bg-secondary-800 border rounded">Home</kbd> / <kbd className="px-2 py-0.5 bg-white dark:bg-secondary-800 border rounded">End</kbd> - Jump to first/last</li>
                  <li>• Type to search (when not searchable)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Summary */}
        <div className="mt-8 card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Features Summary
            </h2>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded">
                <h3 className="font-medium text-primary-700 dark:text-primary-400 mb-1">
                  Selection Modes
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Single-select and multi-select with chips
                </p>
              </div>
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded">
                <h3 className="font-medium text-primary-700 dark:text-primary-400 mb-1">
                  Search & Filter
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Built-in search with custom filter function support
                </p>
              </div>
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded">
                <h3 className="font-medium text-primary-700 dark:text-primary-400 mb-1">
                  Virtualization
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Handles 1000+ items efficiently
                </p>
              </div>
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded">
                <h3 className="font-medium text-primary-700 dark:text-primary-400 mb-1">
                  Async Loading
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Infinite scroll with async data fetching
                </p>
              </div>
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded">
                <h3 className="font-medium text-primary-700 dark:text-primary-400 mb-1">
                  Keyboard Navigation
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Full keyboard support with type-ahead
                </p>
              </div>
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded">
                <h3 className="font-medium text-primary-700 dark:text-primary-400 mb-1">
                  Accessibility
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  ARIA labels and screen reader support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DropdownExamples
