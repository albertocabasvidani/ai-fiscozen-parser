# 🤖 AI Fiscozen Parser

Un'applicazione web locale per l'estrazione automatica di dati clienti e integrazione con Fiscozen API, utilizzando Claude AI tramite integrazione manuale copy/paste.

## ✨ Caratteristiche

- 🏠 **Completamente Locale**: Esecuzione su localhost, nessun server esterno
- 🤖 **Integrazione Claude**: Workflow fluido con Claude tramite copy/paste
- 🔒 **Privacy Totale**: Tutti i dati rimangono sul tuo PC
- 💾 **Database Locale**: SQLite per sessioni e log persistenti
- 🎯 **3-Step Workflow**: Estrazione → Ricerca → Creazione
- 🔄 **Fiscozen API**: Integrazione completa per ricerca e creazione clienti
- 📊 **Export Dati**: Esporta sessioni in CSV/JSON

## 🛠️ Stack Tecnologico

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + SQLite
- **Database**: SQLite per cache locale e sessioni
- **AI Integration**: Claude (manuale via copy/paste)

## 🚀 Quick Start

### Installazione One-Shot

```bash
git clone <repo-url>
cd ai-fiscozen-parser
npm run setup
```

Il comando `setup` installerà automaticamente:
- ✅ Dipendenze frontend e backend
- ✅ Database SQLite locale  
- ✅ File di configurazione
- ✅ Build di produzione
- ✅ Test di funzionamento

### Avvio Applicazione

```bash
npm start
```

Questo avvierà:
- 🌐 Frontend: http://localhost:3000
- ⚙️ Backend: http://localhost:3001
- 🗄️ Database: `./database/sessions.db`

## 📋 Come Funziona

### Step 1: Estrazione Dati 📋

1. **Incolla il testo** contenente i dati del cliente
2. **Clicca "Genera Prompt per Claude"** - Si apre un modal con il prompt
3. **Copia il prompt** negli appunti
4. **Apri Claude** (web o desktop) e incolla il prompt
5. **Copia la risposta JSON** di Claude
6. **Torna all'app** e incolla nel campo "Risposta Claude"
7. **Clicca "Processa Dati"** - L'app valida e estrae i dati

### Step 2: Ricerca Cliente 🔍

1. **Inserisci credenziali Fiscozen** (email/password)
2. L'app cerca automaticamente il cliente in Fiscozen
3. **Valida P.IVA** (opzionale) tramite servizi esterni
4. **Risultato**: Cliente esistente o non trovato

### Step 3: Creazione Cliente ✨

- **Se cliente esiste**: Workflow terminato ✅
- **Se cliente non esiste**: Form pre-compilato per creazione
- **Auto-completamento**: CAP → Comune/Provincia automatico
- **Creazione**: Invio dati a Fiscozen e conferma

## 🔧 Configurazione

### Variabili Ambiente (.env.local)

```bash
# API Fiscozen
FISCOZEN_BASE_URL=https://app.fiscozen.it

# Server Ports
FRONTEND_PORT=3000
BACKEND_PORT=3001

# Environment
NODE_ENV=development
```

### Database Locale

Il database SQLite viene creato automaticamente in:
- 📊 **Sessioni**: `./database/sessions.db`
- 📝 **Logs**: Tabella `logs` con tutti gli eventi

## 🎨 UI/UX Features

### 🟢 Modalità Locale

- Indicatore verde "Modalità Locale" sempre visibile
- Tutti i dati restano sul PC dell'utente

### 🔄 Progress Navigation

- Step 1: 📋 Estrazione Dati (Blu quando attivo)
- Step 2: 🔍 Ricerca Cliente (Verde quando completato)  
- Step 3: ✨ Creazione Cliente (Finale)

### 🤖 Claude Integration UI

- **Modal intuitivo** con istruzioni passo-passo
- **Copy to Clipboard** automatico
- **Validazione JSON** con error handling elegante
- **Preview dati estratti** in card strutturata

### 📱 Responsive Design

- Layout ottimizzato per desktop
- Form responsive per mobile
- Tailwind CSS per styling consistente

## 📊 API Endpoints

### Frontend → Backend

- `POST /api/fiscozen/login` - Login Fiscozen
- `GET /api/fiscozen/search` - Ricerca clienti
- `POST /api/fiscozen/validate-vat` - Validazione P.IVA
- `GET /api/fiscozen/location/:cap` - Lookup comune da CAP
- `POST /api/fiscozen/clients` - Creazione cliente
- `POST /api/data/sessions` - Salva sessione
- `GET /api/data/sessions` - Lista sessioni

