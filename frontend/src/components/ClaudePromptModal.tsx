import React, { useState } from 'react';
import { copyToClipboard } from '../services/claudeIntegration';

interface ClaudePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
}

export const ClaudePromptModal: React.FC<ClaudePromptModalProps> = ({
  isOpen,
  onClose,
  prompt
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(prompt);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">🤖 Prompt per Claude</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            💡 <strong>Copia il prompt</strong> → Incollalo in Claude → <strong>Copia la risposta JSON</strong> → Incollala nell'app
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt generato:
          </label>
          <textarea
            value={prompt}
            readOnly
            className="w-full h-48 p-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm resize-none"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
              copied
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <span>{copied ? '✅' : '📋'}</span>
            <span>{copied ? 'Copiato!' : 'Copia negli Appunti'}</span>
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};