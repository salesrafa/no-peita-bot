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

// Finds the match to grade for a team pair: the most recent one that has
// already kicked off. Returns the match, the "NOT_STARTED" sentinel when the
// pair exists but hasn't started, or null when there's no such pair.
function findPlayedMatch(home, away, now) {
  const all = readMatches().filter((m) => m.home === home && m.away === away);
  if (all.length === 0) return null;

  const played = all
    .filter((m) => m.kickoff.getTime() <= now.getTime())
    .sort((a, b) => b.kickoff - a.kickoff);
  return played.length ? played[0] : "NOT_STARTED";
}

// Writes the final score back to the match row and marks it as finished.
function recordMatchResult(match, homeGoals, awayGoals) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.MATCHES);
  sheet.getRange(match.rowIndex, MATCH_COL.HOME_GOALS + 1).setValue(homeGoals);
  sheet.getRange(match.rowIndex, MATCH_COL.AWAY_GOALS + 1).setValue(awayGoals);
  sheet.getRange(match.rowIndex, MATCH_COL.STATUS + 1).setValue("encerrado");
}

// Grades every prediction for a match: base points × the workout multiplier
// (×2 for whoever trained on match day). Overwrites previous grades, so it's
// safe to re-run when a score is corrected. Returns how many were graded.
function gradePredictions(match, result) {
  const sheet = getPredictionsSheet();
  const rows = sheet.getDataRange().getValues();

  // who trained on the match day (compared by canonical uuid)
  const matchDay = formatDate(match.kickoff);
  const trained = {};
  readWorkouts().forEach((w) => {
    if (formatDate(w.date) === matchDay) trained[w.uuid] = true;
  });

  let graded = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[PREDICTION_COL.MATCH_ID]).trim() !== String(match.id).trim()) continue;

    const prediction = {
      homeGoals: Number(row[PREDICTION_COL.HOME_GOALS]),
      awayGoals: Number(row[PREDICTION_COL.AWAY_GOALS]),
    };
    const uuid = String(row[PREDICTION_COL.UUID]).trim();
    const base = scoreBasePoints(prediction, result);
    const didTrain = !!trained[uuid];

    sheet.getRange(i + 1, PREDICTION_COL.BASE_POINTS + 1).setValue(base);
    sheet.getRange(i + 1, PREDICTION_COL.TRAINED + 1).setValue(didTrain ? "sim" : "não");
    sheet.getRange(i + 1, PREDICTION_COL.FINAL_POINTS + 1).setValue(applyTrainingMultiplier(base, didTrain));
    graded++;
  }
  return graded;
}

// /resultado BRAxSUI 2x1 (admins only) -> records the final score and grades
// every prediction for that match. Safe to re-run to fix a score.
function handleResult(e) {
  const user = getUserByIdentifier(e.parameter.From || "");
  if (!user) return MSG_NOT_REGISTERED;
  if (!isAdmin(user)) return "🔒 Só admins podem lançar resultados.";

  const result = parseResult(e.parameter.Body);
  if (!result) {
    return "❌ Use: /resultado BRAxSUI 2x1\n(sigla do mandante x visitante e o placar final).";
  }

  const now = new Date();
  const match = findPlayedMatch(result.home, result.away, now);
  if (match === "NOT_STARTED") {
    return `⏳ O jogo *${result.home} x ${result.away}* ainda não começou — não dá pra lançar resultado.`;
  }
  if (!match) {
    return `❌ Não achei o jogo *${result.home} x ${result.away}*. Confira as siglas em /jogos.`;
  }

  recordMatchResult(match, result.homeGoals, result.awayGoals);
  const graded = gradePredictions(match, result);

  return (
    `✅ Resultado lançado: *${match.home} ${result.homeGoals}x${result.awayGoals} ${match.away}*\n` +
    `📊 ${graded} palpite${graded === 1 ? "" : "s"} apurado${graded === 1 ? "" : "s"} ` +
    `(×2 para quem treinou em ${formatDate(match.kickoff)}).\n` +
    "Veja o ranking com /bolao."
  );
}

// /bolao -> standings by total final points (graded predictions only).
function handleBolaoRanking(_e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.PREDICTIONS);
  if (!sheet || sheet.getLastRow() <= 1) return formatBolaoRanking([]);

  const nameByUuid = getUuidToNameMap();
  const totals = {}; // uuid -> { points, exacts }

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const finalPoints = row[PREDICTION_COL.FINAL_POINTS];
    if (finalPoints === "" || finalPoints == null) continue; // not graded yet

    const uuid = String(row[PREDICTION_COL.UUID]).trim();
    if (!totals[uuid]) totals[uuid] = { points: 0, exacts: 0 };
    totals[uuid].points += Number(finalPoints);
    if (Number(row[PREDICTION_COL.BASE_POINTS]) === BOLAO_SCORING.EXACT) totals[uuid].exacts++;
  }

  const entries = Object.keys(totals).map((uuid) => ({
    name: nameByUuid[uuid] || uuid,
    points: totals[uuid].points,
    exacts: totals[uuid].exacts,
  }));

  return formatBolaoRanking(entries);
}

