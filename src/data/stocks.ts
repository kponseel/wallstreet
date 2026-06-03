// ============================================================
// Reference data used purely for autocomplete suggestions.
// You can log ANY ticker (free text) — this list just speeds up entry.
// Tickers use Yahoo Finance symbology (e.g. CAC40 names carry a ".PA" suffix,
// crypto uses "-USD"), so they work directly with the price service.
// ============================================================

export interface StockRef {
  ticker: string;
  name: string;
  market: string;
}

const CAC40: StockRef[] = [
  { ticker: 'MC.PA', name: 'LVMH Moët Hennessy', market: 'CAC40' },
  { ticker: 'RMS.PA', name: 'Hermès International', market: 'CAC40' },
  { ticker: 'KER.PA', name: 'Kering', market: 'CAC40' },
  { ticker: 'OR.PA', name: "L'Oréal", market: 'CAC40' },
  { ticker: 'RI.PA', name: 'Pernod Ricard', market: 'CAC40' },
  { ticker: 'DSY.PA', name: 'Dassault Systèmes', market: 'CAC40' },
  { ticker: 'BNP.PA', name: 'BNP Paribas', market: 'CAC40' },
  { ticker: 'GLE.PA', name: 'Société Générale', market: 'CAC40' },
  { ticker: 'ACA.PA', name: 'Crédit Agricole', market: 'CAC40' },
  { ticker: 'CS.PA', name: 'AXA', market: 'CAC40' },
  { ticker: 'TTE.PA', name: 'TotalEnergies', market: 'CAC40' },
  { ticker: 'ENGI.PA', name: 'Engie', market: 'CAC40' },
  { ticker: 'EL.PA', name: 'EssilorLuxottica', market: 'CAC40' },
  { ticker: 'AIR.PA', name: 'Airbus', market: 'CAC40' },
  { ticker: 'SAF.PA', name: 'Safran', market: 'CAC40' },
  { ticker: 'HO.PA', name: 'Thales', market: 'CAC40' },
  { ticker: 'AI.PA', name: 'Air Liquide', market: 'CAC40' },
  { ticker: 'SU.PA', name: 'Schneider Electric', market: 'CAC40' },
  { ticker: 'LR.PA', name: 'Legrand', market: 'CAC40' },
  { ticker: 'SGO.PA', name: 'Saint-Gobain', market: 'CAC40' },
  { ticker: 'VIE.PA', name: 'Veolia Environnement', market: 'CAC40' },
  { ticker: 'CAP.PA', name: 'Capgemini', market: 'CAC40' },
  { ticker: 'RNO.PA', name: 'Renault', market: 'CAC40' },
  { ticker: 'STLA.PA', name: 'Stellantis', market: 'CAC40' },
  { ticker: 'ML.PA', name: 'Michelin', market: 'CAC40' },
  { ticker: 'SAN.PA', name: 'Sanofi', market: 'CAC40' },
  { ticker: 'ORA.PA', name: 'Orange', market: 'CAC40' },
  { ticker: 'PUB.PA', name: 'Publicis Groupe', market: 'CAC40' },
  { ticker: 'STM.PA', name: 'STMicroelectronics', market: 'CAC40' },
  { ticker: 'BN.PA', name: 'Danone', market: 'CAC40' },
  { ticker: 'DG.PA', name: 'Vinci', market: 'CAC40' },
  { ticker: 'ALO.PA', name: 'Alstom', market: 'CAC40' },
  { ticker: 'EN.PA', name: 'Bouygues', market: 'CAC40' },
];

