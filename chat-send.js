// netlify/functions/chat-send.js
// Terima pesan dari web → simpan ke JSONBin → kirim ke WA admin via Fonnte

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;       // set di Netlify env
const JSONBIN_KEY  = process.env.JSONBIN_KEY;         // set di Netlify env
const JSONBIN_BIN  = process.env.JSONBIN_BIN;         // set di Netlify env
const ADMIN_WA     = process.env.ADMIN_WA || '6285371526068';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { sessionId, userName, userId, message } = body;

    if (!message || !sessionId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'sessionId dan message wajib diisi' }) };
    }

    const timestamp = new Date().toISOString();
    const msgObj = {
      id: Date.now(),
      sessionId,
      userId: userId || 'guest',
      userName: userName || 'Pengunjung',
      message,
      from: 'visitor',
      timestamp,
      read: false
    };

    // 1. Ambil data chat lama dari JSONBin
    let chatData = { chats: [] };
    try {
      const getRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_KEY }
      });
      if (getRes.ok) {
        const json = await getRes.json();
        chatData = json.record || { chats: [] };
      }
    } catch (e) { /* bin kosong, mulai baru */ }

    // 2. Tambah pesan baru
    if (!chatData.chats) chatData.chats = [];
    chatData.chats.push(msgObj);
    // Batasi 500 pesan terakhir
    if (chatData.chats.length > 500) chatData.chats = chatData.chats.slice(-500);

    // 3. Simpan ke JSONBin
    await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY
      },
      body: JSON.stringify(chatData)
    });

    // 4. Kirim notifikasi ke WA admin via Fonnte
    const waMsg = `💬 *Pesan dari Website SML*\n👤 ${userName || 'Pengunjung'}${userId ? ' ('+userId+')' : ''}\n🔑 Session: ${sessionId}\n─────────────────\n${message}\n\n_Balas pesan ini untuk menjawab pengunjung_`;

    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: ADMIN_WA,
        message: waMsg,
        countryCode: '62'
      })
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, msgId: msgObj.id, timestamp })
    };

  } catch (err) {
    console.error('chat-send error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
