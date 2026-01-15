
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Erro crítico na renderização:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">Erro ao carregar o dashboard. Por favor, recarregue a página.</div>`;
  }
};

mountApp();
