/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["./IllustratedMessageType","sap/ui/base/DataType","sap/ui/core/Lib","sap/ui/core/library","sap/m/library"],function(t,e,a){"use strict";var i=a.init({apiVersion:2,name:"sap.tnt",version:"1.130.0",dependencies:["sap.ui.core","sap.m"],designtime:"sap/tnt/designtime/library.designtime",types:["sap.tnt.IllustratedMessageType","sap.tnt.RenderMode"],interfaces:["sap.tnt.IToolHeader"],controls:["sap.tnt.NavigationList","sap.tnt.ToolHeaderUtilitySeparator","sap.tnt.ToolHeader","sap.tnt.SideNavigation","sap.tnt.ToolPage","sap.tnt.InfoLabel"],elements:["sap.tnt.NavigationListItem","sap.tnt.NavigationListGroup"],extensions:{flChangeHandlers:{"sap.tnt.NavigationList":"sap/tnt/flexibility/NavigationList","sap.tnt.NavigationListItem":"sap/tnt/flexibility/NavigationListItem","sap.tnt.NavigationListGroup":"sap/tnt/flexibility/NavigationListGroup"}}});i.IllustratedMessageType=t;i.RenderMode={Narrow:"Narrow",Loose:"Loose"};e.registerEnum("sap.tnt.RenderMode",i.RenderMode);return i});
//# sourceMappingURL=library.js.map