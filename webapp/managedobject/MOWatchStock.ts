import ManagedObject from "sap/ui/base/ManagedObject";

// https://embed.plnkr.co/bWFidnHVabwaoqQV?show=controller%2FHome.controller.js,view%2FHome.view.xml,preview:%3Fsap-ui-xx-componentPreload%3Doff	
export default ManagedObject.extend("rsh.watchlist.ui5.managedobject.MOWatchStock", {
    metadata: {
      properties: {
        symbol: {
          type:"string",
          defaultValue:"",
          bindable:true
        },
        name:{
          type:"string",
          defaultValue:"",
          bindable:true
        },
        quoteType:{
          type:"string",
          defaultValue:"other",
          bindable:true
        },
        currency:{
          type:"string",
          defaultValue:"unknown",
          bindable:true
        },
        regularMarketPrice:{
          type:"float",
          defaultValue:0.0,
          bindable:true
        },
        ask:{
          type:"float",
          defaultValue:0.0,
          bindable:true
        },
        bid:{
          type:"float",
          defaultValue:0.0,
          bindable:true
        },
        averageDailyVolume10Day:{
          type:"float",
          defaultValue:0.0,
          bindable:true
        },
      },
      aggregations: {
        watchSince:{
//          type:"sap.ui.core.date.UI5Date",
          type:"Date",
          multiple:false,
          bindable:true
        }//UI5Date | Date
      }
    },
  });