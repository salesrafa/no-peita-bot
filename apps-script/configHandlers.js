function getAdmins() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEETS.USERS);
    const rows = sheet.getDataRange().getValues();

    let admins = [];
    for (let i = 1; i < rows.length; i++) {
      const [number, name, date, role] = rows[i];
      if (role && role.toLowerCase() === "admin") {
        admins.push({ number, name, date });
      }
    }

    return ContentService.createTextOutput(JSON.stringify(admins))
      .setMimeType(ContentService.MimeType.JSON);
}

function pendingCacheUpdates() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1–12
  const pending = [];

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.FULL_MOON);
  if (!sheet) {
    // if the sheet doesn't exist, create it and request the current month
    pending.push({ cache: "lua_cheia", year: currentYear, month: String(currentMonth).padStart(2, '0') });
    return pending;
  }

  const rows = sheet.getDataRange().getValues();

  // check whether the current month is already cached
  const hasCurrentMonth = rows.some(row => {
    const [year, month] = row;
    return parseInt(year) === currentYear && parseInt(month) === currentMonth;
  });

  if (!hasCurrentMonth) {
    pending.push({ cache: "lua_cheia", year: currentYear, month: String(currentMonth).padStart(2, '0') });
  }

  // count how many future dates exist for the current month
  const datasFuturasMesAtual = rows.filter(row => {
    const [year, month, dateObj] = row;
    if (!dateObj) return false;

    const date = (dateObj instanceof Date)
      ? dateObj
      : new Date(dateObj);

    const ehFuturo = date > today;
    return (
      parseInt(year) === currentYear &&
      parseInt(month) === currentMonth &&
      ehFuturo
    );
  });

  // if 2 or fewer future dates remain → also request the next month
  if (datasFuturasMesAtual.length <= 2) {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const hasNext = rows.some(row => {
      const [year, month] = row;
      return parseInt(year) === nextYear && parseInt(month) === nextMonth;
    });

    if (!hasNext) {
      pending.push({
        cache: "lua_cheia",
        year: nextYear,
        month: String(nextMonth).padStart(2, '0')
      });
    }
  }

  return pending;
}

function updateFullMoonCache(e) {
  const year = e.parameter.Ano;
  const month = e.parameter.Mes;
  const rawDates = e.parameter.Datas;
  const dates = rawDates.split(',').map(item => item.trim());;

  if (!year || !month || !dates || !Array.isArray(dates)) {
    return `sucesso: false, erro: "Parâmetros inválidos"`;
  }

  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.FULL_MOON) ||
    SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEETS.FULL_MOON);

  const firstRow = aba.getLastRow() + 1;
  const rows = dates.map(date => [year, month, date]);

  aba.getRange(firstRow, 1, rows.length, 3).setValues(rows);

  return `sucesso: true, addedRecords: ${rows.length}`;
}