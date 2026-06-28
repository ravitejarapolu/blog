import { BriefcaseBusiness, Home, MessageCircle, Monitor, Moon, Newspaper, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyThemeMode,
  getStoredThemeMode,
  setStoredThemeMode,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "../scripts/theme";

const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
const themeOrder: ThemeMode[] = ["system", "light", "dark"];

const navItems = [
  { href: baseUrl || "/", label: "Home", icon: Home, match: "home" },
  { href: `${baseUrl}/blogs`, label: "Posts", icon: Newspaper, match: "blogs" },
  { href: `${baseUrl}/#portfolio`, label: "Work", icon: BriefcaseBusiness, match: "work" },
];

const themeLabels: Record<ThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export default function SiteNav() {
  const [path, setPath] = useState("");
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const initialMode = getStoredThemeMode();
    setMode(initialMode);
    applyThemeMode(initialMode);
    setPath(window.location.pathname + window.location.hash);

    function handleThemeChange(event: Event) {
      const nextMode = (event as CustomEvent<ThemeMode>).detail;
      if (nextMode) {
        setMode(nextMode);
      }
    }

    function handleLocationChange() {
      setPath(window.location.pathname + window.location.hash);
    }

    function handleSystemChange() {
      if (getStoredThemeMode() === "system") {
        applyThemeMode("system");
      }
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    media.addEventListener("change", handleSystemChange);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
      media.removeEventListener("change", handleSystemChange);
    };
  }, []);

  function cycleTheme() {
    const nextMode = themeOrder[(themeOrder.indexOf(mode) + 1) % themeOrder.length];
    setStoredThemeMode(nextMode);
  }

  const isChatActive = path === `${baseUrl}/chat` || path === `${baseUrl}/chat/`;

  return (
    <header className="fixed inset-x-0 top-0 z-[65] px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pointer-events-none">
      <nav
        className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2 rounded-full border border-default bg-surface/92 px-2 py-2 text-default shadow-[0_14px_44px_rgb(1_9_32_/_16%)] ring-1 ring-default/15 backdrop-blur-xl pointer-events-auto"
        aria-label="Primary navigation"
      >
        <a
          href={baseUrl || "/"}
          className="flex h-10 shrink-0 items-center rounded-full px-3 text-base font-black tracking-tight text-default transition hover:bg-offset focus:outline-none focus:ring-2 focus:ring-secondary/70"
          aria-label="Ravi home"
        >
          Ravi<span className="text-secondary">.</span>
        </a>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.match === "home"
                ? path === `${baseUrl}/` || path === baseUrl || path === "/"
                : item.match === "blogs"
                  ? path.startsWith(`${baseUrl}/blogs`)
                  : path.includes("#portfolio");

            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 min-w-10 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-secondary/70 sm:px-4 ${
                  active
                    ? "bg-offset text-default"
                    : "text-offset hover:bg-offset hover:text-default"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </a>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={cycleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full text-offset transition hover:bg-offset hover:text-default focus:outline-none focus:ring-2 focus:ring-secondary/70"
            aria-label={`Theme: ${themeLabels[mode]}. Click to switch theme.`}
            title={`Theme: ${themeLabels[mode]}`}
          >
            <ThemeIcon mode={mode} />
          </button>
          <a
            href={`${baseUrl}/chat`}
            aria-current={isChatActive ? "page" : undefined}
            className={`flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-black shadow-[0_8px_0_#010920] transition hover:-translate-y-0.5 hover:shadow-[0_10px_0_#010920] focus:outline-none focus:ring-2 focus:ring-secondary/70 ${
              isChatActive
                ? "bg-tertiary text-[#010920]"
                : "bg-primary text-[#010920]"
            }`}
          >
            <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
            <span>Chat</span>
          </a>
        </div>
      </nav>
    </header>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return <Sun className="h-[18px] w-[18px]" aria-hidden="true" />;
  }

  if (mode === "dark") {
    return <Moon className="h-[18px] w-[18px]" aria-hidden="true" />;
  }

  return <Monitor className="h-[18px] w-[18px]" aria-hidden="true" />;
}
