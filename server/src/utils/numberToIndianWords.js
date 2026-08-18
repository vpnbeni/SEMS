const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
  'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

const twoDigit = (value) => {
  if (value < 20) return ONES[value];
  const ten = Math.floor(value / 10);
  const one = value % 10;
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ''}`.trim();
};

const threeDigit = (value) => {
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  const parts = [];
  if (hundred) parts.push(`${ONES[hundred]} HUNDRED`);
  if (rest) parts.push(twoDigit(rest));
  return parts.join(' ');
};

const numberToIndianWords = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits) return String(raw || '').trim().toUpperCase();

  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return digits;
  if (n === 0) return 'ZERO ONLY';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const parts = [];

  if (crore) parts.push(`${threeDigit(crore)} CRORE`);
  if (lakh) parts.push(`${threeDigit(lakh)} LAKH`);
  if (thousand) parts.push(`${threeDigit(thousand)} THOUSAND`);
  if (hundred) parts.push(threeDigit(hundred));

  return `${parts.join(' ')} ONLY`;
};

module.exports = { numberToIndianWords };
