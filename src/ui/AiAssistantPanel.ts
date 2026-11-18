import { ChatMessage, LanguageCode } from '../types';
import { TranslationDictionary } from '../i18n/translations';
import { Icons } from './icons';
import { askAssistant } from '../services/geminiService';
import { googleSignIn, isGoogleDriveConnected } from '../services/googleAuthService';
import {
  GOOGLE_DRIVE_MY_DRIVE_URL,
  isAutoSaveReportsEnabled,
  requirePrivacyConsentModal,
  saveAiReportToDrive,
  setAutoSaveReportsEnabled,
} from '../services/googleDriveService';

export interface AiAssistantCallbacks {
  onOpenDriveVault?: () => void;
}

export class AiAssistantPanel {
  private messages: ChatMessage[] = [];
  private isOpen: boolean = false;
  private currentLanguage: LanguageCode;
  private translations: TranslationDictionary;
  private callbacks: AiAssistantCallbacks;
  private containerElement?: HTMLElement;
  private panelElement?: HTMLElement;
  private driveStatus: { type: 'success' | 'error'; text: string; linkUrl?: string } | null = null;
  private savingToDrive = false;

  constructor(
    language: LanguageCode,
    translations: TranslationDictionary,
    callbacks: AiAssistantCallbacks = {}
  ) {
    this.currentLanguage = language;
    this.translations = translations;
    this.callbacks = callbacks;
    this.initWelcomeMessage();
  }

