# Application Architecture

**Status:** Current direction
**Date:** 2026-07-30
**Scope:** Initial VGA(2) vertical slice

## Purpose

This document explains how the application code is separated today, which
layer owns each responsibility, and which dependencies may cross those
boundaries. It records implementation direction rather than a normative public
contract. Requirements and specifications remain authoritative for observable
behavior.

The current architecture favors small, explicit transformations between owned
representations. This keeps source-language behavior, mathematical values,
geometric meaning, and rendering concerns independently testable. The
boundaries should remain stable as capabilities grow, but directory names and
individual interfaces may change when implementation evidence supports a
better design.

## Current dependency direction

Arrows in this diagram mean “imports or calls.” Dependencies point inward
toward language, domain, and algebra concerns; the lower layers do not import
application or presentation code.

```mermaid
flowchart LR
    UI["React UI<br/><code>src/App.tsx</code>"]
    DOC["Expression document<br/><code>src/document</code>"]
    APP["Application orchestration<br/><code>src/application</code>"]
    LANG["Language<br/><code>src/language</code>"]
    EVAL["Evaluation<br/><code>src/evaluation</code>"]
    ALG["Algebra adapter<br/><code>src/algebra</code>"]
    DOMAIN["Owned domain values<br/><code>src/domain</code>"]
    GEOM["Geometric interpretation<br/><code>src/geometry</code>"]
    VIZ["Visualization<br/><code>src/visualization</code>"]
    BACKEND[("ganja.js")]

    UI --> APP
    UI --> ALG
    UI --> DOC
    UI --> VIZ
    APP --> LANG
    APP --> EVAL
    APP --> DOMAIN
    APP --> GEOM
    APP --> VIZ
    EVAL --> LANG
    EVAL --> ALG
    EVAL --> DOMAIN
    ALG --> DOMAIN
    ALG --> BACKEND
    GEOM --> DOMAIN
    VIZ --> GEOM
```

The application layer coordinates the complete use case, so it is expected to
depend on several focused layers. `App.tsx` also acts as the current composition
root by constructing the algebra adapter and passing it into the application
use case. Those focused layers must not depend back on the application layer or
React.

## Evaluation and rendering flow

The current application parses every non-empty item, builds document-level name
and dependency information, then evaluates valid branches in dependency order:

```mermaid
flowchart TD
    DOCUMENT["Ordered expression items<br/>with value and position sources"]
    SOURCE["Enabled source-property nodes"]
    TOKENS["Owned tokens<br/>with source spans"]
    AST["Owned syntax tree<br/>with source spans"]
    GRAPH["Declaration table and property-aware<br/>dependency graph"]
    CORE["Core algebra AST<br/>with surface origins"]
    VALUE["Owned multivector"]
    ENTITY["Optional renderer-independent<br/>VGA 2D entity"]
    UNSUPPORTED["Unsupported-interpretation<br/>textual state"]
    RECORD["Evaluated value with separate<br/>position metadata"]
    PRIMITIVE["Optional positioned<br/>oriented-segment primitive"]
    TEXT["Textual state"]
    OUTPUT["React and SVG output"]

    DOCUMENT --> SOURCE
    SOURCE -->|"tokenize"| TOKENS
    TOKENS -->|"parseDocumentExpression"| AST
    AST -->|"collect declarations<br/>and references"| GRAPH
    GRAPH -->|"valid dependency order"| CORE
    AST -->|"lowerExpression"| CORE
    CORE -->|"evaluateExpression<br/>through VgaEngine"| VALUE
    VALUE --> RECORD
    GRAPH -->|"position node or origin fallback"| RECORD
    VALUE -->|"interpretVga2"| ENTITY
    VALUE -->|"no supported entity"| UNSUPPORTED
    ENTITY --> TEXT
    ENTITY -->|"spatial entities only"| PRIMITIVE
    RECORD --> PRIMITIVE
    PRIMITIVE --> OUTPUT
    TEXT --> OUTPUT
    UNSUPPORTED --> OUTPUT
```

