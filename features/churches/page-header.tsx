"use client";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/features/theme";
import { Church, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Igrejas", icon: Church },
  { href: "/clero", label: "Clero", icon: Users },
] as const;

export function PageHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/via-fidei-logo.png"
                alt="Via Fidei Logo"
                width={48}
                height={48}
                className="h-10 w-10 rounded-lg sm:h-12 sm:w-12"
                priority
              />
              <div>
                <span className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Via Fidei
                </span>
                <p className="mt-1 text-sm text-muted-foreground">
                  Igrejas católicas de Maceió/AL
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center gap-1" aria-label="Navegação principal">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
