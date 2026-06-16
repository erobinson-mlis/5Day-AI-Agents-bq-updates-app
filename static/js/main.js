// State Management
let state = {
    updates: [],
    selectedIds: new Set(),
    filters: {
        search: '',
        type: 'all',
        sort: 'newest'
    }
};

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const typeFilter = document.getElementById('type-filter');
const sortOrder = document.getElementById('sort-order');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const cacheStatus = document.getElementById('cache-status');
const visibleCount = document.getElementById('visible-count');
const totalCount = document.getElementById('total-count');

// Multi-select actions bar
const multiSelectActions = document.getElementById('multi-select-actions');
const selectedCount = document.getElementById('selected-count');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const tweetSelectedBtn = document.getElementById('tweet-selected-btn');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetText = document.getElementById('tweet-text');
const charProgress = document.getElementById('char-progress');
const charCount = document.getElementById('char-count');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const closeModalBtn = document.getElementById('close-modal');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const publishTweetBtn = document.getElementById('publish-tweet-btn');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMastodonInstance();
    fetchReleases();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Refresh action
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search inputs
    searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = state.filters.search ? 'flex' : 'none';
        renderFilteredUpdates();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.filters.search = '';
        clearSearchBtn.style.display = 'none';
        renderFilteredUpdates();
        searchInput.focus();
    });
    
    // Filters
    typeFilter.addEventListener('change', (e) => {
        state.filters.type = e.target.value;
        renderFilteredUpdates();
    });
    
    sortOrder.addEventListener('change', (e) => {
        state.filters.sort = e.target.value;
        renderFilteredUpdates();
    });
    
    // Multi-select clear
    clearSelectionBtn.addEventListener('click', clearSelection);
    
    // Tweet selected button
    tweetSelectedBtn.addEventListener('click', () => {
        const selectedUpdates = state.updates.filter(u => state.selectedIds.has(u.id));
        openTweetComposer(selectedUpdates);
    });
    
    // Tweet Modal actions
    closeModalBtn.addEventListener('click', closeTweetComposer);
    cancelTweetBtn.addEventListener('click', closeTweetComposer);
    publishTweetBtn.addEventListener('click', publishTweet);
    tweetText.addEventListener('input', handleTweetTextInput);
    
    // Export CSV action
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
    
    // Theme Toggle action
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Mastodon Instance URL input handler
    const instanceInput = document.getElementById('mastodon-instance');
    if (instanceInput) {
        instanceInput.addEventListener('input', (e) => {
            let value = e.target.value.trim().toLowerCase();
            value = value.replace(/^(https?:\/\/)/, '').replace(/\/+$/, '');
            localStorage.setItem('mastodon_instance', value);
            updateSimulatedHandle(value);
        });
    }
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    showLoading();
    refreshIcon.classList.add('active');
    
    try {
        const response = await fetch(`/api/releases?refresh=${forceRefresh}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            state.updates = data.updates;
            
            // Clear selections when data is reloaded
            clearSelection();
            
            // Set status label
            updateCacheBadge(data.source, data.updated_at);
            
            // Render
            renderFilteredUpdates();
        } else {
            showError(data.message || 'Failed to fetch releases');
        }
    } catch (error) {
        showError('Network error while fetching release notes');
        console.error(error);
    } finally {
        refreshIcon.classList.remove('active');
    }
}

// Update Cache Status indicator badge
function updateCacheBadge(source, timestamp) {
    cacheStatus.className = 'status-badge';
    
    const date = new Date(timestamp * 1000);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (source === 'fresh') {
        cacheStatus.classList.add('fresh');
        cacheStatus.textContent = `Live data (Refreshed at ${timeStr})`;
    } else if (source === 'cached') {
        cacheStatus.classList.add('cached');
        cacheStatus.textContent = `Cached (As of ${timeStr})`;
    } else {
        cacheStatus.textContent = `Stale fallback (Offline)`;
    }
}

// Show skeleton loading items
function showLoading() {
    feedContainer.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton-header">
                <div class="skeleton-badge"></div>
                <div class="skeleton-date"></div>
            </div>
            <div class="skeleton-body">
                <div class="skeleton-line w-full"></div>
                <div class="skeleton-line w-3-4"></div>
                <div class="skeleton-line w-1-2"></div>
            </div>
        `;
        feedContainer.appendChild(skeleton);
    }
}

