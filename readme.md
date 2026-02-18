# 🎬 SubStudio: Local Processing Studio
SubStudio is a professional-grade, AI-powered media pipeline designed for automated subtitle generation, context-aware translation, and intelligent MKV muxing. By leveraging local Whisper models and LLM intelligence, it transforms raw video files into fully accessible, multi-lingual media without ever leaving your local network.

## 🚀 Key Features
AI Transcription: Powered by OpenAI's Whisper (Tiny to Large models) with a custom +0.4s synchronization offset for perfect audio-visual alignment.

### Intelligent Muxing: Custom FFmpeg engine that preserves all original internal streams while injecting new AI-generated tracks with proper ISO 639-2 language tags.

### Contextual Translation: LLM-based translation logic that maintains narrative consistency across subtitle segments.

### Real-time Orchestration: Decoupled architecture using Server-Sent Events (SSE) for frame-accurate progress tracking.

### External Subtitle Discovery: Automatically scans for and incorporates existing sidecar .srt files during the muxing process.

## 🏗️ Architecture & Communication
SubStudio operates on a decoupled Client-Server model optimized for high-throughput media processing.

REST API (FastAPI): Standard request/response for folder scanning, job initialization, and manual uploads.

Server-Sent Events (SSE): A real-time stream providing progress percentages (20% to 100%), status changes, and terminal logs to the Next.js frontend.

Shared Volume: Both services mount a shared /data volume. The backend performs in-place processing, minimizing I/O overhead by avoiding unnecessary file copies.


## 📡 API Contracts & Data Formats
1. Folder Discovery (GET /scan)
The backend performs a recursive walk of the /data directory. It identifies video files and checks for both internal (embedded) and external (sidecar) subtitles.

Response Schema:

JSON
{
  "files": [
    {
      "fileName": "movie.mp4",
      "filePath": "/data/movies/movie.mp4",
      "is_directory": false,
      "subtitleInfo": {
        "hasSubtitles": true,
        "subType": "mixed", 
        "languages": ["eng", "fra"],
        "count": 2
      }
    }
  ]
}
2. Processing Pipeline (POST /process)
Starts the sequence: Audio Extraction ➔ Whisper Transcription (+0.4s) ➔ AI Translation ➔ MKV Muxing.

## 🛠️ Technical Deep Dive
The Transcriber (Whisper)
Our transcription engine applies a fixed 0.4-second positive offset to all generated timestamps. This compensates for the natural latency between audio onset and Whisper's segment detection, resulting in subtitles that feel "snappier" and perfectly synchronized with human speech.

The Muxer (FFmpeg)
To avoid the common "Piste 1" naming bug in media players, our muxer bypasses standard library wrappers to inject raw metadata:

Preservation: Maps 0:v, 0:a, and all 0:s (original tracks).

Injection: Adds generated tracks as new streams.

Tagging: Explicitly sets -metadata:s:X language=fra and -metadata:s:X title="AI French".

## 🚦 Getting Started
Configure Environment: Create a .env file in the root directory:

Code snippet
WHISPER_MODEL=base
LLM_API_KEY=your_key_here
DATA_PATH=./data
Launch via Docker Compose:

Bash
docker-compose up --build
Access the Dashboard: Open http://localhost:3000 to start processing your library.

## ⚖️ License
Distributed under the MIT License. See LICENSE for more information.

## 📂 Project Structure
backend/core/events.py muxer.py scanner.py subtitle_processor.py transcriber.py translator.py main.py

```text
# SubStudio Project Structure

.
├── backend/
│   ├── core/
│   │   ├── events.py
│   │   ├── muxer.py
│   │   ├── scanner.py
│   │   ├── subtitle_processor.py
│   │   ├── transcriber.py
│   │   ├── translator.py
│   │   └── __init__.py
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── data/                      # Shared media volume
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── GlobalProgress.tsx
│   │   │   │   ├── SubImportModal.tsx
│   │   │   │   ├── videoCard.tsx
│   │   │   │   └── VideoList.tsx
│   │   │   └── layout/
│   │   │       └── Sidebar.tsx
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── sse.ts
│   │   │   └── types.ts
│   │   ├── public/
│   │   │   └── logo.png
│   ├── Dockerfile
│   ├── next-env.d.ts
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── ressources/
│   └── logo.png               # Brand Assets
├── .env                       # Environment Variables
├── .gitignore
├── docker-compose.yml         # Orchestration
├── readme.md
└── TODELETE.md
```