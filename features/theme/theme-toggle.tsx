"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="rounded-md border border-input bg-background p-2 w-[40px] h-[40px]" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="rounded-md border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Alternar tema"
      title={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}
