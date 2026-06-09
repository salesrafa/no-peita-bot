function formatWrappedOlympics(ranking) {
  if (!ranking || ranking.length === 0) {
    return "🏅 *Quadro de medalhas*\n\nNenhuma medalha registrada.";
  }

  let text = `🏅 *Quadro de medalhas*\n\n`;

  ranking.forEach((r, index) => {
    text +=
      `${index + 1} - *${r.name}*  ` +
      `🥇 ${r.gold}  🥈 ${r.silver}  🥉 ${r.bronze}\n`;
  });

  return text.trim();
}

function formatWrappedChampions(lista) {
  if (!lista || lista.length === 0) {
    return "📅 *Campeões do ano*\n\nNenhum campeão registrado.";
  }

  let text = `📅 *Campeões do ano*\n\n`;

  lista.forEach(item => {
    text += `🗓️ *${item.monthName}*\n`;

    if (item.gold.length > 0) {
      text += `🥇 ${item.gold.join(", ")}\n`;
    }

    if (item.silver.length > 0) {
      text += `🥈 ${item.silver.join(", ")}\n`;
    }

    if (item.bronze.length > 0) {
      text += `🥉 ${item.bronze.join(", ")}\n`;
    }

    text += `\n`;
  });

  return text.trim();
}

function sortOlympicRanking(medals) {
  return Object.values(medals).sort((a, b) => {
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    return a.name.localeCompare(b.name);
  });
}

function initAthlete(name, medals) {
  if (!medals[name]) {
    medals[name] = {
      name,
      gold: 0,
      silver: 0,
      bronze: 0
    };
  }
}

function generateOlympicRankingByYear(year) {
  const championsByMonth = getChampionsByMonth(year);
  const medals = {}; // name -> contadores

  championsByMonth.forEach(month => {
    month.gold.forEach(name => {
      initAthlete(name, medals);
      medals[name].gold++;
    });

    month.silver.forEach(name => {
      initAthlete(name, medals);
      medals[name].silver++;
    });

    month.bronze.forEach(name => {
      initAthlete(name, medals);
      medals[name].bronze++;
    });
  });

  return sortOlympicRanking(medals);
}

function getChampionsByMonth(year) {
  const result = [];
  const now = new Date();

  for (let month = 0; month < 12; month++) {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Only fully finished months: the current month (still ongoing)
    // and future months are excluded from the medals/champions board.
    if (end.getTime() >= now.getTime()) continue;

    const ranking = generateRankingForPeriod(start, end);
    if (!ranking || ranking.length === 0) continue;

    const gold = ranking.filter(r => r.rank === 1).map(r => r.name);
    const silver = ranking.filter(r => r.rank === 2).map(r => r.name);
    const bronze = ranking.filter(r => r.rank === 3).map(r => r.name);

    result.push({
      month: month + 1,
      monthName: getMonthNamePtBr(month),
      gold,
      silver,
      bronze
    });
  }

  return result;
}

function generateRankingChart(ranking, label) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetName = "grafico-ranking";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();

  // Header
  sheet.getRange(1, 1, 1, 2).setValues([["Nome", "Treinos"]]);

  const top = ranking.slice(0, 10);
  const rows = top.map(r => [r.name, r.total]);
  sheet.getRange(2, 1, rows.length, 2).setValues(rows);

  // Remove old charts
  sheet.getCharts().forEach(c => sheet.removeChart(c));

  // Create chart
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sheet.getRange(1, 1, rows.length + 1, 2))
    .setPosition(1, 4, 0, 0)
    .setOption("title", label)
    .setOption("legend", { position: "none" })
    .setOption("hAxis", { title: "Atletas" })
    .setOption("vAxis", { title: "Treinos" })
    .build();

  sheet.insertChart(chart);

  // 🔽 EXPORTA COMO IMAGEM
  const blob = chart.getAs("image/png");
  const file = DriveApp.createFile(blob)
    .setName(`ranking-${label}.png`);

  // 🔓 MAKE THE FILE PUBLIC
  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  // 🔗 Return a link accessible from WhatsApp
  return file.getUrl();
}

function getPeriodByYear(body) {
  const text = (body || "").trim();
  const parts = text.split(/\s+/);

  const now = new Date();
  let year = now.getFullYear();

  // /rankingano 2025
  if (parts.length === 2 && /^\d{4}$/.test(parts[1])) {
    year = parseInt(parts[1], 10);
  }

  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  return {
    start,
    end,
    label: `Ranking ${year}`
  };
}

