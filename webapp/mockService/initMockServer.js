sap.ui.define([
	"rsh/watchlist/ui5/mockService/mockserver"
], function (mockserver) {
	"use strict";
//    debugger
	// initialize the mock server
	mockserver.init();
	sap.ui.require(["sap/ui/core/ComponentSupport"]);
});