import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PURPLE_FABRIC_ENDPOINT: z.string().url(),
  PURPLE_FABRIC_WEB_BASE_URL: z.string().default(''),
  PURPLE_FABRIC_TENANT: z.string().min(1),
  PURPLE_FABRIC_API_KEY: z.string().min(1),
  PURPLE_FABRIC_USERNAME: z.string().min(1),
  PURPLE_FABRIC_PASSWORD: z.string().min(1),
  PURPLE_FABRIC_WORKSPACE_ID: z.string().min(1),
  PURPLE_FABRIC_API_VERSION: z.string().default('v1'),
  PURPLE_FABRIC_TOKEN_REFRESH_BUFFER_MS: z.coerce.number().int().positive().default(30000),
  PURPLE_FABRIC_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${message}`);
}

function deriveWebBaseUrl(apiEndpoint: string, explicitBaseUrl: string): string {
  if (explicitBaseUrl.trim()) return explicitBaseUrl.replace(/\/+$/, '');
  return apiEndpoint
    .replace(/\/+$/, '')
    .replace('https://api.', 'https://')
    .replace('http://api.', 'http://');
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  apiPrefix: parsed.data.API_PREFIX,
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
  purpleFabric: {
    endpoint: parsed.data.PURPLE_FABRIC_ENDPOINT.replace(/\/+$/, ''),
    webBaseUrl: deriveWebBaseUrl(parsed.data.PURPLE_FABRIC_ENDPOINT, parsed.data.PURPLE_FABRIC_WEB_BASE_URL),
    tenant: parsed.data.PURPLE_FABRIC_TENANT,
    apiKey: parsed.data.PURPLE_FABRIC_API_KEY,
    username: parsed.data.PURPLE_FABRIC_USERNAME,
    password: parsed.data.PURPLE_FABRIC_PASSWORD,
    workspaceId: parsed.data.PURPLE_FABRIC_WORKSPACE_ID,
    apiVersion: parsed.data.PURPLE_FABRIC_API_VERSION,
    tokenRefreshBufferMs: parsed.data.PURPLE_FABRIC_TOKEN_REFRESH_BUFFER_MS,
    timeoutMs: parsed.data.PURPLE_FABRIC_TIMEOUT_MS,
  },
};
