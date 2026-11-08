// The two pieces of n8ao (no types of its own) that aoTransparency.ts patches.
declare module "n8ao" {
  export const DepthType: { Default: number; Log: number; Reverse: number };
  export class N8AOPostPass {
    constructor(...args: unknown[]);
  }
}
