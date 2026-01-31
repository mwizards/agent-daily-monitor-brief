import YahooFinance from 'yahoo-finance2';
import Parser from 'rss-parser';
import { WATCHED_ETFS, FUTURES_SYMBOLS, RSS_FEEDS, HEADLINE_KEYWORDS, EIA_SERIES } from './config.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const rssParser = new Parser({ timeout: 10000 });

// ── Yahoo Finance: ETF quotes + futures spot ──────────────────────────

async function fetchMarketQuotes() {
  const etfSymbols = WATCHED_ETFS.map(e => e.symbol);
  const futuresSymbols = FUTURES_SYMBOLS.map(f => f.symbol);
  const allSymbols = [...etfSymbols, ...futuresSymbols];

  const etfQuotes = {};
  const futures = {};

  try {
    const results = await yahooFinance.quote(allSymbols);

    for (const q of results) {
      const sym = q.symbol;

      // ETF
      const etfDef = WATCHED_ETFS.find(e => e.symbol === sym);
      if (etfDef) {
        const changePct = q.regularMarketChangePercent ?? 0;
        etfQuotes[sym] = {
          name: etfDef.name,
          category: etfDef.category,
          current: q.regularMarketPrice,
          previousClose: q.regularMarketPreviousClose,
          high: q.regularMarketDayHigh,
          low: q.regularMarketDayLow,
          changePct: Math.round(changePct * 100) / 100,
        };
      }

      // Futures
      const futDef = FUTURES_SYMBOLS.find(f => f.symbol === sym);
      if (futDef) {
        futures[futDef.name.toLowerCase().replace(/\s+/g, '_')] = {
          name: futDef.name,
          unit: futDef.unit,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePct: Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
          previousClose: q.regularMarketPreviousClose,
        };
      }
    }
  } catch (err) {
    console.error('Failed to fetch Yahoo Finance quotes:', err.message);
  }

  // Calculate metals from futures
  const gold = futures.gold?.price;
  const silver = futures.silver?.price;
  const metals = {
    gold: gold ? Math.round(gold * 100) / 100 : null,
    silver: silver ? Math.round(silver * 100) / 100 : null,
    copper: futures.copper?.price ? Math.round(futures.copper.price * 100) / 100 : null,
    platinum: futures.platinum?.price ? Math.round(futures.platinum.price * 100) / 100 : null,
    crude: futures.crude_oil_wti?.price ? Math.round(futures.crude_oil_wti.price * 100) / 100 : null,
    goldSilverRatio: gold && silver ? Math.round((gold / silver) * 100) / 100 : null,
  };

  return { etfQuotes, metals, futures };
}

// ── FRED: Treasury yields + DXY ───────────────────────────────────────

async function fetchTreasuryYields(apiKey) {
  const series = {
    'DGS2': '2Y',
    'DGS10': '10Y',
    'DGS30': '30Y',
    'DTWEXBGS': 'DXY_BROAD',
  };

  const results = {};

  for (const [seriesId, label] of Object.entries(series)) {
    try {
      const res = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`
      );
      const data = await res.json();

      if (data.observations && data.observations.length >= 2) {
        const latest = data.observations.find(o => o.value !== '.');
        const prev = data.observations.find((o, i) => i > 0 && o.value !== '.');

        if (latest && prev) {
          const current = parseFloat(latest.value);
          const previous = parseFloat(prev.value);
          results[label] = {
            current,
            previous,
            change: Math.round((current - previous) * 100) / 100,
            changeBps: Math.round((current - previous) * 100),
            date: latest.date,
          };
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${seriesId}:`, err.message);
    }
  }

  return results;
}

// ── EIA: Crude stocks + nat gas storage ───────────────────────────────

async function fetchEIAData(apiKey) {
  const results = {};

  for (const [key, cfg] of Object.entries(EIA_SERIES)) {
    try {
      let url = `https://api.eia.gov/v2/${cfg.route}?api_key=${apiKey}&frequency=weekly&data[]=value&sort[0][column]=period&sort[0][direction]=desc&length=2`;

      // Add facets
      for (const [facet, val] of Object.entries(cfg.facets)) {
        url += `&facets[${facet}][]=${val}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.response?.data?.length >= 2) {
        const latest = data.response.data[0];
        const prev = data.response.data[1];
        const latestVal = parseFloat(latest.value);
        const prevVal = parseFloat(prev.value);
        const change = latestVal - prevVal;

        results[key] = {
          name: cfg.name,
          unit: cfg.unit,
          latest: latestVal,
          previous: prevVal,
          change: Math.round(change * 10) / 10,
          period: latest.period,
          direction: change > 0 ? 'BUILD' : 'DRAW',
        };
      }
    } catch (err) {
      console.error(`Failed to fetch EIA ${key}:`, err.message);
    }
  }

  return Object.keys(results).length > 0 ? results : null;
}

// ── RSS: Headlines from major news sites ──────────────────────────────

async function fetchHeadlines() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
  const allHeadlines = [];

  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : null;
        if (pubDate && pubDate < cutoff) continue;

        allHeadlines.push({
          source: feed.name,
          title: item.title?.trim(),
          link: item.link,
          date: pubDate?.toISOString() || null,
        });
      }
    } catch (err) {
      console.error(`Failed to fetch RSS ${feed.name}:`, err.message);
    }
  });

  await Promise.all(feedPromises);

  // Filter for relevant headlines using keyword matching
  const lowerKeywords = HEADLINE_KEYWORDS.map(k => k.toLowerCase());
  const relevant = allHeadlines.filter(h => {
    const title = h.title?.toLowerCase() || '';
    return lowerKeywords.some(kw => title.includes(kw));
  });

  // Deduplicate by similar titles (simple: first 40 chars)
  const seen = new Set();
  const deduped = relevant.filter(h => {
    const key = h.title?.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date desc, take top 15
  deduped.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return deduped.slice(0, 15);
}

// ── Main fetch orchestrator ───────────────────────────────────────────

export async function fetchAllData(keys) {
  console.log('Fetching market data...');

  const [marketData, yields, eia, headlines] = await Promise.all([
    fetchMarketQuotes(),
    keys.FRED_API_KEY ? fetchTreasuryYields(keys.FRED_API_KEY) : {},
    keys.EIA_API_KEY ? fetchEIAData(keys.EIA_API_KEY) : null,
    fetchHeadlines(),
  ]);

  return {
    etfQuotes: marketData.etfQuotes,
    metals: marketData.metals,
    futures: marketData.futures,
    yields,
    eia,
    headlines,
    fetchedAt: new Date().toISOString(),
  };
}
