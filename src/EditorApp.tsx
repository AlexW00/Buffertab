
import { useState, useEffect, useCallback } from 'react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import { Edit3, Split, Eye } from 'lucide-react'
import VoiceRecorder from './VoiceRecorder'

const MAX_URL_LENGTH = 2048 // Safe URL length limit

function EditorApp() {
  const [usagePercentage, setUsagePercentage] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isLimitReached, setIsLimitReached] = useState(false)
  const [markdownValue, setMarkdownValue] = useState('')
  const [previewMode, setPreviewMode] = useState<'edit' | 'live' | 'view'>('edit')

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

  // Keyboard shortcut handler for Ctrl+E to toggle preview mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'e') {
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

  // Load content from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      decodeContent(hash).then(decodedContent => {
        if (decodedContent) {
          setMarkdownValue(decodedContent)
        }
      })
    }
  }, [decodeContent])

  // Update URL and usage percentage when content changes
  const handleContentChange = useCallback(async (value?: string) => {
    const content = value || ''
    const encoded = await encodeContent(content)
    const urlLength = encoded.length + 1 // +1 for the # character
    const remaining = MAX_URL_LENGTH - urlLength
    const percentage = Math.round((urlLength / MAX_URL_LENGTH) * 100)
    
    setUsagePercentage(percentage)
    setIsLimitReached(remaining < 0)
    
    if (remaining >= 0) {
      // Update URL hash
      if (window.location.hash.slice(1) !== encoded) {
        window.history.replaceState(null, '', `#${encoded}`)
      }
      setMarkdownValue(content)
    } else {
      // If over limit, revert to previous content
      setIsLimitReached(true)
    }
  }, [encodeContent])

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
    // Try to insert text at cursor position by simulating typing
    // This will trigger the onChange handler with the new content
    const activeElement = document.activeElement
    if (activeElement && activeElement.tagName === 'TEXTAREA') {
      const textarea = activeElement as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentValue = textarea.value
      
      // Insert text at cursor position
      const newValue = currentValue.slice(0, start) + text + currentValue.slice(end)
      
      // Update the textarea value and trigger change
      textarea.value = newValue
      textarea.setSelectionRange(start + text.length, start + text.length)
      
      // Trigger input event to update React state
      const event = new Event('input', { bubbles: true })
      textarea.dispatchEvent(event)
    } else {
      // Fallback: append to the end of the content
      setMarkdownValue(prevValue => prevValue + text)
    }
  }, [])

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