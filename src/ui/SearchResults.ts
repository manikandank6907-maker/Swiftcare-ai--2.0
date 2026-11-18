import { CareCategory, HealthcareProvider, TimePreference, TimeSlot, VisitType } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';

export interface SearchFilterState {
  query: string;
  category: CareCategory;
  preference: TimePreference;
  maxDistance: number;
  deliveryType: 'all' | VisitType;
  sortBy: 'fastest' | 'nearest' | 'rating';
  unit: 'mi' | 'km';
}

export interface SearchResultsCallbacks {
  onRequestBooking: (provider: HealthcareProvider, slot?: TimeSlot) => void;
  onFilterChange: (filters: SearchFilterState) => void;
}

export function renderSearchResults(
  container: HTMLElement,
  providers: HealthcareProvider[],
  filters: SearchFilterState,
  translations: TranslationDictionary,
  callbacks: SearchResultsCallbacks
): void {
  const t = translations;

  // Filter providers based on current criteria
  let filtered = [...providers];

  // Text search
  if (filters.query) {
    const q = filters.query.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.postalCode.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.specialty.toLowerCase().includes(q)
    );
  }

  // Category filter
  if (filters.category !== 'all') {
    filtered = filtered.filter((p) => p.category === filters.category);
  }

  // Distance filter
  filtered = filtered.filter((p) => {
    const dist = filters.unit === 'mi' ? p.distanceMiles : p.distanceKm;
    return dist <= filters.maxDistance;
  });

  // Delivery type filter
  if (filters.deliveryType !== 'all') {
    if (filters.deliveryType === 'telehealth') {
      filtered = filtered.filter((p) => p.telehealthAvailable || p.category === 'telehealth');
    } else if (filters.deliveryType === 'home-visit') {
      filtered = filtered.filter((p) => p.category === 'home_visit');
    } else if (filters.deliveryType === 'in-person') {
      filtered = filtered.filter((p) => p.category !== 'telehealth');
    }
  }

  // Time preference filter
  if (filters.preference === 'within_30m') {
    filtered = filtered.filter((p) => p.nextAvailableMinutes <= 30);
  } else if (filters.preference === 'within_1h') {
    filtered = filtered.filter((p) => p.nextAvailableMinutes <= 60);
  }

  // Sorting
  if (filters.sortBy === 'fastest') {
    filtered.sort((a, b) => a.nextAvailableMinutes - b.nextAvailableMinutes);
  } else if (filters.sortBy === 'nearest') {
    filtered.sort((a, b) => a.distanceMiles - b.distanceMiles);
  } else if (filters.sortBy === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  container.innerHTML = `
    <div class="container py-8">
      <!-- Filters and Controls Bar -->
      <div class="card p-4 mb-6" style="background: #ffffff; border-color: var(--color-border);">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <!-- Distance Filter -->
          <div class="flex items-center gap-2">
            <label style="font-size: 0.825rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase;">
              ${t.distanceLabel}:
            </label>
            <select id="filter-distance-select" class="form-select" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
              <option value="5" ${filters.maxDistance === 5 ? 'selected' : ''}>5 ${filters.unit}</option>
              <option value="10" ${filters.maxDistance === 10 ? 'selected' : ''}>10 ${filters.unit}</option>
              <option value="25" ${filters.maxDistance === 25 ? 'selected' : ''}>25 ${filters.unit}</option>
              <option value="50" ${filters.maxDistance === 50 ? 'selected' : ''}>50 ${filters.unit}</option>
            </select>
          </div>

          <!-- Delivery Type -->
          <div class="flex items-center gap-2">
            <label style="font-size: 0.825rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase;">
              ${t.filterDelivery}:
            </label>
            <select id="filter-delivery-select" class="form-select" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
              <option value="all" ${filters.deliveryType === 'all' ? 'selected' : ''}>All Types</option>
              <option value="in-person" ${filters.deliveryType === 'in-person' ? 'selected' : ''}>${t.inPerson}</option>
              <option value="telehealth" ${filters.deliveryType === 'telehealth' ? 'selected' : ''}>${t.virtualTelehealth}</option>
              <option value="home-visit" ${filters.deliveryType === 'home-visit' ? 'selected' : ''}>${t.mobileHome}</option>
            </select>
          </div>

          <!-- Sort Dropdown -->
          <div class="flex items-center gap-2">
            <label style="font-size: 0.825rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase;">
              ${t.sortLabel}:
            </label>
            <select id="filter-sort-select" class="form-select" style="width: auto; padding: 0.4rem 0.8rem; font-size: 0.85rem;">
              <option value="fastest" ${filters.sortBy === 'fastest' ? 'selected' : ''}>${t.sortFastest}</option>
              <option value="nearest" ${filters.sortBy === 'nearest' ? 'selected' : ''}>${t.sortNearest}</option>
              <option value="rating" ${filters.sortBy === 'rating' ? 'selected' : ''}>${t.sortRating}</option>
            </select>
          </div>

          <!-- Distance Unit Toggle -->
          <div class="flex items-center gap-1" style="background: #f1f5f9; padding: 2px; border-radius: 8px;">
            <button type="button" class="btn btn-sm unit-toggle-btn ${filters.unit === 'mi' ? 'btn-primary' : 'btn-subtle'}" data-unit="mi" style="padding: 3px 8px; font-size: 0.75rem;">
              Miles
            </button>
            <button type="button" class="btn btn-sm unit-toggle-btn ${filters.unit === 'km' ? 'btn-primary' : 'btn-subtle'}" data-unit="km" style="padding: 3px 8px; font-size: 0.75rem;">
              KM
            </button>
          </div>
        </div>
      </div>

      <!-- Results Header -->
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 style="font-size: 1.25rem; font-weight: 700;">
          ${t.resultsTitle} (${filtered.length})
        </h2>
        <span class="badge badge-demo">
          ${t.demoProviderBadge}
        </span>
      </div>

      <!-- Provider Grid or Empty -->
      ${
        filtered.length === 0
          ? `
        <div class="card p-12 text-center" style="margin: 40px auto; max-width: 580px;">
          <div style="width: 56px; height: 56px; background: #fef2f2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            ${Icons.search}
          </div>
          <h3 style="font-size: 1.25rem; margin-bottom: 8px;">No Care Providers Found</h3>
          <p style="color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 20px;">
            ${t.noResults}
          </p>
          <button id="reset-filters-btn" class="btn btn-outline">
            Reset Filters & View All
          </button>
        </div>
      `
          : `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="provider-cards-grid">
          ${filtered
            .map((provider) => renderProviderCard(provider, filters.unit, t))
            .join('')}
        </div>
      `
      }
    </div>
  `;

  // Attach Filter Listeners
  const distSelect = container.querySelector('#filter-distance-select') as HTMLSelectElement;
  distSelect?.addEventListener('change', () => {
    callbacks.onFilterChange({
      ...filters,
      maxDistance: parseInt(distSelect.value, 10),
    });
  });

  const deliverySelect = container.querySelector('#filter-delivery-select') as HTMLSelectElement;
  deliverySelect?.addEventListener('change', () => {
    callbacks.onFilterChange({
      ...filters,
      deliveryType: deliverySelect.value as any,
    });
  });

  const sortSelect = container.querySelector('#filter-sort-select') as HTMLSelectElement;
  sortSelect?.addEventListener('change', () => {
    callbacks.onFilterChange({
      ...filters,
      sortBy: sortSelect.value as any,
    });
  });

  container.querySelectorAll('.unit-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const u = btn.getAttribute('data-unit') as 'mi' | 'km';
      if (u) {
        callbacks.onFilterChange({
          ...filters,
          unit: u,
        });
      }
    });
  });

  container.querySelector('#reset-filters-btn')?.addEventListener('click', () => {
    callbacks.onFilterChange({
      ...filters,
      query: '',
      category: 'all',
      preference: 'all',
      maxDistance: 50,
      deliveryType: 'all',
    });
  });

  // Booking CTA clicks on cards
  container.querySelectorAll('.provider-book-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-provider-id');
      const provider = providers.find((p) => p.id === id);
      if (provider) {
        callbacks.onRequestBooking(provider);
      }
    });
  });

  // Clicking specific slot chips
  container.querySelectorAll('.provider-slot-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const provId = chip.getAttribute('data-provider-id');
      const slotId = chip.getAttribute('data-slot-id');
      const provider = providers.find((p) => p.id === provId);
      const slot = provider?.sampleSlots.find((s) => s.id === slotId);
      if (provider && slot) {
        callbacks.onRequestBooking(provider, slot);
      }
    });
  });
}

