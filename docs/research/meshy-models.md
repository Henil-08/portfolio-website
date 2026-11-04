# Meshy model list (world, Concrete & Ink)

The owner has Meshy access (2026-11-04). This is the list of models to generate, each with its prompt
and priority, plus how the models come into the game so they match docs/BRAND.md.

## Rules for every model

- **Meshy makes the shape only.** Colour, text, logos and the one orange accent are added in code, the
  same way as the rest of the world. Generate without texture where Meshy allows it. That is cheaper,
  and the texture gets replaced anyway.
- **Style suffix**, appended to every prompt:
  > low-poly faceted hard-surface model, flat planar faces, crisp chamfered edges, no fillets, no organic
  > noise, matte, single solid light grey colour, untextured, architectural maquette / product-design
  > model look, clean silhouette, centred on a flat base, no text, no logos
- **Size:** keep each model small. In the import script, decimate to 1–5k triangles for props and 8–15k
  for heroes.
- **Pipeline:**
  1. Download the GLB.
  2. Run `scripts/import-meshy.mjs` (to write). It uses gltf-transform to weld, simplify, centre, scale to
     metres and set y = 0 at the base.
  3. Save the result to `public/models/<id>.glb`.
  4. A small component loads the model and assigns the brand materials:
     - The model is one mesh, so the paint split is done in code: by height band or normal (plinth =
       concrete, top = ink), or with separate parts glued together.
     - Codes and labels are added in Plex.
     - Add the orange accent last.
- **Where a texture is unavoidable** (people, the solar car), snap its colours to the palette in the
  import script (nearest of ink, paper, concrete, concrete dark, graphite, orange) and bake them to vertex
  colours.

## Keep in code (do not spend credits)

These are geometric or instanced, and code makes them crisper, lighter and already on-brand:

- buildings (town, pit building, sectors)
- barriers, kerbs, road, fences
- grandstands, floodlights, gantry
- trees and bushes
- name letters, plinths, signs
- the four vehicles (approved, procedural)

## P0: do first (about 10 generations)

| # | id | Model | Prompt (then the style suffix) |
|---|---|---|---|
| 1 | contact-base | **Contact statue plinth**, shared by all 7 | a tall stepped monument plinth, square column on two stepped slabs, a recessed panel on the front face for a plaque |
| 2 | contact-mail | Statue: Email | a large folded paper envelope standing on its edge, flap half open, sharp folds, like an origami sculpture |
| 3 | contact-linkedin | Statue: LinkedIn | an abstract network sculpture: five spheres joined by straight rods in a 3D lattice, balanced on one point |
| 4 | contact-github | Statue: GitHub | a branching pipe sculpture like a git graph: one vertical trunk splitting into three branches that merge back, square-section pipes with node blocks at the joins |
| 5 | contact-resume | Statue: Résumé | a giant standing sheet of paper with one corner folded, lines engraved on it, leaning slightly back on a small stand |
| 6 | contact-scholar | Statue: Scholar | a stack of four thick books with a graduation cap on top, books slightly offset |
| 7 | contact-hf | Statue: Hugging Face | an abstract figure of two open arms reaching around in a hug, simplified blocky mannequin torso, no face |
| 8 | contact-medium | Statue: Medium | an old typewriter on a small block, with a single sheet of paper standing up out of it |
| 9 | avatar | **Driver** (rig in Meshy, wave animation) | a racing driver standing, full race suit, closed helmet with dark visor, gloves, arms relaxed, A-pose, stylised proportions |
| 10 | trophy | **Trophy cup** (one model, coloured per place) | a classic two-handled trophy cup on a square stepped base |

Credit saver: the statues can share #1 and each be just the object on top, so items 2–8 are small objects.

## P1: sector heroes and key props (about 10)

