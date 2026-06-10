export type PublicTaxonomyItem = {
  id: string;
  name: string;
  slug: string;
};

export type PublicPsychologistProfile = {
  id: string;
  professionalName: string;
  slug: string;
  crp: string;
  photoUrl: string | null;
  bio: string;
  consultationPrice: number;
  consultationDurationMinutes: number;
  offersOnline: boolean;
  offersInPerson: boolean;
  city: string | null;
  state: string | null;
  whatsapp: string | null;
  specialties: PublicTaxonomyItem[];
  approaches: PublicTaxonomyItem[];
};
