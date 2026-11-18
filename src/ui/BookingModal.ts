import { BookingRequest, DriveFile, HealthcareProvider, TimeSlot, VisitType } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';
import { generateBookingId, saveBookingRequest } from '../services/storageService';
import {
  getGoogleSignInButtonHtml,
  googleSignIn,
  isGoogleDriveConnected,
} from '../services/googleAuthService';
import {
  GOOGLE_DRIVE_MY_DRIVE_URL,
  listDriveFiles,
  requirePrivacyConsentModal,
  saveBookingSummaryToDrive,
} from '../services/googleDriveService';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface BookingModalOptions {
  provider: HealthcareProvider;
  selectedSlot?: TimeSlot;
  translations: TranslationDictionary;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

export function openBookingModal(options: BookingModalOptions): void {
  const { provider, selectedSlot, translations: t, onClose, onSuccess } = options;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'swiftcare-booking-modal';

  const defaultSlot = selectedSlot || provider.sampleSlots[0];
  let currentSlot = defaultSlot;
  let currentVisitType: VisitType = defaultSlot.type;
  let driveFiles: DriveFile[] = [];
  let selectedDriveFile: DriveFile | null = null;

  overlay.innerHTML = `
    <div class="modal-content p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 pb-3" style="border-bottom: 1px solid var(--color-border)">
        <div class="flex items-center gap-3">
          <div style="background-color: var(--color-accent-light); color: var(--color-accent); padding: 8px; border-radius: 10px;">
            ${Icons.calendar}
          </div>
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 700;">${t.modalTitle}</h2>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">${t.modalSubtitle}</p>
          </div>
        </div>
        <button id="modal-close-btn" class="btn btn-subtle p-2" aria-label="${t.cancel}">
          ${Icons.x}
        </button>
      </div>

      <!-- Provider Summary Banner -->
      <div style="background: #f1f5f9; border-radius: 12px; padding: 14px; margin-bottom: 18px; border: 1px solid #e2e8f0;">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="badge badge-primary mb-1">${provider.categoryLabel}</div>
            <h3 style="font-size: 1.05rem; font-weight: 700;">${provider.name}</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">${provider.address}, ${provider.city}</p>
          </div>
          <div class="text-right">
            <span class="badge badge-urgent mb-1">${Icons.clock} ${provider.waitTimeEstimate}</span>
            <div style="font-size: 0.8rem; color: var(--color-text-muted);">${provider.phone}</div>
          </div>
        </div>
      </div>

      <!-- Time Slots Selector -->
      <div class="mb-4">
        <label style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary); display: block; margin-bottom: 6px;">
          ${t.preferredSlot}
        </label>
        <div class="flex flex-wrap gap-2" id="modal-slot-chips">
          ${provider.sampleSlots
            .map(
              (slot) => `
            <button type="button" class="time-slot-btn ${slot.id === currentSlot.id ? 'selected' : ''}" data-slot-id="${slot.id}">
              <span>${slot.time}</span>
              <small style="opacity: 0.75; font-size: 0.72rem; text-transform: uppercase;">${slot.type}</small>
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Form Inputs -->
      <form id="booking-request-form">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
              ${t.patientName} *
            </label>
            <input type="text" id="patient-name-input" class="form-input" placeholder="e.g. Eleanor Vance" required />
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
              ${t.patientEmail} *
            </label>
            <input type="email" id="patient-email-input" class="form-input" placeholder="e.g. eleanor.vance@example.com" required />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
              ${t.patientPhone} *
            </label>
            <input type="tel" id="patient-phone-input" class="form-input" placeholder="e.g. (555) 234-5678" required />
          </div>
          <div>
            <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
              ${t.insuranceLabel}
            </label>
            <input type="text" id="patient-insurance-input" class="form-input" placeholder="e.g. Blue Shield PPO or Self-Pay" />
          </div>
        </div>

        <div class="mb-4">
          <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
            ${t.reasonLabel} *
          </label>
          <textarea id="patient-reason-input" class="form-textarea" rows="2" placeholder="Briefly describe your symptoms or reason for the requested visit..." required></textarea>
        </div>

        <!-- Optional Google Drive Care Document Attachment -->
        <div class="mb-4 p-3" style="background: #f8fafc; border: 1px solid var(--color-border); border-radius: 10px;">
          <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--color-primary);" class="flex items-center gap-1.5">
              <span style="color: var(--color-accent);">${Icons.folder}</span>
              <span>Attach Care Document from Google Drive (Optional)</span>
            </label>
          </div>
          <div id="modal-drive-attach-area">
            ${
              isGoogleDriveConnected()
                ? `<span style="font-size: 0.82rem; color: var(--color-text-muted);">Loading your Google Drive files...</span>`
                : `
              <div class="flex items-center justify-between flex-wrap gap-2">
                <span style="font-size: 0.8rem; color: var(--color-text-muted);">Sign in with Google to attach referral letters or lab reports.</span>
                ${getGoogleSignInButtonHtml('modal-drive-signin-btn', 'Sign in with Google')}
              </div>
            `
            }
          </div>
        </div>

        <!-- Safety Consent Checkbox -->
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px; margin-bottom: 20px;">
          <label class="flex items-start gap-3" style="cursor: pointer; font-size: 0.85rem; color: #92400e;">
            <input type="checkbox" id="patient-consent-checkbox" required style="margin-top: 3px; accent-color: var(--color-accent); width: 16px; height: 16px;" />
            <span>${t.safetyConsent}</span>
          </label>
        </div>

        <!-- Form Buttons -->
        <div class="flex items-center justify-end gap-3 pt-3" style="border-top: 1px solid var(--color-border);">
          <button type="button" id="modal-cancel-btn" class="btn btn-outline">
            ${t.cancel}
          </button>
          <button type="submit" id="modal-submit-btn" class="btn btn-accent">
            ${Icons.checkCircle} ${t.submitRequest}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close actions
  const close = () => {
    overlay.remove();
    onClose();
  };

  overlay.querySelector('#modal-close-btn')?.addEventListener('click', close);
  overlay.querySelector('#modal-cancel-btn')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // Slot chip selection
  overlay.querySelectorAll('.time-slot-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slotId = btn.getAttribute('data-slot-id');
      const found = provider.sampleSlots.find((s) => s.id === slotId);
      if (found) {
        currentSlot = found;
        currentVisitType = found.type;
        overlay.querySelectorAll('.time-slot-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
    });
  });

  const loadDrivePicker = async () => {
    const area = overlay.querySelector('#modal-drive-attach-area') as HTMLElement;
    if (!area) return;
    if (!isGoogleDriveConnected()) return;

    area.innerHTML = `<span style="font-size: 0.82rem; color: var(--color-text-muted);">Loading your Google Drive files...</span>`;
    try {
      driveFiles = await listDriveFiles('', 'all', 20);
      area.innerHTML = `
        <select id="modal-drive-file-select" class="form-select" style="font-size: 0.85rem; padding: 0.45rem 0.75rem;">
          <option value="">-- No document attached --</option>
          ${driveFiles
            .map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`)
            .join('')}
        </select>
      `;
      const selectEl = area.querySelector('#modal-drive-file-select') as HTMLSelectElement;
      selectEl?.addEventListener('change', () => {
        selectedDriveFile = driveFiles.find((f) => f.id === selectEl.value) || null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load Drive files.';
      area.innerHTML = `
        <div class="flex items-center justify-between flex-wrap gap-2">
          <span style="font-size: 0.8rem; color: #dc2626;">${escapeHtml(msg)} Please sign in again to attach Drive files.</span>
          ${getGoogleSignInButtonHtml('modal-drive-signin-btn', 'Sign in with Google')}
        </div>
      `;
      bindModalDriveSignIn();
    }
  };

  const bindModalDriveSignIn = () => {
    const area = overlay.querySelector('#modal-drive-attach-area') as HTMLElement;
    const btn = overlay.querySelector('#modal-drive-signin-btn') as HTMLButtonElement;
    btn?.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await googleSignIn();
        await loadDrivePicker();
      } catch (err: unknown) {
        btn.disabled = false;
        const msg = err instanceof Error ? err.message : 'Google Sign-In failed or cancelled.';
        const existingErr = area?.querySelector('#modal-drive-signin-error');
        if (existingErr) existingErr.remove();
        if (area) {
          const errDiv = document.createElement('div');
          errDiv.id = 'modal-drive-signin-error';
          errDiv.style.cssText = 'margin-top: 6px; font-size: 0.78rem; color: #dc2626;';
          errDiv.textContent = msg;
          area.appendChild(errDiv);
        }
      }
    });
  };

  if (isGoogleDriveConnected()) {
    void loadDrivePicker();
  } else {
    bindModalDriveSignIn();
  }

  // Form submission
  const form = overlay.querySelector('#booking-request-form') as HTMLFormElement;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = overlay.querySelector('#patient-name-input') as HTMLInputElement;
    const emailInput = overlay.querySelector('#patient-email-input') as HTMLInputElement;
    const phoneInput = overlay.querySelector('#patient-phone-input') as HTMLInputElement;
    const reasonInput = overlay.querySelector('#patient-reason-input') as HTMLTextAreaElement;
    const insuranceInput = overlay.querySelector('#patient-insurance-input') as HTMLInputElement;

    const submitBtn = overlay.querySelector('#modal-submit-btn') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `Submitting request...`;

    setTimeout(() => {
      const requestId = generateBookingId();
      const newBooking: BookingRequest = {
        id: requestId,
        patientName: nameInput.value.trim(),
        patientEmail: emailInput.value.trim(),
        patientPhone: phoneInput.value.trim(),
        providerId: provider.id,
        providerName: provider.name,
        providerAddress: provider.address,
        category: provider.category,
        date: currentSlot.date,
        timeSlot: currentSlot.time,
        visitType: currentVisitType,
        reason: reasonInput.value.trim(),
        symptoms: reasonInput.value.trim(),
        insuranceType: insuranceInput.value.trim() || 'Self-Pay / Not Provided',
        status: 'pending_confirmation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(selectedDriveFile
          ? {
              attachedDriveFile: {
                id: selectedDriveFile.id,
                name: selectedDriveFile.name,
                webViewLink: selectedDriveFile.webViewLink,
              },
            }
          : {}),
        isDemo: true,
      };
      saveBookingRequest(newBooking);

      // Show confirmation inside modal
      const modalContent = overlay.querySelector('.modal-content');
      if (modalContent) {
        modalContent.innerHTML = `
          <div class="p-8 text-center">
            <div style="width: 64px; height: 64px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              ${Icons.checkCircle}
            </div>
            <div class="badge badge-pending mb-3" style="font-size: 0.85rem; padding: 6px 14px;">
              ${Icons.clock} ${t.statusPending}
            </div>
            <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">
              Booking Request Received
            </h2>
            <p style="font-size: 0.95rem; color: var(--color-text-muted); max-width: 480px; margin: 0 auto 20px;">
              Your appointment request has been transmitted to <strong>${provider.name}</strong>. The clinic's staff will review availability and confirm your slot.
            </p>

            <!-- Tracking Code Box -->
            <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px; max-width: 380px; margin: 0 auto 20px;">
              <div style="font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600;">
                Request Tracking Reference
              </div>
              <div style="font-size: 1.4rem; font-weight: 800; color: var(--color-primary); letter-spacing: 0.05em; margin: 4px 0;">
                ${requestId}
              </div>
              <div style="font-size: 0.8rem; color: #0284c7;">
                Keep this ID to monitor confirmation status under My Requests
              </div>
            </div>

            <!-- Save Receipt to Google Drive -->
            <div id="confirm-drive-save-box" class="mb-6">
              ${
                isGoogleDriveConnected()
                  ? `
                <button type="button" id="confirm-save-drive-btn" class="btn btn-outline btn-sm">
                  ${Icons.folder} Save Booking Receipt to Google Drive
                </button>
              `
                  : `
                <div class="flex flex-col items-center gap-2">
                  <span style="font-size: 0.8rem; color: var(--color-text-muted);">Want to keep a copy of this request in your Google Drive?</span>
                  ${getGoogleSignInButtonHtml('confirm-drive-signin-btn', 'Sign in with Google to Save')}
                </div>
              `
              }
              <div id="confirm-drive-error" style="display: none; margin-top: 8px; color: #dc2626; font-size: 0.82rem;"></div>
            </div>

            <div class="flex justify-center gap-3 flex-wrap">
              <button id="modal-done-btn" class="btn btn-outline">
                Back to Search
              </button>
              <button id="modal-view-tracker-btn" class="btn btn-primary">
                View in My Requests
              </button>
            </div>
          </div>
        `;

        const showConfirmDriveError = (message: string) => {
          const errEl = modalContent.querySelector('#confirm-drive-error') as HTMLElement;
          if (errEl) {
            errEl.textContent = message;
            errEl.style.display = 'block';
          }
        };

        const showConfirmDriveSuccess = (name: string, webViewLink?: string) => {
          const box = modalContent.querySelector('#confirm-drive-save-box');
          if (box) {
            box.innerHTML = `
              <div class="p-3 inline-flex items-center justify-center flex-wrap gap-2" style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; color: #065f46; font-size: 0.85rem; font-weight: 600;">
                <span>${Icons.checkCircle}</span>
                <span>Saved "${escapeHtml(name)}" to your Google Drive!</span>
                <a href="${webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; color: #047857; font-weight: 700;">Open in Drive</a>
              </div>
            `;
          }
        };

        const bindSaveDriveBtn = () => {
          const saveBtn = modalContent.querySelector('#confirm-save-drive-btn') as HTMLButtonElement;
          saveBtn?.addEventListener('click', async () => {
            const consented = await requirePrivacyConsentModal({
              title: 'Save Booking Receipt to Google Drive?',
              description: `Save a summary of appointment request ${escapeHtml(requestId)} (${escapeHtml(provider.name)}) to your personal Google Drive.`,
              checkboxLabel:
                'I understand SwiftCare AI is not HIPAA-certified and I consent to saving this booking receipt to my Google Drive.',
              confirmLabel: 'Save to Google Drive',
            });
            if (!consented) return;

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving to Google Drive...';
            try {
              const created = await saveBookingSummaryToDrive(newBooking);
              showConfirmDriveSuccess(created.name, created.webViewLink);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Unable to save receipt to Google Drive.';
              saveBtn.disabled = false;
              saveBtn.textContent = 'Retry Save to Google Drive';
              showConfirmDriveError(`Failed to save to Drive: ${msg}`);
            }
          });
        };

        bindSaveDriveBtn();

        const confirmSignInBtn = modalContent.querySelector('#confirm-drive-signin-btn') as HTMLButtonElement;
        confirmSignInBtn?.addEventListener('click', async () => {
          const consented = await requirePrivacyConsentModal({
            title: 'Connect Google Drive & Save Receipt?',
            description: `Sign in with Google and save a copy of appointment request ${escapeHtml(requestId)} to your personal Google Drive.`,
            checkboxLabel:
              'I understand SwiftCare AI is not HIPAA-certified and I explicitly grant permission to save this receipt to my Google Drive.',
            confirmLabel: 'Sign in & Save',
          });
          if (!consented) return;

          confirmSignInBtn.disabled = true;
          try {
            await googleSignIn();
            const created = await saveBookingSummaryToDrive(newBooking);
            showConfirmDriveSuccess(created.name, created.webViewLink);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Google Sign-In or Drive save failed.';
            confirmSignInBtn.disabled = false;
            showConfirmDriveError(msg);
          }
        });

        modalContent.querySelector('#modal-done-btn')?.addEventListener('click', close);
        modalContent.querySelector('#modal-view-tracker-btn')?.addEventListener('click', () => {
          overlay.remove();
          onSuccess(requestId);
        });
      }
    }, 600);
  });
}
