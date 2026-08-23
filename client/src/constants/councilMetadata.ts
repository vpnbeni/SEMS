/**
 * Default posts / roles for student councils.
 * Keep in sync with server/src/constants/councilMetadata.js
 */
export const DEFAULT_SCHOOL_COUNCIL_POSTS = [
  'Head Boy',
  'Head Girl',
  'Sports Captain',
  'Cultural Captain',
  'Discipline Prefect',
] as const

export const DEFAULT_HOUSE_COUNCIL_POSTS = [
  'House Captain',
  'Vice Captain',
  'Sports Captain',
  'Cultural Captain',
  'Prefect',
] as const

/** Roles shown when manually adding a house council member on the house detail page. */
export const HOUSE_COUNCIL_MEMBER_ROLES = [
  'House Captain',
  'Vice Captain',
  'Secretary',
  'Prefect',
  'Sports Captain',
  'Cultural Captain',
  'Member',
] as const