Parsing and dependency failures stop only the affected graph branch and return
owned, source-associated diagnostics. Missing names, duplicate declarations,
cycles, and invalid upstream dependencies are distinct states. Independent
branches continue evaluating, and editing or deleting a declaration recomputes
its transitive dependants from current source; stale values are not retained. A
successful evaluation never exposes the ganja.js object used inside the algebra
adapter. An unsupported interpretation remains a valid evaluation with its
owned value and inspection text; only its visualization state is unsupported.
A valid scalar has a standard semantic interpretation and textual state but no
spatial render primitive.

Standard geometric interpretation depends only on the owned multivector value.
Equivalent expressions therefore receive the same semantic entity:
`vector(0, 0)`, `(0, 0)`, and scalar `0` all evaluate to the all-zero multivector and are
classified canonically as scalar zero.

Expression item identities are independent of their source and list position.
Adding, editing, or deleting one item preserves sibling identities. Items are
parsed independently, then named declarations and anonymous expressions are
evaluated against one document-level declaration table. References may point
forward or backward in row order. Declaration names are unique and
case-sensitive; built-in VGA names remain reserved. Supported primitives are
composed in document order, regardless of evaluation order. Each item may own a
separate position source. Bare references target value nodes,
`V.position` targets a position node, and `V.head` derives the sum of both
nodes. Missing or invalid position results use the origin for rendering without
changing or invalidating a valid vector value.

The surface AST preserves constructor and operator syntax for diagnostics and
future language-aware editing. Lowering removes syntax sugar before evaluation;
in VGA(2), `vector(x, y)` and `(x, y)` become `x * e1 + y * e2`. Constructor notation and
blade notation consequently share the same core evaluator and algebra-engine
operations. Compact blades also lower through generator products: `e12` becomes
`e1 * e2`, while `e21` becomes `e2 * e1`, allowing the algebra product to derive
`e21 = -e12`.

## Directory responsibilities

| Location | Owns | Does not own |
| --- | --- | --- |
| `src/document` | Stable expression item identities, separately owned value and position sources, ordered item updates, and the document item-count boundary | Parsing, evaluation, dependencies, persistence, or React focus |
| `src/language` | Tokenization, declaration and expression syntax, reference nodes, lowering to the core algebra AST, source spans, and syntax diagnostics | Document-wide name resolution, algebra computation, geometric meaning, rendering, or React state |
| `src/evaluation` | Evaluation of owned core syntax against explicit algebra capabilities and resolved reference values | Parsing, dependency planning, backend construction, display formatting, or viewport behavior |
| `src/algebra` | The algebra-engine interface and ganja.js adaptation | Public source semantics, UI state, geometric interpretation, or rendering |
| `src/domain` | Backend-independent mathematical values and shared diagnostics | Backend objects, SVG primitives, browser APIs, or React types |
| `src/geometry` | Conversion from owned algebra values to renderer-independent semantic entities | Parsing, backend operations, screen coordinates, or SVG |
| `src/visualization` | Renderer-neutral positioned primitives and explicit mathematical-to-screen transforms | Algebra identifiers, backend values, source parsing, or application state |
| `src/application` | Document-wide declaration resolution, dependency ordering, use-case orchestration, and conversion of failures into application states | React rendering, DOM events, backend-specific operations, or CSS |
| `src/App.tsx` and styles | User input, accessible presentation, and SVG composition from application state | Language rules, algebra semantics, or backend value inspection |
| `src/types` | Narrow declarations for untyped external packages | Domain models or feature behavior |

Tests are colocated with the layer whose behavior they establish. Integration
tests at the UI boundary verify that the composed workflow exposes values,
diagnostics, recovery, and textual visualization state.

## Code documentation convention

