"use client";

import { useAuth } from "@/features/auth";
import { Settings } from "lucide-react";
import Link from "next/link";

interface AdminChurchLinkProps {
  churchId: string;
}

export function AdminChurchLink({ churchId }: AdminChurchLinkProps) {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <Link
      href={`/admin/usuarios?church=${churchId}`}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Gerenciar editores desta igreja"
    >
      <Settings className="h-3 w-3" />
      Gerenciar editores
    </Link>
  );
}
