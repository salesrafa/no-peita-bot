function handleWrapped(e) {
  const partes = (e.parameter.Body || "").trim().split(/\s+/);
  const ano = partes[1] && /^\d{4}$/.test(partes[1])
    ? parseInt(partes[1], 10)
    : new Date().getFullYear();

  const campeoesPorMes = getCampeoesPorMes(ano);
  const rankingOlimpico = gerarRankingOlimpicoPorAno(ano);

  if (campeoesPorMes.length === 0 && rankingOlimpico.length === 0) {
    return `📦 *Wrapped ${ano}*\n\nNenhum dado encontrado para este ano.`;
  }

  let texto = `📦 *Wrapped ${ano}*\n`;
  texto += `━━━━━━━━━━━━━━━\n\n`;

  texto += formatarWrappedCampeoes(campeoesPorMes);
  texto += `\n\n`;
  texto += formatarWrappedOlimpiada(rankingOlimpico);

  return texto.trim();
}

function handleRankingAnoGrafico(e) {
  const { inicio, fim, label } = getPeriodoPorAno(e.parameter.Body);

  const ranking = gerarRankingPorPeriodo(inicio, fim);

  if (ranking.length === 0) {
    return "📊 Nenhum dado para gerar gráfico.";
  }

  const url = gerarGraficoRanking(ranking, label);

  return (
    `📊 *${label} — Gráfico*\n\n` +
    `Top ${Math.min(10, ranking.length)} atletas:\n` +
    `${url}`
  );
}

function handleRankingAno(e) {
  const { inicio, fim, label } = getPeriodoPorAno(e.parameter.Body);

  const ranking = gerarRankingPorPeriodo(inicio, fim);

  return formatarRanking(ranking, label);
}

function handleRankingOlimpiada(e) {
  const partes = (e.parameter.Body || "").trim().split(/\s+/);
  const ano = partes[1] && /^\d{4}$/.test(partes[1])
    ? parseInt(partes[1], 10)
    : new Date().getFullYear();

  // O quadro de medalhas considera apenas meses ja finalizados (ver getCampeoesPorMes).
  const ranking = gerarRankingOlimpicoPorAno(ano);

  let texto = `🏅 *Quadro de Medalhas ${ano}*\n`;
  texto += `_(apenas meses já finalizados)_\n`;
  texto += `━━━━━━━━━━━━━━━\n\n`;

  if (!ranking || ranking.length === 0) {
    texto += "Nenhuma medalha registrada ainda.";
    return texto;
  }

  ranking.forEach((r, index) => {
    texto +=
      `${index + 1} - *${r.nome}*  ` +
      `🥇 ${r.ouro}  🥈 ${r.prata}  🥉 ${r.bronze}\n`;
  });

  return texto.trim();
}

function handleTicketStatus(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("tickets");

  if (!sheet || sheet.getLastRow() <= 1) {
    return "❌ Nenhum ticket encontrado.";
  }

  const identificador = e.parameter.From;
  const nome = getNomeUsuario(identificador);

  if (!nome) {
    return "❌ Você precisa estar cadastrado para consultar tickets. Use /cadastro Seu Nome";
  }

  const mensagem = e.parameter.Body.trim();
  const partes = mensagem.split(" ");

  if (partes.length < 2) {
    return "❌ Você precisa informar o ID do ticket.\nExemplo: /ticketstatus 3";
  }

  const idProcurado = parseInt(partes[1], 10);
  if (isNaN(idProcurado)) {
    return "❌ ID do ticket inválido. Use: /ticketstatus 3";
  }

  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const [_, nomeUsuario, id, msg, status] = dados[i];
    if (id === idProcurado) {
      return `🎫 *Ticket #${id}*\n👤 Aberto por: ${nomeUsuario}\n📝 Mensagem: ${msg}\n📌 Status: *${status}*`;
    }
  }

  return `❌ Ticket #${idProcurado} não encontrado.`;
}

