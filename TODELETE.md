This is a significant shift toward a professional-grade media processing pipeline. Moving to **Docker** is the right choice here because managing **FFmpeg**, **Whisper (AI)**, and **GPT (LLM)** dependencies in a single environment can be a nightmare on local OS.

Here is a detailed architectural and procedural roadmap for your "Next-Gen Transmuxer."

---

### 1. The Tech Stack (The "Modern" Way)

* **Backend:** **FastAPI** (Asynchronous, handles long-running tasks via BackgroundTasks or Celery).
* **Frontend:** **Streamlit** or **Next.js** (Streamlit is much faster to build for Python developers and handles file trees well).
* **Worker:** **OpenAI Whisper** (Speech-to-Text) + **FFMPEG** (Muxing/Extraction).
* **Brain:** **LangChain** or **OpenAI SDK** (To feed subtitle segments to GPT for context-aware translation).
* **Container:** **Docker Compose** (One container for the Web UI, one for the GPU/CPU worker).

---

### 2. The Logic Flow: "The Discovery Engine"

Your biggest challenge is the **Subtitles Discovery Logic**. The app needs a "Scanner" class that follows this hierarchy:

1. **Internal:** Check for embedded subtitle streams (e.g., Track 3: English SDH).
2. **External (Sidecar):** Look for `movie.srt` in the same folder.
3. **External (Subfolder):** Look for `subs/*.srt` or `subtitles/*.srt`.
4. **Complex Tree:** Look for `subs/[video_name]/*.srt`.

**The "Heaviest/Longest" Rule:** You mentioned taking the heaviest file. We should refine this: The app should calculate a **"Coverage Score"** (Total subtitle duration vs. Movie duration). This ensures we pick the SDH (Subtitles for Deaf and Hard of Hearing) version which includes atmospheric sounds.

---

### 3. The Processing Strategy (Case-by-Case)

| Scenario | Logic Path |
| --- | --- |
| **No Subs / Unknown Audio** | Whisper `detect_language` -> Whisper `transcribe` -> GPT `translate` |
| **Existing Subs found** | Extract via FFMPEG -> GPT `translate` (Skip Whisper to save time/compute) |
| **Unsynchronized Online Subs** | **Sub-Sync Logic:** Extract audio track -> Create a "timing map" with Whisper -> Cross-correlate timings of the online SRT -> Shift/Stretch the SRT to match. |

---

### 4. GPT Context-Aware Translation

This is a brilliant addition. Here is how to implement it:

1. **Metadata Scraping:** Use the filename to query an API (like TMDB) or ask GPT: *"Based on the filename 'The.Bear.S01E01', what is the tone and context of this show?"*
2. **Chunked Translation:** You cannot send a whole SRT to GPT at once. You send chunks (e.g., 50 lines) with a "System Prompt" like: *"Translate this from French to English. Context: This is a high-stress kitchen drama. Use chef terminology."*

---

### 5. Missing Steps & Proposed Enhancements

#### A. The "Conflict" Resolver

What if the user has an internal sub and an external sub?

* **Addition:** The UI should show a "Quality Confidence" score. If Whisper’s transcription differs significantly from the found SRT, flag it for the user to pick the "Reference" file.

#### B. Audio Track Selection

