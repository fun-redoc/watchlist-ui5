/*!
 * OpenUI5
 * (c) Copyright 2009-2024 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/m/library","sap/base/security/encodeCSS","sap/ui/core/Theming"],function(e,t,o){"use strict";var n=e.GenericTileMode;var a=e.LoadState;var r=e.FrameType;var s=e.ValueColor;var i={apiVersion:2};i.render=function(e,o){var i=o._getTooltipText();var l=o._getAriaText();var d=o.getHeaderImage();var c=o.hasListeners("press");var p=o.getState();var g=t("sapMGTState"+p);var f;var T=o.getFrameType();var v=o.getAriaRoleDescription();var h=o.getAriaRole();var S=T===r.OneByHalf||T===r.TwoByHalf;var M=o._oBadgeColors["backgroundColor"];var u=o._isIconMode()&&T===r.OneByOne;var y=o.getLinkTileContents();var I=o.getBadge();var m=o.getUrl()&&(!o._isInActionScope()||o.getMode()===n.IconMode)&&p!==a.Disabled&&!o._isNavigateActionEnabled();if(o._isInActionScope()){f=t("sapMGTScopeActions")}else{f=t("sapMGTScopeDisplay")}if(m){e.openStart("a",o);e.attr("href",o.getUrl());e.attr("rel","noopener noreferrer");if(!this._isDragabble(o)){e.attr("draggable","false")}}else{e.openStart("div",o)}if(i&&p!==a.Loading){e.attr("title",i)}e.class("sapMGT");e.class(g);e.class(f);if(!o._isInActionScope()&&o._bShowActionsView){e.class("sapMGTScopeActions")}if(o._isIconMode()){if(T===r.OneByOne){var C="sapMGTOneByOne"}else if(T===r.TwoByHalf){var C="TwoByHalf"}}e.class(o._isIconMode()?C:T);var _=o.getMode()===n.ArticleMode,B=o.getMode()===n.ActionMode;if(B){e.class("sapMGTActionMode")}if(_){e.class("sapMGTArticleMode")}if(o._isIconMode()){e.class("sapMGTIconMode");if(this._isThemeHighContrast()){e.class("HighContrastTile")}}if(!_&&!B&&T!==r.OneByHalf&&(o.getSystemInfo()||o.getAppShortcut())){e.class("tileWithAppInfo")}if(o._isIconMode()){if(T===r.TwoByHalf){e.class("sapMGTTwoByHalf")}else if(T===r.OneByOne){if(!this._isThemeHighContrast()){e.style("background-color",M)}else{e.style("border-color",M);e.style("box-shadow","0 0 0 1px"+M)}}}if(h){e.attr("role",h)}else if(!m){e.attr("role",c?"button":"presentation")}else{e.attr("role","link")}if(p===a.Loaded){e.attr("aria-label",l)}if(v){e.attr("aria-roledescription",v)}if(p!==a.Disabled){if(!o.isInActionRemoveScope()&&o.getPressEnabled()){e.class("sapMPointer")}if(!o.getPressEnabled()){e.class("sapMAutoPointer")}e.attr("tabindex","0")}if(o.getWidth()){e.style("width",o.getWidth())}if(o.getBackgroundImage()){e.style("background-image","url('"+t(o.getBackgroundImage())+"')");e.class("sapMGTBackgroundImage")}if(o.getMode()===n.HeaderMode){e.class("sapMGTHeaderMode")}var G=o.getTileContent();var O=G.length;if(this._isNewsContentPresent(G,O)){e.class("sapMGTNewsContent")}if(y.length>0){e.class("sapMGTLinkTileContent")}e.openEnd();if(i){o.getAggregation("_invisibleText").setText(i);e.renderControl(o.getAggregation("_invisibleText"))}var E=false;var A=false;function H(e,t){if(T===r.OneByOne){e.openStart("div").class("sapMGTContentShimmerPlaceholderItemOneByOne");e.class("sapMGTContentShimmerPlaceholderWithDescriptionOneByOne");e.openEnd();e.openStart("div").class("sapMGTContentShimmerPlaceholderRowsOneByOne").openEnd();e.openStart("div").class("sapMGTContentShimmerPlaceholderIconOneByOne").class("sapMGTLoadingShimmer").openEnd().close("div");if(t){e.openStart("div").class("sapMGTContentShimmerPlaceholderItemTextOneByOne").class("sapMGTLoadingShimmer").openEnd().close("div")}}else{e.openStart("div").class("sapMGTContentShimmerPlaceholderItemTwoByHalf");e.class("sapMGTContentShimmerPlaceholderWithDescriptionTwoByHalf");if(!o.getIconLoaded()&&!t){e.class("sapMGTContentShimmerPlaceholderWithDescriptionTwoByHalfIconLoaded")}e.openEnd();e.openStart("div").class("sapMGTContentShimmerPlaceholderRowsTwoByHalf").openEnd();e.openStart("div").class("sapMGTContentShimmerPlaceholderIconTwoByHalf").class("sapMGTLoadingShimmer").openEnd().close("div");if(t){e.openStart("div").class("sapMGTContentShimmerPlaceholderItemTextTwoByHalf").class("sapMGTLoadingShimmer").openEnd().close("div")}}e.close("div");e.close("div")}if(p===a.Loading){if(o._isIconMode()){H(e,true)}else{e.openStart("div").class("sapMGTContentShimmerPlaceholderItem");e.class("sapMGTContentShimmerPlaceholderWithDescription");e.openEnd();e.openStart("div").class("sapMGTContentShimmerPlaceholderRows").openEnd();e.openStart("div").class("sapMGTContentShimmerPlaceholderItemHeader").class("sapMGTLoadingShimmer").openEnd().close("div");e.openStart("div").class("sapMGTContentShimmerPlaceholderItemText").class("sapMGTLoadingShimmer").openEnd().close("div");if(!S){for(var b=0;b<O;b++){e.renderControl(G[b])}}e.close("div");e.close("div")}}else{if(!B&&this._isValueColorValid(o.getValueColor())){e.openStart("div");e.class("sapMGTCriticalBorder");e.class(o.getValueColor());e.openEnd();e.close("div")}if(o._isIconMode()){if(!o.getIconLoaded()){H(e,false)}else{if(T===r.OneByOne){e.openStart("div");e.class("sapMGTHideOverflow");e.openEnd();e.openStart("div");e.class("sapMGTIconWrapper");e.openEnd()}e.openStart("div");if(T===r.OneByOne){e.class("sapMGTOneByOneIcon")}else{e.class("sapMGTTwoByHalfIcon");if(o._sTileBadge){e.class("sapMGTIconBadge")}else if(!this._isThemeHighContrast()){e.style("background-color",M)}else{e.class("HighContrastTile");e.style("border-color",M);e.style("box-shadow","0 0 0 1px"+M)}}e.openEnd();if(o.getTileIcon()||o._sTileBadge){var w=o._generateIconAggregation(o._sTileBadge?"sap-icon://folder-full":o.getTileIcon());if(w){var P=o.getAggregation(w);if(o._sTileBadge){P.setColor(M)}e.renderControl(P)}if(o._sTileBadge){e.openStart("div",o.getId()+"-tileBadge").class("sapMGTileBadge").openEnd();e.text(o._sTileBadge);e.close("div")}}e.close("div")}}if(this._shouldRenderInfoContainer(o)&&T===r.TwoByHalf){e.openStart("div",o.getId()+"-wrapper").class("sapMGTWrapper").openEnd();e.openStart("div",o.getId()+"-wrapper-content").class("sapMGTWrapperCnt").openEnd()}e.openStart("div");e.class("sapMGTHdrContent");if(o._isIconMode()){if(T===r.OneByOne){var C="sapMGTOneByOne";if(!o.getIconLoaded()){C=C.concat(" sapMGTOneByOneIconLoaded")}}else if(T===r.TwoByHalf){var C="TwoByHalf"}}e.class(o._isIconMode()?C:T);if(i){e.attr("title",i)}if(B&&o.getFrameType()===r.TwoByOne&&d){e.class("sapMGTHdrImage")}e.openEnd();if(d){var x=o.isA("sap.m.ActionTile")&&o.getProperty("enableIconFrame");if(!x){o._oImage.removeStyleClass(s.None);if(this._sPreviousStyleClass){o._oImage.removeStyleClass(this._sPreviousStyleClass)}this._sPreviousStyleClass=this._isValueColorValid(o.getValueColor())?o.getValueColor():s.None;o._oImage.addStyleClass(this._sPreviousStyleClass);e.renderControl(o._oImage)}else{e.renderControl(o._getIconFrame())}}var L=this._isPriorityPresent(o);if(L){e.openStart("div",o.getId()+"-header-container").class("sapMATHeaderContainer").openEnd()}this._renderHeader(e,o);if(u){e.close("div");e.close("div")}for(var b=0;b<O;b++){E=o._checkFooter(G[b],o)&&(G[b].getFooter()||G[b].getUnit());var k=G[b].getContent();if(k){if(T===r.OneByHalf&&k.getMetadata().getElementName()==="sap.m.ImageContent"){A=false}else{A=true;break}}}if(L){this._renderPriorityText(e,o)}else if(!(S&&A)&&o.getSubheader()){this._renderSubheader(e,o)}if(L){e.close("div")}e.close("div");if(!o._isIconMode()){e.openStart("div",o.getId()+"-content");e.class("sapMGTContent");if(T===r.TwoByOne){e.class("TwoByOne")}if(o.getSystemInfo()||o.getAppShortcut()){if(G.length===0){e.class("appInfoWithoutTileCnt")}if(E&&T!==r.OneByHalf){e.class("appInfoWithFooter")}else{e.class("appInfoWithoutFooter")}}e.openEnd();if(y.length>0){e.openStart("div",o.getId()+"-linkTileContent").class("sapMGTLinkTileContentWrapper").openEnd();for(var b=0;b<y.length;b++){e.renderControl(y[b].getLinkTileContentInstance())}e.close("div")}for(var b=0;b<O;b++){e.renderControl(G[b])}if(this._shouldRenderInfoContainer(o)&&T!==r.TwoByHalf){this._renderInfoContainer(e,o)}e.close("div")}if(this._shouldRenderInfoContainer(o)&&T===r.TwoByHalf){e.close("div");this._renderInfoContainer(e,o);e.close("div")}if(o._isActionMode()&&o.getActionButtons().length>0){e.openStart("div",o.getId()+"-actionButtons");e.class("sapMGTActionModeContainer");e.openEnd();o.getActionButtons().forEach(function(t){e.renderControl(t)});e.close("div")}}if(p!==a.Loaded&&p!==a.Loading){this._renderStateOverlay(e,o,i)}if(p!==a.Disabled){this._renderHoverOverlay(e,o);this._renderFocusDiv(e,o)}if(o._isInActionScope()){this._renderActionsScope(e,o)}if(I&&(I.getSrc()||I.getText())&&(!o._isInActionScope()||o._isIconModeOfTypeTwoByHalf())){this._renderBadge(e,o)}if(m){e.close("a")}else{e.close("div")}};i._renderBadge=function(e,t){var o=t.getBadge();var n=o.getText();var r=o.getSrc()&&!o.getText();var s=!o.getSrc()&&o.getText();e.openStart("div");e.class("sapMGTBadge");e.class("sapMGTBadgeBackgroundColor"+o.getBackgroundColor());e.class("sapMGTBadgeColor"+o.getTextColor());e.class("sapMGTBadgeBorderColor"+o.getBorderColor());if(o.getText()&&o.getSrc()){e.class("sapMGTBadgeTextPresent")}e.class(r?"sapMGTBadgeOnlyIcon":null);e.class(s?"sapMGTBadgeOnlyText":null);e.openEnd();if(o.getSrc()){e.renderControl(t._oBadgeIcon)}if(n){e.openStart("span");e.class("sapMGTBadgeText");e.openEnd();e.text(n);e.close("span")}if(t.getState()!=a.Loaded){e.openStart("div");e.class("sapMGTBadgeOverlay");e.class("sapMGTBadgeBackgroundColor"+o.getBackgroundColor());e.openEnd();e.close("div")}e.close("div")};i._isPriorityPresent=function(e){return e.isA("sap.m.ActionTile")&&e.getProperty("priority")&&e.getProperty("priorityText")};i._renderPriorityText=function(e,t){e.openStart("div",t.getId()+"-priority-text");e.class("sapMTilePriorityValue");e.class(t.getProperty("priority"));e.openEnd();e.text(t.getProperty("priorityText"));e.close("div")};i._isDragabble=function(e){var t=e.getDragDropConfig().some(function(t){return t.isDraggable(e)});if(!t){var o=e.getParent();if(o&&o.getDragDropConfig){t=o.getDragDropConfig().some(function(t){return t.isDraggable(e)})}}return t};i._shouldRenderInfoContainer=function(e){var t=e.getFrameType(),o=e.getMode()===n.ArticleMode,a=e.getMode()===n.ActionMode,s=e.getMode()===n.IconMode;if(t===r.OneByOne&&s){return true}return!o&&!a&&!s&&t!==r.OneByHalf&&(e.getSystemInfo()||e.getAppShortcut())};i._renderInfoContainer=function(e,t){e.openStart("div",t.getId()+"-tInfo");e.class("sapMGTTInfoContainer");e.openEnd();e.openStart("div",t.getId()+"-tInfo-content");e.class("sapMGTTInfo");e.openEnd();if(t.getAppShortcut()){e.openStart("div",t.getId()+"-appShortcutWrapper");e.class("sapMGTAppShortcutText").openEnd();e.renderControl(t._oAppShortcut);e.close("div")}if(t.getSystemInfo()){e.openStart("div",t.getId()+"-sytemInfoWrapper");e.class("sapMGTSystemInfoText").openEnd();e.renderControl(t._oSystemInfo);e.close("div")}e.close("div");e.close("div")};i._renderFocusDiv=function(e,t){e.openStart("div",t.getId()+"-focus");e.class("sapMGTFocusDiv");e.openEnd();e.close("div")};i._renderStateOverlay=function(e,t,o){var n=t.getState();e.openStart("div",t.getId()+"-overlay");e.class("sapMGTOverlay");if(o){e.attr("title",o)}e.openEnd();switch(n){case a.Loading:t._oBusy.setBusy(n==a.Loading);e.renderControl(t._oBusy);break;case a.Failed:e.openStart("div",t.getId()+"-failed-ftr");e.class("sapMGenericTileFtrFld");e.openEnd();e.openStart("div",t.getId()+"-failed-icon");e.class("sapMGenericTileFtrFldIcn");e.openEnd();e.renderControl(t._oErrorIcon);e.close("div");if(!t._isInActionScope()&&!t._bShowActionsView){e.openStart("div",t.getId()+"-failed-text");e.class("sapMGenericTileFtrFldTxt");e.openEnd();e.renderControl(t.getAggregation("_failedMessageText"));e.close("div")}e.close("div");break;default:}e.close("div")};i._renderActionsScope=function(e,t){if(t.getState()!==a.Disabled){e.renderControl(t._oRemoveButton);e.renderControl(t._oMoreIcon)}};i._renderHoverOverlay=function(e,t){e.openStart("div",t.getId()+"-hover-overlay");if(t.getBackgroundImage()){e.class("sapMGTWithImageHoverOverlay")}else{e.class("sapMGTWithoutImageHoverOverlay");if(t._isIconMode()){if(t.getFrameType()===r.OneByOne){e.style("border-radius","1rem")}else{e.style("border-radius","0.75rem")}}}e.openEnd();e.close("div")};i._renderHeader=function(e,t){e.openStart("div",t.getId()+"-hdr-text");e.class("sapMGTHdrTxt");e.openEnd();e.renderControl(t._oTitle);e.close("div")};i._renderSubheader=function(e,t){e.openStart("div",t.getId()+"-subHdr-text");e.class("sapMGTSubHdrTxt");e.openEnd();e.renderControl(t._oSubTitle);e.close("div")};i._isValueColorValid=function(e){if(e==s.Good||e==s.Error||e==s.Neutral||e==s.Critical){return true}return false};i._isThemeHighContrast=function(){return/(hcw|hcb)/g.test(o.getTheme())};i._isNewsContentPresent=function(e,t){var o=false;for(var n=0;n<t;n++){var a=e[n].getContent();if(a&&a.isA("sap.m.NewsContent")){o=true;break}}return o};return i},true);
//# sourceMappingURL=GenericTileRenderer.js.map