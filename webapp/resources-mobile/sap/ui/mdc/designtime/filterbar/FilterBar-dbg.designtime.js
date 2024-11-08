/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([
	"sap/m/p13n/Engine"
], (Engine) => {
	"use strict";

	return {
		actions: {
			settings: {
				"sap.ui.mdc": {
					name: "filterbar.ADAPT_TITLE",
					handler: function (oControl, mPropertyBag) {
						//CHECK: move metadata finalizing to Engine?
						return oControl.initializedWithMetadata().then(() => {
							return Engine.getInstance().getRTASettingsActionHandler(oControl, mPropertyBag, "Item");
						});
					}
				}
			}
		},
		aggregations: {
			layout: {
				ignore: true
			},
			basicSearchField: {
				ignore: true
			},
			filterItems: {
				ignore: true
			}
		},
		properties: {
			showAdaptFiltersButton: {
				ignore: false
			},
			showClearButton: {
				ignore: false
			},
			p13nMode: {
				ignore: false
			}
		}
	};
});