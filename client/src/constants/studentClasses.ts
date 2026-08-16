export const STUDENT_CLASS_OPTIONS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
] as const

export type StudentClassOption = (typeof STUDENT_CLASS_OPTIONS)[number]

const SENIOR_SECONDARY_SECTION_ORDER = ['science', 'commerce', 'humanities'] as const

export const isSeniorSecondaryClass = (className: string) => {
  const key = String(className || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  return /^(11th|12th|11|12|xi|xii|class11|class12)$/.test(key)
}

export const sortSectionNames = (left: string, right: string, className = '') => {
  if (isSeniorSecondaryClass(className)) {
    const rank = (name: string) => {
      const index = SENIOR_SECONDARY_SECTION_ORDER.indexOf(
        String(name || '').trim().toLowerCase() as (typeof SENIOR_SECONDARY_SECTION_ORDER)[number]
      )
      return index === -1 ? 1000 : index
    }
    const diff = rank(left) - rank(right)
    if (diff !== 0) return diff
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}
