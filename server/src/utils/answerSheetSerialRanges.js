const SERIAL_NUMBER_PATTERN = /^[A-Z]?\d+$/

const normalizeSerialValue = (value) => String(value ?? '').trim().toUpperCase()

const parseSerialValue = (value) => {
  const normalized = normalizeSerialValue(value)

  if (!normalized || !SERIAL_NUMBER_PATTERN.test(normalized)) {
    return null
  }

  const prefix = normalized.replace(/\d+$/, '')
  const digits = normalized.replace(/\D/g, '')
  const number = parseInt(digits, 10)

  if (Number.isNaN(number)) {
    return null
  }

  return {
    raw: normalized,
    prefix,
    digits,
    number,
    padLength: digits.length
  }
}

const compareParsedSerials = (left, right) => {
  const prefixDiff = left.prefix.localeCompare(right.prefix)
  if (prefixDiff !== 0) return prefixDiff
  return left.number - right.number
}

const normalizeAnswerSheetSerialRanges = ({ serialRanges, serialFrom, serialTo } = {}) => {
  let rawRanges = Array.isArray(serialRanges) ? serialRanges : []

  if (rawRanges.length === 0 && (serialFrom || serialTo)) {
    rawRanges = [{ serialFrom, serialTo }]
  }

  const trimmedRanges = rawRanges
    .map(range => ({
      serialFrom: normalizeSerialValue(range?.serialFrom),
      serialTo: normalizeSerialValue(range?.serialTo)
    }))
    .filter(range => range.serialFrom || range.serialTo)

  if (trimmedRanges.length === 0) {
    throw new Error('At least one serial range is required.')
  }

  const normalizedRanges = trimmedRanges.map((range, index) => {
    if (!range.serialFrom || !range.serialTo) {
      throw new Error(`Range ${index + 1}: both Serial No From and Serial No To are required.`)
    }

    const parsedFrom = parseSerialValue(range.serialFrom)
    const parsedTo = parseSerialValue(range.serialTo)

    if (!parsedFrom || !parsedTo) {
      throw new Error(`Range ${index + 1}: serial numbers must be alphanumeric (optional letter prefix + digits).`)
    }

    if (parsedFrom.prefix !== parsedTo.prefix) {
      throw new Error(`Range ${index + 1}: Serial No From and Serial No To must use the same prefix.`)
    }

    if (parsedTo.number < parsedFrom.number) {
      throw new Error(`Range ${index + 1}: Serial No To must be greater than or equal to Serial No From.`)
    }

    return {
      serialFrom: parsedFrom.raw,
      serialTo: parsedTo.raw,
      prefix: parsedFrom.prefix,
      fromNumber: parsedFrom.number,
      toNumber: parsedTo.number,
      total: parsedTo.number - parsedFrom.number + 1
    }
  })

  normalizedRanges.sort((left, right) => {
    const leftParsed = { prefix: left.prefix, number: left.fromNumber }
    const rightParsed = { prefix: right.prefix, number: right.fromNumber }
    return compareParsedSerials(leftParsed, rightParsed)
  })

  for (let index = 1; index < normalizedRanges.length; index += 1) {
    const previous = normalizedRanges[index - 1]
    const current = normalizedRanges[index]

    if (
      previous.prefix === current.prefix
      && current.fromNumber <= previous.toNumber
    ) {
      throw new Error(
        `Ranges ${index} and ${index + 1} overlap. Please enter non-overlapping serial ranges.`
      )
    }
  }

  return {
    serialRanges: normalizedRanges.map(range => ({
      serialFrom: range.serialFrom,
      serialTo: range.serialTo
    })),
    serialFrom: normalizedRanges[0].serialFrom,
    serialTo: normalizedRanges[normalizedRanges.length - 1].serialTo,
    total: normalizedRanges.reduce((sum, range) => sum + range.total, 0)
  }
}

const getConfiguredSerialRanges = (answerSheet) => {
  try {
    return normalizeAnswerSheetSerialRanges({
      serialRanges: answerSheet?.serialRanges,
      serialFrom: answerSheet?.serialFrom,
      serialTo: answerSheet?.serialTo
    }).serialRanges
  } catch (error) {
    return []
  }
}

const isSerialWithinAnswerSheetRanges = (answerSheet, serial) => {
  const parsedSerial = parseSerialValue(serial)
  if (!parsedSerial) return false

  return getConfiguredSerialRanges(answerSheet).some(range => {
    const parsedFrom = parseSerialValue(range.serialFrom)
    const parsedTo = parseSerialValue(range.serialTo)

    if (!parsedFrom || !parsedTo) return false

    return (
      parsedSerial.prefix === parsedFrom.prefix
      && parsedSerial.number >= parsedFrom.number
      && parsedSerial.number <= parsedTo.number
    )
  })
}

module.exports = {
  SERIAL_NUMBER_PATTERN,
  normalizeSerialValue,
  parseSerialValue,
  normalizeAnswerSheetSerialRanges,
  getConfiguredSerialRanges,
  isSerialWithinAnswerSheetRanges
}
