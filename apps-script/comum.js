/**
 * Constantes e helpers compartilhados pelo projeto.
 * (No Apps Script todos os .gs dividem o mesmo escopo global, então estes
 *  nomes ficam disponíveis em qualquer arquivo.)
 */

// Nomes das abas da planilha — fonte única de verdade (evita strings mágicas).
const ABAS = {
  USUARIOS: "usuarios",
  TREINOS: "treinos",
  TREINOS_AB: "treinos-AB",
  TICKETS: "tickets",
  CAMPEOES: "campeoes",
  METAS: "metas",
  LUA_CHEIA: "lua_cheia",
  MENSAGENS: "mensagens",
};

// Índices de coluna (0-based) das principais abas — documenta o schema.
const TREINO = { UUID: 0, NOME: 1, DATA: 2, MSG_ID: 3 };
const USUARIO = { ID: 0, NOME: 1, DATA: 2, ROLE: 3, NUMERO: 4, UUID: 5, META: 6 };

// Mensagens reutilizadas.
const MSG_NAO_CADASTRADO = "🚫 Você ainda não está cadastrado. Use: /cadastro Seu Nome";

// True se o usuário (objeto de getUsuarioPorIdentificador) tem papel de admin.
function isAdmin(usuario) {
  return !!usuario && String(usuario.role || "").toLowerCase() === "admin";
}
