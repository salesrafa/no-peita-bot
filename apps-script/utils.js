function formatarWrappedOlimpiada(ranking) {
  if (!ranking || ranking.length === 0) {
    return "🏅 *Quadro de medalhas*\n\nNenhuma medalha registrada.";
  }

  let texto = `🏅 *Quadro de medalhas*\n\n`;

  ranking.forEach((r, index) => {
    texto +=
      `${index + 1} - *${r.nome}*  ` +
      `🥇 ${r.ouro}  🥈 ${r.prata}  🥉 ${r.bronze}\n`;
  });

  return texto.trim();
}

function formatarWrappedCampeoes(lista) {
  if (!lista || lista.length === 0) {
    return "📅 *Campeões do ano*\n\nNenhum campeão registrado.";
  }

  let texto = `📅 *Campeões do ano*\n\n`;

  lista.forEach(item => {
    texto += `🗓️ *${item.mesNome}*\n`;

    if (item.ouro.length > 0) {
      texto += `🥇 ${item.ouro.join(", ")}\n`;
    }

    if (item.prata.length > 0) {
      texto += `🥈 ${item.prata.join(", ")}\n`;
    }

    if (item.bronze.length > 0) {
      texto += `🥉 ${item.bronze.join(", ")}\n`;
    }

    texto += `\n`;
  });

  return texto.trim();
}

function ordenarRankingOlimpico(medalhas) {
  return Object.values(medalhas).sort((a, b) => {
    if (b.ouro !== a.ouro) return b.ouro - a.ouro;
    if (b.prata !== a.prata) return b.prata - a.prata;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    return a.nome.localeCompare(b.nome);
  });
}

function inicializarAtleta(nome, medalhas) {
  if (!medalhas[nome]) {
    medalhas[nome] = {
      nome,
      ouro: 0,
      prata: 0,
      bronze: 0
    };
  }
}

function gerarRankingOlimpicoPorAno(ano) {
  const campeoesPorMes = getCampeoesPorMes(ano);
  const medalhas = {}; // nome -> contadores

  campeoesPorMes.forEach(mes => {
    mes.ouro.forEach(nome => {
      inicializarAtleta(nome, medalhas);
      medalhas[nome].ouro++;
    });

    mes.prata.forEach(nome => {
      inicializarAtleta(nome, medalhas);
      medalhas[nome].prata++;
    });

    mes.bronze.forEach(nome => {
      inicializarAtleta(nome, medalhas);
      medalhas[nome].bronze++;
    });
  });

  return ordenarRankingOlimpico(medalhas);
}

function getCampeoesPorMes(ano) {
  const resultado = [];
  const agora = new Date();

  for (let mes = 0; mes < 12; mes++) {
    const inicio = new Date(ano, mes, 1, 0, 0, 0, 0);
    const fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);

    // Considera apenas meses ja finalizados: o mes corrente (ainda em andamento)
    // e os meses futuros ficam de fora do quadro de medalhas/campeoes.
    if (fim.getTime() >= agora.getTime()) continue;

    const ranking = gerarRankingPorPeriodo(inicio, fim);
    if (!ranking || ranking.length === 0) continue;

    const ouro = ranking.filter(r => r.rank === 1).map(r => r.nome);
    const prata = ranking.filter(r => r.rank === 2).map(r => r.nome);
    const bronze = ranking.filter(r => r.rank === 3).map(r => r.nome);

    resultado.push({
      mes: mes + 1,
      mesNome: getNomeMesEmPortugues(mes),
      ouro,
      prata,
      bronze
    });
  }

  return resultado;
}

