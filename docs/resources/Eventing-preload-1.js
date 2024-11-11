//@ui5-bundle Eventing-preload-1.js
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides (optional) base class for all renderers
sap.ui.predefine("sap/ui/core/Renderer", [
	"sap/base/Log",
	"sap/base/i18n/Localization",
	"sap/base/util/isPlainObject",
	"sap/base/util/ObjectPath",
	"sap/base/assert",
	"sap/base/util/extend"
], function(Log, Localization, isPlainObject, ObjectPath, assert, extend) {
	"use strict";

	/**
	 * @classdesc Base Class for a Renderer.
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 * @namespace
	 * @public
	 * @alias sap.ui.core.Renderer
	 */
	var Renderer = {
	};

	// shortcut for lazy required Core library
	var sapUiCore;

	/**
	 * Helper to create a new renderer by extending an existing one.
	 *
	 * @this {sap.ui.core.Renderer} The base renderer to extend
	 * @param {string} sName Global name of the new renderer
	 * @param {object} oRendererInfo Methods and static properties of the new renderer
	 * @returns {object} New static renderer class
	 * @private
	 */
	function createExtendedRenderer(sName, oRendererInfo) {

		assert(this != null, 'BaseRenderer must be a non-null object');
		assert(typeof sName === 'string' && sName, 'Renderer.extend must be called with a non-empty name for the new renderer');
		assert(oRendererInfo == null ||
			(isPlainObject(oRendererInfo)
			 && Object.keys(oRendererInfo).every(function(key) { return oRendererInfo[key] !== undefined; })),
			'oRendererInfo can be omitted or must be a plain object without any undefined property values');

		var oChildRenderer = Object.create(this);
		// subclasses should expose the modern signature variant only
		oChildRenderer.extend = createExtendedRenderer;
		extend(oChildRenderer, oRendererInfo);

		/**
		 * @deprecated
		 */
		(() => {
			// expose the renderer globally
			ObjectPath.set(sName, oChildRenderer);
		})();

		return oChildRenderer;
	}

	/**
	 * Creates a new renderer that extends a given renderer.
	 *
	 * This method can be used with two signatures that are explained below. In both variants, the returned
	 * renderer inherits all properties (methods, fields) from the given parent renderer. Both variants
	 * also add an 'extend' method to the created renderer that behaves like the modern signature variant of
	 * this <code>Renderer.extend</code> method, but allows to extend the new renderer instead of
	 * <code>sap.ui.core.Renderer</code>.
	 *
	 *
	 * <h3>Modern Signature</h3>
	 *
	 * In the modern signature variant, two parameters must be given: a qualified name for the new renderer
	 * (its global name, in dot-notation), and an optional object literal that contains methods or fields
	 * to be added to the new renderer class.
	 *
	 * This signature has been designed to resemble the class extension mechanism as provided by
	 * {@link sap.ui.base.Object.extend Object.extend}.
	 *
	 * <pre>
	 * sap.ui.define(['sap/ui/core/Renderer'],
	 *     function(Renderer) {
	 *     "use strict";
	 *
	 *     var LabelRenderer = Renderer.extend('sap.m.LabelRenderer', {
	 *         render: function(oRM, oControl) {
	 *
	 *             renderPreamble(oRM, oControl);
	 *
	 *             // implementation core renderer logic here
	 *
	 *             renderPostamble(oRM, oControl);
	 *
	 *         },
	 *
	 *         renderPreamble : function(oRM, oControl) {
	 *         ...
	 *         },
	 *
	 *         renderPostamble : function(oRM, oControl) {
	 *         ...
	 *         }
	 *
	 *     });
	 *
	 *     return LabelRenderer;
	 * });
	 * </pre>
	 *
	 * The extension of renderers works across multiple levels. A <code>FancyLabelRenderer</code> can
	 * extend the above <code>LabelRenderer</code>:
	 *
	 * <pre>
	 * sap.ui.define(['sap/m/LabelRenderer'],
	 *     function(LabelRenderer) {
	 *     "use strict";
	 *
	 *     var FancyLabelRenderer = LabelRenderer.extend('sap.mylib.FancyLabelRenderer', {
	 *         render: function(oRM, oControl) {
	 *
	 *             // call base renderer
	 *             LabelRenderer.renderPreamble(oRM, oControl);
	 *
	 *             // ... do your own fancy rendering here
	 *
	 *             // call base renderer again
	 *             LabelRenderer.renderPostamble(oRM, oControl);
	 *         }
	 *     });
	 *
	 *     return FancyLabelRenderer;
	 * });
	 * </pre>
	 *
	 * <b>Note:</b> The modern signature no longer requires the <code>bExport</code> flag to be set for
	 * the enclosing {@link sap.ui.define} call. The Renderer base class takes care of the necessary
	 * global export of the renderer. This allows non-SAP developers to write a renderer that complies with
	 * the documented restriction for <code>sap.ui.define</code> (no use of bExport = true outside
	 * sap.ui.core projects).
	 *
	 *
	 * <h3>Deprecated Signature</h3>
	 *
	 * The deprecated old signature expects just one parameter: a renderer that should be extended.
	 * With that signature, the renderer can't be exported globally as the name of the renderer class
	 * is not known.
	 *
	 * For compatibility reasons, the class created by the deprecated signature contains a property
	 * <code>_super</code> that references the parent class. It shouldn't be used by applications / control
	 * developers as it doesn't work reliably for deeper inheritance chains: if the old variant of
	 * <code>Renderer.extend</code> is used on two or more levels of the inheritance hierarchy, the
	 * <code>_super</code> property of the resulting renderer class will always point to the implementation
	 * of the base renderer of the last call to extend. Instead of using <code>this._super</code>, renderer
	 * implementations should use the new signature variant and access the base implementation of a method
	 * via the AMD reference to the base renderer (as shown in the FancyLabelRenderer example above).
	 *
	 *
	 * <h3>Use as a Generic Method</h3>
	 *
	 * Only renderers that have been created with a call to <code>extend</code> will get their own
	 * <code>extend</code> method to create new subclasses. To allow extending from older renderers
	 * that have been written from scratch as a plain object, the <code>Renderer.extend</code> method
	 * can be called as a <i>generic method</i>, providing the base renderer as <code>this</code>.
	 *
	 * Example: Derive from <code>HBoxRenderer</code> (which is assumed to be a plain object)
	 * <pre>
	 * sap.ui.define(['sap/ui/core/Renderer', 'sap/m/HBoxRenderer'],
	 *     function(Renderer, HBoxRenderer) {
	 *     "use strict";
	 *
	 *     // Call 'extend' as a generic method, providing the HBoxRenderer as 'this'
	 *     var MyRenderer = Renderer.extend.call(HBoxRenderer, 'sap.m.LabelRenderer', {
	 *
	 *         someOverriddenHook: function(oRM, oControl) {
	 *         ...
	 *         },
	 *
	 *     });
	 *
	 *     return LabelRenderer;
	 * });
	 * </pre>
	 *
	 * <b>Note:</b> The deprecated signature cannot be used generically, it is only supported
	 * when called on <code>sap.ui.core.Renderer</code>.
	 *
	 * @this {sap.ui.core.Renderer} The renderer to extend from
	 * @param {string|object} vName Either the name of the new renderer class (modern signature) or the base
	 *                              renderer to extend (deprecated signature)
	 * @param {object} [oRendererInfo] Methods and/or properties that should be added to the new renderer class
	 * @throws {TypeError} When called as a generic method with the deprecated signature (<code>vName</code> is
	 *                     an object and <code>this</code> is not the <code>sap.ui.core.Renderer</code> class)
	 * @returns {object} A new renderer that can be enriched further
	 * @public
	 * @static
	 */
	Renderer.extend = function(vName, oRendererInfo) {
		if ( typeof vName === 'string' ) {
			// new call variant with name: create static 'subclass'
			return createExtendedRenderer.call(this, vName, oRendererInfo);
		} else if ( this === Renderer ) {
			// old variant without name: create static 'subclass' of Renderer itself
			var oChildRenderer = Object.create(vName || null);
			oChildRenderer._super = vName;
			oChildRenderer.extend = createExtendedRenderer;
			return oChildRenderer;
		} else {
			throw new TypeError("The signature extend(BaseRenderer) without a name can only be called on sap.ui.core.Renderer");
		}
	};

	/**
	 * Returns the TextAlignment for the provided configuration.
	 *
	 * @param {sap.ui.core.TextAlign} oTextAlign the text alignment of the Control
	 * @param {sap.ui.core.TextDirection} oTextDirection the text direction of the Control
	 * @returns {string} the actual text alignment that must be set for this environment
	 * @protected
	 */
	Renderer.getTextAlign = function(oTextAlign, oTextDirection) {
		// lazy require sap.ui.core library
		sapUiCore = sap.ui.require("sap/ui/core/library");

		/**
		 * @deprecated
		 */
		if (!sapUiCore) {
			Log.warning("Synchronous loading of a library.js. Ensure that 'sap/ui/core/library.js' is loaded" +
				" before sap.ui.core.Renderer#getTextAlign is called.", "SyncXHR", null, function() {
				return {
					type: "SyncXHR",
					name: "renderer-getTextAlign"
				};
			});
			sapUiCore = sap.ui.requireSync("sap/ui/core/library"); // legacy-relevant: core/library.js available via dependency in most cases
		}

		// create shortcuts for enums from sap.ui.core library
		var TextAlign = sapUiCore.TextAlign;
		var TextDirection = sapUiCore.TextDirection;

		var sTextAlign = "",
			bRTL = Localization.getRTL();

		switch (oTextAlign) {
		case TextAlign.End:
			switch (oTextDirection) {
			case TextDirection.LTR:
				sTextAlign = "right";
				break;
			case TextDirection.RTL:
				sTextAlign = "left";
				break;
			default:
				// this is really only influenced by the SAPUI5 configuration. The browser does not change alignment with text-direction
				sTextAlign = bRTL ? "left" : "right";
				break;
			}
			break;
		case TextAlign.Begin:
			switch (oTextDirection) {
			case TextDirection.LTR:
				sTextAlign = "left";
				break;
			case TextDirection.RTL:
				sTextAlign = "right";
				break;
			default:
				sTextAlign = bRTL ? "right" : "left";
				break;
			}
			break;
		case TextAlign.Right:
			if (!bRTL || oTextDirection == TextDirection.LTR) {
				sTextAlign = "right";
			}
			break;
		case TextAlign.Center:
			sTextAlign = "center";
			break;
		case TextAlign.Left:
			if (bRTL || oTextDirection == TextDirection.RTL) {
				sTextAlign = "left";
			}
			break;
		// no default
		}
		return sTextAlign;
	};

	return Renderer;

}, /* bExport= */ true);
/*!
 * copyright
 */

sap.ui.predefine("sap/ui/core/Theming", [
	"sap/base/assert",
	"sap/base/config",
	"sap/base/Event",
	"sap/base/Eventing",
	"sap/base/future",
	"sap/base/Log",
	"sap/base/i18n/Localization",
	"sap/base/util/deepEqual",
	"sap/ui/core/theming/ThemeHelper"
], function(
	assert,
	BaseConfig,
	BaseEvent,
	Eventing,
	future,
	Log,
	Localization,
	deepEqual,
	ThemeHelper
) {
	"use strict";

	const oWritableConfig = BaseConfig.getWritableInstance();
	const oEventing = new Eventing();
	let oThemeManager;

	/**
	 * Provides theming related API
	 *
	 * @alias module:sap/ui/core/Theming
	 * @namespace
	 * @public
	 * @since 1.118
	 */
	const Theming = {
		/**
		 * Returns the theme name
		 * @return {string} the theme name
		 * @public
		 * @since 1.118
		 */
		getTheme: () => {
			// analyze theme parameter
			let sTheme = oWritableConfig.get({
				name: "sapTheme",
				type: oWritableConfig.Type.String,
				defaultValue: oWritableConfig.get({
					name: "sapUiTheme",
					type: oWritableConfig.Type.String,
					external: true
				}),
				external: true
			});

			// Empty string is a valid value wrt. the <String> type.
			// An empty string is equivalent to "no theme given" here.
			// We apply the default, but also automatically detect the dark mode.
			if (sTheme === "") {
				const mDefaultThemeInfo = ThemeHelper.getDefaultThemeInfo();
				sTheme = `${mDefaultThemeInfo.DEFAULT_THEME}${mDefaultThemeInfo.DARK_MODE ? "_dark" : ""}`;
			}

			// It's only possible to provide a themeroot via theme parameter using
			// the initial config provider such as Global-, Bootstrap-, Meta- and
			// URLConfigurationProvider. The themeroot is also only validated against
			// allowedThemeOrigin in this case.
			const iIndex = sTheme.indexOf("@");
			if (iIndex >= 0) {
				const sThemeRoot = validateThemeRoot(sTheme.slice(iIndex + 1));
				sTheme = iIndex > 0 ? sTheme.slice(0, iIndex) : sTheme;
				if (sThemeRoot !== Theming.getThemeRoot(sTheme)) {
					Theming.setThemeRoot(sTheme, sThemeRoot);
				}
			}

			// validate theme and fallback to the fixed default, in case the configured theme is not valid
			sTheme = ThemeHelper.validateAndFallbackTheme(sTheme, Theming.getThemeRoot(sTheme));

			return sTheme;
		},

		/**
		 * Allows setting the theme name
		 * @param {string} sTheme the theme name
		 * @public
		 * @since 1.118
		 */
		setTheme: (sTheme) => {
			if (sTheme) {
				if (sTheme.indexOf("@") !== -1) {
					throw new TypeError("Providing a theme root as part of the theme parameter is not allowed.");
				}

				const sOldTheme = Theming.getTheme();
				oWritableConfig.set("sapTheme", sTheme);
				const sNewTheme = Theming.getTheme();
				const bThemeChanged = sOldTheme !== sNewTheme;
				if (bThemeChanged) {
					const mChanges = {
						theme: {
							"new": sNewTheme,
							"old": sOldTheme
						}
					};
					fireChange(mChanges);
				}
				if (!oThemeManager && bThemeChanged) {
					fireApplied({theme: sNewTheme});
				}
			}
		},

		/**
		 *
		 * @param {string} sTheme The Theme
		 * @param {string} [sLib] An optional library name
		 * @returns {string} The themeRoot if configured
		 * @private
		 * @ui5-restricted sap.ui.core.theming.ThemeManager
		 * @since 1.118
		 */
		getThemeRoot: (sTheme, sLib) => {
			const oThemeRoots = oWritableConfig.get({
				name: "sapUiThemeRoots",
				type: oWritableConfig.Type.MergedObject
			});
			let sThemeRoot;

			sTheme ??= Theming.getTheme();

			if (oThemeRoots[sTheme] && typeof oThemeRoots[sTheme] === "string") {
				sThemeRoot = oThemeRoots[sTheme];
			} else if (oThemeRoots[sTheme] && typeof oThemeRoots[sTheme] === "object") {
				sThemeRoot = oThemeRoots[sTheme][sLib] || oThemeRoots[sTheme][""];
			}

			return sThemeRoot;
		},

		/**
		 * Defines the root directory from below which UI5 should load the theme with the given name.
		 * Optionally allows restricting the setting to parts of a theme covering specific control libraries.
		 *
		 * Example:
		 * <pre>
		 *   Theming.setThemeRoot("my_theme", "https://mythemeserver.com/allThemes");
		 *   Theming.setTheme("my_theme");
		 * </pre>
		 *
		 * will cause the following file to be loaded (assuming that the bootstrap is configured to load
		 *  libraries <code>sap.m</code> and <code>sap.ui.layout</code>):
		 * <pre>
		 *   https://mythemeserver.com/allThemes/sap/ui/core/themes/my_theme/library.css
		 *   https://mythemeserver.com/allThemes/sap/ui/layout/themes/my_theme/library.css
		 *   https://mythemeserver.com/allThemes/sap/m/themes/my_theme/library.css
		 * </pre>
		 *
		 * If parts of the theme are at different locations (e.g. because you provide a standard theme
		 * like "sap_belize" for a custom control library and this self-made part of the standard theme is at a
		 * different location than the UI5 resources), you can also specify for which control libraries the setting
		 * should be used, by giving an array with the names of the respective control libraries as second parameter:
		 * <pre>
		 *   Theming.setThemeRoot("sap_belize", ["my.own.library"], "https://mythemeserver.com/allThemes");
		 * </pre>
		 *
		 * This will cause the Belize theme to be loaded from the UI5 location for all standard libraries.
		 * Resources for styling the <code>my.own.library</code> controls will be loaded from the configured
		 * location:
		 * <pre>
		 *   https://openui5.hana.ondemand.com/resources/sap/ui/core/themes/sap_belize/library.css
		 *   https://openui5.hana.ondemand.com/resources/sap/ui/layout/themes/sap_belize/library.css
		 *   https://openui5.hana.ondemand.com/resources/sap/m/themes/sap_belize/library.css
		 *   https://mythemeserver.com/allThemes/my/own/library/themes/sap_belize/library.css
		 * </pre>
		 *
		 * If the custom theme should be loaded initially (via bootstrap attribute), the <code>themeRoots</code>
		 * property of the <code>window["sap-ui-config"]</code> object must be used instead of calling
		 * <code>Theming.setThemeRoot(...)</code> in order to configure the theme location early enough.
		 *
		 * @param {string} sThemeName Name of the theme for which to configure the location
		 * @param {string} sThemeBaseUrl Base URL below which the CSS file(s) will be loaded from
		 * @param {string[]} [aLibraryNames] Optional library names to which the configuration should be restricted
		 * @param {boolean} [bForceUpdate=false] Force updating URLs of currently loaded theme
		 * @private
		 * @ui5-restricted sap.ui.core.Core
		 * @since 1.118
		 */
		setThemeRoot: (sThemeName, sThemeBaseUrl, aLibraryNames, bForceUpdate) => {
			assert(typeof sThemeName === "string", "sThemeName must be a string");
			assert(typeof sThemeBaseUrl === "string", "sThemeBaseUrl must be a string");

			const oThemeRootConfigParam = {
				name: "sapUiThemeRoots",
				type: oWritableConfig.Type.MergedObject
			};

			// Use get twice, for a deep copy of themeRoots object
			// we add a new default "empty object" with each call, so we don't accidentally share it
			const mOldThemeRoots = oWritableConfig.get(Object.assign(oThemeRootConfigParam, {defaultValue: {}}));
			const mNewThemeRoots = oWritableConfig.get(Object.assign(oThemeRootConfigParam, {defaultValue: {}}));

			// normalize parameters
			if (typeof aLibraryNames === "boolean") {
				bForceUpdate = aLibraryNames;
				aLibraryNames = undefined;
			}

			mNewThemeRoots[sThemeName] ??= {};

			// Normalize theme-roots to an object in case it was initially given as a string.
			// We only check newThemeRoots, since both old and new are identical at this point.
			if (typeof mNewThemeRoots[sThemeName] === "string") {
				mNewThemeRoots[sThemeName] = { "": mNewThemeRoots[sThemeName]};
				mOldThemeRoots[sThemeName] = { "": mOldThemeRoots[sThemeName]};
			}

			if (aLibraryNames) {
				// registration of URL for several libraries
				for (let i = 0; i < aLibraryNames.length; i++) {
					const lib = aLibraryNames[i];
					mNewThemeRoots[sThemeName][lib] = sThemeBaseUrl;
				}

			} else {
				// registration of theme default base URL
				mNewThemeRoots[sThemeName][""] = sThemeBaseUrl;
			}
			if (!deepEqual(mOldThemeRoots, mNewThemeRoots)) {
				const mChanges = {};
				oWritableConfig.set("sapUiThemeRoots", mNewThemeRoots);
				if (aLibraryNames) {
					mChanges["themeRoots"] = {
						"new": Object.assign({}, mNewThemeRoots[sThemeName]),
						"old": Object.assign({}, mOldThemeRoots[sThemeName])
					};
				} else {
					mChanges["themeRoots"] = {
						"new": sThemeBaseUrl,
						"old": mOldThemeRoots[sThemeName]?.[""]
					};
				}
				mChanges["themeRoots"].forceUpdate = bForceUpdate && sThemeName === Theming.getTheme();
				fireChange(mChanges);
			}
		},

		/**
		 * Fired after a theme has been applied.
		 *
		 * More precisely, this event is fired when any of the following conditions is met:
		 * <ul>
		 *   <li>the initially configured theme has been applied after core init</li>
		 *   <li>the theme has been changed and is now applied (see {@link #applyTheme})</li>
		 *   <li>a library has been loaded dynamically after core init (e.g. with
		 *       <code>sap.ui.core.Lib.load(...)</code> and the current theme
		 *       has been applied for it</li>
		 * </ul>
		 *
		 * For the event parameters please refer to {@link module:sap/ui/core/Theming$AppliedEvent}.
		 *
		 * @name module:sap/ui/core/Theming.applied
		 * @event
		 * @param {module:sap/ui/core/Theming$AppliedEvent} oEvent
		 * @public
		 * @since 1.118.0
		 */

		/**
		 * The theme applied Event.
		 *
		 * @typedef {object} module:sap/ui/core/Theming$AppliedEvent
		 * @property {string} theme The newly set theme.
		 * @public
		 * @since 1.118.0
		 */

		/**
		 * Attaches event handler <code>fnFunction</code> to the {@link #event:applied applied} event
		 *
		 * The given handler is called when the the applied event is fired. If the theme is already applied
		 * the handler will be called immediately.
		 *
		 * @param {function(module:sap/ui/core/Theming$AppliedEvent)} fnFunction The function to be called, when the event occurs
		 * @private
		 * @ui5-restricted sap.ui.core.Core
		 * @since 1.118.0
		 */
		attachAppliedOnce: (fnFunction) => {
			const sId = "applied";
			if (oThemeManager) {
				if (oThemeManager.themeLoaded) {
					fnFunction.call(null, new BaseEvent(sId, {theme: Theming.getTheme()}));
				} else {
					oEventing.attachEventOnce(sId, fnFunction);
				}
			} else {
				fnFunction.call(null, new BaseEvent(sId, {theme: Theming.getTheme()}));
			}
		},

		/**
		 * Attaches event handler <code>fnFunction</code> to the {@link #event:applied applied} event.
		 *
		 * The given handler is called when the the applied event is fired. If the theme is already applied
		 * the handler will be called immediately. The handler stays attached to the applied event for future
		 * theme changes.
		 *
		 * @param {function(module:sap/ui/core/Theming$AppliedEvent)} fnFunction The function to be called, when the event occurs
		 * @public
		 * @since 1.118.0
		 */
		attachApplied: (fnFunction) => {
			const sId = "applied";
			oEventing.attachEvent(sId, fnFunction);
			if (oThemeManager) {
				if (oThemeManager.themeLoaded) {
					fnFunction.call(null, new BaseEvent(sId, {theme: Theming.getTheme()}));
				}
			} else {
				fnFunction.call(null, new BaseEvent(sId, {theme: Theming.getTheme()}));
			}
		},

		/**
		 * Detaches event handler <code>fnFunction</code> from the {@link #event:applied applied} event
		 *
		 * The passed function must match the one used for event registration.
		 *
		 * @param {function(module:sap/ui/core/Theming$AppliedEvent)} fnFunction The function to be called, when the event occurs
		 * @public
		 * @since 1.118.0
		 */
		detachApplied: (fnFunction) => {
			oEventing.detachEvent("applied", fnFunction);
		},

		/**
		 * The <code>change</code> event is fired, when the configuration options are changed.
		 *
		 * @name module:sap/ui/core/Theming.change
		 * @event
		 * @param {module:sap/ui/core/Theming$ChangeEvent} oEvent
		 * @private
		 * @ui5-restricted sap.ui.core.theming.ThemeManager
		 * @since 1.118.0
		 */

		/**
		 * The theme applied Event.
		 *
		 * @typedef {object} module:sap/ui/core/Theming$ChangeEvent
		 * @property {Object<string,string>} [theme] Theme object containing the old and the new theme
		 * @property {string} [theme.new] The new theme.
		 * @property {string} [theme.old] The old theme.
		 * @property {Object<string,Object<string,string>|boolean>} [themeRoots] ThemeRoots object containing the old and the new ThemeRoots
		 * @property {object} [themeRoots.new] The new ThemeRoots.
		 * @property {object} [themeRoots.old] The old ThemeRoots.
		 * @property {boolean} [themeRoots.forceUpdate] Whether an update of currently loaded theme URLS should be forced
		 * @private
		 * @ui5-restricted sap.ui.core.theming.ThemeManager
		 * @since 1.118.0
		 */

		/**
		 * Attaches the <code>fnFunction</code> event handler to the {@link #event:change change} event
		 * of <code>sap.ui.core.Theming</code>.
		 *
		 * @param {function(module:sap/ui/core/Theming$ChangeEvent)} fnFunction The function to be called when the event occurs
		 * @private
		 * @ui5-restricted sap.ui.core.theming.ThemeManager
		 * @since 1.118.0
		 */
		attachChange: (fnFunction) => {
			oEventing.attachEvent("change", fnFunction);
		},
		/**
		 * Detaches event handler <code>fnFunction</code> from the {@link #event:change change} event of
		 * this <code>sap.ui.core.Theming</code>.
		 *
		 * @param {function(module:sap/ui/core/Theming$ChangeEvent)} fnFunction Function to be called when the event occurs
		 * @private
		 * @ui5-restricted sap.ui.core.theming.ThemeManager
		 * @since 1.118.0
		 */
		detachChange: (fnFunction) => {
			oEventing.detachEvent("change", fnFunction);
		},

		/**
		 * Fired when a scope class has been added or removed on a control/element
		 * by using the custom style class API <code>addStyleClass</code>,
		 * <code>removeStyleClass</code> or <code>toggleStyleClass</code>.
		 *
		 * Scope classes are defined by the library theme parameters coming from the
		 * current theme.
		 *
		 * <b>Note:</b> The event will only be fired after the
		 * <code>sap.ui.core.theming.Parameters</code> module has been loaded.
		 * By default this is not the case.
		 *
		 * @name module:sap/ui/core/Theming.themeScopingChanged
		 * @event
		 * @param {module:sap/ui/core/Theming$ThemeScopingChangedEvent} oEvent
		 * @private
		 * @ui5-restricted SAPUI5 Distribution Layer Libraries
		 * @since 1.118.0
		 */

		/**
		 * The theme scoping change Event.
		 *
		 * @typedef {object} module:sap/ui/core/Theming$ThemeScopingChangedEvent
		 * @property {array} scopes An array containing all changed scopes.
		 * @property {boolean} added Whether the scope was added or removed.
		 * @property {sap.ui.core.Element} element The UI5 element the scope has changed for.
		 * @private
		 * @ui5-restricted sap.ui.core.theming.ThemeManager
		 * @since 1.118.0
		 */

		/**
		 * Attaches the <code>fnFunction</code> event handler to the {@link #event:themeScopingChanged change} event
		 * of <code>sap.ui.core.Theming</code>.
		 *
		 * @param {function(module:sap/ui/core/Theming$ThemeScopingChangedEvent)} fnFunction The function to be called when the event occurs
		 * @private
		 * @ui5-restricted SAPUI5 Distribution Layer Libraries
		 * @since 1.118.0
		 */
		attachThemeScopingChanged: (fnFunction) => {
			oEventing.attachEvent("themeScopingChanged", fnFunction);
		},

		/**
		 * Detaches event handler <code>fnFunction</code> from the {@link #event:themeScopingChanged change} event of
		 * this <code>sap.ui.core.Theming</code>.
		 *
		 * @param {function(module:sap/ui/core/Theming$ThemeScopingChangedEvent)} fnFunction Function to be called when the event occurs
		 * @private
		 * @ui5-restricted SAPUI5 Distribution Layer Libraries
		 * @since 1.118.0
		 */
		detachThemeScopingChanged: (fnFunction) => {
			oEventing.detachEvent("themeScopingChanged", fnFunction);
		},

		/**
		 * Fire themeScopingChanged event.
		 *
		 * @param {Object<string,array|boolean|sap.ui.core.Element>} mParameters Function to be called when the event occurs
		 * @private
		 * @ui5-restricted SAPUI5 Distribution Layer Libraries
		 * @since 1.118.0
		 */
		fireThemeScopingChanged: (mParameters) => {
			oEventing.fireEvent("themeScopingChanged", mParameters);
		},

		/**
		 * Notify content density changes
		 *
		 * @public
		 * @since 1.118.0
		 */
		notifyContentDensityChanged: () => {
			fireApplied({theme: Theming.getTheme()});
		},

		/** Register a ThemeManager instance
		 * @param {sap.ui.core.theming.ThemeManager} oManager The ThemeManager to register.
		 * @private
		 * @ui5-restricted sap.ui.core.theming.ThemeManager
		 * @since 1.118.0
		*/
		registerThemeManager: (oManager) => {
			oThemeManager = oManager;
			oThemeManager._attachThemeApplied(function(oEvent) {
				fireApplied(BaseEvent.getParameters(oEvent));
			});
			// handle RTL changes
			Localization.attachChange(function(oEvent){
				var bRTL = oEvent.rtl;
				if (bRTL !== undefined) {
					oThemeManager._updateThemeUrls(Theming.getTheme());
				}
			});
		}
	};

	function fireChange(mChanges) {
		if (mChanges) {
			oEventing.fireEvent("change", mChanges);
		}
	}

	function fireApplied(oTheme) {
		oEventing.fireEvent("applied", oTheme);
	}

	function validateThemeOrigin(sOrigin, bNoProtocol) {
		const sAllowedOrigins = oWritableConfig.get({name: "sapAllowedThemeOrigins", type: oWritableConfig.Type.String});
		return !!sAllowedOrigins?.split(",").some((sAllowedOrigin) => {
			try {
				sAllowedOrigin = bNoProtocol && !sAllowedOrigin.startsWith("//") ? "//" + sAllowedOrigin : sAllowedOrigin;
				return sAllowedOrigin === "*" || sOrigin === new URL(sAllowedOrigin.trim(), globalThis.location.href).origin;
			} catch (error) {
				future.errorThrows("sapAllowedThemeOrigin provides invalid theme origin: " + sAllowedOrigin);
				return false;
			}
		});
	}

	function validateThemeRoot(sThemeRoot) {
		const bNoProtocol = sThemeRoot.startsWith("//");
		let oThemeRoot,
			sPath;

		try {
			// Remove search query as they are not supported for themeRoots/resourceRoots
			oThemeRoot = new URL(sThemeRoot, globalThis.location.href);
			oThemeRoot.search = "";

			// If the URL is absolute, validate the origin
			if (oThemeRoot.origin && validateThemeOrigin(oThemeRoot.origin, bNoProtocol)) {
				sPath = oThemeRoot.toString();
			} else {
				// For relative URLs or not allowed origins
				// ensure same origin and resolve relative paths based on origin
				oThemeRoot = new URL(oThemeRoot.pathname, globalThis.location.href);
				sPath = oThemeRoot.toString();
			}

			// legacy compatibility: support for "protocol-less" urls (previously handled by URI.js)
			if (bNoProtocol) {
				sPath = sPath.replace(oThemeRoot.protocol, "");
			}
			sPath += (sPath.endsWith('/') ? '' : '/') + "UI5/";
		} catch (e) {
			// malformed URL are also not accepted
		}
		return sPath;
	}

	return Theming;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/core/UIAreaRegistry", [
	"sap/base/Log",
	"sap/ui/base/ManagedObjectRegistry"
], (
	Log,
	ManagedObjectRegistry
) => {
	"use strict";

	const fnOnDuplicate = function(sId, oldUIArea, newUIArea) {
        var sMsg = "adding UIArea with duplicate id '" + sId + "'";
        Log.error(sMsg);
        throw new Error("Error: " + sMsg);
    };

	/**
	 * Registry of all <code>sap.ui.core.UIArea</code>s that currently exist.
	 *
	 * @namespace sap.ui.core.UIAreaRegistry
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	const UIAreaRegistry = ManagedObjectRegistry.create({
		"onDuplicate": fnOnDuplicate
	});

	/**
	 * Number of existing UIAreas.
	 *
	 * @type {int}
	 * @readonly
	 * @name module:sap/ui/core/UIAreaRegistry.size
	 * @private
	 * @ui5-restricted sap.ui.core
	 */

	/**
	 * Return an object with all instances of <code>sap.ui.core.UIArea</code>,
	 * keyed by their ID.
	 *
	 * Each call creates a new snapshot object. Depending on the size of the UI,
	 * this operation therefore might be expensive. Consider to use the <code>forEach</code>
	 * or <code>filter</code> method instead of executinTg similar operations on the returned
	 * object.
	 *
	 * <b>Note</b>: The returned object is created by a call to <code>Object.create(null)</code>,
	 * and therefore lacks all methods of <code>Object.prototype</code>, e.g. <code>toString</code> etc.
	 *
	 * @returns {Object<sap.ui.core.ID,sap.ui.core.UIArea>} Object with all UIAreas, keyed by their ID
	 * @name module:sap/ui/core/UIAreaRegistry.all
	 * @function
	 * @private
	 * @ui5-restricted sap.ui.core
	 */

	/**
	 * Retrieves an UIArea by its ID.
	 *
	 * When the ID is <code>null</code> or <code>undefined</code> or when there's no UIArea with
	 * the given ID, then <code>undefined</code> is returned.
	 *
	 * @param {sap.ui.core.ID} id ID of the UIArea to retrieve
	 * @returns {sap.ui.core.UIArea|undefined} UIArea with the given ID or <code>undefined</code>
	 * @name module:sap/ui/core/UIAreaRegistry.get
	 * @function
	 * @private
	 * @ui5-restricted sap.ui.core
	 */

	/**
	 * Calls the given <code>callback</code> for each UIArea.
	 *
	 * The expected signature of the callback is
	 * <pre>
	 *    function callback(oUIArea, sID)
	 * </pre>
	 * where <code>oUIArea</code> is the currently visited UIArea instance and <code>sID</code>
	 * is the ID of that instance.
	 *
	 * The order in which the callback is called for UIAreas is not specified and might change between
	 * calls (over time and across different versions of UI5).
	 *
	 * If UIAreas are created or destroyed within the <code>callback</code>, then the behavior is
	 * not specified. Newly added objects might or might not be visited. When an UIArea is destroyed or
	 * the root node is changed during the filtering and was not visited yet, it might or might not be
	 * visited. As the behavior for such concurrent modifications is not specified, it may change in
	 * newer releases.
	 *
	 * If a <code>thisArg</code> is given, it will be provided as <code>this</code> context when calling
	 * <code>callback</code>. The <code>this</code> value that the implementation of <code>callback</code>
	 * sees, depends on the usual resolution mechanism. E.g. when <code>callback</code> was bound to some
	 * context object, that object wins over the given <code>thisArg</code>.
	 *
	 * @param {function(sap.ui.core.UIArea,sap.ui.core.ID)} callback
	 *        Function to call for each UIArea
	 * @param {Object} [thisArg=undefined]
	 *        Context object to provide as <code>this</code> in each call of <code>callback</code>
	 * @throws {TypeError} If <code>callback</code> is not a function
	 * @name module:sap/ui/core/UIAreaRegistry.forEach
	 * @function
	 * @private
	 * @ui5-restricted sap.ui.core
	 */

	/**
	 * Returns an array with UIAreas for which the given <code>callback</code> returns a value that coerces
	 * to <code>true</code>.
	 *
	 * The expected signature of the callback is
	 * <pre>
	 *    function callback(oUIArea, sID)
	 * </pre>
	 * where <code>oUIArea</code> is the currently visited UIArea instance and <code>sID</code>
	 * is the ID of that instance.
	 *
	 * If UIAreas are created or destroyed within the <code>callback</code>, then the behavior is
	 * not specified. Newly added objects might or might not be visited. When an UIArea is destroyed or
	 * the root node is changed during the filtering and was not visited yet, it might or might not be
	 * visited. As the behavior for such concurrent modifications is not specified, it may change in
	 * newer releases.
	 *
	 * If a <code>thisArg</code> is given, it will be provided as <code>this</code> context when calling
	 * <code>callback</code>. The <code>this</code> value that the implementation of <code>callback</code>
	 * sees, depends on the usual resolution mechanism. E.g. when <code>callback</code> was bound to some
	 * context object, that object wins over the given <code>thisArg</code>.
	 *
	 * This function returns an array with all UIAreas matching the given predicate. The order of the
	 * UIAreas in the array is not specified and might change between calls (over time and across different
	 * versions of UI5).
	 *
	 * @param {function(sap.ui.core.UIArea,sap.ui.core.ID):boolean} callback
	 *        predicate against which each UIArea is tested
	 * @param {Object} [thisArg=undefined]
	 *        context object to provide as <code>this</code> in each call of <code>callback</code>
	 * @returns {sap.ui.core.UIArea[]}
	 *        Array of UIAreas matching the predicate; order is undefined and might change in newer versions of UI5
	 * @throws {TypeError} If <code>callback</code> is not a function
	 * @name module:sap/ui/core/UIAreaRegistry.filter
	 * @function
	 * @private
	 * @ui5-restricted sap.ui.core
	 */

	return UIAreaRegistry;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/core/getCompatibilityVersion", [
	"sap/base/config",
	"sap/base/util/Version",
	"sap/base/strings/camelize"
], (
	BaseConfig,
	Version,
	camelize
) => {
	"use strict";

	const BASE_CVERS = Version("1.14");

	const VERSION = "1.125.0";

	var M_COMPAT_FEATURES = {
		"xx-test"               : "1.15", //for testing purposes only
		"flexBoxPolyfill"       : "1.14",
		"sapMeTabContainer"     : "1.14",
		"sapMeProgessIndicator" : "1.14",
		"sapMGrowingList"       : "1.14",
		"sapMListAsTable"       : "1.14",
		"sapMDialogWithPadding" : "1.14",
		"sapCoreBindingSyntax"  : "1.24"
	};

	/**
	 * Returns the used compatibility version for the given feature.
	 *
	 * @alias module:sap/ui/core/getCompatibilityVersion
	 * @function
	 * @param {string} sFeature the key of desired feature
	 * @return {module:sap/base/util/Version} the used compatibility version
	 * @public
	 * @deprecated As of version 1.119, without a replacement. All features that have been
	 *   controlled by a compatibility version in UI5 1.x will abandon their legacy behavior,
	 *   starting with the next major version. In other words, they will behave as if compatibility
	 *   version "edge" was configured. Due to this, no more access to the compatibility
	 *   version will be required starting with the next major version.
	 */
	const fnGetCompatibilityVersion = (sFeature) => {
		const PARAM_CVERS = "sapUiCompatVersion";
		const DEFAULT_CVERS = BaseConfig.get({
			name: PARAM_CVERS,
			type: BaseConfig.Type.String
		});

		function _getCVers(key){
			var v = !key ? DEFAULT_CVERS || BASE_CVERS.toString()
					: BaseConfig.get({
						name: camelize(PARAM_CVERS + "-" + key.toLowerCase()),
						type: BaseConfig.Type.String
					}) || DEFAULT_CVERS || M_COMPAT_FEATURES[key] || BASE_CVERS.toString();
			v = Version(v.toLowerCase() === "edge" ? VERSION : v);
			//Only major and minor version are relevant
			return Version(v.getMajor(), v.getMinor());
		}

		return M_COMPAT_FEATURES.hasOwnProperty(sFeature) ? _getCVers(sFeature) : _getCVers();
	};

	return fnGetCompatibilityVersion;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/core/theming/ThemeHelper", [
	'sap/base/future',
	'sap/base/Log'
], function (future, Log) {
	"use strict";

	var mLibThemeMetadata = {};


	// Theme defaulting
	const DEFAULT_THEME = "sap_horizon";

	// dark mode detection
	const bDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

	// Theme Fallback
	const rThemePattern = /^([a-zA-Z0-9_]*)(_(hcb|hcw|dark))$/g;

	/**
	 * The list of all known themes incl. their variants.
	 * Any SAP theme outside this list will receive a fallback to the predefined default theme.
	 *
	 * Note: This list needs to be updated on each release and/or removal of a theme.
	 */
	const aKnownThemes = [
		// horizon
		"sap_horizon",
		"sap_horizon_dark",
		"sap_horizon_hcb",
		"sap_horizon_hcw",

		// fiori_3
		"sap_fiori_3",
		"sap_fiori_3_dark",
		"sap_fiori_3_hcb",
		"sap_fiori_3_hcw",

		// belize
		"sap_belize",
		"sap_belize_plus",
		"sap_belize_hcb",
		"sap_belize_hcw",

		// bluecrystal (deprecated)
		"sap_bluecrystal",

		// hcb (deprecated) - the standard HCB theme, newer themes have a dedicated HCB/HCW variant
		"sap_hcb"
	];

	// cache for already calculated theme fallbacks
	const mThemeFallbacks = {};

	/**
	 *
	 * @since 1.92.0
	 * @alias sap.ui.core.theming.ThemeHelper
	 * @static
	 * @namespace
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	var ThemeHelper = {};

	ThemeHelper.reset = function () {
		mLibThemeMetadata = {};
	};

	ThemeHelper.getMetadata = function (sLibId) {
		if (!sLibId) {
			return null;
		}

		var sLibName = sLibId.replace("sap-ui-theme-", "").replace(/\./g, "-");
		if (mLibThemeMetadata[sLibName]) {
			return mLibThemeMetadata[sLibName];
		}

		var oMetadataElement = document.createElement("span");
		oMetadataElement.classList.add("sapThemeMetaData-UI5-" + sLibName);
		document.documentElement.appendChild(oMetadataElement);
		var sDataUri = window.getComputedStyle(oMetadataElement).getPropertyValue("background-image");
		document.documentElement.removeChild(oMetadataElement);

		var aDataUriMatch = /\(["']?data:text\/plain;utf-8,(.*?)['"]?\)/i.exec(sDataUri);
		if (!aDataUriMatch || aDataUriMatch.length < 2) {
			return null;
		}

		var sMetaData = aDataUriMatch[1];

		// [COMPATIBILITY]: The following lines of code are moved unchanged from ThemeManager in order to not introduce any regressions but
		// neverteheless it's not fully clear if detection of URI encoding and URI decoding itself (especially manual encoding of spaces)
		// is necessary

		// Try to detect URI encoding by checking for first and last character for not encoded characters
		if (sMetaData.charAt(0) !== "{" && sMetaData.charAt(sMetaData.length - 1) !== "}") {
			try {
				sMetaData = decodeURI(sMetaData);
			} catch (ex) {
				// ignore
			}
		}

		// Remove superfluous escaping of double quotes
		sMetaData = sMetaData.replace(/\\"/g, '"');

		// Replace encoded spaces => not clear if this is really necessary and if there is any valid case where spaces are URI encoded
		//							 but we could not detect URI encoding. Keep coding in order to avoid regression.
		var sMetadataJSON = sMetaData.replace(/%20/g, " ");

		var oMetadata;
		try {
			oMetadata = JSON.parse(sMetadataJSON);
			mLibThemeMetadata[sLibName] = oMetadata;
		} catch (ex) {
			future.errorThrows("Could not parse theme metadata for library " + sLibName + ".");
		}
		return oMetadata;
	};

	ThemeHelper.checkAndRemoveStyle = function(oParams) {
		var sPrefix = oParams.prefix || "",
			sLib = oParams.id;

		var checkStyle = function(sId, bLog) {
			var oStyle = document.getElementById(sId);

			try {

				var bNoLinkElement = false,
					bLinkElementFinishedLoading = false,
					bSheet = false,
					bInnerHtml = false;

				// Check if <link> element is missing (e.g. misconfigured library)
				bNoLinkElement = !oStyle;

				// Check if <link> element has finished loading (see sap/ui/dom/includeStyleSheet)
				bLinkElementFinishedLoading = !!(oStyle && (oStyle.getAttribute("data-sap-ui-ready") === "true" || oStyle.getAttribute("data-sap-ui-ready") === "false"));

				// Check for "sheet" object and if rules are available
				bSheet = !!(oStyle && oStyle.sheet && oStyle.sheet.href === oStyle.href && ThemeHelper.hasSheetCssRules(oStyle.sheet));

				// Check for "innerHTML" content
				bInnerHtml = !!(oStyle && oStyle.innerHTML && oStyle.innerHTML.length > 0);

				// One of the previous four checks need to be successful
				var bResult = bNoLinkElement || bSheet || bInnerHtml || bLinkElementFinishedLoading;

				if (bLog) {
					Log.debug("ThemeHelper: " + sId + ": " + bResult + " (noLinkElement: " + bNoLinkElement + ", sheet: " + bSheet + ", innerHtml: " + bInnerHtml + ", linkElementFinishedLoading: " + bLinkElementFinishedLoading + ")");
				}

				return bResult;

			} catch (e) {
				if (bLog) {
					future.errorThrows("ThemeHelper: " + sId + ": Error during check styles '" + sId + "'", e);
				}
			}

			return false;
		};

		var currentRes = checkStyle(sPrefix + sLib, true);
		if (currentRes) {

			// removes all old stylesheets (multiple could exist if theme change was triggered
			// twice in a short timeframe) once the new stylesheet has been loaded
			var aOldStyles = document.querySelectorAll("link[data-sap-ui-foucmarker='" + sPrefix + sLib + "']");
			if (aOldStyles.length > 0) {
				for (var i = 0, l = aOldStyles.length; i < l; i++) {
					aOldStyles[i].remove();
				}
				Log.debug("ThemeManager: Old stylesheets removed for library: " + sLib);
			}

		}
		return currentRes;
	};

	ThemeHelper.safeAccessSheetCssRules = function(sheet) {
		try {
			return sheet.cssRules;
		} catch (e) {
			// Firefox throws a SecurityError or InvalidAccessError if "sheet.cssRules"
			// is accessed on a stylesheet with 404 response code.
			// Most browsers also throw when accessing from a different origin (CORS).
			return null;
		}
	};

	ThemeHelper.hasSheetCssRules = function(sheet) {
		var aCssRules = ThemeHelper.safeAccessSheetCssRules(sheet);
		return !!aCssRules && aCssRules.length > 0;
	};

	/**
	 * Validates the given theme and changes it to the predefined standard fallback theme if needed.
	 *
	 * An SAP standard theme is considered invalid when it is either:
	 *   - not available anymore (deprecated & removed)
	 *   - not yet available (meaning: released in future versions)
	 *
	 * Invalid themes will be defaulted to the predetermined standard default theme.
	 *
	 * Themes for which a theme root exists are expected to be served from their given origin
	 * and will not be adapted.
	 *
	 * @param {string} sTheme the theme to be validated
	 * @param {string|null} sThemeRoot the theme root url for the given theme
	 * @returns {string} the validated and transformed theme name
	 */
	ThemeHelper.validateAndFallbackTheme = function(sTheme, sThemeRoot) {
		// check cache for already determined fallback
		// only do this for themes from the default location (potential SAP standard themes)
		if (sThemeRoot == null && mThemeFallbacks[sTheme]) {
			return mThemeFallbacks[sTheme];
		}

		let sNewTheme = sTheme;

		// We only fallback for a very specific set of themes:
		//  * no theme-root is given (themes from a different endpoint (i.e. theming-service) are excluded) and
		//  * the given theme is a standard SAP theme ('sap_' prefix)
		//  * not supported in this version
		if (sThemeRoot == null && sTheme.startsWith("sap_") && aKnownThemes.indexOf(sTheme) == -1) {
			// extract the theme variant if given: "_hcb", "_hcw", "_dark"
			const aThemeMatch = rThemePattern.exec(sTheme) || [];
			const sVariant = aThemeMatch[2]; //match includes an underscore

			if (sVariant) {
				sNewTheme = `${DEFAULT_THEME}${sVariant}`;
			} else {
				sNewTheme = DEFAULT_THEME;
			}

			mThemeFallbacks[sTheme] = sNewTheme;

			Log.warning(`The configured theme '${sTheme}' is not yet or no longer supported in this version. The valid fallback theme is '${sNewTheme}'.`, "Theming");
		}

		return sNewTheme;
	};

	ThemeHelper.getDefaultThemeInfo = function() {
		return {
			DEFAULT_THEME: DEFAULT_THEME,
			DARK_MODE: bDarkMode
		};
	};

	return ThemeHelper;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/core/util/_LocalizationHelper", [
	"sap/base/Event",
	"sap/base/Log",
	"sap/base/i18n/Formatting",
	"sap/base/i18n/Localization",
	"sap/ui/thirdparty/jquery"
], (
	BaseEvent,
	Log,
	Formatting,
	Localization,
	jQuery
) => {
	'use strict';

	const mRegistry = {};

	function getObjectsToUpdate() {
		let aObjectsToUpdate = [];
		for (const fnGetObjects of Object.values(mRegistry)) {
			aObjectsToUpdate = [...aObjectsToUpdate, ...Object.values(fnGetObjects())];
		}
		return aObjectsToUpdate;
	}

	function handleLocalizationChange(oEvent) {
		let sEventId = "LocalizationChanged";
		/**
		 * @deprecated As of Version 1.120
		 */
		sEventId = "localizationChanged";

		const mChanges = BaseEvent.getParameters(oEvent),
			oBrowserEvent = jQuery.Event(sEventId, {changes : mChanges}),
			aObjectsToUpdate = getObjectsToUpdate(),
			bRTLChanged = mChanges.rtl !== undefined,
			bLanguageChanged = mChanges.language !== undefined;

		Log.info("localization settings changed: " + Object.keys(mChanges).join(","), null, "sap/ui/core/util/LocalizationHelper");

		// special handling for changes of the RTL mode
		if (bRTLChanged) {
			// update the dir attribute of the document
			document.documentElement.setAttribute("dir", mChanges.rtl ? "rtl" : "ltr");
			Log.info("RTL mode " + mChanges.rtl ? "activated" : "deactivated");
		}

		// special handling for changes of the language
		if (bLanguageChanged) {
			// update the lang attribute of the document
			document.documentElement.setAttribute("lang", mChanges.language);
		}

		/*
		 * phase 1: update the models
		 */
		for (const oObject of aObjectsToUpdate) {
			for (const sName in oObject.oModels) {
				const oModel = oObject.oModels[sName];
				oModel?._handleLocalizationChange?.();
			}
		}

		/*
		 * phase 2: update bindings and types
		 */
		for (const oObject of aObjectsToUpdate) {
			for (const sName in oObject.mBindingInfos) {
				const oBindingInfo = oObject.mBindingInfos[sName];
				const aParts = oBindingInfo.parts;
				if (aParts) {
					// property or composite binding: visit all parts
					for (let i = 0; i < aParts.length; i++) {
						oBindingInfo.type?._handleLocalizationChange?.();
					}
					oBindingInfo.modelChangeHandler?.();
				}
			}
			// invalidate all UIAreas if RTL changed
			if (bRTLChanged && oObject.isA("sap.ui.core.UIArea")) {
				oObject.invalidate();
			}
			// notify Elements via a pseudo browser event (onLocalizationChanged)
			if (oObject.isA("sap.ui.core.Element")) {
				oBrowserEvent._bNoReturnValue = true; // localizationChanged handler aren't allowed to return any value, mark for future fatal throw.
				oObject._handleEvent(oBrowserEvent);
			}
		}
	}

	Formatting.attachChange(handleLocalizationChange);
	Localization.attachChange(handleLocalizationChange);

	/**
	 * Update all localization dependent objects that this managed object can reach,
	 * except for its aggregated children (which will be updated by the Core).
	 *
	 * To make the update work as smooth as possible, it happens in two phases:
	 * <ol>
	 *  <li>In phase 1 all known models are updated.</li>
	 *  <li>In phase 2 all bindings are updated.</li>
	 * </ol>
	 * This separation is necessary as the models for the bindings might be updated
	 * in some ManagedObject or in the Core and the order in which the objects are visited
	 * is not defined.
	 *
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	const _LocalizationHelper = {
		init() {
			const sDir = Localization.getRTL() ? "rtl" : "ltr";

			// Set the document's dir property
			document.documentElement.setAttribute("dir", sDir); // webkit does not allow setting document.dir before the body exists
			Log.info("Content direction set to '" + sDir + "'", null, "sap/ui/core/util/_LocalizationHelper");
			// Set the document's lang property
			document.documentElement.setAttribute("lang", Localization.getLanguageTag().toString()); // webkit does not allow setting document.dir before the body exists
		},
		registerForUpdate(sType, fnGetObjects) {
			mRegistry[sType] = fnGetObjects;
		}
	};

	return _LocalizationHelper;
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
sap.ui.predefine("sap/ui/dom/jquery/Selectors", ['sap/ui/thirdparty/jquery'], function(jQuery) {
	"use strict";

	/**
	 * This module provides the following jQuery selectors:
	 * <ul>
	 * <li>:focusable/li>
	 * <li>:sapFocusable</li>
	 * <li>:sapTabbable</li>
	 * </ul>
	 * @namespace
	 * @name module:sap/ui/dom/jquery/Selectors
	 * @public
	 * @since 1.58
	 */

	// Using "Object.getOwnPropertyDescriptor" to not trigger the "getter" - see jquery.sap.stubs
	function getValue(oTarget, sProperty) {
		var descriptor = Object.getOwnPropertyDescriptor(oTarget, sProperty);
		return descriptor && descriptor.value;
	}

	/*!
	 * The following functions are taken from jQuery UI 1.8.17 but modified
	 *
	 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
	 * Dual licensed under the MIT or GPL Version 2 licenses.
	 * http://jquery.org/license
	 *
	 * http://docs.jquery.com/UI
	 */
	function visible( element ) {
		// check if one of the parents (until it's position parent) is invisible
		// prevent that elements in static area are always checked as invisible

		// list all items until the offsetParent item (with jQuery >1.6 you can use parentsUntil)
		var oOffsetParent = jQuery(element).offsetParent();
		var bOffsetParentFound = false;
		var $refs = jQuery(element).parents().filter(function() {
			if (this === oOffsetParent) {
				bOffsetParentFound = true;
			}
			return bOffsetParentFound;
		});

		// check for at least one item to be visible
		return !jQuery(element).add($refs).filter(function() {
			return jQuery.css( this, "visibility" ) === "hidden" || jQuery.expr.pseudos.hidden( this );
		}).length;
	}


	function focusable( element, isTabIndexNotNaN ) {
		var nodeName = element.nodeName.toLowerCase();
		if ( nodeName === "area" ) {
			var map = element.parentNode,
				mapName = map.name,
				img;
			if ( !element.href || !mapName || map.nodeName.toLowerCase() !== "map" ) {
				return false;
			}
			img = jQuery( "img[usemap='#" + mapName + "']" )[0];
			return !!img && visible( img );
		}
		/*eslint-disable no-nested-ternary */
		return ( /input|select|textarea|button|object/.test( nodeName )
				? !element.disabled
				: nodeName == "a"
					? element.href || isTabIndexNotNaN
					: isTabIndexNotNaN)
			// the element and all of its ancestors must be visible
			&& visible( element );
		/*eslint-enable no-nested-ternary */
	}


	if (!getValue(jQuery.expr.pseudos, "focusable")) {
		/*!
		 * The following function is taken from jQuery UI 1.8.17
		 *
		 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
		 * Dual licensed under the MIT or GPL Version 2 licenses.
		 * http://jquery.org/license
		 *
		 * http://docs.jquery.com/UI
		 *
		 * But since visible is modified, focusable is different from the jQuery UI version too.
		 */

		/*
		 * This defines the jQuery ":focusable" selector; it is also defined in jQuery UI. If already present, nothing is
		 * done here, so we will not overwrite any previous implementation.
		 * If jQuery UI is loaded later on, this implementation here will be overwritten by that one, which is fine,
		 * as it is semantically the same thing and intended to do exactly the same.
		 */
		jQuery.expr.pseudos.focusable = function( element ) {
			return focusable( element, !isNaN( jQuery.attr( element, "tabindex" ) ) );
		};
	}

	if (!getValue(jQuery.expr.pseudos, "sapTabbable")) {
		/*!
		 * The following function is taken from
		 * jQuery UI Core 1.11.1
		 * http://jqueryui.com
		 *
		 * Copyright 2014 jQuery Foundation and other contributors
		 * Released under the MIT license.
		 * http://jquery.org/license
		 *
		 * http://api.jqueryui.com/category/ui-core/
		 */

		/*
		 * This defines the jQuery ":tabbable" selector; it is also defined in jQuery UI. If already present, nothing is
		 * done here, so we will not overwrite any previous implementation.
		 * If jQuery UI is loaded later on, this implementation here will be overwritten by that one, which is fine,
		 * as it is semantically the same thing and intended to do exactly the same.
		 */
		jQuery.expr.pseudos.sapTabbable = function( element ) {
			var tabIndex = jQuery.attr( element, "tabindex" ),
				isTabIndexNaN = isNaN( tabIndex );
			return ( isTabIndexNaN || tabIndex >= 0 ) && focusable( element, !isTabIndexNaN );
		};
	}

	if (!getValue(jQuery.expr.pseudos, "sapFocusable")) {
		/*!
		 * Do not use jQuery UI focusable because this might be overwritten if jQuery UI is loaded
		 */

		/*
		 * This defines the jQuery ":sapFocusable" selector; If already present, nothing is
		 * done here, so we will not overwrite any previous implementation.
		 * If jQuery UI is loaded later on, this implementation here will NOT be overwritten by.
		 */
		jQuery.expr.pseudos.sapFocusable = function( element ) {
			return focusable( element, !isNaN( jQuery.attr( element, "tabindex" ) ) );
		};
	}

	return jQuery;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/events/ControlEvents", [
	'sap/ui/thirdparty/jquery'
], function(jQuery) {
	"use strict";

	/**
	 * @namespace
	 * @since 1.58
	 * @alias module:sap/ui/events/ControlEvents
	 * @public
	 */
	var oControlEvents = {};

	/**
	 * List of DOM events that a UIArea automatically takes care of.
	 *
	 * A control/element doesn't have to bind listeners for these events.
	 * It instead can implement an <code>on<i>event</i>(oEvent)</code> method
	 * for any of the following events that it wants to be notified about:
	 *
	 * click, dblclick, contextmenu, focusin, focusout, keydown, keypress, keyup, mousedown, mouseout, mouseover,
	 * mouseup, select, selectstart, dragstart, dragenter, dragover, dragleave, dragend, drop, paste, cut, input,
	 * touchstart, touchend, touchmove, touchcancel, tap, swipe, swipeleft, swiperight, scrollstart, scrollstop
	 *
	 * The mouse events and touch events are supported simultaneously on both desktop and mobile browsers. Do NOT
	 * create both onmouse* and ontouch* functions to avoid one event being handled twice on the same control.
	 *
	 * @public
	 */
	oControlEvents.events = [ // IMPORTANT: update the public documentation when extending this list
		"click",
		"dblclick",
		"contextmenu",
		"focusin",
		"focusout",
		"keydown",
		"keypress",
		"keyup",
		"mousedown",
		"mouseout",
		"mouseover",
		"mouseup",
		"select",
		"selectstart",
		"dragstart",
		"dragenter",
		"dragover",
		"dragleave",
		"dragend",
		"drop",
		"compositionstart",
		"compositionend",
		"paste",
		"cut",
		"input",
		"change"
	];

	/**
	 * Binds all events for listening with the given callback function.
	 *
	 * @param {function(Event)} fnCallback Callback function
	 * @static
	 * @public
	 */
	oControlEvents.bindAnyEvent = function(fnCallback) {
		if (fnCallback) {
			jQuery(document).on(oControlEvents.events.join(" "), fnCallback);
		}
	};

	/**
	 * Unbinds all events for listening with the given callback function.
	 *
	 * @param {function(Event)} fnCallback Callback function
	 * @static
	 * @public
	 */
	oControlEvents.unbindAnyEvent = function unbindAnyEvent(fnCallback) {
		if (fnCallback) {
			jQuery(document).off(oControlEvents.events.join(" "), fnCallback);
		}
	};

	return oControlEvents;
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
sap.ui.predefine("sap/ui/events/F6Navigation", [
	'sap/ui/thirdparty/jquery',
	'sap/ui/events/PseudoEvents',
	'sap/ui/dom/jquery/Selectors'
], function (jQuery, PseudoEvents/*, sapTabbable */) {
	"use strict";

	/**
	 * Central handler for F6 key event. Based on the current target and the given event the next element in the F6 chain is focused.
	 *
	 * This handler might be also called manually. In this case the central handler is deactivated for the given event.
	 *
	 * If the event is not a keydown event, it does not represent the F6 key, the default behavior is prevented,
	 * the handling is explicitly skipped (<code>oSettings.skip</code>) or the target (<code>oSettings.target</code>) is not contained
	 * in the used scopes (<code>oSettings.scope</code>), the event is skipped.
	 *
	 * @namespace
	 * @since 1.58
	 * @alias module:sap/ui/events/F6Navigation
	 * @private
	 * @ui5-restricted sap.ui.core, sap.m, sap.uxap
	 */
	var F6Navigation = {};

	var bStartOver = false;

	/**
	 * CustomData attribute name for fast navigation groups (in DOM additional prefix "data-" is needed)
	 *
	 * @type string
	 * @const
	 * @private
	 * @ui5-restricted sap.ui.core, sap.m, sap.uxap
	 */
	F6Navigation.fastNavigationKey = "sap-ui-fastnavgroup";

	function getFastNavGroup(oElement) {
		var oHtmlElement = document.querySelector("html");
		var oFastNavGroup, oCustomFastNavGroup;

		while (oElement && oElement !== oHtmlElement) {
			if (oElement.getAttribute("data-sap-ui-customfastnavgroup") === "true") {
				oCustomFastNavGroup = oElement;
			}
			if (oElement.getAttribute("data-sap-ui-fastnavgroup") === "true") {
				oFastNavGroup = oFastNavGroup || oElement;
			}
			if (oCustomFastNavGroup) {
				break;
			}
			oElement = oElement.assignedSlot || oElement.parentElement || oElement.parentNode.host;
		}

		return oCustomFastNavGroup || oFastNavGroup;
	}

	function getActiveElement(oRoot) {
		if (oRoot.activeElement && oRoot.activeElement.shadowRoot) {
			return getActiveElement(oRoot.activeElement.shadowRoot);
		}

		return oRoot.activeElement;
	}

	function isContainedIn(oTarget, oScope) {
		var oParentElement = oTarget.parentElement || oTarget.parentNode || oTarget.host;
		if (oParentElement && oParentElement !== oScope) {
			return isContainedIn(oParentElement, oScope);
		}
		return oTarget !== document;
	}

	function findNextElement(mParams) {
		var oElement = mParams.element;
		var bSkipChild = mParams.skipChild;
		var oScope = mParams.scope;

		if (oElement.id === "sap-ui-static") {
			// skip the check in static UIArea
			// when oScope is within static UIArea, this function will never reach the static UIArea
			bSkipChild = true;
		}

		// First check for child elements
		if (!bSkipChild) {
			if (oElement.shadowRoot && oElement.shadowRoot.firstElementChild) {
				return oElement.shadowRoot.firstElementChild;
			} else if (oElement.assignedElements && oElement.assignedElements().length) {
				return oElement.assignedElements()[0];
			} else if (oElement.firstElementChild) {
				return oElement.firstElementChild;
			}
		}

		// If there are no child elements or in case we children were skipped, check for the next sibling
		// Next element sibling should be only considered if there is no slot assigned (no Web Component)
		// If a slot is assigned, check for the next logical slot element (Web Component)
		// nextElementSibling also returns the next slot element but the slot elements in DOM must not
		// necessarily be grouped by the slots
		if (oElement.assignedSlot) {
			var aAssignedElements = oElement.assignedSlot.assignedElements();
			var iNextSlotIndex = aAssignedElements.indexOf(oElement) + 1;
			if (iNextSlotIndex < aAssignedElements.length) {
				return aAssignedElements[iNextSlotIndex];
			}
		} else if (oElement.nextElementSibling) {
			return oElement.nextElementSibling;
		}

		// Return the scope in case our parent is the scope
		if (oElement.parentNode === oScope) {
			return oScope;
		}

		// Check the parent element for the next DOM element
		return findNextElement({
			element: oElement.assignedSlot || oElement.parentElement || oElement.parentNode || oElement.host,
			skipChild: true,
			scope: oScope
		});
	}

	function findPreviousElement(mParams) {
		var oElement = mParams.element;
		var oScope = mParams.scope;
		var bCheckChildren = mParams.checkChildren || oElement === oScope;
		var aAssignedElements;

		if (oElement.id === "sap-ui-static") {
			// skip the check in static UIArea
			// when oScope is within static UIArea, this function will never reach the static UIArea
			bCheckChildren = false;
		}

		if (bCheckChildren) {
			var oChildElement;
			// Check if there is a child element
			if (oElement.shadowRoot) {
				oChildElement = oElement.shadowRoot;
			} else if (oElement.lastElementChild) {
				oChildElement = oElement.lastElementChild;
			} else if (oElement.assignedElements && oElement.assignedElements().length) {
				aAssignedElements = oElement.assignedElements();
				oChildElement = aAssignedElements[aAssignedElements.length - 1];
			}

			if (oChildElement) {
				// If a child element exist, check for children of the detected child
				return findPreviousElement({
					element: oChildElement,
					checkChildren: true,
					scope: oScope
				});
			} else {
				// In case there are no child elements return the current element
				// except the current element is a #shadowRoot (nodeType === 11)
				return oElement.nodeType === 11 ? oElement.host : oElement;
			}
		}

		// In case children should be skipped, check for the previous element sibling first.
		// Previous element sibling should be only considered if there is no slot assigned (no Web Component)
		// If a slot is assigned, check for the previous logical slot element (Web Component)
		// previousElementSibling also returns the previous slot element but the slot elements in DOM must not
		// necessarily be grouped by the slots
		if (oElement.assignedSlot) {
			aAssignedElements = oElement.assignedSlot.assignedElements();
			var iPreviousSlotIndex = aAssignedElements.indexOf(oElement) - 1;
			if (iPreviousSlotIndex >= 0) {
				return findPreviousElement({
					element: aAssignedElements[iPreviousSlotIndex],
					checkChildren: true,
					scope: oScope
				});
			}
		} else if (oElement.previousElementSibling) {
			return findPreviousElement({
				element: oElement.previousElementSibling,
				checkChildren: true,
				scope: oScope
			});
		}

		var oParentElement;
		// If did not find something check for assignedSlot, shadowRoot and parentElement
		if (oElement.assignedSlot) {
			oParentElement = oElement.assignedSlot;
		} else if (oElement.parentElement) {
			oParentElement = oElement.parentElement;
		} else if (oElement.parentNode) {
			// when oElement is a direct child of #shadow-root, return the host of the #shadow-root directly
			oParentElement = oElement.parentNode.host;
		}

		return oParentElement;
	}

	function findTabbable(oOriginalElement, oScope, bForward) {
		var oNextElement;

		if (bForward) {
			oNextElement = findNextElement({
				element: oOriginalElement,
				scope: oScope
			});
		} else {
			oNextElement = findPreviousElement({
				element: oOriginalElement,
				scope: oScope
			});
		}

		if (oNextElement === oScope) {
			bStartOver = true;
		}

		if (jQuery.expr.pseudos.sapTabbable(oNextElement)) {
			var oRes = {
				element: oNextElement,
				startOver: bStartOver
			};

			bStartOver = false;

			return oRes;
		} else {
			return findTabbable(oNextElement, oScope, bForward);
		}
	}

	/**
	 * Handles the F6 key event.
	 *
	 * @private
	 * @ui5-restricted sap.ui.core, sap.m, sap.uxap
	 * @param {jQuery.Event} oEvent a <code>keydown</code> event object.
	 * @param {object} [oSettings] further options in case the handler is called manually.
	 * @param {boolean} [oSettings.skip=false] whether the event should be ignored by the central handler (see above)
	 * @param {Element} [oSettings.target=document.activeElement] the DOMNode which should be used as starting point to find the next DOMNode in the F6 chain.
	 * @param {Element[]} [oSettings.scope=[document]] the DOMNodes(s) which are used for the F6 chain search
	 */
	F6Navigation.handleF6GroupNavigation = function (oEvent, oSettings) {
		// Use PseudoEvent check in order to verify validity of shortcuts
		var oSapSkipForward = PseudoEvents.events.sapskipforward,
			oSapSkipBack = PseudoEvents.events.sapskipback,
			bSapSkipForward = oSapSkipForward.aTypes.includes(oEvent.type) && oSapSkipForward.fnCheck(oEvent),
			bIsValidShortcut = bSapSkipForward || (oSapSkipBack.aTypes.includes(oEvent.type) && oSapSkipBack.fnCheck(oEvent)),
			oFastNavEvent = null,
			oNextTabbable;

		if (!bIsValidShortcut ||
			oEvent.isMarked("sapui5_handledF6GroupNavigation") ||
			oEvent.isMarked() ||
			oEvent.isDefaultPrevented()) {
			return;
		}

		oEvent.setMark("sapui5_handledF6GroupNavigation");
		oEvent.setMarked();
		oEvent.preventDefault();

		if (oSettings && oSettings.skip) {
			return;
		}

		var oTarget = oSettings && oSettings.target ? oSettings.target : getActiveElement(document);
		var oScope;

		if (oSettings && oSettings.scope) {
			oScope = oSettings.scope;
		} else {
			oScope = document.documentElement;
		}

		if (!isContainedIn(oTarget, oScope)) {
			return;
		}

		// Determine currently selected fast navigation group
		var oCurrentSelectedGroup = getFastNavGroup(oTarget);
		var oNextFastNavGroup;
		var oTabbableInfo;
		oNextTabbable = oTarget;

		do {
			oTabbableInfo = findTabbable(oNextTabbable, oScope, bSapSkipForward);
			oNextTabbable = oTabbableInfo.element;
			oNextFastNavGroup = getFastNavGroup(oNextTabbable);
		} while ((!oTabbableInfo.startOver && (oCurrentSelectedGroup === oNextFastNavGroup)));

		if (!bSapSkipForward) {
			var oPreviousTabbable, oPreviousFastNavGroup;
			do {
				oNextTabbable = oPreviousTabbable || oNextTabbable;
				oTabbableInfo = findTabbable(oNextTabbable, oScope, bSapSkipForward);
				oPreviousTabbable = oTabbableInfo.element;
				oPreviousFastNavGroup = getFastNavGroup(oPreviousTabbable);
			} while (oPreviousFastNavGroup === oNextFastNavGroup && !oTabbableInfo.startOver);
		}

		if (oNextFastNavGroup && oNextFastNavGroup.getAttribute("data-sap-ui-customfastnavgroup") === "true" && oNextFastNavGroup.id) {
			var Element = sap.ui.require("sap/ui/core/Element");
			var oControl = Element?.getElementById(oNextFastNavGroup.id);
			if (oControl) {
				oFastNavEvent = jQuery.Event("BeforeFastNavigationFocus");
				oFastNavEvent.target = oNextTabbable;
				oFastNavEvent.source = oTarget;
				oFastNavEvent.forward = bSapSkipForward;
				oControl._handleEvent(oFastNavEvent);
			}
		}

		if (!oFastNavEvent || !oFastNavEvent.isDefaultPrevented()) {
			oNextTabbable.focus();
		}
	};

	return F6Navigation;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/events/KeyCodes", [], function() {
	"use strict";

	/**
	 * @enum {int}
	 * @since 1.58
	 * @alias module:sap/ui/events/KeyCodes
	 * @public
	 */
	var mKeyCodes = {

		/**
		 * @type int
		 * @public
		 */
		BACKSPACE: 8,

		/**
		 * @type int
		 * @public
		 */
		TAB: 9,

		/**
		 * @type int
		 * @public
		 */
		ENTER: 13,

		/**
		 * @type int
		 * @public
		 */
		SHIFT: 16,

		/**
		 * @type int
		 * @public
		 */
		CONTROL: 17,

		/**
		 * @type int
		 * @public
		 */
		ALT: 18,

		/**
		 * @type int
		 * @public
		 */
		BREAK: 19,

		/**
		 * @type int
		 * @public
		 */
		CAPS_LOCK: 20,

		/**
		 * @type int
		 * @public
		 */
		ESCAPE: 27,

		/**
		 * @type int
		 * @public
		 */
		SPACE: 32,

		/**
		 * @type int
		 * @public
		 */
		PAGE_UP: 33,

		/**
		 * @type int
		 * @public
		 */
		PAGE_DOWN: 34,

		/**
		 * @type int
		 * @public
		 */
		END: 35,

		/**
		 * @type int
		 * @public
		 */
		HOME: 36,

		/**
		 * @type int
		 * @public
		 */
		ARROW_LEFT: 37,

		/**
		 * @type int
		 * @public
		 */
		ARROW_UP: 38,

		/**
		 * @type int
		 * @public
		 */
		ARROW_RIGHT: 39,

		/**
		 * @type int
		 * @public
		 */
		ARROW_DOWN: 40,

		/**
		 * @type int
		 * @public
		 */
		PRINT: 44,

		/**
		 * @type int
		 * @public
		 */
		INSERT: 45,

		/**
		 * @type int
		 * @public
		 */
		DELETE: 46,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_0: 48,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_1: 49,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_2: 50,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_3: 51,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_4: 52,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_5: 53,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_6: 54,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_7: 55,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_8: 56,

		/**
		 * @type int
		 * @public
		 */
		DIGIT_9: 57,

		/**
		 * @type int
		 * @public
		 */
		A: 65,

		/**
		 * @type int
		 * @public
		 */
		B: 66,

		/**
		 * @type int
		 * @public
		 */
		C: 67,

		/**
		 * @type int
		 * @public
		 */
		D: 68,

		/**
		 * @type int
		 * @public
		 */
		E: 69,

		/**
		 * @type int
		 * @public
		 */
		F: 70,

		/**
		 * @type int
		 * @public
		 */
		G: 71,

		/**
		 * @type int
		 * @public
		 */
		H: 72,

		/**
		 * @type int
		 * @public
		 */
		I: 73,

		/**
		 * @type int
		 * @public
		 */
		J: 74,

		/**
		 * @type int
		 * @public
		 */
		K: 75,

		/**
		 * @type int
		 * @public
		 */
		L: 76,

		/**
		 * @type int
		 * @public
		 */
		M: 77,

		/**
		 * @type int
		 * @public
		 */
		N: 78,

		/**
		 * @type int
		 * @public
		 */
		O: 79,

		/**
		 * @type int
		 * @public
		 */
		P: 80,

		/**
		 * @type int
		 * @public
		 */
		Q: 81,

		/**
		 * @type int
		 * @public
		 */
		R: 82,

		/**
		 * @type int
		 * @public
		 */
		S: 83,

		/**
		 * @type int
		 * @public
		 */
		T: 84,

		/**
		 * @type int
		 * @public
		 */
		U: 85,

		/**
		 * @type int
		 * @public
		 */
		V: 86,

		/**
		 * @type int
		 * @public
		 */
		W: 87,

		/**
		 * @type int
		 * @public
		 */
		X: 88,

		/**
		 * @type int
		 * @public
		 */
		Y: 89,

		/**
		 * @type int
		 * @public
		 */
		Z: 90,

		/**
		 * @type int
		 * @public
		 */
		WINDOWS: 91,

		/**
		 * @type int
		 * @public
		 */
		CONTEXT_MENU: 93,

		/**
		 * @type int
		 * @public
		 */
		TURN_OFF: 94,

		/**
		 * @type int
		 * @public
		 */
		SLEEP: 95,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_0: 96,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_1: 97,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_2: 98,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_3: 99,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_4: 100,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_5: 101,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_6: 102,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_7: 103,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_8: 104,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_9: 105,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_ASTERISK: 106,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_PLUS: 107,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_MINUS: 109,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_COMMA: 110,

		/**
		 * @type int
		 * @public
		 */
		NUMPAD_SLASH: 111,

		/**
		 * @type int
		 * @public
		 */
		F1: 112,

		/**
		 * @type int
		 * @public
		 */
		F2: 113,

		/**
		 * @type int
		 * @public
		 */
		F3: 114,

		/**
		 * @type int
		 * @public
		 */
		F4: 115,

		/**
		 * @type int
		 * @public
		 */
		F5: 116,

		/**
		 * @type int
		 * @public
		 */
		F6: 117,

		/**
		 * @type int
		 * @public
		 */
		F7: 118,

		/**
		 * @type int
		 * @public
		 */
		F8: 119,

		/**
		 * @type int
		 * @public
		 */
		F9: 120,

		/**
		 * @type int
		 * @public
		 */
		F10: 121,

		/**
		 * @type int
		 * @public
		 */
		F11: 122,

		/**
		 * @type int
		 * @public
		 */
		F12: 123,

		/**
		 * @type int
		 * @public
		 */
		NUM_LOCK: 144,

		/**
		 * @type int
		 * @public
		 */
		SCROLL_LOCK: 145,

		/**
		 * @type int
		 * @public
		 */
		OPEN_BRACKET: 186,

		/**
		 * @type int
		 * @public
		 */
		PLUS: 187,

		/**
		 * @type int
		 * @public
		 */
		COMMA: 188,

		/**
		 * @type int
		 * @public
		 */
		SLASH: 189,

		/**
		 * @type int
		 * @public
		 */
		DOT: 190,

		/**
		 * @type int
		 * @public
		 */
		PIPE: 191,

		/**
		 * @type int
		 * @public
		 */
		SEMICOLON: 192,

		/**
		 * @type int
		 * @public
		 */
		MINUS: 219,

		/**
		 * @type int
		 * @public
		 */
		GREAT_ACCENT: 220,

		/**
		 * @type int
		 * @public
		 */
		EQUALS: 221,

		/**
		 * @type int
		 * @public
		 */
		SINGLE_QUOTE: 222,

		/**
		 * @type int
		 * @public
		 */
		BACKSLASH: 226
	};

	return mKeyCodes;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/events/PseudoEvents", [
	'sap/base/i18n/Localization',
	'sap/ui/events/KeyCodes',
	'sap/ui/thirdparty/jquery'
], function(
	Localization,
	KeyCodes,
	jQuery
) {
	"use strict";

	/**
	 * @namespace
	 * @since 1.58
	 * @alias module:sap/ui/events/PseudoEvents
	 * @public
	 */
	var PseudoEvents = {};

	/**
	 * Convenience method to check an event for a certain combination of modifier keys
	 *
	 * @private
	 */
	function checkModifierKeys(oEvent, bCtrlKey, bAltKey, bShiftKey) {
		return oEvent.shiftKey == bShiftKey && oEvent.altKey == bAltKey && getCtrlKey(oEvent) == bCtrlKey;
	}

	/**
	 * Convenience method to check an event for any modifier key
	 *
	 * @private
	 */
	function hasModifierKeys(oEvent) {
		return oEvent.shiftKey || oEvent.altKey || getCtrlKey(oEvent);
	}

	/**
	 * Convenience method for handling of Ctrl key, meta key etc.
	 *
	 * @private
	 */
	function getCtrlKey(oEvent) {
		return !!(oEvent.metaKey || oEvent.ctrlKey); // double negation doesn't have effect on boolean but ensures null and undefined are equivalent to false.
	}


	/**
	 * Map of all so called "pseudo events", a useful classification
	 * of standard browser events as implied by SAP product standards.
	 *
	 * This map is intended to be used internally in UI5 framework and UI5 Controls.
	 *
	 * Whenever a browser event is recognized as one or more pseudo events, then this
	 * classification is attached to the original {@link jQuery.Event} object and thereby
	 * delivered to any jQuery-style listeners registered for that browser event.
	 *
	 * Pure JavaScript listeners can evaluate the classification information using
	 * the {@link jQuery.Event.prototype.isPseudoType} method.
	 *
	 * Instead of using the procedure as described above, the SAPUI5 controls and elements
	 * should simply implement an <code>on<i>pseudo-event</i>(oEvent)</code> method. It will
	 * be invoked only when that specific pseudo event has been recognized. This simplifies event
	 * dispatching even further.
	 *
	 * @type {Object<string, {sName: string, aTypes: string[], fnCheck: function(Event):boolean}>}
	 * @public
	 */
	PseudoEvents.events = { // IMPORTANT: update the public documentation when extending this list

		/* Pseudo keyboard events */

		/**
		 * Pseudo event for keyboard arrow down without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapdown: {
			sName: "sapdown",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowDown" : oEvent.keyCode == KeyCodes.ARROW_DOWN) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard arrow down with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapdownmodifiers: {
			sName: "sapdownmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowDown" : oEvent.keyCode == KeyCodes.ARROW_DOWN) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'show' event (F4, Alt + down-Arrow)
		 * @public
		 */
		sapshow: {
			sName: "sapshow",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				if (oEvent.key) {
					return (oEvent.key === "F4" && !hasModifierKeys(oEvent)) ||
						(oEvent.key === "ArrowDown" && checkModifierKeys(oEvent, /*Ctrl*/ false, /*Alt*/ true, /*Shift*/ false));
				}
				return (oEvent.keyCode == KeyCodes.F4 && !hasModifierKeys(oEvent)) ||
					(oEvent.keyCode == KeyCodes.ARROW_DOWN && checkModifierKeys(oEvent, /*Ctrl*/ false, /*Alt*/ true, /*Shift*/ false));
			}
		},

		/**
		 * Pseudo event for keyboard arrow up without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapup: {
			sName: "sapup",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowUp" : oEvent.keyCode == KeyCodes.ARROW_UP) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard arrow up with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapupmodifiers: {
			sName: "sapupmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowUp" : oEvent.keyCode == KeyCodes.ARROW_UP) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'hide' event (Alt + up-Arrow)
		 * @public
		 */
		saphide: {
			sName: "saphide",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowUp" : oEvent.keyCode == KeyCodes.ARROW_UP) && checkModifierKeys(oEvent, /*Ctrl*/ false, /*Alt*/ true, /*Shift*/ false);
			}
		},

		/**
		 * Pseudo event for keyboard arrow left without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapleft: {
			sName: "sapleft",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowLeft" : oEvent.keyCode == KeyCodes.ARROW_LEFT) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard arrow left with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapleftmodifiers: {
			sName: "sapleftmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowLeft" : oEvent.keyCode == KeyCodes.ARROW_LEFT) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard arrow right without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapright: {
			sName: "sapright",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowRight" : oEvent.keyCode == KeyCodes.ARROW_RIGHT) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard arrow right with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		saprightmodifiers: {
			sName: "saprightmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "ArrowRight" : oEvent.keyCode == KeyCodes.ARROW_RIGHT) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard Home/Pos1 with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		saphome: {
			sName: "saphome",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Home" : oEvent.keyCode == KeyCodes.HOME) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard Home/Pos1 without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		saphomemodifiers: {
			sName: "saphomemodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Home" : oEvent.keyCode == KeyCodes.HOME) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for  pseudo top event
		 * @public
		 */
		saptop: {
			sName: "saptop",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Home" : oEvent.keyCode == KeyCodes.HOME) && checkModifierKeys(oEvent, /*Ctrl*/ true, /*Alt*/ false, /*Shift*/ false);
			}
		},

		/**
		 * Pseudo event for keyboard End without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapend: {
			sName: "sapend",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "End" : oEvent.keyCode == KeyCodes.END) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard End with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapendmodifiers: {
			sName: "sapendmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "End" : oEvent.keyCode == KeyCodes.END) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo bottom event
		 * @public
		 */
		sapbottom: {
			sName: "sapbottom",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "End" : oEvent.keyCode == KeyCodes.END) && checkModifierKeys(oEvent, /*Ctrl*/ true, /*Alt*/ false, /*Shift*/ false);
			}
		},

		/**
		 * Pseudo event for keyboard page up without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sappageup: {
			sName: "sappageup",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "PageUp" : oEvent.keyCode == KeyCodes.PAGE_UP) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard page up with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sappageupmodifiers: {
			sName: "sappageupmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "PageUp" : oEvent.keyCode == KeyCodes.PAGE_UP) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard page down without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sappagedown: {
			sName: "sappagedown",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "PageDown" : oEvent.keyCode == KeyCodes.PAGE_DOWN) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard page down with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sappagedownmodifiers: {
			sName: "sappagedownmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "PageDown" : oEvent.keyCode == KeyCodes.PAGE_DOWN) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'select' event... space, enter, ... without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapselect: {
			sName: "sapselect",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				if (oEvent.key) {
					return (oEvent.key === "Enter" || oEvent.key === " ") && !hasModifierKeys(oEvent);
				}
				return (oEvent.keyCode == KeyCodes.ENTER || oEvent.keyCode == KeyCodes.SPACE) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'select' event... space, enter, ... with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapselectmodifiers: {
			sName: "sapselectmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				if (oEvent.key) {
					return (oEvent.key === "Enter" || oEvent.key === " ") && hasModifierKeys(oEvent);
				}
				return (oEvent.keyCode == KeyCodes.ENTER || oEvent.keyCode == KeyCodes.SPACE) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard space without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapspace: {
			sName: "sapspace",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === " " : oEvent.keyCode == KeyCodes.SPACE) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard space with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapspacemodifiers: {
			sName: "sapspacemodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === " " : oEvent.keyCode == KeyCodes.SPACE) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard enter without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapenter: {
			sName: "sapenter",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Enter" : oEvent.keyCode == KeyCodes.ENTER) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard enter with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapentermodifiers: {
			sName: "sapentermodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Enter" : oEvent.keyCode == KeyCodes.ENTER) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard backspace without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapbackspace: {
			sName: "sapbackspace",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Backspace" : oEvent.keyCode == KeyCodes.BACKSPACE) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard backspace with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapbackspacemodifiers: {
			sName: "sapbackspacemodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Backspace" : oEvent.keyCode == KeyCodes.BACKSPACE) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard delete without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapdelete: {
			sName: "sapdelete",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Delete" : oEvent.keyCode == KeyCodes.DELETE) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard delete with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapdeletemodifiers: {
			sName: "sapdeletemodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Delete" : oEvent.keyCode == KeyCodes.DELETE) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo expand event (keyboard numpad +) without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapexpand: {
			sName: "sapexpand",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? (oEvent.key === "+" || oEvent.key === "Add") && oEvent.location === "NUMPAD" : oEvent.keyCode == KeyCodes.NUMPAD_PLUS) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo expand event (keyboard numpad +) with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapexpandmodifiers: {
			sName: "sapexpandmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? (oEvent.key === "+" || oEvent.key === "Add") && oEvent.location === "NUMPAD" : oEvent.keyCode == KeyCodes.NUMPAD_PLUS) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo collapse event (keyboard numpad -) without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapcollapse: {
			sName: "sapcollapse",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? (oEvent.key === "-" || oEvent.key === "Subtract") && oEvent.location === "NUMPAD" : oEvent.keyCode == KeyCodes.NUMPAD_MINUS) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo collapse event (keyboard numpad -) with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapcollapsemodifiers: {
			sName: "sapcollapsemodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? (oEvent.key === "-" || oEvent.key === "Subtract") && oEvent.location === "NUMPAD" : oEvent.keyCode == KeyCodes.NUMPAD_MINUS) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo collapse event (keyboard numpad *)
		 * @public
		 */
		sapcollapseall: {
			sName: "sapcollapseall",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? (oEvent.key === "*" || oEvent.key === "Multiply") && oEvent.location === "NUMPAD" : oEvent.keyCode == KeyCodes.NUMPAD_ASTERISK) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard escape
		 * @public
		 */
		sapescape: {
			sName: "sapescape",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Escape" : oEvent.keyCode == KeyCodes.ESCAPE) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard tab (TAB + no modifier)
		 * @public
		 */
		saptabnext: {
			sName: "saptabnext",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Tab" : oEvent.keyCode == KeyCodes.TAB) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for keyboard tab (TAB + shift modifier)
		 * @public
		 */
		saptabprevious: {
			sName: "saptabprevious",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "Tab" : oEvent.keyCode == KeyCodes.TAB) && checkModifierKeys(oEvent, /*Ctrl*/ false, /*Alt*/ false, /*Shift*/ true);
			}
		},

		/**
		 * Pseudo event for pseudo skip forward (F6 + no modifier or ctrl + alt + ArrowDown)
		 * @public
		 */
		sapskipforward: {
			sName: "sapskipforward",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "F6" : oEvent.keyCode == KeyCodes.F6) && !hasModifierKeys(oEvent) ||
						(oEvent.key ? oEvent.key === "ArrowDown" : oEvent.keyCode == KeyCodes.ARROW_DOWN) && checkModifierKeys(oEvent, /*Ctrl*/ true, /*Alt*/ true, /*Shift*/ false);
			}
		},

		/**
		 * Pseudo event for pseudo skip back (F6 + shift modifier or ctrl + alt + ArrowUp)
		 * @public
		 */
		sapskipback: {
			sName: "sapskipback",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? oEvent.key === "F6" : oEvent.keyCode == KeyCodes.F6) && checkModifierKeys(oEvent, /*Ctrl*/ false, /*Alt*/ false, /*Shift*/ true) ||
				(oEvent.key ? oEvent.key === "ArrowUp" : oEvent.keyCode == KeyCodes.ARROW_UP) && checkModifierKeys(oEvent, /*Ctrl*/ true, /*Alt*/ true, /*Shift*/ false);
			}
		},

		//// contextmenu Shift-F10 hack
		//{sName: "sapcontextmenu", aTypes: ["keydown"], fnCheck: function(oEvent) {
		//	return oEvent.key === "F10" && checkModifierKeys(oEvent, /*Ctrl*/false, /*Alt*/false, /*Shift*/true);
		//}},

		/**
		 * Pseudo event for pseudo 'decrease' event without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapdecrease: {
			sName: "sapdecrease",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				if (oEvent.key) {
					if (bRtl) {
						return (oEvent.key === "ArrowRight" || oEvent.key === "ArrowDown") && !hasModifierKeys(oEvent);
					} else {
						return (oEvent.key === "ArrowLeft" || oEvent.key === "ArrowDown") && !hasModifierKeys(oEvent);
					}
				}
				var iPreviousKey = bRtl ? KeyCodes.ARROW_RIGHT : KeyCodes.ARROW_LEFT;
				return (oEvent.keyCode == iPreviousKey || oEvent.keyCode == KeyCodes.ARROW_DOWN) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pressing the '-' (minus) sign.
		 * @public
		 */
		sapminus: {
			sName: "sapminus",
			aTypes: ["keypress"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? (oEvent.key === '-' || oEvent.key === 'Subtract') : String.fromCharCode(oEvent.which) == '-');
			}
		},

		/**
		 * Pseudo event for pseudo 'decrease' event with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapdecreasemodifiers: {
			sName: "sapdecreasemodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				if (oEvent.key) {
					if (bRtl) {
						return (oEvent.key === "ArrowRight" || oEvent.key === "ArrowDown") && hasModifierKeys(oEvent);
					} else {
						return (oEvent.key === "ArrowLeft" || oEvent.key === "ArrowDown") && hasModifierKeys(oEvent);
					}
				}
				var iPreviousKey = bRtl ? KeyCodes.ARROW_RIGHT : KeyCodes.ARROW_LEFT;
				return (oEvent.keyCode == iPreviousKey || oEvent.keyCode == KeyCodes.ARROW_DOWN) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'increase' event without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapincrease: {
			sName: "sapincrease",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				var iNextKey;
				if (oEvent.key) {
					if (bRtl) {
						return (oEvent.key === "ArrowLeft" || oEvent.key === "ArrowUp") && !hasModifierKeys(oEvent);
					} else {
						return (oEvent.key === "ArrowRight" || oEvent.key === "ArrowUp") && !hasModifierKeys(oEvent);
					}
				}
				iNextKey = bRtl ? KeyCodes.ARROW_LEFT : KeyCodes.ARROW_RIGHT;
				return (oEvent.keyCode == iNextKey || oEvent.keyCode == KeyCodes.ARROW_UP) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pressing the '+' (plus) sign.
		 * @public
		 */
		sapplus: {
			sName: "sapplus",
			aTypes: ["keypress"],
			fnCheck: function(oEvent) {
				return (oEvent.key ? (oEvent.key === '+' || oEvent.key === 'Add') : String.fromCharCode(oEvent.which) == '+');
			}
		},

		/**
		 * Pseudo event for pseudo 'increase' event with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapincreasemodifiers: {
			sName: "sapincreasemodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				if (oEvent.key) {
					if (bRtl) {
						return (oEvent.key === "ArrowLeft" || oEvent.key === "ArrowUp") && hasModifierKeys(oEvent);
					} else {
						return (oEvent.key === "ArrowRight" || oEvent.key === "ArrowUp") && hasModifierKeys(oEvent);

					}
				}
				var iNextKey = bRtl ? KeyCodes.ARROW_LEFT : KeyCodes.ARROW_RIGHT;
				return (oEvent.keyCode == iNextKey || oEvent.keyCode == KeyCodes.ARROW_UP) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'previous' event without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapprevious: {
			sName: "sapprevious",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				if (oEvent.key) {
					if (bRtl) {
						return (oEvent.key === "ArrowRight" || oEvent.key === "ArrowUp") && !hasModifierKeys(oEvent);
					} else {
						return (oEvent.key === "ArrowLeft" || oEvent.key === "ArrowUp") && !hasModifierKeys(oEvent);
					}
				}
				var iPreviousKey = bRtl ? KeyCodes.ARROW_RIGHT : KeyCodes.ARROW_LEFT;
				return (oEvent.keyCode == iPreviousKey || oEvent.keyCode == KeyCodes.ARROW_UP) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'previous' event with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sappreviousmodifiers: {
			sName: "sappreviousmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				if (oEvent.key) {
					if (bRtl) {
						return (oEvent.key === "ArrowRight" || oEvent.key === "ArrowUp") && hasModifierKeys(oEvent);
					} else {
						return (oEvent.key === "ArrowLeft" || oEvent.key === "ArrowUp") && hasModifierKeys(oEvent);
					}
				}
				var iPreviousKey = bRtl ? KeyCodes.ARROW_RIGHT : KeyCodes.ARROW_LEFT;
				return (oEvent.keyCode == iPreviousKey || oEvent.keyCode == KeyCodes.ARROW_UP) && hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'next' event without modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapnext: {
			sName: "sapnext",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				if (oEvent.key) {
					if (bRtl) {
						return (oEvent.key === "ArrowLeft" || oEvent.key === "ArrowDown") && !hasModifierKeys(oEvent);
					} else {
						return (oEvent.key === "ArrowRight" || oEvent.key === "ArrowDown") && !hasModifierKeys(oEvent);
					}
				}
				var iNextKey = bRtl ? KeyCodes.ARROW_LEFT : KeyCodes.ARROW_RIGHT;
				return (oEvent.keyCode == iNextKey || oEvent.keyCode == KeyCodes.ARROW_DOWN) && !hasModifierKeys(oEvent);
			}
		},

		/**
		 * Pseudo event for pseudo 'next' event with modifiers (Ctrl, Alt or Shift)
		 * @public
		 */
		sapnextmodifiers: {
			sName: "sapnextmodifiers",
			aTypes: ["keydown"],
			fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				if (oEvent.key) {
					if (bRtl) {
						return (oEvent.key === "ArrowLeft" || oEvent.key === "ArrowDown") && hasModifierKeys(oEvent);
					} else {
						return (oEvent.key === "ArrowRight" || oEvent.key === "ArrowDown") && hasModifierKeys(oEvent);
					}
				}
				var iNextKey = bRtl ? KeyCodes.ARROW_LEFT : KeyCodes.ARROW_RIGHT;
				return (oEvent.keyCode == iNextKey || oEvent.keyCode == KeyCodes.ARROW_DOWN) && hasModifierKeys(oEvent);
			}
		},

		/*
		 * Other pseudo events
		 * @public
		 */

		/**
		 * Pseudo event indicating delayed double click (e.g. for inline edit)
		 * @public
		 */
		sapdelayeddoubleclick: {
			sName: "sapdelayeddoubleclick",
			aTypes: ["click"],
			fnCheck: function(oEvent) {
				var element = jQuery(oEvent.target);
				var currentTimestamp = oEvent.timeStamp;
				var data = element.data("sapdelayeddoubleclick_lastClickTimestamp");
				var lastTimestamp = data || 0;
				element.data("sapdelayeddoubleclick_lastClickTimestamp", currentTimestamp);
				var diff = currentTimestamp - lastTimestamp;
				return (diff >= 300 && diff <= 1300);
			}
		}
	};

	/**
	 * Ordered array of the {@link module:sap/ui/events/PseudoEvents.events}.
	 *
	 * Order is significant as some check methods rely on the fact that they are tested before other methods.
	 * The array is processed during event analysis (when classifying browser events as pseudo events).
	 * @public
	 */
	PseudoEvents.order = ["sapdown", "sapdownmodifiers", "sapshow", "sapup", "sapupmodifiers", "saphide", "sapleft", "sapleftmodifiers", "sapright", "saprightmodifiers", "saphome", "saphomemodifiers", "saptop", "sapend", "sapendmodifiers", "sapbottom", "sappageup", "sappageupmodifiers", "sappagedown", "sappagedownmodifiers", "sapselect", "sapselectmodifiers", "sapspace", "sapspacemodifiers", "sapenter", "sapentermodifiers", "sapexpand", "sapbackspace", "sapbackspacemodifiers", "sapdelete", "sapdeletemodifiers", "sapexpandmodifiers", "sapcollapse", "sapcollapsemodifiers", "sapcollapseall", "sapescape", "saptabnext", "saptabprevious", "sapskipforward", "sapskipback", "sapprevious", "sappreviousmodifiers", "sapnext", "sapnextmodifiers", "sapdecrease", "sapminus", "sapdecreasemodifiers", "sapincrease", "sapplus", "sapincreasemodifiers", "sapdelayeddoubleclick"];


	/**
	 * Function for initialization of an Array containing all basic event types of the available pseudo events.
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	PseudoEvents.getBasicTypes = function() {
		var mEvents = PseudoEvents.events,
			aResult = [];

		for (var sName in mEvents) {
			if (mEvents[sName].aTypes) {
				for (var j = 0, js = mEvents[sName].aTypes.length; j < js; j++) {
					var sType = mEvents[sName].aTypes[j];
					if (aResult.indexOf(sType) == -1) {
						aResult.push(sType);
					}
				}
			}
		}

		this.getBasicTypes = function() {
			return aResult.slice();
		};
		return aResult;
	};

	/**
	 * Array containing all basic event types of the available pseudo events.
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	PseudoEvents.addEvent = function(oEvent) {
		PseudoEvents.events[oEvent.sName] = oEvent;
		PseudoEvents.order.push(oEvent.sName);
	};

	return PseudoEvents;
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
sap.ui.predefine("sap/ui/events/TouchToMouseMapping", [], function() {
	"use strict";
	/**
	 * @namespace
	 * @since 1.58
	 * @alias module:sap/ui/events/TouchToMouseMapping
	 * @private
	 * @ui5-restricted module:sap/ui/events/jquery/EventSimulation
	 */
	var TouchToMouseMapping = {};
	TouchToMouseMapping.init = function(oContext) {

		var oDocument = oContext,
			bHandleEvent = false,
			oTarget = null,
			bIsMoved = false,
			iStartX,
			iStartY,
			i = 0;

		var aMouseEvents = ["mousedown", "mouseover", "mouseup", "mouseout", "click"];

		/**
		 * Fires a synthetic mouse event for a given type and native touch event.
		 * @param {string} sType the type of the synthetic event to fire, e.g. "mousedown"
		 * @param {jQuery.Event} oEvent the event object
		 * @private
		 */
		var fireMouseEvent = function(sType, oEvent) {

			if (!bHandleEvent) {
				return;
			}

			// we need mapping of the different event types to get the correct target
			var oMappedEvent = oEvent.type == "touchend" ? oEvent.changedTouches[0] : oEvent.touches[0];

			// create the synthetic event
			var newEvent = oDocument.createEvent('MouseEvent'); // trying to create an actual TouchEvent will create an error
			newEvent.initMouseEvent(sType, true, true, window, oEvent.detail,
				oMappedEvent.screenX, oMappedEvent.screenY, oMappedEvent.clientX, oMappedEvent.clientY,
				oEvent.ctrlKey, oEvent.shiftKey, oEvent.altKey, oEvent.metaKey,
				oEvent.button, oEvent.relatedTarget);

			newEvent.isSynthetic = true;

			// Timeout needed. Do not interrupt the native event handling.
			window.setTimeout(function() {
				oTarget.dispatchEvent(newEvent);
			}, 0);
		};

		/**
		 * Checks if the target of the event is an input field.
		 * @param {jQuery.Event} oEvent the event object
		 * @return {boolean} whether the target of the event is an input field.
		 */
		var isInputField = function(oEvent) {
			return oEvent.target.tagName.match(/input|textarea|select/i);
		};

		/**
		 * Mouse event handler. Prevents propagation for native events.
		 * @param {jQuery.Event} oEvent the event object
		 * @private
		 */
		var onMouseEvent = function(oEvent) {
			if (!oEvent.isSynthetic && !isInputField(oEvent)) {
				oEvent.stopPropagation();
				oEvent.preventDefault();
			}
		};

		/**
		 * Touch start event handler. Called whenever a finger is added to the surface. Fires mouse start event.
		 * @param {jQuery.Event} oEvent the event object
		 * @private
		 */
		var onTouchStart = function(oEvent) {
			var oTouches = oEvent.touches,
				oTouch;

			bHandleEvent = (oTouches.length == 1 && !isInputField(oEvent));

			bIsMoved = false;
			if (bHandleEvent) {
				oTouch = oTouches[0];

				// As we are only interested in the first touch target, we remember it
				oTarget = oTouch.target;
				if (oTarget.nodeType === 3) {

					// no text node
					oTarget = oTarget.parentNode;
				}

				// Remember the start position of the first touch to determine if a click was performed or not.
				iStartX = oTouch.clientX;
				iStartY = oTouch.clientY;
				fireMouseEvent("mousedown", oEvent);
			}
		};

		/**
		 * Touch move event handler. Fires mouse move event.
		 * @param {jQuery.Event} oEvent the event object
		 * @private
		 */
		var onTouchMove = function(oEvent) {
			var oTouch;

			if (bHandleEvent) {
				oTouch = oEvent.touches[0];

				// Check if the finger is moved. When the finger was moved, no "click" event is fired.
				if (Math.abs(oTouch.clientX - iStartX) > 10 || Math.abs(oTouch.clientY - iStartY) > 10) {
					bIsMoved = true;
				}

				if (bIsMoved) {

					// Fire "mousemove" event only when the finger was moved. This is to prevent unwanted movements.
					fireMouseEvent("mousemove", oEvent);
				}
			}
		};

		/**
		 * Touch end event handler. Fires mouse up and click event.
		 * @param {jQuery.Event} oEvent the event object
		 * @private
		 */
		var onTouchEnd = function(oEvent) {
			fireMouseEvent("mouseup", oEvent);
			if (!bIsMoved) {
				fireMouseEvent("click", oEvent);
			}
		};

		/**
		 * Touch cancel event handler. Fires mouse up event.
		 * @param {jQuery.Event} oEvent the event object
		 * @private
		 */
		var onTouchCancel = function(oEvent) {
			fireMouseEvent("mouseup", oEvent);
		};

		// Bind mouse events
		for (; i < aMouseEvents.length; i++) {

			// Add click on capturing phase to prevent propagation if necessary
			oDocument.addEventListener(aMouseEvents[i], onMouseEvent, true);
		}

		// Bind touch events
		oDocument.addEventListener('touchstart', onTouchStart, true);
		oDocument.addEventListener('touchmove', onTouchMove, true);
		oDocument.addEventListener('touchend', onTouchEnd, true);
		oDocument.addEventListener('touchcancel', onTouchCancel, true);

		/**
		 * Disable touch to mouse handling
		 *
		 * @private
	 	 * @ui5-restricted module:sap/ui/events/jquery/EventSimulation
		 */
		TouchToMouseMapping.disableTouchToMouseHandling = function() {
			var i = 0;

			// unbind touch events
			oDocument.removeEventListener('touchstart', onTouchStart, true);
			oDocument.removeEventListener('touchmove', onTouchMove, true);
			oDocument.removeEventListener('touchend', onTouchEnd, true);
			oDocument.removeEventListener('touchcancel', onTouchCancel, true);

			// unbind mouse events
			for (; i < aMouseEvents.length; i++) {
				oDocument.removeEventListener(aMouseEvents[i], onMouseEvent, true);
			}
		};
	};

	return TouchToMouseMapping;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/events/checkMouseEnterOrLeave", [], function() {
	"use strict";

	/**
	 * Checks a given mouseover or mouseout event whether it is
	 * equivalent to a mouseenter or mouseleave event regarding the given DOM reference.
	 *
	 * @function
	 * @since 1.58
	 * @public
	 * @alias module:sap/ui/events/checkMouseEnterOrLeave
	 * @param {jQuery.Event} oEvent The Mouse Event
	 * @param {Element} oDomRef The domref of the element to check
	 * @returns {boolean} True if the provided event is equivalent
	 */
	var fnCheckMouseEnterOrLeave = function checkMouseEnterOrLeave(oEvent, oDomRef) {
		if (oEvent.type != "mouseover" && oEvent.type != "mouseout") {
			return false;
		}

		var isMouseEnterLeave = false;
		var element = oDomRef;
		var parent = oEvent.relatedTarget;

		try {
			while (parent && parent !== element) {
				parent = parent.parentNode;
			}

			if (parent !== element) {
				isMouseEnterLeave = true;
			}
		} catch (e) {
			//escape eslint check for empty block
		}

		return isMouseEnterLeave;
	};

	return fnCheckMouseEnterOrLeave;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/events/jquery/EventSimulation", [
	"sap/base/i18n/Localization",
	'sap/base/util/Version',
	'sap/ui/core/Element',
	'sap/ui/events/PseudoEvents',
	'sap/ui/events/checkMouseEnterOrLeave',
	'sap/ui/events/ControlEvents',
	'sap/ui/Device',
	'sap/ui/events/TouchToMouseMapping',
	'sap/ui/thirdparty/jquery',
	'sap/ui/thirdparty/jquery-mobile-custom'
], function(Localization, Version, Element, PseudoEvents, checkMouseEnterOrLeave, ControlEvents, Device, TouchToMouseMapping, jQuery /*, jQueryMobile*/) {
	"use strict";

	/**
	 * @namespace
	 * @alias module:sap/ui/events/jquery/EventSimulation
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	var oEventSimulation = {};

	var jQVersion = Version(jQuery.fn.jquery);

	oEventSimulation.aAdditionalControlEvents = [];
	oEventSimulation.aAdditionalPseudoEvents = [];

	/**
	 * This function adds the simulated event prefixed with string "sap" to ControlEvents.events.
	 *
	 * When UIArea binds to the simulated event with prefix, it internally binds to the original events with the given handler and
	 * also provides the additional configuration data in the following format:
	 *
	 * {
	 * 	domRef: // the DOM reference of the UIArea
	 * 	eventName: // the simulated event name
	 * 	sapEventName: // the simulated event name with sap prefix
	 * 	eventHandle: // the handler that should be registered to simulated event with sap prefix
	 * }
	 *
	 * @param {string} sSimEventName The name of the simulated event
	 * @param {array} aOrigEvents The array of original events that should be simulated from
	 * @param {function} fnHandler The function which is bound to the original events
	 * @private
	 */
	oEventSimulation._createSimulatedEvent = function(sSimEventName, aOrigEvents, fnHandler) {
		var sHandlerKey = "__" + sSimEventName + "Handler";
		var sSapSimEventName = "sap" + sSimEventName;
		this.aAdditionalControlEvents.push(sSapSimEventName);
		this.aAdditionalPseudoEvents.push({
			sName: sSimEventName,
			aTypes: [sSapSimEventName],
			fnCheck: function(oEvent) {
				return true;
			}
		});

		jQuery.event.special[sSapSimEventName] = {
			// When binding to the simulated event with prefix is done through jQuery, this function is called and redirect the registration
			// to the original events. Doing in this way we can simulate the event from listening to the original events.
			add: function(oHandle) {
				var that = this,
					$this = jQuery(this),
					oAdditionalConfig = {
						domRef: that,
						eventName: sSimEventName,
						sapEventName: sSapSimEventName,
						eventHandle: oHandle
					};

				var fnHandlerWrapper = function(oEvent) {
					fnHandler(oEvent, oAdditionalConfig);
				};

				oHandle.__sapSimulatedEventHandler = fnHandlerWrapper;
				for (var i = 0; i < aOrigEvents.length; i++) {
					$this.on(aOrigEvents[i], fnHandlerWrapper);
				}
			},

			// When unbinding to the simulated event with prefix is done through jQuery, this function is called and redirect the deregistration
			// to the original events.
			remove: function(oHandle) {
				var $this = jQuery(this);
				var fnHandler = oHandle.__sapSimulatedEventHandler;
				$this.removeData(sHandlerKey + oHandle.guid);
				for (var i = 0; i < aOrigEvents.length; i++) {
					jQuery.event.remove(this, aOrigEvents[i], fnHandler);
				}
			}
		};
	};

	/**
	 * This function simulates the corresponding touch event by listening to mouse event.
	 *
	 * The simulated event will be dispatch through UI5 event delegation which means that the <code>on"EventName"</code> function is called
	 * on control's prototype.
	 *
	 * @param {jQuery.Event} oEvent The original event object
	 * @param {object} oConfig Additional configuration passed from createSimulatedEvent function
	 * @private
	 */
	oEventSimulation._handleMouseToTouchEvent = function(oEvent, oConfig) {
		// Suppress the delayed mouse events simulated on touch enabled device
		// the mark is done within jquery-mobile-custom.js
		if (oEvent.isMarked("delayedMouseEvent")) {
			return;
		}

		var $DomRef = jQuery(oConfig.domRef),
			oControl = Element.closestTo(oEvent.target),
			sTouchStartControlId = $DomRef.data("__touchstart_control"),
			oTouchStartControlDOM = sTouchStartControlId && window.document.getElementById(sTouchStartControlId);

		// Checks if the mouseout event should be handled, the mouseout of the inner DOM shouldn't be handled when the mouse cursor
		// is still inside the control's root DOM node
		if (oEvent.type === "mouseout" && !checkMouseEnterOrLeave(oEvent, oConfig.domRef)
			&& (!oTouchStartControlDOM || !checkMouseEnterOrLeave(oEvent, oTouchStartControlDOM))
		) {
			return;
		}

		var oNewEvent = jQuery.event.fix(oEvent.originalEvent || oEvent);
		oNewEvent.type = oConfig.sapEventName;

		//reset the _sapui_handledByUIArea flag
		if (oNewEvent.isMarked("firstUIArea")) {
			oNewEvent.setMark("handledByUIArea", false);
		}

		var aTouches = [{
			identifier: 1,
			pageX: oNewEvent.pageX,
			pageY: oNewEvent.pageY,
			clientX: oNewEvent.clientX,
			clientY: oNewEvent.clientY,
			screenX: oNewEvent.screenX,
			screenY: oNewEvent.screenY,
			target: oNewEvent.target,
			radiusX: 1,
			radiusY: 1,
			rotationAngle: 0
		}];

		switch (oConfig.eventName) {
			case "touchstart":
				// save the control id in case of touchstart event
				if (oControl) {
					$DomRef.data("__touchstart_control", oControl.getId());
				}
				// fall through
			case "touchmove":
				oNewEvent.touches = oNewEvent.changedTouches = oNewEvent.targetTouches = aTouches;
				break;

			case "touchend":
				oNewEvent.changedTouches = aTouches;
				oNewEvent.touches = oNewEvent.targetTouches = [];
				break;
			// no default
		}

		if (oConfig.eventName === "touchstart" || $DomRef.data("__touch_in_progress")) {
			$DomRef.data("__touch_in_progress", "X");

			// When saptouchend event is generated from mouseout event, it has to be marked for being correctly handled inside UIArea.
			// for example, when sap.m.Image control is used inside sap.m.Button control, the following situation can happen:
			// 	1. Mousedown on image.
			// 	2. Keep mousedown and move mouse out of image.
			// 	3. ontouchend function will be called on image control and bubbled up to button control
			// 	4. However, the ontouchend function shouldn't be called on button.
			//
			// With this parameter, UIArea can check if the touchend is generated from mouseout event and check if the target is still
			// inside the current target. Executing the corresponding logic only when the target is out of the current target.
			if (oEvent.type === "mouseout") {
				oNewEvent.setMarked("fromMouseout");
			}

			// touchstart event is always forwarded to the control without any check
			// other events are checked with the touchstart control id in UIArea.js and we save the touchstart control
			// id to the event. In UIArea, the event is dispatched to a UI5 element only when the root DOM of that UI5
			// element contains or equals the touchstart control DOM
			if (oConfig.eventName !== "touchstart" && (!oControl || oControl.getId() !== sTouchStartControlId)) {
				oNewEvent.setMark("scopeCheckId", sTouchStartControlId);
			}

			// dragstart event is only used to determine when to stop the touch process and shouldn't trigger any event
			if (oEvent.type !== "dragstart") {
				oConfig.eventHandle.handler.call(oConfig.domRef, oNewEvent);
			}

			// here the fromMouseout flag is checked, terminate the touch progress when the native event is dragstart or touchend event
			// is not marked with fromMouseout.
			if ((oConfig.eventName === "touchend" || oEvent.type === "dragstart") && !oNewEvent.isMarked("fromMouseout")) {
				$DomRef.removeData("__touch_in_progress");
				$DomRef.removeData("__touchstart_control");
			}
		}
	};

	// Simulate touch events on NOT delayed mouse events (delayed mouse
	// events are filtered out in fnMouseToTouchHandler)
	oEventSimulation._initTouchEventSimulation = function() {
		this._createSimulatedEvent("touchstart", ["mousedown"], this._handleMouseToTouchEvent);
		this._createSimulatedEvent("touchend", ["mouseup", "mouseout"], this._handleMouseToTouchEvent);
		// Browser doesn't fire any mouse event after dragstart, so we need to listen to dragstart to cancel the current touch process in order
		// to correctly stop firing the touchmove event
		this._createSimulatedEvent("touchmove", ["mousemove", "dragstart"], this._handleMouseToTouchEvent);
	};

	// polyfill for iOS context menu event (mapped to taphold)
	oEventSimulation._initContextMenuSimulation = function() {
		//map the taphold event to contextmenu event
		var fnSimulatedFunction = function(oEvent, oConfig) {
			var oNewEvent = jQuery.event.fix(oEvent.originalEvent || oEvent);
			oNewEvent.type = oConfig.sapEventName;

			// The original handler is called only when there's no text selected
			if (!window.getSelection || !window.getSelection() || window.getSelection().toString() === "") {
				oConfig.eventHandle.handler.call(oConfig.domRef, oNewEvent);
			}
		};
		this._createSimulatedEvent("contextmenu", ["taphold"], fnSimulatedFunction);
	};

	// Simulate mouse events on browsers firing touch events
	oEventSimulation._initMouseEventSimulation = function() {

		var bFingerIsMoved = false,
			iMoveThreshold = jQuery.vmouse.moveDistanceThreshold,
			iStartX, iStartY,
			iOffsetX, iOffsetY;

		var fnCreateNewEvent = function(oEvent, oConfig, oMappedEvent) {
			var oNewEvent = jQuery.event.fix(oEvent.originalEvent || oEvent);
			oNewEvent.type = oConfig.sapEventName;

			delete oNewEvent.touches;
			delete oNewEvent.changedTouches;
			delete oNewEvent.targetTouches;

			//TODO: add other properties that should be copied to the new event
			oNewEvent.screenX = oMappedEvent.screenX;
			oNewEvent.screenY = oMappedEvent.screenY;
			oNewEvent.clientX = oMappedEvent.clientX;
			oNewEvent.clientY = oMappedEvent.clientY;
			oNewEvent.ctrlKey = oMappedEvent.ctrlKey;
			oNewEvent.altKey = oMappedEvent.altKey;
			oNewEvent.shiftKey = oMappedEvent.shiftKey;
			// The simulated mouse event should always be clicked by the left key of the mouse
			oNewEvent.button = 0;

			return oNewEvent;
		};

		/**
		 * This function simulates the corresponding mouse event by listening to touch event (touchmove).
		 *
		 * The simulated event will be dispatch through UI5 event delegation which means that the on"EventName" function is called
		 * on control's prototype.
		 *
		 * @param {jQuery.Event} oEvent The original event object
		 * @param {object} oConfig Additional configuration passed from createSimulatedEvent function
		 */
		var fnTouchMoveToMouseHandler = function(oEvent, oConfig) {
			if (oEvent.isMarked("handledByTouchToMouse")) {
				return;
			}
			oEvent.setMarked("handledByTouchToMouse");

			if (!bFingerIsMoved) {
				var oTouch = oEvent.originalEvent.touches[0];
				bFingerIsMoved = (Math.abs(oTouch.pageX - iStartX) > iMoveThreshold ||
					Math.abs(oTouch.pageY - iStartY) > iMoveThreshold);
			}

			var oNewEvent = fnCreateNewEvent(oEvent, oConfig, oEvent.touches[0]);

			setTimeout(function() {
				oNewEvent.setMark("handledByUIArea", false);
				oConfig.eventHandle.handler.call(oConfig.domRef, oNewEvent);
			}, 0);
		};

		/**
		 * This function simulates the corresponding mouse event by listening to touch event (touchstart, touchend, touchcancel).
		 *
		 * The simulated event will be dispatch through UI5 event delegation which means that the on"EventName" function is called
		 * on control's prototype.
		 *
		 * @param {jQuery.Event} oEvent The original event object
		 * @param {object} oConfig Additional configuration passed from createSimulatedEvent function
		 */
		var fnTouchToMouseHandler = function(oEvent, oConfig) {
			if (oEvent.isMarked("handledByTouchToMouse")) {
				return;
			}
			oEvent.setMarked("handledByTouchToMouse");

			var oNewStartEvent, oNewEndEvent, bSimulateClick;

			function createNewEvent() {
				return fnCreateNewEvent(oEvent, oConfig, oConfig.eventName === "mouseup" ? oEvent.changedTouches[0] : oEvent.touches[0]);
			}

			if (oEvent.type === "touchstart") {

				var oTouch = oEvent.originalEvent.touches[0];
				bFingerIsMoved = false;
				iStartX = oTouch.pageX;
				iStartY = oTouch.pageY;
				iOffsetX = Math.round(oTouch.pageX - jQuery(oEvent.target).offset().left);
				iOffsetY = Math.round(oTouch.pageY - jQuery(oEvent.target).offset().top);

				oNewStartEvent = createNewEvent();
				setTimeout(function() {
					oNewStartEvent.setMark("handledByUIArea", false);
					oConfig.eventHandle.handler.call(oConfig.domRef, oNewStartEvent);
				}, 0);
			} else if (oEvent.type === "touchend") {
				oNewEndEvent = createNewEvent();
				bSimulateClick = !bFingerIsMoved;

				setTimeout(function() {
					oNewEndEvent.setMark("handledByUIArea", false);
					oConfig.eventHandle.handler.call(oConfig.domRef, oNewEndEvent);
					if (bSimulateClick) {
						// also call the onclick event handler when touchend event is received and the movement is within threshold
						oNewEndEvent.type = "click";
						oNewEndEvent.getPseudoTypes = jQuery.Event.prototype.getPseudoTypes; //Reset the pseudo types due to type change
						oNewEndEvent.setMark("handledByUIArea", false);
						oNewEndEvent.offsetX = iOffsetX; // use offset from touchstart
						oNewEndEvent.offsetY = iOffsetY; // use offset from touchstart
						oConfig.eventHandle.handler.call(oConfig.domRef, oNewEndEvent);
					}
				}, 0);
			}
		};
		this._createSimulatedEvent("mousedown", ["touchstart"], fnTouchToMouseHandler);
		this._createSimulatedEvent("mousemove", ["touchmove"], fnTouchMoveToMouseHandler);
		this._createSimulatedEvent("mouseup", ["touchend", "touchcancel"], fnTouchToMouseHandler);
	};

	oEventSimulation._init = function(aEvents) {
		// Define additional jQuery Mobile events to be added to the event list
		// TODO taphold cannot be used (does not bubble / has no target property) -> Maybe provide own solution
		// IMPORTANT: update the public documentation when extending this list
		this.aAdditionalControlEvents.push("swipe", "tap", "swipeleft", "swiperight", "scrollstart", "scrollstop");
		//Define additional pseudo events to be added to the event list
		this.aAdditionalPseudoEvents.push({
			sName: "swipebegin", aTypes: ["swipeleft", "swiperight"], fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				return (bRtl && oEvent.type === "swiperight") || (!bRtl && oEvent.type === "swipeleft");
			}
		});
		this.aAdditionalPseudoEvents.push({
			sName: "swipeend", aTypes: ["swipeleft", "swiperight"], fnCheck: function(oEvent) {
				var bRtl = Localization.getRTL();
				return (!bRtl && oEvent.type === "swiperight") || (bRtl && oEvent.type === "swipeleft");
			}
		});
		// Add all defined events to the event infrastructure
		//
		// jQuery has inversed the order of event registration when multiple events are passed into jQuery.on method from version 1.9.1.
		//
		// UIArea binds to both touchstart and saptouchstart event and saptouchstart internally also binds to touchstart event. Before
		// jQuery version 1.9.1, the touchstart event handler is called before the saptouchstart event handler and our flags (e.g. _sapui_handledByUIArea)
		// still work. However since the order of event registration is inversed from jQuery version 1.9.1, the saptouchstart event handler is called
		// before the touchstart one, our flags don't work anymore.
		//
		// Therefore jQuery version needs to be checked in order to decide the event order in ControlEvents.events.
		if (jQVersion.compareTo("1.9.1") < 0) {
			aEvents = aEvents.concat(this.aAdditionalControlEvents);
		} else {
			aEvents = this.aAdditionalControlEvents.concat(aEvents);
		}

		for (var i = 0; i < this.aAdditionalPseudoEvents.length; i++) {
			PseudoEvents.addEvent(this.aAdditionalPseudoEvents[i]);
		}
		return aEvents;
	};



	if (Device.browser.webkit && /Mobile/.test(navigator.userAgent) && Device.support.touch) {
		TouchToMouseMapping.init(window.document);
		oEventSimulation.disableTouchToMouseHandling = TouchToMouseMapping.disableTouchToMouseHandling;
	}

	if (!oEventSimulation.disableTouchToMouseHandling) {
		oEventSimulation.disableTouchToMouseHandling = function() {};
	}

	// touch events natively supported
	if (Device.support.touch) {

		// Define additional native events to be added to the event list.
		// TODO: maybe add "gesturestart", "gesturechange", "gestureend" later?
		ControlEvents.events.push("touchstart", "touchend", "touchmove", "touchcancel");
	}

	//Add mobile touch events if touch is supported
	(function initTouchEventSupport() {
		oEventSimulation.touchEventMode = "SIM";

		if (Device.support.touch) { // touch events natively supported
			oEventSimulation.touchEventMode = "ON";

			// ensure that "oEvent.touches", ... works (and not only "oEvent.originalEvent.touches", ...)
			if (jQVersion.compareTo("3.0.0") < 0) {
				jQuery.event.props.push("touches", "targetTouches", "changedTouches");
			} // else: jQuery 3.0ff already manages these properties
		}

		oEventSimulation._initTouchEventSimulation();

		// polyfill for iOS context menu event (mapped to taphold)
		if (Device.os.ios) {
			oEventSimulation._initContextMenuSimulation();
		}

		if (Device.support.touch) {
			// Deregister the previous touch to mouse event simulation (see line 25 in this file)
			oEventSimulation.disableTouchToMouseHandling();
			oEventSimulation._initMouseEventSimulation();
		}
		ControlEvents.events = oEventSimulation._init(ControlEvents.events);
	}());

	return oEventSimulation;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides enumeration sap.ui.model.FilterOperator
sap.ui.predefine("sap/ui/model/BindingMode", function() {
	"use strict";


	/**
	* Binding type definitions.
	*
	* @enum {string}
	* @public
	* @alias sap.ui.model.BindingMode
	*/
	var BindingMode = {

			/**
			 * BindingMode default means that the binding mode of the model is used
			 * @public
			 */
			Default: "Default",

			/**
			 * BindingMode one time means value is only read from the model once
			 * @public
			 */
			OneTime: "OneTime",

			/**
			 * BindingMode one way means from model to view
			 * @public
			 */
			OneWay: "OneWay",

			/**
			 * BindingMode two way means from model to view and vice versa
			 * @public
			 */
			TwoWay: "TwoWay"

	};

	return BindingMode;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides a filter for list bindings
sap.ui.predefine("sap/ui/model/Filter", [
	"./FilterOperator",
	"sap/base/Log",
	"sap/base/i18n/Localization",
	"sap/ui/base/Object"
], function(FilterOperator, Log, Localization, BaseObject) {
	"use strict";

	/**
	 * Constructor for Filter.
	 *
	 * You either pass a single object literal with the filter parameters or use the individual
	 * constructor arguments. No matter which variant is used, only certain combinations of
	 * parameters are supported (the following list uses the names from the object literal):
	 * <ul>
	 * <li>A <code>path</code>, <code>operator</code> and one or two values (<code>value1</code>,
	 *   <code>value2</code>), depending on the operator
	 * <li>A <code>path</code> and a custom filter function <code>test</code>
	 * <li>An array of other filters named <code>filters</code> and a Boolean flag <code>and</code>
	 *   that specifies whether to combine the filters with an AND (<code>true</code>) or an OR
	 *   (<code>false</code>) operator.
	 * </ul>
	 * An error will be logged to the console if an invalid combination of parameters is provided.
	 *
	 * Please note that a model implementation may not support a custom filter function, e.g. if the
	 * model does not perform client-side filtering. It also depends on the model implementation if
	 * the filtering is case sensitive or not. Client models filter case insensitive compared to the
	 * OData models which filter case sensitive by default. See particular model documentation for
	 * details.
	 *
	 * The filter operators {@link sap.ui.model.FilterOperator.Any "Any"} and
	 * {@link sap.ui.model.FilterOperator.All "All"} are only supported in V4 OData models. When
	 * creating a filter instance with these filter operators, the argument <code>variable</code>
	 * only accepts a string identifier and <code>condition</code> needs to be another filter
	 * instance.
	 *
	 * @example <caption>Using an object with a path, an operator and one or two values</caption>
	 *
	 *   sap.ui.define(['sap/ui/model/Filter', 'sap/ui/model/FilterOperator'], function(Filter, FilterOperator) {
	 *     new Filter({
	 *       path: "Price",
	 *       operator: FilterOperator.BT,
	 *       value1: 11.0,
	 *       value2: 23.0
	 *     });
	 *   });
	 *
	 * @example <caption>Using a path and a custom filter function</caption>
	 *
	 *   new sap.ui.model.Filter({
	 *     path: "Price",
	 *     test: function(oValue) {
	 *        ...
	 *     }
	 *   })
	 *
	 * @example <caption>Combining a list of filters either with AND or OR</caption>
	 *
	 *   new Filter({
	 *     filters: [
	 *       ...
	 *       new Filter({
	 *         path: 'Quantity',
	 *         operator: FilterOperator.LT,
	 *         value1: 20
	 *       }),
	 *       new Filter({
	 *         path: 'Price',
	 *         operator: FilterOperator.GT,
	 *         value1: 14.0
	 *       })
	 *       ...
	 *     ],
	 *     and: true|false
	 *   })
	 *
	 * @example <caption>The filter operators <code>Any</code> and <code>All</code> map to the OData
	 *   V4 lambda operators <code>any</code> and <code>all</code>. They take a variable and another
	 *   filter as parameter and evaluate it on either a collection property or a collection of
	 *   entities.</caption>
	 *
	 *   // find Orders where all of the 'Items' in the order have a 'Quantity' > 100
	 *   // (assumes that Filter and FilterOperator have been declared as dependencies, see previous examples)
	 *   new Filter({
	 *     path: 'Items',
	 *     operator: FilterOperator.All,
	 *     variable: 'item',
	 *     condition: new Filter({
	 *       path: 'item/Quantity',
	 *       operator: FilterOperator.GT,
	 *       value1: 100.0
	 *     })
	 *   });
	 *
	 * @example <caption>For the filter operator <code>Any</code> either both a lambda
	 *   <code>variable</code> and a <code>condition</code> have to be given or neither.</caption>
	 *   new Filter({
	 *     path: 'Items',
	 *     operator: FilterOperator.Any
	 *   });
	 *
	 * @example <caption>Legacy signature: Same as above, but using individual constructor
	 *   arguments. Not supported for filter operators <code>Any</code> and <code>All</code>.
	 *   </caption>
	 *
	 *     new sap.ui.model.Filter(sPath, sOperator, vValue1, vValue2);
	 *   OR
	 *     new sap.ui.model.Filter(sPath, fnTest);
	 *   OR
	 *     new sap.ui.model.Filter(aFilters, bAnd);
	 *
	 * @class
	 * Filter for the list binding.
	 *
	 * @param {object|string|sap.ui.model.Filter[]} vFilterInfo
	 *   Filter info object or a path or an array of filters
	 * @param {string} [vFilterInfo.path]
	 *   Binding path for this filter
	 * @param {function(any):boolean} [vFilterInfo.test]
	 *   Function used for the client-side filtering of items. It should return a Boolean indicating
	 *   whether the current item passes the filter. If no test function is given, a default test
	 *   function is used, based on the given filter operator and the comparator function.
	 * @param {function(any,any):number} [vFilterInfo.comparator]
	 *   Function used to compare two values for equality and order during client-side filtering.
	 *   Two values are given as parameters. The function is expected to return:
	 *   <ul>
	 *     <li>a negative number if the first value is smaller than the second value,
	 *     <li><code>0</code> if the two values are equal,
	 *     <li>a positive number if the first value is larger than the second value,
	 *     <li><code>NaN</code> for non-comparable values.
	 *   </ul>
	 *   If no function is given, {@link sap.ui.model.Filter.defaultComparator} is used.
	 * @param {sap.ui.model.FilterOperator} [vFilterInfo.operator]
	 *   Operator used for the filter
	 * @param {any} [vFilterInfo.value1]
	 *   First value to use with the given filter operator
	 * @param {any} [vFilterInfo.value2]
	 *   Second value to use with the given filter operator, used only for the
	 *   {@link sap.ui.model.FilterOperator.BT "BT" between} and
	 *   {@link sap.ui.model.FilterOperator.NB "NB" not between} filter operators
	 * @param {string} [vFilterInfo.variable]
	 *   The variable name used in lambda operators ({@link sap.ui.model.FilterOperator.Any "Any"}
	 *   and {@link sap.ui.model.FilterOperator.All "All"})
	 * @param {sap.ui.model.Filter} [vFilterInfo.condition]
	 *   A filter instance which will be used as the condition for lambda
	 *   operators ({@link sap.ui.model.FilterOperator.Any "Any"} and
	 *   {@link sap.ui.model.FilterOperator.All "All"})
	 * @param {sap.ui.model.Filter[]} [vFilterInfo.filters]
	 *   An array of filters on which the logical conjunction is applied
	 * @param {boolean} [vFilterInfo.and=false]
	 *   Indicates whether an "AND" logical conjunction is applied on the filters. If it's not set
	 *   or set to <code>false</code>, an "OR" conjunction is applied.
	 * @param {boolean} [vFilterInfo.caseSensitive]
	 *   Indicates whether a string value should be compared case sensitive or not. The handling of
	 *   <code>undefined</code> depends on the model implementation.
	 * @param {sap.ui.model.FilterOperator|boolean|function(any):boolean} [vOperator]
	 *   Either a filter operator or a custom filter function or
	 *   a <code>boolean</code> flag that defines how to combine multiple filters
	 * @param {any} [vValue1]
	 *   First value to use with the given filter operator
	 * @param {any} [vValue2]
	 *   Second value to use with the given filter operator, used only for the
	 *   {@link sap.ui.model.FilterOperator.BT "BT" between} and
	 *   {@link sap.ui.model.FilterOperator.NB "NB" not between} filter operators
	 * @throws {Error}
	 *   If <code>vFilterInfo</code> or <code>vFilterInfo.filters</code> are arrays containing the
	 *   {@link sap.ui.model.Filter.NONE}, or
	 *   if <code>vFilterInfo.condition</code> is {@link sap.ui.model.Filter.NONE}, or
	 *   for the following incorrect combinations of filter operators and conditions:
	 *   <ul>
	 *     <li>"Any", if only a lambda variable or only a condition is given
	 *     <li>"Any" or "All": If
	 *       <ul>
	 *         <li>the <code>vFilterInfo</code> parameter is not in object notation,
	 *         <li><code>vFilterInfo.variable</code> is not a string,
	 *         <li><code>vFilterInfo.condition</code> is not an instance of
	 *               {@link sap.ui.model.Filter}.
	 *     </ul>
	 *   </ul>
	 *
	 * @public
	 * @alias sap.ui.model.Filter
	 * @extends sap.ui.base.Object
	 */
	var Filter = BaseObject.extend("sap.ui.model.Filter", /** @lends sap.ui.model.Filter.prototype */ {
		constructor : function(vFilterInfo, vOperator, vValue1, vValue2){
			BaseObject.call(this);
			//There are two different ways of specifying a filter
			//It can be passed in only one object or defined with parameters
			if (typeof vFilterInfo === "object" && !Array.isArray(vFilterInfo)) {
				this.sPath = vFilterInfo.path;
				this.sOperator = vFilterInfo.operator;
				this.oValue1 = vFilterInfo.value1;
				this.oValue2 = vFilterInfo.value2;
				this.sVariable = vFilterInfo.variable;
				this.oCondition = vFilterInfo.condition;
				this.aFilters = vFilterInfo.filters || vFilterInfo.aFilters; // support legacy name 'aFilters' (intentionally not documented)
				this.bAnd = vFilterInfo.and || vFilterInfo.bAnd; // support legacy name 'bAnd' (intentionally not documented)
				this.fnTest = vFilterInfo.test;
				this.fnCompare = vFilterInfo.comparator;
				this.bCaseSensitive = vFilterInfo.caseSensitive;
			} else {
				//If parameters are used we have to check whether a regular or a multi filter is specified
				if (Array.isArray(vFilterInfo)) {
					this.aFilters = vFilterInfo;
				} else {
					this.sPath = vFilterInfo;
				}
				if (typeof vOperator === "boolean") {
					this.bAnd = vOperator;
				} else if (typeof vOperator === "function" ) {
					this.fnTest = vOperator;
				} else {
					this.sOperator = vOperator;
				}
				this.oValue1 = vValue1;
				this.oValue2 = vValue2;

				if (this.sOperator === FilterOperator.Any || this.sOperator === FilterOperator.All) {
					throw new Error("The filter operators 'Any' and 'All' are only supported with the parameter object notation.");
				}
			}
			if (this.aFilters?.includes(Filter.NONE)) {
				throw new Error("Filter.NONE not allowed in multiple filter");
			} else if (this.oCondition && this.oCondition === Filter.NONE) {
				throw new Error("Filter.NONE not allowed as condition");
			}
			if (this.sOperator === FilterOperator.Any) {
				// for the Any operator we only have to further check the arguments if both are given
				if (this.sVariable && this.oCondition) {
					this._checkLambdaArgumentTypes();
				} else if (!this.sVariable && !this.oCondition) {
					// 'Any' accepts no arguments
				} else {
					// one argument is missing
					throw new Error("When using the filter operator 'Any', a lambda variable and a condition have to be given or neither.");
				}
			} else if (this.sOperator === FilterOperator.All) {
				this._checkLambdaArgumentTypes();
			} else if (Array.isArray(this.aFilters) && !this.sPath && !this.sOperator
					&& !this.oValue1 && !this.oValue2) {
				this._bMultiFilter = true;
				if ( !this.aFilters.every(isFilter) ) {
					Log.error("Filter in aggregation of multi filter has to be instance of"
						+ " sap.ui.model.Filter");
				}
			} else if (!this.aFilters && this.sPath !== undefined
					&& ((this.sOperator && this.oValue1 !== undefined) || this.fnTest)) {
				this._bMultiFilter = false;
			} else {
				Log.error("Wrong parameters defined for filter.");
			}
			this.sFractionalSeconds1 = undefined;
			this.sFractionalSeconds2 = undefined;
		}
	});

	/**
	 * A filter instance that is never fulfilled. When used to filter a list, no back-end request is
	 * sent and only transient entries remain.
	 *
	 * <b>Note:</b> Not all model implementations support this filter.
	 *
	 * @type {sap.ui.model.Filter}
	 * @public
 	 * @since 1.120.0
	 */
	Filter.NONE = new Filter({path : "/", test : () => false});

	/**
	 * Checks if the given filters contain the {@link sap.ui.model.Filter.NONE} filter instance together with
	 * other filters. If a single filter or <code>undefined</code> is provided, the check always succeeds.
	 *
	 * @param {sap.ui.model.Filter|sap.ui.model.Filter[]} [vFilter]
	 *   The filters to check
	 * @throws {Error} If the {@link sap.ui.model.Filter.NONE} filter instance is contained in <code>vFilter</code>
	 *   together with other filters
	 * @private
	 */
	Filter.checkFilterNone = function (vFilter) {
		if (Array.isArray(vFilter) && vFilter.length > 1 && vFilter.includes(Filter.NONE)) {
			throw new Error("Filter.NONE cannot be used together with other filters");
		}
	};

	/**
	 * Checks the types of the arguments for a lambda operator.
	 * @private
	 */
	Filter.prototype._checkLambdaArgumentTypes = function () {
		if (!this.sVariable || typeof this.sVariable !== "string") {
			throw new Error("When using the filter operators 'Any' or 'All', a string has to be given as argument 'variable'.");
		}
		if (!isFilter(this.oCondition)) {
			throw new Error("When using the filter operator 'Any' or 'All', a valid instance of sap.ui.model.Filter has to be given as argument 'condition'.");
		}
	};

	function isFilter(v) {
		return v instanceof Filter;
	}

	/**
	 * Set fractional seconds to be appended to the filter's first value in case it is a JavaScript <code>Date</code>
	 * instance. Note that the model resp. list binding where the filter is used need to support filtering with the
	 * resulting precision.
	 *
	 * @param {string} [sFractionalSeconds] The additional fractional seconds
	 *
	 * @ui5-restricted sap.ui.comp.smartfilterbar
	 * @private
	 */
	Filter.prototype.appendFractionalSeconds1 = function (sFractionalSeconds) {
		this.sFractionalSeconds1 = sFractionalSeconds;
	};

	/**
	 * Set fractional seconds to be appended to the filter's second value in case it is a <code>Date</code>
	 * instance. Note that the model resp. list binding where the filter is used need to support filtering with the
	 * resulting precision.
	 *
	 * @param {string} [sFractionalSeconds] The additional fractional seconds
	 *
	 * @ui5-restricted sap.ui.comp.smartfilterbar
	 * @private
	 */
	Filter.prototype.appendFractionalSeconds2 = function (sFractionalSeconds) {
		this.sFractionalSeconds2 = sFractionalSeconds;
	};

	var Type = {
		Logical: "Logical",
		Binary: "Binary",
		Unary: "Unary",
		Lambda: "Lambda",
		Reference: "Reference",
		Literal: "Literal",
		Variable: "Variable",
		Call: "Call",
		Custom: "Custom"
	};

	var Op = {
		Equal: "==",
		NotEqual: "!=",
		LessThan: "<",
		GreaterThan: ">",
		LessThanOrEqual: "<=",
		GreaterThanOrEqual: ">=",
		And: "&&",
		Or: "||",
		Not: "!"
	};

	var Func = {
		Contains: "contains",
		StartsWith: "startswith",
		EndsWith: "endswith"
	};

	/**
	 * Returns an AST for the filter.
	 *
	 * @param {boolean} bIncludeOrigin Whether the origin should be included in the AST
	 *
	 * @returns {object} An AST for the filter
	 * @throws {Error} If this filter has no or an unknown operator
	 *
	 * @private
	 */
	Filter.prototype.getAST = function (bIncludeOrigin) {
		var oResult, sOp, sOrigOp, oRef, oValue, oFromValue, oToValue, oVariable, oCondition;
		function logical(sOp, oLeft, oRight) {
			return {
				type: Type.Logical,
				op: sOp,
				left: oLeft,
				right: oRight
			};
		}
		function binary(sOp, oLeft, oRight) {
			return {
				type: Type.Binary,
				op: sOp,
				left: oLeft,
				right: oRight
			};
		}
		function unary(sOp, oArg) {
			return {
				type: Type.Unary,
				op: sOp,
				arg: oArg
			};
		}
		function lambda(sOp, oRef, oVariable, oCondition) {
			return {
				type: Type.Lambda,
				op: sOp,
				ref: oRef,
				variable: oVariable,
				condition: oCondition
			};
		}
		function reference(sPath) {
			return {
				type: Type.Reference,
				path: sPath
			};
		}
		function literal(vValue) {
			return {
				type: Type.Literal,
				value: vValue
			};
		}
		function variable(sName) {
			return {
				type: Type.Variable,
				name: sName
			};
		}
		function call(sName, aArguments) {
			return {
				type: Type.Call,
				name: sName,
				args: aArguments
			};
		}
		if (this.aFilters) { // multi filters
			sOp = this.bAnd ? Op.And : Op.Or;
			sOrigOp = this.bAnd ? "AND" : "OR";
			oResult = this.aFilters[this.aFilters.length - 1].getAST(bIncludeOrigin);
			for (var i = this.aFilters.length - 2; i >= 0; i--) {
				oResult = logical(sOp, this.aFilters[i].getAST(bIncludeOrigin), oResult);
			}
		} else { // other filter
			sOp = this.sOperator;
			sOrigOp = this.sOperator;
			oRef = reference(this.sPath);
			oValue = literal(this.oValue1);
			switch (sOp) {
				case FilterOperator.EQ:
					oResult = binary(Op.Equal, oRef, oValue);
					break;
				case FilterOperator.NE:
					oResult = binary(Op.NotEqual, oRef, oValue);
					break;
				case FilterOperator.LT:
					oResult = binary(Op.LessThan, oRef, oValue);
					break;
				case FilterOperator.GT:
					oResult = binary(Op.GreaterThan, oRef, oValue);
					break;
				case FilterOperator.LE:
					oResult = binary(Op.LessThanOrEqual, oRef, oValue);
					break;
				case FilterOperator.GE:
					oResult = binary(Op.GreaterThanOrEqual, oRef, oValue);
					break;
				case FilterOperator.Contains:
					oResult = call(Func.Contains, [oRef, oValue]);
					break;
				case FilterOperator.StartsWith:
					oResult = call(Func.StartsWith, [oRef, oValue]);
					break;
				case FilterOperator.EndsWith:
					oResult = call(Func.EndsWith, [oRef, oValue]);
					break;
				case FilterOperator.NotContains:
					oResult = unary(Op.Not, call(Func.Contains, [oRef, oValue]));
					break;
				case FilterOperator.NotStartsWith:
					oResult = unary(Op.Not, call(Func.StartsWith, [oRef, oValue]));
					break;
				case FilterOperator.NotEndsWith:
					oResult = unary(Op.Not, call(Func.EndsWith, [oRef, oValue]));
					break;
				case FilterOperator.BT:
					oFromValue = oValue;
					oToValue = literal(this.oValue2);
					oResult = logical(Op.And,
						binary(Op.GreaterThanOrEqual, oRef, oFromValue),
						binary(Op.LessThanOrEqual, oRef, oToValue)
					);
					break;
				case FilterOperator.NB:
					oFromValue = oValue;
					oToValue = literal(this.oValue2);
					oResult = logical(Op.Or,
						binary(Op.LessThan, oRef, oFromValue),
						binary(Op.GreaterThan, oRef, oToValue)
					);
					break;
				case FilterOperator.Any:
				case FilterOperator.All:
					oVariable = variable(this.sVariable);
					oCondition = this.oCondition.getAST(bIncludeOrigin);
					oResult = lambda(sOp, oRef, oVariable, oCondition);
					break;
				default:
					throw new Error("Unknown operator: " + sOp);
			}
		}
		if (bIncludeOrigin && !oResult.origin) {
			oResult.origin = sOrigOp;
		}
		return oResult;
};

	/**
	 * Returns the comparator function as provided on construction of this filter, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.comparator</code>.
	 *
	 * @returns {function(any):boolean|undefined} The comparator function
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getComparator = function () {
		return this.fnCompare;
	};

	/**
	 * Returns the filter instance which is used as the condition for lambda operators, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.condition</code>.
	 *
	 * @returns {sap.ui.model.Filter|undefined} The filter instance
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getCondition = function () {
		return this.oCondition;
	};

	/**
	 * Returns the filter operator used for this filter, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.operator</code> or
	 * <code>vOperator</code>.
	 *
	 *
	 * @returns {sap.ui.model.FilterOperator|undefined} The operator
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getOperator = function () {
		return this.sOperator;
	};

	/**
	 * Returns the binding path for this filter, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo</code> or
	 * <code>vFilterInfo.path</code>.
	 *
	 * @returns {string|undefined} The binding path
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getPath = function () {
		return this.sPath;
	};

	/**
	 * Returns the array of filters as specified on construction of this filter, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.filters</code>
	 *
	 * @returns {sap.ui.model.Filter[]|undefined} The array of filters
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getFilters = function () {
		return this.aFilters && this.aFilters.slice();
	};

	/**
	 * Returns the test function which is used to filter the items, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.test</code>.
	 *
	 * @returns {function(any,any):boolean|undefined} The test function
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getTest = function () {
		return this.fnTest;
	};

	/**
	 * Returns the first value that is used with the given filter operator, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.value1</code> or
	 * <code>vValue1</code>.
	 *
	 * @returns {any} The first value
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getValue1 = function () {
		return this.oValue1;
	};

	/**
	 * Returns the second value that is used with the given filter operator, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.value2</code> or
	 * <code>vValue2</code>.
	 *
	 * @returns {any} The second value
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getValue2 = function () {
		return this.oValue2;
	};

	/**
	 * Returns the variable name used in lambda operators, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.variable</code>.
	 *
	 * @returns {string|undefined} The variable name
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.getVariable = function () {
		return this.sVariable;
	};

	/**
	 * Indicates whether an "AND" logical conjunction is applied on the filters, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.and</code>.
	 *
	 * @returns {boolean} Whether "AND" is being applied
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.isAnd = function () {
		return !!this.bAnd;
	};

	/**
	 * Indicates whether a string value should be compared case sensitive, see
	 * {@link sap.ui.model.Filter#constructor}, parameter <code>vFilterInfo.caseSensitive</code>.
	 *
	 * @returns {boolean} Whether the string values should be compared case sensitive
	 * @public
	 * @since 1.96.0
	 */
	Filter.prototype.isCaseSensitive = function () {
		return this.bCaseSensitive;
	};

	/**
	 * Compares two values
	 *
	 * This is the default comparator function used for client-side filtering, if no custom
	 * comparator is given in the constructor. It does compare just by using equal/less than/greater
	 * than with automatic type casting, except for null values, which are neither less or greater,
	 * and string values where localeCompare is used.
	 *
	 * The comparator method returns -1, 0, 1 for comparable values and NaN for non-comparable
	 * values.
	 *
	 * @param {any} a the first value to compare
	 * @param {any} b the second value to compare
	 * @returns {number} -1, 0, 1 or NaN depending on the compare result
	 * @public
	 */
	Filter.defaultComparator = function(a, b) {
		if (a == b) {
			return 0;
		}
		if (a == null || b == null) {
			return NaN;
		}
		if (typeof a == "string" && typeof b == "string") {
			return a.localeCompare(b, Localization.getLanguageTag().toString());
		}
		if (a < b) {
			return -1;
		}
		if (a > b) {
			return 1;
		}
		return NaN;
	};

	return Filter;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides enumeration sap.ui.model.FilterOperator
sap.ui.predefine("sap/ui/model/FilterOperator", function() {
	"use strict";


	/**
	* Operators for the Filter.
	*
	* @enum {string}
	* @public
	* @alias sap.ui.model.FilterOperator
	*/
	var FilterOperator = {
			/**
			 * FilterOperator equals
			 * @public
			 */
			EQ: "EQ",

			/**
			 * FilterOperator not equals
			 * @public
			 */
			NE: "NE",

			/**
			 * FilterOperator less than
			 * @public
			 */
			LT: "LT",

			/**
			 * FilterOperator less or equals
			 * @public
			 */
			LE: "LE",

			/**
			 * FilterOperator greater than
			 * @public
			 */
			GT: "GT",

			/**
			 * FilterOperator greater or equals
			 * @public
			 */
			GE: "GE",

			/**
			 * FilterOperator between
			 *
			 * Used to filter all entries between the given boundaries.
			 * The filter result contains the boundaries, but no entries before or further.
			 * The order of the entries in the filter results is based on their occurrence in the input list.
			 *
			 * <b>Note, when used on strings:</b>
			 * The String comparison is based on lexicographical ordering.
			 * Characters are ranked in their alphabetical order.
			 * Words with the same preceding substring are ordered based on their length
			 * e.g. "Chris" comes before "Christian".
			 *
			 * The filtering includes the right boundary, but no strings further in the lexicographical ordering.
			 * e.g. between "A" and "C" includes the string "C", but not "Chris".
			 *
			 * @example
			 * <b>Numbers</b>
			 * [7, 1, 4, 3, 6, 5, 2, 8]
			 * between 4 and 6
			 * result: [4, 6, 5]
			 *
			 * @public
			 */
			BT: "BT",

			/**
			 * FilterOperator "Not Between"
			 *
			 * Used to filter all entries, which are not between the given boundaries.
			 * The filter result does not contains the boundaries, but only entries outside of the boundaries.
			 * The order of the entries in the filter results is based on their occurrence in the input list.
			 *
			 * <b>Note, when used on strings:</b>
			 * The String comparison is based on lexicographical ordering.
			 * Characters are ranked in their alphabetical order.
			 * Words with the same preceding substring are ordered based on their length
			 * e.g. "Chris" comes before "Christian".
			 *
			 * @example
			 * <b>Numbers</b>
			 * [7, 1, 4, 3, 6, 5, 2, 8]
			 * not between 4 and 6
			 * result: [7, 1, 3, 2, 8]
			 *
			 * @since 1.58.0
			 * @public
			 */
			NB: "NB",

			/**
			 * FilterOperator contains
			 * @public
			 */
			Contains: "Contains",

			/**
			 * FilterOperator not contains
			 *
			 * @since 1.58.0
			 * @public
			 */
			NotContains: "NotContains",

			/**
			 * FilterOperator starts with
			 *
			 * @public
			 */
			StartsWith: "StartsWith",

			/**
			 * FilterOperator not starts with
			 *
			 * @since 1.58.0
			 * @public
			 */
			NotStartsWith: "NotStartsWith",

			/**
			 * FilterOperator ends with
			 *
			 * @public
			 */
			EndsWith: "EndsWith",

			/**
			 * FilterOperator not ends with
			 *
			 * @since 1.58.0
			 * @public
			 */
			NotEndsWith: "NotEndsWith",

			/**
			 * Used to filter a list based on filter criteria that are defined in a nested filter for dependent subitems.
			 * <code>All</code> returns a list of those items for which <b>all</b> dependent subitems match the filter criteria of the nested filter.
			 * For example, a list of customers can be filtered by filter criteria that are applied to the list of orders the customer placed in the past.
			 * The filter returns a list of those customers that <b>always</b> ordered a specific product.
			 *
			 * This filter operator is only supported in OData V4 models.
			 *
			 * @since 1.48.0
			 * @public
			 */
			All: "All",

			/**
			 * Used to filter a list based on filter criteria that are defined in a nested filter for dependent subitems.
			 * <code>Any</code> returns a list of those items for which <b>at least one</b> dependent subitem matches the filter criteria of the nested filter.
			 * For example, a list of customers can be filtered by filter criteria that are applied to the list of orders the customer placed in the past.
			 * The filter returns a list of those customers that <b>at least once</b> ordered a specific product.
			 *
			 * This filter operator is only supported in OData V4 models.
			 *
			 * @since 1.48.0
			 * @public
			 */
			Any: "Any"
	};

	return FilterOperator;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*eslint-disable max-len */
// Provides the concept of a sorter for list bindings
sap.ui.predefine("sap/ui/model/Sorter", [
	"sap/base/Log",
	"sap/base/i18n/Localization",
	"sap/ui/base/Object"
], function(Log, Localization, BaseObject) {
	"use strict";

	/**
	 *
	 * Constructor for Sorter.
	 *
	 * @class
	 * Sorter for list bindings.
	 *
	 * Instances of this class define the sort order for a list binding.
	 *
	 *
	 * @param {string} sPath the binding path used for sorting
	 * @param {boolean} [bDescending=false] whether the sort order should be descending
	 * @param {boolean|function} [vGroup] configure grouping of the content, can either be true to
	 *   enable grouping based on the raw model property value, or a function which calculates the
	 *   group value out of the context (e.g. oContext.getProperty("date").getYear() for year
	 *   grouping). The control needs to implement the grouping behaviour for the aggregation which
	 *   you want to group. In case a function is provided it must either return a primitive type
	 *   value as the group key or an object containing a "key" property and additional properties
	 *   needed for group visualization. This object or the object with the primitive type return
	 *   value as "key" property is passed to the <code>groupHeaderFactory</code> function that has
	 *   been specified to create the group header for the control aggregation; see
	 *   {@link sap.ui.base.ManagedObject#bindAggregation}.
	 *   <b>Note:</b> Grouping via <code>vGroup=true</code> is only possible (and only makes sense)
	 *   for the primary sort property. A more complicated grouping is possible by providing a
	 *   grouping function. The sort order needs to fit to the grouping also in this case. See also
	 *   {@link topic:ec79a5d5918f4f7f9cbc2150e66778cc Sorting, Grouping, and Filtering for List
	 *   Binding}.
	 * @param {function} [fnComparator] A custom comparator function, which is used for client-side
	 *   sorting instead of the default comparator method. Information about parameters and expected
	 *   return values of such a method can be found in the
	 *   {@link #.defaultComparator default comparator} documentation.
	 *   <b>Note:</b> Custom comparator functions are meant to be used on the client. Models that
	 *   implement sorting in the backend usually don't support custom comparator functions. Consult
	 *   the documentation of the specific model implementation.
	 * @public
	 * @alias sap.ui.model.Sorter
	 * @extends sap.ui.base.Object
	 */
	var Sorter = BaseObject.extend("sap.ui.model.Sorter", /** @lends sap.ui.model.Sorter.prototype */ {

		constructor : function(sPath, bDescending, vGroup, fnComparator){
			if (typeof sPath === "object") {
				var oSorterData = sPath;
				sPath = oSorterData.path;
				bDescending = oSorterData.descending;
				vGroup = oSorterData.group;
				fnComparator = oSorterData.comparator;
			}
			this.sPath = sPath;

			// if a model separator is found in the path, extract model name
			var iSeparatorPos = this.sPath.indexOf(">");
			if (iSeparatorPos > 0) {
				// Model names are ignored, this must be kept for compatibility reasons. But using model names in the
				// sorter path make no technical sense as the binding cannot access any other models.
				Log.error("Model names are not allowed in sorter-paths: \"" + this.sPath + "\"");
				this.sPath = this.sPath.substr(iSeparatorPos + 1);
			}

			this.bDescending = bDescending;
			this.vGroup = vGroup;
			if (typeof vGroup == "boolean" && vGroup) {
				this.fnGroup = function(oContext) {
					return oContext.getProperty(this.sPath);
				};
			}
			if (typeof vGroup == "function") {
				this.fnGroup = vGroup;
			}
			this.fnCompare = fnComparator;
		},

		/**
		 * Returns a group object, at least containing a "key" property for group detection.
		 * May contain additional properties as provided by a custom group function.
		 *
		 * @param {sap.ui.model.Context} oContext the binding context
		 * @return {Object<string, any>} An object containing a key property and optional custom properties
		 * @public
		 */
		getGroup : function(oContext) {
			var oGroup = this.fnGroup(oContext);
			if (typeof oGroup === "string" || typeof oGroup === "number" || typeof oGroup === "boolean" || oGroup == null) {
				oGroup = {
					key: oGroup
				};
			}
			return oGroup;
		},

		/**
		 * Returns the group function of this Sorter. If grouping is not enabled on this Sorter, it will return
		 * undefined, if no explicit group function has been defined the default group function is returned.
		 * The returned function is bound to its Sorter, so it will group according to its own property path,
		 * even if it is used in the context of another Sorter.
		 *
		 * @return {function} The group function
		 * @public
		 */
		getGroupFunction : function() {
			return this.fnGroup && this.fnGroup.bind(this);
		}

	});

	/**
	 * Compares two values
	 *
	 * This is the default comparator function used for clientside sorting, if no custom comparator is given in the
	 * constructor. It does compare just by using equal/less than/greater than with automatic type casting, except
	 * for null values, which are last in ascending order, and string values where localeCompare is used.
	 *
	 * The comparator method returns -1, 0 or 1, depending on the order of the two items and is
	 * suitable to be used as a comparator method for Array.sort.
	 *
	 * @param {any} a the first value to compare
	 * @param {any} b the second value to compare
	 * @returns {int} -1, 0 or 1 depending on the compare result
	 * @public
	 */
	Sorter.defaultComparator = function(a, b) {
		if (a == b) {
			return 0;
		}
		if (b == null) {
			return -1;
		}
		if (a == null) {
			return 1;
		}
		if (typeof a == "string" && typeof b == "string") {
			return a.localeCompare(b, Localization.getLanguageTag().toString());
		}
		if (a < b) {
			return -1;
		}
		if (a > b) {
			return 1;
		}
		return 0;
	};

	return Sorter;

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
/*global XMLHttpRequest, document, location, window */
sap.ui.predefine("sap/ui/performance/Measurement", ['sap/base/Log', 'sap/ui/thirdparty/URI', 'sap/base/util/now'
], function(Log, URI, now) {

	"use strict";

	var URI = window.URI;

	/**
	 * Performance Measurement API.
	 *
	 * @namespace
	 * @since 1.58
	 * @name module:sap/ui/performance/Measurement
	 * @public
	 */
	function PerfMeasurement() {

		/**
		 * Single Measurement Entry.
		 *
		 * @public
		 * @typedef {object} module:sap/ui/performance/Measurement.Entry
		 * @property {string} sId ID of the measurement
		 * @property {string} sInfo Info for the measurement
		 * @property {int} iStart Start time
		 * @property {int} iEnd End time
		 * @property {string | string[]} [aCategories="javascript"] An optional list of categories for the measure
		 */
		function Measurement(sId, sInfo, iStart, iEnd, aCategories) {
			this.id = sId;
			this.info = sInfo;
			this.start = iStart;
			this.end = iEnd;
			this.pause = 0;
			this.resume = 0;
			this.duration = 0; // used time
			this.time = 0; // time from start to end
			this.categories = aCategories;
			this.average = false; //average duration enabled
			this.count = 0; //average count
			this.completeDuration = 0; //complete duration
		}

		function matchCategories(aCategories) {
			if (!aRestrictedCategories) {
				return true;
			}
			if (!aCategories) {
				return aRestrictedCategories === null;
			}
			//check whether active categories and current categories match
			for (var i = 0; i < aRestrictedCategories.length; i++) {
				if (aCategories.indexOf(aRestrictedCategories[i]) > -1) {
					return true;
				}
			}
			return false;
		}

		function checkCategories(aCategories) {
			if (!aCategories) {
				aCategories = ["javascript"];
			}
			aCategories = typeof aCategories === "string" ? aCategories.split(",") : aCategories;
			if (!matchCategories(aCategories)) {
				return null;
			}
			return aCategories;
		}

		function hasCategory(oMeasurement, aCategories) {
			for (var i = 0; i < aCategories.length; i++) {
				if (oMeasurement.categories.indexOf(aCategories[i]) > -1) {
					return true;
				}
			}
			return aCategories.length === 0;
		}

		var bActive = false,
			fnXHR = XMLHttpRequest,
			aRestrictedCategories = null,
			aAverageMethods = [],
			aOriginalMethods = [],
			mMethods = {},
			mMeasurements = {};

		/**
		 * Gets the current state of the performance measurement functionality.
		 *
		 * @return {boolean} current state of the performance measurement functionality
		 * @public
		 * @name module:sap/ui/performance/Measurement.getActive
		 * @function
		 */
		this.getActive = function() {
			return bActive;
		};

		/**
		 * Activates or deactivates the performance measure functionality.
		 *
		 * Optionally a category or list of categories can be passed to restrict measurements to certain categories
		 * like "javascript", "require", "xmlhttprequest", "render"
		 * @param {boolean} bOn - state of the performance measurement functionality to set
		 * @param {string | string[]} aCategories - An optional list of categories that should be measured
		 * @return {boolean} current state of the performance measurement functionality
		 * @public
		 * @name module:sap/ui/performance/Measurement.setActive
		 * @function
		 */
		this.setActive = function(bOn, aCategories) {
			var fnEnd,
				fnStart;

			//set restricted categories
			if (!aCategories) {
				aCategories = null;
			} else if (typeof aCategories === "string") {
				aCategories = aCategories.split(",");
			}
			aRestrictedCategories = aCategories;

			if (bActive === bOn) {
				return;
			}
			bActive = bOn;
			if (bActive) {

				//activate method implementations once
				for (var sName in mMethods) {
					this[sName] = mMethods[sName].bind(this);
				}
				mMethods = {};
				fnEnd = this.end;
				fnStart = this.start;

				// wrap and instrument XHR
				/* eslint-disable-next-line no-global-assign */
				XMLHttpRequest = function() {
					var oXHR = new fnXHR(),
						fnOpen = oXHR.open,
						sMeasureId;

					oXHR.open = function() {
						sMeasureId = new URI(arguments[1], new URI(document.baseURI).search("")).href();
						fnStart(sMeasureId, "Request for " + sMeasureId, "xmlhttprequest");
						oXHR.addEventListener("loadend", fnEnd.bind(null, sMeasureId));

						fnOpen.apply(this, arguments);
					};

					return oXHR;
				};
			} else {
				/* eslint-disable-next-line no-global-assign */
				XMLHttpRequest = fnXHR;
			}

			return bActive;
		};

		/**
		 * Starts a performance measure.
		 *
		 * Optionally a category or list of categories can be passed to allow filtering of measurements.
		 *
		 * @param {string} sId ID of the measurement
		 * @param {string} sInfo Info for the measurement
		 * @param {string | string[]} [aCategories="javascript"] An optional list of categories for the measure
		 * @return {module:sap/ui/performance/Measurement.Entry|boolean|undefined} current measurement containing id, info and start-timestamp (false if error)
		 * @public
		 * @name module:sap/ui/performance/Measurement.start
		 * @function
		 */
		mMethods["start"] = function(sId, sInfo, aCategories) {
			if (!bActive) {
				return;
			}

			aCategories = checkCategories(aCategories);
			if (!aCategories) {
				return;
			}

			var iTime = now(),
				oMeasurement = new Measurement(sId, sInfo, iTime, 0, aCategories);

			// create timeline entries if available
			/*eslint-disable no-console */
			if (Log.getLevel("sap.ui.Performance") >= 4 && window.console && console.time) {
				console.time(sInfo + " - " + sId);
			}
			/*eslint-enable no-console */
			Log.info("Performance measurement start: " + sId + " on " + iTime);

			if (oMeasurement) {
				mMeasurements[sId] = oMeasurement;
				return this.getMeasurement(oMeasurement.id);
			} else {
				return false;
			}
		};

		/**
		 * Pauses a performance measure.
		 *
		 * @param {string} sId ID of the measurement
		 * @return {module:sap/ui/performance/Measurement.Entry|boolean|undefined} current measurement containing id, info and start-timestamp, pause-timestamp (false if error)
		 * @public
		 * @name module:sap/ui/performance/Measurement.pause
		 * @function
		 */
		mMethods["pause"] = function(sId) {
			if (!bActive) {
				return;
			}

			var iTime = now();
			var oMeasurement = mMeasurements[sId];
			if (oMeasurement && oMeasurement.end > 0) {
				// already ended -> no pause possible
				return false;
			}

			if (oMeasurement && oMeasurement.pause == 0) {
				// not already paused
				oMeasurement.pause = iTime;
				if (oMeasurement.pause >= oMeasurement.resume && oMeasurement.resume > 0) {
					oMeasurement.duration = oMeasurement.duration + oMeasurement.pause - oMeasurement.resume;
					oMeasurement.resume = 0;
				} else if (oMeasurement.pause >= oMeasurement.start) {
					oMeasurement.duration = oMeasurement.pause - oMeasurement.start;
				}
			}

			if (oMeasurement) {
				Log.info("Performance measurement pause: " + sId + " on " + iTime + " duration: " + oMeasurement.duration);
				return this.getMeasurement(oMeasurement.id);
			} else {
				return false;
			}
		};

		/**
		 * Resumes a performance measure.
		 *
		 * @param {string} sId ID of the measurement
		 * @return {module:sap/ui/performance/Measurement.Entry|boolean|undefined} current measurement containing id, info and start-timestamp, resume-timestamp (false if error)
		 * @public
		 * @name module:sap/ui/performance/Measurement.resume
		 * @function
		 */
		mMethods["resume"] = function(sId) {
			if (!bActive) {
				return;
			}

			var iTime = now();
			var oMeasurement = mMeasurements[sId];

			if (oMeasurement && oMeasurement.pause > 0) {
				// already paused
				oMeasurement.pause = 0;
				oMeasurement.resume = iTime;
			}

			if (oMeasurement) {
				Log.info("Performance measurement resume: " + sId + " on " + iTime + " duration: " + oMeasurement.duration);
				return this.getMeasurement(oMeasurement.id);
			} else {
				return false;
			}
		};

		/**
		 * Ends a performance measure.
		 *
		 * @param {string} sId ID of the measurement
		 * @return {module:sap/ui/performance/Measurement.Entry|boolean|undefined} current measurement containing id, info and start-timestamp, end-timestamp, time, duration (false if error)
		 * @public
		 * @name module:sap/ui/performance/Measurement.end
		 * @function
		 */
		mMethods["end"] = function(sId) {
			if (!bActive) {
				return;
			}

			var iTime = now();

			var oMeasurement = mMeasurements[sId];

			if (oMeasurement && !oMeasurement.end) {
				Log.info("Performance measurement end: " + sId + " on " + iTime);
				oMeasurement.end = iTime;
				if (oMeasurement.end >= oMeasurement.resume && oMeasurement.resume > 0) {
					oMeasurement.duration = oMeasurement.duration + oMeasurement.end - oMeasurement.resume;
					oMeasurement.resume = 0;
				} else if (oMeasurement.pause > 0) {
					// duration already calculated
					oMeasurement.pause = 0;
				} else if (oMeasurement.end >= oMeasurement.start) {
					if (oMeasurement.average) {
						oMeasurement.completeDuration += (oMeasurement.end - oMeasurement.start);
						oMeasurement.count++;
						oMeasurement.duration = oMeasurement.completeDuration / oMeasurement.count;
						oMeasurement.start = iTime;
					} else {
						oMeasurement.duration = oMeasurement.end - oMeasurement.start;
					}
				}
				if (oMeasurement.end >= oMeasurement.start) {
					oMeasurement.time = oMeasurement.end - oMeasurement.start;
				}
			}

			if (oMeasurement) {
				// end timeline entry
				/*eslint-disable no-console */
				if (Log.getLevel("sap.ui.Performance") >= 4 && window.console && console.timeEnd) {
					console.timeEnd(oMeasurement.info + " - " + sId);
				}
				/*eslint-enable no-console */
				return this.getMeasurement(sId);
			} else {
				return false;
			}
		};

		/**
		 * Clears all performance measurements.
		 *
		 * @public
		 * @name module:sap/ui/performance/Measurement.clear
		 * @function
		 */
		mMethods["clear"] = function() {
			mMeasurements = {};
		};

		/**
		 * Removes a performance measure.
		 *
		 * @param {string} sId ID of the measurement
		 * @public
		 * @name module:sap/ui/performance/Measurement.remove
		 * @function
		 */
		mMethods["remove"] = function(sId) {
			delete mMeasurements[sId];
		};
		/**
		 * Adds a performance measurement with all data.
		 *
		 * This is useful to add external measurements (e.g. from a backend) to the common measurement UI
		 *
		 * @param {string} sId ID of the measurement
		 * @param {string} sInfo Info for the measurement
		 * @param {int} iStart start timestamp
		 * @param {int} iEnd end timestamp
		 * @param {int} iTime time in milliseconds
		 * @param {int} iDuration effective time in milliseconds
		 * @param {string | string[]} [aCategories="javascript"] An optional list of categories for the measure
		 * @return {module:sap/ui/performance/Measurement.Entry|boolean|undefined} current measurement containing id, info and start-timestamp, end-timestamp, time, duration, categories (false if error)
		 * @public
		 * @name module:sap/ui/performance/Measurement.add
		 * @function
		 */
		mMethods["add"] = function(sId, sInfo, iStart, iEnd, iTime, iDuration, aCategories) {
			if (!bActive) {
				return;
			}
			aCategories = checkCategories(aCategories);
			if (!aCategories) {
				return false;
			}
			var oMeasurement = new Measurement( sId, sInfo, iStart, iEnd, aCategories);
			oMeasurement.time = iTime;
			oMeasurement.duration = iDuration;

			if (oMeasurement) {
				mMeasurements[sId] = oMeasurement;
				return this.getMeasurement(oMeasurement.id);
			} else {
				return false;
			}
		};

		/**
		 * Starts an average performance measure.
		 *
		 * The duration of this measure is an avarage of durations measured for each call.
		 * Optionally a category or list of categories can be passed to allow filtering of measurements.
		 *
		 * @param {string} sId ID of the measurement
		 * @param {string} sInfo Info for the measurement
		 * @param {string | string[]} [aCategories="javascript"] An optional list of categories for the measure
		 * @return {module:sap/ui/performance/Measurement.Entry|boolean|undefined} current measurement containing id, info and start-timestamp (false if error)
		 * @public
		 * @name module:sap/ui/performance/Measurement.average
		 * @function
		 */
		mMethods["average"] = function(sId, sInfo, aCategories) {
			if (!bActive) {
				return;
			}
			aCategories = checkCategories(aCategories);
			if (!aCategories) {
				return;
			}

			var oMeasurement = mMeasurements[sId],
				iTime = now();
			if (!oMeasurement || !oMeasurement.average) {
				this.start(sId, sInfo, aCategories);
				oMeasurement = mMeasurements[sId];
				oMeasurement.average = true;
			} else {
				if (!oMeasurement.end) {
					oMeasurement.completeDuration += (iTime - oMeasurement.start);
					oMeasurement.count++;
				}
				oMeasurement.start = iTime;
				oMeasurement.end = 0;
			}
			return this.getMeasurement(oMeasurement.id);
		};

		/**
		 * Gets a performance measure.
		 *
		 * @param {string} sId ID of the measurement
		 * @return {module:sap/ui/performance/Measurement.Entry|boolean} current measurement containing id, info and start-timestamp, end-timestamp, time, duration (false if error)
		 * @public
		 * @name module:sap/ui/performance/Measurement.getMeasurement
		 * @function
		 */
		this.getMeasurement = function(sId) {

			var oMeasurement = mMeasurements[sId];

			if (oMeasurement) {
				// create a flat copy
				var oCopy = {};
				for (var sProp in oMeasurement) {
					oCopy[sProp] = oMeasurement[sProp];
				}
				return oCopy;
			} else {
				return false;
			}
		};

		/**
		 * Gets all performance measurements.
		 *
		 * @param {boolean} [bCompleted] Whether only completed measurements should be returned, if explicitly set to false only incomplete measurements are returned
		 * @return {module:sap/ui/performance/Measurement.Entry[]} current array with measurements containing id, info and start-timestamp, end-timestamp, time, duration, categories
		 * @public
		 * @name module:sap/ui/performance/Measurement.getAllMeasurements
		 * @function
		 */
		this.getAllMeasurements = function(bCompleted) {
			return this.filterMeasurements(function(oMeasurement) {
				return oMeasurement;
			}, bCompleted);
		};

		/**
		 * Gets all performance measurements where a provided filter function returns a truthy value.
		 *
		 * If neither a filter function nor a category is provided an empty array is returned.
		 * To filter for certain properties of measurements a fnFilter can be implemented like this
		 * <code>
		 * function(oMeasurement) {
		 *     return oMeasurement.duration > 50;
		 * }</code>
		 *
		 * @param {function(module:sap/ui/performance/Measurement.Entry)} [fnFilter] a filter function that returns true if the passed measurement should be added to the result
		 * @param {boolean} [bCompleted] Optional parameter to determine if either completed or incomplete measurements should be returned (both if not set or undefined)
		 * @param {string[]} [aCategories] The function returns only measurements which match these specified categories
		 *
		 * @return {module:sap/ui/performance/Measurement.Entry[]} filtered array with measurements containing id, info and start-timestamp, end-timestamp, time, duration, categories (false if error)
		 * @public
		 * @name module:sap/ui/performance/Measurement.filterMeasurements
		 * @function
		 */
		this.filterMeasurements = function() {
			var oMeasurement, bValid,
				i = 0,
				aMeasurements = [],
				fnFilter = typeof arguments[i] === "function" ? arguments[i++] : undefined,
				bCompleted = typeof arguments[i] === "boolean" ? arguments[i++] : undefined,
				aCategories = Array.isArray(arguments[i]) ? arguments[i] : [];

			for (var sId in mMeasurements) {
				oMeasurement = this.getMeasurement(sId);
				bValid = (bCompleted === false && oMeasurement.end === 0) || (bCompleted !== false && (!bCompleted || oMeasurement.end));
				if (bValid && hasCategory(oMeasurement, aCategories) && (!fnFilter || fnFilter(oMeasurement))) {
					aMeasurements.push(oMeasurement);
				}
			}

			return aMeasurements;
		};

		/**
		 * Registers an average measurement for a given objects method.
		 *
		 * @param {string} sId the id of the measurement
		 * @param {object} oObject the object of the method
		 * @param {string} sMethod the name of the method
		 * @param {string[]} [aCategories=["javascript"]] An optional categories list for the measurement
		 * @returns {boolean} true if the registration was successful
		 * @public
		 * @name module:sap/ui/performance/Measurement.registerMethod
		 * @function
		 */
		this.registerMethod = function(sId, oObject, sMethod, aCategories) {
			var fnMethod = oObject[sMethod];
			if (fnMethod && typeof fnMethod === "function") {
				var bFound = aAverageMethods.indexOf(fnMethod) > -1;
				if (!bFound) {
					aOriginalMethods.push({func : fnMethod, obj: oObject, method: sMethod, id: sId});
					var that = this;
					oObject[sMethod] = function() {
						that.average(sId, sId + " method average", aCategories);
						var result = fnMethod.apply(this, arguments);
						that.end(sId);
						return result;
					};
					aAverageMethods.push(oObject[sMethod]);
					return true;
				}
			} else {
				Log.debug(sMethod + " in not a function. Measurement.register failed");
			}
			return false;
		};

		/**
		 * Unregisters an average measurement for a given objects method.
		 *
		 * @param {string} sId the id of the measurement
		 * @param {object} oObject the object of the method
		 * @param {string} sMethod the name of the method
		 * @returns {boolean} true if the unregistration was successful
		 * @public
		 * @name module:sap/ui/performance/Measurement.unregisterMethod
		 * @function
		 */
		this.unregisterMethod = function(sId, oObject, sMethod) {
			var fnFunction = oObject[sMethod],
				iIndex = aAverageMethods.indexOf(fnFunction);
			if (fnFunction && iIndex > -1) {
				oObject[sMethod] = aOriginalMethods[iIndex].func;
				aAverageMethods.splice(iIndex, 1);
				aOriginalMethods.splice(iIndex, 1);
				return true;
			}
			return false;
		};

		/**
		 * Unregisters all average measurements.
		 *
		 * @public
		 * @name module:sap/ui/performance/Measurement.unregisterAllMethods
		 * @function
		 */
		this.unregisterAllMethods = function() {
			while (aOriginalMethods.length > 0) {
				var oOrig = aOriginalMethods[0];
				this.unregisterMethod(oOrig.id, oOrig.obj, oOrig.method);
			}
		};

		var aMatch = location.search.match(/sap-ui-measure=([^\&]*)/);
		if (aMatch && aMatch[1]) {
			if (aMatch[1] === "true" || aMatch[1] === "x" || aMatch[1] === "X") {
				this.setActive(true);
			} else {
				this.setActive(true, aMatch[1]);
			}
		} else {
			var fnInactive = function() {
				//measure not active
				return null;
			};
			//deactivate methods implementations
			for (var sName in mMethods) {
				this[sName] = fnInactive;
			}
		}
	}

	return new PerfMeasurement();
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
sap.ui.predefine("sap/ui/performance/XHRInterceptor", [
	"sap/base/Log"
], function(Log) {
	"use strict";

	/**
	 * XHRInterceptor provides convenience for overriding XHR methods inside of sap/ui/performance.
	 *
	 * Modules can register functions as callbacks to the actual XHR methods instead of overwriting them
	 * explicitly. Registered functions get called in order of their registration with the same context
	 * and the same arguments the initial call was set up with.
	 *
	 * @module
	 * @private
	 */
	var XHRINTERCEPTOR = "XHRInterceptor";

	/**
	 * Registry for storing functions by registry keys (names).
	 *
	 * @private
	 */
	var mRegistry = Object.create(null);

	/**
	 * Original XHR functions
	 * @private
	 */
	var mXHRFunctions = Object.create(null);

	/**
	 * Creates the initial override for an original XHR method.
	 *
	 * @param {string} sXHRMethod Name of the actual XHR method
	 * @param {function} fnCallback The registered callback function
	 * @private
	 */
	function createOverride(sXHRMethod) {

		mRegistry[sXHRMethod] = Object.create(null);

		//  backup the original function
		mXHRFunctions[sXHRMethod] = window.XMLHttpRequest.prototype[sXHRMethod];

		window.XMLHttpRequest.prototype[sXHRMethod] = function() {
			var oArgs = arguments;

			// call the original function first
			mXHRFunctions[sXHRMethod].apply(this, oArgs);

			// call the registered callbacks in order of their registration
			for (var sName in mRegistry[sXHRMethod]) {
				mRegistry[sXHRMethod][sName].apply(this, oArgs);
			}

		};

	}

	/**
	 * @namespace
	 * @since 1.58
	 * @alias module:sap/ui/performance/XHRInterceptor
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	var oXHRInterceptor = {
		/**
		 * Register a function callback which gets called as it would be an own method of XHR.
		 *
		 * @param {string} sName Name under which the function is registered
		 * @param {string} sXHRMethod Name of the actual XHR method
		 * @param {function} fnCallback The registered callback function
		 * @public
		 */
		register: function(sName, sXHRMethod, fnCallback) {
			Log.debug("Register '" + sName + "' for XHR function '" + sXHRMethod + "'", XHRINTERCEPTOR);

			// initially the override needs to be placed per XHR method
			if (!mRegistry[sXHRMethod]) {
				createOverride(sXHRMethod);
			}
			mRegistry[sXHRMethod][sName] = fnCallback;
		},

		/**
		 * Unregister a registered function.
		 *
	     * @param {string} sName Name under which the function is registered
		 * @param {string} sXHRMethod Name of the actual XHR method
		 * @return {boolean} True if unregister was successful
		 * @public
		 */
		unregister: function(sName, sXHRMethod) {
			var bRemove = delete mRegistry[sXHRMethod][sName];
			Log.debug("Unregister '" + sName + "' for XHR function '" + sXHRMethod + (bRemove ? "'" : "' failed"), XHRINTERCEPTOR);
			return bRemove;
		},

		/*
		 * Check if a function is registered
	     * @param {string} sName Name under which the function is registered
		 * @param {string} sXHRMethod Name of the actual XHR method
		 * @public
		 */
		isRegistered: function(sName, sXHRMethod) {
			return mRegistry[sXHRMethod] && mRegistry[sXHRMethod][sName];
		}

	};

	return oXHRInterceptor;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/performance/trace/FESRHelper", [], function () {
"use strict";

	/**
	 * FESRHelper API
	 * Provides helper functionality for FESR and consumers of FESR
	 *
	 * @namespace
	 * @since 1.100
	 * @alias module:sap/ui/performance/trace/FESRHelper
	 * @static
	 * @public
	 */
    var FESRHelper = {
        /**
         * This namespace is only used inside the FESRHelper.
         *
         * @const
         * @private
         */
        FESR_NAMESPACE: "http://schemas.sap.com/sapui5/extension/sap.ui.core.FESR/1",

        /**
         * Add semantic stepname for an event of a given element used for FESR.
         *
         * @param {sap.ui.core.Element} oElement The element the semantic stepname should be applied to
         * @param {string} sEventId The event ID the semantic stepname is valid for
         * @param {string} sStepname The semantic stepname
         *
         * @public
         * @since 1.100
         */
        setSemanticStepname: function (oElement, sEventId, sStepname) {
            var oCustomData = oElement.data("sap-ui-custom-settings");
            if (oCustomData === null) {
                oCustomData = {};
            }
            if (!oCustomData[this.FESR_NAMESPACE]) {
                oCustomData[this.FESR_NAMESPACE] = {};
            }
            oCustomData[this.FESR_NAMESPACE][sEventId] = sStepname;
            oElement.data("sap-ui-custom-settings", oCustomData);
        },


        /**
         * Get semantic stepname for an event of a given element used for FESR.
         *
         * @param {sap.ui.core.Element} oElement The element conatining the semantic stepname
         * @param {string} sEventId The event ID of the semantic stepname
         * @returns {string} The semantic stepname for the given event ID
         *
         * @public
         * @since 1.100
         */
        getSemanticStepname: function (oElement, sEventId) {
            var oCustomFesrData = oElement && oElement.data("sap-ui-custom-settings") && oElement.data("sap-ui-custom-settings")[this.FESR_NAMESPACE];
            if (!oCustomFesrData) {
                return;
            }
            return oCustomFesrData[sEventId];
        }
    };

    return FESRHelper;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/*global HTMLScriptElement */
sap.ui.predefine("sap/ui/performance/trace/Interaction", [
	"sap/ui/performance/Measurement",
	"sap/ui/performance/XHRInterceptor",
	"sap/ui/performance/trace/FESRHelper",
	"sap/base/util/LoaderExtensions",
	"sap/base/util/now",
	"sap/base/util/uid",
	"sap/base/Log",
	"sap/ui/thirdparty/URI"
], function(Measurement, XHRInterceptor, FESRHelper, LoaderExtensions, now, uid, Log, URI) {

	"use strict";


	var HOST = window.location.host, // static per session
		INTERACTION = "INTERACTION",
		isNavigation = false,
		aInteractions = [],
		oPendingInteraction,
		mCompressedMimeTypes = {
			"application/zip": true,
			"application/vnd.rar": true,
			"application/gzip": true,
			"application/x-tar": true,
			"application/java-archive": true,
			"image/jpeg": true,
			"application/pdf": true
		},
		sCompressedExtensions = "zip,rar,arj,z,gz,tar,lzh,cab,hqx,ace,jar,ear,war,jpg,jpeg,pdf,gzip";
	let bInitialized = false,
		iResetCurrentBrowserEventTimer;

	function isCORSRequest(sUrl) {
		var sHost = new URI(sUrl).host();
		// url is relative or with same host
		return sHost && sHost !== HOST;
	}

	function hexToAscii(sValue) {
		var hex = sValue.toString();
		var str = '';
		for (var n = 0; n < hex.length; n += 2) {
			str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
		}
		return str.trim();
	}

	/**
	 * The SAP Statistics for OData
	 *
	 * @typedef {object} module:sap/ui/performance/trace/Interaction.SAPStatistics
	 * @public
	 *
	 * @property {string} url The url of the response
	 * @property {string} statistics The response header under the key "sap-statistics"
	 * @property {PerformanceResourceTiming} timing The last performance resource timing
	 */

	/**
	 * Interaction Entry
	 *
	 * @typedef {object} module:sap/ui/performance/trace/Interaction.Entry
	 * @public
	 *
	 * @property {string} event The event which triggered the interaction. The default value is "startup".
	 * @property {string} trigger The control which triggered the interaction.
	 * @property {string} component The identifier of the component or app that is associated with the
	 *  interaction.
	 * @property {string} appVersion The application version as from app descriptor
	 * @property {float} start The start timestamp of the interaction which is initially set to the
	 *  <code>fetchStart</code>
	 * @property {float} end The end timestamp of the interaction
	 * @property {float} navigation The sum over all navigation times
	 * @property {float} roundtrip The time from first request sent to last received response end - without
	 *  gaps and ignored overlap
	 * @property {float} processing The client processing time
	 * @property {float} duration The interaction duration
	 * @property {Array<PerformanceResourceTiming>} requests The Performance API requests during interaction
	 * @property {Array<module:sap/ui/performance/Measurement.Entry>} measurements The Performance
	 *  measurements
	 * @property {Array<module:sap/ui/performance/trace/Interaction.SAPStatistics>} sapStatistics The SAP
	 *  Statistics for OData
	 * @property {float} requestTime The sum over all requests in the interaction
	 * @property {float} networkTime The request time minus server time from the header
	 * @property {int} bytesSent The sum over all requests bytes
	 * @property {int} bytesReceived The sum over all responses bytes
	 * @property {"X"|""} requestCompression It's set with value "X" by default When compression does not
	 *  match SAP rules, we report an empty string.
	 * @property {float} busyDuration The sum of the global busy indicator duration during the interaction
	 * @property {string} id The ID of the interaction
	 * @property {string} passportAction The default PassportAction for startup
	 */

	function createMeasurement(iTime) {
		return {
			event: "startup", // event which triggered interaction - default is startup interaction
			trigger: "undetermined", // control which triggered interaction
			component: "undetermined", // component or app identifier
			appVersion: "undetermined", // application version as from app descriptor
			start: iTime || performance.timeOrigin, // interaction start - page timeOrigin if initial
			end: 0, // interaction end
			navigation: 0, // sum over all navigation times
			roundtrip: 0, // time from first request sent to last received response end - without gaps and ignored overlap
			processing: 0, // client processing time
			duration: 0, // interaction duration
			requests: [], // Performance API requests during interaction
			measurements: [], // Measurements
			sapStatistics: [], // SAP Statistics for OData
			requestTime: 0, // sum over all requests in the interaction (oPendingInteraction.requests[0].responseEnd-oPendingInteraction.requests[0].requestStart)
			networkTime: 0, // request time minus server time from the header
			bytesSent: 0, // sum over all requests bytes
			bytesReceived: 0, // sum over all response bytes
			requestCompression: "X", // ok per default, if compression does not match SAP rules we report an empty string
			busyDuration: 0, // summed GlobalBusyIndicator duration during this interaction
			id: uid(), //Interaction ID
			passportAction: "undetermined_startup_0" //default PassportAction for startup
		};
	}

	function isCompleteMeasurement(oMeasurement) {
		if (oMeasurement.start > oPendingInteraction.start && oMeasurement.end < oPendingInteraction.end) {
			return oMeasurement;
		}
	}

	/**
	 * Check if request is initiated by XHR, comleted and timeframe of request is within timeframe of current interaction
	 *
	 * @param {object} oRequestTiming PerformanceResourceTiming as retrieved by performance.getEntryByType("resource")
	 * @return {boolean} true if the request is a completed XHR with started and ended within the current interaction
	 * @private
	 */
	function isValidInteractionXHR(oRequestTiming) {
		// if the request has been completed it has complete timing figures)
		var bComplete = oRequestTiming.startTime > 0 &&
			oRequestTiming.startTime <= oRequestTiming.requestStart &&
			oRequestTiming.requestStart <= oRequestTiming.responseEnd;

		var bPartOfInteraction = oPendingInteraction.start <= (performance.timeOrigin + oRequestTiming.requestStart) &&
			oPendingInteraction.end >= (performance.timeOrigin + oRequestTiming.responseEnd);

		return bPartOfInteraction && bComplete && oRequestTiming.initiatorType === "xmlhttprequest";
	}

	function aggregateRequestTiming(oRequest) {
		// aggregate navigation and roundtrip with respect to requests overlapping and times w/o requests (gaps)
		this.end = oRequest.responseEnd > this.end ? oRequest.responseEnd : this.end;
		// sum up request time as a grand total over all requests
		oPendingInteraction.requestTime += (oRequest.responseEnd - oRequest.startTime);

		// if there is a gap between requests we add the times to the aggrgate and shift the lower limits
		if (this.roundtripHigherLimit <= oRequest.startTime) {
			oPendingInteraction.navigation += (this.navigationHigherLimit - this.navigationLowerLimit);
			oPendingInteraction.roundtrip += (this.roundtripHigherLimit - this.roundtripLowerLimit);
			this.navigationLowerLimit = oRequest.startTime;
			this.roundtripLowerLimit = oRequest.startTime;
		}

		// shift the limits if this request was completed later than the earlier requests
		if (oRequest.responseEnd > this.roundtripHigherLimit) {
			this.roundtripHigherLimit = oRequest.responseEnd;
		}
		if (oRequest.requestStart > this.navigationHigherLimit) {
			this.navigationHigherLimit = oRequest.requestStart;
		}
	}

	function aggregateRequestTimings(aRequests) {
		var oTimings = {
			start: aRequests[0].startTime,
			end: aRequests[0].responseEnd,
			navigationLowerLimit: aRequests[0].startTime,
			navigationHigherLimit: aRequests[0].requestStart,
			roundtripLowerLimit: aRequests[0].startTime,
			roundtripHigherLimit: aRequests[0].responseEnd
		};

		// aggregate all timings by operating on the oTimings object
		aRequests.forEach(aggregateRequestTiming, oTimings);
		oPendingInteraction.navigation += (oTimings.navigationHigherLimit - oTimings.navigationLowerLimit);
		oPendingInteraction.roundtrip += (oTimings.roundtripHigherLimit - oTimings.roundtripLowerLimit);

		// calculate average network time per request
		if (oPendingInteraction.networkTime) {
			var iTotalNetworkTime = oPendingInteraction.requestTime - oPendingInteraction.networkTime;
			oPendingInteraction.networkTime = iTotalNetworkTime / aRequests.length;
		} else {
			oPendingInteraction.networkTime = 0;
		}
	}

	function finalizeInteraction(iTime) {
		if (oPendingInteraction) {
			var aAllRequestTimings = performance.getEntriesByType("resource");
			var oFinshedInteraction;
			oPendingInteraction.end = iTime;
			oPendingInteraction.processing = iTime - oPendingInteraction.start;
			oPendingInteraction.duration = oPendingInteraction.processing;
			oPendingInteraction.requests = aAllRequestTimings.filter(isValidInteractionXHR);
			oPendingInteraction.completeRoundtrips = 0;
			oPendingInteraction.measurements = Measurement.filterMeasurements(isCompleteMeasurement, true);
			if (oPendingInteraction.requests.length > 0) {
				aggregateRequestTimings(oPendingInteraction.requests);
			}
			oPendingInteraction.completeRoundtrips = oPendingInteraction.requests.length;

			// calculate real processing time if any processing took place
			// cannot be negative as then requests took longer than processing
			var iProcessing = oPendingInteraction.processing - oPendingInteraction.navigation - oPendingInteraction.roundtrip;
			oPendingInteraction.processing = iProcessing > -1 ? iProcessing : 0;

			oPendingInteraction.completed = true;
			Object.freeze(oPendingInteraction);

			// Duration threshold 2 in order to filter not performance relevant interactions such as liveChange
			if (oPendingInteraction.semanticStepName || oPendingInteraction.duration >= 2 || oPendingInteraction.requests.length > 0 || isNavigation) {
				aInteractions.push(oPendingInteraction);
				oFinshedInteraction = aInteractions[aInteractions.length - 1];
				if (Log.isLoggable()) {
					Log.debug("Interaction step finished: trigger: " + oPendingInteraction.trigger + "; duration: " + oPendingInteraction.duration + "; requests: " + oPendingInteraction.requests.length, "Interaction.js");
				}
			}
			// Execute onInteractionFinished always in case function exist to enable cleanup in FESR independent of filtering
			if (Interaction.onInteractionFinished) {
				Interaction.onInteractionFinished(oFinshedInteraction);
			}
			oPendingInteraction = null;
			oCurrentBrowserEvent = null;
			isNavigation = false;
			bMatched = false;
			bPerfectMatch = false;
			clearTimeout(iResetCurrentBrowserEventTimer);
		}
	}

	// component determination - heuristic
	function createOwnerComponentInfo(oSrcElement) {
		var sId, sVersion;
		if (oSrcElement) {
			var Component, oComponent;
			Component = sap.ui.require("sap/ui/core/Component");
			if (Component) {
				while (oSrcElement && oSrcElement.getParent) {
					oComponent = Component.getOwnerComponentFor(oSrcElement);
					if (oComponent || oSrcElement instanceof Component) {
						oComponent = oComponent || oSrcElement;
						var oApp = oComponent.getManifestEntry("sap.app");
						// get app id or module name for FESR
						sId = oApp && oApp.id || oComponent.getMetadata().getName();
						sVersion = oApp && oApp.applicationVersion && oApp.applicationVersion.version;
					}
					oSrcElement = oSrcElement.getParent();
				}
			}
		}
		return {
			id: sId ? sId : "undetermined",
			version: sVersion ? sVersion : ""
		};
	}

	var bInteractionActive = false,
		oCurrentBrowserEvent,
		oBrowserElement,
		bMatched = false,
		bPerfectMatch = false,
		iInteractionStepTimer,
		bIdle = false,
		bSuspended = false,
		iInteractionCounter = 0,
		descScriptSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");

	/* As UI5 resources gets also loaded via script tags we need to
	 * intercept this kind of loading as well. We assume that changing the
	 * 'src' property indicates a resource loading via a script tag. In some cases
	 * the src property will be updated multiple times, so we should intercept
	 * the same script tag only once (dataset.sapUiCoreInteractionHandled)
	 */
	function interceptScripts() {
		Object.defineProperty(HTMLScriptElement.prototype, "src", {
			set: function(val) {
				var fnDone;

				if (!this.dataset.sapUiCoreInteractionHandled) {
					fnDone = Interaction.notifyAsyncStep();
					this.addEventListener("load", function() {
						fnDone();
					});
					this.addEventListener("error" , function() {
						fnDone();
					});
					this.dataset.sapUiCoreInteractionHandled = "true";
				}
				descScriptSrc.set.call(this, val);
			},
			get: descScriptSrc.get
		});
	}

	function registerXHROverrides() {
		// store the byte size of the body
		XHRInterceptor.register(INTERACTION, "send" ,function() {
			if (this.pendingInteraction) {
				// double string length for byte length as in js characters are stored as 16 bit ints
				this.pendingInteraction.bytesSent += arguments[0] ? arguments[0].length : 0;
			}
		});

		// store request header size
		XHRInterceptor.register(INTERACTION, "setRequestHeader", function(sHeader, sValue) {
			// count request header length consistent to what getAllResponseHeaders().length would return
			if (!this.requestHeaderLength) {
				this.requestHeaderLength = 0;
			}
			// assume request header byte size
			this.requestHeaderLength += (sHeader + "").length + (sValue + "").length;

		});

		// register the response handler for data collection
		XHRInterceptor.register(INTERACTION, "open", function (sMethod, sUrl, bAsync) {
			var sEpp,
				sAction,
				sRootContextID;

			function handleInteraction(fnDone) {
				if (this.readyState === 4) {
					fnDone();
				}
			}
			// we only need to take care of requests when we have a running interaction
			if (oPendingInteraction) {
				var bIsNoCorsRequest = !isCORSRequest(sUrl);
				// only use Interaction for non CORS requests
				if (bIsNoCorsRequest) {
					//only track if FESR.clientID == EPP.Action && FESR.rootContextID == EPP.rootContextID
					sEpp = Interaction.passportHeader.get(this);
					if (sEpp && sEpp.length >= 370) {
						sAction = hexToAscii(sEpp.substring(150, 230));
						if (parseInt(sEpp.substring(8, 10), 16) > 2) { // version number > 2 --> extended passport
							sRootContextID = sEpp.substring(372, 404);
						}
					}
					if (!sEpp || sAction && sRootContextID && oPendingInteraction.passportAction.endsWith(sAction)) {
						this.addEventListener("readystatechange", handleResponse.bind(this,  oPendingInteraction.id));
					}
				}
				// arguments at position 2 is indicatior whether request is async or not
				// readystatechange must not be used for sync CORS request since it does not work properly
				// this is especially necessary in case request was not started by LoaderExtension
				// bAsync is by default true, therefore we need to check eplicitly for value 'false'
				if (bIsNoCorsRequest || bAsync !== false) {
					// notify async step for all XHRs (even CORS requests)
					this.addEventListener("readystatechange", handleInteraction.bind(this, Interaction.notifyAsyncStep()));
				}
				// assign the current interaction to the xhr for later response header retrieval.
				this.pendingInteraction = oPendingInteraction;
			}
		});

	}

	// check if SAP compression rules are fulfilled
	function checkCompression(sURL, sContentEncoding, sContentType, sContentLength) {
		//remove hashes and queries + find extension (last . segment)
		var fileExtension = sURL.split('.').pop().split(/\#|\?/)[0];

		if (sContentEncoding === 'gzip' ||
			sContentEncoding === 'br' ||
			sContentType in mCompressedMimeTypes ||
			(fileExtension && sCompressedExtensions.indexOf(fileExtension) !== -1) ||
			sContentLength < 1024) {
				return true;
		} else {
			return false;
		}
	}

	// response handler which uses the custom properties we added to the xhr to retrieve information from the response headers
	function handleResponse(sId) {
		if (this.readyState === 4) {
			if (this.pendingInteraction && !this.pendingInteraction.completed && oPendingInteraction.id === sId) {
				// enrich interaction with information
				var sContentLength = this.getResponseHeader("content-length"),
					bCompressed = checkCompression(this.responseURL, this.getResponseHeader("content-encoding"), this.getResponseHeader("content-type"), sContentLength),
					sFesrec = this.getResponseHeader("sap-perf-fesrec");
				this.pendingInteraction.bytesReceived += sContentLength ? parseInt(sContentLength) : 0;
				this.pendingInteraction.bytesReceived += this.getAllResponseHeaders().length;
				this.pendingInteraction.bytesSent += this.requestHeaderLength || 0;
				// this should be true only if all responses are compressed
				this.pendingInteraction.requestCompression = bCompressed && (this.pendingInteraction.requestCompression !== false);
				// sap-perf-fesrec header contains milliseconds
				this.pendingInteraction.networkTime += sFesrec ? Math.round(parseFloat(sFesrec, 10) / 1000) : 0;
				var sSapStatistics = this.getResponseHeader("sap-statistics");
				if (sSapStatistics) {
					var aTimings = performance.getEntriesByType("resource");
					this.pendingInteraction.sapStatistics.push({
						// add response url for mapping purposes
						url: this.responseURL,
						statistics: sSapStatistics,
						timing: aTimings ? aTimings[aTimings.length - 1] : undefined
					});
				}
				delete this.requestHeaderLength;
				delete this.pendingInteraction;
			}
		}
	}


	/**
	 * Provides base functionality for interaction detection heuristics & API.

	 * Interaction detection works through the detection of relevant events and tracking of rendering activities.<br>
	 * An example:<br>
	 * The user clicks on a button<br>
	 * <ul>
	 *  <li>"click" event gets detected via notification (<code>var notifyEventStart</code>)</li>
	 *  <li>a click handler is registered on the button, so this is an interaction start (<code>var notifyStepStart</code>)</li>
	 *  <li>some requests are made and rendering has finished (<code>var notifyStepEnd</code>)</li>
	 * </ul>
	 * All measurement takes place in {@link module:sap/ui/performance/Measurement}.
	 *
	 * @namespace
	 * @alias module:sap/ui/performance/trace/Interaction
	 *
	 * @public
	 * @since 1.76
	 */
	var Interaction = {

		/**
	 	 * Gets all interaction measurements.
		 *
		 * @param {boolean} bFinalize finalize the current pending interaction so that it is contained in the returned array
		 * @return {Array<module:sap/ui/performance/trace/Interaction.Entry>} all interaction measurements
		 *
		 * @static
		 * @public
		 * @since 1.76
		 */
		getAll : function(bFinalize) {
			if (bFinalize) {
				// force the finalization of the currently pending interaction
				Interaction.end(true);
			}
			return aInteractions;
		},

		/**
		 * Gets all interaction measurements for which a provided filter function returns a truthy value.
		 *
		 * To filter for certain categories of measurements a fnFilter can be implemented like this
		 * <code>
		 * function(InteractionMeasurement) {
		 *     return InteractionMeasurement.duration > 0
		 * }</code>
		 * @param {function} fnFilter a filter function that returns true if the passed measurement should be added to the result
		 * @return {Array<module:sap/ui/performance/trace/Interaction.Entry>} all interaction measurements passing the filter function successfully
		 *
		 * @static
		 * @public
		 * @since 1.76
		 */
		filter : function(fnFilter) {
			var aFilteredInteractions = [];
			if (fnFilter) {
				for (var i = 0, l = aInteractions.length; i < l; i++) {
					if (fnFilter(aInteractions[i])) {
						aFilteredInteractions.push(aInteractions[i]);
					}
				}
			}
			return aFilteredInteractions;
		},
		/**
		 * Gets the incomplete pending interaction.
		 *
		 * @return {object} interaction measurement
		 * @static
		 * @private
		 */
		getPending : function() {
			return oPendingInteraction;
		},

		/**
		 * Clears all interaction measurements.
		 *
		 * @private
		 */
		clear : function() {
			aInteractions = [];
		},

		/**
		 * Start an interaction measurements.
		 *
		 * @param {string} sType type of the event which triggered the interaction
		 * @param {object} oSrcElement the control on which the interaction was triggered
		 * @static
		 * @private
		 */
		start : function(sType, oSrcElement) {
			var iTime = now();

			if (oPendingInteraction) {
				finalizeInteraction(iTime);
			}

			//reset async counter/timer
			if (iInteractionStepTimer) {
				clearTimeout(iInteractionStepTimer);
			}
			iInteractionCounter = 0;

			// clear request timings for new interaction
			if (performance.clearResourceTimings) {
				performance.clearResourceTimings();
			}

			var oComponentInfo = createOwnerComponentInfo(oSrcElement);

			// setup new pending interaction
			oPendingInteraction = createMeasurement(bInitialized ? iTime : undefined);
			oPendingInteraction.event = sType;
			oPendingInteraction.component = oComponentInfo.id;
			oPendingInteraction.appVersion = oComponentInfo.version;
			if (oSrcElement && oSrcElement.getId) {
				oPendingInteraction.trigger = oSrcElement.getId();
				oPendingInteraction.semanticStepName = FESRHelper.getSemanticStepname(oSrcElement, sType);
			}
			/*eslint-disable no-console */
			if (Log.isLoggable(null, "sap.ui.Performance")) {
				console.time("INTERACTION: " + oPendingInteraction.trigger + " - " + oPendingInteraction.event);
			}
			/*eslint-enable no-console */
			if (Log.isLoggable()) {
				Log.debug("Interaction step started: trigger: " + oPendingInteraction.trigger + "; type: " + oPendingInteraction.event, "Interaction.js");
			}
		},

		/**
		 * End an interaction measurements.
		 *
		 * @param {boolean} bForce forces end of interaction now and ignores further re-renderings
		 * @static
		 * @private
		 */
		end : function(bForce) {
			if (oPendingInteraction) {
				if (bForce) {
					/*eslint-disable no-console */
					if (Log.isLoggable(null, "sap.ui.Performance")) {
						console.timeEnd("INTERACTION: " + oPendingInteraction.trigger + " - " + oPendingInteraction.event);
					}
					/*eslint-enable no-console */
					finalizeInteraction(oPendingInteraction.preliminaryEnd || now());
					if (Log.isLoggable()) {
						Log.debug("Interaction ended...");
					}
				} else {
					// set provisionary processing time from start to end and calculate later
					oPendingInteraction.preliminaryEnd = now();
				}
			}
		},

		/**
		 * Returns true if the interaction detection was enabled explicitly, or implicitly along with fesr.
		 *
		 * @return {boolean} bActive State of the interaction detection
		 * @static
		 * @public
		 * @since 1.76
		 */
		getActive : function() {
			return bInteractionActive;
		},

		/**
		 * Enables the interaction tracking.
		 *
		 * @param {boolean} bActive State of the interaction detection
		 *
		 * @static
		 * @public
		 * @since 1.76
		 */
		setActive : function(bActive) {
			bInteractionActive = bActive;
			if (bActive) {
				if (!bInitialized) {
					registerXHROverrides();
					interceptScripts();
					//intercept resource loading from preloads
					LoaderExtensions.notifyResourceLoading = Interaction.notifyAsyncStep;
				}
				Interaction.notifyStepStart("startup", "startup", true);
				// The following line must happen after 'notifyStepStart' because we determine
				// if we should intially use the performance timing API or afterwords the
				// current timestamp
				bInitialized = true;
			}
		},

		/**
		 * Mark interaction as navigation related
		 * @private
		 */
		notifyNavigation: function() {
			isNavigation = true;
		},

		/**
		 * Start tracking busy time for a Control
		 * @param {sap.ui.core.Control} oControl
		 * @private
		 */
		notifyShowBusyIndicator : function(oControl) {
			oControl._sapui_fesr_fDelayedStartTime = now() + oControl.getBusyIndicatorDelay();
		},

		/**
		 * End tracking busy time for a Control
		 * @param {sap.ui.core.Control} oControl
		 * @private
		 */
		notifyHideBusyIndicator : function(oControl) {
			if (oControl._sapui_fesr_fDelayedStartTime) {
				// The busy indicator shown duration d is calculated with:
				// d = "time busy indicator was hidden" - "time busy indicator was requested" - "busy indicator delay"
				var fBusyIndicatorShownDuration = now() - oControl._sapui_fesr_fDelayedStartTime;
				Interaction.addBusyDuration((fBusyIndicatorShownDuration > 0) ? fBusyIndicatorShownDuration : 0);
				delete oControl._sapui_fesr_fDelayedStartTime;
			}
		},

		/**
		 * This method starts the actual interaction measurement when all criteria are met. As it is the starting point
		 * for the new interaction, the creation of the FESR headers for the last interaction is triggered here, so that
		 * the headers can be sent with the first request of the current interaction.<br>
		 *
		 * @param {string} sEventId The control event name
		 * @param {sap.ui.core.Element} oElement Element on which the interaction has been triggered
		 * @param {boolean} bForce Forces the interaction to start independently from a currently active browser event
		 * @static
		 * @private
		 */
		notifyStepStart : function(sEventId, oElement, bForce) {
			if (bInteractionActive) {
				var sType,
					elem,
					sClosestSemanticStepName;

				if ((!oPendingInteraction && oCurrentBrowserEvent) || bForce) {
					if (bForce) {
						sType = "startup";
					} else {
						sType = sEventId;
					}
					Interaction.start(sType, oElement);
					oPendingInteraction = Interaction.getPending();

					// update pending interaction infos
					if (oPendingInteraction && !oPendingInteraction.completed && Interaction.onInteractionStarted) {
						oPendingInteraction.passportAction = Interaction.onInteractionStarted(oPendingInteraction, bForce);
					}
					// Interaction.start will delete oCurrentBrowserEvent in case there is an oPendingInteraction
					// (notifyStepStart is called with parameter bForce)
					// Conscious decision to not move the coding because this shouldn't be a productive scenario
					if (oCurrentBrowserEvent) {
						oBrowserElement = oCurrentBrowserEvent.srcControl;
					}
					// if browser event matches the first control event we take it for trigger/event determination (step name)
					sClosestSemanticStepName = FESRHelper.getSemanticStepname(oBrowserElement, sEventId);
					if (oElement && oElement.getId && oBrowserElement && oElement.getId() === oBrowserElement.getId()) {
						bPerfectMatch = true;
					} else if (sClosestSemanticStepName) {
						oPendingInteraction.trigger = oBrowserElement.getId();
						oPendingInteraction.semanticStepName = sClosestSemanticStepName;
						bPerfectMatch = true;
					} else {
						elem = oBrowserElement;
						while (elem && elem.getParent()) {
							elem = elem.getParent();
							if (oElement.getId() === elem.getId()) {
								// Stop looking for better fitting control in case the current browser event source control
								// is already child of the control event which triggers the interaction because all other
								// control events most likely does not suit better.
								// Example: Click on image of an button will not pass the previous if
								// (oElement.getId() !== oBrowserElement.getId() ==> btn !== btn-img).
								// In case the button is part of an popover and the click on the button closes the popover,
								// the coding below overwrites the button control id with the popover control id in case we
								// don't stop here.
								// Only look for better fitting control in case browser and control event does not fit at all
								bMatched = true;
								break;
							}
						}
					}
					oCurrentBrowserEvent = null;
					isNavigation = false;
					iResetCurrentBrowserEventTimer = setTimeout(function() {
						//cleanup internal registry after actual call stack.
						oCurrentBrowserEvent = null;
					}, 0);
					bIdle = false;
					Interaction.notifyStepEnd(true); // Start timer to end Interaction in case there is no timing relevant action e.g. rendering, request
				} else if (oPendingInteraction && oBrowserElement && !bPerfectMatch) {
					// if browser event matches one of the next control events we take it for trigger/event determination (step name)
					elem = oBrowserElement;
					sClosestSemanticStepName = FESRHelper.getSemanticStepname(oBrowserElement, sEventId);
					if (elem && oElement.getId() === elem.getId()) {
						oPendingInteraction.trigger = oElement.getId();
						oPendingInteraction.semanticStepName = sClosestSemanticStepName;
						oPendingInteraction.event = sEventId;
						bPerfectMatch = true;
					} else if (sClosestSemanticStepName) {
						oPendingInteraction.trigger = oBrowserElement.getId();
						oPendingInteraction.semanticStepName = sClosestSemanticStepName;
						bPerfectMatch = true;
					} else if (!bMatched) {
						while (elem && elem.getParent()) {
							elem = elem.getParent();
							if (oElement.getId() === elem.getId()) {
								oPendingInteraction.trigger = oElement.getId();
								oPendingInteraction.semanticStepName = FESRHelper.getSemanticStepname(oElement, sEventId);
								oPendingInteraction.event = sEventId;
								//if we find no direct match we consider the last control event for the trigger/event (step name)
								break;
							}
						}
					}
				}
			}
		},

		/**
		 * Register async operation, that is relevant for a running interaction.
		 * Invoking the returned handle stops the async operation.
		 *
		 * @param {string} sStepName a step name
		 * @returns {function} The async handle
		 * @private
		 */
		notifyAsyncStep : function(sStepName) {
			if (oPendingInteraction) {
				/*eslint-disable no-console */
				if (Log.isLoggable(null, "sap.ui.Performance") && sStepName) {
					console.time(sStepName);
				}
				/*eslint-enable no-console */
				var sInteractionId = oPendingInteraction.id;
				delete oPendingInteraction.preliminaryEnd; // Delete prelimanry end to force current timestamp of finalization
				Interaction.notifyAsyncStepStart();
				return function() {
					Interaction.notifyAsyncStepEnd(sInteractionId);
					/*eslint-disable no-console */
					if (Log.isLoggable(null, "sap.ui.Performance") && sStepName) {
						console.timeEnd(sStepName);
					}
					/*eslint-enable no-console */
				};
			} else {
				return function() {};
			}
		},

		/**
		 * This methods resets the idle time check. Counts a running interaction relevant step.
		 *
		 * @private
		*/
		notifyAsyncStepStart : function() {
			if (oPendingInteraction) {
				iInteractionCounter++;
				clearTimeout(iInteractionStepTimer);
				bIdle = false;
				if (Log.isLoggable()) {
					Log.debug("Interaction relevant step started - Number of pending steps: " + iInteractionCounter);
				}
			}
		},

		/**
		 * Ends a running interaction relevant step by decreasing the internal count.
		 *
		 * @private
		*/
		notifyAsyncStepEnd : function(sId) {
			if (oPendingInteraction && sId === oPendingInteraction.id) {
				iInteractionCounter--;
				Interaction.notifyStepEnd(true);
				if (Log.isLoggable()) {
					Log.debug("Interaction relevant step stopped - Number of pending steps: " + iInteractionCounter);
				}
			}
		},

		/**
		 * This method ends the started interaction measurement.
		 *
		 * @static
		 * @private
		 */
		notifyStepEnd : function(bCheckIdle) {
			if (bInteractionActive && !bSuspended) {
				if (iInteractionCounter === 0 || !bCheckIdle) {
					if (bIdle || !bCheckIdle) {
						Interaction.end(true);
						if (Log.isLoggable()) {
							Log.debug("Interaction stopped");
						}
						bIdle = false;
					} else {
						Interaction.end(); //set preliminary end time
						bIdle = true;
						if (iInteractionStepTimer) {
							clearTimeout(iInteractionStepTimer);
						}
						// There are control events using a debouncing mechanism for e.g. suggest event (see sap.m.Input)
						// A common debounce treshhold (also used by sap.m.Input) is 300ms therefore we use setTimeout
						// with 301ms to end the Interaction after execution of the debounced event
						iInteractionStepTimer = setTimeout(Interaction.notifyStepEnd, 301);
						if (Log.isLoggable()) {
							Log.debug("Interaction check for idle time - Number of pending steps: " + iInteractionCounter);
						}
					}
				}
			}
		},

		/**
		 * This method notifies if a relevant event has been triggered.
		 *
		 * @param {Event} oEvent Event whose processing has started
		 * @static
		 * @private
		 */
		notifyEventStart : function(oEvent) {
			oCurrentBrowserEvent = bInteractionActive ? oEvent : null;
		},

		/**
		 * This method notifies if a scroll event has been triggered. Some controls require this special treatment,
		 * as the generic detection process via notifyEventStart is not sufficient.
		 *
		 * @param {Event} oEvent Scroll event whose processing has started
		 * @static
		 * @private
		 */
		notifyScrollEvent : function(oEvent) {
			/* Scrolling is disabled as it does not work properly for non user triggered scrolling */
		},

		/**
		 * This method notifies if a relevant event has ended by detecting another interaction.
		 *
		 * @static
		 * @private
		 */
		notifyEventEnd : function() {
			if (oCurrentBrowserEvent) {
				// End interaction when a new potential interaction starts
				if (oCurrentBrowserEvent.type.match(/^(mousedown|touchstart|keydown)$/)) {
					Interaction.end(/*bForce*/true);
				}
				// Clean up oCurrentBrowserEvent at the end to prevent dangling events
				// Since oCurrentBrowser event is prerequisite to start an event we need to
				// clean dangling browser events to avoid creating interactions based on these events
				// e.g. The user clicks first somewhere on the UI on a control without press handler.
				// After that the user scrolls in a table and triggers implicit requests via paging.
				// This combination will create an interaction based on the first browser event,
				// created and not cleaned up by the first click within the UI
				if (this.eventEndTimer) {
					clearTimeout(this.eventEndTimer);
				}
				this.eventEndTimer = setTimeout(function() {
					oCurrentBrowserEvent = null;
					delete this.eventEndTimer;
				// There are events fired within a timeout with delay. Cleanup after 10ms
				// to hopefully prevent cleaning up to early (before control event was fired)
				}.bind(this), 10);
			}
		},

		/**
		 * A hook which is called when an interaction is started.
		 *
		 * @param {object} oInteraction The pending interaction
		 * @private
		 */
		onInteractionStarted: null,

		/**
		 * A hook which is called when an interaction is finished.
		 *
		 * @param {object} oFinishedInteraction The finished interaction
		 * @private
		 */
		onInteractionFinished: null,

		/**
		 * This method sets the component name for an interaction once. This respects the case, where a new
		 * component is created in an interaction step while for example navigating to a new page. Differs
		 * from the actual owner component of the trigger control, which is still the previous component.
		 *
		 * @static
		 * @private
		 */
		setStepComponent : function(sComponentName) {
			if (bInteractionActive && oPendingInteraction && sComponentName && !oPendingInteraction.stepComponent) {
				oPendingInteraction.stepComponent = sComponentName;
			}
		},

		/**
		 * @param {float} iDuration Increase busy duration of pending interaction by this value
		 * @static
		 * @private
		 */
		addBusyDuration : function (iDuration) {
			if (bInteractionActive && oPendingInteraction) {
				if (!oPendingInteraction.busyDuration) {
					oPendingInteraction.busyDuration = 0;
				}
				oPendingInteraction.busyDuration += iDuration;
			}
		}
	};

	return Interaction;
});
/*!
 * copyright
 */

sap.ui.predefine("sap/ui/security/Security", [
	"sap/base/config"
], function(
	BaseConfig
) {
	"use strict";

	const oWritableConfig = BaseConfig.getWritableInstance();

	/**
	 * Helper function for getting the config option 'allowListService'
	 * For legacy reasons configuration option provided via the global window object
	 * are treated different compared to the option provided using bootstrap or meta
	 * tag. Configuration options provided via globalThis/window object are always
	 * prefixed with 'sapUi' therefore first check for param starting with 'sapUi'.
	 * In case there is no param found check for param prefixed only with 'sap'.
	 * @private
	 * @since 1.120.0
	 * @return {Object} An object containing the value of configuration
	 * parameter allowListService and a flag whether the parameter is derived
	 * from global provider or not.
	 */
	const getAllowlistService = () => {
		let bGlobalProvider = true;
		let sAllowlistService = oWritableConfig.get({
			name: "sapUiAllowlistService",
			type: oWritableConfig.Type.String,
			defaultValue: oWritableConfig.get({
				name: "sapUiWhitelistService",
				type: oWritableConfig.Type.String,
				defaultValue: undefined
			})
		});
		if (!sAllowlistService) {
			sAllowlistService = oWritableConfig.get({
				name: "sapAllowlistService",
				type: oWritableConfig.Type.String,
				defaultValue: oWritableConfig.get({
					name: "sapWhitelistService",
					type: oWritableConfig.Type.String
				})
			});
			bGlobalProvider = false;
		}
		return {
			allowlistService: sAllowlistService,
			globalProvider: bGlobalProvider
		};
	};
	/**
	 * Provides security related API
	 *
	 * @alias module:sap/ui/security/Security
	 * @namespace
	 * @public
	 * @since 1.120.0
	 */
	const Security = {
		/**
		 * URL of the allowlist service.
		 *
		 * @return {string} allowlist service URL
		 * @public
		 * @since 1.120.0
		*/
		getAllowlistService: () => getAllowlistService().allowlistService,

		/**
		 * frameOptions mode (allow/deny/trusted).
		 *
		 * @return {string} frameOptions mode
		 * @public
		 * @since 1.120.0
		 */
		getFrameOptions() {
			var sFrameOptions = oWritableConfig.get({
				name: "sapUiFrameOptions",
				type: oWritableConfig.Type.String,
				defaultValue: "default"
			});

			if (sFrameOptions === "default") {
				const oAllowlistService = getAllowlistService();
				sFrameOptions = oAllowlistService.allowlistService && !oAllowlistService.globalProvider ? "trusted" : "allow";
			}
			return sFrameOptions;
		},

		/**
		 * Returns the security token handlers of an OData V4 model.
		 *
		 * @returns {Array<function(sap.ui.core.URI):Promise>} the security token handlers (an empty array if there are none)
		 * @public
		 * @since 1.120.0
		 * @see #setSecurityTokenHandlers
		 */
		getSecurityTokenHandlers() {
			return oWritableConfig.get({
				name: "sapUiSecurityTokenHandlers",
				type: oWritableConfig.Type.FunctionArray
			});
		},

		/**
		 * Sets the security token handlers for an OData V4 model. See chapter
		 * {@link topic:9613f1f2d88747cab21896f7216afdac/section_STH Security Token Handling}.
		 *
		 * @param {Array<function(sap.ui.core.URI):Promise>} aSecurityTokenHandlers - The security token handlers
		 * @public
		 * @since 1.120.0
		 * @see #getSecurityTokenHandlers
		 */
		setSecurityTokenHandlers(aSecurityTokenHandlers) {
			aSecurityTokenHandlers.forEach(function (fnSecurityTokenHandler) {
				if (typeof fnSecurityTokenHandler !== "function") {
					throw new Error("Not a function: " + fnSecurityTokenHandler);
				}
			});
			oWritableConfig.set("sapUiSecurityTokenHandlers", aSecurityTokenHandlers.slice());
		}
	};

	return Security;
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
sap.ui.predefine("sap/ui/util/ActivityDetection", [
	"sap/ui/core/Theming"
], function(Theming) {

	"use strict";

	/**
	 * Provides functionality for activity detection.
	 *
	 * @namespace
	 * @since 1.58
	 * @alias module:sap/ui/util/ActivityDetection
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	var oActivityDetection = {},
		_active = true,
		_deactivateTimer = null,
		_I_MAX_IDLE_TIME = 10000, //max. idle time in ms
		_aActivateListeners = [],
		_activityDetected = false,
		_domChangeObserver = null;

	function _onDeactivate(){
		_deactivateTimer = null;

		if (_activityDetected && document.hidden !== true) {
			_onActivate();
			return;
		}

		_active = false;
		//_triggerEvent(_aDeactivateListeners); //Maybe provide later
		_domChangeObserver.observe(document.documentElement, {childList: true, attributes: true, subtree: true, characterData: true});
	}

	function _onActivate(){
		// Never activate when document is not visible to the user
		if (document.hidden) {
			return;
		}

		if (!_active) {
			_active = true;
			_triggerEvent(_aActivateListeners);
			_domChangeObserver.disconnect();
		}
		if (_deactivateTimer) {
			_activityDetected = true;
		} else {
			_deactivateTimer = setTimeout(_onDeactivate, _I_MAX_IDLE_TIME);
			_activityDetected = false;
		}
	}

	function _triggerEvent(aListeners){
		if (aListeners.length === 0) {
			return;
		}
		var aEventListeners = aListeners.slice();
		setTimeout(function(){
			var oInfo;
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				oInfo = aEventListeners[i];
				oInfo.fFunction.call(oInfo.oListener || window);
			}
		}, 0);
	}


	/**
	 * Registers the given handler to the activity event, which is fired when an activity was detected after a certain period of inactivity.
	 *
	 * @param {function} fnFunction The function to call, when an activity event occurs.
	 * @param {Object} [oListener] The 'this' context of the handler function.
	 * @private
	 * @static
	 */
	oActivityDetection.attachActivate = function(fnFunction, oListener){
		_aActivateListeners.push({oListener: oListener, fFunction:fnFunction});
	};

	/**
	 * Deregisters a previously registered handler from the activity event.
	 *
	 * @param {function} fnFunction The function to call, when an activity event occurs.
	 * @param {Object} [oListener] The 'this' context of the handler function.
	 * @private
	 * @static
	 */
	oActivityDetection.detachActivate = function(fnFunction, oListener){
		for (var i = 0, iL = _aActivateListeners.length; i < iL; i++) {
			if (_aActivateListeners[i].fFunction === fnFunction && _aActivateListeners[i].oListener === oListener) {
				_aActivateListeners.splice(i,1);
				break;
			}
		}
	};

	/**
	 * Checks whether recently an activity was detected.
	 *
	 * @return {boolean} <code>true</code> if recently an activity was detected, <code>false</code> otherwise
	 * @public
	 * @static
	 */
	oActivityDetection.isActive = function(){ return _active; };

	/**
	 * Reports an activity.
	 *
	 * @public
	 * @static
	 */
	oActivityDetection.refresh = _onActivate;


	// Setup and registering handlers

	var aEvents = ["resize", "orientationchange", "mousemove", "mousedown", "mouseup", //"mouseout", "mouseover",
		"paste", "cut", "keydown", "keyup", "DOMMouseScroll", "mousewheel"];

	if ('ontouchstart' in window) { // touch events supported
		aEvents.push("touchstart", "touchmove", "touchend", "touchcancel");
	}

	for (var i = 0; i < aEvents.length; i++) {
		window.addEventListener(aEvents[i], oActivityDetection.refresh, {
			capture: true,
			passive: true
		});
	}

	if (window.MutationObserver) {
		_domChangeObserver = new window.MutationObserver(oActivityDetection.refresh);
	} else if (window.WebKitMutationObserver) {
		_domChangeObserver = new window.WebKitMutationObserver(oActivityDetection.refresh);
	} else {
		_domChangeObserver = {
			observe : function(){
				document.documentElement.addEventListener("DOMSubtreeModified", oActivityDetection.refresh);
			},
			disconnect : function(){
				document.documentElement.removeEventListener("DOMSubtreeModified", oActivityDetection.refresh);
			}
		};
	}

	if (typeof document.hidden === "boolean") {
		document.addEventListener("visibilitychange", function() {
			// Only trigger refresh if document has changed to visible
			if (document.hidden !== true) {
				oActivityDetection.refresh();
			}
		}, false);
	}

	Theming.attachApplied(function() {
		oActivityDetection.refresh();
	});

	_onActivate();

	return oActivityDetection;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/util/_enforceNoReturnValue", [
	"sap/base/future",
	"sap/base/Log"
], function(future, Log) {
	"use strict";

	function _enforceNoReturnValue(vResult, mLogInfo) {
		if (vResult !== undefined) {
			const sFunctionName = mLogInfo.name ? `'${mLogInfo.name}' ` : '';
			/**
			 * @deprecated
			 */
			if (typeof vResult.then === "function") {
				vResult.catch((err) => {
					Log.error(`The registered Event Listener ${sFunctionName}of '${mLogInfo.component}' failed.`, err);
				});
			}
			// for any return value other than 'undefined'
			future.fatalThrows(`The registered Event Listener ${sFunctionName}must not have a return value.`, mLogInfo.component);
		}
	}
	return _enforceNoReturnValue;
});
sap.ui.require.preload({
	"sap/ui/thirdparty/jquery-compat.js":function(){
/*!
 * jQuery Migrate - v3.3.1 - 2020-06-25T01:07Z
 * Copyright OpenJS Foundation and other contributors
 */
( function( factory ) {
	"use strict";
	// ##### BEGIN: MODIFIED BY SAP
	//if ( typeof define === "function" && define.amd ) {
	//
	//	// AMD. Register as an anonymous module.
	//	define( [ "jquery" ], function ( jQuery ) {
	//		return factory( jQuery, window );
	//	} );
	//} else if ( typeof module === "object" && module.exports ) {
	//
	//	// Node/CommonJS
	//	// eslint-disable-next-line no-undef
	//	module.exports = factory( require( "jquery" ), window );
	//} else {
	// Browser globals
	var oBootstrapScript = document.querySelector('SCRIPT[src][id=sap-ui-bootstrap]');
	var oCfg = window['sap-ui-config'] || {};

	// Before the compat layer is applied, the following conditions are checked. If one of them is
	// matched, the application of the compat layer is excluded.
	// 1. check for URL parameter
	// 2. check for the attribute marker in the bootstrap
	// 3. check in the global configuration object
	if (/sap-ui-excludeJQueryCompat=(true|x)/.test(location.search)
		|| (oBootstrapScript && oBootstrapScript.getAttribute("data-sap-ui-excludejquerycompat") === "true")
		|| oCfg["excludejquerycompat"] === true || oCfg["excludeJQueryCompat"] === true) {
		return;
	}

	//Introduce namespace if it does not yet exist
	if (typeof window.sap !== "object" && typeof window.sap !== "function") {
		window.sap = {};
	}
	if (typeof window.sap.ui !== "object") {
		window.sap.ui = {};
	}

	// expose factory so the jQuery version delivered with UI5 can apply it later
	sap.ui._jQuery3Compat = {
		_factory: factory
	};

	// jQuery might be present already: apply factory directly
	if (window.jQuery) {
		factory( jQuery, window );
	}

	// }
	// ##### END: MODIFIED BY SAP
} )( function( jQuery, window ) {
"use strict";

jQuery.migrateVersion = "3.3.1";

// Returns 0 if v1 == v2, -1 if v1 < v2, 1 if v1 > v2
function compareVersions( v1, v2 ) {
	var i,
		rVersionParts = /^(\d+)\.(\d+)\.(\d+)/,
		v1p = rVersionParts.exec( v1 ) || [ ],
		v2p = rVersionParts.exec( v2 ) || [ ];

	for ( i = 1; i <= 3; i++ ) {
		if ( +v1p[ i ] > +v2p[ i ] ) {
			return 1;
		}
		if ( +v1p[ i ] < +v2p[ i ] ) {
			return -1;
		}
	}
	return 0;
}

function jQueryVersionSince( version ) {
	return compareVersions( jQuery.fn.jquery, version ) >= 0;
}


// ##### BEGIN: MODIFIED BY SAP
// Check the jquery version. If it's different than 3.6.0 but stays in the same major version 3.x.x, a warning is
// logged and the compatibility layer is still applied. If it has a different major version as 3.x.x, an error is
// logged and the application of the layer is skipped.
/* eslint-disable no-console */
if (jQueryVersionSince("3.0.0") && !jQueryVersionSince("4.0.0")) {
	if (jQuery.fn.jquery !== "3.6.0" && console) {
		console.warn("The current jQuery version " + jQuery.fn.jquery + " is different than the version 3.6.0 that is used for testing jquery-compat.js. jquery-compat.js is applied but it may not work properly.");
	}
} else {
	if (console) {
		console.error("The current jQuery version " + jQuery.fn.jquery + " differs at the major version than the version 3.6.0 that is used for testing jquery-compat.js. jquery-compat.js shouldn't be applied in this case!");
	}
	// skip the appliation of jquery compatibility layer
	return;
}
/* eslint-enable no-console */
// ##### END: MODIFIED BY SAP

var warnedAbout = {};

// By default each warning is only reported once.
// ##### BEGIN: MODIFIED BY SAP
// UI5 needs to report every warning occurance
jQuery.migrateDeduplicateWarnings = false;
// ##### END: MODIFIED BY SAP

// List of warnings already given; public read only
jQuery.migrateWarnings = [];
// ##### BEGIN: MODIFIED BY SAP
	/* eslint-disable no-console */
function migrateWarn( msg ) {
	var ui5logger;
	// delete the substring "removed" from the message because UI5 restores the removed
	// property or function and it's only deprecated
	msg = msg.replace(" and removed", "");

	if ( !jQuery.migrateDeduplicateWarnings || !warnedAbout[ msg ] ) {
		// we check for the availability of the UI5 logger, so we can use it's support rule functionality
		// the ui5logger has a different API than the window.console
		ui5logger = (sap && sap.ui && sap.ui.require) ? sap.ui.require("sap/base/Log") : false;

		warnedAbout[ msg ] = true;
		jQuery.migrateWarnings.push( msg );
		// we use the correct logger for each scenario, either:
		// [1] UI5 Logger available, or [2] jQuery + Compat-Layer standalone
		if (!jQuery.migrateMute) {
			msg = "JQMIGRATE: " + msg;
			if (ui5logger) { // [1]
				if (jQuery.migrateTrace) {
					ui5logger.setLevel(5);
				}
				ui5logger[jQuery.migrateTrace ? "trace" : "warning"](
					msg,
					// info for compat-deprecation support rule
					"jQueryThreeDeprecation",
					null,
					function() {
						return {
							type: "jQueryThreeDeprecation",
							name: "jquery-compat"
						};
					}
				);
			} else if ( console && console.warn ) { // [2]
				console.warn( msg );
				if ( jQuery.migrateTrace && console.trace ) {
					console.trace();
				}
			}
		}
	}
}

// expose warning function so we can use it from within jQuery to log UI5 migration warnings
sap.ui._jQuery3Compat._migrateWarn = migrateWarn;
/* eslint-enable no-console */
// ##### END: MODIFIED BY SAP

function migrateWarnProp( obj, prop, value, msg ) {
	Object.defineProperty( obj, prop, {
		configurable: true,
		enumerable: true,
		get: function() {
			migrateWarn( msg );
			return value;
		},
		set: function( newValue ) {
			migrateWarn( msg );
			value = newValue;
		}
	} );
}

function migrateWarnFunc( obj, prop, newFunc, msg ) {
	obj[ prop ] = function() {
		migrateWarn( msg );
		return newFunc.apply( this, arguments );
	};
}

	// ##### BEGIN: MODIFIED BY SAP
var class2type = {},
	oldInit = jQuery.fn.init,

	// Support: Android <=4.0 only
	// Make sure we trim BOM and NBSP
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
/**
 * jQuery Breaking change Table Row 9
 *
 * Restore the deleted jQuery.fn.context property
 *
 * The "context" property is set with the following logic:
 * * When the given selector is a DOM node, it's set with the DOM node
 * * When the given selector is a string but doesn't represents a DOM node, it's set with "document"
 * * All other cases, it's undefined
 *
 */
jQuery.fn.init = function( arg1 ) {
	var args = Array.prototype.slice.call( arguments );

	if ( typeof arg1 === "string" && arg1 === "#" ) {

		// JQuery( "#" ) is a bogus ID selector, but it returned an empty set before jQuery 3.0
		migrateWarn( "jQuery( '#' ) is not a valid selector" );
		args[ 0 ] = [];
	}

	var oRes = oldInit.apply( this, args );
	if ( args[ 0 ] ) {
		if ( args[ 0 ].nodeType ) { // selector is DOM Element
			oRes.context = args[ 0 ];
		} else if ( typeof args[ 0 ] === "string"
			&& !( args[ 0 ][ 0 ] === "<" &&
				args[ 0 ][ args[ 0 ].length - 1 ] === ">" &&
				args[ 0 ].length >= 3)) { // if the selector is a string and doesn't represents any DOM element
			oRes.context = window.document;
			}
		}
		return oRes;
// ##### END: MODIFIED BY SAP
};
jQuery.fn.init.prototype = jQuery.fn;


// ##### BEGIN: MODIFIED BY SAP
/**
 * jQuery Breaking Change Table Row 4
 *
 * Restore the deleted jQuery.fn.size() function by assigning it with jQuery.fn.length
 */
// ##### END: MODIFIED BY SAP
// The number of elements contained in the matched element set
migrateWarnFunc( jQuery.fn, "size", function() {
	return this.length;
},
"jQuery.fn.size() is deprecated and removed; use the .length property" );

migrateWarnFunc( jQuery, "parseJSON", function() {
	return JSON.parse.apply( null, arguments );
},
"jQuery.parseJSON is deprecated; use JSON.parse" );

migrateWarnFunc( jQuery, "holdReady", jQuery.holdReady,
	"jQuery.holdReady is deprecated" );

migrateWarnFunc( jQuery, "unique", jQuery.uniqueSort,
	"jQuery.unique is deprecated; use jQuery.uniqueSort" );

// Now jQuery.expr.pseudos is the standard incantation
migrateWarnProp( jQuery.expr, "filters", jQuery.expr.pseudos,
	"jQuery.expr.filters is deprecated; use jQuery.expr.pseudos" );
migrateWarnProp( jQuery.expr, ":", jQuery.expr.pseudos,
	"jQuery.expr[':'] is deprecated; use jQuery.expr.pseudos" );

// Prior to jQuery 3.1.1 there were internal refs so we don't warn there
if ( jQueryVersionSince( "3.1.1" ) ) {
	migrateWarnFunc( jQuery, "trim", function( text ) {
		return text == null ?
			"" :
			( text + "" ).replace( rtrim, "" );
	},
	"jQuery.trim is deprecated; use String.prototype.trim" );
}

// Prior to jQuery 3.2 there were internal refs so we don't warn there
if ( jQueryVersionSince( "3.2.0" ) ) {
	migrateWarnFunc( jQuery, "nodeName", function( elem, name ) {
		return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
	},
	"jQuery.nodeName is deprecated" );
}

if ( jQueryVersionSince( "3.3.0" ) ) {

	migrateWarnFunc( jQuery, "isNumeric", function( obj ) {

			// As of jQuery 3.0, isNumeric is limited to
			// strings and numbers (primitives or objects)
			// that can be coerced to finite numbers (gh-2662)
			var type = typeof obj;
			return ( type === "number" || type === "string" ) &&

				// parseFloat NaNs numeric-cast false positives ("")
				// ...but misinterprets leading-number strings, e.g. hex literals ("0x...")
				// subtraction forces infinities to NaN
				!isNaN( obj - parseFloat( obj ) );
		},
		"jQuery.isNumeric() is deprecated"
	);

	// Populate the class2type map
	jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".
		split( " " ),
	function( _, name ) {
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	} );

	migrateWarnFunc( jQuery, "type", function( obj ) {
		if ( obj == null ) {
			return obj + "";
		}

		// Support: Android <=2.3 only (functionish RegExp)
		return typeof obj === "object" || typeof obj === "function" ?
			class2type[ Object.prototype.toString.call( obj ) ] || "object" :
			typeof obj;
	},
	"jQuery.type is deprecated" );

	migrateWarnFunc( jQuery, "isFunction",
		function( obj ) {
			return typeof obj === "function";
		},
		"jQuery.isFunction() is deprecated" );

	migrateWarnFunc( jQuery, "isWindow",
		function( obj ) {
			return obj != null && obj === obj.window;
		},
		"jQuery.isWindow() is deprecated"
	);

	migrateWarnFunc( jQuery, "isArray", Array.isArray,
		"jQuery.isArray is deprecated; use Array.isArray"
	);
}

// Support jQuery slim which excludes the ajax module
if ( jQuery.ajax ) {

var oldAjax = jQuery.ajax;

jQuery.ajax = function( ) {
	var jQXHR = oldAjax.apply( this, arguments );

	// Be sure we got a jQXHR (e.g., not sync)
	if ( jQXHR.promise ) {
		migrateWarnFunc( jQXHR, "success", jQXHR.done,
			"jQXHR.success is deprecated and removed" );
		migrateWarnFunc( jQXHR, "error", jQXHR.fail,
			"jQXHR.error is deprecated and removed" );
		migrateWarnFunc( jQXHR, "complete", jQXHR.always,
			"jQXHR.complete is deprecated and removed" );
	}

	return jQXHR;
};

}

var oldRemoveAttr = jQuery.fn.removeAttr,
	oldToggleClass = jQuery.fn.toggleClass,
	rmatchNonSpace = /\S+/g;

jQuery.fn.removeAttr = function( name ) {
	var self = this;

	jQuery.each( name.match( rmatchNonSpace ), function( _i, attr ) {
		if ( jQuery.expr.match.bool.test( attr ) ) {
			migrateWarn( "jQuery.fn.removeAttr no longer sets boolean properties: " + attr );
			self.prop( attr, false );
		}
	} );

	return oldRemoveAttr.apply( this, arguments );
};

jQuery.fn.toggleClass = function( state ) {

	// Only deprecating no-args or single boolean arg
	if ( state !== undefined && typeof state !== "boolean" ) {
		return oldToggleClass.apply( this, arguments );
	}

	migrateWarn( "jQuery.fn.toggleClass( boolean ) is deprecated" );

	// Toggle entire class name of each element
	return this.each( function() {
		var className = this.getAttribute && this.getAttribute( "class" ) || "";

		if ( className ) {
			jQuery.data( this, "__className__", className );
		}

		// If the element has a class name or if we're passed `false`,
		// then remove the whole classname (if there was one, the above saved it).
		// Otherwise bring back whatever was previously saved (if anything),
		// falling back to the empty string if nothing was stored.
		if ( this.setAttribute ) {
			this.setAttribute( "class",
				className || state === false ?
				"" :
				jQuery.data( this, "__className__" ) || ""
			);
		}
	} );
};

function camelCase( string ) {
	return string.replace( /-([a-z])/g, function( _, letter ) {
		return letter.toUpperCase();
	} );
}

var oldFnCss,
	ralphaStart = /^[a-z]/,

	// The regex visualized:
	//
	//                         /----------\
	//                        |            |    /-------\
	//                        |  / Top  \  |   |         |
	//         /--- Border ---+-| Right  |-+---+- Width -+---\
	//        |                 | Bottom |                    |
	//        |                  \ Left /                     |
	//        |                                               |
	//        |                              /----------\     |
	//        |          /-------------\    |            |    |- END
	//        |         |               |   |  / Top  \  |    |
	//        |         |  / Margin  \  |   | | Right  | |    |
	//        |---------+-|           |-+---+-| Bottom |-+----|
	//        |            \ Padding /         \ Left /       |
	// BEGIN -|                                               |
	//        |                /---------\                    |
	//        |               |           |                   |
	//        |               |  / Min \  |    / Width  \     |
	//         \--------------+-|       |-+---|          |---/
	//                           \ Max /       \ Height /
	rautoPx = /^(?:Border(?:Top|Right|Bottom|Left)?(?:Width|)|(?:Margin|Padding)?(?:Top|Right|Bottom|Left)?|(?:Min|Max)?(?:Width|Height))$/;


// ##### BEGIN: MODIFIED BY SAP
/* global Proxy, Reflect */
// ##### END: MODIFIED BY SAP
if ( typeof Proxy !== "undefined" ) {
	jQuery.cssProps = new Proxy( jQuery.cssProps || {}, {
		set: function() {
			// ##### BEGIN: MODIFIED BY SAP
			// removed 'JQMIGRATE' string part
			migrateWarn( "jQuery.cssProps is deprecated" );
			// ##### END: MODIFIED BY SAP
			return Reflect.set.apply( this, arguments );
		}
		} );
	}

function isAutoPx( prop ) {

	// The first test is used to ensure that:
	// 1. The prop starts with a lowercase letter (as we uppercase it for the second regex).
	// 2. The prop is not empty.
	return ralphaStart.test( prop ) &&
		rautoPx.test( prop[ 0 ].toUpperCase() + prop.slice( 1 ) );
}

oldFnCss = jQuery.fn.css;

jQuery.fn.css = function( name, value ) {
	var camelName,
		origThis = this;
	if ( name && typeof name === "object" && !Array.isArray( name ) ) {
		jQuery.each( name, function( n, v ) {
			jQuery.fn.css.call( origThis, n, v );
		} );
	}
	if ( typeof value === "number" ) {
		camelName = camelCase( name );
		if ( !isAutoPx( camelName ) && !jQuery.cssNumber[ camelName ] ) {
			migrateWarn( "Number-typed values are deprecated for jQuery.fn.css( \"" +
				name + "\", value )" );
		}
	}

	return oldFnCss.apply( this, arguments );
};

// Support jQuery slim which excludes the effects module
if ( jQuery.fx ) {


var intervalValue, intervalMsg;
intervalValue = jQuery.fx.interval || 13;
intervalMsg = "jQuery.fx.interval is deprecated";

// Support: IE9, Android <=4.4
// Avoid false positives on browsers that lack rAF
// Don't warn if document is hidden, jQuery uses setTimeout (#292)
if ( window.requestAnimationFrame ) {
	Object.defineProperty( jQuery.fx, "interval", {
		configurable: true,
		enumerable: true,
		get: function() {
			if ( !window.document.hidden ) {
				migrateWarn( intervalMsg );
			}
			return intervalValue;
		},
		set: function( newValue ) {
			migrateWarn( intervalMsg );
			intervalValue = newValue;
		}
	} );
}

}

var oldLoad = jQuery.fn.load,
	oldEventAdd = jQuery.event.add,
	originalFix = jQuery.event.fix;

// ##### BEGIN: MODIFIED BY SAP
/**
 * jQuery Breaking Change Table Row 15
 *
 * Restore the deleted jQuery.event.props and jQuery.event.fixHooks properties
 */
// ##### END: MODIFIED BY SAP
jQuery.event.props = [];
jQuery.event.fixHooks = {};

migrateWarnProp( jQuery.event.props, "concat", jQuery.event.props.concat,
	"jQuery.event.props.concat() is deprecated and removed" );

jQuery.event.fix = function( originalEvent ) {
	var event,
		type = originalEvent.type,
		fixHook = this.fixHooks[ type ],
		props = jQuery.event.props;

	if ( props.length ) {
		migrateWarn( "jQuery.event.props are deprecated and removed: " + props.join() );
		while ( props.length ) {
			jQuery.event.addProp( props.pop() );
		}
	}

	if ( fixHook && !fixHook._migrated_ ) {
		fixHook._migrated_ = true;
		migrateWarn( "jQuery.event.fixHooks are deprecated and removed: " + type );
		if ( ( props = fixHook.props ) && props.length ) {
			while ( props.length ) {
				jQuery.event.addProp( props.pop() );
			}
		}
	}

	event = originalFix.call( this, originalEvent );

	return fixHook && fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
};

jQuery.event.add = function( elem, types ) {

	// This misses the multiple-types case but that seems awfully rare
	if ( elem === window && types === "load" && window.document.readyState === "complete" ) {
		migrateWarn( "jQuery(window).on('load'...) called after load event occurred" );
	}
	return oldEventAdd.apply( this, arguments );
};

jQuery.each( [ "load", "unload", "error" ], function( _, name ) {

	jQuery.fn[ name ] = function() {
		var args = Array.prototype.slice.call( arguments, 0 );

		// If this is an ajax load() the first arg should be the string URL;
		// technically this could also be the "Anything" arg of the event .load()
		// which just goes to show why this dumb signature has been deprecated!
		// jQuery custom builds that exclude the Ajax module justifiably die here.
		if ( name === "load" && typeof args[ 0 ] === "string" ) {
			return oldLoad.apply( this, args );
		}

		migrateWarn( "jQuery.fn." + name + "() is deprecated" );

		args.splice( 0, 0, name );
		if ( arguments.length ) {
			return this.on.apply( this, args );
		}

		// Use .triggerHandler here because:
		// - load and unload events don't need to bubble, only applied to window or image
		// - error event should not bubble to window, although it does pre-1.7
		// See http://bugs.jquery.com/ticket/11820
		this.triggerHandler.apply( this, args );
		return this;
	};

} );

jQuery.each( ( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( _i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		migrateWarn( "jQuery.fn." + name + "() event shorthand is deprecated" );
		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};
} );

// Trigger "ready" event only once, on document ready
jQuery( function() {
	jQuery( window.document ).triggerHandler( "ready" );
} );

jQuery.event.special.ready = {
	setup: function() {
		if ( this === window.document ) {
			migrateWarn( "'ready' event is deprecated" );
		}
	}
};

jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		migrateWarn( "jQuery.fn.bind() is deprecated" );
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		migrateWarn( "jQuery.fn.unbind() is deprecated" );
		return this.off( types, null, fn );
	},
	delegate: function( selector, types, data, fn ) {
		migrateWarn( "jQuery.fn.delegate() is deprecated" );
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		migrateWarn( "jQuery.fn.undelegate() is deprecated" );
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	},
	hover: function( fnOver, fnOut ) {
		migrateWarn( "jQuery.fn.hover() is deprecated" );
		return this.on( "mouseenter", fnOver ).on( "mouseleave", fnOut || fnOver );
	}
} );


// ##### BEGIN: MODIFIED BY SAP
/**
 * jQuery Breaking Change Table Row 14
 *
 * Restore the old behavior of jQuery.fn.offset that it doesn't throw an error when the jQuery object
 * doesn't contain any valid DOM element.
 */
// ##### END: MODIFIED BY SAP
var oldOffset = jQuery.fn.offset;

jQuery.fn.offset = function() {
	var elem = this[ 0 ];

	if ( elem && ( !elem.nodeType || !elem.getBoundingClientRect ) ) {
		migrateWarn( "jQuery.fn.offset() requires a valid DOM element" );
		return arguments.length ? this : undefined;
	}

	return oldOffset.apply( this, arguments );
};

// ##### BEGIN: MODIFIED BY SAP
/**
 * jQuery Breaking Change Table Row 13
 *
 * Restore the deleted jQuery.fn.andSelf() function by assigning it with jQuery.fn.addBack()
 */
// ##### END: MODIFIED BY SAP
var oldSelf = jQuery.fn.andSelf || jQuery.fn.addBack;

jQuery.fn.andSelf = function() {
	migrateWarn( "jQuery.fn.andSelf() is deprecated and removed, use jQuery.fn.addBack()" );
	return oldSelf.apply( this, arguments );
};
// ##### BEGIN: MODIFIED BY SAP
/**
 * jQuery.Deferred
 *  - add migration warning to "pipe" method
 *  - patch "then" with "pipe" to restore the sync resolve of the given function to the method
 *  - don't patch "catch" because it's a new method since jQuery 3
 */
// ##### END: MODIFIED BY SAP
var oldDeferred = jQuery.Deferred,
	tuples = [

		// Action, add listener, callbacks, .then handlers, final state
		[ "resolve", "done", jQuery.Callbacks( "once memory" ),
			jQuery.Callbacks( "once memory" ), "resolved" ],
		[ "reject", "fail", jQuery.Callbacks( "once memory" ),
			jQuery.Callbacks( "once memory" ), "rejected" ],
		[ "notify", "progress", jQuery.Callbacks( "memory" ),
			jQuery.Callbacks( "memory" ) ]
	];

jQuery.Deferred = function( func ) {
	var deferred = oldDeferred(),
		promise = deferred.promise();

	// ##### BEGIN: MODIFIED BY SAP
	// Add the possibility to give the third parameter with a boolean value to indicates whether the warning
	// should be suppressed because the .then method calls the .pipe method internally which shouldn't cause
	// any warning to be logged.
	deferred.pipe = promise.pipe = function( /* fnDone, fnFail, fnProgress/bSuppressWarning */ ) {
		var fns = arguments;
		if (typeof arguments[2] !== "boolean" || !arguments[2]) {
			migrateWarn( "deferred.pipe() is deprecated" );
		}
	// ##### END: MODIFIED BY SAP
		return jQuery.Deferred( function( newDefer ) {
			jQuery.each( tuples, function( i, tuple ) {
				var fn = typeof fns[ i ] === "function" && fns[ i ];

				// Deferred.done(function() { bind to newDefer or newDefer.resolve })
				// deferred.fail(function() { bind to newDefer or newDefer.reject })
				// deferred.progress(function() { bind to newDefer or newDefer.notify })
				deferred[ tuple[ 1 ] ]( function() {
					var returned = fn && fn.apply( this, arguments );
					if ( returned && typeof returned.promise === "function" ) {
						returned.promise()
							.done( newDefer.resolve )
							.fail( newDefer.reject )
							.progress( newDefer.notify );
					} else {
						newDefer[ tuple[ 0 ] + "With" ](
							this === promise ? newDefer.promise() : this,
							fn ? [ returned ] : arguments
						);
					}
				} );
			} );
			fns = null;
		} ).promise();

	};

	// ##### BEGIN: MODIFIED BY SAP
	/**
	 * jQuery Breaking Change Table Row 7 and 8
	 *
	 * Call the functions that are given to "then" synchronously and provide them with a "this" context
	 * pointing to the "promise" object under the jQuery.Deferred instance.
	 *
	 */
	// patch the "then" method with "pipe" to restore the sync resolve of "then"
	deferred.then = promise.then = function() {
		// The "pipe" function accepts a third parameter which isn't supported by the "then" method.
		// Therefore only the first two parameters are forwarded to the pipe function.
		return deferred.pipe(arguments[0], arguments[1], true /* suppress warning log */);
	};
	// patch the following function with a "this" context of the promise from the deferred object
	deferred.notify = function() {
		deferred.notifyWith(this === deferred ? promise : this, arguments);
		return this;
	};
	deferred.resolve = function() {
		deferred.resolveWith(this === deferred ? promise : this, arguments);
		return this;
	};
	deferred.reject = function() {
		deferred.rejectWith(this === deferred ? promise : this, arguments);
		return this;
	};
	// ##### END: MODIFIED BY SAP
	if ( func ) {
		func.call( deferred, deferred );
	}

	return deferred;
};

// Preserve handler of uncaught exceptions in promise chains
jQuery.Deferred.exceptionHook = oldDeferred.exceptionHook;

// ##### BEGIN: MODIFIED BY SAP
/**
 * jQuery Breaking Change Table Row 1 and 2
 *
 * Patch the following functions:
 *
 *  - jQuery.fn.innerHeight
 *  - jQuery.fn.height
 *  - jQuery.fn.outerHeight
 *  - jQuery.fn.innerWidth
 *  - jQuery.fn.width
 *  - jQuery.fn.outerWidth
 *
 *  to
 *
 *  - Valid jQuery element set:
 *     - When the function is called as a getter (without parameter given): return integer instead of float
 *     - When the function is called as a setter: the return value isn't adapted
 *  - Empty jQuery element set:
 *     - When the function is called as a getter (without parameter given): return null instead of undefined
 *     - When the function is called as a setter: return 'this' (the empty jQuery object)
 *
 */
var mOrigMethods = {},
	aMethods = ["innerHeight", "height", "outerHeight", "innerWidth", "width", "outerWidth"];
aMethods.forEach(function(sName) {
	mOrigMethods[sName] = jQuery.fn[sName];
	jQuery.fn[sName] = function() {
		var vRes = mOrigMethods[sName].apply(this, arguments);

		// return null instead of undefined for empty element sets
		if (vRes === undefined && this.length === 0) {
			return null;
		} else {
			// Round the pixel value
			if (typeof vRes === "number") {
				vRes = Math.round(vRes);
			}
			return vRes;
		}
	};
});
// ##### END: MODIFIED BY SAP
} );
},
	"sap/ui/thirdparty/jquery-mobile-custom.js":function(){
/*
* jQuery Mobile v1.3.1
* http://jquerymobile.com
*
* Copyright 2010, 2013 jQuery Foundation, Inc. and other contributors
* Released under the MIT license.
* http://jquery.org/license
*
*/

(function ( root, doc, factory ) {
	if ( typeof define === "function" && define.amd ) {
		// AMD. Register as an anonymous module.
		define( [ "jquery" ], function ( $ ) {
			factory( $, root, doc );
			return $.mobile;
		});
	} else {
		// Browser globals
		factory( root.jQuery, root, doc );
	}
}( this, document, function ( jQuery, window, document, undefined ) {
// Script: jQuery hashchange event
//
// *Version: 1.3, Last updated: 7/21/2010*
//
// Project Home - http://benalman.com/projects/jquery-hashchange-plugin/
// GitHub       - http://github.com/cowboy/jquery-hashchange/
// Source       - http://github.com/cowboy/jquery-hashchange/raw/master/jquery.ba-hashchange.js
// (Minified)   - http://github.com/cowboy/jquery-hashchange/raw/master/jquery.ba-hashchange.min.js (0.8kb gzipped)
//
// About: License
//
// Copyright (c) 2010 "Cowboy" Ben Alman,
// Dual licensed under the MIT and GPL licenses.
// http://benalman.com/about/license/
//
// About: Examples
//
// These working examples, complete with fully commented code, illustrate a few
// ways in which this plugin can be used.
//
// hashchange event - http://benalman.com/code/projects/jquery-hashchange/examples/hashchange/
// document.domain - http://benalman.com/code/projects/jquery-hashchange/examples/document_domain/
//
// About: Support and Testing
//
// Information about what version or versions of jQuery this plugin has been
// tested with, what browsers it has been tested in, and where the unit tests
// reside (so you can test it yourself).
//
// jQuery Versions - 1.2.6, 1.3.2, 1.4.1, 1.4.2
// Browsers Tested - Internet Explorer 6-8, Firefox 2-4, Chrome 5-6, Safari 3.2-5,
//                   Opera 9.6-10.60, iPhone 3.1, Android 1.6-2.2, BlackBerry 4.6-5.
// Unit Tests      - http://benalman.com/code/projects/jquery-hashchange/unit/
//
// About: Known issues
//
// While this jQuery hashchange event implementation is quite stable and
// robust, there are a few unfortunate browser bugs surrounding expected
// hashchange event-based behaviors, independent of any JavaScript
// window.onhashchange abstraction. See the following examples for more
// information:
//
// Chrome: Back Button - http://benalman.com/code/projects/jquery-hashchange/examples/bug-chrome-back-button/
// Firefox: Remote XMLHttpRequest - http://benalman.com/code/projects/jquery-hashchange/examples/bug-firefox-remote-xhr/
// WebKit: Back Button in an Iframe - http://benalman.com/code/projects/jquery-hashchange/examples/bug-webkit-hash-iframe/
// Safari: Back Button from a different domain - http://benalman.com/code/projects/jquery-hashchange/examples/bug-safari-back-from-diff-domain/
//
// Also note that should a browser natively support the window.onhashchange
// event, but not report that it does, the fallback polling loop will be used.
//
// About: Release History
//
// 1.3   - (7/21/2010) Reorganized IE6/7 Iframe code to make it more
//         "removable" for mobile-only development. Added IE6/7 document.title
//         support. Attempted to make Iframe as hidden as possible by using
//         techniques from http://www.paciellogroup.com/blog/?p=604. Added
//         support for the "shortcut" format $(window).hashchange( fn ) and
//         $(window).hashchange() like jQuery provides for built-in events.
//         Renamed jQuery.hashchangeDelay to <jQuery.fn.hashchange.delay> and
//         lowered its default value to 50. Added <jQuery.fn.hashchange.domain>
//         and <jQuery.fn.hashchange.src> properties plus document-domain.html
//         file to address access denied issues when setting document.domain in
//         IE6/7.
// 1.2   - (2/11/2010) Fixed a bug where coming back to a page using this plugin
//         from a page on another domain would cause an error in Safari 4. Also,
//         IE6/7 Iframe is now inserted after the body (this actually works),
//         which prevents the page from scrolling when the event is first bound.
//         Event can also now be bound before DOM ready, but it won't be usable
//         before then in IE6/7.
// 1.1   - (1/21/2010) Incorporated document.documentMode test to fix IE8 bug
//         where browser version is incorrectly reported as 8.0, despite
//         inclusion of the X-UA-Compatible IE=EmulateIE7 meta tag.
// 1.0   - (1/9/2010) Initial Release. Broke out the jQuery BBQ event.special
//         window.onhashchange functionality into a separate plugin for users
//         who want just the basic event & back button support, without all the
//         extra awesomeness that BBQ provides. This plugin will be included as
//         part of jQuery BBQ, but also be available separately.

(function( $, window, undefined ) {
  // Reused string.
  var str_hashchange = 'hashchange',

    // Method / object references.
    doc = document,
    fake_onhashchange,
    special = $.event.special,

    // Does the browser support window.onhashchange? Note that IE8 running in
    // IE7 compatibility mode reports true for 'onhashchange' in window, even
    // though the event isn't supported, so also test document.documentMode.
    doc_mode = doc.documentMode,
    supports_onhashchange = 'on' + str_hashchange in window && ( doc_mode === undefined || doc_mode > 7 );

  // Get location.hash (or what you'd expect location.hash to be) sans any
  // leading #. Thanks for making this necessary, Firefox!
  function get_fragment( url ) {
    url = url || location.href;
    return '#' + url.replace( /^[^#]*#?(.*)$/, '$1' );
  };

  // Method: jQuery.fn.hashchange
  //
  // Bind a handler to the window.onhashchange event or trigger all bound
  // window.onhashchange event handlers. This behavior is consistent with
  // jQuery's built-in event handlers.
  //
  // Usage:
  //
  // > jQuery(window).hashchange( [ handler ] );
  //
  // Arguments:
  //
  //  handler - (Function) Optional handler to be bound to the hashchange
  //    event. This is a "shortcut" for the more verbose form:
  //    jQuery(window).bind( 'hashchange', handler ). If handler is omitted,
  //    all bound window.onhashchange event handlers will be triggered. This
  //    is a shortcut for the more verbose
  //    jQuery(window).trigger( 'hashchange' ). These forms are described in
  //    the <hashchange event> section.
  //
  // Returns:
  //
  //  (jQuery) The initial jQuery collection of elements.

  // Allow the "shortcut" format $(elem).hashchange( fn ) for binding and
  // $(elem).hashchange() for triggering, like jQuery does for built-in events.
  $.fn[ str_hashchange ] = function( fn ) {
	// MODIFIED BY SAP: replace deprecated API .bind -> .on
    return fn ? this.on( str_hashchange, fn ) : this.trigger( str_hashchange );
  };

  // Property: jQuery.fn.hashchange.delay
  //
  // The numeric interval (in milliseconds) at which the <hashchange event>
  // polling loop executes. Defaults to 50.

  // Property: jQuery.fn.hashchange.domain
  //
  // If you're setting document.domain in your JavaScript, and you want hash
  // history to work in IE6/7, not only must this property be set, but you must
  // also set document.domain BEFORE jQuery is loaded into the page. This
  // property is only applicable if you are supporting IE6/7 (or IE8 operating
  // in "IE7 compatibility" mode).
  //
  // In addition, the <jQuery.fn.hashchange.src> property must be set to the
  // path of the included "document-domain.html" file, which can be renamed or
  // modified if necessary (note that the document.domain specified must be the
  // same in both your main JavaScript as well as in this file).
  //
  // Usage:
  //
  // jQuery.fn.hashchange.domain = document.domain;

  // Property: jQuery.fn.hashchange.src
  //
  // If, for some reason, you need to specify an Iframe src file (for example,
  // when setting document.domain as in <jQuery.fn.hashchange.domain>), you can
  // do so using this property. Note that when using this property, history
  // won't be recorded in IE6/7 until the Iframe src file loads. This property
  // is only applicable if you are supporting IE6/7 (or IE8 operating in "IE7
  // compatibility" mode).
  //
  // Usage:
  //
  // jQuery.fn.hashchange.src = 'path/to/file.html';

  $.fn[ str_hashchange ].delay = 50;
  /*
  $.fn[ str_hashchange ].domain = null;
  $.fn[ str_hashchange ].src = null;
  */

  // Event: hashchange event
  //
  // Fired when location.hash changes. In browsers that support it, the native
  // HTML5 window.onhashchange event is used, otherwise a polling loop is
  // initialized, running every <jQuery.fn.hashchange.delay> milliseconds to
  // see if the hash has changed.
  //
  // Usage as described in <jQuery.fn.hashchange>:
  //
  // > // Bind an event handler.
  // > jQuery(window).hashchange( function(e) {
  // >   var hash = location.hash;
  // >   ...
  // > });
  // >
  // > // Manually trigger the event handler.
  // > jQuery(window).hashchange();
  //
  // A more verbose usage that allows for event namespacing:
  //
  // > // Bind an event handler.
  // > jQuery(window).bind( 'hashchange', function(e) {
  // >   var hash = location.hash;
  // >   ...
  // > });
  // >
  // > // Manually trigger the event handler.
  // > jQuery(window).trigger( 'hashchange' );
  //
  // Additional Notes:
  //
  // * The polling loop and Iframe are not created until at least one handler
  //   is actually bound to the 'hashchange' event.
  // * If you need the bound handler(s) to execute immediately, in cases where
  //   a location.hash exists on page load, via bookmark or page refresh for
  //   example, use jQuery(window).hashchange() or the more verbose
  //   jQuery(window).trigger( 'hashchange' ).
  // * The event can be bound before DOM ready, but since it won't be usable
  //   before then in IE6/7 (due to the necessary Iframe), recommended usage is
  //   to bind it inside a DOM ready handler.

  // Override existing $.event.special.hashchange methods (allowing this plugin
  // to be defined after jQuery BBQ in BBQ's source code).
  special[ str_hashchange ] = $.extend( special[ str_hashchange ], {

    // Called only when the first 'hashchange' event is bound to window.
    setup: function() {
      // If window.onhashchange is supported natively, there's nothing to do..
      if ( supports_onhashchange ) { return false; }

      // Otherwise, we need to create our own. And we don't want to call this
      // until the user binds to the event, just in case they never do, since it
      // will create a polling loop and possibly even a hidden Iframe.
      $( fake_onhashchange.start );
    },

    // Called only when the last 'hashchange' event is unbound from window.
    teardown: function() {
      // If window.onhashchange is supported natively, there's nothing to do..
      if ( supports_onhashchange ) { return false; }

      // Otherwise, we need to stop ours (if possible).
      $( fake_onhashchange.stop );
    }

  });

  // fake_onhashchange does all the work of triggering the window.onhashchange
  // event for browsers that don't natively support it, including creating a
  // polling loop to watch for hash changes.
  fake_onhashchange = (function() {
    var self = {},
      timeout_id,

      // Remember the initial hash so it doesn't get triggered immediately.
      last_hash = get_fragment(),

      fn_retval = function( val ) { return val; },
      history_set = fn_retval,
      history_get = fn_retval;

    // Start the polling loop.
    self.start = function() {
      timeout_id || poll();
    };

    // Stop the polling loop.
    self.stop = function() {
      timeout_id && clearTimeout( timeout_id );
      timeout_id = undefined;
    };

    // This polling loop checks every $.fn.hashchange.delay milliseconds to see
    // if location.hash has changed, and triggers the 'hashchange' event on
    // window when necessary.
    function poll() {
      var hash = get_fragment(),
        history_hash = history_get( last_hash );

      if ( hash !== last_hash ) {
        history_set( last_hash = hash, history_hash );

        $(window).trigger( str_hashchange );

      } else if ( history_hash !== last_hash ) {
        location.href = location.href.replace( /#.*/, '' ) + history_hash;
      }

      timeout_id = setTimeout( poll, $.fn[ str_hashchange ].delay );
    };

	// MODIFIED BY SAP - IE 6/7/8compat support was removed.

    return self;
  })();

})(jQuery,this);

(function( $ ) {
	$.mobile = {};
// MODIFIED BY SAP
// To enable using the native orientation change event instead of faking the event by jQuery mobile
jQuery.mobile.orientationChangeEnabled = true;
}( jQuery ));
(function( $, window, undefined ) {
	var nsNormalizeDict = {};

	// jQuery.mobile configurable options
	$.mobile = $.extend($.mobile, {

		// Version of the jQuery Mobile Framework
		version: "1.3.1",

		// Namespace used framework-wide for data-attrs. Default is no namespace
		ns: "",

		// Define the url parameter used for referencing widget-generated sub-pages.
		// Translates to to example.html&ui-page=subpageIdentifier
		// hash segment before &ui-page= is used to make Ajax request
		subPageUrlKey: "ui-page",

		// Class assigned to page currently in view, and during transitions
		activePageClass: "ui-page-active",

		// Class used for "active" button state, from CSS framework
		activeBtnClass: "ui-btn-active",

		// Class used for "focus" form element state, from CSS framework
		focusClass: "ui-focus",

		// Automatically handle clicks and form submissions through Ajax, when same-domain
		ajaxEnabled: true,

		// Automatically load and show pages based on location.hash
		hashListeningEnabled: true,

		// disable to prevent jquery from bothering with links
		linkBindingEnabled: true,

		// Set default page transition - 'none' for no transitions
		defaultPageTransition: "fade",

		// Set maximum window width for transitions to apply - 'false' for no limit
		maxTransitionWidth: false,

		// Minimum scroll distance that will be remembered when returning to a page
		minScrollBack: 250,

		// DEPRECATED: the following property is no longer in use, but defined until 2.0 to prevent conflicts
		touchOverflowEnabled: false,

		// Set default dialog transition - 'none' for no transitions
		defaultDialogTransition: "pop",

		// Error response message - appears when an Ajax page request fails
		pageLoadErrorMessage: "Error Loading Page",

		// For error messages, which theme does the box uses?
		pageLoadErrorMessageTheme: "e",

		// replace calls to window.history.back with phonegaps navigation helper
		// where it is provided on the window object
		phonegapNavigationEnabled: false,

		//automatically initialize the DOM when it's ready
		autoInitializePage: true,

		pushStateEnabled: true,

		// allows users to opt in to ignoring content by marking a parent element as
		// data-ignored
		ignoreContentEnabled: false,

		// turn of binding to the native orientationchange due to android orientation behavior
		orientationChangeEnabled: true,

		buttonMarkup: {
			hoverDelay: 200
		},

		// define the window and the document objects
		window: $( window ),
		document: $( document ),

		// TODO might be useful upstream in jquery itself ?
		keyCode: {
			ALT: 18,
			BACKSPACE: 8,
			CAPS_LOCK: 20,
			COMMA: 188,
			COMMAND: 91,
			COMMAND_LEFT: 91, // COMMAND
			COMMAND_RIGHT: 93,
			CONTROL: 17,
			DELETE: 46,
			DOWN: 40,
			END: 35,
			ENTER: 13,
			ESCAPE: 27,
			HOME: 36,
			INSERT: 45,
			LEFT: 37,
			MENU: 93, // COMMAND_RIGHT
			NUMPAD_ADD: 107,
			NUMPAD_DECIMAL: 110,
			NUMPAD_DIVIDE: 111,
			NUMPAD_ENTER: 108,
			NUMPAD_MULTIPLY: 106,
			NUMPAD_SUBTRACT: 109,
			PAGE_DOWN: 34,
			PAGE_UP: 33,
			PERIOD: 190,
			RIGHT: 39,
			SHIFT: 16,
			SPACE: 32,
			TAB: 9,
			UP: 38,
			WINDOWS: 91 // COMMAND
		},

		// Place to store various widget extensions
		behaviors: {},

		// Scroll page vertically: scroll to 0 to hide iOS address bar, or pass a Y value
		silentScroll: function( ypos ) {
			// MODIFIED BY SAP: replace deprecated API
			if ( typeof ypos !== "number" ) {
				ypos = $.mobile.defaultHomeScroll;
			}

			// prevent scrollstart and scrollstop events
			$.event.special.scrollstart.enabled = false;

			setTimeout( function() {
				window.scrollTo( 0, ypos );
				$.mobile.document.trigger( "silentscroll", { x: 0, y: ypos });
			}, 20 );

			setTimeout( function() {
				$.event.special.scrollstart.enabled = true;
			}, 150 );
		},

		// Expose our cache for testing purposes.
		nsNormalizeDict: nsNormalizeDict,

		// Take a data attribute property, prepend the namespace
		// and then camel case the attribute string. Add the result
		// to our nsNormalizeDict so we don't have to do this again.
		nsNormalize: function( prop ) {
			if ( !prop ) {
				return;
			}

			return nsNormalizeDict[ prop ] || ( nsNormalizeDict[ prop ] = $.camelCase( $.mobile.ns + prop ) );
		},

		// Find the closest parent with a theme class on it. Note that
		// we are not using $.fn.closest() on purpose here because this
		// method gets called quite a bit and we need it to be as fast
		// as possible.
		getInheritedTheme: function( el, defaultTheme ) {
			var e = el[ 0 ],
				ltr = "",
				re = /ui-(bar|body|overlay)-([a-z])\b/,
				c, m;

			while ( e ) {
				c = e.className || "";
				if ( c && ( m = re.exec( c ) ) && ( ltr = m[ 2 ] ) ) {
					// We found a parent with a theme class
					// on it so bail from this loop.
					break;
				}

				e = e.parentNode;
			}

			// Return the theme letter we found, if none, return the
			// specified default.

			return ltr || defaultTheme || "a";
		},

		// TODO the following $ and $.fn extensions can/probably should be moved into jquery.mobile.core.helpers
		//
		// Find the closest javascript page element to gather settings data jsperf test
		// http://jsperf.com/single-complex-selector-vs-many-complex-selectors/edit
		// possibly naive, but it shows that the parsing overhead for *just* the page selector vs
		// the page and dialog selector is negligable. This could probably be speed up by
		// doing a similar parent node traversal to the one found in the inherited theme code above
		closestPageData: function( $target ) {
			return $target
				.closest( ':jqmData(role="page"), :jqmData(role="dialog")' )
				.data( "mobile-page" );
		},

		enhanceable: function( $set ) {
			return this.haveParents( $set, "enhance" );
		},

		hijackable: function( $set ) {
			return this.haveParents( $set, "ajax" );
		},

		haveParents: function( $set, attr ) {
			if ( !$.mobile.ignoreContentEnabled ) {
				return $set;
			}

			var count = $set.length,
				$newSet = $(),
				e, $element, excluded;

			for ( var i = 0; i < count; i++ ) {
				$element = $set.eq( i );
				excluded = false;
				e = $set[ i ];

				while ( e ) {
					var c = e.getAttribute ? e.getAttribute( "data-" + $.mobile.ns + attr ) : "";

					if ( c === "false" ) {
						excluded = true;
						break;
					}

					e = e.parentNode;
				}

				if ( !excluded ) {
					$newSet = $newSet.add( $element );
				}
			}

			return $newSet;
		},

		getScreenHeight: function() {
			// Native innerHeight returns more accurate value for this across platforms,
			// jQuery version is here as a normalized fallback for platforms like Symbian
			return window.innerHeight || $.mobile.window.height();
		}
	}, $.mobile );

	// Mobile version of data and removeData and hasData methods
	// ensures all data is set and retrieved using jQuery Mobile's data namespace
	$.fn.jqmData = function( prop, value ) {
		var result;
		if ( typeof prop !== "undefined" ) {
			if ( prop ) {
				prop = $.mobile.nsNormalize( prop );
			}

			// undefined is permitted as an explicit input for the second param
			// in this case it returns the value and does not set it to undefined
			if( arguments.length < 2 || value === undefined ){
				result = this.data( prop );
			} else {
				result = this.data( prop, value );
			}
		}
		return result;
	};

	$.jqmData = function( elem, prop, value ) {
		var result;
		if ( typeof prop !== "undefined" ) {
			result = $.data( elem, prop ? $.mobile.nsNormalize( prop ) : prop, value );
		}
		return result;
	};

	$.fn.jqmRemoveData = function( prop ) {
		return this.removeData( $.mobile.nsNormalize( prop ) );
	};

	$.jqmRemoveData = function( elem, prop ) {
		return $.removeData( elem, $.mobile.nsNormalize( prop ) );
	};

	$.fn.removeWithDependents = function() {
		$.removeWithDependents( this );
	};

	$.removeWithDependents = function( elem ) {
		var $elem = $( elem );

		( $elem.jqmData( 'dependents' ) || $() ).remove();
		$elem.remove();
	};

	$.fn.addDependents = function( newDependents ) {
		$.addDependents( $( this ), newDependents );
	};

	$.addDependents = function( elem, newDependents ) {
		var dependents = $( elem ).jqmData( 'dependents' ) || $();

		$( elem ).jqmData( 'dependents', $.merge( dependents, newDependents ) );
	};

	// note that this helper doesn't attempt to handle the callback
	// or setting of an html element's text, its only purpose is
	// to return the html encoded version of the text in all cases. (thus the name)
	$.fn.getEncodedText = function() {
		return $( "<div/>" ).text( $( this ).text() ).html();
	};

	// fluent helper function for the mobile namespaced equivalent
	$.fn.jqmEnhanceable = function() {
		return $.mobile.enhanceable( this );
	};

	$.fn.jqmHijackable = function() {
		return $.mobile.hijackable( this );
	};

	// Monkey-patching Sizzle to filter the :jqmData selector
	var oldFind = $.find,
		jqmDataRE = /:jqmData\(([^)]*)\)/g;

	$.find = function( selector, context, ret, extra ) {
		selector = selector.replace( jqmDataRE, "[data-" + ( $.mobile.ns || "" ) + "$1]" );

		return oldFind.call( this, selector, context, ret, extra );
	};

	$.extend( $.find, oldFind );

	// MODIFIED BY SAP: the following two functions "$.find.matches" and "$.find.matchesSelector" are commented out
	// because they are not compatible with the existing version before overwritten when a focused DIV element is
	// checked by using jQuery(oneDIVElement).is(":focus"). it returns false instead of true. We use the check in
	// sap.ui.core.FocusHandler to store the previous focused control before it gets rerendered. Therefore they are
	// commented out in order to make the restoring of focus after rerendering still work.
	//
	// $.find.matches = function( expr, set ) {
	// 	return $.find( expr, null, null, set );
	// };
	//
	// $.find.matchesSelector = function( node, expr ) {
	// 	return $.find( expr, null, null, [ node ] ).length > 0;
	// };
})( jQuery, this );


(function( $, undefined ) {

	/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas. Dual MIT/BSD license */
	window.matchMedia = window.matchMedia || (function( doc, undefined ) {



		var bool,
			docElem = doc.documentElement,
			refNode = docElem.firstElementChild || docElem.firstChild,
			// fakeBody required for <FF4 when executed in <head>
			fakeBody = doc.createElement( "body" ),
			div = doc.createElement( "div" );

		div.id = "mq-test-1";
		div.style.cssText = "position:absolute;top:-100em";
		fakeBody.style.background = "none";
		fakeBody.appendChild(div);

		return function(q){

			div.innerHTML = "&shy;<style media=\"" + q + "\"> #mq-test-1 { width: 42px; }</style>";

			docElem.insertBefore( fakeBody, refNode );
			bool = div.offsetWidth === 42;
			docElem.removeChild( fakeBody );

			return {
				matches: bool,
				media: q
			};

		};

	}( document ));

	// $.mobile.media uses matchMedia to return a boolean.
	$.mobile.media = function( q ) {
		return window.matchMedia( q ).matches;
	};

})(jQuery);

	(function( $, undefined ) {
		var support = {
			touch: "ontouchend" in document
		};
		// MODIFIED BY SAP
		// => if the device API is loaded we override the touch detection
		// MS Internet Explorer and MS Edge do not fire 'touchstart' and 'touchend' events
		// Therefore $.mobile.support should not be overriden with the actual device screen capability
		if (window.sap && sap.ui && sap.ui.Device && sap.ui.Device.support && !(sap.ui.Device.browser.msie || sap.ui.Device.browser.edge)) {
			support.touch = sap.ui.Device.support.touch
		}

		$.mobile.support = $.mobile.support || {};
		$.extend( $.support, support );
		$.extend( $.mobile.support, support );
	}( jQuery ));

	(function( $, undefined ) {
		$.extend( $.support, {
			orientation: "orientation" in window && "onorientationchange" in window
		});
	}( jQuery ));

(function( $, undefined ) {

// thx Modernizr
function propExists( prop ) {
	var uc_prop = prop.charAt( 0 ).toUpperCase() + prop.substr( 1 ),
		props = ( prop + " " + vendors.join( uc_prop + " " ) + uc_prop ).split( " " );

	for ( var v in props ) {
		if ( fbCSS[ props[ v ] ] !== undefined ) {
			return true;
		}
	}
}

var fakeBody = $( "<body>" ).prependTo( "html" ),
	fbCSS = fakeBody[ 0 ].style,
	vendors = [ "Webkit", "Moz", "O" ],
	webos = "palmGetResource" in window, //only used to rule out scrollTop
	opera = window.opera,
	operamini = window.operamini && ({}).toString.call( window.operamini ) === "[object OperaMini]",
	bb = window.blackberry && !propExists( "-webkit-transform" ); //only used to rule out box shadow, as it's filled opaque on BB 5 and lower


function validStyle( prop, value, check_vend ) {
	var div = document.createElement( 'div' ),
		uc = function( txt ) {
			return txt.charAt( 0 ).toUpperCase() + txt.substr( 1 );
		},
		vend_pref = function( vend ) {
			if( vend === "" ) {
				return "";
			} else {
				return  "-" + vend.charAt( 0 ).toLowerCase() + vend.substr( 1 ) + "-";
			}
		},
		check_style = function( vend ) {
			var vend_prop = vend_pref( vend ) + prop + ": " + value + ";",
				uc_vend = uc( vend ),
				propStyle = uc_vend + ( uc_vend === "" ? prop : uc( prop ) );

			// ##### BEGIN: MODIFIED BY SAP
			// CSP Modification - remove inline style
			// div.setAttribute( "style", vend_prop );
			div.style = vend_prop;
			// ##### END: MODIFIED BY SAP

			if ( !!div.style[ propStyle ] ) {
				ret = true;
			}
		},
		check_vends = check_vend ? check_vend : vendors,
		ret;

	for( var i = 0; i < check_vends.length; i++ ) {
		check_style( check_vends[i] );
	}
	return !!ret;
}

function transform3dTest() {
	var mqProp = "transform-3d",
		// Because the `translate3d` test below throws false positives in Android:
		ret = $.mobile.media( "(-" + vendors.join( "-" + mqProp + "),(-" ) + "-" + mqProp + "),(" + mqProp + ")" );

	if( ret ) {
		return !!ret;
	}

	var el = document.createElement( "div" ),
		transforms = {
			// We’re omitting Opera for the time being; MS uses unprefixed.
			'MozTransform':'-moz-transform',
			'transform':'transform'
		};

	fakeBody.append( el );

	for ( var t in transforms ) {
		if( el.style[ t ] !== undefined ){
			el.style[ t ] = 'translate3d( 100px, 1px, 1px )';
			ret = window.getComputedStyle( el ).getPropertyValue( transforms[ t ] );
		}
	}
	return ( !!ret && ret !== "none" );
}

// ##### MODIFIED BY SAP - Removed base tag support check function, because this function leads to CSP violations in some browsers.

// Thanks Modernizr
function cssPointerEventsTest() {
	var element = document.createElement( 'x' ),
		documentElement = document.documentElement,
		getComputedStyle = window.getComputedStyle,
		// ##### BEGIN: MODIFIED BY SAP
		computed = getComputedStyle && getComputedStyle(element, ''),
		// ##### END: MODIFIED BY SAP
		supports;

	if ( !( 'pointerEvents' in element.style ) ) {
		return false;
	}

	element.style.pointerEvents = 'auto';
	element.style.pointerEvents = 'x';
	documentElement.appendChild( element );
	// ##### BEGIN: MODIFIED BY SAP
	//supports = getComputedStyle &&
	//getComputedStyle( element, '' ).pointerEvents === 'auto';
	supports = computed && computed.pointerEvents === 'auto';
	// ##### END: MODIFIED BY SAP
	documentElement.removeChild( element );
	return !!supports;
}

function boundingRect() {
	var div = document.createElement( "div" );
	return typeof div.getBoundingClientRect !== "undefined";
}

// non-UA-based IE version check by James Padolsey, modified by jdalton - from http://gist.github.com/527683
// allows for inclusion of IE 6+, including Windows Mobile 7
$.extend( $.mobile, { browser: {} } );
$.mobile.browser.oldIE = (function() {
	var v = 3,
		div = document.createElement( "div" ),
		a = div.all || [];

	do {
		div.innerHTML = "<!--[if gt IE " + ( ++v ) + "]><br><![endif]-->";
	} while( a[0] );

	return v > 4 ? v : !v;
})();

function fixedPosition() {
	var w = window,
		ua = navigator.userAgent,
		platform = navigator.platform,
		// Rendering engine is Webkit, and capture major version
		wkmatch = ua.match( /AppleWebKit\/([0-9]+)/ ),
		wkversion = !!wkmatch && wkmatch[ 1 ],
		ffmatch = ua.match( /Fennec\/([0-9]+)/ ),
		ffversion = !!ffmatch && ffmatch[ 1 ],
		operammobilematch = ua.match( /Opera Mobi\/([0-9]+)/ ),
		omversion = !!operammobilematch && operammobilematch[ 1 ];

	if(
		// iOS 4.3 and older : Platform is iPhone/Pad/Touch and Webkit version is less than 534 (ios5)
		( ( platform.indexOf( "iPhone" ) > -1 || platform.indexOf( "iPad" ) > -1  || platform.indexOf( "iPod" ) > -1 ) && wkversion && wkversion < 534 ) ||
		// Opera Mini
		( w.operamini && ({}).toString.call( w.operamini ) === "[object OperaMini]" ) ||
		( operammobilematch && omversion < 7458 )	||
		//Android lte 2.1: Platform is Android and Webkit version is less than 533 (Android 2.2)
		( ua.indexOf( "Android" ) > -1 && wkversion && wkversion < 533 ) ||
		// Firefox Mobile before 6.0 -
		( ffversion && ffversion < 6 ) ||
		// WebOS less than 3
		( "palmGetResource" in window && wkversion && wkversion < 534 )	||
		// MeeGo
		( ua.indexOf( "MeeGo" ) > -1 && ua.indexOf( "NokiaBrowser/8.5.0" ) > -1 ) ) {
		return false;
	}

	return true;
}

$.extend( $.support, {
	cssTransitions: "WebKitTransitionEvent" in window ||
		validStyle( 'transition', 'height 100ms linear', [ "Webkit", "Moz", "" ] ) &&
		!$.mobile.browser.oldIE && !opera,

	// Note, Chrome for iOS has an extremely quirky implementation of popstate.
	// We've chosen to take the shortest path to a bug fix here for issue #5426
	// See the following link for information about the regex chosen
	// https://developers.google.com/chrome/mobile/docs/user-agent#chrome_for_ios_user-agent
	pushState: "pushState" in history &&
		"replaceState" in history &&
		// When running inside a FF iframe, calling replaceState causes an error
		!( window.navigator.userAgent.indexOf( "Firefox" ) >= 0 && window.top !== window ) &&
		( window.navigator.userAgent.search(/CriOS/) === -1 ),

	mediaquery: $.mobile.media( "only all" ),
	cssPseudoElement: !!propExists( "content" ),
	touchOverflow: !!propExists( "overflowScrolling" ),
	cssTransform3d: transform3dTest(),
	boxShadow: !!propExists( "boxShadow" ) && !bb,
	fixedPosition: fixedPosition(),
	scrollTop: ("pageXOffset" in window ||
		"scrollTop" in document.documentElement ||
		"scrollTop" in fakeBody[ 0 ]) && !webos && !operamini,

	dynamicBaseTag: true, // ##### MODIFIED BY SAP - Removed base tag support check function, because this function leads to CSP violations in some browsers.
	cssPointerEvents: cssPointerEventsTest(),
	boundingRect: boundingRect()
});

fakeBody.remove();


// $.mobile.ajaxBlacklist is used to override ajaxEnabled on platforms that have known conflicts with hash history updates (BB5, Symbian)
// or that generally work better browsing in regular http for full page refreshes (Opera Mini)
// Note: This detection below is used as a last resort.
// We recommend only using these detection methods when all other more reliable/forward-looking approaches are not possible
var nokiaLTE7_3 = (function() {

	var ua = window.navigator.userAgent;

	//The following is an attempt to match Nokia browsers that are running Symbian/s60, with webkit, version 7.3 or older
	return ua.indexOf( "Nokia" ) > -1 &&
			( ua.indexOf( "Symbian/3" ) > -1 || ua.indexOf( "Series60/5" ) > -1 ) &&
			ua.indexOf( "AppleWebKit" ) > -1 &&
			ua.match( /(BrowserNG|NokiaBrowser)\/7\.[0-3]/ );
})();

// Support conditions that must be met in order to proceed
// default enhanced qualifications are media query support OR IE 7+

$.mobile.gradeA = function() {
	return ( $.support.mediaquery || $.mobile.browser.oldIE && $.mobile.browser.oldIE >= 7 ) && ( $.support.boundingRect || $.fn.jquery.match(/1\.[0-7+]\.[0-9+]?/) !== null );
};

$.mobile.ajaxBlacklist =
			// BlackBerry browsers, pre-webkit
			window.blackberry && !window.WebKitPoint ||
			// Opera Mini
			operamini ||
			// Symbian webkits pre 7.3
			nokiaLTE7_3;

// Lastly, this workaround is the only way we've found so far to get pre 7.3 Symbian webkit devices
// to render the stylesheets when they're referenced before this script, as we'd recommend doing.
// This simply reappends the CSS in place, which for some reason makes it apply
if ( nokiaLTE7_3 ) {
	$(function() {
		$( "head link[rel='stylesheet']" ).attr( "rel", "alternate stylesheet" ).attr( "rel", "stylesheet" );
	});
}

// For ruling out shadows via css
if ( !$.support.boxShadow ) {
	$( "html" ).addClass( "ui-mobile-nosupport-boxshadow" );
}

})( jQuery );


(function( $, undefined ) {
	var $win = $.mobile.window, self, history;

	$.event.special.navigate = self = {
		bound: false,

		pushStateEnabled: true,

		originalEventName: undefined,

		// If pushstate support is present and push state support is defined to
		// be true on the mobile namespace.
		isPushStateEnabled: function() {
			return $.support.pushState &&
				$.mobile.pushStateEnabled === true &&
				this.isHashChangeEnabled();
		},

		// !! assumes mobile namespace is present
		isHashChangeEnabled: function() {
			return $.mobile.hashListeningEnabled === true;
		},

		// TODO a lot of duplication between popstate and hashchange
		popstate: function( event ) {
			var newEvent = new $.Event( "navigate" ),
				beforeNavigate = new $.Event( "beforenavigate" ),
				state = event.originalEvent.state || {},
				href = location.href;

			$win.trigger( beforeNavigate );

			if( beforeNavigate.isDefaultPrevented() ){
				return;
			}

			if( event.historyState ){
				$.extend(state, event.historyState);
			}

			// Make sure the original event is tracked for the end
			// user to inspect incase they want to do something special
			newEvent.originalEvent = event;

			// NOTE we let the current stack unwind because any assignment to
			//      location.hash will stop the world and run this event handler. By
			//      doing this we create a similar behavior to hashchange on hash
			//      assignment
			setTimeout(function() {
				$win.trigger( newEvent, {
					state: state
				});
			}, 0);
		},

		hashchange: function( event, data ) {
			var newEvent = new $.Event( "navigate" ),
				beforeNavigate = new $.Event( "beforenavigate" );

			$win.trigger( beforeNavigate );

			if( beforeNavigate.isDefaultPrevented() ){
				return;
			}

			// Make sure the original event is tracked for the end
			// user to inspect incase they want to do something special
			newEvent.originalEvent = event;

			// Trigger the hashchange with state provided by the user
			// that altered the hash
			$win.trigger( newEvent, {
				// Users that want to fully normalize the two events
				// will need to do history management down the stack and
				// add the state to the event before this binding is fired
				// TODO consider allowing for the explicit addition of callbacks
				//      to be fired before this value is set to avoid event timing issues
				state: event.hashchangeState || {}
			});
		},

		// TODO We really only want to set this up once
		//      but I'm not clear if there's a beter way to achieve
		//      this with the jQuery special event structure
		setup: function( data, namespaces ) {
			if( self.bound ) {
				return;
			}

			self.bound = true;

			if( self.isPushStateEnabled() ) {
				self.originalEventName = "popstate";
				// MODIFIED BY SAP: replace deprecated API .bind -> .on
				$win.on( "popstate.navigate", self.popstate );
			} else if ( self.isHashChangeEnabled() ){
				self.originalEventName = "hashchange";
				// MODIFIED BY SAP: replace deprecated API .bind -> .on
				$win.on( "hashchange.navigate", self.hashchange );
			}
		}
	};
})( jQuery );



	// throttled resize event
	(function( $ ) {
		$.event.special.throttledresize = {
			setup: function() {
				// MODIFIED BY SAP: replace deprecated API .bind -> .on
				$( this ).on( "resize", handler );
			},
			teardown: function() {
				// MODIFIED BY SAP: replace deprecated API .unbind -> .off
				$( this ).off( "resize", handler );
			}
		};

		var throttle = 250,
			handler = function() {
				curr = ( new Date() ).getTime();
				diff = curr - lastCall;

				if ( diff >= throttle ) {

					lastCall = curr;
					$( this ).trigger( "throttledresize" );

				} else {

					if ( heldCall ) {
						clearTimeout( heldCall );
					}

					// Promise a held call will still execute
					heldCall = setTimeout( handler, throttle - diff );
				}
			},
			lastCall = 0,
			heldCall,
			curr,
			diff;
	})( jQuery );

(function( $, window ) {
	var win = $( window ),
		event_name = "orientationchange",
		special_event,
		get_orientation,
		last_orientation,
		initial_orientation_is_landscape,
		initial_orientation_is_default,
		portrait_map = { "0": true, "180": true };

	// It seems that some device/browser vendors use window.orientation values 0 and 180 to
	// denote the "default" orientation. For iOS devices, and most other smart-phones tested,
	// the default orientation is always "portrait", but in some Android and RIM based tablets,
	// the default orientation is "landscape". The following code attempts to use the window
	// dimensions to figure out what the current orientation is, and then makes adjustments
	// to the to the portrait_map if necessary, so that we can properly decode the
	// window.orientation value whenever get_orientation() is called.
	//
	// Note that we used to use a media query to figure out what the orientation the browser
	// thinks it is in:
	//
	//     initial_orientation_is_landscape = $.mobile.media("all and (orientation: landscape)");
	//
	// but there was an iPhone/iPod Touch bug beginning with iOS 4.2, up through iOS 5.1,
	// where the browser *ALWAYS* applied the landscape media query. This bug does not
	// happen on iPad.

	if ( $.support.orientation ) {

		// Check the window width and height to figure out what the current orientation
		// of the device is at this moment. Note that we've initialized the portrait map
		// values to 0 and 180, *AND* we purposely check for landscape so that if we guess
		// wrong, , we default to the assumption that portrait is the default orientation.
		// We use a threshold check below because on some platforms like iOS, the iPhone
		// form-factor can report a larger width than height if the user turns on the
		// developer console. The actual threshold value is somewhat arbitrary, we just
		// need to make sure it is large enough to exclude the developer console case.

		var ww = window.innerWidth || win.width(),
			wh = window.innerHeight || win.height(),
			landscape_threshold = 50;

		initial_orientation_is_landscape = ww > wh && ( ww - wh ) > landscape_threshold;


		// Now check to see if the current window.orientation is 0 or 180.
		initial_orientation_is_default = portrait_map[ window.orientation ];

		// If the initial orientation is landscape, but window.orientation reports 0 or 180, *OR*
		// if the initial orientation is portrait, but window.orientation reports 90 or -90, we
		// need to flip our portrait_map values because landscape is the default orientation for
		// this device/browser.
		if ( ( initial_orientation_is_landscape && initial_orientation_is_default ) || ( !initial_orientation_is_landscape && !initial_orientation_is_default ) ) {
			portrait_map = { "-90": true, "90": true };
		}
	}

	$.event.special.orientationchange = $.extend( {}, $.event.special.orientationchange, {
		setup: function() {
			// If the event is supported natively, return false so that jQuery
			// will bind to the event using DOM methods.
			if ( $.support.orientation && !$.event.special.orientationchange.disabled ) {
				return false;
			}

			// Get the current orientation to avoid initial double-triggering.
			last_orientation = get_orientation();

			// Because the orientationchange event doesn't exist, simulate the
			// event by testing window dimensions on resize.
			// MODIFIED BY SAP: replace deprecated API .bind -> .on
			win.on( "throttledresize", handler );
		},
		teardown: function() {
			// If the event is not supported natively, return false so that
			// jQuery will unbind the event using DOM methods.
			if ( $.support.orientation && !$.event.special.orientationchange.disabled ) {
				return false;
			}

			// Because the orientationchange event doesn't exist, unbind the
			// resize event handler.
			// MODIFIED BY SAP: replace deprecated API .unbind -> .off
			win.off( "throttledresize", handler );
		},
		add: function( handleObj ) {
			// Save a reference to the bound event handler.
			var old_handler = handleObj.handler;


			handleObj.handler = function( event ) {
				// Modify event object, adding the .orientation property.
				event.orientation = get_orientation();

				// Call the originally-bound event handler and return its result.
				return old_handler.apply( this, arguments );
			};
		}
	});

	// If the event is not supported natively, this handler will be bound to
	// the window resize event to simulate the orientationchange event.
	function handler() {
		// Get the current orientation.
		var orientation = get_orientation();

		if ( orientation !== last_orientation ) {
			// The orientation has changed, so trigger the orientationchange event.
			last_orientation = orientation;
			win.trigger( event_name );
		}
	}

	// Get the current page orientation. This method is exposed publicly, should it
	// be needed, as jQuery.event.special.orientationchange.orientation()
	$.event.special.orientationchange.orientation = get_orientation = function() {
		var isPortrait = true, elem = document.documentElement;

		// prefer window orientation to the calculation based on screensize as
		// the actual screen resize takes place before or after the orientation change event
		// has been fired depending on implementation (eg android 2.3 is before, iphone after).
		// More testing is required to determine if a more reliable method of determining the new screensize
		// is possible when orientationchange is fired. (eg, use media queries + element + opacity)
		if ( $.support.orientation ) {
			// if the window orientation registers as 0 or 180 degrees report
			// portrait, otherwise landscape
			isPortrait = portrait_map[ window.orientation ];
		} else {
			isPortrait = elem && elem.clientWidth / elem.clientHeight < 1.1;
		}

		return isPortrait ? "portrait" : "landscape";
	};

	$.fn[ event_name ] = function( fn ) {
		// MODIFIED BY SAP: replace deprecated API .bind -> .on
		return fn ? this.on( event_name, fn ) : this.trigger( event_name );
	};

	// jQuery < 1.8
	if ( $.attrFn ) {
		$.attrFn[ event_name ] = true;
	}

}( jQuery, this ));


// This plugin is an experiment for abstracting away the touch and mouse
// events so that developers don't have to worry about which method of input
// the device their document is loaded on supports.
//
// The idea here is to allow the developer to register listeners for the
// basic mouse events, such as mousedown, mousemove, mouseup, and click,
// and the plugin will take care of registering the correct listeners
// behind the scenes to invoke the listener at the fastest possible time
// for that device, while still retaining the order of event firing in
// the traditional mouse environment, should multiple handlers be registered
// on the same element for different events.
//
// The current version exposes the following virtual events to jQuery bind methods:
// "vmouseover vmousedown vmousemove vmouseup vclick vmouseout vmousecancel"

(function( $, window, document, undefined ) {

var dataPropertyName = "virtualMouseBindings",
	touchTargetPropertyName = "virtualTouchID",
	virtualEventNames = "vmouseover vmousedown vmousemove vmouseup vclick vmouseout vmousecancel".split( " " ),
	touchEventProps = "clientX clientY pageX pageY screenX screenY".split( " " ),
	mouseHookProps = $.event.mouseHooks ? $.event.mouseHooks.props : [],
	// ##### BEGIN: MODIFIED BY SAP
	// Replace the usage of $.event.props because it's removed since jQuery version 3.x.x
	// Code is partically taken from jquery.mobile/js/vmouse.js version 1.4.5
	generalProps = ( "altKey bubbles cancelable ctrlKey currentTarget detail eventPhase " +
		"metaKey relatedTarget shiftKey target timeStamp view which" ).split( " " ),
	mouseEventProps = generalProps.concat( mouseHookProps ),
	// ##### END: MODIFIED BY SAP
	activeDocHandlers = {},
	resetTimerID = 0,
	startX = 0,
	startY = 0,
	didScroll = false,
	clickBlockList = [],
	blockMouseTriggers = false,
	blockTouchTriggers = false,
	eventCaptureSupported = "addEventListener" in document,
	$document = $( document ),
	nextTouchID = 1,
	lastTouchID = 0, threshold;

$.vmouse = {
	moveDistanceThreshold: 10,
	clickDistanceThreshold: 10,
	resetTimerDuration: 1500
};

function getNativeEvent( event ) {

	while ( event && typeof event.originalEvent !== "undefined" ) {
		event = event.originalEvent;
	}
	return event;
}

function createVirtualEvent( event, eventType ) {

	var t = event.type,
		oe, props, ne, prop, ct, touch, i, j, len;

	event = $.Event( event );
	event.type = eventType;

	oe = event.originalEvent;
	// ##### BEGIN: MODIFIED BY SAP
	// Replace the usage of $.event.props because it's removed since jQuery version 3.x.x
	// Code is partically taken from jquery.mobile/js/vmouse.js version 1.4.5
	props = generalProps;
	// ##### END: MODIFIED BY SAP

	// addresses separation of $.event.props in to $.event.mouseHook.props and Issue 3280
	// https://github.com/jquery/jquery-mobile/issues/3280
	if ( t.search( /^(mouse|click)/ ) > -1 ) {
		props = mouseEventProps;
	}

	// copy original event properties over to the new event
	// this would happen if we could call $.event.fix instead of $.Event
	// but we don't have a way to force an event to be fixed multiple times
	if ( oe ) {
		for ( i = props.length, prop; i; ) {
			prop = props[ --i ];
			event[ prop ] = oe[ prop ];
		}
	}

	// make sure that if the mouse and click virtual events are generated
	// without a .which one is defined
	if ( t.search(/mouse(down|up)|click/) > -1 && !event.which ) {
		event.which = 1;
	}

	if ( t.search(/^touch/) !== -1 ) {
		ne = getNativeEvent( oe );
		t = ne.touches;
		ct = ne.changedTouches;
		touch = ( t && t.length ) ? t[0] : ( ( ct && ct.length ) ? ct[ 0 ] : undefined );

		if ( touch ) {
			for ( j = 0, len = touchEventProps.length; j < len; j++) {
				prop = touchEventProps[ j ];
				event[ prop ] = touch[ prop ];
			}
		}
	}

	return event;
}

function getVirtualBindingFlags( element ) {

	var flags = {},
		b, k;

	while ( element ) {

		b = $.data( element, dataPropertyName );

		for (  k in b ) {
			if ( b[ k ] ) {
				flags[ k ] = flags.hasVirtualBinding = true;
			}
		}
		element = element.parentNode;
	}
	return flags;
}

function getClosestElementWithVirtualBinding( element, eventType ) {
	var b;
	while ( element ) {

		b = $.data( element, dataPropertyName );

		if ( b && ( !eventType || b[ eventType ] ) ) {
			return element;
		}
		element = element.parentNode;
	}
	return null;
}

function enableTouchBindings() {
	blockTouchTriggers = false;
}

function disableTouchBindings() {
	blockTouchTriggers = true;
}

function enableMouseBindings() {
	lastTouchID = 0;
	clickBlockList.length = 0;
	blockMouseTriggers = false;

	// When mouse bindings are enabled, our
	// touch bindings are disabled.
	disableTouchBindings();
}

function disableMouseBindings() {
	// When mouse bindings are disabled, our
	// touch bindings are enabled.
	enableTouchBindings();
}

function startResetTimer() {
	clearResetTimer();
	resetTimerID = setTimeout( function() {
		resetTimerID = 0;
		enableMouseBindings();
	}, $.vmouse.resetTimerDuration );
}

function clearResetTimer() {
	if ( resetTimerID ) {
		clearTimeout( resetTimerID );
		resetTimerID = 0;
	}
}

function triggerVirtualEvent( eventType, event, flags ) {
	var ve;

	if ( ( flags && flags[ eventType ] ) ||
				( !flags && getClosestElementWithVirtualBinding( event.target, eventType ) ) ) {

		ve = createVirtualEvent( event, eventType );

		$( event.target).trigger( ve );
	}

	return ve;
}

function mouseEventCallback( event ) {
	var touchID = $.data( event.target, touchTargetPropertyName );

	if ( !blockMouseTriggers && ( !lastTouchID || lastTouchID !== touchID ) ){
		var ve = triggerVirtualEvent( "v" + event.type, event );
		if ( ve ) {
			if ( ve.isDefaultPrevented() ) {
				event.preventDefault();
			}
			if ( ve.isPropagationStopped() ) {
				event.stopPropagation();
			}
			if ( ve.isImmediatePropagationStopped() ) {
				event.stopImmediatePropagation();
			}
		}
	}
}

function handleTouchStart( event ) {

	var touches = getNativeEvent( event ).touches,
		target, flags;

	if ( touches && touches.length === 1 ) {

		target = event.target;
		flags = getVirtualBindingFlags( target );

		if ( flags.hasVirtualBinding ) {

			lastTouchID = nextTouchID++;
			$.data( target, touchTargetPropertyName, lastTouchID );

			clearResetTimer();

			disableMouseBindings();
			didScroll = false;

			var t = getNativeEvent( event ).touches[ 0 ];
			startX = t.pageX;
			startY = t.pageY;

			triggerVirtualEvent( "vmouseover", event, flags );
			triggerVirtualEvent( "vmousedown", event, flags );
		}
	}
}

function handleScroll( event ) {
	if ( blockTouchTriggers ) {
		return;
	}

	if ( !didScroll ) {
		triggerVirtualEvent( "vmousecancel", event, getVirtualBindingFlags( event.target ) );
	}

	didScroll = true;
	startResetTimer();
}

function handleTouchMove( event ) {
	if ( blockTouchTriggers ) {
		return;
	}

	var t = getNativeEvent( event ).touches[ 0 ],
		didCancel = didScroll,
		moveThreshold = $.vmouse.moveDistanceThreshold,
		flags = getVirtualBindingFlags( event.target );

		didScroll = didScroll ||
			( Math.abs( t.pageX - startX ) > moveThreshold ||
				Math.abs( t.pageY - startY ) > moveThreshold );


	if ( didScroll && !didCancel ) {
		triggerVirtualEvent( "vmousecancel", event, flags );
	}

	triggerVirtualEvent( "vmousemove", event, flags );
	startResetTimer();
}

function handleTouchEnd( event ) {
	if ( blockTouchTriggers ) {
		return;
	}

	disableTouchBindings();

	var flags = getVirtualBindingFlags( event.target ),
		t;
	triggerVirtualEvent( "vmouseup", event, flags );

	if ( !didScroll ) {
		// MODIFIED BY SAP
		// The ve variable is removed because the next if expression is changed
		triggerVirtualEvent( "vclick", event, flags );

		// MODIFIED BY SAP
		// The next line was written as: if (ve && ve.isDefaultPrevented) originally from jQuery mobile
		// We have done following changes to this line.
		//
		// 1. ve.isDefaultPrevented() replaced by $.support.touch: because calling prevent default breaks
		// some native features from the browser, for example:
		// 		On screen keyboard can't be opened on touch enabled device
		//		Focused input can't get blurred by tapping outside the input
		// Therefore we make the code within the if executed on mobile device where delayed mouse events
		// are fired.
		//
		// 2. "ve" is removed: because when event.target is detached from DOM tree, "ve" is undefined and
		// the following logic isn't executed on mobile device. If a DOM node is removed by listening to
		// "touchend" or "tap" event, the click event is still dispatched to the DOM element which appears
		// at the same position after the DOM deletion. For example, pressing the delete button in one
		// ListItem deletes two list items at the end. Therefore we need to activate the code no matter if
		// the event.target is currently detached from the DOM tree or not.
		if ($.support.touch) {
			// The target of the mouse events that follow the touchend
			// event don't necessarily match the target used during the
			// touch. This means we need to rely on coordinates for blocking
			// any click that is generated.
			t = getNativeEvent( event ).changedTouches[ 0 ];
			clickBlockList.push({
				touchID: lastTouchID,
				x: t.clientX,
				// MODIFIED BY SAP
				// On mobile device, the entire UI may be shifted up after the on screen keyboard
				// is open. The Y-axis value may be different between the touch event and the delayed
				// mouse event. Therefore it's needed to take the window.scrollY which represents how
				// far the window is shifted up into the calculation of y-axis value to make sure that
				// the delayed mouse event can be correctly marked.
				y: t.clientY + window.scrollY,
				// MODIFIED BY SAP
				// the touchend event target is needed by suppressing mousedown, mouseup, click event
				target: event.target
			});

			// Prevent any mouse events that follow from triggering
			// virtual event notifications.
			blockMouseTriggers = true;
		}
	}
	triggerVirtualEvent( "vmouseout", event, flags);
	didScroll = false;

	startResetTimer();
}

function hasVirtualBindings( ele ) {
	var bindings = $.data( ele, dataPropertyName ),
		k;

	if ( bindings ) {
		for ( k in bindings ) {
			if ( bindings[ k ] ) {
				return true;
			}
		}
	}
	return false;
}

function dummyMouseHandler() {}

function getSpecialEventObject( eventType ) {
	var realType = eventType.substr( 1 );

	return {
		setup: function( data, namespace ) {
			// If this is the first virtual mouse binding for this element,
			// add a bindings object to its data.

			if ( !hasVirtualBindings( this ) ) {
				$.data( this, dataPropertyName, {} );
			}

			// If setup is called, we know it is the first binding for this
			// eventType, so initialize the count for the eventType to zero.
			var bindings = $.data( this, dataPropertyName );
			bindings[ eventType ] = true;

			// If this is the first virtual mouse event for this type,
			// register a global handler on the document.

			activeDocHandlers[ eventType ] = ( activeDocHandlers[ eventType ] || 0 ) + 1;

			if ( activeDocHandlers[ eventType ] === 1 ) {
				// MODIFIED BY SAP: replace deprecated API .bind -> .on
				$document.on( realType, mouseEventCallback );
			}

			// Some browsers, like Opera Mini, won't dispatch mouse/click events
			// for elements unless they actually have handlers registered on them.
			// To get around this, we register dummy handlers on the elements.

			// MODIFIED BY SAP: replace deprecated API .bind -> .on
			$( this ).on( realType, dummyMouseHandler );

			// For now, if event capture is not supported, we rely on mouse handlers.
			if ( eventCaptureSupported ) {
				// If this is the first virtual mouse binding for the document,
				// register our touchstart handler on the document.

				activeDocHandlers[ "touchstart" ] = ( activeDocHandlers[ "touchstart" ] || 0) + 1;

				if ( activeDocHandlers[ "touchstart" ] === 1 ) {
					// MODIFIED BY SAP: replace deprecated API .bind -> .on
					$document.on( "touchstart", handleTouchStart )
						.on( "touchend", handleTouchEnd )

						// On touch platforms, touching the screen and then dragging your finger
						// causes the window content to scroll after some distance threshold is
						// exceeded. On these platforms, a scroll prevents a click event from being
						// dispatched, and on some platforms, even the touchend is suppressed. To
						// mimic the suppression of the click event, we need to watch for a scroll
						// event. Unfortunately, some platforms like iOS don't dispatch scroll
						// events until *AFTER* the user lifts their finger (touchend). This means
						// we need to watch both scroll and touchmove events to figure out whether
						// or not a scroll happenens before the touchend event is fired.

						// MODIFIED BY SAP: replace deprecated API .bind -> .on
						.on( "touchmove", handleTouchMove );
					//TODO: investigate and find out why tapping on listitem triggers a scroll event
					// which prevents the tap event from being fired.
					// MODIFIED BY SAP: replace deprecated API .bind -> .on
//						.on( "scroll", handleScroll );
				}
			}
		},

		teardown: function( data, namespace ) {
			// If this is the last virtual binding for this eventType,
			// remove its global handler from the document.

			--activeDocHandlers[ eventType ];

			if ( !activeDocHandlers[ eventType ] ) {
				// MODIFIED BY SAP: replace deprecated API .unbind -> .off
				$document.off( realType, mouseEventCallback );
			}

			if ( eventCaptureSupported ) {
				// If this is the last virtual mouse binding in existence,
				// remove our document touchstart listener.

				--activeDocHandlers[ "touchstart" ];

				if ( !activeDocHandlers[ "touchstart" ] ) {
					// MODIFIED BY SAP: replace deprecated API .unbind -> .off
					$document.off( "touchstart", handleTouchStart )
						.off( "touchmove", handleTouchMove )
						.off( "touchend", handleTouchEnd )
						.off( "scroll", handleScroll );
				}
			}

			var $this = $( this ),
				bindings = $.data( this, dataPropertyName );

			// teardown may be called when an element was
			// removed from the DOM. If this is the case,
			// jQuery core may have already stripped the element
			// of any data bindings so we need to check it before
			// using it.
			if ( bindings ) {
				bindings[ eventType ] = false;
			}

			// Unregister the dummy event handler.

			// MODIFIED BY SAP: replace deprecated API .unbind -> .off
			$this.off( realType, dummyMouseHandler );

			// If this is the last virtual mouse binding on the
			// element, remove the binding data from the element.

			if ( !hasVirtualBindings( this ) ) {
				$this.removeData( dataPropertyName );
			}
		}
	};
}

// Expose our custom events to the jQuery bind/unbind mechanism.

for ( var i = 0; i < virtualEventNames.length; i++ ) {
	$.event.special[ virtualEventNames[ i ] ] = getSpecialEventObject( virtualEventNames[ i ] );
}

// Add a capture click handler to block clicks.
// Note that we require event capture support for this so if the device
// doesn't support it, we punt for now and rely solely on mouse events.
if ( eventCaptureSupported ) {
	function suppressEvent ( e ) {
		var cnt = clickBlockList.length,
			target = e.target,
			x, y, ele, i, o, touchID;

		if ( cnt ) {
			x = e.clientX;
			// MODIFIED BY SAP
			// On mobile device, the entire UI may be shifted up after the on screen keyboard
			// is open. The Y-axis value may be different between the touch event and the delayed
			// mouse event. Therefore it's needed to take the window.scrollY which represents how
			// far the window is shifted up into the calculation of y-axis value to make sure that
			// the delayed mouse event can be correctly marked.
			y = e.clientY + window.scrollY;
			threshold = $.vmouse.clickDistanceThreshold;

			// The idea here is to run through the clickBlockList to see if
			// the current click event is in the proximity of one of our
			// vclick events that had preventDefault() called on it. If we find
			// one, then we block the click.
			//
			// Why do we have to rely on proximity?
			//
			// Because the target of the touch event that triggered the vclick
			// can be different from the target of the click event synthesized
			// by the browser. The target of a mouse/click event that is syntehsized
			// from a touch event seems to be implementation specific. For example,
			// some browsers will fire mouse/click events for a link that is near
			// a touch event, even though the target of the touchstart/touchend event
			// says the user touched outside the link. Also, it seems that with most
			// browsers, the target of the mouse/click event is not calculated until the
			// time it is dispatched, so if you replace an element that you touched
			// with another element, the target of the mouse/click will be the new
			// element underneath that point.
			//
			// Aside from proximity, we also check to see if the target and any
			// of its ancestors were the ones that blocked a click. This is necessary
			// because of the strange mouse/click target calculation done in the
			// Android 2.1 browser, where if you click on an element, and there is a
			// mouse/click handler on one of its ancestors, the target will be the
			// innermost child of the touched element, even if that child is no where
			// near the point of touch.

			ele = target;

			while ( ele ) {
				for ( i = 0; i < cnt; i++ ) {
					o = clickBlockList[ i ];
					touchID = 0;

					if ( ( ele === target && Math.abs( o.x - x ) < threshold && Math.abs( o.y - y ) < threshold ) ||
								$.data( ele, touchTargetPropertyName ) === o.touchID ) {
						// XXX: We may want to consider removing matches from the block list
						//      instead of waiting for the reset timer to fire.

						// MODIFIED BY SAP
						// The simulated mouse events from mobile browser which are fired with 300ms delay are marked here.
						//
						// Those marked events can be suppressed in event handler to avoid handling the semantic identical
						// events twice (like touchstart and mousedown).
						//
						// One exception is made for event marked with isSynthetic which is fired from the event simulation
						if ( !e.isSynthetic ) {
							e._sapui_delayedMouseEvent = true;
						}

						// MODIFIED BY SAP
						// The event is suppressed only when its target is different than the touchend event's target.
						// This ensures that only the unnecessary events are suppressed.
						if ( target !== o.target ) {
							e.preventDefault();
							e.stopPropagation();
						}

						// MODIFIED BY SAP
						// Clear the block list after processing the click event
						// When an 'input[type=checkbox]' is placed within a 'label' tag, the browser fires 2 click
						// events, one on the 'label' element and the other on the 'input' element. The block list
						// should be cleared after processing the first click event to allow the second click event to
						// come through.
						if ( e.type === "click" ) {
							clickBlockList.length = 0;
						}

						return;
					}
				}
				ele = ele.parentNode;
			}
		}
	}

	// MODIFIED BY SAP
	// In the original version, only the click event is suppressed.
	// But this can't solve the issue that on screen keyboard is opened
	// when clicking on the current page switches to an input DOM element
	// on the same position. This keyboard opening is caused by mousedown
	// and mouseup event which have delay reach on the underneath input.
	// Thus the mousedown and mouseup events should also be suppressed.
	//
	// Moreover, mobile browsers, such as mobile Safari fires mouseover
	// event with delay as well. This event may also be dispatched wrongly
	// to the underneath element when the top element is removed in one of
	// the touch* event handler.
	//
	// The mousedown, mouseup, mouseover and click events are suppressed
	// only when their coordinate is proximately the same as the coordinate
	// of recorded touch events and the mouse event's target is different
	// than the target of the touch event.
	document.addEventListener( "mousedown", suppressEvent, true );
	document.addEventListener( "mouseup", suppressEvent, true );
	document.addEventListener( "mouseover", suppressEvent, true );
	document.addEventListener( "click", suppressEvent, true );
}
})( jQuery, window, document );


(function( $, window, undefined ) {
	var $document = $( document );

	// add new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"tap taphold " +
		"swipe swipeleft swiperight " +
		"scrollstart scrollstop" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			// MODIFIED BY SAP: replace deprecated API .bind -> .on
			return fn ? this.on( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	var supportTouch = $.mobile.support.touch,
		scrollEvent = "touchmove scroll",
		touchStartEvent = supportTouch ? "touchstart" : "mousedown",
		// MODIFIED BY SAP
		// touchcancel has to be used because touchcancel is fired under some condition instead of
		// touchend when runs on Windows 8 device.
		//
		// dragstart is added because "mouseup" event isn't fired anymore once dragstart is fired
		touchStopEvent = supportTouch ? "touchend touchcancel" : "mouseup dragstart",
		touchMoveEvent = supportTouch ? "touchmove" : "mousemove";

	function triggerCustomEvent( obj, eventType, event ) {
		var originalType = event.type;
		event.type = eventType;
		$.event.dispatch.call( obj, event );
		event.type = originalType;
	}

	// also handles scrollstop
	$.event.special.scrollstart = {

		enabled: true,

		setup: function() {

			var thisObject = this,
				$this = $( thisObject ),
				scrolling,
				timer;

			function trigger( event, state ) {
				scrolling = state;
				triggerCustomEvent( thisObject, scrolling ? "scrollstart" : "scrollstop", event );
			}

			// iPhone triggers scroll after a small delay; use touchmove instead
			// MODIFIED BY SAP: replace deprecated API .bind -> .on
			$this.on( scrollEvent, function( event ) {

				if ( !$.event.special.scrollstart.enabled ) {
					return;
				}

				if ( !scrolling ) {
					trigger( event, true );
				}

				clearTimeout( timer );
				timer = setTimeout( function() {
					trigger( event, false );
				}, 50 );
			});
		}
	};

	// also handles taphold
	$.event.special.tap = {
		tapholdThreshold: 750,

		setup: function() {
			var thisObject = this,
				$this = $( thisObject ),
				// MODIFIED BY SAP: the variable declarations are moved out of the "mousedown" event handler because
				// the handlers where the variables are used are moved out
				mouseDownTarget,
				mouseDownEvent,
				timer;

			// MODIFIED BY SAP: Workaround for an Edge browser issue which occurs with EdgeHTML 14 and higher.
			// The root cause are inconsistent event targets of fired events, when a button is tapped.

			/**
			 * Detects whether edge browser special tap handling is necessary.
			 *
			 * Inconsistent event targets for the sap.m.Button control:
			 * EdgeHTML v.| 14 | 15 | 16 | 17 |
			 * ----------------------------------
			 * mousedown  |   S|   S|   B|   S|
			 * mouseup    |   B|   B|   B|   B|
			 * click      |   S| S/B|   S| S/B|
			 * ----------------------------------
			 * S = SPAN, B = BUTTON
			 *
			 * @param {object} event either mouseup or click event.
			 * @returns {boolean} Returns true, when a button was pressed in edge browser with inconsistent event targets.
			 */
			function buttonTappedInEdgeBrowser( event ) {
				var eventTarget = event.target;
				var browser = sap.ui.Device.browser;

				return browser.edge && browser.version >= 14 &&
					(eventTarget.tagName.toLowerCase() === "button" &&
						eventTarget.contains(mouseDownTarget) ||
						mouseDownTarget.tagName.toLowerCase() === "button" &&
						mouseDownTarget.contains(eventTarget));
			}

			// MODIFIED BY SAP: the following event handlers are moved out of the "mousedown" event handler to make it
			// possible to be deregistered in a later time point
			function clearTapTimer() {
				clearTimeout( timer );
			}

			function clearTapHandlers() {
				clearTapTimer();

				// MODIFIED BY SAP: remove the mark because the tap event runs to the end
				$this.removeData("__tap_event_in_progress");

				// MODIFIED BY SAP: replace deprecated API .unbind -> .off
				$this.off( "vclick", clickHandler )
					.off( "vmouseup", clearTapTimer );
				$document.off( "vmousecancel", clearTapHandlers )
				// MODIFIED BY SAP: deregister the function of clearing handlers from 'dragstart' event
				// on document
					.off( "dragstart", clearTapHandlers )
				// MODIFIED BY SAP: deregister the function of clearing handlers from 'mouseup' event
				// on document
					.off( "vmouseup", checkAndClearTapHandlers );
			}

			// MODIFIED BY SAP: terminate the firing of 'tap' event if 'mouseup' event occurs
			// out of the 'mousedown' target
			function checkAndClearTapHandlers( mouseUpEvent ) {
				// if the mouseup event occurs out of the origin target of the mousedown event,
				// unbind all of the listeners
				if (mouseUpEvent.target !== mouseDownTarget && !$.contains(mouseDownTarget, mouseUpEvent.target) && !buttonTappedInEdgeBrowser( mouseUpEvent )) {
					clearTapHandlers();
				}
			}

			function clickHandler( event ) {
				clearTapHandlers();

				// ONLY trigger a 'tap' event if the start target is
				// the same as the stop target.
				if ( mouseDownTarget === event.target || buttonTappedInEdgeBrowser( event )) {
					triggerCustomEvent( thisObject, "tap", event );
				}
			}


			// MODIFIED BY SAP: replace deprecated API .bind -> .on
			$this.on( "vmousedown", function( event ) {
				if ( event.which && event.which !== 1 ) {
					// MODIFIED BY SAP: 'return false' is changed with 'return' to let the event
					// still propagate to the parent DOMs.
					return;
				}

				mouseDownTarget = event.target;
				mouseDownEvent = event.originalEvent;

				// MODIFIED BY SAP: if the previous event handlers aren't cleared due to missing "mouseup" event, first
				// clear the event handlers
				if ($this.data("__tap_event_in_progress")) {
					clearTapHandlers();
				}
				// MODIFIED BY SAP: set the mark that the tap event is in progress
				$this.data("__tap_event_in_progress", "X");

				// MODIFIED BY SAP: replace deprecated API .bind -> .on
				$this.on( "vmouseup", clearTapTimer )
					.on( "vclick", clickHandler );
				$document.on( "vmousecancel", clearTapHandlers )
				// MODIFIED BY SAP: register the function of clearing handlers to 'dragstart' event
				// on document, because no 'mouseup' and 'click' event is fired after 'dragstart'
					.on( "dragstart", clearTapHandlers )
				// MODIFIED BY SAP: register the function of clearing handlers to 'mouseup' event
				// on document
				// MODIFIED BY SAP: replace deprecated API .bind -> .on
					.on( "vmouseup", checkAndClearTapHandlers );

				timer = setTimeout( function() {
					// MODIFIED BY SAP: create the custom taphold event from the original event in order to preserve the properties
					var oTapholdEvent = $.event.fix(mouseDownEvent);
					oTapholdEvent.type = "taphold";
					triggerCustomEvent( thisObject, "taphold", oTapholdEvent );
				}, $.event.special.tap.tapholdThreshold );
			});
		}
	};

	// also handles swipeleft, swiperight
	$.event.special.swipe = {
		scrollSupressionThreshold: 30, // More than this horizontal displacement, and we will suppress scrolling.

		durationThreshold: 1000, // More time than this, and it isn't a swipe.

		horizontalDistanceThreshold: 30,  // Swipe horizontal displacement must be more than this.

		verticalDistanceThreshold: 75,  // Swipe vertical displacement must be less than this.

		start: function( event ) {
			// MODIFIED BY SAP: if jQuery event is created programatically there's no originalEvent property. Therefore the existence of event.originalEvent needs to be checked.
			var data = event.originalEvent && event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event;
			return {
						time: ( new Date() ).getTime(),
						coords: [ data.pageX, data.pageY ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			// MODIFIED BY SAP: if jQuery event is created programatically there's no originalEvent property. Therefore the existence of event.originalEvent needs to be checked.
			var data = event.originalEvent && event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event;
			return {
						time: ( new Date() ).getTime(),
						coords: [ data.pageX, data.pageY ]
					};
		},

		handleSwipe: function( start, stop ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {

				start.origin.trigger( "swipe" )
					.trigger( start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight" );
			}
		},

		setup: function() {
			var thisObject = this,
				$this = $( thisObject );

			// MODIFIED BY SAP: replace deprecated API .bind -> .on
			$this.on( touchStartEvent, function( event ) {
				// MODIFIED BY SAP: mark touch events, so only the lowest UIArea within the hierarchy will create a swipe event
				if (event.isMarked("swipestartHandled")) {
					return;
				}
				event.setMarked("swipestartHandled");

				var start = $.event.special.swipe.start( event ),
					stop;

				function moveHandler( event ) {
					if ( !start ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );

					// prevent scrolling
					// MODIFIED BY SAP: because calling 'preventDefault' breaks the text selection in all browsers, it's
					// now checked whether there's text selected and 'preventDefault' is called only when no text is
					// currently being selected.
					if (event.cancelable && !window.getSelection().toString() && Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold) {
						event.preventDefault();
					}
				}

				// MODIFIED BY SAP
				// Because touchcancel is used together with touchend, jQuery.fn.bind is used to replace
				// jQuery.fn.one due to the fact that jQuery.fn.one doesn't work for multiple events.
				function stopHandler( event ) {
					// MODIFIED BY SAP: replace deprecated API .unbind -> .off
					$this.off( touchMoveEvent, moveHandler )
						.off( touchStopEvent, stopHandler );

					if ( start && stop ) {
						$.event.special.swipe.handleSwipe( start, stop );
					}
					start = stop = undefined;
				}

				// MODIFIED BY SAP: replace deprecated API .bind -> .on
				$this.on( touchMoveEvent, moveHandler )
					.on( touchStopEvent, stopHandler );
			});
		}
	};
	$.each({
		scrollstop: "scrollstart",
		taphold: "tap",
		swipeleft: "swipe",
		swiperight: "swipe"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				// MODIFIED BY SAP: replace deprecated API .bind -> .on
				$( this ).on( sourceEvent, $.noop );
			}
		};
	});

})( jQuery, this );


}));
},
	"sap/ui/thirdparty/jquery.js":function(){
/*!
 * jQuery JavaScript Library v3.6.0
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright OpenJS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2021-03-02T17:08Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var flat = arr.flat ? function( array ) {
	return arr.flat.call( array );
} : function( array ) {
	return arr.concat.apply( [], array );
};


var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};

var isFunction = function isFunction( obj ) {

		// Support: Chrome <=57, Firefox <=52
		// In some browsers, typeof returns "function" for HTML <object> elements
		// (i.e., `typeof document.createElement( "object" ) === "function"`).
		// We don't want to classify *any* DOM node as a function.
		// Support: QtWeb <=3.8.5, WebKit <=534.34, wkhtmltopdf tool <=0.12.5
		// Plus for old WebKit, typeof returns "function" for HTML collections
		// (e.g., `typeof document.getElementsByTagName("div") === "function"`). (gh-4756)
		return typeof obj === "function" && typeof obj.nodeType !== "number" &&
			typeof obj.item !== "function";
	};


var isWindow = function isWindow( obj ) {
		return obj != null && obj === obj.window;
	};


var document = window.document;



	var preservedScriptAttributes = {
		type: true,
		src: true,
		nonce: true,
		noModule: true
	};

	function DOMEval( code, node, doc ) {
		doc = doc || document;

		var i, val,
			script = doc.createElement( "script" );

		script.text = code;
		if ( node ) {
			for ( i in preservedScriptAttributes ) {

				// Support: Firefox 64+, Edge 18+
				// Some browsers don't support the "nonce" property on scripts.
				// On the other hand, just using `getAttribute` is not enough as
				// the `nonce` attribute is reset to an empty string whenever it
				// becomes browsing-context connected.
				// See https://github.com/whatwg/html/issues/2369
				// See https://html.spec.whatwg.org/#nonce-attributes
				// The `node.getAttribute` check was added for the sake of
				// `jQuery.globalEval` so that it can fake a nonce-containing node
				// via an object.
				val = node[ i ] || node.getAttribute && node.getAttribute( i );
				if ( val ) {
					script.setAttribute( i, val );
				}
			}
		}
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}


function toType( obj ) {
	if ( obj == null ) {
		return obj + "";
	}

	// Support: Android <=2.3 only (functionish RegExp)
	return typeof obj === "object" || typeof obj === "function" ?
		class2type[ toString.call( obj ) ] || "object" :
		typeof obj;
}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.6.0",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	even: function() {
		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
			return ( i + 1 ) % 2;
		} ) );
	},

	odd: function() {
		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
			return i % 2;
		} ) );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				copy = options[ name ];

				// Prevent Object.prototype pollution
				// Prevent never-ending loop
				if ( name === "__proto__" || target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {
					src = target[ name ];

					// Ensure proper type for the source value
					if ( copyIsArray && !Array.isArray( src ) ) {
						clone = [];
					} else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
						clone = {};
					} else {
						clone = src;
					}
					copyIsArray = false;

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	// Evaluates a script in a provided context; falls back to the global one
	// if not specified.
	globalEval: function( code, options, doc ) {
		DOMEval( code, { nonce: options && options.nonce }, doc );
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
						[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return flat( ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
	function( _i, name ) {
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = toType( obj );

	if ( isFunction( obj ) || isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.6
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://js.foundation/
 *
 * Date: 2021-02-16
 */
( function( window ) {
var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	nonnativeSelectorCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ( {} ).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	pushNative = arr.push,
	push = arr.push,
	slice = arr.slice,

	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[ i ] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|" +
		"ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
	identifier = "(?:\\\\[\\da-fA-F]{1,6}" + whitespace +
		"?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +

		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +

		// "Attribute values must be CSS identifiers [capture 5]
		// or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" +
		whitespace + "*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +

		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +

		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +

		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" +
		whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace +
		"*" ),
	rdescend = new RegExp( whitespace + "|>" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" +
			whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" +
			whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),

		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace +
			"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace +
			"*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rhtml = /HTML$/i,
	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\[\\da-fA-F]{1,6}" + whitespace + "?|\\\\([^\\r\\n\\f])", "g" ),
	funescape = function( escape, nonHex ) {
		var high = "0x" + escape.slice( 1 ) - 0x10000;

		return nonHex ?

			// Strip the backslash prefix from a non-hex escape sequence
			nonHex :

			// Replace a hexadecimal escape sequence with the encoded Unicode code point
			// Support: IE <=11+
			// For values outside the Basic Multilingual Plane (BMP), manually construct a
			// surrogate pair
			high < 0 ?
				String.fromCharCode( high + 0x10000 ) :
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" +
				ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	inDisabledFieldset = addCombinator(
		function( elem ) {
			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		( arr = slice.call( preferredDoc.childNodes ) ),
		preferredDoc.childNodes
	);

	// Support: Android<4.0
	// Detect silently failing push.apply
	// eslint-disable-next-line no-unused-expressions
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			pushNative.apply( target, slice.call( els ) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;

			// Can't trust NodeList.length
			while ( ( target[ j++ ] = els[ i++ ] ) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {
		setDocument( context );
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && ( match = rquickExpr.exec( selector ) ) ) {

				// ID selector
				if ( ( m = match[ 1 ] ) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( ( elem = context.getElementById( m ) ) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && ( elem = newContext.getElementById( m ) ) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[ 2 ] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( ( m = match[ 3 ] ) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!nonnativeSelectorCache[ selector + " " ] &&
				( !rbuggyQSA || !rbuggyQSA.test( selector ) ) &&

				// Support: IE 8 only
				// Exclude object elements
				( nodeType !== 1 || context.nodeName.toLowerCase() !== "object" ) ) {

				newSelector = selector;
				newContext = context;

				// qSA considers elements outside a scoping root when evaluating child or
				// descendant combinators, which is not what we want.
				// In such cases, we work around the behavior by prefixing every selector in the
				// list with an ID selector referencing the scope context.
				// The technique has to be used as well when a leading combinator is used
				// as such selectors are not recognized by querySelectorAll.
				// Thanks to Andrew Dupont for this technique.
				if ( nodeType === 1 &&
					( rdescend.test( selector ) || rcombinators.test( selector ) ) ) {

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;

					// We can use :scope instead of the ID hack if the browser
					// supports it & if we're not changing the context.
					if ( newContext !== context || !support.scope ) {

						// Capture the context ID, setting it first if necessary
						if ( ( nid = context.getAttribute( "id" ) ) ) {
							nid = nid.replace( rcssescape, fcssescape );
						} else {
							context.setAttribute( "id", ( nid = expando ) );
						}
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[ i ] = ( nid ? "#" + nid : ":scope" ) + " " +
							toSelector( groups[ i ] );
					}
					newSelector = groups.join( "," );
				}

				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch ( qsaError ) {
					nonnativeSelectorCache( selector, true );
				} finally {
					if ( nid === expando ) {
						context.removeAttribute( "id" );
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {

		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {

			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return ( cache[ key + " " ] = value );
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement( "fieldset" );

	try {
		return !!fn( el );
	} catch ( e ) {
		return false;
	} finally {

		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}

		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split( "|" ),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[ i ] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( ( cur = cur.nextSibling ) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return ( name === "input" || name === "button" ) && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
					inDisabledFieldset( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction( function( argument ) {
		argument = +argument;
		return markFunction( function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ ( j = matchIndexes[ i ] ) ] ) {
					seed[ j ] = !( matches[ j ] = seed[ j ] );
				}
			}
		} );
	} );
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	var namespace = elem && elem.namespaceURI,
		docElem = elem && ( elem.ownerDocument || elem ).documentElement;

	// Support: IE <=8
	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
	// https://bugs.jquery.com/ticket/4833
	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( doc == document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9 - 11+, Edge 12 - 18+
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( preferredDoc != document &&
		( subWindow = document.defaultView ) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	// Support: IE 8 - 11+, Edge 12 - 18+, Chrome <=16 - 25 only, Firefox <=3.6 - 31 only,
	// Safari 4 - 5 only, Opera <=11.6 - 12.x only
	// IE/Edge & older browsers don't support the :scope pseudo-class.
	// Support: Safari 6.0 only
	// Safari 6.0 supports :scope but it's an alias of :root there.
	support.scope = assert( function( el ) {
		docElem.appendChild( el ).appendChild( document.createElement( "div" ) );
		return typeof el.querySelectorAll !== "undefined" &&
			!el.querySelectorAll( ":scope fieldset div" ).length;
	} );

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert( function( el ) {
		el.className = "i";
		return !el.getAttribute( "className" );
	} );

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert( function( el ) {
		el.appendChild( document.createComment( "" ) );
		return !el.getElementsByTagName( "*" ).length;
	} );

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert( function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	} );

	// ID filter and find
	if ( support.getById ) {
		Expr.filter[ "ID" ] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute( "id" ) === attrId;
			};
		};
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter[ "ID" ] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode( "id" );
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode( "id" );
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( ( elem = elems[ i++ ] ) ) {
						node = elem.getAttributeNode( "id" );
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find[ "TAG" ] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,

				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( ( elem = results[ i++ ] ) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find[ "CLASS" ] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( ( support.qsa = rnative.test( document.querySelectorAll ) ) ) {

		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert( function( el ) {

			var input;

			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll( "[msallowcapture^='']" ).length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll( "[selected]" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push( "~=" );
			}

			// Support: IE 11+, Edge 15 - 18+
			// IE 11/Edge don't find elements on a `[name='']` query in some cases.
			// Adding a temporary attribute to the document before the selection works
			// around the issue.
			// Interestingly, IE 10 & older don't seem to have the issue.
			input = document.createElement( "input" );
			input.setAttribute( "name", "" );
			el.appendChild( input );
			if ( !el.querySelectorAll( "[name='']" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*name" + whitespace + "*=" +
					whitespace + "*(?:''|\"\")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll( ":checked" ).length ) {
				rbuggyQSA.push( ":checked" );
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push( ".#.+[+~]" );
			}

			// Support: Firefox <=3.6 - 5 only
			// Old Firefox doesn't throw on a badly-escaped identifier.
			el.querySelectorAll( "\\\f" );
			rbuggyQSA.push( "[\\r\\n\\f]" );
		} );

		assert( function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement( "input" );
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll( "[name=d]" ).length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll( ":enabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll( ":disabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: Opera 10 - 11 only
			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll( "*,:x" );
			rbuggyQSA.push( ",.*:" );
		} );
	}

	if ( ( support.matchesSelector = rnative.test( ( matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector ) ) ) ) {

		assert( function( el ) {

			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		} );
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join( "|" ) );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join( "|" ) );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			) );
		} :
		function( a, b ) {
			if ( b ) {
				while ( ( b = b.parentNode ) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		// Support: IE 11+, Edge 17 - 18+
		// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
		// two documents; shallow comparisons work.
		// eslint-disable-next-line eqeqeq
		compare = ( a.ownerDocument || a ) == ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			( !support.sortDetached && b.compareDocumentPosition( a ) === compare ) ) {

			// Choose the first element that is related to our preferred document
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( a == document || a.ownerDocument == preferredDoc &&
				contains( preferredDoc, a ) ) {
				return -1;
			}

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( b == document || b.ownerDocument == preferredDoc &&
				contains( preferredDoc, b ) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {

		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			return a == document ? -1 :
				b == document ? 1 :
				/* eslint-enable eqeqeq */
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( ( cur = cur.parentNode ) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( ( cur = cur.parentNode ) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[ i ] === bp[ i ] ) {
			i++;
		}

		return i ?

			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[ i ], bp[ i ] ) :

			// Otherwise nodes in our document sort first
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			ap[ i ] == preferredDoc ? -1 :
			bp[ i ] == preferredDoc ? 1 :
			/* eslint-enable eqeqeq */
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	setDocument( elem );

	if ( support.matchesSelector && documentIsHTML &&
		!nonnativeSelectorCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||

				// As well, disconnected nodes are said to be in a document
				// fragment in IE 9
				elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch ( e ) {
			nonnativeSelectorCache( expr, true );
		}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( context.ownerDocument || context ) != document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( elem.ownerDocument || elem ) != document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],

		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			( val = elem.getAttributeNode( name ) ) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return ( sel + "" ).replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( ( elem = results[ i++ ] ) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {

		// If no nodeType, this is expected to be an array
		while ( ( node = elem[ i++ ] ) ) {

			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {

		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {

			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}

	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[ 1 ] = match[ 1 ].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[ 3 ] = ( match[ 3 ] || match[ 4 ] ||
				match[ 5 ] || "" ).replace( runescape, funescape );

			if ( match[ 2 ] === "~=" ) {
				match[ 3 ] = " " + match[ 3 ] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {

			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[ 1 ] = match[ 1 ].toLowerCase();

			if ( match[ 1 ].slice( 0, 3 ) === "nth" ) {

				// nth-* requires argument
				if ( !match[ 3 ] ) {
					Sizzle.error( match[ 0 ] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[ 4 ] = +( match[ 4 ] ?
					match[ 5 ] + ( match[ 6 ] || 1 ) :
					2 * ( match[ 3 ] === "even" || match[ 3 ] === "odd" ) );
				match[ 5 ] = +( ( match[ 7 ] + match[ 8 ] ) || match[ 3 ] === "odd" );

				// other types prohibit arguments
			} else if ( match[ 3 ] ) {
				Sizzle.error( match[ 0 ] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[ 6 ] && match[ 2 ];

			if ( matchExpr[ "CHILD" ].test( match[ 0 ] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[ 3 ] ) {
				match[ 2 ] = match[ 4 ] || match[ 5 ] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&

				// Get excess from tokenize (recursively)
				( excess = tokenize( unquoted, true ) ) &&

				// advance to the next closing parenthesis
				( excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length ) ) {

				// excess is a negative index
				match[ 0 ] = match[ 0 ].slice( 0, excess );
				match[ 2 ] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() {
					return true;
				} :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				( pattern = new RegExp( "(^|" + whitespace +
					")" + className + "(" + whitespace + "|$)" ) ) && classCache(
						className, function( elem ) {
							return pattern.test(
								typeof elem.className === "string" && elem.className ||
								typeof elem.getAttribute !== "undefined" &&
									elem.getAttribute( "class" ) ||
								""
							);
				} );
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				/* eslint-disable max-len */

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
				/* eslint-enable max-len */

			};
		},

		"CHILD": function( type, what, _argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, _context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( ( node = node[ dir ] ) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}

								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || ( node[ expando ] = {} );

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								( outerCache[ node.uniqueID ] = {} );

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( ( node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								( diff = nodeIndex = 0 ) || start.pop() ) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {

							// Use previously-cached element index if available
							if ( useCache ) {

								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || ( node[ expando ] = {} );

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									( outerCache[ node.uniqueID ] = {} );

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {

								// Use the same loop as above to seek `elem` from the start
								while ( ( node = ++nodeIndex && node && node[ dir ] ||
									( diff = nodeIndex = 0 ) || start.pop() ) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] ||
												( node[ expando ] = {} );

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												( outerCache[ node.uniqueID ] = {} );

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {

			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction( function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[ i ] );
							seed[ idx ] = !( matches[ idx ] = matched[ i ] );
						}
					} ) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {

		// Potentially complex pseudos
		"not": markFunction( function( selector ) {

			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction( function( seed, matches, _context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( ( elem = unmatched[ i ] ) ) {
							seed[ i ] = !( matches[ i ] = elem );
						}
					}
				} ) :
				function( elem, _context, xml ) {
					input[ 0 ] = elem;
					matcher( input, null, xml, results );

					// Don't keep the element (issue #299)
					input[ 0 ] = null;
					return !results.pop();
				};
		} ),

		"has": markFunction( function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		} ),

		"contains": markFunction( function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
			};
		} ),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {

			// lang value must be a valid identifier
			if ( !ridentifier.test( lang || "" ) ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( ( elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute( "xml:lang" ) || elem.getAttribute( "lang" ) ) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( ( elem = elem.parentNode ) && elem.nodeType === 1 );
				return false;
			};
		} ),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement &&
				( !document.hasFocus || document.hasFocus() ) &&
				!!( elem.type || elem.href || ~elem.tabIndex );
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {

			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return ( nodeName === "input" && !!elem.checked ) ||
				( nodeName === "option" && !!elem.selected );
		},

		"selected": function( elem ) {

			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				// eslint-disable-next-line no-unused-expressions
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {

			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos[ "empty" ]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( ( attr = elem.getAttribute( "type" ) ) == null ||
					attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo( function() {
			return [ 0 ];
		} ),

		"last": createPositionalPseudo( function( _matchIndexes, length ) {
			return [ length - 1 ];
		} ),

		"eq": createPositionalPseudo( function( _matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		} ),

		"even": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"odd": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"lt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ?
				argument + length :
				argument > length ?
					length :
					argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"gt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} )
	}
};

Expr.pseudos[ "nth" ] = Expr.pseudos[ "eq" ];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || ( match = rcomma.exec( soFar ) ) ) {
			if ( match ) {

				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[ 0 ].length ) || soFar;
			}
			groups.push( ( tokens = [] ) );
		}

		matched = false;

		// Combinators
		if ( ( match = rcombinators.exec( soFar ) ) ) {
			matched = match.shift();
			tokens.push( {
				value: matched,

				// Cast descendant combinators to space
				type: match[ 0 ].replace( rtrim, " " )
			} );
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( ( match = matchExpr[ type ].exec( soFar ) ) && ( !preFilters[ type ] ||
				( match = preFilters[ type ]( match ) ) ) ) {
				matched = match.shift();
				tokens.push( {
					value: matched,
					type: type,
					matches: match
				} );
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :

			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[ i ].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?

		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( ( elem = elem[ dir ] ) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || ( elem[ expando ] = {} );

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] ||
							( outerCache[ elem.uniqueID ] = {} );

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( ( oldCache = uniqueCache[ key ] ) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return ( newCache[ 2 ] = oldCache[ 2 ] );
						} else {

							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( ( newCache[ 2 ] = matcher( elem, context, xml ) ) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[ i ]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[ 0 ];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[ i ], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( ( elem = unmatched[ i ] ) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction( function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts(
				selector || "*",
				context.nodeType ? [ context ] : context,
				[]
			),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?

				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( ( elem = temp[ i ] ) ) {
					matcherOut[ postMap[ i ] ] = !( matcherIn[ postMap[ i ] ] = elem );
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {

					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( ( elem = matcherOut[ i ] ) ) {

							// Restore matcherIn since elem is not yet a final match
							temp.push( ( matcherIn[ i ] = elem ) );
						}
					}
					postFinder( null, ( matcherOut = [] ), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( ( elem = matcherOut[ i ] ) &&
						( temp = postFinder ? indexOf( seed, elem ) : preMap[ i ] ) > -1 ) {

						seed[ temp ] = !( results[ temp ] = elem );
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	} );
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[ 0 ].type ],
		implicitRelative = leadingRelative || Expr.relative[ " " ],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				( checkContext = context ).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );

			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( ( matcher = Expr.relative[ tokens[ i ].type ] ) ) {
			matchers = [ addCombinator( elementMatcher( matchers ), matcher ) ];
		} else {
			matcher = Expr.filter[ tokens[ i ].type ].apply( null, tokens[ i ].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {

				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[ j ].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(

					// If the preceding token was a descendant combinator, insert an implicit any-element `*`
					tokens
						.slice( 0, i - 1 )
						.concat( { value: tokens[ i - 2 ].type === " " ? "*" : "" } )
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( ( tokens = tokens.slice( j ) ) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,

				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find[ "TAG" ]( "*", outermost ),

				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = ( dirruns += contextBackup == null ? 1 : Math.random() || 0.1 ),
				len = elems.length;

			if ( outermost ) {

				// Support: IE 11+, Edge 17 - 18+
				// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
				// two documents; shallow comparisons work.
				// eslint-disable-next-line eqeqeq
				outermostContext = context == document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && ( elem = elems[ i ] ) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;

					// Support: IE 11+, Edge 17 - 18+
					// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
					// two documents; shallow comparisons work.
					// eslint-disable-next-line eqeqeq
					if ( !context && elem.ownerDocument != document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( ( matcher = elementMatchers[ j++ ] ) ) {
						if ( matcher( elem, context || document, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {

					// They will have gone through all possible matchers
					if ( ( elem = !matcher && elem ) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( ( matcher = setMatchers[ j++ ] ) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {

					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !( unmatched[ i ] || setMatched[ i ] ) ) {
								setMatched[ i ] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {

		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[ i ] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache(
			selector,
			matcherFromGroupMatchers( elementMatchers, setMatchers )
		);

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( ( selector = compiled.selector || selector ) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[ 0 ] = match[ 0 ].slice( 0 );
		if ( tokens.length > 2 && ( token = tokens[ 0 ] ).type === "ID" &&
			context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[ 1 ].type ] ) {

			context = ( Expr.find[ "ID" ]( token.matches[ 0 ]
				.replace( runescape, funescape ), context ) || [] )[ 0 ];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr[ "needsContext" ].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[ i ];

			// Abort if we hit a combinator
			if ( Expr.relative[ ( type = token.type ) ] ) {
				break;
			}
			if ( ( find = Expr.find[ type ] ) ) {

				// Search, expanding context for leading sibling combinators
				if ( ( seed = find(
					token.matches[ 0 ].replace( runescape, funescape ),
					rsibling.test( tokens[ 0 ].type ) && testContext( context.parentNode ) ||
						context
				) ) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split( "" ).sort( sortOrder ).join( "" ) === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert( function( el ) {

	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement( "fieldset" ) ) & 1;
} );

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert( function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute( "href" ) === "#";
} ) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	} );
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert( function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
} ) ) {
	addHandle( "value", function( elem, _name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	} );
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert( function( el ) {
	return el.getAttribute( "disabled" ) == null;
} ) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
				( val = elem.getAttributeNode( name ) ) && val.specified ?
					val.value :
					null;
		}
	} );
}

return Sizzle;

} )( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;



function nodeName( elem, name ) {

	return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

}
var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Filtered directly for both simple and complex selectors
	return jQuery.filter( qualifier, elements, not );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, _i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, _i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, _i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		if ( elem.contentDocument != null &&

			// Support: IE 11+
			// <object> elements with no `data` attribute has an object
			// `contentDocument` with a `null` prototype.
			getProto( elem.contentDocument ) ) {

			return elem.contentDocument;
		}

		// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
		// Treat the template element as a regular one in browsers that
		// don't support it.
		if ( nodeName( elem, "template" ) ) {
			elem = elem.content || elem;
		}

		return jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && toType( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject, noValue ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
			// * false: [ value ].slice( 0 ) => resolve( value )
			// * true: [ value ].slice( 1 ) => resolve()
			resolve.apply( undefined, [ value ].slice( noValue ) );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.apply( undefined, [ value ] );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( _i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// rejected_handlers.disable
					// fulfilled_handlers.disable
					tuples[ 3 - i ][ 3 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock,

					// progress_handlers.lock
					tuples[ 0 ][ 3 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the primary Deferred
			primary = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						primary.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, primary.done( updateFunc( i ) ).resolve, primary.reject,
				!remaining );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( primary.state() === "pending" ||
				isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return primary.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), primary.reject );
		}

		return primary.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( toType( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, _key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
						value :
						value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};


// Matches dashed string for camelizing
var rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g;

// Used by camelCase as callback to replace()
function fcamelCase( _all, letter ) {
	return letter.toUpperCase();
}

// Convert dashed to camelCase; used by the css and data modules
// Support: IE <=9 - 11, Edge 12 - 15
// Microsoft forgot to hump their vendor prefix (#9572)
function camelCase( string ) {
	return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
}
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( Array.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( camelCase );
			} else {
				key = camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || Array.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var documentElement = document.documentElement;



	var isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem );
		},
		composed = { composed: true };

	// Support: IE 9 - 11+, Edge 12 - 18+, iOS 10.0 - 10.2 only
	// Check attachment across shadow DOM boundaries when possible (gh-3504)
	// Support: iOS 10.0-10.2 only
	// Early iOS 10 versions support `attachShadow` but not `getRootNode`,
	// leading to errors. We need to check for `getRootNode`.
	if ( documentElement.getRootNode ) {
		isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem ) ||
				elem.getRootNode( composed ) === elem.ownerDocument;
		};
	}
var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			isAttached( elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};



function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted, scale,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = elem.nodeType &&
			( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Support: Firefox <=54
		// Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
		initial = initial / 2;

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		while ( maxIterations-- ) {

			// Evaluate and update our best guess (doubling guesses that zero out).
			// Finish if the scale equals or crosses 1 (making the old*new product non-positive).
			jQuery.style( elem, prop, initialInUnit + unit );
			if ( ( 1 - scale ) * ( 1 - ( scale = currentValue() / initial || 0.5 ) ) <= 0 ) {
				maxIterations = 0;
			}
			initialInUnit = initialInUnit / scale;

		}

		initialInUnit = initialInUnit * 2;
		jQuery.style( elem, prop, initialInUnit + unit );

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]*)/i );

var rscriptType = ( /^$|^module$|\/(?:java|ecma)script/i );



( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;

	// Support: IE <=9 only
	// IE <=9 replaces <option> tags with their contents when inserted outside of
	// the select element.
	div.innerHTML = "<option></option>";
	support.option = !!div.lastChild;
} )();


// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: IE <=9 only
if ( !support.option ) {
	wrapMap.optgroup = wrapMap.option = [ 1, "<select multiple='multiple'>", "</select>" ];
}


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, attached, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( toType( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		attached = isAttached( elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( attached ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


var rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 - 11+
// focus() and blur() are asynchronous, except when they are no-op.
// So expect focus to be synchronous when the element is already active,
// and blur to be synchronous when the element is not already active.
// (focus and blur are always synchronous in other supported browsers,
// this just defines when we can count on it).
function expectSync( elem, type ) {
	return ( elem === safeActiveElement() ) === ( type === "focus" );
}

// Support: IE <=9 only
// Accessing document.activeElement can throw unexpectedly
// https://bugs.jquery.com/ticket/13393
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Only attach events to objects that accept data
		if ( !acceptData( elem ) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = Object.create( null );
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),

			// Make a writable jQuery.Event from the native event object
			event = jQuery.event.fix( nativeEvent ),

			handlers = (
				dataPriv.get( this, "events" ) || Object.create( null )
			)[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// If the event is namespaced, then each handler is only invoked if it is
				// specially universal or its namespaces are a superset of the event's.
				if ( !event.rnamespace || handleObj.namespace === false ||
					event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
						return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
						return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		click: {

			// Utilize native event to ensure correct state for checkable inputs
			setup: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Claim the first handler
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					// dataPriv.set( el, "click", ... )
					leverageNative( el, "click", returnTrue );
				}

				// Return false to allow normal processing in the caller
				return false;
			},
			trigger: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Force setup before triggering a click
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					leverageNative( el, "click" );
				}

				// Return non-false to allow normal event-path propagation
				return true;
			},

			// For cross-browser consistency, suppress native .click() on links
			// Also prevent it if we're currently inside a leveraged native-event stack
			_default: function( event ) {
				var target = event.target;
				return rcheckableType.test( target.type ) &&
					target.click && nodeName( target, "input" ) &&
					dataPriv.get( target, "click" ) ||
					nodeName( target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

// Ensure the presence of an event listener that handles manually-triggered
// synthetic events by interrupting progress until reinvoked in response to
// *native* events that it fires directly, ensuring that state changes have
// already occurred before other listeners are invoked.
function leverageNative( el, type, expectSync ) {

	// Missing expectSync indicates a trigger call, which must force setup through jQuery.event.add
	if ( !expectSync ) {
		if ( dataPriv.get( el, type ) === undefined ) {
			jQuery.event.add( el, type, returnTrue );
		}
		return;
	}

	// Register the controller as a special universal handler for all event namespaces
	dataPriv.set( el, type, false );
	jQuery.event.add( el, type, {
		namespace: false,
		handler: function( event ) {
			var notAsync, result,
				saved = dataPriv.get( this, type );

			if ( ( event.isTrigger & 1 ) && this[ type ] ) {

				// Interrupt processing of the outer synthetic .trigger()ed event
				// Saved data should be false in such cases, but might be a leftover capture object
				// from an async native handler (gh-4350)
				if ( !saved.length ) {

					// Store arguments for use when handling the inner native event
					// There will always be at least one argument (an event object), so this array
					// will not be confused with a leftover capture object.
					saved = slice.call( arguments );
					dataPriv.set( this, type, saved );

					// Trigger the native event and capture its result
					// Support: IE <=9 - 11+
					// focus() and blur() are asynchronous
					notAsync = expectSync( this, type );
					this[ type ]();
					result = dataPriv.get( this, type );
					if ( saved !== result || notAsync ) {
						dataPriv.set( this, type, false );
					} else {
						result = {};
					}
					if ( saved !== result ) {

						// Cancel the outer synthetic event
						event.stopImmediatePropagation();
						event.preventDefault();

						// Support: Chrome 86+
						// In Chrome, if an element having a focusout handler is blurred by
						// clicking outside of it, it invokes the handler synchronously. If
						// that handler calls `.remove()` on the element, the data is cleared,
						// leaving `result` undefined. We need to guard against this.
						return result && result.value;
					}

				// If this is an inner synthetic event for an event with a bubbling surrogate
				// (focus or blur), assume that the surrogate already propagated from triggering the
				// native event and prevent that from happening again here.
				// This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
				// bubbling surrogate propagates *after* the non-bubbling base), but that seems
				// less bad than duplication.
				} else if ( ( jQuery.event.special[ type ] || {} ).delegateType ) {
					event.stopPropagation();
				}

			// If this is a native event triggered above, everything is now in order
			// Fire an inner synthetic event with the original arguments
			} else if ( saved.length ) {

				// ...and capture the result
				dataPriv.set( this, type, {
					value: jQuery.event.trigger(

						// Support: IE <=9 - 11+
						// Extend with the prototype to reset the above stopImmediatePropagation()
						jQuery.extend( saved[ 0 ], jQuery.Event.prototype ),
						saved.slice( 1 ),
						this
					)
				} );

				// Abort handling of the native event
				event.stopImmediatePropagation();
			}
		}
	} );
}

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || Date.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	code: true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,
	which: true
}, jQuery.event.addProp );

jQuery.each( { focus: "focusin", blur: "focusout" }, function( type, delegateType ) {
	jQuery.event.special[ type ] = {

		// Utilize native event if possible so blur/focus sequence is correct
		setup: function() {

			// Claim the first handler
			// dataPriv.set( this, "focus", ... )
			// dataPriv.set( this, "blur", ... )
			leverageNative( this, type, expectSync );

			// Return false to allow normal processing in the caller
			return false;
		},
		trigger: function() {

			// Force setup before trigger
			leverageNative( this, type );

			// Return non-false to allow normal event-path propagation
			return true;
		},

		// Suppress native focus or blur as it's already being fired
		// in leverageNative.
		_default: function() {
			return true;
		},

		delegateType: delegateType
	};
} );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	// Support: IE <=10 - 11, Edge 12 - 13 only
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

// Prefer a tbody over its parent table for containing new rows
function manipulationTarget( elem, content ) {
	if ( nodeName( elem, "table" ) &&
		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {
		// ##### BEGIN: MODIFIED BY SAP
		// jQuery has removed the automatic creation of a <tbody> element with version 3.
		// Some UI5 applications have been dependent on this behavior.
		var tbody = jQuery( elem ).children( "tbody" )[ 0 ];
		if (tbody) {
			return tbody;
		} else {
			// We log a warning via the UI5 migration logging mechanism to report these issues.
			if (window.sap && window.sap.ui && window.sap.ui._jQuery3Compat && window.sap.ui._jQuery3Compat._migrateWarn) {
				window.sap.ui._jQuery3Compat._migrateWarn(
					"Trying to add a <tr> element to a <table> without a <tbody>. " +
					"At this point, jQuery version 2 would have inserted a <tbody> element for you. " +
					"Since jQuery version 3, jQuery does not automatically create a <tbody> element anymore. " +
					"Please add the <tbody> on your own, if your code or CSS expects it."
				);
			}
			return elem;
		}
		// ##### END: MODIFIED BY SAP
	}
	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	if ( ( elem.type || "" ).slice( 0, 5 ) === "true/" ) {
		elem.type = elem.type.slice( 5 );
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.get( src );
		events = pdataOld.events;

		if ( events ) {
			dataPriv.remove( dest, "handle events" );

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = flat( args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		valueIsFunction = isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( valueIsFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( valueIsFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl && !node.noModule ) {
								jQuery._evalUrl( node.src, {
									nonce: node.nonce || node.getAttribute( "nonce" )
								}, doc );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && isAttached( node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html;
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = isAttached( elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

// ##### BEGIN: MODIFIED BY SAP
// This code is for testing purposes only and could be removed in the future!
if (/(?:\?|&)sap-ui-xx-self-closing-check=(?:x|X|true)/.exec(window.location.search)) {
	var rNonVoidHtml5Tags = new RegExp(
		"^(?:a|abbr|address|article|aside|audio|b|bdi|bdo|blockquote|body|button|canvas|caption|cite|code|colgroup|data|datalist|dd|del|details|dfn|dialog|div|dl|dt|em|fieldset"
		+ "|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|head|header|hgroup|html|i|iframe|ins|kbd|label|legend|li|main|map|mark|menu|meter|nav|noscript|object|ol|optgroup|option"
		+ "|output|p|picture|pre|progress|q|rp|rt|ruby|s|samp|script|section|select|slot|small|span|strong|style|sub|summary|sup|table|tbody|td|template|textarea|tfoot|th|thead|time"
		+ "|title|tr|u|ul|var|video)$", "i");
	var rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:-]+)[^>]*)\/>/gi;

	jQuery.htmlPrefilter = function(html) {
		html.replace(rxhtmlTag, function($0, $1, $2) {
			if ( rNonVoidHtml5Tags.test($2) && $0.length < html.length ) {
				var replacement = "<" + $1 + "></" + $2 + ">";
				var noteUrl = "https://launchpad.support.sap.com/#/notes/2944336";
				var gitHubUrl = "https://github.com/SAP/openui5/blob/master/docs/self_closing_tags_fix_instructions.md";
				var errorMessage = "jQuery incompatibility: non-void HTML tags must not use self-closing syntax.\n"
					+ "HTML element used as self-closing tag: <" + $1 + "/>\n"
					+ "HTML element should be closed correctly, such as: " + replacement + "\n"
					+ "Please check the following note for more information:\n";

				var errorMessageWithUrl = errorMessage + noteUrl + " or\n" + gitHubUrl;

				/* eslint-disable no-console */
				console.error(errorMessageWithUrl);
				/* eslint-enable no-console */

				try {
					sap.ui.require(["sap/m/MessageBox", "sap/m/FormattedText", "sap/base/security/encodeXML"], function (MessageBox, FormattedText, encodeXML) {
						var messageText = new FormattedText({
							htmlText: encodeXML(errorMessage).replace(/&#xa;/g, "<br>")
								+ '<a href="' + noteUrl + '" target="_blank" rel="noopener noreferrer">' + noteUrl + '</a> or<br>'
								+ '<a href="' + gitHubUrl + '" target="_blank" rel="noopener noreferrer">' + gitHubUrl + '</a>'
						});

						MessageBox.alert(messageText, {
							title: "Incompatibility detected"
						});

					}, function() {
						/* eslint-disable no-console, no-alert */
						console.error("Showing error with UI5 controls failed. Falling back to alert().");
						setTimeout(function() {
							alert(errorMessageWithUrl);
						});
						/* eslint-enable no-console, no-alert */
					});
				} catch (err) {
					/* eslint-disable no-console, no-alert */
					console.error("Exception in error handling: " + err + ". Falling back to alert().");
					setTimeout(function() {
						alert(errorMessageWithUrl);
					});
					/* eslint-enable no-console, no-alert */
				}
			}
		});
		return html;
	};
}
// ##### END: MODIFIED BY SAP

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};

var swap = function( elem, options, callback ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.call( elem );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var rboxStyle = new RegExp( cssExpand.join( "|" ), "i" );



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		container.style.cssText = "position:absolute;left:-11111px;width:60px;" +
			"margin-top:1px;padding:0;border:0";
		div.style.cssText =
			"position:relative;display:block;box-sizing:border-box;overflow:scroll;" +
			"margin:auto;border:1px;padding:1px;" +
			"width:60%;top:1%";
		documentElement.appendChild( container ).appendChild( div );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = roundPixelMeasures( divStyle.marginLeft ) === 12;

		// Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
		// Some styles come back with percentage values, even though they shouldn't
		div.style.right = "60%";
		pixelBoxStylesVal = roundPixelMeasures( divStyle.right ) === 36;

		// Support: IE 9 - 11 only
		// Detect misreporting of content dimensions for box-sizing:border-box elements
		boxSizingReliableVal = roundPixelMeasures( divStyle.width ) === 36;

		// Support: IE 9 only
		// Detect overflow:scroll screwiness (gh-3699)
		// Support: Chrome <=64
		// Don't get tricked when zoom affects offsetWidth (gh-4029)
		div.style.position = "absolute";
		scrollboxSizeVal = roundPixelMeasures( div.offsetWidth / 3 ) === 12;

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	function roundPixelMeasures( measure ) {
		return Math.round( parseFloat( measure ) );
	}

	var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal,
		reliableTrDimensionsVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	jQuery.extend( support, {
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelBoxStyles: function() {
			computeStyleTests();
			return pixelBoxStylesVal;
		},
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		},
		scrollboxSize: function() {
			computeStyleTests();
			return scrollboxSizeVal;
		},

		// Support: IE 9 - 11+, Edge 15 - 18+
		// IE/Edge misreport `getComputedStyle` of table rows with width/height
		// set in CSS while `offset*` properties report correct values.
		// Behavior in IE 9 is more subtle than in newer versions & it passes
		// some versions of this test; make sure not to make it pass there!
		//
		// Support: Firefox 70+
		// Only Firefox includes border widths
		// in computed dimensions. (gh-4529)
		reliableTrDimensions: function() {
			var table, tr, trChild, trStyle;
			if ( reliableTrDimensionsVal == null ) {
				table = document.createElement( "table" );
				tr = document.createElement( "tr" );
				trChild = document.createElement( "div" );

				table.style.cssText = "position:absolute;left:-11111px;border-collapse:separate";
				tr.style.cssText = "border:1px solid";

				// Support: Chrome 86+
				// Height set through cssText does not get applied.
				// Computed height then comes back as 0.
				tr.style.height = "1px";
				trChild.style.height = "9px";

				// Support: Android 8 Chrome 86+
				// In our bodyBackground.html iframe,
				// display for all div elements is set to "inline",
				// which causes a problem only in Android 8 Chrome 86.
				// Ensuring the div is display: block
				// gets around this issue.
				trChild.style.display = "block";

				documentElement
					.appendChild( table )
					.appendChild( tr )
					.appendChild( trChild );

				trStyle = window.getComputedStyle( tr );
				reliableTrDimensionsVal = ( parseInt( trStyle.height, 10 ) +
					parseInt( trStyle.borderTopWidth, 10 ) +
					parseInt( trStyle.borderBottomWidth, 10 ) ) === tr.offsetHeight;

				documentElement.removeChild( table );
			}
			return reliableTrDimensionsVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,

		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

	computed = computed || getStyles( elem );

	// getPropertyValue is needed for:
	//   .css('filter') (IE 9 only, #12537)
	//   .css('--customProperty) (#3144)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !isAttached( elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelBoxStyles() && rnumnonpx.test( ret ) && rboxStyle.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style,
	vendorProps = {};

// Return a vendor-prefixed property or undefined
function vendorPropName( name ) {

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

// Return a potentially-mapped jQuery.cssProps or vendor prefixed property
function finalPropName( name ) {
	var final = jQuery.cssProps[ name ] || vendorProps[ name ];

	if ( final ) {
		return final;
	}
	if ( name in emptyStyle ) {
		return name;
	}
	return vendorProps[ name ] = vendorPropName( name ) || name;
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rcustomProp = /^--/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	};

function setPositiveNumber( _elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function boxModelAdjustment( elem, dimension, box, isBorderBox, styles, computedVal ) {
	var i = dimension === "width" ? 1 : 0,
		extra = 0,
		delta = 0;

	// Adjustment may not be necessary
	if ( box === ( isBorderBox ? "border" : "content" ) ) {
		return 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin
		if ( box === "margin" ) {
			delta += jQuery.css( elem, box + cssExpand[ i ], true, styles );
		}

		// If we get here with a content-box, we're seeking "padding" or "border" or "margin"
		if ( !isBorderBox ) {

			// Add padding
			delta += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// For "border" or "margin", add border
			if ( box !== "padding" ) {
				delta += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );

			// But still keep track of it otherwise
			} else {
				extra += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}

		// If we get here with a border-box (content + padding + border), we're seeking "content" or
		// "padding" or "margin"
		} else {

			// For "content", subtract padding
			if ( box === "content" ) {
				delta -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// For "content" or "padding", subtract border
			if ( box !== "margin" ) {
				delta -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	// Account for positive content-box scroll gutter when requested by providing computedVal
	if ( !isBorderBox && computedVal >= 0 ) {

		// offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
		// Assuming integer scroll gutter, subtract the rest and round down
		delta += Math.max( 0, Math.ceil(
			elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
			computedVal -
			delta -
			extra -
			0.5

		// If offsetWidth/offsetHeight is unknown, then we can't determine content-box scroll gutter
		// Use an explicit zero to avoid NaN (gh-3964)
		) ) || 0;
	}

	return delta;
}

function getWidthOrHeight( elem, dimension, extra ) {

	// Start with computed style
	var styles = getStyles( elem ),

		// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-4322).
		// Fake content-box until we know it's needed to know the true value.
		boxSizingNeeded = !support.boxSizingReliable() || extra,
		isBorderBox = boxSizingNeeded &&
			jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
		valueIsBorderBox = isBorderBox,

		val = curCSS( elem, dimension, styles ),
		offsetProp = "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 );

	// Support: Firefox <=54
	// Return a confounding non-pixel value or feign ignorance, as appropriate.
	if ( rnumnonpx.test( val ) ) {
		if ( !extra ) {
			return val;
		}
		val = "auto";
	}


	// Support: IE 9 - 11 only
	// Use offsetWidth/offsetHeight for when box sizing is unreliable.
	// In those cases, the computed value can be trusted to be border-box.
	if ( ( !support.boxSizingReliable() && isBorderBox ||

		// Support: IE 10 - 11+, Edge 15 - 18+
		// IE/Edge misreport `getComputedStyle` of table rows with width/height
		// set in CSS while `offset*` properties report correct values.
		// Interestingly, in some cases IE 9 doesn't suffer from this issue.
		!support.reliableTrDimensions() && nodeName( elem, "tr" ) ||

		// Fall back to offsetWidth/offsetHeight when value is "auto"
		// This happens for inline elements with no explicit setting (gh-3571)
		val === "auto" ||

		// Support: Android <=4.1 - 4.3 only
		// Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)
		!parseFloat( val ) && jQuery.css( elem, "display", false, styles ) === "inline" ) &&

		// Make sure the element is visible & connected
		elem.getClientRects().length ) {

		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

		// Where available, offsetWidth/offsetHeight approximate border box dimensions.
		// Where not available (e.g., SVG), assume unreliable box-sizing and interpret the
		// retrieved value as a content box dimension.
		valueIsBorderBox = offsetProp in elem;
		if ( valueIsBorderBox ) {
			val = elem[ offsetProp ];
		}
	}

	// Normalize "" and auto
	val = parseFloat( val ) || 0;

	// Adjust for the element's box model
	return ( val +
		boxModelAdjustment(
			elem,
			dimension,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles,

			// Provide the current computed size to request scroll gutter calculation (gh-3589)
			val
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"gridArea": true,
		"gridColumn": true,
		"gridColumnEnd": true,
		"gridColumnStart": true,
		"gridRow": true,
		"gridRowEnd": true,
		"gridRowStart": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name ),
			style = elem.style;

		// Make sure that we're working with the right name. We don't
		// want to query the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			// The isCustomProp check can be removed in jQuery 4.0 when we only auto-append
			// "px" to a few hardcoded values.
			if ( type === "number" && !isCustomProp ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				if ( isCustomProp ) {
					style.setProperty( name, value );
				} else {
					style[ name ] = value;
				}
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name );

		// Make sure that we're working with the right name. We don't
		// want to modify the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}

		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( _i, dimension ) {
	jQuery.cssHooks[ dimension ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
					swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, dimension, extra );
					} ) :
					getWidthOrHeight( elem, dimension, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = getStyles( elem ),

				// Only read styles.position if the test has a chance to fail
				// to avoid forcing a reflow.
				scrollboxSizeBuggy = !support.scrollboxSize() &&
					styles.position === "absolute",

				// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-3991)
				boxSizingNeeded = scrollboxSizeBuggy || extra,
				isBorderBox = boxSizingNeeded &&
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
				subtract = extra ?
					boxModelAdjustment(
						elem,
						dimension,
						extra,
						isBorderBox,
						styles
					) :
					0;

			// Account for unreliable border-box dimensions by comparing offset* to computed and
			// faking a content-box to get border and padding (gh-3699)
			if ( isBorderBox && scrollboxSizeBuggy ) {
				subtract -= Math.ceil(
					elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
					parseFloat( styles[ dimension ] ) -
					boxModelAdjustment( elem, dimension, "border", false, styles ) -
					0.5
				);
			}

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ dimension ] = value;
				value = jQuery.css( elem, dimension );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
			) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( prefix !== "margin" ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( Array.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 && (
				jQuery.cssHooks[ tween.prop ] ||
					tween.elem.style[ finalPropName( tween.prop ) ] != null ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, inProgress,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function schedule() {
	if ( inProgress ) {
		if ( document.hidden === false && window.requestAnimationFrame ) {
			window.requestAnimationFrame( schedule );
		} else {
			window.setTimeout( schedule, jQuery.fx.interval );
		}

		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = Date.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 15
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY and Edge just mirrors
		// the overflowX value there.
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

				/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( Array.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			// If there's more to do, yield
			if ( percent < 1 && length ) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if ( !length ) {
				deferred.notifyWith( elem, [ animation, 1, 0 ] );
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith( elem, [ animation ] );
			return false;
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
					animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					result.stop.bind( result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	// Attach callbacks from options
	animation
		.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	return animation;
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !isFunction( easing ) && easing
	};

	// Go to the end state if fx are off
	if ( jQuery.fx.off ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};

		doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( _i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = Date.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Run the timer and safely remove it when done (allowing for external removal)
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	jQuery.fx.start();
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( inProgress ) {
		return;
	}

	inProgress = true;
	schedule();
};

jQuery.fx.stop = function() {
	inProgress = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		},
		// ##### BEGIN: MODIFIED BY SAP
		// CSP Modification - remove inline style
		// hook for $.attr(): use the style property instead of setAttribute("style", ...)
		style: {
			set: function( elem, value ) {
				return elem.style = value + "";
			}
		}
		// ##### END: MODIFIED BY SAP
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				// ##### BEGIN: MODIFIED BY SAP
				// Avoid CSP violation in Safari 14ff (https://bugs.webkit.org/show_bug.cgi?id=227349)
				// elem.removeAttribute( name );
				if ( name === "style" ) {
					elem.style = "";
				} else {
					elem.removeAttribute( name );
				}
				// ##### END: MODIFIED BY SAP
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( _i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

function classesToArray( value ) {
	if ( Array.isArray( value ) ) {
		return value;
	}
	if ( typeof value === "string" ) {
		return value.match( rnothtmlwhite ) || [];
	}
	return [];
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isValidValue = type === "string" || Array.isArray( value );

		if ( typeof stateVal === "boolean" && isValidValue ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( isValidValue ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = classesToArray( value );

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
							"" :
							dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
				return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, valueIsFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		valueIsFunction = isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( valueIsFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( Array.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( Array.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion

// ##### BEGIN: MODIFIED BY SAP
//
// The following line is deleted as a fix for a known issue. The fix is only available in
// jQuery's master branch and it's needed to be manually patched here.
//
// The fix: https://github.com/jquery/jquery/commit/8a741376937dfacf9f82b2b88f93b239fe267435.
// The issue:  https://github.com/jquery/jquery/issues/4382.
//
// support.focusin = "onfocusin" in window;
//
// ##### END: MODIFIED BY SAP


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	stopPropagationCallback = function( e ) {
		e.stopPropagation();
	};

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special, lastElement,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = lastElement = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {
			lastElement = cur;
			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || Object.create( null ) )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && isFunction( elem[ type ] ) && !isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;

					if ( event.isPropagationStopped() ) {
						lastElement.addEventListener( type, stopPropagationCallback );
					}

					elem[ type ]();

					if ( event.isPropagationStopped() ) {
						lastElement.removeEventListener( type, stopPropagationCallback );
					}

					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
//
// ##### BEGIN: MODIFIED BY SAP
// The following lines are deleted as a fix for a known issue. The fix is only available in
// jQuery's master branch and it's needed to be manually patched here.
//
// The fix: https://github.com/jquery/jquery/commit/8a741376937dfacf9f82b2b88f93b239fe267435.
// The issue:  https://github.com/jquery/jquery/issues/4382.
//
// if ( !support.focusin ) {
// 	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {
//
// 		// Attach a single capturing handler on the document while someone wants focusin/focusout
// 		var handler = function( event ) {
// 			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
// 		};
//
// 		jQuery.event.special[ fix ] = {
// 			setup: function() {
//
// 				// Handle: regular nodes (via `this.ownerDocument`), window
// 				// (via `this.document`) & document (via `this`).
// 				var doc = this.ownerDocument || this.document || this,
// 					attaches = dataPriv.access( doc, fix );
//
// 				if ( !attaches ) {
// 					doc.addEventListener( orig, handler, true );
// 				}
// 				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
// 			},
// 			teardown: function() {
// 				var doc = this.ownerDocument || this.document || this,
// 					attaches = dataPriv.access( doc, fix ) - 1;
//
// 				if ( !attaches ) {
// 					doc.removeEventListener( orig, handler, true );
// 					dataPriv.remove( doc, fix );
//
// 				} else {
// 					dataPriv.access( doc, fix, attaches );
// 				}
// 			}
// 		};
// 	} );
// }
//
// ##### END: MODIFIED BY SAP

var location = window.location;

var nonce = { guid: Date.now() };

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, parserErrorElem;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {}

	parserErrorElem = xml && xml.getElementsByTagName( "parsererror" )[ 0 ];
	if ( !xml || parserErrorElem ) {
		jQuery.error( "Invalid XML: " + (
			parserErrorElem ?
				jQuery.map( parserErrorElem.childNodes, function( el ) {
					return el.textContent;
				} ).join( "\n" ) :
				data
		) );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( Array.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && toType( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	if ( a == null ) {
		return "";
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} ).filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} ).map( function( _i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( Array.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );

originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() + " " ] =
									( responseHeaders[ match[ 1 ].toLowerCase() + " " ] || [] )
										.concat( match[ 2 ] );
							}
						}
						match = responseHeaders[ key.toLowerCase() + " " ];
					}
					return match == null ? null : match.join( ", " );
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 15
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available and should be processed, append data to url
			if ( s.data && ( s.processData || typeof s.data === "string" ) ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce.guid++ ) +
					uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Use a noop converter for missing script but not if jsonp
			if ( !isSuccess &&
				jQuery.inArray( "script", s.dataTypes ) > -1 &&
				jQuery.inArray( "json", s.dataTypes ) < 0 ) {
				s.converters[ "text script" ] = function() {};
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( _i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );

jQuery.ajaxPrefilter( function( s ) {
	var i;
	for ( i in s.headers ) {
		if ( i.toLowerCase() === "content-type" ) {
			s.contentType = s.headers[ i ] || "";
		}
	}
} );


jQuery._evalUrl = function( url, options, doc ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,

		// Only evaluate the response if it is successful (gh-4126)
		// dataFilter is not invoked for failure responses, so using it instead
		// of the default converter is kludgy but it works.
		converters: {
			"text script": function() {}
		},
		dataFilter: function( response ) {
			jQuery.globalEval( response, options, doc );
		}
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var htmlIsFunction = isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( htmlIsFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.ontimeout =
									xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = xhr.ontimeout = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain or forced-by-attrs requests
	if ( s.crossDomain || s.scriptAttrs ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" )
					.attr( s.scriptAttrs || {} )
					.prop( { charset: s.scriptCharset, src: s.url } )
					.on( "load error", callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					} );

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce.guid++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// ##### BEGIN: MODIFIED BY SAP
			// Explicitely set domain to allow elements created with this document
			// to be inserted into the parent document in IE11
			if (context.domain !== document.domain) {
				context.domain = document.domain;
			}
			// ##### END: MODIFIED BY SAP

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

// ##### BEGIN: MODIFIED BY SAP
// Support: IE <= 11
// IE <= 11 throws an error when running getBoundingClientRect on a disconnected node
support.safeBoundingClientRect = ( function() {
	var el = document.createElement( "div" );

	try {
		return !!el.getBoundingClientRect();
	} catch ( e ) {
		return false;
	} finally {
		// release memory in IE
		el = null;
	}
} )();
// ##### END: MODIFIED BY SAP

jQuery.fn.extend( {

	// offset() relates an element's border box to the document origin
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var rect, win,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		// ##### BEGIN: MODIFIED BY SAP
		// Safari returns an empty DOMRectList when 'getClientRects' is called on SVG child element.
		// Therefore a wrong offset is returned for any child element of a SVG element in Safari.
		// Because the call of 'getClientRects' is only needed for IE to avoid throwing an error
		// when running getBoundingClientRect on a disconnected node, the 'safeBoundingClientect'
		// support flag is checked to make 'offset' work for the child elements in SVG element in
		// Safari.
		if ( !support.safeBoundingClientRect && !elem.getClientRects().length ) {
		// ##### END: MODIFIED BY SAP
			return { top: 0, left: 0 };
		}

		// Get document-relative position by adding viewport scroll to viewport-relative gBCR
		rect = elem.getBoundingClientRect();
		win = elem.ownerDocument.defaultView;
		return {
			top: rect.top + win.pageYOffset,
			left: rect.left + win.pageXOffset
		};
	},

	// position() relates an element's margin box to its offset parent's padding box
	// This corresponds to the behavior of CSS absolute positioning
	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset, doc,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// position:fixed elements are offset from the viewport, which itself always has zero offset
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume position:fixed implies availability of getBoundingClientRect
			offset = elem.getBoundingClientRect();

		} else {
			offset = this.offset();

			// Account for the *real* offset parent, which can be the document or its root element
			// when a statically positioned element is identified
			doc = elem.ownerDocument;
			// ##### BEGIN: MODIFIED BY SAP
			// the "offsetParent" property of HTMLElement returns an td, th, table ancestor even when
			// ancestor element has a a"static" CSS position. The jQuery.fn.offsetParent method can
			// handle this case correctly.
			//
			// There's a bug report opened for this issue which is currently in process:
			// https://github.com/jquery/jquery/issues/4431
			offsetParent = this.offsetParent()[0];
			// ##### END: MODIFIED BY SAP

			while ( offsetParent &&
				( offsetParent === doc.body || offsetParent === doc.documentElement ) &&
				jQuery.css( offsetParent, "position" ) === "static" ) {

				offsetParent = offsetParent.parentNode;
			}
			if ( offsetParent && offsetParent !== elem && offsetParent.nodeType === 1 ) {

				// Incorporate borders into its offset, since they are outside its content origin
				parentOffset = jQuery( offsetParent ).offset();
				parentOffset.top += jQuery.css( offsetParent, "borderTopWidth", true );
				parentOffset.left += jQuery.css( offsetParent, "borderLeftWidth", true );
			}
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {

			// Coalesce documents and windows
			var win;
			if ( isWindow( elem ) ) {
				win = elem;
			} else if ( elem.nodeType === 9 ) {
				win = elem.defaultView;
			}

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( _i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( {
		padding: "inner" + name,
		content: type,
		"": "outer" + name
	}, function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( _i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );

jQuery.each(
	( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( _i, name ) {

		// Handle event binding
		jQuery.fn[ name ] = function( data, fn ) {
			return arguments.length > 0 ?
				this.on( name, null, data, fn ) :
				this.trigger( name );
		};
	}
);




// Support: Android <=4.0 only
// Make sure we trim BOM and NBSP
var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

// Bind a function to a context, optionally partially applying any
// arguments.
// jQuery.proxy is deprecated to promote standards (specifically Function#bind)
// However, it is not slated for removal any time soon
jQuery.proxy = function( fn, context ) {
	var tmp, args, proxy;

	if ( typeof context === "string" ) {
		tmp = fn[ context ];
		context = fn;
		fn = tmp;
	}

	// Quick check to determine if target is callable, in the spec
	// this throws a TypeError, but we will just return undefined.
	if ( !isFunction( fn ) ) {
		return undefined;
	}

	// Simulated bind
	args = slice.call( arguments, 2 );
	proxy = function() {
		return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
	};

	// Set the guid of unique handler to the same of original handler, so it can be removed
	proxy.guid = fn.guid = fn.guid || jQuery.guid++;

	return proxy;
};

jQuery.holdReady = function( hold ) {
	if ( hold ) {
		jQuery.readyWait++;
	} else {
		jQuery.ready( true );
	}
};
jQuery.isArray = Array.isArray;
jQuery.parseJSON = JSON.parse;
jQuery.nodeName = nodeName;
jQuery.isFunction = isFunction;
jQuery.isWindow = isWindow;
jQuery.camelCase = camelCase;
jQuery.type = toType;

jQuery.now = Date.now;

jQuery.isNumeric = function( obj ) {

	// As of jQuery 3.0, isNumeric is limited to
	// strings and numbers (primitives or objects)
	// that can be coerced to finite numbers (gh-2662)
	var type = jQuery.type( obj );
	return ( type === "number" || type === "string" ) &&

		// parseFloat NaNs numeric-cast false positives ("")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		!isNaN( obj - parseFloat( obj ) );
};

jQuery.trim = function( text ) {
	return text == null ?
		"" :
		( text + "" ).replace( rtrim, "" );
};



// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === "undefined" ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;
} );

// ##### BEGIN: MODIFIED BY SAP
// call compat-layer factory in case the compat-layer was registered globally before jQuery was loaded
if (window.sap && window.sap.ui && window.sap.ui._jQuery3Compat) {
	sap.ui._jQuery3Compat._factory(jQuery, window);
}
// ##### END: MODIFIED BY SAP
}
});
//# sourceMappingURL=Eventing-preload-1.js.map
