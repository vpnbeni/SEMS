import type { AnswerSheetEntry, AnswerSheetSerialRange } from '../services/answerSheetService'

export interface AnswerSheetSerialRangeInput {
  serialFrom: string
  serialTo: string
}

const SERIAL_NUMBER_PATTERN = /^[A-Z]?\d+$/

export const createEmptySerialRange = (): AnswerSheetSerialRangeInput => ({
  serialFrom: '',
  serialTo: '',
})

export const getAnswerSheetSerialRanges = (
  entry?: Pick<AnswerSheetEntry, 'serialRanges' | 'serialFrom' | 'serialTo'> | null
): AnswerSheetSerialRangeInput[] => {
  if (entry?.serialRanges && entry.serialRanges.length > 0) {
    return entry.serialRanges.map((range) => ({
      serialFrom: String(range.serialFrom ?? ''),
      serialTo: String(range.serialTo ?? ''),
    }))
  }

  if (entry?.serialFrom || entry?.serialTo) {
    return [{
      serialFrom: String(entry.serialFrom ?? ''),
      serialTo: String(entry.serialTo ?? ''),
    }]
  }

  return [createEmptySerialRange()]
}

const normalizeSerial = (value: string) => String(value ?? '').trim().toUpperCase()

const getSerialPrefix = (value: string) => normalizeSerial(value).replace(/\d+$/, '')

export const validateSerialRangeInputs = (
  ranges: AnswerSheetSerialRangeInput[],
  options: { allowMultiple: boolean }
): { serialRanges?: AnswerSheetSerialRange[]; error?: string } => {
  const normalizedRanges = ranges
    .map((range) => ({
      serialFrom: normalizeSerial(range.serialFrom),
      serialTo: normalizeSerial(range.serialTo),
    }))
    .filter((range) => range.serialFrom || range.serialTo)

  if (normalizedRanges.length === 0) {
    return { error: 'Please enter at least one serial range' }
  }

  if (!options.allowMultiple && normalizedRanges.length > 1) {
    return { error: 'Only one serial range is allowed for this answer sheet type' }
  }

  for (let index = 0; index < normalizedRanges.length; index += 1) {
    const range = normalizedRanges[index]

    if (!range.serialFrom || !range.serialTo) {
      return { error: `Range ${index + 1}: both serial numbers are required` }
    }

    if (!SERIAL_NUMBER_PATTERN.test(range.serialFrom) || !SERIAL_NUMBER_PATTERN.test(range.serialTo)) {
      return { error: `Range ${index + 1}: enter a valid serial number` }
    }

    if (getSerialPrefix(range.serialFrom) !== getSerialPrefix(range.serialTo)) {
      return { error: `Range ${index + 1}: From and To must use the same prefix` }
    }

    const fromNum = parseInt(range.serialFrom.replace(/\D/g, ''), 10)
    const toNum = parseInt(range.serialTo.replace(/\D/g, ''), 10)

    if (Number.isNaN(fromNum) || Number.isNaN(toNum)) {
      return { error: `Range ${index + 1}: enter a valid serial number` }
    }

    if (toNum < fromNum) {
      return { error: `Range ${index + 1}: Serial To must be greater than or equal to Serial From` }
    }
  }

  return { serialRanges: normalizedRanges }
}

export const formatSerialRangeLabel = (range: AnswerSheetSerialRangeInput) =>
  `${range.serialFrom} - ${range.serialTo}`
