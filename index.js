#!/usr/bin/env node

import crypto from 'crypto';

// Constants
const APP_VERSION = '2.81.1';
const APP_ID = 'bll8iq97cem8';
const SALT = 'QVu5OdwEWxkq9ygpYBgDprR5tI471HWQ'; // AppSaltK2

const ADDR_TAKUMI = 'https://api-takumi.mihoyo.com';
const ADDR_ACT_NAP = 'https://act-nap-api.mihoyo.com';
const ADDR_BBS = 'https://bbs-api.miyoushe.com';

const GAME_ALIASES = {
  'zzz': 'nap',
  'gi': 'hk4e',
  'hsr': 'hkrpg',
  'hi3': 'bh3',
  'tot': 'nxx',
  'bh2': 'bh2'
};

const GAME_NAME_TO_ID = {
  'bh3': '1',
  'hk4e': '2',
  'bh2': '3',
  'nxx': '4',
  'hkrpg': '6',
  'nap': '8'
};

const GAME_BIZ_SUFFIX = '_cn';

// Environment Variables
const cookies = process.env.COOKIE ? process.env.COOKIE.split('\n').map(s => s.trim()).filter(Boolean) : [];
const gamesEnv = process.env.GAMES ? process.env.GAMES.split(' ').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
const discordWebhook = process.env.DISCORD_WEBHOOK;
const discordUser = process.env.DISCORD_USER;

const messages = [];
let hasErrors = false;

// Helper Functions
function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

function getDS() {
  const t = Math.floor(Date.now() / 1000);
  const r = Math.random().toString(36).substring(2, 8);
  const s = `salt=${SALT}&t=${t}&r=${r}`;
  const c = md5(s);
  return `${t},${r},${c}`;
}

function getHeaders(cookie) {
  return {
    'User-Agent': `Mozilla/5.0 (Linux; Android 13; 22011211C Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/104.0.5112.97 Mobile Safari/537.36 miHoYoBBS/${APP_VERSION}`,
    'Referer': 'https://app.mihoyo.com',
    'x-rpc-app_version': APP_VERSION,
    'x-rpc-app_id': APP_ID,
    'x-rpc-verify_key': APP_ID,
    'DS': getDS(),
    'Cookie': cookie
  };
}

function log(type, ...data) {
  console[type](...data);
  if (type === 'error') hasErrors = true;

  const string = data.map(value => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value;
  }).join(' ');

  messages.push({ type, string });
}

async function request(url, options) {
  try {
    const res = await fetch(url, options);
    const json = await res.json();
    return json;
  } catch (e) {
    log('error', `Request failed: ${e.message}`);
    return null;
  }
}

// API Functions
async function getHome(gameId, headers) {
  const url = `${ADDR_BBS}/apihub/api/home/new?gids=${gameId}`;
  const data = await request(url, { method: 'GET', headers });
  if (!data || data.retcode !== 0) {
    log('error', `GetHome failed: ${data ? data.message : 'Unknown error'}`);
    return null;
  }
  return data.data;
}

async function getSignActId(gameId, headers) {
  const home = await getHome(gameId, headers);
  if (!home) return null;

  const navigator = home.navigator || [];
  for (const nav of navigator) {
    if (nav.name && nav.name.includes('签到')) {
      const match = nav.app_path.match(/act_id=([^&]+)/);
      if (match) return match[1];
    }
  }
  return null;
}

async function getUserGameRoles(gameBiz, headers) {
  // Try getUserGameRolesByStoken
  if (headers.Cookie.includes('stoken=')) {
    const url = `${ADDR_TAKUMI}/binding/api/getUserGameRolesByStoken?game_biz=${gameBiz}`;
    const data = await request(url, { method: 'GET', headers });
    if (data && data.retcode === 0) return data.data.list;
    log('debug', `getUserGameRolesByStoken failed: ${data ? data.message : 'Unknown error'}`);
  }

  // Try getUserGameRolesByCookie
  if (headers.Cookie.includes('cookie_token=')) {
    const url = `${ADDR_TAKUMI}/binding/api/getUserGameRolesByCookie?game_biz=${gameBiz}`;
    const data = await request(url, { method: 'GET', headers });
    if (data && data.retcode === 0) return data.data.list;
    log('debug', `getUserGameRolesByCookie failed: ${data ? data.message : 'Unknown error'}`);
  }

  // Try getUserGameRolesByLtoken
  if (headers.Cookie.includes('ltoken=')) {
    const url = `${ADDR_TAKUMI}/binding/api/getUserGameRolesByLtoken?game_biz=${gameBiz}`;
    const data = await request(url, { method: 'GET', headers });
    if (data && data.retcode === 0) return data.data.list;
    log('debug', `getUserGameRolesByLtoken failed: ${data ? data.message : 'Unknown error'}`);
  }

  log('error', `All getUserGameRoles methods failed for ${gameBiz}`);
  return null;
}

