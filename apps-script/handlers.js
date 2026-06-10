function handleWrapped(e) {
  const parts = (e.parameter.Body || "").trim().split(/\s+/);
  const year = parts[1] && /^\d{4}$/.test(parts[1])
    ? parseInt(parts[1], 10)
    : new Date().getFullYear();

  const championsByMonth = getChampionsByMonth(year);
  const rankingOlimpico = generateOlympicRankingByYear(year);

  if (championsByMonth.length === 0 && rankingOlimpico.length === 0) {
    return `📦 *Wrapped ${year}*\n\nNenhum dado encontrado para este ano.`;
  }

  let text = `📦 *Wrapped ${year}*\n`;
  text += `━━━━━━━━━━━━━━━\n\n`;

  text += formatWrappedChampions(championsByMonth);
  text += `\n\n`;
  text += formatWrappedOlympics(rankingOlimpico);

  return text.trim();
}

function handleYearRankingChart(e) {
  const { start, end, label } = getPeriodByYear(e.parameter.Body);

  const ranking = generateRankingForPeriod(start, end);

  if (ranking.length === 0) {
    return "📊 Nenhum dado para gerar gráfico.";
  }

  const url = generateRankingChart(ranking, label);

  return (
    `📊 *${label} — Gráfico*\n\n` +
    `Top ${Math.min(10, ranking.length)} atletas:\n` +
    `${url}`
  );
}

function handleYearRanking(e) {
  const { start, end, label } = getPeriodByYear(e.parameter.Body);

  const ranking = generateRankingForPeriod(start, end);

  return formatRanking(ranking, label);
}

function handleOlympicsRanking(e) {
  const parts = (e.parameter.Body || "").trim().split(/\s+/);
  const year = parts[1] && /^\d{4}$/.test(parts[1])
    ? parseInt(parts[1], 10)
    : new Date().getFullYear();

  // O quadro de medalhas considera apenas meses ja finalizados (ver getChampionsByMonth).
  const ranking = generateOlympicRankingByYear(year);

  let text = `🏅 *Quadro de Medalhas ${year}*\n`;
  text += `_(apenas meses já finalizados)_\n`;
  text += `━━━━━━━━━━━━━━━\n\n`;

  if (!ranking || ranking.length === 0) {
    text += "Nenhuma medalha registrada ainda.";
    return text;
  }

  ranking.forEach((r, index) => {
    text +=
      `${index + 1} - *${r.name}*  ` +
      `🥇 ${r.gold}  🥈 ${r.silver}  🥉 ${r.bronze}\n`;
  });

  return text.trim();
}

function handleTicketStatus(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TICKETS);

  if (!sheet || sheet.getLastRow() <= 1) {
    return "❌ Nenhum ticket encontrado.";
  }

  const identifier = e.parameter.From;
  const name = getUserName(identifier);

  if (!name) {
    return "❌ Você precisa estar cadastrado para consultar tickets. Use /cadastro Seu Nome";
  }

  const message = e.parameter.Body.trim();
  const parts = message.split(" ");

  if (parts.length < 2) {
    return "❌ Você precisa informar o ID do ticket.\nExemplo: /ticketstatus 3";
  }

  const searchedId = parseInt(parts[1], 10);
  if (isNaN(searchedId)) {
    return "❌ ID do ticket inválido. Use: /ticketstatus 3";
  }

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const [_, rowName, id, msg, status] = rows[i];
    if (id === searchedId) {
      return `🎫 *Ticket #${id}*\n👤 Aberto por: ${rowName}\n📝 Mensagem: ${msg}\n📌 Status: *${status}*`;
    }
  }

  return `❌ Ticket #${searchedId} não encontrado.`;
}

