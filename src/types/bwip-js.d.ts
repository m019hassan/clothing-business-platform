/**
 * Minimal typings for bwip-js: the package ships conditional exports that the
 * bundler resolver cannot follow from its types entry, and the only API used here
 * is the synchronous SVG renderer.
 */
declare module "bwip-js" {
  export function toSVG(options: {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
    textxalign?: string;
    textsize?: number;
    [key: string]: unknown;
  }): string;

  const bwipjs: { toSVG: typeof toSVG };
  export default bwipjs;
}
