/**
 * Pure functions (no I/O) — unit-testable. Functional core.
 */

// Secondary, individual, non-comparative ranking: each tier requires a fixed
// number of workouts in the month, ordered from weakest to legendary. The tier
// reflects only the person's own performance — it doesn't depend on others.
const ANIMALS = [
  { min: 0,  emoji: "🥚", name: "Ovo",       vibe: "ainda não chocou no mês" },
  { min: 1,  emoji: "🐔", name: "Frango",    vibe: "tá começando!" },
  { min: 2,  emoji: "🐢", name: "Tartaruga", vibe: "devagar, mas não parou" },
  { min: 3,  emoji: "🐰", name: "Coelho",    vibe: "ligou o foguinho" },
  { min: 5,  emoji: "🐶", name: "Cachorro",  vibe: "animado e fiel ao treino" },
  { min: 7,  emoji: "🦊", name: "Raposa",    vibe: "esperto, achou o ritmo" },
  { min: 9,  emoji: "🐗", name: "Javali",    vibe: "brutão, entrou com tudo" },
  { min: 12, emoji: "🐺", name: "Lobo",      vibe: "entrou na alcateia" },
  { min: 15, emoji: "🐆", name: "Onça",      vibe: "predador ágil" },
  { min: 18, emoji: "🐅", name: "Tigre",     vibe: "fera de respeito" },
  { min: 21, emoji: "🐻", name: "Urso",      vibe: "força bruta" },
  { min: 25, emoji: "🦁", name: "Leão",      vibe: "rei do mês" },
  // secret: never previewed (help/notice/"remaining X"); only shows up once
  // someone actually earns it — it's the surprise at the top.
  { min: 29, emoji: "🐉", name: "Dragão",    vibe: "lendário, fora da curva", secret: true },
];

// Given the month's workout total, returns { current, next, remaining }.
// `next` is null when the top tier (Dragão) has been reached.
function classifyAnimal(total) {
  const n = Number(total) || 0;
  let idx = 0;
  for (let i = 0; i < ANIMALS.length; i++) {
    if (n >= ANIMALS[i].min) idx = i; else break;
  }
  const current = ANIMALS[idx];
  const next = idx < ANIMALS.length - 1 ? ANIMALS[idx + 1] : null;
  const remaining = next ? next.min - n : 0;
  return { current, next, remaining };
}
