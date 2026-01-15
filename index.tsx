
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("LegalDash: Renderização iniciada.");
  } catch (error) {
    console.error("LegalDash Error:", error);
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h2 style="color: #e11d48;">Erro ao Iniciar Dashboard</h2>
        <p style="color: #64748b;">Houve um problema ao carregar os módulos do sistema.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #001529; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Tentar Novamente
        </button>
      </div>
    `;
  }
}
