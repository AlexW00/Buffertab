import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import EditorApp from './EditorApp.tsx'
import './style.css'

const root = createRoot(document.getElementById('app')!)
root.render(
  <StrictMode>
    <EditorApp />
  </StrictMode>
)
