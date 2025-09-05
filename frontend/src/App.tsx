import { useState } from 'react';
import type { ClientData, SearchResult } from './types/client';
import { Navigation } from './components/Navigation';
import { ExtractStep } from './components/ExtractStep';
import { SearchStep } from './components/SearchStep';
import { CreateStep } from './components/CreateStep';
import { InvoiceStep } from './components/InvoiceStep';
import { FastWorkflow } from './components/FastWorkflow';
import { SimpleWorkflow } from './components/SimpleWorkflow';

function App() {
  const [workflowMode, setWorkflowMode] = useState<'simple' | 'auto' | 'manual'>('simple');
  const [currentStep, setCurrentStep] = useState(1);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleDataExtracted = (data: ClientData) => {
    setClientData(data);
    setCurrentStep(2);
  };

  const handleSearchCompleted = (results: SearchResult[]) => {
    setSearchResults(results);
    setCurrentStep(3);
  };

  const handleProceedToInvoice = () => {
    setCurrentStep(4);
  };

  const handleClientCreated = (success: boolean, clientId?: string) => {
    if (success) {
      console.log('Client created successfully:', clientId);
      setCurrentStep(4);
    }
  };

  const handleInvoiceCreated = (success: boolean, invoiceId?: string) => {
    if (success) {
      console.log('Invoice created successfully:', invoiceId);
    }
  };

  const handleWorkflowComplete = (success: boolean, invoiceId?: string) => {
    if (success) {
      console.log('Automated workflow completed:', invoiceId);
      // Reset for next transaction
      setCurrentStep(1);
      setClientData(null);
      setSearchResults([]);
    }
  };

  const handleStepClick = (step: number) => {
    if (step === 1) {
      setCurrentStep(1);
    } else if (step === 2) {
      if (!clientData) {
        setClientData({
          ragioneSociale: '',
          partitaIVA: '',
          indirizzo: '',
          cap: '',
          comune: '',
          provincia: '',
          codiceDestinatario: '',
          pec: '',
          email: '',
          telefono: '',
          referente: ''
        });
      }
      setCurrentStep(2);
    } else if (step === 3 && clientData) {
      setCurrentStep(3);
    } else if (step === 4 && clientData) {
      setCurrentStep(4);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🤖 AI Fiscozen Parser
          </h1>
          <p className="text-gray-600">
            Crea fatture automaticamente dai dati di pagamento ricevuti
          </p>
          
          {/* Workflow mode selector */}
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={() => setWorkflowMode('simple')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                workflowMode === 'simple' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⚡ Flusso Semplificato
            </button>
            <button
              onClick={() => setWorkflowMode('auto')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                workflowMode === 'auto' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              💰 Da Pagamento
            </button>
            <button
              onClick={() => setWorkflowMode('manual')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                workflowMode === 'manual' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🔧 Manuale
            </button>
          </div>
        </header>

        {workflowMode === 'manual' && (
          <Navigation
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
        )}

        <main className="w-full">
          {workflowMode === 'simple' ? (
            <SimpleWorkflow onComplete={handleWorkflowComplete} />
          ) : workflowMode === 'auto' ? (
            <FastWorkflow onComplete={handleWorkflowComplete} />
          ) : (
            <div className="max-w-4xl mx-auto">
              {currentStep === 1 && (
                <ExtractStep onDataExtracted={handleDataExtracted} />
              )}

              {currentStep === 2 && (
                <SearchStep
                  clientData={clientData || {
                    ragioneSociale: '',
                    partitaIVA: '',
                    indirizzo: '',
                    cap: '',
                    comune: '',
                    provincia: '',
                    codiceDestinatario: '',
                    pec: '',
                    email: '',
                    telefono: '',
                    referente: ''
                  }}
                  onSearchCompleted={handleSearchCompleted}
                  onProceedToInvoice={handleProceedToInvoice}
                />
              )}

              {currentStep === 3 && clientData && (
                <CreateStep
                  clientData={clientData}
                  searchResults={searchResults}
                  onClientCreated={handleClientCreated}
                />
              )}

              {currentStep === 4 && clientData && (
                <InvoiceStep
                  clientData={clientData}
                  onInvoiceCreated={handleInvoiceCreated}
                />
              )}
            </div>
          )}
        </main>

        <footer className="text-center mt-12 text-sm text-gray-500">
          <p>💾 Modalità completamente locale - Tutti i dati rimangono sul tuo PC</p>
        </footer>
      </div>
    </div>
  );
}

export default App;