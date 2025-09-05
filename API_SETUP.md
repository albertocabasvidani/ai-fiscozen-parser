# 🔑 Configurazione API per AI Fiscozen Parser

## 1. Configurazione OpenAI (Obbligatoria per estrazione automatica)

### Passo 1: Ottieni una API Key OpenAI
1. Vai su [https://platform.openai.com](https://platform.openai.com)
2. Registrati o accedi al tuo account
3. Naviga su **API Keys** nel menu laterale
4. Clicca **"Create new secret key"**
5. Copia la chiave generata (inizia con `sk-`)

### Passo 2: Configura l'applicazione
1. Apri il file `frontend/.env.local` (già creato)
2. Sostituisci `your-openai-api-key-here` con la tua chiave API:

```bash
# Configurazione OpenAI per estrazione dati
VITE_OPENAI_API_KEY=sk-tu-chiave-api-qui

# Opzionale: configurazione backend
VITE_BACKEND_URL=http://localhost:3001
```

3. Salva il file
4. Riavvia l'applicazione con `npm start`

### Costi stimati
- **Modello utilizzato**: GPT-4o-mini (più economico)
- **Costo per transazione**: ~$0.001-0.005 USD
- **Utilizzo tipico**: 10-20 transazioni = $0.05-0.10 USD

## 2. Modalità Senza API (Fallback automatico)

Se non configuri l'API key:
- L'app funziona comunque con estrazione regex semplice
- Rileva automaticamente: importi, P.IVA, aziende comuni (Stripe, PayPal, etc.)
- Potrai sempre inserire manualmente i dati cliente mancanti

## 3. Come testare la configurazione

1. Avvia l'app: `npm start`
2. Seleziona **"💰 Da Pagamento a Fattura"**
3. Inserisci testo di esempio:
```
Stripe payment received
Amount: €150.00
From: Tech Solutions SRL
P.IVA: 12345678901
For: Monthly software subscription
```
4. Se l'API è configurata, vedrai l'estrazione automatica dettagliata
5. Altrimenti, usa il pulsante **"✏️ Inserisci Cliente Manualmente"**

## 4. Risoluzione problemi

### L'estrazione non funziona
- ✅ Verifica che la API key sia corretta
- ✅ Controlla la console del browser per errori
- ✅ Assicurati di avere credito OpenAI nel tuo account

### Errori di connessione
- ✅ Riavvia frontend con `npm start`
- ✅ Verifica che il backend sia attivo (porta 3001)

## 5. Sicurezza

⚠️ **IMPORTANTE**: 
- Non condividere mai la tua API key
- Il file `.env.local` è già nel .gitignore
- La chiave rimane solo sul tuo computer