# 🎬 SubStudio: Local Processing Studio

**SubStudio** is a professional-grade, AI-powered media pipeline designed for automated subtitle generation, context-aware translation, and intelligent MKV muxing. It transforms raw video files into fully accessible media using local Whisper models and LLM intelligence.

---

## 🏗️ Architecture & Communication

SubStudio operates on a **decoupled Client-Server model** optimized for high-throughput media processing. The frontend manages orchestration and user state, while the backend handles heavy-duty audio extraction, transcription, and muxing.

## 📂 Project Structure

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
│   │   ├── hooks/
│   │   │   └── useSocket.ts
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


### Data Exchange Flow
To keep the UI responsive during CPU/GPU intensive tasks, the system uses three communication layers:

1. **REST API (HTTP):** Standard request/response for folder scanning, job initialization, and manual file uploads.
2. **Server-Sent Events (SSE):** A one-way real-time stream from Backend to Frontend for progress percentages, status changes, and terminal logs.
3. **Shared Volume (File System):** Both services mount `/data`. The backend processes files in-place or creates temporary sidecar files that the frontend can reference via path.

---

## 📡 API Contracts & Data Formats

### 1. Folder Discovery (GET `/scan`)
Triggered on dashboard load or manual refresh. The backend performs a recursive walk and returns a tree structure.

**Response Schema:**
```json
{
  "files": [
    {
      "fileName": "movie.mp4",
      "filePath": "/data/movies/movie.mp4",
      "is_directory": false,
      "subtitleInfo": {
        "hasSubtitles": true,
        "subType": "external", 
        "srtPath": "/data/movies/movie.srt",
        "languages": ["en"],
        "count": 1
      }
    }
  ]
}
