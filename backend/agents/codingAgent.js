/**
 * agents/codingAgent.js — GitHub Coding Agent
 *
 * Capabilities:
 *  - List user's GitHub repositories
 *  - Get repo details
 *  - Create a GitHub issue
 *
 * This agent uses the local tokenService for authentication.
 */

const { Octokit } = require('@octokit/rest');
const { getAccessToken } = require('../services/tokenService');

/**
 * listRepositories — Get the user's GitHub repositories
 *
 * @param {string} userId - User's MongoDB ID
 * @param {number} [count=10] - Max number of repos to return
 * @returns {Promise<Array>} Array of simplified repo objects
 */
const listRepositories = async (userId, count = 10) => {
  const token = await getAccessToken(userId, 'github');
  const octokit = new Octokit({ auth: token });

  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: count,
  });

  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    language: repo.language,
    stars: repo.stargazers_count,
    url: repo.html_url,
    updatedAt: repo.updated_at,
  }));
};

/**
 * createIssue — Create a new issue in a GitHub repository
 *
 * @param {string} userId - User's MongoDB ID
 * @param {Object} issueData - { owner, repo, title, body, labels }
 * @returns {Promise<Object>} Created issue details
 */
const createIssue = async (userId, { owner, repo, title, body = '', labels = [] }) => {
  const token = await getAccessToken(userId, 'github');
  const octokit = new Octokit({ auth: token });

  const { data } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels,
  });

  return {
    success: true,
    issueNumber: data.number,
    title: data.title,
    url: data.html_url,
  };
};

const updateFile = async (userId, { owner, repo, path, content, message = 'Update file via AI assistant' }) => {
  if (!owner || !repo || !path || !content) {
    throw new Error('Missing GitHub update parameters. Ensure owner, repo, path, and content are provided.');
  }

  const token = await getAccessToken(userId, 'github');
  const octokit = new Octokit({ auth: token });
  const encodedContent = Buffer.from(content, 'utf8').toString('base64');

  let sha;
  try {
    const existing = await octokit.repos.getContent({ owner, repo, path });
    sha = existing.data.sha;
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }

  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: encodedContent,
    sha,
  });

  return {
    success: true,
    path: data.content.path,
    url: data.content.html_url,
    sha: data.content.sha,
  };
};

/**
 * getRepoInfo — Get details about a specific repository
 *
 * @param {string} userId - User's MongoDB ID
 * @param {string} owner - GitHub username or org
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Repository details
 */
const getRepoInfo = async (userId, owner, repo) => {
  const token = await getAccessToken(userId, 'github');
  const octokit = new Octokit({ auth: token });

  const { data } = await octokit.repos.get({ owner, repo });

  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language,
    topics: data.topics,
    url: data.html_url,
    openIssues: data.open_issues_count,
  };
};

module.exports = { listRepositories, createIssue, updateFile, getRepoInfo };
