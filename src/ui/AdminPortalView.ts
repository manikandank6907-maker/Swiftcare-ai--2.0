import { BookingRequest, BookingStatus } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';
import { getBookingRequests, updateBookingStatus } from '../services/storageService';

export function renderAdminPortal(
  container: HTMLElement,
  translations: TranslationDictionary
): void {
  const requests = getBookingRequests();

  const total = requests.length;
  const pending = requests.filter((r) => r.status === 'pending_confirmation').length;
  const approved = requests.filter((r) => r.status === 'approved').length;
  const declined = requests.filter((r) => r.status === 'rejected').length;

  container.innerHTML = `
    <div class="container py-8">
      <!-- Top Banner -->
      <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span style="color: var(--color-accent);">${Icons.building}</span>
            <h1 style="font-size: 1.75rem;">${translations.adminTitle}</h1>
          </div>
          <p style="color: var(--color-text-muted); font-size: 0.95rem;">
            ${translations.adminSubtitle}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge badge-demo">Simulated Staff Environment</span>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="card p-4" style="border-top: 3px solid var(--color-primary);">
          <div style="font-size: 0.8rem; color: var(--color-text-muted); font-weight: 600;">
            ${translations.adminStatTotal}
          </div>
          <div style="font-size: 1.75rem; font-weight: 800; color: var(--color-primary);">
            ${total}
          </div>
        </div>

        <div class="card p-4" style="border-top: 3px solid #f59e0b;">
          <div style="font-size: 0.8rem; color: var(--color-text-muted); font-weight: 600;">
            ${translations.adminStatPending}
          </div>
          <div style="font-size: 1.75rem; font-weight: 800; color: #b45309;">
            ${pending}
          </div>
        </div>

        <div class="card p-4" style="border-top: 3px solid #10b981;">
          <div style="font-size: 0.8rem; color: var(--color-text-muted); font-weight: 600;">
            ${translations.adminStatApproved}
          </div>
          <div style="font-size: 1.75rem; font-weight: 800; color: #047857;">
            ${approved}
          </div>
        </div>

        <div class="card p-4" style="border-top: 3px solid #ef4444;">
          <div style="font-size: 0.8rem; color: var(--color-text-muted); font-weight: 600;">
            ${translations.adminStatDeclined}
          </div>
          <div style="font-size: 1.75rem; font-weight: 800; color: #b91c1c;">
            ${declined}
          </div>
        </div>
      </div>

      <!-- Staff Actions Notice -->
      <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; color: #0369a1; font-size: 0.9rem;" class="flex items-center gap-3">
        <span>${Icons.shield}</span>
        <span>
          <strong>Clinical Verification Mode:</strong> In accordance with healthcare safety regulations, real bookings require authorized staff triage. Approving, rescheduling, or declining requests here immediately updates patient visibility in the <em>My Requests</em> tab.
        </span>
      </div>

      <!-- Requests Table / Card List -->
      <div class="card p-6">
        <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 16px;">
          Incoming Appointment Requests
        </h2>

        ${
          requests.length === 0
            ? `<p style="color: var(--color-text-muted);">No booking requests found.</p>`
            : `
          <div class="grid grid-cols-1 gap-4">
            ${requests
              .map((req) => renderAdminRequestRow(req, translations))
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;

  // Attach button event listeners (using custom in-app modal instead of native prompt)
  container.querySelectorAll('.admin-approve-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      const result = await openStaffActionModal({
        title: 'Approve Demo Request',
        fields: [
          {
            id: 'note',
            label: 'Confirmation Details (e.g. Room assignment or Check-in instructions)',
            defaultValue: 'Confirmed arrival window. Room 2 prepped.',
          },
        ],
        confirmLabel: translations.adminApprove,
      });
      if (result) {
        updateBookingStatus(id, 'approved', result.note, 'Confirmed by Staff');
        renderAdminPortal(container, translations);
      }
    });
  });

  container.querySelectorAll('.admin-reschedule-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      const result = await openStaffActionModal({
        title: 'Propose Updated Time Slot',
        fields: [
          {
            id: 'newTime',
            label: 'Proposed Time Slot for Patient',
            defaultValue: '11:45 AM Today',
          },
          {
            id: 'note',
            label: 'Reason for Reschedule',
            defaultValue: 'Clinic staff running 30 mins behind.',
          },
        ],
        confirmLabel: translations.adminProposeTime,
      });
      if (result) {
        updateBookingStatus(
          id,
          'rescheduled',
          result.note || 'Staff proposed alternative slot.',
          `Proposed: ${result.newTime || 'Alternate slot'}`
        );
        renderAdminPortal(container, translations);
      }
    });
  });

  container.querySelectorAll('.admin-reject-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!id) return;
      const result = await openStaffActionModal({
        title: 'Decline Demo Request',
        fields: [
          {
            id: 'reason',
            label: 'Reason for Declining (e.g. Capacity reached, out-of-scope symptom)',
            defaultValue: 'Chair capacity reached for requested hour.',
          },
        ],
        confirmLabel: translations.adminReject,
      });
      if (result) {
        updateBookingStatus(id, 'rejected', result.reason);
        renderAdminPortal(container, translations);
      }
    });
  });
}

