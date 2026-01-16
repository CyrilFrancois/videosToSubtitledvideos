# 🎬 SubStudio: Local Processing Studio

**SubStudio** is a professional-grade, AI-powered media pipeline designed for automated subtitle generation, context-aware translation, and intelligent MKV muxing. It transforms raw video files into fully accessible media using local Whisper models and GPT-4 intelligence.

---

## ✨ Key Features

* **Studio Dashboard:** A persistent "System Monitor" provides real-time progress of batch jobs, processor status (Idle/Busy), and file completion counts.
* **Recursive Discovery:** High-speed scanning of local directories to identify videos and existing sidecar subtitle files.
* **Intelligent Subtitle Heuristics:** * Detects internal MKV/MP4 tracks and external `.srt` files.
    * Handles nested structures (e.g., `subs/video_name/lang.srt`).
    * Automatically identifies the most complete SDH tracks based on file weight and duration.
* **AI Pipeline:** * **Whisper:** Local speech-to-text for high-accuracy audio transcription.
    * **GPT-4 Translation:** Context-aware translation that preserves tone and character nuances using metadata-driven prompts.
* **Smart Muxing:** Final output as `.mkv` with correctly tagged language tracks and "default" flags, with optional "Studio Cleanup" to remove original source files.

---

## 🏗️ Architecture

The suite is fully containerized, leveraging **Docker Compose** to manage the frontend, backend, and heavy-duty dependencies like FFmpeg and CUDA drivers.

| Service | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | Next.js / Tailwind CSS | Interactive Dashboard, Batch Control, Real-time Logs (SSE). |
| **Backend** | FastAPI (Python) | Transcription Engine, FFmpeg Orchestration, GPT Integration. |
| **Storage** | Docker Volumes | Shared mount for the local media library (`/data`). |

---

## 📂 Project Structure

```text
# SubStudio Project Structure

.
├── backend/
│   ├── core/
│   │   ├── muxer.py
│   │   ├── scanner.py
│   │   ├── subtitle_processor.py
│   │   ├── transcriber.py
│   │   ├── translator.py
│   │   └── __init__.py
│   ├── database/
│   ├── data/
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
