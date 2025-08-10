// Reels Analyzer Popup Script

class PopupManager {
  constructor() {
    this.elements = {};
    this.init();
  }

  async init() {
    // Cache DOM elements
    this.cacheElements();
    
    // Load current state
    await this.loadState();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check license status
    await this.checkLicenseStatus();
    
    // Load recent accounts
    await this.loadRecentAccounts();
  }

  cacheElements() {
    this.elements = {
      // License elements
      freeUsage: document.getElementById('freeUsage'),
      proBadge: document.getElementById('proBadge'),
      freeUsesRemaining: document.getElementById('freeUsesRemaining'),
      upgradeBtn: document.getElementById('upgradeBtn'),
      loginBtn: document.getElementById('loginBtn'),
      refreshBtn: document.getElementById('refreshBtn'),
      
      // Recent accounts
      recentAccounts: document.getElementById('recentAccounts'),
      
      // Settings
      defaultSpeed: document.getElementById('defaultSpeed'),
      filterRange: document.getElementById('filterRange'),
      
      // Modal
      infoModal: document.getElementById('infoModal'),
      payBtn: document.getElementById('payBtn'),
      loginModalBtn: document.getElementById('loginModalBtn'),
      closeModalBtn: document.getElementById('closeModalBtn'),
      
      // Links
      supportLink: document.getElementById('supportLink'),
      privacyLink: document.getElementById('privacyLink')
    };
  }

  async loadState() {
    // Load preferences
    const result = await chrome.storage.local.get(['preferences']);
    const preferences = result.preferences || {
      defaultSpeed: 1,
      filterRange: 'all'
    };
    
    this.elements.defaultSpeed.value = preferences.defaultSpeed;
    this.elements.filterRange.value = preferences.filterRange;
  }

  setupEventListeners() {
    // Settings changes
    this.elements.defaultSpeed.addEventListener('change', () => this.saveSettings());
    this.elements.filterRange.addEventListener('change', () => this.saveSettings());
    
    // ExtensionPay buttons
    this.elements.upgradeBtn.addEventListener('click', () => this.showInfoModal());
    this.elements.loginBtn.addEventListener('click', () => this.openLoginPage());
    this.elements.refreshBtn.addEventListener('click', () => this.refreshUserStatus());
    this.elements.payBtn.addEventListener('click', () => this.openPaymentPage());
    this.elements.loginModalBtn.addEventListener('click', () => this.openLoginPage());
    this.elements.closeModalBtn.addEventListener('click', () => this.hideInfoModal());
    
    // Links
    this.elements.supportLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://support.reelsanalyzer.com' });
    });
    
    this.elements.privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://reelsanalyzer.com/privacy' });
    });
    
    // Remove purchase link listener as it's handled by ExtensionPay
    
    // Close modal on background click
    this.elements.infoModal.addEventListener('click', (e) => {
      if (e.target === this.elements.infoModal) {
        this.hideInfoModal();
      }
    });
  }

  async checkLicenseStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkLicense' });
      
      if (response.licensed) {
        this.elements.freeUsage.style.display = 'none';
        this.elements.proBadge.style.display = 'flex';
        this.showSuccessMessage('✨ Pro features active!');
      } else {
        this.elements.freeUsage.style.display = 'block';
        this.elements.proBadge.style.display = 'none';
        this.elements.freeUsesRemaining.textContent = response.freeUsageRemaining;
      }
    } catch (error) {
      console.error('Failed to check license status:', error);
      this.showErrorMessage('Failed to check payment status');
    }
  }

  async loadRecentAccounts() {
    const response = await chrome.runtime.sendMessage({ action: 'getRecentAccounts' });
    const accounts = response.accounts || [];
    
    if (accounts.length === 0) {
      this.elements.recentAccounts.innerHTML = '<p class="empty-state">No recent accounts yet</p>';
      return;
    }
    
    this.elements.recentAccounts.innerHTML = accounts.map(account => `
      <div class="account-item" data-username="${account.username}">
        <img class="account-avatar" src="${account.avatar || 'icons/default-avatar.png'}" alt="${account.username}">
        <div class="account-info">
          <div class="account-username">@${account.username}</div>
          <div class="account-time">${this.formatTime(account.timestamp)}</div>
        </div>
      </div>
    `).join('');
    
    // Add click handlers
    this.elements.recentAccounts.querySelectorAll('.account-item').forEach(item => {
      item.addEventListener('click', () => {
        const username = item.dataset.username;
        chrome.tabs.create({ url: `https://www.instagram.com/${username}/reels/` });
      });
    });
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  async saveSettings() {
    const preferences = {
      defaultSpeed: parseFloat(this.elements.defaultSpeed.value),
      filterRange: this.elements.filterRange.value
    };
    
    await chrome.storage.local.set({ preferences });
    
    // Notify content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('instagram.com')) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updatePreferences',
        preferences
      });
    }
  }

  showInfoModal() {
    this.elements.infoModal.style.display = 'flex';
  }

  hideInfoModal() {
    this.elements.infoModal.style.display = 'none';
  }

  async openPaymentPage() {
    try {
      await chrome.runtime.sendMessage({ action: 'openPaymentPage' });
      this.hideInfoModal();
      this.showInfoMessage('Payment page opened in new tab');
    } catch (error) {
      console.error('Failed to open payment page:', error);
      this.showErrorMessage('Failed to open payment page');
    }
  }

  async openLoginPage() {
    try {
      await chrome.runtime.sendMessage({ action: 'openLoginPage' });
      this.hideInfoModal();
      this.showInfoMessage('Login page opened in new tab');
    } catch (error) {
      console.error('Failed to open login page:', error);
      this.showErrorMessage('Failed to open login page');
    }
  }

  async refreshUserStatus() {
    try {
      this.elements.refreshBtn.disabled = true;
      this.elements.refreshBtn.textContent = '🔄 Refreshing...';
      
      await chrome.runtime.sendMessage({ action: 'refreshUser' });
      await this.checkLicenseStatus();
      
      this.showSuccessMessage('Payment status refreshed!');
    } catch (error) {
      console.error('Failed to refresh user status:', error);
      this.showErrorMessage('Failed to refresh status');
    } finally {
      this.elements.refreshBtn.disabled = false;
      this.elements.refreshBtn.textContent = '🔄 Refresh Status';
    }
  }

  showSuccessMessage(message) {
    this.showNotification(message, '#4caf50');
  }

  showErrorMessage(message) {
    this.showNotification(message, '#f44336');
  }

  showInfoMessage(message) {
    this.showNotification(message, '#2196f3');
  }

  showNotification(message, color) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${color};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 2000;
      animation: slideDown 0.3s ease;
      max-width: 300px;
      text-align: center;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    to {
      transform: translateX(-50%) translateY(-100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize popup
const popupManager = new PopupManager();