Some MKVs have 5 audio tracks (Director's commentary, French, English, etc.).

* **Addition:** The app must allow the user to select which **Audio Stream ID** to use as the source for transcription.

#### C. Preview Feature

Before processing a 2-hour movie:

* **Addition:** A "Preview 30 seconds" button. It transcribes/translates just one minute from the middle of the film so the user can check if the synchronization and translation tone are correct.

#### D. The "Clean" Muxing

* **Addition:** When creating the final MKV, provide a "Default" flag. Set the new translation as the `default` and `forced` subtitle track so it plays automatically on TVs/Plex.

---

### 6. Suggested Development Phases

**Phase 1: The Docker Core**

* Set up a Docker image with `python:3.10-slim`, `ffmpeg`, and `pytorch`.
* Build the FastAPI endpoint `/scan` that returns a JSON of the file tree and stream info.

**Phase 2: The Alignment Engine**

* Implement the `ffprobe` logic to list audio/subs.
* Implement the "Sync" logic (The most complex math part).

**Phase 3: The AI Pipeline**

* Connect Whisper and GPT.
* Implement the "Recursive Folder" walk.

**Phase 4: The MKV Finalizer**

* FFMPEG command builder to merge everything and delete/backup the original file.

---


To achieve a professional, high-performance feel, the application should be designed as a **Single Page Application (SPA)** with a **Split-Layout Dashboard**. This design prioritizes the "System Status" and "Batch Configuration" at all times.

### 1. The Global Architecture (Layout)

The page is split into two main functional zones:

* **The Left Sidebar (Control & Config):** A sticky, fixed-width column (approx. 25% of the screen) that contains the application identity and the "Global Settings" that apply to all files by default.
* **The Main Content Area (Video Queue):** A scrollable area (75% of the screen) containing the global progress and the detailed list of video cards.

---

### 2. The Sticky Left Sidebar: "The Command Center"

This column remains visible as you scroll through hundreds of videos.

* **App Header:** The name of the app (e.g., **"AI Media Suite"**) in a bold, tech-focused font with a subtle glowing icon.
* **Step 1: Source Selection:**
* A large "Select Folder" button (primary action).
* A "Recursive Scan" toggle switch.
* A breadcrumb display of the current path (e.g., `/data/movies/series/`).


* **Step 2: Default Output Options:**
* **Target Languages:** A multi-select dropdown (e.g., French, Japanese, English).
* **Final Output Format:** Toggle for "Generate MKV".
* **Post-Process:** Toggle for "Delete Original Source" (with a red warning label).


* **Global Run Button:** A large, sticky button at the bottom of the sidebar: **"PROCESS ALL FILES"**.

---

### 3. The Main Content Area: "The Processing Queue"

#### **Top Global Progress Bar**

Before the list starts, a fixed header in the main area displays the "Overview Status":

* **Total Progress:** A thick, neon-green bar showing `$X / Y$ Videos Completed`.
* **Status Tags:** Small chips showing `Pending: 12`, `Processing: 2`, `Done: 5`.

#### **The Video File List (Individual Cards)**

Each video is represented by a "Video Card" containing:

**Top Row: Metadata & Identification**

* **File Name:** Bold title (e.g., `S01E01_The_Bear.mp4`).
* **Type Badge:** A small `[MP4]` or `[MKV]` tag.
* **Audio/Sub Probe:** * `Audio: [EN] (Detected)`
* `Internal Subs: [None]` or `[FR, EN]`
* `External Subs: Found in /subs/ (v1_en.srt)`



**Middle Row: Custom Configuration**

* This row allows you to **override** the global settings for *this specific file*.
* Dropdowns for specific output languages.
* A "Sync with Audio" checkbox if external subs were detected.

**Bottom Row: Real-time Progression**

* **Multi-Stage Progress Bar:** A segmented bar that changes color based on the step:
1. **Scanning** (Blue)
2. **Transcribing** (Purple)
3. **Translating** (Yellow)
4. **Muxing** (Orange)
5. **Done** (Solid Green with a checkmark icon `✅`).


* **Log Snippet:** A one-line scrolling text below the bar showing the current sub-task: *"GPT-4 translating segment 45/120..."*

---

### 4. User Interaction & Feedback Logic

* **Individual Control:** Every card has its own "Start" button so you can process one file at a time or hit the Global Start.
* **The "Green Check" Effect:** When a file finishes, the entire card gets a subtle green border and a "View Output" folder icon appears.
* **Real-time Logs:** Clicking on any card expands a small terminal-style drawer at the bottom of the card showing the raw output from the Backend.

---

### 5. Summary of UI Elements

| Component | UI Pattern | Behavior |
| --- | --- | --- |
| **Menu** | Sticky Sidebar | `position: fixed; left: 0; h: 100vh;` |
| **Selection** | Tree View / File Picker | Visual folder hierarchy. |
| **Progress** | Determinate Bars | Segments for each stage (Transcribe -> Translate -> Mux). |
| **Status** | Status Badges | Dynamic colors: Gray (Idle), Pulsing Blue (Working), Green (Success). |

Would you like me to provide the **Next.js (React + Tailwind)** code for this one-pager layout so you can start building the visual interface?

[Video processing automation with Python and Docker](https://www.google.com/search?q=https://www.youtube.com/watch%3Fv%3DF3zWvGv-Kmc)
This video provides a conceptual overview of how to orchestrate media processing tasks using containers, which aligns with the Dockerized backend architecture we are building.