function getPeriodFromMessage(body) {
  const text = (body || "").trim();
  const parts = text.split(/\s+/);

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // default: current month
  let start = new Date(today.getFullYear(), today.getMonth(), 1);
  let end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  let label = `${getMonthNamePtBr(today.getMonth())}/${today.getFullYear()}`;
  let type = "mes"; // "mes" (mês inteiro) | "intervalo" (range de datas)

  // /ranking MM/AAAA
  if (parts.length === 2 && /^\d{2}\/\d{4}$/.test(parts[1])) {
    const [mm, yyyy] = parts[1].split("/");
    const month = parseInt(mm, 10) - 1;
    const year = parseInt(yyyy, 10);

    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    label = `${getMonthNamePtBr(month)}/${year}`;
  }

  // /ranking DD/MM/AAAA DD/MM/AAAA
  if (
    parts.length === 3 &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(parts[1]) &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(parts[2])
  ) {
    start = parseBrDate(parts[1], true);
    end = parseBrDate(parts[2], false);
    label = `${parts[1]} → ${parts[2]}`;
    type = "intervalo";
  }

  return { start, end, label, type };
}

// Secondary, individual, non-comparative ranking: each tier requires a fixed
// number of workouts in the month, ordered from weakest to legendary. The tier
// reflects only the person's own performance — it doesn't depend on others.
const ANIMALS = [
  { min: 0,  emoji: "🥚", name: "Ovo",       vibe: "ainda não chocou no mês" },
  { min: 1,  emoji: "🐔", name: "Frango",    vibe: "tá começando!" },
  { min: 2,  emoji: "🐢", name: "Tartaruga", vibe: "devagar, mas não parou" },
  { min: 3,  emoji: "🐰", name: "Coelho",    vibe: "ligou o foguinho" },
  { min: 5,  emoji: "🐶", name: "Cachorro",  vibe: "animado e fiel ao treino" },
  { min: 7,  emoji: "🦊", name: "Raposa",    vibe: "esperto, achou o ritmo" },
  { min: 9,  emoji: "🐗", name: "Javali",    vibe: "brutão, entrou com tudo" },
  { min: 12, emoji: "🐺", name: "Lobo",      vibe: "entrou na alcateia" },
  { min: 15, emoji: "🐆", name: "Onça",      vibe: "predador ágil" },
  { min: 18, emoji: "🐅", name: "Tigre",     vibe: "fera de respeito" },
  { min: 21, emoji: "🐻", name: "Urso",      vibe: "força bruta" },
  { min: 25, emoji: "🦁", name: "Leão",      vibe: "rei do mês" },
  // secret: never previewed (help/notice/"remaining X"); only shows up once
  // someone actually earns it — it's the surprise at the top.
  { min: 29, emoji: "🐉", name: "Dragão",    vibe: "lendário, fora da curva", secret: true },
];

// Given the month's workout total, returns { current, next, remaining }.
// `next` is null when the top tier (Dragão) has been reached.
function classifyAnimal(total) {
  const n = Number(total) || 0;
  let idx = 0;
  for (let i = 0; i < ANIMALS.length; i++) {
    if (n >= ANIMALS[i].min) idx = i; else break;
  }
  const current = ANIMALS[idx];
  const next = idx < ANIMALS.length - 1 ? ANIMALS[idx + 1] : null;
  const remaining = next ? next.min - n : 0;
  return { current, next, remaining };
}

function formatRanking(ranking, titulo, mostrarBicho) {
  if (ranking.length === 0) {
    return "📊 Nenhum treino encontrado no período.";
  }

  let text = `📊 *${titulo}*\n\n`;

  ranking.forEach(r => {
    const medal =
      r.rank === 1 ? "🥇 " :
      r.rank === 2 ? "🥈 " :
      r.rank === 3 ? "🥉 " : "";

    // Animal badge only on monthly rankings (the tier is a fixed monthly goal).
    const bicho = mostrarBicho ? ` ${classifyAnimal(r.total).current.emoji}` : "";

    text += `${r.rank} - ${medal}*${r.name}* - ${r.total} treino(s) - 🔥 ${r.streak}${bicho}\n`;
  });

  let result = text.trim();

  // Animal hint only when badges are shown (monthly rankings).
  // Deliberately neutral emoji — doesn't reveal the secret top animal.
  if (mostrarBicho) {
    result += `\n\n🐾 Use /eu para entender seu bicho do mês.`;
  }

  return result;
}

