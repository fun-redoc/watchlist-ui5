/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/m/p13n/Engine","sap/ui/mdc/Chart","../Util"],(e,t,n)=>{"use strict";const i={actions:{settings:{"sap.ui.mdc":{name:"p13nDialog.VIEW_SETTINGS",handler:function(t,n){const i=t.getP13nMode();const a=i.indexOf("Type");if(a>-1){i.splice(a,1)}if(t.isPropertyHelperFinal()){return e.getInstance().getRTASettingsActionHandler(t,n,i)}else{return t.finalizePropertyHelper().then(()=>e.getInstance().getRTASettingsActionHandler(t,n,i))}}}}},aggregations:{_toolbar:{propagateMetadata:function(e){return null}}}};const a=["_toolbar"],r=["headerLevel","headerVisible"];return n.getDesignTime(t,r,a,i)});
//# sourceMappingURL=Chart.designtime.js.map