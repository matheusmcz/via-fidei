import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Church, Users } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: churchCount },
    { count: editorCount },
    { count: clergyCount },
  ] = await Promise.all([
    supabase.from("churches").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "editor"),
    supabase.from("clergy").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Igrejas"
          value={churchCount ?? 0}
          icon={<Church className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Editores"
          value={editorCount ?? 0}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          href="/admin/usuarios"
        />
        <StatCard
          title="Clérigos"
          value={clergyCount ?? 0}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
}) {
  const content = (
    <Card
      className={cn(
        "h-full",
        href && "transition-all hover:shadow-md hover:border-foreground/20",
      )}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {content}
      </Link>
    );
  }

  return content;
}
