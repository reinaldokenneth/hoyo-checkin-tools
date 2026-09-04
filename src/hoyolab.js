import { GAMES } from './games.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Header set copied from a real browser check-in request. HoYoLAB rejects
 * requests that look obviously scripted, so the sec-* and sec-ch-ua headers
 * are deliberately kept even though they carry no information for us.
 */
function buildHeaders(game, cookie) {
  return {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json;charset=UTF-8',
    cookie,
    origin: 'https://act.hoyolab.com',
    referer: `${game.referer}?act_id=${game.actId}`,
    'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': USER_AGENT,
    'x-rpc-app_version': '2.34.1',
    'x-rpc-client_type': '4',
    'x-rpc-signgame': game.signGame,
  };
}

/**
 * fetch + JSON parse with a couple of retries, since HoYoLAB's edge
 * intermittently drops connections and a scheduled run gets no second chance.
 */
async function requestJson(url, options, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
      const text = await res.text();

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${res.status}, non-JSON body: ${text.slice(0, 200)}`);
      }
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 2000);
    }
  }

  throw lastError;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads check-in status without claiming anything — what a dry run uses.
 * Returns the same shape as checkIn() so callers can treat the two alike.
 * @returns {Promise<{status: 'already'|'error', message: string}>}
 */
export async function inspect(gameCode, cookie, lang) {
  const game = GAMES[gameCode];
  const url = new URL(game.infoUrl);
  url.searchParams.set('act_id', game.actId);
  url.searchParams.set('lang', lang);

  let json;
  try {
    json = await requestJson(url, { method: 'GET', headers: buildHeaders(game, cookie) });
  } catch (error) {
    return { status: 'error', message: `Request failed: ${error.message}` };
  }

  if (json?.retcode !== 0) {
    return { status: 'error', message: interpret(json).message };
  }

  // Always 'already': a dry run claims nothing, whatever the reported state.
  const state = json.data.is_sign ? 'Already checked in' : 'Not checked in yet';
  return { status: 'already', message: `${state} — streak: ${json.data.total_sign_day} day(s)` };
}

/**
 * Claims one day of rewards.
 * @returns {Promise<{status: 'ok'|'already'|'error', message: string}>}
 */
export async function checkIn(gameCode, cookie, lang) {
  const game = GAMES[gameCode];
  const url = new URL(game.signUrl);
  url.searchParams.set('act_id', game.actId);
  url.searchParams.set('lang', lang);

  let json;
  try {
    json = await requestJson(url, {
      method: 'POST',
      headers: buildHeaders(game, cookie),
      body: JSON.stringify({ act_id: game.actId, lang }),
    });
  } catch (error) {
    return { status: 'error', message: `Request failed: ${error.message}` };
  }

  return interpret(json);
}

/**
 * Maps a check-in response onto a result. HoYoLAB reports failure in the
 * `retcode` body field, not the HTTP status, and signals a captcha challenge
 * inside `data` while still returning retcode 0.
 */
function interpret(json) {
  const retcode = String(json?.retcode);

  const risk = json?.data?.gt_result ?? json?.data;
  if (retcode === '0' && (risk?.is_risk === true || risk?.risk_code === 5001)) {
    return {
      status: 'error',
      message: 'Captcha challenge triggered — check in manually once to clear it',
    };
  }

  switch (retcode) {
    case '0':
      return { status: 'ok', message: 'Checked in' };
    case '-5003':
      return { status: 'already', message: 'Already checked in today' };
    case '-100':
    case '10001':
      return { status: 'error', message: 'Cookie is invalid or expired — refresh it' };
    case '-10002':
      return { status: 'error', message: 'No account for this game (never played it?)' };
    default:
      return {
        status: 'error',
        message: `Unexpected retcode ${retcode}: ${json?.message ?? 'no message'}`,
      };
  }
}

export { sleep };
