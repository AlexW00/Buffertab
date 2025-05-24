import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, ChevronDown, ChevronUp } from 'lucide-react'
import OpenAI from 'openai'

interface VoiceRecorderProps {
  onTranscription?: (text: string) => void
}

const OPENAI_API_KEY_LENGTH = 51 // OpenAI API keys are 51 characters long
const STORAGE_KEY = 'buffertab-openai-api-key'

export default function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY)
    if (savedKey) {
      setApiKey(savedKey)
      // Validate the saved key
      if (savedKey.length === OPENAI_API_KEY_LENGTH) {
        validateApiKey(savedKey)
      }
    }
  }, [])

  // Validate API key when it reaches the required length
  const validateApiKey = useCallback(async (key: string) => {
    if (key.length !== OPENAI_API_KEY_LENGTH) return

    setKeyStatus('validating')
    try {
      const openai = new OpenAI({ 
        apiKey: key,
        dangerouslyAllowBrowser: true // For client-side usage
      })
      
      // Test the API key with a minimal request
      await openai.models.list()
      setKeyStatus('valid')
      // Save the valid key to localStorage
      localStorage.setItem(STORAGE_KEY, key)
    } catch (error) {
      console.error('API key validation failed:', error)
      setKeyStatus('invalid')
      // Remove invalid key from localStorage
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Handle API key input change
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setApiKey(value)
    
    if (value.length === 0) {
      setKeyStatus('idle')
      // Clear key from localStorage when empty
      localStorage.removeItem(STORAGE_KEY)
    } else if (value.length === OPENAI_API_KEY_LENGTH) {
      validateApiKey(value)
    } else {
      setKeyStatus('idle')
    }
  }

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsExpanded(false)
    }
  }

  // Handle global keyboard shortcut for Cmd+Enter
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        
        // Store the currently focused element before handling microphone
        const activeElement = document.activeElement
        
        handleMicrophoneClick()
        
        // If the focus was in the editor, restore it after a brief delay
        if (activeElement && (
          activeElement.classList.contains('w-md-editor-text') ||
          activeElement.closest('.w-md-editor')
        )) {
          setTimeout(() => {
            const textarea = document.querySelector('.w-md-editor-text') as HTMLTextAreaElement
            if (textarea) {
              textarea.focus()
            }
          }, 100)
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [keyStatus, isTranscribing, isRecording, mediaRecorder])

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        
        // Transcribe audio using OpenAI
        await transcribeAudio(blob)

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  // Handle microphone button click
  const handleMicrophoneClick = () => {
    if (keyStatus !== 'valid') {
      alert('Please enter a valid OpenAI API key first.')
      return
    }

    // Prevent clicking during transcription
    if (isTranscribing) {
      return
    }

    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Toggle expansion
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      // Focus the input when expanding
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const getInputBorderColor = () => {
    switch (keyStatus) {
      case 'valid':
        return '#10B981' // green
      case 'invalid':
        return '#EF4444' // red
      case 'validating':
        return '#F59E0B' // yellow
      default:
        return '#D1D5DB' // gray
    }
  }

  // Handle combined button click
  const handleCombinedButtonClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const buttonWidth = rect.width
    const caretZoneWidth = 32 // Adjusted for the new caret section width

    // If clicked in the caret zone (right area), toggle expansion
    if (clickX > buttonWidth - caretZoneWidth) {
      toggleExpanded()
    } else {
      // Otherwise, handle microphone click
      handleMicrophoneClick()
    }
  }

  // Transcribe audio using OpenAI
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    if (keyStatus !== 'valid' || !apiKey) {
      console.error('No valid API key available for transcription')
      return
    }

    setIsTranscribing(true)

    try {
      const openai = new OpenAI({ 
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      })

      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        response_format: "text",
      })

      console.log('Transcription response:', transcription, 'Type:', typeof transcription)

      if (onTranscription && transcription && typeof transcription === 'string' && transcription.trim()) {
        const trimmedTranscription = transcription.trim()
        
        // Use a timeout to ensure the transcription happens after any UI updates
        setTimeout(() => {
          onTranscription(trimmedTranscription)
          
          // Ensure focus is back on the editor after transcription
          const textarea = document.querySelector('.w-md-editor-text') as HTMLTextAreaElement
          if (textarea) {
            textarea.focus()
          }
        }, 50)
      } else {
        console.warn('No valid transcription received:', transcription)
      }

      console.log('Transcription completed:', transcription)
    } catch (error) {
      console.error('Transcription error:', error)
      alert('Failed to transcribe audio. Please check your API key and try again.')
    } finally {
      setIsTranscribing(false)
    }
  }, [apiKey, keyStatus, onTranscription])

  return (
    <div ref={containerRef} className="voice-recorder">
      {isExpanded && (
        <div className="api-key-input-container">
          <input
            ref={inputRef}
            type="password"
            value={apiKey}
            onChange={handleApiKeyChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter OpenAI API Key"
            className="api-key-input"
            style={{
              borderColor: getInputBorderColor(),
              borderWidth: '2px'
            }}
          />
          {keyStatus === 'validating' && (
            <div className="validation-status">Validating...</div>
          )}
        </div>
      )}
      
      <div className="voice-recorder-controls">
        <button
          className={`combined-button ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
          onClick={handleCombinedButtonClick}
          disabled={isTranscribing}
          title={
            isTranscribing 
              ? 'Transcribing audio...' 
              : keyStatus !== 'valid' 
                ? 'Please enter a valid API key first' 
                : 'Click microphone to record (or press Ctrl+Enter/Cmd+Enter), click arrow to expand'
          }
        >
          <div className="microphone-section">
            {isTranscribing ? (
              // Transcribing indicator with different spinner
              <div className="transcribing-indicator">
                <div className="transcribing-spinner" />
              </div>
            ) : isRecording ? (
              // Recording indicator with spinner
              <div className="recording-indicator">
                <div className="spinner" />
              </div>
            ) : (
              // Microphone icon
              <Mic size={16} />
            )}
          </div>
          <div className="caret-section">
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
        </button>
      </div>
    </div>
  )
}