function renderProviderCard(
  p: HealthcareProvider,
  unit: 'mi' | 'km',
  t: TranslationDictionary
): string {
  const dist = unit === 'mi' ? `${p.distanceMiles} mi` : `${p.distanceKm} km`;

  const categoryBadges: Record<string, string> = {
    urgent_care: 'badge-urgent',
    primary_care: 'badge-primary',
    telehealth: 'badge-telehealth',
    clinic: 'badge-primary',
    home_visit: 'badge-pending',
  };

  const badgeClass = categoryBadges[p.category] || 'badge-primary';

  return `
    <div class="card p-6 card-hover flex flex-col justify-between" style="border: 1px solid var(--color-border); position: relative;">
      <div>
        <!-- Top Metadata Row -->
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="badge ${badgeClass}">${p.categoryLabel}</span>
            <span class="badge" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
              ${p.badge}
            </span>
          </div>

          <div class="flex items-center gap-1" style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary);">
            <span>${Icons.star}</span>
            <span>${p.rating.toFixed(1)}</span>
            <span style="color: var(--color-text-muted); font-weight: 400; font-size: 0.78rem;">(${p.reviewCount})</span>
          </div>
        </div>

        <!-- Provider Name -->
        <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 4px; color: var(--color-primary);">
          ${p.name}
        </h3>

        <!-- Specialty Description -->
        <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 12px; line-height: 1.4;">
          ${p.specialty}
        </p>

        <!-- Address & Distance Pill -->
        <div class="flex items-center gap-2 mb-3" style="font-size: 0.85rem; color: var(--color-text-main);">
          <span style="color: var(--color-accent);">${Icons.mapPin}</span>
          <span>${p.address}, ${p.city}</span>
          <span class="badge badge-demo" style="font-weight: 700;">${dist}</span>
        </div>

        <!-- Hours & Wait Time -->
        <div class="flex items-center justify-between flex-wrap gap-2 mb-4 p-2.5" style="background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.825rem;">
          <div class="flex items-center gap-1.5" style="color: #047857; font-weight: 600;">
            <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
            <span>${p.openHours}</span>
          </div>
          <div class="flex items-center gap-1" style="color: var(--color-primary); font-weight: 600;">
            <span>${Icons.clock}</span>
            <span>${t.waitTime}: <strong>${p.waitTimeEstimate}</strong></span>
          </div>
        </div>

        <!-- Sample Available Slots -->
        <div class="mb-4">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 6px;">
            Sample Openings (Click to Request):
          </div>
          <div class="flex flex-wrap gap-2">
            ${p.sampleSlots
              .map(
                (slot) => `
              <button
                type="button"
                class="provider-slot-chip time-slot-btn"
                data-provider-id="${p.id}"
                data-slot-id="${slot.id}"
                title="Request this slot"
              >
                <span>${slot.time}</span>
                <small style="font-size: 0.7rem; opacity: 0.8; text-transform: uppercase;">${slot.type}</small>
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Insurance Badges -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          ${p.insuranceAccepted
            .slice(0, 3)
            .map(
              (ins) => `
            <span style="font-size: 0.72rem; background: #f1f5f9; color: #475569; padding: 2px 7px; border-radius: 4px; border: 1px solid #e2e8f0;">
              ${ins}
            </span>
          `
            )
            .join('')}
          ${
            p.insuranceAccepted.length > 3
              ? `<span style="font-size: 0.72rem; color: #64748b; padding: 2px 4px;">+${p.insuranceAccepted.length - 3} more</span>`
              : ''
          }
        </div>
      </div>

      <!-- Action Button & Mandatory Disclaimer -->
      <div>
        <button
          type="button"
          class="btn btn-accent w-100 provider-book-btn mb-2"
          style="width: 100%; justify-content: center;"
          data-provider-id="${p.id}"
        >
          ${Icons.calendar} ${t.requestAppointment}
        </button>

        <div style="font-size: 0.72rem; color: #64748b; text-align: center; line-height: 1.3;">
          ${t.sampleSlotNote}
        </div>
      </div>
    </div>
  `;
}
