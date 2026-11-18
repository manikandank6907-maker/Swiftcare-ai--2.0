import { BookingRequest } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';
import { getBookingRequests, updateBookingStatus } from '../services/storageService';
import { googleSignIn, isGoogleDriveConnected } from '../services/googleAuthService';
import {
  GOOGLE_DRIVE_MY_DRIVE_URL,
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

export function renderRequestTracker(
  container: HTMLElement,
  translations: TranslationDictionary,
  filterId?: string,
  onNavigateSearch?: () => void
): void {
  const allRequests = getBookingRequests();
  let displayedRequests = filterId
    ? allRequests.filter((r) => r.id.toLowerCase().includes(filterId.toLowerCase()))
    : allRequests;

  container.innerHTML = `
    <div class="container py-8">
      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span style="color: var(--color-accent);">${Icons.calendar}</span>
            <h1 style="font-size: 1.75rem;">${translations.myRequestsTitle}</h1>
          </div>
          <p style="color: var(--color-text-muted); font-size: 0.95rem;">
            Real-time status tracking for healthcare appointment requests submitted via SwiftCare AI.
          </p>
        </div>

        <!-- Lookup search bar -->
        <div class="flex items-center gap-2" style="max-width: 400px; width: 100%;">
          <input
            type="text"
            id="tracker-lookup-input"
            class="form-input"
            placeholder="${translations.lookupPlaceholder}"
            value="${escapeHtml(filterId || '')}"
          />
          <button id="tracker-lookup-btn" class="btn btn-primary btn-sm">
            ${Icons.search} ${translations.trackBtn}
          </button>
        </div>
      </div>

      <!-- Drive Operation Feedback Banner -->
      <div id="tracker-drive-status" style="display: none;" class="mb-4"></div>

      <!-- Requests List or Empty State -->
      <div id="tracker-list-container">
        ${
          displayedRequests.length === 0
            ? `
          <div class="card p-12 text-center" style="max-width: 600px; margin: 40px auto;">
            <div style="width: 56px; height: 56px; background: #e0f2fe; color: var(--color-accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              ${Icons.calendar}
            </div>
            <h3 style="font-size: 1.25rem; margin-bottom: 8px;">No Appointment Requests Found</h3>
            <p style="color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 24px;">
              ${translations.myRequestsEmpty}
            </p>
            <button id="tracker-find-care-btn" class="btn btn-accent">
              ${Icons.search} ${translations.searchBtn}
            </button>
          </div>
        `
            : `
          <div class="grid grid-cols-1 gap-6">
            ${displayedRequests
              .map((req) => renderRequestCard(req, translations))
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;

  // Event handlers
  const lookupInput = container.querySelector('#tracker-lookup-input') as HTMLInputElement;
  const lookupBtn = container.querySelector('#tracker-lookup-btn');
  const driveStatusBanner = container.querySelector('#tracker-drive-status') as HTMLElement;

  const showDriveStatus = (type: 'success' | 'error', text: string, linkUrl?: string) => {
    if (!driveStatusBanner) return;
    driveStatusBanner.style.display = 'flex';
    driveStatusBanner.className = 'mb-4 p-3 flex items-center justify-between flex-wrap gap-2';
    driveStatusBanner.style.borderRadius = '10px';
    driveStatusBanner.style.fontSize = '0.9rem';
    driveStatusBanner.style.background = type === 'success' ? '#ecfdf5' : '#fef2f2';
    driveStatusBanner.style.color = type === 'success' ? '#065f46' : '#991b1b';
    driveStatusBanner.style.border = `1px solid ${type === 'success' ? '#a7f3d0' : '#fecaca'}`;
    driveStatusBanner.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        <span>${type === 'success' ? Icons.checkCircle : Icons.alertTriangle}</span>
        <span>${escapeHtml(text)}</span>
        ${
          linkUrl
            ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="font-weight: 700; text-decoration: underline; color: inherit;">Open in Drive</a>`
            : ''
        }
      </div>
      <button type="button" id="tracker-dismiss-drive-status" class="btn btn-subtle btn-sm p-1" aria-label="Dismiss">${Icons.x}</button>
    `;
    driveStatusBanner.querySelector('#tracker-dismiss-drive-status')?.addEventListener('click', () => {
      driveStatusBanner.style.display = 'none';
    });
  };

  const doLookup = () => {
    const val = lookupInput?.value.trim();
    renderRequestTracker(container, translations, val, onNavigateSearch);
  };

  lookupBtn?.addEventListener('click', doLookup);
  lookupInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLookup();
  });

  container.querySelector('#tracker-find-care-btn')?.addEventListener('click', () => {
    if (onNavigateSearch) onNavigateSearch();
  });

  // Cancel buttons on cards
  container.querySelectorAll('.cancel-request-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (id) {
        updateBookingStatus(id, 'rejected', 'Cancelled by patient request.');
        renderRequestTracker(container, translations, filterId, onNavigateSearch);
      }
    });
  });

  // Save to Google Drive buttons on cards
  container.querySelectorAll('.tracker-save-drive-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const req = allRequests.find((r) => r.id === id);
      if (!req) return;

      const consented = await requirePrivacyConsentModal({
        title: 'Save Booking Request to Google Drive?',
        description: `SwiftCare AI will save a text summary of request ${escapeHtml(req.id)} (${escapeHtml(req.providerName)}) to your personal Google Drive.`,
        checkboxLabel:
          'I understand SwiftCare AI is not HIPAA-certified and I consent to saving this appointment request summary to my Google Drive.',
        confirmLabel: 'Save to Google Drive',
      });
      if (!consented) return;

      const buttonEl = btn as HTMLButtonElement;
      buttonEl.disabled = true;
      buttonEl.textContent = 'Saving...';
      try {
        if (!isGoogleDriveConnected()) {
          await googleSignIn();
        }
        const saved = await saveBookingSummaryToDrive(req);
        buttonEl.textContent = `Saved: ${saved.name}`;
        buttonEl.style.color = '#047857';
        buttonEl.style.borderColor = '#a7f3d0';
        showDriveStatus(
          'success',
          `Saved "${saved.name}" to your Google Drive.`,
          saved.webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to save to Google Drive.';
        buttonEl.disabled = false;
        buttonEl.innerHTML = `${Icons.folder} Save to Google Drive`;
        showDriveStatus('error', `Failed to save request to Google Drive: ${msg}`);
      }
    });
  });
}

