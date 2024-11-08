/*!
* OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
*/
sap.ui.define(["sap/m/library","sap/ui/core/library","sap/m/ObjectStatus","sap/m/ObjectStatusRenderer"],function(t,e,a,o){"use strict";var s=t.EmptyIndicatorMode;var n=e.ValueState;var i=a.extend("sap.ui.integration.controls.ObjectStatus",{metadata:{library:"sap.ui.integration",properties:{showStateIcon:{type:"boolean",defaultValue:false}}},renderer:o});i.prototype._isEmpty=function(){return this.getEmptyIndicatorMode()===s.Off&&this._hasNoValue()};i.prototype._shouldRenderEmptyIndicator=function(){return this.getEmptyIndicatorMode()===s.On&&this._hasNoValue()};i.prototype._hasNoValue=function(){return!this.getText()&&(!this.getShowStateIcon()||this.getShowStateIcon()&&this.getState()===n.None&&!this.getIcon())};i.prototype.onBeforeRendering=function(){if(this.getShowStateIcon()){if(!this.getIcon()){this.addStyleClass("sapMObjStatusShowIcon")}else{this.addStyleClass("sapMObjStatusShowCustomIcon")}}this.addStyleClass("sapUiIntObjStatus")};return i});
//# sourceMappingURL=ObjectStatus.js.map