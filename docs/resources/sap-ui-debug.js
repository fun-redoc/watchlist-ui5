//@ui5-bundle sap-ui-debug.js
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides a tree of controls for the testsuite
sap.ui.predefine('sap/ui/debug/ControlTree', [
	'sap/ui/base/EventProvider',
	'sap/ui/core/Element',
	'sap/ui/core/Rendering',
	'sap/ui/core/UIAreaRegistry',
	'./Highlighter',
	"sap/ui/dom/getOwnerWindow",
	"sap/base/Log"
],
	function(EventProvider, Element, Rendering, UIAreaRegistry, Highlighter, getOwnerWindow, Log) {
	"use strict";


	/**
	 * Constructs the class <code>sap.ui.debug.ControlTree</code> and registers
	 * to the <code>sap.ui.core.Core</code> for UI change events.
	 *
	 * @param {sap.ui.core.Core}
	 *            oCore the core instance to use for analysis
	 * @param {Window}
	 *            oWindow reference to the window object
	 * @param {Element}
	 *            oParentDomRef reference to the parent DOM element
	 *
	 * @constructor
	 *
	 * @class Control Tree used for the Debug Environment
	 * @extends sap.ui.base.EventProvider
	 * @author Martin Schaus, Frank Weigel
	 * @version 1.125.0
	 * @alias sap.ui.debug.ControlTree
	 * @private
	 */
	var ControlTree = EventProvider.extend("sap.ui.debug.ControlTree", /** @lends sap.ui.debug.ControlTree.prototype */ {
		constructor: function(oCore, oWindow, oParentDomRef, bRunsEmbedded) {
			EventProvider.apply(this,arguments);
			this.oWindow = oWindow;
			this.oDocument = oWindow.document;
			this.oCore = oCore;
			this.oSelectedNode = null;
			this.oParentDomRef = oParentDomRef;
			this.oSelectionHighlighter = new Highlighter("sap-ui-testsuite-SelectionHighlighter");
			this.oHoverHighlighter = new Highlighter("sap-ui-testsuite-HoverHighlighter", true, '#c8f', 1);
			// create bound variants of the generic methods
			this.onclick = ControlTree.prototype.onclick.bind(this);
			this.onmouseover = ControlTree.prototype.onmouseover.bind(this);
			this.onmouseout = ControlTree.prototype.onmouseout.bind(this);
			this.oParentDomRef.addEventListener("click", this.onclick);
			this.oParentDomRef.addEventListener("mouseover", this.onmouseover);
			this.oParentDomRef.addEventListener("mouseout", this.onmouseout);
			this.enableInplaceControlSelection();// see below...
			Rendering.attachUIUpdated(this.renderDelayed, this);
			this.sSelectedNodeId = "";
			// Note: window.top is assumed to refer to the app window in embedded mode or to the testsuite window otherwise
			this.sResourcePath = window.top.sap.ui.require.toUrl("") + "/";
			this.sTestResourcePath = this.sResourcePath + "../test-resources/";
			this.sSpaceUrl = this.sResourcePath + "sap/ui/debug/images/space.gif";
			this.sMinusUrl = this.sResourcePath + "sap/ui/debug/images/minus.gif";
			this.sPlusUrl = this.sResourcePath + "sap/ui/debug/images/plus.gif";
			this.sLinkUrl = this.sResourcePath + "sap/ui/debug/images/link.gif";
		}
	});

	/** events of the ControlTree */
	ControlTree.M_EVENTS = {
		SELECT : "SELECT"
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.exit = function() {
		document.removeEventListener("mouseover", this.selectControlInTree);
		this.oParentDomRef.removeEventListener("click", this.onclick);
		this.oParentDomRef.removeEventListener("mouseover", this.onmouseover);
		this.oParentDomRef.removeEventListener("mouseout", this.onmouseout);
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.renderDelayed = function() {
		if (this.oTimer) {
			this.oWindow.clearTimeout(this.oTimer);
		}
		this.oTimer = this.oWindow.setTimeout(this.render.bind(this), 0);
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.render = function() {
		var oDomRef = this.oParentDomRef;
		var oUIArea = null,
			oUIAreas = UIAreaRegistry.all();
		oDomRef.innerHTML = "";
		for (var i in oUIAreas) {
			var oUIArea = oUIAreas[i],
				oDomNode = this.createTreeNodeDomRef(oUIArea.getId(),0,"UIArea", this.sTestResourcePath + "sap/ui/core/images/controls/sap.ui.core.UIArea.gif");
			oDomRef.appendChild(oDomNode);

			var aRootControls = oUIArea.getContent();
			for (var i = 0, l = aRootControls.length; i < l; i++) {
				this.renderNode(oDomRef,aRootControls[i],1);
			}
		}
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.createTreeNodeDomRef = function(sId,iLevel,sType,sIcon) {
		var oDomNode = this.oParentDomRef.ownerDocument.createElement("DIV");
		oDomNode.setAttribute("id","sap-debug-controltree-" + sId);
		var sShortType = sType.substring(sType.lastIndexOf(".") >  -1 ? sType.lastIndexOf(".") + 1 : 0);
		oDomNode.innerHTML = "<img src='" + this.sSpaceUrl + "' align='absmiddle'><img src='" + sIcon + "' align='absmiddle'>&nbsp;<span>" + sShortType + " - " + sId + "</span>";
		oDomNode.firstChild.style = "height:12px;width:12px;display:none;";
		oDomNode.firstChild.nextSibling.style = "height:16px;width:16px;";
		oDomNode.style.overflow = "hidden";
		oDomNode.style.whiteSpace = "nowrap";
		oDomNode.style.textOverflow = "ellipsis";
		oDomNode.style.paddingLeft = (iLevel * 16) + "px";
		oDomNode.style.height = "20px";
		oDomNode.style.cursor = "default";
		oDomNode.setAttribute("sap-type",sType);
		oDomNode.setAttribute("sap-id",sId);
		oDomNode.setAttribute("sap-expanded","true");
		oDomNode.setAttribute("sap-level","" + iLevel);
		oDomNode.title = sType + " - " + sId;
		return oDomNode;
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.createLinkNode = function(oParentRef, sId, iLevel, sType) {
		var oDomNode = this.oParentDomRef.ownerDocument.createElement("DIV");
		oDomNode.setAttribute("id","sap-debug-controltreelink-" + sId);
		var sShortType = sType ? sType.substring(sType.lastIndexOf(".") >  -1 ? sType.lastIndexOf(".") + 1 : 0) : "";
		oDomNode.innerHTML = "<img src='" + this.sSpaceUrl + "' align='absmiddle'><img src='" + this.sLinkUrl + "' align='absmiddle'>&nbsp;<span>" + (sShortType ? sShortType + " - " : "") + sId + "</span>";
		oDomNode.firstChild.style = "height:12px;width:12px;display:none;";
		oDomNode.firstChild.nextSibling.style = "height:12px;width:12px;";
		oDomNode.lastChild.style = "color:#888;border-bottom:1px dotted #888;";
		oDomNode.style.overflow = "hidden";
		oDomNode.style.whiteSpace = "nowrap";
		oDomNode.style.textOverflow = "ellipsis";
		oDomNode.style.paddingLeft = (iLevel * 16) + "px";
		oDomNode.style.height = "20px";
		oDomNode.style.cursor = "default";
		oDomNode.setAttribute("sap-type","Link");
		oDomNode.setAttribute("sap-id",sId);
		oDomNode.setAttribute("sap-expanded","true");
		oDomNode.setAttribute("sap-level","" + iLevel);
		oDomNode.title = "Association to '" + sId + "'";
		oParentRef.appendChild(oDomNode);
		return oDomNode;
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.renderNode = function(oDomRef,oControl,iLevel) {
		if (!oControl) {
			return;
		}

		var oMetadata = oControl.getMetadata();
		var sIcon = this.sTestResourcePath + oMetadata.getLibraryName().replace(/\./g, "/") + "/images/controls/" + oMetadata.getName() + ".gif";
		var oDomNode = this.createTreeNodeDomRef(oControl.getId(),iLevel,oMetadata.getName(),sIcon);
		oDomRef.appendChild(oDomNode);
		var bRequiresExpanding = false;
		if (oControl.mAggregations) {
			for (var n in oControl.mAggregations) {
				bRequiresExpanding = true;
				var oAggregation = oControl.mAggregations[n];
				if (oAggregation && oAggregation.length) {
					for (var i = 0;i < oAggregation.length;i++) {
						var o = oAggregation[i];
						if (o  instanceof Element) {
							this.renderNode(oDomRef,oAggregation[i],iLevel + 1);
						}
					}
				} else if (oAggregation instanceof Element) {
					this.renderNode(oDomRef,oAggregation,iLevel + 1);
				}
			}
		}
		if (oControl.mAssociations) {
			for (var n in oControl.mAssociations) {
				bRequiresExpanding = true;
				var oAssociation = oControl.mAssociations[n];
				if (Array.isArray(oAssociation)) {
					for (var i = 0;i < oAssociation.length;i++) {
						var o = oAssociation[i];
						if (typeof o === "string") {
							this.createLinkNode(oDomRef, o, iLevel + 1);
						}
					}
				} else if (typeof oAssociation === "string") {
					this.createLinkNode(oDomRef, oAssociation, iLevel + 1);
				}
			}
		}
		if ( bRequiresExpanding ) {
			var oExpandImage = oDomNode.getElementsByTagName("IMG")[0];
			oExpandImage.src = this.sMinusUrl;
			oExpandImage.style.display = "";
		}

	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.onclick = function(oEvent) {
		var oSource = oEvent.target;
		if (oSource.tagName == "IMG") {
			var oParent = oSource.parentNode,
				iLevel = parseInt(oParent.getAttribute("sap-level")),
				oNextNode = oParent.nextSibling,
				bExpanded = oParent.getAttribute("sap-expanded") == "true";
			// propagate expanded state to all children
			oSource = oParent.firstChild;
			if (oNextNode) {
				var iNextLevel = parseInt(oNextNode.getAttribute("sap-level"));
				while (oNextNode && iNextLevel > iLevel) {
					var oExpandImage = oNextNode.getElementsByTagName("IMG")[0];
					if (bExpanded) {
						oNextNode.style.display = "none";
						oNextNode.setAttribute("sap-expanded","false");
						if ( oExpandImage && oExpandImage.src !== this.sSpaceUrl ) {
							oExpandImage.src = this.sPlusUrl;
						}
					} else {
						oNextNode.style.display = "block";
						oNextNode.setAttribute("sap-expanded","true");
						if ( oExpandImage && oExpandImage.src !== this.sSpaceUrl ) {
							oExpandImage.src = this.sMinusUrl;
						}
					}
					oNextNode = oNextNode.nextSibling;
					if (oNextNode) {
						iNextLevel = parseInt(oNextNode.getAttribute("sap-level"));
					}
				}
			}
			if (bExpanded) {
				oSource.src = this.sPlusUrl;
				oParent.setAttribute("sap-expanded","false");
			} else {
				oSource.src = this.sMinusUrl;
				oParent.setAttribute("sap-expanded","true");
			}

		//} else if (oSource.getAttribute("sap-type") == "UIArea") {

		} else {
			if (oSource.tagName != "SPAN") {
				oSource = oSource.getElementsByTagName("SPAN")[0];
			}
			var oParent = oSource.parentNode,
				sId = oParent.getAttribute("sap-id"),
				oElement = Element.getElementById(sId),
				sNodeId = oParent.getAttribute("sap-type") === "Link" ? "sap-debug-controltree-" + sId : oParent.id;
			this.oSelectionHighlighter.hide();
			if (oElement instanceof Element) {
				this.oSelectionHighlighter.highlight(oElement.getDomRef());
				this.oHoverHighlighter.hide();
			}
			this.deselectNode(this.sSelectedNodeId);
			this.selectNode(sNodeId);
		}
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.onmouseover = function(oEvent) {
		var oSource = oEvent.target;
		if (oSource.tagName == "SPAN") {
			this.oHoverHighlighter.highlight(this.getTargetDomRef(oSource.parentNode));
		}
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.onmouseout = function(oEvent) {
		var oSource = oEvent.target;
		if (oSource.tagName == "SPAN") {
			if ( this.getTargetDomRef(oSource.parentNode) ) {
				this.oHoverHighlighter.hide();
			}
		}
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.selectNode = function(sId) {
		if (!sId) {
			return;
		}
		var oDomRef = (getOwnerWindow(this.oParentDomRef) || window).document.getElementById(sId);
		if ( !oDomRef ) {
			Log.warning("Control with Id '" + sId.substring(22) + "' not found in tree");
			return;
		}
		var	sControlId = oDomRef.getAttribute("sap-id");
		var oSpan = oDomRef.getElementsByTagName("SPAN")[0];
		oSpan.style.backgroundColor = "#000066";
		oSpan.style.color = "#FFFFFF";
		this.sSelectedNodeId = sId;

		this.fireEvent(ControlTree.M_EVENTS.SELECT,{id:sId, controlId: sControlId});
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	ControlTree.prototype.deselectNode = function(sId) {
		if (!sId) {
			return;
		}
		var oDomRef = (getOwnerWindow(this.oParentDomRef) || window).document.getElementById(sId);
		var oSpan = oDomRef.getElementsByTagName("SPAN")[0];
		oSpan.style.backgroundColor = "transparent";
		oSpan.style.color = "#000000";
		this.sSelectedNodeId = sId;
	};

	/**
	 * Tries to find the innermost DOM node in the source window that contains the
	 * SAPUI5 element/UIArea identified by the given tree node.
	 *
	 * If elements in the hierarchy don't return a value for {@link sap.ui.core.Element#getDomRef}
	 * (e.g. because they don't render a DOM node with their own id), enclosing parents
	 * are checked until the UIArea is reached.
	 *
	 * @param oTreeNodeDomRef the tree node to start the search for
	 * @return {Element} best matching source DOM node
	 * @private
	 */
	ControlTree.prototype.getTargetDomRef = function(oTreeNodeDomRef) {
		var sType = oTreeNodeDomRef.getAttribute("sap-type"),
			sId = oTreeNodeDomRef.getAttribute("sap-id"),
			oSomething = sType === "UIArea" ? UIAreaRegistry.get(sId) : Element.getElementById(sId);

		while (oSomething instanceof Element) {
			var oDomRef = oSomething.getDomRef();
			if ( oDomRef ) {
				return oDomRef;
			}
			oSomething = oSomething.getParent();
		}

		if ( oSomething.isA && oSomething.isA("sap.ui.core.UIArea") ) {
			return oSomething.getRootNode();
		}
	};

	/**
	 * Enables an 'onhover' handler in the content window that allows to see control borders.
	 * @private
	 */
	ControlTree.prototype.enableInplaceControlSelection = function() {
		this.selectControlInTree = ControlTree.prototype.selectControlInTree.bind(this);
		document.addEventListener("mouseover", this.selectControlInTree);
	};

	ControlTree.prototype.selectControlInTree = function( oEvt ) {
		if ( oEvt ) {
		  if ( oEvt.ctrlKey && oEvt.shiftKey && !oEvt.altKey ) {
			  var oControl = oEvt.srcElement || oEvt.target;
			  while (oControl && (!oControl.id || !Element.getElementById(oControl.id)) ) {
				oControl = oControl.parentNode;
			}
			 if ( oControl && oControl.id && Element.getElementById(oControl.id) ) {
				this.oHoverHighlighter.highlight(oControl);
			 } else {
			// this.selectControlInTreeByCtrlId(sId);
				  this.oHoverHighlighter.hide();
			 }

		  } else {
			  this.oHoverHighlighter.hide();
		  }
		}
	};

	return ControlTree;

});
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// A core plugin that bundles debug features and connects with an embedding testsuite
sap.ui.predefine('sap/ui/debug/DebugEnv', [
	"sap/base/config",
	"sap/base/i18n/Localization",
	"sap/ui/base/Interface",
	"./ControlTree",
	"./LogViewer",
	"./PropertyList",
	"sap/base/Log",
	"sap/ui/thirdparty/jquery",
	"sap/ui/core/Supportability",
	"sap/ui/core/Rendering"
], function(
	BaseConfig,
	Localization,
	Interface,
	ControlTree,
	LogViewer,
	PropertyList,
	Log,
	jQuery,
	Supportability,
	Rendering
) {
	"use strict";


	/**
	 * Creates an instance of the class <code>sap.ui.debug.DebugEnv</code>
	 *
	 * @class Central Class for the Debug Environment
	 *
	 * @author Martin Schaus, Frank Weigel
	 * @version 1.125.0
	 * @private
	 * @alias sap.ui.debug.DebugEnv
	 * @deprecated As of Version 1.120
	 */
	var DebugEnv = function() {
	};

	/**
	 * Will be invoked by <code>sap.ui.core.Core</code> to notify the plugin to start.
	 *
	 * @param {sap.ui.core.Core} oCore reference to the Core
	 * @param {boolean} [bOnInit] whether the hook is called during core initialization
	 * @public
	 */
	DebugEnv.prototype.startPlugin = function(oCore, bOnInit) {

		this.oCore = oCore;
		this.oWindow = window;

		/**
		 * Whether the debugenv should run embedded in application page (true) or in testsuite (false).
		 * @private
		 */
		try {
			this.bRunsEmbedded = typeof window.top.testfwk === "undefined"; // window || !top.frames["sap-ui-TraceWindow"];

			Log.info("Starting DebugEnv plugin (" + (this.bRunsEmbedded ? "embedded" : "testsuite") + ")");

			// initialize only if running in testsuite or when debug views are not disabled via URL parameter
			if (!this.bRunsEmbedded || Supportability.isControlInspectorEnabled()) {
				this.init(bOnInit);
			}
			if (!this.bRunsEmbedded || BaseConfig.get({ name: "sapUiTrace", type: BaseConfig.Type.Boolean })) {
				this.initLogger(Log, bOnInit);
			}
		} catch (oException) {
			Log.warning("DebugEnv plugin can not be started outside the Testsuite.");
		}
	};

	/**
	 * Will be invoked by <code>sap.ui.core.Core</code> to notify the plugin to start
	 * @public
	 */
	DebugEnv.prototype.stopPlugin = function() {
		Log.info("Stopping DebugEnv plugin.");
		this.oCore = null;
	};

	/**
	 * Initializes the ControlTreeView and PropertyListView of the <code>sap.ui.debug.DebugEnv</code>
	 * @private
	 */
	DebugEnv.prototype.init = function(bOnInit) {
		this.oControlTreeWindow = this.bRunsEmbedded ? this.oWindow : (top.document.getElementById("sap-ui-ControlTreeWindow") || top.frames["sap-ui-ControlTreeWindow"] || top);
		this.oPropertyListWindow = this.bRunsEmbedded ? this.oWindow : (top.document.getElementById("sap-ui-PropertyListWindow") || top.frames["sap-ui-PropertyListWindow"] || top);

		var bRtl = Localization.getRTL();

		/* TODO enable switch to testsuite
		if ( this.bRunsEmbedded ) {
			var div = this.oWindow.document.createElement("DIV");
			div.style.position = "absolute";
			div.style.right = '202px';
			div.style.top = '1px';
			div.style.width = '32px';
			div.style.height = '32px';
			div.style.border = '1px solid black';
			div.style.backgroundColor = 'blue';
			div.style.backgroundImage = "url(" + sap.ui.global.resourceRoot + "testsuite/images/full.png)";
			div.style.zIndex = 5;
			div.style.opacity = '0.2';
			jQuery(div).on("click",function(evt) {
				alert("click!");
			});
			/ *
			jQuery(div).on("mouseover",function(evt) {
				alert("click!");
			});
			jQuery(div).on("mouseout",function(evt) {
				alert("click!");
			}); * /
			this.oWindow.document.body.appendChild(div);
		}
		*/

		var oControlTreeRoot = (this.oControlTreeWindow.document || this.oControlTreeWindow).querySelector("#sap-ui-ControlTreeRoot"),
			oPropertyWindowRoot = (this.oPropertyListWindow.document || this.oPropertyListWindow).querySelector("#sap-ui-PropertyWindowRoot");

		if ( !oControlTreeRoot ) {
			oControlTreeRoot = this.oControlTreeWindow.document.createElement("DIV");
			oControlTreeRoot.setAttribute("id", "sap-ui-ControlTreeRoot");
			oControlTreeRoot.setAttribute("tabindex", -1);
			oControlTreeRoot.style.position = "absolute";
			oControlTreeRoot.style.fontFamily = "Arial";
			oControlTreeRoot.style.fontSize = "8pt";
			oControlTreeRoot.style.backgroundColor = "white";
			oControlTreeRoot.style.color = "black";
			oControlTreeRoot.style.border = "1px solid gray";
			oControlTreeRoot.style.overflow = "auto";
			oControlTreeRoot.style.zIndex = "999999";
			oControlTreeRoot.style.top = "1px";
			if (bRtl) {
				oControlTreeRoot.style.left = "1px";
			} else {
				oControlTreeRoot.style.right = "1px";
			}
			oControlTreeRoot.style.height = "49%";
			oControlTreeRoot.style.width = "200px";
			this.oControlTreeWindow.document.body.appendChild(oControlTreeRoot);
		} else {
			oControlTreeRoot.innerHTML = "";
		}
		this.oControlTreeRoot = oControlTreeRoot;

		if ( !oPropertyWindowRoot ) {
			oPropertyWindowRoot = this.oPropertyListWindow.document.createElement("DIV");
			oPropertyWindowRoot.setAttribute("id", "sap-ui-PropertyWindowRoot");
			oPropertyWindowRoot.setAttribute("tabindex", -1);
			oPropertyWindowRoot.style.position = "absolute";
			oPropertyWindowRoot.style.fontFamily = "Arial";
			oPropertyWindowRoot.style.fontSize = "8pt";
			oPropertyWindowRoot.style.backgroundColor = "white";
			oPropertyWindowRoot.style.color = "black";
			oPropertyWindowRoot.style.border = "1px solid gray";
			oPropertyWindowRoot.style.overflow = "auto";
			oPropertyWindowRoot.style.zIndex = "99999";
			oPropertyWindowRoot.style.width = "196px";
			oPropertyWindowRoot.style.height = "49%";
			if (bRtl) {
				oPropertyWindowRoot.style.left = "1px";
			} else {
				oPropertyWindowRoot.style.right = "1px";
			}
			oPropertyWindowRoot.style.bottom = "1px";
			this.oPropertyListWindow.document.body.appendChild(oPropertyWindowRoot);
		} else {
			oPropertyWindowRoot.innerHTML = "";
		}
		this.oPropertyWindowRoot = oPropertyWindowRoot;

		this.oControlTree = new ControlTree(this.oCore, this.oWindow, oControlTreeRoot, this.bRunsEmbedded);
		this.oPropertyList = new PropertyList(this.oCore, this.oWindow, oPropertyWindowRoot);
		this.oControlTree.attachEvent(ControlTree.M_EVENTS.SELECT, this.oPropertyList.update,
				this.oPropertyList);
		if ( !bOnInit ) {
			this.oControlTree.renderDelayed();
		}

		/**
		 * The block below is not needed because it only did a cleanup
		 * before the page was closed. This should not be necessary.
		 * Nevertheless we leave the coding here and only deprecate it,
		 * in order to keep the BFCache behavior stable.
		 * Removing the 'unload' handler could potentially activate
		 * the BFCache and cause a different behavior in browser versions
		 * where the 'unload' handler is still supported.
		 * Therefore we only removed the not needed cleanup coding
		 * but still attach a noop to ensure this handler would still
		 * invalidate the BFCache.
		 * @deprecated as of 1.119
		 */
		window.addEventListener("unload", () => {});
	};

	/**
	 * Initializes the LogViewer of the <code>sap.ui.debug.DebugEnv</code>
	 * @private
	 */
	DebugEnv.prototype.initLogger = function(oLogger, bOnInit) {
		this.oLogger = oLogger;
		this.oLogger.setLogEntriesLimit(Infinity);
		if ( !this.bRunsEmbedded ) {
			// attach test suite log viewer to our Log
			this.oTraceWindow = top.document.getElementById("sap-ui-TraceWindow");
			if ( this.oTraceWindow ) {
				this.oTraceViewer = top.oLogViewer = new LogViewer(this.oTraceWindow, 'sap-ui-TraceWindowRoot');
			} else {
				this.oTraceWindow = top.frames["sap-ui-TraceWindow"];
				this.oTraceViewer = this.oTraceWindow.oLogViewer = new LogViewer(this.oTraceWindow, 'sap-ui-TraceWindowRoot');
			}
			this.oTraceViewer.sLogEntryClassPrefix = "lvl"; // enforce use of CSS instead of DOM styles
			this.oTraceViewer.lock();
		} else {
			// create an embedded log viewer
			this.oTraceWindow = this.oWindow;
			this.oTraceViewer = new LogViewer(this.oTraceWindow, 'sap-ui-TraceWindowRoot');
		}
		this.oLogger.addLogListener(this.oTraceViewer);

		// When debug.js is injected (testsuite), it is not initialized during Core.init() but later.
		// In Chrome the startPlugin happens after rendering, therefore the first 'UIUpdated' is missed.
		// To compensate this, we register for both, the UIUpdated and for a timer (if we are not called during Core.init)
		// Whatever happens first.
		// TODO should be part of core
		Rendering.attachUIUpdated(this.enableLogViewer, this);
		if ( !bOnInit ) {
			var that = this;
			this.oTimer = setTimeout(function() {
				that.enableLogViewer();
			}, 0);
		}
	};

	DebugEnv.prototype.enableLogViewer = function() {
		// clear timeout (necessary in case we have been notified via attachUIUpdated)
		if ( this.oTimer ) {
			clearTimeout(this.oTimer);
			this.oTimer = undefined;
		}
		// clear listener (necessary to avoid multiple calls and in case we are called via timer)
		Rendering.detachUIUpdated(this.enableLogViewer, this);

		// real action: enable the LogViewer
		if ( this.oTraceViewer) {
			this.oTraceViewer.unlock();
		}
	};

	/**
	 * Whether the DebugEnv is running embedded in app page or not (which then means running in a test suite)
	 */
	DebugEnv.prototype.isRunningEmbedded = function() {
		return this.bRunsEmbedded;
	};

	/**
	 * Whether the ControlTree is visible
	 */
	DebugEnv.prototype.isControlTreeShown = function() {
		return jQuery(this.oControlTreeRoot).css("visibility") === "visible" || jQuery(this.oControlTreeRoot).css("visibility") === "inherit";
	};

	/**
	 * Will be called to show the ControlTree
	 */
	DebugEnv.prototype.showControlTree = function() {
		if (!this.oControlTreeRoot) {
			this.init(false);
		}
		jQuery(this.oControlTreeRoot).css("visibility", "visible");
	};

	/**
	 * Will be called to hide the ControlTree
	 */
	DebugEnv.prototype.hideControlTree = function() {
		jQuery(this.oControlTreeRoot).css("visibility", "hidden");
	};

	/**
	 * Whether the LogViewer is shown
	 */
	DebugEnv.prototype.isTraceWindowShown = function() {
		var oLogViewer = this.oTraceWindow && this.oTraceWindow.document.getElementById('sap-ui-TraceWindowRoot');
		return oLogViewer && (jQuery(oLogViewer).css("visibility") === "visible" || jQuery(oLogViewer).css("visibility") === "inherit");
	};

	/**
	 * Will be called to show the TraceWindow
	 */
	DebugEnv.prototype.showTraceWindow = function() {
		if ( !this.oTraceWindow ) {
			this.initLogger(Log, false);
		}
		var oLogViewer = this.oTraceWindow && this.oTraceWindow.document.getElementById('sap-ui-TraceWindowRoot');
		if ( oLogViewer ) {
			jQuery(oLogViewer).css("visibility", "visible");
		}
	};

	/**
	 * Will be called to hide the TraceWindow
	 */
	DebugEnv.prototype.hideTraceWindow = function() {
		var oLogViewer = this.oTraceWindow && this.oTraceWindow.document.getElementById('sap-ui-TraceWindowRoot');
		if ( oLogViewer ) {
			jQuery(oLogViewer).css("visibility", "hidden");
		}
	};

	/**
	 * Will be called to show the PropertyList
	 */
	DebugEnv.prototype.isPropertyListShown = function() {
		return jQuery(this.oPropertyWindowRoot).css("visibility") === "visible" || jQuery(this.oPropertyWindowRoot).css("visibility") === "inherit";
	};

	/**
	 * Will be called to show the PropertyList
	 */
	DebugEnv.prototype.showPropertyList = function() {
		if (!this.oPropertyWindowRoot) {
			this.init(false);
		}
		jQuery(this.oPropertyWindowRoot).css("visibility", "visible");
	};

	/**
	 * Will be called to hide the PropertyList
	 */
	DebugEnv.prototype.hidePropertyList = function() {
		jQuery(this.oPropertyWindowRoot).css("visibility", "hidden");
	};

	/**
	 * Create the <code>sap.ui.debug.DebugEnv</code> plugin and register
	 * it within the <code>sap.ui.core.Core</code>.
	 */
	(function(){
		var oThis = new DebugEnv();
		sap.ui.getCore().registerPlugin(oThis);
		var oInterface = new Interface(oThis, ["isRunningEmbedded", "isControlTreeShown", "showControlTree", "hideControlTree", "isTraceWindowShown", "showTraceWindow", "hideTraceWindow", "isPropertyListShown", "showPropertyList", "hidePropertyList"]);
		DebugEnv.getInstance = function() {
			return oInterface;
		};
	}());

	return DebugEnv;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides a helper that can highlight a given control
sap.ui.predefine('sap/ui/debug/Highlighter', [
	"sap/ui/thirdparty/jquery",
	"sap/base/util/uid",
	"sap/ui/dom/jquery/rect" // jQuery Plugin "rect"
	],
	function(jQuery, uid) {
	"use strict";


	/**
	 * Creates a new highlighter object without displaying it.
	 *
	 * The DOM node is not created until the first call to method {@link #highlight}.
	 *
	 * @param {string} [sId] id that is used by the new highlighter
	 * @param {boolean} [bFilled] whether the box of the highlighter is partially opaque (20%), defaults to false
	 * @param {string} [sColor] the CSS color of the border and the box (defaults to blue)
	 * @param {int} [iBorderWidth] the width of the border
	 *
	 * @class Helper class to display a colored rectangle around and above a given DOM node
	 * @author Frank Weigel
	 * @since 0.8.7
	 * @public
	 * @alias sap.ui.debug.Highlighter
	 */
	var Highlighter = function(sId, bFilled, sColor, iBorderWidth) {
		this.sId = sId || uid();
		this.bFilled = (bFilled == true);
		this.sColor = sColor || 'blue';
		if ( isNaN(iBorderWidth ) ) {
			this.iBorderWidth = 2;
		} else if ( iBorderWidth <= 0 ) {
			this.iBorderWidth = 0;
		} else {
			this.iBorderWidth = iBorderWidth;
		}
	};

	/**
	 * Shows a rectangle/box that surrounds the given DomRef.
	 *
	 * If this is the first call to {@link #highlight} for this instance, then
	 * a DOM node for the highlighter is created in the same document as the given <code>oDomRef</code>.
	 *
	 * <b>Note:</b> As the DOM node is reused across multiple calls, the highlighter must only be used
	 * within a single document.
	 */
	Highlighter.prototype.highlight = function(oDomRef) {
		if (!oDomRef || !oDomRef.parentNode) {
			return;
		}

		var oHighlightRect = (this.sId ? window.document.getElementById(this.sId) : null);
		if (!oHighlightRect) {
			oHighlightRect = oDomRef.ownerDocument.createElement("div");
			oHighlightRect.setAttribute("id", this.sId);
			oHighlightRect.style.position = "absolute";
			oHighlightRect.style.border = this.iBorderWidth + "px solid " + this.sColor;
			oHighlightRect.style.display = "none";
			oHighlightRect.style.margin = "0px";
			oHighlightRect.style.padding = "0px";
			if ( this.bFilled ) {
				var oFiller = oDomRef.ownerDocument.createElement("div");
				oFiller.textContent = "\u00a0";
				oFiller.style.backgroundColor = this.sColor;
				oFiller.style.opacity = "0.2";
				oFiller.style.height = "100%";
				oFiller.style.width = "100%";
				oHighlightRect.appendChild(oFiller);
			}
			oDomRef.ownerDocument.body.appendChild(oHighlightRect);
		}
		var oRect = jQuery(oDomRef).rect();
		oHighlightRect.style.top = (oRect.top - this.iBorderWidth) + "px";
		oHighlightRect.style.left = (oRect.left - this.iBorderWidth) + "px";
		oHighlightRect.style.width = (oRect.width) + "px";
		oHighlightRect.style.height = (oRect.height) + "px";
		oHighlightRect.style.display = "block";
	};

	/**
	 * Hides the rectangle/box if it is currently shown.
	 */
	Highlighter.prototype.hide = function() {
		var oHighlightRect = (this.sId ? window.document.getElementById(this.sId) : null);
		if (!oHighlightRect) {
			return;
		}
		oHighlightRect.style.display = "none";
	};

	return Highlighter;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides a log viewer for debug purposes
sap.ui.predefine('sap/ui/debug/LogViewer', function() {
	"use strict";


	/**
	 * Constructs a LogViewer in the given window, embedded into the given DOM element.
	 * If the DOM element doesn't exist, a DIV is created.
	 *
	 * @param {Window} oWindow The window where the log will be displayed in
	 * @param {sRootId} sRootId ID of the top level element that will contain the log entries
	 *
	 * @class HTML LogViewer that displays all entries of a Logger, as long as they match a filter and a minimal log level
	 * @alias sap.ui.debug.LogViewer
	 */
	var LogViewer = function(oWindow, sRootId) {
		this.oWindow = oWindow;
		this.oDomNode = oWindow.querySelector("#" + sRootId);
		if (!this.oDomNode) {
			var oDiv = this.oWindow.document.createElement("DIV");
			oDiv.setAttribute("id", sRootId);
			oDiv.style.overflow = "auto";
			oDiv.style.tabIndex = "-1";
			oDiv.style.position = "absolute";
			oDiv.style.bottom = "0px";
			oDiv.style.left = "0px";
			oDiv.style.right = "202px";
			oDiv.style.height = "200px";
			oDiv.style.border = "1px solid gray";
			oDiv.style.fontFamily = "Arial monospaced for SAP,monospace";
			oDiv.style.fontSize   = "11px";
			oDiv.style.zIndex = "999999";
			this.oWindow.document.body.appendChild(oDiv);
			this.oDomNode = oDiv;
		}
		this.iLogLevel = 3; /* Log.LogLevel.INFO */
		this.sLogEntryClassPrefix = undefined;
		this.clear();
		this.setFilter(LogViewer.NO_FILTER);
	};

	LogViewer.NO_FILTER = function(oLogMessage) {
		return true;
	};

	LogViewer.prototype.clear = function() {
		this.oDomNode.innerHTML = "";
	};

	/**
	 * Returns an XML escaped version of a given string sText
	 * @param {string} sText the string that is escaped.
	 * @return {string} an XML escaped version of a given string sText
	 * @private
	 */
	LogViewer.xmlEscape = function(sText) {
		sText = sText.replace(/\&/g, "&amp;");
		sText = sText.replace(/\</g, "&lt;");
		sText = sText.replace(/\"/g, "&quot;");
		return sText;
	};
	/**
	 * Renders a single log entry to the DOM. Could be overwritten in subclasses.
	 * @param {object} oLogEntry
	 * @protected
	 */
	LogViewer.prototype.addEntry = function(oLogEntry) {

		var oDomEntry = this.oWindow.ownerDocument.createElement("div");

		// style the entry
		if ( this.sLogEntryClassPrefix ) {
			// note: setting a class has only an effect when the main.css is loaded (testsuite)
			oDomEntry.className = this.sLogEntryClassPrefix + oLogEntry.level;
		} else {
			oDomEntry.style.overflow = "hidden";
			oDomEntry.style.textOverflow = "ellipsis";
			oDomEntry.style.height = "1.3em";
			oDomEntry.style.width = "100%";
			oDomEntry.style.whiteSpace = "noWrap";
		}

		// create text as text node
		var sText = LogViewer.xmlEscape(oLogEntry.time + "  " + oLogEntry.message),
			oTextNode = this.oWindow.ownerDocument.createTextNode(sText);
		oDomEntry.appendChild(oTextNode);
		oDomEntry.title = oLogEntry.message;

		// filter
		oDomEntry.style.display = this.oFilter(sText) ? "" : "none";

		this.oDomNode.appendChild(oDomEntry);

		return oDomEntry;
	};

	LogViewer.prototype.fillFromLogger = function(iFirstEntry) {
		this.clear();
		this.iFirstEntry = iFirstEntry;
		if ( !this.oLogger ) {
			return;
		}

		// when attached to a log, clear the dom node and add all entries from the log
		var aLog = this.oLogger.getLogEntries();
		for (var i = this.iFirstEntry,l = aLog.length;i < l; i++) {
			if ( aLog[i].level <= this.iLogLevel ) {
				this.addEntry(aLog[i]);
			}
		}

		this.scrollToBottom();
	};

	LogViewer.prototype.scrollToBottom = function() {
		this.oDomNode.scrollTop = this.oDomNode.scrollHeight;
	};

	LogViewer.prototype.truncate = function() {
		this.clear();
		this.fillFromLogger(this.oLogger.getLogEntries().length);
	};

	LogViewer.prototype.setFilter = function(oFilter) {
		this.oFilter = oFilter = oFilter || LogViewer.NO_FILTER;
		var childNodes = this.oDomNode.childNodes;
		for (var i = 0,l = childNodes.length; i < l; i++) {
			var sText = childNodes[i].innerText;
			if (!sText) {
				sText = childNodes[i].innerHTML;
			}
			childNodes[i].style.display = oFilter(sText) ? "" : "none";
		}
		this.scrollToBottom();
	};

	LogViewer.prototype.setLogLevel = function(iLogLevel) {
		this.iLogLevel = iLogLevel;
		if ( this.oLogger ) {
			this.oLogger.setLevel(iLogLevel);
		}
		// fill and filter again
		this.fillFromLogger(this.iFirstEntry);
	};

	LogViewer.prototype.lock = function() {
		this.bLocked = true;
		//this.oDomNode.style.backgroundColor = 'gray'; // marker for 'locked' state
	};

	LogViewer.prototype.unlock = function() {
		this.bLocked = false;
		//this.oDomNode.style.backgroundColor = ''; // clear 'locked' marker
		this.fillFromLogger(0);
		// this.addEntry({ time : '---------', message: '---------------', level : 3});
	};

	LogViewer.prototype.onAttachToLog = function(oLogger) {
		this.oLogger = oLogger;
		this.oLogger.setLevel(this.iLogLevel);
		if ( !this.bLocked ) {
			this.fillFromLogger(0);
		}
	};

	LogViewer.prototype.onDetachFromLog = function(oLogger) {
		this.oLogger = undefined;
		this.fillFromLogger(0); // clears the viewer
	};

	LogViewer.prototype.onLogEntry = function(oLogEntry) {
		if ( !this.bLocked ) {
			var oDomRef = this.addEntry(oLogEntry);
			if ( oDomRef && oDomRef.style.display !== 'none' ) {
				this.scrollToBottom();
			}
		}
	};

	return LogViewer;

}, /* bExport= */ true);
/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

// Provides a (modifiable) list of properties for a given control
sap.ui.predefine('sap/ui/debug/PropertyList', [
	'sap/ui/base/DataType',
	'sap/ui/base/EventProvider',
	'sap/ui/core/Element',
	'sap/ui/core/ElementMetadata',
	'sap/base/util/isEmptyObject',
	'sap/base/security/encodeXML'
],
	function(
		DataType,
		EventProvider,
		Element,
		ElementMetadata,
		isEmptyObject,
		encodeXML
	) {
	"use strict";


	/**
	 * Constructs the class <code>sap.ui.debug.PropertyList</code>.
	 *
	 * @class HTML Property list for a <code>sap.ui.core.Control</code> in the
	 * Debug Environment
	 *
	 * @extends sap.ui.base.EventProvider
	 * @author Martin Schaus
	 * @version 1.125.0
	 *
	 * @param {sap.ui.core.Core}
	 *            oCore Core instance of the app; version might differ!
	 * @param {Window}
	 *            oWindow Window in which the app is running
	 * @param {object}
	 *            oParentDomRef DOM element where the PropertyList will be rendered (part of testsuite window)
	 *
	 * @alias sap.ui.debug.PropertyList
	 * @private
	 */
	var PropertyList = EventProvider.extend("sap.ui.debug.PropertyList", /** @lends sap.ui.debug.PropertyList.prototype */ {
		constructor: function(oCore, oWindow, oParentDomRef) {
			EventProvider.apply(this,arguments);
			this.oWindow = oWindow;
			this.oParentDomRef = oParentDomRef;
		//	this.oCore = oWindow.sap.ui.getCore();
			this.oCore = oCore;
			// Note: window.top is assumed to refer to the app window in embedded mode or to the testsuite window otherwise
			var link = window.top.document.createElement("link");
			link.rel = "stylesheet";
			link.href = window.top.sap.ui.require.toUrl("sap/ui/debug/PropertyList.css");
			window.top.document.head.appendChild(link);

			this.onchange = PropertyList.prototype.onchange.bind(this);
			oParentDomRef.addEventListener("change", this.onchange);
			this.onfocus = PropertyList.prototype.onfocus.bind(this);
			oParentDomRef.addEventListener("focusin", this.onfocus);
			this.onkeydown = PropertyList.prototype.onkeydown.bind(this);
			oParentDomRef.addEventListener("keydown", this.onkeydown);
			//this.oParentDomRef.style.backgroundColor = "#e0e0e0";
			//this.oParentDomRef.style.border = "solid 1px gray";
			//this.oParentDomRef.style.padding = "2px";

		}
	});

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	PropertyList.prototype.exit = function() {
		this.oParentDomRef.removeEventListener("change", this.onchange);
		this.oParentDomRef.removeEventListener("focusin", this.onfocus);
		this.oParentDomRef.removeEventListener("keydown", this.onkeydown);
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	PropertyList.prototype.update = function(oParams) {
		var sControlId = this.sControlId = oParams.getParameter("controlId");
		this.oParentDomRef.innerHTML = "";

		var oControl = Element.getElementById(sControlId);
		if (!oControl) {
			this.oParentDomRef.innerHTML = "Please select a valid control";
			return;
		}
		var oMetadata = oControl.getMetadata(),
			aHTML = [];
		aHTML.push("Type : " + oMetadata.getName() + "<br >");
		aHTML.push("Id : " + oControl.getId() + "<br >");
		aHTML.push("<div class='sapDbgSeparator'>&nbsp;</div>");
		aHTML.push("<table class='sapDbgPropertyList' cellspacing='1'><tbody>");

		while ( oMetadata instanceof ElementMetadata ) {
			var oSettings = this.getPropertyLikeSettings(oMetadata);
			if ( !isEmptyObject(oSettings) ) {
				if ( oMetadata !== oControl.getMetadata() ) {
					aHTML.push("<tr><td class='sapDbgPLSubheader' colspan=\"2\">BaseType: ");
					aHTML.push(oMetadata.getName());
					aHTML.push("</td></tr>");
				}
				this.renderSettings(aHTML, oControl, oSettings);
			}
			oMetadata = oMetadata.getParent();
		}

		aHTML.push("</tbody></table>");
		this.oParentDomRef.innerHTML = aHTML.join("");
		this.mHelpDocs = {};
	};

	PropertyList.prototype.getPropertyLikeSettings = function(oMetadata) {
		var mSettings = {};
		Object.values(oMetadata.getProperties()).forEach(function(oProp) {
			mSettings[oProp.name] = oProp;
		});
		// also display 0..1 aggregations with a simple altType
		Object.values(oMetadata.getAggregations()).forEach(function(oAggr) {
			if ( oAggr.multiple === false
				 && oAggr.altTypes && oAggr.altTypes.length
				 && DataType.getType(oAggr.altTypes[0]) != null ) {
				mSettings[oAggr.name] = oAggr;
			}
		});
		return mSettings;
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	PropertyList.prototype.renderSettings = function(aHTML, oControl, mSettings) {
		Object.values(mSettings).forEach(function(oSetting) {
			var sName = oSetting.name,
				oValue = oSetting.get(oControl),
				oType = oSetting.multiple === false ? DataType.getType(oSetting.altTypes[0]) : oSetting.getType();

			aHTML.push("<tr><td>");
			aHTML.push(sName);
			aHTML.push("</td><td>");
			var sTitle = "";

			if ( oType.getPrimitiveType().getName() === "boolean" ) {
				aHTML.push("<input type='checkbox' data-name='" + sName + "' ");
				if (oValue == true) {
					aHTML.push("checked='checked'");
				}
				aHTML.push(">");
			} else if ( oType.isEnumType() ) {
				var oEnum = oType.getEnumValues();
				aHTML.push("<select data-name='" + sName + "'>");
				for (var n in oEnum) {
					aHTML.push("<option ");
					if (n === oValue) {
						aHTML.push(" selected ");
					}
					aHTML.push("value='" + encodeXML(n) + "'>");
					aHTML.push(encodeXML(n));
					aHTML.push("</option>");
				}
				aHTML.push("</select>");
			} else {
				var sValueClass = '';
				if ( oValue === null ) {
					sValueClass = "class='sapDbgComplexValue'";
					oValue = '(null)';
				} else if ( oValue instanceof Element ) {
					sValueClass = "class='sapDbgComplexValue'";
					if (Array.isArray(oValue)) {
						// array type (copied from primitive values above and modified the value to string / comma separated)
						oValue = oValue.join(", ");
					} else {
						oValue = String(oValue);
					}
					sTitle = ' title="This aggregation currently references an Element. You can set a ' + oType.getName() +  ' value instead"';
				}
				aHTML.push("<input type='text' " + sValueClass + " value='" + encodeXML("" + oValue) + "'" + sTitle + " data-name='" + sName + "'>");
			}
			aHTML.push("</td></tr>");
		});
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	PropertyList.prototype.onkeydown = function(oEvent) {
		var oSource = oEvent.target;
		if (oEvent.keyCode == 13 && oSource.tagName === "INPUT" && oSource.type === "text") {
			this.applyChange(oSource);
		}
	};

	/**
	 * Listener for the 'change' event of editor controls.
	 * @private
	 */
	PropertyList.prototype.onchange = function(oEvent) {
		var oSource = oEvent.target;
		if (oSource.tagName === "SELECT" || oSource.tagName === "INPUT") {
			this.applyChange(oSource);
		}
	};

	/**
	 * TODO: missing internal JSDoc... @author please update
	 * @private
	 */
	PropertyList.prototype.onfocus = function(oEvent) {
		var oSource = oEvent.target;
		if (oSource.tagName === "INPUT" && oSource.dataset.name ) {
			if ( oSource.style.color === '#a5a5a5' /* && oSource.value === '(null)' */ ) {
				oSource.style.color = '';
				oSource.value = '';
			}
		}
	};

	/**
	 * Applies the current value from the given editor field
	 * to the corresponding setting of the currently displayed control or element.
	 * @param {HTMLInputElement|HTMLSelectElement} oField An editor field
	 * @private
	 */
	PropertyList.prototype.applyChange = function(oField) {
		var oControl = Element.getElementById(this.sControlId),
			sName = oField.dataset.name,
			oSetting = oControl.getMetadata().getPropertyLikeSetting(sName);

		if ( oSetting ) {
			var sValue = oField.type === "checkbox" ? String(oField.checked) : oField.value,
				oType = oSetting.multiple != null ? DataType.getType(oSetting.altTypes[0]) : oSetting.getType();
			if (oType) {
				var vValue = oType.parseValue(sValue);
				if (oType.isValid(vValue) && vValue !== "(null)" ) {
					oSetting.set(oControl, vValue);
					oField.classList.remove("sapDbgComplexValue");
				}
			}
		}
	};

	return PropertyList;

});
sap.ui.requireSync("sap/ui/debug/DebugEnv");
//# sourceMappingURL=sap-ui-debug.js.map
