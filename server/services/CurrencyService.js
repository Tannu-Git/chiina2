class CurrencyService {
  constructor() {
    this.exchangeRates = {
      'USD_TO_INR': 83, // Default fallback rate
      'INR_TO_USD': 0.012,
      lastUpdated: new Date()
    };
    this.updateInterval = 60 * 60 * 1000; // Update every hour
    
    // Start periodic updates
    this.startPeriodicUpdates();
  }

  /**
   * Get current exchange rate between two currencies
   * @param {string} fromCurrency - Source currency (USD, INR)
   * @param {string} toCurrency - Target currency (USD, INR)
   * @returns {number} Exchange rate
   */
  getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;
    
    const rateKey = `${fromCurrency}_TO_${toCurrency}`;
    const rate = this.exchangeRates[rateKey];
    
    if (rate) {
      return rate;
    }
    
    // If direct rate not available, try inverse
    const inverseKey = `${toCurrency}_TO_${fromCurrency}`;
    const inverseRate = this.exchangeRates[inverseKey];
    
    if (inverseRate) {
      return 1 / inverseRate;
    }
    
    // Fallback to default rate
    console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}, using default`);
    return fromCurrency === 'USD' && toCurrency === 'INR' ? 83 : 0.012;
  }

  /**
   * Convert amount from one currency to another
   * @param {number} amount - Amount to convert
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {number} Converted amount
   */
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (!amount || amount === 0) return 0;
    
    const rate = this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Get all current exchange rates
   * @returns {object} Current exchange rates with metadata
   */
  getAllRates() {
    return {
      ...this.exchangeRates,
      lastUpdated: this.exchangeRates.lastUpdated,
      nextUpdate: new Date(this.exchangeRates.lastUpdated.getTime() + this.updateInterval)
    };
  }

  /**
   * Update exchange rates from external API
   * In production, this would call a real currency API
   */
  async updateExchangeRates() {
    try {
      // In production, replace with actual API call
      // For now, simulate API response with slight variations
      const baseRate = 83;
      const variation = (Math.random() - 0.5) * 2; // ±1 variation
      const newUsdToInr = Math.max(80, Math.min(86, baseRate + variation));
      
      this.exchangeRates = {
        'USD_TO_INR': parseFloat(newUsdToInr.toFixed(2)),
        'INR_TO_USD': parseFloat((1 / newUsdToInr).toFixed(6)),
        lastUpdated: new Date()
      };
      
      console.log(`Currency rates updated: USD/INR = ${this.exchangeRates.USD_TO_INR}`);
      
    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      // Keep existing rates on failure
    }
  }

  /**
   * Start periodic updates of exchange rates
   */
  startPeriodicUpdates() {
    // Update immediately
    this.updateExchangeRates();
    
    // Then update periodically
    setInterval(() => {
      this.updateExchangeRates();
    }, this.updateInterval);
  }

  /**
   * Validate currency code
   * @param {string} currency - Currency code to validate
   * @returns {boolean} True if valid
   */
  isValidCurrency(currency) {
    const validCurrencies = ['USD', 'INR'];
    return validCurrencies.includes(currency);
  }

  /**
   * Format currency amount for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount, currency) {
    if (!this.isValidCurrency(currency)) {
      throw new Error(`Invalid currency: ${currency}`);
    }
    
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'INR' ? 0 : 2,
      maximumFractionDigits: currency === 'INR' ? 0 : 2
    }).format(amount);
    
    return formatted;
  }
}

// Export singleton instance
module.exports = new CurrencyService();