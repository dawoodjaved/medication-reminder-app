/**
 * Doctor directory types + filter constants.
 * Live profiles come from Appwrite `doctors` (see scripts/upload_doctors_appwrite.py).
 */

export type PaymentMethod = 'cash' | 'card' | 'easypaisa' | 'jazzcash' | 'insurance' | 'online';

export type Doctor = {
  id: string;
  name: string;
  photo: string;
  photoUrl?: string;
  gender: 'male' | 'female';
  specialization: string;
  specialties?: string[];
  diseases: string[];
  experienceYears: number;
  feePkr: number;
  rating: number;
  reviewCount: number;
  city: string;
  area: string;
  hospital: string;
  address: string;
  lat: number;
  lng: number;
  paymentMethods: PaymentMethod[];
  languages: string[];
  availableDays: string[];
  availableSlots: string[];
  pmdcHint: string;
  pmdcId?: string;
  about: string;
  phone?: string;
  qualifications?: string;
  videoAvailable?: boolean;
  isBookable?: boolean;
};

export const PK_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Peshawar',
  'Multan',
  'Hyderabad',
  'Quetta',
  'Gujranwala',
  'Bahawalpur',
  'Sargodha',
  'Sialkot',
  'Gujrat',
  'Abbottabad',
  'Sahiwal',
] as const;

/** Disease search → related specializations */
export const DISEASE_SPECIALTY_MAP: Record<string, string[]> = {
  diabetes: ['Endocrinologist', 'Internal Medicine Specialist', 'Diabetologist', 'General Physician'],
  'high blood pressure': ['Cardiologist', 'Internal Medicine Specialist'],
  hypertension: ['Cardiologist', 'Internal Medicine Specialist'],
  asthma: ['Pulmonologist', 'Allergy Specialist'],
  'heart disease': ['Cardiologist'],
  thyroid: ['Endocrinologist'],
  arthritis: ['Rheumatologist', 'Orthopedic Surgeon'],
  migraine: ['Neurologist'],
  epilepsy: ['Neurologist'],
  depression: ['Psychiatrist', 'Psychologist'],
  anxiety: ['Psychiatrist', 'Psychologist'],
  acne: ['Dermatologist'],
  eczema: ['Dermatologist'],
  'pregnancy care': ['Gynecologist', 'Obstetrician'],
  pcos: ['Gynecologist', 'Endocrinologist'],
  'kidney disease': ['Nephrologist'],
  'liver disease': ['Gastroenterologist', 'Hepatologist'],
  'stomach pain': ['Gastroenterologist'],
  'eye problems': ['Ophthalmologist', 'Eye Specialist'],
  'ear infection': ['ENT Specialist'],
  'child fever': ['Pediatrician'],
  'back pain': ['Orthopedic Surgeon', 'Physiotherapist'],
  'dental pain': ['Dentist'],
  'urine infection': ['Urologist', 'Nephrologist'],
  cancer: ['Oncologist'],
  allergy: ['Allergy Specialist', 'Pulmonologist'],
  covid: ['Internal Medicine Specialist', 'Pulmonologist'],
  fever: ['Internal Medicine Specialist', 'General Physician'],
  cough: ['Pulmonologist', 'General Physician'],
  'skin infection': ['Dermatologist'],
};

export const ALL_DISEASES = Object.keys(DISEASE_SPECIALTY_MAP).sort();

export const ALL_SPECIALTIES = [
  'Gynecologist',
  'General Physician',
  'Dentist',
  'Pediatrician',
  'General Surgeon',
  'Internal Medicine Specialist',
  'Orthopedic Surgeon',
  'Physiotherapist',
  'Cardiologist',
  'Dermatologist',
  'Urologist',
  'Eye Specialist',
  'ENT Specialist',
  'Psychiatrist',
  'Gastroenterologist',
  'Pulmonologist',
  'Neurosurgeon',
  'Neurologist',
  'Nephrologist',
  'Plastic Surgeon',
  'Endocrinologist',
  'Diabetologist',
  'Oncologist',
  'Rheumatologist',
  'Nutritionist',
].sort();

/** Popular hospitals for filter chips (full list is searchable by text). */
export const PK_HOSPITALS = [
  'Shifa International Hospital',
  'The Aga Khan University Hospital Karachi',
  'Hameed Latif Hospital',
  'Lady Reading Hospital',
  'Rehman Medical Institute - RMI',
  'Quaid-e-Azam International Hospital',
  'National Hospital & Medical Centre',
  'Patel Hospital',
  'Ali Medical Centre (Islamabad)',
  'Saleem Memorial Hospital',
];

export const PAYMENT_OPTIONS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'easypaisa', label: 'Easypaisa' },
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'online', label: 'Online consult' },
];
