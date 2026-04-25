declare module "react-simple-maps" {
  import type { FC, ReactNode } from "react";
  export const ComposableMap: FC<Record<string, unknown>>;
  export const Geographies: FC<{
    geography: string;
    children: (arg: { geographies: any[] }) => ReactNode;
  }>;
  export const Geography: FC<Record<string, unknown>>;
  export const ZoomableGroup: FC<Record<string, unknown>>;
}
