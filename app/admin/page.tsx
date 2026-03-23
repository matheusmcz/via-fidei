import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { Church, Users } from "lucide-react";

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
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Visão geral do sistema
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <Card className={href ? "hover:bg-accent/50 transition-colors" : ""}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}
