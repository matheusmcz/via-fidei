import { Footer } from "@/components/footer";
import { ClergyPageList } from "@/features/clergy";
import { PageHeader } from "@/features/churches";
import { getAllClergyWithChurch } from "@/lib/supabase/queries";
import { sortClergyByName } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Clero",
  description:
    "Conheça os padres, diáconos e religiosos que servem nas igrejas católicas de Maceió/AL.",
  openGraph: {
    title: "Clero | Via Fidei",
    description:
      "Conheça os padres, diáconos e religiosos que servem nas igrejas católicas de Maceió/AL.",
    url: "https://viafidei.vercel.app/clero",
  },
  twitter: {
    title: "Clero | Via Fidei",
    description:
      "Conheça os padres, diáconos e religiosos que servem nas igrejas católicas de Maceió/AL.",
  },
};

export default async function ClergyPage() {
  const clergyWithChurch = await getAllClergyWithChurch();
  const allClergy = sortClergyByName(clergyWithChurch);

  return (
    <>
      <main className="min-h-screen">
        <PageHeader />

        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Clero
              </h1>
              <p className="mt-2 text-muted-foreground">
                Padres, diáconos e religiosos das igrejas católicas de Maceió/AL
              </p>
            </div>

            <ClergyPageList clergy={allClergy} />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
