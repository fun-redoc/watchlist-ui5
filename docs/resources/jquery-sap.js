//@ui5-bundle jquery-sap.js
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

// Provides functionality related to DOM analysis and manipulation which is not provided by jQuery itself.
sap.ui.predefine("jquery.sap.dom", [
	'jquery.sap.global', 'sap/ui/dom/containsOrEquals',
	'sap/ui/core/syncStyleClass', 'sap/ui/dom/getOwnerWindow', 'sap/ui/dom/getScrollbarSize',
	'sap/ui/dom/denormalizeScrollLeftRTL', 'sap/ui/dom/denormalizeScrollBeginRTL',
	'sap/ui/dom/units/Rem', 'sap/ui/dom/jquery/Aria',
	'sap/ui/dom/jquery/Selection', 'sap/ui/dom/jquery/zIndex', 'sap/ui/dom/jquery/parentByAttribute',
	'sap/ui/dom/jquery/cursorPos', 'sap/ui/dom/jquery/selectText', 'sap/ui/dom/jquery/getSelectedText',
	'sap/ui/dom/jquery/rect', 'sap/ui/dom/jquery/rectContains', 'sap/ui/dom/jquery/Focusable',
	'sap/ui/dom/jquery/hasTabIndex', 'sap/ui/dom/jquery/scrollLeftRTL', 'sap/ui/dom/jquery/scrollRightRTL', 'sap/ui/dom/jquery/Selectors'
], function(jQuery, domContainsOrEquals, fnSyncStyleClass, domGetOwnerWindow,
	domGetScrollbarSize, domDenormalizeScrollLeftRTL, domDenormalizeScrollBeginRTL, domUnitsRem
	/*
	jqueryAria,
	jquerySelection,
	jqueryzIndex,
	jqueryParentByAttribute,
	jqueryCursorPos,
	jquerySelectText,
	jqueryGetSelectedText,
	jqueryRect,
	jqueryRectContains,
	jqueryFocusable,
	jqueryHasTabIndex,
	jqueryScrollLeftRTL,
	jqueryScrollRightRTL,
	jquerySelectors*/
) {
	"use strict";

	/**
	 * Shortcut for document.getElementById().
	 *
	 * @param {string} sId The id of the DOM element to return
	 * @param {Window} [oWindow=window] The window (optional)
	 * @returns {Element|null} The DOMNode identified by the given sId, or <code>null</code>
	 * @public
	 * @since 0.9.0
	 * @deprecated since 1.58 use <code>document.getElementById</code> instead
	 */
	jQuery.sap.domById = function domById(sId, oWindow) {
		return sId ? (oWindow || window).document.getElementById(sId) : null;
	};

	/**
	 * Shortcut for jQuery("#" + id) with additionally the id being escaped properly.
	 * I.e.: returns the jQuery object for the DOM element with the given id
	 *
	 * Use this method instead of jQuery(...) if you know the argument is exactly one id and
	 * the id is not known in advance because it is in a variable (as opposed to a string
	 * constant with known content).
	 *
	 * @param {string} sId The id to search for and construct the jQuery object
	 * @param {Element} oContext the context DOM Element
	 * @returns {jQuery} The jQuery object for the DOM element identified by the given sId
	 * @public
	 * @since 0.9.1
	 * @function
	 * @deprecated since 1.58 use <code>jQuery(document.getElementById(sId))</code> instead
	 */
	jQuery.sap.byId = function byId(sId, oContext) {
		var escapedId = "";
		if (sId) {
			// Note: This does not escape all relevant characters according to jQuery's documentation
			// (see http://api.jquery.com/category/selectors/)
			// As the behavior hasn't been changed for a long time it is not advisable to change it in
			// future as users might be already escaping characters on their own or relying on the fact
			// selector like byId("my-id > div") can be used.
			escapedId = "#" + sId.replace(/(:|\.)/g,'\\$1');
		}
		return jQuery(escapedId, oContext);
	};

	/**
	 * Calls focus() on the given DOM element.
	 *
	 * @param {Element} oDomRef The DOM element to focus (or null - in this case the method does nothing)
	 * @returns {boolean|undefined} <code>true</code> when the focus() command was executed without an error, otherwise undefined.
	 * @public
	 * @since 1.1.2
	 * @function
	 * @deprecated since 1.58 use <code>oDomRef.focus()</code> instead
	 */
	jQuery.sap.focus = function focus(oDomRef) {
		if (!oDomRef) {
			return;
		}
		oDomRef.focus();
		return true;
	};

	/*
	 * Convert <code>px</code> values to <code>rem</code>.
	 *
	 * @param {string|float} vPx The value in <code>px</code> units. E.g.: <code>"16px"</code> or <code>16</code>
	 * @returns {float} The converted value in <code>rem</code> units. E.g.: <code>1</code>
	 * @protected
	 * @since 1.48
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/units/Rem.fromPx} instead
	 */
	jQuery.sap.pxToRem = domUnitsRem.fromPx;

	/*
	 * Convert <code>rem</code> values to <code>px</code>.
	 *
	 * @param {string|float} vRem The value in <code>rem</code>. E.g.: <code>"1rem"</code> or <code>1</code>
	 * @returns {float} The converted value in <code>px</code> units. E.g.: <code>16</code>
	 * @protected
	 * @since 1.48
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/units/Rem.toPx} instead
	 */
	jQuery.sap.remToPx = domUnitsRem.toPx;

	/**
	 * Returns the outer HTML of the given HTML element.
	 *
	 * @returns {string} outer HTML
	 * @public
	 * @name jQuery#outerHTML
	 * @author SAP SE
	 * @since 0.9.0
	 * @function
	 * @deprecated since 1.58 use native <code>Element#outerHTML</code> instead
	 */
	jQuery.fn.outerHTML = function() {
		var oDomRef = this.get(0);

		if (oDomRef && oDomRef.outerHTML) {
			return oDomRef.outerHTML.trim();
		} else {
			var doc = this[0] ? this[0].ownerDocument : document;

			var oDummy = doc.createElement("div");
			oDummy.appendChild(oDomRef.cloneNode(true));
			return oDummy.innerHTML;
		}
	};

	/**
	 * Returns whether <code>oDomRefChild</code> is contained in or equal to <code>oDomRefContainer</code>.
	 *
	 * For compatibility reasons it returns <code>true</code> if <code>oDomRefContainer</code> and
	 * <code>oDomRefChild</code> are equal.
	 *
	 * This method intentionally does not operate on the jQuery object, as the original <code>jQuery.contains()</code>
	 * method also does not do so.
	 *
	 * @param {Element} oDomRefContainer The container element
	 * @param {Element} oDomRefChild The child element (must not be a text node, must be an element)
	 * @returns {boolean} Whether <code>oDomRefChild</code> is contained in or equal to <code>oDomRefContainer</code>
	 * @public
	 * @author SAP SE
	 * @since 0.9.0
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/containsOrEquals} instead
	 */
	jQuery.sap.containsOrEquals = domContainsOrEquals;

	/**
	 * For the given scrollLeft value this method returns the scrollLeft value as understood by the current browser in RTL mode.
	 * This value is specific to the given DOM element, as the computation may involve its dimensions.
	 *
	 * So when oDomRef should be scrolled 2px from the leftmost position, the number "2" must be given as iNormalizedScrollLeft
	 * and the result of this method (which may be a large or even negative number, depending on the browser) can then be set as
	 * oDomRef.scrollLeft to achieve the desired (cross-browser-consistent) scrolling position.
	 *
	 * This method does no scrolling on its own, it only calculates the value to set (so it can also be used for animations).
	 *
	 * @param {int} iNormalizedScrollLeft The distance from the leftmost position to which the element should be scrolled
	 * @param {Element} oDomRef The DOM Element to which scrollLeft will be applied
	 * @returns {int} The scroll position that must be set for the DOM element
	 * @public
	 * @author SAP SE
	 * @since 0.20.0
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/denormalizeScrollLeftRTL} instead
	 */
	jQuery.sap.denormalizeScrollLeftRTL = domDenormalizeScrollLeftRTL;

	/**
	 * For the given scroll position measured from the "beginning" of a container (the right edge in RTL mode)
	 * this method returns the scrollLeft value as understood by the current browser in RTL mode.
	 * This value is specific to the given DOM element, as the computation may involve its dimensions.
	 *
	 * So when oDomRef should be scrolled 2px from the beginning, the number "2" must be given as iNormalizedScrollBegin
	 * and the result of this method (which may be a large or even negative number, depending on the browser) can then be set as
	 * oDomRef.scrollLeft to achieve the desired (cross-browser-consistent) scrolling position.
	 * Low values make the right part of the content visible, high values the left part.
	 *
	 * This method does no scrolling on its own, it only calculates the value to set (so it can also be used for animations).
	 *
	 * Only use this method in RTL mode, as the behavior in LTR mode is undefined and may change!
	 *
	 * @param {int} iNormalizedScrollBegin The distance from the rightmost position to which the element should be scrolled
	 * @param {Element} oDomRef The DOM Element to which scrollLeft will be applied
	 * @returns {int} The scroll position that must be set for the DOM element
	 * @public
	 * @author SAP SE
	 * @since 1.26.1
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/denormalizeScrollBeginRTL} instead
	 */
	jQuery.sap.denormalizeScrollBeginRTL = domDenormalizeScrollBeginRTL;

	/*
	 * The following implementation of jQuery.support.selectstart is taken from jQuery UI core but modified.
	 *
	 * jQuery UI Core
	 * http://jqueryui.com
	 *
	 * Copyright 2014 jQuery Foundation and other contributors
	 * Released under the MIT license.
	 * http://jquery.org/license
	 *
	 * http://api.jqueryui.com/category/ui-core/
	 */

	/**
	 * States whether the selectstart event is supported by the browser.
	 *
	 * @private
	 * @type {boolean}
	 * @deprecated since 1.58
	 */
	jQuery.support.selectstart = "onselectstart" in document.createElement("div");

	/**
	 * Returns the window reference for a DomRef.
	 *
	 * @param {Element} oDomRef The DOM reference
	 * @returns {Window} Window reference
	 * @public
	 * @since 0.9.0
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/getOwnerWindow} instead
	 */
	jQuery.sap.ownerWindow = domGetOwnerWindow;

	/**
	 * Returns the size (width of the vertical / height of the horizontal) native browser scrollbars.
	 *
	 * This function must only be used when the DOM is ready.
	 *
	 * @param {string} [sClasses=null] the CSS class that should be added to the test element.
	 * @param {boolean} [bForce=false] force recalculation of size (e.g. when CSS was changed). When no classes are passed all calculated sizes are reset.
	 * @returns {{width: number, height: number}} JSON object with properties <code>width</code> and <code>height</code> (the values are of type number and are pixels).
	 * @public
	 * @since 1.4.0
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/getScrollbarSize} instead
	 */
	jQuery.sap.scrollbarSize = domGetScrollbarSize;

	/**
	 * Search ancestors of the given source DOM element for the specified CSS class name.
	 * If the class name is found, set it to the root DOM element of the target control.
	 * If the class name is not found, it is also removed from the target DOM element.
	 *
	 * @param {string} sStyleClass CSS class name
	 * @param {jQuery|sap.ui.core.Control|string} vSource jQuery object, control or an id of the source element.
	 * @param {jQuery|sap.ui.core.Control} vDestination target jQuery object or a control.
	 * @returns {jQuery|Element} Target element
	 * @public
	 * @since 1.22
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/core/syncStyleClass} instead
	 */
	jQuery.sap.syncStyleClass = fnSyncStyleClass;

	return jQuery;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides encoding functions for JavaScript.
sap.ui.predefine("jquery.sap.encoder", ['jquery.sap.global',
		'sap/base/security/encodeXML',
		'sap/base/security/encodeJS',
		'sap/base/security/encodeURL',
		'sap/base/security/encodeURLParameters',
		'sap/base/security/encodeCSS',
		'sap/base/security/URLListValidator',
		'sap/base/security/URLWhitelist',
		'sap/base/security/sanitizeHTML'
	],
	function(jQuery, encodeXML, encodeJS, encodeURL, encodeURLParameters, encodeCSS, URLListValidator, URLWhitelist, sanitizeHTML) {
	"use strict";

	/**
	 * Encode the string for inclusion into HTML content/attribute
	 *
	 * @param {string} sString The string to be escaped
	 * @return The escaped string
	 * @type {string}
	 * @public
	 * @SecValidate {0|return|XSS} validates the given string for HTML contexts
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/encodeXML} instead
	 */
	jQuery.sap.encodeHTML = encodeXML;

	/**
	 * Encode the string for inclusion into XML content/attribute
	 *
	 * @param {string} sString The string to be escaped
	 * @return The escaped string
	 * @type {string}
	 * @public
	 * @SecValidate {0|return|XSS} validates the given string for XML contexts
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/encodeXML} instead
	 */
	jQuery.sap.encodeXML = encodeXML;

	/**
	 * Encode the string for inclusion into HTML content/attribute.
	 * Old name "escapeHTML" kept for backward compatibility
	 *
	 * @param {string} sString The string to be escaped
	 * @return The escaped string
	 * @type {string}
	 * @public
	 * @deprecated As of version 1.4.0, has been renamed, use {@link jQuery.sap.encodeHTML} instead.
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/encodeXML} instead
	 */
	jQuery.sap.escapeHTML = encodeXML;

	/**
	 * Encode the string for inclusion into a JS string literal
	 *
	 * @param {string} sString The string to be escaped
	 * @return The escaped string
	 * @type {string}
	 * @public
	 * @SecValidate {0|return|XSS} validates the given string for a JavaScript contexts
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/encodeJS} instead
	 */
	jQuery.sap.encodeJS = encodeJS;

	/**
	 * Encode the string for inclusion into a JS string literal.
	 * Old name "escapeJS" kept for backward compatibility
	 *
	 * @param {string} sString The string to be escaped
	 * @return The escaped string
	 * @type {string}
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/encodeJS} instead
	 */
	jQuery.sap.escapeJS = encodeJS;

	/**
	 * Encode the string for inclusion into a URL parameter
	 *
	 * @param {string} sString The string to be escaped
	 * @return The escaped string
	 * @type {string}
	 * @public
	 * @SecValidate {0|return|XSS} validates the given string for a URL context
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/encodeURL} instead
	 */
	jQuery.sap.encodeURL = encodeURL;

	/**
	 * Encode a map of parameters into a combined URL parameter string
	 *
	 * @param {object} mParams The map of parameters to encode
	 * @return The URL encoded parameters
	 * @type {string}
	 * @public
	 * @SecValidate {0|return|XSS} validates the given string for a CSS context
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/encodeURLParameters} instead
	 */
	jQuery.sap.encodeURLParameters =  encodeURLParameters;


	/**
	 * Encode the string for inclusion into CSS string literals or identifiers
	 *
	 * @param {string} sString The string to be escaped
	 * @return The escaped string
	 * @type {string}
	 * @public
	 * @SecValidate {0|return|XSS} validates the given string for a CSS context
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/encodeCSS} instead
	 */
	jQuery.sap.encodeCSS = encodeCSS;


	/**
	 * Clears the allowlist for URL validation.
	 *
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/URLListValidator.clear} instead.
	 * SAP strives to replace insensitive terms with inclusive language,
	 * but APIs cannot be renamed or immediately removed for compatibility reasons.
	 */
	jQuery.sap.clearUrlWhitelist = URLListValidator.clear;

	/**
	 * Adds an allowlist entry for URL validation.
	 *
	 * @param {string} [protocol] The protocol of the URL, can be falsy to allow all protocols for an entry e.g. "", "http", "mailto"
	 * @param {string} [host] The host of the URL, can be falsy to allow all hosts. A wildcard asterisk can be set at the beginning, e.g. "examples.com", "*.example.com"
	 * @param {string} [port] The port of the URL, can be falsy to allow all ports, e.g. "", "8080"
	 * @param {string} [path] the path of the URL, path of the url, can be falsy to allow all paths. A wildcard asterisk can be set at the end, e.g. "/my-example*", "/my-news"
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/URLListValidator.add} instead.
	 * SAP strives to replace insensitive terms with inclusive language,
	 * but APIs cannot be renamed or immediately removed for compatibility reasons.
	 */
	jQuery.sap.addUrlWhitelist = URLListValidator.add.bind(URLWhitelist);

	/**
	 * Removes an allowlist entry for URL validation.
	 *
	 * @param {int} iIndex index of entry
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/URLListValidator.clear} and {@link module:sap/base/security/URLListValidator.add} instead.
	 * SAP strives to replace insensitive terms with inclusive language,
	 * but APIs cannot be renamed or immediately removed for compatibility reasons.
	 */
	jQuery.sap.removeUrlWhitelist = function(iIndex) {
		URLListValidator._delete(URLListValidator.entries()[iIndex]);
	};

	/**
	 * Gets the allowlist for URL validation.
	 *
	 * @return {object[]} A copy of the allowlist
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/URLListValidator.entries} instead.
	 * SAP strives to replace insensitive terms with inclusive language,
	 * but APIs cannot be renamed or immediately removed for compatibility reasons.
	 */
	jQuery.sap.getUrlWhitelist = URLListValidator.entries;

	/**
	 * Validates a URL. Check if it's not a script or other security issue.
	 *
	 * By default the URL validation does only allow the http, https and ftp protocol. If
	 * other protocols are required, an allowlist of all allowed protocols needs to be defined.
	 *
	 * Split URL into components and check for allowed characters according to RFC 3986:
	 *
	 * <pre>
	 * authority     = [ userinfo "@" ] host [ ":" port ]
	 * userinfo      = *( unreserved / pct-encoded / sub-delims / ":" )
	 * host          = IP-literal / IPv4address / reg-name
	 *
	 * IP-literal    = "[" ( IPv6address / IPvFuture  ) "]"
	 * IPvFuture     = "v" 1*HEXDIG "." 1*( unreserved / sub-delims / ":" )
	 * IPv6address   =                            6( h16 ":" ) ls32
	 *               /                       "::" 5( h16 ":" ) ls32
	 *               / [               h16 ] "::" 4( h16 ":" ) ls32
	 *               / [ *1( h16 ":" ) h16 ] "::" 3( h16 ":" ) ls32
	 *               / [ *2( h16 ":" ) h16 ] "::" 2( h16 ":" ) ls32
	 *               / [ *3( h16 ":" ) h16 ] "::"    h16 ":"   ls32
	 *               / [ *4( h16 ":" ) h16 ] "::"              ls32
	 *               / [ *5( h16 ":" ) h16 ] "::"              h16
	 *               / [ *6( h16 ":" ) h16 ] "::"
	 * ls32          = ( h16 ":" h16 ) / IPv4address
	 *               ; least-significant 32 bits of address
	 * h16           = 1*4HEXDIG
 	 *               ; 16 bits of address represented in hexadecimal
 	 *
	 * IPv4address   = dec-octet "." dec-octet "." dec-octet "." dec-octet
	 * dec-octet     = DIGIT                 ; 0-9
	 *               / %x31-39 DIGIT         ; 10-99
	 *               / "1" 2DIGIT            ; 100-199
	 *               / "2" %x30-34 DIGIT     ; 200-249
	 *               / "25" %x30-35          ; 250-255
	 *
	 * reg-name      = *( unreserved / pct-encoded / sub-delims )
	 *
	 * pct-encoded   = "%" HEXDIG HEXDIG
	 * reserved      = gen-delims / sub-delims
	 * gen-delims    = ":" / "/" / "?" / "#" / "[" / "]" / "@"
	 * sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
	 *               / "*" / "+" / "," / ";" / "="
	 * unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
	 * pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
	 *
	 * path          = path-abempty    ; begins with "/" or is empty
	 *               / path-absolute   ; begins with "/" but not "//"
	 *               / path-noscheme   ; begins with a non-colon segment
	 *               / path-rootless   ; begins with a segment
	 *               / path-empty      ; zero characters
	 *
	 * path-abempty  = *( "/" segment )
	 * path-absolute = "/" [ segment-nz *( "/" segment ) ]
	 * path-noscheme = segment-nz-nc *( "/" segment )
	 * path-rootless = segment-nz *( "/" segment )
	 * path-empty    = 0<pchar>
	 * segment       = *pchar
	 * segment-nz    = 1*pchar
	 * segment-nz-nc = 1*( unreserved / pct-encoded / sub-delims / "@" )
	 *               ; non-zero-length segment without any colon ":"
	 *
	 * query         = *( pchar / "/" / "?" )
	 *
	 * fragment      = *( pchar / "/" / "?" )
	 * </pre>
	 *
	 * For the hostname component, we are checking for valid DNS hostnames according to RFC 952 / RFC 1123:
	 *
	 * <pre>
	 * hname         = name *("." name)
	 * name          = let-or-digit ( *( let-or-digit-or-hyphen ) let-or-digit )
	 * </pre>
	 *
	 *
	 * When the URI uses the protocol 'mailto:', the address part is additionally checked
	 * against the most commonly used parts of RFC 6068:
	 *
	 * <pre>
	 * mailtoURI     = "mailto:" [ to ] [ hfields ]
	 * to            = addr-spec *("," addr-spec )
	 * hfields       = "?" hfield *( "&" hfield )
	 * hfield        = hfname "=" hfvalue
	 * hfname        = *qchar
	 * hfvalue       = *qchar
	 * addr-spec     = local-part "@" domain
	 * local-part    = dot-atom-text              // not accepted: quoted-string
	 * domain        = dot-atom-text              // not accepted: "[" *dtext-no-obs "]"
	 * dtext-no-obs  = %d33-90 / ; Printable US-ASCII
	 *                 %d94-126  ; characters not including
	 *                           ; "[", "]", or "\"
	 * qchar         = unreserved / pct-encoded / some-delims
	 * some-delims   = "!" / "$" / "'" / "(" / ")" / "*"
	 *               / "+" / "," / ";" / ":" / "@"
	 *
	 * Note:
	 * A number of characters that can appear in &lt;addr-spec> MUST be
	 * percent-encoded.  These are the characters that cannot appear in
	 * a URI according to [STD66] as well as "%" (because it is used for
	 * percent-encoding) and all the characters in gen-delims except "@"
	 * and ":" (i.e., "/", "?", "#", "[", and "]").  Of the characters
	 * in sub-delims, at least the following also have to be percent-
	 * encoded: "&", ";", and "=".  Care has to be taken both when
	 * encoding as well as when decoding to make sure these operations
	 * are applied only once.
	 *
	 * </pre>
	 *
	 * When an allowlist has been configured using {@link module:sap/base/security/URLListValidator.add add},
	 * any URL that passes the syntactic checks above, additionally will be tested against
	 * the content of the allowlist.
	 *
	 * @param {string} sUrl
	 * @return true if valid, false if not valid
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/URLListValidator.validate} instead.
	 */
	jQuery.sap.validateUrl = URLListValidator.validate;

	/**
	 * Strips unsafe tags and attributes from HTML.
	 *
	 * @param {string} sHTML the HTML to be sanitized.
	 * @param {object} [mOptions={}] options for the sanitizer
	 * @return {string} sanitized HTML
	 * @private
	 * @name jQuery.sap._sanitizeHTML
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/security/sanitizeHTML} instead
	 */
	jQuery.sap._sanitizeHTML = sanitizeHTML;

	return jQuery;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides functionality related to eventing.
sap.ui.predefine("jquery.sap.events", [
	'jquery.sap.global',
	'sap/ui/events/ControlEvents',
	'sap/ui/events/PseudoEvents',
	'sap/ui/events/checkMouseEnterOrLeave',
	'sap/ui/events/isSpecialKey',
	'sap/ui/events/isMouseEventDelayed',
	'sap/ui/events/F6Navigation',
	'sap/ui/events/jquery/EventSimulation',
	'sap/ui/events/KeyCodes',
	'sap/base/util/defineCoupledProperty',
	'sap/ui/events/jquery/EventExtension' // implicit dependency
], function(jQuery, ControlEvents, PseudoEvents, fnCheckMouseEnterOrLeave, fnIsSpecialKey, fnIsMouseEventDelayed, F6Navigation, EventSimulation, KeyCodes, defineCoupledProperty) {
	"use strict";


	/**
	 * Enumeration of all so called "pseudo events", a useful classification
	 * of standard browser events as implied by SAP product standards.
	 *
	 * Whenever a browser event is recognized as one or more pseudo events, then this
	 * classification is attached to the original {@link jQuery.Event} object and thereby
	 * delivered to any jQuery-style listeners registered for that browser event.
	 *
	 * Pure JavaScript listeners can evaluate the classification information using
	 * the {@link jQuery.Event#isPseudoType} method.
	 *
	 * Instead of using the procedure as described above, the SAPUI5 controls and elements
	 * should simply implement an <code>on<i>pseudo-event</i>(oEvent)</code> method. It will
	 * be invoked only when that specific pseudo event has been recognized. This simplifies event
	 * dispatching even further.
	 *
	 * @namespace
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/events/PseudoEvents.events} instead
	 */
	jQuery.sap.PseudoEvents = PseudoEvents.events;



	/**
	 * Pseudo event for keyboard arrow down without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapdown
	 */

	/**
	 * Pseudo event for keyboard arrow down with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapdownmodifiers
	 */

	/**
	 * Pseudo event for pseudo 'show' event (F4, Alt + down-Arrow)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapshow
	 */

	/**
	 * Pseudo event for keyboard arrow up without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapup
	 */

	/**
	 * Pseudo event for keyboard arrow up with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapupmodifiers
	 */

	/**
	 * Pseudo event for pseudo 'hide' event (Alt + up-Arrow)
	 * @public
	 * @name jQuery.sap.PseudoEvents.saphide
	 */

	/**
	 * Pseudo event for keyboard arrow left without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapleft
	 */

	/**
	 * Pseudo event for keyboard arrow left with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapleftmodifiers
	 */

	/**
	 * Pseudo event for keyboard arrow right without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapright
	 */

	/**
	 * Pseudo event for keyboard arrow right with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.saprightmodifiers
	 */

	/**
	 * Pseudo event for keyboard Home/Pos1 with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.saphome
	 */

	/**
	 * Pseudo event for keyboard Home/Pos1 without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.saphomemodifiers
	 */

	/**
	 * Pseudo event for  pseudo top event
	 * @public
	 * @name jQuery.sap.PseudoEvents.saptop
	 */

	/**
	 * Pseudo event for keyboard End without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapend
	 */

	/**
	 * Pseudo event for keyboard End with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapendmodifiers
	 */

	/**
	 * Pseudo event for pseudo bottom event
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapbottom
	 */

	/**
	 * Pseudo event for keyboard page up without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sappageup
	 */

	/**
	 * Pseudo event for keyboard page up with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sappageupmodifiers
	 */

	/**
	 * Pseudo event for keyboard page down without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sappagedown
	 */

	/**
	 * Pseudo event for keyboard page down with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sappagedownmodifiers
	 */

	/**
	 * Pseudo event for pseudo 'select' event... space, enter, ... without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapselect
	 */

	/**
	 * Pseudo event for pseudo 'select' event... space, enter, ... with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapselectmodifiers
	 */

	/**
	 * Pseudo event for keyboard space without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapspace
	 */

	/**
	 * Pseudo event for keyboard space with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapspacemodifiers
	 */

	/**
	 * Pseudo event for keyboard enter without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapenter
	 */

	/**
	 * Pseudo event for keyboard enter with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapentermodifiers
	 */

	/**
	 * Pseudo event for keyboard backspace without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapbackspace
	 */

	/**
	 * Pseudo event for keyboard backspace with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapbackspacemodifiers
	 */

	/**
	 * Pseudo event for keyboard delete without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapdelete
	 */

	/**
	 * Pseudo event for keyboard delete with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapdeletemodifiers
	 */

	/**
	 * Pseudo event for pseudo expand event (keyboard numpad +) without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapexpand
	 */

	/**
	 * Pseudo event for pseudo expand event (keyboard numpad +) with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapexpandmodifiers
	 */

	/**
	 * Pseudo event for pseudo collapse event (keyboard numpad -) without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapcollapse
	 */

	/**
	 * Pseudo event for pseudo collapse event (keyboard numpad -) with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapcollapsemodifiers
	 */

	/**
	 * Pseudo event for pseudo collapse event (keyboard numpad *)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapcollapseall
	 */

	/**
	 * Pseudo event for keyboard escape
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapescape
	 */

	/**
	 * Pseudo event for keyboard tab (TAB + no modifier)
	 * @public
	 * @name jQuery.sap.PseudoEvents.saptabnext
	 */

	/**
	 * Pseudo event for keyboard tab (TAB + shift modifier)
	 * @public
	 * @name jQuery.sap.PseudoEvents.saptabprevious
	 */

	/**
	 * Pseudo event for pseudo skip forward (F6 + no modifier)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapskipforward
	 */

	/**
	 * Pseudo event for pseudo skip back (F6 + shift modifier)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapskipback
	 */

	/**
	 * Pseudo event for pseudo 'decrease' event without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapdecrease
	 */

	/**
	 * Pseudo event for pressing the '-' (minus) sign.
	 * @since 1.25.0
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapminus
	 */

	/**
	 * Pseudo event for pseudo 'decrease' event with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapdecreasemodifiers
	 */

	/**
	 * Pseudo event for pseudo 'increase' event without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapincrease
	 */

	/**
	 * Pseudo event for pressing the '+' (plus) sign.
	 * @since 1.25.0
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapplus
	 */

	/**
	 * Pseudo event for pseudo 'increase' event with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapincreasemodifiers
	 */

	/**
	 * Pseudo event for pseudo 'previous' event without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapprevious
	 */

	/**
	 * Pseudo event for pseudo 'previous' event with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sappreviousmodifiers
	 */

	/**
	 * Pseudo event for pseudo 'next' event without modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapnext
	 */

	/**
	 * Pseudo event for pseudo 'next' event with modifiers (Ctrl, Alt or Shift)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapnextmodifiers
	 */

	/**
	 * Pseudo event indicating delayed double click (e.g. for inline edit)
	 * @public
	 * @name jQuery.sap.PseudoEvents.sapdelayeddoubleclick
	 */

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
	 * @namespace
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/events/ControlEvents.events} instead
	 */
	jQuery.sap.ControlEvents = ControlEvents.events;

	/**
	 * Disable touch to mouse handling
	 *
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/events/jquery/EventSimulation.disableTouchToMouseHandling} instead
	 */
	jQuery.sap.disableTouchToMouseHandling = EventSimulation.disableTouchToMouseHandling;

	/**
	 * Defines touch event mode. Values used 'ON' and 'SIM'.
	 * @private
	 * @deprecated since 1.58 use {@link module:sap/ui/events/jquery/EventSimulation.touchEventMode} instead
	 */
	defineCoupledProperty(jQuery.sap, "touchEventMode", EventSimulation, "touchEventMode");

	/**
	 * Binds all events for listening with the given callback function.
	 *
	 * @param {function} fnCallback Callback function
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/events/ControlEvents.bindAnyEvent} instead
	 */
	jQuery.sap.bindAnyEvent = ControlEvents.bindAnyEvent;

	/**
	 * Unbinds all events for listening with the given callback function.
	 *
	 * @param {function} fnCallback Callback function
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/events/ControlEvents.unbindAnyEvent} instead
	 */
	jQuery.sap.unbindAnyEvent = ControlEvents.unbindAnyEvent;

	/**
	 * Checks a given mouseover or mouseout event whether it is
	 * equivalent to a mouseenter or mousleave event regarding the given DOM reference.
	 *
	 * @param {jQuery.Event} oEvent
	 * @param {Element} oDomRef
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/events/checkMouseEnterOrLeave} instead
	 */
	jQuery.sap.checkMouseEnterOrLeave = fnCheckMouseEnterOrLeave;

	/**
	* Detect whether the pressed key is:
	* SHIFT, CONTROL, ALT, BREAK, CAPS_LOCK,
	* PAGE_UP, PAGE_DOWN, END, HOME, ARROW_LEFT, ARROW_UP, ARROW_RIGHT, ARROW_DOWN,
	* PRINT, INSERT, DELETE, F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12,
	* BACKSPACE, TAB, ENTER, ESCAPE
	*
	* @param {jQuery.Event} oEvent The event object of the <code>keydown</code>, <code>keyup</code> or <code>keypress</code> events.
	* @static
	* @returns {boolean}
	* @protected
	* @since 1.24.0
	* @experimental Since 1.24.0 Implementation might change.
	* @function
	* @deprecated since 1.58 use {@link module:sap/ui/events/isSpecialKey} instead
	*/
	jQuery.sap.isSpecialKey = function(oEvent) {
		if (oEvent.key) {
			return fnIsSpecialKey(oEvent);
		}

		// legacy case where Event.key is not use, e.g. when jQuery.Events are created manually instead of using the Browser's KeyBoardEvent

		/**
		 * Detect whether the pressed key is a modifier.
		 *
		 * Modifier keys are considered:
		 * SHIFT, CONTROL, ALT, CAPS_LOCK, NUM_LOCK
		 * These keys don't send characters, but modify the characters sent by other keys.
		 *
		 * @param {jQuery.Event} oEvent The event object of the <code>keydown</code>, <code>keyup</code> or <code>keypress</code> events.
		 * @static
		 * @returns {boolean} True if a modifier key was pressed
		 */
		function isModifierKey(oEvent) {
			var iKeyCode = oEvent.which; // jQuery oEvent.which normalizes oEvent.keyCode and oEvent.charCode

			return (iKeyCode === KeyCodes.SHIFT) ||
				(iKeyCode === KeyCodes.CONTROL) ||
				(iKeyCode === KeyCodes.ALT) ||
				(iKeyCode === KeyCodes.CAPS_LOCK) ||
				(iKeyCode === KeyCodes.NUM_LOCK);
		}

		/**
		 * Detect whether the pressed key is a navigation key.
		 *
		 * Navigation keys are considered:
		 * ARROW_LEFT, ARROW_UP, ARROW_RIGHT, ARROW_DOWN
		 *
		 * @param {jQuery.Event} oEvent The event object of the <code>keydown</code>, <code>keyup</code> or <code>keypress</code> events.
		 * @static
		 * @returns {boolean} True if a arrow key was pressed
		 */
		function isArrowKey(oEvent) {
			var iKeyCode = oEvent.which, // jQuery oEvent.which normalizes oEvent.keyCode and oEvent.charCode
				bArrowKey = (iKeyCode >= 37 && iKeyCode <= 40); // ARROW_LEFT, ARROW_UP, ARROW_RIGHT, ARROW_DOWN

			switch (oEvent.type) {
				case "keydown":
				case "keyup":
					return bArrowKey;

				// note: the keypress event should be fired only when a character key is pressed,
				// unfortunately some browsers fire the keypress event for other keys. e.g.:
				//
				// Firefox fire it for:
				// ARROW_LEFT, ARROW_RIGHT
				case "keypress":

					// in Firefox, almost all noncharacter keys that fire the keypress event have a key code of 0
					return iKeyCode === 0;

				default:
					return false;
			}
		}

		var iKeyCode = oEvent.which, // jQuery oEvent.which normalizes oEvent.keyCode and oEvent.charCode
			bSpecialKey = isModifierKey(oEvent) ||
				isArrowKey(oEvent) ||
				(iKeyCode >= 33 && iKeyCode <= 36) || // PAGE_UP, PAGE_DOWN, END, HOME
				(iKeyCode >= 44 && iKeyCode <= 46) || // PRINT, INSERT, DELETE
				(iKeyCode >= 112 && iKeyCode <= 123) || // F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12
				(iKeyCode === KeyCodes.BREAK) ||
				(iKeyCode === KeyCodes.BACKSPACE) ||
				(iKeyCode === KeyCodes.TAB) ||
				(iKeyCode === KeyCodes.ENTER) ||
				(iKeyCode === KeyCodes.ESCAPE) ||
				(iKeyCode === KeyCodes.SCROLL_LOCK);

		switch (oEvent.type) {
			case "keydown":
			case "keyup":
				return bSpecialKey;

			// note: the keypress event should be fired only when a character key is pressed,
			// unfortunately some browsers fire the keypress event for other keys. e.g.:
			//
			// Firefox < 65 fire it for:
			// BREAK, ARROW_LEFT, ARROW_RIGHT, INSERT, DELETE,
			// F1, F2, F3, F5, F6, F7, F8, F9, F10, F11, F12
			// BACKSPACE, ESCAPE
			//
			// Safari fire it for:
			// BACKSPACE, ESCAPE
			case "keypress":
				return (iKeyCode === 0 || // in Firefox < 65, almost all noncharacter keys that fire the keypress event have a key code of 0, with the exception of BACKSPACE (key code of 8)
					iKeyCode === KeyCodes.BACKSPACE ||
					iKeyCode === KeyCodes.ESCAPE ||
					iKeyCode === KeyCodes.ENTER /* all browsers */) || false;

			default:
				return false;
		}
	};

	/**
	 * Central handler for F6 key event. Based on the current target and the given event the next element in the F6 chain is focused.
	 *
	 * This handler might be also called manually. In this case the central handler is deactivated for the given event.
	 *
	 * If the event is not a keydown event, it does not represent the F6 key, the default behavior is prevented,
	 * the handling is explicitly skipped (<code>oSettings.skip</code>) or the target (<code>oSettings.target</code>) is not contained
	 * in the used scopes (<code>oSettings.scope</code>), the event is skipped.
	 *
	 * @param {jQuery.Event} oEvent a <code>keydown</code> event object.
	 * @param {object} [oSettings] further options in case the handler is called manually.
	 * @param {boolean} [oSettings.skip=false] whether the event should be ignored by the central handler (see above)
	 * @param {Element} [oSettings.target=document.activeElement] the DOMNode which should be used as starting point to find the next DOMNode in the F6 chain.
	 * @param {Element[]} [oSettings.scope=[document]] the DOMNodes(s) which are used for the F6 chain search
	 * @static
	 * @private
	 * @since 1.25.0
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/events/F6Navigation.handleF6GroupNavigation} instead
	 */
	jQuery.sap.handleF6GroupNavigation = function (oEvent, oSettings) {
		// map keyCode to key property of the event, e.g. if jQuery.Event was created manually
		if (!oEvent.key && oEvent.keyCode === KeyCodes.F6) {
			oEvent.key = "F6";
		}
		return F6Navigation.handleF6GroupNavigation(oEvent, oSettings);

	};

	/**
	 * CustomData attribute name for fast navigation groups (in DOM additional prefix "data-" is needed)
	 * @private
	 * @deprecated since 1.58 use {@link module:sap/ui/events/F6Navigation.fastNavigationKey} instead
	 */
	jQuery.sap._FASTNAVIGATIONKEY = F6Navigation.fastNavigationKey;

	/**
	 * Whether the current browser fires mouse events after touch events with long delay (~300ms)
	 *
	 * Mobile browsers fire mouse events after touch events with a delay (~300ms)
	 * Some modern mobile browsers already removed the delay under some condition. Those browsers are:
	 *  1. iOS Safari in iOS 8 (except UIWebView / WKWebView).
	 *  2. Chrome on Android from version 32 (exclude the Samsung stock browser which also uses Chrome kernel)
	 *
	 * @param {Navigator} oNavigator the window navigator object.
	 * @private
	 * @name jQuery.sap.isMouseEventDelayed
	 * @since 1.30.0
	 * @deprecated since 1.58 use {@link module:sap/ui/events/isMouseEventDelayed} instead
	 */

	jQuery.sap._refreshMouseEventDelayedFlag = function(oNavigator) {
		jQuery.sap.isMouseEventDelayed = fnIsMouseEventDelayed.apply(this, arguments);
	};

	jQuery.sap._refreshMouseEventDelayedFlag(navigator);

	return jQuery;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * @fileoverview
 * @deprecated As of version 1.120.0
 */
sap.ui.predefine("jquery.sap.global", [
	// new sap/base/* modules
	"sap/base/util/now", "sap/base/util/Version", "sap/base/assert", "sap/base/Log",

	// new sap/ui/* modules
	"sap/ui/dom/includeScript",
	"sap/ui/dom/includeStylesheet",
	"sap/ui/security/FrameOptions", "sap/ui/performance/Measurement", "sap/ui/performance/trace/Interaction",
	"sap/base/util/LoaderExtensions",

	// former sap-ui-core.js dependencies
	"sap/ui/Device",

	"sap/ui/thirdparty/jquery",
	"ui5loader-autoconfig",
	"jquery.sap.stubs"
], function(now, Version, assert, Log,

	includeScript,
	includeStylesheet,
	FrameOptions, Measurement, Interaction,
	LoaderExtensions,

	Device,

	jQuery /* , ui5loaderAutoconfig, jquerySapStubs */) {
	"use strict";

	if ( !jQuery ) {
		throw new Error("Loading of jQuery failed");
	}

	var ui5loader = sap.ui.loader;

	if ( !ui5loader || !ui5loader._ ) {
		throw new Error("The UI5 compatilbility module requires a UI5 specific AMD implementation");
	}

	var _ui5loader = ui5loader._;

	(function() {
		/**
		 * Holds information about the browser's capabilities and quirks.
		 * This object is provided and documented by jQuery.
		 * But it is extended by SAPUI5 with detection for features not covered by jQuery. This documentation ONLY covers the detection properties added by UI5.
		 * For the standard detection properties, please refer to the jQuery documentation.
		 *
		 * These properties added by UI5 are only available temporarily until jQuery adds feature detection on their own.
		 *
		 * @name jQuery.support
		 * @namespace
		 * @private
		 * @deprecated since 1.58 use {@link sap.ui.Device} instead
		 */
		jQuery.support = jQuery.support || {};

		/**
		 * Whether the device has a retina display (window.devicePixelRatio >= 2)
		 * @type {boolean}
		 * @public
		 * @deprecated since 1.58 use {@link sap.ui.Device.support.retina} instead
		 */
		jQuery.support.retina = Device.support.retina;

		// this is also defined by jquery-mobile-custom.js, but this information is needed earlier
		jQuery.support.touch = Device.support.touch;

		/**
		 * Whether the current browser supports (2D) CSS transforms
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.cssTransforms
		 */
		jQuery.support.cssTransforms = true;

		/**
		 * Whether the current browser supports 3D CSS transforms
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.cssTransforms3d
		 */
		jQuery.support.cssTransforms3d = true;

		/**
		 * Whether the current browser supports CSS transitions
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.cssTransitions
		 */
		jQuery.support.cssTransitions = true;

		/**
		 * Whether the current browser supports (named) CSS animations
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.cssAnimations
		 */
		jQuery.support.cssAnimations = true;

		/**
		 * Whether the current browser supports CSS gradients. Note that ANY support for CSS gradients leads to "true" here, no matter what the syntax is.
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.cssGradients
		 */
		jQuery.support.cssGradients = true;

		/**
		 * Whether the current browser supports only prefixed flexible layout properties
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.flexBoxPrefixed
		 */
		jQuery.support.flexBoxPrefixed = false;

		/**
		 * Whether the current browser supports the OLD CSS3 Flexible Box Layout directly or via vendor prefixes
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.flexBoxLayout
		 */
		jQuery.support.flexBoxLayout = false;

		/**
		 * Whether the current browser supports the NEW CSS3 Flexible Box Layout directly or via vendor prefixes
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.newFlexBoxLayout
		 */
		jQuery.support.newFlexBoxLayout = true;

		/**
		 * Whether the current browser supports any kind of Flexible Box Layout directly or via vendor prefixes
		 * @type {boolean}
		 * @private
		 * @name jQuery.support.hasFlexBoxSupport
		 */
		jQuery.support.hasFlexBoxSupport = true;
	}());

	/**
	 * Root Namespace for the jQuery plug-in provided by SAP SE.
	 *
	 * @version 1.125.0
	 * @namespace
	 * @public
	 * @static
	 * @deprecated since 1.58. To avoid usage of global variables in general, please
	 *  do not use the jQuery.sap namespace any longer. Most of the jQuery.sap functionalities
	 *  are replaced by alternative modules which can be found in the API doc.
	 */
	jQuery.sap = jQuery.sap || {}; // namespace already created by jquery.sap.stubs

	// -------------------------- VERSION -------------------------------------

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
	 * @param {int|string|any[]|jQuery.sap.Version} vMajor the major part of the version (int) or any of the single
	 *        parameter variants explained above.
	 * @param {int} iMinor the minor part of the version number
	 * @param {int} iPatch the patch part of the version number
	 * @param {string} sSuffix the suffix part of the version number
	 * @return {jQuery.sap.Version} the version object as determined from the parameters
	 *
	 * @class Represents a version consisting of major, minor, patch version and suffix, e.g. '1.2.7-SNAPSHOT'.
	 *
	 * @public
	 * @since 1.15.0
	 * @alias jQuery.sap.Version
	 * @deprecated since 1.58 use {@link module:sap/base/util/Version} instead
	 */
	jQuery.sap.Version = Version;

	/**
	 * Returns a string representation of this version.
	 * @name jQuery.sap.Version#toString
	 * @return {string} a string representation of this version.
	 * @public
	 * @since 1.15.0
	 * @function
	 */

	/**
	 * Returns the major version part of this version.
	 * @name jQuery.sap.Version#getMajor
	 * @function
	 * @return {int} the major version part of this version
	 * @public
	 * @since 1.15.0
	 */

	/**
	 * Returns the minor version part of this version.
	 * @name jQuery.sap.Version#getMinor
	 * @return {int} the minor version part of this version
	 * @public
	 * @since 1.15.0
	 * @function
	 */

	/**
	 * Returns the patch (or micro) version part of this version.
	 * @name jQuery.sap.Version#getPatch
	 * @return {int} the patch version part of this version
	 * @public
	 * @since 1.15.0
	 * @function
	 */

	/**
	 * Returns the version suffix of this version.
	 *
	 * @name jQuery.sap.Version#getSuffix
	 * @return {string} the version suffix of this version
	 * @public
	 * @since 1.15.0
	 * @function
	 */

	/**
	 * Compares this version with a given one.
	 *
	 * The version with which this version should be compared can be given as a <code>jQuery.sap.Version</code> instance,
	 * as a string (e.g. <code>v.compareto("1.4.5")</code>). Or major, minor, patch and suffix values can be given as
	 * separate parameters (e.g. <code>v.compareTo(1, 4, 5)</code>) or in an array (e.g. <code>v.compareTo([1, 4, 5])</code>).
	 *
	 * @name jQuery.sap.Version#compareTo
	 * @return {int} 0, if the given version is equal to this version, a negative value if the given other version is greater
	 *               and a positive value otherwise
	 * @public
	 * @since 1.15.0
	 * @function
	 */

	/**
	 * Checks whether this version is in the range of the given interval (start inclusive, end exclusive).
	 *
	 * The boundaries against which this version should be checked can be given as  <code>jQuery.sap.Version</code>
	 * instances (e.g. <code>v.inRange(v1, v2)</code>), as strings (e.g. <code>v.inRange("1.4", "2.7")</code>)
	 * or as arrays (e.g. <code>v.inRange([1,4], [2,7])</code>).
	 *
	 * @name jQuery.sap.Version#inRange
	 * @param {string|any[]|jQuery.sap.Version} vMin the start of the range (inclusive)
	 * @param {string|any[]|jQuery.sap.Version} vMax the end of the range (exclusive)
	 * @return {boolean} <code>true</code> if this version is greater or equal to <code>vMin</code> and smaller
	 *                   than <code>vMax</code>, <code>false</code> otherwise.
	 * @public
	 * @since 1.15.0
	 * @function
	 */

	/**
	 * Returns a high resolution timestamp in microseconds if supported by the environment, otherwise in milliseconds.
	 * The timestamp is based on 01/01/1970 00:00:00 (UNIX epoch) as float with microsecond precision or
	 * with millisecond precision, if high resolution timestamps are not available.
	 * The fractional part of the timestamp represents fractions of a millisecond.
	 * Converting to a <code>Date</code> is possible by using <code>require(["sap/base/util/now"], function(now){new Date(now());}</code>
	 *
	 * @returns {float} timestamp in microseconds if supported by the environment otherwise in milliseconds
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/util/now} instead
	 */
	jQuery.sap.now = now;

	/**
	 * Reads the value for the given key from the localStorage or writes a new value to it.
	 * @deprecated Since 1.120
	 */
	var fnMakeLocalStorageAccessor = function(key, type, callback) {
		return function(value) {
			try {
				if ( value != null || type === 'string' ) {
					if (value) {
						localStorage.setItem(key, type === 'boolean' ? 'X' : value);
					} else {
						localStorage.removeItem(key);
					}
					callback(value);
				}
				value = localStorage.getItem(key);
				return type === 'boolean' ? value === 'X' : value;
			} catch (e) {
				Log.warning("Could not access localStorage while accessing '" + key + "' (value: '" + value + "', are cookies disabled?): " + e.message);
			}
		};
	};

	/**
	 * @deprecated Since 1.120
	 */
	jQuery.sap.debug = fnMakeLocalStorageAccessor.call(this, 'sap-ui-debug', '', function(vDebugInfo) {
		/*eslint-disable no-alert */
		alert("Usage of debug sources is " + (vDebugInfo ? "on" : "off") + " now.\nFor the change to take effect, you need to reload the page.");
		/*eslint-enable no-alert */
	});

	/**
	 * Sets the URL to reboot this app from, the next time it is started. Only works with localStorage API available
	 * (and depending on the browser, if cookies are enabled, even though cookies are not used).
	 *
	 * @param {string} sRebootUrl the URL to sap-ui-core.js, from which the application should load UI5 on next restart; undefined clears the restart URL
	 * @returns {string|undefined} the current reboot URL or undefined in case of an error or when the reboot URL has been cleared
	 *
	 * @private
	 * @function
	 * @deprecated since 1.58
	 */
	jQuery.sap.setReboot = fnMakeLocalStorageAccessor.call(this, 'sap-ui-reboot-URL', 'string', function(sRebootUrl) { // null-ish clears the reboot request
		if ( sRebootUrl ) {
			/*eslint-disable no-alert */
			alert("Next time this app is launched (only once), it will load UI5 from:\n" + sRebootUrl + ".\nPlease reload the application page now.");
			/*eslint-enable no-alert */
		}
	});

	jQuery.sap.statistics = fnMakeLocalStorageAccessor.call(this, 'sap-ui-statistics', 'boolean', function(bUseStatistics) {
		/*eslint-disable no-alert */
		alert("Usage of Gateway statistics " + (bUseStatistics ? "on" : "off") + " now.\nFor the change to take effect, you need to reload the page.");
		/*eslint-enable no-alert */
	});

	// -------------------------- Logging -------------------------------------

	/**
	 * Creates a new Logger instance which will use the given component string
	 * for all logged messages without a specific component.
	 *
	 * @name jQuery.sap.log.Logger
	 * @param {string} sDefaultComponent The component to use
	 * @class A Logger class
	 * @since 1.1.2
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/base/Log.getLogger} instead
	 */

	/**
	 * Creates a new fatal-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage Message text to display
	 * @param {string} [sDetails=''] Details about the message, might be omitted
	 * @param {string} [sComponent=''] Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo] Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with <code>logSupportInfo(true)</code>.
	 *   To avoid negative effects regarding execution times and memory consumption, the returned object should be a simple
	 *   immutable JSON object with mostly static and stable content.
	 * @return {jQuery.sap.log.Logger} The log instance for method chaining
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 * @name jQuery.sap.log.Logger#fatal
	 * @function
	 */

	/**
	 * Creates a new error-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage Message text to display
	 * @param {string} [sDetails=''] Details about the message, might be omitted
	 * @param {string} [sComponent=''] Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo] Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with <code>logSupportInfo(true)</code>.
	 *   To avoid negative effects regarding execution times and memory consumption, the returned object should be a simple
	 *   immutable JSON object with mostly static and stable content.
	 * @return {jQuery.sap.log.Logger} The log instance
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 * @name jQuery.sap.log.Logger#error
	 * @function
	 */

	/**
	 * Creates a new warning-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage Message text to display
	 * @param {string} [sDetails=''] Details about the message, might be omitted
	 * @param {string} [sComponent=''] Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo] Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with <code>logSupportInfo(true)</code>.
	 *   To avoid negative effects regarding execution times and memory consumption, the returned object should be a simple
	 *   immutable JSON object with mostly static and stable content.
	 * @return {jQuery.sap.log.Logger} The log instance
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 * @name jQuery.sap.log.Logger#warning
	 * @function
	 */

	/**
	 * Creates a new info-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage Message text to display
	 * @param {string} [sDetails=''] Details about the message, might be omitted
	 * @param {string} [sComponent=''] Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo] Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with <code>logSupportInfo(true)</code>.
	 *   To avoid negative effects regarding execution times and memory consumption, the returned object should be a simple
	 *   immutable JSON object with mostly static and stable content.
	 * @return {jQuery.sap.log.Logger} The log instance
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 * @name jQuery.sap.log.Logger#info
	 * @function
	 */

	/**
	 * Creates a new debug-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage Message text to display
	 * @param {string} [sDetails=''] Details about the message, might be omitted
	 * @param {string} [sComponent=''] Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo] Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with <code>logSupportInfo(true)</code>.
	 *   To avoid negative effects regarding execution times and memory consumption, the returned object should be a simple
	 *   immutable JSON object with mostly static and stable content.
	 * @return {jQuery.sap.log.Logger} The log instance
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 * @name jQuery.sap.log.Logger#debug
	 * @function
	 */

	/**
	 * Creates a new trace-level entry in the log with the given message, details and calling component.
	 *
	 * @param {string} sMessage Message text to display
	 * @param {string} [sDetails=''] Details about the message, might be omitted
	 * @param {string} [sComponent=''] Name of the component that produced the log entry
	 * @param {function} [fnSupportInfo] Callback that returns an additional support object to be logged in support mode.
	 *   This function is only called if support info mode is turned on with <code>logSupportInfo(true)</code>.
	 *   To avoid negative effects regarding execution times and memory consumption, the returned object should be a simple
	 *   immutable JSON object with mostly static and stable content.
	 * @return {jQuery.sap.log.Logger} The log-instance
	 * @public
	 * @SecSink {0 1 2|SECRET} Could expose secret data in logs
	 * @name jQuery.sap.log.Logger#trace
	 * @function
	 */

	/**
	 * Defines the maximum <code>jQuery.sap.log.Level</code> of log entries that will be recorded.
	 * Log entries with a higher (less important) log level will be omitted from the log.
	 * When a component name is given, the log level will be configured for that component
	 * only, otherwise the log level for the default component of this logger is set.
	 * For the global logger, the global default level is set.
	 *
	 * <b>Note</b>: Setting a global default log level has no impact on already defined
	 * component log levels. They always override the global default log level.
	 *
	 * @param {jQuery.sap.log.Level} iLogLevel The new log level
	 * @param {string} [sComponent] The log component to set the log level for
	 * @return {jQuery.sap.log.Logger} This logger object to allow method chaining
	 * @public
	 * @name jQuery.sap.log.Logger#setLevel
	 * @function
	 */

	/**
	 * Returns the log level currently effective for the given component.
	 * If no component is given or when no level has been configured for a
	 * given component, the log level for the default component of this logger is returned.
	 *
	 * @param {string} [sComponent] Name of the component to retrieve the log level for
	 * @return {int} The log level for the given component or the default log level
	 * @public
	 * @since 1.1.2
	 * @name jQuery.sap.log.Logger#getLevel
	 * @function
	 */

	/**
	 * Checks whether logging is enabled for the given log level,
	 * depending on the currently effective log level for the given component.
	 *
	 * If no component is given, the default component of this logger will be taken into account.
	 *
	 * @param {int} [iLevel=Level.DEBUG] The log level in question
	 * @param {string} [sComponent] Name of the component to check the log level for
	 * @return {boolean} Whether logging is enabled or not
	 * @public
	 * @since 1.13.2
	 * @name jQuery.sap.log.Logger#isLoggable
	 * @function
	 */

	/**
	 * A Logging API for JavaScript.
	 *
	 * Provides methods to manage a client-side log and to create entries in it. Each of the logging methods
	 * {@link jQuery.sap.log.debug}, {@link jQuery.sap.log.info}, {@link jQuery.sap.log.warning},
	 * {@link jQuery.sap.log.error} and {@link jQuery.sap.log.fatal} creates and records a log entry,
	 * containing a timestamp, a log level, a message with details and a component info.
	 * The log level will be one of {@link jQuery.sap.log.Level} and equals the name of the concrete logging method.
	 *
	 * By using the {@link jQuery.sap.log.setLevel} method, consumers can determine the least important
	 * log level which should be recorded. Less important entries will be filtered out. (Note that higher numeric
	 * values represent less important levels). The initially set level depends on the mode that UI5 is running in.
	 * When the optimized sources are executed, the default level will be {@link jQuery.sap.log.Level.ERROR}.
	 * For normal (debug sources), the default level is {@link jQuery.sap.log.Level.DEBUG}.
	 *
	 * All logging methods allow to specify a <b>component</b>. These components are simple strings and
	 * don't have a special meaning to the UI5 framework. However they can be used to semantically group
	 * log entries that belong to the same software component (or feature). There are two APIs that help
	 * to manage logging for such a component. With <code>{@link jQuery.sap.log.getLogger}(sComponent)</code>,
	 * one can retrieve a logger that automatically adds the given <code>sComponent</code> as component
	 * parameter to each log entry, if no other component is specified. Typically, JavaScript code will
	 * retrieve such a logger once during startup and reuse it for the rest of its lifecycle.
	 * Second, the {@link jQuery.sap.log.Logger#setLevel}(iLevel, sComponent) method allows to set the log level
	 * for a specific component only. This allows a more fine granular control about the created logging entries.
	 * {@link jQuery.sap.log.Logger#getLevel} allows to retrieve the currently effective log level for a given
	 * component.
	 *
	 * {@link jQuery.sap.log.getLogEntries} returns an array of the currently collected log entries.
	 *
	 * Furthermore, a listener can be registered to the log. It will be notified whenever a new entry
	 * is added to the log. The listener can be used for displaying log entries in a separate page area,
	 * or for sending it to some external target (server).
	 *
	 * @since 0.9.0
	 * @namespace
	 * @public
	 * @borrows jQuery.sap.log.Logger#fatal as fatal
	 * @borrows jQuery.sap.log.Logger#error as error
	 * @borrows jQuery.sap.log.Logger#warning as warning
	 * @borrows jQuery.sap.log.Logger#info as info
	 * @borrows jQuery.sap.log.Logger#debug as debug
	 * @borrows jQuery.sap.log.Logger#trace as trace
	 * @borrows jQuery.sap.log.Logger#getLevel as getLevel
	 * @borrows jQuery.sap.log.Logger#setLevel as setLevel
	 * @borrows jQuery.sap.log.Logger#isLoggable as isLoggable
	 * @deprecated since 1.58 use {@link module:sap/base/Log} instead
	 */
	jQuery.sap.log = Object.assign(Log.getLogger(), /** @lends jQuery.sap.log */ {

		/**
		 * Enumeration of the configurable log levels that a Logger should persist to the log.
		 *
		 * Only if the current LogLevel is higher than the level {@link jQuery.sap.log.Level} of the currently added log entry,
		 * then this very entry is permanently added to the log. Otherwise it is ignored.
		 * @see jQuery.sap.log.Logger#setLevel
		 * @enum {int}
		 * @public
		 * @deprecated since 1.58 use {@link module:sap/base/Log.Level} instead
		 */
		Level: Log.Level,

		/**
		 * Do not log anything
		 * @public
		 * @name jQuery.sap.log.Level.NONE
		 * @type {int}
		 */
		/**
		 * Fatal level. Use this for logging unrecoverable situations
		 * @public
		 * @name jQuery.sap.log.Level.FATAL
		 * @type {int}
		 */
		/**
		 * Error level. Use this for logging of erroneous but still recoverable situations
		 * @public
		 * @name jQuery.sap.log.Level.ERROR
		 * @type {int}
		 */
		/**
		 * Warning level. Use this for logging unwanted but foreseen situations
		 * @public
		 * @name jQuery.sap.log.Level.WARNING
		 * @type {int}
		 */
		/**
		 * Info level. Use this for logging information of purely informative nature
		 * @public
		 * @name jQuery.sap.log.Level.INFO
		 * @type {int}
		 */
		/**
		 * Debug level. Use this for logging information necessary for debugging
		 * @public
		 * @name jQuery.sap.log.Level.DEBUG
		 * @type {int}
		 */
		/**
		 * Trace level. Use this for tracing the program flow.
		 * @public
		 * @name jQuery.sap.log.Level.TRACE
		 * @type {int}
		 */
		/**
		 * Trace level to log everything.
		 * @public
		 * @name jQuery.sap.log.Level.ALL
		 * @type {int}
		 */

		/**
		 * Returns a {@link jQuery.sap.log.Logger} for the given component.
		 *
		 * The method might or might not return the same logger object across multiple calls.
		 * While loggers are assumed to be light weight objects, consumers should try to
		 * avoid redundant calls and instead keep references to already retrieved loggers.
		 *
		 * The optional second parameter <code>iDefaultLogLevel</code> allows to specify
		 * a default log level for the component. It is only applied when no log level has been
		 * defined so far for that component (ignoring inherited log levels). If this method is
		 * called multiple times for the same component but with different log levels,
		 * only the first call one might be taken into account.
		 *
		 * @param {string} sComponent Component to create the logger for
		 * @param {int} [iDefaultLogLevel] a default log level to be used for the component,
		 *   if no log level has been defined for it so far.
		 * @return {jQuery.sap.log.Logger} A logger for the component.
		 * @public
		 * @static
		 * @since 1.1.2
		 * @function
		 */
		getLogger: Log.getLogger,

		/**
		 * Returns the logged entries recorded so far as an array.
		 *
		 * Log entries are plain JavaScript objects with the following properties
		 * <ul>
		 * <li>timestamp {number} point in time when the entry was created</li>
		 * <li>level {int} LogLevel level of the entry</li>
		 * <li>message {string} message text of the entry</li>
		 * </ul>
		 *
		 * @return {object[]} an array containing the recorded log entries
		 * @public
		 * @static
		 * @since 1.1.2
		 * @function
		 */
		getLogEntries: Log.getLogEntries,

		/**
		 * Allows to add a new LogListener that will be notified for new log entries.
		 *
		 * The given object must provide method <code>onLogEntry</code> and can also be informed
		 * about <code>onDetachFromLog</code> and <code>onAttachToLog</code>
		 * @param {object} oListener The new listener object that should be informed
		 * @return {jQuery.sap.log} The global logger
		 * @public
		 * @static
		 * @function
		 */
		addLogListener: Log.addLogListener,

		/**
		 * Allows to remove a registered LogListener.
		 * @param {object} oListener The new listener object that should be removed
		 * @return {jQuery.sap.log} The global logger
		 * @public
		 * @static
		 * @function
		 */
		removeLogListener: Log.removeLogListener,

		/**
		 * Enables or disables whether additional support information is logged in a trace.
		 * If enabled, logging methods like error, warning, info and debug are calling the additional
		 * optional callback parameter fnSupportInfo and store the returned object in the log entry property supportInfo.
		 *
		 * @param {boolean} bEnabled true if the support information should be logged
		 * @private
		 * @static
		 * @since 1.46.0
		 * @function
		 */
		logSupportInfo: Log.logSupportInfo,

		/**
		 * Enumeration of levels that can be used in a call to {@link jQuery.sap.log.Logger#setLevel}(iLevel, sComponent).
		 *
		 * @deprecated Since 1.1.2. To streamline the Logging API a bit, the separation between Level and LogLevel has been given up.
		 * Use the (enriched) enumeration {@link jQuery.sap.log.Level} instead.
		 * @enum
		 * @public
		 */
		LogLevel: Log.Level,

		/**
		 * Retrieves the currently recorded log entries.
		 * @deprecated Since 1.1.2. To avoid confusion with getLogger, this method has been renamed to {@link jQuery.sap.log.getLogEntries}.
		 * @function
		 * @public
		 */
		getLog: Log.getLogEntries

	});


	var sWindowName = (typeof window === "undefined" || window.top == window) ? "" : "[" + window.location.pathname.split('/').slice(-1)[0] + "] ";

	/**
	 * A simple assertion mechanism that logs a message when a given condition is not met.
	 *
	 * <b>Note:</b> Calls to this method might be removed when the JavaScript code
	 *              is optimized during build. Therefore, callers should not rely on any side effects
	 *              of this method.
	 *
	 * @param {boolean} bResult Result of the checked assertion
	 * @param {string|function} vMessage Message that will be logged when the result is <code>false</code>. In case this is a function, the return value of the function will be displayed. This can be used to execute complex code only if the assertion fails.
	 *
	 * @public
	 * @static
	 * @SecSink {1|SECRET} Could expose secret data in logs
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/assert} instead
	 */
	jQuery.sap.assert = function(bResult, vMessage) {
		if (!bResult) {
			var sMessage = typeof vMessage === "function" ? vMessage() : vMessage;
			assert(bResult, sWindowName + sMessage);
		}
	};

	// ------------------------------------------- OBJECT --------------------------------------------------------

	/**
	 * Returns a new constructor function that creates objects with
	 * the given prototype.
	 *
	 * As of 1.45.0, this method has been deprecated. Use the following code pattern instead:
	 * <pre>
	 *   function MyFunction() {
	 *   };
	 *   MyFunction.prototype = oPrototype;
	 * </pre>
	 * @param {object} oPrototype Prototype to use for the new objects
	 * @return {function} the newly created constructor function
	 * @public
	 * @static
	 * @deprecated As of 1.45.0, define your own function and assign <code>oPrototype</code> to its <code>prototype</code> property instead.
	 */
	jQuery.sap.factory = function factory(oPrototype) {
		jQuery.sap.assert(typeof oPrototype == "object", "oPrototype must be an object (incl. null)");
		function Factory() {}
		Factory.prototype = oPrototype;
		return Factory;
	};

	/**
	 * Returns a new object which has the given <code>oPrototype</code> as its prototype.
	 *
	 * If several objects with the same prototype are to be created,
	 * {@link jQuery.sap.factory} should be used instead.
	 *
	 * @param {object} oPrototype Prototype to use for the new object
	 * @return {object} new object
	 * @public
	 * @static
	 * @deprecated As of 1.45.0, use <code>Object.create(oPrototype)</code> instead.
	 */
	jQuery.sap.newObject = function newObject(oPrototype) {
		jQuery.sap.assert(typeof oPrototype == "object", "oPrototype must be an object (incl. null)");
		// explicitly fall back to null for best compatibility with old implementation
		return Object.create(oPrototype || null);
	};

	/**
	 * Returns a new function that returns the given <code>oValue</code> (using its closure).
	 *
	 * Avoids the need for a dedicated member for the value.
	 *
	 * As closures don't come for free, this function should only be used when polluting
	 * the enclosing object is an absolute "must-not" (as it is the case in public base classes).
	 *
	 * @param {object} oValue The value that the getter should return
	 * @returns {function} The new getter function
	 * @public
	 * @static
	 * @function
	 * @deprecated as of version 1.58. Use native JavaScript instead.
	 */
	jQuery.sap.getter = function(oValue) {
		return function() {
			return oValue;
		};
	};

	/**
	 * Returns a JavaScript object which is identified by a sequence of names.
	 *
	 * A call to <code>getObject("a.b.C")</code> has essentially the same effect
	 * as accessing <code>window.a.b.C</code> but with the difference that missing
	 * intermediate objects (a or b in the example above) don't lead to an exception.
	 *
	 * When the addressed object exists, it is simply returned. If it doesn't exists,
	 * the behavior depends on the value of the second, optional parameter
	 * <code>iNoCreates</code> (assuming 'n' to be the number of names in the name sequence):
	 * <ul>
	 * <li>NaN: if iNoCreates is not a number and the addressed object doesn't exist,
	 *          then <code>getObject()</code> returns <code>undefined</code>.
	 * <li>0 &lt; iNoCreates &lt; n: any non-existing intermediate object is created, except
	 *          the <i>last</i> <code>iNoCreates</code> ones.
	 * </ul>
	 *
	 * Example:
	 * <pre>
	 *   getObject()            -- returns the context object (either param or window)
	 *   getObject("a.b.C")     -- will only try to get a.b.C and return undefined if not found.
	 *   getObject("a.b.C", 0)  -- will create a, b, and C in that order if they don't exists
	 *   getObject("a.b.c", 1)  -- will create a and b, but not C.
	 * </pre>
	 *
	 * When a <code>oContext</code> is given, the search starts in that object.
	 * Otherwise it starts in the <code>window</code> object that this plugin
	 * has been created in.
	 *
	 * Note: Although this method internally uses <code>object["key"]</code> to address object
	 *       properties, it does not support all possible characters in a name.
	 *       Especially the dot ('.') is not supported in the individual name segments,
	 *       as it is always interpreted as a name separator.
	 *
	 * @param {string} sName  a dot separated sequence of names that identify the required object
	 * @param {int}    [iNoCreates=NaN] number of objects (from the right) that should not be created
	 * @param {object} [oContext=window] the context to execute the search in
	 * @returns {function} The value of the named object
	 *
	 * @public
	 * @static
	 * @deprecated since 1.58 use {@link module:sap/base/util/ObjectPath.get} or
	 *  {@link module:sap/base/util/ObjectPath.set} instead
	 */
	jQuery.sap.getObject = function(sName, iNoCreates, oContext) {
		var oObject = oContext || window,
			aNames = (sName || "").split("."),
			l = aNames.length,
			iEndCreate = isNaN(iNoCreates) ? 0 : l - iNoCreates,
			i;

		if ( sap.ui.loader._.getSyncCallBehavior() && oContext === window ) {
			Log.error("[nosync] getObject called to retrieve global name '" + sName + "'");
		}

		for (i = 0; oObject && i < l; i++) {
			if (!oObject[aNames[i]] && i < iEndCreate ) {
				oObject[aNames[i]] = {};
			}
			oObject = oObject[aNames[i]];
		}
		return oObject;
	};

	/**
	 * Sets an object property to a given value, where the property is
	 * identified by a sequence of names (path).
	 *
	 * When a <code>oContext</code> is given, the path starts in that object.
	 * Otherwise it starts in the <code>window</code> object that this plugin
	 * has been created for.
	 *
	 * Note: Although this method internally uses <code>object["key"]</code> to address object
	 *       properties, it does not support all possible characters in a name.
	 *       Especially the dot ('.') is not supported in the individual name segments,
	 *       as it is always interpreted as a name separator.
	 *
	 * @param {string} sName  a dot separated sequence of names that identify the property
	 * @param {any}    vValue value to be set, can have any type
	 * @param {object} [oContext=window] the context to execute the search in
	 * @public
	 * @static
	 * @deprecated since 1.58 use {@link module:sap/base/util/ObjectPath.set} instead
	 */
	jQuery.sap.setObject = function (sName, vValue, oContext) {
		var oObject = oContext || window,
			aNames = (sName || "").split("."),
			l = aNames.length, i;

		if ( l > 0 ) {
			for (i = 0; oObject && i < l - 1; i++) {
				if (!oObject[aNames[i]] ) {
					oObject[aNames[i]] = {};
				}
				oObject = oObject[aNames[i]];
			}
			oObject[aNames[l - 1]] = vValue;
		}
	};

	// ---------------------- performance measurement -----------------------------------------------------------

	/**
	 * Namespace for the jQuery performance measurement plug-in provided by SAP SE.
	 *
	 * @name jQuery.sap.measure
	 * @namespace
	 * @public
	 * @static
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement} or {@link module:sap/ui/performance/trace/Interaction} instead
	 */
	jQuery.sap.measure = Measurement;

	/**
	 * Gets the current state of the performance measurement functionality
	 *
	 * @name jQuery.sap.measure.getActive
	 * @function
	 * @return {boolean} current state of the performance measurement functionality
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.getActive} instead
	 */

	/**
	 * Activates or deactivates the performance measure functionality
	 * Optionally a category or list of categories can be passed to restrict measurements to certain categories
	 * like "javascript", "require", "xmlhttprequest", "render"
	 * @param {boolean} bOn - state of the performance measurement functionality to set
	 * @param {string | string[]} aCategories - An optional list of categories that should be measured
	 *
	 * @return {boolean} current state of the performance measurement functionality
	 * @name jQuery.sap.measure#setActive
	 * @function
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.setActive} instead
	 */

	/**
	 * Starts a performance measure.
	 * Optionally a category or list of categories can be passed to allow filtering of measurements.
	 *
	 * @name jQuery.sap.measure.start
	 * @function
	 * @param {string} sId ID of the measurement
	 * @param {string} sInfo Info for the measurement
	 * @param {string | string[]} [aCategories = "javascript"] An optional list of categories for the measure
	 *
	 * @return {object} current measurement containing id, info and start-timestamp (false if error)
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.start} instead
	 */

	/**
	 * Pauses a performance measure
	 *
	 * @name jQuery.sap.measure.pause
	 * @function
	 * @param {string} sId ID of the measurement
	 * @return {object} current measurement containing id, info and start-timestamp, pause-timestamp (false if error)
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.pause} instead
	 */

	/**
	 * Resumes a performance measure
	 *
	 * @name jQuery.sap.measure.resume
	 * @function
	 * @param {string} sId ID of the measurement
	 * @return {object} current measurement containing id, info and start-timestamp, resume-timestamp (false if error)
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.resume} instead
	 */

	/**
	 * Ends a performance measure
	 *
	 * @name jQuery.sap.measure.end
	 * @function
	 * @param {string} sId ID of the measurement
	 * @return {object} current measurement containing id, info and start-timestamp, end-timestamp, time, duration (false if error)
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.end} instead
	 */

	/**
	 * Clears all performance measurements
	 *
	 * @name jQuery.sap.measure.clear
	 * @function
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.clear} instead
	 */

	/**
	 * Removes a performance measure
	 *
	 * @name jQuery.sap.measure.remove
	 * @function
	 * @param {string} sId ID of the measurement
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.remove} instead
	 */

	/**
	 * Adds a performance measurement with all data
	 * This is useful to add external measurements (e.g. from a backend) to the common measurement UI
	 *
	 * @name jQuery.sap.measure.add
	 * @function
	 * @param {string} sId ID of the measurement
	 * @param {string} sInfo Info for the measurement
	 * @param {int} iStart start timestamp
	 * @param {int} iEnd end timestamp
	 * @param {int} iTime time in milliseconds
	 * @param {int} iDuration effective time in milliseconds
	 * @param {string | string[]} [aCategories = "javascript"] An optional list of categories for the measure
	 * @return {object} [] current measurement containing id, info and start-timestamp, end-timestamp, time, duration, categories (false if error)
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.add} instead
	 */

	/**
	 * Starts an average performance measure.
	 * The duration of this measure is an avarage of durations measured for each call.
	 * Optionally a category or list of categories can be passed to allow filtering of measurements.
	 *
	 * @name jQuery.sap.measure.average
	 * @function
	 * @param {string} sId ID of the measurement
	 * @param {string} sInfo Info for the measurement
	 * @param {string | string[]} [aCategories = "javascript"] An optional list of categories for the measure
	 * @return {object} current measurement containing id, info and start-timestamp (false if error)
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.average} instead
	 */

	/**
	 * Gets a performance measure
	 *
	 * @name jQuery.sap.measure.getMeasurement
	 * @function
	 * @param {string} sId ID of the measurement
	 * @return {object} current measurement containing id, info and start-timestamp, end-timestamp, time, duration (false if error)
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.getMeasurement} instead
	 */

	/**
	 * Gets all performance measurements
	 *
	 * @name jQuery.sap.measure.getAllMeasurements
	 * @function
	 * @param {boolean} [bCompleted] Whether only completed measurements should be returned, if explicitly set to false only incomplete measurements are returned
	 * @return {object[]} current array with measurements containing id, info and start-timestamp, end-timestamp, time, duration, categories
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.getAllMeasurements} instead
	 */

	/**
	 * Gets all performance measurements where a provided filter function returns a truthy value.
	 * If neither a filter function nor a category is provided an empty array is returned.
	 * To filter for certain properties of measurements a fnFilter can be implemented like this
	 * <code>
	 * function(oMeasurement) {
	 *     return oMeasurement.duration > 50;
	 * }</code>
	 *
	 * @name jQuery.sap.measure.filterMeasurements
	 * @function
	 * @param {function} [fnFilter] a filter function that returns true if the passed measurement should be added to the result
	 * @param {boolean|undefined} [bCompleted] Optional parameter to determine if either completed or incomplete measurements should be returned (both if not set or undefined)
	 * @param {string[]} [aCategories] The function returns only measurements which match these specified categories
	 *
	 * @return {object} [] filtered array with measurements containing id, info and start-timestamp, end-timestamp, time, duration, categories (false if error)
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.filterMeasurements} instead
	 */

	/**
	 * Registers an average measurement for a given objects method
	 *
	 * @name jQuery.sap.measure.registerMethod
	 * @function
	 * @param {string} sId the id of the measurement
	 * @param {object} oObject the object of the method
	 * @param {string} sMethod the name of the method
	 * @param {string[]} [aCategories = ["javascript"]] An optional categories list for the measurement
	 *
	 * @returns {boolean} true if the registration was successful
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.registerMethod} instead
	 */

	/**
	 * Unregisters an average measurement for a given objects method
	 *
	 * @name jQuery.sap.measure.unregisterMethod
	 * @function
	 * @param {string} sId the id of the measurement
	 * @param {object} oObject the object of the method
	 * @param {string} sMethod the name of the method
	 *
	 * @returns {boolean} true if the unregistration was successful
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.unregisterMethod} instead
	 */

	/**
	 * Unregisters all average measurements
	 *
	 * @name jQuery.sap.measure.unregisterAllMethods
	 * @function
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/Measurement.unregisterAllMethods} instead
	 */

	/**
	 * Clears all interaction measurements
	 *
	 * @function
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/Interaction.clear} instead
	 */
	jQuery.sap.measure.clearInteractionMeasurements = Interaction.clear;

	/**
	 * Start an interaction measurements
	 *
	 * @function
	 * @param {string} sType type of the event which triggered the interaction
	 * @param {object} oSrcElement the control on which the interaction was triggered
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/Interaction.start} instead
	 */
	jQuery.sap.measure.startInteraction = Interaction.start;

	/**
	 * End an interaction measurements
	 *
	 * @function
	 * @param {boolean} bForce forces end of interaction now and ignores further re-renderings
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/Interaction.end} instead
	 */
	jQuery.sap.measure.endInteraction = Interaction.end;

	/**
	 * Gets the incomplete pending interaction
	 * @function
	 * @return {object} interaction measurement
	 * @private
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/Interaction.getPending} instead
	 */
	jQuery.sap.measure.getPendingInteractionMeasurement = Interaction.getPending;

	/**
	 * Gets all interaction measurements for which a provided filter function returns a truthy value.
	 * To filter for certain categories of measurements a fnFilter can be implemented like this
	 * <code>
	 * function(InteractionMeasurement) {
	 *     return InteractionMeasurement.duration > 0
	 * }</code>
	 *
	 * @function
	 * @param {function} fnFilter a filter function that returns true if the passed measurement should be added to the result
	 * @return {object[]} all interaction measurements passing the filter function successfully
	 * @public
	 * @since 1.36.2
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/Interaction.filter} instead
	 */
	jQuery.sap.measure.filterInteractionMeasurements = Interaction.filter;

	/**
	 * Gets all interaction measurements
	 * @function
	 * @param {boolean} bFinalize finalize the current pending interaction so that it is contained in the returned array
	 * @return {object[]} all interaction measurements
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use {@link module:sap/ui/performance/trace/Interaction.getAll} instead
	 */
	jQuery.sap.measure.getAllInteractionMeasurements = Interaction.getAll;

	/**
	 * Gets the current request timings array for type 'resource' safely
	 *
	 * @function
	 * @return {object[]} array of performance timing objects
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use native function <code>performance.getEntriesByType("resource")</code> instead
	 */
	jQuery.sap.measure.getRequestTimings = function() {
		if (performance.getEntriesByType) {
			return performance.getEntriesByType("resource");
		}
		return [];
	};

	/**
	 * Clears all request timings safely.
	 *
	 * @function
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use native function <code>performance.clearResourceTimings()</code> where available
	 */
	jQuery.sap.measure.clearRequestTimings = function() {
		if (performance.clearResourceTimings) {
			performance.clearResourceTimings();
		}
	};


	/**
	 * Sets the request buffer size for the measurement safely.
	 *
	 * @param {int} iSize size of the buffer
	 * @function
	 * @public
	 * @since 1.34.0
	 * @deprecated since 1.58 use native function <code>performance.setResourceTimingBufferSize(iSize)</code> where available
	 */
	jQuery.sap.measure.setRequestBufferSize = function(iSize) {
		if (performance.setResourceTimingBufferSize) {
			performance.setResourceTimingBufferSize(iSize);
		}
	};

	// ---------------------- require/declare --------------------------------------------------------

	/**
	 * @deprecated As of Version 1.120.0
	 */
	(function() {
		var mKnownSubtypes = LoaderExtensions.getKnownSubtypes(),

			rSubTypes;

		(function() {
			var sSub = "";

			for (var sType in mKnownSubtypes) {
				sSub = (sSub ? sSub + "|" : "") + "(?:(?:" + mKnownSubtypes[sType].join("\\.|") + "\\.)?" + sType + ")";
			}
			sSub = "\\.(?:" + sSub + "|[^./]+)$";
			rSubTypes = new RegExp(sSub);
		}());

		function ui5ToRJS(sName) {
			if ( /^jquery\.sap\./.test(sName) ) {
				return sName;
			}
			return sName.replace(/\./g, "/");
		}

		/**
		 * Constructs a URL to load the module with the given name and file type (suffix).
		 *
		 * Searches the longest prefix of the given module name for which a registration
		 * exists (see {@link jQuery.sap.registerModulePath}) and replaces that prefix
		 * by the registered URL prefix.
		 *
		 * The remainder of the module name is appended to the URL, replacing any dot with a slash.
		 *
		 * Finally, the given suffix (typically a file name extension) is added (unconverted).
		 *
		 * The returned name (without the suffix) doesn't end with a slash.
		 *
		 * @param {string} sModuleName module name to detemrine the path for
		 * @param {string} sSuffix suffix to be added to the resulting path
		 * @return {string} calculated path (URL) to the given module
		 *
		 * @public
		 * @static
		 * @deprecated since 1.58 use {@link sap.ui.require.toUrl} instead
		 */
		jQuery.sap.getModulePath = function(sModuleName, sSuffix) {
			return jQuery.sap.getResourcePath(ui5ToRJS(sModuleName), sSuffix);
		};

		/**
		 * Determines the URL for a resource given its unified resource name.
		 *
		 * Searches the longest prefix of the given resource name for which a registration
		 * exists (see {@link jQuery.sap.registerResourcePath}) and replaces that prefix
		 * by the registered URL prefix.
		 *
		 * The remainder of the resource name is appended to the URL.
		 *
		 * <b>Unified Resource Names</b><br>
		 * Several UI5 APIs use <i>Unified Resource Names (URNs)</i> as naming scheme for resources that
		 * they deal with (e.h. Javascript, CSS, JSON, XML, ...). URNs are similar to the path
		 * component of a URL:
		 * <ul>
		 * <li>they consist of a non-empty sequence of name segments</li>
		 * <li>segments are separated by a forward slash '/'</li>
		 * <li>name segments consist of URL path segment characters only. It is recommended to use only ASCII
		 * letters (upper or lower case), digits and the special characters '$', '_', '-', '.')</li>
		 * <li>the empty name segment is not supported</li>
		 * <li>names consisting of dots only, are reserved and must not be used for resources</li>
		 * <li>names are case sensitive although the underlying server might be case-insensitive</li>
		 * <li>the behavior with regard to URL encoded characters is not specified, %ddd notation should be avoided</li>
		 * <li>the meaning of a leading slash is undefined, but might be defined in future. It therefore should be avoided</li>
		 * </ul>
		 *
		 * UI5 APIs that only deal with Javascript resources, use a slight variation of this scheme,
		 * where the extension '.js' is always omitted (see {@link sap.ui.define}, {@link sap.ui.require}).
		 *
		 *
		 * <b>Relationship to old Module Name Syntax</b><br>
		 *
		 * Older UI5 APIs that deal with resources (like {@link jQuery.sap.registerModulePath},
		 * {@link jQuery.sap.require} and {@link jQuery.sap.declare}) used a dot-separated naming scheme
		 * (called 'module names') which was motivated by object names in the global namespace in
		 * Javascript.
		 *
		 * The new URN scheme better matches the names of the corresponding resources (files) as stored
		 * in a server and the dot ('.') is no longer a forbidden character in a resource name. This finally
		 * allows to handle resources with different types (extensions) with the same API, not only JS files.
		 *
		 * Last but not least does the URN scheme better match the naming conventions used by AMD loaders
		 * (like <code>requireJS</code>).
		 *
		 * @param {string} sResourceName unified resource name of the resource
		 * @returns {string} URL to load the resource from
		 * @public
		 * @deprecated since 1.58 use {@link sap.ui.require.toUrl} instead
		 */
		jQuery.sap.getResourcePath = function(sResourceName, sSuffix) {
			// if no suffix was given and if the name is not empty, try to guess the suffix from the last segment
			if ( arguments.length === 1  &&  sResourceName != '' ) {
				// @evo-todo re-implement without split
				// only known types (and their known subtypes) are accepted
				var aSegments = sResourceName.split(/\//);
				var m = rSubTypes.exec(aSegments[aSegments.length - 1]);
				if ( m ) {
					sSuffix = m[0];
					aSegments[aSegments.length - 1] = aSegments[aSegments.length - 1].slice(0, m.index);
					sResourceName = aSegments.join('/');
				} else {
					sSuffix = "";
				}
			}

			return _ui5loader.getResourcePath(sResourceName, sSuffix);
		};

		/**
		 * Registers a URL prefix for a module name prefix.
		 *
		 * Before a module is loaded, the longest registered prefix of its module name
		 * is searched for and the associated URL prefix is used as a prefix for the request URL.
		 * The remainder of the module name is attached to the request URL by replacing
		 * dots ('.') with slashes ('/').
		 *
		 * The registration and search operates on full name segments only. So when a prefix
		 *
		 *    'sap.com'  ->  'http://www.sap.com/ui5/resources/'
		 *
		 * is registered, then it will match the name
		 *
		 *    'sap.com.Button'
		 *
		 * but not
		 *
		 *    'sap.commons.Button'
		 *
		 * Note that the empty prefix ('') will always match and thus serves as a fallback for
		 * any search.
		 *
		 * The prefix can either be given as string or as object which contains the url and a 'final' property.
		 * If 'final' is set to true, overwriting a module prefix is not possible anymore.
		 *
		 * @param {string} sModuleName module name to register a path for
		 * @param {string | object} vUrlPrefix path prefix to register, either a string literal or an object (e.g. {url : 'url/to/res', 'final': true})
		 * @param {string} [vUrlPrefix.url] path prefix to register
		 * @param {boolean} [vUrlPrefix.final] flag to avoid overwriting the url path prefix for the given module name at a later point of time
		 *
		 * @public
		 * @static
		 * @deprecated since 1.58 set path mappings via {@link sap.ui.loader.config} instead.
		 * @SecSink {1|PATH} Parameter is used for future HTTP requests
		 */
		jQuery.sap.registerModulePath = function registerModulePath(sModuleName, vUrlPrefix) {
			jQuery.sap.assert(!/\//.test(sModuleName), "module name must not contain a slash.");
			sModuleName = sModuleName.replace(/\./g, "/");
			// URL must not be empty
			vUrlPrefix = vUrlPrefix || '.';
			LoaderExtensions.registerResourcePath(sModuleName, vUrlPrefix);
		};

		/**
		 * Registers a URL prefix for a resource name prefix.
		 *
		 * Before a resource is loaded, the longest registered prefix of its unified resource name
		 * is searched for and the associated URL prefix is used as a prefix for the request URL.
		 * The remainder of the resource name is attached to the request URL 1:1.
		 *
		 * The registration and search operates on full name segments only. So when a prefix
		 *
		 *    'sap/com'  ->  'http://www.sap.com/ui5/resources/'
		 *
		 * is registered, then it will match the name
		 *
		 *    'sap/com/Button'
		 *
		 * but not
		 *
		 *    'sap/commons/Button'
		 *
		 * Note that the empty prefix ('') will always match and thus serves as a fallback for
		 * any search.
		 *
		 * The url prefix can either be given as string or as object which contains the url and a final flag.
		 * If final is set to true, overwriting a resource name prefix is not possible anymore.
		 *
		 * @param {string} sResourceNamePrefix in unified resource name syntax
		 * @param {string | object} vUrlPrefix prefix to use instead of the sResourceNamePrefix, either a string literal or an object (e.g. {url : 'url/to/res', 'final': true})
		 * @param {string} [vUrlPrefix.url] path prefix to register
		 * @param {boolean} [vUrlPrefix.final] flag to avoid overwriting the url path prefix for the given module name at a later point of time
		 *
		 * @public
		 * @static
		 * @deprecated since 1.58 set path mappings via {@link sap.ui.loader.config} instead.
		 * @SecSink {1|PATH} Parameter is used for future HTTP requests
		 * @function
		 */
		jQuery.sap.registerResourcePath = LoaderExtensions.registerResourcePath;

		/**
		 * Register information about third party modules that are not UI5 modules.
		 *
		 * The information maps the name of the module (without extension '.js') to an info object.
		 * Instead of a complete info object, only the value of the <code>deps</code> property can be given as an array.
		 *
		 * @param {object} mShims Map of shim configuration objects keyed by module names (withou extension '.js')
		 * @param {boolean} [mShims.any-module-name.amd=false]
		 *              Whether the module uses an AMD loader if present. If set to <code>true</code>, UI5 will disable
		 *              the AMD loader while loading such modules to force the modules to expose their content via global names.
		 * @param {string[]|string} [mShims.any-module-name.exports=undefined]
		 *              Global name (or names) that are exported by the module. If one ore multiple names are defined,
		 *              the first one will be read from the global object and will be used as value of the module.
		 *              Each name can be a dot separated hierarchical name (will be resolved with <code>jQuery.sap.getObject</code>)
		 * @param {string[]} [mShims.any-module-name.deps=undefined]
		 *              List of modules that the module depends on (requireJS syntax, no '.js').
		 *              The modules will be loaded first before loading the module itself.
		 *
		 * @private
		 * @ui5-restricted sap.ui.core, sap.ui.export, sap.ui.vk
		 * @deprecated Since 1.58, use {@link sap.ui.loader.config} instead
		 * @function
		 */
		jQuery.sap.registerModuleShims = function(mShims) {
			jQuery.sap.assert( typeof mShims === 'object', "mShims must be an object");
			ui5loader.config({
				shim: mShims
			});
		};

		/**
		 * Check whether a given module has been loaded / declared already.
		 *
		 * Returns true as soon as a module has been required the first time, even when
		 * loading/executing it has not finished yet. So the main assertion of a
		 * return value of <code>true</code> is that the necessary actions have been taken
		 * to make the module available in the near future. It does not mean, that
		 * the content of the module is already available!
		 *
		 * This fuzzy behavior is necessary to avoid multiple requests for the same module.
		 * As a consequence of the assertion above, a <i>preloaded</i> module does not
		 * count as <i>declared</i>. For preloaded modules, an explicit call to
		 * <code>jQuery.sap.require</code> is necessary to make them available.
		 *
		 * If a caller wants to know whether a module needs to be loaded from the server,
		 * it can set <code>bIncludePreloaded</code> to true. Then, preloaded modules will
		 * be reported as 'declared' as well by this method.
		 *
		 * @param {string} sModuleName name of the module to be checked
		 * @param {boolean} [bIncludePreloaded=false] whether preloaded modules should be reported as declared.
		 * @return {boolean} whether the module has been declared already
		 * @public
		 * @static
		 * @deprecated since 1.58 use {@link sap.ui.require} instead
		 */
		jQuery.sap.isDeclared = function isDeclared(sModuleName, bIncludePreloaded) {
			var state = _ui5loader.getModuleState( ui5ToRJS(sModuleName) + ".js" );
			return state && (bIncludePreloaded || state > 0);
		};

		/**
		 * Whether the given resource has been loaded (or preloaded).
		 * @param {string} sResourceName Name of the resource to check, in unified resource name format
		 * @returns {boolean} Whether the resource has been loaded already
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @deprecated since 1.58
		 */
		jQuery.sap.isResourceLoaded = function isResourceLoaded(sResourceName) {
			return !!_ui5loader.getModuleState(sResourceName);
		};

		/**
		 * Returns the names of all declared modules.
		 * @return {string[]} the names of all declared modules
		 * @see jQuery.sap.isDeclared
		 * @public
		 * @static
		 * @deprecated as of version 1.58. Applications must not rely on such internal information. There is no API replacement.
		 * @function
		 */
		jQuery.sap.getAllDeclaredModules = LoaderExtensions.getAllRequiredModules;

		/**
		 * Declares a module as existing.
		 *
		 * By default, this function assumes that the module will create a JavaScript object
		 * with the same name as the module. As a convenience it ensures that the parent
		 * namespace for that object exists (by calling jQuery.sap.getObject).
		 * If such an object creation is not desired, <code>bCreateNamespace</code> must be set to false.
		 *
		 * @param {string | object}  sModuleName name of the module to be declared
		 *                           or in case of an object {modName: "...", type: "..."}
		 *                           where modName is the name of the module and the type
		 *                           could be a specific dot separated extension e.g.
		 *                           <code>{modName: "sap.ui.core.Dev", type: "view"}</code>
		 *                           loads <code>sap/ui/core/Dev.view.js</code> and
		 *                           registers as <code>sap.ui.core.Dev.view</code>
		 * @param {boolean} [bCreateNamespace=true] whether to create the parent namespace
		 *
		 * @public
		 * @static
		 * @deprecated As of 1.52, UI5 modules and their dependencies should be defined using {@link sap.ui.define}.
		 *    For more details see {@link topic:91f23a736f4d1014b6dd926db0e91070 Modules and Dependencies} in the
		 *    documentation.
		 */
		jQuery.sap.declare = function(sModuleName, bCreateNamespace) {

			var sNamespaceObj = sModuleName;

			// check for an object as parameter for sModuleName
			// in case of this the object contains the module name and the type
			// which could be {modName: "sap.ui.core.Dev", type: "view"}
			if (typeof (sModuleName) === "object") {
				sNamespaceObj = sModuleName.modName;
				sModuleName = ui5ToRJS(sModuleName.modName) + (sModuleName.type ? "." + sModuleName.type : "") + ".js";
			} else {
				sModuleName = ui5ToRJS(sModuleName) + ".js";
			}

			_ui5loader.declareModule(sModuleName);

			// ensure parent namespace even if module was declared already
			// (as declare might have been called by require)
			if (bCreateNamespace !== false) {
				// ensure parent namespace
				jQuery.sap.getObject(sNamespaceObj, 1);
			}

		};

		/**
		 * Ensures that the given module is loaded and executed before execution of the
		 * current script continues.
		 *
		 * By issuing a call to this method, the caller declares a dependency to the listed modules.
		 *
		 * Any required and not yet loaded script will be loaded and execute synchronously.
		 * Already loaded modules will be skipped.
		 *
		 * @param {...string | object}  vModuleName one or more names of modules to be loaded
		 *                              or in case of an object {modName: "...", type: "..."}
		 *                              where modName is the name of the module and the type
		 *                              could be a specific dot separated extension e.g.
		 *                              <code>{modName: "sap.ui.core.Dev", type: "view"}</code>
		 *                              loads <code>sap/ui/core/Dev.view.js</code> and
		 *                              registers as <code>sap.ui.core.Dev.view</code>
		 *
		 * @public
		 * @static
		 * @function
		 * @SecSink {0|PATH} Parameter is used for future HTTP requests
		 * @deprecated As of 1.52, UI5 modules and their dependencies should be defined using {@link sap.ui.define}.
		 *    When additional modules have to be loaded dynamically at a later point in time, the asynchronous API
		 *    {@link sap.ui.require} should be used. For more details, see {@link topic:91f23a736f4d1014b6dd926db0e91070
		 *    Modules and Dependencies} in the documentation.
		 */
		jQuery.sap.require = function(vModuleName) {

			if ( arguments.length > 1 ) {
				// legacy mode with multiple arguments, each representing a dependency
				for (var i = 0; i < arguments.length; i++) {
					jQuery.sap.require(arguments[i]);
				}
				return this;
			}

			// check for an object as parameter for sModuleName
			// in case of this the object contains the module name and the type
			// which could be {modName: "sap.ui.core.Dev", type: "view"}
			if (typeof (vModuleName) === "object") {
				jQuery.sap.assert(!vModuleName.type || mKnownSubtypes.js.indexOf(vModuleName.type) >= 0, "type must be empty or one of " + mKnownSubtypes.js.join(", "));
				vModuleName = ui5ToRJS(vModuleName.modName) + (vModuleName.type ? "." + vModuleName.type : "");
			} else {
				vModuleName = ui5ToRJS(vModuleName);
			}

			sap.ui.requireSync(vModuleName); // legacy-relevant: deprecated jquery.sap.require

		};

		/**
		 * Propagate legacy require hook to ui5loader translate hook.
		 * @deprecated since 1.54
		 */
		Object.defineProperty(jQuery.sap.require, "_hook", {
			get: function() {
				return _ui5loader.translate;
			},
			set: function(hook) {
				jQuery.sap.assert(false, "jquery.sap.global: legacy hook for code transformation should no longer be used");
				_ui5loader.translate = hook;
			}
		});

		/**
		 * @private
		 * @deprecated since 1.40
		 */
		jQuery.sap.preloadModules = function(sPreloadModule, bAsync, oSyncPoint) {
			Log.error("jQuery.sap.preloadModules was never a public API and has been removed. Migrate to Core.loadLibrary()!");
		};

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
		 *
		 * @private
		 * @ui5-restricted sap.ui.core,preloadfiles
		 * @deprecated since 1.58
		 */
		jQuery.sap.registerPreloadedModules = function(oData) {

			var modules = oData.modules;
			if ( Version(oData.version || "1.0").compareTo("2.0") < 0 ) {
				modules = {};
				for ( var sName in oData.modules ) {
					modules[ui5ToRJS(sName) + ".js"] = oData.modules[sName];
				}
			}
			sap.ui.require.preload(modules, oData.name, oData.url);

		};

		/**
		 * Removes a set of resources from the resource cache.
		 *
		 * @param {string} sName unified resource name of a resource or the name of a preload group to be removed
		 * @param {boolean} [bPreloadGroup=true] whether the name specifies a preload group, defaults to true
		 * @param {boolean} [bUnloadAll] Whether all matching resources should be unloaded, even if they have been executed already.
		 * @param {boolean} [bDeleteExports] Whether exports (global variables) should be destroyed as well. Will be done for UI5 module names only.
		 * @experimental Since 1.16.3 API might change completely, apps must not develop against it.
		 * @private
		 * @function
		 * @deprecated since 1.58
		 */
		jQuery.sap.unloadResources = _ui5loader.unloadResources;

		/**
		 * Converts a UI5 module name to a unified resource name.
		 *
		 * Used by View and Fragment APIs to convert a given module name into a unified resource name.
		 * When the <code>sSuffix</code> is not given, the suffix '.js' is added. This fits the most
		 * common use case of converting a module name to the Javascript resource that contains the
		 * module. Note that an empty <code>sSuffix</code> is not replaced by '.js'. This allows to
		 * convert UI5 module names to requireJS module names with a call to this method.
		 *
		 * @param {string} sModuleName Module name as a dot separated name
		 * @param {string} [sSuffix='.js'] Suffix to add to the final resource name
		 * @private
		 * @ui5-restricted sap.ui.core
		 * @deprecated since 1.58
		 */
		jQuery.sap.getResourceName = function(sModuleName, sSuffix) {
			return ui5ToRJS(sModuleName) + (sSuffix == null ? ".js" : sSuffix);
		};

		/**
		 * Retrieves the resource with the given name, either from the preload cache or from
		 * the server. The expected data type of the resource can either be specified in the
		 * options (<code>dataType</code>) or it will be derived from the suffix of the <code>sResourceName</code>.
		 * The only supported data types so far are xml, html, json and text. If the resource name extension
		 * doesn't match any of these extensions, the data type must be specified in the options.
		 *
		 * If the resource is found in the preload cache, it will be converted from text format
		 * to the requested <code>dataType</code> using a converter from <code>jQuery.ajaxSettings.converters</code>.
		 *
		 * If it is not found, the resource name will be converted to a resource URL (using {@link #getResourcePath})
		 * and the resulting URL will be requested from the server with a synchronous jQuery.ajax call.
		 *
		 * If the resource was found in the local preload cache and any necessary conversion succeeded
		 * or when the resource was retrieved from the backend successfully, the content of the resource will
		 * be returned. In any other case, an exception will be thrown, or if option failOnError is set to true,
		 * <code>null</code> will be returned.
		 *
		 * Future implementations of this API might add more options. Generic implementations that accept an
		 * <code>mOptions</code> object and propagate it to this function should limit the options to the currently
		 * defined set of options or they might fail for unknown options.
		 *
		 * For asynchronous calls the return value of this method is an ECMA Script 6 Promise object which callbacks are triggered
		 * when the resource is ready:
		 * If <code>failOnError</code> is <code>false</code> the catch callback of the promise is not called. The argument given to the fullfilled
		 * callback is null in error case.
		 * If <code>failOnError</code> is <code>true</code> the catch callback will be triggered. The argument is an Error object in this case.
		 *
		 * @param {string} [sResourceName] resourceName in unified resource name syntax
		 * @param {object} [mOptions] options
		 * @param {object} [mOptions.dataType] one of "xml", "html", "json" or "text". If not specified it will be derived from the resource name (extension)
		 * @param {string} [mOptions.name] unified resource name of the resource to load (alternative syntax)
		 * @param {string} [mOptions.url] url of a resource to load (alternative syntax, name will only be a guess)
		 * @param {string} [mOptions.headers] Http headers for an eventual XHR request
		 * @param {string} [mOptions.failOnError=true] whether to propagate load errors or not
		 * @param {string} [mOptions.async=false] whether the loading should be performed asynchronously.
		 * @return {string|Document|object|Promise} content of the resource. A string for text or html, an Object for JSON, a Document for XML. For asynchronous calls an ECMA Script 6 Promise object will be returned.
		 * @throws Error if loading the resource failed
		 * @private
		 * @experimental API is not yet fully mature and may change in future.
		 * @since 1.15.1
		 * @deprecated since 1.58
		 */
		jQuery.sap.loadResource = LoaderExtensions.loadResource;

		/*
		 * register a global event handler to detect script execution errors.
		 * Only works for browsers that support document.currentScript.
		 * /
		window.addEventListener("error", function(e) {
			if ( document.currentScript && document.currentScript.dataset.sapUiModule ) {
				var error = {
					message: e.message,
					filename: e.filename,
					lineno: e.lineno,
					colno: e.colno
				};
				document.currentScript.dataset.sapUiModuleError = JSON.stringify(error);
			}
		});
		*/

		/**
		 * Loads the given Javascript resource (URN) asynchronously via as script tag.
		 * Returns a promise that will be resolved when the load event is fired or reject
		 * when the error event is fired.
		 *
		 * Note: execution errors of the script are not reported as 'error'.
		 *
		 * This method is not a full implementation of require. It is intended only for
		 * loading "preload" files that do not define an own module / module value.
		 *
		 * Functionality might be removed/renamed in future, so no code outside the
		 * sap.ui.core library must use it.
		 *
		 * @experimental
		 * @private
		 * @ui5-restricted sap.ui.core,sap.ushell
		 * @deprecated since 1.58
		 * @function
		 */
		jQuery.sap._loadJSResourceAsync = _ui5loader.loadJSResourceAsync;

	}());

	// --------------------- script and stylesheet handling --------------------------------------------------

	/**
	 * Includes the script (via &lt;script&gt;-tag) into the head for the
	 * specified <code>sUrl</code> and optional <code>sId</code>.
	 *
	 * @param {string|object}
	 *            vUrl the URL of the script to load or a configuration object
	 * @param {string}
	 *            vUrl.url the URL of the script to load
	 * @param {string}
	 *            [vUrl.id] id that should be used for the script tag
	 * @param {object}
	 *            [vUrl.attributes] map of attributes that should be used for the script tag
	 * @param {string|object}
	 *            [vId] id that should be used for the script tag or map of attributes
	 * @param {function}
	 *            [fnLoadCallback] callback function to get notified once the script has been loaded
	 * @param {function}
	 *            [fnErrorCallback] callback function to get notified once the script loading failed
	 * @return {void|Promise}
	 *            When using the configuration object a <code>Promise</code> will be returned. The
	 *            documentation for the <code>fnLoadCallback</code> applies to the <code>resolve</code>
	 *            handler of the <code>Promise</code> and the one for the <code>fnErrorCallback</code>
	 *            applies to the <code>reject</code> handler of the <code>Promise</code>.
	 *
	 * @public
	 * @static
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/includeScript} instead
	 * @SecSink {0|PATH} Parameter is used for future HTTP requests
	 */
	jQuery.sap.includeScript = includeScript;


	/**
	 * Includes the specified stylesheet via a &lt;link&gt;-tag in the head of the current document. If there is call to
	 * <code>includeStylesheet</code> providing the sId of an already included stylesheet, the existing element will be
	 * replaced.
	 *
	 * @param {string|object}
	 *          vUrl the URL of the stylesheet to load or a configuration object
	 * @param {string}
	 *          vUrl.url the URL of the stylesheet to load
	 * @param {string}
	 *          [vUrl.id] id that should be used for the link tag
	 * @param {object}
	 *          [vUrl.attributes] map of attributes that should be used for the script tag
	 * @param {string|object}
	 *          [vId] id that should be used for the link tag or map of attributes
	 * @param {function}
	 *          [fnLoadCallback] callback function to get notified once the stylesheet has been loaded
	 * @param {function}
	 *          [fnErrorCallback] callback function to get notified once the stylesheet loading failed.
	 * @return {void|Promise}
	 *            When using the configuration object a <code>Promise</code> will be returned. The
	 *            documentation for the <code>fnLoadCallback</code> applies to the <code>resolve</code>
	 *            handler of the <code>Promise</code> and the one for the <code>fnErrorCallback</code>
	 *            applies to the <code>reject</code> handler of the <code>Promise</code>.
	 *
	 * @public
	 * @static
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/dom/includeStylesheet} instead
	 * @SecSink {0|PATH} Parameter is used for future HTTP requests
	 */
	jQuery.sap.includeStyleSheet = includeStylesheet;

	// --------------------- support hooks ---------------------------------------------------------

	// -----------------------------------------------------------------------

	// --------------------- frame protection -------------------------------------------------------

	/**
	 * @deprecated since 1.58 use {@link module:sap/ui/security/FrameOptions} instead
	 */
	jQuery.sap.FrameOptions = FrameOptions;

	/**
	 * Executes an 'eval' for its arguments in the global context (without closure variables).
	 *
	 * This is a synchronous replacement for <code>jQuery.globalEval</code> which in some
	 * browsers (e.g. FireFox) behaves asynchronously.
	 *
	 * <b>Note:</b>
	 * To avoid potential violations of your content security policy (CSP), this API should not be used.
	 *
	 * @type void
	 * @public
	 * @static
	 * @deprecated as of version 1.58. Do not use to avoid violation of Content Security Policy (CSP).
	 * @SecSink {0|XSS} Parameter is evaluated
	 */
	jQuery.sap.globalEval = function() {

		/*eslint-disable no-eval */
		eval(arguments[0]);
		/*eslint-enable no-eval */
	};

	/**
	 * @deprecated As of version 1.112
	 */
	(function() {

		var b = Device.browser;
		var id = b.name;

		// TODO move to a separate module? Only adds 385 bytes (compressed), but...
		if ( !jQuery.browser ) {
			// re-introduce the jQuery.browser support if missing (jQuery-1.9ff)
			jQuery.browser = (function (ua) {

				var rwebkit = /(webkit)[ \/]([\w.]+)/,
					ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/,
					rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/,
					ua = ua.toLowerCase(),
					match = rwebkit.exec(ua) ||
						ropera.exec(ua) ||
						ua.indexOf("compatible") < 0 && rmozilla.exec(ua) ||
						[],
					browser = {};

				if (match[1]) {
					browser[match[1]] = true;
					browser.version = match[2] || "0";
					if (browser.webkit) {
						browser.safari = true;
					}
				}

				return browser;

			}(window.navigator.userAgent));
		}

		if (id === b.BROWSER.CHROME) {
			jQuery.browser.safari = false;
			jQuery.browser.chrome = true;
		} else if (id === b.BROWSER.SAFARI) {
			jQuery.browser.safari = true;
			jQuery.browser.chrome = false;
		}

		if (id) {
			jQuery.browser.fVersion = b.version;
			jQuery.browser.mobile = b.mobile;
		}

	}());

	return jQuery;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/*
 * Provides constants for key codes. Useful in the implementation of keypress/keydown event handlers.
 */
sap.ui.predefine("jquery.sap.keycodes", ['jquery.sap.global', 'sap/ui/events/KeyCodes'],
	function(jQuery, KeyCodes) {
	"use strict";

	/**
	 * Enumeration of key codes.
	 *
	 * @enum {int}
	 * @public
	 * @since 0.9.0
	 * @deprecated since 1.58 use {@link module:sap/ui/events/KeyCodes} instead
	 */
	jQuery.sap.KeyCodes = KeyCodes;

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.BACKSPACE
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.TAB
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.ENTER
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.SHIFT
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.CONTROL
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.ALT
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.BREAK
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.CAPS_LOCK
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.ESCAPE
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.SPACE
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.PAGE_UP
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.PAGE_DOWN
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.END
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.HOME
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.ARROW_LEFT
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.ARROW_UP
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.ARROW_RIGHT
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.ARROW_DOWN
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.PRINT
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.INSERT
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DELETE
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_0
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_1
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_2
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_3
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_4
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_5
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_6
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_7
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_8
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DIGIT_9
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.A
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.B
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.C
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.D
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.E
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.G
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.H
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.I
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.J
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.K
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.L
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.M
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.N
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.O
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.P
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.Q
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.R
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.S
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.T
	 * @public
	 */


	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.U
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.V
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.W
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.X
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.Y
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.Z
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.WINDOWS
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.CONTEXT_MENU
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.TURN_OFF
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.SLEEP
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_0
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_1
	 * @public
	 */


	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_2
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_3
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_4
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_5
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_6
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_7
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_8
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_9
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_ASTERISK
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_PLUS
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_MINUS
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_COMMA
	 * @public
	 */


	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUMPAD_SLASH
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F1
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F2
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F3
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F4
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F5
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F6
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F7
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F8
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F9
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F10
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F11
	 * @public
	 */


	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.F12
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.NUM_LOCK
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.SCROLL_LOCK
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.OPEN_BRACKET
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.PLUS
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.COMMA
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.SLASH
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.DOT
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.PIPE
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.SEMICOLON
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.MINUS
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.GREAT_ACCENT
	 * @public
	 */


	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.EQUALS
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.SINGLE_QUOTE
	 * @public
	 */

	/**
	 * @type number
	 * @name jQuery.sap.KeyCodes.BACKSLASH
	 * @public
	 */
	return jQuery;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

//Provides common helper functions for the mobile version of UI5
sap.ui.predefine("jquery.sap.mobile", [
	'jquery.sap.global',
	'sap/ui/util/Mobile',
	'sap/ui/Device'
], function(jQuery, Mobile, Device) {
	"use strict";

	// Using "Object.getOwnPropertyDescriptor" to not trigger the "getter" - see jquery.sap.stubs
	function getValue(oTarget, sProperty) {
		var descriptor = Object.getOwnPropertyDescriptor(oTarget, sProperty);
		return descriptor && descriptor.value;
	}

	//deprecated functionality
	//init os
	(function() {
		/**
		 * Holds information about the current operating system
		 *
		 * @name jQuery.os
		 * @namespace
		 * @deprecated since 1.20 use {@link sap.ui.Device.os} instead
		 * @public
		 */
		jQuery.os = jQuery.extend(/** @lends jQuery.os */ {

			/**
			 * The name of the operating system; currently supported are: "ios", "android", "blackberry"
			 * @type {string}
			 * @deprecated since 1.20 use {@link sap.ui.Device.os.name} instead
			 * @public
			 */
			os: Device.os.name,

			/**
			 * The version of the operating system as a string (including minor versions)
			 * @type {string}
			 * @deprecated since 1.20 use {@link sap.ui.Device.os.versionStr} instead
			 * @public
			 */
			version: Device.os.versionStr,

			/**
			 * The version of the operating system parsed as a float (major and first minor version)
			 * @type {float}
			 * @deprecated since 1.20 use {@link sap.ui.Device.os.version} instead
			 * @public
			 */
			fVersion: Device.os.version
		}, getValue(jQuery, "os"));

		jQuery.os[Device.os.name] = true;
		/**
		 * Whether the current operating system is Android
		 * @type {boolean}
		 * @public
		 * @deprecated since 1.20 use {@link sap.ui.Device.os.android} instead
		 * @name jQuery.os.android
		 */

		/**
		 * Whether the current operating system is Apple iOS
		 * @type {boolean}
		 * @public
		 * @deprecated since 1.20 use {@link sap.ui.Device.os.ios} instead
		 * @name jQuery.os.ios
		 */

		/**
		 * @name jQuery.device
		 * @namespace
		 * @deprecated since 1.20 use the respective functions of {@link sap.ui.Device} instead
		 * @public
		 */
		jQuery.device = jQuery.extend({}, getValue(jQuery, "device"));

		/**
		 * Holds information about the current device and its state
		 *
		 * @name jQuery.device.is
		 * @namespace
		 * @deprecated since 1.20 use the respective functions of {@link sap.ui.Device} instead
		 * @public
		 */
		jQuery.device.is = jQuery.extend(/** @lends jQuery.device.is */ {

			/**
			 * Whether the application runs in standalone mode without browser UI (launched from the iOS home
			 * screen)
			 * @type {boolean}
			 * @deprecated since 1.20 use window.navigator.standalone instead
			 * @public
			 */
			standalone: window.navigator.standalone,

			/**
			 * Whether the device is in "landscape" orientation (also "true" when the device does not know about
			 * the orientation)
			 * @type {boolean}
			 * @deprecated since 1.20 use {@link sap.ui.Device.orientation.landscape} instead
			 * @public
			 */
			landscape: Device.orientation.landscape,

			/**
			 * Whether the device is in portrait orientation
			 * @type {boolean}
			 * @deprecated since 1.20 use {@link sap.ui.Device.orientation.portrait} instead
			 * @public
			 */
			portrait: Device.orientation.portrait,

			/**
			 * Whether the application runs on an iPhone
			 * @type {boolean}
			 * @deprecated since 1.20: shouldn't do device specific coding; if still needed, use
			 *     {@link sap.ui.Device.os.ios} &amp;&amp; {@link sap.ui.Device.system.phone}
			 * @public
			 */
			iphone: Device.os.ios && Device.system.phone,

			/**
			 * Whether the application runs on an iPad
			 * @type {boolean}
			 * @deprecated since 1.20: shouldn't do device specific coding; if still needed, use
			 *     {@link sap.ui.Device.os.ios} &amp;&amp; {@link sap.ui.Device.system.tablet}
			 * @public
			 */
			ipad: Device.os.ios && Device.system.tablet,

			/**
			 * Whether the application runs on an Android phone - based not on screen size but user-agent (so this
			 * is not guaranteed to be equal to jQuery.device.is.phone on Android)
			 * https://developers.google.com/chrome/mobile/docs/user-agent Some device vendors however do not
			 * follow this rule
			 * @deprecated since 1.17.0 use {@link sap.ui.Device.system.phone} &amp;&amp; {@link sap.ui.Device.os.android}
			 *     instead
			 * @type {boolean}
			 * @public
			 */
			android_phone: Device.system.phone && Device.os.android,

			/**
			 * Whether the application runs on an Android tablet - based not on screen size but user-agent (so this
			 * is not guaranteed to be equal to jQuery.device.is.tablet on Android)
			 * https://developers.google.com/chrome/mobile/docs/user-agent Some device vendors however do not
			 * follow this rule
			 * @type {boolean}
			 * @deprecated since 1.17.0 use {@link sap.ui.Device.system.tablet} &amp;&amp; {@link sap.ui.Device.os.android}
			 *     instead
			 * @public
			 */
			android_tablet: Device.system.tablet && Device.os.android,

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
			 * @type {boolean}
			 * @deprecated since 1.17.0 use {@link sap.ui.Device.system.tablet} instead
			 * @public
			 */
			tablet: Device.system.tablet,

			/**
			 * If this flag is set to <code>true</code>, the device is recognized as a phone.
			 *
			 * Furthermore, a CSS class <code>sap-phone</code> is added to the document root element.
			 *
			 * <b>Note:</b> In case a phone requests a web page as a "Desktop Page", it is possible
			 * that all properties except <code>Device.system.phone</code> are set to <code>true</code>.
			 * In this case it is not possible to differentiate between tablet and phone relying on the user agent.
			 *
			 * @type {boolean}
			 * @deprecated since 1.17.0 use {@link sap.ui.Device.system.phone} instead
			 * @public
			 */
			phone: Device.system.phone,

			/**
			 * If this flag is set to <code>true</code>, the device is recognized as a desktop system.
			 *
			 * Furthermore, a CSS class <code>sap-desktop</code> is added to the document root element.
			 *
			 * <b>Note:</b> This flag is by default also true for Safari on iPads running on iOS 13 or higher.
			 * The end user can change this behavior by disabling "Request Desktop Website -> All websites" within the iOS settings.
			 * See also the documentation for {@link sap.ui.Device.system.combi} devices.
			 *
			 * @type {boolean}
			 * @deprecated since 1.17.0 use {@link sap.ui.Device.system.desktop} instead
			 * @public
			 */
			desktop: Device.system.desktop
		}, jQuery.device.is);

	})();

	/**
	 * Does some basic modifications to the HTML page that make it more suitable for mobile apps.
	 * Only the first call to this method is executed, subsequent calls are ignored. Note that this method is also
	 * called by the constructor of toplevel controls like sap.m.App, sap.m.SplitApp and sap.m.Shell. Exception: if
	 * no homeIcon was set, subsequent calls have the chance to set it.
	 *
	 * The "options" parameter configures what exactly should be done.
	 *
	 * It can have the following properties:
	 * <ul>
	 * <li>viewport: whether to set the viewport in a way that disables zooming (default: true)</li>
	 * <li>statusBar: the iOS status bar color, "default", "black" or "black-translucent" (default: "default")</li>
	 * <li>hideBrowser: whether the browser UI should be hidden as far as possible to make the app feel more native
	 * (default: true)</li>
	 * <li>preventScroll: whether native scrolling should be disabled in order to prevent the "rubber-band" effect
	 * where the whole window is moved (default: true)</li>
	 * <li>preventPhoneNumberDetection: whether Safari Mobile should be prevented from transforming any numbers
	 * that look like phone numbers into clickable links; this should be left as "true", otherwise it might break
	 * controls because Safari actually changes the DOM. This only affects all page content which is created after
	 * initMobile is called.</li>
	 * <li>rootId: the ID of the root element that should be made fullscreen; only used when hideBrowser is set
	 * (default: the document.body)</li>
	 * <li>useFullScreenHeight: a boolean that defines whether the height of the html root element should be set to
	 * 100%, which is required for other elements to cover the full height (default: true)</li>
	 * <li>homeIcon: deprecated since 1.12, use {@link jQuery.sap.setIcons} instead.
	 * </ul>
	 *
	 * @name jQuery.sap.initMobile
	 * @function
	 * @param {object}  [options] configures what exactly should be done
	 * @param {boolean} [options.viewport=true] whether to set the viewport in a way that disables zooming
	 * @param {string}  [options.statusBar='default'] the iOS status bar color, "default", "black" or
	 *     "black-translucent"
	 * @param {boolean} [options.hideBrowser=true] whether the browser UI should be hidden as far as possible to
	 *     make the app feel more native
	 * @param {boolean} [options.preventScroll=true] whether native scrolling should be disabled in order to
	 *     prevent the "rubber-band" effect where the whole window is moved
	 * @param {boolean} [options.preventPhoneNumberDetection=true] whether Safari mobile should be prevented from
	 *     transforming any numbers that look like phone numbers into clickable links
	 * @param {string}  [options.rootId] the ID of the root element that should be made fullscreen; only used when
	 *     hideBrowser is set. If not set, the body is used
	 * @param {boolean} [options.useFullScreenHeight=true] whether the height of the html root element should be
	 *     set to 100%, which is required for other elements to cover the full height
	 * @param {string}  [options.homeIcon=undefined] deprecated since 1.12, use {@link jQuery.sap.setIcons} instead.
	 * @param {boolean} [options.homeIconPrecomposed=false] deprecated since 1.12, use {@link jQuery.sap.setIcons} instead.
	 * @param {boolean} [options.mobileWebAppCapable=true] whether the Application will be loaded in full screen
	 *     mode after added to home screen on mobile devices. The default value for this property only enables the
	 *     full screen mode when runs on iOS device.
	 *
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/util/Mobile.init} instead
	 */
	jQuery.sap.initMobile = Mobile.init;

	/**
	 * Sets the bookmark icon for desktop browsers and the icon to be displayed on the home screen of iOS devices
	 * after the user does "add to home screen".
	 *
	 * Only call this method once and call it early when the page is loading: browsers behave differently when the
	 * favicon is modified while the page is alive. Some update the displayed icon inside the browser but use an
	 * old icon for bookmarks. When a favicon is given, any other existing favicon in the document will be removed.
	 * When at least one home icon is given, all existing home icons will be removed and new home icon tags for all
	 * four resolutions will be created.
	 *
	 * The home icons must be in PNG format and given in different sizes for iPad/iPhone with and without retina
	 * display. The favicon is used in the browser and for desktop shortcuts and should optimally be in ICO format:
	 * ICO files can contain different image sizes for different usage locations. E.g. a 16x16px version is used
	 * inside browsers.
	 *
	 * All icons are given in an an object holding icon URLs and other settings. The properties of this object are:
	 * <ul>
	 * <li>phone: a 60x60 pixel version for non-retina iPhones</li>
	 * <li>tablet: a 76x76 pixel version for non-retina iPads</li>
	 * <li>phone@2: a 120x120 pixel version for retina iPhones</li>
	 * <li>tablet@2: a 152x152 pixel version for retina iPads</li>
	 * <li>precomposed: whether the home icons already have some glare effect (otherwise iOS will add it) (default:
	 * false)</li>
	 * <li>favicon: the ICO file to be used inside the browser and for desktop shortcuts</li>
	 * </ul>
	 *
	 * One example is:
	 * <pre>
	 * {
	 *    'phone':'phone-icon_60x60.png',
	 *    'phone@2':'phone-retina_120x120.png',
	 *    'tablet':'tablet-icon_76x76.png',
	 *    'tablet@2':'tablet-retina_152x152.png',
	 *    'precomposed':true,
	 *    'favicon':'desktop.ico'
	 * }
	 * </pre>
	 * If one of the sizes is not given, the largest available alternative image will be used instead for this
	 * size.
	 * On Android these icons may or may not be used by the device. Apparently chances can be improved by using
	 * icons with glare effect, so the "precomposed" property can be set to "true". Some Android devices may also
	 * use the favicon for bookmarks instead of the home icons.</li>
	 *
	 * @name jQuery.sap.setIcons
	 * @function
	 * @param {object} oIcons
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/util/Mobile.setIcons} instead
	 */
	jQuery.sap.setIcons = Mobile.setIcons;

	/**
	 * Sets the "apple-mobile-web-app-capable" and "mobile-web-app-capable" meta information which defines whether
	 * the application is loaded in full screen mode (browser address bar and toolbar are hidden) after the user
	 * does "add to home screen" on mobile devices. Currently this meta tag is only supported by iOS Safari and
	 * mobile Chrome from version 31.
	 *
	 * If the application opens new tabs because of attachments, url and so on, setting this to false will let the
	 * user be able to go from the new tab back to the application tab after the application is added to home
	 * screen.
	 *
	 * Note: this function only has effect when the application runs on iOS Safari and mobile Chrome from version
	 * 31.
	 *
	 * @function
	 * @name jQuery.sap.setMobileWebAppCapable
	 * @param {boolean} bValue whether the Application will be loaded in full screen mode after added to home
	 *     screen from iOS Safari or mobile Chrome from version 31.
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/util/Mobile.setWebAppCapable} instead
	 */
	jQuery.sap.setMobileWebAppCapable = Mobile.setWebAppCapable;

	return jQuery;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides access to Java-like properties files
sap.ui.predefine("jquery.sap.properties", ['jquery.sap.global', 'sap/base/util/Properties'],
	function(jQuery, Properties) {
	"use strict";

	 /**
	 * Creates and returns a new instance of {@link jQuery.sap.util.Properties}.
	 *
	 * If option 'url' is passed, immediately a load request for the given target is triggered.
	 * A property file that is loaded can contain comments with a leading ! or #.
	 * The loaded property list does not contain any comments.
	 *
	 * <b>Example for loading a property file:</b>
	 * <pre>
	 *  jQuery.sap.properties({url : "../myProperty.properties"});
	 * </pre>
	 *
	 * <b>Example for creating an empty properties instance:</b>
	 * <pre>
	 *  jQuery.sap.properties();
	 * </pre>
	 *
	 * <b>Examples for getting and setting properties:</b>
	 * <pre>
	 *	var oProperties = jQuery.sap.properties();
	 *	oProperties.setProperty("KEY_1","Test Key");
	 *	var sValue1 = oProperties.getProperty("KEY_1");
	 *	var sValue2 = oProperties.getProperty("KEY_2","Default");
	 * </pre>
	 *
	 * @name jQuery.sap.properties
	 * @function
	 * @param {object} [mParams] Parameters used to initialize the property list
	 * @param {string} [mParams.url] The URL to the .properties file which should be loaded
	 * @param {boolean} [mParams.async=false] Whether the .properties file should be loaded asynchronously or not
	 * @param {object} [mParams.headers] A map of additional header key/value pairs to send along with
	 *    the request (see <code>headers</code> option of <code>jQuery.ajax</code>)
	 * @param {object} [mParams.returnNullIfMissing=false] Whether <code>null</code> should be returned
	 *    for a missing properties file; by default an empty collection is returned
	 * @return {jQuery.sap.util.Properties|null|Promise} A new property collection (synchronous case)
	 *    or <code>null</code> if the file could not be loaded and <code>returnNullIfMissing</code>
	 *    was set; in case of asynchronous loading, always a Promise is returned, which resolves with
	 *    the property collection or with <code>null</code> if the file could not be loaded and
	 *    <code>returnNullIfMissing</code> was set to true
	 * @throws {Error} When the file has syntax issues (e.g. incomplete unicode escapes);
	 *    in async mode, the error is not thrown but the returned Promise will be rejected
	 * @SecSink {0|PATH} Parameter is used for future HTTP requests
	 * @deprecated since 1.58 use {@link module:sap/base/util/Properties.create} instead
	 * @public
	 */
	jQuery.sap.properties = Properties.create;

	/**
	 * @namespace jQuery.sap.util
	 * @public
	 * @deprecated as of version 1.120. Use {@link module:sap/base/util/Properties} instead
	 */

	/**
	 * @interface Represents a collection of string properties (key/value pairs).
	 *
	 * Each key and its corresponding value in the collection is a string, keys are case-sensitive.
	 *
	 * Use {@link jQuery.sap.properties} to create an instance of <code>jQuery.sap.util.Properties</code>.
	 *
	 * The {@link #getProperty} method can be used to retrieve a value from the collection,
	 * {@link #setProperty} to store or change a value for a key and {@link #getKeys}
	 * can be used to retrieve an array of all keys that are currently stored in the collection.
	 *
	 * @version 1.125.0
	 * @since 0.9.0
	 * @name jQuery.sap.util.Properties
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/base/util/Properties} instead
	 */

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
	 *
	 * @function
	 * @name jQuery.sap.util.Properties#getProperty
	 */
	/**
	 * Returns an array of all keys in the property collection.
	 * @returns {string[]} All keys in the property collection
	 * @public
	 *
	 * @function
	 * @name jQuery.sap.util.Properties#getKeys
	 */
	/**
	 * Stores or changes the value for the given key in the collection.
	 *
	 * If the given value is not a string, the collection won't be modified.
	 * The key is always cast to a string.
	 *
	 * @param {string} sKey Key of the property
	 * @param {string} sValue String value for the key
	 * @public
	 *
	 * @function
	 * @name jQuery.sap.util.Properties#setProperty
	 */
	/**
	 * Creates and returns a clone of the property collection.
	 * @returns {jQuery.sap.util.Properties} A clone of the property collection
	 * @public
	 *
	 * @function
	 * @name jQuery.sap.util.Properties#clone
	 */

	return jQuery;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides access to Java-like resource bundles in properties file format
sap.ui.predefine("jquery.sap.resources", [
	'sap/base/i18n/ResourceBundle',
	'jquery.sap.global'
], function(ResourceBundle, jQuery) {
	"use strict";

	/**
	 * Creates and returns a new instance of {@link jQuery.sap.util.ResourceBundle}
	 * using the given URL and locale to determine what to load.
	 *
	 * @public
	 * @function
	 * @name jQuery.sap.resources
	 * @param {object} [mParams] Parameters used to initialize the resource bundle
	 * @param {string} [mParams.url=''] URL pointing to the base .properties file of a bundle (.properties file without any locale information, e.g. "mybundle.properties")
	 * @param {string} [mParams.locale] Optional language (aka 'locale') to load the texts for.
	 *     Can either be a BCP47 language tag or a JDK compatible locale string (e.g. "en-GB", "en_GB" or "fr");
	 *     Defaults to the current session locale if <code>sap.ui.getCore</code> is available, otherwise to 'en'
	 * @param {boolean} [mParams.includeInfo=false] Whether to include origin information into the returned property values
	 * @param {boolean} [mParams.async=false] Whether the first bundle should be loaded asynchronously
	 *     Note: Fallback bundles loaded by {@link #getText} are always loaded synchronously.
	 * @returns {jQuery.sap.util.ResourceBundle|Promise} A new resource bundle or a Promise on that bundle (in asynchronous case)
	 * @SecSink {0|PATH} Parameter is used for future HTTP requests
	 * @deprecated since 1.58. Use {@link module:sap/base/i18n/ResourceBundle} instead.
	 */
	jQuery.sap.resources = function() {
		// Do not directly assign new API to jQuery.sap.resources
		// as "isBundle" and "_getFallbackLocales" would get assigned to
		// the new API as well (e.g. ResourceBundle.create.isBundle)
		return ResourceBundle.create.apply(ResourceBundle, arguments);
	};

	/**
	 * Checks if the given object is an instance of {@link jQuery.sap.util.ResourceBundle}.
	 *
	 * @param {jQuery.sap.util.ResourceBundle} oBundle object to check
	 * @returns {boolean} true, if the object is a {@link jQuery.sap.util.ResourceBundle}
	 * @public
	 * @function
	 * @name jQuery.sap.resources.isBundle
	 * @deprecated since 1.58. Use the instanceof operator together with the class {@link module:sap/base/i18n/ResourceBundle} instead.
	 */
	jQuery.sap.resources.isBundle = function (oBundle) {
		return oBundle instanceof ResourceBundle;
	};

	/**
	 * Determine sequence of fallback locales, starting from the given locale and
	 * optionally taking the list of supported locales into account.
	 *
	 * Callers can use the result to limit requests to a set of existing locales.
	 *
	 * @param {string} sLocale Locale to start the fallback sequence with, should be a BCP47 language tag
	 * @param {string[]} [aSupportedLocales] List of supported locales (in JDK legacy syntax, e.g. zh_CN, iw)
	 * @returns {string[]} Sequence of fallback locales in JDK legacy syntax, decreasing priority
	 *
	 * @private
	 * @ui5-restricted sap.fiori, sap.support launchpad
	 * @deprecated since 1.58. Use {@link module:sap/base/i18n/ResourceBundle._getFallbackLocales} instead.
	 */
	jQuery.sap.resources._getFallbackLocales = ResourceBundle._getFallbackLocales;

	/**
	 * @interface  Contains locale-specific texts.
	 *
	 * If you need a locale-specific text within your application, you can use the
	 * resource bundle to load the locale-specific file from the server and access
	 * the texts of it.
	 *
	 * Use {@link jQuery.sap.resources} to create an instance of jQuery.sap.util.ResourceBundle.
	 * There you have to specify the URL to the base .properties file of a bundle
	 * (.properties without any locale information, e.g. "mybundle.properties"), and optionally
	 * a locale. The locale is defined as a string of the language and an optional country code
	 * separated by underscore (e.g. "en_GB" or "fr"). If no locale is passed, the default
	 * locale is "en" if the SAPUI5 framework is not available. Otherwise the default locale is taken from
	 * the SAPUI5 configuration.
	 *
	 * With the getText() method of the resource bundle, a locale-specific string value
	 * for a given key will be returned.
	 *
	 * With the given locale, the ResourceBundle requests the locale-specific properties file
	 * (e.g. "mybundle_fr_FR.properties"). If no file is found for the requested locale or if the file
	 * does not contain a text for the given key, a sequence of fall back locales is tried one by one.
	 * First, if the locale contains a region information (fr_FR), then the locale without the region is
	 * tried (fr). If that also can't be found or doesn't contain the requested text, the English file
	 * is used (en - assuming that most development projects contain at least English texts).
	 * If that also fails, the file without locale (base URL of the bundle) is tried.
	 *
	 * If none of the requested files can be found or none of them contains a text for the given key,
	 * then the key itself is returned as text.
	 *
	 * Exception: Fallback for "zh_HK" is "zh_TW" before zh.
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 * @since 0.9.0
	 * @name jQuery.sap.util.ResourceBundle
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/base/i18n/ResourceBundle} instead
	 */

	/**
	 * Returns a locale-specific string value for the given key sKey.
	 *
	 * The text is searched in this resource bundle according to the fallback chain described in
	 * {@link jQuery.sap.util.ResourceBundle}. If no text could be found, the key itself is used as text.
	 *
	 * If the second parameter <code>aArgs</code> is given, then any placeholder of the form "{<i>n</i>}"
	 * (with <i>n</i> being an integer) is replaced by the corresponding value from <code>aArgs</code>
	 * with index <i>n</i>.  Note: This replacement is applied to the key if no text could be found.
	 * For more details on the replacement mechanism refer to {@link jQuery.sap.formatMessage}.
	 *
	 * @param {string} sKey Key to retrieve the text for
	 * @param {string[]} [aArgs] List of parameter values which should replace the placeholders "{<i>n</i>}"
	 *     (<i>n</i> is the index) in the found locale-specific string value. Note that the replacement is done
	 *     whenever <code>aArgs</code> is given, no matter whether the text contains placeholders or not
	 *     and no matter whether <code>aArgs</code> contains a value for <i>n</i> or not.
	 * @returns {string} The value belonging to the key, if found; otherwise the key itself.
	 *
	 * @function
	 * @name jQuery.sap.util.ResourceBundle#getText
	 * @public
	 */

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
	 * @returns {boolean} true if the text has been found in the concrete bundle
	 *
	 * @function
	 * @name jQuery.sap.util.ResourceBundle#hasText
	 * @public
	 */

	return jQuery;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
// Provides miscellaneous utility functions that might be useful for any script
sap.ui.predefine("jquery.sap.script", [
	'jquery.sap.global',
	'sap/base/util/uid',
	'sap/base/strings/hash',
	'sap/base/util/array/uniqueSort',
	'sap/base/util/deepEqual',
	'sap/base/util/each',
	'sap/base/util/array/diff',
	'sap/base/util/JSTokenizer',
	'sap/base/util/merge',
	'sap/base/util/UriParameters'
], function(jQuery, uid, hash, uniqueSort, deepEqual, each, diff, JSTokenizer, merge, UriParameters) {
	"use strict";

	/**
	 * Creates and returns a pseudo-unique id.
	 *
	 * No means for detection of overlap with already present or future UIDs.
	 *
	 * @return {string} A pseudo-unique id.
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/util/uid} instead
	 */
	jQuery.sap.uid = uid;

	/**
	 * This function generates a hash-code from a string
	 * @param {string} sString The string to generate the hash-code from
	 * @return {int} The generated hash-code
	 * @since 1.39
	 * @private
	 * @ui5-restricted sap.ui.core
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/strings/hash} instead
	 */
	jQuery.sap.hashCode = hash;


	/**
	 * Sorts the given array in-place and removes any duplicates (identified by "===").
	 *
	 * Use <code>jQuery.uniqueSort()</code> for arrays of DOMElements.
	 *
	 * @param {Array} a An Array of any type
	 * @return {Array} Same array as given (for chaining)
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/util/array/uniqueSort} instead
	 */
	jQuery.sap.unique = uniqueSort;

	/**
	 * Compares the two given values for equality, especially takes care not to compare
	 * arrays and objects by reference, but compares their content.
	 * Note: function does not work with comparing XML objects
	 *
	 * @param {any} a A value of any type
	 * @param {any} b A value of any type
	 * @param {int} [maxDepth=10] Maximum recursion depth
	 * @param {boolean} [contains] Whether all existing properties in a are equal as in b
	 *
	 * @return {boolean} Whether a and b are equal
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/util/deepEqual} instead
	 */
	jQuery.sap.equal = deepEqual;

	/**
	 * Iterates over elements of the given object or array.
	 *
	 * Works similar to <code>jQuery.each</code>, but a numeric index is only used for
	 * instances of <code>Array</code>. For all other objects, including those with a numeric
	 * <code>length</code> property, the properties are iterated by name.
	 *
	 * The contract for the <code>fnCallback</code> is the same as for <code>jQuery.each</code>,
	 * when it returns <code>false</code>, then the iteration stops (break).
	 *
	 * @param {object|any[]} oObject object or array to enumerate the properties of
	 * @param {function} fnCallback function to call for each property name
	 * @return {object|any[]} the given <code>oObject</code>
	 * @since 1.11
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/util/each} instead
	 */
	jQuery.sap.each = each;

	/**
	 * Calculate delta of old list and new list.
	 *
	 * This function implements the algorithm described in "A Technique for Isolating Differences Between Files"
	 * (Commun. ACM, April 1978, Volume 21, Number 4, Pages 264-268).
	 *
	 * Items in the arrays are not compared directly. Instead, a substitute symbol is determined for each item
	 * by applying the provided function <code>fnSymbol</code> to it. Items with strictly equal symbols are
	 * assumed to represent the same logical item:
	 * <pre>
	 *   fnSymbol(a) === fnSymbol(b)   <=>   a 'is logically the same as' b
	 * </pre>
	 * As an additional constraint, casting the symbols to string should not modify the comparison result.
	 * If this second constraint is not met, this method might report more diffs than necessary.
	 *
	 * If no symbol function is provided, a default implementation is used which applies <code>JSON.stringify</code>
	 * to non-string items and reduces the strings to a hash code. It is not guaranteed that this default
	 * implementation fulfills the above constraint in all cases, but it is a compromise between implementation
	 * effort, generality and performance. If items are known to be non-stringifiable (e.g. because they may
	 * contain cyclic references) or when hash collisions are likely, an own <code>fnSymbol</code> function
	 * must be provided.
	 *
	 * The result of the diff is a sequence of update operations, each consisting of a <code>type</code>
	 * (either <code>"insert"</code> or <code>"delete"</code>) and an <code>index</code>.
	 * By applying the operations one after the other to the old array, it can be transformed to an
	 * array whose items are equal to the new array.
	 *
	 * Sample implementation of the update
	 * <pre>
	 *
	 *  function update(aOldArray, aNewArray) {
	 *
	 *    // calculate the diff
	 *    var aDiff = jQuery.sap.arraySymbolDiff(aOldArray, aNewArray, __provide_your_symbol_function_here__);
	 *
	 *    // apply update operations
	 *    aDiff.forEach( function(op) {
	 *
	 *      // invariant: aOldArray and aNewArray now are equal up to (excluding) op.index
	 *
	 *      switch ( op.type ) {
	 *      case 'insert':
	 *        // new array contains a new (or otherwise unmapped) item, add it here
	 *        aOldArray.splice(op.index, 0, aNewArray[op.index]);
	 *        break;
	 *      case 'delete':
	 *        // an item is no longer part of the array (or has been moved to another position), remove it
	 *        aOldArray.splice(op.index, 1);
	 *        break;
	 *      default:
	 *        throw new Error('unexpected diff operation type');
	 *      }
	 *
	 *    });
	 *  }
	 *
	 * </pre>
	 *
	 * @param {Array} aOld Old Array
	 * @param {Array} aNew New Array
	 * @param {function} [fnSymbol] Function to calculate substitute symbols for array items
	 * @return {Array.<{type:string,index:int}>} List of update operations
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/util/array/diff} instead
	 */
	jQuery.sap.arraySymbolDiff = diff;


	/**
	 * A factory returning a tokenizer object for JS values.
	 * Contains functions to consume tokens on an input string.
	 * @function
	 * @private
	 * @returns {object} - the tokenizer
	 * @deprecated since 1.58 use {@link module:sap/base/util/JSTokenizer} instead
	 */
	jQuery.sap._createJSTokenizer = function() {
		return new JSTokenizer();
	};

	/**
	 * Parse simple JS objects.
	 *
	 * A parser for JS object literals. This is different from a JSON parser, as it does not have
	 * the JSON specification as a format description, but a subset of the JavaScript language.
	 * The main difference is, that keys in objects do not need to be quoted and strings can also
	 * be defined using apostrophes instead of quotation marks.
	 *
	 * The parser does not support functions, but only boolean, number, string, object and array.
	 *
	 * @function
	 * @param {string} The string containing the JS objects
	 * @throws an error, if the string does not contain a valid JS object
	 * @returns {object} the JS object
	 *
	 * @private
	 * @since 1.11
	 * @deprecated since 1.58 use {@link module:sap/base/util/JSTokenizer.parseJS} instead
	 */
	jQuery.sap.parseJS = JSTokenizer.parseJS;

	/**
	 * Merge the contents of two or more objects together into the first object.
	 * Usage is the same as jQuery.extend, but Arguments that are null or undefined are NOT ignored.
	 *
	 * @deprecated since 1.58. For shallow extend use <code>Object.assign</code> (polyfilled), for deep extend use <code>sap/base/util/merge</code>.
	 * @function
	 * @since 1.26
	 * @private
	 */
	jQuery.sap.extend = function () {
		var args = arguments,
			deep = false;

		// Check whether the first argument is the deep-flag
		if (typeof arguments[0] === "boolean") {
			deep = arguments[0];

			// skip the first argument while creating a shallow copy of arguments
			args = Array.prototype.slice.call(arguments, 1);
		}

		if (deep) {
			return merge.apply(this, args);
		} else {
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
			var copy, name, options,
				target = arguments[0] || {},
				i = 1,
				length = arguments.length;

			// Handle case when target is a string or something (possible in deep copy)
			if (typeof target !== "object" && typeof target !== "function") {
				target = {};
			}

			for (; i < length; i++) {

				options = arguments[i];

				// Extend the base object
				for (name in options) {
					copy = options[name];

					// Prevent never-ending loop
					if (name === "__proto__" || target === copy) {
						continue;
					}

					target[name] = copy;
				}
			}

			// Return the modified object
			return target;
		}
	};

	// Javadoc for private inner class "UriParams" - this list of comments is intentional!
	/**
	 * @interface Encapsulates all URI parameters of the current windows location (URL).
	 *
	 * Use {@link jQuery.sap.getUriParameters} to create an instance of jQuery.sap.util.UriParameters.
	 *
	 * @author SAP SE
	 * @version 1.125.0
	 * @since 0.9.0
	 * @name jQuery.sap.util.UriParameters
	 * @public
	 * @deprecated as of version 1.120. See deprecation notes of {@link module:sap/base/util/UriParameters sap/base/util/UriParameters}
	 * on how to migrate to URL web standard classes <code>URLSearchParams</code> / <code>URL</code>.
	 */

	/**
	 * Returns the value(s) of the URI parameter with the given name sName.
	 *
	 * If the boolean parameter bAll is <code>true</code>, an array of string values of all
	 * occurrences of the URI parameter with the given name is returned. This array is empty
	 * if the URI parameter is not contained in the windows URL.
	 *
	 * If the boolean parameter bAll is <code>false</code> or is not specified, the value of the first
	 * occurrence of the URI parameter with the given name is returned. Might be <code>null</code>
	 * if the URI parameter is not contained in the windows URL.
	 *
	 * @public
	 * @param {string} sUri The name of the URI parameter.
	 * @return {string|array} The value(s) of the URI parameter with the given name
	 * @SecSource {return|XSS} Return value contains URL parameters
	 * @function
	 * @name jQuery.sap.util.UriParameters.prototype.get
	 */

	/**
	 * Creates and returns a new instance of {@link jQuery.sap.util.UriParameters}.
	 *
	 * Example for reading a single URI parameter (or the value of the first
	 * occurrence of the URI parameter):
	 * <pre>
	 *	var sValue = jQuery.sap.getUriParameters().get("myUriParam");
	 * </pre>
	 *
	 * Example for reading the values of the first of the URI parameter
	 * (with multiple occurrences):
	 * <pre>
	 *	var aValues = jQuery.sap.getUriParameters().get("myUriParam", true);
	 *	for(i in aValues){
	 *	var sValue = aValues[i];
	 *	}
	 * </pre>
	 *
	 * @public
	 * @param {string} sUri Uri to determine the parameters for
	 * @return {jQuery.sap.util.UriParameters} A new URI parameters instance
	 * @deprecated as of version 1.68. See deprecation notes of {@link module:sap/base/util/UriParameters sap/base/util/UriParameters}
	 * on how to migrate to URL web standard classes <code>URLSearchParams</code> / <code>URL</code>.
	 */
	jQuery.sap.getUriParameters = function getUriParameters(sUri) {
		return UriParameters.fromURL(sUri || window.location.href);
	};

	/**
	 * Calls a method after a given delay and returns an id for this timer
	 *
	 * @param {int} iDelay Delay time in milliseconds
	 * @param {object} oObject Object from which the method should be called
	 * @param {string|object} method function pointer or name of the method
	 * @param {array} [aParameters] Method parameters
	 * @return {string} Id which can be used to cancel the timer with clearDelayedCall
	 * @public
	 * @deprecated since 1.58 use native <code>setTimeout</code> instead
	 */
	jQuery.sap.delayedCall = function delayedCall(iDelay, oObject, method, aParameters) {
		return setTimeout(function(){
			if (typeof method === "string") {
				method = oObject[method];
			}
			method.apply(oObject, aParameters || []);
		}, iDelay);
	};

	/**
	 * Stops the delayed call.
	 *
	 * The function given when calling delayedCall is not called anymore.
	 *
	 * @param {string} sDelayedCallId The id returned, when calling delayedCall
	 * @public
	 * @deprecated since 1.58 use native <code>clearTimeout</code> instead
	 */
	jQuery.sap.clearDelayedCall = function clearDelayedCall(sDelayedCallId) {
		clearTimeout(sDelayedCallId);
		return this;
	};

	/**
	 * Calls a method after a given interval and returns an id for this interval.
	 *
	 * @param {int} iInterval Interval time in milliseconds
	 * @param {object} oObject Object from which the method should be called
	 * @param {string|object} method function pointer or name of the method
	 * @param {array} [aParameters] Method parameters
	 * @return {string} Id which can be used to cancel the interval with clearIntervalCall
	 * @public
	 * @deprecated since 1.58 use native <code>setInterval</code> instead
	 */
	jQuery.sap.intervalCall = function intervalCall(iInterval, oObject, method, aParameters) {
		return setInterval(function(){
			if (typeof method === "string") {
				method = oObject[method];
			}
			method.apply(oObject, aParameters || []);
		}, iInterval);
	};

	/**
	 * Stops the interval call.
	 *
	 * The function given when calling intervalCall is not called anymore.
	 *
	 * @param {string} sIntervalCallId The id returned, when calling intervalCall
	 * @public
	 * @deprecated since 1.58 use native <code>clearInterval</code> instead
	 */
	jQuery.sap.clearIntervalCall = function clearIntervalCall(sIntervalCallId) {
		clearInterval(sIntervalCallId);
		return this;
	};

	/**
	 * Substitute for <code>for(n in o)</code> loops.
	 * This function is just a wrapper around the native for-in loop.
	 *
	 * Iterates over all enumerable properties of the given object and calls the
	 * given callback function for each of them. The assumed signature of the
	 * callback function is
	 *
	 *	 fnCallback(name, value)
	 *
	 * where name is the name of the property and value is its value.
	 *
	 * @param {object} oObject object to enumerate the properties of
	 * @param {function} fnCallback function to call for each property name
	 * @deprecated since 1.48.0. Use native for-in loop instead.
	 * @since 1.7.1
	 */
	jQuery.sap.forIn = each;

	/**
	 * Calculate delta of old list and new list.
	 *
	 * This partly implements the algorithm described in "A Technique for Isolating Differences Between Files"
	 * but instead of working with hashes, it does compare each entry of the old list with each entry of the new
	 * list, which causes terrible performance on large datasets.
	 *
	 * @deprecated As of 1.38, use {@link module:sap/base/util/array/diff} instead if applicable
	 * @public
	 * @param {Array} aOld Old Array
	 * @param {Array} aNew New Array
	 * @param {function} [fnCompare] Function to compare list entries
	 * @param {boolean} [bUniqueEntries] Whether entries are unique, so no duplicate entries exist
	 * @return {Array} List of changes
	 */
	jQuery.sap.arrayDiff = function(aOld, aNew, fnCompare, bUniqueEntries){
		fnCompare = fnCompare || function(vValue1, vValue2) {
			return deepEqual(vValue1, vValue2);
		};

		var aOldRefs = [];
		var aNewRefs = [];

		//Find references
		var aMatches = [];
		for (var i = 0; i < aNew.length; i++) {
			var oNewEntry = aNew[i];
			var iFound = 0;
			var iTempJ;
			// if entries are unique, first check for whether same index is same entry
			// and stop searching as soon the first matching entry is found
			if (bUniqueEntries && fnCompare(aOld[i], oNewEntry)) {
				iFound = 1;
				iTempJ = i;
			} else {
				for (var j = 0; j < aOld.length; j++) {
					if (fnCompare(aOld[j], oNewEntry)) {
						iFound++;
						iTempJ = j;
						if (bUniqueEntries || iFound > 1) {
							break;
						}
					}
				}
			}
			if (iFound == 1) {
				var oMatchDetails = {
					oldIndex: iTempJ,
					newIndex: i
				};
				if (aMatches[iTempJ]) {
					delete aOldRefs[iTempJ];
					delete aNewRefs[aMatches[iTempJ].newIndex];
				} else {
					aNewRefs[i] = {
						data: aNew[i],
						row: iTempJ
					};
					aOldRefs[iTempJ] = {
						data: aOld[iTempJ],
						row: i
					};
					aMatches[iTempJ] = oMatchDetails;
				}
			}
		}

		//Pass 4: Find adjacent matches in ascending order
		for (var i = 0; i < aNew.length - 1; i++) {
			if (aNewRefs[i] &&
				!aNewRefs[i + 1] &&
				aNewRefs[i].row + 1 < aOld.length &&
				!aOldRefs[aNewRefs[i].row + 1] &&
				fnCompare(aOld[ aNewRefs[i].row + 1 ], aNew[i + 1])) {

				aNewRefs[i + 1] = {
					data: aNew[i + 1],
					row: aNewRefs[i].row + 1
				};
				aOldRefs[aNewRefs[i].row + 1] = {
					data: aOldRefs[aNewRefs[i].row + 1],
					row: i + 1
				};

			}
		}

		//Pass 5: Find adjacent matches in descending order
		for (var i = aNew.length - 1; i > 0; i--) {
			if (aNewRefs[i] &&
				!aNewRefs[i - 1] &&
				aNewRefs[i].row > 0 &&
				!aOldRefs[aNewRefs[i].row - 1] &&
				fnCompare(aOld[aNewRefs[i].row - 1], aNew[i - 1])) {

				aNewRefs[i - 1] = {
					data: aNew[i - 1],
					row: aNewRefs[i].row - 1
				};
				aOldRefs[aNewRefs[i].row - 1] = {
					data: aOldRefs[aNewRefs[i].row - 1],
					row: i - 1
				};

			}
		}

		//Pass 6: Generate diff data
		var aDiff = [];

		if (aNew.length == 0) {
			//New list is empty, all items were deleted
			for (var i = 0; i < aOld.length; i++) {
				aDiff.push({
					index: 0,
					type: 'delete'
				});
			}
		} else {
			var iNewListIndex = 0;
			if (!aOldRefs[0]) {
				//Detect all deletions at the beginning of the old list
				for (var i = 0; i < aOld.length && !aOldRefs[i]; i++) {
					aDiff.push({
						index: 0,
						type: 'delete'
					});
					iNewListIndex = i + 1;
				}
			}

			for (var i = 0; i < aNew.length; i++) {
				if (!aNewRefs[i] || aNewRefs[i].row > iNewListIndex) {
					//Entry doesn't exist in old list = insert
					aDiff.push({
						index: i,
						type: 'insert'
					});
				} else {
					iNewListIndex = aNewRefs[i].row + 1;
					for (var j = aNewRefs[i].row + 1; j < aOld.length && (!aOldRefs[j] || aOldRefs[j].row < i); j++) {
						aDiff.push({
							index: i + 1,
							type: 'delete'
						});
						iNewListIndex = j + 1;
					}
				}
			}
		}

		return aDiff;
	};

	return jQuery;
});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/*
 * Provides convenience functions for synchronous communication, based on the jQuery.ajax() function.
 */
sap.ui.predefine("jquery.sap.sjax", ['jquery.sap.global'],
	function(jQuery) {
	"use strict";

	jQuery.sap.sjaxSettings = {
		/**
		 * Whether to return an object consisting of data and status and error codes or only the simple data
		 */
		complexResult: true,

		/**
		 * fallback value when complexResult is set to false and an error occurred. Then fallback will be returned.
		 */
		fallback: undefined
	};

	/**
	 * Convenience wrapper around <code>jQuery.ajax()</code> that avoids the need for callback functions when
	 * synchronous calls are made. If the setting <code>complexResult</code> is true (default), then the return value
	 * is an object with the following properties
	 * <ul>
	 * <li><code>success</code> boolean whether the call succeeded or not
	 * <li><code>data</code> any the data returned by the call. For dataType 'text' this is a string,
	 *                       for JSON it is an object, for XML it is a document. When the call failed, then data is not defined
	 * <li><code>status</code> string a textual status ('success,', 'error', 'timeout',...)
	 * <li><code>statusCode</code> string the HTTP status code of the request
	 * <li><code>error</code> Error an error object (exception) in case an error occurred
	 * <li><code>errorText</code> string an error message in case an error occurred
	 * </ul>
	 *
	 * When <code>complexResult</code> is false, then in the case of success, only 'data' is returned, in case of an error the
	 * 'fallback' setting is returned (defaults to undefined).
	 *
	 * Note that async=false is always enforced by this method.
	 *
	 * @param {string} oOrigSettings the ajax() settings
	 * @returns {object}, details see above
	 *
	 * @public
	 * @since 0.9.0
	 * @deprecated since 1.58. It is no longer recommended to use synchronous calls at all. There are
	 *  alternatives like native <code>XMLHttpRequest</code> or <code>jQuery.ajax</code> but try to
	 *  avoid the sync flag. There will be no replacement for <code>jQuery.sap.sjax</code>.
	 * @SecSink {0|PATH} Parameter is used for future HTTP requests
	 */
	jQuery.sap.sjax = function sjax(oOrigSettings) {

		var oResult;

		var s = jQuery.extend(true, {}, jQuery.sap.sjaxSettings, oOrigSettings,

			// the following settings are enforced as this is the rightmost object in the extend call
			{
				async: false,
				success : function(data, textStatus, xhr) {
//					oResult = { success : true, data : data, status : textStatus, statusCode : xhr.status };
					oResult = { success : true, data : data, status : textStatus, statusCode : xhr && xhr.status };
				},
				error : function(xhr, textStatus, error) {
					oResult = { success : false, data : undefined, status : textStatus, error : error, statusCode : xhr.status, errorResponse :  xhr.responseText};
				}
			});

		jQuery.ajax(s);

		if (!s.complexResult) {
			return oResult.success ? oResult.data : s.fallback;
		}

		return oResult;
	};

	/**
	 * Convenience wrapper that checks whether a given web resource could be accessed.
	 * @returns {boolean} Whether the given web resource could be accessed.
	 * @deprecated since 1.58 see {@link jQuery.sap.sjax}
	 * @SecSink {0|PATH} Parameter is used for future HTTP requests
	 * @SecSource {return} Returned value is under control of an external resource
	 */
	jQuery.sap.syncHead = function(sUrl) {
		return jQuery.sap.sjax({type:'HEAD', url: sUrl}).success;
	};

	/**
	 * Convenience wrapper for {@link jQuery.sap.sjax} that enforeces the Http method GET and defaults the
	 * data type of the result to 'text'.
	 *
	 * @param {string} sUrl the URL
	 * @param {string|object} data request parameters in the format accepted by jQuery.ajax()
	 * @param {string} [sDataType='text'] the type of data expected from the server, default is "text"
	 * @returns {object} See {@link jQuery.sap.sjax}
	 *
	 * @public
	 * @since 0.9.0
	 * @deprecated since 1.58 see {@link jQuery.sap.sjax}
	 * @SecSink {0 1|PATH} Parameter is used for future HTTP requests
	 * @SecSource {return} Returned value is under control of an external resource
	 */
	jQuery.sap.syncGet = function syncGet(sUrl, data, sDataType) {
		return jQuery.sap.sjax({
			url: sUrl,
			data: data,
			type: 'GET',
			dataType: sDataType || 'text'
		});
	};

	/**
	 * Convenience wrapper for {@link jQuery.sap.sjax} that enforces the Http method POST and defaults the
	 * data type of the result to 'text'.
	 *
	 * @param {string} sUrl the URL
	 * @param {string|object} data request parameters in the format accepted by jQuery.ajax()
	 * @param {string} [sDataType='text'] the type of data expected from the server, default is "text"
	 * @returns {object} See {@link jQuery.sap.sjax}
	 *
	 * @public
	 * @since 0.9.0
	 * @deprecated since 1.58 see {@link jQuery.sap.sjax}
	 * @SecSink {0 1|PATH} Parameter is used for future HTTP requests
	 * @SecSource {return} Returned value is under control of an external resource
	 */
	jQuery.sap.syncPost = function syncPost(sUrl, data, sDataType) {
		return jQuery.sap.sjax({
			url: sUrl,
			data: data,
			type: 'POST',
			dataType: sDataType || 'text'
		});
	};

	/**
	 * Convenience wrapper for {@link jQuery.sap.sjax} that enforces the Http method GET and the data type 'text'.
	 * If a fallback value is given, the function simply returns the response as a text or - if some error occurred -
	 * the fallback value. This is useful for applications that don't require detailed error diagnostics.
	 *
	 * If applications need to know about occurring errors, they can either call <code>sjax()</code> directly
	 * or they can omit the fallback value (providing only two parameters to syncGetText()).
	 * They then receive the same complex result object as for the sjax() call.
	 *
	 * @param {string} sUrl the URL
	 * @param {string|object} data request parameters in the format accepted by jQuery.ajax()
	 * @param {string} [fallback] if set, only data is returned (and this fallback instead in case of errors); if unset, a result structure is returned
	 * @returns {object} See {@link jQuery.sap.sjax}
	 *
	 * @public
	 * @since 0.9.0
	 * @deprecated since 1.58 see {@link jQuery.sap.sjax}
	 * @SecSink {0 1|PATH} Parameter is used for future HTTP requests
	 */
	jQuery.sap.syncGetText = function syncGetText(sUrl, data, fallback) {
		return jQuery.sap.sjax({
			url: sUrl,
			data: data,
			type: 'GET',
			dataType: 'text',
			fallback: fallback,
			complexResult : (arguments.length < 3)
		});
	};

	/**
	 * Convenience wrapper for {@link jQuery.sap.sjax} that enforces the Http method GET and the data type 'json'.
	 * If a fallback value is given, the function simply returns the response as an object or - if some error occurred -
	 * the fallback value. This is useful for applications that don't require detailed error diagnostics.
	 *
	 * If applications need to know about occurring errors, they can either call <code>sjax()</code> directly
	 * or they can omit the fallback value (providing only two parameters to syncGetJSON()).
	 * They then receive the same complex result object as for the sjax() call.
	 *
	 * Note that providing "undefined" or "null" as a fallback is different from omitting the fallback (complex result).
	 *
	 * @param {string} sUrl the URL
	 * @param {string|object} data request parameters in the format accepted by jQuery.ajax()
	 * @param {object} [fallback] if set, only data is returned (and this fallback instead in case of errors); if unset, a result structure is returned
	 * @returns {object} See {@link jQuery.sap.sjax}
	 *
	 * @public
	 * @since 0.9.0
	 * @deprecated since 1.58 see {@link jQuery.sap.sjax}
	 * @SecSink {0 1|PATH} Parameter is used for future HTTP requests
	 */
	jQuery.sap.syncGetJSON = function syncGetJSON(sUrl, data, fallback) {
		return jQuery.sap.sjax({
			url: sUrl,
			data: data || null,
			type: 'GET',
			dataType: 'json',
			fallback: fallback,
			complexResult : (arguments.length < 3)
		});
	};

	return jQuery;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides useful string operations not available in pure JavaScript.
sap.ui.predefine("jquery.sap.strings", [
	'jquery.sap.global',
	'sap/base/strings/capitalize',
	'sap/base/strings/camelize',
	'sap/base/strings/hyphenate',
	'sap/base/strings/escapeRegExp',
	'sap/base/strings/formatMessage'
], function(jQuery, capitalize, camelize, hyphenate, escapeRegExp, formatMessage) {
		"use strict";

	/**
	 * Checks whether a given <code>sString</code> ends with <code>sEndString</code>
	 * respecting the case of the strings.
	 *
	 * @param {string} sString String to be checked
	 * @param {string} sEndString The end string to be searched
	 * @returns {boolean} Whether <code>sString</code> ends with <code>sEndString</code>
	 * @deprecated since 1.58 use the native solution <code>String#endsWith</code>
	 * @public
	 */
	jQuery.sap.endsWith = function(sString, sEndString) {
		if (typeof (sEndString) != "string" || sEndString == "") {
			return false;
		}
		return sString.endsWith(sEndString);
	};

	/**
	 * Checks whether a given <code>sString</code> ends with <code>sEndString</code>
	 * ignoring the case of the strings.
	 *
	 * @param {string} sString String to be checked
	 * @param {string} sEndString The end string to be searched
	 * @returns {boolean} Whether <code>sString</code> ends with <code>sEndString</code>
	 * @see jQuery.sap.endsWith
	 * @public
	 * @deprecated since 1.58 use the native solution <code>sString.toLowerCase().endsWith(sEndString.toLowerCase())</code>
	 * @function
	 */
	jQuery.sap.endsWithIgnoreCase = function(sString, sEndString) {
		if (typeof (sEndString) != "string" || sEndString == "") {
			return false;
		}
		sString = sString.toUpperCase();
		sEndString = sEndString.toUpperCase();
		return sString.endsWith(sEndString);
	};

	/**
	 * Checks whether a given <code>sString</code> starts with <code>sStartString</code>
	 * respecting the case of the strings.
	 *
	 * @param {string} sString String to be checked
	 * @param {string} sStartString The start string to be searched
	 * @returns {boolean} Whether <code>sString</code> starts with <code>sStartString</code>
	 * @deprecated since 1.58 use the native <code>String#startsWith</code>
	 * @public
	 */
	jQuery.sap.startsWith = function(sString, sStartString) {
		if (typeof (sStartString) != "string" || sStartString == "") {
			return false;
		}
		return sString.startsWith(sStartString);
	};

	/**
	 * Checks whether a given <code>sString</code> starts with <code>sStartString</code>
	 * ignoring the case of both strings.
	 *
	 * @param {string} sString String to be checked
	 * @param {string} sStartString The start string to be searched
	 * @returns {boolean} Whether <code>sString</code> starts with <code>sStartString</code>
	 * @see jQuery.sap.startsWith
	 * @public
	 * @deprecated since 1.58 use the native solution <code>sString.toLowerCase().startsWith(sEndString.toLowerCase())</code>
	 * @function
	 */
	jQuery.sap.startsWithIgnoreCase = function(sString, sStartString) {
		if (typeof (sStartString) != "string" || sStartString == "") {
			return false;
		}
		sString = sString.toUpperCase();
		sStartString = sStartString.toUpperCase();
		return sString.startsWith(sStartString);
	};

	/**
	 * Converts one character of the string to upper case, at a given position.
	 *
	 * If no position is given or when it is negative or beyond the last character
	 * of <code>sString</code>, then the first character will be converted to upper case.
	 * The first character position is 0.
	 *
	 * @param {string} sString String for which one character should be converted
	 * @param {int} iPos Position of the character that should be converted
	 * @returns {string} String with the converted character
	 * @public
	 * @SecPassthrough {0|return}
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/strings/capitalize} instead
	 */
	jQuery.sap.charToUpperCase = function (sString, iPos) {
		if (!sString) {
			return sString;
		}
		if (!iPos || isNaN(iPos) || iPos <= 0 || iPos >= sString.length) {
			return capitalize(sString);
		}
		var sChar = sString.charAt(iPos).toUpperCase();
		if (iPos > 0) {
			return sString.substring(0,iPos) + sChar + sString.substring(iPos + 1);
		}
		return sChar + sString.substring(iPos + 1);
	};

	/**
	 * Pads a string on the left side until is has at least the given length.
	 *
	 * The method always adds full copies of <code>sPadChar</code> to the given string.
	 * When <code>sPadChar</code> has a length > 1, the length of the returned string
	 * actually might be greater than <code>iLength</code>.
	 *
	 * @param {string} sString String to be padded
	 * @param {string} sPadChar Char to use for the padding
	 * @param {int} iLength Target length of the string
	 * @returns {string} The padded string
	 * @public
	 * @deprecated since 1.58 use the native <code>String#padStart</code> instead
	 * @SecPassthrough {0 1|return}
	 */
	jQuery.sap.padLeft = function (sString, sPadChar, iLength) {
		jQuery.sap.assert(typeof sPadChar === 'string' && sPadChar, "padLeft: sPadChar must be a non-empty string");
		if (!sString) {
			sString = "";
		}
		if (sPadChar && sPadChar.length === 1){
			return sString.padStart(iLength, sPadChar);
		}

		while (sString.length < iLength) {
			sString = sPadChar + sString;
		}
		return sString;
	};

	/**
	 * Pads a string on the right side until is has at least the given length.
	 *
	 * The method always adds full copies of <code>sPadChar</code> to the given string.
	 * When <code>sPadChar</code> has a length > 1, the length of the returned string
	 * actually might be greater than <code>iLength</code>.
	 *
	 * @param {string} sString String to be padded
	 * @param {string} sPadChar Char to use for the padding
	 * @param {int} iLength Target length of the string
	 * @returns {string} The padded string
	 * @public
	 * @deprecated since 1.58 use the native <code>String#padEnd</code> instead
	 * @SecPassthrough {0 1|return}
	 */
	jQuery.sap.padRight = function (sString, sPadChar, iLength) {
		jQuery.sap.assert(typeof sPadChar === 'string' && sPadChar, "padRight: sPadChar must be a non-empty string");
		if (!sString) {
			sString = "";
		}
		if (sPadChar && sPadChar.length === 1){
			return sString.padEnd(iLength, sPadChar);
		}

		while (sString.length < iLength) {
			sString = sString + sPadChar;
		}
		return sString;
	};

	/**
	 * Transforms a hyphen separated string to a camel case string.
	 *
	 * @param {string} sString Hyphen separated string
	 * @returns {string} The transformed string
	 * @since 1.7.0
	 * @public
	 * @SecPassthrough {0|return}
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/strings/camelize} instead
	 */
	jQuery.sap.camelCase = camelize;


	/**
	 * Transforms a camel case string into a hyphen separated string.
	 *
	 * @param {string} sString camel case string
	 * @returns {string} The transformed string
	 * @since 1.15.0
	 * @public
	 * @SecPassthrough {0|return}
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/strings/hyphenate} instead
	 */
	jQuery.sap.hyphen = hyphenate;

	/**
	 * Escapes all characters that would have a special meaning in a regular expression.
	 *
	 * This method can be used when a string with arbitrary content has to be integrated
	 * into a regular expression and when the whole string should match literally.
	 *
	 * Example:
	 * <pre>
	 *   var text = "E=m*c^2"; // text to search
	 *   var search = "m*c";   // text to search for
	 *
	 *   text.match( new RegExp(                         search  ) ); // [ "c" ]
	 *   text.match( new RegExp( jQuery.sap.escapeRegExp(search) ) ); // [ "m*c" ]
	 * </pre>
	 *
	 * @param {string} sString String to escape
	 * @returns {string} The escaped string
	 * @since 1.9.3
	 * @public
	 * @SecPassthrough {0|return}
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/strings/escapeRegExp} instead
	 */
	jQuery.sap.escapeRegExp = escapeRegExp;

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
	 * Example Pattern Strings:
	 * <pre>
	 *   jQuery.sap.formatMessage("Say {0}",     ["Hello"]) -> "Say Hello"    // normal use case
	 *   jQuery.sap.formatMessage("Say '{0}'",   ["Hello"]) -> "Say {0}"      // escaped placeholder
	 *   jQuery.sap.formatMessage("Say ''{0}''", ["Hello"]) -> "Say 'Hello'"  // doubled single quote
	 *   jQuery.sap.formatMessage("Say '{0}'''", ["Hello"]) -> "Say {0}'"     // doubled single quote in quoted fragment
	 * </pre>
	 *
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
	 * @param {string} sPattern A pattern string in the described syntax
	 * @param {any[]} [aValues=[]] The values to be used instead of the placeholders.
	 *
	 * @returns {string} The formatted result string
	 * @since 1.12.5
	 * @SecPassthrough {*|return}
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/base/strings/formatMessage} instead
	 */
	jQuery.sap.formatMessage = formatMessage;

	return jQuery;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides xml parsing and error checking functionality.
sap.ui.predefine("jquery.sap.xml", [
	'jquery.sap.global',
	'sap/ui/util/XMLHelper'
], function(jQuery, XMLHelper) {
	"use strict";

	/**
	 * Parses the specified XML formatted string text using native parsing
	 * function of the browser and returns a valid XML document. If an error
	 * occurred during parsing a parse error object is returned as property (parseError) of the
	 * returned XML document object. The parse error object has the following error
	 * information parameters: errorCode, url, reason, srcText, line, linepos, filepos
	 *
	 * @param {string}
	 *            sXMLText the XML data as string
	 * @return {object} the parsed XML document with a parseError property as described in
	 *         getParseError. An error occurred if the errorCode property of the parseError is != 0.
	 * @public
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/util/XMLHelper.parse} instead
	 */
	jQuery.sap.parseXML = XMLHelper.parse;

	/**
	 * Serializes the specified XML document into a string representation.
	 *
	 * @param {string}
	 *            oXMLDocument the XML document object to be serialized as string
	 * @return {object} the serialized XML string
	 * @public
	 * @deprecated since 1.58 use {@link module:sap/ui/util/XMLHelper.serialize} instead
	 */
	jQuery.sap.serializeXML = function(oXMLDocument) {
		var sXMLString = "";
		if (window.ActiveXObject) {
			sXMLString = oXMLDocument.xml;
			if (sXMLString) {
				return sXMLString;
			}
		}
		if (window.XMLSerializer) {
			return XMLHelper.serialize(oXMLDocument);
		}
		return sXMLString;
	};

	/**
	 * @deprecated since 1.58 use native <code>Node#isEqualNode</code> instead
	 */
	jQuery.sap.isEqualNode = function(oNode1, oNode2) {
		if (oNode1 === oNode2) {
			return true;
		}
		if (!oNode1 || !oNode2) {
			return false;
		}
		if (oNode1.isEqualNode) {
			return oNode1.isEqualNode(oNode2);
		}
		if (oNode1.nodeType != oNode2.nodeType) {
			return false;
		}
		if (oNode1.nodeValue != oNode2.nodeValue) {
			return false;
		}
		if (oNode1.baseName != oNode2.baseName) {
			return false;
		}
		if (oNode1.nodeName != oNode2.nodeName) {
			return false;
		}
		if (oNode1.nameSpaceURI != oNode2.nameSpaceURI) {
			return false;
		}
		if (oNode1.prefix != oNode2.prefix) {
			return false;
		}
		if (oNode1.nodeType != 1) {
			return true; //ELEMENT_NODE
		}
		if (oNode1.attributes.length != oNode2.attributes.length) {
			return false;
		}
		for (var i = 0; i < oNode1.attributes.length; i++) {
			if (!jQuery.sap.isEqualNode(oNode1.attributes[i], oNode2.attributes[i])) {
				return false;
			}
		}
		if (oNode1.childNodes.length != oNode2.childNodes.length) {
			return false;
		}
		for (var i = 0; i < oNode1.childNodes.length; i++) {
			if (!jQuery.sap.isEqualNode(oNode1.childNodes[i], oNode2.childNodes[i])) {
				return false;
			}
		}
		return true;
	};

	/**
	 * Extracts parse error information from the specified document (if any). If
	 * an error was found the returned object has the following error
	 * information parameters: errorCode, url, reason, srcText, line, linepos,
	 * filepos
	 *
	 * @return oParseError if errors were found, or an object with an errorCode of 0 only
	 * @private
	 * @function
	 * @deprecated since 1.58 use {@link module:sap/ui/util/XMLHelper.getParseError} instead
	 */
	jQuery.sap.getParseError = XMLHelper.getParseError;

	return jQuery;

});
sap.ui.requireSync("jquery.sap.xml");
sap.ui.requireSync("jquery.sap.strings");
sap.ui.requireSync("jquery.sap.sjax");
sap.ui.requireSync("jquery.sap.script");
sap.ui.requireSync("jquery.sap.resources");
sap.ui.requireSync("jquery.sap.properties");
sap.ui.requireSync("jquery.sap.mobile");
sap.ui.requireSync("jquery.sap.keycodes");
sap.ui.requireSync("jquery.sap.global");
sap.ui.requireSync("jquery.sap.events");
sap.ui.requireSync("jquery.sap.encoder");
sap.ui.requireSync("jquery.sap.dom");
//# sourceMappingURL=jquery-sap.js.map
