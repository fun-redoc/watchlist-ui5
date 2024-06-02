import DateTime from "sap/ui/model/type/DateTime"
import { TProvideNumericID } from "../services/DBManager"
import UI5Date from "sap/ui/core/date/UI5Date"

interface WatchStock extends TProvideNumericID {
    symbol:string
    name:string
    kind:string
    watchSince:UI5Date | Date
}

export default WatchStock