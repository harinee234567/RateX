// State management
let state = {
  extensionEnabled: true,
  mode: 'auto',
  targetCurrency: 'USD',
  baseCurrency: 'USD',
  pinnedCurrencies: DEFAULT_PINNED,
  decimalPlaces: 2,
  rateOffset: 0,
  darkMode: true,
  autoUpdate: true,
  noTracking: true,
  currentView: 'main',
  searchContext: null,
  manualAmount: '',
  manualBase: 'USD',
  manualTarget: 'EUR'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  setupEventListeners();
  renderUI();
  updateCacheInfo();
});

// Load state from storage
async function loadState() {
  const stored = await chrome.storage.sync.get(null);
  state = { ...state, ...stored };
  
  // Apply dark mode
  if (!state.darkMode) {
    document.body.style.setProperty('--bg-primary', '#ffffff');
    document.body.style.setProperty('--bg-secondary', '#f5f5f5');
    // ... more theme adjustments
  }
}

// Save state to storage
async function saveState(updates) {
  state = { ...state, ...updates };
  await chrome.storage.sync.set(updates);
  
  // Notify content script
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSettings', settings: state });
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document.getElementById('homeBtn').addEventListener('click', () => switchView('main'));
  document.getElementById('settingsBtn').addEventListener('click', () => switchView('settings'));
  document.getElementById('backBtn').addEventListener('click', () => switchView('main'));
  document.getElementById('settingsBackBtn').addEventListener('click', () => switchView('main'));
  
  // Extension toggle
  document.getElementById('extensionToggle').addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    await saveState({ extensionEnabled: enabled });
    document.getElementById('statusText').textContent = enabled ? 'Active' : 'Inactive';
    document.getElementById('statusText').classList.toggle('inactive', !enabled);
  });
  
  // Target currency card click
  document.getElementById('targetCurrencyCard').addEventListener('click', () => {
    state.searchContext = 'target';
    switchView('search');
    populateCurrencyList();
  });
  
  // Manual mode currency cards
  document.getElementById('manualBaseCurrency').addEventListener('click', () => {
    state.searchContext = 'manualBase';
    switchView('search');
    populateCurrencyList();
  });
  
  document.getElementById('manualTargetCurrency').addEventListener('click', () => {
    state.searchContext = 'manualTarget';
    switchView('search');
    populateCurrencyList();
  });
  
  // Swap currencies in manual mode
  document.getElementById('swapCurrencies').addEventListener('click', () => {
    const temp = state.manualBase;
    saveState({ 
      manualBase: state.manualTarget, 
      manualTarget: temp 
    });
    updateManualMode();
    calculateManualConversion();
  });
  
  // Manual amount input
  document.getElementById('manualAmount').addEventListener('input', (e) => {
    state.manualAmount = e.target.value;
    calculateManualConversion();
  });
  
  // Currency search
  document.getElementById('currencySearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.currency-list-item');
    items.forEach(item => {
      const code = item.dataset.code.toLowerCase();
      const name = item.querySelector('.currency-name').textContent.toLowerCase();
      const matches = code.includes(query) || name.includes(query);
      item.style.display = matches ? 'flex' : 'none';
    });
  });
  
  // Mode tabs
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', async (e) => {
      const mode = e.target.dataset.mode;
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      await saveState({ mode });
      switchView('main');
      renderUI();
    });
  });
  
  // Settings
  document.getElementById('baseSettingItem').addEventListener('click', () => {
    state.searchContext = 'base';
    switchView('search');
    populateCurrencyList();
  });
  
  document.getElementById('decimalPlaces').addEventListener('change', (e) => {
    saveState({ decimalPlaces: parseInt(e.target.value) });
  });
  
  document.getElementById('rateOffset').addEventListener('change', (e) => {
    saveState({ rateOffset: parseFloat(e.target.value) || 0 });
  });
  
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    saveState({ darkMode: e.target.checked });
    location.reload(); // Reload to apply theme
  });
  
  document.getElementById('autoUpdateToggle').addEventListener('change', (e) => {
    saveState({ autoUpdate: e.target.checked });
  });
  
  document.getElementById('noTrackingToggle').addEventListener('change', (e) => {
    saveState({ noTracking: e.target.checked });
  });
  
  document.getElementById('clearCacheBtn').addEventListener('click', async () => {
    await chrome.storage.local.clear();
    alert('Cache cleared successfully!');
    updateCacheInfo();
  });
  
  document.getElementById('updateRatesBtn').addEventListener('click', async () => {
    const btn = document.getElementById('updateRatesBtn');
    btn.textContent = 'Updating...';
    btn.disabled = true;
    
    await fetchAllRates(state.baseCurrency, true);
    
    btn.textContent = 'Update Rates Now';
    btn.disabled = false;
    updateCacheInfo();
    alert('Rates updated successfully!');
  });
  
  // Manage pins
  document.getElementById('managePinsBtn').addEventListener('click', () => {
    // TODO: Implement pin management UI
    alert('Pin management coming soon!');
  });
  
  // Batch conversion
  document.getElementById('convertBatchBtn')?.addEventListener('click', () => {
    performBatchConversion();
  });
}