function openStaffActionModal(options: {
  title: string;
  fields: { id: string; label: string; defaultValue: string }[];
  confirmLabel: string;
}): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '70';

    overlay.innerHTML = `
      <div class="modal-content p-6" style="max-width: 480px;">
        <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 14px; color: var(--color-primary);">
          ${options.title}
        </h3>
        <form id="staff-action-modal-form">
          ${options.fields
            .map(
              (f) => `
            <div class="mb-4">
              <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px; color: var(--color-primary);">
                ${f.label}
              </label>
              <input type="text" id="staff-field-${f.id}" class="form-input" value="${f.defaultValue.replace(/"/g, '&quot;')}" required />
            </div>
          `
            )
            .join('')}
          <div class="flex items-center justify-end gap-2 pt-3" style="border-top: 1px solid var(--color-border);">
            <button type="button" id="staff-modal-cancel" class="btn btn-outline btn-sm">Cancel</button>
            <button type="submit" class="btn btn-accent btn-sm">${options.confirmLabel}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    const firstInput = overlay.querySelector('input') as HTMLInputElement;
    firstInput?.focus();

    const cleanup = (val: Record<string, string> | null) => {
      overlay.remove();
      resolve(val);
    };

    overlay.querySelector('#staff-modal-cancel')?.addEventListener('click', () => cleanup(null));
    overlay.querySelector('#staff-action-modal-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const values: Record<string, string> = {};
      for (const f of options.fields) {
        const el = overlay.querySelector(`#staff-field-${f.id}`) as HTMLInputElement;
        values[f.id] = el?.value.trim() || '';
      }
      cleanup(values);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });
  });
}

function renderAdminRequestRow(req: BookingRequest, t: TranslationDictionary): string {
  const statusPills: Record<BookingStatus, string> = {
    pending_confirmation: `<span class="badge badge-pending">${Icons.clock} ${t.statusPending}</span>`,
    approved: `<span class="badge badge-approved">${Icons.checkCircle} ${t.statusApproved}</span>`,
    rejected: `<span class="badge badge-rejected">${Icons.alertTriangle} ${t.statusRejected}</span>`,
    rescheduled: `<span class="badge badge-pending">${t.statusRescheduled}</span>`,
  };

  return `
    <div class="p-4" style="background: #f8fafc; border: 1px solid var(--color-border); border-radius: 12px;">
      <div class="flex items-start justify-between flex-wrap gap-3 mb-2">
        <div class="flex items-center gap-2">
          <span style="font-weight: 800; font-size: 1rem; color: var(--color-primary);">${req.id}</span>
          ${statusPills[req.status] || ''}
          <span style="font-size: 0.8rem; color: var(--color-text-muted);">
            • Requested: ${new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div class="flex items-center gap-2">
          ${
            req.status !== 'approved'
              ? `
            <button class="btn btn-sm btn-accent admin-approve-btn" data-id="${req.id}">
              ${Icons.checkCircle} ${t.adminApprove}
            </button>
          `
              : ''
          }
          ${
            req.status !== 'rescheduled' && req.status !== 'approved'
              ? `
            <button class="btn btn-sm btn-outline admin-reschedule-btn" data-id="${req.id}">
              ${t.adminProposeTime}
            </button>
          `
              : ''
          }
          ${
            req.status !== 'rejected'
              ? `
            <button class="btn btn-sm btn-subtle admin-reject-btn" data-id="${req.id}" style="color: #ef4444;">
              ${t.adminReject}
            </button>
          `
              : ''
          }
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2" style="font-size: 0.85rem;">
        <div>
          <span style="color: var(--color-text-muted);">Patient:</span>
          <strong>${req.patientName}</strong> (${req.patientPhone})
        </div>
        <div>
          <span style="color: var(--color-text-muted);">Provider & Slot:</span>
          <strong>${req.providerName}</strong> — ${req.date} at ${req.timeSlot}
        </div>
        <div>
          <span style="color: var(--color-text-muted);">Insurance:</span>
          <span>${req.insuranceType}</span>
        </div>
      </div>

      <div style="font-size: 0.85rem; color: var(--color-primary-light); background: #ffffff; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;" class="mb-2">
        <strong>Reported Reason/Symptoms:</strong> ${req.reason}
      </div>

      ${
        req.confirmedTime || req.staffNotes
          ? `
        <div style="font-size: 0.8rem; color: #047857; background: #ecfdf5; padding: 6px 12px; border-radius: 6px;">
          ${req.confirmedTime ? `<strong>Confirmed:</strong> ${req.confirmedTime} ` : ''}
          ${req.staffNotes ? `(Staff Note: ${req.staffNotes})` : ''}
        </div>
      `
          : ''
      }
    </div>
  `;
}
