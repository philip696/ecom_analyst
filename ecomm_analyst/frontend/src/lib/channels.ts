/**
 * Marketplace channel definitions for filters and integrations.
 * Logos load from the API: GET {NEXT_PUBLIC_API_URL}/marketplace-assets/{slug}.png|svg|webp
 * (files live in backend/app/static/marketplaces/ — see README there).
 */

export type SalesChannelId =
  | "all"
  | "Taobao"
  | "JD"
  | "Shopee"
  | "Temu"
  | "Facebook Marketplace";

export type SalesChannel = {
  id: SalesChannelId;
  label: string;
  color: string;
  emoji: string;
  /** basename under /marketplace-assets/ — null means no file (emoji only) */
  assetSlug: string | null;
};

export const SALES_CHANNELS: SalesChannel[] = [
  { id: "all", label: "All Channels", color: "bg-slate-100 text-slate-700 border-slate-200", emoji: "🌐", assetSlug: null },
  { id: "Taobao", label: "淘宝 Taobao", color: "bg-orange-50 text-orange-600 border-orange-200", emoji: "🛍️", assetSlug: "taobao" },
  { id: "JD", label: "京东 JD", color: "bg-red-50 text-red-600 border-red-200", emoji: "🏪", assetSlug: "jd" },
  { id: "Shopee", label: "Shopee", color: "bg-orange-50 text-orange-500 border-orange-300", emoji: "🟠", assetSlug: "shopee" },
  { id: "Temu", label: "Temu", color: "bg-blue-50 text-blue-600 border-blue-200", emoji: "💰", assetSlug: "temu" },
  {
    id: "Facebook Marketplace",
    label: "Facebook Marketplace",
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    emoji: "📘",
    assetSlug: "facebook_marketplace",
  },
];

export type IntegrationStatus = "connected" | "demo" | "coming_soon";

export type IntegrationMarketplace = {
  name: string;
  emoji: string;
  assetSlug: string | null;
  status: IntegrationStatus;
  color: string;
};

/** Settings / integrations grid (may include channels not in SALES_CHANNELS). */
export const INTEGRATION_MARKETPLACES: IntegrationMarketplace[] = [
  { name: "Shopee", emoji: "🛍️", assetSlug: "shopee", status: "connected", color: "text-orange-500 bg-orange-50" },
  { name: "Taobao", emoji: "🏪", assetSlug: "taobao", status: "connected", color: "text-red-500 bg-red-50" },
  { name: "Temu", emoji: "🎯", assetSlug: "temu", status: "demo", color: "text-blue-500 bg-blue-50" },
  {
    name: "Facebook Marketplace",
    emoji: "📘",
    assetSlug: "facebook_marketplace",
    status: "coming_soon",
    color: "text-indigo-500 bg-indigo-50",
  },
  { name: "JD.com", emoji: "📦", assetSlug: "jd", status: "coming_soon", color: "text-red-600 bg-red-50" },
  { name: "Lazada", emoji: "🏬", assetSlug: "lazada", status: "coming_soon", color: "text-purple-500 bg-purple-50" },
];
