/**
 * Pure functions (no I/O) — unit-testable. Functional core.
 */

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

// Given an array of workout dates, returns the total of unique trained days
// and the longest streak of consecutive days. Same tiebreak logic used in
// computeRankingMetricsWithAB (total and, on a tie, streak).
function computeTotalAndStreak(dates) {
  const uniqueDays = Array.from(
    new Set(dates.map(d =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString()
    ))
  ).map(s => new Date(s)).sort((a, b) => a - b);

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

  return { total: uniqueDays.length, streak: maiorSeq };
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
