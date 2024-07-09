import AppComponent from "../Component";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { Input$SubmitEvent } from "sap/m/Input";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import { ListBase$ItemPressEvent } from "sap/m/ListBase";
import BaseController from "./Base.controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import { DBManager, mkDBManager } from "../services/DBManager";
import TransactionEntry, { DB_NAME_TRANSACTIONS, DB_STORE_TRANSACTIONS, DB_VERSION_TRANSACTIONS } from "../types/TransactionEntry";
import parseCsv from "../services/parseCsv";
import accessTransactionsDB from "../services/transactionsDB";
import { FileUploader$ChangeEvent } from "sap/ui/unified/FileUploader";
import Context from "sap/ui/model/Context";
import GroupHeaderListItem from "sap/m/GroupHeaderListItem";

interface RoutParams {
    assetIdx:string
}
interface QueryParam {
    query:string
}
/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class TransactionsController extends BaseController {
	private dbm:Promise<DBManager<TransactionEntry>>
    private static MODEL_NAME:string = "transactions"
    public onInit() {
        super.onInit()

        const router = (this.getOwnerComponent() as AppComponent).getRouter()
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const route = router.getRoute("transactions")
        if(route) {
            console.log("route matches", route)
        } 
		//this.dbm = mkDBManager<TransactionEntry>(DB_NAME_TRANSACTIONS, DB_STORE_TRANSACTIONS, DB_VERSION_TRANSACTIONS, [{indexName:"symbol",isUnique:false},{indexName:"buyOrSell", isUnique:false}])
		this.dbm = accessTransactionsDB()
        route?.attachPatternMatched(this._onRouteMatched, this)
    }

    private _onRouteMatched(oEvent:Route$PatternMatchedEvent):void {
        const view = this.getView()
        if(view) {
            this.dbm.then(db => {
                return db.list("symbol")
            })
            .then(ts => {
                view.setModel(new JSONModel(ts), TransactionsController.MODEL_NAME)
            })
            .catch(reason => {
                console.error(reason)
                this.showErrorMessageWithFallback("FailedToLoadTransactions", "Transactions could not be loaded, try again later.")
            })
        }
    }

    // moved to formatters.ts
//    public async formatKind(kind:string): Promise<string> {
//        // the formater seems to be called even bevore onInit fires!!!
//        const rb = await this.getI18nResourceBundle()
//        switch(kind) {
//            case "S": 
//                return rb?.getText("sell") || `(${kind})`
//            case "B": 
//                return rb?.getText("buy") || `(${kind})`
//            default: return kind
//        }
//    }
//
    //  Filter does not work seemingly
    public onFilter(e:Input$SubmitEvent) {
        console.log("onFitler", e)
        const aFilter = [];
        // there is something wrong with the type defition of getParameter<never>)
        const queryParam = (e.getParameters() as QueryParam).query
        console.log("onFitler", queryParam)
        if (queryParam) {
            aFilter.push(new Filter("Symbol", FilterOperator.Contains, queryParam));
        }

        // filter binding
        const oList = this.getView()?.byId("transactionList")
        // there is something strange with the Binding type, it has no filter method but all documentation an example use it
        // so i have to force js duck typing to go ahead, maybe there is a better solution // 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const oBinding = oList?.getBinding("items") as any
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        oBinding?.filter(aFilter)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onPress(e:ListBase$ItemPressEvent) {
        const provider = e.getSource()
        const bindingContext = provider.getBindingContext("transactions")
        const path = bindingContext?.getPath()
        const transactionPath =  path?.substring(1) // get rid of trailing slash
        console.log("PAth:", path, "Transactions Path:", transactionPath)
        const ownerComponent = this.getOwnerComponent() as AppComponent
        const router = ownerComponent.getRouter()
        if(router && transactionPath) {
            router.navTo("transactiondetail", {transactionPath:transactionPath})
        } else {
            throw new Error("something wrong happened. try again later")
        }
    }

    private formatCurency(amt:number, cur?:string) {
        const cur1 = cur || "XXX" // XXX is no currency according to https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes
        const language = navigator.language
        const fmtedAmt =  new Intl.NumberFormat(language, { style: 'currency', currency: cur1 }).format(amt);
        return fmtedAmt
    }
    public getTotalValue(ctx:TransactionEntry) {
        //console.log("in getTotalValue", ctx)
        const amt = ctx.amount*ctx.price + ctx.fee
            if(amt) {
                return this.formatCurency(amt, ctx.currency)
//                const cur1 = ctx.currency || "XXX" // XXX is no currency according to https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes
//                const language = navigator.language
//                const fmtedAmt =  new Intl.NumberFormat(language, { style: 'currency', currency: cur1 }).format(amt);
//                return fmtedAmt
            } else {
                return ''
            }
    }

    public getGroupHeader(group:any):GroupHeaderListItem {
        type GroupAggregations = {totalAmount:number, totalValue:number}
        const model = this.getView().getModel(TransactionsController.MODEL_NAME).getObject("/") as TransactionEntry[]
        const groupMembers = model.filter(transactionEntry => transactionEntry.symbol === group.key)
        //const groupName = model.find(transactionEntry => transactionEntry.symbol === group.key).name
        if(groupMembers.length > 0) {
            const groupName = groupMembers.at(0).name
            const aggregations:GroupAggregations = groupMembers.reduce(
                (acc:GroupAggregations, t:TransactionEntry)  => {
                    switch(t.transaction) {
                        case "Buy":
                            acc.totalAmount += t.amount
                            acc.totalValue += t.price*t.amount + t.fee
                            break
                        case "Sell":
                            acc.totalAmount -= t.amount
                            acc.totalValue -= t.price*t.amount - t.fee
                            break
                    }
                    return acc
                },
                {totalAmount:0, totalValue:0 } as GroupAggregations
            )
            return new GroupHeaderListItem({
                title : groupName ? `${groupName} (${group.key}) - ${aggregations.totalAmount} - ${this.formatCurency(aggregations.totalValue)}` : group.key
            })
        } else {
            // fallback in case of empty group for what so ever reason
            console.warn("empty group for ", group.key)
            return new GroupHeaderListItem({
                title :  group.key
            })
        }
    }
}