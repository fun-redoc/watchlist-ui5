import AppComponent from "../Component";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import BaseController from "./Base.controller";
import { DBManager, mkDBManager } from "../services/DBManager";
import { Input$SubmitEvent } from "sap/m/Input";
import { ListBase$ItemPressEvent } from "sap/m/ListBase";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import JSONModel from "sap/ui/model/json/JSONModel";
import TransactionEntry, { DB_NAME_TRANSACTIONS, DB_STORE_TRANSACTIONS, DB_VERSION_TRANSACTIONS } from "../types/TransactionEntry";
import { YFinQuoteResult } from "../types/yFinApiTypes";
import syncStyleClass from "sap/ui/core/syncStyleClass";


type WealthControllerModel = WealthAsset[]

interface WealthAsset {
    aggregations:WealthAggregations
    yFinData: YFinQuoteResult | undefined
}
interface WealthAggregations {
    symbol:string
    currency:string,
    amountInStock:number
    totalCostValue:number
    totalBuyFee:number
    totalSellFee:number
    totalYealdOnSold:number
    // TODO Total cost value on sold
    // introduce dividend yeald - maybe dividend yeald can be computed from yfin data??
}

interface TimeLineEvent {
    symbol:string
    date:Date
    transactions:TransactionEntry[]
    wealth:WealthAggregations
}

type Symbol = string
type TimeLine = Record<Symbol, TimeLineEvent[]>

