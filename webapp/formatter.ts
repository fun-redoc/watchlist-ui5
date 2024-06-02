import ResourceBundle from "sap/base/i18n/ResourceBundle"
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
        formatPercentFromDecimal: async function(value:number): Promise<string> {
            // the formater seems to be called even bevore onInit fires!!!
            return `${value*100}%`
        },
        formatPercent: async function(value:number): Promise<string> {
            // the formater seems to be called even bevore onInit fires!!!
            return `${value}%`
        },
        formatTime: async function(timestamp?:number, gmtOffset?:number): Promise<string> {
            // the formater seems to be called even bevore onInit fires!!!
            console.log("formatter:formatTime", timestamp, gmtOffset, timestamp, gmtOffset)
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

        }
    }
}
