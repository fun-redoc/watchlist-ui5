sap.ui.define([
	"sap/ui/core/util/MockServer"
], (MockServer) => {
	"use strict";

	return {
		init:  function () {
			
			// create
			const oMockServer = new MockServer({
				rootUri: "/sap/opu/odata/SAP/ZASSTES_SRV/"
			});

			const oUrlParams = new URLSearchParams(window.location.search);

			// configure mock server with a delay
			MockServer.config({
				autoRespond: true,
				autoRespondAfter: oUrlParams.get("serverDelay") || 500
			});

			// simulate
            oMockServer.simulate("../mockService/metadata.xml", {
				sMockdataBaseUrl: "../mockService/mockData",
				bGenerateMissingMockData: true
			});

			// start
			oMockServer.start();
		}
	};
});