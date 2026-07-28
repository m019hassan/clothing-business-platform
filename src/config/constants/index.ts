export const appConstants = {
  defaultAppName: 'clothing-business-platform',
  defaultEnv: 'development',
  defaultUrl: 'http://localhost:3000',
  defaultVersion: '0.1.0',
} as const;

export const featureFlagDefaults = {
  ai: false,
  email: false,
  notifications: false,
  analytics: false,
} as const;