function handleTicket(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TICKETS) || ss.insertSheet(SHEETS.TICKETS);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["numero", "nome", "id", "mensagem", "status"]);
  }

  const identifier = e.parameter.From;
  const user = getUserByIdentifier(identifier);
  // const name = getUserName(identifier);

  if (!user) {
    return MSG_NOT_REGISTERED;
  }

  const name = user.name;
  const number = user.number;

  const fullMessage = e.parameter.Body.trim();
  const message = fullMessage.replace(/^\/ticket\s*/i, "").trim();

  if (!message) {
    return "❌ Você precisa escrever uma mensagem após o comando /ticket.\nExemplo: /ticket gostaria de sugerir uma funcionalidade";
  }

  const lastId = sheet.getLastRow() > 1
    ? sheet.getRange(sheet.getLastRow(), 3).getValue()
    : 0;
  const newId = lastId + 1;

  sheet.appendRow([number, name, newId, message, "pendente"]);

  return `✅ Ticket #${newId} criado com sucesso!\nMensagem: "${message}"\nStatus: pendente`;
}

// Lists ALL of the user's own tickets (any status: pendente, finalizado,
// ignorado). Each one shows its current status.
function handleMyTickets(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.TICKETS);

  const user = getUserByIdentifier(e.parameter.From || "");
  if (!user) {
    return MSG_NOT_REGISTERED;
  }
  if (!sheet || sheet.getLastRow() <= 1) {
    return "🎫 Você ainda não abriu nenhum ticket.\nUse: /ticket sua mensagem";
  }

  const meuUuid = user.uuid || user.whatsappId;
  const maps = getIdentityMaps();

  const rows = sheet.getDataRange().getValues();
  const mine = [];
  for (let i = 1; i < rows.length; i++) {
    const [num, rowName, id, msg, status] = rows[i];
    if (!id) continue;
    // resolve the ticket owner (number→uuid, with name fallback)
    if (resolveWorkoutUuid(num, rowName, maps) !== meuUuid) continue;
    mine.push({ id, msg, status });
  }

  if (mine.length === 0) {
    return "🎫 Você ainda não abriu nenhum ticket.\nUse: /ticket sua mensagem";
  }

  mine.sort((a, b) => Number(a.id) - Number(b.id));

  let response = `🎫 *Seus tickets (${mine.length}):*\n`;
  mine.forEach(t => {
    let msg = String(t.msg || "").trim();
    if (msg.length > 60) msg = msg.slice(0, 57) + "...";
    response += `#${t.id} ${ticketStatusEmoji(t.status)} ${t.status} — "${msg}"\n`;
  });

  return response.trim();
}

function handleToday() {
  const hojeStr = formatDate(new Date()); // formato dd/MM/yyyy

  // Dedup by canonical uuid, not by name: that way two users with the same
  // name count as different people. The displayed name is the one stored on
  // the workout row.
  const trainedToday = new Map(); // uuid -> name

  readWorkouts().forEach(t => {
    if (formatDate(t.date) === hojeStr) {
      trainedToday.set(t.uuid, t.name);
    }
  });

  if (trainedToday.size === 0) {
    return "🕒 Ninguém registrou treino hoje ainda.\nBora ser o primeiro? 💪";
  }

  let response = `✅ *Treinos de hoje (${hojeStr}):*\n`;
  [...trainedToday.values()].sort().forEach(name => {
    response += `- ${name}\n`;
  });

  return response.trim();
}

