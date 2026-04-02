const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const pool = new Pool(config.db);

async function runMigrations() {
  const sql = fs.readFileSync(path.resolve(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
}

module.exports = {
  pool,
  runMigrations
};
