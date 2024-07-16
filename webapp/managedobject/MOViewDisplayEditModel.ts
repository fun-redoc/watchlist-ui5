//import ManagedObject, { $ManagedObjectSettings, MetadataOptions as MOMetadataOptions } from "sap/ui/base/ManagedObject";
////import MOViewDisplayEditMode from "./MOViewDisplayEditMode"
//
//import { PropertyBindingInfo } from "sap/ui/base/ManagedObject";
//
//
///**
// * Interface defining the settings object used in constructor calls
// */
//interface $MOViewDisplayEditModelSettings extends $ManagedObjectSettings {
//	mode?: string | PropertyBindingInfo | `{${string}}`;
//}
//
//export  interface MOViewDisplayEditModel {
//	getMode(): string;
//	setMode(mode: String): this;
//}
// /**
// * @namespace rsh.watchlist.ui5.managedobject
// */
//export class MOViewDisplayEditModel extends ManagedObject implements MOViewDisplayEditModel {
//	public static readonly metadata:MOMetadataOptions = {
//		properties: {
//			"mode": {
//				//type: "rsh.watchlist.ui5.managedobject.MOViewDisplayEditMode",
//				type: "string",
//				bindable:true,
//				defaultValue:"Display",
//				visibility:"public"
//			},
//		},
//	}
//	constructor(idOrSettings?: string | $MOViewDisplayEditModelSettings);
//	constructor(id?: string, settings?: $MOViewDisplayEditModelSettings);
//	constructor(id?: string, settings?: $MOViewDisplayEditModelSettings) {  super(id, settings); }
//
//	public init() {
//		console.log("MOViewDisplayEditModel:init")
//	//	console.log("MOViewDisplayEditModel:init", this.getProperty("mode"))
//	}
//	public getMode():string {
//		const m = this.getProperty("mode")
//		console.log("MOViewDisplayEditModel:getMode", m)
//		return m
//	}
//	
//}

import ManagedObject from "sap/ui/base/ManagedObject";

// TODO find a more typescript like way to define ManagedObject....this is ugly...
export default ManagedObject.extend('rsh.watchlist.ui5.managedobject.MOViewDisplayEditModel', {
		metadata: {
			properties: {
				mode: {
					//type: "rsh.watchlist.ui5.managedobject.MOViewDisplayEditMode",
					type:"string",
					bindable:true,
					defaultValue:"Display",
					visibility:"public"
				}
			}
		}
	})