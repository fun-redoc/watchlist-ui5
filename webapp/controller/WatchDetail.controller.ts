import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import BaseController from "./Base.controller";
import ManagedObject from "sap/ui/base/ManagedObject";
import ManagedObjectModel from "sap/ui/model/base/ManagedObjectModel";
import { api_getAssetBatch } from "../services/yFinApiService";
import { YFinQuoteResult } from "../types/yFinApiTypes";
import useCache from "../services/cacheService";
import MessageToast from "sap/m/MessageToast";
import { Button$PressEvent } from "sap/m/Button";

interface RoutParams {
    assetIdx:string
}
/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class WatchDetail extends BaseController {
		public onInit() {
            super.onInit()
            if(this.appComponent) {
                const router = this.appComponent.getRouter()
                // eslint-disable-next-line @typescript-eslint/unbound-method
                const route = router.getRoute("watchdetail")
                if(route) {
                    console.log("route matches", route)
                } else {
                    console.warn("rout does not match", route)
                }
                route?.attachPatternMatched(this.onRouteMatched, this)
            }
		}
		private onRouteMatched(oEvent:Route$PatternMatchedEvent):void {
            console.log("in on Object matched")
			const view = this.getView()
            if(view) {
                view.bindElement({
                    path: "/watchlist/" + window.decodeURIComponent((oEvent?.getParameter("arguments") as RoutParams).assetIdx),
                    model: "component"
                })
            } else {
                console.error("somtething wnt wrong. view is not bound. try again later.")
                throw new Error("somtething wnt wrong. try again later.")
            }
		}
        public async onRefresh() {
            // the easiest way wold be to refresh the complete model
            // the smarter way refresh only bound element
            // TODO Test Error handling
            if(!this.appComponent) {
                console.error("somtething wnt wrong. appComponent is not set.")
                throw new Error("somtething wnt wrong. try again later.")
            }
            const apiKey = this.appComponent.getProperty("apiKey")
            if(!apiKey) {
                console.error("somtething wnt wrong. apiKey is not set.")
                // TODO i18n make i18n
                this.showErrorMessage("Please Check API Key is set properly in the Settings View")
                return
            }
			const view = this.getView()
            const mo = view?.getElementBinding("component")?.getBoundContext()?.getObject() as ManagedObject
            if(mo) {
                const doUseCache = this.appComponent.getProperty("useCache")
                console.log("DO USE CACHE", doUseCache)
                const fetchBatchApi = api_getAssetBatch(apiKey)
                const fetchBatchApiFn = fetchBatchApi.fetchBatch
                const fetchBatchApiFnCached = useCache<YFinQuoteResult[], typeof fetchBatchApiFn>(fetchBatchApiFn, {timeOutMillis:this.appComponent.getProperty("cacheInterval")})
                const batch = [mo.getProperty("symbol")]
                const apiCall = !doUseCache ? fetchBatchApi.fetchBatch(batch,undefined) // TODO use abort controller to abort api call in case of premature leaving view 
                                            : fetchBatchApiFnCached([batch,undefined]) // TODO use abort controller to abort api call in case of premature leaving view 
                apiCall
                    .then( quotes => {
                            switch (quotes.length) {
                            case 0:
                                this.getI18nResourceBundle()
                                    .then(rb => {
                                        const msg = rb?.getText("problemFetchingDataResultNothingRefrehed") || "The result may be not reliable, there was a problem while fetching remote api."
                                        this.showErrorMessage(msg)
                                    })
                                break;
                            case 1:
                                this.appComponent.updateFromQuote(mo,quotes[0])
                                this.getI18nResourceBundle()
                                .then(resourceBundle => {
                                    const message = resourceBundle?.getText("successfullyRefreshed") || "Refreshed successfully."
                                    MessageToast.show(message)
                                })
                                break;
                            default:
                                this.appComponent.updateFromQuote(mo,quotes[0])
                                this.getI18nResourceBundle()
                                    .then(rb => {
                                        const msg = rb?.getText("problemFetchingDataResoultMaybeNotReliable") || "The rusult may be not reliable, there was a problem while fetching remote api."
                                        this.showErrorMessage(msg)
                                    })
                                break;
                            }
                        })
                }
                //mo.setProperty("ask", 4711.0815) // testing
        }
        private _getBoundOubjectFromModel():ManagedObject|undefined {
            const binding = this.getView()?.getElementBinding("component")
            const path = binding?.getPath()
            const object:ManagedObject|undefined = binding?.getModel()?.getObject(path || "") as ManagedObject|undefined
            return object
        }
        public onBuy(e:Button$PressEvent) {
            const object = this._getBoundOubjectFromModel()
            console.log("onBuy", object)
            if(object) {
                this.onNavigate("transactionBuy", e, {symbol:object.getProperty("symbol")})
            } else {
                this.getI18nResourceBundle()
                    .then(rb => 
                        MessageToast.show(rb?.getText("genericUserErrorMessage") || "An error happened, try again later")
                    )
            }
        }
}