import { Footer } from "@/components/footer";
import { churches } from "@/data/churches";
import { ChurchList, PageHeader } from "@/features/churches";
import type { Metadata } from "next";

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
    <>
      <main className="min-h-screen">
        <PageHeader />

        {/* Content */}
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <ChurchList churches={churches} />
        </div>
      </main>

      <Footer />
    </>
  );
}
