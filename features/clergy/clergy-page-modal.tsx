"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatClergyName,
  formatClergyTenure,
  formatInstagramHandle,
  getInstagramUrl,
  getRoleLabel,
} from "@/lib/utils";
import type { ClergyWithChurch } from "@/types";
import {
  Church,
  Facebook,
  Instagram,
  MessageCircle,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ClergyPageModalProps {
  clergy: ClergyWithChurch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SocialLinkProps {
  icon: React.ElementType;
  href: string;
  label: string;
}

function SocialLink({ icon: Icon, href, label }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-muted/80 transition-colors"
      aria-label={label}
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
    </a>
  );
}

export function ClergyPageModal({
  clergy,
  open,
  onOpenChange,
}: ClergyPageModalProps) {
  if (!clergy) return null;

  const formattedName = formatClergyName(clergy);
  const roleLabel = getRoleLabel(clergy.role);
  const tenure = formatClergyTenure(clergy);

  const hasWhatsapp = clergy.socialLinks?.whatsapp;
  const hasInstagram = clergy.socialLinks?.instagram;
  const hasFacebook = clergy.socialLinks?.facebook;
  const hasSocialLinks = hasWhatsapp || hasInstagram || hasFacebook;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">{formattedName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center">
          <div className="relative h-32 w-32 overflow-hidden rounded-full bg-muted mb-4">
            {clergy.imageUrl ? (
              <Image
                src={clergy.imageUrl}
                alt={formattedName}
                fill
                className="object-cover"
                sizes="128px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-semibold">{formattedName}</h2>

          <p className="text-sm text-muted-foreground mt-1">
            {roleLabel}
            {tenure && <span className="ml-1">({tenure})</span>}
          </p>

          {clergy.bio && (
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              {clergy.bio}
            </p>
          )}

          <Link
            href={`/igreja/${clergy.churchSlug}`}
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 mt-4 text-sm font-medium text-foreground hover:underline transition-colors"
          >
            <Church className="h-4 w-4" />
            {clergy.churchName}
          </Link>

          {hasSocialLinks && (
            <div className="flex items-center gap-3 mt-6">
              {hasWhatsapp && (
                <SocialLink
                  icon={MessageCircle}
                  href={`https://wa.me/${hasWhatsapp.replace(/\D/g, "")}`}
                  label="WhatsApp"
                />
              )}
              {hasInstagram && (
                <SocialLink
                  icon={Instagram}
                  href={getInstagramUrl(hasInstagram)}
                  label={formatInstagramHandle(hasInstagram)}
                />
              )}
              {hasFacebook && (
                <SocialLink
                  icon={Facebook}
                  href={
                    hasFacebook.startsWith("http")
                      ? hasFacebook
                      : `https://facebook.com/${hasFacebook}`
                  }
                  label="Facebook"
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
