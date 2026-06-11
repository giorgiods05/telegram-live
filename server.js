const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');
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

let cachedHlsUrl = null;
let cacheTime = 0;

function getHlsUrl() {
  const now = Date.now();
  if (cachedHlsUrl && (now - cacheTime) < 3600000) {
    return cachedHlsUrl;
  }
  try {
    const url = execSync(
      `/opt/render/project/src/yt-dlp -f "best[ext=mp4]/best" --get-url "https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}"`,
      { timeout: 30000 }
    ).toString().trim();
    cachedHlsUrl = url;
    cacheTime = now;
    return url;
  } catch (e) {
    return null;
  }
}

app.post('/api/verify', (req, res) => {
  const { initData } = req.body;
  if (!initData || !verifyTelegramInitData(initData)) {
    return res.status(401).json({ error: 'Accesso negato' });
  }
  const hlsUrl = getHlsUrl();
  if (!hlsUrl) {
    return res.status(500).json({ error: 'Stream non disponibile' });
  }
  return res.json({ ok: true, streamUrl: hlsUrl });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
