# BigQuery Release Notes Hub

A modern, responsive, and feature-rich web application built with **Python Flask** and **Vanilla HTML, JavaScript, and CSS** to fetch, parse, search, filter, and share Google Cloud BigQuery Release Notes.

## Key Features

- **Dynamic parsing**: Automatically splits Google Cloud's consolidated daily release notes RSS feed into individual updates by type (`Feature`, `Change`, `Issue`, `Announcement`, `Breaking`).
- **Rich Dark Theme**: Beautiful glassmorphic UI using a dark color palette, glowing background gradients, modern typography (Outfit & Inter fonts), hover micro-animations, and styled elements.
- **Search & Filter**: Real-time client-side search across update text, categories, or dates. Quick category filters for specific update types.
- **Auto-Caching & Refresh**: Serves cached data instantly to prevent rate limits or load delays, with a manual **Refresh** button that rotates a spinner and pulls fresh live feed data on demand.
- **X (Twitter) Integration**:
  - Direct Tweet button on individual release cards.
  - Multi-select capability to select multiple cards and share a combined summary.
  - Beautiful custom **Tweet Composer Modal** featuring character count tracking, an interactive visual circle progress bar (up to 280 characters), and a live simulated preview.
  - One-click redirection to X Web Intent with encoded text.

## Project Structure

```
bq-releases-notes/
├── .venv/                  # Python Virtual Environment
├── app.py                  # Flask backend server & RSS feed parser
├── requirements.txt        # Python dependencies (Flask, requests, feedparser, bs4)
├── templates/
│   └── index.html          # HTML structure, skeleton loader, and modal
└── static/
    ├── css/
    │   └── style.css       # Core styling & glassmorphism variables
    └── js/
        └── main.js         # State controller, filters, and Tweet composer
```

## Running the Application

To run the application locally, execute the following commands in the project directory:

1. **Activate the Virtual Environment**:
   ```bash
   source .venv/bin/activate
   ```

2. **Run the Server**:
   ```bash
   python app.py
   ```

3. **Open the browser**:
   Navigate to [http://localhost:5000](http://localhost:5000)

## Implementation Details

- **Backend (`app.py`)**: Fetches the public RSS feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) with requests (10s timeout), parses it with `feedparser`, and decomposes HTML content using `BeautifulSoup` by grouping nodes inside daily entries by `<h3>` headings. Stores parsed results in an in-memory cache for 10 minutes.
- **Frontend CSS (`static/css/style.css`)**: Utilizes modern CSS variables (`:root`) for color themes, a full-page blur gradient (`.bg-glow`), responsive flex/grid layouts, card animations (`@keyframes slideIn`), and a circular SVG loading indicator.
- **Frontend JS (`static/js/main.js`)**: Coordinates state filters, performs local string matching for search queries, handles checked states for multi-selection, implements character validation, and constructs Twitter Web Intents.
