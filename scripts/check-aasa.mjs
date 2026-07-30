#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const APP_ID = '9JURGANQYQ.com.jcornaggia.radius';
const RESET_PATH = '/onboarding/reset-password';
const AASA_PATH = '.well-known/apple-app-site-association';
const LIVE_URLS = [
  `https://radius-app.org/${AASA_PATH}`,
  'https://radius-app.org/apple-app-site-association',
];
const APPLE_CDN_URL = 'https://app-site-association.cdn-apple.com/a/v1/radius-app.org';

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
  const originBodies = await Promise.all(LIVE_URLS.map(async (url) => {
    const response = await fetch(url, { redirect: 'manual' });
    if (response.status !== 200) throw new Error(`${url} returned HTTP ${response.status}`);
    if (response.headers.has('location')) throw new Error(`${url} redirects unexpectedly`);
    const body = await response.text();
    validateAasa(JSON.parse(body));
    return body;
  }));
  if (originBodies[0] !== originBodies[1]) {
    throw new Error('Live root and .well-known AASA responses differ');
  }

  // GitHub Pages serves extensionless files as application/octet-stream. Apple accepts
  // this origin response and publishes the parsed document as application/json through
  // its associated-domains CDN, which is the representation iOS actually consumes.
  const appleCdn = await fetch(APPLE_CDN_URL, { redirect: 'manual' });
  if (appleCdn.status !== 200) throw new Error(`${APPLE_CDN_URL} returned HTTP ${appleCdn.status}`);
  if (appleCdn.headers.has('location')) throw new Error(`${APPLE_CDN_URL} redirects unexpectedly`);
  const appleContentType = appleCdn.headers.get('content-type')?.toLowerCase() ?? '';
  if (!appleContentType.includes('application/json')) {
    throw new Error(`${APPLE_CDN_URL} must use application/json, received ${appleContentType || '(missing)'}`);
  }
  if (appleCdn.headers.get('apple-origin-format')?.toLowerCase() !== 'json') {
    throw new Error(`${APPLE_CDN_URL} was not parsed by Apple as JSON`);
  }
  validateAasa(await appleCdn.json());

  const reset = await fetch(`https://radius-app.org${RESET_PATH}`, { redirect: 'follow' });
  const finalResetUrl = new URL(reset.url);
  const allowedResetPaths = new Set([RESET_PATH, `${RESET_PATH}/`]);
  if (reset.status !== 200
      || finalResetUrl.origin !== 'https://radius-app.org'
      || !allowedResetPaths.has(finalResetUrl.pathname)) {
    throw new Error(`Live reset fallback must resolve on the canonical host; received ${reset.status} ${reset.url}`);
  }
  console.log('PASS: origin AASA, Apple CDN AASA, and reset fallback are valid');
}

await checkLocal();
if (process.argv.includes('--live')) await checkLive();
