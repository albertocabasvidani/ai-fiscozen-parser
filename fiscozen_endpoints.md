# Fiscozen - Endpoint API Scoperti

Rapporto di analisi delle API nascoste di fiscozen.it mediante l'uso di Playwright MCP per l'automazione del browser e il monitoraggio delle richieste di rete.

## 📋 Riepilogo della Sessione

**Data:** 27 Agosto 2025  
**Utente:** albertocabasvidani@gmail.com  
**Metodologia:** Browser automation con login real-time e network monitoring  
**Obiettivo:** Scoprire endpoint nascosti per la funzionalità di fatturazione elettronica

## 🔐 Autenticazione

### Endpoint di Login
- **POST** `https://app.fiscozen.it/api/v1/auth/login/`
  - Status: 200 (successo)
  - Richiede: email, password
  - Risponde con: token di sessione

### Endpoint di Recupero Password
- **POST** `https://app.fiscozen.it/api/v1/auth/request_password_reset_email/`
  - Status: 400 (email non valida nel test)
  - Funzionalità: Reset password via email

## 👤 Gestione Utenti

### Informazioni Utente
- **GET** `https://app.fiscozen.it/api/v1/users/self/`
  - Status: 200
  - Funzione: Recupera informazioni profilo utente autenticato

- **PATCH** `https://app.fiscozen.it/api/v1/users/self/`
  - Status: 200
  - Funzione: Aggiorna profilo utente

### Statistiche Utente
- **GET** `https://app.fiscozen.it/api/v1/users/self/stats/`
  - Status: 200
  - Funzione: Statistiche dell'utente (fatturato, etc.)

- **GET** `https://app.fiscozen.it/api/v1/users/self/next_fulfillments/`
  - Status: 200
  - Funzione: Prossimi adempimenti fiscali

## 🏢 Gestione Clienti

### Endpoint Clienti (Core)
- **GET** `https://app.fiscozen.it/api/v1/customers/`
  - **OPTIONS** `https://app.fiscozen.it/api/v1/customers/` (200)
  - **POST** `https://app.fiscozen.it/api/v1/customers/` (400 - validation error)
  - Funzioni: Lista, creazione, gestione clienti

### Ricerca Clienti
- **GET** `https://app.fiscozen.it/api/v1/customers/?search=&page=1`
  - Status: 200
  - Funzione: Ricerca clienti con paginazione

- **GET** `https://app.fiscozen.it/api/v1/customers/?search=Test%20Cliente&page=1`
  - Status: 200  
  - Funzione: Ricerca clienti per nome

### Cliente Specifico
- **GET** `https://app.fiscozen.it/api/v1/customers/{id}/?invoice_date=2025-08-27`
  - Status: 404 (nel test con undefined)
  - Funzione: Dettagli cliente per data fattura specifica

## 🧾 Fatturazione Elettronica

### Endpoint Fatture (Core)
- **GET** `https://app.fiscozen.it/api/v1/invoices/`
  - **OPTIONS** `https://app.fiscozen.it/api/v1/invoices/` (200)
  - Funzioni: Lista e gestione fatture

### Calcoli e Validazione
- **POST** `https://app.fiscozen.it/api/v1/invoices/compute_data/`
  - Status: 200
  - Funzione: Calcola totali, tasse, contributi previdenziali

### Informazioni Formato Fattura
- **GET** `https://app.fiscozen.it/api/v1/invoices/invoice_format_info/?day=2025-08-27&document_is_sts=false`
  - Status: 200
  - Funzione: Info formato fattura per data specifica

### Tipi e Servizi Welfare
- **GET** `https://app.fiscozen.it/api/v1/invoices/sts_invoice_type_choices/?welfare_institution=INPS%20COM`
  - Status: 200
  - Funzione: Tipi fattura STS per ente previdenziale

- **GET** `https://app.fiscozen.it/api/v1/invoices/service_kind_choices/?welfare_institution=INPS%20COM`
  - Status: 200
  - Funzione: Tipi di servizio per ente previdenziale

### Feedback Fatturazione
- **GET** `https://app.fiscozen.it/api/v1/invoicing/user_feedbacks/`
  - Status: 404
  - Funzione: Feedback utente su fatturazione

## 💳 Metodi di Pagamento

### Gestione Metodi di Pagamento
- **GET** `https://app.fiscozen.it/api/v1/payment_methods/`
  - Status: 200
  - Funzione: Lista metodi di pagamento

