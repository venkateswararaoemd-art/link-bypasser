const express = require('express');
const path = require('path');
const { bypass } = require('./bypass');

const app = express();
app.use(express.json());

// When packaged with pkg, __dirname is a virtual snapshot path; serve from real disk instead
const isPackaged = typeof process.pkg !== 'undefined';
const publicDir = isPackaged
  ? path.join(path.dirname(process.execPath), 'public')
  : path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SSE endpoint — streams live logs + final result to the browser
app.get('/api/bypass', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url param required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    const result = await bypass(url, (msg) => send('log', msg));
    send('result', result);
  } catch (err) {
    send('error', err.message || String(err));
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Link Bypasser → http://localhost:${PORT}`));
