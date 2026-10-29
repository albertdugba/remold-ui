import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import { Step, Steps } from "fumadocs-ui/components/steps";
import type { MDXComponents } from "mdx/types";
import * as demos from "./demos";
import { Showcase } from "./showcase";
import { AddCommand, Install } from "./package-tabs";
import { Dependencies, Source } from "./source";
import { Customize } from "./customize/customize";
import { Stage } from "./stage";
import { CodeVariants, Variant } from "./code-variants";
import { ControlsTable } from "./customize/props-table";
import { AllComponents } from "./component-grid";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    TypeTable,
    Steps,
    Step,
    ...demos,
    Showcase,
    Source,
    AddCommand,
    Install,
    Dependencies,
    Customize,
    Stage,
    CodeVariants,
    Variant,
    ControlsTable,
    AllComponents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
