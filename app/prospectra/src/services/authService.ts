import { getSupabaseClient } from "../config/supabaseClient";
import type {
  AuthResponse,
  LoginCredentials,
  SignupCredentials,
} from "../types/auth";

export type { AuthResponse, LoginCredentials, SignupCredentials };

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
