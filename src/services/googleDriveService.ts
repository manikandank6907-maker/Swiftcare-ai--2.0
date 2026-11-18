import { BookingRequest, DriveFile } from '../types';
import { getAccessToken, isGoogleDriveConnected } from './googleAuthService';
import { Icons } from '../ui/icons';

export const GOOGLE_DRIVE_MY_DRIVE_URL = 'https://drive.google.com/drive/my-drive';

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const MAX_ANALYZE_BYTES = 6 * 1024 * 1024; // 6 MB binary ceiling for Gemini inlineData

// Session-only explicit permission flag for automatic AI report storage (OFF by default)
let autoSaveReportsEnabled = false;
let autoSaveConsentGranted = false;

export function isAutoSaveReportsEnabled(): boolean {
  if (!isGoogleDriveConnected()) {
    autoSaveReportsEnabled = false;
    autoSaveConsentGranted = false;
    return false;
  }
  return autoSaveReportsEnabled && autoSaveConsentGranted;
}

export function setAutoSaveReportsEnabled(enabled: boolean): void {
  if (!enabled) {
    autoSaveReportsEnabled = false;
    return;
  }
  autoSaveConsentGranted = true;
  autoSaveReportsEnabled = true;
}

export function resetAutoSaveConsent(): void {
  autoSaveReportsEnabled = false;
  autoSaveConsentGranted = false;
}

async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }
  return token;
}

export async function listDriveFiles(
  queryText = '',
  mimeFilter = 'all',
  pageSize = 30
): Promise<DriveFile[]> {
  const token = await requireToken();

  const conditions: string[] = ['trashed = false'];
  if (queryText.trim()) {
    const escaped = queryText.trim().replace(/'/g, "\\'");
    conditions.push(`name contains '${escaped}'`);
  }
  if (mimeFilter === 'documents') {
    conditions.push(
      "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/plain')"
    );
  } else if (mimeFilter === 'spreadsheets') {
    conditions.push(
      "(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'text/csv')"
    );
  } else if (mimeFilter === 'images') {
    conditions.push("mimeType contains 'image/'");
  }

  const params = new URLSearchParams({
    pageSize: String(pageSize),
    q: conditions.join(' and '),
    fields:
      'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, owners, trashed)',
    orderBy: 'modifiedTime desc',
  });

  const res = await fetch(`${DRIVE_FILES_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Drive error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return (data.files || []) as DriveFile[];
}

export async function uploadFileToDrive(file: File): Promise<DriveFile> {
  const token = await requireToken();

  const metadata = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const res = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,iconLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (res.status === 401) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Upload failed (${res.status}): ${errBody}`);
  }

  return (await res.json()) as DriveFile;
}

export async function createTextFileInDrive(
  fileName: string,
  content: string,
  mimeType = 'text/plain'
): Promise<DriveFile> {
  const token = await requireToken();

  const metadata = {
    name: fileName,
    mimeType,
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', new Blob([content], { type: mimeType }));

  const res = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,iconLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (res.status === 401) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to save document (${res.status}): ${errBody}`);
  }

  return (await res.json()) as DriveFile;
}

export async function saveAiReportToDrive(
  title: string,
  reportBody: string,
  sourceFileName?: string
): Promise<DriveFile> {
  const safeBase = title
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'Care_Report';
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const fileName = `SwiftCare_AI_${safeBase}_${stamp}.txt`;

  const formatted = [
    '====================================================',
    'SWIFTCARE AI — CARE NAVIGATION & PREPARATION REPORT',
    '====================================================',
    `Generated At       : ${new Date().toLocaleString()}`,
    `Report Topic       : ${title}`,
    sourceFileName ? `Source Drive Doc   : ${sourceFileName}` : '',
    '',
    'REPORT CONTENT',
    '----------------------------------------------------',
    reportBody.trim(),
    '',
    'IMPORTANT PRIVACY & NON-DIAGNOSTIC DISCLAIMER',
    '----------------------------------------------------',
    '• Generated by SwiftCare AI ("Healthcare, Without the Wait.")',
    '  for personal appointment preparation and navigation only.',
    '• This report is NOT a medical diagnosis, clinical test',
    '  interpretation, or prescription.',
    '• SwiftCare AI is NOT a hospital or HIPAA-covered entity.',
    '• Saved strictly to your personal Google Drive at your request.',
    '• For emergencies, call 911 (or 112 / 999) immediately.',
    '====================================================',
  ]
    .filter(Boolean)
    .join('\n');

  return createTextFileInDrive(fileName, formatted, 'text/plain');
}

export async function saveBookingSummaryToDrive(
  req: BookingRequest
): Promise<DriveFile> {
  const fileName = `SwiftCare_Booking_${req.id}.txt`;
  const summary = [
    '====================================================',
    'SWIFTCARE AI — APPOINTMENT REQUEST RECORD',
    '====================================================',
    `Tracking Reference : ${req.id}`,
    `Current Status     : ${req.status.toUpperCase()}`,
    `Created At         : ${new Date(req.createdAt).toLocaleString()}`,
    '',
    'PROVIDER DETAILS (SIMULATED DEMO PROVIDER)',
    '----------------------------------------------------',
    `Facility           : ${req.providerName}`,
    `Address            : ${req.providerAddress}`,
    `Category           : ${req.category}`,
    '',
    'REQUESTED APPOINTMENT',
    '----------------------------------------------------',
    `Requested Date     : ${req.date}`,
    `Requested Time     : ${req.timeSlot}`,
    `Visit Modality     : ${req.visitType}`,
    req.confirmedTime ? `Confirmed/Proposed : ${req.confirmedTime}` : '',
    '',
    'PATIENT INFORMATION',
    '----------------------------------------------------',
    `Patient Name       : ${req.patientName}`,
    `Email              : ${req.patientEmail}`,
    `Phone              : ${req.patientPhone}`,
    `Insurance          : ${req.insuranceType}`,
    `Reason / Symptoms  : ${req.reason}`,
    req.attachedDriveFile
      ? `Attached Document  : ${req.attachedDriveFile.name}`
      : '',
    req.staffNotes ? `Staff Notes        : ${req.staffNotes}` : '',
    '',
    'SAFETY & CONFIRMATION NOTICE',
    '----------------------------------------------------',
    'SwiftCare AI is an appointment discovery and booking-request',
    'platform. Actual appointments require human clinic staff',
    'confirmation. Never use for life-threatening emergencies.',
    '====================================================',
  ]
    .filter(Boolean)
    .join('\n');

  return createTextFileInDrive(fileName, summary, 'text/plain');
}

export async function renameDriveFile(
  fileId: string,
  newName: string
): Promise<DriveFile> {
  const token = await requireToken();

  const res = await fetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,modifiedTime,webViewLink`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    }
  );

  if (res.status === 401) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Rename failed (${res.status}): ${errBody}`);
  }

  return (await res.json()) as DriveFile;
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await requireToken();

  const res = await fetch(`${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok && res.status !== 204) {
    const errBody = await res.text();
    throw new Error(`Delete failed (${res.status}): ${errBody}`);
  }
}

