'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { parseDump } = require('./lib/parse');

const DATA_DIR = path.join(__dirname, 'data');
const port = Number(process.env.PORT || 3000);

/** An explicit path wins; otherwise pick the newest dump sitting in data/. */
function resolveDump() {
  const explicit = process.argv[2] || process.env.ZIGBEE_DUMP;
  if (explicit) return path.resolve(explicit);
  if (!fs.existsSync(DATA_DIR)) return null;
  const candidates = fs.readdirSync(DATA_DIR)
    .filter((name) => /\.(txt|json)$/i.test(name))
    .map((name) => path.join(DATA_DIR, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0] || null;
}

const dumpPath = resolveDump();

if (!dumpPath || !fs.existsSync(dumpPath)) {
  console.error(dumpPath
    ? `Dump file not found: ${dumpPath}`
    : 'No Zigbee dump found in data/.');
  console.error('Save your Homey Zigbee dump into data/, or point at one directly:');
  console.error('  node server.js path/to/zigbee_dump.txt');
  process.exit(1);
}

const app = express();

app.get('/api/network', (req, res) => {
  try {
    // Read on every request so editing/replacing the dump only needs a reload.
    const graph = parseDump(fs.readFileSync(dumpPath, 'utf8'));
    graph.meta.source = path.basename(dumpPath);
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: `Failed to parse dump: ${err.message}` });
  }
});

app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'd3', 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Zigbee visualizer running at http://localhost:${port}`);
  console.log(`Serving dump: ${dumpPath}`);
});
