import React, { useState } from 'react';
import type { ClientData } from '../types/client';
import { generateClaudePrompt, validateClaudeResponse } from '../services/claudeIntegration';
import { ClaudePromptModal } from './ClaudePromptModal';

interface ExtractStepProps {
  onDataExtracted: (data: ClientData) => void;
}

export const ExtractStep: React.FC<ExtractStepProps> = ({ onDataExtracted }) => {
  const [inputText, setInputText] = useState('');
  const [claudeResponse, setClaudeResponse] = useState('');
  const [prompt, setPrompt] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [extractedData, setExtractedData] = useState<ClientData | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [skipExtraction, setSkipExtraction] = useState(false);
  const [manualClientName, setManualClientName] = useState('');

  const handleGeneratePrompt = () => {
    if (!inputText.trim()) {
      setError('Inserisci il testo da analizzare');
      return;
    }
    
    const generatedPrompt = generateClaudePrompt(inputText);
    setPrompt(generatedPrompt);
    setShowModal(true);
    setError('');
  };

  const handleProcessResponse = () => {
    if (!claudeResponse.trim()) {
      setError('Incolla la risposta di Claude');
      return;
    }

    setIsProcessing(true);
    setError('');

    const validatedData = validateClaudeResponse(claudeResponse);
    
    if (validatedData) {
      setExtractedData(validatedData);
      onDataExtracted(validatedData);
      setError('');
    } else {
      setError('La risposta di Claude non è un JSON valido. Riprova.');
    }
    
    setIsProcessing(false);
  };

  const handleReset = () => {
    setInputText('');
    setClaudeResponse('');
    setPrompt('');
    setExtractedData(null);
    setError('');
    setSkipExtraction(false);
    setManualClientName('');
  };

  const handleSkipToSearch = () => {
    if (!manualClientName.trim()) {
      setError('Inserisci il nome del cliente per procedere');
      return;
    }
    
    const manualData: ClientData = {
      ragioneSociale: manualClientName.trim(),
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
    };
    
    onDataExtracted(manualData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-xl">📋</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Step 1: Estrazione Dati</h2>
          <p className="text-gray-600">Inserisci il testo contenente i dati del cliente</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="space-y-4">
        {!skipExtraction ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Opzioni disponibili:</h3>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Estrai automaticamente i dati del cliente con Claude AI</li>
                <li>Oppure cerca direttamente per nome cliente (senza estrazione)</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Testo con dati cliente:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Incolla qui il testo contenente i dati del cliente (email, documenti, etc.)"
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleGeneratePrompt}
                disabled={!inputText.trim()}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>🤖</span>
                <span>Genera Prompt per Claude</span>
              </button>
              
              <button
                onClick={() => setSkipExtraction(true)}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>🔍</span>
                <span>Salta alla Ricerca</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Ricerca diretta cliente</h3>
              <p className="text-sm text-purple-800">
                Inserisci il nome del cliente per cercarlo direttamente in Fiscozen senza estrazione dati.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Cliente / Ragione Sociale:
              </label>
              <input
                type="text"
                value={manualClientName}
                onChange={(e) => setManualClientName(e.target.value)}
                placeholder="Es: Mario Rossi o Nome Azienda SRL"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSkipToSearch}
                disabled={!manualClientName.trim()}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>→</span>
                <span>Procedi alla Ricerca</span>
              </button>
              
              <button
                onClick={() => {
                  setSkipExtraction(false);
                  setManualClientName('');
                  setError('');
                }}
                className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                ← Torna all'estrazione
              </button>
            </div>
          </>
        )}

        {prompt && !skipExtraction && (
          <>
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incolla qui la risposta JSON di Claude:
              </label>
              <textarea
                value={claudeResponse}
                onChange={(e) => setClaudeResponse(e.target.value)}
                placeholder="Incolla qui il JSON restituito da Claude..."
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleProcessResponse}
                disabled={!claudeResponse.trim() || isProcessing}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <span>{isProcessing ? '⏳' : '💾'}</span>
                <span>{isProcessing ? 'Processando...' : 'Processa Dati'}</span>
              </button>
              
              <button
                onClick={handleReset}
                className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Reset
              </button>
            </div>
          </>
        )}

        {extractedData && !skipExtraction && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">✅ Dati Estratti:</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><strong>Ragione Sociale:</strong> {extractedData.ragioneSociale || 'N/A'}</div>
                <div><strong>P.IVA:</strong> {extractedData.partitaIVA || 'N/A'}</div>
                <div><strong>Indirizzo:</strong> {extractedData.indirizzo || 'N/A'}</div>
                <div><strong>CAP:</strong> {extractedData.cap || 'N/A'}</div>
                <div><strong>Comune:</strong> {extractedData.comune || 'N/A'}</div>
                <div><strong>Provincia:</strong> {extractedData.provincia || 'N/A'}</div>
                <div><strong>Codice Destinatario:</strong> {extractedData.codiceDestinatario || 'N/A'}</div>
                <div><strong>PEC:</strong> {extractedData.pec || 'N/A'}</div>
                <div><strong>Email:</strong> {extractedData.email || 'N/A'}</div>
                <div><strong>Telefono:</strong> {extractedData.telefono || 'N/A'}</div>
                <div><strong>Referente:</strong> {extractedData.referente || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ClaudePromptModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        prompt={prompt}
      />
    </div>
  );
};