function gerarGraficoRanking(ranking, label) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetName = "grafico-ranking";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();

  // Cabeçalho
  sheet.getRange(1, 1, 1, 2).setValues([["Nome", "Treinos"]]);

  const top = ranking.slice(0, 10);
  const linhas = top.map(r => [r.nome, r.total]);
  sheet.getRange(2, 1, linhas.length, 2).setValues(linhas);

  // Remove gráficos antigos
  sheet.getCharts().forEach(c => sheet.removeChart(c));

  // Cria gráfico
  const chart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sheet.getRange(1, 1, linhas.length + 1, 2))
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

  // 🔓 TORNA O ARQUIVO PÚBLICO
  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  // 🔗 Retorna link acessível pelo WhatsApp
  return file.getUrl();
}

function getPeriodoPorAno(body) {
  const texto = (body || "").trim();
  const partes = texto.split(/\s+/);

  const agora = new Date();
  let ano = agora.getFullYear();

  // /rankingano 2025
  if (partes.length === 2 && /^\d{4}$/.test(partes[1])) {
    ano = parseInt(partes[1], 10);
  }

  const inicio = new Date(ano, 0, 1, 0, 0, 0, 0);
  const fim = new Date(ano, 11, 31, 23, 59, 59, 999);

  return {
    inicio,
    fim,
    label: `Ranking ${ano}`
  };
}

function getPeriodoPorMensagem(body) {
  const texto = (body || "").trim();
  const partes = texto.split(/\s+/);

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);

  // padrão: mês atual
  let inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  let fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
  let label = `${getNomeMesEmPortugues(hoje.getMonth())}/${hoje.getFullYear()}`;
  let tipo = "mes"; // "mes" (mês inteiro) | "intervalo" (range de datas)

  // /ranking MM/AAAA
  if (partes.length === 2 && /^\d{2}\/\d{4}$/.test(partes[1])) {
    const [mm, yyyy] = partes[1].split("/");
    const mes = parseInt(mm, 10) - 1;
    const ano = parseInt(yyyy, 10);

    inicio = new Date(ano, mes, 1);
    fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    label = `${getNomeMesEmPortugues(mes)}/${ano}`;
  }

  // /ranking DD/MM/AAAA DD/MM/AAAA
  if (
    partes.length === 3 &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(partes[1]) &&
    /^\d{2}\/\d{2}\/\d{4}$/.test(partes[2])
  ) {
    inicio = parseDataBR(partes[1], true);
    fim = parseDataBR(partes[2], false);
    label = `${partes[1]} → ${partes[2]}`;
    tipo = "intervalo";
  }

  return { inicio, fim, label, tipo };
}

// Classificação secundária, individual e não-comparativa: cada faixa exige um
// total fixo de treinos no mês. Reordenada do mais fraco ao lendário. O nível
// é só do desempenho da própria pessoa — não depende dos outros.
const BICHOS = [
  { min: 0,  emoji: "🥚", nome: "Ovo",       vibe: "ainda não chocou no mês" },
  { min: 1,  emoji: "🐔", nome: "Frango",    vibe: "tá começando!" },
  { min: 2,  emoji: "🐢", nome: "Tartaruga", vibe: "devagar, mas não parou" },
  { min: 3,  emoji: "🐰", nome: "Coelho",    vibe: "ligou o foguinho" },
  { min: 5,  emoji: "🐶", nome: "Cachorro",  vibe: "animado e fiel ao treino" },
  { min: 7,  emoji: "🦊", nome: "Raposa",    vibe: "esperto, achou o ritmo" },
  { min: 9,  emoji: "🐗", nome: "Javali",    vibe: "brutão, entrou com tudo" },
  { min: 12, emoji: "🐺", nome: "Lobo",      vibe: "entrou na alcateia" },
  { min: 15, emoji: "🐆", nome: "Onça",      vibe: "predador ágil" },
  { min: 18, emoji: "🐅", nome: "Tigre",     vibe: "fera de respeito" },
  { min: 21, emoji: "🐻", nome: "Urso",      vibe: "força bruta" },
  { min: 25, emoji: "🦁", nome: "Leão",      vibe: "rei do mês" },
  // secreto: nunca é antecipado (ajuda/aviso/“faltam X”); só aparece quando
  // alguém de fato o conquista — é a surpresa do topo.
  { min: 29, emoji: "🐉", nome: "Dragão",    vibe: "lendário, fora da curva", secreto: true },
];