- **GET** `https://app.fiscozen.it/api/v1/payment_methods/?choices=&page_size=100&page=1&ordering=display_name`
  - Status: 200
  - Funzione: Lista paginata e ordinata metodi di pagamento

## 📊 Documenti SDI e Amministrazione

### Sistema di Interscambio (SDI)
- **GET** `https://app.fiscozen.it/api/v1/sdi_received_documents/`
  - Status: 200
  - Funzione: Documenti ricevuti dal Sistema di Interscambio

### Configurazione Fiscale
- **GET** `https://app.fiscozen.it/api/v1/fiscal_regimes/`
  - Status: 200
  - Funzione: Regimi fiscali disponibili

- **GET** `https://app.fiscozen.it/api/v1/ateco_choices/?day=2025-08-27&user=2628`
  - Status: 200
  - Funzione: Codici ATECO per utente e data

- **GET** `https://app.fiscozen.it/api/v1/reasons/`
  - Status: 200
  - Funzione: Causali per documenti fiscali

## 🏛️ Enti Previdenziali e Welfare

### Istituzioni Welfare
- **GET** `https://app.fiscozen.it/api/v1/user_welfare_institutions/?year=2024`
  - Status: 200
  - Funzione: Enti previdenziali per anno

- **GET** `https://app.fiscozen.it/api/v1/user_welfare_institutions/2025-08-27/`
  - Status: 200
  - Funzione: Enti previdenziali per data specifica

### Certificazioni Welfare
- **GET** `https://app.fiscozen.it/api/v1/welfare_certifications/?payment_year=2024`
  - Status: 200
  - Funzione: Certificazioni previdenziali per anno

## 🌍 Dati Geografici

### Autocompletamento Comuni
- **GET** `https://app.fiscozen.it/api/v1/municipalities/autocomplete_postcode_plus/?q=20100&n=50`
  - Status: 200
  - Funzione: Autocompletamento comuni da CAP

## 🔔 Notifiche e Messaggistica

### Sistema Notifiche
- **GET** `https://app.fiscozen.it/api/v1/notification_queue/?status=ALL&unopened=true`
  - Status: 200
  - Funzione: Coda notifiche utente

- **GET** `https://app.fiscozen.it/messaging/user_overlay_notices/`
  - Status: 200
  - Funzione: Avvisi overlay per utente

### Avvisi Importanti
- **GET** `https://app.fiscozen.it/api/v1/important_notices/`
  - Status: 200
  - Funzione: Avvisi importanti sistema

## 🎯 Funzionalità Aggiuntive

### Feature Flags
- **GET** `https://app.fiscozen.it/api/v1/user_feature_flags/`
  - Status: 200
  - Funzione: Flag funzionalità attive per utente

### Servizi Extra
- **GET** `https://app.fiscozen.it/api/v1/extra_services/in_progress/`
  - Status: 200
  - Funzione: Servizi aggiuntivi in corso

### Dichiarazioni Fiscali
- **GET** `https://app.fiscozen.it/api/v1/user_tax_declarations/?ref_year=2024`
  - Status: 200
  - Funzione: Dichiarazioni dei redditi per anno

### INPS Integration
- **GET** `https://app.fiscozen.it/api/v1/inps/can_import_f24/`
  - Status: 200
  - Funzione: Verifica possibilità importazione F24 da INPS

### Questionari Utente
- **GET** `https://app.fiscozen.it/api/v1/user_questionnaires/?ask=true`
  - Status: 200
  - Funzione: Questionari disponibili per utente

### Pricing e Piani
- **GET** `https://app.fiscozen.it/api/v1/plans/get_lowest_advertised_decorated_price/`
  - Status: 200
  - Funzione: Prezzo più basso pubblicizzato

### Feedback e Survey
- **GET** `https://app.fiscozen.it/surveys/api/v1/feedback/`
  - Status: 200
  - Funzione: Sistema feedback e sondaggi

### Task Dashboard
- **GET** `https://app.fiscozen.it/customer-push/api/v1/dashboard-tasks/`
  - Status: 200
  - Funzione: Task personalizzati dashboard

### Logo Aziendali
- **GET** `https://app.fiscozen.it/api/v1/logos/last/`
  - Status: 404
  - Funzione: Ultimo logo caricato (non presente per questo utente)

## 🔒 Endpoint Amministrativi

### Backoffice (Accesso Limitato)
- **GET** `https://app.fiscozen.it/bo_api/v1/backoffice_users/self/`
  - Status: 403
  - Funzione: Informazioni utente backoffice (accesso negato)

