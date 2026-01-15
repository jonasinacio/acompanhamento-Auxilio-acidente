
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("LegalDash: Iniciando montagem do sistema...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("LegalDash Error: Elemento #root não encontrado no HTML.");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("LegalDash: Sistema montado com sucesso.");
} catch (error) {
  console.error("LegalDash Critical Error:", error);
}
