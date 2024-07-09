import History from "sap/ui/core/routing/History";
import AppComponent from "../Component";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import BaseController from "./Base.controller";
import { ListBase$ItemPressEvent } from "sap/m/ListBase";


interface RoutParams {
    assetIdx:string
}
/**
 * @namespace rsh.watchlist.ui5.controller
 */
export default class WatchlistController extends BaseController {
//    private appComponent : AppComponent

    public onInit() {
      console.log("onInit:Watchlist")
      super.onInit()
       
//      this.appComponent = this.getOwnerComponent() as AppComponent

//      const router = (this.getOwnerComponent() as AppComponent).getRouter()
      const router = this.appComponent.getRouter()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const route = router.getRoute("watchlist")
      if(route) {
          console.log("route watchlist matches", route)
      } 
      route?.attachPatternMatched(this.onRouteMatched, this)
        
    }
    private onRouteMatched(_:Route$PatternMatchedEvent):void {
        console.log("in on Route watchlist matched")
        if(this.appComponent) {
            this.appComponent.refreshWatchlistMarketData()
        }
    }
    public onRefresh() {
        console.log("in on Refresh")
        if(this.appComponent) {
            this.appComponent.refreshWatchlistMarketData()
        }
    }

    public async onGotoDetails(e:ListBase$ItemPressEvent) {
        const provider = e.getSource()
        const bindingContext = provider.getBindingContext("component")
        const fullPath = bindingContext?.getPath()
        const selectedIdx = fullPath?.split("/").slice(-1)[0]
        const router = this.appComponent.getRouter()
        if(router && selectedIdx) {
            router.navTo("watchdetail", {assetIdx:selectedIdx})
        } else {
            this.showErrorMessage((await this.getI18nResourceBundle())?.getText("genericUserErrorMessage"))
            throw new Error(`Error while accessing router for selected index ${selectedIdx}.`)
        }
    }

}