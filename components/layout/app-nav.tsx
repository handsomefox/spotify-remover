import Link from "next/link";

const navItems = [
  { href: "/", label: "Cleanup flow" },
  { href: "/duplicates", label: "Duplicate finder" },
  { href: "/archives", label: "Archive cleanup" },
];

type AppNavProps = {
  activePath: string;
};

export default function AppNav({ activePath }: AppNavProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
      {navItems.map((item, index) => {
        const isActive = activePath === item.href;
        return (
          <span key={item.href} className="flex items-center gap-3">
            {isActive ? (
              <span className="text-emerald-700 dark:text-emerald-300">
                {item.label}
              </span>
            ) : (
              <Link
                className="hover:text-slate-700 dark:hover:text-slate-200"
                href={item.href}
              >
                {item.label}
              </Link>
            )}
            {index < navItems.length - 1 && (
              <span className="text-slate-300 dark:text-slate-600">/</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
