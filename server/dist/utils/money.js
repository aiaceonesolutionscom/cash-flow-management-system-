"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoneyCalculator = void 0;
const decimal_js_1 = require("decimal.js");
// Configure Decimal.js precision
decimal_js_1.Decimal.set({ precision: 20, rounding: decimal_js_1.Decimal.ROUND_HALF_UP });
class MoneyCalculator {
    /**
     * Calculates Net Cash Flow = Total Cash In - Total Cash Out
     */
    static netCashFlow(totalCashIn, totalCashOut) {
        const inDec = new decimal_js_1.Decimal(totalCashIn || 0);
        const outDec = new decimal_js_1.Decimal(totalCashOut || 0);
        return inDec.minus(outDec);
    }
    /**
     * Calculates Current Account Balance =
     * Opening Balance + Cash In - Cash Out + Transfers In - Transfers Out
     */
    static accountBalance(params) {
        const opening = new decimal_js_1.Decimal(params.openingBalance || 0);
        const cashIn = new decimal_js_1.Decimal(params.totalCashIn || 0);
        const cashOut = new decimal_js_1.Decimal(params.totalCashOut || 0);
        const transfersIn = new decimal_js_1.Decimal(params.totalTransfersIn || 0);
        const transfersOut = new decimal_js_1.Decimal(params.totalTransfersOut || 0);
        return opening.plus(cashIn).minus(cashOut).plus(transfersIn).minus(transfersOut);
    }
    /**
     * Sums an array of amounts safely with exact precision
     */
    static sum(amounts) {
        return amounts.reduce((acc, val) => acc.plus(new decimal_js_1.Decimal(val || 0)), new decimal_js_1.Decimal(0));
    }
    /**
     * Format decimal to 2 decimal places string
     */
    static toFixed2(amount) {
        return new decimal_js_1.Decimal(amount || 0).toFixed(2);
    }
    /**
     * Formats PKR currency with commas e.g. "PKR 1,250,000.00"
     */
    static formatPKR(amount) {
        const dec = new decimal_js_1.Decimal(amount || 0);
        const parts = dec.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return `PKR ${parts.join('.')}`;
    }
}
exports.MoneyCalculator = MoneyCalculator;
