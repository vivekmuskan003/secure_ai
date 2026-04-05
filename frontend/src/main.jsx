/**
 * main.jsx — React entry point
 *
 * Wraps app with:
 *  - AuthProvider (our local JWT auth)
 *  - Auth0Provider (optional, for Google OAuth)
 *  - BrowserRouter
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'placeholder.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'placeholder',
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    scope: 'openid profile email',
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider {...auth0Config}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </Auth0Provider>
  </React.StrictMode>
);
