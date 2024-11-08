/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/base/Log"],e=>{"use strict";return{getUShellContainer:function(){return sap.ui.require("sap/ushell/Container")},getService:function(i,r){const t=this.getUShellContainer();if(!t){return r?Promise.resolve(null):null}switch(i){case"CrossApplicationNavigation":e.error("sap.ui.mdc.link.Factory: tried to retrieve deprecated service 'CrossApplicationNavigation', please use 'Navigation' instead!");return r?t.getServiceAsync("CrossApplicationNavigation"):t.getService("CrossApplicationNavigation");case"Navigation":return r?t.getServiceAsync("Navigation"):t.getService("Navigation");case"URLParsing":return r?t.getServiceAsync("URLParsing"):t.getService("URLParsing");default:return r?Promise.resolve(null):null}},getServiceAsync:function(e){return this.getService(e,true)}}});
//# sourceMappingURL=Factory.js.map