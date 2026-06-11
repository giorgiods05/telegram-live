const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static('public'));

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const YOUTUBE_VIDEO_ID = process.env.YOUTUBE_VIDEO_ID || '';

function verifyTelegramInitData(initData) {
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
    return computedHash === hash;
  } catch (e) {
    return false;
  }
}

app.post('/api/verify', (req, res) => {
  const { initData } = req.body;
  if (!initData || !verifyTelegramInitData(initData)) {
    return res.status(401).json({ error: 'Accesso negato' });
  }
  return res.json({ ok: true, youtubeVideoId: YOUTUBE_VIDEO_ID });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
