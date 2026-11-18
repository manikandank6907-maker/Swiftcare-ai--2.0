import * as THREE from 'three';
import * as xb from 'xrblocks';
import { DEMO_PROVIDERS } from '../data/mockProviders';
import { HealthcareProvider } from '../types';

export class SwiftCareXRKioskScene extends xb.Script {
  private kioskPillars: THREE.Group[] = [];
  private onSelectCallback?: (provider: HealthcareProvider) => void;

  constructor(onSelectProvider?: (provider: HealthcareProvider) => void) {
    super();
    this.onSelectCallback = onSelectProvider;
  }

  init() {
    // Ambient and Directional Lighting
    this.add(new THREE.HemisphereLight(0xffffff, 0x1e293b, 3));
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2);
    dirLight.position.set(2, 4, 1);
    this.add(dirLight);

    // Virtual Clinic Ground Grid
    const grid = new THREE.GridHelper(10, 20, 0x0891b2, 0x1e293b);
    grid.position.y = 0;
    this.add(grid);

    // Build 3D spatial clinic cards for the top providers
    DEMO_PROVIDERS.slice(0, 4).forEach((provider, index) => {
      const angle = ((index - 1.5) / 4) * Math.PI * 0.8;
      const radius = 1.6;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius;

      const cardGroup = this.createClinicStation(provider, x, 1.4, z);
      cardGroup.lookAt(0, 1.4, 0);
      this.add(cardGroup);
      this.kioskPillars.push(cardGroup);
    });
  }

  private createClinicStation(
    provider: HealthcareProvider,
    x: number,
    y: number,
    z: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.userData = { provider };

    // Card background panel
    const geometry = new THREE.BoxGeometry(0.55, 0.42, 0.02);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.6,
    });
    const panel = new THREE.Mesh(geometry, material);
    panel.name = `Kiosk-${provider.id}`;
    group.add(panel);

    // Glowing Cyan Header Bar
    const headerGeo = new THREE.BoxGeometry(0.55, 0.06, 0.025);
    const headerMat = new THREE.MeshBasicMaterial({
      color: provider.category === 'urgent_care' ? 0xef4444 : 0x06b6d4,
    });
    const headerMesh = new THREE.Mesh(headerGeo, headerMat);
    headerMesh.position.y = 0.18;
    group.add(headerMesh);

    // Pedestal stand
    const standGeo = new THREE.CylinderGeometry(0.02, 0.04, 1.4, 16);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const standMesh = new THREE.Mesh(standGeo, standMat);
    standMesh.position.y = -0.7;
    group.add(standMesh);

    // Pedestal base
    const baseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.04, 24);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.4;
    group.add(baseMesh);

    return group;
  }

  update() {
    // Subtle breathing animation for spatial kiosks
    const time = performance.now() * 0.0015;
    this.kioskPillars.forEach((pillar, i) => {
      pillar.position.y = 1.35 + Math.sin(time + i) * 0.015;
    });
  }

  onSelectEnd(event: xb.SelectEvent) {
    // Check if user clicked or pinched a spatial kiosk
    const target = event.target as THREE.Object3D;
    let current: THREE.Object3D | null = target;
    while (current && !current.userData?.provider) {
      current = current.parent;
    }
    if (current && current.userData?.provider) {
      const prov: HealthcareProvider = current.userData.provider;
      if (this.onSelectCallback) {
        this.onSelectCallback(prov);
      }
    }
  }
}
