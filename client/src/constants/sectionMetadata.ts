export const SECTION_CATALOG = [
  {
    displayName: 'Science',
    abbreviations: ['Sci', 'Sci.', 'SCI', 'SCI.', 'Science'],
  },
  {
    displayName: 'Commerce',
    abbreviations: ['Comm', 'Comm.', 'COMM', 'COMM.', 'Commerce'],
  },
  {
    displayName: 'Humanities',
    abbreviations: ['Hum', 'Hum.', 'HUM', 'HUM.', 'Arts', 'Humanities'],
  },
] as const

export const normalizeSectionKey = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')

export const findMetadataForSection = (sectionName: string) => {
  const key = normalizeSectionKey(sectionName)
  if (!key) return null

  return (
    SECTION_CATALOG.find((entry) => {
      if (normalizeSectionKey(entry.displayName) === key) return true
      return entry.abbreviations.some((item) => normalizeSectionKey(item) === key)
    }) || null
  )
}

export const getCanonicalSectionName = (sectionName: string) => {
  const trimmed = String(sectionName || '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  const metadata = findMetadataForSection(trimmed)
  return metadata ? metadata.displayName : trimmed
}

export const getSectionDisplayName = (sectionName: string) => getCanonicalSectionName(sectionName)

export const normalizeAllowedSections = (sections: string[] = []) => {
  const canonical: string[] = []
  const seen = new Set<string>()

  sections.forEach((sectionName) => {
    const value = getCanonicalSectionName(sectionName)
    const key = normalizeSectionKey(value)
    if (!key || seen.has(key)) return
    seen.add(key)
    canonical.push(value)
  })

  return canonical
}

export const resolveSectionAgainstAllowed = (input: string, allowedSections: string[] = []) => {
  const normalizedInput = String(input || '').trim().replace(/\s+/g, ' ')
  const inputKey = normalizeSectionKey(normalizedInput)

  if (!inputKey) {
    return { section: '', error: 'Section is required.' }
  }

  const uniqueAllowed = normalizeAllowedSections(allowedSections)
  if (uniqueAllowed.length === 0) {
    return { section: getCanonicalSectionName(normalizedInput), error: null }
  }

  for (const allowedSection of uniqueAllowed) {
    const matrixSection =
      allowedSections.find(
        (item) =>
          normalizeSectionKey(getCanonicalSectionName(item)) === normalizeSectionKey(allowedSection)
      ) || allowedSection

    const matchKeys = new Set<string>()
    matchKeys.add(normalizeSectionKey(matrixSection))
    const metadata = findMetadataForSection(matrixSection)
    if (metadata) {
      matchKeys.add(normalizeSectionKey(metadata.displayName))
      metadata.abbreviations.forEach((item) => matchKeys.add(normalizeSectionKey(item)))
    }

    if (matchKeys.has(inputKey)) {
      return { section: allowedSection, error: null }
    }
  }

  return {
    section: normalizedInput,
    error: `Section "${normalizedInput}" is not configured for this class in Class Section Matrix.`,
  }
}
