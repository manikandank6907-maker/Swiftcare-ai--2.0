export type CareCategory =
  | 'all'
  | 'urgent_care'
  | 'primary_care'
  | 'clinic'
  | 'home_visit'
  | 'telehealth';

export type TimePreference =
  | 'all'
  | 'within_30m'
  | 'within_1h'
  | 'today'
  | 'tomorrow';

export type VisitType = 'in-person' | 'telehealth' | 'home-visit';

export interface TimeSlot {
  id: string;
  time: string;
  date: string;
  type: VisitType;
  available: boolean;
}

export interface HealthcareProvider {
  id: string;
  name: string;
  category: CareCategory;
  categoryLabel: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  distanceKm: number;
  openHours: string;
  isOpenNow: boolean;
  nextAvailableMinutes: number;
  sampleSlots: TimeSlot[];
  insuranceAccepted: string[];
  telehealthAvailable: boolean;
  acceptsWalkIns: boolean;
  badge: string;
  phone: string;
  email: string;
  waitTimeEstimate: string;
  isDemo: true;
  disclaimer: string;
}

export type BookingStatus =
  | 'pending_confirmation'
  | 'approved'
  | 'rejected'
  | 'rescheduled';

export interface BookingRequest {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  providerId: string;
  providerName: string;
  providerAddress: string;
  category: CareCategory;
  date: string;
  timeSlot: string;
  visitType: VisitType;
  reason: string;
  symptoms: string;
  insuranceType: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  staffNotes?: string;
  confirmedTime?: string;
  attachedDriveFile?: {
    id: string;
    name: string;
    webViewLink?: string;
  };
  isDemo: true;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  owners?: { displayName?: string; emailAddress?: string }[];
  trashed?: boolean;
}

export type LanguageCode =
  | 'en-US'
  | 'en-GB'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'hi'
  | 'ta'
  | 'ar'
  | 'zh'
  | 'ja'
  | 'ko';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  unit: 'mi' | 'km';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  isEmergencyAlert?: boolean;
  suggestedPrompts?: string[];
}

export type NavigationTab =
  | 'home'
  | 'search'
  | 'tracker'
  | 'drive'
  | 'admin'
  | 'assistant'
  | 'about'
  | 'xr';
