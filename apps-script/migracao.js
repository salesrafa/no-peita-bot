/**
 * Migração one-off: introduz um uuid canônico por usuário e re-chaveia as abas
 * "treinos" e "campeoes" (coluna 0) do id_whatsapp legado para o uuid.
 *
 * COMO RODAR (pelo editor do Apps Script):
 *   1. Faça um BACKUP: Arquivo → Fazer uma cópia da planilha.
 *   2. Rode `migrarParaUuid` (dry-run; não escreve nada) e leia os logs
 *      (Ver → Registros / Execuções). Confira: zero órfãos sem resolução e
 *      nenhuma ambiguidade de nome.
 *   3. Resolva eventuais pendências manualmente na planilha.
 *   4. Rode `aplicarMigracaoParaUuid` para aplicar de fato.
 *
 * A aba "treinos-AB" (pré-bot, só tem nome) NÃO é alterada: o ranking resolve
 * esses registros por nome em tempo de leitura (ver getMapasIdentidade).
 */

// Entry point seguro: dry-run (só loga o que mudaria).
function migrarParaUuid() {
  return _migrar(true);
}

// Entry point que APLICA as mudanças.
function aplicarMigracaoParaUuid() {
  return _migrar(false);
}

function _migrar(dryRun) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const log = (msg) => Logger.log(msg);

  log(dryRun ? "=== DRY-RUN (nada será escrito) ===" : "=== APLICANDO MIGRAÇÃO ===");

  // ---------------------------------------------------------------------------
  // 1. usuarios: garantir uuid (coluna F) em toda linha
  // ---------------------------------------------------------------------------
  const COL_ID = 0, COL_NOME = 1, COL_NUMERO = 4, COL_UUID = 5;
  const usuariosSheet = ss.getSheetByName("usuarios");
  const usuarios = usuariosSheet.getDataRange().getValues();

  const idParaUuid = {};
  const numeroParaUuid = {};
  const nomeParaUuids = {}; // nome -> Set de uuids (p/ detectar ambiguidade)
  const novosUuidsCol = [];  // valores a escrever na coluna F (linhas 2..n)
  let gerados = 0;

  for (let i = 1; i < usuarios.length; i++) {
    const linha = usuarios[i];
    const id = String(linha[COL_ID] || "").trim();
    const nome = String(linha[COL_NOME] || "").trim();
    const numero = String(linha[COL_NUMERO] || "").trim();
    let uuid = String(linha[COL_UUID] || "").trim();

    if (!uuid) {
      uuid = Utilities.getUuid();
      gerados++;
    }
    novosUuidsCol.push([uuid]);

    if (id) idParaUuid[id] = uuid;
    if (numero) numeroParaUuid[numero] = uuid;
    if (nome) {
      if (!nomeParaUuids[nome]) nomeParaUuids[nome] = {};
      nomeParaUuids[nome][uuid] = true;
    }
  }

  log(`usuarios: ${usuarios.length - 1} linhas, ${gerados} uuid(s) a gerar.`);

  // nomes ambíguos (mesmo nome, uuids diferentes) → fallback por nome é inseguro
  const nomesAmbiguos = Object.keys(nomeParaUuids).filter(
    n => Object.keys(nomeParaUuids[n]).length > 1
  );
  if (nomesAmbiguos.length) {
    log(`⚠️ Nomes ambíguos (resolva manualmente): ${nomesAmbiguos.join(", ")}`);
  }

  // mapa nome -> uuid único (só para nomes não-ambíguos)
  const nomeParaUuid = {};
  Object.keys(nomeParaUuids).forEach(n => {
    const uuids = Object.keys(nomeParaUuids[n]);
    if (uuids.length === 1) nomeParaUuid[n] = uuids[0];
  });

  // resolve uma chave de treino/campeao → uuid
  function resolver(col0, nome) {
    const k = String(col0 || "").trim();
    if (idParaUuid[k]) return idParaUuid[k];
    if (numeroParaUuid[k]) return numeroParaUuid[k];
    // se já for um uuid existente (re-execução), mantém
    if (novosUuidsCol.some(([u]) => u === k)) return k;
    const n = String(nome || "").trim();
    if (n && nomeParaUuid[n]) return nomeParaUuid[n];
    return null; // órfão
  }

  // ---------------------------------------------------------------------------
  // 2. treinos: re-chavear coluna 0 → uuid
  // ---------------------------------------------------------------------------
  const treinosResultado = _rechavear(ss, "treinos", resolver, log);

  // ---------------------------------------------------------------------------
  // 3. campeoes: re-chavear coluna 0 → uuid (sem nome na linha)
  // ---------------------------------------------------------------------------
  const campeoesResultado = _rechavear(ss, "campeoes", (c0) => resolver(c0, ""), log);

  // ---------------------------------------------------------------------------
  // Aplica (se não for dry-run)
  // ---------------------------------------------------------------------------
  if (!dryRun) {
    if (novosUuidsCol.length) {
      usuariosSheet.getRange(2, COL_UUID + 1, novosUuidsCol.length, 1)
        .setValues(novosUuidsCol);
    }
    _aplicarRechaveamento(ss, "treinos", treinosResultado.novaCol0);
    _aplicarRechaveamento(ss, "campeoes", campeoesResultado.novaCol0);
    log("✅ Migração aplicada.");
  } else {
    log("DRY-RUN concluído. Nenhuma alteração foi escrita.");
  }

  log(`Resumo treinos: ${treinosResultado.resolvidos} resolvidos, ` +
      `${treinosResultado.orfaos} órfão(s).`);
  log(`Resumo campeoes: ${campeoesResultado.resolvidos} resolvidos, ` +
      `${campeoesResultado.orfaos} órfão(s).`);
  if (treinosResultado.orfaos || campeoesResultado.orfaos) {
    log("⚠️ Há órfãos — verifique as linhas listadas antes de aplicar.");
  }

  return {
    dryRun,
    uuidsGerados: gerados,
    nomesAmbiguos,
    treinos: { resolvidos: treinosResultado.resolvidos, orfaos: treinosResultado.orfaos },
    campeoes: { resolvidos: campeoesResultado.resolvidos, orfaos: campeoesResultado.orfaos },
  };
}

// Calcula a nova coluna 0 (uuid) sem escrever. Retorna contadores e a coluna.
function _rechavear(ss, nomeAba, resolver, log) {
  const sheet = ss.getSheetByName(nomeAba);
  if (!sheet) {
    log(`(aba "${nomeAba}" não existe — pulando)`);
    return { novaCol0: [], resolvidos: 0, orfaos: 0 };
  }
  const dados = sheet.getDataRange().getValues();
  const novaCol0 = [];
  let resolvidos = 0, orfaos = 0;

  for (let i = 1; i < dados.length; i++) {
    const col0 = dados[i][0];
    const nome = dados[i][1];
    const uuid = resolver(col0, nome);
    if (uuid) {
      novaCol0.push([uuid]);
      resolvidos++;
    } else {
      novaCol0.push([col0]); // mantém valor original
      orfaos++;
      log(`  órfão em "${nomeAba}" linha ${i + 1}: col0="${col0}" nome="${nome}"`);
    }
  }
  return { novaCol0, resolvidos, orfaos };
}

function _aplicarRechaveamento(ss, nomeAba, novaCol0) {
  if (!novaCol0.length) return;
  const sheet = ss.getSheetByName(nomeAba);
  sheet.getRange(2, 1, novaCol0.length, 1).setValues(novaCol0);
}
