/**
 * Format a number with thousands separators and optional decimal places
 * @param value The number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  // Handle large numbers with abbreviations
  if (Math.abs(value) >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + 'B';
  } else if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  } else if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K';
  }
  
  // Format with the specified number of decimal places
  const options = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };
  
  return value.toLocaleString(undefined, options);
};

/**
 * Format a number as a percentage
 * @param value The number to format as percentage (0.1 = 10%)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  const options = {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };
  
  return value.toLocaleString(undefined, options);
};

/**
 * Format a date value
 * @param value Date string or Date object
 * @param format Format style ('short', 'medium', 'long', or 'full')
 * @returns Formatted date string
 */
export const formatDate = (
  value: string | Date, 
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string => {
  if (!value) return '-';
  
  const date = typeof value === 'string' ? new Date(value) : value;
  
  if (isNaN(date.getTime())) {
    return '-';
  }
  
  const options: Intl.DateTimeFormatOptions = { dateStyle: format };
  return new Intl.DateTimeFormat(undefined, options).format(date);
};

/**
 * Format a currency value
 * @param value The number to format
 * @param currency Currency code (default: 'USD')
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number, 
  currency: string = 'USD', 
  decimals: number = 2
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  
  const options = {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  };
  
  return value.toLocaleString(undefined, options);
};