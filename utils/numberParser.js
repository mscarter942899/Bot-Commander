/**
 * Parses gem amount strings like "2.5b", "1.2m", "28k" into actual numbers
 * @param {string|number} input - The amount to parse (e.g., "2.5b", "1000", "5m")
 * @returns {number} The parsed amount as a number
 */
function parseGemAmount(input) {
    if (typeof input === 'number') return Math.floor(input);
    if (typeof input !== 'string') return 0;
    
    const trimmed = input.trim().toLowerCase();
    const match = trimmed.match(/^([\d.]+)([kmb])?$/);
    
    if (!match) return 0;
    
    const number = parseFloat(match[1]);
    const suffix = match[2];
    
    if (isNaN(number)) return 0;
    
    const multipliers = {
        'k': 1000,
        'm': 1000000,
        'b': 1000000000
    };
    
    const multiplier = multipliers[suffix] || 1;
    return Math.floor(number * multiplier);
}

/**
 * Formats a number into a readable gem amount (e.g., 1500000 -> "1.5m")
 * @param {number} amount - The amount to format
 * @returns {string} The formatted amount
 */
function formatGemAmount(amount) {
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1) + 'b';
    } else if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'm';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'k';
    }
    return amount.toString();
}

module.exports = {
    parseGemAmount,
    formatGemAmount
};
