// Indian numbering system formatter (e.g. 1,00,000 for 1 Lakh)
function formatIndianNumber(num: number): string {
  const isNegative = num < 0;
  const absStr = Math.abs(num).toString();

  if (absStr.length <= 3) {
    return (isNegative ? '-' : '') + absStr;
  }

  const lastThree = absStr.slice(-3);
  const otherDigits = absStr.slice(0, -3);
  const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (isNegative ? '-' : '') + formattedOther + ',' + lastThree;
}

/**
 * Formats an integer amount in paise into an Indian Rupee string (₹).
 * Never floats; formats paise directly.
 * Example: 1850000 paise -> ₹18,500
 * Example: 250050 paise -> ₹2,500.50
 */
export function formatINR(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  const rupeeFormatted = formatIndianNumber(rupees);
  const sign = isNegative ? '-' : '';

  if (remainderPaise === 0) {
    return `${sign}₹${rupeeFormatted}`;
  }

  const decimalPart = remainderPaise.toString().padStart(2, '0');
  return `${sign}₹${rupeeFormatted}.${decimalPart}`;
}

/**
 * Converts user-input rupee string to integer paise.
 * Used strictly at the form boundary to avoid any floating-point inaccuracies.
 * Example: "2500" -> 250000
 * Example: "2500.50" -> 250050
 * Example: "2500.5" -> 250050
 */
export function rupeesToPaise(rupeesStr: string): number {
  const clean = rupeesStr.trim().replace(/,/g, '');
  if (!clean) {
    return 0;
  }

  const parts = clean.split('.');
  const rupees = parseInt(parts[0], 10) || 0;
  const paisePart = parts[1] || '0';
  const paise = parseInt(paisePart.padEnd(2, '0').slice(0, 2), 10) || 0;

  return rupees * 100 + paise;
}

/**
 * Converts integer paise to a plain string representation for form inputs.
 * Example: 250000 -> "2500"
 * Example: 250050 -> "2500.50"
 */
export function paiseToRupeesString(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainder = paise % 100;
  if (remainder === 0) {
    return rupees.toString();
  }
  return `${rupees}.${remainder.toString().padStart(2, '0')}`;
}

/**
 * Formats a YYYY-MM-DD string or Date object into bookkeeper style e.g. "12 OCT 2026".
 * Uses UTC methods to prevent timezone shifting for date-only values.
 */
export function formatLedgerDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const day = d.getUTCDate().toString().padStart(2, '0');
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];
  const month = monthNames[d.getUTCMonth()];
  const year = d.getUTCFullYear();

  return `${day} ${month} ${year}`;
}
