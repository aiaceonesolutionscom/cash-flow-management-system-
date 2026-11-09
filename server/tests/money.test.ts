import { describe, it, expect } from 'vitest';
import { MoneyCalculator } from '../src/utils/money';
import { Decimal } from 'decimal.js';

describe('MoneyCalculator Financial Arithmetic', () => {
  it('correctly calculates Net Cash Flow (Total Cash In - Total Cash Out)', () => {
    const cashIn = '1500000.50';
    const cashOut = '450000.25';
    const net = MoneyCalculator.netCashFlow(cashIn, cashOut);
    expect(net.toFixed(2)).toBe('1050000.25');
  });

  it('handles negative Net Cash Flow when Cash Out exceeds Cash In', () => {
    const cashIn = '100000.00';
    const cashOut = '250000.50';
    const net = MoneyCalculator.netCashFlow(cashIn, cashOut);
    expect(net.toFixed(2)).toBe('-150000.50');
  });

  it('correctly calculates Account Balance with Opening Balance, In/Out, and Transfers', () => {
    const balance = MoneyCalculator.accountBalance({
      openingBalance: '50000.00',
      totalCashIn: '100000.00',
      totalCashOut: '30000.00',
      totalTransfersIn: '20000.00',
      totalTransfersOut: '15000.00'
    });
    // 50000 + 100000 - 30000 + 20000 - 15000 = 125000.00
    expect(balance.toFixed(2)).toBe('125000.00');
  });

  it('ensures transfer invariance: equal transfer in and transfer out does not alter overall total', () => {
    const account1Before = MoneyCalculator.accountBalance({ openingBalance: '100000.00' });
    const account2Before = MoneyCalculator.accountBalance({ openingBalance: '50000.00' });
    const totalBefore = MoneyCalculator.sum([account1Before, account2Before]);

    // Transfer 20,000 from Account 1 to Account 2
    const transferAmount = '20000.00';
    const account1After = MoneyCalculator.accountBalance({
      openingBalance: '100000.00',
      totalTransfersOut: transferAmount
    });
    const account2After = MoneyCalculator.accountBalance({
      openingBalance: '50000.00',
      totalTransfersIn: transferAmount
    });
    const totalAfter = MoneyCalculator.sum([account1After, account2After]);

    expect(account1After.toFixed(2)).toBe('80000.00');
    expect(account2After.toFixed(2)).toBe('70000.00');
    expect(totalAfter.toFixed(2)).toBe(totalBefore.toFixed(2));
    expect(totalAfter.toFixed(2)).toBe('150000.00');
  });

  it('avoids floating point rounding issues (e.g. 0.1 + 0.2)', () => {
    const sum = MoneyCalculator.sum(['0.10', '0.20']);
    expect(sum.toFixed(2)).toBe('0.30');
  });

  it('formats PKR currency properly with comma separators', () => {
    expect(MoneyCalculator.formatPKR('1250000.50')).toBe('PKR 1,250,000.50');
    expect(MoneyCalculator.formatPKR('-45000.00')).toBe('PKR -45,000.00');
  });
});
