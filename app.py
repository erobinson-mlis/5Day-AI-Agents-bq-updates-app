import os
import time
import requests
import feedparser
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION_SECONDS = 600  # 10 minutes

def parse_summary(summary_html, date_str, link_str):
    soup = BeautifulSoup(summary_html, 'html.parser')
    updates = []
    current_update = None
    
    # Iterate through child nodes to group elements by <h3> tags
    for element in soup.contents:
        if isinstance(element, str):
            if not element.strip():
                continue
            if current_update is None:
                current_update = {
                    'type': 'Update',
                    'date': date_str,
                    'link': link_str,
                    'content_html': '',
                    'content_text': ''
                }
            current_update['content_html'] += str(element)
            current_update['content_text'] += str(element)
        else:
            if element.name == 'h3':
                if current_update:
                    updates.append(current_update)
                current_update = {
                    'type': element.get_text().strip(),
                    'date': date_str,
                    'link': link_str,
                    'content_html': '',
                    'content_text': ''
                }
            else:
                if current_update is None:
                    current_update = {
                        'type': 'Update',
                        'date': date_str,
                        'link': link_str,
                        'content_html': '',
                        'content_text': ''
                    }
                current_update['content_html'] += str(element)
                current_update['content_text'] += element.get_text()
                
    if current_update:
        updates.append(current_update)
        
    for u in updates:
        u['content_text'] = u['content_text'].strip()
        u['content_html'] = u['content_html'].strip()
        
    return updates

def fetch_and_parse_feed(force_refresh=False):
    now = time.time()
    if not force_refresh and cache["data"] and (now - cache["last_fetched"] < CACHE_DURATION_SECONDS):
        return cache["data"], "cached"

    try:
        # Use requests to fetch with timeout to prevent hanging
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        feed = feedparser.parse(response.content)
        
        all_updates = []
        for idx, entry in enumerate(feed.entries):
            date_str = entry.get('title', 'Unknown Date')
            link_str = entry.get('link', '')
            summary_html = entry.get('summary', '')
            
            updates = parse_summary(summary_html, date_str, link_str)
            
            # Add unique ID for client-side selection
            for sub_idx, u in enumerate(updates):
                u['id'] = f"{idx}_{sub_idx}"
                all_updates.append(u)
                
        cache["data"] = all_updates
        cache["last_fetched"] = now
        return all_updates, "fresh"
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # Return cache if available even if expired, fallback to empty list
        if cache["data"]:
            return cache["data"], "stale_fallback"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, status = fetch_and_parse_feed(force_refresh=force_refresh)
        return jsonify({
            "status": "success",
            "source": status,
            "count": len(updates),
            "updated_at": cache["last_fetched"],
            "updates": updates
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Get port from environment or default to 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
