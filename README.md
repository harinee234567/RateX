# Currency Converter Pro 💱

A modern, feature-rich Chrome extension for intelligent currency conversion with multiple modes, extensive currency support, and beautiful dark UI.

## ✨ Features

### 🎯 Core Features
- **Multi-Currency Support** - 150+ currencies including fiat and cryptocurrencies
- **Smart Detection** - Automatically detects and converts currencies on web pages
- **Multiple Conversion Modes**:
  - 🔄 **Auto Mode** - Automatic page-wide conversion
  - ✂️ **Selection Mode** - Convert selected text with tooltip
  - ✍️ **Manual Mode** - Built-in currency calculator
- **Quick Access Pins** - Pin your favorite currencies for instant access
- **Batch Conversion** - Convert multiple amounts at once

### ⚙️ Advanced Settings
- **Default Base Currency** - Set your preferred base currency
- **Decimal Places** - Customize precision (0-6 decimal places)
- **Rate Adjustment** - Add custom margin to rates (+/- 10%)
- **Round-off Settings** - Control number formatting
- **Fallback APIs** - Multiple API sources for reliability
- **Geo-based Suggestions** - Automatic currency detection based on location

### 🎨 UI/UX Features
- **Modern Dark Theme** - Sleek, eye-friendly interface
- **Clean Design** - Intuitive and clutter-free
- **Smooth Animations** - Polished user experience
- **Quick Swap** - Instant currency switching in manual mode
- **Search Functionality** - Fast currency search with filtering

### 🔒 Privacy & Performance
- **No Tracking Mode** - Complete privacy protection
- **Smart Caching** - Reduces API calls and improves speed
- **Cache Management** - Clear cache and update rates manually
- **Auto-Update Rates** - Configurable automatic rate refresh

## 📦 Installation

### From Source
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory
6. The extension icon will appear in your toolbar

### From Chrome Web Store
*(Coming soon)*

## 🚀 Usage

### Quick Start
1. Click the extension icon in your toolbar
2. Select your target currency
3. Choose your preferred mode (Auto/Selection/Manual)
4. Start converting!

### Conversion Modes

#### Auto Mode
- Automatically detects and converts currencies on web pages
- Displays converted amounts inline next to original prices
- Works with all major currency symbols and codes

#### Selection Mode
- Select any text containing a currency amount
- A tooltip will show the converted value
- Perfect for occasional conversions without page clutter

#### Manual Mode
- Use the built-in calculator
- Enter amount, select currencies, and see instant results
- Swap button for quick currency reversal

### Settings

Access settings by clicking the ⚙️ icon:

- **Conversion Mode** - Choose between Auto, Selection, or Manual
- **Default Base Currency** - Set your home currency
- **Decimal Places** - Control conversion precision
- **Rate Adjustment** - Add custom margin for currency exchange fees
- **Dark Mode** - Toggle light/dark theme
- **Auto-Update Rates** - Enable/disable automatic rate refresh
- **No Tracking Mode** - Privacy protection

### Batch Conversion

1. Click the expand icon in the popup
2. Enter multiple amounts with currencies (one per line)
   ```
   $100
   €50
   ¥1000
   £75
   ```
3. Click "Convert All"
4. See all conversions to your target currency

## 🌍 Supported Currencies

### Fiat Currencies (150+)
- Major: USD, EUR, GBP, JPY, CNY, CHF, CAD, AUD
- Asian: INR, KRW, SGD, HKD, THB, MYR, IDR, PHP, VND
- European: SEK, NOK, DKK, PLN, CZK, HUF, RON, BGN
- Americas: MXN, BRL, ARS, CLP, COP, PEN
- Middle East: AED, SAR, QAR, KWD, ILS
- African: ZAR, NGN, EGP, KES, GHS
- And many more!

### Cryptocurrencies
- BTC, ETH, BNB, SOL, XRP, ADA, DOGE, MATIC, DOT, AVAX

## 🔄 API & Rate Updates

The extension uses multiple API sources for maximum reliability:
1. ExchangeRate-API (Primary)
2. Frankfurter API (Fallback)
3. ExchangeRate.host (Fallback)

**Update Schedule:**
- Automatic updates every 1 hour (when auto-update is enabled)
- Manual refresh available in settings
- Rates cached locally for 1 hour (configurable)

## 🎨 Customization

### Pinned Currencies
- Add your most-used currencies for quick access
- Displays in a convenient grid layout
- Click to instantly set as target currency

### Rate Adjustment
- Add a percentage margin to account for exchange fees
- Range: -10% to +10%
- Applied to all conversions

### Decimal Places
- Choose between 0, 2, 4, or 6 decimal places
- Affects all conversion displays
- Useful for both casual use and precise calculations

## 🔐 Privacy

This extension respects your privacy:
- ✅ No user tracking or analytics
- ✅ No data collection
- ✅ No third-party cookies
- ✅ All processing done locally
- ✅ API calls only for exchange rates
- ✅ No personal information stored

## 🐛 Troubleshooting

### Rates not updating?
1. Check your internet connection
2. Click "Update Rates Now" in settings
3. Try clearing the cache in settings

### Conversion not working?
1. Ensure extension is enabled (toggle in popup)
2. Check that you're in the correct mode
3. Verify the currency is supported

### UI issues?
1. Try refreshing the extension popup
2. Reload the extension from chrome://extensions/
3. Clear browser cache

## 📝 Version History

### Version 2.0 (Current)
- ✨ Complete UI redesign with modern dark theme
- ✨ Added manual conversion mode
- ✨ Batch conversion support
- ✨ Quick currency swap
- ✨ Pinned currencies
- ✨ Geo-based currency suggestion
- ✨ Multiple API fallbacks
- ✨ Enhanced caching system
- ✨ Improved settings panel
- ✨ 150+ currencies supported
- ✨ Cryptocurrency support

### Version 1.0
- Basic currency conversion
- Auto and selection modes
- Simple UI

## 🤝 Contributing

Contributions are welcome! Here's how you can help:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use and modify!

## 🙏 Credits

- Exchange rates provided by ExchangeRate-API, Frankfurter, and ExchangeRate.host
- Icons and emoji flags for currency representation
- Built with vanilla JavaScript for maximum performance

## 💬 Support

Having issues or suggestions?
- Report bugs via GitHub issues
- Request features via pull requests
- Rate the extension on Chrome Web Store

## 🚀 Roadmap

Future enhancements:
- [ ] Historical rate charts
- [ ] Conversion history
- [ ] Custom currency pairs
- [ ] Keyboard shortcuts
- [ ] More themes (light mode)
- [ ] Import/export settings
- [ ] Notification for significant rate changes
- [ ] Multi-language support

---

**Enjoy using Currency Converter Pro!** 💱✨
