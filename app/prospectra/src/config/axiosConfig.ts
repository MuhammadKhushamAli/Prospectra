import axios from "axios";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseAxios = axios.create({
  baseURL: supabaseUrl,
  headers: {
    ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    "Content-Type": "application/json",
  },
});

export function ensureSupabaseConfig(): void {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
}
