/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/core/Lib","sap/ui/unified/CalendarLegend","sap/ui/unified/CalendarAppointment","./PlanningCalendarLegendRenderer"],function(e,t,n,i){"use strict";var r=t.extend("sap.m.PlanningCalendarLegend",{metadata:{library:"sap.m",properties:{itemsHeader:{type:"string",group:"Appearance"},appointmentItemsHeader:{type:"string",group:"Appearance"}},aggregations:{appointmentItems:{type:"sap.ui.unified.CalendarLegendItem",multiple:true,singularName:"appointmentItem"}},designtime:"sap/m/designtime/PlanningCalendarLegend.designtime"},renderer:i});r._COLUMN_WIDTH_DEFAULT="auto";r.prototype.init=function(){t.prototype.init.call(this);this.setProperty("columnWidth",r._COLUMN_WIDTH_DEFAULT);this.addStyleClass("sapMPlanCalLegend")};r.prototype.setColumnWidth=function(e){if(e==undefined){e=r._COLUMN_WIDTH_DEFAULT}return this.setProperty("columnWidth",e)};r.findLegendItemForItem=function(e,t){var i=e?e.getAppointmentItems():null,r=e?e.getItems():null,a=t instanceof n,p=a?i:r,d=a?t.getType():t.type,s,o,u;if(p&&p.length){for(u=0;u<p.length;u++){s=p[u];if(s.getType()===d){o=s.getText();break}}}if(!o){o=d}return o};r.prototype._getItemsHeader=function(){var t=this.getItemsHeader();if(t==undefined){return e.getResourceBundleFor("sap.m").getText("PLANNING_CALENDAR_LEGEND_ITEMS_HEADER")}return t};r.prototype._getAppointmentItemsHeader=function(){var t=this.getAppointmentItemsHeader();if(t==undefined){return e.getResourceBundleFor("sap.m").getText("PLANNING_CALENDAR_LEGEND_APPOINTMENT_ITEMS_HEADER")}return t};return r});
//# sourceMappingURL=PlanningCalendarLegend.js.map