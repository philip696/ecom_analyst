/**
 * Prepare bundled SQLite for the Python Worker:
 * 1) pbkdf2 hash for demo@example.com / demo1234 (no bcrypt in Pyodide)
 * 2) Trim rows so the .db blob is smaller in the gzip bundle (free tier is tight)
 *
 * Usage (from cloudflare-worker/): node scripts/prepare-worker-sqlite.mjs [path/to.db]
 * Default: ./src/ecommerce.db
 *
 * Regenerate DEMO_HASH if you change the demo password:
 *   python3 -c "from passlib.context import CryptContext as C; c=C(schemes=['pbkdf2_sha256'],deprecated='auto'); print(c.hash('YOUR_PLAIN'))"
 */
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(__dirname, "..");
const dbPath = path.resolve(
  process.argv[2] ?? path.join(workerRoot, "src", "ecommerce.db"),
);
const wasmDir = path.join(workerRoot, "node_modules", "sql.js", "dist");

/** Keep this many products (by lowest id) so dashboards still look populated. */
const KEEP_PRODUCTS = 35;

const DEMO_HASH =
  "$pbkdf2-sha256$29000$E0LofW8NgbA2ptRai5HS.g$Q2bCxS9/m/lrdJExBAXUY0KbDf9mVVLh2YOSVRxIXrI";

const SQL = await initSqlJs({
  locateFile: (file) => path.join(wasmDir, file),
});

const buf = fs.readFileSync(dbPath);
const db = new SQL.Database(buf);

db.run("UPDATE users SET hashed_password = ? WHERE email = ?", [
  DEMO_HASH,
  "demo@example.com",
]);

db.run("DELETE FROM ai_insight_logs");
db.run("DELETE FROM competitor_prices");
db.run("DELETE FROM comments");
db.run("DELETE FROM engagement_metrics");
db.run("DELETE FROM sales_records");
db.run(
  `DELETE FROM products WHERE id NOT IN (
     SELECT id FROM (SELECT id FROM products ORDER BY id LIMIT ${KEEP_PRODUCTS})
   )`,
);
db.run("VACUUM");

fs.writeFileSync(dbPath, Buffer.from(db.export()));
const kb = (fs.statSync(dbPath).size / 1024).toFixed(1);
console.log(`prepare-worker-sqlite: demo password + trim DB → ${kb} KiB`);
