//@ui5-bundle Calendar-preload.js
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/future", [
	"sap/base/assert",
	"sap/base/config",
	"sap/base/Log"
], (
	assert,
	BaseConfig,
	Log
) => {
	"use strict";

	const bConfiguredFuture = BaseConfig.get({
		name: "sapUiXxFuture",
		type: BaseConfig.Type.Boolean,
		external: true
	});

	let bFuture = bConfiguredFuture;

	/**
	 *
	 * @param {string} sLevel The log level (e.g., 'info', 'warning', 'error').
	 * @param {string} sMessage The main log message.
	 * @param {object} [mOptions] An object containing further log message details.
	 * @param {object} [mOptions.suffix] Additional details relevant for logging only, appended to the main log message.
	 * @param {object} [mOptions.cause] The original error instance causing the error, used for rethrowing.
	 * @param {...any} args Additional arguments to be logged.
	 * @throws {Error} in 'future' mode
	 * @returns {void}
	 */
	function throws(sLevel, sMessage, mOptions, ...args) {
		if (bFuture) {
			throw new Error(sMessage, { cause: mOptions?.cause });
		}

		if (mOptions) {
			if (mOptions.suffix) {
				sMessage += " " + mOptions.suffix;
			} else {
				args.unshift(mOptions);
			}
		}

		Log[sLevel]("[FUTURE FATAL] " + sMessage, ...args);
	}

	/**
 	 *
 	 * @param {function} resolve The resolve function of the Promise.
 	 * @param {function} reject The reject function of the Promise.
 	 * @param {string} sLevel The log level (e.g., 'info', 'warning', 'error').
 	 * @param {string} sMessage The main log message.
 	 * @param {object} [mOptions] An object containing further log message details.
 	 * @param {object} [mOptions.suffix] Additional details relevant for logging only, appended to the main log message.
	 * @param {object} [mOptions.cause] The original error instance causing the error, used for rethrowing.
 	 * @param {...any} args Additional arguments to be logged.
 	 * @returns {void}
 	 */
	function reject(resolve, reject, sLevel, sMessage, mOptions, ...args) {
		if (bFuture) {
			reject(new Error(sMessage, { cause: mOptions?.cause }));
			return;
		}

		if (mOptions) {
			if (mOptions.suffix) {
				sMessage += " " + mOptions.suffix;
			} else {
				args.unshift(mOptions);
			}
		}

		resolve();
		Log[sLevel]("[FUTURE FATAL] " + sMessage, ...args);
	}

	/**
	 * Logs '[FUTURE FATAL]' marker in messages and throws error if
	 * 'sap-ui-xx-future' config option is set to true.
	 *
	 * @alias module:sap/base/future
	 * @namespace
	 * @private
	 * @ui5-restricted sap.base, sap.ui.core
	 */
	const future = {
		get active() {
			return bFuture;
		},
		set active(bValue) {
			bFuture = !!(bValue ?? bConfiguredFuture);
		},
		fatalThrows(...args) {
			throws("fatal", ...args);
		},
		errorThrows(...args) {
			throws("error", ...args);
		},
		warningThrows(...args) {
			throws("warning", ...args);
		},
		assertThrows(bResult, vMessage) {
			const sMessage = typeof vMessage === "function" ? vMessage() : vMessage;
			if (!bResult && bFuture) {
				throw new Error(vMessage);
			}
			assert(bResult, "[FUTURE FATAL] " + sMessage);
		},
		warningRejects(fnResolve, fnReject, ...args) {
			reject(fnResolve, fnReject, "warning", ...args);
		}
	};
	return future;
});
/*!
* OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
*/
sap.ui.predefine("sap/base/i18n/Formatting", [
	"sap/base/assert",
	"sap/base/config",
	"sap/base/Eventing",
	"sap/base/Log",
	"sap/base/i18n/Localization",
	"sap/base/i18n/LanguageTag",
	"sap/base/i18n/date/CalendarType",
	"sap/base/i18n/date/CalendarWeekNumbering",
	"sap/base/util/deepEqual",
	"sap/base/util/extend",
	"sap/base/util/isEmptyObject"
], (
	assert,
	BaseConfig,
	Eventing,
	Log,
	Localization,
	LanguageTag,
	CalendarType,
	CalendarWeekNumbering,
	deepEqual,
	extend,
	isEmptyObject
) => {
	"use strict";

	const oEventing = new Eventing();
	const oWritableConfig = BaseConfig.getWritableInstance();
	const mSettings = {};
	let mChanges;
	let aCustomIslamicCalendarData;
	let bInitialized = false;

	const M_ABAP_DATE_FORMAT_PATTERN = {
		"" : {pattern: null},
		"1": {pattern: "dd.MM.yyyy"},
		"2": {pattern: "MM/dd/yyyy"},
		"3": {pattern: "MM-dd-yyyy"},
		"4": {pattern: "yyyy.MM.dd"},
		"5": {pattern: "yyyy/MM/dd"},
		"6": {pattern: "yyyy-MM-dd"},
		"7": {pattern: "Gyy.MM.dd"},
		"8": {pattern: "Gyy/MM/dd"},
		"9": {pattern: "Gyy-MM-dd"},
		"A": {pattern: "yyyy/MM/dd"},
		"B": {pattern: "yyyy/MM/dd"},
		"C": {pattern: "yyyy/MM/dd"}
	};

	const M_ABAP_TIME_FORMAT_PATTERN = {
		"" : {"short": null,      medium:  null,        dayPeriods: null},
		"0": {"short": "HH:mm",   medium: "HH:mm:ss",   dayPeriods: null},
		"1": {"short": "hh:mm a", medium: "hh:mm:ss a", dayPeriods: ["AM", "PM"]},
		"2": {"short": "hh:mm a", medium: "hh:mm:ss a", dayPeriods: ["am", "pm"]},
		"3": {"short": "KK:mm a", medium: "KK:mm:ss a", dayPeriods: ["AM", "PM"]},
		"4": {"short": "KK:mm a", medium: "KK:mm:ss a", dayPeriods: ["am", "pm"]}
	};

	const M_ABAP_NUMBER_FORMAT_SYMBOLS = {
		"" : {groupingSeparator: null, decimalSeparator: null},
		" ": {groupingSeparator: ".", decimalSeparator: ","},
		"X": {groupingSeparator: ",", decimalSeparator: "."},
		"Y": {groupingSeparator: " ", decimalSeparator: ","}
	};

	function check(bCondition, sMessage) {
		if ( !bCondition ) {
			throw new TypeError(sMessage);
		}
	}

	function _set(sKey, oValue) {
		// Invalidating the BaseConfig is necessary, because Formatting.getLanguageTag
		// does defaulting depending on the mSettings. In case no specifc LaguageTag was
		// set the default would become applied and cached. If the mSettings are changed
		// inbetween the cache would not become invalidated because there is no direct
		// change to the Configuration and therefore the cached value would be wrong.
		BaseConfig._.invalidate();
		const oOldValue = mSettings[sKey];
		if (oValue != null) {
			mSettings[sKey] = oValue;
		} else {
			delete mSettings[sKey];
		}
		// report a change only if old and new value differ (null/undefined are treated as the same value)
		if ((oOldValue != null || oValue != null) && !deepEqual(oOldValue, oValue)) {
			const bFireEvent = !mChanges;
			mChanges ??= {};
			mChanges[sKey] = oValue;
			if (bFireEvent) {
				fireChange();
			}
		}
	}

	/**
	 * Helper that creates a LanguageTag object from the given language
	 * or, throws an error for non BCP-47 compliant languages.
	 *
	 * @param {string|module:sap/base/i18n/LanguageTag} vLanguageTag A BCP-47 compliant language tag
	 * @returns {module:sap/base/i18n/LanguageTag} The resulting LanguageTag
	 * @private
	 * @since 1.116.0
	 */
	function createLanguageTag(vLanguageTag) {
		let oLanguageTag;
		if (vLanguageTag && typeof vLanguageTag === 'string') {
			try {
				oLanguageTag = new LanguageTag(vLanguageTag);
			} catch (e) {
				// ignore
			}
		} else if (vLanguageTag instanceof LanguageTag) {
			oLanguageTag = vLanguageTag;
		}
		return oLanguageTag;
	}

	/**
	 * Configuration for formatting specific parameters
	 * @public
	 * @alias module:sap/base/i18n/Formatting
	 * @namespace
	 * @since 1.120
	 */
	const Formatting = {
		/**
		 * The <code>change</code> event is fired, when the configuration options are changed.
		 * For the event parameters please refer to {@link module:sap/base/i18n/Formatting$ChangeEvent
		 * Formatting$ChangeEvent}.
		 *
		 * @name module:sap/base/i18n/Formatting.change
		 * @event
		 * @param {module:sap/base/i18n/Formatting$ChangeEvent} oEvent
		 * @public
		 * @since 1.120
		 */

		/**
		 * The formatting change event. Contains only the parameters which were changed.
		 *
		 * The list below shows the possible combinations of parameters available as part of the change event.
		 *
		 * <ul>
		 * <li>{@link module:sap/base/i18n/Formatting.setLanguageTag Formatting.setLanguageTag}:
		 * <ul>
		 * <li><code>languageTag</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setCustomIslamicCalendarData Formatting.setCustomIslamicCalendarData}:
		 * <ul>
		 * <li><code>customIslamicCalendarData</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setCalendarWeekNumbering Formatting.setCalendarWeekNumbering}:
		 * <ul>
		 * <li><code>calendarWeekNumbering</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setCalendarType Formatting.setCalendarType}:
		 * <ul>
		 * <li><code>calendarType</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.addCustomCurrencies Formatting.addCustomCurrencies} / {@link module:sap/base/i18n/Formatting.setCustomCurrencies Formatting.setCustomCurrencies}:
		 * <ul>
		 * <li><code>currency</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setABAPDateFormat Formatting.setABAPDateFormat} (all parameters listed below):
		 * <ul>
		 * <li><code>ABAPDateFormat</code></li>
		 * <li><code>"dateFormats-short"</code></li>
		 * <li><code>"dateFormats-medium"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setABAPTimeFormat Formatting.setABAPTimeFormat} (all parameters listed below):
		 * <ul>
		 * <li><code>ABAPTimeFormat</code></li>
		 * <li><code>"timeFormats-short"</code></li>
		 * <li><code>"timeFormats-medium"</code></li>
		 * <li><code>"dayPeriods-format-abbreviated"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setABAPNumberFormat Formatting.setABAPNumberFormat} (all parameters listed below):
		 * <ul>
		 * <li><code>ABAPNumberFormat</code></li>
		 * <li><code>"symbols-latn-group"</code></li>
		 * <li><code>"symbols-latn-decimal"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setDatePattern Formatting.setDatePattern} (one of the parameters listed below):
		 * <ul>
		 * <li><code>"dateFormats-short"</code></li>
		 * <li><code>"dateFormats-medium"</code></li>
		 * <li><code>"dateFormats-long"</code></li>
		 * <li><code>"dateFormats-full"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setTimePattern Formatting.setTimePattern} (one of the parameters listed below):
		 * <ul>
		 * <li><code>"timeFormats-short"</code></li>
		 * <li><code>"timeFormats-medium"</code></li>
		 * <li><code>"timeFormats-long"</code></li>
		 * <li><code>"timeFormats-full"</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Formatting.setNumberSymbol Formatting.setNumberSymbol} (one of the parameters listed below):
		 * <ul>
		 * <li><code>"symbols-latn-group"</code></li>
		 * <li><code>"symbols-latn-decimal"</code></li>
		 * <li><code>"symbols-latn-plusSign"</code></li>
		 * <li><code>"symbols-latn-minusSign"</code></li>
		 * </ul>
		 * </li>
		 * </ul>
		 *
		 * @typedef {object} module:sap/base/i18n/Formatting$ChangeEvent
		 * @property {string} [languageTag] The formatting language tag.
		 * @property {string} [ABAPDateFormat] The ABAP date format.
		 * @property {string} [ABAPTimeFormat] The ABAP time format.
		 * @property {string} [ABAPNumberFormat] The ABAP number format.
		 * @property {object[]} [legacyDateCalendarCustomizing] The legacy date calendar customizing.
		 * @property {object} [calendarWeekNumbering] The calendar week numbering.
		 * @property {object} [calendarType] The calendar type.
		 * @property {string} ["dateFormats-short"] The short date format.
		 * @property {string} ["dateFormats-medium"] The medium date format.
		 * @property {string} ["dateFormats-long"] The long date format.
		 * @property {string} ["dateFormats-full"] The full date format.
		 * @property {string} ["timeFormats-short"] The short time format.
		 * @property {string} ["timeFormats-medium"] The medium time format.
		 * @property {string} ["timeFormats-long"] The long time format.
		 * @property {string} ["timeFormats-full"] The full time format.
		 * @property {string} ["symbols-latn-group"] The latin symbols group.
		 * @property {string} ["symbols-latn-decimal"] The latin symbols decimal.
		 * @property {string} ["symbols-latn-plusSign"] The latin symbols plusSign.
		 * @property {string} ["symbols-latn-minusSign"] The latin symbols minusSign.
		 * @property {Object<string,string>} [currency] The currency.
		 * @property {string[]} ["dayPeriods-format-abbreviated"] The abbreviated day periods format.
		 * @public
		 * @since 1.120
		 */

		/**
		 * Attaches the <code>fnFunction</code> event handler to the {@link #event:change change} event
		 * of <code>module:sap/base/i18n/Formatting</code>.
		 *
		 * @param {function(module:sap/base/i18n/Formatting$ChangeEvent)} fnFunction
		 *   The function to be called when the event occurs
		 * @public
		 * @since 1.120
		 */
		attachChange(fnFunction) {
			oEventing.attachEvent("change", fnFunction);
		},

		/**
		 * Detaches event handler <code>fnFunction</code> from the {@link #event:change change} event of
		 * this <code>module:sap/base/i18n/Formatting</code>.
		 *
		 * @param {function(module:sap/base/i18n/Formatting$ChangeEvent)} fnFunction Function to be called when the event occurs
		 * @public
		 * @since 1.120
		 */
		detachChange(fnFunction) {
			oEventing.detachEvent("change", fnFunction);
		},

		/**
		 * Returns the LanguageTag to be used for formatting.
		 *
		 * If no such LanguageTag has been defined, this method falls back to the language,
		 * see {@link module:sap/base/i18n/Localization.getLanguage Localization.getLanguage()}.
		 *
		 * If any user preferences for date, time or number formatting have been set,
		 * and if no format LanguageTag has been specified, then a special private use subtag
		 * is added to the LanguageTag, indicating to the framework that these user preferences
		 * should be applied.
		 *
		 * @returns {module:sap/base/i18n/LanguageTag} the format LanguageTag
		 * @public
		 * @since 1.120
		 */
		getLanguageTag() {
			function fallback() {
				let oLanguageTag = new LanguageTag(Localization.getLanguage());
				// if any user settings have been defined, add the private use subtag "sapufmt"
				if (!isEmptyObject(mSettings)
						|| Formatting.getCalendarWeekNumbering() !== CalendarWeekNumbering.Default) {
					let l = oLanguageTag.toString();
					if ( l.indexOf("-x-") < 0 ) {
						l += "-x-sapufmt";
					} else if ( l.indexOf("-sapufmt") <= l.indexOf("-x-") ) {
						l += "-sapufmt";
					}
					oLanguageTag = new LanguageTag(l);
				}
				return oLanguageTag;
			}
			return oWritableConfig.get({
				name: "sapUiFormatLocale",
				type: function(sFormatLocale) {return new LanguageTag(sFormatLocale);},
				defaultValue: fallback,
				external: true
			});
		},

		/**
		 * Sets a new language tag to be used from now on for retrieving language
		 * specific formatters. Modifying this setting does not have an impact on
		 * the retrieval of translated texts!
		 *
		 * Can either be set to a concrete value (a BCP47 or Java locale compliant
		 * language tag) or to <code>null</code>. When set to <code>null</code> (default
		 * value) then locale specific formatters are retrieved for the current language.
		 *
		 * After changing the format locale, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * <b>Note</b>: When a language tag is set, it has higher priority than a number,
		 * date or time format defined with a call to <code>setABAPNumberFormat</code>,
		 * <code>setABAPDateFormat</code> or <code>setABAPTimeFormat</code>.
		 *
		 * <b>Note</b>: See documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for restrictions.
		 *
		 * @param {string|module:sap/base/i18n/LanguageTag|null} vLanguageTag the new BCP47 compliant language tag;
		 *   case doesn't matter and underscores can be used instead of dashes to separate
		 *   components (compatibility with Java Locale IDs)
		 * @throws {TypeError} When <code>sLanguageTag</code> is given, but is not a valid BCP47 language
		 *   tag or Java locale identifier
		 * @public
		 * @since 1.120
		 */
		setLanguageTag(vLanguageTag) {
			const oLanguageTag = createLanguageTag(vLanguageTag);
			check(vLanguageTag == null || oLanguageTag, "vLanguageTag must be a BCP47 language tag or Java Locale id or null");
			const oOldLanguageTag = Formatting.getLanguageTag();
			oWritableConfig.set("sapUiFormatLocale", oLanguageTag?.toString());
			const oCurrentLanguageTag = Formatting.getLanguageTag();
			if (oOldLanguageTag.toString() !== oCurrentLanguageTag.toString()) {
				const bFireEvent = !mChanges;
				mChanges ??= {};
				mChanges.languageTag = oCurrentLanguageTag.toString();
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 * @deprecated As of Version 1.120
		 */
		_set: _set,

		/**
		 * Definition of a custom unit.
		 *
		 * @typedef {object} module:sap/base/i18n/Formatting.CustomUnit
		 * @property {string} displayName
		 *   The unit's display name
		 * @property {string} ["unitPattern-count-zero"]
		 *   The unit pattern for the plural form "zero"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} ["unitPattern-count-one"]
		 *   The unit pattern for the plural form "one"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} ["unitPattern-count-two"]
		 *   The unit pattern for the plural form "two"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} ["unitPattern-count-few"]
		 *   The unit pattern for the plural form "few"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} ["unitPattern-count-many"]
		 *   The unit pattern for the plural form "many"; <code>{0}</code> in the pattern is replaced by the number
		 * @property {string} "unitPattern-count-other"
		 *   The unit pattern for all other numbers which do not match the plural forms of the other given patterns;
		 *   <code>{0}</code> in the pattern is replaced by the number
		 * @public
		 * @see {@link sap.ui.core.LocaleData#getPluralCategories}
		 */

		/**
		 * Gets the custom units that have been set via {@link #.addCustomUnits Formatting.addCustomUnits} or
		 * {@link #.setCustomUnits Formatting.setCustomUnits}.
		 *
		 * @returns {Object<string,module:sap/base/i18n/Formatting.CustomUnit>|undefined}
		 *   A map with the unit code as key and a custom unit definition containing a display name and different unit
		 *   patterns as value; or <code>undefined</code> if there are no custom units
		 *
		 * @public
		 * @example <caption>A simple custom type "BAG" for which the value <code>1</code> is formatted as "1 bag", for
		 *   example in locale 'en', while <code>2</code> is formatted as "2 bags"</caption>
		 * {
		 *   "BAG": {
		 *     "displayName": "Bag",
		 *     "unitPattern-count-one": "{0} bag",
		 *     "unitPattern-count-other": "{0} bags"
		 *   }
		 * }
		 * @since 1.123
		 */
		getCustomUnits() {
			return mSettings["units"]?.["short"];
		},

		/**
		 * Replaces existing custom units by the given custom units.
		 *
		 * <b>Note:</b> Setting custom units affects all applications running with the current UI5 core instance.
		 *
		 * @param {Object<string,module:sap/base/i18n/Formatting.CustomUnit>} [mUnits]
		 *   A map with the unit code as key and a custom unit definition as value; <code>mUnits</code> replaces the
		 *   current custom units; if not given, all custom units are deleted; see
		 *   {@link #.getCustomUnits Formatting.getCustomUnits} for an example
		 *
		 * @public
		 * @see {@link module:sap/base/i18n/Formatting.addCustomUnits Formatting.addCustomUnits}
		 * @since 1.123
		 */
		setCustomUnits(mUnits) {
			// add custom units, or remove the existing ones if none are given
			let mUnitsshort = null;
			if (mUnits) {
				mUnitsshort = {
					"short": mUnits
				};
			}
			_set("units", mUnitsshort);
		},

		/**
		 * Adds custom units.
		 *
		 * <b>Note:</b> Adding custom units affects all applications running with the current UI5 core instance.
		 *
		 * @param {Object<string,module:sap/base/i18n/Formatting.CustomUnit>} mUnits
		 *   A map with the unit code as key and a custom unit definition as value; already existing custom units are
		 *   replaced, new ones are added; see {@link #.getCustomUnits Formatting.getCustomUnits} for an example
		 *
		 * @public
		 * @since 1.123
		 */
		addCustomUnits(mUnits) {
			const mExistingUnits = Formatting.getCustomUnits();
			if (mExistingUnits){
				mUnits = extend({}, mExistingUnits, mUnits);
			}
			Formatting.setCustomUnits(mUnits);
		},

		/**
		 * Sets custom unit mappings.
		 * Unit mappings contain key value pairs (both strings)
		 * * {string} key: a new entry which maps to an existing unit key
		 * * {string} value: an existing unit key
		 *
		 * Example:
		 * <code>
		 * {
		 *  "my": "my-custom-unit",
		 *  "cm": "length-centimeter"
		 * }
		 * </code>
		 * Note: It is possible to create multiple entries per unit key.
		 * Call with <code>null</code> to delete unit mappings.
		 * @param {object} mUnitMappings unit mappings
		 * @private
		 * @since 1.116.0
		 */
		setUnitMappings(mUnitMappings) {
			_set("unitMappings", mUnitMappings);
		},

		/**
		 * Adds unit mappings.
		 * Similar to {@link .setUnitMappings} but instead of setting the unit mappings, it will add additional ones.
		 * @param {object} mUnitMappings unit mappings
		 * @see {@link module:sap/base/i18n/Formatting.setUnitMappings}
		 * @private
		 * @since 1.116.0
		 */
		addUnitMappings(mUnitMappings) {
			// add custom units, or remove the existing ones if none are given
			const mExistingUnits = Formatting.getUnitMappings();
			if (mExistingUnits){
				mUnitMappings = extend({}, mExistingUnits, mUnitMappings);
			}
			Formatting.setUnitMappings(mUnitMappings);
		},

		/**
		 * Retrieves the unit mappings.
		 * These unit mappings are set by {@link .setUnitMappings} and {@link .addUnitMappings}
		 * @private
		 * @returns {object} unit mapping object
		 * @see {@link module:sap/base/i18n/Formatting.setUnitMappings}
		 * @see {@link module:sap/base/i18n/Formatting.addUnitMappings}
		 * @since 1.116.0
		 */
		getUnitMappings() {
			return mSettings["unitMappings"];
		},

		/**
		 * Returns the currently set date pattern or undefined if no pattern has been defined.
		 * @param {"short"|"medium"|"long"|"full"} sStyle The date style (short, medium, long or full)
		 * @returns {string} The resulting date pattern
		 * @public
		 * @since 1.120
		 */
		getDatePattern(sStyle) {
			assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			return mSettings["dateFormats-" + sStyle];
		},

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
		 * specific parts of the UI. See the documentation of {@link module:sap/base/i18n/Localization.setLanguage
		 * Localization.setLanguage()} for details and restrictions.
		 *
		 * @param {"short"|"medium"|"long"|"full"} sStyle must be one of short, medium, long or full.
		 * @param {string} sPattern the format pattern to be used in LDML syntax.
		 * @public
		 * @since 1.120
		 */
		setDatePattern(sStyle, sPattern) {
			check(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			_set("dateFormats-" + sStyle, sPattern);
		},

		/**
		 * Returns the currently set time pattern or undefined if no pattern has been defined.
		 * @param {"short"|"medium"|"long"|"full"} sStyle The time style (short, medium, long or full)
		 * @returns {string} The resulting time pattern
		 * @public
		 * @since 1.120
		 */
		getTimePattern(sStyle) {
			assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			return mSettings["timeFormats-" + sStyle];
		},

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
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {"short"|"medium"|"long"|"full"} sStyle must be one of short, medium, long or full.
		 * @param {string} sPattern the format pattern to be used in LDML syntax.
		 * @public
		 * @since 1.120
		 */
		setTimePattern(sStyle, sPattern) {
			check(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			_set("timeFormats-" + sStyle, sPattern);
		},

		/**
		 * Returns the currently set number symbol of the given type or undefined if no symbol has been defined.
		 *
		 * @param {"group"|"decimal"|"plusSign"|"minusSign"} sType the type of symbol
		 * @returns {string} A non-numerical symbol used as part of a number for the given type,
		 *   e.g. for locale de_DE:
		 *     <ul>
		 *       <li>"group": "." (grouping separator)</li>
		 *       <li>"decimal": "," (decimal separator)</li>
		 *       <li>"plusSign": "+" (plus sign)</li>
		 *       <li>"minusSign": "-" (minus sign)</li>
		 *     </ul>
		 * @public
		 * @since 1.120
		 */
		getNumberSymbol(sType) {
			assert(["group", "decimal", "plusSign", "minusSign"].includes(sType), "sType must be decimal, group, plusSign or minusSign");
			return mSettings["symbols-latn-" + sType];
		},

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
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {"group"|"decimal"|"plusSign"|"minusSign"} sType the type of symbol
		 * @param {string} sSymbol will be used to represent the given symbol type
		 * @public
		 * @since 1.120
		 */
		setNumberSymbol(sType, sSymbol) {
			check(["group", "decimal", "plusSign", "minusSign"].includes(sType), "sType must be decimal, group, plusSign or minusSign");
			_set("symbols-latn-" + sType, sSymbol);
		},

		/**
		 * Definition of a custom currency.
		 *
		 * @typedef {object} module:sap/base/i18n/Formatting.CustomCurrency
		 * @property {int} digits
		 *   The number of decimal digits to be used for the currency
		 * @public
		 */

		/**
		 * Gets the custom currencies that have been set via
		 * {@link #.addCustomCurrencies Formatting.addCustomCurrencies} or
		 * {@link #.setCustomCurrencies Formatting.setCustomCurrencies}.
		 * There is a special currency code named "DEFAULT" that is optional. If it is set it is used for all
		 * currencies not contained in the list, otherwise currency digits as defined by the CLDR are used as a
		 * fallback.
		 *
		 * @returns {Object<string,module:sap/base/i18n/Formatting.CustomCurrency>|undefined}
		 *   A map with the currency code as key and a custom currency definition containing the number of decimals as
		 *   value; or <code>undefined</code> if there are no custom currencies
		 *
		 * @public
	 	 * @example <caption>A simple example for custom currencies that uses CLDR data but overrides single
		 *   currencies</caption>
		 * {
		 *   "EUR3": {"digits": 3}
		 *   "MYD": {"digits": 4}
		 * }
		 *
	 	 * @example <caption>A simple example for custom currencies that overrides all currency information from the
		 *   CLDR</caption>
		 * {
		 *   "DEFAULT": {"digits": 2},
		 *   "ADP": {"digits": 0},
		 *   ...
		 *   "EUR3": {"digits": 3}
		 *   "MYD": {"digits": 4},
		 *   ...
		 *   "ZWD": {"digits": 0}
		 * }
		 * @since 1.120
		 */
		getCustomCurrencies() {
			return mSettings["currency"];
		},

		/**
		 * Replaces existing custom currencies by the given custom currencies. There is a special currency code named
		 * "DEFAULT" that is optional. In case it is set, it is used for all currencies not contained in the list,
		 * otherwise currency digits as defined by the CLDR are used as a fallback.
		 *
		 * <b>Note:</b> Setting custom units affects all applications running with the current UI5 core instance.
		 *
		 * @param {Object<string,module:sap/base/i18n/Formatting.CustomCurrency>} [mCurrencies]
		 *   A map with the currency code as key and a custom currency definition as value;  the custom currency code
		 *   must contain at least one non-digit character, so that the currency part can be distinguished from the
		 *   amount part; <code>mCurrencies</code> replaces the current custom currencies; if not given, all custom
		 *   currencies are deleted; see {@link #.getCustomCurrencies Formatting.getCustomCurrencies} for an example
		 *
		 * @public
		 * @see {@link module:sap/base/i18n/Formatting.addCustomCurrencies Formatting.addCustomCurrencies}
		 * @since 1.120
		 */
		setCustomCurrencies(mCurrencies) {
			check(typeof mCurrencies === "object" || mCurrencies == null, "mCurrencyDigits must be an object");
			Object.keys(mCurrencies || {}).forEach(function(sCurrencyDigit) {
				check(typeof sCurrencyDigit === "string");
				check(typeof mCurrencies[sCurrencyDigit] === "object");
			});
			_set("currency", mCurrencies);
		},

		/**
		 * Adds custom currencies. There is a special currency code named "DEFAULT" that is optional. In case it is set
		 * it is used for all currencies not contained in the list, otherwise currency digits as defined by the CLDR are
		 * used as a fallback.
		 *
		 * <b>Note:</b> Adding custom currencies affects all applications running with the current UI5 core instance.

		 * @param {Object<string,module:sap/base/i18n/Formatting.CustomCurrency>} [mCurrencies]
		 *   A map with the currency code as key and a custom currency definition as value; already existing custom
		 *   currencies are replaced, new ones are added; the custom currency code must contain at least one non-digit
		 *   character, so that the currency part can be distinguished from the amount part; see
		 *   {@link #.getCustomCurrencies Formatting.getCustomCurrencies} for an example
		 *
		 * @public
		 * @since 1.120
		 */
		addCustomCurrencies(mCurrencies) {
			const mExistingCurrencies = Formatting.getCustomCurrencies();
			if (mExistingCurrencies){
				mCurrencies = extend({}, mExistingCurrencies, mCurrencies);
			}
			Formatting.setCustomCurrencies(mCurrencies);
		},

		_setDayPeriods(sWidth, aTexts) {
			assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide", "sWidth must be narrow, abbreviated or wide");
			_set("dayPeriods-format-" + sWidth, aTexts);
		},

		/**
		 * Returns the currently set ABAP date format (its id) or undefined if none has been set.
		 *
		 * @returns {"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"A"|"B"|"C"|undefined} ID of the ABAP date format,
		 *   if not set or set to <code>""</code>, <code>undefined</code> will be returned
		 * @public
		 * @since 1.120
		 */
		getABAPDateFormat() {
			const sABAPDateFormat = oWritableConfig.get({
				name: "sapUiABAPDateFormat",
				type: BaseConfig.Type.String,
				/**
				 * @deprecated As of Version 1.120
				 */
				defaultValue: oWritableConfig.get({
					name: "sapUiLegacyDateFormat",
					type: BaseConfig.Type.String,
					external: true
				}),
				external: true
			});
			return sABAPDateFormat ? sABAPDateFormat.toUpperCase() : undefined;
		},

		/**
		 * Allows to specify one of the ABAP date formats.
		 *
		 * This method modifies the date patterns for 'short' and 'medium' style with the corresponding ABAP
		 * format. When called with a null or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the date format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"A"|"B"|"C"} [sFormatId=""] ID of the ABAP date format,
		 *   <code>""</code> will reset the date patterns for 'short' and 'medium' style to the
		 *   locale-specific ones.
		 * @public
		 * @since 1.120
		 */
		setABAPDateFormat(sFormatId) {
			sFormatId = sFormatId ? String(sFormatId).toUpperCase() : "";
			check(M_ABAP_DATE_FORMAT_PATTERN.hasOwnProperty(sFormatId), "sFormatId must be one of ['1','2','3','4','5','6','7','8','9','A','B','C'] or empty");
			const bFireEvent = !mChanges;
			const sOldFormat = Formatting.getABAPDateFormat();
			if (sOldFormat !== sFormatId || !bInitialized) {
				mChanges ??= {};
				oWritableConfig.set("sapUiABAPDateFormat", sFormatId);
				mChanges.ABAPDateFormat = sFormatId;
				Formatting.setDatePattern("short", M_ABAP_DATE_FORMAT_PATTERN[sFormatId].pattern);
				Formatting.setDatePattern("medium", M_ABAP_DATE_FORMAT_PATTERN[sFormatId].pattern);
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 * Returns the currently set ABAP time format (its id) or undefined if none has been set.
		 *
		 * @returns {"0"|"1"|"2"|"3"|"4"|undefined} ID of the ABAP date format,
		 *   if not set or set to <code>""</code>, <code>undefined</code> will be returned
		 * @public
		 * @since 1.120
		 */
		getABAPTimeFormat() {
			const sABAPTimeFormat = oWritableConfig.get({
				name: "sapUiABAPTimeFormat",
				type: BaseConfig.Type.String,
				/**
				 * @deprecated As of Version 1.120
				 */
				defaultValue: oWritableConfig.get({
					name: "sapUiLegacyTimeFormat",
					type: BaseConfig.Type.String,
					external: true
				}),
				external: true
			});
			return sABAPTimeFormat ? sABAPTimeFormat.toUpperCase() : undefined;
		},

		/**
		 * Allows to specify one of the ABAP time formats.
		 *
		 * This method sets the time patterns for 'short' and 'medium' style to the corresponding ABAP
		 * formats and sets the day period texts to "AM"/"PM" or "am"/"pm" respectively. When called
		 * with a null or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the time format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {""|"0"|"1"|"2"|"3"|"4"} [sFormatId=""] ID of the ABAP time format,
		 *   <code>""</code> will reset the time patterns for 'short' and 'medium' style and the day
		 *   period texts to the locale-specific ones.
		 * @public
		 * @since 1.120
		 */
		setABAPTimeFormat(sFormatId) {
			sFormatId = sFormatId || "";
			check(M_ABAP_TIME_FORMAT_PATTERN.hasOwnProperty(sFormatId), "sFormatId must be one of ['0','1','2','3','4'] or empty");
			const bFireEvent = !mChanges;
			const sOldFormat = Formatting.getABAPTimeFormat();
			if (sOldFormat !== sFormatId || !bInitialized) {
				mChanges ??= {};
				oWritableConfig.set("sapUiABAPTimeFormat", sFormatId);
				mChanges.ABAPTimeFormat = sFormatId;
				Formatting.setTimePattern("short", M_ABAP_TIME_FORMAT_PATTERN[sFormatId]["short"]);
				Formatting.setTimePattern("medium", M_ABAP_TIME_FORMAT_PATTERN[sFormatId]["medium"]);
				Formatting._setDayPeriods("abbreviated", M_ABAP_TIME_FORMAT_PATTERN[sFormatId].dayPeriods);
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 * Returns the currently set ABAP number format (its id) or undefined if none has been set.
		 *
		 * @returns {" "|"X"|"Y"|undefined} ID of the ABAP number format,
		 *   if not set or set to <code>""</code>, <code>undefined</code> will be returned
		 * @public
		 * @since 1.120
		 */
		getABAPNumberFormat() {
			const sABAPNumberFormat = oWritableConfig.get({
				name: "sapUiABAPNumberFormat",
				type: BaseConfig.Type.String,
				/**
				 * @deprecated As of Version 1.120
				 */
				defaultValue: oWritableConfig.get({
					name: "sapUiLegacyNumberFormat",
					type: BaseConfig.Type.String,
					external: true
				}),
				external: true
			});
			return sABAPNumberFormat ? sABAPNumberFormat.toUpperCase() : undefined;
		},

		/**
		 * Allows to specify one of the ABAP number format.
		 *
		 * This method will modify the 'group' and 'decimal' symbols. When called with a null
		 * or undefined format id, any previously applied format will be removed.
		 *
		 * After changing the number format, the framework tries to update localization
		 * specific parts of the UI. See the documentation of
		 * {@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage()}
		 * for details and restrictions.
		 *
		 * @param {""|" "|"X"|"Y"} [sFormatId=""] ID of the ABAP number format set,
		 *   <code>""</code> will reset the 'group' and 'decimal' symbols to the locale-specific
		 *   ones.
		 * @public
		 * @since 1.120
		 */
		setABAPNumberFormat(sFormatId) {
			sFormatId = sFormatId ? sFormatId.toUpperCase() : "";
			check(M_ABAP_NUMBER_FORMAT_SYMBOLS.hasOwnProperty(sFormatId), "sFormatId must be one of [' ','X','Y'] or empty");
			const bFireEvent = !mChanges;
			const sOldFormat = Formatting.getABAPNumberFormat();
			if (sOldFormat !== sFormatId || !bInitialized) {
				mChanges ??= {};
				oWritableConfig.set("sapUiABAPNumberFormat", sFormatId);
				mChanges.ABAPNumberFormat = sFormatId;
				Formatting.setNumberSymbol("group", M_ABAP_NUMBER_FORMAT_SYMBOLS[sFormatId].groupingSeparator);
				Formatting.setNumberSymbol("decimal", M_ABAP_NUMBER_FORMAT_SYMBOLS[sFormatId].decimalSeparator);
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 *
		 * Customizing data for the support of Islamic calendar.
		 * Represents one row of data from Table TISLCAL.
		 *
		 * @typedef {object} module:sap/base/i18n/Formatting.CustomIslamicCalendarData
		 *
		 * @property {"A"|"B"} dateFormat The date format. Column DATFM in TISLCAL.
		 * @property {string} islamicMonthStart The Islamic date in format: 'yyyyMMdd'. Column ISLMONTHSTART in TISLCAL.
		 * @property {string} gregDate The corresponding Gregorian date format: 'yyyyMMdd'. Column GREGDATE in TISLCAL.
		 *
		 * @public
		 */

		/**
		 * Allows to specify the customizing data for Islamic calendar support
		 *
		 * See: {@link module:sap/base/i18n/Formatting.CustomIslamicCalendarData}
		 *
		 * @param {module:sap/base/i18n/Formatting.CustomIslamicCalendarData[]} aCustomCalendarData Contains the customizing data for the support of Islamic calendar.
		 * One JSON object in the array represents one row of data from Table TISLCAL
		 * @public
		 * @since 1.120
		 */
		setCustomIslamicCalendarData(aCustomCalendarData) {
			check(Array.isArray(aCustomCalendarData), "aCustomCalendarData must be an Array");
			const bFireEvent = !mChanges;
			mChanges ??= {};
			aCustomIslamicCalendarData = mChanges.customIslamicCalendarData = aCustomCalendarData.slice();
			if (bFireEvent) {
				fireChange();
			}
		},

		/**
		 * Returns the currently set customizing data for Islamic calendar support.
		 *
		 * See: {@link module:sap/base/i18n/Formatting.CustomIslamicCalendarData}
		 *
		 * @returns {module:sap/base/i18n/Formatting.CustomIslamicCalendarData[]|undefined} Returns an array that contains the customizing data. Each element in the array has properties: dateFormat, islamicMonthStart, gregDate. For details, please see {@link #.setCustomIslamicCalendarData}
		 * @public
		 * @since 1.120
		 */
		getCustomIslamicCalendarData() {
			return aCustomIslamicCalendarData?.slice() ?? undefined;
		},

		/**
		 * Define whether the NumberFormatter shall always place the currency code after the numeric value, with
		 * the only exception of right-to-left locales, where the currency code shall be placed before the numeric value.
		 * Default configuration setting is <code>true</code>.
		 *
		 * When set to <code>false</code> the placement of the currency code is done dynamically, depending on the
		 * configured locale using data provided by the Unicode Common Locale Data Repository (CLDR).
		 *
		 * Each currency instance ({@link sap.ui.core.format.NumberFormat.getCurrencyInstance
		 * NumberFormat.getCurrencyInstance}) will be created with this setting unless overwritten on instance level.
		 *
		 * @param {boolean} bTrailingCurrencyCode Whether currency codes shall always be placed after the numeric value
		 * @public
		 * @since 1.120
		 */
		setTrailingCurrencyCode(bTrailingCurrencyCode) {
			check(typeof bTrailingCurrencyCode === "boolean", "bTrailingCurrencyCode must be a boolean");
			oWritableConfig.set("sapUiTrailingCurrencyCode", bTrailingCurrencyCode);
		},

		/**
		 * Returns current trailingCurrencyCode configuration for new NumberFormatter instances
		 *
		 * @return {boolean} Whether currency codes shall always be placed after the numeric value
		 * @public
		 * @since 1.120
		 */
		getTrailingCurrencyCode() {
			return oWritableConfig.get({
				name: "sapUiTrailingCurrencyCode",
				type: BaseConfig.Type.Boolean,
				defaultValue: true,
				external: true
			});
		},

		/**
		 * Returns a live object with the current settings
		 * TODO this method is part of the facade to be accessible from LocaleData, but it shouldn't be
		 *
		 * @returns {object} The custom LocaleData settings object
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.116.0
		 */
		getCustomLocaleData() {
			return mSettings;
		},

		/**
		 * Returns the calendar week numbering algorithm used to determine the first day of the week
		 * and the first calendar week of the year, see {@link module:sap/base/i18n/date/CalendarWeekNumbering
		 * CalendarWeekNumbering}.
		 *
		 * @returns {module:sap/base/i18n/date/CalendarWeekNumbering} The calendar week numbering algorithm
		 *
		 * @public
		 * @since 1.120
		 */
		getCalendarWeekNumbering() {
			let oCalendarWeekNumbering = CalendarWeekNumbering.Default;

			try {
				oCalendarWeekNumbering = oWritableConfig.get({
					name: "sapUiCalendarWeekNumbering",
					type: CalendarWeekNumbering,
					defaultValue: CalendarWeekNumbering.Default,
					external: true
				});
			} catch  (err) {
				//nothing to do, return default;
			}
			return oCalendarWeekNumbering;
		},

		/**
		 * Sets the calendar week numbering algorithm which is used to determine the first day of the week
		 * and the first calendar week of the year, see {@link module:sap/base/i18n/date/CalendarWeekNumbering
		 * CalendarWeekNumbering}.
		 *
		 * @param {module:sap/base/i18n/date/CalendarWeekNumbering} sCalendarWeekNumbering
		 *   The calendar week numbering algorithm
		 * @throws {TypeError}
		 *   If <code>sCalendarWeekNumbering</code> is not a valid calendar week numbering algorithm,
		 *   defined in {@link module:sap/base/i18n/date/CalendarWeekNumbering CalendarWeekNumbering}
		 *
		 * @public
		 * @since 1.120
		 */
		setCalendarWeekNumbering(sCalendarWeekNumbering) {
			BaseConfig._.checkEnum(CalendarWeekNumbering, sCalendarWeekNumbering, "calendarWeekNumbering");
			const sCurrentWeekNumbering = oWritableConfig.get({
				name: "sapUiCalendarWeekNumbering",
				type: CalendarWeekNumbering,
				defaultValue: CalendarWeekNumbering.Default,
				external: true
			});
			if (sCurrentWeekNumbering !== sCalendarWeekNumbering) {
				const bFireEvent = !mChanges;
				mChanges ??= {};
				oWritableConfig.set("sapUiCalendarWeekNumbering", sCalendarWeekNumbering);
				mChanges.calendarWeekNumbering = sCalendarWeekNumbering;
				if (bFireEvent) {
					fireChange();
				}
			}
		},

		/**
		 * Returns the calendar type which is being used in locale dependent functionality.
		 *
		 * When it's explicitly set by calling <code>setCalendarType</code>, the set calendar type is returned.
		 * Otherwise, the calendar type is determined by checking the format settings and current locale.
		 *
		 * @returns {module:sap/base/i18n/date/CalendarType} the current calendar type, e.g. <code>Gregorian</code>
		 * @public
		 * @since 1.120
		 */
		getCalendarType() {
			let sName,
				sCalendarType = oWritableConfig.get({
					name: "sapUiCalendarType",
					type: BaseConfig.Type.String,
					external: true
				});

			sCalendarType ??= null;

			if (sCalendarType) {
				for (sName in CalendarType) {
					if (sName.toLowerCase() === sCalendarType.toLowerCase()) {
						return sName;
					}
				}
				Log.warning("Parameter 'calendarType' is set to " + sCalendarType + " which isn't a valid value and therefore ignored. The calendar type is determined from format setting and current locale");
			}

			const sABAPDateFormat = Formatting.getABAPDateFormat();

			switch (sABAPDateFormat) {
				case "1":
				case "2":
				case "3":
				case "4":
				case "5":
				case "6":
					return CalendarType.Gregorian;
				case "7":
				case "8":
				case "9":
					return CalendarType.Japanese;
				case "A":
				case "B":
					return CalendarType.Islamic;
				case "C":
					return CalendarType.Persian;
				default:
					return Localization.getPreferredCalendarType();
			}
		},

		/**
		 * Sets the new calendar type to be used from now on in locale dependent functionality (for example,
		 * formatting, translation texts, etc.).
		 *
		 * @param {module:sap/base/i18n/date/CalendarType|null} sCalendarType the new calendar type. Set it with null to clear the calendar type
		 *   and the calendar type is calculated based on the format settings and current locale.
		 * @public
		 * @since 1.120
		 */
		setCalendarType(sCalendarType) {
			const sOldCalendarType = Formatting.getCalendarType();
			oWritableConfig.set("sapUiCalendarType", sCalendarType);
			const sCurrentCalendarType = Formatting.getCalendarType();
			if (sOldCalendarType !== sCurrentCalendarType) {
				const bFireEvent = !mChanges;
				mChanges ??= {};
				mChanges.calendarType = sCurrentCalendarType;
				if (bFireEvent) {
					fireChange();
				}
			}
		}
	};

	function fireChange() {
		oEventing.fireEvent("change", mChanges);
		mChanges = undefined;
	}

	function init() {
		// init ABAP formats
		const sABAPDateFormat = Formatting.getABAPDateFormat();
		if (sABAPDateFormat !== undefined) {
			Formatting.setABAPDateFormat(sABAPDateFormat);
		}
		const sABAPNumberFormat = Formatting.getABAPNumberFormat();
		if (sABAPNumberFormat !== undefined) {
			Formatting.setABAPNumberFormat(sABAPNumberFormat);
		}
		const sABAPTimeFormat = Formatting.getABAPTimeFormat();
		if (sABAPTimeFormat !== undefined) {
			Formatting.setABAPTimeFormat(sABAPTimeFormat);
		}
		bInitialized = true;
	}

	init();

	return Formatting;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/i18n/ResourceBundle", [
		'sap/base/assert',
		'sap/base/Log',
		'sap/base/i18n/Localization',
		'sap/base/strings/formatMessage',
		'sap/base/util/Properties',
		'sap/base/util/merge'
	],
	function(assert, Log, Localization, formatMessage, Properties, merge) {
	"use strict";

	/**
	 * A regular expression that describes language tags according to BCP-47.
	 * @see BCP47 "Tags for Identifying Languages" (http://www.ietf.org/rfc/bcp/bcp47.txt)
	 *
	 * The matching groups are
	 *  0=all
	 *  1=language (shortest ISO639 code + ext. language sub tags | 4digits (reserved) | registered language sub tags)
	 *  2=script (4 letters)
	 *  3=region (2letter language or 3 digits)
	 *  4=variants (separated by '-', Note: capturing group contains leading '-' to shorten the regex!)
	 *  5=extensions (including leading singleton, multiple extensions separated by '-')
	 *  6=private use section (including leading 'x', multiple sections separated by '-')
	 *
	 *              [-------------------- language ----------------------][--- script ---][------- region --------][------------- variants --------------][----------- extensions ------------][------ private use -------]
	 */
	var rLocale = /^((?:[A-Z]{2,3}(?:-[A-Z]{3}){0,3})|[A-Z]{4}|[A-Z]{5,8})(?:-([A-Z]{4}))?(?:-([A-Z]{2}|[0-9]{3}))?((?:-[0-9A-Z]{5,8}|-[0-9][0-9A-Z]{3})*)((?:-[0-9A-WYZ](?:-[0-9A-Z]{2,8})+)*)(?:-(X(?:-[0-9A-Z]{1,8})+))?$/i;

	/**
	 * Resource bundles are stored according to the Java Development Kit conventions.
	 * JDK uses old language names for a few ISO639 codes ("iw" for "he", "ji" for "yi" and "no" for "nb").
	 * Make sure to convert newer codes to older ones before creating file names.
	 * @const
	 * @private
	 */
	var M_ISO639_NEW_TO_OLD = {
		"he" : "iw",
		"yi" : "ji",
		"nb" : "no"
	};

	/**
	 * Inverse of M_ISO639_NEW_TO_OLD.
	 * @const
	 * @private
	 */
	var M_ISO639_OLD_TO_NEW = {
		"iw" : "he",
		"ji" : "yi",
		"no" : "nb"
	};

	/**
	 * HANA XS Engine can't handle private extensions in BCP47 language tags.
	 * Therefore, the agreed BCP47 codes for the technical languages 1Q..3Q
	 * don't work as Accept-Header and need to be send as URL parameters as well.
	 * @const
	 * @private
	 */
	var M_SUPPORTABILITY_TO_XS = {
		"en_US_saptrc"  : "1Q",
		"en_US_sappsd"  : "2Q",
		"en_US_saprigi" : "3Q"
	};

	/**
	 * Default fallback locale is "en" (English) to stay backward compatible
	 * @const
	 * @private
	 */
	var sDefaultFallbackLocale = "en";

	var rSAPSupportabilityLocales = /(?:^|-)(saptrc|sappsd|saprigi)(?:-|$)/i;

	/**
	 * The cache for property file requests
	 *
	 * @private
	 */
	const oPropertiesCache = {

		/**
		 * Holds the cache entries
		 *
		 * @private
		 */
		_oCache: new Map(),

		/**
		 * Removes the given cache entry
		 *
		 * @param {string} sKey The key of the cache entry
		 * @private
		 */
		_delete(sKey){
			this._oCache.delete(sKey);
		},

		/**
		 * Creates and returns a new instance of {@link module:sap/base/util/Properties}.
		 *
		 * @see {@link module:sap/base/util/Properties.create}
		 * @param {object} oOptions The options to create the properties object
		 * @returns {module:sap/base/util/Properties|null|Promise<module:sap/base/util/Properties|null>} The properties object or a promise on it
		 * @private
		 */
		_load(oOptions){
			return Properties.create(oOptions);
		},

		/**
		 * Inserts or updates an entry
		 *
		 * @param {string} sKey the cache id
		 * @param {object} oValue entry to cache
		 * @private
		 */
		_set(sKey, oValue){
			this._oCache.set(sKey, oValue);
		},

		/**
		 * Retrieves an entry from the cache
		 *
		 * @param {string} sKey the cache id
		 * @param {object} [oLoadOptions] options which are passed to #load
		 * @param {boolean} [bAsync=false] async requested
		 * @returns {object} entry which either comes from cache or from #load
		 * @private
		 */
		get(sKey, oLoadOptions, bAsync){
			if (this._oCache.has(sKey)) {
				const oExisting = this._oCache.get(sKey);
				if (bAsync){
					return Promise.resolve(oExisting);
				} else if (!(oExisting instanceof Promise)) {
					return oExisting;
				}
				// can't use cached, non-fulfilled promise in sync mode
			}

			const oNewEntry = this._load(oLoadOptions);
			if (oNewEntry instanceof Promise) {
				// update cache entry with actual object instead of fulfilled promise
				oNewEntry.then((oResult) => {
					if (oResult) {
						this._set(sKey, oResult);
					} else {
						this._delete(sKey);
					}
				}).catch((e) => {
					this._delete(sKey);
					throw e;
				});
			}
			if (oNewEntry) {
				this._set(sKey, oNewEntry);
			}
			return oNewEntry;
		}
	};

	/**
	 * Helper to normalize the given locale (in BCP-47 syntax) to the java.util.Locale format.
	 *
	 * @param {string} sLocale Locale to normalize
	 * @param {boolean} [bPreserveLanguage=false] Whether to keep the language untouched, otherwise
	 *     the language is mapped from modern to legacy ISO639 codes, e.g. "he" to "iw"
	 * @returns {string|undefined} Normalized locale or <code>undefined</code> if the locale can't be normalized
	 * @private
	 */
	function normalize(sLocale, bPreserveLanguage) {

		var m;
		if ( typeof sLocale === 'string' && (m = rLocale.exec(sLocale.replace(/_/g, '-'))) ) {
			var sLanguage = m[1].toLowerCase();
			if (!bPreserveLanguage) {
				sLanguage = M_ISO639_NEW_TO_OLD[sLanguage] || sLanguage;
			}
			var sScript = m[2] ? m[2].toLowerCase() : undefined;
			var sRegion = m[3] ? m[3].toUpperCase() : undefined;
			var sVariants = m[4] ? m[4].slice(1) : undefined;
			var sPrivate = m[6];
			// recognize and convert special SAP supportability locales (overwrites m[]!)
			if ( (sPrivate && (m = rSAPSupportabilityLocales.exec(sPrivate)))
				|| (sVariants && (m = rSAPSupportabilityLocales.exec(sVariants))) ) {
				return "en_US_" + m[1].toLowerCase(); // for now enforce en_US (agreed with SAP SLS)
			}
			// Chinese: when no region but a script is specified, use default region for each script
			if ( sLanguage === "zh" && !sRegion ) {
				if ( sScript === "hans" ) {
					sRegion = "CN";
				} else if ( sScript === "hant" ) {
					sRegion = "TW";
				}
			}
			if (sLanguage === "sr" && sScript === "latn") {
				if (bPreserveLanguage) {
					sLanguage = "sr_Latn";
				} else {
					sLanguage = "sh";
				}
			}
			return sLanguage + (sRegion ? "_" + sRegion + (sVariants ? "_" + sVariants.replace("-","_") : "") : "");
		}
	}

	/**
	 * Normalizes the given locale, unless it is an empty string (<code>""</code>).
	 *
	 * When locale is an empty string (<code>""</code>), it is returned without normalization.
	 * @see normalize
	 * @param {string} sLocale locale (aka 'language tag') to be normalized.
	 * 	   Can either be a BCP47 language tag or a JDK compatible locale string (e.g. "en-GB", "en_GB" or "fr");
	 * @param {boolean} [bPreserveLanguage=false] whether to keep the language untouched, otherwise
	 *     the language is mapped from modern to legacy ISO639 codes, e.g. "he" to "iw"
	 * @returns {string} normalized locale
	 * @throws {TypeError} Will throw an error if the locale is not a valid BCP47 language tag.
	 * @private
	 */
	function normalizePreserveEmpty(sLocale, bPreserveLanguage) {
		// empty string is valid and should not be normalized
		if (sLocale === "") {
			return sLocale;
		}
		var sNormalizedLocale = normalize(sLocale, bPreserveLanguage);
		if (sNormalizedLocale === undefined) {
			throw new TypeError("Locale '" + sLocale + "' is not a valid BCP47 language tag");
		}
		return sNormalizedLocale;
	}

	/**
	 * Returns the default locale (the locale defined in UI5 configuration if available, else fallbackLocale).
	 *
	 * @param {string} sFallbackLocale If the locale cannot be retrieved from the configuration
	 * @returns {string} The default locale
	 * @private
	 */
	function defaultLocale(sFallbackLocale) {
		var sLocale;
		// use the current session locale, if available
		sLocale = Localization.getLanguage();
		sLocale = normalize(sLocale);
		// last fallback is fallbackLocale if no or no valid locale is given
		return sLocale || sFallbackLocale;
	}

	/**
	 * Helper to normalize the given locale (java.util.Locale format) to the BCP-47 syntax.
	 *
	 * @param {string} sLocale locale to convert
	 * @param {boolean} bConvertToModern whether to convert to modern language
	 * @returns {string|undefined} Normalized locale or <code>undefined</code> if the locale can't be normalized
	 */
	function convertLocaleToBCP47(sLocale, bConvertToModern) {
		var m;
		if ( typeof sLocale === 'string' && (m = rLocale.exec(sLocale.replace(/_/g, '-'))) ) {
			var sLanguage = m[1].toLowerCase();
			var sScript = m[2] ? m[2].toLowerCase() : undefined;
			// special case for "sr_Latn" language: "sh" should then be used
			if (bConvertToModern && sLanguage === "sh" && !sScript) {
				sLanguage = "sr_Latn";
			} else if (!bConvertToModern && sLanguage === "sr" && sScript === "latn") {
				sLanguage = "sh";
			}
			sLanguage = M_ISO639_OLD_TO_NEW[sLanguage] || sLanguage;
			return sLanguage + (m[3] ? "-" + m[3].toUpperCase() + (m[4] ? "-" + m[4].slice(1).replace("_","-") : "") : "");
		}
	}

	/**
	 * A regular expression to split a URL into
	 * <ol>
	 * <li>a part before the file extension</li>
	 * <li>the file extension itself</li>
	 * <li>any remaining part after the file extension (query, hash - optional)</li>
	 * </ol>.
	 *
	 * Won't match for URLs without a file extension.
	 *
	 *           [------- prefix ------][----ext----][-------suffix--------]
	 *                                               ?[--query--]#[--hash--]
	 */
	var rUrl = /^((?:[^?#]*\/)?[^\/?#]*)(\.[^.\/?#]+)((?:\?([^#]*))?(?:#(.*))?)$/;

	/**
	 * List of supported file extensions.
	 *
	 * Could be enriched in future or even could be made
	 * extensible to support other formats as well.
	 * @const
	 * @private
	 */
	var A_VALID_FILE_TYPES = [ ".properties", ".hdbtextbundle" ];

	/**
	 * Helper to split a URL with the above regex.
	 * Either returns an object with the parts or undefined.
	 * @param {string} sUrl URL to analyze / split into pieces.
	 * @returns {object} an object with properties for the individual URL parts
	 */
	function splitUrl(sUrl) {
		var m = rUrl.exec(sUrl);
		if ( !m || A_VALID_FILE_TYPES.indexOf( m[2] ) < 0 ) {
			throw new Error("resource URL '" + sUrl + "' has unknown type (should be one of " + A_VALID_FILE_TYPES.join(",") + ")");
		}
		return { url : sUrl, prefix : m[1], ext : m[2], query: m[4], hash: (m[5] || ""), suffix : m[2] + (m[3] || "") };
	}

	/**
	 * @class Contains locale-specific texts.
	 *
	 * If you need a locale-specific text within your application, you can use the
	 * resource bundle to load the locale-specific file from the server and access
	 * the texts of it.
	 *
	 * Use {@link module:sap/base/i18n/ResourceBundle.create} to create an instance of sap/base/i18n/ResourceBundle
	 * (.properties without any locale information, e.g. "mybundle.properties"), and optionally
	 * a locale. The locale is defined as a string of the language and an optional country code
	 * separated by underscore (e.g. "en_GB" or "fr"). If no locale is passed, the default
	 * locale is "en" if the SAPUI5 framework is not available. Otherwise the default locale is taken from
	 * the SAPUI5 configuration.
	 *
	 * With the getText() method of the resource bundle, a locale-specific string value
	 * for a given key will be returned.
	 *
	 * With the given locale, the resource bundle requests the locale-specific properties file
	 * (e.g. "mybundle_fr_FR.properties"). If no file is found for the requested locale or if the file
	 * does not contain a text for the given key, a sequence of fallback locales is tried one by one.
	 * First, if the locale contains a region information (fr_FR), then the locale without the region is
	 * tried (fr). If that also can't be found or doesn't contain the requested text, a fallback language
	 * will be used, if given (defaults to en (English), assuming that most development projects contain
	 * at least English texts). If that also fails, the file without locale (base URL of the bundle,
	 * often called the 'raw' bundle) is tried.
	 *
	 * If none of the requested files can be found or none of them contains a text for the given key,
	 * then the key itself is returned as text.
	 *
	 * Exception: Fallback for "zh_HK" is "zh_TW" before "zh".
	 *
	 * @since 1.58
	 * @alias module:sap/base/i18n/ResourceBundle
	 * @public
	 * @hideconstructor
	 */
	function ResourceBundle(sUrl, sLocale, bIncludeInfo, bAsync, aSupportedLocales, sFallbackLocale, bSkipFallbackLocaleAndRaw){
		// locale to retrieve texts for (normalized)
		this.sLocale = normalize(sLocale) || defaultLocale(sFallbackLocale === undefined ? sDefaultFallbackLocale : sFallbackLocale);
		this.oUrlInfo = splitUrl(sUrl);
		this.bIncludeInfo = bIncludeInfo;
		this.bAsync = bAsync;
		// list of custom bundles
		this.aCustomBundles = [];
		// declare list of property files that are loaded,
		// along with a list of origins
		this.aPropertyFiles = [];
		this.aPropertyOrigins = [];

		this.aLocales = [];

		// list of calculated fallbackLocales
		// note: every locale which was loaded is removed from this list
		this._aFallbackLocales = calculateFallbackChain(
			this.sLocale,
			// bundle specific supported locales will be favored over configuration ones
			aSupportedLocales || Localization.getSupportedLanguages(),
			sFallbackLocale,
			" of the bundle '" + this.oUrlInfo.url + "'",
			bSkipFallbackLocaleAndRaw
		);

		// load the most specific, existing properties file
		if (bAsync) {
			var resolveWithThis = function() { return this; }.bind(this);
			return loadNextPropertiesAsync(this).then(resolveWithThis, resolveWithThis);
		}
		loadNextPropertiesSync(this);
	}

	/**
	 * Enhances the resource bundle with a custom resource bundle. The bundle
	 * can be enhanced with multiple resource bundles. The last enhanced resource
	 * bundle wins against the previous ones and the original ones. This function
	 * can be called several times.
	 *
	 * @param {module:sap/base/i18n/ResourceBundle} oCustomBundle an instance of a <code>sap/base/i18n/ResourceBundle</code>
	 * @private
	 */
	ResourceBundle.prototype._enhance = function(oCustomBundle) {
		if (oCustomBundle instanceof ResourceBundle) {
			this.aCustomBundles.push(oCustomBundle);
		} else {
			// we report the error but do not break the execution
			Log.error("Custom resource bundle is either undefined or not an instanceof sap/base/i18n/ResourceBundle. Therefore this custom resource bundle will be ignored!");
		}
	};

	/**
	 * Returns a locale-specific string value for the given key sKey.
	 *
	 * The text is searched in this resource bundle according to the fallback chain described in
	 * {@link module:sap/base/i18n/ResourceBundle}. If no text could be found, the key itself is used
	 * as text.
	 *
	 *
	 * <h3>Placeholders</h3>
	 *
	 * A text can contain placeholders that will be replaced with concrete values when
	 * <code>getText</code> is called. The replacement is triggered by the <code>aArgs</code> parameter.
	 *
	 * Whenever this parameter is given, then the text and the arguments are additionally run through
	 * the {@link module:sap/base/strings/formatMessage} API to replace placeholders in the text with
	 * the corresponding values from the arguments array. The resulting string is returned by
	 * <code>getText</code>.
	 *
	 * As the <code>formatMessage</code> API imposes some requirements on the input text (regarding
	 * curly braces and single apostrophes), text authors need to be aware of the specifics of the
	 * <code>formatMessage</code> API. Callers of <code>getText</code>, on the other side, should only
	 * supply <code>aArgs</code> when the text has been created with the <code>formatMessage</code> API
	 * in mind. Otherwise, single apostrophes in the text might be removed unintentionally.
	 *
	 * When <code>getText</code> is called without <code>aArgs</code>, the <code>formatMessage</code>
	 * API is not applied and the transformation reg. placeholders and apostrophes does not happen.
	 *
	 * For more details on the replacement mechanism refer to {@link module:sap/base/strings/formatMessage}.
	 *
	 * @param {string} sKey Key to retrieve the text for
	 * @param {any[]} [aArgs] List of parameter values which should replace the placeholders "{<i>n</i>}"
	 *     (<i>n</i> is the index) in the found locale-specific string value. Note that the replacement
	 *     is done whenever <code>aArgs</code> is given, no matter whether the text contains placeholders
	 *     or not and no matter whether <code>aArgs</code> contains a value for <i>n</i> or not.
	 * @param {boolean} [bIgnoreKeyFallback=false]
	 *     If set, <code>undefined</code> is returned instead of the key string, when the key is not found
	 *     in any bundle or fallback bundle.
	 * @returns {string|undefined}
	 *     The value belonging to the key, if found; otherwise the key itself or <code>undefined</code>
	 *     depending on <code>bIgnoreKeyFallback</code>.
	 *
	 * @public
	 */
	ResourceBundle.prototype.getText = function(sKey, aArgs, bIgnoreKeyFallback){

		// 1. try to retrieve text from properties (including custom properties)
		var sValue = this._getTextFromProperties(sKey, aArgs);
		if (sValue != null) {
			return sValue;
		}

		// 2. try to retrieve text from fallback properties (including custom fallback properties)
		sValue = this._getTextFromFallback(sKey, aArgs);
		if (sValue != null) {
			return sValue;
		}

		if (bIgnoreKeyFallback) {
			return undefined;
		} else {
			assert(false, "could not find any translatable text for key '" + sKey + "' in bundle file(s): '" + this.aPropertyOrigins.join("', '") + "'");
			return this._formatValue(sKey, sKey, aArgs);
		}
	};

	/**
	 * Enriches the input value with originInfo if <code>this.bIncludeInfo</code> is truthy.
	 * Uses args to format the message.
	 * @param {string} sValue the given input value
	 * @param {string} sKey the key within the bundle
	 * @param {array} [aArgs] arguments to format the message
	 * @returns {string|null} formatted string, <code>null</code> if sValue is not a string
	 * @private
	 */
	ResourceBundle.prototype._formatValue = function(sValue, sKey, aArgs){
		if (typeof sValue === "string") {

			if (aArgs !== undefined && !Array.isArray(aArgs)){
				Log.error("sap/base/i18n/ResourceBundle: value for parameter 'aArgs' is not of type array");
			}

			if (aArgs) {
				sValue = formatMessage(sValue, aArgs);
			}

			if (this.bIncludeInfo) {
				// String object is created on purpose and must not be a string literal
				// eslint-disable-next-line no-new-wrappers
				sValue = new String(sValue);
				sValue.originInfo = {
					source: "Resource Bundle",
					url: this.oUrlInfo.url,
					locale: this.sLocale,
					key: sKey
				};
			}
		}
		return sValue;
	};

	/**
	 * Recursively loads synchronously the fallback locale's properties and looks up the value by key.
	 * The custom bundles are checked first in reverse order.
	 * @param {string} sKey the key within the bundle
	 * @param {array} [aArgs] arguments to format the message
	 * @returns {string|null} the formatted value if found, <code>null</code> otherwise
	 * @private
	 */
	ResourceBundle.prototype._getTextFromFallback = function(sKey, aArgs){

		var sValue, i;

		// loop over the custom bundles before resolving this one
		// lookup the custom resource bundles (last one first!)
		for (i = this.aCustomBundles.length - 1; i >= 0; i--) {
			sValue = this.aCustomBundles[i]._getTextFromFallback(sKey, aArgs);
			// value found - so return it!
			if (sValue != null) {
				return sValue; // found!
			}
		}

		// value for this key was not found in the currently loaded property files,
		// load the fallback locales
		while ( typeof sValue !== "string" && this._aFallbackLocales.length ) {

			var oProperties = loadNextPropertiesSync(this);

			// check whether the key is included in the newly loaded property file
			if (oProperties) {
				sValue = oProperties.getProperty(sKey);
				if (typeof sValue === "string") {
					return this._formatValue(sValue, sKey, aArgs);
				}
			}
		}
		return null;
	};

	/**
	 * Recursively loads locale's properties and looks up the value by key.
	 * The custom bundles are checked first in reverse order.
	 * @param {string} sKey the key within the bundle
	 * @param {array} [aArgs] arguments to format the message
	 * @returns {string|null} the formatted value if found, <code>null</code> otherwise
	 * @private
	 */
	ResourceBundle.prototype._getTextFromProperties = function(sKey, aArgs){
		var sValue = null,
			i;

		// loop over the custom bundles before resolving this one
		// lookup the custom resource bundles (last one first!)
		for (i = this.aCustomBundles.length - 1; i >= 0; i--) {
			sValue = this.aCustomBundles[i]._getTextFromProperties(sKey, aArgs);
			// value found - so return it!
			if (sValue != null) {
				return sValue; // found!
			}
		}

		// loop over all loaded property files and return the value for the key if any
		for (i = 0; i < this.aPropertyFiles.length; i++) {
			sValue = this.aPropertyFiles[i].getProperty(sKey);
			if (typeof sValue === "string") {
				return this._formatValue(sValue, sKey, aArgs);
			}
		}

		return null;
	};

	/**
	 * Checks whether a text for the given key can be found in the first loaded
	 * resource bundle or not. Neither the custom resource bundles nor the
	 * fallback chain will be processed.
	 *
	 * This method allows to check for the existence of a text without triggering
	 * requests for the fallback locales.
	 *
	 * When requesting the resource bundle asynchronously this check must only be
	 * used after the resource bundle has been loaded.
	 *
	 * @param {string} sKey Key to check
	 * @returns {boolean} Whether the text has been found in the concrete bundle
	 *
	 * @public
	 */
	ResourceBundle.prototype.hasText = function(sKey) {
		return this.aPropertyFiles.length > 0 && typeof this.aPropertyFiles[0].getProperty(sKey) === "string";
	};

	/**
	 * Creates and returns a new instance with the exact same parameters this instance has been created with.
	 *
	 * @private
	 * @ui5-restricted sap.ui.model.resource.ResourceModel
	 * @returns {module:sap/base/i18n/ResourceBundle|Promise<module:sap/base/i18n/ResourceBundle>}
	 *     A new resource bundle or a Promise on that bundle (in asynchronous case)
	 */
	ResourceBundle.prototype._recreate = function() {
		if (!this._mCreateFactoryParams) {
			// This can only happen when calling the method for instances created by ResourceBundle.create via getEnhanceWithResourceBundles or getTerminologyResourceBundles.
			// But those instances are only internally assigned to the actual ResourceBundle instance. Therefore it is not required for the model use case to recreate a bundle.
			var error = new Error("ResourceBundle instance can't be recreated as it has not been created by the ResourceBundle.create factory.");
			if (this.bAsync) {
				return Promise.reject(error);
			} else {
				throw error;
			}
		} else {
			return ResourceBundle.create(this._mCreateFactoryParams);
		}
	};

	/*
	 * Tries to load properties files asynchronously until one could be loaded
	 * successfully or until there are no more fallback locales.
	 */
	function loadNextPropertiesAsync(oBundle) {
		if ( oBundle._aFallbackLocales.length ) {
			return tryToLoadNextProperties(oBundle, true).then(function(oProps) {
				// if props could not be loaded, try next fallback locale
				return oProps || loadNextPropertiesAsync(oBundle);
			});
		}
		// no more fallback locales: give up
		return Promise.resolve(null);
	}

	/*
	 * Tries to load properties files synchronously until one could be loaded
	 * successfully or until there are no more fallback locales.
	 */
	function loadNextPropertiesSync(oBundle) {
		while ( oBundle._aFallbackLocales.length ) {
			var oProps = tryToLoadNextProperties(oBundle, false);
			if ( oProps ) {
				return oProps;
			}
		}
		return null;
	}

	/*
	 * Tries to load the properties file for the next fallback locale.
	 *
	 * If there is no further fallback locale or when requests for the next fallback locale are
	 * suppressed by configuration or when the file cannot be loaded, <code>null</code> is returned.
	 *
	 * @param {module:sap/base/i18n/ResourceBundle} oBundle ResourceBundle to extend
	 * @param {boolean} [bAsync=false] Whether the resource should be loaded asynchronously
	 * @returns {module:sap/base/util/Properties|null|Promise<module:sap/base/util/Properties|null>}
	 *         The newly loaded properties (sync mode) or a Promise on the properties (async mode);
	 *         value / Promise fulfillment will be <code>null</code> when the properties for the
	 *         next fallback locale should not be loaded or when loading failed or when there
	 *         was no more fallback locale
	 * @private
	 */
	function tryToLoadNextProperties(oBundle, bAsync) {

		// get the next fallback locale
		var sLocale = oBundle._aFallbackLocales.shift();

		if ( sLocale != null) {

			var oUrl = oBundle.oUrlInfo,
				sUrl, mHeaders;

			if ( oUrl.ext === '.hdbtextbundle' ) {
				if ( M_SUPPORTABILITY_TO_XS[sLocale] ) {
					// Add technical support languages also as URL parameter (as XS engine can't handle private extensions in Accept-Language header)
					sUrl = oUrl.prefix + oUrl.suffix + '?' + (oUrl.query ? oUrl.query + "&" : "") + "sap-language=" + M_SUPPORTABILITY_TO_XS[sLocale] + (oUrl.hash ? "#" + oUrl.hash : "");
				} else {
					sUrl = oUrl.url;
				}
				// Alternative: add locale as query:
				// url: oUrl.prefix + oUrl.suffix + '?' + (oUrl.query ? oUrl.query + "&" : "") + "locale=" + sLocale + (oUrl.hash ? "#" + oUrl.hash : ""),
				mHeaders = {
					"Accept-Language": convertLocaleToBCP47(sLocale) || "*"
				};
			} else {
				sUrl = oUrl.prefix + (sLocale ? "_" + sLocale : "") + oUrl.suffix;
			}

			// headers might contain "accept-language" tag which can lead to a different properties
			// request, therefore it needs to be integrated into the cache key
			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
			var sCacheKey = JSON.stringify({url: new URL(sUrl, document.baseURI).href, headers: mHeaders});

			var oOptions = {
				url: sUrl,
				headers: mHeaders,
				async: !!bAsync,
				returnNullIfMissing: true
			};

			const vProperties = oPropertiesCache.get(sCacheKey, oOptions, oOptions.async);

			var addProperties = function(oProps) {
				if ( oProps ) {
					oBundle.aPropertyFiles.push(oProps);
					oBundle.aPropertyOrigins.push(sUrl);
					oBundle.aLocales.push(sLocale);
				}
				return oProps;
			};

			return bAsync ? vProperties.then( addProperties ) : addProperties( vProperties );

		}

		return bAsync ? Promise.resolve(null) : null;
	}

	/**
	 * Gets the URL either from the given resource bundle name or the given resource bundle URL.
	 *
	 * @param {string} [bundleUrl]
	 *   URL pointing to the base ".properties" file of a bundle (".properties" file without any
	 *   locale information, e.g. "../../i18n/mybundle.properties"); relative URLs are evaluated
	 *   relative to the document.baseURI
	 * @param {string} [bundleName]
	 *   UI5 module name in dot notation referring to the base ".properties" file; this name is
	 *   resolved to a path like the paths of normal UI5 modules and ".properties" is then
	 *   appended (e.g. a name like "myapp.i18n.myBundle" can be given); relative module names are
	 *   not supported
	 * @returns {string}
	 *   The resource bundle URL
	 *
	 * @private
	 * @ui5-restricted sap.ui.model.resource.ResourceModel
	 */
	ResourceBundle._getUrl = function(bundleUrl, bundleName) {
		var sUrl = bundleUrl;
		if (bundleName) {
			bundleName = bundleName.replace(/\./g, "/");
			sUrl = sap.ui.require.toUrl(bundleName) + ".properties";
		}
		return sUrl;
	};

	/**
	 * @returns {module:sap/base/i18n/ResourceBundle[]} The list of ResourceBundles created from enhanceWith
	 */
	function getEnhanceWithResourceBundles(aActiveTerminologies, aEnhanceWith, sLocale, bIncludeInfo, bAsync, sFallbackLocale, aSupportedLocales) {
		if (!aEnhanceWith) {
			return [];
		}
		var aCustomBundles = [];
		aEnhanceWith.forEach(function (oEnhanceWith) {

			// inherit fallbackLocale and supportedLocales if not defined
			if (oEnhanceWith.fallbackLocale === undefined) {
				oEnhanceWith.fallbackLocale = sFallbackLocale;
			}
			if (oEnhanceWith.supportedLocales === undefined) {
				oEnhanceWith.supportedLocales = aSupportedLocales;
			}
			var sUrl = ResourceBundle._getUrl(oEnhanceWith.bundleUrl, oEnhanceWith.bundleName);

			var vResourceBundle = new ResourceBundle(sUrl, sLocale, bIncludeInfo, bAsync, oEnhanceWith.supportedLocales, oEnhanceWith.fallbackLocale);

			aCustomBundles.push(vResourceBundle);

			if (oEnhanceWith.terminologies) {
				aCustomBundles = aCustomBundles.concat(getTerminologyResourceBundles(aActiveTerminologies, oEnhanceWith.terminologies, sLocale, bIncludeInfo, bAsync));
			}
		});

		return aCustomBundles;
	}

	/**
	 * @returns {module:sap/base/i18n/ResourceBundle[]} The list of ResourceBundles created from terminologies
	 */
	function getTerminologyResourceBundles(aActiveTerminologies, oTerminologies, sLocale, bIncludeInfo, bAsync) {
		if (!aActiveTerminologies) {
			return [];
		}
		// only take activeTerminologies which are present
		// creates a copy of the given array (is reversed later on)
		aActiveTerminologies = aActiveTerminologies.filter(function (sActiveTechnology) {
			return oTerminologies.hasOwnProperty(sActiveTechnology);
		});
		// reverse
		// the terminology resource bundles are enhancements of the current bundle
		// the lookup order for enhancements starts with the last enhancement
		// therefore to ensure that the first element in the activeTerminologies array is looked up first
		// this array needs to be reversed.

		// Note: Array#reverse modifies the original array
		aActiveTerminologies.reverse();

		return aActiveTerminologies.map(function (sActiveTechnology) {
			var mParamsTerminology = oTerminologies[sActiveTechnology];

			var sUrl = ResourceBundle._getUrl(mParamsTerminology.bundleUrl, mParamsTerminology.bundleName);

			var aSupportedLocales = mParamsTerminology.supportedLocales;

			return new ResourceBundle(sUrl, sLocale, bIncludeInfo, bAsync, aSupportedLocales, null, true);
		});
	}

	/**
	 * ResourceBundle Configuration
	 *
	 * A ResourceBundle Configuration holds information on where to load the ResourceBundle from
	 * using the fallback chain and terminologies.
	 * The location is retrieved from the <code>bundleUrl</code> and <code>bundleName</code> parameters
	 * The locale used is influenced by the <code>supportedLocales</code> and <code>fallbackLocale</code> parameters
	 * Terminologies of this ResourceBundle are loaded via the <code>terminologies</code> parameter
	 *
	 * Note: If omitted, the supportedLocales and the fallbackLocale are inherited from the parent ResourceBundle Configuration
	 *
	 * @typedef {object} module:sap/base/i18n/ResourceBundle.Configuration
	 * @property {string} [bundleUrl] URL pointing to the base .properties file of a bundle (.properties file without any locale information, e.g. "i18n/mybundle.properties")
	 * @property {string} [bundleName] UI5 module name in dot notation pointing to the base .properties file of a bundle (.properties file without any locale information, e.g. "i18n.mybundle")
	 * @property {string[]} [supportedLocales] List of supported locales (aka 'language tags') to restrict the fallback chain.
	 *     Each entry in the array can either be a BCP47 language tag or a JDK compatible locale string
	 *     (e.g. "en-GB", "en_GB" or "en"). An empty string (<code>""</code>) represents the 'raw' bundle.
	 *     <b>Note:</b> The given language tags can use modern or legacy ISO639 language codes. Whatever
	 *     language code is used in the list of supported locales will also be used when requesting a file
	 *     from the server. If the <code>locale</code> contains a legacy language code like "iw" and the
	 *     <code>supportedLocales</code> contains [...,"he",...], "he" will be used in the URL.
	 *     This mapping works in both directions.
	 * @property {string} [fallbackLocale="en"] A fallback locale to be used after all locales
	 *     derived from <code>locale</code> have been tried, but before the 'raw' bundle is used.
	 * 	   Can either be a BCP47 language tag or a JDK compatible locale string (e.g. "en-GB", "en_GB"
	 *     or "en"), defaults to "en" (English).
	 *     To prevent a generic fallback, use the empty string (<code>""</code>).
	 *     E.g. by providing <code>fallbackLocale: ""</code> and <code>supportedLocales: ["en"]</code>,
	 *     only the bundle "en" is requested without any fallback.
	 * @property {Object<string,module:sap/base/i18n/ResourceBundle.TerminologyConfiguration>} [terminologies]
	 *     An object, mapping a terminology identifier (e.g. "oil") to a <code>ResourceBundle.TerminologyConfiguration</code>.
	 *     A terminology is a resource bundle configuration for a specific use case (e.g. "oil").
	 *     It does neither have a <code>fallbackLocale</code> nor can it be enhanced with <code>enhanceWith</code>.
	 * @public
	 */

	/**
	 * ResourceBundle Terminology Configuration
	 *
	 * Terminologies represent a variant of a ResourceBundle.
	 * They can be used to provide domain specific texts, e.g. for industries, e.g. "oil", "retail" or "health".
	 * While "oil" could refer to a user as "driller", in "retail" a user could be a "customer" and in "health" a "patient".
	 * While "oil" could refer to a duration as "hitch", in "retail" a duration could be a "season" and in "health" an "incubation period".
	 *
	 * Note: Terminologies do neither support a fallbackLocale nor nested terminologies in their configuration.
	 *
	 * @typedef {object} module:sap/base/i18n/ResourceBundle.TerminologyConfiguration
	 * @property {string} [bundleUrl] URL pointing to the base .properties file of a bundle (.properties file without any locale information, e.g. "i18n/mybundle.properties")
	 * @property {string} [bundleName] UI5 module name in dot notation pointing to the base .properties file of a bundle (.properties file without any locale information, e.g. "i18n.mybundle")
	 * @property {string[]} [supportedLocales] List of supported locales (aka 'language tags') to restrict the fallback chain.
	 *     Each entry in the array can either be a BCP47 language tag or a JDK compatible locale string
	 *     (e.g. "en-GB", "en_GB" or "en"). An empty string (<code>""</code>) represents the 'raw' bundle.
	 *     <b>Note:</b> The given language tags can use modern or legacy ISO639 language codes. Whatever
	 *     language code is used in the list of supported locales will also be used when requesting a file
	 *     from the server. If the <code>locale</code> contains a legacy language code like "iw" and the
	 *     <code>supportedLocales</code> contains [...,"he",...], "he" will be used in the URL.
	 *     This mapping works in both directions.
	 * @public
	 */

	/**
	 * Creates and returns a new instance of {@link module:sap/base/i18n/ResourceBundle}
	 * using the given URL and locale to determine what to load.
	 *
	 * Before loading the ResourceBundle, the locale is evaluated with a fallback chain.
	 * Sample fallback chain for locale="de-DE" and fallbackLocale="fr_FR"
	 * <code>"de-DE" -> "de" -> "fr_FR" -> "fr" -> raw</code>
	 *
	 * Only those locales are considered for loading, which are in the supportedLocales array
	 * (if the array is supplied and not empty).
	 *
	 * Note: The fallbackLocale should be included in the supportedLocales array.
	 *
	 *
	 * @example <caption>Load a resource bundle</caption>
	 *
	 * sap.ui.require(["sap/base/i18n/ResourceBundle"], function(ResourceBundle){
	 *  // ...
	 *  ResourceBundle.create({
	 *      // specify url of the base .properties file
	 *      url : "i18n/messagebundle.properties",
	 *      async : true
	 *  }).then(function(oResourceBundle){
	 *      // now you can access the bundle
	 *  });
	 *  // ...
	 * });
	 *
	 * @example <caption>Load a resource bundle with supported locales and fallback locale</caption>
	 *
	 * sap.ui.require(["sap/base/i18n/ResourceBundle"], function(ResourceBundle){
	 *  // ...
	 *  ResourceBundle.create({
	 *      // specify url of the base .properties file
	 *      url : "i18n/messagebundle.properties",
	 *      async : true,
	 *      supportedLocales: ["de", "da"],
	 *      fallbackLocale: "de"
	 *  }).then(function(oResourceBundle){
	 *      // now you can access the bundle
	 *  });
	 *  // ...
	 * });
	 *
	 * @example <caption>Load a resource bundle with terminologies 'oil' and 'retail'</caption>
	 *
	 * sap.ui.require(["sap/base/i18n/ResourceBundle"], function(ResourceBundle){
	 *  // ...
	 *  ResourceBundle.create({
	 *      // specify url of the base .properties file
	 *      url : "i18n/messagebundle.properties",
	 *      async : true,
	 *      supportedLocales: ["de", "da"],
	 *      fallbackLocale: "de",
	 *      terminologies: {
	 *          oil: {
	 *              bundleUrl: "i18n/terminologies.oil.i18n.properties",
	 *                 supportedLocales: [
	 *                     "da", "en", "de"
	 *                 ]
	 *          },
	 *          retail: {
	 *             bundleUrl: "i18n/terminologies.retail.i18n.properties",
	 *             supportedLocales: [
	 *                 "da", "de"
	 *             ]
	 *         }
	 *      },
	 *      activeTerminologies: ["retail", "oil"]
	 *  }).then(function(oResourceBundle){
	 *      // now you can access the bundle
	 *  });
	 *  // ...
	 * });
	 *
	 * @example <caption>Load a resource bundle with enhancements</caption>
	 *
	 * sap.ui.require(["sap/base/i18n/ResourceBundle"], function(ResourceBundle){
	 *  // ...
	 *  ResourceBundle.create({
	 *      // specify url of the base .properties file
	 *      url : "i18n/messagebundle.properties",
	 *      async : true,
	 *      supportedLocales: ["de", "da"],
	 *      fallbackLocale: "de",
	 *      enhanceWith: [
	 *          {
	 *              bundleUrl: "appvar1/i18n/i18n.properties",
	 *              supportedLocales: ["da", "en", "de"]
	 *           },
	 *           {
	 *              bundleUrl: "appvar2/i18n/i18n.properties",
	 *              supportedLocales: ["da", "de"]
	 *           }
	 *      ]
	 *  }).then(function(oResourceBundle){
	 *      // now you can access the bundle
	 *  });
	 *  // ...
	 * });
	 *
	 * @public
	 * @function
	 * @param {object} [mParams] Parameters used to initialize the resource bundle
	 * @param {string} [mParams.url=''] URL pointing to the base .properties file of a bundle (.properties
	 *     file without any locale information, e.g. "mybundle.properties")
	 *     if not provided, <code>bundleUrl</code> or <code>bundleName</code> can be used; if both are set,
	 *     <code>bundleName</code> wins
	 * @param {string} [mParams.bundleUrl] URL pointing to the base .properties file of a bundle
	 *     (.properties file without any locale information, e.g. "i18n/mybundle.properties")
	 * @param {string} [mParams.bundleName] UI5 module name in dot notation pointing to the base
	 *     .properties file of a bundle (.properties file without any locale information, e.g. "i18n.mybundle")
	 * @param {string} [mParams.locale] Optional locale (aka 'language tag') to load the texts for.
	 *     Can either be a BCP47 language tag or a JDK compatible locale string (e.g. "en-GB", "en_GB" or "en").
	 *     Defaults to the current session locale if <code>sap.ui.getCore</code> is available, otherwise
	 *     to the provided <code>fallbackLocale</code>
	 * @param {boolean} [mParams.includeInfo=false] Whether to include origin information into the returned property values
	 * @param {string[]} [mParams.supportedLocales] List of supported locales (aka 'language tags') to restrict the fallback chain.
	 *     Each entry in the array can either be a BCP47 language tag or a JDK compatible locale string
	 *     (e.g. "en-GB", "en_GB" or "en"). An empty string (<code>""</code>) represents the 'raw' bundle.
	 *     <b>Note:</b> The given language tags can use modern or legacy ISO639 language codes. Whatever
	 *     language code is used in the list of supported locales will also be used when requesting a file
	 *     from the server. If the <code>locale</code> contains a legacy language code like "iw" and the
	 *     <code>supportedLocales</code> contains [...,"he",...], "he" will be used in the URL.
	 *     This mapping works in both directions.
	 * @param {string} [mParams.fallbackLocale="en"] A fallback locale to be used after all locales
	 *     derived from <code>locale</code> have been tried, but before the 'raw' bundle is used.
	 * 	   Can either be a BCP47 language tag or a JDK compatible locale string (e.g. "en-GB", "en_GB"
	 *     or "en").
	 *     To prevent a generic fallback, use the empty string (<code>""</code>).
	 *     E.g. by providing <code>fallbackLocale: ""</code> and <code>supportedLocales: ["en"]</code>,
	 *     only the bundle "en" is requested without any fallback.
	 * @param {Object<string,module:sap/base/i18n/ResourceBundle.TerminologyConfiguration>} [mParams.terminologies] map of terminologies.
	 *     The key is the terminology identifier and the value is a ResourceBundle terminology configuration.
	 *     A terminology is a resource bundle configuration for a specific use case (e.g. "oil").
	 *     It does neither have a <code>fallbackLocale</code> nor can it be enhanced with <code>enhanceWith</code>.
	 * @param {string[]} [mParams.activeTerminologies] The list of active terminologies,
	 *     e.g. <code>["oil", "retail"]</code>. The order in this array represents the lookup order.
	 * @param {module:sap/base/i18n/ResourceBundle.Configuration[]} [mParams.enhanceWith] List of ResourceBundle configurations which enhance the current one.
	 *     The order of the enhancements is significant, because the lookup checks the last enhancement first.
	 *     Each enhancement represents a ResourceBundle with limited options ('bundleUrl', 'bundleName', 'terminologies', 'fallbackLocale', 'supportedLocales').
	 *     Note: supportedLocales and fallbackLocale are inherited from the parent ResourceBundle if not present.
	 * @param {boolean} [mParams.async=false] Whether the first bundle should be loaded asynchronously
	 *     Note: Fallback bundles loaded by {@link #getText} are always loaded synchronously.
	 * @returns {module:sap/base/i18n/ResourceBundle|Promise<module:sap/base/i18n/ResourceBundle>}
	 *     A new resource bundle or a Promise on that bundle (in asynchronous case)
	 * @SecSink {0|PATH} Parameter is used for future HTTP requests
	 */
	ResourceBundle.create = function(mParams) {
		var mOriginalCreateParams = merge({}, mParams);

		mParams = merge({url: "", includeInfo: false}, mParams);

		// bundleUrl and bundleName parameters get converted into the url parameter if the url parameter is not present
		if (mParams.bundleUrl || mParams.bundleName) {
			mParams.url = mParams.url || ResourceBundle._getUrl(mParams.bundleUrl, mParams.bundleName);
		}

		// Hook implemented by sap/ui/core/Lib.js; adds missing terminology information from the library manifest, if available
		mParams = ResourceBundle._enrichBundleConfig(mParams);

		// Note: ResourceBundle constructor returns a Promise in async mode!
		var vResourceBundle = new ResourceBundle(mParams.url, mParams.locale, mParams.includeInfo, !!mParams.async, mParams.supportedLocales, mParams.fallbackLocale);

		// Pass the exact create factory parameters to allow the bundle to create a new instance via ResourceBundle#_recreate
		if (vResourceBundle instanceof Promise) {
			vResourceBundle = vResourceBundle.then(function(oResourceBundle) {
				oResourceBundle._mCreateFactoryParams = mOriginalCreateParams;
				return oResourceBundle;
			});
		} else {
			vResourceBundle._mCreateFactoryParams = mOriginalCreateParams;
		}

		// aCustomBundles is a flat list of all "enhancements"
		var aCustomBundles = [];
		// handle terminologies
		if (mParams.terminologies) {
			aCustomBundles = aCustomBundles.concat(getTerminologyResourceBundles(mParams.activeTerminologies, mParams.terminologies, mParams.locale, mParams.includeInfo, !!mParams.async));
		}
		// handle enhanceWith
		if (mParams.enhanceWith) {
			aCustomBundles = aCustomBundles.concat(getEnhanceWithResourceBundles(mParams.activeTerminologies, mParams.enhanceWith, mParams.locale, mParams.includeInfo, !!mParams.async, mParams.fallbackLocale, mParams.supportedLocales));
		}
		if (aCustomBundles.length) {
			if (vResourceBundle instanceof Promise) {
				vResourceBundle = vResourceBundle.then(function (oResourceBundle) {
					// load all resource bundles in parallel for a better performance
					// but do the enhancement one after the other to establish a stable lookup order
					return Promise.all(aCustomBundles).then(function (aCustomBundles) {
						aCustomBundles.forEach(oResourceBundle._enhance, oResourceBundle);
					}).then(function () {
						return oResourceBundle;
					});
				});
			} else {
				aCustomBundles.forEach(vResourceBundle._enhance, vResourceBundle);
			}
		}
		return vResourceBundle;
	};

	/**
	 * Hook implemented by sap/ui/core/Lib to enrich bundle config with terminologies.
	 * See also the documentation of the hook's implementation in sap/ui/core/Lib.js.
	 *
	 * @see sap.ui.core.Lib.getResourceBundleFor
	 *
	 * @param {object} mParams the ResourceBundle.create bundle config
	 * @returns {object} the enriched bundle config
	 * @private
	 * @ui5-restricted sap.ui.core.Lib
	 */
	ResourceBundle._enrichBundleConfig = function(mParams) {
		// Note: the ResourceBundle is a base module, which might be used standalone without the Core,
		// so the bundle config must remain untouched
		return mParams;
	};

	// ---- handling of supported locales and fallback chain ------------------------------------------

	/**
	 * Check if the given locale is contained in the given list of supported locales.
	 *
	 * If no list is given or if it is empty, any locale is assumed to be supported and
	 * the given locale is returned without modification.
	 *
	 * When the list contains the given locale, the locale is also returned without modification.
	 *
	 * If an alternative code for the language code part of the locale exists (e.g a modern code
	 * if the language is a legacy code, or a legacy code if the language is a modern code), then
	 * the language code is replaced by the alternative code. If the resulting alternative locale
	 * is contained in the list, the alternative locale is returned.
	 *
	 * If there is no match, <code>undefined</code> is returned.
	 * @param {string} sLocale Locale, using legacy ISO639 language code, e.g. iw_IL
	 * @param {string[]} aSupportedLocales List of supported locales, e.g. ["he_IL"]
	 * @returns {string} The match in the supportedLocales (using either modern or legacy ISO639 language codes),
	 *   e.g. "he_IL"; <code>undefined</code> if not matched
	 */
	function findSupportedLocale(sLocale, aSupportedLocales) {

		// if supportedLocales array is empty or undefined or if it contains the given locale,
		// return that locale (with a legacy ISO639 language code)
		if (!aSupportedLocales || aSupportedLocales.length === 0 || aSupportedLocales.includes(sLocale)) {
			return sLocale;
		}

		// determine an alternative locale, using a modern ISO639 language code
		// (converts "iw_IL" to "he-IL")
		sLocale = convertLocaleToBCP47(sLocale, true);
		if (sLocale) {
			// normalize it to JDK syntax for easier comparison
			// (converts "he-IL" to "he_IL" - using an underscore ("_") between the segments)
			sLocale = normalize(sLocale, true);
		}
		if (aSupportedLocales.includes(sLocale)) {
			// return the alternative locale (with a modern ISO639 language code)
			return sLocale;
		}
		return undefined;
	}

	/**
	 * Determines the sequence of fallback locales, starting from the given locale.
	 *
	 * The fallback chain starts with the given <code>sLocale</code> itself. If this locale
	 * has multiple segments (region, variant), further entries are added to the fallback
	 * chain, each one omitting the last (rightmost) segment of its predecessor, making the
	 * new locale entry less specific than the previous one (e.g. "de" after "de_CH").
	 *
	 * If <code>sFallbackLocale</code> is given, it will be added to the fallback chain next.
	 * If it consists of multiple segments, multiple locales will be added, each less specific
	 * than the previous one. If <code>sFallbackLocale</code> is omitted or <code>undefined</code>,
	 * "en" (English) will be added instead. If <code>sFallbackLocale</code> is the empty string
	 * (""), no generic fallback will be added.
	 *
	 * Last but not least, the 'raw' locale will be added, represented by the empty string ("").
	 *
	 * The returned list will contain no duplicates and all entries will be in normalized JDK file suffix
	 * format (using an underscore ("_") as separator, a lowercase language and an uppercase region
	 * (if any)).
	 *
	 * If <code>aSupportedLocales</code> is provided and not empty, only locales contained
	 * in that array will be added to the result. This allows to limit the backend requests
	 * to a certain set of files (e.g. those that are known to exist).
	 *
	 * @param {string} sLocale Locale to start the fallback sequence with, must be normalized already
	 * @param {string[]} [aSupportedLocales] List of supported locales (either BCP47 or JDK legacy syntax, e.g. zh_CN, iw)
	 * @param {string} [sFallbackLocale="en"] Last fallback locale; is ignored when <code>bSkipFallbackLocaleAndRaw</code> is <code>true</code>
	 * @param {string} [sContextInfo] Describes the context in which this function is called, only used for logging
	 * @param {boolean} [bSkipFallbackLocaleAndRaw=false] Whether to skip fallbackLocale and raw bundle
	 * @returns {string[]} Sequence of fallback locales in JDK legacy syntax, decreasing priority
	 *
	 * @private
	 */
	function calculateFallbackChain(sLocale, aSupportedLocales, sFallbackLocale, sContextInfo, bSkipFallbackLocaleAndRaw) {
		// Defines which locales are supported (BCP47 language tags or JDK locale format using underscores).
		// Normalization of the case and of the separator char simplifies later comparison, but the language
		// part is not converted to a legacy ISO639 code, in order to enable the support of modern codes as well.
		aSupportedLocales = aSupportedLocales && aSupportedLocales.map(function (sSupportedLocale) {
			return normalizePreserveEmpty(sSupportedLocale, true);
		});
		if (!bSkipFallbackLocaleAndRaw) {
			// normalize the fallback locale for sanitizing it and converting the language part to legacy ISO639
			// because it is like the locale part of the fallback chain
			var bFallbackLocaleDefined = sFallbackLocale !== undefined;
			sFallbackLocale = bFallbackLocaleDefined ? sFallbackLocale : sDefaultFallbackLocale;
			sFallbackLocale = normalizePreserveEmpty(sFallbackLocale);

			// An empty fallback locale ("") is valid and means that a generic fallback should not be loaded.
			// The supportedLocales must contain the fallbackLocale, or else it will be ignored.
			if (sFallbackLocale !== "" && !findSupportedLocale(sFallbackLocale, aSupportedLocales)) {
				var sMessage = "The fallback locale '" + sFallbackLocale + "' is not contained in the list of supported locales ['"
					+ aSupportedLocales.join("', '") + "']" + sContextInfo + " and will be ignored.";
				// configuration error should be thrown if an invalid configuration has been provided
				if (bFallbackLocaleDefined) {
					throw new Error(sMessage);
				}
				Log.error(sMessage);
			}
		}

		// Calculate the list of fallback locales, starting with the given locale.
		//
		// Note: always keep this in sync with the fallback mechanism in Java, ABAP (MIME & BSP)
		// resource handler (Java: Peter M., MIME: Sebastian A., BSP: Silke A.)


		// fallback logic:
		// locale with region -> locale language -> fallback with region -> fallback language -> raw
		// note: if no region is present, it is skipped

		// Sample fallback chains:
		//  "de_CH" -> "de" -> "en_US" -> "en" -> ""  // locale 'de_CH', fallbackLocale 'en_US'
		//  "de_CH" -> "de" -> "de_DE" -> "de" -> ""  // locale 'de_CH', fallbackLocale 'de_DE'
		//  "en_GB" -> "en"                    -> ""  // locale 'en_GB', fallbackLocale 'en'

		// note: the resulting list does neither contain any duplicates nor unsupported locales

		// fallback calculation
		var aLocales = [],
			sSupportedLocale;

		while ( sLocale != null ) {

			// check whether sLocale is supported, potentially using an alternative language code
			sSupportedLocale = findSupportedLocale(sLocale, aSupportedLocales);

			// only push if it is supported and is not already contained (avoid duplicates)
			if ( sSupportedLocale !== undefined && aLocales.indexOf(sSupportedLocale) === -1) {
				aLocales.push(sSupportedLocale);
			}

			// calculate next one
			if (!sLocale) {
				// there is no fallback for the 'raw' locale or for null/undefined
				sLocale = null;
			} else if (sLocale === "zh_HK") {
				// special (legacy) handling for zh_HK:
				// try zh_TW (for "Traditional Chinese") first before falling back to 'zh'
				sLocale = "zh_TW";
			} else if (sLocale.lastIndexOf('_') >= 0) {
				// if sLocale contains more than one segment (region, variant), remove the last one
				sLocale = sLocale.slice(0, sLocale.lastIndexOf('_'));
			} else if (bSkipFallbackLocaleAndRaw) {
				// skip fallbackLocale and raw bundle
				sLocale = null;
			} else if (sFallbackLocale) {
				// if there's a fallbackLocale, add it first before the 'raw' locale
				sLocale = sFallbackLocale;
				sFallbackLocale = null; // no more fallback in the next round
			} else {
				// last fallback to raw bundle
				sLocale = "";
			}
		}

		return aLocales;
	}

	/**
	 * Determine sequence of fallback locales, starting from the given locale and
	 * optionally taking the list of supported locales into account.
	 *
	 * Callers can use the result to limit requests to a set of existing locales.
	 *
	 * @param {string} sLocale Locale to start the fallback sequence with, should be a BCP47 language tag
	 * @param {string[]} [aSupportedLocales] List of supported locales (in JDK legacy syntax, e.g. zh_CN, iw)
	 * @param {string} [sFallbackLocale] Last fallback locale, defaults to "en"
	 * @returns {string[]} Sequence of fallback locales in JDK legacy syntax, decreasing priority
	 *
	 * @private
	 * @ui5-restricted sap.fiori, sap.support launchpad
	 */
	ResourceBundle._getFallbackLocales = function(sLocale, aSupportedLocales, sFallbackLocale) {
		return calculateFallbackChain(
			normalize(sLocale),
			aSupportedLocales,
			sFallbackLocale,
			/* no context info */ ""
		);
	};

	/**
	 * Gets the properties cache
	 *
	 * @returns {Map} The properties cache
	 * @private
	 */
	ResourceBundle._getPropertiesCache = function () {
		return oPropertiesCache._oCache;
	};

	return ResourceBundle;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides type module:sap/base/i18n/date/CalendarWeekNumbering.
sap.ui.predefine("sap/base/i18n/date/CalendarWeekNumbering", [], function() {
	"use strict";

	/**
	 * The <code>CalendarWeekNumbering</code> enum defines how to calculate calendar weeks. Each
	 * value defines:
	 * <ul>
	 * <li>The first day of the week,</li>
	 * <li>the first week of the year.</li>
	 * </ul>
	 *
	 * @enum {string}
	 * @public
	 * @alias module:sap/base/i18n/date/CalendarWeekNumbering
	 * @since 1.120
	 */
	var CalendarWeekNumbering = {

		/**
		 * The default calendar week numbering:
		 *
		 * The framework determines the week numbering scheme; currently it is derived from the
		 * active format locale. Future versions of UI5 might select a different week numbering
		 * scheme.
		 *
		 * @public
		 */
		Default : "Default",

		/**
		 * Official calendar week numbering in most of Europe (ISO 8601 standard):
		 * <ul>
		 * <li>Monday is first day of the week,
		 * <li>the week containing January 4th is first week of the year.
		 * </ul>
		 *
		 * @public
		 */
		ISO_8601 : "ISO_8601",

		/**
		 * Official calendar week numbering in much of the Middle East (Middle Eastern calendar):
		 * <ul>
		 * <li>Saturday is first day of the week,
		 * <li>the week containing January 1st is first week of the year.
		 * </ul>
		 *
		 * @public
		 */
		MiddleEastern : "MiddleEastern",

		/**
		 * Official calendar week numbering in the United States, Canada, Brazil, Israel, Japan, and
		 * other countries (Western traditional calendar):
		 * <ul>
		 * <li>Sunday is first day of the week,
		 * <li>the week containing January 1st is first week of the year.
		 * </ul>
		 *
		 * @public
		 */
		WesternTraditional : "WesternTraditional"
	};

	/**
	 * Returns an object containing the week configuration values for the given calendar week
	 * numbering algorithm.
	 *
	 * @param {module:sap/base/i18n/date/CalendarWeekNumbering} [sCalendarWeekNumbering=Default]
	 *   The calendar week numbering algorithm
	 * @returns {{firstDayOfWeek: 0|1|2|3|4|5|6, minimalDaysInFirstWeek: 1|2|3|4|5|6|7}|undefined}
	 *   The week configuration values or <code>undefined</code> if the given calendar week
	 *   numbering algorithm is "Default"
	 *
	 * @function
	 * @name module:sap/base/i18n/date/CalendarWeekNumbering.getWeekConfigurationValues
	 * @private
	 */
	Object.defineProperty(CalendarWeekNumbering, "getWeekConfigurationValues", {
		// configurable : false,
		// enumerable : false,
		value : function (sCalendarWeekNumbering) {
			switch (sCalendarWeekNumbering) {
				case CalendarWeekNumbering.ISO_8601 :
					return {firstDayOfWeek : 1, minimalDaysInFirstWeek : 4};
				case CalendarWeekNumbering.MiddleEastern :
					return {firstDayOfWeek : 6, minimalDaysInFirstWeek : 1};
				case CalendarWeekNumbering.WesternTraditional :
					return {firstDayOfWeek : 0, minimalDaysInFirstWeek : 1};
				default:
					return undefined;
			}
		}
		// writable : false
	});

	return CalendarWeekNumbering;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/strings/formatMessage", ["sap/base/assert"], function(assert) {
	"use strict";

	/**
	 * Pattern to analyze MessageFormat strings.
	 *
	 * Group 1: captures doubled single quotes within the string
	 * Group 2: captures quoted fragments within the string.
	 *            Note that java.util.MessageFormat silently forgives a missing single quote at
	 *            the end of a pattern. This special case is handled by the RegEx as well.
	 * Group 3: captures placeholders
	 *            Checks only for numerical argument index, any remainder is ignored up to the next
	 *            closing curly brace. Nested placeholders are not accepted!
	 * Group 4: captures any remaining curly braces and indicates syntax errors
	 *
	 *                    [-1] [----- quoted string -----] [------ placeholder ------] [--]
	 * @private
	 */
	var rMessageFormat = /('')|'([^']+(?:''[^']*)*)(?:'|$)|\{([0-9]+(?:\s*,[^{}]*)?)\}|[{}]/g;

	/**
	 * Creates a string from a pattern by replacing placeholders with concrete values.
	 *
	 * The syntax of the pattern is inspired by (but not fully equivalent to) the
	 * java.util.MessageFormat.
	 *
	 * Placeholders have the form <code>{ integer }</code>, where any occurrence of
	 * <code>{0}</code> is replaced by the value with index 0 in <code>aValues</code>,
	 * <code>{1}</code> by the value with index 1 in <code>aValues</code> etc.
	 *
	 * To avoid interpretation of curly braces as placeholders, any non-placeholder fragment
	 * of the pattern can be enclosed in single quotes. The surrounding single quotes will be
	 * omitted from the result. Single quotes that are not meant to escape a fragment and
	 * that should appear in the result, need to be doubled. In the result, only a single
	 * single quote will occur.
	 *
	 * Example: Pattern Strings
	 * <pre>
	 *  formatMessage("Say {0}",     ["Hello"]) -> "Say Hello"    // normal use case
	 *  formatMessage("Say '{0}'",   ["Hello"]) -> "Say {0}"      // escaped placeholder
	 *  formatMessage("Say ''{0}''", ["Hello"]) -> "Say 'Hello'"  // doubled single quote
	 *  formatMessage("Say '{0}'''", ["Hello"]) -> "Say {0}'"     // doubled single quote in quoted fragment
	 * </pre>
	 * In contrast to java.util.MessageFormat, format types or format styles are not supported.
	 * Everything after the argument index and up to the first closing curly brace is ignored.
	 * Nested placeholders (as supported by java.lang.MessageFormat for the format type choice)
	 * are not ignored but reported as a parse error.
	 *
	 * This method throws an Error when the pattern syntax is not fulfilled (e.g. unbalanced curly
	 * braces, nested placeholders or a non-numerical argument index).
	 *
	 * This method can also be used as a formatter within a binding. The first part of a composite binding
	 * will be used as pattern, the following parts as aValues. If there is only one value and this
	 * value is an array it will be handled like the default described above.
	 *
	 * @function
	 * @since 1.58
	 * @alias module:sap/base/strings/formatMessage
	 * @param {string} sPattern A pattern string in the described syntax
	 * @param {any[]} [aValues=[]] The values to be used instead of the placeholders.
	 * @returns {string} The formatted result string
	 * @SecPassthrough {*|return}
	 * @public
	 */
	var fnFormatMessage = function(sPattern, aValues) {
		assert(typeof sPattern === "string" || sPattern instanceof String, "pattern must be string");
		if (arguments.length > 2 || (aValues != null && !Array.isArray(aValues))) {
			aValues = Array.prototype.slice.call(arguments, 1);
		}
		aValues = aValues || [];
		return sPattern.replace(rMessageFormat, function($0, $1, $2, $3, offset) {
			if ($1) {
				// a doubled single quote in a normal string fragment
				//   --> emit a single quote
				return "'";
			} else if ($2) {
				// a quoted sequence of chars, potentially containing doubled single quotes again
				//   --> emit with doubled single quotes replaced by a single quote
				return $2.replace(/''/g, "'");
			} else if ($3) {
				// a welformed curly brace
				//   --> emit the argument but ignore other parameters
				return String(aValues[parseInt($3)]);
			}
			// e.g. malformed curly braces
			//   --> throw Error
			throw new Error("formatMessage: pattern syntax error at pos. " + offset);
		});
	};
	return fnFormatMessage;

});


/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/ObjectPath", [], function() {
	"use strict";

	/**
	 * Manages an object path.
	 *
	 * The object path can be just created with {@link #.create}, then an empty nested object path will be created from
	 * the provided string. If a value is set for an object path {@link #.set} it is also created if it not already
	 * exists. Values can be retrieved from the objectpath with {@link #get}.
	 *
	 * @namespace
	 * @since 1.58
	 * @alias module:sap/base/util/ObjectPath
	 * @public
	 */
	var ObjectPath = {};

	/**
	 * The default root context for the object path.
	 *
	 * @type {object}
	 * @private
	 */
	var defaultRootContext = window;

	/**
	 * If the provided object path is a string, it will be split and returned as an array.
	 *
	 * @private
	 * @param {string|string[]} vObjectPath Path as string where each name is separated by '.'. Can also be an array of names.
	 * @returns {string[]} The path as an array
	 */
	function getObjectPathArray(vObjectPath) {
		return Array.isArray(vObjectPath) ? vObjectPath.slice() : vObjectPath.split(".");
	}

	/**
	 * Creates a object path from the provided path in the provided root context.
	 *
	 * The provided path is used to navigate through the nested objects, starting with the root context.
	 *
	 * @example
	 * var root = {};
	 * ObjectPath.create("my.test.module", root) === root.my.test.module;
	 * ObjectPath.set(["my", "test", "otherModule"], root) === root.my.test.otherModule;
	 *
	 * @public
	 * @static
	 * @param {string|string[]} vObjectPath Path as string where each name is separated by '.'. Can also be an array of names.
	 * @param {Object} [oRootContext=window] Root context where the path starts
	 * @returns {Object} The newly created context object, e.g. base.my.test.module
	 * @throws {Error} Will throw an error if a value already exists within the path and the object path cannot be set.
	 */
	ObjectPath.create = function(vObjectPath, oRootContext) {
		var oObject = oRootContext || defaultRootContext;
		var aNames = getObjectPathArray(vObjectPath);

		for (var i = 0; i < aNames.length; i++) {
			var sName = aNames[i];

			// we only accept nested objects and functions in the ObjectPath
			// Functions in the ObjectPath are typically constructor functions
			if (oObject[sName] === null
				|| (oObject[sName] !== undefined && (typeof oObject[sName] !== "object" && typeof oObject[sName] !== "function"))
			) {
				throw new Error("Could not set object-path for '" + aNames.join(".") + "', path segment '" + sName + "' already exists.");
			}

			oObject[sName] = oObject[sName] || {};
			oObject = oObject[sName];
		}

		return oObject;
	};

	/**
	 * Returns a value located in the provided path.
	 * If the provided path cannot be resolved completely, <code>undefined</code> is returned.
	 *
	 * The provided object path is used to navigate through the nested objects, starting with the root context.
	 * If no root context is provided, the object path begins with <code>window</code>.
	 *
	 * @public
	 * @static
	 * @param {string|string[]} vObjectPath Path as string where each name is separated by '.'. Can also be an array of names.
	 * @param {Object} [oRootContext=window] Root context where the path starts
	 * @returns {any|undefined} Returns the value located in the provided path, or <code>undefined</code> if the path does not exist completely.
	 * @example
	 * ObjectPath.get("my.test.module", root) === root.my.test.module
	 * ObjectPath.get(["my", "test", "otherModule"], root) === root.my.test.otherModule
	 * ObjectPath.get("globalVar") === window["globalVar"];
	 */
	ObjectPath.get = function(vObjectPath, oRootContext) {
		var oObject = oRootContext || defaultRootContext;
		var aNames = getObjectPathArray(vObjectPath);
		var sPropertyName = aNames.pop();

		for (var i = 0; i < aNames.length && oObject; i++) {
			oObject = oObject[aNames[i]];
		}

		return oObject ? oObject[sPropertyName] : undefined;
	};

	/**
	 * Sets a value located in the provided path.
	 *
	 * The provided path is used to navigate through the nested objects, starting with the root context.
	 *
	 * <b>Note:</b> Ensures that the object path exists.
	 *
	 * @public
	 * @static
	 * @param {string|string[]} vObjectPath vObjectPath Path as string where each name is separated by '.'. Can also be an array of names.
	 * @param {any} vValue The value to be set in the root context's object path
	 * @param {Object} [oRootContext=window] Root context where the path starts
	 * @throws {Error} Will throw an error if a value already exists within the object path and the path cannot be set.
	 * @example
	 * var root = {};
	 * ObjectPath.set("my.test.module", "propertyValue", root);
	 * ObjectPath.set(["my", "test", "otherModule"], "otherPropertyValue", root);
	 */
	ObjectPath.set = function(vObjectPath, vValue, oRootContext) {
		oRootContext = oRootContext || defaultRootContext;
		var aNames = getObjectPathArray(vObjectPath);
		var sPropertyName = aNames.pop();

		// ensure object exists
		var oObject = ObjectPath.create(aNames, oRootContext);
		oObject[sPropertyName] = vValue;
	};

	return ObjectPath;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides access to Java-like properties files
/*global chrome, v8 */
sap.ui.predefine("sap/base/util/Properties", ['sap/base/util/LoaderExtensions'], function(LoaderExtensions) {
	"use strict";

	/**
	 * @class Represents a collection of string properties (key/value pairs).
	 *
	 * Each key and its corresponding value in the collection is a string, keys are case-sensitive.
	 *
	 * Use {@link module:sap/base/util/Properties.create} to create an instance of {@link module:sap/base/util/Properties}.
	 *
	 * The {@link #getProperty} method can be used to retrieve a value from the collection,
	 * {@link #setProperty} to store or change a value for a key and {@link #getKeys}
	 * can be used to retrieve an array of all keys that are currently stored in the collection.
	 *
	 * @public
	 * @since 1.58
	 * @alias module:sap/base/util/Properties
	 * @hideconstructor
	 */
	var Properties = function() {
		this.mProperties = {};
		this.aKeys = null;
	};

	/**
	 * Returns the value for the given key or <code>null</code> if the collection has no value for the key.
	 *
	 * Optionally, a default value can be given which will be returned if the collection does not contain
	 * a value for the key; only non-empty default values are supported.
	 *
	 * @param {string} sKey Key to return the value for
	 * @param {string} [sDefaultValue=null] Optional, a default value that will be returned
	 *    if the requested key is not in the collection
	 * @returns {string|null} Value for the given key or the default value or <code>null</code>
	 *    if no default value or a falsy default value was given
	 * @public
	 */
	Properties.prototype.getProperty = function(sKey, sDefaultValue) {
		var sValue = this.mProperties[sKey];
		if (typeof (sValue) == "string") {
			return sValue;
		} else if (sDefaultValue) {
			return sDefaultValue;
		}
		return null;
	};

	/**
	 * Returns an array of all keys in the property collection.
	 *
	 * @function
	 * @returns {string[]} All keys in the property collection
	 * @public
	 */
	Properties.prototype.getKeys = function() {
		if (!this.aKeys) {
			this.aKeys = Object.keys(this.mProperties);
		}
		return this.aKeys;
	};

	/**
	 * Stores or changes the value for the given key in the collection.
	 *
	 * If the given value is not a string, the collection won't be modified.
	 * The key is always cast to a string.
	 *
	 * @param {string} sKey Key of the property
	 * @param {string} sValue String value for the key
	 * @public
	 */
	Properties.prototype.setProperty = function(sKey, sValue) {
		if (typeof (sValue) != "string") {
			return;
		}
		if (typeof (this.mProperties[sKey]) != "string" && this.aKeys ) {
			this.aKeys.push(String(sKey));
		}
		this.mProperties[sKey] = sValue;
	};

	/**
	 * Creates and returns a clone of the property collection.
	 *
	 * @returns {module:sap/base/util/Properties} A clone of the property collection
	 * @public
	 */
	Properties.prototype.clone = function() {
		var oClone = new Properties();
		oClone.mProperties = Object.assign({}, this.mProperties);
		return oClone;
	};

	// helper to create a memory-optimized version of the given string, depending on the number of concat operations (V8 only)
	var flatstr = (typeof chrome === "object" || typeof v8 === "object") ? function (s, iConcatOps) {
		if ( iConcatOps > 2 && 40 * iConcatOps > s.length ) {
			Number(s); // cast to number on V8 has the side effect of creating a flat version of concat strings
		}
		return s;
	} : function(s) { return s; };

	/**
	 * RegExp used to split file into lines, also removes leading whitespace.
	 * Note: group must be non-capturing, otherwise the line feeds will be part of the split result.
	 */
	var rLines = /(?:\r\n|\r|\n|^)[ \t\f]*/;

	/**
	 * Regular expressions to detect escape sequences (unicode or special) and continuation line markers
	 * in a single line of a properties file. The first expression also detects key/value separators and is used
	 * as long as no key has been found. The second one is used for the remainder of the line.
	 *
	 *                         [---unicode escape--] [esc] [cnt] [---key/value separator---]
	 */
	var rEscapesOrSeparator = /(\\u[0-9a-fA-F]{0,4})|(\\.)|(\\$)|([ \t\f]*[ \t\f:=][ \t\f]*)/g;
	var rEscapes            = /(\\u[0-9a-fA-F]{0,4})|(\\.)|(\\$)/g;

	/**
	 * Special escape characters as supported by properties format.
	 * @see JDK API doc for java.util.Properties
	 */
	var mEscapes = {
		'\\f' : '\f',
		'\\n' : '\n',
		'\\r' : '\r',
		'\\t' : '\t'
	};

	/*
	 * Parses the given text sText and sets the properties
	 * in the properties object oProp accordingly.
	 * @param {string} sText the text to parse
	 * @param oProp the properties object to fill
	 * @private
	 */
	function parse(sText, oProp) {

		var aLines = sText.split(rLines), // split file into lines
			sLine,rMatcher,sKey,sValue,i,m,iLastIndex,iConcatOps;

		function append(s) {
			if ( sValue ) {
				sValue = sValue + s;
				iConcatOps++;
			} else {
				sValue = s;
				iConcatOps = 0;
			}
		}

		oProp.mProperties = {};

		for (i = 0; i < aLines.length; i++) {
			sLine = aLines[i];
			// ignore empty lines
			if (sLine === "" || sLine.charAt(0) === "#" || sLine.charAt(0) === "!" ) {
				continue;
			}

			// start with the full regexp incl. key/value separator
			rMatcher = rEscapesOrSeparator;
			rMatcher.lastIndex = iLastIndex = 0;
			sKey = null;
			sValue = "";

			while ( (m = rMatcher.exec(sLine)) !== null ) {
				// handle any raw, unmatched input
				if ( iLastIndex < m.index ) {
					append(sLine.slice(iLastIndex, m.index));
				}
				iLastIndex = rMatcher.lastIndex;
				if ( m[1] ) {
					// unicode escape
					if ( m[1].length !== 6 ) {
						throw new Error("Incomplete Unicode Escape '" + m[1] + "'");
					}
					append(String.fromCharCode(parseInt(m[1].slice(2), 16)));
				} else if ( m[2] ) {
					// special or simple escape
					append(mEscapes[m[2]] || m[2].slice(1));
				} else if ( m[3] ) {
					// continuation line marker
					sLine = aLines[++i];
					rMatcher.lastIndex = iLastIndex = 0;
				} else if ( m[4] ) { // only occurs in full regexp
					// key/value separator detected
					// -> remember key and switch to simplified regexp
					sKey = sValue;
					sValue = "";
					rMatcher = rEscapes;
					rMatcher.lastIndex = iLastIndex;
				}
			}
			if ( iLastIndex < sLine.length ) {
				append(sLine.slice(iLastIndex));
			}
			if ( sKey == null ) {
				sKey = sValue;
				sValue = "";
			}

			oProp.mProperties[sKey] = flatstr(sValue, sValue ? iConcatOps : 0); // Note: empty sValue implies iConcatOps == 0

		}

	}

	/**
	 * Creates and returns a new instance of {@link module:sap/base/util/Properties}.
	 *
	 * If option 'url' is passed, immediately a load request for the given target is triggered.
	 * A property file that is loaded can contain comments with a leading ! or #.
	 * The loaded property list does not contain any comments.
	 *
	 * @example <caption>Loading a property file</caption>
	 * sap.ui.require(["sap/base/util/Properties"], function (Properties) {
	 *    var p = Properties.create({url : "../myProperty.properties"});
	 * });
	 *
	 * @example <caption>getting and setting properties</caption>
	 * sap.ui.require(["sap/base/util/Properties"], function (Properties) {
	 *   var oProperties = Properties.create();
	 *   oProperties.setProperty("KEY_1","Test Key");
	 *   var sValue1 = oProperties.getProperty("KEY_1");
	 *   var sValue2 = oProperties.getProperty("KEY_2","Default");
	 *  });
	 *
	 * @example <caption>Loading a property file asynchronously (returns a Promise)</caption>
	 * sap.ui.require(["sap/base/util/Properties"], function (Properties) {
	 *    Properties.create({url : "../myProperty.properties", async: true}).then(function(oProperties){
	 *        ...
	 *    });
	 * });
	 *
	 * @param {object} [mParams] Parameters used to initialize the property list
	 * @param {string} [mParams.url] The URL to the .properties file which should be loaded
	 * @param {boolean} [mParams.async=false] Whether the .properties file should be loaded asynchronously or not
	 * @param {Object<string,any>} [mParams.headers] A map of additional header key/value pairs to send along with
	 *    the request (see <code>headers</code> option of <code>jQuery.ajax</code>)
	 * @param {boolean} [mParams.returnNullIfMissing=false] Whether <code>null</code> should be returned
	 *    for a missing properties file; by default an empty collection is returned
	 * @return {module:sap/base/util/Properties|null|Promise<module:sap/base/util/Properties|null>} A new
	 *    property collection (synchronous case) or <code>null</code> if the file could not be loaded and
	 *    <code>returnNullIfMissing</code> was set; in case of asynchronous loading, always a Promise is
	 *    returned, which resolves with the property collection or with <code>null</code> if the file could not
	 *    be loaded and <code>returnNullIfMissing</code> was set to true
	 * @throws {Error} When the file has syntax issues (e.g. incomplete unicode escapes);
	 *    in async mode, the error is not thrown but the returned Promise will be rejected
	 * @SecSink {0|PATH} Parameter is used for future HTTP requests
	 * @public
	 */
	Properties.create = function (mParams) {
		mParams = Object.assign({url: undefined, headers: {}}, mParams);

		var bAsync = !!mParams.async,
			oProp = new Properties(),
			vResource;

		function _parse(sText){
			if ( typeof sText === "string" ) {
				parse(sText, oProp);
				return oProp;
			}
			return mParams.returnNullIfMissing ? null : oProp;
		}

		if ( typeof mParams.url === "string" ) {
			// @evo-todo: dependency on loadResource implementation in compat layer
			vResource = LoaderExtensions.loadResource({
				url: mParams.url,
				dataType: 'text',
				headers: mParams.headers,
				failOnError: false,
				async: bAsync
			});
		}

		if (bAsync) {
			if ( !vResource ) {
				return Promise.resolve( _parse(null) );
			}

			return vResource.then(function(oVal) {
				return _parse(oVal);
			}, function(oVal) {
				throw (oVal instanceof Error ? oVal : new Error("Problem during loading of property file '" + mParams.url + "': " + oVal));
			});
		}

		return _parse( vResource );
	};

	return Properties;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/Version", [], function() {

	"use strict";

	// @evo-todo make it a simple object with immutable properties (Object.defineProperties)

	// -------------------------- VERSION -------------------------------------
	var rVersion = /^[0-9]+(?:\.([0-9]+)(?:\.([0-9]+))?)?(.*)$/;

	/**
	 * Returns a Version instance created from the given parameters.
	 *
	 * This function can either be called as a constructor (using <code>new</code>) or as a normal function.
	 * It always returns an immutable Version instance.
	 *
	 * The parts of the version number (major, minor, patch, suffix) can be provided in several ways:
	 * <ul>
	 * <li>Version("1.2.3-SNAPSHOT")    - as a dot-separated string. Any non-numerical char or a dot followed
	 *                                    by a non-numerical char starts the suffix portion. Any missing major,
	 *                                    minor or patch versions will be set to 0.</li>
	 * <li>Version(1,2,3,"-SNAPSHOT")   - as individual parameters. Major, minor and patch must be integer numbers
	 *                                    or empty, suffix must be a string not starting with digits.</li>
	 * <li>Version([1,2,3,"-SNAPSHOT"]) - as an array with the individual parts. The same type restrictions apply
	 *                                    as before.</li>
	 * <li>Version(otherVersion)        - as a Version instance (cast operation). Returns the given instance instead
	 *                                    of creating a new one.</li>
	 * </ul>
	 *
	 * To keep the code size small, this implementation mainly validates the single string variant.
	 * All other variants are only validated to some degree. It is the responsibility of the caller to
	 * provide proper parts.
	 *
	 * @param {int|string|any[]|module:sap/base/util/Version} vMajor the major part of the version (int) or any of the single
	 *        parameter variants explained above.
	 * @param {int} [iMinor] the minor part of the version number
	 * @param {int} [iPatch] the patch part of the version number
	 * @param {string} [sSuffix] the suffix part of the version number
	 * @class Represents a version consisting of major, minor, patch version, and suffix, for example '1.2.7-SNAPSHOT'.
	 * @since 1.58
	 * @alias module:sap/base/util/Version
	 * @public
	 */
	function Version(vMajor, iMinor, iPatch, sSuffix) {
		if ( vMajor instanceof Version ) {
			// note: even a constructor may return a value different from 'this'
			return vMajor;
		}
		if ( !(this instanceof Version) ) {
			// act as a cast operator when called as function (not as a constructor)
			return new Version(vMajor, iMinor, iPatch, sSuffix);
		}

		var m;
		if (typeof vMajor === "string") {
			m = rVersion.exec(vMajor);
		} else if (Array.isArray(vMajor)) {
			m = vMajor;
		} else {
			m = arguments;
		}
		m = m || [];

		function norm(v) {
			v = parseInt(v);
			return isNaN(v) ? 0 : v;
		}
		vMajor = norm(m[0]);
		iMinor = norm(m[1]);
		iPatch = norm(m[2]);
		sSuffix = String(m[3] || "");

		/**
		 * Returns a string representation of this version.
		 *
		 * @returns {string} a string representation of this version.
		 * @public
		 */
		this.toString = function() {
			return vMajor + "." + iMinor + "." + iPatch + sSuffix;
		};

		/**
		 * Returns the major version part of this version.
		 *
		 * @returns {int} the major version part of this version
		 * @public
		 */
		this.getMajor = function() {
			return vMajor;
		};

		/**
		 * Returns the minor version part of this version.
		 *
		 * @returns {int} the minor version part of this version
		 * @public
		 */
		this.getMinor = function() {
			return iMinor;
		};

		/**
		 * Returns the patch (or micro) version part of this version.
		 *
		 * @returns {int} the patch version part of this version
		 * @public
		 */
		this.getPatch = function() {
			return iPatch;
		};

		/**
		 * Returns the version suffix of this version.
		 *
		 * @returns {string} the version suffix of this version
		 * @public
		 */
		this.getSuffix = function() {
			return sSuffix;
		};

		/**
		 * Compares this version with a given one.
		 *
		 * The version with which this version should be compared can be given as a <code>sap/base/util/Version</code> instance,
		 * as a string (e.g. <code>v.compareTo("1.4.5")</code>). Or major, minor, patch and suffix values can be given as
		 * separate parameters (e.g. <code>v.compareTo(1, 4, 5)</code>) or in an array (e.g. <code>v.compareTo([1, 4, 5])</code>).
		 *
		 * @param {int|string|any[]|module:sap/base/util/Version} vOtherMajor
		 *                The major part (an integer) of the version to compare to or the full version in any of the single
		 *                parameter variants, as documented for the {@link module:sap/base/util/Version constructor}.
		 * @param {int} [iOtherMinor] A minor version to compare to (only valid when <code>vOther</code> is a single integer)
		 * @param {int} [iOtherPatch] A patch version to compare to (only valid when <code>vOther</code> is a single integer)
		 * @param {string} [sOtherSuffix] A version suffix like "-SNAPSHOT" to compare to (only valid when <code>vOther</code> is an integer)
		 * @returns {int} 0, if the given version is equal to this version, a negative value if the given other version is greater
		 *               and a positive value otherwise
		 * @public
		 */
		this.compareTo = function(vOtherMajor, iOtherMinor, iOtherPatch, sOtherSuffix) {
			var vOther = Version.apply(window, arguments);
			/*eslint-disable no-nested-ternary */
			return vMajor - vOther.getMajor() ||
					iMinor - vOther.getMinor() ||
					iPatch - vOther.getPatch() ||
					((sSuffix < vOther.getSuffix()) ? -1 : (sSuffix === vOther.getSuffix()) ? 0 : 1);
			/*eslint-enable no-nested-ternary */
		};

	}

	/**
	 * Checks whether this version is in the range of the given interval (start inclusive, end exclusive).
	 *
	 * The boundaries against which this version should be checked can be given as  <code>sap/base/util/Version</code>
	 * instances (e.g. <code>v.inRange(v1, v2)</code>), as strings (e.g. <code>v.inRange("1.4", "2.7")</code>)
	 * or as arrays (e.g. <code>v.inRange([1,4], [2,7])</code>).
	 *
	 * @param {string|any[]|module:sap/base/util/Version} vMin the start of the range (inclusive)
	 * @param {string|any[]|module:sap/base/util/Version} vMax the end of the range (exclusive)
	 * @returns {boolean} <code>true</code> if this version is greater or equal to <code>vMin</code> and smaller
	 *                   than <code>vMax</code>, <code>false</code> otherwise.
	 * @public
	 */
	Version.prototype.inRange = function(vMin, vMax) {
		return this.compareTo(vMin) >= 0 && this.compareTo(vMax) < 0;
	};

	return Version;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/array/uniqueSort", ['sap/base/assert'], function(assert) {
	"use strict";

	/**
	 * Sorts the given array in-place and removes any duplicates (identified by "===").
	 *
	 * Uses Array#sort()
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
	 *
	 * Use <code>jQuery.uniqueSort()</code> for arrays of DOMElements.
	 *
	 * @function
	 * @since 1.58
	 * @param {any[]} aArray An Array of any type
	 * @alias module:sap/base/util/array/uniqueSort
	 * @return {any[]} Same array as given (for chaining)
	 * @public
	 */
	var fnUniqueSort = function(aArray) {
		assert(Array.isArray(aArray), "uniqueSort: input parameter must be an Array");
		var iLength = aArray.length;
		if ( iLength > 1 ) {
			aArray.sort();
			var j = 0;
			for (var i = 1; i < iLength; i++) {
				// invariant: i is the entry to check, j is the last unique entry known so far
				if ( aArray.indexOf(aArray[i]) === i ) {
					aArray[++j] = aArray[i];
				}
			}
			// cut off the rest - if any
			if ( ++j < iLength ) {
				aArray.splice(j, iLength - j);
			}
		}
		return aArray;
	};
	return fnUniqueSort;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*global Node */

//@evo-todo check isEqualNode dependency: not yet available...
//@evo-todo dependency to global name 'Node' contradicts sap/base package

sap.ui.predefine("sap/base/util/deepEqual", ["sap/base/Log"], function(Log) {
	"use strict";

	/**
	 * Compares the two given values for equality, especially by comparing the content.
	 *
	 * <b>Note:</b> Function does not work with comparing XML objects.
	 *
	 * @function
	 * @since 1.58
	 * @param {any} a A value of any type
	 * @param {any} b A value of any type
	 * @param {int} [maxDepth=10] Maximum recursion depth
	 * @param {boolean} [contains] Whether all existing properties in a are equal as in b
	 * @alias module:sap/base/util/deepEqual
	 * @return {boolean} Whether a and b are equal
	 * @public
	 */
	var fnEqual = function(a, b, maxDepth, contains, depth) {
		// Optional parameter normalization
		if (typeof maxDepth == "boolean") {
			contains = maxDepth;
			maxDepth = undefined;
		}
		if (!depth) {
			depth = 0;
		}
		if (!maxDepth) {
			maxDepth = 10;
		}
		if (depth > maxDepth) {
			Log.warning("deepEqual comparison exceeded maximum recursion depth of " + maxDepth + ". Treating values as unequal");
			return false;
		}

		if (a === b || Number.isNaN(a) && Number.isNaN(b)) {
			return true;
		}

		if (Array.isArray(a) && Array.isArray(b)) {
			if (!contains && a.length !== b.length) {
				return false;
			}
			if (a.length > b.length) {
				return false;
			}
			for (var i = 0; i < a.length; i++) {
				if (!fnEqual(a[i], b[i], maxDepth, contains, depth + 1)) {
						return false;
				}
			}
			return true;
		}
		if (typeof a == "object" && typeof b == "object") {
			if (!a || !b) {
				return false;
			}
			if (a.constructor !== b.constructor) {
				return false;
			}
			if (!contains && Object.keys(a).length !== Object.keys(b).length) {
				return false;
			}
			if (a instanceof Node) {
				return a.isEqualNode(b);
			}
			if (a instanceof Date) {
				return a.valueOf() === b.valueOf();
			}
			for (var i in a) {
				if (!fnEqual(a[i], b[i], maxDepth, contains, depth + 1)) {
					return false;
				}
			}
			return true;
		}
		return false;
	};

	return fnEqual;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/deepExtend", ["./_merge"], function(_merge) {
	"use strict";

	/**
	 * Performs object extension by merging source objects into a target object. Copies are always deep.
	 *
	 * If during merging a key in the target object exists it is overwritten with the source object's value.
	 * Usage is the same as <code>jQuery.extend(true, ...)</code>.
	 * Values that are <code>undefined</code> are ignored.
	 *
	 * For shallow copies, you may use {@link module:sap/base/util/extend sap/base/util/extend} or
	 * <code>Object.assign</code>, but note that <code>Object.assign</code> only copies enumerable and own
	 * properties and doesn't copy properties on the prototype and non-enumerable properties.
	 * Also, values that are <code>undefined</code> are NOT ignored.
	 *
	 * @example
	 * var oResult = deepExtend({}, {
	 *   prop1: {
	 *     prop1a: "1a"
	 *   }
	 * }, {
	 *   prop2: {
	 *     prop2a: "2a"
	 *   }
	 * }, {
	 *   prop1: {
	 *      prop1b: "1b"
	 *   }
	 * }, {
	 *   prop2: undefined
	 * });
	 *
	 * console.log(oResult);
	 * {
	 *   "prop1": {
	 *     "prop1a": "1a",
	 *     "prop1b": "1b"
	 *   },
	 *   "prop2": {
	 *     "prop2a": "2a"
	 *   }
	 * }
	 *
	 * @function
	 * @alias module:sap/base/util/deepExtend
	 * @param {object} target The object that will receive new properties
	 * @param {...object} [source] One or more objects which get merged into the target object
	 * @return {object} the target object which is the result of the merge
	 * @public
	 * @since 1.71
	 */
	var fnDeepExtend = function() {
		var args = [true, true];
		args.push.apply(args, arguments);
		return _merge.apply(null, args);
	};

	return fnDeepExtend;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/isEmptyObject", [], function() {
	"use strict";
	/**
	 * Validates if the given object is empty, that is that it has no enumerable properties.
	 *
	 * Note that <code>null</code> and <code>undefined</code> comply with this definition of 'empty'.
	 * The behavior for non-object values is undefined and might change in future.
	 *
	 * @example
	 * sap.ui.require(["sap/base/util/isEmptyObject"], function(isEmptyObject){
	 *      isEmptyObject({}); // true
	 *      isEmptyObject({test: '123'}); // false
	 *      isEmptyObject(null); // true
	 *      isEmptyObject(undefined); // true
	 * });
	 *
	 * @function
	 * @since 1.65
	 * @public
	 * @name module:sap/base/util/isEmptyObject
	 * @param {Object} obj the object which is checked
	 * @returns {boolean} whether or not the given object is empty
	 */
	var fnIsEmptyObject = function isEmptyObject(obj) {
		// eslint-disable-next-line no-unreachable-loop
		for (var sName in obj) {
			return false;
		}
		return true;
	};

	return fnIsEmptyObject;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/merge", ["./_merge"], function(_merge) {
	"use strict";

	/**
	 * Performs object extension by merging source objects into a target object. Copies are always deep.
	 *
	 * If during merging a key in the target object exists it is overwritten with the source object's value.
	 * Usage is the same as <code>jQuery.extend(true, ...)</code>, but values that are <code>undefined</code>
	 * are NOT ignored.
	 *
	 * For shallow copies, you may use <code>Object.assign</code>, but note that <code>Object.assign</code> only
	 * copies enumerable and own properties and doesn't copy properties on the prototype and non-enumerable properties.
	 *
	 * @example
	 * var oResult = merge({}, {
	 *   prop1: {
	 *     prop1a: "1a"
	 *   }
	 * }, {
	 *   prop2: {
	 *     prop2a: "2a"
	 *   }
	 * }, {
	 *   prop1: {
	 *      prop1b: "1b"
	 *   }
	 * }, {
	 *   prop2: undefined
	 * });
	 *
	 * console.log(oResult);
	 * {
	 *   "prop1": {
	 *     "prop1a": "1a",
	 *     "prop1b": "1b"
	 *   },
	 *   "prop2": undefined
	 * }
	 *
	 * @function
	 * @since 1.58
	 * @public
	 * @alias module:sap/base/util/merge
	 * @param {object} target The object that will receive new properties
	 * @param {...object} [source] One or more objects which get merged into the target object
	 * @return {object} the target object which is the result of the merge
	 *
	 */
	var fnMerge = function() {
		var args = [true, false];
		args.push.apply(args, arguments);
		return _merge.apply(null, args);
	};

	return fnMerge;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/resolveReference", ["sap/base/util/ObjectPath"], function(ObjectPath) {
	"use strict";

	// indicator if the reference can't be resolved
	var oNotFound = Object.create(null);

	/**
	 * Resolve the path segments under the given root context
	 *
	 * @param {array} aParts The path segments
	 * @param {object} oRoot The root context
	 * @param {object} [mOptions] Options
	 * @param {boolean} [mOptions.bindContext] When the resolved value is a
	 *  function, whether the resolved function is bound to a context
	 * @param {boolean} [mOptions.rootContext] When the resolved value is a
	 *  function and a rootContext is given, the resolved function is bound
	 *  to this context instead of the object to which it belongs. If
	 *  <code>mOptions.bindContext=false</code>, this option has no effect
	 * @return {any} The resolved value. If the value can't be resolved under the
	 *  given root context, it returns <code>oNotFound</code>.
	 */
	function _resolve(aParts, oRoot, mOptions) {
		var vRef, oContext;

		if (oRoot && (aParts[0] in oRoot)) {
			// the path consists of at least two segments
			// e.g. key "Module.namespace.function" -> function() {...}
			oContext = aParts.length > 1 ? ObjectPath.get(aParts.slice(0, -1), oRoot) : oRoot;
			vRef = oContext && oContext[aParts[aParts.length - 1]];

			if (typeof vRef === "function" && mOptions.bindContext) {
				vRef = vRef.bind(mOptions.rootContext || oContext);
			}

			return vRef;
		}

		return oNotFound;
	}

	/**
	 * Returns a value located in the provided path using the given
	 * <code>mVariables</code> object.
	 *
	 * If the provided path cannot be resolved completely, <code>undefined</code> is returned.
	 *
	 * How <code>mVariables</code> are checked for resolving the path depends on
	 * the syntax of the path:
	 * <ul>
	 * <li><i>absolute</i>: paths not starting with a dot ('.') are first checked through
	 *     <code>mVariables</code>.</li>
	 * <li><i>relative</i>: paths starting with a dot ('.') are only checked through the dot variable
	 *     <code>mVariables["."]</code> and not the other variables in <code>mVariables</code>.</li>
	 * <li><i>legacy</i>: when <code>mOptions.preferDotContext=true</code>, paths not starting
	 *     with a dot ('.') are first checked through the dot Variable
	 *     <code>mVariables["."]</code> and then - if nothing is found - through the other
	 *     Variables in <code>mVariables</code>.</li>
	 * </ul>
	 *
	 * For an absolute path, when nothing is found after resolving the value within <code>mVariables</code>,
	 * <code>sap.ui.require</code> is called when <code>mOptions.useProbingRequire=true</code> to retrieve the
	 * module export of the loaded module with the given <code>sPath</code> after replacing '.' with '/' in
	 * the path. If the path can still not be resolved, the last fallback is taken to resolve
	 * <code>sPath</code> within the global scope <code>window</code>.
	 *
	 * When the resolved value is a function, a context may be bound to it with the following
	 * conditions:
	 * <ul>
	 * <li><i>No bound</i>: if the function is resolved from the global scope (not from any
	 *     given variables in <code>mVariables</code>, it's not bound to any context. If the
	 *     function exists directly under <code>mVariables</code>, nothing is bound.</li>
	 * <li><i>Bound</i>: otherwise, the resolved function is bound to the object to which it
	 *     belongs</li>
	 * <li><i>mOptions.bindContext</i>: when this option is set to <code>false</code>, no
	 *     context is bound to the resolved function regardless where the function is resolved
	 *     </li>
	 * <li><i>mOptions.bindDotContext</i>: for paths starting with a dot ('.'),
	 *     <code>mOptions.bindDotContext=false</code> turns off the automatic binding to the
	 *     dot variable <code>mVariables["."]</code>. <code>mOptions.bindDotContext</code> has
	 *     no effect when <code>mOptions.bindContext=false</code>.</li>
	 * </ul>
	 *
	 * @function
	 * @private
	 * @ui5-restricted sap.ui.core
	 * @since 1.69
	 *
	 * @param {string} sPath Path
	 * @param {object} [mVariables] An object containing the mapping of variable name to object or function
	 * @param {object} [mOptions] Options
	 * @param {boolean} [mOptions.preferDotContext=false] Whether the path not starting with a dot ('.') is
	 *  resolved under the dot variable when it can not be resolved through the given variables object.
	 * @param {boolean} [mOptions.bindContext=true] When the resolved value is a function, whether the
	 *  resolved function is bound to a context. When this property is set to false, the
	 *  mOptions.bindDotContext has no effect anymore.
	 * @param {boolean} [mOptions.bindDotContext=true] When the resolved value is a function, whether the
	 *  resolved function from a path which starts with a dot ('.') should be bound to the dot context
	 * @param {boolean} [mOptions.useProbingRequire=false] When the value cannot be resolved by using the
	 *  given <code>mVariables</code>, <code>mOptions.useProbingRequire=true</code> leads to a call of
	 *  <code>sap.ui.require</code> to get the module export of the loaded module under the given
	 *  <code>sPath</code> after replacing the '.' with '/'.
	 * @returns {any} Returns the value located in the provided path, or <code>undefined</code> if the path
	 *  does not exist completely.
	 * @alias module:sap/base/util/resolveReference
	 */
	var resolveReference = function(sPath, mVariables, mOptions) {
		// fill the default values
		mVariables = mVariables || {};
		mOptions = mOptions || {};
		mOptions.bindContext = mOptions.bindContext !== false;
		mOptions.bindDotContext = mOptions.bindDotContext !== false;

		var aParts = sPath.split("."),
			// if sPath starts with ".", split returns an empty string
			// at the first position and the dot is used as variable
			sVariable = aParts.shift() || ".",
			bDotCase = sVariable === ".",
			vRef = oNotFound;

		// push the first part back to the array
		aParts.unshift(sVariable);

		// if preferDotContext, resolve the sPath under the dot context first for sPath which doesn't begin with "."
		if (mOptions.preferDotContext && !bDotCase) {
			vRef =  _resolve(aParts, mVariables["."], {
				bindContext: mOptions.bindContext && mOptions.bindDotContext,
				// resolve function in dot variable should always bind the dot variable
				rootContext: mVariables["."]
			});
		}

		// If sPath isn't resolved yet, resolve the path under mVariables
		if (vRef === oNotFound) {
			vRef = _resolve(aParts, mVariables, {
				bindContext: mOptions.bindContext
					// dot case: mOptions.bindDotContext determines whether context should be bound
					// non dot case: bind context if sPath contains more than one segment
					&& (bDotCase ? mOptions.bindDotContext : (aParts.length > 1)),
				rootContext: bDotCase ? mVariables["."] : undefined
			});
		}

		if (!bDotCase) {
			if (vRef === oNotFound && mOptions.useProbingRequire) {
				vRef = sap.ui.require(sPath.replace(/\./g, "/"));

				if (vRef === undefined) {
					vRef = oNotFound;
				}
			}

			// resolve the path under global scope, only when it can't be resolved under mVariables
			if (vRef === oNotFound ) {
				// fallback if no value could be found under the given sPath's first segment
				// otherwise resolve under global namespace
				vRef = ObjectPath.get(sPath);
			}
		}

		return vRef === oNotFound ? undefined : vRef;
	};

	return resolveReference;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * @overview Initialization for the SAP UI Library
 *
 * This module creates the main SAP namespaces {@link sap} and automatically
 * registers it to the OpenAjax hub if that exists.
 *
 * This class provides method {@link #namespace} to register namespaces to the
 * SAP UI Library.
 *
 * @sample
 * Ensures a control can be used afterwards but does not load immediately
 * sap.ui.lazyRequire("sap.ui.core.Control");
 * sap.ui.lazyRequire("sap.m.Button");
 *
 * @version 1.125.0
 * @author  SAP SE
 * @public
 */

/*global OpenAjax */

sap.ui.predefine("sap/ui/Global", [
	'sap/ui/VersionInfo',
	'sap/base/Log',
	'sap/base/assert',
	'sap/base/util/ObjectPath'
],
	function(VersionInfo, Log, assert, ObjectPath) {
	"use strict";

	// Register to the OpenAjax Hub if it exists
	if (window.OpenAjax && window.OpenAjax.hub) {
		OpenAjax.hub.registerLibrary("sap", "http://www.sap.com/", "0.1", {});
	}

	// soft dependency to sap/ui/base/Object
	var BaseObject;

	/**
	 * Root namespace for JavaScript functionality provided by SAP SE.
	 *
	 * The <code>sap</code> namespace is automatically registered with the
	 * OpenAjax hub if it exists.
	 *
	 * @version 1.125.0
	 * @namespace
	 * @public
	 * @name sap
	 */

	/**
	 * The <code>sap.ui</code> namespace is the central OpenAjax compliant entry
	 * point for UI related JavaScript functionality provided by SAP.
	 *
	 * @version 1.125.0
	 * @namespace
	 * @name sap.ui
	 * @public
	 */

	let Global = {
		/**
		 * The version of the SAP UI Library
		 * @type string
		 */
		version: "1.125.0",
		// buildinfo.lastchange is deprecated and is therefore defaulted to empty string
		buildinfo : { lastchange : "", buildtime : "20241111-2311" }
	};

	/**
	 * Module export must be the global sap.ui namespace in UI5 v1.
	 * In UI5 v2, the export is a plain object containing the version and buildinfo.
	 * @deprecated since 1.120
	 */
	Global = Object.assign(sap.ui, Global);

	/**
	 * @deprecated As of version 1.120
	 */
	var syncCallBehavior = sap.ui.loader._.getSyncCallBehavior();

	/**
	 * Loads the version info file (resources/sap-ui-version.json) and returns
	 * it or if a library name is specified then the version info of the individual
	 * library will be returned.
	 *
	 * In case of the version info file is not available an error will occur when
	 * calling this function.
	 *
	 * @param {string|object} [mOptions] name of the library (e.g. "sap.ui.core") or an object map (see below)
	 * @param {boolean} [mOptions.library] name of the library (e.g. "sap.ui.core")
	 * @param {boolean} [mOptions.async=false] whether "sap-ui-version.json" should be loaded asynchronously
	 * @param {boolean} [mOptions.failOnError=true] whether to propagate load errors or not (not relevant for async loading)
	 * @return {object|undefined|Promise} the full version info, the library specific one,
	 *                                    undefined (if library is not listed or there was an error and "failOnError" is set to "false")
	 *                                    or a Promise which resolves with one of them
	 * @deprecated since 1.56: Use {@link module:sap/ui/VersionInfo.load} instead
	 * @public
	 * @static
	 */
	sap.ui.getVersionInfo = function(mOptions) {
		if (mOptions && mOptions.async) {
			Log.info("Do not use deprecated function 'sap.ui.getVersionInfo'. Use" +
				" 'sap/ui/VersionInfo' module's asynchronous .load function instead");
		} else {
			Log.warning("Do not use deprecated function 'sap.ui.getVersionInfo' synchronously! Use" +
				" 'sap/ui/VersionInfo' module's asynchronous .load function instead", "Deprecation", null, function() {
				return {
					type: "sap.ui.getVersionInfo",
					name: "Global"
				};
			});
		}

		return VersionInfo._load(mOptions); // .load() is async only!
	};

	/**
	 * Ensures that a given a namespace or hierarchy of nested namespaces exists in the
	 * current <code>window</code>.
	 *
	 * @param {string} sNamespace
	 * @return {object} the innermost namespace of the hierarchy
	 * @public
	 * @static
	 * @deprecated As of version 1.1, see {@link topic:c78c07c094e04ccfaab659378a1707c7 Creating Control and Class Modules}.
	 */
	sap.ui.namespace = function(sNamespace){

		assert(false, "sap.ui.namespace is long time deprecated and shouldn't be used");

		return ObjectPath.create(sNamespace);
	};

	/**
	 * Creates a lazy loading stub for a given class <code>sClassName</code>.
	 *
	 * If the class has been loaded already, nothing is done. Otherwise a stub object
	 * or constructor and - optionally - a set of stub methods are created.
	 * All created stubs will load the corresponding module on execution
	 * and then delegate to their counterpart in the loaded module.
	 *
	 * When no methods are given or when the list of methods contains the special name
	 * "new" (which is an operator can't be used as method name in JavaScript), then a
	 * stub <b>constructor</b> for class <code>sClassName</code> is created.
	 * Otherwise, a plain object is created.
	 *
	 * <b>Note</b>: Accessing any stub as a plain object without executing it (no matter
	 * whether it is a function or an object) won't load the module and therefore most likely
	 * won't work as expected. This is a fundamental restriction of the lazy loader approach.
	 *
	 * <b>Note</b>: As a side effect of this method, the namespace containing the given
	 * class is created <b>immediately</b>.
	 *
	 * @param {string} sClassName Fully qualified name (dot notation) of the class that should be prepared
	 * @param {string} [sMethods='new'] Space separated list of additional (static) methods that should be created as stubs
	 * @param {string} [sModuleName] Name of the module to load, defaults to the class name
	 * @public
	 * @static
	 * @deprecated since 1.56 Lazy loading enforces synchronous requests and therefore has been deprecated
	 *     without a replacement. Instead of loading classes via lazy stubs, they should be required as
	 *     dependencies of an AMD module (using {@link sap.ui.define}) or on demand with a call to {@link
	 *     sap.ui.require}.
	 */
	sap.ui.lazyRequire = function(sClassName, sMethods, sModuleName) {

		assert(typeof sClassName === "string" && sClassName, "lazyRequire: sClassName must be a non-empty string");
		assert(!sMethods || typeof sMethods === "string", "lazyRequire: sMethods must be empty or a string");

		if ( syncCallBehavior === 2 ) {
			Log.error("[nosync] lazy stub creation ignored for '" + sClassName + "'");
			return;
		}

		var sFullClass = sClassName.replace(/\//gi,"\."),
			iLastDotPos = sFullClass.lastIndexOf("."),
			sPackage = sFullClass.substr(0, iLastDotPos),
			sClass = sFullClass.substr(iLastDotPos + 1),
			oPackage = ObjectPath.create(sPackage),
			oClass = oPackage[sClass],
			aMethods = (sMethods || "new").split(" "),
			iConstructor = aMethods.indexOf("new");

		sModuleName = sModuleName || sFullClass;

		if (!oClass) {

			if ( iConstructor >= 0 ) {

				// Create dummy constructor which loads the class on demand
				oClass = function() {
					if ( syncCallBehavior ) {
						if ( syncCallBehavior === 1 ) {
							Log.error("[nosync] lazy stub for constructor '" + sFullClass + "' called");
						}
					} else {
						Log.debug("lazy stub for constructor '" + sFullClass + "' called.");
					}
					sap.ui.requireSync(sModuleName.replace(/\./g, "/")); // legacy-relevant: 'sap.ui.lazyRequire' is deprecated
					var oRealClass = oPackage[sClass];
					assert(typeof oRealClass === "function", "lazyRequire: oRealClass must be a function after loading");
					if ( oRealClass._sapUiLazyLoader ) {
						throw new Error("lazyRequire: stub '" + sFullClass + "'has not been replaced by module '" + sModuleName + "'");
					}

					// create a new instance and invoke the constructor
					var oInstance = Object.create(oRealClass.prototype);
					if ( !(this instanceof oClass) ) {
						// sap.ui.base.Object and its subclasses throw an error when the constructor is called as a function.
						// Lazy stubs for those classes should behave consistently, but for compatibility with older
						// releases (< 1.63), only a log entry can be written.
						// To facilitate a support rule, the log entry provides a stack trace on demand ("support info")
						BaseObject = BaseObject || sap.ui.require("sap/ui/base/Object");
						if ( BaseObject && oInstance instanceof BaseObject ) {
							Log.error("Constructor " + sClassName + " has been called without \"new\" operator!", null, null, function() {
								try {
									throw new Error();
								} catch (e) {
									return e;
								}
							});
						}
					}
					var oResult = oRealClass.apply(oInstance, arguments);
					if (oResult && (typeof oResult === "function" || typeof oResult === "object")) {
						oInstance = oResult;
					}
					return oInstance;
				};
				// mark the stub as lazy loader
				oClass._sapUiLazyLoader = true;

				aMethods.splice(iConstructor,1);

			} else {

				// Create dummy object
				oClass = {};

			}

			// remember the stub
			oPackage[sClass] = oClass;

		}


		// add stub methods to it
		aMethods.forEach( function(sMethod) {
			// check whether method is already available
			if (!oClass[sMethod]) {
				oClass[sMethod] = function() {
					if ( syncCallBehavior ) {
						if ( syncCallBehavior === 1 ) {
							Log.error("[no-sync] lazy stub for method '" + sFullClass + "." + sMethod + "' called");
						}
					} else {
						Log.debug("lazy stub for method '" + sFullClass + "." + sMethod + "' called.");
					}
					sap.ui.requireSync(sModuleName.replace(/\./g, "/")); // legacy-relevant: 'sap.ui.lazyRequire' is deprecated
					var oRealClass = oPackage[sClass];
					assert(typeof oRealClass === "function" || typeof oRealClass === "object", "lazyRequire: oRealClass must be a function or object after loading");
					assert(typeof oRealClass[sMethod] === "function", "lazyRequire: method must be a function");
					if (oRealClass[sMethod]._sapUiLazyLoader ) {
						throw new Error("lazyRequire: stub '" + sFullClass + "." + sMethod + "' has not been replaced by loaded module '" + sModuleName + "'");
					}
					return oRealClass[sMethod].apply(oRealClass, arguments);
				};
				oClass[sMethod]._sapUiLazyLoader = true;
			}
		});

	};

	/**
	 * Note: this method only works when sClassName has been stubbed itself, not when
	 *    it has been stubbed as a static utility class with individual stubs for its methods.
	 *    (e.g. might not work for 'sap.ui.core.BusyIndicator').
	 * Must not be used outside the core, e.g. not by controls, apps, tests etc.
	 * @private
	 * @deprecated since 1.56
	 */
	sap.ui.lazyRequire._isStub = function(sClassName) {
		assert(typeof sClassName === "string" && sClassName, "lazyRequire._isStub: sClassName must be a non-empty string");

		var iLastDotPos = sClassName.lastIndexOf("."),
			sContext = sClassName.slice(0, iLastDotPos),
			sProperty = sClassName.slice(iLastDotPos + 1),
			oContext = ObjectPath.get(sContext || "");

		return !!(oContext && typeof oContext[sProperty] === "function" && oContext[sProperty]._sapUiLazyLoader);

	};

	/**
	 * Returns the URL of a resource that belongs to the given library and has the given relative location within the library.
	 * This is mainly meant for static resources like images that are inside the library.
	 * It is NOT meant for access to JavaScript modules or anything for which a different URL has been registered with
	 * sap.ui.loader.config({paths:...}). For these cases use sap.ui.require.toUrl().
	 * It DOES work, however, when the given sResourcePath starts with "themes/" (= when it is a theme-dependent resource). Even when for this theme a different
	 * location outside the normal library location is configured.
	 *
	 * @param {string} sLibraryName the name of a library, like "sap.ui.layout"
	 * @param {string} sResourcePath the relative path of a resource inside this library, like "img/mypic.png" or "themes/my_theme/img/mypic.png"
	 * @returns {string} the URL of the requested resource
	 *
	 * @static
	 * @public
	 * @deprecated since 1.56.0, use {@link sap.ui.require.toUrl} instead.
	 */
	sap.ui.resource = function(sLibraryName, sResourcePath) {
		assert(typeof sLibraryName === "string", "sLibraryName must be a string");
		assert(typeof sResourcePath === "string", "sResourcePath must be a string");

		return sap.ui.require.toUrl((String(sLibraryName).replace(/\./g, "/") + '/' + sResourcePath).replace(/^\/*/, ""));
	};

	/**
	 * Redirects access to resources that are part of the given namespace to a location
	 * relative to the assumed <b>application root folder</b>.
	 *
	 * Any UI5 managed resource (view, controller, control, JavaScript module, CSS file, etc.)
	 * whose resource name starts with <code>sNamespace</code>, will be loaded from an
	 * equally named subfolder of the <b>application root folder</b>.
	 * If the resource name consists of multiple segments (separated by a dot), each segment
	 * is assumed to represent an individual folder. In other words: when a resource name is
	 * converted to a URL, any dots ('.') are converted to slashes ('/').
	 *
	 * <b>Note:</b> The <b>application root folder</b> is assumed to be the same as the folder
	 * where the current page resides in.
	 *
	 * Usage sample:
	 * <pre>
	 *   // Let UI5 know that resources, whose name starts with "com.mycompany.myapp"
	 *   // should be loaded from the URL location "./com/mycompany/myapp"
	 *   sap.ui.localResources("com.mycompany.myapp");
	 *
	 *   // The following call implicitly will use the mapping done by the previous line
	 *   // It will load a view from ./com/mycompany/myapp/views/Main.view.xml
	 *   View.create({ viewName : "com.mycompany.myapp.views.Main", type : ViewType.XML}).then(function(oView) {
	 *       // do stuff
	 *   });
	 * </pre>
	 *
	 * When applications need a more flexible mapping between resource names and their location,
	 * they can use {@link sap.ui.loader.config} with option <code>paths</code>.
	 *
	 * @param {string} sNamespace Namespace prefix for which to load resources relative to the application root folder
	 * @public
	 * @static
	 * @deprecated since 1.56, use {@link sap.ui.loader.config} and its <code>paths</code> option instead.
	 */
	sap.ui.localResources = function(sNamespace) {
		assert(sNamespace, "sNamespace must not be empty");
		var mPaths = {};
		mPaths[sNamespace.replace(/\./g, "/")] = "./" + sNamespace.replace(/\./g, "/");
		sap.ui.loader.config({paths:mPaths});
	};

	return Global;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/VersionInfo", ['sap/base/util/LoaderExtensions'], function (LoaderExtensions) {
	"use strict";

	let oVersionInfo;

	/**
	 * @alias module:sap/ui/VersionInfo
	 * @namespace
	 * @since 1.56.0
	 * @public
	 */
	var VersionInfo = {
		/**
		 * Retrieves the version info in case it was already loaded.
		 * @private
		 * @ui5-restricted sap.ui.core
		 */
		get _content() {
			return oVersionInfo;
		}
	};

	/**
	 * Loads the version info asynchronously from resource "sap-ui-version.json".
	 *
	 * By default, the returned promise will resolve with the whole version info file's content.
	 * If a library name is specified in the options, then the promise will resolve with the
	 * version info for that library only or with <code>undefined</code>, if the named library
	 * is not listed in the version info file.
	 *
	 * If loading the version info file fails, the promise will be rejected with the corresponding
	 * error.
	 *
	 * @param {object} [mOptions] Map of options
	 * @param {string} [mOptions.library] Name of a library (e.g. "sap.ui.core")
	 * @returns {Promise<object|undefined>}
	 *    A promise which resolves with the full version info or with the library specific version
	 *    info or <code>undefined</code> if the library is not listed; if an error occurred during
	 *    loading, then the promise is rejected.
	 * @since 1.56.0
	 * @public
	 * @static
	 */
	VersionInfo.load = function (mOptions) {
		mOptions = mOptions || {};
		mOptions.async = true;
		return VersionInfo._load(mOptions);
	};

	/**
	 * Stores the loading Promise for "sap-ui-version.json".
	 * @see sap.ui.getVersionInfo
	 * @private
	 */
	var oVersionInfoPromise = null;

	/**
	 * Mapping of library name to it's dependencies.
	 * Extracted from the loaded version info.
	 */
	var mKnownLibs;

	/**
	 * Mapping of component names to it's dependencies.
	 * Extracted from the loaded version info.
	 */
	var mKnownComponents;

	function updateVersionInfo(oNewVersionInfo) {
		// Persist the info object
		oVersionInfo = oNewVersionInfo;
		// reset known libs and components
		mKnownLibs = null;
		mKnownComponents = null;
	}

	/**
	 * @deprecated since 1.120
	 */
	Object.defineProperty(sap.ui, "versioninfo", {
		configurable: true,
		enumerable: true,
		get: function() {
			return oVersionInfo;
		},
		set: function(oNewVersionInfo) {
			updateVersionInfo(oNewVersionInfo);
		}
	});

	/**
	 * Version retrieval. Used by {@link sap.ui.getVersionInfo} and {@link module:sap/ui/VersionInfo.load}
	 *
	 * @param {string|object} [mOptions] name of the library (e.g. "sap.ui.core") or an object map (see below)
	 * @param {boolean} [mOptions.library] name of the library (e.g. "sap.ui.core")
	 * @param {boolean} [mOptions.async=false] whether "sap-ui-version.json" should be loaded asynchronously
	 * @param {boolean} [mOptions.failOnError=true] whether to propagate load errors or not (not relevant for async loading)
	 * @return {object|undefined|Promise} the full version info, the library specific one,
	 *                                    undefined (if library is not listed or there was an error and "failOnError" is set to "false")
	 *                                    or a Promise which resolves with one of them
	 * @private
	 * @static
	 */
	VersionInfo._load = function(mOptions) {

		// Check for no parameter / library name as string
		if (typeof mOptions !== "object") {
			mOptions = {
				library: mOptions
			};
		}

		// Cast "async" to boolean (defaults to false)
		mOptions.async = mOptions.async === true;

		// Cast "failOnError" to boolean (defaults to true)
		mOptions.failOnError = mOptions.failOnError !== false;

		if (!oVersionInfo) {
			// Load and cache the versioninfo

			// When async is enabled and the file is currently being loaded
			// return the promise and make sure the requested options are passed.
			// This is to prevent returning the full object as requested in a
			// first call (which created this promise) to the one requested just a
			// single lib in a second call (which re-uses this same promise) or vice versa.
			if (mOptions.async && oVersionInfoPromise instanceof Promise) {
				return oVersionInfoPromise.then(function() {
					return VersionInfo._load(mOptions);
				});
			}

			var fnHandleSuccess = function(oNewVersionInfo) {
				// Remove the stored Promise as the version info is now cached.
				// This allows reloading the file by clearing "sap.ui.versioninfo"
				// (however this is not documented and therefore not supported).
				oVersionInfoPromise = null;

				// "LoaderExtensions.loadResource" returns "null" in case of an error when
				// "failOnError" is set to "false". In this case the won't be persisted
				// and undefined will be returned.
				if (oNewVersionInfo === null) {
					return undefined;
				}

				updateVersionInfo(oNewVersionInfo);

				// Calling the function again with the same arguments will return the
				// cached value from the loaded version info.
				return VersionInfo._load(mOptions);
			};
			var fnHandleError = function(oError) {
				// Remove the stored Promise as the version info couldn't be loaded
				// and should be requested again the next time.
				oVersionInfoPromise = null;

				// Re-throw the error to give it to the user
				throw oError;
			};

			var vReturn = LoaderExtensions.loadResource("sap-ui-version.json", {
				async: mOptions.async,

				// "failOnError" only applies for sync mode, async should always fail (reject)
				failOnError: mOptions.async || mOptions.failOnError
			});

			if (vReturn instanceof Promise) {
				oVersionInfoPromise = vReturn;
				return vReturn.then(fnHandleSuccess, fnHandleError);
			} else {
				return fnHandleSuccess(vReturn);
			}

		} else {
			// Return the cached versioninfo

			var oResult;
			if (typeof mOptions.library !== "undefined") {
				// Find the version of the individual library
				var aLibs = oVersionInfo.libraries;
				if (aLibs) {
					for (var i = 0, l = aLibs.length; i < l; i++) {
						if (aLibs[i].name === mOptions.library) {
							oResult = aLibs[i];
							break;
						}
					}
				}
			} else {
				// Return the full version info
				oResult = oVersionInfo;
			}

			return mOptions.async ? Promise.resolve(oResult) : oResult;
		}
	};

	/**
	 * Transforms the loaded version info to an easier consumable map.
	 */
	function transformVersionInfo() {
		if (oVersionInfo){
			// get the transitive dependencies of the given libs from the loaded version info
			// only do this once if mKnownLibs is not created yet
			if (oVersionInfo.libraries && !mKnownLibs) {
				// flatten dependency lists for all libs
				mKnownLibs = {};
				oVersionInfo.libraries.forEach(function(oLib, i) {
					mKnownLibs[oLib.name] = {};

					var mDeps = oLib.manifestHints && oLib.manifestHints.dependencies &&
								oLib.manifestHints.dependencies.libs;
					for (var sDep in mDeps) {
						if (!mDeps[sDep].lazy) {
							mKnownLibs[oLib.name][sDep] = true;
						}
					}
				});
			}

			// get transitive dependencies for a component
			if (oVersionInfo.components && !mKnownComponents) {
				mKnownComponents = {};

				Object.keys(oVersionInfo.components).forEach(function(sComponentName) {
					var oComponentInfo = oVersionInfo.components[sComponentName];

					mKnownComponents[sComponentName] = {
						library: oComponentInfo.library,
						hasOwnPreload: oComponentInfo.hasOwnPreload || false,
						dependencies: []
					};

					var mDeps = oComponentInfo.manifestHints && oComponentInfo.manifestHints.dependencies &&
						oComponentInfo.manifestHints.dependencies.libs;
					for (var sDep in mDeps) {
						if (!mDeps[sDep].lazy) {
							mKnownComponents[sComponentName].dependencies.push(sDep);
						}
					}
				});
			}
		}
	}

	/**
	 * Gets all additional transitive dependencies for the given list of libraries.
	 * Returns a new array.
	 * @param {string[]} aLibraries a list of libraries for which the transitive
	 * dependencies will be extracted from the loaded version info
	 * @returns {string[]} the list of all transitive dependencies for the given initial
	 * list of libraries
	 * @static
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	VersionInfo._getTransitiveDependencyForLibraries = function(aLibraries) {

		transformVersionInfo();

		if (mKnownLibs) {
			var mClosure = aLibraries.reduce(function(all, lib) {
				all[lib] = true;
				return Object.assign(all, mKnownLibs[lib]);
			}, {});
			aLibraries = Object.keys(mClosure);
		}

		return aLibraries;
	};

	/**
	 * If the given component is part of the version-info, an object with library and dependency information is returned.
	 *
	 * The object has three properties:
	 * <ul>
	 * <li><code>library</code> contains the name of the library which contains the component implementation</li>
	 * <li><code>dependencies</code> is an array with all transitive dependencies of the component</li>
	 * <li><code>hasOwnPreload</code> is a boolean indicating whether the component has its own Component-preload bundle</li>
	 * </ul>
	 *
	 * @param {string} sComponentName the component name
	 * @returns {{library: string, hasOwnPreload: boolean, dependencies: string[]}|undefined}
	 *    An info object containing the located library and all transitive dependencies for the given component
	 *    or <code>undefined</code> if the component is not part of the version-info.
	 * @static
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	VersionInfo._getTransitiveDependencyForComponent = function(sComponentName) {
		transformVersionInfo();

		if (mKnownComponents) {
			return mKnownComponents[sComponentName];
		}
	};

	/**
	 * Reset the cached version info data that is saved internally within this module.
	 *
	 * This function is intended to be used in unit tests where a custom version
	 * info object is needed.
	 *
	 * @static
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	VersionInfo._reset = function() {
		updateVersionInfo();
	};

	return VersionInfo;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/* global Set */

// Provides class sap.ui.base.DataType
sap.ui.predefine("sap/ui/base/DataType", [
	'sap/base/future',
	'sap/base/util/ObjectPath',
	"sap/base/assert",
	"sap/base/Log",
	"sap/base/util/isPlainObject",
	'sap/base/util/resolveReference'
], function(future, ObjectPath, assert, Log, isPlainObject, resolveReference) {
	"use strict";

	/**
	 * Pseudo-Constructor for class <code>DataType</code>, never to be used.
	 *
	 * @class Represents the type of properties in a <code>ManagedObject</code> class.
	 *
	 * Each type provides some metadata like its {@link #getName qualified name} or its
	 * {@link #getBaseType base type} in case of a derived type. Array types provide information
	 * about the allowed {@link #getComponentType type of components} in an array, enumeration types
	 * inform about the set of their allowed {@link #getEnumValues keys and values}.
	 *
	 * Each type has a method to {@link #isValid check whether a value is valid} for a property
	 * of that type.
	 *
	 * Already defined types can be looked up by calling {@link #.getType DataType.getType}, new
	 * types can only be created by calling the factory method {@link #.createType DataType.createType},
	 * calling the constructor will throw an error.
	 *
	 * @author SAP SE
	 * @since 0.9.0
	 * @alias sap.ui.base.DataType
	 * @public
	 * @hideconstructor
	 * @throws {Error} Constructor must not be called, use {@link #.createType DataType.createType} instead
	 */
	var DataType = function() {
		// Avoid construction of a DataType.
		// DataType is only a function to support the "instanceof" operator.
		throw new Error();
	};

	/**
	 * The qualified name of the data type.
	 *
	 * @returns {string} Name of the data type
	 * @public
	 */
	DataType.prototype.getName = function() {
		return undefined;
	};

	/**
	 * The base type of this type or undefined if this is a primitive type.
	 * @returns {sap.ui.base.DataType|undefined} Base type or <code>undefined</code>
	 * @public
	 */
	DataType.prototype.getBaseType = function() {
		return undefined;
	};

	/**
	 * Returns the most basic (primitive) type that this type has been derived from.
	 *
	 * If the type is a primitive type by itself, <code>this</code> is returned.
	 *
	 * @returns {sap.ui.base.DataType} Primitive type of this type
	 * @public
	 */
	DataType.prototype.getPrimitiveType = function() {
		/*eslint-disable consistent-this*/
		var oType = this;
		/*eslint-enable consistent-this*/
		while (oType.getBaseType()) {
			oType = oType.getBaseType();
		}
		return oType;
	};

	/**
	 * Returns the component type of this type or <code>undefined</code> if this is not an array type.
	 *
	 * @returns {sap.ui.base.DataType|undefined} Component type or <code>undefined</code>
	 * @public
	 */
	DataType.prototype.getComponentType = function() {
		return undefined;
	};

	/**
	 * The default value for this type. Each type must define a default value.
	 * @returns {any} Default value of the data type. The type of the returned value
	 *    must match the JavaScript type of the data type (a string for string types etc.)
	 * @public
	 */
	DataType.prototype.getDefaultValue = function() {
		return undefined;
	};

	/**
	 * Whether this type is an array type.
	 * @returns {boolean} Whether this type is an array type
	 * @public
	 */
	DataType.prototype.isArrayType = function() {
		return false;
	};

	/**
	 * Whether this type is an enumeration type.
	 * @returns {boolean} Whether this type is an enum type
	 * @public
	 */
	DataType.prototype.isEnumType = function() {
		return false;
	};

	/**
	 * Returns the object with keys and values from which this enum type was created
	 * or <code>undefined</code> if this is not an enum type.
	 *
	 * @returns {Object<string,string>|undefined} Object with enum keys and values or <code>undefined</code>
	 * @public
	 */
	DataType.prototype.getEnumValues = function() {
		return undefined;
	};

	/**
	 * Parses the given string value and converts it into the specific data type.
	 * @param {string} sValue String representation for a value of this type
	 * @returns {any} Value in the correct internal format
	 * @public
	 */
	DataType.prototype.parseValue = function(sValue) {
		return sValue;
	};

	/**
	 * Checks whether the given value is valid for this type.
	 *
	 * To be implemented by concrete types.
	 * @param {any} vValue Value to be checked
	 * @returns {boolean} Whether the given value is valid for this data type (without conversion)
	 * @public
	 * @function
	 */
	DataType.prototype.isValid = undefined;
	// Note that <code>isValid</code> must be assigned a falsy value here as it otherwise
	// would be called in addition to any <code>isValid</code> implementation in subtypes.
	// See <code>createType</code> for details.

	/**
	 * Set or unset a normalizer function to be used for values of this data type.
	 *
	 * When a normalizer function has been set, it will be applied to values of this type
	 * whenever {@link #normalize} is called. <code>ManagedObject.prototype.setProperty</code>
	 * calls the <code>normalize</code> method before setting a new value to a property
	 * (normalization is applied on-write, not on-read).
	 *
	 * The <code>fnNormalize</code> function has the signature
	 * <pre>
	 *   fnNormalize(value:any) : any
	 * </pre>
	 * It will be called with a value for this type and should return a normalized
	 * value (which also must be valid for the this type). There's no mean to reject a value.
	 * The <code>this</code> context of the function will be this type.
	 *
	 * This method allows applications or application frameworks to plug-in a generic value
	 * normalization for a type, e.g. to convert all URLs in some app-specific way before
	 * they are applied to controls. It is not intended to break-out of the value range
	 * defined by a type.
	 *
	 * @param {function(any):any} fnNormalizer Function to apply for normalizing
	 * @public
	 */
	DataType.prototype.setNormalizer = function(fnNormalizer) {
		assert(typeof fnNormalizer === "function", "DataType.setNormalizer: fnNormalizer must be a function");
		this._fnNormalizer = typeof fnNormalizer === "function" ? fnNormalizer : undefined;
	};

	/**
	 * Normalizes the given value using the specified normalizer for this data type.
	 *
	 * If no normalizer has been set, the original value is returned.
	 *
	 * @param {any} oValue Value to be normalized
	 * @returns {any} Normalized value
	 * @public
	 */
	DataType.prototype.normalize = function(oValue) {
		return this._fnNormalizer ? this._fnNormalizer(oValue) : oValue;
	};

	function createType(sName, mSettings, oBase) {

		mSettings = mSettings || {};

		// create a new type object with the base type as prototype
		var oBaseObject = oBase || DataType.prototype;
		var oType = Object.create(oBaseObject);

		// getter for the name
		oType.getName = function() {
			return sName;
		};

		// if a default value is specified, create a getter for it
		if ( mSettings.hasOwnProperty("defaultValue") ) {
			var vDefault = mSettings.defaultValue;
			oType.getDefaultValue = function() {
				return vDefault;
			};
		}

		// if a validator is specified either chain it with the base type validator
		// or set it if no base validator exists
		if ( mSettings.isValid ) {
			var fnIsValid = mSettings.isValid;
			oType.isValid = oBaseObject.isValid ? function(vValue) {
				if ( !oBaseObject.isValid(vValue) ) {
					return false;
				}
				return fnIsValid(vValue);
			} : fnIsValid;
		}

		if ( mSettings.parseValue ) {
			oType.parseValue = mSettings.parseValue;
		}

		// return the base type
		oType.getBaseType = function() {
			return oBase;
		};

		return oType;
	}

	var mTypes = {

		"any" :
			createType("any", {
				defaultValue : null,
				isValid : function(vValue) {
					return true;
				}
			}),

		"boolean" :
			createType("boolean", {
				defaultValue : false,
				isValid : function(vValue) {
					return typeof vValue === "boolean";
				},
				parseValue: function(sValue) {
					return sValue == "true";
				}
			}),

		"int" :
			createType("int", {
				defaultValue : 0,
				isValid : function(vValue) {
					return typeof vValue === "number" && (isNaN(vValue) || Math.floor(vValue) == vValue);
				},
				parseValue: function(sValue) {
					return parseInt(sValue);
				}
			}),

		"float" :
			createType("float", {
				defaultValue : 0.0,
				isValid : function(vValue) {
					return typeof vValue === "number";
				},
				parseValue: function(sValue) {
					return parseFloat(sValue);
				}
			}),

		"string" :
			createType("string", {
				defaultValue : "",
				isValid : function(vValue) {
					return typeof vValue === "string" || vValue instanceof String;
				},
				parseValue: function(sValue) {
					return sValue;
				}
			}),

		"object" :
			createType("object", {
				defaultValue : null,
				isValid : function(vValue) {
					return typeof vValue === "object" || typeof vValue === "function";
				},
				parseValue: function(sValue) {
					return sValue ? JSON.parse(sValue) : null;
				}
			}),

		"function" :
			createType("function", {
				defaultValue : null,
				isValid : function(vValue) {
					return vValue == null || typeof vValue === 'function';
				},
				/*
				 * Note: the second parameter <code>_oOptions</code> is a hidden feature for internal use only.
				 * Its structure is subject to change. No code other than the XMLTemplateProcessor must use it.
				 */
				parseValue: function(sValue, _oOptions) {
					if ( sValue === "" ) {
						return undefined;
					}

					if ( !/^\.?[A-Z_\$][A-Z0-9_\$]*(\.[A-Z_\$][A-Z0-9_\$]*)*$/i.test(sValue) ) {
						throw new Error(
							"Function references must consist of dot separated " +
							"simple identifiers (A-Z, 0-9, _ or $) only, but was '" + sValue + "'");
					}

					var fnResult,
						oContext = _oOptions && _oOptions.context,
						oLocals = _oOptions && _oOptions.locals;

					fnResult = resolveReference(sValue,
						Object.assign({".": oContext}, oLocals));

					if ( fnResult && this.isValid(fnResult) ) {
						return fnResult;
					}

					throw new TypeError("The string '" + sValue + "' couldn't be resolved to a function");
				}
			})

	};

	// The generic "array" type must not be exposed by DataType.getType to avoid direct usage
	// as type of a managed property. It is therefore not stored in the mTypes map
	var arrayType = createType("array", {
		defaultValue : []
	});

	function createArrayType(componentType) {
		assert(componentType instanceof DataType, "DataType.<createArrayType>: componentType must be a DataType");

		// create a new type object with the base type as prototype
		var oType = Object.create(DataType.prototype);

		// getter for the name
		oType.getName = function() {
			return componentType.getName() + "[]";
		};

		// getter for component type
		oType.getComponentType = function() {
			return componentType;
		};

		// array validator
		oType.isValid = function(aValues) {
			if (aValues === null) {
				return true;
			}
			if (Array.isArray(aValues)) {
				for (var i = 0; i < aValues.length; i++) {
					if (!componentType.isValid(aValues[i])) {
						return false;
					}
				}
				return true;
			}
			return false;
		};

		// array parser
		oType.parseValue = function(sValue) {
			var aValues = sValue.split(",");
			for (var i = 0; i < aValues.length; i++) {
				aValues[i] = componentType.parseValue(aValues[i]);
			}
			return aValues;
		};

		// is an array type
		oType.isArrayType = function() {
			return true;
		};

		// return the base type
		oType.getBaseType = function() {
			return arrayType;
		};

		return oType;
	}

	const mEnumRegistry = Object.create(null);

	function createEnumType(sTypeName, oEnum) {

		var mValues = {},
			sDefaultValue;
		for (var sName in oEnum) {
			var sValue = oEnum[sName];
			// the first entry will become the default value
			if (!sDefaultValue) {
				sDefaultValue = sValue;
			}
			if ( typeof sValue !== "string") {
				throw new Error("Value " + sValue + " for enum type " + sTypeName + " is not a string");
			}
			// if there are multiple entries with the same value, the one where name
			// and value are matching is taken
			if (!mValues.hasOwnProperty(sValue) || sName == sValue) {
				mValues[sValue] = sName;
			}
		}

		var oType = Object.create(DataType.prototype);

		// getter for the name
		oType.getName = function() {
			return sTypeName;
		};

		// enum validator
		oType.isValid = function(v) {
			return typeof v === "string" && mValues.hasOwnProperty(v);
		};

		// enum parser
		oType.parseValue = function(sValue) {
			return oEnum[sValue];
		};

		// default value
		oType.getDefaultValue = function() {
			return sDefaultValue;
		};

		// return the base type
		oType.getBaseType = function() {
			return mTypes.string;
		};

		// is an enum type
		oType.isEnumType = function() {
			return true;
		};

		// enum values are best represented by the existing global object
		oType.getEnumValues = function() {
			return oEnum;
		};

		return oType;
	}

	/**
	 * Looks up the type with the given name and returns it.
	 *
	 * See {@link topic:ac56d92162ed47ff858fdf1ce26c18c4 Defining Control Properties} for
	 * a list of the built-in primitive types and their semantics.
	 *
	 * The lookup consists of the following steps:
	 * <ul>
	 * <li>When a type with the given name is already known, it will be returned</li>
	 * <li>When the name ends with a pair of brackets (<code>[]</code>), a type with the name
	 *     in front of the brackets (<code>name.slice(0,-2)</code>) will be looked up and an
	 *     array type will be created with the looked-up type as its component type. If the
	 *     component type is <code>undefined</code>, <code>undefined</code> will be returned</li>
	 * <li>When a global property exists with the same name as the type and when the value of that
	 *     property is an instance of <code>DataType</code>, that instance will be returned</li>
	 * <li>When a global property exists with the same name as the type and when the value of that
	 *     property is a plain object (its prototype is <code>Object</code>), then an enum type will
	 *     be created, based on the keys and values in that object. The <code>parseValue</code> method
	 *     of the type will accept any of the keys in the plain object and convert them to the
	 *     corresponding value; <code>isValid</code> will accept any of the values from the plain
	 *     object's keys. The <code>defaultValue</code> will be the value of the first key found in
	 *     the plain object</li>
	 * <li>When a global property exist with any other, non-falsy value, a warning is logged and the
	 *     primitive type 'any' is returned</li>
	 * <li>If no such global property exist, an error is logged and <code>undefined</code>
	 *     is returned</li>
	 * </ul>
	 *
	 * <b<Note:</b> UI Libraries and even components can introduce additional types. This method
	 * only checks for types that either have been defined already, or that describe arrays of
	 * values of an already defined type or types whose name matches the global name of a plain
	 * object (containing enum keys and values). This method doesn't try to load modules that
	 * might contain type definitions. So before being able to lookup and use a specific type,
	 * the module containing its definition has to be loaded. For that reason it is suggested that
	 * controls (or <code>ManagedObject</code> classes in general) declare a dependency to all
	 * modules (typically <code>some/lib/library.js</code> modules) that contain the type definitions
	 * needed by the specific control or class definition.
	 *
	 * @param {string} sTypeName Qualified name of the type to retrieve
	 * @returns {sap.ui.base.DataType|undefined} Type object or <code>undefined</code> when
	 *     no such type has been defined yet
	 * @public
	 */
	DataType.getType = function(sTypeName) {
		assert( sTypeName && typeof sTypeName === 'string', "sTypeName must be a non-empty string");

		var oType = mTypes[sTypeName];
		if ( !(oType instanceof DataType) ) {
			// check for array types
			if (sTypeName.indexOf("[]", sTypeName.length - 2) > 0) {
				var sComponentTypeName = sTypeName.slice(0, -2),
					oComponentType = this.getType(sComponentTypeName);
				oType = oComponentType && createArrayType(oComponentType);
				if ( oType ) {
					mTypes[sTypeName] = oType;
				}
			} else if ( sTypeName !== 'array') {
				// check if we have a valid pre-registered enum
				oType = mEnumRegistry[sTypeName];

				/**
				 * If an enum was not registered beforehand (either explicitly via registerEnum or
				 * via a Proxy in the library namespace), we have to look it up in the global object.
				 * @deprecated since 1.120
				 */
				if (oType == null) {
					oType = ObjectPath.get(sTypeName);
					if (oType != null) {
						Log.error(`[DEPRECATED] The type '${sTypeName}' was accessed via globals. Defining types via globals is deprecated. ` +
						`In case the referenced type is an enum: require the module 'sap/ui/base/DataType' and call the static 'DataType.registerEnum' API. ` +
						`In case the referenced type is non-primitive, please note that only primitive types (and those derived from them) are supported for ManagedObject properties. ` +
						`If the given type is an interface or a subclass of ManagedObject, you can define a "0..1" aggregation instead of a property`);
					}
				}

				if ( oType instanceof DataType ) {
					mTypes[sTypeName] = oType;
				} else if ( isPlainObject(oType) ) {
					oType = mTypes[sTypeName] = createEnumType(sTypeName, oType);
					delete mEnumRegistry[sTypeName];
				} else if ( oType ) {
					future.warningThrows("'" + sTypeName + "' is not a valid data type. Falling back to type 'any'.");
					oType = mTypes.any;
				} else {
					future.errorThrows("data type '" + sTypeName + "' could not be found.");
					oType = undefined;
				}
			}
		}
		return oType;
	};

	/**
	 * Derives a new type from a given base type.
	 *
	 * Example:<br>
	 * <pre>
	 *
	 *   var fooType = DataType.createType('foo', {
	 *       isValid : function(vValue) {
	 *           return /^(foo(bar)?)$/.test(vValue);
	 *       }
	 *   }, DataType.getType('string'));
	 *
	 *   fooType.isValid('foo'); // true
	 *   fooType.isValid('foobar'); // true
	 *   fooType.isValid('==foobar=='); // false
	 *
	 * </pre>
	 *
	 * If <code>mSettings</code> contains an implementation for <code>isValid</code>,
	 * then the validity check of the newly created type will first execute the check of the
	 * base type and then call the given <code>isValid</code> function.
	 *
	 * Array types and enumeration types cannot be created with this method. They're created
	 * on-the-fly by {@link #.getType DataType.getType} when such a type is looked up.
	 *
	 * <b>Note:</b> The creation of new primitive types is not supported. When a type is created
	 * without a base type, it is automatically derived from the primitive type <code>any</code>.
	 *
	 * <b>Note:</b> If a type has to be used in classes, then the implementation of
	 * <code>isValid</code> must exactly have the structure shown in the example above (single
	 * return statement, regular expression literal of the form <code>/^(...)$/</code>, calling
	 * <code>/regex/.test()</code> on the given value).
	 * Only the inner part of the regular expression literal can be different.
	 *
	 * @param {string} sName Unique qualified name of the new type
	 * @param {object} [mSettings] Settings for the new type
	 * @param {any} [mSettings.defaultValue] Default value for the type (inherited if not given)
	 * @param {function} [mSettings.isValid] Additional validity check function for values of the
	 *                       type (inherited if not given)
	 * @param {function} [mSettings.parseValue] Parse function that converts a locale independent
	 *                       string into a value of the type (inherited if not given)
	 * @param {sap.ui.base.DataType|string} [vBase='any'] Base type for the new type
	 * @returns {sap.ui.base.DataType} The newly created type object
	 * @public
	 */
	DataType.createType = function(sName, mSettings, vBase) {
		assert(typeof sName === "string" && sName, "DataType.createType: type name must be a non-empty string");
		assert(vBase == null || vBase instanceof DataType || typeof vBase === "string" && vBase,
				"DataType.createType: base type must be empty or a DataType or a non-empty string");
		if ( /[\[\]]/.test(sName) ) {
			future.errorThrows(
				"DataType.createType: array types ('something[]') must not be created with createType, " +
				"they're created on-the-fly by DataType.getType");
		}
		if ( typeof vBase === "string" ) {
			vBase = DataType.getType(vBase);
		}
		vBase = vBase || mTypes.any;
		if ( vBase.isArrayType() || vBase.isEnumType() ) {
			future.errorThrows("DataType.createType: base type must not be an array- or enum-type");
		}
		if ( sName === 'array' || mTypes[sName] instanceof DataType ) {
			if ( sName === 'array' || mTypes[sName].getBaseType() == null ) {
				throw new Error("DataType.createType: primitive or hidden type " + sName + " can't be re-defined");
			}
			future.warningThrows("DataTypes.createType: type " + sName + " is redefined. " +
				"This is an unsupported usage of DataType and might cause issues." );
		}
		var oType = mTypes[sName] = createType(sName, mSettings, vBase);
		return oType;
	};


	// ---- minimal support for interface types -------------------------------------------------------------------

	var oInterfaces = new Set();

	/**
	 * Registers the given array of type names as known interface types.
	 * Only purpose is to enable the {@link #isInterfaceType} check.
	 * @param {string[]} aTypes interface types to be registered
	 * @private
	 * @ui5-restricted sap.ui.core.Core
	 */
	DataType.registerInterfaceTypes = function(aTypes) {
		aTypes.forEach(function(sType) {
			oInterfaces.add(sType);

			/**
			 * @deprecated
			 */
			(() => {
				// Defining the interface on global namespace for compatibility reasons.
				// This has never been a public feature and it is strongly discouraged it be relied upon.
				// An interface must always be referenced by a string literal, not via the global namespace.
				ObjectPath.set(sType, sType);
			})();
		});
	};

	/**
	 * Registers an enum under the given name.
	 * With version 2.0, registering an enum becomes mandatory when said enum is to be used in
	 * properties of a {@link sap.ui.base.ManagedObject ManagedObject} subclass.
	 *
	 * Example:<br>
	 * <pre>
	 *    DataType.registerEnum("my.enums.Sample", {
	 *       "A": "A",
	 *       "B": "B",
	 *       ...
	 *    });
	 * </pre>
	 *
	 * @param {string} sTypeName the type name in dot syntax, e.g. sap.ui.my.EnumType
	 * @param {object} mContent the enum content
	 * @public
	 * @since 1.120.0
	 */
	DataType.registerEnum = function(sTypeName, mContent) {
		mEnumRegistry[sTypeName] = mContent;
	};

	/**
	 * Checks if the given object contains only static content
	 * and can be regarded as an enum candidate.
	 *
	 * @param {object} oObject the enum candidate
	 * @returns {boolean} whether the given object can be regarded as an enum candidate
	 * @private
	 * @ui5-restricted sap.ui.core.Lib
	 */
	DataType._isEnumCandidate = function(oObject) {
		return !Object.keys(oObject).some((key) => {
			const propertyType = typeof oObject[key];
			return propertyType === "object" || propertyType === "function";
		});
	};

	/**
	 * @param {string} sType name of type to check
	 * @returns {boolean} whether the given type is known to be an interface type
	 * @private
	 * @ui5-restricted sap.ui.base.ManagedObject
	 */
	DataType.isInterfaceType = function(sType) {
		return oInterfaces.has(sType);
	};


	return DataType;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.base.Event
sap.ui.predefine("sap/ui/base/Event", ['./Object', "sap/base/assert"],
	function(BaseObject, assert) {
	"use strict";


	/**
	 *
	 * Creates an event with the given <code>sId</code>, linked to the provided <code>oSource</code> and enriched with the <code>mParameters</code>.
	 * @class An Event object consisting of an ID, a source and a map of parameters.
	 * Implements {@link sap.ui.base.Poolable} and therefore an event object in the event handler will be reset by {@link sap.ui.base.ObjectPool} after the event handler is done.
	 *
	 * @param {string} sId The ID of the event
	 * @param {SourceType} oSource Source of the event
	 * @param {ParamsType} oParameters Parameters for this event
	 *
	 * @extends sap.ui.base.Object
	 * @implements sap.ui.base.Poolable
	 * @author SAP SE
	 * @version 1.125.0
	 * @alias sap.ui.base.Event
	 * @public
	 * @template {Object<string,any>} [ParamsType=object]
	 * @template {sap.ui.base.EventProvider} [SourceType=sap.ui.base.EventProvider]
	 */
	var Event = BaseObject.extend("sap.ui.base.Event", /** @lends sap.ui.base.Event.prototype */ {
		constructor : function(sId, oSource, oParameters) {

			BaseObject.apply(this);

			if (arguments.length > 0) {
				this.init(sId, oSource, oParameters);
			}

		}
	});

	/**
	 * Init this event with its data.
	 *
	 * The <code>init</code> method is called by an object pool when the
	 * object is (re-)activated for a new caller.
	 *
	 * When no <code>oParameters</code> are given, an empty object is used instead.
	 *
	 * @param {string} sId ID of the event
	 * @param {SourceType} oSource Source of the event
	 * @param {ParamsType} [oParameters] The event parameters
	 *
	 * @protected
	 *
	 * @see sap.ui.base.Poolable.prototype#init
	 */
	Event.prototype.init = function(sId, oSource, oParameters) {
		assert(typeof sId === "string", "Event.init: sId must be a string");
		assert(BaseObject.isObjectA(oSource, 'sap.ui.base.EventProvider'), "Event.init: oSource must be an EventProvider");

		this.sId = sId;
		this.oSource = oSource;
		this.mParameters = oParameters || {};
		this.bCancelBubble = false;
		this.bPreventDefault = false;
	};

	/**
	 * Reset event data, needed for pooling.
	 *
	 * @see sap.ui.base.Poolable.prototype#reset
	 * @protected
	 */
	Event.prototype.reset = function() {
		this.sId = "";
		this.oSource = null;
		this.mParameters = null;
		this.bCancelBubble = false;
		this.bPreventDefault = false;
	};

	/**
	 * Returns the id of the event.
	 *
	 * @returns {string} The ID of the event
	 * @public
	 */
	Event.prototype.getId = function() {

		return this.sId;

	};

	/**
	 * Returns the event provider on which the event was fired.
	 *
	 * @returns {T} The source of the event
	 * @public
	 * @template {SourceType} [T]
	 */
	Event.prototype.getSource = function() {

		return this.oSource;

	};

	/**
	 * Returns an object with all parameter values of the event.
	 *
	 * @returns {ParamsType} All parameters of the event
	 * @public
	 */
	Event.prototype.getParameters = function() {

		return this.mParameters;

	};

	/**
	 * Returns the value of the parameter with the given name.
	 *
	 * @param {string} sName Name of the parameter to return
	 * @return {any} Value of the named parameter
	 * @public
	 */
	Event.prototype.getParameter = function(sName) {

		assert(typeof sName === "string" && sName, "Event.getParameter: sName must be a non-empty string");

		return this.mParameters[sName];

	};

	/**
	 * Cancel bubbling of the event.
	 *
	 * <b>Note:</b> This function only has an effect if the bubbling of the event is supported by the event source.
	 *
	 * @public
	 */
	Event.prototype.cancelBubble = function() {

		this.bCancelBubble = true;

	};

	/**
	 * Prevent the default action of this event.
	 *
	 * <b>Note:</b> This function only has an effect if preventing the default action of the event is supported by the event source.
	 *
	 * @public
	 */
	Event.prototype.preventDefault = function() {

		this.bPreventDefault = true;

	};



	return Event;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.base.EventProvider
sap.ui.predefine("sap/ui/base/EventProvider", ['./Event', './Object', "sap/base/assert", "sap/base/Log"],
	function(Event, BaseObject, assert, Log) {
	"use strict";


	/**
	 * Creates an instance of EventProvider.
	 *
	 * @class Provides eventing capabilities for objects like attaching or detaching event handlers for events which are notified when events are fired.
	 *
	 * @extends sap.ui.base.Object
	 * @author SAP SE
	 * @version 1.125.0
	 * @public
	 * @alias sap.ui.base.EventProvider
	 */
	var EventProvider = BaseObject.extend("sap.ui.base.EventProvider", /** @lends sap.ui.base.EventProvider.prototype */ {

		constructor : function() {

			BaseObject.call(this);

			/**
			 * A map of arrays of event registrations keyed by the event names
			 * @private
			 */
			this.mEventRegistry = {};

		}

	});

	var EVENT__LISTENERS_CHANGED = "EventHandlerChange";

	/**
	 * Map of event names and ids, that are provided by this class
	 * @private
	 * @static
	 */
	EventProvider.M_EVENTS = {EventHandlerChange:EVENT__LISTENERS_CHANGED};

	/**
	 * Attaches an event handler to the event with the given identifier.
	 *
	 * @param {string}
	 *            sEventId The identifier of the event to listen for
	 * @param {object}
	 *            [oData] An object that will be passed to the handler along with the event object when the event is fired
	 * @param {function}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the event provider instance. The event
	 *                       object ({@link sap.ui.base.Event}) is provided as first argument of the handler. Handlers must not change
	 *                       the content of the event. The second argument is the specified <code>oData</code> instance (if present).
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the event provider.
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	EventProvider.prototype.attachEvent = function(sEventId, oData, fnFunction, oListener) {
		var mEventRegistry = this.mEventRegistry;
		assert(typeof (sEventId) === "string" && sEventId, "EventProvider.attachEvent: sEventId must be a non-empty string");
		if (typeof (oData) === "function") {
		//one could also increase the check in the line above
		//if(typeof(oData) === "function" && oListener === undefined) {
			oListener = fnFunction;
			fnFunction = oData;
			oData = undefined;
		}
		assert(typeof (fnFunction) === "function", "EventProvider.attachEvent: fnFunction must be a function");
		assert(!oListener || typeof (oListener) === "object", "EventProvider.attachEvent: oListener must be empty or an object");

		oListener = oListener === this ? undefined : oListener;

		var aEventListeners = mEventRegistry[sEventId];
		if ( !Array.isArray(aEventListeners) ) {
			aEventListeners = mEventRegistry[sEventId] = [];
		}

		aEventListeners.push({oListener:oListener, fFunction:fnFunction, oData: oData});

		// Inform interested parties about changed EventHandlers
		if ( mEventRegistry[EVENT__LISTENERS_CHANGED] ) {
			this.fireEvent(EVENT__LISTENERS_CHANGED, {EventId: sEventId, type: 'listenerAttached', listener: oListener, func: fnFunction, data: oData});
		}

		return this;
	};

	/**
	 * Attaches an event handler, called one time only, to the event with the given identifier.
	 *
	 * When the event occurs, the handler function is called and the handler registration is automatically removed afterwards.
	 *
	 * @param {string}
	 *            sEventId The identifier of the event to listen for
	 * @param {object}
	 *            [oData] An object that will be passed to the handler along with the event object when the event is fired
	 * @param {function}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the event provider instance. The event
	 *                       object ({@link sap.ui.base.Event}) is provided as first argument of the handler. Handlers must not change
	 *                       the content of the event. The second argument is the specified <code>oData</code> instance (if present).
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the event provider.
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	EventProvider.prototype.attachEventOnce = function(sEventId, oData, fnFunction, oListener) {
		if (typeof (oData) === "function") {
			oListener = fnFunction;
			fnFunction = oData;
			oData = undefined;
		}
		assert(typeof (fnFunction) === "function", "EventProvider.attachEventOnce: fnFunction must be a function");
		var fnOnce = function() {
			this.detachEvent(sEventId, fnOnce);  // ‘this’ is always the control, due to the context ‘undefined’ in the attach call below
			fnFunction.apply(oListener || this, arguments);  // needs to do the same resolution as in fireEvent
		};
		fnOnce.oOriginal = {
			fFunction: fnFunction,
			oListener: oListener,
			oData: oData
		};
		this.attachEvent(sEventId, oData, fnOnce, undefined); // a listener of ‘undefined’ enforce a context of ‘this’ even after clone
		return this;
	};

	/**
	 * Removes a previously attached event handler from the event with the given identifier.
	 *
	 * The passed parameters must match those used for registration with {@link #attachEvent} beforehand.
	 *
	 * @param {string}
	 *            sEventId The identifier of the event to detach from
	 * @param {function}
	 *            fnFunction The handler function to detach from the event
	 * @param {object}
	 *            [oListener] The object that wanted to be notified when the event occurred
	 * @returns {this} Returns <code>this</code> to allow method chaining
	 * @public
	 */
	EventProvider.prototype.detachEvent = function(sEventId, fnFunction, oListener) {
		var mEventRegistry = this.mEventRegistry;
		assert(typeof (sEventId) === "string" && sEventId, "EventProvider.detachEvent: sEventId must be a non-empty string" );
		assert(typeof (fnFunction) === "function", "EventProvider.detachEvent: fnFunction must be a function");
		assert(!oListener || typeof (oListener) === "object", "EventProvider.detachEvent: oListener must be empty or an object");

		var aEventListeners = mEventRegistry[sEventId];
		if ( !Array.isArray(aEventListeners) ) {
			return this;
		}

		var oFound, oOriginal;

		oListener = oListener === this ? undefined : oListener;

		//PERFOPT use array. remember length to not re-calculate over and over again
		for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
			//PERFOPT check for identity instead of equality... avoid type conversion
			if (aEventListeners[i].fFunction === fnFunction && aEventListeners[i].oListener === oListener) {
				oFound = aEventListeners[i];
				aEventListeners.splice(i,1);
				break;
			}
		}
		// If no listener was found, look for original listeners of attachEventOnce
		if (!oFound) {
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				oOriginal = aEventListeners[i].fFunction.oOriginal;
				if (oOriginal && oOriginal.fFunction === fnFunction && oOriginal.oListener === oListener) {
					oFound = oOriginal;
					aEventListeners.splice(i,1);
					break;
				}
			}
		}
		// If we just deleted the last registered EventHandler, remove the whole entry from our map.
		if (aEventListeners.length == 0) {
			delete mEventRegistry[sEventId];
		}

		if (oFound && mEventRegistry[EVENT__LISTENERS_CHANGED] ) {
			// Inform interested parties about changed EventHandlers
			this.fireEvent(EVENT__LISTENERS_CHANGED, {EventId: sEventId, type: 'listenerDetached', listener: oFound.oListener, func: oFound.fFunction, data: oFound.oData});
		}

		return this;
	};

	/**
	 * Fires an {@link sap.ui.base.Event event} with the given settings and notifies all attached event handlers.
	 *
	 * @param {string}
	 *            sEventId The identifier of the event to fire
	 * @param {object}
	 *            [oParameters] Parameters which should be carried by the event
	 * @param {boolean}
	 *            [bAllowPreventDefault] Defines whether function <code>preventDefault</code> is supported on the fired event
	 * @param {boolean}
	 *            [bEnableEventBubbling] Defines whether event bubbling is enabled on the fired event. Set to <code>true</code> the event is also forwarded to the parent(s)
	 *                                   of the event provider ({@link #getEventingParent}) until the bubbling of the event is stopped or no parent is available anymore.
	 * @return {this|boolean} Returns <code>this</code> to allow method chaining. When <code>preventDefault</code> is supported on the fired event
	 *                                             the function returns <code>true</code> if the default action should be executed, <code>false</code> otherwise.
	 * @protected
	 */
	EventProvider.prototype.fireEvent = function(sEventId, oParameters, bAllowPreventDefault, bEnableEventBubbling) {

		// get optional parameters right
		if (typeof oParameters === "boolean") {
			bEnableEventBubbling = bAllowPreventDefault;
			bAllowPreventDefault = oParameters;
		}

		/* eslint-disable consistent-this */
		var oProvider = this,
		/* eslint-enable consistent-this */
			bPreventDefault = false,
			aEventListeners, oEvent, i, iL, oInfo;

		do {
			aEventListeners = oProvider.mEventRegistry[sEventId];

			if ( Array.isArray(aEventListeners) ) {

				// avoid issues with 'concurrent modification' (e.g. if an event listener unregisters itself).
				aEventListeners = aEventListeners.slice();
				oEvent = new Event(sEventId, this, oParameters);

				for (i = 0, iL = aEventListeners.length; i < iL; i++) {
					oInfo = aEventListeners[i];
					const vResult = oInfo.fFunction.call(oInfo.oListener || oProvider, oEvent, oInfo.oData);
					// proper error handling for rejected promises
					if (typeof vResult?.then === "function") {
						vResult.catch?.((err) => {
							Log.error(`EventProvider.fireEvent: Event Listener for event '${sEventId}' failed during execution.`, err);
						});
					}
				}

				bEnableEventBubbling = bEnableEventBubbling && !oEvent.bCancelBubble;
			}

			oProvider = oProvider.getEventingParent();

		} while (bEnableEventBubbling && oProvider);

		if ( oEvent ) {
			// remember 'prevent default' state before returning event to the pool
			bPreventDefault = oEvent.bPreventDefault;
		}

		// return 'execute default' flag only when 'prevent default' has been enabled, otherwise return 'this' (for compatibility)
		return bAllowPreventDefault ? !bPreventDefault : this;
	};

	/**
	 * Returns whether there are any registered event handlers for the event with the given identifier.
	 *
	 * @param {string} sEventId The identifier of the event
	 * @return {boolean} Whether there are any registered event handlers
	 * @protected
	 */
	EventProvider.prototype.hasListeners = function(sEventId) {
		return !!this.mEventRegistry[sEventId];
	};

	/**
	 * Returns the list of events currently having listeners attached.
	 *
	 * Introduced for lightspeed support to ensure that only relevant events are attached to the LS-world.
	 *
	 * This is a static method to avoid the pollution of the Element/Control namespace.
	 * As the callers are limited and known and for performance reasons the internal event registry
	 * is returned. It contains more information than necessary, but needs no expensive conversion.
	 *
	 * @param {sap.ui.base.EventProvider} oEventProvider The event provider to get the registered events for
	 * @return {object} the list of events currently having listeners attached
	 * @private
	 * @static
	 */
	EventProvider.getEventList = function(oEventProvider) {
		return oEventProvider.mEventRegistry;
	};

	/**
	 * Checks whether the given event provider has the given listener registered for the given event.
	 *
	 * Returns true if function and listener object both match the corresponding parameters of
	 * at least one listener registered for the named event.
	 *
	 * @param {sap.ui.base.EventProvider}
	 *            oEventProvider The event provider to get the registered events for
	 * @param {string}
	 *            sEventId The identifier of the event to check listeners for
	 * @param {function}
	 *            fnFunction The handler function to check for
	 * @param {object}
	 *            [oListener] The listener object to check for
	 * @return {boolean} Returns whether a listener with the same parameters exists
	 * @private
	 * @ui5-restricted sap.ui.base, sap.ui.core
	 */
	EventProvider.hasListener = function (oEventProvider, sEventId, fnFunction, oListener) {
		assert(typeof (sEventId) === "string" && sEventId, "EventProvider.hasListener: sEventId must be a non-empty string" );
		assert(typeof (fnFunction) === "function", "EventProvider.hasListener: fnFunction must be a function");
		assert(!oListener || typeof (oListener) === "object", "EventProvider.hasListener: oListener must be empty or an object");

		var aEventListeners = oEventProvider && oEventProvider.mEventRegistry[sEventId];
		if ( aEventListeners ) {
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				if (aEventListeners[i].fFunction === fnFunction && aEventListeners[i].oListener === oListener) {
					return true;
				}
			}
		}

		return false;
	};

	/**
	 * Returns the parent in the eventing hierarchy of this object.
	 *
	 * Per default this returns null, but if eventing is used in objects, which are hierarchically
	 * structured, this can be overwritten to make the object hierarchy visible to the eventing and
	 * enables the use of event bubbling within this object hierarchy.
	 *
	 * @return {sap.ui.base.EventProvider|null} The parent event provider
	 * @protected
	 */
	EventProvider.prototype.getEventingParent = function() {
		return null;
	};

	/**
	 * Returns a string representation of this object.
	 *
	 * In case there is no class or id information, a simple static string is returned.
	 * Subclasses should override this method.
	 *
	 * @return {string} A string description of this event provider
	 * @public
	 */
	EventProvider.prototype.toString = function() {
		if ( this.getMetadata ) {
			return "EventProvider " + this.getMetadata().getName();
		} else {
			return "EventProvider";
		}
	};


	/**
	 * Cleans up the internal structures and removes all event handlers.
	 *
	 * The object must not be used anymore after destroy was called.
	 *
	 * @see sap.ui.base.Object#destroy
	 * @public
	 */
	EventProvider.prototype.destroy = function() {
		this.mEventRegistry = {};
		BaseObject.prototype.destroy.apply(this, arguments);
	};


	return EventProvider;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.base.Metadata
sap.ui.predefine("sap/ui/base/Metadata", [
	'sap/base/util/ObjectPath',
	"sap/base/assert",
	"sap/base/Log",
	"sap/base/util/array/uniqueSort"
],
	function(ObjectPath, assert, Log, uniqueSort) {
	"use strict";

	function isFunction(obj) {
		return typeof obj === "function";
	}

	/**
	 * Creates a new metadata object from the given static infos.
	 *
	 * <b>Note:</b> Throughout this class documentation, the described subclass of Object
	 * is referenced as <i>the described class</i>.
	 *
	 * @param {string} sClassName Fully qualified name of the described class
	 * @param {object} oClassInfo Info to construct the class and its metadata from
	 * @param {sap.ui.base.Object.MetadataOptions} [oClassInfo.metadata]
	 *  The metadata object describing the class
	 *
	 * @class Metadata for a class.
	 * @author Frank Weigel
	 * @version 1.125.0
	 * @since 0.8.6
	 * @public
	 * @alias sap.ui.base.Metadata
	 */
	var Metadata = function(sClassName, oClassInfo) {

		assert(typeof sClassName === "string" && sClassName, "Metadata: sClassName must be a non-empty string");
		assert(typeof oClassInfo === "object", "Metadata: oClassInfo must be empty or an object");

		/**
		 * Support for old usage of Metadata.
		 * @deprecated Since 1.3.1
		 */
		if ( !oClassInfo || typeof oClassInfo.metadata !== "object" ) {
			oClassInfo = {
				metadata : oClassInfo || {},
				// retrieve class by its name. Using a lookup costs time but avoids the need for redundant arguments to this function
				constructor : ObjectPath.get(sClassName) // legacy-relevant, code path not used by extend call
			};
			oClassInfo.metadata.__version = 1.0;
		}

		oClassInfo.metadata ??= {};
		oClassInfo.metadata.__version = oClassInfo.metadata.__version || 2.0;
		if ( !isFunction(oClassInfo.constructor) ) {
			throw Error("constructor for class " + sClassName + " must have been declared before creating metadata for it");
		}

		// invariant: oClassInfo exists, oClassInfo.metadata exists, oClassInfo.constructor exists
		this._sClassName = sClassName;
		this._oClass = oClassInfo.constructor;
		this.extend(oClassInfo);
	};

	/**
	 * @private
	 * @final
	 */
	Metadata.prototype.extend = function(oClassInfo) {
		this.applySettings(oClassInfo);
		this.afterApplySettings();
	};

	/**
	 * @private
	 * @since 1.3.1
	 */
	Metadata.prototype.applySettings = function(oClassInfo) {

		var that = this,
			oStaticInfo = oClassInfo.metadata,
			oPrototype;

		if ( oStaticInfo.baseType ) {
			var oParentClass,
				bValidBaseType = isFunction(oStaticInfo.baseType);

			if ( bValidBaseType ) {
				oParentClass = oStaticInfo.baseType;
				if ( !isFunction(oParentClass.getMetadata) ) {
					throw new TypeError("baseType must be a UI5 class with a static getMetadata function");
				}
			}

			/**
			 * @deprecated
			 */
			if ( !bValidBaseType ) {
				// lookup base class by its name - same reasoning as above
				oParentClass = ObjectPath.get(oStaticInfo.baseType); // legacy-relevant, code path not used by extend call
				if ( !isFunction(oParentClass) ) {
					Log.fatal("base class '" + oStaticInfo.baseType + "' does not exist");
				}
			}

			// link metadata with base metadata
			if ( oParentClass.getMetadata ) {
				this._oParent = oParentClass.getMetadata();
				assert(oParentClass === oParentClass.getMetadata().getClass(), "Metadata: oParentClass must match the class in the parent metadata");
			} else {
				// fallback, if base class has no metadata - can only happen if baseType is a string
				this._oParent = new Metadata(oStaticInfo.baseType, {});
			}
		} else {
			this._oParent = undefined;
		}

		this._bAbstract = !!oStaticInfo["abstract"];
		this._bFinal = !!oStaticInfo["final"];
		this._sStereotype = oStaticInfo.stereotype || (this._oParent ? this._oParent._sStereotype : "object");
		this._bDeprecated = !!oStaticInfo["deprecated"];

		// handle interfaces
		this._aInterfaces = oStaticInfo.interfaces || [];

		// take over metadata from static info
		this._aPublicMethods = oStaticInfo.publicMethods || [];

		// interfaces info possibly not unique
		this._bInterfacesUnique = false;

		// enrich prototype
		oPrototype = this._oClass.prototype;
		for ( var n in oClassInfo ) {
			if ( n !== "metadata" && n !== "constructor") {
				oPrototype[n] = oClassInfo[n];
				if ( !n.match(/^_|^on|^init$|^exit$/)) {
					// TODO hard coded knowledge about event handlers ("on") and about init/exit hooks is not nice....
					that._aPublicMethods.push(n);
				}
			}
		}
	};

	/**
	 * Called after new settings have been applied.
	 *
	 * Typically, this method is used to do some cleanup (e.g. uniqueness)
	 * or to calculate an optimized version of some data.
	 * @private
	 * @since 1.3.1
	 */
	Metadata.prototype.afterApplySettings = function() {
		// create the flattened "all" view
		if ( this._oParent ) {
			this._aAllPublicMethods = this._oParent._aAllPublicMethods.concat(this._aPublicMethods);
			this._bInterfacesUnique = false;
		} else {
			this._aAllPublicMethods = this._aPublicMethods;
		}

	};

	/**
	 * Stereotype of the described class.
	 *
	 * @experimental might be enhanced to a set of stereotypes
	 * @private
	 * @ui5-restricted
	 */
	Metadata.prototype.getStereotype = function() {
		return this._sStereotype;
	};

	/**
	 * Returns the fully qualified name of the described class
	 * @return {string} name of the described class
	 * @public
	 */
	Metadata.prototype.getName = function() {
		return this._sClassName;
	};

	/**
	 * Returns the (constructor of the) described class
	 * @return {function(new:sap.ui.base.Object)} class described by this metadata
	 * @public
	 */
	Metadata.prototype.getClass = function() {
		return this._oClass;
	};

	/**
	 * Returns the metadata object of the base class of the described class
	 * or undefined if the class has no (documented) base class.
	 *
	 * @return {sap.ui.base.Metadata | undefined} metadata of the base class
	 * @public
	 */
	Metadata.prototype.getParent = function() {
		return this._oParent;
	};

	/**
	 * Removes duplicate names in place from the interfaces and public methods members of this metadata object.
	 *
	 * @private
	 */
	Metadata.prototype._dedupInterfaces = function () {
		if (!this._bInterfacesUnique) {
			uniqueSort(this._aInterfaces);
			uniqueSort(this._aPublicMethods);
			uniqueSort(this._aAllPublicMethods);
			this._bInterfacesUnique = true;
		}
	};

	/**
	 * Returns an array with the names of the public methods declared by the described class, methods of
	 * ancestors are not listed.
	 *
	 * @return {string[]} array with names of public methods declared by the described class
	 * @deprecated As of 1.58, this method should not be used for productive code. The accuracy of the returned
	 *       information highly depends on the concrete class and is not actively monitored. There might be
	 *       more public methods or some of the returned methods might not really be intended for public use.
	 *       In general, pure visibility information should not be exposed in runtime metadata but be part of the
	 *       documentation.
	 *       Subclasses of <code>sap.ui.base.Object</code> might decide to provide runtime metadata describing
	 *       their public API, but this then should not be backed by this method.
	 *       See {@link sap.ui.core.mvc.ControllerMetadata#getAllMethods} for an example.
	 * @public
	 */
	Metadata.prototype.getPublicMethods = function() {
		this._dedupInterfaces();
		return this._aPublicMethods;
	};

	/**
	 * Returns an array with the names of all public methods declared by the described class
	 * and all its ancestors classes.
	 *
	 * @return {string[]} array with names of all public methods provided by the described class and its ancestors
	 * @deprecated As of 1.58, this method should not be used for productive code. The accuracy of the returned
	 *       information highly depends on the concrete class and is not actively monitored. There might be
	 *       more public methods or some of the returned methods might not really be intended for public use.
	 *       In general, pure visibility information should not be exposed in runtime metadata but be part of the
	 *       documentation.
	 *       Subclasses of <code>sap.ui.base.Object</code> might decide to provide runtime metadata describing
	 *       their public API, but this then should not be backed by this method.
	 *       See {@link sap.ui.core.mvc.ControllerMetadata#getAllMethods} for an example.
	 * @public
	 */
	Metadata.prototype.getAllPublicMethods = function() {
		this._dedupInterfaces();
		return this._aAllPublicMethods;
	};

	/**
	 * Returns the names of interfaces implemented by the described class.
	 * As the representation of interfaces is not clear yet, this method is still private.
	 *
	 * @return {string} array of names of implemented interfaces
	 * @private
	 */
	Metadata.prototype.getInterfaces = function() {
		this._dedupInterfaces();
		return this._aInterfaces;
	};

	/**
	 * Checks whether the described class or one of its ancestor classes implements the given interface.
	 *
	 * @param {string} sInterface name of the interface to test for (in dot notation)
	 * @return {boolean} whether this class implements the interface
	 * @public
	 */
	Metadata.prototype.isInstanceOf = function(sInterface) {
		if ( this._oParent ) {
			if ( this._oParent.isInstanceOf(sInterface) ) {
				return true;
			}
		}

		var a = this._aInterfaces;
		for (var i = 0,l = a.length; i < l; i++) {
			// FIXME doesn't handle interface inheritance (requires object representation for interfaces)
			if ( a[i] === sInterface ) {
				return true;
			}
		}

		return false;
	};

	/*
	 * Lazy calculation of the set of implemented types.
	 *
	 * A calculation function is configured as getter for the <code>_mImplementedTypes</code>
	 * on the prototype object. On first call for a metadata instance, it collects
	 * the implemented types (classes, interfaces) from the described class and
	 * any base classes and writes it to the property <code>_mImplementedTypes</code> of the
	 * current instance of metadata. Future read access to the property will immediately
	 * return the instance property and not call the calculation function again.
	 */
	Object.defineProperty(Metadata.prototype, "_mImplementedTypes", {
		get: function() {

			if ( this === Metadata.prototype ) {
				throw new Error("sap.ui.base.Metadata: The '_mImplementedTypes' property must not be accessed on the prototype");
			}

			// create map of types, including inherited types
			// Note: to save processing time and memory, the inherited types are merged via the prototype chain of 'result'
			var result = Object.create(this._oParent ? this._oParent._mImplementedTypes : null);
			/*
			 * Flat alternative:
			 * var result = Object.create(null);
			 * if ( this._oParent ) {
			 *   Object.assign(result, this._oParent._mImplementedTypes);
			 * }
			 */

			// add own class
			result[this._sClassName] = true;

			// additionally collect interfaces
			var aInterfaces = this._aInterfaces,
				i = aInterfaces.length;
			while ( i-- > 0 ) {
				if ( !result[aInterfaces[i]] ) {
					// take care to write property only if it hasn't been set already
					result[aInterfaces[i]] = true;
				}
			}

			// write instance property, hiding the getter on the prototype
			Object.defineProperty(this, "_mImplementedTypes", {
				value: Object.freeze(result),
				writable: false,
				configurable: false
			});

			return result;
		},
		configurable: true
	});

	/**
	 * Checks whether the class described by this metadata object is of the named type.
	 *
	 * This check is solely based on the type names as declared in the class metadata.
	 * It compares the given <code>vTypeName</code> with the name of this class, with the
	 * names of any base class of this class and with the names of all interfaces
	 * implemented by any of the aforementioned classes.
	 *
	 * Instead of a single type name, an array of type names can be given and the method
	 * will check if this class is of any of the listed types (logical or).
	 *
	 * Should the UI5 class system in future implement additional means of associating classes
	 * with type names (e.g. by introducing mixins), then this method might detect matches
	 * for those names as well.
	 *
	 * @param {string|string[]} vTypeName Type or types to check for
	 * @returns {boolean} Whether this class is of the given type or of any of the given types
	 * @public
	 * @since 1.56
	 */
	Metadata.prototype.isA = function(vTypeName) {
		var mTypes = this._mImplementedTypes;
		if ( Array.isArray(vTypeName) ) {
			for ( var i = 0; i < vTypeName.length; i++ ) {
				if ( vTypeName[i] in mTypes ) {
					return true;
				}
			}
			return false;
		}
		// Note: the check with 'in' also finds inherited types via the prototype chain of mTypes
		return vTypeName in mTypes;
	};

	/**
	 * Returns whether the described class is abstract
	 * @return {boolean} whether the class is abstract
	 * @public
	 */
	Metadata.prototype.isAbstract = function() {
		return this._bAbstract;
	};

	/**
	 * Returns whether the described class is final
	 * @return {boolean} whether the class is final
	 * @public
	 */
	Metadata.prototype.isFinal = function() {
		return this._bFinal;
	};

	/**
	 * Whether the described class is deprecated and should not be used any more
	 *
	 * @return {boolean} whether the class is considered deprecated
	 * @public
	 * @since 1.26.4
	 */
	Metadata.prototype.isDeprecated = function() {
		return this._bDeprecated;
	};

	/**
	 * Adds one or more new methods to the list of API methods.
	 *
	 * Can be used by contributer classes (like the EnabledPropagator) to enrich the declared set of methods.
	 * The method can either be called with multiple names (strings) or with one array of strings.
	 *
	 * <b>Note</b>: the newly added method(s) will only be visible in {@link sap.ui.base.Interface interface}
	 * objects that are created <i>after</i> this method has been called.
	 *
	 * @param {string|string[]} sMethod name(s) of the new method(s)
	 */
	Metadata.prototype.addPublicMethods = function(sMethod /* ... */) {
		var aNames = (sMethod instanceof Array) ? sMethod : arguments;
		Array.prototype.push.apply(this._aPublicMethods, aNames);
		Array.prototype.push.apply(this._aAllPublicMethods, aNames);
		this._bInterfacesUnique = false;
	};

	/**
	 * Traverse up through the parent chain to find the static property on the class.
	 *
	 * @param {string} sStaticName The name of the static property
	 * @returns {any} If found, returns the static property
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	Metadata.prototype.getStaticProperty = function(sStaticName) {
		let oMetadata = this;
		while (oMetadata && !(sStaticName in oMetadata.getClass())) {
			oMetadata = oMetadata.getParent();
		}
		const oClass = oMetadata?.getClass();

		return oClass?.[sStaticName];
	};

	/**
	 * @since 1.3.1
	 * @private
	 */
	Metadata.createClass = function (fnBaseClass, sClassName, oClassInfo, FNMetaImpl) {

		if ( typeof fnBaseClass === "string" ) {
			FNMetaImpl = oClassInfo;
			oClassInfo = sClassName;
			sClassName = fnBaseClass;
			fnBaseClass = null;
		}

		assert(!fnBaseClass || isFunction(fnBaseClass));
		assert(typeof sClassName === "string" && !!sClassName);
		assert(!oClassInfo || typeof oClassInfo === "object");
		assert(!FNMetaImpl || isFunction(FNMetaImpl));

		FNMetaImpl = FNMetaImpl || Metadata;

		/**
		 * allow metadata class to preprocess
		 * Component- and UIComponentMetadata uses this to derive if "component.json"
		 * must be loaded synchronously.
		 * @deprecated
		 */
		if ( isFunction(FNMetaImpl.preprocessClassInfo) ) {
			oClassInfo = FNMetaImpl.preprocessClassInfo(oClassInfo);
		}

		// normalize oClassInfo
		oClassInfo = oClassInfo || {};
		oClassInfo.metadata = oClassInfo.metadata || {};
		if ( !oClassInfo.hasOwnProperty('constructor') ) {
			oClassInfo.constructor = undefined;
		}

		var fnClass = oClassInfo.constructor;
		assert(!fnClass || isFunction(fnClass));

		// ensure defaults
		if ( fnBaseClass ) {
			// default constructor just delegates to base class
			if ( !fnClass ) {
				if ( oClassInfo.metadata.deprecated ) {
				  // create default factory with deprecation warning
					fnClass = function() {
						Log.warning("Usage of deprecated class: " + sClassName);
						fnBaseClass.apply(this, arguments);
					};
				} else {
					// create default factory
					fnClass = function() {
						fnBaseClass.apply(this, arguments);
					};
				}
			}
			// create prototype chain
			fnClass.prototype = Object.create(fnBaseClass.prototype);
			fnClass.prototype.constructor = fnClass;
			// enforce correct baseType
			oClassInfo.metadata.baseType = fnBaseClass;
		} else {
			// default constructor does nothing
			fnClass = fnClass || function() { };
			// enforce correct baseType
			delete oClassInfo.metadata.baseType;
		}
		oClassInfo.constructor = fnClass;

		/**
		 * make the class visible as JS Object
		 * @deprecated
		 */
		ObjectPath.set(sClassName, fnClass);

		// add metadata
		var oMetadata = new FNMetaImpl(sClassName, oClassInfo);
		fnClass.getMetadata = fnClass.prototype.getMetadata = function() {
			return oMetadata;
		};

		// enrich function
		if ( !fnClass.getMetadata().isFinal() ) {
			fnClass.extend = function(sSCName, oSCClassInfo, fnSCMetaImpl) {
				return Metadata.createClass(fnClass, sSCName, oSCClassInfo, fnSCMetaImpl || FNMetaImpl);
			};
		}

		return fnClass;
	};

	return Metadata;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * SAPUI5 base classes
 *
 * @namespace
 * @name sap.ui.base
 * @public
 */

// Provides class sap.ui.base.Object
sap.ui.predefine("sap/ui/base/Object", ['./Metadata', "sap/base/Log"],
	function(Metadata, Log) {
	"use strict";


	/**
	 * Constructor for an <code>sap.ui.base.Object</code>.
	 *
	 * Subclasses of this class should always call the constructor of their base class.
	 *
	 * @class Base class for all SAPUI5 Objects.
	 * @abstract
	 * @author Malte Wedel
	 * @version 1.125.0
	 * @public
	 * @alias sap.ui.base.Object
	 * @throws {Error} When an instance of the class or its subclasses is created without the <code>new</code> operator.
	 */
	var BaseObject = Metadata.createClass("sap.ui.base.Object", {

		constructor : function() {
			// complain if 'this' is not an instance of a subclass
			if ( !(this instanceof BaseObject) ) {
				throw Error("Cannot instantiate object: \"new\" is missing!");
			}
		}

	});

	/**
	 * Destructor method for objects.
	 * @public
	 */
	BaseObject.prototype.destroy = function() {
	};

	/**
	 * Returns the public facade of this object.
	 *
	 * By default, the public facade is implemented as an instance of {@link sap.ui.base.Interface},
	 * exposing the <code>publicMethods</code> as defined in the metadata of the class of this object.
	 *
	 * See the documentation of the {@link #.extend extend} method for an explanation of <code>publicMethods</code>.
	 *
	 * The facade is created on the first call of <code>getInterface</code> and reused for all later calls.
	 *
	 * @public
	 * @returns {sap.ui.base.Object} A facade for this object, with at least the public methods of the class of this.
	 */
	BaseObject.prototype.getInterface = function() {
		// New implementation that avoids the overhead of a dedicated member for the interface
		// initially, an Object instance has no associated Interface and the getInterface
		// method is defined only in the prototype. So the code here will be executed.
		// It creates an interface (basically the same code as in the old implementation)
		var oInterface = new BaseObject._Interface(this, this.getMetadata().getAllPublicMethods());
		// Now this Object instance gets a new, private implementation of getInterface
		// that returns the newly created oInterface. Future calls of getInterface on the
		// same Object therefore will return the already created interface
		this.getInterface = function() {
			return oInterface;
		};
		// as the first caller doesn't benefit from the new method implementation we have to
		// return the created interface as well.
		return oInterface;
	};

	/**
	 * Returns the metadata for the class that this object belongs to.
	 *
	 * This method is only defined when metadata has been declared by using {@link sap.ui.base.Object.defineClass}
	 * or {@link sap.ui.base.Object.extend}.
	 *
	 * @return {sap.ui.base.Metadata} metadata for the class of the object
	 * @name sap.ui.base.Object#getMetadata
	 * @function
	 * @public
	 */

	/**
	 * The structure of the "metadata" object which is passed when inheriting from sap.ui.base.Object using its static "extend" method.
	 * See {@link sap.ui.base.Object.extend} for details on its usage.
	 *
	 * @typedef {object} sap.ui.base.Object.MetadataOptions
	 *
	 * @property {string[]} [interfaces] set of names of implemented interfaces (defaults to no interfaces)
	 * @property {boolean} [abstract=false] flag that marks the class as abstract (purely informational, defaults to false)
	 * @property {boolean} [final=false] flag that marks the class as final (defaults to false)
	 * @property {boolean} [deprecated=false] flag that marks the class as deprecated (defaults to false). May lead to an additional warning
	 *     log message at runtime when the object is still used. For the documentation, also add a <code>@deprecated</code> tag in the JSDoc,
	 *     describing since when it is deprecated and what any alternatives are.
	 *
	 * @public
	 */

	/**
	 * Creates a subclass of class sap.ui.base.Object with name <code>sClassName</code>
	 * and enriches it with the information contained in <code>oClassInfo</code>.
	 *
	 * <code>oClassInfo</code> might contain three kinds of information:
	 * <ul>
	 * <li><code>metadata:</code> an (optional) object literal with metadata about the class like implemented interfaces,
	 * see {@link sap.ui.base.Object.MetadataOptions MetadataOptions} for details.
	 * The information in the object literal will be wrapped by an instance of {@link sap.ui.base.Metadata Metadata}.
	 * Subclasses of sap.ui.base.Object can enrich the set of supported metadata (e.g. see {@link sap.ui.core.Element.extend}).
	 * </li>
	 *
	 * <li><code>constructor:</code> a function that serves as a constructor function for the new class.
	 * If no constructor function is given, the framework creates a default implementation that delegates all
	 * its arguments to the constructor function of the base class.
	 * </li>
	 *
	 * <li><i>any-other-name:</i> any other property in the <code>oClassInfo</code> is copied into the prototype
	 * object of the newly created class. Callers can thereby add methods or properties to all instances of the
	 * class. But be aware that the given values are shared between all instances of the class. Usually, it doesn't
	 * make sense to use primitive values here other than to declare public constants.
	 *
	 * If such a property has a function as its value, and if the property name does not start with an underscore
	 * or with the prefix "on", the property name will be automatically added to the list of public methods of the
	 * class (see property <code>publicMethods</code> in the <code>metadata</code> section). If a method's name
	 * matches that pattern, but is not meant to be public, it shouldn't be included in the class info object,
	 * but be assigned to the prototype instead.
	 * </li>
	 *
	 * </ul>
	 *
	 * The prototype object of the newly created class uses the same prototype as instances of the base class
	 * (prototype chaining).
	 *
	 * A metadata object is always created, even if there is no <code>metadata</code> entry in the <code>oClassInfo</code>
	 * object. A getter for the metadata is always attached to the prototype and to the class (constructor function)
	 * itself.
	 *
	 * Last but not least, with the third argument <code>FNMetaImpl</code> the constructor of a metadata class
	 * can be specified. Instances of that class will be used to represent metadata for the newly created class
	 * and for any subclass created from it. Typically, only frameworks will use this parameter to enrich the
	 * metadata for a new class hierarchy they introduce (e.g. {@link sap.ui.core.Element.extend Element}).
	 *
	 * @param {string} sClassName name of the class to be created
	 * @param {object} [oClassInfo] structured object with information about the class
	 * @param {function} [FNMetaImpl] constructor function for the metadata object. If not given, it defaults to sap.ui.base.Metadata.
	 * @return {function} the created class / constructor function
	 * @public
	 * @static
	 * @name sap.ui.base.Object.extend
	 * @function
	 * @since 1.3.1
	 */

	/**
	 * Creates metadata for a given class and attaches it to the constructor and prototype of that class.
	 *
	 * After creation, metadata can be retrieved with getMetadata().
	 *
	 * The static info can at least contain the following entries:
	 * <ul>
	 * <li>baseType: {string} fully qualified name of a base class or empty</li>
	 * <li>publicMethods: {string} an array of method names that will be visible in the interface proxy returned by {@link #getInterface}</li>
	 * </ul>
	 *
	 * @param {string} sClassName name of an (already declared) constructor function
	 * @param {object} oStaticInfo static info used to create the metadata object
	 * @param {string} oStaticInfo.baseType qualified name of a base class
	 * @param {string[]} oStaticInfo.publicMethods array of names of public methods
	 * @param {function} [FNMetaImpl] constructor function for the metadata object. If not given, it defaults to sap.ui.base.Metadata.
	 *
	 * @return {sap.ui.base.Metadata} the created metadata object
	 * @public
	 * @static
	 * @deprecated Since 1.3.1. Use the static <code>extend</code> method of the desired base class (e.g. {@link sap.ui.base.Object.extend})
	 */
	BaseObject.defineClass = function(sClassName, oStaticInfo, FNMetaImpl) {
		// create Metadata object
		var oMetadata = new (FNMetaImpl || Metadata)(sClassName, oStaticInfo);
		var fnClass = oMetadata.getClass();
		fnClass.getMetadata = fnClass.prototype.getMetadata = function() {
			return oMetadata;
		};
		// enrich function
		if ( !oMetadata.isFinal() ) {
			fnClass.extend = function(sSCName, oSCClassInfo, fnSCMetaImpl) {
				return Metadata.createClass(fnClass, sSCName, oSCClassInfo, fnSCMetaImpl || FNMetaImpl);
			};
		}
		Log.debug("defined class '" + sClassName + "'" + (oMetadata.getParent() ? " as subclass of " + oMetadata.getParent().getName() : "") );
		return oMetadata;
	};

	/**
	 * Checks whether this object is an instance of the named type.
	 *
	 * This check is solely based on the type names as declared in the class metadata.
	 * It compares the given <code>vTypeName</code> with the name of the class of this object,
	 * with the names of any base class of that class and with the names of all interfaces
	 * implemented by any of the aforementioned classes.
	 *
	 * Instead of a single type name, an array of type names can be given and the method
	 * will check if this object is an instance of any of the listed types (logical or).
	 *
	 * Should the UI5 class system in future implement additional means of associating classes
	 * with type names (e.g. by introducing mixins), then this method might detect matches
	 * for those names as well.
	 *
	 * @example
	 * myObject.isA("sap.ui.core.Control"); // true if myObject is an instance of sap.ui.core.Control
	 * myObject.isA(["sap.ui.core.Control", "sap.ui.core.Fragment"]); // true if myObject is an instance of sap.ui.core.Control or sap.ui.core.Fragment
	 *
	 * @param {string|string[]} vTypeName Type or types to check for
	 * @returns {boolean} Whether this object is an instance of the given type or of any of the given types
	 * @public
	 * @since 1.56
	 */
	BaseObject.prototype.isA = function(vTypeName) {
		return this.getMetadata().isA(vTypeName);
	};

	/**
	 * Checks whether the given object is an instance of the named type.
	 * This function is a short-hand convenience for {@link sap.ui.base.Object#isA}.
	 *
	 * Please see the API documentation of {@link sap.ui.base.Object#isA} for more details.
	 *
	 * @param {any} oObject Object which will be checked whether it is an instance of the given type
	 * @param {string|string[]} vTypeName Type or types to check for
	 * @returns {boolean} Whether the given object is an instance of the given type or of any of the given types
	 * @public
	 * @since 1.56
	 * @static
	 * @deprecated Since 1.120, please use {@link sap.ui.base.Object.isObjectA}.
	 */
	BaseObject.isA = function(oObject, vTypeName) {
		return oObject instanceof BaseObject && oObject.isA(vTypeName);
	};

	/**
	 * Checks whether the given object is an instance of the named type.
	 * This function is a short-hand convenience for {@link sap.ui.base.Object#isA}.
	 *
	 * Please see the API documentation of {@link sap.ui.base.Object#isA} for more details.
	 *
	 * @param {any} oObject Object which will be checked whether it is an instance of the given type
	 * @param {string|string[]} vTypeName Type or types to check for
	 * @returns {boolean} Whether the given object is an instance of the given type or of any of the given types
	 * @public
	 * @since 1.120
	 * @static
	 */
	BaseObject.isObjectA = function(oObject, vTypeName) {
		return oObject instanceof BaseObject && oObject.isA(vTypeName);
	};

	/**
	 * @param  {sap.ui.base.Object} [oObject] Object for which a facade should be created
	 * @param  {string[]} [aMethods=[]] Names of the methods, that should be available in the new facade
	 * @param  {boolean} [_bReturnFacade=false] If true, the return value of a function call is this created Interface instance instead of the BaseObject interface
	 * @private
	 * @static
	 */
	BaseObject._Interface = function(oObject, aMethods, _bReturnFacade) {
		// if object is null or undefined, return itself
		if (!oObject) {
			return oObject;
		}

		function fCreateDelegator(oObject, sMethodName) {
			return function() {
					// return oObject[sMethodName].apply(oObject, arguments);
					var tmp = oObject[sMethodName].apply(oObject, arguments);
					// to avoid to hide the implementation behind the interface you need
					// to override the getInterface function in the object or create the interface with bFacade = true
					if (_bReturnFacade) {
						return this;
					} else {
						return (tmp instanceof BaseObject) ? tmp.getInterface() : tmp;
					}
				};
		}

		// if there are no methods return
		if (!aMethods) {
			return {};
		}

		var sMethodName;

		// create functions for all delegated methods
		// PERFOPT: 'cache' length of aMethods to reduce # of resolutions
		for (var i = 0, ml = aMethods.length; i < ml; i++) {
			sMethodName = aMethods[i];
			//!oObject[sMethodName] for 'lazy' loading interface methods ;-)
			if (!oObject[sMethodName] || typeof oObject[sMethodName] === "function") {
				this[sMethodName] = fCreateDelegator(oObject, sMethodName);
			}
		}
	};

	return BaseObject;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides type sap.ui.core.CalendarType.
sap.ui.predefine("sap/ui/core/CalendarType", [
	"sap/ui/base/DataType",
	"sap/base/i18n/date/CalendarType"
], function(
	DataType,
	CalendarType
) {
	"use strict";
	/**
	 * The types of <code>Calendar</code>.
	 *
	 * @enum {string}
	 * @name sap.ui.core.CalendarType
	 * @public
	 * @deprecated As of Version 1.120. Please use {@link module:sap/base/18n/date/CalendarType} instead.
	 * @borrows module:sap/base/i18n/date/CalendarType.Gregorian as Gregorian
	 * @borrows module:sap/base/i18n/date/CalendarType.Islamic as Islamic
	 * @borrows module:sap/base/i18n/date/CalendarType.Japanese as Japanese
	 * @borrows module:sap/base/i18n/date/CalendarType.Persian as Persian
	 * @borrows module:sap/base/i18n/date/CalendarType.Buddhist as Buddhist
	 */

	DataType.registerEnum("sap.ui.core.CalendarType", CalendarType);

	return CalendarType;
}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides class sap.ui.core.Lib
sap.ui.predefine("sap/ui/core/Lib", [
	'sap/base/assert',
	'sap/base/config',
	'sap/base/i18n/Localization',
	'sap/base/i18n/ResourceBundle',
	'sap/base/future',
	'sap/base/Log',
	'sap/base/util/deepExtend',
	"sap/base/util/isEmptyObject",
	"sap/base/util/isPlainObject",
	'sap/base/util/LoaderExtensions',
	'sap/base/util/fetch',
	'sap/base/util/mixedFetch',
	"sap/base/util/ObjectPath",
	'sap/base/util/Version',
	'sap/base/util/array/uniqueSort',
	'sap/ui/Global', /* sap.ui.lazyRequire */
	'sap/ui/VersionInfo',
	'sap/ui/base/DataType',
	'sap/ui/base/EventProvider',
	'sap/ui/base/Object',
	'sap/ui/base/SyncPromise',
	'sap/ui/core/_UrlResolver',
	"sap/ui/core/Supportability"
], function (
	assert,
	BaseConfig,
	Localization,
	ResourceBundle,
	future,
	Log,
	deepExtend,
	isEmptyObject,
	isPlainObject,
	LoaderExtensions,
	fetch,
	mixedFetch,
	ObjectPath,
	Version,
	uniqueSort,
	Global,
	VersionInfo,
	DataType,
	EventProvider,
	BaseObject,
	SyncPromise,
	_UrlResolver,
	Supportability
) {
	"use strict";

	/**
	 * Save the library instances by their keys
	 */
	var mLibraries = {};


	/**
	 * Bookkeeping for the guessing of library names.
	 *
	 * Set of bundleUrls from which a library name has been derived or not, see #getLibraryNameForBundle
	 * If no library name can be derived, the result will also be tracked with 'false' as value.
	 *
	 * Example:
	 *   mGuessedLibraries = {
	 *     "my/simple/library/i18n/i18n.properties": "my.simple.library",
	 *     "no/library/i18n/i18n.properties": false
	 *   }
	 */
	var mGuessedLibraries = {};

	/**
	 * Set of libraries that provide a bundle info file (library-preload-lazy.js).
	 *
	 * The file will be loaded, when a lazy dependency to the library is encountered.
	 * @private
	 */
	var oLibraryWithBundleInfo = new Set([
		"sap.suite.ui.generic.template",
		"sap.ui.comp",
		"sap.ui.layout",
		"sap.ui.unified"
	]);

	/**
	 * Retrieves the module path.
	 * @param {string} sModuleName module name.
	 * @param {string} sSuffix is used untouched (dots are not replaced with slashes).
	 * @returns {string} module path.
	 */
	function getModulePath(sModuleName, sSuffix){
		return sap.ui.require.toUrl(sModuleName.replace(/\./g, "/") + sSuffix);
	}

	/**
	 * Register the given namespace prefix to the given URL
	 * @param {string} sModuleNamePrefix The namespace prefix
	 * @param {string} sUrlPrefix The URL prefix that will be registered for the given namespace
	 */
	function registerModulePath(sModuleNamePrefix, sUrlPrefix) {
		LoaderExtensions.registerResourcePath(sModuleNamePrefix.replace(/\./g, "/"), sUrlPrefix);
	}

	/**
	 * Adds all resources from a preload bundle to the preload cache.
	 *
	 * When a resource exists already in the cache, the new content is ignored.
	 *
	 * @param {object} oData Preload bundle
	 * @param {string} [oData.url] URL from which the bundle has been loaded
	 * @param {string} [oData.name] Unique name of the bundle
	 * @param {string} [oData.version='1.0'] Format version of the preload bundle
	 * @param {object} oData.modules Map of resources keyed by their resource name; each resource must be a string or a function
	 * @param {string} sURL URL from which the bundle has been loaded
	 *
	 * @private
	 */
	function registerPreloadedModules(oData, sURL) {
		var modules = oData.modules,
			fnUI5ToRJS = function(sName) {
				return /^jquery\.sap\./.test(sName) ? sName : sName.replace(/\./g, "/");
			};

		if ( Version(oData.version || "1.0").compareTo("2.0") < 0 ) {
			modules = {};
			for ( var sName in oData.modules ) {
				modules[fnUI5ToRJS(sName) + ".js"] = oData.modules[sName];
			}
		}
		sap.ui.require.preload(modules, oData.name, sURL);
	}

	/**
	 * Configured type of preload file per library.
	 * The empty name represents the default for all libraries not explicitly listed.
	 *
	 * A type can be one of
	 * - 'none' (do not preload),
	 * - 'js' (preload JS file),
	 * - 'json' (preload a json file)
	 * or 'both (try js first, then 'json')
	 *
	 * @private
	 */
	var mLibraryPreloadFileTypes = {};

	// evaluate configuration for library preload file types
	BaseConfig.get({
		name: "sapUiXxLibraryPreloadFiles",
		type: BaseConfig.Type.StringArray,
		external: true
	}).forEach(function(v){
		var fields = String(v).trim().split(/\s*:\s*/),
			name = fields[0],
			fileType = fields[1];
		if ( fields.length === 1 ) {
			fileType = name;
			name = '';
		}
		if ( /^(?:none|js|json|both)$/.test(fileType) ) {
			mLibraryPreloadFileTypes[name] = fileType;
		}
	});

	/**
	 * Set of libraries which require CSS.
	 */
	var aAllLibrariesRequiringCss = [];

	var pThemeManager;

	/**
	 * Get the sap/ui/core/theming/ThemeManager on demand
	 *
	 * @param {boolean} [bClear=false] Whether to reset the ThemeManager
	 * @returns {Promise} The promise that resolves with the sap/ui/core/theming/ThemeManager class
	 */
	function _getThemeManager(bClear) {
		var ThemeManager = sap.ui.require("sap/ui/core/theming/ThemeManager");
		if (!pThemeManager) {
			if (!ThemeManager) {
				pThemeManager = new Promise(function (resolve, reject) {
					sap.ui.require(["sap/ui/core/theming/ThemeManager"], function (ThemeManager) {
						resolve(ThemeManager);
					}, reject);
				});
			} else {
				pThemeManager = Promise.resolve(ThemeManager);
			}
		}
		// This is only used within initLibrary to reset flag themeLoaded synchronously in case
		// a theme for a new library will be loaded
		if (ThemeManager && bClear) {
			ThemeManager.reset();
		}
		return pThemeManager;
	}

	/**
	 * This is an identifier to restrict the usage of constructor within this module
	 */
	var oConstructorKey = Symbol("sap.ui.core.Lib");

	var oPropDescriptor = {
		configurable: true,
		enumerable: true,
		writable: false
	};

	function createPropDescriptorWithValue(vValue) {
		oPropDescriptor.value = vValue;
		return oPropDescriptor;
	}


	/**
	 * Freezes the object and nested objects to avoid later manipulation
	 *
	 * @param {object} oObject the object to deep freeze
	 */
	function deepFreeze(oObject) {
		if (oObject && typeof oObject === 'object' && !Object.isFrozen(oObject)) {
			Object.freeze(oObject);
			for (var sKey in oObject) {
				if (Object.hasOwn(oObject, sKey)) {
					deepFreeze(oObject[sKey]);
				}
			}
		}
	}

	/**
	 * Returns the list of libraries for which the library.css was preloaded.
	 *
	 * This configuration setting specifies a list of UI libraries using the same syntax as the "libs" property,
	 * for which the SAPUI5 core does not include the library.css stylesheet in the head of the page.
	 * If the list starts with an exclamation mark (!), no stylesheet is loaded at all for the specified libs.
	 * In this case, it is assumed that the application takes care of loading CSS.
	 *
	 * If the first library's name is an asterisk (*), it will be expanded to the list of already
	 * configured libraries.
	 *
	 * @returns {string[]} the list of libraries for which the library.css was preloaded
	 * @private
	 */
	function getPreloadLibCss() {
		var aPreloadLibCSS = BaseConfig.get({name: "sapUiPreloadLibCss", type: BaseConfig.Type.StringArray, external: true});
		if ( aPreloadLibCSS.length > 0 ) {
			// remove leading '!' (legacy) as it does not make any difference
			if ( aPreloadLibCSS[0].startsWith("!") ) {
				aPreloadLibCSS[0] = aPreloadLibCSS[0].slice(1);
			}
			// "*"  means "add all bootstrap libraries"
			if ( aPreloadLibCSS[0] === "*" ) {
				aPreloadLibCSS.shift(); // remove * (inplace)

				// The modules list also contains all configured libs
				// we prepend them now to the preloaded libs css list
				Object.keys(mLibraries).forEach(function(sLib) {
					if (!aPreloadLibCSS.includes(sLib)) {
						aPreloadLibCSS.unshift(sLib);
					}
				});
			}
		}
		return aPreloadLibCSS;
	}

	/**
	 * @classdesc
	 * Constructor must not be used: To load a library, please use the static method {@link #.load}.
	 *
	 * This class also provides other static methods which are related to a library, such as {@link
	 * #.getResourceBundleFor} to retrieve the resource bundle of a library, {@link #.init} to provide information for a
	 * library and so on.
	 *
	 * @param {object} mSettings Info object for the library
	 * @param {string} mSettings.name Name of the library; when given it must match the name by which the library has been loaded
	 * @class
	 * @alias sap.ui.core.Lib
	 * @extends sap.ui.base.Object
	 * @since 1.118
	 * @hideconstructor
	 * @public
	 */
	var Library = BaseObject.extend("sap.ui.core.Lib", /** @lends sap.ui.core.Lib.prototype */ {

		constructor: function(mSettings) {
			BaseObject.call(this);

			assert(typeof mSettings === "object", "A settings object must be given to the constructor of sap/ui/base/Library");
			assert(typeof mSettings.name === "string" && mSettings.name, "The settings object that is given to the constructor of sap/ui/base/Library must contain a 'name' property which is a non-empty string");

			if (mSettings._key !== oConstructorKey) {
				throw new Error("The constructor of sap/ui/core/Lib is restricted to the internal usage. To get an instance of Library with name '" + mSettings.name + "', use the static method 'get' from sap/ui/core/Lib instead.");
			}

			this.name = mSettings.name;

			var aPropsWithDefaults = ["dependencies", "types", "interfaces", "controls", "elements"];

			// provide default values
			aPropsWithDefaults.forEach(function(sPropName) {
				Object.defineProperty(this, sPropName, createPropDescriptorWithValue([]));
			}.bind(this));

			/**
			 * Resource bundles that are cached by their locales as key
			 */
			Object.defineProperty(this, "_resourceBundles", {
				value: {},
				writable: true
			});
			/**
			 * The '_loadingStatus' property may contain the following attributes
			 *  * {boolean} pending
			 *  * {boolean} async
			 *  * {Promise} promise
			 */
			Object.defineProperty(this, "_loadingStatus", {
				value: null,
				writable: true
			});
			Object.defineProperty(this, "_settingsEnhanced", {
				value: false,
				writable: true
			});
			Object.defineProperty(this, "_manifestFailed", {
				value: false,
				writable: true
			});
		},

		/**
		 * Override the function to avoid creating facade for this instance to expose the settings properties that are
		 * given through {@link #enhanceSettings}.
		 *
		 * @return {this} The Lib instance itself
		 * @override
		 */
		getInterface: function() {
			return this;
		},

		/**
		 * Indicates whether the {@link sap.ui.core.Lib#enhanceSettings} is called
		 *
		 * @returns {boolean} Whether a library's setting is enhanced with additional metadata
		 * @private
		 */
		isSettingsEnhanced: function() {
			return this._settingsEnhanced;
		},


		/**
		 * Enhances a library's setting information.
		 *
		 * When the <code>mSettings</code> has been processed, a normalized version of it will be kept and set on the
		 * library instance.
		 *
		 * @param {object} mSettings Info object for the library
		 * @param {string} mSettings.version Version of the library
		 * @param {string[]} [mSettings.dependencies=[]] List of libraries that this library depends on; names are in
		 *  dot notation (e.g. "sap.ui.core")
		 * @param {string[]} [mSettings.types=[]] List of names of types that this library provides; names are in dot
		 *  notation (e.g. "sap.ui.core.CSSSize")
		 * @param {string[]} [mSettings.interfaces=[]] List of names of interface types that this library provides;
		 *  names are in dot notation (e.g. "sap.ui.core.PopupInterface")
		 * @param {string[]} [mSettings.controls=[]] Names of control types that this library provides; names are in dot
		 *  notation (e.g. "sap.ui.core.ComponentContainer")
		 * @param {string[]} [mSettings.elements=[]] Names of element types that this library provides (excluding
		 *  controls); names are in dot notation (e.g. "sap.ui.core.Item")
		 * @param {boolean} [mSettings.noLibraryCSS=false] Indicates whether the library doesn't provide/use theming.
		 *  When set to true, no library.css will be loaded for this library
		 * @param {Object<string,any>} [mSettings.extensions] A map of potential extensions of the library metadata; structure not defined by
		 *  the UI5 core framework. Keys should be qualified names derived from the namespace of the code that introduces the feature, e.g.
		 *  <code>""sap.ui.support"</code> is used for the support rule metadata of a library.
		 * @returns {sap.ui.core.Lib} The library instance
		 * @private
		 */
		enhanceSettings: function(mSettings) {
			if (this._settingsEnhanced) {
				return this;
			}

			this._settingsEnhanced = true;

			var sKey, vValue, vValueToSet;

			for (sKey in mSettings) {
				vValue = mSettings[sKey];
				vValueToSet = undefined;

				// don't copy undefined values
				if ( vValue !== undefined ) {
					if ( Array.isArray(this[sKey]) ) {
						// concat array typed values
						if (this[sKey].length === 0) {
							vValueToSet = vValue;
						} else {
							vValueToSet = uniqueSort(this[sKey].concat(vValue));
						}
					} else if ( this[sKey] === undefined ) {
						// only set values for properties that are still undefined
						vValueToSet = vValue;
					} else if ( sKey != "name" ) {
						// ignore other values (silently ignore "name")
						future.warningThrows("library info setting ignored: " + sKey + "=" + vValue);
					}

					if (vValueToSet !== undefined) {
						// freeze settings value
						Object.defineProperty(this, sKey, createPropDescriptorWithValue(vValueToSet));
					}
				}
			}

			return this;
		},

		/**
		 * Returns the file type (either js, json, none, or both) that should be used for preloading this library
		 * instance.
		 *
		 * When <code>bJSON</code> is set to <code>true</code>, type "json" is returned directly. When
		 * <code>bJSON</code> is set to <code>false</code>, type "js" is returned. Otherwise it takes the configured
		 * file type into consideration. In case of conflict between the given <code>bJSON</code> and the configured
		 * file type, type "none" is returned.
		 *
		 * @param {boolean} [bJSON] Whether the "json" file type is set
		 * @returns {string} The determined file type. It can be "js", "json", "none", or "both".
		 * @private
		 * @ui5-transform-hint replace-param bJSON false
		 */
		_getFileType: function (bJSON) {
			var sFileType;
			var sConfiguredFileType = mLibraryPreloadFileTypes[this.name] || mLibraryPreloadFileTypes[''] || 'both';

			if ( bJSON === true ) {
				sFileType = 'json';
			} else if ( bJSON === false ) {
				sFileType = 'js';
			} else {
				// take the configured preload file type as default
				sFileType = sConfiguredFileType;
			}

			if (sConfiguredFileType !== 'both' && sFileType !== 'both' &&  sConfiguredFileType !== sFileType ) {
				// if the configured and the supported file type are not equal and the library doesn't support 'both',
				// then there is no compromise -> 'none'
				sFileType = 'none';
			}

			return sFileType;
		},

		/**
		 * Loads the library-preload bundle and the resource bundle for a library and apply the same for its
		 * dependencies.
		 *
		 * When the optional parameter <code>mOptions.url</code> is given, its value will be registered for the
		 * namespace of the library and all resources will be loaded from that location.
		 *
		 * When the library has been loaded already, or its entry module (library.js) is already loaded or preloaded, no
		 * further action will be taken, especially, a given <code>mOptions.url</code> will not be registered. A promise
		 * will be returned which resolves immediately.
		 *
		 * @param {object} [mOptions] The options object that contains the following properties
		 * @param {string} [mOptions.url] URL to load the library from
		 * @param {boolean} [mOptions.lazy] Whether the library-preload-lazy bundle should be loaded instead of the
		 *  library-preload bundle
		 * @returns {Promise<sap.ui.core.Lib>} A promise that resolves with the library instance
		 * @private
		 */
		preload: function(mOptions) {
			if (mOptions && (mOptions.hasOwnProperty("async") || mOptions.hasOwnProperty("sync"))) {
				future.errorThrows("The 'preload' function of class sap/ui/core/Lib only supports preloading a library asynchronously.", { suffix: "The given 'async' or 'sync' setting is ignored."});
			}
			if (mOptions && mOptions.hasOwnProperty("json")) {
				future.errorThrows("The 'preload' function of class sap/ui/core/Lib only supports preloading in JS Format.", { suffix: "The given 'json' setting is ignored."});
			}

			return this._preload(["url", "lazy"].reduce(function(acc, sProperty) {
				if (mOptions && mOptions.hasOwnProperty(sProperty)) {
					acc[sProperty] = mOptions[sProperty];
				}
				return acc;
			}, {}));
		},

		/**
		 * Internal function for preloading a library which still supports the legacy parameters:
		 *
		 * <ul>
		 * <li><code>mOptions.sync</code>: load the preload file in sync mode</li>
		 * <li><code>mOptions.json</code>: load the preload file in "json" format</li>
		 * </ul>
		 *
		 * @param [mOptions] The options object that contains the following properties
		 * @param [mOptions.url] URL to load the library from
		 * @param [mOptions.lazy] Whether the library-preload-lazy bundle should be loaded instead of the
		 *  library-preload bundle
		 * @param [mOptions.sync] @deprecated Whether to load the preload bundle in sync mode
		 * @param [mOptions.json] @deprecated Whether to load the preload in JSON format
		 * @returns {Promise<Lib>|Lib} A promise that resolves with the library instance in async mode and the library
		 *  instance itself in sync mode
		 * @private
		 * @ui5-transform-hint replace-param mOptions.sync false
		 * @ui5-transform-hint replace-param mOptions.json false
		 */
		_preload: function(mOptions) {
			mOptions = mOptions || {};

			var sFileType = this._getFileType(mOptions.json),
				sLibPackage = this.name.replace(/\./g, '/'),
				bEntryModuleExists = !!sap.ui.loader._.getModuleState(sLibPackage + '/library.js'),
				bHttp2 = Library.isDepCacheEnabled();

			if (sFileType === 'none') {
				return mOptions.sync ? this : Promise.resolve(this);
			}

			if (this._loadingStatus == null && mOptions.url) {
				registerModulePath(this.name, mOptions.url);
			}

			this._loadingStatus = this._loadingStatus || {};

			if (this._loadingStatus.pending) {
				if (mOptions.sync) {
					if (mOptions.lazy) {
						// ignore a lazy request when an eager request is already pending
						return this;
					} else if (this._loadingStatus.async) {
						Log.warning("request to load " + this.name + " synchronously while async loading is pending; this causes a duplicate request and should be avoided by caller");
						// fall through and preload synchronously
					} else {
						// sync cycle -> ignore nested call (would nevertheless be a dependency cycle)
						Log.warning("request to load " + this.name + " synchronously while sync loading is pending (cycle, ignored)");
						return this;
					}
				} else if (this._loadingStatus.preloadFinished) { // async
					// When it's already in progress for loading a library and loading its own preload file (either JS,
					// JSON or doesn't need to load the preload at all) is finished, a dependency cycle between
					// libraries is detected. A resolved promise is returned instead of this._loadingStatus.promise to
					// avoid the deadlock between the libraries which have dependency of each other
					return Promise.resolve(this);
				}
			}

			if ((mOptions.sync && this._loadingStatus.pending === false)
				|| (!mOptions.sync && this._loadingStatus.promise)) {
				// in the sync case, we can do a immediate return only when the library is fully loaded.
				return mOptions.sync ? this : this._loadingStatus.promise;
			}

			if (mOptions.lazy) {
				// For selected lazy dependencies, we load a library-preload-lazy module.
				// Errors are ignored and the library is not marked as pending in the bookkeeping
				// (but the loader avoids double loading).
				Log.debug("Lazy dependency to '" + this.name + "' encountered, loading library-preload-lazy.js");

				/** @deprecated */
				if (mOptions.sync) {
					try {
						sap.ui.requireSync(sLibPackage + '/library-preload-lazy'); // legacy-relevant: Sync path
					} catch (e) {
						Log.error("failed to load '" + sLibPackage + "/library-preload-lazy.js" + "' synchronously (" + (e && e.message || e) + ")");
					}
					return this;
				}

				return sap.ui.loader._.loadJSResourceAsync(
					sLibPackage + '/library-preload-lazy.js', /* ignoreErrors = */ true);
			}

			// otherwise mark as pending
			this._loadingStatus.pending = true;
			this._loadingStatus.async = !mOptions.sync;

			var pPreload;
			if (bEntryModuleExists) {
				pPreload = (mOptions.sync ? SyncPromise : Promise).resolve();
			} else {
				// first preload code, resolves with list of dependencies (or undefined)
				pPreload = sFileType !== 'json' ?
					/* 'js' or 'both', not forced to JSON */
					this._preloadJSFormat({
						fallbackToJSON: sFileType !== "js",
						http2: bHttp2,
						sync: mOptions.sync
					})
					: this._preloadJSONFormat({sync: mOptions.sync});
			}

			// load dependencies, if there are any
			this._loadingStatus.promise = pPreload.then(function(aDependencies) {
				// resolve dependencies via manifest "this._getDependencies()" except for libary-preload.json
				aDependencies = aDependencies || this._getDependencies();

				this._loadingStatus.preloadFinished = true;

				var oManifest = this.getManifest(),
					aPromises;

				if (aDependencies && aDependencies.length) {
					if (!mOptions.sync) {
						var aEagerDependencies = [],
							aLazyDependencies = [];

						aDependencies.forEach(function(oDependency) {
							if (oDependency.lazy) {
								aLazyDependencies.push(oDependency);
							} else {
								aEagerDependencies.push(oDependency.name);
							}
						});
						// aEagerDependencies contains string elements before executing the next line

						aEagerDependencies = VersionInfo._getTransitiveDependencyForLibraries(aEagerDependencies)
							.map(function(sDependencyName) {
								return {
									name: sDependencyName
								};
							});
						// aEagerDependencies contains object elements after executing the above line

						// combine transitive closure of eager dependencies and direct lazy dependencies,
						// the latter might be redundant
						aDependencies = aEagerDependencies.concat(aLazyDependencies);
					}

					aPromises = aDependencies.map(function(oDependency) {
						var oLibrary = Library._get(oDependency.name, true/* bCreate */);
						return oLibrary._preload({
							/** @deprecated since 1.120 */
							sync: mOptions.sync,
							lazy: oDependency.lazy
						});
					});
				} else {
					aPromises = [];
				}

				if (!mOptions.sync && oManifest && Version(oManifest._version).compareTo("1.9.0") >= 0) {
					aPromises.push(this.loadResourceBundle());
				}

				var pFinish = mOptions.sync ? SyncPromise.all(aPromises) : Promise.all(aPromises);
				return pFinish.then(function() {
					this._loadingStatus.pending = false;
					return this;
				}.bind(this));

			}.bind(this));

			return mOptions.sync ? this._loadingStatus.promise.unwrap() : this._loadingStatus.promise;
		},

		/**
		 * Loads the library's preload bundle in JS format. In case the resource "library-preload.js" doesn't exist and
		 * <code>mOptions.fallbackToJSON</code> is set to <code>true</code>, the library's preload in JSON format will
		 * be loaded.
		 *
		 * @param {object} [mOptions] The options object that contains the following properties
		 * @param {boolean} [mOptions.fallbackToJSON] Whether to load the preload in JSON format when loading the JS
		 *  format fails
		 * @param {boolean} [mOptions.http2] Whether to load the "library-h2-preload" bundle instead of the
		 * "library-preload" bundle
		 * @param {boolean} [mOptions.sync] Whether to load the preload in sync mode
		 * @returns {Promise|object} A promise that resolves with the dependency information of the library in async
		 *  mode or the dependency information directly in sync mode
		 * @private
		 * @ui5-transform-hint replace-param mOptions.sync false
		 */
		_preloadJSFormat: function(mOptions) {
			mOptions = mOptions || {};

			var that = this;
			var sPreloadModule = this.name.replace(/\./g, '/')
				+ (mOptions.http2 ? '/library-h2-preload' : '/library-preload')
				+ (mOptions.sync ? '' : '.js');
			var pResult;

			if (mOptions.sync) {
				// necessary to call sap.ui.requireSync in the "then" function to result in a rejected promise once the
				// loading of JS preload fails
				pResult = SyncPromise.resolve().then(function() {
					sap.ui.requireSync(sPreloadModule); // legacy-relevant: Synchronous preloading
				});
			} else {
				pResult = sap.ui.loader._.loadJSResourceAsync(sPreloadModule);
			}

			return pResult.catch(function(e) {
				if (mOptions.fallbackToJSON) {
					var bFallback;
					if (mOptions.sync) {
						var oRootCause = e;
						while (oRootCause && oRootCause.cause) {
							oRootCause = oRootCause.cause;
						}
						// fall back to JSON, but only if the root cause was an XHRLoadError
						// ignore other errors (preload shouldn't fail)
						bFallback = oRootCause && oRootCause.name === "XHRLoadError";
					} else {
						// loading library-preload.js failed, might be an old style lib with a library-preload.json only.
						// with mOptions.fallbackToJSON === false, this fallback can be suppressed
						bFallback = true;
					}

					if (bFallback) {
						Log.error("failed to load '" + sPreloadModule + "' (" + (e && e.message || e) + "), falling back to library-preload.json");
						return that._preloadJSONFormat({sync: mOptions.sync});
					}
					// ignore other errors
				}
			});
		},

		/**
		 * Loads the library's preload bundle in JSON format.
		 *
		 * @param {object} [mOptions] The options object that contains the following properties
		 * @param {boolean} [mOptions.sync] Whether to load the preload in sync mode
		 * @returns {Promise|object} A promise that resolves with the dependency information of the library in async
		 *  mode or the dependency information directly in sync mode
		 * @private
		 * @deprecated
		 */
		_preloadJSONFormat: function(mOptions) {
			mOptions = mOptions || {};

			var sURL = getModulePath(this.name, "/library-preload.json");

			/**
			 * @deprecated As of Version 1.120
			 */
			fetch = mixedFetch ? mixedFetch : fetch;
			return fetch(sURL, {
				headers: {
					Accept: fetch.ContentTypes.JSON
				}
			}, mOptions.sync).then(function(response) {
				if (response.ok) {
					return response.json().then(function(data) {
						if (data) {
							registerPreloadedModules(data, sURL);
							if (Array.isArray(data.dependencies)) {
								// remove .library-preload suffix from dependencies
								return data.dependencies.map(function (sDepLibraryName) {
									return {
										name: sDepLibraryName.replace(/\.library-preload$/, '')
									};
								});
							} else {
								return data.dependencies;
							}
						}
					});
				}  else {
					throw Error(response.statusText || response.status);
				}
			}).catch(function(oError) {
				Log.error("failed to load '" + sURL + "': " + oError.message);
			});
		},

		/**
		 * Returns the library's manifest when it's available.
		 *
		 * Only when the library's manifest is preloaded with the library's preload bundle, the manifest will be
		 * returned from this function. This function never triggers a separate request to load the library's manifest.
		 *
		 * @param {boolean} [bSync=false] whether to use sync request to load the library manifest when it doesn't exist
		 *  in preload cache
		 * @returns {object|undefined} The manifest of the library
		 * @private
		 */
		getManifest: function(bSync) {
			if (!this.oManifest) {
				var manifestModule = this.name.replace(/\./g, '/') + '/manifest.json';

				if (sap.ui.loader._.getModuleState(manifestModule) || (bSync && !this._manifestFailed)) {
					try {
						this.oManifest = LoaderExtensions.loadResource(manifestModule, {
							dataType: 'json',
							async: false,
							failOnError: !this.isSettingsEnhanced()
						});

						if (this._oManifest) {
							deepFreeze(this.oManifest);
						} else {
							this._manifestFailed = true;
						}
					} catch (e) {
						this._manifestFailed = true;
					}

				}
			}

			return this.oManifest;
		},

		/**
		 * Returns the dependency information of the library which is read from the library's manifest.
		 *
		 * The returned array contains elements which have a property "name" and an optional "lazy" property.
		 *
		 * @private
		 * @returns {Array<{name:string, lazy:boolean}>} The dependency information of the library
		 */
		_getDependencies: function() {
			var oManifest = this.getManifest();
			var aDependencies = [];

			var mDependencies = oManifest && oManifest["sap.ui5"] && oManifest["sap.ui5"].dependencies && oManifest["sap.ui5"].dependencies.libs;
			if (mDependencies) {
				// convert manifest map to array, inject object which contains "name" and optional "lazy" properties
				return Object.keys(mDependencies).reduce(function(aResult, sDependencyName) {
					if (!mDependencies[sDependencyName].lazy) {
						aResult.push({
							name: sDependencyName
						});
					} else if (oLibraryWithBundleInfo.has(sDependencyName)) {
						aResult.push({
							name: sDependencyName,
							lazy: true
						});
					}
					return aResult;
				}, aDependencies);
			} else {
				return aDependencies;
			}
		},

		/**
		 * Returns the i18n information of the library which is read from the library's manifest.
		 *
		 * @private
		 * @returns {object|undefined} The i18n information of the library
		 */
		_getI18nSettings: function() {
			var oManifest = this.getManifest(),
				vI18n;

			if ( oManifest && Version(oManifest._version).compareTo("1.9.0") >= 0 ) {
				vI18n = oManifest["sap.ui5"] && oManifest["sap.ui5"].library && oManifest["sap.ui5"].library.i18n;
			} // else vI18n = undefined

			vI18n = this._normalizeI18nSettings(vI18n);

			return vI18n;
		},

		/**
		 * Provides the default values for the library's i18n information
		 *
		 * @param {boolean|string|object} vI18n bundle information. Can be:
		 * <ul>
		 *     <li>false - library has no resource bundle</li>
		 *     <li>true|null|undefined - use default settings: bundle is 'messageBundle.properties',
		 *       fallback and supported locales are not defined (defaulted by ResourceBundle)</li>
		 *     <li>typeof string - string is the url of the bundle,
		 *       fallback and supported locales are not defined (defaulted by ResourceBundle)</li>
		 *     <li>typeof object - object can contain bundleUrl, supportedLocales, fallbackLocale</li>
		 * </ul>
		 *
		 * @private
		 * @returns {object} normalized i18N information
		 */
		_normalizeI18nSettings: function(vI18n) {
			if ( vI18n == null || vI18n === true ) {
				vI18n = {
					bundleUrl: "messagebundle.properties"
				};
			} else if ( typeof vI18n === "string" ) {
				vI18n = {
					bundleUrl: vI18n
				};
			} else if (typeof vI18n === "object") {
				vI18n = deepExtend({}, vI18n);
			}

			return vI18n;
		},

		/**
		 * Includes the library theme into the current page (if a variant is specified it will include the variant
		 * library theme)
		 *
		 * @param {string} [sVariant] the variant to include (optional)
		 * @param {string} [sQuery] to be used only by the Core
		 * @private
		 */
		_includeTheme: function(sVariant, sQuery) {
			var sName = this.name,
				bLibCssPreloaded = getPreloadLibCss().indexOf(sName) !== -1;

			aAllLibrariesRequiringCss.push({
				name: sName,
				version: this.version,
				variant: sVariant,
				preloadedCss: bLibCssPreloaded
			});

			_getThemeManager().then(function(ThemeManager) {
				ThemeManager.includeLibraryTheme(sName, sVariant, sQuery);
			});
		},

		/**
		 * Returns a resource bundle for the given locale.
		 *
		 * The locale's default value is read from {@link module:sap/base/i18n/Localization.getLanguage session locale}.
		 *
		 * This method returns the resource bundle directly. When the resource bundle for the given locale isn't loaded
		 * yet, synchronous request will be used to load the resource bundle. If it should be loaded asynchronously, use
		 * {@link #loadResourceBundle}.
		 *
		 * The {@link #preload} method will evaluate the same descriptor entry as described above. If it is not
		 * <code>false</code>, loading the main resource bundle of the library will become a subtask of the
		 * asynchronous preloading.
		 *
		 * Due to this preload of the main bundle and the caching behavior of this method, controls in such a library
		 * still can use this method in their API, behavior and rendering code without causing a synchronous request to
		 * be sent. Only when the bundle is needed at module execution time (by top level code in a control module),
		 * then the asynchronous loading of resource bundle with {@link #loadResourceBundle} should be preferred.
		 *
		 * @param {string} [sLocale] Locale to retrieve the resource bundle for
		 * @returns {module:sap/base/i18n/ResourceBundle} The best matching
		 *  resource bundle for the given locale or <code>undefined</code> when resource bundle isn't available
		 * @private
		 */
		getResourceBundle: function(sLocale) {
			return this._loadResourceBundle(sLocale, true /* bSync */);
		},

		/**
		 * Retrieves a resource bundle for the given locale.
		 *
		 * The locale's default value is read from {@link module:sap/base/i18n/Localization.getLanguage session locale}.
		 *
		 * <h3>Configuration via App Descriptor</h3>
		 * When the App Descriptor for the library is available without further request (manifest.json
		 * has been preloaded) and when the App Descriptor is at least of version 1.9.0 or higher, then
		 * this method will evaluate the App Descriptor entry <code>"sap.ui5" / "library" / "i18n"</code>.
		 * <ul>
		 * <li>When the entry is <code>true</code>, a bundle with the default name "messagebundle.properties"
		 * will be loaded</li>
		 * <li>If it is a string, then that string will be used as name of the bundle</li>
		 * <li>If it is <code>false</code>, no bundle will be loaded and the result will be
		 *     <code>undefined</code></li>
		 * </ul>
		 *
		 * <h3>Caching</h3>
		 * Once a resource bundle for a library has been loaded, it will be cached.
		 * Further calls for the same library and locale won't create new requests, but return the already
		 * loaded bundle. There's therefore no need for control code to cache the returned bundle for a longer
		 * period of time. Not further caching the result also prevents stale texts after a locale change.
		 *
		 * @param {string} [sLocale] Locale to retrieve the resource bundle for
		 * @returns {Promise<module:sap/base/i18n/ResourceBundle>} Promise that resolves with the best matching
		 *  resource bundle for the given locale
		 * @private
		 */
		loadResourceBundle: function(sLocale) {
			return this._loadResourceBundle(sLocale);
		},

		/**
		 * Internal method that either returns the resource bundle directly when <code>bSync</code> is set to
		 * <code>true</code> or a Promise that resolves with the resource bundle in the asynchronous case.
		 *
		 * @param {string} [sLocale] Locale to retrieve the resource bundle for
		 * @param {string} [bSync=false] Whether to load the resource bundle synchronously
		 * @returns {module:sap/base/i18n/ResourceBundle|Promise<module:sap/base/i18n/ResourceBundle>} The resource
		 * bundle in synchronous case, otherwise a promise that resolves with the resource bundle
		 * @private
		 */
		_loadResourceBundle: function(sLocale, bSync) {
			var that = this,
				oManifest = this.getManifest(bSync),
				// A library ResourceBundle can be requested before its owning library is preloaded.
				// In this case we do not have the library's manifest yet and the default bundle (messagebundle.properties) is requested.
				// We still cache this default bundle for as long as the library remains "not-preloaded".
				// When the library is preloaded later on, a new ResourceBundle needs to be requested, since we need to take the
				// "sap.ui5/library/i18n" section of the library's manifest into account.
				bLibraryManifestIsAvailable = !!oManifest,
				vResult,
				vI18n,
				sNotLoadedCacheKey,
				sKey;

			assert(sLocale === undefined || typeof sLocale === "string", "sLocale must be a string or omitted");
			sLocale = sLocale || Localization.getLanguage();
			sNotLoadedCacheKey = sLocale + "/manifest-not-available";

			// If the library was loaded in the meantime (or the first time around), we can delete the old ResourceBundle
			if (bLibraryManifestIsAvailable) {
				sKey = sLocale;
				delete this._resourceBundles[sNotLoadedCacheKey];
			} else {
				// otherwise we use the temporary cache-key
				sKey = sNotLoadedCacheKey;
			}

			vResult = this._resourceBundles[sKey];
			if (!vResult || (bSync && vResult instanceof Promise)) {

				vI18n = this._getI18nSettings();

				if (vI18n) {
					var sBundleUrl = getModulePath(this.name + "/", vI18n.bundleUrl);

					// add known library name to cache to avoid later guessing
					mGuessedLibraries[sBundleUrl] = this;

					vResult = ResourceBundle.create({
						bundleUrl: sBundleUrl,
						supportedLocales: vI18n.supportedLocales,
						fallbackLocale: vI18n.fallbackLocale,
						locale: sLocale,
						async: !bSync,
						activeTerminologies: Localization.getActiveTerminologies()
					});

					if (vResult instanceof Promise) {
						vResult = vResult.then(function(oBundle) {
							that._resourceBundles[sKey] = oBundle;
							return oBundle;
						});
					}

					// Save the result directly under the map
					// the real bundle will replace the promise after it's loaded in async case
					this._resourceBundles[sKey] = vResult;
				}
			}

			// if the bundle is loaded, return a promise which resolved with the bundle
			return bSync ? vResult : Promise.resolve(vResult);
		}
	});


	/**
	 * Returns an array containing all libraries which require loading of CSS
	 *
	 * @returns {Array} Array containing all libraries which require loading of CSS
	 * @private
	 * @ui5-restricted sap.ui.core.theming.Parameters
	 */
	Library.getAllInstancesRequiringCss = function() {
		return aAllLibrariesRequiringCss.slice();
	};

	/**
	 * Checks whether the library for the given <code>sName</code> has been loaded or not.
	 *
	 * @param {string} sName The name of the library
	 * @returns {boolean} Returns <code>true</code> if the library is loaded. Otherwise <code>false</code>.
	 * @public
	 */
	Library.isLoaded = function(sName) {
		return mLibraries[sName] ? true : false;
	};

	/**
	 * Internal method for fetching library instance from the library cache by using the given <code>sName</code>.
	 *
	 * When the <code>bCreate</code> is set to <code>true</code>, a new instance for the library is created in case
	 * there was no such library instance before. Otherwise, the library instance from the cache or
	 * <code>undefined</code> is returned.
	 *
	 * @param {string} sName The name of the library
	 * @param {boolean} bCreate Whether to create an instance for the library when there's no instance saved in the
	 *  cache under the given <code>sName</code>
	 * @returns {Promise<sap.ui.core.Lib>|undefined} Either an instance of the library or <code>undefined</code>
	 * @private
	 */
	Library._get = function(sName, bCreate) {
		var oLibrary = mLibraries[sName];

		if (!oLibrary && bCreate) {
			mLibraries[sName] = oLibrary = new Library({
				name: sName,
				_key: oConstructorKey
			});
		}

		return oLibrary;
	};

	/**
	 * Tries to derive a library from a bundle URL by guessing the resource name first,
	 * then trying to match with the (known) loaded libraries.
	 *
	 * @param {string} sBundleUrl The bundleURL from which the library name needs to be derived.
	 * @returns {sap.ui.core.Lib|undefined} Returns the corresponding library if found or 'undefined'.
	 * @private
	 */
	Library._getByBundleUrl = function(sBundleUrl) {
		if (sBundleUrl) {
			if (mGuessedLibraries[sBundleUrl]) {
				return mGuessedLibraries[sBundleUrl];
			}

			// [1] Guess ResourceName
			var sBundleName = sap.ui.loader._.guessResourceName(sBundleUrl);
			if (sBundleName) {

				// [2] Guess library name
				for (var sLibrary in mLibraries) {
					if (!mLibraries[sLibrary].isSettingsEnhanced()) {
						// ignore libraries that haven't been initialized
						continue;
					}
					var sLibraryName = sLibrary.replace(/\./g, "/");
					var oLib = mLibraries[sLibrary];
					if (sLibraryName !== "" && sBundleName.startsWith(sLibraryName + "/")) {
						var sBundlePath = sBundleName.replace(sLibraryName + "/", "");

						// [3] Retrieve i18n from manifest for looking up the base bundle
						//     (can be undefined if the lib defines "sap.ui5/library/i18n" with <false>)
						var vI18n = oLib._getI18nSettings();

						if (vI18n) {
							// Resolve bundle paths relative to library before comparing
							var sManifestBaseBundlePath = getModulePath(sLibraryName, "/" + vI18n.bundleUrl);
								sBundlePath = getModulePath(sLibraryName, "/" + sBundlePath);

							// the input bundle-path and the derived library bundle-path must match,
							// otherwise we would enhance the wrong bundle with terminologies etc.
							if (sBundlePath === sManifestBaseBundlePath) {
								// [4.1] Cache matching result
								mGuessedLibraries[sBundleUrl] = oLib;
								return oLib;
							}
							// [4.2] Cache none-matching result
							mGuessedLibraries[sBundleUrl] = false;
						}
					}
				}
			}
		}
	};

	/**
	 * Returns a map that contains the libraries that are already initialized (by calling {@link #.init}). Each library
	 * instance is saved in the map under its name as key.
	 *
	 * @returns {object} A map that contains the initialized libraries. Each library is saved in the map under its name
	 *  as key.
	 * @private
	 * @ui5-restricted sap.ui.core, sap.ui.support, sap.ui.fl, sap.ui.dt
	 */
	Library.all = function() {
		// return only libraries that are initialized (settings enhanced)
		return Library._all(false /* bIgnoreSettingsEnhanced */);
	};

	/**
	 * Returns a map that contains the libraries that are already initialized (by calling {@link #.init}). Each library
	 * instance is saved in the map under its name as key.
	 *
	 * @param {boolean} [bIgnoreSettingsEnhanced=false] All libraries are returned when it's set to true. Otherwise only
	 *  the libraries with their settings enhanced are returned.
	 * @returns {object} A map of libraries. Each library is saved in the map under its name as key.
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	Library._all = function(bIgnoreSettingsEnhanced) {
		var mInitLibraries = {};

		Object.keys(mLibraries).forEach(function(sKey) {
			if (bIgnoreSettingsEnhanced || mLibraries[sKey].isSettingsEnhanced()) {
				mInitLibraries[sKey] = mLibraries[sKey];
			}
		});

		return mInitLibraries;
	};

	/*
	 * A symbol used to mark a Proxy as such
	 * Proxys are indistinguishable from the outside, but we need a way
	 * to prevent duplicate Proxy wrapping for library namespaces.
	 */
	const symIsProxy = Symbol("isProxy");

	/**
	 * Creates a Proxy handler object for the a library namespace.
	 * Additionally creates a WeakMap for storing sub-namespace segments.
	 * @param {string} sLibName the library name in dot-notation
	 * @param {object} oLibNamespace the top-level library namespace object
	 * @returns {object} an object containing the proxy-handler and the sub-namespace map
	 */
	function createProxyForLibraryNamespace(sLibName, oLibNamespace) {
		// weakmap to track sub-namespaces for a library
		// key: the sub-namespace objects, value: the accumulated namespace segments as string[]
		// initial entry (the first 'target') is the library namespace object itself
		const mSubNamespaces = new WeakMap();
		mSubNamespaces.set(oLibNamespace, `${sLibName}.`);

		// Proxy facade for library namespace/info-object
		// will be filled successively by the library after Library.init()
		const oLibProxyHandler = {

			set(target, prop, value) {
				// only analyze plain-objects: literals and (Constructor) functions, etc. must not have a proxy
				// note: we explicitly must exclude Proxies here, since they are recognized as plain and empty
				if ( isPlainObject(value) && !value[symIsProxy]) {
					//Check Objects if they only contain static values
					// assumption: a non-empty plain-object with only static content is an enum
					const valueIsEmpty = isEmptyObject(value);

					let registerProxy = valueIsEmpty;

					if (!valueIsEmpty) {
						if (DataType._isEnumCandidate(value)) {
							// general namespace assignment
							target[prop] = value;

							// join library sub-paths when registering an enum type
							// note: namespace already contains a trailing dot '.'
							const sNamespacePrefix = mSubNamespaces.get(target);
							DataType.registerEnum(`${sNamespacePrefix}${prop}`, value);

							Log.debug(`[Library API-Version 2] If you intend to use API-Version 2 in your library, make sure to call 'sap/ui/base/DataType.registerEnum' for ${sNamespacePrefix}${prop}.`);
						} else {
							const firstChar = prop.charAt(0);
							if (firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase()) {
								registerProxy = true;
							} else {
								// general namespace assignment
								target[prop] = value;
							}
						}
					}

					if (registerProxy) {
						target[prop] = new Proxy(value, oLibProxyHandler);
						// append currently written property to the namespace (mind the '.' at the end for the next level)
						const sNamespacePrefix = `${mSubNamespaces.get(target)}${prop}.`;
						// track nested namespace paths segments per proxy object
						mSubNamespaces.set(value, sNamespacePrefix);
					}
				} else {
					// no plain-object values, e.g. strings, classes
					target[prop] = value;
				}

				return true;
			},

			get(target, prop) {
				// check if an object is a proxy
				if (prop === symIsProxy) {
					return true;
				}
				return target[prop];
			}
		};

		return oLibProxyHandler;
	}

	/**
	 * Provides information about a library.
	 *
	 * This method is intended to be called exactly once while the main module of a library (its <code>library.js</code>
	 * module) is executing, typically at its begin. The single parameter <code>mSettings</code> is an info object that
	 * describes the content of the library.
	 *
	 * When the <code>mSettings</code> has been processed, a normalized version will be set on the library instance
	 * Finally, this function fires {@link #event:LibraryChanged} event with operation 'add' for the newly loaded
	 * library.
	 *
	 * <h3>Side Effects</h3>
	 *
	 * While analyzing the <code>mSettings</code>, the framework takes some additional actions:
	 *
	 * <ul>
	 * <li>If the object contains a list of <code>interfaces</code>, they will be registered with the {@link
	 * sap.ui.base.DataType} class to make them available as aggregation types in managed objects.</li>
	 *
	 * <li>If the object contains a list of <code>controls</code> or <code>elements</code>, {@link sap.ui.lazyRequire
	 * lazy stubs} will be created for their constructor as well as for their static <code>extend</code> and
	 * <code>getMetadata</code> methods.
	 *
	 * <b>Note:</b> Future versions of UI5 will abandon the concept of lazy stubs as it requires synchronous
	 * XMLHttpRequests which have been deprecated (see {@link http://xhr.spec.whatwg.org}). To be on the safe side,
	 * productive applications should always require any modules that they directly depend on.</li>
	 *
	 * <li>With the <code>noLibraryCSS</code> property, the library can be marked as 'theming-free'.  Otherwise, the
	 * framework will add a &lt;link&gt; tag to the page's head, pointing to the library's theme-specific stylesheet.
	 * The creation of such a &lt;link&gt; tag can be suppressed with the {@link topic:91f2d03b6f4d1014b6dd926db0e91070 global
	 * configuration option} <code>preloadLibCss</code>.  It can contain a list of library names for which no stylesheet
	 * should be included.  This is e.g. useful when an application merges the CSS for multiple libraries and already
	 * loaded the resulting stylesheet.</li>
	 *
	 * <li>If a list of library <code>dependencies</code> is specified in the info object, those libraries will be
	 * loaded synchronously if they haven't been loaded yet.
	 *
	 * <b>Note:</b> Dependencies between libraries have to be modeled consistently in several places:
	 * <ul>
	 * <li>Both eager and lazy dependencies have to be modelled in the <code>.library</code> file.</li>
	 * <li>By default, UI5 Tooling generates a <code>manifest.json</code> file from the content of the <code>.library</code>
	 * file. However, if the <code>manifest.json</code> file for the library is not generated but
	 * maintained manually, it must be kept consistent with the <code>.library</code> file, especially regarding
	 * its listed library dependencies.</li>
	 * <li>All eager library dependencies must be declared as AMD dependencies of the <code>library.js</code> module
	 * by referring to the corresponding <code>"some/lib/namespace/library"</code> module of each library
	 * dependency.</code></li>
	 * <li>All eager dependencies must be listed in the <code>dependencies</code> property of the info object.</li>
	 * <li>All lazy dependencies <b>must not</b> be listed as AMD dependencies or in the <code>dependencies</code>
	 * property of the info object.</li>
	 * </ul>
	 *
	 * Last but not least, higher layer frameworks might want to include their own metadata for libraries.
	 * The property <code>extensions</code> might contain such additional metadata. Its structure is not defined
	 * by the framework, but it is strongly suggested that each extension only occupies a single property
	 * in the <code>extensions</code> object and that the name of that property contains some namespace
	 * information (e.g. library name that introduces the feature) to avoid conflicts with other extensions.
	 * The framework won't touch the content of <code>extensions</code> but will make it available
	 * in the library info objects provided by {@link #.load}.
	 *
	 *
	 * <h3>Relationship to Descriptor for Libraries (manifest.json)</h3>
	 *
	 * The information contained in <code>mSettings</code> is partially redundant to the content of the descriptor
	 * for the same library (its <code>manifest.json</code> file). Future versions of UI5 will ignore the information
	 * provided in <code>mSettings</code> and will evaluate the descriptor file instead. Library developers therefore
	 * must keep the information in both files in sync if the <code>manifest.json</code> file is maintained manually.
	 *
	 *
	 * <h3>Library API-Version 2</h3>
	 *
	 * The Library API Version 2 has been introduced to avoid access to the global namespace when retrieving enum types.
	 * With Library API Version 2 a library must declare its enum types via {@link module:sap/ui/base/DataType.registerEnum DataType.registerEnum}.
	 *
	 * @param {object} mSettings Info object for the library
	 * @param {string} mSettings.name Name of the library; It must match the name by which the library has been loaded
	 * @param {string} [mSettings.version] Version of the library
	 * @param {int} [mSettings.apiVersion=1] The library's API version; supported values are 1, 2 and <code>undefined</code> (defaults to 1).
	 * @param {string[]} [mSettings.dependencies=[]] List of libraries that this library depends on; names are in dot
	 *  notation (e.g. "sap.ui.core")
	 * @param {string[]} [mSettings.types=[]] List of names of types that this library provides; names are in dot
	 *  notation (e.g. "sap.ui.core.CSSSize")
	 * @param {string[]} [mSettings.interfaces=[]] List of names of interface types that this library provides; names
	 *  are in dot notation (e.g. "sap.ui.core.PopupInterface")
	 * @param {string[]} [mSettings.controls=[]] Names of control types that this library provides; names are in dot
	 *  notation (e.g. "sap.ui.core.ComponentContainer")
	 * @param {string[]} [mSettings.elements=[]] Names of element types that this library provides (excluding controls);
	 *  names are in dot notation (e.g. "sap.ui.core.Item")
	 * @param {boolean} [mSettings.noLibraryCSS=false] Indicates whether the library doesn't provide / use theming.
	 *  When set to true, no library.css will be loaded for this library
	 * @param {object} [mSettings.extensions] Potential extensions of the library metadata; structure not defined by the
	 *  UI5 core framework.
	 * @returns {object} Returns the library namespace, based on the given library name.
	 * @public
	 */
	Library.init = function(mSettings) {
		// throw error if a Library is initialized before the core is ready.
		if (!sap.ui.require("sap/ui/core/Core")) {
			throw new Error("Library " + mSettings.name + ": Library must not be used before the core is ready!");
		}

		assert(typeof mSettings === "object" , "mSettings given to 'sap/ui/core/Lib.init' must be an object");
		assert(typeof mSettings.name === "string" && mSettings.name, "mSettings given to 'sap/ui/core/Lib.init' must have the 'name' property set");

		var METHOD = "sap/ui/core/Lib.init";
		Log.debug("Analyzing Library " + mSettings.name, null, METHOD);

		var oLib = Library._get(mSettings.name, true /* bCreate */);
		oLib.enhanceSettings(mSettings);

		var oLibNamespace = Object.create(null),
			i;

		/**
		 * Creates the library namespace inside the global object.
		 * @deprecated since 1.120
		 */
		oLibNamespace = ObjectPath.create(mSettings.name);

		// If a library states that it is using apiVersion 2, we expect types to be fully declared.
		// In this case we don't need to create Proxies for the library namespace.
		const apiVersion = mSettings.apiVersion ?? 1;

		if (![1, 2].includes(apiVersion)) {
			throw new TypeError(`The library '${mSettings.name}' has defined 'apiVersion: ${apiVersion}', which is an unsupported value. The supported values are: 1, 2 and undefined (defaults to 1).`);
		}

		if (apiVersion < 2) {
			const oLibProxyHandler = createProxyForLibraryNamespace(mSettings.name, oLibNamespace);

			// activate proxy for outer library namespace object
			oLibNamespace = new Proxy(oLibNamespace, oLibProxyHandler);

			/**
			 * proxy must be written back to the original path (global)
			 * @deprecated since 1.120
			 */
			ObjectPath.set(mSettings.name, oLibNamespace);
		}


		/**
		 * Synchronously resolve dependencies
		 * @deprecated since 1.120
		 */
		for (i = 0; i < oLib.dependencies.length; i++) {
			var sDepLib = oLib.dependencies[i];
			var oDepLib = Library._get(sDepLib, true /* bCreate */);
			Log.debug("resolve Dependencies to " + sDepLib, null, METHOD);
			if (!oDepLib.isSettingsEnhanced()) {
				Log.warning("Dependency from " + mSettings.name + " to " + sDepLib + " has not been resolved by library itself", null, METHOD);
				Library._load({name: sDepLib}, {sync: true}); // legacy-relevant: Sync fallback for missing manifest/AMD dependencies
			}
		}

		// register interface types
		DataType.registerInterfaceTypes(oLib.interfaces);

		function createHintForType(sTypeName) {
			const typeObj = ObjectPath.get(sTypeName);
			if ( typeObj instanceof DataType ) {
				return ` to ensure that the type is defined. You can then access it by calling 'DataType.getType("${sTypeName}")'.`;
			} else if ( isPlainObject(typeObj) ) {
				return `. You can then reference this type via the library's module export.`;
			} else {
				return `.`; // no further hint
			}
		}

		/**
		 * Declare a module for each (non-builtin) simple type.
		 * Only needed for backward compatibility: some code 'requires' such types although they never have been modules on their own.
		 * @deprecated since 1.120
		 */
		for (i = 0; i < oLib.types.length; i++) {
			if ( !/^(any|boolean|float|int|string|object|void)$/.test(oLib.types[i]) ) {
				// register a pseudo module that logs a deprecation warning
				const sTypeName = oLib.types[i];
				sap.ui.loader._.declareModule(
					sTypeName.replace(/\./g, "/") + ".js",
					() => (
						`Importing the pseudo module '${sTypeName.replace(/\./g, "/")}' is deprecated.`
						+ ` To access the type '${sTypeName}', please import '${oLib.name.replace(/\./g, "/")}/library'`
						+ createHintForType(sTypeName)
						+ ` For more information, see documentation under 'Best Practices for Loading Modules'.`
					)
				);

				// ensure parent namespace of the type
				var sNamespacePrefix = sTypeName.substring(0, sTypeName.lastIndexOf("."));
				if (ObjectPath.get(sNamespacePrefix) === undefined) {
					// parent type namespace does not exists, so we create its
					ObjectPath.create(sNamespacePrefix);
				}
			}
		}

		/**
		 * create lazy loading stubs for all controls and elements
		 * @deprecated since 1.120
		 */
		(() => {
			var aElements = oLib.controls.concat(oLib.elements);
			for (i = 0; i < aElements.length; i++) {
				sap.ui.lazyRequire(aElements[i], "new extend getMetadata"); // TODO don't create an 'extend' stub for final classes
			}
		})();

			// include the library theme, but only if it has not been suppressed in library metadata or by configuration
		if (!oLib.noLibraryCSS) {
			var oLibThemingInfo = {
				name: oLib.name,
				version: oLib.version,
				preloadedCss: getPreloadLibCss().indexOf(oLib.name) !== -1
			};
			aAllLibrariesRequiringCss.push(oLibThemingInfo);
			// Don't reset ThemeManager in case CSS for current library is already preloaded
			_getThemeManager(/* bClear = */ !oLibThemingInfo.preloadedCss).then(function(ThemeManager) {
				ThemeManager._includeLibraryThemeAndEnsureThemeRoot(oLibThemingInfo);
			});
		}

		// expose some legacy names
		oLib.sName = oLib.name;
		oLib.aControls = oLib.controls;

		Library.fireLibraryChanged({
			name: mSettings.name,
			stereotype: "library",
			operation: "add",
			metadata: oLib
		});

		return oLibNamespace;
	};

	function getLibraryModuleNames(aLibs) {
		return aLibs.map(function(oLib) {
			return oLib.name.replace(/\./g, "/") + "/library";
		});
	}

	function requireLibrariesAsync(aLibs) {
		var aLibraryModuleNames = getLibraryModuleNames(aLibs);

		return new Promise(function(resolve, reject) {
			sap.ui.require(
				aLibraryModuleNames,
				function () {
					// Wrapper function is needed to omit parameters for resolve()
					// which is always one library (first from the list), not an array of libraries.
					resolve(aLibs);
				},
				reject
			);
		});
	}

	/**
	 * Loads the given library and its dependencies and makes its content available to the application.
	 *
	 *
	 * <h3>What it does</h3>
	 *
	 * When library preloads are not suppressed for the given library, then a library-preload bundle will be loaded for
	 * it.
	 *
	 * After preloading the bundle, dependency information from the bundle is evaluated and any missing libraries are
	 * also preloaded.
	 *
	 * Only then the library entry module (named <code><i>your/lib</i>/library.js</code>) will be required and executed.
	 * The module is supposed to call {@link #.init} providing the framework with additional metadata about the library,
	 * e.g. its version, the set of contained enums, types, interfaces, controls and elements and whether the library
	 * requires CSS. If the library requires CSS, a &lt;link&gt; will be added to the page referring to the
	 * corresponding <code>library.css</code> stylesheet for the library and the current theme.
	 *
	 * When the optional parameter <code>mOptions.url</code> is given, then that URL will be registered for the
	 * namespace of the library and all resources will be loaded from that location. This is convenience for a call like
	 * <pre>
	 *   sap.ui.loader.config({
	 *     paths: {
	 *       "lib/with/slashes": mOptions.url
	 *     }
	 *   });
	 * </pre>
	 *
	 * When the given library has been loaded already, no further action will be taken, especially, a given URL will not
	 * be registered. A Promise will be returned, but will be resolved immediately.
	 *
	 *
	 * <h3>When to use</h3>
	 *
	 * For applications that follow the best practices and use components with component descriptors (manifest.json),
	 * the framework will load all declared mandatory libraries and their dependencies automatically before
	 * instantiating the application component.
	 *
	 * The same is true for libraries that are listed in the bootstrap configuration (e.g. with the attribute
	 * <code>data-sap-ui-libs</code>). They will be loaded before the <code>init</code> event of the UI5 Core is fired.
	 *
	 * Only when an app declares a library to be a lazy library dependency or when code does not use descriptors at all,
	 * then an explicit call to <code>loadLibrary</code> becomes necessary. The call should be made before artifacts
	 * (controls, elements, types, helpers, modules etc.) from the library are used or required. This allows the
	 * framework to optimize access to those artifacts.
	 *
	 * For example, when an app uses a heavy-weight charting library that shouldn't be loaded during startup, it can
	 * declare it as "lazy" and load it just before it loads and displays a view that uses the charting library:
	 * <pre>
	 *   await Library.load({name: "heavy.charting"});
	 *   await View.create({
	 *       name: "myapp.views.HeavyChartingView",
	 *       type: ViewType.XML
	 *   });
	 * </pre>
	 *
	 * @param {object} mOptions The options object that contains the following properties
	 * @param {string} mOptions.name The name of the library
	 * @param {string} [mOptions.url] URL to load the library from
	 * @returns {Promise<sap.ui.core.Lib>} A promise that resolves with the library instance after the loading of
	 *  the library is finished
	 * @public
	 */
	Library.load = function(mOptions) {
		if (typeof mOptions === "string") {
			mOptions = {name: mOptions};
		} else {
			mOptions = ["name", "url"].reduce(function(acc, sProperty) {
				if (mOptions && mOptions.hasOwnProperty(sProperty)) {
					acc[sProperty] = mOptions[sProperty];
				}
				return acc;
			}, {});
		}

		return Library._load(mOptions).then(function(aLibs) {
			return aLibs[0];
		});
	};

	/**
	 * Internal function for loading library/libraries which still supports the legacy features:
	 *
	 * <ul>
	 * <li>loading multiple libraries: libraries are preloaded firstly and their entry modules are executed within a
	 * single <code>sap.ui.require</code> call after their preloads are finished</li>
	 * <li><code>oLibConfig.json</code>: load the library preload in JSON format</li>
	 * <li><code>mOptions.sync</code>: load the preload file in sync mode</li>
	 * <li><code>mOptions.preloadOnly</code>: load the preload file in sync mode</li>
	 * </ul>
	 *
	 * @param {object[]|object} vLibConfigs An array of objects for libraries or a single object for one library
	 *  which contain the following properties
	 * @param {string} vLibConfigs.name The name of the library
	 * @param {string} [vLibConfigs.url] URL to load the library from
	 * @param {boolean} [vLibConfigs.json] Whether to load the library's preload bundle in JSON format
	 * @param {object} [mOptions] The options object that contains the following properties
	 * @param {boolean} [mOptions.sync] Whether to load the preload bundle(s) in sync mode
	 * @param {boolean} [mOptions.preloadOnly] Whether to skip executing the entry module(s) after preloading the
	 *  library/libraries
	 * @return {Promise<Array<sap.ui.core.Lib>>|Array<sap.ui.core.Lib>} A promise that resolves with an
	 *  array of library instances in async mode or an array of library instances in sync mode
	 * @private
	 */
	Library._load = function(vLibConfigs, mOptions) {
		mOptions = mOptions || {};

		if (!Array.isArray(vLibConfigs)) {
			vLibConfigs = [vLibConfigs];
		}

		var mAdditionalConfig = {};
		var aLibraryNames = [];
		vLibConfigs.forEach(function(vLibrary) {
			if (typeof vLibrary === "object") {
				if (vLibrary.hasOwnProperty("url") || vLibrary.hasOwnProperty("json")) {
					mAdditionalConfig[vLibrary.name] = vLibrary;
				}
				aLibraryNames.push(vLibrary.name);
			} else {
				aLibraryNames.push(vLibrary);
			}
		});

		var bPreload = Library.getPreloadMode() === 'sync' || Library.getPreloadMode() === 'async',
			bRequire = !mOptions.preloadOnly;

		if (!mOptions.sync) {
			aLibraryNames = VersionInfo._getTransitiveDependencyForLibraries(aLibraryNames);
		}

		var aLibs = aLibraryNames.map(function(sLibraryName) {
			var oLib = Library._get(sLibraryName, true /* bCreate */);

			if (oLib._loadingStatus == null && mAdditionalConfig[sLibraryName] && mAdditionalConfig[sLibraryName].url) {
				registerModulePath(sLibraryName, mAdditionalConfig[sLibraryName].url);
			}

			return oLib;
		});

		/**
		 * sync loading
		 * @deprecated since 1.120
		 */
		if (mOptions.sync) {
			if (bPreload) {
				aLibs.forEach(function(oLib) {
					var mOptions = {sync: true};
					if (mAdditionalConfig[oLib.name] && mAdditionalConfig[oLib.name].hasOwnProperty("json")) {
						mOptions.json = mAdditionalConfig[oLib.name].json;
					}
					oLib._preload(mOptions);
				});
			}

			if (bRequire) {
				getLibraryModuleNames(aLibs).forEach(function(sModuleName, index) {
					if (aLibs[index].isSettingsEnhanced()) {
						// load library only once
						return;
					}

					// require the library module (which in turn will call initLibrary())
					sap.ui.requireSync(sModuleName); // legacy-relevant: Sync path

					// check for legacy code
					if (!aLibs[index].isSettingsEnhanced()) {
						Log.warning("library " + aLibs[index].name + " didn't initialize itself");
						Library.init({ name: aLibs[index].name }); // TODO redundant to generated initLibrary call....
					}
				});
			}

			return aLibs;
		}

		const pPreloaded = bPreload ?
			Promise.all(aLibs.map(function(oLib) {
				const mOptions = {};
				if (mAdditionalConfig[oLib.name] && mAdditionalConfig[oLib.name].hasOwnProperty("json")) {
					mOptions.json = mAdditionalConfig[oLib.name].json;
				}
				return oLib._preload(mOptions);
			})) :
			Promise.resolve(aLibs);

		return bRequire ? pPreloaded.then(requireLibrariesAsync) : pPreloaded;
	};

	/**
	 * Retrieves a resource bundle for the given library and locale.
	 *
	 * This method returns the resource bundle directly. When the resource bundle for the given locale isn't loaded
	 * yet, synchronous request will be used to load the resource bundle.
	 *
	 * If only one argument is given, it is assumed to be the library name. The locale
	 * then falls back to the current {@link module:sap/base/i18n/Localization.getLanguage session locale}.
	 *
	 * <h3>Configuration via App Descriptor</h3>
	 * When the App Descriptor for the library is available without further request (manifest.json
	 * has been preloaded) and when the App Descriptor is at least of version 1.9.0 or higher, then
	 * this method will evaluate the App Descriptor entry <code>"sap.ui5" / "library" / "i18n"</code>.
	 * <ul>
	 * <li>When the entry is <code>true</code>, a bundle with the default name "messagebundle.properties"
	 * will be loaded</li>
	 * <li>If it is a string, then that string will be used as name of the bundle</li>
	 * <li>If it is <code>false</code>, no bundle will be loaded and the result will be
	 *     <code>undefined</code></li>
	 * </ul>
	 *
	 * <h3>Caching</h3>
	 * Once a resource bundle for a library has been loaded, it will be cached.
	 * Further calls for the same locale won't create new requests, but return the already
	 * loaded bundle. There's therefore no need for control code to cache the returned bundle for a longer
	 * period of time. Not further caching the result also prevents stale texts after a locale change.
	 *
	 * @param {string} sLibrary Name of the library to retrieve the bundle for
	 * @param {string} [sLocale] Locale to retrieve the resource bundle for
	 * @returns {module:sap/base/i18n/ResourceBundle|undefined} The best matching resource bundle for the given
	 *  parameters or <code>undefined</code>
	 * @public
	 */
	Library.getResourceBundleFor = function(sLibrary, sLocale) {
		var oLibrary = Library._get(sLibrary, true);

		return oLibrary.getResourceBundle(sLocale);
	};

	/**
	 * Registers the given Element class to the library to which it belongs.
	 *
	 * @param {sap.ui.core.ElementMetadata} oElementMetadata the metadata of the Element class
	 * @private
	 */
	Library._registerElement = function(oElementMetadata) {
		var sElementName = oElementMetadata.getName(),
			sLibraryName = oElementMetadata.getLibraryName() || "",
			oLibrary = Library._get(sLibraryName),
			sCategory = oElementMetadata.isA("sap.ui.core.Control") ? 'controls' : 'elements';

		// if library has not been loaded yet, create a library
		if (!oLibrary) {
			/**
             * Ensure namespace.
             * @deprecated since 1.120
             */
			ObjectPath.create(sLibraryName);
			oLibrary = Library._get(sLibraryName, true /* bCreate */);
		}

		if (oLibrary[sCategory].indexOf(sElementName) < 0) {
			// add class to corresponding category in library ('elements' or 'controls')
			oLibrary[sCategory].push(sElementName);

			Log.debug("Class " + sElementName + " registered for library " + sLibraryName);
			Library.fireLibraryChanged({name: sElementName, stereotype: oElementMetadata.getStereotype(), operation: "add", metadata : oElementMetadata});
		}
	};

	var _oEventProvider = new EventProvider();

	/**
	 * Fired when the set of controls, elements etc. for a library has changed or when the set of libraries has changed.
	 *
	 * Note: while the parameters of this event could already describe <i>any</i> type of change, the set of reported
	 * changes is currently restricted to the addition of libraries, controls and elements. Future implementations might
	 * extend the set of reported changes. Therefore applications should already check the operation and stereotype
	 * parameters.
	 *
	 * @name sap.ui.core.Lib#libraryChanged
	 * @event
	 * @param {sap.ui.base.Event} oEvent
	 * @param {sap.ui.base.EventProvider} oEvent.getSource
	 * @param {object} oEvent.getParameters
	 * @param {string} oEvent.getParameters.name name of the newly added entity
	 * @param {string} [oEvent.getParameters.stereotype] stereotype of the newly added entity type ("control", "element")
	 * @param {string} [oEvent.getParameters.operation] type of operation ("add")
	 * @param {sap.ui.base.Metadata|object} [oEvent.getParameters.metadata] metadata for the added entity type.
	 *         Either an instance of sap.ui.core.ElementMetadata if it is a Control or Element, or a library info object
	 *         if it is a library. Note that the API of all metadata objects is not public yet and might change.
	 *
	 * @private
	 * @ui5-restricted sap.ui.core, sap.ui.fl, sap.ui.support
	 */

	/**
	 * Register a listener for the {@link sap.ui.core.Lib#event:libraryChanged} event.
	 *
	 * @param {function} fnFunction Callback to be called when the <code>libraryChanged</code> event is fired
	 * @param {object} [oListener] Optional context object to call the callback on
	 *
	 * @private
	 * @ui5-restricted sap.ui.fl, sap.ui.support
	 */
	Library.attachLibraryChanged = function(fnFunction, oListener) {
		_oEventProvider.attachEvent("LibraryChanged", fnFunction, oListener);
	};

	/**
	 * Unregister a listener from the {@link sap.ui.core.Lib#event:libraryChanged} event.
	 *
	 * @param {function} fnFunction function to unregister
	 * @param {object} [oListener] context object given during registration
	 *
	 * @private
	 * @ui5-restricted sap.ui.fl, sap.ui.support
	 */
	Library.detachLibraryChanged = function(fnFunction, oListener) {
		_oEventProvider.detachEvent("LibraryChanged", fnFunction, oListener);
	};

	/**
	 * Fires a libraryChanged event when:
	 *   - a new library was loaded
	 *   - a control/element was added to a library
	 * @param {object} oParams the event parameters
	 *
	 * @private
	 */
	Library.fireLibraryChanged = function(oParams) {
		// notify registered Core listeners
		_oEventProvider.fireEvent("LibraryChanged", oParams);
	};

	/**
	 * Implementation of the ResourceBundle._enrichBundleConfig hook.
	 * Guesses if the given bundleUrl is pointing to a library's ResourceBundle and adapts the given bundle definition accordingly
	 * based on the inferred library's manifest.
	 *
	 * @param {module:sap/base/i18n/ResourceBundle.Configuration} mParams Map containing the arguments of the <code>ResourceBundle.create</code> call
	 * @returns {module:sap/base/i18n/ResourceBundle.Configuration} mParams The enriched config object
	 * @private
	 */
	ResourceBundle._enrichBundleConfig = function (mParams) {
		if (!mParams.terminologies || !mParams.enhanceWith) {

			var oLib = Library._getByBundleUrl(mParams.url);

			if (oLib) {
				// look up i18n information in library manifest
				// (can be undefined if the lib defines "sap.ui5/library/i18n" with <false>)
				var vI18n = oLib._getI18nSettings();

				// enrich i18n information
				if (vI18n) {
					// resolve bundleUrls relative to library path
					var sLibraryPath = oLib.name.replace(/\./g, "/");
					sLibraryPath = sLibraryPath.endsWith("/") ? sLibraryPath : sLibraryPath + "/"; // add trailing slash if missing
					sLibraryPath = sap.ui.require.toUrl(sLibraryPath);

					_UrlResolver._processResourceConfiguration(vI18n, {
						alreadyResolvedOnRoot: true,
						relativeTo: sLibraryPath
					});

					// basic i18n information
					mParams.fallbackLocale = mParams.fallbackLocale || vI18n.fallbackLocale;
					mParams.supportedLocales = mParams.supportedLocales || vI18n.supportedLocales;

					// text verticalization information
					mParams.terminologies = mParams.terminologies || vI18n.terminologies;
					mParams.enhanceWith = mParams.enhanceWith || vI18n.enhanceWith;
					mParams.activeTerminologies = mParams.activeTerminologies || Localization.getActiveTerminologies();
				}
			}
		}
		return mParams;
	};

	/**
	 * Get VersionedLibCss config option
	 *
	 * @returns {boolean} Wether VersionedLibCss is enabled or not
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	Library.getVersionedLibCss = function() {
		return BaseConfig.get({
			name: "sapUiVersionedLibCss",
			type: BaseConfig.Type.Boolean,
			external: true
		});
	};

	/**
	 * Whether dependency cache info files should be loaded instead of preload files.
	 *
	 * @private
	 * @ui5-restricted sap.ui.core
	 * @returns {boolean} whether dep-cache info files should be loaded
	 */
	Library.isDepCacheEnabled = function() {
		return BaseConfig.get({
			name: "sapUiXxDepCache",
			type: BaseConfig.Type.Boolean,
			external: true
		});
	};

	/**
	 * Currently active preload mode for libraries or falsy value.
	 *
	 * @returns {string} preload mode
	 * @private
	 * @ui5-restricted sap.ui.core
	 * @since 1.120.0
	 */
	Library.getPreloadMode = function() {
		// if debug sources are requested, then the preload feature must be deactivated
		if (Supportability.isDebugModeEnabled() === true) {
			return "";
		}
		// determine preload mode (e.g. resolve default or auto)
		let sPreloadMode = BaseConfig.get({
			name: "sapUiPreload",
			type: BaseConfig.Type.String,
			defaultValue: "auto",
			external: true
		});
		// when the preload mode is 'auto', it will be set to 'async' or 'sync' for optimized sources
		// depending on whether the ui5loader is configured async
		if ( sPreloadMode === "auto" ) {
			if (window["sap-ui-optimized"]) {
				sPreloadMode = sap.ui.loader.config().async ? "async" : "sync";
			} else {
				sPreloadMode = "";
			}
		}
		return sPreloadMode;
	};

	return Library;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides the locale object sap.ui.core.Locale
sap.ui.predefine("sap/ui/core/Locale", ['sap/base/assert', 'sap/ui/base/Object', "sap/base/i18n/Localization", "sap/base/i18n/LanguageTag"],
	function(assert, BaseObject, Localization, LanguageTag) {
	"use strict";

	var mCache = Object.create(null);

	/**
	 * Creates an instance of the Locale.
	 *
	 * @class Locale represents a locale setting, consisting of a language, script, region, variants, extensions and private use section.
	 *
	 * @param {string} sLocale the locale identifier, in format en-US or en_US.
	 *
	 * @extends sap.ui.base.Object
	 * @author SAP SE
	 * @version 1.125.0
	 * @public
	 * @alias sap.ui.core.Locale
	 */
	 var Locale = BaseObject.extend("sap.ui.core.Locale", /** @lends sap.ui.core.Locale.prototype */ {

		constructor : function(vLocale) {
			BaseObject.apply(this);
			if (vLocale instanceof LanguageTag) {
				this.oLanguageTag = vLocale;
				this.sLocaleId = this.oLanguageTag.toString();
			} else {
				this.oLanguageTag = new LanguageTag(vLocale);
				this.sLocaleId = vLocale;
			}
			Object.assign(this, this.oLanguageTag);
			this.sLanguage = this.language;
		},

		/**
		 * Get the locale language.
		 *
		 * Note that the case might differ from the original script tag
		 * (Lower case is enforced as recommended by BCP47/ISO639).
		 *
		 * @returns {string} the language code
		 * @public
		 */
		getLanguage : function() {
			return this.language;
		},

		/**
		 * Get the locale script or <code>null</code> if none was specified.
		 *
		 * Note that the case might differ from the original language tag
		 * (Upper case first letter and lower case reminder enforced as
		 * recommended by BCP47/ISO15924)
		 *
		 * @returns {string|null} the script code or <code>null</code>
		 * @public
		 */
		getScript : function() {
			return this.script;
		},

		/**
		 * Get the locale region or <code>null</code> if none was specified.
		 *
		 * Note that the case might differ from the original script tag
		 * (Upper case is enforced as recommended by BCP47/ISO3166-1).
		 *
		 * @returns {string} the ISO3166-1 region code (2-letter or 3-digits)
		 * @public
		 */
		getRegion : function() {
			return this.region;
		},

		/**
		 * Get the locale variants as a single string or <code>null</code>.
		 *
		 * Multiple variants are separated by a dash '-'.
		 *
		 * @returns {string|null} the variant or <code>null</code>
		 * @public
		 */
		getVariant : function() {
			return this.variant;
		},

		/**
		 * Get the locale variants as an array of individual variants.
		 *
		 * The separating dashes are not part of the result.
		 * If there is no variant section in the locale tag, an empty array is returned.
		 *
		 * @returns {string[]} the individual variant sections
		 * @public
		 */
		getVariantSubtags : function() {
			return this.variantSubtags;
		},

		/**
		 * Get the locale extension as a single string or <code>null</code>.
		 *
		 * The extension always consists of a singleton character (not 'x'),
		 * a dash '-' and one or more extension token, each separated
		 * again with a dash.
		 *
		 * Use {@link #getExtensions} to get the individual extension tokens as an array.
		 *
		 * @returns {string|null} the extension or <code>null</code>
		 * @public
		 */
		getExtension : function() {
			return this.extension;
		},

		/**
		 * Get the locale extensions as an array of tokens.
		 *
		 * The leading singleton and the separating dashes are not part of the result.
		 * If there is no extensions section in the locale tag, an empty array is returned.
		 *
		 * @returns {string[]} the individual extension sections
		 * @public
		 */
		getExtensionSubtags : function() {
			return this.extensionSubtags;
		},

		/**
		 * Get the locale private use section or <code>null</code>.
		 *
		 * @returns {string} the private use section
		 * @public
		 */
		getPrivateUse : function() {
			return this.privateUse;
		},

		/**
		 * Get the locale private use section as an array of tokens.
		 *
		 * The leading singleton and the separating dashes are not part of the result.
		 * If there is no private use section in the locale tag, an empty array is returned.
		 *
		 * @returns {string[]} the tokens of the private use section
		 * @public
		 */
		getPrivateUseSubtags : function() {
			return this.privateUseSubtags;
		},

		/**
		 * Check if a subtag is provided
		 *
		 * @param {string} sSubtag The subtag to check
		 * @returns {boolean} Wether the subtag is provided or not
		 */
		hasPrivateUseSubtag : function(sSubtag) {
			assert(sSubtag && sSubtag.match(/^[0-9A-Z]{1,8}$/i), "subtag must be a valid BCP47 private use tag");
			return this.privateUseSubtags.indexOf(sSubtag) >= 0;
		},

		toString : function() {
			return this.oLanguageTag.toString();
		},

		/**
		 * Best guess to get a proper SAP Logon Language for this locale.
		 *
		 * Conversions taken into account:
		 * <ul>
		 * <li>use the language part only</li>
		 * <li>convert old ISO639 codes to newer ones (e.g. 'iw' to 'he')</li>
		 * <li>for Chinese, map 'Traditional Chinese' or region 'TW' to SAP proprietary code 'zf'</li>
		 * <li>map private extensions x-saptrc, x-sappsd and saprigi to SAP pseudo languages '1Q', '2Q' and '3Q'</li>
		 * <li>remove ext. language sub tags</li>
		 * <li>convert to uppercase</li>
		 * </ul>
		 *
		 * Note that the conversion also returns a result for languages that are not
		 * supported by the default set of SAP languages. This method has no knowledge
		 * about the concrete languages of any given backend system.
		 *
		 * @returns {string} a language code that should
		 * @public
		 * @since 1.17.0
		 * @deprecated As of 1.44, use {@link module:sap/base/i18n/Localization.getSAPLogonLanguage} instead
		 *   as that class allows to configure an SAP Logon language.
		 */
		getSAPLogonLanguage : function() {
			return Localization._getSAPLogonLanguage(this);
		}
	});

	Locale._getCoreLocale = function(oLocale) {
		if (oLocale instanceof LanguageTag) {
			oLocale = mCache[oLocale.toString()] || new Locale(oLocale);
			mCache[oLocale.toString()] = oLocale;
		}
		return oLocale;
	};

	return Locale;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides the locale object sap.ui.core.LocaleData
sap.ui.predefine("sap/ui/core/LocaleData", [
	"./CalendarType",
	"./Lib",
	"./Locale",
	"sap/base/assert",
	"sap/base/i18n/Formatting",
	"sap/base/i18n/LanguageTag",
	"sap/base/i18n/Localization",
	"sap/base/util/extend",
	"sap/base/util/LoaderExtensions",
	"sap/ui/base/Object",
	"sap/ui/core/date/CalendarWeekNumbering"
], function(CalendarType, Lib, Locale, assert, Formatting, LanguageTag, Localization, extend, LoaderExtensions,
		BaseObject, CalendarWeekNumbering) {
	"use strict";

	var rCIgnoreCase = /c/i,
		rEIgnoreCase = /e/i,
		/**
		 * With the upgrade of the CLDR to version 41 some unit keys have changed.
		 * For compatibility reasons this map is used for formatting units.
		 * It maps a legacy unit key to its renamed key.
		 *
		 * @deprecated As of version 1.122.0, this map is no longer maintained and stays for compatibility reasons
		 *   only. Reason for the depreciation: The assumption of homogeneous unit keys in the CLDR data has been proven
		 *   wrong. Additionally, it is unclear if, those CLDR unit keys are actually used. Implementing a complex logic
		 *   to maintain potentially unused entries did not seem reasonable. Therefore, it was decided to deprecate this
		 *   feature.
		 *   This map was last updated with CLDR V43, in 1.119.0.
		 * @private
		 */
		mLegacyUnit2CurrentUnit = {
			"acceleration-meter-per-second-squared": "acceleration-meter-per-square-second",
			"concentr-milligram-per-deciliter": "concentr-milligram-ofglucose-per-deciliter",
			"concentr-part-per-million": "concentr-permillion",
			"consumption-liter-per-100kilometers": "consumption-liter-per-100-kilometer",
			"mass-metric-ton": "mass-tonne",
			"pressure-millimeter-of-mercury": "pressure-millimeter-ofhg",
			"pressure-pound-per-square-inch": "pressure-pound-force-per-square-inch",
			"pressure-inch-hg": "pressure-inch-ofhg",
			"torque-pound-foot": "torque-pound-force-foot"
		},
		rNumberInScientificNotation = /^([+-]?)((\d+)(?:\.(\d+))?)[eE]([+-]?\d+)$/,
		rTrailingZeroes = /0+$/;
	const rFallbackPatternTextParts = /(.*)?\{[0|1]}(.*)?\{[0|1]}(.*)?/;
	const aSupportedWidths = ["narrow", "abbreviated", "wide"];

	/**
	 * DO NOT call the constructor for <code>LocaleData</code>; use <code>LocaleData.getInstance</code> instead.
	 *
	 * @param {sap.ui.core.Locale} oLocale The locale
	 *
	 * @alias sap.ui.core.LocaleData
	 * @author SAP SE
	 * @extends sap.ui.base.Object
	 * @class Provides access to locale-specific data, such as date formats, number formats, and currencies.
	 * @hideconstructor
	 * @public
	 * @version 1.125.0
	 */
	var LocaleData = BaseObject.extend("sap.ui.core.LocaleData", /** @lends sap.ui.core.LocaleData.prototype */ {

		constructor: function(oLocale) {
			BaseObject.apply(this);
			this.oLocale = Locale._getCoreLocale(oLocale);
			var oDataLoaded = getData(this.oLocale);
			this.mData = oDataLoaded.mData;
			this.sCLDRLocaleId = oDataLoaded.sCLDRLocaleId;
		},

		/**
		 * @private
		 * @ui5-restricted UI5 Web Components
		 */
		_get: function() {
			return this._getDeep(this.mData, arguments);
		},

		/**
		 * Retrieves merged object if overlay data is available
		 * @private
		 * @return {object} merged object
		 */
		_getMerged: function() {
			return this._get.apply(this, arguments);
		},

		/**
		 * Get month names in width "narrow", "abbreviated" or "wide". Result may contain alternative month names.
		 *
		 * @param {"narrow"|"abbreviated"|"wide"} sWidth
		 *   The required width for the month names
		 * @param {sap.ui.core.CalendarType} [sCalendarType]
		 *   The type of calendar; defaults to the calendar type either set in configuration or calculated from locale
		 * @returns {array}
		 *   The array of month names; if no alternative exists the entry for the month is its name as a string; if
		 *   there are alternative month names the entry for the month is an array of strings with the alternative names
		 * @private
		 */
		_getMonthsWithAlternatives: function(sWidth, sCalendarType) {
			return this._get(getCLDRCalendarName(sCalendarType), "months", "format", sWidth);
		},

		/**
		 * Get standalone month names in width "narrow", "abbreviated" or "wide". Result may contain alternative month
		 * names.
		 *
		 * @param {"narrow"|"abbreviated"|"wide"} sWidth
		 *   The required width for the month names
		 * @param {sap.ui.core.CalendarType} [sCalendarType]
		 *   The type of calendar; defaults to the calendar type either set in configuration or calculated from locale
		 * @returns {array}
		 *   The array of month names; if no alternative exists the entry for the month is its name as a string; if
		 *   there are alternative month names the entry for the month is an array of strings with the alternative names
		 * @private
		 */
		_getMonthsStandAloneWithAlternatives: function(sWidth, sCalendarType) {
			return this._get(getCLDRCalendarName(sCalendarType), "months", "stand-alone", sWidth);
		},

		_getDeep: function(oObject, aPropertyNames) {
			var oResult = oObject;
			for (var i = 0; i < aPropertyNames.length; i++) {
				oResult = oResult[aPropertyNames[i]];
				if (oResult === undefined) {
					break;
				}
			}
			return oResult;
		},

		/**
		 * Get orientation (left-to-right or right-to-left).
		 *
		 * @returns {string} character orientation for this locale
		 * @public
		 */
		getOrientation: function() {
			return this._get("orientation");
		},

		/**
		 * Get a display name for the language of the Locale of this LocaleData, using
		 * the CLDR display names for languages.
		 *
		 * The lookup logic works as follows:
		 * 1. language code and region is checked (e.g. "en-GB")
		 * 2. If not found: language code and script is checked (e.g. "zh-Hant")
		 * 3. If not found language code is checked (e.g. "en")
		 * 4. If it is then still not found <code>undefined</code> is returned.
		 *
		 * @returns {string} language name, e.g. "English", "British English", "American English"
		 *  or <code>undefined</code> if language cannot be found
		 * @private
		 * @ui5-restricted sap.ushell
		 */
		getCurrentLanguageName: function () {
			return this.getLanguageName(this.oLocale.toString());
		},

		/**
		 * Gets the locale-specific language name for the given language tag.
		 *
		 * The languages returned by {@link #getLanguages} from the CLDR raw data do not contain the
		 * language names if they can be derived from the language and the script or the territory.
		 * If the map of languages contains no entry for the given language tag, derive the language
		 * name from the used script or region.
		 *
		 * @param {string} sLanguageTag
		 *   The language tag, for example "en", "en-US", "en_US", "zh-Hant", or "zh_Hant"
		 * @returns {string|undefined}
		 *   The language name, or <code>undefined</code> if the name cannot be determined
		 * @throws {TypeError} When the given language tag isn't valid
		 *
		 * @public
		 */
		getLanguageName: function (sLanguageTag) {
			const oLanguageTag = new LanguageTag(sLanguageTag);
			let sLanguage = Localization.getModernLanguage(oLanguageTag.language);
			let sScript = oLanguageTag.script;
			// special case for "sr_Latn" language: "sh" should then be used
			if (sLanguage === "sr" && sScript === "Latn") {
				sLanguage = "sh";
				sScript = null;
			}
			const sRegion = oLanguageTag.region;
			const oLanguages = this._get("languages");
			const sLanguageText = oLanguages[sLanguage];
			if (!sScript && !sRegion || !sLanguageText) {
				return sLanguageText;
			}

			const sResult = oLanguages[sLanguage + "_" + sRegion] || oLanguages[sLanguage + "_" + sScript];
			if (sResult) {
				return sResult;
			}

			if (sScript) {
				const sScriptText = this._get("scripts")[sScript];
				if (sScriptText) {
					return sLanguageText + " (" + sScriptText + ")";
				}
			}
			if (sRegion) {
				const sRegionText = this._get("territories")[sRegion];
				if (sRegionText) {
					return sLanguageText + " (" + sRegionText + ")";
				}
			}

			return sLanguageText;
		},

		/**
		 * Gets locale-specific language names, as available in the CLDR raw data.
		 *
		 * To avoid redundancies, with CLDR version 43 only language names are contained which cannot be derived from
		 * the language and the script or the territory. If a language tag is not contained in the map, use
		 * {@link #getLanguageName} to get the derived locale-specific language name for that language tag.
		 *
		 * @returns {Object<string, string>} Maps a language tag to the locale-specific language name
		 *
		 * @public
		 */
		getLanguages: function() {
			const oLanguages = this._get("languages");
			/** @deprecated As of version 1.120.0 */
			[
				"ar_001", "de_AT", "de_CH", "en_AU", "en_CA", "en_GB", "en_US", "es_419", "es_ES", "es_MX", "fa_AF",
				"fr_CA", "fr_CH", "nds_NL", "nl_BE", "pt_BR", "pt_PT", "ro_MD", "sw_CD", "zh_Hans", "zh_Hant"
			].forEach((sLanguageTag) => {
				// for compatibility reasons, ensure that for these language tags the corresponding language names are
				// available
				if (!oLanguages[sLanguageTag]) {
					oLanguages[sLanguageTag] = this.getLanguageName(sLanguageTag);
				}
			});

			return oLanguages;
		},

		/**
		 * Gets locale-specific script names, as available in the CLDR raw data.
		 *
		 * To avoid redundancies, with CLDR version 43 only scripts are contained for which the language-specific name
		 * is different from the script key. If a script key is not contained in the map, use the script key as script
		 * name.
		 *
		 * @returns {Object<string, string>} Maps a script key to the locale-specific script name
		 *
		 * @public
		 */
		getScripts: function() {
			return this._get("scripts");
		},

		/**
		 * Gets locale-specific territory names, as available in the CLDR raw data.
		 *
		 * To avoid redundancies, with CLDR version 43 only territories are contained for which the language-specific
		 * name is different from the territory key.
		 *
		 * @returns {Object<string, string>} Maps a territory key to the locale-specific territory name
		 *
		 * @public
		 */
		getTerritories: function() {
			return this._get("territories");
		},

		/**
		 * Get month names in width "narrow", "abbreviated" or "wide".
		 *
		 * @param {"narrow"|"abbreviated"|"wide"} sWidth
		 *   The required width for the month names
		 * @param {sap.ui.core.CalendarType} [sCalendarType]
		 *   The type of calendar; defaults to the calendar type either set in configuration or calculated from locale
		 * @returns {string[]}
		 *   The array of month names
		 * @public
		 */
		getMonths: function(sWidth, sCalendarType) {
			assert(aSupportedWidths.includes(sWidth), "sWidth must be narrow, abbreviated or wide");
			return this._get(getCLDRCalendarName(sCalendarType), "months", "format", sWidth).map((vMonthName) => {
				return Array.isArray(vMonthName) ? vMonthName[0] : vMonthName;
			});
		},

		/**
		 * Get standalone month names in width "narrow", "abbreviated" or "wide".
		 *
		 * @param {"narrow"|"abbreviated"|"wide"} sWidth
		 *   The required width for the month names
		 * @param {sap.ui.core.CalendarType} [sCalendarType]
		 *   The type of calendar; defaults to the calendar type either set in configuration or calculated from locale
		 * @returns {string[]}
		 *   The array of standalone month names
		 * @public
		 */
		getMonthsStandAlone: function(sWidth, sCalendarType) {
			assert(aSupportedWidths.includes(sWidth), "sWidth must be narrow, abbreviated or wide");
			return this._get(getCLDRCalendarName(sCalendarType), "months", "stand-alone", sWidth).map((vMonthName) => {
				return Array.isArray(vMonthName) ? vMonthName[0] : vMonthName;
			});
		},

		/**
		 * Get day names in width "narrow", "abbreviated" or "wide".
		 *
		 * @param {string} sWidth the required width for the day names
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {array} array of day names (starting with Sunday)
		 * @public
		 */
		getDays: function(sWidth, sCalendarType) {
			assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide" || sWidth == "short", "sWidth must be narrow, abbreviate, wide or short");
			return this._get(getCLDRCalendarName(sCalendarType), "days", "format",  sWidth);
		},

		/**
		 * Get standalone day names in width "narrow", "abbreviated" or "wide".
		 *
		 * @param {string} sWidth the required width for the day names
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {array} array of day names (starting with Sunday)
		 * @public
		 */
		getDaysStandAlone: function(sWidth, sCalendarType) {
			assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide" || sWidth == "short", "sWidth must be narrow, abbreviated, wide or short");
			return this._get(getCLDRCalendarName(sCalendarType), "days", "stand-alone",  sWidth);
		},

		/**
		 * Get quarter names in width "narrow", "abbreviated" or "wide".
		 *
		 * @param {string} sWidth the required width for the quarter names
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {array} array of quarters
		 * @public
		 */
		getQuarters: function(sWidth, sCalendarType) {
			assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide", "sWidth must be narrow, abbreviated or wide");
			return this._get(getCLDRCalendarName(sCalendarType), "quarters", "format",  sWidth);
		},

		/**
		 * Get standalone quarter names in width "narrow", "abbreviated" or "wide".
		 *
		 * @param {string} sWidth the required width for the quarter names
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {array} array of quarters
		 * @public
		 */
		getQuartersStandAlone: function(sWidth, sCalendarType) {
			assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide", "sWidth must be narrow, abbreviated or wide");
			return this._get(getCLDRCalendarName(sCalendarType), "quarters", "stand-alone",  sWidth);
		},

		/**
		 * Get day periods in width "narrow", "abbreviated" or "wide".
		 *
		 * @param {string} sWidth the required width for the day period names
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {array} array of day periods (AM, PM)
		 * @public
		 */
		getDayPeriods: function(sWidth, sCalendarType) {
			assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide", "sWidth must be narrow, abbreviated or wide");
			return this._get(getCLDRCalendarName(sCalendarType), "dayPeriods", "format",  sWidth);
		},

		/**
		 * Get standalone day periods in width "narrow", "abbreviated" or "wide".
		 *
		 * @param {string} sWidth the required width for the day period names
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {array} array of day periods (AM, PM)
		 * @public
		 */
		getDayPeriodsStandAlone: function(sWidth, sCalendarType) {
			assert(sWidth == "narrow" || sWidth == "abbreviated" || sWidth == "wide", "sWidth must be narrow, abbreviated or wide");
			return this._get(getCLDRCalendarName(sCalendarType), "dayPeriods", "stand-alone",  sWidth);
		},

		/**
		 * Get date pattern in format "short", "medium", "long" or "full".
		 *
		 * @param {string} sStyle the required style for the date pattern
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {string} the selected date pattern
		 * @public
		 */
		getDatePattern: function(sStyle, sCalendarType) {
			assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			return this._get(getCLDRCalendarName(sCalendarType), "dateFormats", sStyle);
		},

		/**
		 * Get flexible day periods in style format "abbreviated", "narrow" or "wide".
		 *
		 * @param {string} sWidth
		 *   The required width for the flexible day period names
		 * @param {sap.ui.core.CalendarType} [sCalendarType]
		 *   The type of calendar. If it's not set, it falls back to the calendar type either set in
		 *   configuration or calculated from locale.
		 * @returns {object|undefined}
		 *   Object of flexible day periods or 'undefined' if none can be found
		 *
		 * @example <caption>Output</caption>
		 * {
		 *   "midnight": "midnight",
		 *   "noon": "noon",
		 *   "morning1": "in the morning",
		 *   "afternoon1": "in the afternoon",
		 *   "evening1": "in the evening",
		 *   "night1": "at night"
		 * }
		 *
		 * @private
		 */
		getFlexibleDayPeriods : function (sWidth, sCalendarType) {
			return this._get(getCLDRCalendarName(sCalendarType), "flexibleDayPeriods", "format",
				sWidth);
		},

		/**
		 * Get flexible day periods in style format "abbreviated", "narrow" or "wide" for case
		 * "stand-alone".
		 *
		 * @param {string} sWidth
		 *   The required width for the flexible day period names
		 * @param {sap.ui.core.CalendarType} [sCalendarType]
		 *   The type of calendar. If it's not set, it falls back to the calendar type either set in
		 *   configuration or calculated from locale.
		 * @returns {object|undefined}
		 *   Object of flexible day periods or 'undefined' if none can be found
		 *
		 * @example <caption>Output</caption>
		 * {
		 *   "midnight": "midnight",
		 *   "noon": "noon",
		 *   "morning1": "in the morning",
		 *   "afternoon1": "in the afternoon",
		 *   "evening1": "in the evening",
		 *   "night1": "at night"
		 * }
		 *
		 * @private
		 */
		getFlexibleDayPeriodsStandAlone : function (sWidth, sCalendarType) {
			return this._get(getCLDRCalendarName(sCalendarType), "flexibleDayPeriods",
				"stand-alone", sWidth);
		},

		/**
		 * Get flexible day period of time or a point in time
		 *
		 * @param {int} iHour Hour
		 * @param {int} iMinute Minute
		 * @returns {string} Key of flexible day period of time e.g. <code>afternoon2</code>
		 *
		 * @private
		 */
		getFlexibleDayPeriodOfTime : function (iHour, iMinute) {
			var iAbsoluteMinutes, oDayPeriodRules, sPeriodMatch;

			iAbsoluteMinutes = (iHour * 60 + iMinute) % 1440;
			oDayPeriodRules = this._get("dayPeriodRules");

			function parseToAbsoluteMinutes(sValue) {
				var aSplit = sValue.split(":"),
					sHour = aSplit[0],
					sMinute = aSplit[1];

				return parseInt(sHour) * 60 + parseInt(sMinute);
			}

			// unfortunately there are some overlaps:
			// e.g. en.json
			// "afternoon1": {
			//   "_before": "18:00",
			//   "_from": "12:00"
			// },
			// "noon": {
			//   "_at": "12:00"
			// }
			// -> 12:00 can be either "noon" or "afternoon1" because "_from" is inclusive
			// therefore first check all exact periods

			sPeriodMatch = Object.keys(oDayPeriodRules).find(function (sDayPeriodRule) {
				var oDayPeriodRule = oDayPeriodRules[sDayPeriodRule];

				return oDayPeriodRule["_at"] &&
					parseToAbsoluteMinutes(oDayPeriodRule["_at"]) === iAbsoluteMinutes;
			});
			if (sPeriodMatch) {
				return sPeriodMatch;
			}

			return Object.keys(oDayPeriodRules).find(function (sDayPeriodRule) {
				var iEndValue, aIntervals, iStartValue,
					oDayPeriodRule = oDayPeriodRules[sDayPeriodRule];

				if (oDayPeriodRule["_at"]) {
					return false;
				}

				iStartValue = parseToAbsoluteMinutes(oDayPeriodRule["_from"]);
				iEndValue = parseToAbsoluteMinutes(oDayPeriodRule["_before"]);

				// periods which span across days need to be split into individual intervals
				// e.g. "22:00 - 03:00" becomes "22:00 - 24:00" and "00:00 - 03:00"
				if (iStartValue > iEndValue) {
					aIntervals = [
						{start : iStartValue, end : 1440}, // 24 * 60
						{start : 0, end : iEndValue}
					];
				} else {
					aIntervals = [
						{start : iStartValue, end : iEndValue}
					];
				}

				return aIntervals.some(function (oInterval) {
					return oInterval.start <= iAbsoluteMinutes && oInterval.end > iAbsoluteMinutes;
				});
			});
		},

		/**
		 * Get time pattern in style "short", "medium", "long" or "full".
		 *
		 * @param {string} sStyle the required style for the date pattern
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {string} the selected time pattern
		 * @public
		 */
		getTimePattern: function(sStyle, sCalendarType) {
			assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			return this._get(getCLDRCalendarName(sCalendarType), "timeFormats", sStyle);
		},

		/**
		 * Get datetime pattern in style "short", "medium", "long" or "full".
		 *
		 * @param {string} sStyle the required style for the datetime pattern
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {string} the selected datetime pattern
		 * @public
		 */
		getDateTimePattern: function(sStyle, sCalendarType) {
			assert(sStyle == "short" || sStyle == "medium" || sStyle == "long" || sStyle == "full", "sStyle must be short, medium, long or full");
			return this._get(getCLDRCalendarName(sCalendarType), "dateTimeFormats", sStyle);
		},

		/**
		 * Get combined datetime pattern with given date and time style.
		 *
		 * @param {string} sDateStyle the required style for the date part
		 * @param {string} sTimeStyle the required style for the time part
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {string} the combined datetime pattern
		 * @public
		 */
		getCombinedDateTimePattern: function(sDateStyle, sTimeStyle, sCalendarType) {
			assert(sDateStyle == "short" || sDateStyle == "medium" || sDateStyle == "long" || sDateStyle == "full", "sStyle must be short, medium, long or full");
			assert(sTimeStyle == "short" || sTimeStyle == "medium" || sTimeStyle == "long" || sTimeStyle == "full", "sStyle must be short, medium, long or full");
			var sDateTimePattern = this.getDateTimePattern(sDateStyle, sCalendarType),
				sDatePattern = this.getDatePattern(sDateStyle, sCalendarType),
				sTimePattern = this.getTimePattern(sTimeStyle, sCalendarType);
			return sDateTimePattern.replace("{0}", sTimePattern).replace("{1}", sDatePattern);
		},

		/**
		 * Get combined pattern with datetime and timezone for the given date and time style.
		 *
		 * @example
		 * // locale de
		 * oLocaleData.getCombinedDateTimeWithTimezonePattern("long", "long");
		 * // "d. MMMM y 'um' HH:mm:ss z VV"
		 *
		 * // locale en_GB
		 * oLocaleData.getCombinedDateTimeWithTimezonePattern("long", "long");
		 * // "d MMMM y 'at' HH:mm:ss z VV"
		 *
		 * @param {string} sDateStyle The required style for the date part
		 * @param {string} sTimeStyle The required style for the time part
		 * @param {sap.ui.core.CalendarType} [sCalendarType] The type of calendar. If it's not set,
		 *   it falls back to the calendar type either set in the configuration or calculated from
		 *   the locale.
		 * @returns {string} the combined pattern with datetime and timezone
		 * @private
		 * @ui5-restricted sap.ui.core.format.DateFormat
		 * @since 1.101
		 */
		getCombinedDateTimeWithTimezonePattern: function(sDateStyle, sTimeStyle, sCalendarType) {
			return this.applyTimezonePattern(this.getCombinedDateTimePattern(sDateStyle, sTimeStyle, sCalendarType));
		},

		/**
		 * Applies the timezone to the pattern
		 *
		 * @param {string} sPattern pattern, e.g. <code>y</code>
		 * @returns {string} applied timezone, e.g. <code>y VV</code>
		 * @private
		 * @ui5-restricted sap.ui.core.format.DateFormat
		 * @since 1.101
		 */
		applyTimezonePattern: function(sPattern) {
			var aPatterns = [sPattern];
			var aMissingTokens = [{
				group: "Timezone",
				length: 2,
				field: "zone",
				symbol: "V"
			}];
			this._appendItems(aPatterns, aMissingTokens);
			return aPatterns[0];
		},

		/**
		 * Retrieves all timezone translations.
		 *
		 * E.g. for locale "en"
		 * <pre>
		 * {
		 *  "America/New_York": "Americas, New York"
		 *  ...
		 * }
		 * </pre>
		 *
		 * @return {Object<string, string>} the mapping, with 'key' being the IANA timezone ID, and
		 * 'value' being the translation.
		 * @ui5-restricted sap.ui.core.format.DateFormat, sap.ui.export, sap.ushell
		 * @private
		 */
		getTimezoneTranslations: function() {
			var sLocale = this.oLocale.toString();
			var mTranslations = LocaleData._mTimezoneTranslations[sLocale];

			if (!mTranslations) {
				LocaleData._mTimezoneTranslations[sLocale] = mTranslations =
					_resolveTimezoneTranslationStructure(this._get("timezoneNames"));
			}

			// retrieve a copy such that the original object won't be modified.
			return Object.assign({}, mTranslations);
		},

		/**
		 * Get custom datetime pattern for a given skeleton format.
		 *
		 * The format string does contain pattern symbols (e.g. "yMMMd" or "Hms") and will be converted into the pattern in the used
		 * locale, which matches the wanted symbols best. The symbols must be in canonical order, that is:
		 * Era (G), Year (y/Y), Quarter (q/Q), Month (M/L), Week (w/W), Day-Of-Week (E/e/c), Day (d/D),
		 * Hour (h/H/k/K/), Minute (m), Second (s), Timezone (z/Z/v/V/O/X/x)
		 *
		 * See https://unicode.org/reports/tr35/tr35-dates.html#availableFormats_appendItems
		 *
		 * @param {string} sSkeleton the wanted skeleton format for the datetime pattern
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {string} the best matching datetime pattern
		 * @since 1.34
		 * @public
		 */
		getCustomDateTimePattern: function(sSkeleton, sCalendarType) {
			var oAvailableFormats = this._get(getCLDRCalendarName(sCalendarType), "dateTimeFormats", "availableFormats");
			return this._getFormatPattern(sSkeleton, oAvailableFormats, sCalendarType);
		},

		/**
		 * Returns the interval format with the given Id (see CLDR documentation for valid Ids)
		 * or the fallback format if no interval format with that Id is known.
		 *
		 * The empty Id ("") might be used to retrieve the interval format fallback.
		 *
		 * @param {string} sId Id of the interval format, e.g. "d-d"
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {string} interval format string with placeholders {0} and {1}
		 * @public
		 * @since 1.17.0
		 */
		getIntervalPattern : function(sId, sCalendarType) {
			var oIntervalFormats = this._get(getCLDRCalendarName(sCalendarType), "dateTimeFormats", "intervalFormats"),
				aIdParts, sIntervalId, sDifference, oInterval, sPattern;
			if (sId) {
				aIdParts = sId.split("-");
				sIntervalId = aIdParts[0];
				sDifference = aIdParts[1];
				oInterval = oIntervalFormats[sIntervalId];
				if (oInterval) {
					sPattern = oInterval[sDifference];
					if (sPattern) {
						return sPattern;
					}
				}
			}
			return oIntervalFormats.intervalFormatFallback;
		},

		/**
		 * Get combined interval pattern using a given pattern and the fallback interval pattern.
		 *
		 * If a skeleton based pattern is not available or not wanted, this method can be used to create an interval
		 * pattern based on a given pattern, using the fallback interval pattern.
		 *
		 * @param {string} sPattern the single date pattern to use within the interval pattern
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {string} the calculated interval pattern
		 * @since 1.46
		 * @public
		 */
		getCombinedIntervalPattern: function (sPattern, sCalendarType) {
			const oIntervalFormats = this._get(getCLDRCalendarName(sCalendarType), "dateTimeFormats",
				"intervalFormats");
			const [/*sAll*/, sTextBefore, sTextBetween, sTextAfter] =
				rFallbackPatternTextParts.exec(oIntervalFormats.intervalFormatFallback);

			// text part of intervalFormatFallback is not escaped
			return LocaleData._escapeIfNeeded(sTextBefore) + sPattern + LocaleData._escapeIfNeeded(sTextBetween)
				+ sPattern + LocaleData._escapeIfNeeded(sTextAfter);
		},

		/**
		 * Get interval pattern for a given skeleton format.
		 *
		 * The format string does contain pattern symbols (e.g. "yMMMd" or "Hms") and will be converted into the pattern in the used
		 * locale, which matches the wanted symbols best. The symbols must be in canonical order, that is:
		 * Era (G), Year (y/Y), Quarter (q/Q), Month (M/L), Week (w/W), Day-Of-Week (E/e/c), Day (d/D),
		 * Hour (h/H/k/K/), Minute (m), Second (s), Timezone (z/Z/v/V/O/X/x)
		 *
		 * See https://unicode.org/reports/tr35/tr35-dates.html#availableFormats_appendItems
		 *
		 * @param {string} sSkeleton the wanted skeleton format for the datetime pattern
		 * @param {object|string} vGreatestDiff is either a string which represents the symbol matching the greatest difference in the two dates to format or an object which contains key-value pairs.
		 *  The value is always true. The key is one of the date field symbol groups whose value are different between the two dates. The key can only be set with 'Year', 'Quarter', 'Month', 'Week',
		 *  'Day', 'DayPeriod', 'Hour', 'Minute', or 'Second'.
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar. If it's not set, it falls back to the calendar type either set in configuration or calculated from locale.
		 * @returns {string|string[]} the best matching interval pattern if interval difference is given otherwise an array with all possible interval patterns which match the given skeleton format
		 * @since 1.46
		 * @public
		 */
		getCustomIntervalPattern : function(sSkeleton, vGreatestDiff, sCalendarType) {
			var oAvailableFormats = this._get(getCLDRCalendarName(sCalendarType), "dateTimeFormats", "intervalFormats");
			return this._getFormatPattern(sSkeleton, oAvailableFormats, sCalendarType, vGreatestDiff);
		},

		/* Helper functions for skeleton pattern processing */
		_getFormatPattern: function(sSkeleton, oAvailableFormats, sCalendarType, vDiff) {
			var vPattern, aPatterns, oIntervalFormats;

			if (!vDiff) {
				// the call is from getCustomDateTimePattern
				vPattern = oAvailableFormats[sSkeleton];
			} else if (typeof vDiff === "string") {
				// vDiff is given as a symbol
				if (vDiff == "j" || vDiff == "J") {
					vDiff = this.getPreferredHourSymbol();
				}
				oIntervalFormats = oAvailableFormats[sSkeleton];
				vPattern = oIntervalFormats && oIntervalFormats[vDiff];
			}

			if (vPattern) {
				if (typeof vPattern === "object") {
					aPatterns = Object.keys(vPattern).map(function(sKey) {
						return vPattern[sKey];
					});
				} else {
					return vPattern;
				}
			}

			if (!aPatterns) {
				aPatterns = this._createFormatPattern(sSkeleton, oAvailableFormats, sCalendarType, vDiff);
			}

			if (aPatterns && aPatterns.length === 1) {
				return aPatterns[0];
			}

			return aPatterns;
		},

		_createFormatPattern: function(sSkeleton, oAvailableFormats, sCalendarType, vDiff) {
			var aTokens = this._parseSkeletonFormat(sSkeleton), aPatterns,
				oBestMatch = this._findBestMatch(aTokens, sSkeleton, oAvailableFormats),
				oToken, oAvailableDateTimeFormats, oSymbol, oGroup,
				sPattern, sSinglePattern, sDiffSymbol, sDiffGroup,
				rMixedSkeleton = /^([GyYqQMLwWEecdD]+)([hHkKjJmszZvVOXx]+)$/,
				bSingleDate,
				i;


			if (vDiff) {
				if (typeof vDiff === "string") {
					sDiffGroup = mCLDRSymbols[vDiff] ? mCLDRSymbols[vDiff].group : "";
					if (sDiffGroup) {
							// if the index of interval diff is greater than the index of the last field
							// in the sSkeleton, which means the diff unit is smaller than all units in
							// the skeleton, return a single date pattern which is generated using the
							// given skeleton
							bSingleDate = mCLDRSymbolGroups[sDiffGroup].index > aTokens[aTokens.length - 1].index;
					}
					sDiffSymbol = vDiff;
				} else {
					bSingleDate = true;
					// Special handling of "y" (Year) in case patterns contains also "G" (Era)
					if (aTokens[0].symbol === "y" && oBestMatch && oBestMatch.pattern.G) {
						oSymbol = mCLDRSymbols["G"];
						oGroup = mCLDRSymbolGroups[oSymbol.group];
						aTokens.splice(0, 0, {
							symbol: "G",
							group: oSymbol.group,
							match: oSymbol.match,
							index: oGroup.index,
							field: oGroup.field,
							length: 1
						});
					}

					// Check if at least one token's group appears in the interval diff
					// If not, a single date pattern is returned
					for (i = aTokens.length - 1; i >= 0; i--){
						oToken = aTokens[i];

						if (vDiff[oToken.group]) {
							bSingleDate = false;
							break;
						}
					}

					// select the greatest diff symbol
					for (i = 0; i < aTokens.length; i++){
						oToken = aTokens[i];

						if (vDiff[oToken.group]) {
							sDiffSymbol = oToken.symbol;
							break;
						}
					}
					// Special handling of "a" (Dayperiod)
					// Find out whether dayperiod is different between the dates
					// If yes, set the  diff symbol with 'a' Dayperiod symbol
					if ((sDiffSymbol == "h" || sDiffSymbol == "K") && vDiff.DayPeriod) {
						sDiffSymbol = "a";
					}
				}

				if (bSingleDate) {
					return [this.getCustomDateTimePattern(sSkeleton, sCalendarType)];
				}

				// Only use best match, if there are no missing tokens, as there is no possibility
				// to append items on interval formats
				if (oBestMatch && oBestMatch.missingTokens.length === 0) {
					sPattern = oBestMatch.pattern[sDiffSymbol];
					// if there is no exact match, we need to do further processing
					if (sPattern && oBestMatch.distance > 0) {
						sPattern = this._expandFields(sPattern, oBestMatch.patternTokens, aTokens);
					}
				}
				// If no pattern could be found, get the best availableFormat for the skeleton
				// and use the fallbackIntervalFormat to create the pattern
				if (!sPattern) {
					oAvailableDateTimeFormats = this._get(getCLDRCalendarName(sCalendarType), "dateTimeFormats", "availableFormats");
					// If it is a mixed skeleton and the greatest interval on time, create a mixed pattern
					if (rMixedSkeleton.test(sSkeleton) && "ahHkKjJms".indexOf(sDiffSymbol) >= 0) {
						sPattern = this._getMixedFormatPattern(sSkeleton, oAvailableDateTimeFormats, sCalendarType, vDiff);
					} else {
						sSinglePattern = this._getFormatPattern(sSkeleton, oAvailableDateTimeFormats, sCalendarType);
						sPattern = this.getCombinedIntervalPattern(sSinglePattern, sCalendarType);
					}
				}

				aPatterns = [sPattern];

			} else if (!oBestMatch) {
				sPattern = sSkeleton;
				aPatterns = [sPattern];
			} else {
				if (typeof oBestMatch.pattern === "string") {
					aPatterns = [oBestMatch.pattern];
				} else if (typeof oBestMatch.pattern === "object") {
					aPatterns = [];

					for (var sKey in oBestMatch.pattern) {
						sPattern = oBestMatch.pattern[sKey];
						aPatterns.push(sPattern);
					}
				}
				// if there is no exact match, we need to do further processing
				if (oBestMatch.distance > 0) {
					if (oBestMatch.missingTokens.length > 0) {
						// if tokens are missing create a pattern containing all, otherwise just adjust pattern
						if (rMixedSkeleton.test(sSkeleton)) {
							aPatterns = [this._getMixedFormatPattern(sSkeleton, oAvailableFormats, sCalendarType)];
						} else {
							aPatterns = this._expandFields(aPatterns, oBestMatch.patternTokens, aTokens);
							aPatterns = this._appendItems(aPatterns, oBestMatch.missingTokens, sCalendarType);
						}
					} else {
						aPatterns = this._expandFields(aPatterns, oBestMatch.patternTokens, aTokens);
					}
				}
			}

			// If special input token "J" was used, remove dayperiod from pattern
			if (sSkeleton.indexOf("J") >= 0) {
				aPatterns.forEach(function(sPattern, iIndex) {
					aPatterns[iIndex] = sPattern.replace(/ ?[abB](?=([^']*'[^']*')*[^']*)$/g, "");
				});
			}

			return aPatterns;
		},

		_parseSkeletonFormat: function(sSkeleton) {
			var aTokens = [],
				oToken = {index: -1},
				sSymbol,
				oSymbol,
				oGroup;
			for (var i = 0; i < sSkeleton.length; i++) {
				sSymbol = sSkeleton.charAt(i);
				// Handle special input symbols
				if (sSymbol == "j" || sSymbol == "J") {
					sSymbol = this.getPreferredHourSymbol();
				}
				// if the symbol is the same as current token, increase the length
				if (sSymbol == oToken.symbol) {
					oToken.length++;
					continue;
				}
				// get symbol group
				oSymbol = mCLDRSymbols[sSymbol];
				oGroup = mCLDRSymbolGroups[oSymbol.group];
				// if group is other, the symbol is not allowed in skeleton tokens
				if (oSymbol.group == "Other" || oGroup.diffOnly) {
					throw new Error("Symbol '" + sSymbol + "' is not allowed in skeleton format '" + sSkeleton + "'");
				}
				// if group index the same or lower, format is invalid
				if (oGroup.index <= oToken.index) {
					throw new Error("Symbol '" + sSymbol + "' at wrong position or duplicate in skeleton format '" + sSkeleton + "'");
				}
				// create token and add it the token array
				oToken = {
					symbol: sSymbol,
					group: oSymbol.group,
					match: oSymbol.match,
					index: oGroup.index,
					field: oGroup.field,
					length: 1
				};
				aTokens.push(oToken);
			}
			return aTokens;
		},

		_findBestMatch: function(aTokens, sSkeleton, oAvailableFormats) {
			var aTestTokens,
				aMissingTokens,
				oToken,
				oTestToken,
				iTest,
				iDistance,
				bMatch,
				iFirstDiffPos,
				oTokenSymbol,
				oTestTokenSymbol,
				oBestMatch = {
					distance: 10000,
					firstDiffPos: -1
				};
			// Loop through all available tokens, find matches and calculate distance
			for (var sTestSkeleton in oAvailableFormats) {
				// Skip patterns with symbol "B" (which is introduced from CLDR v32.0.0) which isn't supported in DateFormat yet
				if (sTestSkeleton === "intervalFormatFallback" || sTestSkeleton.indexOf("B") > -1) {
					continue;
				}
				aTestTokens = this._parseSkeletonFormat(sTestSkeleton);
				iDistance = 0;
				aMissingTokens = [];
				bMatch = true;
				// if test format contains more tokens, it cannot be a best match
				if (aTokens.length < aTestTokens.length) {
					continue;
				}
				iTest = 0;
				iFirstDiffPos = aTokens.length;
				for (var i = 0; i < aTokens.length; i++) {
					oToken = aTokens[i];
					oTestToken = aTestTokens[iTest];
					if (iFirstDiffPos === aTokens.length) {
						iFirstDiffPos = i;
					}
					if (oTestToken) {
						oTokenSymbol = mCLDRSymbols[oToken.symbol];
						oTestTokenSymbol = mCLDRSymbols[oTestToken.symbol];
						// if the symbol matches, just add the length difference to the distance
						if (oToken.symbol === oTestToken.symbol) {
							if (oToken.length === oTestToken.length) {
								// both symbol and length match, check the next token
								// clear the first difference position
								if (iFirstDiffPos === i) {
									iFirstDiffPos = aTokens.length;
								}
							} else {
								if (oToken.length < oTokenSymbol.numericCeiling ? oTestToken.length < oTestTokenSymbol.numericCeiling : oTestToken.length >= oTestTokenSymbol.numericCeiling) {
									// if the symbols are in the same category (either numeric or text representation), add the length diff
									iDistance += Math.abs(oToken.length - oTestToken.length);
								} else {
									// otherwise add 5 which is bigger than any length difference
									iDistance += 5;
								}
							}
							iTest++;
							continue;
						} else {
							// if only the group matches, add some more distance in addition to length difference
							if (oToken.match == oTestToken.match) {
								iDistance += Math.abs(oToken.length - oTestToken.length) + 10;
								iTest++;
								continue;
							}
						}
					}
					// if neither symbol nor group matched, add it to the missing tokens and add distance
					aMissingTokens.push(oToken);
					iDistance += 50 - i;
				}

				// if not all test tokens have been found, the format does not match
				if (iTest < aTestTokens.length) {
					bMatch = false;
				}

				// The current pattern is saved as the best pattern when there is a match and
				//  1. the distance is smaller than the best distance or
				//  2. the distance equals the best distance and the position of the token in the given skeleton which
				//   isn't the same between the given skeleton and the available skeleton is bigger than the best one's.
				if (bMatch && (iDistance < oBestMatch.distance || (iDistance === oBestMatch.distance && iFirstDiffPos > oBestMatch.firstDiffPos))) {
					oBestMatch.distance = iDistance;
					oBestMatch.firstDiffPos = iFirstDiffPos;
					oBestMatch.missingTokens = aMissingTokens;
					oBestMatch.pattern = oAvailableFormats[sTestSkeleton];
					oBestMatch.patternTokens = aTestTokens;
				}
			}
			if (oBestMatch.pattern) {
				return oBestMatch;
			}
		},

		_expandFields: function(vPattern, aPatternTokens, aTokens) {
			var bSinglePattern = (typeof vPattern === "string");

			var aPatterns;
			if (bSinglePattern) {
				aPatterns = [vPattern];
			} else {
				aPatterns = vPattern;
			}

			var aResult = aPatterns.map(function(sPattern) {
				var mGroups = {},
					mPatternGroups = {},
					sResultPatterm = "",
					bQuoted = false,
					i = 0,
					iSkeletonLength,
					iPatternLength,
					iBestLength,
					iNewLength,
					oSkeletonToken,
					oBestToken,
					oSymbol,
					sChar;

				// Create a map of group names to token
				aTokens.forEach(function(oToken) {
					mGroups[oToken.group] = oToken;
				});
				// Create a map of group names to token in best pattern
				aPatternTokens.forEach(function(oToken) {
					mPatternGroups[oToken.group] = oToken;
				});
				// Loop through pattern and adjust symbol length
				while (i < sPattern.length) {
					sChar = sPattern.charAt(i);
					if (bQuoted) {
						sResultPatterm += sChar;
						if (sChar == "'") {
							bQuoted = false;
						}
					} else {
						oSymbol = mCLDRSymbols[sChar];
						// If symbol is a CLDR symbol and is contained in the group, expand length
						if (oSymbol && mGroups[oSymbol.group] && mPatternGroups[oSymbol.group]) {
							oSkeletonToken = mGroups[oSymbol.group];
							oBestToken = mPatternGroups[oSymbol.group];

							iSkeletonLength = oSkeletonToken.length;
							iBestLength = oBestToken.length;

							iPatternLength = 1;
							while (sPattern.charAt(i + 1) == sChar) {
								i++;
								iPatternLength++;
							}

							// Prevent expanding the length of the field when:
							// 1. The length in the best matching skeleton (iBestLength) matches the length of the application provided skeleton (iSkeletonLength) or
							// 2. The length of the provided skeleton (iSkeletonLength) and the length of the result pattern (iPatternLength) are not in the same category (numeric or text)
							//	because switching between numeric to text representation is wrong in all cases
							if (iSkeletonLength === iBestLength ||
								((iSkeletonLength < oSymbol.numericCeiling) ?
									(iPatternLength >= oSymbol.numericCeiling) : (iPatternLength < oSymbol.numericCeiling)
								)) {
								iNewLength = iPatternLength;
							} else {
								iNewLength = Math.max(iPatternLength, iSkeletonLength);
							}

							for (var j = 0; j < iNewLength; j++) {
								sResultPatterm += sChar;
							}
						} else {
							sResultPatterm += sChar;
							if (sChar == "'") {
								bQuoted = true;
							}
						}
					}
					i++;
				}
				return sResultPatterm;
			});

			return bSinglePattern ? aResult[0] : aResult;
		},

		_appendItems: function(aPatterns, aMissingTokens, sCalendarType) {
			var oAppendItems = this._get(getCLDRCalendarName(sCalendarType), "dateTimeFormats", "appendItems");
			aPatterns.forEach(function(sPattern, iIndex) {
				var sDisplayName,
					sAppendPattern,
					sAppendField;

				aMissingTokens.forEach(function(oToken) {
					sAppendPattern = oAppendItems[oToken.group];
					sDisplayName = "'" + this.getDisplayName(oToken.field) + "'";
					sAppendField = "";
					for (var i = 0; i < oToken.length; i++) {
						sAppendField += oToken.symbol;
					}
					aPatterns[iIndex] = sAppendPattern.replace(/\{0\}/, sPattern).replace(/\{1\}/, sAppendField).replace(/\{2\}/, sDisplayName);
				}.bind(this));
			}.bind(this));

			return aPatterns;
		},

		_getMixedFormatPattern: function(sSkeleton, oAvailableFormats, sCalendarType, vDiff) {
			var rMixedSkeleton = /^([GyYqQMLwWEecdD]+)([hHkKjJmszZvVOXx]+)$/,
				rWideMonth = /MMMM|LLLL/,
				rAbbrevMonth = /MMM|LLL/,
				rWeekDay = /E|e|c/,
				oResult, sDateSkeleton, sTimeSkeleton, sStyle,
				sDatePattern, sTimePattern, sDateTimePattern, sResultPattern;

			// Split skeleton into date and time part
			oResult = rMixedSkeleton.exec(sSkeleton);
			sDateSkeleton = oResult[1];
			sTimeSkeleton = oResult[2];
			// Get patterns for date and time separately
			sDatePattern = this._getFormatPattern(sDateSkeleton, oAvailableFormats, sCalendarType);
			if (vDiff) {
				sTimePattern = this.getCustomIntervalPattern(sTimeSkeleton, vDiff, sCalendarType);
			} else {
				sTimePattern = this._getFormatPattern(sTimeSkeleton, oAvailableFormats, sCalendarType);
			}
			// Combine patterns with datetime pattern, dependent on month and weekday
			if (rWideMonth.test(sDateSkeleton)) {
				sStyle = rWeekDay.test(sDateSkeleton) ? "full" : "long";
			} else if (rAbbrevMonth.test(sDateSkeleton)) {
				sStyle = "medium";
			} else {
				sStyle = "short";
			}
			sDateTimePattern = this.getDateTimePattern(sStyle, sCalendarType);
			sResultPattern = sDateTimePattern.replace(/\{1\}/, sDatePattern).replace(/\{0\}/, sTimePattern);
			return sResultPattern;
		},

		/**
		 * Get number symbol "decimal", "group", "plusSign", "minusSign", "percentSign".
		 *
		 * @param {string} sType the required type of symbol
		 * @returns {string} the selected number symbol
		 * @public
		 */
		getNumberSymbol: function(sType) {
			assert(sType == "decimal" || sType == "group" || sType == "plusSign" || sType == "minusSign" || sType == "percentSign", "sType must be decimal, group, plusSign, minusSign or percentSign");
			return this._get("symbols-latn-" + sType);
		},

		/**
		 * Get lenient number symbols for "plusSign" or "minusSign".
		 *
		 * @param {string} sType the required type of symbol
		 * @returns {string} the selected lenient number symbols, e.g. "-‒⁻₋−➖﹣"
		 * @public
		 */
		getLenientNumberSymbols: function(sType) {
			assert(sType == "plusSign" || sType == "minusSign", "sType must be plusSign or minusSign");
			return this._get("lenient-scope-number")[sType];
		},

		/**
		 * Get decimal format pattern.
		 *
		 * @returns {string} The pattern
		 * @public
		 */
		getDecimalPattern: function() {
			return this._get("decimalFormat").standard;
		},

		/**
		 * Get currency format pattern.
		 *
		 * CLDR format pattern:
		 *
		 * @example standard with currency symbol in front of the number
		 * ¤#,##0.00
		 * $100,000.00
		 * $-100,000.00
		 *
		 * @example accounting with negative number pattern after the semicolon
		 * ¤#,##0.00;(¤#,##0.00)
		 * $100,000.00
		 * ($100,000.00)
		 *
		 * @see https://cldr.unicode.org/translation/numbers-currency/number-patterns
		 *
		 * @param {string} sContext the context of the currency pattern (standard or accounting)
		 * @returns {string} The pattern
		 * @public
		 */
		getCurrencyPattern: function(sContext) {
			// Undocumented contexts for NumberFormat internal use: "sap-standard" and "sap-accounting"
			return this._get("currencyFormat")[sContext] || this._get("currencyFormat").standard;
		},

		getCurrencySpacing: function(sPosition) {
			return this._get("currencyFormat", "currencySpacing", sPosition === "after" ? "afterCurrency" : "beforeCurrency");
		},

		/**
		 * Get percent format pattern.
		 *
		 * @returns {string} The pattern
		 * @public
		 */
		getPercentPattern: function() {
			return this._get("percentFormat").standard;
		},

		/**
		 * Get miscellaneous pattern.
		 *
		 * @param {string} sName the name of the misc pattern, can be "approximately", "atLeast", "atMost" or "range"
		 * @returns {string} The pattern
		 * @public
		 */
		getMiscPattern: function(sName) {
			assert(sName == "approximately" || sName == "atLeast" || sName == "atMost" || sName == "range", "sName must be approximately, atLeast, atMost or range");
			return this._get("miscPattern")[sName];
		},

		/**
		 * Returns the required minimal number of days for the first week of a year.
		 *
		 * This is the minimal number of days of the week which must be contained in the new year
		 * for the week to become the first week of the year. Depending on the country, this
		 * is just a single day (in the US) or at least 4 days (in most of Europe).
		 *
		 * All week data information in the CLDR is provided for territories (countries).
		 * If the locale of this LocaleData doesn't contain country information (e.g. if it
		 * contains only a language), then the "likelySubtag" information of the CLDR
		 * is taken into account to guess the "most likely" territory for the locale.
		 *
		 * @returns {int} minimal number of days
		 * @public
		 */
		getMinimalDaysInFirstWeek: function() {
			return this._get("weekData-minDays");
		},

		/**
		 * Returns the day that usually is regarded as the first day
		 * of a week in the current locale.
		 *
		 * Days are encoded as integer where Sunday=0, Monday=1 etc.
		 *
		 * All week data information in the CLDR is provided for territories (countries).
		 * If the locale of this LocaleData doesn't contain country information (e.g. if it
		 * contains only a language), then the "likelySubtag" information of the CLDR
		 * is taken into account to guess the "most likely" territory for the locale.
		 *
		 * @returns {int} first day of week
		 * @public
		 */
		getFirstDayOfWeek: function() {
			return this._get("weekData-firstDay");
		},

		/**
		 * Returns the first day of a weekend for the given locale.
		 *
		 * Days are encoded in the same way as for {@link #getFirstDayOfWeek}.
		 *
		 * All week data information in the CLDR is provided for territories (countries).
		 * If the locale of this LocaleData doesn't contain country information (e.g. if it
		 * contains only a language), then the "likelySubtag" information of the CLDR
		 * is taken into account to guess the "most likely" territory for the locale.
		 *
		 * @returns {int} first day of weekend
		 * @public
		 */
		getWeekendStart: function() {
			return this._get("weekData-weekendStart");
		},

		/**
		 * Returns the last day of a weekend for the given locale.
		 *
		 * Days are encoded in the same way as for {@link #getFirstDayOfWeek}.
		 *
		 * All week data information in the CLDR is provided for territories (countries).
		 * If the locale of this LocaleData doesn't contain country information (e.g. if it
		 * contains only a language), then the "likelySubtag" information of the CLDR
		 * is taken into account to guess the "most likely" territory for the locale.
		 *
		 * @returns {int} last day of weekend
		 * @public
		 */
		getWeekendEnd: function() {
			return this._get("weekData-weekendEnd");
		},

		/**
		 * Returns a map of custom currency codes, defined via global configuration.
		 * @returns {object} map of custom currency codes, e.g.
		 * {
		 *     "AUD": "AUD",
		 *     "BRL": "BRL",
		 *     "EUR": "EUR",
		 *     "GBP": "GBP",
		 * }
		 * @private
		 * @ui5-restricted sap.ui.core.format.NumberFormat
		 * @since 1.63
		 */
		getCustomCurrencyCodes: function () {
			var mCustomCurrencies = this._get("currency") || {},
				mCustomCurrencyCodes = {};

			Object.keys(mCustomCurrencies).forEach(function (sCurrencyKey) {
				mCustomCurrencyCodes[sCurrencyKey] = sCurrencyKey;
			});

			return mCustomCurrencyCodes;
		},

		/**
		 * Returns the number of digits of the specified currency.
		 *
		 * @param {string} sCurrency ISO 4217 currency code
		 * @returns {int} digits of the currency
		 * @public
		 * @since 1.21.1
		 */
		getCurrencyDigits: function(sCurrency) {

			// try to lookup currency digits from custom currencies
			var mCustomCurrencies = this._get("currency");
			if (mCustomCurrencies) {
				if (mCustomCurrencies[sCurrency] && mCustomCurrencies[sCurrency].hasOwnProperty("digits")) {
					return mCustomCurrencies[sCurrency].digits;
				} else if (mCustomCurrencies["DEFAULT"] && mCustomCurrencies["DEFAULT"].hasOwnProperty("digits")) {
					return mCustomCurrencies["DEFAULT"].digits;
				}
			}

			var iDigits = this._get("currencyDigits", sCurrency);
			if (iDigits == null) {
				iDigits = this._get("currencyDigits", "DEFAULT");

				if (iDigits == null) {
					iDigits = 2; // default
				}
			}
			return iDigits;
		},

		/**
		 * Returns the currency symbol for the specified currency, if no symbol is found the ISO 4217 currency code is returned.
		 *
		 * @param {string} sCurrency ISO 4217 currency code
		 * @returns {string} the currency symbol
		 * @public
		 * @since 1.21.1
		 */
		getCurrencySymbol: function(sCurrency) {
			var oCurrencySymbols = this.getCurrencySymbols();
			return (oCurrencySymbols && oCurrencySymbols[sCurrency]) || sCurrency;
		},

		/**
		 * Returns the currency code which is corresponded with the given currency symbol.
		 *
		 * @param {string} sCurrencySymbol The currency symbol which needs to be converted to currency code
		 * @return {string} The corresponded currency code defined for the given currency symbol. The given currency symbol is returned if no currency code can be found by using the given currency symbol.
		 * @public
		 * @since 1.27.0
		 */
		getCurrencyCodeBySymbol: function(sCurrencySymbol) {
			var oCurrencySymbols = this._get("currencySymbols"), sCurrencyCode;
			for (sCurrencyCode in oCurrencySymbols) {
				if (oCurrencySymbols[sCurrencyCode] === sCurrencySymbol) {
					return sCurrencyCode;
				}
			}
			return sCurrencySymbol;
		},

		/**
		 * Returns the currency symbols available for this locale.
		 * Currency symbols get accumulated by custom currency symbols.
		 *
		 * @returns {Object<string, string>} the map of all currency symbols available in this locale, e.g.
		 * {
		 *     "AUD": "A$",
		 *     "BRL": "R$",
		 *     "EUR": "€",
		 *     "GBP": "£",
		 * }
		 * @public
		 * @since 1.60
		 */
		getCurrencySymbols: function() {
			// Lookup into global Config
			var mCustomCurrencies = this._get("currency"),
				mCustomCurrencySymbols = {},
				sIsoCode;

			for (var sCurrencyKey in mCustomCurrencies) {
				sIsoCode = mCustomCurrencies[sCurrencyKey].isoCode;

				if (mCustomCurrencies[sCurrencyKey].symbol) {
					mCustomCurrencySymbols[sCurrencyKey] = mCustomCurrencies[sCurrencyKey].symbol;
				} else if (sIsoCode) {
					mCustomCurrencySymbols[sCurrencyKey] = this._get("currencySymbols")[sIsoCode];
				}
			}

			return Object.assign({}, this._get("currencySymbols"), mCustomCurrencySymbols);
		},

		/**
		 * Retrieves the localized display name of a unit by sUnit, e.g. "duration-hour".
		 * @param {string} sUnit the unit key, e.g. "duration-hour"
		 * @return {string} The localized display name for the requested unit, e.g. <code>"Hour"</code>. Return empty string <code>""</code> if not found
		 * @public
		 * @since 1.54
		 */
		getUnitDisplayName: function(sUnit) {
			var mUnitFormat = this.getUnitFormat(sUnit);
			return (mUnitFormat && mUnitFormat["displayName"]) || "";
		},


		/**
		 * Returns relative time patterns for the given scales as an array of objects containing scale, value and pattern.
		 *
		 * The array may contain the following values: "year", "month", "week", "day", "hour", "minute" and "second". If
		 * no scales are given, patterns for all available scales will be returned.
		 *
		 * The return array will contain objects looking like:
		 * <pre>
		 * {
		 *     scale: "minute",
		 *     sign: 1,
		 *     pattern: "in {0} minutes"
		 * }
		 * </pre>
		 *
		 * @param {string[]} aScales The scales for which the available patterns should be returned
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the scale patterns; valid values are "wide", "short" and "narrow"
		 * @returns {object[]} An array of all relative time patterns
		 * @public
		 * @since 1.34
		 */
		getRelativePatterns: function(aScales, sStyle) {
			if (sStyle === undefined) {
				sStyle = "wide";
			}

			assert(sStyle === "wide" || sStyle === "short" || sStyle === "narrow", "sStyle is only allowed to be set with 'wide', 'short' or 'narrow'");

			var aPatterns = [],
				aPluralCategories = this.getPluralCategories(),
				oScale,
				oTimeEntry,
				iValue,
				iSign;

			if (!aScales) {
				aScales = ["year", "month", "week", "day", "hour", "minute", "second"];
			}

			aScales.forEach(function(sScale) {
				oScale = this._get("dateFields", sScale + "-" + sStyle);
				for (var sEntry in oScale) {
					if (sEntry.indexOf("relative-type-") === 0) {
						iValue = parseInt(sEntry.substr(14));
						aPatterns.push({
							scale: sScale,
							value: iValue,
							pattern: oScale[sEntry]
						});
					} else if (sEntry.indexOf("relativeTime-type-") == 0) {
						oTimeEntry = oScale[sEntry];
						iSign = sEntry.substr(18) === "past" ? -1 : 1;
						aPluralCategories.forEach(function(sKey) { // eslint-disable-line no-loop-func
							var sPattern = oTimeEntry["relativeTimePattern-count-" + sKey];

							if (sPattern) {
								aPatterns.push({
									scale: sScale,
									sign: iSign,
									pattern: sPattern
								});
							}
						});
					}
				}
			}.bind(this));

			return aPatterns;
		},

		/**
		 * Returns the relative format pattern with given scale (year, month, week, ...) and difference value.
		 *
		 * @param {string} sScale the scale the relative pattern is needed for
		 * @param {int} iDiff the difference in the given scale unit
		 * @param {boolean} [bFuture] whether a future or past pattern should be used
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string} the relative format pattern
		 * @public
		 * @since 1.34
		 */
		getRelativePattern: function(sScale, iDiff, bFuture, sStyle) {
			var sPattern, oTypes, sKey, sPluralCategory;

			if (typeof bFuture === "string") {
				sStyle = bFuture;
				bFuture = undefined;
			}

			if (bFuture === undefined) {
				bFuture = iDiff > 0;
			}

			if (sStyle === undefined) {
				sStyle = "wide";
			}

			assert(sStyle === "wide" || sStyle === "short" || sStyle === "narrow", "sStyle is only allowed to be set with 'wide', 'short' or 'narrow'");

			sKey = sScale + "-" + sStyle;

			if (iDiff === 0 || iDiff === -2 || iDiff === 2) {
				sPattern = this._get("dateFields", sKey, "relative-type-" + iDiff);
			}

			if (!sPattern) {
				oTypes = this._get("dateFields", sKey, "relativeTime-type-" + (bFuture ? "future" : "past"));
				sPluralCategory = this.getPluralCategory(Math.abs(iDiff).toString());
				sPattern = oTypes["relativeTimePattern-count-" + sPluralCategory];
			}

			return sPattern;
		},

		/**
		 * Returns the relative resource pattern with unit 'second' (like now, "in {0} seconds", "{0} seconds ago" under locale 'en') based on the given
		 * difference value (0 means now, positive value means in the future and negative value means in the past).
		 *
		 * @param {int} iDiff the difference in seconds
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string} the relative resource pattern in unit 'second'
		 * @public
		 * @since 1.31.0
		 */
		getRelativeSecond: function(iDiff, sStyle) {
			return this.getRelativePattern("second", iDiff, sStyle);
		},

		/**
		 * Returns the relative resource pattern with unit 'minute' (like "in {0} minute(s)", "{0} minute(s) ago" under locale 'en') based on the given
		 * difference value (positive value means in the future and negative value means in the past).
		 *
		 * There's no pattern defined for 0 difference and the function returns null if 0 is given. In the 0 difference case, you can use the getRelativeSecond
		 * function to format the difference using unit 'second'.
		 *
		 * @param {int} iDiff the difference in minutes
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string|null} the relative resource pattern in unit 'minute'. The method returns null if 0 is given as parameter.
		 * @public
		 * @since 1.31.0
		 */
		getRelativeMinute: function(iDiff, sStyle) {
			if (iDiff == 0) {
				return null;
			}
			return this.getRelativePattern("minute", iDiff, sStyle);
		},

		/**
		 * Returns the relative resource pattern with unit 'hour' (like "in {0} hour(s)", "{0} hour(s) ago" under locale 'en') based on the given
		 * difference value (positive value means in the future and negative value means in the past).
		 *
		 * There's no pattern defined for 0 difference and the function returns null if 0 is given. In the 0 difference case, you can use the getRelativeMinute or getRelativeSecond
		 * function to format the difference using unit 'minute' or 'second'.
		 *
		 * @param {int} iDiff the difference in hours
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string|null} the relative resource pattern in unit 'hour'. The method returns null if 0 is given as parameter.
		 * @public
		 * @since 1.31.0
		 */
		getRelativeHour: function(iDiff, sStyle) {
			if (iDiff == 0) {
				return null;
			}
			return this.getRelativePattern("hour", iDiff, sStyle);
		},

		/**
		 * Returns the relative day resource pattern (like "Today", "Yesterday", "{0} days ago") based on the given
		 * difference of days (0 means today, 1 means tomorrow, -1 means yesterday, ...).
		 *
		 * @param {int} iDiff the difference in days
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string} the relative day resource pattern
		 * @public
		 * @since 1.25.0
		 */
		getRelativeDay: function(iDiff, sStyle) {
			return this.getRelativePattern("day", iDiff, sStyle);
		},

		/**
		 * Returns the relative week resource pattern (like "This week", "Last week", "{0} weeks ago") based on the given
		 * difference of weeks (0 means this week, 1 means next week, -1 means last week, ...).
		 *
		 * @param {int} iDiff the difference in weeks
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string} the relative week resource pattern
		 * @public
		 * @since 1.31.0
		 */
		getRelativeWeek: function(iDiff, sStyle) {
			return this.getRelativePattern("week", iDiff, sStyle);
		},

		/**
		 * Returns the relative month resource pattern (like "This month", "Last month", "{0} months ago") based on the given
		 * difference of months (0 means this month, 1 means next month, -1 means last month, ...).
		 *
		 * @param {int} iDiff the difference in months
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string} the relative month resource pattern
		 * @public
		 * @since 1.25.0
		 */
		getRelativeMonth: function(iDiff, sStyle) {
			return this.getRelativePattern("month", iDiff, sStyle);
		},

		/**
		 * Returns the display name for a time unit (second, minute, hour, day, week, month, year).
		 *
		 * @param {string} sType Type (second, minute, hour, day, week, month, year)
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string} display name
		 * @public
		 * @since 1.34.0
		 */
		getDisplayName: function(sType, sStyle) {
			assert(sType == "second" || sType == "minute" || sType == "hour" || sType == "zone" || sType == "day"
				|| sType == "weekday" || sType == "week" || sType == "month" || sType == "quarter" || sType == "year" || sType == "era",
				"sType must be second, minute, hour, zone, day, weekday, week, month, quarter, year, era");

			if (sStyle === undefined) {
				sStyle = "wide";
			}

			assert(sStyle === "wide" || sStyle === "short" || sStyle === "narrow", "sStyle is only allowed to be set with 'wide', 'short' or 'narrow'");

			var aSingleFormFields = ["era", "weekday", "zone"],
				sKey = aSingleFormFields.indexOf(sType) === -1 ? sType + "-" + sStyle : sType;

			return this._get("dateFields", sKey, "displayName");
		},

		/**
		 * Returns the relative year resource pattern (like "This year", "Last year", "{0} year ago") based on the given
		 * difference of years (0 means this year, 1 means next year, -1 means last year, ...).
		 *
		 * @param {int} iDiff the difference in years
		 * @param {string} [sStyle="wide"]
		 *   Since 1.32.10 and 1.34.4, the style of the pattern; valid values are "wide", "short" and "narrow"
		 * @returns {string} the relative year resource pattern
		 * @public
		 * @since 1.25.0
		 */
		getRelativeYear: function(iDiff, sStyle) {
			return this.getRelativePattern("year", iDiff, sStyle);
		},

		/**
		 * Returns the short decimal formats (like 1K, 1M....).
		 *
		 * @param {string} sStyle short or long
		 * @param {string} sNumber 1000, 10000 ...
		 * @param {string} sPlural one or other (if not exists other is used)
		 * @returns {string} decimal format
		 * @public
		 * @since 1.25.0
		 */
		getDecimalFormat: function(sStyle, sNumber, sPlural) {

			var sFormat;
			var oFormats;

			switch (sStyle) {
			case "long":
				oFormats = this._get("decimalFormat-long");
				break;

			default: //short
				oFormats = this._get("decimalFormat-short");
				break;
			}

			if (oFormats) {
				var sName = sNumber + "-" + sPlural;
				sFormat = oFormats[sName];
				if (!sFormat) {
					sName = sNumber + "-other";
					sFormat = oFormats[sName];
				}
			}

			return sFormat;

		},

		/**
		 * Returns the short currency formats (like 1K USD, 1M USD....).
		 *
		 * @param {string} sStyle short
		 * @param {string} sNumber 1000, 10000 ...
		 * @param {string} sPlural one or other (if not exists other is used)
		 * @returns {string} decimal format
		 * @public
		 * @since 1.51.0
		 */
		getCurrencyFormat: function(sStyle, sNumber, sPlural) {

			var sFormat;
			var oFormats = this._get("currencyFormat-" + sStyle);

			// Defaults to "short" if not found
			if (!oFormats) {
				if (sStyle === "sap-short") {
					throw new Error("Failed to get CLDR data for property \"currencyFormat-sap-short\"");
				}
				oFormats = this._get("currencyFormat-short");
			}

			if (oFormats) {
				var sName = sNumber + "-" + sPlural;
				sFormat = oFormats[sName];
				if (!sFormat) {
					sName = sNumber + "-other";
					sFormat = oFormats[sName];
				}
			}

			return sFormat;

		},

		/**
		 * Returns a map containing patterns for formatting lists
		 *
		 *@param {string} [sType='standard'] The type of the list pattern. It can be 'standard' or 'or'.
		 *@param {string} [sStyle='wide'] The style of the list pattern. It can be 'wide' or 'short'.
		* @return {object} Map with list patterns
		 */
		getListFormat: function (sType, sStyle) {
			var oFormats = this._get("listPattern-" + (sType || "standard") + "-" + (sStyle || "wide"));

			if (oFormats) {
				return oFormats;
			}

			return {};
		},

		/**
		 * Retrieves the unit format pattern for a specific unit name considering the unit mappings.
		 * @param {string} sUnit unit name, e.g. "duration-hour" or "my"
		 * @return {object} The unit format configuration for the given unit name
		 * @public
		 * @since 1.54
		 * @see sap.ui.core.LocaleData#getUnitFromMapping
		 */
		getResolvedUnitFormat: function (sUnit) {
			sUnit = this.getUnitFromMapping(sUnit) || sUnit;
			return this.getUnitFormat(sUnit);
		},

		/**
		 * Retrieves the unit format pattern for a specific unit name.
		 *
		 * Note: Does not take unit mapping into consideration.
		 * @param {string} sUnit unit name, e.g. "duration-hour"
		 * @return {object} The unit format configuration for the given unit name
		 * @public
		 * @since 1.54
		 */
		getUnitFormat: function (sUnit) {
			var oResult = this._get("units", "short", sUnit);

			if (!oResult && mLegacyUnit2CurrentUnit[sUnit]) {
				oResult = this._get("units", "short", mLegacyUnit2CurrentUnit[sUnit]);
			}
			return oResult;
		},

		/**
		 * Retrieves all unit format patterns merged.
		 *
		 * Note: Does not take unit mapping into consideration.
		 * @return {object} The unit format patterns
		 * @public
		 * @since 1.54
		 */
		getUnitFormats: function() {
			return this._getMerged("units", "short");
		},

		/**
		 * Looks up the unit from defined unit mapping.
		 * E.g. for defined unit mapping
		 * <code>
		 * {
		 *  "my": "my-custom-unit",
		 *  "cm": "length-centimeter"
		 * }
		 * </code>
		 *
		 * Call:
		 * <code>getUnitFromMapping("my")</code> would result in <code>"my-custom-unit"</code>
		 * @param {string} sMapping mapping identifier
		 * @return {string} unit from the mapping
		 * @public
		 * @since 1.54
		 */
		getUnitFromMapping: function (sMapping) {
			return this._get("unitMappings", sMapping);
		},


		/**
		 * Returns array of eras.
		 *
		 * @param {string} sWidth the style of the era name. It can be 'wide', 'abbreviated' or 'narrow'
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar
		 * @return {array} the array of eras
		 * @public
		 * @since 1.32.0
		 */
		getEras: function(sWidth, sCalendarType) {
			assert(sWidth == "wide" || sWidth == "abbreviated" || sWidth == "narrow" , "sWidth must be wide, abbreviate or narrow");

			//TODO Adapt generation so that eras are an array instead of object
			var oEras = this._get(getCLDRCalendarName(sCalendarType), "era-" + sWidth),
				aEras = [];
			for (var i in oEras) {
				aEras[parseInt(i)] = oEras[i];
			}
			return aEras;
		},

		/**
		 * Returns the map of era IDs to era dates.
		 *
		 * @param {sap.ui.core.CalendarType} [sCalendarType] the type of calendar
		 * @return {array} the array of eras containing objects with either an _end or _start property with a date
		 * @public
		 * @since 1.32.0
		 */
		getEraDates: function(sCalendarType) {
			//TODO Adapt generation so that eradates are an array instead of object
			var oEraDates = this._get("eras-" + sCalendarType.toLowerCase()),
				aEraDates = [];
			for (var i in oEraDates) {
				aEraDates[parseInt(i)] = oEraDates[i];
			}
			return aEraDates;
		},

		/**
		 * Returns the defined pattern for representing the calendar week number.
		 *
		 * @param {string} sStyle the style of the pattern. It can only be either "wide" or "narrow".
		 * @param {int} iWeekNumber the week number
		 * @return {string} the week number string
		 *
		 * @public
		 * @since 1.32.0
		 */
		getCalendarWeek: function(sStyle, iWeekNumber) {
			assert(sStyle == "wide" || sStyle == "narrow" , "sStyle must be wide or narrow");

			const oMessageBundle = Lib.getResourceBundleFor("sap.ui.core", this.oLocale.toString());
			const sKey = "date.week.calendarweek." + sStyle;

			return oMessageBundle.getText(sKey, iWeekNumber ? [iWeekNumber] : undefined);
		},

		/**
		 * Whether 1 January is the first day of the first calendar week.
		 * This is the definition of the calendar week in the US.
		 *
		 * @return {boolean} true if the first week of the year starts with 1 January.
		 * @public
		 * @since 1.92.0
		 */
		firstDayStartsFirstWeek: function() {
			return this.oLocale.getLanguage() === "en" && this.oLocale.getRegion() === "US";
		},

		/**
		 * Returns the preferred calendar type for the current locale which exists in {@link sap.ui.core.CalendarType}
		 *
		 * @returns {sap.ui.core.CalendarType} the preferred calendar type
		 * @public
		 * @since 1.28.6
		 */
		getPreferredCalendarType: function() {
			var sCalendarName, sType, i,
				aCalendars = this._get("calendarPreference") || [];

			for ( i = 0 ; i < aCalendars.length ; i++ ) {
				// No support for calendar subtypes (islamic) yet, so ignore part after -
				sCalendarName = aCalendars[i].split("-")[0];
				for (sType in CalendarType) {
					if (sCalendarName === sType.toLowerCase()) {
						return sType;
					}
				}
			}

			return CalendarType.Gregorian;
		},

		/**
		 * Returns the preferred hour pattern symbol (h for 12, H for 24 hours) for the current locale.
		 *
		 * @returns {string} the preferred hour symbol
		 * @public
		 * @since 1.34
		 */
		getPreferredHourSymbol: function() {
			return this._get("timeData", "_preferred");
		},

		/**
		 * Returns an array of all plural categories available in this language.
		 *
		 * @returns {array} The array of plural categories
		 * @public
		 * @since 1.50
		 */
		getPluralCategories: function() {
			var oPlurals = this._get("plurals"),
				aCategories =  Object.keys(oPlurals);
			aCategories.push("other");
			return aCategories;
		},

		/**
		 * Returns the plural category (zero, one, two, few, many or other) for the given number value.
		 * The number must be passed as an unformatted number string with dot as decimal
		 * separator (for example "12345.67"). To determine the correct plural category, it
		 * is also necessary to keep the same number of decimal digits as given in the formatted
		 * output string. For example "1" and "1.0" could be in different plural categories as
		 * the number of decimal digits is different.
		 *
		 * Compact numbers (for example in "short" format) must be provided in the
		 * locale-independent CLDR compact notation. This notation uses the plural rule operand "c"
		 * for the compact decimal exponent, for example "1.2c3" for "1.2K" (1200) or "4c6" for
		 * "4M" (4000000).
		 *
		 * Note that the operand "e" is deprecated, but is a synonym corresponding to the CLDR
		 * specification for "c" and may be redefined in the future.
		 *
		 * @param {string|number} vNumber The number to find the plural category for
		 * @returns {string} The plural category
		 * @public
		 * @since 1.50
		 */
		getPluralCategory: function(vNumber) {
			var sNumber = (typeof vNumber === "number") ? vNumber.toString() : vNumber,
				oPlurals = this._get("plurals");

			if (!this._pluralTest) {
				this._pluralTest = {};
			}
			for (var sCategory in oPlurals) {
				var fnTest = this._pluralTest[sCategory];
				if (!fnTest) {
					fnTest = this._parsePluralRule(oPlurals[sCategory]);
					this._pluralTest[sCategory] = fnTest;
				}
				if (fnTest(sNumber).bMatch) {
					return sCategory;
				}
			}
			return "other";
		},

		/**
		 * Parses a language plural rule as specified in
		 * https://unicode.org/reports/tr35/tr35-numbers.html#table-plural-operand-meanings
		 *
		 * @param {string} sRule The plural rule as a string
		 * @returns {function(string)} A function to determine for a number given as string parameter if it matches the
		 *   plural rule.
		 *
		 * @private
		 */
		_parsePluralRule: function(sRule) {

			var OP_OR = "or",
				OP_AND = "and",
				OP_MOD = "%",
				OP_EQ = "=",
				OP_NEQ = "!=",
				OPD_N = "n",
				OPD_I = "i",
				OPD_F = "f",
				OPD_T = "t",
				OPD_V = "v",
				OPD_W = "w",
				OPD_C = "c",
				OPD_E = "e",
				RANGE = "..",
				SEP = ",";

			var i = 0,
				aTokens;

			aTokens = sRule.split(" ");

			function accept(sToken) {
				if (aTokens[i] === sToken) {
					i++;
					return true;
				}
				return false;
			}

			function consume() {
				var sToken = aTokens[i];
				i++;
				return sToken;
			}

			function or_condition() {
				var fnAnd, fnOr;
				fnAnd = and_condition();
				if (accept(OP_OR)) {
					fnOr = or_condition();
					return function(o) {
						return fnAnd(o) || fnOr(o);
					};
				}
				return fnAnd;
			}

			function and_condition() {
				var fnRelation, fnAnd;
				fnRelation = relation();
				if (accept(OP_AND)) {
					fnAnd = and_condition();
					return function(o) {
						return fnRelation(o) && fnAnd(o);
					};
				}
				return fnRelation;
			}

			function relation() {
				var fnExpr, fnRangeList, bEq;
				fnExpr = expr();
				if (accept(OP_EQ)) {
					bEq = true;
				} else if (accept(OP_NEQ)) {
					bEq = false;
				} else {
					throw new Error("Expected '=' or '!='");
				}
				fnRangeList = range_list();
				if (bEq) {
					return function(o) {
						return fnRangeList(o).indexOf(fnExpr(o)) >= 0;
					};
				} else {
					return function(o) {
						return fnRangeList(o).indexOf(fnExpr(o)) === -1;
					};
				}
			}

			function expr() {
				var fnOperand;
				fnOperand = operand();
				if (accept(OP_MOD)) {
					var iDivisor = parseInt(consume());
					return function(o) {
						return fnOperand(o) % iDivisor;
					};
				}
				return fnOperand;
			}

			function operand() {
				if (accept(OPD_N)) {
					return function(o) {
						return o.n;
					};
				} else if (accept(OPD_I)) {
					return function(o) {
						return o.i;
					};
				} else if (accept(OPD_F)) {
					return function(o) {
						return o.f;
					};
				} else if (accept(OPD_T)) {
					return function(o) {
						return o.t;
					};
				} else if (accept(OPD_V)) {
					return function(o) {
						return o.v;
					};
				} else if (accept(OPD_W)) {
					return function(o) {
						return o.w;
					};
				} else if (accept(OPD_C)) {
					return function(o) {
						return o.c;
					};
				} else if (accept(OPD_E)) {
					return function(o) {
						return o.c; // c is an alias for e
					};
				} else {
					throw new Error("Unknown operand: " + consume());
				}
			}

			function range_list() {
				var aValues = [],
					sRangeList = consume(),
					aParts = sRangeList.split(SEP),
					aRange, iFrom, iTo;
				aParts.forEach(function(sPart) {
					aRange = sPart.split(RANGE);
					if (aRange.length === 1) {
						aValues.push(parseInt(sPart));
					} else {
						iFrom = parseInt(aRange[0]);
						iTo = parseInt(aRange[1]);
						for (var i = iFrom; i <= iTo; i++) {
							aValues.push(i);
						}
					}
				});
				return function(o) {
					return aValues;
				};
			}

			var fnOr = or_condition();
			if (i != aTokens.length) {
				throw new Error("Not completely parsed");
			}
			return function(sValue) {
				var iDotPos, iExponent, iExponentPos, sFraction, sFractionNoZeros, sInteger, o;

				// replace compact operand "c" to scientific "e" to be convertible in LocaleData.convertToDecimal
				sValue = sValue.replace(rCIgnoreCase, "e");
				iExponentPos = sValue.search(rEIgnoreCase);

				iExponent = iExponentPos < 0 ? 0 : parseInt(sValue.slice(iExponentPos + 1));
				sValue = LocaleData.convertToDecimal(sValue);

				iDotPos = sValue.indexOf(".");
				if (iDotPos === -1) {
					sInteger = sValue;
					sFraction = "";
					sFractionNoZeros = "";
				} else {
					sInteger = sValue.slice(0, iDotPos);
					sFraction = sValue.slice(iDotPos + 1);
					sFractionNoZeros = sFraction.replace(rTrailingZeroes, "");
				}

				o = {
					n: parseFloat(sValue),
					i: parseInt(sInteger),
					v: sFraction.length,
					w: sFractionNoZeros.length,
					f: sFraction === "" ? 0 : parseInt(sFraction),
					t: sFractionNoZeros === "" ? 0 : parseInt(sFractionNoZeros),
					c: iExponent
				};
				return {bMatch: fnOr(o), oOperands: o};
			};
		}
	});

	/**
	 * Returns the non-scientific (=decimal) notation of the given numeric value which does not contain an exponent
	 * value.
	 * For numbers with a magnitude (ignoring sign) greater than or equal to 1e+21 or less than 1e-6, a conversion is
	 * required, as Number#toString formats these in scientific notation.
	 *
	 * @param {float|string} vValue
	 *   A number such as 10.1 or a string containing a number based on radix 10
	 * @return {string} The number in decimal notation
	 *
	 * @private
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toString#description
	 */
	LocaleData.convertToDecimal = function (vValue) {
		var iIntegerLength, iExponent, iFractionLength, bNegative, iNewIntegerLength, aResult,
			sValue = String(vValue);

		if (!sValue.includes("e") && !sValue.includes("E")) {
			return sValue;
		}

		aResult = sValue.match(rNumberInScientificNotation);
		bNegative = aResult[1] === "-";
		sValue = aResult[2].replace(".", "");
		iIntegerLength = aResult[3] ? aResult[3].length : 0;
		iFractionLength = aResult[4] ? aResult[4].length : 0;
		iExponent = parseInt(aResult[5]);

		iNewIntegerLength = iIntegerLength + iExponent;
		if (iExponent > 0) {
			sValue = iExponent < iFractionLength
				? sValue.slice(0, iNewIntegerLength) + "." + sValue.slice(iNewIntegerLength)
				: sValue = sValue.padEnd(iNewIntegerLength, "0");
		} else {
			sValue = -iExponent < iIntegerLength
				? sValue = sValue.slice(0, iNewIntegerLength) + "." + sValue.slice(iNewIntegerLength)
				: sValue = "0." + sValue.padStart(iFractionLength - iExponent, "0");
		}
		if (bNegative) {
			sValue = "-" + sValue;
		}
		return sValue;
	};

	var mCLDRSymbolGroups = {
		"Era": { field: "era", index: 0 },
		"Year": { field: "year", index: 1 },
		"Quarter": { field: "quarter", index: 2 },
		"Month": { field: "month", index: 3 },
		"Week": { field: "week", index: 4 },
		"Day-Of-Week": { field: "weekday", index: 5 },
		"Day": { field: "day", index: 6 },
		"DayPeriod": { field: "hour", index: 7, diffOnly: true },
		"Hour": { field: "hour", index: 8 },
		"Minute": { field: "minute", index: 9 },
		"Second": { field: "second", index: 10 },
		"Timezone": { field: "zone", index: 11 }
	};

	var mCLDRSymbols = {
		"G": { group: "Era", match: "Era", numericCeiling: 1},
		"y": { group: "Year", match: "Year", numericCeiling: 100},
		"Y": { group: "Year", match: "Year", numericCeiling: 100},
		"Q": { group: "Quarter", match: "Quarter", numericCeiling: 3},
		"q": { group: "Quarter", match: "Quarter", numericCeiling: 3},
		"M": { group: "Month", match: "Month", numericCeiling: 3},
		"L": { group: "Month", match: "Month", numericCeiling: 3},
		"w": { group: "Week", match: "Week", numericCeiling: 100},
		"W": { group: "Week", match: "Week", numericCeiling: 100},
		"d": { group: "Day", match: "Day", numericCeiling: 100},
		"D": { group: "Day", match: "Day", numericCeiling: 100},
		"E": { group: "Day-Of-Week", match: "Day-Of-Week", numericCeiling: 1},
		"e": { group: "Day-Of-Week", match: "Day-Of-Week", numericCeiling: 3},
		"c": { group: "Day-Of-Week", match: "Day-Of-Week", numericCeiling: 2},
		"h": { group: "Hour", match: "Hour12", numericCeiling: 100},
		"H": { group: "Hour", match: "Hour24", numericCeiling: 100},
		"k": { group: "Hour", match: "Hour24", numericCeiling: 100},
		"K": { group: "Hour", match: "Hour12", numericCeiling: 100},
		"m": { group: "Minute", match: "Minute", numericCeiling: 100},
		"s": { group: "Second", match: "Second", numericCeiling: 100},
		"z": { group: "Timezone", match: "Timezone", numericCeiling: 1},
		"Z": { group: "Timezone", match: "Timezone", numericCeiling: 1},
		"O": { group: "Timezone", match: "Timezone", numericCeiling: 1},
		"v": { group: "Timezone", match: "Timezone", numericCeiling: 1},
		"V": { group: "Timezone", match: "Timezone", numericCeiling: 1},
		"X": { group: "Timezone", match: "Timezone", numericCeiling: 1},
		"x": { group: "Timezone", match: "Timezone", numericCeiling: 1},
		"S": { group: "Other", numericCeiling: 100},
		"u": { group: "Other", numericCeiling: 100},
		"U": { group: "Other", numericCeiling: 1},
		"r": { group: "Other", numericCeiling: 100},
		"F": { group: "Other", numericCeiling: 100},
		"g": { group: "Other", numericCeiling: 100},
		"a": { group: "DayPeriod", numericCeiling: 1},
		"b": { group: "Other", numericCeiling: 1},
		"B": { group: "Other", numericCeiling: 1},
		"A": { group: "Other", numericCeiling: 100}
	};

	/**
	 * Helper to analyze and parse designtime (aka buildtime) variables
	 *
	 * At buildtime, the build can detect a pattern like $some-variable-name:some-value$
	 * and replace 'some-value' with a value determined at buildtime (here: the actual list of locales).
	 *
	 * At runtime, this method removes the surrounding pattern ('$some-variable-name:' and '$') and leaves only the 'some-value'.
	 * Additionally, this value is parsed as a comma-separated list (because this is the only use case here).
	 *
	 * The mimic of the comments is borrowed from the CVS (Concurrent Versions System),
	 * see http://web.mit.edu/gnu/doc/html/cvs_17.html.
	 *
	 * If no valid <code>sValue</code> is given, <code>null</code> is returned
	 *
	 * @param {string} sValue The raw designtime property e.g. $cldr-rtl-locales:ar,fa,he$
	 * @returns {string[]|null} The designtime property e.g. ['ar', 'fa', 'he']
	 * @private
	 */
	 function getDesigntimePropertyAsArray(sValue) {
		var m = /\$([-a-z0-9A-Z._]+)(?::([^$]*))?\$/.exec(sValue);
		return (m && m[2]) ? m[2].split(/,/) : null;
	}

	/**
	 * A list of locales for which CLDR data is bundled with the UI5 runtime.
	 * @private
	 */
	var _cldrLocales = getDesigntimePropertyAsArray("$cldr-locales:ar,ar_EG,ar_SA,bg,ca,cnr,cy,cs,da,de,de_AT,de_CH,el,el_CY,en,en_AU,en_GB,en_HK,en_IE,en_IN,en_NZ,en_PG,en_SG,en_ZA,es,es_AR,es_BO,es_CL,es_CO,es_MX,es_PE,es_UY,es_VE,et,fa,fi,fr,fr_BE,fr_CA,fr_CH,fr_LU,he,hi,hr,hu,id,it,it_CH,ja,kk,ko,lt,lv,mk,ms,nb,nl,nl_BE,pl,pt,pt_PT,ro,ru,ru_UA,sk,sl,sr,sr_Latn,sv,th,tr,uk,vi,zh_CN,zh_HK,zh_SG,zh_TW$");

	/**
	 * A set of locales for which the UI5 runtime contains a CLDR JSON file.
	 *
	 * Helps to avoid unsatisfiable backend calls.
	 *
	 * @private
	 */
	var M_SUPPORTED_LOCALES = (function() {
		var LOCALES = _cldrLocales,
			result = {},
			i;

		if ( LOCALES ) {
			for (i = 0; i < LOCALES.length; i++) {
				result[LOCALES[i]] = true;
			}
		}

		return result;
	}());

	/**
	 * Locale data cache.
	 *
	 * @private
	 */
	var mLocaleDatas = {};

	/**
	 * Creates a flat map from an object structure which contains a link to the parent ("_parent").
	 * The values should contain the parent(s) and the element joined by <code>", "</code>.
	 * The keys are the keys of the object structure joined by "/" excluding "_parent".
	 *
	 * E.g. input
	 * <code>
	 * {
	 *     a: {
	 *         a1: {
	 *             a11: "A11",
	 *             _parent: "A1"
	 *         },
	 *         _parent: "A"
	 *     }
	 * }
	 * </code>
	 *
	 * output:
	 * <code>
	 * {
	 *     "a/a1/a11": "A, A1, A11"
	 * }
	 * </code>
	 *
	 * @param {object} oNode the node which will be processed
	 * @param {string} [sKey=""] the key inside the node which should be processed
	 * @param {object} [oResult={}] the result which is passed through the recursion
	 * @param {string[]} [aParentTranslations=[]] the list of parent translations, e.g. ["A", "A1"]
	 * @returns {Object<string, string>} object map with key being the keys joined by "/" and the values joined by ", ".
	 * @private
	 */
	function _resolveTimezoneTranslationStructure (oNode, sKey, oResult, aParentTranslations) {
		aParentTranslations = aParentTranslations ? aParentTranslations.slice() : [];
		oResult = oResult || {};

		sKey = sKey || "";
		Object.keys(oNode).forEach(function (sChildKey) {
			var vChildNode = oNode[sChildKey];
			if (typeof vChildNode === "object") {
				var aParentTranslationForChild = aParentTranslations.slice();
				var sParent = vChildNode["_parent"];
				if (sParent) {
					aParentTranslationForChild.push(sParent);
				}
				_resolveTimezoneTranslationStructure(vChildNode, sKey + sChildKey + "/", oResult, aParentTranslationForChild);
			} else if (typeof vChildNode === "string" && sChildKey !== "_parent") {
				var sParents = aParentTranslations.length ? aParentTranslations.join(", ") + ", " : "";
				oResult[sKey + sChildKey] = sParents + vChildNode;
			}
		});
		return oResult;
	}

	/**
	 * Returns the corresponding calendar name in CLDR of the given calendar type, or the calendar type
	 * from the configuration, in case sCalendarType is undefined.
	 *
	 * @param {sap.ui.core.CalendarType} sCalendarType the type defined in {@link sap.ui.core.CalendarType}.
	 * @returns {string} calendar name
	 * @private
	 */
	function getCLDRCalendarName(sCalendarType) {
		if (!sCalendarType) {
			sCalendarType = Formatting.getCalendarType();
		}
		return "ca-" + sCalendarType.toLowerCase();
	}

	/**
	 * Load LocaleData data from the CLDR generated files.
	 */
	function getData(oLocale) {

		var sLanguage = oLocale.getLanguage() || "",
			sScript = oLocale.getScript() || "",
			sRegion = oLocale.getRegion() || "",
			mData;

		/*
		 * Merge a CLDR delta file and a CLDR fallback file.
		 *
		 * Note: this function can't be replaced by sap/base/util/extend or sap/base/util/merge
		 * as its contract for null values differs from those modules.
		 */
		function merge(obj, fallbackObj) {
			var name, value, fallbackValue;

			if ( !fallbackObj ) {
				return;
			}

			for ( name in fallbackObj ) {

				if ( fallbackObj.hasOwnProperty(name) ) {

					value = obj[ name ];
					fallbackValue = fallbackObj[ name ];

					if ( value === undefined ) {
						// 'undefined': value doesn't exist in delta, so take it from the fallback object
						// Note: undefined is not a valid value in JSON, so we can't misunderstand an existing undefined
						obj[name] = fallbackValue;
					} else if ( value === null ) {
						// 'null' is used by the delta tooling as a marker that a value must not be taken form the fallback
						delete obj[name];
					} else if ( typeof value === 'object' && typeof fallbackValue === 'object' && !Array.isArray(value) ) {
						// both values are objects, merge them recursively
						merge(value, fallbackValue);
					}

				}

			}

		}

		function getOrLoad(sId) {
			if ( !mLocaleDatas[sId] && (!M_SUPPORTED_LOCALES || M_SUPPORTED_LOCALES[sId] === true) ) {
				var data = mLocaleDatas[sId] = LoaderExtensions.loadResource("sap/ui/core/cldr/" + sId + ".json", {
					dataType: "json",
					failOnError : false
				});

				// check if the data is a minified delta file.
				// If so, load the corresponding fallback data as well, merge it and remove the fallback marker
				if ( data && data.__fallbackLocale ) {
					merge(data, getOrLoad(data.__fallbackLocale));
					delete data.__fallbackLocale;
				}

				// if load fails, null is returned
				// -> caller will process the fallback chain, in the end a result is identified and stored in mDatas under the originally requested ID
			}
			return mLocaleDatas[sId];
		}

		// normalize language and handle special cases
		sLanguage = (sLanguage && Localization.getModernLanguage(sLanguage)) || sLanguage;
		// Special case 1: in an SAP context, the inclusive language code "no" always means Norwegian Bokmal ("nb")
		if ( sLanguage === "no" ) {
			sLanguage = "nb";
		}
		// Special case 2: for Chinese, derive a default region from the script (this behavior is inherited from Java)
		if ( sLanguage === "zh" && !sRegion ) {
			if ( sScript === "Hans" ) {
				sRegion = "CN";
			} else if ( sScript === "Hant" ) {
				sRegion = "TW";
			}
		}

		// Special case 3: for Serbian, there is script cyrillic and latin, "sh" and "sr-latn" map to "latin", "sr" maps to cyrillic
		// CLDR files: sr.json (cyrillic) and sr_Latn.json (latin)
		if (sLanguage === "sh" || (sLanguage === "sr" && sScript === "Latn")) {
			sLanguage = "sr_Latn";
		}

		// sId is the originally requested locale.
		// this is the key under which the result (even a fallback one) will be stored in the end
		var sId = sLanguage + "_" + sRegion;

		// the locale of the loaded json file
		var sCLDRLocaleId = sId;

		// first try: load CLDR data for specific language / region combination
		if ( sLanguage && sRegion ) {
			mData = getOrLoad(sId);
		}
		// second try: load data for language only
		if ( !mData && sLanguage ) {
			mData = getOrLoad(sLanguage);
			sCLDRLocaleId = sLanguage;
		}
		// last try: load data for default language "en" (english)
		if (!mData) {
			mData = getOrLoad("en");
			sCLDRLocaleId = "en";
		}

		// store in cache
		mLocaleDatas[sId] = mData;

		sCLDRLocaleId = sCLDRLocaleId.replace(/_/g, "-");
		return {
			mData: mData,
			sCLDRLocaleId: sCLDRLocaleId
		};
	}


	/**
	 * @classdesc A specialized subclass of LocaleData that merges custom settings.
	 * @extends sap.ui.core.LocaleData
	 * @alias sap.ui.core.CustomLocaleData
	 * @private
	 */
	var CustomLocaleData = LocaleData.extend("sap.ui.core.CustomLocaleData", {
		constructor: function(oLocale) {
			LocaleData.apply(this, arguments);
			this.mCustomData = Formatting.getCustomLocaleData();
		},

		/**
		 * Retrieves the value for the given arguments by checking first <code>mCustomData</code> and if not
		 * found <code>mData</code>
		 * @returns {*} value
		 * @private
		 */
		_get: function() {
			var aArguments = Array.prototype.slice.call(arguments),
				sCalendar, sKey;
			// Calendar data needs special handling, as CustomLocaleData does have one version of calendar data only
			if (aArguments[0].indexOf("ca-") == 0) {
				sCalendar = aArguments[0];
				if (sCalendar == getCLDRCalendarName()) {
					aArguments = aArguments.slice(1);
				}
			}

			sKey = aArguments.join("-");
			// first try customdata with special formatted key
			// afterwards try customdata lookup
			// afterwards try mData lookup
			var vValue = this.mCustomData[sKey];
			if (vValue == null) {
				vValue = this._getDeep(this.mCustomData, arguments);
				if (vValue == null) {
					vValue = this._getDeep(this.mData, arguments);
				}
			}

			return vValue;
		},

		/**
		 * Retrieves merged object from <code>mData</code> extended with <code>mCustomData</code>.
		 * This function merges the content of <code>mData</code> and <code>mCustomData</code> instead of returning one or the other like <code>_get()</code> does.
		 *
		 * Note: Properties defined in <code>mCustomData</code> overwrite the ones from <code>mData</code>.
		 * @private
		 * @return {object} merged object
		 */
		_getMerged: function () {
			var mData = this._getDeep(this.mData, arguments);
			var mCustomData = this._getDeep(this.mCustomData, arguments);

			return extend({}, mData, mCustomData);
		},

		/**
		 * Returns the first day of the week defined by the calendar week numbering algorithm
		 * set in the configuration, or if no specific calendar week numbering algorithm is configured, see
		 * {@link module:sap/base/i18n/Formatting.setCalendarWeekNumbering Formatting.setCalendarWeekNumbering}.
		 * Otherwise, the first day of the week is determined by the current locale, see
		 * {@link sap.ui.core.LocaleData#getFirstDayOfWeek}.
		 *
		 * Days are encoded as integer where Sunday=0, Monday=1 etc.
		 *
		 * @returns {int} The first day of week
		 * @override sap.ui.core.LocalData#getFirstDayOfWeek
		 * @since 1.113.0
		 */
		getFirstDayOfWeek: function() {
			var sCalendarWeekNumbering = Formatting.getCalendarWeekNumbering();

			if (sCalendarWeekNumbering === CalendarWeekNumbering.Default) {
				return LocaleData.prototype.getFirstDayOfWeek.call(this);
			}

			return CalendarWeekNumbering.getWeekConfigurationValues(sCalendarWeekNumbering).firstDayOfWeek;
		},

		/**
		 * Returns the required minimal number of days for the first week of a year defined by the
		 * calendar week numbering algorithm set in the configuration,
		 * see {@link module:sap/base/i18n/Formatting.setCalendarWeekNumbering Formatting.setCalendarWeekNumbering}.
		 * If no specific calendar week numbering algorithm is configured the required minimal number
		 * of days for the first week of a year is determined by the current locale,
		 * see {@link sap.ui.core.LocaleData#getMinimalDaysInFirstWeek}.
		 *
		 * @returns {int} The required minimal number of days for the first week of a year
		 * @override sap.ui.core.LocalData#getMinimalDaysInFirstWeek
		 * @since 1.113.0
		 */
		getMinimalDaysInFirstWeek: function() {
			var sCalendarWeekNumbering = Formatting.getCalendarWeekNumbering();

			if (sCalendarWeekNumbering === CalendarWeekNumbering.Default) {
				return LocaleData.prototype.getMinimalDaysInFirstWeek.call(this);
			}

			return CalendarWeekNumbering.getWeekConfigurationValues(sCalendarWeekNumbering).minimalDaysInFirstWeek;
		}
	});

	/**
	 * Creates an instance of <code>LocaleData</code> for the given locale.
	 *
	 * @param {sap.ui.core.Locale|sap.base.i18n.LanguageTag} vLocale The locale or language tag
	 * @returns {sap.ui.core.LocaleData} An instance of <code>LocaleData</code>
	 *
	 * @public
	 * @since 1.123
	 */
	LocaleData.getInstance = function(vLocale) {
		vLocale = Locale._getCoreLocale(vLocale);
		return vLocale.hasPrivateUseSubtag("sapufmt") ? new CustomLocaleData(vLocale) : new LocaleData(vLocale);
	};

	LocaleData._cldrLocales = _cldrLocales;
	// maps a locale to a map of time zone translations, which maps an IANA time zone ID to the translated time zone
	// name
	LocaleData._mTimezoneTranslations = {};

	const rContainsSymbol = new RegExp("[" + Object.keys(mCLDRSymbols).join("") + "]");
	const rTextWithOptionalSpacesAtStartAndEnd = /^(\s)?(.*?)(\s)?$/;

	/**
	 * Returns the escaped value if the given value contains CLDR symbols.
	 *
	 * @param {string} [sValue=""]
	 *   The value to be checked and escaped if needed; the value must not contain '
	 * @returns {string}
	 *   The escaped value; only the string between one optional space at the beginning and at the
	 *   end is escaped
	 */
	LocaleData._escapeIfNeeded = function (sValue) {
		if (sValue === undefined) {
			return "";
		}
		if (rContainsSymbol.test(sValue)) {
			return sValue.replace(rTextWithOptionalSpacesAtStartAndEnd, "$1'$2'$3");
		}
		return sValue;
	};

	return LocaleData;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/core/Supportability", [
	"sap/base/config"
], (
	BaseConfig
) => {
	"use strict";

	/**
	 * Provides supportability related API
	 *
	 * @alias module:sap/ui/core/Supportability
	 * @namespace
	 * @private
	 * @ui5-restricted sap.ui.core
	 * @since 1.120.0
	 */
	const Supportability = {
		/**
		 * Returns whether the page runs in full debug mode.
		 * @returns {boolean} Whether the page runs in full debug mode
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.120.0
		 */
		isDebugModeEnabled() {
			// Configuration only maintains a flag for the full debug mode.
			// ui5loader-autoconfig calculates detailed information also for the partial debug
			// mode and writes it to window["sap-ui-debug"].
			// Only a value of true must be reflected by this getter
			let bDebug = window["sap-ui-debug"] === true ||
				BaseConfig.get({
					name: "sapUiDebug",
					type: BaseConfig.Type.Boolean,
					external: true
				});

			try {
				bDebug = bDebug || /^(?:true|x|X)$/.test(window.localStorage.getItem("sap-ui-debug"));
			} catch (e) {
				// access to local storage might fail due to security / privacy settings
			}
			return bDebug;
		},

		/**
		 * Returns whether the UI5 control inspector is displayed.
		 * Has only an effect when the sap-ui-debug module has been loaded
		 * @return {boolean} whether the UI5 control inspector is displayed
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.120.0
		 */
		isControlInspectorEnabled() {
			return BaseConfig.get({
				name: "sapUiInspect",
				type: BaseConfig.Type.Boolean,
				external: true
			});
		},

		/**
		 * Flag if statistics are requested.
		 *
		 * Flag set by TechnicalInfo Popup will also be checked.
		 * So its active if set by URL parameter or manually via TechnicalInfo.
		 *
		 * @returns {boolean} Whether statistics are enabled
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.120.0
		 */
		isStatisticsEnabled() {
			var result = BaseConfig.get({
				name: "sapUiStatistics",
				type: BaseConfig.Type.Boolean,
				defaultValue: BaseConfig.get({
					name: "sapStatistics",
					type: BaseConfig.Type.Boolean,
					external: true
				}),
				external: true
			});
			try {
				result = result || window.localStorage.getItem("sap-ui-statistics") == "X";
			} catch (e) {
				// access to local storage might fail due to security / privacy settings
			}
			return result;
		},

		/**
		 * Returns the support settings. In case there are no settings,
		 * the support is disabled.
		 *
		 * @return {string[]} The support settings.
		 * @experimental
		 * @since 1.120.0
		 */
		getSupportSettings() {
			return BaseConfig.get({
				name: "sapUiSupport",
				type: BaseConfig.Type.StringArray,
				defaultValue: null,
				external: true
			});
		},

		/**
		 * Returns the test recorder settings. In case there are no settings,
		 * the test recorder is disabled.
		 *
		 * @return {string[]} The test recorder settings.
		 * @experimental
		 * @since 1.120.0
		 */
		getTestRecorderSettings() {
			return BaseConfig.get({
				name: "sapUiTestRecorder",
				type: BaseConfig.Type.StringArray,
				defaultValue: null,
				external: true
			});
		},

		/**
		 * Returns whether the text origin information is collected.
		 * @return {boolean} whether the text info is collected
		 * @private
		 * @ui5-restricted sap.ui.core, sap.ui.model
		 */
		collectOriginInfo() {
			return BaseConfig.get({
				name: "sapUiOriginInfo",
				type: BaseConfig.Type.Boolean,
				external: true
			});
		}
	};

	return Supportability;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/core/_UrlResolver", [
	"sap/ui/thirdparty/URI"
], function(URI) {
	"use strict";

	/**
	 * Helper module that provides a set of functions to resolve bundle urls.
	 *
	 * @namespace
	 * @alias module:sap/ui/core/_UrlResolver
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	var _UrlResolver = {};

	/**
	 * Function that loops through the model config and resolves the bundle urls
	 * of terminologies relative to the component, the manifest or relative to an URL.
	 *
	 * @example
	 * {
	 *   "oil": {
	 *     "bundleUrl": "i18n/terminologies/oil.i18n.properties"
	 *   },
	 *   "retail": {
	 *     "bundleName": "i18n.terminologies.retail.i18n.properties"
	 *   }
	 * }
	 *
	 * @param {object} mBundleConfig Map with bundle config settings
	 * @param {object} mSettings Map with settings for processing the resource configuration
	 * @param {boolean} [mSettings.alreadyResolvedOnRoot=false] Whether the bundleUrl was already resolved (usually by the sap.ui.core.Component)
	 * @param {URI} mSettings.baseURI The base URI of the Component (usually provided by the sap.ui.core.Component or sap.ui.core.Manifest)
	 * @param {URI} mSettings.manifestBaseURI The base URI of the manifest (usually provided by the sap.ui.core.Component or sap.ui.core.Manifest)
	 * @param {string} [mSettings.relativeTo="component"] Either "component", "manifest" or a "library path" to which the bundleUrl should be resolved
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	_UrlResolver._processResourceConfiguration = function (mBundleConfig, mSettings) {
		mSettings = mSettings || {};

		var bAlreadyResolvedOnRoot = mSettings.alreadyResolvedOnRoot || false;
		var sRelativeTo = mBundleConfig.bundleUrlRelativeTo || mSettings.relativeTo;
		var vRelativeToURI;

		if (sRelativeTo === "manifest") {
			vRelativeToURI = mSettings.manifestBaseURI;
		} else if (sRelativeTo === "component") {
			vRelativeToURI = mSettings.baseURI;
		} else {
			// relative to library path or undefined; default (component base uri)
			vRelativeToURI = sRelativeTo || mSettings.baseURI;
		}

		Object.keys(mBundleConfig).forEach(function(sKey) {
			if (sKey === "bundleUrl" && !bAlreadyResolvedOnRoot) {
				var sBundleUrl = mBundleConfig[sKey];
				var oResolvedUri = _UrlResolver._resolveUri(sBundleUrl, vRelativeToURI);
				mBundleConfig[sKey] = oResolvedUri && oResolvedUri.toString();
			}
			if (sKey === "terminologies") {
				var mTerminologies = mBundleConfig[sKey];
				for (var sTerminology in mTerminologies) {
					_UrlResolver._processResourceConfiguration(mTerminologies[sTerminology], {
						relativeTo: sRelativeTo,
						baseURI: mSettings.baseURI,
						manifestBaseURI: mSettings.manifestBaseURI
					});
				}
			}
			if (sKey === "enhanceWith") {
				var aEnhanceWith = mBundleConfig[sKey] || [];
				for (var i = 0; i < aEnhanceWith.length; i++) {
					_UrlResolver._processResourceConfiguration(aEnhanceWith[i], {
						relativeTo: sRelativeTo,
						baseURI: mSettings.baseURI,
						manifestBaseURI: mSettings.manifestBaseURI
					});
				}
			}
		});
	};

	/**
	 * Makes sure that we can safely deal with URI instances.
	 * See return value.
	 *
	 * @param {URI|string|undefined} v either a URI instance, a string value or undefined
	 * @returns {URI} a URI instance created from the given argument, or the given argument if it is already a URI instance
	 */
	function normalizeToUri(v) {
		if (v && v instanceof URI) {
			return v;
		}
		return new URI(v);
	}

	/**
	 * Resolves the given URI relative to the Component by default,
	 * relative to the manifest when passing 'manifest'
	 * or relative to URL path when passing an URL string as seceond
	 * parameter.
	 *
	 * @param {URI|string} vUri URI to resolve
	 * @param {URI|string} [vRelativeToURI] defines to which base URI the given URI will be resolved to.
	 *                                      Either a string or a URI instance.
	 *                                      Can be a component base URI, a manifest base URI or a library path.
	 * @return {URI} resolved URI
	 * @private
	 */
	_UrlResolver._resolveUri = function (vUri, vRelativeToURI) {
		return _UrlResolver._resolveUriRelativeTo(normalizeToUri(vUri), normalizeToUri(vRelativeToURI));
	};

	/**
	 * Resolves the given URI relative to the given base URI.
	 *
	 * @param {URI} oUri URI to resolve
	 * @param {URI} oBase Base URI
	 * @return {URI} resolved URI
	 * @static
	 * @private
	 */
	_UrlResolver._resolveUriRelativeTo = function(oUri, oBase) {
		if (oUri.is("absolute") || (oUri.path() && oUri.path()[0] === "/")) {
			return oUri;
		}
		var oPageBase = new URI(document.baseURI).search("");
		oBase = oBase.absoluteTo(oPageBase);
		return oUri.absoluteTo(oBase).relativeTo(oPageBase);
	};

	return _UrlResolver;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.date.Buddhist
sap.ui.predefine("sap/ui/core/date/Buddhist", ['./UniversalDate', '../CalendarType', './_Calendars'],
	function(UniversalDate, CalendarType, _Calendars) {
	"use strict";

	/**
	 * The Buddhist date class
	 *
	 * @class
	 * The Buddhist date implements the Thai solar calendar (BE - Buddhist Era). In this calendar
	 * the year is offset by 543 compared to the Gregorian calendar.
	 * e.g. Year 2022 CE corresponds to 2565 BE
	 *
	 *
	 * Before 1941 CE the year start was 1st of April, so Januar to March belong to the previous year.
	 * <pre>
	 * Month | 1-3 | 4-6 | 7-9 | 10-12 | 1-3 | 4-6 | 7-9 | 10-12 | 1-3 | 4-6 | 7-9 | 10-12 | 1-3 | 4-6 | 7-9 | 10-12 |
	 * CE    |       1939              |           1940          |         1941            |          1942           |
	 * BE     2481 |        2482             |      2483         |         2484            |          2485           |
	 * </pre>
	 *
	 * @private
	 * @alias sap.ui.core.date.Buddhist
	 * @extends sap.ui.core.date.UniversalDate
	 */
	var Buddhist = UniversalDate.extend("sap.ui.core.date.Buddhist", /** @lends sap.ui.core.date.Buddhist.prototype */ {
		constructor: function() {
			var aArgs = arguments;
			if (aArgs.length > 1) {
				aArgs = toGregorianArguments(aArgs);
			}
			this.oDate = this.createDate(Date, aArgs);
			this.sCalendarType = CalendarType.Buddhist;
		}
	});

	Buddhist.UTC = function() {
		var aArgs = toGregorianArguments(arguments);
		return Date.UTC.apply(Date, aArgs);
	};

	Buddhist.now = function() {
		return Date.now();
	};

	/**
	 * Find the matching Buddhist date for the given gregorian date
	 *
	 * @param {{year: int, month: int, day: int}} oGregorian Gregorian date
	 * @return {{year: int, month: int, day: int}} the resulting Buddhist date
	 */
	function toBuddhist(oGregorian) {
		var iEraStartYear = UniversalDate.getEraStartDate(CalendarType.Buddhist, 0).year,
			iYear = oGregorian.year - iEraStartYear + 1;
		// Before 1941 new year started on 1st of April
		if (oGregorian.year < 1941 && oGregorian.month < 3) {
			iYear -= 1;
		}
		if (oGregorian.year === null) {
			iYear = undefined;
		}
		return {
			year: iYear,
			month: oGregorian.month,
			day: oGregorian.day
		};
	}

	/**
	 * Calculate gregorian year from Buddhist year and month
	 *
	 * @param {{year: int, month: int, day: int}} oBuddhist Buddhist date
	 * @return {{year: int, month: int, day: int}} the resulting Gregorian date
	 */
	function toGregorian(oBuddhist) {
		var iEraStartYear = UniversalDate.getEraStartDate(CalendarType.Buddhist, 0).year,
			iYear = oBuddhist.year + iEraStartYear - 1;
		// Before 1941 new year started on 1st of April
		if (iYear < 1941 && oBuddhist.month < 3) {
			iYear += 1;
		}
		if (oBuddhist.year === null) {
			iYear = undefined;
		}
		return {
			year: iYear,
			month: oBuddhist.month,
			day: oBuddhist.day
		};
	}

	/**
	 * Convert arguments array from Buddhist date to Gregorian data.
	 *
	 * @param {int[]} aArgs Array with year, month, day (optional) according to Buddhist calendar
	 * @returns {int[]} Array with year, month, day according to Gregorian calendar
	 */
	function toGregorianArguments(aArgs) {
		var oBuddhist, oGregorian;
		oBuddhist = {
			year: aArgs[0],
			month: aArgs[1],
			day: aArgs[2] !== undefined ? aArgs[2] : 1
		};
		oGregorian = toGregorian(oBuddhist);
		aArgs[0] = oGregorian.year;
		return aArgs;
	}

	/**
	 * Get the Buddhist year from this.oDate
	 *
	 * @return {object}
	 */
	Buddhist.prototype._getBuddhist = function() {
		var oGregorian = {
			year: this.oDate.getFullYear(),
			month: this.oDate.getMonth(),
			day: this.oDate.getDate()
		};
		return toBuddhist(oGregorian);
	};

	/**
	 * Set the Buddhist year to this.oDate
	 */
	Buddhist.prototype._setBuddhist = function(oBuddhist) {
		var oGregorian = toGregorian(oBuddhist);
		return this.oDate.setFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
	};

	/**
	 * Get the Buddhist year from this.oDate in UTC
	 *
	 * @return {object}
	 */
	Buddhist.prototype._getUTCBuddhist = function() {
		var oGregorian = {
			year: this.oDate.getUTCFullYear(),
			month: this.oDate.getUTCMonth(),
			day: this.oDate.getUTCDate()
		};
		return toBuddhist(oGregorian);
	};

	/**
	 * Set the Buddhist year to this.oDate in UTC
	 */
	Buddhist.prototype._setUTCBuddhist = function(oBuddhist) {
		var oGregorian = toGregorian(oBuddhist);
		return this.oDate.setUTCFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
	};

	/*
	 * Override relevant getters/setters
	 */
	Buddhist.prototype.getYear = function() {
		return this._getBuddhist().year;
	};
	Buddhist.prototype.getFullYear = function() {
		return this._getBuddhist().year;
	};
	Buddhist.prototype.getUTCFullYear = function() {
		return this._getUTCBuddhist().year;
	};
	Buddhist.prototype.setYear = function(iYear) {
		var oBuddhist = this._getBuddhist();
		oBuddhist.year = iYear;
		return this._setBuddhist(oBuddhist);
	};
	Buddhist.prototype.setFullYear = function(iYear, iMonth, iDay) {
		var oBuddhist = this._getBuddhist();
		oBuddhist.year = iYear;
		if (iMonth !== undefined) {
			oBuddhist.month = iMonth;
		}
		if (iDay !== undefined) {
			oBuddhist.day = iDay;
		}
		return this._setBuddhist(oBuddhist);
	};
	Buddhist.prototype.setUTCFullYear = function(iYear, iMonth, iDay) {
		var oBuddhist = this._getUTCBuddhist();
		oBuddhist.year = iYear;
		if (iMonth !== undefined) {
			oBuddhist.month = iMonth;
		}
		if (iDay !== undefined) {
			oBuddhist.day = iDay;
		}
		return this._setUTCBuddhist(oBuddhist);
	};

	_Calendars.set(CalendarType.Buddhist, Buddhist);

	return Buddhist;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides type sap.ui.core.date.CalendarUtils.
sap.ui.predefine("sap/ui/core/date/CalendarUtils", [
	"sap/base/i18n/Formatting",
	"sap/ui/core/Locale",
	"sap/ui/core/date/CalendarWeekNumbering",
	"sap/ui/core/LocaleData"
], function(Formatting, Locale, CalendarWeekNumbering, LocaleData) {
	"use strict";

	/**
	 * Provides calendar-related utilities.
	 *
	 * @namespace
	 * @alias module:sap/ui/core/date/CalendarUtils
	 * @public
	 * @since 1.108.0
	 */
	var CalendarUtils = {

		/**
		 * Resolves calendar week configuration.
		 *
		 * Returns an object with the following fields:
		 * <ul>
		 *   <li><code>firstDayOfWeek</code>: specifies the first day of the week starting with
		 *   <code>0</code> (which is Sunday)</li>
		 *   <li><code>minimalDaysInFirstWeek</code>: minimal days at the beginning of the year
		 *   which define the first calendar week</li>
		 * </ul>
		 *
		 * @param {sap.ui.core.date.CalendarWeekNumbering} [sCalendarWeekNumbering]
		 *   The calendar week numbering; if omitted, the calendar week numbering of the configuration
		 *   is used; see
		 *   {@link module:sap/base/i18n/Formatting.getCalendarWeekNumbering Formatting.getCalendarWeekNumbering}.
		 *   If this value is <code>Default</code> the returned calendar week configuration is derived from the given
		 *   <code>oLocale</code>.
		 * @param {sap.ui.core.Locale} [oLocale]
		 *   The locale to use; if no locale is given, a locale for the currently configured language is used; see
		 *   {@link module:sap/base/i18n/Formatting.getLanguageTag Formatting.getLanguageTag}.
		 *   Is only used when <code>sCalendarWeekNumbering</code> is set to <code>Default</code>.
		 * @returns {{firstDayOfWeek: int, minimalDaysInFirstWeek: int}|undefined}
		 *   The calendar week configuration, or <code>undefined<code> for an invalid value of
		 *   <code>sap.ui.core.date.CalendarWeekNumbering</code>.
		 * @public
		 * @since 1.108.0
		 */
		getWeekConfigurationValues : function (sCalendarWeekNumbering, oLocale) {
			var oLocaleData, oWeekConfigurationValues;

			if (!sCalendarWeekNumbering) {
				return CalendarUtils.getWeekConfigurationValues(Formatting.getCalendarWeekNumbering(), oLocale);
			}

			oWeekConfigurationValues = CalendarWeekNumbering.getWeekConfigurationValues(sCalendarWeekNumbering);
			if (oWeekConfigurationValues) {
				return oWeekConfigurationValues;
			}
			if (sCalendarWeekNumbering === CalendarWeekNumbering.Default) {
				oLocale = oLocale || new Locale(Formatting.getLanguageTag());
				oLocaleData = LocaleData.getInstance(oLocale);
				return {
					firstDayOfWeek : oLocaleData.getFirstDayOfWeek(),
					minimalDaysInFirstWeek : oLocaleData.getMinimalDaysInFirstWeek()
				};
			}
			return undefined;
		}
	};

	return CalendarUtils;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides type sap.ui.core.date.CalendarWeekNumbering.
sap.ui.predefine("sap/ui/core/date/CalendarWeekNumbering", [
	"sap/ui/base/DataType",
	"sap/base/i18n/date/CalendarWeekNumbering"
], function(
	DataType,
	CalendarWeekNumbering
) {
	"use strict";

	/**
	 * The <code>CalendarWeekNumbering</code> enum defines how to calculate calendar weeks. Each
	 * value defines:
	 * <ul>
	 * <li>The first day of the week,</li>
	 * <li>the first week of the year.</li>
	 * </ul>
	 *
	 * @enum {string}
	 * @public
	 * @since 1.108.0
	 * @deprecated As of Version 1.120. Please use {@link module:sap/base/18n/date/CalendarWeekNumbering} instead.
	 * @name sap.ui.core.date.CalendarWeekNumbering
	 * @borrows module:sap/base/i18n/date/CalendarWeekNumbering.Default as Default
	 * @borrows module:sap/base/i18n/date/CalendarWeekNumbering.ISO_8601 as ISO_8601
	 * @borrows module:sap/base/i18n/date/CalendarWeekNumbering.MiddleEastern as MiddleEastern
	 * @borrows module:sap/base/i18n/date/CalendarWeekNumbering.WesternTraditional as WesternTraditional
	 * @borrows module:sap/base/i18n/date/CalendarWeekNumbering.getWeekConfigurationValues as getWeekConfigurationValues
	 */

	DataType.registerEnum("sap.ui.core.date.CalendarWeekNumbering", CalendarWeekNumbering);

	return CalendarWeekNumbering;
}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.date.Gregorian
sap.ui.predefine("sap/ui/core/date/Gregorian", ['./UniversalDate', '../CalendarType', './_Calendars'],
	function(UniversalDate, CalendarType, _Calendars) {
	"use strict";


	/**
	 * The Gregorian date class
	 *
	 * @class
	 *
	 * @private
	 * @alias sap.ui.core.date.Gregorian
	 * @extends sap.ui.core.date.UniversalDate
	 */
	var Gregorian = UniversalDate.extend("sap.ui.core.date.Gregorian", /** @lends sap.ui.core.date.Gregorian.prototype */ {
		constructor: function() {
			this.oDate = this.createDate(Date, arguments);
			this.sCalendarType = CalendarType.Gregorian;
		}
	});

	Gregorian.UTC = function() {
		return Date.UTC.apply(Date, arguments);
	};

	Gregorian.now = function() {
		return Date.now();
	};

	_Calendars.set(CalendarType.Gregorian, Gregorian);

	return Gregorian;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.date.Islamic
sap.ui.predefine("sap/ui/core/date/Islamic", [
	'./UniversalDate',
	'../CalendarType',
	'sap/base/Log',
	'sap/base/i18n/Formatting',
	'./_Calendars'
], function(UniversalDate, CalendarType, Log, Formatting, _Calendars) {
	"use strict";


	/**
	 * The Islamic date class
	 *
	 * @class
	 * The islamic date does conversion of day, month and year values based on tabular data indicating the start of a month.
	 * In case no tabular data is available for the date, a fallback calculated date will be used.
	 *
	 * @private
	 * @alias sap.ui.core.date.Islamic
	 * @extends sap.ui.core.date.UniversalDate
	 */
	var Islamic = UniversalDate.extend("sap.ui.core.date.Islamic", /** @lends sap.ui.core.date.Islamic.prototype */ {
		constructor: function() {
			var aArgs = arguments;
			if (aArgs.length > 1) {
				aArgs = toGregorianArguments(aArgs);
			}
			this.oDate = this.createDate(Date, aArgs);
			this.sCalendarType = CalendarType.Islamic;
		}
	});

	Islamic.UTC = function() {
		var aArgs = toGregorianArguments(arguments);
		return Date.UTC.apply(Date, aArgs);
	};

	Islamic.now = function() {
		return Date.now();
	};

	var BASE_YEAR = 1400, // used for 2 digits "year" related method
		GREGORIAN_EPOCH_DAYS = 1721425.5, // Julian days since noon on January 1, 4713 BC
		ISLAMIC_EPOCH_DAYS = 1948439.5,   // Julian days since noon on January 1, 4713 BC
		ISLAMIC_MILLIS = -42521587200000, // 7/16/622
		ONE_DAY = 86400000;

	var oCustomizationMap = null;

	// Currently those are the two supported Islamic Calendar types in the ABAP
	var aSupportedIslamicCalendarTypes = ["A", "B"];

	/**
	 * Calculate islamic date from gregorian.
	 *
	 * @param {object} oGregorian A JS object containing day, month and year in the gregorian calendar
	 * @returns {object} The islamic date object created
	 * @private
	 */
	function toIslamic(oGregorian) {
		var iGregorianYear = oGregorian.year,
			iGregorianMonth = oGregorian.month,
			iGregorianDay = oGregorian.day,
			iIslamicYear,
			iIslamicMonth,
			iIslamicDay,
			iMonths,
			iDays,
			iLeapAdj,
			iJulianDay;

		iLeapAdj = 0;
		if ((iGregorianMonth + 1) > 2) {
			iLeapAdj = isGregorianLeapYear(iGregorianYear) ? -1 : -2;
		}
		iJulianDay = (GREGORIAN_EPOCH_DAYS - 1) + (365 * (iGregorianYear - 1)) + Math.floor((iGregorianYear - 1) / 4)
			+ (-Math.floor((iGregorianYear - 1) / 100)) + Math.floor((iGregorianYear - 1) / 400)
			+ Math.floor((((367 * (iGregorianMonth + 1)) - 362) / 12)
			+ iLeapAdj + iGregorianDay);

		iJulianDay = Math.floor(iJulianDay) + 0.5;

		iDays = iJulianDay - ISLAMIC_EPOCH_DAYS;

		iMonths = Math.floor(iDays / 29.530588853); // day/CalendarAstronomer.SYNODIC_MONTH

		if (iMonths < 0) { //negative means Islamic date before the Islamic's calendar start. So we do not apply customization.
			iIslamicYear = Math.floor(iMonths / 12) + 1;
			iIslamicMonth = iMonths % 12;
			if (iIslamicMonth < 0) {
				iIslamicMonth += 12;
			}
			iIslamicDay = iDays - monthStart(iIslamicYear, iIslamicMonth) + 1;
		} else {
			/* Guess the month start.
			 * Always also check the next month, since customization can
			 * differ. It can differ for not more than 3 days. so that
			 * checking the next month is enough.
			 */
			iMonths++;

			/*
			 * Check the true month start for the given month. If it is
			 * later, check the previous month, until a suitable is found.
			 */
			while (getCustomMonthStartDays(iMonths) > iDays) {
				iMonths--;
			}
			iIslamicYear = Math.floor(iMonths / 12) + 1;
			iIslamicMonth = iMonths % 12;
			iIslamicDay = (iDays - getCustomMonthStartDays(12 * (iIslamicYear - 1) + iIslamicMonth)) + 1;
		}

		return {
			day: iIslamicDay,
			month: iIslamicMonth,
			year: iIslamicYear
		};
	}

	/**
	 * Calculate gregorian date from islamic.
	 *
	 * @param {object} oIslamic A JS object containing day, month and year in the islamic calendar
	 * @returns {object} The gregorian date object created
	 * @private
	 */
	function toGregorian(oIslamic) {
		var iIslamicYear = oIslamic.year,
			iIslamicMonth = oIslamic.month,
			iIslamicDate = oIslamic.day,
		/* Islamic Calendar starts from  0001/0/1 (19 July 622 AD), so for any date before it customization is not needed */
			iMonthStart = iIslamicYear < 1 ? monthStart(iIslamicYear, iIslamicMonth) : getCustomMonthStartDays(12 * (iIslamicYear - 1) + iIslamicMonth),
			iJulianDay = iIslamicDate + iMonthStart + ISLAMIC_EPOCH_DAYS - 1,
			iJulianDayNoon = Math.floor(iJulianDay - 0.5) + 0.5,
			iDaysSinceGregorianEpoch = iJulianDayNoon - GREGORIAN_EPOCH_DAYS,
			iQuadricent = Math.floor(iDaysSinceGregorianEpoch / 146097),
			iQuadricentNormalized = mod(iDaysSinceGregorianEpoch, 146097),
			iCent = Math.floor(iQuadricentNormalized / 36524),
			iCentNormalized = mod(iQuadricentNormalized, 36524),
			iQuad = Math.floor(iCentNormalized / 1461),
			iQuadNormalized = mod(iCentNormalized, 1461),
			iYearIndex = Math.floor(iQuadNormalized / 365),
			iYear = (iQuadricent * 400) + (iCent * 100) + (iQuad * 4) + iYearIndex,
			iMonth, iDay,
			iGregorianYearStartDays,
			iDayOfYear,
			tjd, tjd2,
			iLeapAdj, iLeapAdj2;

		if (!(iCent == 4 || iYearIndex == 4)) {
			iYear++;
		}

		iGregorianYearStartDays = GREGORIAN_EPOCH_DAYS + (365 * (iYear - 1)) + Math.floor((iYear - 1) / 4)
			- ( Math.floor((iYear - 1) / 100)) + Math.floor((iYear - 1) / 400);

		iDayOfYear = iJulianDayNoon - iGregorianYearStartDays;

		tjd = (GREGORIAN_EPOCH_DAYS - 1) + (365 * (iYear - 1)) + Math.floor((iYear - 1) / 4)
			- ( Math.floor((iYear - 1) / 100)) + Math.floor((iYear - 1) / 400) + Math.floor((739 / 12)
			+ ( (isGregorianLeapYear(iYear) ? -1 : -2)) + 1);

		iLeapAdj = 0;
		if (iJulianDayNoon < tjd) {
			iLeapAdj = 0;
		} else {
			iLeapAdj = isGregorianLeapYear(iYear) ? 1 : 2;
		}

		iMonth = Math.floor((((iDayOfYear + iLeapAdj) * 12) + 373) / 367);

		tjd2 = (GREGORIAN_EPOCH_DAYS - 1) + (365 * (iYear - 1))
			+ Math.floor((iYear - 1) / 4) - (Math.floor((iYear - 1) / 100))
			+ Math.floor((iYear - 1) / 400);

		iLeapAdj2 = 0;
		if (iMonth > 2) {
			iLeapAdj2 = isGregorianLeapYear(iYear) ? -1 : -2;
		}
		tjd2 += Math.floor((((367 * iMonth) - 362) / 12) + iLeapAdj2 + 1);

		iDay = (iJulianDayNoon - tjd2) + 1;

		return {
			day: iDay,
			month: iMonth - 1,
			year: iYear
		};
	}

	function toGregorianArguments(aArgs) {
		var aGregorianArgs = Array.prototype.slice.call(aArgs),
			oIslamic, oGregorian;
		oIslamic = {
			year: aArgs[0],
			month: aArgs[1],
			day: aArgs[2] !== undefined ? aArgs[2] : 1
		};
		oGregorian = toGregorian(oIslamic);
		aGregorianArgs[0] = oGregorian.year;
		aGregorianArgs[1] = oGregorian.month;
		aGregorianArgs[2] = oGregorian.day;
		return aGregorianArgs;
	}

	function initCustomizationMap() {
		var sDateFormat,
			oCustomizationJSON;

		oCustomizationMap = {};

		sDateFormat = Formatting.getABAPDateFormat();
		sDateFormat = _isSupportedIslamicCalendarType(sDateFormat) ? sDateFormat : "A"; // set "A" as a fall-back format always
		oCustomizationJSON = Formatting.getCustomIslamicCalendarData();
		oCustomizationJSON = oCustomizationJSON || [];


		if (!oCustomizationJSON.length) {
			Log.warning("No calendar customizations.");
			return;
		}

		oCustomizationJSON.forEach(function (oEntry) {
			if (oEntry.dateFormat === sDateFormat) {
				var date = parseDate(oEntry.gregDate);
				// no need to use UI5Date.getInstance as only the UTC timestamp is used
				var iGregorianDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
				var iMillis = iGregorianDate.getTime();
				var iIslamicMonthStartDays = (iMillis - ISLAMIC_MILLIS) / ONE_DAY;

				date = parseDate(oEntry.islamicMonthStart);
				var iIslamicMonths = (date.year - 1) * 12 + date.month - 1;

				oCustomizationMap[iIslamicMonths] = iIslamicMonthStartDays;
			}
		});
		Log.info("Working with date format: [" + sDateFormat + "] and customization: " + JSON.stringify(oCustomizationJSON));
	}

	function parseDate(sDate) {
		return {
			year: parseInt(sDate.substr(0, 4)),
			month: parseInt(sDate.substr(4, 2)),
			day: parseInt(sDate.substr(6, 2))
		};
	}

	function getCustomMonthStartDays(months) {
		if (!oCustomizationMap) {
			initCustomizationMap();
		}
		var iIslamicMonthStartDays = oCustomizationMap[months];
		if (!iIslamicMonthStartDays) {
			var year = Math.floor(months / 12) + 1;
			var month = months % 12;
			iIslamicMonthStartDays = monthStart(year, month);
		}
		return iIslamicMonthStartDays;
	}

	function monthStart(year, month) {
		return Math.ceil(29.5 * month) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30.0);
	}

	function mod(a, b) {
		return a - (b * Math.floor(a / b));
	}

	function isGregorianLeapYear(iYear) {
		return !(iYear % 400) || (!(iYear % 4) && !!(iYear % 100));
	}

	function _isSupportedIslamicCalendarType (sCalendarType) {
		return aSupportedIslamicCalendarTypes.indexOf(sCalendarType) !== -1;
	}

	/**
	 * Get the islamic date from the this.oDate.
	 * @returns {object} The islamic date object created
	 */
	Islamic.prototype._getIslamic = function() {
		return toIslamic({
			day: this.oDate.getDate(),
			month: this.oDate.getMonth(),
			year: this.oDate.getFullYear()
		});
	};

	/**
	 * Set the islamic date to the current this.oDate object.
	 * @param {object} oIslamic A JS object containing day, month and year in the islamic calendar
	 * @returns {number} <code>this</code> to allow method chaining
	 */
	Islamic.prototype._setIslamic = function(oIslamic) {
		var oGregorian = toGregorian(oIslamic);
		return this.oDate.setFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
	};

	/**
	 * Get the islamic date from the this.oDate.
	 * @returns {object} The UTC date object created
	 */
	Islamic.prototype._getUTCIslamic = function() {
		return toIslamic({
			day: this.oDate.getUTCDate(),
			month: this.oDate.getUTCMonth(),
			year: this.oDate.getUTCFullYear()
		});
	};

	/**
	 * Set the islamic date to the current this.oDate object.
	 * @param {object} oIslamic A JS object containing day, month and year in the islamic calendar
	 * @returns {number} <code>this</code> to allow method chaining
	 */
	Islamic.prototype._setUTCIslamic = function(oIslamic) {
		var oGregorian = toGregorian(oIslamic);
		return this.oDate.setUTCFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
	};

	/*
	 * Override setters and getters specific to the islamic date
	 */
	Islamic.prototype.getDate = function(iDate) {
		return this._getIslamic().day;
	};
	Islamic.prototype.getMonth = function() {
		return this._getIslamic().month;
	};
	Islamic.prototype.getYear = function() {
		return this._getIslamic().year - BASE_YEAR;
	};
	Islamic.prototype.getFullYear = function() {
		return this._getIslamic().year;
	};
	Islamic.prototype.setDate = function(iDate) {
		var oIslamic = this._getIslamic();
		oIslamic.day = iDate;
		return this._setIslamic(oIslamic);
	};
	Islamic.prototype.setMonth = function(iMonth, iDay) {
		var oIslamic = this._getIslamic();
		oIslamic.month = iMonth;
		if (iDay !== undefined) {
			oIslamic.day = iDay;
		}
		return this._setIslamic(oIslamic);
	};
	Islamic.prototype.setYear = function(iYear) {
		var oIslamic = this._getIslamic();
		oIslamic.year = iYear + BASE_YEAR;
		return this._setIslamic(oIslamic);
	};
	Islamic.prototype.setFullYear = function(iYear, iMonth, iDay) {
		var oIslamic = this._getIslamic();
		oIslamic.year = iYear;
		if (iMonth !== undefined) {
			oIslamic.month = iMonth;
		}
		if (iDay !== undefined) {
			oIslamic.day = iDay;
		}
		return this._setIslamic(oIslamic);
	};
	Islamic.prototype.getUTCDate = function(iDate) {
		return this._getUTCIslamic().day;
	};
	Islamic.prototype.getUTCMonth = function() {
		return this._getUTCIslamic().month;
	};
	Islamic.prototype.getUTCFullYear = function() {
		return this._getUTCIslamic().year;
	};
	Islamic.prototype.setUTCDate = function(iDate) {
		var oIslamic = this._getUTCIslamic();
		oIslamic.day = iDate;
		return this._setUTCIslamic(oIslamic);
	};
	Islamic.prototype.setUTCMonth = function(iMonth, iDay) {
		var oIslamic = this._getUTCIslamic();
		oIslamic.month = iMonth;
		if (iDay !== undefined) {
			oIslamic.day = iDay;
		}
		return this._setUTCIslamic(oIslamic);
	};
	Islamic.prototype.setUTCFullYear = function(iYear, iMonth, iDay) {
		var oIslamic = this._getUTCIslamic();
		oIslamic.year = iYear;
		if (iMonth !== undefined) {
			oIslamic.month = iMonth;
		}
		if (iDay !== undefined) {
			oIslamic.day = iDay;
		}
		return this._setUTCIslamic(oIslamic);
	};

	_Calendars.set(CalendarType.Islamic, Islamic);

	return Islamic;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.date.Japanese
sap.ui.predefine("sap/ui/core/date/Japanese", ['./UniversalDate', '../CalendarType', './_Calendars'],
	function(UniversalDate, CalendarType, _Calendars) {
	"use strict";


	/**
	 * The Japanese date class
	 *
	 * @class
	 * The Japanese date adds support for era, by returning the CLDR era type in the getEra method and calculating
	 * the year dependent on the current era.
	 *
	 * For the constructor and the UTC method, for the year parameter the following rules apply:
	 * - A year less than 100 will be treated as year of the current emperor era
	 * - A year equal or more than 100 will be treated as a gregorian year
	 * - An array with two entries will be treated as era and emperor year
	 *
	 * @private
	 * @alias sap.ui.core.date.Japanese
	 * @extends sap.ui.core.date.UniversalDate
	 */
	var Japanese = UniversalDate.extend("sap.ui.core.date.Japanese", /** @lends sap.ui.core.date.Japanese.prototype */ {
		constructor: function() {
			var aArgs = arguments;
			if (aArgs.length > 1) {
				aArgs = toGregorianArguments(aArgs);
			}
			this.oDate = this.createDate(Date, aArgs);
			this.sCalendarType = CalendarType.Japanese;
		}
	});

	Japanese.UTC = function() {
		var aArgs = toGregorianArguments(arguments);
		return Date.UTC.apply(Date, aArgs);
	};

	Japanese.now = function() {
		return Date.now();
	};

	/**
	 * Find the matching japanese date for the given gregorian date
	 *
	 * @param {object} oGregorian
	 * @return {object}
	 */
	function toJapanese(oGregorian) {
		var iEra = UniversalDate.getEraByDate(CalendarType.Japanese, oGregorian.year, oGregorian.month, oGregorian.day),
			iEraStartYear = UniversalDate.getEraStartDate(CalendarType.Japanese, iEra).year;
		return {
			era: iEra,
			year: oGregorian.year - iEraStartYear + 1,
			month: oGregorian.month,
			day: oGregorian.day
		};
	}

	/**
	 * Calculate Gregorian year from Japanese era and year
	 *
	 * @param {object} oJapanese
	 * @return {int}
	 */
	function toGregorian(oJapanese) {
		var iEraStartYear = UniversalDate.getEraStartDate(CalendarType.Japanese, oJapanese.era).year;
		return {
			year: iEraStartYear + oJapanese.year - 1,
			month: oJapanese.month,
			day: oJapanese.day
		};
	}

	/**
	 * Convert arguments array from Japanese date to Gregorian data.
	 *
	 * @param {int[]|any[]} aArgs Array with year (or [era, year]), month and day (optional) according to Japanese calendar
	 * @returns {int[]} Array with year, month and day according to the Gregorian calendar
	 */
	function toGregorianArguments(aArgs) {
		var oJapanese, oGregorian,
			iEra,
			vYear = aArgs[0];
		if (typeof vYear == "number") {
			if (vYear >= 100) {
				// Year greater than 100 will be treated as gregorian year
				return aArgs;
			} else {
				// Year less than 100 is emperor year in the current era
				iEra = UniversalDate.getCurrentEra(CalendarType.Japanese);
				vYear = [iEra, vYear];
			}
		} else if (!Array.isArray(vYear)) {
			// Invalid year
			vYear = [];
		}

		oJapanese = {
			era: vYear[0],
			year: vYear[1],
			month: aArgs[1],
			day: aArgs[2] !== undefined ? aArgs[2] : 1
		};
		oGregorian = toGregorian(oJapanese);
		aArgs[0] = oGregorian.year;
		return aArgs;
	}

	/**
	 * Get the japanese era/year from this.oDate
	 *
	 * @return {object}
	 */
	Japanese.prototype._getJapanese = function() {
		var oGregorian = {
			year: this.oDate.getFullYear(),
			month: this.oDate.getMonth(),
			day: this.oDate.getDate()
		};
		return toJapanese(oGregorian);
	};

	/**
	 * Set the japanese era/year to this.oDate
	 */
	Japanese.prototype._setJapanese = function(oJapanese) {
		var oGregorian = toGregorian(oJapanese);
		return this.oDate.setFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
	};

	/**
	 * Get the japanese era/year from this.oDate in UTC
	 *
	 * @return {object}
	 */
	Japanese.prototype._getUTCJapanese = function() {
		var oGregorian = {
			year: this.oDate.getUTCFullYear(),
			month: this.oDate.getUTCMonth(),
			day: this.oDate.getUTCDate()
		};
		return toJapanese(oGregorian);
	};

	/**
	 * Set the japanese era/year to this.oDate in UTC
	 */
	Japanese.prototype._setUTCJapanese = function(oJapanese) {
		var oGregorian = toGregorian(oJapanese);
		return this.oDate.setUTCFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
	};

	/*
	 * Override relevant getters/setters
	 */
	Japanese.prototype.getYear = function() {
		return this._getJapanese().year;
	};
	Japanese.prototype.getFullYear = function() {
		return this._getJapanese().year;
	};
	Japanese.prototype.getEra = function() {
		return this._getJapanese().era;
	};
	Japanese.prototype.getUTCFullYear = function() {
		return this._getUTCJapanese().year;
	};
	Japanese.prototype.getUTCEra = function() {
		return this._getUTCJapanese().era;
	};
	Japanese.prototype.setYear = function(iYear) {
		var oJapanese = this._getJapanese();
		oJapanese.year = iYear;
		return this._setJapanese(oJapanese);
	};
	Japanese.prototype.setFullYear = function(iYear, iMonth, iDay) {
		var oJapanese = this._getJapanese();
		oJapanese.year = iYear;
		if (iMonth !== undefined) {
			oJapanese.month = iMonth;
		}
		if (iDay !== undefined) {
			oJapanese.day = iDay;
		}
		return this._setJapanese(oJapanese);
	};
	Japanese.prototype.setEra = function(iEra, iYear, iMonth, iDay) {
		var oEraStartDate = UniversalDate.getEraStartDate(CalendarType.Japanese, iEra),
			oJapanese = toJapanese(oEraStartDate);
		if (iYear !== undefined) {
			oJapanese.year = iYear;
		}
		if (iMonth !== undefined) {
			oJapanese.month = iMonth;
		}
		if (iDay !== undefined) {
			oJapanese.day = iDay;
		}
		return this._setJapanese(oJapanese);
	};
	Japanese.prototype.setUTCFullYear = function(iYear, iMonth, iDay) {
		var oJapanese = this._getUTCJapanese();
		oJapanese.year = iYear;
		if (iMonth !== undefined) {
			oJapanese.month = iMonth;
		}
		if (iDay !== undefined) {
			oJapanese.day = iDay;
		}
		return this._setUTCJapanese(oJapanese);
	};
	Japanese.prototype.setUTCEra = function(iEra, iYear, iMonth, iDay) {
		var oEraStartDate = UniversalDate.getEraStartDate(CalendarType.Japanese, iEra),
			oJapanese = toJapanese(oEraStartDate);
		if (iYear !== undefined) {
			oJapanese.year = iYear;
		}
		if (iMonth !== undefined) {
			oJapanese.month = iMonth;
		}
		if (iDay !== undefined) {
			oJapanese.day = iDay;
		}
		return this._setUTCJapanese(oJapanese);
	};

	/**
	 * Note: The resulting year is the Gregorian year
	 *
	 * @override
	 * @see sap.ui.core.date.UniversalDate#getWeek
	 */
	Japanese.prototype.getWeek = function(oLocale, vCalendarWeekNumbering) {
		// Use the Gregorian year (from this.oDate), because the Japanese emperor year lacks the
		// information of the era which makes the year not unique.
		// Using the Gregorian year is valid, because Japanese#constructor is able to calculate the
		// era and Japanese emperor year from the Gregorian year.
		return UniversalDate.getWeekByDate(this.sCalendarType, this.oDate.getFullYear(),
			this.getMonth(), this.getDate(), oLocale, vCalendarWeekNumbering);
	};

	/**
	 * Note: The resulting year is the Gregorian year
	 *
	 * @override
	 * @see sap.ui.core.date.UniversalDate#getUTCWeek
	 */
	Japanese.prototype.getUTCWeek = function(oLocale, vCalendarWeekNumbering) {
		// Use the Gregorian year (from this.oDate), because the Japanese emperor year lacks the
		// information of the era which makes the year not unique.
		// Using the Gregorian year is valid, because Japanese#constructor is able to calculate the
		// era and Japanese emperor year from the Gregorian year.
		return UniversalDate.getWeekByDate(this.sCalendarType, this.oDate.getUTCFullYear(),
			this.getUTCMonth(), this.getUTCDate(), oLocale, vCalendarWeekNumbering);
	};

	_Calendars.set(CalendarType.Japanese, Japanese);

	return Japanese;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.date.Persian
sap.ui.predefine("sap/ui/core/date/Persian", ['./UniversalDate', '../CalendarType', './_Calendars'],
	function(UniversalDate, CalendarType, _Calendars) {
	"use strict";


	/**
	 * The Persian date class
	 *
	 * @class
	 * The Persian date does conversion of day, month and year values based on the vernal equinox.
	 * Calculation taken from jalaali-js.
	 *
	 * @private
	 * @alias sap.ui.core.date.Persian
	 * @extends sap.ui.core.date.UniversalDate
	 */
	var Persian = UniversalDate.extend("sap.ui.core.date.Persian", /** @lends sap.ui.core.date.Persian.prototype */ {
		constructor: function() {
			var aArgs = arguments;
			if (aArgs.length > 1) {
				aArgs = toGregorianArguments(aArgs);
			}
			this.oDate = this.createDate(Date, aArgs);
			this.sCalendarType = CalendarType.Persian;
		}
	});

	Persian.UTC = function() {
		var aArgs = toGregorianArguments(arguments);
		return Date.UTC.apply(Date, aArgs);
	};

	Persian.now = function() {
		return Date.now();
	};

	var BASE_YEAR = 1300;

	/**
	 * Calculate Persian date from gregorian
	 *
	 * @param {object} oGregorian a JS object containing day, month and year in the gregorian calendar
	 * @private
	 */
	function toPersian(oGregorian) {
		var iJulianDayNumber = g2d(oGregorian.year, oGregorian.month + 1, oGregorian.day);
		return d2j(iJulianDayNumber);
	}

	/**
	 * Calculate gregorian date from Persian
	 *
	 * @param {object} oPersian a JS object containing day, month and year in the Persian calendar
	 * @private
	 */
	function toGregorian(oPersian) {
		var iJulianDayNumber = j2d(oPersian.year, oPersian.month + 1, oPersian.day);
		return d2g(iJulianDayNumber);
	}

	function toGregorianArguments(aArgs) {
		var aGregorianArgs = Array.prototype.slice.call(aArgs),
			oPersian, oGregorian;
		// Validate arguments
		if (typeof aArgs[0] !== "number" || typeof aArgs[1] !== "number" || (aArgs[2] !== undefined && typeof aArgs[2] != "number")) {
			aGregorianArgs[0] = NaN;
			aGregorianArgs[1] = NaN;
			aGregorianArgs[2] = NaN;
			return aGregorianArgs;
		}
		oPersian = {
			year: aArgs[0],
			month: aArgs[1],
			day: aArgs[2] !== undefined ? aArgs[2] : 1
		};
		oGregorian = toGregorian(oPersian);
		aGregorianArgs[0] = oGregorian.year;
		aGregorianArgs[1] = oGregorian.month;
		aGregorianArgs[2] = oGregorian.day;
		return aGregorianArgs;
	}

	/*
		This function determines if the Jalaali (Persian) year is
		leap (366-day long) or is the common year (365 days), and
		finds the day in March (Gregorian calendar) of the first
		day of the Jalaali year (jy).
		@param jy Jalaali calendar year (-61 to 3177)
		@return
			leap: number of years since the last leap year (0 to 4)
			gy: Gregorian year of the beginning of Jalaali year
			march: the March day of Farvardin the 1st (1st day of jy)
		@see: http://www.astro.uni.torun.pl/~kb/Papers/EMP/PersianC-EMP.htm
		@see: http://www.fourmilab.ch/documents/calendar/
	*/
	function jalCal(jy) {
		// Jalaali years starting the 33-year rule.
		var breaks = [ -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178],
			bl = breaks.length,
			gy = jy + 621,
			leapJ = -14,
			jp = breaks[0],
			jm, jump, leap, leapG, march, n, i;

		// Find the limiting years for the Jalaali year jy.
		for (i = 1; i < bl; i += 1) {
			jm = breaks[i];
			jump = jm - jp;
			if (jy < jm) {
				break;
			}
			leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
			jp = jm;
		}
		n = jy - jp;

		// Find the number of leap years from AD 621 to the beginning
		// of the current Jalaali year in the Persian calendar.
		leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
		if (mod(jump, 33) === 4 && jump - n === 4) {
			leapJ += 1;
		}

		// And the same in the Gregorian calendar (until the year gy).
		leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;

		// Determine the Gregorian date of Farvardin the 1st.
		march = 20 + leapJ - leapG;

		// Find how many years have passed since the last leap year.
		if (jump - n < 6) {
			n = n - jump + div(jump + 4, 33) * 33;
		}
		leap = mod(mod(n + 1, 33) - 1, 4);
		if (leap === -1) {
			leap = 4;
		}

		return {
			leap: leap,
			gy: gy,
			march: march
		};
	}

	/*
		Converts a date of the Jalaali calendar to the Julian Day number.
		@param jy Jalaali year (1 to 3100)
		@param jm Jalaali month (1 to 12)
		@param jd Jalaali day (1 to 29/31)
		@return Julian Day number
	*/
	function j2d(jy, jm, jd) {
		// Correct month overflow/underflow for correct day calculation
		while (jm < 1) {
			jm += 12;
			jy--;
		}
		while (jm > 12) {
			jm -= 12;
			jy++;
		}
		var r = jalCal(jy);
		return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
	}

	/*
		Converts the Julian Day number to a date in the Jalaali calendar.
		@param jdn Julian Day number
		@return
			jy: Jalaali year (1 to 3100)
			jm: Jalaali month (1 to 12)
			jd: Jalaali day (1 to 29/31)
	*/
	function d2j(jdn) {
		var gy = d2g(jdn).year,
			jy = gy - 621,
			r = jalCal(jy),
			jdn1f = g2d(gy, 3, r.march),
			jd, jm, k;

		// Find number of days that passed since 1 Farvardin.
		k = jdn - jdn1f;
		if (k >= 0) {
			if (k <= 185) {
				// The first 6 months.
				jm = 1 + div(k, 31);
				jd = mod(k, 31) + 1;
				return {
					year: jy,
					month: jm - 1,
					day: jd
				};
			} else {
				// The remaining months.
				k -= 186;
			}
		} else {
			// Previous Jalaali year.
			jy -= 1;
			k += 179;
			if (r.leap === 1) {
				k += 1;
			}
		}
		jm = 7 + div(k, 30);
		jd = mod(k, 30) + 1;
		return {
			year: jy,
			month: jm - 1,
			day: jd
		};
	}

	/*
		Calculates the Julian Day number from Gregorian or Julian
		calendar dates. This integer number corresponds to the noon of
		the date (i.e. 12 hours of Universal Time).
		The procedure was tested to be good since 1 March, -100100 (of both
		calendars) up to a few million years into the future.
		@param gy Calendar year (years BC numbered 0, -1, -2, ...)
		@param gm Calendar month (1 to 12)
		@param gd Calendar day of the month (1 to 28/29/30/31)
		@return Julian Day number
	*/
	function g2d(gy, gm, gd) {
		var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
				+ div(153 * mod(gm + 9, 12) + 2, 5)
				+ gd - 34840408;
		d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
		return d;
	}

	/*
		Calculates Gregorian and Julian calendar dates from the Julian Day number
		(jdn) for the period since jdn=-34839655 (i.e. the year -100100 of both
		calendars) to some millions years ahead of the present.
		@param jdn Julian Day number
		@return
			gy: Calendar year (years BC numbered 0, -1, -2, ...)
			gm: Calendar month (1 to 12)
			gd: Calendar day of the month M (1 to 28/29/30/31)
	*/
	function d2g(jdn) {
		var j, i, gd, gm, gy;
		j = 4 * jdn + 139361631;
		j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
		i = div(mod(j, 1461), 4) * 5 + 308;
		gd = div(mod(i, 153), 5) + 1;
		gm = mod(div(i, 153), 12) + 1;
		gy = div(j, 1461) - 100100 + div(8 - gm, 6);
		return	{
			year: gy,
			month: gm - 1,
			day: gd
		};
	}

	/*
		Utility helper functions.
	*/

	function div(a, b) {
		return ~~(a / b);
	}

	function mod(a, b) {
		return a - ~~(a / b) * b;
	}

	/**
	 * Get the Persian date from the this.oDate
	 */
	Persian.prototype._getPersian = function() {
		return toPersian({
			day: this.oDate.getDate(),
			month: this.oDate.getMonth(),
			year: this.oDate.getFullYear()
		});
	};

	/**
	 * Set the Persian date to the current this.oDate object
	 * @param {object} oPersian a JS object containing day, month and year in the Persian calendar
	 */
	Persian.prototype._setPersian = function(oPersian) {
		var oGregorian = toGregorian(oPersian);
		return this.oDate.setFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
	};

	/**
	 * Get the Persian date from the this.oDate
	 */
	Persian.prototype._getUTCPersian = function() {
		return toPersian({
			day: this.oDate.getUTCDate(),
			month: this.oDate.getUTCMonth(),
			year: this.oDate.getUTCFullYear()
		});
	};

	/**
	 * Set the Persian date to the current this.oDate object
	 * @param {object} oPersian a JS object containing day, month and year in the Persian calendar
	 */
	Persian.prototype._setUTCPersian = function(oPersian) {
		var oGregorian = toGregorian(oPersian);
		return this.oDate.setUTCFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
	};

	/*
	 * Override setters and getters specific to the Persian date
	 */
	Persian.prototype.getDate = function(iDate) {
		return this._getPersian().day;
	};
	Persian.prototype.getMonth = function() {
		return this._getPersian().month;
	};
	Persian.prototype.getYear = function() {
		return this._getPersian().year - BASE_YEAR;
	};
	Persian.prototype.getFullYear = function() {
		return this._getPersian().year;
	};
	Persian.prototype.setDate = function(iDate) {
		var oPersian = this._getPersian();
		oPersian.day = iDate;
		return this._setPersian(oPersian);
	};
	Persian.prototype.setMonth = function(iMonth, iDay) {
		var oPersian = this._getPersian();
		oPersian.month = iMonth;
		if (iDay !== undefined) {
			oPersian.day = iDay;
		}
		return this._setPersian(oPersian);
	};
	Persian.prototype.setYear = function(iYear) {
		var oPersian = this._getPersian();
		oPersian.year = iYear + BASE_YEAR;
		return this._setPersian(oPersian);
	};
	Persian.prototype.setFullYear = function(iYear, iMonth, iDay) {
		var oPersian = this._getPersian();
		oPersian.year = iYear;
		if (iMonth !== undefined) {
			oPersian.month = iMonth;
		}
		if (iDay !== undefined) {
			oPersian.day = iDay;
		}
		return this._setPersian(oPersian);
	};
	Persian.prototype.getUTCDate = function(iDate) {
		return this._getUTCPersian().day;
	};
	Persian.prototype.getUTCMonth = function() {
		return this._getUTCPersian().month;
	};
	Persian.prototype.getUTCFullYear = function() {
		return this._getUTCPersian().year;
	};
	Persian.prototype.setUTCDate = function(iDate) {
		var oPersian = this._getUTCPersian();
		oPersian.day = iDate;
		return this._setUTCPersian(oPersian);
	};
	Persian.prototype.setUTCMonth = function(iMonth, iDay) {
		var oPersian = this._getUTCPersian();
		oPersian.month = iMonth;
		if (iDay !== undefined) {
			oPersian.day = iDay;
		}
		return this._setUTCPersian(oPersian);
	};
	Persian.prototype.setUTCFullYear = function(iYear, iMonth, iDay) {
		var oPersian = this._getUTCPersian();
		oPersian.year = iYear;
		if (iMonth !== undefined) {
			oPersian.month = iMonth;
		}
		if (iDay !== undefined) {
			oPersian.day = iDay;
		}
		return this._setUTCPersian(oPersian);
	};

	_Calendars.set(CalendarType.Persian, Persian);

	return Persian;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/core/date/UI5Date", [
	"sap/base/Log",
	"sap/base/i18n/Localization",
	"sap/base/i18n/date/TimezoneUtils"
], function (Log, Localization, TimezoneUtils) {
	"use strict";

	var aAllParts = ["year", "month", "day", "hour", "minute", "second", "fractionalSecond"],
		// "2023", "2023-01", "2023-01-20", "+002023-01-20" are parsed by JavaScript Date as UTC
		// timestamps, whereas "798", "2023-1", "2023-01-5" are parsed as local dates.
		// If "Z", "GMT" or a time zone offset (e.g. 00:00+0530) is included in the input string,
		// the string is parsed as a UTC related timestamp
		rIsUTCString = /Z|GMT|:.*[\+|\-]|^([\+|\-]\d{2})?\d{4}(-\d{2}){0,2}$/,
		aWeekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
		aMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
		mWeekdayToDay = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};
	// Regular expression for local date string parts around the switch to Daylight Saving Time; the date part has to
	// exist, time part parts may be optional; e.g. "2023-03-31T02:00" or "2023-3-31 2:00"
	const rLocalDate =
			/^(\d{1,4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2})(?::(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?)?$/;

	/**
	 * Pads the start of the absolute given value with zeros up to the given length. If the given
	 * value is negative the leading minus is added in front of the zeros.
	 *
	 * @param {int} iValue The value to be padded
	 * @param {int} iLength The minimal length of the resulting string excluding the minus sign
	 * @returns {string} The padded string
	 */
	function addLeadingZeros(iValue, iLength) {
		return (iValue < 0 ? "-" : "") + Math.abs(iValue).toString().padStart(iLength, "0");
	}

	// eslint-disable-next-line valid-jsdoc
	/**
	 * DO NOT call the constructor for UI5Date directly; use <code>UI5Date.getInstance</code>.
	 *
	 * @param {object} vDateParts
	 *   An array like object containing the arguments as passed to
	 *   <code>UI5Date.getInstance</code>
	 * @param {string} sTimezoneID
	 *   The time zone ID to use for local methods of <code>Date</code>
	 *
	 * @alias module:sap/ui/core/date/UI5Date
	 * @author SAP SE
	 * @extends Date
	 * @class A date implementation considering the configured time zone
	 *
	 *   A subclass of JavaScript <code>Date</code> that considers the configured time zone, see
	 *   {@link module:sap/base/i18n/Localization.getTimezone Localization.getTimezone}. All JavaScript
	 *   <code>Date</code> functions that use the local browser time zone, like <code>getDate</code>,
	 *   <code>setDate</code>, and <code>toString</code>, are overwritten and use the
	 *   configured time zone to compute the values.
	 *
	 *   Use {@link module:sap/ui/core/date/UI5Date.getInstance} to create new date instances.
	 *
	 *   <b>Note:</b> Adjusting the time zone in a running application can lead to unexpected data
	 *   inconsistencies. For more information, see
	 *   {@link module:sap/base/i18n/Localization.setTimezone Localization.setTimezone}.
	 *
	 * @hideconstructor
	 * @public
	 * @since 1.111.0
	 * @version 1.125.0
	 */
	function UI5Date(vDateParts, sTimezoneID) {
		var oDateInstance = UI5Date._createDateInstance(vDateParts);
		// mark internal properties not enumerable -> deepEqual handles this as a Date instance
		Object.defineProperties(this, {
			sTimezoneID: {value: sTimezoneID},
			oDate: {value: oDateInstance, writable: true},
			oDateParts: {value: undefined, writable: true}
		});

		if (isNaN(oDateInstance)) {
			return;
		}

		if (vDateParts.length > 1
				|| vDateParts.length === 1 && typeof vDateParts[0] === "string"
					&& !rIsUTCString.test(vDateParts[0])) {
			// JavaScript Date parsed the arguments already in local browser time zone
			const aLocalDateParts = [oDateInstance.getFullYear(), oDateInstance.getMonth(), oDateInstance.getDate(),
				oDateInstance.getHours(), oDateInstance.getMinutes(), oDateInstance.getSeconds(),
				oDateInstance.getMilliseconds()];
			// If the given local timestamp does not exist in the current browser time zone (switch to Daylight Saving
			// Time) the values in aLocalDateParts don't match the input and have to be corrected
			const iLocalTimezoneOffset = oDateInstance.getTimezoneOffset();
			// the maximum time shift is 2 hours, so check whether 2 hours ago is in another time zone
			const iTimezoneOffset2hAgo = new Date(oDateInstance.getTime() - 7200000).getTimezoneOffset();
			// only the switch to the Daylight Saving Time needs to be fixed (e.g. from GMT+1 with the offset -60 to
			// GMT+2 with the offset -120, or from GMT-5 with the offset 300 to GMT-4 with the offset 240);
			// in the other case aLocalDateParts contain already the expected date/time parts
			if (iLocalTimezoneOffset < iTimezoneOffset2hAgo) {
				// year, seconds and milliseconds don't change when switching to Daylight Saving Time; update the other
				// parts
				if (vDateParts.length > 1) {
					// timestamp near switch to Daylight Saving Time -> take the original values for month, day, hours,
					// minutes (other parts are not modified by Daylight Saving Time switch)
					aLocalDateParts[1] = vDateParts[1] || 0;
					aLocalDateParts[2] = vDateParts[2] !== undefined ? vDateParts[2] : 1;
					aLocalDateParts[3] = vDateParts[3] !== undefined ? vDateParts[3] : 0;
					aLocalDateParts[4] = vDateParts[4] !== undefined ? vDateParts[4] : 0;
				} else { // vDateParts.length === 1
					// string based local input near the switch to Daylight Saving Time can only be handled in the ISO
					// format
					const aDateParts = rLocalDate.exec(vDateParts[0]);
					if (aDateParts) {
						aLocalDateParts[1] = +aDateParts[2] - 1; // use + operator to get the value as used by Date
						aLocalDateParts[2] = aDateParts[3];
						aLocalDateParts[3] = aDateParts[4] !== undefined ? aDateParts[4] : 0;
						aLocalDateParts[4] = aDateParts[5] !== undefined ? aDateParts[5] : 0;
					} else {
						// other string based local input near the switch to Daylight Saving Time cannot be handled
						// without re-implementing parse logic of JavaScript Date -> recommend to use the constructor
						// with more than 1 argument or to use the ISO format
						Log.warning("UI5Date for '" + vDateParts[0] + "' cannot be ensured to be correct as it is near"
							+ " the change from standard time to daylight saving time in the current browser locale;"
							+ " use the constructor with more than 1 arguments or use the ISO format instead",
							oDateInstance, "sap.ui.core.date.UI5Date");
					}

				}
			}
			this._setParts(aAllParts, aLocalDateParts);
		}
	}

	UI5Date.prototype = Object.create(Date.prototype, {
		constructor: {
			value: Date
		}
	});
	// QUnit uses Object.prototype.toString.call and expects "[object Date]" for dates; UI5Date
	// shall be treated as a JavaScript Date so Symbol.toStringTag has to be "Date"
	UI5Date.prototype[Symbol.toStringTag] = "Date";

	/**
	 * Returns the value for the requested date part (e.g. "month", "year", "hour") of this date
	 * according to the configured time zone.
	 *
	 * @param {string} sPart The date part name
	 * @returns {int} The value of the date part
	 *
	 * @private
	 */
	UI5Date.prototype._getPart = function (sPart) {
		var iResult;

		if (isNaN(this.oDate)) {
			return NaN;
		}

		this.oDateParts = this.oDateParts || TimezoneUtils._getParts(this.oDate, this.sTimezoneID);
		if (sPart === "weekday") {
			return mWeekdayToDay[this.oDateParts.weekday];
		}

		iResult = parseInt(this.oDateParts[sPart]);
		if (sPart === "month") {
			iResult -= 1;
		} else if (sPart === "year") {
			if (this.oDateParts.era === "B") {
				iResult = 1 - iResult;
			}
		}

		return iResult;
	};

	/**
	 * Updates this date instance by setting the given parts in the configured time zone.
	 *
	 * @param {string[]} aParts
	 *   The names of the date parts to be updated, supported names are: "year", "month", "day",
	 *   "hour", "minute", "second", "fractionalSecond"
	 * @param {object} aValues
	 *   The arguments object of the local setters
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be created
	 *
	 * @private
	 */
	UI5Date.prototype._setParts = function (aParts, aValues) {
		var i, oCurrentDateParts, oNewDateAsUTCTimestamp, iNewTimestamp, sPart, vValue,
			oDateParts = {},
			iMaxLength = Math.min(aParts.length, aValues.length);

		if (iMaxLength === 0) {
			return this.setTime(NaN);
		}

		for (i = 0; i < iMaxLength; i += 1) {
			// convert the value to number as JavaScript Date does it;
			// +"" -> 0, +null -> 0, +undefined -> NaN, +"foo" -> NaN, +"4" -> 4
			vValue = parseInt(+aValues[i]);
			sPart = aParts[i];
			if (isNaN(vValue)) {
				return this.setTime(NaN);
			}

			if (sPart === "month") {
				vValue += 1;
			} else if (sPart === "year") {
				if (vValue <= 0) {
					vValue = 1 - vValue;
					oDateParts.era = "B";
				} else {
					oDateParts.era = "A";
				}
			}
			oDateParts[sPart] = vValue.toString();
		}
		if (this.oDateParts) {
			oCurrentDateParts = this.oDateParts;
		} else if (isNaN(this.oDate)) {
			//era and year are given at least
			oCurrentDateParts = {day: "1", fractionalSecond: "0", hour: "0", minute: "0",
				month: "1", second: "0"};
		} else {
			oCurrentDateParts = TimezoneUtils._getParts(this.oDate, this.sTimezoneID);
		}
		oDateParts = Object.assign({}, oCurrentDateParts, oDateParts);

		// NaN may happen if no year is given if current date is invalid
		oNewDateAsUTCTimestamp = TimezoneUtils._getDateFromParts(oDateParts);
		if (isNaN(oNewDateAsUTCTimestamp)) {
			return this.setTime(NaN);
		}

		iNewTimestamp = oNewDateAsUTCTimestamp.getTime()
			+ TimezoneUtils.calculateOffset(oNewDateAsUTCTimestamp, this.sTimezoneID) * 1000;
		return this.setTime(iNewTimestamp);
	};

	/**
	 * Clones this UI5Date instance.
	 *
	 * @returns {Date|module:sap/ui/core/date/UI5Date} The cloned date instance
	 *
	 * @private
	 */
	UI5Date.prototype.clone = function () {
		return UI5Date.getInstance(this);
	};

	/**
	 * Returns the day of the month of this date instance according to the configured time zone,
	 * see <code>Date.prototype.getDate</code>.
	 *
	 * @returns {int}
	 *   A number between 1 and 31 representing the day of the month of this date instance according
	 *   to the configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.getDate = function () {
		return this._getPart("day");
	};

	/**
	 * Returns the day of the week of this date instance according to the configured time zone,
	 * see <code>Date.prototype.getDay</code>.
	 *
	 * @returns {int}
	 *   A number between 0 (Sunday) and 6 (Saturday) representing the day of the week of this date
	 *   instance according to the configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.getDay = function () {
		return this._getPart("weekday");
	};

	/**
	 * Returns the year of this date instance according to the configured time zone,
	 * see <code>Date.prototype.getFullYear</code>.
	 *
	 * @returns {int} The year of this date instance according to the configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.getFullYear = function () {
		return this._getPart("year");
	};

	/**
	 * Returns the hours of this date instance according to the configured time zone, see
	 * <code>Date.prototype.getHours</code>.
	 *
	 * @returns {int}
	 *   A number between 0 and 23 representing the hours of this date instance according to the
	 *   configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.getHours = function () {
		return this._getPart("hour");
	};

	/**
	 * Returns the milliseconds of this date instance according to the configured time zone,
	 * see <code>Date.prototype.getMilliseconds</code>.
	 *
	 * @returns {int}
	 *   A number between 0 and 999 representing the milliseconds of this date instance according to
	 *   the configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.getMilliseconds = function () {
		return this._getPart("fractionalSecond");
	};

	/**
	 * Returns the minutes of this date instance according to the configured time zone,
	 * see <code>Date.prototype.getMinutes</code>.
	 *
	 * @returns {int}
	 *   A number between 0 and 59 representing the minutes of this date instance according to the
	 *   configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.getMinutes = function () {
		return this._getPart("minute");
	};

	/**
	 * Returns the month index of this date instance according to the configured time zone,
	 * see <code>Date.prototype.getMonth</code>.
	 *
	 * @returns {int}
	 *   The month index between 0 (January) and 11 (December) of this date instance according to
	 *   the configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.getMonth = function () {
		return this._getPart("month");
	};

	/**
	 * Returns the seconds of this date instance according to the configured time zone,
	 * see <code>Date.prototype.getSeconds</code>.
	 *
	 * @returns {int}
	 *   A number between 0 and 59 representing the seconds of this date instance according to the
	 *   configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.getSeconds = function () {
		return this._getPart("second");
	};

	/**
	 * Returns the difference in minutes between the UTC and the configured time zone for this date,
	 * see <code>Date.prototype.getTimezoneOffset</code>.
	 *
	 * @returns {int}
	 *   The difference in minutes between the UTC and the configured time zone for this date
	 *
	 * @public
	 */
	UI5Date.prototype.getTimezoneOffset = function () {
		return TimezoneUtils.calculateOffset(this.oDate, this.sTimezoneID) / 60;
	};

	/**
	 * Returns the year of this date instance minus 1900 according to the configured time zone,
	 * see <code>Date.prototype.getYear</code>.
	 *
	 * @returns {int}
	 *   The year of this date instance minus 1900 according to the configured time zone
	 *
	 * @deprecated As of version 1.111 as it is deprecated in the base class JavaScript Date; use
	 *   {@link #getFullYear} instead
	 * @public
	 */
	UI5Date.prototype.getYear = function () {
		return this._getPart("year") - 1900;
	};

	/**
	 * Sets the day of the month for this date instance considering the configured time zone,
	 * see <code>Date.prototype.setDate</code>.
	 *
	 * @param {int} iDay
	 *   An integer representing the new day value, see <code>Date.prototype.setDate</code>
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @public
	 */
	UI5Date.prototype.setDate = function (iDay) {
		return this._setParts(["day"], arguments);
	};

	/**
	 * Sets the year, month and day for this date instance considering the configured time zone,
	 * see <code>Date.prototype.setFullYear</code>.
	 *
	 * @param {int} iYear An integer representing the new year value
	 * @param {int} [iMonth] An integer representing the new month index
	 * @param {int} [iDay] An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @public
	 */
	UI5Date.prototype.setFullYear = function (iYear, iMonth, iDay) {
		return this._setParts(["year", "month", "day"], arguments);
	};

	/**
	 * Sets the hours, minutes, seconds and milliseconds for this date instance considering the
	 * configured time zone, see <code>Date.prototype.setHours</code>.
	 *
	 * @param {int} iHours An integer representing the new hour value
	 * @param {int} [iMinutes] An integer representing the new minutes value
	 * @param {int} [iSeconds] An integer representing the new seconds value
	 * @param {int} [iMilliseconds] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @public
	 */
	UI5Date.prototype.setHours = function (iHours, iMinutes, iSeconds, iMilliseconds) {
		return this._setParts(["hour", "minute", "second", "fractionalSecond"], arguments);
	};

	/**
	 * Sets the milliseconds for this date instance considering the configured time zone, see
	 * <code>Date.prototype.setMilliseconds</code>.
	 *
	 * @param {int} iMilliseconds An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @public
	 */
	UI5Date.prototype.setMilliseconds = function (iMilliseconds) {
		return this._setParts(["fractionalSecond"], arguments);
	};

	/**
	 * Sets the minutes, seconds and milliseconds for this date instance considering the configured
	 * time zone, see <code>Date.prototype.setMinutes</code>.
	 *
	 * @param {int} iMinutes An integer representing the new minutes value
	 * @param {int} [iSeconds] An integer representing the new seconds value
	 * @param {int} [iMilliseconds] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @public
	 */
	UI5Date.prototype.setMinutes = function (iMinutes, iSeconds, iMilliseconds) {
		return this._setParts(["minute", "second", "fractionalSecond"], arguments);
	};

	/**
	 * Sets the month and day for this date instance considering the configured time zone,
	 * see <code>Date.prototype.setMonth</code>.
	 *
	 * @param {int} iMonth An integer representing the new month index
	 * @param {int} [iDay] An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @public
	 */
	UI5Date.prototype.setMonth = function (iMonth, iDay) {
		return this._setParts(["month", "day"], arguments);
	};

	/**
	 * Sets the seconds and milliseconds for this date instance considering the configured time zone,
	 * see <code>Date.prototype.setSeconds</code>.
	 *
	 * @param {int} iSeconds An integer representing the new seconds value
	 * @param {int} [iMilliseconds] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @public
	 */
	UI5Date.prototype.setSeconds = function (iSeconds, iMilliseconds) {
		return this._setParts(["second", "fractionalSecond"], arguments);
	};

	/**
	 * Sets this date object to the given time represented by a number of milliseconds based on the
	 * UNIX epoch and resets the previously set date parts, see
	 * <code>Date.prototype.setTime</code>.
	 *
	 * @param {int} iTime The date time in milliseconds based in the UNIX epoch
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @public
	 */
	UI5Date.prototype.setTime = function (iTime) {
		this.oDateParts = undefined;
		return this.oDate.setTime(iTime);
	};

	/**
	 * Sets the year for this date instance plus 1900 considering the configured time zone, see
	 * <code>Date.prototype.setYear</code>.
	 *
	 * @param {int} iYear The year which is to be set for this date. If iYear is a number between 0
	 *   and 99 (inclusive), then the year for this date is set to 1900 + iYear. Otherwise, the year
	 *   for this date is set to iYear.
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @deprecated As of version 1.111 as it is deprecated in the base class JavaScript Date; use
	 *   {@link #setFullYear} instead
	 * @public
	 */
	UI5Date.prototype.setYear = function (iYear) {
		var iValue = parseInt(iYear);

		iValue =  (iValue < 0 || iValue > 99) ?  iValue : iValue + 1900;

		return this._setParts(["year"], [iValue]);
	};

	/**
	 * Returns this date object to the given time represented by a number of milliseconds based on the
	 * UNIX epoch, see <code>Date.prototype.getTime</code>.
	 *
	 * @returns {int}
	 *   The timestamp in milliseconds of this date based on the UNIX epoch, or <code>NaN</code> if
	 *   the date is an invalid date
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getTime
	 * @public
	 */

	/**
	 * Returns the day of the month of this date instance according to universal time,
	 * see <code>Date.prototype.getUTCDate</code>.
	 *
	 * @returns {int}
	 *   A number between 1 and 31 representing the day of the month of this date instance according
	 *   to universal time
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getUTCDate
	 * @public
	 */

	/**
	 *
	 * Returns the day of the week of this date instance according to universal time,
	 * see <code>Date.prototype.getUTCDay</code>.
	 *
	 * @returns {int}
	 *   A number between 0 (Sunday) and 6 (Saturday) representing the day of the week of this date
	 *   instance according to universal time
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getUTCDay
	 * @public
	 */

	/**
	 * Returns the year of this date instance according to universal time, see
	 * <code>Date.prototype.getUTCFullYear</code>.
	 *
	 * @returns {int} The year of this date instance according to universal time
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getUTCFullYear
	 * @public
	 */

	/**
	 * Returns the hours of this date instance according to universal time, see
	 * <code>Date.prototype.getUTCHours</code>.
	 *
	 * @returns {int}
	 *   A number between 0 and 23 representing the hours of this date instance according to
	 *   universal time
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getUTCHours
	 * @public
	 */

	/**
	 * Returns the milliseconds of this date instance according to universal time,
	 * see <code>Date.prototype.getUTCMilliseconds</code>.
	 *
	 * @returns {int}
	 *   A number between 0 and 999 representing the milliseconds of this date instance according to
	 *   universal time
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getUTCMilliseconds
	 * @public
	 */

	/**
	 * Returns the minutes of this date instance according to universal time, see
	 * <code>Date.prototype.getUTCMinutes</code>.
	 *
	 * @returns {int}
	 *   A number between 0 and 59 representing the minutes of this date instance according to
	 *   universal time
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getUTCMinutes
	 * @public
	 */

	/**
	 * Returns the month index of this date instance according to universal time, see
	 * <code>Date.prototype.getUTCMonth</code>.
	 *
	 * @returns {int}
	 *   The month index between 0 (January) and 11 (December) of this date instance according to
	 *   universal time
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getUTCMonth
	 * @public
	 */

	/**
	 * Returns the seconds of this date instance according to universal time, see
	 * <code>Date.prototype.getUTCSeconds</code>.
	 *
	 * @returns {int}
	 *   A number between 0 and 59 representing the seconds of this date instance according to
	 *   universal time
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.getUTCSeconds
	 * @public
	 */

	/**
	 * Sets the day of the month for this date instance according to universal time,
	 * see <code>Date.prototype.setUTCDate</code>.
	 *
	 * @param {int} iDay
	 *   An integer representing the new day value, see <code>Date.prototype.setUTCDate</code>
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.setUTCDate
	 * @public
	 */

	/**
	 * Sets the year, month and day for this date instance according to universal time,
	 * see <code>Date.prototype.setUTCFullYear</code>.
	 *
	 * @param {int} iYear An integer representing the new year value
	 * @param {int} [iMonth] An integer representing the new month index
	 * @param {int} [iDay] An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.setUTCFullYear
	 * @public
	 */

	/**
	 * Sets the hours, minutes, seconds and milliseconds for this date instance according to
	 * universal time, see <code>Date.prototype.setUTCHours</code>.
	 *
	 * @param {int} iHours An integer representing the new hour value
	 * @param {int} [iMinutes] An integer representing the new minutes value
	 * @param {int} [iSeconds] An integer representing the new seconds value
	 * @param {int} [iMilliseconds] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.setUTCHours
	 * @public
	 */

	/**
	 * Sets the milliseconds for this date instance according to universal time, see
	 * <code>Date.prototype.setUTCMilliseconds</code>.
	 *
	 * @param {int} iMilliseconds An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.setUTCMilliseconds
	 * @public
	 */

	/**
	 * Sets the minutes, seconds and milliseconds for this date instance according to universal
	 * time, see <code>Date.prototype.setUTCMinutes</code>.
	 *
	 * @param {int} iMinutes An integer representing the new minutes value
	 * @param {int} [iSeconds] An integer representing the new seconds value
	 * @param {int} [iMilliseconds] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.setUTCMinutes
	 * @public
	 */

	/**
	 * Sets the month and day for this date instance according to universal time,
	 * see <code>Date.prototype.setUTCMonth</code>.
	 *
	 * @param {int} iMonth An integer representing the new month index
	 * @param {int} [iDay] An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.setUTCMonth
	 * @public
	 */

	/**
	 * Sets the seconds and milliseconds for this date instance  according to universal time,
	 * see <code>Date.prototype.setUTCSeconds</code>.
	 *
	 * @param {int} iSeconds An integer representing the new seconds value
	 * @param {int} [iMilliseconds] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.setUTCSeconds
	 * @public
	 */

	/**
	 * Converts this date to a string, interpreting it in the UTC time zone, see
	 * <code>Date.prototype.toGMTString</code>.
	 *
	 * @returns {string} The converted date as string in the UTC time zone
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.toGMTString
	 * @public
	 */

	/**
	 * Converts this date to a string in ISO format in the UTC offset zero time zone, as denoted
	 * by the suffix <code>Z</code>, see <code>Date.prototype.toISOString</code>.
	 *
	 * @returns {string}
	 *   The converted date as a string in ISO format, in the UTC offset zero time zone
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.toISOString
	 * @public
	 */

	/**
	 * Returns a string representation of this date object, see <code>Date.prototype.toJSON</code>.
	 *
	 * @returns {string} The date object representation as a string
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.toJSON
	 * @public
	 */

	/**
	 * Returns the date portion of this date object interpreted in the configured time zone in
	 * English, see <code>Date.prototype.toDateString</code>.
	 *
	 * @returns {string}
	 *   The date portion of this date object interpreted in the configured time zone in English
	 *
	 * @public
	 */
	UI5Date.prototype.toDateString = function () {
		if (isNaN(this.oDate)) {
			return this.oDate.toDateString();
		}

		return aWeekday[this.getDay()] + " " + aMonths[this.getMonth()] + " "
			+ addLeadingZeros(this.getDate(), 2) + " " + addLeadingZeros(this.getFullYear(), 4);
	};

	/**
	 * Returns a string with a language-dependent representation of the date part of this date
	 * object interpreted by default in the configured time zone, see
	 * <code>Date.prototype.toLocaleDateString</code>.
	 *
	 * @param {string} [sLocale]
	 *   The locale used for formatting; by default, the string representation of
	 *  {@link module:sap/base/i18n/Localization.getLanguageTag Localization.getLanguageTag}
	 * @param {object} [oOptions]
	 *   The options object used for formatting, corresponding to the options parameter of the
	 *   <code>Intl.DateTimeFormat</code> constructor
	 * @param {string} [oOptions.timeZone]
	 *   The IANA time zone ID; by default
	 *   {@link module:sap/base/i18n/Localization.getTimezone Localization.getTimezone}
	 * @returns {string}
	 *   The language-dependent representation of the date part of this date object
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.toLocaleDateString
	 * @public
	 */

	/**
	 * Returns a string with a language-dependent representation of this date object interpreted by
	 * default in the configured time zone, see <code>Date.prototype.toLocaleString</code>.
	 *
	 * @param {string} [sLocale]
	 *   The locale used for formatting; by default, the string representation of
	 *   {@link module:sap/base/i18n/Localization.getLanguageTag Localization.getLanguageTag}
	 * @param {object} [oOptions]
	 *   The options object used for formatting, corresponding to the options parameter of the
	 *   <code>Intl.DateTimeFormat</code> constructor
	 * @param {string} [oOptions.timeZone]
	 *   The IANA time zone ID;  by default
	 *   {@link module:sap/base/i18n/Localization.getTimezone Localization.getTimezone}
	 * @returns {string}
	 *   The language-dependent representation of this date object
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.toLocaleString
	 * @public
	 */

	/**
	 * Returns a string with a language-dependent representation of the time part of this date
	 * object interpreted by default in the configured time zone, see
	 * <code>Date.prototype.toLocaleTimeString</code>.
	 *
	 * @param {string} [sLocale]
	 *   The locale used for formatting; by default, the string representation of
	 *   {@link module:sap/base/i18n/Localization.getLanguageTag Localization.getLanguageTag}
	 * @param {object} [oOptions]
	 *   The options object used for formatting, corresponding to the options parameter of the
	 *   <code>Intl.DateTimeFormat</code> constructor
	 * @param {string} [oOptions.timeZone]
	 *   The IANA time zone ID;  by default
	 *   {@link module:sap/base/i18n/Localization.getTimezone Localization.getTimezone}
	 * @returns {string}
	 *   The language-dependent representation of the time part of this date object
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.toLocaleTimeString
	 * @public
	 */

	/**
	 * Returns a string representing this date object interpreted in the configured time zone.
	 *
	 * @returns {string}
	 *   A string representing this date object interpreted in the configured time zone
	 *
	 * @public
	 */
	UI5Date.prototype.toString = function () {
		if (isNaN(this.oDate)) {
			return this.oDate.toString();
		}

		return this.toDateString() + " " + this.toTimeString();
	};

	/**
	 * Returns the time portion of this date object interpreted in the configured time zone in English.
	 *
	 * @returns {string}
	 *   The time portion of this date object interpreted in the configured time zone in English
	 *
	 * @public
	 */
	UI5Date.prototype.toTimeString = function () {
		var iHours, iMinutes, sSign, iTimeZoneOffset;
		if (isNaN(this.oDate)) {
			return this.oDate.toTimeString();
		}
		iTimeZoneOffset = this.getTimezoneOffset();
		sSign = iTimeZoneOffset > 0 ? "-" : "+";
		iHours = Math.floor(Math.abs(iTimeZoneOffset) / 60);
		iMinutes = Math.abs(iTimeZoneOffset) % 60;

		// ommit the optional, implementation dependent time zone name
		return addLeadingZeros(this.getHours(), 2) + ":" + addLeadingZeros(this.getMinutes(), 2)
			+ ":" + addLeadingZeros(this.getSeconds(), 2) + " GMT" + sSign
			+ addLeadingZeros(iHours, 2) + addLeadingZeros(iMinutes, 2);
	};

	/**
	 * Converts this date to a string, interpreting it in the UTC time zone, see
	 * <code>Date.prototype.toUTCString</code>.
	 *
	 * @returns {string} The converted date as a string in the UTC time zone
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.toUTCString
	 * @public
	 */

	/**
	 * Returns the value of this date object in milliseconds based on the UNIX epoch, see
	 * <code>Date.prototype.valueOf</code>.
	 *
	 * @returns {int} The primitive value of this date object in milliseconds based on the UNIX epoch
	 *
	 * @function
	 * @name module:sap/ui/core/date/UI5Date.prototype.valueOf
	 * @public
	 */

	// functions that simply delegate to the inner date instance
	[
		"getTime", "getUTCDate", "getUTCDay", "getUTCFullYear", "getUTCHours", "getUTCMilliseconds",
		"getUTCMinutes", "getUTCMonth", "getUTCSeconds",
		"toGMTString", "toISOString", "toJSON", "toUTCString", "valueOf"
	].forEach(function (sMethod) {
		UI5Date.prototype[sMethod] = function () {
			return this.oDate[sMethod].apply(this.oDate, arguments);
		};
	});

	["toLocaleDateString", "toLocaleString", "toLocaleTimeString"].forEach(function (sMethod) {
		UI5Date.prototype[sMethod] = function (sLocale, oOptions) {
			return this.oDate[sMethod](sLocale || Localization.getLanguageTag().toString(),
				Object.assign({timeZone: this.sTimezoneID}, oOptions));
		};
	});

	// before delegating to the inner date instance clear the cached date parts
	[
		"setUTCDate", "setUTCFullYear", "setUTCHours", "setUTCMilliseconds", "setUTCMinutes",
		"setUTCMonth", "setUTCSeconds"
	].forEach(function (sMethod) {
		UI5Date.prototype[sMethod] = function () {
			this.oDateParts = undefined;
			return this.oDate[sMethod].apply(this.oDate, arguments);
		};
	});

	/**
	 * Creates a JavaScript Date instance.
	 *
	 * @param {object} vParts
	 *   The <code>arguments</code> object which is given to
	 *   <code>module:sap/ui/core/date/UI5Date.getInstance</code>
	 * @returns {Date}
	 *   A JavaScript Date instance
	 *
	 * @private
	 */
	UI5Date._createDateInstance = function (vParts) {
		if (vParts[0] instanceof Date) {
			vParts[0] = vParts[0].valueOf();
		}

		// ES5 variant of new Date(...vParts)
		return new (Function.prototype.bind.apply(Date, [].concat.apply([null], vParts)))();
	};

	/**
	 * Creates a date instance (either JavaScript Date or <code>UI5Date</code>) which considers the
	 * configured time zone wherever JavaScript Date uses the local browser time zone, for example
	 * in <code>getDate</code>, <code>toString</code>, or <code>setHours</code>. The supported
	 * parameters are the same as the ones supported by the JavaScript Date constructor.
	 *
	 * <b>Note:</b> Adjusting the time zone in a running application can lead to unexpected data
	 * inconsistencies. For more information, see
	 * {@link module:sap/base/i18n/Localization.setTimezone Localization.setTimezone}.
	 *
	 * @param {int|string|Date|module:sap/ui/core/date/UI5Date|null} [vYearOrValue]
	 *   Same meaning as in the JavaScript Date constructor
	 * @param {int|string} [vMonthIndex]
	 *   Same meaning as in the JavaScript Date constructor
	 * @param {int|string} [vDay=1] Same meaning as in the JavaScript Date constructor
	 * @param {int|string} [vHours=0] Same meaning as in the JavaScript Date constructor
	 * @param {int|string} [vMinutes=0] Same meaning as in the JavaScript Date constructor
	 * @param {int|string} [vSeconds=0] Same meaning as in the JavaScript Date constructor
	 * @param {int|string} [vMilliseconds=0] Same meaning as in the JavaScript Date constructor
	 * @returns {Date|module:sap/ui/core/date/UI5Date}
	 *   The date instance that considers the configured time zone in all local getters and setters.
	 *
	 * @public
	 * @see module:sap/base/i18n/Localization.getTimezone
	 */
	UI5Date.getInstance = function () {
		var sTimezone = Localization.getTimezone();

		if (sTimezone !== TimezoneUtils.getLocalTimezone()) {
			return new UI5Date(arguments, sTimezone);
		}
		// time zones are equal -> use JavaScript Date as it is
		return UI5Date._createDateInstance(arguments);
	};

	/**
	 * Checks whether the given date object is a valid date, considers the configured time zone
	 * and throws an error otherwise.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date} oDate
	 *   The date object created via <code>UI5Date.getInstance</code>
	 * @throws {Error}
	 *   If the given date object is not valid or does not consider the configured time zone
	 *
	 * @private
	 */
	UI5Date.checkDate = function (oDate) {
		if (isNaN(oDate.getTime())) {
			throw new Error("The given Date is not valid");
		}
		if (!(oDate instanceof UI5Date) && (Localization.getTimezone() !== TimezoneUtils.getLocalTimezone())) {
			throw new Error("Configured time zone requires the parameter 'oDate' to be an instance of"
				+ " sap.ui.core.date.UI5Date");
		}
	};

	return UI5Date;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides class sap.ui.core.date.UniversalDate
sap.ui.predefine("sap/ui/core/date/UniversalDate", [
	"sap/base/i18n/Formatting",
	'sap/ui/base/Object',
	"sap/ui/core/Locale",
	'sap/ui/core/LocaleData',
	'./_Calendars',
	'./CalendarUtils',
	'./CalendarWeekNumbering',
	'./UI5Date'
], function(Formatting, BaseObject, Locale, LocaleData, _Calendars, CalendarUtils, CalendarWeekNumbering, UI5Date) {
	"use strict";

	/**
	 * Constructor for UniversalDate.
	 *
	 * @class
	 * The UniversalDate is the base class of calendar date instances. It contains the static methods to create calendar
	 * specific instances.
	 *
	 * The member variable <code>this.oDate</code> contains a date instance
	 * (either JavaScript Date or <code>module:sap/ui/core/date/UI5Date</code>) which considers the
	 * configured time zone wherever JavaScript Date uses the local browser time zone; see
	 * {@link module:sap/ui/core/date/UI5Date#getInstance}. This is the source value of the date
	 * information. The prototype contains getters and setters of the Date and is delegating them
	 * to the internal date object. Implementations for specific calendars may override methods
	 * needed for their specific calendar (e.g. getYear and getEra for Japanese emperor calendar).
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @alias sap.ui.core.date.UniversalDate
	 */
	var UniversalDate = BaseObject.extend("sap.ui.core.date.UniversalDate", /** @lends sap.ui.core.date.UniversalDate.prototype */ {
		constructor: function() {
			var clDate = UniversalDate.getClass();
			return this.createDate(clDate, arguments);
		}
	});

	/**
	 * Delegates this method to the calender specific implementation.
	 *
	 * @returns {int}
	 *   The number of milliseconds since January 1, 1970, 00:00:00 UTC based on the Gregorian
	 *   calendar, for the given calendar specific arguments
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.UTC = function() {
		var clDate = UniversalDate.getClass();
		return clDate.UTC.apply(clDate, arguments);
	};

	/**
	 * Returns a number representing the millisecond since January 1, 1970, 00:00:00 to the current date,
	 * see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now Date.now}.
	 *
	 * @returns {int} A number representing the millisecond since January 1, 1970, 00:00:00 to the current date
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.now = function() {
		return Date.now();
	};

	/**
	 * Creates an object of the provided date class and with the given arguments.
	 *
	 * @param {function} clDate
	 *   The constructor function for either <code>Date</code> or an implementation of
	 *   <code>sap.ui.core.date.UniversalDate</code>
	 * @param {object} aArgs
	 *   The <code>arguments</code> object which is given to the constructor of the given date class
	 *   to create the date object
	 * @returns {sap.ui.core.date.UniversalDate|module:sap/ui/core/date/UI5Date}
	 *   The created date, either an UI5Date or UniversalDate instance
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.createDate = function(clDate, aArgs) {
		if (clDate === Date) {
			return UI5Date.getInstance.apply(null, aArgs);
		}

		return new clDate(...aArgs);
	};

	/**
	 * Returns an instance of UniversalDate, based on the calendar type from the configuration, or as explicitly
	 * defined by parameter. The object contains getters and setters of the JavaScript Date and is delegating them
	 * to an internal date object.
	 *
	 * Note: Prefer this method over calling <code>new UniversalDate</code> with an instance of <code>Date</code>.
	 *
	 * @param {Date|module:sap/ui/core/date/UI5Date|sap.ui.core.date.UniversalDate} [oDate]
	 *   The date object, defaults to <code>UI5Date.getInstance()</code>
	 * @param {module:sap/base/i18n/date/CalendarType} [sCalendarType]
	 *   The calendar type, defaults to <code>module:sap/base/i18n/Formatting.getCalendarType()</code>
	 * @returns {sap.ui.core.date.UniversalDate}
	 *   An instance of <code>UniversalDate</code>
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.getInstance = function(oDate, sCalendarType) {
		var clDate, oInstance;

		if (oDate instanceof UniversalDate) {
			oDate = oDate.getJSDate();
		}

		if (oDate && isNaN(oDate.getTime())) {
			throw new Error("The given date object is invalid");
		}

		if (!sCalendarType) {
			sCalendarType = Formatting.getCalendarType();
		}
		clDate = UniversalDate.getClass(sCalendarType);
		oInstance = Object.create(clDate.prototype);
		oInstance.oDate = oDate ? UI5Date.getInstance(oDate) : UI5Date.getInstance();
		oInstance.sCalendarType = sCalendarType;

		return oInstance;
	};

	/**
	 * Returns the constructor function of a subclass of <code>UniversalDate</code> for the given calendar type.
	 * If no calendar type is given the globally configured calendar type is used.
	 *
	 * @param {module:sap/base/i18n/date/CalendarType} sCalendarType the type of the used calendar
	 *
	 * @returns {function}
	 *   The class of the given <code>sCalenderType</code>. If <code>sCalenderType</code> is not
	 *   provided, the class of the configured calendar type is returned.
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.getClass = function(sCalendarType) {
		if (!sCalendarType) {
			sCalendarType = Formatting.getCalendarType();
		}
		return _Calendars.get(sCalendarType);
	};

	/**
	 * Returns the day of the month of the embedded date instance according to the configured time
	 * zone and selected calender.
	 *
	 * @returns {int}
	 *   A number representing the day of the month of the embedded date instance according
	 *   to the configured time zone and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getDate
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the day of the week of the embedded date instance according to the configured time zone and
	 * selected calender.
	 *
	 * @returns {int}
	 *   A number representing the day of the week of the embedded date instance according to the configured
	 *   time zone and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getDay
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the year of the embedded date instance according to the configured time zone and selected calender.
	 *
	 * @returns {int}
	 *   The year of the embedded date instance according to the configured time zone and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getFullYear
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the hours of the embedded date instance according to the configured time zone and selected
	 * calender.
	 *
	 * @returns {int}
	 *   A number representing the hours of the embedded date instance according to the configured time zone
	 *   and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getHours
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the milliseconds of the embedded date instance according to the configured time zone
	 * and selected calender.
	 *
	 * @returns {int}
	 *   A number between 0 and 999 representing the milliseconds of the embedded date instance according to
	 *   the configured time zone and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getMilliseconds
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the minutes of the embedded date instance according to the configured time zone and selected calender.
	 *
	 * @returns {int}
	 *   A number between 0 and 59 representing the minutes of the embedded date instance according to the
	 *   configured time zone and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getMinutes
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the month index of the embedded date instance according to the configured time zone
	 * and selected calender.
	 *
	 * @returns {int}
	 *   The month index of the embedded date instance according to the configured time zone and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getMonth
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the seconds of the embedded date instance according to the configured time zone and selected calender.
	 *
	 * @returns {int}
	 *   A number between 0 and 59 representing the seconds of the embedded date instance according to the
	 *   configured time zone and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getSeconds
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the difference in minutes between the UTC and the configured time zone for the embedded date.
	 *
	 * @returns {int}
	 *   The difference in minutes between the UTC and the configured time zone for the embedded date
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getTimezoneOffset
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the year of the embedded date instance minus 1900 according to the configured time zone and
	 * selected calender. In case of the Gregorian calendar the 1900 is subtracted from the year value.
	 *
	 * @returns {int}
	 *   The year of the embedded date instance (minus 1900 if the Gregorian calendar is selected)
	 *   according to the configured time zone and selected calender
	 *
	 * @deprecated for the Gregorian calendar since version 1.111.0 as it is deprecated in
	 *   JavaScript Date, it can be used with other calendars. It still is recommended to use
	 *   {@link #getFullYear} instead, independent on the selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getYear
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the timestamp in milliseconds of the embedded date based on the UNIX epoch.
	 *
	 * @returns {int}
	 *   The timestamp in milliseconds of the embedded date based on the UNIX epoch, or <code>NaN</code> if
	 *   the embedded date is an invalid date
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getTime
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the day of the month of the embedded date instance according to universal time and
	 * selected calender.
	 *
	 * @returns {int}
	 *   A number representing the day of the month of the embedded date instance according
	 *   to universal time and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getUTCDate
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 *
	 * Returns the day of the week of the embedded date instance according to universal time and
	 * selected calender.
	 *
	 * @returns {int}
	 *   A number representing the day of the week of the embedded date instance according to universal
	 *   time and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getUTCDay
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the year of the embedded date instance according to universal time and selected calender.
	 *
	 * @returns {int}
	 *   The year of the embedded date instance according to universal time and selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getUTCFullYear
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the hours of the embedded date instance according to universal time.
	 *
	 * @returns {int}
	 *   A number representing the hours of the embedded date instance according to universal time
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getUTCHours
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the milliseconds of the embedded date instance according to universal time.
	 *
	 * @returns {int}
	 *   A number between 0 and 999 representing the milliseconds of the embedded date instance
	 *   according to universal time
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getUTCMilliseconds
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the minutes of the embedded date instance according to universal time.
	 *
	 * @returns {int}
	 *   A number between 0 and 59 representing the minutes of the embedded date instance according
	 *   to universal time
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getUTCMinutes
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the month index of the embedded date instance according to universal time and
	 * selected calender.
	 *
	 * @returns {int}
	 *   The month index of the embedded date instance according to universal time and selected
	 *   calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getUTCMonth
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the seconds of the embedded date instance according to universal time.
	 *
	 * @returns {int}
	 *   A number between 0 and 59 representing the seconds of the embedded date instance according
	 *   to universal time
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.getUTCSeconds
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the day of the month for the embedded date instance considering the configured time zone
	 * and selected calender.
	 *
	 * @param {int} iDay
	 *   An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setDate
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the year, month and day for the embedded date instance considering the configured time
	 * zone and selected calender.
	 *
	 * @param {int} yearValue An integer representing the new year value
	 * @param {int} [monthValue] An integer representing the new month index
	 * @param {int} [dateValue] An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setFullYear
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the hours, minutes, seconds and milliseconds for the embedded date instance considering
	 * the configured time zone.
	 *
	 * @param {int} hoursValue An integer representing the new hours value
	 * @param {int} [minutesValue] An integer representing the new minutes value
	 * @param {int} [secondsValue] An integer representing the new seconds value
	 * @param {int} [msValue] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setHours
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the milliseconds for the embedded date instance considering the configured time zone.
	 *
	 * @param {int} millisecondsValue An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setMilliseconds
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the minutes, seconds and milliseconds for the embedded date instance considering the configured
	 * time zone.
	 *
	 * @param {int} minutesValue An integer representing the new minutes value
	 * @param {int} [secondsValue] An integer representing the new seconds value
	 * @param {int} [msValue] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setMinutes
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the month and day for the embedded date instance considering the configured time zone and
	 * selected calender.
	 *
	 * @param {int} monthValue An integer representing the new month index
	 * @param {int} [dayValue] An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setMonth
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the seconds and milliseconds for the embedded date instance considering the configured time zone.
	 *
	 * @param {int} secondsValue An integer representing the new seconds value
	 * @param {int} [msValue] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setSeconds
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the day of the month for the embedded date instance according to universal time and
	 * selected calender.
	 *
	 * @param {int} dayValue
	 *   An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setUTCDate
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the year, month and day for the embedded date instance according to universal time and
	 * selected calender.
	 *
	 * @param {int} yearValue An integer representing the new year value
	 * @param {int} [monthValue] An integer representing the new month index
	 * @param {int} [dateValue] An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setUTCFullYear
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the hours, minutes, seconds and milliseconds for the embedded date instance according to
	 * universal time.
	 *
	 * @param {int} hoursValue An integer representing the new hours value
	 * @param {int} [minutesValue] An integer representing the new minutes value
	 * @param {int} [secondsValue] An integer representing the new seconds value
	 * @param {int} [msValue] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setUTCHours
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the milliseconds for the embedded date instance according to universal time.
	 *
	 * @param {int} msValue An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setUTCMilliseconds
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the minutes, seconds and milliseconds for the embedded date instance according to universal
	 * time.
	 *
	 * @param {int} minutesValue An integer representing the new minutes value
	 * @param {int} [secondsValue] An integer representing the new seconds value
	 * @param {int} [msValue] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setUTCMinutes
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the month and day for the embedded date instance according to universal time and
	 * selected calender.
	 *
	 * @param {int} monthValue An integer representing the new month index
	 * @param {int} [dateValue] An integer representing the new day value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setUTCMonth
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the seconds and milliseconds for the embedded date instance according to universal time.
	 *
	 * @param {int} secondsValue An integer representing the new seconds value
	 * @param {int} [msValue] An integer representing the new milliseconds value
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setUTCSeconds
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Sets the year for the embedded date instance considering the configured time zone and the
	 * selected calender. In case of the Gregorian calendar, 1900 is added to the year value
	 *
	 * @param {int} yearValue
	 *   An integer representing the new year value (plus 1900 for the Gregorian calendar)
	 * @returns {int}
	 *   The milliseconds of the new timestamp based on the UNIX epoch, or <code>NaN</code> if the
	 *   timestamp could not be updated. The new timestamp is a Gregorian timestamp.
	 *
	 * @deprecated for the Gregorian calendar since version 1.111.0 as it is deprecated in
	 *   JavaScript Date, it can be used with other calendars. It still is recommended to use
	 *   {@link #getFullYear} instead, independent on the selected calender
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.setYear
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the date portion of the embedded date object interpreted in the configured time zone,
	 * independent on the selected calendar.
	 *
	 * @returns {string}
	 *   The date portion of the embedded date object interpreted in the configured time zone
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.toDateString
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns a string representing the embedded date object interpreted in the configured time
	 * zone, independent on the selected calendar.
	 *
	 * @returns {string}
	 *   A string representing the embedded date object interpreted in the configured time zone
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.toString
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */

	/**
	 * Returns the value of the embedded date object in milliseconds based on the UNIX epoch.
	 *
	 * @returns {int} The primitive value of the embedded date object in milliseconds based on the UNIX epoch
	 *
	 * @function
	 * @name sap.ui.core.date.UniversalDate.prototype.valueOf
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	[
		"getDate", "getMonth", "getFullYear", "getYear", "getDay", "getHours", "getMinutes", "getSeconds", "getMilliseconds",
		"getUTCDate", "getUTCMonth", "getUTCFullYear", "getUTCDay", "getUTCHours", "getUTCMinutes", "getUTCSeconds", "getUTCMilliseconds",
		"getTime", "valueOf", "getTimezoneOffset", "toString", "toDateString",
		"setDate", "setFullYear", "setYear", "setMonth", "setHours", "setMinutes", "setSeconds", "setMilliseconds",
		"setUTCDate", "setUTCFullYear", "setUTCMonth", "setUTCHours", "setUTCMinutes", "setUTCSeconds", "setUTCMilliseconds"
	].forEach(function(sName) {
		UniversalDate.prototype[sName] = function() {
			return this.oDate[sName].apply(this.oDate, arguments);
		};
	});

	/**
	 * Returns the date object representing the current calendar date value.
	 *
	 * @returns {Date|module:sap/ui/core/date/UI5Date} The date object representing the current calendar date value
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getJSDate = function() {
		return this.oDate;
	};

	/**
	 * Returns the calendar type of the current instance of a UniversalDate.
	 *
	 * @returns {module:sap/base/i18n/date/CalendarType} The calendar type of the date
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getCalendarType = function() {
		return this.sCalendarType;
	};

	/**
	 * Returns the era index of for the embedded date instance.
	 *
	 * @returns {int} The index of the era for the embedded date instance
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getEra = function() {
		return UniversalDate.getEraByDate(this.sCalendarType, this.oDate.getFullYear(), this.oDate.getMonth(), this.oDate.getDate());
	};

	/**
	 * Placeholder method which is overwritten by calendar specific implementations. General usage of
	 * this method is to use it to set the era for the embedded date instance.
	 *
	 * @param {int} iEra
	 *   An number representing the era index which is to be set for the embedded date instance
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.setEra = function(iEra) {
		// The default implementation does not support setting the era
	};

	/**
	 * Returns the era index of for the embedded date instance in universal time.
	 *
	 * @returns {int} The index of the era for the embedded date instance in universal time
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getUTCEra = function() {
		return UniversalDate.getEraByDate(this.sCalendarType, this.oDate.getUTCFullYear(), this.oDate.getUTCMonth(), this.oDate.getUTCDate());
	};

	/**
	 * Placeholder method which is overwritten by calendar specific implementations. General usage of
	 * this method is to use it to set the era for the embedded date instance in universal time.
	 *
	 * @param {int} iEra
	 *   An number representing the era index which is to be set for the embedded date instance
	 *   in universal time
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.setUTCEra = function(iEra) {
		// The default implementation does not support setting the era
	};

	/**
	 * Retrieves the calendar week
	 *
	 * @param {sap.ui.core.Locale} [oLocale] the locale used to get the calendar week calculation properties, defaults to the formatLocale
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} [vCalendarWeekNumbering]
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>,
	 *   the default is derived from <code>oLocale</code> but this parameter has precedence over oLocale if both are provided.
	 *   In case an object is provided, both properties <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code> must be set, otherwise an error is thrown.
	 *   If calendar week numbering is not determined from the locale then {@link LocaleData#firstDayStartsFirstWeek} is ignored.
	 *   e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
	 * @returns {{week: int, year: int}} resulting calendar week, note: week index starts with <code>0</code>
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @throws {TypeError} If:
	 * <ul>
	 *   <li>vCalendarWeekNumbering is an object and the fields <code>firstDayOfWeek</code> or <code>minimalDaysInFirstWeek</code>) are missing or have a non-numeric value</li>
	 *   <li>vCalendarWeekNumbering is a string and has an invalid week numbering value</li>
	 * </ul>
	 */
	UniversalDate.prototype.getWeek = function(oLocale, vCalendarWeekNumbering) {
		return UniversalDate.getWeekByDate(this.sCalendarType, this.getFullYear(), this.getMonth(), this.getDate(), oLocale, vCalendarWeekNumbering);
	};

	/**
	 * Sets the calendar week
	 *
	 * @param {{week: int, year: int}} oWeek the calendar week, note: week index starts with <code>0</code>,
	 *   <code>oWeek.year</code> is optional and defaults to {@link sap.ui.core.date.UniversalDate#getFullYear}
	 * @param {sap.ui.core.Locale} [oLocale] the locale used to get the calendar week calculation properties, defaults to the formatLocale
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} [vCalendarWeekNumbering]
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>,
	 *   the default is derived from <code>oLocale</code> but this parameter has precedence over oLocale if both are provided.
	 *   In case an object is provided, both properties <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code> must be set, otherwise an error is thrown.
	 *   If calendar week numbering is not determined from the locale then {@link LocaleData#firstDayStartsFirstWeek} is ignored.
	 *   e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @throws {TypeError} If:
	 * <ul>
	 *   <li>vCalendarWeekNumbering is an object and the fields <code>firstDayOfWeek</code> or <code>minimalDaysInFirstWeek</code>) are missing or have a non-numeric value</li>
	 *   <li>vCalendarWeekNumbering is a string and has an invalid week numbering value</li>
	 * </ul>
	 */
	UniversalDate.prototype.setWeek = function(oWeek, oLocale, vCalendarWeekNumbering) {
		var oDate = UniversalDate.getFirstDateOfWeek(this.sCalendarType, oWeek.year || this.getFullYear(), oWeek.week, oLocale, vCalendarWeekNumbering);
		this.setFullYear(oDate.year, oDate.month, oDate.day);
	};

	/**
	 * Retrieves the UTC calendar week
	 *
	 * @param {sap.ui.core.Locale} [oLocale] the locale used to get the calendar week calculation properties, defaults to the formatLocale
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} [vCalendarWeekNumbering]
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>,
	 *   the default is derived from <code>oLocale</code> but this parameter has precedence over oLocale if both are provided.
	 *   In case an object is provided, both properties <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code> must be set, otherwise an error is thrown.
	 *   If calendar week numbering is not determined from the locale then {@link LocaleData#firstDayStartsFirstWeek} is ignored.
	 *   e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
	 * @returns {{week: int, year: int}} resulting calendar week, note: week index starts with <code>0</code>
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @throws {TypeError} If:
	 * <ul>
	 *   <li>vCalendarWeekNumbering is an object and the fields <code>firstDayOfWeek</code> or <code>minimalDaysInFirstWeek</code>) are missing or have a non-numeric value</li>
	 *   <li>vCalendarWeekNumbering is a string and has an invalid week numbering value</li>
	 * </ul>
	 */
	UniversalDate.prototype.getUTCWeek = function(oLocale, vCalendarWeekNumbering) {
		return UniversalDate.getWeekByDate(this.sCalendarType, this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate(), oLocale, vCalendarWeekNumbering);
	};

	/**
	 * Sets the UTC calendar week
	 *
	 * @param {{week: int, year: int}} oWeek the calendar week, note: week index starts with <code>0</code>,
	 *   <code>oWeek.year</code> is optional and defaults to {@link sap.ui.core.date.UniversalDate#getFullYear}
	 * @param {sap.ui.core.Locale} [oLocale] the locale used to get the calendar week calculation properties, defaults to the formatLocale
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} [vCalendarWeekNumbering]
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>,
	 *   the default is derived from <code>oLocale</code> but this parameter has precedence over oLocale if both are provided.
	 *   In case an object is provided, both properties <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code> must be set, otherwise an error is thrown.
	 *   If calendar week numbering is not determined from the locale then {@link LocaleData#firstDayStartsFirstWeek} is ignored.
	 *   e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @throws {TypeError} If:
	 * <ul>
	 *   <li>vCalendarWeekNumbering is an object and the fields <code>firstDayOfWeek</code> or <code>minimalDaysInFirstWeek</code>) are missing or have a non-numeric value</li>
	 *   <li>vCalendarWeekNumbering is a string and has an invalid week numbering value</li>
	 * </ul>
	 */
	UniversalDate.prototype.setUTCWeek = function(oWeek, oLocale, vCalendarWeekNumbering) {
		var oDate = UniversalDate.getFirstDateOfWeek(this.sCalendarType, oWeek.year || this.getFullYear(), oWeek.week, oLocale, vCalendarWeekNumbering);
		this.setUTCFullYear(oDate.year, oDate.month, oDate.day);
	};

	/**
	 * Returns the current quarter of the embedded date instance
	 *
	 * @returns {int} The quarter of the embedded date instance
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getQuarter = function() {
		return Math.floor((this.getMonth() / 3));
	};

	/**
	 * Returns the current quarter of the embedded date instance in universal time
	 *
	 * @returns {int} The quarter of the embedded date instance in universal time
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getUTCQuarter = function() {
		return Math.floor((this.getUTCMonth() / 3));
	};

	/**
	 * Returns an integer value depending on whether the embedded date instance time is set to the
	 * afternoon or morning.
	 *
	 * @returns {int}
	 *   An integer value which indicates which day period the embedded date instance is set to. If,
	 *   date time is set in the morning time 0 (i.e. 0:00 - 11:59) or 1 if date time is set in the
	 *   afternoon (i.e. 12:00 - 23:59).
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getDayPeriod = function() {
		if (this.getHours() < 12) {
			return 0;
		} else {
			return 1;
		}
	};


	/**
	 * Returns an integer value depending on whether the embedded date instance time, is set to the
	 * afternoon or morning, in universal time.
	 *
	 * @returns {int}
	 *   An integer value which indicates which day period the embedded date instance is set to, in
	 *   universal time. If, universal date time is set in the morning time 0 (i.e. 0:00 - 11:59) or
	 *   1 if universal date time is set in the afternoon (i.e. 12:00 - 23:59).
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getUTCDayPeriod = function() {
		if (this.getUTCHours() < 12) {
			return 0;
		} else {
			return 1;
		}
	};


	// TODO: These are currently needed for the DateFormat test, as the date used in the test
	// has been enhanced with these methods. Should be implemented using CLDR data.
	/**
	 * Returns the short version of the time zone name of the embedded date instance.
	 *
	 * @returns {string} The short version of the name, of the time zone of the embedded date instance
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getTimezoneShort = function() {
		if (this.oDate.getTimezoneShort) {
			return this.oDate.getTimezoneShort();
		}
	};

	/**
	 * Returns the long version of the time zone name of the embedded date instance.
	 *
	 * @returns {string} The long version of the name, of the time zone of the embedded date instance
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.prototype.getTimezoneLong = function() {
		if (this.oDate.getTimezoneLong) {
			return this.oDate.getTimezoneLong();
		}
	};

	/*
	 * Helper methods for week calculations
	 */
	var iMillisecondsInWeek = 7 * 24 * 60 * 60 * 1000;

	/**
	 * Retrieves the calendar week for a given date, specified by year, month, and day.
	 *
	 * @param {string} sCalendarType the calendar type, e.g. <code>"Gregorian"</code>
	 * @param {int} iYear year, e.g. <code>2016</code>
	 * @param {int} iMonth the month, e.g. <code>2</code>
	 * @param {int} iDay the date, e.g. <code>3</code>
	 * @param {sap.ui.core.Locale} [oLocale] the locale used for the week calculation, if oWeekConfig is not provided (falls back to the formatLocale)
	 *   e.g. <code>new Locale("de-DE")</code>
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} [vCalendarWeekNumbering]
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>,
	 *   the default is derived from <code>oLocale</code> but this parameter has precedence over oLocale if both are provided.
	 *   In case an object is provided, both properties <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code> must be set, otherwise an error is thrown.
	 *   If calendar week numbering is not determined from the locale then {@link LocaleData#firstDayStartsFirstWeek} is ignored.
	 *   e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
	 * @returns {{week: int, year: int}} resulting calendar week, note: week index starts with <code>0</code>, e.g. <code>{year: 2016, week: 8}</code>
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @throws {TypeError} If:
	 * <ul>
	 *   <li>vCalendarWeekNumbering is an object and the fields <code>firstDayOfWeek</code> or <code>minimalDaysInFirstWeek</code>) are missing or have a non-numeric value</li>
	 *   <li>vCalendarWeekNumbering is a string and has an invalid week numbering value</li>
	 * </ul>
	 */
	UniversalDate.getWeekByDate = function(sCalendarType, iYear, iMonth, iDay, oLocale, vCalendarWeekNumbering) {
		vCalendarWeekNumbering = vCalendarWeekNumbering || Formatting.getCalendarWeekNumbering();
		checkWeekConfig(vCalendarWeekNumbering);
		oLocale = oLocale || new Locale(Formatting.getLanguageTag());
		var clDate = this.getClass(sCalendarType);
		var oFirstDay = getFirstDayOfFirstWeek(clDate, iYear, oLocale, vCalendarWeekNumbering);
		var oDate = new clDate(clDate.UTC(iYear, iMonth, iDay));
		var iWeek, iLastYear, iNextYear, oLastFirstDay, oNextFirstDay;
		var bSplitWeek = isSplitWeek(vCalendarWeekNumbering, oLocale);
		if (bSplitWeek) {
			iWeek = calculateWeeks(oFirstDay, oDate);
		} else {
			iLastYear = iYear - 1;
			iNextYear = iYear + 1;
			oLastFirstDay = getFirstDayOfFirstWeek(clDate, iLastYear, oLocale, vCalendarWeekNumbering);
			oNextFirstDay = getFirstDayOfFirstWeek(clDate, iNextYear, oLocale, vCalendarWeekNumbering);
			if (oDate >= oNextFirstDay) {
				iYear = iNextYear;
				iWeek = 0;
			} else if (oDate < oFirstDay) {
				iYear = iLastYear;
				iWeek = calculateWeeks(oLastFirstDay, oDate);
			} else {
				iWeek = calculateWeeks(oFirstDay, oDate);
			}
		}
		return {
			year: iYear,
			week: iWeek
		};
	};

	/**
	 * Retrieves the first day's date of the given week in the given year.
	 *
	 * @param {string} sCalendarType the calendar type, e.g. <code>"Gregorian"</code>
	 * @param {int} iYear year, e.g. <code>2016</code>
	 * @param {int} iWeek the calendar week index, e.g. <code>8</code>
	 * @param {sap.ui.core.Locale} [oLocale] the locale used for the week calculation, if oWeekConfig is not provided (falls back to the formatLocale)
	 *   e.g. <code>new Locale("de-DE")</code>
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} [vCalendarWeekNumbering]
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>,
	 *   the default is derived from <code>oLocale</code> but this parameter has precedence over oLocale if both are provided.
	 *   In case an object is provided, both properties <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code> must be set, otherwise an error is thrown.
	 *   If calendar week numbering is not determined from the locale then {@link LocaleData#firstDayStartsFirstWeek} is ignored.
	 *   e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
	 * @returns {{month: int, year: int, day: int}} the resulting date, e.g. <code>{year: 2016, month: 1, day: 29}</code>
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 * @throws {TypeError} If:
	 * <ul>
	 *   <li>vCalendarWeekNumbering is an object and the fields <code>firstDayOfWeek</code> or <code>minimalDaysInFirstWeek</code>) are missing or have a non-numeric value</li>
	 *   <li>vCalendarWeekNumbering is a string and has an invalid week numbering value</li>
	 * </ul>
	 */
	UniversalDate.getFirstDateOfWeek = function(sCalendarType, iYear, iWeek, oLocale, vCalendarWeekNumbering) {
		vCalendarWeekNumbering = vCalendarWeekNumbering || Formatting.getCalendarWeekNumbering();
		checkWeekConfig(vCalendarWeekNumbering);
		oLocale = oLocale || new Locale(Formatting.getLanguageTag());
		var clDate = this.getClass(sCalendarType);
		var oFirstDay = getFirstDayOfFirstWeek(clDate, iYear, oLocale, vCalendarWeekNumbering);
		var oDate = new clDate(oFirstDay.valueOf() + iWeek * iMillisecondsInWeek);
		var bSplitWeek = isSplitWeek(vCalendarWeekNumbering, oLocale);
		if (bSplitWeek && iWeek === 0 && oFirstDay.getUTCFullYear() < iYear) {
			return {
				year: iYear,
				month: 0,
				day: 1
			};
		}
		return {
			year: oDate.getUTCFullYear(),
			month: oDate.getUTCMonth(),
			day: oDate.getUTCDate()
		};
	};

	/**
	 * Determines if the split week algorithm should be applied (the first day of the first calendar
	 * week of the year is January 1st).
	 *
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} vCalendarWeekNumbering
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and
	 *   <code>minimalDaysInFirstWeek</code>
	 * @param {sap.ui.core.Locale} oLocale the locale used for the week calculation
	 * @returns {boolean} if the split week should be applied
	 */
	function isSplitWeek(vCalendarWeekNumbering, oLocale) {
		var oLocaleData = LocaleData.getInstance(oLocale);

		// only applies for en_US with default CalendarWeekNumbering (WesternTraditional is default in en_US)
		return (vCalendarWeekNumbering === CalendarWeekNumbering.Default
				|| vCalendarWeekNumbering === CalendarWeekNumbering.WesternTraditional)
			&& oLocaleData.firstDayStartsFirstWeek();
	}

	/**
	 * Checks the calendar week configuration
	 *
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} vCalendarWeekNumbering
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>
	 * @throws {TypeError} If:
	 * <ul>
	 *   <li>vCalendarWeekNumbering is an object and the fields <code>firstDayOfWeek</code> or <code>minimalDaysInFirstWeek</code>) are missing or have a non-numeric value</li>
	 *   <li>vCalendarWeekNumbering is a string and has an invalid week numbering value</li>
	 * </ul>
	 */
	function checkWeekConfig(vCalendarWeekNumbering) {
		if (typeof vCalendarWeekNumbering === "object") {
			if (typeof vCalendarWeekNumbering.firstDayOfWeek !== "number"
					|| typeof vCalendarWeekNumbering.minimalDaysInFirstWeek !== "number") {
				throw new TypeError("Week config requires firstDayOfWeek and minimalDaysInFirstWeek to be set");
			}
		} else if (!Object.values(CalendarWeekNumbering).includes(vCalendarWeekNumbering)) {
			throw new TypeError("Illegal format option calendarWeekNumbering: '" + vCalendarWeekNumbering + "'");
		}
	}

	/**
	 * Resolves the calendar week configuration
	 *
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} vCalendarWeekNumbering
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>
	 * @param {sap.ui.core.Locale} [oLocale] locale to be used
	 * @returns {{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} calendar week calculation configuration
	 */
	function resolveCalendarWeekConfiguration (vCalendarWeekNumbering, oLocale) {
		// be backward compatible
		if (typeof vCalendarWeekNumbering === "object"
				&& typeof vCalendarWeekNumbering.firstDayOfWeek === "number"
				&& typeof vCalendarWeekNumbering.minimalDaysInFirstWeek === "number") {
			return vCalendarWeekNumbering;
		}
		return CalendarUtils.getWeekConfigurationValues(vCalendarWeekNumbering, oLocale);
	}

	/**
	 * Returns the first day of the first week in the given year.
	 *
	 * @param {UniversalDate} clDate the date class
	 * @param {int} iYear year, e.g. <code>2016</code>
	 * @param {sap.ui.core.Locale} [oLocale] the locale used for the week calculation, if oWeekConfig is not provided (falls back to the formatLocale)
	 *   e.g. <code>new Locale("de-DE")</code>
	 * @param {sap.ui.core.date.CalendarWeekNumbering|{firstDayOfWeek: int, minimalDaysInFirstWeek: int}} vCalendarWeekNumbering
	 *   calendar week numbering or object with fields <code>firstDayOfWeek</code> and <code>minimalDaysInFirstWeek</code>,
	 *   the default is derived from <code>oLocale</code> but this parameter has precedence over oLocale if both are provided.
	 *   e.g. <code>{firstDayOfWeek: 1, minimalDaysInFirstWeek: 4}</code>
	 * @returns {Date} first day of the first week in the given year, e.g. <code>Mon Jan 04 2016 01:00:00 GMT+0100</code>
	 */
	function getFirstDayOfFirstWeek(clDate, iYear, oLocale, vCalendarWeekNumbering) {
		oLocale = oLocale || new Locale(Formatting.getLanguageTag());

		var oWeekConfig = resolveCalendarWeekConfiguration(vCalendarWeekNumbering, oLocale);
		var iMinDays = oWeekConfig.minimalDaysInFirstWeek;
		var iFirstDayOfWeek = oWeekConfig.firstDayOfWeek;

		var oFirstDay = new clDate(clDate.UTC(iYear, 0, 1));
		var iDayCount = 7;

		if (isNaN(oFirstDay.getTime())) {
			throw new Error("Could not determine the first day of the week, because the date " +
				"object is invalid");
		}
		// Find the first day of the first week of the year
		while (oFirstDay.getUTCDay() !== iFirstDayOfWeek) {
			oFirstDay.setUTCDate(oFirstDay.getUTCDate() - 1);
			iDayCount--;
		}
		// If less than min days are left, first week is one week later
		if (iDayCount < iMinDays) {
			oFirstDay.setUTCDate(oFirstDay.getUTCDate() + 7);
		}
		return oFirstDay;
	}

	/**
	 * Returns the rounded amount of weeks a given time frame.
	 *
	 * @param {Date} oFromDate The beginning date of the time interval
	 * @param {Date} oToDate The end date of the time interval
	 * @returns {int} A rounded number which represents the amount of weeks in the given timer interval
	 */
	function calculateWeeks(oFromDate, oToDate) {
		return Math.floor((oToDate.valueOf() - oFromDate.valueOf()) / iMillisecondsInWeek);
	}

	/*
	 * Helper methods for era calculations
	 */
	var mEras = {};

	/**
	 * Returns an index of the era for the given date values in the given calender. For
	 * an index to be returned the date value has to be within the era time period, i.e. the
	 * timestamp value of the date has to be bigger or equal than the start timestamp of the era
	 * or smaller than the end of the end period.
	 *
	 * @param {string} sCalendarType The given calender type which the eras available for selection
	 * @param {int} iYear The year value for which the era is looked for
	 * @param {int} iMonth The month value for which the era is looked for
	 * @param {int} iDay The date value for which the era is looked for
	 * @returns {int} The index of the found era for the given date values in the given calender
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.getEraByDate = function(sCalendarType, iYear, iMonth, iDay) {
		var aEras = getEras(sCalendarType),
			// no need to use UI5Date.getInstance as only the UTC timestamp is used
			iTimestamp = new Date(0).setUTCFullYear(iYear, iMonth, iDay),
			oEra;
		for (var i = aEras.length - 1; i >= 0; i--) {
			oEra = aEras[i];
			if (!oEra) {
				continue;
			}
			if (oEra._start && iTimestamp >= oEra._startInfo.timestamp) {
				return i;
			}
			if (oEra._end && iTimestamp < oEra._endInfo.timestamp) {
				return i;
			}
		}
	};

	/**
	 * Returns an index of the current era for the embedded date instance.
	 *
	 * @param {string} sCalendarType The calender type which defines the available eras to select from
	 * @returns {int} The index of the current era of the embedded date instance
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.getCurrentEra = function(sCalendarType) {
		var oNow = UI5Date.getInstance();
		return this.getEraByDate(sCalendarType, oNow.getFullYear(), oNow.getMonth(), oNow.getDate());
	};

	/**
	 * Returns the start date of the selected era from the given era index, in the given calender type.
	 *
	 * @param {string} sCalendarType The calender type from which the era is to be picked
	 * @param {int} iEra The given era index of the to be selected era
	 * @returns {object|null}
	 *   The start date object of the selected era. If no era can be found for the given index the first
	 *   era of the selected calender is chosen. If the chosen era does not have a start date defined
	 *   <code>null</code>
	 *
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	UniversalDate.getEraStartDate = function(sCalendarType, iEra) {
		var aEras = getEras(sCalendarType),
			oEra = aEras[iEra] || aEras[0];
		if (oEra._start) {
			return oEra._startInfo;
		}
	};

	/**
	 * Returns an array of era for the given calender.
	 *
	 * @param {string} sCalendarType
	 *   The calender type from which the the locale era data is taken from and the era array is
	 *   generated
	 * @returns {array} An array of all available era in the given calender
	 */
	function getEras(sCalendarType) {
		var oLocale = new Locale(Formatting.getLanguageTag()),
			oLocaleData = LocaleData.getInstance(oLocale),
			aEras = mEras[sCalendarType];
		if (!aEras) {
			// Get eras from localedata, parse it and add it to the array
			var aEras = oLocaleData.getEraDates(sCalendarType);
			if (!aEras[0]) {
				aEras[0] = {_start: "1-1-1"};
			}
			for (var i = 0; i < aEras.length; i++) {
				var oEra = aEras[i];
				if (!oEra) {
					continue;
				}
				if (oEra._start) {
					oEra._startInfo = parseDateString(oEra._start);
				}
				if (oEra._end) {
					oEra._endInfo = parseDateString(oEra._end);
				}
			}
			mEras[sCalendarType] = aEras;
		}
		return aEras;
	}

	/**
	 * Returns an object containing the date parts year, month, day of month and the date timestamp value
	 * of the given date string.
	 *
	 * @param {string} sDateString The date string which is to be parsed
	 * @returns {object}
	 *   An object containing the year, month, day of month and date timestamp values of the given
	 *   date string
	 */
	function parseDateString(sDateString) {
		var aParts = sDateString.split("-"),
			iYear, iMonth, iDay;
		if (aParts[0] == "") {
			// negative year
			iYear = -parseInt(aParts[1]);
			iMonth = parseInt(aParts[2]) - 1;
			iDay = parseInt(aParts[3]);
		} else {
			iYear = parseInt(aParts[0]);
			iMonth = parseInt(aParts[1]) - 1;
			iDay = parseInt(aParts[2]);
		}
		return {
			// no need to use UI5Date.getInstance as only the UTC timestamp is used
			timestamp: new Date(0).setUTCFullYear(iYear, iMonth, iDay),
			year: iYear,
			month: iMonth,
			day: iDay
		};
	}

	return UniversalDate;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/core/date/UniversalDateUtils", [
	"sap/base/i18n/Formatting",
	'sap/ui/core/date/UniversalDate',
	'sap/ui/core/Locale',
	'sap/ui/core/LocaleData',
	'sap/base/assert'
],
	function (Formatting, UniversalDate, Locale, LocaleData, assert) {
		"use strict";

		function clone(oUniversalDate) {
			assert(oUniversalDate instanceof UniversalDate, "method accepts only instances of UniversalDate");
			return oUniversalDate.createDate(oUniversalDate.constructor, [oUniversalDate.getJSDate()]);
		}

		/**
		 * Provides helpers to execute common calculations on <code>UniversalDate</code> instances.
		 *
		 * @namespace
		 * @alias module:sap/ui/core/date/UniversalDateUtils
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		var UniversalDateUtils = {};

		/**
		 * Calculates a date range based on a given base date, duration and unit.
		 *
		 * If no or a null base date is given, today (<code>UniversalDateUtils.createNewUniversalDate()</code>) will be used as
		 * base date, represented in the current session's default calendar type.
		 *
		 * If the duration is 0, the base date will be used and is part of the returned range. 0 WEEK means this week.
		 * If the duration is positive, the base date will be used as start date of the range. 1 WEEK means next week.
		 * If the duration is negative, the base date will be used as end date.
		 * This method expects only integer values for <code>iDuration</code>,
		 * any fractional part will be ignored (truncated).
		 *
		 * The unit can be one of <code>"DAY"</code>, <code>"WEEK"</code>, <code>"MONTH"</code>,
		 * <code>"QUARTER"</code> or <code>"YEAR"</code>.
		 *
		 * The first value in the returned array will be the first day within the calculated range
		 * (start date) with the time portion set to the beginning of the day. The second value in the array
		 * will be the last day within the range (the inclusive end date) with the time portion set to the
		 * end of the day.
		 *
		 * The returned dates will use the same calendar as the given base date. If no base date was given,
		 * they will use the session's default calendar type.
		 *
		 * @param {int} iDuration
		 *   Positive or negative integer value that defines the duration of the date range.
		 * @param {string} sUnit
		 *   Unit of <code>iDuration</code>, one of <code>"DAY", "WEEK", "MONTH", "QUARTER" , "YEAR"</code>.
 		 * @param {sap.ui.core.date.UniversalDate} [oBaseDate=now]
		 *   Universal date used as basis for the range calculation, defaults to now
		 *  @param {boolean} [bBaseOnUnit]
		 *   Resets the <code>oBaseDate</code> to the first day of the corresponding <code>sUnit</code> where
		 *   <code>oBaseDate</code> is included. E.g. for the unit <code>"MONTH"</code>, it will reset to the
		 *   first day of that month. This option is applicable to the units "WEEK","MONTH","QUARTER","YEAR",
		 *   for unit "DAY" it has no effect. For unit "WEEK", the first day depends on the locale settings
		 *   (see method {@link #.getWeekStartDate})
		 * @returns {sap.ui.core.date.UniversalDate[]}
		 *   Array with two dates representing the calculated range (<code>[startDate, endDate]</code>)
		 *   If the <code>iDuration</code> is zero or not a valid number, an empty array will be returned.
		 * @throws {TypeError}
		 *   If <code>oBaseDate</code> is not an instance of <code>UniversalDate</code>
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getRange = function (iDuration, sUnit, oBaseDate, bBaseOnUnit) {

			if (bBaseOnUnit === undefined ) {
				bBaseOnUnit = true;
			}

			if (isNaN(iDuration)) {
				throw new TypeError("duration is NaN, but is " + iDuration);
			}

			// restrict duration to integer values
			iDuration = Math.trunc(iDuration);

			var oStartDate = UniversalDateUtils.resetStartTime(oBaseDate == undefined ? null : oBaseDate),
				oEndDate;

			if (bBaseOnUnit) {
				switch (sUnit) {
				case "MINUTE":
				case "HOUR":
					oStartDate = UniversalDateUtils.createNewUniversalDate();
					break;
				case "DAY":
					break;
				case "WEEK":
					oStartDate = UniversalDateUtils.getWeekStartDate(oStartDate);
					break;
				case "MONTH":
					oStartDate = UniversalDateUtils.getMonthStartDate(oStartDate);
					break;
				case "QUARTER":
					oStartDate = UniversalDateUtils.getQuarterStartDate(oStartDate);
					break;
				case "YEAR":
					oStartDate = UniversalDateUtils.getYearStartDate(oStartDate);
					break;
				default:
					throw new TypeError("invalid unit " + sUnit);
				}
			}

			switch (sUnit) {
			case "MINUTE":
					oEndDate = clone(oStartDate);
					oEndDate.setMinutes(oStartDate.getMinutes() + iDuration);
				break;
			case "HOUR":
					oEndDate = clone(oStartDate);
					oEndDate.setHours(oStartDate.getHours() + iDuration);
				break;
			case "DAY":
				if (iDuration > 0) {
					oStartDate.setDate(oStartDate.getDate() + 1);
				}
				oEndDate = clone(oStartDate);
				iDuration = iDuration == 0 ? 1 : iDuration;
				oEndDate.setDate(oStartDate.getDate() + iDuration);
				break;
			case "WEEK":
				if (iDuration > 0) {
					oStartDate.setDate(oStartDate.getDate() + 7);
				}
				oEndDate = clone(oStartDate);
				iDuration = iDuration == 0 ? 1 : iDuration;
				oEndDate.setDate(oStartDate.getDate() + (iDuration * 7));
				break;
			case "MONTH":
				if (iDuration > 0) {
					oStartDate.setMonth(oStartDate.getMonth() + 1);
				}
				oEndDate = clone(oStartDate);
				iDuration = iDuration == 0 ? 1 : iDuration;
				oEndDate.setMonth(oStartDate.getMonth() + iDuration);
				break;
			case "QUARTER":
				if (iDuration > 0) {
					oStartDate.setMonth(oStartDate.getMonth() + 3);
				}
				oEndDate = clone(oStartDate);
				iDuration = iDuration == 0 ? 1 : iDuration;
				oEndDate.setMonth(oStartDate.getMonth() + (iDuration * 3));
				break;
			case "YEAR":
				if (iDuration > 0) {
					oStartDate.setFullYear(oStartDate.getFullYear() + 1);
				}
				oEndDate = clone(oStartDate);
				iDuration = iDuration == 0 ? 1 : iDuration;
				oEndDate.setFullYear(oStartDate.getFullYear() + iDuration);
				break;
			default:
				throw new TypeError("invalid unit " + sUnit);
			}

			if (oEndDate.getTime() < oStartDate.getTime()) {
				// swap start/end date
				oEndDate = [oStartDate, oStartDate = oEndDate][0];
			}
			if (sUnit === "HOUR" || sUnit === "MINUTE") {
				return [ oStartDate, oEndDate ];
			}
			// adjust endDate (it is 'inclusive')
			oEndDate.setDate(oEndDate.getDate() - 1);
			return [
				UniversalDateUtils.resetStartTime(oStartDate), UniversalDateUtils.resetEndTime(oEndDate)
			];
		};

		/**
		 * Returns the first day of the week of the given date.
		 *
		 * The interpretation of 'first day of the week' depends on the given locale.
		 *
		 * If no date is given, today is used, represented in the session's default calendar.
		 * If a date is given, the returned date will use the same calendar.
		 * The time portion of the returned date will be set to the beginning of the day (0:00:00:000).
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Base date, defaults to now
		 * @param {string} [sLocale]
		 *   An optional locale identifier, as BCP language tag; defaults to the current format localе of UI5; see
		 *   {@link module:sap/base/i18n/Formatting.getLanguageTag Formatting.getLanguageTag}
		 * @returns {sap.ui.core.date.UniversalDate} First day of the week
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getWeekStartDate = function (oUniversalDate, sLocale) {
			var oLocale = sLocale ? new Locale(sLocale)
					: new Locale(Formatting.getLanguageTag()),
				oLocaleData = LocaleData.getInstance(oLocale),
				iFirstDayOfWeek = oLocaleData.getFirstDayOfWeek();
			oUniversalDate = oUniversalDate ? clone(oUniversalDate) : clone(UniversalDateUtils.createNewUniversalDate());
			oUniversalDate.setDate(oUniversalDate.getDate() - oUniversalDate.getDay() + iFirstDayOfWeek);
			return UniversalDateUtils.resetStartTime(oUniversalDate);
		};

		/**
		 * Returns the last day of the week for the given date.
		 *
		 * The interpretation of 'last day of the week' depends on the given locale.
		 *
		 * If no date is given, today is used, represented in the session's default calendar.
		 * If a date is given, the returned date will use the same calendar.
		 * The time portion of the returned date will be set to the start of the day (00:00:00:000).
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Base date, defaults to now
		 * @param {string} [sLocale]
		 *   An optional locale identifier, as BCP language tag; defaults to the current format localе of UI5; see
		 *   {@link module:sap/base/i18n/Formatting.getLanguageTag Formatting.getLanguageTag}
		 * @returns {sap.ui.core.date.UniversalDate} Last day of the week
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getWeekLastDate = function (oUniversalDate, sLocale) {
			var oEndDate = UniversalDateUtils.getWeekStartDate(oUniversalDate, sLocale);
			oEndDate.setDate(oEndDate.getDate() + 6);
			return UniversalDateUtils.resetStartTime(oEndDate);
		};

		/**
		 * Returns the first day of the month of the given date.
		 *
		 * If no date is given, today is used, represented in the session's default calendar.
		 * If a date is given, the returned date will use the same calendar.
		 * The time portion of the returned date will be set to the beginning of the day (0:00:00:000).
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Base date, defaults to now
		 * @returns {sap.ui.core.date.UniversalDate} First day of the month
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getMonthStartDate = function (oUniversalDate) {
			oUniversalDate = oUniversalDate ? clone(oUniversalDate) : clone(UniversalDateUtils.createNewUniversalDate());
			oUniversalDate.setDate(1);
			return UniversalDateUtils.resetStartTime(oUniversalDate);
		};

		/**
		 * Returns the last day of the month for the given date.
		 *
		 * If no date is given, today is used, represented in the session's default calendar.
		 * If a date is given, the returned date will use the same calendar.
		 * The time portion of the returned date will be set to the start of the day (00:00:00:000).
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Base date, defaults to now
		 * @returns {sap.ui.core.date.UniversalDate} Last day of the month
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getMonthEndDate = function (oUniversalDate) {
			var oEndDate = UniversalDateUtils.getMonthStartDate(oUniversalDate);
			oEndDate.setMonth(oEndDate.getMonth() + 1);
			oEndDate.setDate(0);
			return UniversalDateUtils.resetStartTime(oEndDate);
		};

		/**
		 * Returns the first day of the quarter of the year of the given date.
		 *
		 * If no date is given, today is used, represented in the session's default calendar.
		 * If a date is given, the returned date will use the same calendar.
		 * The time portion of the returned date will be set to the beginning of the day (0:00:00:000).
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Base date, defaults to now
		 * @returns {sap.ui.core.date.UniversalDate} First day of the quarter of the year
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getQuarterStartDate = function (oUniversalDate) {
			oUniversalDate = oUniversalDate ? clone(oUniversalDate) : clone(UniversalDateUtils.createNewUniversalDate());
			oUniversalDate.setMonth(3 * Math.floor(oUniversalDate.getMonth() / 3));
			oUniversalDate.setDate(1);
			return UniversalDateUtils.resetStartTime(oUniversalDate);
		};

		/**
		 * Returns the last day of the quarter of the year for the given date.
		 *
		 * If no date is given, today is used, represented in the session's default calendar.
		 * If a date is given, the returned date will use the same calendar.
		 * The time portion of the returned date will be set to the start of the day (00:00:00:000).
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Base date, defaults to now
		 * @returns {sap.ui.core.date.UniversalDate} Last day of the quarter of the year
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getQuarterEndDate = function (oUniversalDate) {
			var oEndDate = UniversalDateUtils.getQuarterStartDate(oUniversalDate);
			oEndDate.setMonth(oEndDate.getMonth() + 3);
			oEndDate.setDate(0);
			return UniversalDateUtils.resetStartTime(oEndDate);
		};

		/**
		 * Returns the year's start date based on a given universal date.
		 *
		 * If no date is given, today is used, represented in the session's default calendar.
		 * If a date is given, the returned date will use the same calendar.
		 * The time portion of the returned date will be set to the beginning of the day (0:00:00:000).
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Base date, defaults to now
		 * @returns {sap.ui.core.date.UniversalDate} The year's start date for the given universal date
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getYearStartDate = function (oUniversalDate) {
			oUniversalDate = oUniversalDate ? clone(oUniversalDate) : clone(UniversalDateUtils.createNewUniversalDate());
			oUniversalDate.setMonth(0);
			oUniversalDate.setDate(1);
			return UniversalDateUtils.resetStartTime(oUniversalDate);
		};

		/**
		 * Returns the year's end date based on a given universal date.
		 *
		 * If no date is given, today is used, represented in the session's default calendar.
		 * If a date is given, the returned date will use the same calendar.
		 * The time portion of the returned date will be set to the start of the day (00:00:00:000).
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Base date, defaults to now
		 * @returns {sap.ui.core.date.UniversalDate} The year's end date for the given universal date
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.getYearEndDate = function (oUniversalDate) {
			oUniversalDate = oUniversalDate ? clone(oUniversalDate) : clone(UniversalDateUtils.createNewUniversalDate());
			oUniversalDate.setFullYear(oUniversalDate.getFullYear() + 1);
			oUniversalDate.setMonth(0);
			oUniversalDate.setDate(0);
			return UniversalDateUtils.resetStartTime(oUniversalDate);
		};

		/**
		 * Returns a copy of the given date with the time portion set to 00:00:00.000.
		 *
		 * If no date is given, today will be used, represented in the session's default calendar.
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Date, defaults to now
		 * @returns {sap.ui.core.date.UniversalDate} A date with the time portion set to 00:00:00.000
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.resetStartTime = function (oUniversalDate) {
			oUniversalDate = oUniversalDate ? clone(oUniversalDate) : clone(UniversalDateUtils.createNewUniversalDate());
			oUniversalDate.setHours(0, 0, 0, 0);
			return oUniversalDate;
		};

		/**
		 * Returns a copy of the given date with the time portion set to 23:59:59:999
		 *
		 * If no date is given, today will be used, represented in the session's default calendar.
		 *
		 * @param {sap.ui.core.date.UniversalDate} [oUniversalDate=now] Date, defaults to now
		 * @returns {sap.ui.core.date.UniversalDate} A date with the time portion set to 23:59:59.999
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.resetEndTime = function (oUniversalDate) {
			oUniversalDate = oUniversalDate ? clone(oUniversalDate) : clone(UniversalDateUtils.createNewUniversalDate());
			oUniversalDate.setHours(23, 59, 59, 999);
			return oUniversalDate;
		};

		UniversalDateUtils.createNewUniversalDate = function() {
			return new UniversalDate();
		};


		/**
		 * Returns a date representing the first date of the current week, offset by a number of days.
		 *
		 * @param {string} sCalendarWeekNumbering The type of calendar week numbering
		 * @param {int} iDaysToAdd Day offset
		 * @returns {sap.ui.core.date.UniversalDate} Starting date of the week with optional day offset.
		 * @private
		 */
		 UniversalDateUtils._getDateFromWeekStartByDayOffset = function (sCalendarWeekNumbering, iDaysToAdd) {
			var sCalendarType = Formatting.getCalendarType(),
				oLocale = Locale._getCoreLocale(Formatting.getLanguageTag()),
				oUniversalDate = UniversalDateUtils.createNewUniversalDate(),
				oWeekAndYear = oUniversalDate.getWeek(oLocale, sCalendarWeekNumbering),
				oFirstDateOfWeek = UniversalDate.getFirstDateOfWeek(sCalendarType, oWeekAndYear.year, oWeekAndYear.week,
						oLocale, sCalendarWeekNumbering);

			if (iDaysToAdd === undefined) {
				iDaysToAdd = 0;
			}
			return new UniversalDate(oFirstDateOfWeek.year, oFirstDateOfWeek.month, oFirstDateOfWeek.day + iDaysToAdd, 0, 0, 0);
		};

		/**
		 * Helpers to create well-known ranges.
		 *
		 * @private
		 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
		 */
		UniversalDateUtils.ranges = {
			/**
			 * @param {int} iDays Number of days before the current day
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of iDays before the current day
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastDays: function (iDays) {
				return UniversalDateUtils.getRange(-iDays, "DAY");
			},
			/**
			 * @param {int} iMinutes Number of minutes before the current time
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of iMinutes before the current time
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastMinutes: function (iMinutes) {
				return UniversalDateUtils.getRange(-iMinutes, "MINUTE");
			},
			/**
			 * @param {int} iHours Number of hours before the current time
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of iHours before the current time
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastHours: function (iHours) {
				return UniversalDateUtils.getRange(-iHours, "HOUR");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of yesterday's date
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			yesterday: function () {
				return UniversalDateUtils.getRange(-1, "DAY");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of today's date
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			today: function () {
				return UniversalDateUtils.getRange(0, "DAY");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of tomorrow's date
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			tomorrow: function () {
				return UniversalDateUtils.getRange(1, "DAY");
			},
			/**
			 * @param {int} iMinutes Number of minutes after the current time
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of iMinutes after the current time
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextMinutes: function (iMinutes) {
				return UniversalDateUtils.getRange(iMinutes, "MINUTE");
			},
			/**
			 * @param {int} iHours Number of hours after the current time
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of iHours after the current time
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextHours: function (iHours) {
				return UniversalDateUtils.getRange(iHours, "HOUR");
			},
			/**
			 * @param {int} iDays Number of days after the current day
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of iDays after the current day
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextDays: function (iDays) {
				return UniversalDateUtils.getRange(iDays, "DAY");
			},

			/**
			 * @param {int} iWeeks Number of weeks before the current week
			 * @param {string} sCalendarWeekNumbering The type of calendar week numbering
			 * @returns {sap.ui.core.date.UniversalDate[]}
			 * Array with start and end date of iWeeks before the current week
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastWeeks: function (iWeeks, sCalendarWeekNumbering) {
				var oUniversalFirstDateOfWeek;

				if (sCalendarWeekNumbering) {
					oUniversalFirstDateOfWeek = UniversalDateUtils._getDateFromWeekStartByDayOffset(sCalendarWeekNumbering);

					return UniversalDateUtils.getRange(-iWeeks, "WEEK", oUniversalFirstDateOfWeek, false);
				}
				return UniversalDateUtils.getRange(-iWeeks, "WEEK");
			},
			/**
			 * @param {string} sCalendarWeekNumbering The type of calendar week numbering
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of last week
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastWeek: function (sCalendarWeekNumbering) {
				var oUniversalFirstDateOfWeek;

				if (sCalendarWeekNumbering) {
					oUniversalFirstDateOfWeek = UniversalDateUtils._getDateFromWeekStartByDayOffset(sCalendarWeekNumbering);

					return UniversalDateUtils.getRange(-1, "WEEK", oUniversalFirstDateOfWeek, false);
				}
				return UniversalDateUtils.getRange(-1, "WEEK");
			},
			/**
			 * @param {string} sCalendarWeekNumbering The type of calendar week numbering
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of the current week
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			currentWeek: function (sCalendarWeekNumbering) {
				var oUniversalFirstDateOfWeek;

				if (sCalendarWeekNumbering) {
					oUniversalFirstDateOfWeek = UniversalDateUtils._getDateFromWeekStartByDayOffset(sCalendarWeekNumbering);

					return UniversalDateUtils.getRange(0, "WEEK", oUniversalFirstDateOfWeek, false);
				}
				return UniversalDateUtils.getRange(0, "WEEK");
			},

			/**
			 * @param {string} sCalendarWeekNumbering The kind of calendarWeekNumbering.
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of the first day of the current week
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			firstDayOfWeek: function (sCalendarWeekNumbering) {
				var oUniversalFirstDateOfWeek;

				if (sCalendarWeekNumbering) {
					oUniversalFirstDateOfWeek = UniversalDateUtils._getDateFromWeekStartByDayOffset(sCalendarWeekNumbering);

					return [
						UniversalDateUtils.resetStartTime(oUniversalFirstDateOfWeek),
						UniversalDateUtils.resetEndTime(oUniversalFirstDateOfWeek)
					];
				}
				var oStartDate = UniversalDateUtils.getWeekStartDate();

				return [
					oStartDate,
					UniversalDateUtils.resetEndTime(oStartDate)
				];
			},

			/**
			 * @param {string} sCalendarWeekNumbering The type of calendar week numbering
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of the last day of the current week
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastDayOfWeek: function (sCalendarWeekNumbering) {
				var oLastDateOfWeekUniversalDate, iSixDays;

				if (sCalendarWeekNumbering) {
					iSixDays = 6;
					oLastDateOfWeekUniversalDate = UniversalDateUtils._getDateFromWeekStartByDayOffset(sCalendarWeekNumbering, iSixDays);

					return [
						oLastDateOfWeekUniversalDate,
						UniversalDateUtils.resetEndTime(oLastDateOfWeekUniversalDate)
					];
				}
				var oEndDate = UniversalDateUtils.getWeekLastDate();

				return [
					oEndDate,
					UniversalDateUtils.resetEndTime(oEndDate)
				];
			},

			/**
			 * @param {string} sCalendarWeekNumbering The type of calendar week numbering
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of next week's
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextWeek: function (sCalendarWeekNumbering) {
				var oFirstDateOfWeekUniversalDate;

				if (sCalendarWeekNumbering) {
					oFirstDateOfWeekUniversalDate = UniversalDateUtils._getDateFromWeekStartByDayOffset(sCalendarWeekNumbering);

					return UniversalDateUtils.getRange(1, "WEEK", oFirstDateOfWeekUniversalDate, false);
				}
				return UniversalDateUtils.getRange(1, "WEEK");
			},
			/**
			 * @param {int} iWeeks Number of weeks after the current week
			 * @param {string} sCalendarWeekNumbering The type of calendar week numbering
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of iWeeks after the current week
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextWeeks: function (iWeeks, sCalendarWeekNumbering) {
				var oFirstDateOfWeekUniversalDate;

				if (sCalendarWeekNumbering) {
					oFirstDateOfWeekUniversalDate = UniversalDateUtils._getDateFromWeekStartByDayOffset(sCalendarWeekNumbering);

					return UniversalDateUtils.getRange(iWeeks, "WEEK", oFirstDateOfWeekUniversalDate, false);
				}
				return UniversalDateUtils.getRange(iWeeks, "WEEK");
			},

			/**
			 * @param {int} iMonths Number of months before the current month
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of iMonths before the current month
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastMonths: function (iMonths) {
				return UniversalDateUtils.getRange(-iMonths, "MONTH");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of last month's
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastMonth: function () {
				return UniversalDateUtils.getRange(-1, "MONTH");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of current month
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			currentMonth: function () {
				return UniversalDateUtils.getRange(0, "MONTH");
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of first day of the current month
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			firstDayOfMonth: function () {
				var oStartDate = UniversalDateUtils.getMonthStartDate();
				return [
					oStartDate,
					UniversalDateUtils.resetEndTime(oStartDate)
				];
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of last day of the current month
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastDayOfMonth: function () {
				var oEndDate = UniversalDateUtils.getMonthEndDate();
				return [
					oEndDate,
					UniversalDateUtils.resetEndTime(oEndDate)
				];
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of next month's
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextMonth: function () {
				return UniversalDateUtils.getRange(1, "MONTH");
			},
			/**
			 * @param {int} iMonths Number of months after the current month
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of iMonths after the current month
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextMonths: function (iMonths) {
				return UniversalDateUtils.getRange(iMonths, "MONTH");
			},

			/**
			 * @param {int} iQuarters Number of quarters before the current quarter
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of iQuarters before the current quarter
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastQuarters: function (iQuarters) {
				return UniversalDateUtils.getRange(-iQuarters, "QUARTER");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of last quarter
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastQuarter: function () {
				return UniversalDateUtils.getRange(-1, "QUARTER");
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of first day of the current quarter
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			firstDayOfQuarter: function () {
				var oStartDate = UniversalDateUtils.getQuarterStartDate();
				return [
					oStartDate,
					UniversalDateUtils.resetEndTime(oStartDate)
				];
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of last day of the current quarter
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastDayOfQuarter: function () {
				var oEndDate = UniversalDateUtils.getQuarterEndDate();
				return [
					oEndDate,
					UniversalDateUtils.resetEndTime(oEndDate)
				];
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of current quarter
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			currentQuarter: function () {
				return UniversalDateUtils.getRange(0, "QUARTER");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of next quarter
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextQuarter: function () {
				return UniversalDateUtils.getRange(1, "QUARTER");
			},
			/**
			 * @param {int} iQuarters Number of quarters after the current quarter
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of iQuarters after the current quarter
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextQuarters: function (iQuarters) {
				return UniversalDateUtils.getRange(iQuarters, "QUARTER");
			},

			/**
			 * @param {int} iQuarter Number of quarter of the current year
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of iQuarter
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			quarter: function (iQuarter) {
				if (iQuarter <= 2) {
					return UniversalDateUtils.getRange(iQuarter - 1, "QUARTER", UniversalDateUtils.getYearStartDate());
				} else {
					var aRange = UniversalDateUtils.getRange(iQuarter - 2, "QUARTER", UniversalDateUtils.getYearStartDate());
					var oStartDate = aRange[1];
					oStartDate.setMilliseconds(1000);
					return UniversalDateUtils.getRange(0, "QUARTER", oStartDate);
				}
			},
			/**
			 * @param {int} iYears Number of years before the current year
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of iYears before the current year
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastYears: function (iYears) {
				return UniversalDateUtils.getRange(-iYears, "YEAR");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of last year
			 * @private
			 * @ui5-restricted sap.ui.comp
			 */
			lastYear: function () {
				return UniversalDateUtils.getRange(-1, "YEAR");
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of first day of the current year
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			firstDayOfYear: function () {
				var oStartDate = UniversalDateUtils.getYearStartDate();
				return [
					oStartDate,
					UniversalDateUtils.resetEndTime(oStartDate)
				];
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of last day of the current year
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			lastDayOfYear: function () {
				var oEndDate = UniversalDateUtils.getYearEndDate();

				return [
					oEndDate,
					UniversalDateUtils.resetEndTime(oEndDate)
				];
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of current year
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			currentYear: function () {
				return UniversalDateUtils.getRange(0, "YEAR");
			},
			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of next year
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextYear: function () {
				return UniversalDateUtils.getRange(1, "YEAR");
			},
			/**
			 * @param {int} iYears Number of years after the current year
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with start and end date of iYears after the current year
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			nextYears: function (iYears) {
				return UniversalDateUtils.getRange(iYears, "YEAR");
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with first day of the current year and today
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			yearToDate: function () {
				var oToday = UniversalDateUtils.createNewUniversalDate();
				return [
					UniversalDateUtils.getYearStartDate(oToday),
					UniversalDateUtils.resetEndTime(oToday)
				];
			},

			/**
			 * @returns {sap.ui.core.date.UniversalDate[]} Array with today and end of the current year
			 * @private
			 * @ui5-restricted sap.ui.comp, sap.ui.mdc, sap.fe
			 */
			dateToYear: function () {
				var oToday = UniversalDateUtils.createNewUniversalDate();
				return [
					UniversalDateUtils.resetStartTime(oToday),
					UniversalDateUtils.resetEndTime(UniversalDateUtils.getYearEndDate(oToday))
				];
			}
		};
		return UniversalDateUtils;
	});
/*
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/core/date/_Calendars", [], function () {
	"use strict";

	/*global Map */
	var mRegistry = new Map();

	/**
	 * @private
	 * @ui5-restricted
	 */
	var _Calendars = {
		get: function (sCalendarType) {
			/** @deprecated As of version 1.120.0 */
			if (!mRegistry.has(sCalendarType)) {
				sap.ui.requireSync("sap/ui/core/date/" + sCalendarType); // TODO: establish full async alternative
			}
			if (mRegistry.has(sCalendarType)) {
				return mRegistry.get(sCalendarType);
			}
			throw new TypeError("Load required calendar 'sap/ui/core/date/" + sCalendarType + "' in advance");
		},
		set: function (sCalendarType, CalendarClass) {
			mRegistry.set(sCalendarType, CalendarClass);
		}
	};

	return _Calendars;
});
sap.ui.require.preload({
	"sap/ui/thirdparty/URI.js":function(){
/*!
 * URI.js - Mutating URLs
 *
 * Version: 1.19.11
 *
 * Author: Rodney Rehm
 * Web: http://medialize.github.io/URI.js/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *
 */
(function (root, factory) {
  'use strict';
  // https://github.com/umdjs/umd/blob/master/returnExports.js
  if (typeof module === 'object' && module.exports) {
    // Node
    module.exports = factory(require('./punycode'), require('./IPv6'), require('./SecondLevelDomains'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    // ##### BEGIN: MODIFIED BY SAP
    // define(['./punycode', './IPv6', './SecondLevelDomains'], factory);
    // we can't support loading URI.js via AMD define. URI.js is packaged with SAPUI5 code
    // and define() doesn't execute synchronously. So the UI5 code executed after URI.js
    // fails as it is missing the URI.js code.
    // Instead we use the standard init code and only expose the result via define()
    // The (optional) dependencies are lost or must be loaded in advance
    root.URI = factory(root.punycode, root.IPv6, root.SecondLevelDomains, root);
    define('sap/ui/thirdparty/URI', [], function() { return root.URI; });
    // ##### END: MODIFIED BY SAP
  } else {
    // Browser globals (root is window)
    root.URI = factory(root.punycode, root.IPv6, root.SecondLevelDomains, root);
  }
}(this, function (punycode, IPv6, SLD, root) {
  'use strict';
  /*global location, escape, unescape */
  // FIXME: v2.0.0 renamce non-camelCase properties to uppercase
  /*jshint camelcase: false */

  // save current URI variable, if any
  var _URI = root && root.URI;

  function URI(url, base) {
    var _urlSupplied = arguments.length >= 1;
    var _baseSupplied = arguments.length >= 2;

    // Allow instantiation without the 'new' keyword
    if (!(this instanceof URI)) {
      if (_urlSupplied) {
        if (_baseSupplied) {
          return new URI(url, base);
        }

        return new URI(url);
      }

      return new URI();
    }

    if (url === undefined) {
      if (_urlSupplied) {
        throw new TypeError('undefined is not a valid argument for URI');
      }

      if (typeof location !== 'undefined') {
        url = location.href + '';
      } else {
        url = '';
      }
    }

    if (url === null) {
      if (_urlSupplied) {
        throw new TypeError('null is not a valid argument for URI');
      }
    }

    this.href(url);

    // resolve to base according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#constructor
    if (base !== undefined) {
      return this.absoluteTo(base);
    }

    return this;
  }

  function isInteger(value) {
    return /^[0-9]+$/.test(value);
  }

  URI.version = '1.19.11';

  var p = URI.prototype;
  var hasOwn = Object.prototype.hasOwnProperty;

  function escapeRegEx(string) {
    // https://github.com/medialize/URI.js/commit/85ac21783c11f8ccab06106dba9735a31a86924d#commitcomment-821963
    return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
  }

  function getType(value) {
    // IE8 doesn't return [Object Undefined] but [Object Object] for undefined value
    if (value === undefined) {
      return 'Undefined';
    }

    return String(Object.prototype.toString.call(value)).slice(8, -1);
  }

  function isArray(obj) {
    return getType(obj) === 'Array';
  }

  function filterArrayValues(data, value) {
    var lookup = {};
    var i, length;

    if (getType(value) === 'RegExp') {
      lookup = null;
    } else if (isArray(value)) {
      for (i = 0, length = value.length; i < length; i++) {
        lookup[value[i]] = true;
      }
    } else {
      lookup[value] = true;
    }

    for (i = 0, length = data.length; i < length; i++) {
      /*jshint laxbreak: true */
      var _match = lookup && lookup[data[i]] !== undefined
        || !lookup && value.test(data[i]);
      /*jshint laxbreak: false */
      if (_match) {
        data.splice(i, 1);
        length--;
        i--;
      }
    }

    return data;
  }

  function arrayContains(list, value) {
    var i, length;

    // value may be string, number, array, regexp
    if (isArray(value)) {
      // Note: this can be optimized to O(n) (instead of current O(m * n))
      for (i = 0, length = value.length; i < length; i++) {
        if (!arrayContains(list, value[i])) {
          return false;
        }
      }

      return true;
    }

    var _type = getType(value);
    for (i = 0, length = list.length; i < length; i++) {
      if (_type === 'RegExp') {
        if (typeof list[i] === 'string' && list[i].match(value)) {
          return true;
        }
      } else if (list[i] === value) {
        return true;
      }
    }

    return false;
  }

  function arraysEqual(one, two) {
    if (!isArray(one) || !isArray(two)) {
      return false;
    }

    // arrays can't be equal if they have different amount of content
    if (one.length !== two.length) {
      return false;
    }

    one.sort();
    two.sort();

    for (var i = 0, l = one.length; i < l; i++) {
      if (one[i] !== two[i]) {
        return false;
      }
    }

    return true;
  }

  function trimSlashes(text) {
    var trim_expression = /^\/+|\/+$/g;
    return text.replace(trim_expression, '');
  }

  URI._parts = function() {
    return {
      protocol: null,
      username: null,
      password: null,
      hostname: null,
      urn: null,
      port: null,
      path: null,
      query: null,
      fragment: null,
      // state
      preventInvalidHostname: URI.preventInvalidHostname,
      duplicateQueryParameters: URI.duplicateQueryParameters,
      escapeQuerySpace: URI.escapeQuerySpace
    };
  };
  // state: throw on invalid hostname
  // see https://github.com/medialize/URI.js/pull/345
  // and https://github.com/medialize/URI.js/issues/354
  URI.preventInvalidHostname = false;
  // state: allow duplicate query parameters (a=1&a=1)
  URI.duplicateQueryParameters = false;
  // state: replaces + with %20 (space in query strings)
  URI.escapeQuerySpace = true;
  // static properties
  URI.protocol_expression = /^[a-z][a-z0-9.+-]*$/i;
  URI.idn_expression = /[^a-z0-9\._-]/i;
  URI.punycode_expression = /(xn--)/i;
  // well, 333.444.555.666 matches, but it sure ain't no IPv4 - do we care?
  URI.ip4_expression = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  // credits to Rich Brown
  // source: http://forums.intermapper.com/viewtopic.php?p=1096#1096
  // specification: http://www.ietf.org/rfc/rfc4291.txt
  URI.ip6_expression = /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;
  // expression used is "gruber revised" (@gruber v2) determined to be the
  // best solution in a regex-golf we did a couple of ages ago at
  // * http://mathiasbynens.be/demo/url-regex
  // * http://rodneyrehm.de/t/url-regex.html
  URI.find_uri_expression = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig;
  URI.findUri = {
    // valid "scheme://" or "www."
    start: /\b(?:([a-z][a-z0-9.+-]*:\/\/)|www\.)/gi,
    // everything up to the next whitespace
    end: /[\s\r\n]|$/,
    // trim trailing punctuation captured by end RegExp
    trim: /[`!()\[\]{};:'".,<>?«»“”„‘’]+$/,
    // balanced parens inclusion (), [], {}, <>
    parens: /(\([^\)]*\)|\[[^\]]*\]|\{[^}]*\}|<[^>]*>)/g,
  };
  URI.leading_whitespace_expression = /^[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/
  // https://infra.spec.whatwg.org/#ascii-tab-or-newline
  URI.ascii_tab_whitespace = /[\u0009\u000A\u000D]+/g
  // http://www.iana.org/assignments/uri-schemes.html
  // http://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Well-known_ports
  URI.defaultPorts = {
    http: '80',
    https: '443',
    ftp: '21',
    gopher: '70',
    ws: '80',
    wss: '443'
  };
  // list of protocols which always require a hostname
  URI.hostProtocols = [
    'http',
    'https'
  ];

  // allowed hostname characters according to RFC 3986
  // ALPHA DIGIT "-" "." "_" "~" "!" "$" "&" "'" "(" ")" "*" "+" "," ";" "=" %encoded
  // I've never seen a (non-IDN) hostname other than: ALPHA DIGIT . - _
  URI.invalid_hostname_characters = /[^a-zA-Z0-9\.\-:_]/;
  // map DOM Elements to their URI attribute
  URI.domAttributes = {
    'a': 'href',
    'blockquote': 'cite',
    'link': 'href',
    'base': 'href',
    'script': 'src',
    'form': 'action',
    'img': 'src',
    'area': 'href',
    'iframe': 'src',
    'embed': 'src',
    'source': 'src',
    'track': 'src',
    'input': 'src', // but only if type="image"
    'audio': 'src',
    'video': 'src'
  };
  URI.getDomAttribute = function(node) {
    if (!node || !node.nodeName) {
      return undefined;
    }

    var nodeName = node.nodeName.toLowerCase();
    // <input> should only expose src for type="image"
    if (nodeName === 'input' && node.type !== 'image') {
      return undefined;
    }

    return URI.domAttributes[nodeName];
  };

  function escapeForDumbFirefox36(value) {
    // https://github.com/medialize/URI.js/issues/91
    return escape(value);
  }

  // encoding / decoding according to RFC3986
  function strictEncodeURIComponent(string) {
    // see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/encodeURIComponent
    return encodeURIComponent(string)
      .replace(/[!'()*]/g, escapeForDumbFirefox36)
      .replace(/\*/g, '%2A');
  }
  URI.encode = strictEncodeURIComponent;
  URI.decode = decodeURIComponent;
  URI.iso8859 = function() {
    URI.encode = escape;
    URI.decode = unescape;
  };
  URI.unicode = function() {
    URI.encode = strictEncodeURIComponent;
    URI.decode = decodeURIComponent;
  };
  URI.characters = {
    pathname: {
      encode: {
        // RFC3986 2.1: For consistency, URI producers and normalizers should
        // use uppercase hexadecimal digits for all percent-encodings.
        expression: /%(24|26|2B|2C|3B|3D|3A|40)/ig,
        map: {
          // -._~!'()*
          '%24': '$',
          '%26': '&',
          '%2B': '+',
          '%2C': ',',
          '%3B': ';',
          '%3D': '=',
          '%3A': ':',
          '%40': '@'
        }
      },
      decode: {
        expression: /[\/\?#]/g,
        map: {
          '/': '%2F',
          '?': '%3F',
          '#': '%23'
        }
      }
    },
    reserved: {
      encode: {
        // RFC3986 2.1: For consistency, URI producers and normalizers should
        // use uppercase hexadecimal digits for all percent-encodings.
        expression: /%(21|23|24|26|27|28|29|2A|2B|2C|2F|3A|3B|3D|3F|40|5B|5D)/ig,
        map: {
          // gen-delims
          '%3A': ':',
          '%2F': '/',
          '%3F': '?',
          '%23': '#',
          '%5B': '[',
          '%5D': ']',
          '%40': '@',
          // sub-delims
          '%21': '!',
          '%24': '$',
          '%26': '&',
          '%27': '\'',
          '%28': '(',
          '%29': ')',
          '%2A': '*',
          '%2B': '+',
          '%2C': ',',
          '%3B': ';',
          '%3D': '='
        }
      }
    },
    urnpath: {
      // The characters under `encode` are the characters called out by RFC 2141 as being acceptable
      // for usage in a URN. RFC2141 also calls out "-", ".", and "_" as acceptable characters, but
      // these aren't encoded by encodeURIComponent, so we don't have to call them out here. Also
      // note that the colon character is not featured in the encoding map; this is because URI.js
      // gives the colons in URNs semantic meaning as the delimiters of path segements, and so it
      // should not appear unencoded in a segment itself.
      // See also the note above about RFC3986 and capitalalized hex digits.
      encode: {
        expression: /%(21|24|27|28|29|2A|2B|2C|3B|3D|40)/ig,
        map: {
          '%21': '!',
          '%24': '$',
          '%27': '\'',
          '%28': '(',
          '%29': ')',
          '%2A': '*',
          '%2B': '+',
          '%2C': ',',
          '%3B': ';',
          '%3D': '=',
          '%40': '@'
        }
      },
      // These characters are the characters called out by RFC2141 as "reserved" characters that
      // should never appear in a URN, plus the colon character (see note above).
      decode: {
        expression: /[\/\?#:]/g,
        map: {
          '/': '%2F',
          '?': '%3F',
          '#': '%23',
          ':': '%3A'
        }
      }
    }
  };
  URI.encodeQuery = function(string, escapeQuerySpace) {
    var escaped = URI.encode(string + '');
    if (escapeQuerySpace === undefined) {
      escapeQuerySpace = URI.escapeQuerySpace;
    }

    return escapeQuerySpace ? escaped.replace(/%20/g, '+') : escaped;
  };
  URI.decodeQuery = function(string, escapeQuerySpace) {
    string += '';
    if (escapeQuerySpace === undefined) {
      escapeQuerySpace = URI.escapeQuerySpace;
    }

    try {
      return URI.decode(escapeQuerySpace ? string.replace(/\+/g, '%20') : string);
    } catch(e) {
      // we're not going to mess with weird encodings,
      // give up and return the undecoded original string
      // see https://github.com/medialize/URI.js/issues/87
      // see https://github.com/medialize/URI.js/issues/92
      return string;
    }
  };
  // generate encode/decode path functions
  var _parts = {'encode':'encode', 'decode':'decode'};
  var _part;
  var generateAccessor = function(_group, _part) {
    return function(string) {
      try {
        return URI[_part](string + '').replace(URI.characters[_group][_part].expression, function(c) {
          return URI.characters[_group][_part].map[c];
        });
      } catch (e) {
        // we're not going to mess with weird encodings,
        // give up and return the undecoded original string
        // see https://github.com/medialize/URI.js/issues/87
        // see https://github.com/medialize/URI.js/issues/92
        return string;
      }
    };
  };

  for (_part in _parts) {
    URI[_part + 'PathSegment'] = generateAccessor('pathname', _parts[_part]);
    URI[_part + 'UrnPathSegment'] = generateAccessor('urnpath', _parts[_part]);
  }

  var generateSegmentedPathFunction = function(_sep, _codingFuncName, _innerCodingFuncName) {
    return function(string) {
      // Why pass in names of functions, rather than the function objects themselves? The
      // definitions of some functions (but in particular, URI.decode) will occasionally change due
      // to URI.js having ISO8859 and Unicode modes. Passing in the name and getting it will ensure
      // that the functions we use here are "fresh".
      var actualCodingFunc;
      if (!_innerCodingFuncName) {
        actualCodingFunc = URI[_codingFuncName];
      } else {
        actualCodingFunc = function(string) {
          return URI[_codingFuncName](URI[_innerCodingFuncName](string));
        };
      }

      var segments = (string + '').split(_sep);

      for (var i = 0, length = segments.length; i < length; i++) {
        segments[i] = actualCodingFunc(segments[i]);
      }

      return segments.join(_sep);
    };
  };

  // This takes place outside the above loop because we don't want, e.g., encodeUrnPath functions.
  URI.decodePath = generateSegmentedPathFunction('/', 'decodePathSegment');
  URI.decodeUrnPath = generateSegmentedPathFunction(':', 'decodeUrnPathSegment');
  URI.recodePath = generateSegmentedPathFunction('/', 'encodePathSegment', 'decode');
  URI.recodeUrnPath = generateSegmentedPathFunction(':', 'encodeUrnPathSegment', 'decode');

  URI.encodeReserved = generateAccessor('reserved', 'encode');

  URI.parse = function(string, parts) {
    var pos;
    if (!parts) {
      parts = {
        preventInvalidHostname: URI.preventInvalidHostname
      };
    }

    string = string.replace(URI.leading_whitespace_expression, '')
    // https://infra.spec.whatwg.org/#ascii-tab-or-newline
    string = string.replace(URI.ascii_tab_whitespace, '')

    // [protocol"://"[username[":"password]"@"]hostname[":"port]"/"?][path]["?"querystring]["#"fragment]

    // extract fragment
    pos = string.indexOf('#');
    if (pos > -1) {
      // escaping?
      parts.fragment = string.substring(pos + 1) || null;
      string = string.substring(0, pos);
    }

    // extract query
    pos = string.indexOf('?');
    if (pos > -1) {
      // escaping?
      parts.query = string.substring(pos + 1) || null;
      string = string.substring(0, pos);
    }

    // slashes and backslashes have lost all meaning for the web protocols (https, http, wss, ws)
    string = string.replace(/^(https?|ftp|wss?)?:+[/\\]*/i, '$1://');
    // slashes and backslashes have lost all meaning for scheme relative URLs
    string = string.replace(/^[/\\]{2,}/i, '//');

    // extract protocol
    if (string.substring(0, 2) === '//') {
      // relative-scheme
      parts.protocol = null;
      string = string.substring(2);
      // extract "user:pass@host:port"
      string = URI.parseAuthority(string, parts);
    } else {
      pos = string.indexOf(':');
      if (pos > -1) {
        parts.protocol = string.substring(0, pos) || null;
        if (parts.protocol && !parts.protocol.match(URI.protocol_expression)) {
          // : may be within the path
          parts.protocol = undefined;
        } else if (string.substring(pos + 1, pos + 3).replace(/\\/g, '/') === '//') {
          string = string.substring(pos + 3);

          // extract "user:pass@host:port"
          string = URI.parseAuthority(string, parts);
        } else {
          string = string.substring(pos + 1);
          parts.urn = true;
        }
      }
    }

    // what's left must be the path
    parts.path = string;

    // and we're done
    return parts;
  };
  URI.parseHost = function(string, parts) {
    if (!string) {
      string = '';
    }

    // Copy chrome, IE, opera backslash-handling behavior.
    // Back slashes before the query string get converted to forward slashes
    // See: https://github.com/joyent/node/blob/386fd24f49b0e9d1a8a076592a404168faeecc34/lib/url.js#L115-L124
    // See: https://code.google.com/p/chromium/issues/detail?id=25916
    // https://github.com/medialize/URI.js/pull/233
    string = string.replace(/\\/g, '/');

    // extract host:port
    var pos = string.indexOf('/');
    var bracketPos;
    var t;

    if (pos === -1) {
      pos = string.length;
    }

    if (string.charAt(0) === '[') {
      // IPv6 host - http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04#section-6
      // I claim most client software breaks on IPv6 anyways. To simplify things, URI only accepts
      // IPv6+port in the format [2001:db8::1]:80 (for the time being)
      bracketPos = string.indexOf(']');
      parts.hostname = string.substring(1, bracketPos) || null;
      parts.port = string.substring(bracketPos + 2, pos) || null;
      if (parts.port === '/') {
        parts.port = null;
      }
    } else {
      var firstColon = string.indexOf(':');
      var firstSlash = string.indexOf('/');
      var nextColon = string.indexOf(':', firstColon + 1);
      if (nextColon !== -1 && (firstSlash === -1 || nextColon < firstSlash)) {
        // IPv6 host contains multiple colons - but no port
        // this notation is actually not allowed by RFC 3986, but we're a liberal parser
        parts.hostname = string.substring(0, pos) || null;
        parts.port = null;
      } else {
        t = string.substring(0, pos).split(':');
        parts.hostname = t[0] || null;
        parts.port = t[1] || null;
      }
    }

    if (parts.hostname && string.substring(pos).charAt(0) !== '/') {
      pos++;
      string = '/' + string;
    }

    if (parts.preventInvalidHostname) {
      URI.ensureValidHostname(parts.hostname, parts.protocol);
    }

    if (parts.port) {
      URI.ensureValidPort(parts.port);
    }

    return string.substring(pos) || '/';
  };
  URI.parseAuthority = function(string, parts) {
    string = URI.parseUserinfo(string, parts);
    return URI.parseHost(string, parts);
  };
  URI.parseUserinfo = function(string, parts) {
    // extract username:password
    var _string = string
    var firstBackSlash = string.indexOf('\\');
    if (firstBackSlash !== -1) {
      string = string.replace(/\\/g, '/')
    }
    var firstSlash = string.indexOf('/');
    var pos = string.lastIndexOf('@', firstSlash > -1 ? firstSlash : string.length - 1);
    var t;

    // authority@ must come before /path or \path
    if (pos > -1 && (firstSlash === -1 || pos < firstSlash)) {
      t = string.substring(0, pos).split(':');
      parts.username = t[0] ? URI.decode(t[0]) : null;
      t.shift();
      parts.password = t[0] ? URI.decode(t.join(':')) : null;
      string = _string.substring(pos + 1);
    } else {
      parts.username = null;
      parts.password = null;
    }

    return string;
  };
  URI.parseQuery = function(string, escapeQuerySpace) {
    if (!string) {
      return {};
    }

    // throw out the funky business - "?"[name"="value"&"]+
    string = string.replace(/&+/g, '&').replace(/^\?*&*|&+$/g, '');

    if (!string) {
      return {};
    }

    var items = {};
    var splits = string.split('&');
    var length = splits.length;
    var v, name, value;

    for (var i = 0; i < length; i++) {
      v = splits[i].split('=');
      name = URI.decodeQuery(v.shift(), escapeQuerySpace);
      // no "=" is null according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#collect-url-parameters
      value = v.length ? URI.decodeQuery(v.join('='), escapeQuerySpace) : null;

      if (name === '__proto__') {
        // ignore attempt at exploiting JavaScript internals
        continue;
      } else if (hasOwn.call(items, name)) {
        if (typeof items[name] === 'string' || items[name] === null) {
          items[name] = [items[name]];
        }

        items[name].push(value);
      } else {
        items[name] = value;
      }
    }

    return items;
  };

  URI.build = function(parts) {
    var t = '';
    var requireAbsolutePath = false

    if (parts.protocol) {
      t += parts.protocol + ':';
    }

    if (!parts.urn && (t || parts.hostname)) {
      t += '//';
      requireAbsolutePath = true
    }

    t += (URI.buildAuthority(parts) || '');

    if (typeof parts.path === 'string') {
      if (parts.path.charAt(0) !== '/' && requireAbsolutePath) {
        t += '/';
      }

      t += parts.path;
    }

    if (typeof parts.query === 'string' && parts.query) {
      t += '?' + parts.query;
    }

    if (typeof parts.fragment === 'string' && parts.fragment) {
      t += '#' + parts.fragment;
    }
    return t;
  };
  URI.buildHost = function(parts) {
    var t = '';

    if (!parts.hostname) {
      return '';
    } else if (URI.ip6_expression.test(parts.hostname)) {
      t += '[' + parts.hostname + ']';
    } else {
      t += parts.hostname;
    }

    if (parts.port) {
      t += ':' + parts.port;
    }

    return t;
  };
  URI.buildAuthority = function(parts) {
    return URI.buildUserinfo(parts) + URI.buildHost(parts);
  };
  URI.buildUserinfo = function(parts) {
    var t = '';

    if (parts.username) {
      t += URI.encode(parts.username);
    }

    if (parts.password) {
      t += ':' + URI.encode(parts.password);
    }

    if (t) {
      t += '@';
    }

    return t;
  };
  URI.buildQuery = function(data, duplicateQueryParameters, escapeQuerySpace) {
    // according to http://tools.ietf.org/html/rfc3986 or http://labs.apache.org/webarch/uri/rfc/rfc3986.html
    // being »-._~!$&'()*+,;=:@/?« %HEX and alnum are allowed
    // the RFC explicitly states ?/foo being a valid use case, no mention of parameter syntax!
    // URI.js treats the query string as being application/x-www-form-urlencoded
    // see http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type

    var t = '';
    var unique, key, i, length;
    for (key in data) {
      if (key === '__proto__') {
        // ignore attempt at exploiting JavaScript internals
        continue;
      } else if (hasOwn.call(data, key)) {
        if (isArray(data[key])) {
          unique = {};
          for (i = 0, length = data[key].length; i < length; i++) {
            if (data[key][i] !== undefined && unique[data[key][i] + ''] === undefined) {
              t += '&' + URI.buildQueryParameter(key, data[key][i], escapeQuerySpace);
              if (duplicateQueryParameters !== true) {
                unique[data[key][i] + ''] = true;
              }
            }
          }
        } else if (data[key] !== undefined) {
          t += '&' + URI.buildQueryParameter(key, data[key], escapeQuerySpace);
        }
      }
    }

    return t.substring(1);
  };
  URI.buildQueryParameter = function(name, value, escapeQuerySpace) {
    // http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type -- application/x-www-form-urlencoded
    // don't append "=" for null values, according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#url-parameter-serialization
    return URI.encodeQuery(name, escapeQuerySpace) + (value !== null ? '=' + URI.encodeQuery(value, escapeQuerySpace) : '');
  };

  URI.addQuery = function(data, name, value) {
    if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          URI.addQuery(data, key, name[key]);
        }
      }
    } else if (typeof name === 'string') {
      if (data[name] === undefined) {
        data[name] = value;
        return;
      } else if (typeof data[name] === 'string') {
        data[name] = [data[name]];
      }

      if (!isArray(value)) {
        value = [value];
      }

      data[name] = (data[name] || []).concat(value);
    } else {
      throw new TypeError('URI.addQuery() accepts an object, string as the name parameter');
    }
  };

  URI.setQuery = function(data, name, value) {
    if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          URI.setQuery(data, key, name[key]);
        }
      }
    } else if (typeof name === 'string') {
      data[name] = value === undefined ? null : value;
    } else {
      throw new TypeError('URI.setQuery() accepts an object, string as the name parameter');
    }
  };

  URI.removeQuery = function(data, name, value) {
    var i, length, key;

    if (isArray(name)) {
      for (i = 0, length = name.length; i < length; i++) {
        data[name[i]] = undefined;
      }
    } else if (getType(name) === 'RegExp') {
      for (key in data) {
        if (name.test(key)) {
          data[key] = undefined;
        }
      }
    } else if (typeof name === 'object') {
      for (key in name) {
        if (hasOwn.call(name, key)) {
          URI.removeQuery(data, key, name[key]);
        }
      }
    } else if (typeof name === 'string') {
      if (value !== undefined) {
        if (getType(value) === 'RegExp') {
          if (!isArray(data[name]) && value.test(data[name])) {
            data[name] = undefined;
          } else {
            data[name] = filterArrayValues(data[name], value);
          }
        } else if (data[name] === String(value) && (!isArray(value) || value.length === 1)) {
          data[name] = undefined;
        } else if (isArray(data[name])) {
          data[name] = filterArrayValues(data[name], value);
        }
      } else {
        data[name] = undefined;
      }
    } else {
      throw new TypeError('URI.removeQuery() accepts an object, string, RegExp as the first parameter');
    }
  };
  URI.hasQuery = function(data, name, value, withinArray) {
    switch (getType(name)) {
      case 'String':
        // Nothing to do here
        break;

      case 'RegExp':
        for (var key in data) {
          if (hasOwn.call(data, key)) {
            if (name.test(key) && (value === undefined || URI.hasQuery(data, key, value))) {
              return true;
            }
          }
        }

        return false;

      case 'Object':
        for (var _key in name) {
          if (hasOwn.call(name, _key)) {
            if (!URI.hasQuery(data, _key, name[_key])) {
              return false;
            }
          }
        }

        return true;

      default:
        throw new TypeError('URI.hasQuery() accepts a string, regular expression or object as the name parameter');
    }

    switch (getType(value)) {
      case 'Undefined':
        // true if exists (but may be empty)
        return name in data; // data[name] !== undefined;

      case 'Boolean':
        // true if exists and non-empty
        var _booly = Boolean(isArray(data[name]) ? data[name].length : data[name]);
        return value === _booly;

      case 'Function':
        // allow complex comparison
        return !!value(data[name], name, data);

      case 'Array':
        if (!isArray(data[name])) {
          return false;
        }

        var op = withinArray ? arrayContains : arraysEqual;
        return op(data[name], value);

      case 'RegExp':
        if (!isArray(data[name])) {
          return Boolean(data[name] && data[name].match(value));
        }

        if (!withinArray) {
          return false;
        }

        return arrayContains(data[name], value);

      case 'Number':
        value = String(value);
        /* falls through */
      case 'String':
        if (!isArray(data[name])) {
          return data[name] === value;
        }

        if (!withinArray) {
          return false;
        }

        return arrayContains(data[name], value);

      default:
        throw new TypeError('URI.hasQuery() accepts undefined, boolean, string, number, RegExp, Function as the value parameter');
    }
  };


  URI.joinPaths = function() {
    var input = [];
    var segments = [];
    var nonEmptySegments = 0;

    for (var i = 0; i < arguments.length; i++) {
      var url = new URI(arguments[i]);
      input.push(url);
      var _segments = url.segment();
      for (var s = 0; s < _segments.length; s++) {
        if (typeof _segments[s] === 'string') {
          segments.push(_segments[s]);
        }

        if (_segments[s]) {
          nonEmptySegments++;
        }
      }
    }

    if (!segments.length || !nonEmptySegments) {
      return new URI('');
    }

    var uri = new URI('').segment(segments);

    if (input[0].path() === '' || input[0].path().slice(0, 1) === '/') {
      uri.path('/' + uri.path());
    }

    return uri.normalize();
  };

  URI.commonPath = function(one, two) {
    var length = Math.min(one.length, two.length);
    var pos;

    // find first non-matching character
    for (pos = 0; pos < length; pos++) {
      if (one.charAt(pos) !== two.charAt(pos)) {
        pos--;
        break;
      }
    }

    if (pos < 1) {
      return one.charAt(0) === two.charAt(0) && one.charAt(0) === '/' ? '/' : '';
    }

    // revert to last /
    if (one.charAt(pos) !== '/' || two.charAt(pos) !== '/') {
      pos = one.substring(0, pos).lastIndexOf('/');
    }

    return one.substring(0, pos + 1);
  };

  URI.withinString = function(string, callback, options) {
    options || (options = {});
    var _start = options.start || URI.findUri.start;
    var _end = options.end || URI.findUri.end;
    var _trim = options.trim || URI.findUri.trim;
    var _parens = options.parens || URI.findUri.parens;
    var _attributeOpen = /[a-z0-9-]=["']?$/i;

    _start.lastIndex = 0;
    while (true) {
      var match = _start.exec(string);
      if (!match) {
        break;
      }

      var start = match.index;
      if (options.ignoreHtml) {
        // attribut(e=["']?$)
        var attributeOpen = string.slice(Math.max(start - 3, 0), start);
        if (attributeOpen && _attributeOpen.test(attributeOpen)) {
          continue;
        }
      }

      var end = start + string.slice(start).search(_end);
      var slice = string.slice(start, end);
      // make sure we include well balanced parens
      var parensEnd = -1;
      while (true) {
        var parensMatch = _parens.exec(slice);
        if (!parensMatch) {
          break;
        }

        var parensMatchEnd = parensMatch.index + parensMatch[0].length;
        parensEnd = Math.max(parensEnd, parensMatchEnd);
      }

      if (parensEnd > -1) {
        slice = slice.slice(0, parensEnd) + slice.slice(parensEnd).replace(_trim, '');
      } else {
        slice = slice.replace(_trim, '');
      }

      if (slice.length <= match[0].length) {
        // the extract only contains the starting marker of a URI,
        // e.g. "www" or "http://"
        continue;
      }

      if (options.ignore && options.ignore.test(slice)) {
        continue;
      }

      end = start + slice.length;
      var result = callback(slice, start, end, string);
      if (result === undefined) {
        _start.lastIndex = end;
        continue;
      }

      result = String(result);
      string = string.slice(0, start) + result + string.slice(end);
      _start.lastIndex = start + result.length;
    }

    _start.lastIndex = 0;
    return string;
  };

  URI.ensureValidHostname = function(v, protocol) {
    // Theoretically URIs allow percent-encoding in Hostnames (according to RFC 3986)
    // they are not part of DNS and therefore ignored by URI.js

    var hasHostname = !!v; // not null and not an empty string
    var hasProtocol = !!protocol;
    var rejectEmptyHostname = false;

    if (hasProtocol) {
      rejectEmptyHostname = arrayContains(URI.hostProtocols, protocol);
    }

    if (rejectEmptyHostname && !hasHostname) {
      throw new TypeError('Hostname cannot be empty, if protocol is ' + protocol);
    } else if (v && v.match(URI.invalid_hostname_characters)) {
      // test punycode
      if (!punycode) {
        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-:_] and Punycode.js is not available');
      }
      if (punycode.toASCII(v).match(URI.invalid_hostname_characters)) {
        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-:_]');
      }
    }
  };

  URI.ensureValidPort = function (v) {
    if (!v) {
      return;
    }

    var port = Number(v);
    if (isInteger(port) && (port > 0) && (port < 65536)) {
      return;
    }

    throw new TypeError('Port "' + v + '" is not a valid port');
  };

  // noConflict
  URI.noConflict = function(removeAll) {
    if (removeAll) {
      var unconflicted = {
        URI: this.noConflict()
      };

      if (root.URITemplate && typeof root.URITemplate.noConflict === 'function') {
        unconflicted.URITemplate = root.URITemplate.noConflict();
      }

      if (root.IPv6 && typeof root.IPv6.noConflict === 'function') {
        unconflicted.IPv6 = root.IPv6.noConflict();
      }

      if (root.SecondLevelDomains && typeof root.SecondLevelDomains.noConflict === 'function') {
        unconflicted.SecondLevelDomains = root.SecondLevelDomains.noConflict();
      }

      return unconflicted;
    } else if (root.URI === this) {
      root.URI = _URI;
    }

    return this;
  };

  p.build = function(deferBuild) {
    if (deferBuild === true) {
      this._deferred_build = true;
    } else if (deferBuild === undefined || this._deferred_build) {
      this._string = URI.build(this._parts);
      this._deferred_build = false;
    }

    return this;
  };

  p.clone = function() {
    return new URI(this);
  };

  p.valueOf = p.toString = function() {
    return this.build(false)._string;
  };


  function generateSimpleAccessor(_part){
    return function(v, build) {
      if (v === undefined) {
        return this._parts[_part] || '';
      } else {
        this._parts[_part] = v || null;
        this.build(!build);
        return this;
      }
    };
  }

  function generatePrefixAccessor(_part, _key){
    return function(v, build) {
      if (v === undefined) {
        return this._parts[_part] || '';
      } else {
        if (v !== null) {
          v = v + '';
          if (v.charAt(0) === _key) {
            v = v.substring(1);
          }
        }

        this._parts[_part] = v;
        this.build(!build);
        return this;
      }
    };
  }

  p.protocol = generateSimpleAccessor('protocol');
  p.username = generateSimpleAccessor('username');
  p.password = generateSimpleAccessor('password');
  p.hostname = generateSimpleAccessor('hostname');
  p.port = generateSimpleAccessor('port');
  p.query = generatePrefixAccessor('query', '?');
  p.fragment = generatePrefixAccessor('fragment', '#');

  p.search = function(v, build) {
    var t = this.query(v, build);
    return typeof t === 'string' && t.length ? ('?' + t) : t;
  };
  p.hash = function(v, build) {
    var t = this.fragment(v, build);
    return typeof t === 'string' && t.length ? ('#' + t) : t;
  };

  p.pathname = function(v, build) {
    if (v === undefined || v === true) {
      var res = this._parts.path || (this._parts.hostname ? '/' : '');
      return v ? (this._parts.urn ? URI.decodeUrnPath : URI.decodePath)(res) : res;
    } else {
      if (this._parts.urn) {
        this._parts.path = v ? URI.recodeUrnPath(v) : '';
      } else {
        this._parts.path = v ? URI.recodePath(v) : '/';
      }
      this.build(!build);
      return this;
    }
  };
  p.path = p.pathname;
  p.href = function(href, build) {
    var key;

    if (href === undefined) {
      return this.toString();
    }

    this._string = '';
    this._parts = URI._parts();

    var _URI = href instanceof URI;
    var _object = typeof href === 'object' && (href.hostname || href.path || href.pathname);
    if (href.nodeName) {
      var attribute = URI.getDomAttribute(href);
      href = href[attribute] || '';
      _object = false;
    }

    // window.location is reported to be an object, but it's not the sort
    // of object we're looking for:
    // * location.protocol ends with a colon
    // * location.query != object.search
    // * location.hash != object.fragment
    // simply serializing the unknown object should do the trick
    // (for location, not for everything...)
    if (!_URI && _object && href.pathname !== undefined) {
      href = href.toString();
    }

    if (typeof href === 'string' || href instanceof String) {
      this._parts = URI.parse(String(href), this._parts);
    } else if (_URI || _object) {
      var src = _URI ? href._parts : href;
      for (key in src) {
        if (key === 'query') { continue; }
        if (hasOwn.call(this._parts, key)) {
          this._parts[key] = src[key];
        }
      }
      if (src.query) {
        this.query(src.query, false);
      }
    } else {
      throw new TypeError('invalid input');
    }

    this.build(!build);
    return this;
  };

  // identification accessors
  p.is = function(what) {
    var ip = false;
    var ip4 = false;
    var ip6 = false;
    var name = false;
    var sld = false;
    var idn = false;
    var punycode = false;
    var relative = !this._parts.urn;

    if (this._parts.hostname) {
      relative = false;
      ip4 = URI.ip4_expression.test(this._parts.hostname);
      ip6 = URI.ip6_expression.test(this._parts.hostname);
      ip = ip4 || ip6;
      name = !ip;
      sld = name && SLD && SLD.has(this._parts.hostname);
      idn = name && URI.idn_expression.test(this._parts.hostname);
      punycode = name && URI.punycode_expression.test(this._parts.hostname);
    }

    switch (what.toLowerCase()) {
      case 'relative':
        return relative;

      case 'absolute':
        return !relative;

      // hostname identification
      case 'domain':
      case 'name':
        return name;

      case 'sld':
        return sld;

      case 'ip':
        return ip;

      case 'ip4':
      case 'ipv4':
      case 'inet4':
        return ip4;

      case 'ip6':
      case 'ipv6':
      case 'inet6':
        return ip6;

      case 'idn':
        return idn;

      case 'url':
        return !this._parts.urn;

      case 'urn':
        return !!this._parts.urn;

      case 'punycode':
        return punycode;
    }

    return null;
  };

  // component specific input validation
  var _protocol = p.protocol;
  var _port = p.port;
  var _hostname = p.hostname;

  p.protocol = function(v, build) {
    if (v) {
      // accept trailing ://
      v = v.replace(/:(\/\/)?$/, '');

      if (!v.match(URI.protocol_expression)) {
        throw new TypeError('Protocol "' + v + '" contains characters other than [A-Z0-9.+-] or doesn\'t start with [A-Z]');
      }
    }

    return _protocol.call(this, v, build);
  };
  p.scheme = p.protocol;
  p.port = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v !== undefined) {
      if (v === 0) {
        v = null;
      }

      if (v) {
        v += '';
        if (v.charAt(0) === ':') {
          v = v.substring(1);
        }

        URI.ensureValidPort(v);
      }
    }
    return _port.call(this, v, build);
  };
  p.hostname = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v !== undefined) {
      var x = { preventInvalidHostname: this._parts.preventInvalidHostname };
      var res = URI.parseHost(v, x);
      if (res !== '/') {
        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-]');
      }

      v = x.hostname;
      if (this._parts.preventInvalidHostname) {
        URI.ensureValidHostname(v, this._parts.protocol);
      }
    }

    return _hostname.call(this, v, build);
  };

  // compound accessors
  p.origin = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined) {
      var protocol = this.protocol();
      var authority = this.authority();
      if (!authority) {
        return '';
      }

      return (protocol ? protocol + '://' : '') + this.authority();
    } else {
      var origin = URI(v);
      this
        .protocol(origin.protocol())
        .authority(origin.authority())
        .build(!build);
      return this;
    }
  };
  p.host = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined) {
      return this._parts.hostname ? URI.buildHost(this._parts) : '';
    } else {
      var res = URI.parseHost(v, this._parts);
      if (res !== '/') {
        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-]');
      }

      this.build(!build);
      return this;
    }
  };
  p.authority = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined) {
      return this._parts.hostname ? URI.buildAuthority(this._parts) : '';
    } else {
      var res = URI.parseAuthority(v, this._parts);
      if (res !== '/') {
        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-]');
      }

      this.build(!build);
      return this;
    }
  };
  p.userinfo = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined) {
      var t = URI.buildUserinfo(this._parts);
      return t ? t.substring(0, t.length -1) : t;
    } else {
      if (v[v.length-1] !== '@') {
        v += '@';
      }

      URI.parseUserinfo(v, this._parts);
      this.build(!build);
      return this;
    }
  };
  p.resource = function(v, build) {
    var parts;

    if (v === undefined) {
      return this.path() + this.search() + this.hash();
    }

    parts = URI.parse(v);
    this._parts.path = parts.path;
    this._parts.query = parts.query;
    this._parts.fragment = parts.fragment;
    this.build(!build);
    return this;
  };

  // fraction accessors
  p.subdomain = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    // convenience, return "www" from "www.example.org"
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }

      // grab domain and add another segment
      var end = this._parts.hostname.length - this.domain().length - 1;
      return this._parts.hostname.substring(0, end) || '';
    } else {
      var e = this._parts.hostname.length - this.domain().length;
      var sub = this._parts.hostname.substring(0, e);
      var replace = new RegExp('^' + escapeRegEx(sub));

      if (v && v.charAt(v.length - 1) !== '.') {
        v += '.';
      }

      if (v.indexOf(':') !== -1) {
        throw new TypeError('Domains cannot contain colons');
      }

      if (v) {
        URI.ensureValidHostname(v, this._parts.protocol);
      }

      this._parts.hostname = this._parts.hostname.replace(replace, v);
      this.build(!build);
      return this;
    }
  };
  p.domain = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (typeof v === 'boolean') {
      build = v;
      v = undefined;
    }

    // convenience, return "example.org" from "www.example.org"
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }

      // if hostname consists of 1 or 2 segments, it must be the domain
      var t = this._parts.hostname.match(/\./g);
      if (t && t.length < 2) {
        return this._parts.hostname;
      }

      // grab tld and add another segment
      var end = this._parts.hostname.length - this.tld(build).length - 1;
      end = this._parts.hostname.lastIndexOf('.', end -1) + 1;
      return this._parts.hostname.substring(end) || '';
    } else {
      if (!v) {
        throw new TypeError('cannot set domain empty');
      }

      if (v.indexOf(':') !== -1) {
        throw new TypeError('Domains cannot contain colons');
      }

      URI.ensureValidHostname(v, this._parts.protocol);

      if (!this._parts.hostname || this.is('IP')) {
        this._parts.hostname = v;
      } else {
        var replace = new RegExp(escapeRegEx(this.domain()) + '$');
        this._parts.hostname = this._parts.hostname.replace(replace, v);
      }

      this.build(!build);
      return this;
    }
  };
  p.tld = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (typeof v === 'boolean') {
      build = v;
      v = undefined;
    }

    // return "org" from "www.example.org"
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }

      var pos = this._parts.hostname.lastIndexOf('.');
      var tld = this._parts.hostname.substring(pos + 1);

      if (build !== true && SLD && SLD.list[tld.toLowerCase()]) {
        return SLD.get(this._parts.hostname) || tld;
      }

      return tld;
    } else {
      var replace;

      if (!v) {
        throw new TypeError('cannot set TLD empty');
      } else if (v.match(/[^a-zA-Z0-9-]/)) {
        if (SLD && SLD.is(v)) {
          replace = new RegExp(escapeRegEx(this.tld()) + '$');
          this._parts.hostname = this._parts.hostname.replace(replace, v);
        } else {
          throw new TypeError('TLD "' + v + '" contains characters other than [A-Z0-9]');
        }
      } else if (!this._parts.hostname || this.is('IP')) {
        throw new ReferenceError('cannot set TLD on non-domain host');
      } else {
        replace = new RegExp(escapeRegEx(this.tld()) + '$');
        this._parts.hostname = this._parts.hostname.replace(replace, v);
      }

      this.build(!build);
      return this;
    }
  };
  p.directory = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined || v === true) {
      if (!this._parts.path && !this._parts.hostname) {
        return '';
      }

      if (this._parts.path === '/') {
        return '/';
      }

      var end = this._parts.path.length - this.filename().length - 1;
      var res = this._parts.path.substring(0, end) || (this._parts.hostname ? '/' : '');

      return v ? URI.decodePath(res) : res;

    } else {
      var e = this._parts.path.length - this.filename().length;
      var directory = this._parts.path.substring(0, e);
      var replace = new RegExp('^' + escapeRegEx(directory));

      // fully qualifier directories begin with a slash
      if (!this.is('relative')) {
        if (!v) {
          v = '/';
        }

        if (v.charAt(0) !== '/') {
          v = '/' + v;
        }
      }

      // directories always end with a slash
      if (v && v.charAt(v.length - 1) !== '/') {
        v += '/';
      }

      v = URI.recodePath(v);
      this._parts.path = this._parts.path.replace(replace, v);
      this.build(!build);
      return this;
    }
  };
  p.filename = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (typeof v !== 'string') {
      if (!this._parts.path || this._parts.path === '/') {
        return '';
      }

      var pos = this._parts.path.lastIndexOf('/');
      var res = this._parts.path.substring(pos+1);

      return v ? URI.decodePathSegment(res) : res;
    } else {
      var mutatedDirectory = false;

      if (v.charAt(0) === '/') {
        v = v.substring(1);
      }

      if (v.match(/\.?\//)) {
        mutatedDirectory = true;
      }

      var replace = new RegExp(escapeRegEx(this.filename()) + '$');
      v = URI.recodePath(v);
      this._parts.path = this._parts.path.replace(replace, v);

      if (mutatedDirectory) {
        this.normalizePath(build);
      } else {
        this.build(!build);
      }

      return this;
    }
  };
  p.suffix = function(v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }

    if (v === undefined || v === true) {
      if (!this._parts.path || this._parts.path === '/') {
        return '';
      }

      var filename = this.filename();
      var pos = filename.lastIndexOf('.');
      var s, res;

      if (pos === -1) {
        return '';
      }

      // suffix may only contain alnum characters (yup, I made this up.)
      s = filename.substring(pos+1);
      res = (/^[a-z0-9%]+$/i).test(s) ? s : '';
      return v ? URI.decodePathSegment(res) : res;
    } else {
      if (v.charAt(0) === '.') {
        v = v.substring(1);
      }

      var suffix = this.suffix();
      var replace;

      if (!suffix) {
        if (!v) {
          return this;
        }

        this._parts.path += '.' + URI.recodePath(v);
      } else if (!v) {
        replace = new RegExp(escapeRegEx('.' + suffix) + '$');
      } else {
        replace = new RegExp(escapeRegEx(suffix) + '$');
      }

      if (replace) {
        v = URI.recodePath(v);
        this._parts.path = this._parts.path.replace(replace, v);
      }

      this.build(!build);
      return this;
    }
  };
  p.segment = function(segment, v, build) {
    var separator = this._parts.urn ? ':' : '/';
    var path = this.path();
    var absolute = path.substring(0, 1) === '/';
    var segments = path.split(separator);

    if (segment !== undefined && typeof segment !== 'number') {
      build = v;
      v = segment;
      segment = undefined;
    }

    if (segment !== undefined && typeof segment !== 'number') {
      throw new Error('Bad segment "' + segment + '", must be 0-based integer');
    }

    if (absolute) {
      segments.shift();
    }

    if (segment < 0) {
      // allow negative indexes to address from the end
      segment = Math.max(segments.length + segment, 0);
    }

    if (v === undefined) {
      /*jshint laxbreak: true */
      return segment === undefined
        ? segments
        : segments[segment];
      /*jshint laxbreak: false */
    } else if (segment === null || segments[segment] === undefined) {
      if (isArray(v)) {
        segments = [];
        // collapse empty elements within array
        for (var i=0, l=v.length; i < l; i++) {
          if (!v[i].length && (!segments.length || !segments[segments.length -1].length)) {
            continue;
          }

          if (segments.length && !segments[segments.length -1].length) {
            segments.pop();
          }

          segments.push(trimSlashes(v[i]));
        }
      } else if (v || typeof v === 'string') {
        v = trimSlashes(v);
        if (segments[segments.length -1] === '') {
          // empty trailing elements have to be overwritten
          // to prevent results such as /foo//bar
          segments[segments.length -1] = v;
        } else {
          segments.push(v);
        }
      }
    } else {
      if (v) {
        segments[segment] = trimSlashes(v);
      } else {
        segments.splice(segment, 1);
      }
    }

    if (absolute) {
      segments.unshift('');
    }

    return this.path(segments.join(separator), build);
  };
  p.segmentCoded = function(segment, v, build) {
    var segments, i, l;

    if (typeof segment !== 'number') {
      build = v;
      v = segment;
      segment = undefined;
    }

    if (v === undefined) {
      segments = this.segment(segment, v, build);
      if (!isArray(segments)) {
        segments = segments !== undefined ? URI.decode(segments) : undefined;
      } else {
        for (i = 0, l = segments.length; i < l; i++) {
          segments[i] = URI.decode(segments[i]);
        }
      }

      return segments;
    }

    if (!isArray(v)) {
      v = (typeof v === 'string' || v instanceof String) ? URI.encode(v) : v;
    } else {
      for (i = 0, l = v.length; i < l; i++) {
        v[i] = URI.encode(v[i]);
      }
    }

    return this.segment(segment, v, build);
  };

  // mutating query string
  var q = p.query;
  p.query = function(v, build) {
    if (v === true) {
      return URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    } else if (typeof v === 'function') {
      var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
      var result = v.call(this, data);
      this._parts.query = URI.buildQuery(result || data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
      this.build(!build);
      return this;
    } else if (v !== undefined && typeof v !== 'string') {
      this._parts.query = URI.buildQuery(v, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
      this.build(!build);
      return this;
    } else {
      return q.call(this, v, build);
    }
  };
  p.setQuery = function(name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);

    if (typeof name === 'string' || name instanceof String) {
      data[name] = value !== undefined ? value : null;
    } else if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          data[key] = name[key];
        }
      }
    } else {
      throw new TypeError('URI.addQuery() accepts an object, string as the name parameter');
    }

    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }

    this.build(!build);
    return this;
  };
  p.addQuery = function(name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    URI.addQuery(data, name, value === undefined ? null : value);
    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }

    this.build(!build);
    return this;
  };
  p.removeQuery = function(name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    URI.removeQuery(data, name, value);
    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }

    this.build(!build);
    return this;
  };
  p.hasQuery = function(name, value, withinArray) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    return URI.hasQuery(data, name, value, withinArray);
  };
  p.setSearch = p.setQuery;
  p.addSearch = p.addQuery;
  p.removeSearch = p.removeQuery;
  p.hasSearch = p.hasQuery;

  // sanitizing URLs
  p.normalize = function() {
    if (this._parts.urn) {
      return this
        .normalizeProtocol(false)
        .normalizePath(false)
        .normalizeQuery(false)
        .normalizeFragment(false)
        .build();
    }

    return this
      .normalizeProtocol(false)
      .normalizeHostname(false)
      .normalizePort(false)
      .normalizePath(false)
      .normalizeQuery(false)
      .normalizeFragment(false)
      .build();
  };
  p.normalizeProtocol = function(build) {
    if (typeof this._parts.protocol === 'string') {
      this._parts.protocol = this._parts.protocol.toLowerCase();
      this.build(!build);
    }

    return this;
  };
  p.normalizeHostname = function(build) {
    if (this._parts.hostname) {
      if (this.is('IDN') && punycode) {
        this._parts.hostname = punycode.toASCII(this._parts.hostname);
      } else if (this.is('IPv6') && IPv6) {
        this._parts.hostname = IPv6.best(this._parts.hostname);
      }

      this._parts.hostname = this._parts.hostname.toLowerCase();
      this.build(!build);
    }

    return this;
  };
  p.normalizePort = function(build) {
    // remove port of it's the protocol's default
    if (typeof this._parts.protocol === 'string' && this._parts.port === URI.defaultPorts[this._parts.protocol]) {
      this._parts.port = null;
      this.build(!build);
    }

    return this;
  };
  p.normalizePath = function(build) {
    var _path = this._parts.path;
    if (!_path) {
      return this;
    }

    if (this._parts.urn) {
      this._parts.path = URI.recodeUrnPath(this._parts.path);
      this.build(!build);
      return this;
    }

    if (this._parts.path === '/') {
      return this;
    }

    _path = URI.recodePath(_path);

    var _was_relative;
    var _leadingParents = '';
    var _parent, _pos;

    // handle relative paths
    if (_path.charAt(0) !== '/') {
      _was_relative = true;
      _path = '/' + _path;
    }

    // handle relative files (as opposed to directories)
    if (_path.slice(-3) === '/..' || _path.slice(-2) === '/.') {
      _path += '/';
    }

    // resolve simples
    _path = _path
      .replace(/(\/(\.\/)+)|(\/\.$)/g, '/')
      .replace(/\/{2,}/g, '/');

    // remember leading parents
    if (_was_relative) {
      _leadingParents = _path.substring(1).match(/^(\.\.\/)+/) || '';
      if (_leadingParents) {
        _leadingParents = _leadingParents[0];
      }
    }

    // resolve parents
    while (true) {
      _parent = _path.search(/\/\.\.(\/|$)/);
      if (_parent === -1) {
        // no more ../ to resolve
        break;
      } else if (_parent === 0) {
        // top level cannot be relative, skip it
        _path = _path.substring(3);
        continue;
      }

      _pos = _path.substring(0, _parent).lastIndexOf('/');
      if (_pos === -1) {
        _pos = _parent;
      }
      _path = _path.substring(0, _pos) + _path.substring(_parent + 3);
    }

    // revert to relative
    if (_was_relative && this.is('relative')) {
      _path = _leadingParents + _path.substring(1);
    }

    this._parts.path = _path;
    this.build(!build);
    return this;
  };
  p.normalizePathname = p.normalizePath;
  p.normalizeQuery = function(build) {
    if (typeof this._parts.query === 'string') {
      if (!this._parts.query.length) {
        this._parts.query = null;
      } else {
        this.query(URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace));
      }

      this.build(!build);
    }

    return this;
  };
  p.normalizeFragment = function(build) {
    if (!this._parts.fragment) {
      this._parts.fragment = null;
      this.build(!build);
    }

    return this;
  };
  p.normalizeSearch = p.normalizeQuery;
  p.normalizeHash = p.normalizeFragment;

  p.iso8859 = function() {
    // expect unicode input, iso8859 output
    var e = URI.encode;
    var d = URI.decode;

    URI.encode = escape;
    URI.decode = decodeURIComponent;
    try {
      this.normalize();
    } finally {
      URI.encode = e;
      URI.decode = d;
    }
    return this;
  };

  p.unicode = function() {
    // expect iso8859 input, unicode output
    var e = URI.encode;
    var d = URI.decode;

    URI.encode = strictEncodeURIComponent;
    URI.decode = unescape;
    try {
      this.normalize();
    } finally {
      URI.encode = e;
      URI.decode = d;
    }
    return this;
  };

  p.readable = function() {
    var uri = this.clone();
    // removing username, password, because they shouldn't be displayed according to RFC 3986
    uri.username('').password('').normalize();
    var t = '';
    if (uri._parts.protocol) {
      t += uri._parts.protocol + '://';
    }

    if (uri._parts.hostname) {
      if (uri.is('punycode') && punycode) {
        t += punycode.toUnicode(uri._parts.hostname);
        if (uri._parts.port) {
          t += ':' + uri._parts.port;
        }
      } else {
        t += uri.host();
      }
    }

    if (uri._parts.hostname && uri._parts.path && uri._parts.path.charAt(0) !== '/') {
      t += '/';
    }

    t += uri.path(true);
    if (uri._parts.query) {
      var q = '';
      for (var i = 0, qp = uri._parts.query.split('&'), l = qp.length; i < l; i++) {
        var kv = (qp[i] || '').split('=');
        q += '&' + URI.decodeQuery(kv[0], this._parts.escapeQuerySpace)
          .replace(/&/g, '%26');

        if (kv[1] !== undefined) {
          q += '=' + URI.decodeQuery(kv[1], this._parts.escapeQuerySpace)
            .replace(/&/g, '%26');
        }
      }
      t += '?' + q.substring(1);
    }

    t += URI.decodeQuery(uri.hash(), true);
    return t;
  };

  // resolving relative and absolute URLs
  p.absoluteTo = function(base) {
    var resolved = this.clone();
    var properties = ['protocol', 'username', 'password', 'hostname', 'port'];
    var basedir, i, p;

    if (this._parts.urn) {
      throw new Error('URNs do not have any generally defined hierarchical components');
    }

    if (!(base instanceof URI)) {
      base = new URI(base);
    }

    if (resolved._parts.protocol) {
      // Directly returns even if this._parts.hostname is empty.
      return resolved;
    } else {
      resolved._parts.protocol = base._parts.protocol;
    }

    if (this._parts.hostname) {
      return resolved;
    }

    for (i = 0; (p = properties[i]); i++) {
      resolved._parts[p] = base._parts[p];
    }

    if (!resolved._parts.path) {
      resolved._parts.path = base._parts.path;
      if (!resolved._parts.query) {
        resolved._parts.query = base._parts.query;
      }
    } else {
      if (resolved._parts.path.substring(-2) === '..') {
        resolved._parts.path += '/';
      }

      if (resolved.path().charAt(0) !== '/') {
        basedir = base.directory();
        basedir = basedir ? basedir : base.path().indexOf('/') === 0 ? '/' : '';
        resolved._parts.path = (basedir ? (basedir + '/') : '') + resolved._parts.path;
        resolved.normalizePath();
      }
    }

    resolved.build();
    return resolved;
  };
  p.relativeTo = function(base) {
    var relative = this.clone().normalize();
    var relativeParts, baseParts, common, relativePath, basePath;

    if (relative._parts.urn) {
      throw new Error('URNs do not have any generally defined hierarchical components');
    }

    base = new URI(base).normalize();
    relativeParts = relative._parts;
    baseParts = base._parts;
    relativePath = relative.path();
    basePath = base.path();

    if (relativePath.charAt(0) !== '/') {
      throw new Error('URI is already relative');
    }

    if (basePath.charAt(0) !== '/') {
      throw new Error('Cannot calculate a URI relative to another relative URI');
    }

    if (relativeParts.protocol === baseParts.protocol) {
      relativeParts.protocol = null;
    }

    if (relativeParts.username !== baseParts.username || relativeParts.password !== baseParts.password) {
      return relative.build();
    }

    if (relativeParts.protocol !== null || relativeParts.username !== null || relativeParts.password !== null) {
      return relative.build();
    }

    if (relativeParts.hostname === baseParts.hostname && relativeParts.port === baseParts.port) {
      relativeParts.hostname = null;
      relativeParts.port = null;
    } else {
      return relative.build();
    }

    if (relativePath === basePath) {
      relativeParts.path = '';
      return relative.build();
    }

    // determine common sub path
    common = URI.commonPath(relativePath, basePath);

    // If the paths have nothing in common, return a relative URL with the absolute path.
    if (!common) {
      return relative.build();
    }

    var parents = baseParts.path
      .substring(common.length)
      .replace(/[^\/]*$/, '')
      .replace(/.*?\//g, '../');

    relativeParts.path = (parents + relativeParts.path.substring(common.length)) || './';

    return relative.build();
  };

  // comparing URIs
  p.equals = function(uri) {
    var one = this.clone();
    var two = new URI(uri);
    var one_map = {};
    var two_map = {};
    var checked = {};
    var one_query, two_query, key;

    one.normalize();
    two.normalize();

    // exact match
    if (one.toString() === two.toString()) {
      return true;
    }

    // extract query string
    one_query = one.query();
    two_query = two.query();
    one.query('');
    two.query('');

    // definitely not equal if not even non-query parts match
    if (one.toString() !== two.toString()) {
      return false;
    }

    // query parameters have the same length, even if they're permuted
    if (one_query.length !== two_query.length) {
      return false;
    }

    one_map = URI.parseQuery(one_query, this._parts.escapeQuerySpace);
    two_map = URI.parseQuery(two_query, this._parts.escapeQuerySpace);

    for (key in one_map) {
      if (hasOwn.call(one_map, key)) {
        if (!isArray(one_map[key])) {
          if (one_map[key] !== two_map[key]) {
            return false;
          }
        } else if (!arraysEqual(one_map[key], two_map[key])) {
          return false;
        }

        checked[key] = true;
      }
    }

    for (key in two_map) {
      if (hasOwn.call(two_map, key)) {
        if (!checked[key]) {
          // two contains a parameter not present in one
          return false;
        }
      }
    }

    return true;
  };

  // state
  p.preventInvalidHostname = function(v) {
    this._parts.preventInvalidHostname = !!v;
    return this;
  };

  p.duplicateQueryParameters = function(v) {
    this._parts.duplicateQueryParameters = !!v;
    return this;
  };

  p.escapeQuerySpace = function(v) {
    this._parts.escapeQuerySpace = !!v;
    return this;
  };

  return URI;
}));
}
});
//# sourceMappingURL=Calendar-preload.js.map