async function signGame(gameName, actId, region, uid, headers) {
  const isZZZ = gameName === 'nap';
  const baseUrl = isZZZ ? ADDR_ACT_NAP : ADDR_TAKUMI;
  const signHeader = isZZZ ? 'zzz' : gameName;

  const url = `${baseUrl}/event/luna/sign`;
  const body = {
    lang: 'zh-cn',
    act_id: actId,
    region: region,
    uid: uid
  };

  const reqHeaders = {
    ...headers,
    'x-rpc-signgame': signHeader,
    'Content-Type': 'application/json'
  };

  const data = await request(url, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(body)
  });

  return data;
}

const ACT_ID_FALLBACKS = {
  'hk4e': 'e202311201442471',
  'hkrpg': 'e202304121516551',
  'bh3': 'e202306201626331',
  'nxx': 'e202202251749321',
  'bh2': 'e202203291431091',
  'nap': 'e202406242138391'
};

// Main Logic
async function run(cookie, games) {
  const headers = getHeaders(cookie);

  for (let gameAlias of games) {
    const gameName = GAME_ALIASES[gameAlias] || gameAlias;
    const gameId = GAME_NAME_TO_ID[gameName];

    if (!gameId) {
      log('error', `Unknown game: ${gameAlias}`);
      continue;
    }

    log('info', `\n----- CHECKING IN FOR ${gameAlias.toUpperCase()} (${gameName}) -----`);

    // 1. Get Act ID
    let actId = await getSignActId(gameId, headers);
    if (!actId) {
      actId = ACT_ID_FALLBACKS[gameName];
      if (actId) {
        log('info', `Using fallback act_id for ${gameName}: ${actId}`);
      } else {
        log('error', `Could not find act_id for ${gameName}`);
        continue;
      }
    }

    // 2. Get User Roles
    const gameBiz = gameName + GAME_BIZ_SUFFIX;
    const roles = await getUserGameRoles(gameBiz, headers);

    if (!roles || roles.length === 0) {
      log('error', `No roles found for ${gameName}`);
      continue;
    }

    // 3. Sign in for each role
    for (const role of roles) {
      log('info', `Signing in...`);

      const res = await signGame(gameName, actId, role.region, role.game_uid, headers);

      if (res) {
        if (res.retcode === 0) {
          log('info', `Success! Checked in`);
        } else if (res.retcode === -5003) {
          log('info', `Already checked in`);
        } else {
          log('error', `Failed to check in: ${res.message} (${res.retcode})`);
          if (res.data && res.data.is_risk) {
            log('error', `Account is at risk (Geetest required).`);
          }
        }
      }
    }
  }
}

async function discordWebhookSend() {
  if (!discordWebhook || !discordWebhook.startsWith('https://discord.com/api/webhooks/')) return;

  let content = '';
  if (discordUser) {
    content += `<@${discordUser}>\n`;
  }

  const msgBody = messages.map(m => `[${m.type.toUpperCase()}] ${m.string}`).join('\n');
  content += msgBody;

  if (content.length > 2000) {
    content = content.substring(0, 1990) + '...';
  }

  try {
    await fetch(discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    console.log('Sent Discord webhook notification.');
  } catch (e) {
    console.error('Failed to send Discord webhook:', e);
  }
}

(async () => {
  if (!cookies.length) {
    console.error('COOKIE environment variable not set!');
    process.exit(1);
  }

  if (!gamesEnv.length) {
    console.error('GAMES environment variable not set!');
    process.exit(1);
  }

  for (let i = 0; i < cookies.length; i++) {
    log('info', `\n=== ACCOUNT ${i + 1} ===`);
    await run(cookies[i], gamesEnv);
  }

  if (discordWebhook) {
    await discordWebhookSend();
  }

  if (hasErrors) {
    process.exit(1);
  }
})();
