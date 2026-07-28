export const env = {
  appName: process.env.APP_NAME ?? 'clothing-business-platform',
  appEnv: process.env.APP_ENV ?? 'development',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  appVersion: process.env.APP_VERSION ?? '0.1.0',

  databaseUrl: process.env.DATABASE_URL ?? '',

  authSecret: process.env.AUTH_SECRET ?? '',
  authUrl: process.env.AUTH_URL ?? 'http://localhost:3000',

  storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
  storagePath: process.env.STORAGE_PATH ?? './storage',

  smtpHost: process.env.SMTP_HOST ?? 'localhost',
  smtpPort: process.env.SMTP_PORT ?? '587',
  smtpUsername: process.env.SMTP_USERNAME ?? '',

  paymentProvider: process.env.PAYMENT_PROVIDER ?? 'placeholder',

  openAiApiKey: process.env.OPENAI_API_KEY ?? '',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  whatsappProvider: process.env.WHATSAPP_PROVIDER ?? 'placeholder',

  logLevel: process.env.LOG_LEVEL ?? 'info',

  enableAi: process.env.ENABLE_AI === 'true',
  enableEmail: process.env.ENABLE_EMAIL === 'true',
  enableNotifications: process.env.ENABLE_NOTIFICATIONS === 'true',
  enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',

  backupEnabled: process.env.BACKUP_ENABLED === 'true',
  backupPath: process.env.BACKUP_PATH ?? './backups',
};

export type AppEnv = typeof env;
