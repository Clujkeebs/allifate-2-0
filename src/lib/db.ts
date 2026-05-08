// Re-export supabase typed as `any` so pages can use db.from(...) without TS inference issues
export { db } from './supabase'
