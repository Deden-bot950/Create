exports.handler = async function(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  var JSONBIN_KEY = process.env.JSONBIN_KEY;
  var JSONBIN_BIN = process.env.JSONBIN_BIN;

  if (event.httpMethod === 'GET') {
    try {
      var getRes = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
        headers: { 'X-Master-Key': JSONBIN_KEY }
      });
      var json = await getRes.json();
      var chatData = json.record || { chats: [] };
      var chats = chatData.chats || [];

      var sessions = {};
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

      var sessionList = Object.values(sessions).sort(function(a, b) {
        return new Date(b.lastTime) - new Date(a.lastTime);
      });

      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({ sessions: sessionList, totalChats: chats.length })
      };
    } catch(err) {
      return { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message, sessions: [] }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      var body = JSON.parse(event.body || '{}');
      var sessionId = body.sessionId;
      var message = body.message;

      if (!sessionId || !message) {
        return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'sessionId dan message wajib' }) };
      }

      var getRes2 = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
        headers: { 'X-Master-Key': JSONBIN_KEY }
      });
      var json2 = await getRes2.json();
      var chatData2 = json2.record || { chats: [] };
      if (!chatData2.chats) chatData2.chats = [];

      var replyObj = {
        id: Date.now(),
        sessionId: sessionId,
        userId: 'admin',
        userName: 'Admin SML',
        message: message,
        from: 'admin',
        timestamp: new Date().toISOString(),
        read: true
      };

      chatData2.chats.push(replyObj);
      if (chatData2.chats.length > 500) chatData2.chats = chatData2.chats.slice(-500);

      await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify(chatData2)
      });

      return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true, msgId: replyObj.id }) };
    } catch(err) {
      return { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
