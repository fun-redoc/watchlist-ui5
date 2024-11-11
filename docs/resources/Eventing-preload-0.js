//@ui5-bundle Eventing-preload-0.js
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/security/encodeCSS", ["sap/base/strings/toHex"], function(toHex) {
	"use strict";

	/**
	 * RegExp and escape function for CSS escaping
	 */
	// eslint-disable-next-line no-control-regex -- special characters are really needed here!
	var rCSS = /[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\xff\u2028\u2029][0-9A-Fa-f]?/g;

	var fnCSS = function(sChar) {
		var iChar = sChar.charCodeAt(0);
		if (sChar.length === 1) {
			return "\\" + toHex(iChar);
		} else {
			return "\\" + toHex(iChar) + " " + sChar.substr(1);
		}
	};

	/*
	 * Encoding according to the Secure Programming Guide
	 * <SAPWIKI>/wiki/display/NWCUIAMSIM/XSS+Secure+Programming+Guide
	 */

	/**
	 * Encode the string for inclusion into CSS string literals or identifiers.
	 *
	 * @function
	 * @since 1.58
	 * @alias module:sap/base/security/encodeCSS
	 * @param {string} sString The string to be escaped
	 * @returns {string} The encoded string
	 * @SecValidate {0|return|XSS} validates the given string for a CSS context
	 * @public
	 */
	var fnEncodeCSS = function(sString) {
		return sString.replace(rCSS, fnCSS);
	};
	return fnEncodeCSS;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/security/encodeXML", ["sap/base/strings/toHex"], function(toHex) {
	"use strict";


	/* eslint-disable no-control-regex -- special characters are really needed here! */
	/**
	 * RegExp and escape function for HTML escaping
	 */
	var rHtml = /[\x00-\x2b\x2f\x3a-\x40\x5b-\x5e\x60\x7b-\xff\u2028\u2029]/g,
		rHtmlReplace = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/,
		mHtmlLookup = {
			"<": "&lt;",
			">": "&gt;",
			"&": "&amp;",
			"\"": "&quot;"
		};
	/* eslint-enable no-control-regex */

	var fnHtml = function(sChar) {
		var sEncoded = mHtmlLookup[sChar];
		if (!sEncoded) {
			if (rHtmlReplace.test(sChar)) {
				sEncoded = "&#xfffd;";
			} else {
				sEncoded = "&#x" + toHex(sChar.charCodeAt(0)) + ";";
			}
			mHtmlLookup[sChar] = sEncoded;
		}
		return sEncoded;
	};

	/*
	 * Encoding according to the Secure Programming Guide
	 * <SAPWIKI>/wiki/display/NWCUIAMSIM/XSS+Secure+Programming+Guide
	 */

	/**
	 * Encode the string for inclusion into XML content/attribute.
	 *
	 * @function
	 * @since 1.58
	 * @alias module:sap/base/security/encodeXML
	 * @param {string} sString The string to be escaped
	 * @returns {string} The encoded string
	 * @SecValidate {0|return|XSS} validates the given string for XML contexts
	 * @public
	 */
	var fnEncodeXML = function(sString) {
		return sString.replace(rHtml, fnHtml);
	};
	return fnEncodeXML;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/strings/camelize", [], function() {
	"use strict";

	var rCamelCase = /-(.)/ig;

	/**
	 * Transforms a hyphen separated string to a camel case string.
	 *
	 * @example
	 * sap.ui.require(["sap/base/strings/camelize"], function(camelize){
	 *      camelize("foo-bar"); // "fooBar"
	 * });
	 *
	 * @function
	 * @since 1.58
	 * @alias module:sap/base/strings/camelize
	 * @param {string} sString Hyphen separated string
	 * @returns {string} The transformed string
	 * @public
	 * @SecPassthrough {0|return}
	 */
	var fnCamelize = function (sString) {
		return sString.replace( rCamelCase, function( sMatch, sChar ) {
			return sChar.toUpperCase();
		});
	};
	return fnCamelize;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/strings/capitalize", [], function() {
	"use strict";

	/**
	 * Converts first character of the string to upper case.
	 *
	 * @example
	 * sap.ui.require(["sap/base/strings/capitalize"], function(capitalize){
	 *      capitalize("foobar"); // "Foobar"
	 * });
	 *
	 * @function
	 * @since 1.58
	 * @alias module:sap/base/strings/capitalize
	 * @public
	 * @param {string} sString String for which first character should be converted
	 * @returns {string} String input with first character uppercase
	 * @SecPassthrough {0|return}
	 */
	var fnCapitalize = function (sString) {
		return sString.charAt(0).toUpperCase() + sString.substring(1);
	};
	return fnCapitalize;

});


/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/strings/escapeRegExp", [], function() {
	"use strict";

	var rEscapeRegExp = /[[\]{}()*+?.\\^$|]/g;

	/**
	 * Escapes all characters that would have a special meaning in a regular expression.
	 *
	 * This method can be used when a string with arbitrary content has to be integrated
	 * into a regular expression and when the whole string should match literally.
	 *
	 * @example
	 * sap.ui.require(["sap/base/strings/escapeRegExp"], function(escapeRegExp) {
	 *
	 *    var text = "E=m*c^2"; // text to search
	 *    var search = "m*c";   // text to search for
	 *
	 *    text.match( new RegExp(              search  ) ); // [ "c" ]
	 *    text.match( new RegExp( escapeRegExp(search) ) ); // [ "m*c" ]
	 *
	 * });
	 *
	 * @function
	 * @since 1.58
	 * @alias module:sap/base/strings/escapeRegExp
	 * @param {string} sString String to escape
	 * @returns {string} The escaped string
	 * @public
	 * @SecPassthrough {0|return}
	 */
	var fnEscapeRegExp = function (sString) {
		return sString.replace(rEscapeRegExp, "\\$&");
	};
	return fnEscapeRegExp;

});


/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*
 * IMPORTANT: This is a private module, its API must not be used and is subject to change.
 * Code other than the OpenUI5 libraries must not introduce dependencies to this module.
 */
sap.ui.predefine("sap/base/strings/toHex", [], function() {
	"use strict";

	/**
	 * Create hex string and pad to length with zeros.
	 * @example
	 * sap.ui.require(["sap/base/strings/toHex"], function(toHex){
	 *      toHex(10, 2); // "0a"
	 *      toHex(16, 2); // "10"
	 * });
	 *
	 * @function
	 * @since 1.58
	 * @private
	 * @alias module:sap/base/strings/toHex
	 * @param {int} iChar UTF-16 character code
	 * @param {int} [iLength=0] number of padded zeros
	 * @returns {string} padded hex representation of the given character code
	 */
	var fnToHex = function(iChar, iLength) {
		var sHex = iChar.toString(16);
		if (iLength) {
			sHex = sHex.padStart(iLength, '0');
		}
		return sHex;
	};
	return fnToHex;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*
 * IMPORTANT: This is a private module, its API must not be used and is subject to change.
 * Code other than the OpenUI5 libraries must not introduce dependencies to this module.
 */

sap.ui.predefine("sap/base/util/JSTokenizer", [], function() {
	"use strict";

	/*
	 * The following code has been taken from the component JSON in JavaScript
	 * from Douglas Crockford which is licensed under Public Domain
	 * (http://www.json.org/ > JavaScript > json-2). The code contains
	 * local modifications.
	 *
	 * Git URL: https://github.com/douglascrockford/JSON-js/blob/ff55d8d4513b149e2511aee01c3a61d372837d1f/json_parse.js
	 */

	/**
	 * @class Tokenizer for JS values.
	 *
	 * Contains functions to consume tokens on an input string.
	 *
	 * @example
	 * sap.ui.require(["sap/base/util/JSTokenizer"], function(JSTokenizer){
	 *      JSTokenizer().parseJS("{test:'123'}"); // {test:'123'}
	 * });
	 *
	 * @alias module:sap/base/util/JSTokenizer
	 * @since 1.58
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	var JSTokenizer = function() {

		this.at; // The index of the current character
		this.ch; // The current character
		this.escapee = {
			'"': '"',
			'\'': '\'',
			'\\': '\\',
			'/': '/',
			b: '\b',
			f: '\f',
			n: '\n',
			r: '\r',
			t: '\t'
		};
		this.text;
	};


	JSTokenizer.prototype.error = function(m) {

		// Call error when something is wrong.
		throw {
			name: 'SyntaxError',
			message: m,
			at: this.at,
			text: this.text
		};
	};

	JSTokenizer.prototype.next = function(c) {

		// If a c parameter is provided, verify that it matches the current character.
		if (c && c !== this.ch) {
			this.error("Expected '" + c + "' instead of '" + this.ch + "'");
		}

		// Get the next character. When there are no more characters,
		// return the empty string.
		this.ch = this.text.charAt(this.at);
		this.at += 1;
		return this.ch;
	};

	JSTokenizer.prototype.number = function() {

		// Parse a number value.
		var number, string = '';

		if (this.ch === '-') {
			string = '-';
			this.next('-');
		}
		while (this.ch >= '0' && this.ch <= '9') {
			string += this.ch;
			this.next();
		}
		if (this.ch === '.') {
			string += '.';
			while (this.next() && this.ch >= '0' && this.ch <= '9') {
				string += this.ch;
			}
		}
		if (this.ch === 'e' || this.ch === 'E') {
			string += this.ch;
			this.next();
			if (this.ch === '-' || this.ch === '+') {
				string += this.ch;
				this.next();
			}
			while (this.ch >= '0' && this.ch <= '9') {
				string += this.ch;
				this.next();
			}
		}
		number = +string;
		if (!isFinite(number)) {
			this.error("Bad number");
		} else {
			return number;
		}
	};

	JSTokenizer.prototype.string = function() {

		// Parse a string value.
		var hex, i, string = '', quote,
			uffff;

		// When parsing for string values, we must look for " and \ characters.
		if (this.ch === '"' || this.ch === '\'') {
			quote = this.ch;
			while (this.next()) {
				if (this.ch === quote) {
					this.next();
					return string;
				}
				if (this.ch === '\\') {
					this.next();
					if (this.ch === 'u') {
						uffff = 0;
						for (i = 0; i < 4; i += 1) {
							hex = parseInt(this.next(), 16);
							if (!isFinite(hex)) {
								break;
							}
							uffff = uffff * 16 + hex;
						}
						string += String.fromCharCode(uffff);
					} else if (typeof this.escapee[this.ch] === 'string') {
						string += this.escapee[this.ch];
					} else {
						break;
					}
				} else {
					string += this.ch;
				}
			}
		}
		this.error("Bad string");
	};

	JSTokenizer.prototype.name = function() {

		// Parse a name value.
		var name = '',
			allowed = function(ch) {
				return ch === "_" || ch === "$" ||
					(ch >= "0" && ch <= "9") ||
					(ch >= "a" && ch <= "z") ||
					(ch >= "A" && ch <= "Z");
			};

		if (allowed(this.ch)) {
			name += this.ch;
		} else {
			this.error("Bad name");
		}

		while (this.next()) {
			if (this.ch === ' ') {
				this.next();
				return name;
			}
			if (this.ch === ':') {
				return name;
			}
			if (allowed(this.ch)) {
				name += this.ch;
			} else {
				this.error("Bad name");
			}
		}
		this.error("Bad name");
	};

	JSTokenizer.prototype.white = function() {

		// Skip whitespace.
		while (this.ch && this.ch <= ' ') {
			this.next();
		}
	};

	JSTokenizer.prototype.word = function() {

		// true, false, or null.
		switch (this.ch) {
		case 't':
			this.next('t');
			this.next('r');
			this.next('u');
			this.next('e');
			return true;
		case 'f':
			this.next('f');
			this.next('a');
			this.next('l');
			this.next('s');
			this.next('e');
			return false;
		case 'n':
			this.next('n');
			this.next('u');
			this.next('l');
			this.next('l');
			return null;
		}
		this.error("Unexpected '" + this.ch + "'");
	};

		//value, // Place holder for the value function.
	JSTokenizer.prototype.array = function() {

		// Parse an array value.
		var array = [];

		if (this.ch === '[') {
			this.next('[');
			this.white();
			if (this.ch === ']') {
				this.next(']');
				return array; // empty array
			}
			while (this.ch) {
				array.push(this.value());
				this.white();
				if (this.ch === ']') {
					this.next(']');
					return array;
				}
				this.next(',');
				this.white();
			}
		}
		this.error("Bad array");
	};

	var object = function() {

		// Parse an object value.
		var key, object = {};

		if (this.ch === '{') {
			this.next('{');
			this.white();
			if (this.ch === '}') {
				this.next('}');
				return object; // empty object
			}
			while (this.ch) {
				if (this.ch >= "0" && this.ch <= "9") {
					key = this.number();
				} else if (this.ch === '"' || this.ch === '\'') {
					key = this.string();
				} else {
					key = this.name();
				}
				this.white();
				this.next(':');
				if (Object.hasOwn(object, key)) {
					this.error('Duplicate key "' + key + '"');
				}
				object[key] = this.value();
				this.white();
				if (this.ch === '}') {
					this.next('}');
					return object;
				}
				this.next(',');
				this.white();
			}
		}
		this.error("Bad object");
	};

	JSTokenizer.prototype.value = function() {

		// Parse a JS value. It could be an object, an array, a string, a number,
		// or a word.
		this.white();
		switch (this.ch) {
			case '{':
				return object.call(this);
			case '[':
				return this.array();
			case '"':
			case '\'':
				return this.string();
			case '-':
				return this.number();
			default:
				return this.ch >= '0' && this.ch <= '9' ? this.number() : this.word();
		}
	};

	/**
	 * Returns the index of the current character.
	 *
	 * @private
	 * @returns {int} The current character's index.
	 */
	JSTokenizer.prototype.getIndex = function() {
		return this.at - 1;
	};

	JSTokenizer.prototype.getCh = function() {
		return this.ch;
	};

	JSTokenizer.prototype.init = function(sSource, iIndex) {
		this.text = sSource;
		this.at = iIndex || 0;
		this.ch = ' ';
	};

	/**
	 * Advances the index in the text to <code>iIndex</code>. Fails if the new index
	 * is smaller than the previous index.
	 *
	 * @private
	 * @param {int} iIndex - the new index
	 */
	JSTokenizer.prototype.setIndex = function(iIndex) {
		if (iIndex < this.at - 1) {
			throw new Error("Must not set index " + iIndex
				+ " before previous index " + (this.at - 1));
		}
		this.at = iIndex;
		this.next();
	};

	/**
	 * Return the parse function. It will have access to all of the above
	 * functions and variables.
	 *
	 * @private
	 * @ui5-restricted sap.ui.core
	 * @static
	 * @param {string} sSource The js source
	 * @param {int} iStart The start position
	 * @returns {object} the JavaScript object
	 */
	JSTokenizer.parseJS = function(sSource, iStart) {

		var oJSTokenizer = new JSTokenizer();
		var result;
		oJSTokenizer.init(sSource, iStart);
		result = oJSTokenizer.value();

		if ( isNaN(iStart) ) {
			oJSTokenizer.white();
			if (oJSTokenizer.getCh()) {
				oJSTokenizer.error("Syntax error");
			}
			return result;
		} else {
			return { result : result, at : oJSTokenizer.getIndex()};
		}

	};

	return JSTokenizer;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/deepClone", ["./isPlainObject"], function(isPlainObject) {
	"use strict";

	/**
	 * Creates a deep clone of the source value.
	 *
	 * Only arrays, JavaScript Date objects and objects that pass the {@link module:sap/base/util/isPlainObject isPlainObject}
	 * check will be cloned. For other object types, a <code>TypeError</code> will be thrown as there's no standard way
	 * to clone them. Primitive values (boolean, number, string) as well as <code>null</code> and <code>undefined</code>
	 * will be copied, they have value semantics anyhow.
	 *
	 * <code>deepClone</code> is designed to match the semantics of {@link module:sap/base/util/deepEqual deepEqual}.
	 * Any deeply cloned object should be deep-equal to the source. However, not every object that can be handled
	 * by <code>deepEqual</code> can also be deeply cloned (e.g. <code>deepClone</code> fails on non-plain objects).
	 *
	 * To limit the time needed for a deep clone and to avoid endless recursion in case of cyclic structures, the
	 * recursion depth is limited by the parameter <code>maxDepth</code>, which defaults to 10. When the recursion
	 * depth exceeds the given limit, a <code>TypeError</code> is thrown.
	 *
	 * Note that object identities are not honored by the clone operation. If the original source contained multiple
	 * references to the same plain object instance, the clone will contain a different clone for each reference.
	 *
	 * @example <caption>Simple operation</caption>
	 * var oSource = { a: 1, b: { x: "test", y : 5.0 }, c: new Date(), d: null };
	 * var oClone = deepClone(oValue);
	 *
	 * deepEqual(oClone, oSource); // true
	 * oClone !== oSource; // true
	 * oClone.b !== oSource.b; // true
	 * oClone.c !== oSource.c; // true
	 *
	 * @example <caption>Object Identities</caption>
	 * var oCommon = { me: "unique" };
	 * var oValue = { a: oCommon, b: oCommon };
	 * var oClone = deepClone(oValue);
	 *
	 * deepEqual(oClone, oSource); // true
	 * oSource.a === oSource.b; // true
	 * oClone.a === oClone.b; // false
	 * deepEqual(oClone.a, oClone.b); // true
	 *
	 * @since 1.63
	 * @public
	 * @alias module:sap/base/util/deepClone
	 * @param {any} src Source value that shall be cloned
	 * @param {int} [maxDepth=10] Maximum recursion depth for the clone operation, deeper structures will throw an error
	 * @returns {any} A clone of the source value
	 * @throws {TypeError} When a non-plain object is encountered or when the max structure depth is exceeded
	 */
	var fnDeepClone = function(src, maxDepth) {
		if (!maxDepth) {
			maxDepth = 10;
		}
		return clone(src, 0, maxDepth);
	};

	function clone(src, depth, maxDepth) {
		// avoid endless recursion due to cyclic structures
		if (depth > maxDepth) {
			throw new TypeError("The structure depth of the source exceeds the maximum depth (" + maxDepth + ")");
		}

		if (src == null) {
			return src;
		} else if (src instanceof Date) {
			if (src.clone) { // sap.ui.core.date.UI5Date
				return src.clone();
			}

			// clone date object using #getTime(). Officially the date constructor does not support parameter Date.
			return new Date(src.getTime());
		} else if (Array.isArray(src)) {
			return cloneArray(src, depth, maxDepth);
		} else if (typeof src === "object") {
			return cloneObject(src, depth, maxDepth);
		} else {
			return src;
		}
	}

	function cloneArray(src, depth, maxDepth) {
		var aClone = [];
		for (var i = 0; i < src.length; i++) {
			aClone.push(clone(src[i], depth + 1, maxDepth));
		}

		return aClone;
	}

	function cloneObject(src, depth, maxDepth) {
		if (!isPlainObject(src)) {
			throw new TypeError("Cloning is only supported for plain objects");
		}

		var oClone = {};

		for (var key in src) {
			if (key === "__proto__") {
				continue;
			}
			oClone[key] = clone(src[key], depth + 1, maxDepth);
		}

		return oClone;
	}

	return fnDeepClone;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides an abstraction for BindingInfos
sap.ui.predefine("sap/ui/base/BindingInfo", [
	"sap/base/config",
	"sap/ui/base/DesignTime",
	"sap/ui/core/getCompatibilityVersion",
	"sap/ui/base/BindingParser",
	"sap/ui/model/BindingMode",
	"sap/base/Log"
],
	function(BaseConfig, DesignTime, getCompatibilityVersion, BindingParser, BindingMode) {
	"use strict";

	// Marker to not 'forget' ui5Objects
	var sUI5ObjectMarker = Symbol("ui5object");

	/**
	 * This module is responsible for the following tasks:
	 *   - extracting and parsing binding-info objects
	 *   - creating Property, Object and Aggregation binding-infos
	 *   - providing the UI5-object marker symbol
	 *   - exposing and defaulting the BindingParser
	 *
	 * @alias sap.ui.base.BindingInfo
	 * @namespace
	 * @private
	 * @ui5-restricted sap.ui.base, sap.ui.core
	 */
	var BindingInfo = {
		/**
		 * Creates a new property binding-info object based on the given raw definition.
		 * @param {sap.ui.base.ManagedObject.PropertyBindingInfo} oBindingInfo raw binding info object
		 * @returns {object} valid property binding-info
		 * @private
		 * @ui5-restricted sap.ui.base, sap.ui.core
		 */
		createProperty: function(oBindingInfo) {
			var iSeparatorPos;

			// only one binding object with one binding specified
			if (!oBindingInfo.parts) {
				oBindingInfo.parts = [];
				oBindingInfo.parts[0] = {
					path: oBindingInfo.path,
					targetType: oBindingInfo.targetType,
					type: oBindingInfo.type,
					suspended: oBindingInfo.suspended,
					formatOptions: oBindingInfo.formatOptions,
					constraints: oBindingInfo.constraints,
					model: oBindingInfo.model,
					mode: oBindingInfo.mode,
					value: oBindingInfo.value
				};
				delete oBindingInfo.path;
				delete oBindingInfo.targetType;
				delete oBindingInfo.mode;
				delete oBindingInfo.model;
				delete oBindingInfo.value;
			}

			for ( var i = 0; i < oBindingInfo.parts.length; i++ ) {

				// Plain strings as parts are taken as paths of bindings
				var oPart = oBindingInfo.parts[i];
				if (typeof oPart == "string") {
					oPart = { path: oPart };
					oBindingInfo.parts[i] = oPart;
				}

				// if a model separator is found in the path, extract model name and path
				if (oPart.path !== undefined) {
					iSeparatorPos = oPart.path.indexOf(">");
					if (iSeparatorPos > 0) {
						oPart.model = oPart.path.substr(0, iSeparatorPos);
						oPart.path = oPart.path.substr(iSeparatorPos + 1);
					}
				}
				// if a formatter exists the binding mode can be one way or one time only
				if (oBindingInfo.formatter &&
					oPart.mode != BindingMode.OneWay &&
					oPart.mode != BindingMode.OneTime) {
						oPart.mode = BindingMode.OneWay;
				}
			}

			//Initialize skip properties
			oBindingInfo.skipPropertyUpdate = 0;
			oBindingInfo.skipModelUpdate = 0;
			return oBindingInfo;
		},

		/**
		 * Creates a new aggregation binding-info object based on the given raw definition.
		 * @param {sap.ui.base.ManagedObject.AggregationBindingInfo} oBindingInfo raw binding info object
		 * @returns {object} valid aggregation binding-info
		 * @private
		 * @ui5-restricted sap.ui.base, sap.ui.core
		 */
		createAggregation: function(oBindingInfo, bDoesNotRequireFactory) {
			if (!(oBindingInfo.template || oBindingInfo.factory)) {
				// If aggregation is marked correspondingly in the metadata, factory can be omitted (usually requires an updateXYZ method)
				if ( bDoesNotRequireFactory ) {
					// add a dummy factory as property 'factory' is used to distinguish between property- and list-binding
					oBindingInfo.factory = function() {
						throw new Error("dummy factory called unexpectedly ");
					};
				}
			} else if (oBindingInfo.template) {
				// if we have a template we will create a factory function
				oBindingInfo.factory = function(sId) {
					return oBindingInfo.template.clone(sId);
				};
			}

			// if a model separator is found in the path, extract model name and path
			var iSeparatorPos = oBindingInfo.path.indexOf(">");
			if (iSeparatorPos > 0) {
				oBindingInfo.model = oBindingInfo.path.substr(0, iSeparatorPos);
				oBindingInfo.path = oBindingInfo.path.substr(iSeparatorPos + 1);
			}
			return oBindingInfo;
		},

		/**
		 * Creates a new object binding-info object based on the given raw definition.
		 * @param {sap.ui.base.ManagedObject.ObjectBindingInfo} oBindingInfo raw binding info object
		 * @returns {object} valid object binding-info
		 * @private
		 * @ui5-restricted sap.ui.base, sap.ui.core
		 */
		createObject: function(oBindingInfo) {
			var iSeparatorPos;

			// if a model separator is found in the path, extract model name and path
			iSeparatorPos = oBindingInfo.path.indexOf(">");
			if (iSeparatorPos > 0) {
				oBindingInfo.model = oBindingInfo.path.substr(0, iSeparatorPos);
				oBindingInfo.path = oBindingInfo.path.substr(iSeparatorPos + 1);
			}
			return oBindingInfo;
		},

		/**
		 * See {@link sap.ui.base.ManagedObject#extractBindingInfo}
		 */
		extract: function(oValue, oScope, bDetectValue) {
			var oBindingInfo;
			// property:{path:"path", template:oTemplate}
			if (oValue && typeof oValue === "object") {
				if (oValue.Type) {
					// if value contains the 'Type' property (capital 'T'), this is not a binding info.
					oBindingInfo = undefined;
				} else if (oValue[sUI5ObjectMarker]) {
					// no bindingInfo, delete marker
					delete oValue[sUI5ObjectMarker];
				} else if (oValue.ui5object) {
					// if value contains ui5object property, this is not a binding info,
					// remove it and not check for path or parts property
					delete oValue.ui5object;
				} else if (oValue.path != undefined || oValue.parts || (bDetectValue && oValue.value != undefined)) {
					oBindingInfo = oValue;
				}
			}

			// property:"{path}" or "\{path\}"
			if (typeof oValue === "string") {
				// either returns a binding info or an unescaped string or undefined - depending on binding syntax
				oBindingInfo = BindingInfo.parse(oValue, oScope, true);
			}
			return oBindingInfo;
		},
		escape: function () {
			return BindingInfo.parse.escape.apply(this, arguments);
		},

		/**
		 * Checks whether a BindingInfo is ready to create its Binding.
		 *
		 * @param {sap.ui.core.PropertyBindingInfo | sap.ui.core.AggregationBindingInfo | sap.ui.core.ObjectBindingInfo} oBindingInfo The BindingInfo to check
		 * @param {sap.ui.core.ManagedObject} oObject The bound ManagedObject
		 * @returns {boolean} if the BindingInfo is ready or not
		 * @private
		 * @ui5-restricted sap.ui.base, sap.ui.core, sap.ui.model
		 */
		isReady: function(oBindingInfo, oObject) {
			const aParts = oBindingInfo.parts;

			if (aParts) { // PropertyBinding
				return oBindingInfo.parts.every((oPart) => {
					return oPart.value !== undefined || oObject.getModel(oPart.model);
				});
			} else { // AggregationBinding or ObjectBinding
				return !!oObject.getModel(oBindingInfo.model);
			}
		},

		UI5ObjectMarker: sUI5ObjectMarker
	};

	/**
	 * @deprecated As of Version 1.119
	 */
	function getBindingSyntax() {
		var sBindingSyntax = BaseConfig.get({
			name: "sapUiBindingSyntax",
			type: BaseConfig.Type.String,
			defaultValue: "default",
			freeze: true
		});
		if ( sBindingSyntax === "default" ) {
			sBindingSyntax = (getCompatibilityVersion("sapCoreBindingSyntax").compareTo("1.26") < 0) ? "simple" : "complex";
		}
		return sBindingSyntax;
	}

	Object.defineProperty(BindingInfo, "parse", {
		get: function () {
			if (!this.oParser) {
				this.oParser = BindingParser.complexParser;
				/**
				 * Note: "simple" binding syntax is deprecated since 1.24
				 * @deprecated As of Version 1.119
				 */
				this.oParser = getBindingSyntax() === "simple" ? BindingParser.simpleParser : BindingParser.complexParser;
				if (DesignTime.isDesignModeEnabled() == true) {
					BindingParser._keepBindingStrings = true;
				}
			}
			return this.oParser;
		},
		set: function (parser) {
			this.oParser = parser;
		}
	});

	return BindingInfo;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides static class sap.ui.base.BindingParser
sap.ui.predefine("sap/ui/base/BindingParser", [
	'./ExpressionParser',
	'sap/ui/model/BindingMode',
	'sap/ui/model/Filter',
	'sap/ui/model/Sorter',
	"sap/base/future",
	"sap/base/util/JSTokenizer",
	"sap/base/util/resolveReference"
], function(
	ExpressionParser,
	BindingMode,
	Filter,
	Sorter,
	future,
	JSTokenizer,
	resolveReference
) {
	"use strict";

	/**
	 * @static
	 * @namespace
	 * @alias sap.ui.base.BindingParser
	 */
	var BindingParser = {
			_keepBindingStrings : false
		};

	/**
	 * Regular expression to check for a (new) object literal.
	 */
	var rObject = /^\{\s*('|"|)[a-zA-Z$_][a-zA-Z0-9$_]*\1\s*:/;

	/**
	 * Regular expression to split the binding string into hard coded string fragments and embedded bindings.
	 *
	 * Also handles escaping of '{' and '}'.
	 */
	var rFragments = /(\\[\\\{\}])|(\{)/g;

	/**
	 * Regular expression to escape potential binding chars
	 */
	var rBindingChars = /([\\\{\}])/g;

	/**
	 * Creates a composite formatter which calls <code>fnRootFormatter</code> on the results of the
	 * given formatters, which in turn are called on the original arguments.
	 *
	 * @param {function[]} aFormatters
	 *   list of leaf-level formatters
	 * @param {function} [fnRootFormatter]
	 *   root level formatter; default: <code>Array.prototype.join(., " ")</code>
	 * @return {function}
	 *   a composite formatter
	 */
	function composeFormatters(aFormatters, fnRootFormatter) {
		var bRequiresIContext = aFormatters.some(function (fnFormatter) {
				return fnFormatter.requiresIContext; // Note: it's either true or missing here
			});

		function formatter(oInterface) {
			var i,
				n = aFormatters.length,
				aArguments = arguments,
				aResults = new Array(n);

			for (i = 0; i < n; i += 1) {
				if (aFormatters[i].requiresIContext) {
					aArguments = arguments;
				} else if (bRequiresIContext) { // drop oInterface
					aArguments = Array.prototype.slice.call(arguments, 1);
				}
				aResults[i] = aFormatters[i].apply(this, aArguments);
			}

			if (fnRootFormatter) {
				return fnRootFormatter.apply(this, aResults);
			}
			// @see sap.ui.model.CompositeBinding#getExternalValue
			// "default: multiple values are joined together as space separated list if no
			//  formatter or type specified"
			return n > 1 ? aResults.join(" ") : aResults[0];
		}

		if (bRequiresIContext) {
			formatter.requiresIContext = true;
		}
		// @see sap.ui.base.ManagedObject#_bindProperty
		formatter.textFragments = fnRootFormatter && fnRootFormatter.textFragments
			|| "sap.ui.base.BindingParser: composeFormatters";
		return formatter;
	}

	/**
	 * Helper to create a formatter function. Only used to reduce the closure size of the formatter
	 *
	 * @param {number[]|string[]} aFragments
	 *   array of fragments, either a literal text or the index of the binding's part
	 * @returns {function}
	 *   a formatter function
	 */
	function makeFormatter(aFragments) {
		var fnFormatter = function() {
				var aResult = [],
					l = aFragments.length,
					i;

				for (i = 0; i < l; i++) {
					if ( typeof aFragments[i] === "number" ) {
						// a numerical fragment references the part with the same number
						aResult.push(arguments[aFragments[i]]);
					} else {
						// anything else is a string fragment
						aResult.push(aFragments[i]);
					}
				}
				return aResult.join('');
			};
		fnFormatter.textFragments = aFragments;
		return fnFormatter;
	}

	/**
	 * Creates a binding info object with the given path.
	 *
	 * If the path contains a model specifier (prefix separated with a '>'),
	 * the <code>model</code> property is set as well and the prefix is
	 * removed from the path.
	 *
	 * @param {string} sPath
	 *   the given path
	 * @param {object} [oEnv]
	 *   the "environment"
	 * @returns {object}
	 *   a binding info object
	 */
	function makeSimpleBindingInfo(sPath, oEnv) {
		var iPos = sPath.indexOf(">"),
			oBindingInfo = { path : sPath };

		if ( iPos > 0 ) {
			oBindingInfo.model = sPath.slice(0,iPos);
			oBindingInfo.path = sPath.slice(iPos + 1);
		}
		if (oEnv?.mLocals && oBindingInfo.path.includes("@@")) {
			oBindingInfo.parameters = {scope : oEnv.mLocals};
		}

		return oBindingInfo;
	}


	/**
	 * Delegates to <code>BindingParser.mergeParts</code>, but stifles any errors.
	 *
	 * @param {object} oBindingInfo
	 *   a binding info object
	 * @param {string} [sBinding]
	 *   the original binding string as a detail for error logs
	 */
	function mergeParts(oBindingInfo, sBinding) {
		try {
			BindingParser.mergeParts(oBindingInfo);
		} catch (e) {
			future.errorThrows("Cannot merge parts: " + e.message, sBinding,
				"sap.ui.base.BindingParser");
			// rely on error in ManagedObject
		}
	}

	function resolveBindingInfo(oEnv, oBindingInfo) {
		var mVariables = Object.assign({".": oEnv.oContext}, oEnv.mLocals);

		/*
		 * Resolves a function name to a function.
		 *
		 * Names can consist of multiple segments, separated by dots.
		 *
		 * If the name starts with a dot ('.'), lookup happens within the given context only;
		 * otherwise it will first happen within the given context (only if
		 * <code>bPreferContext</code> is set) and then use <code>mLocals</code> to resolve
		 * the function and finally fall back to the global context (window).
		 *
		 * @param {object} o Object from which the property should be read and resolved
		 * @param {string} sProp name of the property to resolve
		 */
		function resolveRef(o,sProp) {
			if ( typeof o[sProp] === "string" ) {
				var sName = o[sProp];

				o[sProp] = resolveReference(o[sProp], mVariables, {
					preferDotContext: oEnv.bPreferContext,
					bindDotContext: !oEnv.bStaticContext
				});

				if (typeof (o[sProp]) !== "function") {
					if (oEnv.bTolerateFunctionsNotFound) {
						oEnv.aFunctionsNotFound = oEnv.aFunctionsNotFound || [];
						oEnv.aFunctionsNotFound.push(sName);
					} else {
						future.errorThrows(sProp + " function " + sName + " not found!");
					}
				}
			}
		}

		/*
		 * Resolves a data type name and configuration either to a type constructor or to a type instance.
		 *
		 * The name is resolved locally (against oEnv.oContext) if it starts with a '.', otherwise against
		 * the oEnv.mLocals and if it's still not resolved, against the global context (window).
		 *
		 * The resolution is done in place. If the name resolves to a function, it is assumed to be the
		 * constructor of a data type. A new instance will be created, using the values of the
		 * properties 'constraints' and 'formatOptions' as parameters of the constructor.
		 * Both properties will be removed from <code>o</code>.
		 *
		 * @param {object} o Object from which a property should be read and resolved
		 */
		function resolveType(o) {
			var FNType;
			var sType = o.type;
			if (typeof sType === "string" ) {
				FNType = resolveReference(sType, mVariables, {
					bindContext: false,
					// only when types aren't expected to be loaded asynchronously, we try to use a
					// probing-require to fetch it in case it can't be resolved with 'mVariables'
					useProbingRequire: !oEnv.aTypePromises
				});

				var fnInstantiateType = function(TypeClass) {
					if (typeof TypeClass === "function") {
						o.type = new TypeClass(o.formatOptions, o.constraints);
					} else {
						o.type = TypeClass;
					}

					if (!o.type) {
						future.errorThrows("Failed to resolve type '" + sType + "'. Maybe not loaded or a typo?");
					}

					// TODO why are formatOptions and constraints also removed for an already instantiated type?
					// TODO why is a value of type object not validated (instanceof Type)
					delete o.formatOptions;
					delete o.constraints;
				};

				if (oEnv.aTypePromises) {
					var pType;

					// FNType is either:
					//    a) a function
					//       * a lazy-stub
					//       * a regular constructor function
					//    b) an object that must implement Type interface (we take this "as-is")
					//    c) undefined, we try to interpret the original string as a module name then
					if (typeof FNType === "function" && !FNType._sapUiLazyLoader ||
						FNType && typeof FNType === "object") {
						pType = Promise.resolve(fnInstantiateType(FNType));
					} else {
						// load type asynchronously
						pType = new Promise(function(fnResolve, fnReject) {
							sap.ui.require([sType.replace(/\./g, "/")], fnResolve, fnReject);
						}).catch(function(oError){
							// [Compatibility]: We must not throw an error during type creation (except constructor failures!).
							//                  We catch any require() rejection and log the error.
							future.errorThrows(oError);
						}).then(fnInstantiateType);
					}

					oEnv.aTypePromises.push(pType);
				} else {
					fnInstantiateType(FNType);
				}
			}
		}

		/*
		 * Resolves a map of event listeners, keyed by the event name.
		 *
		 * Each listener can be the name of a single function that will be resolved
		 * in the given context (oEnv).
		 */
		function resolveEvents(oEvents) {
			if ( oEvents != null && typeof oEvents === 'object' ) {
				for ( var sName in oEvents ) {
					resolveRef(oEvents, sName);
				}
			}
		}

		/*
		 * Converts filter definitions to sap.ui.model.Filter instances.
		 *
		 * The value of the given property can either be a single filter definition object
		 * which will be fed into the constructor of sap.ui.model.Filter.
		 * Or it can be an array of such objects.
		 *
		 * If any of the filter definition objects contains a property named 'filters',
		 * that property will be resolved as filters recursively.
		 *
		 * A property 'test' will be resolved as function in the given context.
		 */
		function resolveFilters(o, sProp) {
			var v = o[sProp];

			if ( Array.isArray(v) ) {
				v.forEach(function(oObject, iIndex) {
					resolveFilters(v, iIndex);
				});
				return;
			}

			if ( v && typeof v === 'object' ) {
				resolveRef(v, 'test');
				resolveFilters(v, 'filters');
				resolveFilters(v, 'condition');
				o[sProp] = new Filter(v);
			}
		}

		/*
		 * Converts sorter definitions to sap.ui.model.Sorter instances.
		 *
		 * The value of the given property can either be a single sorter definition object
		 * which then will be fed into the constructor of sap.ui.model.Sorter, or it can
		 * be an array of such objects.
		 *
		 * Properties 'group' and 'comparator' in any of the sorter definitions
		 * will be resolved as functions in the given context (oEnv).
		 */
		function resolveSorters(o, sProp) {
			var v = o[sProp];

			if ( Array.isArray(v) ) {
				v.forEach(function(oObject, iIndex) {
					resolveSorters(v, iIndex);
				});
				return;
			}

			if ( v && typeof v === 'object' ) {
				resolveRef(v, "group");
				resolveRef(v, "comparator");
				o[sProp] = new Sorter(v);
			}
		}

		if ( typeof oBindingInfo === 'object' ) {
			// Note: this resolves deeply nested bindings although CompositeBinding doesn't support them
			if ( Array.isArray(oBindingInfo.parts) ) {
				oBindingInfo.parts.forEach(function(oPart) {
					resolveBindingInfo(oEnv, oPart);
				});
			}
			resolveType(oBindingInfo);
			resolveFilters(oBindingInfo,'filters');
			resolveSorters(oBindingInfo,'sorter');
			resolveEvents(oBindingInfo.events);
			resolveRef(oBindingInfo,'formatter');
			resolveRef(oBindingInfo,'factory'); // list binding
			resolveRef(oBindingInfo,'groupHeaderFactory'); // list binding
			if (oEnv.mLocals && oBindingInfo.path?.includes("@@")
					&& oBindingInfo.parameters?.scope === undefined) {
				oBindingInfo.parameters ??= {};
				oBindingInfo.parameters.scope = oEnv.mLocals;
			}
		}

		return oBindingInfo;
	}

	/**
	 * Determines the binding info for the given string sInput starting at the given iStart and
	 * returns an object with the corresponding binding info as <code>result</code> and the
	 * position where to continue parsing as <code>at</code> property.
	 *
	 * @param {object} oEnv
	 *   the "environment"
	 * @param {object} oEnv.oContext
	 *   the context object from complexBinding (read-only)
	 * @param {boolean} oEnv.bTolerateFunctionsNotFound
	 *   if <code>true</code>, unknown functions are gathered in aFunctionsNotFound, otherwise an
	 *   error is logged (read-only)
	 * @param {string[]} oEnv.aFunctionsNotFound
	 *   a list of functions that could not be found if oEnv.bTolerateFunctionsNotFound is true
	 *   (append only)
	 * @param {string} sInput
	 *   The input string from which to resolve an embedded binding
	 * @param {int} iStart
	 *   The start index for binding resolution in the input string
	 * @returns {object}
	 *   An object with the following properties:
	 *   result: The binding info for the embedded binding
	 *   at: The position after the last character for the embedded binding in the input string
	 */
	function resolveEmbeddedBinding(oEnv, sInput, iStart) {
		var parseObject = JSTokenizer.parseJS,
			oParseResult,
			iEnd;

		// an embedded binding: check for a property name that would indicate a complex object
		if ( rObject.test(sInput.slice(iStart)) ) {
			oParseResult = parseObject(sInput, iStart);
			resolveBindingInfo(oEnv, oParseResult.result);
			return oParseResult;
		}
		// otherwise it must be a simple binding (path only)
		iEnd = sInput.indexOf('}', iStart);
		if ( iEnd < iStart ) {
			throw new SyntaxError("no closing braces found in '" + sInput + "' after pos:" + iStart);
		}
		return {
			result: makeSimpleBindingInfo(sInput.slice(iStart + 1, iEnd), oEnv),
			at: iEnd + 1
		};
	}

	BindingParser.simpleParser = function(sString) {
		// The simpleParser only needs the first string argument and additionally in the async case the 7th one.
		// see "BindingParser.complexParser" for the other arguments
		var bResolveTypesAsync = arguments[7];

		var oBindingInfo;
		if ( sString.startsWith("{") && sString.endsWith("}") ) {
			oBindingInfo = makeSimpleBindingInfo(sString.slice(1, -1));
		}

		if (bResolveTypesAsync) {
			return {
				bindingInfo: oBindingInfo,
				resolved: Promise.resolve()
			};
		}

		return oBindingInfo;
	};

	BindingParser.simpleParser.escape = function(sValue) {
		// there was no escaping defined for the simple parser
		return sValue;
	};

	/*
	 * @param {boolean} [bTolerateFunctionsNotFound=false]
	 *   if true, function names which cannot be resolved to a reference are reported via the
	 *   string array <code>functionsNotFound</code> of the result object; else they are logged
	 *   as errors
	 * @param {boolean} [bStaticContext=false]
	 *   If true, relative function names found via <code>oContext</code> will not be treated as
	 *   instance methods of the context, but as static methods.
	 * @param {boolean} [bPreferContext=false]
	 *   if true, names without an initial dot are searched in the given context first and then
	 *   globally
	 * @param {object} [mLocals]
	 *   variables allowed in the expression as map of variable name to its value
	 * @param {boolean} [bResolveTypesAsync]
	 *   whether the Type classes should be resolved asynchronously.
	 *   The parsing result is enriched with an additional Promise capturing all transitive Type loading.
	 */
	BindingParser.complexParser = function(sString, oContext, bUnescape,
			bTolerateFunctionsNotFound, bStaticContext, bPreferContext, mLocals, bResolveTypesAsync) {
		var b2ndLevelMergedNeeded = false, // whether some 2nd level parts again have parts
			oBindingInfo = {parts:[]},
			bMergeNeeded = false, // whether some top-level parts again have parts
			oEnv = {
				oContext: oContext,
				mLocals: mLocals,
				aFunctionsNotFound: undefined, // lazy creation
				bPreferContext : bPreferContext,
				bStaticContext: bStaticContext,
				bTolerateFunctionsNotFound: bTolerateFunctionsNotFound,
				aTypePromises: bResolveTypesAsync ? [] : undefined
			},
			aFragments = [],
			bUnescaped,
			p = 0,
			m,
			oEmbeddedBinding;

		/**
		 * Parses an expression. Sets the flags accordingly.
		 *
		 * @param {string} sInput The input string to parse from
		 * @param {int} iStart The start index
		 * @param {sap.ui.model.BindingMode} oBindingMode the binding mode
		 * @returns {object} a result object with the binding in <code>result</code> and the index
		 * after the last character belonging to the expression in <code>at</code>
		 * @throws SyntaxError if the expression string is invalid
		 */
		function expression(sInput, iStart, oBindingMode) {
			var oBinding = ExpressionParser.parse(resolveEmbeddedBinding.bind(null, oEnv), sString,
					iStart, null, mLocals || (bStaticContext ? oContext : null));

			/**
			 * Recursively sets the mode <code>oBindingMode</code> on the given binding (or its
			 * parts).
			 *
			 * @param {object} oBinding
			 *   a binding which may be composite
			 * @param {int} [iIndex]
			 *   index provided by <code>forEach</code>
			 */
			function setMode(oBinding, iIndex) {
				if (oBinding.parts) {
					oBinding.parts.forEach(function (vPart, i) {
						if (typeof vPart === "string") {
							vPart = oBinding.parts[i] = {path : vPart};
						}
						setMode(vPart, i);
					});
					b2ndLevelMergedNeeded = b2ndLevelMergedNeeded || iIndex !== undefined;
				} else {
					oBinding.mode = oBindingMode;
				}
			}

			if (sInput.charAt(oBinding.at) !== "}") {
				throw new SyntaxError("Expected '}' and instead saw '"
					+ sInput.charAt(oBinding.at)
					+ "' in expression binding "
					+ sInput
					+ " at position "
					+ oBinding.at);
			}
			oBinding.at += 1;
			if (oBinding.result) {
				setMode(oBinding.result);
			} else {
				aFragments[aFragments.length - 1] = String(oBinding.constant);
				bUnescaped = true;
			}
			return oBinding;
		}

		rFragments.lastIndex = 0; //previous parse call may have thrown an Error: reset lastIndex
		while ( (m = rFragments.exec(sString)) !== null ) {

			// check for a skipped literal string fragment
			if ( p < m.index ) {
				aFragments.push(sString.slice(p, m.index));
			}

			// handle the different kinds of matches
			if ( m[1] ) {

				// an escaped opening bracket, closing bracket or backslash
				aFragments.push(m[1].slice(1));
				bUnescaped = true;

			} else {
				aFragments.push(oBindingInfo.parts.length);
				if (sString.indexOf(":=", m.index) === m.index + 1) {
					oEmbeddedBinding = expression(sString, m.index + 3, BindingMode.OneTime);
				} else if (sString.charAt(m.index + 1) === "=") { //expression
					oEmbeddedBinding = expression(sString, m.index + 2, BindingMode.OneWay);
				} else {
					oEmbeddedBinding = resolveEmbeddedBinding(oEnv, sString, m.index);
				}
				if (oEmbeddedBinding.result) {
					oBindingInfo.parts.push(oEmbeddedBinding.result);
					bMergeNeeded = bMergeNeeded || "parts" in oEmbeddedBinding.result;
				}
				rFragments.lastIndex = oEmbeddedBinding.at;
			}

			// remember where we are
			p = rFragments.lastIndex;
		}

		// check for a trailing literal string fragment
		if ( p < sString.length ) {
			aFragments.push(sString.slice(p));
		}

		// only if a part has been found we can return a binding info
		if (oBindingInfo.parts.length > 0) {
			// Note: aFragments.length >= 1
			if ( aFragments.length === 1 /* implies: && typeof aFragments[0] === "number" */ ) {
				// special case: a single binding only
				oBindingInfo = oBindingInfo.parts[0];
				bMergeNeeded = b2ndLevelMergedNeeded;
			} else {
				// create the formatter function from the fragments
				oBindingInfo.formatter = makeFormatter(aFragments);
			}
			if (bMergeNeeded) {
				mergeParts(oBindingInfo, sString);
			}
			if (BindingParser._keepBindingStrings) {
				oBindingInfo.bindingString = sString;
			}
			if (oEnv.aFunctionsNotFound) {
				oBindingInfo.functionsNotFound = oEnv.aFunctionsNotFound;
			}

			if (bResolveTypesAsync) {
				// parse result contains additionally a Promise with all asynchronously loaded types
				return {
					bindingInfo: oBindingInfo,
					resolved: Promise.all(oEnv.aTypePromises),
					wait : oEnv.aTypePromises.length > 0
				};
			}

			return oBindingInfo;
		} else if ( bUnescape && bUnescaped ) {
			var sResult = aFragments.join('');
			if (bResolveTypesAsync) {
				return {
					bindingInfo: sResult,
					resolved: Promise.resolve()
				};
			}
			return sResult;
		}

	};

	BindingParser.complexParser.escape = function(sValue) {
		return sValue.replace(rBindingChars, "\\$1");
	};

	/**
	 * Merges the given binding info object's parts, which may have parts themselves, into a flat
	 * list of parts, taking care of existing formatter functions. If the given binding info does
	 * not have a root formatter, <code>Array.prototype.join(., " ")</code> is used instead.
	 * Parts which are not binding info objects are also supported; they are removed from the
	 * "parts" array and taken care of by the new root-level formatter function, which feeds them
	 * into the old formatter function at the right place.
	 *
	 * Note: Truly hierarchical composite bindings are not yet supported. This method deals with a
	 * special case of a two-level hierarchy which can be turned into a one-level hierarchy. The
	 * precondition is that the parts which have parts themselves are not too complex, i.e. must
	 * have no other properties than "formatter" and "parts". A missing formatter on that level
	 * is replaced with the default <code>Array.prototype.join(., " ")</code>.
	 *
	 * @param {object} oBindingInfo
	 *   a binding info object with a possibly empty array of parts and a new formatter function
	 * @throws {Error}
	 *   in case precondition is not met
	 * @private
	 */
	BindingParser.mergeParts = function (oBindingInfo) {
		var aFormatters = [],
			aParts = [];

		oBindingInfo.parts.forEach(function (vEmbeddedBinding) {
			var iEnd,
				fnFormatter = function () {
					return vEmbeddedBinding; // just return constant value
				},
				sName,
				iStart = aParts.length;

			/*
			 * Selects the overall argument corresponding to the current part.
			 *
			 * @returns {any}
			 *   the argument at index <code>iStart</code>
			 */
			function select() {
				return arguments[iStart];
			}

			// @see sap.ui.base.ManagedObject#extractBindingInfo
			if (vEmbeddedBinding && typeof vEmbeddedBinding === "object") {
				if (vEmbeddedBinding.parts) {
					for (sName in vEmbeddedBinding) {
						if (sName !== "formatter" && sName !== "parts") {
							throw new Error("Unsupported property: " + sName);
						}
					}

					aParts = aParts.concat(vEmbeddedBinding.parts);
					iEnd = aParts.length;
					if (vEmbeddedBinding.formatter) {
						if (vEmbeddedBinding.formatter.requiresIContext === true) {
							fnFormatter = function (oInterface) {
								// old formatter needs to operate on its own slice of overall args
								var aArguments
									= Array.prototype.slice.call(arguments, iStart + 1, iEnd + 1);

								aArguments.unshift(oInterface._slice(iStart, iEnd));

								return vEmbeddedBinding.formatter.apply(this, aArguments);
							};
							fnFormatter.requiresIContext = true;
						} else {
							fnFormatter = function () {
								// old formatter needs to operate on its own slice of overall args
								return vEmbeddedBinding.formatter.apply(this,
									Array.prototype.slice.call(arguments, iStart, iEnd));
							};
						}
					} else if (iEnd - iStart > 1) {
						fnFormatter = function () {
							// @see sap.ui.model.CompositeBinding#getExternalValue
							// "default: multiple values are joined together as space separated
							//  list if no formatter or type specified"
							return Array.prototype.slice.call(arguments, iStart, iEnd).join(" ");
						};
					} else {
						fnFormatter = select;
					}
				} else if ("path" in vEmbeddedBinding) {
					aParts.push(vEmbeddedBinding);
					fnFormatter = select;
				}
			}
			aFormatters.push(fnFormatter);
		});

		oBindingInfo.parts = aParts;
		oBindingInfo.formatter = composeFormatters(aFormatters, oBindingInfo.formatter);
	};

	/**
	 * Parses a string <code>sInput</code> with an expression. The input string is parsed starting
	 * at the index <code>iStart</code> and the return value contains the index after the last
	 * character belonging to the expression.
	 *
	 * @param {string} sInput
	 *   the string to be parsed
	 * @param {int} iStart
	 *   the index to start parsing
	 * @param {object} [oEnv]
	 *   the "environment" (see resolveEmbeddedBinding function for details)
	 * @param {object} [mLocals]
	 *   variables allowed in the expression as map of variable name to value
	 * @returns {object}
	 *   the parse result with the following properties
	 *   <ul>
	 *    <li><code>result</code>: the binding info as an object with the properties
	 *     <code>formatter</code> (the formatter function to evaluate the expression) and
	 *     <code>parts</code> (an array of the referenced bindings)</li>
	 *    <li><code>at</code>: the index of the first character after the expression in
	 *     <code>sInput</code></li>
	 *   </ul>
	 * @throws SyntaxError
	 *   If the expression string is invalid or unsupported. The at property of
	 *   the error contains the position where parsing failed.
	 * @private
	 */
	BindingParser.parseExpression = function (sInput, iStart, oEnv, mLocals) {
		oEnv = oEnv || {};

		if (mLocals) {
			oEnv.mLocals = mLocals;
		}

		return ExpressionParser.parse(resolveEmbeddedBinding.bind(null, oEnv), sInput, iStart, mLocals);
	};

	return BindingParser;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/base/DesignTime", [
	"sap/base/config"
], (
	BaseConfig
) => {
	"use strict";

	/**
	 * Provides DesignTime related config options
	 *
	 * @alias module:sap/ui/base/DesignTime
	 * @namespace
	 * @private
	 * @ui5-restricted sap.ui.core.Core, sap.watt, com.sap.webide, sap.ui.fl, sap.ui.rta, sap.ui.comp, SAP Business Application Studio
	 * @since 1.120.0
	 */
	const DesignTime = {
		/**
		 * Return whether the design mode is active or not.
		 *
		 * @returns {boolean} whether the design mode is active or not.
		 * @private
		 * @ui5-restricted sap.ui.core.Core, sap.watt, com.sap.webide, sap.ui.fl, sap.ui.rta, sap.ui.comp, SAP Business Application Studio
		 * @since 1.120.0
		 */
		isDesignModeEnabled() {
			return BaseConfig.get({
				name: "sapUiXxDesignMode",
				type: BaseConfig.Type.Boolean,
				external: true,
				freeze: true
			});
		},
		/**
		 * Return whether the activation of the controller code is suppressed.
		 *
		 * @returns {boolean} whether the activation of the controller code is suppressed or not
		 * @private
		 * @ui5-restricted sap.watt, com.sap.webide
		 * @since 1.120.0
		 */
		isControllerCodeDeactivationSuppressed() {
			return BaseConfig.get({
				name: "sapUiXxSuppressDeactivationOfControllerCode",
				type: BaseConfig.Type.Boolean,
				external: true,
				freeze: true
			});
		},
		/**
		 * Return whether the controller code is deactivated. During design mode the.
		 *
		 * @returns {boolean} whether the activation of the controller code is suppressed or not
		 * @private
		 * @ui5-restricted sap.watt, com.sap.webide
		 * @since 1.120.0
		 */
		isControllerCodeDeactivated() {
			return DesignTime.isDesignModeEnabled() && !DesignTime.isControllerCodeDeactivationSuppressed();
		}
	};

	return DesignTime;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/base/ExpressionParser", [
	"sap/base/Log",
	"sap/base/strings/escapeRegExp",
	"sap/base/util/deepEqual",
	"sap/base/util/JSTokenizer",
	"sap/ui/performance/Measurement",
	"sap/ui/thirdparty/URI"
], function (Log, escapeRegExp, deepEqual, JSTokenizer, Measurement, URI) {
	"use strict";

	//SAP's Independent Implementation of "Top Down Operator Precedence" by Vaughan R. Pratt,
	//    see http://portal.acm.org/citation.cfm?id=512931
	//Inspired by "TDOP" of Douglas Crockford which is also an implementation of Pratt's article
	//    see https://github.com/douglascrockford/TDOP
	//License granted by Douglas Crockford to SAP, Apache License 2.0
	//    (http://www.apache.org/licenses/LICENSE-2.0)
	//
	//led = "left denotation"
	//lbp = "left binding power", for values see
	//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence
	//nud = "null denotation"
	//rbp = "right binding power"
	var fnUndefined = CONSTANT.bind(null, undefined),
		mDefaultGlobals = {
			"Array": Array,
			"Boolean": Boolean,
			"Date": Date,
			"encodeURIComponent": encodeURIComponent,
			"Infinity": Infinity,
			"isFinite": isFinite,
			"isNaN": isNaN,
			"JSON": JSON,
			"Math": Math,
			"NaN": NaN,
			"Number": Number,
			"Object": Object,
			"odata": {
				"collection": function (aElements) {
					return aElements.filter(function (vElement) {
						return vElement !== undefined;
					});
				},
				"compare": function () {
					var oODataUtils = sap.ui.require("sap/ui/model/odata/v4/ODataUtils");

					/** @deprecated As of version 1.120.0 */
					if (!oODataUtils) {
						oODataUtils = sap.ui.requireSync("sap/ui/model/odata/v4/ODataUtils");
					}
					if (!oODataUtils) {
						throw new TypeError("Expression uses 'odata.compare' which requires to"
							+ " import 'sap/ui/model/odata/v4/ODataUtils' in advance");
					}

					return oODataUtils.compare.apply(oODataUtils, arguments);
				},
				"fillUriTemplate": function (sExpression, mData) {
					/** @deprecated As of version 1.120.0 */
					if (!URI.expand) {
						// probing is not required since the presence of URI.expand is the indicator
						// that URITemplate has been loaded already
						/* URITemplate = */ sap.ui.requireSync("sap/ui/thirdparty/URITemplate");
					}
					if (!URI.expand) {
						throw new TypeError("Expression uses 'odata.fillUriTemplate' which requires"
							+ " to import 'sap/ui/thirdparty/URITemplate' in advance");
					}

					return URI.expand(sExpression.trim(), mData).toString();
				},
				"uriEncode": function () {
					var oODataUtils = sap.ui.require("sap/ui/model/odata/ODataUtils");

					/** @deprecated As of version 1.120.0 */
					if (!oODataUtils) {
						oODataUtils = sap.ui.requireSync("sap/ui/model/odata/ODataUtils");
					}
					if (!oODataUtils) {
						throw new TypeError("Expression uses 'odata.uriEncode' which requires to"
							+ " import 'sap/ui/model/odata/ODataUtils' in advance");
					}

					return oODataUtils.formatValue.apply(oODataUtils, arguments);
				}
			},
			"parseFloat": parseFloat,
			"parseInt": parseInt,
			"RegExp": RegExp,
			"String": String,
			"undefined": undefined
		},
		rDigit = /\d/,
		sExpressionParser = "sap.ui.base.ExpressionParser",
		rIdentifier = /[a-z_$][a-z0-9_$]*/i,
		rIdentifierStart = /[a-z_$]/i,
		aPerformanceCategories = [sExpressionParser],
		sPerformanceParse = sExpressionParser + "#parse",
		mSymbols = { //symbol table
			"BINDING": {
				led: unexpected, // Note: cannot happen due to lbp: 0
				nud: function (oToken, oParser) {
					return BINDING.bind(null, oToken.value);
				}
			},
			"ERROR": {
				lbp: Infinity,
				led: function (oToken, oParser, fnLeft) {
					error(oToken.value.message, oToken.value.text, oToken.value.at);
				},
				nud: function (oToken, oParser) {
					error(oToken.value.message, oToken.value.text, oToken.value.at);
				}
			},
			"IDENTIFIER": {
				led: unexpected, // Note: cannot happen due to lbp: 0
				nud: function (oToken, oParser) {
					if (!(oToken.value in oParser.globals)) {
						Log.warning("Unsupported global identifier '" + oToken.value
								+ "' in expression parser input '" + oParser.input + "'",
							undefined,
							sExpressionParser);
					}
					return CONSTANT.bind(null, oParser.globals[oToken.value]);
				}
			},
			"CONSTANT": {
				led: unexpected, // Note: cannot happen due to lbp: 0
				nud: function (oToken, oParser) {
					return CONSTANT.bind(null, oToken.value);
				}
			},
			".": {
				lbp: 18,
				led: function (oToken, oParser, fnLeft) {
					return DOT.bind(null, fnLeft, oParser.advance("IDENTIFIER").value);
				},
				nud: unexpected
			},
			"(": {
				lbp: 17,
				led: function (oToken, oParser, fnLeft) {
					var aArguments = [],
						bFirst = true;

					while (oParser.current().id !== ")") {
						if (bFirst) {
							bFirst = false;
						} else {
							oParser.advance(","); //consume "," from predecessor argument
						}
						aArguments.push(oParser.expression(0));
					}
					oParser.advance(")");
					return FUNCTION_CALL.bind(null, fnLeft, aArguments);
				},
				nud: function (oToken, oParser) {
					var fnValue = oParser.expression(0);

					oParser.advance(")");
					return fnValue;
				}
			},
			"[": {
				lbp: 18,
				led: function (oToken, oParser, fnLeft) {
					var fnName = oParser.expression(0);

					oParser.advance("]");
					return PROPERTY_ACCESS.bind(null, fnLeft, fnName);
				},
				nud: function (oToken, oParser) {
					var aElements = [],
						bFirst = true;

					while (oParser.current().id !== "]") {
						if (bFirst) {
							bFirst = false;
						} else {
							oParser.advance(","); //consume "," from predecessor element
						}
						aElements.push(
							oParser.current().id === "," ? fnUndefined : oParser.expression(0));
					}
					oParser.advance("]");
					return ARRAY.bind(null, aElements);
				}
			},
			"!": {
				lbp: 15,
				led: unexpected,
				nud: function (oToken, oParser) {
					return UNARY.bind(null, oParser.expression(this.lbp), function (x) {
							return !x;
						});
				}
			},
			"typeof": {
				lbp: 15,
				led: unexpected,
				nud: function (oToken, oParser) {
					return UNARY.bind(null, oParser.expression(this.lbp), function (x) {
							return typeof x;
						});
				}
			},
			"?": {
				lbp: 4,
				led: function (oToken, oParser, fnLeft) {
					var fnElse, fnThen;

					fnThen = oParser.expression(this.lbp - 1);
					oParser.advance(":");
					fnElse = oParser.expression(this.lbp - 1);
					return CONDITIONAL.bind(null, fnLeft, fnThen, fnElse);
				},
				nud: unexpected
			},
			")": {
				led: unexpected,
				nud: unexpected
			},
			"]": {
				led: unexpected,
				nud: unexpected
			},
			"{": {
				led: unexpected,
				nud: function (oToken, oParser) {
					var bFirst = true,
						sKey,
						mMap = {},
						fnValue;

					while (oParser.current().id !== "}") {
						if (bFirst) {
							bFirst = false;
						} else {
							oParser.advance(",");
						}
						if (oParser.current() && oParser.current().id === "CONSTANT"
								&& typeof oParser.current().value === "string") {
							sKey = oParser.advance().value;
						} else {
							sKey = oParser.advance("IDENTIFIER").value;
						}
						oParser.advance(":");
						fnValue = oParser.expression(0);
						mMap[sKey] = fnValue;
					}
					oParser.advance("}");
					return MAP.bind(null, mMap);
				}
			},
			"}": {
				lbp: -1, // Note: also terminates end of our input!
				led: unexpected,
				nud: unexpected
			},
			",": {
				led: unexpected,
				nud: unexpected
			},
			":": {
				led: unexpected,
				nud: unexpected
			}
		},
		//Fix length tokens. A token being a prefix of another must come last, e.g. ! after !==
		aTokens = ["===", "!==", "!", "||", "&&", ".", "(", ")", "{", "}", ":", ",", "?", "*",
			"/", "%", "+", "-", "<=", "<", ">=", ">", "[", "]"],
		rTokens;

	aTokens.forEach(function (sToken, i) {
		// Note: this function is executed at load time only!
		aTokens[i] = escapeRegExp(sToken);
	});
	rTokens = new RegExp(aTokens.join("|"), "g");

	addInfix("*", 14, function (x, y) {
		return x * y;
	});
	addInfix("/", 14, function (x, y) {
		return x / y;
	});
	addInfix("%", 14, function (x, y) {
		return x % y;
	});
	addInfix("+", 13, function (x, y) {
		return x + y;
	}).nud = function (oToken, oParser) {
		return UNARY.bind(null, oParser.expression(this.lbp), function (x) {
			return +x;
		});
	};
	addInfix("-", 13, function (x, y) {
		return x - y;
	}).nud = function (oToken, oParser) {
		return UNARY.bind(null, oParser.expression(this.lbp), function (x) {
			return -x;
		});
	};
	addInfix("<=", 11, function (x, y) {
		return x <= y;
	});
	addInfix("<", 11, function (x, y) {
		return x < y;
	});
	addInfix(">=", 11, function (x, y) {
		return x >= y;
	});
	addInfix(">", 11, function (x, y) {
		return x > y;
	});
	addInfix("in", 11, function (x, y) {
		return x in y;
	});
	addInfix("===", 10, function (x, y) {
		return x === y;
	});
	addInfix("!==", 10, function (x, y) {
		return x !== y;
	});
	addInfix("&&", 7, function (x, fnY) {
		return x && fnY();
	}, true);
	addInfix("||", 6, function (x, fnY) {
		return x || fnY();
	}, true);

	//Formatter functions to evaluate symbols like literals or operators in the expression grammar
	/**
	 * Formatter function for an array literal.
	 * @param {function[]} aElements - array of formatter functions for the array elements
	 * @param {any[]} aParts - the array of binding values
	 * @return {any[]} - the resulting array value
	 */
	function ARRAY(aElements, aParts) {
		return aElements.map(function (fnElement) {
			return fnElement(aParts);
		});
	}

	/**
	 * Formatter function for an embedded binding.
	 * @param {int} i - the index of the binding as it appears when reading the
	 *   expression from the left
	 * @param {any[]} aParts - the array of binding values
	 * @returns {any} the binding value
	 */
	function BINDING(i, aParts) {
		return clean(aParts[i]);
	}

	/**
	 * Formatter function for executing the conditional operator with the given condition, "then"
	 * and "else" clause.
	 * @param {function} fnCondition - formatter function for the condition
	 * @param {function} fnThen - formatter function for the "then" clause
	 * @param {function} fnElse - formatter function for the "else" clause
	 * @param {any[]} aParts - the array of binding values
	 * @return {any} - the value of the "then" or "else" clause, depending on the value of the
	 *   condition
	 */
	function CONDITIONAL(fnCondition, fnThen, fnElse, aParts) {
		return fnCondition(aParts) ? fnThen(aParts) : fnElse(aParts);
	}

	/**
	 * Formatter function for any constant value such as a literal or identifier.
	 * @param {any} v - any value
	 * @returns {any} the given value
	 */
	function CONSTANT(v) {
		return v;
	}

	/**
	 * Formatter function for member access via the dot operator.
	 * @param {function} fnLeft - formatter function for the left operand
	 * @param {string} sIdentifier - the identifier on the dot's right side
	 * @param {any[]} aParts - the array of binding values
	 * @param {object} [oReference]
	 *   optional side channel to return the base value (left operand) of the reference
	 * @return {any} - the left operand's member with the name
	 */
	function DOT(fnLeft, sIdentifier, aParts, oReference) {
		var oParent = fnLeft(aParts),
			vChild = oParent[sIdentifier];

		if (oReference) {
			oReference.base = oParent;
		}
		return clean(vChild);
	}

	/**
	 * Formatter function for a call to the function returned by fnLeft.
	 * @param {function} fnLeft - formatter function for the left operand: the function to call
	 * @param {function[]} aArguments - array of formatter functions for the arguments
	 * @param {any[]} aParts - the array of binding values
	 * @return {any} - the return value of the function applied to the arguments
	 */
	function FUNCTION_CALL(fnLeft, aArguments, aParts) {
		var oReference = {};

		// evaluate function expression and call it
		return clean(fnLeft(aParts, oReference).apply(oReference.base,
			aArguments.map(function (fnArgument) {
				return fnArgument(aParts); // evaluate argument
			})));
	}

	/**
	 * Formatter function for an infix operator.
	 *
	 * @param {function} fnLeft - formatter function for the left operand
	 * @param {function} fnRight - formatter function for the right operand
	 * @param {function} fnOperator
	 *   function taking two arguments which evaluates the infix operator
	 * @param {boolean} bLazy - whether the right operand is e
	 * @param {any[]} aParts - the array of binding values
	 * @return {any} - the result of the operator function applied to the two operands
	 */
	function INFIX(fnLeft, fnRight, fnOperator, bLazy, aParts) {
		return fnOperator(fnLeft(aParts),
			bLazy ? fnRight.bind(null, aParts) : fnRight(aParts));
	}

	/**
	 * Formatter function for an object literal.
	 * @param {object} mMap - map from key to formatter functions for the values
	 * @param {any[]} aParts - the array of binding values
	 * @return {object} - the resulting map
	 */
	function MAP(mMap, aParts) {
		var sKey, mResult = {};

		for (sKey in mMap) {
			mResult[sKey] = mMap[sKey](aParts); // evaluate value
		}
		return mResult;
	}

	/**
	 * Formatter function for a property access.
	 * @param {function} fnLeft - formatter function for the left operand: the array or object to
	 *   access
	 * @param {function} fnName - formatter function for the property name
	 * @param {any[]} aParts - the array of binding values
	 * @param {object} [oReference]
	 *   optional side channel to return the base value (left operand) of the reference
	 * @return {any} - the array element or object property
	 */
	function PROPERTY_ACCESS(fnLeft, fnName, aParts, oReference) {
		var oParent = fnLeft(aParts),
			sIdentifier = fnName(aParts), // BEWARE: evaluate propertyNameValue AFTER baseValue!
			vChild = oParent[sIdentifier];

		if (oReference) {
			oReference.base = oParent;
		}
		return clean(vChild);
	}

	/**
	 * Formatter function for a unary operator.
	 *
	 * @param {function} fnRight - formatter function for the operand
	 * @param {function} fnOperator
	 *   function to evaluate the unary operator taking one argument
	 * @param {any[]} aParts - the array of binding values
	 * @return {any} - the result of the operator function applied to the operand
	 */
	function UNARY(fnRight, fnOperator, aParts) {
		return fnOperator(fnRight(aParts));
	}

	/**
	 * Adds the infix operator with the given id, binding power and formatter function to the
	 * symbol table.
	 * @param {string} sId - the id of the infix operator
	 * @param {int} iBindingPower - the binding power = precedence of the infix operator
	 * @param {function} fnOperator - the function to evaluate the operator
	 * @param {boolean} [bLazy=false] - whether the right operand is lazily evaluated
	 * @return {object} the newly created symbol for the infix operator
	 */
	function addInfix(sId, iBindingPower, fnOperator, bLazy) {
		// Note: this function is executed at load time only!
		mSymbols[sId] = {
			lbp: iBindingPower,
			led: function (oToken, oParser, fnLeft) {
				//lazy evaluation is right associative: performance optimization for guard and
				//default operator, e.g. true || A || B || C does not execute the || for B and C
				var rbp = bLazy ? this.lbp - 1 : this.lbp;

				return INFIX.bind(null, fnLeft, oParser.expression(rbp),
					fnOperator, bLazy);
			},
			nud: unexpected
		};
		return mSymbols[sId];
	}

	/**
	 * Cleans the given <code>vValue</code>.
	 *
	 * @param {any} vValue - the value to be cleaned
	 * @returns {any} the cleaned value
	 */
	function clean(vValue) {
		return vValue === Function ? undefined : vValue;
	}

	/**
	 * Throws a SyntaxError with the given <code>sMessage</code> as <code>message</code>, its
	 * <code>at</code> property set to <code>iAt</code> and its <code>text</code> property to
	 * <code>sInput</code>.
	 * In addition, logs a corresponding error message to the console with <code>sInput</code>
	 * as details.
	 *
	 * @param {string} sMessage - the error message
	 * @param {string} sInput - the input string
	 * @param {int} [iAt] - the index in the input string where the error occurred; the index
	 *   starts counting at 1 to be consistent with positions provided in tokenizer error messages.
	 */
	function error(sMessage, sInput, iAt) {
		var oError = new SyntaxError(sMessage);

		oError.at = iAt;
		oError.text = sInput;
		if (iAt !== undefined) {
			sMessage += " at position " + iAt;
		}
		Log.error(sMessage, sInput, sExpressionParser);
		throw oError;
	}

	/**
	 * Throws and logs an error for the unexpected token oToken.
	 * @param {object} oToken - the unexpected token
	 */
	function unexpected(oToken) {
		// Note: position for error starts counting at 1
		error("Unexpected " + oToken.id, oToken.input, oToken.start + 1);
	}

	/**
	 * Computes the tokens according to the expression grammar in sInput starting at iStart and
	 * uses fnResolveBinding to resolve bindings embedded in the expression.
	 * @param {function} fnResolveBinding - the function to resolve embedded bindings
	 * @param {string} sInput - the string to be parsed
	 * @param {int} [iStart=0] - the index to start parsing
	 * @returns {object} Tokenization result object with the following properties
	 *   at: the index after the last character consumed by the tokenizer in the input string
	 *   parts: array with parts corresponding to resolved embedded bindings
	 *   tokens: the array of tokens where each token is a tuple of ID, optional value, and
	 *   optional source text
	 */
	function tokenize(fnResolveBinding, sInput, iStart) {
		var aParts = [], // the resulting parts (corresponds to aPrimitiveValueBindings)
			aPrimitiveValueBindings = [], // the bindings with primitive values only
			aTokens = [],
			oTokenizer = new JSTokenizer();

		/**
		 * Saves the binding as a part. Reuses an existing part if the binding is identical.
		 * @param {object} oBinding
		 *   the binding to save
		 * @param {int} iStart
		 *   the binding's start index in the input string
		 * @param {boolean} [bTargetTypeAny=false]
		 *   whether the binding's "targetType" should default to "any" (recursively, for all parts)
		 * @returns {int}
		 *   the index at which it has been saved/found in aParts
		 */
		function saveBindingAsPart(oBinding, iStart, bTargetTypeAny) {
			var bHasNonPrimitiveValue = false,
				sKey,
				oPrimitiveValueBinding,
				i;

			/*
			 * Sets the target type of the given binding to the default "any", if applicable.
			 *
			 * @param {object} oBinding
			 *   A binding
			 */
			function setTargetType(oBinding) {
				if (bTargetTypeAny) {
					if (oBinding.parts) {
						oBinding.parts.forEach(setTargetType);
						// Note: targetType not allowed here, see BindingParser.mergeParts
					} else {
						oBinding.targetType = oBinding.targetType || "any";
					}
				}
			}

			for (sKey in oBinding) {
				if (sKey === "parameters") {
					// parameters are not converted from name to object, but even a simple binding
					// may have the implicit object parameter "scope"
					continue;
				}
				switch (typeof oBinding[sKey]) {
					case "boolean":
					case "number":
					case "string":
					case "undefined":
						break;
					default:
						// binding has at least one property of non-primitive value
						bHasNonPrimitiveValue = true;
				}
			}
			setTargetType(oBinding);
			if (bHasNonPrimitiveValue) {
				// the binding must be a complex binding; property "type" (and poss. others) are
				// newly created objects and thus incomparable -> parse again to have the names
				oPrimitiveValueBinding = JSTokenizer.parseJS(sInput, iStart).result;
				setTargetType(oPrimitiveValueBinding);
			} else {
				// only primitive values; easily comparable
				oPrimitiveValueBinding = oBinding;
			}
			for (i = 0; i < aParts.length; i += 1) {
				// Note: order of top-level properties must not matter for equality!
				if (deepEqual(aPrimitiveValueBindings[i], oPrimitiveValueBinding)) {
					return i;
				}
			}
			aPrimitiveValueBindings[i] = oPrimitiveValueBinding;
			aParts[i] = oBinding;
			return i;
		}

		/**
		 * Consumes the next token in the input string and pushes it to the array of tokens.
		 *
		 * @returns {boolean} whether a token is recognized
		 * @throws {Error|Object|SyntaxError}
		 *   <code>fnResolveBinding</code> may throw <code>SyntaxError</code>;
		 *   <code>oTokenizer.setIndex()</code> may throw <code>Error</code>;
		 *   <code>oTokenizer</code> may also throw <code>{name: 'SyntaxError', ...}</code>
		 */
		function consumeToken() {
			var ch, oBinding, iIndex, aMatches, oToken;

			oTokenizer.white();
			ch = oTokenizer.getCh();
			iIndex = oTokenizer.getIndex();

			if ((ch === "$" || ch === "%") && sInput[iIndex + 1] === "{") { //binding
				oBinding = fnResolveBinding(sInput, iIndex + 1);
				oToken = {
					id: "BINDING",
					value: saveBindingAsPart(oBinding.result, iIndex + 1, ch === "%")
				};
				oTokenizer.setIndex(oBinding.at); //go to first character after binding string
			} else if (rIdentifierStart.test(ch)) {
				aMatches = rIdentifier.exec(sInput.slice(iIndex));
				switch (aMatches[0]) {
				case "false":
				case "null":
				case "true":
					oToken = {id: "CONSTANT", value: oTokenizer.word()};
					break;
				case "in":
				case "typeof":
					oToken = {id: aMatches[0]};
					oTokenizer.setIndex(iIndex + aMatches[0].length);
					break;
				default:
					oToken = {id: "IDENTIFIER", value: aMatches[0]};
					oTokenizer.setIndex(iIndex + aMatches[0].length);
				}
			} else if (rDigit.test(ch)
					|| ch === "." && rDigit.test(sInput[iIndex + 1])) {
				oToken = {id: "CONSTANT", value: oTokenizer.number()};
			} else if (ch === "'" || ch === '"') {
				oToken = {id: "CONSTANT", value: oTokenizer.string()};
			} else {
				rTokens.lastIndex = iIndex;
				aMatches = rTokens.exec(sInput);
				if (!aMatches || aMatches.index !== iIndex) {
					return false; // end of input or unrecognized character
				}
				oToken = {id: aMatches[0]};
				oTokenizer.setIndex(iIndex + aMatches[0].length);
			}
			oToken.input = sInput;
			oToken.start = iIndex;
			oToken.end = oTokenizer.getIndex();
			aTokens.push(oToken);
			return true;
		}

		oTokenizer.init(sInput, iStart);

		try {
			/* eslint-disable no-empty */
			while (consumeToken()) { /* deliberately empty */ }
			/* eslint-enable no-empty */
		} catch (e) {
			// Note: new SyntaxError().name === "SyntaxError"
			if (e.name === "SyntaxError") { // remember tokenizer error
				aTokens.push({
					id: "ERROR",
					value: e
				});
			} else {
				throw e;
			}
		}

		return {
			at: oTokenizer.getIndex(),
			parts: aParts,
			tokens: aTokens
		};
	}

	/**
	 * Returns a function which wraps the given formatter function into a try/catch block.
	 * In case of an error it is caught, a warning containing the given original input is issued,
	 * and <code>undefined</code> is returned instead.
	 *
	 * @param {function} fnFormatter - any (formatter) function
	 * @param {string} sInput - the expression string (used when logging errors)
	 * @returns {function} - the wrapped function
	 */
	function tryCatch(fnFormatter, sInput) {
		return function () {
			try {
				return fnFormatter.apply(this, arguments);
			} catch (ex) {
				Log.warning(String(ex), sInput, sExpressionParser);
			}
		};
	}

	/**
	 * Parses expression tokens to a result object as specified to be returned by
	 * {@link sap.ui.base.ExpressionParser#parse}.
	 * @param {object[]} aTokens - the array with the tokens
	 * @param {string} sInput - the expression string (used when logging errors)
	 * @param {object} mGlobals - the map of global variables
	 * @returns {object} the parse result with the following properties
	 *   formatter: the formatter function to evaluate the expression which
	 *     takes the parts corresponding to bindings embedded in the expression as
	 *     parameters; undefined in case of an invalid expression
	 *   at: the index of the first character after the expression in sInput, or
	 *     <code>undefined</code> if all tokens have been consumed
	 */
	function parse(aTokens, sInput, mGlobals) {
		var fnFormatter,
			iNextToken = 0,
			oParser = {
				advance: advance,
				current: current,
				expression: expression,
				globals: mGlobals,
				input: sInput
			},
			oToken;

		/**
		 * Returns the next token in the array of tokens and advances the index in this array.
		 * Throws an error if the next token's ID is not equal to the optional
		 * <code>sExpectedTokenId</code>.
		 * @param {string} [sExpectedTokenId] - the expected id of the next token
		 * @returns {object|undefined} - the next token or undefined if all tokens have been read
		 */
		function advance(sExpectedTokenId) {
			var oToken = aTokens[iNextToken];

			if (sExpectedTokenId) {
				if (!oToken) {
					error("Expected " + sExpectedTokenId + " but instead saw end of input",
						sInput);
				} else if (oToken.id !== sExpectedTokenId) {
					error("Expected " + sExpectedTokenId + " but instead saw "
							+ sInput.slice(oToken.start, oToken.end),
						sInput,
						oToken.start + 1);
				}
			}
			iNextToken += 1;
			return oToken;
		}

		/**
		 * Returns the next token in the array of tokens, but does not advance the index.
		 * @returns {object|undefined} - the next token or undefined if all tokens have been read
		 */
		function current() {
			return aTokens[iNextToken];
		}

		/**
		 * Parse an expression starting at the current token. Throws an error if there are no more
		 * tokens and
		 *
		 * @param {number} rbp
		 *   a "right binding power"
		 * @returns {function} The formatter function for the expression
		 */
		function expression(rbp) {
			var fnLeft;

			oToken = advance();
			if (!oToken) {
				error("Expected expression but instead saw end of input", sInput);
			}
			fnLeft = mSymbols[oToken.id].nud(oToken, oParser);

			while (iNextToken < aTokens.length) {
				oToken = current();
				if (rbp >= (mSymbols[oToken.id].lbp || 0)) {
					break;
				}
				advance();
				fnLeft = mSymbols[oToken.id].led(oToken, oParser, fnLeft);
			}

			return fnLeft;
		}

		fnFormatter = expression(0); // do this before calling current() below!
		return {
			at: current() && current().start,
			// call separate function to reduce the closure size of the formatter
			formatter: tryCatch(fnFormatter, sInput)
		};
	}

	/**
	 * The parser to parse expressions in bindings.
	 *
	 * @alias sap.ui.base.ExpressionParser
	 * @private
	 */
	return {
		/**
		 * Parses a string <code>sInput</code> with an expression based on the syntax sketched
		 * below.
		 *
		 * If a start index <code>iStart</code> for parsing is provided, the input string is parsed
		 * starting from this index and the return value contains the index after the last
		 * character belonging to the expression.
		 *
		 * The expression syntax is a subset of JavaScript expression syntax with the
		 * enhancement that the only "variable" parts in an expression are bindings.
		 * The following expression constructs are supported: <ul>
		 * <li> String literal enclosed in single or double quotes, e.g. 'foo' </li>
		 * <li> Null and Boolean literals: null, true, false </li>
		 * <li> Object and number literals, e.g. {foo:'bar'} and 3.141 </li>
		 * <li> Grouping, e.g. a * (b + c)</li>
		 * <li> Unary operators !,  +, -, typeof </li>
		 * <li> Multiplicative Operators: *, /, % </li>
		 * <li> Additive Operators: +, - </li>
		 * <li> Relational Operators: <, >, <=, >= </li>
		 * <li> Strict Equality Operators: ===, !== </li>
		 * <li> Binary Logical Operators: &&, || </li>
		 * <li> Conditional Operator: ? : </li>
		 * <li> Member access via . operator </li>
		 * <li> Function call </li>
		 * <li> Embedded binding to refer to model contents, e.g. ${myModel>/Address/city} </li>
		 * <li> Global functions and objects: encodeURIComponent, Math, RegExp </li>
		 * <li> Property Access, e.g. ['foo', 'bar'][0] or Math['PI']</li>
		 * <li> Array literal, e.g. ['foo', 'bar'] </li>
		 * </ul>
		 *
		 * @param {function} fnResolveBinding - the function to resolve embedded bindings
		 * @param {string} sInput - the string to be parsed
		 * @param {int} [iStart=0] - the index to start parsing
		 * @param {object} [mGlobals]
		 *   global variables allowed in the expression as map of variable name to its value;
		 *   note that there is a default map of known global variables
		 * @param {object} [mLocals={}]
		 *   local variables additionally allowed in the expression (shadowing global ones)
		 *   as map of variable name to its value
		 * @returns {object} the parse result with the following properties
		 *   result: object with the properties
		 *     formatter: the formatter function to evaluate the expression which
		 *       takes the parts corresponding to bindings embedded in the expression as
		 *       parameters
		 *     parts: the array of parts contained in the expression string which is
		 *       empty if no parts exist
		 *   at: the index of the first character after the expression in sInput
		 * @throws SyntaxError
		 *   If the expression string is invalid or unsupported. The at property of
		 *   the error contains the position where parsing failed.
		 */
		parse: function (fnResolveBinding, sInput, iStart, mGlobals, mLocals) {
			var oResult, oTokens;

			Measurement.average(sPerformanceParse, "", aPerformanceCategories);
			oTokens = tokenize(fnResolveBinding, sInput, iStart);
			mGlobals = mGlobals || mDefaultGlobals;
			if (mLocals) {
				mGlobals = Object.assign({}, mGlobals, mLocals);
			}
			oResult = parse(oTokens.tokens, sInput, mGlobals);
			Measurement.end(sPerformanceParse);
			if (!oTokens.parts.length) {
				return {
					constant: oResult.formatter(),
					at: oResult.at || oTokens.at
				};
			}

			function formatter() {
				//turn separate parameters for parts into one (array like) parameter
				return oResult.formatter(arguments);
			}
			formatter.textFragments = true; //use CompositeBinding even if there is only one part
			return {
				result: {
					formatter: formatter,
					parts: oTokens.parts
				},
				at: oResult.at || oTokens.at
			};
		}
	};
}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the base class for all objects with managed properties and aggregations.
sap.ui.predefine("sap/ui/base/ManagedObject", [
	"./DataType",
	"./EventProvider",
	"./ManagedObjectMetadata",
	"./Object",
	"./BindingInfo",
	"sap/ui/util/ActivityDetection",
	"sap/ui/util/_enforceNoReturnValue",
	"sap/base/future",
	"sap/base/util/ObjectPath",
	"sap/base/Log",
	"sap/base/assert",
	"sap/base/util/deepClone",
	"sap/base/util/deepEqual",
	"sap/base/util/uid",
	"sap/base/util/extend",
	"sap/base/util/isEmptyObject"
], function(
	DataType,
	EventProvider,
	ManagedObjectMetadata,
	BaseObject,
	BindingInfo,
	ActivityDetection,
	_enforceNoReturnValue,
	future,
	ObjectPath,
	Log,
	assert,
	deepClone,
	deepEqual,
	uid,
	extend,
	isEmptyObject
) {

	"use strict";

	// shortcut for the sap.ui.core.ID type
	var IDType;

	// Binding info factory symbol
	var BINDING_INFO_FACTORY_SYMBOL = Symbol("bindingInfoFactory");

	/**
	 * Constructs and initializes a managed object with the given <code>sId</code> and settings.
	 *
	 * If the optional <code>mSettings</code> are given, they must be a simple object
	 * that defines values for properties, aggregations, associations or events keyed by their name.
	 *
	 * <b>Valid Names and Value Ranges:</b>
	 *
	 * The property (key) names supported in the object literal are exactly the (case sensitive)
	 * names documented in the JSDoc for the properties, aggregations, associations and events
	 * of the current class and its base classes. Note that for 0..n aggregations and associations this
	 * name usually is the plural name, whereas it is the singular name in case of 0..1 relations.
	 *
	 * The possible values for a setting depend on its kind:
	 * <ul>
	 * <li>for simple properties, the value has to match the documented type of the property (no type conversion occurs)</li>
	 * <li>for 0..1 aggregations, the value has to be an instance of the aggregated type, or an object literal from which,
	 * the default class of the aggregation (or the corresponding aggregation type as fallback) will be instantiated.</li>
	 * <li>for 0..n aggregations, the value has to be an array of instances of the aggregated type, a single instance or
	 * an object literal from which the default class will be instantiated.</li>
	 * <li>for 0..1 associations, an instance of the associated type or an id (string) is accepted</li>
	 * <li>for 0..n associations, an array of instances of the associated type or of IDs is accepted</li>
	 * <li>for events, either a function (event handler) is accepted or an array of length 2
	 *     where the first element is a function and the 2nd element is an object to invoke the method on;
	 *     or an array of length 3, where the first element is an arbitrary payload object, the
	 *     second one is a function and the 3rd one is an object to invoke the method on;
	 *     or an array of arrays where each nested array has the 2 or 3 element structure
	 *     described before (multiple listeners).</li>
	 * </ul>
	 *
	 * Each subclass should document the name and type of its supported settings in its constructor documentation.
	 *
	 * Example usage:
	 * <pre>
	 * new Dialog({
	 *    title: "Some title text",            // property of type "string"
	 *    showHeader: true,                    // property of type "boolean"
	 *    endButton: new Button(...),          // 0..1 aggregation
	 *    content: [                           // 0..n aggregation
	 *       new Input(...),
	 *       new Input(...)
	 *    ],
	 *    afterClose: function(oEvent) { ... } // event handler function
	 * });
	 * </pre>
	 *
	 * Instead of static values and object instances, data binding expressions can be used, either embedded in
	 * a string or as a binding info object as described in {@link #bindProperty} or {@link #bindAggregation}.
	 *
	 * Example usage:
	 * <pre>
	 * new Dialog({
	 *    title: "{/title}",       // embedded binding expression, points to a string property in the data model
	 *    ...
	 *    content: {               // binding info object
	 *       path : "/inputItems", // points to a collection in the data model
	 *       template : new Input(...)
	 *    }
	 * });
	 * </pre>
	 *
	 * Note that when setting string values, any curly braces in those values need to be escaped, so they are not
	 * interpreted as binding expressions. Use {@link #escapeSettingsValue} to do so.
	 *
	 * <b>Note:</b>
	 * As of version 1.120, providing aggregation content via an object literal is deprecated,
	 * in case the object's type is given via the property 'Type' as a string, or is derived via the defined type of the aggregation.
	 * Additionally, as of version 1.120, a ManagedObject subclass can specify a <code>defaultClass</code>, e.g. for cases where only a single class is valid.
	 * Please refer to the {@link sap.ui.base.ManagedObject.MetadataOptions.Aggregation Aggregation} documentation for more details on the
	 * <code>defaultClass</code>.
	 *
	 * Besides the settings documented below, ManagedObject itself supports the following special settings:
	 * <ul>
	 * <li><code>id : <i>sap.ui.core.ID</i></code> an ID for the new instance. Some subclasses (Element, Component) require the id
	 *   to be unique in a specific scope (e.g. an Element Id must be unique across all Elements, a Component id must
	 *   be unique across all Components).
	 * <li><code>models : <i>object</i></code> a map of {@link sap.ui.model.Model} instances keyed by their model name (alias).
	 *   Each entry with key <i>k</i> in this object has the same effect as a call <code>this.setModel(models[k], k);</code>.</li>
	 * <li><code>bindingContexts : <i>object</i></code> a map of {@link sap.ui.model.Context} instances keyed by their model name.
	 *   Each entry with key <i>k</i> in this object has the same effect as a call <code>this.setBindingContext(bindingContexts[k], k);</code></li>
	 * <li><code>objectBindings : <i>object</i></code>  a map of binding paths keyed by the corresponding model name.
	 *   Each entry with key <i>k</i> in this object has the same effect as a call <code>this.bindObject(objectBindings[k], k);</code></li>
	 * <li><code>metadataContexts : <i>object</i></code>  an array of single binding contexts keyed by the corresponding model or context name.
	 *   The purpose of the <code>metadataContexts</code> special setting is to deduce as much information as possible from the binding context of the control in order
	 *   to be able to predefine certain standard properties like e.g. <i>visible, enabled, tooltip,...</i>
	 *
	 *   The structure is an array of single contexts, where a single context is a map containing the following keys:
	 *   <ul>
	 *   <li><code>path: <i>string (mandatory)</i></code> The path to the corresponding model property or object, e.g. '/Customers/Name'. A path can also be relative, e.g. 'Name'</li>
	 *   <li><code>model: <i>string (optional)</i></code> The name of the model, in case there is no name then the undefined model is taken</li>
	 *   <li><code>name: <i>string (optional)</i></code> A name for the context to used in templating phase</li>
	 *   <li><code>kind: <i>string (optional)</i></code> The kind of the adapter, either <code>field</code> for single properties or <code>object</code> for structured contexts.
	 *   <li><code>adapter: <i>string (optional)</i></code> The path to an interpretion class that dilivers control relevant data depending on the context, e.g. enabled, visible.
	 *   If not supplied the OData meta data is interpreted.</li>
	 *   </ul>
	 *   The syntax for providing the <code>metadataContexts</code> is as follows:
	 *   <code>{SINGLE_CONTEXT1},...,{SINGLE_CONTEXTn}</code> or for simplicity in case there is only one context <code>{SINGLE_CONTEXT}</code>.
	 *
	 *   Examples for such metadataContexts are:
	 *   <ul>
	 *   <li><code>{/Customers/Name}</code> a single part with an absolute path to the property <i>Name</i> of the <i>Customers</i> entity set in the default model</li>
	 *   <li><code>{path: 'Customers/Name', model:'json'}</code> a single part with an absolute path to the property <i>Name</i> of the <i>Customers</i> entity set in a named model</li>
	 *   <li><code>{parts: [{path: 'Customers/Name'},{path: 'editable', model: 'viewModel'}]}</code> a combination of single binding contexts, one context from the default model and one from the viewModel</li>
	 *   </ul></li>
	 * </ul>
	 *
	 * @param {string} [sId] ID for the new managed object; generated automatically if no non-empty ID is given
	 *      <b>Note:</b> this can be omitted, no matter whether <code>mSettings</code> will be given or not!
	 * @param {object} [mSettings] Optional map/JSON-object with initial property values, aggregated objects etc. for the new object
	 * @param {object} [oScope] Scope object for resolving string based type and formatter references in bindings.
	 *      When a scope object is given, <code>mSettings</code> cannot be omitted, at least <code>null</code> or an empty object literal must be given.
	 *
	 *
	 * @abstract
	 * @class Base Class that introduces some basic concepts, such as, state management and data binding.
	 *
	 * New subclasses of ManagedObject are created with a call to {@link #.extend ManagedObject.extend} and can make use
	 * of the following managed features:
	 *
	 *
	 * <h3>Properties</h3>
	 * Managed properties represent the state of a ManagedObject. They can store a single value of a simple data type
	 * (like 'string' or 'int'). They have a <i>name</i> (e.g. 'size') and methods to get the current value (<code>getSize</code>),
	 * or to set a new value (<code>setSize</code>). When a property is modified by calling the setter, the ManagedObject is marked as invalidated.
	 * A managed property can be bound against a property in a {@link sap.ui.model.Model} by using the {@link #bindProperty} method.
	 * Updates to the model property will be automatically reflected in the managed property and - if TwoWay databinding is active,
	 * changes to the managed property will be reflected in the model. An existing binding can be removed by calling {@link #unbindProperty}.
	 *
	 * If a ManagedObject is cloned, the clone will have the same values for its managed properties as the source of the
	 * clone - if the property wasn't bound. If it is bound, the property in the clone will be bound to the same
	 * model property as in the source.
	 *
	 * Details about the declaration of a managed property, the metadata that describes it and the set of methods that are automatically
	 * generated to access it, can be found in the documentation of the {@link sap.ui.base.ManagedObject.extend extend } method.
	 *
	 *
	 * <h3>Aggregations</h3>
	 * Managed aggregations can store one or more references to other ManagedObjects. They are a mean to control the lifecycle
	 * of the aggregated objects: one ManagedObject can be aggregated by at most one parent ManagedObject at any time.
	 * When a ManagedObject is destroyed, all aggregated objects are destroyed as well and the object itself is removed from
	 * its parent. That is, aggregations won't contain destroyed objects or null/undefined.
	 *
	 * Aggregations have a <i>name</i> ('e.g 'header' or 'items'), a <i>cardinality</i> ('0..1' or '0..n') and are of a specific
	 * <i>type</i> (which must be a subclass of ManagedObject as well or a UI5 interface). A ManagedObject will provide methods to
	 * set or get the aggregated object for a specific aggregation of cardinality 0..1 (e.g. <code>setHeader</code>, <code>getHeader</code>
	 * for an aggregation named 'header'). For an aggregation of cardinality 0..n, there are methods to get all aggregated objects
	 * (<code>getItems</code>), to locate an object in the aggregation (e.g. <code>indexOfItem</code>), to add, insert or remove
	 * a single aggregated object (<code>addItem</code>, <code>insertItem</code>, <code>removeItem</code>) or to remove or destroy
	 * all objects from an aggregation (<code>removeAllItems</code>, <code>destroyItems</code>).
	 *
	 * Details about the declaration of a managed aggregation, the metadata that describes the aggregation, and the set of methods that are automatically
	 * generated to access it, can be found in the documentation of the {@link sap.ui.base.ManagedObject.extend extend} method.
	 *
	 * Aggregations of cardinality 0..n can be bound to a collection in a model by using {@link #bindAggregation} (and unbound again
	 * using {@link #unbindAggregation}). For each context in the model collection, a corresponding object will be created in the
	 * managed aggregation, either by cloning a template object or by calling a factory function.
	 *
	 * Aggregations also control the databinding context of bound objects: by default, aggregated objects inherit all models
	 * and binding contexts from their parent object.
	 *
	 * When a ManagedObject is cloned, all aggregated objects will be cloned as well - but only if they haven't been added by
	 * databinding. In that case, the aggregation in the clone will be bound to the same model collection.
	 *
	 *
	 * <h3>Associations</h3>
	 * Managed associations also form a relationship between objects, but they don't define a lifecycle for the
	 * associated objects. They even can 'break' in the sense that an associated object might have been destroyed already
	 * although it is still referenced in an association. For the same reason, the internal storage for associations
	 * are not direct object references but only the IDs of the associated target objects.
	 *
	 * Associations have a <i>name</i> ('e.g 'initialFocus'), a <i>cardinality</i> ('0..1' or '0..n') and are of a specific <i>type</i>
	 * (which must be a subclass of ManagedObject as well or a UI5 interface). A ManagedObject will provide methods to set or get
	 * the associated object for a specific association of cardinality 0..1 (e.g. <code>setInitialFocus</code>, <code>getInitialFocus</code>).
	 * For an association of cardinality 0..n, there are methods to get all associated objects (<code>getRefItems</code>),
	 * to add, insert or remove a single associated object (<code>addRefItem</code>,
	 * <code>insertRefItem</code>, <code>removeRefItem</code>) or to remove all objects from an association
	 * (<code>removeAllRefItems</code>).
	 *
	 * Details about the declaration of a managed association, the metadata that describes it and the set of methods that are automatically
	 * generated to access it, can be found in the documentation of the {@link sap.ui.base.ManagedObject.extend extend} method.
	 *
	 * Associations can't be bound to the model.
	 *
	 * When a ManagedObject is cloned, the result for an association depends on the relationship between the associated target
	 * object and the root of the clone operation. If the associated object is part of the to-be-cloned object tree (reachable
	 * via aggregations from the root of the clone operation), then the cloned association will reference the clone of the
	 * associated object. Otherwise the association will reference the same object as in the original tree.
	 * When a ManagedObject is destroyed, other objects that are only associated, are not affected by the destroy operation.
	 *
	 *
	 * <h3>Events</h3>
	 * Managed events provide a mean for communicating important state changes to an arbitrary number of 'interested' listeners.
	 * Events have a <i>name</i> and (optionally) a set of <i>parameters</i>. For each event there will be methods to add or remove an event
	 * listener as well as a method to fire the event. (e.g. <code>attachChange</code>, <code>detachChange</code>, <code>fireChange</code>
	 * for an event named 'change').
	 *
	 * Details about the declaration of managed events, the metadata that describes the event, and the set of methods that are automatically
	 * generated to access it, can be found in the documentation of the {@link sap.ui.base.ManagedObject.extend extend} method.
	 *
	 * When a ManagedObject is cloned, all listeners registered for any event in the clone source are also registered to the
	 * clone. Later changes are not reflected in any direction (neither from source to clone, nor vice versa).
	 *
	 *
	 * <a name="lowlevelapi"><h3>Low Level APIs:</h3></a>
	 * The prototype of ManagedObject provides several generic, low level APIs to manage properties, aggregations, associations,
	 * and events. These generic methods are solely intended for implementing higher level, non-generic methods that manage
	 * a single managed property etc. (e.g. a function <code>setSize(value)</code> that sets a new value for property 'size').
	 * {@link sap.ui.base.ManagedObject.extend} creates default implementations of those higher level APIs for all managed aspects.
	 * The implementation of a subclass then can override those default implementations with a more specific implementation,
	 * e.g. to implement a side effect when a specific property is set or retrieved.
	 * It is therefore important to understand that the generic low-level methods ARE NOT SUITABLE FOR GENERIC ACCESS to the
	 * state of a managed object, as that would bypass the overriding higher level methods and their side effects.
	 *
	 * @extends sap.ui.base.EventProvider
	 * @author SAP SE
	 * @version 1.125.0
	 * @public
	 * @alias sap.ui.base.ManagedObject
	 */
	var ManagedObject = EventProvider.extend("sap.ui.base.ManagedObject", {

		metadata : {
			"abstract" : true,
			publicMethods : [ "getId", "getMetadata", "getModel", "setModel", "hasModel", "bindProperty", "unbindProperty", "bindAggregation", "unbindAggregation", "bindObject", "unbindObject", "getObjectBinding"],
			library : "sap.ui.core", // UI Library that contains this class
			properties : {
			},
			aggregations : {
			},
			associations : {},
			events : {
				/**
				 * Fired after a new value for a bound property has been propagated to the model.
				 * Only fired, when the binding uses a data type.
				 */
				"validationSuccess" : {
					enableEventBubbling : true,
					parameters : {
						/**
						 * ManagedObject instance whose property initiated the model update.
						 */
						element : { type : 'sap.ui.base.ManagedObject' },
						/**
						 * Name of the property for which the bound model property has been updated.
						 */
						property : { type : 'string' },
						/**
						 * Data type used in the binding.
						 */
						type : { type : 'sap.ui.model.Type' },
						/**
						 * New value (external representation) as propagated to the model.
						 *
						 * <b>Note: </b>the model might modify (normalize) the value again and this modification
						 * will be stored in the ManagedObject. The 'newValue' parameter of this event contains
						 * the value <b>before</b> such a normalization.
						 */
						newValue : { type : 'any' },
						/**
						 * Old value (external representation) as previously stored in the ManagedObject.
						 */
						oldValue : { type : 'any' }
					}
				},
				/**
				 * Fired when a new value for a bound property should have been propagated to the model,
				 * but validating the value failed with an exception.
				 */
				"validationError" : {
					enableEventBubbling : true,
					parameters : {
						/**
						 * ManagedObject instance whose property initiated the model update.
						 */
						element : { type : 'sap.ui.base.ManagedObject' },
						/**
						 * Name of the property for which the bound model property should have been been updated.
						 */
						property : { type : 'string' },
						/**
						 * Data type used in the binding.
						 */
						type : { type : 'sap.ui.model.Type' },
						/**
						 * New value (external representation) as parsed and validated by the binding.
						 */
						newValue : { type : 'any' },
						/**
						 * Old value (external representation) as previously stored in the ManagedObject.
						 */
						oldValue : { type : 'any' },
						/**
						 * Localized message describing the validation issues
						 */
						message: { type : 'string' }
					}
				},
				/**
				 * Fired when a new value for a bound property should have been propagated to the model,
				 * but parsing the value failed with an exception.
				 */
				"parseError" : {
					enableEventBubbling : true,
					parameters : {
						/**
						 * ManagedObject instance whose property initiated the model update.
						 */
						element : { type : 'sap.ui.base.ManagedObject' },
						/**
						 * Name of the property for which the bound model property should have been been updated.
						 */
						property : { type : 'string' },
						/**
						 * Data type used in the binding.
						 */
						type : { type : 'sap.ui.model.Type' },
						/**
						 * New value (external representation) as parsed by the binding.
						 */
						newValue : { type : 'any' },
						/**
						 * Old value (external representation) as previously stored in the ManagedObject.
						 */
						oldValue : { type : 'any' },
						/**
						 * Localized message describing the parse error
						 */
						message: { type : 'string' }
					}
				},
				/**
				 * Fired when a new value for a bound property should have been propagated from the model,
				 * but formatting the value failed with an exception.
				 */
				"formatError" : {
					enableEventBubbling : true,
					parameters : {
						/**
						 * ManagedObject instance whose property should have received the model update.
						 */
						element : { type : 'sap.ui.base.ManagedObject' },
						/**
						 * Name of the property for which the binding should have been updated.
						 */
						property : { type : 'string' },
						/**
						 * Data type used in the binding (if any).
						 */
						type : { type : 'sap.ui.model.Type' },
						/**
						 * New value (model representation) as propagated from the model.
						 */
						newValue : { type : 'any' },
						/**
						 * Old value (external representation) as previously stored in the ManagedObject.
						 */
						oldValue : { type : 'any' }
					}
				},
				/**
				 * Fired when models or contexts are changed on this object (either by calling setModel/setBindingContext or due to propagation)
				 */
				"modelContextChange" : {}
			},
			specialSettings : {

				/**
				 * Unique ID of this instance.
				 * If not given, a so called autoID will be generated by the framework.
				 * AutoIDs use a unique prefix that must not be used for Ids that the application (or other code) creates.
				 * It can be configured option 'autoIDPrefix', see {@link topic:91f2d03b6f4d1014b6dd926db0e91070 Configuration Options and URL Parameters}.
				 */
				id : 'sap.ui.core.ID',

				/**
				 * A map of model instances to which the object should be attached.
				 * The models are keyed by their model name. For the default model, String(undefined) is expected.
				 */
				models : 'object',

				/**
				 * A map of model instances to which the object should be attached.
				 * The models are keyed by their model name. For the default model, String(undefined) is expected.
				 */
				bindingContexts : 'object',

				/**
				 * A map of model instances to which the object should be attached.
				 * The models are keyed by their model name. For the default model, String(undefined) is expected.
				 */
				objectBindings : 'object',

				/**
				 * A map of model instances to which the object should be attached.
				 * The models are keyed by their model name. For the default model, String(undefined) is expected.
				 * The special setting is only for internal use.
				 */
				metadataContexts: 'object',

				/**
				 * Used by ManagedObject.create.
				 */
				Type : { type: 'string', visibility: 'hidden' }
			}
		},

		constructor : function(sId, mSettings, oScope) {

			EventProvider.call(this); // no use to pass our arguments

			const that = this;

			if ( typeof sId !== 'string' && sId !== undefined ) {
				// shift arguments in case sId was missing, but mSettings was given
				oScope = mSettings;
				mSettings = sId;
				sId = mSettings && mSettings.id;
			}

			if (!sId) {
				sId = this.getMetadata().uid();
			} else {
				var preprocessor = ManagedObject._fnIdPreprocessor;
				sId = (preprocessor ? preprocessor.call(this, sId) : sId);
				var oType = IDType || (IDType = DataType.getType("sap.ui.core.ID"));
				if (!oType.isValid(sId)) {
					throw new Error("\"" + sId + "\" is not a valid ID.");
				}
			}
			this.sId = sId;

			// managed object interface
			// create an empty property bag that uses a map of defaultValues as its prototype
			this.mProperties = this.getMetadata().createPropertyBag();
			this.mAggregations = {};
			this.mAssociations = {};

			// private properties
			this.oParent = null;

			this.aDelegates = [];
			this.aBeforeDelegates = [];
			this.iSuppressInvalidate = 0;
			this.oPropagatedProperties = ManagedObject._oEmptyPropagatedProperties;
			this.mSkipPropagation = {};
			this._bIsOwnerActive = true;

			// data binding
			this.oModels = {};
			this.aPropagationListeners = [];
			this.oBindingContexts = {};
			this.mElementBindingContexts = {};
			this.mBindingInfos = {};
			this.mObjectBindingInfos = {};

			// contextual settings
			this._oContextualSettings = ManagedObject._defaultContextualSettings;

			// apply the owner id if defined
			this._sOwnerId = ManagedObject._sOwnerId;

			// make sure that the object is registered before initializing
			// and to deregister the object in case of errors
			(function() {
				var bCreated = false;

				// registers the object in the Core
				// If registration fails (e.g. due to a duplicate ID), the finally block must not be executed.
				// Otherwise, the already existing object would be deregistered mistakenly
				if (that.register) {
					that.register();
				}

				try {
					// TODO: generic concept for init hooks?
					if ( that._initCompositeSupport ) {
						that._initCompositeSupport(mSettings);
					}

					// Call init method here instead of specific Controls constructor.
					if (that.init) {
						_enforceNoReturnValue(that.init(), /*mLogInfo=*/{ name: "init", component: that.getId()}); // 'init' hook isn't allowed to return any values.
					}

					// apply the settings
					that.applySettings(mSettings, oScope);
					bCreated = true;

					// use try finally here since catch leads to the console pointing to the wrong location of the error
					// (not the original error's location but to this constructor)
				} finally {

					// unregisters the object in the Core
					// the assumption is that the object was successfully registered
					if (!bCreated && that.deregister) {
						that.deregister();
					}

				}

			}());

		}

	}, /* Metadata constructor */ ManagedObjectMetadata);

	// The current BindingParser implementation is exposed via "ManagedObject.bindingParser".
	// This is used in tests for switching the BindingParser implementation on the fly.
	// We delegate any changes to this property back to the BindingInfo.
	Object.defineProperty(ManagedObject, "bindingParser", {
		set: function(v) {
			BindingInfo.parse = v;
		},
		get: function() {
			return BindingInfo.parse;
		}
	});

	function assertModelName(sModelName) {
		assert(sModelName === undefined || (typeof sModelName === "string" && !/^(undefined|null)?$/.test(sModelName)), "sModelName must be a string or omitted");
	}

	// Binding support Marker
	var _bHasBindingSupport = false;

	/**
	 * Checks if the <code>ManagedObjectBindingSupport</code> mixin is introduced
	 * via a model instance.
	 * If so, it is applied to the <code>ManagedObject.prototype</code> once.
	 *
	 * @param {Object<string, sap.ui.model.Model>} mModels a map of models, keyed by the model name.
	 */
	function checkForBindingSupport(mModels) {
		if (!_bHasBindingSupport ) {
			var oModel = Object.values(mModels)[0];
			// In theory an application could pass an object that does not extend from sap.ui.model.Model
			if (oModel && oModel.mixinBindingSupport) {
				oModel.mixinBindingSupport(ManagedObject.prototype);
				_bHasBindingSupport = true;
			}
		}
	}

	/**
	 * Returns the metadata for the ManagedObject class.
	 *
	 * @return {sap.ui.base.ManagedObjectMetadata} Metadata for the ManagedObject class.
	 * @static
	 * @public
	 * @name sap.ui.base.ManagedObject.getMetadata
	 * @function
	 */

	/**
	 * Returns the metadata for the class that this object belongs to.
	 *
	 * @return {sap.ui.base.ManagedObjectMetadata} Metadata for the class of the object
	 * @public
	 * @name sap.ui.base.ManagedObject#getMetadata
	 * @function
	 */

	/**
	 * @typedef {sap.ui.base.Object.MetadataOptions} sap.ui.base.ManagedObject.MetadataOptions
	 *
	 * The structure of the "metadata" object which is passed when inheriting from sap.ui.base.ManagedObject using its static "extend" method.
	 * See {@link sap.ui.base.ManagedObject.extend} for details on its usage.
	 *
	 * @property {string} [library]
	 *     Name of the library that the new subclass should belong to. If the subclass is a control or element, it will
	 *     automatically register with that library so that authoring tools can discover it.
	 *     By convention, the name of the subclass should have the library name as a prefix, but subfolders are allowed,
	 *     e.g. <code>sap.ui.layout.form.Form</code> belongs to library <code>sap.ui.layout</code>.
	 *
	 * @property {Object<string, string | sap.ui.base.ManagedObject.MetadataOptions.Property>} [properties]
	 *     An object literal whose properties each define a new managed property in the ManagedObject subclass.
	 *     The value can either be a simple string which then will be assumed to be the type of the new property or it can be
	 *     an object literal with the following properties (see {@link sap.ui.base.ManagedObject.MetadataOptions.Property Property} for details):
	 *     type, visibility, byValue, group, defaultValue, bindable, selector
	 *     Property names should use camelCase notation, start with a lowercase letter and only use characters from the set [a-zA-Z0-9_$].
	 *     If an aggregation in the literal is preceded by a JSDoc comment (doclet) and if the UI5 plugin and template are used for JSDoc3 generation, the doclet will
	 *     be used as generic documentation of the aggregation.
	 *
	 *     For each public property 'foo', the following methods will be created by the "extend" method and will be added to the
	 *     prototype of the subclass:
	 *     <ul>
	 *     <li>getFoo() - returns the current value of property 'foo'. Internally calls {@link #getProperty}</li>
	 *     <li>setFoo(v) - sets 'v' as the new value of property 'foo'. Internally calls {@link #setProperty}</li>
	 *     <li>bindFoo(c) - (only if property was defined to be 'bindable'): convenience function that wraps {@link #bindProperty}</li>
	 *     <li>unbindFoo() - (only if property was defined to be 'bindable'): convenience function that wraps {@link #unbindProperty}</li>
	 *     </ul>
	 *     For hidden properties, no methods are generated.
	 *
	 * @property {string} [defaultProperty]
	 *     When specified, the default property must match the name of one of the properties defined for the new subclass (either own or inherited).
	 *     The named property can be used to identify the main property to be used for bound data. E.g. the value property of a field control.
	 *
	 * @property {Object<string, string | sap.ui.base.ManagedObject.MetadataOptions.Aggregation>} [aggregations]
	 *     An object literal whose properties each define a new aggregation in the ManagedObject subclass.
	 *     The value can either be a simple string which then will be assumed to be the type of the new aggregation or it can be
	 *     an object literal with the following properties (see {@link sap.ui.base.ManagedObject.MetadataOptions.Aggregation Aggregation} for details):
	 *     type, multiple, singularName, visibility, bindable, forwarding, selector.
	 *     Aggregation names should use camelCase notation, start with a lowercase letter and only use characters from the set [a-zA-Z0-9_$].
	 *     The name for a hidden aggregations might start with an underscore.
	 *     If an aggregation in the literal is preceded by a JSDoc comment (doclet) and if the UI5 plugin and template are used for JSDoc3 generation, the doclet will
	 *     be used as generic documentation of the aggregation.
	 *
	 *     For each public aggregation 'item' of cardinality 0..1, the following methods will be created by the "extend" method and will be added to the
	 *     prototype of the subclass:
	 *     <ul>
	 *     <li>getItem() - returns the current value of aggregation 'item'. Internally calls {@link #getAggregation} with a default value of <code>undefined</code></li>
	 *     <li>setItem(o) - sets 'o' as the new aggregated object in aggregation 'item'. Internally calls {@link #setAggregation}</li>
	 *     <li>destroyItem(o) - destroy a currently aggregated object in aggregation 'item' and clears the aggregation. Internally calls {@link #destroyAggregation}</li>
	 *     <li>bindItem(c) - (only if aggregation was defined to be 'bindable'): convenience function that wraps {@link #bindAggregation}</li>
	 *     <li>unbindItem() - (only if aggregation was defined to be 'bindable'): convenience function that wraps {@link #unbindAggregation}</li>
	 *     </ul>
	 *     For a public aggregation 'items' of cardinality 0..n, the following methods will be created:
	 *     <ul>
	 *     <li>getItems() - returns an array with the objects contained in aggregation 'items'. Internally calls {@link #getAggregation} with a default value of <code>[]</code></li>
	 *     <li>addItem(o) - adds an object as last element in the aggregation 'items'. Internally calls {@link #addAggregation}</li>
	 *     <li>insertItem(o,p) - inserts an object into the aggregation 'items'. Internally calls {@link #insertAggregation}</li>
	 *     <li>indexOfItem(o) - returns the position of the given object within the aggregation 'items'. Internally calls {@link #indexOfAggregation}</li>
	 *     <li>removeItem(v) - removes an object from the aggregation 'items'. Internally calls {@link #removeAggregation}</li>
	 *     <li>removeAllItems() - removes all objects from the aggregation 'items'. Internally calls {@link #removeAllAggregation}</li>
	 *     <li>destroyItems() - destroy all currently aggregated objects in aggregation 'items' and clears the aggregation. Internally calls {@link #destroyAggregation}</li>
	 *     <li>bindItems(c) - (only if aggregation was defined to be 'bindable'): convenience function that wraps {@link #bindAggregation}</li>
	 *     <li>unbindItems() - (only if aggregation was defined to be 'bindable'): convenience function that wraps {@link #unbindAggregation}</li>
	 *     </ul>
	 *     For hidden aggregations, no methods are generated.
	 *
	 * @property {string} [defaultAggregation]
	 *     When specified, the default aggregation must match the name of one of the aggregations defined for the new subclass (either own or inherited).
	 *     The named aggregation will be used in contexts where no aggregation is specified. E,g. when an object in an XMLView embeds other objects without
	 *     naming an aggregation, as in the following example:
	 *     <pre>
	 *      &lt;!-- assuming the defaultAggregation for Dialog is 'content' -->
	 *      &lt;Dialog>
	 *        &lt;Text/>
	 *        &lt;Button/>
	 *      &lt;/Dialog>
	 *     </pre>
	 *
	 * @property {Object<string, string | sap.ui.base.ManagedObject.MetadataOptions.Association>} [associations]
	 *     An object literal whose properties each define a new association of the ManagedObject subclass.
	 *     The value can either be a simple string which then will be assumed to be the type of the new association or it can be
	 *     an object literal with the following properties (see {@link sap.ui.base.ManagedObject.MetadataOptions.Association Association} for details): type, multiple, singularName, visibility
	 *     Association names should use camelCase notation, start with a lowercase letter and only use characters from the set [a-zA-Z0-9_$].
	 *     If an association in the literal is preceded by a JSDoc comment (doclet) and if the UI5 plugin and template are used for JSDoc3 generation, the doclet will
	 *     be used as generic documentation of the association.
	 *
	 *     For each association 'ref' of cardinality 0..1, the following methods will be created by the "extend" method and will be added to the
	 *     prototype of the subclass:
	 *     <ul>
	 *     <li>getRef() - returns the current value of association 'item'. Internally calls {@link #getAssociation} with a default value of <code>undefined</code></li>
	 *     <li>setRef(o) - sets 'o' as the new associated object in association 'item'. Internally calls {@link #setAssociation}</li>
	 *     </ul>
	 *     For a public association 'refs' of cardinality 0..n, the following methods will be created:
	 *     <ul>
	 *     <li>getRefs() - returns an array with the objects contained in association 'items'. Internally calls {@link #getAssociation} with a default value of <code>[]</code></li>
	 *     <li>addRef(o) - adds an object as last element in the association 'items'. Internally calls {@link #addAssociation}</li>
	 *     <li>removeRef(v) - removes an object from the association 'items'. Internally calls {@link #removeAssociation}</li>
	 *     <li>removeAllRefs() - removes all objects from the association 'items'. Internally calls {@link #removeAllAssociation}</li>
	 *     </ul>
	 *     For hidden associations, no methods are generated.
	 *
	 * @property {Object<string, string | sap.ui.base.ManagedObject.MetadataOptions.Event>} [events]
	 *     An object literal whose properties each define a new event of the ManagedObject subclass.
	 *     In this literal, the property names are used as event names and the values are object literals describing the respective event which can have the
	 *     following properties (see {@link sap.ui.base.ManagedObject.MetadataOptions.Event Event} for details): allowPreventDefault, parameters
	 *     Event names should use camelCase notation, start with a lower-case letter and only use characters from the set [a-zA-Z0-9_$].
	 *     If an event in the literal is preceded by a JSDoc comment (doclet) and if the UI5 plugin and template are used for JSDoc3 generation, the doclet will be used
	 *     as generic documentation of the event.
	 *
	 *     For each event 'Some' the following methods will be created by the "extend" method and will be added to the
	 *     prototype of the subclass:
	 *     <ul>
	 *     <li>attachSome(fn,o) - registers a listener for the event. Internally calls {@link #attachEvent}</li>
	 *     <li>detachSome(fn,o) - deregisters a listener for the event. Internally calls {@link #detachEvent}</li>
	 *     <li>fireSome() - fire the event. Internally calls {@link #fireEvent}</li>
	 *     </ul>
	 *
	 * @property {string | boolean} [designtime]
	 *     Name of a module that implements the designtime part. Alternatively <code>true</code> to indicate that the module's file is named *.designtime.js with
	 *     the same base name as the class itself.
	 *
	 * @property {Object<string,any>} [specialSettings] Special settings are an experimental feature and MUST NOT BE DEFINED in controls or applications outside of the <code>sap.ui.core</code> library.
	 *     There's no generic or general way how to set or get the values for special settings. For the same reason, they cannot be bound against a model.
	 *     If there's a way for consumers to define a value for a special setting, it must be documented in the class that introduces the setting.
	 *
	 * @public
	 */

	/**
	 * @typedef {object} sap.ui.base.ManagedObject.MetadataOptions.Property
	 *
	 * An object literal describing a property of a class derived from <code>sap.ui.base.ManagedObject</code>.
	 * See {@link sap.ui.base.ManagedObject.MetadataOptions MetadataOptions} for details on its usage.
	 *
	 * @property {string} type Type of the new property. Must either be one of the built-in types
	 *     'string', 'boolean', 'int', 'float', 'object', 'function' or 'any', or a type created and registered with
	 *     {@link sap.ui.base.DataType.createType} or an array type based on one of the previous types (e.g. 'int[]'
	 *     or 'string[]', but not just 'array').
	 * @property {"hidden" | "public"} [visibility="public"] Either 'hidden' or 'public', defaults to 'public'. Properties that
	 *     belong to the API of a class must be 'public' whereas 'hidden' properties can only be used internally.
	 *     Only public properties are accepted by the constructor or by <code>applySettings</code> or in declarative
	 *     representations like an <code>XMLView</code>. Equally, only public properties are cloned.
	 * @property {boolean} [byValue=false]
	 *     If set to <code>true</code>, the property value will be {@link module:sap/base/util/deepClone deep cloned}
	 *     on write and read operations to ensure that the internal value can't be modified by the outside. The property
	 *     <code>byValue</code> is currently restricted to a <code>boolean</code> value. Other types are reserved for future
	 *     use. Class definitions must only use boolean values for the flag (or omit it), but readers of ManagedObject
	 *     metadata should handle any truthy value as <code>true</code> to be future safe.
	 *     Note that using <code>byValue:true</code> has a performance impact on property access and therefore should be
	 *     used carefully. It also doesn't make sense to set this option for properties with a primitive type (they have
	 *     value semantic anyhow) or for properties with arrays of primitive types (they are already cloned
	 *     with a less expensive implementation). Defaults to 'false'.
	 * @property {"Accessibility" | "Appearance" | "Behavior" | "Data" | "Designtime" | "Dimension" | "Identification" | "Misc"} [group]
	 *     A semantic grouping of the properties, intended to be used in design time tools.
	 *     Allowed values are (case sensitive): Accessibility, Appearance, Behavior, Data, Designtime, Dimension, Identification, Misc
	 * @property {any} [defaultValue] The default value for the property or null if there is no specific
	 *     default value defined (the data type's default becomes the default value in this case, e.g. <code>false</code> for boolean and
	 *     the empty string for type string). Omitting this property means the default value is <code>undefined</code>.
	 * @property {boolean | "bindable"} [bindable=false] (Either can be omitted or set to the boolean value <code>true</code> or the magic string 'bindable'.)
	 *     If set to <code>true</code> or 'bindable', additional named methods <code>bind<i>Name</i></code> and <code>unbind<i>Name</i></code> are generated as convenience.
	 *     Despite its name, setting this flag is not mandatory to make the managed property bindable. The generic methods {@link #bindProperty} and
	 *     {@link #unbindProperty} can always be used.
	 * @property {string} [selector] Can be set to a valid CSS selector (as accepted by the
	 *     {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector Element.prototype.querySelector}
	 *     method). When set, it locates the DOM element that represents this property's value. It should only be set
	 *     for properties that have a visual text representation in the DOM.
	 *
	 *     The purpose of the selector is to allow other framework parts or design time tooling to identify the DOM parts
	 *     of a control or element that represent a specific property without knowing the control or element implementation
	 *     in detail.
	 *
	 *     As an extension to the standard CSS selector syntax, the selector string can contain the placeholder <code>{id}</code>
	 *     (multiple times). Before evaluating the selector in the context of an element or control, all occurrences of the
	 *     placeholder have to be replaced by the (potentially escaped) ID of that element or control.
	 *     In fact, any selector should start with <code>#{id}</code> to ensure that the query result is limited to the
	 *     desired element or control.
	 *
	 *     <b>Note</b>: there is a convenience method {@link sap.ui.core.Element#getDomRefForSetting} that evaluates the
	 *     selector in the context of a concrete element or control instance. It also handles the placeholder <code>{id}</code>.
	 *     Only selected framework features may use that private method, it is not yet a public API and might be changed
	 *     or removed in future versions of UI5. However, instead of maintaining the <code>selector</code> in the metadata,
	 *     element and control classes can overwrite <code>getDomRefForSetting</code> and determine the DOM element
	 *     dynamically.
	 * @property {boolean} [deprecated=false] Flag that marks the property as deprecated (defaults to false). May lead to an additional warning
	 *     log message at runtime when the property is still used. For the documentation, also add a <code>@deprecated</code> tag in the JSDoc,
	 *     describing since when it is deprecated and what any alternatives are.
	 *
	 * @public
	 */

	/**
	 * @typedef {object} sap.ui.base.ManagedObject.MetadataOptions.Aggregation
	 *
	 * An object literal describing an aggregation of a class derived from <code>sap.ui.base.ManagedObject</code>.
	 * See {@link sap.ui.base.ManagedObject.MetadataOptions MetadataOptions} for details on its usage.
	 *
	 * @property {string} [type='sap.ui.core.Control'] Type of the new aggregation. Must be the full global name of a ManagedObject subclass
	 *     or a UI5 interface (in dot notation, e.g. 'sap.m.Button').
	 * @property {function} [defaultClass] The default class for the aggregation. If aggregation content is created from a plain object
	 *                                     and no explicit 'Type' is given (capital 'T'), the default class will be instantiated.
	 * @property {boolean} [multiple=true] Whether the aggregation is a 0..1 (false) or a 0..n aggregation (true), defaults to true
	 * @property {string} [singularName] Singular name for 0..n aggregations. For 0..n aggregations the name by convention should be the plural name.
	 *     Methods affecting multiple objects in an aggregation will use the plural name (e.g. getItems(), whereas methods that deal with a single object will use
	 *     the singular name (e.g. addItem). The framework knows a set of common rules for building the plural form of English nouns and uses these rules to determine
	 *     a singular name on its own. If that name is wrong, a singluarName can be specified with this property.
	 * @property {"hidden" | "public"} [visibility="public"] Either 'hidden' or 'public', defaults to 'public'. Aggregations that
	 *     belong to the API of a class must be 'public' whereas 'hidden' aggregations typically are used for the
	 *     implementation of composite classes (e.g. composite controls). Only public aggregations are accepted by
	 *     the constructor or by <code>applySettings</code> or in declarative representations like an <code>XMLView</code>.
	 *     Equally, only public aggregations are cloned.
	 * @property {boolean | "bindable"} [bindable=false] (Either can be omitted or set to the boolean value <code>true</code> or the magic string 'bindable'.)
	 *     If set to <code>true</code> or 'bindable', additional named methods <code>bind<i>Name</i></code> and <code>unbind<i>Name</i></code> are generated as convenience.
	 *     Despite its name, setting this flag is not mandatory to make the managed aggregation bindable. The generic methods {@link #bindAggregation} and
	 *     {@link #unbindAggregation} can always be used.
	 * @property {object} [forwarding]
	 *     If set, this defines a forwarding of objects added to this aggregation into an aggregation of another ManagedObject - typically to an inner control
	 *     within a composite control.
	 *     This means that all adding, removal, or other operations happening on the source aggregation are actually called on the target instance.
	 *     All elements added to the source aggregation will be located at the target aggregation (this means the target instance is their parent).
	 *     Both, source and target element will return the added elements when asked for the content of the respective aggregation.
	 *     If present, the named (non-generic) aggregation methods will be called for the target aggregation.
	 *     Aggregations can only be forwarded to non-hidden aggregations of the same or higher multiplicity (i.e. an aggregation with multiplicity "0..n" cannot be
	 *     forwarded to an aggregation with multiplicity "0..1").
	 *     The target aggregation must also be "compatible" to the source aggregation in the sense that any items given to the source aggregation
	 *     must also be valid in the target aggregation (otherwise the target element will throw a validation error).
	 *     If the forwarded elements use data binding, the target element must be properly aggregated by the source element to make sure all models are available there
	 *     as well.
	 *     The aggregation target must remain the same instance across the entire lifetime of the source control.
	 *     Aggregation forwarding will behave unexpectedly when the content in the target aggregation is modified by other actors (e.g. by the target element or by
	 *     another forwarding from a different source aggregation). Hence, this is not allowed.
	 * @property {string} forwarding.aggregation The name of the aggregation on the target into which the objects shall be forwarded. The multiplicity of the target
	 *     aggregation must be the same as the one of the source aggregation for which forwarding is defined.
	 * @property {string} [forwarding.idSuffix] A string which is appended to the ID of <i>this</i> ManagedObject to construct the ID of the target ManagedObject. This is
	 *     one of the two options to specify the target. This option requires the target instance to be created in the init() method of this ManagedObject and to be
	 *     always available.
	 * @property {string} [forwarding.getter] The name of the function on instances of this ManagedObject which returns the target instance. This second option
	 *     to specify the target can be used for lazy instantiation of the target. Note that either idSuffix or getter must be given. Also note that the target
	 *     instance returned by the getter must remain the same over the entire lifetime of this ManagedObject and the implementation assumes that all instances return
	 *     the same type of object (at least the target aggregation must always be defined in the same class).
	 * @property {boolean} [forwarding.forwardBinding] Whether any binding should happen on the forwarding target or not. Default if omitted is <code>false</code>,
	 *     which means any bindings happen on the outer ManagedObject. When the binding is forwarded, all binding methods like updateAggregation, getBindingInfo,
	 *     refreshAggregation etc. are called on the target element of the forwarding instead of being called on this element. The basic aggregation mutator methods
	 *     (add/remove etc.) are only called on the forwarding target element. Without forwardBinding, they are called on this element, but forwarded to the forwarding
	 *     target, where they actually modify the aggregation.
	 * @property {string} [selector] Can be set to a valid CSS selector (as accepted by the
	 *     {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector Element.prototype.querySelector}
	 *     method). When set, it locates the DOM element that surrounds the aggregation's content. It should only be
	 *     set for aggregations that have a visual representation in the DOM. A DOM element surrounding the aggregation's
	 *     rendered content should be available in the DOM, even if the aggregation is empty or not rendered for some reason.
	 *     In cases where this is not possible or not intended, <code>getDomRefForSetting</code> can be overridden, see below.
	 *
	 *     The purpose of the selector is to allow other framework parts like drag and drop or design time tooling to identify
	 *     those DOM parts of a control or element that represent a specific aggregation without knowing the control or element
	 *     implementation in detail.
	 *
	 *     As an extension to the standard CSS selector syntax, the selector string can contain the placeholder <code>{id}</code>
	 *     (multiple times). Before evaluating the selector in the context of an element or control, all occurrences of the
	 *     placeholder have to be replaced by the (potentially escaped) ID of that element or control.
	 *     In fact, any selector should start with <code>#{id}</code> to ensure that the query result is limited to the
	 *     desired element or control.
	 *
	 *     <b>Note</b>: there is a convenience method {@link sap.ui.core.Element#getDomRefForSetting} that evaluates the
	 *     selector in the context of a concrete element or control instance. It also handles the placeholder <code>{id}</code>.
	 *     Only selected framework features may use that private method, it is not yet a public API and might be changed
	 *     or removed in future versions of UI5. However, instead of maintaining the <code>selector</code> in the metadata,
	 *     element and control classes can overwrite <code>getDomRefForSetting</code> to calculate or add the appropriate
	 *     DOM Element dynamically.
	 * @property {boolean} [deprecated=false] Flag that marks the aggregation as deprecated (defaults to false). May lead to an additional warning
	 *     log message at runtime when the aggregation is still used. For the documentation, also add a <code>@deprecated</code> tag in the JSDoc,
	 *     describing since when it is deprecated and what any alternatives are.
	 * @property {string[]} [altTypes] An optional list of alternative types that may be given instead of the main type. Alternative types
	 *     may only be simple types, no descendants of ManagedObject. An example of altTypes being used is the 'tooltip' aggregation of
	 *     <code>sap.ui.core.Element</code>, which accepts tooltip controls extending <code>sap.ui.core.TooltipBase</code> with their own renderer
	 *     and design, as well as plain strings, which will simply be displayed using the browser's built-in tooltip functionality.
	 * @property {boolean | object} [dnd=false]
	 *     Only available for aggregations of a class extending <code>sap.ui.core.Element</code>, which is a subclass of <code>sap.ui.base.ManagedObject</code>!
	 *     Defines draggable and droppable configuration of the aggregation.
	 *     If the <code>dnd</code> property is of type Boolean, then the <code>draggable</code> and <code>droppable</code> configuration are both set to this Boolean value
	 *     and the layout (in case of enabled dnd) is set to default ("Vertical").
	 * @property {boolean} [dnd.draggable=false] Defines whether elements from this aggregation are draggable or not. The default value is <code>false</code>.
	 * @property {boolean} [dnd.droppable=false] Defines whether the element is droppable (it allows being dropped on by a draggable element) or not. The default value is <code>false</code>.
	 * @property {"Vertical" | "Horizontal"} [dnd.layout="Vertical"]  The arrangement of the items in this aggregation. This setting is recommended for the aggregation with multiplicity 0..n
	 *     (<code>multiple: true</code>). Possible values are <code>Vertical</code> (e.g. rows in a table) and <code>Horizontal</code> (e.g. columns in a table). It is recommended
	 *     to use <code>Horizontal</code> layout if the visual arrangement of the aggregation is two-dimensional.
	 *
	 * @public
	 */

	/**
	 * @typedef {object} sap.ui.base.ManagedObject.MetadataOptions.Association
	 *
	 * An object literal describing an association of a class derived from <code>sap.ui.base.ManagedObject</code>.
	 * See {@link sap.ui.base.ManagedObject.MetadataOptions MetadataOptions} for details on its usage.
	 *
	 * @property {string} [type='sap.ui.core.Control'] Type of the new association
	 * @property {boolean} [multiple=false] Whether the association is a 0..1 (false) or a 0..n association (true), defaults to false (0..1) for associations
	 * @property {string} [singularName] Custom singular name. This is only relevant for 0..n associations where the association name should be defined in plural form
	 *     and the framework tries to generate the singular form of it for certain places where it is needed. To do so, the framework knows
	 *     a set of common rules for building the plural form of English nouns and uses these rules to determine
	 *     a singular name on its own. If that name is wrong, a singularName can be specified with this property.
	 *     E.g. for an association named <code>items</code>, methods affecting multiple objects in an association will use the plural name (<code>getItems()</code>),
	 *     whereas methods that deal with a single object will automatically use the generated singular name (e.g. <code>addItem(...)</code>). However, the generated
	 *     singular form for an association <code>news</code> would be <code>new</code>, which is wrong, so the singular name "news" would need to be set.
	 * @property {"hidden" | "public"} [visibility="public"] Either 'hidden' or 'public', defaults to 'public'. Associations that
	 *     belong to the API of a class must be 'public' whereas 'hidden' associations can only be used internally.
	 *     Only public associations are accepted by the constructor or by <code>applySettings</code> or in declarative
	 *     representations like an <code>XMLView</code>. Equally, only public associations are cloned.
	 * @property {boolean} [deprecated=false] Flag that marks the association as deprecated (defaults to false). May lead to an additional warning
	 *     log message at runtime when the association is still used. For the documentation, also add a <code>@deprecated</code> tag in the JSDoc,
	 *     describing since when it is deprecated and what any alternatives are.
	 *
	 * @public
	 */

	/**
	 * @typedef {object} sap.ui.base.ManagedObject.MetadataOptions.Event
	 *
	 * An object literal describing an event of a class derived from <code>sap.ui.base.ManagedObject</code>.
	 * See {@link sap.ui.base.ManagedObject.MetadataOptions MetadataOptions} for details on its usage.
	 *
	 * @property {boolean} [allowPreventDefault] Whether the event allows to prevented the default behavior of the event source
	 * @property {Object<string, {type: string} | string>} [parameters] An object literal that describes the parameters of this event;
	 *     the keys are the parameter names and the values are objects with a 'type' property that specifies the type of the respective parameter.
	 * @property {boolean} [enableEventBubbling=false] whether event bubbling is enabled on this event. When <code>true</code> the event is also forwarded to the parent(s)
	 *     of the object (see {@link sap.ui.base.EventProvider#getEventingParent}) until the bubbling of the event is stopped or no parent is available anymore.
	 * @property {boolean} [deprecated=false] Flag that marks the event as deprecated (defaults to false). May lead to an additional warning
	 *     log message at runtime when the event is still used. For the documentation, also add a <code>@deprecated</code> tag in the JSDoc,
	 *     describing since when it is deprecated and what any alternatives are.
	 *
	 * @public
	 */

	/**
	 * Defines a new subclass of ManagedObject with name <code>sClassName</code> and enriches it with
	 * the information contained in <code>oClassInfo</code>.
	 *
	 * <code>oClassInfo</code> can contain the same information that {@link sap.ui.base.Object.extend} already accepts,
	 * plus the following new properties in the 'metadata' object literal
	 * (see {@link sap.ui.base.ManagedObject.MetadataOptions MetadataOptions} for details on each of them):
	 * <ul>
	 * <li><code>library : <i>string</i></code></li>
	 * <li><code>properties : <i>object</i></code></li>
	 * <li><code>defaultProperty : <i>string</i></code></li>
	 * <li><code>aggregations : <i>object</i></code></li>
	 * <li><code>defaultAggregation : <i>string</i></code></li>
	 * <li><code>associations : <i>object</i></code></li>
	 * <li><code>events : <i>object</i></code></li>
	 * <li><code>specialSettings : <i>object</i></code> // this one is still experimental and not for public usage!</li>
	 * </ul>
	 *
	 *
	 * Example:
	 * <pre>
	 * ManagedObject.extend('sap.mylib.MyClass', {
	 *   metadata : {
	 *     library: 'sap.mylib',
	 *     properties : {
	 *       value: 'string',
	 *       width: 'sap.ui.core.CSSSize',
	 *       height: { type: 'sap.ui.core.CSSSize', defaultValue: '100%'}
	 *       description: { type: 'string', defaultValue: '', selector: '#{id}-desc'}
	 *     },
	 *     defaultProperty : 'value',
	 *     aggregations : {
	 *       header : { type: 'sap.mylib.FancyHeader', multiple : false }
	 *       items : 'sap.ui.core.Control',
	 *       buttons: { type: 'sap.mylib.Button', multiple : true, selector: '#{id} > .sapMLButtonsSection'}
	 *     },
	 *     defaultAggregation : 'items',
	 *     associations : {
	 *       initiallyFocused : { type: 'sap.ui.core.Control' }
	 *     },
	 *     events: {
	 *       beforeOpen : {
	 *         parameters : {
	 *           opener : { type: 'sap.ui.core.Control' }
	 *         }
	 *       }
	 *     },
	 *   },
	 *
	 *   init: function() {
	 *   }
	 *
	 * }); // end of 'extend' call
	 * </pre>
	 *
	 * @param {string} sClassName Name of the class to be created
	 * @param {object} [oClassInfo] Object literal with information about the class
	 * @param {sap.ui.base.ManagedObject.MetadataOptions} [oClassInfo.metadata] The metadata object describing the class: properties, aggregations, events etc.
	 * @param {function} [FNMetaImpl] Constructor function for the metadata object. If not given, it defaults to <code>sap.ui.base.ManagedObjectMetadata</code>.
	 * @return {function} The created class / constructor function
	 *
	 * @public
	 * @static
	 * @name sap.ui.base.ManagedObject.extend
	 * @function
	 */

	/**
	 * Creates a new ManagedObject from the given data.
	 *
	 * If <code>vData</code> is a managed object already, that object is returned.
	 * If <code>vData</code> is an object (literal), then a new object is created with <code>vData</code>
	 * as settings.
	 *
	 * Deprecated usage, in case the type of the object is determined:
	 * <ul>
	 *    <li>by a property of name <code>Type</code> (capital 'T') in the <code>vData</code></li>
	 *    <li>by a property <code>type</code> (lower case 't') in the <code>oKeyInfo</code> object</li>
	 * </ul>
	 *
	 * In both cases, the type must be specified by the dot separated name of the class.
	 *
	 * @param {sap.ui.base.ManagedObject|object} vData
	 *   The data to create the object from. Used as constructor argument.
	 * @param {sap.ui.base.ManagedObject.MetadataOptions.Aggregation} [oKeyInfo]
	 *   Info object for the aggregation to which the created object will be added during an applySettings() call;
	 *   serves as the source for determining the type of the object to be created;
	 *   Please refer to the {@link sap.ui.base.ManagedObject.MetadataOptions.Aggregation} property 'defaultClass'
	 *   for more information.
	 * @param {object} [oScope]
	 *   Scope object to resolve types and formatters in bindings
	 * @returns {sap.ui.base.ManagedObject}
	 *   The newly created <code>ManagedObject</code>
	 * @throws {Error}
	 *   When there's not enough type information to create an instance from the given data
	 * @private
	 */
	function makeObject(vData, oKeyInfo, oScope) {
		if ( !vData || vData instanceof ManagedObject || typeof vData !== "object" || vData instanceof String) {
			return vData;
		}

		/**
		 * Retrieval of class constructor via global (class name string in dot notation).
		 * @deprecated since 1.120
		 */
		function getClass(vType) {
			if ( typeof vType === "function" ) {
				return vType;
			}
			if (typeof vType === "string" ) {
				const oType = ObjectPath.get(vType);
				if (oType != null) {
					Log.error(`Defining the object type ('${vType}') via its string name is deprecated, since it leads to accesses to the global namespace. ` +
					`The object type either stems from an explicitly given 'Type' value or was inferred from the default aggregation type. ` +
					`Please require the respective object type module beforehand. ` +
					`For control development, please also refer to the runtime metadata property 'defaultClass', which allows you to specify a default aggregation class type via constructor reference.`);
				}
				return oType;
			}
		}

		let FnClass;

		/**
		 * string notation via 'Type' (used by the deprecated JSONView).
		 * @deprecated since 1.120
		 */
		FnClass = getClass(vData.Type);

		FnClass ??= oKeyInfo?.defaultClass;

		/**
		 * The aggregation type (string) is used as a fallback in case no 'Type' is given,
		 * and no default class is defined.
		 * @deprecated since 1.120
		 */
		FnClass ??= getClass(oKeyInfo?.type);

		if ( typeof FnClass === "function" ) {
			return new FnClass(vData, oScope);
		}

		// we don't know how to create the ManagedObject from vData, so fail
		var message = "Don't know how to create a ManagedObject from " + vData + " (" + (typeof vData) + ")";
		Log.fatal(message);
		throw new Error(message);
	}

	/**
	 * Creates a new ManagedObject from the given data.
	 *
	 * If <code>vData</code> is a managed object already, that object is returned.
	 * If <code>vData</code> is an object (literal), then a new object is created with <code>vData</code>
	 * as settings. The type of the object is either determined by a property of name <code>Type</code>
	 * (capital 'T') in the <code>vData</code> or by a property <code>type</code> (lower case 't')
	 * in the <code>oKeyInfo</code> object. In both cases, the type must be specified by the dot separated
	 * name of the class.
	 *
	 * @param {sap.ui.base.ManagedObject|object} vData
	 *   The data to create the object from
	 * @param {sap.ui.base.ManagedObject.MetadataOptions.Aggregation} [oKeyInfo]
	 *   Info object for the aggregation to which the created object will be added;
	 *   serves as a fallback for determining the type of the object to be created;
	 *   If used as a fallback, the usage of a string name as the object's type is deprecated.
	 *   Please refer to the {@link sap.ui.base.ManagedObject.MetadataOptions.Aggregation} property 'defaultClass'
	 *   to specify a default class type for an aggregation via a constructor function.
	 * @param {object} [oScope]
	 *   Scope object to resolve types and formatters in bindings
	 * @returns {sap.ui.base.ManagedObject}
	 *   The newly created <code>ManagedObject</code>
	 * @throws {Error}
	 *   When there's not enough type information to create an instance from the given data
	 * @public
	 * @deprecated Since 1.120, as it relies on global names and potentially synchronous code loading. Please invoke the constructor of the intended ManagedObject subclass directly.
	 * @static
	 * @function
	 * @ts-skip
	 */
	ManagedObject.create = makeObject;

	/**
	 * A global preprocessor for the ID of a ManagedObject (used internally).
	 *
	 * If set, this function will be called before the ID is applied to any ManagedObject.
	 * If the original ID was empty, the hook will not be called.
	 *
	 * The expected signature is <code>function(sId)</code>, and <code>this</code> will
	 * be the current ManagedObject.
	 *
	 * @type {function(string):string}
	 * @private
	 */
	ManagedObject._fnIdPreprocessor = null;

	/**
	 * A global preprocessor for the settings of a ManagedObject (used internally).
	 *
	 * If set, this function will be called before the settings are applied to any ManagedObject.
	 * If the original settings are empty, the hook will not be called (to be discussed).
	 *
	 * The expected signature is <code>function(mSettings)</code>, and <code>this</code> will
	 * be the current ManagedObject.
	 *
	 * @type {function}
	 * @private
	 */
	ManagedObject._fnSettingsPreprocessor = null;

	/**
	 * Activates the given ID and settings preprocessors, executes the given function
	 * and restores the previously active preprocessors.
	 *
	 * When a preprocessor is not defined in <code>oPreprocessors</code>, then the currently
	 * active preprocessor is temporarily deactivated while <code>fn</code> is executed.
	 *
	 * See the <code>_fnIdPreprocessor</code> and <code>_fnSettingsPreprocessor</code>
	 * members in this class for a detailed description of the preprocessors.
	 *
	 * This method is intended for internal use in the sap/ui/base and sap/ui/core packages only.
	 *
	 * @param {function} fn Function to execute
	 * @param {object} [oPreprocessors] Preprocessors to use while executing <code>fn</code>
	 * @param {function} [oPreprocessors.id] ID preprocessor that can transform the ID of a new ManagedObject
	 * @param {function} [oPreprocessors.settings] Settings preprocessor that can modify settings before they are applied
	 * @param {Object} [oThisArg=undefined] Value to use as <code>this</code> when executing <code>fn</code>
	 * @returns {any} Returns the value that <code>fn</code> returned after execution
	 * @private
	 * @ui5-restricted sap.ui.base,sap.ui.core
	 */
	ManagedObject.runWithPreprocessors = function(fn, oPreprocessors, oThisArg) {
		assert(typeof fn === "function", "fn must be a function");
		assert(!oPreprocessors || typeof oPreprocessors === "object", "oPreprocessors must be an object");

		var oOldPreprocessors = { id : this._fnIdPreprocessor, settings : this._fnSettingsPreprocessor };
		oPreprocessors = oPreprocessors || {};

		this._fnIdPreprocessor = oPreprocessors.id;
		this._fnSettingsPreprocessor = oPreprocessors.settings;

		try {
			return fn.call(oThisArg);
		} finally {
			// always restore old preprocessor settings
			this._fnIdPreprocessor = oOldPreprocessors.id;
			this._fnSettingsPreprocessor = oOldPreprocessors.settings;
		}

	};

	/**
	 * Calls the function <code>fn</code> once and marks all ManagedObjects
	 * created during that call as "owned" by the given ID.
	 *
	 * @param {function} fn Function to execute
	 * @param {string} sOwnerId Id of the owner
	 * @param {Object} [oThisArg=undefined] Value to use as <code>this</code> when executing <code>fn</code>
	 * @return {any} result of function <code>fn</code>
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	 ManagedObject.runWithOwner = function(fn, sOwnerId, oThisArg) {

		assert(typeof fn === "function", "fn must be a function");

		var oldOwnerId = ManagedObject._sOwnerId;
		try {
			ManagedObject._sOwnerId = sOwnerId;
			return fn.call(oThisArg);
		} finally {
			ManagedObject._sOwnerId = oldOwnerId;
		}

	};

	/**
	 * Sets all the properties, aggregations, associations and event handlers as given in
	 * the object literal <code>mSettings</code>. If a property, aggregation, etc.
	 * is not listed in <code>mSettings</code>, then its value is not changed by this method.
	 *
	 * For properties and 0..1 aggregations/associations, any given setting overwrites
	 * the current value. For 0..n aggregations, the given values are appended; event
	 * listeners are registered in addition to existing ones.
	 *
	 * For the possible keys and values in <code>mSettings</code> see the general
	 * documentation in {@link sap.ui.base.ManagedObject} or the specific documentation
	 * of the constructor of the concrete managed object class.
	 *
	 * @param {object} mSettings the settings to apply to this managed object
	 * @param {object} [oScope] Scope object to resolve types and formatters
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	ManagedObject.prototype.applySettings = function(mSettings, oScope) {

		// PERFOPT: don't retrieve (expensive) JSONKeys if no settings are given
		if ( !mSettings || isEmptyObject(mSettings) ) {
			return this;
		}

		var that = this,
			oMetadata = this.getMetadata(),
			mValidKeys = oMetadata.getJSONKeys(), // UID names required, they're part of the documented contract of applySettings
			preprocessor = ManagedObject._fnSettingsPreprocessor,
			sKey, oValue, oKeyInfo;

		// add all given objects to the given aggregation. nested arrays are flattened
		// (might occur e.g. in case of content from an extension point)
		function addAllToAggregation(aObjects) {
			for (var i = 0, len = aObjects.length; i < len; i++) {
				var vObject = aObjects[i];
				if ( Array.isArray(vObject) ) {
					addAllToAggregation(vObject);
				} else {
					that[oKeyInfo._sMutator](makeObject(vObject, oKeyInfo, oScope));
				}
			}
		}

		function attachListener(aArgs) {
			that[oKeyInfo._sMutator](aArgs[0], aArgs[1], aArgs[2]);
		}

		// checks whether given type name has an object/any primitive type
		function isObjectType(sType) {
			var oType = DataType.getType(sType),
				oPrimitiveTypeName = oType && oType.getPrimitiveType().getName();
			return oPrimitiveTypeName === "object" || oPrimitiveTypeName === "any";
		}

		// call the preprocessor if it has been defined
		preprocessor && preprocessor.call(this, mSettings); // TODO: decide whether to call for empty settings as well?


		//process metadataContext
		if (mSettings.metadataContexts && this._processMetadataContexts) {
			this._processMetadataContexts(mSettings.metadataContexts, mSettings);
		}

		// process models
		if ( mSettings.models ) {
			if ( typeof mSettings.models !== "object" ) {
				throw new Error("models must be a simple object");
			}
			if ( BaseObject.isObjectA(mSettings.models, "sap.ui.model.Model") ) {
				this.setModel(mSettings.models);
			} else {
				for (sKey in mSettings.models ) {
					this.setModel(mSettings.models[sKey], sKey === "undefined" ? undefined : sKey);
				}
			}
		}
		//process BindingContext
		if ( mSettings.bindingContexts ) {
			if ( typeof mSettings.bindingContexts !== "object" ) {
				throw new Error("bindingContexts must be a simple object");
			}
			var oBindingContexts = mSettings.bindingContexts;
			if ( BaseObject.isObjectA(oBindingContexts, "sap.ui.model.Context")) {
				this.setBindingContext(mSettings.bindingContexts);
			} else {
				for (sKey in mSettings.bindingContexts ) {
					this.setBindingContext(mSettings.bindingContexts[sKey], sKey === "undefined" ? undefined : sKey);
				}
			}
		}
		//process object bindings
		if ( mSettings.objectBindings ) {
			if ( typeof mSettings.objectBindings !== "string" && typeof mSettings.objectBindings !== "object" ) {
				throw new Error("binding must be a string or simple object");
			}
			if ( typeof mSettings.objectBindings === "string" || mSettings.objectBindings.path ) { // excludes "path" as model name
				this.bindObject(mSettings.objectBindings);
			} else {
				for (sKey in mSettings.objectBindings ) {
					mSettings.objectBindings[sKey].model = sKey === "undefined" ? undefined : sKey;
					this.bindObject(mSettings.objectBindings[sKey]);
				}
			}
		}

		// process all settings
		// process settings
		for (sKey in mSettings) {
			oValue = mSettings[sKey];
			// get info object for the key
			if ( (oKeyInfo = mValidKeys[sKey]) !== undefined ) {
				var oBindingInfo;
				switch (oKeyInfo._iKind) {
				case 0: // PROPERTY
					oBindingInfo = this.extractBindingInfo(oValue, oScope, !isObjectType(oKeyInfo.type));
					if (oBindingInfo && typeof oBindingInfo === "object") {
						this.bindProperty(sKey, oBindingInfo);
					} else {
						this[oKeyInfo._sMutator](typeof oBindingInfo === "string" ? oBindingInfo : oValue);
					}
					break;
				case 1: // SINGLE_AGGREGATION
					oBindingInfo = oKeyInfo.altTypes && this.extractBindingInfo(oValue, oScope, !oKeyInfo.altTypes.some(isObjectType));
					if ( oBindingInfo && typeof oBindingInfo === "object" ) {
						this.bindProperty(sKey, oBindingInfo);
					} else {
						if (Array.isArray(oValue)){
							// assumption: we have an extensionPoint here which is always an array, even if it contains a single control
							if (oValue.length > 1){
								future.errorThrows("Tried to add an array of controls to a single aggregation");
							}
							oValue = oValue[0];
						}
						this[oKeyInfo._sMutator](makeObject(typeof oBindingInfo === "string" ? oBindingInfo : oValue, oKeyInfo, oScope));
					}
					break;
				case 2: // MULTIPLE_AGGREGATION
					oBindingInfo = this.extractBindingInfo(oValue, oScope);
					if (oBindingInfo && typeof oBindingInfo === "object" ) {
						this.bindAggregation(sKey, oBindingInfo);
					} else {
						oValue = typeof oBindingInfo === "string" ? oBindingInfo : oValue; // could be an unescaped string if altTypes contains 'string'
						if ( oValue ) {
							if ( Array.isArray(oValue) ) {
								addAllToAggregation(oValue); // wrap a single object as array
							} else {
								that[oKeyInfo._sMutator](makeObject(oValue, oKeyInfo, oScope));
							}
						}
					}
					break;
				case 3: // SINGLE_ASSOCIATION
					this[oKeyInfo._sMutator](oValue);
					break;
				case 4: // MULTIPLE_ASSOCIATION
					if ( oValue ) {
						if ( Array.isArray(oValue) ) {
							for (var i = 0,l = oValue.length; i < l; i++) {
								this[oKeyInfo._sMutator](oValue[i]);
							}
						} else {
							this[oKeyInfo._sMutator](oValue);
						}
					}
					break;
				case 5: // EVENT
					if ( typeof oValue == "function" ) {
						this[oKeyInfo._sMutator](oValue);
					} else if (Array.isArray(oValue[0]) && (oValue.length <= 1 || Array.isArray(oValue[1])) ) {
						oValue.forEach(attachListener);
					} else {
						attachListener(oValue);
					}
					break;
				case -1: // SPECIAL_SETTING
					// No assert
					break;
				default:
					break;
				}
			} else {
				// there must be no unknown settings
				assert(false, "ManagedObject.apply: encountered unknown setting '" + sKey + "' for class '" + oMetadata.getName() + "' (value:'" + oValue + "')");
			}
		}

		return this;
	};

	/**
	 * Escapes the given value so it can be used in the constructor's settings object.
	 * Should be used when property values are initialized with static string values which could contain binding characters (curly braces).
	 *
	 * @since 1.52
	 * @param {any} vValue Value to escape; only needs to be done for string values, but the call will work for all types
	 * @return {any} The given value, escaped for usage as static property value in the constructor's settings object (or unchanged, if not of type string)
	 * @static
	 * @public
	 */
	ManagedObject.escapeSettingsValue = function(vValue) {
		return (typeof vValue === "string") ? BindingInfo.escape(vValue) : vValue;
	};

	/**
	 * Returns a simple string representation of this managed object.
	 *
	 * Mainly useful for tracing purposes.
	 * @public
	 * @return {string} a string description of this managed object
	 */
	ManagedObject.prototype.toString = function() {
		return "ManagedObject " + this.getMetadata().getName() + "#" + this.getId();
	};

	/**
	 * Returns the object's ID.
	 *
	 * There is no guarantee or check or requirement for the ID of a <code>ManagedObject</code> to be unique.
	 * Only some subclasses of <code>ManagedObject</code> introduce this as a requirement, e.g. <code>Component</code>
	 * or <code>Element</code>. All elements existing in the same window at the same time must have different IDs.
	 * A new element will fail during construction when the given ID is already used by another element.
	 * But there might be a component with the same ID as an element or another <code>ManagedObject</code>.
	 *
	 * For the same reason, there is no general lookup for <code>ManagedObject</code>s via their ID. Only for subclasses
	 * that enforce unique IDs, there might be lookup mechanisms (e.g. {@link sap.ui.core.Element#getElementById sap.ui.core.Element.getElementById}
	 * for elements).
	 *
	 * @return {string} The objects's ID.
	 * @public
	 */
	ManagedObject.prototype.getId = function() {
		return this.sId;
	};

	// ######################################################################################################
	// Properties
	// ######################################################################################################

	/**
	 * Sets the given value for the given property after validating and normalizing it,
	 * marks this object as changed.
	 *
	 * If the value is not valid with regard to the declared data type of the property,
	 * an Error is thrown. In case <code>null</code> or <code>undefined</code> is passed,
	 * the default value for this property is used (see {@link #validateProperty}). To fully
	 * reset the property to initial state, use {@link #resetProperty} instead.
	 * If the validated and normalized <code>oValue</code> equals the current value of the property,
	 * the internal state of this object is not changed (apart from the result of {@link #isPropertyInitial}).
	 * If the value changes, it is stored internally
	 * and the {@link #invalidate} method is called on this object. In the case of TwoWay
	 * databinding, the bound model is informed about the property change.
	 *
	 * Note that ManagedObject only implements a single level of change tracking: if a first
	 * call to setProperty recognizes a change, 'invalidate' is called. If another call to
	 * setProperty reverts that change, invalidate() will be called again, the new status
	 * is not recognized as being 'clean' again.
	 *
	 * <b>Note:</b> This method is a low level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically set a property.
	 * Use the concrete method set<i>XYZ</i> for property 'XYZ' or the generic {@link #applySettings} instead.
	 *
	 * @param {string}  sPropertyName name of the property to set
	 * @param {any}     oValue value to set the property to
	 * @param {boolean} [bSuppressInvalidate] if true, the managed object is not marked as changed
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 *
	 * @protected
	 */
	ManagedObject.prototype.setProperty = function(sPropertyName, oValue, bSuppressInvalidate) {

		// check for a value change
		var oOldValue = this.mProperties[sPropertyName];

		// value validation
		oValue = this.validateProperty(sPropertyName, oValue);

		if (deepEqual(oOldValue, oValue)) {
			// ensure to set the own property explicitly to allow isPropertyInitial check (using hasOwnProperty on the map)
			this.mProperties[sPropertyName] = oValue;
			return this;
		} // no change

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			//Refresh only for property changes with suppressed invalidation (others lead to rerendering and refresh is handled there)
			ActivityDetection.refresh();
		}

		// change the property (and invalidate if the rendering should be updated)
		this.mProperties[sPropertyName] = oValue;

		if (!bSuppressInvalidate && !this.isInvalidateSuppressed()) {
			this.invalidate();
		}

		// check whether property is bound and update model in case of two way binding
		this.updateModelProperty(sPropertyName, oValue, oOldValue);
		// refresh new value as model might have changed it
		oValue = this.mProperties[sPropertyName];

		// fire property change event (experimental, only for internal use)
		if ( this.mEventRegistry["_change"] ) {
			EventProvider.prototype.fireEvent.call(this, "_change", {
				"id": this.getId(),
				"name": sPropertyName,
				"oldValue": oOldValue,
				"newValue": oValue
			});
		}
		if (this._observer) {
			this._observer.propertyChange(this, sPropertyName, oOldValue, oValue);
		}

		return this;
	};

	/**
	 * Returns the value for the property with the given <code>sPropertyName</code>.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically retrieve the value of a property.
	 * Use the concrete method get<i>XYZ</i> for property 'XYZ' instead.
	 *
	 * @param {string} sPropertyName the name of the property
	 * @returns {any} the value of the property
	 * @protected
	 */
	ManagedObject.prototype.getProperty = function(sPropertyName) {
		var oValue = this.mProperties[sPropertyName],
			oProperty = this.getMetadata().getManagedProperty(sPropertyName),
			oType;

		if (!oProperty) {
			throw new Error("Property \"" + sPropertyName + "\" does not exist in " + this);
		}

		oType = DataType.getType(oProperty.type);

		// If property has an array type, clone the array to avoid modification of original data
		if (oType instanceof DataType && oType.isArrayType() && Array.isArray(oValue)) {
			oValue = oValue.slice(0);
		}

		// If property is of type String instead of string, convert with valueOf()
		if (oValue instanceof String) {
			oValue = oValue.valueOf();
		}

		if (oProperty.byValue) {
			oValue  = deepClone(oValue);
		}

		return oValue;
	};

	/**
	 * Checks whether the given value is of the proper type for the given property name.
	 *
	 * In case <code>null</code> or <code>undefined</code> is passed, the default value for
	 * this property is used as value. If no default value is defined for the property, the
	 * default value of the type of the property is used.
	 *
	 * If the property has a data type that is an instance of sap.ui.base.DataType and if
	 * a <code>normalize</code> function is defined for that type, that function will be
	 * called with the resulting value as only argument. The result of the function call is
	 * then used instead of the raw value.
	 *
	 * This method is called by {@link #setProperty}. In many cases, subclasses of
	 * ManagedObject don't need to call it themselves.
	 *
	 * @param {string} sPropertyName Name of the property
	 * @param {any} oValue Value to be set
	 * @return {any} The normalized value for the passed value or for the default value if <code>null</code> or <code>undefined</code> was passed
	 * @throws {Error} If no property with the given name is found or the given value does not fit to the property type
	 * @throws {TypeError} If the value for a property with value semantic (<code>byValue:true</code>) contains a non-plain object
	 * @protected
	 */
	ManagedObject.prototype.validateProperty = function(sPropertyName, oValue) {
		var oProperty = this.getMetadata().getManagedProperty(sPropertyName),
			oType;

		if (!oProperty) {
			throw new Error("Property \"" + sPropertyName + "\" does not exist in " + this);
		}

		oType = DataType.getType(oProperty.type);

		// If property has an array type, clone the array to avoid modification of original data
		if (oType instanceof DataType && oType.isArrayType() && Array.isArray(oValue)) {
			oValue = oValue.slice(0);
		}

		// In case null is passed as the value return the default value, either from the property or from the type
		if (oValue == null /* null or undefined */ ) {
			oValue = oProperty.getDefaultValue();
		} else if (oType instanceof DataType) {
			// Implicit casting for string only, other types are causing errors

			if (oType.getName() == "string") {
				if (!(typeof oValue == "string" || oValue instanceof String)) {
					oValue = "" + oValue;
				}
			} else if (oType.getName() == "string[]") {
				// For compatibility convert string values to array with single entry
				if (typeof oValue == "string") {
					oValue = [oValue];
				}
				if (!Array.isArray(oValue)) {
					throw new Error("\"" + oValue + "\" is of type " + typeof oValue + ", expected string[]" +
							" for property \"" + sPropertyName + "\" of " + this);
				}
				for (var i = 0; i < oValue.length; i++) {
					if (typeof oValue[i] !== "string") {
						oValue[i] = "" + oValue[i];
					}
				}
			} else if (!oType.isValid(oValue)) {
				throw new Error("\"" + oValue + "\" is of type " + typeof oValue + ", expected " +
						oType.getName() + " for property \"" + sPropertyName + "\" of " + this);
			}
		}

        if (oProperty.byValue) {
            oValue = deepClone(oValue); // deep cloning only applies to date, object and array
        }

        // Normalize the value (if a normalizer was set using the setNormalizer method on the type)
		if (oType && oType.normalize && typeof oType.normalize === "function") {
			oValue = oType.normalize(oValue);
		}

		return oValue;
	};

	/**
	 * Returns whether the given property value is initial and has not been explicitly set or bound.
	 * Even after setting the default value or setting null/undefined (which also causes the default value to be set),
	 * the property is no longer initial. A property can be reset to initial state by calling <code>resetProperty(sPropertyName)</code>.
	 *
	 * @param {string} sPropertyName the name of the property
	 * @returns {boolean} true if the property is initial
	 * @protected
	 */
	ManagedObject.prototype.isPropertyInitial = function(sPropertyName) {
		return !Object.hasOwn(this.mProperties, sPropertyName) && !this.isBound(sPropertyName);
	};

	/**
	 * Resets the given property to the default value and also restores the "initial" state (like it has never been set).
	 *
	 * As subclasses might have implemented side effects in the named setter <code>setXYZ</code> for property 'xyz',
	 * that setter is called with a value of <code>null</code>, which by convention restores the default value of
	 * the property. This is only done to notify subclasses, the internal state is anyhow reset.
	 *
	 * When the property has not been modified so far, nothing will be done.
	 *
	 * @param {string} sPropertyName Name of the property
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @protected
	 */
	ManagedObject.prototype.resetProperty = function(sPropertyName) {
		if (this.mProperties.hasOwnProperty(sPropertyName)) {
			var oPropertyInfo = this.getMetadata().getManagedProperty(sPropertyName);
			oPropertyInfo.set(this, null); // let the control instance know the value is reset to default
			// if control did no further effort to find and set an instance-specific default value, then go back to "initial" state (where the default value is served anyway)
			if (this.mProperties[sPropertyName] === oPropertyInfo.getDefaultValue()) {
				delete this.mProperties[sPropertyName];
			}
		}
		return this;
	};

	/**
	 * Returns the origin info for the value of the given property.
	 *
	 * The origin info might contain additional information for translatable
	 * texts. The bookkeeping of this information is not active by default and must be
	 * activated by configuration. Even then, it might not be present for all properties
	 * and their values depending on where the value came form.
	 *
	 * If no origin info is available, <code>null</code> will be returned.
	 *
	 * @param {string} sPropertyName Name of the property
	 * @returns {{source: string, locale: string}}|null} An object describing the origin of this property's value or <code>null</code>
	 * @public
	 */
	ManagedObject.prototype.getOriginInfo = function(sPropertyName) {
		var oValue = this.mProperties[sPropertyName];
		if (!(oValue instanceof String && oValue.originInfo)) {
			return null;
		}
		return oValue.originInfo;
	};


	// ######################################################################################################
	// Associations
	// ######################################################################################################

	/**
	 * Sets the associated object for the given managed association of cardinality '0..1' and
	 * marks this ManagedObject as changed.
	 *
	 * The associated object can either be given by itself or by its id. If <code>null</code> or
	 * <code>undefined</code> is given, the association is cleared.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically set an object in an association.
	 * Use the concrete method set<i>XYZ</i> for association 'XYZ' or the generic {@link #applySettings} instead.
	 *
	 * @param {string}
	 *            sAssociationName name of the association
	 * @param {string | sap.ui.base.ManagedObject}
	 *            sId the ID of the managed object that is set as an association, or the managed object itself or null
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, the managed objects invalidate method is not called
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @protected
	 */
	ManagedObject.prototype.setAssociation = function(sAssociationName, sId, bSuppressInvalidate) {
		if (sId instanceof ManagedObject) {
			sId = sId.getId();
		} else if (sId != null && typeof sId !== "string") {
			assert(false, "setAssociation(): sId must be a string, an instance of sap.ui.base.ManagedObject or null");
			return this;
		}

		if (this.mAssociations[sAssociationName] === sId) {
			return this;
		} // no change

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}
		if (this._observer && this.mAssociations[sAssociationName] != null) {
			this._observer.associationChange(this, sAssociationName, "remove", this.mAssociations[sAssociationName]);
		}
		this.mAssociations[sAssociationName] = sId;
		if (this._observer && this.mAssociations[sAssociationName] != null) {
			this._observer.associationChange(this, sAssociationName, "insert", sId);
		}
		if (!this.isInvalidateSuppressed()) {
			this.invalidate();
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		return this;
	};

	/**
	 * Returns the content of the association with the given name.
	 *
	 * For associations of cardinality 0..1, a single string with the ID of an associated
	 * object is returned (if any). For cardinality 0..n, an array with the IDs of the
	 * associated objects is returned.
	 *
	 * If the association does not contain any objects(s), the given <code>oDefaultForCreation</code>
	 * is set as new value of the association and returned to the caller. The only supported values for
	 * <code>oDefaultForCreation</code> are <code>null</code> and <code>undefined</code> in the case of
	 * cardinality 0..1 and <code>null</code>, <code>undefined</code> or an empty array (<code>[]</code>)
	 * in case of cardinality 0..n. If the argument is omitted, <code>null</code> is used independently
	 * from the cardinality.
	 *
	 * <b>Note:</b> the need to specify a default value and the fact that it is stored as
	 * new value of a so far empty association is recognized as a shortcoming of this API
	 * but can no longer be changed for compatibility reasons.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically retrieve the content of an association.
	 * Use the concrete method get<i>XYZ</i> for association 'XYZ' instead.
	 *
	 * @param {string} sAssociationName the name of the association
	 * @param {null|Array} oDefaultForCreation
	 *            the value that is used in case the current aggregation is empty (only null or empty array is allowed)
	 * @returns {string | string[] | null} the ID of the associated managed object or an array of such IDs; may be null if the association has not been populated
	 * @protected
	 */
	ManagedObject.prototype.getAssociation = function(sAssociationName, oDefaultForCreation) {
		var result = this.mAssociations[sAssociationName];

		if (!result) {
			result = this.mAssociations[sAssociationName] = oDefaultForCreation || null;
		} else {
			if (typeof result.length === 'number' && !(result.propertyIsEnumerable('length')) ) {
				// Return a copy of the array instead of the array itself as reference!!
				return result.slice();
			}
			// simple type or ManagedObject
			return result;
		}

		return result;
	};

	/**
	 * Adds some object with the ID <code>sId</code> to the association identified by <code>sAssociationName</code> and
	 * marks this ManagedObject as changed.
	 *
	 * This method does not avoid duplicates.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically add an object to an association.
	 * Use the concrete method add<i>XYZ</i> for association 'XYZ' or the generic {@link #applySettings} instead.
	 *
	 * @param {string}
	 *            sAssociationName the string identifying the association the object should be added to.
	 * @param {string | sap.ui.base.ManagedObject}
	 *            sId the ID of the ManagedObject object to add; if empty, nothing is added; if a <code>sap.ui.base.ManagedObject</code> is given, its ID is added
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this managed object as well as the newly associated object are not marked as changed
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @protected
	 */
	ManagedObject.prototype.addAssociation = function(sAssociationName, sId, bSuppressInvalidate) {
		if (sId instanceof ManagedObject) {
			sId = sId.getId();
		} else if (typeof sId !== "string") {
			// TODO what about empty string?
			assert(false, "addAssociation(): sId must be a string or an instance of sap.ui.base.ManagedObject");
			return this;
		}

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}

		var aIds = this.mAssociations[sAssociationName];
		if (!aIds) {
			aIds = this.mAssociations[sAssociationName] = [sId];
		} else {
			aIds.push(sId);
		}
		if (this._observer) {
			this._observer.associationChange(this, sAssociationName, "insert", sId);
		}
		if (!this.isInvalidateSuppressed()) {
			this.invalidate();
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		return this;
	};

	/**
	 * Removes a <code>ManagedObject</code> from the association named <code>sAssociationName</code>.
	 *
	 * If an object is removed, the ID of that object is returned and this <code>ManagedObject</code> is
	 * marked as changed. Otherwise <code>null</code> is returned.
	 *
	 * If the same object was added multiple times to the same association, only a single
	 * occurrence of it will be removed by this method. If the object is not found or if the
	 * parameter can't be interpreted neither as a <code>ManagedObject</code> (or ID) nor as an index in
	 * the association, nothing will be removed. The same is true if an index is given and if
	 * that index is out of range for the association.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically remove an object from an association.
	 * Use the concrete method remove<i>XYZ</i> for association 'XYZ' instead.
	 *
	 * @param {string}
	 *            sAssociationName the string identifying the association the <code>ManagedObject</code> should be removed from.
	 * @param {int | string | sap.ui.base.ManagedObject}
	 *            vObject the position or ID of the <code>ManagedObject</code> to remove or the <code>ManagedObject</code> itself; if <code>vObject</code> is invalid input,
	 *            a negative value or a value greater or equal than the current size of the association, nothing is removed
	 * @param {boolean}
	 *            [bSuppressInvalidate] if <code>true</code>, the managed object is not marked as changed
	 * @returns {string|null} ID of the removed <code>ManagedObject</code> or <code>null</code>
	 * @protected
	 */
	ManagedObject.prototype.removeAssociation = function(sAssociationName, vObject, bSuppressInvalidate) {
		var aIds = this.mAssociations[sAssociationName];
		var sId = null;

		if (!aIds) {
			return null;
		}

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}

		if (typeof (vObject) == "object" && vObject.getId) { // object itself is given
			vObject = vObject.getId();
		}

		if (typeof (vObject) == "string") { // ID of the object is given or has just been retrieved
			for (var i = 0; i < aIds.length; i++) {
				if (aIds[i] == vObject) {
					vObject = i;
					break;
				}
			}
		}

		if (typeof (vObject) == "number") { // "object" is the index now
			if (vObject < 0 || vObject >= aIds.length) {
				future.warningThrows("ManagedObject.removeAssociation called with invalid index: " + sAssociationName + ", " + vObject);
			} else {
				sId = aIds[vObject];
				aIds.splice(vObject, 1);
				if (this._observer) {
					this._observer.associationChange(this, sAssociationName, "remove", sId);
				}
				if (!this.isInvalidateSuppressed()) {
					this.invalidate();
				}
			}
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		return sId;
	};

	/**
	 * Removes all the objects in the 0..n-association named <code>sAssociationName</code> and returns an array
	 * with their IDs. This ManagedObject is marked as changed, if the association contained any objects.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically remove all object from an association.
	 * Use the concrete method removeAll<i>XYZ</i> for association 'XYZ' instead.
	 *
	 * @param {string}
	 *            sAssociationName the name of the association
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this ManagedObject is not marked as changed
	 * @type Array
	 * @return an array with the IDs of the removed objects (might be empty)
	 * @protected
	 */
	ManagedObject.prototype.removeAllAssociation = function(sAssociationName, bSuppressInvalidate){
		var aIds = this.mAssociations[sAssociationName];
		if (!aIds) {
			return [];
		}

		delete this.mAssociations[sAssociationName];

		// maybe there is no association to remove
		if (!aIds.length) {
			return aIds;
		}

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}

		if (this._observer) {
			this._observer.associationChange(this, sAssociationName, "remove", aIds);
		}
		if (!this.isInvalidateSuppressed()) {
			this.invalidate();
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		return aIds;
	};

	// ######################################################################################################
	// Aggregations
	// ######################################################################################################

	/**
	 * Checks whether the given value is of the proper type for the given aggregation name.
	 *
	 * This method is already called by {@link #setAggregation}, {@link #addAggregation} and {@link #insertAggregation}.
	 * In many cases, subclasses of ManagedObject don't need to call it again in their mutator methods.
	 *
	 * @param {string} sAggregationName the name of the aggregation
	 * @param {sap.ui.base.ManagedObject|any} oObject the aggregated object or a primitive value
	 * @param {boolean} bMultiple whether the caller assumes the aggregation to have cardinality 0..n
	 * @return {sap.ui.base.ManagedObject|any} the passed object
	 * @throws Error if no aggregation with the given name is found or the given value does not fit to the aggregation type
	 * @protected
	 */
	ManagedObject.prototype.validateAggregation = function(sAggregationName, oObject, bMultiple, _bOmitForwarding /* private */) {
		var oMetadata = this.getMetadata(),
			oAggregation = oMetadata.getManagedAggregation(sAggregationName), // public or private
			aAltTypes,
			oType,
			i,
			msg;

		if (!oAggregation) {
			throw new Error("Aggregation \"" + sAggregationName + "\" does not exist in " + this);
		}

		if (oAggregation.multiple !== bMultiple) {
			throw new Error("Aggregation '" + sAggregationName + "' of " + this + " used with wrong cardinality (declared as " + (oAggregation.multiple ? "0..n" : "0..1") + ")");
		}

		var oForwarder = oMetadata.getAggregationForwarder(sAggregationName);
		if (oForwarder && !_bOmitForwarding) {
			oForwarder.getTarget(this).validateAggregation(oForwarder.targetAggregationName, oObject, bMultiple);
		}

		//Null is a valid value for 0..1 aggregations
		if (!oAggregation.multiple && !oObject) {
			return oObject;
		}

		if ( BaseObject.isObjectA(oObject, oAggregation.type) ) {
			return oObject;
		}

		// alternative types
		aAltTypes = oAggregation.altTypes;
		if ( aAltTypes && aAltTypes.length ) {
			// for primitive types, null or undefined is valid as well
			if ( oObject == null ) {
				return oObject;
			}
			for (i = 0; i < aAltTypes.length; i++) {
				oType = DataType.getType(aAltTypes[i]);
				if (oType instanceof DataType) {
					if (oType.isValid(oObject)) {
						return oObject;
					}
				}
			}
		}

		/**
		 * @deprecated
		 */
		if ((() => {
			// legacy validation for (unsupported) types that don't subclass BaseObject
			oType = ObjectPath.get(oAggregation.type);
			if ( typeof oType === "function" && oObject instanceof oType ) {
				return true;
			}
			return false;
		})()) {
			return oObject;
		}

		// TODO make this stronger again (e.g. for FormattedText)
		msg = "\"" + oObject + "\" is not valid for aggregation \"" + sAggregationName + "\" of " + this;
		if ( DataType.isInterfaceType(oAggregation.type) ) {
			assert(false, msg);
			return oObject;
		} else {
			throw new Error(msg);
		}
	};

	/**
	 * Sets a new object in the named 0..1 aggregation of this ManagedObject and
	 * marks this ManagedObject as changed.
	 *
	 * If the given object is not valid with regard to the aggregation (if it is not an instance
	 * of the type specified for that aggregation) or when the method is called for an aggregation
	 * of cardinality 0..n, then an Error is thrown (see {@link #validateAggregation}.
	 *
	 * If the new object is the same as the currently aggregated object, then the internal state
	 * is not modified and this ManagedObject is not marked as changed.
	 *
	 * If the given object is different, the parent of a previously aggregated object is cleared
	 * (it must have been this ManagedObject before), the parent of the given object is set to this
	 * ManagedObject and {@link #invalidate} is called for this object.
	 *
	 * Note that this method does neither return nor destroy the previously aggregated object.
	 * This behavior is inherited by named set methods (see below) in subclasses.
	 * To avoid memory leaks, applications therefore should first get the aggregated object,
	 * keep a reference to it or destroy it, depending on their needs, and only then set a new
	 * object.
	 *
	 * Note that ManagedObject only implements a single level of change tracking: if a first
	 * call to setAggregation recognizes a change, 'invalidate' is called. If another call to
	 * setAggregation reverts that change, invalidate() will be called again, the new status
	 * is not recognized as being 'clean' again.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically set an object in an aggregation.
	 * Use the concrete method set<i>XYZ</i> for aggregation 'XYZ' or the generic {@link #applySettings} instead.
	 *
	 * @param {string}
	 *            sAggregationName name of an 0..1 aggregation
	 * @param {sap.ui.base.ManagedObject}
	 *            oObject the managed object that is set as aggregated object
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this ManagedObject is not marked as changed
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @throws {Error}
	 * @protected
	 */
	ManagedObject.prototype.setAggregation = function(sAggregationName, oObject, bSuppressInvalidate) {
		var oForwarder = this.getMetadata().getAggregationForwarder(sAggregationName);
		if (oForwarder) {
			oObject = this.validateAggregation(sAggregationName, oObject, /* multiple */ false, /* omit forwarding */ true); // because validate below is done AFTER accessing this.mAggregations
			return oForwarder.set(this, oObject);
		}

		var oOldChild = this.mAggregations[sAggregationName];
		if (oOldChild === oObject) {
			return this;
		} // no change
		oObject = this.validateAggregation(sAggregationName, oObject, /* multiple */ false);

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}

		this.mAggregations[sAggregationName] = null;
		if (oOldChild instanceof ManagedObject) { // remove old child
			oOldChild.setParent(null);
		} else {
			if (this._observer != null && oOldChild != null) {
				//alternative type
				this._observer.aggregationChange(this, sAggregationName, "remove", oOldChild);
			}
		}
		this.mAggregations[sAggregationName] = oObject;
		if (oObject instanceof ManagedObject) { // adopt new child
			oObject.setParent(this, sAggregationName, bSuppressInvalidate);
		} else {
			if (!this.isInvalidateSuppressed()) {
				this.invalidate();
			}


			if (this._observer != null && oObject != null) {
				//alternative type
				this._observer.aggregationChange(this, sAggregationName, "insert", oObject);
			}
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		return this;
	};

	/**
	 * Returns the aggregated object(s) for the named aggregation of this ManagedObject.
	 *
	 * If the aggregation does not contain any objects(s), the given <code>oDefaultForCreation</code>
	 * (or <code>null</code>) is set as new value of the aggregation and returned to the caller.
	 *
	 * <b>Note:</b> the need to specify a default value and the fact that it is stored as
	 * new value of a so far empty aggregation is recognized as a shortcoming of this API
	 * but can no longer be changed for compatibility reasons.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically read the content of an aggregation.
	 * Use the concrete method get<i>XYZ</i> for aggregation 'XYZ' instead.
	 *
	 * @param {string} sAggregationName
	 *            Name of the aggregation
	 * @param {sap.ui.base.ManagedObject | Array} [oDefaultForCreation=null]
	 *            Object that is used in case the current aggregation is empty. If provided, it must be null for
	 *            0..1 aggregations or an empty array for 0..n aggregations. If not provided, <code>null</code> is used.
	 *
	 *            <b>Note:</b> When an empty array is given and used because the aggregation was not set before,
	 *            then this array will be used for the aggregation from thereon. Sharing the same empty array
	 *            between different calls to this method therefore is not possible and will result in
	 *            inconsistencies.
	 * @returns {sap.ui.base.ManagedObject|sap.ui.base.ManagedObject[]|null}
	 *            Aggregation array in case of 0..n-aggregations or the managed object or <code>null</code> in case of 0..1-aggregations
	 * @protected
	 */
	ManagedObject.prototype.getAggregation = function(sAggregationName, oDefaultForCreation) {
		var oForwarder = this.getMetadata().getAggregationForwarder(sAggregationName);
		if (oForwarder) {
			return oForwarder.get(this);
		}

		var aChildren = this.mAggregations[sAggregationName];
		if (!aChildren) {
			aChildren = this.mAggregations[sAggregationName] = oDefaultForCreation || null;
		}
		if (aChildren) {
			if (typeof aChildren.length === 'number' && !(aChildren.propertyIsEnumerable('length')) ) {
				// Return a copy of the array instead of the array itself as reference!!
				return aChildren.slice();
			}
			// simple type or ManagedObject
			return aChildren;
		} else {
			return null;
		}
	};

	/**
	 * Searches for the provided ManagedObject in the named aggregation and returns its
	 * 0-based index if found, or -1 otherwise. Returns -2 if the given named aggregation
	 * is of cardinality 0..1 and doesn't reference the given object.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically determine the position of an object in an aggregation.
	 * Use the concrete method indexOf<i>XYZ</i> for aggregation 'XYZ' instead.
	 *
	 * @param {string}
	 *            sAggregationName the name of the aggregation
	 * @param {sap.ui.base.ManagedObject}
	 *            oObject the ManagedObject whose index is looked for.
	 * @return {int} the index of the provided managed object in the aggregation.
	 * @protected
	 */
	ManagedObject.prototype.indexOfAggregation = function(sAggregationName, oObject) {
		var oForwarder = this.getMetadata().getAggregationForwarder(sAggregationName);
		if (oForwarder) {
			return oForwarder.indexOf(this, oObject);
		}

		var aChildren = this.mAggregations[sAggregationName];
		if (aChildren) {
			if (aChildren.length == undefined) {
				return -2;
			} // not a multiple aggregation

			for (var i = 0; i < aChildren.length; i++) {
				if (aChildren[i] == oObject) {
					return i;
				}
			}
		}
		return -1;
	};

	/**
	 * Inserts managed object <code>oObject</code> to the aggregation named <code>sAggregationName</code> at
	 * position <code>iIndex</code>.
	 *
	 * If the given object is not valid with regard to the aggregation (if it is not an instance
	 * of the type specified for that aggregation) or when the method is called for an aggregation
	 * of cardinality 0..1, then an Error is thrown (see {@link #validateAggregation}.
	 *
	 * If the given index is out of range with respect to the current content of the aggregation,
	 * it is clipped to that range (0 for iIndex < 0, n for iIndex > n).
	 *
	 * Please note that this method does not work as expected when an object is added
	 * that is already part of the aggregation. In order to change the index of an object
	 * inside an aggregation, first remove it, then insert it again.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically insert an object into an aggregation.
	 * Use the concrete method insert<i>XYZ</i> for aggregation 'XYZ' instead.
	 *
	 * @param {string}
	 *            sAggregationName the string identifying the aggregation the managed object <code>oObject</code>
	 *            should be inserted into.
	 * @param {sap.ui.base.ManagedObject}
	 *            oObject the ManagedObject to add; if empty, nothing is inserted.
	 * @param {int}
	 *            iIndex the <code>0</code>-based index the managed object should be inserted at; for a negative
	 *            value <code>iIndex</code>, <code>oObject</code> is inserted at position 0; for a value
	 *            greater than the current size of the aggregation, <code>oObject</code> is inserted at
	 *            the last position
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this ManagedObject as well as the added child are not marked as changed
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @protected
	 */
	ManagedObject.prototype.insertAggregation = function(sAggregationName, oObject, iIndex, bSuppressInvalidate) {
		if (!oObject) {
			return this;
		}
		oObject = this.validateAggregation(sAggregationName, oObject, /* multiple */ true, /* omit forwarding */ true);

		var oForwarder = this.getMetadata().getAggregationForwarder(sAggregationName);
		if (oForwarder) {
			return oForwarder.insert(this, oObject, iIndex);
		}

		var aChildren = this.mAggregations[sAggregationName] || (this.mAggregations[sAggregationName] = []);
		// force index into valid range
		var i;
		if (iIndex < 0) {
			i = 0;
		} else if (iIndex > aChildren.length) {
			i = aChildren.length;
		} else {
			i = iIndex;
		}
		if (i !== iIndex) {
			future.warningThrows("ManagedObject.insertAggregation: index '" + iIndex + "' out of range [0," + aChildren.length + "], forced to " + i);
		}
		aChildren.splice(i, 0, oObject);
		oObject.setParent(this, sAggregationName, bSuppressInvalidate);

		return this;
	};

	/**
	 * Adds some entity <code>oObject</code> to the aggregation identified by <code>sAggregationName</code>.
	 *
	 * If the given object is not valid with regard to the aggregation (if it is not an instance
	 * of the type specified for that aggregation) or when the method is called for an aggregation
	 * of cardinality 0..1, then an Error is thrown (see {@link #validateAggregation}.
	 *
	 * If the aggregation already has content, the new object will be added after the current content.
	 * If the new object was already contained in the aggregation, it will be moved to the end.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically add an object to an aggregation.
	 * Use the concrete method add<i>XYZ</i> for aggregation 'XYZ' or the generic {@link #applySettings} instead.
	 *
	 * @param {string}
	 *            sAggregationName the string identifying the aggregation that <code>oObject</code> should be added to.
	 * @param {sap.ui.base.ManagedObject}
	 *            oObject the object to add; if empty, nothing is added
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this ManagedObject as well as the added child are not marked as changed
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @protected
	 */
	ManagedObject.prototype.addAggregation = function(sAggregationName, oObject, bSuppressInvalidate) {
		if (!oObject) {
			return this;
		}
		oObject = this.validateAggregation(sAggregationName, oObject, /* multiple */ true, /* omit forwarding */ true);

		var oForwarder = this.getMetadata().getAggregationForwarder(sAggregationName);
		if (oForwarder) {
			return oForwarder.add(this, oObject);
		}

		var aChildren = this.mAggregations[sAggregationName];
		if (!aChildren) {
			aChildren = this.mAggregations[sAggregationName] = [oObject];
		} else {
			aChildren.push(oObject);
		}
		oObject.setParent(this, sAggregationName, bSuppressInvalidate);
		return this;
	};

	/**
	 * Removes an object from the aggregation named <code>sAggregationName</code> with cardinality 0..n.
	 *
	 * The removed object is not destroyed nor is it marked as changed.
	 *
	 * If the given object is found in the aggregation, it is removed, it's parent relationship
	 * is unset and this ManagedObject is marked as changed. The removed object is returned as
	 * result of this method. If the object could not be found, <code>null</code> is returned.
	 *
	 * This method must only be called for aggregations of cardinality 0..n. The only way to remove objects
	 * from a 0..1 aggregation is to set a <code>null</code> value for them.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically remove an object from an aggregation.
	 * Use the concrete method remove<i>XYZ</i> for aggregation 'XYZ' instead.
	 *
	 * @param {string}
	 *            sAggregationName the string identifying the aggregation that the given object should be removed from
	 * @param {int | string | sap.ui.base.ManagedObject}
	 *            vObject the position or ID of the ManagedObject that should be removed or that ManagedObject itself;
	 *            if <code>vObject</code> is invalid, a negative value or a value greater or equal than the current size
	 *            of the aggregation, nothing is removed.
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this ManagedObject is not marked as changed
	 * @returns {sap.ui.base.ManagedObject|null} the removed object or <code>null</code>
	 * @protected
	 */
	ManagedObject.prototype.removeAggregation = function(sAggregationName, vObject, bSuppressInvalidate) {
		var oForwarder = this.getMetadata().getAggregationForwarder(sAggregationName);
		if (oForwarder) {
			return oForwarder.remove(this, vObject);
		}

		var aChildren = this.mAggregations[sAggregationName],
			oChild = null,
			i;

		if ( !aChildren ) {
			return null;
		}

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}

		if (typeof (vObject) == "string") { // ID of the object is given
			// Note: old lookup via sap.ui.getCore().byId(vObject) only worked for Elements, not for managed objects in general!
			for (i = 0; i < aChildren.length; i++) {
				if (aChildren[i] && aChildren[i].getId() === vObject) {
					vObject = i;
					break;
				}
			}
		}

		if (typeof (vObject) == "object") { // the object itself is given or has just been retrieved
			for (i = 0; i < aChildren.length; i++) {
				if (aChildren[i] == vObject) {
					vObject = i;
					break;
				}
			}
		}

		if (typeof (vObject) == "number") { // "vObject" is the index now
			if (vObject < 0 || vObject >= aChildren.length) {
				future.warningThrows("ManagedObject.removeAggregation called with invalid index: " + sAggregationName + ", " + vObject);

			} else {
				oChild = aChildren[vObject];
				aChildren.splice(vObject, 1); // first remove it from array, then call setParent (avoids endless recursion)
				oChild.setParent(null);
				if (!this.isInvalidateSuppressed()) {
					this.invalidate();
				}
			}
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		return oChild;
	};

	/**
	 * Removes all objects from the 0..n-aggregation named <code>sAggregationName</code>.
	 *
	 * The removed objects are not destroyed nor are they marked as changed.
	 *
	 * Additionally, it clears the parent relationship of all removed objects, marks this
	 * ManagedObject as changed and returns an array with the removed objects.
	 *
	 * If the aggregation did not contain any objects, an empty array is returned and this
	 * ManagedObject is not marked as changed.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically remove all objects from an aggregation.
	 * Use the concrete method removeAll<i>XYZ</i> for aggregation 'XYZ' instead.
	 *
	 * @param {string} sAggregationName
	 *   Name of the aggregation to remove all objects from
	 * @param {boolean} [bSuppressInvalidate=false]
	 *   If true, this <code>ManagedObject</code> is not marked as changed
	 * @returns {sap.ui.base.ManagedObject[]} An array of the removed elements (might be empty)
	 * @protected
	 */
	ManagedObject.prototype.removeAllAggregation = function(sAggregationName, bSuppressInvalidate){
		var oForwarder = this.getMetadata().getAggregationForwarder(sAggregationName);
		if (oForwarder) {
			return oForwarder.removeAll(this);
		}

		var aChildren = this.mAggregations[sAggregationName];
		if (!aChildren) {
			return [];
		}

		delete this.mAggregations[sAggregationName];

		// maybe there is no aggregation to remove
		if (!aChildren.length) {
			return aChildren;
		}

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}

		for (var i = 0; i < aChildren.length; i++) {
			aChildren[i].setParent(null);
		}
		if (!this.isInvalidateSuppressed()) {
			this.invalidate();
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		return aChildren;
	};

	/**
	 * Destroys (all) the managed object(s) in the aggregation named <code>sAggregationName</code> and empties the
	 * aggregation. If the aggregation did contain any object, this ManagedObject is marked as changed.
	 *
	 * <b>Note:</b> This method is a low-level API as described in <a href="#lowlevelapi">the class documentation</a>.
	 * Applications or frameworks must not use this method to generically destroy all objects in an aggregation.
	 * Use the concrete method destroy<i>XYZ</i> for aggregation 'XYZ' instead.
	 *
	 * @param {string}
	 *            sAggregationName the name of the aggregation
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this ManagedObject is not marked as changed
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @protected
	 */
	ManagedObject.prototype.destroyAggregation = function(sAggregationName, bSuppressInvalidate){
		var oForwarder = this.getMetadata().getAggregationForwarder(sAggregationName);
		if (oForwarder) {
			return oForwarder.destroy(this);
		}

		var aChildren = this.mAggregations[sAggregationName],
			i, aChild;

		if (!aChildren) {
			return this;
		}

		// Deleting the aggregation here before destroying the children is a BUG:
		//
		// The destroy() method on the children calls _removeChild() on this instance
		// to properly remove each child from the bookkeeping by executing the named
		// removeXYZ() method. But as the aggregation is deleted here already,
		// _removeChild() doesn't find the child in the bookkeeping and therefore
		// refuses to work. As a result, side effects from removeXYZ() are missing.
		//
		// The lines below marked with 'FIXME DESTROY' sketch a potential fix, but
		// that fix has proven to be incompatible for several controls that don't
		// properly implement removeXYZ(). As this might affect custom controls
		// as well, the fix has been abandoned.
		//
		delete this.mAggregations[sAggregationName]; //FIXME DESTROY: should be removed here

		// maybe there is no aggregation to destroy
		if (Array.isArray(aChildren) && !aChildren.length) {
			return this;
		}

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}

		if (aChildren instanceof ManagedObject) {
			// FIXME DESTROY: this._removeChild(aChildren, sAggregationName, bSuppressInvalidate); // (optional, done by destroy())
			aChildren.destroy(bSuppressInvalidate);

			//fire aggregation lifecycle event on current parent as the control is removed, but not inserted to a new parent
			// FIXME DESTROY: no more need to fire event here when destroy ever should be fixed
			if (this._observer) {
				this._observer.aggregationChange(this, sAggregationName, "remove", aChildren);
			}
		} else if (Array.isArray(aChildren)) {
			for (i = aChildren.length - 1; i >= 0; i--) {
				aChild = aChildren[i];
				if (aChild) {
					// FIXME DESTROY: this._removeChild(aChild, sAggregationName, bSuppressInvalidate); // (optional, done by destroy())
					aChild.destroy(bSuppressInvalidate);

					//fire aggregation lifecycle event on current parent as the control is removed, but not inserted to a new parent
					if (this._observer) {
						this._observer.aggregationChange(this, sAggregationName, "remove", aChild);
					}
				}
			}
		}

		// FIXME DESTROY: // 'delete' aggregation only now so that _removeChild() can still do its cleanup
		// FIXME DESTROY: delete this.mAggregations[sAggregationName];

		if (!this.isInvalidateSuppressed()) {
			this.invalidate();
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		return this;
	};

	// ######################################################################################################
	// End of Aggregations
	// ######################################################################################################


	/**
	 * Marks this object and its aggregated children as 'invalid'.
	 *
	 * The term 'invalid' originally was introduced by controls where a change to the object's state made the
	 * rendered DOM <i>invalid</i>. Later, the concept of invalidation was moved up in the inheritance hierarchy
	 * to <code>ManagedObject</code>, but the term was kept for compatibility reasons.
	 *
	 * Managed settings (properties, aggregations, associations) invalidate the corresponding object automatically.
	 * Changing the state via the standard mutators, therefore, does not require an explicit call to <code>invalidate</code>.
	 * The same applies to changes made via data binding, as it internally uses the standard mutators.
	 *
	 * By default, a <code>ManagedObject</code> propagates any invalidation to its parent, unless the invalidation is
	 * suppressed on the parent. Controls or UIAreas handle invalidation on their own by triggering a re-rendering.
	 *
	 * @protected
	 */
	ManagedObject.prototype.invalidate = function() {
		if (this.oParent && this.oParent.isInvalidateSuppressed && !this.oParent.isInvalidateSuppressed()) {
			this.oParent.invalidate(this);
		}
	};


	/**
	 * Returns whether re-rendering is currently suppressed on this ManagedObject.
	 *
	 * @returns {boolean} Whether re-rendering is suppressed
	 * @protected
	 */
	ManagedObject.prototype.isInvalidateSuppressed = function() {
		return this.iSuppressInvalidate > 0;
	};

	/**
	 * Removes the given child from this object's named aggregation.
	 * @see sap.ui.core.UIArea#_removeChild
	 * @see sap.ui.base.ManagedObject#setParent
	 *
	 * @param {sap.ui.base.ManagedObject}
	 *            oChild the child object to be removed
	 * @param {string}
	 *            sAggregationName the name of this object's aggregation
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this ManagedObject is not marked as changed
	 * @private
	 */
	ManagedObject.prototype._removeChild = function(oChild, sAggregationName, bSuppressInvalidate) {
		if (!sAggregationName) {
			// an aggregation name has to be specified!
			future.errorThrows("Cannot remove aggregated child without aggregation name.", null, this);
		} else {
			// set suppress invalidate flag
			if (bSuppressInvalidate) {
				this.iSuppressInvalidate++;
			}

			var iIndex = this.indexOfAggregation(sAggregationName, oChild);
			var oAggregationInfo = this.getMetadata().getAggregation(sAggregationName);
			// Note: we assume that this is the given child's parent, i.e. -1 not expected!
			if (iIndex == -2) { // 0..1
				if (oAggregationInfo && this[oAggregationInfo._sMutator]) { // TODO properly deal with hidden aggregations
					this[oAggregationInfo._sMutator](null);
				} else {
					this.setAggregation(sAggregationName, null, bSuppressInvalidate);
				}
			} else if (iIndex > -1 ) { // 0..n
				if (oAggregationInfo && this[oAggregationInfo._sRemoveMutator]) { // TODO properly deal with hidden aggregations
					this[oAggregationInfo._sRemoveMutator](iIndex);
				} else {
					this.removeAggregation(sAggregationName, iIndex, bSuppressInvalidate);
				}
			} /* else {
				// item not found, this is unexpected; maybe mutator already removed it?
				// we could at least invalidate this, but we are not aware of any changes that would justify this
				if (!this.isInvalidateSuppressed()) {
					this.invalidate();
				}
			}*/

			// reset suppress invalidate flag
			if (bSuppressInvalidate) {
				this.iSuppressInvalidate--;
			}
		}
	};

	/**
	 * Checks whether object <code>a</code> is an inclusive descendant of object <code>b</code>.
	 *
	 * @param {sap.ui.base.ManagedObject} a Object that should be checked for being a descendant
	 * @param {sap.ui.base.ManagedObject} b Object that should be checked for having a descendant
	 * @returns {boolean} Whether <code>a</code> is a descendant of (or the same as) <code>b</code>
	 * @private
	 */
	function isInclusiveDescendantOf(a, b) {
		while ( a && a !== b ) {
			a = a.oParent;
		}
		return !!a;
	}

	/**
	 * Defines this object's new parent. If no new parent is given, the parent is
	 * just unset and we assume that the old parent has removed this child from its
	 * aggregation. But if a new parent is given, this child is first removed from
	 * its old parent.
	 *
	 * @param {sap.ui.base.ManagedObject}
	 *            oParent the object that becomes this objects's new parent
	 * @param {string}
	 *            sAggregationName the name of the parent objects's aggregation
	 * @param {boolean}
	 *            [bSuppressInvalidate] if true, this ManagedObject is not marked as changed. The old parent, however, is marked.
	 * @returns {this}
	 *            Returns <code>this</code> to allow method chaining
	 * @private
	 */
	ManagedObject.prototype.setParent = function(oParent, sAggregationName, bSuppressInvalidate) {
		assert(oParent == null || oParent instanceof ManagedObject, "oParent either must be null, undefined or a ManagedObject");
		var observer;

		if ( !oParent ) {

			//fire aggregation lifecycle event on current parent as the control is removed, but not inserted to a new parent
			if (this.oParent) {
				observer = this._observer || this.oParent._observer;
				if (observer) {
					observer.parentChange(this,this.sParentAggregationName,"unset", this.oParent);
				}

				// "this" is now moved to a different place; remove any forwarding information
				if (this.aAPIParentInfos && this.aAPIParentInfos.forwardingCounter === 0) {
					delete this.aAPIParentInfos; // => clear the previous API parent infos
				}
			}

			this.oParent = null;
			this.sParentAggregationName = null;
			var oPropagatedProperties = ManagedObject._oEmptyPropagatedProperties;

			/* In case of a 'move' - remove/add controls synchronously in an aggregation -
			 * we should not propagate synchronously when setting the parent to null.
			 * Synchronous propagation destroys the bindings when removing a control
			 * from the aggregation and recreates them when adding the control again.
			 * This could lead to a data refetch, and in some scenarios even to endless
			 * request loops.
			 */
			if (oPropagatedProperties !== this.oPropagatedProperties) {
				this.oPropagatedProperties = oPropagatedProperties;
				if (!this._bIsBeingDestroyed) {
					Promise.resolve().then(function() {
						// if object is being destroyed or parent is set again (move) no propagation is needed
						if (!this.oParent) {
							this.updateBindings(true, null);
							this.updateBindingContext(false, undefined, true);
							this.propagateProperties(true);
							this.fireModelContextChange();
						}
					}.bind(this));
				}
			}

			this._oContextualSettings = ManagedObject._defaultContextualSettings;
			if (!this._bIsBeingDestroyed) {
				Promise.resolve().then(function() {
					// if object is being destroyed or parent is set again (move) no propagation is needed
					if (!this.oParent) {
						this._propagateContextualSettings();
					}
				}.bind(this));
			}

			ActivityDetection.refresh();

			// Note: no need (and no way how) to invalidate
			return;
		}

		if ( isInclusiveDescendantOf(oParent, this) ) {
			throw new Error("Cycle detected: new parent '" + oParent + "' is already a descendant of (or equal to) '" + this + "'");
		}

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			//Refresh only for changes with suppressed invalidation (others lead to rerendering and refresh is handled there)
			ActivityDetection.refresh();
			oParent.iSuppressInvalidate++;
		}

		var oOldParent = this.getParent();
		if (oOldParent) { // remove this object from its old parent
			// Note: bSuppressInvalidate  by intention is not propagated to the old parent.
			// It is not sure whether the (direct or indirect) caller of setParent
			// has enough knowledge about the old parent to automatically propagate this.
			// If needed, callers can first remove the object from the oldParent (specifying a
			// suitable value for bSuppressInvalidate there) and only then call setParent.
			oOldParent._removeChild(this, this.sParentAggregationName);
		}
		// adopt new parent
		this.oParent = oParent;
		this.sParentAggregationName = sAggregationName;

		if (!oParent.mSkipPropagation[sAggregationName]) {
			//get properties to propagate - get them from the original API parent in case this control was moved by aggregation forwarding
			var oPropagatedProperties = this.aAPIParentInfos ? this.aAPIParentInfos[0].parent._getPropertiesToPropagate() : oParent._getPropertiesToPropagate();

			if (oPropagatedProperties !== this.oPropagatedProperties) {
				this.oPropagatedProperties = oPropagatedProperties;
				// update bindings
				if (this.hasModel()) {
					this.updateBindings(true, null); // TODO could be restricted to models that changed
					this.updateBindingContext(false, undefined, true);
					this.propagateProperties(true);
				}
				this._callPropagationListener();
				this.fireModelContextChange();
			}
		}

		this._applyContextualSettings(oParent._oContextualSettings);

		// only the parent knows where to render us, so we have to invalidate it
		if ( oParent && !oParent.isInvalidateSuppressed() ) {
			oParent.invalidate(this);
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			oParent.iSuppressInvalidate--;
		}

		//observe the aggregation change
		observer = this._observer || this.oParent._observer;
		if (observer) {
			observer.parentChange(this, sAggregationName, "set", this.oParent);
		}
		return this;
	};

	/**
	 * Applies new contextual settings to a managed object, and propagates them to its children
	 * @param {object} [oContextualSettings={}]
	 * @private
	 */
	ManagedObject.prototype._applyContextualSettings = function(oContextualSettings) {
		oContextualSettings = oContextualSettings || ManagedObject._defaultContextualSettings;
		if (this._oContextualSettings !== oContextualSettings) {
			this._oContextualSettings = oContextualSettings;
			this._propagateContextualSettings();
			if (this._bIsOwnerActive) {
				this._onContextualSettingsChanged();
			}
		}
	};

	/**
	 * Hook method to let descendants of ManagedObject know when propagated contextual settings have changed
	 * @private
	 * @ui5-restricted sap.ui.core.Element
	 */
	ManagedObject.prototype._onContextualSettingsChanged = function () {};

	/**
	 * Recursively applies a managed object's contextual settings to its children
	 * @private
	 */
	ManagedObject.prototype._propagateContextualSettings = function () {
		var oSettings = this._oContextualSettings,
			sAggregationName,
			oAggregation,
			i;

		for (sAggregationName in this.mAggregations) {

			oAggregation = this.mAggregations[sAggregationName];
			if (oAggregation instanceof ManagedObject) {
				oAggregation._applyContextualSettings(oSettings);
			} else if (oAggregation instanceof Array) {
				for (i = 0; i < oAggregation.length; i++) {
					if (oAggregation[i] instanceof ManagedObject) {
						oAggregation[i]._applyContextualSettings(oSettings);
					}
				}
			}
		}
	};

	/**
	 * Returns the contextual settings of a ManagedObject
	 * @returns {undefined|*}
	 * @private
	 */
	ManagedObject.prototype._getContextualSettings = function () {
		return this._oContextualSettings;
	};



	/**
	 * Returns the parent managed object or <code>null</code> if this object hasn't been added to a parent yet.
	 *
	 * The parent returned by this method is the technical parent used for data binding, invalidation,
	 * rendering etc. It might differ from the object on which the application originally added this object
	 * (the so called 'API parent'): some composite controls internally use hidden controls or containers
	 * to store their children. This method will return the innermost container that technically contains this
	 * object as a child.
	 *
	 * <b>Example:</b>
	 *
	 * Assume that a <code>Dialog</code> internally uses a (hidden) <code>VerticalLayout</code> to store its content:
	 *
	 * <pre>
	 *   Dialog (API parent)
	 *    \__ VerticalLayout (hidden composite part)
	 *       \__ Text (API child)
	 * </pre>
	 *
	 * If you add some content by calling the <code>Dialog.prototype.addContent</code> API, this will lead
	 * to the following observations:
	 *
	 * <pre>
	 *   oDialog.addContent(oText);
	 *   console.log(oText.getParent() === oDialog);  // false
	 *   console.log(oText.getParent() instanceof VerticalLayout); // true
	 *   console.log(oText.getParent().getParent() === oDialog); // true now, but might fail with later versions
	 * </pre>
	 *
	 * Technically, from API perspective, <code>oText</code> is added as a child to <code>Dialog</code>.
	 * But internally, the <code>Dialog</code> adds the child to the hidden <code>VerticalLayout</code> container.
	 * If you now call the <code>getParent</code> method of the child, you will get the internal
	 * <code>VerticalLayout</code> object and not the <code>Dialog</code> API parent.
	 *
	 * <b>Note: </b> The internal (hidden) structure of a composite control is not fixed and may be changed
	 * (see also our "Compatibility Rules"). Therefore, you should <b>never</b> rely on a specific structure or
	 * object being returned by <code>getParent</code>.
	 *
	 * <b>Note: </b> There is no API to determine the original API parent.
	 *
	 * @returns {sap.ui.base.ManagedObject|null} The technical parent managed object or <code>null</code>
	 * @public
	 */
	ManagedObject.prototype.getParent = function() {
		/* Be aware that internally this.oParent is used to reduce method calls.
		 * Check for side effects when overriding this method */
		return this.oParent;
	};

	/**
	 * Cleans up the resources associated with this object and all its aggregated children.
	 *
	 * After an object has been destroyed, it can no longer be used!
	 *
	 * Applications should call this method if they don't need the object any longer.
	 *
	 * @param {boolean} [bSuppressInvalidate=false] If <code>true</code>, this ManagedObject and all its ancestors won't be invalidated.
	 *      <br>This flag should be used only during control development to optimize invalidation procedures.
	 *      It should not be used by any application code.
	 * @public
	 */
	ManagedObject.prototype.destroy = function(bSuppressInvalidate) {
		var sName, oBindingInfo;
		// ignore repeated calls
		if (this.bIsDestroyed) {
			return;
		}

		var that = this;

		// avoid binding update/propagation
		this._bIsBeingDestroyed = true;

		// set suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate++;
		}

		// Data Binding
		for (sName in this.mBindingInfos) {
			oBindingInfo = this.mBindingInfos[sName];
			if (oBindingInfo.binding) {
				if (oBindingInfo.factory) {
					this._detachAggregationBindingHandlers(sName);
				} else {
					this._detachPropertyBindingHandlers(sName);
				}
			}
		}

		for (sName in this.mObjectBindingInfos) {
			oBindingInfo = this.mObjectBindingInfos[sName];
			if (oBindingInfo.binding) {
				this._detachObjectBindingHandlers(oBindingInfo);
			}
		}

		if (this.exit) {
			_enforceNoReturnValue(this.exit(), /*mLogInfo=*/{ name: "exit", component: this.getId() }); // 'exit' hook isn't allowed to return any values.
		}

		// TODO: generic concept for exit hooks?
		if ( this._exitCompositeSupport ) {
			this._exitCompositeSupport();
		}

		// ensure that also our children are destroyed!!
		for (var oAggr in this.mAggregations) {
			this.destroyAggregation(oAggr, bSuppressInvalidate);
		}

		// Deregister, if available
		if (this.deregister) {
			this.deregister();
		}

		// remove this child from parent aggregation
		if (this.oParent && this.sParentAggregationName) {
			this.oParent._removeChild(this, this.sParentAggregationName, bSuppressInvalidate);
		}
		// for robustness only - should have been cleared by _removeChild already
		delete this.oParent;

		// Data Binding
		for (sName in this.mBindingInfos) {
			if (this.mBindingInfos[sName].factory) {
				this.unbindAggregation(sName, true);
			} else {
				this.unbindProperty(sName, true);
			}
		}

		for (sName in this.mObjectBindingInfos) {
			this.unbindObject(sName, /* _bSkipUpdateBindingContext */ true);
		}

		// reset suppress invalidate flag
		if (bSuppressInvalidate) {
			this.iSuppressInvalidate--;
		}

		if ( this._observer ) {
			this._observer.objectDestroyed(this);
		}

		if ( this.aAPIParentInfos ) {
			this.aAPIParentInfos = null;
		}

		EventProvider.prototype.destroy.apply(this, arguments);

		// finally make the object unusable
		this.setParent = function(){
			throw Error("The object with ID " + that.getId() + " was destroyed and cannot be used anymore.");
		};

		// make visible that it's been destroyed.
		this.bIsDestroyed = true;
	};

	/**
	 * Determines whether a given object contains binding information instead of a
	 * value or aggregated controls. The method is used in applySettings for processing
	 * the JSON notation of properties/aggregations in the constructor.
	 *
	 * @param {object} oValue the value
	 * @param {object} oKeyInfo the metadata of the property
	 *
	 * @returns {boolean} whether the value contains binding information
	 *
	 * @private
	 * @deprecated
	 */
	ManagedObject.prototype.isBinding = function(oValue, oKeyInfo) {
		return typeof this.extractBindingInfo(oValue) === "object";
	};

	/**
	 * Checks whether the given value can be interpreted as a binding info and
	 * returns that binding info or an unescaped string or undefined when it is not.
	 *
	 * When the 'complex' binding syntax is enabled, the function might also return
	 * a string value in case the given value was a string, did not represent a binding
	 * but contained escaped special characters.
	 *
	 * There are two possible notations for binding information in the object literal notation
	 * of the ManagedObject constructor and ManagedObject.applySettings:
	 * <ul>
	 *   <li>property: "{path}"
	 *   This is used for property binding and can only contain the path.
	 *   </li>
	 *   <li>property:{path:"path", template:oTemplate}
	 *   This is used for aggregation binding, where a template is required or can
	 *   be used for property binding when additional data is required (e.g. formatter).
	 *   </li>
	 * </ul>
	 *
	 * @param {object} oValue
	 * @param {object} oScope
	 * @param {boolean} bDetectValue
	 *
	 * @returns {object|string|undefined} the binding info object or an unescaped string or <code>undefined</code>.
	 *     If a binding info is returned, it contains at least a path property
	 *     or nested bindings (parts) and, depending on the binding type,
	 *     additional properties
	 *
	 * @private
	 */
	ManagedObject.prototype.extractBindingInfo = function(oValue, oScope, bDetectValue) {
		var oBindingInfo = BindingInfo.extract(oValue, oScope, bDetectValue);
		// property:{path:"path", template:oTemplate}
		// Binding templates should only be constructed from object syntax,
		// string representation for templates is not supported
		if (typeof oValue === "object" && oBindingInfo && oBindingInfo.template) {
			// allow JSON syntax for templates
			oBindingInfo.template = makeObject(oBindingInfo.template);
		}
		return oBindingInfo;
	};

	/**
	 * Returns the binding info for the given property or aggregation.
	 *
	 * The binding info contains information about path, binding object, format options, sorter, filter etc.
	 * for the property or aggregation. As the binding object is only created when the model becomes available,
	 * the <code>binding</code> property may be undefined.
	 *
	 * @param {string} sName Name of the property or aggregation
	 *
	 * @returns {sap.ui.base.ManagedObject.PropertyBindingInfo|sap.ui.base.ManagedObject.AggregationBindingInfo}
	 *  A binding info object, containing at least a <code>path</code> or <code>parts</code> property and, depending on
	 *  the binding type, additional properties
	 *
	 * @protected
	 */
	ManagedObject.prototype.getBindingInfo = function(sName) {
		var oForwarder = this.getMetadata().getAggregationForwarder(sName);
		if (oForwarder && oForwarder.forwardBinding) {
			return oForwarder.getTarget(this).getBindingInfo(oForwarder.targetAggregationName);
		}

		return this.mBindingInfos[sName];
	};

	/**
	 * Returns the object binding info for the given model.
	 *
	 * The binding info contains information about path, binding object, format options, sorter, filter etc.
	 * for the model. As the binding object is only created when the model becomes available,
	 * the <code>binding</code> property may be undefined.
	 *
	 * @param {string} [sModelName=undefined] Non-empty name of the model or <code>undefined</code>
	 *    Omitting the model name (or using the value <code>undefined</code>) is explicitly allowed and
	 *    refers to the default model.
	 * @returns {object} A binding info object, containing at least a <code>path</code> and additional properties
	 * @private
	 */
	ManagedObject.prototype._getObjectBindingInfo = function(sModelName) {
		return this.mObjectBindingInfos[sModelName];
	};

	/**
	 * Configuration for the binding of a managed object
	 *
	 * <code>path</code> is the only mandatory property, all others are optional.
	 *
	 * @typedef {object} sap.ui.base.ManagedObject.ObjectBindingInfo
	 *
	 * @property {string} path
	 *   Path in the model to bind to, either an absolute path or relative to the binding context for the
	 *   corresponding model. If the path contains a '&gt;' sign, the string preceding it will override
	 *   the <code>model</code> property, and the remainder after the '&gt;' sign will be used as binding path
	 * @property {string} [model]
	 *   Name of the model to bind against; when <code>undefined</code> or omitted, the default model is used
	 * @property {boolean} [suspended]
	 *   Whether the binding is initially suspended
	 * @property {object} [parameters]
	 *   Map of additional parameters for this binding; the names and value ranges of the supported
	 *   parameters depend on the model implementation and should be documented with the
	 *   <code>bindContext</code> method of the corresponding model class or with the model-specific
	 *   subclass of <code>sap.ui.model.ContextBinding</code>
	 * @property {Object<string,function>} [events]
	 *   Map of event handler functions keyed by the name of the binding events that they are attached to.
	 *   The names and value ranges of the supported events depend on the model implementation and should be
	 *   documented with the model-specific subclass of <code>sap.ui.model.ContextBinding</code>.
	 *
	 * @public
	 */

	/**
	 * Bind the object to the referenced entity in the model.
	 *
	 * The entity is used as the binding context to resolve bound properties or aggregations of the object itself
	 * and all of its children relatively to the given path. If a relative binding path is used, it will be
	 * evaluated anew whenever the parent context changes.
	 *
	 * Whenever the corresponding model becomes available or changes (either via a call to {@link #setModel setModel}
	 * or propagated from a {@link #getParent parent}), its {@link sap.ui.model.Model#bindContext bindContext}
	 * method will be called to create a new {@link sap.ui.model.ContextBinding ContextBinding} with the configured
	 * binding options.
	 *
	 * There's no difference between <code>bindObject</code> and {@link sap.ui.core.Element#bindElement bindElement}.
	 * Method <code>bindObject</code> was introduced together with <code>ManagedObject</code> to make context bindings
	 * also available on <code>ManagedObject</code>s. The new name was chosen to reflect that the binding is not
	 * necessarily applied to an <code>Element</code>, it also could be applied to a component or some other
	 * <code>ManagedObject</code>.
	 *
	 * Also see {@link topic:91f05e8b6f4d1014b6dd926db0e91070 Context Binding} in the documentation.
	 *
	 * @param {sap.ui.base.ManagedObject.ObjectBindingInfo} oBindingInfo
	 *            Binding info
	 * @returns {this}
	 *            Returns <code>this</code> to allow method chaining
	 * @public
	 */
	ManagedObject.prototype.bindObject = function(oBindingInfo) {
		var sModelName,
			sPath;

		// support legacy notation (sPath, mParameters)
		if (typeof oBindingInfo == "string") {
			sPath = oBindingInfo;
			oBindingInfo = {
				path: sPath,
				parameters: arguments[1]
			};
		}

		oBindingInfo = BindingInfo.createObject(oBindingInfo);
		sModelName = oBindingInfo.model;

		// if old binding exists, clean it up
		if ( this.getObjectBinding(sModelName) ) {
			this.unbindObject(sModelName, /* _bSkipUpdateBindingContext */ true);
			// We don't push down context changes here
			// Either this will happen with the _bindObject call below or the model
			// is not available yet and wasn't available before -> no change of contexts
		}

		this.mObjectBindingInfos[sModelName] = oBindingInfo;

		// if the models are already available, create the binding
		if (BindingInfo.isReady(oBindingInfo, this)) {
			this._bindObject(oBindingInfo);
		}

		return this;
	};

	function logError(sFunctionName) {
		future.errorThrows("Unexpected call of '" + sFunctionName + "'.");
	}

	/**
	 * Create object binding.
	 *
	 * @param {sap.ui.base.ManagedObject.ObjectBindingInfo} oBindingInfo The bindingInfo object
	 * @private
	 */
	ManagedObject.prototype._bindObject = logError.bind(null, "_bindObject");

	/**
	 * Detach all object binding event handler
	 *
	 * @param {sap.ui.base.ManagedObject.ObjectBindingInfo} oBindingInfo The BindingInfo to detach the handler for.
	 * @private
	 */
	ManagedObject.prototype._detachObjectBindingHandlers = logError.bind(null, "_detachObjectBindingHandlers");

	/**
	 * Removes the defined binding context of this object, all bindings will now resolve
	 * relative to the parent context again.
	 *
	 * @param {string} [sModelName] Name of the model to remove the context for.
	 * @returns {this} Reference to the instance itself
	 * @public
	 */
	ManagedObject.prototype.unbindObject = function(sModelName, /* internal use only */ _bSkipUpdateBindingContext) {
		var oBindingInfo = this.mObjectBindingInfos[sModelName];
		if (oBindingInfo) {
			delete this.mObjectBindingInfos[sModelName];
			if (oBindingInfo.binding) {
				this._unbindObject(oBindingInfo, sModelName, /* internal use only */ _bSkipUpdateBindingContext);
			}
		}
		return this;
	};

	ManagedObject.prototype._unbindObject = logError.bind(null, "_unbindObject");

	/**
	 * Bind the object to the referenced entity in the model, which is used as the binding context
	 * to resolve bound properties or aggregations of the object itself and all of its children
	 * relatively to the given path.
	 *
	 * @deprecated Since 1.11.1, please use {@link #bindObject} instead.
	 * @param {string} sPath the binding path
	 * @returns {this} reference to the instance itself
	 * @public
	 */
	ManagedObject.prototype.bindContext = function(sPath) {
		return this.bindObject(sPath);
	};

	/**
	 * Removes the defined binding context of this object, all bindings will now resolve
	 * relative to the parent context again.
	 *
	 * @deprecated Since 1.11.1, please use {@link #unbindObject} instead.
	 * @param {string} [sModelName] name of the model to remove the context for.
	 * @returns {this} reference to the instance itself
	 * @public
	 */
	ManagedObject.prototype.unbindContext = function(sModelName) {
		return this.unbindObject(sModelName);
	};

	/**
	 * Configuration for the binding of a managed property.
	 *
	 * Exactly one of <code>path</code>, <code>value</code> or <code>parts</code> must be specified.
	 * The same configuration can be provided for the parts of a composite binding, but
	 * nesting composite bindings in composite bindings is not yet supported.
	 *
	 * Aggregations with cardinality 0..1 that have a simple, alternative type (aka <code>altType</code>),
	 * can be bound with the same kind of configuration, e.g. the <code>tooltip</code> aggregation of elements.
	 *
	 * @typedef {object} sap.ui.base.ManagedObject.PropertyBindingInfo
	 *
	 * @property {string} [path]
	 *   Path in the model to bind to, either an absolute path or relative to the binding context for the
	 *   corresponding model; when the path contains a '&gt;' sign, the string preceding it will override
	 *   the <code>model</code> property and the remainder after the '&gt;' will be used as binding path
	 * @property {string} [value]
	 *   Since 1.61, defines a static binding with the given value.
	 * @property {string} [model]
	 *   Name of the model to bind against; when <code>undefined</code> or omitted, the default model is used
	 * @property {boolean} [suspended]
	 *   Whether the binding should be suspended initially
	 * @property {function} [formatter]
	 *   Function to convert model data into a property value
	 * @property {boolean} [useRawValues]
	 *   Whether the parameters to the formatter function should be passed as raw values.
	 *   In this case the specified types for the binding parts are not used and the values
	 *   are not formatted.
	 *
	 *   <b>Note</b>: use this flag only when using multiple bindings. If you use only one
	 *   binding and want raw values then simply don't specify a type for that binding.
	 *
	 * @property {boolean} [useInternalValues]
	 *   Whether the parameters to the formatter function should be passed as the related JavaScript primitive values.
	 *   In this case the values of the model are parsed by the {@link sap.ui.model.SimpleType#getModelFormat model format}
	 *   of the specified types from the binding parts.
	 *
	 *   <b>Note</b>: use this flag only when using multiple bindings.
	 * @property {sap.ui.model.Type|string} [type]
	 *   A type object or the name of a type class to create such a type object; the type
	 *   will be used for converting model data to a property value (aka "formatting") and
	 *   vice versa (in binding mode <code>TwoWay</code>, aka "parsing")
	 * @property {string} [targetType]
	 *   Target type to be used by the type when formatting model data, for example "boolean"
	 *   or "string" or "any"; defaults to the property's type
	 * @property {object} [formatOptions]
	 *   Format options to be used for the type; only taken into account when the type is
	 *   specified by its name - a given type object won't be modified
	 * @property {object} [constraints]
	 *   Additional constraints to be used when constructing a type object from a type name,
	 *   ignored when a type object is given
	 * @property {sap.ui.model.BindingMode} [mode=Default]
	 *   Binding mode to be used for this property binding (e.g. one way)
	 * @property {object} [parameters=null]
	 *   Map of additional parameters for this binding; the names and value ranges of the supported
	 *   parameters depend on the model implementation, they should be documented with the
	 *   <code>bindProperty</code> method of the corresponding model class or with the model specific
	 *   subclass of <code>sap.ui.model.PropertyBinding</code>
	 * @property {Object<string,function>} [events=null]
	 *   Map of event handler functions keyed by the name of the binding events that they should be attached to
	 * @property {Array<string|sap.ui.base.ManagedObject.PropertyBindingInfo>} [parts]
	 *   Array of binding info objects for the parts of a composite binding; the structure of
	 *   each binding info is the same as described for the <code>oBindingInfo</code> as a whole.
	 *
	 *   If a part is not specified as a binding info object but as a simple string, a binding info object
	 *   will be created with that string as <code>path</code>. The string may start with a model name prefix
	 *   (see property <code>path</code>).
	 *
	 *   <b>Note</b>: recursive composite bindings are currently not supported. Therefore, a part must not
	 *   contain a <code>parts</code> property.
	 *
	 * @public
	 */

	/**
	 * Binds a property to the model.
	 *
	 * Whenever the corresponding model becomes available or changes (either via a call to {@link #setModel setModel}
	 * or propagated from a {@link #getParent parent}), its {@link sap.ui.model.Model#bindProperty bindProperty}
	 * method will be called to create a new {@link sap.ui.model.PropertyBinding PropertyBinding} with the configured
	 * binding options.
	 *
	 * The Setter for the given property will be called by the binding with the value retrieved from the data
	 * model. When the binding mode is <code>OneTime</code>, the property will be set only once. When it is
	 * <code>OneWay</code>, the property will be updated whenever the corresponding data in the model changes.
	 * In mode <code>TwoWay</code>, changes to the property (not originating in the model) will be
	 * reported back to the model (typical use case: user interaction changes the value of a control).
	 *
	 * This is a generic method which can be used to bind any property to the model. A managed
	 * object may flag any property in its metadata with <code>bindable: "bindable"</code> to additionally
	 * provide named methods to bind and unbind the corresponding property.
	 *
	 * <b>Composite Binding</b><br>
	 * A composite property binding which combines data from multiple model paths can be declared using
	 * the <code>parts</code> parameter instead of <code>path</code>. The <code>formatter</code> function
	 * or a {@link sap.ui.model.CompositeType composite type} then can be used to combine the parts,
	 * Properties with a composite binding are also known as "calculated fields".
	 *
	 * Example:
	 * <pre>
	 *   oTxt.bindValue({
	 *     parts: [
	 *       {path: "/firstName", type: "sap.ui.model.type.String"},
	 *       {path: "myModel2>/lastName"}
	 *     ]
	 *   });
	 * </pre>
	 *
	 * Note that a composite binding will be forced into mode <code>OneWay</code> when one of the
	 * binding parts is not in mode <code>TwoWay</code>.
	 *
	 * <b>Static Binding</b><br>
	 * A StaticBinding allows to define static values within a <code>sap.ui.model.CompositeBinding</code>.
	 * It behaves like a property binding but always returns the value that is stored in the binding itself.
	 * The binding does not have a <code>sap.ui.model.Context</code>, a <code>sap.ui.model.Model</code> or
	 * a <code>oBindingInfo.path</code>.
	 * A StaticBinding is created when a <code>oBindingInfo.value</code> is passed instead
	 * of a <code>oBindingInfo.path</code> or <code>oBindingInfo.parts[i].path</code>.
	 *
	 * Also see {@link sap.ui.model.StaticBinding StaticBinding} in the documentation.
	 *
	 * <b>Formatter Functions</b><br>
	 * When a formatter function is specified for the binding or for a binding part, it will be
	 * called with the value of the bound model property. After setting the initial property value,
	 * the formatter function will only be called again when the bound model property changes
	 * (simple property binding) or when at least one of the bound model properties changes
	 * (formatter function of a composite binding). Note that a binding only monitors the
	 * bound model data for changes. Dependencies of the formatter implementation to other model
	 * data is not known to the binding and changes won't be detected.
	 *
	 * When the formatter for a property binding (simple or composite) is called, the managed object
	 * will be given as <code>this</code> context. For formatters of binding parts in a composite
	 * binding, this is not the case.
	 *
	 * Also see {@link topic:91f0652b6f4d1014b6dd926db0e91070 Property Binding} in the documentation.
	 *
	 * @param {string} sName
	 *            Name of a public property to bind; public aggregations of cardinality 0..1 that have an alternative,
	 *            simple type (e.g. "string" or "int") can also be bound with this method
	 * @param {sap.ui.base.ManagedObject.PropertyBindingInfo} oBindingInfo
	 *            Binding information
	 * @returns {this}
	 *            Returns <code>this</code> to allow method chaining
	 * @public
	 */
	ManagedObject.prototype.bindProperty = function(sName, oBindingInfo, /* undocumented, old API only: */ _vFormat, _sMode) {
		var oProperty = this.getMetadata().getPropertyLikeSetting(sName);

		// check whether property or alternative type on aggregation exists
		if (!oProperty) {
			throw new Error("Property \"" + sName + "\" does not exist in " + this);
		}

		// old API compatibility (sName, sPath, _vFormat, _sMode)
		if (typeof oBindingInfo == "string") {
			oBindingInfo = {
				parts: [ {
					path: oBindingInfo,
					type: BaseObject.isObjectA(_vFormat, "sap.ui.model.Type") ? _vFormat : undefined,
					mode: _sMode
				} ],
				formatter: typeof _vFormat === 'function' ? _vFormat : undefined
			};
		}

		// if property is already bound, unbind it first
		if (this.isBound(sName)) {
			this.unbindProperty(sName, true);
		}

		oBindingInfo = BindingInfo.createProperty(oBindingInfo);

		// store binding info to create the binding, as soon as the model is available, or when the model is changed
		this.mBindingInfos[sName] = oBindingInfo;

		if (this._observer) {
			this._observer.bindingChange(this, sName, "prepare", oBindingInfo, "property");
		}

		// if the models are already available, create the binding
		if (BindingInfo.isReady(oBindingInfo, this)) {
			this._bindProperty(sName, oBindingInfo);
		}
		return this;
	};

	ManagedObject.prototype._bindProperty = function(sName, oBindingInfo) {
		/* Special case for handling StaticBindings:
		If all parts are a StaticBinding no mixin of the binding relevant code
		is done via a Model. In this case we need to handle these static
		bindings manually by simulating its static behavior:
		  - call formatter
		  - call property mutator
		If at least one part refers to a real Model this
		code will be overwritten by the mixin and works as before.*/
		var bIsStaticOnly = true;
		for (var i = 0; i < oBindingInfo.parts.length; i++) {
			if (oBindingInfo.parts[i].value === undefined) {
				bIsStaticOnly = false;
				break;
			}
		}
		// The special treatment of early 'static-only' StaticBindings is making compromises on a couple of things:
		//   - no async type can be supported
		//   - no handling of parse/validate exceptions
		//   - observers won't be called
		if (bIsStaticOnly) {
			var aValues = [];
			oBindingInfo.parts.forEach(function(oPart) {
				aValues.push(oPart.formatter ? oPart.formatter(oPart.value) : oPart.value);
			});
			var vValue = oBindingInfo.formatter ? oBindingInfo.formatter(aValues) : aValues.join(" ");
			var oPropertyInfo = this.getMetadata().getPropertyLikeSetting(sName);
			this[oPropertyInfo._sMutator](vValue);
		} else {
			logError.call(this, "_bindProperty");
		}
	};

	/**
	 * Detach all property binding event handler
	 *
	 * Note: The DataState event handler could not be detached here. This must happen after
	 * the destroy call to correctly cleanup messages. We leave it in unbindProperty and
	 * check for destroy state in the handler itself.
	 *
	 * @param {string} sName the name of the property
	 * @private
	 */
	ManagedObject.prototype._detachPropertyBindingHandlers = function(sName) { };

	/**
	 * Unbind the property from the model
	 *
	 * @param {string} sName the name of the property
	 * @param {boolean} bSuppressReset whether the reset to the default value when unbinding should be suppressed
	 * @returns {this} reference to the instance itself
	 * @public
	 */
	ManagedObject.prototype.unbindProperty = function(sName, bSuppressReset) {
		var oBindingInfo = this.mBindingInfos[sName];
		if (oBindingInfo) {
			if (oBindingInfo.binding) {
				this._unbindProperty(oBindingInfo, sName);
			}

			if (this._observer && !this._bIsBeingDestroyed) {
				this._observer.bindingChange(this,sName,"remove", this.mBindingInfos[sName], "property");
			}

			delete this.mBindingInfos[sName];
			if (!bSuppressReset) {
				this.resetProperty(sName);
			}
		}
		return this;
	};

	ManagedObject.prototype._unbindProperty = logError.bind(null, "_unbindProperty");

	/**
	 * Find out whether the given property is being updated. This occurs when the corresponding data in the model for
	 * the given property is changed. The method can be used to determine if the setter of a property is called
	 * from a model update.
	 *
	 * When the given property isn't bound at all, <code>false</code> is returned.
	 *
	 * @param {string} sName the name of the property
	 * @return {boolean} Whether the given property is being updated
	 * @private
	 * @ui5-restricted sap.m
	 */
	ManagedObject.prototype.isPropertyBeingUpdated = function(sName) {
		const oBindingInfo = this.getBindingInfo(sName);
		return !!(oBindingInfo?.skipModelUpdate);
	};

	/**
	 * Generic method which is called, whenever a property binding is changed.
	 *
	 * This method gets the external format from the property binding and applies
	 * it to the setter.
	 *
	 * @param {string} sName
	 *   Name of the property to update
	 * @private
	 */
	ManagedObject.prototype.updateProperty = function(sName) { };

	/**
	 * Update the property in the model if two way data binding mode is enabled
	 *
	 * @param {string} sName the name of the property to update
	 * @param {any} oValue the new value to set for the property in the model
	 * @param {any} oOldValue the previous value of the property
	 * @private
	 */
	ManagedObject.prototype.updateModelProperty = function(sName, oValue, oOldValue) { };

	// a non-falsy value used as default for 'templateShareable'.
	var MAYBE_SHAREABLE_OR_NOT = 1;

	/**
	 * Configuration for the binding of a managed aggregation of cardinality 0..n.
	 *
	 * <code>path</code> is the only mandatory property, all others are optional.
	 *
	 * @typedef {object} sap.ui.base.ManagedObject.AggregationBindingInfo
	 *
	 * @property {string} path
	 *   Path in the model to bind to, either an absolute path or relative to the binding context for the
	 *   corresponding model; when the path contains a '&gt;' sign, the string preceding it will override
	 *   the <code>model</code> property and the remainder after the '&gt;' will be used as binding path
	 * @property {string} [model]
	 *   Name of the model to bind against; when <code>undefined</code> or omitted, the default model is used
	 * @property {sap.ui.base.ManagedObject} [template]
	 *   The template to clone for each item in the aggregation; either a template or a factory must be given
	 * @property {boolean} [templateShareable=undefined]
	 *   Whether the framework should assume that the application takes care of the lifecycle of the given
	 *   template; when set to <code>true</code>, the template can be used in multiple bindings, either in
	 *   parallel or over time, and the framework won't clone it when this <code>ManagedObject</code> is cloned;
	 *   when set to <code>false</code>, the lifecycle of the template is bound to the lifecycle of the binding,
	 *   when the aggregation is unbound or when this <code>ManagedObject</code> is destroyed, the template also
	 *   will be destroyed, and when this  <code>ManagedObject</code> is cloned, the template will be cloned
	 *   as well; the third option (<code>undefined</code>) only exists for compatibility reasons, its behavior
	 *   is not fully reliable and it may leak the template
	 * @property {function(string, sap.ui.model.Context):sap.ui.base.ManagedObject} [factory]
	 *   A factory function that will be called to create an object for each item in the aggregation;
	 *   this is an alternative to providing a template object and can be used when the objects should differ
	 *   depending on the binding context; the factory function will be called with two parameters: an ID that
	 *   should be used for the created object and the binding context for which the object has to be created;
	 *   the function must return an object appropriate for the bound aggregation
	 * @property {boolean} [suspended]
	 *   Whether the binding should be suspended initially
	 * @property {int} [startIndex]
	 *   the first entry of the list to be created
	 * @property {int} [length]
	 *   The amount of entries to be created (may exceed the size limit of the model)
	 * @property {sap.ui.model.Sorter|sap.ui.model.Sorter[]} [sorter]
	 *   The initial sort order (optional)
	 * @property {sap.ui.model.Filter|sap.ui.model.Filter[]} [filters]
	 *   The predefined filters for this aggregation (optional)
	 * @property {string|function(sap.ui.model.Context):string} [key]
	 *   Name of the key property or a function getting the context as only parameter to calculate a key
	 *   for entries. This can be used to improve update behaviour in models, where a key is not already
	 *   available.
	 * @property {object} [parameters=null]
	 *   Map of additional parameters for this binding; the names and value ranges of the supported
	 *   parameters depend on the model implementation, they should be documented with the
	 *   <code>bindList</code> method of the corresponding model class or with the model specific
	 *   subclass of <code>sap.ui.model.ListBinding</code>
	 * @property {function({key: string}):sap.ui.base.ManagedObject} [groupHeaderFactory]
	 *   A factory function to generate custom group visualization (optional). It should return a
	 *   control suitable to visualize a group header (e.g. a <code>sap.m.GroupHeaderListItem</code>
	 *   for a <code>sap.m.List</code>).
	 * @property {Object<string,function>} [events=null]
	 *   Map of event handler functions keyed by the name of the binding events that they should be attached to.
	 *   The names and value ranges of the supported events depend on the model implementation and should be
	 *   documented with the model-specific subclass of <code>sap.ui.model.ListBinding</code>.
	 *
	 * @public
	 */

	/**
	 * Bind an aggregation to the model.
	 *
	 * Whenever the corresponding model becomes available or changes (either via a call to {@link #setModel setModel}
	 * or propagated from a {@link #getParent parent}), its {@link sap.ui.model.Model#bindList bindList} method will
	 * be called to create a new {@link sap.ui.model.ListBinding ListBinding} with the configured binding options.
	 *
	 * The bound aggregation will use the given template, clone it for each item which exists in the bound list and set
	 * the appropriate binding context.
	 *
	 * This is a generic method which can be used to bind any aggregation to the model. A class may flag aggregations
	 * in its metadata with <code>bindable: "bindable"</code> to get typed <code>bind<i>Something</i></code> and
	 * <code>unbind<i>Something</i></code> methods for those aggregations.
	 *
	 * Also see {@link topic:91f057786f4d1014b6dd926db0e91070 List Binding (Aggregation Binding)} in the documentation.
	 *
	 * For more information on the <code>oBindingInfo.key</code> property and its usage, see
	 * {@link topic:7cdff73f308b4b10bdf7d83b7aba72e7 Extended Change Detection}.
	 *
	 * @param {string} sName
	 *            Name of a public aggregation to bind
	 * @param {sap.ui.base.ManagedObject.AggregationBindingInfo} oBindingInfo
	 *            Binding info
	 *
	 * @returns {this}
	 *            Returns <code>this</code> to allow method chaining
	 * @public
	 */
	ManagedObject.prototype.bindAggregation = function(sName, oBindingInfo) {
		var sPath,
			oTemplate,
			aSorters,
			aFilters,
			oMetadata = this.getMetadata(),
			oAggregationInfo = oMetadata.getAggregation(sName);

		// check whether aggregation exists
		if (!oAggregationInfo) {
			throw new Error("Aggregation \"" + sName + "\" does not exist in " + this);
		}
		if (!oAggregationInfo.multiple) {
			future.errorThrows("Binding of single aggregation \"" + sName + "\" of " + this + " is not supported!");
		}

		// Old API compatibility (sName, sPath, oTemplate, oSorter, aFilters)
		if (typeof oBindingInfo == "string") {
			sPath = arguments[1];
			oTemplate = arguments[2];
			aSorters = arguments[3];
			aFilters = arguments[4];
			oBindingInfo = {path: sPath, sorter: aSorters, filters: aFilters};
			// allow either to pass the template or the factory function as 3rd parameter
			if (oTemplate instanceof ManagedObject) {
				oBindingInfo.template = oTemplate;
			} else if (typeof oTemplate === "function") {
				oBindingInfo.factory = oTemplate;
			}
		}

		var oForwarder = oMetadata.getAggregationForwarder(sName);
		if (oForwarder && oForwarder.forwardBinding) {
			oForwarder.getTarget(this).bindAggregation(oForwarder.targetAggregationName, oBindingInfo);
			return this;
		}

		// if aggregation is already bound, unbind it first
		if (this.isBound(sName)) {
			this.unbindAggregation(sName);
		}

		if (oBindingInfo.template) {
			// set default for templateShareable
			if ( oBindingInfo.template._sapui_candidateForDestroy ) {
				// template became active again, we should no longer consider to destroy it
				Log.warning(
					"A binding template that is marked as 'candidate for destroy' is reused in a binding. " +
					"You can use 'templateShareable:true' to fix this issue for all bindings that are affected " +
					"(The template is used in aggregation '" + sName + "' of object '" + this.getId() + "'). " +
					"For more information, see documentation under 'Aggregation Binding'.");
				delete oBindingInfo.template._sapui_candidateForDestroy;
			}
			if (oBindingInfo.templateShareable === undefined) {
				oBindingInfo.templateShareable = MAYBE_SHAREABLE_OR_NOT;
			}
		}
		oBindingInfo = BindingInfo.createAggregation(oBindingInfo, oAggregationInfo._doesNotRequireFactory);

		// store binding info to create the binding, as soon as the model is available, or when the model is changed
		this.mBindingInfos[sName] = oBindingInfo;

		if (!(oBindingInfo.template || oBindingInfo.factory)) {
			throw new Error("Missing template or factory function for aggregation " + sName + " of " + this + " !");
		}

		if (oBindingInfo.factory) {
			// unwrap factory if alread wrapped (e.g. bindingInfo is shared)
			var fnOriginalFactory = oBindingInfo.factory[BINDING_INFO_FACTORY_SYMBOL] || oBindingInfo.factory;

			// wrap runWithOwner() call around the original factory function
			var sOwnerId = this._sOwnerId;
			oBindingInfo.factory = function(sId, oContext) {
				// bind original factory with the two arguments: id and bindingContext
				return ManagedObject.runWithOwner(fnOriginalFactory.bind(null, sId, oContext), sOwnerId);
			};
			oBindingInfo.factory[BINDING_INFO_FACTORY_SYMBOL] = fnOriginalFactory;
		}

		if (this._observer) {
			this._observer.bindingChange(this, sName, "prepare", oBindingInfo, "aggregation");
		}

		// if the model is already available create the binding
		if (BindingInfo.isReady(oBindingInfo, this)) {
			this._bindAggregation(sName, oBindingInfo);
		}
		return this;
	};

	/**
	 * Create list/tree binding
	 *
	 * @param {string} sName Name of the aggregation
	 * @param {object} oBindingInfo The bindingInfo object
	 * @private
	 */
	ManagedObject.prototype._bindAggregation = logError.bind(null, "_bindAggregation");

	/**
	 * Detach all aggregation binding event handler
	 *
	 * @param {string} sName the name of the aggregation
	 * @private
	 */
	ManagedObject.prototype._detachAggregationBindingHandlers = logError.bind(null, "_detachAggregationBindingHandlers");

	/**
	 * Unbind the aggregation from the model.
	 *
	 * After unbinding, the current content of the aggregation is destroyed by default.
	 * When the <code>bSuppressReset</code> parameter is set, it is however retained.
	 *
	 * @param {string} sName Name of the aggregation
	 * @param {boolean} bSuppressReset Indicates whether destroying the content of the aggregation is skipped
	 * @returns {this} Reference to this instance itself
	 * @public
	 */
	ManagedObject.prototype.unbindAggregation = function(sName, bSuppressReset) {
		var oForwarder = this.getMetadata().getAggregationForwarder(sName);
		if (oForwarder && oForwarder.forwardBinding) {
			oForwarder.getTarget(this).unbindAggregation(oForwarder.targetAggregationName, bSuppressReset);
			return this;
		}

		var oBindingInfo = this.mBindingInfos[sName],
			oAggregationInfo = this.getMetadata().getAggregation(sName);
		if (oBindingInfo) {
			if (oBindingInfo.binding) {
				this._unbindAggregation(oBindingInfo, sName);
			}
			// remove template if any
			if (oBindingInfo.template ) {
				if ( !oBindingInfo.templateShareable && oBindingInfo.template.destroy ) {
					oBindingInfo.template.destroy();
				}
				if ( oBindingInfo.templateShareable === MAYBE_SHAREABLE_OR_NOT ) {
					oBindingInfo.template._sapui_candidateForDestroy = true;
				}
			}
			if (this._observer && !this._bIsBeingDestroyed) {
				this._observer.bindingChange(this,sName,"remove", this.mBindingInfos[sName], "aggregation");
			}
			delete this.mBindingInfos[sName];
			if (!bSuppressReset) {
				this[oAggregationInfo._sDestructor]();
			}
		}
		return this;
	};

	ManagedObject.prototype._unbindAggregation = logError.bind(null, "_unbindAggregation");

	/**
	 * Generic method which is called whenever an aggregation binding has changed.
	 *
	 * Depending on the type of the list binding and on additional configuration, this method either
	 * destroys all elements in the aggregation <code>sName</code> and recreates them anew
	 * or tries to reuse as many existing objects as possible. It is up to the method which
	 * strategy it uses.
	 *
	 * In case a managed object needs special handling for an aggregation binding, it can create
	 * a named update method (e.g. <code>update<i>Rows</i></code> for an aggregation <code>rows</code>)
	 * which then will be called by the framework instead of this generic method. THe method will be
	 * called with two arguments <code>sChangeReason</code> and <code>oEventInfo</code>.
	 *
	 * Subclasses should call this method only in the implementation of such a named update method
	 * and for no other purposes. The framework might change the conditions under which the method
	 * is called and the method implementation might rely on those conditions.
	 *
	 * @param {string} sName Name of the aggregation to update
	 * @param {sap.ui.model.ChangeReason} sChangeReason One of the predefined reasons for the change event
	 * @param {object} oEventInfo Additional information about the change event
	 * @param {string} [oEventInfo.detailedReason] A non-standardized string that further classifies the
	 *   change event. Model implementations should document any value that they might provide as detailed
	 *   reason, and describe under what circumstances each value will be used.
	 * @protected
	 */
	ManagedObject.prototype.updateAggregation = function(sName, sChangeReason, oEventInfo) { };

	/**
	 * Generic method which can be called, when an aggregation needs to be refreshed.
	 * This method does not make any change on the aggregation, but just calls the
	 * <code>getContexts</code> method of the binding to trigger fetching of new data.
	 *
	 * Subclasses should call this method only in the implementation of a named refresh method
	 * and for no other purposes. The framework might change the conditions under which the method
	 * is called and the method implementation might rely on those conditions.
	 *
	 * @param {string} sName name of the aggregation to refresh
	 * @protected
	 */
	ManagedObject.prototype.refreshAggregation = function(sName) { };

	/**
	* Generic method which is called, whenever messages for this object exist.
	*
	* @param {string} sName The property name
	* @param {array} aMessages The messages
	* @protected
	* @since 1.28
	*/
	ManagedObject.prototype.propagateMessages = function(sName, aMessages) {
		future.warningThrows("Message for " + this + ", Property " + sName + " received. Control " + this.getMetadata().getName() + " does not support messaging without using data binding.");
	};

	/**
	 *  This method is used internally and should only be overridden by a tree managed object which utilizes the tree binding.
	 *  In this case and if the aggregation is a tree node the overridden method should then return true.
	 *  If true is returned the tree binding will be used instead of the list binding.
	 *
	 *  @param {string} sName the aggregation to bind (e.g. nodes for a tree managed object)
	 *  @return {boolean} whether tree binding should be used or list binding. Default is false. Override method to change this behavior.
	 *
	 *  @protected
	 */
	ManagedObject.prototype.isTreeBinding = function(sName) {
		return false;
	};

	/**
	 * Create or update local bindings.
	 *
	 * Called when model or binding contexts have changed. Creates bindings when the model was not available
	 * at the time bindProperty or bindAggregation was called. Recreates the bindings when they exist already
	 * and when the model has changed.
	 *
	 * @param {boolean} bUpdateAll forces an update of all bindings, sModelName will be ignored
	 * @param {string|undefined} sModelName name of a model whose bindings should be updated
	 *
	 * @private
	 */
	ManagedObject.prototype.updateBindings = function(bUpdateAll, sModelName) { };

	/**
	 * Find out whether a property or aggregation is bound
	 *
	 * @param {string} sName the name of the property or aggregation
	 * @return {boolean} whether a binding exists for the given name
	 * @public
	 */
	ManagedObject.prototype.isBound = function(sName){
		return !!this.getBindingInfo(sName);
	};

	/**
	 * Get the object binding object for a specific model.
	 *
	 * <b>Note:</b> to be compatible with future versions of this API, you must not use the following model names:
	 * <ul>
	 * <li><code>null</code></li>
	 * <li>empty string <code>""</code></li>
	 * <li>string literals <code>"null"</code> or <code>"undefined"</code></li>
	 * </ul>
	 * Omitting the model name (or using the value <code>undefined</code>) is explicitly allowed and
	 * refers to the default model.
	 *
	 * @param {string} [sModelName=undefined] Non-empty name of the model or <code>undefined</code>
	 * @returns {sap.ui.model.ContextBinding|undefined} Context binding for the given model name or <code>undefined</code>
	 * @public
	 */
	ManagedObject.prototype.getObjectBinding = function(sModelName){
		assertModelName(sModelName);
		var oInfo = this._getObjectBindingInfo(sModelName);
		return oInfo && oInfo.binding;
	};

	/**
	 * Returns the parent managed object as new eventing parent to enable control event bubbling
	 * or <code>null</code> if this object hasn't been added to a parent yet.
	 *
	 * @returns {sap.ui.base.EventProvider|null} the parent event provider
	 * @protected
	 */
	ManagedObject.prototype.getEventingParent = function() {
		return this.oParent;
	};

	/**
	 * Get the binding object for a specific aggregation/property.
	 *
	 * @param {string} sName the name of the property or aggregation
	 * @returns {sap.ui.model.Binding|undefined} the binding for the given name
	 * @public
	 */
	ManagedObject.prototype.getBinding = function(sName){
		var oInfo = this.getBindingInfo(sName);
		return oInfo && oInfo.binding;
	};

	/**
	 * Get the binding path for a specific aggregation/property.
	 *
	 * @param {string} sName the name of the property or aggregation
	 * @return {string|undefined} the binding path for the given name
	 * @protected
	 */
	ManagedObject.prototype.getBindingPath = function(sName){
		var oInfo = this.getBindingInfo(sName);
		return oInfo && (oInfo.path || (oInfo.parts && oInfo.parts[0] && oInfo.parts[0].path));
	};

	/**
	 * Set the binding context for this ManagedObject for the model with the given name.
	 *
	 * <b>Note:</b> to be compatible with future versions of this API, you must not use the following model names:
	 * <ul>
	 * <li><code>null</code></li>
	 * <li>empty string <code>""</code></li>
	 * <li>string literals <code>"null"</code> or <code>"undefined"</code></li>
	 * </ul>
	 * Omitting the model name (or using the value <code>undefined</code>) is explicitly allowed and
	 * refers to the default model.
	 *
	 * A value of <code>null</code> for <code>oContext</code> hides the parent context. The parent context will
	 * no longer be propagated to aggregated child controls. A value of <code>undefined</code> removes a currently
	 * active context or a <code>null</code> context and the parent context gets visible and propagated again.
	 *
	 * <b>Note:</b> A ManagedObject inherits binding contexts from the Core only when it is a descendant of a UIArea.
	 *
	 * @param {sap.ui.model.Context} oContext the new binding context for this object
	 * @param {string} [sModelName] the name of the model to set the context for or <code>undefined</code>
	 *
	 * @returns {this} reference to the instance itself
	 * @public
	 */
	ManagedObject.prototype.setBindingContext = function(oContext, sModelName){
		assertModelName(sModelName);
		var oOldContext = this.oBindingContexts[sModelName];
		if (oOldContext !== oContext || oContext && oContext.hasChanged()) {
			if (oContext === undefined) {
				delete this.oBindingContexts[sModelName];
			} else {
				this.oBindingContexts[sModelName] = oContext;
			}
			this.updateBindingContext(false, sModelName);
			this.propagateProperties(sModelName);
			this.fireModelContextChange();
		}
		return this;
	};

	/**
	 * Set the ObjectBinding context for this ManagedObject for the model with the given name. Only set internally
	 * from a ContextBinding.
	 *
	 * A value of <code>null</code> for <code>oContext</code> hides the parent context. The parent context will
	 * no longer be propagated to aggregated child controls. A value of <code>undefined</code> removes a currently
	 * active context or a <code>null</code> context and the parent context gets visible and propagated again.
	 *
	 * @param {sap.ui.model.Context} oContext the new ObjectBinding context for this object
	 * @param {string} [sModelName] the name of the model to set the context for or <code>undefined</code>
	 * @private
	 */
	ManagedObject.prototype.setElementBindingContext = function(oContext, sModelName) { };

	/**
	 * Update the binding context in this object and all aggregated children
	 * @private
	 */
	ManagedObject.prototype.updateBindingContext = function(bSkipLocal, sFixedModelName, bUpdateAll) { };


	/**
	 * Get the binding context of this object for the given model name.
	 *
	 * If the object does not have a binding context set on itself and has no own model set,
	 * it will use the first binding context defined in its parent hierarchy.
	 *
	 * <b>Note:</b> to be compatible with future versions of this API, you must not use the following model names:
	 * <ul>
	 * <li><code>null</code></li>
	 * <li>empty string <code>""</code></li>
	 * <li>string literals <code>"null"</code> or <code>"undefined"</code></li>
	 * </ul>
	 * Omitting the model name (or using the value <code>undefined</code>) is explicitly allowed and
	 * refers to the default model.
	 *
	 * <b>Note:</b> A ManagedObject inherits binding contexts from the Core only when it is a descendant of a UIArea.
	 *
	 * @param {string} [sModelName] the name of the model or <code>undefined</code>
	 * @returns {sap.ui.model.Context|null|undefined} The binding context of this object
	 * @public
	 */
	ManagedObject.prototype.getBindingContext = function(sModelName){
		var oModel = this.getModel(sModelName),
			oElementBindingContext = this.mElementBindingContexts[sModelName];

		if (oElementBindingContext && !oModel) {
			return oElementBindingContext;
		} else if (oElementBindingContext && oModel && oElementBindingContext.getModel() === oModel) {
			return oElementBindingContext;
		} else if (oElementBindingContext === null) {
			return oElementBindingContext;
		} else {
			return this._getBindingContext(sModelName);
		}
	};

	/**
	 * Get the binding context of this object for the given model name.
	 *
	 * An elementBindingContext will not be considered.
	 *
	 * @returns {sap.ui.model.Context|null|undefined} Bound context
	 * @private
	 */
	ManagedObject.prototype._getBindingContext = function(sModelName){
		var oModel = this.getModel(sModelName),
			oContext = this.oBindingContexts[sModelName],
			oPropagatedContext = this.oPropagatedProperties.oBindingContexts[sModelName];

		if (oContext && !oModel) {
			return this.oBindingContexts[sModelName];
		} else if (oContext && oModel && oContext.getModel() === oModel) {
			return this.oBindingContexts[sModelName];
		} else if (oContext === null) {
			return oContext;
		} else if (oPropagatedContext && oModel && oPropagatedContext.getModel() !== oModel) {
			return undefined;
		} else {
			return oPropagatedContext;
		}
	};

	/**
	 * Sets or unsets a model for the given model name for this ManagedObject.
	 *
	 * The <code>sName</code> must either be <code>undefined</code> (or omitted) or a non-empty string.
	 * When the name is omitted, the default model is set/unset. To be compatible with future versions
	 * of this API, you must not use the following model names:
	 * <ul>
	 * <li><code>null</code></li>
	 * <li>empty string <code>""</code></li>
	 * <li>string literals <code>"null"</code> or <code>"undefined"</code></li>
	 * </ul>
	 *
	 * When <code>oModel</code> is <code>null</code> or <code>undefined</code>, a previously set model
	 * with that name is removed from this ManagedObject. If an ancestor (parent, UIArea or Core) has a model
	 * with that name, this ManagedObject will immediately inherit that model from its ancestor.
	 *
	 * All local bindings that depend on the given model name are updated (created if the model references
	 * became complete now; updated, if any model reference has changed; removed if the model references
	 * became incomplete now).
	 *
	 * Any change (new model, removed model, inherited model) is also applied to all aggregated descendants
	 * as long as a descendant doesn't have its own model set for the given name.
	 *
	 * <b>Note:</b> By design, it is not possible to hide an inherited model by setting a <code>null</code> or
	 * <code>undefined</code> model. Applications can set an empty model to achieve the same.
	 *
	 * <b>Note:</b> A ManagedObject inherits models from the Core only when it is a descendant of a UIArea.
	 *
	 * @param {sap.ui.model.Model|null|undefined} oModel Model to be set or <code>null</code> or <code>undefined</code>
	 * @param {string} [sName=undefined] the name of the model or <code>undefined</code>
	 * @returns {this} <code>this</code> to allow method chaining
	 * @public
	 */
	ManagedObject.prototype.setModel = function(oModel, sName) {
		assert(oModel == null || BaseObject.isObjectA(oModel, "sap.ui.model.Model"), "oModel must be an instance of sap.ui.model.Model, null or undefined");
		assert(sName === undefined || (typeof sName === "string" && !/^(undefined|null)?$/.test(sName)), "sName must be a string or omitted");
		if (!oModel && this.oModels[sName]) {
			delete this.oModels[sName];
			// propagate Models to children
			// model changes are propagated until (including) the first descendant that has its own model with the same name
			this.propagateProperties(sName);
			// if the model instance for a name changes, all bindings for that model name have to be updated
			this.updateBindings(false, sName);
			this.fireModelContextChange();
		} else if ( oModel && oModel !== this.oModels[sName] ) {
			//TODO: handle null!
			this.oModels[sName] = oModel;
			// propagate Models to children
			// model changes are propagated until (including) the first descendant that has its own model with the same name
			this.propagateProperties(sName);
			// update binding context, for primary model only
			this.updateBindingContext(false, sName);
			// if the model instance for a name changes, all bindings for that model name have to be updated
			this.updateBindings(false, sName);
			this.fireModelContextChange();
		} // else nothing to do
		return this;
	};

	/**
	 * Adds a listener function that will be called during each propagation step on every control
	 * @param {function} listener function
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @private
	 * @ui5-restricted sap.ui.fl
	 */
	ManagedObject.prototype.addPropagationListener = function(listener) {
		assert(typeof listener === 'function', "listener must be a function");
		this.aPropagationListeners.push(listener);
		this.propagateProperties(false);
		// call Listener on current object
		this._callPropagationListener(listener);
		return this;
	};

	/**
	 * remove a propagation listener
	 * @param {function} listener function
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @private
	 * @ui5-restricted sap.ui.fl
	 */
	ManagedObject.prototype.removePropagationListener = function(listener) {
		assert(typeof listener === 'function', "listener must be a function");
		var aListeners = this.aPropagationListeners;
		var i = aListeners.indexOf(listener);
		if ( i >= 0 ) {
		  aListeners.splice(i,1);
		  this.propagateProperties(false);
		}
		return this;
	};

	/**
	 * get propagation listeners
	 * @returns {array} aPropagationListeners Returns registered propagationListeners
	 * @private
	 * @ui5-restricted sap.ui.fl
	 */
	ManagedObject.prototype.getPropagationListeners = function() {
		return this.oPropagatedProperties.aPropagationListeners.concat(this.aPropagationListeners);
	};

	/**
	 * Calls a registered listener during propagation
	 *
	 * @param {function} listener
	 *      If given, the given function will be called, other wise all propagation listeners will be called.
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @private
	 */
	ManagedObject.prototype._callPropagationListener = function(listener) {
		var aListeners;
		if (listener) {
			listener(this);
		} else {
			aListeners = this.getPropagationListeners();
			for (var i = 0; i < aListeners.length; i++) {
				listener = aListeners[i];
				listener(this);
			}
		}
		return this;
	};

	ManagedObject._oEmptyPropagatedProperties = {oModels:{}, oBindingContexts:{}, aPropagationListeners:[]};

	function _hasAsRealChild(oParent, oChild) {
		return !oChild.aAPIParentInfos || oChild.aAPIParentInfos[0].parent === oParent;
	}

	/**
	 * Propagate properties (models and binding contexts) to aggregated objects.
	 *
	 * @param {boolean|string|undefined} vName
	 *   When <code>true</code>, all bindings are updated, when <code>false</code> only propagationListeners
	 *   are update. Otherwise only those for the given model name (undefined == name of default model).
	 *
	 * @private
	 */
	ManagedObject.prototype.propagateProperties = function(vName) {
		var oProperties = this._getPropertiesToPropagate(),
			bUpdateAll = vName === true, // update all bindings when no model name parameter has been specified
			bUpdateListener = vName === false, //update only propagation listeners
			sName = bUpdateAll ? undefined : vName,
			sAggregationName, oAggregation, i,
			mAllAggregations = Object.assign({}, this.mAggregations, this.mForwardedAggregations);

		// introduce data binding capabilities via mixin if available
		checkForBindingSupport(oProperties.oModels);

		for (sAggregationName in mAllAggregations) {
			if (this.mSkipPropagation[sAggregationName]) {
				continue;
			}
			oAggregation = mAllAggregations[sAggregationName];
			if (oAggregation instanceof ManagedObject) {
				if (_hasAsRealChild(this, oAggregation)) { // do not propagate to children forwarded from somewhere else
					this._propagateProperties(vName, oAggregation, oProperties, bUpdateAll, sName, bUpdateListener);
				}
			} else if (oAggregation instanceof Array) {
				for (i = 0; i < oAggregation.length; i++) {
					if (oAggregation[i] instanceof ManagedObject) {
						if (_hasAsRealChild(this, oAggregation[i])) { // do not propagate to children forwarded from somewhere else
							this._propagateProperties(vName, oAggregation[i], oProperties, bUpdateAll, sName, bUpdateListener);
						}
					}
				}
			}
		}
	};

	ManagedObject.prototype._propagateProperties = function(vName, oObject, oProperties, bUpdateAll, sName, bUpdateListener) {
		if (!oProperties) {
			oProperties = this._getPropertiesToPropagate();
			bUpdateAll = vName === true;
			bUpdateListener = vName === false;
			sName = bUpdateAll ? undefined : vName;
		}

		// introduce data binding capabilities via mixin if available
		checkForBindingSupport(oProperties.oModels);

		if (oObject.oPropagatedProperties !== oProperties) {
			oObject.oPropagatedProperties = oProperties;
			// if propagation triggered by adding a listener no binding updates needed
			if (bUpdateListener !== true) {
				oObject.updateBindings(bUpdateAll,sName);
				oObject.updateBindingContext(false, sName, bUpdateAll);
			}
			oObject.propagateProperties(vName);
			// call listener only in add listener and setParent case
			if (bUpdateListener || bUpdateAll) {
				oObject._callPropagationListener();
			}
			oObject.fireModelContextChange();
		}
	};

	/**
	 * Get properties for propagation
	 * @return {object} oProperties
	 * @private
	 */
	ManagedObject.prototype._getPropertiesToPropagate = function() {
		var bNoOwnModels = isEmptyObject(this.oModels),
			bNoOwnContexts = isEmptyObject(this.oBindingContexts),
			bNoOwnListeners = this.aPropagationListeners.length === 0,
			bNoOwnElementContexts = isEmptyObject(this.mElementBindingContexts);

		function merge(empty,o1,o2,o3) {
			// extend ignores 'undefined' values but not 'null' values.
			// So 'null' values get propagated and block a parent propagation.
			// 'undefined' values are ignored and therefore not propagated.
			return empty ? o1 : extend({}, o1, o2, o3);
		}

		function concat(empty,a1,a2) {
			return empty ? a1 : a1.concat(a2);
		}

		if (bNoOwnContexts && bNoOwnModels && bNoOwnElementContexts && bNoOwnListeners) {
			//propagate the existing container
			return this.oPropagatedProperties;
		} else {
			//merge propagated and own properties
			return {
				oModels : merge(bNoOwnModels, this.oPropagatedProperties.oModels, this.oModels),
				oBindingContexts : merge((bNoOwnContexts && bNoOwnElementContexts), this.oPropagatedProperties.oBindingContexts, this.oBindingContexts, this.mElementBindingContexts),
				aPropagationListeners : concat(bNoOwnListeners, this.oPropagatedProperties.aPropagationListeners, this.aPropagationListeners)
			};
		}
	};

	/**
	 * Get the model to be used for data bindings with the given model name.
	 * If the object does not have a model set on itself, it will use the first
	 * model defined in its parent hierarchy.
	 *
	 * The name can be omitted to reference the default model or it must be a non-empty string.
	 *
	 * <b>Note:</b> to be compatible with future versions of this API, you must not use the following model names:
	 * <ul>
	 * <li><code>null</code></li>
	 * <li>empty string <code>""</code></li>
	 * <li>string literals <code>"null"</code> or <code>"undefined"</code></li>
	 * </ul>
	 * Omitting the model name (or using the value <code>undefined</code>) is explicitly allowed and
	 * refers to the default model.
	 *
	 * @param {string} [sModelName] name of the model to be retrieved
	 * @return {sap.ui.model.Model | undefined} oModel or undefined when there is no such model
	 * @public
	 */
	ManagedObject.prototype.getModel = function(sModelName) {
		assertModelName(sModelName);
		return this.oModels[sModelName] || this.oPropagatedProperties.oModels[sModelName];
	};

	/**
	 * Returns a map of all models assigned to this ManagedObject.
	 *
	 * The default model is available on key <code>undefined</code>.
	 *
	 * <b>Note:</b> Models propagated from the parent are not included.
	 *
	 * @return {Object<string, sap.ui.model.Model>} The models
	 * @public
	 * @since 1.88.0
	 */
	ManagedObject.prototype.getOwnModels = function() {
		return this.oModels;
	};

	/**
	 * Check if any model is set to the ManagedObject or to one of its parents (including UIArea and Core).
	 *
	 * <b>Note:</b> A ManagedObject inherits models from the Core only when it is a descendant of a UIArea.
	 *
	 * @return {boolean} whether a model reference exists or not
	 * @public
	 */
	ManagedObject.prototype.hasModel = function() {
		return !(isEmptyObject(this.oModels) && isEmptyObject(this.oPropagatedProperties.oModels));
	};

	/**
	 * Clones a tree of objects starting with the object on which clone is called first (root object).
	 *
	 * The IDs within the newly created clone tree are derived from the original IDs by appending
	 * the given <code>sIdSuffix</code> (if no suffix is given, one will be created; it will be
	 * unique across multiple clone calls).
	 *
	 * The <code>oOptions</code> configuration object can have the following properties:
	 * <ul>
	 * <li>The boolean value <code>cloneChildren</code> specifies whether associations/aggregations will be cloned</li>
	 * <li>The boolean value <code>cloneBindings</code> specifies if bindings will be cloned</li>
	 * </ul>
	 * Note:
	 * In case the configuration <code>oOptions</code> is specified, the default values <code>true</code> no longer apply,
	 * which means in case <code>cloneChildren</code> or <code>cloneBindings</code> is not specified, then this ia
	 * assumed to be <code>false</code> and associations/aggregations or bindings are not cloned.
	 *
	 * For each cloned object, the following settings are cloned based on the metadata of the object and the defined options:
	 * <ul>
	 * <li>All properties that are not bound. If <code>cloneBindings</code> is <code>false</code>,
	 *     also the bound properties will be cloned; in general, values are referenced 1:1, not cloned.
	 *     For some property types, however, the getters or setters might clone the value (e.g. array types
	 *     and properties using metadata option <code>byValue</code>)</li>
	 * <li>All aggregated objects that are not bound. If <code>cloneBindings</code> is <code>false</code>,
	 *     also the ones that are bound will be cloned; they are all cloned recursively using the same
	 *     <code>sIdSuffix</code></li>
	 * <li>All associated controls; when an association points to an object inside the cloned object tree,
	 *     then the cloned association will be modified so that it points to the clone of the target object.
	 *     When the association points to a managed object outside of the cloned object tree, then its
	 *     target won't be changed.</li>
	 * <li>All models set via <code>setModel()</code>; used by reference.</li>
	 * <li>All property and aggregation bindings (if <code>cloneBindings</code> is <code>true</code>);
	 *     the pure binding information (path, model name) is cloned, but all other information like
	 *     template control or factory function, data type or formatter function are copied by reference.
	 *     The bindings themselves are created anew as they are specific for the combination (object, property, model).
	 *     As a result, any later changes to a binding of the original object are not reflected
	 *     in the clone, but changes to e.g the type or template etc. are.</li>
	 * </ul>
	 *
	 * Each clone is created by first collecting the above mentioned settings and then creating
	 * a new instance with the normal constructor function. As a result, any side effects of
	 * mutator methods (<code>setProperty</code> etc.) or init hooks are repeated during clone creation.
	 * There is no need to override <code>clone()</code> just to reproduce these internal settings!
	 *
	 * Custom controls however can override <code>clone()</code> to implement additional clone steps.
	 * They usually will first call <code>clone()</code> on the super class and then modify the
	 * returned clone accordingly.
	 *
	 * Applications <b>must never provide</b> the second parameter <code>aLocaleIds</code>.
	 * It is determined automatically for the root object (and its non-existence also serves as
	 * an indicator for the root object). Specifying it will break the implementation of <code>clone()</code>.
	 *
	 * @param {string} [sIdSuffix] a suffix to be appended to the cloned object ID
	 * @param {string[]} [aLocalIds] an array of local IDs within the cloned hierarchy (internally used)
	 * @param {Object} [oOptions='\{cloneChildren:true, cloneBindings:true\}'] Configuration object; when
	 *                      omitted, both properties default to <code>true</code>; when specified,
	 *                      undefined properties default to <code>false</code>
	 * @param {boolean} [oOptions.cloneChildren=false] Whether associations and aggregations will be cloned
	 * @param {boolean} [oOptions.cloneBindings=false] Whether bindings will be cloned
	 * @returns {this} Reference to the newly created clone
	 * @public
	 */
	ManagedObject.prototype.clone = function(sIdSuffix, aLocalIds, oOptions) {
		var bCloneChildren = true,
			bCloneBindings = true;

		if (oOptions) {
			bCloneChildren = !!oOptions.cloneChildren;
			bCloneBindings = !!oOptions.cloneBindings;
		}
		// if no id suffix has been provided use a generated UID
		if (!sIdSuffix) {
			sIdSuffix = ManagedObjectMetadata.uid("clone") || uid();
		}
		// if no local ID array has been passed, collect IDs of all aggregated objects to
		// be able to properly adapt associations, which are within the cloned object hierarchy
		if (!aLocalIds && bCloneChildren) {
			aLocalIds = this.findAggregatedObjects(true, null, true).map(function(oObject) {
				return oObject.getId();
			});
			aLocalIds.push(this.getId());
		}

		var oMetadata = this.getMetadata(),
			oClass = oMetadata._oClass,
			sId = this.getId() + "-" + sIdSuffix,
			mSettings = {},
			oProperty,
			mProps = this.mProperties,
			sKey,
			sName,
			oClone,
			escape = BindingInfo.escape,
			i,
			oTarget;

		// Clone properties (only those with non-default value)
		var aKeys = Object.keys(mProps);
		var vValue;
		i = aKeys.length;
		while ( i > 0 ) {
			sKey = aKeys[--i];
			oProperty = oMetadata.getProperty(sKey);
			// Only clone public properties, do not clone bound properties if bindings are cloned (property will be set by binding)
			if (oProperty && !(this.isBound(sKey) && bCloneBindings)) {
				// Note: to avoid double resolution of binding expressions, we have to escape string values once again
				if (typeof mProps[sKey] === "string") {
					mSettings[sKey] = escape(mProps[sKey]);
				} else {
					vValue = oProperty.byValue ? deepClone(mProps[sKey]) : mProps[sKey];
					if (vValue && typeof vValue === "object" && !Object.isFrozen(vValue)) {
						//mark objects to not interpret it as bindingInfos
						vValue[BindingInfo.UI5ObjectMarker] = true;
					}
					mSettings[sKey] = vValue;
				}
			}
		}

		// Clone models
		mSettings["models"] = this.oModels;

		// Clone BindingContext
		mSettings["bindingContexts"] = this.oBindingContexts;

		if (bCloneChildren) {
			// Clone aggregations
			var mAggregationsToClone = Object.assign({}, this.mAggregations, this.mForwardedAggregations);
			for (sName in mAggregationsToClone) {
				var oAggregation = mAggregationsToClone[sName];
				//do not clone aggregation if aggregation is bound and bindings are cloned; aggregation is filled on update
				if (oMetadata.hasAggregation(sName) && !(this.isBound(sName) && bCloneBindings)) {
					if (oAggregation instanceof ManagedObject) {
						mSettings[sName] = oAggregation.clone(sIdSuffix, aLocalIds);
					} else if (Array.isArray(oAggregation)) {
						mSettings[sName] = [];
						for (var i = 0; i < oAggregation.length; i++) {
							mSettings[sName].push(oAggregation[i].clone(sIdSuffix, aLocalIds));
						}
					} else {
						// must be an alt type
						mSettings[sName] =
							typeof oAggregation === "string"
								? escape(oAggregation) : oAggregation;
					}
				}
			}

			// Clone associations
			for (sName in this.mAssociations) {
				if ( !oMetadata.hasAssociation(sName) ) {
					// skip non-public associations
					continue;
				}
				var oAssociation = this.mAssociations[sName];
				// Check every associated ID against the ID array, to make sure associations within
				// the template are properly converted to associations within the clone
				if (Array.isArray(oAssociation)) {
					oAssociation = oAssociation.slice(0);
					for (var i = 0; i < oAssociation.length; i++) {
						if ( aLocalIds.indexOf(oAssociation[i]) >= 0) {
							oAssociation[i] += "-" + sIdSuffix;
						}
					}
				} else if ( aLocalIds.indexOf(oAssociation) >= 0) {
					oAssociation += "-" + sIdSuffix;
				}
				mSettings[sName] = oAssociation;
			}
		}

		// Create clone instance
		oClone = new oClass(sId, mSettings);

		/**
		 * Clones the BindingInfo for the aggregation/property with the given name of this ManagedObject and binds
		 * the aggregation/property with the given target name on the given clone using the same BindingInfo.
		 *
		 * @param {sap.ui.base.ManagedObject.ObjectBindingInfo|sap.ui.base.ManagedObject.AggregationBindingInfo|sap.ui.base.ManagedObject.PropertyBindingInfo} oBindingInfo the original binding info
		 * @param {sap.ui.base.ManagedObject} oClone the object on which to establish the cloned binding
		 * @param {string} [sTargetName] the name of the clone's aggregation/property to bind, omitted for object bindings
		 * @param {sap.ui.base.ManagedObject} [oSource] Source of the clone operation
		 * @param {string} [sName] the name of the aggregation/property
		 * @private
		 */
		function cloneBinding(oBindingInfo, oClone, sTargetName, oSource, sName) {
			var bIsObjectBinding = !sTargetName;
			var oCloneBindingInfo = Object.assign({}, oBindingInfo);

			// clone the template if it is not sharable
			if (!oBindingInfo.templateShareable && oBindingInfo.template && oBindingInfo.template.clone) {
				oCloneBindingInfo.template = oBindingInfo.template.clone(sIdSuffix, aLocalIds);
				delete oCloneBindingInfo.factory;
			} else if ( oBindingInfo.templateShareable === MAYBE_SHAREABLE_OR_NOT ) {
				// a 'clone' operation implies sharing the template (if templateShareable is not set to false)
				oBindingInfo.templateShareable = oCloneBindingInfo.templateShareable = true;
				Log.error(
					"During a clone operation, a template was found that neither was marked with 'templateShareable:true' nor 'templateShareable:false'. " +
					"The framework won't destroy the template. This could cause errors (e.g. duplicate IDs) or memory leaks " +
					"(The template is used in aggregation '" + sName + "' of object '" + oSource.getId() + "')." +
					"For more information, see documentation under 'Aggregation Binding'.");
			}

			// remove the runtime binding data (otherwise the property will not be connected again!)
			delete oCloneBindingInfo.binding;
			delete oCloneBindingInfo.modelChangeHandler;
			delete oCloneBindingInfo.dataStateChangeHandler;
			delete oCloneBindingInfo.modelRefreshHandler;

			if (bIsObjectBinding) {
				oClone.bindObject(oCloneBindingInfo);
			} else if (oBindingInfo.factory) {
				oClone.bindAggregation(sTargetName, oCloneBindingInfo);
			} else {
				oClone.bindProperty(sTargetName, oCloneBindingInfo);
			}
		}

		// Clone events
		for (sName in this.mEventRegistry) {
			oClone.mEventRegistry[sName] = this.mEventRegistry[sName].slice();
		}

		// Clone bindings
		if (bCloneBindings) {
			for (sName in this.mObjectBindingInfos) {
				cloneBinding(this.mObjectBindingInfos[sName], oClone);
			}

			for (sName in this.mBindingInfos) {
				cloneBinding(this.mBindingInfos[sName], oClone, sName, this, sName);
			}
		}

		// Clone the support info
		if (ManagedObject._supportInfo) {
			ManagedObject._supportInfo.addSupportInfo(oClone.getId(), ManagedObject._supportInfo.byId(this.getId()));
		}

		// Clone the meta data contexts interpretation
		if (this._cloneMetadataContexts) {
			this._cloneMetadataContexts(oClone);
		}

		if (this.mForwardedAggregations) { // forwarded elements have been cloned; set up the connection from their API parent now
			for (sName in this.mForwardedAggregations) {
				var oForwarder = oClone.getMetadata().getAggregationForwarder(sName);
				if (oForwarder) {
					oTarget = oForwarder.getTarget(oClone, true);
					if (oForwarder.forwardBinding && this.isBound(sName)) { // forwarded bindings have not been cloned yet
						cloneBinding(this.getBindingInfo(sName), oTarget, oForwarder.targetAggregationName, this, sName);
					}
				}
			}
		}

		return oClone;
	};

	/**
	 * Searches and returns all aggregated objects that pass the given check function.
	 *
	 * When the search is done recursively (<code>bRecursive === true</code>), it will be
	 * executed depth-first and ancestors will be added to the result array before their descendants.
	 *
	 * If no check function is given, all aggregated objects will pass the check and be added
	 * to the result array.
	 *
	 * When setting <code>bIncludeBindingTemplates</code> to <code>true</code>, binding templates will be included
	 * in the search.
	 *
	 * <b>Take care:</b> this operation might be expensive.
	 *
	 * @param {boolean} [bRecursive=false]
	 *   Whether the whole aggregation tree should be searched
	 * @param {function(sap.ui.base.ManagedObject):boolean} [fnCondition]
	 *   Objects for which this function returns a falsy value will not be added to the result array
	 * @param {boolean} [bIncludeBindingTemplates=false]
	 *   Whether binding templates should be included
	 * @returns {sap.ui.base.ManagedObject[]}
	 *   Array of aggregated objects that passed the check
	 * @public
	 */
	ManagedObject.prototype.findAggregatedObjects = function(bRecursive, fnCondition, bIncludeBindingTemplates) {

		var aAggregatedObjects = [];

		if (fnCondition && typeof fnCondition !== "function") {
			fnCondition = null;
		}

		function fnFindObjects(oObject) {
			var a, i, n;

			if (bIncludeBindingTemplates) {
				for ( n in oObject.mBindingInfos) {
					a = oObject.mBindingInfos[n].template;
					if (a) {
						if ( !fnCondition || fnCondition(a) ) {
							aAggregatedObjects.push(a);
						}
						if ( bRecursive ) {
							fnFindObjects(a);
						}
					}
				}
			}
			for ( n in oObject.mAggregations ) {
				a = oObject.mAggregations[n];
				if ( Array.isArray(a) ) {
					for ( i = 0; i < a.length; i++ ) {
						if ( !fnCondition || fnCondition(a[i]) ) {
							aAggregatedObjects.push(a[i]);
						}
						if ( bRecursive ) {
							fnFindObjects(a[i]);
						}
					}
				} else if (a instanceof ManagedObject) {
					if ( !fnCondition || fnCondition(a) ) {
						aAggregatedObjects.push(a);
					}
					if ( bRecursive ) {
						fnFindObjects(a);
					}
				}
			}
		}

		fnFindObjects(this);

		return aAggregatedObjects;

	};

	/**
	 * This lifecycle hook is called during deactivation of the owner component
	 *
	 * @since 1.88
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	ManagedObject.prototype.onOwnerDeactivation = function() {
		this._bIsOwnerActive = false;
	};

	/**
	 * This lifecycle hook is called during activation of the owner component
	 *
	 * @since 1.88
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	ManagedObject.prototype.onOwnerActivation = function() {
		this._bIsOwnerActive = true;
		this._onContextualSettingsChanged();
	};

	/**
	 * Checks if an object's destruction has been started. During the
	 * descruction of an object its ID is still registered, and child
	 * objects could be still aggregated.
	 * Creating another object with the same ID would lead to duplicate ID
	 * issues.
	 * To check if the destruction is finished, call <code>isDestroyed</code>.
	 *
	 * @return {boolean} Whether an object's destruction has been started
	 * @since 1.93
	 * @protected
	 */
	ManagedObject.prototype.isDestroyStarted = function() {
		return !!this._bIsBeingDestroyed;
	};

	/**
	 * Returns whether this object is destroyed or not. A
	 * destroyed object cannot be used anymore.
	 *
	 * @return {boolean} Whether the object is destroyed
	 * @since 1.93
	 * @public
	 */
	ManagedObject.prototype.isDestroyed = function() {
		return !!this.bIsDestroyed;
	};

	ManagedObject._defaultContextualSettings = {};

	return ManagedObject;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.base.ManagedObjectMetadata
sap.ui.predefine("sap/ui/base/ManagedObjectMetadata", [
	'./DataType',
	'./Metadata',
	'./Object',
	'sap/base/Log',
	'sap/base/assert',
	'sap/base/config',
	'sap/base/strings/capitalize',
	'sap/base/strings/escapeRegExp',
	'sap/base/util/merge',
	'sap/base/util/isPlainObject'
],
function(
	DataType,
	Metadata,
	BaseObject,
	Log,
	assert,
	BaseConfig,
	capitalize,
	escapeRegExp,
	merge,
	isPlainObject
) {
	"use strict";

	/**
	 * Creates a new metadata object that describes a subclass of ManagedObject.
	 *
	 * <b>Note:</b> Code outside the <code>sap.ui.base</code> namespace must not call this
	 * constructor directly. Instances will be created automatically when a new class is
	 * defined with one of the {@link sap.ui.base.ManagedObject.extend <i>SomeClass</i>.extend}
	 * methods.
	 *
	 * <b>Note</b>: throughout this class documentation, the described subclass of ManagedObject
	 * is referenced as <i>the described class</i>.
	 *
	 * @param {string} sClassName fully qualified name of the described class
	 * @param {object} oClassInfo static info to construct the metadata from
	 * @param {sap.ui.base.ManagedObject.MetadataOptions} [oClassInfo.metadata]
	 *  The metadata object describing the class
	 *
	 * @class
	 * @classdesc
	 *
	 * <strong>Note about Info Objects</strong>
	 *
	 * Several methods in this class return info objects that describe a property,
	 * aggregation, association or event of the class described by this metadata object.
	 * The type, structure and behavior of these info objects is not yet documented and
	 * not part of the stable, public API.
	 *
	 * Code using such methods and the returned info objects therefore needs to be aware
	 * of the following restrictions:
	 *
	 * <ul>
	 * <li>the set of properties exposed by each info object, their type and value
	 *     might change as well as the class of the info object itself.
	 *
	 *     Properties that represent settings provided during class definition
	 *     (in the oClassInfo parameter of the 'extend' call, e.g. 'type', 'multiple'
	 *     of an aggregation) are more likely to stay the same than additional, derived
	 *     properties like '_iKind'.</li>
	 *
	 * <li>info objects must not be modified / enriched although they technically could.</li>
	 *
	 * <li>the period of validity of info objects is not defined. They should be
	 *     referenced only for a short time and not be kept as members of long living
	 *     objects or closures.</li>
	 *
	 * </ul>
	 *
	 *
	 * @author Frank Weigel
	 * @version 1.125.0
	 * @since 0.8.6
	 * @alias sap.ui.base.ManagedObjectMetadata
	 * @extends sap.ui.base.Metadata
	 * @public
	 */
	var ManagedObjectMetadata = function(sClassName, oClassInfo) {

		// call super constructor
		Metadata.apply(this, arguments);

	};

	var Element; // lazy dependency to sap/ui/core/Element

	// chain the prototypes
	ManagedObjectMetadata.prototype = Object.create(Metadata.prototype);
	ManagedObjectMetadata.prototype.constructor = ManagedObjectMetadata;

	var rPlural = /(children|ies|ves|oes|ses|ches|shes|xes|s)$/i;
	var mSingular = {'children' : -3, 'ies' : 'y', 'ves' : 'f', 'oes' : -2, 'ses' : -2, 'ches' : -2, 'shes' : -2, 'xes' : -2, 's' : -1 };

	function guessSingularName(sName) {
		return sName.replace(rPlural, function($,sPlural) {
			var vRepl = mSingular[sPlural.toLowerCase()];
			return typeof vRepl === "string" ? vRepl : sPlural.slice(0,vRepl);
		});
	}

	function deprecation(fn, name) {
		return function() {
			Log.warning("Usage of deprecated feature: " + name);
			return fn.apply(this, arguments);
		};
	}

	function remainder(obj, info) {
		var result = null;

		for (var n in info) {
			if ( Object.hasOwn(info, n) && typeof obj[n] === 'undefined' ) {
				result = result || {};
				result[n] = info[n];
			}
		}

		return result;
	}

	/**
	 * Validates the given default class against its aggregation type.
	 */
	function validateDefaultClass(oAggregation, oOriginalAggregationInfo, fnClass) {
		const fnDefaultClass = oOriginalAggregationInfo.defaultClass;

		// we check if:
		//    1. the defaultClass matches the aggregation type
		//    2. the defaultClass matches the altTypes ('object' must not be included)
		//    3. the defaultClass defined with a nullish value
		if (fnDefaultClass) {
			if (!BaseObject.isObjectA(fnDefaultClass.prototype, oAggregation.type)) {
				throw new TypeError(`The 'defaultClass' of the aggregation '${oAggregation.name}' in '${fnClass.getName()}' is not of type '${oAggregation.type}'.`);
			} else if (oAggregation.altTypes?.includes("object")) {
				throw new TypeError(`The aggregation '${oAggregation.name}' in '${fnClass.getName()}' must not defined a 'defaultClass' together with the altType 'object'.`);
			}
		} else if (oOriginalAggregationInfo.hasOwnProperty("defaultClass")) {
			throw new TypeError(`The 'defaultClass' of the aggregation '${oAggregation.name}' in '${fnClass.getName()}' is defined with a nullish value (${fnDefaultClass}).`);
		}

		return fnDefaultClass;
	}

	var Kind = {
		SPECIAL_SETTING : -1, PROPERTY : 0, SINGLE_AGGREGATION : 1, MULTIPLE_AGGREGATION : 2, SINGLE_ASSOCIATION : 3, MULTIPLE_ASSOCIATION : 4, EVENT : 5
	};

	/**
	 * Guess a singular name for a given plural name.
	 *
	 * This method is not guaranteed to return a valid result. If the result is not satisfying,
	 * the singular name for an aggregation/association should be specified in the class metadata.
	 *
	 * @private
	 * @function
	 */
	ManagedObjectMetadata._guessSingularName = guessSingularName;

	// ---- SpecialSetting --------------------------------------------------------------------

	/**
	 * SpecialSetting info object
	 * @private
	 * @since 1.27.1
	 */
	function SpecialSetting(oClass, name, info) {
		info = typeof info !== 'object' ? { type: info } : info;
		this.name = name;
		this.type = info.type || 'any';
		this.visibility = info.visibility || 'public';
		this.defaultValue = info.defaultValue;
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = "special:" + name;
		this._iKind = Kind.SPECIAL_SETTING;
	}

	// ---- Property --------------------------------------------------------------------------

	/**
	 * Property info object
	 * @private
	 * @since 1.27.1
	 */
	function Property(oClass, name, info) {
		info = typeof info !== 'object' ? { type: info } : info;
		this.name = name;
		this.type = info.type || 'string';
		this.group = info.group || 'Misc';
		this.defaultValue = info.defaultValue !== null ? info.defaultValue : null;
		this.bindable = !!info.bindable;
		this.deprecated = !!info.deprecated || false;
		this.visibility = info.visibility || 'public';
		this.byValue = info.byValue === true; // non-boolean values reserved for the future
		this.selector = typeof info.selector === "string" ? info.selector : null;
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = name;
		this._iKind = Kind.PROPERTY;
		var N = capitalize(name);
		this._sMutator = 'set' + N;
		this._sGetter = 'get' + N;
		if ( this.bindable ) {
			this._sBind =  'bind' + N;
			this._sUnbind = 'unbind' + N;
		} else {
			this._sBind =
			this._sUnbind = undefined;
		}
		this._oType = null;
	}

	/**
	 * @private
	 */
	Property.prototype.generate = function(add) {
		var that = this,
			n = that.name;

		add(that._sGetter, function() { return this.getProperty(n); });
		add(that._sMutator, function(v) { this.setProperty(n,v); return this; }, that);
		if ( that.bindable ) {
			add(that._sBind, function(p,fn,m) { this.bindProperty(n,p,fn,m); return this; }, that);
			add(that._sUnbind, function(p) { this.unbindProperty(n,p); return this; });
		}
	};

	Property.prototype.getType = function() {
		if (!this._oType) {
			this._oType = DataType.getType(this.type);
		}
		return this._oType;
	};

	Property.prototype.getDefaultValue = function() {
		var oDefaultValue = this.defaultValue,
			oType;

		if ( oDefaultValue === null ) {
			oType = this.getType();
			if ( oType instanceof DataType ) {
				oDefaultValue = oType.getDefaultValue();
			}
		}

		return oDefaultValue;
	};

	Property.prototype.get = function(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.getProperty(this.name);
		}
		return instance[this._sGetter]();
	};

	Property.prototype.set = function(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.setProperty(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	};

	// ---- Aggregation -----------------------------------------------------------------------

	/**
	 * Aggregation info object
	 * @private
	 * @since 1.27.1
	 */
	function Aggregation(oClass, name, info) {
		info = typeof info !== 'object' ? { type: info } : info;
		this.name = name;
		this.type = info.type || 'sap.ui.core.Control';
		this.altTypes = Array.isArray(info.altTypes) ? info.altTypes : undefined;
		this.defaultClass = validateDefaultClass(this, info, oClass) || null;
		this.multiple = typeof info.multiple === 'boolean' ? info.multiple : true;
		this.singularName = this.multiple ? info.singularName || guessSingularName(name) : undefined;
		this.bindable = !!info.bindable;
		this.deprecated = info.deprecated || false;
		this.visibility = info.visibility || 'public';
		this.selector = info.selector || null;
		this.forwarding = info.forwarding;
		this._doesNotRequireFactory = !!info._doesNotRequireFactory; // TODO clarify if public
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = 'aggregation:' + name;
		this._iKind = this.multiple ? Kind.MULTIPLE_AGGREGATION : Kind.SINGLE_AGGREGATION;
		this._oForwarder = this.forwarding ? new AggregationForwarder(this) : undefined;
		var N = capitalize(name);
		this._sGetter = 'get' + N;
		if ( this.multiple ) {
			var N1 = capitalize(this.singularName);
			this._sMutator = 'add' + N1;
			this._sInsertMutator = 'insert' + N1;
			this._sRemoveMutator = 'remove' + N1;
			this._sRemoveAllMutator = 'removeAll' + N;
			this._sIndexGetter = 'indexOf' + N1;
			this._sUpdater = 'update' + N;
			this._sRefresher = 'refresh' + N;
		} else {
			this._sMutator = 'set' + N;
			this._sInsertMutator =
			this._sRemoveMutator =
			this._sRemoveAllMutator =
			this._sIndexGetter =
			this._sUpdater =
			this._sRefresher = undefined;
		}
		this._sDestructor = 'destroy' + N;
		if ( this.bindable ) {
			this._sBind = 'bind' + N;
			this._sUnbind = 'unbind' + N;
		} else {
			this._sBind =
			this._sUnbind = undefined;
		}
	}

	/**
	 * @private
	 */
	Aggregation.prototype.generate = function(add) {
		var that = this,
			n = that.name;

		if ( !that.multiple ) {
			add(that._sGetter, function() { return this.getAggregation(n); });
			add(that._sMutator, function(v) { this.setAggregation(n,v); return this; }, that);
		} else {
			add(that._sGetter, function() { return this.getAggregation(n,[]); });
			add(that._sMutator, function(a) { this.addAggregation(n,a); return this; }, that);
			add(that._sInsertMutator, function(i,a) { this.insertAggregation(n,i,a); return this; }, that);
			add(that._sRemoveMutator, function(a) { return this.removeAggregation(n,a); });
			add(that._sRemoveAllMutator, function() { return this.removeAllAggregation(n); });
			add(that._sIndexGetter, function(a) { return this.indexOfAggregation(n,a); });
		}
		add(that._sDestructor, function() { this.destroyAggregation(n); return this; });
		if ( that.bindable ) {
			add(that._sBind, function(p,t,s,f) { this.bindAggregation(n,p,t,s,f); return this; }, that);
			add(that._sUnbind, function(p) { this.unbindAggregation(n,p); return this; });
		}
	};

	Aggregation.prototype.getType = function() {
		if (!this._oType) {
			this._oType = DataType.getType(this.type);
		}
		return this._oType;
	};

	Aggregation.prototype.get = function(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.getAggregation(this.name, this.multiple ? [] : undefined);
		}
		return instance[this._sGetter]();
	};

	Aggregation.prototype.set = function(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.setAggregation(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	};

	Aggregation.prototype.add = function(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.addAggregation(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	};

	Aggregation.prototype.insert = function(instance, oValue, iPos) {
		if ( this.visibility !== 'public' ) {
			return instance.insertAggregation(this.name, oValue, iPos);
		}
		return instance[this._sInsertMutator](oValue, iPos);
	};

	Aggregation.prototype.remove = function(instance, vValue) {
		if ( this.visibility !== 'public' ) {
			return instance.removeAggregation(this.name, vValue);
		}
		return instance[this._sRemoveMutator](vValue);
	};

	Aggregation.prototype.removeAll = function(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.removeAllAggregation(this.name);
		}
		return instance[this._sRemoveAllMutator]();
	};

	Aggregation.prototype.indexOf = function(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.indexOfAggregation(this.name, oValue);
		}
		return instance[this._sIndexGetter](oValue);
	};

	Aggregation.prototype.destroy = function(instance) {
		return instance[this._sDestructor]();
	};

	Aggregation.prototype.update = function(instance, sChangeReason, oEventInfo) {
		if (instance[this._sUpdater]) {
			instance[this._sUpdater](sChangeReason, oEventInfo);
		} else {
			instance.updateAggregation(this.name, sChangeReason, oEventInfo);
		}
	};

	Aggregation.prototype.refresh = function(instance, sChangeReason) {
		if (instance[this._sRefresher]) {
			instance[this._sRefresher](sChangeReason);
		} else {
			//fallback there was no refresher before
			this.update(instance, sChangeReason);
		}
	};

	/**
	 * Creates a new aggregation forwarder for the given aggregation.
	 * @param {object} oAggregation Aggregation info object
	 *
	 * @class Class to manage the forwarding of an aggregation.
	 * @alias sap.ui.base.ManagedObjectMetadata.AggregationForwarder
	 * @private
	 * @ui5-restricted sap.ui.base
	 */
	function AggregationForwarder(oAggregation) {
		var oForwardTo = oAggregation.forwarding;
		this.aggregation = oAggregation; // source aggregation info
		this.targetAggregationName = oForwardTo.aggregation;
		this.forwardBinding = oForwardTo.forwardBinding;
		this.targetAggregationInfo = null; // resolve lazily

		// make sure we have a way to get the target control
		if (oForwardTo.getter) {
			if (typeof oForwardTo.getter === "function") {
				this._getTarget = oForwardTo.getter;

			} else { // name of the function which returns the target element
				this._getTarget = (function(sGetterName) {
					return function() {
						return this[sGetterName](); // "this" context is the ManagedObject instance
					};
				})(oForwardTo.getter);
			}

		} else if (oForwardTo.idSuffix) { // target given by ID
			this._getTarget = (function(sIdSuffix) {
				return function() {
					Element = Element || sap.ui.require("sap/ui/core/Element");
					return Element && Element.getElementById(this.getId() + sIdSuffix); // "this" context is the ManagedObject instance
				};
			})(oForwardTo.idSuffix);

		} else {
			throw new Error("Either getter or idSuffix must be given for forwarding the aggregation " + oAggregation.name
				+ " to the aggregation " + oForwardTo.aggregation + " in " + oAggregation._oParent.getName());
		}
	}

	AggregationForwarder.prototype._getTargetAggregationInfo = function(oTarget) {
		var oTargetAggregationInfo = this.targetAggregationInfo;
		if (!oTargetAggregationInfo && oTarget) {
			oTargetAggregationInfo = this.targetAggregationInfo = oTarget.getMetadata().getAggregation(this.targetAggregationName);

			if (!oTargetAggregationInfo) {
				throw new Error("Target aggregation " + this.targetAggregationName + " not found on " + oTarget);
			}

			if (this.aggregation.multiple && !oTargetAggregationInfo.multiple) { // cannot forward multi-to-single
				throw new Error("Aggregation " + this.aggregation + " (multiple: " + this.aggregation.multiple + ") cannot be forwarded to aggregation "
						+ this.targetAggregationName + " (multiple: " + oTargetAggregationInfo.multiple + ")");
			}
			if (!this.aggregation.multiple && oTargetAggregationInfo.multiple && this.aggregation.forwarding.forwardBinding) { // cannot forward bindings for single-to-multi
				throw new Error("Aggregation " + this.aggregation + " (multiple: " + this.aggregation.multiple + ") cannot be forwarded to aggregation "
						+ this.targetAggregationName + " (multiple: " + oTargetAggregationInfo.multiple + ") with 'forwardBinding' set to 'true'");
			}
		}
		return oTargetAggregationInfo;
	};

	/*
	 * Returns the forwarding target instance and ensures that this.targetAggregationInfo is available
	 * @returns {sap.ui.core.Control}
	 */
	AggregationForwarder.prototype.getTarget = function(oInstance, bConnectTargetInfo) {
		var oTarget = this._getTarget.call(oInstance);
		this._getTargetAggregationInfo(oTarget);

		if (oTarget) {
			oInstance.mForwardedAggregations = oInstance.mForwardedAggregations || {};

			if (oInstance.mForwardedAggregations[this.aggregation.name] === undefined || bConnectTargetInfo) {
				// once the target is there, connect the aggregations:
				// Make mForwardedAggregations[name] a pointer to mAggregations[name] of the target, so the former always has the same elements,
				// without the need to update when elements are added/removed and without increasing memory for pointers per aggregated element
				// which would be required in a copy of the map
				var vTargetAggregation = oTarget.mAggregations[this.targetAggregationInfo.name];
				if (vTargetAggregation // target aggregation may not exist yet ... but an empty array is ok
						&& !bConnectTargetInfo
						&& !this.aggregation.forwarding.forwardBinding
						&& !(Array.isArray(vTargetAggregation) && vTargetAggregation.length === 0)) {
					// there should not be any content in the target at the time when the target has been found for the first time
					throw new Error("There is already content in aggregation " + this.targetAggregationInfo.name + " of " + oTarget + " to which forwarding is being set up now.");
				} else {
					var vInitial = oTarget.mAggregations[this.targetAggregationInfo.name] || (this.targetAggregationInfo.multiple ? [] : null); // initialize aggregation for the target
					oInstance.mForwardedAggregations[this.aggregation.name] = oTarget.mAggregations[this.targetAggregationInfo.name] = vInitial;
				}
			}
		}

		return oTarget;
	};

	AggregationForwarder.prototype.get = function(oInstance) {
		var oTarget = this.getTarget(oInstance);
		if (oTarget) {
			var result = this.targetAggregationInfo.get(oTarget);
			if (!this.aggregation.multiple && this.targetAggregationInfo.multiple) { // single-to-multi forwarding
				result = result[0]; // unwrap the element or return undefined if empty array was returned
			}
			return result;
		} else { // before target of forwarding exists
			return this.aggregation.multiple ? [] : null;
		}
	};

	AggregationForwarder.prototype.indexOf = function(oInstance, oAggregatedObject) {
		var oTarget = this.getTarget(oInstance);
		return this.targetAggregationInfo.indexOf(oTarget, oAggregatedObject);
	};

	AggregationForwarder.prototype.set = function(oInstance, oAggregatedObject) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		oInstance.mForwardedAggregations[this.aggregation.name] = oAggregatedObject;

		if (this.targetAggregationInfo.multiple) {
			// target aggregation is multiple, but should behave like single (because the source aggregation is single)
			var oPreviousElement = this.targetAggregationInfo.get(oTarget);
			if (oPreviousElement && oPreviousElement[0]) {
				if (oPreviousElement[0] === oAggregatedObject) { // no modification if same element is set
					return oInstance;
				}
				this.targetAggregationInfo.removeAll(oTarget);
			}
			ManagedObjectMetadata.addAPIParentInfoBegin(oAggregatedObject, oInstance, this.aggregation.name);
			this.targetAggregationInfo.add(oTarget, oAggregatedObject);
		} else {
			ManagedObjectMetadata.addAPIParentInfoBegin(oAggregatedObject, oInstance, this.aggregation.name);
			this.targetAggregationInfo.set(oTarget, oAggregatedObject);
		}
		ManagedObjectMetadata.addAPIParentInfoEnd(oAggregatedObject);

		return oInstance;
	};

	AggregationForwarder.prototype.add = function(oInstance, oAggregatedObject) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		ManagedObjectMetadata.addAPIParentInfoBegin(oAggregatedObject, oInstance, this.aggregation.name);
		this.targetAggregationInfo.add(oTarget, oAggregatedObject);
		ManagedObjectMetadata.addAPIParentInfoEnd(oAggregatedObject);

		return oInstance;
	};

	AggregationForwarder.prototype.insert = function(oInstance, oAggregatedObject, iIndex) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		ManagedObjectMetadata.addAPIParentInfoBegin(oAggregatedObject, oInstance, this.aggregation.name);
		this.targetAggregationInfo.insert(oTarget, oAggregatedObject, iIndex);
		ManagedObjectMetadata.addAPIParentInfoEnd(oAggregatedObject);

		return oInstance;
	};

	/**
	 * Adds information to the given oAggregatedObject about its original API parent (or a subsequent API parent in case of multiple forwarding).
	 * MUST be called before an element is forwarded to another internal aggregation (in case forwarding is done explicitly/manually without using
	 * the declarative mechanism introduced in UI5 1.56).
	 *
	 * CAUTION: ManagedObjectMetadata.addAPIParentInfoEnd(...) MUST be called AFTER the element has been forwarded (set to an aggregation of an
	 * internal control). These two calls must wrap the forwarding.
	 *
	 * @param {sap.ui.base.ManagedObject} oAggregatedObject Object to which the new API parent info should be added
	 * @param {sap.ui.base.ManagedObject} oParent Object that is a new API parent
	 * @param {string} sAggregationName the name of the aggregation under which oAggregatedObject is aggregated by the API parent
	 * @protected
	 */
	ManagedObjectMetadata.addAPIParentInfoBegin = function(oAggregatedObject, oParent, sAggregationName) {
		if (!oAggregatedObject) {
			return;
		}

		var oNewAPIParentInfo = {parent: oParent, aggregationName: sAggregationName};

		if (oAggregatedObject.aAPIParentInfos) {
			if (oAggregatedObject.aAPIParentInfos.forwardingCounter) { // defined and >= 1
				// this is another forwarding step from an element that was already the target of forwarding
				oAggregatedObject.aAPIParentInfos.forwardingCounter++;
			} else {
				// this is a fresh new round of aggregation forwarding, remove any previous forwarding info
				delete oAggregatedObject.aAPIParentInfos;
			}
		}

		// update API parent of oAggregatedObject
		if (!oAggregatedObject.aAPIParentInfos) {
			oAggregatedObject.aAPIParentInfos = [oNewAPIParentInfo];
			oAggregatedObject.aAPIParentInfos.forwardingCounter = 1;
		} else {
			oAggregatedObject.aAPIParentInfos.push(oNewAPIParentInfo);
		}
	};

	/**
	 * Completes the information about the original API parent of the given element.
	 * MUST be called after an element is forwarded to another internal aggregation. For every call to
	 * ManagedObjectMetadata.addAPIParentInfoBegin(...) this method here must be called as well.
	 *
	 * @param {sap.ui.base.ManagedObject} oAggregatedObject Object to which the new API parent info should be added
	 * @protected
	 */
	ManagedObjectMetadata.addAPIParentInfoEnd = function(oAggregatedObject) {
		oAggregatedObject && oAggregatedObject.aAPIParentInfos && oAggregatedObject.aAPIParentInfos.forwardingCounter--;
	};

	AggregationForwarder.prototype.remove = function(oInstance, vAggregatedObject) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer
		var result = this.targetAggregationInfo.remove(oTarget, vAggregatedObject);
		// remove API parent of removed element (if any)
		if (result /* && result.aAPIParentInfos */) {
			// the second part should always be true when added via forwarding, but MultiInput still has a function "setTokens"
			// that forwards directly. That one now also sets the API parent info.
			// When aAPIParentInfos is there, then the other conditions are always true:
			// && result.aAPIParentInfos.length && result.aAPIParentInfos[result.aAPIParentInfos.length-1].parent === oInstance
			result.aAPIParentInfos && result.aAPIParentInfos.pop();
		}
		return result;
	};

	AggregationForwarder.prototype.removeAll = function(oInstance) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		delete oInstance.mForwardedAggregations[this.aggregation.name];

		var aRemoved = this.targetAggregationInfo.removeAll(oTarget);
		// update API parent of removed objects
		for (var i = 0; i < aRemoved.length; i++) {
			if (aRemoved[i].aAPIParentInfos) {
				aRemoved[i].aAPIParentInfos.pop();
			}
		}
		return aRemoved;
	};

	AggregationForwarder.prototype.destroy = function(oInstance) {
		var oTarget = this.getTarget(oInstance);
		// TODO oInstance.observer

		delete oInstance.mForwardedAggregations[this.aggregation.name];

		if (oTarget) {
			this.targetAggregationInfo.destroy(oTarget);
		}
		// API parent info of objects being destroyed is removed in ManagedObject.prototype.destroy()
		return oInstance;
	};


	// ---- Association -----------------------------------------------------------------------

	/**
	 * Association info object
	 * @private
	 * @since 1.27.1
	 */
	function Association(oClass, name, info) {
		info = typeof info !== 'object' ? { type: info } : info;
		this.name = name;
		this.type = info.type || 'sap.ui.core.Control';
		this.multiple = info.multiple || false;
		this.singularName = this.multiple ? info.singularName || guessSingularName(name) : undefined;
		this.deprecated = info.deprecated || false;
		this.visibility = info.visibility || 'public';
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = 'association:' + name;
		this._iKind = this.multiple ? Kind.MULTIPLE_ASSOCIATION : Kind.SINGLE_ASSOCIATION;
		var N = capitalize(name);
		this._sGetter = 'get' + N;
		if ( this.multiple ) {
			var N1 = capitalize(this.singularName);
			this._sMutator = 'add' + N1;
			this._sRemoveMutator = 'remove' + N1;
			this._sRemoveAllMutator = 'removeAll' + N;
		} else {
			this._sMutator = 'set' + N;
			this._sRemoveMutator =
			this._sRemoveAllMutator = undefined;
		}
	}

	/**
	 * @private
	 */
	Association.prototype.generate = function(add) {
		var that = this,
			n = that.name;

		if ( !that.multiple ) {
			add(that._sGetter, function() { return this.getAssociation(n); });
			add(that._sMutator, function(v) { this.setAssociation(n,v); return this; }, that);
		} else {
			add(that._sGetter, function() { return this.getAssociation(n,[]); });
			add(that._sMutator, function(a) { this.addAssociation(n,a); return this; }, that);
			add(that._sRemoveMutator, function(a) { return this.removeAssociation(n,a); });
			add(that._sRemoveAllMutator, function() { return this.removeAllAssociation(n); });
			if ( n !== that.singularName ) {
				add('removeAll' + capitalize(that.singularName), function() {
					Log.warning("Usage of deprecated method " +
						that._oParent.getName() + ".prototype." + 'removeAll' + capitalize(that.singularName) + "," +
						" use method " + that._sRemoveAllMutator  + " (plural) instead.");
					return this[that._sRemoveAllMutator]();
				});
			}
		}
	};

	Association.prototype.getType = function() {
		if (!this._oType) {
			this._oType = DataType.getType(this.type);
		}
		return this._oType;
	};

	Association.prototype.get = function(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.getAssociation(this.name, this.multiple ? [] : undefined);
		}
		return instance[this._sGetter]();
	};

	Association.prototype.set = function(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.setAssociation(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	};

	Association.prototype.add = function(instance, oValue) {
		if ( this.visibility !== 'public' ) {
			return instance.addAssociation(this.name, oValue);
		}
		return instance[this._sMutator](oValue);
	};

	Association.prototype.remove = function(instance, vValue) {
		if ( this.visibility !== 'public' ) {
			return instance.removeAssociation(this.name, vValue);
		}
		return instance[this._sRemoveMutator](vValue);
	};

	Association.prototype.removeAll = function(instance) {
		if ( this.visibility !== 'public' ) {
			return instance.removeAllAssociation(this.name);
		}
		return instance[this._sRemoveAllMutator]();
	};

	// ---- Event -----------------------------------------------------------------------------

	/**
	 * Event info object
	 * @private
	 * @since 1.27.1
	 */
	function Event(oClass, name, info) {
		this.name = name;
		this.allowPreventDefault = info.allowPreventDefault || false;
		this.deprecated = info.deprecated || false;
		this.visibility = 'public';
		this.allowPreventDefault = !!info.allowPreventDefault;
		this.enableEventBubbling = !!info.enableEventBubbling;
		this.appData = remainder(this, info);
		this._oParent = oClass;
		this._sUID = 'event:' + name;
		this._iKind = Kind.EVENT;
		var N = capitalize(name);
		this._sMutator = 'attach' + N;
		this._sDetachMutator = 'detach' + N;
		this._sTrigger = 'fire' + N;
	}

	/**
	 * @private
	 */
	Event.prototype.generate = function(add) {
		var that = this,
			n = that.name,
			allowPreventDefault = that.allowPreventDefault,
			enableEventBubbling = that.enableEventBubbling;

		add(that._sMutator, function(d,f,o) { this.attachEvent(n,d,f,o); return this; }, that);
		add(that._sDetachMutator, function(f,o) { this.detachEvent(n,f,o); return this; });
		add(that._sTrigger, function(p) { return this.fireEvent(n,p, allowPreventDefault, enableEventBubbling); });
	};

	Event.prototype.attach = function(instance,data,fn,listener) {
		return instance[this._sMutator](data,fn,listener);
	};

	Event.prototype.detach = function(instance,fn,listener) {
		return instance[this._sDetachMutator](fn,listener);
	};

	Event.prototype.fire = function(instance,params) {
		return instance[this._sTrigger](params, this.allowPreventDefault, this.enableEventBubbling);
	};

	// ----------------------------------------------------------------------------------------

	ManagedObjectMetadata.prototype.metaFactorySpecialSetting = SpecialSetting;
	ManagedObjectMetadata.prototype.metaFactoryProperty = Property;
	ManagedObjectMetadata.prototype.metaFactoryAggregation = Aggregation;
	ManagedObjectMetadata.prototype.metaFactoryAssociation = Association;
	ManagedObjectMetadata.prototype.metaFactoryEvent = Event;

	/**
	 * @private
	 */
	ManagedObjectMetadata.prototype.applySettings = function(oClassInfo) {

		var that = this,
			oStaticInfo = oClassInfo.metadata;

		Metadata.prototype.applySettings.call(this, oClassInfo);

		function normalize(mInfoMap, FNClass) {
			var mResult = {},
				sName;

			if ( mInfoMap ) {
				for (sName in mInfoMap) {
					if ( Object.hasOwn(mInfoMap, sName) ) {
						mResult[sName] = new FNClass(that, sName, mInfoMap[sName]);
					}
				}
			}

			return mResult;
		}

		function filter(mInfoMap, bPublic) {
			var mResult = {},sName;
			for (sName in mInfoMap) {
				if ( bPublic === (mInfoMap[sName].visibility === 'public') ) {
					mResult[sName] = mInfoMap[sName];
				}
			}
			return mResult;
		}

		var rLibName = /([a-z][^.]*(?:\.[a-z][^.]*)*)\./;

		function defaultLibName(sName) {
			var m = rLibName.exec(sName);
			return (m && m[1]) || "";
		}

		// init basic metadata from static information and fallback to defaults
		this._sLibraryName = oStaticInfo.library || defaultLibName(this.getName());
		this._mSpecialSettings = normalize(oStaticInfo.specialSettings, this.metaFactorySpecialSetting);
		var mAllProperties = normalize(oStaticInfo.properties, this.metaFactoryProperty);
		this._mProperties = filter(mAllProperties, true);
		this._mPrivateProperties = filter(mAllProperties, false);
		var mAllAggregations = normalize(oStaticInfo.aggregations, this.metaFactoryAggregation);
		this._mAggregations = filter(mAllAggregations, true);
		this._mPrivateAggregations = filter(mAllAggregations, false);
		this._sDefaultAggregation = oStaticInfo.defaultAggregation || null;
		this._sDefaultProperty = oStaticInfo.defaultProperty || null;
		var mAllAssociations = normalize(oStaticInfo.associations, this.metaFactoryAssociation);
		this._mAssociations = filter(mAllAssociations, true);
		this._mPrivateAssociations = filter(mAllAssociations, false);
		this._mEvents = normalize(oStaticInfo.events, this.metaFactoryEvent);

		// as oClassInfo is volatile, we need to store the info
		this._oDesignTime = oClassInfo.metadata["designtime"] || oClassInfo.metadata["designTime"];
		this._sProvider = oClassInfo.metadata["provider"];

		if ( oClassInfo.metadata.__version > 1.0 ) {
			this.generateAccessors();
		}

	};

	/**
	 * @private
	 */
	ManagedObjectMetadata.prototype.afterApplySettings = function() {

		Metadata.prototype.afterApplySettings.call(this);

		// if there is a parent class, produce the flattened "all" views for the element specific metadata
		// PERFOPT: this could be done lazily
		var oParent = this.getParent();
		if ( oParent instanceof ManagedObjectMetadata ) {
			this._mAllEvents = Object.assign({}, oParent._mAllEvents, this._mEvents);
			this._mAllPrivateProperties = Object.assign({}, oParent._mAllPrivateProperties, this._mPrivateProperties);
			this._mAllProperties = Object.assign({}, oParent._mAllProperties, this._mProperties);
			this._mAllPrivateAggregations = Object.assign({}, oParent._mAllPrivateAggregations, this._mPrivateAggregations);
			this._mAllAggregations = Object.assign({}, oParent._mAllAggregations, this._mAggregations);
			this._mAllPrivateAssociations = Object.assign({}, oParent._mAllPrivateAssociations, this._mPrivateAssociations);
			this._mAllAssociations = Object.assign({}, oParent._mAllAssociations, this._mAssociations);
			this._sDefaultAggregation = this._sDefaultAggregation || oParent._sDefaultAggregation;
			this._sDefaultProperty = this._sDefaultProperty || oParent._sDefaultProperty;
			this._mAllSpecialSettings = Object.assign({}, oParent._mAllSpecialSettings, this._mSpecialSettings);
			this._sProvider = this._sProvider || oParent._sProvider;
		} else {
			this._mAllEvents = this._mEvents;
			this._mAllPrivateProperties = this._mPrivateProperties;
			this._mAllProperties = this._mProperties;
			this._mAllPrivateAggregations = this._mPrivateAggregations;
			this._mAllAggregations = this._mAggregations;
			this._mAllPrivateAssociations = this._mPrivateAssociations;
			this._mAllAssociations = this._mAssociations;
			this._mAllSpecialSettings = this._mSpecialSettings;
		}

	};

	ManagedObjectMetadata.Kind = Kind;

	/**
	 * Returns the name of the library that contains the described UIElement.
	 * @return {string} the name of the library
	 * @public
	 */
	ManagedObjectMetadata.prototype.getLibraryName = function() {
		return this._sLibraryName;
	};

	// ---- properties ------------------------------------------------------------------------

	/**
	 * Declares an additional property for the described class.
	 *
	 * Any property declaration via this method must happen before the described class
	 * is subclassed, or the added property will not be visible in the subclass.
	 *
	 * Typically used to enrich UIElement classes in an aspect oriented manner.
	 * @param {string} sName name of the property to add
	 * @param {sap.ui.base.ManagedObject.MetadataOptions.Property} oInfo metadata for the property
	 * @private
	 * @restricted sap.ui.core
	 * @see sap.ui.core.EnabledPropagator
	 */
	ManagedObjectMetadata.prototype.addProperty = function(sName, oInfo) {
		var oProp = this._mProperties[sName] = new Property(this, sName, oInfo);
		if (!this._mAllProperties[sName]) {// ensure extended AllProperties meta-data is also enriched
			this._mAllProperties[sName] = oProp;
		}

		if (this._fnPropertyBagFactory) {
			// after the property bag class is already created that has the default values of the properties, the
			// default value of the added property needs to be added to the property bag class as well
			this._fnPropertyBagFactory.prototype[sName] = oProp.getDefaultValue();
		}
		// TODO notify listeners (subclasses) about change
	};

	/**
	 * Checks the existence of the given public property by its name
	 * @param {string} sName name of the property
	 * @return {boolean} true, if the property exists
	 * @public
	 */
	ManagedObjectMetadata.prototype.hasProperty = function(sName) {
		return !!this._mAllProperties[sName];
	};

	/**
	 * Returns an info object for the named public property of the described class,
	 * no matter whether the property was defined by the class itself or by one of its
	 * ancestor classes.
	 *
	 * If neither the described class nor its ancestor classes define a property with the
	 * given name, <code>undefined</code> is returned.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @param {string} sName name of the property
	 * @returns {sap.ui.base.ManagedObject.MetadataOptions.Property|undefined} An info object describing the property or <code>undefined</code>
	 * @public
	 * @since 1.27.0
	 */
	ManagedObjectMetadata.prototype.getProperty = function(sName) {
		var oProp = this._mAllProperties[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oProp === 'object' ? oProp : undefined;
	};

	/**
	 * Returns a map of info objects for the public properties of the described class.
	 * Properties declared by ancestor classes are not included.
	 *
	 * The returned map keys the property info objects by their name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Property>} Map of property info objects keyed by the property names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getProperties = function() {
		return this._mProperties;
	};

	/**
	 * Returns a map of info objects for all public properties of the described class,
	 * including public properties from the ancestor classes.
	 *
	 * The returned map keys the property info objects by their name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Property>} Map of property info objects keyed by the property names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getAllProperties = function() {
		return this._mAllProperties;
	};

	/**
	 * Returns a map of info objects for all private (hidden) properties of the described class,
	 * including private properties from the ancestor classes.
	 *
	 * The returned map contains property info objects keyed by the property name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Property>} Map of property info objects keyed by property names
	 * @protected
	 */
	ManagedObjectMetadata.prototype.getAllPrivateProperties = function() {
		return this._mAllPrivateProperties;
	};

	/**
	 * Returns the info object for the named public or private property declared by the
	 * described class or by any of its ancestors.
	 *
	 * If the name is not given (or has a falsy value), then it is substituted by the
	 * name of the default property of the described class (if it is defined).
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @param {string} sName name of the property to be retrieved or empty
	 * @returns {sap.ui.base.ManagedObject.MetadataOptions.Property|undefined} property info object or <code>undefined</code>
	 * @protected
	 */
	ManagedObjectMetadata.prototype.getManagedProperty = function(sName) {
		sName = sName || this._sDefaultProperty;
		var oProp = sName ? this._mAllProperties[sName] || this._mAllPrivateProperties[sName] : undefined;
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oProp === 'object' ? oProp : undefined;
	};

	/**
	 * Returns the name of the default property of the described class.
	 *
	 * If the class itself does not define a default property, then the default property
	 * of the parent is returned. If no class in the hierarchy defines a default property,
	 * <code>undefined</code> is returned.
	 *
	 * @return {string} Name of the default property
	 */
	ManagedObjectMetadata.prototype.getDefaultPropertyName = function() {
		return this._sDefaultProperty;
	};

	/**
	 * Returns an info object for the default property of the described class.
	 *
	 * If the class itself does not define a default property, then the
	 * info object for the default property of the parent class is returned.
	 *
	 * @return {sap.ui.base.ManagedObject.MetadataOptions.Property|undefined} An info object for the default property
	 */
	ManagedObjectMetadata.prototype.getDefaultProperty = function() {
		return this.getProperty(this.getDefaultPropertyName());
	};

	// ---- aggregations ----------------------------------------------------------------------

	/**
	 * Checks the existence of the given public aggregation by its name.
	 * @param {string} sName name of the aggregation
	 * @return {boolean} true, if the aggregation exists
	 * @public
	 */
	ManagedObjectMetadata.prototype.hasAggregation = function(sName) {
		return !!this._mAllAggregations[sName];
	};

	/**
	 * Returns an info object for the named public aggregation of the described class
	 * no matter whether the aggregation was defined by the class itself or by one of its
	 * ancestor classes.
	 *
	 * If neither the class nor its ancestor classes define a public aggregation with the given
	 * name, <code>undefined</code> is returned.
	 *
	 * If the name is not given (or has a falsy value), then it is substituted by the
	 * name of the default aggregation of the 'described class' (if any).
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @param {string} [sName] name of the aggregation or empty
	 * @returns {sap.ui.base.ManagedObject.MetadataOptions.Aggregation|undefined} An info object describing the aggregation or <code>undefined</code>
	 * @public
	 * @since 1.27.0
	 */
	ManagedObjectMetadata.prototype.getAggregation = function(sName) {
		sName = sName || this._sDefaultAggregation;
		var oAggr = sName ? this._mAllAggregations[sName] : undefined;
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oAggr === 'object' ? oAggr : undefined;
	};

	/**
	 * Returns a map of info objects for the public aggregations of the described class.
	 * Aggregations declared by ancestor classes are not included.
	 *
	 * The returned map keys the aggregation info objects by their name.
	 * In case of 0..1 aggregations this is the singular name, otherwise it is the plural name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Aggregation>} Map of aggregation info objects keyed by aggregation names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getAggregations = function() {
		return this._mAggregations;
	};

	/**
	 * Returns a map of info objects for all public aggregations of the described class,
	 * including public aggregations form the ancestor classes.
	 *
	 * The returned map keys the aggregation info objects by their name.
	 * In case of 0..1 aggregations this is the singular name, otherwise it is the plural
	 * name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Aggregation>} Map of aggregation info objects keyed by aggregation names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getAllAggregations = function() {
		return this._mAllAggregations;
	};

	/**
	 * Returns a map of info objects for all private (hidden) aggregations of the described class,
	 * including private aggregations from the ancestor classes.
	 *
	 * The returned map contains aggregation info objects keyed by the aggregation name.
	 * In case of 0..1 aggregations this is the singular name, otherwise it is the plural name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Aggregation>} Map of aggregation info objects keyed by aggregation names
	 * @protected
	 */
	ManagedObjectMetadata.prototype.getAllPrivateAggregations = function() {
		return this._mAllPrivateAggregations;
	};

	/**
	 * Returns the info object for the named public or private aggregation declared by the
	 * described class or by any of its ancestors.
	 *
	 * If the name is not given (or has a falsy value), then it is substituted by the
	 * name of the default aggregation of the described class (if it is defined).
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @param {string} sAggregationName name of the aggregation to be retrieved or empty
	 * @returns {sap.ui.base.ManagedObject.MetadataOptions.Aggregation|undefined} aggregation info object or <code>undefined</code>
	 * @protected
	 */
	ManagedObjectMetadata.prototype.getManagedAggregation = function(sAggregationName) {
		sAggregationName = sAggregationName || this._sDefaultAggregation;
		var oAggr = sAggregationName ? this._mAllAggregations[sAggregationName] || this._mAllPrivateAggregations[sAggregationName] : undefined;
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oAggr === 'object' ? oAggr : undefined;
	};

	/**
	 * Returns the name of the default aggregation of the described class.
	 *
	 * If the class itself does not define a default aggregation, then the default aggregation
	 * of the parent is returned. If no class in the hierarchy defines a default aggregation,
	 * <code>undefined</code> is returned.
	 *
	 * @return {string} Name of the default aggregation
	 * @public
	 * @since 1.73
	 */
	ManagedObjectMetadata.prototype.getDefaultAggregationName = function() {
		return this._sDefaultAggregation;
	};

	/**
	 * Returns an info object for the default aggregation of the described class.
	 *
	 * If the class itself does not define a default aggregation, then the
	 * info object for the default aggregation of the parent class is returned.
	 *
	 * @return {sap.ui.base.ManagedObject.MetadataOptions.Aggregation} An info object for the default aggregation
	 * @public
	 * @since 1.73
	 */
	ManagedObjectMetadata.prototype.getDefaultAggregation = function() {
		return this.getAggregation();
	};

	/**
	 * Defines that an aggregation <code>sForwardedSourceAggregation</code> of the ManagedObject described by this metadata
	 * should be "forwarded" to an aggregation of an internal element within the composite.
	 *
	 * This means that all adding, removal, or other operations happening on the source aggregation are actually called on the target instance.
	 * All elements added to the source aggregation will be located at the target aggregation (this means the target instance is their parent).
	 * Both, source and target element will return the added elements when asked for the content of the respective aggregation.
	 * If present, the named (non-generic) aggregation methods will be called for the target aggregation.
	 *
	 * When the source aggregation is bound, the binding will by default take place there and the add/remove operations will be forwarded to the
	 * target. However, optionally the binding can also be forwarded. The result is similar - all added/bound items will reside at the target -
	 * but when the binding is forwarded, the updateAggregation method is called on the target element and the add/remove methods are only called
	 * on the target element as well.
	 *
	 * Aggregations can only be forwarded to other aggregations of the same multiplicity (single/multiple).
	 * The target aggregation must also be "compatible" to the source aggregation in the sense that any items given to the source aggregation
	 * must also be valid in the target aggregation (otherwise the target element will throw a validation error).
	 *
	 * If the forwarded elements use data binding, the target element must be properly aggregated by the source element
	 * to make sure all models are available there as well (this is anyway important to avoid issues).
	 *
	 * The aggregation target must remain the same instance across the entire lifetime of the source control.
	 *
	 * Aggregation forwarding must be set up before any instances of the control are created (recommended: within the class definition)
	 * to avoid situations where forwarding is not yet set up when the first aggregated item is added.
	 *
	 * Aggregation forwarding will behave unexpectedly when the content in the target aggregation is modified by other actors
	 * (e.g. by the target element or by another forwarding from a different source aggregation). Hence, this is not allowed.
	 *
	 * For any given source aggregation this method may only be called once. Calling it again overrides the previous forwarding, but leaves
	 * any already forwarded elements at their previous target.
	 *
	 * @example <caption>A composite control <code>ComboBox</code> internally uses a control <code>List</code> to display the items added to
	 * its own <code>items</code> aggregation. So it forwards the items to the <code>listItems</code> aggregation of the <code>List</code>.
	 * At runtime, the internal <code>List</code> is always instantiated in the <code>init()</code> method of the <code>ComboBox</code> control
	 * and its ID is created as concatenation of the ID of the <code>ComboBox</code> and the suffix "-internalList".</caption>
	 *
	 *   ComboBox.getMetadata().forwardAggregation(
	 *      "items",
	 *      {
	 *          idSuffix: "-internalList", // internal control with the ID <control id> + "-internalList" must always exist after init() has been called
	 *          aggregation: "listItems"
	 *      }
	 *   );
	 *
	 * @example <caption>Same as above, but the internal <code>List</code> is not always instantiated initially. It is only lazily instantiated
	 * in the method <code>ComboBox.prototype._getInternalList()</code>. Instead of the ID suffix, the getter function can be given.</caption>
	 *
	 *   ComboBox.getMetadata().forwardAggregation(
	 *      "items",
	 *      {
	 *          getter: ComboBox.prototype._getInternalList, // the function returning (and instantiating if needed) the target list at runtime
	 *          aggregation: "listItems"
	 *      }
	 *   );
	 *
	 * @param {string}
	 *            sForwardedSourceAggregation The name of the aggregation to be forwarded
	 * @param {object}
	 *            mOptions The forwarding target as well as additional options
	 * @param {string|function}
	 *            [mOptions.getter] The function that returns the target element instance (the "this" context inside the function is the source instance),
	 *            or the name of such a function on this ManagedObject type. Either getter or idSuffix (but not both) must be defined.
	 * @param {string}
	 *            [mOptions.idSuffix] The ID suffix of the target element (the full target ID is the source instance ID plus this suffix,
	 *            the target element must always be instantiated after the init() method has been executed).
	 *            Either getter or idSuffix (but not both) must be defined.
	 * @param {string}
	 *            mOptions.aggregation The name of the aggregation on the target instance where the forwarding should lead to
	 * @param {boolean}
	 *            [mOptions.forwardBinding] Whether a binding of the source aggregation should also be forwarded to the target aggregation
	 *            or rather handled on the source aggregation, so only the resulting aggregation method calls are forwarded
	 *
	 * @since 1.54
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @experimental As of 1.54, this method is still in an experimental state. Its signature might change or it might be removed
	 *   completely. Controls should prefer to declare aggregation forwarding in the metadata for the aggregation. See property
	 *   <code>forwarding</code> in the documentation of {@link sap.ui.base.ManagedObject.extend ManagedObject.extend}.
	 */
	ManagedObjectMetadata.prototype.forwardAggregation = function(sForwardedSourceAggregation, mOptions) {

		var oAggregation = this.getAggregation(sForwardedSourceAggregation);
		if (!oAggregation) {
			throw new Error("aggregation " + sForwardedSourceAggregation + " does not exist");
		}

		if (!mOptions || !mOptions.aggregation || !(mOptions.idSuffix || mOptions.getter) || (mOptions.idSuffix && mOptions.getter)) {
			throw new Error("an 'mOptions' object with 'aggregation' property and either 'idSuffix' or 'getter' property (but not both) must be given"
				+ " but does not exist");
		}

		if (oAggregation._oParent === this) {
			// store the information on the aggregation
			oAggregation.forwarding = mOptions;
			oAggregation._oForwarder = new AggregationForwarder(oAggregation);
		} else {
			// aggregation is defined on superclass; clone&modify the aggregation info to contain the forwarding information
			oAggregation = new this.metaFactoryAggregation(this, sForwardedSourceAggregation, {
				type: oAggregation.type,
				altTypes: oAggregation.altTypes,
				multiple: oAggregation.multiple,
				singularName: oAggregation.singularName,
				bindable: oAggregation.bindable,
				deprecated: oAggregation.deprecated,
				visibility: oAggregation.visibility,
				selector: oAggregation.selector,
				forwarding: mOptions
			});
			this._mAggregations[sForwardedSourceAggregation] =
			this._mAllAggregations[sForwardedSourceAggregation] = oAggregation;
		}
	};

	/**
	 * Returns a forwarder for the given aggregation (or undefined, when there is no forwarding), considering also inherited aggregations.
	 * @param {string} sAggregationName Name of the aggregation to get the forwarder for
	 * @private
	 * @returns {sap.ui.base.ManagedObjectMetadata.AggregationForwarder|undefined}
	 */
	ManagedObjectMetadata.prototype.getAggregationForwarder = function(sAggregationName) {
		var oAggregation = this._mAllAggregations[sAggregationName];
		return oAggregation ? oAggregation._oForwarder : undefined;
	};

	/**
	 * Returns the name of the default property of the described class.
	 *
	 * If the class itself does not define a default property, then the default property
	 * of the parent is returned. If no class in the hierarchy defines a default property,
	 * <code>undefined</code> is returned.
	 *
	 * @return {string} Name of the default property
	 */
	ManagedObjectMetadata.prototype.getDefaultPropertyName = function() {
		return this._sDefaultProperty;
	};

	/**
	 * Returns an info object for the default property of the described class.
	 *
	 * If the class itself does not define a default property, then the
	 * info object for the default property of the parent class is returned.
	 *
	 * @return {sap.ui.base.ManagedObject.MetadataOptions.Property} An info object for the default property
	 */
	ManagedObjectMetadata.prototype.getDefaultProperty = function() {
		return this.getProperty(this.getDefaultPropertyName());
	};

	/**
	 * Returns an info object for a public setting with the given name that either is
	 * a public property or a public aggregation of cardinality 0..1 and with at least
	 * one simple alternative type. The setting can be defined by the class itself or
	 * by one of its ancestor classes.
	 *
	 * If neither the described class nor its ancestor classes define a suitable setting
	 * with the given name, <code>undefined</code> is returned.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @param {string} sName name of the property like setting
	 * @returns {sap.ui.base.ManagedObject.MetadataOptions.Property|sap.ui.base.ManagedObject.MetadataOptions.Aggregation|undefined} An info object describing the property or aggregation or <code>undefined</code>
	 * @public
	 * @since 1.27.0
	 */
	ManagedObjectMetadata.prototype.getPropertyLikeSetting = function(sName) {
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		var oProp = this._mAllProperties[sName];
		if ( typeof oProp === 'object' ) {
			return oProp;
		}
		oProp = this._mAllAggregations[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return ( typeof oProp === 'object' && oProp.altTypes && oProp.altTypes.length > 0 ) ? oProp : undefined;
	};

	// ---- associations ----------------------------------------------------------------------

	/**
	 * Checks the existence of the given public association by its name
	 * @param {string} sName name of the association
	 * @return {boolean} true, if the association exists
	 * @public
	 */
	ManagedObjectMetadata.prototype.hasAssociation = function(sName) {
		return !!this._mAllAssociations[sName];
	};

	/**
	 * Returns an info object for the named public association of the described class,
	 * no matter whether the association was defined by the class itself or by one of its
	 * ancestor classes.
	 *
	 * If neither the described class nor its ancestor classes define an association with
	 * the given name, <code>undefined</code> is returned.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @param {string} sName name of the association
	 * @returns {sap.ui.base.ManagedObject.MetadataOptions.Association|undefined} An info object describing the association or <code>undefined</code>
	 * @public
	 * @since 1.27.0
	 */
	ManagedObjectMetadata.prototype.getAssociation = function(sName) {
		var oAssoc = this._mAllAssociations[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oAssoc === 'object' ? oAssoc : undefined;
	};

	/**
	 * Returns a map of info objects for all public associations of the described class.
	 * Associations declared by ancestor classes are not included.
	 *
	 * The returned map keys the association info objects by their name.
	 * In case of 0..1 associations this is the singular name, otherwise it is the plural name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Association>} Map of association info objects keyed by association names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getAssociations = function() {
		return this._mAssociations;
	};

	/**
	 * Returns a map of info objects for all public associations of the described class,
	 * including public associations form the ancestor classes.
	 *
	 * The returned map keys the association info objects by their name.
	 * In case of 0..1 associations this is the singular name, otherwise it is the plural name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Association>} Map of association info objects keyed by association names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getAllAssociations = function() {
		return this._mAllAssociations;
	};

	/**
	 * Returns a map of info objects for all private (hidden) associations of the described class,
	 * including private associations from the ancestor classes.
	 *
	 * The returned map contains association info objects keyed by the association name.
	 * In case of 0..1 associations this is the singular name, otherwise it is the plural name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Association>} Map of association info objects keyed by association names
	 * @protected
	 */
	ManagedObjectMetadata.prototype.getAllPrivateAssociations = function() {
		return this._mAllPrivateAssociations;
	};

	/**
	 * Returns the info object for the named public or private association declared by the
	 * described class or by any of its ancestors.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @param {string} sName name of the association to be retrieved
	 * @returns {sap.ui.base.ManagedObject.MetadataOptions.Association|undefined} association info object or <code>undefined</code>
	 * @protected
	 */
	ManagedObjectMetadata.prototype.getManagedAssociation = function(sName) {
		var oAggr = this._mAllAssociations[sName] || this._mAllPrivateAssociations[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oAggr === 'object' ? oAggr : undefined;
	};

	// ---- events ----------------------------------------------------------------------------

	/**
	 * Checks the existence of the given event by its name
	 *
	 * @param {string} sName name of the event
	 * @return {boolean} true, if the event exists
	 * @public
	 */
	ManagedObjectMetadata.prototype.hasEvent = function(sName) {
		return !!this._mAllEvents[sName];
	};

	/**
	 * Returns an info object for the named public event of the described class,
	 * no matter whether the event was defined by the class itself or by one of its
	 * ancestor classes.
	 *
	 * If neither the described class nor its ancestor classes define an event with the
	 * given name, <code>undefined</code> is returned.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @param {string} sName name of the event
	 * @returns {sap.ui.base.ManagedObject.MetadataOptions.Event|undefined} An info object describing the event or <code>undefined</code>
	 * @public
	 * @since 1.27.0
	 */
	ManagedObjectMetadata.prototype.getEvent = function(sName) {
		var oEvent = this._mAllEvents[sName];
		// typeof is used as a fast (but weak) substitute for hasOwnProperty
		return typeof oEvent === 'object' ? oEvent : undefined;
	};

	/**
	 * Returns a map of info objects for the public events of the described class.
	 * Events declared by ancestor classes are not included.
	 *
	 * The returned map keys the event info objects by their name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Event>} Map of event info objects keyed by event names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getEvents = function() {
		return this._mEvents;
	};

	/**
	 * Returns a map of info objects for all public events of the described class,
	 * including public events form the ancestor classes.
	 *
	 * The returned map keys the event info objects by their name.
	 *
	 * <b>Warning:</b> Type, structure and behavior of the returned info objects is not documented
	 *   and therefore not part of the API. See the {@link #constructor Notes about Info objects}
	 *   in the constructor documentation of this class.
	 *
	 * @return {Object<string,sap.ui.base.ManagedObject.MetadataOptions.Event>} Map of event info objects keyed by event names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getAllEvents = function() {
		return this._mAllEvents;
	};

	// ---- special settings ------------------------------------------------------------------


	/**
	 * Adds a new special setting.
	 * Special settings are settings that are accepted in the mSettings
	 * object at construction time or in an {@link sap.ui.base.ManagedObject.applySettings}
	 * call but that are neither properties, aggregations, associations nor events.
	 *
	 * @param {string} sName name of the setting
	 * @param {object} oInfo metadata for the setting
	 * @private
	 * @restricted sap.ui.core
	 */
	ManagedObjectMetadata.prototype.addSpecialSetting = function (sName, oInfo) {
		var oSS = new SpecialSetting(this, sName, oInfo);
		this._mSpecialSettings[sName] = oSS;
		if (!this._mAllSpecialSettings[sName]) {
			this._mAllSpecialSettings[sName] = oSS;
		}
	};

	/**
	 * Checks the existence of the given special setting.
	 * Special settings are settings that are accepted in the mSettings
	 * object at construction time or in an {@link sap.ui.base.ManagedObject.applySettings}
	 * call but that are neither properties, aggregations, associations nor events.
	 *
	 * @param {string} sName name of the settings
	 * @return {boolean} true, if the special setting exists
	 * @private
	 */
	ManagedObjectMetadata.prototype.hasSpecialSetting = function (sName) {
		return !!this._mAllSpecialSettings[sName];
	};

	// ----------------------------------------------------------------------------------------

	/**
	 * Returns a map of default values for all properties declared by the
	 * described class and its ancestors, keyed by the property name.
	 *
	 * @return {Object<string,any>} Map of default values keyed by property names
	 * @public
	 */
	ManagedObjectMetadata.prototype.getPropertyDefaults = function() {

		var mDefaults = this._mDefaults, s;

		if ( mDefaults ) {
			return mDefaults;
		}

		if ( this.getParent() instanceof ManagedObjectMetadata ) {
			mDefaults = Object.assign({}, this.getParent().getPropertyDefaults());
		} else {
			mDefaults = {};
		}

		for (s in this._mProperties) {
			mDefaults[s] = this._mProperties[s].getDefaultValue();
		}
		//Add the default values for private properties
		for (s in this._mPrivateProperties) {
			mDefaults[s] = this._mPrivateProperties[s].getDefaultValue();
		}
		this._mDefaults = mDefaults;
		return mDefaults;
	};

	ManagedObjectMetadata.prototype.createPropertyBag = function() {
		if ( !this._fnPropertyBagFactory ) {
			this._fnPropertyBagFactory = function PropertyBag() {};
			this._fnPropertyBagFactory.prototype = this.getPropertyDefaults();
		}
		return new (this._fnPropertyBagFactory)();
	};

	/**
	 * Returns a map with all settings of the described class..
	 * Mainly used for the {@link sap.ui.base.ManagedObject#applySettings} method.
	 *
	 * @see sap.ui.base.ManagedObject#applySettings
	 * @private
	 */
	ManagedObjectMetadata.prototype.getJSONKeys = function() {

		if ( this._mJSONKeys ) {
			return this._mJSONKeys;
		}

		var mAllSettings = {},
			mJSONKeys = {};

		function addKeys(m) {
			var sName, oInfo, oPrevInfo;
			for (sName in m) {
				oInfo = m[sName];
				oPrevInfo = mAllSettings[sName];
				if ( !oPrevInfo || oInfo._iKind < oPrevInfo._iKind ) {
					mAllSettings[sName] = mJSONKeys[sName] = oInfo;
				}
				mJSONKeys[oInfo._sUID] = oInfo;
			}
		}

		addKeys(this._mAllSpecialSettings);
		addKeys(this.getAllProperties());
		addKeys(this.getAllAggregations());
		addKeys(this.getAllAssociations());
		addKeys(this.getAllEvents());

		this._mJSONKeys = mJSONKeys;
		this._mAllSettings = mAllSettings;
		return this._mJSONKeys;
	};

	/**
	 * @private
	 */
	ManagedObjectMetadata.prototype.getAllSettings = function() {
		if ( !this._mAllSettings ) {
			this.getJSONKeys();
		}
		return this._mAllSettings;
	};

	/**
	 * Filter out settings from the given map that are not described in the metadata.
	 *
	 * If <code>null</code> or <code>undefined</code> is given, <code>null</code> or <code>undefined</code> is returned.
	 *
	 * @param {object|null|undefined} [mSettings] original filters or <code>null</code>
	 * @returns {object|null|undefined} new object with filtered settings or <code>null</code> or <code>undefined</code>
	 * @private
	 * @since 1.27.0
	 */
	ManagedObjectMetadata.prototype.removeUnknownSettings = function(mSettings) {

		assert(mSettings == null || typeof mSettings === 'object', "mSettings must be null or undefined or an object");

		if ( mSettings == null ) {
			return mSettings;
		}

		var mValidKeys = this.getJSONKeys(),
			mResult = {},
			sName;

		for ( sName in mSettings ) {
			if ( Object.hasOwn(mValidKeys, sName) ) {
				mResult[sName] = mSettings[sName];
			}
		}

		return mResult;
	};

	ManagedObjectMetadata.prototype.generateAccessors = function() {

		var proto = this.getClass().prototype,
			prefix = this.getName() + ".",
			methods = this._aPublicMethods,
			n;

		function add(name, fn, info) {
			if ( !proto[name] ) {
				proto[name] = (info && info.deprecated) ? deprecation(fn, prefix + info.name) : fn;
			}
			methods.push(name);
		}

		for (n in this._mProperties) {
			this._mProperties[n].generate(add);
		}
		for (n in this._mAggregations) {
			this._mAggregations[n].generate(add);
		}
		for (n in this._mAssociations) {
			this._mAssociations[n].generate(add);
		}
		for (n in this._mEvents) {
			this._mEvents[n].generate(add);
		}
	};

	// ---- Design Time capabilities -------------------------------------------------------------

	/**
	 * Returns a promise that resolves if the designtime preload of a library is loaded for the given oMetadata
	 * object is loaded.
	 *
	 * @private
	 */
	function preloadDesigntimeLibrary(oMetadata) {
		return new Promise(function(resolve, reject) {
			sap.ui.require(["sap/ui/core/Lib"], function (Library) {
				//preload the designtime data for the library
				var sLibrary = oMetadata.getLibraryName(),
					sPreload = Library.getPreloadMode(),
					oLibrary = Library.all()[sLibrary];
				if (oLibrary && oLibrary.designtime) {
					var oPromise;
					if (sPreload === "async" || sPreload === "sync") {
						//ignore errors _loadJSResourceAsync is true here, do not break if there is no preload.
						oPromise = sap.ui.loader._.loadJSResourceAsync(oLibrary.designtime.replace(/\.designtime$/, "-preload.designtime.js"), true);
					} else {
						oPromise = Promise.resolve();
					}
					resolve(new Promise(function(fnResolve, fnReject) {
						oPromise.then(function() {
							sap.ui.require([oLibrary.designtime], function(oLib) {
								fnResolve(oLib);
							}, fnReject);
						});
					}));
				}
				resolve(null);
			}, reject);
		});
	}

	/**
	 * Returns a promise that resolves with the own, unmerged designtime data.
	 * If the class is marked as having no designtime data, the promise will resolve with null.
	 *
	 * @private
	 */
	function loadOwnDesignTime(oMetadata) {
		if (isPlainObject(oMetadata._oDesignTime) || !oMetadata._oDesignTime) {
			return Promise.resolve(oMetadata._oDesignTime || {});
		}

		return new Promise(function(fnResolve, fnReject) {
			var sModule;
			if (typeof oMetadata._oDesignTime === "string") {
				//oMetadata._oDesignTime points to resource path to another file, for example: "sap/ui/core/designtime/<control>.designtime"
				sModule = oMetadata._oDesignTime;
			} else {
				sModule = oMetadata.getName().replace(/\./g, "/") + ".designtime";
			}
			preloadDesigntimeLibrary(oMetadata).then(function(oLib) {
				sap.ui.require([sModule], function(mDesignTime) {
					mDesignTime.designtimeModule = sModule;
					oMetadata._oDesignTime = mDesignTime;
					mDesignTime._oLib = oLib;
					fnResolve(mDesignTime);
				}, fnReject);
			});
		});
	}

	var mPredefinedDesignTimeModules = {};

	/**
	 * Sets the map with the module names to predefined DesignTime objects which will be available in {@link sap.ui.base.ManagedObjectMetadata.prototype.loadDesignTime}
	 * @param {Object<string,string>} mPredefinedDesignTime map containing the module names
	 * @private
	 * @ui5-restricted sap.ui.dt
	 */
	ManagedObjectMetadata.setDesignTimeDefaultMapping = function(mPredefinedDesignTime) {
		mPredefinedDesignTimeModules = mPredefinedDesignTime;
	};

	/**
	 * Returns a promise that resolves with the instance specific, unmerged designtime data.
	 * If no instance is provided, the promise will resolve with {}.
	 *
	 * @private
	 */
	function loadInstanceDesignTime(oInstance) {
		var sInstanceSpecificModule =
			BaseObject.isObjectA(oInstance, "sap.ui.base.ManagedObject")
			&& typeof oInstance.data === "function"
			&& oInstance.data("sap-ui-custom-settings")
			&& oInstance.data("sap-ui-custom-settings")["sap.ui.dt"]
			&& oInstance.data("sap-ui-custom-settings")["sap.ui.dt"].designtime;

		if (typeof sInstanceSpecificModule === "string") {
			sInstanceSpecificModule = mPredefinedDesignTimeModules[sInstanceSpecificModule] || sInstanceSpecificModule;

			return new Promise(function(fnResolve, fnReject) {
				sap.ui.require([sInstanceSpecificModule], function(vDesignTime) {
					if (typeof vDesignTime === "function") {
						fnResolve(vDesignTime(oInstance));
					} else {
						fnResolve(vDesignTime);
					}
				}, fnReject);
			});
		} else {
			return Promise.resolve({});
		}
	}

	/**
	 * Extracts metadata from metadata map by scope key
	 * @param {object} mMetadata metadata map received from loader
	 * @param {string} sScopeKey scope name to be extracted
	 * @private
	 */
	function getScopeBasedDesignTime(mMetadata, sScopeKey) {
		var mResult = mMetadata;

		if ("default" in mMetadata) {
			mResult = merge(
				{},
				mMetadata.default,
				sScopeKey !== "default" && mMetadata[sScopeKey] || null
			);
		}

		return mResult;
	}

	function mergeDesignTime(mOwnDesignTime, mParentDesignTime, sScopeKey){
		// we use "sap/base/util/merge" to be able to also overwrite properties with null or undefined
		// using deep extend to inherit full parent designtime, unwanted inherited properties have to be overwritten with undefined
		return merge(
			{},
			getScopeBasedDesignTime(mParentDesignTime, sScopeKey),
			//non inherited DT properties
			{
				templates: {
					create: null //create template will not be inherited, they are special to the current type.
				}
			},
			getScopeBasedDesignTime(mOwnDesignTime, sScopeKey), {
				designtimeModule: mOwnDesignTime.designtimeModule || undefined,
				_oLib: mOwnDesignTime._oLib
			}
		);
	}

	/**
	 * Load and returns the design time metadata asynchronously. It inherits/merges parent
	 * design time metadata and if provided merges also instance specific design time
	 * metadata that was provided via the dt namespace.
	 *
	 * Be aware that ManagedObjects do not ensure to have unique IDs. This may lead to
	 * issues if you would like to persist DesignTime based information. In that case
	 * you need to take care of identification yourself.
	 *
	 * @param {sap.ui.base.ManagedObject} [oManagedObject] instance that could have instance specific design time metadata
	 * @param {string} [sScopeKey] scope name for which metadata will be resolved, see sap.ui.base.ManagedObjectMetadataScope
	 * @return {Promise} A promise which will return the loaded design time metadata
	 * @private
	 * @ui5-restricted sap.ui.dt, com.sap.webide
	 * @since 1.48.0
	 */
	ManagedObjectMetadata.prototype.loadDesignTime = function(oManagedObject, sScopeKey) {
		sScopeKey = typeof sScopeKey === "string" && sScopeKey || "default";

		var oInstanceDesigntimeLoaded = loadInstanceDesignTime(oManagedObject);

		if (!this._oDesignTimePromise) {
			// Note: parent takes care of merging its ancestors
			var oWhenParentLoaded;
			var oParent = this.getParent();
			// check if the mixin is applied to the parent
			if (oParent instanceof ManagedObjectMetadata) {
				oWhenParentLoaded = oParent.loadDesignTime(null, sScopeKey);
			} else {
				oWhenParentLoaded = Promise.resolve({});
			}
			// Note that the ancestor designtimes and the own designtime will be loaded 'in parallel',
			// only the merge is done in sequence by chaining promises
			this._oDesignTimePromise = loadOwnDesignTime(this).then(function(mOwnDesignTime) {
				return oWhenParentLoaded.then(function(mParentDesignTime) {
					return mergeDesignTime(mOwnDesignTime, mParentDesignTime, sScopeKey);
				});
			});
		}

		return Promise.all([oInstanceDesigntimeLoaded, this._oDesignTimePromise])
			.then(function(aData){
				var oInstanceDesigntime = aData[0],
					oDesignTime = aData[1];
				return merge(
					{},
					oDesignTime,
					getScopeBasedDesignTime(oInstanceDesigntime || {}, sScopeKey)
				);
			});
	};

	// ---- autoid creation -------------------------------------------------------------

	/**
	 * Usage counters for the different UID tokens
	 */
	var mUIDCounts = {},
		sUIDPrefix;

	function uid(sId) {
		assert(!/[0-9]+$/.exec(sId), "AutoId Prefixes must not end with numbers");

		sId = ManagedObjectMetadata.getUIDPrefix() + sId;

		// read counter (or initialize it)
		var iCount = mUIDCounts[sId] || 0;

		// increment counter
		mUIDCounts[sId] = iCount + 1;

		// combine prefix + counter
		// concatenating sId and a counter is only safe because we don't allow trailing numbers in sId!
		return sId + iCount;
	}

	/**
	 * Calculates a new ID based on a prefix.
	 *
	 * To guarantee uniqueness of the generated IDs across all ID prefixes,
	 * prefixes must not end with digits.
	 *
	 * @param {string} sIdPrefix prefix for the new ID
	 * @return {string} A (hopefully unique) control id
	 * @public
	 * @function
	 */
	ManagedObjectMetadata.uid = uid;

	/**
	 * Get the prefix used for the generated IDs from configuration
	 *
	 * @return {string} The prefix for the generated IDs
	 * @public
	 * @since 1.119.0
	 */
	ManagedObjectMetadata.getUIDPrefix = function() {
		if (sUIDPrefix === undefined) {
			sUIDPrefix = BaseConfig.get({
				name: "sapUiUidPrefix",
				type: BaseConfig.Type.String,
				defaultValue: "__",
				freeze: true
			});
		}
		return sUIDPrefix;
	};

	/**
	 * Calculates a new ID for an instance of this class.
	 *
	 * Note that the calculated short name part is usually not unique across
	 * all classes, but doesn't have to be. It might even be empty when the
	 * class name consists of invalid characters only.
	 *
	 * @return {string} A (hopefully unique) control ID
	 * @public
	 */
	ManagedObjectMetadata.prototype.uid = function() {

		var sId = this._sUIDToken;
		if ( typeof sId !== "string" ) {
			// start with qualified class name
			sId = this.getName();
			// reduce to unqualified name
			sId = sId.slice(sId.lastIndexOf('.') + 1);
			// reduce a camel case, multi word name to the last word
			sId = sId.replace(/([a-z])([A-Z])/g, "$1 $2").split(" ").slice(-1)[0];
			// remove unwanted chars (and no trailing digits!) and convert to lower case
			sId = this._sUIDToken = sId.replace(/([^A-Za-z0-9-_.:])|([0-9]+$)/g,"").toLowerCase();
		}

		return uid(sId);
	};

	var rGeneratedUID;

	/**
	 * Test whether a given ID looks like it was automatically generated.
	 *
	 * Examples:
	 * <pre>
	 * True for:
	 *   "foo--__bar04--baz"
	 *   "foo--__bar04"
	 *   "__bar04--baz"
	 *   "__bar04"
	 *   "__bar04--"
	 *   "__bar04--foo"
	 * False for:
	 *   "foo__bar04"
	 *   "foo__bar04--baz"
	 * </pre>
	 *
	 * See {@link sap.ui.base.ManagedObjectMetadata.prototype.uid} for details on ID generation.
	 *
	 * @param {string} sId the ID that should be tested
	 * @return {boolean} whether the ID is likely to be generated
	 * @static
	 * @public
	 */
	ManagedObjectMetadata.isGeneratedId = function(sId) {
		rGeneratedUID = rGeneratedUID || new RegExp( "(^|-{1,3})" + escapeRegExp(ManagedObjectMetadata.getUIDPrefix()) );

		return rGeneratedUID.test(sId);
	};

	return ManagedObjectMetadata;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/base/ManagedObjectRegistry", ["sap/ui/base/ManagedObject", "sap/base/Log", "sap/base/assert"],
	function(ManagedObject, Log, assert) {
	"use strict";

	const ManagedObjectRegistry = {
		create(oOptions) {
			/**
			 * Map (object) of objects keyed by their ID.
			 * @private
			 */
			const mInstances = Object.create(null);

			/**
			 * Number of objects in <code>mInstances</code>.
			 * @private
			 */
			let iInstancesCount = 0;

			oOptions ??= {};

			const facade = {
				init(FNClass) {
					if ( typeof FNClass !== 'function' || !(FNClass.prototype instanceof ManagedObject) ) {
						throw new TypeError("ManagedObjectRegistry mixin can only be applied to subclasses of sap.ui.base.ManagedObject");
					}

					var fnOnDuplicate = oOptions.onDuplicate || function(sId, oldInstance, newInstance) {
						var sStereotype = FNClass.getMetadata().getStereotype();
						Log.error("adding object \"" + sStereotype + "\" with duplicate id '" + sId + "'");
						throw new Error("Error: adding object \"" + sStereotype + "\" with duplicate id '" + sId + "'");
					};

					var fnOnDeregister = oOptions.onDeregister || null;

					FNClass.prototype.register = function register() {
						var sId = this.getId(),
							old = mInstances[sId];

						if ( old && old !== this ) {
							fnOnDuplicate(sId, old, this);
							// executes only if duplicate check succeeds
							iInstancesCount--;
						}

						mInstances[sId] = this;
						iInstancesCount++;
					};

					FNClass.prototype.deregister = function deregister() {
						var sId = this.getId();
						if ( mInstances[sId] ) {
							if ( fnOnDeregister ) {
								fnOnDeregister(sId);
							}
							delete mInstances[sId];
							iInstancesCount--;
						}
					};
					delete facade.init;
					Object.freeze(facade);
				},

				/**
				 * Returns the number of existing objects.
				 *
				 * @returns {int} Number of currently existing objects.
				 * @private
				 * @ui5-restricted sap.ui.core, sap.m.TablePersoController, sap.m.TablePersoDialog
				 */
				get size() {
					return iInstancesCount;
				},

				/**
				 * Return an object with all registered object instances, keyed by their ID.
				 *
				 * Each call creates a new snapshot object. Depending on the size of the UI,
				 * this operation therefore might be expensive. Consider to use the <code>forEach</code>
				 * or <code>filter</code> method instead of executing the same operations on the returned
				 * object.
				 *
				 * <b>Note</b>: The returned object is created by a call to <code>Object.create(null)</code>,
				 * so it doesn't have a prototype and therefore no <code>toString</code> method.
				 *
				 * @returns {object} Object with all elements, keyed by their ID
				 * @private
				 * @ui5-restricted sap.ui.core, sap.m.TablePersoController, sap.m.TablePersoDialog
				 */
				all: function() {
					var mResults = Object.create(null);
					return Object.assign(mResults, mInstances);
				},

				/**
				 * Retrieves an object by its ID.
				 *
				 * @param {sap.ui.core.ID|null|undefined} ID of the object to retrieve.
				 * @returns {sap.ui.core.Element|undefined} Object with the given ID or <code>undefined</code>
				 * @private
				 * @ui5-restricted sap.ui.core, sap.m.TablePersoController, sap.m.TablePersoDialog
				 */
				get: function(id) {
					assert(id == null || typeof id === "string", "id must be a string when defined");
					// allow null, as this occurs frequently and it is easier to check whether there is a control in the end than
					// first checking whether there is an ID and then checking for a control
					return id == null ? undefined : mInstances[id];
				},

				/**
				 * Calls the given <code>callback</code> for each object.
				 *
				 * If objects are created or destroyed during the <code>forEach</code> loop, then the behavior
				 * is undefined. Newly added elements might or might not be visited. If an element is destroyed
				 * during the loop and was not visited yet, it won't be visited.
				 *
				 * <code>function callback(element, id)</code>
				 *
				 * If a <code>thisArg</code> is given, it will be provided as <code>this</code> context when calling
				 * <code>callback</code>. The <code>this</code> value that the implementation of <code>callback</code>
				 * sees, depends on the usual resolution mechanism. E.g. when <code>callback</code> was bound to some
				 * context object, that object wins over the given <code>thisArg</code>.
				 *
				 * @param {function(sap.ui.core.Element,sap.ui.core.ID)} callback
				 *        Function to call for each element
				 * @param {Object} [thisArg=undefined]
				 *        Context object to provide as <code>this</code> in each call of <code>callback</code>
				 * @throws {TypeError} If <code>callback</code> is not a function
				 * @private
				 * @ui5-restricted sap.ui.core, sap.m.TablePersoController, sap.m.TablePersoDialog
				 */
				forEach: function(callback, thisArg) {
					if (typeof callback !== "function") {
						throw new TypeError(callback + " is not a function");
					}
					if ( thisArg != null ) {
						callback = callback.bind(thisArg);
					}
					for ( var id in mInstances ) {
						callback(mInstances[id], id);
					}
				},

				/**
				 * Collects all elements for which the given <code>callback</code> returns a value that coerces
				 * to <code>true</code>.
				 *
				 * If elements are created or destroyed within the <code>callback</code>, then the behavior is
				 * undefined. Newly added objects might or might not be visited. If an element is destroyed
				 * during the filtering and was not visited yet, it won't be visited.
				 *
				 * If a <code>thisArg</code> is given, it will be provided as <code>this</code> context when calling
				 * <code>callback</code>. The <code>this</code> value that the implementation of <code>callback</code>
				 * sees, depends on the usual resolution mechanism. E.g. when <code>callback</code> was bound to some
				 * context object, that object wins over the given <code>thisArg</code>.
				 *
				 * This function returns an array with all elements matching the given predicate. The order of the
				 * elements in the array is undefined and might change between calls (over time and across different
				 * versions of UI5).
				 *
				 * @param {function(sap.ui.core.Element,sap.ui.core.ID)} callback
				 *        predicate against which each element is tested
				 * @param {Object} thisArg
				 *        context object to provide as <code>this</code> in each call of <code>callback</code>
				 * @returns {sap.ui.core.Element[]}
				 *        Array of elements matching the predicate; order is undefined and might change in newer versions of UI5
				 * @throws {TypeError} If <code>callback</code> is not a function
				 * @private
				 * @ui5-restricted sap.ui.core, sap.m.TablePersoController, sap.m.TablePersoDialog
				 */
				filter: function(callback, thisArg) {
					if (typeof callback !== "function") {
						throw new TypeError(callback + " is not a function");
					}
					if ( thisArg != null ) {
						callback = callback.bind(thisArg);
					}
					var result = [],
						id;
					for ( id in mInstances ) {
						if ( callback(mInstances[id], id) ) {
							result.push(mInstances[id]);
						}
					}

					return result;
				}
			};
			return facade;
		},
		/**
		 *
		 * @param {sap.ui.base.ManagedObject} FNClass The class to create the registry
		 * @param {object} oOptions The create config options
		 * @private
		 * @deprecated
		 */
		apply(FNClass, oOptions) {
			const registry = ManagedObjectRegistry.create(oOptions);
			registry.init(FNClass);
			FNClass.registry = registry;
		}
	};

	return ManagedObjectRegistry;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides type module:sap/ui/core/AnimationMode.
sap.ui.predefine("sap/ui/core/AnimationMode", [], function() {
	"use strict";

	/**
	 * Enumerable list with available animation modes.
	 *
	 * This enumerable is used to validate the animation mode. Animation modes allow to specify
	 * different animation scenarios or levels. The implementation of the Control (JavaScript or CSS)
	 * has to be done differently for each animation mode.
	 *
	 * @enum {string}
	 * @alias module:sap/ui/core/AnimationMode
	 * @public
	 * @since 1.120
	 */
	var AnimationMode = {
		/**
		 * <code>full</code> represents a mode with unrestricted animation capabilities.
		 * @public
		 */
		full : "full",

		/**
		 * <code>basic</code> can be used for a reduced, more light-weight set of animations.
		 * @public
		 */
		basic : "basic",

		/**
		 * <code>minimal</code> includes animations of fundamental functionality.
		 * @public
		 */
		minimal : "minimal",

		/**
		 * <code>none</code> deactivates the animation completely.
		 * @public
		 */
		none : "none"
	};
	return AnimationMode;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/core/Configuration", [
	"sap/base/assert",
	"sap/base/config",
	"sap/base/Event",
	"sap/base/Log",
	"sap/base/i18n/Formatting",
	"sap/base/i18n/Localization",
	"sap/base/util/Version",
	"sap/ui/base/DesignTime",
	"sap/ui/base/Object",
	"sap/ui/core/AnimationMode",
	"sap/ui/core/ControlBehavior",
	"sap/ui/core/getCompatibilityVersion",
	"sap/ui/core/Locale",
	"sap/ui/core/Supportability",
	"sap/ui/core/Theming",
	"sap/ui/security/Security"
], function(
	assert,
	BaseConfig,
	BaseEvent,
	Log,
	Formatting,
	Localization,
	Version,
	DesignTime,
	BaseObject,
	AnimationMode,
	ControlBehavior,
	getCompatibilityVersion,
	Locale,
	Supportability,
	Theming,
	Security
) {
	"use strict";

	var oVersion = new Version("1.125.0");
	var oFormatSettings;

	// Lazy dependency to core
	var Core;

	// ---- change handling ----

	var mChanges;

	function _collect() {
		mChanges = mChanges || { __count : 0};
		mChanges.__count++;
		return mChanges;
	}

	function _endCollect() {
		if ( mChanges && (--mChanges.__count) === 0 ) {
			var mChangesToReport = mChanges;
			delete mChanges.__count;
			mChanges = undefined;
			Core?.fireLocalizationChanged(mChangesToReport);
		}
	}

	// ---- Configuration state and init ----

	/**
	 * Creates a new Configuration object.
	 *
	 * @class Collects and stores the configuration of the current environment.
	 *
	 * The Configuration is initialized once when the {@link sap.ui.core.Core} is created.
	 * There are different ways to set the environment configuration (in ascending priority):
	 * <ol>
	 * <li>System defined defaults</li>
	 * <li>Server wide defaults, read from /sap-ui-config.json</li>
	 * <li>Properties of the global configuration object window["sap-ui-config"]</li>
	 * <li>A configuration string in the data-sap-ui-config attribute of the bootstrap tag.</li>
	 * <li>Individual data-sap-ui-<i>xyz</i> attributes of the bootstrap tag</li>
	 * <li>Using URL parameters</li>
	 * <li>Setters in this Configuration object (only for some parameters)</li>
	 * </ol>
	 *
	 * That is, attributes of the DOM reference override the system defaults, URL parameters
	 * override the DOM attributes (where empty URL parameters set the parameter back to its
	 * system default). Calling setters at runtime will override any previous settings
	 * calculated during object creation.
	 *
	 * The naming convention for parameters is:
	 * <ul>
	 * <li>in the URL : sap-ui-<i>PARAMETER-NAME</i>="value"</li>
	 * <li>in the DOM : data-sap-ui-<i>PARAMETER-NAME</i>="value"</li>
	 * </ul>
	 * where <i>PARAMETER-NAME</i> is the name of the parameter in lower case.
	 *
	 * Values of boolean parameters are case insensitive where "true" and "x" are interpreted as true.
	 *
	 * @hideconstructor
	 * @extends sap.ui.base.Object
	 * @public
	 * @alias sap.ui.core.Configuration
	 * @deprecated As of version 1.120. There's no single replacement for this class. Instead,
	 *   several facades have been created for different topics, e.g. {@link module:sap/base/i18n/Localization
	 *   Localization} for settings related to localization, {@link module:sap/base/i18n/Formatting Formatting}
	 *   for settings related to data formatting, {@link module:sap/ui/core/Theming Theming} for theming related
	 *   settings, {@link module:sap/ui/core/ControlBehavior ControlBehavior} for settings that are typically
	 *   required when implementing the behavior of a control, {@link module:sap/ui/security/Security Security}
	 *   for settings around security.
	 *
	 *   Please check the individual methods of this class for their replacements, if any.
	 *
	 * @borrows module:sap/base/i18n/Localization.getLanguagesDeliveredWithCore as getLanguagesDeliveredWithCore
	 * @borrows module:sap/base/i18n/Localization.getSupportedLanguages as getSupportedLanguages
	 * @borrows module:sap/ui/core/getCompatibilityVersion as getCompatibilityVersion
	 */
	var Configuration = BaseObject.extend("sap.ui.core.Configuration", /** @lends sap.ui.core.Configuration.prototype */ {

		constructor : function() {
			BaseObject.call(this);
			Log.error(
				"Configuration is designed as a singleton and should not be created manually! " +
				"Please require 'sap/ui/core/Configuration' instead and use the module export directly without using 'new'."
			);

			return Configuration;
		}

	});

	Object.assign(Configuration, /** @lends sap.ui.core.Configuration */ {
		/**
		 * Returns the version of the framework.
		 *
		 * Similar to <code>sap.ui.version</code>.
		 *
		 * @return {module:sap/base/util/Version} the version
		 * @public
		 * @deprecated As of Version 1.120. Please use the async {@link module:sap/ui/VersionInfo.load VersionInfo.load} instead.
		 */
		getVersion: function () {
			return oVersion;
		},

		getCompatibilityVersion : getCompatibilityVersion,

		/**
		 * Returns the theme name
		 * @return {string} the theme name
		 * @function
		 * @public
		 * @deprecated Since 1.119. Please use {@link module:sap/ui/core/Theming.getTheme Theming.getTheme} instead.
		 */
		getTheme : Theming.getTheme,

		/**
		 * Allows setting the theme name
		 * @param {string} sTheme the theme name
		 * @return {this} <code>this</code> to allow method chaining
		 * @public
		 * @deprecated Since 1.119. Please use {@link module:sap/ui/core/Theming.setTheme Theming.setTheme} instead.
		 */
		setTheme : function (sTheme) {
			Theming.setTheme(sTheme);
			return this;
		},

		/**
		 * Returns a string that identifies the current language.
		 *
		 * The value returned by config method in most cases corresponds to the exact value that has been
		 * configured by the user or application or that has been determined from the user agent settings.
		 * It has not been normalized, but has been validated against a relaxed version of
		 * {@link http://www.ietf.org/rfc/bcp/bcp47.txt BCP47}, allowing underscores ('_') instead of the
		 * suggested dashes ('-') and not taking the case of letters into account.
		 *
		 * The exceptions mentioned above affect languages that have been specified via the URL parameter
		 * <code>sap-language</code>. That parameter by definition represents an SAP logon language code
		 * ('ABAP language'). Most but not all of these language codes are valid ISO639 two-letter languages
		 * and as such are valid BCP47 language tags. For better BCP47 compliance, the framework
		 * maps the following non-BCP47 SAP logon codes to a BCP47 substitute:
		 * <pre>
		 *    "ZH"  -->  "zh-Hans"         // script 'Hans' added to distinguish it from zh-Hant
		 *    "ZF"  -->  "zh-Hant"         // ZF is not a valid ISO639 code, use the compliant language + script 'Hant'
		 *    "1Q"  -->  "en-US-x-saptrc"  // special language code for supportability (tracing),
		 *                                    represented as en-US with a private extension
		 *    "2Q"  -->  "en-US-x-sappsd"  // special language code for supportability (pseudo translation),
		 *                                    represented as en-US with a private extension
		 *    "3Q"  -->  "en-US-x-saprigi" // special language code for the Rigi pseudo language,
		 *                                    represented as en-US with a private extension
		 * </pre>
		 *
		 * For a normalized BCP47 tag, call {@link #.getLanguageTag Configuration.getLanguageTag} or call
		 * {@link #.getLocale Configuration.getLocale} to get a {@link sap.ui.core.Locale Locale} object matching
		 * the language.
		 *
		 * @return {string} Language string as configured
		 * @function
		 * @public
		 * @deprecated Since 1.119. Please use {@link module:sap/base/i18n/Localization.getLanguage Localization.getLanguage} instead.
		 */
		getLanguage :  Localization.getLanguage,


		/**
		 * Sets a new language to be used from now on for language/region dependent
		 * functionality (e.g. formatting, data types, translated texts, ...).
		 *
		 * When the language can't be interpreted as a BCP47 language (using the relaxed syntax
		 * described in {@link #.getLanguage Configuration.getLanguage}, an error will be thrown.
		 *
		 * When the language has changed, the Core will fire its
		 * {@link sap.ui.core.Core#event:localizationChanged localizationChanged} event.
		 *
		 *
		 * <h3>Restrictions</h3>
		 *
		 * The framework <strong>does not</strong> guarantee that already created, language
		 * dependent objects will be updated by config call. It therefore remains best practice
		 * for applications to switch the language early, e.g. before any language dependent
		 * objects are created. Applications that need to support more dynamic changes of
		 * the language should listen to the <code>localizationChanged</code> event and adapt
		 * all language dependent objects that they use (e.g. by rebuilding their UI).
		 *
		 * Currently, the framework notifies the following objects about a change of the
		 * localization settings before it fires the <code>localizationChanged</code> event:
		 *
		 * <ul>
		 * <li>date and number data types that are used in property bindings or composite
		 *     bindings in existing Elements, Controls, UIAreas or Components</li>
		 * <li>ResourceModels currently assigned to the Core, a UIArea, Component,
		 *     Element or Control</li>
		 * <li>Elements or Controls that implement the <code>onLocalizationChanged</code> hook</li>
		 * </ul>
		 *
		 * It furthermore derives the RTL mode from the new language, if no explicit RTL
		 * mode has been set. If the RTL mode changes, the following additional actions will be taken:
		 *
		 * <ul>
		 * <li>the URLs of already loaded library theme files will be changed</li>
		 * <li>the <code>dir</code> attribute of the page will be changed to reflect the new mode.</li>
		 * <li>all UIAreas will be invalidated (which results in a rendering of the whole UI5 UI)</li>
		 * </ul>
		 *
		 * config method does not accept SAP language codes for <code>sLanguage</code>. Instead, a second
		 * parameter <code>sSAPLogonLanguage</code> can be provided with an SAP language code corresponding
		 * to the given language. A given value will be returned by the {@link #.getSAPLogonLanguage
		 * Configuration.getSAPLogonLanguage} method.
		 * It is up to the caller to provide a consistent pair of BCP47 language and SAP language code.
		 * The SAP language code is only checked to be of length 2 and must consist of letters or digits only.
		 *
		 * <b>Note</b>: When using config method please take note of and respect the above mentioned restrictions.
		 *
		 * @param {string} sLanguage the new language as a BCP47 compliant language tag; case doesn't matter
		 *   and underscores can be used instead of dashes to separate components (compatibility with Java Locale IDs)
		 * @param {string} [sSAPLogonLanguage] SAP language code that corresponds to the <code>sLanguage</code>;
		 *   if a value is specified, future calls to <code>getSAPLogonLanguage</code> will return that value;
		 *   if no value is specified, the framework will use the ISO639 language part of <code>sLanguage</code>
		 *   as SAP Logon language.
		 * @throws {Error} When <code>sLanguage</code> can't be interpreted as a BCP47 language or when
		 *   <code>sSAPLanguage</code> is given and can't be interpreted as SAP language code.
		 * @return {this} <code>this</code> to allow method chaining
		 *
		 * @see http://scn.sap.com/docs/DOC-14377
		 * @function
		 * @public
		 * @deprecated As of Version 1.119. Please use {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage} instead.
		 */
		setLanguage : function() {
			Localization.setLanguage.apply(Localization, arguments);
			return Configuration;
		},

		/**
		 * Returns a BCP47-compliant language tag for the current language.
		 *
		 * The return value of config method is especially useful for an HTTP <code>Accept-Language</code> header.
		 *
		 * Retrieves the modern locale,
		 * e.g. sr-Latn (Serbian (Latin)), he (Hebrew), yi (Yiddish)
		 *
		 * @returns {string} The language tag for the current language, conforming to BCP47
		 * @function
		 * @public
		 * @deprecated As of Version 1.119. Please use {@link module:sap/base/i18n/Localization.getLanguageTag Localization.getLanguageTag} instead.
		 */
		getLanguageTag : function () {
			return Localization.getLanguageTag().toString();
		},

		/**
		 * Returns an SAP logon language for the current language.
		 *
		 * It will be returned in uppercase.
		 * e.g. "EN", "DE"
		 *
		 * @returns {string} The SAP logon language code for the current language
		 * @function
		 * @public
		 * @deprecated As of Version 1.119. Please use {@link module:sap/base/i18n/Localization.getSAPLogonLanguage Localization.getSAPLogonLanguage} instead.
		 */
		getSAPLogonLanguage : Localization.getSAPLogonLanguage,

		/**
		 * Retrieves the configured IANA timezone ID.
		 *
		 * @returns {string} The configured IANA timezone ID, e.g. "America/New_York"
		 * @function
		 * @public
		 * @deprecated As of Version 1.119. Please use {@link module:sap/base/i18n/Localization.getTimezone Localization.getTimezone} instead.
		 */
		getTimezone : Localization.getTimezone,

		/**
		 * Sets the timezone such that all date and time based calculations use config timezone.
		 *
		 * <b>Important:</b> It is strongly recommended to only use config API at the earliest point
		 * of time while initializing a UI5 app. A later adjustment of the time zone should be
		 * avoided. It can lead to unexpected data inconsistencies in a running application,
		 * because date objects could still be related to a previously configured time zone.
		 * Instead, the app should be completely restarted with the new time zone.
		 * For more information, see
		 * {@link topic:6c9e61dc157a40c19460660ece8368bc Dates, Times, Timestamps, and Time Zones}.
		 *
		 * When the timezone has changed, the Core will fire its
		 * {@link sap.ui.core.Core#event:localizationChanged localizationChanged} event.
		 *
		 * @param {string|null} [sTimezone] IANA timezone ID, e.g. "America/New_York". Use <code>null</code> to reset the timezone to the browser's local timezone.
		 *   An invalid IANA timezone ID will fall back to the browser's timezone.
		 * @function
		 * @public
		 * @return {this} <code>this</code> to allow method chaining
		 * @since 1.99.0
		 * @deprecated As of Version 1.119. Please use {@link module:sap/base/i18n/Localization.setTimezone Localization.setTimezone} instead.
		 */
		setTimezone : function() {
			Localization.setTimezone.apply(Localization, arguments);
			return Configuration;
		},

		/**
		 * Returns the calendar type which is being used in locale dependent functionality.
		 *
		 * When it's explicitly set by calling <code>setCalendar</code>, the set calendar type is returned.
		 * Otherwise, the calendar type is determined by checking the format settings and current locale.
		 *
		 * @return {sap.ui.core.CalendarType} the current calendar type, e.g. <code>Gregorian</code>
		 * @since 1.28.6
		 * @function
		 * @public
		 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting.getCalendarType Formatting.getCalendarType} instead.
		 */
		getCalendarType: Formatting.getCalendarType,

		/**
		 * Returns the calendar week numbering algorithm used to determine the first day of the week
		 * and the first calendar week of the year, see {@link sap.ui.core.date.CalendarWeekNumbering}.
		 *
		 * @returns {sap.ui.core.date.CalendarWeekNumbering} The calendar week numbering algorithm
		 * @function
		 * @public
		 * @since 1.113.0
		 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting.getCalendarWeekNumbering Formatting.getCalendarWeekNumbering} instead.
		 */
		getCalendarWeekNumbering: Formatting.getCalendarWeekNumbering,

		/**
		 * Returns whether the page uses the RTL text direction.
		 *
		 * If no mode has been explicitly set (neither <code>true</code> nor <code>false</code>),
		 * the mode is derived from the current language setting.
		 *
		 * @returns {boolean} whether the page uses the RTL text direction
		 * @function
		 * @public
		 * @deprecated As of Version 1.119. Please use {@link module:sap/base/i18n/Localization.getRTL Localization.getRTL} instead.
		 */
		getRTL :Localization.getRTL,

		/**
		 * Sets the character orientation mode to be used from now on.
		 *
		 * Can either be set to a concrete value (true meaning right-to-left,
		 * false meaning left-to-right) or to <code>null</code> which means that
		 * the character orientation mode should be derived from the current
		 * language (incl. region) setting.
		 *
		 * After changing the character orientation mode, the framework tries
		 * to update localization specific parts of the UI. See the documentation of
		 * {@link #.setLanguage} for details and restrictions.
		 *
		 * <b>Note</b>: See documentation of {@link #.setLanguage} for restrictions.
		 *
		 * @param {boolean|null} bRTL new character orientation mode or <code>null</code>
		 * @returns {this} <code>this</code> to allow method chaining
		 * @function
		 * @public
		 * @deprecated As of Version 1.119. Please use {@link module:sap/base/i18n/Localization.setRTL Localization.setRTL} instead.
		 */
		setRTL : function() {
			Localization.setRTL.apply(Localization, arguments);
			return Configuration;
		},

		/**
		 * Returns a Locale object for the current language.
		 *
		 * The Locale is derived from the {@link #.getLanguage language} property.
		 *
		 * @return {sap.ui.core.Locale} The locale
		 * @public
		 * @deprecated As of Version 1.119. Please use {@link module:sap/base/i18n/Localization.getLanguageTag Localization.getLanguageTag} instead.
		 */
		getLocale : function() {
			var oLanguageTag = Localization.getLanguageTag();
			return Locale._getCoreLocale(oLanguageTag);
		},

		/**
		 * Sets the new calendar type to be used from now on in locale dependent functionality (for example,
		 * formatting, translation texts, etc.).
		 *
		 * @param {sap.ui.core.CalendarType|null} sCalendarType the new calendar type. Set it with null to clear the calendar type
		 *   and the calendar type is calculated based on the format settings and current locale.
		 * @return {this} <code>this</code> to allow method chaining
		 * @public
		 * @since 1.28.6
		 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting.setCalendarType Formatting.setCalendarType} instead.
		 */
		setCalendarType : function(sCalendarType) {
			Formatting.setCalendarType.apply(Formatting, arguments);
			return this;
		},

		/**
		 * Sets the calendar week numbering algorithm which is used to determine the first day of the week
		 * and the first calendar week of the year, see {@link sap.ui.core.date.CalendarWeekNumbering}.
		 *
		 * @param {sap.ui.core.date.CalendarWeekNumbering} sCalendarWeekNumbering
		 *   The calendar week numbering algorithm
		 * @returns {this}
		 *   <code>this</code> to allow method chaining
		 * @throws {Error}
		 *   If <code>sCalendarWeekNumbering</code> is not a valid calendar week numbering algorithm,
		 *   defined in {@link sap.ui.core.date.CalendarWeekNumbering}
		 *
		 * @public
		 * @since 1.113.0
		 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting.setCalendarWeekNumbering Formatting.setCalendarWeekNumbering} instead.
		 */
		setCalendarWeekNumbering: function(sCalendarWeekNumbering) {
			Formatting.setCalendarWeekNumbering.apply(Formatting, arguments);
			return this;
		},

		/**
		 * Returns the format locale string with language and region code. Falls back to
		 * language configuration, in case it has not been explicitly defined.
		 *
		 * @return {string} the format locale string with language and country code
		 * @public
		 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting.getLanguageTag Formatting.getLanguageTag} instead.
		 */
		getFormatLocale : function() {
			return Formatting.getLanguageTag().toString();
		},

		/**
		 * Sets a new format locale to be used from now on for retrieving locale
		 * specific formatters. Modifying this setting does not have an impact on
		 * the retrieval of translated texts!
		 *
		 * Can either be set to a concrete value (a BCP47 or Java locale compliant
		 * language tag) or to <code>null</code>. When set to <code>null</code> (default
		 * value) then locale specific formatters are retrieved for the current language.
		 *
		 * After changing the format locale, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link #.setLanguage} for
		 * details and restrictions.
		 *
		 * <b>Note</b>: When a format locale is set, it has higher priority than a number,
		 * date or time format defined with a call to <code>setLegacyNumberFormat</code>,
		 * <code>setLegacyDateFormat</code> or <code>setLegacyTimeFormat</code>.
		 *
		 * <b>Note</b>: See documentation of {@link #.setLanguage} for restrictions.
		 *
		 * @param {string|null} sFormatLocale the new format locale as a BCP47 compliant language tag;
		 *   case doesn't matter and underscores can be used instead of dashes to separate
		 *   components (compatibility with Java Locale IDs)
		 * @return {this} <code>this</code> to allow method chaining
		 * @public
		 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting.setLanguageTag Formatting.setLanguageTag} instead.
		 * @throws {Error} When <code>sFormatLocale</code> is given, but is not a valid BCP47 language
		 *   tag or Java locale identifier
		 */
		setFormatLocale : function(sFormatLocale) {
			Formatting.setLanguageTag.apply(Formatting, arguments);
			return this;
		},

		getLanguagesDeliveredWithCore : Localization.getLanguagesDeliveredWithCore,

		getSupportedLanguages : Localization.getSupportedLanguages,

		/**
		 * Returns whether the accessibility mode is enabled or not.
		 * @return {boolean} whether the accessibility mode is enabled or not
		 * @public
		 * @since 1.20
		 * @function
		 * @deprecated As of Version 1.120. Please use {@link module:sap/ui/core/ControlBehavior.isAccessibilityEnabled ControlBehavior.isAccessibilityEnabled} instead.
		 */
		getAccessibility : ControlBehavior.isAccessibilityEnabled,

		/**
		 * Returns whether the framework automatically adds
		 * the ARIA role 'application' to the HTML body or not.
		 * @return {boolean} Wether the ARIA role 'application' should be added to the HTML body or not
		 * @since 1.27.0
		 * @public
		 * @deprecated As of version 1.120, without a replacement. Was only used in the implementation
		 *   of the framework itself.
		 */
		getAutoAriaBodyRole : function () {
			return BaseConfig.get({ name: "sapUiAutoAriaBodyRole", type: BaseConfig.Type.Boolean });
		},

		/**
		 * Returns whether the animations are globally used.
		 * @return {boolean} whether the animations are globally used
		 * @public
		 * @deprecated As of version 1.50. Since 1.20, please use {@link module:sap/ui/core/ControlBehavior.getAnimationMode ControlBehavior.getAnimationMode} instead.
		 */
		getAnimation : function () {
			var sAnimationMode = Configuration.getAnimationMode();
			// Set the animation to on or off depending on the animation mode to ensure backward compatibility.
			return (sAnimationMode !== Configuration.AnimationMode.minimal && sAnimationMode !== Configuration.AnimationMode.none);
		},

		/**
		 * Returns the current animation mode.
		 *
		 * @return {sap.ui.core.Configuration.AnimationMode} The current animationMode
		 * @since 1.50.0
		 * @function
		 * @public
		 * @deprecated As of Version 1.120. Please use {@link module:sap/ui/core/ControlBehavior.getAnimationMode ControlBehavior.getAnimationMode} instead.
		 */
		getAnimationMode : ControlBehavior.getAnimationMode,

		/**
		 * Sets the current animation mode.
		 *
		 * Expects an animation mode as string and validates it. If a wrong animation mode was set, an error is
		 * thrown. If the mode is valid it is set, then the attributes <code>data-sap-ui-animation</code> and
		 * <code>data-sap-ui-animation-mode</code> of the HTML document root element are also updated.
		 * If the <code>animationMode</code> is <code>Configuration.AnimationMode.none</code> the old
		 * <code>animation</code> property is set to <code>false</code>, otherwise it is set to <code>true</code>.
		 *
		 * @param {sap.ui.core.Configuration.AnimationMode} sAnimationMode A valid animation mode
		 * @throws {Error} If the provided <code>sAnimationMode</code> does not exist, an error is thrown
		 * @since 1.50.0
		 * @function
		 * @public
		 * @deprecated As of Version 1.120. Please use {@link module:sap/ui/core/ControlBehavior.setAnimationMode ControlBehavior.setAnimationMode} instead.
		 */
		setAnimationMode : ControlBehavior.setAnimationMode,

		/**
		 * Returns whether the Fiori2Adaptation is on.
		 * @return {boolean|string} false - no adaptation, true - full adaptation, comma-separated list - partial adaptation
		 * Possible values: style, collapse, title, back, hierarchy
		 * @public
		 * @deprecated As of version 1.120, without a replacement. All the Fiori 2.0 adaptation logic
		 *   is handled by the framework, there should be no need for apps to know about it.
		 */
		getFiori2Adaptation : function () {
			var aAdaptations = BaseConfig.get({
					name: "sapUiXxFiori2Adaptation",
					type: BaseConfig.Type.StringArray,
					external: true
				}),
				bAdaptationEnabled;
			//parse fiori 2 adaptation parameters
			if ( aAdaptations.length === 0 || (aAdaptations.length === 1 && aAdaptations[0] === 'false') ) {
				bAdaptationEnabled = false;
			} else if ( aAdaptations.length === 1 && aAdaptations[0] === 'true' ) {
				bAdaptationEnabled = true;
			}

			return bAdaptationEnabled === undefined ? aAdaptations : bAdaptationEnabled;
		},

		/**
		 * Returns whether the page runs in full debug mode.
		 * @returns {boolean} Whether the page runs in full debug mode
		 * @public
		 * @function
		 * @deprecated As of version 1.120, without a replacement. All debug mode
		 *   functionality is implemented within the framework and should be transparent
		 *   for application code. There's no need for a public accessor method.
		 */
		getDebug : Supportability.isDebugModeEnabled,

		/**
		 * Returns whether the UI5 control inspector is displayed.
		 *
		 * Has only an effect when the sap-ui-debug module has been loaded.
		 *
		 * @return {boolean} whether the UI5 control inspector is displayed
		 * @public
		 * @function
		 * @deprecated As of version 1.120, without a replacement. The inspect option
		 *   is related to the very old sap-ui-debug module. As there are now much better
		 *   development tools (e.g. the UI5 Inpsector browser extension), this option
		 *   has been deprecated and the sap-ui-debug feature might be removed in future
		 *   major versions of UI5.
		 */
		getInspect : Supportability.isControlInspectorEnabled,

		/**
		 * Returns whether the text origin information is collected.
		 *
		 * @return {boolean} whether the text info is collected
		 * @public
		 * @function
		 * @deprecated As of version 1.120. The origin info was intended as a mean to track
		 *   down translation issues to the origin of a translated text. Meanwhile, with the
		 *   pseudo logon language 3Q, a similar, more lightweight feature exists for use with
		 *   OpenUI5 or SAPUI5 libraries.
		 */
		getOriginInfo : Supportability.collectOriginInfo,

		/**
		 * Returns whether there should be an exception on any duplicate element IDs.
		 *
		 * @return {boolean} whether there should be an exception on any duplicate element IDs
		 * @public
		 * @deprecated As of version 1.120, without a replacement. Future major versions of UI5 will
		 *   always report duplicate IDs as an error as the framework heavily relies on their uniqueness.
		 */
		getNoDuplicateIds : function () {
			return BaseConfig.get({ name: "sapUiNoDuplicateIds", type: BaseConfig.Type.Boolean, defaultValue: true, external: true });
		},

		/**
		 * Prefix to be used for automatically generated control IDs.
		 * Default is a double underscore "__".
		 *
		 * @returns {string} the prefix to be used
		 * @public
		 * @deprecated As of Version 1.119. Please use {@link sap.ui.base.ManagedObjectMetadata.getUIDPrefix ManagedObjectMetadata.getUIDPrefix} instead.
		 */
		getUIDPrefix : function() {
			var ManagedObjectMetadata = sap.ui.require("sap/ui/base/ManagedObjectMetadata");
			return ManagedObjectMetadata.getUIDPrefix();
		},

		/**
		 * Return whether the design mode is active or not.
		 *
		 * @returns {boolean} whether the design mode is active or not.
		 * @since 1.13.2
		 * @private
		 * @ui5-restricted sap.ui.core.Core, sap.watt, com.sap.webide, sap.ui.fl, sap.ui.rta, sap.ui.comp, SAP Business Application Studio
		 * @deprecated As of Version 1.120
		 */
		getDesignMode : DesignTime.isDesignModeEnabled,

		/**
		 * Return whether the activation of the controller code is suppressed.
		 *
		 * @returns {boolean} whether the activation of the controller code is suppressed or not
		 * @since 1.13.2
		 * @private
		 * @ui5-restricted sap.watt, com.sap.webide
		 * @deprecated As of Version 1.120
		 */
		getSuppressDeactivationOfControllerCode : DesignTime.isControllerCodeDeactivationSuppressed,

		/**
		 * Return whether the controller code is deactivated. During design mode the.
		 *
		 * @returns {boolean} whether the activation of the controller code is suppressed or not
		 * @since 1.26.4
		 * @private
		 * @ui5-restricted sap.watt, com.sap.webide
		 * @deprecated As of Version 1.120
		 */
		getControllerCodeDeactivated : DesignTime.isControllerCodeDeactivated,

		/**
		 * The name of the application to start or empty.
		 *
		 * @returns {string} name of the application
		 * @public
		 * @deprecated As of Version 1.15.1. Please use {@link module:sap/ui/core/ComponentSupport ComponentSupport} instead. See also {@link topic:82a0fcecc3cb427c91469bc537ebdddf Declarative API for Initial Components}.
		 */
		getApplication : function() {
			return BaseConfig.get({ name: "sapUiApplication", type: BaseConfig.Type.String, external: true });
		},

		/**
		 * The name of the root component to start or empty.
		 *
		 * @returns {string} name of the root component
		 * @public
		 * @deprecated As of Version 1.95. Please use {@link module:sap/ui/core/ComponentSupport ComponentSupport} instead. See also {@link topic:82a0fcecc3cb427c91469bc537ebdddf Declarative API for Initial Components}.
		 */
		getRootComponent : function() {
			return BaseConfig.get({ name: "sapUiRootComponent", type: BaseConfig.Type.String });
		},

		/**
		 * Base URLs to AppCacheBuster ETag-Index files.
		 *
		 * @returns {string[]} array of base URLs
		 * @public
		 * @deprecated As of version 1.120, without a replacement. Was only used within the implementation
		 *   of the <code>AppCacheBuster</code>.
		 */
		getAppCacheBuster : function() {
			return BaseConfig.get({name: "sapUiAppCacheBuster", type: BaseConfig.Type.StringArray, external: true, freeze: true});
		},

		/**
		 * The loading mode (sync|async|batch) of the AppCacheBuster (sync is default)
		 *
		 * @returns {string} "sync" | "async" | "batch"
		 * @public
		 * @deprecated As of version 1.120, without a replacement. Was only used within the implementation
		 *   of the <code>AppCacheBuster</code>.
		 */
		getAppCacheBusterMode : function() {
			return BaseConfig.get({name: "sapUiXxAppCacheBusterMode", type: BaseConfig.Type.String, defaultValue: "sync", external: true, freeze: true});
		},

		/**
		 * Flag, whether the customizing is disabled or not.
		 *
		 * @returns {boolean} true if customizing is disabled
		 * @private
		 * @ui5-restricted
		 * @deprecated As of version 1.120, without a replacement.
		 */
		getDisableCustomizing : function() {
			return BaseConfig.get({name: "sapUiXxDisableCustomizing", type: BaseConfig.Type.Boolean});
		},

		/**
		 * Flag whether a Component should load the manifest first.
		 *
		 * @returns {boolean} true if a Component should load the manifest first
		 * @public
		 * @since 1.33.0
		 * @deprecated As of Version 1.120. 'manifest-first' is the default for the {@link sap.ui.core.Component.create Component.create} factory.
		 */
		getManifestFirst : function() {
			return BaseConfig.get({name: "sapUiManifestFirst", type: BaseConfig.Type.Boolean, external: true});
		},

		/**
		 * Returns the URL from where the UI5 flexibility services are called;
		 * if empty, the flexibility services are not called.
		 *
		 * @returns {object[]} Flexibility services configuration
		 * @public
		 * @since 1.60.0
		 * @deprecated As of version 1.120, without a replacement. Was only used by the Flexibility
		 *   feature which now resolves this on its own.
		 */
		getFlexibilityServices : function() {
			var FlexConfig = sap.ui.require("sap/ui/fl/initial/_internal/FlexConfiguration");
			var vFlexibilityServices;
			if (FlexConfig) {
				vFlexibilityServices = FlexConfig.getFlexibilityServices();
			} else {
				const aDefaultValue = [{
					url: "/sap/bc/lrep",
					connector: "LrepConnector"
				}];
				vFlexibilityServices = BaseConfig.get({
					name: "sapUiFlexibilityServices",
					type: (value) => {
						if (value && typeof value === "string") {
							if (value[0] === "/") {
								aDefaultValue[0].url = value;
								value = aDefaultValue;
							} else {
								value = JSON.parse(value);
							}
						}
						return value || [];
					},
					defaultValue: aDefaultValue,
					external: true
				});
			}
			return vFlexibilityServices;
		},

		/**
		 * Returns a configuration object that bundles the format settings of UI5.
		 *
		 * @returns {sap.ui.core.Configuration.FormatSettings} A FormatSettings object.
		 * @public
		 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting Formatting} instead.
		 */
		getFormatSettings : function() {
			return oFormatSettings;
		},

		/**
		 * frameOptions mode (allow/deny/trusted).
		 *
		 * @return {string} frameOptions mode
		 * @public
		 * @function
		 * @deprecated As of Version 1.120. Please use {@link module:sap/ui/security/Security.getFrameOptions Security.getFrameOptions} instead.
		 */
		getFrameOptions : Security.getFrameOptions,

		/**
		 * URL of the whitelist service.
		 *
		 * @return {string} whitelist service URL
		 * @public
		 * @function
		 * @deprecated As of Version 1.85. Use {@link module:sap/ui/security/Security.getAllowlistService Security.getAllowlistService} instead.
		 * SAP strives to replace insensitive terms with inclusive language.
		 * Since APIs cannot be renamed or immediately removed for compatibility reasons, this API has been deprecated.
		 */
		getWhitelistService : Security.getAllowlistService,

		/**
		 * URL of the allowlist service.
		 *
		 * @return {string} allowlist service URL
		 * @public
		 * @function
		 * @deprecated As of Version 1.120. Please use {@link module:sap/ui/security/Security.getAllowlistService Security.getAllowlistService} instead.
		 */
		getAllowlistService : Security.getAllowlistService,

		/**
		 * Name (ID) of a UI5 module that implements file share support.
		 *
		 * If no implementation is known, <code>undefined</code> is returned.
		 *
		 * The contract of the module is not defined by the configuration API.
		 *
		 * @returns {string|undefined} Module name (ID) of a file share support module
		 * @public
		 * @since 1.102
		 * @deprecated As of version 1.120, without a replacement. The configuration is only
		 *    relevant for the <code>sap.ui.export</code> library.
		 */
		getFileShareSupport : function() {
			return BaseConfig.get({
				name: "sapUiFileShareSupport",
				type: BaseConfig.Type.String,
				defaultValue: undefined
			});
		},

		/**
		 * Flag if statistics are requested.
		 *
		 * Flag set by TechnicalInfo Popup will also be checked
		 * So its active if set by URL parameter or by TechnicalInfo property
		 *
		 * @returns {boolean} statistics flag
		 * @private
		 * @function
		 * @since 1.20.0
		 * @deprecated As of Version 1.106. Renamed for clarity, use {@link sap.ui.core.Configuration.getStatisticsEnabled Configuration.getStatisticsEnabled} instead.
		 */
		getStatistics : Configuration.getStatisticsEnabled,

		/**
		 * Flag if statistics are requested.
		 *
		 * Flag set by TechnicalInfo Popup will also be checked.
		 * So it's active if set by URL parameter or manually via TechnicalInfo.
		 *
		 * @returns {boolean} Whether statistics are enabled
		 * @public
		 * @since 1.106.0
		 * @function
		 * @deprecated As of version 1.120, without a replacment. The configuration is only relevant
		 *    within the framework.
		 */
		getStatisticsEnabled : Supportability.isStatisticsEnabled,

		/**
		 * Return whether native scrolling should be suppressed on touch devices.
		 *
		 * @returns {boolean} whether native scrolling is suppressed on touch devices
		 * @since 1.20.0
		 * @deprecated As of Version 1.26.0. Always use native scrolling.
		 * @private
		 */
		getNoNativeScroll : function() {
			return false;
		},

		/**
		 * Returns the list of active terminologies defined via the Configuration.
		 *
		 * @returns {string[]|undefined} if no active terminologies are set, the default value <code>undefined</code> is returned.
		 * @since 1.77.0
		 * @public
		 * @function
		 * @deprecated As of Version 1.118. Please use {@link module:sap/base/i18n/Localization.getActiveTerminologies Localization.getActiveTerminologies} instead.
		 */
		getActiveTerminologies : Localization.getActiveTerminologies,

		/**
		 * Returns the security token handlers of an OData V4 model.
		 *
		 * @returns {Array<function(sap.ui.core.URI):Promise>} the security token handlers (an empty array if there are none)
		 * @public
		 * @function
		 * @deprecated As of Version 1.120. Please use {@link module:sap/ui/security/Security.getSecurityTokenHandlers Security.getSecurityTokenHandlers} instead.
		 * @see {@link #.setSecurityTokenHandlers}
		 */
		getSecurityTokenHandlers : Security.getSecurityTokenHandlers,

		/**
		 * Sets the security token handlers for an OData V4 model. See chapter
		 * {@link topic:9613f1f2d88747cab21896f7216afdac/section_STH Security Token Handling}.
		 *
		 * @param {Array<function(sap.ui.core.URI):Promise>} aSecurityTokenHandlers - The security token handlers
		 * @public
		 * @function
		 * @deprecated As of Version 1.120. Please use {@link module:sap/ui/security/Security.setSecurityTokenHandlers Security.setSecurityTokenHandlers} instead.
		 * @see {@link #.getSecurityTokenHandlers}
		 */
		setSecurityTokenHandlers : Security.setSecurityTokenHandlers,

		/**
		 * Applies multiple changes to the configuration at once.
		 *
		 * If the changed settings contain localization related settings like <code>language</code>
		 * or <ode>calendarType</code>, then only a single <code>localizationChanged</code> event will
		 * be fired. As the framework has to inform all existing components, elements, models etc.
		 * about localization changes, using <code>applySettings</code> can significantly reduce the
		 * overhead for multiple changes, esp. when they occur after the UI has been created already.
		 *
		 * The <code>mSettings</code> can contain any property <code><i>xyz</i></code> for which a
		 * setter method <code>set<i>XYZ</i></code> exists in the API of this class.
		 * Similarly, values for the {@link sap.ui.core.Configuration.FormatSettings format settings}
		 * API can be provided in a nested object with name <code>formatSettings</code>.
		 *
		 *
		 * @example <caption>Apply <code>language</code>, <code>calendarType</code> and several legacy
		 *          format settings in one call</caption>
		 *
		 * sap.ui.getCore().getConfiguration().applySettings({
		 *     language: 'de',
		 *     calendarType: sap.ui.core.CalendarType.Gregorian,
		 *     formatSettings: {
		 *         legacyDateFormat: '1',
		 *         legacyTimeFormat: '1',
		 *         legacyNumberFormat: '1'
		 *     }
		 * });
		 *
		 * @param {object} mSettings Configuration options to apply
		 * @returns {this} Returns <code>this</code> to allow method chaining
		 * @public
		 * @since 1.38.6
		 * @deprecated As of version 1.120, without a replacement. As the different settings have been
		 *   spread across multiple new APIs (see {@link sap.ui.core.Configuration the deprecation hint
		 *   for this class}), a common API for changing multiple settings no longer made sense.
		 *
		 *   Please check the individual methods of this class for their replacements and call those
		 *   replacement methods one by one.
		 */
		applySettings: function(mSettings) {

			function applyAll(ctx, m) {
				var sName, sMethod;
				for ( sName in m ) {
					sMethod = "set" + sName.slice(0,1).toUpperCase() + sName.slice(1);
					if ( sName === 'formatSettings' && oFormatSettings ) {
						applyAll(oFormatSettings, m[sName]);
					} else if ( typeof ctx[sMethod] === 'function' ) {
						ctx[sMethod](m[sName]);
					} else {
						Log.warning("Configuration.applySettings: unknown setting '" + sName + "' ignored");
					}
				}
			}

			assert(typeof mSettings === 'object', "mSettings must be an object");

			_collect(); // block events
			applyAll(Configuration, mSettings);
			_endCollect(); // might fire localizationChanged

			return this;
		},

		/**
		 * Function to pass core instance to configuration. Should be only used by core constructor.
		 *
		 * @param {sap.ui.core.Core} oCore Instance of 'real' core
		 *
		 * @private
	 	 * @ui5-restricted sap.ui.core.Core
		 * @deprecated As of version 1.120, without a replacement.
		 */
		setCore: function (oCore) {
			// Setting the core needs to happen before init
			// because getValue relies on oCore and is used in init
			Core = oCore;
		}
	});

	/**
	 * Enumerable list with available animation modes.
	 *
	 * This enumerable is used to validate the animation mode. Animation modes allow to specify
	 * different animation scenarios or levels. The implementation of the Control (JavaScript or CSS)
	 * has to be done differently for each animation mode.
	 *
	 * @enum {string}
	 * @name sap.ui.core.Configuration.AnimationMode
	 * @since 1.50.0
	 * @public
	 * @deprecated As of Version 1.120. Please use module {@link module:sap/ui/core/AnimationMode AnimationMode} instead.
	 */

	/**
	 * <code>full</code> represents a mode with unrestricted animation capabilities.
	 * @public
	 * @name sap.ui.core.Configuration.AnimationMode.full
	 * @member
	 */

	/**
	 * <code>basic</code> can be used for a reduced, more light-weight set of animations.
	 * @public
	 * @name sap.ui.core.Configuration.AnimationMode.basic
	 * @member
	 */

	/**
	 * <code>minimal</code> includes animations of fundamental functionality.
	 * @public
	 * @name sap.ui.core.Configuration.AnimationMode.minimal
	 * @member
	 */

	/**
	 * <code>none</code> deactivates the animation completely.
	 * @public
	 * @name sap.ui.core.Configuration.AnimationMode.none
	 * @member
	 */
	Configuration.AnimationMode = AnimationMode;

	function check(bCondition, sMessage) {
		if ( !bCondition ) {
			throw new Error(sMessage);
		}
	}

	/**
	 * @class Encapsulates configuration settings that are related to data formatting/parsing.
	 *
	 * <b>Note:</b> When format configuration settings are modified through this class,
	 * UI5 only ensures that formatter objects created after that point in time will honor
	 * the modifications. To be on the safe side, applications should do any modifications
	 * early in their lifecycle or recreate any model/UI that is locale dependent.
	 *
	 * @alias sap.ui.core.Configuration.FormatSettings
	 * @extends sap.ui.base.Object
	 * @public
	 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting Formatting} instead.
	 * @borrows module:sap/base/i18n/Formatting.getCustomUnits as #getCustomUnits
	 * @borrows module:sap/base/i18n/Formatting.setCustomUnits as #setCustomUnits
	 * @borrows module:sap/base/i18n/Formatting.addCustomUnits as #addCustomUnits
	 * @borrows module:sap/base/i18n/Formatting.getUnitMappings as #getUnitMappings
	 * @borrows module:sap/base/i18n/Formatting.setUnitMappings as #setUnitMappings
	 * @borrows module:sap/base/i18n/Formatting.addUnitMappings as #addUnitMappings
	 * @borrows module:sap/base/i18n/Formatting.getDatePattern as #getDatePattern
	 * @borrows module:sap/base/i18n/Formatting.getTimePattern as #getTimePattern
	 * @borrows module:sap/base/i18n/Formatting.getNumberSymbol as #getNumberSymbol
	 * @borrows module:sap/base/i18n/Formatting.getCustomCurrencies as #getCustomCurrencies
	 * @borrows module:sap/base/i18n/Formatting.setCustomCurrencies as #setCustomCurrencies
	 * @borrows module:sap/base/i18n/Formatting.addCustomCurrencies as #addCustomCurrencies
	 * @borrows module:sap/base/i18n/Formatting.getLegacyDateFormat as #getLegacyDateFormat
	 * @borrows module:sap/base/i18n/Formatting.getLegacyTimeFormat as #getLegacyTimeFormat
	 * @borrows module:sap/base/i18n/Formatting.getLegacyNumberFormat as #getLegacyNumberFormat
	 * @borrows module:sap/base/i18n/Formatting.getCustomIslamicCalendarData as #getLegacyDateCalendarCustomizing
	 * @borrows module:sap/base/i18n/Formatting.setCustomIslamicCalendarData as #setLegacyDateCalendarCustomizing
	 * @borrows module:sap/base/i18n/Formatting.getTrailingCurrencyCode as #getTrailingCurrencyCode
	 * @borrows module:sap/base/i18n/Formatting.setTrailingCurrencyCode as #setTrailingCurrencyCode
	 * @borrows module:sap/base/i18n/Formatting.getCustomLocaleData as #getCustomLocaleData
	 *
	 */
	var FormatSettings = BaseObject.extend("sap.ui.core.Configuration.FormatSettings", /** @lends sap.ui.core.Configuration.FormatSettings.prototype */ {
		constructor : function() {
			BaseObject.call(this);
			this.mSettings = {};
		},

		/**
		 * Returns the locale to be used for formatting.
		 *
		 * If no such locale has been defined, this method falls back to the language,
		 * see {@link sap.ui.core.Configuration.getLanguage Configuration.getLanguage()}.
		 *
		 * If any user preferences for date, time or number formatting have been set,
		 * and if no format locale has been specified, then a special private use subtag
		 * is added to the locale, indicating to the framework that these user preferences
		 * should be applied.
		 *
		 * @return {sap.ui.core.Locale} the format locale
		 * @public
		 * @deprecated As of Version 1.120. Please use {@link module:sap/base/i18n/Formatting.getLanguageTag Formatting.getLanguageTag} instead.
		 */
		getFormatLocale : function() {
			var oLocale = Formatting.getLanguageTag();
			return Locale._getCoreLocale(oLocale);
		},

		_set: Formatting._set,

		getCustomUnits: Formatting.getCustomUnits,

		setCustomUnits: function() {
			Formatting.setCustomUnits.apply(Formatting, arguments);
			return this;
		},

		addCustomUnits: function() {
			Formatting.addCustomUnits.apply(Formatting, arguments);
			return this;
		},

		setUnitMappings: function() {
			Formatting.setUnitMappings.apply(Formatting, arguments);
			return this;
		},

		addUnitMappings: function() {
			Formatting.addUnitMappings.apply(Formatting, arguments);
			return this;
		},

		getUnitMappings: Formatting.getUnitMappings,

		getDatePattern : Formatting.getDatePattern,

		/**
		 * Defines the preferred format pattern for the given date format style.
		 *
		 * Calling this method with a null or undefined pattern removes a previously set pattern.
		 *
		 * If a pattern is defined, it will be preferred over patterns derived from the current locale.
		 *
		 * See class {@link sap.ui.core.format.DateFormat DateFormat} for details about the pattern syntax.
		 *
		 * After changing the date pattern, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link sap.ui.core.Configuration.setLanguage Configuration.setLanguage}
		 * for details and restrictions.
		 *
		 * @param {string} sStyle must be one of short, medium, long or full.
		 * @param {string} sPattern the format pattern to be used in LDML syntax.
		 * @returns {this} Returns <code>this</code> to allow method chaining
		 * @public
		 * @function
		 */
		setDatePattern : function() {
			Formatting.setDatePattern.apply(Formatting, arguments);
			return this;
		},

		getTimePattern : Formatting.getTimePattern,

		/**
		 * Defines the preferred format pattern for the given time format style.
		 *
		 * Calling this method with a null or undefined pattern removes a previously set pattern.
		 *
		 * If a pattern is defined, it will be preferred over patterns derived from the current locale.
		 *
		 * See class {@link sap.ui.core.format.DateFormat DateFormat} for details about the pattern syntax.
		 *
		 * After changing the time pattern, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link sap.ui.core.Configuration.setLanguage
		 * Configuration.setLanguage} for details and restrictions.
		 *
		 * @param {string} sStyle must be one of short, medium, long or full.
		 * @param {string} sPattern the format pattern to be used in LDML syntax.
		 * @returns {this} Returns <code>this</code> to allow method chaining
		 * @public
		 * @function
		 */
		setTimePattern : function() {
			Formatting.setTimePattern.apply(Formatting, arguments);
			return this;
		},

		getNumberSymbol : Formatting.getNumberSymbol,

		/**
		 * Defines the string to be used for the given number symbol.
		 *
		 * Calling this method with a null or undefined symbol removes a previously set symbol string.
		 * Note that an empty string is explicitly allowed.
		 *
		 * If a symbol is defined, it will be preferred over symbols derived from the current locale.
		 *
		 * See class {@link sap.ui.core.format.NumberFormat NumberFormat} for details about the symbols.
		 *
		 * After changing the number symbol, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link sap.ui.core.Configuration.setLanguage
		 * Configuration.setLanguage} for details and restrictions.
		 *
		 * @param {"group"|"decimal"|"plusSign"|"minusSign"} sType the type of symbol
		 * @param {string} sSymbol will be used to represent the given symbol type
		 * @returns {this} Returns <code>this</code> to allow method chaining
		 * @public
		 * @function
		 */
		setNumberSymbol : function() {
			Formatting.setNumberSymbol.apply(Formatting, arguments);
			return this;
		},

		getCustomCurrencies : Formatting.getCustomCurrencies,

		setCustomCurrencies : function() {
			Formatting.setCustomCurrencies.apply(Formatting, arguments);
			return this;
		},

		addCustomCurrencies: function() {
			Formatting.addCustomCurrencies.apply(Formatting, arguments);
			return this;
		},

		/**
		 * Defines the day used as the first day of the week.
		 *
		 * The day is set as an integer value between 0 (Sunday) and 6 (Saturday).
		 * Calling this method with a null or undefined symbol removes a previously set value.
		 *
		 * If a value is defined, it will be preferred over values derived from the current locale.
		 *
		 * Usually in the US the week starts on Sunday while in most European countries on Monday.
		 * There are special cases where you want to have the first day of week set independent of the
		 * user locale.
		 *
		 * After changing the first day of week, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link sap.ui.core.Configuration.setLanguage
		 * Configuration.setLanguage} for details and restrictions.
		 *
		 * @param {int} iValue must be an integer value between 0 and 6
		 * @returns {this} Returns <code>this</code> to allow method chaining
		 * @public
		 * @deprecated As of Version 1.113. Use {@link sap.ui.core.Configuration.FormatSettings#setCalendarWeekNumbering FormatSettings#setCalendarWeekNumbering} instead.
		 */
		setFirstDayOfWeek : function(iValue) {
			check(typeof iValue == "number" && iValue >= 0 && iValue <= 6, "iValue must be an integer value between 0 and 6");
			Formatting._set("weekData-firstDay", iValue);
			return this;
		},

		_setDayPeriods: Formatting._setDayPeriods,

		getLegacyDateFormat : Formatting.getABAPDateFormat,

		/**
		 * Allows to specify one of the legacy ABAP date formats.
		 *
		 * This method modifies the date patterns for 'short' and 'medium' style with the corresponding ABAP
		 * format. When called with a null or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the legacy date format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link sap.ui.core.Configuration.setLanguage
		 * Configuration.setLanguage} for details and restrictions.
		 *
		 * @param {""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"A"|"B"|"C"} [sFormatId=""] ID of the ABAP date format,
		 *   <code>""</code> will reset the date patterns for 'short' and 'medium' style to the
		 *   locale-specific ones.
		 * @returns {this} Returns <code>this</code> to allow method chaining
		 * @public
		 * @function
		 */
		setLegacyDateFormat : function() {
			Formatting.setABAPDateFormat.apply(Formatting, arguments);
			return this;
		},

		getLegacyTimeFormat : Formatting.getABAPTimeFormat,

		/**
		 * Allows to specify one of the legacy ABAP time formats.
		 *
		 * This method sets the time patterns for 'short' and 'medium' style to the corresponding ABAP
		 * formats and sets the day period texts to "AM"/"PM" or "am"/"pm" respectively. When called
		 * with a null or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the legacy time format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link sap.ui.core.Configuration.setLanguage
		 * Configuration.setLanguage} for details and restrictions.
		 *
		 * @param {""|"0"|"1"|"2"|"3"|"4"} [sFormatId=""] ID of the ABAP time format,
		 *   <code>""</code> will reset the time patterns for 'short' and 'medium' style and the day
		 *   period texts to the locale-specific ones.
		 * @returns {this} Returns <code>this</code> to allow method chaining
		 * @public
		 * @function
		 */
		setLegacyTimeFormat : function() {
			Formatting.setABAPTimeFormat.apply(Formatting, arguments);
			return this;
		},

		getLegacyNumberFormat : Formatting.getABAPNumberFormat,

		/**
		 * Allows to specify one of the legacy ABAP number format.
		 *
		 * This method will modify the 'group' and 'decimal' symbols. When called with a null
		 * or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the legacy number format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of {@link sap.ui.core.Configuration.setLanguage
		 * Configuration.setLanguage} for details and restrictions.
		 *
		 * @param {""|" "|"X"|"Y"} [sFormatId=""] ID of the ABAP number format set,
		 *   <code>""</code> will reset the 'group' and 'decimal' symbols to the locale-specific
		 *   ones.
		 * @returns {this} Returns <code>this</code> to allow method chaining
		 * @public
		 * @function
		 */
		setLegacyNumberFormat : function() {
			Formatting.setABAPNumberFormat.apply(Formatting, arguments);
			return this;
		},

		setLegacyDateCalendarCustomizing : function() {
			Formatting.setCustomIslamicCalendarData.apply(Formatting, arguments);
			return this;
		},

		getLegacyDateCalendarCustomizing : Formatting.getCustomIslamicCalendarData,

		setTrailingCurrencyCode : function() {
			Formatting.setTrailingCurrencyCode.apply(Formatting, arguments);
			return this;
		},

		getTrailingCurrencyCode : Formatting.getTrailingCurrencyCode,

		getCustomLocaleData : Formatting.getCustomLocaleData
	});

	/**
	 * @deprecated As of Version 1.120
	 */
	oFormatSettings = new FormatSettings(this);

	//enable Eventing
	Localization.attachChange(function(oEvent) {
		if (!mChanges && Core) {
			Core.fireLocalizationChanged(BaseEvent.getParameters(oEvent));
		} else if (mChanges) {
			Object.assign(mChanges, BaseEvent.getParameters(oEvent));
		}
	});

	Formatting.attachChange(function(oEvent) {
		const mParameters = BaseEvent.getParameters(oEvent);
		Object.keys(oEvent).forEach((sName) => {
			if (["ABAPDateFormat", "ABAPTimeFormat", "ABAPNumberFormat"].includes(sName)) {
				mParameters[sName.replace("ABAP", "legacy")] = mParameters[sName];
				delete mParameters[sName];
			} else if (sName === 'customIslamicCalendarData') {
				mParameters['legacyDateCalendarCustomizing'] = mParameters[sName];
				delete mParameters[sName];
			}
		});
		if (!mChanges && Core) {
			Core.fireLocalizationChanged(mParameters);
		} else if (mChanges) {
			Object.assign(mChanges, mParameters);
		}
	});

	return Configuration;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides module sap.ui.core.ControlBehavior
sap.ui.predefine("sap/ui/core/ControlBehavior", [
	"sap/base/config",
	"sap/base/Eventing",
	"sap/ui/core/AnimationMode"
], (
	BaseConfig,
	Eventing,
	AnimationMode
) => {
	"use strict";

	const oWritableConfig = BaseConfig.getWritableInstance();
	const oEventing = new Eventing();

	/**
	 * Provides control behavior relevant configuration options
	 *
	 * @namespace
	 * @alias module:sap/ui/core/ControlBehavior
	 * @public
	 * @since 1.120
	 */
	const ControlBehavior = {
		/**
		 * The <code>change</code> event is fired, when the configuration options are changed.
		 *
		 * @name module:sap/ui/core/ControlBehavior.change
		 * @event
		 * @type {module:sap/ui/core/ControlBehavior$ChangeEvent}
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.116.0
		 */

		/**
		 * The theme scoping change Event.
		 *
		 * @typedef {Object<string,string>} module:sap/ui/core/ControlBehavior$ChangeEvent
		 * @property {string} animationMode Whether the animation mode should be active or not.
		 * @private
		 * @ui5-restricted sap.ui.core.theming.ThemeManager
		 * @since 1.116.0
		 */

		/**
		 * Attaches the <code>fnFunction</code> event handler to the {@link #event:change change} event
		 * of <code>sap.ui.core.ControlBehavior</code>.
		 *
		 * When called, the context of the event handler (its <code>this</code>) will be bound to
		 * <code>oListener</code> if specified, otherwise it will be bound to this
		 * <code>sap.ui.core.ControlBehavior</code> itself.
		 *
		 * @param {function(module:sap/ui/core/ControlBehavior$ChangeEvent)} fnFunction
		 *   The function to be called when the event occurs
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.116.0
		 */
		attachChange: (fnFunction) => {
			oEventing.attachEvent("change", fnFunction);
		},

		/**
		 * Detaches event handler <code>fnFunction</code> from the {@link #event:change change} event of
		 * this <code>sap.ui.core.ControlBehavior</code>.
		 *
		 * @param {function(module:sap/ui/core/ControlBehavior$ChangeEvent)} fnFunction Function to be called when the event occurs
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.116.0
		 */
		detachChange: (fnFunction) => {
			oEventing.detachEvent("change", fnFunction);
		},

		/**
		 * Returns whether the accessibility mode is enabled or not.
		 * @return {boolean} whether the accessibility mode is enabled or not
		 * @public
		 * @since 1.120
		 */
		isAccessibilityEnabled: () => {
			return oWritableConfig.get({
				name: "sapUiAccessibility",
				type: BaseConfig.Type.Boolean,
				defaultValue: true,
				external: true
			});
		},

		/**
		 * Returns the current animation mode.
		 *
		 * @return {module:sap/ui/core/AnimationMode} The current animationMode
		 * @public
		 * @since 1.120
		 */
		getAnimationMode: () => {
			let sAnimationMode = oWritableConfig.get({
				name: "sapUiAnimationMode",
				type: AnimationMode,
				defaultValue: undefined,
				external: true
			});
			const bAnimation = oWritableConfig.get({
				name: "sapUiAnimation",
				type: BaseConfig.Type.Boolean,
				defaultValue: true,
				external: true
			});
			if (sAnimationMode === undefined) {
				if (bAnimation) {
					sAnimationMode = AnimationMode.full;
				} else {
					sAnimationMode = AnimationMode.minimal;
				}
			}
			BaseConfig._.checkEnum(AnimationMode, sAnimationMode, "animationMode");
			return sAnimationMode;
		},

		/**
		 * Sets the current animation mode.
		 *
		 * Expects an animation mode as string and validates it. If a wrong animation mode was set, an error is
		 * thrown. If the mode is valid it is set, then the attributes <code>data-sap-ui-animation</code> and
		 * <code>data-sap-ui-animation-mode</code> of the HTML document root element are also updated.
		 * If the <code>animationMode</code> is <code>AnimationMode.none</code> the old
		 * <code>animation</code> property is set to <code>false</code>, otherwise it is set to <code>true</code>.
		 *
		 * @param {module:sap/ui/core/AnimationMode} sAnimationMode A valid animation mode
		 * @throws {Error} If the provided <code>sAnimationMode</code> does not exist, an error is thrown
		 * @public
		 * @since 1.120
		 */
		setAnimationMode: (sAnimationMode) => {
			BaseConfig._.checkEnum(AnimationMode, sAnimationMode, "animationMode");

			const sOldAnimationMode = oWritableConfig.get({
				name: "sapUiAnimationMode",
				type: AnimationMode,
				defaultValue: undefined,
				external: true
			});

			// Set the animation mode and update html attributes.
			oWritableConfig.set("sapUiAnimationMode", sAnimationMode);
			if (sOldAnimationMode != sAnimationMode) {
				fireChange({animationMode: sAnimationMode});
			}
		}
	};

	function fireChange(mChanges) {
		oEventing.fireEvent("change", mChanges);
	}

	return ControlBehavior;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the base class for all controls and UI elements.
sap.ui.predefine("sap/ui/core/Element", [
	'../base/DataType',
	'../base/Object',
	'../base/ManagedObject',
	'./ElementMetadata',
	'../Device',
	"sap/ui/performance/trace/Interaction",
	"sap/base/future",
	"sap/base/assert",
	"sap/ui/thirdparty/jquery",
	"sap/ui/events/F6Navigation",
	"sap/ui/util/_enforceNoReturnValue",
	"./RenderManager",
	"./EnabledPropagator",
	"./ElementRegistry",
	"./Theming",
	"sap/ui/core/util/_LocalizationHelper"
],
	function(
		DataType,
		BaseObject,
		ManagedObject,
		ElementMetadata,
		Device,
		Interaction,
		future,
		assert,
		jQuery,
		F6Navigation,
		_enforceNoReturnValue,
		RenderManager,
		EnabledPropagator,
		ElementRegistry,
		Theming,
		_LocalizationHelper
	) {
	"use strict";

	/**
	 * Constructs and initializes a UI Element with the given <code>sId</code> and settings.
	 *
	 *
	 * <h3>Uniqueness of IDs</h3>
	 *
	 * Each <code>Element</code> must have an ID. If no <code>sId</code> or <code>mSettings.id</code> is
	 * given at construction time, a new ID will be created automatically. The IDs of all elements that exist
	 * at the same time in the same window must be different. Providing an ID which is already used by another
	 * element throws an error.
	 *
	 * When an element is created from a declarative source (e.g. XMLView), then an ID defined in that
	 * declarative source needs to be unique only within the declarative source. Declarative views will
	 * prefix that ID with their own ID (and some separator) before constructing the element.
	 * Programmatically created views (JSViews) can do the same with the {@link sap.ui.core.mvc.View#createId} API.
	 * Similarly, UIComponents can prefix the IDs of elements created in their context with their own ID.
	 * Also see {@link sap.ui.core.UIComponent#getAutoPrefixId UIComponent#getAutoPrefixId}.
	 *
	 *
	 * <h3>Settings</h3>
	 * If the optional <code>mSettings</code> are given, they must be a JSON-like object (object literal)
	 * that defines values for properties, aggregations, associations or events keyed by their name.
	 *
	 * <b>Valid Names:</b>
	 *
	 * The property (key) names supported in the object literal are exactly the (case sensitive)
	 * names documented in the JSDoc for the properties, aggregations, associations and events
	 * of the control and its base classes. Note that for  0..n aggregations and associations this
	 * usually is the plural name, whereas it is the singular name in case of 0..1 relations.
	 *
	 * Each subclass should document the set of supported names in its constructor documentation.
	 *
	 * <b>Valid Values:</b>
	 *
	 * <ul>
	 * <li>for normal properties, the value has to be of the correct simple type (no type conversion occurs)</li>
	 * <li>for 0..1 aggregations, the value has to be an instance of the aggregated control or element type</li>
	 * <li>for 0..n aggregations, the value has to be an array of instances of the aggregated type</li>
	 * <li>for 0..1 associations, an instance of the associated type or an id (string) is accepted</li>
	 * <li>0..n associations are not supported yet</li>
	 * <li>for events either a function (event handler) is accepted or an array of length 2
	 *     where the first element is a function and the 2nd element is an object to invoke the method on.</li>
	 * </ul>
	 *
	 * Special aggregation <code>dependents</code> is connected to the lifecycle management and databinding,
	 * but not rendered automatically and can be used for popups or other dependent controls or elements.
	 * This allows the definition of popup controls in declarative views and enables propagation of model
	 * and context information to them.
	 *
	 * @param {string} [sId] id for the new control; generated automatically if no non-empty id is given
	 *      Note: this can be omitted, no matter whether <code>mSettings</code> will be given or not!
	 * @param {object} [mSettings] optional map/JSON-object with initial property values, aggregated objects etc. for the new element
	 *
	 * @abstract
	 *
	 * @class Base Class for UI Elements.
	 *
	 * <code>Element</code> is the most basic building block for UI5 UIs. An <code>Element</code> has state like a
	 * <code>ManagedObject</code>, it has a unique ID by which the framework remembers it. It can have associated
	 * DOM, but it can't render itself. Only {@link sap.ui.core.Control Controls} can render themselves and also
	 * take care of rendering <code>Elements</code> that they aggregate as children. If an <code>Element</code>
	 * has been rendered, its related DOM gets the same ID as the <code>Element</code> and thereby can be retrieved
	 * via API. When the state of an <code>Element</code> changes, it informs its parent <code>Control</code> which
	 * usually re-renders then.
	 *
	 * <h3>Dispatching Events</h3>
	 *
	 * The UI5 framework already registers generic listeners for common browser events, such as <code>click</code>
	 * or <code>keydown</code>. When called, the generic listener first determines the corresponding target element
	 * using {@link jQuery#control}. Then it checks whether the element has an event handler method for the event.
	 * An event handler method by convention has the same name as the event, but prefixed with "on": Method
	 * <code>onclick</code> is the handler for the <code>click</code> event, method <code>onkeydown</code> the handler
	 * for the <code>keydown</code> event and so on. If there is such a method, it will be called with the original
	 * event as the only parameter. If the element has a list of delegates registered, their handler functions will
	 * be called the same way, where present. The set of implemented handlers might differ between element and
	 * delegates. Not each handler implemented by an element has to be implemented by its delegates, and delegates
	 * can implement handlers that the corresponding element doesn't implement.
	 *
	 * A list of browser events that are handled that way can be found in {@link module:sap/ui/events/ControlEvents}.
	 * Additionally, the framework dispatches pseudo events ({@link module:sap/ui/events/PseudoEvents}) using the same
	 * naming convention. Last but not least, some framework events are also dispatched that way, e.g.
	 * <code>BeforeRendering</code>, <code>AfterRendering</code> (only for controls) and <code>ThemeChanged</code>.
	 *
	 * If further browser events are needed, controls can register listeners on the DOM using native APIs in their
	 * <code>onAfterRendering</code> handler. If needed, they can do this for their aggregated elements as well.
	 * If events might fire often (e.g. <code>mousemove</code>), it is best practice to register them only while
	 * needed, and deregister afterwards. Anyhow, any registered listeners must be cleaned up in the
	 * <code>onBeforeRendering</code> listener and before destruction in the <code>exit</code> hook.
	 *
	 * @extends sap.ui.base.ManagedObject
	 * @author SAP SE
	 * @version 1.125.0
	 * @public
	 * @alias sap.ui.core.Element
	 */
	var Element = ManagedObject.extend("sap.ui.core.Element", {

		metadata : {
			stereotype : "element",
			"abstract" : true,
			publicMethods : [ "getId", "getMetadata", "getTooltip_AsString", "getTooltip_Text", "getModel", "setModel", "hasModel", "bindElement", "unbindElement", "getElementBinding", "prop", "getLayoutData", "setLayoutData" ],
			library : "sap.ui.core",
			aggregations : {

				/**
				 * The tooltip that should be shown for this Element.
				 *
				 * In the most simple case, a tooltip is a string that will be rendered by the control and
				 * displayed by the browser when the mouse pointer hovers over the control's DOM. In this
				 * variant, <code>tooltip</code> behaves like a simple control property.
				 *
				 * Controls need to explicitly support this kind of tooltip as they have to render it,
				 * but most controls do. Exceptions will be documented for the corresponding controls
				 * (e.g. <code>sap.ui.core.HTML</code> does not support tooltips).
				 *
				 * Alternatively, <code>tooltip</code> can act like a 0..1 aggregation and can be set to a
				 * tooltip control (an instance of a subclass of <code>sap.ui.core.TooltipBase</code>). In
				 * that case, the framework will take care of rendering the tooltip control in a popup-like
				 * manner. Such a tooltip control can display arbitrary content, not only a string.
				 *
				 * UI5 currently does not provide a recommended implementation of <code>TooltipBase</code>
				 * as the use of content-rich tooltips is discouraged by the Fiori Design Guidelines.
				 * Existing subclasses of <code>TooltipBase</code> therefore have been deprecated.
				 * However, apps can still subclass from <code>TooltipBase</code> and create their own
				 * implementation when needed (potentially taking the deprecated implementations as a
				 * starting point).
				 *
				 * See the section {@link https://experience.sap.com/fiori-design-web/using-tooltips/ Using Tooltips}
				 * in the Fiori Design Guideline.
				 */
				tooltip : {type : "sap.ui.core.TooltipBase", altTypes : ["string"], multiple : false},

				/**
				 * Custom Data, a data structure like a map containing arbitrary key value pairs.
				 */
				customData : {type : "sap.ui.core.CustomData", multiple : true, singularName : "customData"},

				/**
				 * Defines the layout constraints for this control when it is used inside a Layout.
				 * LayoutData classes are typed classes and must match the embedding Layout.
				 * See VariantLayoutData for aggregating multiple alternative LayoutData instances to a single Element.
				 */
				layoutData : {type : "sap.ui.core.LayoutData", multiple : false, singularName : "layoutData"},

				/**
				 * Dependents are not rendered, but their databinding context and lifecycle are bound to the aggregating Element.
				 * @since 1.19
				 */
				dependents : {type : "sap.ui.core.Element", multiple : true},

				/**
				 * Defines the drag-and-drop configuration.
				 * <b>Note:</b> This configuration might be ignored due to control {@link sap.ui.core.Element.extend metadata} restrictions.
				 *
				 * @since 1.56
				 */
				dragDropConfig : {type : "sap.ui.core.dnd.DragDropBase", multiple : true, singularName : "dragDropConfig"}
			}
		},

		constructor : function(sId, mSettings) {
			ManagedObject.apply(this, arguments);
			this._iRenderingDelegateCount = 0;
		},

		renderer : null // Element has no renderer

	}, /* Metadata constructor */ ElementMetadata);

	ElementRegistry.init(Element);

	/**
	 * Creates metadata for a UI Element by extending the Object Metadata.
	 *
	 * @param {string} sClassName name of the class to build the metadata for
	 * @param {object} oStaticInfo static information used to build the metadata
	 * @param {function} [fnMetaImpl=sap.ui.core.ElementMetadata] constructor to be used for the metadata
	 * @return {sap.ui.core.ElementMetadata} the created metadata
	 * @static
	 * @public
	 * @deprecated Since 1.3.1. Use the static <code>extend</code> method of the desired base class (e.g. {@link sap.ui.core.Element.extend})
	 */
	Element.defineClass = function(sClassName, oStaticInfo, fnMetaImpl) {
		// create and attach metadata but with an Element specific implementation
		return BaseObject.defineClass(sClassName, oStaticInfo, fnMetaImpl || ElementMetadata);
	};

	/**
	 * Elements don't have a facade and therefore return themselves as their interface.
	 *
	 * @returns {this} <code>this</code> as there's no facade for elements
	 * @see sap.ui.base.Object#getInterface
	 * @public
	 */
	Element.prototype.getInterface = function() {
		return this;
	};

	/**
	 * @typedef {sap.ui.base.ManagedObject.MetadataOptions} sap.ui.core.Element.MetadataOptions
	 *
	 * The structure of the "metadata" object which is passed when inheriting from sap.ui.core.Element using its static "extend" method.
	 * See {@link sap.ui.core.Element.extend} for details on its usage.
	 *
	 * @property {boolean | sap.ui.core.Element.MetadataOptions.DnD} [dnd=false]
	 *     Defines draggable and droppable configuration of the element.
	 *     The following boolean properties can be provided in the given object literal to configure drag-and-drop behavior of the element
	 *     (see {@link sap.ui.core.Element.MetadataOptions.DnD DnD} for details): draggable, droppable
	 *     If the <code>dnd</code> property is of type Boolean, then the <code>draggable</code> and <code>droppable</code> configuration are both set to this Boolean value.
	 *
	 * @public
	 */

	/**
	 * @typedef {object} sap.ui.core.Element.MetadataOptions.DnD
	 *
	 * An object literal configuring the drag&drop capabilities of a class derived from sap.ui.core.Element.
	 * See {@link sap.ui.core.Element.MetadataOptions MetadataOptions} for details on its usage.
	 *
	 * @property {boolean} [draggable=false] Defines whether the element is draggable or not. The default value is <code>false</code>.
	 * @property {boolean} [droppable=false] Defines whether the element is droppable (it allows being dropped on by a draggable element) or not. The default value is <code>false</code>.
	 *
	 * @public
	 */

	/**
	 * Defines a new subclass of Element with the name <code>sClassName</code> and enriches it with
	 * the information contained in <code>oClassInfo</code>.
	 *
	 * <code>oClassInfo</code> can contain the same information that {@link sap.ui.base.ManagedObject.extend} already accepts,
	 * plus the <code>dnd</code> property in the metadata object literal to configure drag-and-drop behavior
	 * (see {@link sap.ui.core.Element.MetadataOptions MetadataOptions} for details). Objects describing aggregations can also
	 * have a <code>dnd</code> property when used for a class extending <code>Element</code>
	 * (see {@link sap.ui.base.ManagedObject.MetadataOptions.AggregationDnD AggregationDnD}).
	 *
	 * Example:
	 * <pre>
	 * Element.extend('sap.mylib.MyElement', {
	 *   metadata : {
	 *     library : 'sap.mylib',
	 *     properties : {
	 *       value : 'string',
	 *       width : 'sap.ui.core.CSSSize'
	 *     },
	 *     dnd : { draggable: true, droppable: false },
	 *     aggregations : {
	 *       items : { type: 'sap.ui.core.Control', multiple : true, dnd : {draggable: false, droppable: true, layout: "Horizontal" } },
	 *       header : {type : "sap.ui.core.Control", multiple : false, dnd : true },
	 *     }
	 *   }
	 * });
	 * </pre>
	 *
	 * @param {string} sClassName Name of the class to be created
	 * @param {object} [oClassInfo] Object literal with information about the class
	 * @param {sap.ui.core.Element.MetadataOptions} [oClassInfo.metadata] the metadata object describing the class: properties, aggregations, events etc.
	 * @param {function} [FNMetaImpl] Constructor function for the metadata object. If not given, it defaults to <code>sap.ui.core.ElementMetadata</code>.
	 * @returns {function} Created class / constructor function
	 *
	 * @public
	 * @static
	 * @name sap.ui.core.Element.extend
	 * @function
	 */

	/**
	 * Dispatches the given event, usually a browser event or a UI5 pseudo event.
	 *
	 * @param {jQuery.Event} oEvent The event
	 * @private
	 */
	Element.prototype._handleEvent = function (oEvent) {

		var that = this,
			sHandlerName = "on" + oEvent.type;

		function each(aDelegates) {
			var i,l,oDelegate;
			if ( aDelegates && (l = aDelegates.length) > 0 ) {
				// To be robust against concurrent modifications of the delegates list, we loop over a copy.
				// When there is only a single entry, the loop is safe without a copy (length is determined only once!)
				aDelegates = l === 1 ? aDelegates : aDelegates.slice();
				for (i = 0; i < l; i++ ) {
					if (oEvent.isImmediateHandlerPropagationStopped()) {
						return;
					}
					oDelegate = aDelegates[i].oDelegate;
					if (oDelegate[sHandlerName]) {
						oDelegate[sHandlerName].call(aDelegates[i].vThis === true ? that : aDelegates[i].vThis || oDelegate, oEvent);
					}
				}
			}
		}

		each(this.aBeforeDelegates);

		if ( oEvent.isImmediateHandlerPropagationStopped() ) {
			return;
		}
		if ( this[sHandlerName] ) {
			if (oEvent._bNoReturnValue) {
				// fatal throw if listener isn't allowed to have a return value
				_enforceNoReturnValue(this[sHandlerName](oEvent), /*mLogInfo=*/{ name: sHandlerName, component: this.getId() });
			} else {
				this[sHandlerName](oEvent);
			}
		}

		each(this.aDelegates);
	};


	/**
	 * Initializes the element instance after creation.
	 *
	 * Applications must not call this hook method directly, it is called by the framework
	 * while the constructor of an element is executed.
	 *
	 * Subclasses of Element should override this hook to implement any necessary initialization.
	 *
	 * @returns {void|undefined} This hook method must not have a return value. Return value <code>void</code> is deprecated since 1.120, as it does not force functions to <b>not</b> return something.
	 * 	This implies that, for instance, no async function returning a Promise should be used.
	 *
	 * 	<b>Note:</b> While the return type is currently <code>void|undefined</code>, any
	 *	implementation of this hook must not return anything but undefined. Any other
	 * 	return value will cause an error log in this version of UI5 and will fail in future
	 * 	major versions of UI5.
	 * @protected
	 */
	Element.prototype.init = function() {
		// Before adding any implementation, please remember that this method was first implemented in release 1.54.
		// Therefore, many subclasses will not call this method at all.
		return undefined;
	};

	/**
	 * Hook method for cleaning up the element instance before destruction.
	 *
	 * Applications must not call this hook method directly, it is called by the framework
	 * when the element is {@link #destroy destroyed}.
	 *
	 * Subclasses of Element should override this hook to implement any necessary cleanup.
	 *
	 * <pre>
	 * exit: function() {
	 *     // ... do any further cleanups of your subclass e.g. detach events...
	 *     this.$().off("click", this.handleClick);
	 *
	 *     if (Element.prototype.exit) {
	 *         Element.prototype.exit.apply(this, arguments);
	 *     }
	 * }
	 * </pre>
	 *
	 * For a more detailed description how to to use the exit hook, see Section
	 * {@link topic:d4ac0edbc467483585d0c53a282505a5 exit() Method} in the documentation.
	 *
	 * @returns {void|undefined} This hook method must not have a return value. Return value <code>void</code> is deprecated since 1.120, as it does not force functions to <b>not</b> return something.
	 * 	This implies that, for instance, no async function returning a Promise should be used.
	 *
	 * 	<b>Note:</b> While the return type is currently <code>void|undefined</code>, any
	 *	implementation of this hook must not return anything but undefined. Any other
	 * 	return value will cause an error log in this version of UI5 and will fail in future
	 * 	major versions of UI5.
	 * @protected
	 */
	Element.prototype.exit = function() {
		// Before adding any implementation, please remember that this method was first implemented in release 1.54.
		// Therefore, many subclasses will not call this method at all.
		return undefined;
	};

	/**
	 * Creates a new Element from the given data.
	 *
	 * If <code>vData</code> is an Element already, that element is returned.
	 * If <code>vData</code> is an object (literal), then a new element is created with <code>vData</code> as settings.
	 * The type of the element is either determined by a property named <code>Type</code> in the <code>vData</code> or
	 * by a type information in the <code>oKeyInfo</code> object
	 * @param {sap.ui.core.Element|object} vData Data to create the element from
	 * @param {object} [oKeyInfo] An entity information (e.g. aggregation info)
	 * @param {string} [oKeyInfo.type] Type info for the entity
	 * @returns {sap.ui.core.Element}
	 *   The newly created <code>Element</code>
	 * @public
	 * @static
	 * @deprecated As of 1.44, use the more flexible {@link sap.ui.base.ManagedObject.create}.
	 * @function
	 * @ts-skip
	 */
	Element.create = ManagedObject.create;

	/**
	 * Returns a simple string representation of this element.
	 *
	 * Mainly useful for tracing purposes.
	 * @public
	 * @return {string} a string description of this element
	 */
	Element.prototype.toString = function() {
		return "Element " + this.getMetadata().getName() + "#" + this.sId;
	};


	/**
	 * Returns the best suitable DOM Element that represents this UI5 Element.
	 * By default the DOM Element with the same ID as this Element is returned.
	 * Subclasses should override this method if the lookup via id is not sufficient.
	 *
	 * Note that such a DOM Element does not necessarily exist in all cases.
	 * Some elements or controls might not have a DOM representation at all (e.g.
	 * a naive FlowLayout) while others might not have one due to their current
	 * state (e.g. an initial, not yet rendered control).
	 *
	 * If an ID suffix is given, the ID of this Element is concatenated with the suffix
	 * (separated by a single dash) and the DOM node with that compound ID will be returned.
	 * This matches the UI5 naming convention for named inner DOM nodes of a control.
	 *
	 * @param {string} [sSuffix] ID suffix to get the DOMRef for
	 * @returns {Element|null} The Element's DOM Element, sub DOM Element or <code>null</code>
	 * @protected
	 */
	Element.prototype.getDomRef = function(sSuffix) {
		return document.getElementById(sSuffix ? this.getId() + "-" + sSuffix : this.getId());
	};

	/**
	 * Returns the best suitable DOM node that represents this Element wrapped as jQuery object.
	 * I.e. the element returned by {@link sap.ui.core.Element#getDomRef} is wrapped and returned.
	 *
	 * If an ID suffix is given, the ID of this Element is concatenated with the suffix
	 * (separated by a single dash) and the DOM node with that compound ID will be wrapped by jQuery.
	 * This matches the UI5 naming convention for named inner DOM nodes of a control.
	 *
	 * @param {string} [sSuffix] ID suffix to get a jQuery object for
	 * @return {jQuery} The jQuery wrapped element's DOM reference
	 * @protected
	 */

	Element.prototype.$ = function(sSuffix) {
		return jQuery(this.getDomRef(sSuffix));
	};

	/**
	 * Checks whether this element has an active parent.
	 *
	 * @returns {boolean} Whether this element has an active parent
	 * @private
	 */
	Element.prototype.isActive = function() {
		return this.oParent && this.oParent.isActive();
	};

	/**
	 * This function either calls set[sPropertyName] or get[sPropertyName] with the specified property name
	 * depending if an <code>oValue</code> is provided or not.
	 *
	 * @param {string}  sPropertyName name of the property to set
	 * @param {any}     [oValue] value to set the property to
	 * @return {any|this} Returns <code>this</code> to allow method chaining in case of setter and the property value in case of getter
	 * @public
	 * @deprecated Since 1.28.0 The contract of this method is not fully defined and its write capabilities overlap with applySettings
	 */
	Element.prototype.prop = function(sPropertyName, oValue) {

		var oPropertyInfo = this.getMetadata().getAllSettings()[sPropertyName];
		if (oPropertyInfo) {
			if (arguments.length == 1) {
				// getter
				return this[oPropertyInfo._sGetter]();
			} else {
				// setter
				this[oPropertyInfo._sMutator](oValue);
				return this;
			}
		}
	};

	/*
	 * Intercept any changes for properties named "enabled".
	 *
	 * If such a change is detected, inform all descendants that use the `EnabledPropagator`
	 * so that they can recalculate their own, derived enabled state.
	 * This is required in the context of rendering V4 to make the state of controls/elements
	 * self-contained again when they're using the `EnabledPropagator` mixin.
	 */
	Element.prototype.setProperty = function(sPropertyName, vValue, bSuppressInvalidate) {
		if (sPropertyName != "enabled" || bSuppressInvalidate) {
			return ManagedObject.prototype.setProperty.apply(this, arguments);
		}

		var bOldEnabled = this.mProperties.enabled;
		ManagedObject.prototype.setProperty.apply(this, arguments);
		if (bOldEnabled != this.mProperties.enabled) {
			// the EnabledPropagator knows better which descendants to update
			EnabledPropagator.updateDescendants(this);
		}

		return this;
	};

	Element.prototype.insertDependent = function(oElement, iIndex) {
		this.insertAggregation("dependents", oElement, iIndex, true);
		return this; // explicitly return 'this' to fix controls that override insertAggregation wrongly
	};

	Element.prototype.addDependent = function(oElement) {
		this.addAggregation("dependents", oElement, true);
		return this; // explicitly return 'this' to fix controls that override addAggregation wrongly
	};

	Element.prototype.removeDependent = function(vElement) {
		return this.removeAggregation("dependents", vElement, true);
	};

	Element.prototype.removeAllDependents = function() {
		return this.removeAllAggregation("dependents", true);
	};

	Element.prototype.destroyDependents = function() {
		this.destroyAggregation("dependents", true);
		return this; // explicitly return 'this' to fix controls that override destroyAggregation wrongly
	};

	/**
	 * This triggers immediate rerendering of its parent and thus of itself and its children.
	 *
	 * @deprecated As of 1.70, using this method is no longer recommended, but still works. Synchronous DOM
	 *   updates via this method have several drawbacks: they only work when the control has been rendered
	 *   before (no initial rendering possible), multiple state changes won't be combined automatically into
	 *   a single re-rendering, they might cause additional layout trashing, standard invalidation might
	 *   cause another async re-rendering.
	 *
	 *   The recommended alternative is to rely on invalidation and standard re-rendering.
	 *
	 * As <code>sap.ui.core.Element</code> "bubbles up" the rerender, changes to
	 * child-<code>Elements</code> will also result in immediate rerendering of the whole sub tree.
	 * @protected
	 */
	Element.prototype.rerender = function() {
		if (this.oParent) {
			this.oParent.rerender();
		}
	};

	/**
	 * Returns the UI area of this element, if any.
	 *
	 * @return {sap.ui.core.UIArea|null} The UI area of this element or <code>null</code>
	 * @private
	 */
	Element.prototype.getUIArea = function() {
		return this.oParent ? this.oParent.getUIArea() : null;
	};

	/**
	 * Cleans up the resources associated with this element and all its children.
	 *
	 * After an element has been destroyed, it can no longer be used in the UI!
	 *
	 * Applications should call this method if they don't need the element any longer.
	 *
	 * @param {boolean} [bSuppressInvalidate=false] If <code>true</code>, this ManagedObject and all its ancestors won't be invalidated.
	 *      <br>This flag should be used only during control development to optimize invalidation procedures.
	 *      It should not be used by any application code.
	 * @public
	 */
	Element.prototype.destroy = function(bSuppressInvalidate) {
		// ignore repeated calls
		if (this.bIsDestroyed) {
			return;
		}

		// determine whether parent exists or not
		var bHasNoParent = !this.getParent();

		// update the focus information (potentially) stored by the central UI5 focus handling
		Element._updateFocusInfo(this);

		ManagedObject.prototype.destroy.call(this, bSuppressInvalidate);

		// wrap custom data API to avoid creating new objects
		this.data = noCustomDataAfterDestroy;

		// exit early if there is no control DOM to remove
		var oDomRef = this.getDomRef();
		if (!oDomRef) {
			return;
		}

		// Determine whether to remove the control DOM from the DOM Tree or not:
		// If parent invalidation is not possible, either bSuppressInvalidate=true or there is no parent to invalidate then we must remove the control DOM synchronously.
		// Controls that implement marker interface sap.ui.core.PopupInterface are by contract not rendered by their parent so we cannot keep the DOM of these controls.
		// If the control is destroyed while its content is in the preserved area then we must remove DOM synchronously since we cannot invalidate the preserved area.
		var bKeepDom = (bSuppressInvalidate === "KeepDom");
		if (bSuppressInvalidate === true || (!bKeepDom && bHasNoParent) || this.isA("sap.ui.core.PopupInterface") || RenderManager.isPreservedContent(oDomRef)) {
			jQuery(oDomRef).remove();
		} else {
			// Make sure that the control DOM won't get preserved after it is destroyed (even if bSuppressInvalidate="KeepDom")
			oDomRef.removeAttribute("data-sap-ui-preserve");
			if (!bKeepDom) {
				// On destroy we do not remove the control DOM synchronously and just let the invalidation happen on the parent.
				// At the next tick of the RenderManager, control DOM nodes will be removed via rerendering of the parent anyway.
				// To make this new behavior more compatible we are changing the id of the control's DOM and all child nodes that start with the control id.
				oDomRef.id = "sap-ui-destroyed-" + this.getId();
				for (var i = 0, aDomRefs = oDomRef.querySelectorAll('[id^="' + this.getId() + '-"]'); i < aDomRefs.length; i++) {
					aDomRefs[i].id = "sap-ui-destroyed-" + aDomRefs[i].id;
				}
			}
		}
	};

	/*
	 * Class <code>sap.ui.core.Element</code> intercepts fireEvent calls to enforce an 'id' property
	 * and to notify others like interaction detection etc.
	 */
	Element.prototype.fireEvent = function(sEventId, mParameters, bAllowPreventDefault, bEnableEventBubbling) {
		if (this.hasListeners(sEventId)) {
			Interaction.notifyStepStart(sEventId, this);
		}

		// get optional parameters right
		if (typeof mParameters === 'boolean') {
			bEnableEventBubbling = bAllowPreventDefault;
			bAllowPreventDefault = mParameters;
			mParameters = null;
		}

		mParameters = mParameters || {};
		mParameters.id = mParameters.id || this.getId();

		if (Element._interceptEvent) {
			Element._interceptEvent(sEventId, this, mParameters);
		}

		return ManagedObject.prototype.fireEvent.call(this, sEventId, mParameters, bAllowPreventDefault, bEnableEventBubbling);
	};

	/**
	 * Intercepts an event. This method is meant for private usages. Apps are not supposed to used it.
	 * It is created for an experimental purpose.
	 * Implementation should be injected by outside.
	 *
	 * @param {string} sEventId the name of the event
	 * @param {sap.ui.core.Element} oElement the element itself
	 * @param {object} mParameters The parameters which complement the event. Hooks must not modify the parameters.
	 * @function
	 * @private
	 * @ui5-restricted
	 * @experimental Since 1.58
	 */
	Element._interceptEvent = undefined;

	/**
	 * Updates the count of rendering-related delegates and if the given threshold is reached,
	 * informs the RenderManager` to enable/disable rendering V4 for the element.
	 *
	 * @param {sap.ui.core.Element} oElement The element instance
	 * @param {object} oDelegate The delegate instance
	 * @param {iThresholdCount} iThresholdCount Whether the delegate has been added=1 or removed=0.
	 *    At the same time serves as threshold when to inform the `RenderManager`.
	 * @private
	 */
	function updateRenderingDelegate(oElement, oDelegate, iThresholdCount) {
		if (oDelegate.canSkipRendering || !(oDelegate.onAfterRendering || oDelegate.onBeforeRendering)) {
			return;
		}

		oElement._iRenderingDelegateCount += (iThresholdCount || -1);

		if (oElement.bOutput === true && oElement._iRenderingDelegateCount == iThresholdCount) {
			RenderManager.canSkipRendering(oElement, 1 /* update skip-the-rendering DOM marker, only if the apiVersion is 4 */);
		}
	}

	/**
	 * Returns whether the element has rendering-related delegates that might prevent skipping the rendering.
	 *
	 * @returns {boolean}
	 * @private
	 * @ui5-restricted sap.ui.core.RenderManager
	 */
	Element.prototype.hasRenderingDelegate = function() {
		return Boolean(this._iRenderingDelegateCount);
	};

	/**
	 * Adds a delegate that listens to the events of this element.
	 *
	 * Note that the default behavior (delegate attachments are not cloned when a control is cloned) is usually the desired behavior in control development
	 * where each control instance typically creates a delegate and adds it to itself. (As opposed to application development where the application may add
	 * one delegate to a template and then expects aggregation binding to add the same delegate to all cloned elements.)
	 *
	 * To avoid double registrations, all registrations of the given delegate are first removed and then the delegate is added.
	 *
	 * @param {object} oDelegate the delegate object
	 * @param {boolean} [bCallBefore=false] if true, the delegate event listeners are called before the event listeners of the element; default is "false". In order to also set bClone, this parameter must be given.
	 * @param {object} [oThis=oDelegate] if given, this object will be the "this" context in the listener methods; default is the delegate object itself
	 * @param {boolean} [bClone=false] if true, this delegate will also be attached to any clones of this element; default is "false"
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @private
	 */
	Element.prototype.addDelegate = function (oDelegate, bCallBefore, oThis, bClone) {
		assert(oDelegate, "oDelegate must be not null or undefined");

		if (!oDelegate) {
			return this;
		}

		this.removeDelegate(oDelegate);

		// shift parameters
		if (typeof bCallBefore === "object") {
			bClone = oThis;
			oThis = bCallBefore;
			bCallBefore = false;
		}

		if (typeof oThis === "boolean") {
			bClone = oThis;
			oThis = undefined;
		}

		(bCallBefore ? this.aBeforeDelegates : this.aDelegates).push({oDelegate:oDelegate, bClone: !!bClone, vThis: ((oThis === this) ? true : oThis)}); // special case: if this element is the given context, set a flag, so this also works after cloning (it should be the cloned element then, not the given one)
		updateRenderingDelegate(this, oDelegate, 1);

		return this;
	};

	/**
	 * Removes the given delegate from this element.
	 *
	 * This method will remove all registrations of the given delegate, not only one.
	 * If the delegate was marked to be cloned and this element has been cloned, the delegate will not be removed from any clones.
	 *
	 * @param {object} oDelegate the delegate object
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @private
	 */
	Element.prototype.removeDelegate = function (oDelegate) {
		var i;
		for (i = 0; i < this.aDelegates.length; i++) {
			if (this.aDelegates[i].oDelegate == oDelegate) {
				this.aDelegates.splice(i, 1);
				updateRenderingDelegate(this, oDelegate, 0);
				i--; // One element removed means the next element now has the index of the current one
			}
		}
		for (i = 0; i < this.aBeforeDelegates.length; i++) {
			if (this.aBeforeDelegates[i].oDelegate == oDelegate) {
				this.aBeforeDelegates.splice(i, 1);
				updateRenderingDelegate(this, oDelegate, 0);
				i--; // One element removed means the next element now has the index of the current one
			}
		}
		return this;
	};


	/**
	 * Adds a delegate that can listen to the browser-, pseudo- and framework events that are handled by this
	 * <code>Element</code> (as opposed to events which are fired by this <code>Element</code>).
	 *
	 * Delegates are simple objects that can have an arbitrary number of event handler methods. See the section
	 * "Handling of Events" in the {@link #constructor} documentation to learn how events will be dispatched
	 * and how event handler methods have to be named to be found.
	 *
	 * If multiple delegates are registered for the same element, they will be called in the order of their
	 * registration. Double registrations are prevented. Before a delegate is added, all registrations of the same
	 * delegate (no matter what value for <code>oThis</code> was used for their registration) are removed and only
	 * then the delegate is added. Note that this might change the position of the delegate in the list of delegates.
	 *
	 * When an element is cloned, all its event delegates will be added to the clone. This behavior is well-suited
	 * for applications which want to add delegates that also work with templates in aggregation bindings.
	 * For control development, the internal <code>addDelegate</code> method may be more suitable. Delegates added
	 * via that method are not cloned automatically, as typically each control instance takes care of adding its
	 * own delegates.
	 *
	 * <strong>Important:</strong> If event delegates were added, the delegate will still be called even if
	 * the event was processed and/or cancelled via <code>preventDefault</code> by the Element or another event delegate.
	 * <code>preventDefault</code> only prevents the event from bubbling.
	 * It should be checked e.g. in the event delegate's listener whether an Element is still enabled via <code>getEnabled</code>.
	 * Additionally there might be other things that delegates need to check depending on the event
	 * (e.g. not adding a key twice to an output string etc.).
	 *
	 * See {@link topic:bdf3e9818cd84d37a18ee5680e97e1c1 Event Handler Methods} for a general explanation of
	 * event handling in controls.
	 *
	 * <b>Note:</b> Setting the special <code>canSkipRendering</code> property to <code>true</code> for the event delegate
	 * object itself lets the framework know that the <code>onBeforeRendering</code> and <code>onAfterRendering</code>
	 * event handlers of the delegate are compatible with the contract of {@link sap.ui.core.RenderManager Renderer.apiVersion 4}.
	 * See example "Adding a rendering delegate...".
	 *
	 * @example <caption>Adding a delegate for the keydown and afterRendering event</caption>
	 * <pre>
	 * var oDelegate = {
	 *   onkeydown: function(){
	 *     // Act when the keydown event is fired on the element
	 *   },
	 *   onAfterRendering: function(){
	 *     // Act when the afterRendering event is fired on the element
	 *   }
	 * };
	 * oElement.addEventDelegate(oDelegate);
	 * </pre>
	 *
	 * @example <caption>Adding a rendering delegate that is compatible with the rendering optimization</caption>
	 * <pre>
	 * var oDelegate = {
	 *   canSkipRendering: true,
	 *   onBeforeRendering: function() {
	 *     // Act when the beforeRendering event is fired on the element
	 *     // The code here only accesses HTML elements inside the root node of the control
	 *   },
	 *   onAfterRendering: function(){
	 *     // Act when the afterRendering event is fired on the element
	 *     // The code here only accesses HTML elements inside the root node of the control
	 *   }
	 * };
	 * oElement.addEventDelegate(oDelegate);
	 * </pre>
	 *
	 * @param {object} oDelegate The delegate object which consists of the event handler names and the corresponding event handler functions
	 * @param {object} [oThis=oDelegate] If given, this object will be the "this" context in the listener methods; default is the delegate object itself
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @since 1.9.0
	 * @public
	 */
	Element.prototype.addEventDelegate = function (oDelegate, oThis) {
		return this.addDelegate(oDelegate, false, oThis, true);
	};

	/**
	 * Removes the given delegate from this element.
	 *
	 * This method will remove all registrations of the given delegate, not only one.
	 *
	 * @example <caption>Removing a delegate for the keydown and afterRendering event. The delegate object which was used when adding the event delegate</caption>
	 * <pre>
	 * var oDelegate = {
	 *   onkeydown: function(){
	 *     // Act when the keydown event is fired on the element
	 *   },
	 *   onAfterRendering: function(){
	 *     // Act when the afterRendering event is fired on the element
	 *   }
	 * };
	 * oElement.removeEventDelegate(oDelegate);
	 * </pre>
	 * @param {object} oDelegate The delegate object which consists of the event handler names and the corresponding event handler functions
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @since 1.9.0
	 * @public
	 */
	Element.prototype.removeEventDelegate = function (oDelegate) {
		return this.removeDelegate(oDelegate);
	};

	/**
	 * Returns the DOM Element that should get the focus or <code>null</code> if there's no such element currently.
	 *
	 * To be overwritten by the specific control method.
	 *
	 * @returns {Element|null} Returns the DOM Element that should get the focus or <code>null</code>
	 * @protected
	 */
	Element.prototype.getFocusDomRef = function () {
		return this.getDomRef() || null;
	};


	/**
	 * Returns the intersection of two intervals. When the intervals don't
	 * intersect at all, <code>null</code> is returned.
	 *
	 * For example, <code>intersection([0, 3], [2, 4])</code> returns
	 * <code>[2, 3]</code>
	 *
	 * @param {number[]} interval1 The first interval
	 * @param {number[]} interval2 The second interval
	 * @returns {number[]|null} The intersection or null when the intervals are apart from each other
	 */
	function intersection(interval1, interval2) {
		if ( interval2[0] > interval1[1] || interval1[0] > interval2[1]) {
			return null;
		} else {
			return [Math.max(interval1[0], interval2[0]), Math.min(interval1[1], interval2[1])];
		}
	}

	/**
	 * Checks whether an element is able to get the focus after {@link #focus} is called.
	 *
	 * An element is treated as 'focusable' when all of the following conditions are met:
	 * <ul>
	 *   <li>The element and all of its parents are not 'busy' or 'blocked',</li>
	 *   <li>the element is rendered at the top layer on the UI and not covered by any other DOM elements, such as an
	 *   opened modal popup or the global <code>BusyIndicator</code>,</li>
	 *   <li>the element matches the browser's prerequisites for being focusable: if it's a natively focusable element,
	 *   for example <code>input</code>, <code>select</code>, <code>textarea</code>, <code>button</code>, and so on, no
	 *   'tabindex' attribute is needed. Otherwise, 'tabindex' must be set. In any case, the element must be visible in
	 *   order to be focusable.</li>
	 * </ul>
	 *
	 * @returns {boolean} Whether the element can get the focus after calling {@link #focus}
	 * @since 1.110
	 * @public
	 */
	Element.prototype.isFocusable = function() {
		var oFocusDomRef = this.getFocusDomRef();

		if (!oFocusDomRef) {
			return false;
		}

		var oCurrentDomRef = oFocusDomRef;
		var aViewport = [[0, window.innerWidth], [0, window.innerHeight]];

		var aIntersectionX;
		var aIntersectionY;

		// find the first element through the parent chain which intersects
		// with the current viewport because document.elementsFromPoint can
		// return meaningful DOM elements only when the given coordinate is
		// within the current view port
		while (!aIntersectionX || !aIntersectionY) {
			var oRect = oCurrentDomRef.getBoundingClientRect();
			aIntersectionX = intersection(aViewport[0], [oRect.x, oRect.x + oRect.width]);
			aIntersectionY = intersection(aViewport[1], [oRect.y, oRect.y + oRect.height]);

			if (oCurrentDomRef.assignedSlot) {
				// assigned slot's bounding client rect has all properties set to 0
				// therefore we jump to the slot's parentElement directly in the next "if...else if...else"
				oCurrentDomRef = oCurrentDomRef.assignedSlot;
			}

			if (oCurrentDomRef.parentElement) {
				oCurrentDomRef = oCurrentDomRef.parentElement;
			} else if (oCurrentDomRef.parentNode && oCurrentDomRef.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
				oCurrentDomRef = oCurrentDomRef.parentNode.host;
			} else {
				break;
			}
		}

		var aElements = document.elementsFromPoint(
			Math.floor((aIntersectionX[0] + aIntersectionX[1]) / 2),
			Math.floor((aIntersectionY[0] + aIntersectionY[1]) / 2)
		);

		var iFocusDomRefIndex = aElements.findIndex(function(oElement) {
			return oElement.contains(oFocusDomRef);
		});

		var iBlockLayerIndex = aElements.findIndex(function(oElement) {
			return oElement.classList.contains("sapUiBLy") || oElement.classList.contains("sapUiBlockLayer");
		});

		if (iBlockLayerIndex !== -1 && iFocusDomRefIndex > iBlockLayerIndex) {
			// when block layer is visible and it's displayed over the Element's DOM
			return false;
		}

		return jQuery(oFocusDomRef).is(":sapFocusable");
	};

	function getAncestorScrollPositions(oDomRef) {
		var oParentDomRef,
			aScrollHierarchy = [];

		oParentDomRef = oDomRef.parentNode;
		while (oParentDomRef) {
			aScrollHierarchy.push({
				node: oParentDomRef,
				scrollLeft: oParentDomRef.scrollLeft,
				scrollTop: oParentDomRef.scrollTop
			});
			oParentDomRef = oParentDomRef.parentNode;
		}

		return aScrollHierarchy;
	}

	function restoreScrollPositions(aScrollHierarchy) {
		aScrollHierarchy.forEach(function(oScrollInfo) {
			var oDomRef = oScrollInfo.node;

			if (oDomRef.scrollLeft !== oScrollInfo.scrollLeft) {
				oDomRef.scrollLeft = oScrollInfo.scrollLeft;
			}

			if (oDomRef.scrollTop !== oScrollInfo.scrollTop) {
				oDomRef.scrollTop = oScrollInfo.scrollTop;
			}
		});
	}

	/**
	 * Sets the focus to the stored focus DOM reference.
	 *
	 * @param {object} [oFocusInfo={}] Options for setting the focus
	 * @param {boolean} [oFocusInfo.preventScroll=false] @since 1.60 if it's set to true, the focused
	 *   element won't be shifted into the viewport if it's not completely visible before the focus is set
 	 * @param {any} [oFocusInfo.targetInfo] Further control-specific setting of the focus target within the control @since 1.98
	 * @public
	 */
	Element.prototype.focus = function (oFocusInfo) {
		var oFocusDomRef = this.getFocusDomRef(),
			aScrollHierarchy = [];

		oFocusInfo = oFocusInfo || {};

		if (oFocusDomRef) {
			// save the scroll position of all ancestor DOM elements
			// before the focus is set, because preventScroll is not supported by the following browsers
			if (Device.browser.safari) {
				if (oFocusInfo.preventScroll === true) {
					aScrollHierarchy = getAncestorScrollPositions(oFocusDomRef);
				}
				oFocusDomRef.focus();
				if (aScrollHierarchy.length > 0) {
					// restore the scroll position if it's changed after setting focus
					// Safari needs a little delay to get the scroll position updated
					setTimeout(restoreScrollPositions.bind(null, aScrollHierarchy), 0);
				}
			} else {
				oFocusDomRef.focus(oFocusInfo);
			}
		}
	};

	/**
	 * Returns an object representing the serialized focus information.
	 *
	 * To be overwritten by the specific control method.
	 *
	 * @returns {object} an object representing the serialized focus information
	 * @protected
	 */
	Element.prototype.getFocusInfo = function () {
		return {id:this.getId()};
	};

	/**
	 * Applies the focus info.
	 *
	 * To be overwritten by the specific control method.
	 *
	 * @param {object} oFocusInfo Focus info object as returned by {@link #getFocusInfo}
	 * @param {boolean} [oFocusInfo.preventScroll=false] @since 1.60 if it's set to true, the focused
	 *   element won't be shifted into the viewport if it's not completely visible before the focus is set
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @protected
	 */
	Element.prototype.applyFocusInfo = function (oFocusInfo) {
		this.focus(oFocusInfo);
		return this;
	};


	/**
	 * Refreshs the tooltip base delegate with the given <code>oTooltip</code>
	 *
	 * @see sap.ui.core.Element#setTooltip
	 * @param {sap.ui.core.TooltipBase} oTooltip The new tooltip
	 * @private
	 */
	Element.prototype._refreshTooltipBaseDelegate = function (oTooltip) {
		var oOldTooltip = this.getTooltip();
		// if the old tooltip was a Tooltip object, remove it as a delegate
		if (BaseObject.isObjectA(oOldTooltip, "sap.ui.core.TooltipBase")) {
			this.removeDelegate(oOldTooltip);
		}
		// if the new tooltip is a Tooltip object, add it as a delegate
		if (BaseObject.isObjectA(oTooltip, "sap.ui.core.TooltipBase")) {
			oTooltip._currentControl = this;
			this.addDelegate(oTooltip);
		}
	};


	/**
	 * Sets a new tooltip for this object.
	 *
	 * The tooltip can either be a simple string (which in most cases will be rendered as the
	 * <code>title</code> attribute of this  Element) or an instance of {@link sap.ui.core.TooltipBase}.
	 *
	 * If a new tooltip is set, any previously set tooltip is deactivated.
	 *
	 * @param {string|sap.ui.core.TooltipBase} vTooltip New tooltip
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	Element.prototype.setTooltip = function(vTooltip) {

		this._refreshTooltipBaseDelegate(vTooltip);
		this.setAggregation("tooltip", vTooltip);

		return this;
	};

	/**
	 * Returns the tooltip for this element if any or an undefined value.
	 * The tooltip can either be a simple string or a subclass of
	 * {@link sap.ui.core.TooltipBase}.
	 *
	 * Callers that are only interested in tooltips of type string (e.g. to render
	 * them as a <code>title</code> attribute), should call the convenience method
	 * {@link #getTooltip_AsString} instead. If they want to get a tooltip text no
	 * matter where it comes from (be it a string tooltip or the text from a TooltipBase
	 * instance) then they could call {@link #getTooltip_Text} instead.
	 *
	 * @returns {string|sap.ui.core.TooltipBase|null} The tooltip for this Element or <code>null</code>.
	 * @public
	 */
	Element.prototype.getTooltip = function() {
		return this.getAggregation("tooltip");
	};

	Element.runWithPreprocessors = ManagedObject.runWithPreprocessors;

	/**
	 * Returns the tooltip for this element but only if it is a simple string.
	 * Otherwise, <code>undefined</code> is returned.
	 *
	 * @returns {string|undefined} string tooltip or <code>undefined</code>
	 * @public
	 */
	Element.prototype.getTooltip_AsString = function() {
		var oTooltip = this.getTooltip();
		if (typeof oTooltip === "string" || oTooltip instanceof String ) {
			return oTooltip;
		}
		return undefined;
	};

	/**
	 * Returns the main text for the current tooltip or <code>undefined</code> if there is no such text.
	 *
	 * If the tooltip is an object derived from <code>sap.ui.core.TooltipBase</code>, then the text property
	 * of that object is returned. Otherwise the object itself is returned (either a string
	 * or <code>undefined</code> or <code>null</code>).
	 *
	 * @returns {string|undefined|null} Text of the current tooltip or <code>undefined</code> or <code>null</code>
	 * @public
	 */
	Element.prototype.getTooltip_Text = function() {
		var oTooltip = this.getTooltip();
		if (oTooltip && typeof oTooltip.getText === "function" ) {
			return oTooltip.getText();
		}
		return oTooltip;
	};

	/**
	 * Destroys the tooltip in the aggregation
	 * named <code>tooltip</code>.
	 * @returns {this} <code>this</code> to allow method chaining
	 * @public
	 * @name sap.ui.core.Element#destroyTooltip
	 * @function
	 */

	/**
	 * Returns the runtime metadata for this UI element.
	 *
	 * When using the defineClass method, this function is automatically created and returns
	 * a runtime representation of the design time metadata.
	 *
	 * @function
	 * @name sap.ui.core.Element.prototype.getMetadata
	 * @return {object} runtime metadata
	 * @public
	 */
	// sap.ui.core.Element.prototype.getMetadata = sap.ui.base.Object.ABSTRACT_METHOD;

	// ---- data container ----------------------------------

	// Note: the real class documentation can be found in sap/ui/core/CustomData so that the right module is
	// shown in the API reference. A reduced copy of the class documentation and the documentation of the
	// settings has to be provided here, close to the runtime metadata to allow extracting the metadata.
	/**
	 * @class
	 * Contains a single key/value pair of custom data attached to an <code>Element</code>.
	 * @public
	 * @alias sap.ui.core.CustomData
	 * @synthetic
	 */
	var CustomData = Element.extend("sap.ui.core.CustomData", /** @lends sap.ui.core.CustomData.prototype */ { metadata : {

		library : "sap.ui.core",
		properties : {

			/**
			 * The key of the data in this CustomData object.
			 * When the data is just stored, it can be any string, but when it is to be written to HTML
			 * (<code>writeToDom == true</code>) then it must also be a valid HTML attribute name.
			 * It must conform to the {@link sap.ui.core.ID} type and may contain no colon. To avoid collisions,
			 * it also may not start with "sap-ui". When written to HTML, the key is prefixed with "data-".
			 * If any restriction is violated, a warning will be logged and nothing will be written to the DOM.
			 */
			key : {type : "string", group : "Data", defaultValue : null},

			/**
			 * The data stored in this CustomData object.
			 * When the data is just stored, it can be any JS type, but when it is to be written to HTML
			 * (<code>writeToDom == true</code>) then it must be a string. If this restriction is violated,
			 * a warning will be logged and nothing will be written to the DOM.
			 */
			value : {type : "any", group : "Data", defaultValue : null},

			/**
			 * If set to "true" and the value is of type "string" and the key conforms to the documented restrictions,
			 * this custom data is written to the HTML root element of the control as a "data-*" attribute.
			 * If the key is "abc" and the value is "cde", the HTML will look as follows:
			 *
			 * <pre>
			 *   &lt;SomeTag ... data-abc="cde" ... &gt;
			 * </pre>
			 *
			 * Thus the application can provide stable attributes by data binding which can be used for styling or
			 * identification purposes.
			 *
			 * <b>ATTENTION:</b> use carefully to not create huge attributes or a large number of them.
			 * @since 1.9.0
			 */
			writeToDom : {type : "boolean", group : "Data", defaultValue : false}
		},
		designtime: "sap/ui/core/designtime/CustomData.designtime"
	}});

	CustomData.prototype.setValue = function(oValue) {
		this.setProperty("value", oValue, true);

		var oControl = this.getParent();
		if (oControl && oControl.getDomRef()) {
			var oCheckResult = this._checkWriteToDom(oControl);
			if (oCheckResult) {
				// update DOM directly
				oControl.$().attr(oCheckResult.key, oCheckResult.value);
			}
		}
		return this;
	};

	CustomData.prototype._checkWriteToDom = function(oRelated) {
		if (!this.getWriteToDom()) {
			return null;
		}

		var key = this.getKey();
		var value = this.getValue();

		function error(reason) {
			future.errorThrows("CustomData with key " + key + " should be written to HTML of " + oRelated + " but " + reason);
			return null;
		}

		if (typeof value != "string") {
			return error("the value is not a string.");
		}

		var ID = DataType.getType("sap.ui.core.ID");

		if (!(ID.isValid(key)) || (key.indexOf(":") != -1)) {
			return error("the key is not valid (must be a valid sap.ui.core.ID without any colon).");
		}

		if (key == F6Navigation.fastNavigationKey) {
			value = /^\s*(x|true)\s*$/i.test(value) ? "true" : "false"; // normalize values
		} else if (key.indexOf("sap-ui") == 0) {
			return error("the key is not valid (may not start with 'sap-ui').");
		}

		return {key: "data-" + key, value: value};

	};

	/**
	 * Returns the data object with the given <code>key</code>
	 *
	 * @private
	 * @param {sap.ui.core.Element} element The element
	 * @param {string} key The key of the desired custom data
	 * @returns {sap.ui.core.CustomData} The custom data
	 */
	function findCustomData(element, key) {
		var aData = element.getAggregation("customData");
		if (aData) {
			for (var i = 0; i < aData.length; i++) {
				if (aData[i].getKey() == key) {
					return aData[i];
				}
			}
		}
		return null;
	}

	/**
	 * Contains the data modification logic
	 *
	 * @private
	 * @param {sap.ui.core.Element} element The element
	 * @param {string} key The key of the desired custom data
	 * @param {string|any} value The value of the desired custom data
	 * @param {boolean} writeToDom Whether this custom data entry should be written to the DOM during rendering
	 */
	function setCustomData(element, key, value, writeToDom) {
		var oDataObject = findCustomData(element, key);

		if (value === null) { // delete this property
			if (!oDataObject) {
				return;
			}
			var dataCount = element.getAggregation("customData").length;
			if (dataCount == 1) {
				element.destroyAggregation("customData", true); // destroy if there is no other data
			} else {
				element.removeAggregation("customData", oDataObject, true);
				oDataObject.destroy();
			}
		} else if (oDataObject) { // change the existing data object
			oDataObject.setValue(value);
			oDataObject.setWriteToDom(writeToDom);
		} else { // add a new data object
			element.addAggregation("customData",
				new CustomData({ key: key, value: value, writeToDom: writeToDom }),
				true);
		}
	}

	/**
	 * Retrieves, modifies or removes custom data attached to an <code>Element</code>.
	 *
	 * Usages:
	 * <h4>Setting the value for a single key</h4>
	 * <pre>
	 *    data("myKey", myData)
	 * </pre>
	 * Attaches <code>myData</code> (which can be any JS data type, e.g. a number, a string, an object, or a function)
	 * to this element, under the given key "myKey". If the key already exists,the value will be updated.
	 *
	 *
	 * <h4>Setting a value for a single key (rendered to the DOM)</h4>
	 * <pre>
	 *    data("myKey", myData, writeToDom)
	 * </pre>
	 * Attaches <code>myData</code> to this element, under the given key "myKey" and (if <code>writeToDom</code>
	 * is true) writes key and value to the HTML. If the key already exists,the value will be updated.
	 * While <code>oValue</code> can be any JS data type to be attached, it must be a string to be also
	 * written to DOM. The key must also be a valid HTML attribute name (it must conform to <code>sap.ui.core.ID</code>
	 * and may contain no colon) and may not start with "sap-ui". When written to HTML, the key is prefixed with "data-".
	 *
	 *
	 * <h4>Getting the value for a single key</h4>
	 * <pre>
	 *    data("myKey")
	 * </pre>
	 * Retrieves whatever data has been attached to this element (using the key "myKey") before.
	 *
	 *
	 * <h4>Removing the value for a single key</h4>
	 * <pre>
	 *    data("myKey", null)
	 * </pre>
	 * Removes whatever data has been attached to this element (using the key "myKey") before.
	 *
	 *
	 * <h4>Removing all custom data for all keys</h4>
	 * <pre>
	 *    data(null)
	 * </pre>
	 *
	 *
	 * <h4>Getting all custom data values as a plain object</h4>
	 * <pre>
	 *    data()
	 * </pre>
	 * Returns all data, as a map-like object, property names are keys, property values are values.
	 *
	 *
	 * <h4>Setting multiple key/value pairs in a single call</h4>
	 * <pre>
	 *    data({"myKey1": myData, "myKey2": null})
	 * </pre>
	 * Attaches <code>myData</code> (using the key "myKey1" and removes any data that had been
	 * attached for key "myKey2".
	 *
	 * @see See chapter {@link topic:91f0c3ee6f4d1014b6dd926db0e91070 Custom Data - Attaching Data Objects to Controls}
	 *    in the documentation.
	 *
	 * @param {string|Object<string,any>|null} [vKeyOrData]
	 *     Single key to set or remove, or an object with key/value pairs or <code>null</code> to remove
	 *     all custom data
	 * @param {string|any} [vValue]
	 *     Value to set or <code>null</code> to remove the corresponding custom data
	 * @param {boolean} [bWriteToDom=false]
	 *     Whether this custom data entry should be written to the DOM during rendering
	 * @returns {Object<string,any>|any|null|sap.ui.core.Element}
	 *     A map with all custom data, a custom data value for a single specified key or <code>null</code>
	 *     when no custom data exists for such a key or this element when custom data was to be removed.
	 * @throws {TypeError}
	 *     When the type of the given parameters doesn't match any of the documented usages
	 * @public
	 */
	Element.prototype.data = function() {
		var argLength = arguments.length;

		if (argLength == 0) {                    // return ALL data as a map
			var aData = this.getAggregation("customData"),
				result = {};
			if (aData) {
				for (var i = 0; i < aData.length; i++) {
					result[aData[i].getKey()] = aData[i].getValue();
				}
			}
			return result;

		} else if (argLength == 1) {
			var arg0 = arguments[0];

			if (arg0 === null) {                  // delete ALL data
				this.destroyAggregation("customData", true); // delete whole map
				return this;

			} else if (typeof arg0 == "string") { // return requested data element
				var dataObject = findCustomData(this, arg0);
				return dataObject ? dataObject.getValue() : null;

			} else if (typeof arg0 == "object") { // should be a map - set multiple data elements
				for (var key in arg0) { // TODO: improve performance and avoid executing setData multiple times
					setCustomData(this, key, arg0[key]);
				}
				return this;

			} else {
				// error, illegal argument
				throw new TypeError("When data() is called with one argument, this argument must be a string, an object or null, but is " + (typeof arg0) + ":" + arg0 + " (on UI Element with ID '" + this.getId() + "')");
			}

		} else if (argLength == 2) {            // set or remove one data element
			setCustomData(this, arguments[0], arguments[1]);
			return this;

		} else if (argLength == 3) {            // set or remove one data element
			setCustomData(this, arguments[0], arguments[1], arguments[2]);
			return this;

		} else {
			// error, illegal arguments
			throw new TypeError("data() may only be called with 0-3 arguments (on UI Element with ID '" + this.getId() + "')");
		}
	};

	/**
	 * Expose CustomData class privately
	 * @private
	 */
	Element._CustomData = CustomData;

	/**
	 * Define CustomData class as the default for the built-in "customData" aggregation.
	 * We need to do this here via the aggregation itself, since the CustomData class is
	 * an Element subclass and thus cannot be directly referenced in Element's metadata definition.
	 */
	Element.getMetadata().getAggregation("customData").defaultClass = CustomData;

	/*
	 * Alternative implementation of <code>Element#data</code> which is applied after an element has been
	 * destroyed. It prevents the creation of new CustomData instances.
	 *
	 * See {@link sap.ui.core.Element.prototype.destroy}
	 */
	function noCustomDataAfterDestroy() {
		// Report and ignore only write calls; read and remove calls are well-behaving
		var argLength = arguments.length;
		if ( argLength === 1 && arguments[0] !== null && typeof arguments[0] == "object"
			 || argLength > 1 && argLength < 4 && arguments[1] !== null ) {
			future.errorThrows("Cannot create custom data on an already destroyed element '" + this + "'");
			return this;
		}
		return Element.prototype.data.apply(this, arguments);
	}


	/**
	 * Create a clone of this Element.
	 *
	 * Calls {@link sap.ui.base.ManagedObject#clone} and additionally clones event delegates.
	 *
	 * @param {string} [sIdSuffix] Suffix to be appended to the cloned element ID
	 * @param {string[]} [aLocalIds] Array of local IDs within the cloned hierarchy (internally used)
	 * @returns {this} reference to the newly created clone
	 * @public
	 */
	Element.prototype.clone = function(sIdSuffix, aLocalIds){

		var oClone = ManagedObject.prototype.clone.apply(this, arguments);
		// Clone delegates
		for ( var i = 0; i < this.aDelegates.length; i++) {
			if (this.aDelegates[i].bClone) {
				oClone.aDelegates.push(this.aDelegates[i]);
			}
		}
		for ( var k = 0; k < this.aBeforeDelegates.length; k++) {
			if (this.aBeforeDelegates[k].bClone) {
				oClone.aBeforeDelegates.push(this.aBeforeDelegates[k]);
			}
		}

		if (this._sapui_declarativeSourceInfo) {
			oClone._sapui_declarativeSourceInfo = Object.assign({}, this._sapui_declarativeSourceInfo);
		}

		return oClone;
	};

	/**
	 * Searches and returns an array of child elements and controls which are
	 * referenced within an aggregation or aggregations of child elements/controls.
	 * This can be either done recursive or not.
	 *
	 * <b>Take care: this operation might be expensive.</b>
	 * @param {boolean}
	 *          bRecursive true, if all nested children should be returned.
	 * @return {sap.ui.core.Element[]} array of child elements and controls
	 * @public
	 * @function
	 */
	Element.prototype.findElements = ManagedObject.prototype.findAggregatedObjects;


	function fireLayoutDataChange(oElement) {
		var oLayout = oElement.getParent();
		if (oLayout) {
			var oEvent = jQuery.Event("LayoutDataChange");
			oEvent.srcControl = oElement;
			oLayout._handleEvent(oEvent);
		}
	}

	/**
	 * Sets the {@link sap.ui.core.LayoutData} defining the layout constraints
	 * for this control when it is used inside a layout.
	 *
	 * @param {sap.ui.core.LayoutData} oLayoutData which should be set
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	Element.prototype.setLayoutData = function(oLayoutData) {
		this.setAggregation("layoutData", oLayoutData, true); // No invalidate because layout data changes does not affect the control / element itself
		fireLayoutDataChange(this);
		return this;
	};

	/*
	 * The LayoutDataChange event needs to be propagated on destruction of the aggregation.
	 */
	Element.prototype.destroyLayoutData = function() {
		this.destroyAggregation("layoutData", true);
		fireLayoutDataChange(this);
		return this;
	};

	/**
	 * Allows the parent of a control to enhance the ARIA information during rendering.
	 *
	 * This function is called by the RenderManager's
	 * {@link sap.ui.core.RenderManager#accessibilityState accessibilityState} and
	 * {@link sap.ui.core.RenderManager#writeAccessibilityState writeAccessibilityState} methods
	 * for the parent of the currently rendered control - if the parent implements it.
	 *
	 * <b>Note:</b> Setting the special <code>canSkipRendering</code> property of the <code>mAriaProps</code> parameter to <code>true</code> lets the <code>RenderManager</code> know
	 * that the accessibility enhancement is static and does not interfere with the child control's {@link sap.ui.core.RenderManager Renderer.apiVersion 4} rendering optimization.
	 *
	 * @example <caption>Setting an accessibility state that is compatible with the rendering optimization</caption>
	 * <pre>
	 * MyControl.prototype.enhanceAccessibilityState = function(oElement, mAriaProps) {
	 *     mAriaProps.label = "An appropriate label from the parent";
	 *     mAriaProps.canSkipRendering = true;
	 * };
	 * </pre>
	 *
	 * @function
	 * @name sap.ui.core.Element.prototype.enhanceAccessibilityState
	 * @param {sap.ui.core.Element} oElement
	 *   The Control/Element for which ARIA properties are collected
	 * @param {object} mAriaProps
	 *   Map of ARIA properties keyed by their name (without prefix "aria-"); the method
	 *   implementation can enhance this map in any way (add or remove properties, modify values)
	 * @protected
	 * @abstract
	 */

	/**
	 * Bind the object to the referenced entity in the model, which is used as the binding context
	 * to resolve bound properties or aggregations of the object itself and all of its children
	 * relatively to the given path.
	 *
	 * If a relative binding path is used, this will be applied whenever the parent context changes.
	 *
	 * There's no difference between <code>bindElement</code> and {@link sap.ui.base.ManagedObject#bindObject}.
	 *
	 * @param {string|sap.ui.base.ManagedObject.ObjectBindingInfo} vPath the binding path or an object with more detailed binding options
	 * @param {object} [mParameters] map of additional parameters for this binding.
	 * Only taken into account when <code>vPath</code> is a string. In that case it corresponds to <code>mParameters</code> of {@link sap.ui.base.ManagedObject.ObjectBindingInfo}.
	 * The supported parameters are listed in the corresponding model-specific implementation of <code>sap.ui.model.ContextBinding</code>.
	 *
	 * @returns {this} reference to the instance itself
	 * @public
	 * @function
	 * @see {@link sap.ui.base.ManagedObject#bindObject}
	 */
	Element.prototype.bindElement = ManagedObject.prototype.bindObject;

	/**
	 * Removes the defined binding context of this object, all bindings will now resolve
	 * relative to the parent context again.
	 *
	 * @param {string} sModelName
	 * @return {sap.ui.base.ManagedObject} reference to the instance itself
	 * @public
	 * @function
	 */
	Element.prototype.unbindElement = ManagedObject.prototype.unbindObject;

	/**
	 * Get the context binding object for a specific model name.
	 *
	 * <b>Note:</b> to be compatible with future versions of this API, you must not use the following model names:
	 * <ul>
	 * <li><code>null</code></li>
	 * <li>empty string <code>""</code></li>
	 * <li>string literals <code>"null"</code> or <code>"undefined"</code></li>
	 * </ul>
	 * Omitting the model name (or using the value <code>undefined</code>) is explicitly allowed and
	 * refers to the default model.
	 *
	 * @param {string} [sModelName=undefined] Name of the model or <code>undefined</code>
	 * @return {sap.ui.model.ContextBinding|undefined} Context binding for the given model name or <code>undefined</code>
	 * @public
	 * @function
	 */
	Element.prototype.getElementBinding = ManagedObject.prototype.getObjectBinding;

	/*
	 * If Control has no FieldGroupIds use the one of the parents.
	 */
	Element.prototype._getFieldGroupIds = function() {

		var aFieldGroupIds;
		if (this.getMetadata().hasProperty("fieldGroupIds")) {
			aFieldGroupIds = this.getFieldGroupIds();
		}

		if (!aFieldGroupIds || aFieldGroupIds.length == 0) {
			var oParent = this.getParent();
			if (oParent && oParent._getFieldGroupIds) {
				return oParent._getFieldGroupIds();
			}
		}

		return aFieldGroupIds || [];

	};

	/**
	 * Returns a DOM Element representing the given property or aggregation of this <code>Element</code>.
	 *
	 * Check the documentation for the <code>selector</code> metadata setting in {@link sap.ui.base.ManagedObject.extend}
	 * for details about its syntax or its expected result.
	 *
	 * The default implementation of this method will return <code>null</code> in any of the following cases:
	 * <ul>
	 * <li>no setting (property or aggregation) with the given name exists in the class of this <code>Element</code></li>
	 * <li>the setting has no selector defined in its metadata</li>
	 * <li>{@link #getDomRef this.getDomRef()} returns no DOM Element for this <code>Element</code>
	 *     or the returned DOM Element has no parentNode</li>
	 * <li>the selector does not match anything in the context of <code>this.getDomRef().parentNode</code></li>
	 * </ul>
	 * If more than one DOM Element within the element matches the selector, the first occurrence is returned.
	 *
	 * Subclasses can override this method to handle more complex cases which can't be described by a CSS selector.
	 *
	 * @param {string} sSettingsName Name of the property or aggregation
	 * @returns {Element} The first matching DOM Element for the setting or <code>null</code>
	 * @throws {SyntaxError} When the selector string in the metadata is not a valid CSS selector group
	 * @private
	 * @ui5-restricted drag and drop, sap.ui.dt
	 */
	Element.prototype.getDomRefForSetting = function (sSettingsName) {
		var oSetting = this.getMetadata().getAllSettings()[sSettingsName];
		if (oSetting && oSetting.selector) {
			var oDomRef = this.getDomRef();
			if (oDomRef) {
				oDomRef = oDomRef.parentNode;
				if (oDomRef && oDomRef.querySelector ) {
					var sSelector = oSetting.selector.replace(/\{id\}/g, this.getId().replace(/(:|\.)/g,'\\$1'));
					return oDomRef.querySelector(sSelector);
				}
			}
		}
		return null;
	};

	//*************** MEDIA REPLACEMENT ***********************//

	/**
	 * Returns the contextual width of an element, if set, or <code>undefined</code> otherwise
	 *
	 * @returns {*} The contextual width
	 * @private
	 * @ui5-restricted
	 */
	Element.prototype._getMediaContainerWidth = function () {
		if (typeof this._oContextualSettings === "undefined") {
			return undefined;
		}

		return this._oContextualSettings.contextualWidth;
	};

	/**
	 * Returns the current media range of the Device or the closest media container
	 *
	 * @param {string} [sName=Device.media.RANGESETS.SAP_STANDARD] The name of the range set
	 * @returns {object} Information about the current active interval of the range set.
	 *  The returned object has the same structure as the argument of the event handlers ({@link sap.ui.Device.media.attachHandler})
	 * @private
	 * @ui5-restricted
	 */
	Element.prototype._getCurrentMediaContainerRange = function (sName) {
		var iWidth = this._getMediaContainerWidth();

		sName = sName || Device.media.RANGESETS.SAP_STANDARD;

		return Device.media.getCurrentRange(sName, iWidth);
	};

	/**
	 * Called whenever there is a change in contextual settings for the Element
	 * @private
	 */
	Element.prototype._onContextualSettingsChanged = function () {
		var iWidth = this._getMediaContainerWidth(),
			bShouldUseContextualWidth = iWidth !== undefined,
			bProviderChanged = bShouldUseContextualWidth ^ !!this._bUsingContextualWidth,// true, false or false, true (convert to boolean in case of default undefined)
			aListeners = this._aContextualWidthListeners || [];

		if (bProviderChanged) {

			if (bShouldUseContextualWidth) {
				// Contextual width was set for an element that was already using Device.media => Stop using Device.media
				aListeners.forEach(function (oL) {
					Device.media.detachHandler(oL.callback, oL.listener, oL.name);
				});
			} else {
				// Contextual width was unset for an element that had listeners => Start using Device.media
				aListeners.forEach(function (oL) {
					Device.media.attachHandler(oL.callback, oL.listener, oL.name);
				});
			}

			this._bUsingContextualWidth = bShouldUseContextualWidth;
		}

		// Notify all listeners, for which a media breakpoint change occurred, based on their RangeSet
		aListeners.forEach(function (oL) {
			var oMedia = this._getCurrentMediaContainerRange(oL.name);
			if (oMedia && oMedia.from !== oL.media.from) {
				oL.media = oMedia;
				oL.callback.call(oL.listener || window, oMedia);
			}
		}, this);
	};

	/**
	 * Registers the given event handler to change events of the screen width/closest media container width,
	 *  based on the range set with the given <code>sName</code>.
	 *
	 * @param {function} fnFunction The handler function to call when the event occurs.
	 *  This function will be called in the context of the <code>oListener</code> instance (if present) or
	 *  on the element instance.
	 * @param {object} oListener The object that wants to be notified when the event occurs
	 *  (<code>this</code> context within the handler function).
	 *  If it is not specified, the handler function is called in the context of the element.
	 * @param {string} sName The name of the desired range set
	 * @private
	 * @ui5-restricted
	 */
	Element.prototype._attachMediaContainerWidthChange = function (fnFunction, oListener, sName) {
		sName = sName || Device.media.RANGESETS.SAP_STANDARD;

		// Add the listener to the list (and optionally initialize the list first)
		this._aContextualWidthListeners = this._aContextualWidthListeners || [];
		this._aContextualWidthListeners.push({
			callback: fnFunction,
			listener: oListener,
			name: sName,
			media: this._getCurrentMediaContainerRange(sName)
		});

		// Register to Device.media, unless contextual width was set
		if (!this._bUsingContextualWidth) {
			Device.media.attachHandler(fnFunction, oListener, sName);
		}
	};

	/**
	 * Removes a previously attached event handler from the change events of the screen width/closest media container width.
	 *
	 * @param {function} fnFunction The handler function to call when the event occurs.
	 *  This function will be called in the context of the <code>oListener</code> instance (if present) or
	 *  on the element instance.
	 * @param {object} oListener The object that wants to be notified when the event occurs
	 *  (<code>this</code> context within the handler function).
	 *  If it is not specified, the handler function is called in the context of the element.
	 * @param {string} sName The name of the desired range set
	 * @private
	 * @ui5-restricted
	 */
	Element.prototype._detachMediaContainerWidthChange = function (fnFunction, oListener, sName) {
		var oL;

		sName = sName || Device.media.RANGESETS.SAP_STANDARD;

		// Do nothing if the Element doesn't have any listeners
		if (!this._aContextualWidthListeners) {
			return;
		}

		for (var i = 0, iL = this._aContextualWidthListeners.length; i < iL; i++) {
			oL = this._aContextualWidthListeners[i];
			if (oL.callback === fnFunction && oL.listener === oListener && oL.name === sName) {

				// De-register from Device.media, if using it
				if (!this._bUsingContextualWidth) {
					Device.media.detachHandler(fnFunction, oListener, sName);
				}

				this._aContextualWidthListeners.splice(i,1);
				break;
			}
		}
	};

	var FocusHandler;
	Element._updateFocusInfo = function(oElement) {
		FocusHandler = FocusHandler || sap.ui.require("sap/ui/core/FocusHandler");
		if (FocusHandler) {
			FocusHandler.updateControlFocusInfo(oElement);
		}
	};

	/**
	 * Returns the nearest [UI5 Element]{@link sap.ui.core.Element} that wraps the given DOM element.
	 *
	 * A DOM element or a CSS selector is accepted as a given parameter. When a CSS selector is given as parameter, only
	 * the first DOM element that matches the CSS selector is taken to find the nearest UI5 Element that wraps it. When
	 * no UI5 Element can be found, <code>undefined</code> is returned.
	 *
	 * @param {HTMLElement|string} vParam A DOM Element or a CSS selector from which to start the search for the nearest
	 *  UI5 Element by traversing up the DOM tree
	 * @param {boolean} [bIncludeRelated=false] Whether the <code>data-sap-ui-related</code> attribute is also accepted
	 *  as a selector for a UI5 Element, in addition to <code>data-sap-ui</code>
	 * @returns {sap.ui.core.Element|undefined} The UI5 Element that wraps the given DOM element. <code>undefined</code> is
	 *  returned when no UI5 Element can be found.
	 * @public
	 * @since 1.106
	 * @throws {DOMException} when an invalid CSS selector is given
	 *
	 */
	Element.closestTo = function(vParam, bIncludeRelated) {
		var sSelector = "[data-sap-ui]",
			oDomRef, sId;

		if (vParam === undefined || vParam === null) {
			return undefined;
		}

		if (typeof vParam === "string") {
			oDomRef = document.querySelector(vParam);
		} else if (vParam instanceof window.Element){
			oDomRef = vParam;
		} else if (vParam.jquery) {
			oDomRef = vParam[0];
			future.errorThrows("Do not call Element.closestTo() with jQuery object as parameter. The function should be called with either a DOM Element or a CSS selector.");
		} else {
			throw new TypeError("Element.closestTo accepts either a DOM element or a CSS selector string as parameter, but not '" + vParam + "'");
		}

		if (bIncludeRelated) {
			sSelector += ",[data-sap-ui-related]";
		}

		oDomRef = oDomRef && oDomRef.closest(sSelector);

		if (oDomRef) {
			if (bIncludeRelated) {
				sId = oDomRef.getAttribute("data-sap-ui-related");
			}

			sId = sId || oDomRef.getAttribute("id");
		}

		return Element.getElementById(sId);
	};

	/**
	 * Returns the registered element with the given ID, if any.
	 *
	 * The ID must be the globally unique ID of an element, the same as returned by <code>oElement.getId()</code>.
	 *
	 * When the element has been created from a declarative source (e.g. XMLView), that source might have used
	 * a shorter, non-unique local ID. A search for such a local ID cannot be executed with this method.
	 * It can only be executed on the corresponding scope (e.g. on an XMLView instance), by using the
	 * {@link sap.ui.core.mvc.View#byId View#byId} method of that scope.
	 *
	 * @param {sap.ui.core.ID|null|undefined} sId ID of the element to search for
	 * @returns {sap.ui.core.Element|undefined} Element with the given ID or <code>undefined</code>
	 * @public
	 * @function
	 * @since 1.119
	 */
	Element.getElementById = ElementRegistry.get;

	/**
	 * Returns the element currently in focus.
	 *
	 * @returns {sap.ui.core.Element|undefined} The currently focused element
	 * @public
	 * @since 1.119
	 */
	Element.getActiveElement = () => {
		try {
			var $Act = jQuery(document.activeElement);
			if ($Act.is(":focus")) {
				return Element.closestTo($Act[0]);
			}
		} catch (err) {
			//escape eslint check for empty block
		}
	};

	/**
	 * Registry of all <code>sap.ui.core.Element</code>s that currently exist.
	 *
	 * @namespace sap.ui.core.Element.registry
	 * @public
	 * @since 1.67
	 * @deprecated As of version 1.120. Use {@link module:sap/ui/core/ElementRegistry} instead.
	 * @borrows module:sap/ui/core/ElementRegistry.size as size
	 * @borrows module:sap/ui/core/ElementRegistry.all as all
	 * @borrows module:sap/ui/core/ElementRegistry.get as get
	 * @borrows module:sap/ui/core/ElementRegistry.forEach as forEach
	 * @borrows module:sap/ui/core/ElementRegistry.filter as filter
	 */
	Element.registry = ElementRegistry;

	Theming.attachApplied(function(oEvent) {
		// notify all elements/controls via a pseudo browser event
		var oJQueryEvent = jQuery.Event("ThemeChanged");
		oJQueryEvent.theme = oEvent.theme;
		ElementRegistry.forEach(function(oElement) {
			oJQueryEvent._bNoReturnValue = true; // themeChanged handler aren't allowed to have any retun value. Mark for future fatal throw.
			oElement._handleEvent(oJQueryEvent);
		});
	});

	_LocalizationHelper.registerForUpdate("Elements", ElementRegistry.all);

	return Element;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.ElementMetadata
sap.ui.predefine("sap/ui/core/ElementMetadata", [
	'sap/base/Log',
	'sap/base/util/ObjectPath',
	'sap/ui/base/ManagedObjectMetadata',
	'sap/ui/core/Lib',
	'sap/ui/core/Renderer'
],
	function(Log, ObjectPath, ManagedObjectMetadata, Library, Renderer) {
	"use strict";

	/**
	 * Control Renderer
	 *
	 * @typedef {object} sap.ui.core.ControlRenderer
	 * @public
	 *
	 * @property {function(sap.ui.core.RenderManager, sap.ui.core.Element):void} render
	 *  The function that renders the control
	 * @property {1|2|4} [apiVersion] The API version of the RenderManager that are used in this renderer. See {@link
	 *  sap.ui.core.RenderManager RenderManager} API documentation for detailed information
	 */

	/**
	 * Creates a new metadata object for a UIElement subclass.
	 *
	 * @param {string} sClassName fully qualified name of the class that is described by this metadata object
	 * @param {object} oClassInfo static info to construct the metadata from
	 * @param {sap.ui.core.Element.MetadataOptions} [oClassInfo.metadata]
	 *  The metadata object describing the class
	 *
	 * @class
	 * @author SAP SE
	 * @version 1.125.0
	 * @since 0.8.6
	 * @alias sap.ui.core.ElementMetadata
	 * @extends sap.ui.base.ManagedObjectMetadata
	 * @public
	 */
	var ElementMetadata = function(sClassName, oClassInfo) {

		// call super constructor
		ManagedObjectMetadata.apply(this, arguments);
	};

	//chain the prototypes
	ElementMetadata.prototype = Object.create(ManagedObjectMetadata.prototype);
	ElementMetadata.prototype.constructor = ElementMetadata;

	/**
	 * Calculates a new id based on a prefix.
	 *
	 * @return {string} A (hopefully unique) control id
	 * @public
	 * @function
	 */
	ElementMetadata.uid = ManagedObjectMetadata.uid;

	/**
	 * By default, the element name is equal to the class name
	 * @return {string} the qualified name of the UIElement class
	 * @public
	 */
	ElementMetadata.prototype.getElementName = function() {
		return this._sClassName;
	};

	/**
	 * Determines the class name of the renderer for the described control class.
	 *
	 * @returns {string} The renderer name
	 */
	ElementMetadata.prototype.getRendererName = function() {
		return this._sRendererName;
	};

	/**
	 * Retrieves the renderer for the described control class
	 *
	 * If no renderer exists <code>undefined</code> is returned
	 * @returns {sap.ui.core.ControlRenderer|undefined} The renderer
	 */
	ElementMetadata.prototype.getRenderer = function() {

		if ( this._oRenderer ) {
			return this._oRenderer;
		}

		// determine name via function for those legacy controls that override getRendererName()
		var sRendererName = this.getRendererName();

		if ( !sRendererName ) {
			return undefined;
		}

		// check if renderer class exists already, in case it was passed inplace,
		// and written to the global namespace during applySettings().
		this._oRenderer = sap.ui.require(sRendererName.replace(/\./g, "/"));

		/**
		 * @deprecated
		 */
		(() => {
			if (!this._oRenderer) {
				this._oRenderer = ObjectPath.get(sRendererName);
			}

			if (!this._oRenderer) {
				// if not, try to load a module with the same name
				Log.warning("Synchronous loading of Renderer for control class '" + this.getName() + "', due to missing Renderer dependency.", "SyncXHR", null, function() {
					return {
						type: "SyncXHR",
						name: sRendererName
					};
				});

				// Relevant for all controls that don't maintain the renderer module in their dependencies
				this._oRenderer =
					sap.ui.requireSync(sRendererName.replace(/\./g, "/")) // legacy-relevant
					|| ObjectPath.get(sRendererName);
			}
		})();

		return this._oRenderer;
	};

	ElementMetadata.prototype.applySettings = function(oClassInfo) {

		var oStaticInfo = oClassInfo.metadata;

		this._sVisibility = oStaticInfo.visibility || "public";

		// remove renderer stuff before calling super.
		var vRenderer = Object.hasOwn(oClassInfo, "renderer") ? (oClassInfo.renderer || "") : undefined;
		delete oClassInfo.renderer;

		ManagedObjectMetadata.prototype.applySettings.call(this, oClassInfo);

		var oParent = this.getParent();
		this._sRendererName = this.getName() + "Renderer";
		this.dnd = Object.assign({
			draggable: false,
			droppable: false
		}, oParent.dnd, (typeof oStaticInfo.dnd == "boolean") ? {
			draggable: oStaticInfo.dnd,
			droppable: oStaticInfo.dnd
		} : oStaticInfo.dnd);

		if ( typeof vRenderer !== "undefined" ) {

			if ( typeof vRenderer === "string" ) {
				this._sRendererName = vRenderer || undefined;
				return;
			}

			// try to identify fully built renderers
			if ( (typeof vRenderer === "object" || typeof vRenderer === "function") && typeof vRenderer.render === "function" ) {
				var oRenderer = sap.ui.require(this.getRendererName().replace(/\./g, "/"));
				/**
				 * @deprecated
				 */
				if (!oRenderer) {
					oRenderer = ObjectPath.get(this.getRendererName());
				}
				if ( oRenderer === vRenderer ) {
					// the given renderer has been exported globally already, it can be used without further action
					this._oRenderer = vRenderer;
					return;
				}
				if ( oRenderer === undefined && typeof vRenderer.extend === "function" ) {
					// the given renderer has an 'extend' method, so it most likely has been created by one of the
					// extend methods and it is usable already; it just has to be exported globally
					/**
					 * @deprecated
					 */
					ObjectPath.set(this.getRendererName(), vRenderer);
					this._oRenderer = vRenderer;
					return;
				}
			}

			if ( typeof vRenderer === "function" ) {
				vRenderer = { render : vRenderer };
			}

			var oBaseRenderer;
			if ( oParent instanceof ElementMetadata ) {
				oBaseRenderer = oParent.getRenderer();
			}
			this._oRenderer = Renderer.extend.call(oBaseRenderer || Renderer, this.getRendererName(), vRenderer);
		}
	};

	ElementMetadata.prototype.afterApplySettings = function() {
		ManagedObjectMetadata.prototype.afterApplySettings.apply(this, arguments);
		Library._registerElement(this);
	};

	ElementMetadata.prototype.isHidden = function() {
		return this._sVisibility === "hidden";
	};


	// ---- Aggregation -----------------------------------------------------------------------

	var fnMetaFactoryAggregation = ElementMetadata.prototype.metaFactoryAggregation;

	function Aggregation(oClass, name, info) {
		fnMetaFactoryAggregation.apply(this, arguments);
		this.dnd = Object.assign({
			draggable: false,
			droppable: false,
			layout: "Vertical"
		}, (typeof info.dnd == "boolean") ? {
			draggable: info.dnd,
			droppable: info.dnd
		} : info.dnd);
	}

	Aggregation.prototype = Object.create(fnMetaFactoryAggregation.prototype);
	Aggregation.prototype.constructor = Aggregation;
	ElementMetadata.prototype.metaFactoryAggregation = Aggregation;

	/**
	 * Returns an info object describing the drag-and-drop behavior.
	 *
	 * @param {string} [sAggregationName] name of the aggregation or empty.
	 * @returns {sap.ui.core.Element.MetadataOptions.DnD} An info object about the drag-and-drop behavior.
	 * @public
	 * @since 1.56
	 */
	ElementMetadata.prototype.getDragDropInfo = function(sAggregationName) {
		if (!sAggregationName) {
			return this.dnd;
		}

		var oAggregation = this._mAllAggregations[sAggregationName] || this._mAllPrivateAggregations[sAggregationName];
		if (!oAggregation) {
			return {};
		}

		return oAggregation.dnd;
	};

	return ElementMetadata;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/core/ElementRegistry", [
	"sap/base/Log",
	"sap/ui/base/ManagedObjectRegistry",
	"sap/ui/core/Configuration"
], (
	Log,
	ManagedObjectRegistry,
	Configuration
) => {
	"use strict";

	const fnOnDuplicate = function(sId, oldElement, newElement) {
		if ( oldElement._sapui_candidateForDestroy ) {
			Log.debug("destroying dangling template " + oldElement + " when creating new object with same ID");
			oldElement.destroy();
		} else {
			var sMsg = "adding element with duplicate id '" + sId + "'";
			/**
			 * duplicate ID detected => fail or at least log a warning
			 * @deprecated As of Version 1.120.
			 */
			if (!Configuration.getNoDuplicateIds()) {
				Log.warning(sMsg);
				return;
			}
			Log.error(sMsg);
			throw new Error("Error: " + sMsg);
		}
	};

	/**
	 * Registry of all <code>sap.ui.core.Element</code>s that currently exist.
	 *
	 * @alias module:sap/ui/core/ElementRegistry
	 * @namespace
	 * @public
	 * @since 1.120
	 */
	const ElementRegistry = ManagedObjectRegistry.create({
		"onDuplicate": fnOnDuplicate
	});

	/**
	 * Number of existing elements.
	 *
	 * @type {int}
	 * @readonly
	 * @name module:sap/ui/core/ElementRegistry.size
	 * @public
	 */

	/**
	 * Return an object with all instances of <code>sap.ui.core.Element</code>,
	 * keyed by their ID.
	 *
	 * Each call creates a new snapshot object. Depending on the size of the UI,
	 * this operation therefore might be expensive. Consider to use the <code>forEach</code>
	 * or <code>filter</code> method instead of executing similar operations on the returned
	 * object.
	 *
	 * <b>Note</b>: The returned object is created by a call to <code>Object.create(null)</code>,
	 * and therefore lacks all methods of <code>Object.prototype</code>, e.g. <code>toString</code> etc.
	 *
	 * @returns {Object<sap.ui.core.ID,sap.ui.core.Element>} Object with all elements, keyed by their ID
	 * @name module:sap/ui/core/ElementRegistry.all
	 * @function
	 * @public
	 */

	/**
	 * Retrieves an Element by its ID.
	 *
	 * When the ID is <code>null</code> or <code>undefined</code> or when there's no element with
	 * the given ID, then <code>undefined</code> is returned.
	 *
	 * @param {sap.ui.core.ID} id ID of the element to retrieve
	 * @returns {sap.ui.core.Element|undefined} Element with the given ID or <code>undefined</code>
	 * @name module:sap/ui/core/ElementRegistry.get
	 * @function
	 * @public
	 */

	/**
	 * Calls the given <code>callback</code> for each element.
	 *
	 * The expected signature of the callback is
	 * <pre>
	 *    function callback(oElement, sID)
	 * </pre>
	 * where <code>oElement</code> is the currently visited element instance and <code>sID</code>
	 * is the ID of that instance.
	 *
	 * The order in which the callback is called for elements is not specified and might change between
	 * calls (over time and across different versions of UI5).
	 *
	 * If elements are created or destroyed within the <code>callback</code>, then the behavior is
	 * not specified. Newly added objects might or might not be visited. When an element is destroyed during
	 * the filtering and was not visited yet, it might or might not be visited. As the behavior for such
	 * concurrent modifications is not specified, it may change in newer releases.
	 *
	 * If a <code>thisArg</code> is given, it will be provided as <code>this</code> context when calling
	 * <code>callback</code>. The <code>this</code> value that the implementation of <code>callback</code>
	 * sees, depends on the usual resolution mechanism. E.g. when <code>callback</code> was bound to some
	 * context object, that object wins over the given <code>thisArg</code>.
	 *
	 * @param {function(sap.ui.core.Element,sap.ui.core.ID)} callback
	 *        Function to call for each element
	 * @param {Object} [thisArg=undefined]
	 *        Context object to provide as <code>this</code> in each call of <code>callback</code>
	 * @throws {TypeError} If <code>callback</code> is not a function
	 * @name module:sap/ui/core/ElementRegistry.forEach
	 * @function
	 * @public
	 */

	/**
	 * Returns an array with elements for which the given <code>callback</code> returns a value that coerces
	 * to <code>true</code>.
	 *
	 * The expected signature of the callback is
	 * <pre>
	 *    function callback(oElement, sID)
	 * </pre>
	 * where <code>oElement</code> is the currently visited element instance and <code>sID</code>
	 * is the ID of that instance.
	 *
	 * If elements are created or destroyed within the <code>callback</code>, then the behavior is
	 * not specified. Newly added objects might or might not be visited. When an element is destroyed during
	 * the filtering and was not visited yet, it might or might not be visited. As the behavior for such
	 * concurrent modifications is not specified, it may change in newer releases.
	 *
	 * If a <code>thisArg</code> is given, it will be provided as <code>this</code> context when calling
	 * <code>callback</code>. The <code>this</code> value that the implementation of <code>callback</code>
	 * sees, depends on the usual resolution mechanism. E.g. when <code>callback</code> was bound to some
	 * context object, that object wins over the given <code>thisArg</code>.
	 *
	 * This function returns an array with all elements matching the given predicate. The order of the
	 * elements in the array is not specified and might change between calls (over time and across different
	 * versions of UI5).
	 *
	 * @param {function(sap.ui.core.Element,sap.ui.core.ID):boolean} callback
	 *        predicate against which each element is tested
	 * @param {Object} [thisArg=undefined]
	 *        context object to provide as <code>this</code> in each call of <code>callback</code>
	 * @returns {sap.ui.core.Element[]}
	 *        Array of elements matching the predicate; order is undefined and might change in newer versions of UI5
	 * @throws {TypeError} If <code>callback</code> is not a function
	 * @name module:sap/ui/core/ElementRegistry.filter
	 * @function
	 * @public
	 */

	return ElementRegistry;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides mixin sap.ui.core.EnabledPropagator
sap.ui.predefine("sap/ui/core/EnabledPropagator", [
	"sap/ui/dom/jquery/Selectors"// jQuery custom selectors ":focusable"
], function() {
	"use strict";

	/**
	 * Mixin for enhancement of a control prototype with propagation of the <code>enabled</code> property.
	 *
	 * Controls that apply this mixin calculate their effective <code>enabled</code> state on read access
	 * as the logical OR of their own <code>enabled</code> property and the <code>enabled</code> state
	 * of the nearest ancestor control which has either an <code>enabled</code> property or a
	 * <code>getEnabled</code> method.
	 *
	 * Applying this mixin adds the <code>enabled</code> property, if it not already exists, to the control
	 * metadata.
	 *
	 * Also adds the <code>useEnabledPropagator(boolean)</code> helper method to the prototype of the given control.
	 * <code>myControlInstance.useEnabledPropagator(false)</code> can be used to prevent a single instance from using
	 * <code>EnabledPropagator</code>. In this case, the effective <code>enabled</code> state does not take any
	 * ancestors <code>enabled</code> state into account, only the control's own <code>enabled</code> property.
	 *
	 * @example <caption>Usage Example:</caption>
	 * sap.ui.define(["sap/ui/core/Control", "sap/ui/core/EnabledPropagator"], function(Control, EnabledPropagator) {
	 *    "use strict";
	 *    var MyControl = Control.extend("my.MyControl", {
	 *       metadata : {
	 *          //...
	 *       }
	 *       //...
	 *    });
	 *
	 *    EnabledPropagator.apply(MyControl.prototype);
	 *
	 *    return MyControl;
	 * });
	 *
	 * @param {boolean} [bDefault=true] Value that should be used as default value for the enhancement of the control.
	 * @param {boolean} [bLegacy=false] Whether the introduced property should use the old name <code>Enabled</code>.
	 * @version 1.125.0
	 * @public
	 * @class
	 * @alias sap.ui.core.EnabledPropagator
	 */
	var EnabledPropagator = function(bDefault, bLegacy) {
		// Ensure only Controls are enhanced
		if (!this.isA || !this.isA("sap.ui.core.Control")) {
			throw new Error("EnabledPropagator only supports subclasses of Control");
		}

		// Marker for the EnabledPropagator
		this._bUseEnabledPropagator = true;

		// Ensure not to overwrite existing implementations.
		var fnOrigGet = this.getEnabled;
		if (fnOrigGet === undefined) {
			// set some default
			this.getEnabled = function() {
				return (this._bUseEnabledPropagator && hasDisabledAncestor(this)) ? false : this.getProperty("enabled");
			};

			// Default for the bDefault
			bDefault = (bDefault === undefined) ? true : Boolean(bDefault);

			if ( bLegacy ) {
				// add Enabled with old spelling for compatibility reasons. Shares the getter and setter with new spelling.
				this.getMetadata().addProperty("Enabled", {type : "boolean", group : "Behavior", defaultValue : bDefault});
			}
			this.getMetadata().addProperty("enabled", {type : "boolean", group : "Behavior", defaultValue : bDefault});
			this.getMetadata().addPublicMethods("getEnabled");

		} else {
			this.getEnabled = function() {
				return (this._bUseEnabledPropagator && hasDisabledAncestor(this)) ? false : fnOrigGet.apply(this, arguments);
			};
		}

		if (this.setEnabled === undefined) {
			this.setEnabled = function(bEnabled) {
				checkAndMoveFocus(this, bEnabled);
				return this.setProperty("enabled", bEnabled);
			};

			this.getMetadata().addPublicMethods("setEnabled");
		} else {
			var fnOrigSet = this.setEnabled;

			this.setEnabled = function(bEnabled) {
				checkAndMoveFocus(this, bEnabled);
				return fnOrigSet.apply(this, arguments);
			};
		}

		// enhance with the helper method to exclude a single instance from being use of EnabledPropagator
		this.useEnabledPropagator = function(bUseEnabledPropagator) {
			this._bUseEnabledPropagator = bUseEnabledPropagator;
		};

		this.getMetadata().addPublicMethods("useEnabledPropagator");
	};

	/**
	 * Invalidates the descendants of the provided root element that are implementing the EnabledPropagator mixin
	 *
	 * @param {sap.ui.core.Element} oRootElement The root element instance
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	EnabledPropagator.updateDescendants = function(oRootElement) {
		oRootElement.isActive() && oRootElement.findElements(true, function(oElement) {
			if (oElement._bUseEnabledPropagator && oElement.bOutput == true) {
				oElement.invalidate();
			}
		});
	};

	/**
	 * Determines whether an ancestor of the provided control implements getEnabled method and that returns false
	 *
	 * @param {sap.ui.core.Control} oControl A control instance
	 * @returns {boolean} Whether any control implements getEnabled method and that returns false
	 * @private
	 */
	function hasDisabledAncestor(oControl) {
		let oParent;
		for (oParent = oControl.getParent(); oParent && !oParent.getEnabled && oParent.getParent; oParent = oParent.getParent()) {/* empty */}
		return oParent && oParent.getEnabled && !oParent.getEnabled();
	}

	/**
	 * Moves the focus to the nearest ancestor that is focusable when the control that is going to be disabled
	 * (bEnabled === false) currently has the focus. This is done to prevent the focus from being set to the body
	 * tag
	 *
	 * @param {sap.ui.core.Control} oControl the control that is going to be enabled/disalbed
	 * @param {boolean} bEnabled whether the control is going to be enabled
	 * @private
	 */
	function checkAndMoveFocus(oControl, bEnabled) {
		var oDomRef = oControl.getDomRef();

		if (!bEnabled && oDomRef && oDomRef.contains(document.activeElement)) {
			var oFocusableAncestor = oControl.$().parent().closest(":focusable")[0];

			if (oFocusableAncestor) {
				oFocusableAncestor.focus({
					preventScroll: true
				});
			}
		}
	}

	return EnabledPropagator;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.FocusHandler
sap.ui.predefine("sap/ui/core/FocusHandler", [
	"../base/EventProvider",
	"../base/Object",
	"sap/base/Log",
	"sap/ui/core/UIAreaRegistry",
	"sap/ui/thirdparty/jquery",
	"sap/ui/dom/_ready"
],
	function (EventProvider, BaseObject, Log, UIAreaRegistry, jQuery, _ready) {
	"use strict";

		// Element, UIArea module references, lazily probed when needed
		var Element;
		var UIArea;
		var StaticArea;

		var oFocusInfoEventProvider = new EventProvider();
		var FOCUS_INFO_EVENT = "focusInfo";
		var oEventData = {};

		/**
		 * Constructs an instance of an sap.ui.core.FocusHandler.
		 * Keeps track of the focused element.
		 *
		 * @class Keeps track of the focused element.
		 * @param {Element} oRootRef e.g. document.body
		 * @alias sap.ui.core.FocusHandler
		 * @extends sap.ui.base.Object
		 * @private
		 */
		var FocusHandler = BaseObject.extend("sap.ui.core.FocusHandler", /** @lends sap.ui.core.FocusHandler.prototype */ {
			constructor : function() {
				BaseObject.apply(this);

				// keep track of element currently in focus
				this.oCurrent = null;
				// keep track of the element previously had the focus
				this.oLast = null;
				// buffer the focus/blur events for correct order
				this.aEventQueue = [];
				// keep track of last focused element
				this.oLastFocusedControlInfo = null;
				// keep track of focused element which is using Renderer.apiVersion=2
				this.oPatchingControlFocusInfo = null;

				this.fnEventHandler = this.onEvent.bind(this);

				// initialize event handling
				_ready().then(function() {
					var oRootRef = document.body;
					oRootRef.addEventListener("focus", this.fnEventHandler, true);
					oRootRef.addEventListener("blur", this.fnEventHandler, true);
					Log.debug("FocusHandler setup on Root " + oRootRef.type + (oRootRef.id ? ": " + oRootRef.id : ""), null, "sap.ui.core.FocusHandler");
				}.bind(this));
			}
		});

		/**
		 * Returns the focus info of the current focused control or the control with the given id, if exists.
		 *
		 * @see sap.ui.core.FocusHandler#restoreFocus
		 * @param {string} [sControlId] the id of the control. If not given the id of the current focused control (if exists) is used
		 * @return {object} the focus info of the current focused control or the control with the given id, if exists.
		 * @private
		 */
		FocusHandler.prototype.getControlFocusInfo = function(sControlId){
			var oControl;
			Element ??= sap.ui.require("sap/ui/core/Element");

			sControlId = sControlId || Element?.getActiveElement()?.getId();

			if (!sControlId) {
				return null;
			}

			oControl = getControlById(sControlId);

			if (oControl) {
				return {
					id : sControlId,
					control : oControl,
					info : oControl.getFocusInfo(),
					type : oControl.getMetadata().getName(),
					focusref : oControl.getFocusDomRef()
				};
			}
			return null;
		};

		/**
		 * Stores the focus info of the current focused control which is using Renderer.apiVersion=2
		 *
		 * @see sap.ui.core.FocusHandler#restoreFocus
		 * @see sap.ui.core.FocusHandler#getControlFocusInfo
		 * @param {HTMLElement} oDomRef The DOM reference of the control where the rendering is happening
		 * @private
		 */
		FocusHandler.prototype.storePatchingControlFocusInfo = function(oDomRef) {
			var oActiveElement = document.activeElement;
			if (!oActiveElement || !oDomRef.contains(oActiveElement)) {
				this.oPatchingControlFocusInfo = null;
			} else {
				this.oPatchingControlFocusInfo = this.getControlFocusInfo();
				if (this.oPatchingControlFocusInfo) {
					this.oPatchingControlFocusInfo.patching = true;
				}
			}
		};

		/**
		 * Returns the focus info of the last focused control which is using Renderer.apiVersion=2
		 *
		 * @see sap.ui.core.FocusHandler#storePatchingControlFocusInfo
		 * @private
		 */
		FocusHandler.prototype.getPatchingControlFocusInfo = function() {
			return this.oPatchingControlFocusInfo;
		};

		/**
		 * If the given control is the last known focused control, the stored focusInfo is updated.
		 *
		 * @see sap.ui.core.FocusHandler#restoreFocus
		 * @see sap.ui.core.FocusHandler#getControlFocusInfo
		 * @param {string} oControl the control
		 * @private
		 */
		FocusHandler.prototype.updateControlFocusInfo = function(oControl){
			if (oControl && this.oLastFocusedControlInfo && this.oLastFocusedControlInfo.control === oControl) {
				var sControlId = oControl.getId();
				this.oLastFocusedControlInfo = this.getControlFocusInfo(sControlId);
				Log.debug("Update focus info of control " + sControlId, null, "sap.ui.core.FocusHandler");
			}
		};

		/**
		 * Adds the given function as an extender of the focus info. The given function will be called within the
		 * <code>restoreFocus</code> function before the focus info is forwarded to the corresponding control.
		 *
		 * @see sap.ui.core.FocusHandler#restoreFocus
		 * @param {function} fnFunction The function that will be called to extend the focus info
		 * @param {object} oListener An object which is set as "this" context when callin the "fnFunction"
		 * @return {sap.ui.core.FocusHandler} The object itself to allow function chaining
		 * @private
		 */
		FocusHandler.prototype.addFocusInfoExtender = function(fnFunction, oListener) {
			oFocusInfoEventProvider.attachEvent(FOCUS_INFO_EVENT, oEventData, fnFunction, oListener);
			return this;
		};

		/**
		 * Removes the given function from being an extender of the focus info.
		 *
		 * @param {function} fnFunction The function that will be removed
		 * @param {object} oListener An object which is set as "this" context when callin the "fnFunction". Only when
		 *  the same "oListener" is given as the one that is used to call <code>addFocusInfoExtender</code>, the function
		 *  can be removed correctly.
		 * @return {sap.ui.core.FocusHandler} The object itself to allow function chaining
		 * @private
		 */
		FocusHandler.prototype.removeFocusInfoExtender = function(fnFunction, oListener) {
			oFocusInfoEventProvider.detachEvent(FOCUS_INFO_EVENT, fnFunction, oListener);
			return this;
		};

		/**
		 * Restores the focus to the last known focused control or to the given focusInfo, if possible.
		 *
		 * @see sap.ui.core.FocusHandler#getControlFocusInfo
		 * @param {object} [oControlFocusInfo] the focus info previously received from getControlFocusInfo
		 * @private
		 */
		FocusHandler.prototype.restoreFocus = function(oControlFocusInfo){
			var oInfo = oControlFocusInfo || this.oLastFocusedControlInfo;

			if (!oInfo) {
				return;
			}

			var oControl = getControlById(oInfo.id);

			var oFocusRef = oInfo.focusref;
			if (oControl
				&& oInfo.info
				&& oControl.getMetadata().getName() == oInfo.type
				&& (oInfo.patching
					|| (oControl.getFocusDomRef() != oFocusRef
						&& (oControlFocusInfo || /*!oControlFocusInfo &&*/ oControl !== oInfo.control || oInfo.preserved)))) {
				Log.debug("Apply focus info of control " + oInfo.id, null, "sap.ui.core.FocusHandler");
				oInfo.control = oControl;
				this.oLastFocusedControlInfo = oInfo;
				// Do not store dom patch info in the last focused control info
				delete this.oLastFocusedControlInfo.patching;

				// expose focus info into the oEventData which is forwarded to the focus info extender
				oEventData.info = oInfo.info;
				oFocusInfoEventProvider.fireEvent(FOCUS_INFO_EVENT, {
					domRef: oControl.getDomRef()
				});

				oControl.applyFocusInfo(oEventData.info);

				// oEventData is given to the event handler as event data, thus we can't assign it with a new empty
				// object. We need to clear it by deleting all of its own properties
				Object.keys(oEventData).forEach(function(sKey) {
					delete oEventData[sKey];
				});
			} else {
				Log.debug("Apply focus info of control " + oInfo.id + " not possible", null, "sap.ui.core.FocusHandler");
			}
		};

		/**
		 * Destroy method of the Focus Handler.
		 * It unregisters the event handlers.
		 *
		 * @param {jQuery.Event} event the event that initiated the destruction of the FocusHandler
		 * @private
		 */
		FocusHandler.prototype.destroy = function(event) {
			var oRootRef = event.data.oRootRef;
			if (oRootRef) {
				oRootRef.removeEventListener("focus", this.fnEventHandler, true);
				oRootRef.removeEventListener("blur", this.fnEventHandler, true);
			}
		};

		/**
		 * Handles the focus/blur events.
		 *
		 * @param {FocusEvent} oBrowserEvent Native browser focus/blur event object
		 * @private
		 */
		FocusHandler.prototype.onEvent = function(oBrowserEvent){
			var oEvent = jQuery.event.fix(oBrowserEvent);

			Log.debug("Event " + oEvent.type + " reached Focus Handler (target: " + oEvent.target + (oEvent.target ? oEvent.target.id : "") + ")", null, "sap.ui.core.FocusHandler");

			var type = (oEvent.type == "focus" || oEvent.type == "focusin") ? "focus" : "blur";
			this.aEventQueue.push({type:type, controlId: getControlIdForDOM(oEvent.target)});
			if (this.aEventQueue.length == 1) {
				this.processEvent();
			}
		};

		/**
		 * Processes the focus/blur events in the event queue.
		 *
		 * @private
		 */
		FocusHandler.prototype.processEvent = function(){
			var oEvent = this.aEventQueue[0];
			if (!oEvent) {
				return;
			}
			try {
				if (oEvent.type == "focus") {
					this.onfocusEvent(oEvent.controlId);
				} else if (oEvent.type == "blur") {
					this.onblurEvent(oEvent.controlId);
				}
			} finally { //Ensure that queue is processed until it is empty!
				this.aEventQueue.shift();
				if (this.aEventQueue.length > 0) {
					this.processEvent();
				}
			}
		};

		/**
		 * Processes the focus event taken from the event queue.
		 *
		 * @param {string} sControlId Id of the event related control
		 * @private
		 */
		FocusHandler.prototype.onfocusEvent = function(sControlId){
			var oControl = getControlById(sControlId);

			if (oControl) {
				this.oLastFocusedControlInfo = this.getControlFocusInfo(sControlId);
				Log.debug("Store focus info of control " + sControlId, null, "sap.ui.core.FocusHandler");
			}

			this.oCurrent = sControlId;
			if (!this.oLast) {
				// No last active element to be left...
				return;
			}

			if (this.oLast != this.oCurrent) {
				// if same control is focused again (e.g. while re-rendering) no focusleave is needed
				triggerFocusleave(this.oLast, sControlId);
			}

			this.oLast = null;
		};

		/**
		 * Processes the blur event taken from the event queue.
		 *
		 * @param {string} sControlId Id of the event related control
		 * @private
		 */
		FocusHandler.prototype.onblurEvent = function(sControlId){
			if (!this.oCurrent) {
				// No current Item, so nothing to lose focus...
				return;
			}
			this.oLast = sControlId;

			this.oCurrent = null;
			setTimeout(this["checkForLostFocus"].bind(this), 0);
		};

		/**
		 * Checks for lost focus and provides events in case of losing the focus.
		 * Called in delayed manner from {@link sap.ui.core.FocusHandler#onblurEvent}.
		 *
		 * @private
		 */
		FocusHandler.prototype.checkForLostFocus = function(){
			if (this.oCurrent == null && this.oLast != null) {
				triggerFocusleave(this.oLast, null);
			}
			this.oLast = null;
		};

		/**
		 * Tracks the focus before it is lost during DOM preserving.
		 * Called by the RenderManager when a DOM element is moved to the preserved area.
		 *
		 * If the preserved Element contains the activeElement, the focus is set to the body.
		 *
		 * In case the currently activeElement is also the last known focus-ref, we need to track
		 * this information, so the Focus can correctly restored later on.
		 *
		 * @param {Element} oCandidate the DOM element that will be preserved
		 * @private
		 * @ui5-restricted sap.ui.core.RenderManager
		 */
		FocusHandler.prototype.trackFocusForPreservedElement = function(oCandidate) {
			if (oCandidate.contains(document.activeElement) &&
				this.oLastFocusedControlInfo && document.activeElement === this.oLastFocusedControlInfo.focusref) {
				// the 'preserved' flag will be read during restoreFocus
				this.oLastFocusedControlInfo.preserved = true;
			}
		};


		//***********************************************************
		// Utility / convenience
		//***********************************************************

		/**
		 * Returns the ID of the control/element to which the given DOM
		 * reference belongs to or <code>null</code> if no such
		 * control/element exists.
		 *
		 * @param {Element} oDOM the DOM reference
		 * @returns {string|null} ID of the control or <code>null</code>
		 * @private
		 */
		var getControlIdForDOM = function(oDOM){
			var sId = jQuery(oDOM).closest("[data-sap-ui]").attr("id");
			if (sId) {
				return sId;
			}
			return null;
		};

		/**
		 * Calls the onsapfocusleave function on the control with id sControlId
		 * with the information about the given related control.
		 *
		 * @param {string} sControlId
		 * @param {string} sRelatedControlId
		 * @private
		 */
		var triggerFocusleave = function(sControlId, sRelatedControlId){
			var oControl = getControlById(sControlId);
			if (oControl) {
				var oEvent = jQuery.Event("sapfocusleave");
				oEvent.target = oControl.getDomRef();
				var oRelatedControl = getControlById(sRelatedControlId);
				oEvent.relatedControlId = oRelatedControl ? oRelatedControl.getId() : null;
				oEvent.relatedControlFocusInfo = oRelatedControl ? oRelatedControl.getFocusInfo() : null;
				// TODO: Re-check how focus handling works together with the Popup and different UIAreas
				// soft dependency to UIArea to prevent cyclic dependencies (FocusHandler -> UIArea -> FocusHandler)
				UIArea = UIArea || sap.ui.require("sap/ui/core/UIArea");
				if (UIArea) {
					var oControlUIArea = oControl.getUIArea();
					var oUIArea = null;
					if (oControlUIArea) {
						oUIArea = oControlUIArea;
					} else {
						StaticArea = StaticArea || sap.ui.require("sap/ui/core/StaticArea");
						if (StaticArea) {
							var oPopupUIAreaDomRef = StaticArea.getDomRef();
							if (oPopupUIAreaDomRef.contains(oEvent.target)) {
								oUIArea = StaticArea.getUIArea();
							}
						}
					}
					if (oUIArea) {
						oUIArea._handleEvent(oEvent);
					}
				}
			}
		};

		function getControlById(sControlId) {
			var oControl;
			if (!Element) {
				Element = sap.ui.require("sap/ui/core/Element");
			}
			if (Element) {
				oControl = Element.getElementById(sControlId);
			}
			return oControl || null;
		}

	return new FocusHandler();

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/core/InvisibleRenderer", [], function() {

	"use strict";

	/**
	 * Provides the default renderer for the controls that have set their <code>visible</code> property to <code>false</code>.
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 * @alias module:sap/ui/core/InvisibleRenderer
	 * @since 1.66.0
	 * @protected
	 * @namespace
	 */
	var InvisibleRenderer = {
		apiVersion: 2
	};

	/**
	 * The prefix of the invisible placeholder.
	 *
	 * @private
	 * @ui5-restricted sap.ui.core.RenderManager
	 */
	InvisibleRenderer.PlaceholderPrefix = "sap-ui-invisible-";

	/**
	 * Creates the ID to be used for the invisible placeholder DOM element.
	 *
	 * @param {sap.ui.core.Control} oControl The <code>control</code> instance for which to create the placeholder ID
	 * @returns {string} The ID used for the invisible placeholder of this element
	 * @static
	 * @protected
	 */
	InvisibleRenderer.createInvisiblePlaceholderId = function(oControl) {
		return this.PlaceholderPrefix + oControl.getId();
	};

	/**
	 * Returns the placeholder DOM element of the provided control.
	 *
	 * @param {sap.ui.core.Control} oControl The <code>control</code> instance for which to get the placeholder DOM element
	 * @returns {HTMLElement|null} The placeholder DOM element
	 * @static
	 * @protected
	 */
	InvisibleRenderer.getDomRef = function(oControl) {
		return document.getElementById(this.createInvisiblePlaceholderId(oControl));
	};

	/**
	 * Renders an invisible placeholder to identify the location of the invisible control within the DOM tree.
	 *
	 * The standard implementation renders an invisible &lt;span&gt; element for controls with <code>visible:false</code> to improve
	 * re-rendering performance. Due to the fault tolerance of the HTML5 standard, such &lt;span&gt; elements are accepted in many
	 * scenarios and won't appear in the render tree of the browser. However, in some cases, controls might need to write a different
	 * element if &lt;span&gt; is not an allowed element (for example, within the &lt;tr&gt; or &lt;li&gt; group). In this case,
	 * the caller can require this module and use the third parameter to define the HTML tag.
	 *
	 * @param {sap.ui.core.RenderManager} [oRm] The <code>RenderManager</code> instance
	 * @param {sap.ui.core.Element} [oElement] The instance of the invisible element
	 * @param {string} [sTagName="span"] HTML tag of the invisible placeholder; void tags are not allowed.
	 * @static
	 * @protected
	 */
	InvisibleRenderer.render = function(oRm, oElement, sTagName) {
		var sPlaceholderId = this.createInvisiblePlaceholderId(oElement);
		sTagName = sTagName || "span";

		oRm.openStart(sTagName, sPlaceholderId);
		oRm.attr("data-sap-ui", sPlaceholderId);
		oRm.attr("aria-hidden", "true");
		oRm.class("sapUiHiddenPlaceholder");
		oRm.openEnd(true /* bExludeStyleClasses */);
		oRm.close(sTagName);
	};

	return InvisibleRenderer;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides helper sap.ui.core.LabelEnablement
sap.ui.predefine("sap/ui/core/LabelEnablement", ['../base/ManagedObject', "sap/base/assert"],
	function(ManagedObject, assert) {
	"use strict";

	// Mapping between controls and labels
	var CONTROL_TO_LABELS_MAPPING = {};

	// Mapping between the outer control and the inner control when outer control overwrites 'getIdForLabel'
	const CONTROL_TO_INNERCONTROL_MAPPING = {};

	// The controls which should not be referenced by a "for" attribute (Specified in the HTML standard).
	// Extend when needed.
	var NON_LABELABLE_CONTROLS = [
		"sap.ui.comp.navpopover.SmartLink",
		"sap.m.Link",
		"sap.m.Label",
		"sap.m.Text",
		"sap.m.Select",
		"sap.ui.webc.main.Label",
		"sap.ui.webc.main.Link"
	];

	var Element;

	// Returns the control for the given id (if available) and invalidates it if desired
	function toControl(sId, bInvalidate) {
		if (!sId) {
			return null;
		}

		Element ??= sap.ui.require("sap/ui/core/Element");
		var oControl = Element.getElementById(sId);
		// a control must only be invalidated if there is already a DOM Ref. If there is no DOM Ref yet, it will get
		// rendered later in any case. Elements must always be invalidated because they have no own renderer.
		if (oControl && bInvalidate && (!oControl.isA('sap.ui.core.Control') || oControl.getDomRef())) {
			oControl.invalidate();
		}

		return oControl;
	}

	function findLabelForControl(oLabel, fnOnAfterRendering) {
		const sId = oLabel.getLabelFor() || oLabel._sAlternativeId || '';
		const oRes = { controlId: sId };

		Element ??= sap.ui.require("sap/ui/core/Element");

		const oControl = Element.getElementById(sId);

		if (oControl && typeof oControl.getIdForLabel === "function") {
			const sDomIdForLabel = oControl.getIdForLabel();

			if (sDomIdForLabel !== oControl.getId()) {
				const oDomForLabel = document.getElementById(sDomIdForLabel);

				if (!oDomForLabel) {
					// The inner control based on 'getIdForLabel' isn't rendered yet
					// Wait for the next rendering and call the given callback
					const oDelegate = {
						onAfterRendering: function(oLabel) {
							this.removeEventDelegate(oDelegate);
							if (typeof fnOnAfterRendering === "function") {
								fnOnAfterRendering(oLabel);
							}
						}.bind(oControl, oLabel)
					};
					oControl.addEventDelegate(oDelegate);
				} else {
					const oControlForLabel = Element.closestTo(oDomForLabel);
					const sInnerControlId = oControlForLabel.getId();
					if (sInnerControlId !== sId) {
						oRes.innerControlId = sInnerControlId;
					}
				}
			}
		}

		return oRes;
	}

	// Updates the mapping tables for the given label, in destroy case only a cleanup is done
	function refreshMapping(oLabel, bDestroy, bAfterRendering){
		var sLabelId = oLabel.getId();
		var sOldId = oLabel.__sLabeledControl;
		var oNewIdInfo = bDestroy ? null : findLabelForControl(oLabel, (oLabel) => {
			if (!bAfterRendering) {
				refreshMapping(oLabel, false /* bDestroy */, true /* bAfterRendering */);
			}
		});

		if (oNewIdInfo &&
			sOldId === oNewIdInfo.controlId &&
			oNewIdInfo.innerControlId === CONTROL_TO_INNERCONTROL_MAPPING[oNewIdInfo.controlId]) {
			return;
		}

		//Invalidate the label itself (see setLabelFor, setAlternativeLabelFor)
		if (!bDestroy) {
			oLabel.invalidate();
		}

		//Update the label to control mapping (1-1 mapping)
		if (oNewIdInfo?.controlId) {
			oLabel.__sLabeledControl = oNewIdInfo.controlId;
		} else {
			delete oLabel.__sLabeledControl;
		}

		//Update the control to label mapping (1-n mapping)
		var aLabelsOfControl;
		if (sOldId) {
			aLabelsOfControl = CONTROL_TO_LABELS_MAPPING[sOldId];
			if (aLabelsOfControl) {
				const sInnerControlId = CONTROL_TO_INNERCONTROL_MAPPING[sOldId];
				aLabelsOfControl = aLabelsOfControl.filter(function(sCurrentLabelId) {
					  return sCurrentLabelId != sLabelId;
				});
				if (aLabelsOfControl.length) {
					CONTROL_TO_LABELS_MAPPING[sOldId] = aLabelsOfControl;
					if (sInnerControlId) {
						CONTROL_TO_LABELS_MAPPING[sInnerControlId] = aLabelsOfControl;
					}
				} else {
					delete CONTROL_TO_LABELS_MAPPING[sOldId];
					if (sInnerControlId) {
						delete CONTROL_TO_LABELS_MAPPING[sInnerControlId];
						delete CONTROL_TO_INNERCONTROL_MAPPING[sOldId];
					}
				}
			}
		}
		if (oNewIdInfo?.controlId) {
			aLabelsOfControl = CONTROL_TO_LABELS_MAPPING[oNewIdInfo.controlId] || [];
			aLabelsOfControl.push(sLabelId);
			CONTROL_TO_LABELS_MAPPING[oNewIdInfo.controlId] = aLabelsOfControl;

			if (oNewIdInfo.innerControlId) {
				CONTROL_TO_LABELS_MAPPING[oNewIdInfo.innerControlId] = aLabelsOfControl;
				CONTROL_TO_INNERCONTROL_MAPPING[oNewIdInfo.controlId] = oNewIdInfo.innerControlId;
			} else {
				const sExistingInnerControl = CONTROL_TO_INNERCONTROL_MAPPING[oNewIdInfo.controlId];
				if (sExistingInnerControl) {
					delete CONTROL_TO_LABELS_MAPPING[sExistingInnerControl];
					delete CONTROL_TO_INNERCONTROL_MAPPING[oNewIdInfo.controlId];
				}
			}
		}

		//Invalidate related controls
		var oOldControl = toControl(sOldId, true);
		var oNewControl = toControl(oNewIdInfo?.controlId, true);

		if (oOldControl) {
			oLabel.detachRequiredChange(oOldControl);
		}

		if (oNewControl) {
			oLabel.attachRequiredChange(oNewControl);
		}

	}

	// Checks whether enrich function can be applied on the given control or prototype.
	function checkLabelEnablementPreconditions(oControl) {
		if (!oControl) {
			throw new Error("sap.ui.core.LabelEnablement cannot enrich null");
		}
		var oMetadata = oControl.getMetadata();
		if (!oMetadata.isInstanceOf("sap.ui.core.Label")) {
			throw new Error("sap.ui.core.LabelEnablement only supports Controls with interface sap.ui.core.Label");
		}
		var oLabelForAssociation = oMetadata.getAssociation("labelFor");
		if (!oLabelForAssociation || oLabelForAssociation.multiple) {
			throw new Error("sap.ui.core.LabelEnablement only supports Controls with a to-1 association 'labelFor'");
		}
		//Add more detailed checks here ?
	}

	// Checks if the control is labelable according to the HTML standard
	// The labelable HTML elements are: button, input, keygen, meter, output, progress, select, textarea
	// Related incident 1770049251
	function isLabelableControl(oControl) {
		if (!oControl) {
			return true;
		}

		if (oControl.isA("sap.ui.core.ILabelable")) {
			return oControl.hasLabelableHTMLElement();
		}

		var sName = oControl.getMetadata().getName();
		return NON_LABELABLE_CONTROLS.indexOf(sName) < 0;
	}

	/**
	 * Helper functionality for enhancement of a <code>Label</code> with common label functionality.
	 *
	 * @see sap.ui.core.LabelEnablement#enrich
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 * @protected
	 * @alias sap.ui.core.LabelEnablement
	 * @namespace
	 * @since 1.28.0
	 */
	var LabelEnablement = {};

	/**
	 * Helper function for the <code>Label</code> control to render the HTML 'for' attribute.
	 *
	 * This function should be called at the desired location in the renderer code of the <code>Label</code> control.
	 * It can be used with both rendering APIs, with the new semantic rendering API (<code>apiVersion 2</code>)
	 * as well as with the old, string-based API.
	 *
	 * As this method renders an attribute, it can only be called while a start tag is open. For the new semantic
	 * rendering API, this means it can only be called between an <code>openStart/voidStart</code> call and the
	 * corresponding <code>openEnd/voidEnd</code> call. In the context of the old rendering API, it can be called
	 * only after the prefix of a start tag has been written (e.g. after <code>rm.write("&lt;span id=\"foo\"");</code>),
	 * but before the start tag ended, e.g before the right-angle ">" of the start tag has been written.
	 *
	 * @param {sap.ui.core.RenderManager} oRenderManager The RenderManager that can be used for rendering.
	 * @param {sap.ui.core.Label} oLabel The <code>Label</code> for which the 'for' HTML attribute should be rendered.
	 * @protected
	 */
	LabelEnablement.writeLabelForAttribute = function(oRenderManager, oLabel) {
		if (!oLabel) {
			return;
		}

		const oControlInfo = findLabelForControl(oLabel, (oLabel) => {
			oLabel.invalidate();
		});

		if (!oControlInfo.controlId) {
			return;
		}

		Element ??= sap.ui.require("sap/ui/core/Element");
		const oControl = Element.getElementById(oControlInfo.innerControlId || oControlInfo.controlId);
		// The "for" attribute should only reference labelable HTML elements.
		if (oControl && typeof oControl.getIdForLabel === "function" && isLabelableControl(oControl)) {
			oRenderManager.attr("for", oControl.getIdForLabel());
		}
	};

	/**
	 * Returns an array of IDs of the labels referencing the given element.
	 *
	 * @param {sap.ui.core.Element} oElement The element whose referencing labels should be returned
	 * @returns {string[]} an array of ids of the labels referencing the given element
	 * @public
	 */
	LabelEnablement.getReferencingLabels = function(oElement){
		var sId = oElement ? oElement.getId() : null;
		if (!sId) {
			return [];
		}
		return CONTROL_TO_LABELS_MAPPING[sId] || [];
	};

	/**
	 * Collect the label texts for the given UI5 Element from the following sources:
	 *  * The label returned from the function "getFieldHelpInfo"
	 *  * The ids of label controls from labelling controls in LabelEnablement
	 *  * The ids of label controls from "ariaLabelledBy" Association
	 *  * The label and ids of label controls is enhanced by calling "enhanceAccessibilityState" of the parent control
	 *
	 * @param {sap.ui.core.Element} oElement The UI5 element for which the label texts are collected
	 * @return {string[]} An array of label texts for the given UI5 element
	 * @ui5-restricted sap.ui.core
	 */
	LabelEnablement._getLabelTexts = function(oElement) {
		// gather labels and labelledby ids
		const mLabelInfo = {};

		const oInfo = oElement.getFieldHelpInfo?.();
		if (oInfo?.label) {
			mLabelInfo.label = oInfo.label;
		}

		let aLabelIds = LabelEnablement.getReferencingLabels(oElement);
		if (aLabelIds.length) {
			mLabelInfo.labelledby = aLabelIds;
		}

		if (oElement.getMetadata().getAssociation("ariaLabelledBy")) {
			aLabelIds = oElement.getAriaLabelledBy();

			if (aLabelIds.length) {
				mLabelInfo.labelledby ??= [];

				aLabelIds.forEach((sLabelId) => {
					if (!mLabelInfo.labelledby.includes(sLabelId)) {
						mLabelInfo.labelledby.push(sLabelId);
					}
				});
			}
		}

		if (mLabelInfo.labelledby?.length) {
			mLabelInfo.labelledby = mLabelInfo.labelledby.join(" ");
		}

		// enhance it with parent control
		oElement.getParent()?.enhanceAccessibilityState?.(oElement, mLabelInfo);

		// merge the labels
		const aLabels = mLabelInfo.label ? [mLabelInfo.label] : [];

		if (mLabelInfo.labelledby) {
			mLabelInfo.labelledby.split(" ")
				.forEach((sLabelId) => {
					const oLabelControl = Element.getElementById(sLabelId);
					if (oLabelControl) {
						const sLabelText = oLabelControl.getText?.() || oLabelControl.getDomRef()?.innerText;
						if (sLabelText) {
							aLabels.push(sLabelText);
						}
					}
				});
		}

		return aLabels;
	};

	/**
	 * Returns <code>true</code> when the given control is required (property 'required') or one of its referencing labels, <code>false</code> otherwise.
	 *
	 * @param {sap.ui.core.Element} oElement The element which should be checked for its required state
	 * @returns {boolean} <code>true</code> when the given control is required (property 'required') or one of its referencing labels, <code>false</code> otherwise
	 * @public
	 * @since 1.29.0
	 */
	LabelEnablement.isRequired = function(oElement){

		if (checkRequired(oElement)) {
			return true;
		}

		var aLabelIds = LabelEnablement.getReferencingLabels(oElement),
			oLabel;

		Element ??= sap.ui.require("sap/ui/core/Element");

		for (var i = 0; i < aLabelIds.length; i++) {
			oLabel = Element.getElementById(aLabelIds[i]);
			if (checkRequired(oLabel)) {
				return true;
			}
		}

		return false;
	};

	function checkRequired(oElem) {
		return !!(oElem && oElem.getRequired && oElem.getRequired());
	}

	/**
	 * This function should be called on a label control to enrich its functionality.
	 *
	 * <b>Usage:</b>
	 * The function can be called with a control prototype:
	 * <code>
	 * sap.ui.core.LabelEnablement.enrich(my.Label.prototype);
	 * </code>
	 * Or the function can be called on instance level in the init function of a label control:
	 * <code>
	 * my.Label.prototype.init: function(){
	 *    sap.ui.core.LabelEnablement.enrich(this);
	 * }
	 * </code>
	 *
	 * <b>Preconditions:</b>
	 * The given control must implement the interface sap.ui.core.Label and have an association 'labelFor' with cardinality 0..1.
	 * This function extends existing API functions. Ensure not to override these extensions AFTER calling this function.
	 *
	 * <b>What does this function do?</b>
	 *
	 * A mechanism is added that ensures that a bidirectional reference between the label and its labeled control is established:
	 * The label references the labeled control via the HTML 'for' attribute (see {@link sap.ui.core.LabelEnablement#writeLabelForAttribute}).
	 * If the labeled control supports the aria-labelledby attribute, a reference to the label is added automatically.
	 *
	 * In addition an alternative to apply a 'for' reference without influencing the labelFor association of the API is applied (e.g. used by Form).
	 * For this purpose the functions setAlternativeLabelFor and getLabelForRendering are added.
	 *
	 * @param {sap.ui.core.Control} oControl the label control which should be enriched with further label functionality.
	 * @throws Error if the given control cannot be enriched to violated preconditions (see above)
	 * @protected
	 */
	LabelEnablement.enrich = function(oControl) {
		//Ensure that enhancement possible
		checkLabelEnablementPreconditions(oControl);

		oControl.__orig_setLabelFor = oControl.setLabelFor;
		oControl.setLabelFor = function(sId) {
			var res = this.__orig_setLabelFor.apply(this, arguments);
			refreshMapping(this);
			return res;
		};

		oControl.__orig_exit = oControl.exit;
		oControl.exit = function() {
			this._sAlternativeId = null;
			refreshMapping(this, true);
			if (oControl.__orig_exit) {
				oControl.__orig_exit.apply(this, arguments);
			}
		};

		// Alternative to apply a for reference without influencing the labelFor association of the API (see e.g. FormElement)
		oControl.setAlternativeLabelFor = function(sId) {
			if (sId instanceof ManagedObject) {
				sId = sId.getId();
			} else if (sId != null && typeof sId !== "string") {
				assert(false, "setAlternativeLabelFor(): sId must be a string, an instance of sap.ui.base.ManagedObject or null");
				return this;
			}

			this._sAlternativeId = sId;
			refreshMapping(this);

			return this;
		};

		// Returns id of the labelled control. The labelFor association is preferred before AlternativeLabelFor.
		oControl.getLabelForRendering = function() {
			var sId = this.getLabelFor() || this._sAlternativeId;
			var oControl = toControl(sId);
			var oLabelForControl;

			Element ??= sap.ui.require("sap/ui/core/Element");

			if (oControl &&
				!oControl.isA("sap.ui.core.ILabelable") &&
				oControl.getIdForLabel
				&& oControl.getIdForLabel()) {
				oLabelForControl = Element.getElementById(oControl.getIdForLabel());
				if (oLabelForControl) {
					oControl = oLabelForControl;
				}
			}

			return isLabelableControl(oControl) ? sId : "";
		};

		oControl.isLabelFor = function(oControl) {
			var sId = oControl.getId();
			var aLabels = CONTROL_TO_LABELS_MAPPING[sId];
			return aLabels && aLabels.indexOf(this.getId()) > -1;
		};

		if (!oControl.getMetadata().getProperty("required")) {
			return;
		}

		oControl.__orig_setRequired = oControl.setRequired;
		oControl.setRequired = function(bRequired) {
			var bOldRequired = this.getRequired(),
				oReturn = this.__orig_setRequired.apply(this, arguments);

			// invalidate the related control only when needed
			if (this.getRequired() !== bOldRequired) {
				toControl(this.__sLabeledControl, true);
			}

			return oReturn;
		};

		/**
		 * Checks whether the <code>Label</code> itself or the associated control is marked as required (they are mutually exclusive).
		 *
		 * @protected
		 * @returns {boolean} Returns if the Label or the labeled control are required
		 */
		oControl.isRequired = function(){
			// the value of the local required flag is ORed with the result of a "getRequired"
			// method of the associated "labelFor" control. If the associated control doesn't
			// have a getRequired method, this is treated like a return value of "false".
			var oFor = toControl(this.getLabelForRendering(), false);
			return checkRequired(this) || checkRequired(oFor);

		};

		/**
		 * Checks whether the <code>Label</code> should be rendered in display only mode.
		 *
		 * In the standard case it just uses the DisplayOnly property of the <code>Label</code>.
		 *
		 * In the Form another type of logic is used.
		 * Maybe later on also the labeled controls might be used to determine the rendering.
		 *
		 * @protected
		 * @returns {boolean} Returns if the Label should be rendered in display only mode
		 */
		oControl.isDisplayOnly = function(){

			if (this.getDisplayOnly) {
				return this.getDisplayOnly();
			} else {
				return false;
			}

		};

		/**
		 * Checks whether the <code>Label</code> should be rendered wrapped instead of trucated.
		 *
		 * In the standard case it just uses the <code>Wrapping</code> property of the <code>Label</code>.
		 *
		 * In the Form another type of logic is used.
		 *
		 * @protected
		 * @returns {boolean} Returns if the Label should be rendered in display only mode
		 */
		oControl.isWrapping = function(){

			if (this.getWrapping) {
				return this.getWrapping();
			} else {
				return false;
			}

		};

		// as in the Form the required change is checked, it'd not needed here
		oControl.disableRequiredChangeCheck = function(bNoCheck){

			this._bNoRequiredChangeCheck = bNoCheck;

		};

		oControl.attachRequiredChange = function(oFor){

			if (oFor && !this._bNoRequiredChangeCheck) {
				if (oFor.getMetadata().getProperty("required")) {
					oFor.attachEvent("_change", _handleControlChange, this);
				}
				this._bRequiredAttached = true; // to do not check again if control has no required property
			}

		};

		oControl.detachRequiredChange = function(oFor){

			if (oFor && !this._bNoRequiredChangeCheck) {
				if (oFor.getMetadata().getProperty("required")) {
					oFor.detachEvent("_change", _handleControlChange, this);
				}
				this._bRequiredAttached = false; // to do not check again if control has no required property
			}

		};

		function _handleControlChange(oEvent) {

			if (oEvent.getParameter("name") == "required") {
				this.invalidate();
			}

		}

		oControl.__orig_onAfterRendering = oControl.onAfterRendering;
		oControl.onAfterRendering = function(oEvent) {
			var res;

			if (this.__orig_onAfterRendering) {
				res = this.__orig_onAfterRendering.apply(this, arguments);
			}

			if (!this._bNoRequiredChangeCheck && !this._bRequiredAttached && this.__sLabeledControl) {
				var oFor = toControl(this.__sLabeledControl, false);
				this.attachRequiredChange(oFor);
			}

			return res;
		};

	};

	return LabelEnablement;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides in-place rendering module for the RenderManager
sap.ui.predefine("sap/ui/core/Patcher", [
	"sap/ui/Device"
], function(Device) {
	"use strict";

	// points a dummy CSSStyleDeclaration for style validation purposes
	var oCSSStyleDeclaration = document.createElement("title").style;

	// stores a <template> element to convert HTML strings to a DocumentFragment
	var oTemplateElement = document.createElement("template");

	/**
	 * Provides custom mutators for attributes.
	 * Custom mutators ensure that the attribute value is aligned with the property value.
	 *
	 * Mutator functions are executed before the properties are set or removed.
	 * If the return value of the function is <code>true</code>, then the attribute will not be set.
	 *
	 * Default mutators are used to update DOM properties apart from attributes.
	 * According to the IDL definition some HTML attributes have no 1:1 mapping to properties.
	 * For more information, see {@link https://www.w3.org/TR/REC-DOM-Level-1/idl-definitions.html}.
	 */
	var AttributeMutators = {
		value: function(oElement, sNewValue) {
			if (oElement.tagName == "INPUT") {
				oElement.value = (sNewValue == null) ? "" : sNewValue;
			}
		},
		checked: function(oElement, sNewValue) {
			if (oElement.tagName == "INPUT") {
				oElement.checked = (sNewValue == null) ? false : true;
			}
		},
		selected: function(oElement, sNewValue) {
			if (oElement.tagName == "OPTION") {
				oElement.selected = (sNewValue == null) ? false : true;
			}
		}
	};

	if (Device.browser.safari) {
		/*
		 * Safari 14ff reports calls to Element.prototype.removeAttribute("style") as CSP violations,
		 * if 'inline-style's are not allowed, see https://bugs.webkit.org/show_bug.cgi?id=227349#c3
		 *
		 * Assigning the empty string as style cleans up the CSS, but not the DOM, therefore we apply
		 * this fallback to Safari only.
		 */
		AttributeMutators.style = function(oElement, sNewValue) {
			if ( sNewValue == null ) {
				oElement.style = "";
				return true; // skip removeAttribute
			}
		};
	}

	/**
	 * Creates an HTML element from the given tag name and parent namespace
	 */
	var createElement = function (sTagName, oParent) {
		if (sTagName == "svg") {
			return document.createElementNS("http://www.w3.org/2000/svg", "svg");
		}

		var sNamespaceURI = oParent && oParent.namespaceURI;
		if (!sNamespaceURI || sNamespaceURI == "http://www.w3.org/1999/xhtml" || oParent.localName == "foreignObject") {
			return document.createElement(sTagName);
		}

		return document.createElementNS(sNamespaceURI, sTagName);
	};

	/**
	 * @class Creates a <code>Patcher</code> instance which can be used for in-place DOM patching.
	 *
	 * @alias sap.ui.core.Patcher
	 * @class
	 * @private
	 * @ui5-restricted sap.ui.core.RenderManager
	 */
	var Patcher = function() {
		this._oRoot = null;                      // Root node where the patching is started
		this._oCurrent = null;                   // Current node being patched, this value is always up-to-date
		this._oParent = null;                    // Parent node of the current node being patched, this valule is not alway up-to-date
		this._oReference = null;                 // Reference node that corresponds to the position of the current node
		this._oNewElement = null;                // Newly created element which is not yet inserted into the DOM tree
		this._oNewParent = null;                 // HTML element where the newly created element to be inserted
		this._oNewReference = null;              // Reference element that corresponds to the position of the newly created element
		this._iTagOpenState = 0;                 // 0: Tag is Closed, 1: Tag is Open and just Created, has no attributes, 2: Tag is Open and Existing, might have attributes
		this._sStyles = "";                      // Style collection of the current node
		this._sClasses = "";                     // Class name collection of the current node
		this._mAttributes = Object.create(null); // Set of all attributes name-value pair of the current node
	};

	/**
	 * Sets the root node from which the patching will be started.
	 *
	 * The root node must be set once before calling any other APIs.
	 * If the root node parameter is not provided, a <code>DocumentFragment</code> is created as the root node.
	 *
	 * @param {HTMLElement} [oRootNode] The DOM node from which the patching will be started
	 */
	Patcher.prototype.setRootNode = function(oRootNode) {
		if (this._oRoot) {
			this.reset();
		}

		this._oRoot = oRootNode || document.createDocumentFragment();
	};

	/**
	 * Returns the root node from which the patching was started or a <code>DocumentFragment</code> created as a root node.
	 *
	 * @return {Node} The root node of the Patcher
	 */
	Patcher.prototype.getRootNode = function() {
		return this._oRoot;
	};

	/**
	 * Returns the current node being patched.
	 *
	 * @returns {Node} The node being patched
	 */
	Patcher.prototype.getCurrentNode = function() {
		return this._oCurrent;
	};

	/**
	 * Cleans up the current patching references and makes the patcher ready for the next patching.
	 */
	Patcher.prototype.reset = function() {
		this._oRoot = this._oCurrent = this._oParent = this._oReference = this._oNewElement = this._oNewParent = this._oNewReference = null;
		this._iTagOpenState = 0; /* Tag is Closed */
	};

	/**
	 * Sets the next node that is going to be patched.
	 */
	Patcher.prototype._walkOnTree = function() {
		this._oReference = null;
		if (!this._oCurrent) {
			// if the current node does not exist yet, that means we are on the first call after the root node is set
			if (this._oRoot.nodeType == 11 /* Node.DOCUMENT_FRAGMENT_NODE */) {
				// for the initial rendering the Patcher creates a DocumentFragment to assemble all created DOM nodes within it
				// if there is nothing to patch the Patcher will start to create elements, here we do not set the current node to force the rendering starts
				// the first created element must be appended to the DocumentFragment, so let the parent be the DocumentFragment node
				this._oParent = this._oRoot;
			} else {
				// during the re-rendering, the root node points to where the patching must be started
				this._oParent = this._oRoot.parentNode;
				this._oCurrent = this._oRoot;
			}
		} else if (this._iTagOpenState /* Tag is Open */) {
			// a new tag is opened while the previous tag was already open e.g. <div><span
			this._oParent = this._oCurrent;
			this._oCurrent = this._oCurrent.firstChild;
		} else {
			// after the previous tag has been closed, a new tag is opened e.g. <div></div><span
			this._oParent = this._oCurrent.parentNode;
			this._oCurrent = this._oCurrent.nextSibling;
		}
	};

	/**
	 * Finds the matching HTML element from the given ID and moves the corresponding element to the correct location.
	 */
	Patcher.prototype._matchElement = function(sId) {
		if (!sId) {
			return;
		}

		// TODO: the element with the given ID might exists in the DOM tree
		// See the Patcher.qunit.js - Rendering:existing elements test
		if (!this._oCurrent) {
			return;
		}

		if (this._oCurrent.id == sId || this._oCurrent == this._oRoot) {
			return;
		}

		var oCurrent = document.getElementById(sId);
		if (oCurrent) {
			this._oCurrent = this._oParent.insertBefore(oCurrent, this._oCurrent);
			return;
		}

		if (this._oCurrent.id) {
			this._oReference = this._oCurrent;
			this._oCurrent = null;
		}
	};

	/**
	 * Checks whether the current node being patched matches the specified node name.
	 * If there is no match, the old DOM node must be removed, and new nodes must be created.
	 */
	Patcher.prototype._matchNodeName = function(sNodeName) {
		if (!this._oCurrent) {
			return;
		}

		var sCurrentNodeName = (this._oCurrent.nodeType == 1 /* Node.ELEMENT_NODE */) ? this._oCurrent.localName : this._oCurrent.nodeName;
		if (sCurrentNodeName == sNodeName) {
			return;
		}

		this._oReference = this._oCurrent;
		this._oCurrent = null;
	};

	/**
	 * Gets and stores attributes of the current node.
	 *
	 * Using getAttributeNames along with getAttribute is a memory-efficient and performant alternative to accessing Element.attributes.
	 * For more information, see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNames}.
	 */
	Patcher.prototype._getAttributes = function() {
		for (var i = 0, aAttributeNames = this._oCurrent.getAttributeNames(); i < aAttributeNames.length; i++) {
			this._mAttributes[aAttributeNames[i]] = this._oCurrent.getAttribute(aAttributeNames[i]);
		}
	};

	/**
	 * Stores the specified element that is going to be inserted into the document after patching has been completed.
	 */
	Patcher.prototype._setNewElement = function(oNewElement) {
		if (!oNewElement) {
			return;
		}

		if (!this._oNewElement) {
			this._oNewElement = this._oCurrent;
			this._oNewParent = this._oParent;
			this._oNewReference = this._oReference;
		} else {
			this._oParent.insertBefore(this._oCurrent, this._oReference);
		}
	};

	/**
	 * Inserts the stored new element into the document after patching has been completed.
	 */
	Patcher.prototype._insertNewElement = function() {
		if (this._oCurrent == this._oNewElement) {
			this._oNewParent[this._oNewReference == this._oRoot ? "replaceChild" : "insertBefore"](this._oNewElement, this._oNewReference);
			this._oNewElement = this._oNewParent = this._oNewReference = null;
		}
	};

	/**
	 * Indicates whether the <code>Patcher</code> is in creation or patching mode.
	 *
	 * @returns {boolean}
	 */
	Patcher.prototype.isCreating = function() {
		return Boolean(this._oNewElement);
	};

	/**
	 * Aligns the DOM node that is currently patched with the given DOM node that does not need patching.
	 *
	 * This method can be used to skip elements that do not need to be visited for patching.
	 * If the callback is provided, then the Patcher informs the callback about the skipped node. The returned value of the callback
	 * can be used to move the cursor of the Patcher on the DOM tree. This can be useful to skip multiple root nodes.
	 *
	 * @param {HTMLElement} oDomNode HTML element that needs to be aligned with the currently being patched node
	 * @param {function} [fnCallback] The callback to be informed about the skipped node
	 * @return {sap.ui.core.Patcher} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.alignWithDom = function(oDomNode, fnCallback) {
		this._walkOnTree();

		if (!this._oCurrent || this._oCurrent.id != oDomNode.id || this._oParent != oDomNode.parentNode) {
			this._oCurrent = this._oParent.insertBefore(oDomNode, this._oCurrent);
		}

		if (fnCallback) {
			this._oCurrent = fnCallback(oDomNode) || this._oCurrent;
		}

		this._iTagOpenState = 0; /* Closed */
		return this;
	};

	/**
	 * Opens the start tag of an HTML element.
	 *
	 * This must be followed by <code>openEnd</code> and concluded with <code>close</code>.
	 *
	 * @param {string} sTagName Tag name of the HTML element; all lowercase
	 * @param {sap.ui.core.ID} [sId] ID to identify the element
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.openStart = function(sTagName, sId) {
		this._walkOnTree();
		this._matchElement(sId);
		this._matchNodeName(sTagName);

		if (this._oCurrent) {
			this._getAttributes();
			this._iTagOpenState = 2; /* Tag is Open and Existing */
		} else {
			this._oCurrent = createElement(sTagName, this._oParent);
			this._setNewElement(this._oCurrent);
			this._iTagOpenState = 1; /* Tag is Open and Created */
		}

		if (sId) {
			this.attr("id", sId);
		}

		return this;
	};

	/**
	 * Starts a self-closing tag, such as <code>img</code> or <code>input</code>.
	 *
	 * This must be followed by <code>voidEnd</code>.
	 *
	 * @param {string} sTagName Tag name of the HTML element; all lowercase
	 * @param {sap.ui.core.ID} [sId] ID to identify the element
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.voidStart = Patcher.prototype.openStart;


	/**
	 * Sets an attribute name-value pair to the current element.
	 *
	 * This is only valid when called between <code>openStart/voidStart</code> and <code>openEnd/voidEnd</code>.
	 * Case-insensitive attribute names must all be set in lowercase.
	 *
	 * @param {string} sAttr Name of the attribute
	 * @param {*} vValue Value of the attribute; any non-string value specified is converted automatically into a string
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.attr = function(sAttr, vValue) {
		if (sAttr === "style") {
			this._sStyles = vValue;
			return this;
		}

		if (this._iTagOpenState == 1 /* Tag is Open and Created */) {
			this._oCurrent.setAttribute(sAttr, vValue);
			return this;
		}

		var sNewValue = String(vValue);
		var sOldValue = this._mAttributes[sAttr];
		var fnMutator = AttributeMutators[sAttr];

		if (sOldValue !== undefined) {
			delete this._mAttributes[sAttr];
		}

		if (fnMutator && fnMutator(this._oCurrent, sNewValue, sOldValue)) {
			return this;
		}

		if (sOldValue !== sNewValue) {
			this._oCurrent.setAttribute(sAttr, sNewValue);
		}

		return this;
	};

	/**
	 * Adds a class name to the class name collection to be set as a <code>class</code>
	 * attribute when <code>openEnd</code> or <code>voidEnd</code> is called.
	 *
	 * This is only valid when called between <code>openStart/voidStart</code> and <code>openEnd/voidEnd</code>.
	 *
	 * @param {string} sClass Class name to be written
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.class = function(sClass) {
		if (sClass) {
			this._sClasses += (this._sClasses) ? " " + sClass : sClass;
		}

		return this;
	};

	/**
	 * Adds a style name-value pair to the style collection to be set as a <code>style</code>
	 * attribute when <code>openEnd</code> or <code>voidEnd</code> is called.
	 *
	 * This is only valid when called between <code>openStart/voidStart</code> and <code>openEnd/voidEnd</code>.
	 *
	 * @param {string} sName Name of the style property
	 * @param {string} vValue Value of the style property
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.style = function(sName, vValue) {
		if (!sName || vValue == null || vValue == "") {
			return this;
		}

		vValue = vValue + "";
		if (vValue.includes(";")) {
			// sanitize the semicolon to ensure that a single style rule can be set per style API call
			oCSSStyleDeclaration.setProperty(sName, vValue);
			vValue = oCSSStyleDeclaration.getPropertyValue(sName);
		}

		this._sStyles += (this._sStyles ? " " : "") + (sName + ": " + vValue + ";");
		return this;
	};

	/**
	 * Ends an open tag started with <code>openStart</code>.
	 *
	 * This indicates that there are no more attributes to set to the open tag.
	 *
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.openEnd = function() {
		if (this._sClasses) {
			// className can also be an instance of SVGAnimatedString if the element is an SVGElement. Therefore do not use
			// HTMLElement.className property, it is better to set the classes of an element using HTMLElement.setAttribute.
			this.attr("class", this._sClasses);
			this._sClasses = "";
		}

		if (this._sStyles) {
			// For styles, to be CSP compliant, we use the style property instead of setting the style attribute.
			// However, using the style property instead of the style attribute might report a mismatch because of
			// the serialization algorithm of the CSSStyleDeclaration. e.g.
			// $0.style = "background-color: RED;";  // background-color: red;
			// $0.style = "background: red;";        // background: red none repeat scroll 0% 0%;
			// https://drafts.csswg.org/cssom/#serialize-a-css-declaration-block
			// While it is true that this mismatch might cause a style property call unnecessarily, trying to solve
			// this problem would not bring a better performance since the possibility of changed styles is much more
			// less than unchanged styles in the overall rendering.
			// Therefore, to compare faster, here we do only string-based comparison of retrived and applied styles.
			// In worst case, we will try to update the style property unnecessarily but this will not be a real
			// style update for the engine since the parsed CSS declaration blocks will be equal at the end.
			if (this._mAttributes.style != this._sStyles) {
				this._oCurrent.style = this._sStyles;
			}
			delete this._mAttributes.style;
			this._sStyles = "";
		}

		if (this._iTagOpenState == 1 /* Tag is Open and Created */) {
			return this;
		}

		for (var sAttribute in this._mAttributes) {
			var fnMutator = AttributeMutators[sAttribute];
			if (!fnMutator || !fnMutator(this._oCurrent, null)) {
				this._oCurrent.removeAttribute(sAttribute);
			}
			delete this._mAttributes[sAttribute];
		}

		return this;
	};

	/**
	 * Ends an open self-closing tag started with <code>voidStart</code>.
	 *
	 * This indicates that there are no more attributes to set to the open tag.
	 * For self-closing tags, the <code>close</code> method must not be called.
	 *
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.voidEnd = function() {
		this.openEnd();
		this._iTagOpenState = 0; /* Closed */
		this._insertNewElement();
		return this;
	};

	/**
	 * Sets the specified text.
	 *
	 * @param {string} sText Text to be set
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.text = function(sText) {
		this._walkOnTree();
		this._matchNodeName("#text");

		if (!this._oCurrent) {
			this._oCurrent = document.createTextNode(sText);
			this._oParent.insertBefore(this._oCurrent, this._oReference);
		} else if (this._oCurrent.data != sText) {
			this._oCurrent.data = sText;
		}

		this._iTagOpenState = 0; /* Closed */
		return this;
	};


	/**
	 * Closes an open tag started with <code>openStart</code> and ended with <code>openEnd</code>.
	 *
	 * This indicates that there are no more children to append to the open tag.
	 *
	 * @param {string} sTagName The tag name of the HTML element
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 */
	Patcher.prototype.close = function(sTagName) {
		if (this._iTagOpenState) {
			this._iTagOpenState = 0; /* Closed */
			if (this._oCurrent.lastChild) {
				this._oCurrent.textContent = "";
			}
		} else {
			var oParent = this._oCurrent.parentNode;
			for (var oLastChild = oParent.lastChild; oLastChild && oLastChild != this._oCurrent; oLastChild = oParent.lastChild) {
				oParent.removeChild(oLastChild);
			}
			this._oCurrent = oParent;
		}

		this._insertNewElement();
		return this;
	};


	/**
	 * Replaces the given HTML of the current element being patched.
	 *
	 * <b>Note:</b> This API must not be used to replace the output of the root node.
	 *
	 * @param {string} sHtml HTML markup
	 * @param {sap.ui.core.ID} [sId] ID to identify the element
	 * @param {function} [fnCallback] The callback that can process the inserted DOM nodes after the HTML markup is injected into the DOM tree
	 * @return {this} Reference to <code>this</code> in order to allow method chaining
	 * @SecSink {*|XSS}
	 */
	Patcher.prototype.unsafeHtml = function(sHtml, sId, fnCallback) {
		var oReference = null;
		var oCurrent = this._oCurrent;

		if (!oCurrent) {
			oReference = this._oRoot;
		} else if (this._iTagOpenState /* Tag is Open */) {
			oReference = oCurrent.firstChild;
			if (sHtml) {
				this._iTagOpenState = 0; /* Tag is Closed */
				oCurrent.insertAdjacentHTML("afterbegin", sHtml);
				this._oCurrent = oReference ? oReference.previousSibling : oCurrent.lastChild;
			}
		} else {
			oReference = oCurrent.nextSibling;
			if (sHtml) {
				if (oCurrent.nodeType == 1 /* Node.ELEMENT_NODE */) {
					oCurrent.insertAdjacentHTML("afterend", sHtml);
				} else {
					oTemplateElement.innerHTML = sHtml;
					oCurrent.parentNode.insertBefore(oTemplateElement.content, oReference);
				}
				this._oCurrent = oReference ? oReference.previousSibling : oCurrent.parentNode.lastChild;
			}
		}

		if (sHtml && fnCallback) {
			var aNodes = [this._oCurrent];
			for (var oNode = this._oCurrent.previousSibling; oNode && oNode != oCurrent; oNode = oNode.previousSibling) {
				aNodes.unshift(oNode);
			}
			fnCallback(aNodes);
		}

		if (sId && oReference && oReference.id == sId) {
			oReference.remove();
		}

		return this;
	};

	return Patcher;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides the render manager sap.ui.core.RenderManager
sap.ui.predefine("sap/ui/core/RenderManager", [
	'./LabelEnablement',
	'sap/ui/base/Object',
	'sap/ui/performance/trace/Interaction',
	'sap/base/util/uid',
	"sap/ui/util/ActivityDetection",
	"sap/ui/thirdparty/jquery",
	"sap/base/security/encodeXML",
	"sap/base/security/encodeCSS",
	"sap/base/assert",
	"sap/ui/performance/Measurement",
	"sap/base/Log",
	"sap/base/util/extend",
	"./ControlBehavior",
	"./InvisibleRenderer",
	"./Patcher",
	"./FocusHandler"
], function(
	LabelEnablement,
	BaseObject,
	Interaction,
	uid,
	ActivityDetection,
	jQuery,
	encodeXML,
	encodeCSS,
	assert,
	Measurement,
	Log,
	extend,
	ControlBehavior,
	InvisibleRenderer,
	Patcher,
	FocusHandler
) {

	"use strict";
	/*global SVGElement*/

	var Element;

	var aCommonMethods = ["renderControl", "cleanupControlWithoutRendering", "accessibilityState", "icon"];

	/**
	 * @deprecated As of version 1.92, the string rendering methods are deprecated
	 */
	var aStrInterfaceMethods = ["write", "writeEscaped", "writeAcceleratorKey", "writeControlData", "writeElementData",
		"writeAttribute", "writeAttributeEscaped", "addClass", "writeClasses", "addStyle", "writeStyles",
		"writeAccessibilityState", "writeIcon", "translate", "getConfiguration", "getHTML"];

	var aDomInterfaceMethods = ["openStart", "voidStart", "attr", "class", "style", "openEnd", "voidEnd", "text", "unsafeHtml", "close"];

	var aNonRendererMethods = ["render", "flush", "destroy"];

	var oTemplate = document.createElement("template");

	var ATTR_STYLE_KEY_MARKER = "data-sap-ui-stylekey";

	/**
	 * An attribute marker that is set on a DOM element of a control or element to indicate
	 * that the rendering cannot be skipped and always should be executed.
	 *
	 * The attribute is set for the root DOM element of a control when the control's renderer
	 * does not support apiVersion 4. For controls that support apiVersion 4, this attribute is
	 * also set when
	 *  - the control has at least one delegate that implements an `onAfterRendering`
	 *    and/or `onBeforeRendering` event handler without also setting the `canSkipRendering` flag.
	 *    See {@link sap.ui.core.Element#addEventDelegate Element#addEventDelegate} for more information.
	 *  - the parent of the control implements the `enhanceAccessibilityState` method
	 *    and does not set the `canSkipRendering` property in the enhanced accessibility state.
	 *    See {@link sap.ui.core.Element#enhanceAccessibilityState Element#enhanceAccessibilityState} for more information.
	 *
	 * Controls define the apiVersion 4 contract only for their own rendering, therefore
	 * apiVersion 4 optimization only works when all child controls support apiVersion 4.
	 * This makes this attribute important for RM to determine apiVersion 4 optimization.
	 * @constant
	 * @private
	 */
	var ATTR_DO_NOT_SKIP_RENDERING_MARKER = "data-sap-ui-render";

	/**
	 * Creates an instance of the RenderManager.
	 *
	 * Applications or controls must not call the <code>RenderManager</code> constructor on their own
	 * but should rely on the re-rendering initiated by the framework lifecycle based on invalidation.
	 * See {@link module:sap/ui/core/Element#invalidate} and {@link module:sap/ui/core/Control#invalidate}.
	 *
	 * @class A class that handles the rendering of controls.
	 *
	 * For the default rendering task of UI5, a shared RenderManager is created and owned by <code>sap.ui.core.Core</code>.
	 * Controls or other code that want to render controls outside the default rendering task
	 * can create a private instance of RenderManager by calling the
	 * {@link sap.ui.core.Core#createRenderManager sap.ui.getCore().createRenderManager()} method.
	 * When such a private instance is no longer needed, it should be {@link #destroy destroyed}.
	 *
	 * Control renderers only have access to a subset of the public and protected instance methods of
	 * this class. The instance methods {@link #flush}, {@link #render} and {@link #destroy} are not part
	 * of that subset and are reserved to the owner of the corresponding RenderManager instance.
	 * Renderers will use the provided methods to create their HTML output. The RenderManager will
	 * collect the HTML output and inject the final HTML DOM at the desired location.
	 *
	 *
	 * <h3>Renderers</h3>
	 * When the {@link #renderControl} method of the RenderManager is invoked, it will retrieve
	 * the default renderer for that control. By convention, the default renderer is implemented in its
	 * own namespace (static class) which matches the name of the control's class with the additional
	 * suffix 'Renderer'. So for a control <code>sap.m.Input</code> the default renderer will be searched
	 * for under the global name <code>sap.m.Input<i>Renderer</i></code>.
	 *
	 * <h3>Semantic Rendering</h3>
	 * As of 1.67, <code>RenderManager</code> provides a set of new APIs to describe the structure of the DOM that can be used by the control renderers.
	 *
	 * <pre>
	 *
	 *   myButtonRenderer.render = function(rm, oButton) {
	 *
	 *       rm.openStart("button", oButton);
	 *       rm.attr("tabindex", 1);
	 *       rm.class("myButton");
	 *       rm.style("width", oButton.getWidth());
	 *       rm.openEnd();
	 *           rm.text(oButton.getText());
	 *       rm.close("button");
	 *
	 *   };
	 *
	 * </pre>
	 *
	 * By default, when the control is invalidated (e.g. a property is changed, an aggregation is removed, or an
	 * association is added), it will be registered for rerendering. During the (re)rendering, the <code>render</code>
	 * method of the control renderer is executed via a specified <code>RenderManager</code> interface and the control
	 * instance.
	 *
	 * Traditional string-based rendering creates a new HTML structure of the control in every rendering cycle and removes
	 * the existing control DOM structure from the DOM tree.
	 *
	 * The set of new semantic <code>RenderManager</code> APIs lets us understand the structure of the DOM, walk along the
	 * live DOM tree, and figure out changes as new APIs are called. If there is a change, then <code>RenderManager</code>
	 * patches only the required parts of the live DOM tree. This allows control developers to remove their DOM-related
	 * custom setters.
	 *
	 * <b>Note:</b> To enable the new in-place rendering technology, the <code>apiVersion</code> property of the control
	 * renderer must be set to <code>2</code>. This property is not inherited by subclass renderers. It has to be set
	 * anew by each subclass to assure that the extended contract between framework and renderer is fulfilled (see next
	 * paragraph).
	 *
	 * <pre>
	 *
	 *   var myButtonRenderer = {
	 *       apiVersion: 2    // enable semantic rendering
	 *   };
	 *
	 *   myButtonRenderer.render = function(rm, oButton) {
	 *
	 *       rm.openStart("button", oButton);
	 *       ...
	 *       ...
	 *       rm.close("button");
	 *
	 *   };
	 *
	 * </pre>
	 *
	 * <h3>Contract for Renderer.apiVersion 2</h3>
	 * To allow a more efficient in-place DOM patching and to ensure the compatibility of the control, the following
	 * prerequisites must be fulfilled for the controls using the new rendering technology:
	 *
	 * <ul>
	 * <li>Legacy control renderers must be migrated to the new semantic renderer API:
	 *     {@link sap.ui.core.RenderManager#openStart openStart},
	 *     {@link sap.ui.core.RenderManager#voidStart voidStart},
	 *     {@link sap.ui.core.RenderManager#style style},
	 *     {@link sap.ui.core.RenderManager#class class},
	 *     {@link sap.ui.core.RenderManager#attr attr},
	 *     {@link sap.ui.core.RenderManager#openEnd openEnd},
	 *     {@link sap.ui.core.RenderManager#voidEnd voidEnd},
	 *     {@link sap.ui.core.RenderManager#text text},
	 *     {@link sap.ui.core.RenderManager#unsafeHtml unsafeHtml},
	 *     {@link sap.ui.core.RenderManager#icon icon},
	 *     {@link sap.ui.core.RenderManager#accessibilityState accessibilityState},
	 *     {@link sap.ui.core.RenderManager#renderControl renderControl},
	 *     {@link sap.ui.core.RenderManager#cleanupControlWithoutRendering cleanupControlWithoutRendering}
	 * </li>
	 * <li>During the migration, restrictions that are defined in the API documentation of those methods must be taken
	 *     into account, e.g. tag and attribute names must be set in their canonical form.</li>
	 * <li>Fault tolerance of HTML5 markup is not applicable for the new semantic rendering API, e.g. except void tags,
	 *     all tags must be closed; duplicate attributes within one HTML element must not exist.</li>
	 * <li>Existing control DOM structure will not be removed from the DOM tree; therefore all custom events, including
	 *     the ones that are registered with jQuery, must be de-registered correctly at the <code>onBeforeRendering</code>
	 *     and <code>exit</code> hooks.</li>
	 * <li>Classes and attribute names must not be escaped.</li>
	 * <li>Styles should be validated via types (e.g. <code>sap.ui.core.CSSSize</code>). But this might not be sufficient
	 *     in all cases, e.g. validated URL values can contain harmful content; in this case
	 *     {@link module:sap/base/security/encodeCSS encodeCSS} can be used.</li>
	 * <li>To allow a more efficient DOM update, second parameter of the {@link sap.ui.core.RenderManager#openStart openStart}
	 *     or {@link sap.ui.core.RenderManager#voidStart voidStart} methods must be used to identify elements, e.g. use
	 *     <code>rm.openStart("div", oControl.getId() + "-suffix");</code> instead of
	 *     <code>rm.openStart("div").attr("id", oControl.getId() + "-suffix");</code></li>
	 * <li>Controls that listen to the <code>focusin</code> event must double check their focus handling. Since DOM nodes
	 *     are not removed and only reused, the <code>focusin</code> event might not be fired during rerendering.</li>
	 * </ul>
	 *
	 * <h3>Contract for Renderer.apiVersion 4</h3>
	 * The <code>apiVersion 4</code> marker of the control renderer lets the <code>RenderManager</code> know if a control's output is not affected by changes in the parent control.
	 * By default, if a property, an aggregation, or an association of a control is changed, then the control gets invalidated, and the rerendering process for that control and all of its
	 * children starts. That means child controls rerender together with their parent even though there is no DOM update necessary. If a control's output is only affected by its own
	 * properties, aggregations, or associations, then the <code>apiVersion 4</code> marker can help to reuse the control's DOM output and prevent child controls from rerendering unnecessarily
	 * while they are getting rendered by their parent. This can help to improve performance by reducing the number of re-renderings.<br>
	 * For example: A control called "ParentControl" has a child control called "ChildControl". ChildControl has its own properties, aggregations, and associations, and its output is only affected by them.
	 * The <code>apiVersion 4</code> marker is set in the renderer of ChildControl. Whenever a property of the ParentControl is changed during the re-rendering process, the <code>RenderManager</code>
	 * will check the <code>apiVersion</code> marker of the ChildControl's renderer, and if it's 4, the <code>RenderManager</code> will skip rendering of the ChildControl.<br>
	 *
	 * To allow a more efficient rerendering with an <code>apiVersion 4</code> marker, the following prerequisites must be fulfilled for the control to ensure compatibility:
	 *
	 * <ul>
	 * <li>All the prerequisites of the <code>apiVersion 2</code> marker must be fulfilled by the control.</li>
	 * <li>The behavior and rendering logic of the control must not rely on the assumption that it will always be re-rendered at the same time as its parent.</li>
	 * <li>The <code>onBeforeRendering</code> and <code>onAfterRendering</code> hooks of the control must not be used to manipulate or access any elements outside of the control's own DOM structure.</li>
	 * <li>The control renderer must maintain a proper rendering encapsulation and render only the properties, aggregations, and associations that are specific to the control. The renderer should not reference or depend on any state of the parent control or any other external element.</li>
	 * <li>If certain aggregations are dependent on the state of the parent control, they must always be rendered together with their parent. To accomplish this, the parent control must use the {@link sap.ui.core.Control#invalidate invalidate} method to signal to the child controls
	 * that they need to re-render whenever the dependent state of the parent control changes. This guarantees that the child controls are always in sync with the parent control, regardless of the <code>apiVersion</code> definition of their renderer.</li>
	 * </ul><br>
	 *
	 * <b>Note:</b> The rendering can only be skipped if the renderer of each descendant control has the <code>apiVersion 4</code> marker, and no <code>onBeforeRendering</code> or <code>onAfterRendering</code> event delegates are registered. However, while
	 * {@link sap.ui.core.Element#addEventDelegate adding the event delegate}, setting the <code>canSkipRendering</code> property to <code>true</code> on the event delegate object can be done to indicate that those delegate handlers are compliant with the
	 * <code>apiVersion:4</code> prerequisites and still allows for rendering optimization.<br>
	 * The <code>canSkipRendering</code> property can also be used for the controls that enhance the accessibility state of child controls with implementing the {@link sap.ui.core.Element#enhanceAccessibilityState enhanceAccessibilityState} method. In this case,
	 * setting the <code>canSkipRendering</code> property to <code>true</code> lets the <code>RenderManager</code> know that the parent control's accessibility enhancement is static and does not interfere with the child control's rendering optimization.
	 *
	 * @see sap.ui.core.Core
	 * @see sap.ui.getCore
	 *
	 * @extends Object
	 * @author SAP SE
	 * @version 1.125.0
	 * @alias sap.ui.core.RenderManager
	 * @hideconstructor
	 * @public
	 */
	function RenderManager() {

		var that = this,
			aBuffer,
			aRenderedControls,
			aStyleStack,
			bLocked,
			sOpenTag = "",                 // stores the last open tag that is used for the validation
			bVoidOpen = false,             // specifies whether the last open tag is a void tag or not
			bDomInterface,                 // specifies the rendering interface that is used by the control renderers
			sLegacyRendererControlId = "", // stores the id of the control that has a legacy renderer while its parent has the new semantic renderer
			oStringInterface = {},         // holds old string based rendering API and the string implementation of the new semantic rendering API
			oDomInterface = {},            // semantic rendering API for the controls whose renderer provides apiVersion=2 marker
			aRenderingStyles = [],         // during string-based rendering, stores the styles that couldn't be set via style attribute due to CSP restrictions
			oPatcher = new Patcher(),      // the Patcher instance to handle in-place DOM patching
			sLastStyleMethod,
			sLastClassMethod;

		/**
		 * Reset all rendering related buffers.
		 */
		function reset() {
			assert(!(sLastStyleMethod = sLastClassMethod = ""));
			aBuffer = that.aBuffer = [];
			aRenderedControls = that.aRenderedControls = [];
			aStyleStack = that.aStyleStack = [{}];
			bDomInterface = undefined;
			bVoidOpen = false;
			sOpenTag = "";
		}

		function writeAttribute(sName, vValue) {
			aBuffer.push(" ", sName, "=\"", vValue, "\"");
		}

		function writeClasses(oElement) {
			var oStyle = aStyleStack[aStyleStack.length - 1];

			// Custom classes are added by default from the currently rendered control. If an oElement is given, this Element's custom style
			// classes are added instead. If oElement === false, no custom style classes are added.
			var aCustomClasses;
			if (oElement) {
				aCustomClasses = oElement.aCustomStyleClasses;
			} else if (oElement === false) {
				aCustomClasses = [];
			} else {
				aCustomClasses = oStyle.aCustomStyleClasses;
			}

			if (oStyle.aClasses || aCustomClasses) {
				var aClasses = [].concat(oStyle.aClasses || [], aCustomClasses || []);
				if (aClasses.length) {
					writeAttribute("class", aClasses.join(" "));
				}
			}

			if (!oElement) {
				oStyle.aCustomStyleClasses = null;
			}
			oStyle.aClasses = null;
		}

		/**
		 * Used by the string rendering APIs to write out the collected styles during writeStyles/openEnd/voidEnd
		 * @param {sap.ui.core.RenderManager} oRm The <code>RenderManager</code> instance
		 * @private
		 */
		function writeStyles() {
			var oStyle = aStyleStack[aStyleStack.length - 1];
			if (oStyle.aStyle && oStyle.aStyle.length) {
				// Due to possible CSP restrictions we do not write styles into the HTML buffer. Instead, we store the styles in the aRenderingStyles array
				// and add a ATTR_STYLE_KEY_MARKER attribute marker for which the value references the original style index in the aRenderingStyles array.
				writeAttribute(ATTR_STYLE_KEY_MARKER, aRenderingStyles.push(oStyle.aStyle.join(" ")) - 1);
			}
			oStyle.aStyle = null;
		}

		//#################################################################################################
		// Assertion methods for validating Semantic Rendering API calls
		// These methods will be converted to inline asserts when assertion removal is supported
		//#################################################################################################

		function assertValidName(sName, sField) {
			assert(sName && typeof sName == "string" && /^[a-z_][a-zA-Z0-9_\-]*$/.test(sName), "The " + sField + " name provided '" + sName + "' is not valid; it must contain alphanumeric characters, hyphens or underscores");
		}

		function assertOpenTagHasStarted(sMethod) {
			assert(sOpenTag, "There is no open tag; '" + sMethod + "' must not be called without an open tag");
		}

		function assertOpenTagHasEnded(bCustomAssertion) {
			var bAssertion = (bCustomAssertion === undefined) ? !sOpenTag : bCustomAssertion;
			assert(bAssertion, "There is an open tag; '" + sOpenTag + "' tag has not yet ended with '" + (bVoidOpen ? "voidEnd" : "openEnd") + "'");
		}

		function assertValidAttr(sAttr) {
			assertValidName(sAttr, "attr");
			assert((sAttr != "class" || sLastClassMethod != "class" && (sLastClassMethod = "attr"))
				&& (sAttr != "style" || sLastStyleMethod != "style" && (sLastStyleMethod = "attr")),
				"Attributes 'class' and 'style' must not be written when the methods with the same name"
				+ " have been called for the same element already");
		}

		function assertValidClass(sClass) {
			assert(sLastClassMethod != "attr" && (sLastClassMethod = "class"),
				"Method class() must not be called after the 'class' attribute has been written for the same element");
			assert(typeof sClass == "string" && !/\s/.test(sClass) && arguments.length === 1, "Method 'class' must be called with exactly one class name");
		}

		function assertValidStyle(sStyle) {
			assert(sLastStyleMethod != "attr" && (sLastStyleMethod = "style"),
				"Method style() must not be called after the 'style' attribute has been written for the same element");
			assert(sStyle && typeof sStyle == "string" && !/\s/.test(sStyle), "Method 'style' must be called with a non-empty string name");
		}

		//#################################################################################################
		// Methods for 'Buffered writer' functionality... (all public)
		// i.e. used methods in render-method of Renderers
		//#################################################################################################

		/**
		 * Write the given texts to the buffer.
		 * @param {...string|number} sText (can be a number too)
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @deprecated Since 1.92. Instead, use the {@link sap.ui.core.RenderManager Semantic Rendering API}.
		 *   There is no 1:1 replacement for <code>write</code>. Typically, <code>write</code> is used to create
		 *   a longer sequence of HTML markup (e.g. an element with attributes and children) in a single call.
		 *   Such a markup sequence has to be split into the individual calls of the Semantic Rendering API.
		 *
		 *   <br><br>Example:<br>
		 *     oRm.write("&lt;span id=\"" + oCtrl.getId() + "-outer\" class=\"myCtrlOuter\"&gt;"
		 *        + "&amp;nbsp;" + oResourceBundle.getText("TEXT_KEY") + "&amp;nbsp;&lt;/span&gt;");
		 *   <br><br>
		 *   has to be transformed to
		 *   <br><br>
		 *   oRm.openStart("span", oCtrl.getId() + "-outer").class("myCtrlOuter").openEnd().text("\u00a0" + oResourceBundle.getText("TEXT_KEY") + "\u00a0").close("span");
		 *   <br><br>
		 *   Note that "&amp;nbsp;" was replaced with "\u00a0" (no-break-space). In general, HTML entities
		 *   have to be replaced by the corresponding Unicode character escapes. A mapping table can be found
		 *   at {@link https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references}.
		 *
		 * @SecSink {*|XSS}
		 */
		this.write = function(/** string|number */ sText /* ... */) {
			assert(( typeof sText === "string") || ( typeof sText === "number"), "sText must be a string or number");
			aBuffer.push.apply(aBuffer, arguments);
			return this;
		};

		/**
		 * Escape text for HTML and write it to the buffer.
		 *
		 * For details about the escaping refer to {@link sap/base/security/encodeXML}.
		 *
		 * @param {any} sText the text to escape
		 * @param {boolean} [bLineBreaks=false] Whether to convert line breaks into <br> tags
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#text} of the {@link sap.ui.core.RenderManager Semantic Rendering API}.
		 */
		this.writeEscaped = function(sText, bLineBreaks) {
			if ( sText != null ) {
				sText = encodeXML( String(sText) );
				if (bLineBreaks) {
					sText = sText.replace(/&#xa;/g, "<br>");
				}
				aBuffer.push(sText);
			}
			return this;
		};

		/**
		 * Writes the attribute and its value into the HTML.
		 *
		 * For details about the escaping refer to {@link sap/base/security/encodeXML}.
		 *
		 * @param {string} sName Name of the attribute
		 * @param {string | number | boolean} vValue Value of the attribute
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#attr} of the {@link sap.ui.core.RenderManager Semantic Rendering API}.
		 * @SecSink {0 1|XSS} Attributes are written to HTML without validation
		 */
		this.writeAttribute = function(sName, vValue) {
			assert(typeof sName === "string", "sName must be a string");
			assert(typeof vValue === "string" || typeof vValue === "number" || typeof vValue === "boolean", "value must be a string, number or boolean");
			aBuffer.push(" ", sName, "=\"", vValue, "\"");
			return this;
		};

		/**
		 * Writes the attribute and a value into the HTML, the value will be encoded.
		 *
		 * The value is properly encoded to avoid XSS attacks.
		 *
		 * @param {string} sName Name of the attribute
		 * @param {any} vValue Value of the attribute
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#attr} of the {@link sap.ui.core.RenderManager Semantic Rendering API}.
		 * @SecSink {0|XSS}
		 */
		this.writeAttributeEscaped = function(sName, vValue) {
			assert(typeof sName === "string", "sName must be a string");
			aBuffer.push(" ", sName, "=\"", encodeXML(String(vValue)), "\"");
			return this;
		};

		/**
		 * Adds a style property to the style collection if the value is not empty or null
		 * The style collection is flushed if it is written to the buffer using {@link #writeStyle}
		 *
		 * @param {string} sName Name of the CSS property to write
		 * @param {string|float|int} vValue Value to write
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#style} of the {@link sap.ui.core.RenderManager Semantic Rendering API}.
		 * @SecSink {0 1|XSS} Styles are written to HTML without validation
		 */
		this.addStyle = function(sName, vValue) {
			assert(typeof sName === "string", "sName must be a string");
			if (vValue != null && vValue != "") {
				assert((typeof vValue === "string" || typeof vValue === "number"), "value must be a string or number");
				var oStyle = aStyleStack[aStyleStack.length - 1];
				if (!oStyle.aStyle) {
					oStyle.aStyle = [];
				}
				oStyle.aStyle.push(sName + ": " + vValue + ";");
			}
			return this;
		};

		/**
		 * Writes and flushes the style collection
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @deprecated Since 1.92. Not longer needed, when using the {@link sap.ui.core.RenderManager Semantic Rendering API}
		 *  the actual writing of styles happens when {@link sap.ui.core.RenderManager#openEnd} or {@link sap.ui.core.RenderManager#voidEnd} are used.
		 */
		this.writeStyles = function() {
			writeStyles();
			return this;
		};

		/**
		 * Adds a class to the class collection if the name is not empty or null.
		 * The class collection is flushed if it is written to the buffer using {@link #writeClasses}
		 *
		 * @param {string} sName name of the class to be added; null values are ignored
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#class} of the {@link sap.ui.core.RenderManager Semantic Rendering API}.
		 * @SecSink {0|XSS} Classes are written to HTML without validation
		 */
		this.addClass = function(sName) {
			if (sName) {
				assert(typeof sName === "string", "sName must be a string");
				var oStyle = aStyleStack[aStyleStack.length - 1];
				if (!oStyle.aClasses) {
					oStyle.aClasses = [];
				}
				oStyle.aClasses.push(sName);
			}
			return this;
		};

		/**
		 * Writes and flushes the class collection (all CSS classes added by "addClass()" since the last flush).
		 * Also writes the custom style classes added by the application with "addStyleClass(...)". Custom classes are
		 * added by default from the currently rendered control. If an oElement is given, this Element's custom style
		 * classes are added instead. If oElement === false, no custom style classes are added.
		 *
		 * @param {sap.ui.core.Element | boolean} [oElement] an Element from which to add custom style classes (instead of adding from the control itself)
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @deprecated Since 1.92. Not longer needed, when using the {@link sap.ui.core.RenderManager Semantic Rendering API}
		 *  the actual writing of classes happens when {@link sap.ui.core.RenderManager#openEnd} or {@link sap.ui.core.RenderManager#voidEnd} are used.
		 */
		this.writeClasses = function(oElement) {
			assert(!oElement || typeof oElement === "boolean" || BaseObject.isObjectA(oElement, 'sap.ui.core.Element'), "oElement must be empty, a boolean, or an sap.ui.core.Element");
			writeClasses(oElement);
			return this;
		};

		//#################################################################################################
		// Semantic Rendering Interface for String Based Rendering
		//#################################################################################################

		/**
		 * Opens the start tag of an HTML element.
		 *
		 * This must be followed by <code>openEnd</code> and concluded with <code>close</code>.
		 * To allow a more efficient DOM update, all tag names have to be used in their canonical form.
		 * For HTML elements, {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element tag names} must all be set in lowercase.
		 * For foreign elements, such as SVG, {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Element tag names} can be set in upper camel case (e.g. linearGradient).
		 *
		 * @param {string} sTagName Tag name of the HTML element
	 	 * @param {sap.ui.core.Element|sap.ui.core.ID} [vControlOrId] Control instance or ID to identify the element
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 *
		 * @public
		 * @since 1.67
		 */
		this.openStart = function(sTagName, vControlOrId) {
			assertValidName(sTagName, "tag");
			assertOpenTagHasEnded();
			assert(!(sLastStyleMethod = sLastClassMethod = ""));
			sOpenTag = sTagName;

			aBuffer.push("<" + sTagName);
			if (vControlOrId) {
				if (typeof vControlOrId == "string") {
					this.attr("id", vControlOrId);
				} else {
					assert(vControlOrId && BaseObject.isObjectA(vControlOrId, 'sap.ui.core.Element'), "vControlOrId must be an sap.ui.core.Element");

					this.attr("id", vControlOrId.getId());
					renderElementData(this, vControlOrId);
				}
			}

			return this;
		};

		/**
		 * Ends an open tag started with <code>openStart</code>.
		 *
		 * This indicates that there are no more attributes to set to the open tag.
		 *
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 */
		this.openEnd = function(bExludeStyleClasses /* private */) {
			assertOpenTagHasStarted("openEnd");
			assertOpenTagHasEnded(!bVoidOpen);
			assert(bExludeStyleClasses === undefined || bExludeStyleClasses === true, "The private parameter bExludeStyleClasses must be true or omitted!");
			sOpenTag = "";

			writeClasses(bExludeStyleClasses === true ? false : undefined);
			writeStyles();
			aBuffer.push(">");
			return this;
		};

		/**
		 * Closes an open tag started with <code>openStart</code> and ended with <code>openEnd</code>.
		 *
		 * This indicates that there are no more children to append to the open tag.
		 *
		 * @param {string} sTagName Tag name of the HTML element
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 */
		this.close = function(sTagName) {
			assertValidName(sTagName, "tag");
			assertOpenTagHasEnded();

			aBuffer.push("</" + sTagName + ">");
			return this;
		};

		/**
		 * Starts a self-closing tag, such as <code>img</code> or <code>input</code>.
		 *
		 * This must be followed by <code>voidEnd</code>. For self-closing tags, the <code>close</code> method must not be called.
		 * To allow a more efficient DOM update, void tag names have to be set in lowercase.
		 * This API is specific for void elements and must not be used for foreign elements.
		 * For more information, see {@link https://www.w3.org/TR/html5/syntax.html#void-elements}.
		 *
		 * @param {string} sTagName Tag name of the HTML element
		 * @param {sap.ui.core.Element|sap.ui.core.ID} [vControlOrId] Control instance or ID to identify the element
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 */
		this.voidStart = function (sTagName, vControlOrId) {
			this.openStart(sTagName, vControlOrId);

			bVoidOpen = true;
			return this;
		};

		/**
		 * Ends an open self-closing tag started with <code>voidStart</code>.
		 *
		 * This indicates that there are no more attributes to set to the open tag.
		 * For self-closing tags <code>close</code> must not be called.
		 *
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 */
		this.voidEnd = function (bExludeStyleClasses /* private */) {
			assertOpenTagHasStarted("voidEnd");
			assertOpenTagHasEnded(bVoidOpen || !sOpenTag);
			bVoidOpen = false;
			sOpenTag = "";

			writeClasses(bExludeStyleClasses ? false : undefined);
			writeStyles();
			aBuffer.push(">");
			return this;
		};

		/**
		 * Sets the given HTML markup without any encoding or sanitizing.
		 *
		 * This must not be used for plain texts; use the <code>text</code> method instead.
		 *
		 * @param {string} sHtml Well-formed, valid HTML markup
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 * @SecSink {*|XSS}
		 */
		this.unsafeHtml = function(sHtml) {
			assertOpenTagHasEnded();

			aBuffer.push(sHtml);
			return this;
		};

		/**
		 * Sets the text content with the given text.
		 *
		 * Line breaks are not supported by this method, use CSS
		 * {@link https://www.w3.org/TR/CSS2/text.html#white-space-prop white-space: pre-line}
		 * option to implement line breaks.
		 *
		 * HTML entities are not supported by this method,
		 * use unicode escaping or the unicode character to implement HTML entities.
		 * For further information see
		 * {@link https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references}.
		 *
		 * @param {string} sText The text to be written
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 */
		this.text = function(sText) {
			assertOpenTagHasEnded();
			if ( sText != null ) {
				sText = encodeXML( String(sText) );
				aBuffer.push(sText);
			}
			return this;
		};

		/**
		 * Adds an attribute name-value pair to the last open HTML element.
		 *
		 * This is only valid when called between <code>openStart/voidStart</code> and <code>openEnd/voidEnd</code>.
		 * The attribute name must not be equal to <code>style</code> or <code>class</code>.
		 * Styles and classes must be set via dedicated <code>class</code> or <code>style</code> methods.
		 * To update the DOM correctly, all attribute names have to be used in their canonical form.
		 * For HTML elements, {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes attribute names} must all be set in lowercase.
		 * For foreign elements, such as SVG, {@link https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute attribute names} can be set in upper camel case (e.g. viewBox).
		 *
		 * HTML entities are not supported by this method,
		 * use unicode escaping or the unicode character to implement HTML entities.
		 * For further information see
		 * {@link https://html.spec.whatwg.org/multipage/named-characters.html#named-character-references}.
		 *
		 * @param {string} sName Name of the attribute
		 * @param {*} vValue Value of the attribute
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 */
		this.attr = function(sName, vValue) {
			assertValidAttr(sName);

			if (sName == "style") {
				aStyleStack[aStyleStack.length - 1].aStyle = [vValue];
			} else {
				aBuffer.push(" ", sName, "=\"", encodeXML(String(vValue)), "\"");
			}
			return this;
		};

		/**
		 * Adds a class name to the class collection of the last open HTML element.
		 *
		 * This is only valid when called between <code>openStart/voidStart</code> and <code>openEnd/voidEnd</code>.
		 * Class name must not contain any whitespace.
		 *
		 * @param {string} sClass Class name to be written
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 */
		this.class = function(sClass) {
			if (sClass) {
				assertValidClass.apply(this, arguments);
				var oStyle = aStyleStack[aStyleStack.length - 1];
				if (!oStyle.aClasses) {
					oStyle.aClasses = [];
				}
				oStyle.aClasses.push(encodeXML(sClass));
			}
			return this;
		};

		/**
		 * Adds a style name-value pair to the style collection of the last open HTML element.
		 *
		 * This is only valid when called between <code>openStart/voidStart</code> and <code>openEnd/voidEnd</code>.
		 * To allow a more efficient DOM update, the CSS property names and values have to be used in their canonical form.
		 * In general, CSS properties are lower-cased in their canonical form, except for parts that are not under the control of CSS.
		 * For more information, see {@link https://www.w3.org/TR/CSS/#indices}.
		 *
		 * @param {string} sName Name of the style property
		 * @param {string|float|int} vValue Value of the style property
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 * @since 1.67
		 */
		this.style = function(sName, vValue) {
			assertValidStyle(sName);

			if (vValue != null && vValue != "") {
				assert((typeof vValue === "string" || typeof vValue === "number"), "value must be a string or number");
				var oStyle = aStyleStack[aStyleStack.length - 1];
				if (!oStyle.aStyle) {
					oStyle.aStyle = [];
				}
				oStyle.aStyle.push(sName + ": " + vValue + ";");
			}
			return this;
		};

		//#################################################################################################
		// Semantic Rendering Interface for DOM Based Rendering
		//#################################################################################################

		// @see sap.ui.core.RenderManager#openStart
		oDomInterface.openStart = function(sTagName, vControlOrId) {
			assertValidName(sTagName, "tag");
			assertOpenTagHasEnded();
			assert(!(sLastStyleMethod = sLastClassMethod = ""));
			sOpenTag = sTagName;

			if (!vControlOrId) {
				oPatcher.openStart(sTagName);
			} else if (typeof vControlOrId == "string") {
				oPatcher.openStart(sTagName, vControlOrId);
			} else {
				oPatcher.openStart(sTagName, vControlOrId.getId());
				renderElementData(this, vControlOrId);
			}

			return this;
		};

		// @see sap.ui.core.RenderManager#voidStart
		oDomInterface.voidStart = function(sTagName, vControlOrId) {
			this.openStart(sTagName, vControlOrId);

			bVoidOpen = true;
			return this;
		};

		// @see sap.ui.core.RenderManager#attr
		oDomInterface.attr = function(sName, vValue) {
			assertValidAttr(sName);
			assertOpenTagHasStarted("attr");

			oPatcher.attr(sName, vValue);
			return this;
		};

		// @see sap.ui.core.RenderManager#class
		oDomInterface.class = function(sClass) {
			if (sClass) {
				assertValidClass.apply(this, arguments);
				assertOpenTagHasStarted("class");

				oPatcher.class(sClass);
			}

			return this;
		};

		// @see sap.ui.core.RenderManager#style
		oDomInterface.style = function(sName, vValue) {
			assertValidStyle(sName);
			assertOpenTagHasStarted("style");

			oPatcher.style(sName, vValue);
			return this;
		};

		// @see sap.ui.core.RenderManager#openEnd
		oDomInterface.openEnd = function(bExludeStyleClasses /* private */) {
			if (bExludeStyleClasses !== true) {
				var oStyle = aStyleStack[aStyleStack.length - 1];
				var aStyleClasses = oStyle.aCustomStyleClasses;
				if (aStyleClasses) {
					aStyleClasses.forEach(oPatcher.class, oPatcher);
					oStyle.aCustomStyleClasses = null;
				}
			}

			assertOpenTagHasStarted("openEnd");
			assertOpenTagHasEnded(!bVoidOpen);
			assert(bExludeStyleClasses === undefined || bExludeStyleClasses === true, "The private parameter bExludeStyleClasses must be true or omitted!");
			sOpenTag = "";

			oPatcher.openEnd();
			return this;
		};

		// @see sap.ui.core.RenderManager#voidEnd
		oDomInterface.voidEnd = function(bExludeStyleClasses /* private */) {
			if (!bExludeStyleClasses) {
				var oStyle = aStyleStack[aStyleStack.length - 1];
				var aStyleClasses = oStyle.aCustomStyleClasses;
				if (aStyleClasses) {
					aStyleClasses.forEach(oPatcher.class, oPatcher);
					oStyle.aCustomStyleClasses = null;
				}
			}

			assertOpenTagHasStarted("voidEnd");
			assertOpenTagHasEnded(bVoidOpen || !sOpenTag);
			bVoidOpen = false;
			sOpenTag = "";

			oPatcher.voidEnd();
			return this;
		};

		// @see sap.ui.core.RenderManager#text
		oDomInterface.text = function(sText) {
			assertOpenTagHasEnded();

			if (sText != null) {
				oPatcher.text(sText);
			}

			return this;
		};

		// @see sap.ui.core.RenderManager#unsafeHtml
		oDomInterface.unsafeHtml = function(sHtml) {
			assertOpenTagHasEnded();

			oPatcher.unsafeHtml(sHtml);
			return this;
		};

		// @see sap.ui.core.RenderManager#close
		oDomInterface.close = function(sTagName) {
			assertValidName(sTagName, "tag");
			assertOpenTagHasEnded();

			oPatcher.close(sTagName);
			return this;
		};


		//Triggers the BeforeRendering event on the given Control
		function triggerBeforeRendering(oControl){
			bLocked = true;
			try {
				var oEvent = new jQuery.Event("BeforeRendering");
				// store the element on the event (aligned with jQuery syntax)
				oEvent.srcControl = oControl;
				oControl._bOnBeforeRenderingPhase = true;
				oControl._handleEvent(oEvent);
			} finally {
				oControl._bOnBeforeRenderingPhase = false;
				bLocked = false;
			}
		}

		/**
		 * Cleans up the rendering state of the given control without rendering it.
		 *
		 * A control is responsible for the rendering of all its child controls.
		 * But in some cases it makes sense that a control only renders a subset of its children
		 * based on some criterion. For example, a typical carousel control might, for performance
		 * reasons, only render the currently visible children (and maybe some child before and
		 * after the visible area to facilitate slide-in / slide-out animations), but not all children.
		 * This leads to situations where a child had been rendered before, but shouldn't be rendered
		 * anymore after an update of the carousel's position. The DOM related state of that child then
		 * must be cleaned up correctly, e.g. by de-registering resize handlers or native event handlers.
		 * <code>cleanupControlWithoutRendering</code> helps with that task by triggering the same
		 * activities that the normal rendering triggers before the rendering of a control
		 * (e.g. it fires the <code>BeforeRendering</code> event). It just doesn't call the renderer
		 * and the control will not receive an <code>AfterRendering</code> event.
		 *
		 * The following example shows how <code>renderControl</code> and <code>cleanupControlWithoutRendering</code>
		 * should be used:
		 *
		 * <pre>
		 *   CarouselRenderer.render = function(rm, oCarousel){
		 *
		 *     ...
		 *
		 *     oCarousel.getPages().forEach( function( oPage ) {
		 *        if ( oCarousel.isPageToBeRendered( oPage ) ) {
		 *           rm.renderControl( oPage ); // onBeforeRendering, render, later onAfterRendering
		 *        } else {
		 *           rm.cleanupControlWithoutRendering( oPage ); // onBeforeRendering
		 *        }
		 *     });
		 *
		 *     ...
		 *
		 *   };
		 * </pre>
		 *
		 * <h3>DOM Removal</h3>
		 * The method does not remove the DOM of the given control. The caller of this method has
		 * to take care to remove it at some later point in time. It should indeed be <i>later</i>,
		 * not <i>before</i> as the <code>onBeforeRendering</code> hook of the control might need
		 * access to the old DOM for a proper cleanup.
		 *
		 * For parents which are rendered with the normal mechanism as shown in the example above,
		 * the removal of the old child DOM is guaranteed. The whole DOM of the parent control
		 * (including the DOM of the no longer rendered child) will be replaced with new DOM (no
		 * longer containing the child) when the rendering cycle finishes.
		 *
		 * <b>Note:</b>: the functionality of this method is different from the default handling for
		 * invisible controls (controls with <code>visible == false</code>). The standard rendering
		 * for invisible controls still renders a placeholder DOM. This allows rerendering of the
		 * invisible control once it becomes visible again without a need to render its parent, too.
		 * Children that are cleaned up with this method here, are supposed to have no more DOM at all.
		 * Rendering them later on therefore requires an involvement (typically: a rendering) of
		 * their parent.
		 *
		 * @param {sap.ui.core.Control} oControl Control that should be cleaned up
		 * @public
		 * @since 1.22.9
		 */
		this.cleanupControlWithoutRendering = function(oControl) {
			assert(!oControl || BaseObject.isObjectA(oControl, 'sap.ui.core.Control'), "oControl must be an sap.ui.core.Control or empty");
			if (!oControl) {
				return;
			}

			var oDomRef = oControl.getDomRef();
			if (oDomRef) {

				// Call beforeRendering to allow cleanup
				triggerBeforeRendering(oControl);

				// as children are not visited during rendering, their DOM has to be preserved here
				RenderManager.preserveContent(oDomRef, /* bPreserveRoot */ false, /* bPreserveNodesWithId */ false);

				// Preserved controls still need to be alive
				if (!oDomRef.hasAttribute(ATTR_PRESERVE_MARKER)) {
					oControl._bNeedsRendering = false;
					oControl.bOutput = false;
				}
			}
		};

		/**
		 * Executes the control renderer with the valid rendering interface.
		 *
		 * @param {sap.ui.core.Control} oControl The control that should be rendered
		 * @param {boolean} bTriggerEvent Whether onBeforeRendering event should be triggered or not
		 * @private
		 */
		function executeRenderer(oControl, bTriggerEvent) {
			// trigger onBeforeRendering hook of the control if needed
			if (bTriggerEvent) {
				triggerBeforeRendering(oControl);
			}

			// unbind any generically bound browser event handlers
			if (oControl.bOutput == true) {
				var aBindings = oControl.aBindParameters;
				if (aBindings && aBindings.length > 0) {
					var $Control = oControl.$();
					aBindings.forEach(function(mParams) {
						$Control.off(mParams.sEventType, mParams.fnProxy);
					});
				}
			}

			// if the control uses default visible property then use the InvisibleRenderer, otherwise the renderer of the control
			var oRenderer = getCurrentRenderer(oControl);
			if (oRenderer == InvisibleRenderer) {

				// invoke the InvisibleRenderer in case the control uses the default visible property
				InvisibleRenderer.render(bDomInterface ? oDomInterface : oStringInterface, oControl);

				// if an invisible placeholder was rendered, mark with invisible marker
				oControl.bOutput = "invisible";

			} else if (oRenderer && typeof oRenderer.render === "function") {

				// before the control rendering get custom style classes of the control
				var oControlStyles = {};
				if (oControl.aCustomStyleClasses && oControl.aCustomStyleClasses.length > 0) {
					oControlStyles.aCustomStyleClasses = oControl.aCustomStyleClasses;
				}

				// push them to the style stack that will be read by the first writeClasses/openEnd/voidEnd call to append additional classes
				aStyleStack.push(oControlStyles);

				// mark that the rendering phase has been started
				oControl._bRenderingPhase = true;

				// execute the control renderer according to rendering interface
				if (bDomInterface) {

					// remember the cursor of the Patcher before the control renderer is executed
					var oCurrentNode = oPatcher.getCurrentNode();

					// let the rendering happen with DOM rendering interface
					oRenderer.render(oDomInterface, oControl);

					// determine whether an output is produced
					if (oPatcher.getCurrentNode() == oCurrentNode) {

						// during the rendering the cursor of the Patcher should move to the next element when openStart or voidStart is called
						// compare after rendering cursor with before rendering cursor to determine whether the control produced any output
						// we need to remove the control DOM if there is no output produced
						oPatcher.unsafeHtml("", oControl.getId());
						oControl.bOutput = false;

					} else {

						// the cursor of the patcher is moved so the output is produced
						oControl.bOutput = true;
					}

				} else {

					// remember the buffer size before the control renderer is executed
					var iBufferLength = aBuffer.length;

					// let the rendering happen with DOM rendering interface
					oRenderer.render(oStringInterface, oControl);

					// compare after rendering buffer size with the before rendering buffer size to determine whether the control produced any output
					oControl.bOutput = (aBuffer.length != iBufferLength);
				}

				// mark that the rendering phase is over
				oControl._bRenderingPhase = false;

				// pop from the style stack after rendering for the next control
				aStyleStack.pop();

			} else {
				Log.error("The renderer for class " + oControl.getMetadata().getName() + " is not defined or does not define a render function! Rendering of " + oControl.getId() + " will be skipped!");
			}

			// store the rendered control
			aRenderedControls.push(oControl);

			// clear the controls dirty marker
			oControl._bNeedsRendering = false;

			// let the UIArea know that this control has been rendered
			var oUIArea = oControl.getUIArea();
			if (oUIArea) {
				oUIArea._onControlRendered(oControl);
			}
		}

		/**
		 * Turns the given control into its HTML representation and appends it to the
		 * rendering buffer.
		 *
		 * If the given control is undefined or null, then nothing is rendered.
		 *
		 * @param {sap.ui.core.Control} oControl the control that should be rendered
		 * @returns {this} Reference to <code>this</code> in order to allow method chaining
		 * @public
		 */
		this.renderControl = function(oControl) {
			assert(!oControl || BaseObject.isObjectA(oControl, 'sap.ui.core.Control'), "oControl must be an sap.ui.core.Control or empty");
			if (!oControl) {
				return this;
			}

			var oDomRef, oRenderer;
			var bTriggerBeforeRendering = true;

			// determine the rendering interface
			if (aBuffer.length) {

				// string rendering has been already started therefore we cannot use DOM rendering interface anymore
				bDomInterface = false;

			} else if (bDomInterface === undefined) {

				// trigger onBeforeRendering before checking the visibility, since the visible property might change in the event handler
				triggerBeforeRendering(oControl);

				// mark that onBeforeRendering event has been already triggered and yet another onBeforeRendering event is not necessary
				bTriggerBeforeRendering = false;

				// if the control uses the default visible property then use the InvisibleRenderer, otherwise the renderer of the control
				oRenderer = getCurrentRenderer(oControl);

				// rendering interface must be determined for the root control once per rendering
				if (RenderManager.getApiVersion(oRenderer) != 1) {

					// get the visible or invisible DOM element of the control
					oDomRef = oControl.getDomRef() || InvisibleRenderer.getDomRef(oControl);

					// If the control is in the preserved area then we should not use the DOM-based rendering to avoid patching of preserved nodes
					if (RenderManager.isPreservedContent(oDomRef)) {
						bDomInterface = false;
					} else {
						// patching will happen during the control renderer calls therefore we need to get the focus info before the patching
						oDomRef && FocusHandler.storePatchingControlFocusInfo(oDomRef);

						// set the starting point of the Patcher
						oPatcher.setRootNode(oDomRef);

						// remember that we are using DOM based rendering interface
						bDomInterface = true;
					}

				} else {

					// DOM rendering is not possible we fall back to string rendering interface
					bDomInterface = false;
				}

			} else if (!sLegacyRendererControlId && bDomInterface) {

				// if the control uses the default visible property then use the InvisibleRenderer, otherwise the renderer of the control
				oRenderer = getCurrentRenderer(oControl);

				// for every subsequent renderControl call we need to check whether we can continue with the DOM based rendering
				if (RenderManager.getApiVersion(oRenderer) == 1) {

					// remember the control id that we have to provide string rendering interface
					sLegacyRendererControlId = oControl.getId();
					bDomInterface = false;
				}
			}

			// execute the renderer of the control through the valid rendering interface
			if (bDomInterface) {

				// determine whether we should execute the control renderer with DOM rendering interface or whether we can skip the rendering of the control if it does not need rendering
				if (oControl._bNeedsRendering || !oControl.getParent() || oPatcher.isCreating() || !RenderManager.canSkipRendering(oControl)
					|| !(oDomRef = oDomRef || oControl.getDomRef() || InvisibleRenderer.getDomRef(oControl))
					|| oDomRef.hasAttribute(ATTR_DO_NOT_SKIP_RENDERING_MARKER) || oDomRef.querySelector("[" + ATTR_DO_NOT_SKIP_RENDERING_MARKER + "]")) {

					// let the rendering happen with DOM rendering interface
					executeRenderer(oControl, bTriggerBeforeRendering);

				} else {

					// skip the control rendering and re-arrange the cursor of the Patcher
					oPatcher.alignWithDom(oDomRef);
				}

			} else {

				// let the rendering happen with string rendering interface
				executeRenderer(oControl, bTriggerBeforeRendering);

				// at the end of the rendering apply the rendering buffer of the control that is forced to render string interface
				if (sLegacyRendererControlId && sLegacyRendererControlId === oControl.getId()) {
					oPatcher.unsafeHtml(aBuffer.join(""), sLegacyRendererControlId, restoreStyles);
					sLegacyRendererControlId = "";
					bDomInterface = true;
					aBuffer = [];
				}
			}

			return this;
		};

		/**
		 * Renders the given {@link sap.ui.core.Control} and finally returns
		 * the content of the rendering buffer.
		 * Ensures the buffer is restored to the state before calling this method.
		 *
		 * @param {sap.ui.core.Control}
		 *            oControl the Control whose HTML should be returned.
		 * @returns {string} the resulting HTML of the provided control
		 * @deprecated Since version 0.15.0. Use <code>flush()</code> instead render content outside the rendering phase.
		 * @public
		 */
		this.getHTML = function(oControl) {
			assert(oControl && BaseObject.isObjectA(oControl, 'sap.ui.core.Control'), "oControl must be an sap.ui.core.Control");

			var tmp = aBuffer;
			var aResult = aBuffer = this.aBuffer = [];
			this.renderControl(oControl);
			aBuffer = this.aBuffer = tmp;
			return aResult.join("");
		};

		//Does everything needed after the rendering (restore focus, calling "onAfterRendering", initialize event binding)
		function finalizeRendering(oStoredFocusInfo){

			var i, size = aRenderedControls.length;

			for (i = 0; i < size; i++) {
				aRenderedControls[i]._sapui_bInAfterRenderingPhase = true;
			}
			bLocked = true;

			try {

				// Notify the behavior object that the controls will be attached to DOM
				for (i = 0; i < size; i++) {
					var oControl = aRenderedControls[i];
					if (oControl.bOutput && oControl.bOutput !== "invisible") {
						var oEvent = new jQuery.Event("AfterRendering");
						// store the element on the event (aligned with jQuery syntax)
						oEvent.srcControl = oControl;
						// start performance measurement
						Measurement.start(oControl.getId() + "---AfterRendering","AfterRendering of " + oControl.getMetadata().getName(), ["rendering","after"]);
						oControl._handleEvent(oEvent);
						// end performance measurement
						Measurement.end(oControl.getId() + "---AfterRendering");
					}
				}

			} finally {
				for (i = 0; i < size; i++) {
					delete aRenderedControls[i]._sapui_bInAfterRenderingPhase;
				}
				bLocked = false;
			}

			//finally restore focus
			try {
				FocusHandler.restoreFocus(oStoredFocusInfo);
			} catch (e) {
				Log.warning("Problems while restoring the focus after rendering: " + e, null);
			}

			// Re-bind any generically bound browser event handlers (must happen after restoring focus to avoid focus event)
			for (i = 0; i < size; i++) {
				var oControl = aRenderedControls[i],
					aBindings = oControl.aBindParameters,
					oDomRef;

				// if we have stored bind calls and we have a DomRef
				if (aBindings && aBindings.length > 0 && (oDomRef = oControl.getDomRef())) {
					var $DomRef = jQuery(oDomRef);
					for (var j = 0; j < aBindings.length; j++) {
						var oParams = aBindings[j];
						$DomRef.on(oParams.sEventType, oParams.fnProxy);
					}
				}
			}
		}

		function flushInternal(fnPutIntoDom, fnDone, oTargetDomNode) {

			var oStoredFocusInfo;
			if (!bDomInterface) {
				// DOM-based rendering was not possible we are in the string-based initial rendering or re-rendering phase
				oStoredFocusInfo = FocusHandler.getControlFocusInfo();
				var sHtml = aBuffer.join("");
				if (sHtml && aRenderingStyles.length) {
					// During the string-based rendering, RM#writeStyles method is not writing the styles into the HTML buffer due to possible CSP restrictions.
					// Instead, we store the styles in the aRenderingStyles array and add an ATTR_STYLE_KEY_MARKER attribute marker for which the value
					// references the original style index in this array.
					// Not to violate the CSP, we need to bring the original styles via HTMLElement.style API. Here we are converting the HTML buffer of
					// string-based rendering to DOM nodes so that we can restore the orginal styles before we inject the rendering output to the DOM tree.
					if (oTargetDomNode instanceof SVGElement && oTargetDomNode.localName != "foreignObject") {
						oTemplate.innerHTML = "<svg>" + sHtml + "</svg>";
						oTemplate.replaceWith.apply(oTemplate.content.firstChild, oTemplate.content.firstChild.childNodes);
					} else {
						oTemplate.innerHTML = sHtml;
					}

					restoreStyles(oTemplate.content.childNodes);
					fnPutIntoDom(oTemplate.content);
				} else {
					fnPutIntoDom(sHtml);
				}
			} else {
				// get the root node of the Patcher to determine whether we are in the initial rendering or the re-rendering phase
				var oRootNode = oPatcher.getRootNode();

				// in case of DOM-based initial rendering, the Patcher creates a DocumentFragment to assemble all created control DOM nodes within it
				if (oRootNode.nodeType == 11 /* Node.DOCUMENT_FRAGMENT_NODE */) {
					// even though we are in the initial rendering phase a control within the control tree might has been already rendered before
					// therefore we need to store the currectly focused control info before we inject the DocumentFragment into the real DOM tree
					oStoredFocusInfo = FocusHandler.getControlFocusInfo();

					// controls are not necessarily need to produce output during their rendering
					// in case of output is produced, let the callback injects the DocumentFragment
					fnPutIntoDom(oRootNode.lastChild ? oRootNode : "");
				} else {
					// in case of DOM-based re-rendering, the root node of the Patcher must be an existing HTMLElement
					// since the re-rendering happens during the control renderer APIs are executed here we get the stored focus info before the patching
					oStoredFocusInfo = FocusHandler.getPatchingControlFocusInfo();
				}

				// make the Patcher ready for the next patching
				oPatcher.reset();
			}

			finalizeRendering(oStoredFocusInfo);

			reset();

			ActivityDetection.refresh();

			if (fnDone) {
				fnDone();
			}
		}

		function restoreStyle(oElement, iDomIndex) {
			var sStyleIndex = oElement.getAttribute(ATTR_STYLE_KEY_MARKER);
			if (sStyleIndex != iDomIndex) {
				return 0;
			}

			oElement.style = aRenderingStyles[iDomIndex];
			oElement.removeAttribute(ATTR_STYLE_KEY_MARKER);
			return 1;
		}

		function restoreStyles(aDomNodes) {
			if (!aRenderingStyles.length) {
				return;
			}

			var iDomIndex = 0;
			aDomNodes.forEach(function(oDomNode) {
				if (oDomNode.nodeType == 1 /* Node.ELEMENT_NODE */) {
					iDomIndex += restoreStyle(oDomNode, iDomIndex);
					oDomNode.querySelectorAll("[" + ATTR_STYLE_KEY_MARKER + "]").forEach(function(oElement) {
						iDomIndex += restoreStyle(oElement, iDomIndex);
					});
				}
			});
			aRenderingStyles = [];
		}

		/**
		 * Renders the content of the rendering buffer into the provided DOM node.
		 *
		 * This function must not be called within control renderers.
		 *
		 * Usage:
		 * <pre>
		 *
		 *   // Create a new instance of the RenderManager
		 *   var rm = sap.ui.getCore().createRenderManager();
		 *
		 *   // Use the writer API to fill the buffers
		 *   rm.write(...);
		 *   rm.renderControl(oControl);
		 *   rm.write(...);
		 *   ...
		 *
		 *   // Finally flush the buffer into the provided DOM node (The current content is removed)
		 *   rm.flush(oDomNode);
		 *
		 *   // If the instance is not needed anymore, destroy it
		 *   rm.destroy();
		 *
		 * </pre>
		 *
		 * @param {Element} oTargetDomNode Node in the DOM where the buffer should be flushed into
		 * @param {boolean} bDoNotPreserve Determines whether the content is preserved (<code>false</code>) or not (<code>true</code>)
		 * @param {boolean|int} vInsert Determines whether the buffer of the target DOM node is expanded (<code>true</code>) or
		 *                  replaced (<code>false</code>), or the new entry is inserted at a specific position
		 *                  (value of type <code>int</code>)
		 * @public
		 */
		this.flush = function(oTargetDomNode, bDoNotPreserve, vInsert) {
			assert((typeof oTargetDomNode === "object") && (oTargetDomNode.ownerDocument == document), "oTargetDomNode must be a DOM element");

			var fnDone = Interaction.notifyAsyncStep();

			// preserve HTML content before flushing HTML into target DOM node
			if (!bDoNotPreserve && (typeof vInsert !== "number") && !vInsert) { // expression mimics the conditions used below
				RenderManager.preserveContent(oTargetDomNode);
			}

			flushInternal(function(vHTML) {

				for (var i = 0; i < aRenderedControls.length; i++) {
					//TODO It would be enough to loop over the controls for which renderControl was initially called but for this
					//we have to manage an additional array. Rethink about later.
					var oldDomNode = aRenderedControls[i].getDomRef();
					if (oldDomNode && !RenderManager.isPreservedContent(oldDomNode)) {
						if (RenderManager.isInlineTemplate(oldDomNode)) {
							jQuery(oldDomNode).empty();
						} else {
							jQuery(oldDomNode).remove();
						}
					}
				}
				if (typeof vInsert === "number") {
					if (vInsert <= 0) { // new HTML should be inserted at the beginning
						insertAdjacent(oTargetDomNode, "prepend", vHTML);
					} else { // new element should be inserted at a certain position > 0
						var oPredecessor = oTargetDomNode.children[vInsert - 1]; // find the element which should be directly before the new one
						if (oPredecessor) {
							// element found - put the HTML in after this element
							insertAdjacent(oPredecessor, "after", vHTML);
						} else {
							// element not found (this should not happen when properly used), append the new HTML
							insertAdjacent(oTargetDomNode, "append", vHTML);
						}
					}
				} else if (!vInsert) {
					jQuery(oTargetDomNode).html(vHTML); // Put the HTML into the given DOM Node
				} else {
					insertAdjacent(oTargetDomNode, "append", vHTML); // Append the HTML into the given DOM Node
				}

			}, fnDone, oTargetDomNode);

		};

		/**
		 * Renders the given control to the provided DOMNode.
		 *
		 * If the control is already rendered in the provided DOMNode the DOM of the control is replaced. If the control
		 * is already rendered somewhere else the current DOM of the control is removed and the new DOM is appended
		 * to the provided DOMNode.
		 *
		 * This function must not be called within control renderers.
		 *
		 * @param {sap.ui.core.Control} oControl the Control that should be rendered.
		 * @param {Element} oTargetDomNode The node in the DOM where the result of the rendering should be inserted.
		 * @public
		 */
		this.render = function(oControl, oTargetDomNode) {
			assert(oControl && BaseObject.isObjectA(oControl, 'sap.ui.core.Control'), "oControl must be a control");
			assert(typeof oTargetDomNode === "object" && oTargetDomNode.ownerDocument == document, "oTargetDomNode must be a DOM element");
			if ( bLocked ) {
				Log.error("Render must not be called within Before or After Rendering Phase. Call ignored.", null, this);
				return;
			}

			var fnDone = Interaction.notifyAsyncStep();

			// Reset internal state before rendering
			reset();

			// Retrieve the markup (the rendering phase)
			this.renderControl(oControl);

			// FIXME: MULTIPLE ROOTS
			// The implementation of this method doesn't support multiple roots for a control.
			// Affects all places where 'oldDomNode' is used
			flushInternal(function(vHTML) {

				if (oControl && oTargetDomNode) {

					var oldDomNode = oControl.getDomRef();
					if ( !oldDomNode || RenderManager.isPreservedContent(oldDomNode) ) {
						// In case no old DOM node was found or only preserved DOM, search for a placeholder (invisible or preserved DOM placeholder)
						oldDomNode = InvisibleRenderer.getDomRef(oControl) || document.getElementById(RenderPrefixes.Dummy + oControl.getId());
					}

					var bNewTarget = oldDomNode && oldDomNode.parentNode != oTargetDomNode;

					if (bNewTarget) { //Control was rendered already and is now moved to different location

						if (!RenderManager.isPreservedContent(oldDomNode)) {
							if (RenderManager.isInlineTemplate(oldDomNode)) {
								jQuery(oldDomNode).empty();
							} else {
								jQuery(oldDomNode).remove();
							}
						}

						if (vHTML) {
							insertAdjacent(oTargetDomNode, "append", vHTML);
						}

					} else { //Control either rendered initially or rerendered at the same location

						if (vHTML) {
							if (oldDomNode) {
								if (RenderManager.isInlineTemplate(oldDomNode)) {
									jQuery(oldDomNode).html(vHTML);
								} else {
									insertAdjacent(oldDomNode, "after", vHTML);
									jQuery(oldDomNode).remove();
								}
							} else {
								insertAdjacent(oTargetDomNode, "append", vHTML);
							}
						} else {
							if (RenderManager.isInlineTemplate(oldDomNode)) {
								jQuery(oldDomNode).empty();
							} else {
								// give parent control a chance to handle emptied children properly (e.g. XMLView)
								if ( !oControl.getParent()
										 || !oControl.getParent()._onChildRerenderedEmpty
										 || !oControl.getParent()._onChildRerenderedEmpty(oControl, oldDomNode) ) {
									jQuery(oldDomNode).remove();
								}
							}

						}

					}

				}
			}, fnDone, oTargetDomNode);
		};

		/**
		 * Cleans up the resources associated with this instance.
		 *
		 * After the instance has been destroyed, it must not be used anymore.
		 * Applications should call this function if they don't need the instance any longer.
		 *
		 * @public
		 */
		this.destroy = function() {
			reset();
		};

		//#################################################################################################
		// Build up interfaces that can be used by Renderers
		//#################################################################################################

		var oInterface = {};
		aCommonMethods.forEach(function (sMethod) {
			oStringInterface[sMethod] = oDomInterface[sMethod] = oInterface[sMethod] = this[sMethod];
		}, this);
		aDomInterfaceMethods.forEach(function (sMethod) {
			oStringInterface[sMethod] = oInterface[sMethod] = this[sMethod];
		}, this);
		/**
		 * @deprecated As of version 1.92, the string rendering methods are deprecated
		 */
		aStrInterfaceMethods.forEach(function (sMethod) {
			oStringInterface[sMethod] = oInterface[sMethod] = this[sMethod];
		}, this);
		aNonRendererMethods.forEach(function (sMethod) {
			oInterface[sMethod] = this[sMethod];
		}, this);

		/**
		 * Returns the public interface of the RenderManager which can be used by Renderers.
		 *
		 * @returns {sap.ui.base.Interface} the interface
		 * @private
		 */
		this.getRendererInterface = function() {
			return oStringInterface;
		};

		this.getInterface = function() {
			return oInterface;
		};

		reset();
	}

	/**
	 * Returns the configuration object
	 * Shortcut for <code>sap.ui.getCore().getConfiguration()</code>
	 * @returns {sap.ui.core.Configuration} the configuration object
	 * @public
	 * @deprecated Since 1.92. Instead, use the {@link sap.ui.core.Core#getConfiguration} API.
	 */
	RenderManager.prototype.getConfiguration = function() {
		return sap.ui.require("sap/ui/core/Configuration");
	};

	/**
	 * @param {string} sKey the key
	 * @deprecated As of version 1.1, never has been implemented - DO NOT USE
	 * @public
	 */
	RenderManager.prototype.translate = function(sKey) {
		// TODO
	};

	/**
	 * @deprecated As of version 1.1, never has been implemented - DO NOT USE
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	RenderManager.prototype.writeAcceleratorKey = function() {
		/*
		if (bAlt && !bCtrl && !bArrowKey) {
			// Keyboard helper provides means for visualizing access keys.
			// keydown modifies some CSS rule for showing underlines
			// <span><u class="sapUiAccessKey">H</u>elp me</span>
			UCF_KeyboardHelper.showAccessKeys();
		}
		*/
		return this;
	};

	/**
	 * Writes the controls data into the HTML.
	 * Control Data consists at least of the id of a control
	 * @param {sap.ui.core.Control} oControl the control whose identifying information should be written to the buffer
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#openStart} or {@link sap.ui.core.RenderManager#voidStart}
	 *  of the {@link sap.ui.core.RenderManager Semantic Rendering API} and pass the desired control data as the second parameter to the new API.
	 */
	RenderManager.prototype.writeControlData = function(oControl) {
		assert(oControl && BaseObject.isObjectA(oControl, 'sap.ui.core.Control'), "oControl must be an sap.ui.core.Control");
		this.writeElementData(oControl);
		return this;
	};

	/**
	 * Writes the elements data into the HTML.
	 * Element Data consists at least of the id of an element
	 * @param {sap.ui.core.Element} oElement the element whose identifying information should be written to the buffer
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#openStart} or {@link sap.ui.core.RenderManager#voidStart}
	 *  of the {@link sap.ui.core.RenderManager Semantic Rendering API} and pass the desired element data as the second parameter to the new API.
	 */
	RenderManager.prototype.writeElementData = function(oElement) {
		assert(oElement && BaseObject.isObjectA(oElement, 'sap.ui.core.Element'), "oElement must be an sap.ui.core.Element");

		this.attr("id", oElement.getId());
		renderElementData(this, oElement);

		return this;
	};

	/**
	 * Collects accessibility related attributes for an <code>Element</code> and renders them as part of
	 * the currently rendered DOM element.
	 *
	 * See the WAI-ARIA specification for a general description of the accessibility related attributes.
	 * Attributes are only rendered when the accessibility feature is activated in the UI5 runtime configuration.
	 *
	 * The values for the attributes are collected from the following sources (last one wins):
	 * <ol>
	 * <li>from the properties and associations of the given <code>oElement</code>, using a heuristic mapping
	 *     (described below)</li>
	 * <li>from the <code>mProps</code> parameter, as provided by the caller</li>
	 * <li>from the parent of the given <code>oElement</code>, if it has a parent and if the parent implements
	 *     the method {@link sap.ui.core.Element#enhanceAccessibilityState enhanceAccessibilityState}</li>
	 * </ol>
	 * If no <code>oElement</code> is given, only <code>mProps</code> will be taken into account.
	 *
	 *
	 * <h3>Heuristic Mapping</h3>
	 * The following mapping from properties/values to ARIA attributes is used (if the element does have such properties):
	 * <ul>
	 * <li><code>editable===false</code> => <code>aria-readonly="true"</code></li>
	 * <li><code>enabled===false</code> => <code>aria-disabled="true"</code></li>
	 * <li><code>visible===false</code> => <code>aria-hidden="true"</code></li>
	 * <li><code>required===true</code> => <code>aria-required="true"</code></li>
	 * <li><code>selected===true</code> => <code>aria-selected="true"</code></li>
	 * <li><code>checked===true</code> => <code>aria-checked="true"</code></li>
	 * </ul>
	 *
	 * In case of the <code>required</code> property, all label controls which reference the given element
	 * in their <code>labelFor</code> relation are additionally taken into account when determining the
	 * value for the <code>aria-required</code> attribute.
	 *
	 * Additionally, the associations <code>ariaDescribedBy</code> and <code>ariaLabelledBy</code> are used to
	 * determine the lists of IDs for the ARIA attributes <code>aria-describedby</code> and
	 * <code>aria-labelledby</code>.
	 *
	 * Label controls that reference the given element in their <code>labelFor</code> relation are automatically
	 * added to the <code>aria-labelledby</code> attribute.
	 *
	 * Note: This function is only a heuristic of a control property to ARIA attribute mapping. Control developers
	 * have to check whether it fulfills their requirements. In case of problems (for example the <code>RadioButton</code> has a
	 * <code>selected</code> property but must provide an <code>aria-checked</code> attribute) the auto-generated
	 * result of this function can be influenced via the parameter <code>mProps</code> as described below.
	 *
	 * The parameter <code>mProps</code> can be used to either provide additional attributes which should be rendered
	 * and/or to avoid the automatic generation of single ARIA attributes. The 'aria-' prefix will be prepended
	 * automatically to the keys (Exception: Attribute <code>role</code> does not get the prefix 'aria-').
	 *
	 *
	 * Examples:<br>
	 * <code>{hidden : true}</code> results in <code>aria-hidden="true"</code> independent of the presence or
	 * absence of the visibility property.<br>
	 * <code>{hidden : null}</code> ensures that no <code>aria-hidden</code> attribute is written independent
	 * of the presence or absence of the visibility property.<br>
	 *
	 * The function behaves in the same way for the associations <code>ariaDescribedBy</code> and <code>ariaLabelledBy</code>.
	 * To append additional values to the auto-generated <code>aria-describedby</code> and <code>aria-labelledby</code>
	 * attributes, the following format can be used:
	 * <pre>
	 *   {describedby : {value: "id1 id2", append: true}} =>  aria-describedby = "ida idb id1 id2"
	 * </pre>
	 * (assuming that "ida idb" is the auto-generated part based on the association <code>ariaDescribedBy</code>).
	 *
	 * @param {sap.ui.core.Element}
	 *            [oElement] The <code>Element</code> whose accessibility state should be rendered
	 * @param {object}
	 *            [mProps] A map of additional properties that should be added or changed.
	 * @ui5-omissible-params oElement
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	RenderManager.prototype.accessibilityState = function(oElement, mProps) {
		if (!ControlBehavior.isAccessibilityEnabled()) {
			return this;
		}

		if (arguments.length == 1 && !(BaseObject.isObjectA(oElement, 'sap.ui.core.Element'))) {
			mProps = oElement;
			oElement = null;
		}

		var mAriaProps = {};

		if (oElement != null) {
			var oMetadata = oElement.getMetadata();

			var addACCForProp = function(sElemProp, sACCProp, oVal){
				var oProp = oMetadata.getProperty(sElemProp);
				if (oProp && oElement[oProp._sGetter]() === oVal) {
					mAriaProps[sACCProp] = "true";
				}
			};

			var addACCForAssoc = function(sElemAssoc, sACCProp){
				var oAssoc = oMetadata.getAssociation(sElemAssoc);
				if (oAssoc && oAssoc.multiple) {
					var aIds = oElement[oAssoc._sGetter]();
					if (sElemAssoc == "ariaLabelledBy") {
						var aLabelIds = LabelEnablement.getReferencingLabels(oElement);
						var iLen = aLabelIds.length;
						if (iLen) {
							var aFilteredLabelIds = [];
							for (var i = 0; i < iLen; i++) {
								if ( aIds.indexOf(aLabelIds[i]) < 0) {
									aFilteredLabelIds.push(aLabelIds[i]);
								}
							}
							aIds = aFilteredLabelIds.concat(aIds);
						}
					}

					if (aIds.length > 0) {
						mAriaProps[sACCProp] = aIds.join(" ");
					}
				}
			};

			addACCForProp("editable", "readonly", false);
			addACCForProp("enabled", "disabled", false);
			addACCForProp("visible", "hidden", false);
			if (LabelEnablement.isRequired(oElement)) {
				mAriaProps["required"] = "true";
			}
			addACCForProp("selected", "selected", true);
			addACCForProp("checked", "checked", true);
			addACCForAssoc("ariaDescribedBy", "describedby");
			addACCForAssoc("ariaLabelledBy", "labelledby");
		}

		if (mProps) {
			var checkValue = function(v){
				var type = typeof (v);
				return v === null || type === "number" || type === "string" || type === "boolean";
			};

			var prop = {};
			var x, val, autoVal;

			for (x in mProps) {
				val = mProps[x];
				if (checkValue(val)) {
					prop[x] = val;
				} else if (typeof (val) === "object" && checkValue(val.value)) {
					autoVal = "";
					if (val.append && (x === "describedby" || x === "labelledby")) {
						autoVal = mAriaProps[x] ? mAriaProps[x] + " " : "";
					}
					prop[x] = autoVal + val.value;
				}
			}

			//The auto-generated values above can be overridden or reset (via null)
			Object.assign(mAriaProps, prop);
		}

		// allow parent (e.g. FormElement) to overwrite or enhance aria attributes
		if (BaseObject.isObjectA(oElement, 'sap.ui.core.Element')) {
			var oParent = oElement.getParent();
			if (oParent && oParent.enhanceAccessibilityState) {
				var mOldAriaProps = Object.assign({}, mAriaProps);
				oParent.enhanceAccessibilityState(oElement, mAriaProps);

				// disable the rendering skip in case of parent#enhanceAccessibilityState
				// disallows or changes the accessibility state of the child control
				if (mAriaProps.canSkipRendering == false
					|| (
						mAriaProps.canSkipRendering == undefined
						&& BaseObject.isObjectA(oElement, "sap.ui.core.Control")
						&& RenderManager.canSkipRendering(oElement)
						&& JSON.stringify(mOldAriaProps) != JSON.stringify(mAriaProps)
					)
				) {
					this.attr(ATTR_DO_NOT_SKIP_RENDERING_MARKER, "");
				}

				// delete the canSkipRendering marker in case of it exist
				delete mAriaProps.canSkipRendering;
			}
		}

		for (var p in mAriaProps) {
			if (mAriaProps[p] != null && mAriaProps[p] !== "") { //allow 0 and false but no null, undefined or empty string
				this.attr(p === "role" ? p : "aria-" + p, mAriaProps[p]);
			}
		}

		return this;
	};

	/**
	 * Collects accessibility related attributes for an <code>Element</code> and renders them as part of
	 * the currently rendered DOM element.
	 *
	 * See the WAI-ARIA specification for a general description of the accessibility related attributes.
	 * Attributes are only rendered when the accessibility feature is activated in the UI5 runtime configuration.
	 *
	 * The values for the attributes are collected from the following sources (last one wins):
	 * <ol>
	 * <li>from the properties and associations of the given <code>oElement</code>, using a heuristic mapping
	 *     (described below)</li>
	 * <li>from the <code>mProps</code> parameter, as provided by the caller</li>
	 * <li>from the parent of the given <code>oElement</code>, if it has a parent and if the parent implements
	 *     the method {@link sap.ui.core.Element#enhanceAccessibilityState enhanceAccessibilityState}</li>
	 * </ol>
	 * If no <code>oElement</code> is given, only <code>mProps</code> will be taken into account.
	 *
	 *
	 * <h3>Heuristic Mapping</h3>
	 * The following mapping from properties/values to ARIA attributes is used (if the element does have such properties):
	 * <ul>
	 * <li><code>editable===false</code> => <code>aria-readonly="true"</code></li>
	 * <li><code>enabled===false</code> => <code>aria-disabled="true"</code></li>
	 * <li><code>visible===false</code> => <code>aria-hidden="true"</code></li>
	 * <li><code>required===true</code> => <code>aria-required="true"</code></li>
	 * <li><code>selected===true</code> => <code>aria-selected="true"</code></li>
	 * <li><code>checked===true</code> => <code>aria-checked="true"</code></li>
	 * </ul>
	 *
	 * In case of the <code>required</code> property, all label controls which reference the given element
	 * in their <code>labelFor</code> relation are additionally taken into account when determining the
	 * value for the <code>aria-required</code> attribute.
	 *
	 * Additionally, the associations <code>ariaDescribedBy</code> and <code>ariaLabelledBy</code> are used to
	 * determine the lists of IDs for the ARIA attributes <code>aria-describedby</code> and
	 * <code>aria-labelledby</code>.
	 *
	 * Label controls that reference the given element in their <code>labelFor</code> relation are automatically
	 * added to the <code>aria-labelledby</code> attribute.
	 *
	 * Note: This function is only a heuristic of a control property to ARIA attribute mapping. Control developers
	 * have to check whether it fulfills their requirements. In case of problems (for example the <code>RadioButton</code> has a
	 * <code>selected</code> property but must provide an <code>aria-checked</code> attribute) the auto-generated
	 * result of this function can be influenced via the parameter <code>mProps</code> as described below.
	 *
	 * The parameter <code>mProps</code> can be used to either provide additional attributes which should be rendered
	 * and/or to avoid the automatic generation of single ARIA attributes. The 'aria-' prefix will be prepended
	 * automatically to the keys (Exception: Attribute <code>role</code> does not get the prefix 'aria-').
	 *
	 *
	 * Examples:<br>
	 * <code>{hidden : true}</code> results in <code>aria-hidden="true"</code> independent of the presence or
	 * absence of the visibility property.<br>
	 * <code>{hidden : null}</code> ensures that no <code>aria-hidden</code> attribute is written independent
	 * of the presence or absence of the visibility property.<br>
	 *
	 * The function behaves in the same way for the associations <code>ariaDescribedBy</code> and <code>ariaLabelledBy</code>.
	 * To append additional values to the auto-generated <code>aria-describedby</code> and <code>aria-labelledby</code>
	 * attributes, the following format can be used:
	 * <pre>
	 *   {describedby : {value: "id1 id2", append: true}} =>  aria-describedby = "ida idb id1 id2"
	 * </pre>
	 * (assuming that "ida idb" is the auto-generated part based on the association <code>ariaDescribedBy</code>).
	 *
	 * @param {sap.ui.core.Element}
	 *            [oElement] The <code>Element</code> whose accessibility state should be rendered
	 * @param {object}
	 *            [mProps] A map of additional properties that should be added or changed.
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#accessibilityState} of the {@link sap.ui.core.RenderManager Semantic Rendering API}.
	 * @function
	 */
	RenderManager.prototype.writeAccessibilityState = RenderManager.prototype.accessibilityState;


	/**
	 * Writes either an &lt;img&gt; tag for normal URI or a &lt;span&gt; tag with needed properties for an icon URI.
	 *
	 * Additional classes and attributes can be added to the tag with the second and third parameter.
	 * All of the given attributes are escaped when necessary for security consideration.
	 *
	 * When an &lt;img&gt; tag is rendered, the following two attributes are added by default
	 * and can be overwritten with corresponding values in the <code>mAttributes</code> parameter:
	 * <ul>
	 * <li><code>role: "presentation"</code></Li>
	 * <li><code>alt: ""</code></li>
	 * </ul>
	 *
	 * <b>Note:</b> This function requires the {@link sap.ui.core.IconPool} module. Ensure that the module is
	 * loaded before this function is called to avoid syncXHRs.
	 *
	 * @param {sap.ui.core.URI} sURI URI of an image or of an icon registered in {@link sap.ui.core.IconPool}
	 * @param {array|string} [aClasses] Additional classes that are added to the rendered tag
	 * @param {object} [mAttributes] Additional attributes that will be added to the rendered tag.
	 * Currently the attributes <code>class</code> and <code>style</code> are not allowed
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 */
	RenderManager.prototype.icon = function(sURI, aClasses, mAttributes){
		var IconPool = sap.ui.require("sap/ui/core/IconPool");
		if (!IconPool) {
			Log.warning("Synchronous loading of IconPool due to sap.ui.core.RenderManager#icon call. " +
				"Ensure that 'sap/ui/core/IconPool is loaded before this function is called" , "SyncXHR", null, function() {
				return {
					type: "SyncXHR",
					name: "rendermanager-icon"
				};
			});
			IconPool = sap.ui.requireSync("sap/ui/core/IconPool"); // legacy-relevant: Sync fallback
		}

		var bIconURI = IconPool.isIconURI(sURI),
			bAriaLabelledBy = false,
			sProp, oIconInfo, mDefaultAttributes, sLabel, sInvTextId;

		if (typeof aClasses === "string") {
			aClasses = [aClasses];
		}

		if (bIconURI) {
			oIconInfo = IconPool.getIconInfo(sURI);

			if (!oIconInfo) {
				Log.error("An unregistered icon: " + sURI + " is used in sap.ui.core.RenderManager's writeIcon method.");
				return this;
			}

			if (!aClasses) {
				aClasses = [];
			}
			aClasses.push("sapUiIcon");
			if (!oIconInfo.suppressMirroring) {
				aClasses.push("sapUiIconMirrorInRTL");
			}
		}

		if (bIconURI) {
			this.openStart("span");
		} else {
			this.voidStart("img");
		}

		if (Array.isArray(aClasses)) {
			aClasses.forEach(function (sClass) {
				this.class(sClass);
			}, this);
		}

		if (bIconURI) {
			mDefaultAttributes = {
				"data-sap-ui-icon-content": oIconInfo.content,
				"role": "presentation",
				"title": oIconInfo.text || null
			};

			this.style("font-family", "'" + encodeCSS(oIconInfo.fontFamily) + "'");
		} else {
			mDefaultAttributes = {
				role: "presentation",
				alt: "",
				src: sURI
			};
		}

		mAttributes = extend(mDefaultAttributes, mAttributes);

		if (!mAttributes.id) {
			mAttributes.id = uid();
		}

		if (mAttributes.role === "presentation") {
			mAttributes["aria-hidden"] = true;
		}

		if (bIconURI) {
			sLabel = mAttributes.alt || mAttributes.title || oIconInfo.text || oIconInfo.name;
			sInvTextId = mAttributes.id + "-label";

			// When aria-labelledby is given, the icon's text is output in a hidden span
			// whose id is appended to the aria-labelledby attribute
			// Otherwise the icon's text is output to aria-label attribute
			if (mAttributes["aria-labelledby"]) {
				bAriaLabelledBy = true;
				mAttributes["aria-labelledby"] += (" " + sInvTextId);
			} else if (!mAttributes.hasOwnProperty("aria-label")) { // when "aria-label" isn't set in the attributes object
				mAttributes["aria-label"] = sLabel;
			}
		}

		if (typeof mAttributes === "object") {
			for (sProp in mAttributes) {
				if (mAttributes.hasOwnProperty(sProp) && mAttributes[sProp] !== null) {
					this.attr(sProp, mAttributes[sProp]);
				}
			}
		}

		if (bIconURI) {
			this.openEnd();

			if (bAriaLabelledBy) {
				// output the invisible text for aria-labelledby
				this.openStart("span");
				this.style("display", "none");
				this.attr("id", sInvTextId);
				this.openEnd();
				this.text(sLabel);
				this.close("span");
			}

			this.close("span");
		} else {
			this.voidEnd();
		}

		return this;
	};

	/**
	 * Writes either an &lt;img&gt; tag for normal URI or a &lt;span&gt; tag with needed properties for an icon URI.
	 *
	 * Additional classes and attributes can be added to the tag with the second and third parameter.
	 * All of the given attributes are escaped for security consideration.
	 *
	 * When an &lt;img&gt; tag is rendered, the following two attributes are added by default
	 * and can be overwritten with corresponding values in the <code>mAttributes</code> parameter:
	 * <ul>
	 * <li><code>role: "presentation"</code></Li>
	 * <li><code>alt: ""</code></li>
	 * </ul>
	 *
	 * @param {sap.ui.core.URI} sURI URI of an image or of an icon registered in {@link sap.ui.core.IconPool}
	 * @param {array|string} [aClasses] Additional classes that are added to the rendered tag
	 * @param {object} [mAttributes] Additional attributes that will be added to the rendered tag
	 * @returns {this} Reference to <code>this</code> in order to allow method chaining
	 * @public
	 * @deprecated Since 1.92. Instead use {@link sap.ui.core.RenderManager#icon} of the {@link sap.ui.core.RenderManager Semantic Rendering API}.
	 * @function
	 */
	RenderManager.prototype.writeIcon = RenderManager.prototype.icon;


	/**
	 * Returns the renderer class for a given control instance
	 *
	 * @param {sap.ui.core.Control} oControl the control that should be rendered
	 * @returns {sap.ui.core.ControlRenderer} the renderer class for a given control instance
	 * @public
	 */
	RenderManager.prototype.getRenderer = function(oControl) {
		assert(oControl && BaseObject.isObjectA(oControl, 'sap.ui.core.Control'), "oControl must be an sap.ui.core.Control");
		return RenderManager.getRenderer(oControl);
	};


	//#################################################################################################
	// Static Members
	//#################################################################################################

	/**
	 * Prefixes to be used for rendering "unusual" DOM-Elements, like dummy elements, placeholders
	 * for invisible controls, etc.
	 *
	 * @enum {string}
	 * @private
	 * @alias sap.ui.core.RenderManager.RenderPrefixes
	 */
	var RenderPrefixes = RenderManager.RenderPrefixes = {

		/**
		 * The control has not been rendered because it is invisible, the element rendered with this
		 * prefix can be found by the RenderManager to avoid rerendering the parents
		 * @private
		 * @ui5-restricted sap.ui.core
		 */
		Invisible: InvisibleRenderer.PlaceholderPrefix,

		/**
		 * A dummy element is rendered with the intention of replacing it with the real content
		 * @private
		 * @ui5-restricted sap.ui.core
		 */
		Dummy: "sap-ui-dummy-",

		/**
		 * A temporary element for a control that participates in DOM preservation.
		 * The temporary element is rendered during string rendering, flushed into DOM
		 * and then replaced with the preserved DOM during onAfterRendering.
		 * @private
		 * @ui5-restricted sap.ui.core
		 */
		Temporary: "sap-ui-tmp-"
	};


	/**
	 * Returns the renderer class for a given control instance
	 *
	 * @param {sap.ui.core.Control}
	 *            oControl the control that should be rendered
	 * @type function
	 * @returns {object} the renderer class for a given control instance
	 * @static
	 * @public
	 */
	RenderManager.getRenderer = function(oControl) {
		assert(oControl && BaseObject.isObjectA(oControl, 'sap.ui.core.Control'), "oControl must be an sap.ui.core.Control");

		return oControl.getMetadata().getRenderer();
	};

	/**
	 * Helper to enforce a repaint for a given DOM node.
	 *
	 * Introduced to fix repaint issues in Webkit browsers, esp. Chrome.
	 * @param {Element} vDomNode a DOM node or ID of a DOM node
	 *
	 * @private
	 */
	RenderManager.forceRepaint = function(vDomNode) {
		var oDomNodeById = vDomNode ? window.document.getElementById(vDomNode) : null;
		var oDomNode = typeof vDomNode == "string" ? oDomNodeById : vDomNode;

		if ( oDomNode ) {
			Log.debug("forcing a repaint for " + (oDomNode.id || String(oDomNode)));
			var sOriginalDisplay = oDomNode.style.display;
			var oActiveElement = document.activeElement;
			oDomNode.style.display = "none";
			oDomNode.offsetHeight; // force repaint
			oDomNode.style.display = sOriginalDisplay;
			if (document.activeElement !== oActiveElement && oActiveElement) {
				oActiveElement.focus();
			}
		}
	};

	/**
	 * Creates the ID to be used for the invisible Placeholder DOM element.
	 * This method can be used to get direct access to the placeholder DOM element.
	 * Also statically available as RenderManager.createInvisiblePlaceholderId()
	 *
	 * @param {sap.ui.core.Element} oElement - The Element instance for which to create the placeholder ID
	 * @returns {string} The ID used for the invisible Placeholder of this element
	 * @static
	 * @protected
	 */
	RenderManager.createInvisiblePlaceholderId = function(oElement) {
		return InvisibleRenderer.createInvisiblePlaceholderId(oElement);
	};


	//#################################################################################################
	// Methods for preserving HTML content
	//#################################################################################################

	var ID_PRESERVE_AREA = "sap-ui-preserve",
		ID_STATIC_AREA = "sap-ui-static", // to be kept in sync with Core!
		ATTR_PRESERVE_MARKER = "data-sap-ui-preserve",
		ATTR_UI_AREA_MARKER = "data-sap-ui-area";

	function getPreserveArea() {
		var $preserve = jQuery(document.getElementById(ID_PRESERVE_AREA));
		if ($preserve.length === 0) {
			$preserve = jQuery("<div></div>",{"aria-hidden":"true",id:ID_PRESERVE_AREA}).
				addClass("sapUiHidden").addClass("sapUiForcedHidden").css("width", "0").css("height", "0").css("overflow", "hidden").
				appendTo(document.body);
		}
		return $preserve;
	}

	/**
	 * @param {Element} node dom node
	 * Create a placeholder node for the given node (which must have an ID) and insert it before the node
	 */
	function makePlaceholder(node) {
		var $Placeholder = jQuery("<div></div>", { id: RenderPrefixes.Dummy + node.id}).addClass("sapUiHidden");
		if (node.hasAttribute(ATTR_DO_NOT_SKIP_RENDERING_MARKER)) {
			$Placeholder.attr(ATTR_DO_NOT_SKIP_RENDERING_MARKER, "");
		}
		$Placeholder.insertBefore(node);
	}

	// Stores {@link sap.ui.core.RenderManager.preserveContent} listener as objects with following structure:
	// {fn: <listener>, context: <context>}
	var aPreserveContentListeners = [];

	/**
	 * Attaches a listener which is called on {@link sap.ui.core.RenderManager.preserveContent} call
	 *
	 * @param {function} fnListener listener function
	 * @param {object} [oContext=RenderManager] context for the listener function
	 * @private
	 * @ui5-restricted sap.ui.richtexteditor.RichTextEditor
	 */
	RenderManager.attachPreserveContent = function(fnListener, oContext) {
		// discard duplicates first
		RenderManager.detachPreserveContent(fnListener);
		aPreserveContentListeners.push({
			fn: fnListener,
			context: oContext
		});
	};

	/**
	 * Detaches a {@link sap.ui.core.RenderManager.preserveContent} listener
	 *
	 * @param {function} fnListener listener function
	 * @private
	 * @ui5-restricted sap.ui.richtexteditor.RichTextEditor
	 */
	RenderManager.detachPreserveContent = function(fnListener) {
		aPreserveContentListeners = aPreserveContentListeners.filter(function(oListener) {
			return oListener.fn !== fnListener;
		});
	};

	/**
	 * Collects descendants of the given root node that need to be preserved before the root node
	 * is wiped out. The "to-be-preserved" nodes are moved to a special, hidden 'preserve' area.
	 *
	 * A node is declared "to-be-preserved" when it has the <code>data-sap-ui-preserve</code>
	 * attribute set. When the optional parameter <code>bPreserveNodesWithId</code> is set to true,
	 * then nodes with an id are preserved as well and their <code>data-sap-ui-preserve</code> attribute
	 * is set automatically. This option is used by UIAreas when they render for the first time and
	 * simplifies the handling of predefined HTML content in a web page.
	 *
	 * The "to-be-preserved" nodes are searched with a depth first search and moved to the 'preserve'
	 * area in the order that they are found. So for direct siblings the order should be stable.
	 *
	 * @param {Element} oRootNode to search for "to-be-preserved" nodes
	 * @param {boolean} [bPreserveRoot=false] whether to preserve the root itself
	 * @param {boolean} [bPreserveNodesWithId=false] whether to preserve nodes with an id as well
	 * @public
	 * @static
	 */
	RenderManager.preserveContent = function(oRootNode, bPreserveRoot, bPreserveNodesWithId, oControlBeforeRerender /* private */) {
		assert(typeof oRootNode === "object" && oRootNode.ownerDocument == document, "oRootNode must be a DOM element");

		Element = Element ? Element : sap.ui.require("sap/ui/core/Element");

		aPreserveContentListeners.forEach(function(oListener) {
			oListener.fn.call(oListener.context || RenderManager, {domNode : oRootNode});
		});

		var $preserve = getPreserveArea();

		function needsPlaceholder(elem) {
			while ( elem && elem != oRootNode && elem.parentNode ) {
				elem = elem.parentNode;
				if ( elem.hasAttribute(ATTR_PRESERVE_MARKER) ) {
					return true;
				}
				if ( elem.hasAttribute("data-sap-ui") ) {
					break;
				}
			}
			// return false;
		}

		// determines whether given parameters are within the same visible control tree as well as DOM tree
		function isAncestor(oAncestor, oDescendant, oDescendantDom) {
			if (oAncestor === oDescendant) {
				return true;
			}

			for (var oParent = oDescendant.getParent(); oParent; oParent = oParent.isA("sap.ui.core.UIComponent") ? oParent.oContainer : oParent.getParent()) {
				if (oParent.isA("sap.ui.core.Control")) {
					if (!oParent.getVisible()) {
						return false;
					}

					var oParentDom = oParent.getDomRef();
					if (oParentDom && !oParentDom.contains(oDescendantDom)) {
						return false;
					}
				}

				if (oParent === oAncestor) {
					return true;
				}
			}
		}

		function check(candidate) {

			// don't process the preserve area or the static area
			if ( candidate.id === ID_PRESERVE_AREA || candidate.id === ID_STATIC_AREA ) {
				return;
			}

			var sPreserveMarker = candidate.getAttribute(ATTR_PRESERVE_MARKER);
			if ( sPreserveMarker )  { // node is marked with the preserve marker
				let oCandidateControl;
				// before the re-rendering, UIArea moves all "to-be-preserved" nodes to the preserved area
				// except the control dom nodes which must be moved to preserved area via control rendering cycle
				if ( oControlBeforeRerender ) {
					oCandidateControl = Element.getElementById(sPreserveMarker);

					// let the rendering cycle of the control handles the preserving
					// but only when the control stack and the dom stack are in sync
					if ( oCandidateControl && isAncestor(oControlBeforeRerender, oCandidateControl, candidate) ) {
						return;
					}
				}

				// always create a placeholder
				// - when the current node is the root node then we're doing a single control rerendering and need to know where to rerender
				// - when the parent DOM belongs to the preserved DOM of another control, that control needs a placeholder as well
				// - otherwise, the placeholder might be unnecessary but will be removed with the DOM removal following the current preserve
				if ( candidate === oRootNode || needsPlaceholder(candidate) ) {
					makePlaceholder(candidate);
				} else if ( oCandidateControl && candidate.hasAttribute(ATTR_DO_NOT_SKIP_RENDERING_MARKER) ) {
					// if the preservation is triggered by the UIArea and if the control cannot skip the rendering then we must ensure that
					// this control gets rendered to bring the control from preserved area to the original DOM tree. Leaving the placeholder
					// with ATTR_DO_NOT_SKIP_RENDERING_MARKER at the candicate location will ensure that parent rendering cannot be skipped.
					makePlaceholder(candidate);
				}

				FocusHandler.trackFocusForPreservedElement(candidate);

				$preserve.append(candidate);
			} else if ( bPreserveNodesWithId && candidate.id ) {

				FocusHandler.trackFocusForPreservedElement(candidate);

				RenderManager.markPreservableContent(jQuery(candidate), candidate.id);
				$preserve.append(candidate);
				return;
			}

			// don't dive into nested UIAreas. They are preserved together with any preserved parent (e.g. HTML control)
			if ( !candidate.hasAttribute(ATTR_UI_AREA_MARKER) ) {
				var next = candidate.firstChild;
				while ( next ) {
					// determine nextSibiling before checking the candidate because
					// a move to the preserveArea will modify the sibling relationship!
					candidate = next;
					next = next.nextSibling;
					if ( candidate.nodeType === 1 /* Node.ELEMENT_NODE */ ) {
						check(candidate);
					}
				}
			}

		}

		Measurement.start(oRootNode.id + "---preserveContent","preserveContent for " + oRootNode.id, ["rendering","preserve"]);
		if ( bPreserveRoot ) {
			check(oRootNode);
		} else {
			jQuery(oRootNode).children().each(function(i,oNode) {
				check(oNode);
			});
		}
		Measurement.end(oRootNode.id + "---preserveContent");
	};

	/**
	 * Searches "to-be-preserved" nodes for the given control id.
	 *
	 * @param {string} sId control id to search content for.
	 * @returns {jQuery} a jQuery collection representing the found content
	 * @public
	 * @static
	 */
	RenderManager.findPreservedContent = function(sId) {
		assert(typeof sId === "string", "sId must be a string");
		var $preserve = getPreserveArea(),
			$content = $preserve.children("[" + ATTR_PRESERVE_MARKER + "='" + sId.replace(/(:|\.)/g,'\\$1') + "']");
		return $content;
	};

	/**
	 * Marks the given content as "to-be-preserved" for a control with the given id.
	 * When later on the content has been preserved, it can be found by giving the same id.
	 *
	 * @param {jQuery} $content a jQuery collection of DOM objects to be marked
	 * @param {string} sId id of the control to associate the content with
	 * @static
	 */
	RenderManager.markPreservableContent = function($content, sId) {
		$content.attr(ATTR_PRESERVE_MARKER, sId);
	};

	/**
	 * Checks whether the given DOM element is part of the 'preserve' area.
	 *
	 * @param {Element} oElement DOM element to check
	 * @returns {boolean} Whether element is part of 'preserve' area
	 * @private
	 * @static
	 */
	RenderManager.isPreservedContent = function(oElement) {
		return ( oElement && oElement.getAttribute(ATTR_PRESERVE_MARKER) && oElement.parentNode && oElement.parentNode.id == ID_PRESERVE_AREA );
	};

	/**
	 * Returns the hidden area reference belonging to the current window instance.
	 *
	 * @returns {Element} The hidden area reference belonging to the current window instance.
	 * @public
	 * @static
	 */
	RenderManager.getPreserveAreaRef = function() {
		return getPreserveArea()[0];
	};

	var ATTR_INLINE_TEMPLATE_MARKER = "data-sap-ui-template";

	/**
	 * Marks the given content as "inline template".
	 *
	 * @param {jQuery} $content a jQuery collection of DOM objects to be marked
	 * @private
	 * @static
	 */
	RenderManager.markInlineTemplate = function($content) {
		$content.attr(ATTR_INLINE_TEMPLATE_MARKER, "");
	};

	/**
	 * Checks whether the given DOM node is an 'inline template' area.
	 *
	 * @param {Element} oDomNode dom node which is checked
	 * @returns {boolean} whether node is an 'inline template' area
	 * @private
	 * @static
	 */
	RenderManager.isInlineTemplate = function(oDomNode) {
		return ( oDomNode && oDomNode.hasAttribute(ATTR_INLINE_TEMPLATE_MARKER) );
	};

	/**
	 * Determines the API version of a control renderer from the <code>apiVersion</code> marker.
	 * If this marker does not exist on the renderer then the default value 1 is returned.
	 * The inherited <code>apiVersion</code> value is not taken into account, <code>apiVersion</code> must be defined explicitly as an own property of the renderer.
	 *
	 * @param {sap.ui.core.Renderer} oRenderer The renderer of the control
	 * @returns {int} API version of the Renderer
	 * @private
	 * @static
	 */
	RenderManager.getApiVersion = function(oRenderer) {
		return (oRenderer && oRenderer.hasOwnProperty("apiVersion")) ? oRenderer.apiVersion : 1;
	};

	/**
	 * Indicates whether the control can skip the rendering.
	 *
	 * To skip the rendering:
	 *  1 - The own apiVersion property of the control renderer must be set to 4
	 *  2 - There must be no rendering related delegates belong to the control
	 *
	 * iUpdateDom options for the RENDER_ALWAYS dom marker:
	 *  0 : The DOM marker is not needed e.g. during the rendering
	 *  1 : Update the DOM marker only if the control's apiVersion is 4
	 *  2 : Always set the DOM marker independent of the control's apiVersion
	 *
	 * @param {sap.ui.core.Control} oControl The <code>Control</code> instance
	 * @param {int} [iUpdateDom=0] Whether a DOM marker should be updated or not
	 * @returns {boolean}
	 * @private
	 * @static
	 * @ui5-restricted sap.ui.core
	 */
	RenderManager.canSkipRendering = function(oControl, iUpdateDom) {
		var oRenderer = this.getRenderer(oControl);
		var bApiVersion4 = this.getApiVersion(oRenderer) == 4;
		if (!bApiVersion4 && iUpdateDom != 2) {
			return false;
		}

		var bSkipRendering = bApiVersion4 && !oControl.hasRenderingDelegate();
		if (iUpdateDom) {
			var oDomRef = oControl.getDomRef();
			if (oDomRef) {
				oDomRef.toggleAttribute(ATTR_DO_NOT_SKIP_RENDERING_MARKER, !bSkipRendering);
			}
		}

		return bSkipRendering;
	};

	//#################################################################################################
	// Helper Methods
	//#################################################################################################

	/**
	 * Renders the element data that can be used for both DOM and String rendering interfaces
	 *
	 * @param {sap.ui.core.RenderManager} oRm The <code>RenderManager</code> instance
	 * @param {sap.ui.core.Element} oElement The <code>Element</code> instance
	 * @private
	 */
	function renderElementData(oRm, oElement) {
		// render data attribute
		var sId = oElement.getId();
		oRm.attr("data-sap-ui", sId);

		if (BaseObject.isObjectA(oElement, "sap.ui.core.Control") && !RenderManager.canSkipRendering(oElement)) {
			oRm.attr(ATTR_DO_NOT_SKIP_RENDERING_MARKER, "");
		}

		if (oElement.__slot) {
			oRm.attr("slot", oElement.__slot);
		}

		// render custom data
		oElement.getCustomData().forEach(function(oData) {
			var oCheckResult = oData._checkWriteToDom(oElement);
			if (oCheckResult) {
				oRm.attr(oCheckResult.key.toLowerCase(), oCheckResult.value);
			}
		});

		// whether this element is configured to be draggable
		var bDraggable = oElement.getDragDropConfig().some(function(vDragDropInfo){
			return vDragDropInfo.isDraggable(oElement);
		});

		if (!bDraggable) {
			// also check parent config
			var oParent = oElement.getParent();
			if (oParent && oParent.getDragDropConfig) {
				bDraggable = oParent.getDragDropConfig().some(function(vDragDropInfo){
					return vDragDropInfo.isDraggable(oElement);
				});
			}
		}

		if (bDraggable) {
			oRm.attr("draggable", "true");
			oRm.attr("data-sap-ui-draggable", "true");
		}

		return this;
	}



	/**
	 * Inserts a given Node or HTML string at a given position relative to the provided HTML element.
	 *
	 * <!-- before : beforebegin -->
	 * <p>
	 *     <!-- prepend : afterbegin -->
	 *     foo
	 *     <!-- append : beforeend -->
	 * </p>
	 * <!-- after : afterend -->
	 *
	 * @param {HTMLElement} oElement The reference HTML element which the API is invoked upon
	 * @param {string} sPosition The insertion position "before", "after", "append", "prepend"
	 * @param {string|Node} vHTMLorNode The Node or HTML string to be inserted
	 * @private
	 */
	var mAdjacentMap = { before: "beforebegin", prepend: "afterbegin", append: "beforeend", after: "afterend" };
	function insertAdjacent(oElement, sPosition, vHTMLorNode) {
		if (typeof vHTMLorNode == "string")  {
			oElement.insertAdjacentHTML(mAdjacentMap[sPosition], vHTMLorNode);
		} else {
			oElement[sPosition](vHTMLorNode);
		}
	}

	/**
	 * Returns the renderer that should be used for the provided control in its current state.
	 *
	 * If the control is invisible and inherits its visible property from the sap.ui.core.Control
	 * then returns the InvisibleRenderer otherwise the renderer of the provided control class.
	 *
	 * @param {sap.ui.core.Control} oControl The <code>Control</code> instance
	 * @returns {object} Either InvisibleRenderer or the renderer of the control class
	 * @private
	 */
	function getCurrentRenderer(oControl) {
		var oMetadata = oControl.getMetadata();
		var bUsesInvisibleRenderer = (!oControl.getVisible() && oMetadata.getProperty("visible")._oParent.getName() == "sap.ui.core.Control");

		return bUsesInvisibleRenderer ? InvisibleRenderer : oMetadata.getRenderer();
	}

	return RenderManager;

}, true);
//# sourceMappingURL=Eventing-preload-0.js.map
