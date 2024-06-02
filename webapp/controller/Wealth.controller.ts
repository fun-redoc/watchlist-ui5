import Controller from "sap/ui/core/mvc/Controller";
import History from "sap/ui/core/routing/History";
import AppComponent from "../Component";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import { Input$SubmitEvent } from "sap/m/Input";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import { ListBase$ItemPressEvent } from "sap/m/ListBase";

interface RoutParams {
    assetIdx:string
}
interface QueryParam {
    query:string
}
/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class WealthController extends Controller {
    private  i18nResourceBundle:ResourceBundle
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
    public async onInit() {
        await this.getI18nResourceBundle()

            const router = (this.getOwnerComponent() as AppComponent).getRouter()
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const route = router.getRoute("assetdetail")
            if(route) {
                console.log("route matches", route)
            } 
            const appComponent = this.getOwnerComponent() as AppComponent
            this.getView()?.setModel(appComponent.getModel("yFinSearchResult"), "yFinSearchResult")
            route?.attachPatternMatched(this._onObjectMatched, this)
    }

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

    public async formatKind(kind:string): Promise<string> {
        // the formater seems to be called even bevore onInit fires!!!
        const rb = await this.getI18nResourceBundle()
        switch(kind) {
            case "S": 
                return rb?.getText("sell") || `(${kind})`
            case "B": 
                return rb?.getText("buy") || `(${kind})`
            default: return kind
        }
    }

    // TODO Filter does not work seemingly
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
        // so i have to force js duck typing to go ahead, maybe there is a better solution // TODO
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
//			const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
//			oRouter.navTo("detail");
    }
}