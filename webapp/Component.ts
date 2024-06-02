import UIComponent from "sap/ui/core/UIComponent";
import { DBManager, mkDBManager } from "./services/DBManager";
import ManagedObjectModel from "sap/ui/model/base/ManagedObjectModel";
import WatchStock from "./types/Watch";
import ManagedObject from "sap/ui/base/ManagedObject";
import { MetadataOptions as ComponentMetadataOptions } from "sap/ui/core/Component";
import MOWatchStock from "./managedobject/MOWatchStock"
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import { api_getAssetBatch } from "./services/yFinApiService";
import useCache from "./services/cacheService";
import { YFinQuoteResult } from "./types/yFinApiTypes";

export const DB_NAME_WATCHLIST = "watchlistUI5DB"
export const DB_STORE_WATCHLIST = "watchlistUI5Store"
export const DB_VERSION_WATCHLIST = 2 



/**
 * @namespace rsh.watchlist.ui5
 */
export default class AppComponent extends UIComponent {
	static API_KEY_STORAGE_ID = "apiKeyInput"
	public static readonly metadata:ComponentMetadataOptions = {
		manifest: "json",
		aggregations: {
			"watchlist": {
				type: "rsh.watchlist.ui5.managedobject.MOWatchStock",
				singularName:"watchstock",
				multiple:true,
				bindable:true
			}
		},
		defaultAggregation: "watchlist",
	}
	private apiKey:string|null
	private dbm:Promise<DBManager<WatchStock>>
    private  i18nResourceBundle:Promise<ResourceBundle> | ResourceBundle

    protected async getI18nResourceBundle():Promise<ResourceBundle | undefined> {
        if(this.i18nResourceBundle) return this.i18nResourceBundle
		const i18nModel = this.getModel("i18n") as ResourceModel
		this.i18nResourceBundle = i18nModel.getResourceBundle()
		return this.i18nResourceBundle
    }

	public async init()  {
		super.init();
		// set data model, if a component model is needed.
        //const oData = { recipient : { name : "World and Universe." },
								//				list: ["Element 1", "Element 2", "Element 3", "Element 4"]
								//			 } as Recipient
        //const oModel = new JSONModel(oData);
        //this.setModel(oModel);
		this.setModel(new ManagedObjectModel(this), "component")
		this.getModel("component")?.setDefaultBindingMode("TwoWay") // TODO?? is this correct??

		// create the views based on the url/hash
		this.getRouter().initialize();
		this.apiKey =  localStorage.getItem(AppComponent.API_KEY_STORAGE_ID)

		this.loadWatchlistFromIndexDB()

	}
	public destroy(bSuppressInvalidate?: boolean | undefined): void {
		console.log("AppComonent destroy")
	}
	public onDeactivate(): void {
		console.log("AppComonent onDeactivate")
	}
	public onActivate(): void {
		console.log("AppComonent onActivate")
	}
	public saveApiKey(apiKey:string) {
		this.apiKey
		localStorage.setItem(AppComponent.API_KEY_STORAGE_ID, apiKey)
	}
	public getApiKey():string|null {
		return this.apiKey
	}
	public async getWatchDBM():Promise<DBManager<WatchStock>> {
		return await this.dbm
	}
	private async loadWatchlistFromIndexDB():Promise<void> {
		// connect to Browsers IndexDb for Watchlist
		this.destroyAggregation("component", true)
		const me = this
		this.dbm = mkDBManager<WatchStock>(DB_NAME_WATCHLIST, DB_STORE_WATCHLIST, DB_VERSION_WATCHLIST, [{indexName:"symbol",isUnique:true}])
		this.dbm
		.then(dbm => dbm.list())
		.then(list => {
			list.map(e => {
				const mo = new MOWatchStock()
				mo.setProperty("symbol",e.symbol) 
				mo.setProperty("name",e.name)
				mo.setAggregation("watchSince",e.watchSince)
				me.addAggregation("watchlist", mo)
			})
			//this.getModel("component")?.refresh()
			console.log("read compont model")
		})
		this.getModel("component")?.refresh()
	}
	public async addToWatch(watch:WatchStock): Promise<void> {
		try {
			const dbManager = await this.getWatchDBM()
			const _= await dbManager.add(watch)
			const mo = new MOWatchStock() // found no way to create a ManagedObject as propoer typescript class
			mo.setProperty("symbol",watch.symbol) 
			mo.setProperty("name",watch.name)
			mo.setAggregation("watchSince",watch.watchSince)
			this.addAggregation("watchlist", mo)
			this.getModel("component")?.refresh()
		} catch(err) {
			console.error(err)
			return new Promise((_,reject) => reject(err))
		}
    }
	public async refreshWatchlistMarketData():Promise<void> {
		interface SymbolMOMap {[symbol:string]:ManagedObject}
		if(this.apiKey) {
			const watched = this.getWatchlist()
			const symbolsToMO:SymbolMOMap = watched.reduce((acc, mo) =>  {
				const symbol = mo.getProperty("symbol") as string
				acc[symbol] = mo
				return acc
			}, {} as SymbolMOMap) // maybe use Map<T,S> or Record<T,S>
			const symbolsToFetch = Object.keys(symbolsToMO)
			const fetchBatchApi = api_getAssetBatch(this.apiKey)
			const fetchBatchApiFn = fetchBatchApi.fetchBatch
			const fetchBatchApiFnCached = useCache<YFinQuoteResult[], typeof fetchBatchApiFn>(fetchBatchApiFn, {timeOutMillis:1000*60*5})
			for(var start = 0; start < symbolsToFetch.length; ) {
				const bachEnd = Math.min(symbolsToFetch.length, start+fetchBatchApi.MAX_BATCH_SIZE)
				const batch = symbolsToFetch.slice(start, bachEnd)
				start = bachEnd
				fetchBatchApi.fetchBatch(batch,undefined) // TODO use abort controller to abort api call in case of premature leaving view 
				//fetchBatchApiFnCached([batch,undefined]) // TODO use abort controller to abort api call in case of premature leaving view 
					.then( quotes => {
						quotes.forEach(quote => {
							const mo = symbolsToMO[quote.symbol]
							if(mo) {
								this.updateFromQuote(mo, quote)
//								mo.setProperty("regularMarketPrice", quote.regularMarketPrice)
//								mo.setProperty("currency", quote.currency)
//								mo.setProperty("quoteType", quote.quoteType)
//								mo.setProperty("ask", quote.ask)
//								mo.setProperty("bid", quote.bid)
//								mo.setProperty("averageDailyVolume10Day", quote.averageDailyVolume10Day)
							} else {
								console.warn(`no watch managed object found for ${quote.symbol}`)
							}
						})
					})
			}
		}
	}
	public updateFromQuote(mo:ManagedObject,quote:YFinQuoteResult) : void {
		const propertyMap = mo.getMetadata().getAllProperties()
		const propertyNames = Object.keys(propertyMap)
		const anyQuote:any = quote // trick TypeScript 
		propertyNames.forEach(name => {
			if(anyQuote[name]) {
				mo.setProperty(name, anyQuote[name])
			}
		})
	}
	public getWatchlist() : ManagedObject[] {
		return this.getAggregation("watchlist") as ManagedObject[]
	}
}
