/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["jquery.sap.global","sap/ui/debug/Highlighter","./ControlTree"],function(jQuery,t,o){"use strict";var e=function(){};e.prototype.startPlugin=function(t){this.oCoreOther=t;this.oCore=t;this.oCore.attachControlEvent(this.onControlEvent,this);this.oWindow=window;this.oControlTree=new o(this.oCore,window)};e.prototype.stopPlugin=function(){this.oCore.detachControlEvent(this.onControlEvent,this);this.oCore=null};e.prototype.onControlEvent=function(o){if(this.oCore.isLocked()){var e=o.getParameter("browserEvent");if(e.type=="click"){var i=e.srcControl;if(i){var n=new t("sap-ui-testsuite-SelectionHighlighter");n.highlight(i.getDomRef());if(selectControl){selectControl(i.getId())}}}}};(function(){var t=new e;sap.ui.getCore().registerPlugin(t)})();return e},true);
//# sourceMappingURL=TestEnv.js.map