// Checks the shared token (Script Property AUTH_TOKEN) against the request's
// 'token' parameter. Since the web app is ANYONE_ANONYMOUS, this token is what
// prevents anonymous access even with the public URL.
function isAuthorized(e) {
  const expected = PropertiesService.getScriptProperties().getProperty('AUTH_TOKEN');
  const received = (e && e.parameter && e.parameter.token) || '';
  return Boolean(expected) && received === expected;
}

function doGet(e) {
  if (!isAuthorized(e)) {
    return ContentService.createTextOutput('unauthorized');
  }

  const action = e.parameter.action;

  switch (action) {
    case 'pendingCacheUpdates':
      return ContentService
        .createTextOutput(JSON.stringify(pendingCacheUpdates()))
        .setMimeType(ContentService.MimeType.JSON);
    case 'getAdmins':
      return getAdmins();
    default:
      return ContentService.createTextOutput("OK");
  }
}

function doPost(e) {
  if (!isAuthorized(e)) {
    return ContentService.createTextOutput('unauthorized');
  }

  let responseText;
  const message = (e.parameter.Body || "").trim();
  const parts = message.split(" ");
  const command = parts[0].toLowerCase(); // a primeira palavra da mensagem

  logMessage(e, command);

  switch (command) {
    case '/cadastro':
      responseText = handleRegister(e);
      break;
    case '/pontuat':
      responseText = "_Você quis dizer:_ */pontuar* ?";
      break;
    case '/pontuar':
      responseText = handleScore(e);
      break;
    case '/apagar':
      responseText = handleDeleteWorkout(e);
      break;
    case '/anografico':
      responseText = handleYearRankingChart(e);
      break;
    case '/wrapped':
      responseText = handleWrapped(e);
      break;
    case '/rankingano':
      responseText = handleYearRanking(e);
      break;
    case '/ranking':
      responseText = handleRanking(e);
      break;
    case '/retroativo':
      responseText = handleBackdate(e);
      break;
    case '/ajuda':
      responseText = handleHelp();
      break;
    case '/eu':
      responseText = handleMe(e);
      break;
    case '/campeoes':
      responseText = handleChampions();
      break;
    case '/rankingolimpiada':
      responseText = handleOlympicsRanking(e);
      break;
    case '/hoje':
      responseText = handleToday();
      break;
    case '/rankingmisterioso':
      responseText = handleMysteryRanking();
      break;
    case '/ticket':
      responseText = handleTicket(e);
      break;
    case '/ticketstatus':
      responseText = handleTicketStatus(e);
      break;
    case '/meta':
      responseText = handleGoal(e);
      break;
    case '/tickets':
      responseText = handleMyTickets(e);
      break;
    case '/jogos':
      responseText = handleMatches(e);
      break;
    case '/palpite':
      responseText = handlePrediction(e);
      break;
    case '/meuspalpites':
      responseText = handleMyPredictions(e);
      break;
    case 'atualizaluacheia':
      responseText = updateFullMoonCache(e);
      break;
    default:
      responseText = `Ação não encontrada\n\n${handleHelp()}`;
  }
  return ContentService
    .createTextOutput(responseText)
    .setMimeType(ContentService.MimeType.XML);

}
