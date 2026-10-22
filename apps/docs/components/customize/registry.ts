"use client";
/** Which components have a Customize panel: each one's component and its settings. */
import type { ComponentType } from "react";
import type { Customizable } from "./controls";
import { IntegrationsHub } from "../demos/integrations-hub";
import { integrationsHubControls } from "../demos/integrations-hub.controls";
import { LayerStack } from "../demos/layer-stack";
import { layerStackControls } from "../demos/layer-stack.controls";
import { LogoMorph } from "../demos/logo-morph";
import { logoMorphControls } from "../demos/logo-morph.controls";
import { EdgeDelivery } from "../demos/edge-delivery";
import { edgeDeliveryControls } from "../demos/edge-delivery.controls";
import { OnboardingChecklist } from "../demos/onboarding-checklist";
import { onboardingChecklistControls } from "../demos/onboarding-checklist.controls";

export const CUSTOMIZABLE: Record<string, { Component: ComponentType<never>; meta: Customizable }> = {
  "integrations-hub": { Component: IntegrationsHub, meta: integrationsHubControls },
  "layer-stack": { Component: LayerStack, meta: layerStackControls },
  "logo-morph": { Component: LogoMorph, meta: logoMorphControls },
  "edge-delivery": { Component: EdgeDelivery, meta: edgeDeliveryControls },
  "onboarding-checklist": { Component: OnboardingChecklist, meta: onboardingChecklistControls },
};
