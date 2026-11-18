import { BookingRequest, BookingStatus } from '../types';

const STORAGE_KEY = 'swiftcare_demo_bookings_v1';

const INITIAL_DEMO_REQUESTS: BookingRequest[] = [
  {
    id: 'SC-8421-REQ',
    patientName: 'Sarah Jenkins',
    patientEmail: 's.jenkins.demo@example.com',
    patientPhone: '(415) 555-0192',
    providerId: 'prov-metro-urgent',
    providerName: 'Metro Express Urgent Care & Walk-In',
    providerAddress: '742 Market Street, Suite 100',
    category: 'urgent_care',
    date: 'Today',
    timeSlot: '11:00 AM',
    visitType: 'in-person',
    reason: 'Acute sprained ankle from morning jog, moderate swelling.',
    symptoms: 'Swollen right ankle, pain when bearing weight.',
    insuranceType: 'Blue Shield PPO',
    status: 'approved',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    confirmedTime: '11:00 AM (Confirmed Room 3)',
    staffNotes: 'Pre-registered. X-Ray technician alerted for arrival.',
    isDemo: true,
  },
  {
    id: 'SC-9104-REQ',
    patientName: 'David Chen',
    patientEmail: 'david.chen.demo@example.com',
    patientPhone: '(415) 555-0148',
    providerId: 'prov-swift-virtual',
    providerName: 'Horizon On-Demand Telehealth Physicians',
    providerAddress: 'Digital Nationwide Practice, Network HQ',
    category: 'telehealth',
    date: 'Today',
    timeSlot: '10:45 AM',
    visitType: 'telehealth',
    reason: 'Seasonal allergy flare-up and dry cough, requesting video consult.',
    symptoms: 'Sneezing, itchy eyes, mild dry throat.',
    insuranceType: 'Aetna Select',
    status: 'pending_confirmation',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    isDemo: true,
  },
  {
    id: 'SC-7320-REQ',
    patientName: 'Elena Rostova',
    patientEmail: 'elena.rostova.demo@example.com',
    patientPhone: '(415) 555-0164',
    providerId: 'prov-bay-primary',
    providerName: 'Bayview Comprehensive Family & Primary Care',
    providerAddress: '1250 4th Street',
    category: 'primary_care',
    date: 'Today',
    timeSlot: '1:45 PM',
    visitType: 'in-person',
    reason: 'Annual blood pressure follow-up and routine lab renewal.',
    symptoms: 'Routine chronic care management, no acute distress.',
    insuranceType: 'UnitedHealthcare',
    status: 'rescheduled',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1200000).toISOString(),
    confirmedTime: 'Proposed New Slot: 2:30 PM (Clinic Provider)',
    staffNotes: 'Facility schedule running 45 min behind due to an earlier visit. Proposed 2:30 PM.',
    isDemo: true,
  },
];

export function getBookingRequests(): BookingRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_REQUESTS));
      return INITIAL_DEMO_REQUESTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed reading booking requests from storage', err);
    return INITIAL_DEMO_REQUESTS;
  }
}

export function saveBookingRequest(request: BookingRequest): void {
  try {
    const current = getBookingRequests();
    const updated = [request, ...current.filter((r) => r.id !== request.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed saving booking request', err);
  }
}

export function updateBookingStatus(
  id: string,
  status: BookingStatus,
  notes?: string,
  confirmedTime?: string
): BookingRequest | null {
  try {
    const current = getBookingRequests();
    const index = current.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updatedItem: BookingRequest = {
      ...current[index],
      status,
      updatedAt: new Date().toISOString(),
      ...(notes !== undefined ? { staffNotes: notes } : {}),
      ...(confirmedTime !== undefined ? { confirmedTime } : {}),
    };

    current[index] = updatedItem;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return updatedItem;
  } catch (err) {
    console.error('Failed updating booking status', err);
    return null;
  }
}

export function getBookingById(id: string): BookingRequest | undefined {
  const current = getBookingRequests();
  return current.find((r) => r.id.toLowerCase() === id.trim().toLowerCase());
}

export function generateBookingId(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `SC-${randomNum}-REQ`;
}
