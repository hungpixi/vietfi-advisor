async function test() {
    const ticker = "FPT.HM";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=1640970000&period2=1735578000&interval=1d`;
    const HEADERS = {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
    };

    try {
        const resp = await fetch(url, { headers: HEADERS });
        console.log("Status:", resp.status);
        if (!resp.ok) {
            console.log("Error body:", await resp.text());
            return;
        }
        const json = await resp.json();
        console.log("Has chart result:", !!json.chart?.result);
        if (json.chart?.result) {
            const res = json.chart.result[0];
            const t = res.timestamp;
            const c = res.indicators.quote[0].close;
            console.log("Data length:", t ? t.length : 0);
            console.log("First timestamp:", t ? t[0] : null);
            console.log("First close:", c ? c[0] : null);
        }
    } catch (e) {
        console.error("Fetch failed", e);
    }
}
test();
