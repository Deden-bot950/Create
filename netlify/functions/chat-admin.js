const JSONBIN_KEY = process.env.JSONBIN_KEY;
const JSONBIN_BIN = process.env.JSONBIN_BIN;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    try {
      const getRes = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
        headers: { 'X-Master-Key': JSONBIN_KEY }
      });
      const json = await getRes.json();
      const chatData = json.record || { chats: [] };
      const chats = chatData.chats || [];

      const sessions = {};
      chats.forEach(function(c) {
        if (!sessions[c.sessionId]) {
          sessions[c.sessionId] = {
            sessionId: c.sessionId,
            userName: 'Pengunjung',
            userId: '',
            messages: [],
            lastMessage: '',
            lastTime: '',
            unread: 0
          };
        }
        sessions[c.sessionId].messages.push(c);
        sessions[c.sessionId].lastMessage = c.message;
        sessions[c.sessionId].lastTime = c.timestamp;
        if (c.from === 'visitor' && !c.read) sessions[c.sessionId].unread++;
        if (c.from === 'visitor') {
          sessions[c.sessionId].userName = c.userName;
          sessions[c.sessionId].userId = c.userId;
        }
      });

      const sessionList = Object.values(sessions).sort(function(a, b) {
        return new Date(b.lastTime) - new Date(a.lastTime);
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ sessions: sessionList, totalChats: chats.length })
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message, sessions: [] }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const { sessionId, message } = JSON.parse(event.body || '{}');
      if (!sessionId || !message) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'sessionId dan message wajib' }) };
      }

      const getRes = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
        headers: { 'X-Master-Key': JSONBIN_KEY }
      });
      const json = await getRes.json();
      const chatData = json.record || { chats: [] };
      if (!chatData.chats) chatData.chats = [];

      const replyObj = {
        id: Date.now(),
        sessionId: sessionId,
        userId: 'admin',
        userName: 'Admin SML',
        message: message,
        from: 'admin',
        timestamp: new Date().toISOString(),
        read: true
      };
      chatData.chats.push(replyObj);
      if (chatData.chats.length > 500) chatData.chats = chatData.chats.slice(-500);

      await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify(chatData)
      });

      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, msgId: replyObj.id }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
