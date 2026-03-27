const https = require('https');

https.get('https://tygia.com/json.php?ran=0&rate=0&gold=1&bank=VIETCOM&date=now', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.golds && json.golds[0] && json.golds[0].value) {
        console.log('Golds array length:', json.golds[0].value.length);
        const top5 = json.golds[0].value.slice(0, 5).map(g => `${g.brand}: Buy ${g.buy}, Sell ${g.sell}`);
        console.log(top5);
      } else {
        console.log('No golds found');
      }
    } catch (e) {
      console.log('Error parsing JSON:', data.substr(0,100));
    }
  });
});
