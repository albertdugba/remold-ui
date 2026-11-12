"use client";
/** Which components have a Customize panel: each one's component and its settings. */
import type { ComponentType } from "react";
import type { Customizable } from "./controls";
import { LogoMorph } from "../demos/logo-morph";
import { logoMorphControls } from "../demos/logo-morph.controls";
import { ParticleShapesDemo } from "../demos/particle-shapes";
import { particleShapesControls } from "../demos/particle-shapes.controls";
import { ProductTourDemo } from "../demos/product-tour";
import { productTourControls } from "../demos/product-tour.controls";

export const CUSTOMIZABLE: Record<string, { Component: ComponentType<never>; meta: Customizable }> = {
  "logo-morph": { Component: LogoMorph, meta: logoMorphControls },
  "particle-shapes": { Component: ParticleShapesDemo, meta: particleShapesControls },
  "product-tour": { Component: ProductTourDemo, meta: productTourControls },
};
