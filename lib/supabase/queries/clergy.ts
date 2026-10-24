import { getClergyHonors } from "@/lib/utils";
import type {
  ClergyRole,
  ClergyTitle,
  ClergyWithChurch,
  ReligiousOrderSuffix,
} from "@/types";
import { createPublicClient } from "../public";

interface DbClergyWithChurch {
  id: string;
  name: string;
  role: string;
  title: string | null;
  suffix: string | null;
  image_url: string | null;
  birth_date: string | null;
  death_date: string | null;
  honors: string[] | null;
  bio: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  church_clergy: Array<{
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    churches: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export async function getAllClergyWithChurch(): Promise<ClergyWithChurch[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("clergy")
    .select(
      "*, church_clergy(start_date, end_date, is_active, churches(id, name, slug))"
    )
    .order("name");

  if (error) throw error;

  const result: ClergyWithChurch[] = [];

  for (const c of (data ?? []) as DbClergyWithChurch[]) {
    const activeLink = c.church_clergy.find((cc) => cc.is_active);

    const socialLinks: ClergyWithChurch["socialLinks"] = {};
    if (c.whatsapp) socialLinks.whatsapp = c.whatsapp;
    if (c.instagram) socialLinks.instagram = c.instagram;
    if (c.facebook) socialLinks.facebook = c.facebook;

    const honors = getClergyHonors(c.honors ?? undefined);

    result.push({
      id: c.id,
      name: c.name,
      role: c.role as ClergyRole,
      ...(c.title && { title: c.title as ClergyTitle }),
      ...(c.suffix && { suffix: c.suffix as ReligiousOrderSuffix }),
      ...(c.image_url && { imageUrl: c.image_url }),
      ...(c.birth_date && { birthDate: c.birth_date }),
      ...(c.death_date && { deathDate: c.death_date }),
      ...(honors.length > 0 && { honors }),
      ...(c.bio && { bio: c.bio }),
      ...(Object.keys(socialLinks).length > 0 && { socialLinks }),
      ...(activeLink && {
        churchId: activeLink.churches.id,
        ...(activeLink.start_date && { startDate: activeLink.start_date }),
        ...(activeLink.end_date && { endDate: activeLink.end_date }),
        churchName: activeLink.churches.name,
        churchSlug: activeLink.churches.slug,
      }),
    });
  }

  return result;
}
