const u = new URL('https://bfgbeqq4.api.sanity.io/v2025-02-19/data/query/production');
u.searchParams.set('query', `*[_type == "album"].photos[defined(hdr)]{ "image": asset->url, "w": asset->metadata.dimensions.width, "h": asset->metadata.dimensions.height, "hdr": hdr.asset->url }`);
console.log(JSON.stringify((await (await fetch(u)).json()).result, null, 1));