// Show error message state
function showError(message) {
    feedContainer.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ef4444" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>Unable to load release notes</h3>
            <p>${message}</p>
            <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="fetchReleases(true)">Try Again</button>
        </div>
    `;
    cacheStatus.className = 'status-badge';
    cacheStatus.textContent = 'Error';
    totalCount.textContent = '0';
    visibleCount.textContent = '0';
}

// Client Side Filter & Render
// Filter helper
function getFilteredUpdates() {
    let filtered = [...state.updates];
    
    // Apply search filter
    if (state.filters.search) {
        filtered = filtered.filter(u => 
            u.content_text.toLowerCase().includes(state.filters.search) ||
            u.type.toLowerCase().includes(state.filters.search) ||
            u.date.toLowerCase().includes(state.filters.search)
        );
    }
    
    // Apply type filter
    if (state.filters.type !== 'all') {
        filtered = filtered.filter(u => u.type.toLowerCase() === state.filters.type);
    }
    
    // Apply sort order
    if (state.filters.sort === 'oldest') {
        filtered.reverse();
    }
    
    return filtered;
}

// Client Side Filter & Render
function renderFilteredUpdates() {
    const filtered = getFilteredUpdates();
    
    // Update stats count labels
    totalCount.textContent = state.updates.length;
    visibleCount.textContent = filtered.length;
    
    if (filtered.length === 0) {
        renderEmptyState();
        return;
    }
    
    feedContainer.innerHTML = '';
    filtered.forEach(u => {
        const card = createCardElement(u);
        feedContainer.appendChild(card);
    });
}

function renderEmptyState() {
    feedContainer.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <h3>No updates found</h3>
            <p>Try adjusting your search criteria or changing the category filter.</p>
        </div>
    `;
}

// Generate single Release Card
function createCardElement(update) {
    const card = document.createElement('div');
    card.className = `release-card${state.selectedIds.has(update.id) ? ' selected' : ''}`;
    card.dataset.id = update.id;
    
    // Parse classes based on categories
    const badgeClass = update.type.toLowerCase();
    
    card.innerHTML = `
        <!-- Custom Checkbox Selection Overlay -->
        <div class="card-select-overlay">
            <div class="custom-checkbox">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        </div>

        <div class="card-header">
            <div class="card-meta">
                <span class="type-badge ${badgeClass}">${update.type}</span>
                <span class="card-date">${update.date}</span>
            </div>
            
            <div class="card-actions">
                <button class="btn-card-copy" title="Copy text to clipboard" data-copy-id="${update.id}">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="copy-icon">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="check-icon" style="display: none;">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
                <button class="btn-card-share" title="Share on Mastodon" data-tweet-id="${update.id}">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                        <path d="M21.327 10.13c0-4.795-3.078-6.196-3.078-6.196C16.828 3.2 14.153 3 11.968 3c-2.185 0-4.86.2-6.28 1.071 0 0-3.079 1.4-3.079 6.196 0 .506-.007 1.1-.007 1.764 0 5.485.405 10.923 5.39 12.015 2.196.48 4.316.587 6.136.506 3.195-.143 5.022-1.3 5.022-1.3l-.11-2.126s-2.022.617-5.022.506c-2.93-.109-6.027-.375-6.422-3.957-.044-.396-.048-.772-.048-.772s2.836.685 6.422.81c1.833.064 3.58-.195 5.3-.475 3.39-.554 6.388-3.056 6.388-7.79 0-.663-.007-1.258-.007-1.764zm-3.666 5.236h-2.072v-5.263c0-1.077-.456-1.62-1.362-1.62-.998 0-1.498.647-1.498 1.928v2.879H10.63v-2.88c0-1.28-.5-1.928-1.497-1.928-.908 0-1.364.543-1.364 1.62v5.263H5.698V9.734c0-1.077.275-1.94.825-2.585.568-.663 1.3-.997 2.222-.997.97 0 1.7.37 2.176 1.109l.635 1.062.636-1.062c.473-.74 1.206-1.11 2.175-1.11.92 0 1.654.334 2.223.998.55.645.825 1.508.825 2.585v5.636z"></path>
                    </svg>
                </button>
            </div>
        </div>
        
        <div class="card-body">
            ${update.content_html}
        </div>
        
        <div class="card-footer">
            <a href="${update.link}" target="_blank" rel="noopener" class="official-link">
                <span>View Release Notes</span>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
            </a>
        </div>
    `;
    
    // Bind selection event (clicking anywhere except interactive links, buttons, action groups or selection overlay)
    card.addEventListener('click', (e) => {
        // Skip toggle if user clicked on standard links, buttons or action bars inside the card
        if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.card-actions')) {
            return;
        }
        toggleCardSelection(update.id);
    });
    
    // Bind check button overlay specifically
    const selectOverlay = card.querySelector('.card-select-overlay');
    selectOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCardSelection(update.id);
    });
    
    // Bind Copy button specifically
    const copyBtn = card.querySelector('.btn-card-copy');
    copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // Build the text to copy
        const copyText = `Google Cloud BigQuery Update (${update.date}) [${update.type.toUpperCase()}]:\n\n${update.content_text}\n\nRead more: ${update.link}`;
        
        try {
            await navigator.clipboard.writeText(copyText);
            
            // Visual success state
            copyBtn.classList.add('copied');
            const copyIcon = copyBtn.querySelector('.copy-icon');
            const checkIcon = copyBtn.querySelector('.check-icon');
            
            copyIcon.style.display = 'none';
            checkIcon.style.display = 'block';
            copyBtn.title = 'Copied!';
            
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyIcon.style.display = 'block';
                checkIcon.style.display = 'none';
                copyBtn.title = 'Copy text to clipboard';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard.');
        }
    });

    // Bind Share button specifically
    const shareBtn = card.querySelector('.btn-card-share');
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTweetComposer([update]);
    });
    
    return card;
}

