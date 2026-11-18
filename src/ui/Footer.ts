import { LanguageCode, NavigationTab } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';

export interface FooterCallbacks {
  onNavigate: (tab: NavigationTab) => void;
  onLanguageChange: (lang: LanguageCode) => void;
}

export function renderFooter(
  container: HTMLElement,
  translations: TranslationDictionary,
  callbacks: FooterCallbacks
): void {
  const t = translations;

  container.innerHTML = `
    <footer style="background: var(--color-primary); color: #94a3b8; border-top: 1px solid #1e293b; padding: 48px 0 24px; margin-top: auto;">
      <div class="container">
        <!-- Main Footer Columns -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10" style="border-bottom: 1px solid #1e293b; padding-bottom: 40px;">
          <!-- Col 1: Brand & Purpose -->
          <div class="md:col-span-2">
            <div class="flex items-center gap-3 mb-3">
              <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); color: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                ${Icons.cross}
              </div>
              <span style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                SWIFTCARE <span style="color: #38bdf8;">AI</span>
              </span>
            </div>
            <p style="font-size: 0.95rem; color: #cbd5e1; font-weight: 600; margin-bottom: 8px;">
              ${t.tagline}
            </p>
            <p style="font-size: 0.85rem; color: #94a3b8; line-height: 1.6; max-width: 440px; margin-bottom: 16px;">
              Global healthcare appointment discovery platform designed to alleviate clinic waiting rooms by connecting patients with earlier available care.
            </p>
            <div class="inline-flex items-center gap-2 px-3 py-1" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; font-size: 0.78rem; color: #fca5a5;">
              <span>${Icons.alertTriangle}</span>
              <span>Not for emergencies. Call 911 / 112 / 999 immediately in critical situations.</span>
            </div>
          </div>

          <!-- Col 2: Navigation -->
          <div>
            <h4 style="color: #ffffff; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
              Platform
            </h4>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.88rem;">
              <li><a href="#home" class="footer-nav-link" data-tab="home" style="color: #cbd5e1; text-decoration: none;">${t.navHome}</a></li>
              <li><a href="#search" class="footer-nav-link" data-tab="search" style="color: #cbd5e1; text-decoration: none;">${t.navFindCare}</a></li>
              <li><a href="#tracker" class="footer-nav-link" data-tab="tracker" style="color: #cbd5e1; text-decoration: none;">${t.navRequests}</a></li>
              <li><a href="#drive" class="footer-nav-link" data-tab="drive" style="color: #38bdf8; text-decoration: none;">${t.navDriveVault}</a></li>
              <li><a href="#admin" class="footer-nav-link" data-tab="admin" style="color: #cbd5e1; text-decoration: none;">${t.navProviderPortal}</a></li>
              <li><a href="#about" class="footer-nav-link" data-tab="about" style="color: #cbd5e1; text-decoration: none;">${t.navAboutTrust}</a></li>
              <li><a href="#xr" class="footer-nav-link" data-tab="xr" style="color: #818cf8; text-decoration: none;">${Icons.box3d} ${t.nav3dKiosk}</a></li>
            </ul>
          </div>

          <!-- Col 3: Trust & Compliance -->
          <div>
            <h4 style="color: #ffffff; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
              Trust & Safety
            </h4>
            <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: #94a3b8;">
              <li class="flex items-center gap-1.5">${Icons.shield} Discovery Platform Only</li>
              <li class="flex items-center gap-1.5">${Icons.checkCircle} Human Confirmation Protocol</li>
              <li class="flex items-center gap-1.5">${Icons.globe} 12 Global Languages</li>
              <li class="flex items-center gap-1.5">${Icons.pulse} Zero Clinical Diagnostics</li>
            </ul>
          </div>
        </div>

        <!-- Hackathon & Legal Disclaimer -->
        <div class="flex items-center justify-between flex-wrap gap-4 text-xs" style="color: #64748b;">
          <div>
            ${t.aboutDemoNotice}
          </div>
          <div>
            © 2026 SWIFTCARE AI. ${t.tagline}
          </div>
        </div>
      </div>
    </footer>
  `;

  container.querySelectorAll('.footer-nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab') as NavigationTab;
      if (tab) callbacks.onNavigate(tab);
    });
  });
}
