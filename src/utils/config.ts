/**
 * Centralized configuration for the public R2 bucket URL.
 * The hardcoded fallback must match the production bucket's public domain.
 * If the bucket domain ever changes, update it here in one place.
 */
export const R2_PUBLIC_URL: string =
  process.env.R2_PUBLIC_URL || 'https://pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev';