### Health Check

```bash
curl http://localhost:3001/health
```

## 💾 Export & Import

### Export Sessioni

- **CSV**: `GET /api/data/export/csv`
- **JSON**: `GET /api/data/export/json`

### Struttura Sessione

```json
{
  "id": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",
  "clientData": {
    "ragioneSociale": "...",
    "partitaIVA": "...",
    "indirizzo": "...",
    "..."
  },
  "searchResults": [...],
  "status": "extracted|searched|created",
  "createdClientId": "fiscozen-client-id"
}
```

## 🚨 Troubleshooting

### Setup Issues

```bash
# Reset completo
rm -rf node_modules */node_modules package-lock.json */package-lock.json
npm run setup

# Check versione Node.js (richiesta >= 16)
node --version
```

### Backend non si avvia

```bash
# Test manuale backend
cd backend
npm install
node server.js

# Check porta occupata
lsof -i :3001
```

### Frontend non si connette al Backend

1. ✅ Backend attivo su porta 3001?
2. ✅ CORS configurato correttamente?
3. ✅ `.env.local` presente?

### Claude Integration Issues

1. **Prompt non si copia**: Provare copy manuale dal modal
2. **JSON non valido**: Assicurarsi di copiare solo il JSON da Claude
3. **Campi mancanti**: Claude potrebbe non aver trovato tutti i dati

## 📈 Development

### Sviluppo Frontend

```bash
cd frontend
npm run dev
```

### Sviluppo Backend

```bash  
cd backend
npm run dev  # con nodemon
```

### Struttura Progetto

```
ai-fiscozen-parser/
├── frontend/                # React + TypeScript App
│   ├── src/
│   │   ├── components/      # Componenti React
│   │   │   ├── ExtractStep.tsx
│   │   │   ├── SearchStep.tsx  
│   │   │   ├── CreateStep.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── ClaudePromptModal.tsx
│   │   ├── services/        # API clients
│   │   │   ├── claudeIntegration.ts
│   │   │   └── fiscozenAPI.ts
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx          # Main App
├── backend/                 # Node.js API Server
│   ├── routes/              # API Routes
│   │   ├── fiscozen.js      # Fiscozen API proxy
│   │   └── data.js          # Local data management
│   ├── database/            # Database setup
│   │   └── sqlite.js        # SQLite connection
│   ├── middleware/          # Express middleware
│   └── server.js            # Main server
├── scripts/                 # Setup/Start scripts
│   ├── setup.js             # Auto setup
│   └── start.js             # Startup script
├── database/                # SQLite files
│   └── sessions.db          # Created automatically
├── logs/                    # Application logs
├── .env.local              # Configuration
└── package.json            # Main package file
```

## 🔐 Security & Privacy

- ✅ **Zero Cloud Data**: Nessun dato inviato a servizi esterni (tranne Fiscozen)
- ✅ **Local Storage**: Database SQLite sul PC utente
- ✅ **No API Keys**: Nessuna chiave Anthropic richiesta
- ✅ **HTTPS**: Comunicazione sicura con Fiscozen
- ✅ **Session Management**: Token Fiscozen gestiti localmente

## 📞 Support

- 🐛 **Bug Report**: Apri issue su GitHub
- 💡 **Feature Request**: Discussions su GitHub  
- 📖 **Documentation**: Questo README + code comments

## 🎯 Roadmap

- [ ] 📱 Mobile UI ottimizzata
- [ ] 🔄 Auto-sync con Claude Desktop (se possibile)
- [ ] 📊 Dashboard analytics sessioni
- [ ] 🔐 Encryption database locale
- [ ] 🌍 Supporto multi-lingua
- [ ] 📄 PDF export report
- [ ] 🔌 Plugin system per altri CRM

---

## 💡 Perché questa implementazione?

### ✅ **Vantaggi**

- **Zero Costi AI**: Usa il tuo abbonamento Claude esistente
- **100% Locale**: Nessun deploy, nessun server esterno  
- **Setup Rapido**: Un comando e funziona tutto
- **Privacy Totale**: Tutti i dati restano sul tuo PC
- **Fiscozen Ready**: API reali funzionanti
- **Persistent Storage**: SQLite per sessioni durature

### 🎯 **Use Cases Ideali**

- Commercialisti con clienti ricorrenti
- Aziende con acquisizioni massive
- Consulenti con workflow ripetitivi
- Startup con budget limitati
- Privacy-conscious users

---

**🚀 Pronto per processare i tuoi clienti con AI!**

*Made with ❤️ for local development and privacy*