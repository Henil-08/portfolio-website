# World layout v4: proposal

Status: proposal, waiting for the owner's OK (roadmap step 3). Nothing here is built yet.

## Why change it

Today the island is a loop on a round blob: every place sits in one big green infield, the
water is a ring of sea plus one small lake, and the ground is almost flat. Bruno's map
(`static/ui/map/map-day.webp`, `static/terrain/terrain.png` in folio-2025) reads differently:
the circuit owns one half, the other half is a park of separate grass islands threaded by
sandy paths, water runs *between* areas, and every shoreline glows teal. You always know which
area you are in, and you cross water to get from one to the next.

## The idea in one line

Keep the circuit and the story order (straight, Ahmedabad, Hyperlab, Boston, Waters, pits), but
cut the island into named districts with a river and a harbour arm, so the drive goes
waterfront, beach, hills, old town, harbour, and the places live on their own islands.

## Top-down sketch

North is up (the far side from the camera). One character is about 4 m across, a row about 8 m.

```
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
      ~~~~~  OLD TOWN (Boston)          HILLS (Hyperlab)    ~~~~~
     ~~~  [][]  ____________    .^^^^^^^^^^^^^^^^^^.         ~~~
    ~~  [][]  _/  climbing  \_  ^^  ______________  ^^   o<- spring
   ~~  [][]  /   loop  [][]   \_^^_/   north       \_^^  :   lake  ~~
   ~~ [][]  |  [][]  [][]       BRIDGE====straight=== \ ^ :        ~~
  ~~~  [][] \__________________/  ||  (under bridge)   |^ :         ~~
  ~~ HARBOUR    \               ||                     |  :  BEACH  ~~
 ~~~ quays==     \___descent____||_______    PARK      |  :  & DUNES ~~
 ~~~~~~~~~~~~~~\                         \  ISLANDS    /  :  (Ahmeda-~~
 ~~ bay arm ~~~~>======< harbour bridge   \ (o) (o)   (   :   bad)    ~~
 ~~~~~~~~~~~~~~/  west   |   GARDEN        ) football  \  :           ~~
  ~~ boats      sweepers |  timeline  pond<~~~~river~~~~~~:  east     ~~
  ~~~  pier      |       |  terrace    |     contact    | esses      ~~
   ~~~           |       |  HENIL GAJJAR    podium      |  (river    ~~
   ~~~           \       \  garages, pit lane          /   bridge)  ~~
    ~~~           \_______\________MAIN STRAIGHT______/  T1         ~~
     ~~~~   promenade . . . . . . . . . . . . . . . . . . beach   ~~~
       ~~~~~~~~~~~~~~~~~~ SOUTH BAY (camera side) ~~~~~~~~~~~~~~~~~~
```

Legend: `~` sea, `^` hills, `[]` town blocks, `=` road over water or bridge, `:` river,
`(o)` places on park islands.

## Districts

| District | Where | Character | Places |
|---|---|---|---|
| Waterfront and pits | south, main straight | promenade, pier, boats (kept), pit lane and garages | 5 garages, start, HENIL GAJJAR letters |
| Garden | centre | the garden infield and timeline terrace (kept), the river ends in its pond | career timeline |
| Park islands | east of the garden | Bruno's blobby grass islands on sand, sandy paths, two small wooden footbridges | football, podium, playbook (tyre wall), contact ring |
| Beach and dunes | east edge | the track runs along a dune beach through the east esses; palms, rocks, driftwood | Sector 1 Ahmedabad |
| Hills | north-east | real relief, up to ~8 m: the track climbs the hill flank, a spring and small lake on top feed the river | Sector 2 Hyperlab |
| Old town | north-west | denser streets around the climbing loop, the bridge sits between buildings, so you drive *under* it in a street canyon | Sector 3 Boston |
| Harbour | west | a bay arm cuts in from the west sea to the garden, with stone quays and moored boats; the west sweepers cross it on a raised bridge with a real gap under the deck | Sector 4 Waters, cricket ground on the harbour green |

## Water

- **Harbour arm** (replaces the west lake and the narrow inlet): about 14 m wide at the mouth,
  narrowing to 8 m, with straight quay edges on the town side and a beach on the other.
- **River**: rises at the hill spring, runs south down the east side of the park, turns west
  under the east esses (a low road bridge you drive over) and ends in the garden pond.
  About 4 to 6 m wide, shallow, so the sand-teal-navy depth colours of step 4 can show.
- **Teal shoreline glow** on every edge, sea, harbour, river and ponds alike (step 4 does the shader).

## What you drive under, over and past

- Under: the crossover bridge, now framed by old-town buildings.
- Over: the harbour bridge (west), the river bridge (east esses), the crossover deck.
- Past: the bay and promenade on the straight, the dune beach, the hilltop view over the island,
  the town, the quays and boats.

## What changes in code (for the build step)

- `layout.ts`: new `TRACK_POINTS` (same order and sector split, a longer harbour section, the hill
  climb moved east), `COAST_KEYS` with the west bay arm, `CANALS` becomes the harbour arm plus
  the river (a polyline with width), `LAKES` becomes the spring lake and the garden pond.
- `terrain.ts`: a hills height field in the north-east and dunes along the east beach, added
  under the existing road and pad flattening.
- Places and zones keep their ids; the park places move to their islands, so `zones` positions,
  `INFIELD` and the garden bounds change. Everything placed procedurally (lamps, kerbs, tyre
  walls, trees, town) follows the new track by itself.
- District identity (paving, planting, props) comes after the shape is in, one district per commit.

## Questions for the owner

1. Keep the crossover bridge? (The sketch keeps it.)
2. Is it fine for the park places (football, podium, playbook, contact) to leave the central
   infield for their own islands east of the garden?
3. Same island size, or grow it by about 15% to fit the harbour arm and the hills?
