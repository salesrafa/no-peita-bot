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

  const mapas = getMapasIdentidade();
  const uuidParaNome = getMapaUuidParaNome();

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
  lerTreinos(mapas).forEach(t => {
    if (t.data < dataInicio || t.data > dataFim) return;
    if (filtroDataFn && !filtroDataFn(t.data)) return;
    if (!t.uuid) return;

    bucket(t.uuid, t.nome).datas.push(new Date(t.data));
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
      const uuid = mapas.porNome[String(nome).trim()] || String(nome).trim();
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

function getUsuarioPorIdentificador(identificador) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) return null;

  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const id = String(linha[USER_COL.ID]).trim();
    const numeroReal = String(linha[USER_COL.NUMBER]).trim();

    if ((id === '') || (!id && !numeroReal)) continue;

    if (identificador === id || identificador === numeroReal) {
      return {
        id_whatsapp: linha[USER_COL.ID],
        nome: linha[USER_COL.NAME],
        role: linha[USER_COL.ROLE],
        numero: linha[USER_COL.NUMBER],
        uuid: String(linha[USER_COL.UUID] || "").trim(),
        linhaCompleta: linha,
        indiceLinha: i + 1, // para atualizações futuras (1-based)
      };
    }
  }

  return null;
}

function getNomeUsuario(identificador) {
  const usuario = getUsuarioPorIdentificador(identificador);
  return usuario ? usuario.nome : null;
}

// Resolve o uuid canônico de um usuário a partir de qualquer identificador
// do WhatsApp (lid ou número). Retorna null se não cadastrado.
function resolverUuid(identificador) {
  const usuario = getUsuarioPorIdentificador(identificador);
  return usuario ? usuario.uuid : null;
}

// Constrói mapas de identidade a partir da aba "usuarios", usados para resolver
// qualquer chave de linha de treino (id_whatsapp legado, número, nome ou o
// próprio uuid) ao uuid canônico. Chamado uma vez por leitura em lote.
function getMapasIdentidade() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const porChave = {}; // id_whatsapp | numero | uuid -> uuid
  const porNome = {};  // nome -> uuid (fallback p/ treinos-AB e linhas legadas)
  if (!sheet) return { porChave, porNome };

  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const id = String(dados[i][USER_COL.ID] || "").trim();
    const nome = String(dados[i][USER_COL.NAME] || "").trim();
    const numero = String(dados[i][USER_COL.NUMBER] || "").trim();
    const uuid = String(dados[i][USER_COL.UUID] || "").trim();
    if (!uuid) continue;
    porChave[uuid] = uuid;
    if (id) porChave[id] = uuid;
    if (numero) porChave[numero] = uuid;
    if (nome && !(nome in porNome)) porNome[nome] = uuid;
  }
  return { porChave, porNome };
}

// Resolve a chave canônica (uuid) de uma linha de treino. Usa o valor da
// coluna 0 (id_whatsapp legado ou uuid) e, como fallback, o nome (coluna 1) —
// necessário para treinos cujo id_whatsapp antigo já não existe em "usuarios"
// e para a aba "treinos-AB" (que só tem nome). Se nada casar, devolve o próprio
// valor bruto para não perder a linha.
function resolverUuidTreino(valorCol0, nome, mapas) {
  const chave = String(valorCol0 || "").trim();
  if (mapas.porChave[chave]) return mapas.porChave[chave];
  const n = String(nome || "").trim();
  if (n && mapas.porNome[n]) return mapas.porNome[n];
  return chave || n;
}

// Mapa uuid -> nome canônico (coluna B de "usuarios"), para exibição.
function getMapaUuidParaNome() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.USERS);
  const mapa = {};
  if (!sheet) return mapa;
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const nome = String(dados[i][USER_COL.NAME] || "").trim();
    const uuid = String(dados[i][USER_COL.UUID] || "").trim();
    if (uuid && nome) mapa[uuid] = nome;
  }
  return mapa;
}

// Lê a aba "treinos" e devolve registros normalizados { uuid, nome, data },
// com o uuid canônico já resolvido (id_whatsapp legado/uuid → uuid, fallback
// por nome). Descarta linhas vazias e o cabeçalho. NÃO inclui "treinos-AB"
// (pré-bot) nem o índice da linha — quem precisa disso (ex.: /apagar) lê direto.
// `mapas` é opcional: passe getMapasIdentidade() já calculado para evitar reler
// a aba "usuarios".
function lerTreinos(mapas) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.WORKOUTS);
  if (!sheet) return [];
  mapas = mapas || getMapasIdentidade();
  const dados = sheet.getDataRange().getValues();
  const treinos = [];
  for (let i = 1; i < dados.length; i++) {
    const col0 = dados[i][WORKOUT_COL.UUID];
    const nome = dados[i][WORKOUT_COL.NAME];
    const dataRaw = dados[i][WORKOUT_COL.DATE];
    if ((!col0 && !nome) || !dataRaw) continue;
    treinos.push({
      uuid: resolverUuidTreino(col0, nome, mapas),
      nome: nome,
      data: new Date(dataRaw),
    });
  }
  return treinos;
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
  const usuario = getUsuarioPorIdentificador(identificador);
  if (!usuario) return false;

  // uuid canônico; cai para o id_whatsapp enquanto a migração não rodou.
  const uuidUsuario = usuario.uuid || usuario.id_whatsapp;

  const dataRef = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  ).getTime();

  // 🔑 compara pelo uuid canônico resolvido (lerTreinos já resolve)
  return lerTreinos().some(t => {
    if (t.uuid !== uuidUsuario) return false;
    const dTime = new Date(
      t.data.getFullYear(),
      t.data.getMonth(),
      t.data.getDate()
    ).getTime();
    return dTime === dataRef;
  });
}