function handleTicket(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("tickets") || ss.insertSheet("tickets");

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["numero", "nome", "id", "mensagem", "status"]);
  }

  const identificador = e.parameter.From;
  const usuario = getUsuarioPorIdentificador(identificador);
  // const nome = getNomeUsuario(identificador);

  if (!usuario) {
    return "🚫 Você ainda não está cadastrado. Use: /cadastro Seu Nome";
  }

  const nome = usuario.nome;
  const numero = usuario.numero;

  const mensagemCompleta = e.parameter.Body.trim();
  const mensagem = mensagemCompleta.replace(/^\/ticket\s*/i, "").trim();

  if (!mensagem) {
    return "❌ Você precisa escrever uma mensagem após o comando /ticket.\nExemplo: /ticket gostaria de sugerir uma funcionalidade";
  }

  const ultimoId = sheet.getLastRow() > 1
    ? sheet.getRange(sheet.getLastRow(), 3).getValue()
    : 0;
  const novoId = ultimoId + 1;

  sheet.appendRow([numero, nome, novoId, mensagem, "pendente"]);

  return `✅ Ticket #${novoId} criado com sucesso!\nMensagem: "${mensagem}"\nStatus: pendente`;
}

// Emoji por status do ticket. Os 3 status possíveis são: pendente,
// finalizado e ignorado.
function emojiStatusTicket(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "finalizado") return "✅";
  if (s === "ignorado") return "🚫";
  return "⏳"; // pendente (padrão)
}

// Lista TODOS os tickets do próprio usuário (qualquer status: pendente,
// resolvido, ignorado...). Cada um aparece com o status atual.
function handleMeusTickets(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("tickets");

  const usuario = getUsuarioPorIdentificador(e.parameter.From || "");
  if (!usuario) {
    return "🚫 Você ainda não está cadastrado. Use: /cadastro Seu Nome";
  }
  if (!sheet || sheet.getLastRow() <= 1) {
    return "🎫 Você ainda não abriu nenhum ticket.\nUse: /ticket sua mensagem";
  }

  const meuUuid = usuario.uuid || usuario.id_whatsapp;
  const mapas = getMapasIdentidade();

  const dados = sheet.getDataRange().getValues();
  const meus = [];
  for (let i = 1; i < dados.length; i++) {
    const [num, nomeUsuario, id, msg, status] = dados[i];
    if (!id) continue;
    // resolve o dono do ticket (número→uuid, com fallback por nome)
    if (resolverUuidTreino(num, nomeUsuario, mapas) !== meuUuid) continue;
    meus.push({ id, msg, status });
  }

  if (meus.length === 0) {
    return "🎫 Você ainda não abriu nenhum ticket.\nUse: /ticket sua mensagem";
  }

  meus.sort((a, b) => Number(a.id) - Number(b.id));

  let resposta = `🎫 *Seus tickets (${meus.length}):*\n`;
  meus.forEach(t => {
    let msg = String(t.msg || "").trim();
    if (msg.length > 60) msg = msg.slice(0, 57) + "...";
    resposta += `#${t.id} ${emojiStatusTicket(t.status)} ${t.status} — "${msg}"\n`;
  });

  return resposta.trim();
}

function handleHoje() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("treinos");
  const dados = sheet.getDataRange().getValues();

  const hoje = new Date();
  const hojeStr = formatarData(hoje); // formato dd/MM/yyyy

  // Deduplica por uuid canônico (resolvido da coluna 0), nao por nome: assim
  // dois usuarios com o mesmo nome contam como pessoas diferentes. O nome
  // exibido e o que foi gravado na linha do treino.
  const mapas = getMapasIdentidade();
  const treinaramHoje = new Map(); // uuid -> nome

  for (let i = 1; i < dados.length; i++) {
    const [id, nome, dataStr] = dados[i];
    if ((!id && !nome) || !dataStr) continue;

    const data = new Date(dataStr);
    const dataFormatada = formatarData(data);

    if (dataFormatada === hojeStr) {
      treinaramHoje.set(resolverUuidTreino(id, nome, mapas), nome);
    }
  }

  if (treinaramHoje.size === 0) {
    return "🕒 Ninguém registrou treino hoje ainda.\nBora ser o primeiro? 💪";
  }

  let resposta = `✅ *Treinos de hoje (${hojeStr}):*\n`;
  [...treinaramHoje.values()].sort().forEach(nome => {
    resposta += `- ${nome}\n`;
  });

  return resposta.trim();
}

