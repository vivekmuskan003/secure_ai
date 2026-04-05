/**
 * orchestrator/orchestrator.js — Multi-Agent Orchestrator
 *
 * This is the brain of the system. It:
 *  1. Receives the user's natural language message
 *  2. Uses the LLM to classify intent (which agent(s) to call)
 *  3. Dispatches to one or more agents in parallel
 *  4. Aggregates the results into a coherent response
 *  5. Writes a log entry for each action
 *
 * This version uses the local userId and the new tokenService-powered agents.
 */

const { callLLM } = require('../services/llmService');
const emailAgent = require('../agents/emailAgent');
const codingAgent = require('../agents/codingAgent');
const schedulingAgent = require('../agents/schedulingAgent');
const Log = require('../models/Log');

// ── Intent classification prompt ─────────────────────────────────────────────

const CLASSIFICATION_PROMPT = `You are an intent classifier for a multi-agent AI assistant.
Given a user message, output a JSON object with:
- "intents": array of detected intents from ["email", "github", "calendar", "general"]
- "action": the primary action (e.g. "send_email", "read_emails", "list_repos", "create_issue", "update_file", "get_repo_info", "list_events", "create_event", "chat")
- "params": object with any extracted parameters (e.g. {"to": "...", "subject": "..."})
- "reasoning": brief explanation

Examples:
User: "Send an email to john@example.com saying hello"
Output: {"intents": ["email"], "action": "send_email", "params": {"to": "john@example.com", "subject": "Hello", "body": "Hello"}, "reasoning": "User wants to send email"}

User: "What emails do I have? Also create a GitHub issue for the login bug"
Output: {"intents": ["email", "github"], "action": "multi", "params": {"issue_title": "login bug"}, "reasoning": "Multiple intents detected"}

User: "Update README.md in my repo muskanvivek/stack_hack to say the project is now complete"
Output: {"intents": ["github"], "action": "update_file", "params": {"repo": "muskanvivek/stack_hack", "path": "README.md", "content": "The project is now complete.", "message": "Update README to reflect completion"}, "reasoning": "User wants to update a repository file"}

User: "Schedule a meeting tomorrow at 2pm with alice@example.com"
Output: {"intents": ["calendar"], "action": "create_event", "params": {"summary": "Meeting", "attendees": ["alice@example.com"]}, "reasoning": "Calendar event creation"}

Only output valid JSON. No markup.`;

// ── Response generation prompt ────────────────────────────────────────────────

const RESPONSE_PROMPT = `You are a helpful AI assistant integrated with Gmail, GitHub, and Google Calendar.
You have just executed one or more actions on behalf of the user. 
Given the action results, generate a friendly, concise response to the user.
If there were errors, explain them simply. Be conversational and helpful.`;

/**
 * writeLog — Helper to create an agent log entry
 */
const writeLog = async (userId, agent, action, status, detail, userMessage, durationMs = 0) => {
  try {
    await Log.create({ userId, agent, action, status, detail, userMessage, durationMs });
  } catch (err) {
    console.error('[Orchestrator] Failed to write log:', err.message);
  }
};

/**
 * classifyIntent — Use the LLM to determine which agents to call
 */
const classifyIntent = async (userMessage, chatHistory = []) => {
  const messages = [
    ...chatHistory.slice(-4),
    { role: 'user', content: userMessage },
  ];

  const { text } = await callLLM(messages, CLASSIFICATION_PROMPT);

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.warn('[Orchestrator] Intent parsing failed, defaulting to chat');
    return { intents: ['general'], action: 'chat', params: {}, reasoning: 'Parse failed' };
  }
};

/**
 * handleEmailIntent — Route email actions
 */
const handleEmailIntent = async (userId, action, params) => {
  const start = Date.now();
  try {
    let result;
    if (action === 'send_email') {
      result = await emailAgent.sendEmail(userId, {
        to: params.to || '',
        subject: params.subject || '(No Subject)',
        body: params.body || '',
      });
    } else {
      result = await emailAgent.summarizeInbox(userId);
    }
    await writeLog(userId, 'email', action, 'success', `Action: ${action}`, '', Date.now() - start);
    return { agent: 'email', action, result };
  } catch (err) {
    await writeLog(userId, 'email', action, 'error', err.message, '', Date.now() - start);
    return { agent: 'email', action, error: err.message };
  }
};

/**
 * handleGithubIntent — Route GitHub actions
 */
