import History from "sap/ui/core/routing/History";
import AppComponent from "../Component";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";
import { Button$PressEvent } from "sap/m/Button";
import Input from "sap/m/Input";
import accessTransactionsDB from "../services/transactionsDB";
import * as saveAs from 'file-saver'
import BaseController from "./Base.controller";
import { FileUploader$ChangeEvent, FileUploader$UploadCompleteEvent } from "sap/ui/unified/FileUploader";
import parseCsv from "../services/parseCsv";
import TransactionEntry from "../types/TransactionEntry";
import  MOViewDisplayEditModel  from "../managedobject/MOViewDisplayEditModel";
import ManagedObjectModel from "sap/ui/model/base/ManagedObjectModel";
import InputBase, { InputBase$ChangeEvent } from "sap/m/InputBase";
import ManagedObject from "sap/ui/base/ManagedObject";
import useCache from "../services/cacheService";

function formatCsvDate(date:Date) {
  return `${date.getFullYear()}-${date.getMonth().toString().padStart(2,'0')}-${date.getDay().toString().padStart(2,'0')}}`
}

// if you want to make it reactive yu have to use managedobjectmodel instead of JSONModel
const SettingsManagedObject = ManagedObject.extend('rsh.watchlist.ui5.controller.SettingsManagedObject', {
		metadata: {
			properties: {
				apiKey: {
					type:"string",
					bindable:true,
					visibility:"public"
				},
				useCache: {
					type:"boolean",
					defaultValue:false,
					bindable:true,
					visibility:"public"
				},
				cacheInterval: {
					type:"int",
					defaultValue:60000,
					bindable:true,
					visibility:"public"
				}
      }
		}
	})

