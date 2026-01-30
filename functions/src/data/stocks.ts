import { Market } from '../types';

// ============================================
// WALLSTREET v2.0 - STOCK DATA
// Eligible stocks from NASDAQ and CAC40
// ============================================

export interface StockData {
  ticker: string;
  companyName: string;
  market: Market;
  sector: string;
  industry: string;
}

// ============================================
// CAC40 STOCKS (Euronext Paris)
// ============================================

export const CAC40_STOCKS: StockData[] = [
  // Luxury & Consumer Goods
  { ticker: 'MC.PA', companyName: 'LVMH Moët Hennessy', market: 'CAC40', sector: 'Consumer Cyclical', industry: 'Luxury Goods' },
  { ticker: 'RMS.PA', companyName: 'Hermès International', market: 'CAC40', sector: 'Consumer Cyclical', industry: 'Luxury Goods' },
  { ticker: 'KER.PA', companyName: 'Kering', market: 'CAC40', sector: 'Consumer Cyclical', industry: 'Luxury Goods' },
  { ticker: 'OR.PA', companyName: "L'Oréal", market: 'CAC40', sector: 'Consumer Defensive', industry: 'Cosmetics' },
  { ticker: 'RI.PA', companyName: 'Pernod Ricard', market: 'CAC40', sector: 'Consumer Defensive', industry: 'Beverages' },
  { ticker: 'DSY.PA', companyName: 'Dassault Systèmes', market: 'CAC40', sector: 'Technology', industry: 'Software' },

  // Financial Services
  { ticker: 'BNP.PA', companyName: 'BNP Paribas', market: 'CAC40', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'GLE.PA', companyName: 'Société Générale', market: 'CAC40', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'CA.PA', companyName: 'Crédit Agricole', market: 'CAC40', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'ACA.PA', companyName: 'Crédit Agricole SA', market: 'CAC40', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'CS.PA', companyName: 'AXA', market: 'CAC40', sector: 'Financial Services', industry: 'Insurance' },

  // Energy & Utilities
  { ticker: 'TTE.PA', companyName: 'TotalEnergies', market: 'CAC40', sector: 'Energy', industry: 'Oil & Gas' },
  { ticker: 'ENGI.PA', companyName: 'Engie', market: 'CAC40', sector: 'Utilities', industry: 'Utilities' },
  { ticker: 'EL.PA', companyName: 'EssilorLuxottica', market: 'CAC40', sector: 'Healthcare', industry: 'Medical Devices' },

  // Industrial & Aerospace
  { ticker: 'AIR.PA', companyName: 'Airbus', market: 'CAC40', sector: 'Industrials', industry: 'Aerospace' },
  { ticker: 'SAF.PA', companyName: 'Safran', market: 'CAC40', sector: 'Industrials', industry: 'Aerospace' },
  { ticker: 'HO.PA', companyName: 'Thales', market: 'CAC40', sector: 'Industrials', industry: 'Defense' },
  { ticker: 'AI.PA', companyName: 'Air Liquide', market: 'CAC40', sector: 'Basic Materials', industry: 'Chemicals' },
  { ticker: 'SU.PA', companyName: 'Schneider Electric', market: 'CAC40', sector: 'Industrials', industry: 'Electrical Equipment' },
  { ticker: 'LR.PA', companyName: 'Legrand', market: 'CAC40', sector: 'Industrials', industry: 'Electrical Equipment' },
  { ticker: 'SGO.PA', companyName: 'Saint-Gobain', market: 'CAC40', sector: 'Industrials', industry: 'Building Materials' },
  { ticker: 'VIE.PA', companyName: 'Veolia Environnement', market: 'CAC40', sector: 'Utilities', industry: 'Waste Management' },
  { ticker: 'CAP.PA', companyName: 'Capgemini', market: 'CAC40', sector: 'Technology', industry: 'IT Services' },

  // Automotive & Transportation
  { ticker: 'RNO.PA', companyName: 'Renault', market: 'CAC40', sector: 'Consumer Cyclical', industry: 'Automotive' },
  { ticker: 'STLA.PA', companyName: 'Stellantis', market: 'CAC40', sector: 'Consumer Cyclical', industry: 'Automotive' },
  { ticker: 'ML.PA', companyName: 'Michelin', market: 'CAC40', sector: 'Consumer Cyclical', industry: 'Automotive Parts' },

  // Healthcare & Pharmaceuticals
  { ticker: 'SAN.PA', companyName: 'Sanofi', market: 'CAC40', sector: 'Healthcare', industry: 'Pharmaceuticals' },

  // Telecom & Media
  { ticker: 'ORA.PA', companyName: 'Orange', market: 'CAC40', sector: 'Communication Services', industry: 'Telecom' },
  { ticker: 'VIV.PA', companyName: 'Vivendi', market: 'CAC40', sector: 'Communication Services', industry: 'Entertainment' },
  { ticker: 'PUB.PA', companyName: 'Publicis Groupe', market: 'CAC40', sector: 'Communication Services', industry: 'Advertising' },

  // Technology & Semiconductors
  { ticker: 'STM.PA', companyName: 'STMicroelectronics', market: 'CAC40', sector: 'Technology', industry: 'Semiconductors' },

  // Real Estate
  { ticker: 'URW.PA', companyName: 'Unibail-Rodamco-Westfield', market: 'CAC40', sector: 'Real Estate', industry: 'REITs' },

  // Other Industrial
  { ticker: 'BN.PA', companyName: 'Danone', market: 'CAC40', sector: 'Consumer Defensive', industry: 'Food Products' },
  { ticker: 'DG.PA', companyName: 'Vinci', market: 'CAC40', sector: 'Industrials', industry: 'Construction' },
  { ticker: 'ERF.PA', companyName: 'Eurofins Scientific', market: 'CAC40', sector: 'Healthcare', industry: 'Diagnostics' },
  { ticker: 'ALO.PA', companyName: 'Alstom', market: 'CAC40', sector: 'Industrials', industry: 'Rail Equipment' },
  { ticker: 'EN.PA', companyName: 'Bouygues', market: 'CAC40', sector: 'Industrials', industry: 'Construction' },
  { ticker: 'MT.PA', companyName: 'ArcelorMittal', market: 'CAC40', sector: 'Basic Materials', industry: 'Steel' },
  { ticker: 'TEP.PA', companyName: 'Teleperformance', market: 'CAC40', sector: 'Industrials', industry: 'Business Services' },
  { ticker: 'WLN.PA', companyName: 'Worldline', market: 'CAC40', sector: 'Technology', industry: 'Payment Services' },
];