// Switch between views
function switchView(view) {
  document.getElementById('mainView').style.display = view === 'main' ? 'block' : 'none';
  document.getElementById('searchView').style.display = view === 'search' ? 'block' : 'none';
  document.getElementById('settingsView').style.display = view === 'settings' ? 'block' : 'none';
  
  state.currentView = view;
  
  if (view === 'search') {
    document.getElementById('currencySearch').focus();
    document.getElementById('searchViewTitle').textContent = 
      state.searchContext === 'target' ? 'Select Target Currency' :
      state.searchContext === 'base' ? 'Select Base Currency' :
      state.searchContext === 'manualBase' ? 'Select Base Currency' :
      'Select Target Currency';
  }
}

// Render UI based on current state
function renderUI() {
  // Update extension toggle
  document.getElementById('extensionToggle').checked = state.extensionEnabled;
  document.getElementById('statusText').textContent = state.extensionEnabled ? 'Active' : 'Inactive';
  document.getElementById('statusText').classList.toggle('inactive', !state.extensionEnabled);
  
  // Show/hide mode sections
  document.getElementById('autoModeSection').style.display = state.mode !== 'manual' ? 'block' : 'none';
  document.getElementById('manualModeSection').style.display = state.mode === 'manual' ? 'block' : 'none';
  
  // Update target currency display
  updateCurrencyCard('target', state.targetCurrency);
  
  // Update manual mode
  if (state.mode === 'manual') {
    updateManualMode();
  }
  
  // Update pinned currencies
  renderPinnedCurrencies();
  
  // Update settings
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === state.mode);
  });
  document.getElementById('baseCurrencyValue').textContent = state.baseCurrency;
  document.getElementById('decimalPlaces').value = state.decimalPlaces;
  document.getElementById('rateOffset').value = state.rateOffset;
  document.getElementById('darkModeToggle').checked = state.darkMode;
  document.getElementById('autoUpdateToggle').checked = state.autoUpdate;
  document.getElementById('noTrackingToggle').checked = state.noTracking;
}

// Update currency card display
function updateCurrencyCard(type, code) {
  const currency = CURRENCIES[code];
  if (!currency) return;
  
  const prefix = type === 'target' ? 'target' : 
                 type === 'manualBase' ? 'manualBase' : 'manualTarget';
  
  document.getElementById(`${prefix}Flag`).textContent = currency.flag;
  document.getElementById(`${prefix}Code`).textContent = code;
  document.getElementById(`${prefix}Name`).textContent = currency.name;
  
  if (type === 'target') {
    // Show exchange rate
    getRates(state.baseCurrency).then(rates => {
      if (rates && rates[code]) {
        const rate = rates[code];
        document.getElementById('targetRate').textContent = 
          `1 ${state.baseCurrency} = ${rate.toFixed(4)} ${code}`;
      }
    });
  }
}

