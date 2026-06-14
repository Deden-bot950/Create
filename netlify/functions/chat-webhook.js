const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const JSONBIN_KEY  = process.env.JSONBIN_KEY;
const JSONBIN_BIN  = process.env.JSONBIN_BIN;
const ADMIN_WA     = process.env.ADMIN_WA || '6285371526068';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let body = {};
    const ct = event.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      body = JSON.parse(event.body || '{}');
    } else {
      const params = new URLSearchParams(event.body || '');
      params.forEach(function(v, k){ body[k] = v; });
    }

    const senderWA = body.sender || body.from || '';
    const message  = body.message || body.text || '';
    const senderClean = senderWA.replace(/[^0-9]/g, '');
    const adminClean  = ADMIN_WA.replace(/[^0-9]/g, '');

    if (!senderClean.includes(adminClean) && !adminClean.includes(senderClean)) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: 'bukan admin' }) };
    }

    if (!message.trim()) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: 'pesan kosong' }) };
    }

    let targetSession = null;
    let replyMsg = message;
    const sessionMatch = message.match(/^\[([A-Z0-9\-]+)\]\s*([\s\S]+)/);
    if (sessionMatch) {
      targetSession = sessionMatch[1];
      replyMsg = sessionMatch[2];
    }

    let chatData = { chats: [] };
    try {
      const getRes = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
        headers: { 'X-Master-Key': JSONBIN_KEY }
      });
      if (getRes.ok) {
        const json = await getRes.json();
        chatData = json.record || { chats: [] };
      }
    } catch (e) {}

    if (!chatData.chats) chatData.chats = [];

    if (!targetSession) {
      const visitorMsgs = chatData.chats.filter(function(c){ return c.from === 'visitor'; });
      if (visitorMsgs.length > 0) {
        targetSession = visitorMsgs[visitorMsgs.length - 1].sessionId;
      }
    }

    if (!targetSession) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, skipped: 'tidak ada session' }) };
    }

    const replyObj = {
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

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, session: targetSession }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
