import type { Clergy } from "@/types";

export const clergyMembers: Clergy[] = [
  {
    id: "46-clergy-1",
    name: "Manoel José dos Santos",
    churchId: "46",
    role: "parish-priest",
    title: "padre",
    startDate: "2011",
    imageUrl: "/images/pe-manoel-jose-dos-santos.jpg",
    bio: "Ordenado em 2005 pela Arquidiocese de Maceió. Pároco da Paróquia São Paulo Apóstolo desde 2011, dedica-se especialmente à pastoral familiar e à formação de lideranças.",
    socialLinks: {
      instagram: "@pe.manoeljose",
      facebook: "https://facebook.com/pe.manoeljose",
    },
  },
  {
    id: "46-clergy-2",
    name: "Inácio Filho",
    churchId: "46",
    role: "deacon",
    startDate: "2015",
    imageUrl: "/images/dc-inacio-filho.jpg",
    bio: "Diácono permanente ordenado em 2015. Atua na coordenação da pastoral social e no acompanhamento das comunidades de base.",
    socialLinks: {
      whatsapp: "+5582999888777",
    },
  },
];
