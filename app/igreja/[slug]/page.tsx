import { Card, CardContent } from "@/components/ui/card";
import { churches } from "@/data/churches";
import {
  ChurchContactSection,
  ClergyHistory,
  ClergyList,
  MinistriesSection,
  ScheduleTabs,
} from "@/features/churches";
import { ArrowLeft, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ChurchDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return churches.map((church) => ({
    slug: church.slug,
  }));
}

export async function generateMetadata({ params }: ChurchDetailPageProps) {
  const { slug } = await params;
  const church = churches.find((c) => c.slug === slug);

  if (!church) {
    return {
      title: "Igreja não encontrada",
      description: "A igreja solicitada não foi encontrada.",
    };
  }

  const title = church.name;
  const description = `${church.name} localizada no bairro ${church.district}, Maceió/AL. Endereço: ${church.address}.`;
  const imageUrl = church.imageUrl || "/images/placeholder.svg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://viafidei.vercel.app/igreja/${church.slug}`,
      images: [
        {
          url: imageUrl,
          alt: church.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ChurchDetailPage({
  params,
}: ChurchDetailPageProps) {
  const { slug } = await params;
  const church = churches.find((c) => c.slug === slug);

  if (!church) {
    notFound();
  }

  const imageSrc = church.imageUrl || "/images/via-fidei-logo.png";

  return (
    <main className="min-h-screen bg-background">
      {/* Header com botão voltar */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para listagem
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Card className="overflow-hidden">
            {/* Imagem */}
            <div className="relative aspect-[16/9] w-full bg-muted">
              <Image
                src={imageSrc}
                alt={church.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 896px"
              />
            </div>

            {/* Informações */}
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Nome */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {church.name}
                </h1>
              </div>

              {/* Endereço */}
              <div className="space-y-3">
                {church.googleMapsUrl ? (
                  <a
                    href={church.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 group"
                  >
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0 group-hover:text-foreground transition-colors" />
                    <div>
                      <p className="text-base group-hover:underline group-hover:text-foreground transition-colors">
                        {church.address}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {church.district}, Maceió/AL
                      </p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-base">{church.address}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {church.district}, Maceió/AL
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="mt-6">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold mb-4">Contato</h2>
              <ChurchContactSection contact={church.contact} />
            </CardContent>
          </Card>

          {/* Clero */}
          <Card className="mt-6">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold mb-4">Clero</h2>
              <ClergyList clergy={church.clergy} />
              <ClergyHistory clergy={church.clergy} />
            </CardContent>
          </Card>

          {/* Horários e Atividades */}
          <Card className="mt-6">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold mb-4">Horários</h2>
              <ScheduleTabs church={church} />
            </CardContent>
          </Card>

          {/* Grupos, Movimentos e Pastorais */}
          <Card className="mt-6">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold mb-4">
                Grupos, Movimentos e Pastorais
              </h2>
              <MinistriesSection ministries={church.ministries} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
