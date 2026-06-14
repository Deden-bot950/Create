exports.handler = async function(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  try {
    var JSONBIN_KEY = process.env.JSONBIN_KEY;
    var JSONBIN_BIN = process.env.JSONBIN_BIN;
    var ADMIN_WA = process.env.ADMIN_WA || '6285371526068';

    var body = {};
    var ct = event.headers['content-type'] || '';
    if (ct.indexOf('application/json') > -1) {
      body = JSON.parse(event.body || '{}');
    } else {
      var params = new URLSearchParams(event.body || '');
      params.forEach(function(v, k) { body[k] = v; });
    }

    var senderWA = body.sender || body.from || '';
    var message = body.message || body.text || '';
    var senderClean = senderWA.replace(/[^0-9]/g, '');
    var adminClean = ADMIN_WA.replace(/[^0-9]/g, '');

    if (senderClean.indexOf(adminClean) === -1 && adminClean.indexOf(senderClean) === -1) {
      return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true, skipped: 'bukan admin' }) };
    }

    if (!message.trim()) {
      return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true, skipped: 'kosong' }) };
    }

    var targetSession = null;
    var replyMsg = message;
    var sessionMatch = message.match(/^\[([A-Z0-9\-]+)\]\s*([\s\S]+)/);
    if (sessionMatch) {
      targetSession = sessionMatch[1];
      replyMsg = sessionMatch[2];
    }

    var chatData = { chats: [] };
    try {
      var getRes = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
        headers: { 'X-Master-Key': JSONBIN_KEY }
      });
      if (getRes.ok) {
        var json = await getRes.json();
        chatData = json.record || { chats: [] };
      }
    } catch(e) {}

    if (!chatData.chats) chatData.chats = [];

    if (!targetSession) {
      var visitorMsgs = chatData.chats.filter(function(c) { return c.from === 'visitor'; });
      if (visitorMsgs.length > 0) {
        targetSession = visitorMsgs[visitorMsgs.length - 1].sessionId;
      }
    }

    if (!targetSession) {
      return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true, skipped: 'tidak ada session' }) };
    }

    var replyObj = {
      id: Date.now(),
      sessionId: targetSession,
      userId: 'admin',
      userName: 'Admin SML',
      message: replyMsg,
      from: 'admin',
      timestamp: new Date().toISOString(),
      read: false
    };

    chatData.chats.push(replyObj);
    if (chatData.chats.length > 500) chatData.chats = chatData.chats.slice(-500);

    await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
      body: JSON.stringify(chatData)
    });

    return { statusCode: 200, headers: headers, body: JSON.stringify({ ok: true, session: targetSession }) };

  } catch(err) {
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: err.message }) };
  }
};
