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

UX/UI

1. The Sidebar: "Global Pipeline Configuration"
This area is the Control Plane. It should be a fixed, high-contrast vertical bar.

A. Discovery Controls
"Scan Directory" Button: The primary trigger to start the Scanner.py logic.

"Recursive" Toggle: A switch to decide if the scanner stays in the root or dives into subfolders.

Path Breadcrumb: A non-editable, mono-spaced text area showing exactly which /data/ folder is currently "mounted."

B. AI & Translation Strategy
"Target Language" Selector: A dropdown (French, English, etc.) that sets the default for the GPT translator.

"Provider" Toggle: Switch between OpenAI, Local LLM, or DeepL.

"Transcription Model" Selector: Dropdown to choose Whisper size (tiny, base, large-v3)—crucial for balancing speed vs. accuracy.

C. Output Logic
"Mux into MKV" Switch: Toggle to decide if a new file should be created or just the .srt.

"Cleanup" Toggle: A high-visibility (red) switch for "Delete original file after success."

"Master Start" Button: A massive, pulsing button at the bottom: EXECUTE ALL PENDING.

2. The Header: "Real-Time Telemetry"
This is a horizontal strip at the top of the main area. It gives the user a "God View" of the system.

System Status Badge: A pulsing LED icon: [IDLE], [SCANNING], or [PROCESSING].

Aggregate Progress Bar: A single, thick neon bar representing the percentage of the entire folder completed.

Resource Counters: Small "Chips" showing:

Queue: 12

Active: 2

Failed: 0

ETA: 14m

3. The Video Card: "Atomic File Control"
Each file in your list is an independent processing unit. Every card should contain:

A. Metadata Block (Top Left)
Filename & Extension Badge: e.g., The_Bear_S01E01.mkv [HEVC].

Stream Inventory: Small icons showing detected streams:

[Speaker Icon] (English 5.1 detected)

[Text Icon] (Internal FR subs found)

[Folder Icon] (External .srt found in /subs/)

B. Per-File Overrides (Middle)
"Override Language": A specific dropdown if this one file needs a different translation than the global setting.

"Sync Offset" Input: A small numerical field to manually shift subtitle timings if the user knows they are out of sync.

C. Action & Progress Block (Right Side)
"Start/Cancel" Button: Individual control to process just this file.

Multi-Stage Progress Bar: This is the "Pro" touch. Instead of one bar, use a segmented bar that fills as the file moves through:

Transcribing

Translating

Muxing

Live Log Snippet: A tiny, scrolling one-line terminal: "Whisper: 45% complete..."

4. The "Drawer": "Raw Logs & Debug"
When a user clicks on a specific Video Card, a "Drawer" or "Accordion" should slide out from under it.

Terminal Output: The raw stdout from FFmpeg and the Python backend.

JSON Preview: A view of the metadata gathered by ffprobe.

GPT Prompt Preview: Show the exact context-aware prompt being sent to the LLM (e.g., "Context: Kitchen Drama...").

Summary of Industrial UX Principles
Immutability: Once a file starts processing, its "Override" buttons should be disabled (grayed out) to prevent mid-task errors.

Visual Weight: Use "Dark" and "Darker" backgrounds to separate sections. Never use pure white backgrounds for an industrial tool.

Contrast: Use Neon Blue for "Doing," Amber for "Waiting," and Emerald Green for "Done."

What functions I want to keep :
- Media Inventory Badges (list of Audio, list of subs, indeed an icon to say if a sub with the same name is in the same folder or in subfolder recursively)
- Status Indicators
- Individual Trigger
- Source Language Picker (on the videos files but also its folder)
- Subtitle Source Toggle (But we need to extract the state of the files before)
- The "Sync Offset" Field (including the possibility to offset only some parts on the video files, for example when there is a blckscreen mid-video that offset only half the subtitles)
- External srt File Dropzone
- Segmented Progress Bar
- Mini-Console (in the header at the top, just below the "N/N Files done")


To look professional and "Industrial," the card should move away from the standard rounded-corner "app" look and toward a high-density instrumentation panel. We will use a grid-based horizontal layout with distinct functional zones separated by subtle vertical borders.

Here is the design breakdown for the Atomic File Control card:

