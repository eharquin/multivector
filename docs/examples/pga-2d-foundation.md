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

The loaded document is a triangle whose metric read-outs are products and
norms; the scalar functions only turn them into numbers:

| Row | Kind | What to observe |
| --- | --- | --- |
| `A = point(-2, 1)` | Point at (-2, 1) | a marker with a handle |
| `B = point(2, 2)` | Point at (2, 2) | a second marker |
| `C = point(1, -2)` | Point at (1, -2) | the third vertex |
| `L = A & B` | Line, scale 4.12311 | the join: the side through `A` and `B`, clipped to the viewport; its scale is the distance `AB` |
| `M = A & C` | Line, scale 4.24264 | the side through `A` and `C` |
| `dAB = norm(A & B)` | Scalar 4.12311 | the distance between `A` and `B`: the Euclidean norm of their join (times the two weights, here 1) |
| `dBC = norm(B & C)` | Scalar 4.12311 | the distance between `B` and `C` |
| `alpha = atan2((L ^ M).e12, L \| M)` | Scalar −1.03038 | the oriented angle at `A` from `L` to `M`: the meet's weight is `‖L‖‖M‖ sin`, the inner product `‖L‖‖M‖ cos`, and `atan2` cancels the norms |
| `deg = alpha * 180 / pi` | Scalar −59.0362 | the same angle in degrees; negative because `A → B → C` turns clockwise |
| `hC = (L ^ C).e012 / L.norm` | Scalar −3.63803 | the signed distance from `L` to `C` (the height from `C`), negative on the side opposite the normal of `L` |
| `area = (A & B & C) / 2` | Scalar −7.5 | the signed area: the triple join is twice the oriented area |
| `N = line(1, 0, -1)` | Line | the literal vertical line `x = 1`, movable from the viewport |
| `beta = atan2((L ^ N).e12, L \| N)` | Scalar −1.81577 | the oriented angle from `L` to `N` |

Drag `C` around `A` and `B`: `alpha` and `deg` follow, change sign when `C`
crosses `L`, and `area` with them; `hC` is zero exactly on `L`. Drag `N` or
rotate it through its normal handle: `beta` follows, and `deg` is unchanged.

The recipes generalize: `norm(P & Q)` is a distance between unit points,
`acos((L | M) / (L.norm * M.norm))` the unoriented angle between two lines in
`[0, pi]`, `inorm(L ^ P)` the absolute distance from a unit line to a unit
point; swapping the operands of the oriented angle negates it.

## Exercise projective equivalence, versors, and the language

1. Change `B` to `B = 2 * point(2, 2)`: it reports `Point at (2, 2), weight 2`;
   `L` is unchanged as geometry but `dAB` doubles — the join's norm carries
   the weights.
2. Add `X = L ^ N`: the meet, `Point at (1, 1.75), weight −4`; the weight comes
   from the lines' coefficients, not from the position. Then `Q = L ^ L`: a
   Scalar zero, since a line meets itself nowhere.
3. Add `t = 0`, open its appearance menu and choose the slider (`0` to `tau`,
   loop); then `R = exp(-(t/2) * A)` and `P = R >>> B`: at `t = 0` `R` is the
   scalar 1, and as soon as the slider moves it is a Motor, the rotation by
   `t` about `A`; `P` circles `A` at the distance `dAB`. `Escape` stops the
   animation.
4. Add `T = 1 - e01 - 0.5 e02`, a Translator by (2, 1), and `S = T >>> X`:
   `Point at (3, 2.75), weight −4`, the weight preserved.
5. Add `F = N >>> A`: `Point at (4, 1), weight −1`, the reflection of `A` in
   `N`; the negative weight is the orientation reversal of an odd versor, not
   an error. `G = N * T` is a `Reflection`, the glide reflection that
   translates by `T` then reflects in `N`.
6. Add `I = inorm(L)`: the ideal norm of the join, `6`.
7. Write `e20` anywhere: it is accepted and displayed as `-e02`.

## Ideal points and the line at infinity

1. Add `D = ipoint(1, 0)`: an ideal point, drawn as an arrow from the origin
   in the direction `(1, 0)`. Then `E = e0`: the line at infinity is drawn as
   the dashed ellipse inscribed in the viewport.
2. Open the appearance menu of `D` and choose *At infinity* or *Both*: the
   marker of `D` sits on the ellipse, in the direction `(1, 0)`.
3. Drag the base of `D`: its position `point(x, y)` is written in the position
   field and the arrow moves with it; `D.head` is the Euclidean point at the
   arrow's tip. Drag its head: `D = ipoint(x, y)` is rewritten.

## Move a point directly

1. Drag the marker of `A`: `A = point(x, y)` is rewritten with the pointer's
   grid-rounded coordinates, and `L`, `M`, the distances, and the angles
   follow.
2. Press `Ctrl+Z` (`⌘Z` on macOS): the whole gesture is undone as one entry.
3. Focus the marker of `B` with `Tab` and press the arrow keys to nudge it
   (`Shift` for a larger step).

## Move and rotate a line

1. Hover `N`: a translucent halo widens the line, and short ticks on its
   positive side show its orientation (toggle them from the appearance popover
   with *Orientation visible*).
2. Drag `N` to the right: the line translates and `N = line(1, 0, c)` is
   rewritten with the new `c`; `beta` is unchanged, a translation keeps the
   direction.
3. Click `N`: it stays selected and a dashed normal handle appears, anchored
   at the point of the line nearest the click; its length does not change
   with the zoom. Drag the handle's head: the line rotates about that anchor,
   `N = line(a, b, c)` keeps `√(a² + b²) = 1`, the anchor stays on the line,
   and `beta` follows. Press `Escape` to clear the selection.
4. With the line focused, press `Enter` to select it, the arrow keys to nudge
   its normal, and `Enter` again to return to translation.

Only literal lines move; `L = A & B` and `M = A & C` show the halo and ticks
but are moved through their points.

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
