"use strict";

sap.ui.define(["sap/ui/core/format/DateFormat"], function (DateFormat) {
  "use strict";

  /**
   * @namespace rsh.watchlist.ui5
   */
  var __exports = function (rm) {
    return {
      formatStatusText: async function (status) {
        // the formater seems to be called even bevore onInit fires!!!
        const rb = await rm?.getResourceBundle();
        switch (status) {
          case "OK":
            return rb?.getText("statusOK") || `(${status})`;
          case "NOK":
            return rb?.getText("statusNOK") || `(${status})`;
          default:
            return status;
        }
      },
      formatMinutes: function (amt) {
        // TODO make locale dependent
        console.log("formatMinutes");
        if (amt) {
          return `${amt} min`;
        } else {
          return '-';
        }
      },
      formatAsTimeDuration: function (millis) {
        if (millis) {
          const remSeconds = Math.floor(millis / 1000);
          const sec = remSeconds % 60;
          const strSec = (sec >= 1 ? String(sec) : "0").padStart(2, '0');
          const remMin = Math.floor(remSeconds / 60);
          const min = remMin % 60;
          const strMin = (min >= 1 ? String(min) : "0").padStart(2, '0');
          const remHrs = Math.floor(remMin / 60);
          const hrs = remHrs % 60;
          const strHrs = (hrs >= 1 ? String(hrs) : "0").padStart(2, '0');
          const remDays = Math.floor(remHrs / 24);
          const strDays = remDays >= 1 ? String(remDays) + ':' : "";
          return `${strDays}${strHrs}:${strMin}:${strSec}`;
        } else {
          return '-';
        }
      },
      formatAsCurrency: function (amt, cur) {
        if (amt) {
          const cur1 = cur || "XXX"; // XXX is no currency according to https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes
          const language = navigator.language;
          const fmtedAmt = new Intl.NumberFormat(language, {
            style: 'currency',
            currency: cur1
          }).format(amt);
          return fmtedAmt;
        } else {
          return '-';
        }
      },
      formatAsCurrencyTrace: function (amt, cur) {
        console.log("formatAsCurrencyTrace", amt, cur);
        if (amt) {
          const cur1 = cur || "XXX"; // XXX is no currency according to https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes
          const language = navigator.language;
          const fmtedAmt = new Intl.NumberFormat(language, {
            style: 'currency',
            currency: cur1
          }).format(amt);
          return fmtedAmt;
        } else {
          return '-';
        }
      },
      formatPercentFromDecimal: async function (value) {
        // the formater seems to be called even bevore onInit fires!!!
        return `${(value * 100).toFixed(1)}%`;
      },
      formatPercent: async function (value) {
        // the formater seems to be called even bevore onInit fires!!!
        return `${value}%`;
      },
      formatTime: async function (timestamp, gmtOffset) {
        // the formater seems to be called even bevore onInit fires!!!
        //console.log("formatter:formatTime", timestamp, gmtOffset, timestamp, gmtOffset)
        if (timestamp && gmtOffset) {
          const time = new Date(timestamp * 1000); // + gmtOffset) // gmtOffset offests to the local time of the market
          // what I want my local time of the market
          return `${time.toLocaleString()}`;
        }
        if (timestamp && !gmtOffset) {
          const time = new Date(timestamp * 1000);
          return `${time.toLocaleString()}`;
        }
        return '-';
      },
      formatKind: async function (kind) {
        // the formater seems to be called even bevore onInit fires!!!
        const rb = await rm?.getResourceBundle();
        switch (kind) {
          case "S":
            return rb?.getText("sell") || `(${kind})`;
          case "B":
            return rb?.getText("buy") || `(${kind})`;
          default:
            return kind;
        }
      },
      formatDate: function (date) {
        let format = DateFormat.getDateInstance({
          pattern: "yyyy.MM.dd"
        });
        return format.format(date);
      }
    };
  };
  return __exports;
});