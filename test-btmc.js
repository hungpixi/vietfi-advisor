fetch('https://btmc.vn/api/getbuyandsellprice', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  }
}).then(r => r.text()).then(t => console.log(t.substring(0, 500))).catch(console.error);
