# Next-generation MultiVector project

**Status:** Deprecated — historical record only
**Date:** 2026-07-20
**Superseded by:** [Application architecture](application-architecture.md),
[Multi-algebra registration delta](multi-algebra-registration-delta.md), and the
normative [design requirements](../design-requirements.md)

> [!WARNING]
> **This document is deprecated.** It is kept unchanged below as a record of the
> direction that preceded the current repository. It is neither normative nor
> a description of the current architecture, and it must not be cited as a
> requirement or specification.
>
> The note was written on 2026-07-20 against the previous MultiVector
> application, whose history is not part of this repository. Its direction was
> adopted in a different form: instead of a separate `multivector-next`
> project, this repository was restarted in place and now ships as GAMUT. The
> first vertical slice was VGA(2), not VGA 1D, followed by PGA(2). The
> one-dimensional and three-dimensional models, CGA, and the
> model-independent scene described below remain unscheduled ideas. They are
> tracked, if at all, by the [roadmap](../../ROADMAP.md) and GitHub issues,
> not by this note.

## Original status

This document records a possible direction for a new project. It is a design
note, not a commitment to replace the current MultiVector application.

## Motivation

The current application is functional, but its architecture grew alongside the
research prototypes and is difficult to learn as a whole. A new project built
incrementally would make it possible to:

- develop a clear mental model of every layer;
- document mathematical and software conventions as they are introduced;
- separate Clifford algebra, geometric models, expression evaluation, scene
  construction, and visualization;
- verify each supported dimension before adding the next one;
- use the current application as an executable reference instead of modifying
  it while its architecture is being reconsidered.

The existing repository should remain intact as a source of validated formulas,
saved graphs, interaction behavior, visual references, and regression cases.

## Mathematical direction

For a Euclidean dimension `n`, the intended progression is:

```text
VGA(n)
  + one null projective direction
    -> PGA(n)
      + the second conformal null direction
        -> CGA(n)
```

The Euclidean generators of VGA form a well-defined subalgebra of PGA. A
corresponding projective subalgebra can also be identified inside CGA. This
makes it reasonable for the models to share algebraic kernels and capabilities.

This relationship should be implemented through composition, however, rather
than adapter inheritance. Points, duality, joins, meets, normalization, and
object classification depend on the ambient model. A PGA point is not a CGA
point, even when the models share their Euclidean vector operations.

Possible model factories are therefore:

```text
createVgaModel({ dimension })
createPgaModel({ dimension, euclideanKernel })
createCgaModel({ dimension, euclideanKernel, projectiveCapabilities })
```

The exact relationship between the projective subalgebra of CGA and the chosen
PGA representation must be written down and tested before that API is fixed.

## Dimensional progression

Development would begin with VGA and add one spatial dimension at a time:

1. VGA 1D with a one-dimensional renderer;
2. VGA 2D with a two-dimensional renderer;
3. VGA 3D with a three-dimensional renderer;
4. PGA 1D, 2D, and 3D as projective extensions;
5. CGA 1D, 2D, and 3D as conformal extensions.

The corresponding algebra identifiers and signatures would be:

| Model | 1D | 2D | 3D |
| --- | --- | --- | --- |
| VGA | `vga100`, Cl(1,0) | `vga200`, Cl(2,0) | `vga300`, Cl(3,0) |
| PGA | `pga101`, Cl(1,0,1) | `pga201`, Cl(2,0,1) | `pga301`, Cl(3,0,1) |
| CGA | `cga210`, Cl(2,1) | `cga310`, Cl(3,1) | `cga410`, Cl(4,1) |

One-dimensional models are not merely reduced demonstrations. PGA 1D gives a
particularly small setting for finite and ideal points and translations, while
CGA 1D exposes conformal transformations and point pairs. Degenerate concepts
must be named honestly: VGA 1D has no non-zero bivectors or continuous rotors,
and a one-dimensional conformal sphere is a pair of points.

## Architectural boundaries

The new project should keep five layers distinct:

1. **Clifford algebra**: signatures, bases, blades, multivectors, and products.
2. **Geometric model**: embeddings, extraction, classification, and geometric
   operations for VGA, PGA, or CGA.
3. **Expression system**: parsing, dependency analysis, evaluation, and typed
   diagnostics.
4. **Scene representation**: model-independent geometric primitives expressed
   with coordinate arrays.
5. **Visualization**: dedicated 1D, 2D, and 3D renderers consuming the scene.

The principal data flow would be:

```text
expression
  -> syntax tree and dependency graph
  -> algebraic values
  -> geometric interpretation
  -> model-independent scene
  -> 1D, 2D, or 3D renderer
```

A scene primitive should carry geometry rather than blade indices, for example:

```js
{ kind: 'point', coordinates: [x] }
{ kind: 'vector', origin: [0], direction: [dx] }
{ kind: 'line', point: [x, y], direction: [dx, dy] }
{ kind: 'plane', normal: [a, b, c], offset: d }
{ kind: 'circle', center: [x, y], radius: r }
```

This boundary allows a renderer to depend on spatial dimension without knowing
whether an object came from VGA, PGA, or CGA.

## New-project strategy

The work should live in a separate project rather than replacing this repository
in place. The initial project can be a single TypeScript application; a monorepo
is only justified later if the algebra kernel and application need independent
release cycles.

A possible initial layout is:

```text
multivector-next/
  docs/
    architecture.md
    mathematical-conventions.md
    decisions/
  src/
    algebra/
    expression/
    models/
      vga/
      pga/
      cga/
    scene/
    renderers/
      one-dimensional/
      two-dimensional/
      three-dimensional/
    application/
  tests/
```

Compatibility with existing graph documents should not constrain the initial
design. Once the new document model is stable, a separate importer can migrate
useful graphs from the current application.

## First vertical milestone

The first milestone is deliberately small but complete:

> Evaluate the expression `v = 2*e1` in VGA 1D and display the resulting vector
> as an arrow of length 2 on a graduated number line.

That milestone includes:

- documented signature, basis, and product conventions;
- scalar and vector multivectors in Cl(1,0);
- parsing, addition, geometric product, reverse, and norm;
- structured syntax and evaluation diagnostics;
- conversion from an algebraic value to a scene primitive;
- a dedicated interactive 1D visualization;
- unit tests and an end-to-end example.

Every later milestone should remain a usable vertical slice. VGA 2D is the first
test of whether the dimensional abstractions are sound; PGA and CGA should not be
designed in detail until that test succeeds.

## Success criteria

The experiment is successful if it produces:

- a mathematical account of the VGA/PGA/CGA relationship and conventions;
- independent dimensions for the algebra, geometric model, and visualization;
- small composable model capabilities instead of a hierarchy of inherited
  adapters;
- structured diagnostics and a versioned document boundary from the beginning;
- documentation and tests that make each new dimension understandable before
  the following one is implemented.