function handleRankingMisterioso() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const luaCheiaSheet = ss.getSheetByName("lua_cheia");

  const hoje = new Date();

  // === DATAS VÁLIDAS (lua cheia + dia ímpar): passadas contam; futuras viram "próxima"
  const dadosLuaCheia = luaCheiaSheet.getDataRange().getValues();
  const datasValidas = [];   // dd/MM/yyyy já passadas
  const datasFuturas = [];   // { raw, formatada }

  for (let i = 1; i < dadosLuaCheia.length; i++) {
    const dataObj = dadosLuaCheia[i][2];
    if (!dataObj) continue;

    const data = typeof dataObj === "string"
      ? Utilities.parseDate(dataObj, Session.getScriptTimeZone(), "dd/MM/yyyy")
      : new Date(dataObj);

    if (data.getDate() % 2 !== 1) continue; // só dias ímpares

    const formatada = formatarData(data);
    if (data <= hoje) {
      datasValidas.push(formatada);
    } else {
      datasFuturas.push({ raw: data, formatada });
    }
  }

  // === RANKING: delega a contagem para gerarRankingPorPeriodo, filtrando
  // apenas os treinos cujas datas estão na lista de datas válidas.
  const datasValidasSet = new Set(datasValidas);
  const inicio = new Date(2000, 0, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);

  const ranking = gerarRankingPorPeriodo(
    inicio,
    fim,
    (data) => datasValidasSet.has(formatarData(data))
  );

  // === MONTAR RESPOSTA
  let resposta = "🌕 *Ranking Misterioso* (dias ímpares com Lua Cheia)\n\n";

  if (datasValidas.length > 0) {
    resposta += "🗓️ *Datas válidas anteriores:*\n";
    resposta += datasValidas.join(", ") + "\n\n";
  } else {
    resposta += "⚠️ Nenhuma data válida disponível no cache.\n\n";
  }

  if (ranking.length === 0) {
    resposta += "Ninguém pontuou nessas datas ainda.";
  } else {
    ranking.forEach((r, i) => {
      resposta += `${i + 1}. ${r.nome} - ${r.total} ponto${r.total > 1 ? 's' : ''}\n`;
    });
  }

  // === PRÓXIMA DATA MISTERIOSA
  datasFuturas.sort((a, b) => a.raw - b.raw);
  if (datasFuturas.length > 0) {
    resposta += `\n🔮 *Próxima data misteriosa:* ${datasFuturas[0].formatada}`;
  }

  return resposta.trim();
}

// Dado um array de datas de treino, retorna o total de dias unicos treinados
// e a maior sequencia de dias consecutivos. Mesma logica de desempate usada
// em calcularMetricasRankingComAB (total e, no empate, sequencia).
function calcularTotalESequencia(datas) {
  const diasUnicos = Array.from(
    new Set(datas.map(d =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString()
    ))
  ).map(s => new Date(s)).sort((a, b) => a - b);

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

  return { total: diasUnicos.length, sequencia: maiorSeq };
}