// Update manual mode display
function updateManualMode() {
  updateCurrencyCard('manualBase', state.manualBase);
  updateCurrencyCard('manualTarget', state.manualTarget);
  document.getElementById('manualAmount').value = state.manualAmount;
}

// Calculate manual conversion
async function calculateManualConversion() {
  const amount = parseFloat(state.manualAmount);
  if (isNaN(amount) || amount <= 0) {
    document.getElementById('resultValue').textContent = '0.00';
    return;
  }
  
  const rates = await getRates(state.manualBase);
  if (!rates || !rates[state.manualTarget]) {
    document.getElementById('resultValue').textContent = 'N/A';
    return;
  }
  
  const rate = applyOffset(rates[state.manualTarget]);
  const result = amount * rate;
  const formatted = formatAmount(result, state.decimalPlaces);
  
  const symbol = CURRENCIES[state.manualTarget]?.symbol || state.manualTarget;
  document.getElementById('resultValue').textContent = `${symbol} ${formatted}`;
}

// Render pinned currencies
function renderPinnedCurrencies() {
  const container = document.getElementById('pinnedCurrencies');
  container.innerHTML = '';
  
  state.pinnedCurrencies.forEach(code => {
    const currency = CURRENCIES[code];
    if (!currency) return;
    
    const card = document.createElement('div');
    card.className = 'currency-card pinned';
    card.innerHTML = `
      <div class="currency-icon">${currency.flag}</div>
      <div class="currency-info">
        <div class="currency-code">${code}</div>
        <div class="currency-name">${currency.name.substring(0, 20)}...</div>
      </div>
    `;
    
    card.addEventListener('click', async () => {
      await saveState({ targetCurrency: code });
      updateCurrencyCard('target', code);
      renderUI();
    });
    
    container.appendChild(card);
  });
}

// Populate currency list for search
function populateCurrencyList() {
  const container = document.getElementById('currencyList');
  container.innerHTML = '';
  
  Object.keys(CURRENCIES).sort().forEach(code => {
    const currency = CURRENCIES[code];
    const item = document.createElement('div');
    item.className = 'currency-list-item';
    item.dataset.code = code;
    
    // Mark as selected if it's the current target
    if ((state.searchContext === 'target' && code === state.targetCurrency) ||
        (state.searchContext === 'base' && code === state.baseCurrency) ||
        (state.searchContext === 'manualBase' && code === state.manualBase) ||
        (state.searchContext === 'manualTarget' && code === state.manualTarget)) {
      item.classList.add('selected');
    }
    
    item.innerHTML = `
      <div class="currency-icon">${currency.flag}</div>
      <div class="currency-info">
        <div class="currency-code">${code}</div>
        <div class="currency-name">${currency.name}</div>
      </div>
    `;
    
    item.addEventListener('click', async () => {
      if (state.searchContext === 'target') {
        await saveState({ targetCurrency: code });
        updateCurrencyCard('target', code);
      } else if (state.searchContext === 'base') {
        await saveState({ baseCurrency: code });
      } else if (state.searchContext === 'manualBase') {
        await saveState({ manualBase: code });
        updateManualMode();
        calculateManualConversion();
      } else if (state.searchContext === 'manualTarget') {
        await saveState({ manualTarget: code });
        updateManualMode();
        calculateManualConversion();
      }
      
      switchView('main');
    });
    
    container.appendChild(item);
  });
}

