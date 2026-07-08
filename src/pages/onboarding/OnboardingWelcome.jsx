import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingWelcome() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-slate-50">
      <div className="max-w-md space-y-8">
        {/* Logo / Elemento Visual */}
        <div className="w-16 h-16 mx-auto bg-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          V
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Bem-vindo ao Vereda
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            O jeito mais simples e humano de organizar suas leituras, absorver o conhecimento e transformar seus livros em hábitos reais.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => navigate('/onboarding/books')}
            className="w-full py-3 px-6 text-white font-medium bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition duration-150 shadow-sm"
          >
            Começar jornada
          </button>
        </div>
      </div>
    </div>
  );
}