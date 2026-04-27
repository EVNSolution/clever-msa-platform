import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './styles.css';

async function startApp() {
  if (import.meta.env.MODE === 'local-sandbox') {
    const { bootstrapLocalSandbox } = await import('./devSandbox/bootstrap');
    await bootstrapLocalSandbox();
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void startApp();
