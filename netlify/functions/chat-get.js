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
    var params = event.queryStringParameters || {};
    var sessionId = params.sessionId;
    var since = params.since;

    if (!sessionId) {
      return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'sessionId wajib' }) };
    }

    var getRes = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });

    if (!getRes.ok) {
      return { statusCode: 200, headers: headers, body: JSON.stringify({ messages: [] }) };
    }

    var json = await getRes.json();
    var chatData = json.record || { chats: [] };
    var allChats = chatData.chats || [];

    var messages = allChats.filter(function(c) {
      return c.sessionId === sessionId;
    });

    if (since) {
      var sinceTs = parseInt(since);
      messages = messages.filter(function(c) {
        return c.id > sinceTs;
      });
    }

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({ messages: messages, total: messages.length })
    };

  } catch(err) {
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: err.message, messages: [] })
    };
  }
};
