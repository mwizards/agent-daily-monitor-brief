import { THRESHOLDS, HIGH_PRIORITY_KEYWORDS } from './config.js';

export function filterSignals(data) {
  const signals = [];

  // Check ETF moves
  if (data.etfQuotes) {
    for (const [symbol, quote] of Object.entries(data.etfQuotes)) {
      const absPct = Math.abs(quote.changePct);
      if (absPct >= THRESHOLDS.commodity_move_pct) {
        signals.push({
          type: 'PRICE_MOVE',
          severity: absPct >= 5 ? 'CRITICAL' : absPct >= 3 ? 'HIGH' : 'MODERATE',
          symbol,
          name: quote.name,
          category: quote.category,
          changePct: quote.changePct,
          current: quote.current,
          direction: quote.changePct > 0 ? 'UP' : 'DOWN',
          message: `${quote.name} ${quote.changePct > 0 ? '+' : ''}${quote.changePct}% to $${quote.current}`,
        });
      }
    }
  }

  // Check yield moves (exclude DXY_BROAD — handled separately)
  if (data.yields) {
    for (const [label, yield_data] of Object.entries(data.yields)) {
      if (label !== 'DXY_BROAD' && label.includes('Y') && Math.abs(yield_data.changeBps) >= THRESHOLDS.yield_move_bps) {
        signals.push({
          type: 'YIELD_MOVE',
          severity: Math.abs(yield_data.changeBps) >= 20 ? 'HIGH' : 'MODERATE',
          label,
          current: yield_data.current,
          changeBps: yield_data.changeBps,
          direction: yield_data.changeBps > 0 ? 'UP' : 'DOWN',
          message: `${label} yield ${yield_data.changeBps > 0 ? '+' : ''}${yield_data.changeBps}bps to ${yield_data.current}%`,
        });
      }
    }

    // Check DXY
    if (data.yields.DXY_BROAD) {
      const dxy = data.yields.DXY_BROAD;
      const dxyPct = (dxy.change / dxy.previous) * 100;
      if (Math.abs(dxyPct) >= THRESHOLDS.dxy_move_pct) {
        signals.push({
          type: 'DXY_MOVE',
          severity: Math.abs(dxyPct) >= 2 ? 'HIGH' : 'MODERATE',
          current: dxy.current,
          changePct: Math.round(dxyPct * 100) / 100,
          direction: dxyPct > 0 ? 'STRENGTHENING' : 'WEAKENING',
          message: `Dollar index ${dxyPct > 0 ? '+' : ''}${Math.round(dxyPct * 100) / 100}% — ${dxyPct > 0 ? 'strengthening' : 'weakening'}`,
        });
      }
    }
  }

  // Check headlines for high-priority keywords
  if (data.headlines && data.headlines.length > 0) {
    const lowerPriority = HIGH_PRIORITY_KEYWORDS.map(k => k.toLowerCase());
    for (const h of data.headlines) {
      const title = h.title?.toLowerCase() || '';
      const matched = lowerPriority.filter(kw => title.includes(kw));
      if (matched.length > 0) {
        const isGeo = matched.some(kw => ['war', 'invasion', 'sanctions', 'tariff', 'embargo'].includes(kw));
        const isFed = matched.some(kw => ['fed chair', 'rate cut', 'rate hike', 'federal reserve'].includes(kw));
        signals.push({
          type: 'HEADLINE',
          severity: (isGeo || isFed) ? 'HIGH' : 'MODERATE',
          source: h.source,
          title: h.title,
          keywords: matched,
          message: `[${h.source}] ${h.title}`,
        });
      }
    }
  }

  // Check gold/silver ratio
  if (data.metals && data.metals.goldSilverRatio) {
    signals.push({
      type: 'RATIO',
      severity: 'INFO',
      goldSilverRatio: data.metals.goldSilverRatio,
      message: `Gold/Silver ratio: ${data.metals.goldSilverRatio}x`,
    });
  }

  // Sort by severity: CRITICAL > HIGH > MODERATE > INFO
  const severityOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, INFO: 3 };
  signals.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

  return {
    signals,
    hasHighImpact: signals.some(s => s.severity === 'CRITICAL' || s.severity === 'HIGH'),
    signalCount: signals.filter(s => s.severity !== 'INFO').length,
  };
}
