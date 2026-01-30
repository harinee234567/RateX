// Enhanced Content script for currency detection and conversion
(function() {
  'use strict';

  let settings = {
    extensionEnabled: true,
    mode: 'auto',
    targetCurrency: 'USD',
    baseCurrency: 'USD',
    decimalPlaces: 2,
    rateOffset: 0
  };

  // Load settings
  async function loadSettings() {
    const stored = await chrome.storage.sync.get(null);
    settings = { ...settings, ...stored };
  }

  // Enhanced currency patterns with better detection
  const CURRENCY_PATTERNS = {
    // Symbol-first patterns (e.g., $100, €50, £20.50)
    symbolFirst: /([€£¥₹₽₩₺$])\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)/gi,
    
    // Symbol-last patterns (e.g., 100€, 50£)
    symbolLast: /\b([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)\s*([€£¥₹₽₩₺])/gi,
    
    // Code-first patterns (e.g., USD 100, EUR 50.25)
    codeFirst: /\b([A-Z]{3})\s+([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)\b/gi,
    
    // Code-last patterns (e.g., 100 USD, 50.25 EUR)
    codeLast: /\b([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)\s+([A-Z]{3})\b/gi,
    
    // Bare numbers (for base currency conversion when no symbol detected)
    bareNumber: /\b([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{2,4}))\b/gi
  };

  const SYMBOL_MAP = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    '₽': 'RUB',
    '₩': 'KRW',
    '₺': 'TRY',
    'C$': 'CAD',
    'A$': 'AUD',
    'HK$': 'HKD',
    'S$': 'SGD'
  };

  // Valid currency codes for validation
  const VALID_CURRENCIES = new Set([
    'USD', 'EUR', 'GBP', 'JPY', 'INR', 'RUB', 'KRW', 'TRY',
    'CAD', 'AUD', 'HKD', 'SGD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'ZAR', 'BRL', 'NOK', 'DKK', 'PLN', 'THB', 'MYR'
  ]);

  // Get exchange rate
  async function getRate(from, to) {
    try {
      const cacheKey = `rates_${from}`;
      const cached = await chrome.storage.local.get(cacheKey);
      
      if (cached[cacheKey] && cached[cacheKey][to]) {
        let rate = cached[cacheKey][to];
        
        // Apply offset
        if (settings.rateOffset !== 0) {
          rate *= (1 + settings.rateOffset / 100);
        }
        
        return rate;
      }
    } catch (error) {
      console.error('Error getting rate:', error);
    }
    
    return null;
  }

  // Format converted amount
  function formatAmount(amount) {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: settings.decimalPlaces,
      maximumFractionDigits: settings.decimalPlaces
    });
  }

  // Get currency symbol for display
  function getCurrencySymbol(currencyCode) {
    const symbols = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹',
      'JPY': '¥', 'RUB': '₽', 'KRW': '₩', 'TRY': '₺',
      'CAD': 'C$', 'AUD': 'A$', 'HKD': 'HK$', 'SGD': 'S$'
    };
    return symbols[currencyCode] || currencyCode;
  }

  // Create tooltip element for selection mode
  function createTooltip(sourceCurrency, targetCurrency, sourceAmount, targetAmount, x, y) {
    const existing = document.getElementById('currency-converter-tooltip');
    if (existing) existing.remove();

    const tooltip = document.createElement('div');
    tooltip.id = 'currency-converter-tooltip';
    
    const sourceSymbol = getCurrencySymbol(sourceCurrency);
    const targetSymbol = getCurrencySymbol(targetCurrency);
    
    tooltip.innerHTML = `
      <div style="font-size: 11px; opacity: 0.9; margin-bottom: 2px;">
        ${sourceSymbol} ${formatAmount(sourceAmount)} ${sourceCurrency}
      </div>
      <div style="font-size: 14px; font-weight: 700;">
        ↓
      </div>
      <div style="font-size: 13px; font-weight: 700;">
        ${targetSymbol} ${formatAmount(targetAmount)} ${targetCurrency}
      </div>
    `;
    
    Object.assign(tooltip.style, {
      position: 'absolute',
      top: `${y + window.scrollY + 20}px`,
      left: `${x + window.scrollX}px`,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '10px 16px',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '2147483647',
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
      pointerEvents: 'none',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      whiteSpace: 'nowrap',
      textAlign: 'center',
      lineHeight: '1.4',
      border: '2px solid rgba(255, 255, 255, 0.3)'
    });

    document.body.appendChild(tooltip);
    
    setTimeout(() => {
      if (tooltip && tooltip.parentNode) {
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s';
        setTimeout(() => tooltip.remove(), 300);
      }
    }, 4000);
  }

  // Create inline conversion span for auto mode
  function createConversionSpan(text, originalStyles) {
    const span = document.createElement('span');
    span.className = 'currency-conversion-inline';
    span.textContent = ` (${text})`;
    
    Object.assign(span.style, {
      color: '#10b981',
      fontWeight: '600',
      fontSize: originalStyles?.fontSize || 'inherit',
      fontFamily: originalStyles?.fontFamily || 'inherit',
      marginLeft: '4px',
      display: 'inline'
    });
    
    return span;
  }

  // Extract currency info from text
  function extractCurrencyInfo(text) {
    const results = [];
    
    // Try symbol-first pattern (e.g., $100)
    let match;
    const symbolFirstPattern = /([€£¥₹₽₩₺$])\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)/g;
    while ((match = symbolFirstPattern.exec(text)) !== null) {
      const amount = parseFloat(match[2].replace(/,/g, '').replace(/\s/g, ''));
      if (!isNaN(amount) && amount > 0) {
        results.push({
          fullMatch: match[0],
          amount: amount,
          currency: SYMBOL_MAP[match[1]] || 'USD',
          index: match.index,
          length: match[0].length
        });
      }
    }
    
    // Try symbol-last pattern (e.g., 100€)
    const symbolLastPattern = /\b([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)\s*([€£¥₹₽₩₺])/g;
    while ((match = symbolLastPattern.exec(text)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, '').replace(/\s/g, ''));
      if (!isNaN(amount) && amount > 0) {
        results.push({
          fullMatch: match[0],
          amount: amount,
          currency: SYMBOL_MAP[match[2]] || 'USD',
          index: match.index,
          length: match[0].length
        });
      }
    }
    
    // Try code-first pattern (e.g., USD 100)
    const codeFirstPattern = /\b([A-Z]{3})\s+([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)\b/g;
    while ((match = codeFirstPattern.exec(text)) !== null) {
      if (VALID_CURRENCIES.has(match[1])) {
        const amount = parseFloat(match[2].replace(/,/g, '').replace(/\s/g, ''));
        if (!isNaN(amount) && amount > 0) {
          results.push({
            fullMatch: match[0],
            amount: amount,
            currency: match[1],
            index: match.index,
            length: match[0].length
          });
        }
      }
    }
    
    // Try code-last pattern (e.g., 100 USD)
    const codeLastPattern = /\b([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)\s+([A-Z]{3})\b/g;
    while ((match = codeLastPattern.exec(text)) !== null) {
      if (VALID_CURRENCIES.has(match[2])) {
        const amount = parseFloat(match[1].replace(/,/g, '').replace(/\s/g, ''));
        if (!isNaN(amount) && amount > 0) {
          results.push({
            fullMatch: match[0],
            amount: amount,
            currency: match[2],
            index: match.index,
            length: match[0].length
          });
        }
      }
    }
    
    return results;
  }

  // Handle text selection (selection mode)
  async function handleSelection(event) {
    if (settings.mode !== 'selection') return;
    if (!settings.extensionEnabled) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Extract currency information
    const currencyInfo = extractCurrencyInfo(selectedText);
    
    let sourceCurrency, amount;
    
    if (currencyInfo.length > 0) {
      // Found currency with symbol/code
      sourceCurrency = currencyInfo[0].currency;
      amount = currencyInfo[0].amount;
    } else {
      // Try bare number (use base currency)
      const bareMatch = selectedText.match(/([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,4})?)/);
      if (bareMatch) {
        amount = parseFloat(bareMatch[1].replace(/,/g, '').replace(/\s/g, ''));
        sourceCurrency = settings.baseCurrency;
      } else {
        return; // No valid number found
      }
    }
    
    if (isNaN(amount) || amount <= 0) return;
    
    // Don't convert if already target currency
    if (sourceCurrency === settings.targetCurrency) return;

    // Get conversion rate
    const rate = await getRate(sourceCurrency, settings.targetCurrency);
    if (!rate) return;

    const converted = amount * rate;

    // Show tooltip with conversion
    const range = selection.getRangeAt(0).getBoundingClientRect();
    createTooltip(
      sourceCurrency,
      settings.targetCurrency,
      amount,
      converted,
      range.left,
      range.bottom
    );
  }

  // Check if element should be skipped
  function shouldSkipElement(element) {
    if (!element) return true;
    
    const tagName = element.tagName;
    if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT') return true;
    
    if (element.classList.contains('currency-conversion-inline')) return true;
    
    // Skip input and editable elements
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || element.isContentEditable) return true;
    
    return false;
  }

  // Get computed styles for matching font
  function getElementStyles(element) {
    const computed = window.getComputedStyle(element);
    return {
      fontSize: computed.fontSize,
      fontFamily: computed.fontFamily,
      fontWeight: computed.fontWeight
    };
  }

  // Track converted elements to prevent re-conversion
  const convertedElements = new WeakSet();
  let isConverting = false;

  // Handle automatic page conversion (auto mode)
  async function handleAutoConversion() {
    if (settings.mode !== 'auto') return;
    if (!settings.extensionEnabled) return;
    if (isConverting) return; // Prevent re-entry
    
    isConverting = true;

    try {
      // Find all text nodes that haven't been converted
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            if (shouldSkipElement(node.parentElement)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Skip if parent already converted
            if (convertedElements.has(node.parentElement)) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Only process nodes with actual content
            if (!node.textContent.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const textNodes = [];
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
      }

      // Process each text node
      for (const node of textNodes) {
        const text = node.textContent;
        const parent = node.parentElement;
        
        if (!parent || convertedElements.has(parent)) continue;
        
        // Extract all currency mentions
        const currencyMatches = extractCurrencyInfo(text);
        
        if (currencyMatches.length === 0) continue;
        
        // Get parent element styles for font matching
        const parentStyles = getElementStyles(parent);
        
        // Process first match only to avoid complexity
        const match = currencyMatches[0];
        
        if (match.currency === settings.targetCurrency) continue;
        
        // Get conversion rate
        const rate = await getRate(match.currency, settings.targetCurrency);
        if (!rate) continue;
        
        const converted = match.amount * rate;
        const targetSymbol = getCurrencySymbol(settings.targetCurrency);
        const formattedAmount = formatAmount(converted);
        
        try {
          // Create conversion span with matched font
          const conversionText = `${targetSymbol}${formattedAmount}`;
          const span = createConversionSpan(conversionText, parentStyles);
          
          // Split the text node at the match position
          const matchEnd = match.index + match.length;
          const beforeText = text.substring(0, matchEnd);
          const afterText = text.substring(matchEnd);
          
          // Create new text nodes
          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText);
          
          // Replace the original node
          parent.insertBefore(beforeNode, node);
          parent.insertBefore(span, node);
          if (afterText) {
            parent.insertBefore(afterNode, node);
          }
          parent.removeChild(node);
          
          // Mark as converted using WeakSet
          convertedElements.add(parent);
        } catch (error) {
          console.error('Error converting currency in node:', error);
        }
      }
      
      // Handle special cases like Amazon (price symbols in separate elements)
      await handleAmazonPrices();
    } finally {
      isConverting = false;
    }
  }

  // Special handler for Amazon-style prices (symbol in separate element)
  async function handleAmazonPrices() {
    // Look for price patterns with symbol and whole/fraction parts
    const priceContainers = document.querySelectorAll('[class*="price"], [class*="Price"]');
    
    for (const container of priceContainers) {
      if (convertedElements.has(container)) continue;
      
      // Look for currency symbol
      const symbolEl = container.querySelector('[class*="symbol"], [class*="currency"]');
      if (!symbolEl) continue;
      
      const symbolText = symbolEl.textContent.trim();
      const currencyCode = SYMBOL_MAP[symbolText];
      if (!currencyCode || currencyCode === settings.targetCurrency) continue;
      
      // Look for amount (whole and fractional parts)
      const wholeEl = container.querySelector('[class*="whole"]');
      const fractionEl = container.querySelector('[class*="fraction"]');
      
      let amount = 0;
      if (wholeEl) {
        const wholeText = wholeEl.textContent.replace(/,/g, '').trim();
        const fractionText = fractionEl ? fractionEl.textContent.trim() : '00';
        amount = parseFloat(`${wholeText}.${fractionText}`);
      } else {
        // Try to find any number in the container
        const numMatch = container.textContent.match(/([0-9,]+(?:\.[0-9]+)?)/);
        if (numMatch) {
          amount = parseFloat(numMatch[1].replace(/,/g, ''));
        }
      }
      
      if (isNaN(amount) || amount <= 0) continue;
      
      // Get conversion rate
      const rate = await getRate(currencyCode, settings.targetCurrency);
      if (!rate) continue;
      
      const converted = amount * rate;
      const targetSymbol = getCurrencySymbol(settings.targetCurrency);
      const formattedAmount = formatAmount(converted);
      
      // Get container styles
      const containerStyles = getElementStyles(container);
      
      // Add conversion span
      const conversionText = `${targetSymbol}${formattedAmount}`;
      const span = createConversionSpan(conversionText, containerStyles);
      
      container.appendChild(span);
      convertedElements.add(container);
    }
  }

  // Manual mode - remove all conversions
  function handleManualMode() {
    document.querySelectorAll('.currency-conversion-inline').forEach(el => el.remove());
    // WeakSet will automatically clear when elements are garbage collected
  }

  // Debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize based on mode
  async function initialize() {
    await loadSettings();

    if (settings.mode === 'selection') {
      // Add selection handler
      document.addEventListener('mouseup', handleSelection);
    } else if (settings.mode === 'auto') {
      // Run conversion after page load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', handleAutoConversion);
      } else {
        setTimeout(handleAutoConversion, 500);
      }

      // Watch for dynamic content with debouncing
      const debouncedConversion = debounce(handleAutoConversion, 1500);
      
      const observer = new MutationObserver((mutations) => {
        // Ignore mutations caused by our own conversions
        const relevantMutation = mutations.some(mutation => {
          // Skip if mutation is adding our conversion spans
          if (mutation.addedNodes.length > 0) {
            for (let node of mutation.addedNodes) {
              if (node.classList && node.classList.contains('currency-conversion-inline')) {
                return false;
              }
            }
            return true;
          }
          return false;
        });
        
        if (relevantMutation) {
          debouncedConversion();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: false,
        attributes: false
      });
    }
  }

  // Listen for settings updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSettings') {
      settings = { ...settings, ...message.settings };
      
      // Clear existing handlers
      document.removeEventListener('mouseup', handleSelection);
      
      // Re-initialize based on new mode
      if (settings.mode === 'auto') {
        handleAutoConversion();
      } else if (settings.mode === 'manual') {
        handleManualMode();
      } else if (settings.mode === 'selection') {
        document.addEventListener('mouseup', handleSelection);
        handleManualMode(); // Remove auto conversions
      }
      
      sendResponse({ success: true });
    }
    return true;
  });

  // Start
  initialize();
})();