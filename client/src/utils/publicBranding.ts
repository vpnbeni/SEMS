export type PublicBrandVariant = 'cntr' | 'tmtbl' | 'stdnt'

const FALLBACK_VARIANT: PublicBrandVariant = 'cntr'

const BRAND_META: Record<PublicBrandVariant, { productName: string; subtitle: string }> = {
  cntr: {
    productName: 'Cntr',
    subtitle: 'Exam Centre Control',
  },
  tmtbl: {
    productName: 'Tmtbl',
    subtitle: 'School Timetable Management',
  },
  stdnt: {
    productName: 'Stdnt',
    subtitle: 'Student Information Management',
  },
}

export const getPublicBrandVariant = (): PublicBrandVariant => {
  if (typeof window === 'undefined') {
    return FALLBACK_VARIANT
  }

  const params = new URLSearchParams(window.location.search)
  const brand = params.get('brand')?.trim().toLowerCase()

  if (brand === 'cntr' || brand === 'tmtbl' || brand === 'stdnt') {
    return brand
  }

  const hostname = window.location.hostname.toLowerCase()

  if (
    hostname === 'tmtbl.capabble.cloud' ||
    hostname === 'tmtbl.localhost' ||
    hostname.startsWith('tmtbl.')
  ) {
    return 'tmtbl'
  }

  if (
    hostname === 'stdnt.capabble.cloud' ||
    hostname === 'stdnt.localhost' ||
    hostname.startsWith('stdnt.')
  ) {
    return 'stdnt'
  }

  return FALLBACK_VARIANT
}

export const getPublicBrandMeta = (variant = getPublicBrandVariant()) => BRAND_META[variant]

export const getPublicAppOrigin = () => {
  if (typeof window === 'undefined') {
    return '/'
  }

  return window.location.origin
}

export const getUniversalAuthCopy = () => {
  const brand = getPublicBrandMeta()

  return {
    contextProduct: brand.productName,
    contextSubtitle: brand.subtitle,
    loginTitle: 'One login for every enabled Capabble module',
    loginDescription: `Sign in once to access ${brand.productName} and any other modules enabled for your workspace account.`,
    signupTitle: 'Create one Capabble workspace account',
    signupDescription: `Set up your institution once and use the same Capabble identity across ${brand.productName} and other enabled modules.`,
    forgotTitle: 'Reset your Capabble access',
    forgotDescription: `Verify your account by email and return to ${brand.productName} or any other enabled module.`,
    onboardingTitle: 'Launch your workspace in one chat.',
    onboardingDescription: 'Fast provisioning, secure onboarding ticket, and shared module access from one workspace account.',
  }
}
