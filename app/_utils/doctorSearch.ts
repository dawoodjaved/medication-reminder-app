import { Query } from 'appwrite';
import { database, config } from '../../config/appwriteConfig';
import {
  Doctor,
  DISEASE_SPECIALTY_MAP,
  PaymentMethod,
} from '../_data/pkDoctors';

export type DoctorFilters = {
  query?: string;
  disease?: string;
  specialization?: string;
  city?: string;
  area?: string;
  hospital?: string;
  payment?: PaymentMethod | '';
  maxFee?: number | null;
  minRating?: number | null;
  gender?: 'male' | 'female' | '';
};

const PAGE_SIZE = 50;

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function docToDoctor(doc: Record<string, unknown>): Doctor {
  const genderRaw = String(doc.gender || '').toLowerCase();
  const gender: 'male' | 'female' = genderRaw === 'female' ? 'female' : 'male';
  const payments = asStringArray(doc.paymentMethods).filter(Boolean) as PaymentMethod[];
  return {
    id: String(doc.$id || doc.id || ''),
    name: String(doc.name || ''),
    photo: String(doc.photo || 'DR'),
    photoUrl: String(doc.photoUrl || '') || undefined,
    gender,
    specialization: String(doc.specialization || ''),
    specialties: asStringArray(doc.specialties),
    diseases: asStringArray(doc.diseases),
    experienceYears: asNumber(doc.experienceYears),
    feePkr: asNumber(doc.feePkr),
    rating: asNumber(doc.rating),
    reviewCount: asNumber(doc.reviewCount),
    city: String(doc.city || ''),
    area: String(doc.area || ''),
    hospital: String(doc.hospital || ''),
    address: String(doc.address || ''),
    lat: asNumber(doc.lat),
    lng: asNumber(doc.lng),
    paymentMethods: payments.length ? payments : ['cash'],
    languages: asStringArray(doc.languages).length
      ? asStringArray(doc.languages)
      : ['Urdu', 'English'],
    availableDays: asStringArray(doc.availableDays),
    availableSlots: asStringArray(doc.availableSlots).length
      ? asStringArray(doc.availableSlots)
      : ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
    pmdcHint: String(doc.pmdcHint || doc.pmdcId || 'Unverified'),
    pmdcId: String(doc.pmdcId || '') || undefined,
    about: String(doc.about || ''),
    phone: String(doc.phone || '') || undefined,
    qualifications: String(doc.qualifications || '') || undefined,
    videoAvailable: Boolean(doc.videoAvailable),
    isBookable: Boolean(doc.isBookable),
  };
}

export function specialtiesForDisease(disease: string): string[] {
  const key = disease.trim().toLowerCase();
  if (!key) return [];
  if (DISEASE_SPECIALTY_MAP[key]) return DISEASE_SPECIALTY_MAP[key];
  const hit = Object.keys(DISEASE_SPECIALTY_MAP).find(
    (d) => d.includes(key) || key.includes(d)
  );
  return hit ? DISEASE_SPECIALTY_MAP[hit] : [];
}

function buildQueries(filters: DoctorFilters): string[] {
  const queries: string[] = [Query.limit(PAGE_SIZE), Query.orderDesc('rating')];

  if (filters.city) queries.push(Query.equal('city', filters.city));
  if (filters.gender) queries.push(Query.equal('gender', filters.gender));
  if (filters.specialization) {
    queries.push(Query.equal('specialization', filters.specialization));
  } else if (filters.disease) {
    const specs = specialtiesForDisease(filters.disease);
    if (specs.length) {
      queries.push(Query.equal('specialization', specs.slice(0, 10)));
    }
  }
  if (filters.maxFee != null) queries.push(Query.lessThanEqual('feePkr', filters.maxFee));
  if (filters.minRating != null) {
    queries.push(Query.greaterThanEqual('rating', filters.minRating));
  }

  const q = (filters.query || '').trim();
  const hospital = (filters.hospital || '').trim();
  if (q) {
    // Full-text on searchText (name + specialty + hospital + diseases)
    queries.push(Query.search('searchText', q));
  } else if (hospital) {
    queries.push(Query.search('searchText', hospital));
  }

  return queries;
}

/** Client-side filters Appwrite cannot express cleanly (payment / area / disease tags). */
function matchesClientFilters(doc: Doctor, filters: DoctorFilters): boolean {
  if (filters.area && doc.area !== filters.area) return false;
  if (filters.hospital) {
    const h = filters.hospital.toLowerCase();
    if (!doc.hospital.toLowerCase().includes(h)) return false;
  }
  if (filters.payment && !doc.paymentMethods.includes(filters.payment)) return false;
  if (filters.disease) {
    const disease = filters.disease.trim().toLowerCase();
    const specs = specialtiesForDisease(disease);
    const byDiseaseTag = doc.diseases.some(
      (d) => d.includes(disease) || disease.includes(d)
    );
    const bySpec =
      specs.includes(doc.specialization) ||
      (doc.specialties || []).some((s) => specs.includes(s));
    if (!byDiseaseTag && !bySpec) return false;
  }
  return true;
}

export async function searchDoctorsRemote(
  filters: DoctorFilters
): Promise<{ doctors: Doctor[]; total: number }> {
  const queries = buildQueries(filters);
  const res = await database.listDocuments(config.db, config.col.doctors, queries);
  const doctors = (res.documents as unknown as Record<string, unknown>[])
    .map(docToDoctor)
    .filter((d) => matchesClientFilters(d, filters));
  return { doctors, total: res.total };
}

/** Local filter helper (tests / offline cache). */
export function searchDoctors(filters: DoctorFilters, source: Doctor[] = []): Doctor[] {
  const q = (filters.query || '').trim().toLowerCase();
  const disease = (filters.disease || '').trim().toLowerCase();
  const specsFromDisease = disease ? specialtiesForDisease(disease) : [];

  return source
    .filter((doc) => {
      if (filters.city && doc.city !== filters.city) return false;
      if (filters.area && doc.area !== filters.area) return false;
      if (filters.hospital && doc.hospital !== filters.hospital) return false;
      if (filters.specialization && doc.specialization !== filters.specialization) return false;
      if (filters.gender && doc.gender !== filters.gender) return false;
      if (filters.payment && !doc.paymentMethods.includes(filters.payment)) return false;
      if (filters.maxFee != null && doc.feePkr > filters.maxFee) return false;
      if (filters.minRating != null && doc.rating < filters.minRating) return false;

      if (disease) {
        const byDiseaseTag = doc.diseases.some(
          (d) => d.includes(disease) || disease.includes(d)
        );
        const bySpec = specsFromDisease.includes(doc.specialization);
        if (!byDiseaseTag && !bySpec) return false;
      }

      if (q) {
        const hay = [
          doc.name,
          doc.specialization,
          doc.hospital,
          doc.city,
          doc.area,
          ...doc.diseases,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    })
    .sort((a, b) => b.rating - a.rating || a.feePkr - b.feePkr);
}

export async function getDoctorById(id: string): Promise<Doctor | undefined> {
  if (!id) return undefined;
  try {
    const doc = await database.getDocument(config.db, config.col.doctors, id);
    return docToDoctor(doc as unknown as Record<string, unknown>);
  } catch {
    return undefined;
  }
}

export function mapsUrl(doc: Doctor): string {
  if (doc.lat && doc.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${doc.lat},${doc.lng}`
    )}`;
  }
  const q = [doc.hospital, doc.address, doc.area, doc.city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function formatFee(pkr: number): string {
  if (!pkr) return 'Fee on request';
  return `Rs ${pkr.toLocaleString('en-PK')}`;
}
