const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const YOUTUBE_VIDEO_ID = process.env.YOUTUBE_VIDEO_ID || '';
const CHANNEL_IDS = ['-1003980379795', '-1002299339420', '-1002652550014'];

let requestCount = 0;

function verifyTelegramInitData(initData) {
  if (!initData || initData.trim() === '') return null;
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computedHash !== hash) return null;
    const userParam = urlParams.get('user');
    if (!userParam) return null;
    return JSON.parse(userParam);
  } catch (e) {
    return null;
  }
}

async function isUserInAnyChannel(userId) {
  for (const channelId of CHANNEL_IDS) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${channelId}&user_id=${userId}`
      );
      const data = await res.json();
      if (data.ok && ['member', 'administrator', 'creator'].includes(data.result.status)) {
        return true;
      }
      if (!data.ok) {
        console.log(`[TELEGRAM API ERROR] canale ${channelId}, user ${userId}:`, JSON.stringify(data));
      }
    } catch (e) {
      console.log(`[FETCH ERROR] canale ${channelId}, user ${userId}:`, e.message);
    }
  }
  return false;
}

app.post('/api/verify', async (req, res) => {
  const reqId = ++requestCount;
  const startTime = Date.now();
  const { initData } = req.body;
  const user = verifyTelegramInitData(initData);

  if (!user) {
    console.log(`[#${reqId}] initData non valido o vuoto`);
    return res.status(401).json({ error: 'Identità Telegram non verificata' });
  }

  console.log(`[#${reqId}] richiesta da user ${user.id} (${user.first_name || ''})`);

  const inChannel = await isUserInAnyChannel(user.id);
  const elapsed = Date.now() - startTime;

  if (!inChannel) {
    console.log(`[#${reqId}] user ${user.id} NON iscritto (${elapsed}ms)`);
    return res.status(403).json({ error: 'Non sei iscritto al canale' });
  }

  console.log(`[#${reqId}] user ${user.id} OK, invio video (${elapsed}ms)`);
  return res.json({ ok: true, youtubeVideoId: YOUTUBE_VIDEO_ID });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
