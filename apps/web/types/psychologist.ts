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
  reviews?: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    patient: {
      id: string;
      name: string;
    };
  }>;
};

export type SearchPsychologistResult = Omit<
  PublicPsychologistProfile,
  'whatsapp'
>;

export type SearchPsychologistsResponse = {
  data: SearchPsychologistResult[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};
