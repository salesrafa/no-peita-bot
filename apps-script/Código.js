// Confere o token compartilhado (Script Property AUTH_TOKEN) contra o
// parametro 'token' da requisicao. Como o web app e ANYONE_ANONYMOUS, e
// esse token que impede acesso anonimo mesmo com a URL publica.
function autorizado(e) {
  const esperado = PropertiesService.getScriptProperties().getProperty('AUTH_TOKEN');
  const recebido = (e && e.parameter && e.parameter.token) || '';
  return Boolean(esperado) && recebido === esperado;
}

function doGet(e) {
  if (!autorizado(e)) {
    return ContentService.createTextOutput('unauthorized');
  }

  const action = e.parameter.action;

  switch (action) {
    case 'precisaAtualizarCaches':
      return ContentService
        .createTextOutput(JSON.stringify(precisaAtualizarCaches()))
        .setMimeType(ContentService.MimeType.JSON);
    case 'getAdmins':
      return getAdmins();
    default:
      return ContentService.createTextOutput("OK");
  }
}

function doPost(e) {
  if (!autorizado(e)) {
    return ContentService.createTextOutput('unauthorized');
  }

  let responseText = '';
  const mensagem = (e.parameter.Body || "").trim();
  const partes = mensagem.split(" ");
  const comando = partes[0].toLowerCase(); // a primeira palavra da mensagem

  handleMessageLog(e, comando);

  switch (comando) {
    case '/cadastro':
      responseText = handleCadastro(e);
      break;
    case '/pontuat':
      responseText = "_Você quis dizer:_ */pontuar* ?";
      break;
    case '/pontuar':
      responseText = handlePontuar(e);
      break;
    case '/anografico':
      responseText = handleRankingAnoGrafico(e);
      break;
    case '/wrapped':
      responseText = handleWrapped(e);
      break;
    case '/rankingano':
      responseText = handleRankingAno(e);
      break;
    case '/ranking':
      responseText = handleRanking(e);
      break;
    case '/retroativo':
      responseText = handleRetroativo(e);
      break;
    case '/ajuda':
      responseText = handleAjuda();
      break;
    case '/eu':
      responseText = handleEu(e);
      break;
    case '/campeoes':
      responseText = handleCampeoes();
      break;
    case '/hoje':
      responseText = handleHoje();
      break;
    case '/rankingmisterioso':
      responseText = handleRankingMisterioso();
      break;
    case '/ticket':
      responseText = handleTicket(e);
      break;
    case '/ticketstatus':
      responseText = handleTicketStatus(e);
      break;
    case 'atualizaluacheia':
      responseText = atualizarCacheLuaCheia(e);
      break;
    default:
      responseText = `Ação não encontrada\n\n${handleAjuda()}`;
  }
  return ContentService
    .createTextOutput(responseText)
    .setMimeType(ContentService.MimeType.XML);

}
