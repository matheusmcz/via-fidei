import { ChurchContact } from "@/types";
import {
  Facebook,
  Globe,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

interface ChurchContactSectionProps {
  contact: ChurchContact | undefined;
}

interface ContactItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  value: string;
}

function ContactItem({ icon: Icon, label, href, value }: ContactItemProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
      aria-label={label}
    >
      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      <span className="text-sm group-hover:text-foreground transition-colors">
        {value}
      </span>
    </a>
  );
}

function formatPhoneForDisplay(phone: string): string {
  // Remove non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Format Brazilian phone: +55 82 99999-9999 or (82) 99999-9999
  if (cleaned.startsWith("+55") && cleaned.length === 14) {
    const ddd = cleaned.slice(3, 5);
    const part1 = cleaned.slice(5, 10);
    const part2 = cleaned.slice(10);
    return `(${ddd}) ${part1}-${part2}`;
  }

  // Format without country code: 82 99999-9999
  if (cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2);
    const part1 = cleaned.slice(2, 7);
    const part2 = cleaned.slice(7);
    return `(${ddd}) ${part1}-${part2}`;
  }

  return phone;
}

function formatPhoneForHref(phone: string): string {
  // Remove all non-digits
  return phone.replace(/\D/g, "");
}

function formatInstagramHandle(instagram: string): string {
  // Extract handle from URL or @mention
  const match = instagram.match(/(?:instagram\.com\/)?@?([a-zA-Z0-9._]+)/);
  return match ? `@${match[1]}` : instagram;
}

function getInstagramUrl(instagram: string): string {
  const handle = instagram.replace(/^@/, "").replace(/.*instagram\.com\//, "");
  return `https://instagram.com/${handle}`;
}

function formatFacebookName(facebook: string): string {
  // Extract page name from URL
  const match = facebook.match(/facebook\.com\/([^/?]+)/);
  return match ? match[1] : facebook;
}

function getFacebookUrl(facebook: string): string {
  if (facebook.startsWith("http")) return facebook;
  return `https://facebook.com/${facebook}`;
}

export function ChurchContactSection({ contact }: ChurchContactSectionProps) {
  if (!contact) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma informação de contato disponível.
      </p>
    );
  }

  const hasAnyContact =
    contact.phone ||
    contact.whatsapp ||
    contact.email ||
    contact.instagram ||
    contact.facebook ||
    contact.website;

  if (!hasAnyContact) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma informação de contato disponível.
      </p>
    );
  }

  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {contact.phone && (
        <ContactItem
          icon={Phone}
          label="Telefone"
          href={`tel:${formatPhoneForHref(contact.phone)}`}
          value={formatPhoneForDisplay(contact.phone)}
        />
      )}

      {contact.whatsapp && (
        <ContactItem
          icon={MessageCircle}
          label="WhatsApp"
          href={`https://wa.me/${formatPhoneForHref(contact.whatsapp)}`}
          value={formatPhoneForDisplay(contact.whatsapp)}
        />
      )}

      {contact.email && (
        <ContactItem
          icon={Mail}
          label="E-mail"
          href={`mailto:${contact.email}`}
          value={contact.email}
        />
      )}

      {contact.instagram && (
        <ContactItem
          icon={Instagram}
          label="Instagram"
          href={getInstagramUrl(contact.instagram)}
          value={formatInstagramHandle(contact.instagram)}
        />
      )}

      {contact.facebook && (
        <ContactItem
          icon={Facebook}
          label="Facebook"
          href={getFacebookUrl(contact.facebook)}
          value={formatFacebookName(contact.facebook)}
        />
      )}

      {contact.website && (
        <ContactItem
          icon={Globe}
          label="Website"
          href={
            contact.website.startsWith("http")
              ? contact.website
              : `https://${contact.website}`
          }
          value={contact.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        />
      )}
    </div>
  );
}
