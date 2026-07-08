import React from 'react';
import { useNavigate } from 'react-router-dom';

// Array simulando a estrutura que você já deve ter em 'books'
const FEB_BOOKS = [
  { id: 1, title: 'Livro F1', category: 'Fundação', cover_color: 'bg-blue-600', desc: 'Conceitos base indispensáveis para construir sua mentalidade.' },
  { id: 2, title: 'Livro F2', category: 'Fundação', cover_color: 'bg-blue-500', desc: 'Aprofundando os pilares técnicos e ferramentas essenciais.' },
  { id: 3, title: 'Livro E1', category: 'Expansão', cover_color: 'bg-amber-600', desc: 'Ampliando horizontes e conectando ideias com outras áreas.' },
  { id: 4, title: 'Livro E2', category: 'Expansão', cover_color: 'bg-amber-500', desc: 'Estratégias avançadas para aplicar o conhecimento no mundo real.' },
  { id: 5, title: 'Livro B1', category: 'Biografia', cover_color: 'bg-purple-600', desc: 'Histórias reais e lições práticas de quem já trilhou a vereda.' },
];

export default function OnboardingBooks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-6 bg-slate-50 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            A Metodologia FEB
          </span>
          <h2 className="text-2xl font-bold text-slate-950">
            Sua trilha de 5 passos
          </h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Uma sequência pensada para você construir conhecimento sólido, sem pular etapas estruturais.
          </p>
        </div>

        {/* Linha do tempo / Sequência de Livros */}
        <div className="relative border-l border-slate-200 ml-4 md:ml-6 space-y-8 pointer-events-none">
          {FEB_BOOKS.map((book) => (
            <div key={book.id} className="relative pl-8 sm:pl-10">
              {/* Indicador visual / Mini capa */}
              <div className={`absolute -left-4 top-1 w-8 h-10 ${book.cover_color} rounded shadow-sm flex items-center justify-center text-[10px] font-bold text-white uppercase`}>
                {book.category[0]}
              </div>
              
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {book.category}
                </span>
                <h3 className="font-semibold text-slate-900">{book.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{book.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto w-full pt-8">
        <button
          onClick={() => navigate('/onboarding/choice')}
          className="w-full py-3 px-6 text-white font-medium bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition duration-150 shadow-sm"
        >
          Entendi, quero escolher meu ritmo
        </button>
      </div>
    </div>
  );
}