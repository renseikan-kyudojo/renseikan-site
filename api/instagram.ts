// Daily cron (vercel.json): refresh the Instagram long-lived token, fetch the latest posts, trigger a rebuild.
// Runs as a Vercel Function (Node). Needs INSTAGRAM_TOKEN, INSTAGRAM_USER_ID, VERCEL_DEPLOY_HOOK, CRON_SECRET.
// The build itself reads the posts through src/lib/instagram.ts, so this function's job is only to keep the token
// alive and to kick a deploy; if the token string ever changes on refresh, update the Vercel env var (runbook 05).
//
// Vercel calls crons with GET and sends `Authorization: Bearer <CRON_SECRET>`. The named GET export is the Web
// handler signature (Request in, Response out); a bare default-exported function would be called with Node's
// (req, res) instead and crash on req.headers.get. Fails closed: without CRON_SECRET nobody can trigger it.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('forbidden', { status: 403 });
  }
  const token = process.env.INSTAGRAM_TOKEN;
  if (!token) return new Response('no token', { status: 500 });
  const out: Record<string, unknown> = {};
  try {
    const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
    const j = await r.json();
    out.refresh = { ok: r.ok, expires_in_days: j.expires_in ? Math.round(j.expires_in / 86400) : null, token_changed: !!(j.access_token && j.access_token !== token) };
  } catch (e) { out.refresh = { ok: false, error: String(e) }; }
  if (process.env.VERCEL_DEPLOY_HOOK) {
    try { const d = await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: 'POST' }); out.deploy = { ok: d.ok, status: d.status }; }
    catch (e) { out.deploy = { ok: false, error: String(e) }; }
  }
  console.log('[instagram cron]', JSON.stringify(out));
  return Response.json(out);
}
