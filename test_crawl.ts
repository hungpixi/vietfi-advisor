import { crawlNews } from './src/lib/news/crawler';

async function test() {
    console.log("Crawling...");
    const snapshot = await crawlNews({ includeContent: false, enableAiReview: false });
    console.log(`Fetched at: ${snapshot.fetchedAt}`);
    console.log(`Total Articles: ${snapshot.articles.length}`);
    snapshot.articles.slice(0, 3).forEach((a, i) => {
        console.log(`[${i}] ${a.title} - ${a.published} - ${a.asset} - ${a.sentiment} (${a.sentimentScore})`);
    });
}

test();
