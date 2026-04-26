/**
 * Rewrite demo user's password to pbkdf2_sha256 for the Worker bundle (pure JS, no sqlite3 CLI / no Python _sqlite3).
 *
 * Usage (from cloudflare-worker/): node scripts/rehash-demo-password-sqljs.mjs [path/to.db]
 * Default DB path: ./src/ecommerce.db
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
fs.writeFileSync(dbPath, Buffer.from(db.export()));
console.log("rehash-demo-password-sqljs: updated demo@example.com for worker");
