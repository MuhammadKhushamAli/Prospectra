import { getSupabaseClient } from "../config/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

export interface LoginCredentials {
  email: string;
  password: string;
}
export interface SignupCredentials {
  fullName: string;
  email: string;
  password: string;
}
export interface AuthResponse {
  session: Session | null;
  user: User;
}

export async function loginWithSupabase(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const { data, error } =
    await getSupabaseClient().auth.signInWithPassword(credentials);
  if (error) throw error;
  if (!data.user || !data.session)
    throw new Error("Supabase did not return an authenticated session.");
  return { session: data.session, user: data.user };
}

export async function signupWithSupabase(
  credentials: SignupCredentials,
): Promise<AuthResponse> {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: { data: { full_name: credentials.fullName } },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not return a created user.");
  return { session: data.session, user: data.user };
}