// Manage multi-select state
function toggleCardSelection(id) {
    if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
    } else {
        state.selectedIds.add(id);
    }
    
    // Re-render visual class of this specific card
    const cardEl = document.querySelector(`.release-card[data-id="${id}"]`);
    if (cardEl) {
        cardEl.classList.toggle('selected', state.selectedIds.has(id));
    }
    
    // Update Multi-select Toolbar
    updateMultiSelectToolbar();
}

function clearSelection() {
    state.selectedIds.clear();
    document.querySelectorAll('.release-card.selected').forEach(el => {
        el.classList.remove('selected');
    });
    updateMultiSelectToolbar();
}

function updateMultiSelectToolbar() {
    const count = state.selectedIds.size;
    if (count > 0) {
        selectedCount.textContent = count;
        multiSelectActions.style.display = 'flex';
    } else {
        multiSelectActions.style.display = 'none';
    }
}

// Generate the Tweet contents smartly based on selections and length constraints
function generateTweetText(updates) {
    if (updates.length === 1) {
        const u = updates[0];
        // Header prefix
        const prefix = `📢 Google Cloud #BigQuery Update:\n\n`;
        // Link suffix
        const suffix = `\n\nRead more: ${u.link}`;
        
        // Type prefix
        const typePrefix = `[${u.type.toUpperCase()}] `;
        
        // Allowed content length = 280 - prefix.length - typePrefix.length - suffix.length
        const maxContentLength = Math.max(0, 280 - prefix.length - typePrefix.length - suffix.length);
        
        // Clean text description of the release note
        let content = u.content_text.replace(/\s+/g, ' ');
        if (content.length > maxContentLength) {
            if (maxContentLength > 3) {
                content = content.substring(0, maxContentLength - 3) + '...';
            } else {
                content = content.substring(0, maxContentLength);
            }
        }
        
        return `${prefix}${typePrefix}${content}${suffix}`;
    } else {
        // Multi-tweet generation
        const header = `📢 Google Cloud #BigQuery Updates:\n`;
        let body = '';
        
        // Get the link (usually the same page, or take the first one)
        const commonLink = updates[0].link;
        const suffix = `\nRead more: ${commonLink}`;
        
        // Sort selected updates by date
        const sorted = [...updates].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Build items
        for (let i = 0; i < sorted.length; i++) {
            const u = sorted[i];
            const itemLine = `\n• [${u.type}] ${u.content_text.replace(/\s+/g, ' ')}`;
            
            // Check if adding this exceeds 280 limit (with header + itemLine + suffix)
            const projectedLength = header.length + body.length + itemLine.length + suffix.length;
            
            if (projectedLength <= 280) {
                body += itemLine;
            } else {
                // If it exceeds, see if we can fit a truncated version of this last item or break
                const remainingSpace = 280 - (header.length + body.length + suffix.length + 15); // extra margin
                if (remainingSpace > 30) {
                    const truncatedItem = itemLine.substring(0, remainingSpace) + '...';
                    body += truncatedItem;
                } else {
                    body += `\n• And ${sorted.length - i} more updates...`;
                }
                break;
            }
        }
        
        return `${header}${body}${suffix}`;
    }
}

