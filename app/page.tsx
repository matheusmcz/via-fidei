import { churches } from "@/data/churches";
import { ChurchList } from "@/features/churches";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Igrejas Católicas de Maceió",
  description:
    "Encontre igrejas católicas em Maceió/AL. Busque por nome ou bairro e descubra endereços e informações sobre as paróquias da cidade.",
  openGraph: {
    title: "Via Fidei - Igrejas Católicas de Maceió",
    description:
      "Encontre igrejas católicas em Maceió/AL. Busque por nome ou bairro e descubra endereços e informações sobre as paróquias da cidade.",
    url: "https://viafidei.vercel.app",
  },
  twitter: {
    title: "Via Fidei - Igrejas Católicas de Maceió",
    description:
      "Encontre igrejas católicas em Maceió/AL. Busque por nome ou bairro.",
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/images/via-fidei-logo.png"
              alt="Via Fidei Logo"
              width={48}
              height={48}
              className="h-10 w-10 rounded-lg sm:h-12 sm:w-12"
              priority
            />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Via Fidei
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Igrejas católicas de Maceió/AL
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <ChurchList churches={churches} />
      </div>
    </main>
  );
}
