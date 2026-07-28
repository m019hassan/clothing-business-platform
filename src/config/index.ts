export * from './env';
export * from './constants';

export const appConfig = {
  appName: process.env.APP_NAME ?? 'clothing-business-platform',
  appEnv: process.env.APP_ENV ?? 'development',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  appVersion: process.env.APP_VERSION ?? '0.1.0',
};

export const featureFlags = {
  enableAi: process.env.ENABLE_AI === 'true',
  enableEmail: process.env.ENABLE_EMAIL === 'true',
  enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
  enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
};
