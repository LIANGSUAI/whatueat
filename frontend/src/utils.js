// Utility helper functions for the frontend

/**
 * Parses a numeric value from a string or number.
 * Handles strings with units, commas, or whitespace (e.g. "520 kcal", "12.5 g").
 * Returns the parsed number or fallback (default 0) if invalid.
 */
export const parseNumeric = (val, fallback = 0) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  const clean = String(val).replace(/,/g, '').trim();
  const match = clean.match(/[-+]?\d+(?:\.\d+)?/);
  if (match) {
    const num = Number(match[0]);
    return Number.isFinite(num) ? num : fallback;
  }
  return fallback;
};
