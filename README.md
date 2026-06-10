# 🤖 WhatsApp Workout Bot

A WhatsApp bot that logs workouts, computes monthly rankings, shows fun stats (like full-moon 🌕 and odd-day 🗓️ workouts) and talks directly to a Google Sheets spreadsheet.

---

## 🚀 Tech

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) — WhatsApp Web integration
- TypeScript — the app's main language
- Express.js — lightweight web server
- Google Apps Script — backend for data persistence
- Google Sheets — data storage
- Railway — deploy and hosting
- Nodemon + ts-node — hot reload in development
- lunarphase-js — to detect moon phases 🌕

---

## 📁 Project structure

```
.
├── src/                    # Node/TypeScript bot
│   ├── index.ts            # Entry point
│   ├── config/             # Config and environment variables
│   ├── core/               # Pure logic (unit-tested)
│   ├── routes/             # Routes (e.g. /qr to scan the code)
│   └── services/           # Main logic (whatsapp, API, admins)
├── apps-script/            # Google Apps Script backend
│   ├── core/               # Pure logic (unit-tested)
│   └── *.js                # Handlers, sheet access, router
├── test/                   # Vitest unit + integration tests
├── .env.example            # Example environment file
├── tsconfig.json           # TypeScript config
└── package.json
```

---

## 🛠️ Setup and run

### 1. Clone the project

```bash
git clone https://github.com/salesrafa/no-peita-bot.git
cd no-peita-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Copy `.env.example` and fill in the variables

```bash
cp .env.example .env
```
Note: `ENVIRONMENT=prod` enables the remote QR mode (`/qr`).

### 4. Run locally with auto-reload

```bash
npm run dev
```

### 5. Run the tests

```bash
npm test
```

### 6. Build for production

```bash
npm run build
```

### 7. Run in production (or Railway)

```bash
npm start
```

---

## 🧪 Main bot commands

> Commands and their arguments are typed in Portuguese (that's the bot's user interface).

- **`/cadastro Seu Nome`** — registers your number so you can use the other commands.
- **`/pontuar`** — logs a workout for the current day (only 1 per day).
- **`/retroativo DD/MM/AAAA`** — logs a workout on a past date (no duplicate days).
- **`/hoje`** — lists who already logged a workout today.
- **`/ranking`** — monthly workout ranking (with tiebreakers).
- **`/ranking MM/AAAA`** — ranking for a specific month.
- **`/rankingano`** (or **`/rankingano AAAA`**) — cumulative ranking for the current (or a specific) year.
- **`/anografico`** (or **`/anografico AAAA`**) — a chart with the top 10 athletes of the year.
- **`/wrapped`** (or **`/wrapped AAAA`**) — year in review: champions per month and the medals board.
- **`/eu`** — your workouts in the current month, plus your "animal of the month" badge.
- **`/meta`** (or **`/meta NÚMERO`**) — shows your annual goal progress, or sets it.
- **`/campeoes`** — champions ranking with total titles won (🏆).
- **`/rankingolimpiada`** (or **`/rankingolimpiada AAAA`**) — medals board (🥇🥈🥉) for the year, only finished months.
- **`/rankingmisterioso`** — ranking counting only workouts on *odd days with a Full Moon* 🌕.
- **`/ticket sua mensagem`** — opens a ticket (suggestion, question or request), created with status *pendente*.
- **`/tickets`** — lists all of your tickets and their status.
- **`/ticketstatus ID`** — checks the status of a ticket by its ID.
- **`/apagar`** — (admins only) deletes a workout; reply to the `/pontuar` message and send `/apagar`.
- **`/ajuda`** — shows the full list of available commands.

---

## 🌍 Deploy on Railway

> Railway detects the `npm start` command or a `Dockerfile`.

1. Sign in at [https://railway.app](https://railway.app)
2. Create a new project and connect GitHub (if applicable)
3. Configure the environment variables (`.env`)
4. Open the QR Code via `/qr` to link WhatsApp (`prod` mode)

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

---

## 🧙 Made with care and astronomical curiosity ✨
