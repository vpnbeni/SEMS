import { getCanonicalSectionName, normalizeSectionKey } from './sectionMetadata'

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
const JUNIOR_SECTION_ORDER = ['rose', 'lily', 'lotus', 'tulip'] as const

export const isSeniorSecondaryClass = (className: string) => {
  const key = String(className || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  return /^(11th|12th|11|12|xi|xii|class11|class12)$/.test(key)
}

export const sortClassNames = (left: string, right: string) => {
  const rank = (name: string) => {
    const index = STUDENT_CLASS_OPTIONS.findIndex(
      (item) => item.toLowerCase() === String(name || '').trim().toLowerCase()
    )
    return index === -1 ? 1000 : index
  }
  const diff = rank(left) - rank(right)
  if (diff !== 0) return diff
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}

export const sortSectionNames = (left: string, right: string, className = '') => {
  const ordered: readonly string[] = isSeniorSecondaryClass(className)
    ? SENIOR_SECONDARY_SECTION_ORDER
    : JUNIOR_SECTION_ORDER
  const rank = (name: string) => {
    const canonical = normalizeSectionKey(getCanonicalSectionName(name))
    const index = ordered.indexOf(canonical as (typeof ordered)[number])
    return index === -1 ? 1000 : index
  }
  const diff = rank(left) - rank(right)
  if (diff !== 0) return diff
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}