function applyRankWithTies(rows) {
  let prevTotal = null;
  let prevSeq = null;
  let prevRank = 0;

  return rows.map((item, index) => {
    let rank;
    if (item.total === prevTotal && item.streak === prevSeq) {
      rank = prevRank;
    } else {
      rank = index + 1;
    }

    prevTotal = item.total;
    prevSeq = item.streak;
    prevRank = rank;

    return {
      ...item,
      rank
    };
  });
}

// dateFilterFn (optional): receives each daily workout's date and returns
// true/false to include it. When provided, aggregated workouts (AB, pre-bot)
// are ignored, since they are monthly totals without per-day dates and can't
// be filtered by day (e.g. mystery ranking by full-moon dates).
function generateRankingForPeriod(startDate, endDate, filtroDataFn) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const abSheet = ss.getSheetByName(SHEETS.WORKOUTS_AB);
  const abRows = abSheet ? abSheet.getDataRange().getValues() : [];

  const maps = getIdentityMaps();
  const uuidParaNome = getUuidToNameMap();

  const porPessoa = {}; // uuid -> { name, datas: [], totalAB: number }

  // Ensures a uuid's bucket, resolving the canonical display name.
  function bucket(uuid, nomeFallback) {
    if (!porPessoa[uuid]) {
      porPessoa[uuid] = {
        name: uuidParaNome[uuid] || nomeFallback || uuid,
        dates: [],
        totalAB: 0,
      };
    }
    return porPessoa[uuid];
  }

  // ---------- daily workouts (post-bot) ----------
  readWorkouts(maps).forEach(t => {
    if (t.date < startDate || t.date > endDate) return;
    if (filtroDataFn && !filtroDataFn(t.date)) return;
    if (!t.uuid) return;

    bucket(t.uuid, t.name).dates.push(new Date(t.date));
  });

  // ---------- aggregated workouts (pre-bot | 2025 ONLY) ----------
  const ANO_AB = 2025;

  // only consider AB if the period touches 2025 and there's no date filter
  // (monthly totals have no per-day date to apply the filter)
  if (
    !filtroDataFn &&
    startDate.getFullYear() <= ANO_AB &&
    endDate.getFullYear() >= ANO_AB
  ) {
    for (let i = 1; i < abRows.length; i++) {
      const [name, total, month] = abRows[i];
      if (!name || !total || !month) continue;

      const monthStart = new Date(ANO_AB, month - 1, 1);
      const monthEnd = new Date(ANO_AB, month, 0, 23, 59, 59, 999);

      // month outside the range → skip
      if (monthEnd < startDate || monthStart > endDate) continue;

      // treinos-AB only has a name; resolve by name (fallback to the name itself).
      const uuid = maps.byName[String(name).trim()] || String(name).trim();
      bucket(uuid, name).totalAB += Number(total);
    }
  }

  return computeRankingMetricsWithAB(porPessoa);
}

function computeRankingMetricsWithAB(porPessoa) {
  const rows = Object.entries(porPessoa).map(([uuid, info]) => {
    const name = info.name;
    const dates = info.dates;

    const uniqueDays = Array.from(
      new Set(dates.map(d =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString()
      ))
    ).map(s => new Date(s)).sort((a, b) => a - b);

    // streak only from daily rows
    let maiorSeq = 0, atualSeq = 0, anterior = null;
    for (const d of uniqueDays) {
      if (anterior && daysBetween(anterior, d) === 1) {
        atualSeq += 1;
      } else {
        atualSeq = 1;
      }
      maiorSeq = Math.max(maiorSeq, atualSeq);
      anterior = d;
    }

    return {
      name,
      total: uniqueDays.length + info.totalAB,
      streak: maiorSeq
    };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return 0;
  });

  return applyRankWithTies(rows);
}

function getUserByIdentifier(identifier) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) return null;

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = String(row[USER_COL.ID]).trim();
    const realNumber = String(row[USER_COL.NUMBER]).trim();

    if ((id === '') || (!id && !realNumber)) continue;

    if (identifier === id || identifier === realNumber) {
      return {
        whatsappId: row[USER_COL.ID],
        name: row[USER_COL.NAME],
        role: row[USER_COL.ROLE],
        number: row[USER_COL.NUMBER],
        uuid: String(row[USER_COL.UUID] || "").trim(),
      };
    }
  }

  return null;
}

