/**
 * The Money Capability - Value Object
 * Ensures standard financial handling across the entire Commerce OS.
 */
export class Money {
  private readonly amount: number;
  private readonly currencyCode: string;

  private constructor(amount: number, currencyCode: string = 'ZAR') {
    // Force precision to 2 decimal places to prevent floating point absurdities
    this.amount = Math.round(amount * 100) / 100;
    this.currencyCode = currencyCode.toUpperCase();
  }

  /**
   * Initializes a Money object from a string or number.
   * Throws if the input is invalid or has > 2 decimal places in string form.
   */
  static from(value: string | number, currencyCode: string = 'ZAR'): Money {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num)) {
      throw new Error('Invalid monetary amount.');
    }

    if (typeof value === 'string') {
      const parts = value.split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        throw new Error('Monetary amounts cannot have more than 2 decimal places.');
      }
    }

    return new Money(num, currencyCode);
  }

  public getAmount(): number {
    return this.amount;
  }

  public getCurrencyCode(): string {
    return this.currencyCode;
  }

  public greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  public greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount >= other.amount;
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currencyCode);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount - other.amount, this.currencyCode);
  }

  public format(): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: this.currencyCode,
    }).format(this.amount);
  }

  private assertSameCurrency(other: Money) {
    if (this.currencyCode !== other.currencyCode) {
      throw new Error(`Currency mismatch: Cannot operate on ${this.currencyCode} and ${other.currencyCode}`);
    }
  }
}
