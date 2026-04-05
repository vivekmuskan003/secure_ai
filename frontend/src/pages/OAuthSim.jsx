import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PROVIDERS = {
  gmail: {
    name: 'Google',
    logo: 'https://www.gstatic.com/images/branding/product/1x/gmail_48dp.png',
    color: '#ea4335',
    scopes: ['Read your emails', 'Send emails on your behalf'],
  },
  google_calendar: {
    name: 'Google',
    logo: 'https://www.gstatic.com/images/branding/product/1x/calendar_48dp.png',
    color: '#4285f4',
    scopes: ['View your events', 'Create and edit events'],
  },
  github: {
    name: 'GitHub',
    logo: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
    color: '#24292e',
    scopes: ['Access to all public and private repositories', 'Create issues and pull requests'],
  },
};

export default function OAuthSim() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const serviceId = searchParams.get('service');
  const provider = PROVIDERS[serviceId] || PROVIDERS.github;

  useEffect(() => {
    // Simulate initial redirect/loading time to make it feel real
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleAuthorize = () => {
    setLoading(true);
    setTimeout(() => {
      // Redirect back with success flag
      navigate(`/services?oauth_success=${serviceId}`, { replace: true });
    }, 1200);
  };

  const handleCancel = () => {
    navigate('/services', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Redirecting to {provider.name}...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ fontFamily: 'sans-serif' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 flex flex-col items-center border-b border-slate-100">
          <img src={provider.logo} alt={provider.name} className="w-16 h-16 object-contain mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 text-center">
            Sign in with {provider.name}
          </h1>
          <p className="text-sm text-slate-500 mt-2 text-center">
            to continue to <strong className="text-slate-800">Secure AI Platform</strong>
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-sm rounded font-semibold text-slate-700 bg-slate-100 inline-block px-3 py-1 mb-4">
              Secure AI Platform wants to access your {provider.name} Account ✨
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              This will allow Secure AI Platform to:
            </p>
            <ul className="space-y-3">
              {provider.scopes.map((scope, idx) => (
                <li key={idx} className="flex items-start text-sm text-slate-700">
                  <svg className="w-5 h-5 text-green-500 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {scope}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 mb-6 flex gap-2 border border-amber-200/50">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Make sure you trust Secure AI Platform. You can revoke this access at any time in your {provider.name} settings.
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleAuthorize}
              style={{ backgroundColor: provider.color }}
              className="flex-1 py-2.5 rounded-lg text-white font-medium hover:opacity-90 transition-colors shadow-sm"
            >
              Authorize
            </button>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            OAuth Verification • Private & Secure Connection
          </p>
        </div>
      </div>
    </div>
  );
}
