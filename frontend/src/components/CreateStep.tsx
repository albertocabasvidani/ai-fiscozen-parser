import React, { useState } from 'react';
import type { ClientData, SearchResult } from '../types/client';
import { fiscozenAPI } from '../services/fiscozenAPI';

interface CreateStepProps {
  clientData: ClientData;
  searchResults: SearchResult[];
  onClientCreated: (success: boolean, clientId?: string) => void;
}

export const CreateStep: React.FC<CreateStepProps> = ({ 
  clientData, 
  searchResults, 
  onClientCreated 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editableData, setEditableData] = useState<ClientData>({ ...clientData });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ created: boolean; clientId?: string } | null>(null);

  const clientExists = searchResults.length > 0;

  const handleFieldChange = (field: keyof ClientData, value: string) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!editableData.ragioneSociale) {
      setError('La ragione sociale è obbligatoria');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const result = await fiscozenAPI.createClient(editableData);
      
      if (result.success) {
        setSuccess({ created: true, clientId: result.id });
        onClientCreated(true, result.id);
      } else {
        setError(result.error || 'Errore durante la creazione');
        onClientCreated(false);
      }
    } catch (error) {
      setError('Errore di connessione');
      onClientCreated(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAutoComplete = async () => {
    if (editableData.cap && !editableData.comune) {
      try {
        const location = await fiscozenAPI.getLocationFromCAP(editableData.cap);
        if (location.comune || location.provincia) {
          setEditableData(prev => ({
            ...prev,
            comune: location.comune || prev.comune,
            provincia: location.provincia || prev.provincia
          }));
        }
      } catch (error) {
        console.error('Error auto-completing location:', error);
      }
    }
  };

  if (clientExists) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Step 3: Cliente Esistente</h2>
            <p className="text-gray-600">Il cliente è già presente in Fiscozen</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">📋 Cliente già esistente</h3>
          <div className="space-y-3">
            {searchResults.map((result, index) => (
              <div key={index} className="bg-white rounded border border-yellow-300 p-4">
                <p className="font-semibold">{result.ragioneSociale}</p>
                {result.partitaIVA && <p className="text-sm text-gray-600">P.IVA: {result.partitaIVA}</p>}
                <p className="text-sm text-gray-600">ID: {result.id}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
            <p className="text-yellow-800">
              ✅ <strong>Processo completato!</strong> Il cliente è già registrato in Fiscozen.
              Non è necessaria alcuna azione aggiuntiva.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success?.created) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-xl">✅</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Step 3: Cliente Creato</h2>
            <p className="text-gray-600">Il cliente è stato creato con successo</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4">🎉 Cliente creato con successo!</h3>
          <div className="bg-white rounded border border-green-300 p-4">
            <p className="font-semibold">{editableData.ragioneSociale}</p>
            {success.clientId && <p className="text-sm text-gray-600">ID Cliente: {success.clientId}</p>}
            {editableData.partitaIVA && <p className="text-sm text-gray-600">P.IVA: {editableData.partitaIVA}</p>}
          </div>
          <div className="mt-4 p-4 bg-green-100 rounded-lg">
            <p className="text-green-800">
              ✅ <strong>Processo completato!</strong> Il cliente è stato aggiunto a Fiscozen 
              e può ora essere gestito dalla piattaforma.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-xl">✨</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Step 3: Creazione Cliente</h2>
          <p className="text-gray-600">Verifica e crea il nuovo cliente in Fiscozen</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">
            ✅ <strong>Cliente non esistente!</strong> Puoi procedere alla creazione.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ragione Sociale *
            </label>
            <input
              type="text"
              value={editableData.ragioneSociale}
              onChange={(e) => handleFieldChange('ragioneSociale', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Partita IVA
            </label>
            <input
              type="text"
              value={editableData.partitaIVA}
              onChange={(e) => handleFieldChange('partitaIVA', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Indirizzo
            </label>
            <input
              type="text"
              value={editableData.indirizzo}
              onChange={(e) => handleFieldChange('indirizzo', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CAP
            </label>
            <input
              type="text"
              value={editableData.cap}
              onChange={(e) => handleFieldChange('cap', e.target.value)}
              onBlur={handleAutoComplete}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comune
            </label>
            <input
              type="text"
              value={editableData.comune}
              onChange={(e) => handleFieldChange('comune', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provincia
            </label>
            <input
              type="text"
              value={editableData.provincia}
              onChange={(e) => handleFieldChange('provincia', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Codice Destinatario
            </label>
            <input
              type="text"
              value={editableData.codiceDestinatario}
              onChange={(e) => handleFieldChange('codiceDestinatario', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PEC
            </label>
            <input
              type="email"
              value={editableData.pec}
              onChange={(e) => handleFieldChange('pec', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={editableData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefono
            </label>
            <input
              type="tel"
              value={editableData.telefono}
              onChange={(e) => handleFieldChange('telefono', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referente
            </label>
            <input
              type="text"
              value={editableData.referente}
              onChange={(e) => handleFieldChange('referente', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleCreate}
            disabled={isCreating || !editableData.ragioneSociale}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <span>{isCreating ? '⏳' : '✨'}</span>
            <span>{isCreating ? 'Creando Cliente...' : 'Crea Cliente in Fiscozen'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};