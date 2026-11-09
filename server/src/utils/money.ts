import { Decimal } from 'decimal.js';

// Configure Decimal.js precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class MoneyCalculator {
  /**
   * Calculates Net Cash Flow = Total Cash In - Total Cash Out
   */
  static netCashFlow(totalCashIn: string | number | Decimal, totalCashOut: string | number | Decimal): Decimal {
    const inDec = new Decimal(totalCashIn || 0);
    const outDec = new Decimal(totalCashOut || 0);
    return inDec.minus(outDec);
  }

  /**
   * Calculates Current Account Balance =
   * Opening Balance + Cash In - Cash Out + Transfers In - Transfers Out
   */
  static accountBalance(params: {
    openingBalance: string | number | Decimal;
    totalCashIn?: string | number | Decimal;
    totalCashOut?: string | number | Decimal;
    totalTransfersIn?: string | number | Decimal;
    totalTransfersOut?: string | number | Decimal;
  }): Decimal {
    const opening = new Decimal(params.openingBalance || 0);
    const cashIn = new Decimal(params.totalCashIn || 0);
    const cashOut = new Decimal(params.totalCashOut || 0);
    const transfersIn = new Decimal(params.totalTransfersIn || 0);
    const transfersOut = new Decimal(params.totalTransfersOut || 0);

    return opening.plus(cashIn).minus(cashOut).plus(transfersIn).minus(transfersOut);
  }

  /**
   * Sums an array of amounts safely with exact precision
   */
  static sum(amounts: (string | number | Decimal)[]): Decimal {
    return amounts.reduce<Decimal>((acc, val) => acc.plus(new Decimal(val || 0)), new Decimal(0));
  }

  /**
   * Format decimal to 2 decimal places string
   */
  static toFixed2(amount: string | number | Decimal): string {
    return new Decimal(amount || 0).toFixed(2);
  }

  /**
   * Formats PKR currency with commas e.g. "PKR 1,250,000.00"
   */
  static formatPKR(amount: string | number | Decimal): string {
    const dec = new Decimal(amount || 0);
    const parts = dec.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `PKR ${parts.join('.')}`;
  }
}
