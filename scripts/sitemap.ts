import fs from 'node:fs';
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://jasonxiao127.github.io/token-usage/</loc><changefreq>daily</changefreq></url>\n</urlset>\n`;
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/sitemap.xml', xml);
console.log('sitemap written');
