"use strict";

sap.ui.define(["sap/ui/core/UIComponent", "./services/DBManager", "sap/ui/model/base/ManagedObjectModel", "./managedobject/MOWatchStock", "./services/yFinApiService", "./services/cacheService", "sap/ui/Device"], function (UIComponent, ___services_DBManager, ManagedObjectModel, __MOWatchStock, ___services_yFinApiService, __useCache, Device) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const mkDBManager = ___services_DBManager["mkDBManager"];
  const MOWatchStock = _interopRequireDefault(__MOWatchStock);
  const api_getAssetBatch = ___services_yFinApiService["api_getAssetBatch"];
  const useCache = _interopRequireDefault(__useCache);
  const DB_NAME_WATCHLIST = "watchlistUI5DB";
  const DB_STORE_WATCHLIST = "watchlistUI5Store";
  const DB_VERSION_WATCHLIST = 2;
  /**
   * @namespace rsh.watchlist.ui5
   */
  const AppComponent = UIComponent.extend("rsh.watchlist.ui5.AppComponent", {
    constructor: function constructor() {
      UIComponent.prototype.constructor.apply(this, arguments);
      this.yFinPool = new Promise(resolve => resolve({}));
    },
    metadata: {
      manifest: "json",
      aggregations: {
        watchlist: {
          type: "rsh.watchlist.ui5.managedobject.MOWatchStock",
          singularName: "watchstock",
          multiple: true,
          bindable: true
        }
      },
      properties: {
        deviceType: {
          type: "string",
          bindable: true,
          defaultValue: "Phone",
          visibility: "public"
        },
        deviceIsNotTouch: {
          type: "boolean",
          bindable: true,
          defaultValue: false,
          visibility: "public"
        },
        deviceIsTouch: {
          type: "boolean",
          bindable: true,
          defaultValue: false,
          visibility: "public"
        },
        apiKey: {
          type: "string",
          bindable: true,
          defaultValue: "",
          visibility: "public"
        },
        useCache: {
          type: "boolean",
          bindable: true,
          defaultValue: false,
          visibility: "public"
        },
        cacheInterval: {
          type: "sap.ui.model.type.Integer",
          bindable: true,
          defaultValue: 15,
          visibility: "public"
        }
      },
      defaultAggregation: "watchlist"
    },
    getI18nResourceBundle: async function _getI18nResourceBundle() {
      if (this.i18nResourceBundle) return this.i18nResourceBundle;
      const i18nModel = this.getModel("i18n");
      this.i18nResourceBundle = i18nModel.getResourceBundle();
      return this.i18nResourceBundle;
    },
    init: function _init() {
      UIComponent.prototype.init.call(this);
      this.setModel(new ManagedObjectModel(this), "component");
      this.getModel("component")?.setDefaultBindingMode("TwoWay");
      const model = this.getModel("component");
      model.setProperty("/deviceType", Device.media.getCurrentRange("Std").name);
      model.setProperty("/deviceIsTouch", Device.support.touch);
      model.setProperty("/deviceIsNotTouch", !Device.support.touch);

      // create the views based on the url/hash
      this.getRouter().initialize();
      this.loadSettings();
      this.loadWatchlistFromIndexDB();
    },
    destroy: function _destroy(bSuppressInvalidate) {
      console.log("AppComonent destroy");
    },
    onDeactivate: function _onDeactivate() {
      console.log("AppComonent onDeactivate");
    },
    onActivate: function _onActivate() {
      console.log("AppComonent onActivate");
    },
    saveSettings: function _saveSettings(apiKey, useCache, cacheInterval) {
      const model = this.getModel("component");
      model.setProperty("/apiKey", apiKey);
      model.setProperty("/useCache", useCache);
      if (cacheInterval) {
        model.setProperty("/cacheInterval", cacheInterval);
      }
      setTimeout(() => {
        localStorage.setItem(AppComponent.API_KEY_STORAGE_ID, apiKey);
        localStorage.setItem(AppComponent.USE_CACHE_STORAGE_ID, `${useCache}`);
        if (cacheInterval) {
          localStorage.setItem(AppComponent.CACHE_INTERVAL_STORAGE_ID, `${cacheInterval}`);
        }
      });
    },
    loadSettings: function _loadSettings() {
      const apiKey = localStorage.getItem(AppComponent.API_KEY_STORAGE_ID);
      const useCacheString = localStorage.getItem(AppComponent.USE_CACHE_STORAGE_ID);
      const useCache = useCacheString === "true";
      const cacheIntervalString = localStorage.getItem(AppComponent.CACHE_INTERVAL_STORAGE_ID);
      const cacheInterval = Number.parseInt(cacheIntervalString);
      const model = this.getModel("component");
      model.setProperty("/apiKey", apiKey);
      model.setProperty("/useCache", useCache);
      if (cacheInterval) {
        // otherwiese take default
        model.setProperty("/cacheInterval", cacheInterval);
      }
    },
    getWatchDBM: async function _getWatchDBM() {
      return await this.dbm;
    },
    loadWatchlistFromIndexDB: async function _loadWatchlistFromIndexDB() {
      // connect to Browsers IndexDb for Watchlist
      this.destroyAggregation("component", true);
      const me = this;
      this.dbm = mkDBManager(DB_NAME_WATCHLIST, DB_STORE_WATCHLIST, DB_VERSION_WATCHLIST, [{
        indexName: "symbol",
        isUnique: true
      }]);
      this.dbm.then(dbm => dbm.list()).then(list => {
        list.map(e => {
          const mo = new MOWatchStock();
          mo.setProperty("symbol", e.symbol);
          mo.setProperty("name", e.name);
          mo.setAggregation("watchSince", e.watchSince);
          me.addAggregation("watchlist", mo);
        });
        //this.getModel("component")?.refresh()
      });
      this.getModel("component")?.refresh();
    },
    isAlreadyWatched: function _isAlreadyWatched(watch) {
      const xs = this.getAggregation("watchlist") || [];
      return xs.find(x => x.getProperty("symbol") === watch.symbol) !== undefined;
    },
    addToWatch: async function _addToWatch(watch) {
      if (!this.isAlreadyWatched(watch)) {
        try {
          const dbManager = await this.getWatchDBM();
          const _ = await dbManager.add(watch);
          const mo = new MOWatchStock(); // found no way to create a ManagedObject as proper typescript class
          mo.setProperty("symbol", watch.symbol);
          mo.setProperty("name", watch.name);
          mo.setAggregation("watchSince", watch.watchSince);
          this.addAggregation("watchlist", mo);
          this.getModel("component")?.refresh();
        } catch (err) {
          console.error(err);
          return new Promise((_, reject) => reject(err));
        }
      }
    },
    addToYFinPool: async function _addToYFinPool(symbol, filter) {
      const newYFP = this.yFinPool.then(yfp => {
        symbol.forEach(s => {
          if (s) {
            if (!yfp[s]) {
              // symbol not yet in pool
              yfp[s] = {
                filter: [filter]
              };
            } else {
              if (!yfp[s].filter) {
                yfp[s] = {
                  filter: [filter]
                };
              } else {
                // symbol already in pool, only adjust usage filter
                yfp[s].filter.push(filter);
              }
            }
          }
        });
        return yfp;
      });
      this.yFinPool = newYFP;
      await this.refreshYFinPool();
    },
    getYFinPool: function _getYFinPool() {
      return this.yFinPool;
    },
    refreshYFinPool: async function _refreshYFinPool() {
      const apiKey = this.getProperty("apiKey");
      if (!apiKey) {
        return;
      }
      const yfp = await this.yFinPool;
      const symbolsToFetch = Object.keys(yfp);
      // retain filters
      const filters = Object.values(yfp).reduce((acc, o) => {
        acc[o.symbol] = o.filter;
        return acc;
      }, {});
      console.log("symbolsToFetch=", symbolsToFetch);
      const yFinQuoteResults = await this.fetchFromYFin(symbolsToFetch);
      const newYfp = yFinQuoteResults.reduce((acc, r) => {
        acc[r.symbol] = {
          ...r,
          filter: filters[r.symbol]
        }; // update and restore retained filter
        return acc;
      }, {});
      this.yFinPool = new Promise(resolve => resolve(newYfp));
    },
    fetchFromYFin: async function _fetchFromYFin(symbolsToFetch) {
      const apiKey = this.getProperty("apiKey");
      const doUseCache = this.getProperty("useCache");
      const cacheInterval = this.getProperty("cacheInterval");
      if (!apiKey) {
        return [];
      }
      if (doUseCache) {
        console.log("Component:fetchFromYFin:doUseCache:", doUseCache);
        console.log("Component:fetchFromYFin:cacheInterval:", cacheInterval);
        const fetchBatchApi = api_getAssetBatch(apiKey);
        const fetchBatchApiFn = fetchBatchApi.fetchBatch;
        const fetchBatchApiFnCached = useCache(fetchBatchApiFn, {
          timeOutMillis: cacheInterval
        });
        let result = [];
        for (var start = 0; start < symbolsToFetch.length;) {
          const bachEnd = Math.min(symbolsToFetch.length, start + fetchBatchApi.MAX_BATCH_SIZE);
          const batch = symbolsToFetch.slice(start, bachEnd);
          start = bachEnd;
          //fetchBatchApi.fetchBatch(batch,undefined) // TODO use abort controller to abort api call in case of premature leaving view
          let quoteResults = await fetchBatchApiFnCached([batch, undefined]); // TODO use abort controller to abort api call in case of premature leaving view
          result = result.concat(quoteResults);
        }
        return result;
      } else {
        console.log("Component:fetchFromYFin:doUseCache:", doUseCache);
        const fetchBatchApi = api_getAssetBatch(apiKey);
        //const fetchBatchApiFn = fetchBatchApi.fetchBatch
        //const fetchBatchApiFnCached = useCache<YFinQuoteResult[], typeof fetchBatchApiFn>(fetchBatchApiFn, {timeOutMillis:cacheInterval})
        let result = [];
        for (var start = 0; start < symbolsToFetch.length;) {
          const bachEnd = Math.min(symbolsToFetch.length, start + fetchBatchApi.MAX_BATCH_SIZE);
          const batch = symbolsToFetch.slice(start, bachEnd);
          start = bachEnd;
          let quoteResults = await fetchBatchApi.fetchBatch(batch, undefined); // TODO use abort controller to abort api call in case of premature leaving view
          //let quoteResults = await fetchBatchApiFnCached([batch,undefined]) // TODO use abort controller to abort api call in case of premature leaving view
          result = result.concat(quoteResults);
        }
        return result;
      }
    },
    refreshWatchlistMarketData: async function _refreshWatchlistMarketData() {
      const apiKey = this.getProperty("apiKey");
      if (apiKey) {
        const watched = this.getWatchlist();
        const symbolsToMO = watched.reduce((acc, mo) => {
          const symbol = mo.getProperty("symbol");
          acc[symbol] = mo;
          return acc;
        }, {}); // maybe use Map<T,S> or Record<T,S>
        const symbolsToFetch = Object.keys(symbolsToMO);
        const fetchBatchApi = api_getAssetBatch(apiKey);
        const fetchBatchApiFn = fetchBatchApi.fetchBatch;
        const fetchBatchApiFnCached = useCache(fetchBatchApiFn, {
          timeOutMillis: 1000 * 60 * 5
        });
        for (var start = 0; start < symbolsToFetch.length;) {
          const bachEnd = Math.min(symbolsToFetch.length, start + fetchBatchApi.MAX_BATCH_SIZE);
          const batch = symbolsToFetch.slice(start, bachEnd);
          start = bachEnd;
          fetchBatchApi.fetchBatch(batch, undefined) // TODO use abort controller to abort api call in case of premature leaving view
          //fetchBatchApiFnCached([batch,undefined]) // TODO use abort controller to abort api call in case of premature leaving view
          .then(quotes => {
            quotes.forEach(quote => {
              const mo = symbolsToMO[quote.symbol];
              if (mo) {
                this.updateFromQuote(mo, quote);
              } else {
                console.warn(`no watch managed object found for ${quote.symbol}`);
              }
            });
          });
        }
      }
    },
    updateFromQuote: function _updateFromQuote(mo, quote) {
      const propertyMap = mo.getMetadata().getAllProperties();
      const propertyNames = Object.keys(propertyMap);
      const anyQuote = quote; // trick TypeScript
      propertyNames.forEach(name => {
        if (anyQuote[name]) {
          mo.setProperty(name, anyQuote[name]);
        }
      });
    },
    getWatchlist: function _getWatchlist() {
      return this.getAggregation("watchlist");
    }
  });
  AppComponent.API_KEY_STORAGE_ID = "apiKeyInput";
  AppComponent.USE_CACHE_STORAGE_ID = "useCache";
  AppComponent.CACHE_INTERVAL_STORAGE_ID = "cacheInterval";
  AppComponent.DB_NAME_WATCHLIST = DB_NAME_WATCHLIST;
  AppComponent.DB_STORE_WATCHLIST = DB_STORE_WATCHLIST;
  AppComponent.DB_VERSION_WATCHLIST = DB_VERSION_WATCHLIST;
  return AppComponent;
});