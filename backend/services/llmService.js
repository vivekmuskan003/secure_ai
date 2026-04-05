/**
 * services/llmService.js — LLM abstraction layer
 *
 * Primary:  Groq API (llama-3.1-70b-versatile — fast, free tier available)
 * Fallback: Google Gemini (gemini-1.5-flash)
 *
 * Flow:
 *  1. Try Groq
 *  2. If Groq fails (network error, quota, etc.) → automatically try Gemini
 *  3. If both fail → throw a clear error
 *
 * Usage:
 *   const { callLLM } = require('./llmService');
 *   const result = await callLLM(messages, systemPrompt);
 */

const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Lazy client singletons ────────────────────────────────────────────────────
// Clients are created on FIRST use, not at module load time.
// This avoids SDK startup assertions when env vars aren't set yet.

let _groq = null;
let _geminiModel = null;

const getGroq = () => {
  if (!_groq) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not set in .env');
    }
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
};

const getGeminiModel = () => {
  if (!_geminiModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in .env');
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return _geminiModel;
};

/**
 * callGroq — Send messages to Groq and return the text response
 *
 * @param {Array} messages - Array of { role, content } objects
 * @param {string} systemPrompt - System-level instruction for the LLM
 * @returns {Promise<string>} The LLM's text response
 */
const callGroq = async (messages, systemPrompt) => {
  console.log('[LLM] Trying Groq...');

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: chatMessages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  return completion.choices[0]?.message?.content || '';
};

/**
 * callGemini — Send messages to Gemini and return the text response
 *
 * @param {Array} messages - Array of { role, content } objects
 * @param {string} systemPrompt - System-level instruction for the LLM
 * @returns {Promise<string>} The LLM's text response
 */
const callGemini = async (messages, systemPrompt) => {
  console.log('[LLM] Trying Gemini fallback...');

  // Gemini uses a different format — combine system prompt + conversation
  const formattedHistory = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = getGeminiModel().startChat({
    history: formattedHistory,
    systemInstruction: { parts: [{ text: systemPrompt }] },
  });

  const result = await chat.sendMessage(lastMessage.content);
  return result.response.text();
};

/**
 * callLLM — Main LLM interface with automatic Groq → Gemini fallback
 *
 * @param {Array} messages - Chat history as { role, content } objects
 * @param {string} [systemPrompt='You are a helpful AI assistant.'] - System prompt
 * @returns {Promise<{ text: string, provider: string }>} Response + which provider was used
 */
const callLLM = async (messages, systemPrompt = 'You are a helpful AI assistant.') => {
  // Try Groq first
  try {
    const text = await callGroq(messages, systemPrompt);
    console.log('[LLM] Groq succeeded ✅');
    return { text, provider: 'groq' };
  } catch (groqError) {
    console.warn('[LLM] Groq failed:', groqError.message);
  }

  // Fallback to Gemini
  try {
    const text = await callGemini(messages, systemPrompt);
    console.log('[LLM] Gemini fallback succeeded ✅');
    return { text, provider: 'gemini' };
  } catch (geminiError) {
    console.error('[LLM] Gemini also failed:', geminiError.message);
    throw new Error('All LLM providers failed. Please check your API keys.');
  }
};

module.exports = { callLLM };
