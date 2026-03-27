const cheerio = require('cheerio');
const https = require('https');

https.get('https://webgia.com/gia-vang/', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const $ = cheerio.load(data);
    const results = [];
    $('table tbody tr').each((i, el) => {
      const name = $(el).find('td').first().text().replace(/\n/g, '').trim();
      const buy = $(el).find('td').eq(1).text().trim();
      results.push(name + ': ' + buy);
    });
    console.log("Extracted main:", results.filter(v => v.length > 5).slice(0, 10));
  });
});
