"use strict";

/** Hardcoded Cloudflare production URLs (override via env where documented). */
// Default Workers hostname is <script-name>.<account-subdomain>.workers.dev (see dashboard after deploy).
exports.DEPLOY_WORKER_API_ORIGIN = "https://ecom-analyst.philip-dewanto.workers.dev";
exports.DEPLOY_PAGES_ORIGIN = "https://ecom-analyst.pages.dev";
