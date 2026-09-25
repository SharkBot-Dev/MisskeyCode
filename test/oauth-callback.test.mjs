import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { app } from '../dist/server.js';
import { loginSession } from '../dist/cache/session.js';

test('OAuth callback uses discovery and exchanges each session only once', async () => {
  const requests = [];
  let release;
  let received;
  const arrived = new Promise(resolve => { received = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const provider = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const params = new URLSearchParams(body);
    requests.push({ url: req.url, params });
    if (params.get('code') === 'valid-code') {
      received();
      await gate;
    }
    res.setHeader('Content-Type', 'application/json');
    // Misskey stores new URL(client_id).href at authorization time, then
    // compares the token request's client_id as an exact string.
    if (params.get('code') === 'expired-code' || params.get('client_id') !== 'https://client.example/') {
      res.writeHead(403).end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid authorization code' }));
    } else {
      res.end(JSON.stringify({ access_token: 'test-token', token_type: 'Bearer' }));
    }
  });
  const server = app.listen(0, '127.0.0.1');
  provider.listen(0, '127.0.0.1');
  await Promise.all([once(server, 'listening'), once(provider, 'listening')]);
  const base = `http://127.0.0.1:${server.address().port}/misskey/callback`;
  function seed(state) {
    loginSession.set(state, {
      state, host: 'unused.invalid', clientId: 'https://client.example',
      redirectUri: 'https://client.example/misskey/callback', codeVerifier: 'test-verifier',
      tokenEndpoint: `http://127.0.0.1:${provider.address().port}/custom/token?tenant=test`,
    });
  }
  try {
    seed('success');
    const first = fetch(`${base}?state=success&code=valid-code`);
    await arrived;
    assert.equal((await fetch(`${base}?state=success&code=valid-code`)).status, 400);
    release();
    assert.equal((await first).status, 200);
    assert.equal((await fetch(`${base}?state=success&code=valid-code`)).status, 400);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/custom/token?tenant=test');
    for (const [key, value] of Object.entries({
      grant_type: 'authorization_code', code: 'valid-code', client_id: 'https://client.example/',
      redirect_uri: 'https://client.example/misskey/callback', code_verifier: 'test-verifier',
    })) assert.equal(requests[0].params.get(key), value);

    seed('expired');
    const expired = await fetch(`${base}?state=expired&code=expired-code`);
    assert.equal(expired.status, 400);
    assert.match(await expired.text(), /認証をやり直してください/);
    assert.equal(loginSession.has('expired'), false);

    seed('denied');
    assert.equal((await fetch(`${base}?state=denied&error=access_denied`)).status, 400);
    assert.equal(loginSession.has('denied'), false);
    seed('missing-code');
    assert.equal((await fetch(`${base}?state=missing-code`)).status, 400);
    assert.equal((await fetch(`${base}?state=x&state=y&code=a`)).status, 400);
    assert.equal(requests.length, 2);
  } finally {
    release();
    loginSession.clear();
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => provider.close(resolve))]);
  }
});
