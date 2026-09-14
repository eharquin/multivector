# PGA 2D Foundation Example

This example walks through the plane-based PGA(2) showcase document, which
is loaded when the algebra is selected, then adds projective equivalence,
versors, and direct manipulation.

## Select the algebra

1. Activate the `VGA · 2D` badge in the header: a menu lists the registered
   algebras. Choose `PGA · 2D — Projective Geometric Algebra`.
2. If the document has content, confirm that it will be replaced. The badge now
   reads `PGA · 2D`, the PGA showcase is loaded, and the `i` segment of the
   capsule opens the algebra information.

Replacing and switching form one history entry: `Ctrl+Z` restores both the
previous expressions and the previous algebra.

## Read the showcase

The loaded document declares:

| Row | Kind | What to observe |
| --- | --- | --- |
| `A = point(-2, 1)` | Point at (-2, 1) | a marker with a handle |
| `B = point(2, 2)` | Point at (2, 2) | a second marker |
| `L = A & B` | Line, scale 4.12311 | the join: the line through `A` and `B`, clipped to the viewport |
| `M = line(1, 0, -1)` | Line | the vertical line `x = 1`; a unit line shows no scale |
| `X = L ^ M` | Point at (1, 1.75), weight −4 | the meet of the two lines; the weight comes from the lines' coefficients, not from the position |
| `D = ipoint(1, 0)` | Ideal point, direction (1, 0) | an arrow from the origin; its appearance menu can also show it as a marker at infinity |
| `t = 0` | Scalar with a looping slider | press ▶ to animate |
| `R = exp(-(t/2) * A)` | Scalar at `t = 0`, then Motor | the rotation by `t` about the point `A` |
| `C = R >>> B` | Point | `B` orbiting `A` while `t` runs |
| `T = 1 - e01 - 0.5 e02` | Translator | the translation by (2, 1) |
| `S = T >>> X` | Point at (3, 2.75), weight −4 | `X` translated; the weight is preserved |
| `F = M >>> A` | Point at (4, 1), weight −1 | the reflection of `A` in `M`; the negative weight is the orientation reversal of an odd versor, not an error |

Press ▶ on `t`: `R` becomes a motor and `C` circles `A` at the distance of
`B`. `Escape` stops the animation.

## Exercise projective equivalence and the language

1. Change `B` to `B = 2 * point(2, 2)`: it reports `Point at (2, 2), weight 2`;
   `L`, `X`, and `C` are unchanged as geometry.
2. Add `G = M * T`: a `Reflection`, the glide reflection that translates by
   `T` then reflects in `M`; `G >>> A` is `Point at (2, 2), weight −1`.
3. Add `N = norm(L)` and `I = inorm(L)`: the Euclidean and ideal norms of the
   join, `4.12311` and `6`.
4. Add `P = L ^ line(1, 0, -3)`: the meet with `x = 3`, `Point at (3, 2.25)`;
   then `Q = L ^ L`: a Scalar zero, since a line meets itself nowhere.
5. Write `e20` anywhere: it is accepted and displayed as `-e02`.

## Ideal points and the line at infinity

1. Add `I = e0`: the line at infinity is drawn as the dashed ellipse inscribed
   in the viewport.
2. Open the appearance menu of `D` and choose *At infinity* or *Both*: the
   marker of `D` sits on the ellipse, in the direction `(1, 0)`.
3. Drag the base of `D`: its position `point(x, y)` is written in the position
   field and the arrow moves with it; `D.head` is the Euclidean point at the
   arrow's tip. Drag its head: `D = ipoint(x, y)` is rewritten.

## Move a point directly

1. Drag the marker of `A`: `A = point(x, y)` is rewritten with the pointer's
   grid-rounded coordinates, and `L`, `X`, `R`, `C`, and `F` follow.
2. Press `Ctrl+Z` (`⌘Z` on macOS): the whole gesture is undone as one entry.
3. Focus the marker of `B` with `Tab` and press the arrow keys to nudge it
   (`Shift` for a larger step).

Lines and ideal points have no handle in this milestone.

## Create points from the viewport

Double-click empty viewport space: a new declaration `P1 = point(x, y)` is
inserted with the pointer's coordinates and focused.

## Save, reload, export, and import

1. Reload the page: the algebra, interpretation, sources, and appearance return
   from local storage, and the badge still reads `PGA · 2D`.
2. Export the document and re-import it: the algebra record `org.multivector.pga`
   with `{ "dimension": 2 }`, the interpretation `org.multivector.pga-2d`, and
   the visualizer are preserved.
3. Open a VGA document exported earlier: it loads unchanged.
