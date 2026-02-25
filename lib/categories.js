// lib/categories.js
/**
 * Category definitions: name, icon (Expo vector-icons name), color.
 * To add a new category: add an entry here.
 */
export const CATEGORIES = {
  Food: { icon: 'restaurant', color: '#FF6B6B' },
  Transportation: { icon: 'car', color: '#4ECDC4' },
  Shopping: { icon: 'bag-handle', color: '#FFE66D' },
  Entertainment: { icon: 'film', color: '#A78BFA' },
  Utilities: { icon: 'flash', color: '#60A5FA' },
  Healthcare: { icon: 'medical', color: '#34D399' },
  Travel: { icon: 'airplane', color: '#FB923C' },
  Education: { icon: 'school', color: '#F472B6' },
  Groceries: { icon: 'basket', color: '#86EFAC' },
  Coffee: { icon: 'cafe', color: '#D97706' },
  Subscriptions: { icon: 'repeat', color: '#C084FC' },
  Uncategorized: { icon: 'help-circle', color: '#94A3B8' },
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

/**
 * Auto-categorize a transaction based on its name/merchant.
 * Returns a category string from CATEGORIES keys.
 *
 * Pending:
 * Add more rules to CATEGORIZATION_RULES below.
 * Each rule is: { patterns: [string], category: string }
 * If a transaction name includes ANY of the patterns (case-insensitive), it gets that category.
 * Rules are evaluated in ORDER — first match wins.
 
 */
export function categorizeTransaction(name, plaidCategories = []) {
  const nameLower = (name || '').toLowerCase();

 
  const plaidCat = (plaidCategories || []).join(' ').toLowerCase();

  // Categories
  // Add/edit rules here to improve categorization.
  const RULES = [
    {
      patterns: ['starbucks', 'coffee', 'dunkin', 'peet', 'philz', 'blue bottle', 'espresso'],
      category: 'Coffee',
    },
    {
      patterns: ['uber eats', 'doordash', 'grubhub', 'postmates', 'instacart', 'seamless', 'caviar'],
      category: 'Food',
    },
    {
      patterns: ['uber', 'lyft', 'taxi', 'metro', 'subway', 'train', 'bus', 'parking', 'toll', 'gas station', 'chevron', 'shell', 'exxon', 'bp'],
      category: 'Transportation',
    },
    {
      patterns: ['amazon', 'walmart', 'target', 'costco', 'best buy', 'ebay', 'etsy', 'shopify'],
      category: 'Shopping',
    },
    {
      patterns: ['whole foods', 'trader joe', 'safeway', 'kroger', 'publix', 'aldi', 'wegmans', 'grocery'],
      category: 'Groceries',
    },
    {
      patterns: ['netflix', 'spotify', 'hulu', 'disney+', 'apple tv', 'youtube premium', 'hbo', 'prime video'],
      category: 'Subscriptions',
    },
    {
      patterns: ['movie', 'cinema', 'amc', 'regal', 'theater', 'concert', 'ticketmaster', 'live nation', 'steam', 'playstation', 'xbox'],
      category: 'Entertainment',
    },
    {
      patterns: ['electric', 'water bill', 'gas bill', 'internet', 'comcast', 'at&t', 'verizon', 'tmobile', 'phone bill'],
      category: 'Utilities',
    },
    {
      patterns: ['doctor', 'hospital', 'pharmacy', 'walgreens', 'cvs', 'medical', 'dental', 'vision', 'insurance'],
      category: 'Healthcare',
    },
    {
      patterns: ['airline', 'airbnb', 'hotel', 'marriott', 'hilton', 'united', 'delta', 'southwest', 'american airlines', 'expedia'],
      category: 'Travel',
    },
    {
      patterns: ['udemy', 'coursera', 'tuition', 'university', 'college', 'school', 'books', 'kindle'],
      category: 'Education',
    },
    {
      patterns: ['restaurant', 'diner', 'burger', 'pizza', 'sushi', 'taco', 'grill', 'bistro', 'cafe', 'kitchen', 'eatery'],
      category: 'Food',
    },
  ];
  // ─────────────────────────────────────────────────────────

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (nameLower.includes(pattern) || plaidCat.includes(pattern)) {
        return rule.category;
      }
    }
  }

  
  if (plaidCategories.length > 0) {
    const topCat = plaidCategories[0];
    if (topCat === 'Food and Drink') return 'Food';
    if (topCat === 'Travel') return 'Travel';
    if (topCat === 'Shops') return 'Shopping';
    if (topCat === 'Recreation') return 'Entertainment';
    if (topCat === 'Healthcare') return 'Healthcare';
    if (topCat === 'Service') return 'Utilities';
  }

  return 'Uncategorized';
}

/**
 * Get category color by name, with fallback.
 */
export function getCategoryColor(category) {
  return CATEGORIES[category]?.color || CATEGORIES.Uncategorized.color;
}

/**
 * Get category icon by name, with fallback.
 */
export function getCategoryIcon(category) {
  return CATEGORIES[category]?.icon || CATEGORIES.Uncategorized.icon;
}

/**
 * Format currency amounts.
 * Positive amounts = expense (money out)
 * Negative amounts = income/refund (money in)
 */
export function formatAmount(amount, currency = 'USD') {
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(absAmount);

  return amount < 0 ? `+${formatted}` : formatted;
}


export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}


export function getMonthLabel(month) {
  const [year, mon] = month.split('-');
  const date = new Date(parseInt(year), parseInt(mon) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
