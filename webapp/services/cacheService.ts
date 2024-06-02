/* eslint-disable @typescript-eslint/no-explicit-any */

const DB_NAME_CACHE = "cacheDB";
const DB_VERSION_CACHE = 1;

// usage: 
//         const getDAtailsWithCache = useCache<YFinQuoteResult, typeof getDetails>(getDetails);


export default function useCache<RT, FT extends (...args: any) => Promise<RT>>(f:FT,
  cacheParams: { timeOutMillis: number } = { timeOutMillis: 10000}) {
    return ((params:Parameters<FT>) => doCache<RT, FT>(f, params, cacheParams))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function doCache<RT, FT extends (...args: any) => Promise<RT>>(
  f: FT,
  params: Parameters<FT>,
  cacheParams: { timeOutMillis: number } = { timeOutMillis: 10000},
): Promise<RT> {
  const jsonParams = JSON.stringify(params)
  return new Promise<RT>((resolve, reject) => {
    const requestDB = window.indexedDB.open(DB_NAME_CACHE, DB_VERSION_CACHE);
    requestDB.onupgradeneeded = () => {
      const db = requestDB.result;
      db.createObjectStore("cache", { keyPath: "key" });
    };
    requestDB.onsuccess = () => {
      const db = requestDB.result;
      const transaction = db.transaction(["cache"], "readonly");
      const objectStore = transaction.objectStore("cache");
      const request = objectStore.get(jsonParams);
      request.onsuccess = async () => {
        const result = request.result;
        if (result) {
          if (Date.now() - result.time < cacheParams.timeOutMillis) {
            console.info("Data fetched from cache", Date.now(), result.time, Date.now() - result.time, cacheParams.timeOutMillis)
            resolve( result.value as RT)
            return
          }
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const promise = f(...params);
        return promise
          .catch(reason => {
            console.error("Failed to fatch value, with reason:", reason)
            reject(reason)
          })
          .then(value => {
            if(value) {
              const transactionWrite = db.transaction(["cache"], "readwrite");
              const objectStoreWrtie = transactionWrite.objectStore("cache");
              const requestPut = objectStoreWrtie.put({ value: value, time: Date.now(), key: jsonParams });
              transactionWrite.commit()
              requestPut.onerror = ()=> {console.error(requestPut.error)}
              requestPut.onsuccess = ()=> {console.info("Data stored in cache.")}
              resolve(value)
            } else {
              reject("no result fetched")
            } 
          })
      };
      request.onerror = () => {
        console.error("No cache available, error:", request.error);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        f(...params)
        .catch(reason=>reject(reason))
        .then(result=> {
                          if(result) {
                            resolve(result)
                          } else {
                            reject("no result fetched")
                          } 
                        })
      };
    };
    requestDB.onerror = () => {
      console.error("No cache DB available, error:", requestDB.error);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      f(...params)
        .catch(reason=>reject(reason))
        .then(result=> {
                          if(result) {
                            resolve(result)
                          } else {
                            reject("no result fetched")
                          } 
                        })
    };
  })
}