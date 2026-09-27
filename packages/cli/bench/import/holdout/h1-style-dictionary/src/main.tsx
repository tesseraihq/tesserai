import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { applyStoredTheme } from './theme';

import './styles/generated/tokens.css';
import './styles/generated/tokens.dark.css';
import './styles/global.css';

applyStoredTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
