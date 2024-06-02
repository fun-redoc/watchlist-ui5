import History from "sap/ui/core/routing/History";
import Controller from "sap/ui/core/mvc/Controller";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import AppComponent from "../Component";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import JSONModel from "sap/ui/model/json/JSONModel";
import { Button$PressEvent } from "sap/m/Button";
import MessageType from "sap/ui/core/message/MessageType";
import BindingMode from "sap/ui/model/BindingMode";

interface MessageModel {
    text?:string
    type:MessageType|undefined
}

/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class BaseController extends Controller {
    private  i18nResourceBundle:Promise<ResourceBundle> | ResourceBundle
    private static TIME_TO_SHOW_MESSAGE_MILLIS = 3000;
    protected appComponent: AppComponent

    protected async getI18nResourceBundle():Promise<ResourceBundle | undefined> {
        if(this.i18nResourceBundle) return this.i18nResourceBundle
        const view = this.getView()
        if(view) {
            const i18nModel = view.getModel("i18n") as ResourceModel
            this.i18nResourceBundle = i18nModel.getResourceBundle()
            return this.i18nResourceBundle
        } else {
            console.error("view not found.")
        }
    }
    public onInit(){
        // await this.getI19nResourceBundle()  unfortunatelly model is not available at this point of time....
        const oViewModel = new JSONModel({ currency: "EUR" });
        this.getView()?.setModel(oViewModel, "view")

        // model for Messages
        const oMessageModel:MessageModel = {type:undefined}
        this.getView()?.setModel(new JSONModel(oMessageModel), "messageModel")
        this.getView()?.getModel("messageModel")?.setDefaultBindingMode(BindingMode.OneWay)

        const appComponent = this.getOwnerComponent() as AppComponent
        this.appComponent = appComponent
    }

    public async formatStatusText(status:string): Promise<string> {
        // the formater seems to be called even bevore onInit fires!!!
        const rb = await this.getI18nResourceBundle()
        switch(status) {
            case "OK": 
                return rb?.getText("statusOK") || `(${status})`
            case "NOK": 
                return rb?.getText("statusNOK") || `(${status})`
            default: return status
        }
    }
    public async formatPercent(value:number): Promise<string> {
        // the formater seems to be called even bevore onInit fires!!!
       return `${value}%`
    }
    /**
     * needs a Toolbar with a MessageStrip
     * @param message 
     */
    protected showErrorMessage(message?:string) {
            if(message) {
                const view = this.getView()
                const messageModel = view?.getModel("messageModel") as JSONModel
                messageModel.setProperty("/text", message, undefined, true)
                messageModel.setProperty("/type", MessageType.Error, undefined, true)
                setTimeout(() => {
                                    messageModel.setProperty("/type", undefined, undefined, true)
                                 }, BaseController.TIME_TO_SHOW_MESSAGE_MILLIS)
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
        public async onNavigate(page:string, e:Button$PressEvent) {
            console.log("BaseController:onNavigate")
            const ownerComponent = this.getOwnerComponent() as AppComponent
            const router = ownerComponent.getRouter()
            if(router) {
                router.navTo(page)
            } else {
                this.showErrorMessage((await this.getI18nResourceBundle())?.getText("genericUserErrorMessage"))
                throw new Error("no router found in owner component.")
            }
        }
        public onNavBack() {
			const history = History.getInstance();
			const previousHash = history.getPreviousHash();

			if (previousHash !== undefined || !this.appComponent) {
				window.history.go(-1);
			} else {
				const router = this.appComponent.getRouter()
				router.navTo("root",undefined, true);
			}
		}
}