const ICON = { ok: '✅', already: '☑️', error: '❌' };

/** Renders the run summary as plain text shared by both notifiers. */
function render(results) {
  return results
    .map(({ account, game, status, message }) =>
      `${ICON[status]} [${account}] ${game}: ${message}`)
    .join('\n');
}

async function sendDiscord(webhook, results, mentionUserId) {
  if (!webhook.startsWith('https://discord.com/api/webhooks/')) {
    console.error('DISCORD_WEBHOOK is not a Discord webhook URL, skipping');
    return;
  }

  const mention = mentionUserId ? `<@${mentionUserId}>\n` : '';
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: `${mention}**HoYoLAB daily check-in**\n${render(results)}` }),
  });

  if (!res.ok) console.error(`Discord notification failed: HTTP ${res.status}`);
}

async function sendTelegram(token, chatId, results) {
  if (!chatId) {
    console.error('TELEGRAM_TOKEN is set but TELEGRAM_CHAT_ID is missing, skipping');
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: `HoYoLAB daily check-in\n${render(results)}` }),
  });

  if (!res.ok) console.error(`Telegram notification failed: HTTP ${res.status}`);
}

/**
 * Fans the summary out to whichever notifiers are configured. Never throws:
 * a broken webhook must not turn a successful check-in into a failed run.
 */
export async function notify(results, env) {
  const tasks = [];

  if (env.DISCORD_WEBHOOK) {
    tasks.push(sendDiscord(env.DISCORD_WEBHOOK, results, env.DISCORD_USER_ID));
  }
  if (env.TELEGRAM_TOKEN) {
    tasks.push(sendTelegram(env.TELEGRAM_TOKEN, env.TELEGRAM_CHAT_ID, results));
  }

  const settled = await Promise.allSettled(tasks);
  for (const result of settled) {
    if (result.status === 'rejected') console.error(`Notifier error: ${result.reason}`);
  }
}
