/** Directed bundle edges: matches sales.csv (line product_id → bundled_with target). */
export type DirectedBundleEdge = {
  source_id: number;
  target_id: number;
  source_name: string;
  target_name: string;
  /** Backend product.image_url; may be a path to mount under the API. */
  source_image_url?: string;
  target_image_url?: string;
  count: number;
  revenue: number;
};