const NASDAQ: StockRef[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', market: 'NASDAQ' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', market: 'NASDAQ' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A)', market: 'NASDAQ' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', market: 'NASDAQ' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', market: 'NASDAQ' },
  { ticker: 'META', name: 'Meta Platforms Inc.', market: 'NASDAQ' },
  { ticker: 'TSLA', name: 'Tesla Inc.', market: 'NASDAQ' },
  { ticker: 'AVGO', name: 'Broadcom Inc.', market: 'NASDAQ' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', market: 'NASDAQ' },
  { ticker: 'INTC', name: 'Intel Corporation', market: 'NASDAQ' },
  { ticker: 'QCOM', name: 'Qualcomm Inc.', market: 'NASDAQ' },
  { ticker: 'TXN', name: 'Texas Instruments', market: 'NASDAQ' },
  { ticker: 'MU', name: 'Micron Technology', market: 'NASDAQ' },
  { ticker: 'ASML', name: 'ASML Holding', market: 'NASDAQ' },
  { ticker: 'CRM', name: 'Salesforce Inc.', market: 'NASDAQ' },
  { ticker: 'ADBE', name: 'Adobe Inc.', market: 'NASDAQ' },
  { ticker: 'ORCL', name: 'Oracle Corporation', market: 'NASDAQ' },
  { ticker: 'NOW', name: 'ServiceNow Inc.', market: 'NASDAQ' },
  { ticker: 'INTU', name: 'Intuit Inc.', market: 'NASDAQ' },
  { ticker: 'SNOW', name: 'Snowflake Inc.', market: 'NASDAQ' },
  { ticker: 'PLTR', name: 'Palantir Technologies', market: 'NASDAQ' },
  { ticker: 'PANW', name: 'Palo Alto Networks', market: 'NASDAQ' },
  { ticker: 'CRWD', name: 'CrowdStrike Holdings', market: 'NASDAQ' },
  { ticker: 'NET', name: 'Cloudflare Inc.', market: 'NASDAQ' },
  { ticker: 'NFLX', name: 'Netflix Inc.', market: 'NASDAQ' },
  { ticker: 'ABNB', name: 'Airbnb Inc.', market: 'NASDAQ' },
  { ticker: 'SHOP', name: 'Shopify Inc.', market: 'NASDAQ' },
  { ticker: 'UBER', name: 'Uber Technologies', market: 'NASDAQ' },
  { ticker: 'PYPL', name: 'PayPal Holdings', market: 'NASDAQ' },
  { ticker: 'COIN', name: 'Coinbase Global', market: 'NASDAQ' },
  { ticker: 'MRNA', name: 'Moderna Inc.', market: 'NASDAQ' },
  { ticker: 'GILD', name: 'Gilead Sciences', market: 'NASDAQ' },
  { ticker: 'AMGN', name: 'Amgen Inc.', market: 'NASDAQ' },
  { ticker: 'ISRG', name: 'Intuitive Surgical', market: 'NASDAQ' },
  { ticker: 'SBUX', name: 'Starbucks Corporation', market: 'NASDAQ' },
  { ticker: 'COST', name: 'Costco Wholesale', market: 'NASDAQ' },
  { ticker: 'PEP', name: 'PepsiCo Inc.', market: 'NASDAQ' },
  { ticker: 'TMUS', name: 'T-Mobile US Inc.', market: 'NASDAQ' },
  { ticker: 'RBLX', name: 'Roblox Corporation', market: 'NASDAQ' },
  { ticker: 'RIVN', name: 'Rivian Automotive', market: 'NASDAQ' },
];

