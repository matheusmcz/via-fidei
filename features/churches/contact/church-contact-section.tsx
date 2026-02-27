import {
  formatFacebookName,
  formatInstagramHandle,
  formatPhoneForDisplay,
  formatPhoneForHref,
  formatWebsiteForDisplay,
  getFacebookUrl,
  getInstagramUrl,
  getWebsiteUrl,
} from "@/lib/utils";
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
          href={getWebsiteUrl(contact.website)}
          value={formatWebsiteForDisplay(contact.website)}
        />
      )}
    </div>
  );
}
