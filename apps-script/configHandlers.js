function getAdmins() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("usuarios");
    const dados = sheet.getDataRange().getValues();

    let admins = [];
    for (let i = 1; i < dados.length; i++) {
      const [numero, nome, data, role] = dados[i];
      if (role && role.toLowerCase() === "admin") {
        admins.push({ numero, nome, data });
      }
    }

    return ContentService.createTextOutput(JSON.stringify(admins))
      .setMimeType(ContentService.MimeType.JSON);
}

function precisaAtualizarCaches() {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1; // 1–12
  const pendentes = [];

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("lua_cheia");
  if (!sheet) {
    // se aba não existe, cria e solicita mês atual
    pendentes.push({ cache: "lua_cheia", ano: anoAtual, mes: String(mesAtual).padStart(2, '0') });
    return pendentes;
  }

  const dados = sheet.getDataRange().getValues();

  // verificar se já tem cache do mês atual
  const temMesAtual = dados.some(linha => {
    const [ano, mes] = linha;
    return parseInt(ano) === anoAtual && parseInt(mes) === mesAtual;
  });

  if (!temMesAtual) {
    pendentes.push({ cache: "lua_cheia", ano: anoAtual, mes: String(mesAtual).padStart(2, '0') });
  }

  // contar quantas datas futuras existem no mês atual
  const datasFuturasMesAtual = dados.filter(linha => {
    const [ano, mes, dataObj] = linha;
    if (!dataObj) return false;

    const data = (dataObj instanceof Date)
      ? dataObj
      : new Date(dataObj);

    const ehFuturo = data > hoje;
    return (
      parseInt(ano) === anoAtual &&
      parseInt(mes) === mesAtual &&
      ehFuturo
    );
  });

  // se só tem 2 ou menos datas futuras → solicitar também o próximo mês
  if (datasFuturasMesAtual.length <= 2) {
    const mesSeguinte = mesAtual === 12 ? 1 : mesAtual + 1;
    const anoSeguinte = mesAtual === 12 ? anoAtual + 1 : anoAtual;

    const jaTemProximo = dados.some(linha => {
      const [ano, mes] = linha;
      return parseInt(ano) === anoSeguinte && parseInt(mes) === mesSeguinte;
    });

    if (!jaTemProximo) {
      pendentes.push({
        cache: "lua_cheia",
        ano: anoSeguinte,
        mes: String(mesSeguinte).padStart(2, '0')
      });
    }
  }

  return pendentes;
}

function atualizarCacheLuaCheia(e) {
  const ano = e.parameter.Ano;
  const mes = e.parameter.Mes;
  const strDatas = e.parameter.Datas;
  const datas = strDatas.split(',').map(item => item.trim());;

  if (!ano || !mes || !datas || !Array.isArray(datas)) {
    return `sucesso: false, erro: "Parâmetros inválidos"`;
  }

  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("lua_cheia") ||
    SpreadsheetApp.getActiveSpreadsheet().insertSheet("lua_cheia");

  const linhaInicial = aba.getLastRow() + 1;
  const linhas = datas.map(data => [ano, mes, data]);

  aba.getRange(linhaInicial, 1, linhas.length, 3).setValues(linhas);

  return `sucesso: true, registrosAdicionados: ${linhas.length}`;
}