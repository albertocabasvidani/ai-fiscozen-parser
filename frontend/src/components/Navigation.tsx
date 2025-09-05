import React from 'react';

interface NavigationProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

const steps = [
  { id: 1, name: 'Estrazione Dati (Opzionale)', shortName: 'Estrazione', icon: '📋' },
  { id: 2, name: 'Ricerca Cliente', shortName: 'Ricerca', icon: '🔍' },
  { id: 3, name: 'Creazione Cliente', shortName: 'Cliente', icon: '✨' },
  { id: 4, name: 'Creazione Fattura', shortName: 'Fattura', icon: '🧾' }
];

export const Navigation: React.FC<NavigationProps> = ({ currentStep, onStepClick }) => {
  return (
    <nav className="bg-white shadow-lg rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-semibold text-green-600">Modalità Locale</span>
        </div>
        
        <div className="flex flex-wrap gap-2 md:space-x-4 md:flex-nowrap">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => onStepClick(step.id)}
              className={`flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm ${
                currentStep === step.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : currentStep > step.id
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              disabled={(step.id === 3 && currentStep < 2) || (step.id === 4 && currentStep < 3)}
            >
              <span className="text-lg">{step.icon}</span>
              <span className="font-medium hidden md:inline">{step.name}</span>
              <span className="font-medium md:hidden">{step.shortName}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};