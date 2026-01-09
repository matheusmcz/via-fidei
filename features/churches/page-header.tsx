"use client";

import { ThemeToggle } from "@/features/theme";
import Image from "next/image";

export function PageHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/via-fidei-logo.png"
              alt="Via Fidei Logo"
              width={48}
              height={48}
              className="h-10 w-10 rounded-lg sm:h-12 sm:w-12"
              priority
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Via Fidei
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Igrejas católicas de Maceió/AL
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
