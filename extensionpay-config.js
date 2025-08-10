// ExtensionPay Configuration
// Replace 'reels-analyzer' with your actual extension ID from ExtensionPay.com

const EXTENSIONPAY_CONFIG = {
  // Your ExtensionPay extension ID
  // Get this from https://extensionpay.com after registering
  extensionId: 'simplysort',
  
  // Pricing options (configured on ExtensionPay dashboard)
  pricing: {
    monthly: 3.99,
    yearly: 39.99,
    lifetime: 69.99
  },
  
  // Free tier limits
  freeTier: {
    dailyUsage: 3,
    features: ['basic-analysis']
  },
  
  // Pro features
  proFeatures: [
    'unlimited-analysis',
    'advanced-metrics', 
    'export-data',
    'real-time-updates',
    'custom-filters',
    'bulk-analysis'
  ],
  
  // URLs (automatically handled by ExtensionPay)
  urls: {
    payment: `https://extensionpay.com/extension/simplysort`,
    login: `https://extensionpay.com/extension/simplysort/login`,
    trial: `https://extensionpay.com/extension/simplysort/trial`
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXTENSIONPAY_CONFIG;
}