export default {
  async fetch(request) {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const title = url.searchParams.get('title');

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };

    if (search) {
      // First try a direct G1 page lookup
      const g1Title = search.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('_') + '_(G1)';
      const directRes = await fetch(`https://tfwiki.net/api.php?action=query&titles=${encodeURIComponent(g1Title)}&prop=info&inprop=&format=json`);
      const directData = await directRes.json();
      const pages = Object.values(directData?.query?.pages || {});
      const page = pages[0];
      const exists = page && !page.missing && !page.invalid && (page.length || 0) > 2000;

      if (exists) {
        return new Response(JSON.stringify({
          query: { search: [{ title: page.title }] }
        }), { headers });
      }

      // Fall back to full search
      const res = await fetch(`https://tfwiki.net/api.php?action=query&list=search&srsearch=${encodeURIComponent(search)}&srlimit=20&format=json`);
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers });
    }

    if (title) {
      async function fetchParsed(t) {
        const res = await fetch(`https://tfwiki.net/api.php?action=parse&page=${encodeURIComponent(t)}&prop=text|images&format=json`);
        return res.json();
      }

      let data = await fetchParsed(title);
      let html = data?.parse?.text?.['*'] || '';

      // Follow redirect if present (must be an actual redirect page, not just any link)
      const isRedirect = html.match(/^<ol><li>REDIRECT/i);
      if (isRedirect) {
        const redirectMatch = html.match(/href="\/wiki\/([^"]+)"/i);
        if (redirectMatch) {
          data = await fetchParsed(redirectMatch[1]);
          html = data?.parse?.text?.['*'] || '';
        }
      }

      // Extract intro: all <p> tags before the first <h2>
      const beforeH2 = html.split(/<h2/i)[0];
      const pMatches = [...beforeH2.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
      const introText = pMatches
        .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim())
        .filter(t => t.length > 40)
        .join('\n\n');

      // Extract first two thumbnail image srcs
      const thumbMatches = [...html.matchAll(/src="([^"]+)"[^>]*class="thumbimage"/g)];
      const thumbSrc1 = thumbMatches[0] ? 'https://tfwiki.net' + thumbMatches[0][1] : null;
      const thumbSrc2 = thumbMatches[1] ? 'https://tfwiki.net' + thumbMatches[1][1] : null;

      return new Response(JSON.stringify({ intro: introText, image: thumbSrc1, image2: thumbSrc2 }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Missing search or title param' }), { status: 400, headers });
  }
}
