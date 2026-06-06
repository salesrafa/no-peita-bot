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

function handleHoje() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("treinos");
  const dados = sheet.getDataRange().getValues();

  const hoje = new Date();
  const hojeStr = formatarData(hoje); // formato dd/MM/yyyy

  const nomesHoje = new Set();

  for (let i = 1; i < dados.length; i++) {
    //TODO mudar para fazer a busca por idenficador ao invés de nome
    const [_, nome, dataStr] = dados[i];
    if (!nome || !dataStr) continue;

    const data = new Date(dataStr);
    const dataFormatada = formatarData(data);

    if (dataFormatada === hojeStr) {
      nomesHoje.add(nome);
    }
  }

  if (nomesHoje.size === 0) {
    return "🕒 Ninguém registrou treino hoje ainda.\nBora ser o primeiro? 💪";
  }

  let resposta = `✅ *Treinos de hoje (${hojeStr}):*\n`;
  [...nomesHoje].sort().forEach((nome, i) => {
    resposta += `- ${nome}\n`;
  });

  return resposta.trim();
}

function handleRankingMisterioso() {
  //TODO mudar abordagem para usar uma função que cria uma lista baseado em data inicial e final
  // {{identificador}} {{data-do-treino}}
  //e depois essa função pega essa lista e contabiliza apenas as datas de lua cheia
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const treinosSheet = ss.getSheetByName("treinos");
  const luaCheiaSheet = ss.getSheetByName("lua_cheia");

  const treinos = treinosSheet.getDataRange().getValues();
  const hoje = new Date();

  // === PEGAR DATAS VÁLIDAS (lua cheia + ímpar + passadas)
  const dadosLuaCheia = luaCheiaSheet.getDataRange().getValues();
  const datasValidas = [];
  const datasFuturas = [];

  for (let i = 1; i < dadosLuaCheia.length; i++) {
    const linha = dadosLuaCheia[i];
    const dataObj = linha[2];
    if (!dataObj) continue;

    const data = typeof dataObj === "string"
      ? Utilities.parseDate(dataObj, Session.getScriptTimeZone(), "dd/MM/yyyy")
      : new Date(dataObj);

    const dia = data.getDate();
    const dataFormatada = Utilities.formatDate(data, "GMT-3", "dd/MM/yyyy");

    if (dia % 2 === 1) {
      if (data <= hoje) {
        datasValidas.push(dataFormatada);
      } else {
        datasFuturas.push({ raw: data, formatada: dataFormatada });
      }
    }
  }

  // === CONTAR TREINOS EM DATAS VÁLIDAS
  const contagem = {};
  for (let i = 1; i < treinos.length; i++) {
    const [numero, nome, dataStr] = treinos[i];
    if (!numero || !dataStr) continue;

    const dataFormatada = formatarData(new Date(dataStr));
    if (datasValidas.includes(dataFormatada)) {
      if (!contagem[nome]) contagem[nome] = 0;
      contagem[nome]++;
    }
  }

  const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);

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
    ranking.forEach(([nome, qtd], i) => {
      resposta += `${i + 1}. ${nome} - ${qtd} ponto${qtd > 1 ? 's' : ''}\n`;
    });
  }

  // === PRÓXIMA DATA MISTERIOSA
  datasFuturas.sort((a, b) => a.raw - b.raw);
  if (datasFuturas.length > 0) {
    resposta += `\n🔮 *Próxima data misteriosa:* ${datasFuturas[0].formatada}`;
  }

  return resposta.trim();
}

