exports.handler = async function(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    var JSONBIN_KEY  = process.env.JSONBIN_KEY;
    var JSONBIN_BIN  = process.env.JSONBIN_BIN;
    var RIFTY_TOKEN = process.env.FONNTE_TOKEN;
    var RIFTY_NUMBER = process.env.RIFTY_NUMBER;          // Nomor Rifty (penerima/chatbot)

    var body = JSON.parse(event.body || '{}');
    var sessionId = body.sessionId;
    var userName  = body.userName || 'Pengunjung';
    var userId    = body.userId   || '';
    var message   = body.message;

    if (!message || !sessionId) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'wajib diisi' }) };
    }

    var msgObj = {
      id:        Date.now(),
      sessionId: sessionId,
      userId:    userId,
      userName:  userName,
      message:   message,
      from:      'visitor',
      timestamp: new Date().toISOString(),
      read:      false
    };

    // Simpan ke JSONBin
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
    chatData.chats.push(msgObj);
    if (chatData.chats.length > 500) chatData.chats = chatData.chats.slice(-500);

    await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
      body:    JSON.stringify(chatData)
    });

    // Kirim pesan ke Rifty (chatbot) via Fonnte dari nomor websml
    // Format: [SESSION_ID] pesan — agar webhook tahu session mana yang harus dibalas
    var waMsg = '[' + sessionId + '] ' + message;

    await fetch('https://api.fonnte.com/send', {
      method:  'POST',
      headers: {
        'Authorization': RIFTY_TOKEN,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        target:      RIFTY_NUMBER,
        message:     waMsg,
        countryCode: '62'
      })
    });

    return {
      statusCode: 200,
      headers:    headers,
      body:       JSON.stringify({ ok: true, msgId: msgObj.id })
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers:    headers,
      body:       JSON.stringify({ error: err.message })
    };
  }
};
