import type { ClientData } from '../types/client';

export const generateClaudePrompt = (inputText: string): string => {
  return `COPIA QUESTO PROMPT E INCOLLALO IN CLAUDE:

"Analizza questo testo e estrai i dati aziendali:

${inputText}

Rispondi SOLO con JSON valido:
{
  "ragioneSociale": "nome dell'azienda",
  "partitaIVA": "solo numeri della partita IVA",
  "indirizzo": "indirizzo completo",
  "cap": "codice postale",
  "comune": "nome comune",
  "provincia": "sigla provincia",
  "codiceDestinatario": "codice SDI",
  "pec": "email pec",
  "email": "email normale",
  "telefono": "numero telefono",
  "referente": "nome referente"
}

Se un campo non è presente, usa stringa vuota. SOLO JSON."

DOPO AVER RICEVUTO LA RISPOSTA DA CLAUDE, COPIA IL JSON E INCOLLALO QUI SOTTO:`;
};

export const validateClaudeResponse = (response: string): ClientData | null => {
  try {
    const cleanResponse = response.trim();
    const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    const requiredFields: (keyof ClientData)[] = [
      'ragioneSociale', 'partitaIVA', 'indirizzo', 'cap', 'comune',
      'provincia', 'codiceDestinatario', 'pec', 'email', 'telefono', 'referente'
    ];
    
    const validatedData: ClientData = {} as ClientData;
    
    for (const field of requiredFields) {
      validatedData[field] = parsed[field] || '';
    }
    
    return validatedData;
  } catch (error) {
    console.error('Error validating Claude response:', error);
    return null;
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};