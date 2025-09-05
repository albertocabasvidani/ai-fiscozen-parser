import { useState, useCallback } from 'react';
import { TransactionData, ClientData, SearchResult } from '../types/client';
import { aiService } from '../services/aiService';
import { fiscozenAPI } from '../services/fiscozenAPI';

interface OptimizedWorkflowProps {
  onComplete: (success: boolean, invoiceId?: string) => void;
}

type Stage = 'input' | 'review' | 'clientEdit' | 'preview' | 'complete';

interface SimpleState {
  stage: Stage;
  transactionData: TransactionData | null;
  clientData: ClientData | null;
  searchResults: SearchResult[];
  isLoading: boolean;
  error: string;
}

export const OptimizedWorkflow: React.FC<OptimizedWorkflowProps> = ({ onComplete }) => {
  const [state, setState] = useState<SimpleState>({
    stage: 'input',
    transactionData: null,
    clientData: null,
    searchResults: [],
    isLoading: false,
    error: ''
  });

  const [inputText, setInputText] = useState('');

  const updateState = useCallback((updates: Partial<SimpleState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Process input text
  const handleProcessText = async () => {
    if (!inputText.trim()) {
      updateState({ error: 'Inserisci il testo della transazione' });
      return;
    }

    updateState({ isLoading: true, error: '' });

    try {
      const result = await aiService.extractTransactionData(inputText);
      
      if (result.success && result.data) {
        const transactionData: TransactionData = {
          amount: result.data.amount,
          services: result.data.services,
          date: result.data.date || new Date().toISOString().split('T')[0],
          description: result.data.description,
          originalText: inputText
        };

        const clientData: ClientData = {
          ragioneSociale: result.data.clientName,
          partitaIVA: result.data.vatNumber || '',
          indirizzo: result.data.address || '',
          cap: '',
          comune: '',
          provincia: '',
          codiceDestinatario: '',
          pec: '',
          email: '',
          telefono: '',
          referente: ''
        };

        updateState({
          stage: 'review',
          transactionData,
          clientData,
          isLoading: false
        });
      } else {
        updateState({
          error: result.error || 'Errore durante l\'estrazione',
          isLoading: false
        });
      }
    } catch (error) {
      updateState({
        error: 'Errore di elaborazione',
        isLoading: false
      });
    }
  };

  // Handle client update
  const handleClientUpdate = async (newClientData: ClientData) => {
    updateState({ clientData: newClientData, isLoading: true });

    try {
      const results = await fiscozenAPI.searchClient(
        newClientData.ragioneSociale,
        newClientData.partitaIVA
      );

      updateState({
        searchResults: results,
        stage: 'preview',
        isLoading: false
      });
    } catch (error) {
      updateState({
        error: 'Errore ricerca cliente',
        isLoading: false
      });
    }
  };

  // Create invoice
  const handleCreateInvoice = async () => {
    if (!state.transactionData || !state.clientData) return;

    updateState({ isLoading: true, error: '' });

    try {
      const invoiceData = {
        client: state.clientData,
        date: state.transactionData.date,
        dueDate: state.transactionData.date,
        lineItems: state.transactionData.services.map(service => ({
          id: Date.now().toString() + Math.random(),
          description: service.description,
          quantity: service.quantity,
          unitPrice: service.unitPrice,
          vatRate: 0,
          total: service.quantity * service.unitPrice
        })),
        subtotal: state.transactionData.amount,
        vatAmount: 0,
        total: state.transactionData.amount,
        atecoCode: '62.20.10',
        notes: `Auto-generato: ${state.transactionData.description}`
      };

      const response = await fetch('http://localhost:3001/api/fiscozen/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (result.success) {
        updateState({ stage: 'complete', isLoading: false });
        onComplete(true, result.id);
      } else {
        updateState({ 
          error: result.error || 'Errore creazione fattura',
          isLoading: false
        });
      }
    } catch (error) {
      updateState({ 
        error: 'Errore di connessione',
        isLoading: false
      });
    }
  };

  const handleReset = () => {
    setInputText('');
    setState({
      stage: 'input',
      transactionData: null,
      clientData: null,
      searchResults: [],
      isLoading: false,
      error: ''
    });
  };

  // Progress indicator
  const getProgress = () => {
    const stages = ['input', 'review', 'clientEdit', 'preview', 'complete'];
    return ((stages.indexOf(state.stage) + 1) / stages.length) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Simple Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            ⚠️ {state.error}
          </div>
        )}

        {/* Main Content */}
        {state.stage === 'input' && (
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">💰 Fatturazione Automatica</h2>
              <p className="text-gray-600">Incolla i dati del pagamento per creare la fattura</p>
              
              {/* Quick API Status */}
              <div className="mt-4 inline-flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  import.meta.env.VITE_OPENAI_API_KEY && 
                  import.meta.env.VITE_OPENAI_API_KEY !== 'your-openai-api-key-here'
                    ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-gray-600">
                  {import.meta.env.VITE_OPENAI_API_KEY && 
                   import.meta.env.VITE_OPENAI_API_KEY !== 'your-openai-api-key-here'
                    ? 'AI Attiva' : 'Modalità Semplice'}
                </span>
              </div>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Incolla qui i dettagli del pagamento:&#10;&#10;Esempio:&#10;Stripe payment €500 from Tech Solutions SRL&#10;For monthly software subscription"
              rows={6}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <button
              onClick={handleProcessText}
              disabled={!inputText.trim() || state.isLoading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center space-x-2"
            >
              {state.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
        )}

        {state.stage === 'review' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 text-center">✅ Dati Estratti</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transaction Card */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🧾</span>
                  Fattura - €{state.transactionData!.amount.toFixed(2)}
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Data:</strong> {state.transactionData!.date}</div>
                  <div><strong>Descrizione:</strong> {state.transactionData!.description}</div>
                  <div><strong>Servizi:</strong> {state.transactionData!.services.length}</div>
                </div>
              </div>
              
              {/* Client Card */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">👤</span>
                  Cliente
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Nome:</strong> {state.clientData!.ragioneSociale || 'Da inserire'}</div>
                  {state.clientData!.partitaIVA && (
                    <div><strong>P.IVA:</strong> {state.clientData!.partitaIVA}</div>
                  )}
                  {state.clientData!.indirizzo && (
                    <div><strong>Indirizzo:</strong> {state.clientData!.indirizzo}</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => updateState({ stage: 'input' })}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                ← Modifica
              </button>
              <button
                onClick={() => updateState({ stage: 'clientEdit' })}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {state.clientData!.ragioneSociale ? 'Modifica Cliente →' : 'Inserisci Cliente →'}
              </button>
            </div>
          </div>
        )}

        {state.stage === 'clientEdit' && (
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 text-center">👤 Dati Cliente</h2>
            
            {/* Simple Client Form */}
            <ClientForm 
              initialData={state.clientData!} 
              onSave={handleClientUpdate}
              onCancel={() => updateState({ stage: 'review' })}
              transactionAmount={state.transactionData!.amount}
            />
          </div>
        )}

        {state.stage === 'preview' && (
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 text-center">🧾 Anteprima Fattura</h2>
            
            {/* Simple Preview */}
            <div className="border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Cliente:</strong> {state.clientData!.ragioneSociale}</div>
                <div><strong>P.IVA:</strong> {state.clientData!.partitaIVA || 'N/A'}</div>
                <div><strong>Data:</strong> {state.transactionData!.date}</div>
                <div><strong>Totale:</strong> €{state.transactionData!.amount.toFixed(2)}</div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Servizi:</h4>
                {state.transactionData!.services.map((service, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span>{service.description} (x{service.quantity})</span>
                    <span>€{(service.quantity * service.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 text-xs text-gray-500">
                <div>IVA: 0% • ATECO: 62.20.10 • Regime: Esenzione</div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => updateState({ stage: 'clientEdit' })}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                ← Modifica
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={state.isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {state.isLoading ? (
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

        {state.stage === 'complete' && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Fattura Creata!</h2>
            <p className="text-gray-600">
              Fattura creata con successo per <strong>{state.clientData?.ragioneSociale}</strong>
            </p>
            <button
              onClick={handleReset}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              🔄 Nuova Transazione
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Client Form Component
interface ClientFormProps {
  initialData: ClientData;
  onSave: (data: ClientData) => void;
  onCancel: () => void;
  transactionAmount: number;
}

const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSave, onCancel, transactionAmount }) => {
  const [formData, setFormData] = useState<ClientData>(initialData);

  const handleChange = (field: keyof ClientData, value: string) => {
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
      {/* Transaction reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-blue-800">
          <strong>💰 Fattura per €{transactionAmount.toFixed(2)}</strong> - Dati salvati
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ragione Sociale *
          </label>
          <input
            type="text"
            value={formData.ragioneSociale}
            onChange={(e) => handleChange('ragioneSociale', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Nome cliente/azienda"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">P.IVA</label>
          <input
            type="text"
            value={formData.partitaIVA}
            onChange={(e) => handleChange('partitaIVA', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="12345678901"
            maxLength={11}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="cliente@email.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
          <input
            type="text"
            value={formData.indirizzo}
            onChange={(e) => handleChange('indirizzo', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Via/Piazza, numero civico"
          />
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
        >
          Annulla
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          💾 Salva e Continua
        </button>
      </div>
    </div>
  );
};