# 🤝 Contributing to no-peita-bot

Thanks for wanting to help! 💪 This guide explains how the project works and how to send your changes.

---

## 🧭 Overview

The project has **two parts** living in the same repository:

| Part | Folder | What it is |
|------|--------|------------|
| **Bot (Node/TypeScript)** | `src/` | Connects to WhatsApp Web and forwards the commands. Runs on Railway. |
| **Backend (Google Apps Script)** | `apps-script/` | Where the real logic lives (rankings, registration, the spreadsheet). Published automatically. |

> ⚠️ `apps-script/` is the backend's **source of truth**. Edit the files here in the repo — do **not** edit them in the Apps Script web editor, because the automatic deploy overwrites them.

---

## 🔄 Contribution flow

The `main` branch is **protected**. Nobody pushes to it directly (except the maintainer). Every change goes through a **Pull Request**:

1. **Fork** the repository (or create a branch, if you're a collaborator).
2. Create a branch off `main`:
   ```bash
   git checkout -b my-feature
   ```
3. Make your changes and commits.
4. Open a **Pull Request** against `main`.
5. The PR can only be merged after **maintainer approval** ([@salesrafa](https://github.com/salesrafa)) — that's what `CODEOWNERS` enforces.

On every PR, the **tests run automatically** (GitHub Actions). When the PR is merged, the deploy happens **on its own**:
- `src/**` changed → **Railway** redeploys the bot;
- `apps-script/**` changed → a **GitHub Action** publishes to Apps Script.

Both deploys are gated on the test suite. As a contributor you **don't need to deploy** — just open the PR. 🎉

---

## 🛠️ Running locally

### 1. Install dependencies
```bash
npm install
```

### 2. Configure `.env`
```bash
cp .env.example .env
```
Fill in:

| Variable | Description |
|----------|-------------|
| `URL` | The Apps Script Web App `/exec` URL (the backend). |
| `ENVIRONMENT` | `dev` (only replies to `ALLOWED_CONTACTS`) or `prod` (replies to everyone + enables `/qr`). |
| `SCRIPT_AUTH_TOKEN` | Token shared with the backend. **Required** — without it the Apps Script rejects the calls. |
| `ALLOWED_CONTACTS` | Contacts/groups allowed in `dev` mode, comma-separated (e.g. `5511...@c.us,1203...@g.us`). |

> 🔐 `URL` and `SCRIPT_AUTH_TOKEN` point to the production backend and are **not** in the repo. To run the full end-to-end flow, ask the maintainer for these values **or** create your own copy of the Apps Script (clonable via [clasp](https://github.com/google/clasp) from `apps-script/`) and use its URL/token.

### 3. Run with auto-reload
```bash
npm run dev
```

### 4. Run the tests
```bash
npm test
```

### 5. Build (type check)
```bash
npm run build
```

---

## ✍️ Backend (Apps Script) with clasp

If you're touching `apps-script/`:

```bash
npm install -g @google/clasp   # or use it via npx
clasp login                     # authenticate with your Google account
cd apps-script
# edit the .js files, commit and open the PR
```

Don't run `clasp deploy` / "New deployment" in the editor — the deploy is done by CI re-publishing **the same deployment every time** (so the URL doesn't change).

---

## ✅ Conventions

- **The code, comments, commits and PRs are in English.** The user-facing strings (bot replies, `/ajuda` text), commands and spreadsheet tab names stay in pt-BR.
- **One PR per topic** — easier to review.
- Clear commit messages in the imperative (e.g. `feat: add /streak command`).
- Run `npm test` and `npm run build` before opening the PR (tests green, no type errors).
- **Never** commit secrets (`.env`, tokens, real phone numbers). `.env` is already in `.gitignore`.
- Update `/ajuda` (in `apps-script/handlers.js`) if you add/change commands.

---

## 🐛 Found a bug or have an idea?

Open an [issue](https://github.com/salesrafa/no-peita-bot/issues) describing it. Inside the bot you can also use `/ticket sua mensagem`. 🙌
