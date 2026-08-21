/**
 * Pairs a house colour (background) with the heading text colour used on banners.
 * Light / yellow grounds use black text for readability.
 */
export const HOUSE_COLOR_HEADING_PAIRS = [
  { houseColor: '#fff700', headingText: '#000000' }, // Sun / yellow
  { houseColor: '#ffff00', headingText: '#000000' },
  { houseColor: '#ff0', headingText: '#000000' },
  { houseColor: '#ffef00', headingText: '#000000' },
  { houseColor: '#ffd700', headingText: '#000000' }, // gold
  { houseColor: '#facc15', headingText: '#000000' }, // amber-400
  { houseColor: '#fde047', headingText: '#000000' }, // yellow-300
  { houseColor: '#fef08a', headingText: '#000000' }, // yellow-200
  { houseColor: '#ffffff', headingText: '#000000' },
  { houseColor: '#fff', headingText: '#000000' },
] as const

export const DEFAULT_HOUSE_HEADING_TEXT = '#ffffff'

/** Expand #rgb → #rrggbb and lowercase for lookups. */
export const normalizeHouseColorKey = (value = '') => {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  const hex = raw.startsWith('#') ? raw : `#${raw}`
  const short = /^#([0-9a-f]{3})$/i.exec(hex)
  if (short) {
    const [, digits] = short
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`
  }
  const long = /^#([0-9a-f]{6})$/i.exec(hex)
  return long ? `#${long[1]}` : ''
}

const HEADING_BY_COLOR = new Map(
  HOUSE_COLOR_HEADING_PAIRS.map((pair) => [
    normalizeHouseColorKey(pair.houseColor),
    pair.headingText,
  ])
)

const relativeLuminance = (hex: string) => {
  const key = normalizeHouseColorKey(hex)
  if (!key) return 0
  const n = parseInt(key.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** Heading / banner text colour for a house colour (metadata pairs first, then luminance). */
export const getHouseHeadingTextColor = (houseColor = '') => {
  const key = normalizeHouseColorKey(houseColor)
  if (key && HEADING_BY_COLOR.has(key)) {
    return HEADING_BY_COLOR.get(key)!
  }
  if (key && relativeLuminance(key) > 0.65) {
    return '#000000'
  }
  return DEFAULT_HOUSE_HEADING_TEXT
}

export const usesDarkHouseHeading = (houseColor = '') =>
  getHouseHeadingTextColor(houseColor).toLowerCase() === '#000000'
