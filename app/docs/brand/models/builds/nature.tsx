"use client";

import { KitModel } from "@/components/world/kit/KitModel";
import { bushModel, cypressModel, grassesModel, rocksModel, roundTreeModel } from "@/components/world/kit/nature";
import { benchModel, bollardsModel, busStopModel, cafeModel, kioskModel, lampModel } from "@/components/world/kit/street";
import { boatModel, pierModel } from "@/components/world/kit/water";
import { goalModel, KitPodium, stumpsModel, trophyModel } from "@/components/world/kit/park";
import type { Model } from "@/components/world/kit/shared";
import type { Build } from "./types";

const show = (m: () => Model) =>
  function Show() {
    return <KitModel model={m()} />;
  };

export const BUILDS: Build[] = [
  { id: "tree-cypress", name: "Cypress", span: 1.3, height: 4.3, Model: show(cypressModel) },
  { id: "tree-round", name: "Round tree", span: 3.0, height: 4.8, Model: show(roundTreeModel) },
  { id: "bush", name: "Bushes", span: 2.6, height: 1.3, Model: show(bushModel) },
  { id: "grasses", name: "Grasses", span: 1.6, height: 1.4, Model: show(grassesModel) },
  { id: "rocks", name: "Rocks", span: 3.2, height: 0.92, Model: show(rocksModel) },
  { id: "lamp", name: "Lamp", span: 0.8, height: 3.7, Model: show(lampModel) },
  { id: "bench", name: "Bench", span: 2.1, height: 1.2, Model: show(benchModel) },
  { id: "bollard", name: "Bollards", span: 1.3, height: 1.0, Model: show(bollardsModel) },
  { id: "kiosk", name: "Kiosk", span: 2.6, height: 2.5, Model: show(kioskModel) },
  { id: "busstop", name: "Bus stop", span: 3.4, height: 2.6, Model: show(busStopModel) },
  { id: "cafe", name: "Café", span: 2.8, height: 1.0, Model: show(cafeModel) },
  { id: "boat", name: "Boat", span: 6.8, height: 2.5, Model: show(boatModel) },
  { id: "pier", name: "Pier", span: 8, height: 3.1, Model: show(pierModel) },
  { id: "goal", name: "Goal", span: 3.2, height: 2.0, Model: show(goalModel) },
  { id: "stumps", name: "Stumps", span: 0.62, height: 0.8, Model: show(stumpsModel) },
  { id: "podium", name: "Podium", span: 3.1, height: 0.82, Model: KitPodium },
  { id: "trophy", name: "Trophy", span: 0.7, height: 0.85, Model: show(trophyModel) },
];
