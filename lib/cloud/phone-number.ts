export function normalizePhoneNumber(value: string, countryCode = "+86") {
  const compact = value.trim().replace(/[\s()-]/gu, "");
  if (/^\+[1-9]\d{6,14}$/u.test(compact)) return compact;
  const digits = compact.replace(/\D/gu, "");
  const countryDigits = countryCode.replace(/\D/gu, "");
  if (!countryDigits || !digits) return null;
  const withCountry = digits.startsWith(countryDigits) ? `+${digits}` : `+${countryDigits}${digits}`;
  return /^\+[1-9]\d{6,14}$/u.test(withCountry) ? withCountry : null;
}