function handleCampeoes() {
  //TODO Implementar empate
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const campeoesSheet = ss.getSheetByName("campeoes");
  const treinosSheet = ss.getSheetByName("treinos");
  const usuariosSheet = ss.getSheetByName("usuarios");

  // 1. VITÓRIAS MANUAIS
  const linhasCampeoes = campeoesSheet.getDataRange().getValues();
  const mapaNumeros = {}; // numero → nome (opcional, se quiser expandir)
  const vitoriasManuais = {}; // numero → qtd

  for (let i = 1; i < linhasCampeoes.length; i++) {
    const [numero, qtd] = linhasCampeoes[i];
    if (!numero || !qtd) continue;
    vitoriasManuais[numero] = parseInt(qtd, 10);
  }

  // 2. nomes da aba 'usuarios' (complementar o mapa)
  const usuarios = usuariosSheet.getDataRange().getValues();
  usuarios.forEach(row => {
    const numero = row[0];
    const nome = row[1];
    if (numero && nome && !mapaNumeros[numero]) {
      mapaNumeros[numero] = nome;
    }
  });

  // 3. VITÓRIAS AUTOMÁTICAS (ranking por mês)
  const treinos = treinosSheet.getDataRange().getValues();
  const porMesAno = {}; // "mm/yyyy" → { numero: qtd }

  for (let i = 1; i < treinos.length; i++) {
    const [numero, nome, dataStr] = treinos[i];
    if (!numero || !dataStr) continue;
    const data = new Date(dataStr);
    const chave = `${("0" + (data.getMonth() + 1)).slice(-2)}/${data.getFullYear()}`;

    if (!porMesAno[chave]) porMesAno[chave] = {};
    if (!porMesAno[chave][numero]) porMesAno[chave][numero] = 0;

    porMesAno[chave][numero]++;
    mapaNumeros[numero] = nome;
  }

  const vitoriasGeradas = {};

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  // para cada mês completo, pega o campeão
  Object.entries(porMesAno).forEach(([mesAno, ranking]) => {
    const [mesStr, anoStr] = mesAno.split("/");
    const mes = parseInt(mesStr, 10) - 1;
    const ano = parseInt(anoStr, 10);

    // ignora o mês atual
    if (mes === mesAtual && ano === anoAtual) return;

    const campeao = Object.entries(ranking).sort((a, b) => b[1] - a[1])[0];
    const numero = campeao[0];
    if (!vitoriasGeradas[numero]) vitoriasGeradas[numero] = 0;
    vitoriasGeradas[numero]++;
  });

  // 4. SOMAR TUDO
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
  // TODO gerar um UUID para cada usuario e linka-los nas outras páginas. 
  // Fazer a busca por usuário pegar o FROM e buscar tanto por "lid" quanto por "numero backup" e devolvendo o UUID
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("usuarios");
  sheet.appendRow([idenficador, nome, timestamp]);
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
  sheet.appendRow([usuario.id_whatsapp, usuario.nome, hoje]);

  return "✅ Treino registrado com sucesso!";
}

function handleRanking(e) {
  const { inicio, fim, label } = getPeriodoPorMensagem(e.parameter.Body);

  const ranking = gerarRankingPorPeriodo(inicio, fim);

  return formatarRanking(ranking, label);
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
  sheet.appendRow([usuario.id_whatsapp, usuario.nome, data]);

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
  const numeroUsuario = usuario.numero;
  const treinosSheet = ss.getSheetByName("treinos");
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const treinos = treinosSheet.getDataRange().getValues();

  const datas = treinos
    .filter(row => {
      const numeroTreino = row[0];
      const data = new Date(row[2]);
      return numeroTreino === numeroUsuario &&
        data.getMonth() === mesAtual &&
        data.getFullYear() === anoAtual;
    })
    .map(row => Utilities.formatDate(new Date(row[2]), "GMT-3", "dd/MM/yyyy"))
    .sort();

  if (datas.length === 0) {
    return "📆 Você ainda não treinou neste mês.";
  }

  const nomeMes = getNomeMesEmPortugues(mesAtual);
  let resposta = `📆 Seus treinos em ${nomeMes}:\n`;
  datas.forEach(data => resposta += `- ${data}\n`);

  return resposta.trim();
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

  texto += `• /hoje\n`;
  texto += `  Mostra quem já treinou hoje.\n\n`;

  texto += `• /eu\n`;
  texto += `  Lista seus treinos no mês atual.\n\n`;

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

  texto += `🏆 *Campeões*\n`;
  texto += `• /campeoes\n`;
  texto += `  Ranking de campeões mensais acumulados.\n\n`;

  texto += `📦 *Wrapped*\n`;
  texto += `• /wrapped\n`;
  texto += `  Resumo completo do ano atual.\n\n`;

  texto += `• /wrapped AAAA\n`;
  texto += `  Resumo completo de um ano específico.\n\n`;

  texto += `🎫 *Tickets*\n`;
  texto += `• /ticket sua mensagem\n`;
  texto += `  Abre um ticket com sugestão ou solicitação.\n\n`;

  texto += `• /ticketstatus ID\n`;
  texto += `  Consulta o status de um ticket.\n\n`;

  texto += `❓ *Ajuda*\n`;
  texto += `• /ajuda\n`;
  texto += `  Mostra esta mensagem.\n\n`;

  texto += `ℹ️ *Observações*\n`;
  texto += `• Alguns comandos podem exigir cadastro prévio.\n`;
  texto += `• Rankings consideram empates corretamente.\n`;
  texto += `• Sequência é baseada em dias consecutivos de treino.\n`;

  return texto.trim();
}