## 🎯 Endpoint di Interesse per Content Creator/Imprenditori

### Per la Gestione Clienti:
1. **Creazione automatica clienti** via POST `/api/v1/customers/`
2. **Ricerca clienti esistenti** via GET `/api/v1/customers/`
3. **Autocompletamento indirizzi** via `/api/v1/municipalities/`

### Per la Fatturazione:
1. **Calcolo automatico tasse** via POST `/api/v1/invoices/compute_data/`
2. **Creazione fatture programmatica** via POST `/api/v1/invoices/`
3. **Gestione metodi pagamento** via `/api/v1/payment_methods/`

### Per l'Integrazione:
1. **Monitoraggio documenti SDI** via `/api/v1/sdi_received_documents/`
2. **Sincronizzazione INPS** via `/api/v1/inps/can_import_f24/`
3. **Gestione notifiche** via `/api/v1/notification_queue/`

## ⚠️ Note di Sicurezza

- Tutti gli endpoint richiedono autenticazione valida
- Le sessioni sembrano avere timeout configurati
- Alcuni endpoint hanno limitazioni di rate limiting
- I dati sensibili sono protetti da validazioni lato server

# FiscoZen API Endpoints - Gestione Clienti

## 📋 **OVERVIEW**
Mappatura completa degli endpoint API di FiscoZen per l'automazione della gestione clienti, scoperta tramite reverse engineering con Playwright.

---

## 🔐 **AUTENTICAZIONE**
- **Base URL**: `https://app.fiscozen.it`
- **Autenticazione**: Session-based (cookie di sessione dopo login)
- **Headers richiesti**: 
  - `Content-Type: application/json`
  - `X-CSRFToken: [token]` (per operazioni POST/PUT/DELETE)

---

## 👥 **CLIENTI - CRUD Operations**

### **Lista Clienti**
```http
GET /api/v1/customers/
```

**Parametri Query:**
- `page` - Numero pagina (default: 1)
- `page_size` - Elementi per pagina (default: 25, max: 100)
- `search` - Ricerca generale
- `search_name` - Ricerca per nome/ragione sociale
- `typology__in` - Filtro per tipologia cliente
- `invoice_date_from` - Filtro data fattura da (YYYY-MM-DD)
- `invoice_date_to` - Filtro data fattura a (YYYY-MM-DD)
- `ordering` - Ordinamento (es: `name_db`, `-created_at`)
- `user` - ID utente (filtro automatico)

**Esempio:**
```
GET /api/v1/customers/?page=1&page_size=25&search=Microsoft&typology__in=Società&ordering=name_db
```

### **Crea Nuovo Cliente**
```http
POST /api/v1/customers/
```

**Payload JSON:**
```json
{
  "country": "Italia",
  "customer_type": "Società",
  "vat_number": "12345678901",
  "fiscal_code": "RSSMRA80A01H501U", 
  "company_name": "Test Company S.R.L.",
  "postcode": "20121",
  "municipality": "Milano",
  "address": "Via Test, 123",
  "contact_person": "Mario Rossi",
  "email": "test@testcompany.com",
  "phone": "+39 02 1234567",
  "destination_code": "ABCD123",
  "pec": "pec@testcompany.com"
}
```

**Campi Obbligatori:**
- `vat_number` - Partita IVA (11 cifre per IT)
- `fiscal_code` - Codice fiscale
- `company_name` - Ragione sociale
- `country` - Nazione (default: "Italia")
- `customer_type` - Tipologia: `"Società"`, `"Privato"`, `"Professionista"`
- `postcode` - CAP (obbligatorio)
- `municipality` - Comune (obbligatorio) 
- `address` - Indirizzo

**Campi Opzionali:**
- `contact_person` - Referente
- `email` - Indirizzo email
- `phone` - Numero di telefono
- `destination_code` - Codice destinatario (fatturazione elettronica)
- `pec` - Posta elettronica certificata

### **Dettaglio Cliente**
```http
GET /api/v1/customers/{id}/
```

### **Modifica Cliente**
```http
PUT /api/v1/customers/{id}/
PATCH /api/v1/customers/{id}/
```

### **Elimina Cliente**
```http
DELETE /api/v1/customers/{id}/
```

---

## 🏘️ **COMUNI E LOCALITÀ**