function handleMysteryRanking() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fullMoonSheet = ss.getSheetByName(SHEETS.FULL_MOON);

  const today = new Date();

  // === VALID DATES (full moon + odd day): past ones count; future ones become "next"
  const fullMoonRows = fullMoonSheet.getDataRange().getValues();
  const validDates = [];   // dd/MM/yyyy already in the past
  const futureDates = [];   // { raw, formatted }

  for (let i = 1; i < fullMoonRows.length; i++) {
    const dateObj = fullMoonRows[i][2];
    if (!dateObj) continue;

    const date = typeof dateObj === "string"
      ? Utilities.parseDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy")
      : new Date(dateObj);

    if (date.getDate() % 2 !== 1) continue; // odd days only

    const formatted = formatDate(date);
    if (date <= today) {
      validDates.push(formatted);
    } else {
      futureDates.push({ raw: date, formatted });
    }
  }

  // === RANKING: delegate counting to generateRankingForPeriod, keeping
  // only the workouts whose dates are in the list of valid dates.
  const validDatesSet = new Set(validDates);
  const start = new Date(2000, 0, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const ranking = generateRankingForPeriod(
    start,
    end,
    (date) => validDatesSet.has(formatDate(date))
  );

  // === BUILD RESPONSE
  let response = "🌕 *Ranking Misterioso* (dias ímpares com Lua Cheia)\n\n";

  if (validDates.length > 0) {
    response += "🗓️ *Datas válidas anteriores:*\n";
    response += validDates.join(", ") + "\n\n";
  } else {
    response += "⚠️ Nenhuma data válida disponível no cache.\n\n";
  }

  if (ranking.length === 0) {
    response += "Ninguém pontuou nessas datas ainda.";
  } else {
    ranking.forEach((r, i) => {
      response += `${i + 1}. ${r.name} - ${r.total} ponto${r.total > 1 ? 's' : ''}\n`;
    });
  }

  // === NEXT MYSTERY DATE
  futureDates.sort((a, b) => a.raw - b.raw);
  if (futureDates.length > 0) {
    response += `\n🔮 *Próxima data misteriosa:* ${futureDates[0].formatted}`;
  }

  return response.trim();
}

function handleChampions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const championsSheet = ss.getSheetByName(SHEETS.CHAMPIONS);

  const maps = getIdentityMaps();

  // 1. MANUAL WINS ('campeoes' sheet, keyed by uuid after the migration)
  const championRows = championsSheet.getDataRange().getValues();
  const nameByKey = getUuidToNameMap(); // uuid → name canônico
  const manualWins = {}; // uuid → count

  for (let i = 1; i < championRows.length; i++) {
    const [key, count] = championRows[i];
    if (!key || !count) continue;
    const uuid = resolveWorkoutUuid(key, "", maps);
    manualWins[uuid] = parseInt(count, 10);
  }

  // 2. AUTOMATIC WINS (ranking per month)
  const byMonthYear = {}; // "mm/yyyy" → { uuid: [datas] }

  readWorkouts(maps).forEach(t => {
    const key = `${("0" + (t.date.getMonth() + 1)).slice(-2)}/${t.date.getFullYear()}`;

    if (!byMonthYear[key]) byMonthYear[key] = {};
    if (!byMonthYear[key][t.uuid]) byMonthYear[key][t.uuid] = [];

    byMonthYear[key][t.uuid].push(t.date);
    if (!nameByKey[t.uuid] && t.name) nameByKey[t.uuid] = t.name;
  });

  const generatedWins = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // for each finished month, pick the champion(s)
  Object.entries(byMonthYear).forEach(([mesAno, athletes]) => {
    const [monthStr, anoStr] = mesAno.split("/");
    const month = parseInt(monthStr, 10) - 1;
    const year = parseInt(anoStr, 10);

    // skip the current month
    if (month === currentMonth && year === currentYear) return;

    // per-athlete metrics: unique trained days + longest streak
    const metricas = Object.entries(athletes).map(([number, dates]) => {
      const { total, streak } = computeTotalAndStreak(dates);
      return { number, total, streak };
    });

    // sort by total and, on a tie, by streak
    metricas.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.streak - a.streak;
    });

    // month champion(s): everyone tied on total AND streak with the top
    const topo = metricas[0];
    const monthChampions = metricas.filter(m =>
      m.total === topo.total && m.streak === topo.streak
    );

    monthChampions.forEach(({ number }) => {
      if (!generatedWins[number]) generatedWins[number] = 0;
      generatedWins[number]++;
    });
  });

  // 3. SOMAR TUDO (chaves = uuid)
  const totalByKey = {};

  const allKeys = new Set([
    ...Object.keys(manualWins),
    ...Object.keys(generatedWins)
  ]);

  allKeys.forEach(number => {
    const manual = manualWins[number] || 0;
    const gerado = generatedWins[number] || 0;
    const total = manual + gerado;
    if (total > 0) totalByKey[number] = total;
  });

  if (Object.keys(totalByKey).length === 0) {
    return "🏆 Ainda não há campeões registrados.";
  }

  const ranking = Object.entries(totalByKey)
    .sort((a, b) => b[1] - a[1]);

  let response = "🏆 *Campeões:*\n";
  ranking.forEach(([number, total], index) => {
    const name = nameByKey[number] || `(${number})`;
    const trofeus = "🏆".repeat(total);
    response += `${index + 1}. ${name} - ${trofeus}\n`;
  });

  return response.trim();
}

