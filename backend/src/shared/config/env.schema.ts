import { z } from 'zod';

const jwtExpiresInSchema = z
  .string()
  .regex(/^\d+(\.\d+)?(ms|s|m|h|d|w|y)?$/)
  .default('1d');

const booleanStringSchema = z.preprocess((value) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}, z.boolean());

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  FRONTEND_URL: z.string().url().default('http://localhost:4200'),
  FRONTEND_URLS: z.string().optional(),
  HTTPS_ENABLED: booleanStringSchema.default(false),
  HTTPS_KEY_PATH: z.string().optional(),
  HTTPS_CERT_PATH: z.string().optional(),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().int().positive().default(5432),
  DATABASE_NAME: z.string().default('weblive2026'),
  DATABASE_USER: z.string().default('weblive'),
  DATABASE_PASSWORD: z.string().default('weblive_dev_password'),
  DATABASE_SSL: booleanStringSchema.default(false),
  DATABASE_SYNCHRONIZE: booleanStringSchema.default(false),
  JWT_SECRET: z.string().min(16).default('change_me_in_real_environments'),
  JWT_EXPIRES_IN: jwtExpiresInSchema,
});

export type EnvSchema = z.infer<typeof envSchema>;