export async function downloadDriveFilePreview(
  file: DriveFile
): Promise<string> {
  const token = await requireToken();

  let url = `${DRIVE_FILES_API}/${encodeURIComponent(file.id)}?alt=media`;
  if (file.mimeType === 'application/vnd.google-apps.document') {
    url = `${DRIVE_FILES_API}/${encodeURIComponent(file.id)}/export?mimeType=text/plain`;
  } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    url = `${DRIVE_FILES_API}/${encodeURIComponent(file.id)}/export?mimeType=text/csv`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!res.ok) {
    throw new Error(`Unable to preview this file (${res.status})`);
  }

  return await res.text();
}

export interface DriveDocumentPayload {
  fileName: string;
  mimeType: string;
  textContent?: string;
  base64Data?: string;
}

const TEXT_ANALYZABLE_MIME_TYPES = new Set([
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'application/json',
]);

const BINARY_ANALYZABLE_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export function isDriveFileAnalyzable(file: DriveFile): boolean {
  return (
    file.mimeType === 'application/vnd.google-apps.document' ||
    file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
    file.mimeType === 'application/vnd.google-apps.presentation' ||
    TEXT_ANALYZABLE_MIME_TYPES.has(file.mimeType) ||
    BINARY_ANALYZABLE_MIME_TYPES.has(file.mimeType)
  );
}

