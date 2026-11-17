"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: FormEvent) {
    event.preventDefault();
    const handle = username.trim().toLocaleLowerCase("tr");
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      setError("Kullanıcı adı 3-20 karakter, sadece küçük harf, rakam ve _ olabilir.");
      setMessage(null);
      return;
    }

    startTransition(async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) throw new Error("Oturum bulunamadı.");

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            display_name: displayName.trim() || handle,
            username: handle,
            bio: bio.trim() || null,
            avatar_url: avatarUrl.trim() || null,
          })
          .eq("id", authData.user.id);

        if (updateError) {
          throw new Error(
            updateError.message.includes("duplicate")
              ? "Bu kullanıcı adı alınmış."
              : "Profil kaydedilemedi.",
          );
        }

        setUsername(handle);
        setMessage("Profil güncellendi.");
        setError(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Profil kaydedilemedi.");
        setMessage(null);
      }
    });
  }

  return (
    <section className="panel stack-md">
      <h2 className="section-title">Profili düzenle</h2>
      <form onSubmit={save} className="field-grid">
        <label className="field">
          <span className="field-label">Görünen ad</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="input input-muted"
          />
        </label>
        <label className="field">
          <span className="field-label">Kullanıcı adı</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="input input-muted"
          />
        </label>
        <label className="field field-span-2">
          <span className="field-label">Avatar URL (opsiyonel)</span>
          <input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://..."
            className="input input-muted"
          />
        </label>
        <label className="field field-span-2">
          <span className="field-label">Hakkında</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            maxLength={500}
            className="textarea input-muted"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary field-span-2"
        >
          {pending ? "Kaydediliyor..." : "Profili kaydet"}
        </button>
      </form>
      {message ? <p className="alert alert-ok">{message}</p> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
    </section>
  );
}
