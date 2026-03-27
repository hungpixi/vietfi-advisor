const cheerio = require('cheerio');

fetch('https://btmc.vn/', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}).then(r => r.text()).then(html => {
  const $ = cheerio.load(html);
  // btmc table usually has class for gold prices
  console.log($('table').first().text().substring(0, 500).replace(/\s+/g, ' '));
}).catch(console.error);
