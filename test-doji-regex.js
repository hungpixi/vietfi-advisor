const fs = require('fs');
const content = fs.readFileSync('doji.xml', 'utf8'); // Wait, fetch returns utf8 buffer, but when I $> it PowerShell writes utf-16.
// Let's just fetch it again in memory and use regex.
const https = require('https');
https.get('https://giavang.doji.vn/api/giavang/?api_key=258fbd2a72ce8481089d88c678e9fe4f', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const matches = [...data.matchAll(/<Row Name='(.*?)'.*?Buy='(.*?)' Sell='(.*?)'/g)];
    const out = matches.map(m => ({ name: m[1], buy: m[2], sell: m[3] }));
    console.log(JSON.stringify(out, null, 2));
  });
}).on('error', console.error);
