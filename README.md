# 🤖 AI Fiscozen Parser

Un'applicazione web locale per la creazione automatica di fatture dai dati di pagamento utilizzando AI e integrandosi con l'API Fiscozen. Supporta integrazione OpenAI per l'estrazione automatica dei dati con fallback regex quando non disponibile.

## ✨ Caratteristiche

- 🏠 **Completamente Locale**: Esecuzione su localhost, nessun server esterno
- 🤖 **AI Integration**: OpenAI GPT-4o-mini per estrazione automatica dati + fallback regex
- 🔄 **Triple Workflow**: Semplificato / Automatico / Manuale per massima flessibilità
- 🎯 **Smart Client Search**: Ricerca intelligente fuzzy matching nel database Fiscozen
- 🔒 **Privacy Totale**: Tutti i dati rimangono sul tuo PC
- 💾 **Database Locale**: SQLite per sessioni e log persistenti
- 📄 **Invoice Creation**: Creazione fatture complete con integrazione Fiscozen API
- 📊 **Session Management**: Autenticazione basata su sessioni con token CSRF

## 🛠️ Stack Tecnologico

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + SQLite
- **Database**: SQLite per cache locale e sessioni
- **AI Integration**: OpenAI GPT-4o-mini API + Regex fallback

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
- 🌐 Frontend: http://localhost:5173 (Vite dev server)
- ⚙️ Backend: http://localhost:3001
- 🗄️ Database: `./backend/database/sessions.db`

## 📋 Come Funziona

L'applicazione offre **3 modalità workflow** per massima flessibilità:

### ⚡ Flusso Semplificato (RACCOMANDATO)

1. **Input Transazione**: Inserisci importo, nome cliente, data, descrizione
2. **Ricerca Smart**: Ricerca intelligente nel database Fiscozen con fuzzy matching
3. **Selezione Cliente**: Se trovato → procedi | Se non trovato → raccogli dati cliente
4. **AI Processing**: L'AI analizza e organizza i dati per l'API Fiscozen
5. **Review Dati**: Conferma le informazioni cliente parsate dall'AI
6. **Creazione Cliente**: Auto-creazione in Fiscozen se necessario
7. **Fattura Draft**: Creazione fattura in bozza con impostazioni predefinite

### 💰 Da Pagamento (Automatico)

1. **Input Pagamento**: Incolla testo pagamento (email, ricevute, notifiche)
2. **Estrazione AI**: OpenAI GPT-4o-mini estrae automaticamente dati cliente/fattura
3. **Review Dati**: Visualizzazione dati transazione con status estrazione cliente
4. **Editing Cliente**: Form cliente separato con dati transazione preservati
5. **Preview Fattura**: Anteprima fattura completa con tutti i dati
6. **Creazione**: Sottomissione finale all'API backend

### 🔧 Manuale (4-step wizard)

1. **ExtractStep**: Inserimento manuale o generazione prompt Claude
2. **SearchStep**: Ricerca cliente nel database Fiscozen
3. **CreateStep**: Creazione nuovo cliente se necessario  
4. **InvoiceStep**: Creazione fattura con voci, totali, codici ATECO

## 🔧 Configurazione

### Variabili Ambiente (frontend/.env.local)

```bash
# OpenAI API (Opzionale - usa fallback regex se non presente)
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# Backend URL
VITE_BACKEND_URL=http://localhost:3001

# Fiscozen API
FISCOZEN_BASE_URL=https://app.fiscozen.it

# Environment
NODE_ENV=development
```

**Nota**: Senza `VITE_OPENAI_API_KEY`, l'app funziona comunque usando regex fallback + form manuali.

### Database Locale

Il database SQLite viene creato automaticamente in:
- 📊 **Sessioni**: `./backend/database/sessions.db`
- 📝 **Logs**: Tabella `logs` con tutti gli eventi API e workflow

## 🎨 UI/UX Features

### 🟢 Modalità Locale

- Indicatore verde "Modalità Locale" sempre visibile
- Tutti i dati restano sul PC dell'utente

### 🔄 Workflow Mode Selector

- ⚡ **Flusso Semplificato**: Verde quando attivo (RACCOMANDATO)
- 💰 **Da Pagamento**: Blu quando attivo (Automatico)  
- 🔧 **Manuale**: Arancione quando attivo (4-step wizard)

### 🤖 AI Integration UI

