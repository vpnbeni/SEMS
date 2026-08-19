import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  createCanvasItem,
  type FormatCanvasItem,
  type FormatCanvasItemType,
  type FormatTextStyle,
} from '@/components/format-editor'

export const useFormatCanvas = (
  items: FormatCanvasItem[],
  setItems: (items: FormatCanvasItem[]) => void,
  uploadImage: (file: File) => Promise<{ url: string }>
) => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const selected = items.find((item) => item.id === selectedId) || null
  const nextZ = items.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1

  const addItem = (type: FormatCanvasItemType, extras: Partial<FormatCanvasItem> = {}) => {
    const item = createCanvasItem(type, extras, nextZ)
    setItems([...items, item])
    setSelectedId(item.id)
  }

  const patchItem = (patch: Partial<FormatCanvasItem>) => {
    if (!selectedId) return
    setItems(items.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)))
  }

  const addImage = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const uploaded = await uploadImage(file)
      if (!uploaded.url) throw new Error('Upload failed')
      addItem('image', { imageUrl: uploaded.url, width: 24, height: 16 })
    } catch (error: any) {
      toast.error(String(error?.message || 'Failed to add image.'))
    } finally {
      setUploading(false)
    }
  }

  const removeSelected = () => {
    if (!selectedId) return
    setItems(items.filter((item) => item.id !== selectedId))
    setSelectedId(null)
  }

  const applyStyle = (partial: Partial<FormatTextStyle>) => {
    if (selected?.type === 'text') patchItem(partial)
  }

  return {
    selectedId,
    setSelectedId,
    selected,
    uploading,
    addItem,
    addImage,
    patchItem,
    removeSelected,
    applyStyle,
  }
}
