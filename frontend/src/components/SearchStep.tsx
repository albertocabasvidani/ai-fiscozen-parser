import React, { useState, useEffect } from 'react';
import type { ClientData, SearchResult } from '../types/client';
import { fiscozenAPI } from '../services/fiscozenAPI';

interface SearchStepProps {
  clientData: ClientData;
  onSearchCompleted: (results: SearchResult[]) => void;
  onProceedToInvoice?: () => void;
}

export const SearchStep: React.FC<SearchStepProps> = ({ clientData, onSearchCompleted, onProceedToInvoice }) => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [vatValidation, setVatValidation] = useState<{ valid: boolean; details?: any } | null>(null);
  const [searchName, setSearchName] = useState(clientData.ragioneSociale || '');
  const [searchVAT, setSearchVAT] = useState(clientData.partitaIVA || '');

  const handleLogin = async () => {
    if (!loginCredentials.email || !loginCredentials.password) {
      setError('Inserisci email e password');
      return;
    }

    try {
      const result = await fiscozenAPI.login(loginCredentials.email, loginCredentials.password);
      if (result.success) {
        setIsLoggedIn(true);
        setError('');
      } else {
        setError(result.error || 'Errore durante il login');
      }
    } catch (error) {
      setError('Errore di connessione');
    }
  };

  const handleSearch = async () => {
    if (!searchName.trim()) {
      setError('Inserisci il nome del cliente da cercare');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const results = await fiscozenAPI.searchClient(
        searchName.trim(),
        searchVAT.trim() || undefined
      );
      
      setSearchResults(results);
      onSearchCompleted(results);
      
      if (results.length === 0) {
        setError('Nessun cliente trovato. Puoi procedere alla creazione.');
      }
    } catch (error) {
      setError('Errore durante la ricerca');
    } finally {
      setIsSearching(false);
    }
  };

  const handleValidateVAT = async () => {
    const vatToValidate = searchVAT || clientData.partitaIVA;
    if (!vatToValidate) {
      setError('Nessuna P.IVA da validare');
      return;
    }

    try {
      const result = await fiscozenAPI.validateVAT(vatToValidate);
      setVatValidation(result);
    } catch (error) {
      setError('Errore durante la validazione P.IVA');
    }
  };

  useEffect(() => {
    if (isLoggedIn && searchName && clientData.ragioneSociale) {
      handleSearch();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-xl">🔍</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Step 2: Login Fiscozen</h2>
            <p className="text-gray-600">Inserisci le credenziali per accedere a Fiscozen</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Fiscozen:
            </label>
            <input
              type="email"
              value={loginCredentials.email}
              onChange={(e) => setLoginCredentials(prev => ({ ...prev, email: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="email@esempio.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password:
            </label>
            <input
              type="password"
              value={loginCredentials.password}
              onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Password"
            />
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <span>🔐</span>
            <span>Login Fiscozen</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-xl">🔍</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Step 2: Ricerca Cliente</h2>
          <p className="text-gray-600">Verifica se il cliente esiste già in Fiscozen</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Parametri di ricerca:</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ragione Sociale / Nome Cliente:
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Inserisci il nome del cliente"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                P.IVA (opzionale):
              </label>
              <input
                type="text"
                value={searchVAT}
                onChange={(e) => setSearchVAT(e.target.value)}
                placeholder="Inserisci la P.IVA (opzionale)"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {clientData.ragioneSociale && !searchName && (
            <div className="mt-2 text-xs text-gray-500">
              ℹ️ Dati estratti automaticamente. Puoi modificarli prima di cercare.
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchName.trim()}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <span>{isSearching ? '⏳' : '🔍'}</span>
            <span>{isSearching ? 'Cercando...' : 'Cerca Cliente'}</span>
          </button>

          {(searchVAT || clientData.partitaIVA) && (
            <button
              onClick={handleValidateVAT}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-2"
            >
              <span>✓</span>
              <span>Valida P.IVA</span>
            </button>
          )}
        </div>

        {vatValidation && (
          <div className={`p-4 rounded-lg border ${vatValidation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`${vatValidation.valid ? 'text-green-800' : 'text-red-800'}`}>
              {vatValidation.valid ? '✅ P.IVA valida' : '❌ P.IVA non valida'}
            </p>
            {vatValidation.details && (
              <pre className="mt-2 text-xs text-gray-600">{JSON.stringify(vatValidation.details, null, 2)}</pre>
            )}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📋 Risultati Ricerca:</h3>
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{result.ragioneSociale}</p>
                      {result.partitaIVA && <p className="text-sm text-gray-600">P.IVA: {result.partitaIVA}</p>}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Cliente Esistente
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 mb-3">
                ⚠️ <strong>Cliente già esistente!</strong> Non è necessario crearlo nuovamente.
              </p>
              {onProceedToInvoice && (
                <button
                  onClick={onProceedToInvoice}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>🧾</span>
                  <span>Procedi alla Creazione Fattura</span>
                </button>
              )}
            </div>
          </div>
        )}

        {searchResults.length === 0 && !isSearching && searchName && (
          <div className="border-t pt-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <p className="text-green-800">
                ✅ <strong>Cliente non trovato!</strong> Puoi procedere alla creazione o creare direttamente una fattura.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => onSearchCompleted([])}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <span>✨</span>
                  <span>Crea Cliente</span>
                </button>
                {onProceedToInvoice && (
                  <button
                    onClick={onProceedToInvoice}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>🧾</span>
                    <span>Crea Fattura</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};