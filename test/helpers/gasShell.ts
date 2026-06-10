import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/**
 * In-memory fake of the Apps Script runtime (SpreadsheetApp, Utilities,
 * Session, ContentService, PropertiesService) used to run the imperative shell
 * end-to-end against fake sheets — without a real Google Spreadsheet.
 */

type Rows = any[][];

class FakeRange {
  constructor(
    private sheet: FakeSheet,
    private row: number,
    private col: number,
    private numRows: number,
    private numCols: number,
  ) {}
  getValues(): Rows {
    const out: Rows = [];
    for (let r = 0; r < this.numRows; r++) {
      const src = this.sheet.rows[this.row - 1 + r] || [];
      const line: any[] = [];
      for (let c = 0; c < this.numCols; c++) line.push(src[this.col - 1 + c] ?? '');
      out.push(line);
    }
    return out;
  }
  getValue() {
    return this.getValues()[0][0];
  }
  setValues(vals: Rows) {
    for (let r = 0; r < vals.length; r++) {
      const ri = this.row - 1 + r;
      if (!this.sheet.rows[ri]) this.sheet.rows[ri] = [];
      for (let c = 0; c < vals[r].length; c++) this.sheet.rows[ri][this.col - 1 + c] = vals[r][c];
    }
    return this;
  }
  setValue(v: any) {
    return this.setValues([[v]]);
  }
}

class FakeSheet {
  constructor(public name: string, public rows: Rows) {}
  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(0, ...this.rows.map((r) => r.length)); }
  getDataRange() { return new FakeRange(this, 1, 1, this.rows.length, this.getLastColumn()); }
  getRange(row: number, col: number, numRows = 1, numCols = 1) {
    return new FakeRange(this, row, col, numRows, numCols);
  }
  appendRow(arr: any[]) { this.rows.push([...arr]); }
  deleteRow(rowIndex: number) { this.rows.splice(rowIndex - 1, 1); }
  clear() { this.rows = []; }
  getCharts() { return []; }
  removeChart() {}
  insertChart() {}
}

class FakeSpreadsheet {
  sheets = new Map<string, FakeSheet>();
  constructor(seed: Record<string, Rows>) {
    for (const [name, rows] of Object.entries(seed)) {
      this.sheets.set(name, new FakeSheet(name, rows.map((r) => [...r])));
    }
  }
  getSheetByName(name: string) { return this.sheets.get(name) ?? null; }
  insertSheet(name: string) {
    const s = new FakeSheet(name, []);
    this.sheets.set(name, s);
    return s;
  }
}

const DEFAULT_SEED: Record<string, Rows> = {
  usuarios: [['id_whatsapp', 'nome', 'data', 'role', 'numero', 'uuid']],
  treinos: [['uuid', 'nome', 'data', 'msgId']],
  'treinos-AB': [['nome', 'total', 'mes']],
  tickets: [['numero', 'nome', 'id', 'mensagem', 'status']],
  campeoes: [['numero', 'qtd']],
  metas: [['uuid', 'ano', 'meta']],
  lua_cheia: [['ano', 'mes', 'data']],
  mensagens: [['numero', 'nome', 'mensagem', 'data', 'comando']],
};

const AUTH_TOKEN = 'test-token';

const APP_FILES = [
  'core/animals', 'core/dates', 'core/identity', 'core/ranking', 'core/format',
  'comum', 'utils', 'configHandlers', 'handlers', 'Código',
];

function pad2(n: number) { return String(n).padStart(2, '0'); }

export function loadShell(seed: Record<string, Rows> = {}) {
  const ss = new FakeSpreadsheet({ ...DEFAULT_SEED, ...seed });
  let uuidCounter = 0;

  const ctx: any = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k: string) => (k === 'AUTH_TOKEN' ? AUTH_TOKEN : null) }),
    },
    ContentService: {
      MimeType: { XML: 'XML', JSON: 'JSON' },
      createTextOutput: (s: string) => ({ _t: s, setMimeType() { return this; }, getContent() { return this._t; } }),
    },
    Utilities: {
      getUuid: () => `uuid-${++uuidCounter}`,
      formatDate: (date: Date, _tz: string, fmt: string) =>
        fmt
          .replace('yyyy', String(date.getFullYear()))
          .replace('dd', pad2(date.getDate()))
          .replace('MM', pad2(date.getMonth() + 1))
          .replace('HH', pad2(date.getHours()))
          .replace('mm', pad2(date.getMinutes()))
          .replace('ss', pad2(date.getSeconds())),
      parseDate: (s: string) => {
        const [dd, mm, yyyy] = s.split('/').map(Number);
        return new Date(yyyy, mm - 1, dd);
      },
    },
    DriveApp: {},
    Charts: {},
  };

  const root = process.cwd();
  const src = APP_FILES
    .map((f) => fs.readFileSync(path.join(root, 'apps-script', `${f}.js`), 'utf8'))
    .join('\n\n');

  const names = new Set<string>();
  for (const m of src.matchAll(/^function\s+(\w+)\s*\(/gm)) names.add(m[1]);
  const epilogue = `\n;__app = { ${[...names].join(', ')} };`;
  ctx.__app = {};
  vm.createContext(ctx);
  // eslint-disable-next-line sonarjs/code-eval -- intentional: loads the full Apps Script app in a sandboxed VM for testing
  vm.runInContext(src + epilogue, ctx, { filename: 'gas-app.js' });

  const app = ctx.__app;

  /** Calls doPost with the given request params (token included by default). */
  function post(params: Record<string, string>): string {
    const e = { parameter: { token: AUTH_TOKEN, ...params } };
    return app.doPost(e).getContent();
  }

  /** Returns the data rows (excluding header) of a sheet. */
  function rowsOf(sheet: string): Rows {
    return (ss.getSheetByName(sheet)?.rows ?? []).slice(1);
  }

  return { app, ss, post, rowsOf, AUTH_TOKEN };
}