function logMessage(e, command) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const messagesSheet = ss.getSheetByName(SHEETS.MESSAGES);

  const identifier = e.parameter.From || "";
  const message = e.parameter.Body || "";
  const timestamp = new Date();

  const name = getUserName(identifier);

  messagesSheet.appendRow([
    identifier,
    name ? name : 'Não Cadastrado',
    message,
    Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss"),
    command
  ]);
}

function handleRegister(e) {
  const identifier = e.parameter.From || "";
  const existingName = getUserName(identifier);

  if (existingName) {
    return `✅ Você já está cadastrado ${existingName}!`;
  }
  const message = e.parameter.Body || "";
  const timestamp = new Date();

  if (!message.toLowerCase().startsWith("/cadastro ")) {
    return "❓ Use: /cadastro Seu Nome";
  }

  const name = message.substring(10).trim();
  const uuid = Utilities.getUuid(); // stable internal identity
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.USERS);
  // Columns: A id_whatsapp | B name | C date | D role | E number | F uuid
  sheet.appendRow([identifier, name, timestamp, "", "", uuid]);
  return `✅ Cadastro realizado com sucesso, ${name}!`;
}

function handleScore(e) {
  const identifier = e.parameter.From;
  const today = new Date();

  const user = getUserByIdentifier(identifier);
  if (!user) {
    return "❌ Usuário não encontrado. Use /cadastro Seu Nome.";
  }

  if (workedOutOnDate(identifier, today)) {
    return "⚠️ Você já registrou um treino hoje.";
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.WORKOUTS);
  // col D = WhatsApp message id (to delete later by quoting the message)
  sheet.appendRow([user.uuid || user.whatsappId, user.name, today, e.parameter.MsgId || ""]);

  return "✅ Treino registrado com sucesso!";
}

function handleRanking(e) {
  const { start, end, label, type } = getPeriodFromMessage(e.parameter.Body);

  const ranking = generateRankingForPeriod(start, end);

  // show the animal badge only on monthly rankings (not on date ranges)
  return formatRanking(ranking, label, type === "mes");
}

function handleBackdate(e) {
  const identifier = e.parameter.From;
  const parts = (e.parameter.Body || "").trim().split(/\s+/);

  if (parts.length !== 2) {
    return "❌ Use: /retroativo DD/MM/AAAA";
  }

  const date = parseBrDate(parts[1], true);
  if (!date) {
    return "❌ Data inválida. Use DD/MM/AAAA.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date.getTime() > today.getTime()) {
    return "❌ Não dá pra registrar treino em data futura.";
  }

  const LIMITE_DIAS_RETROATIVO = 10;
  const limiteMinimo = new Date(today);
  limiteMinimo.setDate(limiteMinimo.getDate() - LIMITE_DIAS_RETROATIVO);
  if (date.getTime() < limiteMinimo.getTime()) {
    return `❌ Só dá pra registrar treino retroativo de até ${LIMITE_DIAS_RETROATIVO} dias atrás.`;
  }

  const user = getUserByIdentifier(identifier);
  if (!user) {
    return "❌ Usuário não encontrado. Use /cadastro Seu Nome.";
  }

  if (workedOutOnDate(identifier, date)) {
    return "⚠️ Você já registrou um treino nessa data.";
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.WORKOUTS);
  // col D = WhatsApp message id (to delete later by quoting the message)
  sheet.appendRow([user.uuid || user.whatsappId, user.name, date, e.parameter.MsgId || ""]);

  return `✅ Treino registrado em ${Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "dd/MM/yyyy"
  )}.`;
}

