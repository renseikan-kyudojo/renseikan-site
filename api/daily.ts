// Daily cron (vercel.json, 09:00 UTC): trigger a rebuild so the class dates roll forward even when nothing was edited,
// and keep the Instagram long-lived token alive if one is set (the feed itself is a Phase 3 item; see docs/).
// Runs as a Vercel Function (Node). Needs CRON_SECRET and VERCEL_DEPLOY_HOOK; INSTAGRAM_TOKEN is optional. If the
// token string ever changes on refresh, update the Vercel env var.
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
  const out: Record<string, unknown> = {};
  if (!token) out.refresh = 'skipped: no INSTAGRAM_TOKEN yet';
  else
    try {
      const r = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
      );
      const j = await r.json();
      out.refresh = {
        ok: r.ok,
        expires_in_days: j.expires_in ? Math.round(j.expires_in / 86400) : null,
        token_changed: !!(j.access_token && j.access_token !== token),
      };
    } catch (e) {
      out.refresh = { ok: false, error: String(e) };
    }
  if (process.env.VERCEL_DEPLOY_HOOK) {
    try {
      const d = await fetch(process.env.VERCEL_DEPLOY_HOOK, { method: 'POST' });
      out.deploy = { ok: d.ok, status: d.status };
    } catch (e) {
      out.deploy = { ok: false, error: String(e) };
    }
  }
  console.log('[daily cron]', JSON.stringify(out));
  return Response.json(out);
}
