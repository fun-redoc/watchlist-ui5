import ResourceBundle from "sap/base/i18n/ResourceBundle"
import DateFormat from "sap/ui/core/format/DateFormat"
import ResourceModel from "sap/ui/model/resource/ResourceModel"

/**
 * @namespace rsh.watchlist.ui5
 */
export default function(rm?: ResourceModel) {
    return {
        formatStatusText: async function(status:string): Promise<string> {
            // the formater seems to be called even bevore onInit fires!!!
            const rb = await rm?.getResourceBundle()
            switch(status) {
                case "OK": 
                    return rb?.getText("statusOK") || `(${status})`
                case "NOK": 
                    return rb?.getText("statusNOK") || `(${status})`
                default: return status
            }
        },
        formatAsCurrency: function(amt?:number, cur?:string): string {
            if(amt) {
                const cur1 = cur ||  "XXX" // XXX is no currency according to https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes
                const language = navigator.language
                const fmtedAmt =  new Intl.NumberFormat(language, { style: 'currency', currency: cur1 }).format(amt);
                return fmtedAmt
            } else {
                return '-'
            }
        },
        formatAsCurrencyTrace: function(amt?:number, cur?:string): string {
            console.log("formatAsCurrencyTrace", amt, cur)
            if(amt) {
                const cur1 = cur ||  "XXX" // XXX is no currency according to https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes
                const language = navigator.language
                const fmtedAmt =  new Intl.NumberFormat(language, { style: 'currency', currency: cur1 }).format(amt);
                return fmtedAmt
            } else {
                return '-'
            }
        },
        formatPercentFromDecimal: async function(value:number): Promise<string> {
            // the formater seems to be called even bevore onInit fires!!!
            return `${(value*100).toFixed(1)}%`
        },
        formatPercent: async function(value:number): Promise<string> {
            // the formater seems to be called even bevore onInit fires!!!
            return `${value}%`
        },
        formatTime: async function(timestamp?:number, gmtOffset?:number): Promise<string> {
            // the formater seems to be called even bevore onInit fires!!!
            //console.log("formatter:formatTime", timestamp, gmtOffset, timestamp, gmtOffset)
            if( timestamp && gmtOffset ) {
                const time = new Date(timestamp * 1000) // + gmtOffset) // gmtOffset offests to the local time of the market
                                                                        // what I want my local time of the market
                return `${time.toLocaleString()}`
            } 
            if( timestamp && !gmtOffset ) {
                const time = new Date(timestamp * 1000 )
                return `${time.toLocaleString()}`
            }
            return '-'

        },
        formatKind: async function(kind:string): Promise<string> {
            // the formater seems to be called even bevore onInit fires!!!
            const rb = await rm?.getResourceBundle()
            switch(kind) {
                case "S": 
                    return rb?.getText("sell") || `(${kind})`
                case "B": 
                    return rb?.getText("buy") || `(${kind})`
                default: return kind
            }
        },
        formatDate:  function(date:Date):string {
            let format = DateFormat.getDateInstance ({
                pattern: "yyyy.MM.dd"
            });
            return format.format(date);
        }
    }
}
