
import { useState, useEffect, useCallback, useRef } from 'react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import { Edit3, Split, Eye } from 'lucide-react'
import VoiceRecorder from './VoiceRecorder'

const MAX_URL_LENGTH = 2048 // Safe URL length limit
const SAVE_DELAY = 1000 // 1 second delay after typing stops

function EditorApp() {
  const [usagePercentage, setUsagePercentage] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isLimitReached, setIsLimitReached] = useState(false)
  const [markdownValue, setMarkdownValue] = useState('')
  const [previewMode, setPreviewMode] = useState<'edit' | 'live' | 'view'>('edit')
  
  // Refs for debouncing and tracking
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasUnsavedChangesRef = useRef(false)
  const lastSavedContentRef = useRef('')
  const currentContentRef = useRef('')

  // Theme detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setTheme(mediaQuery.matches ? 'dark' : 'light')
    
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Keyboard shortcut handler for Ctrl+E/Cmd+E to toggle preview mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        setPreviewMode(prev => {
          switch (prev) {
            case 'edit':
              return 'live'
            case 'live':
              return 'view'
            case 'view':
              return 'edit'
            default:
              return 'edit'
          }
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Unicode-safe base64 encoding with compression for URL
  const encodeContent = useCallback(async (text: string): Promise<string> => {
    if (!text) return ''
    try {
      // First encode to UTF-8 bytes
      const utf8Bytes = new TextEncoder().encode(text)
      
      // Compress using gzip
      const compressionStream = new CompressionStream('gzip')
      const compressedStream = new Response(utf8Bytes).body?.pipeThrough(compressionStream)
      const compressedBytes = new Uint8Array(await new Response(compressedStream).arrayBuffer())
      
      // Convert to base64
      const binaryString = Array.from(compressedBytes, byte => String.fromCharCode(byte)).join('')
      return btoa(binaryString)
    } catch {
      return '' // Return empty if encoding fails
    }
  }, [])

  // Unicode-safe base64 decoding with decompression from URL
  const decodeContent = useCallback(async (encoded: string): Promise<string> => {
    if (!encoded) return ''
    try {
      // First decode from base64
      const binaryString = atob(encoded)
      const compressedBytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        compressedBytes[i] = binaryString.charCodeAt(i)
      }
      
      // Decompress using gzip
      const decompressionStream = new DecompressionStream('gzip')
      const decompressedStream = new Response(compressedBytes).body?.pipeThrough(decompressionStream)
      const decompressedBytes = new Uint8Array(await new Response(decompressedStream).arrayBuffer())
      
      // Decode from UTF-8
      return new TextDecoder().decode(decompressedBytes)
    } catch {
      return '' // Return empty if decoding fails
    }
  }, [])

  // Save content to URL (debounced)
  const saveToUrl = useCallback(async (content: string) => {
    const encoded = await encodeContent(content)
    const urlLength = encoded.length + 1 // +1 for the # character
    const remaining = MAX_URL_LENGTH - urlLength
    const percentage = Math.round((urlLength / MAX_URL_LENGTH) * 100)
    
    setUsagePercentage(percentage)
    setIsLimitReached(remaining < 0)
    
    if (remaining >= 0) {
      // Update URL hash only if it's different
      if (window.location.hash.slice(1) !== encoded) {
        window.history.replaceState(null, '', `#${encoded}`)
      }
      lastSavedContentRef.current = content
      hasUnsavedChangesRef.current = false
    } else {
      // If over limit, mark as reached but don't save
      setIsLimitReached(true)
    }
  }, [encodeContent])

  // Debounced save function
  const debouncedSave = useCallback((content: string) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    console.log('Setting up debounced save for 3 seconds...')
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      console.log('Debounced save triggered, hasUnsavedChanges:', hasUnsavedChangesRef.current)
      if (hasUnsavedChangesRef.current) {
        saveToUrl(content)
      }
    }, SAVE_DELAY)
  }, [saveToUrl])

  // Immediate save function (for blur/mouse events)
  const saveImmediately = useCallback((content?: string) => {
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    
    // Use current content if not provided
    const contentToSave = content ?? currentContentRef.current
    
    if (hasUnsavedChangesRef.current && contentToSave) {
      console.log('Saving immediately:', contentToSave.slice(0, 50) + '...')
      saveToUrl(contentToSave)
    }
  }, [saveToUrl])

  // Load content from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      decodeContent(hash).then(async (decodedContent) => {
        if (decodedContent) {
          setMarkdownValue(decodedContent)
          currentContentRef.current = decodedContent
          lastSavedContentRef.current = decodedContent
          
          // Calculate and update usage percentage immediately after loading
          const encoded = await encodeContent(decodedContent)
          const urlLength = encoded.length + 1
          const percentage = Math.round((urlLength / MAX_URL_LENGTH) * 100)
          setUsagePercentage(percentage)
          setIsLimitReached(urlLength > MAX_URL_LENGTH)
        }
      })
    }
  }, [decodeContent, encodeContent])

  // Add event listeners for immediate saving on blur and mouse movement
  useEffect(() => {
    let hasMouseMoved = false
    
    const handleBlur = () => {
      console.log('Blur event triggered, hasUnsavedChanges:', hasUnsavedChangesRef.current)
      if (hasUnsavedChangesRef.current) {
        saveImmediately()
      }
    }
    
    const handleMouseMove = () => {
      if (!hasMouseMoved) {
        hasMouseMoved = true
        console.log('Mouse moved, hasUnsavedChanges:', hasUnsavedChangesRef.current)
        if (hasUnsavedChangesRef.current) {
          saveImmediately()
        }
      }
    }
    
    const handleFocus = () => {
      hasMouseMoved = false
    }
    
    // Add blur listener to the textarea specifically
    const textarea = document.querySelector('.w-md-editor-text')
    if (textarea) {
      textarea.addEventListener('blur', handleBlur)
    }
    
    // Add mouse move listener to detect user interaction elsewhere
    document.addEventListener('mousemove', handleMouseMove)
    
    // Add focus listener to reset mouse movement tracking
    document.addEventListener('focus', handleFocus, true)
    
    return () => {
      if (textarea) {
        textarea.removeEventListener('blur', handleBlur)
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('focus', handleFocus, true)
    }
  }, [saveImmediately]) // Only depend on saveImmediately, not markdownValue

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Handle content changes with immediate UI update and debounced saving
  const handleContentChange = useCallback(async (value?: string) => {
    const content = value || ''
    
    // Update UI immediately for responsive typing
    setMarkdownValue(content)
    
    // Update current content ref
    currentContentRef.current = content
    
    // Track that we have unsaved changes
    if (content !== lastSavedContentRef.current) {
      hasUnsavedChangesRef.current = true
      console.log('Content changed, setting unsaved flag. New content length:', content.length)
      
      // Update usage percentage immediately for feedback
      const encoded = await encodeContent(content)
      const urlLength = encoded.length + 1
      const percentage = Math.round((urlLength / MAX_URL_LENGTH) * 100)
      setUsagePercentage(percentage)
      setIsLimitReached(urlLength > MAX_URL_LENGTH)
      
      // Debounce the actual saving
      debouncedSave(content)
    }
  }, [encodeContent, debouncedSave])

  // Map our internal mode to MDEditor's expected preview type
  const getMDEditorPreviewMode = (mode: 'edit' | 'live' | 'view'): 'edit' | 'live' | 'preview' => {
    if (mode === 'view') return 'preview'
    return mode
  }

  // Get icon for current mode
  const getModeIcon = (mode: 'edit' | 'live' | 'view') => {
    switch (mode) {
      case 'edit':
        return <Edit3 size={14} />
      case 'live':
        return <Split size={14} />
      case 'view':
        return <Eye size={14} />
      default:
        return <Edit3 size={14} />
    }
  }
  const handleTranscription = useCallback((text: string) => {
    // Validate input
    if (!text || typeof text !== 'string') {
      console.warn('Invalid transcription text received:', text)
      return
    }

    // Helper function to determine if we need a space before the text
    const needsSpace = (beforeText: string, afterText: string): boolean => {
      if (!beforeText) return false
      if (!afterText) {
        // At the end - check if last character is whitespace
        return !/\s$/.test(beforeText)
      }
      // In the middle - check if we need space on both sides
      return !/\s$/.test(beforeText) && !/^\s/.test(afterText)
    }

    // Helper function to update via handleContentChange to ensure debounced save
    const updateWithContentChange = (newValue: string) => {
      console.log('Updating transcribed text via handleContentChange:', newValue.slice(-50))
      handleContentChange(newValue)
    }

    // Try to insert text at cursor position by simulating typing
    // This will trigger the onChange handler with the new content
    const activeElement = document.activeElement
    const textarea = document.querySelector('.w-md-editor-text') as HTMLTextAreaElement
    
    if (textarea && textarea instanceof HTMLTextAreaElement && (activeElement === textarea || activeElement?.closest('.w-md-editor'))) {
      try {
        // We have the textarea and focus is within the editor
        const start = textarea.selectionStart || 0
        const end = textarea.selectionEnd || 0
        const currentValue = textarea.value || ''
        
        // Get text before and after cursor
        const beforeCursor = currentValue.slice(0, start)
        const afterCursor = currentValue.slice(end)
        
        // Determine if we need to add a space
        const spacePrefix = needsSpace(beforeCursor, afterCursor) ? ' ' : ''
        const textToInsert = spacePrefix + text
        
        // Insert text at cursor position
        const newValue = beforeCursor + textToInsert + afterCursor
        
        // Update the textarea value and trigger change
        textarea.value = newValue
        
        // Set cursor position after the inserted text
        const newCursorPos = start + textToInsert.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        
        // Focus the textarea to ensure it's active
        textarea.focus()
        
        // Trigger input event to update React state
        const event = new Event('input', { bubbles: true })
        textarea.dispatchEvent(event)
        
        // Ensure the change is processed through our handler for debounced save
        setTimeout(() => updateWithContentChange(newValue), 10)
      } catch (error) {
        console.warn('Error setting cursor position:', error)
        // Fallback: update through handleContentChange
        const currentValue = markdownValue || ''
        const spacePrefix = currentValue && !/\s$/.test(currentValue) ? ' ' : ''
        updateWithContentChange(currentValue + spacePrefix + text)
      }
    } else if (textarea && textarea instanceof HTMLTextAreaElement) {
      try {
        // Fallback: insert at the end of current content and focus
        const currentValue = textarea.value || ''
        const spacePrefix = currentValue && !/\s$/.test(currentValue) ? ' ' : ''
        const newValue = currentValue + spacePrefix + text
        
        textarea.value = newValue
        textarea.setSelectionRange(newValue.length, newValue.length)
        textarea.focus()
        
        // Trigger input event to update React state
        const event = new Event('input', { bubbles: true })
        textarea.dispatchEvent(event)
        
        // Ensure the change is processed through our handler for debounced save
        setTimeout(() => updateWithContentChange(newValue), 10)
      } catch (error) {
        console.warn('Error in fallback text insertion:', error)
        // Final fallback: update through handleContentChange
        const currentValue = markdownValue || ''
        const spacePrefix = currentValue && !/\s$/.test(currentValue) ? ' ' : ''
        updateWithContentChange(currentValue + spacePrefix + text)
      }
    } else {
      // Final fallback: use handleContentChange directly
      const currentValue = markdownValue || ''
      const spacePrefix = currentValue && !/\s$/.test(currentValue) ? ' ' : ''
      updateWithContentChange(currentValue + spacePrefix + text)
    }
  }, [handleContentChange, markdownValue])

  return (
    <div className={`app ${theme}`} data-color-mode={theme}>
      <div className="editor-container">
        <div className="editor-wrapper">
          <MDEditor
            value={markdownValue}
            onChange={handleContentChange}
            data-color-mode={theme}
            visibleDragbar={false}
            hideToolbar
            preview={getMDEditorPreviewMode(previewMode)}
          />
        </div>
        <div className="editor-controls">
          <VoiceRecorder onTranscription={handleTranscription} />
          <div className={`character-counter ${isLimitReached ? 'limit-reached' : ''}`}>
            <button 
              className="mode-section"
              title="Press Ctrl+E or Cmd+E to cycle through edit modes"
              onClick={() => {
                setPreviewMode(prev => {
                  switch (prev) {
                    case 'edit':
                      return 'live'
                    case 'live':
                      return 'view'
                    case 'view':
                      return 'edit'
                    default:
                      return 'edit'
                  }
                })
              }}
            >
              {getModeIcon(previewMode)}
              {previewMode}
            </button>
            <span className="usage-section">
              {usagePercentage}% used
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditorApp 