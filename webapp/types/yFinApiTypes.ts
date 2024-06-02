export type YFinAutocompleteResult = {
  symbol: string;
  name: string;
  exch: string;
  type: string;
  exchDisp: string;
  typeDisp: string;
};

export type YFinQuoteResponse = {
  quoteResponse: {
    error: any,
    result: YFinQuoteResult[]
  }
}

export type YFinQuoteResult = {
  language: string;
  region: string;
  quoteType: string;
  triggerable: boolean;
  quoteSourceName: string;
  fiftyDayAverage: number; //
  fiftyDayAverageChange: number; //
  fiftyDayAverageChangePercent: number; //
  twoHundredDayAverage: number; //
  twoHundredDayAverageChange: number; //
  twoHundredDayAverageChangePercent: number; //
  sourceInterval: number;
  exchangeTimezoneName: string;
  exchangeTimezoneShortName: string;
  gmtOffSetMilliseconds: number;
  currency: string; //
  priceHint: number; //??
  regularMarketChangePercent: number; //
  regularMarketDayRange: string; //
  shortName: string;
  regularMarketPreviousClose: number; //
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  messageBoardId: string;
  fullExchangeName: string;
  fiftyTwoWeekLowChange: number;
  fiftyTwoWeekLowChangePercent: number;
  fiftyTwoWeekRange: string;
  fiftyTwoWeekHighChange: number;
  fiftyTwoWeekHighChangePercent: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  longName: string;
  averageDailyVolume3Month: number;
  averageDailyVolume10Day: number;
  exchangeDataDelayedBy: number;
  marketState: string;
  esgPopulated: boolean;
  tradeable: boolean;
  regularMarketPrice: number;
  regularMarketTime: number;
  regularMarketChange: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  exchange: string;
  market: string;
  symbol: string;
};

export const _range= ["1d" ,"5d" ,"1d" ,"5d" ,"1mo","3mo","6mo","1y" ,"5y" ,"10y","ytd","max"] as const
export const _interval= ["1m"  ,"5m"  ,"15m" ,"1d"  ,"1wk" ,"1mo"] as const
export const _event= ["div" , "split" , "div,split", null] as const
export type ChartParams = {
  //range: "1d" |"5d" |"1d" |"5d" |"1mo"|"3mo"|"6mo"|"1y" |"5y" |"10y"|"ytd"|"max"
  //interval: "1m"  |"5m"  |"15m" |"1d"  |"1wk" |"1mo"
  //event: "div" | "split" | null
  range: typeof _range[number]
  interval: typeof _interval[number]
  event: typeof _event[number]
}
export interface YFinChartResponse {
  chart: Chart
}

 interface Chart {
  result: YFinChartResult[]
  error: unknown
}

export interface YFinChartResult {
  meta: YFinChartMeta
  timestamp: number[]
  indicators: YFinChartIndicators
}

export interface YFinChartMeta {
  currency: string
  symbol: string
  exchangeName: string
  instrumentType: string
  firstTradeDate: number
  regularMarketTime: number
  hasPrePostMarketData: boolean
  gmtoffset: number
  timezone: string
  exchangeTimezoneName: string
  regularMarketPrice: number
  chartPreviousClose: number
  priceHint: number
  currentTradingPeriod: CurrentTradingPeriod
  dataGranularity: string
  range: string
  validRanges: string[]
}

export interface CurrentTradingPeriod {
  pre: Pre
  regular: Regular
  post: Post
}

export interface Pre {
  timezone: string
  end: number
  start: number
  gmtoffset: number
}

export interface Regular {
  timezone: string
  end: number
  start: number
  gmtoffset: number
}

export interface Post {
  timezone: string
  end: number
  start: number
  gmtoffset: number
}

export interface YFinChartIndicators {
  quote: Quote[]
  adjclose: Adjclose[]
}

export interface Quote {
  open: number[]
  close: number[]
  high: number[]
  volume: number[]
  low: number[]
}

export interface Adjclose {
  adjclose: number[]
}