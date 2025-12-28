import type { ReactNode } from "react";

type AppShellProps = {
  header: ReactNode;
  children: ReactNode;
};

export default function AppShell({ header, children }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-12">
        {header}
        <main className="mt-12">{children}</main>
      </div>
    </div>
  );
}
