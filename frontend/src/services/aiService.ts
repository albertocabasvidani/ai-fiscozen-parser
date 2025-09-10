// AI Service per estrazione dati - utilizzando il modello più economico disponibile
// Attualmente OpenAI GPT-4o-mini offre il miglior rapporto qualità/prezzo per questo uso

interface ExtractionResult {
  success: boolean;
  data?: {
    clientName: string;
    vatNumber?: string;
    address?: string;
    amount: number;
    currency?: string;
    description: string;
    date?: string;
    services: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
  error?: string;
}

interface ClientExtractionResult {
  success: boolean;
  data?: {
    ragioneSociale: string;
    partitaIVA: string;
    indirizzo: string;
    cap: string;
    comune: string;
    provincia: string;
    codiceDestinatario: string;
    pec: string;
    email: string;
    telefono: string;
    referente: string;
  };
  error?: string;
}

class AIService {
  private apiKey: string = '';
  private baseUrl: string = '';
  private model: string = '';

  constructor() {
    // Configurazione per OpenAI GPT-4o-mini (più economico)
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-4o-mini'; // Modello più economico con buone performance
  }

  async extractTransactionData(text: string): Promise<ExtractionResult> {
    console.log('API Key available:', !!this.apiKey); // Debug API key
    if (!this.apiKey) {
      console.log('Using mock extraction');
      return this.mockExtraction(text);
    }

    try {
      const prompt = this.buildExtractionPrompt(text);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Sei un assistente specializzato nell\'estrazione di dati da testi di transazioni commerciali. Rispondi sempre con JSON valido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Bassa temperatura per risultati consistenti
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Nessuna risposta dall\'AI');
      }

      const parsedData = JSON.parse(content);
      
