import { config } from 'dotenv';
import { fetchAllData } from './src/fetch-data.js';
import { filterSignals } from './src/filter.js';
import { generateBriefing } from './src/generate.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env') });

async function main() {
  console.log('=== Energy Macro Morning Briefing Agent ===');
  console.log(`Time: ${new Date().toISOString()}\n`);

  const rawData = await fetchAllData({
    FRED_API_KEY: process.env.FRED_API_KEY,
    EIA_API_KEY: process.env.EIA_API_KEY,
  });

  // Step 2: Filter for signals
  console.log('Filtering for high-impact signals...');
  const filtered = filterSignals(rawData);

  console.log(`Found ${filtered.signalCount} signal(s) (high impact: ${filtered.hasHighImpact})`);
  for (const s of filtered.signals) {
    if (s.severity !== 'INFO') console.log(`  [${s.severity}] ${s.message}`);
  }
  console.log('');

  // Show headlines
  if (rawData.headlines && rawData.headlines.length > 0) {
    console.log(`Headlines scraped: ${rawData.headlines.length}`);
    for (const h of rawData.headlines.slice(0, 5)) {
      console.log(`  [${h.source}] ${h.title}`);
    }
    if (rawData.headlines.length > 5) console.log(`  ... and ${rawData.headlines.length - 5} more`);
    console.log('');
  }

  // Step 3: Generate briefing via Claude
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not set in .env');
    console.log('\nSkipping generation. Here is the raw filtered data:\n');
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  console.log('Generating briefing via Claude...\n');
  const briefing = await generateBriefing(apiKey, filtered, rawData);

  // Output
  console.log('\u2501'.repeat(60));
  console.log(briefing);
  console.log('\u2501'.repeat(60));

  // Save to file
  const date = new Date().toISOString().split('T')[0];
  const outputDir = join(__dirname, 'output');
  mkdirSync(outputDir, { recursive: true });

  // Save briefing
  const outputPath = join(outputDir, `${date}-briefing.md`);
  writeFileSync(outputPath, briefing);
  console.log(`\nSaved to: ${outputPath}`);

  // Save raw data + signals archive
  const archivePath = join(outputDir, `${date}-data.json`);
  writeFileSync(archivePath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: 'LIVE',
    signals: filtered,
    rawData,
  }, null, 2));
  console.log(`Data archive: ${archivePath}`);
}

main().catch(console.error);
