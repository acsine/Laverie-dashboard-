import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("LAVERIE ADMIN"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

export const env = publicSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || undefined,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
});

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_ACCESS_TTL: z.coerce.number().default(900),
  SESSION_REFRESH_TTL: z.coerce.number().default(604800),
});

export function getServerEnv() {
  return serverSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    DIRECT_URL: process.env.DIRECT_URL || undefined,
    SESSION_SECRET: process.env.SESSION_SECRET || undefined,
    SESSION_ACCESS_TTL: process.env.SESSION_ACCESS_TTL || undefined,
    SESSION_REFRESH_TTL: process.env.SESSION_REFRESH_TTL || undefined,
  });
}
