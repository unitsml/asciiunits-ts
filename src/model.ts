// Typed AsciiUnits model — the structural layer of a parsed unit
// expression. Mirrors the node set of unitsml-ruby's model classes
// (without unitsdb resolution, which belongs to unitsml-ts).
export class Prefix {
  constructor(
    readonly prefixName: string,
    readonly onlyInstance = false,
  ) {}

  equals(other: unknown): boolean {
    return (
      other instanceof Prefix &&
      other.prefixName === this.prefixName &&
      other.onlyInstance === this.onlyInstance
    );
  }
}

export class Unit {
  constructor(
    readonly unitName: string,
    readonly powerNumerator?: unknown,
    readonly prefix?: Prefix,
  ) {}

  equals(other: unknown): boolean {
    return (
      other instanceof Unit &&
      other.unitName === this.unitName &&
      other.powerNumerator === this.powerNumerator &&
      (other.prefix === undefined) === (this.prefix === undefined) &&
      (this.prefix === undefined || other.prefix!.equals(this.prefix))
    );
  }
}

export class Dimension {
  constructor(
    readonly dimensionName: string,
    readonly powerNumerator?: unknown,
  ) {}

  equals(other: unknown): boolean {
    return (
      other instanceof Dimension &&
      other.dimensionName === this.dimensionName &&
      other.powerNumerator === this.powerNumerator
    );
  }
}

export class Number {
  constructor(readonly value: string) {}

  equals(other: unknown): boolean {
    return other instanceof Number && other.value === this.value;
  }
}

export class Extender {
  constructor(readonly text: string) {}

  equals(other: unknown): boolean {
    return other instanceof Extender && other.text === this.text;
  }
}

export class Sqrt {
  constructor(readonly value: ModelNode) {}

  equals(other: unknown): boolean {
    return other instanceof Sqrt && other.value.equals(this.value);
  }
}

export class Fenced {
  constructor(
    readonly open: string,
    readonly value: ModelNode,
    readonly close: string,
  ) {}

  equals(other: unknown): boolean {
    return (
      other instanceof Fenced &&
      other.open === this.open &&
      other.close === this.close &&
      other.value.equals(this.value)
    );
  }
}

export class Formula {
  constructor(readonly value: ModelNode[]) {}

  equals(other: unknown): boolean {
    return (
      other instanceof Formula &&
      other.value.length === this.value.length &&
      other.value.every((n, i) => n.equals(this.value[i]))
    );
  }
}

export type ModelNode =
  | Unit
  | Prefix
  | Dimension
  | Number
  | Extender
  | Sqrt
  | Fenced
  | Formula;
