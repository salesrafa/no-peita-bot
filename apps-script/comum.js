/**
 * Shared constants and helpers.
 * (In Apps Script all .gs files share a single global scope, so these names
 *  are available from any file.)
 */

// Spreadsheet tab names — single source of truth (avoids magic strings).
// Values stay in pt-BR because they are the real tab names in the spreadsheet.
const SHEETS = {
  USERS: "usuarios",
  WORKOUTS: "treinos",
  WORKOUTS_AB: "treinos-AB",
  TICKETS: "tickets",
  CHAMPIONS: "campeoes",
  GOALS: "metas",
  FULL_MOON: "lua_cheia",
  MESSAGES: "mensagens",
};

// Column indexes (0-based) of the main sheets — documents the schema.
const WORKOUT_COL = { UUID: 0, NAME: 1, DATE: 2, MSG_ID: 3 };
const USER_COL = { ID: 0, NAME: 1, DATE: 2, ROLE: 3, NUMBER: 4, UUID: 5, GOAL: 6 };

// Reused user-facing message (kept in pt-BR — shown to the user).
const MSG_NOT_REGISTERED = "🚫 Você ainda não está cadastrado. Use: /cadastro Seu Nome";

// True if the user (object from getUserByIdentifier) has the admin role.
function isAdmin(user) {
  return !!user && String(user.role || "").toLowerCase() === "admin";
}
