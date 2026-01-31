export const THRESHOLDS = {
  commodity_move_pct: 2.0,
  dxy_move_pct: 1.0,
  yield_move_bps: 10,
  gold_silver_ratio_change: 2,
};

export const WATCHED_ETFS = [
  { symbol: 'GLD', name: 'Gold (GLD)', category: 'precious' },
  { symbol: 'SLV', name: 'Silver (SLV)', category: 'precious' },
  { symbol: 'COPX', name: 'Copper Miners (COPX)', category: 'industrial' },
  { symbol: 'URNM', name: 'Uranium Miners (URNM)', category: 'energy' },
  { symbol: 'URA', name: 'Uranium (URA)', category: 'energy' },
  { symbol: 'SILJ', name: 'Silver Juniors (SILJ)', category: 'precious' },
  { symbol: 'XLE', name: 'Energy (XLE)', category: 'energy' },
  { symbol: 'UUP', name: 'Dollar Bull (UUP)', category: 'macro' },
  { symbol: 'TLT', name: '20Y+ Treasuries (TLT)', category: 'macro' },
  { symbol: 'SPY', name: 'S&P 500 (SPY)', category: 'benchmark' },
];

export const FUTURES_SYMBOLS = [
  { symbol: 'GC=F', name: 'Gold', unit: '/oz' },
  { symbol: 'SI=F', name: 'Silver', unit: '/oz' },
  { symbol: 'HG=F', name: 'Copper', unit: '/lb' },
  { symbol: 'PL=F', name: 'Platinum', unit: '/oz' },
  { symbol: 'CL=F', name: 'Crude Oil (WTI)', unit: '/bbl' },
];

export const RSS_FEEDS = [
  { name: 'ZeroHedge', url: 'https://cms.zerohedge.com/fullrss2.xml' },
  { name: 'CNBC Economy', url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html' },
  { name: 'Fox Biz Economy', url: 'https://moxie.foxbusiness.com/google-publisher/economy.xml' },
  { name: 'Fox Biz Markets', url: 'https://moxie.foxbusiness.com/google-publisher/markets.xml' },
  { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories' },
];

// Headlines matching ANY of these get passed to Claude as context
export const HEADLINE_KEYWORDS = [
  // energy & commodities
  'nuclear', 'uranium', 'reactor', 'data center', 'power grid',
  'copper', 'mining', 'energy crisis', 'grid infrastructure',
  'transformer', 'baseload', 'SMR', 'small modular reactor',
  'gold', 'silver', 'platinum', 'palladium', 'metals',
  'oil', 'crude', 'OPEC', 'pipeline', 'LNG', 'natural gas',
  'embargo', 'sanctions', 'tariff', 'trade war',
  // macro / fed / fiscal
  'fed chair', 'federal reserve', 'rate cut', 'rate hike',
  'dollar', 'inflation', 'CPI', 'PPI', 'PCE', 'treasury',
  'central bank', 'de-dollarization', 'debt ceiling', 'default',
  'recession', 'shutdown', 'fiscal',
  // geopolitical
  'war', 'invasion', 'troops', 'military', 'NATO',
  'China', 'Russia', 'Iran', 'Taiwan', 'Venezuela',
  // political / executive
  'Trump', 'executive order', 'nomination', 'cabinet',
  'Biden', 'White House', 'Congress',
];

// Subset — these trigger a HEADLINE signal in the filter
export const HIGH_PRIORITY_KEYWORDS = [
  'fed chair', 'rate cut', 'rate hike', 'federal reserve',
  'war', 'invasion', 'sanctions', 'tariff', 'embargo',
  'OPEC', 'nuclear', 'debt ceiling', 'default', 'recession',
  'executive order', 'nomination',
];

export const EIA_SERIES = {
  crude_stocks: {
    route: 'petroleum/stoc/wstk/data',
    facets: { product: 'EPC0' },
    name: 'Crude Oil Stocks',
    unit: 'thousand barrels',
  },
  natgas_storage: {
    route: 'natural-gas/stor/wkly/data',
    facets: { process: 'SAL' },
    name: 'Natural Gas Storage',
    unit: 'Bcf',
  },
};
