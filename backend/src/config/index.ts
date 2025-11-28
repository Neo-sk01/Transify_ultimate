import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    encryptionKey: process.env.ENCRYPTION_KEY || 'dev-key-change-in-production',
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/transrify',
  },
  
  services: {
    smsApiKey: process.env.SMS_API_KEY,
    pushNotificationKey: process.env.PUSH_NOTIFICATION_KEY,
    emailApiKey: process.env.EMAIL_API_KEY,
  },
  
  mtls: {
    certPath: process.env.MTLS_CERT_PATH,
    keyPath: process.env.MTLS_KEY_PATH,
  },
} as const;

export type Config = typeof config;
