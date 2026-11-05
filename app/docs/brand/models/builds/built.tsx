"use client";

import { PitBuildingBuilt, TownLow, TownMid, TownTower } from "@/components/world/kit/builtTown";
import { AhmedabadBuilt, BostonBuilt, HyperlabBuilt, WatersBuilt } from "@/components/world/kit/builtSectors";
import { FloodlightBuilt, GantryBuilt, GrandstandBuilt, MarshalBuilt, PitWallBuilt, TecproBuilt } from "@/components/world/kit/builtTrackside";
import type { Build } from "./types";

export const BUILDS: Build[] = [
  { id: "town-low", name: "Town block, low", span: 13, height: 13.6, Model: TownLow },
  { id: "town-mid", name: "Town block, mid", span: 17, height: 22.3, Model: TownMid },
  { id: "town-tower", name: "Landmark tower", span: 17, height: 42, Model: TownTower },
  { id: "pit-building", name: "Pit building", span: 42, height: 11.3, Model: PitBuildingBuilt },
  { id: "boston", name: "Boston sector building", span: 32, height: 25, Model: BostonBuilt },
  { id: "ahmedabad", name: "Ahmedabad sector building", span: 23, height: 16, Model: AhmedabadBuilt },
  { id: "hyperlab", name: "Hyperlab studio", span: 18, height: 8, Model: HyperlabBuilt },
  { id: "waters", name: "Waters lab building", span: 24, height: 7.6, Model: WatersBuilt },
  { id: "grandstand", name: "Grandstand", span: 18, height: 9, Model: GrandstandBuilt },
  { id: "floodlight", name: "Floodlight", span: 6, height: 27, Model: FloodlightBuilt },
  { id: "gantry", name: "Start gantry", span: 17, height: 8.5, Model: GantryBuilt },
  { id: "tecpro", name: "TecPro barrier", span: 8.5, height: 2.4, Model: TecproBuilt },
  { id: "marshal", name: "Marshal post", span: 3.4, height: 3.3, Model: MarshalBuilt },
  { id: "pitwall", name: "Pit wall", span: 14.5, height: 4.2, Model: PitWallBuilt },
];