interface RoutParams {
    assetIdx:string
}
interface QueryParam {
    query:string
}
/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class WealthController extends BaseController {
	private dbm:Promise<DBManager<TransactionEntry>>
    private static MODEL_NAME:string = "wealth"
//    private  i18nResourceBundle:ResourceBundle
//    private async getI18nResourceBundle():Promise<ResourceBundle | undefined> {
//        if(this.i18nResourceBundle) return this.i18nResourceBundle
//        const view = this.getView()
//        if(view) {
//            const i18nModel = view.getModel("i18n") as ResourceModel
//            this.i18nResourceBundle = await i18nModel.getResourceBundle()
//            return this.i18nResourceBundle
//        } else {
//            console.error("view not found.")
//        }
//    }		
    public async onInit() {
        super.onInit()

        const router = (this.getOwnerComponent() as AppComponent).getRouter()
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const route = router.getRoute("wealth")
        if(route) {
            console.log("route matches", route)
        } 
        //    const a1ppComponent = this.getOwnerComponent() as AppComponent
        //this.getView()?.setModel(this.appComponent.getModel("yFinSearchResult"), "yFinSearchResult")
        // TODO:refactor this code repeats in transaction controller, this is not good, refactor it
		this.dbm = mkDBManager<TransactionEntry>(DB_NAME_TRANSACTIONS, DB_STORE_TRANSACTIONS, DB_VERSION_TRANSACTIONS, [{indexName:"symbol",isUnique:false},{indexName:"buyOrSell", isUnique:false}])
        route?.attachPatternMatched(this._onRouteMatched, this)
    }

    private _loadAllTransactions() : Promise<TransactionEntry[]> {
		return this.dbm.then(dbm => dbm.list("symbol"))
    }
    private _computeTimeline(transactions:TransactionEntry[]) : TimeLine {
        /*
        1. sort transactions by date
        2. iterate through sorted transactions aggregating throu each day
        */
        // sort is mutating, I want to work with a copy
        let transactionsByDate = transactions.map(e => {return {...e}})
        transactionsByDate = transactions.sort((e1,e2) => Math.sign(e1.date.getTime() - e2.date.getTime()))
        const tl = transactionsByDate.reduce( (tl , t) => {
                    const lastTle = tl[t.symbol]?.at(-1) // shortcut for last element in array hopefully
                    let tle:TimeLineEvent
                    if(lastTle) {
                        if(lastTle.date === t.date) {
                            // work with the current time line event
                            tle = lastTle
                        } else {
                            // new event date, thus new timeline event
                            tle = {...lastTle,date:t.date, transactions:[], wealth:{...lastTle.wealth}}
                            if(! tl[t.symbol] ) {
                                tl[t.symbol] = [tle]
                            } else {
                                tl[t.symbol].push(tle)
                            }
                        }
                        // aggregate
                        switch(t.transaction) {
                            case "Buy" : {
                                    tle.transactions.push(t)
                                    tle.wealth.amountInStock += t.amount
                                    tle.wealth.totalCostValue += t.amount * t.price
                                    tle.wealth.totalBuyFee += t.fee
                            }
                            break
                            case "Sell": {
                                   tle.transactions.push(t)
                                   tle.wealth.amountInStock -= t.amount
                                   tle.wealth.totalCostValue -= t.amount * t.price
                                   tle.wealth.totalSellFee += t.fee
                                   tle.wealth.totalYealdOnSold += t.amount * t.price - t.fee
                            }
                            break
                        }
                    } else {
                        switch(t.transaction) {
                            case "Buy" : {
                                tle = {
                                    symbol:t.symbol,
                                    date:t.date,
                                    transactions:[t],
                                    wealth:{
                                        symbol:t.symbol,
                                        currency:t.currency,
                                        amountInStock: t.amount,
                                        totalCostValue: t.amount * t.price,
                                        totalBuyFee:t.fee,
                                        totalSellFee:0.0,
                                        totalYealdOnSold:0.0,
                                    }
                                }
                            }
                            break
                            case "Sell": {
                                tle = {
                                    symbol:t.symbol,
                                    date:t.date,
                                    transactions:[t],
                                    wealth:{
                                        symbol:t.symbol,
                                        currency:t.currency,
                                        amountInStock: -t.amount,
                                        totalCostValue: -t.amount * t.price,
                                        totalBuyFee:0.0,
                                        totalSellFee:t.fee,
                                        totalYealdOnSold:t.amount * t.price - t.fee,
                                    }
                                }
                            }
                            break
                        }
                        if(! tl[t.symbol] ) {
                            tl[t.symbol] = [tle]
                        } else {
                            tl[t.symbol].push(tle)
                        }
                    }
                    return tl
                }
                , {} as TimeLine)

        return tl
    }

    private _onRouteMatched(oEvent:Route$PatternMatchedEvent):void {
			const view = this.getView()
            if(view) {
                // TODO, it will turn out, that new transactions arent shown property without
                //       reload. 2 Solutions 1) implement as managed model on component level
                //                           2) implement signaling view component
                //                           Fallback) refresh button (allways a good idea)
                this._loadAllTransactions()
                    .then(transactions => {
                        // compute aggregations
                        const timeLine = this._computeTimeline(transactions)
                        const aggregations:WealthAggregations[] = Object.values(timeLine).map(tles=> {
                            const lastTle = tles.at(-1)
                            return lastTle?.wealth
                        })
                        .filter(a=>a) as WealthAggregations[] //filtering makes sure that undefined entries disaear
                        const model:WealthAsset[] = aggregations.map(a => {return {aggregations: a, yFinData:undefined}})
                        view.setModel(new JSONModel(model), WealthController.MODEL_NAME)
                        return model
                    })
                    .then(model => {
                        // ask the yFinQuery Pool of the Componen for current course data
                        // the coourse data can then be bound to model yFinPool
                        setTimeout(async () => {
                            await this.appComponent.addToYFinPool(model.map(v => v.aggregations.symbol), "wealth");
                            const yfp = await this.appComponent.getYFinPool();
                            model.forEach(e => {
                                e.yFinData = yfp[e.aggregations.symbol];
                            });
                            console.log("setting model to", model)
                            view.setModel(new JSONModel(model), WealthController.MODEL_NAME)
                        })
                    })
                    .catch(reason => {
                        console.error(reason)
                        throw new Error("somtething wnt wrong. try again later.")
                        // TODO:errorhandling showg error,  i18n error
                    })

//                console.log(oEvent)
//                console.log(oEvent?.getParameter("arguments"))
//                console.log((oEvent?.getParameter("arguments") as RoutParams).assetIdx)
//                console.log("/" + window.decodeURIComponent((oEvent?.getParameter("arguments") as RoutParams).assetIdx))
//                view.bindElement({
//                    path: "/" + window.decodeURIComponent((oEvent?.getParameter("arguments") as RoutParams).assetIdx),
//                    model: "yFinSearchResult"
//                })
            } else {
                console.error("somtething wnt wrong. view is not bound. try again later.")
                throw new Error("somtething wnt wrong. try again later.")
                // TODO:errorhandling showg error,  i18n error
            }
    }


//    // TODO Filter does not work seemingly
//    public onFilter(e:Input$SubmitEvent) {
//        console.log("onFitler", e)
//        const aFilter = [];
//        // there is something wrong with the type defition of getParameter<never>)
//        const queryParam = (e.getParameters() as QueryParam).query
//        console.log("onFitler", queryParam)
//        if (queryParam) {
//            aFilter.push(new Filter("Symbol", FilterOperator.Contains, queryParam));
//        }
//
//        // filter binding
//        const oList = this.getView()?.byId("transactionList")
//        // there is something strange with the Binding type, it has no filter method but all documentation an example use it
//        // so i have to force js duck typing to go ahead, maybe there is a better solution // TODO
//        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
//        const oBinding = oList?.getBinding("items") as any
//        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
//        oBinding?.filter(aFilter)
//    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onPress(e:ListBase$ItemPressEvent) {
        console.log("Wealth.controller.onPress")
        const provider = e.getSource()
        const bindingContext = provider.getBindingContext(WealthController.MODEL_NAME)
        const path = bindingContext?.getPath()
        const transactionPath =  path?.substring(1) // get rid of trailing slash
        const yFinData = bindingContext?.getObject("aggregations") as YFinQuoteResult
        const symbol = yFinData.symbol
        const ownerComponent = this.getOwnerComponent() as AppComponent
        const router = ownerComponent.getRouter()
        if(router && symbol) {
            router.navTo("transactionBuy", {symbol:symbol})
        } else {
            throw new Error("something wrong happened. try again later")
        }
//			const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
//			oRouter.navTo("detail");
    }
}