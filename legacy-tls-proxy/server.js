// Simple Node.js proxy server for legacy TLS endpoints
// Deploy this to a Node.js environment (Vercel, Railway, Render, etc.)

import express from 'express';
import axios from 'axios';
import https from 'https';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Legacy TLS Proxy Server',
    version: '1.0.0'
  });
});

// Proxy endpoint
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  console.log(`Proxying request to: ${targetUrl}`);

  try {
    // Create HTTPS agent with legacy TLS support
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      secureOptions: 0,
      minVersion: 'TLSv1',
    });

    const response = await axios.get(targetUrl, {
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SchoolClosingBot/1.0)',
        'Accept': 'text/xml, application/xml, */*',
      },
      timeout: 30000,
    });

    // Forward the response
    res.set('Content-Type', response.headers['content-type'] || 'text/xml');
    res.send(response.data);

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message,
      code: error.code
    });
  }
});

app.listen(PORT, () => {
  console.log(`Legacy TLS Proxy server running on port ${PORT}`);
});
