import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  Book,
  BookComment,
  MediaItem,
  Profile,
  PublicReadBook,
} from "@/lib/types";

export type SessionUser = {
  id: string;
  email: string | null;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,bio,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
});

export async function listMyBooks(): Promise<Book[]> {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Book[];
}

export async function listMyMedia(): Promise<MediaItem[]> {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("media_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MediaItem[];
}

export async function getMyBook(id: string): Promise<Book | null> {
  const user = await requireUser();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as Book | null) ?? null;
}

export async function getPublicProfile(
  username: string,
): Promise<Profile | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,display_name,avatar_url,bio,created_at,updated_at")
    .eq("username", username.toLocaleLowerCase("tr"))
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function listPublicReadBooks(
  userId: string,
): Promise<PublicReadBook[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("profile_read_books", {
    p_user_id: userId,
  });
  if (error) throw error;
  return (data ?? []) as PublicReadBook[];
}

export async function listPublicComments(
  userId: string,
): Promise<BookComment[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("book_comments")
    .select(
      "id,user_id,book_id,title,authors,cover_url,isbn,isbn13,rating,body,finished_at,created_at,updated_at",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BookComment[];
}
