import type { HTMLAttributes, ReactNode } from "react";
import type { ConnectorOptions } from "@remold-ui/dom";
import type { BaseProps } from "../utils/use-render-element.js";

export type RemoldConnectorsState = Record<string, never>;

export interface RemoldConnectorsProps
  extends BaseProps<RemoldConnectorsState>,
    ConnectorOptions,
    Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  children?: ReactNode;
}
