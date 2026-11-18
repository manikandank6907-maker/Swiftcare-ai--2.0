import { CareCategory, HealthcareProvider, LanguageCode, NavigationTab, TimeSlot } from './types';
import { DEMO_PROVIDERS } from './data/mockProviders';
import { SUPPORTED_LANGUAGES, TRANSLATIONS } from './i18n/translations';
import { renderNavbar } from './ui/Navbar';
import { HeroSearchState, renderHeroSection } from './ui/HeroSection';
import { renderSearchResults, SearchFilterState } from './ui/SearchResults';
import { openBookingModal } from './ui/BookingModal';
import { renderRequestTracker } from './ui/RequestTrackerView';
import { renderAdminPortal } from './ui/AdminPortalView';
import { renderAboutTrust } from './ui/AboutTrustView';
import { loadFilesAndRender, renderDriveVaultView } from './ui/DriveVaultView';
import { renderFooter } from './ui/Footer';
import { AiAssistantPanel } from './ui/AiAssistantPanel';
import { SwiftCareXRKioskScene } from './ui/XRKioskView';
import { Icons } from './ui/icons';
import { initAuth, isGoogleDriveConnected } from './services/googleAuthService';
import * as THREE from 'three';
import * as xb from 'xrblocks';

class SwiftCareApp {
  private currentTab: NavigationTab = 'home';
  private currentLang: LanguageCode = 'en-US';
  private filterState: SearchFilterState = {
    query: '',
    category: 'all',
    preference: 'all',
    maxDistance: 25,
    deliveryType: 'all',
    sortBy: 'fastest',
    unit: 'mi',
  };
  private lookupFilterId?: string;
  private aiAssistant: AiAssistantPanel;
  private rootElement: HTMLElement;
  private xrInitialized = false;

  constructor(root: HTMLElement) {
    this.rootElement = root;

    // Load persisted language preference if set
    const savedLang = localStorage.getItem('swiftcare_lang') as LanguageCode;
    if (savedLang && TRANSLATIONS[savedLang]) {
      this.currentLang = savedLang;
    }
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === this.currentLang);
    if (langObj) {
      this.filterState.unit = langObj.unit;
    }