// Tweet Modal Handlers
function openTweetComposer(updates) {
    if (!updates || updates.length === 0) return;
    
    // Generate text
    const text = generateTweetText(updates);
    tweetText.value = text;
    
    // Update count/preview
    updateTweetComposerStats();
    
    // Show Modal
    tweetModal.classList.add('active');
    
    // Focus textarea
    setTimeout(() => {
        tweetText.focus();
        tweetText.setSelectionRange(tweetText.value.length, tweetText.value.length);
    }, 100);
}

function closeTweetComposer() {
    tweetModal.classList.remove('active');
}

function handleTweetTextInput() {
    updateTweetComposerStats();
}

function updateTweetComposerStats() {
    const text = tweetText.value;
    const len = text.length;
    const remaining = 280 - len;
    
    charCount.textContent = remaining;
    tweetPreviewText.textContent = text || 'Preview text will appear here...';
    
    // Circle progress calculation (circumference is 56.54)
    const circumference = 56.54;
    const percentage = Math.min(len / 280, 1);
    const offset = circumference - (percentage * circumference);
    charProgress.style.strokeDashoffset = offset;
    
    // Style adjustments for character limit alerts
    if (remaining < 0) {
        charCount.style.color = '#ef4444';
        charProgress.style.stroke = '#ef4444';
        publishTweetBtn.disabled = true;
        publishTweetBtn.style.opacity = 0.5;
        publishTweetBtn.style.cursor = 'not-allowed';
    } else if (remaining <= 20) {
        charCount.style.color = '#f59e0b';
        charProgress.style.stroke = '#f59e0b';
        publishTweetBtn.disabled = false;
        publishTweetBtn.style.opacity = 1;
        publishTweetBtn.style.cursor = 'pointer';
    } else {
        charCount.style.color = 'var(--text-muted)';
        charProgress.style.stroke = '#10b981';
        publishTweetBtn.disabled = false;
        publishTweetBtn.style.opacity = 1;
        publishTweetBtn.style.cursor = 'pointer';
    }
}

function publishTweet() {
    const text = tweetText.value;
    if (text.length > 280) {
        alert('Share text exceeds the 280-character limit!');
        return;
    }
    
    const instanceInput = document.getElementById('mastodon-instance');
    let instance = instanceInput ? instanceInput.value.trim().toLowerCase() : 'mastodon.social';
    instance = instance.replace(/^(https?:\/\/)/, '').replace(/\/+$/, '');
    if (!instance) {
        alert('Please specify a Mastodon instance!');
        return;
    }
    
    const url = `https://${instance}/share?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    closeTweetComposer();
}

// Export CSV handler
function exportToCSV() {
    if (state.updates.length === 0) {
        alert('No data available to export.');
        return;
    }
    
    const filtered = getFilteredUpdates();
    if (filtered.length === 0) {
        alert('No matching updates found to export.');
        return;
    }
    
    // Prepare header and rows
    const headers = ["Date", "Update Type", "Official Link", "Details"];
    const rows = filtered.map(u => [
        u.date,
        u.type,
        u.link,
        u.content_text
    ]);
    
    // Format cell value: double quotes are escaped by doubling them
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const strVal = String(val);
        const escaped = strVal.replace(/"/g, '""');
        return `"${escaped}"`;
    };
    
    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\r\n');
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_releases_${today}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Mastodon instance initialization
function initMastodonInstance() {
    const instanceInput = document.getElementById('mastodon-instance');
    const savedInstance = localStorage.getItem('mastodon_instance') || 'mastodon.social';
    if (instanceInput) {
        instanceInput.value = savedInstance;
    }
    updateSimulatedHandle(savedInstance);
}

function updateSimulatedHandle(instance) {
    const simulatedHandle = document.getElementById('simulated-handle');
    if (simulatedHandle) {
        simulatedHandle.textContent = `@cloud_notes@${instance || 'mastodon.social'}`;
    }
}

// Theme management functions
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        updateThemeToggleIcon('light');
    } else {
        document.body.classList.remove('light-theme');
        updateThemeToggleIcon('dark');
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    const theme = isLight ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    updateThemeToggleIcon(theme);
}

function updateThemeToggleIcon(theme) {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;
    const sunIcon = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');
    
    if (theme === 'light') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}