Exported APIs use TSDoc-compatible `/** ... */` comments when their contracts
include information that TypeScript cannot express directly. In particular,
document:

- ownership and copying rules at layer or backend boundaries;
- mathematical conventions, coefficient ordering, and coordinate orientation;
- source-span, unit, range, and normalization conventions;
- meaningful preconditions, invariants, failure modes, and `null` results;
- architectural intent whose loss could introduce a reverse dependency.

Do not add comments that merely restate a symbol name, enumerate fields already
clear from a type, narrate an implementation, or speculate about an unapproved
future design. Private helpers need comments only when they contain a
non-obvious invariant or algorithmic choice.

Architecture documents remain responsible for relationships between modules,
while code comments describe individual API contracts. Normative language and
mathematical behavior remain in their owning requirements and specifications.
Generated API documentation is intentionally deferred; TSDoc compatibility
allows a future TypeDoc-based system without making generated pages or comment
coverage a current delivery requirement.

## Boundary rules

1. Ganja.js values, typed arrays, generated functions, exceptions, and graphing
   APIs stay inside `src/algebra`. The adapter copies results into owned domain
   values before returning.
2. Source text is parsed and evaluated by MultiVector code. It is never passed
   to a backend evaluator or ganja.js `inline`.
3. Domain values contain mathematical data, not presentation state or backend
   behavior.
4. Algebra-specific standard interpretation is a deterministic function of the
   owned value. Source spelling and construction history do not change the
   resulting semantic entity.
5. Visualization primitives contain neither algebra identifiers nor
   multivector coefficients. They describe renderable geometry and accessible
   meaning.
6. Viewport transformations affect screen coordinates only. They never change
   evaluated values or semantic entity coordinates.
7. React owns interaction and presentation composition. Business rules remain
   callable and testable without React or a browser DOM.
8. Diagnostics retain source spans across the parsing and application
   boundaries and are presented textually rather than inferred again in the
   UI.
9. Dependency order is derived from references, not row position. Invalid graph
   branches have no value, while independent branches continue evaluating.
10. Position is evaluated and propagated as record metadata. It never enters
    owned multivector coefficients or changes standard geometric interpretation.

These rules implement the replacement boundaries described in
[Technology Decisions](technology-decisions.md) and the ownership constraints
in the [Design Requirements](../design-requirements.md).

## Planned extension points

The current vertical slice intentionally omits several capabilities needed by
the VGA 2D Foundation milestone. When those capabilities enter implementation,
their responsibilities should fit the existing dependency direction:

- document state expands its current stable identities and value/position
  source ownership to include algebra configuration, appearance, and persisted
  revisions;
- dependency analysis expands from the current declaration table and acyclic
  traversal into bounded reusable planning nodes for every persisted source
  property;
- commands own validated document changes and history boundaries rather than
  allowing UI components to mutate domain state directly;
- persistence owns canonical JSON, migration, local storage, and failed-write
  recovery behind an application-facing interface;
- interaction translates pointer or keyboard intent into semantic edit
  requests; geometry and document rules decide whether source can be rewritten;
- render adapters consume shared visualization primitives, allowing SVG to be
  replaced or supplemented without changing algebra or geometry layers.

Document objects may later retain construction provenance to derive labels or
default appearance. That metadata remains separate from the owned multivector
and may affect presentation only; it does not change algebraic equality or the
standard geometric interpretation.

New cross-cutting behavior should be placed in the narrowest layer that can own
it without creating a reverse dependency. If a feature requires algebra
identifiers in shared visualization code, backend values in application state,
or source parsing in React components, the boundary should be reconsidered
before implementation proceeds.

## Review triggers

Review this document when a change introduces a new production layer, moves a
responsibility across an existing boundary, adds another algebra or renderer,
or reveals that the dependency direction prevents a required workflow. Update
the diagrams and responsibility table with the implementation so they describe
the repository rather than an aspirational structure.