    this.aiAssistant = new AiAssistantPanel(this.currentLang, this.getTranslations(), {
      onOpenDriveVault: () => this.navigateTo('drive'),
    });
  }

  public init() {
    initAuth(
      () => {
        if (this.currentTab === 'drive') {
          this.render();
        }
      },
      () => {
        if (this.currentTab === 'drive') {
          this.render();
        }
      }
    );
    this.applyDirection();
    this.render();
  }

  private getTranslations() {
    return TRANSLATIONS[this.currentLang] || TRANSLATIONS['en-US'];
  }

  private applyDirection() {
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === this.currentLang);
    const dir = langObj?.dir || 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', this.currentLang);
  }

  public setLanguage(lang: LanguageCode) {
    this.currentLang = lang;
    localStorage.setItem('swiftcare_lang', lang);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    if (langObj) {
      this.filterState.unit = langObj.unit;
    }
    this.applyDirection();
    this.aiAssistant.setLanguage(lang, this.getTranslations());
    this.render();
  }

  public navigateTo(tab: NavigationTab, param?: string) {
    this.currentTab = tab;
    if (tab === 'tracker' && param) {
      this.lookupFilterId = param;
    } else if (tab !== 'tracker') {
      this.lookupFilterId = undefined;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  public render() {
    const t = this.getTranslations();

    this.rootElement.innerHTML = `
      <div class="flex flex-col min-h-screen">
        <div id="app-navbar-slot"></div>
        <main id="app-main-slot" class="flex-1"></main>
        <div id="app-footer-slot"></div>
      </div>
    `;

    // 1. Render Navbar
    const navSlot = this.rootElement.querySelector('#app-navbar-slot') as HTMLElement;
    if (navSlot) {
      renderNavbar(navSlot, this.currentTab, this.currentLang, t, {
        onNavigate: (tab) => this.navigateTo(tab),
        onLanguageChange: (lang) => this.setLanguage(lang),
        onToggleAi: () => this.aiAssistant.toggle(),
      });
    }

    // 2. Render Main Body
    const mainSlot = this.rootElement.querySelector('#app-main-slot') as HTMLElement;
    if (mainSlot) {
      this.renderMainContent(mainSlot);
    }

    // 3. Render Footer
    const footerSlot = this.rootElement.querySelector('#app-footer-slot') as HTMLElement;
    if (footerSlot) {
      renderFooter(footerSlot, t, {
        onNavigate: (tab) => this.navigateTo(tab),
        onLanguageChange: (lang) => this.setLanguage(lang),
      });
    }
  }

  private renderMainContent(container: HTMLElement) {
    const t = this.getTranslations();

    switch (this.currentTab) {
      case 'home':
        this.renderHomeTab(container);
        break;

      case 'search':
        renderSearchResults(container, DEMO_PROVIDERS, this.filterState, t, {
          onRequestBooking: (provider, slot) => this.openBooking(provider, slot),
          onFilterChange: (newFilters) => {
            this.filterState = newFilters;
            this.render();
          },
        });
        break;

      case 'tracker':
        renderRequestTracker(
          container,
          t,
          this.lookupFilterId,
          () => this.navigateTo('search')
        );
        break;

      case 'drive':
        if (isGoogleDriveConnected()) {
          void loadFilesAndRender(container, t, this.currentLang);
        } else {
          renderDriveVaultView(container, t, this.currentLang);
        }
        break;

      case 'admin':
        renderAdminPortal(container, t);
        break;

      case 'about':
        renderAboutTrust(container, t);
        break;

      case 'xr':
        this.renderXRKioskTab(container);
        break;
    }
  }

  private renderHomeTab(container: HTMLElement) {
    const t = this.getTranslations();

    // Container for Hero
    const heroWrapper = document.createElement('div');
    const heroState: HeroSearchState = {
      query: this.filterState.query,
      category: this.filterState.category,
      preference: this.filterState.preference,
    };

    renderHeroSection(heroWrapper, heroState, t, {
      onSearch: (updated) => {
        this.filterState.query = updated.query;
        this.filterState.category = updated.category;
        this.filterState.preference = updated.preference;
        this.navigateTo('search');
      },
      onClear: () => {
        this.filterState.query = '';
        this.filterState.category = 'all';
        this.filterState.preference = 'all';
        this.render();
      },
      onOpenDriveVault: () => this.navigateTo('drive'),
    });

    // Top recommended providers preview
    const previewWrapper = document.createElement('div');
    renderSearchResults(previewWrapper, DEMO_PROVIDERS.slice(0, 4), this.filterState, t, {
      onRequestBooking: (provider, slot) => this.openBooking(provider, slot),
      onFilterChange: (newFilters) => {
        this.filterState = newFilters;
        this.navigateTo('search');
      },
    });

    container.appendChild(heroWrapper);
    container.appendChild(previewWrapper);
  }

  private renderXRKioskTab(container: HTMLElement) {
    const t = this.getTranslations();

    container.innerHTML = `
      <div class="container py-8">
        <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <div class="badge badge-primary mb-2">${Icons.box3d} WebXR Spatial Kiosk</div>
            <h1 style="font-size: 1.75rem; font-weight: 800;">3D Virtual Clinic Navigation Kiosk</h1>
            <p style="color: var(--color-text-muted); font-size: 0.95rem;">
              Experience SwiftCare AI spatial clinic kiosks in WebXR. Best viewed in Android XR devices like Galaxy XR or XREAL AURA, or in desktop simulated mode.
            </p>
          </div>
          <button id="exit-xr-tab-btn" class="btn btn-outline btn-sm">
            ${Icons.x} Return to Standard Web View
          </button>
        </div>

        <!-- 3D Canvas Box -->
        <div class="card p-4 mb-6" style="background: #0b1120; border-color: #1e293b;">
          <div id="xr-kiosk-canvas-container" style="width: 100%; height: 460px; border-radius: 12px; overflow: hidden; position: relative;">
            <div id="xr-canvas-overlay" style="position: absolute; top: 16px; left: 16px; z-index: 10; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px); padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); color: #ffffff; font-size: 0.85rem;" class="flex items-center gap-2">
              <span style="color: #38bdf8;">${Icons.pulse}</span>
              <span>Interactive 3D Stations • Click or pinch a station to request an appointment</span>
            </div>
          </div>
        </div>

        <!-- Quick 3D Controls Description -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card p-4">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">Pinch & Drag to Rotate</h4>
            <p style="font-size: 0.82rem; color: var(--color-text-muted);">Inspect clinic cards and distance indicators around the spatial perimeter.</p>
          </div>
          <div class="card p-4">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">Direct Booking Trigger</h4>
            <p style="font-size: 0.82rem; color: var(--color-text-muted);">Clicking any 3D pillar directly triggers the patient booking request modal.</p>
          </div>
          <div class="card p-4">
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">Hardware Agnostic</h4>
            <p style="font-size: 0.82rem; color: var(--color-text-muted);">Compatible with desktop mice, mobile touch, and WebXR controller hand tracking.</p>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#exit-xr-tab-btn')?.addEventListener('click', () => {
      this.navigateTo('home');
    });

    // Initialize Three.js interactive preview inside canvas container
    const canvasContainer = container.querySelector('#xr-kiosk-canvas-container') as HTMLElement;
    if (canvasContainer) {
      this.initThreePreview(canvasContainer);
    }
  }

  private initThreePreview(container: HTMLElement) {
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 2.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Add Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 2.5);
    scene.add(hemiLight);

    const cyanLight = new THREE.DirectionalLight(0x06b6d4, 2.5);
    cyanLight.position.set(2, 4, 3);
    scene.add(cyanLight);

    // Floor Grid
    const grid = new THREE.GridHelper(12, 24, 0x0891b2, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Create 3D kiosk models
    const kioskGroup = new THREE.Group();
    scene.add(kioskGroup);

    const stations: { mesh: THREE.Mesh; provider: HealthcareProvider }[] = [];

    DEMO_PROVIDERS.slice(0, 4).forEach((provider, i) => {
      const angle = ((i - 1.5) / 4) * Math.PI * 0.7;
      const radius = 2.0;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius + 0.5;

      const group = new THREE.Group();
      group.position.set(x, 1.3, z);
      group.lookAt(0, 1.3, 2.8);

      // Card geometry
      const cardGeo = new THREE.BoxGeometry(0.7, 0.5, 0.03);
      const cardMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.2,
        metalness: 0.8,
      });
      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      cardMesh.userData = { provider };
      group.add(cardMesh);
      stations.push({ mesh: cardMesh, provider });

      // Glowing top border
      const topGeo = new THREE.BoxGeometry(0.7, 0.08, 0.035);
      const topMat = new THREE.MeshBasicMaterial({
        color: provider.category === 'urgent_care' ? 0xef4444 : 0x06b6d4,
      });
      const topMesh = new THREE.Mesh(topGeo, topMat);
      topMesh.position.y = 0.22;
      group.add(topMesh);

      // Pedestal pole
      const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.3, 16);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = -0.7;
      group.add(pole);

      kioskGroup.add(group);
    });

    // Mouse drag interaction
    let isDragging = false;
    let prevMouseX = 0;

    renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        kioskGroup.rotation.y += deltaX * 0.005;
        prevMouseX = e.clientX;
      }
    });

    // Click raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('click', (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        stations.map((s) => s.mesh)
      );

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData?.provider) {
          this.openBooking(hit.userData.provider);
        }
      }
    });

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        kioskGroup.rotation.y += 0.001;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Clean up on tab change
    const cleanup = () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
    const observer = new MutationObserver(() => {
      if (!document.body.contains(renderer.domElement)) {
        cleanup();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private openBooking(provider: HealthcareProvider, slot?: TimeSlot) {
    openBookingModal({
      provider,
      selectedSlot: slot,
      translations: this.getTranslations(),
      onClose: () => {},
      onSuccess: (requestId) => {
        this.navigateTo('tracker', requestId);
      },
    });
  }
}

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  if (root) {
    const app = new SwiftCareApp(root);
    app.init();
  }
});
