import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchGithubRepos } from '../services/api';
import SidebarChat from '../components/SidebarChat';

export default function GithubDashboard() {
  const { getToken } = useAuth();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetchGithubRepos(token);
        setRepos(res.repos);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('GitHub not connected. Please connect from Services page.');
        } else {
          setError(err.message || 'Failed to fetch github data');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [getToken]);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* Main Content (3/4 width) */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-4 animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500/20 to-slate-600/20 flex items-center justify-center border border-slate-500/20 shadow-lg shadow-slate-500/10">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">GitHub Repositories</h1>
              <p className="text-slate-500 text-xs">Live preview of your code and documentation.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="glass-card bg-red-500/5 border-red-500/20 text-red-400 p-8 rounded-2xl text-center">
              <p className="font-medium">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
              {repos.length === 0 ? (
                <div className="col-span-full glass-card p-12 text-center text-slate-500">No repositories found.</div>
              ) : (
                repos.map((repo) => (
                  <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noreferrer"
                    key={repo.id} 
                    className="glass-card p-5 hover:border-slate-500/40 transition-all group flex flex-col h-full bg-white/2 hover:bg-white/4 active:scale-95"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-200 group-hover:text-white truncate flex-1 pr-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        {repo.name}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${repo.private ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-green-500/10 border-green-500/30 text-green-500'}`}>
                        {repo.private ? 'Private' : 'Public'}
                      </span>
                    </div>
                    
                    <p className="text-slate-500 text-xs mb-4 line-clamp-2 flex-1 leading-relaxed">
                      {repo.description || 'No description provided.'}
                    </p>
                    
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-auto pt-4 border-t border-white/5">
                      {repo.language && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 rounded-full bg-slate-500 block h-2"></span>
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 18.26l-7.053 3.948 1.575-7.928L.587 8.792l8.027-.952L12 .5l3.386 7.34 8.027.952-5.935 5.488 1.575 7.928z"/></svg>
                        {repo.stargazers_count}
                      </span>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar Chat (1/4 width) */}
        <div className="lg:w-[380px] flex-shrink-0">
          <div className="sticky top-24">
             <SidebarChat service="github" />
          </div>
        </div>

      </div>
    </div>
  );
}
