import { Card, CardContent } from "@/components/ui/card";
import type { Church } from "@/types";
import Image from "next/image";
import Link from "next/link";

interface ChurchCardProps {
  church: Church;
}

export function ChurchCard({ church }: ChurchCardProps) {
  const imageSrc = church.imageUrl || "/images/via-fidei-logo.png";

  return (
    <Link href={`/igreja/${church.slug}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-lg cursor-pointer">
        <div className="relative aspect-[4/3] w-full bg-muted">
          <Image
            src={imageSrc}
            alt={church.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-1">
            {church.name}
          </h3>
          <p className="text-sm text-muted-foreground">{church.district}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
