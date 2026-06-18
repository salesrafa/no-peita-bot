/**
 * World Cup pool ("bolão da Copa") — pure functions (no I/O). Functional core.
 *
 * People predict match scores with /palpite; the points only count if they
 * worked out on the match day (the workout gate lives in the imperative shell,
 * applied when the result is graded). These helpers parse the /palpite command,
 * decide whether predictions are still open and render the /jogos listing.
 */

// Parses a "/palpite BRAxSUI 2x1" body into a structured prediction.
// Tolerates optional spaces and x/X/× as the team separator, and x/X/×/:/- in
// the score. Returns { home, away, homeGoals, awayGoals } (teams upper-cased)
// or null when the body doesn't match the expected shape.
function parsePrediction(body) {
  const text = String(body || "").trim();
  const m = text.match(
    /^\/palpite\s+([A-Za-z]{2,4})\s*[xX×]\s*([A-Za-z]{2,4})\s+(\d{1,2})\s*[xX×:-]\s*(\d{1,2})\s*$/
  );
  if (!m) return null;
  return {
    home: m[1].toUpperCase(),
    away: m[2].toUpperCase(),
    homeGoals: parseInt(m[3], 10),
    awayGoals: parseInt(m[4], 10),
  };
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
