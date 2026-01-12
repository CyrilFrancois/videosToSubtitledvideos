# 🎬 AI Video Suite: Transcribe, Translate & Mux

A professional-grade media pipeline for automated subtitle generation, AI-powered translation (GPT-4), and smart MKV muxing. This application handles complex subtitle folder structures, audio-to-subtitle synchronization, and recursive folder processing.



## ✨ Key Features

* **Recursive Discovery:** Scan single files, specific folders, or entire directory trees.
* **Intelligent Subtitle Search:** * Internal streams (MKV/MP4 tracks).
    * Sidecar files (`video.srt`).
    * Nested structures (`subs/video_name/lang.srt`).
    * **Heuristic Selection:** Automatically picks the most complete (SDH) subtitle based on file weight and duration.
* **AI Pipeline:** * **Whisper:** Local speech-to-text for audio detection and transcription.
    * **GPT-4:** Context-aware translation using show/movie metadata for superior accuracy.
* **Sync Engine:** Adjusts external unsynchronized subtitles to match the audio track or existing internal transcription.
* **Clean Muxing:** Final output as `.mkv` with correctly tagged language tracks and "default" flags.

---

## 🏗️ Architecture

The app is containerized using **Docker Compose** to manage dependencies like FFmpeg and CUDA drivers.

| Service | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | Next.js / TypeScript | Interactive dashboard, File Explorer, Real-time Logs (SSE). |
| **Backend** | FastAPI (Python) | AI Engine, File Scanner, FFmpeg Muxer, GPT Integration. |
| **Storage** | Docker Volumes | Shared access to your local media library. |

---

## 📂 Project Structure

```text
videosToSubtitledvideos/
├── docker-compose.yml         # Container orchestration
├── .env                       # API Keys & Configuration
├── readme.md                  # The Readme of the application you're reading right now
├── data/                      # YOUR MEDIA (Mounted local folder)
├── frontend/                  # Next.js Application
│   ├── src/components/        # UI: FileTree, LogConsole, TrackList
│   └── src/lib/               # API clients
└── backend/                   # FastAPI Application
    ├── core/
    │   ├── scanner.py         # Subtitle & Stream discovery logic
    │   ├── transcriber.py     # OpenAI Whisper implementation
    │   ├── translator.py      # LLM Translation logic
    │   └── muxer.py           # FFmpeg & Synchronization
    └── main.py                # REST API Endpoints
```

---

## 🚀 Getting Started

### 1. Prerequisites
* **Docker & Docker Compose** installed.
* **NVIDIA Container Toolkit** (Optional, for GPU acceleration).
* **OpenAI API Key** (For context-aware translation).

### 2. Configuration
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_key_here
MEDIA_PATH=./data
WHISPER_MODEL=base  # tiny, base, small, medium, large
```

### 3. Deployment
```bash
docker-compose up --build
```
The application will be available at:
* **Frontend:** `http://localhost:3000`
* **Backend API:** `http://localhost:8000/docs`

---

## ⚙️ Logic Workflow

1.  **Detection:** User selects a root folder. The `Scanner` identifies every video and probes for existing audio/subtitle tracks.
2.  **Selection:** User picks target languages (e.g., English -> French/Japanese).
3.  **Synchronization (If needed):** If external subtitles are chosen, the engine compares their timestamps with the audio waveform to fix offsets.
4.  **Translation:** Subtitles are chunked and sent to GPT-4 with "System Prompts" derived from movie metadata to maintain tone.
5.  **Finalization:** FFmpeg muxes all chosen streams into a new `.mkv` file, preserving quality while organizing tracks.

---

## 🗺️ Roadmap
- [ ] Auto-sync via Cross-Correlation of audio waveforms.
- [ ] TMDB API integration for automatic show metadata.
- [ ] User-defined "Translation Glossary" for specific terminology.