function handleCampeoes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campeoesSheet = ss.getSheetByName("campeoes");
  const treinosSheet = ss.getSheetByName("treinos");

  const mapas = getMapasIdentidade();

  // 1. VITÓRIAS MANUAIS (aba 'campeoes', chaveada por uuid após migração)
  const linhasCampeoes = campeoesSheet.getDataRange().getValues();
  const mapaNumeros = getMapaUuidParaNome(); // uuid → nome canônico
  const vitoriasManuais = {}; // uuid → qtd

  for (let i = 1; i < linhasCampeoes.length; i++) {
    const [chave, qtd] = linhasCampeoes[i];
    if (!chave || !qtd) continue;
    const uuid = resolverUuidTreino(chave, "", mapas);
    vitoriasManuais[uuid] = parseInt(qtd, 10);
  }

  // 2. VITÓRIAS AUTOMÁTICAS (ranking por mês)
  const treinos = treinosSheet.getDataRange().getValues();
  const porMesAno = {}; // "mm/yyyy" → { uuid: [datas] }

  for (let i = 1; i < treinos.length; i++) {
    const [col0, nome, dataStr] = treinos[i];
    if ((!col0 && !nome) || !dataStr) continue;
    const uuid = resolverUuidTreino(col0, nome, mapas);
    const data = new Date(dataStr);
    const chave = `${("0" + (data.getMonth() + 1)).slice(-2)}/${data.getFullYear()}`;

    if (!porMesAno[chave]) porMesAno[chave] = {};
    if (!porMesAno[chave][uuid]) porMesAno[chave][uuid] = [];

    porMesAno[chave][uuid].push(data);
    if (!mapaNumeros[uuid] && nome) mapaNumeros[uuid] = nome;
  }

  const vitoriasGeradas = {};

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  // para cada mês completo, pega o(s) campeão(ões)
  Object.entries(porMesAno).forEach(([mesAno, atletas]) => {
    const [mesStr, anoStr] = mesAno.split("/");
    const mes = parseInt(mesStr, 10) - 1;
    const ano = parseInt(anoStr, 10);

    // ignora o mês atual
    if (mes === mesAtual && ano === anoAtual) return;

    // métricas por atleta: dias únicos treinados + maior sequência
    const metricas = Object.entries(atletas).map(([numero, datas]) => {
      const { total, sequencia } = calcularTotalESequencia(datas);
      return { numero, total, sequencia };
    });

    // ordena por total e, no empate, por sequência
    metricas.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.sequencia - a.sequencia;
    });

    // campeão(ões) do mês: todos empatados em total E sequência com o topo
    const topo = metricas[0];
    const campeoesDoMes = metricas.filter(m =>
      m.total === topo.total && m.sequencia === topo.sequencia
    );

    campeoesDoMes.forEach(({ numero }) => {
      if (!vitoriasGeradas[numero]) vitoriasGeradas[numero] = 0;
      vitoriasGeradas[numero]++;
    });
  });

  // 3. SOMAR TUDO (chaves = uuid)
  const totalPorNumero = {};

  const todosNumeros = new Set([
    ...Object.keys(vitoriasManuais),
    ...Object.keys(vitoriasGeradas)
  ]);

  todosNumeros.forEach(numero => {
    const manual = vitoriasManuais[numero] || 0;
    const gerado = vitoriasGeradas[numero] || 0;
    const total = manual + gerado;
    if (total > 0) totalPorNumero[numero] = total;
  });

  if (Object.keys(totalPorNumero).length === 0) {
    return "🏆 Ainda não há campeões registrados.";
  }

  const ranking = Object.entries(totalPorNumero)
    .sort((a, b) => b[1] - a[1]);

  let resposta = "🏆 *Campeões:*\n";
  ranking.forEach(([numero, total], index) => {
    const nome = mapaNumeros[numero] || `(${numero})`;
    const trofeus = "🏆".repeat(total);
    resposta += `${index + 1}. ${nome} - ${trofeus}\n`;
  });

  return resposta.trim();
}

function handleMessageLog(e, comando) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mensagensSheet = ss.getSheetByName("mensagens");

  const identificador = e.parameter.From || "";
  const mensagem = e.parameter.Body || "";
  const timestamp = new Date();

  const nome = getNomeUsuario(identificador);

  mensagensSheet.appendRow([
    identificador,
    nome ? nome : 'Não Cadastrado',
    mensagem,
    Utilities.formatDate(timestamp, "GMT-3", "dd/MM/yyyy HH:mm:ss"),
    comando
  ]);
}

function handleCadastro(e) {
  const idenficador = e.parameter.From || "";
  const nomeJaCadastrado = getNomeUsuario(idenficador);

  if (nomeJaCadastrado) {
    return `✅ Você já está cadastrado ${nomeJaCadastrado}!`;
  }
  const mensagem = e.parameter.Body || "";
  const timestamp = new Date();

  if (!mensagem.toLowerCase().startsWith("/cadastro ")) {
    return "❓ Use: /cadastro Seu Nome";
  }

  const nome = mensagem.substring(10).trim();
  const uuid = Utilities.getUuid(); // identidade interna estável
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("usuarios");
  // Colunas: A id_whatsapp | B nome | C data | D role | E numero | F uuid
  sheet.appendRow([idenficador, nome, timestamp, "", "", uuid]);
  return `✅ Cadastro realizado com sucesso, ${nome}!`;
}

