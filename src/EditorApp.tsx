
import { useState, useEffect, useCallback } from 'react'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

const MAX_URL_LENGTH = 2048 // Safe URL length limit

function EditorApp() {
  const [usagePercentage, setUsagePercentage] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isLimitReached, setIsLimitReached] = useState(false)
  const [markdownValue, setMarkdownValue] = useState('')

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

  // Simple base64 encoding for URL
  const encodeContent = useCallback((text: string): string => {
    if (!text) return ''
    return btoa(text)
  }, [])

  // Simple base64 decoding from URL
  const decodeContent = useCallback((encoded: string): string => {
    if (!encoded) return ''
    try {
      return atob(encoded)
    } catch {
      return '' // Return empty if decoding fails
    }
  }, [])

  // Load content from URL on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const decodedContent = decodeContent(hash)
      if (decodedContent) {
        setMarkdownValue(decodedContent)
      }
    }
  }, [decodeContent])

  // Update URL and usage percentage when content changes
  const handleContentChange = useCallback((value?: string) => {
    const content = value || ''
    const encoded = encodeContent(content)
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
            preview="edit"
          />
        </div>
        <div className={`character-counter ${isLimitReached ? 'limit-reached' : ''}`}>
          {usagePercentage}% used
        </div>
      </div>
    </div>
  )
}

export default EditorApp 