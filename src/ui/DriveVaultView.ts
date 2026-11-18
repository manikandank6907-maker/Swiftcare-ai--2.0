import { DriveFile, LanguageCode } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';
import {
  getCurrentGoogleUser,
  getGoogleSignInButtonHtml,
  googleSignIn,
  isGoogleDriveConnected,
  logoutGoogle,
} from '../services/googleAuthService';
import {
  confirmDriveAction,
  deleteDriveFile,
  downloadDriveFileForAnalysis,
  downloadDriveFilePreview,
  GOOGLE_DRIVE_MY_DRIVE_URL,
  isAutoSaveReportsEnabled,
  isDriveFileAnalyzable,
  listDriveFiles,
  renameDriveFile,
  requirePrivacyConsentModal,
  resetAutoSaveConsent,
  saveAiReportToDrive,
  saveBookingSummaryToDrive,
  setAutoSaveReportsEnabled,
  uploadFileToDrive,
} from '../services/googleDriveService';
import { analyzeDriveDocument, generateCarePrepReport } from '../services/geminiService';
import { getBookingRequests } from '../services/storageService';

interface DriveAnalysisState {
  analyzing: boolean;
  fileName: string | null;
  question: string;
  resultText: string | null;
  isEmergency: boolean;
  error: string | null;
  savedReportFile: DriveFile | null;
}

