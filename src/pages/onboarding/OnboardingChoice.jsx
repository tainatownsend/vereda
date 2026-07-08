import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Substitua pelos caminhos reais do seu projeto
import { useStore } from '@/store'; 

const INITIAL_BOOKS = [
  { id: 1, title: 'Livro F1', category: 'Fundação', cover_color: 'bg-blue-600' },
  { id: 2, title: 'Livro F2', category: 'Fundação', cover_color: 'bg-blue-500' },
];

const PACES = [
  { id: 'light', label: 'Tranquilo', details: '15 minutos por dia' },
  { id: 'moderate', label: 'Focado', details: '30 minutes por dia' },
  { id: 'intense', label: 'Imersivo', details: '1 hora por dia' },
];

export default function OnboardingChoice() {
  const navigate = useNavigate();
  
  // Ajuste de acordo com as actions da sua store (Zustand, Redux, Context, etc.)
  const { setChoice, complete } = useStore();

  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedPace, setSelectedPace] = useState(null);

  const handleFinish = () => {
    if (!selectedBook || !selectedPace) return;

    // Salva no estado global
    setChoice({
      bookId: selectedBook,
      pace: selectedPace
    });

    // Finaliza o onboarding e redireciona
    complete();
    navigate('/criar-conta');
  };

  const isFormValid = selectedBook && selectedPace;

  return (
    <div className="min-h-screen py-12 px-6 bg-slate-50 flex flex-col justify-between">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-slate-950">Personalize seu início</h2>
          <p className="text-slate-600 text-sm">Escolha por onde quer começar e o tempo que dedicará.</p>
        </div>

        {/* Seleção do Primeiro Livro */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 block">
            Qual será o seu primeiro passo?
          </label>
          <div className="grid grid-cols-2 gap-3">
            {INITIAL_BOOKS.map((book) => {
              const isSelected = selectedBook === book.id;
              return (
                <button
                  key={book.id}
                  onClick={() => setSelectedBook(book.id)}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition h-32 ${
                    isSelected 
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`w-6 h-8 ${book.cover_color} rounded shadow-sm`} />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {book.category}
                    </span>
                    <span className="font-medium text-slate-900 text-sm">{book.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Seleção de Ritmo */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 block">
            Qual é o ritmo ideal para você?
          </label>
          <div className="space-y-2">
            {PACES.map((pace) => {
              const isSelected = selectedPace === pace.id;
              return (
                <button
                  key={pace.id}
                  onClick={() => setSelectedPace(pace.id)}
                  className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition ${
                    isSelected 
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{pace.label}</p>
                    <p className="text-xs text-slate-500">{pace.details}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto w-full pt-8">
        <button
          onClick={handleFinish}
          disabled={!isFormValid}
          className={`w-full py-3 px-6 text-white font-medium rounded-xl transition duration-150 shadow-sm ${
            isFormValid 
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' 
              : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          Salvar e Criar Conta
        </button>
      </div>
    </div>
  );
}