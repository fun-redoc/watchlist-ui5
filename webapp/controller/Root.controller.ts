import Controller from "sap/ui/core/mvc/Controller";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import AppComponent from "../Component";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import JSONModel from "sap/ui/model/json/JSONModel";
import { ListBase$ItemPressEvent } from "sap/m/ListBase";
import { Input$SubmitEvent } from "sap/m/Input";
import { Button$PressEvent } from "sap/m/Button";
import Log from "sap/base/Log";
import { YFinAutocompleteResult, YFinQuoteResponse, YFinQuoteResult } from "../types/yFinApiTypes";
import api_request from "../services/yFinApiService";
import useCache from "../services/cacheService";
import MessageType from "sap/ui/core/message/MessageType";
import BindingMode from "sap/ui/model/BindingMode";
import Localization from "sap/base/i18n/Localization";
import formatter from "../formatter";

interface MessageModel {
    text?:string
    type:MessageType|undefined
}

interface QueryParam {
    query:string
}

function fetchYFinQuery(apiKey:string, {query}:QueryParam, abortController?:AbortController): Promise<YFinQuoteResult[]> {
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
            Log.error(reason)
            throw new Error(reason)
        })
}

/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class Root extends Controller {
    public formatter = formatter(this.getOwnerComponent()?.getModel("i18n") as ResourceModel)
    private  i18nResourceBundle:ResourceBundle
    private static TIME_TO_SHOW_MESSAGE_MILLIS = 3000;

    private async getI18nResourceBundle():Promise<ResourceBundle | undefined> {
        if(this.i18nResourceBundle) return this.i18nResourceBundle
        const view = this.getView()
        if(view) {
            const i18nModel = view.getModel("i18n") as ResourceModel
            this.i18nResourceBundle = await i18nModel.getResourceBundle()
            return this.i18nResourceBundle
        } else {
            console.error("view not found.")
        }
    }
    public onInit(){
        // await this.getI19nResourceBundle()  unfortunatelly model is not available at this point of time....
        const oViewModel = new JSONModel({ currency: "EUR" });
        this.getView()?.setModel(oViewModel, "view")

        // model for Listview
        //const oListModel = new JSONModel({})
        //this.getView()?.setModel(oListModel, "yFinSearchResult")

        // model for Messages
        const oMessageModel:MessageModel = {type:undefined}
        this.getView()?.setModel(new JSONModel(oMessageModel), "messageModel")
        this.getView()?.getModel("messageModel")?.setDefaultBindingMode(BindingMode.OneWay)
    }
    public async onPress(e:ListBase$ItemPressEvent) {
        const provider = e.getSource()
        const bindingContext = provider.getBindingContext("yFinSearchResult")
        const path = bindingContext?.getPath()
        console.log("Root:onPress1", path)
        const selectedIdx =  path?.substring(1) // get rid of preciding '/'
        console.log("Root:onPress2", selectedIdx)
        const ownerComponent = this.getOwnerComponent() as AppComponent
        const router = ownerComponent.getRouter()
        if(router && selectedIdx) {
            router.navTo("assetdetail", {assetIdx:selectedIdx})
        } else {

            this.showErrorMessage((await this.getI18nResourceBundle())?.getText("genericUserErrorMessage"))
            throw new Error(`Error while accessing router for selected index ${selectedIdx}.`)
        }
    }
    public async onSearchAsset(e:Input$SubmitEvent) {
        const fetchYFinQueryCached = useCache<YFinQuoteResult[], typeof fetchYFinQuery>(fetchYFinQuery, {timeOutMillis:1000*60*30})
            // there is something wrong with the type defition of getParameter<never>)
			const queryParam = (e.getParameters() as QueryParam)

            const view = this.getView()
            const appComponent = this.getOwnerComponent() as AppComponent
            const apiKey = (this.getOwnerComponent() as AppComponent).getApiKey()
            if(apiKey) {
                //fetchYFinQuery(apiKey, queryParam)
                fetchYFinQueryCached([apiKey, queryParam])
                    .then(response => {
                        //if(view) {
                        if(appComponent) {
                            const jsonModel =new JSONModel(response)
                            console.log("setting app component model to", jsonModel)
                            appComponent.setModel(jsonModel, "yFinSearchResult")
                        } else {
                            console.warn("no appcomponent found") 
                        }
                    })
                    .catch(async reason => {
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
                setTimeout(() => {
                    messageModel.setProperty("/type", undefined, undefined, true)
                 }, Root.TIME_TO_SHOW_MESSAGE_MILLIS)
                throw new Error("no API Key provided")
                // TODO provide a custom component, which catches errors and paits it in toolbar
            }

		}
        private showErrorMessage(message?:string) {
            if(message) {
                const view = this.getView()
                const messageModel = view?.getModel("messageModel") as JSONModel
                messageModel.setProperty("/text", message, undefined, true)
                messageModel.setProperty("/type", MessageType.Error, undefined, true)
                setTimeout(() => {
                                    messageModel.setProperty("/type", undefined, undefined, true)
                                 }, Root.TIME_TO_SHOW_MESSAGE_MILLIS)
            }
        }
        public async onSettings(e:Button$PressEvent) {
            console.log("onSettings pressed")
            this.onNavigate("settings", e)
        }
        public async onWealth(e:Button$PressEvent) {
            console.log("onWealth pressed")
            this.onNavigate("wealth", e)
        }
        public async onWatchlist(e:Button$PressEvent) {
            console.log("onWatchlist pressed")
            this.onNavigate("watchlist", e)
        }
        public async onTransactions(e:Button$PressEvent) {
            console.log("onTransactions pressed")
            this.onNavigate("transactions", e)
        }
        private async onNavigate(page:string, e:Button$PressEvent) {
            const ownerComponent = this.getOwnerComponent() as AppComponent
            const router = ownerComponent.getRouter()
            if(router) {
                router.navTo(page)
            } else {
                this.showErrorMessage((await this.getI18nResourceBundle())?.getText("genericUserErrorMessage"))
                throw new Error("no router found in owner component.")
            }
        }

        public onLangDE() {
            Localization.setLanguage("de")
        }
        public onLangPL() {
            Localization.setLanguage("pl")
        }
        public onLangEN() {
            Localization.setLanguage("en")
        }
}