function handlePontuar(e) {
  const identificador = e.parameter.From;
  const hoje = new Date();

  const usuario = getUsuarioPorIdentificador(identificador);
  if (!usuario) {
    return "❌ Usuário não encontrado. Use /cadastro Seu Nome.";
  }

  if (jaTreinouNaData(identificador, hoje)) {
    return "⚠️ Você já registrou um treino hoje.";
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("treinos");
  // col D = id da mensagem do WhatsApp (pra apagar depois citando a mensagem)
  sheet.appendRow([usuario.uuid || usuario.id_whatsapp, usuario.nome, hoje, e.parameter.MsgId || ""]);

  return "✅ Treino registrado com sucesso!";
}

function handleRanking(e) {
  const { inicio, fim, label, tipo } = getPeriodoPorMensagem(e.parameter.Body);

  const ranking = gerarRankingPorPeriodo(inicio, fim);

  // mostra o selo do bicho só nos rankings mensais (não em intervalos de data)
  return formatarRanking(ranking, label, tipo === "mes");
}

function handleRetroativo(e) {
  const identificador = e.parameter.From;
  const partes = (e.parameter.Body || "").trim().split(/\s+/);

  if (partes.length !== 2) {
    return "❌ Use: /retroativo DD/MM/AAAA";
  }

  const data = parseDataBR(partes[1], true);
  if (!data) {
    return "❌ Data inválida. Use DD/MM/AAAA.";
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (data.getTime() > hoje.getTime()) {
    return "❌ Não dá pra registrar treino em data futura.";
  }

  const LIMITE_DIAS_RETROATIVO = 10;
  const limiteMinimo = new Date(hoje);
  limiteMinimo.setDate(limiteMinimo.getDate() - LIMITE_DIAS_RETROATIVO);
  if (data.getTime() < limiteMinimo.getTime()) {
    return `❌ Só dá pra registrar treino retroativo de até ${LIMITE_DIAS_RETROATIVO} dias atrás.`;
  }

  const usuario = getUsuarioPorIdentificador(identificador);
  if (!usuario) {
    return "❌ Usuário não encontrado. Use /cadastro Seu Nome.";
  }

  if (jaTreinouNaData(identificador, data)) {
    return "⚠️ Você já registrou um treino nessa data.";
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("treinos");
  // col D = id da mensagem do WhatsApp (pra apagar depois citando a mensagem)
  sheet.appendRow([usuario.uuid || usuario.id_whatsapp, usuario.nome, data, e.parameter.MsgId || ""]);

  return `✅ Treino registrado em ${Utilities.formatDate(
    data,
    Session.getScriptTimeZone(),
    "dd/MM/yyyy"
  )}.`;
}

function handleEu(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const idenficador = e.parameter.From || "";
  const usuario = getUsuarioPorIdentificador(idenficador);

  if (!usuario) {
    return "🚫 Você ainda não está cadastrado. Use: /cadastro Seu Nome";
  }
  const uuidUsuario = usuario.uuid || usuario.id_whatsapp;
  const mapas = getMapasIdentidade();
  const treinosSheet = ss.getSheetByName("treinos");
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const treinos = treinosSheet.getDataRange().getValues();

  const datas = treinos
    .filter(row => {
      const data = new Date(row[2]);
      return resolverUuidTreino(row[0], row[1], mapas) === uuidUsuario &&
        data.getMonth() === mesAtual &&
        data.getFullYear() === anoAtual;
    })
    .map(row => Utilities.formatDate(new Date(row[2]), "GMT-3", "dd/MM/yyyy"))
    .sort();

  const nomeMes = getNomeMesEmPortugues(mesAtual);
  const total = datas.length;
  const { atual, proximo, faltam } = classificarBicho(total);

  // Selo do bicho (classificação individual do mês) + incentivo do próximo nível
  let resposta = `${atual.emoji} *${atual.nome}*\n`;
  resposta += `${total} treino${total === 1 ? "" : "s"} em ${nomeMes} — ${atual.vibe}!\n`;
  if (proximo) {
    if (proximo.secreto) {
      // não revela o bicho lendário do topo — deixa como surpresa
      resposta += `Faltam ${faltam} treino${faltam === 1 ? "" : "s"} pra um bicho lendário... 👀\n`;
    } else {
      resposta += `Faltam ${faltam} treino${faltam === 1 ? "" : "s"} pra virar ${proximo.emoji} ${proximo.nome}.\n`;
    }
  }

  if (total > 0) {
    resposta += `\n📆 Seus treinos em ${nomeMes}:\n`;
    datas.forEach(data => resposta += `- ${data}\n`);
  }

  return resposta.trim();
}

// Meta anual padrão (treinos no ano) quando a pessoa não definiu a sua.
// Ajustável aqui; cada um pode sobrescrever com /meta N.
const META_ANUAL_PADRAO = 150;

// /meta        -> mostra o progresso da meta anual (com barra e projeção)
// /meta 200    -> define a meta anual pessoal do ano corrente (aba "metas")
function handleMeta(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const usuario = getUsuarioPorIdentificador(e.parameter.From || "");
  if (!usuario) {
    return "🚫 Você ainda não está cadastrado. Use: /cadastro Seu Nome";
  }

  const partes = (e.parameter.Body || "").trim().split(/\s+/);

  // /meta N -> define a meta pessoal
  if (partes.length >= 2) {
    const nova = parseInt(partes[1], 10);
    if (isNaN(nova) || nova <= 0) {
      return "❌ Meta inválida. Informe um número positivo. Ex.: /meta 150";
    }
    if (nova > 366) {
      return "❌ A meta não pode passar de 366 — só dá pra treinar 1x por dia. Ex.: /meta 150";
    }
    const ano = new Date().getFullYear();
    setMetaAnual(usuario.uuid || usuario.id_whatsapp, ano, nova);
    return `✅ Meta anual de ${ano} definida: *${nova}* treinos.\nUse /meta para ver seu progresso.`;
  }

  // /meta -> mostra o progresso
  const agora = new Date();
  const ano = agora.getFullYear();
  const metaInfo = getMetaAnual(usuario.uuid || usuario.id_whatsapp, ano);
  const meta = metaInfo ? metaInfo.valor : META_ANUAL_PADRAO;
  const herdada = metaInfo && metaInfo.ano < ano; // meta veio de um ano anterior
  const total = contarTreinosNoAno(usuario.uuid || usuario.id_whatsapp, ano);

  const pct = Math.round((total / meta) * 100);
  const barra = barraProgresso(total, meta);

  const inicioAno = new Date(ano, 0, 1);
  const fimAno = new Date(ano, 11, 31, 23, 59, 59, 999);
  const umDia = 24 * 60 * 60 * 1000;
  const diaDoAno = Math.max(1, Math.floor((agora - inicioAno) / umDia) + 1);
  const diasNoAno = Math.round((fimAno - inicioAno) / umDia) + 1;
  const diasRestantes = Math.max(0, diasNoAno - diaDoAno);

  let resposta = `🎯 *Meta anual ${ano}*\n`;
  resposta += `👟 ${total} / ${meta} treinos (${pct}%)\n`;
  resposta += `${barra}\n`;
  resposta += `📅 Faltam ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}\n`;

  if (total >= meta) {
    resposta += `🏆 Meta batida! Bora aumentar? (/meta N)`;
  } else {
    const ritmo = total / diaDoAno; // treinos por dia até agora
    const projetado = Math.round(total + ritmo * diasRestantes);
    if (projetado >= meta) {
      resposta += `📈 No ritmo atual você fecha o ano em ~${projetado} — vai bater! 🎉`;
    } else {
      const restante = meta - total;
      const semanas = Math.max(1, diasRestantes / 7);
      const porSemana = Math.ceil(restante / semanas);
      resposta += `📉 No ritmo atual fecha em ~${projetado}. ` +
        `Faltam ${restante} treinos — ~${porSemana}/semana pra alcançar.`;
    }
  }

  if (herdada) {
    resposta += `\n\nℹ️ Meta herdada de ${metaInfo.ano} — defina a de ${ano} com /meta N`;
  }

  return resposta.trim();
}

// Conta os dias únicos treinados por um usuário (uuid) em um ano.
// Dedup por dia é redundante (o bot já limita 1/dia), mas protege contra
// eventuais duplicatas legadas. Não inclui dados pré-bot (treinos-AB, 2025).
function contarTreinosNoAno(uuidUsuario, ano) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("treinos");
  if (!sheet) return 0;
  const mapas = getMapasIdentidade();
  const dados = sheet.getDataRange().getValues();
  const dias = {};
  for (let i = 1; i < dados.length; i++) {
    const [col0, nome, dataStr] = dados[i];
    if ((!col0 && !nome) || !dataStr) continue;
    if (resolverUuidTreino(col0, nome, mapas) !== uuidUsuario) continue;
    const d = new Date(dataStr);
    if (d.getFullYear() !== ano) continue;
    dias[`${d.getMonth()}-${d.getDate()}`] = true;
  }
  return Object.keys(dias).length;
}

// Barra de progresso textual de 10 blocos (🟩 cheio, ⬜ vazio).
function barraProgresso(valor, total) {
  const blocos = 10;
  const frac = total > 0 ? valor / total : 0;
  let cheios = Math.round(frac * blocos);
  if (cheios < 0) cheios = 0;
  if (cheios > blocos) cheios = blocos;
  return "🟩".repeat(cheios) + "⬜".repeat(blocos - cheios);
}

// Aba "metas": uma linha por (uuid, ano). Mantém histórico das metas anuais
// sem inchar a aba "usuarios" — ano novo só vira linha nova.
// Colunas: A uuid | B ano | C meta
function getSheetMetas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("metas");
  if (!sheet) {
    sheet = ss.insertSheet("metas");
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["uuid", "ano", "meta"]);
  }
  return sheet;
}

