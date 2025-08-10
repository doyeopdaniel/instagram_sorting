// ExtPay.js - Official library for ExtensionPay.com
// https://github.com/Glench/ExtPay

(function(global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    global.ExtPay = factory();
  }
})(typeof window !== 'undefined' ? window : this, function() {
  'use strict';

  function ExtPay(extension_id) {
    if (!extension_id) {
      throw new Error('ExtPay extension_id is required');
    }

    const extpay = {
      extension_id: extension_id,
      api_url: 'https://api.extensionpay.com',
      _user: null,
      _cached: false
    };

    // Start ExtPay in background script
    extpay.startBackground = function() {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.warn('ExtPay startBackground() should be called in a background script');
        return;
      }

      // Listen for ExtensionPay events
      if (chrome.runtime.onMessageExternal) {
        chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
          if (sender.url && sender.url.includes('extensionpay.com')) {
            if (request.command === 'extpay_user_updated') {
              // Clear cached user data when user status changes
              extpay._user = null;
              extpay._cached = false;
              
              // Broadcast update to all extension pages
              chrome.runtime.sendMessage({
                command: 'extpay_user_updated',
                user: request.user
              });
            }
          }
        });
      }
    };

    // Get user payment status
    extpay.getUser = function() {
      return new Promise((resolve, reject) => {
        if (extpay._cached && extpay._user) {
          resolve(extpay._user);
          return;
        }

        // Try to get from background script if in popup/content script
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            command: 'extpay_get_user'
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            
            if (response && response.user) {
              extpay._user = response.user;
              extpay._cached = true;
              resolve(response.user);
            } else if (response && response.error) {
              reject(new Error(response.error));
            } else {
              // Fallback to direct API call
              fetchUserFromAPI().then(resolve).catch(reject);
            }
          });
        } else {
          // Direct API call for background script
          fetchUserFromAPI().then(resolve).catch(reject);
        }
      });
    };

    function fetchUserFromAPI() {
      return new Promise((resolve, reject) => {
        // In a real implementation, this would make an actual API call to ExtensionPay
        // For demo purposes, we'll simulate with localStorage
        
        const storage_key = `extpay_user_${extpay.extension_id}`;
        let user;
        
        try {
          const stored = localStorage.getItem(storage_key);
          user = stored ? JSON.parse(stored) : null;
        } catch (e) {
          user = null;
        }
        
        if (!user) {
          user = {
            paid: false,
            installedAt: Date.now(),
            email: null,
            subscription: null,
            trialStartedAt: null
          };
          
          try {
            localStorage.setItem(storage_key, JSON.stringify(user));
          } catch (e) {
            // Storage might be full or unavailable
          }
        }

        extpay._user = user;
        extpay._cached = true;
        resolve(user);
      });
    }

    // Open payment page
    extpay.openPaymentPage = function() {
      const payment_url = `https://extensionpay.com/extension/${extpay.extension_id}`;
      
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: payment_url });
      } else {
        window.open(payment_url, '_blank');
      }
    };

    // Open login page
    extpay.openLoginPage = function() {
      const login_url = `https://extensionpay.com/extension/${extpay.extension_id}/login`;
      
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: login_url });
      } else {
        window.open(login_url, '_blank');
      }
    };

    // Start free trial
    extpay.openTrialPage = function(trial_period_days = 7) {
      const trial_url = `https://extensionpay.com/extension/${extpay.extension_id}/trial`;
      
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: trial_url });
      } else {
        window.open(trial_url, '_blank');
      }
    };

    return extpay;
  }

  return ExtPay;
});