| # | id | Model | Prompt |
|---|---|---|---|
| 11 | mercury | Mercury solar car (Ahmedabad, Team Stallions) | a single-seat solar race car, very low and flat, a wide flat top covered in solar panel cells, a small bubble canopy, three wheels |
| 12 | sharktank | Hyperlab pitch set | a TV studio pitch stage: a raised platform with a lectern and a large screen frame behind it, five chairs in an arc facing it |
| 13 | phone | 50K phone | a smartphone standing upright on a small stand, thin bezels, slightly tilted back |
| 14 | instrument | Waters lab instrument | a laboratory analytical instrument: a stacked modular box system with a front door window, a sample tray drawer and a small screen on the side |
| 15 | rack | AGENT OPS server rack | a server rack cabinet with a perforated front door and rows of 1U servers visible |
| 16 | jetson | Edge AI board (self-driving round) | a small single-board computer with a heatsink fan block on top, ports on one edge |
| 17 | fan | Crowd fan (instanced in the stands) | a seated spectator figure, simple blocky stylised body, arms on knees, no face |
| 18 | marshal | Track marshal | a standing track marshal in overalls, holding a flag pole, simple blocky body, no face |
| 19 | camera | Trackside TV camera | a broadcast TV camera on a tripod with a long lens and a hood |
| 20 | pitboard | Pit board on a pole | a racing pit board: a rectangular board with slots for number plates, on a long pole |

## P2: garage project objects (one per project, 24) and small dressing

The garage objects live on the plinths in the pit building. They follow content/projects.ts; what each
one shows is unchanged from models/projects/*.

| id | Project | Prompt |
|---|---|---|
| p-verif | AI in Verification | a microchip die on a board with a magnifying glass resting over it |
| p-verilog | Verilog Coder | a computer monitor showing blocks of code, a chip on a small stand beside it |
| p-appsage | AppSageAI 2.0 | a document with a shield in front of it, a shopping cart beside it |
| p-freemoji | Freemoji | a round smiley face sculpture with a speech bubble |
| p-verta | Verta | a chat speech bubble sculpture over a small stack of cards |
| p-solar | Self-Driving Solar Vehicle | (reuse #11 at small scale) |
| p-ipl | IPL Fantasy Picker | a cricket bat and ball on a small scoreboard |
| p-kidney | Kidney Tumor Classification | a stylised kidney shape on a scan tray |
| p-frisbee | Ultimate Frisbee Ratings | a flying disc tilted on a stand with a small bar chart |
| p-rtr | Rent the Runway Recommender | a dress on a mannequin torso on a stand |
| p-sql | Chat with SQL | a database cylinder stack with a speech bubble |
| p-elder | Elder Knowledge AI | an open book with a speech bubble rising from it |
| p-gpt | GPT from Scratch | a tower of stacked blocks like transformer layers |
| p-anomaly | API Traffic Anomaly Detection | a line chart panel standing up, with one spike marker |
| p-parser | Resume Parser | a sheet of paper feeding into a small box machine |
| p-picar | Pi-Car | a small four-wheeled robot car with a camera on a mast |
| p-gesture | Gesture Volume Control | an open hand pinching, beside a volume slider |
| p-ytblog | YouTube Video Blog Generator | a video play-button screen turning into a page |
| p-rag | RAG Document Q&A | a stack of documents with a magnifying glass |
| p-tt | Table Tennis Ball Tracking | a table tennis table section with a ball and a small camera on a clamp |
| p-helios | Helios Adaptive Timeout | a stopwatch on a server box |
| p-carla | Deep Learning Driving in Simulation | a car on a screen frame, the road drawn on the screen |
| p-pcm | PCM Battery Thermal Management | a battery cell block with a thermometer |
| p-maternity | Maternity eCommerce Pricing | a price tag on a small dress form |

Small dressing (only if credits are left; code versions exist):

- bench, bollard, kiosk, bus stop, café set
- crate, barrel, boat, rock set, bird

## Budget

The cost per generation depends on the Meshy model version and options. Check the dashboard before
starting.

- Shape-only generation (no texture) is the cheap path.
- Generate once per item; re-roll only P0.
- P0 + P1 is about 20 items, the full list about 45.
