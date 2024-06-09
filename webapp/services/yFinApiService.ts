import { ChartParams, YFinAutocompleteResult, YFinChartResponse, YFinChartResult, YFinQuoteResponse, YFinQuoteResult } from "../types/yFinApiTypes";

export default async function api_request<T>(apiKey:string,queryParams:string, abortController?:AbortController) : Promise<T> {
      const headers: Headers = new Headers();
      headers.append("accept", "application/json");
      headers.append("X-API-KEY", apiKey);
      const service = `https://yfapi.net/`
      const query = service + queryParams
      console.log("api_request query", query)
      console.log("api_request headers", JSON.stringify(headers) )
      headers.forEach((v,k) => console.log(`header key ${k} : value ${v}`))
      try {
        const response = await fetch(query, {
          method: "get",
          headers: headers,
          mode: "cors",
          cache: "no-cache",
          signal: abortController?.signal,
        });
        console.log("api_request response", response)
        if (response.status === 401 || response.status === 403) {
          console.log("api_request response nok")
          throw {
            status: response.status,
            statusText: response.statusText,
          };
        }
        if (!response.ok) {
          console.log("api_request response ok")
          throw {
            status: response.status,
            statusText: response.statusText,
          };
        }
        const result = await response.json();
        console.log("api_request result", result)
        if (Object.prototype.hasOwnProperty.call(result, "error")) {
          console.log("api_request result hase error branch")
          console.error(result.error);
          throw new Error(result.error);
        }
        return result;
      } catch (error) {
        console.log("api_request error caught for query", query)
        console.error(error);
        throw new Error("failed to fetch data.");
      }
}
export const api_getChart = async (apiKey:string, symbol:string, chartParams:ChartParams, abortController?:AbortController) : Promise<YFinChartResult> => {
     const query = `v8/finance/chart/${symbol}?region=DE&lang=de&range=${chartParams.range}&interval=${chartParams.interval}${chartParams.event ? "&events=" + chartParams.event : ""}`;
     return api_request<YFinChartResponse>(apiKey, query, abortController)
       .then(response => response.chart.result[0] )
}

export type FNFetchBatch =  (batchOfSymbols:string[], abortController?:AbortController) => Promise<YFinQuoteResult[]>
export const api_getAssetBatch = (apiKey:string) => {
  const MAX_BATCH_SIZE = 10;
  //async function api_fetchBatch(batchOfSymbols:string[], abortController?:AbortController) : Promise<YFinQuoteResult[]> {
  const api_fetchBatch : FNFetchBatch = 
    async (batchOfSymbols:string[], abortController?:AbortController) : Promise<YFinQuoteResult[]>  => {
      const symbols=batchOfSymbols.join(',')
      const query = `v6/finance/quote?region=DE&lang=de&symbols=${encodeURIComponent(symbols)}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return api_request<any>(apiKey, query, abortController)
        .then(response => response["quoteResponse"]["result"] )
  }
  return { MAX_BATCH_SIZE, fetchBatch:api_fetchBatch };
}

export interface QueryParam {
    query:string
}

export function fetchYFinQuery(apiKey:string, {query}:QueryParam, abortController?:AbortController): Promise<YFinQuoteResult[]> {
    console.log("fetchYFinQuery")
    const uri = `v6/finance/autocomplete?region=DE&lang=de&query=${query}`;
    return api_request<any>(apiKey, uri, abortController)
        .then(response => {
            console.log("response received")
            const autocompl:YFinAutocompleteResult[] = response["ResultSet"]["Result"] 
            const maxBatch = 10 // defined by the api: https://financeapi.net/yh-finance-api-specification.json
            let [batches, rest] = autocompl.reduce((acc, a, i) => {
                if(i !== 0 && i % maxBatch === 0) {
                    return [acc[0].concat(acc[1]), []]
                } else {
                    return [acc[0], acc[1].concat([a.symbol])]
                }
            }, [[],[]] as [string[][], string[]])
            if(rest.length > 0) {
                batches.push(rest)
            }
            console.log("[- batches --")
            console.log(JSON.stringify(batches))
            console.log("-- batches -]")
            const batchPromisses = batches.map(batch => {
                const symbols=batch.join(',')
                const uri = `v6/finance/quote?region=DE&lang=de&symbols=${encodeURIComponent(symbols)}`;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return api_request<YFinQuoteResponse>(apiKey, uri, abortController)
                        .then(response => response["quoteResponse"]["result"])
            })
            const res = Promise.all(
                 batchPromisses.flatMap(async (s) => {
                    return new Promise<YFinQuoteResult[]>((resolve, reject) => {
                        return s.then(
                            (success) => resolve(success),
                            (fail) => {
                                abortController?.abort()
                                reject(fail)
                            }
                        )
                })})
            ).then(result => {
                const res = result.flatMap(r => r)
                return res
            })
            return res
        })
        .catch(reason => {
            console.error(reason)
            throw new Error(reason)
        })
}
