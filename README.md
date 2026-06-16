# BigQuery Release Notes Hub ⚡

A modern web application built using **Python Flask** and **Vanilla HTML5, CSS3, and JavaScript** that aggregates, filters, and shares release updates from the Google Cloud BigQuery RSS feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`).

---

## 🚀 Key Features

*   **HTML Feed Decomposition**: Automatically extracts individual update items from daily composite summaries, separating them by type (e.g., `Feature`, `Change`, `Issue`, `Announcement`, `Breaking`) with category-specific colored badges.
*   **Performance Optimization**: Utilizes an in-memory server-side cache (10-minute expiry) to guarantee immediate load times and avoid rate limits.
*   **On-Demand Sync**: Includes a manual **Refresh** button with a spinner animation that bypasses the cache to query the live RSS feed.
*   **Unified Filter & Search**: Client-side full-text search across updates, categories, or dates, combined with dropdown category filters and chronological sorting.
*   **Interactive X (Twitter) Composer**:
    *   Direct "Tweet" buttons on every card, plus **checkbox multi-select** to compile and share multiple updates simultaneously.
    *   An overlay composer modal featuring live character count limits (280-char max), a dynamic SVG circular progress ring, and a simulated X tweet card preview.
    *   One-click redirection to X Web Intent with url-encoded payloads.

---

## 📁 Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask application server, cache, & feed parser
├── requirements.txt        # Python dependency manifest
├── README.md               # Project documentation & user orientation
├── .gitignore              # Files ignored by Git (venv, caches, logs)
├── templates/
│   └── index.html          # HTML structure, skeleton loader, and modal layouts
└── static/
    ├── css/
    │   └── style.css       # Design variables, glassmorphic tokens, and animations
    └── js/
        └── main.js         # Client-side state, filtering, and Tweet compiler logic
```

---

## 🛠️ Getting Started (Local Setup)

To run the application locally on your machine, follow these steps:

### 1. Prerequisites
Ensure you have **Python 3.8+** and **Git** installed on your system.

### 2. Clone and Initialize the Environment
In your local terminal, navigate to the directory and set up a virtual environment:
```bash
# Create the virtual environment
python3 -m venv .venv

# Activate the virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate
```

### 3. Install Dependencies
Install the required third-party Python packages:
```bash
pip install -r requirements.txt
```

### 4. Launch the Server
Start the Flask development server:
```bash
python app.py
```
By default, the application runs on **Port 5000**. Navigate to [http://localhost:5000](http://localhost:5000) in your web browser.

---

## 📖 User Guide

### Viewing & Filtering Updates
- **Search Bar**: Start typing keywords (e.g., `Gemini`, `Studio`, `SQL`) to search through content text, update types, and dates.
- **Type Dropdown**: Filter cards to show only a single category, such as `Features` or `Issues`.
- **Sort Order**: Toggle chronological sorting between `Newest First` and `Oldest First`.

### Syncing Fresh Data
- Look at the header badge:
  - `Live data (Refreshed at HH:MM)` indicates a fresh fetch from Google.
  - `Cached (As of HH:MM)` indicates data served from memory cache.
- Click **Refresh** at any time to force a sync from Google. The button icon will spin during the fetch.

### Tweeting Updates
1. **Choose an update**: Either click the direct Tweet button (bird icon) on a single card, or toggle the selection checkboxes on multiple cards.
2. **Review in Modal**: If multi-selecting, the floating blue action bar at the top right displays the selected count. Click "Tweet Selected" to open the composer.
3. **Edit & Share**: Review the pre-populated text in the editor, inspect the live preview card, and click **Tweet on X** to open the Twitter Web Intent window.
