"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const themes = [
  { id: "system", label: "Auto" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm font-semibold uppercase tracking-[0.18em] shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {themes.map((entry) => {
          const isActive = theme === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={isActive}
              aria-label={`Set theme to ${entry.label}`}
              onClick={() => setTheme(entry.id)}
              className={`rounded-full px-3 py-2 transition ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-emerald-400 dark:text-emerald-950"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
