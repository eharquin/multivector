export const EXPRESSION_REFERENCE = Object.freeze([
  {
    title: 'Values and names',
    entries: [
      ['12, 3.5, 1e-3', 'finite scalar literals'],
      ['e1, e2, e12, e21', 'VGA(2) basis-blade notation'],
      ['ps', 'canonical pseudoscalar e12'],
      ['V = (2, 1)', 'named vector declaration using concise tuple syntax'],
      ['vector(2, 1)', 'explicit vector constructor'],
      ['V', 'case-sensitive reference to a named expression'],
    ],
  },
  {
    title: 'Operators',
    entries: [
      ['A + B, A - B', 'addition and subtraction'],
      ['A * B', 'geometric product'],
      ['A / B', 'division when B is invertible'],
      ['A**n', 'integer geometric power'],
      ['A ^ B', 'outer product'],
      ['A | B', 'inner product'],
      ['A & B', 'regressive product'],
      ['+A, -A', 'unary sign'],
      ['~A, A.reverse', 'reverse'],
      ['!A, A.dual', 'dual'],
      ['A.involution', 'grade involution'],
      ['R >>> A', 'sandwich action R * A * ~R'],
    ],
  },
  {
    title: 'Properties',
    entries: [
      ['A.g0, A.g1, A.g2', 'project onto one grade'],
      ['A.inverse', 'inverse when it exists'],
      ['A.norm', 'primary VGA norm'],
      ['A.e, A.e1, A.e2, A.e12', 'extract one coefficient as a scalar'],
      ['V.position', 'position of a named vector'],
      ['B.position', 'position of a named bivector'],
      ['V.head', 'vector-only derived value V.position + V'],
    ],
  },
  {
    title: 'Functions',
    entries: [
      ['exp(A)', 'scalar or supported closed-form multivector exponential'],
      ['sin(a), cos(a), tan(a)', 'scalar trigonometric functions'],
      ['sinh(a), cosh(a), tanh(a)', 'scalar hyperbolic functions'],
      ['pi, tau', 'predefined scalar constants'],
    ],
  },
  {
    title: 'Precedence',
    entries: [
      ['(...) calls and properties', 'strongest'],
      ['A**n', 'right-associative geometric power'],
      ['!A, ~A, +A, -A', 'unary operations'],
      ['A ^ B, A & B, A | B', 'geometric derived products'],
      ['A * B, A / B', 'geometric product and division'],
      ['R >>> A', 'sandwich action'],
      ['A + B, A - B', 'weakest'],
    ],
  },
  {
    title: 'Positioning',
    entries: [
      ['@ (0, 0)', 'optional position field; an empty field also uses the origin'],
      ['@ P', 'position may reference another named vector expression'],
      ['invalid position', 'keeps the object value valid and reports a position diagnostic'],
    ],
  },
] as const)
