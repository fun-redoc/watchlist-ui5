# Assets Wealth and Wachlist

## Features

1. completly local data storage using broiwsers built in indexDB, total privay
2. stock access via yh finance api. you neet to register https://financeapi.net/ to get a api key and put it into the settings page. no third party libraries etc. used, plain vanilla http
3. access to the api is cached, so that you will not exceed the quota of free plan. TODO: the cache period should be adjustable in future
4. you can upload your transactions via csv file. no third party libratry is used for csv parsing. The format has to be like that:

```csv
Transaction;Symbol;Name;Bank;Count;Price;Date;Fee
Buy;MSF.DE;MICROSOFT DL-,00000625;CTB;20.0;393.45;2024-02-03;0.0
Sell;MSF.DE;MICROSOFT DL-,00000625;CTB;20.0;419.13;2024-05-223;0.0
Buy;ETH-EUR;Ethereum;CSTX;0.27653;2180.18;2024-03-03;17.5
Buy;BTC-EUR;Bitcoin;CSTX;0.009;50089.8;2024-02-08;13.77
```

5. work in progress, i use it for myself, and i add new feature when i need them, the same with bugs. there is a TODO file where you can see what can go wrong.
6. The App is written in typescript and sap (open) ui5

## Try it out

https://fun-redoc.github.io/watchlist-ui5/

First navigate to the settings Tab and provide the api key you received from https://financeapi.net/

The app should be available in english, german and polish, but i still havent managed to translate all the texts, so you will see mostls the i18n tags. sorry for that.

## Technology

- app runs complettly locally within the browser
- for data storage (transactions, watchlist, settings) the browser built in `indexDB` is used
- code is written in`TypeScript`
- Framework used ist`SAP openUI5`, which also is used in modern SAP product. UI5 provies lots of useable components and a simple programming model
- API Access is cached in browser storage, i worte a generic caching module for this, it can be used independently (see `services/cacheService.ts`)
- for csv parsing i don't use any libraries, i wrote a simple state machine (mealy automaton see `services/MealyAutomaton.ts`) and implemented the RFC4180 on top.
- for develpment i use sap's ui5 toolkit
- for my personal purposes i deploy to github pages. here is a week point of the ui5 framework. the built is big, ui5 tooling does not strip test and unused code and does not minify as i wished it to - or mayby i only didn't find out how to. See the `HOWTO.md`.