// ============================================
// NASDAQ STOCKS (Major US Tech & Growth)
// ============================================

export const NASDAQ_STOCKS: StockData[] = [
  // Mega Cap Tech (Magnificent 7+)
  { ticker: 'AAPL', companyName: 'Apple Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Consumer Electronics' },
  { ticker: 'MSFT', companyName: 'Microsoft Corporation', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'GOOGL', companyName: 'Alphabet Inc. (Class A)', market: 'NASDAQ', sector: 'Technology', industry: 'Internet Services' },
  { ticker: 'GOOG', companyName: 'Alphabet Inc. (Class C)', market: 'NASDAQ', sector: 'Technology', industry: 'Internet Services' },
  { ticker: 'AMZN', companyName: 'Amazon.com Inc.', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'E-Commerce' },
  { ticker: 'NVDA', companyName: 'NVIDIA Corporation', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'META', companyName: 'Meta Platforms Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Social Media' },
  { ticker: 'TSLA', companyName: 'Tesla Inc.', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'Electric Vehicles' },

  // Semiconductors
  { ticker: 'AVGO', companyName: 'Broadcom Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'AMD', companyName: 'Advanced Micro Devices', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'INTC', companyName: 'Intel Corporation', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'QCOM', companyName: 'Qualcomm Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'TXN', companyName: 'Texas Instruments', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'MU', companyName: 'Micron Technology', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'MRVL', companyName: 'Marvell Technology', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'KLAC', companyName: 'KLA Corporation', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductor Equipment' },
  { ticker: 'LRCX', companyName: 'Lam Research', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductor Equipment' },
  { ticker: 'AMAT', companyName: 'Applied Materials', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductor Equipment' },
  { ticker: 'ASML', companyName: 'ASML Holding', market: 'NASDAQ', sector: 'Technology', industry: 'Semiconductor Equipment' },

  // Software & Cloud
  { ticker: 'CRM', companyName: 'Salesforce Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'ADBE', companyName: 'Adobe Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'ORCL', companyName: 'Oracle Corporation', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'NOW', companyName: 'ServiceNow Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'INTU', companyName: 'Intuit Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'SNOW', companyName: 'Snowflake Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'PLTR', companyName: 'Palantir Technologies', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'PANW', companyName: 'Palo Alto Networks', market: 'NASDAQ', sector: 'Technology', industry: 'Cybersecurity' },
  { ticker: 'CRWD', companyName: 'CrowdStrike Holdings', market: 'NASDAQ', sector: 'Technology', industry: 'Cybersecurity' },
  { ticker: 'ZS', companyName: 'Zscaler Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Cybersecurity' },
  { ticker: 'DDOG', companyName: 'Datadog Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'MDB', companyName: 'MongoDB Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'NET', companyName: 'Cloudflare Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'TEAM', companyName: 'Atlassian Corporation', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },
  { ticker: 'WDAY', companyName: 'Workday Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Software' },

  // Internet & E-Commerce
  { ticker: 'NFLX', companyName: 'Netflix Inc.', market: 'NASDAQ', sector: 'Communication Services', industry: 'Streaming' },
  { ticker: 'BKNG', companyName: 'Booking Holdings', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'Travel' },
  { ticker: 'ABNB', companyName: 'Airbnb Inc.', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'Travel' },
  { ticker: 'MELI', companyName: 'MercadoLibre Inc.', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'E-Commerce' },
  { ticker: 'SHOP', companyName: 'Shopify Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'E-Commerce' },
  { ticker: 'UBER', companyName: 'Uber Technologies', market: 'NASDAQ', sector: 'Technology', industry: 'Ride-Sharing' },
  { ticker: 'LYFT', companyName: 'Lyft Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Ride-Sharing' },
  { ticker: 'DASH', companyName: 'DoorDash Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Food Delivery' },

  // Fintech & Payments
  { ticker: 'PYPL', companyName: 'PayPal Holdings', market: 'NASDAQ', sector: 'Financial Services', industry: 'Fintech' },
  { ticker: 'SQ', companyName: 'Block Inc.', market: 'NASDAQ', sector: 'Financial Services', industry: 'Fintech' },
  { ticker: 'COIN', companyName: 'Coinbase Global', market: 'NASDAQ', sector: 'Financial Services', industry: 'Crypto' },

  // Healthcare & Biotech
  { ticker: 'AMGN', companyName: 'Amgen Inc.', market: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'GILD', companyName: 'Gilead Sciences', market: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'REGN', companyName: 'Regeneron Pharmaceuticals', market: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'VRTX', companyName: 'Vertex Pharmaceuticals', market: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'MRNA', companyName: 'Moderna Inc.', market: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'BIIB', companyName: 'Biogen Inc.', market: 'NASDAQ', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'ILMN', companyName: 'Illumina Inc.', market: 'NASDAQ', sector: 'Healthcare', industry: 'Medical Devices' },
  { ticker: 'ISRG', companyName: 'Intuitive Surgical', market: 'NASDAQ', sector: 'Healthcare', industry: 'Medical Devices' },
  { ticker: 'DXCM', companyName: 'DexCom Inc.', market: 'NASDAQ', sector: 'Healthcare', industry: 'Medical Devices' },
  { ticker: 'IDXX', companyName: 'IDEXX Laboratories', market: 'NASDAQ', sector: 'Healthcare', industry: 'Diagnostics' },

  // Consumer
  { ticker: 'SBUX', companyName: 'Starbucks Corporation', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'Restaurants' },
  { ticker: 'COST', companyName: 'Costco Wholesale', market: 'NASDAQ', sector: 'Consumer Defensive', industry: 'Retail' },
  { ticker: 'PEP', companyName: 'PepsiCo Inc.', market: 'NASDAQ', sector: 'Consumer Defensive', industry: 'Beverages' },
  { ticker: 'MDLZ', companyName: 'Mondelez International', market: 'NASDAQ', sector: 'Consumer Defensive', industry: 'Food Products' },
  { ticker: 'KDP', companyName: 'Keurig Dr Pepper', market: 'NASDAQ', sector: 'Consumer Defensive', industry: 'Beverages' },
  { ticker: 'LULU', companyName: 'Lululemon Athletica', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'Apparel' },
  { ticker: 'ROST', companyName: 'Ross Stores Inc.', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'Retail' },

  // Telecom & Communication
  { ticker: 'CMCSA', companyName: 'Comcast Corporation', market: 'NASDAQ', sector: 'Communication Services', industry: 'Telecom' },
  { ticker: 'CHTR', companyName: 'Charter Communications', market: 'NASDAQ', sector: 'Communication Services', industry: 'Telecom' },
  { ticker: 'TMUS', companyName: 'T-Mobile US Inc.', market: 'NASDAQ', sector: 'Communication Services', industry: 'Telecom' },

  // AI & Emerging Tech
  { ticker: 'AI', companyName: 'C3.ai Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'AI Software' },
  { ticker: 'PATH', companyName: 'UiPath Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Automation' },
  { ticker: 'RBLX', companyName: 'Roblox Corporation', market: 'NASDAQ', sector: 'Technology', industry: 'Gaming' },
  { ticker: 'TTWO', companyName: 'Take-Two Interactive', market: 'NASDAQ', sector: 'Communication Services', industry: 'Gaming' },
  { ticker: 'EA', companyName: 'Electronic Arts', market: 'NASDAQ', sector: 'Communication Services', industry: 'Gaming' },

  // Electric Vehicles & Clean Energy
  { ticker: 'RIVN', companyName: 'Rivian Automotive', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'Electric Vehicles' },
  { ticker: 'LCID', companyName: 'Lucid Group', market: 'NASDAQ', sector: 'Consumer Cyclical', industry: 'Electric Vehicles' },
  { ticker: 'ENPH', companyName: 'Enphase Energy', market: 'NASDAQ', sector: 'Technology', industry: 'Solar' },
  { ticker: 'FSLR', companyName: 'First Solar Inc.', market: 'NASDAQ', sector: 'Technology', industry: 'Solar' },

  // Other Large Caps
  { ticker: 'ADP', companyName: 'Automatic Data Processing', market: 'NASDAQ', sector: 'Industrials', industry: 'Business Services' },
  { ticker: 'PAYX', companyName: 'Paychex Inc.', market: 'NASDAQ', sector: 'Industrials', industry: 'Business Services' },
  { ticker: 'CSX', companyName: 'CSX Corporation', market: 'NASDAQ', sector: 'Industrials', industry: 'Railroads' },
  { ticker: 'PCAR', companyName: 'PACCAR Inc.', market: 'NASDAQ', sector: 'Industrials', industry: 'Trucks' },
  { ticker: 'ODFL', companyName: 'Old Dominion Freight', market: 'NASDAQ', sector: 'Industrials', industry: 'Trucking' },
  { ticker: 'FAST', companyName: 'Fastenal Company', market: 'NASDAQ', sector: 'Industrials', industry: 'Industrial Distribution' },
  { ticker: 'VRSK', companyName: 'Verisk Analytics', market: 'NASDAQ', sector: 'Industrials', industry: 'Data Analytics' },
  { ticker: 'CDW', companyName: 'CDW Corporation', market: 'NASDAQ', sector: 'Technology', industry: 'IT Services' },
];

// ============================================
// NYSE STOCKS (Selected Blue Chips)
// ============================================

export const NYSE_STOCKS: StockData[] = [
  // Finance
  { ticker: 'JPM', companyName: 'JPMorgan Chase & Co.', market: 'NYSE', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'BAC', companyName: 'Bank of America Corp.', market: 'NYSE', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'WFC', companyName: 'Wells Fargo & Company', market: 'NYSE', sector: 'Financial Services', industry: 'Banking' },
  { ticker: 'GS', companyName: 'Goldman Sachs Group', market: 'NYSE', sector: 'Financial Services', industry: 'Investment Banking' },
  { ticker: 'MS', companyName: 'Morgan Stanley', market: 'NYSE', sector: 'Financial Services', industry: 'Investment Banking' },
  { ticker: 'V', companyName: 'Visa Inc.', market: 'NYSE', sector: 'Financial Services', industry: 'Payments' },
  { ticker: 'MA', companyName: 'Mastercard Inc.', market: 'NYSE', sector: 'Financial Services', industry: 'Payments' },
  { ticker: 'AXP', companyName: 'American Express', market: 'NYSE', sector: 'Financial Services', industry: 'Credit Cards' },
  { ticker: 'BRK.B', companyName: 'Berkshire Hathaway (B)', market: 'NYSE', sector: 'Financial Services', industry: 'Conglomerate' },

  // Healthcare
  { ticker: 'JNJ', companyName: 'Johnson & Johnson', market: 'NYSE', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'UNH', companyName: 'UnitedHealth Group', market: 'NYSE', sector: 'Healthcare', industry: 'Health Insurance' },
  { ticker: 'PFE', companyName: 'Pfizer Inc.', market: 'NYSE', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'MRK', companyName: 'Merck & Co.', market: 'NYSE', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'ABBV', companyName: 'AbbVie Inc.', market: 'NYSE', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'LLY', companyName: 'Eli Lilly and Company', market: 'NYSE', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'TMO', companyName: 'Thermo Fisher Scientific', market: 'NYSE', sector: 'Healthcare', industry: 'Life Sciences' },
  { ticker: 'ABT', companyName: 'Abbott Laboratories', market: 'NYSE', sector: 'Healthcare', industry: 'Medical Devices' },
  { ticker: 'DHR', companyName: 'Danaher Corporation', market: 'NYSE', sector: 'Healthcare', industry: 'Life Sciences' },
  { ticker: 'BMY', companyName: 'Bristol-Myers Squibb', market: 'NYSE', sector: 'Healthcare', industry: 'Pharmaceuticals' },

  // Consumer
  { ticker: 'WMT', companyName: 'Walmart Inc.', market: 'NYSE', sector: 'Consumer Defensive', industry: 'Retail' },
  { ticker: 'HD', companyName: 'The Home Depot', market: 'NYSE', sector: 'Consumer Cyclical', industry: 'Home Improvement' },
  { ticker: 'KO', companyName: 'The Coca-Cola Company', market: 'NYSE', sector: 'Consumer Defensive', industry: 'Beverages' },
  { ticker: 'PG', companyName: 'Procter & Gamble', market: 'NYSE', sector: 'Consumer Defensive', industry: 'Household Products' },
  { ticker: 'NKE', companyName: 'Nike Inc.', market: 'NYSE', sector: 'Consumer Cyclical', industry: 'Apparel' },
  { ticker: 'MCD', companyName: "McDonald's Corporation", market: 'NYSE', sector: 'Consumer Cyclical', industry: 'Restaurants' },
  { ticker: 'DIS', companyName: 'The Walt Disney Company', market: 'NYSE', sector: 'Communication Services', industry: 'Entertainment' },
  { ticker: 'LOW', companyName: "Lowe's Companies", market: 'NYSE', sector: 'Consumer Cyclical', industry: 'Home Improvement' },
  { ticker: 'TGT', companyName: 'Target Corporation', market: 'NYSE', sector: 'Consumer Defensive', industry: 'Retail' },

  // Industrial
  { ticker: 'CAT', companyName: 'Caterpillar Inc.', market: 'NYSE', sector: 'Industrials', industry: 'Heavy Equipment' },
  { ticker: 'BA', companyName: 'The Boeing Company', market: 'NYSE', sector: 'Industrials', industry: 'Aerospace' },
  { ticker: 'GE', companyName: 'General Electric', market: 'NYSE', sector: 'Industrials', industry: 'Conglomerate' },
  { ticker: 'HON', companyName: 'Honeywell International', market: 'NYSE', sector: 'Industrials', industry: 'Aerospace' },
  { ticker: 'UPS', companyName: 'United Parcel Service', market: 'NYSE', sector: 'Industrials', industry: 'Logistics' },
  { ticker: 'RTX', companyName: 'RTX Corporation', market: 'NYSE', sector: 'Industrials', industry: 'Defense' },
  { ticker: 'LMT', companyName: 'Lockheed Martin', market: 'NYSE', sector: 'Industrials', industry: 'Defense' },
  { ticker: 'DE', companyName: 'Deere & Company', market: 'NYSE', sector: 'Industrials', industry: 'Farm Equipment' },
  { ticker: 'MMM', companyName: '3M Company', market: 'NYSE', sector: 'Industrials', industry: 'Conglomerate' },

  // Energy
  { ticker: 'XOM', companyName: 'Exxon Mobil Corporation', market: 'NYSE', sector: 'Energy', industry: 'Oil & Gas' },
  { ticker: 'CVX', companyName: 'Chevron Corporation', market: 'NYSE', sector: 'Energy', industry: 'Oil & Gas' },
  { ticker: 'COP', companyName: 'ConocoPhillips', market: 'NYSE', sector: 'Energy', industry: 'Oil & Gas' },
  { ticker: 'SLB', companyName: 'Schlumberger Limited', market: 'NYSE', sector: 'Energy', industry: 'Oil Services' },

  // Technology (NYSE Listed)
  { ticker: 'IBM', companyName: 'International Business Machines', market: 'NYSE', sector: 'Technology', industry: 'IT Services' },
  { ticker: 'ACN', companyName: 'Accenture plc', market: 'NYSE', sector: 'Technology', industry: 'IT Services' },

  // Telecom
  { ticker: 'VZ', companyName: 'Verizon Communications', market: 'NYSE', sector: 'Communication Services', industry: 'Telecom' },
  { ticker: 'T', companyName: 'AT&T Inc.', market: 'NYSE', sector: 'Communication Services', industry: 'Telecom' },
];

// ============================================
// COMBINED STOCK LIST
// ============================================

export const ALL_STOCKS: StockData[] = [
  ...CAC40_STOCKS,
  ...NASDAQ_STOCKS,
  ...NYSE_STOCKS,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Find a stock by ticker
 */
export function findStockByTicker(ticker: string): StockData | undefined {
  return ALL_STOCKS.find(s => s.ticker.toUpperCase() === ticker.toUpperCase());
}

/**
 * Search stocks by query (ticker or company name)
 */
export function searchStocks(query: string, limit = 20): StockData[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return [];

  // First, exact ticker matches
  const exactMatches = ALL_STOCKS.filter(
    s => s.ticker.toLowerCase() === normalizedQuery
  );

  // Then, ticker starts with query
  const tickerStartsWith = ALL_STOCKS.filter(
    s => s.ticker.toLowerCase().startsWith(normalizedQuery) &&
         !exactMatches.includes(s)
  );

  // Then, company name contains query
  const nameContains = ALL_STOCKS.filter(
    s => s.companyName.toLowerCase().includes(normalizedQuery) &&
         !exactMatches.includes(s) &&
         !tickerStartsWith.includes(s)
  );

  return [...exactMatches, ...tickerStartsWith, ...nameContains].slice(0, limit);
}

/**
 * Get stocks by market
 */
export function getStocksByMarket(market: Market): StockData[] {
  return ALL_STOCKS.filter(s => s.market === market);
}

/**
 * Check if a ticker is eligible
 */
export function isTickerEligible(ticker: string): boolean {
  return ALL_STOCKS.some(s => s.ticker.toUpperCase() === ticker.toUpperCase());
}