interface DriveVaultState {
  files: DriveFile[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  mimeFilter: string;
  statusBanner: { type: 'success' | 'error'; text: string; linkUrl?: string; linkLabel?: string } | null;
  generatingPrepReport: boolean;
  prepTopic: string;
  analysis: DriveAnalysisState;
}

const vaultState: DriveVaultState = {
  files: [],
  loading: false,
  error: null,
  searchQuery: '',
  mimeFilter: 'all',
  statusBanner: null,
  generatingPrepReport: false,
  prepTopic: '',
  analysis: {
    analyzing: false,
    fileName: null,
    question: '',
    resultText: null,
    isEmergency: false,
    error: null,
    savedReportFile: null,
  },
};

export function renderDriveVaultView(
  container: HTMLElement,
  translations: TranslationDictionary,
  language: LanguageCode = 'en-US'
): void {
  const connected = isGoogleDriveConnected();
  const user = getCurrentGoogleUser();

  if (!connected) {
    container.innerHTML = `
      <div class="container py-12" style="max-width: 820px;">
        <div class="card p-8 text-center" style="border-top: 4px solid var(--color-accent);">
          <div style="width: 64px; height: 64px; background: #e0f2fe; color: var(--color-accent); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
            ${Icons.folder}
          </div>
          <div class="badge badge-primary mb-3">Google Drive Care Document Vault</div>
          <h1 style="font-size: 1.85rem; font-weight: 800; margin-bottom: 10px; color: var(--color-primary);">
            ${translations.navDriveVault}
          </h1>
          <p style="color: var(--color-text-muted); font-size: 0.98rem; max-width: 580px; margin: 0 auto 24px; line-height: 1.6;">
            Connect your Google Drive to open Drive directly, save AI-generated care preparation reports with explicit permission, and analyze your care documents using Gemini AI.
          </p>

          <div class="flex items-center justify-center flex-wrap gap-3 mb-6">
            ${getGoogleSignInButtonHtml('drive-vault-signin-btn', 'Sign in with Google')}
            <a
              href="${GOOGLE_DRIVE_MY_DRIVE_URL}"
              target="_blank"
              rel="noopener noreferrer"
              id="drive-vault-open-drive-signedout"
              class="btn btn-outline btn-sm"
              style="height: 40px; border-radius: 20px;"
            >
              ${Icons.externalLink} Open Google Drive
            </a>
          </div>

          <div id="drive-auth-error" style="display: none; color: #dc2626; font-size: 0.85rem; margin-bottom: 16px;"></div>

          <div class="p-3 mb-6 text-left" style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; font-size: 0.82rem; color: #92400e;">
            <strong>Privacy & Compliance Notice:</strong> SwiftCare AI does not claim HIPAA compliance and never accesses or saves your Google Drive documents without your explicit permission. OAuth tokens remain strictly in memory for your current session.
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-6" style="border-top: 1px solid var(--color-border);">
            <div style="font-size: 0.85rem;">
              <strong style="color: var(--color-primary); display: block; margin-bottom: 4px;">Direct Drive Access</strong>
              <span style="color: var(--color-text-muted);">Open Google Drive anytime or browse, upload, and export booking receipts.</span>
            </div>
            <div style="font-size: 0.85rem;">
              <strong style="color: var(--color-primary); display: block; margin-bottom: 4px;">Opt-In Auto Report Storage</strong>
              <span style="color: var(--color-text-muted);">Save AI care prep reports to your own Drive with explicit user consent.</span>
            </div>
            <div style="font-size: 0.85rem;">
              <strong style="color: var(--color-primary); display: block; margin-bottom: 4px;">Gemini AI Doc Analysis</strong>
              <span style="color: var(--color-text-muted);">Summarize Docs, Sheets, PDFs, or scans into plain-language visit prep notes.</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const signInBtn = container.querySelector('#drive-vault-signin-btn') as HTMLButtonElement;
    signInBtn?.addEventListener('click', async () => {
      const errBox = container.querySelector('#drive-auth-error') as HTMLElement;
      signInBtn.disabled = true;
      if (errBox) errBox.style.display = 'none';
      try {
        await googleSignIn();
        await loadFilesAndRender(container, translations, language);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google sign-in failed.';
        if (errBox) {
          errBox.textContent = message;
          errBox.style.display = 'block';
        }
        signInBtn.disabled = false;
      }
    });
    return;
  }

  // Connected view
  const bookings = getBookingRequests();
  const autoSaveOn = isAutoSaveReportsEnabled();

  container.innerHTML = `
    <div class="container py-8">
      <!-- Top Header -->
      <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span style="color: var(--color-accent);">${Icons.folder}</span>
            <h1 style="font-size: 1.75rem; font-weight: 800;">${translations.navDriveVault}</h1>
          </div>
          <p style="color: var(--color-text-muted); font-size: 0.92rem;">
            Connected as <strong>${escapeHtml(user?.displayName || user?.email || 'Google User')}</strong> (${escapeHtml(user?.email || '')})
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <a
            href="${GOOGLE_DRIVE_MY_DRIVE_URL}"
            target="_blank"
            rel="noopener noreferrer"
            id="drive-open-my-drive-btn"
            class="btn btn-primary btn-sm"
          >
            ${Icons.externalLink} Open Google Drive
          </a>
          <label class="btn btn-outline btn-sm" style="cursor: pointer;">
            ${Icons.upload} Upload to Drive
            <input type="file" id="drive-upload-input" style="display: none;" />
          </label>
          <label class="btn btn-accent btn-sm" style="cursor: pointer;">
            ${Icons.sparkles} Upload & Analyze with AI
            <input type="file" id="drive-upload-analyze-input" accept=".txt,.csv,.json,.md,.pdf,.png,.jpg,.jpeg,.webp" style="display: none;" />
          </label>
          <button type="button" id="drive-refresh-btn" class="btn btn-outline btn-sm">
            ${Icons.refreshCw} Refresh
          </button>
          <button type="button" id="drive-logout-btn" class="btn btn-subtle btn-sm" style="color: #dc2626;">
            ${Icons.logOut} Sign Out
          </button>
        </div>
      </div>

      ${
        vaultState.statusBanner
          ? `
        <div class="mb-4 p-3 flex items-center justify-between flex-wrap gap-2" style="
          border-radius: 10px;
          font-size: 0.9rem;
          background: ${vaultState.statusBanner.type === 'success' ? '#ecfdf5' : '#fef2f2'};
          color: ${vaultState.statusBanner.type === 'success' ? '#065f46' : '#991b1b'};
          border: 1px solid ${vaultState.statusBanner.type === 'success' ? '#a7f3d0' : '#fecaca'};
        ">
          <div class="flex items-center gap-2 flex-wrap">
            <span>${vaultState.statusBanner.type === 'success' ? Icons.checkCircle : Icons.alertTriangle}</span>
            <span>${escapeHtml(vaultState.statusBanner.text)}</span>
            ${
              vaultState.statusBanner.linkUrl
                ? `<a href="${vaultState.statusBanner.linkUrl}" target="_blank" rel="noopener noreferrer" style="font-weight: 700; text-decoration: underline; color: inherit;">${escapeHtml(vaultState.statusBanner.linkLabel || 'Open in Drive')}</a>`
                : ''
            }
          </div>
          <button type="button" id="dismiss-drive-banner" class="btn btn-subtle btn-sm p-1" aria-label="Dismiss">${Icons.x}</button>
        </div>
      `
          : ''
      }

      <!-- Automatic Report Storage (With Explicit Permission) & AI Prep Report -->
      <div class="card p-5 mb-6" style="background: #f8fafc; border: 1px solid #bae6fd;">
        <div class="flex items-start justify-between flex-wrap gap-4 mb-4">
          <div style="max-width: 640px;">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <span style="color: var(--color-accent);">${Icons.shield}</span>
              <h2 style="font-size: 1.05rem; font-weight: 700; color: var(--color-primary);">
                Automatic AI Report Storage (Requires Explicit Permission)
              </h2>
              <span class="badge ${autoSaveOn ? 'badge-approved' : 'badge-pending'}">
                ${autoSaveOn ? 'Auto-Save ON (Consented)' : 'Auto-Save OFF'}
              </span>
            </div>
            <p style="font-size: 0.84rem; color: var(--color-text-muted); line-height: 1.5;">
              When enabled with your explicit consent, AI care-preparation reports and Drive document summaries you generate are automatically saved to your Google Drive. SwiftCare AI is not HIPAA-certified; reports are non-diagnostic.
            </p>
          </div>
          <button
            type="button"
            id="drive-toggle-autosave-btn"
            class="btn btn-sm ${autoSaveOn ? 'btn-outline' : 'btn-accent'}"
          >
            ${autoSaveOn ? 'Disable Auto-Save' : 'Enable Auto-Save with Consent'}
          </button>
        </div>

        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 pt-3" style="border-top: 1px solid var(--color-border);">
          <input
            type="text"
            id="drive-prep-topic-input"
            class="form-input"
            placeholder="Enter visit reason or questions to generate an AI Care Prep Report (e.g., Persistent knee ache for urgent care visit)..."
            value="${escapeHtml(vaultState.prepTopic)}"
          />
          <button
            type="button"
            id="drive-generate-prep-btn"
            class="btn btn-primary btn-sm"
            ${vaultState.generatingPrepReport ? 'disabled' : ''}
            style="flex-shrink: 0;"
          >
            ${Icons.sparkles} ${vaultState.generatingPrepReport ? 'Generating Report...' : 'Generate & Save AI Report'}
          </button>
        </div>
      </div>

      <!-- Gemini AI Document Analysis Panel -->
      ${renderAnalysisSection()}

      <!-- Quick Save Booking Requests to Drive -->
      ${
        bookings.length > 0
          ? `
        <div class="card p-4 mb-6" style="background: #f0fdfa; border-color: #99f6e4;">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 style="font-size: 0.98rem; font-weight: 700; color: var(--color-primary);">
                Export Appointment Request Receipt to Google Drive
              </h3>
              <p style="font-size: 0.82rem; color: var(--color-text-muted);">
                Save a text record of any SwiftCare AI booking request into your Drive for personal records.
              </p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <select id="export-booking-select" class="form-select" style="width: auto; max-width: 100%; padding: 0.4rem 0.75rem; font-size: 0.85rem;">
                ${bookings
                  .map(
                    (b) =>
                      `<option value="${b.id}">${b.id} — ${escapeHtml(b.providerName)} (${escapeHtml(b.date)})</option>`
                  )
                  .join('')}
              </select>
              <button type="button" id="export-booking-drive-btn" class="btn btn-primary btn-sm">
                ${Icons.fileText} Save to Drive
              </button>
            </div>
          </div>
        </div>
      `
          : ''
      }

      <!-- Search & Filter Bar -->
      <div class="card p-4 mb-6">
        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div class="flex-1 flex items-center gap-2" style="width: 100%;">
            <input
              type="text"
              id="drive-search-input"
              class="form-input"
              placeholder="Search your Google Drive files by name..."
              value="${escapeHtml(vaultState.searchQuery)}"
            />
            <button type="button" id="drive-search-btn" class="btn btn-primary btn-sm">
              ${Icons.search} Search
            </button>
          </div>
          <div class="flex items-center gap-2">
            <select id="drive-mime-select" class="form-select" style="width: 100%; padding: 0.55rem 0.9rem; font-size: 0.88rem;">
              <option value="all" ${vaultState.mimeFilter === 'all' ? 'selected' : ''}>All File Types</option>
              <option value="documents" ${vaultState.mimeFilter === 'documents' ? 'selected' : ''}>Docs, PDFs & Text</option>
              <option value="spreadsheets" ${vaultState.mimeFilter === 'spreadsheets' ? 'selected' : ''}>Spreadsheets & CSV</option>
              <option value="images" ${vaultState.mimeFilter === 'images' ? 'selected' : ''}>Images & Scans</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Files List -->
      <div class="card p-6">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 style="font-size: 1.15rem; font-weight: 700;">
            Your Google Drive Files (${vaultState.files.length})
          </h2>
          <span style="font-size: 0.78rem; color: var(--color-text-muted);">
            AI analysis requires consent • Renames & deletions require confirmation
          </span>
        </div>

        ${
          vaultState.loading
            ? `
          <div class="p-8 text-center" style="color: var(--color-text-muted);">
            Loading files from Google Drive...
          </div>
        `
            : vaultState.error
            ? `
          <div class="p-6 text-center" style="color: #dc2626; background: #fef2f2; border-radius: 10px;">
            <p style="margin-bottom: 12px;">${escapeHtml(vaultState.error)}</p>
            <button type="button" id="drive-retry-btn" class="btn btn-outline btn-sm">Try Again</button>
          </div>
        `
            : vaultState.files.length === 0
            ? `
          <div class="p-8 text-center" style="color: var(--color-text-muted);">
            No matching files found in your Google Drive. Try uploading a care document or clearing the search filter.
          </div>
        `
            : `
          <div class="grid grid-cols-1 gap-3">
            ${vaultState.files.map((file) => renderDriveFileRow(file)).join('')}
          </div>
        `
        }
      </div>
    </div>
  `;

  attachDriveListeners(container, translations, language);
}

function renderAnalysisSection(): string {
  const a = vaultState.analysis;
  if (!a.analyzing && !a.resultText && !a.error) {
    return `
      <div class="card p-4 mb-6" style="background: #ffffff; border: 1px dashed #cbd5e1;">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <div style="width: 38px; height: 38px; background: #e0f2fe; color: var(--color-accent); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${Icons.sparkles}
            </div>
            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--color-primary);">
                Gemini AI Document Analysis
              </h3>
              <p style="font-size: 0.82rem; color: var(--color-text-muted);">
                Click <strong>Analyze with AI</strong> on any Drive document below (Docs, Sheets, PDF, TXT, CSV, PNG, JPG) or use <strong>Upload & Analyze with AI</strong> above.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="card p-5 mb-6" id="drive-ai-analysis-card" style="border-top: 4px solid ${a.isEmergency ? '#dc2626' : 'var(--color-accent)'}; background: #ffffff;">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-3 pb-3" style="border-bottom: 1px solid var(--color-border);">
        <div class="flex items-center gap-2 flex-wrap">
          <span style="color: ${a.isEmergency ? '#dc2626' : 'var(--color-accent)'};">${Icons.sparkles}</span>
          <h3 style="font-size: 1.05rem; font-weight: 700;">
            Gemini AI Document Summary${a.fileName ? `: ${escapeHtml(a.fileName)}` : ''}
          </h3>
          <span class="badge badge-demo">Non-Diagnostic • Appointment Prep Only</span>
        </div>
        <button type="button" id="drive-close-analysis-btn" class="btn btn-subtle btn-sm p-1" aria-label="Close analysis">
          ${Icons.x}
        </button>
      </div>

      ${
        a.analyzing
          ? `
        <div class="p-6 text-center" style="color: var(--color-text-muted);">
          <div style="font-weight: 600; color: var(--color-primary); margin-bottom: 4px;">
            Reading "${escapeHtml(a.fileName || 'document')}" from Google Drive & analyzing with Gemini AI...
          </div>
          <div style="font-size: 0.82rem;">Please wait while we prepare your plain-language summary and clinician questions.</div>
        </div>
      `
          : a.error
          ? `
        <div class="p-4" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; color: #991b1b; font-size: 0.9rem;">
          <strong>Analysis Error:</strong> ${escapeHtml(a.error)}
        </div>
      `
          : `
        <div style="
          background: ${a.isEmergency ? '#fef2f2' : '#f8fafc'};
          border: 1px solid ${a.isEmergency ? '#fecaca' : 'var(--color-border)'};
          border-radius: 10px;
          padding: 16px;
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--color-primary);
          margin-bottom: 14px;
          max-height: 420px;
          overflow-y: auto;
        ">
          ${formatAnalysisMarkdown(a.resultText || '')}
        </div>

        <div class="flex items-center justify-between flex-wrap gap-3">
          <span style="font-size: 0.78rem; color: var(--color-text-muted);">
            Not a medical diagnosis or HIPAA-covered record. Discuss questions with a licensed clinician.
          </span>
          <div class="flex items-center gap-2 flex-wrap">
            ${
              a.savedReportFile
                ? `
              <span class="badge badge-approved">${Icons.checkCircle} Saved: ${escapeHtml(a.savedReportFile.name)}</span>
              ${
                a.savedReportFile.webViewLink
                  ? `<a href="${a.savedReportFile.webViewLink}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">${Icons.externalLink} Open Report in Drive</a>`
                  : ''
              }
            `
                : `
              <button type="button" id="drive-save-analysis-report-btn" class="btn btn-accent btn-sm">
                ${Icons.fileText} Save Analysis Report to Drive
              </button>
            `
            }
          </div>
        </div>
      `
      }
    </div>
  `;
}

function renderDriveFileRow(file: DriveFile): string {
  const modified = file.modifiedTime
    ? new Date(file.modifiedTime).toLocaleDateString() +
      ' ' +
      new Date(file.modifiedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Unknown date';
  const sizeText = file.size ? formatBytes(Number(file.size)) : 'Google Workspace Doc';
  const isTextPreviewable =
    file.mimeType === 'text/plain' ||
    file.mimeType === 'application/json' ||
    file.mimeType === 'text/csv' ||
    file.mimeType === 'application/vnd.google-apps.document' ||
    file.mimeType === 'application/vnd.google-apps.spreadsheet';
  const analyzable = isDriveFileAnalyzable(file);

  return `
    <div class="p-3 flex items-center justify-between flex-wrap gap-3 drive-file-row" style="background: #f8fafc; border: 1px solid var(--color-border); border-radius: 10px;">
      <div class="flex items-center gap-3" style="min-width: 200px; flex: 1; overflow: hidden;">
        <div style="width: 38px; height: 38px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--color-accent); flex-shrink: 0;">
          ${
            file.iconLink
              ? `<img src="${file.iconLink}" alt="" width="20" height="20" referrerpolicy="no-referrer" />`
              : Icons.fileText
          }
        </div>
        <div style="overflow: hidden; min-width: 0;">
          <div style="font-weight: 700; font-size: 0.95rem; color: var(--color-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(file.name)}
          </div>
          <div style="font-size: 0.78rem; color: var(--color-text-muted);">
            ${sizeText} • Modified ${modified}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        ${
          analyzable
            ? `
          <button type="button" class="btn btn-accent btn-sm drive-analyze-btn" data-id="${file.id}">
            ${Icons.sparkles} Analyze with AI
          </button>
        `
            : ''
        }
        ${
          isTextPreviewable
            ? `
          <button type="button" class="btn btn-outline btn-sm drive-preview-btn" data-id="${file.id}">
            ${Icons.eye} Preview
          </button>
        `
            : ''
        }
        ${
          file.webViewLink
            ? `
          <a href="${file.webViewLink}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
            ${Icons.externalLink} Open
          </a>
        `
            : ''
        }
        <button type="button" class="btn btn-outline btn-sm drive-rename-btn" data-id="${file.id}" data-name="${escapeHtml(file.name)}">
          ${Icons.edit} Rename
        </button>
        <button type="button" class="btn btn-subtle btn-sm drive-delete-btn" data-id="${file.id}" data-name="${escapeHtml(file.name)}" style="color: #dc2626;">
          ${Icons.trash} Delete
        </button>
      </div>
    </div>
  `;
}

function attachDriveListeners(
  container: HTMLElement,
  translations: TranslationDictionary,
  language: LanguageCode
): void {
  container.querySelector('#dismiss-drive-banner')?.addEventListener('click', () => {
    vaultState.statusBanner = null;
    renderDriveVaultView(container, translations, language);
  });

  container.querySelector('#drive-close-analysis-btn')?.addEventListener('click', () => {
    vaultState.analysis = {
      analyzing: false,
      fileName: null,
      question: '',
      resultText: null,
      isEmergency: false,
      error: null,
      savedReportFile: null,
    };
    renderDriveVaultView(container, translations, language);
  });

  container.querySelector('#drive-logout-btn')?.addEventListener('click', async () => {
    await logoutGoogle();
    resetAutoSaveConsent();
    vaultState.files = [];
    vaultState.statusBanner = null;
    vaultState.error = null;
    vaultState.analysis = {
      analyzing: false,
      fileName: null,
      question: '',
      resultText: null,
      isEmergency: false,
      error: null,
      savedReportFile: null,
    };
    renderDriveVaultView(container, translations, language);
  });

  container.querySelector('#drive-refresh-btn')?.addEventListener('click', () => {
    void loadFilesAndRender(container, translations, language);
  });

  container.querySelector('#drive-retry-btn')?.addEventListener('click', () => {
    void loadFilesAndRender(container, translations, language);
  });

  // Auto-save explicit consent toggle
  container.querySelector('#drive-toggle-autosave-btn')?.addEventListener('click', async () => {
    if (isAutoSaveReportsEnabled()) {
      setAutoSaveReportsEnabled(false);
      vaultState.statusBanner = {
        type: 'success',
        text: 'Automatic Google Drive report storage has been disabled. SwiftCare AI will ask before saving any AI report.',
      };
      renderDriveVaultView(container, translations, language);
      return;
    }

    const granted = await requirePrivacyConsentModal({
      title: 'Enable Automatic Report Storage in Google Drive?',
      description:
        'With your permission, AI-generated Care Preparation Reports and Drive Document Analysis summaries will be automatically saved as text files in your personal Google Drive.',
      checkboxLabel:
        'I understand SwiftCare AI is not a medical provider or HIPAA-covered entity, and I explicitly grant permission to automatically save AI-generated reports to my personal Google Drive during this session.',
      confirmLabel: 'Enable Auto-Save',
    });

    if (granted) {
      setAutoSaveReportsEnabled(true);
      vaultState.statusBanner = {
        type: 'success',
        text: 'Explicit permission granted: Automatic AI report storage to your Google Drive is now enabled for this session.',
      };
      renderDriveVaultView(container, translations, language);
    }
  });

  // Generate & Save Care Prep Report
  const prepTopicInput = container.querySelector('#drive-prep-topic-input') as HTMLInputElement;
  prepTopicInput?.addEventListener('input', () => {
    vaultState.prepTopic = prepTopicInput.value;
  });

  container.querySelector('#drive-generate-prep-btn')?.addEventListener('click', async () => {
    const topic = (prepTopicInput?.value || vaultState.prepTopic).trim();
    if (!topic) {
      vaultState.statusBanner = {
        type: 'error',
        text: 'Please enter a care topic or visit reason before generating an AI Care Prep Report.',
      };
      renderDriveVaultView(container, translations, language);
      return;
    }

    let shouldSaveToDrive = isAutoSaveReportsEnabled();
    if (!shouldSaveToDrive) {
      shouldSaveToDrive = await requirePrivacyConsentModal({
        title: 'Save AI Care Prep Report to Google Drive?',
        description:
          `SwiftCare AI will generate a non-diagnostic Care Navigation & Preparation Report for "${escapeHtml(topic)}" and save it to your Google Drive.`,
        checkboxLabel:
          'I understand SwiftCare AI is not HIPAA-certified and does not diagnose medical conditions. I consent to saving this AI care report to my Google Drive.',
        confirmLabel: 'Generate & Save to Drive',
      });
      if (!shouldSaveToDrive) return;
    }

    vaultState.generatingPrepReport = true;
    vaultState.statusBanner = null;
    renderDriveVaultView(container, translations, language);

    try {
      const { report, isEmergency } = await generateCarePrepReport(topic, language);
      const savedFile = await saveAiReportToDrive(`Care_Prep_${topic.slice(0, 28)}`, report);
      vaultState.generatingPrepReport = false;
      vaultState.prepTopic = '';
      vaultState.analysis = {
        analyzing: false,
        fileName: `Care Prep Report (${topic})`,
        question: '',
        resultText: report,
        isEmergency,
        error: null,
        savedReportFile: savedFile,
      };
      vaultState.statusBanner = {
        type: 'success',
        text: `Generated and saved "${savedFile.name}" to your Google Drive.`,
        linkUrl: savedFile.webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL,
        linkLabel: 'Open in Drive',
      };
      await loadFilesAndRender(container, translations, language);
    } catch (err: unknown) {
      vaultState.generatingPrepReport = false;
      const msg = err instanceof Error ? err.message : String(err);
      vaultState.statusBanner = {
        type: 'error',
        text: `Could not generate or save AI report: ${msg}`,
      };
      renderDriveVaultView(container, translations, language);
    }
  });

  // Search & mime filters
  const searchInput = container.querySelector('#drive-search-input') as HTMLInputElement;
  const runSearch = () => {
    vaultState.searchQuery = searchInput?.value || '';
    void loadFilesAndRender(container, translations, language);
  };
  container.querySelector('#drive-search-btn')?.addEventListener('click', runSearch);
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });

  const mimeSelect = container.querySelector('#drive-mime-select') as HTMLSelectElement;
  mimeSelect?.addEventListener('change', () => {
    vaultState.mimeFilter = mimeSelect.value;
    void loadFilesAndRender(container, translations, language);
  });

  // Standard upload to Drive
  const uploadInput = container.querySelector('#drive-upload-input') as HTMLInputElement;
  uploadInput?.addEventListener('change', async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    vaultState.loading = true;
    vaultState.statusBanner = null;
    renderDriveVaultView(container, translations, language);
    try {
      const uploaded = await uploadFileToDrive(file);
      vaultState.statusBanner = {
        type: 'success',
        text: `Uploaded "${uploaded.name}" to your Google Drive.`,
        linkUrl: uploaded.webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL,
        linkLabel: 'Open in Drive',
      };
      await loadFilesAndRender(container, translations, language);
    } catch (err: unknown) {
      handleDriveError(err, container, translations, language);
    }
  });

  // Upload to Drive + Immediate Gemini AI Analysis (with explicit consent)
  const uploadAnalyzeInput = container.querySelector('#drive-upload-analyze-input') as HTMLInputElement;
  uploadAnalyzeInput?.addEventListener('change', async () => {
    const file = uploadAnalyzeInput.files?.[0];
    if (!file) return;

    const consented = await requirePrivacyConsentModal({
      title: 'Upload to Google Drive & Analyze with Gemini AI?',
      description:
        `You selected "${escapeHtml(file.name)}". SwiftCare AI will upload this file to your Google Drive and send its contents to Gemini AI to produce a plain-language appointment preparation summary.`,
      checkboxLabel:
        'I understand SwiftCare AI is not HIPAA-certified and cannot diagnose conditions. I explicitly consent to uploading this document to my Drive and analyzing it with Gemini AI.',
      confirmLabel: 'Upload & Analyze',
    });
    if (!consented) return;

    vaultState.loading = true;
    vaultState.statusBanner = null;
    renderDriveVaultView(container, translations, language);

    try {
      const uploaded = await uploadFileToDrive(file);
      vaultState.loading = false;
      vaultState.statusBanner = {
        type: 'success',
        text: `Uploaded "${uploaded.name}" to Google Drive. Starting Gemini AI analysis...`,
        linkUrl: uploaded.webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL,
        linkLabel: 'Open in Drive',
      };
      await runDriveFileAnalysis(uploaded, container, translations, language, true);
    } catch (err: unknown) {
      handleDriveError(err, container, translations, language);
    }
  });

  // Export booking summary to Drive
  container.querySelector('#export-booking-drive-btn')?.addEventListener('click', async () => {
    const select = container.querySelector('#export-booking-select') as HTMLSelectElement;
    const bookingId = select?.value;
    const booking = getBookingRequests().find((b) => b.id === bookingId);
    if (!booking) return;

    vaultState.loading = true;
    vaultState.statusBanner = null;
    renderDriveVaultView(container, translations, language);

    try {
      const created = await saveBookingSummaryToDrive(booking);
      vaultState.statusBanner = {
        type: 'success',
        text: `Saved "${created.name}" to your Google Drive.`,
        linkUrl: created.webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL,
        linkLabel: 'Open in Drive',
      };
      await loadFilesAndRender(container, translations, language);
    } catch (err: unknown) {
      handleDriveError(err, container, translations, language);
    }
  });

  // Analyze existing Drive document with Gemini AI
  container.querySelectorAll('.drive-analyze-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const file = vaultState.files.find((f) => f.id === id);
      if (!file) return;
      await runDriveFileAnalysis(file, container, translations, language, false);
    });
  });

  // Save current analysis report to Google Drive manually (with consent)
  container.querySelector('#drive-save-analysis-report-btn')?.addEventListener('click', async () => {
    const a = vaultState.analysis;
    if (!a.resultText) return;

    const consented = await requirePrivacyConsentModal({
      title: 'Save AI Document Analysis to Google Drive?',
      description:
        `Save the SwiftCare AI plain-language summary of "${escapeHtml(a.fileName || 'Document')}" as a text report in your Google Drive.`,
      checkboxLabel:
        'I understand this AI summary is strictly non-diagnostic and SwiftCare AI is not HIPAA-certified. Save this report to my Google Drive.',
      confirmLabel: 'Save Report to Drive',
    });
    if (!consented) return;

    try {
      const saved = await saveAiReportToDrive(
        a.fileName || 'Document_Analysis',
        a.resultText,
        a.fileName || undefined
      );
      vaultState.analysis.savedReportFile = saved;
      vaultState.statusBanner = {
        type: 'success',
        text: `Saved AI analysis report "${saved.name}" to your Google Drive.`,
        linkUrl: saved.webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL,
        linkLabel: 'Open in Drive',
      };
      await loadFilesAndRender(container, translations, language);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      vaultState.statusBanner = {
        type: 'error',
        text: `Failed to save report to Google Drive: ${msg}`,
      };
      renderDriveVaultView(container, translations, language);
    }
  });

  // Preview text file
  container.querySelectorAll('.drive-preview-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const file = vaultState.files.find((f) => f.id === id);
      if (!file) return;
      try {
        const content = await downloadDriveFilePreview(file);
        showPreviewModal(file.name, content);
      } catch (err: unknown) {
        handleDriveError(err, container, translations, language);
      }
    });
  });

  // Rename file — MANDATORY explicit confirmation dialog before mutating
  container.querySelectorAll('.drive-rename-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const oldName = btn.getAttribute('data-name') || '';
      if (!id) return;

      const newName = await promptNewFileName(oldName);
      if (!newName || newName.trim() === '' || newName.trim() === oldName) return;

      const confirmed = await confirmDriveAction({
        title: 'Rename File in Google Drive?',
        description: `Are you sure you want to rename "${escapeHtml(oldName)}" to "${escapeHtml(newName.trim())}" in your Google Drive?`,
        confirmLabel: 'Confirm Rename',
        isDestructive: false,
      });
      if (!confirmed) return;

      vaultState.loading = true;
      renderDriveVaultView(container, translations, language);
      try {
        const updated = await renameDriveFile(id, newName.trim());
        vaultState.statusBanner = {
          type: 'success',
          text: `Renamed file to "${updated.name}".`,
        };
        await loadFilesAndRender(container, translations, language);
      } catch (err: unknown) {
        handleDriveError(err, container, translations, language);
      }
    });
  });

  // Delete file — MANDATORY explicit confirmation dialog before destructive delete
  container.querySelectorAll('.drive-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name') || 'this file';
      if (!id) return;

      const confirmed = await confirmDriveAction({
        title: 'Delete File from Google Drive?',
        description: `Are you sure you want to permanently delete "${escapeHtml(name)}" from your Google Drive? This action cannot be undone.`,
        confirmLabel: 'Delete Permanently',
        isDestructive: true,
      });
      if (!confirmed) return;

      vaultState.loading = true;
      renderDriveVaultView(container, translations, language);
      try {
        await deleteDriveFile(id);
        vaultState.statusBanner = {
          type: 'success',
          text: `Deleted "${name}" from Google Drive.`,
        };
        await loadFilesAndRender(container, translations, language);
      } catch (err: unknown) {
        handleDriveError(err, container, translations, language);
      }
    });
  });
}

async function runDriveFileAnalysis(
  file: DriveFile,
  container: HTMLElement,
  translations: TranslationDictionary,
  language: LanguageCode,
  consentAlreadyGranted: boolean
): Promise<void> {
  if (!consentAlreadyGranted) {
    const consented = await requirePrivacyConsentModal({
      title: 'Analyze Drive Document with Gemini AI?',
      description:
        `SwiftCare AI will read "${escapeHtml(file.name)}" from your Google Drive and send it to Gemini AI to produce a plain-language summary and appointment preparation questions.`,
      checkboxLabel:
        'I understand SwiftCare AI is not HIPAA-certified and cannot provide medical diagnoses. I explicitly consent to reading this document from my Drive for AI analysis.',
      confirmLabel: 'Proceed with AI Analysis',
    });
    if (!consented) return;
  }

  vaultState.analysis = {
    analyzing: true,
    fileName: file.name,
    question: '',
    resultText: null,
    isEmergency: false,
    error: null,
    savedReportFile: null,
  };
  renderDriveVaultView(container, translations, language);

  try {
    const docPayload = await downloadDriveFileForAnalysis(file);
    const result = await analyzeDriveDocument({
      ...docPayload,
      language,
    });

    let autoSavedFile: DriveFile | null = null;
    if (isAutoSaveReportsEnabled()) {
      autoSavedFile = await saveAiReportToDrive(
        `Analysis_${file.name}`,
        result.analysis,
        file.name
      );
    }

    vaultState.analysis = {
      analyzing: false,
      fileName: file.name,
      question: '',
      resultText: result.analysis,
      isEmergency: result.isEmergency,
      error: null,
      savedReportFile: autoSavedFile,
    };

    vaultState.statusBanner = autoSavedFile
      ? {
          type: 'success',
          text: `Analyzed "${file.name}" with Gemini AI and auto-saved report "${autoSavedFile.name}" to Google Drive.`,
          linkUrl: autoSavedFile.webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL,
          linkLabel: 'Open Report in Drive',
        }
      : {
          type: 'success',
          text: `Completed Gemini AI analysis for "${file.name}".`,
        };

    if (autoSavedFile) {
      await loadFilesAndRender(container, translations, language);
    } else {
      renderDriveVaultView(container, translations, language);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'AUTH_REQUIRED') {
      handleDriveError(err, container, translations, language);
      return;
    }
    vaultState.analysis = {
      analyzing: false,
      fileName: file.name,
      question: '',
      resultText: null,
      isEmergency: false,
      error: msg,
      savedReportFile: null,
    };
    vaultState.statusBanner = {
      type: 'error',
      text: `Drive AI analysis failed for "${file.name}": ${msg}`,
    };
    renderDriveVaultView(container, translations, language);
  }
}

export async function loadFilesAndRender(
  container: HTMLElement,
  translations: TranslationDictionary,
  language: LanguageCode = 'en-US'
): Promise<void> {
  vaultState.loading = true;
  vaultState.error = null;
  renderDriveVaultView(container, translations, language);

  try {
    vaultState.files = await listDriveFiles(
      vaultState.searchQuery,
      vaultState.mimeFilter
    );
    vaultState.loading = false;
    renderDriveVaultView(container, translations, language);
  } catch (err: unknown) {
    handleDriveError(err, container, translations, language);
  }
}

function handleDriveError(
  err: unknown,
  container: HTMLElement,
  translations: TranslationDictionary,
  language: LanguageCode = 'en-US'
) {
  const msg = err instanceof Error ? err.message : String(err);
  vaultState.loading = false;
  if (msg === 'AUTH_REQUIRED') {
    vaultState.error = null;
    renderDriveVaultView(container, translations, language);
    return;
  }
  vaultState.error = msg;
  vaultState.statusBanner = {
    type: 'error',
    text: msg,
  };
  renderDriveVaultView(container, translations, language);
}

function showPreviewModal(fileName: string, content: string) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content p-6" style="max-width: 680px;">
      <div class="flex items-center justify-between mb-4 pb-3" style="border-bottom: 1px solid var(--color-border);">
        <h3 style="font-size: 1.15rem; font-weight: 700;">${escapeHtml(fileName)}</h3>
        <button type="button" id="preview-close-btn" class="btn btn-subtle p-1">${Icons.x}</button>
      </div>
      <pre style="
        background: #f8fafc;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 16px;
        font-size: 0.85rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 60vh;
        overflow-y: auto;
      ">${escapeHtml(content)}</pre>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#preview-close-btn')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function promptNewFileName(currentName: string): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content p-6" style="max-width: 440px;">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">Enter New File Name</h3>
        <form id="rename-prompt-form">
          <input type="text" id="rename-prompt-input" class="form-input mb-4" value="${escapeHtml(currentName)}" required />
          <div class="flex justify-end gap-2">
            <button type="button" id="rename-prompt-cancel" class="btn btn-outline btn-sm">Cancel</button>
            <button type="submit" class="btn btn-accent btn-sm">Next</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#rename-prompt-input') as HTMLInputElement;
    input?.focus();
    input?.select();

    overlay.querySelector('#rename-prompt-cancel')?.addEventListener('click', () => {
      overlay.remove();
      resolve(null);
    });
    overlay.querySelector('#rename-prompt-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input?.value || '';
      overlay.remove();
      resolve(val);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(null);
      }
    });
  });
}

function formatAnalysisMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
  out = out.replace(/^### (.*)$/gm, '<h4 style="font-size: 1rem; font-weight: 700; margin: 10px 0 4px;">$1</h4>');
  out = out.replace(/^## (.*)$/gm, '<h3 style="font-size: 1.05rem; font-weight: 700; margin: 12px 0 4px;">$1</h3>');
  out = out.replace(/^• (.*)$/gm, '<li style="margin-left: 16px;">$1</li>');
  out = out.replace(/^- (.*)$/gm, '<li style="margin-left: 16px;">$1</li>');
  out = out.replace(/\n\n/g, '<br/><br/>');
  out = out.replace(/\n/g, '<br/>');
  return out;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
