// Instagram Reels Analyzer - Content Script
// Core functionality for analyzing Instagram Reels performance

class ReelsAnalyzer {
  constructor() {
    this.observer = null;
    this.followerCount = null;
    this.reelsData = new Map();
    this.preferences = {};
    this.init();
  }

  async init() {
    // Load preferences from storage
    await this.loadPreferences();
    
    // Start observing DOM changes
    this.startObserver();
    
    // Parse initial page content
    this.analyzePage();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sendResponse);
      return true;
    });
  }

  async loadPreferences() {
    const result = await chrome.storage.local.get(['preferences']);
    this.preferences = result.preferences || {
      defaultSpeed: 1,
      filterRange: 'all'
    };
  }

  startObserver() {
    this.observer = new MutationObserver(() => {
      this.analyzePage();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  analyzePage() {
    const path = window.location.pathname;
    
    if (path.includes('/reel/')) {
      // Individual reel page
      this.analyzeIndividualReel();
    } else if (path.includes('/reels/')) {
      // Reels feed page
      this.analyzeReelsFeed();
    } else {
      // Profile page - try to get follower count
      this.parseFollowerCount();
    }
  }

  parseFollowerCount() {
    // Try multiple selectors as Instagram changes them frequently
    const selectors = [
      'a[href*="/followers/"] span',
      'span:contains("followers")',
      '[title*="followers"]'
    ];

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          const count = this.parseCount(text);
          if (count > 0) {
            this.followerCount = count;
            // Cache follower count
            const username = this.getCurrentUsername();
            if (username) {
              this.cacheFollowerCount(username, count);
            }
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
  }

  getCurrentUsername() {
    const pathMatch = window.location.pathname.match(/^\/([^\/]+)/);
    return pathMatch ? pathMatch[1] : null;
  }

  async cacheFollowerCount(username, count) {
    const cache = await chrome.storage.local.get(['cache']);
    const followerCounts = cache.cache?.followerCounts || {};
    followerCounts[username] = count;
    await chrome.storage.local.set({
      cache: { ...cache.cache, followerCounts }
    });
  }

  parseCount(text) {
    // Convert "1.2M" to 1200000, "15.3K" to 15300, etc.
    const match = text.match(/([\d.]+)([KMB]?)/i);
    if (!match) return 0;
    
    let num = parseFloat(match[1]);
    const suffix = match[2].toUpperCase();
    
    switch (suffix) {
      case 'K': return num * 1000;
      case 'M': return num * 1000000;
      case 'B': return num * 1000000000;
      default: return num;
    }
  }

  analyzeReelsFeed() {
    // Find all reel cards on the page
    const reelCards = document.querySelectorAll('article[role="presentation"]');
    
    reelCards.forEach(card => {
      this.enhanceReelCard(card);
    });

    // Add sorting and filtering controls if not present
    if (!document.querySelector('.reels-analyzer-controls')) {
      this.addControls();
    }
  }

  enhanceReelCard(card) {
    // Skip if already enhanced
    if (card.querySelector('.reels-analyzer-badge')) return;

    try {
      // Extract view count
      const viewElement = card.querySelector('span:contains("views"), span:contains("plays")');
      if (!viewElement) return;

      const viewCount = this.parseCount(viewElement.textContent);
      if (!viewCount) return;

      // Get or estimate follower count
      const followerCount = this.followerCount || this.estimateFollowerCount();
      
      // Calculate reach rate
      const reachRate = (viewCount / followerCount * 100).toFixed(1);
      
      // Create badge
      const badge = this.createReachBadge(reachRate);
      
      // Add badge to card
      const container = card.querySelector('div[role="button"]') || card;
      container.style.position = 'relative';
      container.appendChild(badge);

      // Add speed controls
      this.addSpeedControls(card);

      // Store data
      const reelId = this.getReelId(card);
      if (reelId) {
        this.reelsData.set(reelId, {
          viewCount,
          reachRate: parseFloat(reachRate),
          element: card
        });
      }
    } catch (e) {
      console.error('Error enhancing reel card:', e);
    }
  }

  createReachBadge(reachRate) {
    const badge = document.createElement('div');
    badge.className = 'reels-analyzer-badge';
    
    let emoji, className;
    if (reachRate >= 500) {
      emoji = '🚀';
      className = 'super-viral';
    } else if (reachRate >= 200) {
      emoji = '🔥';
      className = 'hot';
    } else if (reachRate >= 100) {
      emoji = '⭐';
      className = 'good';
    } else {
      emoji = '📊';
      className = 'average';
    }
    
    badge.innerHTML = `${emoji} ${reachRate}%`;
    badge.classList.add(className);
    
    return badge;
  }

  addSpeedControls(card) {
    const video = card.querySelector('video');
    if (!video || card.querySelector('.reels-analyzer-speed')) return;

    const speedControl = document.createElement('div');
    speedControl.className = 'reels-analyzer-speed';
    
    const speeds = [1, 2, 3];
    speeds.forEach(speed => {
      const btn = document.createElement('button');
      btn.className = 'speed-btn';
      btn.textContent = `${speed}x`;
      btn.onclick = (e) => {
        e.stopPropagation();
        video.playbackRate = speed;
        // Update active state
        speedControl.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
      if (speed === 1) btn.classList.add('active');
      speedControl.appendChild(btn);
    });

    const container = card.querySelector('div[role="button"]') || card;
    container.appendChild(speedControl);
  }

  addControls() {
    const controls = document.createElement('div');
    controls.className = 'reels-analyzer-controls';
    
    // Sort button
    const sortBtn = document.createElement('button');
    sortBtn.className = 'control-btn';
    sortBtn.innerHTML = '🚀 Sort by Reach';
    sortBtn.onclick = () => this.sortByReachRate();
    
    // Filter dropdown
    const filterSelect = document.createElement('select');
    filterSelect.className = 'control-select';
    filterSelect.innerHTML = `
      <option value="all">📊 All Views</option>
      <option value="1k-10k">1K-10K (Micro)</option>
      <option value="10k-100k">10K-100K (Mid)</option>
      <option value="100k-1m">100K-1M (Mega)</option>
      <option value="1m+">1M+ (Super)</option>
    `;
    filterSelect.onchange = (e) => this.filterByViews(e.target.value);
    
    controls.appendChild(sortBtn);
    controls.appendChild(filterSelect);
    
    // Insert at the top of the feed
    const feed = document.querySelector('main') || document.body;
    feed.insertBefore(controls, feed.firstChild);
  }

  sortByReachRate() {
    const reelsArray = Array.from(this.reelsData.entries());
    reelsArray.sort((a, b) => b[1].reachRate - a[1].reachRate);
    
    const container = document.querySelector('main');
    reelsArray.forEach(([id, data]) => {
      container.appendChild(data.element);
    });
  }

  filterByViews(range) {
    this.reelsData.forEach((data, id) => {
      const views = data.viewCount;
      let show = false;
      
      switch (range) {
        case 'all':
          show = true;
          break;
        case '1k-10k':
          show = views >= 1000 && views < 10000;
          break;
        case '10k-100k':
          show = views >= 10000 && views < 100000;
          break;
        case '100k-1m':
          show = views >= 100000 && views < 1000000;
          break;
        case '1m+':
          show = views >= 1000000;
          break;
      }
      
      data.element.style.display = show ? '' : 'none';
    });
  }

  analyzeIndividualReel() {
    // Enhanced analysis for individual reel page
    const metrics = this.gatherReelMetrics();
    if (!metrics) return;

    const engagementRate = ((metrics.likes + metrics.comments + metrics.shares) / metrics.views * 100).toFixed(1);
    const reachRate = (metrics.views / (this.followerCount || this.estimateFollowerCount()) * 100).toFixed(1);
    const grade = this.calculateGrade(parseFloat(reachRate), parseFloat(engagementRate));

    // Display metrics
    this.displayIndividualMetrics(reachRate, engagementRate, grade);
    
    // Add enhanced speed controls
    this.addEnhancedSpeedControls();
  }

  gatherReelMetrics() {
    // Gather all available metrics from the page
    try {
      const metrics = {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0
      };

      // Parse views
      const viewElement = document.querySelector('span:contains("views"), span:contains("plays")');
      if (viewElement) {
        metrics.views = this.parseCount(viewElement.textContent);
      }

      // Parse likes
      const likeElement = document.querySelector('button[aria-label*="like"] span');
      if (likeElement) {
        metrics.likes = this.parseCount(likeElement.textContent);
      }

      // Parse comments
      const commentElement = document.querySelector('button[aria-label*="comment"] span');
      if (commentElement) {
        metrics.comments = this.parseCount(commentElement.textContent);
      }

      return metrics;
    } catch (e) {
      console.error('Error gathering metrics:', e);
      return null;
    }
  }

  calculateGrade(reachRate, engagementRate) {
    // Performance grading system
    if (reachRate > 500 && engagementRate > 10) return 'A+';
    if ((reachRate > 500 && engagementRate > 5) || (reachRate > 200 && engagementRate > 10)) return 'A';
    if ((reachRate > 200 && engagementRate > 5) || (reachRate > 100 && engagementRate > 10)) return 'B+';
    if (reachRate > 100 || engagementRate > 5) return 'B';
    return 'C';
  }

  displayIndividualMetrics(reachRate, engagementRate, grade) {
    if (document.querySelector('.reels-analyzer-metrics')) return;

    const metricsDiv = document.createElement('div');
    metricsDiv.className = 'reels-analyzer-metrics';
    metricsDiv.innerHTML = `
      <div class="metric">🚀 Reach: ${reachRate}%</div>
      <div class="metric">💬 Engagement: ${engagementRate}%</div>
      <div class="grade">📊 Performance Grade: <span class="grade-${grade}">${grade}</span></div>
    `;

    const video = document.querySelector('video');
    if (video && video.parentElement) {
      video.parentElement.insertBefore(metricsDiv, video);
    }
  }

  addEnhancedSpeedControls() {
    const video = document.querySelector('video');
    if (!video || document.querySelector('.reels-analyzer-speed-enhanced')) return;

    const speedControl = document.createElement('div');
    speedControl.className = 'reels-analyzer-speed-enhanced';
    
    const speeds = [0.5, 1, 1.5, 2, 3, 4];
    speeds.forEach(speed => {
      const btn = document.createElement('button');
      btn.className = 'speed-btn-enhanced';
      btn.textContent = `${speed}x`;
      btn.onclick = () => {
        video.playbackRate = speed;
        speedControl.querySelectorAll('.speed-btn-enhanced').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
      if (speed === 1) btn.classList.add('active');
      speedControl.appendChild(btn);
    });

    video.parentElement.appendChild(speedControl);
  }

  estimateFollowerCount() {
    // Fallback estimation based on typical creator accounts
    return 10000; // Default estimate
  }

  getReelId(element) {
    // Extract reel ID from element or URL
    const link = element.querySelector('a[href*="/reel/"]');
    if (link) {
      const match = link.href.match(/\/reel\/([^\/]+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  handleMessage(request, sendResponse) {
    switch (request.action) {
      case 'getMetrics':
        sendResponse({ metrics: Object.fromEntries(this.reelsData) });
        break;
      case 'updatePreferences':
        this.preferences = request.preferences;
        chrome.storage.local.set({ preferences: this.preferences });
        sendResponse({ success: true });
        break;
    }
  }
}

// Initialize the analyzer
const analyzer = new ReelsAnalyzer();