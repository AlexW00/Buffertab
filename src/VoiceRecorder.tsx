import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, ChevronDown, ChevronUp } from 'lucide-react'
import OpenAI from 'openai'

interface VoiceRecorderProps {
  onTranscription?: (text: string) => void
}

const OPENAI_API_KEY_LENGTH = 51 // OpenAI API keys are 51 characters long

export default function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
    } catch (error) {
      console.error('API key validation failed:', error)
      setKeyStatus('invalid')
    }
  }, [])

  // Handle API key input change
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setApiKey(value)
    
    if (value.length === 0) {
      setKeyStatus('idle')
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

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' })
        setAudioBlob(blob)
        
        // Download the audio file (as requested - this will change later)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `recording-${Date.now()}.wav`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

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
          className={`combined-button ${isRecording ? 'recording' : ''}`}
          onClick={handleCombinedButtonClick}
          title={keyStatus !== 'valid' ? 'Please enter a valid API key first' : 'Click microphone to record, click arrow to expand'}
        >
          <div className="microphone-section">
            {isRecording ? (
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
