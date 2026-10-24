import type { Clergy } from "@/types";

export const clergyMembers: Clergy[] = [
  {
    id: "46-clergy-1",
    name: "Manoel José dos Santos",
    role: "parish-priest",
    title: "padre",
    imageUrl: "/images/pe-manoel-jose-dos-santos.jpg",
    deathDate: "2026",
    bio: "Ordenado em 2005 pela Arquidiocese de Maceió. Pároco da Paróquia São Paulo Apóstolo desde 2011, dedica-se especialmente à pastoral familiar e à formação de lideranças.",
    socialLinks: {
      instagram: "@pe.manoeljose",
      facebook: "https://facebook.com/pe.manoeljose",
    },
  },
  {
    id: "46-clergy-2",
    name: "Inácio Filho",
    role: "deacon",
    imageUrl: "/images/dc-inacio-filho.jpg",
    deathDate: "2026",
    bio: "Diácono permanente ordenado em 2015. Atua na coordenação da pastoral social e no acompanhamento das comunidades de base.",
    socialLinks: {
      whatsapp: "+5582999888777",
    },
  },
  {
    id: "46-clergy-3",
    name: "José Elielton da Silva",
    churchId: "46",
    role: "parish-priest",
    title: "padre",
    honors: ["canon", "vicar-general", "prefect-of-studies"],
    imageUrl: "/images/pe-jose-elielton.jpeg",
    bio: "Vigário Geral da Arquidiocese de Maceió, nomeado em maio de 2025 pelo arcebispo Dom Beto Breis. Cargo de alta confiança na administração arquidiocesana.\n\nPrefeito de Estudos do Seminário Maior Nossa Senhora da Assunção, designado em setembro de 2024 para coordenar a formação acadêmica.\n\nAtuou anteriormente como pároco da Paróquia São Sebastião, em Rio Largo, Alagoas.",
  },
  {
    id: "46-clergy-4",
    name: "Denis Francisco Menezes",
    churchId: "46",
    role: "deacon",
    imageUrl: "/images/diac-denis-francisco-menezes.jpeg",
  },
];
