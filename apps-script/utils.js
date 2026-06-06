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
  }

  return { inicio, fim, label };
}

function formatarRanking(ranking, titulo) {
  if (ranking.length === 0) {
    return "📊 Nenhum treino encontrado no período.";
  }

  let texto = `📊 *${titulo}*\n\n`;

  ranking.forEach(r => {
    const medal =
      r.rank === 1 ? "🥇 " :
      r.rank === 2 ? "🥈 " :
      r.rank === 3 ? "🥉 " : "";

    texto += `${r.rank} - ${medal}*${r.nome}* - ${r.total} treino(s) - 🔥 ${r.sequencia}\n`;
  });

  return texto.trim();
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

  const sheetTreinos = ss.getSheetByName("treinos");
  const sheetAB = ss.getSheetByName("treinos-AB");

  const dadosTreinos = sheetTreinos.getDataRange().getValues();
  const dadosAB = sheetAB ? sheetAB.getDataRange().getValues() : [];

  const porPessoa = {}; // nome -> { datas: [], totalAB: number }

  // ---------- treinos diários (pós-bot) ----------
  for (let i = 1; i < dadosTreinos.length; i++) {
    const [numero, nome, dataStr] = dadosTreinos[i];
    if (!nome || !dataStr) continue;

    const data = new Date(dataStr);
    if (data < dataInicio || data > dataFim) continue;
    if (filtroDataFn && !filtroDataFn(data)) continue;

    if (!porPessoa[nome]) {
      porPessoa[nome] = { datas: [], totalAB: 0 };
    }

    porPessoa[nome].datas.push(new Date(data));
  }

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

      if (!porPessoa[nome]) {
        porPessoa[nome] = { datas: [], totalAB: 0 };
      }

      porPessoa[nome].totalAB += Number(total);
    }
  }

  return calcularMetricasRankingComAB(porPessoa);
}

function calcularMetricasRankingComAB(porPessoa) {
  const linhas = Object.entries(porPessoa).map(([nome, info]) => {
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
  const sheet = ss.getSheetByName("usuarios");
  if (!sheet) return null;

  const dados = sheet.getDataRange().getValues();
  const COL_ID = 0;           // coluna A -> id_whatsapp (novo ID aleatório)
  const COL_NOME = 1;         // coluna B -> nome
  const COL_ROLE = 3;         // coluna D -> role
  const COL_NUMERO_REAL = 4;  // coluna E -> número real

  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const id = String(linha[COL_ID]).trim();
    const numeroReal = String(linha[COL_NUMERO_REAL]).trim();

    if ((id === '') || (!id && !numeroReal)) continue;

    if (identificador === id || identificador === numeroReal) {
      return {
        id_whatsapp: linha[COL_ID],
        nome: linha[COL_NOME],
        role: linha[COL_ROLE],
        numero: linha[COL_NUMERO_REAL],
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

  const idUsuario = usuario.id_whatsapp;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("treinos");
  if (!sheet) return false;

  const dados = sheet.getDataRange().getValues();

  const dataRef = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate()
  ).getTime();

  for (let i = 1; i < dados.length; i++) {
    const [idTreino, , dataStr] = dados[i];
    if (!idTreino || !dataStr) continue;

    // 🔑 compara pelo ID
    if (idTreino !== idUsuario) continue;

    const d = new Date(dataStr);
    const dTime = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    ).getTime();

    if (dTime === dataRef) {
      return true;
    }
  }

  return false;
}