// Dado o total de treinos no mês, retorna { atual, proximo, faltam }.
// proximo é null quando já se atingiu o topo (Dragão).
function classificarBicho(total) {
  const n = Number(total) || 0;
  let idx = 0;
  for (let i = 0; i < BICHOS.length; i++) {
    if (n >= BICHOS[i].min) idx = i; else break;
  }
  const atual = BICHOS[idx];
  const proximo = idx < BICHOS.length - 1 ? BICHOS[idx + 1] : null;
  const faltam = proximo ? proximo.min - n : 0;
  return { atual, proximo, faltam };
}

function formatarRanking(ranking, titulo, mostrarBicho) {
  if (ranking.length === 0) {
    return "📊 Nenhum treino encontrado no período.";
  }

  let texto = `📊 *${titulo}*\n\n`;

  ranking.forEach(r => {
    const medal =
      r.rank === 1 ? "🥇 " :
      r.rank === 2 ? "🥈 " :
      r.rank === 3 ? "🥉 " : "";

    // Selo do bicho só nos rankings mensais (faixa é meta mensal fixa).
    const bicho = mostrarBicho ? ` ${classificarBicho(r.total).atual.emoji}` : "";

    texto += `${r.rank} - ${medal}*${r.nome}* - ${r.total} treino(s) - 🔥 ${r.sequencia}${bicho}\n`;
  });

  let resultado = texto.trim();

  // Dica do bicho só quando os selos estão sendo exibidos (rankings mensais).
  // Emoji neutro de propósito — não revela o bicho secreto do topo.
  if (mostrarBicho) {
    resultado += `\n\n🐾 Use /eu para entender seu bicho do mês.`;
  }

  return resultado;
}

function aplicarColocacaoComEmpate(linhas) {
  let prevTotal = null;
  let prevSeq = null;
  let prevRank = 0;

  return linhas.map((item, index) => {
    let rank;
    if (item.total === prevTotal && item.sequencia === prevSeq) {
      rank = prevRank;
    } else {
      rank = index + 1;
    }

    prevTotal = item.total;
    prevSeq = item.sequencia;
    prevRank = rank;

    return {
      ...item,
      rank
    };
  });
}

// filtroDataFn (opcional): recebe a data de cada treino diario e devolve
// true/false para inclui-lo. Quando informado, os treinos agregados (AB,
// pre-bot) sao ignorados, pois sao totais mensais sem data por dia e nao
// dao para filtrar por dia (ex: ranking misterioso por datas de lua cheia).
function gerarRankingPorPeriodo(dataInicio, dataFim, filtroDataFn) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetAB = ss.getSheetByName(SHEETS.WORKOUTS_AB);
  const dadosAB = sheetAB ? sheetAB.getDataRange().getValues() : [];

  const mapas = getIdentityMaps();
  const uuidParaNome = getUuidToNameMap();

  const porPessoa = {}; // uuid -> { nome, datas: [], totalAB: number }

  // Garante o bucket de um uuid, resolvendo o nome canônico de exibição.
  function bucket(uuid, nomeFallback) {
    if (!porPessoa[uuid]) {
      porPessoa[uuid] = {
        nome: uuidParaNome[uuid] || nomeFallback || uuid,
        datas: [],
        totalAB: 0,
      };
    }
    return porPessoa[uuid];
  }

  // ---------- treinos diários (pós-bot) ----------
  readWorkouts(mapas).forEach(t => {
    if (t.date < dataInicio || t.date > dataFim) return;
    if (filtroDataFn && !filtroDataFn(t.date)) return;
    if (!t.uuid) return;

    bucket(t.uuid, t.name).datas.push(new Date(t.date));
  });

  // ---------- treinos agregados (pré-bot | SOMENTE 2025) ----------
  const ANO_AB = 2025;

  // só considera AB se o período tocar 2025 e não houver filtro por data
  // (totais mensais não têm data por dia para aplicar o filtro)
  if (
    !filtroDataFn &&
    dataInicio.getFullYear() <= ANO_AB &&
    dataFim.getFullYear() >= ANO_AB
  ) {
    for (let i = 1; i < dadosAB.length; i++) {
      const [nome, total, mes] = dadosAB[i];
      if (!nome || !total || !mes) continue;

      const inicioMes = new Date(ANO_AB, mes - 1, 1);
      const fimMes = new Date(ANO_AB, mes, 0, 23, 59, 59, 999);

      // mês fora do intervalo → ignora
      if (fimMes < dataInicio || inicioMes > dataFim) continue;

      // treinos-AB só têm nome; resolve por nome (fallback ao próprio nome).
      const uuid = mapas.byName[String(nome).trim()] || String(nome).trim();
      bucket(uuid, nome).totalAB += Number(total);
    }
  }

  return calcularMetricasRankingComAB(porPessoa);
}

