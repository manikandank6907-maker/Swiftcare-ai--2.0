import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';

export function renderAboutTrust(
  container: HTMLElement,
  translations: TranslationDictionary
): void {
  container.innerHTML = `
    <div class="container py-12" style="max-width: 960px;">
      <!-- Title & Mission -->
      <div class="text-center mb-12">
        <div class="badge badge-primary mb-3" style="padding: 6px 14px; font-size: 0.85rem;">
          ${Icons.shield} Trust, Safety & Regulatory Standards
        </div>
        <h1 style="font-size: 2.25rem; font-weight: 800; margin-bottom: 12px; color: var(--color-primary);">
          ${translations.aboutTitle}
        </h1>
        <p style="font-size: 1.15rem; color: var(--color-text-muted); max-width: 720px; margin: 0 auto; line-height: 1.6;">
          ${translations.aboutVision}
        </p>
      </div>

      <!-- Core Pillars -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div class="card p-6" style="border-top: 4px solid var(--color-accent);">
          <div class="flex items-center gap-3 mb-3">
            <div style="background: var(--color-accent-light); color: var(--color-accent); padding: 8px; border-radius: 10px;">
              ${Icons.search}
            </div>
            <h2 style="font-size: 1.25rem; font-weight: 700;">Healthcare Discovery Platform</h2>
          </div>
          <p style="color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6;">
            SwiftCare AI aggregates scheduling signals from community clinics, urgent care centers, and telehealth networks. It is designed to match patient urgency with available care capacity to minimize waiting room delays.
          </p>
        </div>

        <div class="card p-6" style="border-top: 4px solid #10b981;">
          <div class="flex items-center gap-3 mb-3">
            <div style="background: #ecfdf5; color: #10b981; padding: 8px; border-radius: 10px;">
              ${Icons.checkCircle}
            </div>
            <h2 style="font-size: 1.25rem; font-weight: 700;">Human Staff Confirmation</h2>
          </div>
          <p style="color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6;">
            To ensure patient safety and avoid overbooking, SwiftCare AI never creates unverified automatic bookings. All requests pass to licensed provider staff who confirm or reschedule based on real-time clinical staffing.
          </p>
        </div>

        <div class="card p-6" style="border-top: 4px solid #f59e0b;">
          <div class="flex items-center gap-3 mb-3">
            <div style="background: #fffbeb; color: #f59e0b; padding: 8px; border-radius: 10px;">
              ${Icons.shield}
            </div>
            <h2 style="font-size: 1.25rem; font-weight: 700;">Privacy & Ethical AI</h2>
          </div>
          <p style="color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6;">
            We operate under strict privacy-by-design standards. The AI assistant assists exclusively with care navigation and logistical guidance. It does not store medical records or harvest personal identifiable health data.
          </p>
        </div>

        <div class="card p-6" style="border-top: 4px solid #ef4444;">
          <div class="flex items-center gap-3 mb-3">
            <div style="background: #fef2f2; color: #ef4444; padding: 8px; border-radius: 10px;">
              ${Icons.alertTriangle}
            </div>
            <h2 style="font-size: 1.25rem; font-weight: 700;">Emergency Boundaries</h2>
          </div>
          <p style="color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6;">
            SwiftCare AI is strictly for non-life-threatening appointment scheduling. In any life-threatening situation (chest pain, severe bleeding, stroke symptoms, respiratory distress), users are guided directly to call 911 or local emergency services.
          </p>
        </div>
      </div>

      <!-- Boundaries Box: What We Are NOT -->
      <div class="card p-8 mb-12" style="background: #fff1f2; border: 1px solid #fecdd3;">
        <h2 style="font-size: 1.35rem; font-weight: 800; color: #9f1239; margin-bottom: 16px;">
          What SwiftCare AI Is NOT
        </h2>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; color: #881337; font-size: 0.95rem;">
          <li class="flex items-start gap-3">
            <span style="color: #e11d48; margin-top: 2px;">${Icons.x}</span>
            <span><strong>${translations.aboutNotHospital}</strong> We do not operate hospitals or employ clinicians directly.</span>
          </li>
          <li class="flex items-start gap-3">
            <span style="color: #e11d48; margin-top: 2px;">${Icons.x}</span>
            <span><strong>${translations.aboutNotDiagnostic}</strong> The AI navigation assistant does not diagnose diseases, interpret lab tests, or prescribe medications.</span>
          </li>
          <li class="flex items-start gap-3">
            <span style="color: #e11d48; margin-top: 2px;">${Icons.x}</span>
            <span><strong>${translations.aboutNotEmergency}</strong> We do not dispatch emergency vehicles or integrate with 911 dispatch centers.</span>
          </li>
          <li class="flex items-start gap-3">
            <span style="color: #e11d48; margin-top: 2px;">${Icons.x}</span>
            <span><strong>No Guaranteed 30-Minute Appointments:</strong> Arrival times and wait estimates are estimates provided by demo facilities and subject to change based on in-person triage.</span>
          </li>
          <li class="flex items-start gap-3">
            <span style="color: #e11d48; margin-top: 2px;">${Icons.x}</span>
            <span><strong>Not a Real-Doctor Directory or HIPAA-Certified Service:</strong> SwiftCare AI does not list real physicians' personal or professional profiles, does not create fake doctor directories, and does not claim HIPAA compliance.</span>
          </li>
        </ul>
      </div>

      <!-- Demo & Data Transparency Notice -->
      <div class="card p-6 mb-8" style="background: #f8fafc; border: 1px dashed #cbd5e1;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">
          Simulated Provider Demonstration & Consent Standards
        </h3>
        <p style="color: var(--color-text-muted); font-size: 0.9rem; line-height: 1.6;">
          ${translations.aboutDemoNotice} No real patient records, real doctor profiles, or verified live clinic feeds are used. Sample facility names and addresses are strictly for demonstrating the scheduling workflow.
        </p>
      </div>

      <!-- Privacy & Terms -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm" style="color: var(--color-text-muted);">
        <div>
          <h4 style="font-weight: 700; color: var(--color-primary); margin-bottom: 6px;">Privacy & Google Drive Consent Summary</h4>
          <p>
            Demo requests remain in your browser session (LocalStorage). When you sign in with Google, OAuth access tokens stay strictly in memory and are cleared on sign-out. Explicit user consent is always required before reading any Google Drive file for AI navigation summaries or saving AI-generated reports back to your personal Drive. SwiftCare AI does not claim HIPAA compliance.
          </p>
        </div>
        <div>
          <h4 style="font-weight: 700; color: var(--color-primary); margin-bottom: 6px;">Terms of Service Summary</h4>
          <p>
            By using SwiftCare AI, you acknowledge that appointment requests are expressions of interest requiring clinic authorization, AI document summaries are strictly non-diagnostic, and emergencies must be routed through official national emergency numbers.
          </p>
        </div>
      </div>
    </div>
  `;
}
