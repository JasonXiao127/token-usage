import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@fontsource-variable/ibm-plex-sans';
import '@fontsource/ibm-plex-serif/400.css';
import '@fontsource/ibm-plex-serif/500.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