      return {
        success: true,
        data: parsedData
      };

    } catch (error) {
      console.error('AI extraction error:', error);
      
      // Fallback su estrazione regex semplice
      return this.simpleExtraction(text);
    }
  }

  private buildExtractionPrompt(text: string): string {
    return `
Estrai i seguenti dati dal testo del PAGAMENTO RICEVUTO fornito. Il testo contiene dettagli di un pagamento che ho ricevuto e per cui devo creare una fattura. Rispondi SOLO con un oggetto JSON valido nel formato specificato.

Testo del pagamento da analizzare:
"${text}"

Rispondi con questo formato JSON:
{
  "clientName": "nome cliente/azienda",
  "vatNumber": "partita IVA se presente",
  "address": "indirizzo se presente", 
  "amount": numero_totale,
  "currency": "valuta del pagamento (EUR, USD, GBP, ecc.)",
  "description": "descrizione generale del servizio/prodotto",
  "date": "data in formato YYYY-MM-DD se presente",
  "services": [
    {
      "description": "descrizione specifica del servizio",
      "quantity": 1,
      "unitPrice": prezzo_unitario
    }
  ]
}

Regole:
1. Se non trovi un dato, usa una stringa vuota "" o 0 per i numeri
2. Per amount, estrai il valore numerico totale del PAGAMENTO RICEVUTO - è il valore di un pagamento
3. Per currency, estrai la valuta del pagamento (USD, EUR, GBP, JPY, ecc.). Se la valuta non è specificata nel testo, usa "EUR" come default
4. Per clientName, cerca il nome di chi ha effettuato il pagamento (cliente)
5. Per services, identifica per cosa è stato effettuato il pagamento
6. Se c'è un solo servizio generico, metti tutto in services[0] 
7. Non aggiungere IVA ai calcoli
8. Il testo descrive un pagamento che HO RICEVUTO, non che devo fare
9. Rispondi SOLO con il JSON, nient'altro
`;
  }

  private async simpleExtraction(text: string): Promise<ExtractionResult> {
    // Estrazione semplice con regex come fallback
    const usdMatch = text.match(/\$(\d+(?:[.,]\d{2})?)\s*(USD|usd)?/i) || 
                    text.match(/(\d+(?:[.,]\d{2})?)\s*\$\s*(USD|usd)?/i);
    const gbpMatch = text.match(/£(\d+(?:[.,]\d{2})?)\s*(GBP|gbp)?/i) || 
                    text.match(/(\d+(?:[.,]\d{2})?)\s*£\s*(GBP|gbp)?/i);
    const eurMatch = text.match(/(?:€|EUR|euro)\s*(\d+(?:[.,]\d{2})?)/i) || 
                    text.match(/(\d+(?:[.,]\d{2})?)\s*(?:€|EUR|euro)/i);
    
    const vatMatch = text.match(/(?:p\.?iva|partita iva|vat)\s*:?\s*(\d{11})/i);
    
    // Cerca nomi di aziende comuni
    const companyMatch = text.match(/(stripe|paypal|google|apple|microsoft|amazon|meta|facebook|netflix|spotify|adobe|salesforce|zoom|slack|github|gitlab|aws|azure|digital ocean|heroku|vercel|netlify)(?:\s+inc\.?|\s+ltd\.?|\s+srl|\s+spa)?/i);
    
    let amount = 0;
    let currency = 'EUR';
    
    if (usdMatch) {
      amount = parseFloat(usdMatch[1].replace(',', '.'));
      currency = 'USD';
    } else if (gbpMatch) {
      amount = parseFloat(gbpMatch[1].replace(',', '.'));
      currency = 'GBP';
    } else if (eurMatch) {
      amount = parseFloat(eurMatch[1].replace(',', '.'));
      currency = 'EUR';
    }
    
    const clientName = companyMatch ? companyMatch[0] : 'Cliente da identificare';
    
    return {
      success: true,
      data: {
        clientName,
        vatNumber: vatMatch ? vatMatch[1] : '',
        address: '',
        amount,
        currency,
        description: text.substring(0, 100) + '...',
        services: [{
          description: 'Servizio/Prodotto',
          quantity: 1,
          unitPrice: amount
        }]
      }
    };
  }

  async extractClientData(text: string): Promise<ClientExtractionResult> {
    console.log('Extracting client data with AI...', !!this.apiKey);
    
    if (!this.apiKey) {
      console.log('Using regex fallback for client data');
      return this.regexClientExtraction(text);
    }

    try {
      const prompt = this.buildClientExtractionPrompt(text);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'Sei un assistente specializzato nell\'estrazione di dati di clienti/aziende da testi. Rispondi sempre con JSON valido contenente i dati richiesti per la fatturazione italiana.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Nessuna risposta dall\'AI');
      }

      const parsedData = JSON.parse(content);
      
      return {
        success: true,
        data: parsedData
      };

    } catch (error) {
      console.error('AI client extraction error:', error);
      
      // Fallback su estrazione regex
      return this.regexClientExtraction(text);
    }
  }

  private buildClientExtractionPrompt(text: string): string {
    return `
Estrai i dati del cliente/azienda dal testo fornito. Il testo contiene informazioni di un'azienda italiana per la quale devo creare una fattura. Rispondi SOLO con un oggetto JSON valido nel formato specificato.

Testo da analizzare:
"${text}"

Rispondi con questo formato JSON:
{
  "ragioneSociale": "nome completo azienda/cliente",
  "partitaIVA": "solo i numeri della partita IVA (11 cifre)",
  "indirizzo": "via/piazza e numero civico",
  "cap": "codice postale (5 cifre)",
  "comune": "nome comune/città",
  "provincia": "sigla provincia (2 lettere maiuscole)",
  "codiceDestinatario": "codice destinatario se presente",
  "pec": "indirizzo PEC se presente",
  "email": "indirizzo email normale se presente",
  "telefono": "numero di telefono se presente",
  "referente": "nome persona di riferimento se presente"
}

Regole specifiche:
1. Per ragioneSociale: includi tutta la denominazione sociale (SRL, SPA, Società Benefit, ecc.)
2. Per partitaIVA: estrai solo i numeri, rimuovi spazi e prefissi
3. Per indirizzo: estrai solo via/piazza e numero civico, NON includere città/provincia
4. Per cap: deve essere esattamente 5 cifre
5. Per comune: nome della città senza codice postale
6. Per provincia: sigla di 2 lettere maiuscole (es: FC, MI, RM)
7. Per codiceDestinatario: cerca codici alfanumerici di 7 caratteri
8. Se un dato non è presente nel testo, usa stringa vuota ""
9. Rispondi SOLO con il JSON, nient'altro
`;
  }

  private async regexClientExtraction(text: string): Promise<ClientExtractionResult> {
    // Estrazione regex come fallback
    const pivaMatch = text.match(/(?:p\.?iva|partita iva)\s*:?\s*(\d{11})/i);
    // CAP match più specifico - non deve essere parte della P.IVA
    const capMatch = text.match(/(?:cap|^|\s)(\d{5})(?:\s|$)/im);
    const codiceDestMatch = text.match(/(?:codice fatturazione|codice destinatario)\s*:?\s*([A-Z0-9]{7})/i);
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const pecMatch = text.match(/([a-zA-Z0-9._%+-]+@(?:pec\.|.*pec)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const phoneMatch = text.match(/(?:tel|telefono|phone)\s*:?\s*([+]?\d{10,15})/i);
    
    // Estrai prima riga come ragione sociale
    const lines = text.trim().split('\n').filter(line => line.trim().length > 0);
    const ragioneSociale = lines[0] || 'Azienda da identificare';
    
    // Cerca indirizzo (tipicamente seconda riga)
    const indirizzo = lines[1] || '';
    
    // Estrai comune e provincia dalla terza riga tipica: "Cesena (FC)"
    const cittaMatch = lines[2]?.match(/^(.+?)\s*\(([A-Z]{2})\)\s*$/);
    const comune = cittaMatch ? cittaMatch[1].trim() : '';
    const provincia = cittaMatch ? cittaMatch[2] : '';
    
    // Assicurati che il CAP non sia parte della P.IVA
    let cap = '';
    if (capMatch && capMatch[1]) {
      const pivaNumber = pivaMatch ? pivaMatch[1] : '';
      if (!pivaNumber.includes(capMatch[1])) {
        cap = capMatch[1];
      }
    }
    
    return {
      success: true,
      data: {
        ragioneSociale: ragioneSociale.trim(),
        partitaIVA: pivaMatch ? pivaMatch[1] : '',
        indirizzo: indirizzo.trim(),
        cap,
        comune,
        provincia,
        codiceDestinatario: codiceDestMatch ? codiceDestMatch[1] : '',
        pec: pecMatch ? pecMatch[1] : '',
        email: (emailMatch && !pecMatch) ? emailMatch[1] : '',
        telefono: phoneMatch ? phoneMatch[1] : '',
        referente: ''
      }
    };
  }

  private async mockExtraction(text: string): Promise<ExtractionResult> {
    // Mock per testing senza API key
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simula delay API
    
    return this.simpleExtraction(text);
  }
}

export const aiService = new AIService();
export type { ExtractionResult, ClientExtractionResult };