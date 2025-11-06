/**
 * Fixed Answer Sheet Types from PDF
 * These types are always visible regardless of whether sheets have been received
 * Similar to how subjects are fixed in the datesheet module
 */

const ANSWER_SHEET_TYPES = [
  {
    sortOrder: 1,
    answerSheetType: 'Main',
    pages: 32,
    colour: 'Red',
    class: '10',
    suffix: 'O'
  },
  {
    sortOrder: 2,
    answerSheetType: 'Main',
    pages: 32,
    colour: 'Blue',
    class: '12',
    suffix: 'P'
  },
  {
    sortOrder: 3,
    answerSheetType: 'Main',
    pages: 20,
    colour: 'Red',
    class: '10',
    suffix: 'A'
  },
  {
    sortOrder: 4,
    answerSheetType: 'Main',
    pages: 20,
    colour: 'Blue',
    class: '12',
    suffix: 'A'
  },
  {
    sortOrder: 5,
    answerSheetType: 'Graph',
    pages: 40,
    colour: 'Red',
    class: '10',
    suffix: 'A'
  },
  {
    sortOrder: 6,
    answerSheetType: 'Graph',
    pages: 40,
    colour: 'Blue',
    class: '12',
    suffix: 'A'
  },
  {
    sortOrder: 7,
    answerSheetType: 'Supplementary',
    pages: 16,
    colour: 'Yellow',
    class: '10',
    suffix: 'G'
  },
  {
    sortOrder: 8,
    answerSheetType: 'Supplementary',
    pages: 16,
    colour: 'Pink',
    class: '12',
    suffix: 'H'
  },
  {
    sortOrder: 9,
    answerSheetType: 'For Blind',
    pages: 32,
    colour: 'Red',
    class: '10',
    suffix: 'B'
  },
  {
    sortOrder: 10,
    answerSheetType: 'For Blind',
    pages: 32,
    colour: 'Blue',
    class: '12',
    suffix: 'B'
  },
  {
    sortOrder: 11,
    answerSheetType: 'Drawing Sheets',
    pages: 21,
    colour: 'White',
    class: '12',
    suffix: 'D'
  }
]

module.exports = { ANSWER_SHEET_TYPES }
