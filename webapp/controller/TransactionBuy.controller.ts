import AppComponent, {  } from "../Component";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { Button$PressEvent } from "sap/m/Button";
import BaseController from "./Base.controller";
import { YFinQuoteResult } from "../types/yFinApiTypes";
import { MessageType } from "sap/ui/commons/library";
import JSONModel from "sap/ui/model/json/JSONModel";
import useCache from "../services/cacheService";
import { QueryParam, fetchYFinQuery } from "../services/yFinApiService";
import Log from "sap/base/Log";
import ManagedObjectModel from "sap/ui/model/base/ManagedObjectModel";
import ManagedObject from "sap/ui/base/ManagedObject";
import MOTransaction from "../managedobject/MOTransaction";
import MOTransactionType from "../managedobject/MOTransactionType";
import { DBManager, mkDBManager } from "../services/DBManager";
import TransactionEntry, { DB_NAME_TRANSACTIONS, DB_STORE_TRANSACTIONS, DB_VERSION_TRANSACTIONS } from "../types/TransactionEntry";


interface RouteParams {
    symbol:string
}

const MOTransactions = ManagedObject.extend("rsh.watchlist.ui5.managedobject.MOTransactions", {
	metadata: {
		aggregations: {
			"transactions": {
				type: "rsh.watchlist.ui5.managedobject.MOTransaction",
				singularName:"transaction",
				multiple:true,
				bindable:true
			}
		},
    defaultAggregation:"transactions"
	}
})

