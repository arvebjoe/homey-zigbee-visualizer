'use strict';

const express = require('express');
const path = require('path');

const port = Number(process.env.PORT || 3000);

// The dump never reaches this process: the browser reads the file you drop on
// it, strips the secrets, parses it and keeps it in localStorage. All the
// server does is hand out the static app, so there is no upload endpoint and
// nothing is ever written to disk.
const app = express();

app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'd3', 'dist')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
  console.log(`Zigbee visualizer running at http://localhost:${port}`);
});