function renderRequestCard(req: BookingRequest, t: TranslationDictionary): string {
  const statusBadges = {
    pending_confirmation: {
      cls: 'badge-pending',
      icon: Icons.clock,
      text: t.statusPending,
      desc: 'Transmitted to clinic. Human staff are reviewing real-time chair/room availability.',
    },
    approved: {
      cls: 'badge-approved',
      icon: Icons.checkCircle,
      text: t.statusApproved,
      desc: 'The healthcare provider confirmed your arrival window. Please arrive 10 minutes prior.',
    },
    rejected: {
      cls: 'badge-rejected',
      icon: Icons.alertTriangle,
      text: t.statusRejected,
      desc: 'The requested time is fully booked. Please submit a request for an alternate slot.',
    },
    rescheduled: {
      cls: 'badge-pending',
      icon: Icons.refreshCw || Icons.clock,
      text: t.statusRescheduled,
      desc: 'Provider staff proposed an updated time slot based on clinical availability.',
    },
  };

  const statusInfo = statusBadges[req.status] || statusBadges.pending_confirmation;

  return `
    <div class="card p-6 card-hover" style="border-left: 4px solid ${
      req.status === 'approved' ? 'var(--color-success)' : req.status === 'rejected' ? 'var(--color-danger)' : 'var(--color-warning)'
    };">
      <div class="flex items-start justify-between flex-wrap gap-4 mb-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span style="font-weight: 800; font-size: 1.15rem; color: var(--color-primary);">${req.id}</span>
            <span class="badge badge-demo">Simulated Demo Request</span>
          </div>
          <h2 style="font-size: 1.25rem; font-weight: 700;">${req.providerName}</h2>
          <p style="font-size: 0.85rem; color: var(--color-text-muted);">${req.providerAddress}</p>
        </div>

        <div class="text-right">
          <span class="badge ${statusInfo.cls}" style="font-size: 0.85rem; padding: 6px 12px;">
            ${statusInfo.icon} ${statusInfo.text}
          </span>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 4px;">
            Requested: ${new Date(req.createdAt).toLocaleDateString()} at ${new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <!-- Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 mb-4" style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600;">
            Requested Appointment Slot
          </div>
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-primary);">
            ${req.date} • ${req.timeSlot}
          </div>
          <div style="font-size: 0.8rem; color: #0284c7; text-transform: capitalize;">
            ${req.visitType} Consultation
          </div>
        </div>

        <div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600;">
            Patient Information
          </div>
          <div style="font-weight: 600; font-size: 0.95rem;">
            ${req.patientName}
          </div>
          <div style="font-size: 0.8rem; color: var(--color-text-muted);">
            ${req.patientPhone} • ${req.patientEmail}
          </div>
        </div>

        <div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600;">
            Reason / Symptoms
          </div>
          <div style="font-size: 0.9rem; color: var(--color-primary-light);">
            ${req.reason}
          </div>
        </div>
      </div>

      <!-- Staff Note / Confirmation info if present -->
      ${
        req.confirmedTime || req.staffNotes
          ? `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
          <div class="flex items-center gap-2 mb-1" style="color: #065f46; font-weight: 700; font-size: 0.85rem;">
            ${Icons.checkCircle} Clinic Staff Response:
          </div>
          ${req.confirmedTime ? `<div style="font-weight: 600; color: #047857; margin-bottom: 2px;">${req.confirmedTime}</div>` : ''}
          ${req.staffNotes ? `<div style="font-size: 0.85rem; color: #064e3b;">Note: ${req.staffNotes}</div>` : ''}
        </div>
      `
          : `
        <div style="font-size: 0.85rem; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;">
          ${Icons.clock} ${statusInfo.desc}
        </div>
      `
      }

      ${
        req.attachedDriveFile
          ? `
        <div class="flex items-center gap-2 mb-4 p-2.5" style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; font-size: 0.85rem; color: #0369a1;">
          <span>${Icons.folder}</span>
          <span>Attached Care Document: <strong>${req.attachedDriveFile.name}</strong></span>
          ${
            req.attachedDriveFile.webViewLink
              ? `<a href="${req.attachedDriveFile.webViewLink}" target="_blank" rel="noopener noreferrer" style="margin-left: auto; color: #0284c7; font-weight: 600;">Open in Drive</a>`
              : ''
          }
        </div>
      `
          : ''
      }

      <div class="flex items-center justify-between flex-wrap gap-2 pt-3" style="border-top: 1px solid #f1f5f9;">
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">
          Reference ID: <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${req.id}</code>
        </span>
        <div class="flex gap-2 flex-wrap">
          <button class="btn btn-outline btn-sm tracker-save-drive-btn" data-id="${req.id}">
            ${Icons.folder} Save to Google Drive
          </button>
          ${
            req.status === 'pending_confirmation' || req.status === 'rescheduled'
              ? `
            <button class="btn btn-outline btn-sm cancel-request-btn" data-id="${req.id}" style="color: #ef4444; border-color: #fca5a5;">
              Cancel Request
            </button>
          `
              : ''
          }
        </div>
      </div>
    </div>
  `;
}
