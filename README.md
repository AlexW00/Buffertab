# BufferTab

A minimal markdown editor that lives in your browser's URL.

## Features

- **URL-based storage** - Your content is compressed and stored in the URL hash
- **Voice transcription** - Record audio and convert to text using OpenAI Whisper
- **Real-time preview** - Live markdown editing and preview
- **Dark/light theme** - Automatically adapts to your system preference
- **Character limit tracking** - Visual indicator of URL length usage

## Usage

1. Open the app in your browser
2. Start typing markdown content
3. Your content is automatically saved to the URL
4. Share the URL to share your content

### Voice Recording

1. Click the dropdown arrow to expand voice recorder settings
2. Enter your OpenAI API key
3. Click the microphone button to start/stop recording
4. Audio is automatically transcribed and inserted into the editor

## Tech Stack

- React + TypeScript
- Vite
- React MD Editor
- OpenAI API (Whisper)
- Compression API for URL storage

## License

MIT