// Fetch rates with fallback APIs
async function getRates(base, forceUpdate = false) {
  const cacheKey = `rates_${base}`;
  const cacheTimeKey = `ratesTime_${base}`;
  
  // Check cache
  if (!forceUpdate) {
    const cached = await chrome.storage.local.get([cacheKey, cacheTimeKey]);
    const now = Date.now();
    
    if (cached[cacheKey] && cached[cacheTimeKey]) {
      const age = now - cached[cacheTimeKey];
      const maxAge = state.autoUpdate ? 3600000 : 86400000; // 1 hour or 24 hours
      
      if (age < maxAge) {
        return cached[cacheKey];
      }
    }
  }
  
  // Try each API in order
  for (const api of API_CONFIGS) {
    try {
      const response = await fetch(api.url(base));
      const data = await response.json();
      const rates = api.parse(data);
      
      if (rates) {
        // Cache the rates
        await chrome.storage.local.set({
          [cacheKey]: rates,
          [cacheTimeKey]: Date.now()
        });
        return rates;
      }
    } catch (error) {
      console.warn(`API ${api.name} failed:`, error);
      continue;
    }
  }
  
  return null;
}

// Fetch rates for all major currencies
async function fetchAllRates(base, forceUpdate = false) {
  const currencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'];
  
  for (const currency of currencies) {
    await getRates(currency, forceUpdate);
  }
}

// Apply rate offset
function applyOffset(rate) {
  if (state.rateOffset === 0) return rate;
  return rate * (1 + state.rateOffset / 100);
}

// Format amount
function formatAmount(amount, decimals) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Update cache info
async function updateCacheInfo() {
  const allData = await chrome.storage.local.get(null);
  const rateKeys = Object.keys(allData).filter(k => k.startsWith('rates_'));
  const timeKeys = Object.keys(allData).filter(k => k.startsWith('ratesTime_'));
  
  document.getElementById('cachedCount').textContent = rateKeys.length;
  
  if (timeKeys.length > 0) {
    const times = timeKeys.map(k => allData[k]);
    const latest = Math.max(...times);
    const date = new Date(latest);
    document.getElementById('lastUpdateTime').textContent = date.toLocaleString();
  } else {
    document.getElementById('lastUpdateTime').textContent = 'Never';
  }
}

// Batch conversion
async function performBatchConversion() {
  const input = document.getElementById('batchInput').value;
  const results = document.getElementById('batchResults');
  results.innerHTML = '';
  
  if (!input.trim()) {
    results.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Enter amounts to convert</div>';
    return;
  }
  
  const lines = input.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    // Try to extract currency and amount
    const match = line.match(/([^\d]*?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
    if (!match) continue;
    
    const symbol = match[1].trim() || '$';
    const amount = parseFloat(match[2].replace(/,/g, ''));
    
    // Determine currency from symbol
    let baseCurrency = 'USD';
    for (const [sym, codes] of Object.entries(CURRENCY_SYMBOLS)) {
      if (symbol.includes(sym)) {
        baseCurrency = codes[0];
        break;
      }
    }
    
    // Convert
    const rates = await getRates(baseCurrency);
    if (rates && rates[state.targetCurrency]) {
      const rate = applyOffset(rates[state.targetCurrency]);
      const result = amount * rate;
      const formatted = formatAmount(result, state.decimalPlaces);
      const targetSymbol = CURRENCIES[state.targetCurrency]?.symbol || state.targetCurrency;
      
      const item = document.createElement('div');
      item.className = 'batch-result-item';
      item.innerHTML = `
        <span class="batch-original">${symbol}${match[2]}</span>
        <span class="batch-converted">${targetSymbol} ${formatted}</span>
      `;
      results.appendChild(item);
    }
  }
}

// Geo-based currency suggestion
async function suggestCurrencyByLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.currency) {
      return data.currency;
    }
  } catch (error) {
    console.warn('Failed to detect location:', error);
  }
  
  return 'USD';
}

// Initialize with geo-based suggestion on first run
chrome.storage.sync.get('firstRun', async (data) => {
  if (!data.firstRun) {
    const suggestedCurrency = await suggestCurrencyByLocation();
    await saveState({ 
      targetCurrency: suggestedCurrency,
      baseCurrency: suggestedCurrency,
      firstRun: false 
    });
    renderUI();
  }
});