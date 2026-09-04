# Hoyo Check-in Tools

Claims your HoYoLAB daily check-in rewards once a day, automatically, using GitHub Actions.
No server, no browser, no dependencies: just a scheduled workflow and one cookie.

Inspired by [gorden0929/hoyotools](https://github.com/gorden0929/hoyotools), which does the
same job as a Chrome extension. This version calls the HoYoLAB endpoints directly so it can
run headless on a schedule.

## Supported games

| Code  | Game |
|-------|------|
| `gi`  | Genshin Impact |
| `hsr` | Honkai: Star Rail |
| `zzz` | Zenless Zone Zero |
| `hi3` | Honkai Impact 3rd |
| `tot` | Tears of Themis |

## Setup

### 1. Fork this repo

Public or private both work. Your cookie lives in an Actions secret either way, which is
encrypted at rest and masked if it ever reaches a log.

The difference is the run logs. On a public repo anyone can read them, and they show which games
you check in for and your streak length. That is harmless for most people, but fork private if
you would rather not publish it. Public repos do get unlimited Actions minutes, where private
ones draw on your monthly quota. This workflow uses about a minute a day either way.

### 2. Get your cookie

1. Open <https://www.hoyolab.com> in a desktop browser and log in.
2. Open DevTools (`F12`) → **Application** → **Storage** → **Cookies** → `https://www.hoyolab.com`.
3. Copy the values of `ltoken_v2` and `ltuid_v2`.
4. Assemble them into one line:

   ```
   ltoken_v2=v2_XXXXXXXXXXXXXXXX; ltuid_v2=123456789
   ```

> Treat this like a password. It is a login session for your HoYoverse account. Logging out of
> HoYoLAB in that browser invalidates it, so log in via a private window and just close the
> window instead of logging out.

### 3. Add repository secrets

**Settings → Secrets and variables → Actions → Secrets → New repository secret**

| Secret | Required | Value |
|--------|----------|-------|
| `HOYOLAB_COOKIE` | yes | The cookie line from step 2. One line per account. |
| `DISCORD_WEBHOOK` | no | Discord webhook URL for a run summary. |
| `DISCORD_USER_ID` | no | Your Discord user ID, to get pinged in that summary. |
| `TELEGRAM_TOKEN` | no | Telegram bot token. |
| `TELEGRAM_CHAT_ID` | no | Telegram chat to post the summary to. |

Then on the **Variables** tab of the same page:

| Variable | Required | Value |
|----------|----------|-------|
| `HOYOLAB_GAMES` | yes | Space-separated game codes, e.g. `gi hsr zzz`. |
| `HOYOLAB_LANG` | no | Reward language in your check-in history. Defaults to `en-us`. |

### 4. Enable and test

Actions are disabled on new forks. Open the **Actions** tab and enable workflows, then run
**Daily check-in → Run workflow** with **dry run** ticked. A dry run reads your check-in status
without claiming anything, so it verifies the cookie safely. If it reports your total sign-in
days, you are set, and the schedule takes over from there.

## Multiple accounts

Put one cookie per line in `HOYOLAB_COOKIE`:

```
ltoken_v2=v2_AAAA; ltuid_v2=111111111
ltoken_v2=v2_BBBB; ltuid_v2=222222222
```

`HOYOLAB_GAMES` is matched line by line. A single line applies to every account:

```
gi hsr zzz
```

Or give each account its own list:

```
gi hsr zzz
gi
```

## Running locally

Requires Node 20 or newer. There are no dependencies to install.

```sh
cp .env.example .env    # then fill it in
npm run dry-run         # read status only
npm run dev             # actually check in
```

You can also override the game list from the command line:

```sh
node src/index.js gi hsr
```

## Schedule

The workflow runs at `10 16 * * *` (16:10 UTC), which is 00:10 in UTC+8, the timezone the
HoYoLAB check-in day rolls over on. Each scheduled run then waits a random 0–30 minutes before
firing. Edit the `cron` line in [checkin.yml](.github/workflows/checkin.yml) to move it.

Two things worth knowing about GitHub's scheduler:

- Scheduled runs are queued, not guaranteed on time. Delays of an hour happen under load, which
  is fine here, since you only need one run per day.
- **GitHub disables scheduled workflows after 60 days without repository activity.** A second
  workflow, [keepalive.yml](.github/workflows/keepalive.yml), prevents this: it checks weekly and,
  once the newest commit is 45 days old, pushes an empty commit to reset the clock. Normal pushes
  reset it too, so an actively edited repo never sees a keepalive commit at all. Raise or lower
  `STALE_AFTER_DAYS` in that file to trade commit noise against margin.

  It needs `contents: write`, which is already declared. If your default branch is protected
  against direct pushes, either exempt `github-actions[bot]` or delete this workflow and re-enable
  the schedule by hand when GitHub emails you.

## Troubleshooting

| Message | What it means |
|---------|---------------|
| `Cookie is invalid or expired` | Repeat step 2. Logging out of HoYoLAB kills the cookie. |
| `No account for this game` | That game code has no character bound to this HoYoLAB account. Remove it from `HOYOLAB_GAMES`. |
| `Captcha challenge triggered` | HoYoLAB wants a human. Check in once manually on the website, then let the schedule resume. |
| `Already checked in today` | Not an error. The run succeeded, and someone (or an earlier run) already claimed today. |

## How it works

[`src/games.js`](src/games.js) holds the check-in endpoint and `act_id` for each game.
[`src/hoyolab.js`](src/hoyolab.js) POSTs to them with your cookie and browser-shaped headers, and
translates HoYoLAB's `retcode` into a result. [`src/index.js`](src/index.js) walks every
account × game pair, and [`src/notify.js`](src/notify.js) sends the summary onward.

HoYoLAB reports failures with HTTP 200 and a negative `retcode` in the body, so the status code
alone tells you nothing, so every response is parsed.

## Disclaimer

Unofficial, not affiliated with HoYoverse. Automating check-in is against nobody's explicit rules
but is also not sanctioned; use it on your own account at your own risk.
