# Numerical Policy Options

**Status:** Stage 1 accepted and implemented; Stage 2 still proposed for review  
**Issue:** #68  
**Date:** 2026-08-04  
**Decision owner:** Algebra-definition and interpretation architecture

## 1. Decision to make

MultiVector must distinguish deliberate small mathematical values from
floating-point leakage while supporting algebras with very different numerical
conditioning. The decision affects:

- coefficients consumed by dependent expressions;
- exact algebraic boundaries such as grade, scalar, singularity, and domain;
- semantic interpretation such as Scalar, Vector, Bivector, and Rotor;
- canonical document compatibility and reproducibility;
- the computational requirements of future PGA, CGA, CCGA, and ACGA engines.

Display precision and viewport zoom are outside this decision. They must never
change an already evaluated value or semantic kind. Zoom-aware rounding is
allowed only when a canvas gesture intentionally writes visible source.

## 2. Current behavior

The VGA(2) adapter explicitly constructs ganja.js with `Float64Array`. Owned
values contain finite JavaScript binary64 coefficients and canonical inspection
uses exact zero. VGA interpretation also uses exact zero to determine which
grades are present.

Consequences:

- exact basis, integer, projection, and product cases retain exact structural
  zeroes;
- a transcendental or accumulated residual remains a real owned coefficient;
- `-1 + 3.6E-9e12` is classified as a Rotor;
- `1.7E-9e12` is classified as a Bivector;
- dependent expressions consume those residual coefficients.

Scalar controls previously added avoidable source truncation. That correction
reduces error but cannot guarantee exact transcendental identities.

## 3. Requirements that constrain the decision

Convention version 1 currently requires owned values to provide at least
binary64 precision and reserves numerical tolerance for fixture comparison. It
explicitly forbids tolerance from erasing coefficients, altering grades, or
changing singularity. Therefore making Float32 the default computational
semantics or making approximate zero feed dependent expressions is not a minor
implementation change: it requires a new convention or a deliberate revision
before convention version 1 is accepted.

The interpretation contract is separately owned from the algebra definition.
An interpretation may classify approximately without changing the algebraic
value, but that alone cannot make downstream expressions consume zero.

## 4. Evidence from MultiVector Studio

Studio provides useful behavioral evidence, not the normative rule. Its VGA
backend uses ganja.js Float32 values and semantic grade detection based on:

```text
epsilon = 1E-10 + 1E-6 * max(abs(output coefficients))
```

That relative term suppresses leakage beside a dominant coefficient, such as a
small bivector component beside scalar `-1`. It does not reliably classify an
otherwise standalone `1.7E-9e12` as zero because the output itself supplies the
scale. Studio also selects Float64 explicitly for ACGA and CCGA, where powers,
cancellation, and polynomial extraction are poorly conditioned in Float32.

The lesson is not one universal epsilon. Numerical policy must be algebra- and
operation-aware.

## 5. Options

### Option A — Exact owned values, approximate presentation only

Keep binary64 evaluation and exact semantic classification. Show small values
compactly but never reinterpret or erase them.

Advantages:

- preserves current convention and ordinary algebraic laws;
- deliberate small values remain meaningful;
- document results do not depend on an adjustable threshold.

Disadvantages:

- harmless numerical leakage remains visible as a semantic grade;
- the complete-turn examples remain surprising;
- does not meet the requested behavior for dependent expressions.

### Option B — Threshold every result

After each operation, replace coefficients below a fixed or
magnitude-relative threshold with exact zero. Dependent expressions consume the
cleaned value.

Advantages:

- simple and deterministic;
- yields intuitive zeroes in many interactive constructions;
- one stored value drives evaluation, classification, and display.

Disadvantages:

- destroys deliberately authored small values;
- results depend on evaluation grouping and intermediate rounding;
- can change invertibility, division, ranges, and scalar-only boundaries;
- an output-relative threshold cannot distinguish a tiny result from noise;
- one threshold is unsafe across algebra families.

This option is rejected as the common numerical contract.

### Option C — Raw evaluation plus approximate interpretation

Preserve raw binary64 owned values for dependent evaluation, but let each
interpretation suppress coefficients using a declared threshold.

Advantages:

- leaves algebraic evaluation and serialization stable;
- improves object classification and visualization;
- supports interpretation-specific geometric predicates.

Disadvantages:

- the displayed semantic object can disagree with its canonical value;
- a displayed Scalar zero may still affect dependents;
- a standalone near-zero result still needs an arbitrary absolute floor.

This is acceptable for geometry extraction but insufficient as the complete
answer to the requested dependent-zero behavior.

### Option D — Precision profiles with propagated error envelopes

Each evaluated value carries:

```text
coefficients: owned computational result
errorBounds: absolute uncertainty per coefficient or grade
scale: operation-relevant magnitude evidence
```

Definitions declare supported computational profiles. Operations propagate
conservative error bounds from input representation, conditioning, and work.
A coefficient may be canonicalized to zero only when its magnitude is bounded
by its propagated numerical uncertainty and the operation's policy permits the
canonicalization. Directly authored `1E-9e12` begins with binary64 parsing
uncertainty rather than a blanket `1E-8` cutoff, while a Float32 wedge of two
order-one vectors can carry a much wider derived bound.

