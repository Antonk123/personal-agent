"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.requestMagicLink(email);
      setSent(true);
    } catch {
      setError("Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center">
          <div className="text-4xl mb-4">📬</div>
          <h1 className="text-xl font-semibold mb-2">Kolla din mail</h1>
          <p className="text-surface-800/60 text-sm">
            Vi har skickat en inloggningslänk till <strong>{email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-1">Byggagent</h1>
        <p className="text-surface-800/60 text-sm mb-6">Din personliga arbetsassistent</p>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium mb-1.5">E-post</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@epost.se"
            className="input-field mb-4"
            required
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Skickar..." : "Skicka inloggningslänk"}
          </button>
        </form>
      </div>
    </div>
  );
}
