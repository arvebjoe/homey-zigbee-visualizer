'use strict';

/**
 * Assembles the static site into dist/.
 *
 * The app has no backend — server.js only hands out files — so "building" is
 * just gathering the three things index.html asks for into one tree:
 *
 *   dist/            <- public/            the page, its styles and its script
 *   dist/lib/        <- lib/               the parser, shared with Node
 *   dist/vendor/     <- node_modules/d3    d3, the one dependency the page has
 *
 * That is the same shape server.js serves locally, so what you see on
 * localhost and what gets deployed cannot drift apart.
 */

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'dist');
const D3 = path.join(__dirname, 'node_modules', 'd3', 'dist', 'd3.min.js');

if (!fs.existsSync(D3)) {
  console.error('d3 is not installed — run `npm install` first.');
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'lib'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'vendor'), { recursive: true });

fs.cpSync(path.join(__dirname, 'public'), OUT, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'lib', 'parse.js'), path.join(OUT, 'lib', 'parse.js'));
fs.copyFileSync(D3, path.join(OUT, 'vendor', 'd3.min.js'));

// Only matters if the site is ever published from a branch instead of from the
// Actions artifact, but it costs nothing to keep Jekyll out of the way.
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const bytes = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .reduce((sum, e) => sum + (e.isDirectory()
    ? bytes(path.join(dir, e.name))
    : fs.statSync(path.join(dir, e.name)).size), 0);

console.log(`Built dist/ — ${(bytes(OUT) / 1024).toFixed(0)} kB`);
