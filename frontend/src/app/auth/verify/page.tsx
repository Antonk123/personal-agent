"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Ingen token hittades.");
      return;
    }

    api
      .verifyToken(token)
      .then(async (data) => {
        setSession(data.session_token);
        // Check if onboarding needed
        try {
          const profile = await api.getProfile();
          if (!profile || !profile.onboarding_completed) {
            router.push("/onboarding");
            return;
          }
        } catch {}
        router.push("/chat");
      })
      .catch(() => {
        setError("Länken är ogiltig eller har gått ut.");
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <a href="/auth/login" className="btn-primary inline-block">Tillbaka</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-surface-800/60">Verifierar...</p>
    </div>
  );
}
