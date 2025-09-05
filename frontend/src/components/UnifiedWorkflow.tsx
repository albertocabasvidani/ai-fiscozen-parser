import { useState, useCallback } from 'react';
import type { ClientData, SearchResult, InvoiceData } from '../types/client';
import { aiService, type ExtractionResult } from '../services/aiService';
import { fiscozenAPI } from '../services/fiscozenAPI';

type WorkflowStage = 
  | 'input' 
  | 'extracting' 
  | 'confirmData' 
  | 'manualClientInput'
  | 'searchingClient' 
  | 'confirmClient' 
  | 'creatingInvoice' 
  | 'confirmInvoice' 
  | 'completed';

interface WorkflowState {
  stage: WorkflowStage;
  inputText: string;
  extractedData: ExtractionResult['data'] | null;
  clientData: ClientData | null;
  searchResults: SearchResult[];
  selectedClient: SearchResult | null;
  invoiceData: Partial<InvoiceData> | null;
  isLoggedIn: boolean;
  error: string;
}

interface UnifiedWorkflowProps {
  onComplete: (success: boolean, invoiceId?: string) => void;
}

export const UnifiedWorkflow: React.FC<UnifiedWorkflowProps> = ({ onComplete }) => {
  const [state, setState] = useState<WorkflowState>({
    stage: 'input',
    inputText: '',
    extractedData: null,
    clientData: null,
    searchResults: [],
    selectedClient: null,
    invoiceData: null,
    isLoggedIn: false,
    error: ''
  });

  const updateState = useCallback((updates: Partial<WorkflowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Step 1: Process input text
  const handleProcessText = async () => {
    if (!state.inputText.trim()) {
      updateState({ error: 'Inserisci il testo della transazione' });
      return;
    }

    updateState({ stage: 'extracting', error: '' });

    try {
      const result = await aiService.extractTransactionData(state.inputText);
      
      if (result.success && result.data) {
        updateState({
          stage: 'confirmData',
          extractedData: result.data
        });
      } else {
        updateState({
          error: result.error || 'Errore durante l\'estrazione dei dati',
          stage: 'input'
        });
      }
    } catch (error) {
      updateState({
        error: 'Errore durante l\'elaborazione del testo',
        stage: 'input'
      });
    }
  };

  // Step 2: Confirm extracted data
  const handleConfirmData = () => {
    if (!state.extractedData) return;

    const clientData: ClientData = {
      ragioneSociale: state.extractedData.clientName,
      partitaIVA: state.extractedData.vatNumber || '',
      indirizzo: state.extractedData.address || '',
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
      stage: 'searchingClient',
      clientData,
      error: ''
    });

    // Auto proceed to client search
    searchClient(clientData);
  };

  // Step 2b: Handle manual client data input
  const handleManualClientData = (clientData: ClientData) => {
    updateState({
      stage: 'searchingClient',
      clientData,
      error: ''
    });

    // Proceed to client search
    searchClient(clientData);
  };

  // Step 3: Search client
  const searchClient = async (clientData: ClientData) => {
    if (!state.isLoggedIn) {
      // Mock login for development
      updateState({ isLoggedIn: true });
    }

    try {
      const results = await fiscozenAPI.searchClient(
        clientData.ragioneSociale,
        clientData.partitaIVA
      );

      updateState({
        stage: 'confirmClient',
        searchResults: results
      });
    } catch (error) {
      updateState({
        error: 'Errore durante la ricerca del cliente',
        stage: 'input'
      });
    }
  };

  // Step 4: Confirm client selection
  const handleClientSelection = (useExisting: boolean, client?: SearchResult) => {
    if (useExisting && client) {
      updateState({
        selectedClient: client,
        stage: 'creatingInvoice'
      });
    } else {
      // Use extracted client data as new client
      updateState({
        selectedClient: null,
        stage: 'creatingInvoice'
      });
    }

    // Auto proceed to invoice creation
    setTimeout(() => createInvoiceData(), 100);
  };

  // Step 5: Create invoice data
  const createInvoiceData = () => {
    if (!state.extractedData || !state.clientData) return;

    const today = new Date().toISOString().split('T')[0];
    const invoiceData: Partial<InvoiceData> = {
      client: state.clientData,
      date: today,
      dueDate: today,
      lineItems: state.extractedData.services.map(service => ({
        id: Date.now().toString() + Math.random(),
        description: service.description,
        quantity: service.quantity,
        unitPrice: service.unitPrice,
        vatRate: 0, // No VAT
        total: service.quantity * service.unitPrice
      })),
      subtotal: state.extractedData.amount,
      vatAmount: 0,
      total: state.extractedData.amount,
      atecoCode: '62.20.10',
      notes: `Estratto automaticamente dal testo: "${state.inputText.substring(0, 100)}..."`
    };

    updateState({
      invoiceData,
      stage: 'confirmInvoice'
    });
  };

  // Step 6: Create final invoice
  const handleCreateInvoice = async () => {
    if (!state.invoiceData) return;

    try {
      const response = await fetch('http://localhost:3001/api/fiscozen/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.invoiceData),
      });

      const result = await response.json();

      if (result.success) {
        updateState({ stage: 'completed' });
        onComplete(true, result.id);
      } else {
        updateState({ 
          error: result.error || 'Errore durante la creazione della fattura',
          stage: 'confirmInvoice'
        });
      }
    } catch (error) {
      updateState({ 
        error: 'Errore di connessione',
        stage: 'confirmInvoice'
      });
    }
  };

  // Render based on current stage
  const renderContent = () => {
    switch (state.stage) {
      case 'input':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                💰 Fatturazione da Pagamento
              </h2>
              <p className="text-gray-600">
                Incolla i dettagli del pagamento ricevuto e l'AI creerà automaticamente la fattura
              </p>
              
              {/* API Status */}
              {!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'your-openai-api-key-here' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <p className="text-yellow-800 flex items-center space-x-2">
                    <span>⚠️</span>
                    <span>
                      <strong>API non configurata</strong> - Funzionerà con estrazione semplificata. 
                      Vedi <code>API_SETUP.md</code> per configurare OpenAI e migliori risultati.
                    </span>
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <p className="text-green-800 flex items-center space-x-2">
                    <span>✅</span>
                    <span><strong>AI attiva</strong> - Estrazione avanzata con OpenAI GPT-4o-mini</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dati del Pagamento/Transazione:
              </label>
              <textarea
                value={state.inputText}
                onChange={(e) => updateState({ inputText: e.target.value })}
                placeholder="Incolla qui i dettagli del pagamento ricevuto:&#10;- Email di conferma pagamento&#10;- Notifica bancaria&#10;- Screenshot transazione&#10;- Ricevuta di pagamento&#10;- Comunicazione del cliente&#10;&#10;Esempio: 'Stripe payment €500 from Company XYZ for monthly subscription service'"
                rows={8}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleProcessText}
              disabled={!state.inputText.trim()}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <span>💰</span>
              <span>Crea Fattura da Pagamento</span>
            </button>
          </div>
        );

      case 'extracting':
        return (
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <h3 className="text-xl font-semibold">Analizzando pagamento con AI...</h3>
            <p className="text-gray-600">Estrazione cliente, importo e servizi dal testo</p>
          </div>
        );

      case 'confirmData':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">✅ Dati Pagamento Estratti</h3>
            
            {state.extractedData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Cliente:</strong> {state.extractedData.clientName}</div>
                  <div><strong>Importo:</strong> €{state.extractedData.amount.toFixed(2)}</div>
                  {state.extractedData.vatNumber && (
                    <div><strong>P.IVA:</strong> {state.extractedData.vatNumber}</div>
                  )}
                  <div><strong>Descrizione:</strong> {state.extractedData.description}</div>
                </div>
                
                {state.extractedData.services.length > 0 && (
                  <div className="mt-4">
                    <strong>Servizi identificati:</strong>
                    <ul className="mt-2 space-y-1">
                      {state.extractedData.services.map((service, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{service.description} (x{service.quantity})</span>
                          <span>€{service.unitPrice.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={handleConfirmData}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                ✅ Conferma e Continua
              </button>
              <button
                onClick={() => updateState({ stage: 'manualClientInput', error: '' })}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ✏️ Inserisci Cliente Manualmente
              </button>
              <button
                onClick={() => updateState({ stage: 'input', error: '' })}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Modifica
              </button>
            </div>
          </div>
        );

      case 'manualClientInput':
        return (
          <ManualClientForm 
            onSave={handleManualClientData}
            onCancel={() => updateState({ stage: 'confirmData', error: '' })}
            initialData={state.extractedData}
          />
        );

      case 'searchingClient':
        return (
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <h3 className="text-xl font-semibold">Cercando cliente...</h3>
            <p className="text-gray-600">Verifica se il cliente esiste già</p>
          </div>
        );

      case 'confirmClient':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">🔍 Cliente Trovato</h3>
            
            {state.searchResults.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-900 mb-2">Cliente esistente trovato:</h4>
                  {state.searchResults.map(client => (
                    <div key={client.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{client.ragioneSociale}</p>
                        {client.partitaIVA && <p className="text-sm text-gray-600">P.IVA: {client.partitaIVA}</p>}
                      </div>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">Esistente</span>
                    </div>
                  ))}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => handleClientSelection(true, state.searchResults[0])}
                    className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    ✅ Usa Cliente Esistente
                  </button>
                  <button
                    onClick={() => handleClientSelection(false)}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    ➕ Crea Nuovo Cliente
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    ✅ Cliente non trovato. Verrà creato un nuovo cliente.
                  </p>
                </div>

                <button
                  onClick={() => handleClientSelection(false)}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  ➕ Continua con Nuovo Cliente
                </button>
              </div>
            )}
          </div>
        );

      case 'creatingInvoice':
        return (
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <h3 className="text-xl font-semibold">Preparando fattura...</h3>
            <p className="text-gray-600">Creazione dati fattura automatica</p>
          </div>
        );

      case 'confirmInvoice':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">🧾 Anteprima Fattura</h3>
            
            {state.invoiceData && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><strong>Cliente:</strong> {state.invoiceData.client?.ragioneSociale}</div>
                  <div><strong>Data:</strong> {state.invoiceData.date}</div>
                  <div><strong>ATECO:</strong> {state.invoiceData.atecoCode}</div>
                  <div><strong>Totale:</strong> €{state.invoiceData.total?.toFixed(2)} (IVA 0%)</div>
                </div>
                
                {state.invoiceData.lineItems && state.invoiceData.lineItems.length > 0 && (
                  <div className="border-t pt-3">
                    <strong>Servizi:</strong>
                    <ul className="mt-2 space-y-1">
                      {state.invoiceData.lineItems.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{item.description} (x{item.quantity})</span>
                          <span>€{item.total.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleCreateInvoice}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              >
                🧾 Crea Fattura
              </button>
              <button
                onClick={() => updateState({ stage: 'input', error: '' })}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Ricomincia
              </button>
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Completato!</h2>
            <p className="text-gray-600">
              La fattura è stata creata con successo tramite processo automatizzato
            </p>
            <button
              onClick={() => updateState({ stage: 'input', inputText: '', extractedData: null, clientData: null, invoiceData: null, error: '' })}
              className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Nuova Transazione
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
          <span>Progresso</span>
          <span>{getStageNumber(state.stage)}/7</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(getStageNumber(state.stage) / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Error message */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {state.error}</p>
        </div>
      )}

      {/* Main content */}
      {renderContent()}
    </div>
  );
};

// Manual Client Input Form Component
interface ManualClientFormProps {
  onSave: (clientData: ClientData) => void;
  onCancel: () => void;
  initialData: ExtractionResult['data'] | null;
}

const ManualClientForm: React.FC<ManualClientFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<ClientData>({
    ragioneSociale: initialData?.clientName || '',
    partitaIVA: initialData?.vatNumber || '',
    indirizzo: initialData?.address || '',
    cap: '',
    comune: '',
    provincia: '',
    codiceDestinatario: '',
    pec: '',
    email: '',
    telefono: '',
    referente: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (field: keyof ClientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.ragioneSociale.trim()) {
      newErrors.ragioneSociale = 'Ragione sociale obbligatoria';
    }
    
    if (formData.partitaIVA && formData.partitaIVA.length !== 11) {
      newErrors.partitaIVA = 'La P.IVA deve essere di 11 cifre';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800">✏️ Inserimento Manuale Cliente</h3>
        <p className="text-gray-600 mt-1">
          Inserisci i dati del cliente non rilevati automaticamente
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
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.ragioneSociale ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Nome azienda o cliente"
          />
          {errors.ragioneSociale && (
            <p className="text-red-600 text-xs mt-1">{errors.ragioneSociale}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Partita IVA
          </label>
          <input
            type="text"
            value={formData.partitaIVA}
            onChange={(e) => handleChange('partitaIVA', e.target.value)}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.partitaIVA ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="12345678901"
            maxLength={11}
          />
          {errors.partitaIVA && (
            <p className="text-red-600 text-xs mt-1">{errors.partitaIVA}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="cliente@email.com"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Indirizzo
          </label>
          <input
            type="text"
            value={formData.indirizzo}
            onChange={(e) => handleChange('indirizzo', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Via/Piazza, numero civico"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CAP
          </label>
          <input
            type="text"
            value={formData.cap}
            onChange={(e) => handleChange('cap', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="00100"
            maxLength={5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comune
          </label>
          <input
            type="text"
            value={formData.comune}
            onChange={(e) => handleChange('comune', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Roma"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provincia
          </label>
          <input
            type="text"
            value={formData.provincia}
            onChange={(e) => handleChange('provincia', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="RM"
            maxLength={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefono
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="+39 123 456 7890"
          />
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          ✅ Salva e Continua
        </button>
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          ← Indietro
        </button>
      </div>
    </div>
  );
};

function getStageNumber(stage: WorkflowStage): number {
  const stages = ['input', 'extracting', 'confirmData', 'manualClientInput', 'searchingClient', 'confirmClient', 'creatingInvoice', 'confirmInvoice', 'completed'];
  return stages.indexOf(stage) + 1;
}