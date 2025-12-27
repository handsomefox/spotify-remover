"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import ThemeSwitcher from "@/components/theme-switcher";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        enableColorScheme
      >
        {children}
        <ThemeSwitcher />
      </ThemeProvider>
    </SessionProvider>
  );
}