function handleMe(e) {
  const identifier = e.parameter.From || "";
  const user = getUserByIdentifier(identifier);

  if (!user) {
    return MSG_NOT_REGISTERED;
  }
  const uuidUsuario = user.uuid || user.whatsappId;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const dates = readWorkouts()
    .filter(t =>
      t.uuid === uuidUsuario &&
      t.date.getMonth() === currentMonth &&
      t.date.getFullYear() === currentYear
    )
    .map(t => formatDate(t.date))
    .sort();

  const monthName = getMonthNamePtBr(currentMonth);
  const total = dates.length;
  const { current, next, remaining } = classifyAnimal(total);

  // Animal badge (individual monthly tier) + incentive toward the next level
  let response = `${current.emoji} *${current.name}*\n`;
  response += `${total} treino${total === 1 ? "" : "s"} em ${monthName} — ${current.vibe}!\n`;
  if (next) {
    if (next.secret) {
      // don't reveal the legendary top animal — keep it a surprise
      response += `Faltam ${remaining} treino${remaining === 1 ? "" : "s"} pra um bicho lendário... 👀\n`;
    } else {
      response += `Faltam ${remaining} treino${remaining === 1 ? "" : "s"} pra virar ${next.emoji} ${next.name}.\n`;
    }
  }

  if (total > 0) {
    response += `\n📆 Seus treinos em ${monthName}:\n`;
    dates.forEach(date => response += `- ${date}\n`);
  }

  return response.trim();
}

// Default annual goal (workouts in the year) when the person hasn't set one.
// Adjustable here; each user can override it with /meta N.
const DEFAULT_ANNUAL_GOAL = 150;

// /meta        -> shows annual goal progress (with bar and projection)
// /meta 200    -> sets the personal annual goal for the current year ("metas" sheet)
function handleGoal(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const user = getUserByIdentifier(e.parameter.From || "");
  if (!user) {
    return MSG_NOT_REGISTERED;
  }

  const parts = (e.parameter.Body || "").trim().split(/\s+/);

  // /meta N -> set the personal goal
  if (parts.length >= 2) {
    const nova = parseInt(parts[1], 10);
    if (isNaN(nova) || nova <= 0) {
      return "❌ Meta inválida. Informe um número positivo. Ex.: /meta 150";
    }
    if (nova > 366) {
      return "❌ A meta não pode passar de 366 — só dá pra treinar 1x por dia. Ex.: /meta 150";
    }
    const year = new Date().getFullYear();
    setAnnualGoal(user.uuid || user.whatsappId, year, nova);
    return `✅ Meta anual de ${year} definida: *${nova}* treinos.\nUse /meta para ver seu progresso.`;
  }

  // /meta -> show progress
  const now = new Date();
  const year = now.getFullYear();
  const goalInfo = getAnnualGoal(user.uuid || user.whatsappId, year);
  const meta = goalInfo ? goalInfo.value : DEFAULT_ANNUAL_GOAL;
  const herdada = goalInfo && goalInfo.year < year; // meta veio de um ano anterior
  const total = countWorkoutsInYear(user.uuid || user.whatsappId, year);

  const pct = Math.round((total / meta) * 100);
  const barra = progressBar(total, meta);

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  const umDia = 24 * 60 * 60 * 1000;
  const dayOfYear = Math.max(1, Math.floor((now - yearStart) / umDia) + 1);
  const daysInYear = Math.round((yearEnd - yearStart) / umDia) + 1;
  const daysLeft = Math.max(0, daysInYear - dayOfYear);

  let response = `🎯 *Meta anual ${year}*\n`;
  response += `👟 ${total} / ${meta} treinos (${pct}%)\n`;
  response += `${barra}\n`;
  response += `📅 Faltam ${daysLeft} dia${daysLeft === 1 ? "" : "s"}\n`;

  if (total >= meta) {
    response += `🏆 Meta batida! Bora aumentar? (/meta N)`;
  } else {
    const ritmo = total / dayOfYear; // treinos por dia até agora
    const projetado = Math.round(total + ritmo * daysLeft);
    if (projetado >= meta) {
      response += `📈 No ritmo atual você fecha o ano em ~${projetado} — vai bater! 🎉`;
    } else {
      const restante = meta - total;
      const semanas = Math.max(1, daysLeft / 7);
      const porSemana = Math.ceil(restante / semanas);
      response += `📉 No ritmo atual fecha em ~${projetado}. ` +
        `Faltam ${restante} treinos — ~${porSemana}/semana pra alcançar.`;
    }
  }

  if (herdada) {
    response += `\n\nℹ️ Meta herdada de ${goalInfo.year} — defina a de ${year} com /meta N`;
  }

  return response.trim();
}

