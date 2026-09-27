import '@mantine/core/styles.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { App } from './App';
import { resolver, theme } from './theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} cssVariablesResolver={resolver} defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
