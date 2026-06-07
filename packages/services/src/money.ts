/**
 * Money value type — SDD §3.1, §4.4
 * Internal representation: integer paise (1 INR = 100 paise).
 */
export type TariffDecimalPlaces = 0 | 2;

export class Money {
  readonly paise: number;

  private constructor(paise: number) {
    this.paise = paise;
  }

  static zero(): Money {
    return new Money(0);
  }

  static fromRupees(rupees: number): Money {
    return new Money(Math.round(rupees * 100));
  }

  static fromPaise(paise: number): Money {
    return new Money(Math.round(paise));
  }

  static fromDecimalString(value: string): Money {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid money value: ${value}`);
    }
    return Money.fromRupees(parsed);
  }

  toRupees(): number {
    return this.paise / 100;
  }

  add(other: Money): Money {
    return Money.fromPaise(this.paise + other.paise);
  }

  subtract(other: Money): Money {
    return Money.fromPaise(this.paise - other.paise);
  }

  multiply(factor: number): Money {
    return Money.fromPaise(Math.round(this.paise * factor));
  }

  /** Round per society tariff decimal places — SP-005 */
  round(decimalPlaces: TariffDecimalPlaces): Money {
    if (decimalPlaces === 2) {
      return this;
    }
    const rupees = Math.round(this.paise / 100);
    return Money.fromRupees(rupees);
  }

  /** Interest round to nearest rupee — SP-008 */
  roundToRupee(): Money {
    return this.round(0);
  }

  isZero(): boolean {
    return this.paise === 0;
  }

  isNegative(): boolean {
    return this.paise < 0;
  }

  equals(other: Money): boolean {
    return this.paise === other.paise;
  }

  format(decimalPlaces: TariffDecimalPlaces = 2): string {
    if (decimalPlaces === 0) {
      return String(Math.round(this.paise / 100));
    }
    return this.toRupees().toFixed(2);
  }
}

export function sumMoney(values: Money[]): Money {
  return values.reduce((acc, v) => acc.add(v), Money.zero());
}
