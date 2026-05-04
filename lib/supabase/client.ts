/**
 * Supabase browser client stub — replaced by pg pool on server.
 * Client-side code that called createClient() for auth is now a no-op.
 */
export function createClient() {
  return {
    from: (_table: string) => ({
      select: () => ({ data: null, error: { message: "Client-side DB queries not supported" } }),
    }),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  }
}