export async function downloadDriveFileForAnalysis(
  file: DriveFile
): Promise<DriveDocumentPayload> {
  const token = await requireToken();

  if (!isDriveFileAnalyzable(file)) {
    throw new Error(
      `Unsupported file format (${file.mimeType}). Supported formats for AI analysis: Google Docs, Google Sheets, PDF, TXT, CSV, JSON, PNG, JPG, and WEBP.`
    );
  }

  if (file.size && Number(file.size) > MAX_ANALYZE_BYTES) {
    throw new Error(
      `"${file.name}" is larger than 6 MB. Please select a smaller document for AI analysis.`
    );
  }

  // Handle Google Workspace exportable docs & spreadsheets as text
  if (
    file.mimeType === 'application/vnd.google-apps.document' ||
    file.mimeType === 'application/vnd.google-apps.presentation' ||
    file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
    TEXT_ANALYZABLE_MIME_TYPES.has(file.mimeType)
  ) {
    let url = `${DRIVE_FILES_API}/${encodeURIComponent(file.id)}?alt=media`;
    let effectiveMime = file.mimeType;

    if (
      file.mimeType === 'application/vnd.google-apps.document' ||
      file.mimeType === 'application/vnd.google-apps.presentation'
    ) {
      url = `${DRIVE_FILES_API}/${encodeURIComponent(file.id)}/export?mimeType=text/plain`;
      effectiveMime = 'text/plain';
    } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
      url = `${DRIVE_FILES_API}/${encodeURIComponent(file.id)}/export?mimeType=text/csv`;
      effectiveMime = 'text/csv';
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new Error('AUTH_REQUIRED');
    if (!res.ok) {
      throw new Error(`Could not read "${file.name}" from Google Drive (${res.status}).`);
    }
    const textContent = await res.text();
    if (!textContent.trim()) {
      throw new Error(`"${file.name}" appears to be empty.`);
    }
    return {
      fileName: file.name,
      mimeType: effectiveMime,
      textContent,
    };
  }

  // Binary PDF or image for multimodal Gemini analysis
  const res = await fetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(file.id)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (res.status === 401) throw new Error('AUTH_REQUIRED');
  if (!res.ok) {
    throw new Error(`Could not download "${file.name}" from Google Drive (${res.status}).`);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_ANALYZE_BYTES) {
    throw new Error(`"${file.name}" exceeds the 6 MB AI analysis limit.`);
  }
  if (buffer.byteLength === 0) {
    throw new Error(`"${file.name}" is empty and cannot be analyzed.`);
  }

  const base64Data = arrayBufferToBase64(buffer);
  return {
    fileName: file.name,
    mimeType: file.mimeType,
    base64Data,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export interface ConfirmDriveActionOptions {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

/**
 * Mandatory explicit confirmation modal before any Google Drive mutation/deletion.
 */
export function confirmDriveAction(
  options: ConfirmDriveActionOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '70';

    overlay.innerHTML = `
      <div class="modal-content p-6" style="max-width: 460px;">
        <div class="flex items-start gap-3 mb-4">
          <div style="
            padding: 10px;
            border-radius: 10px;
            background: ${options.isDestructive ? '#fef2f2' : '#fffbeb'};
            color: ${options.isDestructive ? '#dc2626' : '#d97706'};
          ">
            ${Icons.alertTriangle}
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px; color: var(--color-primary);">
              ${options.title}
            </h3>
            <p style="font-size: 0.9rem; color: var(--color-text-muted); line-height: 1.5;">
              ${options.description}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4" style="border-top: 1px solid var(--color-border);">
          <button type="button" id="drive-confirm-cancel" class="btn btn-outline btn-sm">
            ${options.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            id="drive-confirm-proceed"
            class="btn btn-sm"
            style="
              background: ${options.isDestructive ? '#dc2626' : 'var(--color-accent)'};
              color: #ffffff;
              border-color: ${options.isDestructive ? '#dc2626' : 'var(--color-accent)'};
            "
          >
            ${options.confirmLabel}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };

    overlay
      .querySelector('#drive-confirm-cancel')
      ?.addEventListener('click', () => cleanup(false));
    overlay
      .querySelector('#drive-confirm-proceed')
      ?.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

export interface PrivacyConsentOptions {
  title: string;
  description: string;
  checkboxLabel: string;
  confirmLabel: string;
  cancelLabel?: string;
}

/**
 * Mandatory explicit patient privacy consent modal with unchecked checkbox gate
 * before accessing Drive documents for AI analysis or saving/auto-saving health reports.
 */
export function requirePrivacyConsentModal(
  options: PrivacyConsentOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '75';

    overlay.innerHTML = `
      <div class="modal-content p-6" style="max-width: 500px;">
        <div class="flex items-start gap-3 mb-4">
          <div style="
            padding: 10px;
            border-radius: 10px;
            background: #e0f2fe;
            color: var(--color-accent);
            flex-shrink: 0;
          ">
            ${Icons.shield}
          </div>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px; color: var(--color-primary);">
              ${options.title}
            </h3>
            <p style="font-size: 0.88rem; color: var(--color-text-muted); line-height: 1.55;">
              ${options.description}
            </p>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; margin-bottom: 16px;">
          <label class="flex items-start gap-3" style="cursor: pointer; font-size: 0.85rem; color: var(--color-primary); line-height: 1.45;">
            <input
              type="checkbox"
              id="drive-privacy-consent-check"
              style="margin-top: 3px; width: 18px; height: 18px; accent-color: var(--color-accent); flex-shrink: 0;"
            />
            <span>${options.checkboxLabel}</span>
          </label>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4" style="border-top: 1px solid var(--color-border);">
          <button type="button" id="drive-privacy-cancel" class="btn btn-outline btn-sm">
            ${options.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            id="drive-privacy-proceed"
            class="btn btn-accent btn-sm"
            disabled
            style="opacity: 0.55;"
          >
            ${Icons.checkCircle} ${options.confirmLabel}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const checkbox = overlay.querySelector('#drive-privacy-consent-check') as HTMLInputElement;
    const proceedBtn = overlay.querySelector('#drive-privacy-proceed') as HTMLButtonElement;

    checkbox?.addEventListener('change', () => {
      const checked = Boolean(checkbox.checked);
      if (proceedBtn) {
        proceedBtn.disabled = !checked;
        proceedBtn.style.opacity = checked ? '1' : '0.55';
      }
    });

    const cleanup = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };

    overlay
      .querySelector('#drive-privacy-cancel')
      ?.addEventListener('click', () => cleanup(false));
    proceedBtn?.addEventListener('click', () => {
      if (checkbox?.checked) cleanup(true);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}
