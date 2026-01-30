// Background service worker for currency converter extension

// API configurations with fallbacks
const API_CONFIGS = [
  {
    name: "ExchangeRate-API",
    url: (base) => `https://open.er-api.com/v6/latest/${base}`,
    parse: (data) => data.result === "success" ? data.rates : null
  },
  {
    name: "Frankfurter",
    url: (base) => `https://api.frankfurter.app/latest?from=${base}`,
    parse: (data) => data.rates ? { ...data.rates, [data.base]: 1 } : null
  },
  {
    name: "ExchangeRate.host", 
    url: (base) => `https://api.exchangerate.host/latest?base=${base}`,
    parse: (data) => data.success ? data.rates : null
  }
];

// Major currencies to keep updated
const MAJOR_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 
  'SEK', 'NZD', 'SGD', 'HKD', 'KRW', 'MXN', 'BRL', 'ZAR'
];

// Fetch rates for a base currency with fallback support
async function fetchRates(baseCurrency, forceUpdate = false) {
  const cacheKey = `rates_${baseCurrency}`;
  const cacheTimeKey = `ratesTime_${baseCurrency}`;

  // Check cache unless force update
  if (!forceUpdate) {
    try {
      const cached = await chrome.storage.local.get([cacheKey, cacheTimeKey]);
      const now = Date.now();
      
      if (cached[cacheKey] && cached[cacheTimeKey]) {
        const age = now - cached[cacheTimeKey];
        const maxAge = 3600000; // 1 hour
        
        if (age < maxAge) {
          console.log(`Using cached rates for ${baseCurrency}`);
          return cached[cacheKey];
        }
      }
    } catch (error) {
      console.error('Cache check failed:', error);
    }
  }

  // Try each API in sequence
  for (const api of API_CONFIGS) {
    try {
      console.log(`Fetching ${baseCurrency} rates from ${api.name}...`);
      const response = await fetch(api.url(baseCurrency));
      
      if (!response.ok) {
        console.warn(`${api.name} returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rates = api.parse(data);
      
      if (rates) {
        // Cache successful response
        await chrome.storage.local.set({
          [cacheKey]: rates,
          [cacheTimeKey]: Date.now()
        });
        
        console.log(`Successfully fetched ${baseCurrency} rates from ${api.name}`);
        return rates;
      }
    } catch (error) {
      console.warn(`${api.name} failed for ${baseCurrency}:`, error);
      continue;
    }
  }

  console.error(`All APIs failed for ${baseCurrency}`);
  return null;
}

// Update all major currency rates
async function updateAllRates(forceUpdate = false) {
  console.log('Updating rates for major currencies...');
  
  const results = [];
  
  for (const currency of MAJOR_CURRENCIES) {
    const rates = await fetchRates(currency, forceUpdate);
    results.push({ currency, success: rates !== null });
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`Rate update complete: ${successful}/${results.length} successful`);
  
  return results;
}

// Scheduled rate updates
function scheduleRateUpdates() {
  // Update rates every hour
  chrome.alarms.create('updateRates', { periodInMinutes: 60 });
  
  // Also update on extension install/update
  updateAllRates(true);
}

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'updateRates') {
    const settings = await chrome.storage.sync.get(['autoUpdate']);
    
    if (settings.autoUpdate !== false) {
      await updateAllRates(false);
    }
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Extension installed - initializing...');
    
    // Set default settings
    await chrome.storage.sync.set({
      extensionEnabled: true,
      mode: 'auto',
      targetCurrency: 'USD',
      baseCurrency: 'USD',
      pinnedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD'],
      decimalPlaces: 2,
      rateOffset: 0,
      darkMode: true,
      autoUpdate: true,
      noTracking: true,
      firstRun: true
    });
    
    // Fetch initial rates
    await updateAllRates(true);
    
    // Try to detect user's location and suggest currency
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.currency) {
        await chrome.storage.sync.set({ 
          targetCurrency: data.currency,
          baseCurrency: data.currency
        });
        console.log(`Detected user currency: ${data.currency}`);
      }
    } catch (error) {
      console.warn('Failed to detect location:', error);
    }
  } else if (details.reason === 'update') {
    console.log('Extension updated');
    // Refresh rates on update
    await updateAllRates(true);
  }
  
  // Schedule periodic updates
  scheduleRateUpdates();
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateRates') {
    updateAllRates(true).then(results => {
      sendResponse({ success: true, results });
    });
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'getRates') {
    fetchRates(message.baseCurrency).then(rates => {
      sendResponse({ rates });
    });
    return true;
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
  scheduleRateUpdates();
});

// Keep service worker alive
let keepAlive;
chrome.runtime.onStartup.addListener(() => {
  keepAlive = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {});
  }, 20000);
});

console.log('Currency Converter Pro background service initialized');
