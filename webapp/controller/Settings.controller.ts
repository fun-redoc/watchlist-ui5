import Controller from "sap/ui/core/mvc/Controller";
import History from "sap/ui/core/routing/History";
import AppComponent from "../Component";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import MessageToast from "sap/m/MessageToast";
import JSONModel from "sap/ui/model/json/JSONModel";
import { Button$PressEvent } from "sap/m/Button";
import Input from "sap/m/Input";

interface SettingsModel {
  apiKey:string|null
}
/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class Settings extends Controller {
    static API_KEY_INPUT_ID = "apiKeyInput"
		public onInit() {
      const router = (this.getOwnerComponent() as AppComponent).getRouter()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      router.getRoute("settings")?.attachPatternMatched(this._onObjectMatched, this)

      //const apiKey = localStorage.getItem(Settings.API_KEY_INPUT_ID)
      const apiKey = (this.getOwnerComponent() as AppComponent).getApiKey()

      const view = this.getView()
      view?.setModel(new JSONModel({apiKey:apiKey} as SettingsModel))

      const apiKeyInputObj = view?.byId(Settings.API_KEY_INPUT_ID)
      if(apiKeyInputObj) {
        // TODO how validation is done in the newer Versions??
        sap.ui.getCore().getMessageManager().registerObject(apiKeyInputObj,true)
      } else {
        console.warn("apiKeyInput not found, at least there will not be validity checks for this element.")
      }
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
        console.log(apiKey)
        const oInput:Input|undefined = this.getView()?.byId(Settings.API_KEY_INPUT_ID) as Input
        if(apiKey) {
          (this.getOwnerComponent() as AppComponent).saveApiKey(apiKey)
          MessageToast.show("{i18n>apiKeySaved}")
          oInput.setValueState("Success")
        } else {
          oInput.setValueState("Error")
          oInput.setValueStateText("{i18n>pleaseEnterApiKeyStateText}")
        }
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
}