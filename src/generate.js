import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_PROMPT = readFileSync(join(__dirname, '..', 'prompts', 'briefing.md'), 'utf-8');

export async function generateBriefing(apiKey, filteredData, rawData) {
  const client = new Anthropic({ apiKey });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dataContext = buildDataContext(filteredData, rawData, today);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Write today's morning briefing. Date: ${today}\n\nMarket data and signals:\n${dataContext}`,
      },
    ],
  });

  return message.content[0].text;
}

function buildDataContext(filteredData, rawData, today) {
  let context = '';

  // Signals summary
  if (filteredData.signalCount === 0) {
    context += 'NO HIGH-IMPACT SIGNALS DETECTED TODAY.\n\n';
  } else {
    context += `${filteredData.signalCount} HIGH-IMPACT SIGNAL(S) DETECTED:\n`;
    for (const signal of filteredData.signals) {
      if (signal.severity !== 'INFO') {
        context += `- [${signal.severity}] ${signal.message}\n`;
      }
    }
    context += '\n';
  }

  // ETF price dashboard
  context += 'ETF PRICES (current | change):\n';
  if (rawData.etfQuotes) {
    for (const [symbol, quote] of Object.entries(rawData.etfQuotes)) {
      context += `  ${symbol}: $${quote.current} (${quote.changePct > 0 ? '+' : ''}${quote.changePct}%)\n`;
    }
  }
  context += '\n';

  // Metals spot (from futures)
  if (rawData.metals) {
    context += 'METALS & COMMODITIES SPOT:\n';
    if (rawData.metals.gold) context += `  Gold: $${rawData.metals.gold}/oz\n`;
    if (rawData.metals.silver) context += `  Silver: $${rawData.metals.silver}/oz\n`;
    if (rawData.metals.copper) context += `  Copper: $${rawData.metals.copper}/lb\n`;
    if (rawData.metals.platinum) context += `  Platinum: $${rawData.metals.platinum}/oz\n`;
    if (rawData.metals.crude) context += `  Crude Oil (WTI): $${rawData.metals.crude}/bbl\n`;
    if (rawData.metals.goldSilverRatio) context += `  Gold/Silver Ratio: ${rawData.metals.goldSilverRatio}x\n`;
    context += '\n';
  }

  // Yields
  if (rawData.yields && Object.keys(rawData.yields).length > 0) {
    context += 'TREASURY YIELDS:\n';
    for (const [label, y] of Object.entries(rawData.yields)) {
      if (label === 'USD_BROAD') {
        context += `  USD Broad Trade-Weighted Index (NOT DXY): ${y.current} (${y.change > 0 ? '+' : ''}${y.change})\n`;
      } else {
        context += `  ${label}: ${y.current}% (${y.changeBps > 0 ? '+' : ''}${y.changeBps}bps)\n`;
      }
    }
    context += '\n';
  }

  // EIA energy data
  if (rawData.eia) {
    context += 'EIA ENERGY DATA:\n';
    for (const [key, d] of Object.entries(rawData.eia)) {
      context += `  ${d.name}: ${d.direction} of ${Math.abs(d.change)} ${d.unit} (week of ${d.period})\n`;
    }
    context += '\n';
  }

  // Headlines
  if (rawData.headlines && rawData.headlines.length > 0) {
    context += 'TOP HEADLINES (last 24h):\n';
    for (const h of rawData.headlines) {
      context += `- [${h.source}] ${h.title}\n`;
    }
    context += '\n';
  }

  // Ratio info
  const ratioSignal = filteredData.signals.find(s => s.type === 'RATIO');
  if (ratioSignal) {
    context += `GOLD/SILVER RATIO: ${ratioSignal.goldSilverRatio}x (historical mean: 16x, thesis target: sub-30x)\n\n`;
  }

  return context;
}
