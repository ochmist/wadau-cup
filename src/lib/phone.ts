export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function phoneDigits(cc: string, phone: string) {
  const country = digitsOnly(cc || "254");
  let local = digitsOnly(phone);

  if (local.startsWith("00" + country)) local = local.slice(2);
  if (local.startsWith(country)) return local;
  if (local.startsWith("0")) local = local.slice(1);

  return `${country}${local}`;
}

export function phoneToPoolEmail(cc: string, phone: string) {
  return `${phoneDigits(cc, phone)}@pool.wadau.app`;
}

export function formatPhoneDigits(digits: string) {
  if (digits.startsWith("254") && digits.length === 12) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.startsWith("1") && digits.length === 11) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return digits ? `+${digits}` : "";
}

export function canonicalPhone(cc: string, phone: string) {
  return formatPhoneDigits(phoneDigits(cc, phone));
}

export function displayPhone(phone: string) {
  const digits = digitsOnly(phone);
  if (digits.length === 9) return formatPhoneDigits(`254${digits}`);
  if (digits.length === 10 && digits.startsWith("0")) return formatPhoneDigits(`254${digits.slice(1)}`);
  return formatPhoneDigits(digits);
}
