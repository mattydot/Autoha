// Error reporting: JavaScript errors are kept on the device (last 30) so a
// player can send a report from Settings. If Firebase Crashlytics is set up
// in the Android app (see docs/ANDROID.md) they are sent there too.
const KEY = 'autobahn-rush-errors';
const crash = () => window.Capacitor?.Plugins?.FirebaseCrashlytics;
let log = []; try { log = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}
function record(msg, stack) {
  const e = { t: new Date().toISOString(), msg: String(msg).slice(0, 300), stack: String(stack || '').split('\n').slice(0, 6).join('\n') };
  log.push(e); if (log.length > 30) log = log.slice(-30); try { localStorage.setItem(KEY, JSON.stringify(log)); } catch {}
  try { crash()?.recordException({ message: e.msg, stacktrace: [] }); } catch {}
}
export function installErrorLog() {
  addEventListener('error', (e) => record(e.message, e.error?.stack));
  addEventListener('unhandledrejection', (e) => record(e.reason?.message || e.reason, e.reason?.stack));
}
export function errorReport(extra = '') {
  return [`Autobahn Rush error report · ${new Date().toISOString()}`, navigator.userAgent, extra, '', ...log.map((e) => `[${e.t}] ${e.msg}\n${e.stack}`)].join('\n');
}
export const errorCount = () => log.length;
export async function sendErrorReport(extra) {
  const text = errorReport(extra);
  try { if (navigator.share) { await navigator.share({ title: 'Autobahn Rush error report', text }); return 'shared'; } } catch {}
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch {}
  return 'failed';
}