// Retorna a meta efetiva de um usuário para um ano: a do próprio ano, se
// existir; senão herda a do ano anterior mais recente. Devolve { valor, ano }
// da meta encontrada (ano < alvo indica herança), ou null se nunca definiu.
function getMetaAnual(uuid, ano) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("metas");
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const dados = sheet.getDataRange().getValues();
  let melhor = null; // { valor, ano } com o maior ano <= alvo
  for (let i = 1; i < dados.length; i++) {
    const [u, a, m] = dados[i];
    if (String(u).trim() !== String(uuid).trim()) continue;
    const anoLinha = Number(a);
    const valor = parseInt(m, 10);
    if (isNaN(anoLinha) || isNaN(valor) || valor <= 0) continue;
    if (anoLinha > ano) continue; // ignora metas de anos futuros
    if (!melhor || anoLinha > melhor.ano) melhor = { valor: valor, ano: anoLinha };
  }
  return melhor;
}

// Define (upsert) a meta de um usuário para um ano.
function setMetaAnual(uuid, ano, valor) {
  const sheet = getSheetMetas();
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const [u, a] = dados[i];
    if (String(u).trim() === String(uuid).trim() && Number(a) === Number(ano)) {
      sheet.getRange(i + 1, 3).setValue(valor); // coluna C = meta
      return;
    }
  }
  sheet.appendRow([uuid, ano, valor]);
}