// ---------------------------------------------------------------------------
// Automated results sync (football-data.org)
// ---------------------------------------------------------------------------

// Time-driven entry point: fetches finished World Cup matches and grades any
// that aren't recorded yet. Idempotent — skips matches already "encerrado", so
// it's safe to run on a schedule (install a clock trigger via
// installResultsSyncTrigger). Returns a { updated, unmatched } summary, or null
// when the token is missing / the API call fails. Manual /resultado still works
// as an override. Requires Script Property FOOTBALL_DATA_TOKEN.
function syncResults() {
  const token = PropertiesService.getScriptProperties().getProperty("FOOTBALL_DATA_TOKEN");
  if (!token) {
    Logger.log("syncResults: FOOTBALL_DATA_TOKEN ausente nas Script Properties");
    return null;
  }

  const response = UrlFetchApp.fetch(
    "https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED",
    { headers: { "X-Auth-Token": token }, muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) {
    Logger.log("syncResults: API " + response.getResponseCode() + " " + response.getContentText().slice(0, 300));
    return null;
  }

  const apiMatches = JSON.parse(response.getContentText()).matches || [];
  const plan = planResultUpdates(apiMatches, readMatches());

  plan.updates.forEach((u) => {
    recordMatchResult(u.match, u.homeGoals, u.awayGoals);
    gradePredictions(u.match, { homeGoals: u.homeGoals, awayGoals: u.awayGoals });
  });

  Logger.log(
    "syncResults: " + plan.updates.length + " atualizados; não casados: " +
    (plan.unmatched.join("; ") || "nenhum")
  );
  return { updated: plan.updates.length, unmatched: plan.unmatched };
}

// Run ONCE from the Apps Script editor to schedule syncResults() every 30 min.
// Removes any previous syncResults trigger first, so it's safe to re-run.
function installResultsSyncTrigger() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === "syncResults") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("syncResults").timeBased().everyMinutes(30).create();
}

// /sincronizar (admins only) -> forces a results sync now and reports back.
// Handy to confirm the token/integration without waiting for the trigger.
function handleSyncResults(e) {
  const user = getUserByIdentifier(e.parameter.From || "");
  if (!user) return MSG_NOT_REGISTERED;
  if (!isAdmin(user)) return "🔒 Só admins podem sincronizar resultados.";

  const summary = syncResults();
  if (!summary) {
    return "⚠️ Não consegui sincronizar (token ausente ou API fora). Confira o FOOTBALL_DATA_TOKEN e os logs.";
  }

  let msg = `🔄 Sincronizado: ${summary.updated} jogo${summary.updated === 1 ? "" : "s"} apurado${summary.updated === 1 ? "" : "s"}.`;
  if (summary.unmatched.length) {
    msg += `\n⚠️ Sem correspondência (lance no /resultado): ${summary.unmatched.join("; ")}`;
  }
  return msg;
}

// /bolao-regras -> explains the player commands and the scoring rules. Points
// are read from BOLAO_SCORING so this stays in sync if the config changes.
function handleBolaoRules() {
  const exact = BOLAO_SCORING.EXACT;
  const winner = BOLAO_SCORING.WINNER;
  const mult = BOLAO_SCORING.TRAINED_MULTIPLIER;

  let text = "⚽ *Bolão da Copa — Regras*\n";
  text += "━━━━━━━━━━━━━━━━━━\n\n";

  text += "🎯 *Pontuação*\n";
  text += `• Placar exato: *${exact} pts* (${exact * mult} se você treinou no dia do jogo)\n`;
  text += `• Só o vencedor/empate, placar errado: *${winner} pts* (${winner * mult} se treinou)\n`;
  text += "• Errou o resultado: *0 pts*\n";
  text += `🏋️ Treinar no dia do jogo *dobra (×${mult})* os seus pontos daquele jogo!\n\n`;

  text += "📋 *Comandos*\n";
  text += "• /jogos\n  Jogos de hoje e amanhã, com as siglas dos times.\n\n";
  text += "• /palpite BRAxSUI 2x1\n  Registra seu palpite (vale até o início do jogo; pode atualizar até lá).\n\n";
  text += "• /meuspalpites\n  Seus palpites e os pontos de cada um.\n\n";
  text += "• /bolao\n  Ranking do bolão (desempate por nº de placares exatos).\n\n";
  text += "• /bolao-regras\n  Mostra esta mensagem.";

  return text.trim();
}
