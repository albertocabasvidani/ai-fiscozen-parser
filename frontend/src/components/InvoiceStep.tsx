import { useState, useEffect } from 'react';
import type { ClientData, InvoiceData, InvoiceLineItem } from '../types/client';

interface InvoiceStepProps {
  clientData: ClientData;
  onInvoiceCreated: (success: boolean, invoiceId?: string) => void;
}

export const InvoiceStep: React.FC<InvoiceStepProps> = ({ clientData, onInvoiceCreated }) => {
  console.log('InvoiceStep rendered with clientData:', clientData);
  const today = new Date().toISOString().split('T')[0];
  const [invoiceData, setInvoiceData] = useState<Partial<InvoiceData>>({
    client: clientData,
    date: today,
    dueDate: today, // Stessa data per fattura e pagamento
    lineItems: [],
    subtotal: 0,
    vatAmount: 0,
    total: 0,
    paymentMethod: undefined, // Non specificare metodo pagamento
    paymentTerms: undefined,
    atecoCode: '62.20.10' // Codice ATECO per consulenza informatica
  });

  const [newLineItem, setNewLineItem] = useState<Partial<InvoiceLineItem>>({
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 0 // Niente IVA
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ created: boolean; invoiceId?: string } | null>(null);

  const calculateLineTotal = (quantity: number, unitPrice: number) => {
    // No VAT calculation - total equals subtotal
    return quantity * unitPrice;
  };

  const addLineItem = () => {
    if (!newLineItem.description || !newLineItem.quantity || !newLineItem.unitPrice) {
      setError('Compila tutti i campi obbligatori per la voce');
      return;
    }

    const lineItem: InvoiceLineItem = {
      id: Date.now().toString(),
      description: newLineItem.description,
      quantity: newLineItem.quantity || 1,
      unitPrice: newLineItem.unitPrice || 0,
      vatRate: 0, // Always 0% VAT
      total: calculateLineTotal(
        newLineItem.quantity || 1, 
        newLineItem.unitPrice || 0
      )
    };

    setInvoiceData(prev => ({
      ...prev,
      lineItems: [...(prev.lineItems || []), lineItem]
    }));

    setNewLineItem({
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 0 // Niente IVA
    });
    setError('');
  };

  const removeLineItem = (id: string) => {
    setInvoiceData(prev => ({
      ...prev,
      lineItems: (prev.lineItems || []).filter(item => item.id !== id)
    }));
  };

  const updateInvoiceField = (field: keyof InvoiceData, value: any) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
  };

  // Recalculate totals when line items change (no VAT)
  useEffect(() => {
    const lineItems = invoiceData.lineItems || [];
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const vatAmount = 0; // No VAT
    const total = subtotal; // Total = subtotal since no VAT

    setInvoiceData(prev => ({
      ...prev,
      subtotal,
      vatAmount,
      total
    }));
  }, [invoiceData.lineItems]);

  const handleCreateInvoice = async () => {
    if (!invoiceData.lineItems?.length) {
      setError('Aggiungi almeno una voce alla fattura');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/fiscozen/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess({ created: true, invoiceId: result.id });
        onInvoiceCreated(true, result.id);
      } else {
        setError(result.error || 'Errore durante la creazione della fattura');
        onInvoiceCreated(false);
      }
    } catch (error) {
      setError('Errore di connessione');
      onInvoiceCreated(false);
    } finally {
      setIsCreating(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Fattura Creata!</h2>
          <p className="text-gray-600 mb-4">
            La fattura è stata creata con successo per <strong>{clientData.ragioneSociale}</strong>
          </p>
          {success.invoiceId && (
            <p className="text-sm text-gray-500">ID Fattura: {success.invoiceId}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <span className="text-xl">🧾</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Step 4: Creazione Fattura</h2>
          <p className="text-gray-600">Crea una nuova fattura per {clientData.ragioneSociale}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Client Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Cliente:</h3>
          <div className="text-sm text-gray-600">
            <p><strong>{clientData.ragioneSociale}</strong></p>
            {clientData.partitaIVA && <p>P.IVA: {clientData.partitaIVA}</p>}
            {clientData.indirizzo && <p>{clientData.indirizzo}</p>}
            {clientData.cap && clientData.comune && (
              <p>{clientData.cap} {clientData.comune} ({clientData.provincia})</p>
            )}
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fattura:
            </label>
            <input
              type="date"
              value={invoiceData.date}
              onChange={(e) => updateInvoiceField('date', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Scadenza:
            </label>
            <input
              type="date"
              value={invoiceData.dueDate}
              onChange={(e) => updateInvoiceField('dueDate', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Voci di Fattura:</h3>
          
          {/* Add new line item */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-3">Aggiungi Voce:</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  value={newLineItem.description}
                  onChange={(e) => setNewLineItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrizione servizio/prodotto"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={newLineItem.quantity}
                  onChange={(e) => setNewLineItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  placeholder="Qta"
                  min="1"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={newLineItem.unitPrice}
                  onChange={(e) => setNewLineItem(prev => ({ ...prev, unitPrice: Number(e.target.value) }))}
                  placeholder="Prezzo €"
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value="0% IVA"
                  disabled
                  className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
                <button
                  onClick={addLineItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Display line items */}
          {invoiceData.lineItems && invoiceData.lineItems.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Descrizione</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Qta</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Prezzo</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">IVA (0%)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Totale</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceData.lineItems.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">{item.description}</td>
                      <td className="px-4 py-2 text-sm text-center">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right">€{item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-center">0%</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">€{item.total.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals */}
        {invoiceData.lineItems && invoiceData.lineItems.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center text-sm mb-1">
              <span>Subtotale:</span>
              <span>€{invoiceData.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-1">
              <span>IVA:</span>
              <span>€{invoiceData.vatAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
              <span>Totale:</span>
              <span>€{invoiceData.total?.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ATECO Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Codice ATECO:
          </label>
          <input
            type="text"
            value={invoiceData.atecoCode || '62.20.10'}
            onChange={(e) => updateInvoiceField('atecoCode', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-50"
            placeholder="62.20.10 - Consulenza informatica"
          />
          <p className="text-xs text-gray-500 mt-1">62.20.10 = Consulenza nel settore delle tecnologie dell'informatica</p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note (opzionale):
          </label>
          <textarea
            value={invoiceData.notes || ''}
            onChange={(e) => updateInvoiceField('notes', e.target.value)}
            placeholder="Note aggiuntive per la fattura..."
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateInvoice}
          disabled={isCreating || !invoiceData.lineItems?.length}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <span>{isCreating ? '⏳' : '🧾'}</span>
          <span>{isCreating ? 'Creando Fattura...' : 'Crea Fattura'}</span>
        </button>
      </div>
    </div>
  );
};