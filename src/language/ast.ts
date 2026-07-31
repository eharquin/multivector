import type { SourceSpan } from '../domain/diagnostic'

export type ScalarLiteralNode = Readonly<{
  kind: 'scalar-literal'
  value: number
  span: SourceSpan
}>

export type BasisBladeNode = Readonly<{
  kind: 'basis-blade'
  name: 'e1' | 'e2' | 'e12' | 'e21'
  span: SourceSpan
}>

export type ReferenceNode = Readonly<{
  kind: 'reference'
  name: string
  property: 'position' | 'head' | null
  span: SourceSpan
}>

export type PseudoscalarNode = Readonly<{
  kind: 'pseudoscalar'
  span: SourceSpan
}>

export type PropertyExpressionNode = Readonly<{
  kind: 'property-expression'
  object: SurfaceExpressionNode
  property: string
  propertySpan: SourceSpan
  span: SourceSpan
}>

export type UnaryExpressionNode = Readonly<{
  kind: 'unary-expression'
  operator: '+' | '-' | '~' | '!'
  operand: SurfaceExpressionNode
  span: SourceSpan
}>

export type BinaryExpressionNode = Readonly<{
  kind: 'binary-expression'
  operator: '+' | '-' | '*' | '^' | '|' | '&'
  left: SurfaceExpressionNode
  right: SurfaceExpressionNode
  implicit: boolean
  span: SourceSpan
}>

export type VectorConstructorNode = Readonly<{
  kind: 'vector-constructor'
  components: readonly [SurfaceExpressionNode, SurfaceExpressionNode]
  span: SourceSpan
}>

export type SurfaceExpressionNode =
  | ScalarLiteralNode
  | BasisBladeNode
  | ReferenceNode
  | PseudoscalarNode
  | PropertyExpressionNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | VectorConstructorNode

type CoreNodeBase = Readonly<{
  /** Span of the surface expression responsible for this core operation. */
  origin: SourceSpan
}>

export type CoreExpressionNode =
  | (CoreNodeBase &
      Readonly<{
        kind: 'scalar'
        value: number
      }>)
  | (CoreNodeBase & Readonly<{ kind: 'pseudoscalar' }>)
  | (CoreNodeBase &
      Readonly<{
        kind: 'basis-blade'
        name: 'e1' | 'e2'
      }>)
  | (CoreNodeBase &
      Readonly<{
        kind: 'reference'
        name: string
        property: 'position' | 'head' | null
      }>)
  | (CoreNodeBase &
      Readonly<{
        kind: 'add' | 'multiply' | 'outer' | 'inner' | 'regressive'
        left: CoreExpressionNode
        right: CoreExpressionNode
      }>)
  | (CoreNodeBase &
      Readonly<{
        kind: 'negate' | 'reverse' | 'dual' | 'grade-involution'
        operand: CoreExpressionNode
      }>)
  | (CoreNodeBase &
      Readonly<{
        kind: 'grade'
        operand: CoreExpressionNode
        grade: 0 | 1 | 2
      }>)
  | (CoreNodeBase &
      Readonly<{
        kind: 'coefficient'
        operand: CoreExpressionNode
        blade: 'e' | 'e1' | 'e2' | 'e12'
      }>)
  | (CoreNodeBase &
      Readonly<{
        kind: 'unsupported-property'
        operand: CoreExpressionNode
        property: string
        propertyOrigin: SourceSpan
      }>)
