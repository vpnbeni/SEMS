/**
 * CBSE-style percentage helper (client): additional subject replaces lowest main mark.
 */
export const computePercentageWithAdditionalSubject = (
  mainSubjects: Array<{ key?: string; marks: number | null | undefined }>,
  additionalSubject: { key?: string; marks: number | null | undefined } | null | undefined,
  maxMarksPerSubject = 0
) => {
  const mains = (Array.isArray(mainSubjects) ? mainSubjects : [])
    .map((row) => ({
      key: row?.key ? String(row.key) : null,
      marks: Number.isFinite(Number(row?.marks)) ? Number(row.marks) : null,
    }))
    .filter((row) => row.marks != null) as Array<{ key: string | null; marks: number }>

  if (mains.length === 0) {
    return { total: null as number | null, maxTotal: 0, percentage: null as number | null, replacedKey: null as string | null }
  }

  const additionalMarks =
    additionalSubject != null && Number.isFinite(Number(additionalSubject.marks))
      ? Number(additionalSubject.marks)
      : null

  const working = mains.map((row) => ({ ...row }))
  let replacedKey: string | null = null

  if (additionalMarks != null) {
    let lowestIndex = 0
    for (let i = 1; i < working.length; i += 1) {
      if (working[i].marks < working[lowestIndex].marks) lowestIndex = i
    }
    if (additionalMarks > working[lowestIndex].marks) {
      replacedKey = working[lowestIndex].key
      working[lowestIndex] = {
        key: additionalSubject?.key ? String(additionalSubject.key) : 'additional',
        marks: additionalMarks,
      }
    }
  }

  const total = working.reduce((sum, row) => sum + row.marks, 0)
  const maxTotal =
    Number.isFinite(maxMarksPerSubject) && maxMarksPerSubject > 0
      ? maxMarksPerSubject * working.length
      : 0
  const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : null

  return { total, maxTotal, percentage, replacedKey }
}
