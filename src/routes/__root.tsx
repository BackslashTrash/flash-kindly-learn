import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { useData } from "../lib/store";
import { refreshCards } from "../lib/cards";
import { sync } from "../lib/sync";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="brut bg-card p-8 text-center">
        <h1 className="text-5xl">404</h1>
        <p className="mt-2">This page doesn't exist.</p>
        <Link to="/" className="btn press mt-6 bg-chem text-on-accent">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="brut bg-card p-8 text-center">
        <h1 className="text-xl">Something went wrong</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn press mt-6 bg-chem text-on-accent"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#FFF8E7" },
      { title: "Recall — retrieval practice" },
      { name: "description", content: "Answer from memory, then check. Spaced review for Chemistry, Geography and Earth and Space." },
      { property: "og:title", content: "Recall — retrieval practice" },
      { property: "og:description", content: "Answer from memory, then check. Spaced review flashcards." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [ready, setReady] = useState(false);
  const { settings } = useData();

  useEffect(() => {
    setReady(true);
    refreshCards();
    sync();
    const { data } = supabase.auth.onAuthStateChange(() => sync());
    window.addEventListener("online", sync);
    const inIframe = window.self !== window.top;
    if ("serviceWorker" in navigator && import.meta.env.PROD && !inIframe) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("online", sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  return (
    <QueryClientProvider client={queryClient}>
      {ready ? <Outlet /> : <div className="min-h-screen" />}
    </QueryClientProvider>
  );
}