// Counts the unique trained days for a user (uuid) in a year.
// Per-day dedup is redundant (the bot already limits 1/day) but guards against
// any legacy duplicates. Does not include pre-bot rows (treinos-AB, 2025).
function countWorkoutsInYear(uuidUsuario, year) {
  const days = {};
  readWorkouts().forEach(t => {
    if (t.uuid !== uuidUsuario) return;
    if (t.date.getFullYear() !== year) return;
    days[`${t.date.getMonth()}-${t.date.getDate()}`] = true;
  });
  return Object.keys(days).length;
}

// "metas" sheet: one row per (uuid, year). Keeps the history of annual goals
// without bloating the "usuarios" sheet — a new year is just a new row.
// Columns: A uuid | B year | C goal
function getGoalsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.GOALS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.GOALS);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["uuid", "ano", "meta"]);
  }
  return sheet;
}

// Returns the effective goal for a user in a year: the year's own goal if it
// exists; otherwise inherits the most recent prior year's goal. Returns
// { value, year } of the found goal (year < target means inherited), or null.
function getAnnualGoal(uuid, year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.GOALS);
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const rows = sheet.getDataRange().getValues();
  let melhor = null; // { value, ano } com o maior ano <= alvo
  for (let i = 1; i < rows.length; i++) {
    const [u, a, m] = rows[i];
    if (String(u).trim() !== String(uuid).trim()) continue;
    const rowYear = Number(a);
    const value = parseInt(m, 10);
    if (isNaN(rowYear) || isNaN(value) || value <= 0) continue;
    if (rowYear > year) continue; // ignora metas de anos futuros
    if (!melhor || rowYear > melhor.year) melhor = { value: value, year: rowYear };
  }
  return melhor;
}

// Sets (upsert) a user's goal for a year.
function setAnnualGoal(uuid, year, value) {
  const sheet = getGoalsSheet();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const [u, a] = rows[i];
    if (String(u).trim() === String(uuid).trim() && Number(a) === Number(year)) {
      sheet.getRange(i + 1, 3).setValue(value); // column C = goal
      return;
    }
  }
  sheet.appendRow([uuid, year, value]);
}

// /apagar (admins only): deletes a workout. The admin must REPLY (quote) the
// workout's /pontuar message; Node sends that message id in QuotedMsgId, and
// we find the row in "treinos" with that id (column D).
function handleDeleteWorkout(e) {
  const user = getUserByIdentifier(e.parameter.From || "");
  if (!user) {
    return MSG_NOT_REGISTERED;
  }
  if (!isAdmin(user)) {
    return "🔒 Só admins podem apagar treinos.";
  }

  const quotedId = String(e.parameter.QuotedMsgId || "").trim();
  if (!quotedId) {
    return "↩️ Para apagar, *responda* (cite) a mensagem de /pontuar do treino e mande /apagar.";
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.WORKOUTS);
  if (!sheet || sheet.getLastRow() <= 1) {
    return "❌ Nenhum treino encontrado.";
  }

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][WORKOUT_COL.MSG_ID] || "").trim() !== quotedId) continue;

    const name = rows[i][WORKOUT_COL.NAME];
    const date = rows[i][WORKOUT_COL.DATE];
    const dateFmt = date
      ? formatDate(new Date(date))
      : "?";
    sheet.deleteRow(i + 1);
    return `🗑️ Treino de ${name} em ${dateFmt} apagado.`;
  }

  return "❌ Não achei um treino ligado a essa mensagem. Cite a mensagem de /pontuar original (a partir de agora os treinos guardam esse vínculo).";
}

