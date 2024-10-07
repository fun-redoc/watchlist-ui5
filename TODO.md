### TODO - Feat
+ add licenze notice to ui5.yml and a LICENZE.txt file
+ WatchDetail View, show the time the data was fetched the last time
+ WatchDetail View, Option to refresh market data periodically
+ AssetDetail: make Chartparams customizable via menu

### TODO - Debt
+ use UI5 export binding feature: https://help.sap.com/docs/SAP_NETWEAVER_740/468a97775123488ab3345a0c48cadd8f/f1ee7a8b2102415bb0d34268046cd3ea.html
+ the buttons (flags and navigation) stay falselly selected, e.g. at start german is selected but english shown, navigate to wealt and back, wealth stay selected... always the correct button shoud be selected or none...
+ transition to Transaction(Buy) - the newly selected symbol and data apears with delay (when reloading from yfin), the old data/symbol is shown...better, nothing is shown and a "loading..." indicator
+ D3View(Base) the height in onArfterRendering is not calculated corectly (set to 0) on hight=100%
+ use AbortController on every api_ and setTimeout, setIntervale etc. call
+ Settings.controller onSave validate imput (length !== 0)
+ rewrite D3View(Base) in typescript if possible
+ in some places I use throw new Error on not recoverable errors, provide a generic method to catch them an show information to the user with option to restart the app
+ API not immidiatelly active afeter save in settings (tested with Firefox)
+ sometimes JSON models do not fire change events when used on views, use ManagedObjectModels instead? alternativelly store models in appController
      // TODO proper input error hadling needed instead setting defaults
      // TODO try to use typescrtipt enums instead of sap enums managed object for type savety

### Done
- provide plkr showcase and check into github
    => gienv up, issue with plkr and typescript
- create a local only Version (transactions not via ODATA Service but locally using indexDB)
    => npx ui5 serve --config ui5-mock.yaml -o mockService/mockserver.html
- Create a BaseController (eg. with Error Messaging, i18 text fetching, Route Selection...)