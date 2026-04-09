import * as cheerio from 'cheerio';

async function test() {
    const url = 'https://cafef.vn/home.rss';
    const resp = await fetch(url);
    const xml = await resp.text();
    const $ = cheerio.load(xml, { xml: true });
    const items = $('item').toArray().slice(0, 5);

    items.forEach((item, idx) => {
        const node = $(item);
        const title = node.find('title').first().text().trim();
        const pubDate = node.find('pubDate').text().trim() || node.find('pubdate').text().trim();
        console.log(`[${idx}] ${title} | pubDate: ${pubDate}`);
    });
}

test();
