/**
 * Pure functions (no I/O) — unit-testable. Functional core.
 */

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

function daysBetween(d1, d2) {
  const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function getMonthNamePtBr(monthNumber) {
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return nomes[monthNumber];
}

function getPeriodFromMessage(body, now = new Date()) {
  const text = (body || "").trim();
  const parts = text.split(/\s+/);

  const today = new Date(now); // copy so we don't mutate the argument
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

function getPeriodByYear(body, now = new Date()) {
  const text = (body || "").trim();
  const parts = text.split(/\s+/);

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