- **OpenAI Status Indicator**: Mostra stato configurazione API key
- **Smart Data Extraction**: Parsing automatico testi pagamento
- **Fallback Regex**: Pattern matching locale per importi, P.IVA, aziende
- **Manual Fallback Forms**: Form completi quando AI non disponibile

### 📱 Responsive Design

- Layout ottimizzato per desktop
- Form responsive per mobile
- Tailwind CSS per styling consistente

## 📊 API Endpoints

### Frontend → Backend

- `POST /api/fiscozen/login` - Login Fiscozen
- `GET /api/fiscozen/search` - Ricerca clienti
- `POST /api/fiscozen/clients` - Creazione cliente
- `POST /api/fiscozen/invoices` - Creazione fattura
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
3. ✅ `frontend/.env.local` presente con `VITE_BACKEND_URL`?

### AI Integration Issues

1. **OpenAI API Error**: Verifica `VITE_OPENAI_API_KEY` in `.env.local`
2. **Network Error on Login**: Fiscozen API potrebbe essere offline
3. **Extraction Failed**: Usa fallback regex o modalità manuale
4. **Missing Data**: AI potrebbe non aver trovato tutti i campi necessari

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
│   │   │   ├── SimpleWorkflow.tsx    # 🌟 CURRENT - Flusso semplificato
│   │   │   ├── FastWorkflow.tsx      # 🌟 CURRENT - Da pagamento
│   │   │   ├── ExtractStep.tsx       # Manual workflow step 1
│   │   │   ├── SearchStep.tsx        # Manual workflow step 2
│   │   │   ├── CreateStep.tsx        # Manual workflow step 3
│   │   │   ├── InvoiceStep.tsx       # Manual workflow step 4
│   │   │   ├── Navigation.tsx        # Step navigation
│   │   │   └── LoginModal.tsx        # Fiscozen authentication
│   │   ├── services/        # API clients
│   │   │   ├── aiService.ts          # 🤖 OpenAI integration
│   │   │   └── fiscozenAPI.ts        # Fiscozen API client
│   │   ├── types/           # TypeScript types
│   │   │   └── client.ts             # Client/Invoice types
│   │   └── App.tsx          # Main App with mode selector
├── backend/                 # Node.js API Server
│   ├── routes/              # API Routes
│   │   ├── fiscozen.js      # 🔄 Fiscozen API proxy + Invoice creation
│   │   └── data.js          # Local data management
│   ├── database/            # Database setup
│   │   ├── sqlite.js        # SQLite connection
│   │   └── sessions.db      # 💾 Created automatically
│   ├── middleware/          # Express middleware
│   └── server.js            # Main server
├── test-full-workflow.js    # 🧪 E2E Playwright testing
├── test-credentials.json    # 🔐 Fiscozen credentials (gitignored)
├── API_SETUP.md            # OpenAI configuration guide
├── fiscozen_endpoints.md   # Fiscozen API documentation
├── frontend/.env.local     # Frontend configuration
└── package.json            # Main package file
```

## 🔐 Security & Privacy

- ✅ **Zero Cloud Data**: Nessun dato inviato a servizi esterni (tranne OpenAI opzionale + Fiscozen)
- ✅ **Local Storage**: Database SQLite sul PC utente  
- ✅ **API Keys Optional**: OpenAI opzionale, funziona con fallback regex
- ✅ **HTTPS**: Comunicazione sicura con Fiscozen + OpenAI
- ✅ **Session Management**: Cookie CSRF + token Fiscozen gestiti localmente
- ✅ **Invoice Status**: Fatture create in stato UNPAID (non automaticamente pagate)

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

- **AI Integration**: OpenAI GPT-4o-mini con costi minimi (~$0.001-0.005/transazione)
- **100% Locale**: Nessun deploy, nessun server esterno  
- **Setup Rapido**: Un comando e funziona tutto
- **Privacy Totale**: Tutti i dati restano sul tuo PC
- **Fiscozen Ready**: API reali funzionanti con creazione fatture complete
- **Triple Workflow**: Modalità semplificata/automatica/manuale per ogni scenario
- **Smart Fallback**: Funziona anche senza OpenAI API key

### 🎯 **Use Cases Ideali**

- Commercialisti con clienti ricorrenti
- Aziende con acquisizioni massive
- Consulenti con workflow ripetitivi
- Startup con budget limitati
- Privacy-conscious users

---

**🚀 Pronto per processare i tuoi clienti con AI!**

*Made with ❤️ for local development and privacy*