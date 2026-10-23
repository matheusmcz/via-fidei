"use client";

import { ThemeToggle } from "@/features/theme";
import { cn } from "@/lib/utils";
import { ArrowLeft, LayoutDashboard, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/usuarios", label: "Editores", icon: Users, exact: false },
] as const;

const NAV_LINK_CLASS =
  "inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors";

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <Image
              src="/images/via-fidei-logo.png"
              alt="Via Fidei Logo"
              width={48}
              height={48}
              className="h-10 w-10 shrink-0 rounded-lg sm:h-12 sm:w-12"
              priority
            />
            <div className="min-w-0">
              <span className="block truncate text-xl font-bold tracking-tight sm:text-3xl">
                Via Fidei
              </span>
              <p className="truncate text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                Área administrativa
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <nav className="flex items-center gap-1" aria-label="Navegação do admin">
              {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact
                  ? pathname === href
                  : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      NAV_LINK_CLASS,
                      isActive
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="sr-only md:not-sr-only">{label}</span>
                  </Link>
                );
              })}
              <Link
                href="/"
                className={cn(
                  NAV_LINK_CLASS,
                  "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only md:not-sr-only">Voltar ao site</span>
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
