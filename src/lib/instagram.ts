// Build-time fetch of the dojo's latest Instagram posts (Instagram API with Instagram Login).
// Returns [] when no token is set or the API is down, so a build never fails because of Instagram.
export interface IgPost { id: string; caption?: string; media_type: string; media_url: string; thumbnail_url?: string; permalink: string; timestamp: string; }

export async function latestPosts(limit = 6): Promise<IgPost[]> {
  const token = import.meta.env.INSTAGRAM_TOKEN;
  if (!token) return [];
  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const r = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.data || []).filter((p: IgPost) => p.media_type !== 'VIDEO' || p.thumbnail_url);
  } catch { return []; }
}
