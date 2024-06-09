import ManagedObject from "sap/ui/base/ManagedObject";

// https://embed.plnkr.co/bWFidnHVabwaoqQV?show=controller%2FHome.controller.js,view%2FHome.view.xml,preview:%3Fsap-ui-xx-componentPreload%3Doff	
export default ManagedObject.extend("rsh.watchlist.ui5.managedobject.MOTransaction", {
    metadata: {
      properties: {
        ID:{
          type:"sap.ui.model.type.Integer",
//          defaultValue:0,
          bindable:true
        },
        Symbol: {
          type:"string",
          defaultValue:"",
          bindable:true
        },
        Transaction:{
          type:"rsh.watchlist.ui5.managedobject.MOTransactionType",
          defaultValue:"unspecified",
          bindable:true
        },
        Currency:{
          type:"string",
          defaultValue:"unknown",
          bindable:true
        },
        Price:{
          type:"float",
          defaultValue:0.0,
          bindable:true
        },
        Fee:{
          type:"float",
          defaultValue:0.0,
          bindable:true
        },
        Amount:{
          type:"sap.ui.model.type.Integer",
          defaultValue:0,
          bindable:true
        },
      },
      aggregations: {
        Date:{
          type:"Date",
          multiple:false,
          bindable:true
        }//UI5Date | Date
      }
    },
  });