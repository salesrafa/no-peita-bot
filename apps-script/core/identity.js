/**
 * Pure functions (no I/O) — unit-testable. Functional core.
 */

// Resolves the canonical key (uuid) of a workout row. Uses the column-0 value
// (legacy id_whatsapp or uuid) and, as a fallback, the name (column 1) —
// needed for workouts whose old id_whatsapp no longer exists in "usuarios"
// and for the "treinos-AB" sheet (name only). If nothing matches, returns the
// raw value so the row isn't lost.
function resolveWorkoutUuid(col0Value, name, maps) {
  const key = String(col0Value || "").trim();
  if (maps.byKey[key]) return maps.byKey[key];
  const n = String(name || "").trim();
  if (n && maps.byName[n]) return maps.byName[n];
  return key || n;
}
