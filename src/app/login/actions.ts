"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerAuthCallbackUrl } from "@/lib/security/origin";

const AUTH_ERROR = "Email hoac mat khau khong hop le.";
const SIGNUP_ERROR = "Dang ky that bai. Vui long kiem tra email va mat khau.";

function parseAuthCredentials(formData: FormData) {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
    return null;
  }

  const email = emailRaw.trim().toLowerCase();
  const password = passwordRaw;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailLooksValid || email.length > 254 || password.length < 6 || password.length > 128) {
    return null;
  }

  return { email, password };
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const data = parseAuthCredentials(formData);

  if (!data) {
    redirect("/login?error=" + encodeURIComponent(AUTH_ERROR));
  }

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect("/login?error=" + encodeURIComponent(AUTH_ERROR));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const data = parseAuthCredentials(formData);

  if (!data) {
    redirect("/login?error=" + encodeURIComponent(SIGNUP_ERROR));
  }

  const { error } = await supabase.auth.signUp({
    ...data,
    options: {
      emailRedirectTo: getServerAuthCallbackUrl("/dashboard"),
    },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(SIGNUP_ERROR));
  }

  revalidatePath("/", "layout");
  redirect("/login?message=" + encodeURIComponent("Kiểm tra email để xác nhận tài khoản!"));
}

export async function loginWithGoogle() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getServerAuthCallbackUrl("/dashboard"),
    },
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent("Dang nhap Google that bai."));
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect("/login?error=" + encodeURIComponent("Dang nhap Google that bai."));
}
