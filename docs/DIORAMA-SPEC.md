# Seasonal Diorama · "Field Station, Greenwich CT"

*July 2026. An experiment: a living diorama of Greenwich seasons as the homepage header.*

## What it is

A single self-contained Astro component ([src/components/SeasonDiorama.astro](../src/components/SeasonDiorama.astro)),
no libraries, one canvas plus an instrument panel. It renders a flat-silhouette landscape of the
Long Island Sound shoreline: water, far shore, treeline (procedural deciduous trees and pines,
seeded so the scene is stable across loads), stone wall, saltbox house, foreground field.

## The models (real, not faked)

- **Solar geometry** for 41.03° N: declination + hour angle drive sun elevation, sunrise/sunset,
  and sky palette. Winter sun arcs low and sets before 5 PM; June sun runs high past 8:30 PM.
  Clock times are DST-aware (approximate mid-Mar to early-Nov window).
- **Moon phase** computed from the synodic month, follows the scrubbed date.
- **Climatology**: sinusoidal fit to Greenwich normals (Jan mean ~30°F, Jul ~75°F) plus a
  diurnal curve. The temp slider tracks the normal until touched; the readout shows the
  deviation in sigma (sigma = 8°F).
- **Foliage calendar**: bud break mid-April, full canopy mid-May, turn from late September,
  peak color ~Oct 20, bare by mid-November. Each tree gets a phase offset and its own
  autumn color, so the treeline turns unevenly like the real one.

## Controls

- **Time dial**: 24h clock face; the orange arc is the daylight window, which stretches and
  shrinks with the date slider. Drag or use arrow keys.
- **Day of year slider** with month ticks.
- **Temp slider**: auto-follows the climatological normal; drag to override. Rain becomes
  snow at 34°F or below (the Rain button relabels itself).
- **Sky**: clear / clouds / rain / fog.
- **Now**: snaps back to Greenwich's current date, time, and (if fetched) live weather.

On load the diorama shows Greenwich right now: one Open-Meteo fetch (no key, 3.5s timeout,
silent fallback to normals). Source shows as LIVE / NORMALS / DIALED in the readout.

## Content tie-ins

- **Shakespeare quotes** keyed to season and weather (fog gets Macbeth, snow gets
  Love's Labour's Lost, moonlit nights get The Merchant of Venice...), linking to /misogi.
  2026 is the year of Shakespeare.
- **From the shelf**: books finished within a week of the dialed date, any year, pulled from
  the bookshelf data at build time (rating 4+ only), linking to /bookshelf. Misogi books tagged.
- **The runner** crosses the field now and then; in rain or snow a caption notes he goes out anyway.
- Fireflies on warm clear summer nights, geese in spring and fall, chimney smoke below 48°F,
  and the house window glows during the 5 AM misogi hour.

## Toggle and rollback

- **Build-time flag**: `SHOW_DIORAMA` in [src/pages/index.astro](../src/pages/index.astro).
  Set to `false`, commit, push: the component disappears from the built HTML entirely.
- **Runtime kill switch**: `?diorama=0` on any URL removes it client-side (for quick checks).
- **Full rollback**: the feature landed as one commit; `git revert` it.

## Performance notes

- All drawing is one canvas paint function; particles (rain, snow, leaves, fireflies) are
  capped small. The rAF loop pauses when the section scrolls out of view or the tab hides;
  a static frame is always painted so the scene is never blank.
- `prefers-reduced-motion` gets a static scene, no loop, controls still work.
- DPR capped at 2. Baked book data is ~10KB inline JSON.
