import { Link } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/stats", label: "Stats" },
  { to: "/settings", label: "Settings" },
] as const;

export function Page({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-6">
      {title && <h1 className="mb-6 text-3xl">{title}</h1>}
      {children}
      <nav className="fixed inset-x-0 bottom-0 border-t-[3px] border-ink bg-background px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className="flex min-h-[48px] items-center justify-center rounded-[6px] font-bold"
              activeProps={{ className: "brut bg-chem text-on-accent" }}
              activeOptions={{ exact: true }}
            >
              {i.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