  private initWelcomeMessage() {
    this.messages = [
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: `Hello! I am your **SwiftCare AI Care Assistant**.\n\nI can help you:\n• Compare care options (Urgent Care, Primary Care, Telehealth)\n• Find openings with estimated arrival times\n• Guide you through submitting an appointment request\n\n*Note: I cannot diagnose conditions or prescribe medications. In an emergency, call 911 immediately.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedPrompts: [
          'What is the difference between Urgent Care and ER?',
          'How does booking confirmation work?',
          'What telehealth services are available today?',
        ],
      },
    ];
  }

  public setLanguage(lang: LanguageCode, trans: TranslationDictionary) {
    this.currentLanguage = lang;
    this.translations = trans;
    if (this.isOpen) {
      this.render();
    }
  }

  public toggle(container?: HTMLElement) {
    if (container) this.containerElement = container;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.render();
    } else {
      this.panelElement?.remove();
      this.panelElement = undefined;
    }
  }

  public open(container?: HTMLElement) {
    if (container) this.containerElement = container;
    this.isOpen = true;
    this.render();
  }

  public close() {
    this.isOpen = false;
    this.panelElement?.remove();
    this.panelElement = undefined;
  }

  private render() {
    if (!this.panelElement) {
      this.panelElement = document.createElement('div');
      this.panelElement.className = 'assistant-panel';
      this.panelElement.id = 'swiftcare-ai-assistant-widget';
      document.body.appendChild(this.panelElement);
    }

    const t = this.translations;
    const autoSaveOn = isAutoSaveReportsEnabled();

    this.panelElement.innerHTML = `
      <!-- Header -->
      <div class="flex items-center justify-between p-4" style="background: var(--color-primary); color: #ffffff;">
        <div class="flex items-center gap-3">
          <div style="background: rgba(8, 145, 178, 0.25); color: #38bdf8; padding: 6px; border-radius: 8px;">
            ${Icons.sparkles}
          </div>
          <div>
            <h3 style="font-size: 1rem; font-weight: 700; color: #ffffff;">${t.assistantTitle}</h3>
            <span style="font-size: 0.72rem; color: #94a3b8;">${t.assistantSubtitle}</span>
          </div>
        </div>
        <button id="close-assistant-btn" class="btn btn-subtle p-1" style="color: #cbd5e1;" aria-label="Close Assistant">
          ${Icons.x}
        </button>
      </div>

      <!-- Emergency Warning Top Bar -->
      <div style="background: #fef2f2; border-bottom: 1px solid #fecaca; padding: 6px 12px; font-size: 0.75rem; color: #991b1b;" class="flex items-center gap-2">
        <span style="color: #dc2626;">${Icons.alertTriangle}</span>
        <span>For life-threatening symptoms, call 911 or your local emergency number immediately.</span>
      </div>

      <!-- Google Drive Report & Doc Analysis Quick Toolbar -->
      <div style="background: #f0f9ff; border-bottom: 1px solid #bae6fd; padding: 6px 10px;" class="flex items-center justify-between flex-wrap gap-1.5">
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            id="assistant-save-drive-btn"
            class="btn btn-outline btn-sm"
            style="font-size: 0.72rem; padding: 4px 8px; background: #ffffff;"
            ${this.savingToDrive ? 'disabled' : ''}
          >
            ${Icons.fileText} ${this.savingToDrive ? 'Saving...' : 'Save Report to Drive'}
          </button>
          <button
            type="button"
            id="assistant-autosave-toggle-btn"
            class="btn btn-sm"
            style="font-size: 0.72rem; padding: 4px 8px; border: 1px solid ${autoSaveOn ? '#10b981' : '#cbd5e1'}; background: ${autoSaveOn ? '#ecfdf5' : '#ffffff'}; color: ${autoSaveOn ? '#047857' : 'var(--color-primary)'};"
          >
            ${Icons.shield} Auto-Save: ${autoSaveOn ? 'ON' : 'OFF'}
          </button>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            id="assistant-analyze-doc-btn"
            class="btn btn-subtle btn-sm"
            style="font-size: 0.72rem; padding: 4px 8px; color: #0284c7; font-weight: 700;"
          >
            ${Icons.folder} Analyze Drive Doc
          </button>
          <a
            href="${GOOGLE_DRIVE_MY_DRIVE_URL}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-subtle btn-sm"
            style="font-size: 0.72rem; padding: 4px 6px; color: var(--color-primary);"
            title="Open Google Drive"
          >
            ${Icons.externalLink}
          </a>
        </div>
      </div>

      ${
        this.driveStatus
          ? `
        <div style="
          padding: 6px 12px;
          font-size: 0.76rem;
          background: ${this.driveStatus.type === 'success' ? '#ecfdf5' : '#fef2f2'};
          color: ${this.driveStatus.type === 'success' ? '#065f46' : '#991b1b'};
          border-bottom: 1px solid ${this.driveStatus.type === 'success' ? '#a7f3d0' : '#fecaca'};
        " class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span>${this.formatMarkdown(this.driveStatus.text)}</span>
            ${
              this.driveStatus.linkUrl
                ? `<a href="${this.driveStatus.linkUrl}" target="_blank" rel="noopener noreferrer" style="font-weight: 700; text-decoration: underline; color: inherit;">Open Drive</a>`
                : ''
            }
          </div>
          <button type="button" id="assistant-dismiss-drive-status" class="btn btn-subtle p-1" style="padding: 2px;">${Icons.x}</button>
        </div>
      `
          : ''
      }

      <!-- Messages Scroll Area -->
      <div id="assistant-messages-scroll" style="flex: 1; padding: 14px; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 12px;">
        ${this.messages
          .map((msg) => this.renderMessageBubble(msg))
          .join('')}
      </div>

      <!-- Suggested Prompts Row -->
      <div id="assistant-prompts-row" class="px-3 py-2 flex flex-wrap gap-1" style="background: #ffffff; border-top: 1px solid var(--color-border); max-height: 80px; overflow-y: auto;">
        ${this.getLatestPrompts()
          .map(
            (p) => `
          <button type="button" class="assistant-prompt-chip btn btn-subtle btn-sm" style="font-size: 0.75rem; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: left; white-space: normal;" data-prompt="${p}">
            ${p}
          </button>
        `
          )
          .join('')}
      </div>

      <!-- Input Bar -->
      <form id="assistant-input-form" class="p-3 flex items-center gap-2" style="background: #ffffff; border-top: 1px solid var(--color-border);">
        <input
          type="text"
          id="assistant-text-input"
          class="form-input"
          style="padding: 0.55rem 0.85rem; font-size: 0.88rem;"
          placeholder="${t.assistantInputPlaceholder}"
          autocomplete="off"
          required
        />
        <button type="submit" id="assistant-send-btn" class="btn btn-accent btn-sm p-2" aria-label="${t.assistantSend}">
          ${Icons.send}
        </button>
      </form>
    `;

    // Scroll to bottom
    const scrollArea = this.panelElement.querySelector('#assistant-messages-scroll');
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }

    // Attach event listeners
    this.panelElement.querySelector('#close-assistant-btn')?.addEventListener('click', () => {
      this.close();
    });

    this.panelElement.querySelector('#assistant-dismiss-drive-status')?.addEventListener('click', () => {
      this.driveStatus = null;
      this.render();
    });

    this.panelElement.querySelector('#assistant-analyze-doc-btn')?.addEventListener('click', () => {
      this.close();
      this.callbacks.onOpenDriveVault?.();
    });

    this.panelElement.querySelector('#assistant-autosave-toggle-btn')?.addEventListener('click', () => {
      void this.handleToggleAutoSave();
    });

    this.panelElement.querySelector('#assistant-save-drive-btn')?.addEventListener('click', () => {
      void this.handleSaveSessionReport(false);
    });

    const form = this.panelElement.querySelector('#assistant-input-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.panelElement?.querySelector('#assistant-text-input') as HTMLInputElement;
      if (input && input.value.trim()) {
        this.handleUserSend(input.value.trim());
        input.value = '';
      }
    });

    this.panelElement.querySelectorAll('.assistant-prompt-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const promptText = chip.getAttribute('data-prompt');
        if (promptText) {
          this.handleUserSend(promptText);
        }
      });
    });
  }

  private async handleToggleAutoSave() {
    if (isAutoSaveReportsEnabled()) {
      setAutoSaveReportsEnabled(false);
      this.driveStatus = {
        type: 'success',
        text: 'Auto-Save AI reports to Google Drive turned OFF.',
      };
      this.render();
      return;
    }

    const consented = await requirePrivacyConsentModal({
      title: 'Enable Auto-Save AI Reports to Google Drive?',
      description:
        'When enabled, SwiftCare AI will automatically store a copy of each AI care-navigation report generated in this chat into your personal Google Drive.',
      checkboxLabel:
        'I understand SwiftCare AI is not a medical provider or HIPAA-covered entity, and I explicitly grant permission to auto-save AI reports to my Google Drive during this session.',
      confirmLabel: 'Enable Auto-Save',
    });
    if (!consented) return;

    try {
      if (!isGoogleDriveConnected()) {
        await googleSignIn();
      }
      setAutoSaveReportsEnabled(true);
      this.driveStatus = {
        type: 'success',
        text: 'Auto-Save enabled with your permission.',
        linkUrl: GOOGLE_DRIVE_MY_DRIVE_URL,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In cancelled or failed.';
      this.driveStatus = {
        type: 'error',
        text: `Could not enable Auto-Save: ${msg}`,
      };
    }
    this.render();
  }

  private async handleSaveSessionReport(isAutoTriggered: boolean) {
    if (this.savingToDrive) return;

    const assistantMsgs = this.messages.filter((m) => m.sender === 'assistant');
    if (assistantMsgs.length === 0) {
      this.driveStatus = {
        type: 'error',
        text: 'No AI guidance messages to save yet.',
      };
      this.render();
      return;
    }

    if (!isAutoTriggered && !isAutoSaveReportsEnabled()) {
      const consented = await requirePrivacyConsentModal({
        title: 'Save AI Care Report to Google Drive?',
        description:
          'SwiftCare AI will save your current Care Assistant navigation transcript as a personal text report in your Google Drive.',
        checkboxLabel:
          'I understand SwiftCare AI is not HIPAA-certified and cannot diagnose conditions. I consent to saving this report to my Google Drive.',
        confirmLabel: 'Save to Google Drive',
      });
      if (!consented) return;
    }

    this.savingToDrive = true;
    this.render();

    try {
      if (!isGoogleDriveConnected()) {
        await googleSignIn();
      }

      const transcript = this.messages
        .map((m) => `[${m.timestamp}] ${m.sender === 'user' ? 'Patient' : 'SwiftCare AI'}:\n${m.text}`)
        .join('\n\n----------------------------------------------------\n\n');

      const saved = await saveAiReportToDrive('Assistant_Session', transcript);
      this.driveStatus = {
        type: 'success',
        text: isAutoTriggered
          ? `Auto-saved report "${saved.name}" to Google Drive.`
          : `Saved "${saved.name}" to your Google Drive.`,
        linkUrl: saved.webViewLink || GOOGLE_DRIVE_MY_DRIVE_URL,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.driveStatus = {
        type: 'error',
        text: `Failed to save report to Drive: ${msg}`,
      };
    } finally {
      this.savingToDrive = false;
      this.render();
    }
  }

  private renderMessageBubble(msg: ChatMessage): string {
    const isUser = msg.sender === 'user';
    return `
      <div style="display: flex; flex-direction: column; align-items: ${isUser ? 'flex-end' : 'flex-start'};">
        <div style="
          max-width: 88%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.88rem;
          line-height: 1.45;
          ${
            isUser
              ? 'background: var(--color-primary); color: #ffffff; border-bottom-right-radius: 2px;'
              : msg.isEmergencyAlert
              ? 'background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-bottom-left-radius: 2px;'
              : 'background: #ffffff; color: var(--color-primary); border: 1px solid var(--color-border); box-shadow: var(--shadow-sm); border-bottom-left-radius: 2px;'
          }
        ">
          ${this.formatMarkdown(msg.text)}
        </div>
        <span style="font-size: 0.68rem; color: #94a3b8; margin-top: 2px; padding: 0 4px;">
          ${msg.timestamp}
        </span>
      </div>
    `;
  }

  private formatMarkdown(text: string): string {
    // Quick sanitizing and lightweight markdown to HTML
    let out = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Bullet items
    out = out.replace(/^• (.*)$/gm, '<li style="margin-left: 16px;">$1</li>');
    out = out.replace(/^- (.*)$/gm, '<li style="margin-left: 16px;">$1</li>');
    // Newlines
    out = out.replace(/\n\n/g, '<br/><br/>');
    out = out.replace(/\n/g, '<br/>');

    return out;
  }

  private getLatestPrompts(): string[] {
    const last = this.messages[this.messages.length - 1];
    return last?.suggestedPrompts || [
      'What is the difference between Urgent Care and ER?',
      'How does booking confirmation work?',
    ];
  }

  private async handleUserSend(text: string) {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.messages.push(userMsg);
    this.render();

    // Loading indicator
    const thinkingMsg: ChatMessage = {
      id: `msg-thinking-${Date.now()}`,
      sender: 'assistant',
      text: 'Analyzing care categories and availability...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.messages.push(thinkingMsg);
    this.render();

    try {
      const response = await askAssistant(text, this.currentLanguage);
      // Remove thinking msg
      this.messages = this.messages.filter((m) => m.id !== thinkingMsg.id);

      this.messages.push({
        id: `msg-resp-${Date.now()}`,
        sender: 'assistant',
        text: response.text,
        isEmergencyAlert: response.isEmergency,
        suggestedPrompts: response.suggestedPrompts,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      this.render();

      if (isAutoSaveReportsEnabled()) {
        await this.handleSaveSessionReport(true);
      }
    } catch {
      this.messages = this.messages.filter((m) => m.id !== thinkingMsg.id);
      this.messages.push({
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: 'I am ready to help you navigate care. How else can I assist?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      this.render();
    }
  }
}
