import { useState, useCallback, useEffect } from 'react';
import { TransactionData, ClientData, SearchResult, WorkflowState } from '../types/client';
import { aiService } from '../services/aiService';
import { fiscozenAPI } from '../services/fiscozenAPI';
import { 
  TransactionDataCard, 
  ClientDataCard, 
  TransactionSummaryCard, 
  ClientEditForm, 
  InvoicePreviewCard 
} from './WorkflowComponents';

interface ModernUnifiedWorkflowProps {
  onComplete: (success: boolean, invoiceId?: string) => void;
}

export const ModernUnifiedWorkflow: React.FC<ModernUnifiedWorkflowProps> = ({ onComplete }) => {
  const [state, setState] = useState<WorkflowState>({
    stage: 'input',
    transactionData: null,
    clientData: null,
    searchResults: [],
    selectedClient: null,
    isProcessing: false,
    error: ''
  });

  const [inputText, setInputText] = useState('');

  const updateState = useCallback((updates: Partial<WorkflowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Persist transaction data to sessionStorage
  useEffect(() => {
    if (state.transactionData) {
      sessionStorage.setItem('transactionData', JSON.stringify(state.transactionData));
    }
  }, [state.transactionData]);

  // Step 1: Process input text
  const handleProcessText = async () => {
    if (!inputText.trim()) {
      updateState({ error: 'Inserisci il testo della transazione' });
      return;
    }

    updateState({ isProcessing: true, error: '' });

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
          isProcessing: false
        });
      } else {
        updateState({
          error: result.error || 'Errore durante l\'estrazione dei dati',
          isProcessing: false
        });
      }
    } catch (error) {
      updateState({
        error: 'Errore durante l\'elaborazione del testo',
        isProcessing: false
      });
    }
  };

  // Navigate to client edit
  const handleEditClient = () => {
    updateState({ stage: 'clientEdit' });
  };

  // Handle client data update
  const handleClientUpdate = (newClientData: ClientData) => {
    updateState({
      clientData: newClientData,
      stage: 'clientSearch',
      isProcessing: true
    });
    searchClient(newClientData);
  };

  // Search client
  const searchClient = async (clientData: ClientData) => {
    try {
      const results = await fiscozenAPI.searchClient(
        clientData.ragioneSociale,
        clientData.partitaIVA
      );

      updateState({
        searchResults: results,
        stage: 'preview', // Skip to preview, user can go back to search if needed
        isProcessing: false
      });
    } catch (error) {
      updateState({
        error: 'Errore durante la ricerca del cliente',
        isProcessing: false,
        stage: 'clientEdit'
      });
    }
  };

  // Create final invoice
  const handleCreateInvoice = async () => {
    if (!state.transactionData || !state.clientData) return;

    updateState({ isProcessing: true, error: '' });

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
        notes: `Generato automaticamente da: "${state.transactionData.description}"`
      };

      const response = await fetch('http://localhost:3001/api/fiscozen/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (result.success) {
        updateState({ stage: 'complete', isProcessing: false });
        sessionStorage.removeItem('transactionData');
        onComplete(true, result.id);
      } else {
        updateState({ 
          error: result.error || 'Errore durante la creazione della fattura',
          isProcessing: false
        });
      }
    } catch (error) {
      updateState({ 
        error: 'Errore di connessione',
        isProcessing: false
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
      selectedClient: null,
      isProcessing: false,
      error: ''
    });
    sessionStorage.removeItem('transactionData');
  };

  const renderContent = () => {
    switch (state.stage) {
      case 'input':
        return <InputStage />;
      case 'review':
        return <ReviewStage />;
      case 'clientEdit':
        return <ClientEditStage />;
      case 'clientSearch':
        return <ClientSearchStage />;
      case 'preview':
        return <PreviewStage />;
      case 'complete':
        return <CompleteStage />;
      default:
        return null;
    }
  };

  // INPUT STAGE
  const InputStage = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
          <span className="text-3xl">💰</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Fatturazione Intelligente
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Incolla i dettagli del pagamento ricevuto e creeremo automaticamente la fattura
          </p>
        </div>
        
        {/* API Status */}
        <APIStatusBadge />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <label className="block text-base font-semibold text-gray-800 mb-2">
              📄 Dati del Pagamento/Transazione
            </label>
            <p className="text-sm text-gray-600">
              Email di conferma, notifiche bancarie, screenshot, ricevute di pagamento
            </p>
          </div>
          
          <div className="p-6">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Incolla qui i dettagli del pagamento ricevuto:&#10;&#10;Esempi:&#10;• 'Stripe payment €500 from Tech Solutions SRL'&#10;• 'PayPal payment received €150 for monthly subscription'&#10;• 'Bonifico ricevuto €1200 da ABC Company per servizi consulenza'"
              rows={8}
              className="w-full p-4 border-0 resize-none text-gray-700 placeholder-gray-400 focus:outline-none text-base leading-relaxed"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleProcessText}
            disabled={!inputText.trim() || state.isProcessing}
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
          >
            {state.isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Elaborando...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Crea Fattura Automaticamente</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // REVIEW STAGE - Split view
  const ReviewStage = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Dati Estratti</h2>
        <p className="text-gray-600">Controlla e modifica se necessario</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Transaction Data Card */}
        <TransactionDataCard data={state.transactionData!} />
        
        {/* Client Data Card */}
        <ClientDataCard 
          data={state.clientData!} 
          onEdit={handleEditClient}
        />
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={() => updateState({ stage: 'input' })}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
        >
          ← Modifica Testo
        </button>
        <button
          onClick={() => {
            if (state.clientData?.ragioneSociale) {
              handleClientUpdate(state.clientData);
            } else {
              handleEditClient();
            }
          }}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium"
        >
          Continua →
        </button>
      </div>
    </div>
  );

  // CLIENT EDIT STAGE
  const ClientEditStage = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">👤 Dati Cliente</h2>
        <p className="text-gray-600">Completa le informazioni del cliente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Client Form */}
        <div className="lg:col-span-2">
          <ClientEditForm 
            initialData={state.clientData!}
            onSave={handleClientUpdate}
            onCancel={() => updateState({ stage: 'review' })}
          />
        </div>

        {/* Transaction Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <TransactionSummaryCard data={state.transactionData!} />
          </div>
        </div>
      </div>
    </div>
  );

  // PREVIEW STAGE
  const PreviewStage = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🧾 Anteprima Fattura</h2>
        <p className="text-gray-600">Controlla tutti i dettagli prima di creare la fattura</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <InvoicePreviewCard 
          transactionData={state.transactionData!}
          clientData={state.clientData!}
          searchResults={state.searchResults}
        />
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={() => updateState({ stage: 'clientEdit' })}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
        >
          ← Modifica Cliente
        </button>
        <button
          onClick={handleCreateInvoice}
          disabled={state.isProcessing}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all font-medium flex items-center space-x-2"
        >
          {state.isProcessing ? (
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
  );

  // COMPLETE STAGE
  const CompleteStage = () => (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-xl">
        <span className="text-4xl">✅</span>
      </div>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Fattura Creata!</h2>
        <p className="text-lg text-gray-600">
          La fattura è stata creata con successo per <strong>{state.clientData?.ragioneSociale}</strong>
        </p>
      </div>
      <button
        onClick={handleReset}
        className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
      >
        <span>🔄</span>
        <span>Nuova Transazione</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Progress Bar */}
        <ProgressBar stage={state.stage} />
        
        {/* Error Message */}
        {state.error && (
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-red-800 font-medium">{state.error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="relative">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Progress Bar Component
const ProgressBar: React.FC<{ stage: WorkflowState['stage'] }> = ({ stage }) => {
  const stages = ['input', 'review', 'clientEdit', 'preview', 'complete'];
  const currentIndex = stages.indexOf(stage);
  const progress = ((currentIndex + 1) / stages.length) * 100;

  return (
    <div className="mb-12 max-w-4xl mx-auto">
      <div className="flex justify-between text-sm text-gray-500 mb-2">
        <span>Progresso</span>
        <span>{currentIndex + 1}/{stages.length}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// API Status Badge
const APIStatusBadge = () => {
  const hasApiKey = import.meta.env.VITE_OPENAI_API_KEY && 
                   import.meta.env.VITE_OPENAI_API_KEY !== 'your-openai-api-key-here';
  
  return (
    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm border">
      {hasApiKey ? (
        <>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-700">AI Avanzata Attiva</span>
          <span className="text-green-600">(OpenAI GPT-4o-mini)</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
          <span className="text-yellow-700">Modalità Semplificata</span>
          <span className="text-yellow-600">(Regex + Manuale)</span>
        </>
      )}
    </div>
  );
};

// Component exports will continue in the next parts...