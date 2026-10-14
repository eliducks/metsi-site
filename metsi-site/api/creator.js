// Vercel serverless function: GET /api/creator
// Reads published rows from your Notion database. The secret token stays here, on the server.
// Env vars to set in Vercel: NOTION_TOKEN, NOTION_DB_ID

export default async function handler(req, res) {
  try {
    const r = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'Published', checkbox: { equals: true } },
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 6,
      }),
    });
    if (!r.ok) throw new Error(`notion ${r.status}`);
    const data = await r.json();
    const text = (arr) => (arr || []).map((t) => t.plain_text).join('');
    const posts = data.results.map((p) => ({
      title: text(p.properties.Title?.title),
      date: p.properties.Date?.date?.start || null,
      message: text(p.properties.Message?.rich_text),
    }));
    // Cache at the edge for 5 minutes so visitors never hit Notion's rate limit
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ posts });
  } catch (e) {
    res.status(502).json({ posts: [] });
  }
}
