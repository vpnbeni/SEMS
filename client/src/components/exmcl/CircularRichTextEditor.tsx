import React, { useEffect, useRef } from 'react'
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

type CircularRichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '36px']

const runCommand = (command: string, value?: string) => {
  document.execCommand(command, false, value)
}

const applyFontSize = (size: string) => {
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand('fontSize', false, '7')
  document.querySelectorAll('font[size="7"]').forEach((node) => {
    const span = document.createElement('span')
    span.style.fontSize = size
    span.innerHTML = node.innerHTML
    node.replaceWith(span)
  })
}

const toolbarButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'

const CircularRichTextEditor: React.FC<CircularRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write the circular details...',
}) => {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.innerHTML !== value) {
      editor.innerHTML = value || ''
    }
  }, [value])

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML || '')
  }

  const handleToolbar = (command: string, arg?: string) => {
    editorRef.current?.focus()
    if (command === 'fontSize' && arg) {
      applyFontSize(arg)
    } else {
      runCommand(command, arg)
    }
    handleInput()
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900/60">
        <select
          title="Style"
          aria-label="Paragraph style"
          defaultValue=""
          onChange={(event) => {
            const next = event.target.value
            if (!next) return
            handleToolbar('formatBlock', `<${next}>`)
            event.target.value = ''
          }}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">Style</option>
          <option value="p">Normal</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>
        <select
          title="Font size"
          aria-label="Font size"
          defaultValue=""
          onChange={(event) => {
            const next = event.target.value
            if (!next) return
            handleToolbar('fontSize', next)
            event.target.value = ''
          }}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size.replace('px', '')}
            </option>
          ))}
        </select>
        <button type="button" title="Bold" aria-label="Bold" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => handleToolbar('bold')}>
          <Bold size={14} />
        </button>
        <button type="button" title="Italic" aria-label="Italic" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => handleToolbar('italic')}>
          <Italic size={14} />
        </button>
        <button type="button" title="Underline" aria-label="Underline" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => handleToolbar('underline')}>
          <Underline size={14} />
        </button>
        <button type="button" title="Bulleted list" aria-label="Bulleted list" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => handleToolbar('insertUnorderedList')}>
          <List size={14} />
        </button>
        <button type="button" title="Numbered list" aria-label="Numbered list" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => handleToolbar('insertOrderedList')}>
          <ListOrdered size={14} />
        </button>
        <button type="button" title="Align left" aria-label="Align left" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => handleToolbar('justifyLeft')}>
          <AlignLeft size={14} />
        </button>
        <button type="button" title="Align center" aria-label="Align center" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => handleToolbar('justifyCenter')}>
          <AlignCenter size={14} />
        </button>
        <button type="button" title="Align right" aria-label="Align right" className={toolbarButtonClass} onMouseDown={(event) => event.preventDefault()} onClick={() => handleToolbar('justifyRight')}>
          <AlignRight size={14} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Circular content"
        data-placeholder={placeholder}
        onInput={handleInput}
        className="min-h-[220px] bg-white px-3 py-2 text-sm text-gray-900 outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] dark:bg-gray-800 dark:text-white dark:empty:before:text-gray-500 prose prose-sm max-w-none dark:prose-invert"
      />
    </div>
  )
}

export default CircularRichTextEditor
