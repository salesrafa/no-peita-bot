import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * Loads the Apps Script "functional core" (apps-script/core/*.js) into a Node
 * VM context and returns its top-level functions/consts as a plain object.
 *
 * These files are pure (no SpreadsheetApp/Utilities/etc.), so they run as-is.
 * We concatenate them (single shared global scope, like Apps Script) and append
 * a small epilogue that captures every top-level `function`/`const` name into an
 * exports object — without touching the production files.
 */
const CORE_FILES = ['animals', 'identity', 'dates', 'ranking', 'format'];

function collectNames(src: string): string[] {
  const names = new Set<string>();
  for (const m of src.matchAll(/^function\s+([A-Za-z0-9_]+)\s*\(/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^const\s+([A-Za-z0-9_]+)\s*=/gm)) names.add(m[1]);
  return [...names];
}

export function loadGasCore(): Record<string, any> {
  const root = process.cwd();
  const src = CORE_FILES.map((n) =>
    fs.readFileSync(path.join(root, 'apps-script', 'core', `${n}.js`), 'utf8'),
  ).join('\n\n');

  const epilogue = `\n;__coreExports = { ${collectNames(src).join(', ')} };`;
  const context: Record<string, any> = { __coreExports: {} };
  vm.createContext(context);
  vm.runInContext(src + epilogue, context, { filename: 'gas-core.js' });
  return context.__coreExports;
}

// Loaded once and shared across the core test files.
export const core = loadGasCore();
