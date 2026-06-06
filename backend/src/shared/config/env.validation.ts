import { envSchema, EnvSchema } from './env.schema';

export function envValidation(config: Record<string, unknown>): EnvSchema {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment variables: ${result.error.message}`);
  }

  return result.data;
}
