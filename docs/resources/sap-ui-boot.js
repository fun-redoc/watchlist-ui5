//@ui5-bundle sap-ui-boot.js
window["sap-ui-optimized"] = true;
try {
//@ui5-bundle-raw-include ui5loader.js
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/*
 * IMPORTANT NOTICE
 * With 1.54, ui5loader.js and its new features are not yet a public API.
 * The loader must only be used via the well-known and documented UI5 APIs
 * such as sap.ui.define, sap.ui.require, etc.
 * Any direct usage of ui5loader.js or its features is not supported and
 * might break in future releases.
 */

/*global sap:true, Blob, console, document, Promise, URL, XMLHttpRequest */

(function(__global) {
	"use strict";

	/*
	 * Helper function that removes any query and/or hash parts from the given URL.
	 *
	 * @param {string} href URL to remove query and hash from
	 * @returns {string}
	 */
	function pathOnly(href) {
		const p = href.search(/[?#]/);
		return p < 0 ? href : href.slice(0, p);
	}

	/**
	 * Resolve a given URL, either against the base URL of the current document or against a given base URL.
	 *
	 * If no base URL is given, the URL will be resolved relative to the baseURI of the current document.
	 * If a base URL is given, that base will first be resolved relative to the document's baseURI,
	 * then the URL will be resolved relative to the resolved base.
	 *
	 * Search parameters or a hash of the chosen base will be ignored.
	 *
	 * @param {string} sURI Relative or absolute URL that should be resolved
	 * @param {string} [sBase=document.baseURI] Base URL relative to which the URL should be resolved
	 * @returns {string} Resolved URL
	 */
	function resolveURL(sURI, sBase) {
		sBase = pathOnly(sBase ? resolveURL(sBase) : document.baseURI);
		return new URL(sURI, sBase).href;
	}

	// ---- helpers -------------------------------------------------------------------------------

	function noop() {}

	function forEach(obj, callback) {
		Object.keys(obj).forEach((key) => callback(key, obj[key]));
	}

	function executeInSeparateTask(fn) {
		setTimeout(fn, 0);
	}

	function executeInMicroTask(fn) {
		Promise.resolve().then(fn);
	}

	// ---- hooks & configuration -----------------------------------------------------------------

	const aEarlyLogs = [];

	function earlyLog(level, message) {
		aEarlyLogs.push({
			level,
			message
		});
	}

	/**
	 * Log functionality.
	 *
	 * Can be set to an object with the methods shown below (subset of sap/base/Log).
	 * Logging methods never must fail. Should they ever throw errors, then the internal state
	 * of the loader will be broken.
	 *
	 * By default, all methods are implemented as NOOPs.
	 *
	 * @type {{debug:function(),info:function(),warning:function(),error:function(),isLoggable:function():boolean}}
	 * @private
	 */

	let log = {
		debug: earlyLog.bind(this, 'debug'),
		info: earlyLog.bind(this, 'info'),
		warning: earlyLog.bind(this, 'warning'),
		error: earlyLog.bind(this, 'error'),
		isLoggable: noop
	};

	/**
	 * Basic assert functionality.
	 *
	 * Can be set to a function that gets a value (the expression to be asserted) as first
	 * parameter and a message as second parameter. When the expression coerces to false,
	 * the assertion is violated and the message should be emitted (logged, thrown, whatever).
	 *
	 * By default, this is implemented as a NOOP.
	 * @type {function(any,string)}
	 * @private
	 */
	let assert = noop; // Null Object pattern: dummy assert which is used as long as no assert is injected

	/**
	 * Callback for performance measurement.
	 *
	 * When set, it must be an object with methods <code>start</code> and <code>end</code>.
	 * @type {{start:function(string,any),end:function(string)}}
	 * @private
	 */
	let measure;

	/**
	 * Source code transformation hook.
	 *
	 * To be used by code coverage, only supported in sync mode.
	 * @private
	 * @ui5-transform-hint replace-local undefined
	 */
	let translate;

	/**
	 * Method used by sap.ui.require to simulate asynchronous behavior.
	 *
	 * The default executes the given function in a separate browser task.
	 * Can be changed to execute in a micro task to save idle time in case of
	 * many nested sap.ui.require calls.
	 */
	let simulateAsyncCallback = executeInSeparateTask;

	/*
	 * Activates strictest possible compliance with AMD spec
	 * - no multiple executions of the same module
	 * - at most one anonymous module definition per file, zero for adhoc definitions
	 */
	const strictModuleDefinitions = true;

	/**
	 * Whether asynchronous loading can be used at all.
	 * When activated, require will load asynchronously, else synchronously.
	 * @type {boolean}
	 * @private
	 * @ui5-transform-hint replace-local true
	 */
	let bGlobalAsyncMode = false;


	/**
	 * Whether ui5loader currently exposes its AMD implementation as global properties
	 * <code>define</code> and <code>require</code>. Defaults to <code>false</code>.
	 * @type {boolean}
	 * @private
	 */
	let bExposeAsAMDLoader = false;

	/**
	 * How the loader should react to calls of sync APIs or when global names are accessed:
	 * 0: tolerate
	 * 1: warn
	 * 2: reject
	 * @type {int}
	 * @private
	 */
	let syncCallBehavior = 0;

	/**
	 * Default base URL for modules, used when no other configuration is provided.
	 * In case the base url is removed via <code>registerResourcePath("", null)</code>
	 * it will be reset to this URL instead.
	 * @const
	 * @type {string}
	 * @private
	 */
	const DEFAULT_BASE_URL = "./";

	/**
	 * Temporarily saved reference to the original value of the global define variable.
	 *
	 * @type {any}
	 * @private
	 */
	let vOriginalDefine;

	/**
	 * Temporarily saved reference to the original value of the global require variable.
	 *
	 * @type {any}
	 * @private
	 */
	let vOriginalRequire;


	/**
	 * A map of URL prefixes keyed by the corresponding module name prefix.
	 *
	 * Note that the empty prefix ('') will always match and thus serves as a fallback.
	 * See {@link sap.ui.loader.config}, option <code>paths</code>.
	 * @type {Object<string,{url:string,absoluteUrl:string}>}
	 * @private
	 */
	const mUrlPrefixes = Object.create(null);
	mUrlPrefixes[''] = {
		url: DEFAULT_BASE_URL,
		absoluteUrl: resolveURL(DEFAULT_BASE_URL)
	};

	/**
	 * Mapping of module IDs.
	 *
	 * Each entry is a map of its own, keyed by the module ID prefix for which it should be
	 * applied. Each contained map maps module ID prefixes to module ID prefixes.
	 *
	 * All module ID prefixes must not have extensions.
	 * @type {Object.<string,Object.<string,string>>}
	 * @private
	 */
	const mMaps = Object.create(null);

	/**
	 * Information about third party modules, keyed by the module's resource name (including extension '.js').
	 *
	 * Each module shim object can have the following properties:
	 * <ul>
	 * <li><i>boolean</i>: [amd=false] Whether the module uses an AMD loader if present. If set to <code>true</code>,
	 *     UI5 will disable an AMD loader while loading such a module to force the module to expose its content
	 *     via global names.</li>
	 * <li><i>string[]|string</i>: [exports=undefined] Global name (or names) that are exported by the module.
	 *     If one ore multiple names are defined, the first one will be read from the global object and will be
	 *     used as value of the module. Each name can be a dot separated hierarchical name (will be resolved with
	 *     <code>getGlobalProperty</code>)</li>
	 * <li><i>string[]</i>: [deps=undefined] List of modules that the module depends on. The modules will be loaded
	 *     first before loading the module itself. Note that the stored dependencies also include the extension '.js'
	 *     for easier evaluation, but <code>config({shim:...})</code> expects them without the extension for
	 *     compatibility with the AMD-JS specification.</li>
	 * </ul>
	 *
	 * @see config method
	 * @type {Object.<string,{amd:boolean,exports:(string|string[]),deps:string[]}>}
	 * @private
	 */
	const mShims = Object.create(null);

	/**
	 * Dependency Cache information.
	 * Maps the name of a module to a list of its known dependencies.
	 * @type {Object.<string,string[]>}
	 * @private
	 */
	const mDepCache = Object.create(null);

	/**
	 * Whether the loader should try to load debug sources.
	 * @type {boolean}
	 * @private
	 */
	let bDebugSources = false;

	/**
	 * Indicates partial or total debug mode.
	 *
	 * Can be set to a function which checks whether preloads should be ignored for the given module.
	 * If undefined, all preloads will be used.
	 * @type {function(string):boolean|undefined}
	 * @private
	 */
	let fnIgnorePreload;

	/**
	 * Whether the loader should try to load the debug variant
	 * of a module.
	 * This takes the standard and partial debug mode into account.
	 *
	 * @param {string} sModuleName Name of the module to be loaded
	 * @returns {boolean} Whether the debug variant should be loaded
	 */
	function shouldLoadDebugVariant(sModuleName) {
		if (fnIgnorePreload) {
			// if preload is ignored (= partial debug mode), load the debug module first
			if (fnIgnorePreload(sModuleName)) {
				return true;
			} else {
				// partial debug mode is active, but not for this module
				return false;
			}
		} else {
			// no debug mode or standard debug mode
			return bDebugSources;
		}
	}

	// ---- internal state ------------------------------------------------------------------------

	/**
	 * Map of modules that have been loaded or required so far, keyed by their name.
	 *
	 * @type {Object<string,Module>}
	 * @private
	 */
	const mModules = Object.create(null);

	/**
	 * Whether (sap.ui.)define calls must be executed synchronously in the current context.
	 *
	 * The initial value is <code>null</code>. During the execution of a module loading operation
	 * ((sap.ui.)require or (sap.ui.)define etc.), it is set to true or false depending on the
	 * legacy synchronicity behavior of the operation.
	 *
	 * Problem: when AMD modules are loaded with hard coded script tags and when some later inline
	 * script expects the module export synchronously, then the (sap.ui.)define must be executed
	 * synchronously.
	 * Most prominent example: unit tests that include QUnitUtils as a script tag and use qutils
	 * in one of their inline scripts.
	 * @type {boolean|null}
	 * @private
	 */
	let bForceSyncDefines = null;

	/**
	 * Stack of modules that are currently being executed in case of synchronous processing.
	 *
	 * Allows to identify the executing module (e.g. when resolving dependencies or in case of
	 * bundles like sap-ui-core).
	 *
	 * @type {Array.<{name:string,used:boolean}>}
	 * @private
	 */
	const _execStack = [ ];

	/**
	 * A prefix that will be added to module loading log statements and which reflects the nesting of module executions.
	 * @type {string}
	 * @private
	 */
	let sLogPrefix = "";

	/**
	 * Counter used to give anonymous modules a unique module ID.
	 * @type {int}
	 * @private
	 */
	let iAnonymousModuleCount = 0;

	// ---- break preload execution into tasks ----------------------------------------------------

	/**
	 * Default value for `iMaxTaskDuration`.
	 *
	 * A value of -1 switched the scheduling off, a value of zero postpones each execution
	 */
	const DEFAULT_MAX_TASK_DURATION = -1; // off

	/**
	 * Maximum accumulated task execution time (threshold)
	 * Can be configured via the private API property `maxTaskDuration`.
	 */
	let iMaxTaskDuration = DEFAULT_MAX_TASK_DURATION;

	/**
	 * The earliest elapsed time at which a new browser task will be enforced.
	 * Will be updated when a new task starts.
	 */
	let iMaxTaskTime = Date.now() + iMaxTaskDuration;

	/**
	 * A promise that fulfills when the new browser task has been reached.
	 * All postponed callback executions will be executed after this promise.
	 * `null` as long as the elapsed time threshold is not reached.
	 */
	let pWaitForNextTask;

	/**
	 * Message channel which will be used to create a new browser task
	 * without being subject to timer throttling.
	 * Will be created lazily on first usage.
	 */
	let oNextTaskMessageChannel;

	/**
	 * Update elapsed time threshold.
	 *
	 * The threshold will be updated only if executions currently are not postponed.
	 * Otherwise, the next task will anyhow update the threshold.
	 */
	function updateMaxTaskTime() {
		if ( pWaitForNextTask == null ) {
			iMaxTaskTime = Date.now() + iMaxTaskDuration;
		}
	}

	/**
	 * Update duration limit and elapsed time threshold.
	 */
	function updateMaxTaskDuration(v) {
		v = Number(v);

		const iBeginOfCurrentTask = iMaxTaskTime - iMaxTaskDuration;

		// limit to range [-1 ... Infinity], any other value incl. NaN restores the default
		iMaxTaskDuration = v >= -1 ? v : DEFAULT_MAX_TASK_DURATION;

		// Update the elapsed time threshold only if executions currently are not postponed.
		// Otherwise, the next task will be the first to honor the new maximum duration.
		if ( pWaitForNextTask == null ) {
			iMaxTaskTime = iBeginOfCurrentTask + iMaxTaskDuration;
		}
	}

	function waitForNextTask() {
		if ( pWaitForNextTask == null ) {
			/**
			 * Post a message to a MessageChannel to create a new task, without suffering from timer throttling
			 * In the new task, use a setTimeout(,0) to allow for better queuing of other events (like CSS loading)
			 */
			pWaitForNextTask = new Promise(function(resolve) {
				if ( oNextTaskMessageChannel == null ) {
					oNextTaskMessageChannel = new MessageChannel();
					oNextTaskMessageChannel.port2.start();
				}
				oNextTaskMessageChannel.port2.addEventListener("message", function() {
					setTimeout(function() {
						pWaitForNextTask = null;
						iMaxTaskTime = Date.now() + iMaxTaskDuration;
						resolve();
					}, 0);
				}, {
					once: true
				});
				oNextTaskMessageChannel.port1.postMessage(null);
			});
		}
		return pWaitForNextTask;
	}

	/**
	 * Creates a function which schedules the execution of the given callback.
	 *
	 * The scheduling tries to limit the duration of browser tasks. When the configurable
	 * limit is reached, the creation of a new browser task is triggered and all subsequently
	 * scheduled callbacks will be postponed until the new browser task starts executing.
	 * In the new browser task, scheduling starts anew.
	 *
	 * The limit for the duration of browser tasks is configured via `iMaxTaskDuration`.
	 * By setting `iMaxTaskDuration` to a negative value, the whole scheduling mechanism is
	 * switched off. In that case, the returned function will execute the callback immediately.
	 *
	 * If a value of zero is set, each callback will be executed in a separate browser task.
	 * For preloaded modules, this essentially mimics the browser behavior of single file loading,
	 * but without the network and server delays.
	 *
	 * For larger values, at least one callback will be executed in each new browser task. When,
	 * after the execution of the callback, the configured threshold has been reached, all further
	 * callbacks will be postponed.
	 *
	 * Note: This is a heuristic only. Neither is the measurement of the task duration accurate,
	 * nor is there a way to know in advance the execution time of a callback.
	 *
	 * @param {function(any):void} fnCallback
	 *    Function to schedule
	 * @returns {function(any):void}
	 *    A function to call instead of the original callback; it takes care of scheduling
	 *    and executing the original callback.
	 * @private
	 */
	function scheduleExecution(fnCallback) {
		if ( iMaxTaskDuration < 0 ) {
			return fnCallback;
		}
		return function() {
			if ( pWaitForNextTask == null ) {
				fnCallback.call(undefined, arguments[0]);

				// if time limit is reached now, postpone future task
				if ( Date.now() >= iMaxTaskTime ) {
					waitForNextTask();
				}
				return;
			}
			pWaitForNextTask.then(scheduleExecution(fnCallback).bind(undefined, arguments[0]));
		};
	}

	// ---- Names and Paths -----------------------------------------------------------------------

	/**
	 * Name conversion function that converts a name in unified resource name syntax to a name in UI5 module name syntax.
	 * If the name cannot be converted (e.g. doesn't end with '.js'), then <code>undefined</code> is returned.
	 *
	 * @param {string} sName Name in unified resource name syntax
	 * @returns {string|undefined} Name in UI5 (legacy) module name syntax (dot separated)
	 *   or <code>undefined</code> when the name can't be converted
	 * @private
	 */
	function urnToUI5(sName) {
		// UI5 module name syntax is only defined for JS resources
		if ( !/\.js$/.test(sName) ) {
			return undefined;
		}

		sName = sName.slice(0, -3);
		if ( /^jquery\.sap\./.test(sName) ) {
			return sName; // do nothing
		}
		return sName.replace(/\//g, ".");
	}

	function urnToIDAndType(sResourceName) {
		const basenamePos = sResourceName.lastIndexOf('/');
		const dotPos = sResourceName.lastIndexOf('.');

		if ( dotPos > basenamePos ) {
			return {
				id: sResourceName.slice(0, dotPos),
				type: sResourceName.slice(dotPos)
			};
		}
		return {
			id: sResourceName,
			type: ''
		};
	}

	const rJSSubTypes = /(\.controller|\.fragment|\.view|\.designtime|\.support)?.js$/;

	function urnToBaseIDAndSubType(sResourceName) {
		const m = rJSSubTypes.exec(sResourceName);
		if ( m ) {
			return {
				baseID: sResourceName.slice(0, m.index),
				subType: m[0]
			};
		}
	}

	const rDotSegmentAnywhere = /(?:^|\/)\.+(?=\/|$)/;
	const rDotSegment = /^\.*$/;

	/**
	 * Normalizes a resource name by resolving any relative name segments.
	 *
	 * A segment consisting of a single dot <code>./</code>, when used at the beginning of a name refers
	 * to the containing package of the <code>sBaseName</code>. When used inside a name, it is ignored.
	 *
	 * A segment consisting of two dots <code>../</code> refers to the parent package. It can be used
	 * anywhere in a name, but the resolved name prefix up to that point must not be empty.
	 *
	 * Example: A name <code>../common/validation.js</code> defined in <code>sap/myapp/controller/mycontroller.controller.js</code>
	 * will resolve to <code>sap/myapp/common/validation.js</code>.
	 *
	 * When <code>sBaseName</code> is <code>null</code> (e.g. for a <code>sap.ui.require</code> call),
	 * the resource name must not start with a relative name segment or an error will be thrown.
	 *
	 * @param {string} sResourceName Name to resolve
	 * @param {string|null} sBaseName Name of a reference module relative to which the name will be resolved
	 * @returns {string} Resolved name
	 * @throws {Error} When a relative name should be resolved but not basename is given;
	 *   or when upward navigation (../) is requested on the root level
	 *   or when a name segment consists of 3 or more dots only
	 * @private
	 */
	function normalize(sResourceName, sBaseName) {

		const p = sResourceName.search(rDotSegmentAnywhere);

		// check whether the name needs to be resolved at all - if not, just return the sModuleName as it is.
		if ( p < 0 ) {
			return sResourceName;
		}

		// if the name starts with a relative segment then there must be a base name (a global sap.ui.require doesn't support relative names)
		if ( p === 0 ) {
			if ( sBaseName == null ) {
				throw new Error("relative name not supported ('" + sResourceName + "'");
			}
			// prefix module name with the parent package
			sResourceName = sBaseName.slice(0, sBaseName.lastIndexOf('/') + 1) + sResourceName;
		}

		const aSegments = sResourceName.split('/');

		// process path segments
		let j = 0;
		const l = aSegments.length;
		for (let i = 0; i < l; i++) {

			const sSegment = aSegments[i];

			if ( rDotSegment.test(sSegment) ) {
				if (sSegment === '.' || sSegment === '') {
					// ignore '.' as it's just a pointer to current package. ignore '' as it results from double slashes (ignored by browsers as well)
					continue;
				} else if (sSegment === '..') {
					// move to parent directory
					if ( j === 0 ) {
						throw new Error("Can't navigate to parent of root ('" + sResourceName + "')");
					}
					j--;
				} else {
					throw new Error("Illegal path segment '" + sSegment + "' ('" + sResourceName + "')");
				}
			} else {
				aSegments[j++] = sSegment;
			}

		}

		aSegments.length = j;

		return aSegments.join('/');
	}

	/**
	 * Adds a resource path to the resources map.
	 *
	 * @param {string} sResourceNamePrefix prefix is used as map key
	 * @param {string} sUrlPrefix path to the resource
	 */
	function registerResourcePath(sResourceNamePrefix, sUrlPrefix) {
		sResourceNamePrefix = String(sResourceNamePrefix || "");

		if ( sUrlPrefix == null ) {

			// remove a registered URL prefix, if it wasn't for the empty resource name prefix
			if ( sResourceNamePrefix ) {
				if ( mUrlPrefixes[sResourceNamePrefix] ) {
					delete mUrlPrefixes[sResourceNamePrefix];
					log.info(`registerResourcePath ('${sResourceNamePrefix}') (registration removed)`);
				}
				return;
			}

			// otherwise restore the default
			sUrlPrefix = DEFAULT_BASE_URL;
			log.info(`registerResourcePath ('${sResourceNamePrefix}') (default registration restored)`);

		}

		// cast to string and remove query parameters and/or hash
		sUrlPrefix = pathOnly(String(sUrlPrefix));

		// ensure that the prefix ends with a '/'
		if ( sUrlPrefix.slice(-1) !== '/' ) {
			sUrlPrefix += '/';
		}

		mUrlPrefixes[sResourceNamePrefix] = {
			url: sUrlPrefix,
			// calculate absolute URL, only to be used by 'guessResourceName'
			absoluteUrl: resolveURL(sUrlPrefix)
		};
	}

	/**
	 * Retrieves path to a given resource by finding the longest matching prefix for the resource name
	 *
	 * @param {string} sResourceName name of the resource stored in the resources map
	 * @param {string} sSuffix url suffix
	 *
	 * @returns {string} resource path
	 */
	function getResourcePath(sResourceName, sSuffix) {

		let sNamePrefix = sResourceName;
		let p = sResourceName.length;

		// search for a registered name prefix, starting with the full name and successively removing one segment
		while ( p > 0 && !mUrlPrefixes[sNamePrefix] ) {
			p = sNamePrefix.lastIndexOf('/');
			// Note: an empty segment at p = 0 (leading slash) will be ignored
			sNamePrefix = p > 0 ? sNamePrefix.slice(0, p) : '';
		}

		assert((p > 0 || sNamePrefix === '') && mUrlPrefixes[sNamePrefix], "there always must be a mapping");

		let sPath = mUrlPrefixes[sNamePrefix].url + sResourceName.slice(p + 1); // also skips a leading slash!

		//remove trailing slash
		if ( sPath.slice(-1) === '/' ) {
			sPath = sPath.slice(0, -1);
		}
		return sPath + (sSuffix || '');

	}

	/**
	 * Returns the reporting mode for synchronous calls
	 *
	 * @returns {int} sync call behavior
	 */
	function getSyncCallBehavior() {
		return syncCallBehavior;
	}

	/**
	 * Try to find a resource name that would be mapped to the given URL.
	 *
	 * If multiple path mappings would create a match, the returned name is not necessarily
	 * the best (longest) match. The first match which is found, will be returned.
	 *
	 * When <code>bLoadedResourcesOnly</code> is set, only those resources will be taken
	 * into account for which content has been loaded already.
	 *
	 * @param {string} sURL URL to guess the resource name for
	 * @param {boolean} [bLoadedResourcesOnly=false] Whether the guess should be limited to already loaded resources
	 * @returns {string|undefined} Resource name or <code>undefined</code> if no matching name could be found
	 * @private
	 */
	function guessResourceName(sURL, bLoadedResourcesOnly) {
		// Make sure to have an absolute URL without query parameters or hash
		// to check against absolute prefix URLs
		sURL = pathOnly(resolveURL(sURL));

		for (const sNamePrefix in mUrlPrefixes) {

			// Note: configured URL prefixes are guaranteed to end with a '/'
			// But to support the legacy scenario promoted by the application tools ( "registerModulePath('Application','Application')" )
			// the prefix check here has to be done without the slash
			const sUrlPrefix = mUrlPrefixes[sNamePrefix].absoluteUrl.slice(0, -1);

			if ( sURL.startsWith(sUrlPrefix) ) {

				// calc resource name
				let sResourceName = sNamePrefix + sURL.slice(sUrlPrefix.length);
				// remove a leading '/' (occurs if name prefix is empty and if match was a full segment match
				if ( sResourceName.charAt(0) === '/' ) {
					sResourceName = sResourceName.slice(1);
				}

				if ( !bLoadedResourcesOnly || mModules[sResourceName]?.data != undefined ) {
					return sResourceName;
				}
			}
		}
	}

	/**
	 * Find the most specific map config that matches the given context resource
	 * @param {string} sContext Resource name to be used as context
	 * @returns {Object<string,string>|undefined} Most specific map or <code>undefined</code>
	 */
	function findMapForContext(sContext) {
		let p, mMap;
		if ( sContext != null ) {
			// maps are defined on module IDs, reduce URN to module ID
			sContext = urnToIDAndType(sContext).id;
			p = sContext.length;
			mMap = mMaps[sContext];
			while ( p > 0 && mMap == null ) {
				p = sContext.lastIndexOf('/');
				if ( p > 0 ) { // Note: an empty segment at p = 0 (leading slash) will be ignored
					sContext = sContext.slice(0, p);
					mMap = mMaps[sContext];
				}
			}
		}
		// if none is found, fallback to '*' map
		return mMap || mMaps['*'];
	}

	function getMappedName(sResourceName, sRequestingResourceName) {

		const mMap = findMapForContext(sRequestingResourceName);

		// resolve relative names
		sResourceName = normalize(sResourceName, sRequestingResourceName);

		// if there's a map, search for the most specific matching entry
		if ( mMap != null ) {
			// start with the full ID and successively remove one segment
			let sPrefix = urnToIDAndType(sResourceName).id;
			let p = sPrefix.length;
			while ( p > 0 && mMap[sPrefix] == null ) {
				p = sPrefix.lastIndexOf('/');
				// Note: an empty segment at p = 0 (leading slash) will be ignored
				sPrefix = p > 0 ? sPrefix.slice(0, p) : '';
			}

			if ( p > 0 ) {
				const sMappedResourceName = mMap[sPrefix] + sResourceName.slice(p);
				if ( log.isLoggable() ) {
					log.debug(`module ID ${sResourceName} mapped to ${sMappedResourceName}`);
				}
				return sMappedResourceName; // also skips a leading slash!
			}
		}

		return sResourceName;
	}

	function getGlobalObject(oObject, aNames, l, bCreate) {
		for (let i = 0; oObject && i < l; i++) {
			if (!oObject[aNames[i]] && bCreate ) {
				oObject[aNames[i]] = {};
			}
			oObject = oObject[aNames[i]];
		}
		return oObject;
	}

	function getGlobalProperty(sName) {
		const aNames = sName ? sName.split(".") : [];

		if ( syncCallBehavior && aNames.length > 1 ) {
			log.error("[nosync] getGlobalProperty called to retrieve global name '" + sName + "'");
		}

		return getGlobalObject(__global, aNames, aNames.length);
	}

	function setGlobalProperty(sName, vValue) {
		const aNames = sName ? sName.split(".") : [];

		if ( aNames.length > 0 ) {
			const oObject = getGlobalObject(__global, aNames, aNames.length - 1, true);
			oObject[aNames[aNames.length - 1]] = vValue;
		}
	}

	// ---- Modules -------------------------------------------------------------------------------

	function wrapExport(value) {
		return { moduleExport: value };
	}

	function unwrapExport(wrapper) {
		return wrapper.moduleExport;
	}

	/**
	 * Module neither has been required nor preloaded nor declared, but someone asked for it.
	 */
	const INITIAL = 0,

	/**
	 * Module has been preloaded, but not required or declared.
	 */
		PRELOADED = -1,

	/**
	 * Module has been declared.
	 */
		LOADING = 1,

	/**
	 * Module has been loaded, but not yet executed.
	 */
		LOADED = 2,

	/**
	 * Module is currently being executed
	 */
		EXECUTING = 3,

	/**
	 * Module has been loaded and executed without errors.
	 */
		READY = 4,

	/**
	 * Module either could not be loaded or execution threw an error
	 */
		FAILED = 5,

	/**
	 * Special content value used internally until the content of a module has been determined
	 */
		NOT_YET_DETERMINED = {};

	/**
	 * A module/resource as managed by the module system.
	 *
	 * Each module has the following properties
	 * <ul>
	 * <li>{int} state one of the module states defined in this function</li>
	 * <li>{string} url URL where the module has been loaded from</li>
	 * <li>{any} data temp. raw content of the module (between loaded and ready or when preloaded)</li>
	 * <li>{string} group the bundle with which a resource was loaded or null</li>
	 * <li>{string} error an error description for state <code>FAILED</code></li>
	 * <li>{any} content the content of the module as exported via define()<(li>
	 * </ul>
	 */
	class Module {

		/**
		 * Creates a new Module.
		 *
		 * @param {string} name Name of the module, including extension
		 */
		constructor(name) {
			this.name = name;
			this.state = INITIAL;
			/*
			* Whether processing of the module is complete.
			* This is very similar to, but not the same as state >= READY because declareModule() sets state=READY very early.
			* That state transition is 'legacy' from the library-all files; it needs to be checked whether it can be removed.
			*/
			this.settled = false;
			this.url =
			this._deferred =
			this.data =
			this.group =
			this.error =
			this.pending = null;
			this.content = NOT_YET_DETERMINED;
		}

		deferred() {
			if ( this._deferred == null ) {
				const deferred = this._deferred = {};
				deferred.promise = new Promise(function(resolve,reject) {
					deferred.resolve = resolve;
					deferred.reject = reject;
				});
				// avoid 'Uncaught (in promise)' log entries
				deferred.promise.catch(noop);
			}
			return this._deferred;
		}

		api() {
			this._api ??= {
				id: this.name.slice(0,-3),
				exports: this._exports = {},
				url: this.url,
				config: noop
			};
			return this._api;
		}

		/**
		 * Sets the module state to READY and either determines the value or sets
		 * it from the given parameter.
		 * @param {any} value Module value
		 */
		ready(value) {
			// should throw, but some tests and apps would fail
			assert(!this.settled, `Module ${this.name} is already settled`);
			this.state = READY;
			this.settled = true;
			if ( arguments.length > 0 ) {
				// check arguments.length to allow a value of undefined
				this.content = value;
			}
			this.deferred().resolve(wrapExport(this.value()));
			if ( this.aliases ) {
				value = this.value();
				this.aliases.forEach((alias) => Module.get(alias).ready(value));
			}
		}

		failWith(msg, cause) {
			const err = makeModuleError(msg, this, cause);
			this.fail(err);
			return err;
		}

		fail(err) {
			// should throw, but some tests and apps would fail
			assert(!this.settled, `Module ${this.name} is already settled`);
			this.settled = true;
			if ( this.state !== FAILED ) {
				this.state = FAILED;
				this.error = err;
				this.deferred().reject(err);
				this.aliases?.forEach((alias) => Module.get(alias).fail(err));
			}
		}

		addPending(sDependency) {
			(this.pending ??= []).push(sDependency);
		}

		addAlias(sAliasName) {
			(this.aliases ??= []).push(sAliasName);
			// add this module as pending dependency to the original
			Module.get(sAliasName).addPending(this.name);
		}

		preload(url, data, bundle) {
			if ( this.state === INITIAL && !fnIgnorePreload?.(this.name) ) {
				this.state = PRELOADED;
				this.url = url;
				this.data = data;
				this.group = bundle;
			}
			return this;
		}

		/**
		 * Determines the value of this module.
		 *
		 * If the module hasn't been loaded or executed yet, <code>undefined</code> will be returned.
		 *
		 * @returns {any} Export of the module or <code>undefined</code>
		 * @private
		 */
		value() {
			if ( this.state === READY ) {
				if ( this.content === NOT_YET_DETERMINED ) {
					// Determine the module value lazily.
					// For AMD modules this has already been done on execution of the factory function.
					// For other modules that are required synchronously, it has been done after execution.
					// For the few remaining scenarios (like global scripts), it is done here
					const oShim = mShims[this.name],
						sExport = oShim && (Array.isArray(oShim.exports) ? oShim.exports[0] : oShim.exports);
					// best guess for thirdparty modules or legacy modules that don't use sap.ui.define
					this.content = getGlobalProperty( sExport || urnToUI5(this.name) );
				}
				return this.content;
			}

			return undefined;
		}

		/**
		 * Checks whether this module depends on the given module.
		 *
		 * When a module definition (define) is executed, the requested dependencies are added
		 * as 'pending' to the Module instance. This function checks if the oDependantModule is
		 * reachable from this module when following the pending dependency information.
		 *
		 * Note: when module aliases are introduced (all module definitions in a file use an ID that differs
		 * from the request module ID), then the alias module is also added as a "pending" dependency.
		 *
		 * @param {Module} oDependantModule Module which has a dependency to <code>oModule</code>
		 * @returns {boolean} Whether this module depends on the given one.
		 * @private
		 */
		dependsOn(oDependantModule) {
			const dependant = oDependantModule.name,
				visited = Object.create(null),
				stack = log.isLoggable() ? [this.name, dependant] : undefined;

			// log.debug("checking for a cycle between", this.name, "and", dependant);
			function visit(mod) {
				if ( !visited[mod] ) {
					// log.debug("  ", mod);
					visited[mod] = true;
					const pending = mModules[mod]?.pending;
					if (Array.isArray(pending) &&
						(pending.includes(dependant) || pending.some(visit)) ) {
						stack?.push(mod);
						return true;
					}
				}
				return false;
			}

			const result = this.name === dependant || visit(this.name);
			if ( result && stack ) {
				log.error("Dependency cycle detected: ",
					stack.reverse().map((entry, idx) => `${"".padEnd(idx)} -> ${entry}`).join("\n").slice(4)
				);
			}
			return result;
		}

		/**
		 * Find or create a module by its unified resource name.
		 *
		 * If the module doesn't exist yet, a new one is created in state INITIAL.
		 *
		 * @param {string} sModuleName Name of the module in URN syntax
		 * @returns {Module} Module with that name, newly created if it didn't exist yet
		 */
		static get(sModuleName) {
			const oModule = mModules[sModuleName] ??= new Module(sModuleName);
			return oModule;
		}

	}

	/*
	 * Determines the currently executing module.
	 */
	function getExecutingModule() {
		if ( _execStack.length > 0 ) {
			return _execStack[_execStack.length - 1].name;
		}
		return document.currentScript?.getAttribute("data-sap-ui-module");
	}

	// --------------------------------------------------------------------------------------------

	let _globalDefine,
		_globalDefineAMD;

	function updateDefineAndInterceptAMDFlag(newDefine) {

		// no change, do nothing
		if ( _globalDefine === newDefine ) {
			return;
		}

		// first cleanup on an old loader
		if ( _globalDefine ) {
			_globalDefine.amd = _globalDefineAMD;
			_globalDefine =
			_globalDefineAMD = undefined;
		}

		// remember the new define
		_globalDefine = newDefine;

		// intercept access to the 'amd' property of the new define, if it's not our own define
		if ( newDefine && !newDefine.ui5 ) {
			_globalDefineAMD = _globalDefine.amd;

			Object.defineProperty(_globalDefine, "amd", {
				get: function() {
					const sCurrentModule = getExecutingModule();
					if ( sCurrentModule && mShims[sCurrentModule]?.amd ) {
						log.debug(`suppressing define.amd for ${sCurrentModule}`);
						return undefined;
					}
					return _globalDefineAMD;
				},
				set: function(newDefineAMD) {
					_globalDefineAMD = newDefineAMD;
					log.debug(`define.amd became ${newDefineAMD ? "active" : "unset"}`);
				},
				configurable: true // we have to allow a redefine for debug mode or restart from CDN etc.
			});
		}
	}

	try {
		Object.defineProperty(__global, "define", {
			get: function() {
				return _globalDefine;
			},
			set: function(newDefine) {
				updateDefineAndInterceptAMDFlag(newDefine);
				log.debug(`define became ${newDefine ? "active" : "unset"}`);
			},
			configurable: true // we have to allow a redefine for debug mode or restart from CDN etc.
		});
	} catch (e) {
		log.warning("could not intercept changes to window.define, ui5loader won't be able to a change of the AMD loader");
	}

	updateDefineAndInterceptAMDFlag(__global.define);

	// --------------------------------------------------------------------------------------------

	function isModuleError(err) {
		return err?.name === "ModuleError";
	}

	/**
	 * Wraps the given 'cause' in a new error with the given message and with name 'ModuleError'.
	 *
	 * The new message and the message of the cause are combined. The stacktrace of the
	 * new error and of the cause are combined (with a separating 'Caused by').
	 *
	 * Instead of the final message string, a template is provided which can contain placeholders
	 * for the module ID ({id}) and module URL ({url}). Providing a template without concrete
	 * values allows to detect the repeated nesting of the same error. In such a case, only
	 * the innermost cause will be kept (affects both, stack trace as well as the cause property).
	 * The message, however, will contain the full chain of module IDs.
	 *
	 * @param {string} template Message string template with placeholders
	 * @param {Module} module Module for which the error occurred
	 * @param {Error} cause original error
	 * @returns {Error} New module error
	 */
	function makeModuleError(template, module, cause) {
		let modules = `'${module.name}'`;

		if (isModuleError(cause)) {
			// update the chain of modules (increasing the indent)
			modules += `\n -> ${cause._modules.replace(/ -> /g, "  -> ")}`;
			// omit repeated occurrences of the same kind of error
			if ( template === cause._template ) {
				cause = cause.cause;
			}
		}

		// create the message string from the template and the cause's message
		const message =
			template.replace(/\{id\}/, modules).replace(/\{url\}/, module.url)
			+ (cause ? ": " + cause.message : "");

		const error = new Error(message);
		error.name = "ModuleError";
		error.cause = cause;
		if ( cause?.stack ) {
			error.stack = error.stack + "\nCaused by: " + cause.stack;
		}
		// the following properties are only for internal usage
		error._template = template;
		error._modules = modules;
		return error;
	}

	function declareModule(sModuleName, fnDeprecationMessage) {
		// sModuleName must be a unified resource name of type .js
		assert(/\.js$/.test(sModuleName), "must be a Javascript module");

		const oModule = Module.get(sModuleName);

		if ( oModule.state > INITIAL ) {
			return oModule;
		}

		if ( log.isLoggable() ) {
			log.debug(`${sLogPrefix}declare module '${sModuleName}'`);
		}

		// avoid cycles
		oModule.state = READY;
		oModule.deprecation = fnDeprecationMessage || undefined;

		return oModule;
	}

	/**
	 * Define an already loaded module synchronously.
	 * Finds or creates a module by its unified resource name and resolves it with the given value.
	 *
	 * @param {string} sResourceName Name of the module in URN syntax
	 * @param {any} vValue Content of the module
	 */
	function defineModuleSync(sResourceName, vValue) {
		Module.get(sResourceName).ready(vValue);
	}

	/**
	 * Queue of modules for which sap.ui.define has been called (in async mode), but which have not been executed yet.
	 * When loading modules via script tag, only the onload handler knows the relationship between executed sap.ui.define calls and
	 * module name. It then resolves the pending modules in the queue. Only one entry can get the name of the module
	 * if there are more entries, then this is an error
	 *
	 * @param {boolean} [nested] Whether this is a nested queue used during sync execution of a module
	 */
	function ModuleDefinitionQueue(nested) {
		let aQueue = [],
			iRun = 0,
			vTimer;

		this.push = function(name, deps, factory, _export) {
			if ( log.isLoggable() ) {
				log.debug(sLogPrefix + "pushing define() call"
					+ (document.currentScript ? " from " + document.currentScript.src : "")
					+ " to define queue #" + iRun);
			}

			const sModule = document.currentScript?.getAttribute('data-sap-ui-module');
			aQueue.push({
				name: name,
				deps: deps,
				factory: factory,
				_export: _export,
				guess: sModule
			});

			// trigger queue processing via a timer in case the currently executing script is not managed by the loader
			if ( !vTimer && !nested && sModule == null ) {
				vTimer = setTimeout(this.process.bind(this, null, "timer"));
			}
		};

		this.clear = function() {
			aQueue = [];
			if ( vTimer ) {
				clearTimeout(vTimer);
				vTimer = null;
			}
		};

		/**
		 * Process the queue of module definitions, assuming that the original request was for
		 * <code>oRequestedModule</code>. If there is an unnamed module definition, it is assumed to be
		 * the one for the requested module.
		 *
		 * When called via timer, <code>oRequestedModule</code> will be undefined.
		 *
		 * @param {Module} [oRequestedModule] Module for which the current script was loaded.
		 * @param {string} [sInitiator] A string describing the caller of <code>process</code>
		 */
		this.process = function(oRequestedModule, sInitiator) {
			const bLoggable = log.isLoggable();
			const aQueueCopy = aQueue;
			const iCurrentRun = iRun++;
			let sModuleName = null;

			// clear the queue and timer early, we've already taken a copy of the queue
			this.clear();


			// if a module execution error was detected, stop processing the queue
			if ( oRequestedModule?.execError ) {
				if ( bLoggable ) {
					log.debug(`module execution error detected, ignoring queued define calls (${aQueueCopy.length})`);
				}
				oRequestedModule.fail(oRequestedModule.execError);
				return;
			}

			/*
			 * Name of the requested module, null when unknown or already consumed.
			 *
			 *  - when no module request is known (e.g. script was embedded in the page as an unmanaged script tag),
			 *    then no name is known and unnamed module definitions will be reported as an error
			 *  - multiple unnamed module definitions also are reported as an error
			 *  - when the name of a named module definition matches the name of requested module, the name is 'consumed'.
			 *    Any later unnamed module definition will be reported as an error, too
			 */
			sModuleName = oRequestedModule?.name;

			// check whether there's a module definition for the requested module
			aQueueCopy.forEach((oEntry) => {
				if ( oEntry.name == null ) {
					if ( sModuleName != null ) {
						oEntry.name = sModuleName;
						sModuleName = null;
					} else {
						// multiple modules have been queued, but only one module can inherit the name from the require call
						if ( strictModuleDefinitions ) {
							const oError = new Error(
								"Modules that use an anonymous define() call must be loaded with a require() call; " +
								"they must not be executed via script tag or nested into other modules. ");
							if ( oRequestedModule ) {
								oRequestedModule.fail(oError);
							} else {
								throw oError;
							}
						}
						// give anonymous modules a unique pseudo ID
						oEntry.name = `~anonymous~${++iAnonymousModuleCount}.js`;
						log.error(
							"Modules that use an anonymous define() call must be loaded with a require() call; " +
							"they must not be executed via script tag or nested into other modules. " +
							"All other usages will fail in future releases or when standard AMD loaders are used. " +
							"Now using substitute name " + oEntry.name);
					}
				} else if ( oRequestedModule && oEntry.name === oRequestedModule.name ) {
					if ( sModuleName == null && !strictModuleDefinitions ) {
						// if 'strictModuleDefinitions' is active, double execution will be reported anyhow
						log.error(
							"Duplicate module definition: both, an unnamed module and a module with the expected name exist." +
							"This use case will fail in future releases or when standard AMD loaders are used. ");
					}
					sModuleName = null;
				}
			});

			// if not, assign an alias if there's at least one queued module definition
			if ( sModuleName && aQueueCopy.length > 0 ) {
				if ( bLoggable ) {
					log.debug(
						"No queued module definition matches the ID of the request. " +
						`Now assuming that the first definition '${aQueueCopy[0].name}' is an alias of '${sModuleName}'`);
				}
				Module.get(aQueueCopy[0].name).addAlias(sModuleName);
				sModuleName = null;
			}

			if ( bLoggable ) {
				log.debug(sLogPrefix + "[" + sInitiator + "] "
					+ "processing define queue #" + iCurrentRun
					+ (oRequestedModule ? " for '" + oRequestedModule.name + "'" : "")
					+ ` with entries [${aQueueCopy.map((entry) => `'${entry.name}'`)}]`);
			}

			aQueueCopy.forEach((oEntry) => {
				// start to resolve the dependencies
				executeModuleDefinition(oEntry.name, oEntry.deps, oEntry.factory, oEntry._export, /* bAsync = */ true);
			});

			if ( sModuleName != null && !oRequestedModule.settled ) {
				// module name still not consumed, might be a non-UI5 module (e.g. in 'global' format)
				if ( bLoggable ) {
					log.debug(sLogPrefix + "no queued module definition for the requested module found, assume the module to be ready");
				}
				oRequestedModule.data = undefined; // allow GC
				oRequestedModule.ready(); // no export known, has to be retrieved via global name
			}

			if ( bLoggable ) {
				log.debug(sLogPrefix + `processing define queue #${iCurrentRun} done`);
			}
		};
	}

	let queue = new ModuleDefinitionQueue();

	/**
	 * Loads the source for the given module with a sync XHR.
	 * @param {Module} oModule Module to load the source for
	 * @throws {Error} When loading failed for some reason.
	 */
	function loadSyncXHR(oModule) {
		const xhr = new XMLHttpRequest();

		function createXHRLoadError(error) {
			error = new Error(xhr.statusText ? xhr.status + " - " + xhr.statusText : xhr.status);
			error.name = "XHRLoadError";
			error.status = xhr.status;
			error.statusText = xhr.statusText;
			return error;
		}

		xhr.addEventListener('load', function(e) {
			// File protocol (file://) always has status code 0
			if ( xhr.status === 200 || xhr.status === 0 ) {
				oModule.state = LOADED;
				oModule.data = xhr.responseText;
			} else {
				oModule.error = createXHRLoadError();
			}
		});
		// Note: according to whatwg spec, error event doesn't fire for sync send(), instead an error is thrown
		// we register a handler, in case a browser doesn't follow the spec
		xhr.addEventListener('error', function(e) {
			oModule.error = createXHRLoadError();
		});
		xhr.open('GET', oModule.url, false);
		try {
			xhr.send();
		} catch (error) {
			oModule.error = error;
		}
	}

	/**
	 * Global event handler to detect script execution errors.
	 * @private
	 */
	window.addEventListener('error', function onUncaughtError(errorEvent) {
		var sModuleName = document.currentScript?.getAttribute('data-sap-ui-module');
		var oModule = sModuleName && Module.get(sModuleName);
		if ( oModule && oModule.execError == null ) {
			// if a currently executing module can be identified, attach the error to it and suppress reporting
			if ( log.isLoggable() ) {
				log.debug(`unhandled exception occurred while executing ${sModuleName}: ${errorEvent.message}`);
			}
			oModule.execError = errorEvent.error || {
				name: 'Error',
				message: errorEvent.message
			};
			return false;
		}
	});

	function loadScript(oModule, sAlternativeURL) {

		const oScript = document.createElement('SCRIPT');
		// Accessing the 'src' property of the script in this strange way prevents Safari 12 (or WebKit) from
		// wrongly optimizing access. SF12 seems to check at optimization time whether there's a setter for the
		// property and optimize accordingly. When a setter is defined or changed at a later point in time (e.g.
		// by the AppCacheBuster), then the optimization seems not to be updated and the new setter is ignored
		// BCP 1970035485
		oScript["s" + "rc"] = oModule.url;
		//oScript.src = oModule.url;
		oScript.setAttribute("data-sap-ui-module", oModule.name);

		function onload(e) {
			updateMaxTaskTime();
			if ( log.isLoggable() ) {
				log.debug(`JavaScript resource loaded: ${oModule.name}`);
			}
			oScript.removeEventListener('load', onload);
			oScript.removeEventListener('error', onerror);
			queue.process(oModule, "onload");
		}

		function onerror(e) {
			updateMaxTaskTime();
			oScript.removeEventListener('load', onload);
			oScript.removeEventListener('error', onerror);
			if (sAlternativeURL) {
				log.warning(`retry loading JavaScript resource: ${oModule.name}`);
				oScript?.parentNode?.removeChild(oScript);
				oModule.url = sAlternativeURL;
				loadScript(oModule, /* sAlternativeURL= */ null);
				return;
			}

			log.error(`failed to load JavaScript resource: ${oModule.name}`);
			oModule.failWith("failed to load {id} from {url}", new Error("script load error"));
		}

		if ( sAlternativeURL !== undefined ) {
			if ( mShims[oModule.name]?.amd ) {
				oScript.setAttribute("data-sap-ui-module-amd", "true");
			}
			oScript.addEventListener('load', onload);
			oScript.addEventListener('error', onerror);
		}
		document.head.appendChild(oScript);

	}

	function preloadDependencies(sModuleName) {
		const knownDependencies = mDepCache[sModuleName];
		if ( Array.isArray(knownDependencies) ) {
			log.debug(`preload dependencies for ${sModuleName}: ${knownDependencies}`);
			knownDependencies.forEach((dep) => {
				dep = getMappedName(dep, sModuleName);
				if ( /\.js$/.test(dep) ) {
					requireModule(null, dep, /* always async */ true);
				} // else: TODO handle non-JS resources, e.g. link rel=prefetch
			});
		}
	}

	/**
	 * Loads the given module if needed and returns the module export or a promise on it.
	 *
	 * If loading is still ongoing for the requested module and if there is a cycle detected between
	 * the requesting module and the module to be loaded, then <code>undefined</code> (or a promise on
	 * <code>undefined</code>) will be returned as intermediate module export to resolve the cycle.
	 *
	 * @param {Module} oRequestingModule The module in whose context the new module has to be loaded;
	 *           this is needed to detect cycles
	 * @param {string} sModuleName Name of the module to be loaded, in URN form and with '.js' extension
	 * @param {boolean} bAsync Whether the operation can be executed asynchronously
	 * @param {boolean} [bSkipShimDeps=false] Whether shim dependencies should be ignored (used by recursive calls)
	 * @param {boolean} [bSkipBundle=false] Whether bundle information should be ignored (used by recursive calls)
	 * @returns {any|Promise} Returns the module export in sync mode or a promise on it in async mode
	 * @throws {Error} When loading failed in sync mode
	 *
	 * @private
	 * @ui5-transform-hint replace-param bAsync true
	 */
	function requireModule(oRequestingModule, sModuleName, bAsync, bSkipShimDeps, bSkipBundle) {

		// only for robustness, should not be possible by design (all callers append '.js')
		const oSplitName = urnToBaseIDAndSubType(sModuleName);
		if ( !oSplitName ) {
			throw new Error(`can only require Javascript module, not ${sModuleName}`);
		}

		// Module names should not start with a "/"
		if (sModuleName[0] == "/") {
			log.error("Module names that start with a slash should not be used, as they are reserved for future use.");
		}

		const bLoggable = log.isLoggable();

		const oModule = Module.get(sModuleName);
		const oShim = mShims[sModuleName];

		if (oModule.deprecation) {
			const msg = typeof oModule.deprecation === "function" ? oModule.deprecation() : oModule.deprecation;
			log.error((oRequestingModule ? "(dependency of '" + oRequestingModule.name + "') " : "") + msg);
		}

		// when there's a shim with dependencies for the module
		// resolve them first before requiring the module again with bSkipShimDeps = true
		if ( oShim?.deps && !bSkipShimDeps ) {
			if ( bLoggable ) {
				log.debug("require dependencies of raw module " + sModuleName);
			}
			return requireAll(oModule, oShim.deps, function() {
				// set bSkipShimDeps to true to prevent endless recursion
				return requireModule(oRequestingModule, sModuleName, bAsync, /* bSkipShimDeps = */ true, bSkipBundle);
			}, function(oErr) {
				// Note: in async mode, this 'throw' will reject the promise returned by requireAll
				throw oModule.failWith("Failed to resolve dependencies of {id}", oErr);
			}, bAsync);
		}

		// when there's bundle information for the module
		// require the bundle first before requiring the module again with bSkipBundle = true
		if ( oModule.state === INITIAL && oModule.group && oModule.group !== sModuleName && !bSkipBundle ) {
			if ( bLoggable ) {
				log.debug(`${sLogPrefix}require bundle '${oModule.group}' containing '${sModuleName}'`);
			}
			if ( bAsync ) {
				return requireModule(null, oModule.group, bAsync).catch(noop).then(function() {
					// set bSkipBundle to true to prevent endless recursion
					return requireModule(oRequestingModule, sModuleName, bAsync, bSkipShimDeps, /* bSkipBundle = */ true);
				});
			} else {
				try {
					requireModule(null, oModule.group, bAsync);
				} catch (oError) {
					if ( bLoggable ) {
						log.error(sLogPrefix + "require bundle '" + oModule.group + "' failed (ignored)");
					}
				}
			}
		}

		if ( bLoggable ) {
			log.debug(sLogPrefix + "require '" + sModuleName + "'"
					+ (oRequestingModule ? " (dependency of '" + oRequestingModule.name + "')" : ""));
		}

		// check if module has been loaded already
		if ( oModule.state !== INITIAL ) {

			let bExecutedNow = false;

			if ( oModule.state === EXECUTING && oModule.data != null && !bAsync && oModule.async ) {
				oModule.state = PRELOADED;
				oModule.async = bAsync;
				oModule.pending = null; // TODO or is this still needed ?
			}

			if ( oModule.state === PRELOADED ) {
				oModule.state = LOADED;
				oModule.async = bAsync;
				bExecutedNow = true;
				measure && measure.start(sModuleName, "Require module " + sModuleName + " (preloaded)", ["require"]);
				execModule(sModuleName, bAsync);
				measure && measure.end(sModuleName);
			}

			if ( oModule.state === READY ) {
				if ( !bExecutedNow && bLoggable ) {
					log.debug(sLogPrefix + "module '" + sModuleName + "' has already been loaded (skipped).");
				}
				// Note: this intentionally does not return oModule.promise() as the export might be temporary in case of cycles
				// or it might have changed after repeated module execution
				return bAsync ? Promise.resolve(wrapExport(oModule.value())) : wrapExport(oModule.value());
			} else if ( oModule.state === FAILED ) {
				if ( bAsync ) {
					return oModule.deferred().promise;
				} else {
					throw oModule.error;
				}
			} else {
				// currently loading or executing
				if ( bAsync ) {
					// break up cyclic dependencies
					if ( oRequestingModule && oModule.dependsOn(oRequestingModule) ) {
						if ( log.isLoggable() ) {
							log.debug("cycle detected between '" + oRequestingModule.name + "' and '" + sModuleName + "', returning undefined for '" + sModuleName + "'");
						}
						// Note: this must be a separate promise as the fulfillment is not the final one
						return Promise.resolve(wrapExport(undefined));
					}
					return oModule.deferred().promise;
				}
				if ( !bAsync && !oModule.async ) {
					// sync pending, return undefined
					if ( log.isLoggable() ) {
						log.debug("cycle detected between '" + (oRequestingModule ? oRequestingModule.name : "unknown") + "' and '" + sModuleName + "', returning undefined for '" + sModuleName + "'");
					}
					return wrapExport(undefined);
				}
				// async pending, load sync again
				log.warning("Sync request triggered for '" + sModuleName + "' while async request was already pending." +
					" Loading a module twice might cause issues and should be avoided by fully migrating to async APIs.");
			}
		}

		measure && measure.start(sModuleName, "Require module " + sModuleName, ["require"]);

		// set marker for loading modules (to break cycles)
		oModule.state = LOADING;
		oModule.async = bAsync;

		// if debug is enabled, try to load debug module first
		const aExtensions = shouldLoadDebugVariant(sModuleName) ? ["-dbg", ""] : [""];

		if ( !bAsync ) {

			for (let i = 0; i < aExtensions.length && oModule.state !== LOADED; i++) {
				// create module URL for the current extension
				oModule.url = getResourcePath(oSplitName.baseID, aExtensions[i] + oSplitName.subType);
				if ( bLoggable ) {
					log.debug(sLogPrefix + "loading " + (aExtensions[i] ? aExtensions[i] + " version of " : "") + "'" + sModuleName + "' from '" + oModule.url + "' (using sync XHR)");
				}

				if ( syncCallBehavior ) {
					const sMsg = "[nosync] loading module '" + oModule.url + "'";
					if ( syncCallBehavior === 1 ) {
						log.error(sMsg);
					} else {
						throw new Error(sMsg);
					}
				}

				// call notification hook
				ui5Require.load({ completeLoad:noop, async: false }, oModule.url, oSplitName.baseID);

				loadSyncXHR(oModule);
			}

			if ( oModule.state === LOADING ) {
				// transition to FAILED
				oModule.failWith("failed to load {id} from {url}", oModule.error);
			} else if ( oModule.state === LOADED ) {
				// execute module __after__ loading it, this reduces the required stack space!
				execModule(sModuleName, bAsync);
			}

			measure && measure.end(sModuleName);

			if ( oModule.state !== READY ) {
				throw oModule.error;
			}

			return wrapExport(oModule.value());

		} else {

			oModule.url = getResourcePath(oSplitName.baseID, aExtensions[0] + oSplitName.subType);
			// in debug mode, fall back to the non-dbg source, otherwise try the same source again (for SSO re-connect)
			const sAltUrl = aExtensions.length === 2 ? getResourcePath(oSplitName.baseID, aExtensions[1] + oSplitName.subType) : oModule.url;

			if ( log.isLoggable() ) {
				log.debug(sLogPrefix + "loading '" + sModuleName + "' from '" + oModule.url + "' (using <script>)");
			}

			// call notification hook only once
			ui5Require.load({ completeLoad:noop, async: true }, sAltUrl, oSplitName.baseID);
			loadScript(oModule, /* sAlternativeURL= */ sAltUrl);

			// process dep cache info
			preloadDependencies(sModuleName);

			return oModule.deferred().promise;
		}
	}

	/**
	 * Note: `sModuleName` must be a normalized resource name of type .js
	 * @private
	 * @ui5-transform-hint replace-param bAsync true
	 */
	function execModule(sModuleName, bAsync) {

		const oModule = mModules[sModuleName];

		if ( oModule && oModule.state === LOADED && typeof oModule.data !== "undefined" ) {

			const bLoggable = log.isLoggable();
			const bOldForceSyncDefines = bForceSyncDefines;
			const oOldQueue = queue;
			let sOldPrefix, sScript;

			try {

				bForceSyncDefines = !bAsync;
				queue = new ModuleDefinitionQueue(true);

				if ( bLoggable ) {
					if ( typeof oModule.data === "string" ) {
						log.warning(sLogPrefix + "executing '" + sModuleName + "' (using eval)");
					} else {
						log.debug(sLogPrefix + "executing '" + sModuleName + "'");
					}
					sOldPrefix = sLogPrefix;
					sLogPrefix = sLogPrefix + ": ";
				}

				// execute the script in the __global context
				oModule.state = EXECUTING;
				_execStack.push({
					name: sModuleName,
					used: false
				});
				if ( typeof oModule.data === "function" ) {
					oModule.data.call(__global);
				} else if ( Array.isArray(oModule.data) ) {
					ui5Define.apply(null, oModule.data);
				} else {

					sScript = oModule.data;

					// sourceURL: Firebug, Chrome and Safari debugging help, appending the string seems to cost ZERO performance
					// Note: make URL absolute so Chrome displays the file tree correctly
					// Note: do not append if there is already a sourceURL / sourceMappingURL
					// Note: Safari fails, if sourceURL is the same as an existing XHR URL
					// Note: Chrome ignores debug files when the same URL has already been load via sourcemap of the bootstrap file (sap-ui-core)
					// Note: sourcemap annotations URLs in eval'ed sources are resolved relative to the page, not relative to the source
					if (sScript ) {
						const oMatch = /\/\/[#@] source(Mapping)?URL=(.*)$/.exec(sScript);
						if ( oMatch && oMatch[1] && /^[^/]+\.js\.map$/.test(oMatch[2]) ) {
							// found a sourcemap annotation with a typical UI5 generated relative URL
							sScript = sScript.slice(0, oMatch.index) + oMatch[0].slice(0, -oMatch[2].length) + resolveURL(oMatch[2], oModule.url);
						}
						// @evo-todo use only sourceMappingURL, sourceURL or both?
						if ( !oMatch || oMatch[1] ) {
							// write sourceURL if no annotation was there or when it was a sourceMappingURL
							sScript += "\n//# sourceURL=" + resolveURL(oModule.url) + "?eval";
						}
					}

					// framework internal hook to intercept the loaded script and modify
					// it before executing the script - e.g. useful for client side coverage
					if (typeof translate === "function") {
						sScript = translate(sScript, sModuleName);
					}

					// eval the source in the global context (preventing access to the closure of this function)
					__global.eval(sScript);
				}
				queue.process(oModule, "after eval");

			} catch (err) {
				oModule.data = undefined;
				if (isModuleError(err)) {
					// don't wrap a ModuleError again
					oModule.fail(err);
				} else {
					if (err instanceof SyntaxError && sScript) {
						// Module execution failed with a syntax error.
						// If in debug mode, load the script code again via script tag for better error reporting
						// (but without reacting to load/error events)
						if (fnIgnorePreload) {
							oModule.url = URL.createObjectURL(new Blob([sScript], {type: 'text/javascript'}));
							loadScript(oModule);
						} else {
							log.error("A syntax error occurred while evaluating '" + sModuleName + "'"
								+ ", restarting the app with sap-ui-debug=x might reveal the error location");
						}
					}
					oModule.failWith("Failed to execute {id}", err);
				}
			} finally {

				_execStack.pop();

				if ( bLoggable ) {
					sLogPrefix = sOldPrefix;
					log.debug(sLogPrefix + "finished executing '" + sModuleName + "'");
				}

				queue = oOldQueue;
				bForceSyncDefines = bOldForceSyncDefines;
			}
		}
	}

	/**
	 * @private
	 * @ui5-transform-hint replace-param bAsync true
	 */
	function requireAll(oRequestingModule, aDependencies, fnCallback, fnErrCallback, bAsync) {

		const aModules = [];
		let sBaseName,
			oError;

		try {
			// calculate the base name for relative module names
			if ( oRequestingModule instanceof Module ) {
				sBaseName = oRequestingModule.name;
			} else {
				sBaseName = oRequestingModule;
				oRequestingModule = null;
			}
			aDependencies = aDependencies.slice();
			for (let i = 0; i < aDependencies.length; i++) {
				aDependencies[i] = getMappedName(aDependencies[i] + '.js', sBaseName);
			}
			if ( oRequestingModule ) {
				// remember outgoing dependencies to be able to detect cycles, but ignore pseudo-dependencies
				aDependencies.forEach((dep) => {
					if ( !/^(require|exports|module)\.js$/.test(dep) ) {
						oRequestingModule.addPending(dep);
					}
				});
			}

			for (let i = 0; i < aDependencies.length; i++) {
				const sDepModName = aDependencies[i];
				if ( oRequestingModule ) {
					switch ( sDepModName ) {
					case 'require.js':
						// the injected local require should behave like the Standard require (2nd argument = true)
						aModules[i] = wrapExport(createContextualRequire(sBaseName, true));
						break;
					case 'module.js':
						aModules[i] = wrapExport(oRequestingModule.api());
						break;
					case 'exports.js':
						oRequestingModule.api();
						aModules[i] = wrapExport(oRequestingModule._exports);
						break;
					default:
						break;
					}
				}
				if ( !aModules[i] ) {
					aModules[i] = requireModule(oRequestingModule, sDepModName, bAsync);
				}
			}

		} catch (err) {
			oError = err;
		}

		if ( bAsync ) {
			const oPromise = oError ? Promise.reject(oError) : Promise.all(aModules);
			return oPromise.then(fnCallback, fnErrCallback);
		} else {
			if ( oError ) {
				fnErrCallback(oError);
			} else {
				return fnCallback(aModules);
			}
		}
	}

	/**
	 * @private
	 * @ui5-transform-hint replace-param bAsync true
	 * @ui5-transform-hint replace-param bExport false
	 */
	function executeModuleDefinition(sResourceName, aDependencies, vFactory, bExport, bAsync) {
		const bLoggable = log.isLoggable();
		sResourceName = normalize(sResourceName);

		if ( bLoggable ) {
			log.debug(sLogPrefix + "define('" + sResourceName + "', " + "['" + aDependencies.join("','") + "']" + ")");
		}

		const oModule = declareModule(sResourceName);

		let repeatedExecutionReported = false;

		function shouldSkipExecution() {
			if ( oModule.settled ) {
				// avoid double execution of the module, e.g. when async/sync conflict occurred before queue processing
				if ( oModule.state >= READY && bAsync && oModule.async === false ) {
					log.warning("Repeated module execution skipped after async/sync conflict for " + oModule.name);
					return true;
				}

				// when an inline module definition is executed repeatedly, this is reported but not prevented
				// Standard AMD loaders don't support this scenario, it needs to be fixed on caller side
				if ( strictModuleDefinitions && bAsync ) {
					log.warning("Module '" + oModule.name + "' has been defined more than once. " +
							"All but the first definition will be ignored, don't try to define the same module again.");
					return true;
				}

				if ( !repeatedExecutionReported ) {
					log.error(
						"Module '" + oModule.name + "' is executed more than once. " +
						"This is an unsupported scenario and will fail in future versions of UI5 or " +
						"when a standard AMD loader is used. Don't define the same module again.");
					repeatedExecutionReported = true;
				}
			}
		}

		if ( shouldSkipExecution() ) {
			return;
		}

		// avoid early evaluation of the module value
		oModule.content = undefined;

		function onSuccess(aModules) {

			// avoid double execution of the module, e.g. when async/sync conflict occurred while waiting for dependencies
			if ( shouldSkipExecution() ) {
				return;
			}

			// factory
			if ( bLoggable ) {
				log.debug(sLogPrefix + "define('" + sResourceName + "'): dependencies resolved, calling factory " + typeof vFactory);
			}

			if ( bExport && syncCallBehavior !== 2 ) {
				// ensure parent namespace
				const aPackages = sResourceName.split('/');
				if ( aPackages.length > 1 ) {
					getGlobalObject(__global, aPackages, aPackages.length - 1, true);
				}
			}

			if ( typeof vFactory === 'function' ) {
				// from https://github.com/amdjs/amdjs-api/blob/master/AMD.md
				// "If the factory function returns a value (an object, function, or any value that coerces to true),
				//  then that value should be assigned as the exported value for the module."
				try {
					aModules = aModules.map(unwrapExport);
					let exports = vFactory.apply(__global, aModules);
					if ( oModule._api?.exports !== undefined && oModule._api.exports !== oModule._exports ) {
						exports = oModule._api.exports;
					} else if ( exports === undefined && oModule._exports ) {
						exports = oModule._exports;
					}
					oModule.content = exports;
				} catch (error) {
					const wrappedError = oModule.failWith("failed to execute module factory for '{id}'", error);
					if ( bAsync ) {
						// Note: in async mode, the error is reported via the oModule's promise
						return;
					}
					throw wrappedError;
				}
			} else {
				oModule.content = vFactory;
			}

			// HACK: global export
			if ( bExport && syncCallBehavior !== 2 ) {
				if ( oModule.content == null ) {
					log.error(`Module '${sResourceName}' returned no content, but should export to global?`);
				} else {
					if ( bLoggable ) {
						log.debug(`exporting content of '${sResourceName}': as global object`);
					}
					// convert module name to UI5 module name syntax (might fail!)
					const sModuleName = urnToUI5(sResourceName);
					setGlobalProperty(sModuleName, oModule.content);
				}
			}

			oModule.ready();

		}

		// Note: dependencies will be resolved and converted from RJS to URN inside requireAll
		requireAll(oModule, aDependencies, bAsync && oModule.data ? scheduleExecution(onSuccess) : onSuccess, function(oErr) {
			const oWrappedError = oModule.failWith("Failed to resolve dependencies of {id}", oErr);
			if ( !bAsync ) {
				throw oWrappedError;
			}
			// Note: in async mode, the error is reported via the oModule's promise
		}, /* bAsync = */ bAsync);

	}

	/**
	 * @private
	 * @ui5-transform-hint replace-param bExport false
	 */
	function ui5Define(sModuleName, aDependencies, vFactory, bExport) {
		let sResourceName;

		// optional id
		if ( typeof sModuleName === 'string' ) {
			sResourceName = sModuleName + '.js';
		} else {
			// shift parameters
			bExport = vFactory;
			vFactory = aDependencies;
			aDependencies = sModuleName;
			sResourceName = null;
		}

		// optional array of dependencies
		if ( !Array.isArray(aDependencies) ) {
			// shift parameters
			bExport = vFactory;
			vFactory = aDependencies;
			if ( typeof vFactory === 'function' && vFactory.length > 0 ) {
				aDependencies = ['require', 'exports', 'module'].slice(0, vFactory.length);
			} else {
				aDependencies = [];
			}
		}

		if ( bForceSyncDefines === false || (bForceSyncDefines == null && bGlobalAsyncMode) ) {
			queue.push(sResourceName, aDependencies, vFactory, bExport);
			if ( sResourceName != null ) {
				const oModule = Module.get(sResourceName);
				// change state of PRELOADED or INITIAL modules to prevent further requests/executions
				if ( oModule.state <= INITIAL ) {
					oModule.state = EXECUTING;
					oModule.async = true;
				}
			}
			return;
		}

		// immediate, synchronous execution
		const oCurrentExecInfo = _execStack.length > 0 ? _execStack[_execStack.length - 1] : null;
		if ( !sResourceName ) {

			if ( oCurrentExecInfo && !oCurrentExecInfo.used ) {
				sResourceName = oCurrentExecInfo.name;
				oCurrentExecInfo.used = true;
			} else {
				// give anonymous modules a unique pseudo ID
				sResourceName = `~anonymous~${++iAnonymousModuleCount}.js`;
				if ( oCurrentExecInfo ) {
					sResourceName = oCurrentExecInfo.name.slice(0, oCurrentExecInfo.name.lastIndexOf('/') + 1) + sResourceName;
				}
				log.error(
					"Modules that use an anonymous define() call must be loaded with a require() call; " +
					"they must not be executed via script tag or nested into other modules. " +
					"All other usages will fail in future releases or when standard AMD loaders are used " +
					"or when ui5loader runs in async mode. Now using substitute name " + sResourceName);
			}
		} else if ( oCurrentExecInfo?.used && sResourceName !== oCurrentExecInfo.name ) {
			log.debug(`module names don't match: requested: ${sModuleName}, defined: ${oCurrentExecInfo.name}`);
			Module.get(oCurrentExecInfo.name).addAlias(sModuleName);
		}
		executeModuleDefinition(sResourceName, aDependencies, vFactory, bExport, /* bAsync = */ false);

	}

	/**
	 * The amdDefine() function is closer to the AMD spec, as opposed to sap.ui.define.
	 * It's later assigned as the global define() if the loader is running in amd=true
	 * mode (has to be configured explicitly).
	 */
	function amdDefine(sModuleName, aDependencies, vFactory) {
		let oArgs = arguments;
		const bExportIsSet = typeof oArgs[oArgs.length - 1] === "boolean";

		// bExport parameter is proprietary and should not be used for an AMD compliant define()
		if (bExportIsSet) {
			oArgs = Array.prototype.slice.call(oArgs, 0, oArgs.length - 1);
		}

		ui5Define.apply(this, oArgs);
	}
	amdDefine.amd = {}; // identify as AMD-spec compliant loader
	amdDefine.ui5 = {}; // identify as ui5loader


	/**
	 * Create a require() function which acts in the context of the given resource.
	 *
	 * @param {string|null} sContextName Name of the context resource (module) in URN syntax, incl. extension
	 * @param {boolean} bAMDCompliance If set to true, the behavior of the require() function is closer to the AMD specification.
	 * @returns {function} Require function.
	 */
	function createContextualRequire(sContextName, bAMDCompliance) {
		const fnRequire = function(vDependencies, fnCallback, fnErrCallback) {
			assert(typeof vDependencies === 'string' || Array.isArray(vDependencies), "dependency param either must be a single string or an array of strings");
			assert(fnCallback == null || typeof fnCallback === 'function', "callback must be a function or null/undefined");
			assert(fnErrCallback == null || typeof fnErrCallback === 'function', "error callback must be a function or null/undefined");

			// Probing for existing module
			if ( typeof vDependencies === 'string' ) {
				const sModuleName = getMappedName(vDependencies + '.js', sContextName);
				const oModule = Module.get(sModuleName);

				if (oModule.deprecation) {
					const msg = typeof oModule.deprecation === "function" ? oModule.deprecation() : oModule.deprecation;
					log.error(msg);
				}

				// check the modules internal state
				// everything from PRELOADED to LOADED (incl. FAILED) is considered erroneous
				if (bAMDCompliance && oModule.state !== EXECUTING && oModule.state !== READY) {
					throw new Error(
						"Module '" + sModuleName + "' has not been loaded yet. " +
						"Use require(['" + sModuleName + "']) to load it."
					);
				}

				// Module is in state READY or EXECUTING; or require() was called from sap.ui.require().
				// A modules value might be undefined (no return statement) even though the state is READY.
				return oModule.value();
			}

			requireAll(sContextName, vDependencies, function(aModules) {
				aModules = aModules.map(unwrapExport);
				if ( typeof fnCallback === 'function' ) {
					if ( bGlobalAsyncMode ) {
						fnCallback.apply(__global, aModules);
					} else {
						// enforce asynchronous execution of callback even in sync mode
						simulateAsyncCallback(function() {
							fnCallback.apply(__global, aModules);
						});
					}
				}
			}, function(oErr) {
				if ( typeof fnErrCallback === 'function' ) {
					if ( bGlobalAsyncMode ) {
						fnErrCallback.call(__global, oErr);
					} else {
						simulateAsyncCallback(function() {
							fnErrCallback.call(__global, oErr);
						});
					}
				} else {
					throw oErr;
				}
			}, /* bAsync = */ bGlobalAsyncMode);

			// return undefined;
		};
		fnRequire.toUrl = function(sName) {
			const sMappedName = ensureTrailingSlash(getMappedName(sName, sContextName), sName);
			return toUrl(sMappedName);
		};
		return fnRequire;
	}

	function ensureTrailingSlash(sName, sInput) {
		//restore trailing slash
		if (sInput.slice(-1) === "/" && sName.slice(-1) !== "/") {
			return sName + "/";
		}
		return sName;
	}

	function toUrl(sName) {
		if (sName.indexOf("/") === 0) {
			throw new Error(`The provided argument '${sName}' may not start with a slash`);
		}
		return ensureTrailingSlash(getResourcePath(sName), sName);
	}

	/*
	 * UI5 version of require (sap.ui.require)
	 */
	const ui5Require = createContextualRequire(null, false);

	/*
	 * AMD version of require (window.require)
	 *
	 * Difference between require (sap.ui.require) and amdRequire (window.require):
	 * - require("my/module"), returns undefined if the module was not loaded yet
	 * - amdRequire("my/module"), throws an error if the module was not loaded yet
	 */
	const amdRequire = createContextualRequire(null, true);

	function requireSync(sModuleName) {
		sModuleName = getMappedName(sModuleName + '.js');
		if ( log.isLoggable() ) {
			log.warning(`sync require of '${sModuleName}'`);
		}
		return unwrapExport(requireModule(null, sModuleName, /* bAsync = */ false));
	}

	/**
	 * @private
	 * @ui5-transform-hint replace-param bExport false
	 */
	function predefine(sModuleName, aDependencies, vFactory, bExport) {
		if ( typeof sModuleName !== 'string' ) {
			throw new Error("predefine requires a module name");
		}
		sModuleName = normalize(sModuleName);
		Module.get(sModuleName + '.js').preload("<unknown>/" + sModuleName, [sModuleName, aDependencies, vFactory, bExport], null);
	}

	function preload(modules, group, url) {
		group = group || null;
		url = url || "<unknown>";
		for ( let name in modules ) {
			name = normalize(name);
			Module.get(name).preload(url + "/" + name, modules[name], group);
		}
	}

	/**
	 * Dumps information about the current set of modules and their state.
	 *
	 * @param {int} [iThreshold=-1] Earliest module state for which odules should be reported
	 * @private
	 */
	function dumpInternals(iThreshold) {

		const states = [PRELOADED, INITIAL, LOADED, READY, FAILED, EXECUTING, LOADING];
		const stateNames = {
			[PRELOADED]: 'PRELOADED',
			[INITIAL]:'INITIAL',
			[LOADING]: 'LOADING',
			[LOADED]: 'LOADED',
			[EXECUTING]: 'EXECUTING',
			[READY]: 'READY',
			[FAILED]: 'FAILED'
		};

		if ( iThreshold == null ) {
			iThreshold = PRELOADED;
		}

		/*eslint-disable no-console */
		const info = log.isLoggable('INFO') ? log.info.bind(log) : console.info.bind(console);
		/*eslint-enable no-console */

		const aModuleNames = Object.keys(mModules).sort();
		states.forEach((state) => {
			if ( state  < iThreshold ) {
				return;
			}
			let count = 0;
			info(stateNames[state] + ":");
			aModuleNames.forEach((sModule, idx) => {
				const oModule = mModules[sModule];
				if ( oModule.state === state ) {
					let addtlInfo;
					if ( oModule.state === LOADING ) {
						const pending = oModule.pending?.reduce((acc, dep) => {
							const oDepModule = Module.get(dep);
							if ( oDepModule.state !== READY ) {
								acc.push( dep + "(" + stateNames[oDepModule.state] + ")");
							}
							return acc;
						}, []);
						if ( pending?.length > 0 ) {
							addtlInfo = "waiting for " + pending.join(", ");
						}
					} else if ( oModule.state === FAILED ) {
						addtlInfo = (oModule.error.name || "Error") + ": " + oModule.error.message;
					}
					info("  " + (idx + 1) + " " + sModule + (addtlInfo ? " (" + addtlInfo + ")" : ""));
					count++;
				}
			});
			if ( count === 0 ) {
				info("  none");
			}
		});

	}

	/**
	 * Returns a flat copy of the current set of URL prefixes.
	 *
	 * @private
	 */
	function getUrlPrefixes() {
		const mUrlPrefixesCopy = Object.create(null);
		forEach(mUrlPrefixes, function(sNamePrefix, oUrlInfo) {
			mUrlPrefixesCopy[sNamePrefix] = oUrlInfo.url;
		});
		return mUrlPrefixesCopy;
	}

	/**
	 * Removes a set of resources from the resource cache.
	 *
	 * @param {string} sName unified resource name of a resource or the name of a preload group to be removed
	 * @param {boolean} [bPreloadGroup=true] whether the name specifies a preload group, defaults to true
	 * @param {boolean} [bUnloadAll] Whether all matching resources should be unloaded, even if they have been executed already.
	 * @param {boolean} [bDeleteExports] Whether exports (global variables) should be destroyed as well. Will be done for UI5 module names only.
	 * @experimental Since 1.16.3 API might change completely, apps must not develop against it.
	 * @private
	 */
	function unloadResources(sName, bPreloadGroup, bUnloadAll, bDeleteExports) {
		const aModules = [];

		if ( bPreloadGroup == null ) {
			bPreloadGroup = true;
		}

		if ( bPreloadGroup ) {
			// collect modules that belong to the given group
			for ( const sURN in mModules ) {
				const oModule = mModules[sURN];
				if ( oModule && oModule.group === sName ) {
					aModules.push(sURN);
				}
			}
		} else {
			// single module
			if ( mModules[sName] ) {
				aModules.push(sName);
			}
		}

		aModules.forEach((sURN) => {
			const oModule = mModules[sURN];
			if ( oModule && bDeleteExports && sURN.match(/\.js$/) ) {
				// @evo-todo move to compat layer?
				setGlobalProperty(urnToUI5(sURN), undefined);
			}
			if ( oModule && (bUnloadAll || oModule.state === PRELOADED) ) {
			  delete mModules[sURN];
			}
		});
	}

	function getModuleContent(name, url) {
		if ( name ) {
			name = getMappedName(name);
		} else {
			name = guessResourceName(url, true);
		}
		const oModule = name && mModules[name];
		if ( oModule ) {
			oModule.state = LOADED;
			return oModule.data;
		} else {
			return undefined;
		}
	}

	/**
	 * Returns an info about all known resources keyed by their URN.
	 *
	 * If the URN can be converted to a UI5 module name, then the value in the map
	 * will be that name. Otherwise it will be null or undefined.
	 *
	 * @return {Object.<string,string>} Map of all module names keyed by their resource name
	 * @see isDeclared
	 * @private
	 */
	function getAllModules() {
		const mSnapshot = Object.create(null);
		forEach(mModules, function(sURN, oModule) {
			mSnapshot[sURN] = {
				state: oModule.state,
				ui5: urnToUI5(sURN)
			};
		});
		return mSnapshot;
	}

	function loadJSResourceAsync(sResource, bIgnoreErrors) {
		sResource = getMappedName(sResource);
		const promise = requireModule(null, sResource, /* bAsync = */ true).then(unwrapExport);
		return bIgnoreErrors ? promise.catch(noop) : promise;
	}

	// ---- config --------------------------------------------------------------------------------

	const mUI5ConfigHandlers = {
		baseUrl(url) {
			registerResourcePath("", url);
		},
		paths: registerResourcePath, // has length 2
		shim(module, shim) {
			if ( Array.isArray(shim) ) {
				shim = { deps : shim };
			}
			mShims[module + '.js'] = shim;
		},
		amd(bValue) {
			bValue = !!bValue;
			if ( bExposeAsAMDLoader !== bValue ) {
				bExposeAsAMDLoader = bValue;
				if (bValue) {
					vOriginalDefine = __global.define;
					vOriginalRequire = __global.require;
					__global.define = amdDefine;
					__global.require = amdRequire;

					// Enable async loading behaviour implicitly when switching to amd mode
					bGlobalAsyncMode = true;
				} else {
					__global.define = vOriginalDefine;
					__global.require = vOriginalRequire;
					// NOTE: Do not set async mode back to false when amd mode gets deactivated
				}
			}
		},
		async(async) {
			if (bGlobalAsyncMode && !async) {
				throw new Error("Changing the ui5loader config from async to sync is not supported. Only a change from sync to async is allowed.");
			}
			bGlobalAsyncMode = !!async;
		},
		bundles(bundle, modules) {
			bundle += '.js';
			modules.forEach(
				(module) => { Module.get(module + '.js').group = bundle; }
			);
		},
		bundlesUI5(bundle, resources) {
			resources.forEach(
				(module) => { Module.get(module).group = bundle; }
			);
		},
		debugSources(debug) {
			bDebugSources = !!debug;
		},
		depCache(module, deps) {
			mDepCache[module + '.js'] = deps.map((dep) => dep + '.js');
		},
		depCacheUI5(module, deps) {
			mDepCache[module] = deps;
		},
		ignoreBundledResources(filter) {
			if ( filter == null || typeof filter === 'function' ) {
				fnIgnorePreload = filter;
			}
		},
		map(context, map) {
			// @evo-todo ignore empty context, empty prefix?
			if ( map == null ) {
				delete mMaps[context];
			} else if ( typeof map === 'string' ) {
				// SystemJS style config
				mMaps['*'][context] = map;
			} else {
				mMaps[context] ||= Object.create(null);
				forEach(map, function(alias, name) {
					mMaps[context][alias] = name;
				});
			}
		},
		reportSyncCalls(report) {
			if ( report === 0 || report === 1 || report === 2 ) {
				syncCallBehavior = report;
			}
		},
		noConflict(bValue) {
			log.warning("Config option 'noConflict' has been deprecated, use option 'amd' instead, if still needed.");
			mUI5ConfigHandlers.amd(!bValue);
		}
	};

	/**
	 * Config handlers used when amd mode is enabled.
	 * References only methods defined in the AMD spec.
	 */
	const mAMDConfigHandlers = {
		baseUrl: mUI5ConfigHandlers.baseUrl,
		paths(module, url) {
			registerResourcePath(module, resolveURL(url, getResourcePath("") + "/"));
		},
		map: mUI5ConfigHandlers.map,
		shim: mUI5ConfigHandlers.shim
	};

	/**
	 * Executes all available handlers which are defined in the config object
	 *
	 * @param {object} oCfg config to handle
	 * @param {Object<string,function>} mHandlers all available handlers
	 */
	function handleConfigObject(oCfg, mHandlers) {

		function processConfig(key, value) {
			const handler = mHandlers[key];
			if ( typeof handler === 'function' ) {
				if ( handler.length === 1) {
					handler(value);
				} else if ( value != null ) {
					forEach(value, handler);
				}
			} else {
				log.warning(`configuration option ${key} not supported (ignored)`);
			}
		}

		// Make sure the 'baseUrl' handler is called first as
		// other handlers (e.g. paths) depend on it
		if (oCfg.baseUrl) {
			processConfig("baseUrl", oCfg.baseUrl);
		}

		forEach(oCfg, function(key, value) {
			// Ignore "baseUrl" here as it will be handled above
			if (key !== "baseUrl") {
				processConfig(key, value);
			}
		});
	}

	function ui5Config(cfg) {
		if ( cfg === undefined ) {
			return {
				amd: bExposeAsAMDLoader,
				async: bGlobalAsyncMode,
				noConflict: !bExposeAsAMDLoader // TODO needed?
			};
		}
		handleConfigObject(cfg, mUI5ConfigHandlers);
	}

	function amdConfig(cfg) {
		if ( cfg === undefined ) {
			return undefined;
		}
		handleConfigObject(cfg, mAMDConfigHandlers);
	}

	// expose preload function as property of sap.ui.require
	ui5Require.preload = preload;

	// @evo-todo really use this hook for loading. But how to differentiate between sync and async?
	// for now, it is only a notification hook to attach load tests
	ui5Require.load = function(context, url, id) {
	};

	const privateAPI = {

		// properties
		get assert() {
			return assert;
		},
		set assert(v) {
			assert = v;
		},
		get logger() {
			return log;
		},
		set logger(v) {
			log = v;
			aEarlyLogs.forEach(({level, message}) => log[level](message));
		},
		get measure() {
			return measure;
		},
		set measure(v) {
			measure = v;
		},
		/**
		 * @deprecated As of version 1.120, sync loading is deprecated without replacement due to the deprecation
		 *   of sync XMLHttpRequests in the web standard.
		 */
		get translate() {
			return translate;
		},
		/**
		 * @deprecated As of version 1.120, sync loading is deprecated without replacement due to the deprecation
		 *   of sync XMLHttpRequests in the web standard.
		 */
		set translate(v) {
			translate = v;
		},
		get callbackInMicroTask() {
			return simulateAsyncCallback === executeInMicroTask;
		},
		set callbackInMicroTask(v) {
			simulateAsyncCallback = v ? executeInMicroTask : executeInSeparateTask;
		},
		get maxTaskDuration() {
			return iMaxTaskDuration;
		},
		set maxTaskDuration(v) {
			updateMaxTaskDuration(v);
		},

		// methods
		amdDefine,
		amdRequire,
		config: ui5Config,
		/**
		 * @deprecated As of version 1.120, all usages of this private API have been deprecated
		 */
		declareModule(sResourceName, fnDeprecationMessage) {
			/* void */ declareModule(normalize(sResourceName), fnDeprecationMessage);
		},
		defineModuleSync,
		dump: dumpInternals,
		getAllModules,
		getModuleContent,
		getModuleState(sResourceName) {
			return mModules[sResourceName] ? mModules[sResourceName].state : INITIAL;
		},
		getResourcePath,
		getSyncCallBehavior,
		getUrlPrefixes,
		loadJSResourceAsync,
		resolveURL,
		guessResourceName,
		toUrl,
		unloadResources
	};


	// establish APIs in the sap.ui namespace

	__global.sap = __global.sap || {};
	sap.ui = sap.ui || {};

	/**
	 * Provides access to UI5 loader configuration.
	 *
	 * The configuration is used by {@link sap.ui.require} and {@link sap.ui.define}.
	 *
	 * @public
	 * @namespace
	 * @ui5-global-only
	 */
	sap.ui.loader = {

		/**
		 * Sets the configuration for the UI5 loader. The configuration can be updated multiple times.
		 * Later changes do not impact modules that have been loaded before.
		 *
		 * If no parameter is given, a partial copy of UI5 loader configuration in use is returned.
		 *
		 * The configuration options are aligned with the "Common Config" draft of the AMD spec
		 * (https://github.com/amdjs/amdjs-api/blob/master/CommonConfig.md).
		 *
		 * The following code shows an example of what a UI5 loader configuration might look like:
		 * <pre>
		 *
		 *   sap.ui.loader.config({
		 *
		 *     // location from where to load all modules by default
		 *     baseUrl: '../../resources/',
		 *
		 *     paths: {
		 *       // load modules whose ID equals to or starts with 'my/module' from example.com
		 *       'my/module': 'https://example.com/resources/my/module'
		 *     },
		 *
		 *     map: {
		 *       // if any module requires 'sinon', load module 'sap/ui/thirdparty/sinon-4'
		 *       '*': {
		 *         'sinon': 'sap/ui/thirdparty/sinon-4'
		 *       },
		 *       // but if a module whose ID equals to or starts with 'app' requires 'sinon'
		 *       // then load a legacy version instead
		 *       "app": {
		 *         'sinon': 'sap/ui/legacy/sinon'
		 *       }
		 *     },
		 *
		 *     // define two bundles that consists of JS modules only
		 *     bundles: {
		 *       bundle1: ['module1', 'module2'],
		 *       bundle2: ['moduleX', 'moduleY']
		 *     },
		 *
		 *     // define a bundle that also contains non-JS resources
		 *     bundlesUI5: {
		 *       'all.js': ['Component.js', 'manifest.json',
		 *                  'App.controller.js', 'App.view.xml']
		 *     },
		 *
		 *     // activate real async loading and module definitions
		 *     async: true,
		 *
		 *     // provide dependency and export metadata for non-UI5 modules
		 *     shim: {
		 *       'sap/ui/thirdparty/blanket': {
		 *         amd: true,
		 *         exports: 'blanket'
		 *       }
		 *     }
		 *
		 *   });
		 *
		 * </pre>
		 *
		 * @param {object} [cfg]
		 *   The provided configuration gets merged with the UI5 loader configuration in use.
		 *   If <code>cfg</code> is omitted or <code>undefined</code>, a copy of the current configuration
		 *   gets returned, containing at least the properties <code>amd</code> and <code>async</code>.
		 *
		 * @param {string} [cfg.baseUrl='./']
		 *   Default location to load modules from. If none of the configured <code>paths</code> prefixes
		 *   matches a module ID, the module will be loaded from the concatenation of the <code>baseUrl</code>
		 *   and the module ID.
		 *
		 *   If the <code>baseUrl</code> itself is a relative URL, it is evaluated relative to <code>document.baseURI</code>.
		 *
		 * @param {Object.<string, string>} [cfg.paths]
		 *   A map of resource locations keyed by a corresponding module ID prefix.
		 *   When a module is to be loaded, the longest key in <code>paths</code> is searched that is a
		 *   prefix of the module ID. The module will be loaded from the concatenation of the corresponding
		 *   value in <code>paths</code> and the remainder of the module ID (after the prefix). If no entry
		 *   in <code>paths</code> matches, then the module will be loaded from the <code>baseUrl</code>.
		 *
		 *   The prefixes (keys) must not contain relative segments (./ or ../), a trailing slash will be
		 *   removed, and only full name segment matches are considered a match (prefix 'sap/m' does not
		 *   match a module ID 'sap/main').
		 *
		 *   <b>Note</b>: In contrast to the "Common Config" of the AMD spec, the paths (values in the map)
		 *   are interpreted relative to <code>document.baseURI</code>, not relative to <code>cfg.baseUrl</code>.
		 *
		 * @param {Object.<string, Object.<string, string>>} [cfg.map]
		 *   A map of maps that defines how to map module IDs to other module IDs (inner maps)
		 *   in the context of a specific set of modules (keys of outer map).
		 *
		 *   Each key of the outer map represents a module ID prefix that describes the context for which
		 *   its value (inner map) has to be used. The special key <code>*</code> describes the default
		 *   context which applies for any module. Only the most specific matching context will be taken
		 *   into account.
		 *
		 *   Each inner map maps a module ID or module ID prefix to another module ID or module ID prefix.
		 *   Again, only the most specific match is taken into account and only one mapping is evaluated
		 *   (the evaluation of the mappings is not done recursively).
		 *
		 *   Matches are always complete matches, a prefix 'a/b/c' does not match the module ID 'a/b/com'.
		 *
		 * @param {Object.<string, {amd: boolean, deps: string[], exports: (string|string[])}>} [cfg.shim]
		 *   Defines additional metadata for modules for which the normal behavior of the AMD APIs is
		 *   not sufficient.
		 *
		 *   A typical example are scripts that don't use <code>define</code> or <code>sap.ui.define</code>,
		 *   but export to a global name. With the <code>exports</code> property, one or more export
		 *   names can be specified, and the loader can retrieve the exported value after executing the
		 *   corresponding module. If such a module has dependencies, they can be specified in the
		 *   <code>deps</code> array and are loaded and executed before executing the module.
		 *
		 *   The <code>amd</code> flag of a shim is a ui5loader-specific extension of the standard AMD shims.
		 *   If set, the ui5loader hides a currently active AMD loader before executing the module
		 *   and restores it afterwards. Otherwise, it might miss the export of third party modules that
		 *   check for an AMD loader and register with it instead of exporting to a global name. A future
		 *   version of the ui5loader might ignore this flag when it acts as an AMD loader by itself.
		 *
		 *   <b>Note:</b> The ui5loader does not support the <code>init</code> option described by the
		 *   "Common Config" section of the AMD spec.
		 *
		 * @param {Object.<string, string[]>} [cfg.bundles]
		 *   A map of arrays that each define the modules contained in a bundle.
		 *
		 *   Each key of the map represents the module ID of a bundle file. The array value represents
		 *   the set of JavaScript modules (their module IDs) that are contained in the bundle.
		 *
		 *   When a module is required that has not been loaded yet, and for which a containing bundle is
		 *   known, that bundle will be required first. Only then the original module will be required
		 *   again and usually be taken from the just loaded bundle.
		 *
		 *   A bundle will be loaded asynchronously only when the loader is in asynchronous mode and when
		 *   the request for the contained module originates from an asynchronous API. In all other cases,
		 *   the bundle has to be loaded synchronously to fulfill API contracts.
		 *
		 *   <b>Note:</b> The loader only supports one containing bundle per module. If a module is declared
		 *   to be part of multiple bundles, only the last one will be taken into account.
		 *
		 *   This configuration option is basically provided to be compatible with requireJS or SystemJS
		 *   configuration.
		 *
		 * @param {Object.<string, string[]>} [cfg.bundlesUI5]
		 *   A map of arrays that each define the resources contained in a bundle.
		 *
		 *   This is similar to <code>bundles</code>, but all strings are unified resource names including
		 *   a file type extension, not only module IDs. This allows to represent more than just JavaScript
		 *   modules.
		 *
		 *   Each key of the map represents the resource name (in unified resource name syntax) of a bundle
		 *   file. The array value represents the set of resources (also in unified resource name syntax)
		 *   that are contained in the bundle. The array can contain JavaScript as well as other textual
		 *   resource types (e.g. *.xml or *.json resources).
		 *
		 *   When a module is required that has not been loaded yet, and for which a containing bundle is
		 *   known, that bundle will be required first. Only then the original module will be required
		 *   again and usually be taken from the just loaded bundle.
		 *
		 *   A bundle will be loaded asynchronously only when the loader is in asynchronous mode and when
		 *   the request for the contained module originates from an asynchronous API. In all other cases,
		 *   the bundle has to be loaded synchronously to fulfill API contracts.
		 *
		 *   <b>Note:</b> The loader only supports one containing bundle per module. If a module is declared
		 *   to be part of multiple bundles, only the last one will be taken into account.
		 *
		 *   <b>Note:</b> Although non-JS resources can be declared to be part of a bundle, only requests for
		 *   JavaScript modules will currently trigger the loading of a bundle.
		 *
		 * @param {boolean} [cfg.async=false]
		 *   When set to true, <code>sap.ui.require</code> loads modules asynchronously via script tags and
		 *   <code>sap.ui.define</code> executes asynchronously. To enable this feature, it is recommended to
		 *   set the attribute <code>data-sap-ui-async="true"</code> on the application bootstrap tag.
		 *
		 *   <b>Note:</b> Switching back from async to sync is not supported and trying to do so will throw
		 *   an <code>Error</code>
		 *
		 * @param {boolean} [cfg.amd=false]
		 *   When set to true, the ui5loader will overwrite the global properties <code>define</code>
		 *   and <code>require</code> with its own implementations. Any previously active AMD loader will
		 *   be remembered internally and can be restored by setting <code>amd</code> to false again.
		 *
		 *   <b>Note:</b> Switching to the <code>amd</code> mode, the ui5loader will set <code>async</code>
		 *   to true implicitly for activating asynchronous loading. Once the loading behaviour has been
		 *   defined to be asynchronous, it can not be changed to synchronous behaviour again, also not
		 *   via setting <code>amd</code> to false.
		 *
		 * @returns {{amd: boolean, async: boolean, noConflict: boolean}|undefined} UI5 loader configuration in use.
		 * @throws {Error} When trying to switch back from async mode to sync mode.
		 * @public
		 * @since 1.56.0
		 * @function
		 * @ui5-global-only
		 */
		config: ui5Config,

		/**
		 * Internal API of the UI5 loader.
		 *
		 * Must not be used by code outside sap.ui.core.
		 * @private
		 * @ui5-restricted sap.ui.core
		 */
		_: privateAPI
	};

	/**
	 * Sets the configuration of the ui5loader. The configuration can be updated multiple times.
	 * Later changes do not impact modules that have been loaded before.
	 *
	 * Setting the <code>amd</code> option of the sap.ui.loader.config to <code>true</code> is a
	 * prerequisite to use the <code>require.config</code> function
	 * (see {@link sap.ui.loader.config sap.ui.loader.config option amd}).
	 *
	 * The ui5loader acts more AMD compliant in relation to resolution of paths defined as
	 * part of the <code>paths</code> configuration option.
	 *
	 * @param {object} cfg The provided configuration gets merged with the UI5 loader configuration in use.
	 *
	 * @param {string} [cfg.baseUrl='./']
	 *   Default location to load modules from. If none of the configured <code>paths</code> prefixes
	 *   matches a module ID, the module will be loaded from the concatenation of the <code>baseUrl</code>
	 *   and the module ID.
	 *
	 *   If the <code>baseUrl</code> itself is a relative URL, it is evaluated relative to <code>document.baseURI</code>.
	 *
	 * @param {object} [cfg.paths]
	 *   A map of resource locations keyed by a corresponding module ID prefix.
	 *   When a module is to be loaded, the longest key in <code>paths</code> is searched that is a
	 *   prefix of the module ID. The module will be loaded from the concatenation of the corresponding
	 *   value in <code>paths</code> and the remainder of the module ID (after the prefix). If no entry
	 *   in <code>paths</code> matches, then the module will be loaded from the <code>baseUrl</code>.
	 *
	 *   The prefixes (keys) must not contain relative segments (./ or ../), a trailing slash will be
	 *   removed, and only full name segment matches are considered a match (prefix 'sap/m' does not
	 *   match a module ID 'sap/main').
	 *
	 *   <b>Note</b>: In contrast to the {@link sap.ui.loader.config sap.ui.loader.config option paths},
	 *   the paths (values in the map) are interpreted relative to <code>cfg.baseUrl</code>,
	 *   not relative to <code>document.baseURI</code>. The behaviour is exactly as described in the "Common Config" draft
	 *   of the AMD spec (https://github.com/amdjs/amdjs-api/blob/master/CommonConfig.md).
	 *
	 * @param {Object.<string, Object.<string, string>>} [cfg.map]
	 *   A map of maps that defines how to map module IDs to other module IDs (inner maps)
	 *   in the context of a specific set of modules (keys of outer map).
	 *
	 *   Each key of the outer map represents a module ID prefix that describes the context for which
	 *   its value (inner map) has to be used. The special key <code>*</code> describes the default
	 *   context which applies for any module. Only the most specific matching context will be taken
	 *   into account.
	 *
	 *   Each inner map maps a module ID or module ID prefix to another module ID or module ID prefix.
	 *   Again, only the most specific match is taken into account and only one mapping is evaluated
	 *   (the evaluation of the mappings is not done recursively).
	 *
	 *   Matches are always complete matches, a prefix 'a/b/c' does not match the module ID 'a/b/com'.
	 *
	 * @param {Object.<string, {deps: string[], exports: (string|string[])}>} [cfg.shim]
	 *   Defines additional metadata for modules for which the normal behavior of the AMD APIs is
	 *   not sufficient.
	 *
	 *   A typical example are scripts that don't use <code>define</code> or <code>sap.ui.define</code>,
	 *   but export to a global name. With the <code>exports</code> property, one or more export
	 *   names can be specified, and the loader can retrieve the exported value after executing the
	 *   corresponding module. If such a module has dependencies, they can be specified in the
	 *   <code>deps</code> array and are loaded and executed before executing the module.
	 *
	 *   <b>Note:</b> The ui5loader does not support the <code>init</code> option described by the
	 *   "Common Config" section of the AMD spec.
	 *
	 * @returns {undefined}
	 * @public
	 * @name require_config
	 * @function
	 */
	amdRequire.config = amdConfig;

	/**
	 * Defines a JavaScript module with its ID, its dependencies and a module export value or factory.
	 *
	 * The typical and only suggested usage of this method is to have one single, top level call to
	 * <code>sap.ui.define</code> in one JavaScript resource (file). When a module is requested by its
	 * module ID for the first time, the corresponding resource is determined from the ID and the current
	 * {@link sap.ui.loader.config configuration}. The resource will be loaded and executed
	 * which in turn will execute the top level <code>sap.ui.define</code> call.
	 *
	 * If the module ID was omitted from that call, it will be substituted by the ID that was used to
	 * request the module. As a preparation step, the dependencies as well as their transitive dependencies,
	 * will be loaded. Then, the module value (its export) will be determined: if a static value (object, literal)
	 * was given as <code>vFactory</code>, that value will be the module value. If a function was given, that
	 * function will be called (providing the module exports of the declared dependencies as parameters
	 * to the function) and its return value will be used as module export value. The framework internally
	 * associates the resulting value with the module ID and provides it to the original requester of the module.
	 * Whenever the module is requested again, the same export value will be returned (modules are executed only once).
	 *
	 * <i>Example:</i><br>
	 * The following example defines a module, but doesn't hard code the module ID.
	 * If stored in a file 'sap/mylib/SomeClass.js', it can be requested with the ID 'sap/mylib/SomeClass'.
	 * <pre>
	 *   sap.ui.define(['./Helper', 'sap/m/Bar'], function(Helper,Bar) {
	 *
	 *     // create a new class
	 *     var SomeClass = function() {};
	 *
	 *     // add methods to its prototype
	 *     SomeClass.prototype.foo = function() {
	 *
	 *         // use a function from the dependency 'Helper' in the same package (e.g. 'sap/mylib/Helper' )
	 *         var mSettings = Helper.foo();
	 *
	 *         // create and return an sap.m.Bar (using its local name 'Bar')
	 *         return new Bar(mSettings);
	 *
	 *     }
	 *
	 *     // return the class as module value
	 *     return SomeClass;
	 *
	 *   });
	 * </pre>
	 *
	 * In another module or in an application HTML page, the {@link sap.ui.require} API can be used
	 * to load the sap/mylib/Something module and to work with it:
	 *
	 * <pre>
	 * sap.ui.require(['sap/mylib/Something'], function(Something) {
	 *
	 *   // instantiate a Something and call foo() on it
	 *   new Something().foo();
	 *
	 * });
	 * </pre>
	 *
	 *
	 * <h3>Module Name Syntax</h3>
	 *
	 * <code>sap.ui.define</code> uses a simplified variant of the {@link jQuery.sap.getResourcePath
	 * unified resource name} syntax for the module's own name as well as for its dependencies.
	 * The only difference to that syntax is, that for <code>sap.ui.define</code> and
	 * <code>sap.ui.require</code>, the extension (which always would be '.js') has to be omitted.
	 * Both methods always add this extension internally.
	 *
	 * As a convenience, the name of a dependency can start with the segment './' which will be
	 * replaced by the name of the package that contains the currently defined module (relative name).
	 *
	 * It is best practice to omit the name of the defined module (first parameter) and to use
	 * relative names for the dependencies whenever possible. This reduces the necessary configuration,
	 * simplifies renaming of packages and allows to map them to a different namespace.
	 *
	 *
	 * <h3>Dependency to Modules</h3>
	 *
	 * If a dependencies array is given, each entry represents the name of another module that
	 * the currently defined module depends on. All dependency modules are loaded before the export
	 * of the currently defined module is determined. The module export of each dependency module
	 * will be provided as a parameter to a factory function, the order of the parameters will match
	 * the order of the modules in the dependencies array.
	 *
	 * <b>Note:</b> The order in which the dependency modules are <i>executed</i> is <b>not</b>
	 * defined by the order in the dependencies array! The execution order is affected by dependencies
	 * <i>between</i> the dependency modules as well as by their current state (whether a module
	 * already has been loaded or not). Neither module implementations nor dependents that require
	 * a module set must make any assumption about the execution order (other than expressed by
	 * their dependencies).
	 *
	 * <b>Note:</b> A static module export (a literal provided to <code>sap.ui.define</code>) cannot
	 * depend on the module exports of the dependency modules as it has to be calculated before
	 * the dependencies are resolved. As an alternative, modules can define a factory function,
	 * calculate a static export value in that function, potentially based on the dependencies, and
	 * return the result as module export value. The same approach must be taken when the module
	 * export is supposed to be a function.
	 *
	 *
	 * <h3>Asynchronous Contract</h3>
	 *
	 * <code>sap.ui.define</code> is designed to support real Asynchronous Module Definitions (AMD)
	 * in future, although it internally still might use synchronous module loading, depending on
	 * configuration and context. However, callers of <code>sap.ui.define</code> must never rely on
	 * any synchronous behavior that they might observe in a specific test scenario.
	 *
	 * For example, callers of <code>sap.ui.define</code> must not use the module export value
	 * immediately after invoking <code>sap.ui.define</code>:
	 *
	 * <pre>
	 *   // COUNTER EXAMPLE HOW __NOT__ TO DO IT
	 *
	 *   // define a class Something as AMD module
	 *   sap.ui.define('Something', [], function() {
	 *     var Something = function() {};
	 *     return Something;
	 *   });
	 *
	 *   // DON'T DO THAT!
	 *   // accessing the class _synchronously_ after sap.ui.define was called
	 *   new Something();
	 *
	 * </pre>
	 *
	 * Applications that need to ensure synchronous module definition or synchronous loading of dependencies
	 * <b>MUST</b> use the deprecated legacy APIs {@link jQuery.sap.declare} and {@link jQuery.sap.require}.
	 *
	 *
	 * <h3>(No) Global References</h3>
	 *
	 * To be in line with AMD best practices, modules defined with <code>sap.ui.define</code>
	 * should not make any use of global variables if those variables are also available as module
	 * exports. Instead, they should add dependencies to those modules and use the corresponding parameter
	 * of the factory function to access the module exports.
	 *
	 * As the current programming model and the documentation of UI5 heavily rely on global names,
	 * there will be a transition phase where UI5 enables AMD modules and local references to module
	 * exports in parallel to the old global names. The fourth parameter of <code>sap.ui.define</code>
	 * has been added to support that transition phase. When this parameter is set to true, the framework
	 * provides two additional features
	 *
	 * <ol>
	 * <li>Before the factory function is called, the existence of the global parent namespace for
	 *     the current module is ensured</li>
	 * <li>The module export returned by the module's factory function will be automatically exported
	 *     under the global name which is derived from the ID of the module</li>
	 * </ol>
	 *
	 * The parameter lets the framework know whether any of those two operations is needed or not.
	 * In future versions of UI5, a central configuration option is planned to suppress those 'exports'.
	 *
	 *
	 * <h3>Third Party Modules</h3>
	 * Although third party modules don't use UI5 APIs, they still can be listed as dependencies in
	 * a <code>sap.ui.define</code> call. They will be requested and executed like UI5 modules, but to
	 * make their exports available, so called <em>shims</em> have to be defined.
	 *
	 * Note that UI5 temporarily deactivates an existing AMD loader while it executes third party modules
	 * known to support AMD. This sounds contradictorily at a first glance as UI5 wants to support AMD,
	 * but for now it is necessary to fully support UI5 applications that rely on global names for such modules.
	 *
	 * For third-party modules that UI5 delivers (e.g. those in namespace <code>sap/ui/thirdparty/</code>),
	 * the necessary shims are defined by UI5 itself by executing the private module <code>ui5loader-autoconfig.js</code>
	 * during bootstrap.
	 *
	 * Example:
	 * <pre>
	 *   // module 'Something' wants to use third party library 'URI.js'
	 *   // It is packaged by UI5 as non-UI5-module 'sap/ui/thirdparty/URI'
	 *   // the following shim helps UI5 to correctly load URI.js and to retrieve the module's export value
	 *   // Apps don't have to define that shim, it is already applied by ui5loader-autconfig.js
	 *   sap.ui.loader.config({
	 *     shim: {
	 *       'sap/ui/thirdparty/URI': {
	 *          amd: true, // URI.js reacts on an AMD loader, this flag lets UI5 temp. disable such loaders
	 *          exports: 'URI' // name of the global variable under which URI.js exports its module value
	 *       }
	 *     }
	 *   });
	 *
	 *   // now the module can be retrieved like other modules
	 *   sap.ui.define('Something', ['sap/ui/thirdparty/URI'], function(URIModuleValue) {
	 *
	 *     new URIModuleValue(...); // same as the global 'URI' name: new URI(...)
	 *
	 *     ...
	 *   });
	 * </pre>
	 *
	 *
	 * <h3>Differences to Standard AMD</h3>
	 *
	 * The current implementation of <code>sap.ui.define</code> differs from the AMD specification
	 * (https://github.com/amdjs/amdjs-api) or from concrete AMD loaders like <code>requireJS</code>
	 * in several aspects:
	 * <ul>
	 * <li>The name <code>sap.ui.define</code> is different from the plain <code>define</code>.
	 * This has two reasons: first, it avoids the impression that <code>sap.ui.define</code> is
	 * an exact implementation of an AMD loader. And second, it allows the coexistence of an AMD
	 * loader (e.g. requireJS) and <code>sap.ui.define</code> in one application as long as UI5 or
	 * applications using UI5 are not fully prepared to run with an AMD loader.
	 * Note that the difference of the API names also implies that the UI5 loader can't be used
	 * to load 'real' AMD modules as they expect methods <code>define</code> and <code>require</code>
	 * to be available. Modules that use Unified Module Definition (UMD) syntax, can be loaded,
	 * but only when no AMD loader is present or when they expose their export also to the global
	 * namespace, even when an AMD loader is present (as e.g. jQuery does) or when a shim is
	 * defined for them using the <code>amd:true</code> flag (see example above)</li>
	 * <li>Depending on configuration and the current context, <code>sap.ui.define</code> loads
	 * the dependencies of a module either synchronously using a sync XHR call + eval or asynchronously
	 * via script tags. The sync loading is basically a tribute to the synchronous history of UI5.
	 * There's no way for a module developer to enforce synchronous loading of the dependencies and
	 * on the long run, sync loading will be faded out.
	 * Applications that need to ensure synchronous loading of dependencies <b>MUST</b> use the
	 * deprecated legacy APIs like {@link jQuery.sap.require}.</li>
	 * <li><code>sap.ui.define</code> does not support plugins to use other file types, formats or
	 * protocols. It is not planned to support this in future</li>
	 * <li><code>sap.ui.define</code> does not support absolute URLs as module names (dependencies)
	 * nor does it allow module names that start with a slash. To refer to a module at an absolute
	 * URL, a resource root can be registered that points to that URL (or to a prefix of it).</li>
	 * <li><code>sap.ui.define</code> does <b>not</b> support the 'sugar' of requireJS where CommonJS
	 * style dependency declarations using <code>sap.ui.require("something")</code> are automagically
	 * converted into <code>sap.ui.define</code> dependencies before executing the factory function.</li>
	 * </ul>
	 *
	 *
	 * <h3>Restrictions, Design Considerations</h3>
	 * <ul>
	 * <li><b>Restriction</b>: as dependency management is not supported for Non-UI5 modules, the only way
	 *     to ensure proper execution order for such modules currently is to rely on the order in the
	 *     dependency array. Obviously, this only works as long as <code>sap.ui.define</code> uses
	 *     synchronous loading. It will be enhanced when asynchronous loading is implemented.</li>
	 * <li>It was discussed to enforce asynchronous execution of the module factory function (e.g. with a
	 *     timeout of 0). But this would have invalidated the current migration scenario where a
	 *     sync <code>jQuery.sap.require</code> call can load a <code>sap.ui.define</code>'ed module.
	 *     If the module definition would not execute synchronously, the synchronous contract of the
	 *     require call would be broken (default behavior in existing UI5 applications)</li>
	 * <li>A single file must not contain multiple calls to <code>sap.ui.define</code>. Multiple calls
	 *     currently are only supported in the so called 'preload' files that the UI5 merge tooling produces.
	 *     The exact details of how this works might be changed in future implementations and are not
	 *     part of the API contract</li>
	 * </ul>
	 * @param {string} [sModuleName] ID of the module in simplified resource name syntax.
	 *        When omitted, the loader determines the ID from the request.
	 * @param {string[]} [aDependencies] List of dependencies of the module
	 * @param {function|any} vFactory The module export value or a function that calculates that value
	 * @param {boolean} [bExport] Whether an export to global names is required - should be used by SAP-owned code only
	 * @since 1.27.0
	 * @public
	 * @see https://github.com/amdjs/amdjs-api
	 * @function
	 * @ui5-global-only
	 */
	sap.ui.define = ui5Define;

	/**
	 * @private
	 * @ui5-restricted bundles created with UI5 tooling
	 * @function
	 * @ui5-global-only
	 */
	sap.ui.predefine = predefine;

	/**
	 * Resolves one or more module dependencies.
	 *
	 * <h3>Synchronous Retrieval of a Single Module Export Value (Probing)</h3>
	 *
	 * When called with a single string, that string is assumed to be the ID of an already loaded
	 * module and the export of that module is returned. If the module has not been loaded yet,
	 * or if it is a Non-UI5 module (e.g. third-party module) without a shim, <code>undefined</code>
	 * is returned.
	 *
	 * This signature variant allows synchronous access to module exports without initiating module loading.
	 *
	 * Sample:
	 * <pre>
	 *   var JSONModel = sap.ui.require("sap/ui/model/json/JSONModel");
	 * </pre>
	 *
	 * For modules that are known to be UI5 modules, this signature variant can be used to check whether
	 * the module has been loaded.
	 *
	 *
	 * <h3>Asynchronous Loading of Multiple Modules</h3>
	 *
	 * If an array of strings is given and (optionally) a callback function, then the strings
	 * are interpreted as module IDs and the corresponding modules (and their transitive
	 * dependencies) are loaded. Then the callback function will be called asynchronously.
	 * The module exports of the specified modules will be provided as parameters to the callback
	 * function in the same order in which they appeared in the dependencies array.
	 *
	 * The return value for the asynchronous use case is <code>undefined</code>.
	 *
	 * <pre>
	 *   sap.ui.require(['sap/ui/model/json/JSONModel', 'sap/ui/core/UIComponent'], function(JSONModel,UIComponent) {
	 *
	 *     var MyComponent = UIComponent.extend('MyComponent', {
	 *       ...
	 *     });
	 *     ...
	 *
	 *   });
	 * </pre>
	 *
	 * This method uses the same variation of the {@link jQuery.sap.getResourcePath unified resource name}
	 * syntax that {@link sap.ui.define} uses: module names are specified without the implicit extension '.js'.
	 * Relative module names are not supported.
	 *
	 * @param {string|string[]} vDependencies Dependency (dependencies) to resolve
	 * @param {function} [fnCallback] Callback function to execute after resolving an array of dependencies
	 * @param {function(Error)} [fnErrback] Callback function to execute if an error was detected while loading the
	 *                      dependencies or executing the factory function. Note that due to browser restrictions
	 *                      not all errors will be reported via this callback. In general, module loading is
	 *                      designed for the non-error case. Error handling is not complete.
	 * @returns {any|undefined} A single module export value (sync probing variant) or <code>undefined</code> (async loading variant)
	 * @public
	 * @function
	 * @ui5-global-only
	 */
	sap.ui.require = ui5Require;

	/**
	 * Calculates a URL from the provided resource name.
	 *
	 * The calculation takes any configured ID mappings or resource paths into account
	 * (see {@link sap.ui.loader.config config options map and paths}. It also supports relative
	 * segments such as <code>./</code> and <code>../</code> within the path, but not at its beginning.
	 * If relative navigation would cross the root namespace (e.g. <code>sap.ui.require.toUrl("../")</code>)
	 * or when the resource name starts with a slash or with a relative segment, an error is thrown.
	 *
	 * <b>Note:</b> <code>toUrl</code> does not resolve the returned URL; whether it is an absolute
	 * URL or a relative URL depends on the configured <code>baseUrl</code> and <code>paths</code>.
	 *
	 * @example
	 *   sap.ui.loader.config({
	 *     baseUrl: "/home"
	 *   });
	 *
	 *   sap.ui.require.toUrl("app/data")              === "/home/app/data"
	 *   sap.ui.require.toUrl("app/data.json")         === "/home/app/data.json"
	 *   sap.ui.require.toUrl("app/data/")             === "/home/app/data/"
	 *   sap.ui.require.toUrl("app/.config")           === "/home/app/.config"
	 *   sap.ui.require.toUrl("app/test/../data.json") === "/home/data.json"
	 *   sap.ui.require.toUrl("app/test/./data.json")  === "/home/test/data.json"
	 *   sap.ui.require.toUrl("app/../../data")        throws Error because root namespace is left
	 *   sap.ui.require.toUrl("/app")                  throws Error because first character is a slash
	 *
	 * @param {string} sName Name of a resource e.g. <code>'app/data.json'</code>
	 * @returns {string} Path to the resource, e.g. <code>'/home/app/data.json'</code>
	 * @see https://github.com/amdjs/amdjs-api/wiki/require#requiretourlstring-
	 * @throws {Error} If the input name is absolute (starts with a slash character <code>'/'</code>),
	 *   starts with a relative segment or if resolving relative segments would cross the root
	 *   namespace
	 * @public
	 * @name sap.ui.require.toUrl
	 * @function
	 * @ui5-global-only
	 */

	/**
	 * Load a single module synchronously and return its module value.
	 *
	 * Basically, this method is a combination of {@link jQuery.sap.require} and {@link sap.ui.require}.
	 * Its main purpose is to simplify the migration of modules to AMD style in those cases where some dependencies
	 * have to be loaded late (lazy) and synchronously.
	 *
	 * The method accepts a single module name in the same syntax that {@link sap.ui.define} and {@link sap.ui.require}
	 * already use (a simplified variation of the {@link jQuery.sap.getResourcePath unified resource name}:
	 * slash separated names without the implicit extension '.js'). As for <code>sap.ui.require</code>,
	 * relative names (using <code>./</code> or <code>../</code>) are not supported.
	 * If not loaded yet, the named module will be loaded synchronously and the export value of the module will be returned.
	 * While a module is executing, a value of <code>undefined</code> will be returned in case it is required again during
	 * that period of time (e.g. in case of cyclic dependencies).
	 *
	 * <b>Note:</b> the scope of this method is limited to the sap.ui.core library. Callers are strongly encouraged to use
	 * this method only when synchronous loading is unavoidable. Any code that uses this method won't benefit from future
	 * performance improvements that require asynchronous module loading (e.g. HTTP/2). And such code never can comply with
	 * a content security policies (CSP) that forbids 'eval'.
	 *
	 * @param {string} sModuleName Module name in requireJS syntax
	 * @returns {any} Export value of the loaded module (can be <code>undefined</code>)
	 * @private
	 * @ui5-restricted sap.ui.core
	 * @function
	 * @ui5-global-only
	 * @deprecated As of version 1.120, sync loading is deprecated without replacement due to the deprecation
	 *   of sync XMLHttpRequests in the web standard.
	 */
	sap.ui.requireSync = requireSync;

}(globalThis));
//@ui5-bundle-raw-include sap/ui/core/boot/_bootConfig.js
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/* global globalThis */

/**
 * Provide boot relevant configuration.
 * @private
 * @ui5-restricted sap.base, sap.ui.core
 */

// Map Core access to boot
sap.ui.loader.config({
	map: {
		"*": {
			"sap/ui/core/Core": "sap/ui/core/boot"
		}
	}
});

sap.ui.loader.config({
    depCacheUI5: {
        "Eventing-preload-1.js": ["Eventing-preload-0.js"]
    },
    bundlesUI5: {
        "Calendar-preload.js": [
            "sap/base/i18n/Formatting.js",
            "sap/base/i18n/date/CalendarWeekNumbering.js",
            "sap/base/strings/camelize.js",
            "sap/base/util/ObjectPath.js",
            "sap/base/util/Version.js",
            "sap/base/util/array/uniqueSort.js",
            "sap/base/util/deepClone.js",
            "sap/base/util/deepEqual.js",
            "sap/base/util/isEmptyObject.js",
            "sap/base/util/syncFetch.js",
            "sap/ui/base/Metadata.js",
            "sap/ui/base/Object.js",
            "sap/ui/core/AnimationMode.js",
            "sap/ui/core/CalendarType.js",
            "sap/ui/core/Configuration.js",
            "sap/ui/core/ControlBehavior.js",
            "sap/ui/core/Locale.js",
            "sap/ui/core/LocaleData.js",
            "sap/ui/core/Theming.js",
            "sap/ui/core/_ConfigurationProvider.js",
            "sap/ui/core/date/Buddhist.js",
            "sap/ui/core/date/CalendarUtils.js",
            "sap/ui/core/date/CalendarWeekNumbering.js",
            "sap/ui/core/date/Gregorian.js",
            "sap/ui/core/date/Islamic.js",
            "sap/ui/core/date/Japanese.js",
            "sap/ui/core/date/Persian.js",
            "sap/ui/core/date/UI5Date.js",
            "sap/ui/core/date/UniversalDate.js",
            "sap/ui/core/date/UniversalDateUtils.js",
            "sap/ui/core/date/_Calendars.js",
            "sap/ui/core/format/TimezoneUtil.js"
        ],
        "Eventing-preload-0.js": [
            "sap/base/i18n/ResourceBundle.js",
            "sap/base/security/encodeCSS.js",
            "sap/base/security/encodeXML.js",
            "sap/base/strings/capitalize.js",
            "sap/base/strings/escapeRegExp.js",
            "sap/base/strings/formatMessage.js",
            "sap/base/strings/toHex.js",
            "sap/base/util/JSTokenizer.js",
            "sap/base/util/Properties.js",
            "sap/base/util/deepExtend.js",
            "sap/base/util/merge.js",
            "sap/base/util/resolveReference.js",
            "sap/base/util/uid.js",
            "sap/ui/Global.js",
            "sap/ui/VersionInfo.js",
            "sap/ui/base/BindingInfo.js",
            "sap/ui/base/BindingParser.js",
            "sap/ui/base/DataType.js",
            "sap/ui/base/Event.js",
            "sap/ui/base/EventProvider.js",
            "sap/ui/base/ExpressionParser.js",
            "sap/ui/base/ManagedObject.js",
            "sap/ui/base/ManagedObjectMetadata.js",
            "sap/ui/base/ManagedObjectRegistry.js",
            "sap/ui/core/Element.js",
            "sap/ui/core/ElementMetadata.js",
            "sap/ui/core/EnabledPropagator.js",
            "sap/ui/core/FocusHandler.js",
            "sap/ui/core/InvisibleRenderer.js",
            "sap/ui/core/LabelEnablement.js",
            "sap/ui/core/Lib.js",
            "sap/ui/core/Patcher.js",
            "sap/ui/core/RenderManager.js",
            "sap/ui/core/Renderer.js",
            "sap/ui/core/_UrlResolver.js",
            "sap/ui/dom/jquery/Selectors.js",
            "sap/ui/events/ControlEvents.js",
            "sap/ui/events/F6Navigation.js",
            "sap/ui/events/KeyCodes.js",
            "sap/ui/events/PseudoEvents.js"
        ],
        "Eventing-preload-1.js": [
            "sap/ui/events/TouchToMouseMapping.js",
            "sap/ui/events/checkMouseEnterOrLeave.js",
            "sap/ui/events/jquery/EventSimulation.js",
            "sap/ui/model/BindingMode.js",
            "sap/ui/model/Filter.js",
            "sap/ui/model/FilterOperator.js",
            "sap/ui/model/Sorter.js",
            "sap/ui/performance/Measurement.js",
            "sap/ui/performance/XHRInterceptor.js",
            "sap/ui/performance/trace/FESRHelper.js",
            "sap/ui/performance/trace/Interaction.js",
            "sap/ui/util/ActivityDetection.js",
            "sap/ui/thirdparty/URI.js",
            "sap/ui/thirdparty/jquery-compat.js",
            "sap/ui/thirdparty/jquery-mobile-custom.js",
            "sap/ui/thirdparty/jquery.js"
        ],
        "Theming-preload.js": [
            "sap/base/util/each.js",
            "sap/ui/core/theming/ThemeHelper.js",
            "sap/ui/core/theming/ThemeManager.js",
            "sap/ui/dom/includeStylesheet.js"
        ]
    }
});

// location to manifest
globalThis["sap-ui-config"] = globalThis["sap-ui-config"] ? globalThis["sap-ui-config"] : {};
globalThis["sap-ui-config"].bootManifest = "sap/ui/core/boot/manifest.json";

// enable non blocking loader
globalThis["sap-ui-config"].xxMaxLoaderTaskDuration = 0;
//@ui5-bundle-raw-include ui5loader-autoconfig.js
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/*
 * IMPORTANT: This is a private module, its API must not be used and is subject to change.
 * Code other than the OpenUI5 libraries must not introduce dependencies to this module.
 */
(function() {
	/*
	 * This module tries to detect a bootstrap script tag in the current page and
	 * to derive the path for 'resources/' from it. For that purpose it checks for a
	 * hard coded set of well-known bootstrap script names:
	 *  - sap-ui-custom(-suffix)?.js
	 *  - sap-ui-core(-suffix)?.js
	 *  - jquery.sap.global.js
	 *  - ui5loader-autoconfig.js
	 */

	/*global define */
	"use strict";

	/** BaseConfiguration */
	var ui5loader = globalThis.sap && globalThis.sap.ui && globalThis.sap.ui.loader;

	if (ui5loader == null) {
		throw new Error("ui5loader-autoconfig.js: ui5loader is needed, but could not be found");
	}

	const origDefine = globalThis.define;
	globalThis.define = function define(moduleId, dependencies, callback) {
		const imports = dependencies.map((dep) => sap.ui.require(dep));
		const moduleExport = callback(...imports);
		ui5loader._.defineModuleSync(`${moduleId}.js`, moduleExport);
	};

	define("sap/base/strings/_camelize", [], function () {
		var rCamelCase = /[-\.]([a-z0-9])/ig;
		var fnCamelize = function (sString) {
			var sNormalizedString = sString.replace( rCamelCase, function( sMatch, sChar ) {
				return sChar.toUpperCase();
			});
			if (/^[a-z][A-Za-z0-9]*$/.test(sNormalizedString)) {
				return sNormalizedString;
			}
			return undefined;
		};

		return fnCamelize;
	});

	/* helper for finding the bootstrap tag */
	function getBootstrapTag() {
		var oResult;
		function check(oScript, rUrlPattern) {
			var sUrl = oScript && oScript.getAttribute("src");
			var oMatch = rUrlPattern.exec(sUrl);
			var oTagInfo;
			if (oMatch) {
				oTagInfo = {
					tag: oScript,
					url: sUrl,
					resourceRoot: oMatch[1] || ""
				};
			}
			return oTagInfo;
		}

		if (globalThis.document) {
			var rResources = /^((?:.*\/)?resources\/)/,
				rBootScripts, aScripts, i;
			// Prefer script tags which have the sap-ui-bootstrap ID
			// This prevents issues when multiple script tags point to files named
			// "sap-ui-core.js", for example when using the cache buster for UI5 resources
			oResult = check(globalThis.document.querySelector('SCRIPT[src][id=sap-ui-bootstrap]'), rResources);
			if (!oResult) {
				aScripts = globalThis.document.querySelectorAll('SCRIPT[src]');
				rBootScripts = /^([^?#]*\/)?(?:sap-ui-(?:core|custom|boot|merged)(?:-[^?#/]*)?|jquery.sap.global|ui5loader(?:-autoconfig)?)\.js(?:[?#]|$)/;
				for (i = 0; i < aScripts.length; i++) {
					oResult = check(aScripts[i], rBootScripts);
					if (oResult) {
						break;
					}
				}
			}
		}
		return oResult || {};
	}

	/**
	 * @deprecated As of Version 1.120
	 */
	function _createGlobalConfig() {
		var sCfgFile = "sap-ui-config.json",
			url = globalThis["sap-ui-config"];

		if (typeof url === "string") {
			if (globalThis.XMLHttpRequest) {
				ui5loader._.logger.warning("Loading external bootstrap configuration from \"" + url + "\". This is a design time feature and not for productive usage!");
				if (url !== sCfgFile) {
					ui5loader._.logger.warning("The external bootstrap configuration file should be named \"" + sCfgFile + "\"!");
				}
				try {

					var xhr = new XMLHttpRequest();
					xhr.open("GET", url, false);
					xhr.setRequestHeader("Accept", "application/json, text/javascript");

					xhr.addEventListener("load", function() {
						try {
							if (xhr.responseType === "json") {
								globalThis["sap-ui-config"] = xhr.response;
							} else {
								globalThis["sap-ui-config"] = JSON.parse(xhr.responseText);
							}
						} catch (error) {
							ui5loader._.logger.error("Parsing externalized bootstrap configuration from \"" + url + "\" failed! Reason: " + error + "!");
						}
					});
					xhr.addEventListener("error", function() {
						ui5loader._.logger.error("Loading externalized bootstrap configuration from \"" + url + "\" failed! Response: " + xhr.status + "!");
					});

					xhr.send(null);
					globalThis["sap-ui-config"].__loaded = true;

				} catch (error) {
					ui5loader._.logger.error("Loading externalized bootstrap configuration from \"" + url + "\" failed! Reason: " + error + "!");
				}
			}
		}
		var bootstrap = getBootstrapTag();
		if (bootstrap.tag) {
			var dataset = bootstrap.tag.dataset;
			if (dataset["sapUiConfig"]) {
				var sConfig = dataset["sapUiConfig"];
				var oParsedConfig;
				try {
					oParsedConfig = JSON.parse("{" + sConfig + "}");
				} catch (exc) {
					ui5loader._.logger.error("JSON.parse on the data-sap-ui-config attribute failed. Please check the config for JSON syntax violations.");
					/*eslint-disable no-new-func */
					oParsedConfig = (new Function("return {" + sConfig + "};"))();
					/*eslint-enable no-new-func */
				}

				if (oParsedConfig) {
					if (!globalThis["sap-ui-config"]) {
						globalThis["sap-ui-config"] = {};
					}
					Object.assign(globalThis["sap-ui-config"], oParsedConfig);
				}
			 }
		}
	}

	/**
	 * @deprecated As of Version 1.120
	 */
	_createGlobalConfig();

	define("sap/base/config/GlobalConfigurationProvider", [
		"sap/base/strings/_camelize"
	], function (camelize) {
		var oConfig;
		var oWriteableConfig = Object.create(null);
		var rAlias = /^(sapUiXx|sapUi|sap)((?:[A-Z0-9][a-z]*)+)$/; //for getter
		var mFrozenProperties = Object.create(null);
		var bFrozen = false;
		var Configuration;

		function createConfig() {
			oConfig = Object.create(null);
			globalThis["sap-ui-config"] ??= {};
			var mOriginalGlobalParams = {};
			var oGlobalConfig = globalThis["sap-ui-config"];
			if (typeof oGlobalConfig === "object")  {
				for (var sKey in oGlobalConfig) {
					var sNormalizedKey = camelize("sapUi-" + sKey);
					var vFrozenValue = mFrozenProperties[sNormalizedKey];
					if (!sNormalizedKey) {
						ui5loader._.logger.error("Invalid configuration option '" + sKey + "' in global['sap-ui-config']!");
					} else if (Object.hasOwn(oConfig, sNormalizedKey)) {
						ui5loader._.logger.error("Configuration option '" + sKey + "' was already set by '" + mOriginalGlobalParams[sNormalizedKey] + "' and will be ignored!");
					} else if (Object.hasOwn(mFrozenProperties, sNormalizedKey) && oGlobalConfig[sKey] !== vFrozenValue) {
						oConfig[sNormalizedKey] = vFrozenValue;
						ui5loader._.logger.error("Configuration option '" + sNormalizedKey + "' was frozen and cannot be changed to " + oGlobalConfig[sKey] + "!");
					} else {
						oConfig[sNormalizedKey] = oGlobalConfig[sKey];
						mOriginalGlobalParams[sNormalizedKey] = sKey;
					}
				}
			}
			mOriginalGlobalParams = undefined;
		}
		function freeze() {
			if (!bFrozen) {
				createConfig();
				Configuration._.invalidate();
				bFrozen = true;
			}
		}

		function get(sKey, bFreeze) {
			if (Object.hasOwn(mFrozenProperties,sKey)) {
				return mFrozenProperties[sKey];
			}
			var vValue = oWriteableConfig[sKey] || oConfig[sKey];
			if (!Object.hasOwn(oConfig, sKey) && !Object.hasOwn(oWriteableConfig, sKey)) {
				var vMatch = sKey.match(rAlias);
				var sLowerCaseAlias = vMatch ? vMatch[1] + vMatch[2][0] + vMatch[2].slice(1).toLowerCase() : undefined;
				if (sLowerCaseAlias) {
					vValue = oWriteableConfig[sLowerCaseAlias] || oConfig[sLowerCaseAlias];
				}
			}
			if (bFreeze) {
				mFrozenProperties[sKey] = vValue;
			}
			return vValue;
		}

		function set(sKey, vValue) {
			if (Object.hasOwn(mFrozenProperties, sKey) || bFrozen) {
				ui5loader._.logger.error("Configuration option '" + sKey + "' was frozen and cannot be changed to " + vValue + "!");
			} else {
				oWriteableConfig[sKey] = vValue;
			}
		}

		function setConfiguration(Config) {
			Configuration = Config;
		}

		var GlobalConfigurationProvider = {
			get: get,
			set: set,
			freeze: freeze,
			setConfiguration: setConfiguration,
			/**
			 * @deprecated As of Version 1.120
			 */
			_: {
				configLoaded() {
					return !!globalThis["sap-ui-config"].__loaded;
				}
			}
		};

		createConfig();

		return GlobalConfigurationProvider;
	});

	define("sap/ui/core/config/BootstrapConfigurationProvider", [
		"sap/base/strings/_camelize"
	], function(camelize) {
		var oConfig = Object.create(null);
		var rAlias = /^(sapUiXx|sapUi|sap)((?:[A-Z0-9][a-z]*)+)$/; //for getter

		var bootstrap = getBootstrapTag();
		if (bootstrap.tag) {
			var dataset = bootstrap.tag.dataset;
			if (dataset) {
				for (var sKey in dataset) {
					var sNormalizedKey = camelize(sKey);
					if (!sNormalizedKey) {
						ui5loader._.logger.error("Invalid configuration option '" + sKey + "' in bootstrap!");
					} else if (Object.hasOwn(oConfig, sNormalizedKey)) {
						ui5loader._.logger.error("Configuration option '" + sKey + "' already exists and will be ignored!");
					} else {
						oConfig[sNormalizedKey] = dataset[sKey];
					}
				}
			}
		}

		function get(sKey) {
			var vValue = oConfig[sKey];
			if (vValue === undefined) {
				var vMatch = sKey.match(rAlias);
				var sLowerCaseAlias = vMatch ? vMatch[1] + vMatch[2][0] + vMatch[2].slice(1).toLowerCase() : undefined;
				if (sLowerCaseAlias) {
					vValue = oConfig[sLowerCaseAlias];
				}
			}
			return vValue;
		}

		var BootstrapConfigurationProvider = {
			get: get
		};

		return BootstrapConfigurationProvider;
	});

	define("sap/ui/base/config/URLConfigurationProvider", [
		"sap/base/strings/_camelize"
	], function(camelize) {
		var oConfig = Object.create(null);

		if (globalThis.location) {
			oConfig = Object.create(null);
			var mOriginalUrlParams = {};
			var sLocation = globalThis.location.search;
			var urlParams = new URLSearchParams(sLocation);
			urlParams.forEach(function(value, key) {
				const bSapParam = /sap\-?([Uu]?i\-?)?/.test(key);
				var sNormalizedKey = camelize(key);
				if (sNormalizedKey) {
					if (Object.hasOwn(oConfig, sNormalizedKey)) {
						ui5loader._.logger.error("Configuration option '" + key + "' was already set by '" + mOriginalUrlParams[sNormalizedKey] + "' and will be ignored!");
					} else {
						oConfig[sNormalizedKey] = value;
						mOriginalUrlParams[sNormalizedKey] = key;
					}
				} else if (bSapParam) {
					ui5loader._.logger.error("Invalid configuration option '" + key + "' in url!");
				}
			});
			mOriginalUrlParams = undefined;
		}

		function get(sKey) {
			return oConfig[sKey];
		}

		var URLConfigurationProvider = {
			external: true,
			get: get
		};

		return URLConfigurationProvider;
	});

	define("sap/ui/base/config/MetaConfigurationProvider", [
		"sap/base/strings/_camelize"
	], function (camelize) {
		var oConfig = Object.create(null);

		if (globalThis.document) {
			oConfig = Object.create(null);
			var mOriginalTagNames = {};
			var allMetaTags = globalThis.document.querySelectorAll("meta");
			allMetaTags.forEach(function(tag) {
				var sNormalizedKey = camelize(tag.name);
				const bSapParam = /sap\-?([Uu]?i\-?)?/.test(tag.name);
				if (sNormalizedKey) {
					if (Object.hasOwn(oConfig, sNormalizedKey)) {
						ui5loader._.logger.error("Configuration option '" + tag.name + "' was already set by '" + mOriginalTagNames[sNormalizedKey] + "' and will be ignored!");
					} else {
						oConfig[sNormalizedKey] = tag.content;
						mOriginalTagNames[sNormalizedKey] = tag.name;
					}
				} else if (tag.name && bSapParam) { // tags without explicit name (tag.name === "") are ignored silently
					ui5loader._.logger.error("Invalid configuration option '" + tag.name + "' in meta tag!");
				}
			});
			mOriginalTagNames = undefined;
		}

		function get(sKey) {
			return oConfig[sKey];
		}

		var MetaConfigurationProvider = {
			get: get
		};

		return MetaConfigurationProvider;
	});

	define("sap/base/config/_Configuration", [
		"sap/base/config/GlobalConfigurationProvider"
	], function _Configuration(GlobalConfigurationProvider) {
		var rValidKey = /^[a-z][A-Za-z0-9]*$/;
		var rXXAlias = /^(sapUi(?!Xx))(.*)$/;
		var mCache = Object.create(null);
		var aProvider = [GlobalConfigurationProvider];
		var mUrlParamOptions = {
			name: "sapUiIgnoreUrlParams",
			type: "boolean"
		};
		var mInternalDefaultValues = {
			"boolean": false,
			"code": undefined,
			"integer": 0,
			"string": "",
			"string[]": [],
			"function[]": [],
			"function": undefined,
			"object": {},
			"mergedObject": {}
		};

		/**
		 * Enum for available types of configuration entries.
		 *
		 * @enum {string}
		 * @alias module:sap/base/config.Type
		 * @private
		 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
		 */
		var TypeEnum = {
			/**
			 * defaultValue: false
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 */
			"Boolean": "boolean",
			/**
			 * defaultValue: undefined
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 * @deprecated As of Version 1.120
			 */
			"Code": "code",
			/**
			 * defaultValue: 0
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 */
			"Integer": "integer",
			/**
			 * defaultValue: ""
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 */
			"String": "string",
			/**
			 * defaultValue: []
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 */
			"StringArray": "string[]",
			/**
			 * defaultValue: []
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 */
			"FunctionArray": "function[]",
			/**
			 * defaultValue: undefined
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 */
			"Function": "function",
			/**
			 * defaultValue: {}
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 */
			"Object":  "object",
			/**
			 * defaultValue: {}
			 * @private
			 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
			 */
			"MergedObject":  "mergedObject"
		};

		var bGlobalIgnoreExternal = get(mUrlParamOptions);

		function deepClone(src) {
			if (src == null) {
				return src;
			} else if (Array.isArray(src)) {
				return cloneArray(src);
			} else if (typeof src === "object") {
				return cloneObject(src);
			} else {
				return src;
			}
		}

		function cloneArray(src) {
			var aClone = [];
			for (var i = 0; i < src.length; i++) {
				aClone.push(deepClone(src[i]));
			}

			return aClone;
		}

		function cloneObject(src) {
			var oClone = {};

			for (var key in src) {
				if (key === "__proto__") {
					continue;
				}
				oClone[key] = deepClone(src[key]);
			}

			return oClone;
		}

		/** Register a new Configuration provider
		 *
		 * @name module:sap/base/config.registerProvider
		 * @function
		 * @param {object} oProvider The provider instance
		 * @private
		 * @ui5-restricted sap.ui.core
		 */
		function registerProvider(oProvider) {
			if (aProvider.indexOf(oProvider) === -1) {
				aProvider.push(oProvider);
				invalidate();
				bGlobalIgnoreExternal = get(mUrlParamOptions);
			}
		}

		/**
		 * Converts a given value to the given type.
		 *
		 * @name module:sap/base/config.convertToType
		 * @function
		 * @param {any} vValue The value to be converted
		 * @param {string} vType The resulting type
		 * @param {string} [sName] The property name of the enumeration to check
		 * @returns {any} The converted value
		 * @throws {TypeError} Throws an TypeError if the given value could not be converted to the requested type
		 *
		 * @private
		 */
		function convertToType(vValue, vType, sName) {
			if (vValue === undefined || vValue === null) {
				return vValue;
			}

			if (typeof vType === "string") {
				switch (vType) {
					case TypeEnum.Boolean:
						if (typeof vValue === "string") {
							return vValue.toLowerCase() === "true" || vValue.toLowerCase() === "x";
						} else {
							vValue = !!vValue;
						}
						break;
					/**
					 * @deprecated As of Version 1.120
					 */
					case TypeEnum.Code:
						vValue = typeof vValue === "function" ? vValue : String(vValue);
						break;
					case TypeEnum.Integer:
						if (typeof vValue === "string") {
							vValue = parseInt(vValue);
						}
						if (typeof vValue !== 'number' && isNaN(vValue)) {
							throw new TypeError("unsupported value");
						}
						break;
					case TypeEnum.String:
						vValue = '' + vValue; // enforce string
						break;
					case TypeEnum.StringArray:
						if (Array.isArray(vValue)) {
							return vValue;
						} else if (typeof vValue === "string") {
							// enforce array
							vValue = vValue ? vValue.split(/[,;]/).map(function(s) {
								return s.trim();
							}) : [];
							return vValue;
						} else {
							throw new TypeError("unsupported value");
						}
					case TypeEnum.FunctionArray:
						vValue.forEach(function(fnFunction) {
							if ( typeof fnFunction !== "function" ) {
								throw new TypeError("Not a function: " + fnFunction);
							}
						});
						break;
					case TypeEnum.Function:
						if (typeof vValue !== "function") {
							throw new TypeError("unsupported value");
						}
						break;
					case TypeEnum.Object:
					case TypeEnum.MergedObject:
						if (typeof vValue === "string") {
							vValue = JSON.parse(vValue);
						}
						if (typeof vValue !== "object") {
							throw new TypeError("unsupported value");
						}
						break;
					default:
						throw new TypeError("unsupported type");
				}
			} else if (typeof vType === "object" && !Array.isArray(vType)) {
				vValue = checkEnum(vType, vValue, sName);
			} else if (typeof vType === "function") {
				vValue = vType(vValue);
			} else {
				throw new TypeError("unsupported type");
			}

			return vValue;
		}

		/**
		 * Checks if a value exists within an enumerable list.
		 *
		 * @name module:sap/base/config._.checkEnum
		 * @function
		 * @param {object} oEnum Enumeration object with values for validation
		 * @param {string} sValue Value to check against enumerable list
		 * @param {string} sPropertyName Name of the property which is checked
		 * @returns {string} Value passed to the function for check
		 * @throws {TypeError} If the value could not be found, an TypeError is thrown
		 *
		 * @private
		 */
		function checkEnum(oEnum, sValue, sPropertyName) {
			var aValidValues = [];
			for (var sKey in oEnum) {
				if (oEnum.hasOwnProperty(sKey)) {
					if (oEnum[sKey] === sValue) {
						return sValue;
					}
					aValidValues.push(oEnum[sKey]);
				}
			}
			throw new TypeError("Unsupported Enumeration value for " + sPropertyName + ", valid values are: " + aValidValues.join(", "));
		}

		/**
		 * Generic getter for configuration options that are not explicitly exposed via a dedicated own getter.
		 *
		 * @name module:sap/base/config.get
		 * @function
		 * @param {object} mOptions The options object that contains the following properties
		 * @param {string} mOptions.name Name of the configuration parameter. Must start with 'sapUi/sapUiXx' prefix followed by letters only. The name must be camel-case
		 * @param {module:sap/base/config.Type|object<string, string>|function} mOptions.type Type of the configuration parameter. This argument can be a <code>module:sap/base/config.Type</code>, object or function.
		 * @param {any} [mOptions.defaultValue=undefined] Default value of the configuration parameter corresponding to the given type or a function returning the default value.
		 * @param {boolean} [mOptions.external=false] Whether external (e.g. url-) parameters should be included or not
		 * @param {boolean} [mOptions.freeze=false] Freezes parameter and parameter can't be changed afterwards.
		 * @returns {any} Value of the configuration parameter
		 * @throws {TypeError} Throws an error if the given parameter name does not match the definition.
		 * @private
		 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
		 */
		function get(mOptions) {
			if (typeof mOptions.name !== "string" || !rValidKey.test(mOptions.name)) {
				throw new TypeError(
					"Invalid configuration key '" + mOptions.name + "'!"
				);
			}
			var sCacheKey = mOptions.name;
			if (mOptions.provider) {
				sCacheKey += "-" + mOptions.provider.getId();
			}
			if (!(sCacheKey in mCache)) {
				mOptions = Object.assign({}, mOptions);
				var vValue;

				var bIgnoreExternal = bGlobalIgnoreExternal || !mOptions.external;
				var sName = mOptions.name;
				var vMatch = sName.match(rXXAlias);
				var vDefaultValue = mOptions.hasOwnProperty("defaultValue") ? mOptions.defaultValue : mInternalDefaultValues[mOptions.type];

				const aAllProvider = [...aProvider, ...(mOptions.provider ? [mOptions.provider] : [])];

				for (var i = aAllProvider.length - 1; i >= 0; i--) {
					if (!aAllProvider[i].external || !bIgnoreExternal) {
						const vProviderValue = convertToType(aAllProvider[i].get(sName, mOptions.freeze), mOptions.type, mOptions.name);
						if (vProviderValue !== undefined) {
							if (mOptions.type === TypeEnum.MergedObject) {
								vValue = Object.assign({}, vProviderValue, vValue);
							} else {
								vValue = vProviderValue;
								break;
							}
						}
					}
				}
				if (vValue === undefined && (vMatch && vMatch[1] === "sapUi")) {
					mOptions.name = vMatch[1] + "Xx" + vMatch[2];
					vValue = get(mOptions);
				}
				if (vValue === undefined) {
					if (typeof vDefaultValue === 'function') {
						vDefaultValue = vDefaultValue();
					}
					vValue = vDefaultValue;
				}
				mCache[sCacheKey] = vValue;
			}
			var vCachedValue = mCache[sCacheKey];
			if (typeof mOptions.type !== 'function' && (mOptions.type === TypeEnum.StringArray || mOptions.type === TypeEnum.Object || mOptions.type === TypeEnum.MergedObject)) {
				vCachedValue = deepClone(vCachedValue);
			}
			return vCachedValue;
		}

		function invalidate() {
			mCache = Object.create(null);
		}

		/**
		 * Returns a writable base configuration instance
		 * @returns {module:sap/base/config/_Configuration} The writable base configuration
		 */
		function getWritableBootInstance() {
			var oProvider = aProvider[0];

			return {
				set: function(sName, vValue) {
					var rValidKey = /^[a-z][A-Za-z0-9]*$/;
					if (rValidKey.test(sName)) {
						oProvider.set(sName, vValue);
						invalidate();
					} else {
						throw new TypeError(
							"Invalid configuration key '" + sName + "'!"
						);
					}
				},
				get: get,
				Type: TypeEnum
			};
		}

		var Configuration = {
			get: get,
			getWritableBootInstance: getWritableBootInstance,
			registerProvider: registerProvider,
			Type: TypeEnum,
			_: {
				checkEnum: checkEnum,
				invalidate: invalidate
			}
		};

		//forward Configuration to Global provider to invalidate the cache when freezing
		GlobalConfigurationProvider.setConfiguration(Configuration);

		return Configuration;
	});

	globalThis.define = origDefine;

	function _setupConfiguration() {
		var BaseConfiguration = sap.ui.require('sap/base/config/_Configuration');
		//register config provider
		BaseConfiguration.registerProvider(sap.ui.require("sap/ui/core/config/BootstrapConfigurationProvider"));
		BaseConfiguration.registerProvider(sap.ui.require("sap/ui/base/config/MetaConfigurationProvider"));
		BaseConfiguration.registerProvider(sap.ui.require("sap/ui/base/config/URLConfigurationProvider"));
	}

	/** init configuration */
	_setupConfiguration();

	var BaseConfig = sap.ui.require("sap/base/config/_Configuration");

	/** autoconfig */
	var sBaseUrl, bNojQuery,
		aScripts, rBootScripts, i,
		sBootstrapUrl;

	function findBaseUrl(oScript, rUrlPattern) {
		var sUrl = oScript && oScript.getAttribute("src"),
			oMatch = rUrlPattern.exec(sUrl);
		if ( oMatch ) {
			sBaseUrl = oMatch[1] || "";
			sBootstrapUrl = sUrl;
			bNojQuery = /sap-ui-core-nojQuery\.js(?:[?#]|$)/.test(sUrl);
			return true;
		}
		return false;
	}

	function ensureSlash(path) {
		return path && path[path.length - 1] !== '/' ? path + '/' : path;
	}

	// Prefer script tags which have the sap-ui-bootstrap ID
	// This prevents issues when multiple script tags point to files named
	// "sap-ui-core.js", for example when using the cache buster for UI5 resources
	if ( !findBaseUrl(document.querySelector('SCRIPT[src][id=sap-ui-bootstrap]'), /^((?:[^?#]*\/)?resources\/)/ ) ) {

		// only when there's no such script tag, check all script tags
		rBootScripts = /^([^?#]*\/)?(?:sap-ui-(?:core|custom|boot|merged)(?:-[^?#/]*)?|jquery.sap.global|ui5loader(?:-autoconfig)?)\.js(?:[?#]|$)/;
		aScripts = document.scripts;
		for ( i = 0; i < aScripts.length; i++ ) {
			if ( findBaseUrl(aScripts[i], rBootScripts) ) {
				break;
			}
		}
	}

	// configuration via window['sap-ui-config'] always overrides an auto detected base URL
	var mResourceRoots = BaseConfig.get({
		name: "sapUiResourceRoots",
		type: BaseConfig.Type.MergedObject
	});
	if (typeof mResourceRoots[''] === 'string' ) {
		sBaseUrl = mResourceRoots[''];
	}

	if (sBaseUrl == null) {
		throw new Error("ui5loader-autoconfig.js: could not determine base URL. No known script tag and no configuration found!");
	}

	/**
	 * Determine whether a bootstrap reboot URL is set to reboot UI5 from a different URL
	 */
	(function() {
		var sRebootUrl;
		try { // Necessary for FF when Cookies are disabled
			sRebootUrl = window.localStorage.getItem("sap-ui-reboot-URL");
		} catch (e) { /* no warning, as this will happen on every startup, depending on browser settings */ }

		/*
		 * Determine whether sap-bootstrap-debug is set, run debugger statement
		 * to allow early debugging in browsers with broken dev tools
		 */
		var bDebugBootstrap = BaseConfig.get({
			name: "sapBootstrapDebug",
			type: BaseConfig.Type.Boolean,
			external: true,
			freeze: true
		});
		if (bDebugBootstrap) {
			/*eslint-disable no-debugger */
			debugger;
			/*eslint-enable no-debugger */
		}

		if (sRebootUrl) {
			var sDebugRebootPath = ensureSlash(sBaseUrl) + 'sap/ui/core/support/debugReboot.js';

			// This won't work in case this script is loaded async (e.g. dynamic script tag)
			document.write("<script src=\"" + sDebugRebootPath + "\"></script>");

			var oRestart = new Error("This is not a real error. Aborting UI5 bootstrap and rebooting from: " + sRebootUrl);
			oRestart.name = "Restart";
			throw oRestart;
		}

	})();

	/**
	 * Determine whether to use debug sources depending on URL parameter, local storage
	 * and script tag attribute.
	 * If full debug mode is required, restart with a debug version of the bootstrap.
	 */
	(function() {
		// check URI param
		var vDebugInfo = BaseConfig.get({
			name: "sapUiDebug",
			type: BaseConfig.Type.String,
			defaultValue: false,
			external: true,
			freeze: true
		});

		// check local storage
		try {
			vDebugInfo = vDebugInfo || window.localStorage.getItem("sap-ui-debug");
		} catch (e) {
			// access to localStorage might be disallowed
		}

		// normalize vDebugInfo; afterwards, it either is a boolean or a string not representing a boolean
		if ( typeof vDebugInfo === 'string' ) {
			if ( /^(?:false|true|x|X)$/.test(vDebugInfo) ) {
				vDebugInfo = vDebugInfo !== 'false';
			}
		} else {
			vDebugInfo = !!vDebugInfo;
		}

		// if bootstrap URL explicitly refers to a debug source, generally use debug sources
		if ( /-dbg\.js([?#]|$)/.test(sBootstrapUrl) ) {
			window['sap-ui-loaddbg'] = true;
			vDebugInfo = vDebugInfo || true;
		}

		// export resulting debug mode under legacy property
		window["sap-ui-debug"] = vDebugInfo;

		// check for optimized sources by testing variable names in a local function
		// (check for native API ".getAttribute" to make sure that the function's source can be retrieved)
		window["sap-ui-optimized"] = window["sap-ui-optimized"] ||
			(/\.getAttribute/.test(findBaseUrl) && !/oScript/.test(findBaseUrl));

		if ( window["sap-ui-optimized"] && vDebugInfo ) {
			// if current sources are optimized and any debug sources should be used, enable the "-dbg" suffix
			window['sap-ui-loaddbg'] = true;
			// if debug sources should be used in general, restart with debug URL (if not disabled, e.g. by test runner)
			if ( vDebugInfo === true && !window["sap-ui-debug-no-reboot"] ) {
				var sDebugUrl;
				if ( sBootstrapUrl != null ) {
					sDebugUrl = sBootstrapUrl.replace(/\/(?:sap-ui-cachebuster\/)?([^\/]+)\.js/, "/$1-dbg.js");
				} else {
					// when no boot script could be identified, we can't derive the name of the
					// debug boot script from it, so fall back to a default debug boot script
					sDebugUrl = ensureSlash(sBaseUrl) + 'sap-ui-core.js';
				}
				// revert changes to global names
				ui5loader.config({
					amd:false
				});
				window["sap-ui-optimized"] = false;

				if (ui5loader.config().async) {
					var script = document.createElement("script");
					script.src = sDebugUrl;
					document.head.appendChild(script);
				} else {
					document.write("<script src=\"" + sDebugUrl + "\"></script>");
				}

				var oRestart = new Error("This is not a real error. Aborting UI5 bootstrap and restarting from: " + sDebugUrl);
				oRestart.name = "Restart";
				throw oRestart;
			}
		}

		function makeRegExp(sGlobPattern) {
			if (!/\/\*\*\/$/.test(sGlobPattern)) {
				sGlobPattern = sGlobPattern.replace(/\/$/, '/**/');
			}
			return sGlobPattern.replace(/\*\*\/|\*|[[\]{}()+?.\\^$|]/g, function(sMatch) {
				switch (sMatch) {
					case '**/': return '(?:[^/]+/)*';
					case '*': return '[^/]*';
					default: return '\\' + sMatch;
				}
			});
		}

		var fnIgnorePreload;

		if (typeof vDebugInfo === 'string') {
			var sPattern = "^(?:" + vDebugInfo.split(/,/).map(makeRegExp).join("|") + ")",
				rFilter = new RegExp(sPattern);

			fnIgnorePreload = function(sModuleName) {
				return rFilter.test(sModuleName);
			};

			ui5loader._.logger.debug("Modules that should be excluded from preload: '" + sPattern + "'");

		} else if (vDebugInfo === true) {

			fnIgnorePreload = function() {
				return true;
			};

			ui5loader._.logger.debug("All modules should be excluded from preload");

		}

		ui5loader.config({
			debugSources: !!window['sap-ui-loaddbg'],
			ignoreBundledResources: fnIgnorePreload
		});

	})();

	const bFuture = BaseConfig.get({
		name: "sapUiXxFuture",
		type: BaseConfig.Type.Boolean,
		external: true,
		freeze: true
	});

	/**
	 * Evaluate legacy configuration.
	 * @deprecated As of version 1.120
	 */
	(() => {
		// xx-future implicitly sets the loader to async
		const bAsync = BaseConfig.get({
			name: "sapUiAsync",
			type: BaseConfig.Type.Boolean,
			external: true,
			freeze: true
		}) || bFuture;

		if (bAsync) {
			ui5loader.config({
				async: true
			});
		}
	})();

	// Note: loader converts any NaN value to a default value
	ui5loader._.maxTaskDuration = BaseConfig.get({
		name: "sapUiXxMaxLoaderTaskDuration",
		type: BaseConfig.Type.Integer,
		defaultValue: undefined,
		external: true,
		freeze: true
	});

	// support legacy switch 'noLoaderConflict', but 'amdLoader' has higher precedence
	const bExposeAsAMDLoader = BaseConfig.get({
		name: "sapUiAmd",
		type: BaseConfig.Type.Boolean,
		defaultValue: !BaseConfig.get({
			name: "sapUiNoLoaderConflict",
			type: BaseConfig.Type.Boolean,
			defaultValue: true,
			external: true,
			freeze: true
		}),
		external: true,
		freeze: true
	});

	// calculate syncCallBehavior
	let syncCallBehavior = 0; // ignore
	let sNoSync = BaseConfig.get({ // call must be made to ensure freezing
		name: "sapUiXxNoSync",
		type: BaseConfig.Type.String,
		external: true,
		freeze: true
	});

	// sap-ui-xx-future enforces strict sync call behavior
	sNoSync = bFuture ? "x" : sNoSync;

	if (sNoSync === 'warn') {
		syncCallBehavior = 1;
	} else if (/^(true|x)$/i.test(sNoSync)) {
		syncCallBehavior = 2;
	}

	/**
	 * @deprecated As of version 1.120
	 */
	(() => {
		const GlobalConfigurationProvider = sap.ui.require("sap/base/config/GlobalConfigurationProvider");
		if ( syncCallBehavior && GlobalConfigurationProvider._.configLoaded()) {
			const sMessage = "[nosync]: configuration loaded via sync XHR";
			if (syncCallBehavior === 1) {
				ui5loader._.logger.warning(sMessage);
			} else {
				ui5loader._.logger.error(sMessage);
			}
		}
	})();

	ui5loader.config({
		baseUrl: sBaseUrl,

		amd: bExposeAsAMDLoader,

		map: {
			"*": {
				'blanket': 'sap/ui/thirdparty/blanket',
				'crossroads': 'sap/ui/thirdparty/crossroads',
				'd3': 'sap/ui/thirdparty/d3',
				'handlebars': 'sap/ui/thirdparty/handlebars',
				'hasher': 'sap/ui/thirdparty/hasher',
				'IPv6': 'sap/ui/thirdparty/IPv6',
				'jquery': 'sap/ui/thirdparty/jquery',
				'jszip': 'sap/ui/thirdparty/jszip',
				'less': 'sap/ui/thirdparty/less',
				'OData': 'sap/ui/thirdparty/datajs',
				'punycode': 'sap/ui/thirdparty/punycode',
				'SecondLevelDomains': 'sap/ui/thirdparty/SecondLevelDomains',
				'sinon': 'sap/ui/thirdparty/sinon',
				'signals': 'sap/ui/thirdparty/signals',
				'URI': 'sap/ui/thirdparty/URI',
				'URITemplate': 'sap/ui/thirdparty/URITemplate',
				'esprima': 'sap/ui/documentation/sdk/thirdparty/esprima'
			}
		},

		reportSyncCalls: syncCallBehavior,

		shim: {
			'sap/ui/thirdparty/bignumber': {
				amd: true,
				exports: 'BigNumber'
			},
			'sap/ui/thirdparty/blanket': {
				amd: true,
				exports: 'blanket' // '_blanket', 'esprima', 'falafel', 'inBrowser', 'parseAndModify'
			},
			'sap/ui/thirdparty/caja-html-sanitizer': {
				amd: false,
				exports: 'html' // 'html_sanitizer', 'html4'
			},
			'sap/ui/thirdparty/crossroads': {
				amd: true,
				exports: 'crossroads',
				deps: ['sap/ui/thirdparty/signals']
			},
			'sap/ui/thirdparty/d3': {
				amd: true,
				exports: 'd3'
			},
			'sap/ui/thirdparty/datajs': {
				amd: true,
				exports: 'OData' // 'datajs'
			},
			'sap/ui/thirdparty/handlebars': {
				amd: true,
				exports: 'Handlebars'
			},
			'sap/ui/thirdparty/hasher': {
				amd: true,
				exports: 'hasher',
				deps: ['sap/ui/thirdparty/signals']
			},
			'sap/ui/thirdparty/IPv6': {
				amd: true,
				exports: 'IPv6'
			},
			'sap/ui/thirdparty/iscroll-lite': {
				amd: false,
				exports: 'iScroll'
			},
			'sap/ui/thirdparty/iscroll': {
				amd: false,
				exports: 'iScroll'
			},
			'sap/ui/thirdparty/jquery': {
				amd: true,
				exports: 'jQuery',
				deps: ['sap/ui/thirdparty/jquery-compat']
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-datepicker': {
				deps: ['sap/ui/thirdparty/jqueryui/jquery-ui-core'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-draggable': {
				deps: ['sap/ui/thirdparty/jqueryui/jquery-ui-mouse'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-droppable': {
				deps: ['sap/ui/thirdparty/jqueryui/jquery-ui-mouse', 'sap/ui/thirdparty/jqueryui/jquery-ui-draggable'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-effect': {
				deps: ['sap/ui/thirdparty/jquery'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-mouse': {
				deps: ['sap/ui/thirdparty/jqueryui/jquery-ui-core', 'sap/ui/thirdparty/jqueryui/jquery-ui-widget'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-position': {
				deps: ['sap/ui/thirdparty/jquery'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-resizable': {
				deps: ['sap/ui/thirdparty/jqueryui/jquery-ui-mouse'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-selectable': {
				deps: ['sap/ui/thirdparty/jqueryui/jquery-ui-mouse'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-sortable': {
				deps: ['sap/ui/thirdparty/jqueryui/jquery-ui-mouse'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jqueryui/jquery-ui-widget': {
				deps: ['sap/ui/thirdparty/jquery'],
				exports: 'jQuery'
			},
			'sap/ui/thirdparty/jquery-mobile-custom': {
				amd: true,
				deps: ['sap/ui/thirdparty/jquery', 'sap/ui/Device'],
				exports: 'jQuery.mobile'
			},
			'sap/ui/thirdparty/jszip': {
				amd: true,
				exports: 'JSZip'
			},
			'sap/ui/thirdparty/less': {
				amd: true,
				exports: 'less'
			},
			'sap/ui/thirdparty/qunit-2': {
				amd: false,
				exports: 'QUnit'
			},
			'sap/ui/thirdparty/punycode': {
				amd: true,
				exports: 'punycode'
			},
			'sap/ui/thirdparty/RequestRecorder': {
				amd: true,
				exports: 'RequestRecorder',
				deps: ['sap/ui/thirdparty/URI', 'sap/ui/thirdparty/sinon']
			},
			'sap/ui/thirdparty/require': {
				exports: 'define' // 'require', 'requirejs'
			},
			'sap/ui/thirdparty/SecondLevelDomains': {
				amd: true,
				exports: 'SecondLevelDomains'
			},
			'sap/ui/thirdparty/signals': {
				amd: true,
				exports: 'signals'
			},
			'sap/ui/thirdparty/sinon': {
				amd: true,
				exports: 'sinon'
			},
			'sap/ui/thirdparty/sinon-4': {
				amd: true,
				exports: 'sinon'
			},
			'sap/ui/thirdparty/sinon-server': {
				amd: true,
				exports: 'sinon' // really sinon! sinon-server is a subset of server and uses the same global for export
			},
			'sap/ui/thirdparty/URI': {
				amd: true,
				exports: 'URI'
			},
			'sap/ui/thirdparty/URITemplate': {
				amd: true,
				exports: 'URITemplate',
				deps: ['sap/ui/thirdparty/URI']
			},
			'sap/ui/thirdparty/vkbeautify': {
				amd: false,
				exports: 'vkbeautify'
			},
			'sap/ui/thirdparty/zyngascroll': {
				amd: false,
				exports: 'Scroller' // 'requestAnimationFrame', 'cancelRequestAnimationFrame', 'core'
			},
			'sap/ui/demokit/js/esprima': {
				amd: true,
				exports: 'esprima'
			},
			'sap/ui/documentation/sdk/thirdparty/esprima': {
				amd: true,
				exports: 'esprima'
			},
			'sap/viz/libs/canvg': {
				deps: ['sap/viz/libs/rgbcolor']
			},
			'sap/viz/libs/rgbcolor': {
			},
			'sap/viz/libs/sap-viz': {
				deps: ['sap/viz/library', 'sap/ui/thirdparty/jquery', 'sap/ui/thirdparty/d3', 'sap/viz/libs/canvg']
			},
			'sap/viz/libs/sap-viz-info-charts': {
				deps: ['sap/viz/libs/sap-viz-info-framework']
			},
			'sap/viz/libs/sap-viz-info-framework': {
				deps: ['sap/ui/thirdparty/jquery', 'sap/ui/thirdparty/d3']
			},
			'sap/viz/ui5/container/libs/sap-viz-controls-vizcontainer': {
				deps: ['sap/viz/libs/sap-viz', 'sap/viz/ui5/container/libs/common/libs/rgbcolor/rgbcolor_static']
			},
			'sap/viz/ui5/controls/libs/sap-viz-vizframe/sap-viz-vizframe': {
				deps: ['sap/viz/libs/sap-viz-info-charts']
			},
			'sap/viz/ui5/controls/libs/sap-viz-vizservices/sap-viz-vizservices': {
				deps: ['sap/viz/libs/sap-viz-info-charts']
			},
			'sap/viz/resources/chart/templates/standard_fiori/template': {
				deps: ['sap/viz/libs/sap-viz-info-charts']
			}
		}
	});

	var defineModuleSync = ui5loader._.defineModuleSync;

	defineModuleSync('ui5loader.js', null);
	defineModuleSync('ui5loader-autoconfig.js', null);

	if (bNojQuery && typeof jQuery === 'function') {
		// when we're executed in the context of the sap-ui-core-noJQuery file,
		// we try to detect an existing jQuery / jQuery position plugin and register them as modules
		defineModuleSync('sap/ui/thirdparty/jquery.js', jQuery);
		if (jQuery.ui && jQuery.ui.position) {
			defineModuleSync('sap/ui/thirdparty/jqueryui/jquery-ui-position.js', jQuery);
		}
	}

	var sMainModule = BaseConfig.get({
		name: "sapUiMain",
		type: BaseConfig.Type.String,
		freeze: true
	});
	if ( sMainModule ) {
		sap.ui.require(sMainModule.trim().split(/\s*,\s*/));
	}

}());
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
// Provides class module:sap/base/Event
sap.ui.predefine("sap/base/Event", () => {
	"use strict";

	const EVENT_PARAMETERS_SYMBOL = Symbol("parameters");

	/**
	 * @author SAP SE
	 * @version 1.125.0
	 *
	 * Creates an event with the given <code>sType</code>,
	 * linked to the provided <code>oTarget</code> and enriched with the <code>oParameters</code>.
	 *
	 * @param {string} sType The type of the event
	 * @param {object} oParameters Parameters for this event. The parameters will be accessible as properties of the Event instance.
	 *
	 * @alias module:sap/base/Event
	 * @namespace
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	class Event {
		/**
		 *The type of the event
		 * @type {string}
		 * @private
		 * @ui5-restricted sap.ui.core
		 */
		#type;
		constructor(sType, oParameters) {
			//copy & freeze parameters
			for (const param in oParameters) {
				this[param] = oParameters[param];
				Object.defineProperty(this, param, { configurable: false, writable: false });
			}
			this[EVENT_PARAMETERS_SYMBOL] = oParameters;
			this.#type = sType;
		}
		get type () {
			return this.#type;
		}
		/**
		 * Returns the event parameters as map
		 * @param {module:sap/base/Event} oEvent The event object to retrieve the parameters
		 * @returns {object} Map of event parameters
		 * @private
		 * @ui5-restricted sap/base/i18n sap.ui.core
		 */
		static getParameters(oEvent) {
			return Object.assign({}, oEvent[EVENT_PARAMETERS_SYMBOL]);
		}
	}

	return Event;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides mixin sap/base/Eventing
sap.ui.predefine("sap/base/Eventing", [
	"sap/base/assert",
	"sap/base/Event"
], function(
	assert,
	Event
) {
	"use strict";

	/**
	 * Eventing
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 *
	 * @since 1.120.0
	 * @private
	 * @ui5-restricted sap.ui.core sap/base/i18n
	 */
	class Eventing {
		#mEventRegistry = {};
		/**
		 * Attaches an event handler to the event with the given identifier.
		 *
		 * @param {string}
		 * 		sType The type of the event to listen for
		 * @param {function}
		 * 		fnFunction The handler function to call when the event occurs. The event
		 * 		object ({@link module:sap/base/Event}) is provided as first argument of the handler. Handlers must not change
		 * 		the content of the event.
		 * @param {object}
		 * 		[oData] An object that will be passed to the handler along with the event object when the event is fired
		 * @since 1.120.0
		 * @private
		 * @ui5-restricted sap.ui.core sap/base/i18n
		 */
		attachEvent(sType, fnFunction, oData) {
			assert(typeof (sType) === "string" && sType, "Eventing.attachEvent: sType must be a non-empty string");
			assert(typeof (fnFunction) === "function", "Eventing.attachEvent: fnFunction must be a function");

			let aEventListeners = this.#mEventRegistry[sType];
			if ( !Array.isArray(aEventListeners) ) {
				aEventListeners = this.#mEventRegistry[sType] = [];
			}

			aEventListeners.push({fnFunction: fnFunction, oData: oData});
		}

		/**
		 * Attaches an event handler, called one time only, to the event with the given identifier.
		 *
		 * When the event occurs, the handler function is called and the handler registration is automatically removed afterwards.
		 *
		 * @param {string}
		 *            sType The type of the event to listen for
		 * @param {function}
		 *            fnFunction The handler function to call when the event occurs. The event
		 *                       object ({@link module:sap/base/Event}) is provided as first argument of the handler. Handlers must not change
		 *                       the content of the event.
		 * @param {object}
		 *            [oData] An object that will be passed to the handler along with the event object when the event is fired
		 * @since 1.120.0
		 * @private
		 * @ui5-restricted sap.ui.core sap/base/i18n
		 */
		attachEventOnce(sType, fnFunction, oData) {
			const fnOnce = (oEvent) => {
				this.detachEvent(sType, fnOnce);
				fnFunction.call(null, oEvent);  // needs to do the same resolution as in fireEvent
			};
			fnOnce.oOriginal = {
				fnFunction: fnFunction
			};
			this.attachEvent(sType, fnOnce, oData);
		}

		/**
		 * Removes a previously attached event handler from the event with the given identifier.
		 *
		 * The passed parameters must match those used for registration with {@link #attachEvent} beforehand.
		 *
		 * @param {string}
		 *            sType The type of the event to detach from
		 * @param {function}
		 *            fnFunction The handler function to detach from the event
		 * @since 1.120.0
		 * @private
		 * @ui5-restricted sap.ui.core sap/base/i18n
		 */
		detachEvent(sType, fnFunction) {
			assert(typeof (sType) === "string" && sType, "Eventing.detachEvent: sType must be a non-empty string" );
			assert(typeof (fnFunction) === "function", "Eventing.detachEvent: fnFunction must be a function");

			const aEventListeners = this.#mEventRegistry[sType];
			if ( !Array.isArray(aEventListeners) ) {
				return;
			}

			let oFound;

			for (let i = 0, iL = aEventListeners.length; i < iL; i++) {
				if (aEventListeners[i].fnFunction === fnFunction) {
					oFound = aEventListeners[i];
					aEventListeners.splice(i,1);
					break;
				}
			}
			// If no listener was found, look for original listeners of attachEventOnce
			if (!oFound) {
				for (let i = 0, iL = aEventListeners.length; i < iL; i++) {
					const oOriginal = aEventListeners[i].fnFunction.oOriginal;
					if (oOriginal && oOriginal.fnFunction === fnFunction) {
						aEventListeners.splice(i,1);
						break;
					}
				}
			}
			// If we just deleted the last registered EventHandler, remove the whole entry from our map.
			if (aEventListeners.length == 0) {
				delete this.#mEventRegistry[sType];
			}
		}

		/**
		 * Fires an {@link module:sap/base/Event event} with the given settings and notifies all attached event handlers.
		 *
		 * @param {string}
		 *            sType The type of the event to fire
		 * @param {object}
		 *            [oParameters] Parameters which should be carried by the event
		 * @since 1.120.0
		 * @private
		 * @ui5-restricted sap.ui.core sap/base/i18n
		 */
		fireEvent(sType, oParameters) {
			let aEventListeners, oEvent, i, iL, oInfo;

			aEventListeners = this.#mEventRegistry[sType];

			if (Array.isArray(aEventListeners)) {

				// avoid issues with 'concurrent modification' (e.g. if an event listener unregisters itself).
				aEventListeners = aEventListeners.slice();
				oEvent = new Event(sType, oParameters);

				for (i = 0, iL = aEventListeners.length; i < iL; i++) {
					oInfo = aEventListeners[i];
					oInfo.fnFunction.call(null, oEvent);
				}
			}
		}
	}

	return Eventing;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/Log", [
	"sap/base/config",
	"sap/base/util/now"
], function(
	BaseConfig,
	now
) {
	"use strict";

	/**
	 * A Logging API for JavaScript.
	 *
	 * Provides methods to manage a client-side log and to create entries in it. Each of the logging methods
	 * {@link module:sap/base/Log.debug}, {@link module:sap/base/Log.info}, {@link module:sap/base/Log.warning},
	 * {@link module:sap/base/Log.error} and {@link module:sap/base/Log.fatal} creates and records a log entry,
	 * containing a timestamp, a log level, a message with details and a component info.
	 * The log level will be one of {@link module:sap/base/Log.Level} and equals the name of the concrete logging method.
	 *
	 * By using the {@link module:sap/base/Log.setLevel} method, consumers can determine the least important
	 * log level which should be recorded. Less important entries will be filtered out. (Note that higher numeric
	 * values represent less important levels). The initially set level depends on the mode that UI5 is running in.
	 * When the optimized sources are executed, the default level will be {@link module:sap/base/Log.Level.ERROR}.
	 * For normal (debug sources), the default level is {@link module:sap/base/Log.Level.DEBUG}.
	 *
	 * All logging methods allow to specify a <b>component</b>. These components are simple strings and
	 * don't have a special meaning to the UI5 framework. However they can be used to semantically group
	 * log entries that belong to the same software component (or feature). There are two APIs that help
	 * to manage logging for such a component. With {@link module:sap/base/Log.getLogger},
	 * one can retrieve a logger that automatically adds the given <code>sComponent</code> as component
	 * parameter to each log entry, if no other component is specified. Typically, JavaScript code will
	 * retrieve such a logger once during startup and reuse it for the rest of its lifecycle.
	 * Second, the {@link module:sap/base/Log.setLevel}(iLevel, sComponent) method allows to set the log level
	 * for a specific component only. This allows a more fine grained control about the created logging entries.
	 * {@link module:sap/base/Log.getLevel} allows to retrieve the currently effective log level for a given
	 * component.
	 *
	 * {@link module:sap/base/Log.getLogEntries} returns an array of the currently collected log entries.
	 *
	 * Furthermore, a listener can be registered to the log. It will be notified whenever a new entry
	 * is added to the log. The listener can be used for displaying log entries in a separate page area,
	 * or for sending it to some external target (server).
	 *
	 * @public
	 * @since 1.58
	 * @namespace
	 * @alias module:sap/base/Log
	 */
	var Log = {};

	/**
	 * Enumeration of the configurable log levels that a Logger should persist to the log.
	 *
	 * Only if the current LogLevel is higher than the level {@link module:sap/base/Log.Level} of the currently added log entry,
	 * then this very entry is permanently added to the log. Otherwise it is ignored.
	 * @enum {int}
	 * @public
	 */
	Log.Level = {
		/**
		 * Do not log anything
		 * @public
		 */
		NONE : -1,
		/**
		 * Fatal level. Use this for logging unrecoverable situations
		 * @public
		 */
		FATAL : 0,
		/**
		 * Error level. Use this for logging of erroneous but still recoverable situations
		 * @public
		 */
		ERROR : 1,
		/**
		 * Warning level. Use this for logging unwanted but foreseen situations
		 * @public
		 */
		WARNING : 2,
		/**
		 * Info level. Use this for logging information of purely informative nature
		 * @public
		 */
		INFO : 3,
		/**
		 * Debug level. Use this for logging information necessary for debugging
		 * @public
		 */
		DEBUG : 4,
		/**
		 * Trace level. Use this for tracing the program flow.
		 * @public
		 */
		TRACE : 5,
		/**
		 * Trace level to log everything.
		 * @public
		 */
		ALL : (5 + 1)
	};

	/**
	 * The array that holds the log entries that have been recorded so far
	 */
	var aLog = [],

	/**
	 * Maximum log level to be recorded (per component).
	 */
	mMaxLevel = { '' : Log.Level.ERROR },

	/**
	 * Maximum amount of stored log entries
	 */
	iLogEntriesLimit = 3000,

	/**
	 * Registered listener to be informed about new log entries.
	 */
	oListener = null,

	/**
	 * Additional support information delivered by callback should be logged
	 */
	bLogSupportInfo = false;

	function pad0(i,w) {
		return ("000" + String(i)).slice(-w);
	}

	function level(sComponent) {
		return (!sComponent || isNaN(mMaxLevel[sComponent])) ? mMaxLevel[''] : mMaxLevel[sComponent];
	}

	/**
	 * Discard 30 percent of log entries when the limit is reached
	 */
	function discardLogEntries() {
		var iLogLength =  aLog.length;
		if (iLogLength) {
			var iEntriesToKeep = Math.min(iLogLength, Math.floor(iLogEntriesLimit * 0.7));

			if (oListener) {
				// Notify listener that entries are being discarded
				oListener.onDiscardLogEntries(aLog.slice(0, iLogLength - iEntriesToKeep));
			}

			if (iEntriesToKeep) {
				aLog = aLog.slice(-iEntriesToKeep, iLogLength);
			} else {
				aLog = [];
			}
		}
	}

	/**
	 * Gets the log entry listener instance, if not present creates a new one
	 * @returns {Object} the singleton log entry listener
	 */
	function getLogEntryListenerInstance(){
		if (!oListener) {
			oListener = {
				listeners: [],
				onLogEntry: function(oLogEntry){
					for (var i = 0; i < oListener.listeners.length; i++) {
						if (oListener.listeners[i].onLogEntry) {
							oListener.listeners[i].onLogEntry(oLogEntry);
						}
					}
				},
				onDiscardLogEntries: function(aDiscardedLogEntries) {
					for (var i = 0; i < oListener.listeners.length; i++) {
						if (oListener.listeners[i].onDiscardLogEntries) {
							oListener.listeners[i].onDiscardLogEntries(aDiscardedLogEntries);
						}
					}
				},
				attach: function(oLog, oLstnr){
					if (oLstnr) {
						oListener.listeners.push(oLstnr);
						if (oLstnr.onAttachToLog) {
							oLstnr.onAttachToLog(oLog);
						}
					}
				},
				detach: function(oLog, oLstnr){
					for (var i = 0; i < oListener.listeners.length; i++) {
						if (oListener.listeners[i] === oLstnr) {
							if (oLstnr.onDetachFromLog) {
								oLstnr.onDetachFromLog(oLog);
							}
							oListener.listeners.splice(i,1);
							return;
						}
					}
				}
			};
		}
		return oListener;
	}

	/**
	 * Creates a new fatal-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage
	 *   Message text to display
	 * @param {string|Error} [vDetails='']
	 *   Optional details about the message, might be omitted. Can be an Error object which will be
	 *   logged together with its stacktrace.
	 * @param {string} [sComponent='']
	 *   Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo]
	 *   Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with
	 *   <code>logSupportInfo(true)</code>. To avoid negative effects regarding execution times and
	 *   memory consumption, the returned object should be a simple immutable JSON object with mostly
	 *   static and stable content.
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 */
	Log.fatal = function(sMessage, vDetails, sComponent, fnSupportInfo) {
		log(Log.Level.FATAL, sMessage, vDetails, sComponent, fnSupportInfo);
	};

	/**
	 * Creates a new error-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage
	 *   Message text to display
	 * @param {string|Error} [vDetails='']
	 *   Optional details about the message, might be omitted. Can be an Error object which will be
	 *   logged together with its stacktrace.
	 * @param {string} [sComponent='']
	 *   Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo]
	 *   Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with
	 *   <code>logSupportInfo(true)</code>. To avoid negative effects regarding execution times and
	 *   memory consumption, the returned object should be a simple immutable JSON object with mostly
	 *   static and stable content.
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 */
	Log.error = function(sMessage, vDetails, sComponent, fnSupportInfo) {
		log(Log.Level.ERROR, sMessage, vDetails, sComponent, fnSupportInfo);
	};

	/**
	 * Creates a new warning-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage
	 *   Message text to display
	 * @param {string|Error} [vDetails='']
	 *   Optional details about the message, might be omitted. Can be an Error object which will be
	 *   logged together with its stacktrace.
	 * @param {string} [sComponent='']
	 *   Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo]
	 *   Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with
	 *   <code>logSupportInfo(true)</code>. To avoid negative effects regarding execution times and
	 *   memory consumption, the returned object should be a simple immutable JSON object with mostly
	 *   static and stable content.
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 */
	Log.warning = function(sMessage, vDetails, sComponent, fnSupportInfo) {
		log(Log.Level.WARNING, sMessage, vDetails, sComponent, fnSupportInfo);
	};

	/**
	 * Creates a new info-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage
	 *   Message text to display
	 * @param {string|Error} [vDetails='']
	 *   Optional details about the message, might be omitted. Can be an Error object which will be
	 *   logged with the stack.
	 * @param {string} [sComponent='']
	 *   Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo]
	 *   Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with
	 *   <code>logSupportInfo(true)</code>. To avoid negative effects regarding execution times and
	 *   memory consumption, the returned object should be a simple immutable JSON object with mostly
	 *   static and stable content.
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 */
	Log.info = function(sMessage, vDetails, sComponent, fnSupportInfo) {
		log(Log.Level.INFO, sMessage, vDetails, sComponent, fnSupportInfo);
	};

	/**
	 * Creates a new debug-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage
	 *   Message text to display
	 * @param {string|Error} [vDetails='']
	 *   Optional details about the message, might be omitted. Can be an Error object which will be
	 *   logged with the stack.
	 * @param {string} [sComponent='']
	 *   Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo]
	 *   Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with
	 *   <code>logSupportInfo(true)</code>. To avoid negative effects regarding execution times and
	 *   memory consumption, the returned object should be a simple immutable JSON object with mostly
	 *   static and stable content.
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 */
	Log.debug = function(sMessage, vDetails, sComponent, fnSupportInfo) {
		log(Log.Level.DEBUG, sMessage, vDetails, sComponent, fnSupportInfo);
	};

	/**
	 * Creates a new trace-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage
	 *   Message text to display
	 * @param {string|Error} [vDetails='']
	 *   Optional details about the message, might be omitted. Can be an Error object which will be
	 *   logged with the stack.
	 * @param {string} [sComponent='']
	 *   Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo]
	 *   Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with
	 *   <code>logSupportInfo(true)</code>. To avoid negative effects regarding execution times and
	 *   memory consumption, the returned object should be a simple immutable JSON object with mostly
	 *   static and stable content.
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 */
	Log.trace = function(sMessage, vDetails, sComponent, fnSupportInfo) {
		log(Log.Level.TRACE, sMessage, vDetails, sComponent, fnSupportInfo);
	};

	/**
	 * Defines the maximum <code>sap/base/Log.Level</code> of log entries that will be recorded.
	 * Log entries with a higher (less important) log level will be omitted from the log.
	 * When a component name is given, the log level will be configured for that component
	 * only, otherwise the log level for the default component of this logger is set.
	 * For the global logger, the global default level is set.
	 *
	 * <b>Note</b>: Setting a global default log level has no impact on already defined
	 * component log levels. They always override the global default log level.
	 *
	 * @param {module:sap/base/Log.Level} iLogLevel The new log level
	 * @param {string} [sComponent] The log component to set the log level for
	 * @public
	 */
	Log.setLevel = function(iLogLevel, sComponent, _bDefault) {
		sComponent = sComponent || '';
		if (!_bDefault || mMaxLevel[sComponent] == null) {
			mMaxLevel[sComponent] = iLogLevel;
			var sLogLevel;
			Object.keys(Log.Level).forEach(function(sLevel) {
				if (Log.Level[sLevel] === iLogLevel) {
					sLogLevel = sLevel;
				}
			});
			log(Log.Level.INFO, "Changing log level " + (sComponent ? "for '" + sComponent + "' " : "") + "to " + sLogLevel, "", "sap.base.log");
		}
	};

	/**
	 * Returns the log level currently effective for the given component.
	 * If no component is given or when no level has been configured for a
	 * given component, the log level for the default component of this logger is returned.
	 *
	 * @param {string} [sComponent] Name of the component to retrieve the log level for
	 * @returns {module:sap/base/Log.Level} The log level for the given component or the default log level
	 * @public
	 */
	Log.getLevel = function(sComponent) {
		return level(sComponent);
	};

	/**
	 * Checks whether logging is enabled for the given log level,
	 * depending on the currently effective log level for the given component.
	 *
	 * If no component is given, the default component of this logger will be taken into account.
	 *
	 * @param {module:sap/base/Log.Level} [iLevel=Level.DEBUG] The log level in question
	 * @param {string} [sComponent] Name of the component to check the log level for
	 * @returns {boolean} Whether logging is enabled or not
	 * @public
	 */
	Log.isLoggable = function(iLevel, sComponent) {
		return (iLevel == null ? Log.Level.DEBUG : iLevel) <= level(sComponent);
	};

	/**
	 * Enables or disables whether additional support information is logged in a trace.
	 * If enabled, logging methods like error, warning, info and debug are calling the additional
	 * optional callback parameter fnSupportInfo and store the returned object in the log entry property supportInfo.
	 *
	 * @param {boolean} bEnabled true if the support information should be logged
	 * @private
	 * @ui5-restricted sap.ui.support
	 */
	Log.logSupportInfo = function(bEnabled) {
		bLogSupportInfo = bEnabled;
	};

	/**
	 * Creates a new log entry depending on its level and component.
	 *
	 * If the given level is higher than the max level for the given component
	 * (or higher than the global level, if no component is given),
	 * then no entry is created and <code>undefined</code> is returned.
	 *
	 * If an <code>Error</code> is passed via <code>vDetails</code> the stack
	 * of the <code>Error</code> will be logged as a separate parameter in
	 * the proper <code>console</code> function for the matching log level.
	 *
	 * @param {module:sap/base/Log.Level} iLevel
	 *   One of the log levels FATAL, ERROR, WARNING, INFO, DEBUG, TRACE
	 * @param {string} sMessage
	 *   The message to be logged
	 * @param {string|Error} [vDetails]
	 *   The optional details for the message; could be an Error which will be logged with the
	 *   stacktrace, to easily find the root cause of the Error
	 * @param {string} [sComponent]
	 *   The log component under which the message should be logged
	 * @param {function} [fnSupportInfo] Callback that returns an additional support object to be
	 *   logged in support mode. This function is only called if support info mode is turned on with
	 *   <code>logSupportInfo(true)</code>. To avoid negative effects regarding execution times and
	 *   memory consumption, the returned object should be a simple immutable JSON object with mostly
	 *   static and stable content.
	 * @returns {module:sap/base/Log.Entry}
	 *   The log entry as an object or <code>undefined</code> if no entry was created
	 * @private
	 */
	function log(iLevel, sMessage, vDetails, sComponent, fnSupportInfo) {
		if (!fnSupportInfo && !sComponent && typeof vDetails === "function") {
			fnSupportInfo = vDetails;
			vDetails = "";
		}
		if (!fnSupportInfo && typeof sComponent === "function") {
			fnSupportInfo = sComponent;
			sComponent = "";
		}

		if (iLevel <= level(sComponent) ) {
			var fNow =  now(),
				oNow = new Date(fNow),
				iMicroSeconds = Math.floor((fNow - Math.floor(fNow)) * 1000),
				oLogEntry = {
					time     : pad0(oNow.getHours(),2) + ":" + pad0(oNow.getMinutes(),2) + ":" + pad0(oNow.getSeconds(),2) + "." + pad0(oNow.getMilliseconds(),3) + pad0(iMicroSeconds,3),
					date     : pad0(oNow.getFullYear(),4) + "-" + pad0(oNow.getMonth() + 1,2) + "-" + pad0(oNow.getDate(),2),
					timestamp: fNow,
					level    : iLevel,
					message  : String(sMessage || ""),
					details  : String(vDetails || ""),
					component: String(sComponent || "")
				};
			if (bLogSupportInfo && typeof fnSupportInfo === "function") {
				oLogEntry.supportInfo = fnSupportInfo();
			}

			if (iLogEntriesLimit) {
				if (aLog.length >= iLogEntriesLimit) {
					// Cap the amount of stored log messages by 30 percent
					discardLogEntries();
				}

				aLog.push(oLogEntry);
			}

			if (oListener) {
				oListener.onLogEntry(oLogEntry);
			}

			/*
			 * Console Log, also tries to log to the console, if available.
			 *
			 * Unfortunately, the support for console is quite different between the UI5 browsers. The most important differences are:
			 * - in FF3.6 the console is not available, until FireBug is opened. It disappears again, when fire bug is closed.
			 *   But when the settings for a web site are stored (convenience), the console remains open
			 *   When the console is available, it supports all relevant methods
			 * - in FF9.0, the console is always available, but method assert is only available when firebug is open
			 * - in Webkit browsers, the console object is always available and has all required methods
			 *   - Exception: in the iOS Simulator, console.info() does not exist
			 */
			/*eslint-disable no-console */
			if (console) { // in Firefox, console might not exist or it might even disappear
				var isDetailsError = vDetails instanceof Error,
					logText = oLogEntry.date + " " + oLogEntry.time + " " + oLogEntry.message + " - " + oLogEntry.details + " " + oLogEntry.component;
				switch (iLevel) {
					case Log.Level.FATAL:
					case Log.Level.ERROR: isDetailsError ? console.error(logText, "\n", vDetails) : console.error(logText); break;
					case Log.Level.WARNING: isDetailsError ? console.warn(logText, "\n", vDetails) : console.warn(logText); break;
					case Log.Level.INFO:
						if (console.info) { // info not available in iOS simulator
							isDetailsError ? console.info(logText, "\n", vDetails) : console.info(logText);
						} else {
							isDetailsError ? console.log(logText, "\n", vDetails) : console.log(logText);
						}
						break;
					case Log.Level.DEBUG:
						isDetailsError ? console.debug(logText, "\n", vDetails) : console.debug(logText);
						break;
					case Log.Level.TRACE:
						isDetailsError ? console.trace(logText, "\n", vDetails) : console.trace(logText);
						break;
				}
				if (console.info && oLogEntry.supportInfo) {
					console.info(oLogEntry.supportInfo);
				}
			}
			/*eslint-enable no-console */
			return oLogEntry;
		}
	}

	/**
	 * Returns the logged entries recorded so far as an array.
	 *
	 * Log entries are plain JavaScript objects with the following properties
	 * <ul>
	 * <li>timestamp {number} point in time when the entry was created
	 * <li>level {module:sap/base/Log.Level} LogLevel level of the entry
	 * <li>message {string} message text of the entry
	 * </ul>
	 * The default amount of stored log entries is limited to 3000 entries.
	 * @returns {Array<module:sap/base/Log.Entry>} an array containing the recorded log entries
	 * @public
	 * @static
	 */
	Log.getLogEntries = function() {
		return aLog.slice();
	};

	/**
	 * Returns the maximum amount of stored log entries.
	 *
	 * @returns {int|Infinity} The maximum amount of stored log entries or Infinity if no limit is set
	 * @private
	 * @ui5-restricted
	 */
	Log.getLogEntriesLimit = function() {
		return iLogEntriesLimit;
	};

	/**
	 * Sets the limit of stored log entries
	 *
	 * If the new limit is lower than the current limit, the overlap of old log entries will be discarded.
	 * If the limit is reached the amount of stored messages will be reduced by 30 percent.
	 *
	 * @param {int|Infinity} iLimit The maximum amount of stored log entries or Infinity for unlimited entries
	 * @private
	 * @ui5-restricted
	 */
	Log.setLogEntriesLimit = function(iLimit) {
		if (iLimit < 0) {
			throw new Error("The log entries limit needs to be greater than or equal to 0!");
		}
		iLogEntriesLimit = iLimit;
		if (aLog.length >= iLogEntriesLimit) {
			discardLogEntries();
		}
	};

	/**
	 * @typedef {object} module:sap/base/Log.Entry
	 * @property {float} timestamp The number of milliseconds since the epoch
	 * @property {string} time Time string in format HH:mm:ss:mmmnnn
	 * @property {string} date Date string in format yyyy-MM-dd
	 * @property {module:sap/base/Log.Level} level The level of the log entry, see {@link module:sap/base/Log.Level}
	 * @property {string} message The message of the log entry
	 * @property {string} details The detailed information of the log entry
	 * @property {string} component The component that creates the log entry
	 * @property {function():any} [supportInfo] Callback that returns an additional support object to be
	 *   logged in support mode.
	 * @public
	 */

	/**
	 * Interface to be implemented by a log listener.
	 *
	 * Typically, a listener will at least implement the {@link #.onLogEntry} method,
	 * but in general, all methods are optional.
	 *
	 * @interface
	 * @name module:sap/base/Log.Listener
	 * @public
	 */

	/**
	 * The function that is called when a new log entry is created
	 *
	 * @param {module:sap/base/Log.Entry} oLogEntry The newly created log entry
	 * @name module:sap/base/Log.Listener.onLogEntry?
	 * @function
	 * @public
	 */

	/**
	 * The function that is called once the Listener is attached
	 *
	 * @param {module:sap/base/Log} oLog The Log instance where the listener is attached
	 * @name module:sap/base/Log.Listener.onAttachToLog?
	 * @function
	 * @public
	 */

	/**
	 * The function that is called once the Listener is detached
	 *
	 * @param {module:sap/base/Log} oLog The Log instance where the listener is detached
	 * @name module:sap/base/Log.Listener.onDetachFromLog?
	 * @function
	 * @public
	 */

	/**
	 * The function that is called once log entries are discarded due to the exceed of total log entry amount
	 *
	 * @param {Array<module:sap/base/Log.Entry>} aDiscardedEntries The discarded log entries
	 * @name module:sap/base/Log.Listener.onDiscardLogEntries?
	 * @function
	 * @public
	 */

	/**
	 * Allows to add a new listener that will be notified for new log entries.
	 *
	 * The given object must provide method <code>onLogEntry</code> and can also be informed
	 * about <code>onDetachFromLog</code>, <code>onAttachToLog</code> and <code>onDiscardLogEntries</code>.
	 * @param {module:sap/base/Log.Listener} oListener The new listener object that should be informed
	 * @public
	 * @static
	 */
	Log.addLogListener = function(oListener) {
		getLogEntryListenerInstance().attach(this, oListener);
	};

	/**
	 * Allows to remove a registered LogListener.
	 * @param {module:sap/base/Log.Listener} oListener The listener object that should be removed
	 * @public
	 * @static
	 */
	Log.removeLogListener = function(oListener) {
		getLogEntryListenerInstance().detach(this, oListener);
	};

	/**
	 * The logger comes with a subset of the API of the <code>sap/base/Log</code> module:
	 * <ul>
	 * <li><code>#fatal</code> - see:  {@link module:sap/base/Log.fatal}
	 * <li><code>#error</code> - see:  {@link module:sap/base/Log.error}
	 * <li><code>#warning</code> - see:  {@link module:sap/base/Log.warning}
	 * <li><code>#info</code> - see:  {@link module:sap/base/Log.info}
	 * <li><code>#debug</code> - see:  {@link module:sap/base/Log.debug}
	 * <li><code>#trace</code> - see:  {@link module:sap/base/Log.trace}
	 * <li><code>#setLevel</code> - see:  {@link module:sap/base/Log.setLevel}
	 * <li><code>#getLevel</code> - see:  {@link module:sap/base/Log.getLevel}
	 * <li><code>#isLoggable</code> - see:  {@link module:sap/base/Log.isLoggable}
	 * </ul>
	 * @interface
	 * @borrows module:sap/base/Log.fatal as #fatal
	 * @borrows module:sap/base/Log.error as #error
	 * @borrows module:sap/base/Log.warning as #warning
	 * @borrows module:sap/base/Log.info as #info
	 * @borrows module:sap/base/Log.debug as #debug
	 * @borrows module:sap/base/Log.trace as #trace
	 * @borrows module:sap/base/Log.setLevel as #setLevel
	 * @borrows module:sap/base/Log.getLevel as #getLevel
	 * @borrows module:sap/base/Log.isLoggable as #isLoggable
	 * @name module:sap/base/Log.Logger
	 * @public
	 */
	function Logger(sComponent) {
		this.fatal = function(msg,detail,comp,support) { Log.fatal(msg, detail, comp || sComponent, support); return this; };
		this.error = function(msg,detail,comp,support) { Log.error(msg, detail, comp || sComponent, support); return this; };
		this.warning = function(msg,detail,comp,support) { Log.warning(msg, detail, comp || sComponent, support); return this; };
		this.info = function(msg,detail,comp,support) { Log.info(msg, detail, comp || sComponent, support); return this; };
		this.debug = function(msg,detail,comp,support) { Log.debug(msg, detail, comp || sComponent, support); return this; };
		this.trace = function(msg,detail,comp,support) { Log.trace(msg, detail, comp || sComponent, support); return this; };
		this.setLevel = function(level, comp) { Log.setLevel(level, comp || sComponent); return this; };
		this.getLevel = function(comp) { return Log.getLevel(comp || sComponent); };
		this.isLoggable = function(level,comp) { return Log.isLoggable(level, comp || sComponent); };
	}

	/**
	 * Returns a dedicated logger for a component.
	 *
	 * The logger comes with the same API as the <code>sap/base/Log</code> module:
	 * <ul>
	 * <li><code>#fatal</code> - see:  {@link module:sap/base/Log.fatal}
	 * <li><code>#error</code> - see:  {@link module:sap/base/Log.error}
	 * <li><code>#warning</code> - see:  {@link module:sap/base/Log.warning}
	 * <li><code>#info</code> - see:  {@link module:sap/base/Log.info}
	 * <li><code>#debug</code> - see:  {@link module:sap/base/Log.debug}
	 * <li><code>#trace</code> - see:  {@link module:sap/base/Log.trace}
	 * <li><code>#setLevel</code> - see:  {@link module:sap/base/Log.setLevel}
	 * <li><code>#getLevel</code> - see:  {@link module:sap/base/Log.getLevel}
	 * <li><code>#isLoggable</code> - see:  {@link module:sap/base/Log.isLoggable}
	 * </ul>
	 *
	 * @param {string} sComponent Name of the component which should be logged
	 * @param {module:sap/base/Log.Level} [iDefaultLogLevel] The default log level
	 * @return {module:sap/base/Log.Logger} A logger with a specified component
	 * @public
	 * @static
	 */
	Log.getLogger = function(sComponent, iDefaultLogLevel) {
		if ( !isNaN(iDefaultLogLevel) && mMaxLevel[sComponent] == null ) {
			mMaxLevel[sComponent] = iDefaultLogLevel;
		}
		return new Logger(sComponent);
	};

	// set LogLevel
	const sLogLevel = BaseConfig.get({
		name: "sapUiLogLevel",
		type: BaseConfig.Type.String,
		defaultValue: undefined,
		external: true
	});

	if (sLogLevel) {
		Log.setLevel(Log.Level[sLogLevel.toUpperCase()] || parseInt(sLogLevel));
	} else if (!globalThis["sap-ui-optimized"]) {
		Log.setLevel(Log.Level.DEBUG);
	}

	return Log;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/assert", [], function() {
	"use strict";

	// TODO-evo:assert on node throws an error if the assertion is violated

	/**
	 * A simple assertion mechanism that logs a message when a given condition is not met.
	 *
	 * <b>Note:</b> Calls to this method might be removed when the JavaScript code
	 *              is optimized during build. Therefore, callers should not rely on any side effects
	 *              of this method.
	 *
	 * @function
	 * @since 1.58
	 * @alias module:sap/base/assert
	 * @param {boolean} bResult Result of the checked assertion
	 * @param {string|function():any} vMessage Message that will be logged when the result is <code>false</code>.
	 * In case this is a function, the return value of the function will be displayed. This can be used to execute
	 * complex code only if the assertion fails.
	 * @public
	 * @SecSink {1|SECRET} Could expose secret data in logs
	 *
	 */
	var fnAssert = function(bResult, vMessage) {
		if (!bResult) {
			var sMessage = typeof vMessage === "function" ? vMessage() : vMessage;
			/*eslint-disable no-console */
			console.assert(bResult, sMessage);
			/*eslint-enable no-console */
		}
	};
	return fnAssert;
});
/*!
* OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
*/
sap.ui.predefine("sap/base/config", [
	"sap/base/config/MemoryConfigurationProvider",
	"ui5loader-autoconfig"
], (
	MemoryConfigurationProvider
	/*autoconfig*/
) => {
	"use strict";

	/**
	 * The base Configuration.
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 * @private
	 * @ui5-restricted sap.ui.core, sap.fl, sap.ui.intergration, sap.ui.export
	 * @alias module:sap/base/config
	 * @borrows module:sap/base/config/_Configuration.get as get
	 * @borrows module:sap/base/config/_Configuration.Type as Type
	 * @namespace
	 */

	const _Configuration = sap.ui.require("sap/base/config/_Configuration");

	/**
	 * Returns a writable base configuration instance
	 * @returns {module:sap/base/config} The writable base configuration
	 * @private
	 * @ui5-restricted sap.ui.core, sap.fl
	 */
	_Configuration.getWritableInstance = () => {
		const oProvider = new MemoryConfigurationProvider();

		return {
			set(sName, vValue) {
				const rValidKey = /^[a-z][A-Za-z0-9]*$/;
				if (rValidKey.test(sName)) {
					oProvider.set(sName, vValue);
					_Configuration._.invalidate();
				} else {
					throw new TypeError(
						"Invalid configuration key '" + sName + "'!"
					);
				}
			},
			get(mOptions) {
				mOptions.provider = oProvider;
				return _Configuration.get(mOptions);
			},
			Type: _Configuration.Type
		};
	};

	return _Configuration;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/config/MemoryConfigurationProvider", [
    "sap/base/util/uid"
], function(
    uid
) {
    "use strict";

    var MemoryConfigurationProvider = function() {
        this.oConfig = Object.create(null);
        this.id = uid();
    };

    MemoryConfigurationProvider.prototype.getId = function() {
        return this.id;
    };

    MemoryConfigurationProvider.prototype.get = function(sName) {
        return this.oConfig[sName];
    };

    MemoryConfigurationProvider.prototype.set = function(sName, vValue) {
        this.oConfig[sName] = vValue;
    };

    return MemoryConfigurationProvider;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides the LanguageTag object module:sap/base/i18n/LanguageTag
sap.ui.predefine("sap/base/i18n/LanguageTag", [
], function(
) {
	"use strict";

	/**
	 * A regular expression that describes language tags according to BCP-47.
	 * @see BCP47 "Tags for Identifying Languages" (http://www.ietf.org/rfc/bcp/bcp47.txt)
	 *
	 * The matching groups are
	 *  0=all
	 *  1=language (shortest ISO639 code + ext. language sub tags | 4digits (reserved) | registered language sub tags)
	 *  2=script (4 letters)
	 *  3=region (2 letter language or 3 digits)
	 *  4=variants (separated by '-', Note: capturing group contains leading '-' to shorten the regex!)
	 *  5=extensions (including leading singleton, multiple extensions separated by '-'.Note: capturing group contains leading '-' to shorten the regex!)
	 *  6=private use section (including leading 'x', multiple sections separated by '-')
	 *
	 *              [-------------------- language ----------------------][--- script ---][------- region --------][------------- variants --------------][----------- extensions ------------][------ private use -------]
	 */
	var rLanguageTag = /^((?:[A-Z]{2,3}(?:-[A-Z]{3}){0,3})|[A-Z]{4}|[A-Z]{5,8})(?:-([A-Z]{4}))?(?:-([A-Z]{2}|[0-9]{3}))?((?:-[0-9A-Z]{5,8}|-[0-9][0-9A-Z]{3})*)((?:-[0-9A-WYZ](?:-[0-9A-Z]{2,8})+)*)(?:-(X(?:-[0-9A-Z]{1,8})+))?$/i;

	/**
	 * Creates an LanguageTag instance.
	 * LanguageTag represents a BCP-47 language tag, consisting of a language, script, region, variants, extensions and private use section.
	 *
	 * @class
	 *
	 * @param {string} sLanguageTag the language tag identifier, in format en-US or en_US.
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 * @public
	 * @alias module:sap/base/i18n/LanguageTag
	 */
	class LanguageTag {
		/**
		 * Get the language.
		 *
		 * Note that the case might differ from the original script tag
		 * (Lower case is enforced as recommended by BCP47/ISO639).
		 *
		 * @type {string}
		 * @public
		 */
		language;

		/**
		 * Get the script or <code>null</code> if none was specified.
		 *
		 * Note that the case might differ from the original language tag
		 * (Upper case first letter and lower case reminder enforced as
		 * recommended by BCP47/ISO15924)
		 *
		 * @type {string|null}
		 * @public
		 */
		script;

		/**
		 * Get the region or <code>null</code> if none was specified.
		 *
		 * Note that the case might differ from the original script tag
		 * (Upper case is enforced as recommended by BCP47/ISO3166-1).
		 *
		 * @type {string}
		 * @public
		 */
		region;

		/**
		 * Get the variants as a single string or <code>null</code>.
		 *
		 * Multiple variants are separated by a dash '-'.
		 *
		 * @type {string|null}
		 * @public
		 */
		variant;

		/**
		 * Get the variants as an array of individual variants.
		 *
		 * The separating dashes are not part of the result.
		 * If there is no variant section in the language tag, an empty array is returned.
		 *
		 * @type {string[]}
		 * @public
		 */
		variantSubtags;

		/**
		 * Get the extension as a single string or <code>null</code>.
		 *
		 * The extension always consists of a singleton character (not 'x'),
		 * a dash '-' and one or more extension token, each separated
		 * again with a dash.
		 *
		 * @type {string|null}
		 * @public
		 */
		extension;

		/**
		 * Get the extensions as an array of tokens.
		 *
		 * The leading singleton and the separating dashes are not part of the result.
		 * If there is no extensions section in the language tag, an empty array is returned.
		 *
		 * @type {string[]}
		 * @public
		 */
		extensionSubtags;

		/**
		 * Get the private use section or <code>null</code>.
		 *
		 * @type {string}
		 */
		privateUse;

		/**
		 * Get the private use section as an array of tokens.
		 *
		 * The leading singleton and the separating dashes are not part of the result.
		 * If there is no private use section in the language tag, an empty array is returned.
		 *
		 * @type {string[]}
		 */
		privateUseSubtags;

		constructor(sLanguageTag) {
			var aResult = rLanguageTag.exec(sLanguageTag.replace(/_/g, "-"));
			// If the given language tag string cannot be parsed by the regular expression above,
			// we should at least tell the developer why the Core fails to load.
			if (aResult === null ) {
				throw new TypeError("The given language tag '" + sLanguageTag + "' does not adhere to BCP-47.");
			}
			this.language = aResult[1] || null;
			this.script = aResult[2] || null;
			this.region = aResult[3] || null;
			this.variant = (aResult[4] && aResult[4].slice(1)) || null; // remove leading dash from capturing group
			this.variantSubtags = this.variant ? this.variant.split('-') : [];
			this.extension = (aResult[5] && aResult[5].slice(1)) || null; // remove leading dash from capturing group
			this.extensionSubtags = this.variant ? this.variant.split('-') : [];
			this.privateUse = aResult[6] || null;
			this.privateUseSubtags = this.privateUse ? this.privateUse.slice(2).split('-') : [];
			// convert subtags according to the BCP47 recommendations
			// - language: all lower case
			// - script: lower case with the first letter capitalized
			// - region: all upper case
			if ( this.language ) {
				this.language = this.language.toLowerCase();
			}
			if ( this.script ) {
				this.script = this.script.toLowerCase().replace(/^[a-z]/, function($) {
					return $.toUpperCase();
				});
			}
			if ( this.region ) {
				this.region = this.region.toUpperCase();
			}
			Object.freeze(this);
		}
		toString() {
			return this.#join(
				this.language,
				this.script,
				this.region,
				this.variant,
				this.extension,
				this.privateUse);
		}
		#join() {
			return Array.prototype.filter.call(arguments, Boolean).join("-");
		}
	}

	return LanguageTag;
});
/*!
* OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
*/
sap.ui.predefine("sap/base/i18n/Localization", [
	"sap/base/config",
	"sap/base/Eventing",
	"sap/base/Log",
	"sap/base/i18n/LanguageTag",
	"sap/base/i18n/date/CalendarType",
	"sap/base/i18n/date/TimezoneUtils"
], function(
	BaseConfig,
	Eventing,
	Log,
	LanguageTag,
	CalendarType,
	TimezoneUtils
) {
	"use strict";

	const oWritableConfig = BaseConfig.getWritableInstance();
	let sLanguageSetByApi;
	const oEventing = new Eventing();
	let mChanges;
	let bLanguageWarningLogged = false;

	/**
	 * A map of preferred Calendar types according to the language.
	 * @private
	 */
	const _mPreferredCalendar = {
		"ar-SA": CalendarType.Islamic,
		"fa": CalendarType.Persian,
		"th": CalendarType.Buddhist,
		"default": CalendarType.Gregorian
	};

	// Note: keys must be uppercase
	const M_ABAP_LANGUAGE_TO_LOCALE = {
		"ZH" : "zh-Hans",
		"ZF" : "zh-Hant",
		"SH" : "sr-Latn",
		"CT" : "cnr",
		"6N" : "en-GB",
		"1P" : "pt-PT",
		"1X" : "es-MX",
		"3F" : "fr-CA",
		"1Q" : "en-US-x-saptrc",
		"2Q" : "en-US-x-sappsd",
		"3Q" : "en-US-x-saprigi"
	};

	const M_ISO639_OLD_TO_NEW = {
		"iw" : "he",
		"ji" : "yi"
	};

	const M_LOCALE_TO_ABAP_LANGUAGE = ((obj) => {
		return Object.keys(obj).reduce((inv, key) => {
			inv[obj[key]] = key;
			return inv;
		}, {});
	})(M_ABAP_LANGUAGE_TO_LOCALE);

	/**
	 * Maps wellknown private use extensions to pseudo language tags.
	 * @param {string} sPrivateUse A Locale
	 * @returns {string|undefined} the pseudo language tag or undefined
	 * @private
	 * @since 1.120.0
	 */
	function getPseudoLanguageTag(sPrivateUse) {
		let sPseudoLanguageTag;
		if ( sPrivateUse ) {
			const m = /-(saptrc|sappsd|saprigi)(?:-|$)/i.exec(sPrivateUse);
			sPseudoLanguageTag = m && "en-US-x-" + m[1].toLowerCase();
		}
		return sPseudoLanguageTag;
	}

	/**
	 * Helper to analyze and parse designtime (aka buildtime) variables
	 *
	 * At buildtime, the build can detect a pattern like $some-variable-name:some-value$
	 * and replace 'some-value' with a value determined at buildtime (here: the actual list of locales).
	 *
	 * At runtime, config method removes the surrounding pattern ('$some-variable-name:' and '$') and leaves only the 'some-value'.
	 * Additionally, config value is parsed as a comma-separated list (because config is the only use case here).
	 *
	 * The mimic of the comments is borrowed from the CVS (Concurrent Versions System),
	 * see http://web.mit.edu/gnu/doc/html/cvs_17.html.
	 *
	 * If no valid <code>sValue</code> is given, <code>null</code> is returned
	 *
	 * @param {string} sValue The raw designtime property e.g. $cldr-rtl-locales:ar,fa,he$
	 * @returns {string[]|null} The designtime property e.g. ['ar', 'fa', 'he']
	 * @private
	 * @since 1.120.0
	 */
	function getDesigntimePropertyAsArray(sValue) {
		const m = /\$([-a-z0-9A-Z._]+)(?::([^$]*))?\$/.exec(sValue);
		return (m && m[2]) ? m[2].split(/,/) : null;
	}

	/**
	 * A list of locales for which the CLDR specifies "right-to-left"
	 * as the character orientation.
	 *
	 * The string literal below is substituted during the build.
	 * The value is determined from the CLDR JSON files which are
	 * bundled with the UI5 runtime.
	 */
	const A_RTL_LOCALES = getDesigntimePropertyAsArray("$cldr-rtl-locales:ar,fa,he$") || [];

	/**
	 * List of locales for which translated texts have been bundled with the UI5 runtime.
	 * @private
	 */
	const _coreI18nLocales = getDesigntimePropertyAsArray("$core-i18n-locales:,ar,bg,ca,cnr,cs,cy,da,de,el,en,en_GB,es,es_MX,et,fi,fr,fr_CA,hi,hr,hu,id,it,iw,ja,kk,ko,lt,lv,mk,ms,nl,no,pl,pt,pt_PT,ro,ru,sh,sk,sl,sr,sv,th,tr,uk,vi,zh_CN,zh_TW$");

	/**
	 * Retrieves a Locale for the given SAP logon language or BCP47 tag.
	 *
	 * @param {string} sSAPLogonLanguage
	 *   A SAP logon language, e.g. "ZF" or a BCP47 language tag
	 * @returns {object} An object containing the mapped LogonLanguage and a LanguageTag if created
	 * @private
	 * @since 1.120.0
	 */
	function fromSAPLogonLanguage(sSAPLogonLanguage) {
		let oLanguageTag;
		if (sSAPLogonLanguage && typeof sSAPLogonLanguage === 'string') {
			sSAPLogonLanguage = M_ABAP_LANGUAGE_TO_LOCALE[sSAPLogonLanguage.toUpperCase()] || sSAPLogonLanguage;
			try {
				oLanguageTag = new LanguageTag(sSAPLogonLanguage);
			} catch (e) {
				// ignore
			}
		}
		return [oLanguageTag, sSAPLogonLanguage];
	}

	/**
	 * Helper that creates a LanguageTag object from the given language
	 * or, throws an error for non BCP-47 compliant languages.
	 *
	 * @param {string} sLanguage A BCP-47 compliant language
	 * @returns {module:sap/base/i18n/LanguageTag} The resulting LanguageTag
	 * @throws {TypeError} Throws a TypeError for unknown languages
	 * @private
	 * @since 1.120.0
	 */
	function createLanguageTag(sLanguage) {
		let oLanguageTag;
		if (sLanguage) {
			oLanguageTag = new LanguageTag(sLanguage);
		}
		return oLanguageTag;
	}

	// Helper Functions
	function detectLanguage() {
		return globalThis.navigator ? (globalThis.navigator.languages && globalThis.navigator.languages[0]) || globalThis.navigator.language || "en" : new Intl.Collator().resolvedOptions().locale || "en";
	}

	function check(bCondition, sMessage) {
		if ( !bCondition ) {
			throw new TypeError(sMessage);
		}
	}

	function join() {
		return Array.prototype.filter.call(arguments, Boolean).join("-");
	}

	/**
	 * Checks if the provided timezone is valid and logs an error if not.
	 *
	 * @param {string} sTimezone The IANA timezone ID
	 * @returns {boolean} Returns true if the timezone is valid
	 * @private
	 * @since 1.120.0
	 */
	function checkTimezone(sTimezone) {
		const bIsValidTimezone = TimezoneUtils.isValidTimezone(sTimezone);
		if (!bIsValidTimezone) {
			Log.error("The provided timezone '" + sTimezone + "' is not a valid IANA timezone ID." +
				" Falling back to browser's local timezone '" + TimezoneUtils.getLocalTimezone() + "'.");
		}
		return bIsValidTimezone;
	}

	/**
	 * Configuration for localization specific parameters
	 * @public
	 * @since 1.118
	 * @alias module:sap/base/i18n/Localization
	 * @namespace
	 */
	const Localization = {
		/**
		 * The <code>change</code> event is fired, when the configuration options are changed.
		 * For the event parameters please refer to {@link module:sap/base/i18n/Localization$ChangeEvent}.
		 *
		 * @name module:sap/base/i18n/Localization.change
		 * @event
		 * @param {module:sap/base/i18n/Localization$ChangeEvent} oEvent
		 * @public
		 * @since 1.120.0
		 */

		/**
		 * The localization change event. Contains only the parameters which were changed.
		 *
		 * The list below shows the possible combinations of parameters available as part of the change event.
		 *
		 * <ul>
		 * <li>{@link module:sap/base/i18n/Localization.setLanguage Localization.setLanguage}:
		 * <ul>
		 * <li><code>language</code></li>
		 * <li><code>rtl?</code> (only if language change also changed RTL)</li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Localization.setRTL Localization.setRTL}:
		 * <ul>
		 * <li><code>rtl</code></li>
		 * </ul>
		 * </li>
		 * <li>{@link module:sap/base/i18n/Localization.setTimezone Localization.setTimezone}:
		 * <ul>
		 * <li><code>timezone</code></li>
		 * </ul>
		 * </li>
		 * </ul>
		 *
		 * @typedef {object} module:sap/base/i18n/Localization$ChangeEvent
		 * @property {string} [language] The newly set language.
		 * @property {boolean} [rtl] Whether the page uses the RTL text direction.
		 * @property {string} [timezone] The newly set timezone.
		 * @public
		 * @since 1.120.0
		 */
		/**
		 * Attaches the <code>fnFunction</code> event handler to the {@link #event:change change} event
		 * of <code>module:sap/base/i18n/Localization</code>.
		 *
		 * @param {function(module:sap/base/i18n/Localization$ChangeEvent)} fnFunction
		 *   The function to be called when the event occurs
		 * @public
		 * @since 1.120.0
		 * @static
		 */
		attachChange: function(fnFunction) {
			oEventing.attachEvent("change", fnFunction);
		},

		/**
		 * Detaches event handler <code>fnFunction</code> from the {@link #event:change change} event of
		 * this <code>module:sap/base/i18n/Localization</code>.
		 *
		 * @param {function(module:sap/base/i18n/Localization$ChangeEvent)} fnFunction Function to be called when the event occurs
		 * @public
		 * @since 1.120.0
		 */
		detachChange: function(fnFunction) {
			oEventing.detachEvent("change", fnFunction);
		},

		/**
		 * Returns the list of active terminologies defined via the Configuration.
		 *
		 * @returns {string[]|undefined} if no active terminologies are set, the default value <code>undefined</code> is returned.
		 * @public
		 * @since 1.119.0
		 */
		getActiveTerminologies : function() {
			return oWritableConfig.get({name: "sapUiActiveTerminologies", type: BaseConfig.Type.StringArray, defaultValue: undefined, external: true});
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
		 * Call {@link module:sap/base/i18n/Localization.getLanguageTag getLanguageTag} to get a
		 * {@link module:sap/base/i18n/LanguageTag LanguageTag} object matching the language.
		 * For a normalized BCP47 tag, call {@link module:sap/base/i18n/LanguageTag.toString toString()}
		 * on the returned <code>LanguageTag</code>
		 *
		 * @returns {string} Language string as configured
		 * @public
		 * @since 1.120.0
		 */
		getLanguage : function () {
			let oLanguageTag,
				sDerivedLanguage;

			if (sLanguageSetByApi) {
				return sLanguageSetByApi;
			}
			const sLanguage = oWritableConfig.get({
				name: "sapUiLanguage",
				type: BaseConfig.Type.String,
				external: true
			});
			const sSapLocale = oWritableConfig.get({
				name: "sapLocale",
				type: BaseConfig.Type.String,
				external: true
			});
			const sSapLanguage = oWritableConfig.get({
				name: "sapLanguage",
				type: BaseConfig.Type.String,
				external: true
			});

			if (sSapLocale) {
				oLanguageTag = createLanguageTag(sSapLocale);
				sDerivedLanguage = sSapLocale;
			} else if (sSapLanguage) {
				if (!sLanguage && !bLanguageWarningLogged) {
					// only complain about an invalid sap-language if neither sap-locale nor sap-ui-language are given
					Log.warning("sap-language '" + sSapLanguage + "' is not a valid BCP47 language tag and will only be used as SAP logon language");
					// Avoid multiple logging of this warning
					bLanguageWarningLogged = true;
				}
				//fromSAPLogonLanguage catches errors oLanguageTag could be undefined
				[oLanguageTag, sDerivedLanguage] = fromSAPLogonLanguage(sSapLanguage);
			}
			if (!oLanguageTag) {
				if (sLanguage) {
					oLanguageTag = createLanguageTag(sLanguage);
					sDerivedLanguage = sLanguage;
				} else {
					sDerivedLanguage = detectLanguage();
					oLanguageTag = createLanguageTag(sLanguage);
				}
			}
			return sDerivedLanguage;
		},

		/**
		 * Get the modern language
		 *
		 * @param {string} sLanguage The language string
		 * @returns {string} The modern language
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.120.0
		 */
		getModernLanguage : function(sLanguage) {
			return M_ISO639_OLD_TO_NEW[sLanguage] || sLanguage;
		},

		/**
		 * Sets a new language to be used from now on for language/region dependent
		 * functionality (e.g. formatting, data types, translated texts, ...).
		 *
		 * When the language can't be interpreted as a BCP47 language (using the relaxed syntax
		 * described in {@link #getLanguage}, an error will be thrown.
		 *
		 * When the language has changed, the Localization will fire its
		 * {@link module:sap/base/i18n/Localization.change change} event.
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
		 * to the given language. A given value will be returned by the
		 * {@link module:sap/base/i18n/Localization.getSAPLogonLanguage getSAPLogonLanguage} method.
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
		 * @throws {TypeError} When <code>sLanguage</code> can't be interpreted as a BCP47 language or when
		 *   <code>sSAPLanguage</code> is given and can't be interpreted as SAP language code.
		 *
		 * @see http://scn.sap.com/docs/DOC-14377
		 * @public
		 * @since 1.120.0
		 */
		setLanguage : function (sLanguage, sSAPLogonLanguage) {
			const oLanguageTag = createLanguageTag(sLanguage),
				bOldRTL = Localization.getRTL();
			check(oLanguageTag, "Localization.setLanguage: sLanguage must be a valid BCP47 language tag");
			check(sSAPLogonLanguage == null || (typeof sSAPLogonLanguage === 'string' && /^[A-Z0-9]{2,2}$/i.test(sSAPLogonLanguage)),
				"Localization.setLanguage: sSAPLogonLanguage must be null or be a string of length 2, consisting of digits and latin characters only");

			sSAPLogonLanguage = sSAPLogonLanguage || "";
			if ( oLanguageTag.toString() != Localization.getLanguageTag().toString() ||
				sSAPLogonLanguage !== oWritableConfig.get({
					name: "sapLanguage",
					type: BaseConfig.Type.String,
					external: true
				})) {
				oWritableConfig.set("sapLanguage", sSAPLogonLanguage);
				sLanguageSetByApi = sLanguage;
				mChanges = {};
				mChanges.language = Localization.getLanguageTag().toString();
				const bRtl = Localization.getRTL();
				if ( bOldRTL != bRtl ) {
					mChanges.rtl = bRtl;
				}
				fireChange();
			}
		},

		/**
		 * Retrieves the configured IANA timezone ID.
		 *
		 * @returns {string} The configured IANA timezone ID, e.g. "America/New_York"
		 * @public
		 * @since 1.120.0
		 */
		getTimezone : function () {
			let sTimezone = oWritableConfig.get({
				name: "sapTimezone",
				type: BaseConfig.Type.String,
				external: true,
				defaultValue: oWritableConfig.get({
					name: "sapUiTimezone",
					type: BaseConfig.Type.String,
					external: true
				})
			});
			if (!sTimezone || !checkTimezone(sTimezone)) {
				sTimezone = TimezoneUtils.getLocalTimezone();
			}
			return sTimezone;
		},

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
		 * When the timezone has changed, the Localization will fire its {@link #event:change change} event.
		 *
		 * @param {string|null} [sTimezone] IANA timezone ID, e.g. "America/New_York".
		 * Use <code>null</code> to reset the timezone to the browser's local timezone.
		 * An invalid IANA timezone ID will fall back to the browser's timezone.
		 * @public
		 * @since 1.120.0
		 */
		setTimezone : function (sTimezone) {
			check(sTimezone == null || typeof sTimezone === 'string',
				"Localization.setTimezone: sTimezone must be null or be a string");

			const sCurrentTimezone = Localization.getTimezone();
			sTimezone = sTimezone === null || !checkTimezone(sTimezone) ? undefined : sTimezone;
			oWritableConfig.set("sapTimezone", sTimezone);
			if (Localization.getTimezone() !== sCurrentTimezone) {
				mChanges = {};
				mChanges.timezone = Localization.getTimezone();
				fireChange();
			}
		},

		/**
		 * Returns a LanguageTag object for the current language.
		 *
		 * The LanguageTag is derived from {@link module:sap/base/i18n/Localization.getLanguage Localization.getLanguage}.
		 *
		 * @returns {module:sap/base/i18n/LanguageTag} The LanguageTag
		 * @public
		 * @since 1.120.0
		 */
		getLanguageTag : function () {
			const oLanguageTag = new LanguageTag(Localization.getLanguage());
			const sLanguage = Localization.getModernLanguage(oLanguageTag.language);
			const sScript = oLanguageTag.script;
			let sLanguageTag = oLanguageTag.toString();
			// special case for "sr_Latn" language: "sh" should then be used
			// config method is used to set the Accept-Language HTTP Header for ODataModel
			// requests and .hdbtextbundle resource bundles.
			// It has to remain backward compatible
			if (sLanguage === "sr" && sScript === "Latn") {
				sLanguageTag = sLanguageTag.replace("sr-Latn", "sh");
			} else {
				sLanguageTag = sLanguageTag.replace(oLanguageTag.language, sLanguage);
			}
			return new LanguageTag(sLanguageTag);
		},

		/**
		 * Returns whether the page uses the RTL text direction.
		 *
		 * If no mode has been explicitly set (neither <code>true</code> nor <code>false</code>),
		 * the mode is derived from the current language setting.
		 *
		 * @returns {boolean} whether the page uses the RTL text direction
		 * @public
		 * @since 1.120.0
		 */
		getRTL : function () {
			// if rtl has not been set (still null), return the rtl mode derived from the language
			return  oWritableConfig.get({
				name: "sapRtl",
				type: BaseConfig.Type.Boolean,
				external:true,
				defaultValue: oWritableConfig.get({
					name: "sapUiRtl",
					type: BaseConfig.Type.Boolean,
					defaultValue: function() { return impliesRTL(Localization.getLanguageTag()); },
					external:true
				})
			});
		},

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
		 * {@link module:sap/base/i18n/Localization.setLanguage setLanguage} for details and restrictions.
		 *
		 * <b>Note</b>: See documentation of {@link module:sap/base/i18n/Localization.setLanguage setLanguage} for restrictions.
		 *
		 * @param {boolean|null} bRTL new character orientation mode or <code>null</code>
		 * @public
		 * @since 1.120.0
		 */
		setRTL : function(bRTL) {
			check(bRTL === null || typeof bRTL === "boolean", "bRTL must be null or a boolean");
			bRTL = bRTL === null ? undefined : bRTL;
			const oldRTL = Localization.getRTL();
			oWritableConfig.set("sapRtl", bRTL);
			const bCurrentRTL = Localization.getRTL();
			if ( oldRTL != bCurrentRTL ) { // also take the derived RTL flag into account for the before/after comparison!
				mChanges = {};
				mChanges.rtl = bCurrentRTL;
				fireChange();
			}
		},

		/**
		 * Best guess to get a proper SAP Logon Language for a given LanguageTag.
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
		 * supported by the default set of SAP languages. config method has no knowledge
		 * about the concrete languages of any given backend system.
		 *
		 * @param {module:sap/base/i18n/LanguageTag} oLanguageTag The Locale to calculate the SAPLogonLanguage
		 * @returns {string} a language code that should
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.120.0
		 **/
		_getSAPLogonLanguage : function(oLanguageTag) {
			let sLanguage = oLanguageTag.language || "";

			// cut off any ext. language sub tags
			if ( sLanguage.indexOf("-") >= 0 ) {
				sLanguage = sLanguage.slice(0, sLanguage.indexOf("-"));
			}

			// convert to new ISO codes
			sLanguage = Localization.getModernLanguage(sLanguage);

			// handle special case for Chinese: region TW implies Traditional Chinese (ZF)
			if ( sLanguage === "zh" && !oLanguageTag.script && oLanguageTag.region === "TW" ) {
				return "ZF";
			}

			return (
				M_LOCALE_TO_ABAP_LANGUAGE[join(sLanguage, oLanguageTag.script)]
				|| M_LOCALE_TO_ABAP_LANGUAGE[join(sLanguage, oLanguageTag.region)]
				|| M_LOCALE_TO_ABAP_LANGUAGE[getPseudoLanguageTag(oLanguageTag.privateUse)]
				|| sLanguage.toUpperCase()
			);
		},

		/**
		 * Returns an SAP logon language for the current language.
		 *
		 * It will be returned in uppercase.
		 * e.g. "EN", "DE"
		 *
		 * @returns {string} The SAP logon language code for the current language
		 * @public
		 * @since 1.120.0
		 */
		getSAPLogonLanguage : function () {
			let oLanguageTag;
			const sLanguage = oWritableConfig.get({
				name: "sapLanguage",
				type: BaseConfig.Type.String,
				external: true
			}).toUpperCase();

			try {
				[oLanguageTag] = fromSAPLogonLanguage(sLanguage);
			} catch (exc) {
				//do nothing
			}

			if (sLanguage && !oLanguageTag) {
				Log.warning("sap-language '" + sLanguage + "' is not a valid BCP47 language tag and will only be used as SAP logon language");
			}

			return sLanguage || Localization._getSAPLogonLanguage(Localization.getLanguageTag());
		},

		/**
		 * @returns {module:sap/base/i18n/date/CalendarType} The preferred Calendar type.
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.120.0
		 */
		getPreferredCalendarType : function() {
			const oLocale = Localization.getLanguageTag();
			return _mPreferredCalendar[oLocale.language + "-" + oLocale.region] ||
			_mPreferredCalendar[oLocale.language] ||
			_mPreferredCalendar["default"];
		},

		/**
		 * List of languages that the SAPUI5 core delivers.
		 *
		 * Might return undefined if the information is not available.
		 *
		 * @returns {string[]|undefined} List of Languages delivered with core
		 * @experimental
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.120.0
		 */
		getLanguagesDeliveredWithCore : function() {
			return _coreI18nLocales;
		},

		/**
		 * @returns {string[]} List of supported languages
		 * @experimental
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @since 1.120.0
		 */
		getSupportedLanguages : function() {
			let aLangs = BaseConfig.get({
				name: "sapUiXxSupportedLanguages",
				type: BaseConfig.Type.StringArray,
				external: true
			});
			if ( aLangs.length === 0 || (aLangs.length === 1 && aLangs[0] === '*') ) {
				aLangs = [];
			} else if ( aLangs.length === 1 && aLangs[0] === 'default' ) {
				aLangs = this.getLanguagesDeliveredWithCore() || [];
			}
			return aLangs;
		}
	};

	/**
	 * Checks whether the given language tag implies a character orientation
	 * of 'right-to-left' ('RTL').
	 *
	 * The implementation of config method and the configuration above assume
	 * that when a language (e.g. 'ar') is marked as 'RTL', then all language/region
	 * combinations for that language (e.g. 'ar_SA') will be 'RTL' as well,
	 * even if the combination is not mentioned in the above configuration.
	 * There is no means to define RTL=false for a language/region, when RTL=true for
	 * the language alone.
	 *
	 * As of 3/2013 config is true for all locales/regions supported by UI5.
	 *
	 * @param {module:sap/base/i18n/LanguageTag} oLanguageTag LanguageTag to check
	 * @returns {boolean} <code>true</code> if <code>vLanguage</code> implies RTL,
	 *  otherwise <code>false</code>
	 * @private
	 * @since 1.120.0
	 */
	function impliesRTL(oLanguageTag) {
		let sLanguage = oLanguageTag.language || "";
		sLanguage = Localization.getModernLanguage(oLanguageTag.language);
		const sRegion = oLanguageTag.region || "";
		if ( sRegion && A_RTL_LOCALES.indexOf(sLanguage + "_" + sRegion) >= 0 ) {
			return true;
		}
		return A_RTL_LOCALES.indexOf(sLanguage) >= 0;
	}

	function fireChange() {
		oEventing.fireEvent("change", mChanges);
		mChanges = undefined;
	}

	return Localization;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides type module:sap/base/i18n/date/CalendarType.
sap.ui.predefine("sap/base/i18n/date/CalendarType", [], function() {
	"use strict";

	/**
	 * The types of <code>Calendar</code>.
	 *
	 * @enum {string}
	 * @alias module:sap/base/i18n/date/CalendarType
	 * @public
	 * @since 1.120
	 */
	var CalendarType = {

		/**
		 * The Gregorian calendar
		 * @public
		 */
		Gregorian: "Gregorian",

		/**
		 * The Islamic calendar
		 * @public
		 */
		Islamic: "Islamic",

		/**
		 * The Japanese emperor calendar
		 * @public
		 */
		Japanese: "Japanese",

		/**
		 * The Persian Jalali calendar
		 * @public
		 */
		Persian: "Persian",

		/**
		 * The Thai buddhist calendar
		 * @public
		 */
		Buddhist: "Buddhist"
	};

	return CalendarType;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/i18n/date/TimezoneUtils", [], function() {
	"use strict";

	/**
	 * Static collection of utility functions to handle time zone related conversions
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 * @namespace
	 * @alias module:sap/base/i18n/date/TimezoneUtils
	 * @private
	 */
	var TimezoneUtils = {};

	/**
	 * Cache for the (browser's) local IANA timezone ID
	 *
	 * @type {string}
	 */
	var sLocalTimezone = "";

	/**
	 * Cache for valid time zones provided by <code>Intl.supportedValuesOf("timeZone")</code>
	 *
	 * @type {Array}
	 */
	var aSupportedTimezoneIDs;

	/**
	 * Cache for Intl.DateTimeFormat instances
	 */
	var oIntlDateTimeFormatCache = {
		_oCache: new Map(),
		/**
		 * When cache limit is reached, it gets cleared
		 */
		_iCacheLimit: 10,

		/**
		 * Creates or gets an instance of Intl.DateTimeFormat.
		 *
		 * @param {string} sTimezone IANA timezone ID
		 * @returns {Intl.DateTimeFormat} Intl.DateTimeFormat instance
		 */
		get: function (sTimezone) {
			var cacheEntry = this._oCache.get(sTimezone);
			if (cacheEntry) {
				return cacheEntry;
			}

			var oOptions = {
				hourCycle: "h23",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				fractionalSecondDigits: 3,
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				timeZone: sTimezone,
				timeZoneName: 'short',
				era: 'narrow',
				weekday: "short"
			};
			var oInstance = new Intl.DateTimeFormat("en-US", oOptions);

			// only store a limited number of entries in the cache
			if (this._oCache.size === this._iCacheLimit) {
				this._oCache = new Map();
			}
			this._oCache.set(sTimezone, oInstance);
			return oInstance;
		}
	};

	/**
	 * Uses the <code>Intl.supportedValuesOf('timeZone')</code> and <code>Intl.DateTimeFormat</code>
	 * API to check if the browser can handle the given IANA timezone ID.
	 * <code>Intl.supportedValuesOf('timeZone')</code> offers direct access to the list of supported
	 * time zones. It is not yet supported by all browsers but if it is supported and the given time
	 * zone is in the list it is faster than probing.
	 *
	 * <code>Intl.supportedValuesOf('timeZone')</code> does not return all IANA timezone IDs which
	 * the <code>Intl.DateTimeFormat</code> can handle, e.g. "Japan", "Etc/UTC".
	 *
	 * @param {string} sTimezone The IANA timezone ID which is checked, e.g <code>"Europe/Berlin"</code>
	 * @returns {boolean} Whether the time zone is a valid IANA timezone ID
	 * @private
	 * @ui5-restricted sap.ui.comp.util.DateTimeUtil, sap.ui.core.format.DateFormat, sap.viz,
	 *   sap/base/i18n/Localization, sap/ui/core/format/TimezoneUtil
	 */
	TimezoneUtils.isValidTimezone = function(sTimezone) {
		if (!sTimezone) {
			return false;
		}

		if (Intl.supportedValuesOf) {
			try {
				aSupportedTimezoneIDs = aSupportedTimezoneIDs || Intl.supportedValuesOf('timeZone');
				if (aSupportedTimezoneIDs.includes(sTimezone)) {
					return true;
				}
				// although not contained in the supportedValues it still can be valid, therefore continue
			} catch (oError) {
				// ignore error
				aSupportedTimezoneIDs = [];
			}
		}

		try {
			oIntlDateTimeFormatCache.get(sTimezone);
			return true;
		} catch (oError) {
			return false;
		}
	};

	/**
	 * Converts a date to a specific time zone.
	 * The resulting date reflects the given time zone such that the "UTC" Date methods
	 * can be used, e.g. Date#getUTCHours() to display the hours in the given time zone.
	 *
	 * @example
	 * var oDate = new Date("2021-10-13T15:22:33Z"); // UTC
	 * // time zone difference UTC-4 (DST)
	 * TimezoneUtils.convertToTimezone(oDate, "America/New_York");
	 * // result is:
	 * // 2021-10-13 11:22:33 in America/New_York
	 * // same as new Date("2021-10-13T11:22:33Z"); // UTC
	 *
	 * @param {Date} oDate The date which should be converted.
	 * @param {string} sTargetTimezone The target IANA timezone ID, e.g <code>"Europe/Berlin"</code>
	 * @returns {Date} The new date in the target time zone.
	 * @private
	 * @ui5-restricted sap.ui.core.format.DateFormat, sap.ui.comp.util.DateTimeUtil, sap.viz,
	 *   sap/ui/core/format/TimezoneUtil
	 */
	TimezoneUtils.convertToTimezone = function(oDate, sTargetTimezone) {
		var oFormatParts = this._getParts(oDate, sTargetTimezone);
		return TimezoneUtils._getDateFromParts(oFormatParts);
	};

	/**
	 * Uses the <code>Intl.DateTimeFormat</code> API to convert a date to a specific time zone.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts
	 * @param {Date} oDate The date which should be converted.
	 * @param {string} sTargetTimezone The target IANA timezone ID, e.g <code>"Europe/Berlin"</code>
	 * @returns {{
	 *     day: string,
	 *     era: string,
	 *     fractionalSecond: string,
	 *     hour: string,
	 *     minute: string,
	 *     month: string,
	 *     second: string,
	 *     timeZoneName: string,
	 *     weekday: string,
	 *     year: string
	 * }} An object containing the date and time fields considering the target time zone.
	 * @private
	 * @ui5-restricted sap.viz, sap/ui/core/date/UI5Date, sap/ui/core/format/TimezoneUtil
	 */
	TimezoneUtils._getParts = function(oDate, sTargetTimezone) {
		var sKey, oPart,
			oDateParts = Object.create(null),
			oIntlDate = oIntlDateTimeFormatCache.get(sTargetTimezone),
			// clone the date object before passing it to the Intl API, to ensure that no
			// UniversalDate gets passed to it;
			// no need to use UI5Date.getInstance as only the UTC timestamp is used
			oParts = oIntlDate.formatToParts(new Date(oDate.getTime()));

		for (sKey in oParts) {
			oPart = oParts[sKey];
			if (oPart.type !== "literal") {
				oDateParts[oPart.type] = oPart.value;
			}
		}
		return oDateParts;
	};

	/**
	 * Creates a Date from the provided date parts.
	 *
	 * @param {object} oParts Separated date and time fields as object, see {@link #_getParts}.
	 * @returns {Date} Returns the date object created from the provided parts.
	 * @private
	 * @ui5-restricted sap.viz, sap/ui/core/date/UI5Date, sap/ui/core/format/TimezoneUtil
	 */
	TimezoneUtils._getDateFromParts = function(oParts) {
		// no need to use UI5Date.getInstance as only the UTC timestamp is used
		var oDate = new Date(0),
			iUTCYear = parseInt(oParts.year);

		if (oParts.era === "B") {
			// The JS Date uses astronomical year numbering which supports year zero and negative
			// year numbers.
			// The Intl.DateTimeFormat API uses eras (no year zero and no negative year numbers).
			// years around zero overview:
			// | Astronomical | In Era
			// |            2 | 2 Anno Domini (era: "A")
			// |            1 | 1 Anno Domini (era: "A")
			// |            0 | 1 Before Christ (era: "B")
			// |           -1 | 2 Before Christ (era: "B")
			// |           -2 | 3 Before Christ (era: "B")
			// For the conversion to the JS Date the parts returned by the Intl.DateTimeFormat API
			// need to be adapted.
			iUTCYear = (iUTCYear * -1) + 1;
		}

		// Date.UTC cannot be used here to be able to support dates before the UNIX epoch
		oDate.setUTCFullYear(iUTCYear,
			parseInt(oParts.month) - 1,
			parseInt(oParts.day));
		oDate.setUTCHours(
			parseInt(oParts.hour),
			parseInt(oParts.minute),
			parseInt(oParts.second),
			parseInt(oParts.fractionalSecond || 0)); // some older browsers don't support fractionalSecond, e.g. Safari < 14.1 */

		return oDate;
	};

	/**
	 * Gets the offset to UTC in seconds for a given date in the time zone specified.
	 *
	 * For non-unique points in time, the daylight saving time takes precedence over the standard
	 * time shortly after the switch back (e.g. clock gets set back 1 hour, duplicate hour).
	 *
	 * @example
	 * var oDate = new Date("2021-10-13T13:22:33Z");
	 * TimezoneUtils.calculateOffset(oDate, "America/New_York");
	 * // => +14400 seconds (4 * 60 * 60 seconds)
	 *
	 * TimezoneUtils.calculateOffset(oDate, "Europe/Berlin");
	 * // => -7200 seconds (-2 * 60 * 60 seconds)
	 *
	 * // daylight saving time (2018 Sun, 25 Mar, 02:00	CET → CEST	+1 hour (DST start)	UTC+2h)
	 * // the given date is taken as it is in the time zone
	 * TimezoneUtils.calculateOffset(new Date("2018-03-25T00:00:00Z"), "Europe/Berlin");
	 * // => -3600 seconds (-1 * 60 * 60 seconds), interpreted as: 2018-03-25 00:00:00 (CET)
	 *
	 * TimezoneUtils.calculateOffset(new Date("2018-03-25T03:00:00Z"), "Europe/Berlin");
	 * // => -7200 seconds (-2 * 60 * 60 seconds)
	 *
	 * var oHistoricalDate = new Date("1800-10-13T13:22:33Z");
	 * TimezoneUtils.calculateOffset(oHistoricalDate, "Europe/Berlin");
	 * // => -3208 seconds (-3208 seconds)
	 *
	 * @param {Date} oDate The date in the time zone used to calculate the offset to UTC.
	 * @param {string} sTimezoneSource The source IANA timezone ID, e.g <code>"Europe/Berlin"</code>
	 * @returns {number} The difference to UTC between the date in the time zone.
	 * @private
	 * @ui5-restricted sap.ui.core.format.DateFormat, sap.viz, sap/ui/core/date/UI5Date,
	 *   sap/ui/core/format/TimezoneUtil
	 */
	TimezoneUtils.calculateOffset = function(oDate, sTimezoneSource) {
		const oDateInTimezone = TimezoneUtils.convertToTimezone(oDate, sTimezoneSource);
		const iGivenTimestamp = oDate.getTime();
		const iInitialOffset = iGivenTimestamp - oDateInTimezone.getTime();
		// no need to use UI5Date.getInstance as only the UTC timestamp is used
		const oFirstGuess = new Date(iGivenTimestamp + iInitialOffset);
		const oFirstGuessInTimezone = TimezoneUtils.convertToTimezone(oFirstGuess, sTimezoneSource);
		const iFirstGuessInTimezoneTimestamp = oFirstGuessInTimezone.getTime();
		const iSecondOffset = oFirstGuess.getTime() - iFirstGuessInTimezoneTimestamp;
		let iTimezoneOffset = iSecondOffset;

		if (iInitialOffset !== iSecondOffset) {
			const oSecondGuess = new Date(iGivenTimestamp + iSecondOffset);
			const oSecondGuessInTimezone = TimezoneUtils.convertToTimezone(oSecondGuess, sTimezoneSource);
			const iSecondGuessInTimezoneTimestamp = oSecondGuessInTimezone.getTime();
			// if time is different, the given date/time does not exist in the target time zone (switch to Daylight
			// Saving Time) -> take the offset for the greater date
			if (iSecondGuessInTimezoneTimestamp !== iGivenTimestamp
					&& iFirstGuessInTimezoneTimestamp > iSecondGuessInTimezoneTimestamp) {
				iTimezoneOffset = iInitialOffset;
			}
		}
		return iTimezoneOffset / 1000;
	};

	/**
	 * Map outdated IANA timezone IDs used in CLDR to correct and up-to-date IANA IDs as maintained in ABAP systems.
	 *
	 * @private
 	 */
	TimezoneUtils.mCLDR2ABAPTimezones = {
		"America/Buenos_Aires": "America/Argentina/Buenos_Aires",
		"America/Catamarca": "America/Argentina/Catamarca",
		"America/Cordoba": "America/Argentina/Cordoba",
		"America/Jujuy": "America/Argentina/Jujuy",
		"America/Mendoza": "America/Argentina/Mendoza",
		"America/Indianapolis": "America/Indiana/Indianapolis",
		"America/Louisville": "America/Kentucky/Louisville",
		"Africa/Asmera": "Africa/Asmara",
		"Asia/Katmandu": "Asia/Kathmandu",
		"Asia/Calcutta": "Asia/Kolkata",
		"Atlantic/Faeroe": "Atlantic/Faroe",
		"Pacific/Ponape": "Pacific/Pohnpei",
		"Asia/Rangoon": "Asia/Yangon",
		"Pacific/Truk": "Pacific/Chuuk",
		"America/Godthab": "America/Nuuk",
		"Asia/Saigon": "Asia/Ho_Chi_Minh",
		"America/Coral_Harbour": "America/Atikokan"
	};

	/**
	 * Retrieves the browser's local IANA timezone ID; if the browser's timezone ID is not the up-to-date IANA
	 * timezone ID, the corresponding IANA timezone ID is returned.
	 *
	 * @returns {string} The local IANA timezone ID of the browser as up-to-date IANA timezone ID,
	 *   e.g. <code>"Europe/Berlin"</code> or <code>"Asia/Kolkata"</code>
	 *
	 * @private
	 * @ui5-restricted sap.gantt, sap.gantt, sap.viz, lib/cldr-openui5/lib/Generator,
	 *   sap/base/i18n/Localization, sap/ui/core/date/UI5Date, sap/ui/core/format/TimezoneUtil
	 */
	TimezoneUtils.getLocalTimezone = function() {
		if (sLocalTimezone === "") { // timezone may be undefined, only value "" means empty cache
			sLocalTimezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
			sLocalTimezone = TimezoneUtils.mCLDR2ABAPTimezones[sLocalTimezone] || sLocalTimezone;
		}

		return sLocalTimezone;
	};

	/**
	 * Clears the cache for the browser's local IANA timezone ID.
	 *
	 * @private
	 */
	TimezoneUtils._clearLocalTimezoneCache = function () {
		sLocalTimezone = "";
	};

	return TimezoneUtils;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/base/util/Deferred", () => {
	"use strict";

	/**
	 * @class Creates a <code>Deferred</code> instance which represents a future value.
	 *
	 * While a <code>Promise</code> can only be resolved or rejected by calling the respective methods in its constructor, a <code>Deferred</code>
	 * can be resolved or rejected via <code>resolve</code> or <code>reject</code> methods at any point.
	 * A <code>Deferred</code> object creates a <code>Promise</code> instance which functions as a proxy for the future result.
	 * This <code>Promise</code> object can be accessed via the <code>promise</code> property of the <code>Deferred</code> object.
	 *
	 * @alias module:sap/base/util/Deferred
	 * @since 1.90
	 * @public
	 * @template {any} [T=any]
	 */
	var Deferred = function() {
		/**
		 * Promise instance of the Deferred
		 *
		 * @type {Promise<T>}
		 * @public
		 */
		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	};

	/**
	 * Proxy call to the <code>resolve</code> method of the wrapped Promise
	 *
	 * @name module:sap/base/util/Deferred#resolve
	 * @param {T} [value] Fulfillment value
	 * @function
	 * @public
	 */

	/**
	 * Proxy call to the <code>reject</code> method of the wrapped Promise
	 *
	 * @name module:sap/base/util/Deferred#reject
	 * @param {any} [reason] Failure reason
	 * @function
	 * @public
	 */

	return Deferred;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/base/util/LoaderExtensions", [
	'sap/ui/util/XMLHelper',
	'sap/base/Log',
	'sap/base/assert',
	'sap/base/util/extend',
	'sap/base/util/fetch',
	'sap/base/util/mixedFetch'
], function(
	XMLHelper,
	Log,
	assert,
	extend,
	fetch,
	mixedFetch
) {
	"use strict";

	/**
	 * Utilities extending the <code>sap.ui.loader</code> functionalities.
	 *
	 * @namespace
	 * @since 1.58
	 * @private
	 * @ui5-restricted sap.ui.core, sap.fe.placeholder
	 * @alias module:sap/base/util/LoaderExtensions
	 */
	var LoaderExtensions = {};

	/**
	 * Known subtypes per file type.
	 * @const
	 * @private
	 */
	var KNOWN_SUBTYPES = {
		js:   ["controller", "designtime", "fragment", "support", "view"],
		json: ["fragment", "view"],
		html: ["fragment", "view"],
		xml:  ["fragment", "view"]
	};

	/**
	 * A regex that matches all known file type extensions (without subtypes).
	 * @const
	 * @private
	 */
	var rTypes = new RegExp("\\.(" + Object.keys(KNOWN_SUBTYPES).join("|") + ")$");

	/**
	 * Returns all known subtypes.
	 *
	 * @returns {Object<string,string[]>} Map of known subtypes per file type
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	LoaderExtensions.getKnownSubtypes = function() {
		return KNOWN_SUBTYPES;
	};

	/**
	 * Returns the names of all required modules in the legacy syntax for module names (dot-separated).
	 *
	 * @return {string[]} The names of all required modules
	 * @static
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	LoaderExtensions.getAllRequiredModules = function() {
		var aModuleNames = [],
			mModules = sap.ui.loader._.getAllModules(true),
			oModule;

		for (var sModuleName in mModules) {
			oModule = mModules[sModuleName];
			// filter out preloaded modules
			if (oModule.ui5 && oModule.state !== -1 /* PRELOADED */) {
				aModuleNames.push(oModule.ui5);
			}
		}
		return aModuleNames;
	};

	// Stores final URL prefixes (used by registerResourcePath)
	var mFinalPrefixes = Object.create(null);

	/**
	 * Registers a URL prefix for a resource name prefix.
	 *
	 * Before a resource is loaded, the longest registered prefix of its unified resource name
	 * is searched for and the associated URL prefix is used as a prefix for the request URL.
	 * The remainder of the resource name is attached to the request URL 1:1.
	 *
	 * The registration and search operates on full name segments only. So when a prefix
	 *
	 * <pre>
	 *    'sap/com'  ->  'http://www.sap.com/ui5/resources/'
	 * </pre>
	 *
	 * is registered, then it will match the name
	 *
	 * <pre>
	 *    'sap/com/Button'
	 * </pre>
	 *
	 * but not
	 *
	 * <pre>
	 *    'sap/commons/Button'
	 * </pre>
	 *
	 * Note that the empty prefix ('') will always match and thus serves as a fallback for
	 * any search.
	 *
	 * The URL prefix can either be given as string or as an object which contains a <code>url</code> property
	 * and optionally a <code>final</code> flag. If <code>final</code> is set to true, overwriting the path
	 * for the given resource name prefix is not possible anymore.
	 *
	 * @param {string} sResourceNamePrefix In unified resource name syntax
	 * @param {string | object} vUrlPrefix Prefix to use instead of the <code>sResourceNamePrefix</code>, either
	 *     a string literal or an object (e.g. <code>{url : 'url/to/res', 'final': true}</code>)
	 * @param {string} [vUrlPrefix.url] Path prefix to register
	 * @param {boolean} [vUrlPrefix.final=false] Prevents overwriting the URL path prefix for the given resource
	 *     name prefix at a later point of time.
	 *
	 * @private
	 * @ui5-restricted sap.ui.core.Core, sap.ui.core.Component
	 * @static
	 * @SecSink {1|PATH} Parameter is used for future HTTP requests
	 */
	LoaderExtensions.registerResourcePath = function(sResourceNamePrefix, vUrlPrefix) {
		if (!vUrlPrefix) {
			vUrlPrefix = { url: null };
		}

		if (!mFinalPrefixes[sResourceNamePrefix]) {
			var sUrlPrefix;

			if (typeof vUrlPrefix === "string" || vUrlPrefix instanceof String) {
				sUrlPrefix = vUrlPrefix;
			} else {
				sUrlPrefix = vUrlPrefix.url;
				if (vUrlPrefix.final) {
					mFinalPrefixes[sResourceNamePrefix] = vUrlPrefix.final;
				}
			}

			var sOldUrlPrefix = sap.ui.require.toUrl(sResourceNamePrefix);
			var oConfig;

			if (sUrlPrefix !== sOldUrlPrefix || vUrlPrefix.final) {
				oConfig = {
					paths: {}
				};
				oConfig.paths[sResourceNamePrefix] = sUrlPrefix;
				sap.ui.loader.config(oConfig);

				Log.info("LoaderExtensions.registerResourcePath ('" + sResourceNamePrefix + "', '" + sUrlPrefix + "')" + (vUrlPrefix['final'] ? " (final)" : ""));
			}
		} else {
			Log.warning( "LoaderExtensions.registerResourcePath with prefix " + sResourceNamePrefix + " already set as final. This call is ignored." );
		}
	};

	/**
	 * Resolves the given <code>ui5://...</code> URL with <code>sap.ui.require.toURl</code>.
	 * Strings which are not a ui5: URL are simply returned unchanged.
	 *
	 * @param {string} sUrl The URL string which should be resolved
	 * @returns {string} The resolved URL or the input string if not a ui5: URL.
	 *
	 * @static
	 * @private
	 * @ui5-restricted sap.ui.core.Component
	 */
	LoaderExtensions.resolveUI5Url = function(sUrl) {
		// check for ui5 scheme
		if (sUrl.startsWith("ui5:")) {
			var sNoScheme = sUrl.replace("ui5:", "");

			// check for authority
			if (!sNoScheme.startsWith("//")) {
				throw new Error("URLs using the 'ui5' protocol must be absolute. Relative and server absolute URLs are reserved for future use.");
			}

			sNoScheme = sNoScheme.replace("//", "");

			return sap.ui.loader._.resolveURL(sap.ui.require.toUrl(sNoScheme));
		} else {
			// not a ui5 url
			return sUrl;
		}
	};

	/**
	 * Retrieves the resource with the given name, either from the preload cache or from
	 * the server. The expected data type of the resource can either be specified in the
	 * options (<code>dataType</code>) or it will be derived from the suffix of the <code>sResourceName</code>.
	 * The only supported data types so far are <code>'xml'</code>, <code>'html'</code>, <code>'json'</code>
	 * and <code>'text'</code>. If the resource name extension doesn't match any of these extensions,
	 * the <code>dataType</code> property must be specified as option.
	 *
	 * If the resource is found in the preload cache, it will be converted from text format
	 * to the requested <code>dataType</code> using conversions similar to:
	 * <pre>
	 *   dataType | conversion
	 *   ---------+-------------------------------------------------------------
	 *     html   | text (no conversion)
	 *     json   | JSON.parse(text)
	 *     xml    | DOMParser.prototype.parseFromString(text, "application/xml")
	 * </pre>
	 *
	 * If it is not found, the resource name will be converted to a resource URL (using {@link #getResourcePath})
	 * and the resulting URL will be requested from the server with an XMLHttpRequest.
	 *
	 * If the resource was found in the local preload cache and any necessary conversion succeeded
	 * or when the resource was retrieved from the backend successfully, the content of the resource will
	 * be returned. In any other case, an exception will be thrown, or if option <code>failOnError</code> is set,
	 * <code>null</code> will be returned.
	 *
	 * For asynchronous calls, the return value of this method is a Promise which resolves with the
	 * content of the resource on success or rejects with an error in case of errors. If <code>failOnError</code>
	 * is <code>false</code> and an error occurs, the promise won't be rejected, but resolved with <code>null</code>.
	 *
	 * Future implementations of this API might add more options. Generic implementations that accept an
	 * <code>mOptions</code> object and propagate it to this function should limit the options to the currently
	 * defined set of options or they might fail for unknown options.
	 *
	 * @param {string} [sResourceName] resourceName In unified resource name syntax
	 * @param {object} [mOptions] Options
	 * @param {string} [mOptions.dataType] One of "xml", "html", "json" or "text". If not specified, it will be derived
	 *     from the extension of the resource name or URL
	 * @param {string} [mOptions.name] Unified resource name of the resource to load (alternative syntax)
	 * @param {string} [mOptions.url] URL of a resource to load (alternative syntax, name will only be a guess)
	 * @param {Object<string,string>} [mOptions.headers] HTTP headers for an eventual XHR request
	 * @param {string} [mOptions.failOnError=true] Whether to propagate load errors to the caller or not
	 * @param {string} [mOptions.async=false] Whether the loading should be performed asynchronously
	 * @returns {string|Document|object|Promise} Content of the resource. A string for type 'text' or 'html',
	 *     an Object for type 'json', a Document for type 'xml'. For asynchronous calls, a Promise will be returned
	 *     that resolves with the resources's content or rejects with an error when loading the resource failed
	 * @throws Error if loading the resource failed (synchronous call)
	 * @private
	 * @ui5-restricted sap.ui.core, sap.ui.fl
	 */
	LoaderExtensions.loadResource = function(sResourceName, mOptions) {
		var sType,
			oData,
			sUrl,
			fnDone = function() {},
			iSyncCallBehavior;

		if (typeof sResourceName === "string") {
			mOptions = mOptions || {};
		} else {
			mOptions = sResourceName || {};
			sResourceName = mOptions.name;
		}
		// defaulting
		mOptions = extend({ failOnError: true, async: false }, mOptions);

		sType = mOptions.dataType;
		if (sType == null && sResourceName) {
			sType = (sType = rTypes.exec(sResourceName || mOptions.url)) && sType[1];
		}

		assert(/^(xml|html|json|text)$/.test(sType), "type must be one of xml, html, json or text");

		function convertData(d) {
			switch (sType) {
				case "json":
					return JSON.parse(d);
				case "xml":
					return XMLHelper.parse(d);
				default:
					return d;
			}
		}

		oData = sap.ui.loader._.getModuleContent(sResourceName, mOptions.url);

		if (oData != undefined) {
			// data available
			oData = convertData(oData);

			if (mOptions.async) {
				return Promise.resolve(oData);
			} else {
				return oData;
			}
		} else {
			// load data
			iSyncCallBehavior = sap.ui.loader._.getSyncCallBehavior();
			if (!mOptions.async && iSyncCallBehavior) {
				Log.warning("[nosync] loading resource '" + (sResourceName || mOptions.url) + "' with sync XHR");
			}

			var oHeaders = {};
			if (sType) {
				oHeaders["Accept"] = fetch.ContentTypes[sType.toUpperCase()];
			}

			sUrl = mOptions.url || sap.ui.loader._.getResourcePath(sResourceName);

			if (LoaderExtensions.notifyResourceLoading) {
				fnDone = LoaderExtensions.notifyResourceLoading();
			}

			/**
			 * @deprecated As of Version 1.120
			 */
			fetch = mixedFetch ? mixedFetch : fetch;
			var pResponse = fetch(sUrl, {
				headers: Object.assign(oHeaders, mOptions.headers)
			}, !mOptions.async)
			.then(function(response) {
				if (response.ok) {
					return response.text().then(function(responseText) {
						return {
							data: convertData(responseText)
						};
					});
				} else {
					var oError = new Error("resource " + sResourceName + " could not be loaded from " + sUrl +
						". Check for 'file not found' or parse errors. Reason: " + response.statusText || response.status);
					oError.status = response.statusText;
					oError.statusCode = response.status;
					throw oError;
				}
			})
			.catch(function(error) {
				return {
					data: null,
					error: error
				};
			})
			.then(function(oInfo) {
				fnDone();

				if (oInfo.data !== null) {
					return oInfo.data;
				} else if (mOptions.failOnError) {
					Log.error(oInfo.error);
					throw oInfo.error;
				} else {
					return null;
				}
			});

			if (mOptions.async) {
				return pResponse;
			} else {
				return pResponse.unwrap();
			}
		}
	};

	/**
	 * Hook to notify interaction tracking about the loading of a resource.
	 *
	 * When set, the hook will be called when loading a resource starts. The hook can return a callback
	 * function which will be called when loading the resource finishes (no matter whether loading
	 * succeeds or fails). No further data is provided to the hook nor to the callback.
	 *
	 * Only a single implementation of the hook is supported.
	 *
	 * @private
	 * @ui5-restricted module:sap/ui/performance/trace/Interaction
	 *
	 * @type {function():function}
	 */
	LoaderExtensions.notifyResourceLoading = null;

	return LoaderExtensions;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/_merge", ["./isPlainObject"], function(isPlainObject) {
	"use strict";

	var oToken = Object.create(null);

	/**
	 * Performs object extension by merging source objects into a target object.
	 *
	 * @example
	 * var oMerged = _merge(true, false, {}, {prop1:1}, {prop2:2});
	 *
	 * @function
	 * @since 1.71
	 * @private
	 * @alias module:sap/base/util/_merge
	 * @param {boolean} deep Shallow copy or deep merge
	 * @param {boolean} skipUndefined Whether <code>undefined</code> values will be skipped, otherwise <code>undefined</code> values will overwrite existing values
	 * @param {object} target The object that will receive new properties
	 * @param {...object} [source] One or more objects which get merged into the target object
	 * @return {object} the target object which is the result of the merge
	 */
	var fnMerge = function() {
		/*
		 * The code in this function is taken from jQuery 3.6.0 "jQuery.extend" and got modified.
		 *
		 * jQuery JavaScript Library v3.6.0
		 * https://jquery.com/
		 *
		 * Copyright OpenJS Foundation and other contributors
		 * Released under the MIT license
		 * https://jquery.org/license
		 */
		var src, copyIsArray, copy, name, options, clone,
			target = arguments[2] || {},
			i = 3,
			length = arguments.length,
			deep = arguments[0] || false,
			skipToken = arguments[1] ? undefined : oToken;

		// Handle case when target is a string or something (possible in deep copy)
		if (typeof target !== "object" && typeof target !== "function") {
			target = {};
		}

		for ( ; i < length; i++ ) {
			if ( ( options = arguments[ i ] ) != null ) {

				// Extend the base object
				for ( name in options ) {
					src = target[ name ];
					copy = options[ name ];

					// Prevent never-ending loop
					// Prevent Object.prototype pollution for $.extend( true, ... )
					// For further information, please visit https://github.com/jquery/jquery/pull/4333
					if ( name === "__proto__" || target === copy ) {
						continue;
					}

					// Recurse if we're merging plain objects or arrays
					if ( deep && copy && ( isPlainObject( copy ) ||
						( copyIsArray = Array.isArray( copy ) ) ) ) {

						if ( copyIsArray ) {
							copyIsArray = false;
							clone = src && Array.isArray( src ) ? src : [];

						} else {
							clone = src && isPlainObject( src ) ? src : {};
						}

						// Never move original objects, clone them
						target[ name ] = fnMerge( deep, arguments[1], clone, copy );

					// Don't bring in undefined values
					} else if ( copy !== skipToken ) {
						target[ name ] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	};
	return fnMerge;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/extend", ["./_merge"], function(_merge) {
	"use strict";

	/**
	 * Performs object extension by merging source objects into a target object. Generates a shallow copy.
	 *
	 * If during merging a key in the target object exists it is overwritten with the source object's value.
	 * Usage is the same as <code>jQuery.extend(...)</code>.
	 * Values that are <code>undefined</code> are ignored.
	 *
	 * As alternative you may also use <code>Object.assign</code>, but note that <code>Object.assign</code>
	 * only copies enumerable and own properties and doesn't copy properties on the prototype and non-enumerable
	 * properties. Also, values that are <code>undefined</code> are NOT ignored.
	 *
	 * For deep copies, you may use {@link module:sap/base/util/deepExtend sap/base/util/deepExtend}.
	 *
	 * @example
	 * var oResult = extend({}, {
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
	 *
	 * console.log(oResult);
	 * {
	 *   "prop1": {
	 *     "prop1b": "1b"
	 *   },
	 *   "prop2": {
	 *     "prop2a": "2a"
	 *   }
	 * }
	 *
	 * @function
	 * @alias module:sap/base/util/extend
	 * @param {object} target The object that will receive new properties
	 * @param {...object} [source] One or more objects which get merged into the target object
	 * @return {object} the target object which is the result of the merge
	 * @public
	 * @since 1.71
	 */
	var fnExtend = function() {
		var args = [false, true];
		args.push.apply(args, arguments);
		return _merge.apply(null, args);
	};

	return fnExtend;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/fetch", [], function () {
	"use strict";

	function parseHeaders(sAllResponseHeaders) {
		var result = new Headers();
		if (typeof sAllResponseHeaders === "string") {
			sAllResponseHeaders.trim().split("\r\n").forEach(function (sHeader) {
				if (sHeader) {
					var pos = sHeader.indexOf(":");
					if (pos > 0) {
						result.append(sHeader.slice(0, pos), sHeader.slice(pos + 1));
					} else {
						result.append(sHeader, "");
					}
				}
			});
		}
		return result;
	}

	/**
	 * Represents the response object to a {@link module:sap/base/util/fetch} request and {@link module:sap/base/util/syncFetch} request.
	 * The implementation is based on the Response interface of the global <code>fetch()</code> method,
	 * but brings a much reduced set of properties and methods.
	 *
	 * The properties that are provided:
	 * <ul>
	 * 	<li>The <code>headers</code> property containing the <code>Headers</code> object</li>
	 * 	<li>The <code>ok</code> property containing a boolean stating whether the response was successful</li>
	 * 	<li>The <code>status</code> property containing the HTTP status code</li>
	 * 	<li>The <code>statusText</code> property containing an HTTP status message</li>
	 * </ul>
	 *
	 * The methods that are provided:
	 * <ul>
	 * 	<li>The <code>json()</code> method returns a promise that resolves with the result of parsing the XHR response text as JSON</li>
	 * 	<li>The <code>text()</code> method returns a promise that resolves with the XHR response text as String</li>
	 * </ul>
	 *
	 * In case of a response to a synchronous <code>module:sap/base/util/syncFetch</code> request,
	 * all methods will return the XHR response directly, according to the respective output format.
	 *
	 *
	 * @param {XMLHttpRequest} xhr The XMLHttpRequest object
	 * @param {Promise|sap.ui.base.SyncPromise} PromiseImpl A Promise for asynchronous requests, and
	 *                                          an <code>sap.ui.base.SyncPromise</code> for synchronous requests.
	 * @interface
	 * @alias module:sap/base/util/SimpleResponse
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	function SimpleResponse(xhr, PromiseImpl) {
		var headers = parseHeaders(xhr.getAllResponseHeaders());
		Object.defineProperties(this, {
			headers: {
				value: headers
			},
			ok: {
				value: xhr.status >= 200 && xhr.status < 300
			},
			status: {
				value: xhr.status
			},
			statusText: {
				value: xhr.statusText
			}
		});

		this.json = function() {
			if (xhr.responseType === "json") {
				return PromiseImpl.resolve(xhr.response);
			} else {
				try {
					var oData = JSON.parse(xhr.responseText);
					return PromiseImpl.resolve(oData);
				} catch (err) {
					return PromiseImpl.reject(err);
				}
			}
		};

		this.text = function() {
			return PromiseImpl.resolve(xhr.responseText);
		};
	}

	// Allowed request credentials
	var ALLOWED_CREDENTIALS = ["include", "omit", "same-origin"];

	/**
	 * Performs an asynchronous XMLHttpRequest (XHR) with the provided resource URL and request settings.
	 * It returns a Promise that resolves with an <code>module:sap/base/util/SimpleResponse</code> object, which is
	 * a simplified implementation of the global Response interface, representing the response of the XHR.
	 *
	 * If the request encounters network failures, the returned promise will be rejected with a <code>TypeError</code>.
	 * In case of an HTTP error status (e.g. error status 404), the returned promise will resolve instead.
	 * The <code>response.ok</code> or <code>response.status</code> flags can be used to distinguish
	 * a success status from an error status.
	 *
	 * The Promise will reject with a <code>DOMException</code> if the request gets aborted.
	 * To abort a request, an instance of the global <code>AbortSignal</code> must be provided to the settings via property <code>init.signal</code>.
	 * An abort signal can be created via an instance of the <code>AbortController</code>, and then using
	 * the <code>AbortController.signal</code> property. The signal associates the abort controller with the request
	 * and allows it to abort the XHR by calling <code>AbortController.abort()</code>.
	 *
	 * Although the usage of this method is very similar to the native <code>fetch()</code> method,
	 * it allows a much reduced set of request settings (in the <code>init</code> argument).
	 *
	 * @param  {string} resource A string containing the URL to which the request is sent
	 * @param  {object} [init] A set of key/value pairs that configure the request.
	 * @param  {any} [init.body] Any body that you want to add to your request: this can be a Blob, BufferSource, FormData, URLSearchParams, string, or ReadableStream object.
	 *                           Note that a request using the GET or HEAD method cannot have a body.
	 * @param  {"omit"|"same-origin"|"include"} [init.credentials='same-origin'] Controls what browsers do with credentials.
	 *                                                   Must be either 'omit', 'same-origin' or 'include'.
	 * @param  {Headers|object} [init.headers] A Headers object or an object with key/value pairs containing the request headers
	 * @param  {string} [init.method='GET'] The request method, e.g. 'GET', 'POST'
	 * @param  {AbortSignal} [init.signal] An AbortSignal object instance which allows to abort the request
	 * @return {Promise<module:sap/base/util/SimpleResponse>} Returns a Promise resolving with a <code>SimpleResponse</code>
	 *
	 * @alias module:sap/base/util/fetch
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 */
	function fetch(resource, init, _mImplementations) {
		/**
		 * see "https://developer.mozilla.org/en-US/docs/Web/API/Request/Request"
		 * regarding default values
		 */
		init = Object.assign({
			body: null,
			credentials: "same-origin",
			method: "GET",
			signal: new AbortController().signal
			// mode: "cors",
			// redirect: "follow",
			// referrer: "about:client"
		}, init);

		// "sap/base/util/syncFetch" might pass a SyncPromise implementation
		var PromiseImpl = (_mImplementations && _mImplementations.promiseImpl) || Promise;

		return new PromiseImpl(function(resolve, reject) {
			// check for credentials in the resource URL
			var oUrl = new URL(resource, document.baseURI);
			if (oUrl.username || oUrl.password) {
				reject(new TypeError("Failed to execute 'fetch': Request cannot be constructed from a URL that includes credentials:" + resource));
			}

			// adding the missing protocol back to the URL string which is taken from the document.baseURI
			resource = resource.replace(/^\/\//, oUrl.protocol + "//");

			if (init.body !== null && (init.method == "GET" || init.method == "HEAD")) {
				reject(new TypeError("Failed to execute 'fetch': Request with GET/HEAD method cannot have body."));
			}

			var xhr = new XMLHttpRequest();
			// event listener
			xhr.addEventListener("load", function() {
				var oResponse = new SimpleResponse(xhr, PromiseImpl);

				if (_mImplementations && _mImplementations.responseMixin) {
					_mImplementations.responseMixin.apply(oResponse);
				}
				resolve(oResponse);
			});
			xhr.addEventListener("error", function() {
				reject(new TypeError("Failed to fetch."));
			});

			xhr.open(init.method, resource, _mImplementations ? false : true);

			// see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort
			init.signal.addEventListener("abort", function () {
				xhr.abort();
				reject(new DOMException("The user aborted a request.", "AbortError"));
			});

			// set request headers
			var oHeaders;
			if (init.headers instanceof Headers) {
				oHeaders = Object.fromEntries(init.headers);
			} else {
				oHeaders = init.headers || {};
			}
			Object.keys(oHeaders).forEach(function(key) {
				xhr.setRequestHeader(key, oHeaders[key]);
			});

			// request credentials
			if (ALLOWED_CREDENTIALS.includes(init.credentials)) {
				// set credentials
				if (init.credentials === "omit") {
					xhr.withCredentials = false;
				} else if (init.credentials === "include") {
					xhr.withCredentials = true;
				}
			} else {
				reject(new TypeError("Failed to execute 'fetch': Failed to read the 'credentials' property from 'RequestInit': The provided value " + init.credentials
					+ " is not a valid enum value of type RequestCredentials."));
			}

			// send request
			try {
				xhr.send(init.body);
			} catch (error) {
				reject(new TypeError(error.message));
			}
		});
	}

	/**
	 * Header values that can be used with the "Accept" and "Content-Type" headers
	 * in the fetch call or the response object.
	 *
	 * @type {Object}
	 * @private
	 * @ui5-restricted SAPUI5 Distribution Layer Libraries
	 *
	 */
	fetch.ContentTypes = {
		TEXT: "text/plain",
		HTML: "text/html",
		XML: "application/xml, text/xml",
		JSON: "application/json, text/javascript"
	};

	return fetch;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/isPlainObject", [], function() {
	"use strict";

	var class2type = {};
	var hasOwn = class2type.hasOwnProperty;
	var toString = class2type.toString;
	var fnToString = hasOwn.toString;
	var ObjectFunctionString = fnToString.call( Object );

	/**
	 * Checks whether the object is a plain object (created using "{}" or "new Object").
	 *
	 * @function
	 * @since 1.58
	 * @public
	 * @alias module:sap/base/util/isPlainObject
	 * @param {Object} obj the object which is checked
	 * @returns {boolean} whether or not the object is a plain object (created using "{}" or "new Object").
	 */
	var fnIsPlainObject = function(obj) {
		/*
		 * The code in this function is taken from jQuery 3.6.0 "jQuery.isPlainObject" and got modified.
		 *
		 * jQuery JavaScript Library v3.6.0
		 * http://jquery.com/
		 *
		 * Copyright OpenJS Foundation and other contributors
		 * Released under the MIT license
		 * http://jquery.org/license
		 */
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = Object.getPrototypeOf( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with a prototype are considered plain only if they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;

		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	};
	return fnIsPlainObject;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/mixedFetch", [
	"./fetch",
	"sap/ui/base/SyncPromise"
], function (fetch, SyncPromise) {
	"use strict";

	/**
	 * Allows to perform an synchronous or asynchronous XMLHttpRequest (XHR) with the provided resource URL and request settings.
	 * It returns a Promise resolving with an <code>module:sap/base/util/SimpleResponse</code> object, which is
	 * a simplified implementation of the global Response interface, representing the response of the XHR.
	 * It returns a <code>sap.ui.base.SyncPromise</code>, if the parameter <code>bSync</code> is set to 'true'.
	 *
	 * If the request encounters network failures, the returned promise will be rejected with a <code>TypeError</code>.
	 * In case of an HTTP error status (e.g. error status 404), the returned promise will resolve instead. The properties
	 * <code>response.ok</code> or <code>response.status</code> can be used to distinguish
	 * a success status from an error status.
	 *
	 * The Promise or SyncPromise will reject with a <code>DOMException</code> if the request gets aborted.
	 * To abort a request, an instance of the global <code>AbortSignal</code> must be provided to the settings.
	 * An abort signal can be created via an instance of the <code>AbortController</code>, and then using
	 * the <code>AbortController.signal</code> property. The signal associates the abort controller with the request
	 * and allows it to abort the XHR by calling <code>AbortController.abort()</code>.
	 *
	 * @param  {string} resource A string containing the URL to which the request is sent
	 * @param  {object} [init] A set of key/value pairs that configure the request.
	 * @param  {any} [init.body] Any body that you want to add to your request: this can be a Blob, BufferSource, FormData, URLSearchParams, string, or ReadableStream object.
	 *                           Note that a request using the GET or HEAD method cannot have a body.
	 * @param  {"omit"|"same-origin"|"include"} [init.credentials='same-origin'] Controls what browsers do with credentials.
	 *                                                                           Must be either 'omit', 'same-origin' or 'include'.
	 * @param  {Headers|object} [init.headers] A Headers object or an object with key/value pairs containing the request headers
	 * @param  {string} [init.method='GET'] The request method, e.g. 'GET', 'POST'
	 * @param  {AbortSignal} [init.signal] An AbortSignal object instance which allows to abort the request
	 * @param  {boolean} [bSync=false] Performs a synchronous XMLHttpRequest if set to 'true'
	 * @return {Promise<module:sap/base/util/SimpleResponse>|sap.ui.base.SyncPromise<module:sap/base/util/SimpleResponse>} Returns a Promise or SyncPromise resolving with a <code>SimpleResponse</code> object
	 *
	 * @alias module:sap/base/util/mixedFetch
	 * @deprecated As of Version 1.120
	 * @private
	 * @ui5-restricted sap.ui.core, sap.ui.model
	 */
	function mixedFetch(resource, init, bSync) {
		var mImplementations;

		if (bSync === true) {
			mImplementations = {
				promiseImpl: SyncPromise
			};
		}

		return fetch(resource, init, mImplementations);
	}

	/**
	 * Header values that can be used with the "Accept" and "Content-Type" headers
	 * in the fetch call or the response object.
	 *
	 * @type {Object}
	 * @private
	 * @ui5-restricted sap.ui.core
	 *
	 */
	mixedFetch.ContentTypes = fetch.ContentTypes;

	return mixedFetch;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
/*global performance */
sap.ui.predefine("sap/base/util/now", [], () => {
	"use strict";

	/**
	 * Returns a high resolution timestamp in microseconds.
	 * The timestamp is based on 01/01/1970 00:00:00 (UNIX epoch) as float with microsecond precision.
	 * The fractional part of the timestamp represents fractions of a millisecond.
	 * Converting to a <code>Date</code> is possible by using <code>require(["sap/base/util/now"], function(now){new Date(now());}</code>
	 *
	 * @function
	 * @since 1.58
	 * @public
	 * @alias module:sap/base/util/now
	 * @returns {float} timestamp in microseconds
	 */
	var fnNow = function now() {
		return performance.timeOrigin + performance.now();
	};

	return fnNow;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/base/util/uid", [], function() {
	"use strict";

	/**
	 * Some private variable used for creation of (pseudo-)unique IDs.
	 * @type int
	 * @private
	 */
	var iIdCounter = 0;

	/**
	 * Creates and returns a pseudo-unique ID.
	 *
	 * No means for detection of overlap with already present or future UIDs.
	 *
	 * @function
	 * @since 1.58
	 * @alias module:sap/base/util/uid
	 * @return {string} A pseudo-unique id.
	 * @public
	 */
	var fnUid = function uid() {
		return "id-" + new Date().valueOf() + "-" + iIdCounter++;
	};

	return fnUid;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/base/SyncPromise", [], function () {
	"use strict";

	var oResolved = new SyncPromise(function (resolve, reject) {
			resolve();
		}), // a SyncPromise which is resolved w/o arguments
		oResolvedNull = new SyncPromise(function (resolve, reject) {
			resolve(null);
		}); // a SyncPromise which is resolved w/ null

	/*
	 * @see https://promisesaplus.com
	 *
	 * 2.3.3.3. If then is a function, call it with x as this, first argument resolvePromise, and
	 * second argument rejectPromise, where:
	 * 2.3.3.3.1. If/when resolvePromise is called with a value y, run [[Resolve]](promise, y).
	 * 2.3.3.3.2. If/when rejectPromise is called with a reason r, reject promise with r.
	 * 2.3.3.3.3. If both resolvePromise and rejectPromise are called, or multiple calls to the same
	 * argument are made, the first call takes precedence, and any further calls are ignored.
	 * 2.3.3.3.4. If calling then throws an exception e,
	 * 2.3.3.3.4.1. If resolvePromise or rejectPromise have been called, ignore it.
	 * 2.3.3.3.4.2. Otherwise, reject promise with e as the reason.
	 *
	 * @param {function} fnThen
	 *   The "then" function
	 * @param {function} resolve
	 *   The [[Resolve]](promise, .) function
	 * @param {function} reject
	 *   The "reject" function
	 */
	function call(fnThen, resolve, reject) {
		var bOnce;

		/*
		 * @param {any} [vReason]
		 *   The reason for rejection
		 */
		function rejectPromise(vReason) {
			if (!bOnce) {
				bOnce = true;
				reject(vReason);
			}
		}

		/*
		 * @param {any} [vResult]
		 *   The thenable to wrap or the result to synchronously fulfill with
		 */
		function resolvePromise(vResult) {
			if (!bOnce) {
				bOnce = true;
				resolve(vResult);
			}
		}

		try {
			fnThen(resolvePromise, rejectPromise);
		} catch (e) {
			rejectPromise(e);
		}
	}

	/**
	 * Tells whether the given value is a function or object with a "then" property. These are the
	 * candidates for "thenables".
	 *
	 * @param {any} vValue
	 *   Any value
	 * @returns {boolean}
	 *   See above
	 */
	function hasThen(vValue) {
		return vValue && (typeof vValue === "function" || typeof vValue === "object")
			&& "then" in vValue;
	}

	/**
	 * Constructor for a {@link sap.ui.base.SyncPromise} which may wrap a thenable (e.g. native
	 * <code>Promise</code>) in order to observe settlement and later provide synchronous access to
	 * the result.
	 *
	 * Implements https://promisesaplus.com except "2.2.4. onFulfilled or onRejected must not be
	 * called until the execution context stack contains only platform code."
	 *
	 * @param {function} fnExecutor
	 *   A function that is passed with the arguments resolve and reject...
	 *
	 * @alias sap.ui.base.SyncPromise
	 * @class
	 * @private
	 * @ui5-restricted sap.ui.core,sap.ui.dt,sap.ui.model
	 */
	function SyncPromise(fnExecutor) {
		var bCaught = false,
			iState, // undefined: pending, -1: rejected, 0: resolved but pending, 1: fulfilled
			fnReject,
			fnResolve,
			vResult,
			that = this;

		/*
		 * @param {any} [vReason]
		 *   The reason for rejection
		 */
		function reject(vReason) {
			vResult = vReason;
			iState = -1;

			if (!bCaught && SyncPromise.listener) {
				SyncPromise.listener(that, false);
			}

			if (fnReject) {
				fnReject(vReason);
				fnReject = fnResolve = null; // be nice to the garbage collector
			}
		}

		/*
		 * @param {any} [vResult0]
		 *   The thenable to wrap or the result to synchronously fulfill with
		 */
		function resolve(vResult0) {
			var fnThen;

			if (vResult0 === that) {
				reject(new TypeError("A promise cannot be resolved with itself."));
				return;
			}
			if (vResult0 instanceof SyncPromise) {
				if (vResult0.isFulfilled()) {
					resolve(vResult0.getResult());
					return;
				} else if (vResult0.isRejected()) {
					vResult0.caught(); // might have been uncaught so far
					reject(vResult0.getResult());
					return;
				} else {
					vResult0.caught(); // make sure it will never count as uncaught
					vResult0 = vResult0.getResult(); // unwrap to access native thenable
				}
			}

			iState = 0;
			vResult = vResult0;
			if (hasThen(vResult)) {
				try {
					fnThen = vResult.then;
				} catch (e) {
					// 2.3.3.2. If retrieving the property x.then results in a thrown exception e,
					// reject promise with e as the reason.
					reject(e);
					return;
				}
				if (typeof fnThen === "function") {
					call(fnThen.bind(vResult), resolve, reject);
					return;
				}
			}
			iState = 1;
			if (fnResolve) {
				fnResolve(vResult);
				fnReject = fnResolve = null; // be nice to the garbage collector
			}
		}

		/**
		 * Marks this {@link sap.ui.base.SyncPromise} as caught and informs the optional
		 * {@link sap.ui.base.SyncPromise.listener}. Basically, it has the same effect as
		 * {@link #catch}, but with less overhead. Use it together with {@link #isRejected} and
		 * {@link #getResult} in cases where the rejection is turned into <code>throw</code>; or
		 * simply use {@link #unwrap} instead.
		 */
		this.caught = function () {
			if (!bCaught) {
				bCaught = true; // MUST NOT become uncaught later on!
				if (SyncPromise.listener && this.isRejected()) {
					SyncPromise.listener(this, true);
				}
			}
		};

		/**
		 * Returns the current "result" of this {@link sap.ui.base.SyncPromise}.
		 *
		 * @returns {any}
		 *   The result in case this {@link sap.ui.base.SyncPromise} is already fulfilled, the
		 *   reason if it is already rejected, or the wrapped thenable if it is still pending
		 */
		this.getResult = function () {
			return vResult;
		};

		/**
		 * Tells whether this {@link sap.ui.base.SyncPromise} is fulfilled.
		 *
		 * @returns {boolean}
		 *   Whether this {@link sap.ui.base.SyncPromise} is fulfilled
		 */
		this.isFulfilled = function () {
			return iState === 1;
		};

		/**
		 * Tells whether this {@link sap.ui.base.SyncPromise} is still pending.
		 *
		 * @returns {boolean}
		 *   Whether this {@link sap.ui.base.SyncPromise} is still pending
		 */
		this.isPending = function () {
			return !iState;
		};

		/**
		 * Tells whether this {@link sap.ui.base.SyncPromise} is rejected.
		 *
		 * @returns {boolean}
		 *   Whether this {@link sap.ui.base.SyncPromise} is rejected
		 */
		this.isRejected = function () {
			return iState === -1;
		};

		call(fnExecutor, resolve, reject);

		if (iState === undefined) {
			// make sure we wrap a native Promise while pending
			vResult = new Promise(function (resolve, reject) {
				fnResolve = resolve;
				fnReject = reject;
			});
			vResult.catch(function () {}); // avoid "Uncaught (in promise)"
		}
	}

	/**
	 * Returns a {@link sap.ui.base.SyncPromise} and deals with rejected cases only. Same as
	 * <code>then(undefined, fnOnRejected)</code>.
	 *
	 * @param {function} [fnOnRejected]
	 *   Callback function if this {@link sap.ui.base.SyncPromise} is rejected
	 * @returns {sap.ui.base.SyncPromise}
	 *   A new {@link sap.ui.base.SyncPromise}, or <code>this</code> in case it is settled and no
	 *   corresponding callback function is given
	 *
	 * @see #then
	 */
	SyncPromise.prototype.catch = function (fnOnRejected) {
		return this.then(undefined, fnOnRejected);
	};

	/**
	 * Returns a {@link sap.ui.base.SyncPromise} and calls the given handler, like
	 * <code>Promise.prototype.finally</code>.
	 *
	 * @param {function} [fnOnFinally]
	 *   Callback function if this {@link sap.ui.base.SyncPromise} is settled
	 * @returns {sap.ui.base.SyncPromise}
	 *   A new {@link sap.ui.base.SyncPromise}, or <code>this</code> in case it is settled and no
	 *   callback function is given
	 *
	 * @see #then
	 */
	SyncPromise.prototype.finally = function (fnOnFinally) {
		if (typeof fnOnFinally === "function") {
			return this.then(function (vResult) {
				return SyncPromise.resolve(fnOnFinally()).then(function () {
					return vResult;
				}).unwrap(); // Note: avoids unnecessary micro task
			}, function (vReason) {
				return SyncPromise.resolve(fnOnFinally()).then(function () {
					throw vReason;
				}).unwrap(); // Note: avoids unnecessary micro task
			});
		}

		return this.then(fnOnFinally, fnOnFinally);
	};

	/**
	 * Returns a {@link sap.ui.base.SyncPromise} and calls the given handler as applicable, like
	 * <code>Promise.prototype.then</code>. This {@link sap.ui.base.SyncPromise} is marked as
	 * {@link #caught} unless <code>this</code> is returned. Note that a new
	 * {@link sap.ui.base.SyncPromise} returned from this method may already be rejected, but not
	 * yet caught.
	 *
	 * @param {function} [fnOnFulfilled]
	 *   Callback function if this {@link sap.ui.base.SyncPromise} is fulfilled
	 * @param {function} [fnOnRejected]
	 *   Callback function if this {@link sap.ui.base.SyncPromise} is rejected
	 * @returns {sap.ui.base.SyncPromise}
	 *   A new {@link sap.ui.base.SyncPromise}, or <code>this</code> in case it is settled and no
	 *   corresponding callback function is given
	 */
	SyncPromise.prototype.then = function (fnOnFulfilled, fnOnRejected) {
		var fnCallback = this.isFulfilled() ? fnOnFulfilled : fnOnRejected,
			bCallbackIsFunction = typeof fnCallback === "function",
			bPending = this.isPending(),
			that = this;

		if (bPending || bCallbackIsFunction) {
			this.caught();
		} // else: returns this

		if (!bPending) {
			return bCallbackIsFunction
				? new SyncPromise(function (resolve, reject) {
					resolve(fnCallback(that.getResult())); // Note: try/catch is present in c'tor!
				})
				: this;
		}
		return SyncPromise.resolve(this.getResult().then(fnOnFulfilled, fnOnRejected));
	};

	/**
	 * Returns a string representation of this {@link sap.ui.base.SyncPromise}. If it is resolved, a
	 * string representation of the result is returned; if it is rejected, a string representation
	 * of the reason is returned.
	 *
	 * @return {string} A string description of this {@link sap.ui.base.SyncPromise}
	 */
	SyncPromise.prototype.toString = function () {
		if (this.isPending()) {
			return "SyncPromise: pending";
		}
		return String(this.getResult());
	};

	/**
	 * Unwraps this {@link sap.ui.base.SyncPromise} by returning the current result if this promise
	 * is already fulfilled, returning the wrapped thenable if this promise is still pending, or
	 * throwing the reason if this promise is already rejected. This {@link sap.ui.base.SyncPromise}
	 * is marked as {@link #caught}.
	 *
	 * @returns {any|Promise}
	 *   The result in case this {@link sap.ui.base.SyncPromise} is already fulfilled, or the
	 *   wrapped thenable if this promise is still pending
	 * @throws {any}
	 *   The reason if this promise is already rejected
	 *
	 * @see #getResult
	 */
	SyncPromise.prototype.unwrap = function () {
		this.caught(); // make sure it will never count as uncaught
		if (this.isRejected()) {
			throw this.getResult();
		}
		return this.getResult();
	};

	/**
	 * Returns a new {@link sap.ui.base.SyncPromise} for the given array of values just like
	 * <code>Promise.all(aValues)</code>.
	 *
	 * @param {any[]} aValues
	 *   The values as an iterable object such as an <code>Array</code> or <code>String</code>
	 *   which is supported by <code>Array.prototype.slice</code>
	 * @returns {sap.ui.base.SyncPromise}
	 *   The {@link sap.ui.base.SyncPromise}
	 */
	SyncPromise.all = function (aValues) {
		return new SyncPromise(function (resolve, reject) {
			var bDone = false,
				iPending = 0; // number of pending promises

			function checkFulfilled() {
				if (bDone && iPending === 0) {
					resolve(aValues); // Note: 1st reject/resolve wins!
				}
			}

			aValues = Array.prototype.slice.call(aValues);
			aValues.forEach(function (vValue, i) {
				if (vValue !== aValues[i + 1] && hasThen(vValue)) { // do s.th. at end of run only
					iPending += 1;
					vValue.then(function (vResult0) {
						do {
							aValues[i] = vResult0;
							i -= 1;
						} while (i >= 0 && vValue === aValues[i]);
						iPending -= 1;
						checkFulfilled();
					}, function (vReason) {
						reject(vReason); // Note: 1st reject/resolve wins!
					});
				}
			});
			bDone = true;
			checkFulfilled();
		});
	};

	/**
	 * Tells whether the given value is a function or object with a "then" property which can be
	 * retrieved without an exception being thrown and which is a function.
	 *
	 * @param {any} vValue
	 *   Any value
	 * @returns {boolean}
	 *   See above
	 *
	 * @see step 2.3.3. of https://promisesaplus.com
	 */
	SyncPromise.isThenable = function (vValue) {
		try {
			return !!hasThen(vValue) && typeof vValue.then === "function";
		} catch (e) {
			// "2.3.3.2. If retrieving the property x.then results in a thrown exception e,..."
			// ...we should not call this a proper "thenable"
			return false;
		}
	};

	/**
	 * Optional listener function which is called with a {@link sap.ui.base.SyncPromise} instance
	 * and a boolean flag telling whether that instance became "caught" or not. An instance becomes
	 * "uncaught" as soon as it is rejected and not yet "caught". It becomes "caught" as soon as an
	 * "fnOnRejected" handler is given to {@link #then} for the first time.
	 *
	 * @abstract
	 * @function
	 * @name sap.ui.base.SyncPromise.listener
	 * @param {sap.ui.base.SyncPromise} oSyncPromise
	 *   A rejected {@link sap.ui.base.SyncPromise}
	 * @param {boolean} bCaught
	 *   <code>false</code> if the {@link sap.ui.base.SyncPromise} instance just became "uncaught",
	 *   <code>true</code> if it just became "caught"
	 */

	/**
	 * Returns a new {@link sap.ui.base.SyncPromise} that is rejected with the given reason.
	 *
	 * @param {any} [vReason]
	 *   The reason for rejection
	 * @returns {sap.ui.base.SyncPromise}
	 *   The {@link sap.ui.base.SyncPromise}
	 */
	SyncPromise.reject = function (vReason) {
		return new SyncPromise(function (resolve, reject) {
			reject(vReason);
		});
	};

	/**
	 * Returns <code>vResult</code> if it is already a {@link sap.ui.base.SyncPromise}, or a new
	 * {@link sap.ui.base.SyncPromise} wrapping the given thenable <code>vResult</code> or
	 * fulfilling with the given result. In case <code>vResult === undefined</code> or
	 * <code>vResult === null</code>, the same instance is reused to improve performance.
	 *
	 * @param {any} [vResult]
	 *   The thenable to wrap or the result to synchronously fulfill with
	 * @returns {sap.ui.base.SyncPromise}
	 *   The {@link sap.ui.base.SyncPromise}
	 */
	SyncPromise.resolve = function (vResult) {
		if (vResult === undefined) {
			return oResolved;
		}
		if (vResult === null) {
			return oResolvedNull;
		}
		if (vResult instanceof SyncPromise) {
			return vResult;
		}

		return new SyncPromise(function (resolve, reject) {
				resolve(vResult);
			});
	};

	return SyncPromise;
}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * Boot UI5
 *
 * @private
 * @ui5-restricted sap.ui.core
 */
sap.ui.predefine("sap/ui/core/boot", [
	"sap/base/Log",
	"sap/base/config/_Configuration",
	"sap/base/config/GlobalConfigurationProvider",
	"sap/base/util/Deferred",
	"sap/ui/core/boot/initDOM",
	"sap/ui/core/boot/loadManifest",
	"sap/ui/core/boot/onInit"
], function(
	Log,
	_Configuration,
	GlobalConfigurationProvider,
	Deferred,
	initDOM,
	loadManifest
	/* onInit --> register app resources early */
) {
	"use strict";

	// increase log level to ensure the warning will be locked
	var iLogLevel = Log.getLevel();
	Log.setLevel(Log.Level.WARNING);
	Log.warning("sap-ui-boot.js: This is a private module, its API must not be used in production and is subject to change!");
	// reset log level to old value
	Log.setLevel(iLogLevel);

	// ready state
	var bReady = false;
	var pReady = new Deferred();
	var oBootManifest;

	// create boot facade
	var boot = {
		/** Returns a Promise that resolves if the Core is initialized.
		 *
		 * @param {function():void} [fnReady] If the Core is ready the function will be called immediately, otherwise when the ready Promise resolves.
		 * @returns {Promise<undefined>} The ready promise
		 * @private
		 */
		ready: function(fnReady) {
			if (fnReady && bReady) {
				fnReady();
			} else {
				pReady.promise.then(fnReady);
			}
			return pReady.promise;
		}
	};

	// run initDOM for early paint
	var pInitDOM = initDOM.run(boot);

	// create writable config instance for preBoot tasks
	var config = _Configuration.getWritableBootInstance();
	// burn after reading
	delete _Configuration.getWritableBootInstance;

	//Helper for loading tasks from manifest
	function loadTasks(aTasks) {
		aTasks = aTasks || [];
		var pLoaded = new Promise(function(resolve, reject) {
			sap.ui.require(aTasks, function() {
				resolve(Array.from(arguments));
			},reject);
		});
		return pLoaded;
	}

	//Helper for executing boot tasks in correct order
	function executeTasks(aTasks, context) {
		return Promise.all(aTasks.map(function(task) {
			return task.run(context);
		}));
	}

	// bootstrap sequence
	// load manifest
	loadManifest().then(function(oManifest) {
		oBootManifest = oManifest;
		// load pre boot tasks
		return loadTasks(oBootManifest.preBoot);
	}).then(function(aTasks) {
		// execute pre boot tasks
		return executeTasks(aTasks, config);
	}).then(function() {
		GlobalConfigurationProvider.freeze();
		// load core boot tasks
		return loadTasks(oBootManifest.boot);
	}).then(function(aTasks) {
		// execute core boot tasks
		return executeTasks(aTasks, boot);
	}).then(function() {
		// load post boot tasks
		return loadTasks(oBootManifest.postBoot);
	}).then(function(aTasks) {
		// execute post boot tasks and weait for DOM ready
		return Promise.all([executeTasks(aTasks), pInitDOM]);
	}).then(function() {
		pReady.resolve();
		bReady = true;
	}).catch(pReady.reject);

	return boot;
}, true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * init DOM
 *
 * @private
 * @ui5-restricted sap.ui.core
 */
sap.ui.predefine("sap/ui/core/boot/initDOM", [
	"sap/base/Log",
	'sap/ui/Device',
	"sap/base/i18n/Localization",
	"sap/ui/dom/_ready"
], function(
	Log,
	Device,
	Localization,
	_ready
) {
	"use strict";

	/**
	 * Set the document's dir property
	 * @private
	 */
	function _setupContentDirection() {
		var sDir = Localization.getRTL() ? "rtl" : "ltr";
		document.documentElement.setAttribute("dir", sDir); // webkit does not allow setting document.dir before the body exists
		Log.info("Content direction set to '" + sDir + "'", null, "sap.ui.core.boot");
	}
	/**
	 * Set the body's browser-related attributes.
	 * @private
	 */
	function _setupBrowser() {
		//set the browser for CSS attribute selectors. do not move this to the onload function because Safari does not
		//use the classes
		var html = document.documentElement;
		var b = Device.browser;
		var id = b.name;
		if (id) {
			if (id === b.BROWSER.SAFARI && b.mobile) {
				id = "m" + id;
			}
			id = id + (b.version === -1 ? "" : Math.floor(b.version));
			html.dataset.sapUiBrowser = id;
			Log.debug("Browser-Id: " + id, null, "sap.ui.core.boot");
		}
	}
	/**
	 * Set the body's OS-related attribute and CSS class
	 * @private
	 */
	function _setupOS() {
		var html = document.documentElement;
		html.dataset.sapUiOs = Device.os.name + Device.os.versionStr;
		var osCSS = null;
		if (Device.os.name === Device.os.OS.IOS) {
			osCSS = "sap-ios";
		} else if (Device.os.name === Device.os.OS.ANDROID) {
			osCSS = "sap-android";
		}
		if (osCSS) {
			html.classList.add(osCSS);
		}
	}
	/**
	 * Paint splash
	 * @param {sap.ui.core.boot} boot The boot facade
	 * @private
	 */
	function _splash(boot) {
		var splash = document.createElement("div");
        splash.textContent = "bootstrapping UI5...";
        splash.style.color = "transparent";
        document.body.append(splash);
		boot.ready().then(function() {
			document.body.removeChild(splash);
		});
	}
	// adapt DOM when ready
	return {
		run: function(boot) {
			return _ready().then(function() {
				_setupContentDirection();
				_setupBrowser();
				_setupOS();
				_splash(boot);
			});
		}
	};
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * Load configured calendar
 *
 * @private
 * @ui5-restricted sap.ui.core
 */
sap.ui.predefine("sap/ui/core/boot/loadCalendar", [
	"sap/base/config",
	"sap/base/i18n/Localization",
	"sap/base/util/LoaderExtensions"
], function(
	config,
	Localization,
	LoaderExtensions
) {
	"use strict";


	// load calendar
	var pCalendarpBoot = new Promise(function(res, rej) {
		sap.ui.require(["sap/ui/core/date/" + config.get({name:"sapUiCalendarType", type:"string", defaultValue:"Gregorian"})], function(Calendar) {
			res(Calendar);
		}, rej);
	});
	// load cldr
	var pLocaleData = new Promise(function(res, rej) {
		var sLanguage = Localization.getLanguageTag().language;
		LoaderExtensions.loadResource("sap/ui/core/cldr/" + sLanguage + ".json", {
			async: true,
			dataType: "text"
		}).then(function(sCldr) {
			var mPreload = {};
			mPreload["sap/ui/core/cldr/" + sLanguage + ".json"] = sCldr;
			sap.ui.require.preload(mPreload);
			res();
		});
	});

	return {
		run: function() {
			return Promise.all([pCalendarpBoot, pLocaleData]);
		}
	};
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * Load boot manifest chain
 *
 * @private
 * @ui5-restricted sap.ui.core
 */
sap.ui.predefine("sap/ui/core/boot/loadManifest", [
	"sap/base/config",
	"sap/base/util/LoaderExtensions"
], function(
	config,
	LoaderExtensions
) {
	"use strict";

	function mergeManifest(oParentManifest, oChildManifest) {
		var oMergedManifest = Object.assign({}, oParentManifest);
		delete oChildManifest.boot;
		oMergedManifest.preBoot = oMergedManifest.preBoot ? oMergedManifest.preBoot : [];
		oMergedManifest.preBoot = oMergedManifest.preBoot.concat(oChildManifest.preBoot || []);
		oChildManifest.postBoot = oChildManifest.postBoot ? oChildManifest.postBoot : [];
		oMergedManifest.postBoot = oChildManifest.postBoot.concat(oMergedManifest.postBoot || []);
		return oMergedManifest;
	}

	function _loadManifest(sManifest) {
		var pManifest = LoaderExtensions.loadResource(sManifest, {async: true})
			.then(function(oManifest){
				if (oManifest.extends) {
					return _loadManifest(oManifest.extends)
						.then(function(oParentManifest) {
							return mergeManifest(oParentManifest, oManifest);
						});
				}
				return oManifest;
			});
		return pManifest;
	}

	function loadManifest() {
		var sBootManifest = config.get({
			name: "sapUiBootManifest",
			type: config.Type.String
		});
		return _loadManifest(sBootManifest);
	}

	return loadManifest;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * Load configured modules
 *
 * @private
 * @ui5-restricted sap.ui.core
 */
sap.ui.predefine("sap/ui/core/boot/loadModules", [
	"sap/base/config"
], function(
	config
) {
	"use strict";
	var pLoadModules = Promise.resolve();
	var pLoadLibraries = Promise.resolve();
	var aModulesLoaded = [];

	var aModules = config.get({
		name: "sapUiModules",
		type: config.Type.StringArray
	});

	var aLibs = config.get({
		name: "sapUiLibs",
		type: config.Type.StringArray
	});

	// load libraries
	if (aLibs.length  > 0) {
		pLoadLibraries = new Promise(function(resolve, reject) {
			sap.ui.require(["sap/ui/core/Lib"], function(Library) {
				resolve(Library);
			}, reject);
		}).then(function(Library) {
			var aLibsLoaded = [];
			aLibs.forEach(function(lib){
				aLibsLoaded.push(
					Library.load({
						name: lib
					})
				);
			});
			return Promise.all(aLibsLoaded);
		});
	}

	// load  eventing in parallel an execute it so it is available for later usages
	aModulesLoaded.push(new Promise(function(resolve, reject) {
		sap.ui.require(["sap/ui/events/jquery/EventSimulation"],function() {
			resolve();
		});
	}));

	// load other modules
	if (aModules.length > 0) {
		aModules.forEach(function(module) {
			var aMatch = /^\[([^\[\]]+)?\]$/.exec(module);
			aModulesLoaded.push(
				new Promise(function(resolve, reject) {
					sap.ui.require([aMatch && aMatch[1] || module], function() {
						resolve();
					}, aMatch ? resolve : reject);
				})
			);
		});
	}

	pLoadModules =  Promise.all(aModulesLoaded);

	return {
		run: function() {
			return Promise.all([pLoadModules, pLoadLibraries]);
		}
	};
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

sap.ui.predefine("sap/ui/core/boot/onInit", [
	"sap/base/config"
], function(
	config
) {
	"use strict";

	var aParts;
	var sInitModule = config.get({
		name: "sapUiOnInit",
		type: config.Type.String
	});

	if (sInitModule) {
		aParts = sInitModule.split("@");
		if (aParts.length > 1) {
			var mPaths = {};
			var sModulePath = /^.*[\/\\]/.exec(aParts[0])[0];
			sModulePath = sModulePath.substr(0, sModulePath.length - 1);
			mPaths[sModulePath] = aParts[1];
			sap.ui.loader.config({
				paths: mPaths
			});
		}
	}

	return {
		run: function() {
			var pOnInit = Promise.resolve();
			if (sInitModule) {
				pOnInit = new Promise(function(resolve, reject) {
					sap.ui.require([aParts[0]], resolve, reject);
				});
			}
			return pOnInit;
		}
	};
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/dom/_ready", ["sap/ui/base/SyncPromise"], function(SyncPromise) {
	"use strict";

	/**
	 * Convenience function for dom-ready.
	 * Returns (Sync)Promise which resolves when DOM content has been loaded.
	 *
	 * @param  {boolean} bSync Whether handler should be executed synchronously or not.
	 * @return {Promise|sap.ui.base.SyncPromise} Returns Promise or SyncPromise resolving when DOM is ready.
	 *
	 * @private
	 * @ui5-restricted sap.ui.core
	 */
	return function() {
		// In case the DOMContentLoaded was already fired,
		// the ready handler needs to be executed directly.
		return new SyncPromise(function(resolve, reject) {
			if (document.readyState !== "loading") {
				resolve();
			} else {
				var fnDomReady = function(res) {
					document.removeEventListener("DOMContentLoaded", fnDomReady);
					resolve();
				};
				document.addEventListener("DOMContentLoaded", fnDomReady);
			}
		});
	};
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.predefine("sap/ui/util/XMLHelper", ['sap/ui/Device'], function(Device) {
	"use strict";

	/**
	 * Provides functionality for parsing XML formatted strings and serializing XML documents.
	 *
	 * @namespace
	 * @since 1.58
	 * @alias module:sap/ui/util/XMLHelper
	 * @public
	 */
	var Helper = {};

	/**
	 * Parses the specified XML string into an XML document, using the native parsing functionality of the
	 * browser. If an error occurs during parsing, a {@link module:sap/base/util/XMLHelper.XMLParseErrorInfo
	 * parse error info object} is attached as the <code>parseError</code> property of the returned document.
	 *
	 * @param {string} sXMLText An XML string
	 * @returns {XMLDocument} the parsed XML document with a <code>parseError</code> property as described in
	 *          {@link #getParseError}. An error occurred if the <code>errorCode</code> property of the
	 *          <code>parseError</code> is not 0.
	 * @public
	 * @static
	 */
	Helper.parse = function (sXMLText) {
		var oXMLDocument;
		var oParseError;
		var DomHelper = new DOMParser();

		oXMLDocument = DomHelper.parseFromString(sXMLText, "application/xml");

		oParseError = Helper.getParseError(oXMLDocument);
		if (oParseError) {
			if (!oXMLDocument.parseError) {
				oXMLDocument.parseError = oParseError;
			}
		}

		return oXMLDocument;
	};

	/**
	 * Error information as provided by the <code>DOMParser</code>.
	 *
	 * Note that the set of properties with meaningful content differs between browsers.
	 *
	 * @typedef {object} module:sap/base/util/XMLHelper.XMLParseErrorInfo
	 * @property {int} [errorCode=-1]
	 * @property {sap.ui.core.URI} [url=""]
	 * @property {string} [reason="unknown error"]
	 * @property {string} [srcText=""]
	 * @property {int} [line=-1]
	 * @property {int} [linepos=-1]
	 * @property {int} [filepos=-1]
	 * @property {"error"|"warning"} [type="error"]
	 * @public
	 */

	/**
	 * Extracts parse error information from the specified document (if any).
	 *
	 * If an error was found, the returned object contains a browser-specific subset of
	 * the properties described in {@link module:sap/base/util/XMLHelper.XMLParseErrorInfo XMLParseErrorInfo}.
	 * Otherwise, it just contains an <code>errorCode</code> property with value 0.
	 *
	 * @param {XMLDocument} oDocument
	 *    The parsed XML document
	 * @returns {module:sap/base/util/XMLHelper.XMLParseErrorInfo}
	 *    A browser-specific error info object if errors were found, or an object with an <code>errorCode<code> of 0 only
	 * @public
	 * @static
	 */
	Helper.getParseError = function(oDocument) {
		var oParseError = {
			errorCode : -1,
			url : "",
			reason : "unknown error",
			srcText : "",
			line : -1,
			linepos : -1,
			filepos : -1,
			type : "error"
		};

		// Firefox
		if (Device.browser.firefox && oDocument && oDocument.documentElement
			&& oDocument.documentElement.tagName == "parsererror") {

			var sErrorText = oDocument.documentElement.firstChild.nodeValue,
				rParserError = /XML Parsing Error: (.*)\nLocation: (.*)\nLine Number (\d+), Column (\d+):(.*)/,
				oMatch = rParserError.exec(sErrorText);

			if (oMatch) {
				oParseError.reason = oMatch[1];
				oParseError.url = oMatch[2];
				oParseError.line = parseInt(oMatch[3]);
				oParseError.linepos = parseInt(oMatch[4]);
				oParseError.srcText = oMatch[5];
				oParseError.type = "error";

			}
			return oParseError;
		}

		// Safari or Chrome
		if (Device.browser.webkit && oDocument && oDocument.documentElement
			&& oDocument.getElementsByTagName("parsererror").length > 0) {

			var sErrorText = Helper.serialize(oDocument),
				rParserError = /(error|warning) on line (\d+) at column (\d+): ([^<]*)\n/,
				oMatch = rParserError.exec(sErrorText);

			if (oMatch) {
				oParseError.reason = oMatch[4];
				oParseError.url = "";
				oParseError.line = parseInt(oMatch[2]);
				oParseError.linepos = parseInt(oMatch[3]);
				oParseError.srcText = "";
				oParseError.type = oMatch[1];

			}
			return oParseError;
		}

		if (!oDocument || !oDocument.documentElement) {
			return oParseError;
		}

		return	{
			errorCode : 0
		};
	};

	/**
	 * Serializes the specified DOM tree into a string representation.
	 *
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLSerializer/serializeToString}
	 * @param {Node|Attr} oXMLDocument the XML document object to be serialized as string
	 * @returns {string} the serialized XML string
	 * @public
	 * @static
	 */
	Helper.serialize = function(oXMLDocument) {
		var oSerializer = new XMLSerializer();
		return oSerializer.serializeToString(oXMLDocument);
	};

	return Helper;
});
sap.ui.require.preload({
	"sap/ui/Device.js":function(){
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * Device and Feature Detection API: Provides information about the used browser / device and cross platform support for certain events
 * like media queries, orientation change or resizing.
 *
 * This API is independent from any other part of the UI5 framework. This allows it to be loaded beforehand, if it is needed, to create the UI5 bootstrap
 * dynamically depending on the capabilities of the browser or device.
 *
 * @version 1.125.0
 * @namespace
 * @name sap.ui.Device
 * @public
 */

/*global console */

//Introduce namespace if it does not yet exist
if (typeof window.sap !== "object" && typeof window.sap !== "function") {
	window.sap = {};
}
if (typeof window.sap.ui !== "object") {
	window.sap.ui = {};
}

(function() {
	"use strict";

	//Skip initialization if API is already available
	if (typeof window.sap.ui.Device === "object" || typeof window.sap.ui.Device === "function") {
		var apiVersion = "1.125.0";
		window.sap.ui.Device._checkAPIVersion(apiVersion);
		return;
	}

	var Device = {};

	////-------------------------- Logging -------------------------------------
	/* since we cannot use the logging from sap/base/Log.js, we need to come up with a separate
	 * solution for the device API
	 */

	var FATAL = 0,
		ERROR = 1,
		WARNING = 2,
		INFO = 3,
		DEBUG = 4,
		TRACE = 5;

	var DeviceLogger = function() {
		// helper function for date formatting
		function pad0(i, w) {
			return ("000" + String(i)).slice(-w);
		}
		this.defaultComponent = 'DEVICE';
		this.sWindowName = (window.top == window) ? "" : "[" + window.location.pathname.split('/').slice(-1)[0] + "] ";
		// Creates a new log entry depending on its level and component.
		this.log = function(iLevel, sMessage, sComponent) {
			sComponent = sComponent || this.defaultComponent || '';
			var oNow = new Date(),
				oLogEntry = {
					time: pad0(oNow.getHours(), 2) + ":" + pad0(oNow.getMinutes(), 2) + ":" + pad0(oNow.getSeconds(), 2),
					date: pad0(oNow.getFullYear(), 4) + "-" + pad0(oNow.getMonth() + 1, 2) + "-" + pad0(oNow.getDate(), 2),
					timestamp: oNow.getTime(),
					level: iLevel,
					message: sMessage || "",
					component: sComponent || ""
				};
			/*eslint-disable no-console */
			if (window.console) { // in FF, console might not exist; it might even disappear
				var logText = oLogEntry.date + " " + oLogEntry.time + " " + this.sWindowName + oLogEntry.message + " - " + oLogEntry.component;
				switch (iLevel) {
					case FATAL:
					case ERROR:
						console.error(logText);
						break;
					case WARNING:
						console.warn(logText);
						break;
					case INFO:
						console.info ? console.info(logText) : console.log(logText);
						break; // info not available in iOS simulator
					case DEBUG:
						console.debug(logText);
						break;
					case TRACE:
						console.trace(logText);
						break;
				}
			}
			/*eslint-enable no-console */
			return oLogEntry;
		};
	};
	// instantiate new logger
	var oLogger = new DeviceLogger();
	oLogger.log(INFO, "Device API logging initialized");


	//******** Version Check ********

	//Only used internal to make clear when Device API is loaded in wrong version
	Device._checkAPIVersion = function(sVersion) {
		var v = "1.125.0";
		if (v != sVersion) {
			oLogger.log(WARNING, "Device API version differs: " + v + " <-> " + sVersion);
		}
	};


	//******** Event Management ******** (see Event Provider)

	var mEventRegistry = {};

	function attachEvent(sEventId, fnFunction, oListener) {
		if (!mEventRegistry[sEventId]) {
			mEventRegistry[sEventId] = [];
		}
		mEventRegistry[sEventId].push({
			oListener: oListener,
			fFunction: fnFunction
		});
	}

	function detachEvent(sEventId, fnFunction, oListener) {
		var aEventListeners = mEventRegistry[sEventId];

		if (!aEventListeners) {
			return this;
		}

		for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
			if (aEventListeners[i].fFunction === fnFunction && aEventListeners[i].oListener === oListener) {
				aEventListeners.splice(i, 1);
				break;
			}
		}
		if (aEventListeners.length == 0) {
			delete mEventRegistry[sEventId];
		}
	}

	function fireEvent(sEventId, mParameters) {
		var aEventListeners = mEventRegistry[sEventId];
		var oInfo;
		if (aEventListeners) {
			aEventListeners = aEventListeners.slice();
			for (var i = 0, iL = aEventListeners.length; i < iL; i++) {
				oInfo = aEventListeners[i];
				oInfo.fFunction.call(oInfo.oListener || window, mParameters);
			}
		}
	}

	var oReducedNavigator;
	var setDefaultNavigator = function () {
		oReducedNavigator = {
			userAgent: window.navigator.userAgent,
			platform: window.navigator.platform
		};
		// Only add property standalone in case navigator has this property
		if (window.navigator.hasOwnProperty("standalone")) {
			oReducedNavigator.standalone = window.navigator.standalone;
		}
	};
	setDefaultNavigator();
	//******** OS Detection ********

	/**
	 * Contains information about the operating system of the Device.
	 *
	 * @namespace
	 * @name sap.ui.Device.os
	 * @public
	 */
	/**
	 * Enumeration containing the names of known operating systems.
	 *
	 * @namespace
	 * @name sap.ui.Device.os.OS
	 * @public
	 */
	/**
	 * The name of the operating system.
	 *
	 * @see sap.ui.Device.os.OS
	 * @name sap.ui.Device.os.name
	 * @type string
	 * @public
	 */
	/**
	 * The version of the operating system as <code>string</code>.
	 *
	 * Might be empty if no version can reliably be determined.
	 *
	 * @name sap.ui.Device.os.versionStr
	 * @type string
	 * @public
	 */
	/**
	 * The version of the operating system as <code>float</code>.
	 *
	 * Might be <code>-1</code> if no version can reliably be determined.
	 *
	 * @name sap.ui.Device.os.version
	 * @type float
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, a Windows operating system is used.
	 *
	 * @name sap.ui.Device.os.windows
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, a Linux operating system is used.
	 *
	 * @name sap.ui.Device.os.linux
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, a Mac operating system is used.
	 *
	 * <b>Note:</b> An iPad using Safari browser, which is requesting desktop sites, is also recognized as Macintosh.
	 *
	 * @name sap.ui.Device.os.macintosh
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, an iOS operating system is used.
	 *
	 * @name sap.ui.Device.os.ios
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, an Android operating system is used.
	 *
	 * @name sap.ui.Device.os.android
	 * @type boolean
	 * @public
	 */
	/**
	 * Windows operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.WINDOWS
	 * @public
	 */
	/**
	 * MAC operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.MACINTOSH
	 * @public
	 */
	/**
	 * Linux operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.LINUX
	 * @public
	 */
	/**
	 * iOS operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.IOS
	 * @public
	 */
	/**
	 * Android operating system name.
	 *
	 * @see sap.ui.Device.os.name
	 * @name sap.ui.Device.os.OS.ANDROID
	 * @public
	 */

	var OS = {
		"WINDOWS": "win",
		"MACINTOSH": "mac",
		"LINUX": "linux",
		"IOS": "iOS",
		"ANDROID": "Android"
	};

	function getOS() { // may return null!!

		var userAgent = oReducedNavigator.userAgent;

		var rPlatform, // regular expression for platform
			aMatches;

		function getDesktopOS() {
			var sPlatform = oReducedNavigator.platform;
			if (sPlatform.indexOf("Win") != -1) {
				// userAgent in windows 7 contains: windows NT 6.1
				// userAgent in windows 8 contains: windows NT 6.2 or higher
				// userAgent since windows 10: Windows NT 10[...]
				var rVersion = /Windows NT (\d+).(\d)/i;
				var uaResult = userAgent.match(rVersion);
				var sVersionStr = "";
				// Using Lighthouse tool within chrome on windows does not provide a valid userAgent
				// navigator.platform is 'Win' but navigator.userAgent indicates macOS
				if (uaResult) {
					if (uaResult[1] == "6") {
						if (uaResult[2] == 1) {
							sVersionStr = "7";
						} else if (uaResult[2] > 1) {
							sVersionStr = "8";
						}
					} else {
						sVersionStr = uaResult[1];
					}
				}
				return {
					"name": OS.WINDOWS,
					"versionStr": sVersionStr
				};
			} else if (sPlatform.indexOf("Mac") != -1) {
				return {
					"name": OS.MACINTOSH,
					"versionStr": ""
				};
			} else if (sPlatform.indexOf("Linux") != -1) {
				return {
					"name": OS.LINUX,
					"versionStr": ""
				};
			}
			oLogger.log(INFO, "OS detection returned no result");
			return null;
		}

		rPlatform = /\(([a-zA-Z ]+);\s(?:[U]?[;]?)([\D]+)((?:[\d._]*))(?:.*[\)][^\d]*)([\d.]*)\s/;
		aMatches = userAgent.match(rPlatform);
		if (aMatches) {
			var rAppleDevices = /iPhone|iPad|iPod/;
			if (aMatches[0].match(rAppleDevices)) {
				aMatches[3] = aMatches[3].replace(/_/g, ".");
				//result[1] contains info of devices
				return ({
					"name": OS.IOS,
					"versionStr": aMatches[3]
				});
			} else if (aMatches[2].match(/Android/)) {
				aMatches[2] = aMatches[2].replace(/\s/g, "");
				return ({
					"name": OS.ANDROID,
					"versionStr": aMatches[3]
				});
			}
		}

		//Firefox on Android
		rPlatform = /\((Android)[\s]?([\d][.\d]*)?;.*Firefox\/[\d][.\d]*/;
		aMatches = userAgent.match(rPlatform);
		if (aMatches) {
			return ({
				"name": OS.ANDROID,
				"versionStr": aMatches.length == 3 ? aMatches[2] : ""
			});
		}

		// Desktop
		return getDesktopOS();
	}

	function setOS() {
		Device.os = getOS() || {};
		Device.os.OS = OS;
		Device.os.version = Device.os.versionStr ? parseFloat(Device.os.versionStr) : -1;

		if (Device.os.name) {
			for (var name in OS) {
				if (OS[name] === Device.os.name) {
					Device.os[name.toLowerCase()] = true;
				}
			}
		}
	}
	setOS();



	//******** Browser Detection ********

	/**
	 * Contains information about the used browser.
	 *
	 * @namespace
	 * @name sap.ui.Device.browser
	 * @public
	 */

	/**
	 * Enumeration containing the names of known browsers.
	 *
	 * @namespace
	 * @name sap.ui.Device.browser.BROWSER
	 * @public
	 */

	/**
	 * The name of the browser.
	 *
	 * @see sap.ui.Device.browser.BROWSER
	 * @name sap.ui.Device.browser.name
	 * @type string
	 * @public
	 */
	/**
	 * The version of the browser as <code>string</code>.
	 *
	 * Might be empty if no version can be determined.
	 *
	 * @name sap.ui.Device.browser.versionStr
	 * @type string
	 * @public
	 */
	/**
	 * The version of the browser as <code>float</code>.
	 *
	 * Might be <code>-1</code> if no version can be determined.
	 *
	 * @name sap.ui.Device.browser.version
	 * @type float
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the mobile variant of the browser is used or
	 * a tablet or phone device is detected.
	 *
	 * <b>Note:</b> This information might not be available for all browsers.
	 * <b>Note:</b> The flag is also set to <code>true</code> for any touch device,
	 * including laptops with touchscreen monitor.
	 * For more information, see the documentation for {@link sap.ui.Device.system.combi} devices.
	 *
	 * @name sap.ui.Device.browser.mobile
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the Mozilla Firefox browser is used.
	 *
	 * @name sap.ui.Device.browser.firefox
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, a browser that is based on the Chromium browser
	 * project is used, such as the Google Chrome browser or the Microsoft Edge (Chromium) browser.
	 *
	 * @name sap.ui.Device.browser.chrome
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the Apple Safari browser is used.
	 *
	 * <b>Note:</b>
	 * This flag is also <code>true</code> when the standalone (fullscreen) mode or webview is used on iOS devices.
	 * Please also note the flags {@link sap.ui.Device.browser.fullscreen} and {@link sap.ui.Device.browser.webview}.
	 *
	 * @name sap.ui.Device.browser.safari
	 * @type boolean
	 * @public
	 */

	/**
	 * If this flag is set to <code>true</code>, a browser featuring a Webkit engine is used.
	 *
	 * <b>Note:</b>
	 * This flag is also <code>true</code> when the used browser was based on the Webkit engine, but
	 * uses another rendering engine in the meantime. For example the Chrome browser started from version 28 and above
	 * uses the Blink rendering engine.
	 *
	 * @name sap.ui.Device.browser.webkit
	 * @type boolean
	 * @since 1.20.0
	 * @public
	 */

	/**
	 * If this flag is set to <code>true</code>, a browser featuring a Blink rendering engine is used.
	 *
	 * @name sap.ui.Device.browser.blink
	 * @type boolean
	 * @since 1.56.0
	 * @public
	 */

	/**
	 * If this flag is set to <code>true</code>, the Safari browser runs in standalone fullscreen mode on iOS.
	 *
	 * <b>Note:</b> This flag is only available if the Safari browser was detected. There might be slight
	 * differences in behavior and detection, e.g. regarding the availability of {@link sap.ui.Device.browser.version}.
	 *
	 * @name sap.ui.Device.browser.fullscreen
	 * @type boolean
	 * @since 1.31.0
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the Safari browser runs in webview mode on iOS.
	 *
	 * <b>Note:</b> Since iOS 11 it is no longer reliably possible to detect whether an application runs in <code>webview</code>.
	 * The flag is <code>true</code> if the browser's user agent contains 'SAPFioriClient'. Applications
	 * using WKWebView have the possibility to customize the user agent, and to explicitly add this information.
	 *
	 * @name sap.ui.Device.browser.webview
	 * @deprecated as of version 1.98.
	 * @type boolean
	 * @since 1.31.0
	 * @public
	 */
	/**
	 * The version of the used Webkit engine, if available.
	 *
	 * @see sap.ui.Device.browser.webkit
	 * @name sap.ui.Device.browser.webkitVersion
	 * @type string
	 * @since 1.20.0
	 * @private
	 */
	/**
	 * If this flag is set to <code>true</code>, a browser featuring a Mozilla engine is used.
	 *
	 * @name sap.ui.Device.browser.mozilla
	 * @type boolean
	 * @since 1.20.0
	 * @public
	 */
	/**
	 * Firefox browser name.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.FIREFOX
	 * @public
	 */
	/**
	 * Chrome browser name, used for Google Chrome browser and Microsoft Edge (Chromium) browser.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.CHROME
	 * @public
	 */
	/**
	 * Safari browser name.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.SAFARI
	 * @public
	 */
	/**
	 * Android stock browser name.
	 *
	 * @see sap.ui.Device.browser.name
	 * @name sap.ui.Device.browser.BROWSER.ANDROID
	 * @public
	 */

	var BROWSER = {
		"FIREFOX": "ff",
		"CHROME": "cr",
		"SAFARI": "sf",
		"ANDROID": "an"
	};

	function getBrowser() {
		var sUserAgent = oReducedNavigator.userAgent,
			sLowerCaseUserAgent = sUserAgent.toLowerCase();

		/*!
		 * Taken from jQuery JavaScript Library v1.7.1
		 * http://jquery.com/
		 *
		 * Copyright 2011, John Resig
		 * Dual licensed under the MIT or GPL Version 2 licenses.
		 * http://jquery.org/license
		 *
		 * Includes Sizzle.js
		 * http://sizzlejs.com/
		 * Copyright 2011, The Dojo Foundation
		 * Released under the MIT, BSD, and GPL Licenses.
		 *
		 * Date: Mon Nov 21 21:11:03 2011 -0500
		 */
		function calcBrowser() {
			var rwebkit = /(webkit)[ \/]([\w.]+)/;
			var rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;

			var browserMatch = rwebkit.exec(sLowerCaseUserAgent) ||
				sLowerCaseUserAgent.indexOf("compatible") < 0 && rmozilla.exec(sLowerCaseUserAgent) || [];

			var oRes = {
				browser: browserMatch[1] || "",
				version: browserMatch[2] || "0"
			};
			oRes[oRes.browser] = true;
			return oRes;
		}

		var oBrowser = calcBrowser();

		// jQuery checks for user agent strings. We differentiate between browsers
		var oExpMobile;
		var oResult;
		var fVersion;
		if (oBrowser.mozilla) {
			oExpMobile = /Mobile/;
			if (sUserAgent.match(/Firefox\/(\d+\.\d+)/)) {
				fVersion = parseFloat(RegExp.$1);
				oResult = {
					name: BROWSER.FIREFOX,
					versionStr: "" + fVersion,
					version: fVersion,
					mozilla: true,
					mobile: oExpMobile.test(sUserAgent)
				};
			} else {
				// unknown mozilla browser
				oResult = {
					mobile: oExpMobile.test(sUserAgent),
					mozilla: true,
					version: -1
				};
			}
		} else if (oBrowser.webkit) {
			// webkit version is needed for calculation if the mobile android device is a tablet (calculation of other mobile devices work without)
			var regExpWebkitVersion = sLowerCaseUserAgent.match(/webkit[\/]([\d.]+)/);
			var webkitVersion;
			if (regExpWebkitVersion) {
				webkitVersion = regExpWebkitVersion[1];
			}
			oExpMobile = /Mobile/;
			var aChromeMatch = sUserAgent.match(/(Chrome|CriOS)\/(\d+\.\d+).\d+/);
			var aFirefoxMatch = sUserAgent.match(/FxiOS\/(\d+\.\d+)/);
			var aAndroidMatch = sUserAgent.match(/Android .+ Version\/(\d+\.\d+)/);

			if (aChromeMatch || aFirefoxMatch || aAndroidMatch) {
				var sName, sVersion, bMobile;
				if (aChromeMatch) {
					sName = BROWSER.CHROME;
					bMobile = oExpMobile.test(sUserAgent);
					sVersion = parseFloat(aChromeMatch[2]);
				} else if (aFirefoxMatch) {
					sName = BROWSER.FIREFOX;
					bMobile = true;
					sVersion = parseFloat(aFirefoxMatch[1]);
				} else if (aAndroidMatch) {
					sName = BROWSER.ANDROID;
					bMobile = oExpMobile.test(sUserAgent);
					sVersion = parseFloat(aAndroidMatch[1]);
				}

				oResult = {
					name: sName,
					mobile: bMobile,
					versionStr: "" + sVersion,
					version: sVersion,
					webkit: true,
					webkitVersion: webkitVersion
				};
			} else { // Safari might have an issue with sUserAgent.match(...); thus changing
				var oExp = /Version\/(\d+\.\d+).*Safari/;
				if (oExp.test(sUserAgent) || /iPhone|iPad|iPod/.test(sUserAgent)) {
					var bStandalone = oReducedNavigator.standalone;
					oResult =  {
						name: BROWSER.SAFARI,
						fullscreen: bStandalone === undefined ? false : bStandalone,
						/**
						 * @deprecated as of version 1.98
						 */
						webview: /SAPFioriClient/.test(sUserAgent),
						mobile: oExpMobile.test(sUserAgent),
						webkit: true,
						webkitVersion: webkitVersion
					};
					var aParts = oExp.exec(sUserAgent);
					if (aParts) {
						fVersion = parseFloat(aParts[1]);
						oResult.versionStr = "" + fVersion;
						oResult.version = fVersion;
					} else {
						oResult.version = -1;
					}
				} else { // other webkit based browser
					oResult = {
						mobile: oExpMobile.test(sUserAgent),
						webkit: true,
						webkitVersion: webkitVersion,
						version: -1
					};
				}
			}
		} else {
			oResult = {
				name: "",
				versionStr: "",
				version: -1,
				mobile: false
			};
		}

		// Check for Blink rendering engine (https://stackoverflow.com/questions/20655470/how-to-detect-blink-in-chrome)
		if ((oBrowser.chrome || window.Intl && window.Intl.v8BreakIterator) && 'CSS' in window) {
			oResult.blink = true;
		}

		return oResult;
	}

	function setBrowser() {
		Device.browser = getBrowser();
		Device.browser.BROWSER = BROWSER;

		if (Device.browser.name) {
			for (var b in BROWSER) {
				if (BROWSER[b] === Device.browser.name) {
					Device.browser[b.toLowerCase()] = true;
				}
			}
		}
	}
	setBrowser();




	//******** Support Detection ********

	/**
	 * Contains information about detected capabilities of the used browser or Device.
	 *
	 * @namespace
	 * @name sap.ui.Device.support
	 * @public
	 */

	/**
	 * If this flag is set to <code>true</code>, the used browser supports touch events.
	 *
	 * <b>Note:</b> This flag indicates whether the used browser supports touch events or not.
	 * This does not necessarily mean that the used device has a touchable screen.
	 * <b>Note:</b> This flag also affects other {@link sap.ui.Device} properties.
	 * For more information, see the documentation for {@link sap.ui.Device.browser.mobile} and
	 * {@link sap.ui.Device.system.combi} devices.
	 *
	 * @name sap.ui.Device.support.touch
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser supports pointer events.
	 *
	 * @name sap.ui.Device.support.pointer
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser natively supports media queries via JavaScript.
	 *
	 * <b>Note:</b> The {@link sap.ui.Device.media media queries API} of the device API can also be used when there is no native support.
	 *
	 * @name sap.ui.Device.support.matchmedia
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser natively supports events of media queries via JavaScript.
	 *
	 * <b>Note:</b> The {@link sap.ui.Device.media media queries API} of the device API can also be used when there is no native support.
	 *
	 * @name sap.ui.Device.support.matchmedialistener
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser natively supports the <code>orientationchange</code> event.
	 *
	 * <b>Note:</b> The {@link sap.ui.Device.orientation orientation event} of the device API can also be used when there is no native support.
	 *
	 * @name sap.ui.Device.support.orientation
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device has a display with a high resolution.
	 *
	 * @name sap.ui.Device.support.retina
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser supports web sockets.
	 *
	 * @name sap.ui.Device.support.websocket
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the used browser supports the <code>placeholder</code> attribute on <code>input</code> elements.
	 *
	 * @name sap.ui.Device.support.input.placeholder
	 * @type boolean
	 * @public
	 */

	Device.support = {};

	/**
	 * 1. Maybe better to but this on Device.browser because there are cases that a browser can touch but a device can't!
	 * 2. Chrome 70 removes the 'ontouchstart' from window for device with and without touch screen. Therefore we need to
	 * use maxTouchPoints to check whether the device support touch interaction
	 * 3. FF 52 fires touch events (touch start) when tapping, but the support is only detectable with "window.TouchEvent".
	 * This is also the recommended way of detecting touch feature support, according to the Chrome Developers
	 * (https://www.chromestatus.com/feature/4764225348042752).
	*/
	var detectTouch = function () {
		return !!(('ontouchstart' in window)
			|| (window.navigator.maxTouchPoints > 0)
			|| (window.DocumentTouch && document instanceof window.DocumentTouch)
			|| (window.TouchEvent && Device.browser.firefox));
	};

	Device.support.touch = detectTouch();

	Device.support.pointer = !!window.PointerEvent;

	Device.support.matchmedia = true;
	Device.support.matchmedialistener = true;

	Device.support.orientation = !!("orientation" in window && "onorientationchange" in window);

	Device.support.retina = (window.retina || window.devicePixelRatio >= 2);

	Device.support.websocket = ('WebSocket' in window);

	Device.support.input = {};
	Device.support.input.placeholder = ('placeholder' in document.createElement("input"));

	//******** Match Media ********

	/**
	 * Event API for screen width changes.
	 *
	 * This API is based on media queries but can also be used if media queries are not natively supported by the used browser.
	 * In this case, the behavior of media queries is simulated by this API.
	 *
	 * There are several predefined {@link sap.ui.Device.media.RANGESETS range sets} available. Each of them defines a
	 * set of intervals for the screen width (from small to large). Whenever the screen width changes and the current screen width is in
	 * a different interval to the one before the change, the registered event handlers for the range set are called.
	 *
	 * If needed, it is also possible to define a custom set of intervals.
	 *
	 * The following example shows a typical use case:
	 * <pre>
	 * function sizeChanged(mParams) {
	 *     switch(mParams.name) {
	 *         case "Phone":
	 *             // Do what is needed for a little screen
	 *             break;
	 *         case "Tablet":
	 *             // Do what is needed for a medium sized screen
	 *             break;
	 *         case "Desktop":
	 *             // Do what is needed for a large screen
	 *     }
	 * }
	 *
	 * // Register an event handler to changes of the screen size
	 * sap.ui.Device.media.attachHandler(sizeChanged, null, sap.ui.Device.media.RANGESETS.SAP_STANDARD);
	 * // Do some initialization work based on the current size
	 * sizeChanged(sap.ui.Device.media.getCurrentRange(sap.ui.Device.media.RANGESETS.SAP_STANDARD));
	 * </pre>
	 *
	 * @namespace
	 * @name sap.ui.Device.media
	 * @public
	 */
	Device.media = {};

	/**
	 * Enumeration containing the names and settings of predefined screen width media query range sets.
	 *
	 * @namespace
	 * @name sap.ui.Device.media.RANGESETS
	 * @public
	 */

	/**
	 * A 3-step range set (S-L).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"S"</code>: For screens smaller than 520 pixels.</li>
	 * <li><code>"M"</code>: For screens greater than or equal to 520 pixels and smaller than 960 pixels.</li>
	 * <li><code>"L"</code>: For screens greater than or equal to 960 pixels.</li>
	 * </ul>
	 *
	 * To use this range set, you must initialize it explicitly ({@link sap.ui.Device.media.initRangeSet}).
	 *
	 * If this range set is initialized, a CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-3Step-<i>NAME_OF_THE_INTERVAL</i></code>.
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_3STEPS
	 * @type string
	 * @public
	 */
	/**
	 * A 4-step range set (S-XL).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"S"</code>: For screens smaller than 520 pixels.</li>
	 * <li><code>"M"</code>: For screens greater than or equal to 520 pixels and smaller than 760 pixels.</li>
	 * <li><code>"L"</code>: For screens greater than or equal to 760 pixels and smaller than 960 pixels.</li>
	 * <li><code>"XL"</code>: For screens greater than or equal to 960 pixels.</li>
	 * </ul>
	 *
	 * To use this range set, you must initialize it explicitly ({@link sap.ui.Device.media.initRangeSet}).
	 *
	 * If this range set is initialized, a CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-4Step-<i>NAME_OF_THE_INTERVAL</i></code>.
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_4STEPS
	 * @type string
	 * @public
	 */
	/**
	 * A 6-step range set (XS-XXL).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"XS"</code>: For screens smaller than 241 pixels.</li>
	 * <li><code>"S"</code>: For screens greater than or equal to 241 pixels and smaller than 400 pixels.</li>
	 * <li><code>"M"</code>: For screens greater than or equal to 400 pixels and smaller than 541 pixels.</li>
	 * <li><code>"L"</code>: For screens greater than or equal to 541 pixels and smaller than 768 pixels.</li>
	 * <li><code>"XL"</code>: For screens greater than or equal to 768 pixels and smaller than 960 pixels.</li>
	 * <li><code>"XXL"</code>: For screens greater than or equal to 960 pixels.</li>
	 * </ul>
	 *
	 * To use this range set, you must initialize it explicitly ({@link sap.ui.Device.media.initRangeSet}).
	 *
	 * If this range set is initialized, a CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-6Step-<i>NAME_OF_THE_INTERVAL</i></code>.
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_6STEPS
	 * @type string
	 * @public
	 */
	/**
	 * A 3-step range set (Phone, Tablet, Desktop).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"Phone"</code>: For screens smaller than 600 pixels.</li>
	 * <li><code>"Tablet"</code>: For screens greater than or equal to 600 pixels and smaller than 1024 pixels.</li>
	 * <li><code>"Desktop"</code>: For screens greater than or equal to 1024 pixels.</li>
	 * </ul>
	 *
	 * This range set is initialized by default. An initialization via {@link sap.ui.Device.media.initRangeSet} is not needed.
	 *
	 * A CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-Std-<i>NAME_OF_THE_INTERVAL</i></code>.
	 * Furthermore there are 5 additional CSS classes to hide elements based on the width of the screen:
	 * <ul>
	 * <li><code>sapUiHideOnPhone</code>: Will be hidden if the screen has 600px or less</li>
	 * <li><code>sapUiHideOnTablet</code>: Will be hidden if the screen has more than 600px and less than 1023px</li>
	 * <li><code>sapUiHideOnDesktop</code>: Will be hidden if the screen is larger than 1024px</li>
	 * <li><code>sapUiVisibleOnlyOnPhone</code>: Will be visible only if the screen has less than 600px</li>
	 * <li><code>sapUiVisibleOnlyOnTablet</code>: Will be visible only if the screen has 600px or more but less than 1024px</li>
	 * <li><code>sapUiVisibleOnlyOnDesktop</code>: Will be visible only if the screen has 1024px or more</li>
	 * </ul>
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_STANDARD
	 * @type string
	 * @public
	 */

	/**
	 * A 4-step range set (Phone, Tablet, Desktop, LargeDesktop).
	 *
	 * The ranges of this set are:
	 * <ul>
	 * <li><code>"Phone"</code>: For screens smaller than 600 pixels.</li>
	 * <li><code>"Tablet"</code>: For screens greater than or equal to 600 pixels and smaller than 1024 pixels.</li>
	 * <li><code>"Desktop"</code>: For screens greater than or equal to 1024 pixels and smaller than 1440 pixels.</li>
	 * <li><code>"LargeDesktop"</code>: For screens greater than or equal to 1440 pixels.</li>
	 * </ul>
	 *
	 * This range set is initialized by default. An initialization via {@link sap.ui.Device.media.initRangeSet} is not needed.
	 *
	 * A CSS class is added to the page root (<code>html</code> tag) which indicates the current
	 * screen width range: <code>sapUiMedia-StdExt-<i>NAME_OF_THE_INTERVAL</i></code>.
	 *
	 * @name sap.ui.Device.media.RANGESETS.SAP_STANDARD_EXTENDED
	 * @type string
	 * @public
	 */

	var RANGESETS = {
		"SAP_3STEPS": "3Step",
		"SAP_4STEPS": "4Step",
		"SAP_6STEPS": "6Step",
		"SAP_STANDARD": "Std",
		"SAP_STANDARD_EXTENDED": "StdExt"
	};
	Device.media.RANGESETS = RANGESETS;
	Device.media._predefinedRangeSets = {};
	Device.media._predefinedRangeSets[RANGESETS.SAP_3STEPS] = {
		points: [520, 960],
		unit: "px",
		name: RANGESETS.SAP_3STEPS,
		names: ["S", "M", "L"]
	};
	Device.media._predefinedRangeSets[RANGESETS.SAP_4STEPS] = {
		points: [520, 760, 960],
		unit: "px",
		name: RANGESETS.SAP_4STEPS,
		names: ["S", "M", "L", "XL"]
	};
	Device.media._predefinedRangeSets[RANGESETS.SAP_6STEPS] = {
		points: [241, 400, 541, 768, 960],
		unit: "px",
		name: RANGESETS.SAP_6STEPS,
		names: ["XS", "S", "M", "L", "XL", "XXL"]
	};
	Device.media._predefinedRangeSets[RANGESETS.SAP_STANDARD] = {
		points: [600, 1024],
		unit: "px",
		name: RANGESETS.SAP_STANDARD,
		names: ["Phone", "Tablet", "Desktop"]
	};
	Device.media._predefinedRangeSets[RANGESETS.SAP_STANDARD_EXTENDED] = {
		points: [600, 1024, 1440],
		unit: "px",
		name: RANGESETS.SAP_STANDARD_EXTENDED,
		names: ["Phone", "Tablet", "Desktop", "LargeDesktop"]
	};
	var _defaultRangeSet = RANGESETS.SAP_STANDARD;
	var iMediaTimeout = Device.support.matchmedialistener ? 0 : 100;
	var oQuerySets = {};
	var iMediaCurrentWidth = null;

	function getQuery(iFrom, iTo, iUnit) {
		iUnit = iUnit || "px";
		var sQuery = "all";
		if (iFrom > 0) {
			sQuery = sQuery + " and (min-width:" + iFrom + iUnit + ")";
		}
		if (iTo > 0) {
			sQuery = sQuery + " and (max-width:" + iTo + iUnit + ")";
		}
		return sQuery;
	}

	function handleChange(sName) {
		if (!Device.support.matchmedialistener && iMediaCurrentWidth == windowSize()[0]) {
			return; //Skip unnecessary resize events
		}

		if (oQuerySets[sName].timer) {
			clearTimeout(oQuerySets[sName].timer);
			oQuerySets[sName].timer = null;
		}

		oQuerySets[sName].timer = setTimeout(function() {
			var mParams = checkQueries(sName, false);
			if (mParams) {
				fireEvent("media_" + sName, mParams);
			}
		}, iMediaTimeout);
	}

	function checkQueries(sName, bInfoOnly, fnMatches) {
		function getRangeInfo(sSetName, iRangeIdx) {
			var q = oQuerySets[sSetName].queries[iRangeIdx];
			var info = {
				from: q.from,
				unit: oQuerySets[sSetName].unit
			};
			if (q.to >= 0) {
				info.to = q.to;
			}
			if (oQuerySets[sSetName].names) {
				info.name = oQuerySets[sSetName].names[iRangeIdx];
			}
			return info;
		}

		fnMatches = fnMatches || Device.media.matches;
		if (oQuerySets[sName]) {
			var aQueries = oQuerySets[sName].queries;
			var info = null;
			for (var i = 0, len = aQueries.length; i < len; i++) {
				var q = aQueries[i];
				if ((q != oQuerySets[sName].currentquery || bInfoOnly) && fnMatches(q.from, q.to, oQuerySets[sName].unit)) {
					if (!bInfoOnly) {
						oQuerySets[sName].currentquery = q;
					}
					if (!oQuerySets[sName].noClasses && oQuerySets[sName].names && !bInfoOnly) {
						refreshCSSClasses(sName, oQuerySets[sName].names[i]);
					}
					info = getRangeInfo(sName, i);
				}
			}

			return info;
		}
		oLogger.log(WARNING, "No queryset with name " + sName + " found", 'DEVICE.MEDIA');
		return null;
	}

	function refreshCSSClasses(sSetName, sRangeName, bRemove) {
		var sClassPrefix = "sapUiMedia-" + sSetName + "-";
		changeRootCSSClass(sClassPrefix + sRangeName, bRemove, sClassPrefix);
	}

	function changeRootCSSClass(sClassName, bRemove, sPrefix) {
		var oRoot = document.documentElement;
		if (oRoot.className.length == 0) {
			if (!bRemove) {
				oRoot.className = sClassName;
			}
		} else {
			var aCurrentClasses = oRoot.className.split(" ");
			var sNewClasses = "";
			for (var i = 0; i < aCurrentClasses.length; i++) {
				if ((sPrefix && aCurrentClasses[i].indexOf(sPrefix) != 0) || (!sPrefix && aCurrentClasses[i] != sClassName)) {
					sNewClasses = sNewClasses + aCurrentClasses[i] + " ";
				}
			}
			if (!bRemove) {
				sNewClasses = sNewClasses + sClassName;
			}
			oRoot.className = sNewClasses;
		}
	}

	function windowSize() {

		return [window.innerWidth, window.innerHeight];
	}

	function matchLegacyBySize(iFrom, iTo, sUnit, iSize) {
		function convertToPx(iValue, sUnit) {
			if (sUnit === "em" || sUnit === "rem") {
				var fnGetStyle = window.getComputedStyle || function(e) {
					return e.currentStyle;
				};
				var iFontSize = fnGetStyle(document.documentElement).fontSize;
				var iFactor = (iFontSize && iFontSize.indexOf("px") >= 0) ? parseFloat(iFontSize, 10) : 16;
				return iValue * iFactor;
			}
			return iValue;
		}

		iFrom = convertToPx(iFrom, sUnit);
		iTo = convertToPx(iTo, sUnit);

		var width = iSize[0];
		var a = iFrom < 0 || iFrom <= width;
		var b = iTo < 0 || width <= iTo;
		return a && b;
	}

	function matchLegacy(iFrom, iTo, sUnit) {
		return matchLegacyBySize(iFrom, iTo, sUnit, windowSize());
	}

	function match(iFrom, iTo, sUnit) {
		var oQuery = getQuery(iFrom, iTo, sUnit);
		var mm = window.matchMedia(oQuery); //FF returns null when running within an iframe with display:none
		return mm && mm.matches;
	}

	Device.media.matches = Device.support.matchmedia ? match : matchLegacy;

	/**
	 * Registers the given event handler to change events of the screen width based on the range set with the specified name.
	 *
	 * The event is fired whenever the screen width changes and the current screen width is in
	 * a different interval of the given range set than before the width change.
	 *
	 * The event handler is called with a single argument: a map <code>mParams</code> which provides the following information
	 * about the entered interval:
	 * <ul>
	 * <li><code>mParams.from</code>: The start value (inclusive) of the entered interval as a number</li>
	 * <li><code>mParams.to</code>: The end value (exclusive) range of the entered interval as a number or undefined for the last interval (infinity)</li>
	 * <li><code>mParams.unit</code>: The unit used for the values above, e.g. <code>"px"</code></li>
	 * <li><code>mParams.name</code>: The name of the entered interval, if available</li>
	 * </ul>
	 *
	 * @param {function({from: number, to: number, unit: string, name: string | undefined})}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the <code>window</code> instance. A map with information
	 *                       about the entered range set is provided as a single argument to the handler (see details above).
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the <code>window</code>.
	 * @param {string}
	 *            [sName] The name of the range set to listen to. The range set must be initialized beforehand
	 *                  ({@link sap.ui.Device.media.initRangeSet}). If no name is provided, the
	 *                  {@link sap.ui.Device.media.RANGESETS.SAP_STANDARD default range set} is used.
	 *
	 * @name sap.ui.Device.media.attachHandler
	 * @function
	 * @public
	 */
	Device.media.attachHandler = function(fnFunction, oListener, sName) {
		var name = sName || _defaultRangeSet;
		attachEvent("media_" + name, fnFunction, oListener);
	};

	/**
	 * Removes a previously attached event handler from the change events of the screen width.
	 *
	 * The passed parameters must match those used for registration with {@link #.attachHandler} beforehand.
	 *
	 * @param {function}
	 *            fnFunction The handler function to detach from the event
	 * @param {object}
	 *            [oListener] The object that wanted to be notified when the event occurred
	 * @param {string}
	 *            [sName] The name of the range set to listen to. If no name is provided, the
	 *                   {@link sap.ui.Device.media.RANGESETS.SAP_STANDARD default range set} is used.
	 *
	 * @name sap.ui.Device.media.detachHandler
	 * @function
	 * @public
	 */
	Device.media.detachHandler = function(fnFunction, oListener, sName) {
		var name = sName || _defaultRangeSet;
		detachEvent("media_" + name, fnFunction, oListener);
	};

	/**
	 * Initializes a screen width media query range set.
	 *
	 * This initialization step makes the range set ready to be used for one of the other functions in namespace <code>sap.ui.Device.media</code>.
	 * The most important {@link sap.ui.Device.media.RANGESETS predefined range sets} are initialized automatically.
	 *
	 * To make a not yet initialized {@link sap.ui.Device.media.RANGESETS predefined range set} ready to be used, call this function with the
	 * name of the range set to be initialized:
	 * <pre>
	 * sap.ui.Device.media.initRangeSet(sap.ui.Device.media.RANGESETS.SAP_3STEPS);
	 * </pre>
	 *
	 * Alternatively it is possible to define custom range sets as shown in the following example:
	 * <pre>
	 * sap.ui.Device.media.initRangeSet("MyRangeSet", [200, 400], "px", ["Small", "Medium", "Large"]);
	 * </pre>
	 * This example defines the following named ranges:
	 * <ul>
	 * <li><code>"Small"</code>: For screens smaller than 200 pixels.</li>
	 * <li><code>"Medium"</code>: For screens greater than or equal to 200 pixels and smaller than 400 pixels.</li>
	 * <li><code>"Large"</code>: For screens greater than or equal to 400 pixels.</li>
	 * </ul>
	 * The range names are optional. If they are specified a CSS class (e.g. <code>sapUiMedia-MyRangeSet-Small</code>) is also
	 * added to the document root depending on the current active range. This can be suppressed via parameter <code>bSuppressClasses</code>.
	 *
	 * @param {string}
	 *             sName The name of the range set to be initialized - either a {@link sap.ui.Device.media.RANGESETS predefined} or custom one.
	 *                   The name must be a valid id and consist only of letters and numeric digits.
	 * @param {int[]}
	 *             [aRangeBorders] The range borders
	 * @param {string}
	 *             [sUnit] The unit which should be used for the values given in <code>aRangeBorders</code>.
	 *                     The allowed values are <code>"px"</code> (default), <code>"em"</code> or <code>"rem"</code>
	 * @param {string[]}
	 *             [aRangeNames] The names of the ranges. The names must be a valid id and consist only of letters and digits. If names
	 *             are specified, CSS classes are also added to the document root as described above. This behavior can be
	 *             switched off explicitly by using <code>bSuppressClasses</code>. <b>Note:</b> <code>aRangeBorders</code> with <code>n</code> entries
	 *             define <code>n+1</code> ranges. Therefore <code>n+1</code> names must be provided.
	 * @param {boolean}
	 *             [bSuppressClasses] Whether or not writing of CSS classes to the document root should be suppressed when
	 *             <code>aRangeNames</code> are provided
	 *
	 * @name sap.ui.Device.media.initRangeSet
	 * @function
	 * @public
	 */
	Device.media.initRangeSet = function(sName, aRangeBorders, sUnit, aRangeNames, bSuppressClasses) {
		//TODO Do some Assertions and parameter checking
		var oConfig;
		if (!sName) {
			oConfig = Device.media._predefinedRangeSets[_defaultRangeSet];
		} else if (sName && Device.media._predefinedRangeSets[sName]) {
			oConfig = Device.media._predefinedRangeSets[sName];
		} else {
			oConfig = {
				name: sName,
				unit: (sUnit || "px").toLowerCase(),
				points: aRangeBorders || [],
				names: aRangeNames,
				noClasses: !!bSuppressClasses
			};
		}

		if (Device.media.hasRangeSet(oConfig.name)) {
			oLogger.log(INFO, "Range set " + oConfig.name + " has already been initialized", 'DEVICE.MEDIA');
			return;
		}

		sName = oConfig.name;
		oConfig.queries = [];
		oConfig.timer = null;
		oConfig.currentquery = null;
		oConfig.listener = function() {
			return handleChange(sName);
		};

		var from, to, query;
		var aPoints = oConfig.points;
		for (var i = 0, len = aPoints.length; i <= len; i++) {
			from = (i == 0) ? 0 : aPoints[i - 1];
			to = (i == aPoints.length) ? -1 : aPoints[i];
			query = getQuery(from, to, oConfig.unit);
			oConfig.queries.push({
				query: query,
				from: from,
				to: to
			});
		}

		if (oConfig.names && oConfig.names.length != oConfig.queries.length) {
			oConfig.names = null;
		}

		oQuerySets[oConfig.name] = oConfig;

		oConfig.queries.forEach(function(oQuery) {
			oQuery.media = window.matchMedia(oQuery.query);
			if (oQuery.media.addEventListener) {
				oQuery.media.addEventListener("change", oConfig.listener);
			} else { // Safari 13 and older only supports deprecated MediaQueryList.addListener
				oQuery.media.addListener(oConfig.listener);
			}
		});

		oConfig.listener();
	};

	/**
	 * Returns information about the current active range of the range set with the given name.
	 *
	 * If the optional parameter <code>iWidth</code> is given, the active range will be determined for that width,
	 * otherwise it is determined for the current window size.
	 *
	 * @param {string} sName The name of the range set. The range set must be initialized beforehand ({@link sap.ui.Device.media.initRangeSet})
	 * @param {int} [iWidth] An optional width, based on which the range should be determined;
	 *             If <code>iWidth</code> is not a number, the window size will be used.
	 * @returns {{from: number, to: number, unit: string, name: string | undefined}} Information about the current active interval of the range set. The returned object has the same structure as the argument of the event handlers ({@link sap.ui.Device.media.attachHandler})
	 *
	 * @name sap.ui.Device.media.getCurrentRange
	 * @function
	 * @public
	 */
	Device.media.getCurrentRange = function(sName, iWidth) {
		if (!Device.media.hasRangeSet(sName)) {
			return null;
		}
		return checkQueries(sName, true, isNaN(iWidth) ? null : function(from, to, unit) {
			return matchLegacyBySize(from, to, unit, [iWidth, 0]);
		});
	};

	/**
	 * Returns <code>true</code> if a range set with the given name is already initialized.
	 *
	 * @param {string} sName The name of the range set.
	 *
	 * @name sap.ui.Device.media.hasRangeSet
	 * @return {boolean} Returns <code>true</code> if a range set with the given name is already initialized
	 * @function
	 * @public
	 */
	Device.media.hasRangeSet = function(sName) {
		return sName && !!oQuerySets[sName];
	};

	/**
	 * Removes a previously initialized range set and detaches all registered handlers.
	 *
	 * Only custom range sets can be removed via this function. Initialized predefined range sets
	 * ({@link sap.ui.Device.media.RANGESETS}) cannot be removed.
	 *
	 * @param {string} sName The name of the range set which should be removed.
	 *
	 * @name sap.ui.Device.media.removeRangeSet
	 * @function
	 * @protected
	 */
	Device.media.removeRangeSet = function(sName) {
		if (!Device.media.hasRangeSet(sName)) {
			oLogger.log(INFO, "RangeSet " + sName + " not found, thus could not be removed.", 'DEVICE.MEDIA');
			return;
		}

		for (var x in RANGESETS) {
			if (sName === RANGESETS[x]) {
				oLogger.log(WARNING, "Cannot remove default rangeset - no action taken.", 'DEVICE.MEDIA');
				return;
			}
		}

		var oConfig = oQuerySets[sName];
		var queries = oConfig.queries;
		for (var i = 0; i < queries.length; i++) {
			if (queries[i].media.removeEventListener) {
				queries[i].media.removeEventListener("change", oConfig.listener);
			} else { // Safari 13 and older only supports deprecated MediaQueryList.removeListener
				queries[i].media.removeListener(oConfig.listener);
			}
		}

		refreshCSSClasses(sName, "", true);
		delete mEventRegistry["media_" + sName];
		delete oQuerySets[sName];
	};

	//******** System Detection ********

	/**
	 * Provides a basic categorization of the used device based on various indicators.
	 *
	 * These indicators are, for example, the support of touch events, the used operating system, and the user agent of the browser.
	 *
	 * <b>Note:</b> There is no easy way to precisely determine the used device from the information provided by the browser. We therefore rely especially on the user agent.
     * In combination with given device capabilities, it is therefore possible that multiple flags are set to <code>true</code>.
     * This is mostly the case for desktop devices with touch capability, and for mobile devices requesting web pages as desktop pages.
	 *
	 * @namespace
	 * @name sap.ui.Device.system
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device is recognized as a tablet.
	 *
	 * Furthermore, a CSS class <code>sap-tablet</code> is added to the document root element.
	 *
	 * <b>Note:</b> This flag is also <code>true</code> for some browsers running on desktop devices. See the documentation for {@link sap.ui.Device.system.combi} devices.
	 * You can use the following logic to ensure that the current device is a tablet device:
	 *
	 * <pre>
	 * if(sap.ui.Device.system.tablet && !sap.ui.Device.system.desktop){
	 *	...tablet related commands...
	 * }
	 * </pre>
	 *
	 * @name sap.ui.Device.system.tablet
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device is recognized as a phone.
	 *
	 * Furthermore, a CSS class <code>sap-phone</code> is added to the document root element.
	 *
	 * <b>Note:</b> In case a phone requests a web page as a "Desktop Page", it is possible
	 * that all properties except <code>Device.system.phone</code> are set to <code>true</code>.
	 * In this case it is not possible to differentiate between tablet and phone relying on the user agent.
	 *
	 * @name sap.ui.Device.system.phone
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device is recognized as a desktop system.
	 *
	 * Furthermore, a CSS class <code>sap-desktop</code> is added to the document root element.
	 *
	 * <b>Note:</b> This flag is by default also true for Safari on iPads running on iOS 13 or higher.
	 * The end user can change this behavior by disabling "Request Desktop Website -> All websites" within the iOS settings.
	 * See also the documentation for {@link sap.ui.Device.system.combi} devices.
	 *
	 * @name sap.ui.Device.system.desktop
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the device is recognized as a combination of a desktop system and tablet.
	 *
	 * Furthermore, a CSS class <code>sap-combi</code> is added to the document root element.
	 *
	 * <b>Note:</b> This property is set to <code>true</code> only when both a desktop and a mobile device is detected.
	 *
	 * @name sap.ui.Device.system.combi
	 * @type boolean
	 * @public
	 */
	/**
	 * Enumeration containing the names of known types of the devices.
	 *
	 * @namespace
	 * @name sap.ui.Device.system.SYSTEMTYPE
	 * @private
	 */

	var SYSTEMTYPE = {
		"TABLET": "tablet",
		"PHONE": "phone",
		"DESKTOP": "desktop",
		"COMBI": "combi"
	};

	Device.system = {};

	function getSystem(customUA) {
		var bTabletDetected = !!isTablet(customUA);

		var oSystem = {};
		oSystem.tablet = bTabletDetected;
		oSystem.phone = Device.support.touch && !bTabletDetected;
		oSystem.desktop = !!((!oSystem.tablet && !oSystem.phone) || Device.os.windows || Device.os.linux || Device.os.macintosh);
		oSystem.combi = oSystem.desktop && oSystem.tablet;
		oSystem.SYSTEMTYPE = SYSTEMTYPE;

		for (var type in SYSTEMTYPE) {
			changeRootCSSClass("sap-" + SYSTEMTYPE[type], !oSystem[SYSTEMTYPE[type]]);
		}
		return oSystem;
	}

	function isTablet() {
		var sUserAgent = oReducedNavigator.userAgent;
		if (Device.os.ios) {
			return /ipad/i.test(sUserAgent);
		} else if (Device.os.windows || Device.os.macintosh || Device.os.linux) {
			// For iOS:
			// With iOS 13 the string 'iPad' was removed from the user agent string through a browser setting, which is applied on all sites by default:
			// "Request Desktop Website -> All websites" (for more infos see: https://forums.developer.apple.com/thread/119186).
			// Therefore the OS is detected as MACINTOSH instead of iOS and the device is a tablet if the Device.support.touch is true.
			// For Android:
			// At least some devices (e.g. Samsung Galaxy S20 and Samsung Galaxy Tab S7) can't be recognized as Android device in case they request a page
			// as desktop page. In this case the userAgent does not contain any information regarding the real OS and we detect the device as linux OS
			// deriving from navigator.platform. Therefore we decided to handle this behaviour similar to iOS.
			return Device.support.touch;
		} else {
			//in real mobile device
			if (Device.support.touch) { // eslint-disable-line no-lonely-if
				return Device.browser.chrome && Device.os.android && !/Mobile Safari\/[.0-9]+/.test(sUserAgent);
			} else {
				// This simple android phone detection can be used here because this is the mobile emulation mode in desktop browser
				var bAndroidPhone = (/(?=android)(?=.*mobile)/i.test(sUserAgent));
				// in desktop browser, it's detected as tablet when Android emulation and it's not an Android phone
				return Device.os.android && !bAndroidPhone;
			}
		}
	}

	function setSystem() {
		Device.system = getSystem();
		if (Device.system.tablet || Device.system.phone) {
			Device.browser.mobile = true;
		}
	}
	setSystem();

	//******** Orientation Detection ********

	/**
	 * Common API for orientation change notifications across all platforms.
	 *
	 * For browsers or devices that do not provide native support for orientation change events
	 * the API simulates them based on the ratio of the document's width and height.
	 *
	 * @namespace
	 * @name sap.ui.Device.orientation
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the screen is currently in portrait mode (the height is greater than the width).
	 *
	 * @name sap.ui.Device.orientation.portrait
	 * @type boolean
	 * @public
	 */
	/**
	 * If this flag is set to <code>true</code>, the screen is currently in landscape mode (the width is greater than the height).
	 *
	 * @name sap.ui.Device.orientation.landscape
	 * @type boolean
	 * @public
	 */

	Device.orientation = {};

	/**
	 * Common API for document window size change notifications across all platforms.
	 *
	 * @namespace
	 * @name sap.ui.Device.resize
	 * @public
	 */
	/**
	 * The current height of the document's window in pixels.
	 *
	 * @name sap.ui.Device.resize.height
	 * @type int
	 * @public
	 */
	/**
	 * The current width of the document's window in pixels.
	 *
	 * @name sap.ui.Device.resize.width
	 * @type int
	 * @public
	 */

	Device.resize = {};

	/**
	 * Registers the given event handler to orientation change events of the document's window.
	 *
	 * The event is fired whenever the screen orientation changes and the width of the document's window
	 * becomes greater than its height or the other way round.
	 *
	 * The event handler is called with a single argument: a map <code>mParams</code> which provides the following information:
	 * <ul>
	 * <li><code>mParams.landscape</code>: If this flag is set to <code>true</code>, the screen is currently in landscape mode, otherwise in portrait mode.</li>
	 * </ul>
	 *
	 * @param {function}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the <code>window</code> instance. A map with information
	 *                       about the orientation is provided as a single argument to the handler (see details above).
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the <code>window</code>.
	 *
	 * @name sap.ui.Device.orientation.attachHandler
	 * @function
	 * @public
	 */
	Device.orientation.attachHandler = function(fnFunction, oListener) {
		attachEvent("orientation", fnFunction, oListener);
	};

	/**
	 * Registers the given event handler to resize change events of the document's window.
	 *
	 * The event is fired whenever the document's window size changes.
	 *
	 * The event handler is called with a single argument: a map <code>mParams</code> which provides the following information:
	 * <ul>
	 * <li><code>mParams.height</code>: The height of the document's window in pixels.</li>
	 * <li><code>mParams.width</code>: The width of the document's window in pixels.</li>
	 * </ul>
	 *
	 * @param {function}
	 *            fnFunction The handler function to call when the event occurs. This function will be called in the context of the
	 *                       <code>oListener</code> instance (if present) or on the <code>window</code> instance. A map with information
	 *                       about the size is provided as a single argument to the handler (see details above).
	 * @param {object}
	 *            [oListener] The object that wants to be notified when the event occurs (<code>this</code> context within the
	 *                        handler function). If it is not specified, the handler function is called in the context of the <code>window</code>.
	 *
	 * @name sap.ui.Device.resize.attachHandler
	 * @function
	 * @public
	 */
	Device.resize.attachHandler = function(fnFunction, oListener) {
		attachEvent("resize", fnFunction, oListener);
	};

	/**
	 * Removes a previously attached event handler from the orientation change events.
	 *
	 * The passed parameters must match those used for registration with {@link #.attachHandler} beforehand.
	 *
	 * @param {function}
	 *            fnFunction The handler function to detach from the event
	 * @param {object}
	 *            [oListener] The object that wanted to be notified when the event occurred
	 *
	 * @name sap.ui.Device.orientation.detachHandler
	 * @function
	 * @public
	 */
	Device.orientation.detachHandler = function(fnFunction, oListener) {
		detachEvent("orientation", fnFunction, oListener);
	};

	/**
	 * Removes a previously attached event handler from the resize events.
	 *
	 * The passed parameters must match those used for registration with {@link #.attachHandler} beforehand.
	 *
	 * @param {function}
	 *            fnFunction The handler function to detach from the event
	 * @param {object}
	 *            [oListener] The object that wanted to be notified when the event occurred
	 *
	 * @name sap.ui.Device.resize.detachHandler
	 * @function
	 * @public
	 */
	Device.resize.detachHandler = function(fnFunction, oListener) {
		detachEvent("resize", fnFunction, oListener);
	};

	function setOrientationInfo(oInfo) {
		oInfo.landscape = isLandscape(true);
		oInfo.portrait = !oInfo.landscape;
	}

	function handleOrientationChange() {
		setOrientationInfo(Device.orientation);
		fireEvent("orientation", {
			landscape: Device.orientation.landscape
		});
	}

	/**
	 * Updates the current size values (height/width).
	 *
	 * @name sap.ui.Device.resize._update
	 * @function
	 * @private
	 */
	var handleResizeChange = Device.resize._update = function() {
		setResizeInfo(Device.resize);
		fireEvent("resize", {
			height: Device.resize.height,
			width: Device.resize.width
		});
	};

	function setResizeInfo(oInfo) {
		oInfo.width = windowSize()[0];
		oInfo.height = windowSize()[1];
	}

	function handleOrientationResizeChange() {
		var wasL = Device.orientation.landscape;
		var isL = isLandscape();
		if (wasL != isL) {
			handleOrientationChange();
		}
		//throttle resize events because most browsers throw one or more resize events per pixel
		//for every resize event inside the period from 150ms (starting from the first resize event),
		//we only fire one resize event after this period
		if (!iResizeTimeout) {
			iResizeTimeout = window.setTimeout(handleResizeTimeout, 150);
		}
	}

	function handleResizeTimeout() {
		handleResizeChange();
		iResizeTimeout = null;
	}

	var bOrientationchange = false;
	var bResize = false;
	var iOrientationTimeout;
	var iResizeTimeout;
	var iClearFlagTimeout;
	var iWindowHeightOld = windowSize()[1];
	var iWindowWidthOld = windowSize()[0];
	var bKeyboardOpen = false;
	var iLastResizeTime;
	var rInputTagRegex = /INPUT|TEXTAREA|SELECT/;
	// On iPhone with iOS version 7.0.x and on iPad with iOS version 7.x (tested with all versions below 7.1.1), there's an invalid resize event fired
	// when changing the orientation while keyboard is shown.
	var bSkipFirstResize = Device.os.ios && Device.browser.name === "sf" &&
		((Device.system.phone && Device.os.version >= 7 && Device.os.version < 7.1) || (Device.system.tablet && Device.os.version >= 7));

	function isLandscape(bFromOrientationChange) {
		if (Device.support.touch && Device.support.orientation && Device.os.android) {
			//if on screen keyboard is open and the call of this method is from orientation change listener, reverse the last value.
			//this is because when keyboard opens on android device, the height can be less than the width even in portrait mode.
			if (bKeyboardOpen && bFromOrientationChange) {
				return !Device.orientation.landscape;
			}
			if (bKeyboardOpen) { //when keyboard opens, the last orientation change value will be returned.
				return Device.orientation.landscape;
			}
		} else if (Device.support.matchmedia && Device.support.orientation) { //most desktop browsers and windows phone/tablet which not support orientationchange
			return !!window.matchMedia("(orientation: landscape)").matches;
		}
		//otherwise compare the width and height of window
		var size = windowSize();
		return size[0] > size[1];
	}

	function handleMobileOrientationResizeChange(evt) {
		if (evt.type == "resize") {
			// suppress the first invalid resize event fired before orientationchange event while keyboard is open on iPhone 7.0.x
			// because this event has wrong size infos
			if (bSkipFirstResize && rInputTagRegex.test(document.activeElement.tagName) && !bOrientationchange) {
				return;
			}

			var iWindowHeightNew = windowSize()[1];
			var iWindowWidthNew = windowSize()[0];
			var iTime = new Date().getTime();
			//skip multiple resize events by only one orientationchange
			if (iWindowHeightNew === iWindowHeightOld && iWindowWidthNew === iWindowWidthOld) {
				return;
			}
			bResize = true;
			//on mobile devices opening the keyboard on some devices leads to a resize event
			//in this case only the height changes, not the width
			if ((iWindowHeightOld != iWindowHeightNew) && (iWindowWidthOld == iWindowWidthNew)) {
				//Asus Transformer tablet fires two resize events when orientation changes while keyboard is open.
				//Between these two events, only the height changes. The check of if keyboard is open has to be skipped because
				//it may be judged as keyboard closed but the keyboard is still open which will affect the orientation detection
				if (!iLastResizeTime || (iTime - iLastResizeTime > 300)) {
					bKeyboardOpen = (iWindowHeightNew < iWindowHeightOld);
				}
				handleResizeChange();
			} else {
				iWindowWidthOld = iWindowWidthNew;
			}
			iLastResizeTime = iTime;
			iWindowHeightOld = iWindowHeightNew;

			if (iClearFlagTimeout) {
				window.clearTimeout(iClearFlagTimeout);
				iClearFlagTimeout = null;
			}
			//Some Android build-in browser fires a resize event after the viewport is applied.
			//This resize event has to be dismissed otherwise when the next orientationchange event happens,
			//a UI5 resize event will be fired with the wrong window size.
			iClearFlagTimeout = window.setTimeout(clearFlags, 1200);
		} else if (evt.type == "orientationchange") {
			bOrientationchange = true;
		}

		if (iOrientationTimeout) {
			clearTimeout(iOrientationTimeout);
			iOrientationTimeout = null;
		}
		iOrientationTimeout = window.setTimeout(handleMobileTimeout, 50);
	}

	function handleMobileTimeout() {
		// with ios split view, the browser fires only resize event and no orientationchange when changing the size of a split view
		// therefore the following if needs to be adapted with additional check of iPad with version greater or equal 9 (splitview was introduced with iOS 9)
		if (bResize && (bOrientationchange || (Device.system.tablet && Device.os.ios && Device.os.version >= 9))) {
			handleOrientationChange();
			handleResizeChange();
			bOrientationchange = false;
			bResize = false;
			if (iClearFlagTimeout) {
				window.clearTimeout(iClearFlagTimeout);
				iClearFlagTimeout = null;
			}
		}
		iOrientationTimeout = null;
	}

	function clearFlags() {
		bOrientationchange = false;
		bResize = false;
		iClearFlagTimeout = null;
	}

	//********************************************************

	setResizeInfo(Device.resize);
	setOrientationInfo(Device.orientation);

	//Add API to global namespace
	window.sap.ui.Device = Device;

	// Add handler for orientationchange and resize after initialization of Device API
	if (Device.support.touch && Device.support.orientation) {
		// logic for mobile devices which support orientationchange (like ios, android)
		window.addEventListener("resize", handleMobileOrientationResizeChange, false);
		window.addEventListener("orientationchange", handleMobileOrientationResizeChange, false);
	} else {
		// desktop browsers and windows phone/tablet which not support orientationchange
		window.addEventListener("resize", handleOrientationResizeChange, false);
	}

	//Always initialize the default media range set
	Device.media.initRangeSet();
	Device.media.initRangeSet(RANGESETS["SAP_STANDARD_EXTENDED"]);

	// Only for test purposes
	Device._setCustomNavigator = function (oCustomNavigator, bTouch) {
		// Reset to device capabilities in case no custom navigator is given
		if (!oCustomNavigator) {
			Device.support.touch = detectTouch();
			setDefaultNavigator();
		} else {
			Device.support.touch = bTouch;
			oReducedNavigator = Object.assign(oReducedNavigator, oCustomNavigator);
		}

		setOS();
		setBrowser();
		setSystem();
	};

	// define module if API is available
	if (sap.ui.define) {
		sap.ui.define("sap/ui/Device", [], function() {
			return Device;
		});
	}

}());
},
	"sap/ui/core/boot/manifest.json":'{"extends":"","preBoot":[],"boot":["sap/ui/core/boot/loadCalendar","sap/ui/core/boot/loadModules"],"postBoot":["sap/ui/core/boot/onInit"]}'
},"sap-ui-core-preload");
//@ui5-bundle-raw-include sap/ui/core/boot/_runBoot.js
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * Require boot.js asynchronous. Actually this is not possible as bundle
 * configuration so a helper is needed for now.
 * @private
 * @ui5-restricted sap.base, sap.ui.core
 */
(function() {
    "use strict";
	sap.ui.require(["sap/ui/core/boot"]);
})();
} catch(oError) {
if (oError.name != "Restart") { throw oError; }
}
//# sourceMappingURL=sap-ui-boot.js.map
