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

describe('DispatchUploadsPage settlement layout contract', () => {
  it('renders the settlement upload scope as a horizontal expander above the upload workspace', () => {
    const settlementShellRule = getRuleBlock(
      /\.dispatch-upload-settlement-shell\s*\{([^}]*)\}/,
    );
    const settlementScopeBodyRule = getRuleBlock(
      /\.dispatch-upload-scope-inline-body\s*\{([^}]*)\}/,
    );
    const settlementSummaryRule = getRuleBlock(
      /\.dispatch-upload-scope-inline-summary\s*\{([^}]*)\}/,
    );

    expect(settlementShellRule).toMatch(/display:\s*grid;/);
    expect(settlementShellRule).toMatch(
      /grid-template-columns:\s*minmax\(11rem,\s*12\.5rem\)\s*minmax\(0,\s*1fr\);/,
    );
    expect(settlementScopeBodyRule).toMatch(
      /grid-template-columns:\s*1fr;/,
    );
    expect(settlementSummaryRule).toMatch(/display:\s*flex;/);
    expect(settlementSummaryRule).toMatch(/width:\s*100%;/);
    expect(settlementSummaryRule).toMatch(/min-height:\s*3\.4rem;/);
  });

  it('keeps the settlement scope body stackable without turning the collapsed launcher into a tall sidebar card', () => {
    const narrowScopeBodyRule = getRuleBlock(
      /@media \(max-width: 1240px\)\s*\{[\s\S]*?\.dispatch-upload-scope-inline-body\s*\{([^}]*)\}/,
    );
    const narrowSettlementShellRule = getRuleBlock(
      /@media \(max-width: 1240px\)\s*\{[\s\S]*?\.dispatch-upload-settlement-shell\s*\{([^}]*)\}/,
    );
    const narrowSummaryRule = getRuleBlock(
      /@media \(max-width: 1240px\)\s*\{[\s\S]*?\.dispatch-upload-scope-inline-summary\s*\{([^}]*)\}/,
    );

    expect(narrowSettlementShellRule).toMatch(/grid-template-columns:\s*1fr;/);
    expect(narrowScopeBodyRule).toMatch(
      /grid-template-columns:\s*minmax\(14rem,\s*1\.4fr\)\s*auto\s*auto;/,
    );
    expect(narrowSummaryRule).not.toMatch(/max-width:\s*12\.5rem;/);
    expect(narrowSummaryRule).not.toMatch(/order:\s*-1;/);
  });
});
