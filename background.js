// Instagram Reels Analyzer - Background Script
// Handles extension lifecycle and ExtensionPay integration

// Import ExtPay library
importScripts('extpay.js');

// Initialize ExtPay
const extpay = ExtPay('simplysort');
extpay.startBackground();

class BackgroundService {
  constructor() {
    this.user = null;
    this.freeUsageCount = 0;
    this.lastResetDate = null;
    this.init();
  }

  async init() {
    // Initialize storage
    await this.initializeStorage();
    
    // Set up ExtensionPay user checking
    this.checkUser();
    
    // Listen for installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
    
    // Daily reset of free usage
    this.setupDailyReset();
  }

  async initializeStorage() {
    const storage = await chrome.storage.local.get(null);
    
    if (!storage.preferences) {
      await chrome.storage.local.set({
        preferences: {
          defaultSpeed: 1,
          filterRange: 'all'
        }
      });
    }
    
    if (!storage.recentAccounts) {
      await chrome.storage.local.set({
        recentAccounts: []
      });
    }
    
    if (!storage.cache) {
      await chrome.storage.local.set({
        cache: {
          followerCounts: {}
        }
      });
    }
    
    // Initialize free usage tracking
    const today = new Date().toDateString();
    if (storage.lastResetDate !== today) {
      await chrome.storage.local.set({
        freeUsageCount: 0,
        lastResetDate: today
      });
      this.freeUsageCount = 0;
      this.lastResetDate = today;
    } else {
      this.freeUsageCount = storage.freeUsageCount || 0;
      this.lastResetDate = storage.lastResetDate;
    }
  }

  async checkUser() {
    try {
      this.user = await extpay.getUser();
    } catch (error) {
      console.error('Failed to get ExtensionPay user:', error);
      this.user = { paid: false };
    }
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      // Open welcome page
      chrome.tabs.create({
        url: 'welcome.html'
      });
      
      // Track installation
      this.trackEvent('install', { version: chrome.runtime.getManifest().version });
    } else if (details.reason === 'update') {
      // Track update
      this.trackEvent('update', { 
        previousVersion: details.previousVersion,
        version: chrome.runtime.getManifest().version 
      });
    }
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'checkLicense':
        await this.checkUser();
        const canUse = await this.canUseFreeFeature();
        sendResponse({ 
          licensed: this.user && this.user.paid,
          canUseFree: canUse,
          freeUsageRemaining: Math.max(0, 3 - this.freeUsageCount),
          user: this.user
        });
        break;
        
      case 'recordUsage':
        if (!this.user || !this.user.paid) {
          this.freeUsageCount++;
          await chrome.storage.local.set({ 
            freeUsageCount: this.freeUsageCount 
          });
        }
        sendResponse({ success: true });
        break;
        
      case 'openPaymentPage':
        extpay.openPaymentPage();
        sendResponse({ success: true });
        break;
        
      case 'openLoginPage':
        extpay.openLoginPage();
        sendResponse({ success: true });
        break;
        
      case 'refreshUser':
        await this.checkUser();
        sendResponse({ user: this.user });
        break;
        
      case 'addRecentAccount':
        await this.addRecentAccount(request.account);
        sendResponse({ success: true });
        break;
        
      case 'getRecentAccounts':
        const accounts = await this.getRecentAccounts();
        sendResponse({ accounts });
        break;
    }
  }

  async canUseFreeFeature() {
    if (this.user && this.user.paid) return true;
    
    // Check if it's a new day
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.freeUsageCount = 0;
      this.lastResetDate = today;
      await chrome.storage.local.set({
        freeUsageCount: 0,
        lastResetDate: today
      });
    }
    
    return this.freeUsageCount < 3;
  }

  // ExtensionPay handles activation automatically
  // No need for manual license activation

  async addRecentAccount(account) {
    const storage = await chrome.storage.local.get(['recentAccounts']);
    let accounts = storage.recentAccounts || [];
    
    // Remove if already exists
    accounts = accounts.filter(a => a.username !== account.username);
    
    // Add to beginning
    accounts.unshift({
      ...account,
      timestamp: Date.now()
    });
    
    // Keep only last 5
    accounts = accounts.slice(0, 5);
    
    await chrome.storage.local.set({ recentAccounts: accounts });
  }

  async getRecentAccounts() {
    const storage = await chrome.storage.local.get(['recentAccounts']);
    return storage.recentAccounts || [];
  }

  setupDailyReset() {
    // Check every hour if it's a new day
    setInterval(async () => {
      const today = new Date().toDateString();
      if (this.lastResetDate !== today) {
        this.freeUsageCount = 0;
        this.lastResetDate = today;
        await chrome.storage.local.set({
          freeUsageCount: 0,
          lastResetDate: today
        });
      }
    }, 3600000); // 1 hour
  }

  trackEvent(event, data) {
    // Simple event tracking for analytics
    // In production, this would send to analytics service
    console.log('Track event:', event, data);
  }
}

// Initialize background service
const backgroundService = new BackgroundService();