declare module 'ganja.js' {
  type AlgebraElement = Float64Array & {
    Add(other: AlgebraElement): AlgebraElement
    Mul(other: AlgebraElement): AlgebraElement
    Scale(factor: number): AlgebraElement
    Wedge(other: AlgebraElement): AlgebraElement
    Vee(other: AlgebraElement): AlgebraElement
    Exp(): AlgebraElement
    readonly Dual: AlgebraElement
    readonly Reverse: AlgebraElement
  }

  type AlgebraElementConstructor = {
    new (values: ArrayLike<number> | number): AlgebraElement
    describe(): { basis: string[] }
  }

  type AlgebraOptions = {
    p: number
    q: number
    r: number
    baseType: Float64ArrayConstructor
  }

  export default function Algebra(
    options: AlgebraOptions,
  ): AlgebraElementConstructor
}
