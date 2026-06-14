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

  try {
    const { sessionId, since } = event.queryStringParameters || {};

    if (!sessionId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'sessionId wajib' }) };
    }

    const getRes = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });

    if (!getRes.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ messages: [] }) };
    }

    const json = await getRes.json();
    const chatData = json.record || { chats: [] };
    const allChats = chatData.chats || [];

    let messages = allChats.filter(function(c){ return c.sessionId === sessionId; });
    if (since) {
      const sinceTs = parseInt(since);
      messages = messages.filter(function(c){ return c.id > sinceTs; });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ messages: messages, total: messages.length })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message, messages: [] })
    };
  }
};
