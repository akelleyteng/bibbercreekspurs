#!/usr/bin/env node
/**
 * One-time script to get an OAuth2 refresh token for Google Drive uploads.
 *
 * Prerequisites:
 *   1. An OAuth2 client in Google Cloud Console (APIs & Services → Credentials)
 *   2. GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env
 *      (or GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET — same OAuth app works for both)
 *   3. For "Web application" type clients: add http://localhost:3333/callback
 *      as an Authorized redirect URI in the console
 *      For "Desktop app" type clients: localhost redirects work automatically
 *
 * Usage:
 *   node scripts/get-drive-token.js
 */

require('dotenv').config();
const http = require('http');
const { URL } = require('url');

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_PORT = 3333;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: No OAuth2 credentials found.');
  console.error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in your .env file,');
  console.error('or GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (same OAuth app works for both).');
  process.exit(1);
}

const SCOPES = 'https://www.googleapis.com/auth/drive';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&access_type=offline` +
  `&prompt=consent`;

// Start a temporary server to receive the OAuth callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h2>Authorization failed</h2><p>${error}</p>`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h2>Missing authorization code</h2>');
    return;
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('Token exchange failed:', tokens.error, tokens.error_description);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<h2>Token exchange failed</h2><p>${tokens.error_description}</p>`);
      server.close();
      process.exit(1);
    }

    console.log('\n=== SUCCESS ===');
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('\nAdd this to your .env file:');
    console.log(`GOOGLE_DRIVE_OWNER_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nStore in Secret Manager for production:');
    console.log(`echo -n '${tokens.refresh_token}' | gcloud secrets versions add google-drive-refresh-token --data-file=-`);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h2>Success!</h2><p>Refresh token has been printed in the terminal. You can close this window.</p>');
  } catch (err) {
    console.error('Token exchange error:', err);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('<h2>Error exchanging code for tokens</h2>');
  }

  server.close();
});

server.listen(REDIRECT_PORT, () => {
  console.log('\n=== Google Drive OAuth2 Token Generator ===\n');
  console.log(`Using OAuth Client ID: ${CLIENT_ID.substring(0, 20)}...`);
  console.log(`\nOpen this URL in your browser and sign in as bibbercreekspurs4h@gmail.com:\n`);
  console.log(authUrl);
  console.log(`\nWaiting for authorization...`);
});
