import { LanguageCode, NavigationTab } from '../types';
import { SUPPORTED_LANGUAGES, TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';
import { getBookingRequests } from '../services/storageService';

export interface NavbarCallbacks {
  onNavigate: (tab: NavigationTab) => void;
  onLanguageChange: (lang: LanguageCode) => void;
  onToggleAi: () => void;
}

export function renderNavbar(
  container: HTMLElement,
  currentTab: NavigationTab,
  currentLang: LanguageCode,
  translations: TranslationDictionary,
  callbacks: NavbarCallbacks
): void {
  const requests = getBookingRequests();
  const pendingCount = requests.filter((r) => r.status === 'pending_confirmation').length;
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  container.innerHTML = `
    <!-- Top Emergency Guidance Bar -->
    <div class="emergency-banner flex items-center justify-between px-4 py-2">
      <div class="container flex items-center justify-between flex-wrap gap-2 text-xs">
        <div class="flex items-center gap-2">
          <span style="display: inline-block; animation: pulse 1.5s infinite;">${Icons.alertTriangle}</span>
          <span>${translations.emergencyBanner}</span>
        </div>
        <div class="flex items-center gap-3">
          <span style="opacity: 0.85;">Non-Emergency Discovery Service</span>
        </div>
      </div>
    </div>

    <!-- Main Navigation Bar -->
    <header style="background: #ffffff; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; z-index: 40; box-shadow: var(--shadow-sm);">
      <div class="container flex items-center justify-between py-3">
        <!-- Brand Logo -->
        <a href="#home" id="nav-brand-logo" class="flex items-center gap-3 text-decoration-none" style="text-decoration: none; cursor: pointer;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0f172a 0%, #0891b2 100%); color: #ffffff; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(8, 145, 178, 0.25);">
            ${Icons.cross}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; letter-spacing: -0.03em; color: var(--color-primary);">SWIFTCARE</span>
              <span style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; letter-spacing: -0.03em; color: var(--color-accent);">AI</span>
            </div>
            <div style="font-size: 0.72rem; color: var(--color-text-muted); font-weight: 500; letter-spacing: 0.02em; line-height: 1;">
              ${translations.tagline}
            </div>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="hidden md:flex items-center gap-1" id="desktop-nav-links">
          <button class="btn btn-subtle btn-sm nav-link-btn ${currentTab === 'home' ? 'font-bold' : ''}" data-tab="home" style="${currentTab === 'home' ? 'color: var(--color-accent); background: #f0fdfa;' : ''}">
            ${translations.navHome}
          </button>
          <button class="btn btn-subtle btn-sm nav-link-btn ${currentTab === 'search' ? 'font-bold' : ''}" data-tab="search" style="${currentTab === 'search' ? 'color: var(--color-accent); background: #f0fdfa;' : ''}">
            ${translations.navFindCare}
          </button>
          <button class="btn btn-subtle btn-sm nav-link-btn ${currentTab === 'tracker' ? 'font-bold' : ''}" data-tab="tracker" style="${currentTab === 'tracker' ? 'color: var(--color-accent); background: #f0fdfa;' : ''}">
            ${translations.navRequests}
            ${
              pendingCount > 0
                ? `<span class="badge badge-urgent" style="font-size: 0.68rem; padding: 2px 6px; margin-left: 4px;">${pendingCount}</span>`
                : ''
            }
          </button>
          <button class="btn btn-subtle btn-sm nav-link-btn ${currentTab === 'drive' ? 'font-bold' : ''}" data-tab="drive" style="${currentTab === 'drive' ? 'color: var(--color-accent); background: #f0fdfa;' : ''}">
            ${Icons.folder} ${translations.navDriveVault}
          </button>
          <button class="btn btn-subtle btn-sm nav-link-btn ${currentTab === 'admin' ? 'font-bold' : ''}" data-tab="admin" style="${currentTab === 'admin' ? 'color: var(--color-accent); background: #f0fdfa;' : ''}">
            ${translations.navProviderPortal}
          </button>
          <button class="btn btn-subtle btn-sm nav-link-btn ${currentTab === 'about' ? 'font-bold' : ''}" data-tab="about" style="${currentTab === 'about' ? 'color: var(--color-accent); background: #f0fdfa;' : ''}">
            ${translations.navAboutTrust}
          </button>
          <button class="btn btn-subtle btn-sm nav-link-btn ${currentTab === 'xr' ? 'font-bold' : ''}" data-tab="xr" style="color: #6366f1;">
            ${Icons.box3d} ${translations.nav3dKiosk}
          </button>
        </nav>

        <!-- Right Side: Open Google Drive, AI Assistant, Language Selector & Mobile Menu -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Clearly Visible Open Google Drive Button -->
          <a
            href="https://drive.google.com/drive/my-drive"
            target="_blank"
            rel="noopener noreferrer"
            id="nav-open-drive-link"
            class="btn btn-sm btn-outline flex items-center gap-1.5"
            style="border-color: #cbd5e1; color: var(--color-primary);"
            title="Open Google Drive in a new tab"
          >
            ${Icons.externalLink}
            <span class="hidden lg:inline">Open Google Drive</span>
          </a>

          <!-- AI Assistant Trigger -->
          <button id="nav-ai-btn" class="btn btn-sm btn-outline flex items-center gap-1.5" style="border-color: #38bdf8; color: #0284c7; background: #f0f9ff;">
            ${Icons.sparkles}
            <span class="hidden sm:inline">${translations.navAiAssistant}</span>
          </button>

          <!-- Language Selector Dropdown -->
          <div style="position: relative;" id="lang-dropdown-wrapper">
            <button id="lang-dropdown-btn" class="btn btn-outline btn-sm flex items-center gap-1.5" aria-label="Select Language">
              <span>${currentLangObj.flag}</span>
              <span class="hidden sm:inline" style="font-size: 0.825rem; font-weight: 600;">${currentLangObj.name}</span>
              <span>${Icons.chevronDown}</span>
            </button>

            <!-- Language Menu Popup -->
            <div id="lang-dropdown-menu" style="display: none; position: absolute; right: 0; top: 110%; width: 230px; background: #ffffff; border: 1px solid var(--color-border); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 50; padding: 6px; max-height: 380px; overflow-y: auto;">
              <div style="font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase; padding: 6px 10px; font-weight: 700;">
                Select Language / Idioma
              </div>
              ${SUPPORTED_LANGUAGES.map(
                (lang) => `
                <button
                  type="button"
                  class="lang-option-btn w-100 flex items-center justify-between"
                  style="width: 100%; text-align: left; padding: 8px 10px; border-radius: 8px; border: none; background: ${lang.code === currentLang ? '#f0fdfa' : 'transparent'}; color: ${lang.code === currentLang ? 'var(--color-accent)' : 'var(--color-primary)'}; font-size: 0.85rem; font-weight: ${lang.code === currentLang ? '700' : '500'}; cursor: pointer;"
                  data-code="${lang.code}"
                >
                  <span class="flex items-center gap-2">
                    <span>${lang.flag}</span>
                    <span>${lang.nativeName}</span>
                  </span>
                  <span style="font-size: 0.75rem; color: var(--color-text-muted);">${lang.unit.toUpperCase()}</span>
                </button>
              `
              ).join('')}
            </div>
          </div>

          <!-- Mobile Hamburger -->
          <button id="mobile-menu-btn" class="btn btn-subtle btn-sm md:hidden p-2" aria-label="Toggle Menu">
            ${Icons.menu}
          </button>
        </div>
      </div>

      <!-- Mobile Menu Dropdown -->
      <div id="mobile-nav-drawer" style="display: none; background: #ffffff; border-top: 1px solid var(--color-border); padding: 12px 16px;">
        <div class="flex flex-col gap-2">
          <button class="btn btn-subtle nav-link-btn" data-tab="home" style="justify-content: flex-start;">
            ${translations.navHome}
          </button>
          <button class="btn btn-subtle nav-link-btn" data-tab="search" style="justify-content: flex-start;">
            ${translations.navFindCare}
          </button>
          <button class="btn btn-subtle nav-link-btn" data-tab="tracker" style="justify-content: flex-start;">
            ${translations.navRequests} (${requests.length})
          </button>
          <button class="btn btn-subtle nav-link-btn" data-tab="drive" style="justify-content: flex-start;">
            ${Icons.folder} ${translations.navDriveVault}
          </button>
          <a
            href="https://drive.google.com/drive/my-drive"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline btn-sm"
            style="justify-content: flex-start; color: var(--color-primary);"
          >
            ${Icons.externalLink} Open Google Drive
          </a>
          <button class="btn btn-subtle nav-link-btn" data-tab="admin" style="justify-content: flex-start;">
            ${translations.navProviderPortal}
          </button>
          <button class="btn btn-subtle nav-link-btn" data-tab="about" style="justify-content: flex-start;">
            ${translations.navAboutTrust}
          </button>
          <button class="btn btn-subtle nav-link-btn" data-tab="xr" style="justify-content: flex-start; color: #6366f1;">
            ${Icons.box3d} ${translations.nav3dKiosk}
          </button>
        </div>
      </div>
    </header>
  `;

  // Attach event handlers
  container.querySelector('#nav-brand-logo')?.addEventListener('click', (e) => {
    e.preventDefault();
    callbacks.onNavigate('home');
  });

  container.querySelectorAll('.nav-link-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab') as NavigationTab;
      if (tab) {
        // Close mobile drawer if open
        const mobileDrawer = container.querySelector('#mobile-nav-drawer') as HTMLElement;
        if (mobileDrawer) mobileDrawer.style.display = 'none';
        callbacks.onNavigate(tab);
      }
    });
  });

  container.querySelector('#nav-ai-btn')?.addEventListener('click', () => {
    callbacks.onToggleAi();
  });

  // Language Dropdown Toggle
  const langWrapper = container.querySelector('#lang-dropdown-wrapper');
  const langBtn = container.querySelector('#lang-dropdown-btn');
  const langMenu = container.querySelector('#lang-dropdown-menu') as HTMLElement;

  langBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (langMenu) {
      langMenu.style.display = langMenu.style.display === 'block' ? 'none' : 'block';
    }
  });

  document.addEventListener('click', (e) => {
    if (langMenu && !langWrapper?.contains(e.target as Node)) {
      langMenu.style.display = 'none';
    }
  });

  container.querySelectorAll('.lang-option-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code') as LanguageCode;
      if (code) {
        if (langMenu) langMenu.style.display = 'none';
        callbacks.onLanguageChange(code);
      }
    });
  });

  // Mobile menu toggle
  const mobileBtn = container.querySelector('#mobile-menu-btn');
  const mobileDrawer = container.querySelector('#mobile-nav-drawer') as HTMLElement;
  mobileBtn?.addEventListener('click', () => {
    if (mobileDrawer) {
      mobileDrawer.style.display = mobileDrawer.style.display === 'block' ? 'none' : 'block';
    }
  });
}
