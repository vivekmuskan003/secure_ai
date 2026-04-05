const Chat = require('../models/Chat');
const User = require('../models/User');
const { orchestrate } = require('../orchestrator/orchestrator');

const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { message, chatId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found. Please log in again.' });

    let chat;
    if (chatId) chat = await Chat.findById(chatId);
    if (!chat) {
      chat = new Chat({ userId: user._id, auth0Id: user.auth0Id || userId, messages: [], title: message.slice(0, 50) });
    }

    chat.messages.push({ role: 'user', content: message.trim() });

    const chatHistory = chat.messages
      .filter((m) => m.role !== 'system')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const { response, agentResults, provider } = await orchestrate(
      userId,
      message.trim(),
      chatHistory.slice(0, -1)
    );

    chat.messages.push({
      role: 'assistant',
      content: response,
      agents: agentResults.filter((r) => !r.error).map((r) => r.agent),
    });
    await chat.save();

    res.json({ success: true, chatId: chat._id, response, agentResults, provider });
  } catch (err) { next(err); }
};

const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { chatId, limit = 50 } = req.query;

    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (!chat || chat.userId.toString() !== userId) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      return res.json({ chat });
    }

    const chats = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .select('_id title updatedAt messages');

    res.json({ chats });
  } catch (err) { next(err); }
};

module.exports = { sendMessage, getChatHistory };