The Layout: A Four-Zone Horizontal Slice
The card is a low-profile rectangle with a dark matte background (#0d0d0d) and a 1px border that changes color based on status (e.g., subtle blue for idle, emerald for done).

1. The ID & Selection Zone (Far Left - 5% width)
Vertical Status Strip: A 4px wide solid color bar at the very edge (Gray = Idle, Pulsing Blue = Active, Red = Error).

Checkbox: A custom squared-off checkbox for batch selection.

Index Number: A tiny, dim mono-spaced number (e.g., 001) to give it a "catalog" feel.

2. The Inventory & Discovery Zone (25% width)
Primary Label: The filename in a bold, white sans-serif, truncated with an ellipsis if too long. Below it, the file size and duration in a dim gray.

Inventory Badges: A row of "Micro-Chips":

Audio: Small speaker icon + EN 5.1 (Blue text on dark blue background).

Internal Subs: Text icon + FR, EN (Amber).

External Match: A "Link" icon + .SRT—this lights up green if a matching file was found in the folder or /subs/ subfolder.

Dropzone: A subtle dashed-border icon. If you drag an .srt here, it highlights the zone and displays the filename of the dropped sub.

3. The Configuration Cockpit (Middle - 40% width)
This is where the user "programs" the task.

Source/Target Logic: Two compact dropdowns.

SRC: [Auto-Detect ▼] (Whisper hint).

TGT: [French ▼].

Source Toggle: A segmented control (button group) to choose the input:

[ Generate ] (Use Whisper AI).

[ Translate ] (Use existing internal/external sub).

Sync Offset Multi-Field: A specialized input. It shows a + button to add "Offset Zones."

Default: Global: [ 0.00 ]s.

Extended: 00:12:00 -> End: [ +2.5 ]s. This allows the user to handle those mid-video blackscreens you mentioned.

4. The Execution & Progress Zone (Far Right - 30% width)
The Segmented Progress Bar: Positioned at the top of this zone. Three distinct segments: Transcribe | Translate | Mux.

When "Transcribe" is active, that segment pulses blue while the others stay dark gray.

Telemetry Readout: Below the bar, tiny mono-spaced text shows SPEED: 2.1x | FPS: 140 | ETA: 02:45.

Action Trigger: A single, square button.

If Idle: A "Play" icon (Outline).

If Active: A "Square" stop icon (Solid Red on hover).


Updated Subtitle Detection Logic
1. Direct Name Match (Same Folder or Subfolder)
The Logic: The scanner identifies the base name of the video (e.g., Inception). It then searches the current directory and any immediate subdirectories (like /Subs or /Subtitles) for files named Inception.*.srt.

The Objective: Perform a Strict String Match. If a match is found, the scanner marks the video as having "Sidecar" subtitles.

2. Isolation Logic (The "Lone Video" Rule)
The Logic: If a directory contains exactly one movie file, the scanner assumes any subtitle files in that folder belong to that movie, regardless of their names (e.g., Video_01.mp4 and English_Final.srt).

The Objective: Directory Content Analysis. If the ratio of videos to folders is 1:1, link all loose subtitle files to that single video entity.

3. Embedded Stream Analysis
The Logic: The scanner probes the container (MKV/MP4) to see if subtitle tracks are baked into the file itself.

The Objective: Stream Header Inspection. Identify tracks with a codec_type of "subtitle." This allows the user to process the file without needing any external files at all.

4. Automated Language Detection (The "Language Guessing" Phase)
The Logic: If the previous steps found a subtitle but no language metadata was attached (no .en. in the filename or no language tag in the MKV header), the system attempts to detect it automatically.

The Objective: * Filename Parsing: Use Regex to look for common language codes (ISO 639-1) like _en, -fr, or (Spanish).

Content Sampling (Advanced): Open the first few lines of the SRT file and run a fast Natural Language Processing (NLP) library (like langid or langdetect) to identify the language based on the text.

Final Fallback: Only if the NLP confidence is too low do we label it "Unknown."

Displaying Status in the VideoCard
The primary goal for the UI is to be informative but non-intrusive. Instead of overwhelming the user with technical paths, the scanner simply feeds a status flag to the VideoCard.

UI Status Label: If any of the 4 methods succeed, the VideoCard displays a clear "Subtitles Detected" badge or icon.

Selector Pre-fill: * If the language was detected (via tags or AI sampling), the SRC dropdown is automatically set to that language.

If the language is "Unknown," the SRC dropdown defaults to "Auto-Detect," but the user still sees that a file was found and is ready to use.

Final Objectives for the Scanner API
To make this work, the scanner must return a subtitle_report for every video:

exists: Boolean.

source: "Embedded", "External (Match)", or "External (Assigned)".

detected_lang: The result of the Filename/NLP detection (e.g., "fr" or "und").

count: Number of tracks/files found.

Would you like to see how the backend Python/Node script would look to handle that "Content Sampling" step for automatic language detection?