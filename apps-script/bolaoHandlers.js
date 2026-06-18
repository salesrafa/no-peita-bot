/**
 * World Cup pool ("bolão da Copa") — imperative shell (sheet I/O + command
 * handlers). Pure logic lives in core/bolao.js.
 *
 * Data model:
 *  - "jogos"    : id | fase | mandante | visitante | data | hora | gols_mandante | gols_visitante | status
 *  - "palpites" : uuid | jogo_id | gols_mandante | gols_visitante | data_palpite | pontos_base | treinou | pontos_final
 *
 * The admin fills the "jogos" sheet (fixtures). The goals/points/trained
 * columns of "palpites" are graded later by /resultado (see the grading flow).
 */

// Ensures the "jogos" sheet exists (with its header) and returns it.
function getMatchesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.MATCHES);
  if (!sheet) sheet = ss.insertSheet(SHEETS.MATCHES);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "id", "fase", "mandante", "visitante", "data", "hora",
      "gols_mandante", "gols_visitante", "status",
    ]);
  }
  return sheet;
}

// Ensures the "palpites" sheet exists (with its header) and returns it.
function getPredictionsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.PREDICTIONS);
  if (!sheet) sheet = ss.insertSheet(SHEETS.PREDICTIONS);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "uuid", "jogo_id", "gols_mandante", "gols_visitante",
      "data_palpite", "pontos_base", "treinou", "pontos_final",
    ]);
  }
  return sheet;
}

// Builds a kickoff Date from the "data" and "hora" cells, tolerating both raw
// strings (dd/MM/yyyy and HH:mm) and Date values, since Sheets may auto-convert
// what the admin types. Returns null when the date can't be parsed.
function buildKickoff(dateCell, timeCell) {
  let year;
  let month;
  let day;
  if (dateCell instanceof Date) {
    year = dateCell.getFullYear();
    month = dateCell.getMonth();
    day = dateCell.getDate();
  } else {
    const parts = String(dateCell || "").trim().split("/");
    if (parts.length !== 3) return null;
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
  }
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  let hours = 0;
  let minutes = 0;
  if (timeCell instanceof Date) {
    hours = timeCell.getHours();
    minutes = timeCell.getMinutes();
  } else if (timeCell !== "" && timeCell != null) {
    const tp = String(timeCell).trim().split(":");
    hours = parseInt(tp[0], 10) || 0;
    minutes = parseInt(tp[1], 10) || 0;
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
}

// Reads the "jogos" sheet into normalized match objects (skips rows without a
// team pair or a parseable date). `rowIndex` is the 1-based sheet row.
function readMatches() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MATCHES);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const rows = sheet.getDataRange().getValues();
  const matches = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const home = String(row[MATCH_COL.HOME] || "").trim().toUpperCase();
    const away = String(row[MATCH_COL.AWAY] || "").trim().toUpperCase();
    if (!home || !away) continue;

    const kickoff = buildKickoff(row[MATCH_COL.DATE], row[MATCH_COL.TIME]);
    if (!kickoff) continue;

    matches.push({
      id: row[MATCH_COL.ID],
      phase: String(row[MATCH_COL.PHASE] || "").trim(),
      home: home,
      away: away,
      kickoff: kickoff,
      homeGoals: row[MATCH_COL.HOME_GOALS],
      awayGoals: row[MATCH_COL.AWAY_GOALS],
      status: String(row[MATCH_COL.STATUS] || "").trim(),
      rowIndex: i + 1,
    });
  }
  return matches;
}

// Finds the match for a team pair: prefers the next one that hasn't kicked off;
// otherwise returns the most recent past one (so we can say "already closed").
function findMatchByTeams(home, away, now) {
  const all = readMatches().filter((m) => m.home === home && m.away === away);
  if (all.length === 0) return null;

  const upcoming = all
    .filter((m) => m.kickoff.getTime() > now.getTime())
    .sort((a, b) => a.kickoff - b.kickoff);
  if (upcoming.length) return upcoming[0];

  return all.sort((a, b) => b.kickoff - a.kickoff)[0];
}

