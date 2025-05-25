import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditorApp from '../EditorApp'

// Mock the DOM setup that the app expects
beforeEach(() => {
  // Create app div if it doesn't exist
  if (!document.getElementById('app')) {
    const appDiv = document.createElement('div')
    appDiv.id = 'app'
    document.body.appendChild(appDiv)
  }
  
  // Clear localStorage before each test
  localStorage.clear()
})

describe('EditorApp', () => {
  it('renders without crashing', () => {
    const { container } = render(<EditorApp />)
    
    // Check if the component renders successfully
    expect(container).toBeInTheDocument()
  })

  it('contains essential UI elements', () => {
    render(<EditorApp />)
    
    // Check for buttons in the interface
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    
    // Check if the markdown editor wrapper is present
    const editorWrapper = document.querySelector('[data-color-mode]')
    expect(editorWrapper).toBeInTheDocument()
  })

  it('has proper component structure', () => {
    const { container } = render(<EditorApp />)
    
    // Check if the main container has expected structure
    expect(container.firstChild).toBeInTheDocument()
    
    // Verify the component mounts without errors
    expect(container.innerHTML).toBeTruthy()
  })

  it('initializes with correct default state', () => {
    render(<EditorApp />)
    
    // Check that the editor starts in edit mode (default)
    const editButton = screen.getAllByRole('button').find(button => 
      button.textContent?.includes('edit') || 
      button.getAttribute('title')?.toLowerCase().includes('edit')
    )
    expect(editButton).toBeTruthy()
    
    // Check that the component renders basic UI elements
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2) // At least voice recorder and mode buttons
  })

  it('handles markdown editor interaction', async () => {
    const user = userEvent.setup()
    render(<EditorApp />)
    
    // Find the textarea element in the markdown editor
    const textareas = document.querySelectorAll('textarea')
    expect(textareas.length).toBeGreaterThan(0)
    
    // The component should handle text input without crashing
    if (textareas[0]) {
      await user.type(textareas[0], '# Test Heading')
      await waitFor(() => {
        expect(textareas[0]).toHaveValue('# Test Heading')
      })
    }
  })

  it('maintains responsive design elements', () => {
    render(<EditorApp />)
    
    // Check for responsive design elements
    const responsiveElements = document.querySelectorAll('[class*="w-"], [class*="h-"], [class*="flex"], [class*="grid"]')
    expect(responsiveElements.length).toBeGreaterThan(0)
  })

  it('has accessibility features', () => {
    render(<EditorApp />)
    
    // Check that buttons have proper roles
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeInTheDocument()
    })
    
    // Check for interactive elements
    const interactiveElements = document.querySelectorAll('button, input, textarea, select')
    expect(interactiveElements.length).toBeGreaterThan(0)
  })
})
