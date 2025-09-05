import { useState } from 'react';
import { aiService } from '../services/aiService';
// Removed fiscozenAPI import to avoid type conflicts

// Simple local types to avoid import issues
interface SimpleClient {
  ragioneSociale: string;
  partitaIVA: string;
  indirizzo: string;
  email: string;
  cap: string;
  comune: string;
  provincia: string;
  codiceDestinatario: string;
  pec: string;
  telefono: string;
  referente: string;
}

interface SimpleTransaction {
  amount: number;
  currency: string;
  services: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  date: string;
  description: string;
}

interface FastWorkflowProps {
  onComplete: (success: boolean, invoiceId?: string) => void;
}

export const FastWorkflow: React.FC<FastWorkflowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'input' | 'review' | 'client' | 'preview' | 'complete'>('input');
  const [inputText, setInputText] = useState('');
  const [transaction, setTransaction] = useState<SimpleTransaction | null>(null);
  const [client, setClient] = useState<SimpleClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Process input
  const handleProcess = async () => {
    if (!inputText.trim()) {
      setError('Inserisci il testo della transazione');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await aiService.extractTransactionData(inputText);
      
      if (result.success && result.data) {
        console.log('AI Response:', result.data); // Debug log
        const transactionData: SimpleTransaction = {
          amount: result.data.amount,
          currency: result.data.currency || 'EUR',
          services: result.data.services,
          date: result.data.date || new Date().toISOString().split('T')[0],
          description: result.data.description
        };
        console.log('Transaction Data:', transactionData); // Debug transaction

        const clientData: SimpleClient = {
          ragioneSociale: result.data.clientName,
          partitaIVA: result.data.vatNumber || '',
          indirizzo: result.data.address || '',
          email: '',
          cap: '',
          comune: '',
          provincia: '',
          codiceDestinatario: '',
          pec: '',
          telefono: '',
          referente: ''
        };

        setTransaction(transactionData);
        setClient(clientData);
        setStep('review');
      } else {
        setError('Errore estrazione dati');
      }
    } catch (err) {
      setError('Errore di elaborazione');
    }
    setLoading(false);
  };

  // Update client - simplified without search
  const handleClientUpdate = async (newClient: SimpleClient) => {
    setClient(newClient);
    setStep('preview');
  };

  // Create invoice
  const handleCreateInvoice = async () => {
    if (!transaction || !client) return;

    setLoading(true);
    setError('');

    try {
      const invoiceData = {
        client: client,
        date: transaction.date,
        dueDate: transaction.date,
        lineItems: transaction.services.map(service => ({
          id: Date.now().toString() + Math.random(),
          description: service.description,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
          vatRate: 0,
          total: service.quantity * service.unitPrice
        })),
        subtotal: transaction.amount,
        vatAmount: 0,
        total: transaction.amount,
        atecoCode: '62.20.10',
        notes: `Auto: ${transaction.description}`
      };

      const response = await fetch('http://localhost:3001/api/fiscozen/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (result.success) {
        setStep('complete');
        onComplete(true, result.id);
      } else {
        setError('Errore creazione fattura');
      }
    } catch (err) {
      setError('Errore connessione');
    }
    setLoading(false);
  };

  const reset = () => {
    setStep('input');
    setInputText('');
    setTransaction(null);
    setClient(null);
    setError('');
  };

  const getProgress = () => {
    const steps = ['input', 'review', 'client', 'preview', 'complete'];
    return ((steps.indexOf(step) + 1) / steps.length) * 100;
  };

  const hasApiKey = import.meta.env.VITE_OPENAI_API_KEY && 
                   import.meta.env.VITE_OPENAI_API_KEY !== 'your-openai-api-key-here';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        
        {/* Progress */}
        <div className="mb-6">
          <div className="w-full bg-white rounded-full h-3 shadow-sm">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
            <p className="text-red-800">⚠️ {error}</p>
          </div>
        )}

        {/* INPUT STEP */}
        {step === 'input' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Fatturazione</h1>
              <p className="text-gray-600">Incolla i dati del pagamento per creare automaticamente la fattura</p>
              
              <div className="mt-4 inline-flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-gray-600">{hasApiKey ? 'AI Avanzata' : 'Modalità Base'}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Incolla qui i dettagli del pagamento ricevuto:&#10;&#10;Esempi:&#10;• 'Stripe payment €500 from Tech Solutions'&#10;• 'PayPal received €150 for subscription'&#10;• 'Bonifico €1200 da ABC Company'"
                rows={6}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              
              <button
                onClick={handleProcess}
                disabled={!inputText.trim() || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Elaborando...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Crea Fattura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* REVIEW STEP */}
        {step === 'review' && transaction && client && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-center text-gray-900">📋 Dati Estratti</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Transaction */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🧾 Fattura</h3>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {transaction.currency === 'USD' ? '$' : transaction.currency === 'GBP' ? '£' : '€'}{transaction.amount.toFixed(2)} {transaction.currency}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Data:</strong> {transaction.date}</p>
                  <p><strong>Servizi:</strong> {transaction.services.length}</p>
                  <p><strong>Descrizione:</strong> {transaction.description}</p>
                </div>
              </div>
              
              {/* Client */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">👤 Cliente</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    client.ragioneSociale && client.ragioneSociale !== 'Cliente da identificare'
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {client.ragioneSociale && client.ragioneSociale !== 'Cliente da identificare' ? 'Rilevato' : 'Da completare'}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Nome:</strong> {client.ragioneSociale || 'Da inserire'}</p>
                  {client.partitaIVA && <p><strong>P.IVA:</strong> {client.partitaIVA}</p>}
                  {client.indirizzo && <p><strong>Indirizzo:</strong> {client.indirizzo}</p>}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setStep('input')}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
              >
                ← Modifica Testo
              </button>
              <button
                onClick={() => setStep('client')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                {client.ragioneSociale && client.ragioneSociale !== 'Cliente da identificare' 
                  ? 'Modifica Cliente →' 
                  : 'Inserisci Cliente →'}
              </button>
            </div>
          </div>
        )}

        {/* CLIENT STEP */}
        {step === 'client' && client && transaction && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">👤 Dati Cliente</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800">
                  <strong>💰 Fattura per {transaction.currency === 'USD' ? '$' : transaction.currency === 'GBP' ? '£' : '€'}{transaction.amount.toFixed(2)} {transaction.currency}</strong> • Dati salvati
                </p>
              </div>
            </div>
            
            <ClientForm 
              client={client} 
              onSave={handleClientUpdate}
              onCancel={() => setStep('review')}
            />
          </div>
        )}

        {/* PREVIEW STEP */}
        {step === 'preview' && transaction && client && (
          <div className="bg-white rounded-xl shadow-xl p-8">
            <h2 className="text-xl font-bold text-center text-gray-900 mb-6">🧾 Anteprima Fattura</h2>
            
            <div className="border border-gray-200 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><strong>Cliente:</strong> {client.ragioneSociale}</div>
                <div><strong>P.IVA:</strong> {client.partitaIVA || 'N/A'}</div>
                <div><strong>Data:</strong> {transaction.date}</div>
                <div><strong>Totale:</strong> {transaction.currency === 'USD' ? '$' : transaction.currency === 'GBP' ? '£' : '€'}{transaction.amount.toFixed(2)} {transaction.currency}</div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Servizi:</h4>
                <div className="space-y-2">
                  {transaction.services.map((service, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                      <span className="text-sm">{service.description} (x{service.quantity})</span>
                      <span className="font-semibold">{transaction.currency === 'USD' ? '$' : transaction.currency === 'GBP' ? '£' : '€'}{(service.quantity * service.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t mt-4 pt-4 text-xs text-gray-500">
                <p>IVA: 0% • ATECO: 62.20.10 • Regime: Esenzione</p>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setStep('client')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium"
              >
                ← Modifica Cliente
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Creando...</span>
                  </>
                ) : (
                  <>
                    <span>🧾</span>
                    <span>Crea Fattura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* COMPLETE STEP */}
        {step === 'complete' && client && (
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Fattura Creata!</h2>
            <p className="text-gray-600 mb-6">
              Fattura creata con successo per <strong>{client.ragioneSociale}</strong>
            </p>
            <button
              onClick={reset}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium inline-flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Nuova Transazione</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Client Form
interface ClientFormProps {
  client: SimpleClient;
  onSave: (client: SimpleClient) => void;
  onCancel: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ client, onSave, onCancel }) => {
  const [formData, setFormData] = useState<SimpleClient>(client);

  const handleChange = (field: keyof SimpleClient, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.ragioneSociale.trim()) {
      alert('Inserisci almeno la Ragione Sociale');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ragione Sociale *
          </label>
          <input
            type="text"
            value={formData.ragioneSociale}
            onChange={(e) => handleChange('ragioneSociale', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nome cliente/azienda"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Partita IVA</label>
          <input
            type="text"
            value={formData.partitaIVA}
            onChange={(e) => handleChange('partitaIVA', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="12345678901"
            maxLength={11}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="cliente@email.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Indirizzo</label>
          <input
            type="text"
            value={formData.indirizzo}
            onChange={(e) => handleChange('indirizzo', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Via/Piazza, numero civico"
          />
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-medium"
        >
          Annulla
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
        >
          💾 Salva e Continua
        </button>
      </div>
    </div>
  );
};