// Inserts or updates a user's prediction for a match (one per uuid+match).
function upsertPrediction(uuid, matchId, homeGoals, awayGoals) {
  const sheet = getPredictionsSheet();
  const stamp = Utilities.formatDate(
    new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss"
  );

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const sameUser = String(rows[i][PREDICTION_COL.UUID]).trim() === String(uuid).trim();
    const sameMatch = String(rows[i][PREDICTION_COL.MATCH_ID]).trim() === String(matchId).trim();
    if (sameUser && sameMatch) {
      sheet.getRange(i + 1, PREDICTION_COL.HOME_GOALS + 1).setValue(homeGoals);
      sheet.getRange(i + 1, PREDICTION_COL.AWAY_GOALS + 1).setValue(awayGoals);
      sheet.getRange(i + 1, PREDICTION_COL.CREATED_AT + 1).setValue(stamp);
      return;
    }
  }
  sheet.appendRow([uuid, matchId, homeGoals, awayGoals, stamp, "", "", ""]);
}

// /jogos -> lists the matches happening today and tomorrow, with the team
// sigla pair that doubles as the /palpite key.
function handleMatches(_e) {
  getMatchesSheet(); // create the sheet so the admin has somewhere to fill in
  const now = new Date();
  const today = formatDate(now);
  const tomorrow = formatDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  );

  const upcoming = readMatches()
    .filter((m) => {
      const day = formatDate(m.kickoff);
      return day === today || day === tomorrow;
    })
    .sort((a, b) => a.kickoff - b.kickoff);

  if (upcoming.length === 0) {
    return "⚽ *Bolão da Copa*\n\nNenhum jogo hoje ou amanhã. Volte mais perto da próxima rodada! 🏆";
  }

  return formatMatchList(upcoming, now);
}

// /palpite BRAxSUI 2x1 -> registers/updates the prediction (locked at kickoff).
function handlePrediction(e) {
  const user = getUserByIdentifier(e.parameter.From || "");
  if (!user) return MSG_NOT_REGISTERED;

  const prediction = parsePrediction(e.parameter.Body);
  if (!prediction) {
    return "❌ Use: /palpite BRAxSUI 2x1\n(sigla do mandante x visitante e o placar). Veja os jogos com /jogos.";
  }

  const now = new Date();
  const match = findMatchByTeams(prediction.home, prediction.away, now);
  if (!match) {
    return `❌ Não achei o jogo *${prediction.home} x ${prediction.away}*. Confira as siglas em /jogos.`;
  }
  if (!predictionsOpen(match, now)) {
    return `⏰ Os palpites de *${match.home} x ${match.away}* já fecharam (a bola já rolou).`;
  }

  upsertPrediction(
    user.uuid || user.whatsappId, match.id,
    prediction.homeGoals, prediction.awayGoals
  );

  return (
    `✅ Palpite registrado: *${match.home} ${prediction.homeGoals}x${prediction.awayGoals} ${match.away}*\n` +
    `⏰ Vale até ${formatKickoffTime(match.kickoff)} de ${formatDate(match.kickoff)}.`
  );
}

// /meuspalpites -> lists the user's predictions and their points (when graded).
function handleMyPredictions(e) {
  const user = getUserByIdentifier(e.parameter.From || "");
  if (!user) return MSG_NOT_REGISTERED;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PREDICTIONS);
  const emptyMsg = "🔮 Você ainda não palpitou. Veja os jogos com /jogos e mande /palpite BRAxSUI 2x1.";
  if (!sheet || sheet.getLastRow() <= 1) return emptyMsg;

  const myUuid = user.uuid || user.whatsappId;
  const matchById = {};
  readMatches().forEach((m) => { matchById[String(m.id)] = m; });

  const rows = sheet.getDataRange().getValues();
  const mine = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[PREDICTION_COL.UUID]).trim() !== String(myUuid).trim()) continue;
    const match = matchById[String(row[PREDICTION_COL.MATCH_ID])];
    if (!match) continue;
    mine.push({
      match: match,
      homeGoals: row[PREDICTION_COL.HOME_GOALS],
      awayGoals: row[PREDICTION_COL.AWAY_GOALS],
      finalPoints: row[PREDICTION_COL.FINAL_POINTS],
    });
  }

  if (mine.length === 0) return emptyMsg;

  mine.sort((a, b) => a.match.kickoff - b.match.kickoff);

  let text = `🔮 *Seus palpites (${mine.length}):*\n`;
  mine.forEach((p) => {
    const score = `${p.match.home} ${p.homeGoals}x${p.awayGoals} ${p.match.away}`;
    const graded = p.finalPoints !== "" && p.finalPoints != null;
    const status = graded ? `✅ ${p.finalPoints} pts` : "⏳ aguardando";
    text += `• ${score} — ${status}\n`;
  });
  return text.trim();
}
