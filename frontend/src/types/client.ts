export interface ClientData {
  ragioneSociale: string;
  partitaIVA: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  codiceDestinatario: string;
  pec: string;
  email: string;
  telefono: string;
  referente: string;
}

export interface SearchResult {
  id: string;
  ragioneSociale: string;
  partitaIVA: string;
  exists: boolean;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface InvoiceData {
  clientId?: string;
  client: ClientData;
  invoiceNumber?: string;
  date: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  notes?: string;
  paymentMethod?: 'bank_transfer' | 'credit_card' | 'cash' | 'check';
  paymentTerms?: string;
  atecoCode?: string;
}

export interface TransactionData {
  amount: number;
  services: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  date: string;
  description: string;
  originalText: string;
}

export interface WorkflowState {
  stage: 'input' | 'review' | 'clientEdit' | 'clientSearch' | 'preview' | 'complete';
  transactionData: TransactionData | null;
  clientData: ClientData | null;
  searchResults: SearchResult[];
  selectedClient: SearchResult | null;
  isProcessing: boolean;
  error: string;
}

export interface SessionData {
  id: string;
  timestamp: Date;
  clientData: ClientData;
  searchResults?: SearchResult[];
  invoiceData?: InvoiceData;
  status: 'extracted' | 'searched' | 'created' | 'invoiced' | 'error';
}