/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class TransactionBuy extends BaseController {
	private dbm:Promise<DBManager<TransactionEntry>>

  public onInit() {
    super.onInit()
    const router = (this.getOwnerComponent() as AppComponent).getRouter()
    // eslint-disable-next-line @typescript-eslint/unbound-method
    router.getRoute("transactionBuy")?.attachPatternMatched(this._onObjectMatched, this)
  }

  private async _onObjectMatched(oEvent:Route$PatternMatchedEvent):Promise<void> {
    // here one can match and bind parameters passed to the route to a model
    // either the asset data from yfin is already bound to component model from previous search
    // or i have to fetch it separatelly 
    const view = this.getView()
    if(!view) {
      Log.warning("no view found, cannot set any view model") 
      return
    }

    const symbolFromParam =  window.decodeURIComponent((oEvent?.getParameter("arguments") as RouteParams).symbol)
    const model = this.appComponent.getModel("yFinSearchResult")
    const yfinQuoteResults = model?.getObject("/") as YFinQuoteResult[]  | undefined
    const asset = yfinQuoteResults?.find(v => v.symbol === symbolFromParam)
    if(!asset) {
      // still not fetched in component model, probably view called directly via addressline
      console.log("fetching model from yfinance api")
      await this._fetchAssetBaseDataAndStoreInViewModel(symbolFromParam)
    } else {
      console.log("using model from app component")
      const jsonModel =new JSONModel(asset)
      view.setModel(jsonModel, "yFinQuoteResult")
    }

    
    console.log(`symbolFromParam=${symbolFromParam}`)
    const mos = new MOTransactions()
		view.setModel(new ManagedObjectModel(mos), "transactions")
		view.getModel("transactions")?.setDefaultBindingMode("TwoWay") // TODO?? is this correct??
		this.dbm = mkDBManager<TransactionEntry>(DB_NAME_TRANSACTIONS, DB_STORE_TRANSACTIONS, DB_VERSION_TRANSACTIONS, [{indexName:"symbol",isUnique:false},{indexName:"buyOrSell", isUnique:false}])
		this.dbm
		.then(dbm => dbm.list("symbol",symbolFromParam))
		.then(list => {
			list.map(t => {
				const mo = new MOTransaction()
        mo.setProperty("ID",t.id)
        mo.setProperty("Symbol",t.symbol)
        mo.setProperty("Transaction", t.transaction)
        mo.setProperty("Price", t.price)
        mo.setProperty("Currency", t.currency)
        mo.setProperty("Fee", t.fee)
        mo.setProperty("Amount", t.amount)
        mo.setAggregation("Date", t.date)
        mos.addAggregation("transactions", mo)
			})
			//this.getModel("component")?.refresh()
			console.log("read compont model")
		})

    // TODO mocks for Testing
    // model that controlls the appearance
    const appearance = new JSONModel({canSell:true, canBuy:true})
    view.setModel(appearance, "appearance")
    const mockInput = new JSONModel({Date:new Date(), Amount:10, Price:80.86, Currency:"EUR", Fee:1})
    view.setModel(mockInput, "newTransaction")

//    const transactions = [
//                          {Date:new Date(), Symbol:"BY6.F", Transaction:"Buy", Price:80.00, Currency:"EUR", Amount:100, Fee:1},
//                          {Date:new Date(), Symbol:"BY6.F", Transaction:"Buy", Price:80.01, Currency:"EUR", Amount:101, Fee:2},
//                          {Date:new Date(), Symbol:"BY6.F", Transaction:"Buy", Price:80.02, Currency:"EUR", Amount:101, Fee:3},
//                          {Date:new Date(), Symbol:"BY6.F", Transaction:"Sell", Price:80.00, Currency:"EUR", Amount:100, Fee:1}
//                        ]
    //view.setModel(transactions, "transactions")
//    const mos = new MOTransactions()
//		view.setModel(new ManagedObjectModel(mos), "transactions")
//		view.getModel("transactions")?.setDefaultBindingMode("TwoWay") // TODO?? is this correct??
//    transactions.forEach(t => {
//        const mo = new  MOTransaction();
//        mo.setProperty("Symbol",t.Symbol)
//        mo.setProperty("Transaction", t.Transaction)
//        mo.setProperty("Price", t.Price)
//        mo.setProperty("Currency", t.Currency)
//        mo.setProperty("Fee", t.Fee)
//        mo.setProperty("Amount", t.Amount)
//        mo.setAggregation("Date", t.Date)
//        mos.addAggregation("transactions", mo)
//    })
//		view.getModel("transactions")?.refresh()
                        
    console.log("All models set")
  }

    public onDelete(e:Button$PressEvent) {
      console.log("TransactionBuy.controller:onDelete")
      const mo = e.getSource().getBindingContext("transactions")?.getObject() as ManagedObject|undefined
      const id = mo?.getProperty("ID")
      console.log("tryint to deletr tansaction id", mo?.getProperty("ID"))
      this.dbm
        .then(dbm => {
          return dbm.del(id)
        })
        .then( success => {
          if(success) {
            mo?.getParent()?.removeAggregation("transactions", mo)
          } else {
            throw new Error(`Deleting transaction id:${id} failed.`)
          }
        })
        .catch(reason => {
          console.error("failed to delete transaction with id:", id)
          console.error(reason)
          this.getI18nResourceBundle()
            .then(rb => {
              if(!rb) throw new Error("cannot find i18n resopurces")
              const message = rb.getText("genericUserErrorMessage")
              this.showErrorMessage(message)
            })
            .catch(_ => {
              console.error("failed to load i18n resources, showing fallback message")
              // Fallback message
              this.showErrorMessage("Some Problem happened deleting Transaction in DB, please try again later.")
            })
        })
    }

    private _onTransaction(transactionType:string) {
      const view = this.getView()
      if(!view) {
        Log.warning("no view found, cannot procede operation.") 
        return
      }
      const symbol = view.getModel("yFinQuoteResult")?.getProperty("/symbol")
      const newTransactionModel = view.getModel("newTransaction")
      const model = view.getModel("transactions") as ManagedObjectModel
      const mos = model.getObject("/")
      const mo = new  MOTransaction();
      // TODO proper input error hadling needed instead setting defaults
      // TODO try to use typescrtipt enums instead of sap enums managed object for type savety
      mo.setProperty("Symbol", symbol)
      mo.setProperty("Transaction", MOTransactionType[transactionType])
      mo.setProperty("Price", parseFloat(newTransactionModel?.getProperty("/Price") || "0"))
      mo.setProperty("Currency", newTransactionModel?.getProperty("/Currency"))
      mo.setProperty("Fee", parseFloat(newTransactionModel?.getProperty("/Fee") || "0"))
      mo.setProperty("Amount", parseInt(newTransactionModel?.getProperty("/Amount") || "0"))
      mo.setAggregation("Date", newTransactionModel?.getProperty("/Date"))
      this.dbm 
        .then(dbm => {
          const transaction:TransactionEntry = {
            symbol:mo.getProperty("Symbol"),
            transaction:mo.getProperty("Transaction"),
            price:mo.getProperty("Price"),
            fee:mo.getProperty("Fee"),
            amount:mo.getProperty("Amount"),
            currency:mo.getProperty("Currency"),
            date:mo.getAggregation("Date"),
          }
          console.log(transaction)
          return dbm.add(transaction)
        })
        .then(id => {
          mo.setProperty("ID", id)
          mos.addAggregation("transactions", mo)
        })
        .catch(reason => {
          console.error(reason)
          this.getI18nResourceBundle()
            .then(rb => {
              if(!rb) throw new Error("cannot find i18n resopurces")
              const message = rb.getText("genericUserErrorMessage")
              this.showErrorMessage(message)
            })
            .catch(_ => {
              console.error("failed to load i18n resources, showing fallback message")
              // Fallback message
              this.showErrorMessage("Some Problem happened adding Transaction to DB, please try again later.")
            })
        })
    }
    public onBuy(e:Button$PressEvent) {
      console.log("TransactionBuy.controller:onBuy")
      this._onTransaction("Buy")
    }
    public onSell(e:Button$PressEvent) {
      console.log("TransactionBuy.controller:onSell")
      this._onTransaction("Sell")
    }
    public dateComparator(c1:Date, c2:Date) :number{
      return c1.valueOf() - c2.valueOf()
    }

    private _fetchYFinQueryCached = useCache<YFinQuoteResult[], typeof fetchYFinQuery>(fetchYFinQuery, {timeOutMillis:1000*60*30})

    private async _fetchAssetBaseDataAndStoreInViewModel(symbol:string) {
      // there is something wrong with the type defition of getParameter<never>)
 			const queryParam:QueryParam = {query:symbol}
      const view = this.getView()
      if(!view) {
        console.warn("no view found") 
        return
      }
      const apiKey = (this.getOwnerComponent() as AppComponent).getApiKey()
      if(apiKey) {
//                //fetchYFinQuery(apiKey, queryParam)
        this._fetchYFinQueryCached([apiKey, queryParam])
          .then(async (response: YFinQuoteResult[]) => {
                        if(response.length > 0 ) {
                          if(response.length > 1) {
                            Log.warning(`yfinance api returns an ambiguous result for ${symbol}`)
                          }
                          const jsonModel =new JSONModel(response[0])
                          console.log("setting view model to", jsonModel)
                          view.setModel(jsonModel, "yFinQuoteResult")
                        } else {
                            Log.error(`yfinance api returns no result for ${symbol}`)
                            this.showErrorMessage((await this.getI18nResourceBundle())?.getText("genericUserErrorMessage"))
                        }
          })
          .catch(async (reason: string | undefined) => {
                        console.error(reason)
                        this.showErrorMessage((await this.getI18nResourceBundle())?.getText("genericUserErrorMessage"))
                        throw new Error(reason)
          })
    } else {
      const rb = await this.getI18nResourceBundle()
      this.showErrorMessage(rb?.getText("noApiKeyProvidedMessage"))
      const messageModel = view?.getModel("messageModel") as JSONModel
      messageModel.setProperty("/text", rb?.getText("noApiKeyProvidedMessage"), undefined, true)
      messageModel.setProperty("/type", MessageType.Error, undefined, true)
      setTimeout(() => { messageModel.setProperty("/type", undefined, undefined, true)},
                 BaseController.TIME_TO_SHOW_MESSAGE_MILLIS)
//                throw new Error("no API Key provided")
//                // TODO provide a custom component, which catches errors and paits it in toolbar
    }
	}
}