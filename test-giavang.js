const https = require('https');

function check(brand) {
  https.get(`https://giavang.com.vn/wp-json/giavang/v1/${brand}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json && json.prices) {
           console.log(`[${brand}] Found prices! 1st:`, json.prices[0]?.name, 'Buy:', json.prices[0]?.buy);
        } else {
           console.log(`[${brand}] Not found or structure diff.`);
        }
      } catch (e) {
        console.log(`[${brand}] Error parsing JSON: ${data.substr(0,100)}...`);
      }
    });
  });
}

check('doji');
check('btmc');
check('pnj');
