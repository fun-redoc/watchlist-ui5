/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/core/Lib","sap/ui/mdc/FilterBarDelegate"],(e,t)=>{"use strict";const r=e.getResourceBundleFor("sap.ui.mdc");const s=Object.assign({},t);s.fetchProperties=function(e){return Promise.resolve([{name:"$search",label:r.getText("filterbar.SEARCH"),dataType:"sap.ui.model.type.String"}])};return s});
//# sourceMappingURL=FilterBarDelegate.js.map