"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="login-surface">
      <p className="eyebrow">Your private working space</p>
      <h1>Lead Workspace</h1>
      <p className="supporting">
        Sign in to import, review and prepare your leads.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const password = new FormData(e.currentTarget).get("password");
          setBusy(true);
          try {
            const res = await fetch("/api/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            router.push("/");
            router.refresh();
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Sign-in failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Workspace password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? "Signing in…" : "Open workspace"}
        </button>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
