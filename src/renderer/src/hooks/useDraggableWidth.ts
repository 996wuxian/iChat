import { ref } from 'vue'

interface DraggableOptions {
  minWidth?: number
  maxWidth?: number
  initialWidth?: number
}

export const useDraggableWidth = (options: DraggableOptions = {}) => {
  const { minWidth = 200, maxWidth = 300, initialWidth = 300 } = options

  const width = ref(initialWidth)
  const isDragging = ref(false)

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    isDragging.value = true
    const startX = e.clientX
    const startWidth = width.value

    const handleDrag = (e: MouseEvent) => {
      if (!isDragging.value) return
      const deltaX = e.clientX - startX
      const newWidth = startWidth + deltaX
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        width.value = newWidth
      }
    }

    const handleDragEnd = () => {
      isDragging.value = false
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    document.addEventListener('mousemove', handleDrag)
    document.addEventListener('mouseup', handleDragEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return {
    width,
    isDragging,
    handleMouseDown
  }
}
