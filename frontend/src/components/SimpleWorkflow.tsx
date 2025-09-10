import { useState } from 'react';
import { fiscozenAPI } from '../services/fiscozenAPI';
import { aiService } from '../services/aiService';
import type { ClientData, SearchResult } from '../types/client';
import { LoginModal } from './LoginModal';

interface TransactionData {
  amount: number;
  clientName: string;
  date: string;
  description: string;
}

interface SimpleWorkflowProps {
  onComplete: (success: boolean, invoiceId?: string) => void;
}

export function SimpleWorkflow({ onComplete }: SimpleWorkflowProps) {
  const [step, setStep] = useState<'transaction' | 'client-search' | 'client-data' | 'ai-review' | 'invoice'>('transaction');
  const [transactionData, setTransactionData] = useState<TransactionData>({
    amount: 10,
    clientName: 'scaccino',
    date: '2025-09-01',
    description: 'consulenza'
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedClient, setSelectedClient] = useState<SearchResult | null>(null);
  const [newClientData, setNewClientData] = useState<ClientData | null>(null);
  const [aiParsedData, setAiParsedData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const handleTransactionSubmit = async () => {
    if (!transactionData.clientName || !transactionData.amount) {
      alert('Inserisci almeno nome cliente e importo');
      return;
    }

    // Controlla se siamo loggati a Fiscozen
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      // Ricerca intelligente cliente su Fiscozen
      const results = await fiscozenAPI.searchClient(transactionData.clientName);
      setSearchResults(results);
      setStep('client-search');
    } catch (error) {
      console.error('Errore ricerca cliente:', error);
      alert('Errore durante la ricerca del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (token: string) => {
    setAuthToken(token);
    setIsLoggedIn(true);
    // Dopo il login, procedi con la ricerca
    setTimeout(() => {
      handleTransactionSubmit();
    }, 500);
  };

  const handleClientSelection = (client: SearchResult | null) => {
    if (client) {
      setSelectedClient(client);
      setStep('invoice');
    } else {
      // Cliente non trovato, chiedi dati
      setStep('client-data');
    }
  };

  const handleClientDataSubmit = async () => {
    if (!newClientData) return;

    setLoading(true);
    try {
      // L'IA analizza i dati e li suddivide per Fiscozen
      const prompt = `Analizza questi dati del cliente e organizzali per la creazione su Fiscozen:

Nome/Ragione Sociale: ${newClientData.ragioneSociale}
Email: ${newClientData.email}
Telefono: ${newClientData.telefono}
Indirizzo: ${newClientData.indirizzo}
P.IVA: ${newClientData.partitaIVA}
Altre info: ${newClientData.referente}

Rispondi con JSON con questa struttura:
{
  "ragioneSociale": "nome pulito",
  "partitaIVA": "solo numeri, 11 cifre",
  "indirizzo": "via completa",
  "cap": "codice postale",
  "comune": "città",
  "provincia": "provincia (2 lettere)",
  "codiceDestinatario": "XXXXXXX se B2B",
  "pec": "email PEC se fornita",
  "email": "email normale",
  "telefono": "numero pulito",
  "referente": "nome referente"
}`;

      const aiResult = await aiService.extractTransactionData(prompt);
      if (aiResult.success) {
        const parsedClientData: ClientData = {
          ragioneSociale: aiResult.data?.clientName || newClientData.ragioneSociale,
          partitaIVA: aiResult.data?.vatNumber || newClientData.partitaIVA,
          indirizzo: aiResult.data?.address || newClientData.indirizzo,
          cap: newClientData.cap,
          comune: newClientData.comune,
          provincia: newClientData.provincia,
          codiceDestinatario: newClientData.codiceDestinatario,
          pec: newClientData.pec,
          email: newClientData.email,
          telefono: newClientData.telefono,
          referente: newClientData.referente
        };
        setAiParsedData(parsedClientData);
        setStep('ai-review');
      } else {
        // Se l'AI fallisce, usa i dati originali
        setAiParsedData(newClientData);
        setStep('ai-review');
      }
    } catch (error) {
      console.error('Errore parsing AI:', error);
      setAiParsedData(newClientData);
      setStep('ai-review');
    } finally {
      setLoading(false);
    }
  };

  const handleAiReviewConfirm = async () => {
    if (!aiParsedData) return;

    setLoading(true);
    try {
      // Crea il cliente
      const clientResult = await fiscozenAPI.createClient(aiParsedData);
      if (clientResult.success) {
        console.log('Cliente creato:', clientResult.id);
        setStep('invoice');
      } else {
        alert('Errore creazione cliente: ' + clientResult.error);
      }
    } catch (error) {
      console.error('Errore creazione cliente:', error);
      alert('Errore durante la creazione del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setLoading(true);
    try {
      // App sempre usa API reali - nessun mock data
      
      // Dati per la fattura secondo il formato backend
      const invoiceData = {
        client: {
          ragioneSociale: selectedClient?.ragioneSociale || aiParsedData?.ragioneSociale,
          partitaIVA: selectedClient?.partitaIVA || aiParsedData?.partitaIVA,
          id: selectedClient?.id
        },
        lineItems: [{
          description: transactionData.description || 'Consulenza IT',
          quantity: 1,
          unitPrice: transactionData.amount,
          vatRate: 0 // 0% IVA
        }],
        total: transactionData.amount,
        date: transactionData.date,
        paymentDate: transactionData.date, // Data pagamento = data transazione
        isDraft: true, // Lascia in bozza
        atecoCode: '62.20.10', // Consulenza IT
        notes: `Fattura creata automaticamente da transazione del ${transactionData.date}`
      };

      const API_BASE = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
      const headers = {
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(`${API_BASE}/fiscozen/invoices`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Fattura ${result.invoiceNumber} creata in bozza su Fiscozen!`);
        onComplete(true, result.id);
      } else {
        alert('Errore creazione fattura: ' + result.error);
      }
      
    } catch (error) {
      console.error('Errore creazione fattura:', error);
      alert('Errore durante la creazione della fattura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">
          💰 Da Transazione a Fattura
        </h2>

        {step === 'transaction' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              1. Dati della Transazione
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Cliente *
                </label>
                <input
                  type="text"
                  value={transactionData.clientName}
                  onChange={(e) => setTransactionData(prev => ({
                    ...prev,
                    clientName: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="es. Apple Inc, Google, Mario Rossi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Importo €*
                </label>
                <input
                  type="number"
                  value={transactionData.amount}
                  onChange={(e) => setTransactionData(prev => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="1000.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data
                </label>
                <input
                  type="date"
                  value={transactionData.date}
                  onChange={(e) => setTransactionData(prev => ({
                    ...prev,
                    date: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <input
                  type="text"
                  value={transactionData.description}
                  onChange={(e) => setTransactionData(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Consulenza sviluppo software"
                />
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleTransactionSubmit}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '🔍 Ricerca cliente...' : isLoggedIn ? '🔍 Cerca Cliente su Fiscozen' : '🔐 Login e Cerca Cliente'}
              </button>
              
              {!isLoggedIn && (
                <p className="text-sm text-gray-600 text-center">
                  💡 Ti verrà chiesto di fare login su Fiscozen per accedere ai tuoi clienti reali
                </p>
              )}
              
              {isLoggedIn && (
                <p className="text-sm text-green-600 text-center">
                  ✅ Connesso a Fiscozen - Ricerca sui tuoi clienti reali
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'client-search' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              2. Cliente trovato su Fiscozen?
            </h3>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-green-600 font-medium">
                  ✅ Trovati {searchResults.length} clienti simili:
                </p>
                {searchResults.map((client, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-md p-4 hover:border-blue-300 cursor-pointer"
                    onClick={() => handleClientSelection(client)}
                  >
                    <div className="font-medium">{client.ragioneSociale}</div>
                    <div className="text-sm text-gray-600">
                      P.IVA: {client.partitaIVA} | {client.comune}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-orange-600">
                ❌ Nessun cliente trovato con il nome "{transactionData.clientName}"
              </p>
            )}

            <button
              onClick={() => handleClientSelection(null)}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600"
            >
              📝 Cliente non trovato - Inserisci dati nuovo cliente
            </button>
          </div>
        )}

        {step === 'client-data' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              3. Dati del Nuovo Cliente
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ragione Sociale *
                </label>
                <input
                  type="text"
                  value={newClientData?.ragioneSociale || ''}
                  onChange={(e) => setNewClientData(prev => ({
                    ...prev,
                    ragioneSociale: e.target.value,
                    partitaIVA: prev?.partitaIVA || '',
                    indirizzo: prev?.indirizzo || '',
                    cap: prev?.cap || '',
                    comune: prev?.comune || '',
                    provincia: prev?.provincia || '',
                    codiceDestinatario: prev?.codiceDestinatario || '',
                    pec: prev?.pec || '',
                    email: prev?.email || '',
                    telefono: prev?.telefono || '',
                    referente: prev?.referente || ''
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Nome azienda o persona"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partita IVA
                </label>
                <input
                  type="text"
                  value={newClientData?.partitaIVA || ''}
                  onChange={(e) => setNewClientData(prev => prev ? {
                    ...prev,
                    partitaIVA: e.target.value
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="12345678901"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newClientData?.email || ''}
                  onChange={(e) => setNewClientData(prev => prev ? {
                    ...prev,
                    email: e.target.value
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Indirizzo completo
                </label>
                <input
                  type="text"
                  value={newClientData?.indirizzo || ''}
                  onChange={(e) => setNewClientData(prev => prev ? {
                    ...prev,
                    indirizzo: e.target.value
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Via Roma 123, Milano"
                />
              </div>
            </div>

            <button
              onClick={handleClientDataSubmit}
              disabled={loading || !newClientData?.ragioneSociale}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? '🤖 Analisi IA dei dati...' : '🤖 Analizza con IA'}
            </button>
          </div>
        )}

        {step === 'ai-review' && aiParsedData && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              4. Controllo Dati Analizzati dall'IA
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-blue-800 font-medium mb-3">
                🤖 L'IA ha organizzato i dati così:
              </p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Ragione Sociale:</strong> {aiParsedData.ragioneSociale}</div>
                <div><strong>P.IVA:</strong> {aiParsedData.partitaIVA}</div>
                <div><strong>Email:</strong> {aiParsedData.email}</div>
                <div><strong>Telefono:</strong> {aiParsedData.telefono}</div>
                <div className="col-span-2"><strong>Indirizzo:</strong> {aiParsedData.indirizzo}</div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleAiReviewConfirm}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '🔄 Creazione cliente...' : '✅ Conferma e Crea Cliente'}
              </button>
              
              <button
                onClick={() => setStep('client-data')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                📝 Modifica
              </button>
            </div>
          </div>
        )}

        {step === 'invoice' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">
              5. Creazione Fattura
            </h3>
            
            <div className="bg-green-50 p-4 rounded-md">
              <p className="text-green-800 font-medium mb-3">
                ✅ Cliente pronto! Ora creo la fattura in bozza:
              </p>
              
              <div className="text-sm space-y-1">
                <div><strong>Cliente:</strong> {selectedClient?.ragioneSociale || aiParsedData?.ragioneSociale}</div>
                <div><strong>Importo:</strong> €{transactionData.amount}</div>
                <div><strong>Data:</strong> {transactionData.date}</div>
                <div><strong>Descrizione:</strong> {transactionData.description}</div>
                <div className="text-gray-600 mt-2">
                  <strong>Impostazioni:</strong> 0% IVA, ATECO 62.20.10, Data pagamento = Data fattura
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateInvoice}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '🔄 Creazione fattura in corso...' : '📄 Crea Fattura in Bozza'}
            </button>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}