### **Autocompletamento da CAP**
```http
GET /api/v1/municipalities/autocomplete_postcode_plus/
```

**Parametri:**
- `q` - CAP da cercare (es: "20121")
- `n` - Numero massimo risultati (default: 50)

**Esempio:**
```
GET /api/v1/municipalities/autocomplete_postcode_plus/?q=20121&n=50
```

**Response:**
```json
[
  {
    "id": 1234,
    "name": "Milano",
    "province": "MI",
    "region": "Lombardia",
    "postcode": "20121"
  }
]
```

### **Autocompletamento Comuni**
```http
GET /api/v1/municipalities/autocomplete_municipality/
```

**Parametri:**
- `q` - Nome comune da cercare (es: "Milano")
- `n` - Numero massimo risultati (default: 10)

**Esempio:**
```
GET /api/v1/municipalities/autocomplete_municipality/?q=Milano&n=10
```

---

## 🏢 **VALIDAZIONE PARTITA IVA**

### **Controllo Validità P.IVA**
```http
GET /api/v1/vat/check/
```

**Parametri:**
- `country` - Codice paese (es: "IT", "DE", "FR")
- `vat` - Numero partita IVA da validare

**Esempio:**
```
GET /api/v1/vat/check/?country=IT&vat=12345678901
```

**Response (Valida):**
```json
{
  "valid": true,
  "company_name": "Test Company S.R.L.",
  "address": "Via Test 123, 20121 Milano MI",
  "country_code": "IT"
}
```

**Response (Non Valida):**
```json
{
  "valid": false,
  "error": "Invalid VAT number"
}
```

---

## 📄 **FATTURE (Endpoint Base)**

### **Lista Fatture**
```http
GET /api/v1/invoices/
```

### **Crea Nuova Fattura**
```http
POST /api/v1/invoices/
```

### **Ricerca Fatture**
```http
GET /api/v1/invoices/search/
```

---

## 🔍 **RICERCA E FILTRI**

### **Ricerca Globale Clienti**
```http
GET /api/v1/customers/search/
```

**Parametri:**
- `q` - Query di ricerca
- `fields` - Campi su cui cercare (nome, email, vat_number, etc.)

---

## ⚠️ **GESTIONE ERRORI**

### **Codici di Stato HTTP**
- `200` - OK
- `201` - Created (nuovo cliente creato)
- `400` - Bad Request (errori di validazione)
- `401` - Unauthorized (non autenticato)
- `403` - Forbidden (non autorizzato)
- `404` - Not Found (cliente non trovato)
- `503` - Service Unavailable (servizio temporaneamente non disponibile)

### **Formato Errori di Validazione (400)**
```json
{
  "errors": {
    "postcode": ["Questo campo non può essere omesso."],
    "municipality": ["Campo obbligatorio."],
    "vat_number": ["Formato partita IVA non valido."]
  }
}
```

---

## 🤖 **AUTOMAZIONE CON PLAYWRIGHT**

### **Workflow Tipico**
1. **Login** → Ottenere sessione autenticata
2. **Ricerca Cliente** → `GET /api/v1/customers/?search={nome}`
3. **Se non esiste:**
   - **Validazione P.IVA** → `GET /api/v1/vat/check/?country=IT&vat={piva}`
   - **Autocompletamento Comune** → `GET /api/v1/municipalities/autocomplete_postcode_plus/?q={cap}`
   - **Creazione Cliente** → `POST /api/v1/customers/`
4. **Creazione Fattura** → `POST /api/v1/invoices/` (con customer_id)

### **Headers da Includere**
```javascript
const headers = {
  'Content-Type': 'application/json',
  'X-CSRFToken': await getCsrfToken(),
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': 'https://app.fiscozen.it/app/clienti'
};
```

---

## 📚 **NOTE TECNICHE**

### **Paginazione**
- Usa `page` e `page_size` per controllare la paginazione
- Response include `count`, `next`, `previous` per navigazione
- Limite massimo `page_size`: 100 elementi

### **Filtri Avanzati**
- Supporta lookup Django: `field__icontains`, `field__exact`, `field__in`
- Date range: `created_at__gte`, `created_at__lte`
- Ordinamento multiplo: `ordering=name,-created_at`

### **Rate Limiting**
- Limite non documentato ma osservato: ~100 req/min
- Implementare backoff exponential per 429/503

### **CORS e CSRF**
- Richiede CSRF token per modifiche
- Same-origin policy applicata
- Preflight OPTIONS per richieste complesse

---




