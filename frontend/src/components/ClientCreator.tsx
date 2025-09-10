import { useState } from 'react';
import { aiService, type ClientExtractionResult } from '../services/aiService';
import { fiscozenAPI } from '../services/fiscozenAPI';
import type { ClientData } from '../types/client';
import { LoginModal } from './LoginModal';

interface ClientCreatorProps {
  onComplete: (success: boolean, clientId?: string) => void;
}

export function ClientCreator({ onComplete }: ClientCreatorProps) {
  const [step, setStep] = useState<'input' | 'review' | 'complete'>('input');
  const [clientRawText, setClientRawText] = useState<string>('');
  const [parsedClientData, setParsedClientData] = useState<ClientData | null>(null);
  const [manualClientData, setManualClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  const handleLoginSuccess = (token: string) => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    console.log('Login successful, token received');
  };

  const handleAiParsing = async () => {
    if (!clientRawText.trim()) {
      alert('Inserisci i dati del cliente da elaborare');
      return;
    }

    setLoading(true);
    try {
      const result = await aiService.extractClientData(clientRawText);
      
      if (result.success && result.data) {
        setParsedClientData(result.data);
        setStep('review');
      } else {
        alert('Errore nel parsing. Controlla i dati inseriti.');
      }
    } catch (error) {
      console.error('AI parsing error:', error);
      alert('Errore durante l\'elaborazione AI');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualClientData?.ragioneSociale) {
      alert('Inserisci almeno la ragione sociale');
      return;
    }
    
    setParsedClientData(manualClientData);
    setStep('review');
  };

  const handleCreateClient = async () => {
    if (!parsedClientData) return;

    // Controlla se siamo loggati
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      const result = await fiscozenAPI.createClient(parsedClientData);
      
      if (result.success && result.id) {
        setCreatedClientId(result.id);
        setStep('complete');
        onComplete(true, result.id);
      } else {
        alert('Errore creazione cliente: ' + (result.error || 'Errore sconosciuto'));
      }
    } catch (error) {
      console.error('Client creation error:', error);
      alert('Errore durante la creazione del cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setClientRawText('');
    setParsedClientData(null);
    setManualClientData(null);
    setCreatedClientId(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          👥 Creazione Cliente Standalone
        </h2>

        {step === 'input' && (
          <div className="space-y-6">
            {/* Sezione AI Parsing */}
            <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
              <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
                🤖 Metodo 1: Incolla Dati Cliente (AI Parsing)
              </h3>
              
              <p className="text-blue-700 mb-4">
                Incolla qui le informazioni complete del cliente e l'AI le organizzerà automaticamente:
              </p>

              <div className="space-y-4">
                <textarea
                  value={clientRawText}
                  onChange={(e) => setClientRawText(e.target.value)}
                  placeholder="Esempio:
Food Hub SRL Società Benefit
Via Martiri della Libertà 14/C 
Cesena (FC) 47521
P.IVA 04598540401
Codice fatturazione 6EWHWLT
Email: info@foodhub.it
Tel: 0547 123456"
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg h-40 text-sm font-mono"
                />
                
                <button
                  onClick={handleAiParsing}
                  disabled={loading || !clientRawText.trim()}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? '🔄 Elaborando con AI...' : '🚀 Elabora con AI'}
                </button>
              </div>

              <div className="text-xs text-blue-600 mt-3 bg-blue-100 p-2 rounded">
                💡 <strong>Funziona con OpenAI API key.</strong> Senza API key usa pattern matching regex automatico.
              </div>
            </div>

            {/* Divisore */}
            <div className="flex items-center justify-center my-6">
              <div className="border-t border-gray-300 flex-grow"></div>
              <span className="px-4 text-gray-500 text-sm font-medium">OPPURE</span>
              <div className="border-t border-gray-300 flex-grow"></div>
            </div>

            {/* Sezione Manuale */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                ✏️ Metodo 2: Compilazione Manuale
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ragione Sociale *
                  </label>
                  <input
                    type="text"
                    value={manualClientData?.ragioneSociale || ''}
                    onChange={(e) => setManualClientData(prev => ({
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome azienda completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partita IVA
                  </label>
                  <input
                    type="text"
                    value={manualClientData?.partitaIVA || ''}
                    onChange={(e) => setManualClientData(prev => prev ? {
                      ...prev,
                      partitaIVA: e.target.value
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="11 cifre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={manualClientData?.email || ''}
                    onChange={(e) => setManualClientData(prev => prev ? {
                      ...prev,
                      email: e.target.value
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@esempio.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={manualClientData?.indirizzo || ''}
                    onChange={(e) => setManualClientData(prev => prev ? {
                      ...prev,
                      indirizzo: e.target.value
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Via Roma 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comune
                  </label>
                  <input
                    type="text"
                    value={manualClientData?.comune || ''}
                    onChange={(e) => setManualClientData(prev => prev ? {
                      ...prev,
                      comune: e.target.value
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Milano"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={manualClientData?.provincia || ''}
                    onChange={(e) => setManualClientData(prev => prev ? {
                      ...prev,
                      provincia: e.target.value.toUpperCase()
                    } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="MI"
                    maxLength={2}
                  />
                </div>
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={!manualClientData?.ragioneSociale}
                className="w-full mt-4 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                📝 Procedi con Dati Manuali
              </button>
            </div>

            {/* Status Login */}
            <div className="text-center">
              {!isLoggedIn ? (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  ⚠️ Per creare il cliente sarà necessario accedere a Fiscozen
                </div>
              ) : (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  ✅ Connesso a Fiscozen - Pronto per creare clienti
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'review' && parsedClientData && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">
              📋 Conferma Dati Cliente
            </h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-3">
                ✅ Dati pronti per la creazione:
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><strong>Ragione Sociale:</strong> {parsedClientData.ragioneSociale}</div>
                <div><strong>P.IVA:</strong> {parsedClientData.partitaIVA || 'Non specificata'}</div>
                <div><strong>Email:</strong> {parsedClientData.email || 'Non specificata'}</div>
                <div><strong>Telefono:</strong> {parsedClientData.telefono || 'Non specificato'}</div>
                <div className="md:col-span-2"><strong>Indirizzo:</strong> {parsedClientData.indirizzo || 'Non specificato'}</div>
                <div><strong>Comune:</strong> {parsedClientData.comune || 'Non specificato'}</div>
                <div><strong>Provincia:</strong> {parsedClientData.provincia || 'Non specificata'}</div>
                <div><strong>CAP:</strong> {parsedClientData.cap || 'Non specificato'}</div>
                <div className="md:col-span-2"><strong>Codice Destinatario:</strong> {parsedClientData.codiceDestinatario || 'Non specificato'}</div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleCreateClient}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? '🔄 Creando cliente...' : '✅ Crea Cliente su Fiscozen'}
              </button>
              
              <button
                onClick={() => setStep('input')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                🔙 Modifica
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center space-y-6">
            <div className="bg-green-100 border border-green-300 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                🎉 Cliente Creato con Successo!
              </h3>
              
              <p className="text-green-700 mb-4">
                Il cliente <strong>{parsedClientData?.ragioneSociale}</strong> è stato aggiunto al tuo database Fiscozen.
              </p>
              
              {createdClientId && (
                <p className="text-sm text-green-600">
                  ID Cliente: {createdClientId}
                </p>
              )}
            </div>

            <div className="flex space-x-4 justify-center">
              <button
                onClick={handleReset}
                className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium"
              >
                👥 Crea Altro Cliente
              </button>
              
              <button
                onClick={() => onComplete(true, createdClientId || undefined)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                ✅ Termina
              </button>
            </div>
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