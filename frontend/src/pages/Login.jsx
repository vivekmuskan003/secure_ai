/**
 * pages/Login.jsx — Complete custom auth user interface
 *
 * Implements:
 *  - Initial Options (Email, Phone, Google via Auth0)
 *  - Email & Password Login / Signup multi-step
 *  - Phone & OTP Login
 *  - Forgot Password Flow
 */

import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  loginWithEmail, registerWithEmail, verifyEmail,
  sendPhoneOTP, verifyPhoneOTP, forgotPassword, resetPassword, resendOTP
} from '../services/api';

const InputField = ({ label, type = 'text', value, onChange, placeholder, required = true, minLength }) => (
  <div className="mb-4 text-left">
    <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-dark-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
      required={required}
      minLength={minLength}
    />
  </div>
);

const OTPInput = ({ value, onChange, label = "Enter 6-digit Code" }) => (
  <div className="mb-6 text-left">
     <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
     <input
      type="text"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} // only numbers
      placeholder="••••••"
      className="w-full bg-dark-800/80 border border-teal-500/30 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-teal-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono"
      required
    />
  </div>
);


export default function Login() {
  const { loginWithRedirect, user: auth0User, getAccessTokenSilently, isAuthenticated: isAuth0Authenticated, isLoading: isAuth0Loading } = useAuth0();
  const { login: setLocalToken, isAuthenticated: isLocalAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (isLocalAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isLocalAuthenticated, navigate, location]);

  // UI Flow State
  // values: 'initial', 'email_login', 'email_signup', 'email_verify', 'phone_login', 'phone_verify', 'forgot_password', 'reset_password'
  const [view, setView] = useState('initial');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  
  // Handlers
  const handleBack = () => {
    setError(null);
    setSuccessMsg(null);
    setOtp('');
    if (view === 'email_verify' || view === 'forgot_password') setView('email_login');
    else if (view === 'reset_password') setView('forgot_password');
    else if (view === 'phone_verify') setView('phone_login');
    else setView('initial');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      const res = await registerWithEmail({ name, email, phone, password });
      setSuccessMsg(res.message);
      setView('email_verify');
    } catch (err) {
      if (err.response?.data?.message?.includes('not verified')) {
         setView('email_verify');
         setSuccessMsg(err.response.data.message);
      } else {
         setError(err.response?.data?.error || 'Registration failed.');
      }
    } finally { setIsLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      const res = await loginWithEmail(email, password);
      // loginWithEmail returns token and user payload
      setLocalToken(res.token);
      // Navigation happens naturally via the useEffect checking isLocalAuthenticated
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        setView('email_verify');
        setError('Please verify your email to log in.');
      } else {
        setError(err.response?.data?.error || 'Login failed.');
      }
    } finally { setIsLoading(false); }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      const res = await verifyEmail(email, otp);
      setLocalToken(res.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally { setIsLoading(false); }
  };

  const handePhoneSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      const res = await sendPhoneOTP(phone);
      setSuccessMsg(res.message);
      setView('phone_verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally { setIsLoading(false); }
  };

  const handlePhoneVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      const res = await verifyPhoneOTP(phone, otp, name);
      setLocalToken(res.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP.');
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      const res = await forgotPassword(email);
      setSuccessMsg(res.message);
      setView('reset_password');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request reset.');
    } finally { setIsLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(null);
    try {
      const res = await resetPassword(email, otp, password);
      setLocalToken(res.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally { setIsLoading(false); }
  };

  const triggerResend = async (type) => {
    setIsLoading(true); setError(null); setSuccessMsg(null);
    try {
      const identifier = type === 'phone_login' ? phone : email;
      const res = await resendOTP(identifier, type);
      setSuccessMsg(res.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally { setIsLoading(false); }
  };

  // Google OAuth sync fallback - if Auth0 is used
  useEffect(() => {
    if (isAuth0Authenticated && auth0User && !isLocalAuthenticated) {
      const handleAuth0Sync = async () => {
         try {
           setIsLoading(true);
           const token = await getAccessTokenSilently();
           // In original flow, this syncs with MongoDB. 
           // We need to implement syncUser in custom flow or expose the endpoint.
           // Since we kept syncUser in authController, we can use the old sync endpoint:
           const { syncUserToBackend } = require('../services/api');
           const res = await syncUserToBackend(token, {
             auth0Id: auth0User.sub,
             email: auth0User.email,
             name: auth0User.name,
             picture: auth0User.picture,
           });
           setLocalToken(res.token);
         } catch (err) {
           setError('Failed to sync Google login. Please try again.');
         } finally {
           setIsLoading(false);
         }
      };
      handleAuth0Sync();
    }
  }, [isAuth0Authenticated, auth0User, getAccessTokenSilently, setLocalToken, isLocalAuthenticated]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current animate-spin">
              <path d="M12 2v4a6 6 0 0 1 6 6h4a10 10 0 0 0-10-10zm0 20v-4a6 6 0 0 1-6-6H2a10 10 0 0 0 10 10z"/>
            </svg>
          </div>
          <div className="text-slate-400 text-sm font-medium animate-pulse">Authenticating...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 sm:px-6 lg:px-8 py-12">
      
      {/* Brand Header */}
      <div className="text-center mb-8 animate-slide-up max-w-3xl">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.3)]">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current">
            <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
          </svg>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-purple-400">
          Secure AI Platform
        </h1>
        <p className="hero-subtitle text-white text-base sm:text-lg max-w-2xl mx-auto leading-8 font-semibold">
          A modern secure workspace for Gmail, GitHub, and Calendar. Manage your email, code, and schedule with AI-powered automation while keeping your data private and under your control.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="hero-badge">Privacy-first</span>
          <span className="hero-badge">Built for real workflows</span>
          <span className="hero-badge">Secure AI automation</span>
        </div>
      </div>

      {/* Auth Card */}
      <div className="glass-card w-full max-w-md p-8 animate-fade-in relative overflow-hidden">
        
        {/* State Banners */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm text-center animate-fade-in">
            {successMsg}
          </div>
        )}

        {/* --- VIEW: INITIAL ALIGNMENT --- */}
        {view === 'initial' && (
          <div className="space-y-4">
             <h2 className="text-xl font-bold text-white text-center mb-6">Welcome Back</h2>
             
             <button
                onClick={() => loginWithRedirect()}
                className="btn-secondary w-full py-3 flex items-center justify-center gap-3 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">or</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <button
                onClick={() => setView('email_login')}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                Sign in with Email
              </button>

              <button
                onClick={() => setView('phone_login')}
                className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                Sign in with Phone (OTP)
              </button>
              
              <div className="mt-6 text-center text-sm text-slate-400">
                Don't have an account?{' '}
                <button onClick={() => setView('email_signup')} className="text-teal-400 hover:text-teal-300 font-medium">Create one →</button>
              </div>
          </div>
        )}

        {/* --- VIEW: EMAIL LOGIN --- */}
        {view === 'email_login' && (
          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in flex flex-col">
            <button type="button" onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm self-start mb-2"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
            <h2 className="text-xl font-bold text-white mb-2">Sign in to your account</h2>
            <InputField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            
            <div className="mb-4">
               <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">Password</label>
                  <button type="button" onClick={() => setView('forgot_password')} className="text-xs text-teal-400 hover:underline">Forgot password?</button>
               </div>
               <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-dark-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all" required minLength={8} />
            </div>

            <button type="submit" className="btn-primary w-full py-3 mt-4">Sign In</button>
            <div className="text-center text-sm text-slate-400 mt-4">
                No account? <button type="button" onClick={() => setView('email_signup')} className="text-teal-400 hover:underline">Sign up</button>
            </div>
          </form>
        )}

        {/* --- VIEW: EMAIL SIGNUP --- */}
        {view === 'email_signup' && (
          <form onSubmit={handleRegister} className="space-y-4 animate-fade-in flex flex-col">
            <button type="button" onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm self-start mb-2"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
            <h2 className="text-xl font-bold text-white mb-2">Create an account</h2>
            <InputField label="Full Name" value={name} onChange={setName} placeholder="John Doe" />
            <InputField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <InputField label="Phone Number (Optional)" type="tel" value={phone} onChange={setPhone} placeholder="+1 234 567 8900" required={false} />
            <InputField label="Confirm Password" type="password" value={password} onChange={setPassword} placeholder="Min 8 characters" minLength={8} />
            <button type="submit" className="btn-primary w-full py-3 mt-4">Create Account</button>
          </form>
        )}

        {/* --- VIEW: EMAIL OTP VERIFY --- */}
        {view === 'email_verify' && (
          <form onSubmit={handleVerifyEmail} className="space-y-4 animate-fade-in flex flex-col items-center">
            <button type="button" onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm self-start mb-2"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
            <div className="w-16 h-16 bg-teal-500/10 rounded-full flex items-center justify-center mb-2">
               <svg viewBox="0 0 24 24" className="w-8 h-8 text-teal-400 fill-current"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/></svg>
            </div>
            <h2 className="text-xl font-bold text-white text-center">Check your email</h2>
            <p className="text-slate-400 text-sm text-center mb-4">We've sent a 6-digit code to <strong className="text-white">{email}</strong>.</p>
            <OTPInput value={otp} onChange={setOtp} />
            <button type="submit" className="btn-primary w-full py-3">Verify Code</button>
            <button type="button" onClick={() => triggerResend('email_signup')} className="text-xs text-slate-400 hover:text-white mt-4">Didn't receive it? Resend code</button>
          </form>
        )}

        {/* --- VIEW: PHONE LOGIN --- */}
        {view === 'phone_login' && (
          <form onSubmit={handePhoneSubmit} className="space-y-4 animate-fade-in flex flex-col">
            <button type="button" onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm self-start mb-2"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
            <h2 className="text-xl font-bold text-white mb-2">Sign in with Phone</h2>
            <p className="text-sm text-slate-400 mb-4">We will send you a one-time verification code via SMS.</p>
            <InputField label="Phone Number" type="tel" value={phone} onChange={setPhone} placeholder="+1 234 567 8900" />
            <button type="submit" className="btn-primary w-full py-3 mt-4">Send Code</button>
          </form>
        )}

        {/* --- VIEW: PHONE OTP VERIFY --- */}
        {view === 'phone_verify' && (
          <form onSubmit={handlePhoneVerify} className="space-y-4 animate-fade-in flex flex-col items-center">
            <button type="button" onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm self-start mb-2"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
            <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-2">
               <svg viewBox="0 0 24 24" className="w-8 h-8 text-purple-400 fill-current"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
            </div>
            <h2 className="text-xl font-bold text-white text-center">Verify your phone</h2>
            <p className="text-slate-400 text-sm text-center mb-4">Enter the code sent to <strong className="text-white">{phone}</strong>.</p>
            
            {/* If creating a new account via phone, ask for Name too */}
            {!isLocalAuthenticated && (
               <div className="w-full">
                  <InputField label="Your Name (Optional)" value={name} onChange={setName} placeholder="John Doe" required={false} />
               </div>
            )}
            
            <OTPInput value={otp} onChange={setOtp} />
            <button type="submit" className="btn-primary w-full py-3">Verify & Sign In</button>
            <button type="button" onClick={() => triggerResend('phone_login')} className="text-xs text-slate-400 hover:text-white mt-4">Resend SMS</button>
          </form>
        )}

        {/* --- VIEW: FORGOT PASSWORD --- */}
        {view === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 animate-fade-in flex flex-col">
            <button type="button" onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm self-start mb-2"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
            <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
            <p className="text-sm text-slate-400 mb-4">Enter the email associated with your account and we'll send a code to reset your password.</p>
            <InputField label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <button type="submit" className="btn-primary w-full py-3 mt-4">Send Reset Code</button>
          </form>
        )}

        {/* --- VIEW: RESET PASSWORD --- */}
        {view === 'reset_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in flex flex-col">
             <button type="button" onClick={handleBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm self-start mb-2"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>
             <h2 className="text-xl font-bold text-white mb-2">Set New Password</h2>
             <p className="text-sm text-slate-400 mb-4">Check your email for the reset code.</p>
             <OTPInput value={otp} onChange={setOtp} />
             <InputField label="New Password" type="password" value={password} onChange={setPassword} placeholder="Min 8 characters" minLength={8} />
             <button type="submit" className="btn-primary w-full py-3 mt-4">Reset & Sign In</button>
          </form>
        )}

      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-slate-400">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
        </svg>
        Secured by AES-256 Encryption · Your data is never sold
      </div>
    </div>
  );
}