const NYSE: StockRef[] = [
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', market: 'NYSE' },
  { ticker: 'BAC', name: 'Bank of America Corp.', market: 'NYSE' },
  { ticker: 'GS', name: 'Goldman Sachs Group', market: 'NYSE' },
  { ticker: 'V', name: 'Visa Inc.', market: 'NYSE' },
  { ticker: 'MA', name: 'Mastercard Inc.', market: 'NYSE' },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway (B)', market: 'NYSE' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', market: 'NYSE' },
  { ticker: 'UNH', name: 'UnitedHealth Group', market: 'NYSE' },
  { ticker: 'PFE', name: 'Pfizer Inc.', market: 'NYSE' },
  { ticker: 'MRK', name: 'Merck & Co.', market: 'NYSE' },
  { ticker: 'LLY', name: 'Eli Lilly and Company', market: 'NYSE' },
  { ticker: 'ABBV', name: 'AbbVie Inc.', market: 'NYSE' },
  { ticker: 'WMT', name: 'Walmart Inc.', market: 'NYSE' },
  { ticker: 'HD', name: 'The Home Depot', market: 'NYSE' },
  { ticker: 'KO', name: 'The Coca-Cola Company', market: 'NYSE' },
  { ticker: 'PG', name: 'Procter & Gamble', market: 'NYSE' },
  { ticker: 'NKE', name: 'Nike Inc.', market: 'NYSE' },
  { ticker: 'MCD', name: "McDonald's Corporation", market: 'NYSE' },
  { ticker: 'DIS', name: 'The Walt Disney Company', market: 'NYSE' },
  { ticker: 'CAT', name: 'Caterpillar Inc.', market: 'NYSE' },
  { ticker: 'BA', name: 'The Boeing Company', market: 'NYSE' },
  { ticker: 'GE', name: 'General Electric', market: 'NYSE' },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', market: 'NYSE' },
  { ticker: 'CVX', name: 'Chevron Corporation', market: 'NYSE' },
  { ticker: 'IBM', name: 'International Business Machines', market: 'NYSE' },
  { ticker: 'JD', name: 'JD.com Inc.', market: 'NASDAQ' },
  { ticker: 'BABA', name: 'Alibaba Group', market: 'NYSE' },
  { ticker: 'VZ', name: 'Verizon Communications', market: 'NYSE' },
  { ticker: 'T', name: 'AT&T Inc.', market: 'NYSE' },
];

const ETFS: StockRef[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', market: 'ETF' },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', market: 'ETF' },
  { ticker: 'QQQ', name: 'Invesco QQQ (Nasdaq 100)', market: 'ETF' },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market', market: 'ETF' },
  { ticker: 'IWM', name: 'iShares Russell 2000', market: 'ETF' },
  { ticker: 'DIA', name: 'SPDR Dow Jones Industrial', market: 'ETF' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', market: 'ETF' },
  { ticker: 'GLD', name: 'SPDR Gold Shares', market: 'ETF' },
  { ticker: 'CW8.PA', name: 'Amundi MSCI World (Paris)', market: 'ETF' },
];

const CRYPTO: StockRef[] = [
  { ticker: 'BTC-USD', name: 'Bitcoin', market: 'Crypto' },
  { ticker: 'ETH-USD', name: 'Ethereum', market: 'Crypto' },
  { ticker: 'SOL-USD', name: 'Solana', market: 'Crypto' },
  { ticker: 'BNB-USD', name: 'BNB', market: 'Crypto' },
  { ticker: 'XRP-USD', name: 'XRP', market: 'Crypto' },
  { ticker: 'ADA-USD', name: 'Cardano', market: 'Crypto' },
  { ticker: 'DOGE-USD', name: 'Dogecoin', market: 'Crypto' },
];

export const STOCKS: StockRef[] = [...CAC40, ...NASDAQ, ...NYSE, ...ETFS, ...CRYPTO];

/** Common AI models, used as datalist suggestions (free text is allowed). */
export const AI_MODELS: string[] = [
  'Claude Opus 4.8',
  'Claude Sonnet 4.6',
  'Claude Haiku 4.5',
  'GPT-5',
  'GPT-5 mini',
  'o4',
  'Gemini 2.5 Pro',
  'Gemini 2.5 Flash',
  'Grok 4',
  'DeepSeek V3',
  'Llama 4 Maverick',
  'Mistral Large',
  'Perplexity',
];

export const CURRENCIES: string[] = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD'];

const byTicker = new Map(STOCKS.map((s) => [s.ticker.toUpperCase(), s]));

export function findStock(ticker: string): StockRef | undefined {
  return byTicker.get(ticker.trim().toUpperCase());
}

/** Fuzzy-ish search over ticker + name for autocomplete. */
export function searchStocks(query: string, limit = 8): StockRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: StockRef[] = [];
  const contains: StockRef[] = [];
  for (const s of STOCKS) {
    const ticker = s.ticker.toLowerCase();
    const name = s.name.toLowerCase();
    if (ticker.startsWith(q) || name.startsWith(q)) starts.push(s);
    else if (ticker.includes(q) || name.includes(q)) contains.push(s);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
