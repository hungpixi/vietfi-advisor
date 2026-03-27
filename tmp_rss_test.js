const cheerio = require("cheerio");

async function run() {
  const resp = await fetch("https://cafef.vn/thi-truong-chung-khoan.rss");
  const xml = await resp.text();
  const $ = cheerio.load(xml, { xml: true });
  const items = $("item").toArray().slice(0, 2);
  
  items.forEach(item => {
    const node = $(item);
    console.log("Title:", node.find("title").first().text().trim());
    console.log("pubDate:", node.find("pubDate").text().trim());
    console.log("pubdate (lower):", node.find("pubdate").text().trim());
  });
}
run();
