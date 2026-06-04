# 🤝 Contribuindo com o no-peita-bot

Valeu por querer ajudar! 💪 Esse guia explica como o projeto funciona e como mandar suas mudanças.

---

## 🧭 Visão geral

O projeto tem **duas partes** que vivem nesse mesmo repositório:

| Parte | Pasta | O que é |
|------|-------|---------|
| **Bot (Node/TypeScript)** | `src/` | Conecta no WhatsApp Web e encaminha os comandos. Roda no Railway. |
| **Backend (Google Apps Script)** | `apps-script/` | Onde a lógica de verdade acontece (rankings, cadastro, planilha). Publicado automaticamente. |

> ⚠️ O `apps-script/` é a **fonte da verdade** do backend. Edite os arquivos aqui no repo — **não** edite pelo editor web do Apps Script, porque o deploy automático sobrescreve.

---

## 🔄 Fluxo de contribuição

A branch `main` é **protegida**. Ninguém faz push direto nela (exceto o mantenedor). Toda mudança entra por **Pull Request**:

1. **Fork** o repositório (ou crie uma branch, se você for colaborador).
2. Crie uma branch a partir da `main`:
   ```bash
   git checkout -b minha-feature
   ```
3. Faça suas mudanças e commits.
4. Abra um **Pull Request** para a `main`.
5. O PR só pode ser mergeado após **aprovação do mantenedor** ([@salesrafa](https://github.com/salesrafa)) — é o que o `CODEOWNERS` exige.

Quando o PR é mergeado, o deploy acontece **sozinho**:
- mudou `src/**` → o **Railway** redeploya o bot;
- mudou `apps-script/**` → um **GitHub Action** publica no Apps Script.

Você, como contribuidor, **não precisa fazer deploy** — só abrir o PR. 🎉

---

## 🛠️ Rodando localmente

### 1. Instale as dependências
```bash
npm install
```

### 2. Configure o `.env`
```bash
cp .env.example .env
```
Preencha:

| Variável | Descrição |
|----------|-----------|
| `URL` | URL `/exec` do Web App do Apps Script (o backend). |
| `ENVIROMENT` | `dev` (responde só aos contatos de `ALLOWED_CONTACTS`) ou `prod` (responde a todos + ativa `/qr`). |
| `SCRIPT_AUTH_TOKEN` | Token compartilhado com o backend. **Obrigatório** — sem ele o Apps Script rejeita as chamadas. |
| `ALLOWED_CONTACTS` | Contatos/grupos permitidos no modo `dev`, separados por vírgula (ex: `5511...@c.us,1203...@g.us`). |

> 🔐 `URL` e `SCRIPT_AUTH_TOKEN` apontam pro backend de produção e **não ficam no repo**. Para rodar o fluxo completo de ponta a ponta, peça esses valores ao mantenedor **ou** crie sua própria cópia do Apps Script (clonável via [clasp](https://github.com/google/clasp) a partir de `apps-script/`) e use a URL/token dela.

### 3. Rode com reload automático
```bash
npm run dev
```

### 4. Compile (checagem de tipos)
```bash
npm run build
```

---

## ✍️ Backend (Apps Script) com clasp

Se for mexer em `apps-script/`:

```bash
npm install -g @google/clasp   # ou use via npx
clasp login                     # autentica na sua conta Google
cd apps-script
# edite os .js, faça commit e abra o PR
```

Não rode `clasp deploy` / "Nova implantação" no editor — o deploy é feito pelo CI re-publicando **sempre a mesma implantação** (pra URL não mudar).

---

## ✅ Boas práticas

- **Um PR por assunto** — facilita a revisão.
- Mensagens de commit claras e no presente (ex: `feat: adiciona comando /streak`).
- Rode `npm run build` antes de abrir o PR (sem erros de tipo).
- **Nunca** commite segredos (`.env`, tokens, números de telefone reais). O `.env` já está no `.gitignore`.
- Atualize o `/ajuda` (em `apps-script/Código.js`) se adicionar/alterar comandos.

---

## 🐛 Encontrou um bug ou tem uma ideia?

Abra uma [issue](https://github.com/salesrafa/no-peita-bot/issues) descrevendo o caso. Dentro do próprio bot também dá pra usar `/ticket sua mensagem`. 🙌
