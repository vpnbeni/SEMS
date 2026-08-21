/**
 * CBSE-style percentage: five main subjects; an additional subject replaces
 * the lowest main mark when it is higher (best-of for percentage).
 *
 * @param {Array<{ key?: string, marks: number|null|undefined }>} mainSubjects
 * @param {{ key?: string, marks: number|null|undefined }|null|undefined} additionalSubject
 * @param {number} maxMarksPerSubject
 * @returns {{ total: number|null, maxTotal: number, percentage: number|null, replacedKey: string|null }}
 */
const computePercentageWithAdditionalSubject = (
  mainSubjects,
  additionalSubject,
  maxMarksPerSubject = 0
) => {
  const mains = (Array.isArray(mainSubjects) ? mainSubjects : [])
    .map((row) => ({
      key: row?.key ? String(row.key) : null,
      marks: Number.isFinite(Number(row?.marks)) ? Number(row.marks) : null,
    }))
    .filter((row) => row.marks != null);

  if (mains.length === 0) {
    return { total: null, maxTotal: 0, percentage: null, replacedKey: null };
  }

  const additionalMarks =
    additionalSubject != null && Number.isFinite(Number(additionalSubject.marks))
      ? Number(additionalSubject.marks)
      : null;

  let working = mains.map((row) => ({ ...row }));
  let replacedKey = null;

  if (additionalMarks != null) {
    let lowestIndex = 0;
    for (let i = 1; i < working.length; i += 1) {
      if (working[i].marks < working[lowestIndex].marks) lowestIndex = i;
    }
    if (additionalMarks > working[lowestIndex].marks) {
      replacedKey = working[lowestIndex].key;
      working[lowestIndex] = {
        key: additionalSubject?.key ? String(additionalSubject.key) : 'additional',
        marks: additionalMarks,
      };
    }
  }

  const total = working.reduce((sum, row) => sum + row.marks, 0);
  const maxTotal =
    Number.isFinite(maxMarksPerSubject) && maxMarksPerSubject > 0
      ? maxMarksPerSubject * working.length
      : 0;
  const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : null;

  return { total, maxTotal, percentage, replacedKey };
};

module.exports = {
  computePercentageWithAdditionalSubject,
};
