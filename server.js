const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const YOUTUBE_VIDEO_ID = process.env.YOUTUBE_VIDEO_ID || '';
const CHANNEL_ID = '-1001002299339420';

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

async function isUserInChannel(userId) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${userId}`
    );
    const data = await res.json();
    if (!data.ok) return false;
    const status = data.result.status;
    return ['member', 'administrator', 'creator'].includes(status);
  } catch (e) {
    return false;
  }
}

app.post('/api/verify', async (req, res) => {
  const { initData } = req.body;
  const user = verifyTelegramInitData(initData);

  if (!user) {
    return res.status(401).json({ error: 'Identità Telegram non verificata' });
  }

  const inChannel = await isUserInChannel(user.id);
  if (!inChannel) {
    return res.status(403).json({ error: 'Non sei iscritto al canale' });
  }

  return res.json({ ok: true, youtubeVideoId: YOUTUBE_VIDEO_ID });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
