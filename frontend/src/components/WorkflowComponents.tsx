import { useState } from 'react';
import { TransactionData, ClientData, SearchResult } from '../types/client';

// Transaction Data Card - Always preserved and visible
export const TransactionDataCard: React.FC<{ data: TransactionData }> = ({ data }) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
      <h3 className="text-lg font-semibold text-blue-900 flex items-center space-x-2">
        <span>🧾</span>
        <span>Dati Fattura</span>
        <span className="ml-auto bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
          Salvati ✓
        </span>
      </h3>
    </div>
    
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Importo</label>
          <p className="text-2xl font-bold text-gray-900">€{data.amount.toFixed(2)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Data</label>
          <p className="text-lg font-semibold text-gray-700">{data.date}</p>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2 block">Servizi</label>
        <div className="space-y-2">
          {data.services.map((service, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="font-medium text-gray-900">{service.description}</p>
                <p className="text-sm text-gray-500">Quantità: {service.quantity}</p>
              </div>
              <p className="font-semibold text-gray-900">€{(service.quantity * service.unitPrice).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="pt-4 border-t border-gray-200">
        <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Descrizione</label>
        <p className="text-gray-700 text-sm leading-relaxed">{data.description}</p>
      </div>
    </div>
  </div>
);

// Client Data Card - Editable
export const ClientDataCard: React.FC<{ 
  data: ClientData; 
  onEdit: () => void;
}> = ({ data, onEdit }) => {
  const isEmpty = !data.ragioneSociale || data.ragioneSociale === 'Cliente da identificare';
  
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className={`px-6 py-4 border-b ${
        isEmpty ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' 
                : 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
      }`}>
        <h3 className={`text-lg font-semibold flex items-center space-x-2 ${
          isEmpty ? 'text-orange-900' : 'text-green-900'
        }`}>
          <span>{isEmpty ? '👤' : '✅'}</span>
          <span>Dati Cliente</span>
          <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
            isEmpty ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
          }`}>
            {isEmpty ? 'Da completare' : 'Rilevato'}
          </span>
        </h3>
      </div>
      
      <div className="p-6 space-y-4">
        {isEmpty ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Cliente non identificato</h4>
            <p className="text-gray-600 mb-6">I dati del cliente devono essere inseriti manualmente</p>
            <button
              onClick={onEdit}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
            >
              <span>✏️</span>
              <span>Inserisci Dati Cliente</span>
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Ragione Sociale</label>
                <p className="text-lg font-semibold text-gray-900">{data.ragioneSociale}</p>
              </div>
              
              {data.partitaIVA && (
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">P.IVA</label>
                  <p className="text-gray-700">{data.partitaIVA}</p>
                </div>
              )}
              
              {data.indirizzo && (
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Indirizzo</label>
                  <p className="text-gray-700">{data.indirizzo}</p>
                </div>
              )}
              
              {data.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email</label>
                  <p className="text-gray-700">{data.email}</p>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={onEdit}
                className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                ✏️ Modifica Dati Cliente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Transaction Summary Card - Sticky sidebar
export const TransactionSummaryCard: React.FC<{ data: TransactionData }> = ({ data }) => (
  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200 shadow-lg">
    <div className="text-center mb-6">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
        <span className="text-xl text-white">📌</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Fattura in Preparazione</h3>
      <p className="text-sm text-gray-600 mt-1">Dati salvati automaticamente</p>
    </div>
    
    <div className="space-y-4">
      <div className="text-center p-4 bg-white rounded-xl shadow-sm">
        <p className="text-sm text-gray-500 mb-1">Totale Fattura</p>
        <p className="text-3xl font-bold text-gray-900">€{data.amount.toFixed(2)}</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Data:</span>
          <span className="font-medium text-gray-900">{data.date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Servizi:</span>
          <span className="font-medium text-gray-900">{data.services.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">IVA:</span>
          <span className="font-medium text-gray-900">0%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">ATECO:</span>
          <span className="font-medium text-gray-900">62.20.10</span>
        </div>
      </div>
      
      <div className="pt-4 border-t border-blue-200">
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Dettagli Servizi</p>
          {data.services.map((service, idx) => (
            <div key={idx} className="text-xs text-gray-700 py-1">
              {service.description} (x{service.quantity})
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Client Edit Form
export const ClientEditForm: React.FC<{
  initialData: ClientData;
  onSave: (data: ClientData) => void;
  onCancel: () => void;
}> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<ClientData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (field: keyof ClientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900">👤 Informazioni Cliente</h3>
        <p className="text-sm text-blue-700 mt-1">Tutti i campi sono opzionali tranne la Ragione Sociale</p>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Ragione Sociale *
          </label>
          <input
            type="text"
            value={formData.ragioneSociale}
            onChange={(e) => handleChange('ragioneSociale', e.target.value)}
            className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              errors.ragioneSociale ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Nome azienda o cliente"
          />
          {errors.ragioneSociale && (
            <p className="text-red-600 text-sm mt-1 flex items-center space-x-1">
              <span>⚠️</span>
              <span>{errors.ragioneSociale}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Partita IVA</label>
            <input
              type="text"
              value={formData.partitaIVA}
              onChange={(e) => handleChange('partitaIVA', e.target.value)}
              className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.partitaIVA ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="12345678901"
              maxLength={11}
            />
            {errors.partitaIVA && (
              <p className="text-red-600 text-sm mt-1">{errors.partitaIVA}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="cliente@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Indirizzo</label>
          <input
            type="text"
            value={formData.indirizzo}
            onChange={(e) => handleChange('indirizzo', e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Via/Piazza, numero civico"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">CAP</label>
            <input
              type="text"
              value={formData.cap}
              onChange={(e) => handleChange('cap', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="00100"
              maxLength={5}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Comune</label>
            <input
              type="text"
              value={formData.comune}
              onChange={(e) => handleChange('comune', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Roma"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Provincia</label>
            <input
              type="text"
              value={formData.provincia}
              onChange={(e) => handleChange('provincia', e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="RM"
              maxLength={2}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Telefono</label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="+39 123 456 7890"
          />
        </div>
      </div>

      <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
        >
          Annulla
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium"
        >
          💾 Salva e Continua
        </button>
      </div>
    </div>
  );
};

// Invoice Preview Card
export const InvoicePreviewCard: React.FC<{
  transactionData: TransactionData;
  clientData: ClientData;
  searchResults: SearchResult[];
}> = ({ transactionData, clientData, searchResults }) => (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
    <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
      <h3 className="text-xl font-semibold text-purple-900 flex items-center space-x-2">
        <span>🧾</span>
        <span>Anteprima Fattura</span>
      </h3>
      <p className="text-purple-700 text-sm mt-1">Controlla tutti i dettagli prima della creazione</p>
    </div>
    
    <div className="p-8 space-y-8">
      {/* Client Info */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Informazioni Cliente</h4>
          {searchResults.length > 0 && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Cliente Esistente
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Ragione Sociale</p>
            <p className="font-semibold text-gray-900">{clientData.ragioneSociale}</p>
          </div>
          {clientData.partitaIVA && (
            <div>
              <p className="text-sm text-gray-500 mb-1">P.IVA</p>
              <p className="font-mono text-gray-900">{clientData.partitaIVA}</p>
            </div>
          )}
          {clientData.indirizzo && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 mb-1">Indirizzo</p>
              <p className="text-gray-900">{clientData.indirizzo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Data Fattura</p>
            <p className="text-lg font-semibold text-gray-900">{transactionData.date}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Data Scadenza</p>
            <p className="text-lg font-semibold text-gray-900">{transactionData.date}</p>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Servizi</h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Descrizione</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Qta</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Prezzo</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactionData.services.map((service, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-gray-900">{service.description}</td>
                    <td className="px-6 py-4 text-center text-gray-700">{service.quantity}</td>
                    <td className="px-6 py-4 text-right text-gray-700">€{service.unitPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      €{(service.quantity * service.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotale:</span>
              <span>€{transactionData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>IVA (0%):</span>
              <span>€0.00</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-300 pt-2">
              <span>Totale:</span>
              <span>€{transactionData.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-2">Informazioni Aggiuntive</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Codice ATECO:</span>
              <span className="ml-2 font-medium text-blue-900">62.20.10</span>
            </div>
            <div>
              <span className="text-blue-700">Regime IVA:</span>
              <span className="ml-2 font-medium text-blue-900">Esenzione 0%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);