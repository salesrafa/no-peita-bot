
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
