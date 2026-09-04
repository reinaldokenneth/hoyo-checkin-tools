#!/usr/bin/env node
import { GAMES, GAME_CODES } from './games.js';
import { checkIn, fetchInfo, sleep } from './hoyolab.js';
import { notify } from './notify.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || isTruthy(process.env.DRY_RUN);
const gameOverride = args.filter((arg) => !arg.startsWith('--'));

function isTruthy(value) {
  return ['1', 'true', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

function splitLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Builds one entry per account. `HOYOLAB_GAMES` is matched to accounts line by
 * line; when it runs out, the last line is reused, so the common case of many
 * accounts playing the same games needs only a single line.
 */
function loadAccounts() {
  const cookies = splitLines(process.env.HOYOLAB_COOKIE);
  if (cookies.length === 0) {
    throw new Error('HOYOLAB_COOKIE is not set. See README.md for how to obtain it.');
  }

  const gameLines = gameOverride.length > 0
    ? [gameOverride.join(' ')]
    : splitLines(process.env.HOYOLAB_GAMES);
  if (gameLines.length === 0) {
    throw new Error('HOYOLAB_GAMES is not set. Example: "gi hsr zzz"');
  }

  return cookies.map((cookie, index) => {
    const line = gameLines[index] ?? gameLines[gameLines.length - 1];
    const games = line.split(/\s+/).map((code) => code.toLowerCase());

    return { label: `Account ${index + 1}`, cookie, games };
  });
}

function validateCookie(cookie) {
  const missing = ['ltoken_v2', 'ltuid_v2'].filter((key) => !cookie.includes(`${key}=`));
  return missing.length === 0
    ? null
    : `Cookie is missing ${missing.join(' and ')} — it will almost certainly be rejected`;
}

async function main() {
  const lang = process.env.HOYOLAB_LANG?.trim() || 'en-us';
  const accounts = loadAccounts();

  // Scheduled runs all fire at the same minute worldwide. A random offset
  // spreads the load and keeps the traffic from looking like a bot swarm.
  const jitter = Number(process.env.JITTER_SECONDS ?? 0);
  if (jitter > 0 && !dryRun) {
    const delay = Math.floor(Math.random() * jitter);
    console.log(`Waiting ${delay}s before starting...`);
    await sleep(delay * 1000);
  }

  const results = [];

  for (const account of accounts) {
    const cookieWarning = validateCookie(account.cookie);
    if (cookieWarning) console.warn(`[${account.label}] ${cookieWarning}`);

    for (const code of account.games) {
      if (!GAMES[code]) {
        const message = `Unknown game. Valid codes: ${GAME_CODES.join(', ')}`;
        console.error(`[${account.label}] ${code}: ${message}`);
        results.push({ account: account.label, game: code, status: 'error', message });
        continue;
      }

      const name = GAMES[code].name;
      let result;

      if (dryRun) {
        const info = await fetchInfo(code, account.cookie, lang);
        result = info?.retcode === 0
          ? {
              status: 'already',
              message: `Dry run — signed today: ${info.data.is_sign}, ` +
                `total days: ${info.data.total_sign_day}`,
            }
          : { status: 'error', message: `Dry run failed: retcode ${info?.retcode} (${info?.message})` };
      } else {
        result = await checkIn(code, account.cookie, lang);
      }

      console.log(`[${account.label}] ${name}: ${result.message}`);
      results.push({ account: account.label, game: name, ...result });

      await sleep(1500);
    }
  }

  await notify(results, process.env);

  const failed = results.filter((result) => result.status === 'error');
  if (failed.length > 0) {
    throw new Error(`${failed.length} check-in(s) failed`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
