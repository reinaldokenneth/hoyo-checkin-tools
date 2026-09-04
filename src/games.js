/**
 * HoYoLAB daily check-in endpoints, one entry per supported game.
 *
 * `signGame` is sent as the `x-rpc-signgame` header. ZZZ rejects requests
 * without it; the other games ignore it (they are told apart by `actId`),
 * but the browser sends it for all of them so we do too.
 */
export const GAMES = {
  gi: {
    name: 'Genshin Impact',
    actId: 'e202102251931481',
    signGame: 'gi',
    signUrl: 'https://sg-hk4e-api.hoyolab.com/event/sol/sign',
    infoUrl: 'https://sg-hk4e-api.hoyolab.com/event/sol/info',
    referer: 'https://act.hoyolab.com/ys/event/signin-sea-v3/index.html',
  },
  hsr: {
    name: 'Honkai: Star Rail',
    actId: 'e202303301540311',
    signGame: 'hsr',
    signUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/sign',
    infoUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/info',
    referer: 'https://act.hoyolab.com/bbs/event/signin/hkrpg/index.html',
  },
  zzz: {
    name: 'Zenless Zone Zero',
    actId: 'e202406031448091',
    signGame: 'zzz',
    signUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/sign',
    infoUrl: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os/info',
    referer: 'https://act.hoyolab.com/bbs/event/signin/zzz/e202406031448091.html',
  },
  hi3: {
    name: 'Honkai Impact 3rd',
    actId: 'e202110291205111',
    signGame: 'hi3',
    signUrl: 'https://sg-public-api.hoyolab.com/event/mani/sign',
    infoUrl: 'https://sg-public-api.hoyolab.com/event/mani/info',
    referer: 'https://act.hoyolab.com/bbs/event/signin-bh3/index.html',
  },
  tot: {
    name: 'Tears of Themis',
    actId: 'e202202281857121',
    signGame: 'tot',
    signUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/sign',
    infoUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/info',
    referer: 'https://act.hoyolab.com/bbs/event/signin/nxx/index.html',
  },
};

export const GAME_CODES = Object.keys(GAMES);