function calcularMetricasRankingComAB(porPessoa) {
  const linhas = Object.entries(porPessoa).map(([uuid, info]) => {
    const nome = info.nome;
    const datas = info.datas;

    const diasUnicos = Array.from(
      new Set(datas.map(d =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString()
      ))
    ).map(s => new Date(s)).sort((a, b) => a - b);

    // sequência só com dados diários
    let maiorSeq = 0, atualSeq = 0, anterior = null;
    for (const d of diasUnicos) {
      if (anterior && diasEntreDatas(anterior, d) === 1) {
        atualSeq += 1;
      } else {
        atualSeq = 1;
      }
      maiorSeq = Math.max(maiorSeq, atualSeq);
      anterior = d;
    }

    return {
      nome,
      total: diasUnicos.length + info.totalAB,
      sequencia: maiorSeq
    };
  });

  linhas.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.sequencia !== a.sequencia) return b.sequencia - a.sequencia;
    return 0;
  });

  return aplicarColocacaoComEmpate(linhas);
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

// Resolves the canonical key (uuid) of a workout row. Uses the column-0 value
// (legacy id_whatsapp or uuid) and, as a fallback, the name (column 1) —
// needed for workouts whose old id_whatsapp no longer exists in "usuarios"
// and for the "treinos-AB" sheet (name only). If nothing matches, returns the
// raw value so the row isn't lost.
function resolveWorkoutUuid(col0Value, name, maps) {
  const key = String(col0Value || "").trim();
  if (maps.byKey[key]) return maps.byKey[key];
  const n = String(name || "").trim();
  if (n && maps.byName[n]) return maps.byName[n];
  return key || n;
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

function formatarData(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function getNomeMesEmPortugues(mesNumero) {
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return nomes[mesNumero];
}

function diasEntreDatas(d1, d2) {
  const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function parseDataBR(texto, inicioDoDia) {
  const [dd, mm, yyyy] = texto.split("/");
  const data = new Date(
    parseInt(yyyy, 10),
    parseInt(mm, 10) - 1,
    parseInt(dd, 10)
  );

  if (inicioDoDia) {
    data.setHours(0, 0, 0, 0);
  } else {
    data.setHours(23, 59, 59, 999);
  }

  return data;
}

function jaTreinouNaData(identificador, data) {
  const usuario = getUserByIdentifier(identificador);
  if (!usuario) return false;

  // uuid canônico; cai para o id_whatsapp enquanto a migração não rodou.
  const uuidUsuario = usuario.uuid || usuario.whatsappId;

  const dataRef = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  ).getTime();

  // 🔑 compara pelo uuid canônico resolvido (readWorkouts já resolve)
  return readWorkouts().some(t => {
    if (t.uuid !== uuidUsuario) return false;
    const dTime = new Date(
      t.date.getFullYear(),
      t.date.getMonth(),
      t.date.getDate()
    ).getTime();
    return dTime === dataRef;
  });
}