function handleHelp() {
  let text = `🤖 *Ajuda — Comandos do Bot*\n`;
  text += `━━━━━━━━━━━━━━━━━━\n\n`;

  text += `🧍 *Cadastro*\n`;
  text += `• /cadastro Seu Nome\n`;
  text += `  Registra você no bot para poder usar os demais comandos.\n\n`;

  text += `🏋️ *Treinos*\n`;
  text += `• /pontuar\n`;
  text += `  Registra um treino no dia de hoje (apenas 1 por dia).\n\n`;

  text += `• /retroativo DD/MM/AAAA\n`;
  text += `  Registra um treino em uma data passada.\n\n`;

  text += `• /apagar (só admins)\n`;
  text += `  Responda a mensagem de /pontuar do treino e mande /apagar.\n\n`;

  text += `• /hoje\n`;
  text += `  Mostra quem já treinou hoje.\n\n`;

  text += `• /eu\n`;
  text += `  Mostra seu bicho do mês 🐾 e lista seus treinos.\n\n`;

  text += `🎯 *Meta anual*\n`;
  text += `• /meta\n`;
  text += `  Mostra o progresso da sua meta anual de treinos.\n\n`;

  text += `• /meta NÚMERO\n`;
  text += `  Define a sua meta anual (ex.: /meta 150).\n\n`;

  text += `📊 *Rankings*\n`;
  text += `• /ranking\n`;
  text += `  Ranking do mês atual.\n\n`;

  text += `• /ranking MM/AAAA\n`;
  text += `  Ranking de um mês específico.\n\n`;

  text += `• /ranking DD/MM/AAAA DD/MM/AAAA\n`;
  text += `  Ranking por intervalo de datas.\n\n`;

  text += `• /rankingano\n`;
  text += `  Ranking do ano atual.\n\n`;

  text += `• /rankingano AAAA\n`;
  text += `  Ranking de um ano específico.\n\n`;

  text += `• /anografico\n`;
  text += `  Gráfico com o top 10 atletas do ano atual.\n\n`;

  text += `• /anografico AAAA\n`;
  text += `  Gráfico com o top 10 atletas de um ano específico.\n\n`;

  text += `• /rankingmisterioso\n`;
  text += `  Ranking considerando apenas treinos em dias ímpares com lua cheia 🌕.\n\n`;

  text += `🐾 *Bicho do mês*\n`;
  text += `  Classificação individual (sem competir com ninguém): seu bicho\n`;
  text += `  evolui conforme seus treinos no mês, começando no 🥚 Ovo.\n`;
  text += `  Tem bicho lendário escondido pra quem chegar lá 👀\n`;
  text += `  Aparece no /ranking e em detalhe no /eu.\n\n`;

  text += `🏆 *Campeões & Medalhas*\n`;
  text += `• /campeoes\n`;
  text += `  Ranking de campeões mensais acumulados.\n\n`;

  text += `• /rankingolimpiada\n`;
  text += `  Quadro de medalhas do ano atual (🥇🥈🥉), só com meses já finalizados.\n\n`;

  text += `• /rankingolimpiada AAAA\n`;
  text += `  Quadro de medalhas de um ano específico.\n\n`;

  text += `📦 *Wrapped*\n`;
  text += `• /wrapped\n`;
  text += `  Resumo completo do ano atual.\n\n`;

  text += `• /wrapped AAAA\n`;
  text += `  Resumo completo de um ano específico.\n\n`;

  text += `🎫 *Tickets*\n`;
  text += `• /ticket sua mensagem\n`;
  text += `  Abre um ticket com sugestão ou solicitação.\n\n`;

  text += `• /tickets\n`;
  text += `  Lista todos os seus tickets e o status de cada um.\n\n`;

  text += `• /ticketstatus ID\n`;
  text += `  Consulta o status de um ticket específico.\n\n`;

  text += `❓ *Ajuda*\n`;
  text += `• /ajuda\n`;
  text += `  Mostra esta mensagem.\n\n`;

  text += `ℹ️ *Observações*\n`;
  text += `• Alguns comandos podem exigir cadastro prévio.\n`;
  text += `• Rankings consideram empates corretamente.\n`;
  text += `• Sequência é baseada em dias consecutivos de treino.\n`;

  return text.trim();
}