Advantages:

- distinguishes small authored values from computation noise in principle;
- provides operation-relevant scale for a near-zero whole result;
- can define when dependent expressions legitimately consume canonical zero;
- extends to sensitive algebra-specific extractors.

Disadvantages:

- substantially more complex than coefficient-only evaluation;
- error propagation must be independently verified;
- transcendental and ill-conditioned operations require careful bounds;
- arbitrary cancellation may make bounds conservative enough to hide useful
  results;
- adds work and memory throughout lists and dependency evaluation.

## 6. Proposed direction

Adopt a staged combination of C and D while retaining binary64 as the current
computational baseline.

### Stage 1 — Interpretation policies

- Keep the current Float64 VGA engine and raw owned coefficients.
- Add an interpretation-owned classification policy with named absolute and
  relative terms and a documented scale input.
- Do not make the user-facing decimal setting or zoom part of that policy.
- Make approximation explicit in semantic output when ignored coefficients are
  nonzero.
- Keep dependent evaluation raw during this stage.
- Add boundary fixtures for deliberate small literals, dominant-grade leakage,
  standalone near-zero results, and scale changes.

Stage 1 can improve classification, but it must not claim that a displayed zero
is an exact algebraic zero.

Implemented in `src/geometry/vga2ClassificationPolicy.ts` and
`src/geometry/vga2Interpretation.ts` as VGA-INT-005, with `absoluteFloor =
1E-10` and `relativeTerm = 1E-6` as the standard VGA(2) policy constants,
confirmed by the fixtures in `src/geometry/vga2Interpretation.test.ts`.

### Stage 2 — Evaluated uncertainty

- Prototype an internal, recomputed error envelope; do not serialize it in the
  canonical document.
- Begin with VGA operations having tractable bounds: literals, addition,
  scaling, geometric/outer products, closed-form exponential, and sandwich.
- Compare propagated bounds against independent analytical and deterministically
  generated fixtures.
- Permit dependent canonicalization only through a versioned algebra operation
  policy, never through the visual interpretation layer.
- Treat singularity, inverse, integrality, indexing, and range boundaries as
  exact unless their owning convention explicitly adopts uncertainty-aware
  semantics.

### Computational profiles

Do not expose a Float32 user option until the error-envelope prototype and
document compatibility are understood. When profiles are introduced:

- the profile belongs to algebra configuration and is document-owned;
- changing it triggers complete deterministic reevaluation and participates in
  mathematical history;
- owned coefficients reflect the selected computational result even though the
  common representation remains JavaScript numbers;
- definitions may require Float64 and omit Float32;
- the profile identifier and default are versioned;
- canonical imports never silently change an explicitly selected profile.

Candidate future identifiers are `interactive-f32` and `research-f64`, but
names and defaults remain undecided. Calling Float32 merely `standard` would
imply that it is universally suitable, which is false for planned algebras.

## 7. Answers to the issue's required decisions

| Question | Proposed answer |
| --- | --- |
| Is precision document-owned or an application preference? | Document-owned algebra configuration because it changes evaluated coefficients |
| Does Float32 configure only the backend? | No. Owned results must reflect deterministic Float32 quantization at the adapter boundary and after project-owned operations |
| Do dependents consume raw or classification-cleaned values? | Never interpretation-cleaned values; initially raw, later algebra-canonicalized values justified by propagated uncertainty |
| How are authored small values distinguished from leakage? | By source/operation-derived uncertainty, not a universal magnitude cutoff |
| Which boundaries remain exact? | Grade projection structure, scalar-only language boundaries, integrality, indexing, range cardinality, and singularity unless a versioned convention explicitly says otherwise |
| Does changing precision trigger reevaluation/history? | Yes, complete reevaluation and one mathematical document-history entry |
| Is zoom involved? | Only in source written by a canvas gesture, never in evaluation or classification |

## 8. Required experiments before acceptance

1. Record raw coefficients for the default graph at `0`, `pi/2`, `pi`, and
   `tau` under full-source precision.
2. Run the same fixtures through explicit Float32 and Float64 adapters.
3. Sweep vector magnitudes from `1E-9` through `1E9` and measure complete-turn
   wedge and sandwich leakage.
4. Verify deliberately authored `1E-12`, `1E-9`, and `1E-6` coefficients.
5. Compare direct and regrouped evaluation to expose threshold
   non-associativity.
6. Derive and test error bounds for VGA addition, multiplication, wedge,
   exponential, and sandwich.
7. Audit PGA null entities and motor normalization before reusing any VGA
   policy.
8. Use Kingdon only as an additional oracle; analytical convention fixtures
   remain normative.

## 9. Acceptance boundary

This proposal is ready to become normative only when experiments demonstrate a
policy that:

- explains the observed residuals at multiple scales;
- preserves deliberately authored small values under its documented profile;
- gives deterministic dependent behavior;
- does not make presentation or zoom alter mathematics;
- states every affected exact boundary;
- can be implemented through algebra and interpretation contracts rather than
  VGA branches in the application shell.