function getUserName(identifier) {
  const user = getUserByIdentifier(identifier);
  return user ? user.name : null;
}

// Resolves a user's canonical uuid from any WhatsApp identifier (lid or
// number). Returns null if not registered.
function resolveUuid(identifier) {
  const user = getUserByIdentifier(identifier);
  return user ? user.uuid : null;
}

// Builds identity maps from the "usuarios" sheet, used to resolve any workout
// row key (legacy id_whatsapp, number, name or the uuid itself) to the
// canonical uuid. Called once per batch read.
function getIdentityMaps() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const byKey = {};  // id_whatsapp | number | uuid -> uuid
  const byName = {}; // name -> uuid (fallback for treinos-AB and legacy rows)
  if (!sheet) return { byKey, byName };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][USER_COL.ID] || "").trim();
    const name = String(rows[i][USER_COL.NAME] || "").trim();
    const number = String(rows[i][USER_COL.NUMBER] || "").trim();
    const uuid = String(rows[i][USER_COL.UUID] || "").trim();
    if (!uuid) continue;
    byKey[uuid] = uuid;
    if (id) byKey[id] = uuid;
    if (number) byKey[number] = uuid;
    if (name && !(name in byName)) byName[name] = uuid;
  }
  return { byKey, byName };
}

// Resolves the canonical key (uuid) of a workout row. Uses the column-0 value
// (legacy id_whatsapp or uuid) and, as a fallback, the name (column 1) —
// needed for workouts whose old id_whatsapp no longer exists in "usuarios"
// and for the "treinos-AB" sheet (name only). If nothing matches, returns the
// raw value so the row isn't lost.
function resolveWorkoutUuid(col0Value, name, maps) {
  const key = String(col0Value || "").trim();
  if (maps.byKey[key]) return maps.byKey[key];
  const n = String(name || "").trim();
  if (n && maps.byName[n]) return maps.byName[n];
  return key || n;
}

// Map uuid -> canonical name (column B of "usuarios"), for display.
function getUuidToNameMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const map = {};
  if (!sheet) return map;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const name = String(rows[i][USER_COL.NAME] || "").trim();
    const uuid = String(rows[i][USER_COL.UUID] || "").trim();
    if (uuid && name) map[uuid] = name;
  }
  return map;
}

// Reads the "treinos" sheet and returns normalized records { uuid, name, date }
// with the canonical uuid already resolved (legacy id_whatsapp/uuid → uuid,
// name fallback). Skips empty rows and the header. Does NOT include "treinos-AB"
// (pre-bot) nor the row index — callers that need that (e.g. /apagar) read
// directly. `maps` is optional: pass an already-computed getIdentityMaps() to
// avoid re-reading the "usuarios" sheet.
function readWorkouts(maps) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.WORKOUTS);
  if (!sheet) return [];
  maps = maps || getIdentityMaps();
  const rows = sheet.getDataRange().getValues();
  const workouts = [];
  for (let i = 1; i < rows.length; i++) {
    const col0 = rows[i][WORKOUT_COL.UUID];
    const name = rows[i][WORKOUT_COL.NAME];
    const rawDate = rows[i][WORKOUT_COL.DATE];
    if ((!col0 && !name) || !rawDate) continue;
    workouts.push({
      uuid: resolveWorkoutUuid(col0, name, maps),
      name: name,
      date: new Date(rawDate),
    });
  }
  return workouts;
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getMonthNamePtBr(monthNumber) {
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return nomes[monthNumber];
}

function daysBetween(d1, d2) {
  const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function parseBrDate(text, inicioDoDia) {
  const [dd, mm, yyyy] = text.split("/");
  const date = new Date(
    parseInt(yyyy, 10),
    parseInt(mm, 10) - 1,
    parseInt(dd, 10)
  );

  if (inicioDoDia) {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function workedOutOnDate(identifier, date) {
  const user = getUserByIdentifier(identifier);
  if (!user) return false;

  // canonical uuid; falls back to id_whatsapp until the migration has run.
  const uuidUsuario = user.uuid || user.whatsappId;

  const dateRef = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();

  // 🔑 compare by the resolved canonical uuid (readWorkouts already resolves it)
  return readWorkouts().some(t => {
    if (t.uuid !== uuidUsuario) return false;
    const dTime = new Date(
      t.date.getFullYear(),
      t.date.getMonth(),
      t.date.getDate()
    ).getTime();
    return dTime === dateRef;
  });
}
