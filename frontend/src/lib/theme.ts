"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function systemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return systemTheme();
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      document.documentElement.setAttribute("data-theme", saved);
      setThemeState(saved);
    } else {
      setThemeState(systemTheme());
    }
    setMounted(true);
  }, []);

  function setTheme(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setThemeState(next);
  }

  function toggle() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return { theme, setTheme, toggle, mounted };
}