//interface SettingsModel {
//  apiKey:string|null
//  useCache:boolean
//  cacheInterval:number|undefined
//}
/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class Settings extends BaseController {
    static API_KEY_INPUT_ID = "apiKeyInput"
		public onInit() {
      super.onInit()
      const router = (this.getOwnerComponent() as AppComponent).getRouter()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      router.getRoute("settings")?.attachPatternMatched(this._onObjectMatched, this)

      const view = this.getView()
  
      // view sate model
      view.setModel(new ManagedObjectModel(new MOViewDisplayEditModel()), "viewState")
      view.getModel("viewState")?.setDefaultBindingMode("TwoWay") 
      console.log(view.getModel("viewState"))
      console.log(view.getModel("viewState")?.getProperty("/mode"))

      // I'm going to use a local model for apiKey, cache etc. in order to be able to deliberatelly save using save button
      this.reloadModel()

      const apiKeyInputObj = view?.byId(Settings.API_KEY_INPUT_ID)
      if(apiKeyInputObj) {
        // TODO how validation is done in the newer Versions??
        sap.ui.getCore().getMessageManager().registerObject(apiKeyInputObj,true)
      } else {
        console.warn("apiKeyInput not found, at least there will not be validity checks for this element.")
      }
		}
    private reloadModel() {
      const view = this.getView()
      const component = this.getOwnerComponent() as AppComponent
      const componentModel = component.getModel("component")
      const apiKey = componentModel.getProperty("/apiKey") as string
      const useCache = componentModel.getProperty("/useCache") as boolean
      const cacheInterval = componentModel.getProperty("/cacheInterval") as number | undefined

      const localModel = new ManagedObjectModel(new SettingsManagedObject())
      localModel.setProperty("/apiKey", apiKey)
      localModel.setProperty("/useCache", useCache)
      localModel.setProperty("/cacheInterval", cacheInterval)
      view?.setModel(localModel)
//      view?.setModel(new JSONModel({apiKey:apiKey, useCache:useCache, cacheInterval:cacheInterval} as SettingsModel))
    }
		private _onObjectMatched(oEvent:Route$PatternMatchedEvent):void {
      // here one can match and bind parameters passed to the route to a model
//			const view = this.getView()
//            if(view) {
//                view.bindElement({
//                    path: "/" + window.decodeURIComponent((oEvent?.getParameter("arguments") as RoutParams).invoicePath),
//                    model: "invoice"
//                }
//                )
//            } else {
//                console.error("somtething wnt wrong. view is not bound. try again later.")
//                throw new Error("somtething wnt wrong. try again later.")
//            }
		}
    public onSave(e:Button$PressEvent) {
      const model = this.getView()?.getModel()
      //  validate imput (length !== 0)
      if(model) {
        const apiKey = model.getProperty("/apiKey")
        console.info("API Key saved: ", apiKey)
        const oInput:Input|undefined = this.getView()?.byId(Settings.API_KEY_INPUT_ID) as Input
        (this.getOwnerComponent() as AppComponent).saveSettings(apiKey, model.getProperty("/useCache"), model.getProperty("/cacheInterval"))
        if(apiKey) {
          //(this.getOwnerComponent() as AppComponent).saveApiKey(apiKey)
          MessageToast.show("{i18n>settingsSaved}")
          oInput.setValueState("Success")
          const viewStateModel = this.getView()?.getModel("viewState") as ManagedObjectModel
          viewStateModel.setProperty("/mode", "Display")
        } else {
          oInput.setValueState("Error")
          oInput.setValueStateText("{i18n>pleaseEnterApiKeyStateText}")
        }
      }
    }
    public onEdit() {
      const viewStateModel = this.getView()?.getModel("viewState") as ManagedObjectModel
      viewStateModel.setProperty("/mode", "Edit")
    }
    public onCancel() {
      this.reloadModel()
      const viewStateModel = this.getView()?.getModel("viewState") as ManagedObjectModel
      viewStateModel.setProperty("/mode", "Display")
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

    public onDeleteAllTransactions() {
      accessTransactionsDB()
      .then(dbm => {
        dbm.clearAll()
        MessageToast.show("{i18n>TransactionDBdeleted}")
      }).catch(async reason=> {
        console.error(reason)
        this.showErrorMessageWithFallback("ErrorDeletingTransactions","Error Deleting Transactions DB, try again later.")
      })
    }

    public async onSaveTransactionsCSV(e:Button$PressEvent) {
      // this implementation usese the famous FileSaver from Eli Grey (https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md)
      // for bigger data should switch to stream-saver (https://github.com/jimmywarting/StreamSaver.js)
      accessTransactionsDB()
      .then(dbm => {
        return dbm.list("symbol")
      })
      .then(transactions => {
        // 1. write header line
        let csvBlob = ["symbol,Bezeichnung ,Bei Institut,Anzahl,Kaufpreis,Datum,Gebühr"]
        // 2. write entries
        transactions.forEach(entry => {
          // TODO entry should include name and bank
          csvBlob.push(`\n${entry.transaction}; ${entry.symbol};;;;${entry.amount};${entry.currency}; ${entry.price};${formatCsvDate(entry.date)};${entry.fee}`)
        })
        // 3. save the blob
        const blob = new Blob(csvBlob, {type: "text/csv;charset=utf-8"})
        saveAs(blob, `transactions.${new Date(Date.now()).toLocaleString("de-DE", {year:'numeric', month:'2-digit', day:'2-digit'})}.csv`)
      })
    }
    public handleUploadPress(e:FileUploader$ChangeEvent) {
        // TODO customize FileUploader in view (mimetype, filter, icon,  etc)
        const view = this.getView()
        if(view) {
            const files = e.getParameter("files")
            if(!files || files.length === 0) {
                // TODO error message
                console.error("no file selected")
                return
            }
            const file = files[0] as Blob// only one File
            console.log(file)
            const readr = new FileReader()
            readr.onloadend = (e) => {
                const csv = e.target?.result as string | undefined // see below, readAsText returns string
                if(csv) {
                    const parsedCsv = parseCsv(csv,';')
                    const dbm = accessTransactionsDB()
                    const dbWritePromisses:Promise<number>[] = []
                    dbm.then(db => {
                      let headerRowSkipped = false
                      parsedCsv.forEach(row => {
                        if(!headerRowSkipped) {
                          headerRowSkipped = true
                        } else {
                          const transactionEntry:TransactionEntry = {
                            symbol: row[1] as string,
                            bank: row[3] as string,
                            currency: undefined,
                            transaction: row[0] as "Buy" | "Sell",
                            price: typeof row[5] === 'number' ? row[5] : parseFloat(row[5]),
                            fee: typeof row[7] === 'number' ? row[7] : parseFloat(row[7]),
                            amount: typeof row[4] === 'number' ? row[4] : parseFloat(row[4]),
                            date: new Date(row[6] as string),
                            name: row[2] as string
                          }
                          //console.log(transactionEntry)
                          dbWritePromisses.push(db.add(transactionEntry))
                        }
                      })
                    })
                    Promise.all(dbWritePromisses)
                      .then(ns => {
                        MessageToast.show(`${ns.length} {i18n>EntriesLoaded}`)
                      })
                      .catch(reason => {
                        console.error(reason)
                        this.showErrorMessageWithFallback("ErrorLoadingCsv","Error Loading Transactions from csv file, try again later.")
                        })
                } else {
                    // TODO show error to user
                    console.error("failed to read file", file)
                    this.showErrorMessageWithFallback("ErrorLoadingCsv","Error Loading Transactions from csv file, try again later.")
                }
            }
            readr.readAsText(file)
        }
    }
    public onUploadComplete(e:FileUploader$UploadCompleteEvent) {
      console.log("uploadComplete")
    }
}