// /apagar (apenas admins): apaga um treino. O admin precisa RESPONDER (citar)
// a mensagem de /pontuar do treino; o Node envia o id dessa mensagem em
// QuotedMsgId, e a gente acha a linha em "treinos" com esse id (coluna D).
function handleApagarTreino(e) {
  const usuario = getUsuarioPorIdentificador(e.parameter.From || "");
  if (!usuario) {
    return "🚫 Você ainda não está cadastrado.";
  }
  if (String(usuario.role || "").toLowerCase() !== "admin") {
    return "🔒 Só admins podem apagar treinos.";
  }

  const quotedId = String(e.parameter.QuotedMsgId || "").trim();
  if (!quotedId) {
    return "↩️ Para apagar, *responda* (cite) a mensagem de /pontuar do treino e mande /apagar.";
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("treinos");
  if (!sheet || sheet.getLastRow() <= 1) {
    return "❌ Nenhum treino encontrado.";
  }

  const dados = sheet.getDataRange().getValues();
  const COL_MSGID = 3; // coluna D
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][COL_MSGID] || "").trim() !== quotedId) continue;

    const nome = dados[i][1];
    const data = dados[i][2];
    const dataFmt = data
      ? Utilities.formatDate(new Date(data), "GMT-3", "dd/MM/yyyy")
      : "?";
    sheet.deleteRow(i + 1);
    return `🗑️ Treino de ${nome} em ${dataFmt} apagado.`;
  }

  return "❌ Não achei um treino ligado a essa mensagem. Cite a mensagem de /pontuar original (a partir de agora os treinos guardam esse vínculo).";
}

