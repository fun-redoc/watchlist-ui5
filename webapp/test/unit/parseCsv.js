/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-undef */
sap.ui.require(
	[
		"rsh/watchlist/ui5/services/parseCsv",
		"sap/ui/thirdparty/sinon",
		"sap/ui/thirdparty/sinon-qunit"
	],
	function (parseCsv) {
		"use strict";
		QUnit.module("Formatting functions", {
			setup: function () {
//				this._oResourceModel = new ResourceModel({
//					bundleUrl : jQuery.sap.getModulePath("rsh.watchlist.ui5", "/i18n/i18n.properties")
//				});
			},
			teardown: function () {
//				this._oResourceModel.destroy();
			}
		});

		QUnit.test("Should parse csv", function (assert) {
			const csv = parseCsv(`"col1","colWith  ""  2" ,"col3,comma;semi" \n1  ,  string ,"quotedString"`)
			console.log(csv)
			assert.deepEqual(csv, [{0:"col1", 1:`colWith  "  2`, 2:"col3,comma;semi"}, {0:"1  ",1:"  string ", 2:"quotedString"}])
		});

		QUnit.test("Should parse empty csv", function (assert) {
			const csv = parseCsv(``)
			assert.deepEqual(csv, [])
		});

		QUnit.test("Should parse csv with last lin lf", function (assert) {
			const csv = parseCsv(`"col1","colWith  ""  2" ,"col3,comma;semi" \n1  ,  string ,"quotedString"\n`)
			console.log(csv)
			assert.deepEqual(csv, [{0:"col1", 1:`colWith  "  2`, 2:"col3,comma;semi"}, {0:"1  ",1:"  string ", 2:"quotedString"}])
		});

		QUnit.test("Should parse csv with last lin lf no quote", function (assert) {
			const csv = parseCsv(`"col1","colWith  ""  2" ,"col3,comma;semi" \n1  ,  string ,notQuotedString\n`)
			console.log(csv)
			assert.deepEqual(csv, [{0:"col1", 1:`colWith  "  2`, 2:"col3,comma;semi"}, {0:"1  ",1:"  string ", 2:"notQuotedString"}])
		});

		QUnit.test("Should add 2 + 2", function (assert) {
			// Arrange
//			var	oViewStub = {
//				getModel: this.stub().withArgs("i18n").returns(this._oResourceModel)
//			};
//			var oControllerStub = {
//				getView: this.stub().returns(oViewStub)
//			};
			// System under test
	//		var fnIsolatedFormatter = formatter.statusText.bind(oControllerStub);
			// Assert
//			assert.strictEqual(fnIsolatedFormatter("A"), "New", "The long text for status A is correct");
//			assert.strictEqual(fnIsolatedFormatter("B"), "In Progress", "The long text for status B is correct");
//			assert.strictEqual(fnIsolatedFormatter("C"), "Done", "The long text for status C is correct");
//			assert.strictEqual(fnIsolatedFormatter("Foo"), "Foo", "The long text for status Foo is correct");
            assert.strictEqual(2 + 2, 4,"2+2=4 usually")
		});
	}
);