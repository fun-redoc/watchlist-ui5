import History from "sap/ui/core/routing/History";
import AppComponent from "../Component";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import MessageToast from "sap/m/MessageToast";
import Event from "sap/ui/base/Event";
import WatchStock from "../types/Watch";
import { ChartParams, YFinChartResult, YFinQuoteResult } from "../types/yFinApiTypes";
import UI5Date from "sap/ui/core/date/UI5Date";
import BaseController from "./Base.controller";
import formatter from "../formatter";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import JSONModel from "sap/ui/model/json/JSONModel";
import { api_getChart } from "../services/yFinApiService";
import Log from "sap/base/Log";
import useCache from "../services/cacheService";

interface RoutParams {
    assetIdx:string
}
/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class AssetDetail extends BaseController {
    public formatter = formatter(this.getOwnerComponent()?.getModel("i18n") as ResourceModel)
    public onInit() {
            super.onInit()
            const router = (this.getOwnerComponent() as AppComponent).getRouter()
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const route = router.getRoute("assetdetail")
            if(route) {
                console.log("route matches", route)
            } else {
                console.warn("rout does not match", route)
            }
            const appComponent = this.getOwnerComponent() as AppComponent
            this.appComponent = appComponent
            //this.getView()?.setModel(appComponent.getModel("yFinSearchResult"), "yFinSearchResult")
            //this.getView()?.setModel(new JSONModel({}), "chart") // here we still dont know which chart, but we have to set the model to get rid of errror message
            route?.attachPatternMatched(this._onObjectMatched, this)
		}
        private _getChartWithCache = useCache<YFinChartResult, typeof api_getChart>(api_getChart, {timeOutMillis:60*60*1000});
		private _onObjectMatched(oEvent:Route$PatternMatchedEvent):void {
            console.log("in on Object matched")
			const view = this.getView()
            if(view) {
                console.log(oEvent)
                console.log(oEvent?.getParameter("arguments"))
                console.log((oEvent?.getParameter("arguments") as RoutParams).assetIdx)
                console.log("/" + window.decodeURIComponent((oEvent?.getParameter("arguments") as RoutParams).assetIdx))
                view.bindElement({
                    path: "/" + window.decodeURIComponent((oEvent?.getParameter("arguments") as RoutParams).assetIdx),
                    model: "yFinSearchResult"
                })
                Log.trace("setting chart model")
                const apiKey = this.appComponent.getApiKey()
                if(!apiKey) {
                    Log.error("no api key found")
                    this.getI18nResourceBundle()
                        .then(resourceBundle => {
                                const message = resourceBundle?.getText("noApiKeyProvidedMessage")
                                this.showErrorMessage(message)})
                } else {
                // TODO make Chartparams customizable via menu
                const chartParams:ChartParams = {range:"1y", interval:"1mo", event:"split"}
                const abortController = undefined // TODO, hot to appropriatelly use AbortController in ui5
                const symbol = view.getBindingContext("yFinSearchResult")?.getObject("symbol") as string | undefined
                if( symbol ) {
                    this._getChartWithCache([apiKey, symbol, chartParams, abortController])
                    //api_getChart(apiKey, symbol, chartParams, abortController )
                            .then(result => {
                                console.log("fetched data", result)
                                const chartRaw = 
                                    result.timestamp.map((timestamp: number, i: number) => {
                                        return {date:new Date(timestamp*1000),
                                                value:result.indicators.quote[0].close[i]} // prerequisite chart was fetched without "comparisons" parameter, beware!     
                                        })
                                view.setModel(new JSONModel(chartRaw), "chart")
                            })
                            .catch(reason => {
                                Log.error(reason)
                                this.getI18nResourceBundle()
                                    .then(resourceBundle => {
                                            const message = resourceBundle?.getText("genericUserErrorMessage")
                                            this.showErrorMessage(message)})
                            })
                    } else {
                        console.error("no symbol bound, cannot load chart.")
                        throw new Error("somtething wnt wrong. try again later.")
                    }
                } 
            } else {
                console.error("somtething wnt wrong. view is not bound. try again later.")
                throw new Error("somtething wnt wrong. try again later.")
            }
		}
        public onNavBack() {
			const oHistory = History.getInstance();
			const sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				const oRouter = (this.getOwnerComponent() as AppComponent).getRouter()
				oRouter.navTo("root",undefined, true);
			}
		}
        public onWatch(oControlEvent:Event) {
            const binding = this.getView()?.getElementBinding("yFinSearchResult")
            const path = binding?.getPath()
            const object:YFinQuoteResult|undefined = binding?.getModel()?.getObject(path || "") as YFinQuoteResult|undefined
            console.log("onWatch", path, object)
            if(object) {
                const watch:WatchStock = {
                    symbol:object.symbol,
                    name:object.shortName,
                    watchSince:UI5Date.getInstance()
                }
                this.appComponent.addToWatch(watch)
//                this.appComponent.getWatchDBM()
//                    .then(dbManager => {
//                        return dbManager.add(watch)
//                    })
                    .then(_ => {
                        this.getI18nResourceBundle()
                        .then(resourceBundle => {
                            const message = resourceBundle?.getText("stockAddedToWatchlist") || "stock added to watchlist."
                            MessageToast.show(message)
                        })
                    })
                    .catch(reason => {
                        console.error(reason)
                        this.getI18nResourceBundle()
                        .then(resourceBundle => {
                            const message = resourceBundle?.getText("genericUserErrorMessage")
                            this.showErrorMessage(message)
                        })
                    })
            } else {
                console.error("nothing to store, selected object is undefined.")
                //MessageBox.error("{i18n>genericUserErrorMessage}")
                this.getI18nResourceBundle()
                .then(resourceBundle => {
                    const message = resourceBundle?.getText("genericUserErrorMessage")
                    this.showErrorMessage(message)
                })
            }
        }
}