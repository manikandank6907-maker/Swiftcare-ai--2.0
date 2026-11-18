import { CareCategory, TimePreference } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';

export interface HeroSearchState {
  query: string;
  category: CareCategory;
  preference: TimePreference;
}

export interface HeroSectionCallbacks {
  onSearch: (state: HeroSearchState) => void;
  onClear: () => void;
  onOpenDriveVault?: () => void;
}

export function renderHeroSection(
  container: HTMLElement,
  state: HeroSearchState,
  translations: TranslationDictionary,
  callbacks: HeroSectionCallbacks
): void {
  const t = translations;

  container.innerHTML = `
    <section class="py-12 md:py-16" style="background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 50%, #f8fafc 100%); border-bottom: 1px solid var(--color-border);">
      <div class="container text-center" style="max-width: 920px;">
        <!-- Top Pill -->
        <div class="inline-flex items-center gap-2 px-3 py-1 mb-6" style="background: #e0f2fe; color: #0284c7; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; border: 1px solid #bae6fd;">
          <span>${Icons.sparkles}</span>
          <span>Global Care Discovery & Appointment Request Platform</span>
        </div>

        <!-- Hero Headline -->
        <h1 style="font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; color: var(--color-primary); margin-bottom: 16px;">
          ${t.heroHeadline}
        </h1>

        <!-- Subtitle -->
        <p style="font-size: clamp(1.05rem, 2.5vw, 1.25rem); color: var(--color-text-muted); max-width: 680px; margin: 0 auto 32px; line-height: 1.5;">
          ${t.heroSubtitle}
        </p>

        <!-- Search Bar Box -->
        <div class="card p-3 md:p-4 mb-6" style="box-shadow: var(--shadow-lg); border-color: #cbd5e1;">
          <div class="flex flex-col md:flex-row items-center gap-2">
            <!-- Search Input -->
            <div class="flex-1 flex items-center gap-3 w-100 px-3 py-2" style="width: 100%; background: #ffffff; border: 1px solid var(--color-border); border-radius: var(--radius-md);">
              <span style="color: var(--color-text-muted);">${Icons.mapPin}</span>
              <input
                type="text"
                id="hero-search-input"
                class="form-input"
                style="border: none; padding: 0; box-shadow: none; font-size: 1rem;"
                placeholder="${t.searchPlaceholder}"
                value="${state.query}"
              />
              ${
                state.query
                  ? `
                <button type="button" id="hero-clear-input-btn" class="btn btn-subtle p-1" style="color: #94a3b8;" aria-label="${t.clearBtn}">
                  ${Icons.x}
                </button>
              `
                  : ''
              }
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 w-100 hero-search-actions" style="width: 100%; justify-content: flex-end;">
              <button type="button" id="hero-clear-btn" class="btn btn-outline" style="min-width: 120px;">
                ${t.clearBtn}
              </button>
              <button type="button" id="hero-search-btn" class="btn btn-accent" style="min-width: 160px;">
                ${Icons.search} ${t.searchBtn}
              </button>
            </div>
          </div>

          <!-- Time Preferences Row -->
          <div class="flex items-center justify-start flex-wrap gap-2 pt-3 mt-3" style="border-top: 1px solid #f1f5f9;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase;">
              Timing:
            </span>
            ${renderTimePreferenceChip('all', t.prefAny, state.preference)}
            ${renderTimePreferenceChip('within_30m', t.pref30m, state.preference)}
            ${renderTimePreferenceChip('within_1h', t.pref1h, state.preference)}
            ${renderTimePreferenceChip('today', t.prefToday, state.preference)}
            ${renderTimePreferenceChip('tomorrow', t.prefTomorrow, state.preference)}
          </div>
        </div>

        <!-- Care Categories Selector Pills -->
        <div class="flex items-center justify-center flex-wrap gap-2 mb-6">
          ${renderCategoryPill('all', t.allCategories, Icons.cross, state.category)}
          ${renderCategoryPill('urgent_care', t.urgentCare, Icons.clock, state.category)}
          ${renderCategoryPill('primary_care', t.primaryCare, Icons.user, state.category)}
          ${renderCategoryPill('clinic', t.clinics, Icons.building, state.category)}
          ${renderCategoryPill('home_visit', t.homeVisits, Icons.home, state.category)}
          ${renderCategoryPill('telehealth', t.telehealth, Icons.video, state.category)}
        </div>

        <!-- Google Drive Quick Access & AI Analysis Strip -->
        <div class="card p-4 mb-8 text-left" style="max-width: 840px; margin: 0 auto 32px; background: #ffffff; border: 1px solid #bae6fd;">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
              <div style="width: 42px; height: 42px; background: #e0f2fe; color: var(--color-accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${Icons.folder}
              </div>
              <div>
                <h3 style="font-size: 0.98rem; font-weight: 700; color: var(--color-primary);">
                  Google Drive Care Documents & Gemini AI Analysis
                </h3>
                <p style="font-size: 0.82rem; color: var(--color-text-muted);">
                  Open your personal Google Drive, save AI care prep reports with permission, or analyze Drive documents with Gemini AI.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <a
                href="https://drive.google.com/drive/my-drive"
                target="_blank"
                rel="noopener noreferrer"
                id="hero-open-google-drive-btn"
                class="btn btn-outline btn-sm"
              >
                ${Icons.externalLink} Open Google Drive
              </a>
              <button type="button" id="hero-open-care-vault-btn" class="btn btn-primary btn-sm">
                ${Icons.sparkles} Care Vault & AI Analysis
              </button>
            </div>
          </div>
        </div>

        <!-- Value Proposition Highlights -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left" style="max-width: 840px; margin: 0 auto;">
          <div class="card p-4 flex items-start gap-3" style="background: rgba(255, 255, 255, 0.8);">
            <div style="background: #e0f2fe; color: var(--color-accent); padding: 8px; border-radius: 8px;">
              ${Icons.clock}
            </div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;">Avoid Crowded Waiting Rooms</h4>
              <p style="font-size: 0.82rem; color: var(--color-text-muted);">Discover healthcare providers with openings within 30–60 minutes.</p>
            </div>
          </div>

          <div class="card p-4 flex items-start gap-3" style="background: rgba(255, 255, 255, 0.8);">
            <div style="background: #ecfdf5; color: #10b981; padding: 8px; border-radius: 8px;">
              ${Icons.checkCircle}
            </div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;">Human Staff Verified</h4>
              <p style="font-size: 0.82rem; color: var(--color-text-muted);">Real clinic triage teams review and confirm each booking request.</p>
            </div>
          </div>

          <div class="card p-4 flex items-start gap-3" style="background: rgba(255, 255, 255, 0.8);">
            <div style="background: #fdf2f8; color: #db2777; padding: 8px; border-radius: 8px;">
              ${Icons.globe}
            </div>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 2px;">13 Global Languages</h4>
              <p style="font-size: 0.82rem; color: var(--color-text-muted);">Complete localized interface with miles & km distance adaptations.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // Attach search events
  const inputEl = container.querySelector('#hero-search-input') as HTMLInputElement;
  const searchBtn = container.querySelector('#hero-search-btn');
  const clearBtn = container.querySelector('#hero-clear-btn');
  const clearInputBtn = container.querySelector('#hero-clear-input-btn');

  const triggerSearch = () => {
    callbacks.onSearch({
      ...state,
      query: inputEl?.value.trim() || '',
    });
  };

  searchBtn?.addEventListener('click', triggerSearch);
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerSearch();
  });

  clearBtn?.addEventListener('click', () => {
    if (inputEl) inputEl.value = '';
    callbacks.onClear();
  });

  clearInputBtn?.addEventListener('click', () => {
    if (inputEl) inputEl.value = '';
    triggerSearch();
  });

  container.querySelector('#hero-open-care-vault-btn')?.addEventListener('click', () => {
    callbacks.onOpenDriveVault?.();
  });

  // Category pills
  container.querySelectorAll('.category-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat') as CareCategory;
      if (cat) {
        callbacks.onSearch({
          ...state,
          query: inputEl?.value.trim() || '',
          category: cat,
        });
      }
    });
  });

  // Time preference chips
  container.querySelectorAll('.pref-chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pref = btn.getAttribute('data-pref') as TimePreference;
      if (pref) {
        callbacks.onSearch({
          ...state,
          query: inputEl?.value.trim() || '',
          preference: pref,
        });
      }
    });
  });
}

function renderCategoryPill(
  category: CareCategory,
  label: string,
  icon: string,
  current: CareCategory
): string {
  const isSelected = category === current;
  return `
    <button
      type="button"
      class="category-pill-btn btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}"
      data-cat="${category}"
      style="padding: 0.5rem 1rem; border-radius: 9999px; ${
        isSelected ? 'background: var(--color-primary); color: #ffffff;' : 'background: #ffffff;'
      }"
    >
      ${icon} ${label}
    </button>
  `;
}

function renderTimePreferenceChip(
  pref: TimePreference,
  label: string,
  current: TimePreference
): string {
  const isSelected = pref === current;
  return `
    <button
      type="button"
      class="pref-chip-btn"
      data-pref="${pref}"
      style="
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 1px solid ${isSelected ? 'var(--color-accent)' : '#cbd5e1'};
        background: ${isSelected ? 'var(--color-accent)' : '#ffffff'};
        color: ${isSelected ? '#ffffff' : 'var(--color-text-main)'};
      "
    >
      ${label}
    </button>
  `;
}
