/**
 * Client-side DB access — re-exports the server shim so that wallet-service
 * and any other shared code that previously imported the browser Supabase client
 * continue to work unchanged. All reads/writes go through Neon via server-side
 * API routes; this module should only be used in Server Components or Route Handlers.
 */
export { createClient } from "@/lib/supabase/server"
