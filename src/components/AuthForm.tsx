"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/giris/actions";

type AuthFormProps = {
  next?: string;
  callbackError?: boolean;
};

export function AuthForm({ next = "/", callbackError }: AuthFormProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(
    signIn,
    undefined,
  );
  const [signupState, signupAction, signupPending] = useActionState<
    AuthState,
    FormData
  >(signUp, undefined);

  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;
  const action = mode === "login" ? loginAction : signupAction;

  return (
    <section className="panel stack-md auth-panel">
      <div className="auth-tabs" role="tablist" aria-label="Giriş yöntemi">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={`btn ${mode === "login" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("login")}
        >
          Giriş yap
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={`btn ${mode === "signup" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setMode("signup")}
        >
          Kayıt ol
        </button>
      </div>

      {callbackError ? (
        <p className="alert alert-error">Oturum açılamadı, tekrar dene.</p>
      ) : null}

      <form action={action} className="stack-md">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" ? (
          <>
            <label className="field">
              <span className="field-label">Görünen ad</span>
              <input
                name="displayName"
                className="input input-muted"
                placeholder="Örnek: Ayşe'nin kitapları"
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span className="field-label">Kullanıcı adı</span>
              <input
                name="username"
                className="input input-muted"
                placeholder="ornek_kullanici (opsiyonel)"
                autoComplete="username"
              />
              <span className="muted-note">
                Profil adresin: /profil/kullaniciadi
              </span>
            </label>
          </>
        ) : null}
        <label className="field">
          <span className="field-label">E-posta</span>
          <input
            name="email"
            type="email"
            required
            className="input input-muted"
            placeholder="ornek@eposta.com"
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span className="field-label">Şifre</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="input input-muted"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending
            ? " Bekleniyor..."
            : mode === "login"
              ? "Giriş yap"
              : "Hesap oluştur"}
        </button>

        {state?.error ? <p className="alert alert-error">{state.error}</p> : null}
        {state?.message ? <p className="alert alert-ok">{state.message}</p> : null}
      </form>
    </section>
  );
}
