/**
 * Pure functions (no I/O) — unit-testable. Functional core.
 */

function formatRanking(ranking, title, showAnimal) {
  if (ranking.length === 0) {
    return "📊 Nenhum treino encontrado no período.";
  }

  let text = `📊 *${title}*\n\n`;

  ranking.forEach(r => {
    const medal =
      r.rank === 1 ? "🥇 " :
      r.rank === 2 ? "🥈 " :
      r.rank === 3 ? "🥉 " : "";

    // Animal badge only on monthly rankings (the tier is a fixed monthly goal).
    const animal = showAnimal ? ` ${classifyAnimal(r.total).current.emoji}` : "";

    text += `${r.rank} - ${medal}*${r.name}* - ${r.total} treino(s) - 🔥 ${r.streak}${animal}\n`;
  });

  let result = text.trim();

  // Animal hint only when badges are shown (monthly rankings).
  // Deliberately neutral emoji — doesn't reveal the secret top animal.
  if (showAnimal) {
    result += `\n\n🐾 Use /eu para entender seu bicho do mês.`;
  }

  return result;
}

function formatWrappedChampions(list) {
  if (!list || list.length === 0) {
    return "📅 *Campeões do ano*\n\nNenhum campeão registrado.";
  }

  let text = `📅 *Campeões do ano*\n\n`;

  list.forEach(item => {
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

// Text progress bar of 10 blocks (🟩 filled, ⬜ empty).
function progressBar(value, total) {
  const blocks = 10;
  const frac = total > 0 ? value / total : 0;
  let filled = Math.round(frac * blocks);
  if (filled < 0) filled = 0;
  if (filled > blocks) filled = blocks;
  return "🟩".repeat(filled) + "⬜".repeat(blocks - filled);
}

// Emoji for a ticket status. The 3 possible statuses are: pendente,
// finalizado and ignorado.
function ticketStatusEmoji(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "finalizado") return "✅";
  if (s === "ignorado") return "🚫";
  return "⏳"; // pendente (default)
}
