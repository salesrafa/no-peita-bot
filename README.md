# 🤖 Bot de Treino no WhatsApp

Um bot de WhatsApp que registra treinos, calcula rankings mensais, mostra estatísticas curiosas (como treinos em lua cheia 🌕 e dias ímpares 🗓️) e interage diretamente com uma planilha do Google Sheets.

---

## 🚀 Tecnologias

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) — integração com WhatsApp Web
- TypeScript — linguagem principal da aplicação
- Express.js — servidor web leve
- Google Apps Script — backend para persistência de dados
- Google Sheets — armazenamento dos dados
- Railway — deploy e hospedagem
- Nodemon + ts-node — hot reload no desenvolvimento
- lunarphase-js — para detectar fases da lua 🌕

---

## 📁 Estrutura do Projeto

```
.
├── src/
│   ├── index.ts            # Entry point
│   ├── config/             # Configuração e variáveis de ambiente
│   ├── routes/             # Rotas (ex: /qr para escanear o código)
│   └── services/           # Lógica principal (whatsapp, API, cache)
├── dist/                   # Arquivos compilados (gerado pelo TypeScript)
├── .env.example            # Arquivo exemplo de variáveis de ambiente
├── nodemon.json            # Configuração de hot reload
├── Dockerfile              # Arquivo de configuração Docker
├── tsconfig.json           # Configuração do TypeScript
└── package.json
```

---

## 🛠️ Instalação e Execução

### 1. Clone o projeto

```bash
git clone https://github.com/salesrafa/no-peita-bot.git
cd seu-repo
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Copie o arquivo  `.env.example` e preencha as variáveis

```bash
cp .env.example .env
```
Obs: `ENVIROMENT=prod` ativa o modo de QR remoto (/qr)

### 4. Execute localmente com reload automático

```bash
npm run dev
```

### 5. Compile para produção

```bash
npm run build
```

### 6. Rode em produção (ou Railway)

```bash
npm start
```

---

## 🧪 Principais Comandos do Bot

- **`/cadastro Seu Nome`** — cadastra seu número para poder utilizar os outros comandos.  
- **`/pontuar`** — registra um treino para o dia atual (apenas 1 por dia).  
- **`/retroativo DD/MM/AAAA`** — registra um treino em uma data passada (sem duplicar dias).  
- **`/hoje`** — lista quem já registrou treino hoje.  
- **`/ranking`** — mostra o ranking de treinos do mês atual (com critérios de desempate).  
- **`/ranking MM/AAAA`** — mostra o ranking de treinos de um mês específico.  
- **`/eu`** — lista os treinos que você registrou no mês atual.  
- **`/campeoes`** — mostra o ranking de campeões com total de títulos conquistados (🏆).  
- **`/rankingmisterioso`** — mostra o ranking considerando apenas treinos feitos em *dias ímpares com Lua Cheia* 🌕.  
- **`/ticket sua mensagem`** — abre um ticket com uma sugestão, dúvida ou solicitação. Ele será criado automaticamente com status *pendente*.  
- **`/ticketstatus ID`** — consulta o status de um ticket existente pelo número do ID.  
- **`/ajuda`** — exibe a lista completa de comandos disponíveis.

---

## 🌍 Deploy na Railway

> A Railway detecta o comando `npm start` ou um `Dockerfile`.

1. Faça login em [https://railway.app](https://railway.app)
2. Crie um novo projeto e conecte o GitHub (se aplicável)
3. Configure as variáveis de ambiente (`.env`)
4. Acesse o QR Code via `/qr` para escanear o WhatsApp (modo `prod`)

---

## 📄 Licença

Este projeto é open-source e distribuído sob a [MIT License](LICENSE).

---

## 🧙 Feito com carinho e curiosidade astronômica ✨