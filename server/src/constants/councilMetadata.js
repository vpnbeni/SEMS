/**
 * Default posts seeded when school / house councils are created.
 * Keep in sync with client/src/constants/councilMetadata.ts
 */
const DEFAULT_SCHOOL_COUNCIL_POSTS = [
  'Head Boy',
  'Head Girl',
  'Sports Captain',
  'Cultural Captain',
  'Discipline Prefect',
];

const DEFAULT_HOUSE_COUNCIL_POSTS = [
  'House Captain',
  'Vice Captain',
  'Sports Captain',
  'Cultural Captain',
  'Prefect',
];

/** Roles shown when manually adding a house council member on the house detail page. */
const HOUSE_COUNCIL_MEMBER_ROLES = [
  'House Captain',
  'Vice Captain',
  'Secretary',
  'Prefect',
  'Sports Captain',
  'Cultural Captain',
  'Member',
];

module.exports = {
  DEFAULT_SCHOOL_COUNCIL_POSTS,
  DEFAULT_HOUSE_COUNCIL_POSTS,
  HOUSE_COUNCIL_MEMBER_ROLES,
};
