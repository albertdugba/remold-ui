"use client";
/** Which components have a Customize panel: each one's component and its settings. */
import type { ComponentType } from "react";
import type { Customizable } from "./controls";
import { IntegrationsHub } from "../demos/integrations-hub";
import { integrationsHubControls } from "../demos/integrations-hub.controls";
import { LogoMorph } from "../demos/logo-morph";
import { logoMorphControls } from "../demos/logo-morph.controls";

export const CUSTOMIZABLE: Record<string, { Component: ComponentType<never>; meta: Customizable }> = {
  "integrations-hub": { Component: IntegrationsHub, meta: integrationsHubControls },
  "logo-morph": { Component: LogoMorph, meta: logoMorphControls },
};
