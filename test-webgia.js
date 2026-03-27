const cheerio = require('cheerio');
const https = require('https');

https.get('https://webgia.com/gia-vang/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const $ = cheerio.load(data);
    const results = [];
    $('table.table-striped tbody tr').each((i, el) => {
      const name = $(el).find('td').first().text().trim();
      const buy = $(el).find('td').eq(1).text().trim();
      const sell = $(el).find('td').eq(2).text().trim();
      if (name) results.push({ name, buy, sell });
    });
    console.log("Extracted from webgia.com:", results.slice(0, 10));
  });
}).on('error', console.error);