const handleGithubIntent = async (userId, action, params) => {
  const start = Date.now();
  try {
    let result;
    if (action === 'create_issue') {
      const [owner, repo] = (params.repo || '/').split('/');
      result = await codingAgent.createIssue(userId, {
        owner: params.owner || owner || '',
        repo: params.repo_name || repo || '',
        title: params.issue_title || 'New Issue',
        body: params.issue_body || '',
      });
    } else if (action === 'update_file') {
      const [owner, repo] = (params.repo || '/').split('/');
      result = await codingAgent.updateFile(userId, {
        owner: params.owner || owner || '',
        repo: params.repo_name || repo || '',
        path: params.path || 'README.md',
        content: params.content || params.update_text || params.body || '',
        message: params.commit_message || params.message || `Update ${params.path || 'README.md'}`,
      });
    } else if (action === 'get_repo_info') {
      const [owner, repo] = (params.repo || '/').split('/');
      result = await codingAgent.getRepoInfo(userId, params.owner || owner || '', params.repo_name || repo || '');
    } else if (action === 'list_repos' || action === 'list_repositories') {
      result = await codingAgent.listRepositories(userId);
    } else {
      throw new Error(`Unsupported GitHub action: ${action}`);
    }
    await writeLog(userId, 'coding', action, 'success', `Action: ${action}`, '', Date.now() - start);
    return { agent: 'github', action, result };
  } catch (err) {
    await writeLog(userId, 'coding', action, 'error', err.message, '', Date.now() - start);
    return { agent: 'github', action, error: err.message };
  }
};

/**
 * handleCalendarIntent — Route calendar actions
 */
const handleCalendarIntent = async (userId, action, params) => {
  const start = Date.now();
  try {
    let result;
    if (action === 'create_event') {
      const startTime = params.start_time
        ? new Date(params.start_time).toISOString()
        : new Date(Date.now() + 3600000).toISOString();
      const endTime = params.end_time
        ? new Date(params.end_time).toISOString()
        : new Date(Date.now() + 7200000).toISOString();

      result = await schedulingAgent.createEvent(userId, {
        summary: params.summary || 'Meeting',
        description: params.description || '',
        startDateTime: startTime,
        endDateTime: endTime,
        attendees: params.attendees || [],
        location: params.location || '',
      });
    } else {
      result = await schedulingAgent.listEvents(userId);
    }
    await writeLog(userId, 'scheduling', action, 'success', `Action: ${action}`, '', Date.now() - start);
    return { agent: 'calendar', action, result };
  } catch (err) {
    await writeLog(userId, 'scheduling', action, 'error', err.message, '', Date.now() - start);
    return { agent: 'calendar', action, error: err.message };
  }
};

/**
 * orchestrate — Main entry point
 * 
 * NOTE: auth0Id parameter renamed to userId for clarity as it's now a MongoDB ID
 */
const orchestrate = async (userId, userMessage, chatHistory = []) => {
  const start = Date.now();
  console.log(`[Orchestrator] Processing for user ${userId}: "${userMessage}"`);

  // Initial log
  await writeLog(userId, 'orchestrator', 'receive_message', 'pending', userMessage, userMessage);

  const classification = await classifyIntent(userMessage, chatHistory);
  const { intents, action, params } = classification;

  const agentPromises = [];
  if (intents.includes('email')) {
    agentPromises.push(handleEmailIntent(userId, action, params));
  }
  if (intents.includes('github')) {
    agentPromises.push(handleGithubIntent(userId, action, params));
  }
  if (intents.includes('calendar')) {
    agentPromises.push(handleCalendarIntent(userId, action, params));
  }

  let agentResults = [];
  if (agentPromises.length > 0) {
    agentResults = await Promise.all(agentPromises);
  }

  // Generate result context for LLM
  const resultContext = agentResults.length > 0
    ? `Action results: ${JSON.stringify(agentResults, null, 2)}`
    : 'No specific services were called. Just have a conversation.';

  const responseMessages = [
    ...chatHistory.slice(-6),
    { role: 'user', content: userMessage },
    { role: 'system', content: `Context: ${resultContext}` },
  ];

  const { text: response, provider } = await callLLM(responseMessages, RESPONSE_PROMPT);

  await writeLog(userId, 'orchestrator', 'complete', 'success', `Agents: ${agentResults.length}`, userMessage, Date.now() - start);

  return { response, agentResults, provider };
};

module.exports = { orchestrate };
