// Google Play Games: leaderboards and achievements, through the small native
// plugin in android/app/src/main/java/com/autobahnrush/game/PlayGamesPlugin.java.
// It stays switched off until you put your Play Games project id in
// android/app/src/main/res/values/games.xml and the ids below (Play Console →
// Play Games services → Leaderboards / Achievements).
export const LEADERBOARDS = { score: 'CgkI_REPLACE_score', speed: 'CgkI_REPLACE_speed', distance: 'CgkI_REPLACE_distance' };
export const ACHIEVEMENTS = {
  firstEscape: 'CgkI_REPLACE_escape', club300: 'CgkI_REPLACE_300', club400: 'CgkI_REPLACE_400', ticket: 'CgkI_REPLACE_ticket',
  hunt: 'CgkI_REPLACE_hunt', offroad: 'CgkI_REPLACE_offroad', collector: 'CgkI_REPLACE_collector', missions: 'CgkI_REPLACE_missions',
};
const plugin = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.PlayGames : null);
const real = (id) => id && !id.includes('REPLACE');

export class Games {
  constructor() { this.on = false; this.unlocked = new Set(); }
  async init() { const P = plugin(); if (!P) return false; try { const r = await P.signIn(); this.on = !!r?.signedIn; } catch { this.on = false; } return this.on; }
  submit(board, value) { const P = plugin(), id = LEADERBOARDS[board]; if (this.on && P && real(id)) P.submitScore({ leaderboardId: id, score: Math.round(value) }).catch(() => {}); }
  unlock(key) { const P = plugin(), id = ACHIEVEMENTS[key]; if (this.unlocked.has(key)) return; this.unlocked.add(key); if (this.on && P && real(id)) P.unlock({ achievementId: id }).catch(() => {}); }
  showLeaderboards() { const P = plugin(); if (this.on && P) P.showLeaderboards().catch(() => {}); }
  showAchievements() { const P = plugin(); if (this.on && P) P.showAchievements().catch(() => {}); }
}
