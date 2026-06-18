/**
 * World Cup pool ("bolão da Copa") — pure functions (no I/O). Functional core.
 *
 * People predict match scores with /palpite; the points only count if they
 * worked out on the match day (the workout gate lives in the imperative shell,
 * applied when the result is graded). These helpers parse the /palpite command,
 * decide whether predictions are still open and render the /jogos listing.
 */

// Points awarded per prediction outcome (single source of truth — tweak here).
// The workout multiplier is applied on top when the person trained on match day.
const BOLAO_SCORING = { EXACT: 4, WINNER: 2, WRONG: 0, TRAINED_MULTIPLIER: 2 };

// Parses a "/<command> BRAxSUI 2x1" body into { home, away, homeGoals, awayGoals }.
// Tolerates optional spaces and x/X/× as the team separator, and x/X/×/:/- in
// the score. Teams are upper-cased. Returns null when it doesn't match.
function parseScoreCommand(body, command) {
  const text = String(body || "").trim();
  const re = new RegExp(
    "^/" + command +
    "\\s+([A-Za-z]{2,4})\\s*[xX×]\\s*([A-Za-z]{2,4})" +
    "\\s+(\\d{1,2})\\s*[xX×:-]\\s*(\\d{1,2})\\s*$"
  );
  const m = text.match(re);
  if (!m) return null;
  return {
    home: m[1].toUpperCase(),
    away: m[2].toUpperCase(),
    homeGoals: parseInt(m[3], 10),
    awayGoals: parseInt(m[4], 10),
  };
}

// Parses "/palpite BRAxSUI 2x1" (a prediction).
function parsePrediction(body) {
  return parseScoreCommand(body, "palpite");
}

// Parses "/resultado BRAxSUI 2x1" (a final score entered by an admin).
function parseResult(body) {
  return parseScoreCommand(body, "resultado");
}

// "home" | "away" | "draw" for a given score.
function matchOutcome(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return "home";
  if (homeGoals < awayGoals) return "away";
  return "draw";
}

// Base points for a prediction vs the actual result (before the workout
// multiplier): exact score, correct winner/draw, or wrong.
function scoreBasePoints(prediction, result) {
  const exact =
    prediction.homeGoals === result.homeGoals &&
    prediction.awayGoals === result.awayGoals;
  if (exact) return BOLAO_SCORING.EXACT;

  const sameOutcome =
    matchOutcome(prediction.homeGoals, prediction.awayGoals) ===
    matchOutcome(result.homeGoals, result.awayGoals);
  return sameOutcome ? BOLAO_SCORING.WINNER : BOLAO_SCORING.WRONG;
}

// Applies the workout gate: doubles the base when the person trained on the
// match day, otherwise keeps the base (0 stays 0 either way).
function applyTrainingMultiplier(basePoints, trained) {
  return basePoints * (trained ? BOLAO_SCORING.TRAINED_MULTIPLIER : 1);
}

// True while predictions are still open (the match hasn't kicked off yet).
function predictionsOpen(match, now) {
  return match.kickoff.getTime() > now.getTime();
}

// "13:00" from a kickoff Date (local time).
function formatKickoffTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Renders the /jogos listing for matches happening today and tomorrow.
// `matches` must already be filtered to today/tomorrow and sorted by kickoff.
function formatMatchList(matches, now) {
  const today = formatDate(now);
  const tomorrow = formatDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  );

  const line = (match) => {
    const closed = predictionsOpen(match, now) ? "" : "  ⛔ fechado";
    return `• ${match.home} x ${match.away} — ${formatKickoffTime(match.kickoff)}${closed}`;
  };

  const todays = matches.filter((m) => formatDate(m.kickoff) === today);
  const tomorrows = matches.filter((m) => formatDate(m.kickoff) === tomorrow);

  let text = "⚽ *Bolão da Copa*\n";
  if (todays.length) {
    text += `\n📅 *Hoje (${today.slice(0, 5)})*\n${todays.map(line).join("\n")}\n`;
  }
  if (tomorrows.length) {
    text += `\n📅 *Amanhã (${tomorrow.slice(0, 5)})*\n${tomorrows.map(line).join("\n")}\n`;
  }

  const example = matches[0] ? `${matches[0].home}x${matches[0].away}` : "BRAxSUI";
  text += `\n_Palpite assim:_ /palpite ${example} 2x1\n`;
  text += "_(vale até o início de cada jogo)_";
  return text.trim();
}

// Sorts pool standings: most points first, then most exact-score hits, then
// name. `entries` is an array of { name, points, exacts }.
function sortBolaoRanking(entries) {
  return entries.slice().sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exacts !== a.exacts) return b.exacts - a.exacts;
    return String(a.name).localeCompare(String(b.name));
  });
}

// Renders the /bolao standings. `entries` is { name, points, exacts }[].
function formatBolaoRanking(entries) {
  if (!entries || entries.length === 0) {
    return "🏆 *Bolão da Copa*\n\nNenhum palpite pontuado ainda. Os pontos saem quando os resultados forem lançados.";
  }

  const medals = ["🥇", "🥈", "🥉"];
  const ranked = sortBolaoRanking(entries);

  let text = "🏆 *Bolão da Copa — Ranking*\n";
  ranked.forEach((entry, index) => {
    const badge = medals[index] || `${index + 1}.`;
    const plural = entry.points === 1 ? "pt" : "pts";
    text += `\n${badge} *${entry.name}* — ${entry.points} ${plural}`;
    if (entry.exacts > 0) {
      text += `  (${entry.exacts} placar${entry.exacts === 1 ? "" : "es"} exato${entry.exacts === 1 ? "" : "s"} 🎯)`;
    }
  });
  return text.trim();
}