function handleAjuda() {
  let texto = `🤖 *Ajuda — Comandos do Bot*\n`;
  texto += `━━━━━━━━━━━━━━━━━━\n\n`;

  texto += `🧍 *Cadastro*\n`;
  texto += `• /cadastro Seu Nome\n`;
  texto += `  Registra você no bot para poder usar os demais comandos.\n\n`;

  texto += `🏋️ *Treinos*\n`;
  texto += `• /pontuar\n`;
  texto += `  Registra um treino no dia de hoje (apenas 1 por dia).\n\n`;

  texto += `• /retroativo DD/MM/AAAA\n`;
  texto += `  Registra um treino em uma data passada.\n\n`;

  texto += `• /apagar (só admins)\n`;
  texto += `  Responda a mensagem de /pontuar do treino e mande /apagar.\n\n`;

  texto += `• /hoje\n`;
  texto += `  Mostra quem já treinou hoje.\n\n`;

  texto += `• /eu\n`;
  texto += `  Mostra seu bicho do mês 🐾 e lista seus treinos.\n\n`;

  texto += `🎯 *Meta anual*\n`;
  texto += `• /meta\n`;
  texto += `  Mostra o progresso da sua meta anual de treinos.\n\n`;

  texto += `• /meta NÚMERO\n`;
  texto += `  Define a sua meta anual (ex.: /meta 150).\n\n`;

  texto += `📊 *Rankings*\n`;
  texto += `• /ranking\n`;
  texto += `  Ranking do mês atual.\n\n`;

  texto += `• /ranking MM/AAAA\n`;
  texto += `  Ranking de um mês específico.\n\n`;

  texto += `• /ranking DD/MM/AAAA DD/MM/AAAA\n`;
  texto += `  Ranking por intervalo de datas.\n\n`;

  texto += `• /rankingano\n`;
  texto += `  Ranking do ano atual.\n\n`;

  texto += `• /rankingano AAAA\n`;
  texto += `  Ranking de um ano específico.\n\n`;

  texto += `• /anografico\n`;
  texto += `  Gráfico com o top 10 atletas do ano atual.\n\n`;

  texto += `• /anografico AAAA\n`;
  texto += `  Gráfico com o top 10 atletas de um ano específico.\n\n`;

  texto += `• /rankingmisterioso\n`;
  texto += `  Ranking considerando apenas treinos em dias ímpares com lua cheia 🌕.\n\n`;

  texto += `🐾 *Bicho do mês*\n`;
  texto += `  Classificação individual (sem competir com ninguém): seu bicho\n`;
  texto += `  evolui conforme seus treinos no mês, começando no 🥚 Ovo.\n`;
  texto += `  Tem bicho lendário escondido pra quem chegar lá 👀\n`;
  texto += `  Aparece no /ranking e em detalhe no /eu.\n\n`;

  texto += `🏆 *Campeões & Medalhas*\n`;
  texto += `• /campeoes\n`;
  texto += `  Ranking de campeões mensais acumulados.\n\n`;

  texto += `• /rankingolimpiada\n`;
  texto += `  Quadro de medalhas do ano atual (🥇🥈🥉), só com meses já finalizados.\n\n`;

  texto += `• /rankingolimpiada AAAA\n`;
  texto += `  Quadro de medalhas de um ano específico.\n\n`;

  texto += `📦 *Wrapped*\n`;
  texto += `• /wrapped\n`;
  texto += `  Resumo completo do ano atual.\n\n`;

  texto += `• /wrapped AAAA\n`;
  texto += `  Resumo completo de um ano específico.\n\n`;

  texto += `🎫 *Tickets*\n`;
  texto += `• /ticket sua mensagem\n`;
  texto += `  Abre um ticket com sugestão ou solicitação.\n\n`;

  texto += `• /tickets\n`;
  texto += `  Lista todos os seus tickets e o status de cada um.\n\n`;

  texto += `• /ticketstatus ID\n`;
  texto += `  Consulta o status de um ticket específico.\n\n`;

  texto += `❓ *Ajuda*\n`;
  texto += `• /ajuda\n`;
  texto += `  Mostra esta mensagem.\n\n`;

  texto += `ℹ️ *Observações*\n`;
  texto += `• Alguns comandos podem exigir cadastro prévio.\n`;
  texto += `• Rankings consideram empates corretamente.\n`;
  texto += `• Sequência é baseada em dias consecutivos de treino.\n`;

  return texto.trim();
}
