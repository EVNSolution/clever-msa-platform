declare const process: {
  cwd(): string;
};

declare function require(name: string): any;

import { describe, expect, it } from 'vitest';

const { readFileSync } = require('node:fs') as {
  readFileSync(path: string, encoding: string): string;
};
const { resolve } = require('node:path') as {
  resolve(...paths: string[]): string;
};

const stylesPath = resolve(process.cwd(), 'src/styles.css');
const styles = readFileSync(stylesPath, 'utf8');

const getRuleBlock = (pattern: RegExp) => {
  const match = styles.match(pattern);
  return match?.[1] ?? '';
};

describe('settlement visual tone contracts', () => {
  it('keeps settlement navigation emphasis aligned with the shared drawer active tone and larger typography', () => {
    const activeSidebarRule = getRuleBlock(
      /\.cockpit-detached-settlement-sidebar\s+\.cockpit-nav-child-link\.is-active\s*\{([^}]*)\}/,
    );
    const activeNavRule = getRuleBlock(
      /\.cockpit-nav-link\.is-active,\s*\.cockpit-nav-toggle\.is-active,\s*\.cockpit-nav-child-link\.is-active\s*\{([^}]*)\}/,
    );
    const navLinkRule = getRuleBlock(/\.cockpit-nav-link,\s*\.cockpit-nav-child-link\s*\{([^}]*)\}/);
    const navTitleRule = getRuleBlock(/\.cockpit-settlement-nav-title\s*\{([^}]*)\}/);
    const navDescriptionRule = getRuleBlock(/\.cockpit-settlement-nav-description\s*\{([^}]*)\}/);
    const activeChipRule = getRuleBlock(/\.cockpit-settlement-chip\.is-active\s*\{([^}]*)\}/);

    expect(activeSidebarRule).toMatch(/background:\s*rgba\(205,\s*222,\s*0,\s*0\.98\);/);
    expect(activeSidebarRule).toMatch(/border:\s*1px solid rgba\(154,\s*184,\s*0,\s*0\.24\);/);
    expect(activeSidebarRule).not.toMatch(/linear-gradient/);
    expect(activeSidebarRule).toMatch(/box-shadow:\s*none;/);
    expect(activeNavRule).toMatch(/border:\s*1px solid rgba\(154,\s*184,\s*0,\s*0\.24\);/);
    expect(activeNavRule).toMatch(/box-shadow:\s*none;/);
    expect(navLinkRule).toMatch(/font-size:\s*1rem;/);
    expect(navTitleRule).toMatch(/font-size:\s*1\.08rem;/);
    expect(navDescriptionRule).toMatch(/font-size:\s*0\.86rem;/);
    expect(activeChipRule).toMatch(/background:\s*rgba\(205,\s*222,\s*0,\s*0\.98\);/);
  });

  it('keeps settlement surfaces inside the console panel family without cheonha-only shadows or gradients', () => {
    const rootRule = getRuleBlock(/:root\s*\{([\s\S]*?)\n\}/);
    const brandBlockRule = getRuleBlock(/\.cockpit-brand-block\s*\{([^}]*)\}/);
    const settlementPanelRule = getRuleBlock(
      /\.cockpit-shell-settlement\s+\.cockpit-workspace-header,\s*\.cockpit-shell-settlement\s+\.cockpit-workspace-panel\s*\{([^}]*)\}/,
    );
    const settlementSidebarLayoutRule = getRuleBlock(
      /\.cockpit-shell-settlement\s+\.cockpit-detached-settlement-sidebar\s*\{([^}]*)\}/,
    );
    const detachedSidebarRule = getRuleBlock(
      /\.cockpit-detached-settlement-sidebar\s+\.cockpit-detached-sidebar\s*\{([^}]*)\}/,
    );
    const detachedSettlementSidebarRule = getRuleBlock(/\.cockpit-detached-settlement-sidebar\s*\{([^}]*)\}/);
    const vehicleSidebarLayoutRule = getRuleBlock(
      /\.cockpit-shell-vehicle\s*>\s*\.cockpit-child-nav\.cockpit-detached-sidebar\s*\{([^}]*)\}/,
    );
    const decorativeOverlayRule = getRuleBlock(/\.cockpit-cheonha-settlement-home::before\s*\{([^}]*)\}/);
    const processStepRule = getRuleBlock(/\.cockpit-settlement-process-step\s*\{([^}]*)\}/);
    const kpiCardRule = getRuleBlock(/\.cockpit-settlement-kpi-card\s*\{([^}]*)\}/);
    const shellRule = getRuleBlock(/\.cockpit-shell\s*\{([^}]*)\}/);
    const sidebarRule = getRuleBlock(/\.cockpit-detached-sidebar\s*\{([^}]*)\}/);
    const primaryMenuSurfaceRule = getRuleBlock(/\.cockpit-primary-menu-surface\s*\{([^}]*)\}/);
    const headerActionRule = getRuleBlock(/\.cockpit-header-action\s*\{([^}]*)\}/);
    const headerPanelRule = getRuleBlock(/\.cockpit-header-panel\s*\{([^}]*)\}/);
    const navLinkRule = getRuleBlock(/\.cockpit-nav-link,\s*\.cockpit-nav-toggle,\s*\.cockpit-nav-child-link\s*\{([^}]*)\}/);
    const hoverRule = getRuleBlock(
      /\.cockpit-nav-link:hover,\s*\.cockpit-nav-toggle:hover,\s*\.cockpit-nav-child-link:hover\s*\{([^}]*)\}/,
    );

    const launcherClusterRule = getRuleBlock(/\.cockpit-launcher-cluster\s*\{([^}]*)\}/);

    expect(rootRule).toMatch(/--cockpit-rail-width:\s*18\.4rem;/);
    expect(rootRule).toMatch(/--cockpit-surface-width:\s*16\.8rem;/);
    expect(launcherClusterRule).toMatch(/margin:\s*1rem 1rem 0;/);
    expect(brandBlockRule).toMatch(/width:\s*100%;/);
    expect(detachedSettlementSidebarRule).toMatch(/width:\s*auto;/);
    expect(settlementSidebarLayoutRule).toMatch(/width:\s*auto;/);
    expect(settlementSidebarLayoutRule).toMatch(/margin:\s*1rem 1rem 0;/);
    expect(vehicleSidebarLayoutRule).toMatch(/width:\s*auto;/);
    expect(vehicleSidebarLayoutRule).toMatch(/margin:\s*1rem 1rem 0;/);
    expect(settlementPanelRule).toMatch(/border-radius:\s*22px;/);
    expect(settlementPanelRule).toMatch(/box-shadow:\s*none;/);
    expect(detachedSidebarRule).toMatch(/border-radius:\s*16px;/);
    expect(detachedSidebarRule).toMatch(/box-shadow:\s*none;/);
    expect(decorativeOverlayRule).toMatch(/content:\s*none;/);
    expect(processStepRule).toMatch(/border-radius:\s*16px;/);
    expect(processStepRule).not.toMatch(/linear-gradient/);
    expect(kpiCardRule).toMatch(/border-radius:\s*16px;/);
    expect(kpiCardRule).toMatch(/box-shadow:\s*none;/);
    expect(shellRule).not.toMatch(/gradient/);
    expect(styles).toMatch(
      /\.cockpit-brand-link\s*\{[\s\S]*?background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\);[\s\S]*?box-shadow:\s*none;/,
    );
    expect(sidebarRule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\);/);
    expect(sidebarRule).toMatch(/border:\s*1px solid rgba\(20,\s*40,\s*70,\s*0\.08\);/);
    expect(primaryMenuSurfaceRule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.94\);/);
    expect(primaryMenuSurfaceRule).toMatch(/border:\s*1px solid rgba\(20,\s*40,\s*70,\s*0\.08\);/);
    expect(primaryMenuSurfaceRule).toMatch(/box-shadow:\s*none;/);
    expect(headerActionRule).toMatch(/box-shadow:\s*none;/);
    expect(headerPanelRule).toMatch(/box-shadow:\s*none;/);
    expect(navLinkRule).toMatch(/color:\s*#4f5f79;/);
    expect(hoverRule).toMatch(/background:\s*rgba\(18,\s*43,\s*71,\s*0\.05\);/);
  });
});
