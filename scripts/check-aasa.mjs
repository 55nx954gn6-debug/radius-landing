#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const APP_ID = '9JURGANQYQ.com.jcornaggia.radius';
const RESET_PATH = '/onboarding/reset-password';
const AASA_PATH = '.well-known/apple-app-site-association';
const LIVE_URL = `https://radius-app.org/${AASA_PATH}`;

function validateAasa(document) {
  const details = document?.applinks?.details;
  if (!Array.isArray(details)) throw new Error('AASA applinks.details must be an array');
  const entry = details.find((item) => item?.appIDs?.includes(APP_ID));
  if (!entry) throw new Error(`AASA is missing app ID ${APP_ID}`);
  const resetComponent = entry.components?.find((component) => component?.['/'] === RESET_PATH);
  if (!resetComponent) throw new Error(`AASA is missing exact reset path ${RESET_PATH}`);
}

async function checkLocal() {
  const [wellKnown, root] = await Promise.all([
    readFile(AASA_PATH, 'utf8'),
    readFile('apple-app-site-association', 'utf8'),
  ]);
  if (wellKnown !== root) throw new Error('Root and .well-known AASA files differ');
  validateAasa(JSON.parse(wellKnown));
  await readFile('.nojekyll');
  await readFile('onboarding/reset-password/index.html');
  console.log('PASS: local AASA and reset fallback artifacts are valid');
}

async function checkLive() {
  const response = await fetch(LIVE_URL, { redirect: 'manual' });
  if (response.status !== 200) throw new Error(`${LIVE_URL} returned HTTP ${response.status}`);
  if (response.headers.has('location')) throw new Error(`${LIVE_URL} redirects unexpectedly`);
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`${LIVE_URL} must use application/json, received ${contentType || '(missing)'}`);
  }
  validateAasa(await response.json());

  const reset = await fetch(`https://radius-app.org${RESET_PATH}`, { redirect: 'follow' });
  const finalResetUrl = new URL(reset.url);
  const allowedResetPaths = new Set([RESET_PATH, `${RESET_PATH}/`]);
  if (reset.status !== 200
      || finalResetUrl.origin !== 'https://radius-app.org'
      || !allowedResetPaths.has(finalResetUrl.pathname)) {
    throw new Error(`Live reset fallback must resolve on the canonical host; received ${reset.status} ${reset.url}`);
  }
  console.log('PASS: live AASA and reset fallback endpoints are deployable');
}

await checkLocal();
if (process.argv.includes('--live')) await checkLive();
