# Homey Zigbee Visualizer

A small local web app that turns a Homey Zigbee network dump into an interactive map
of your mesh: every device, the links between them, and the exact route the
controller uses to reach each one.

## Run it

```bash
npm install
npm start                      # PORT=4000 npm start for another port
```

Then open <http://localhost:3000> and hand it a dump — drop the file on the page, or
paste the JSON straight into the box.

## Hosting it

There is no backend to host: `server.js` only hands out files, so the whole thing is
a static site that runs in the browser. `npm run build` gathers it into `dist/` —
the page, `lib/parse.js` and d3 — and anything that serves a folder will serve it.

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push to
`main`, and can also be run by hand from the Actions tab. One setting has to be
flipped once, before the first run: **Settings → Pages → Build and deployment →
Source → GitHub Actions**. After that the site is at
<https://arvebjoe.github.io/homey-zigbee-visualizer/>.

The page loads its assets by relative path, so it works both at the root (locally)
and under a project subpath (on Pages) without a base-URL setting.

## Getting a dump out of Homey

Homey Pro → **Settings → Zigbee → (developer page)** and save the JSON payload that
lists `controllerState` and `nodes`. That is exactly what this tool expects, as a
`.json` or `.txt` file or as text on your clipboard.

## Your dump stays on your machine

The dump never reaches the server. `npm start` serves nothing but the static page;
the browser reads the file you drop on it, parses it and draws it, and no upload
endpoint exists for it to be posted to. Nothing is written to disk.

**The network key is removed first.** Before the dump is parsed, stored or drawn,
every key that could let someone join or decrypt your mesh — `networkKey` and the
link-key variants — is deleted from it. So a dump you forgot to redact carries its
key no further than the drop zone: not into the stored copy, not into the panel, not
into a screenshot you send someone.

Everything else in a dump is still your device inventory and IEEE addresses, so
treat it accordingly.

## Keeping a dump between visits

**Remember in this browser** (on by default) keeps the stripped dump in this
browser's `localStorage`, so reopening the page brings your network straight back.
It is per-browser and per-machine: it is not synced, not shared between browsers,
and never sent anywhere. Untick it to keep the dump for this tab only, or use
**Forget stored dump** to clear it.

Dumps in `data/` are gitignored, so anything you keep next to the repo stays out
of git.

## What you see

**The graph.** The controller sits in the middle, and every ring outward is one more
hop. Colour encodes the hop count, shape encodes the role: a star for the
controller, squares for routers (mains-powered devices that forward traffic) and
circles for end devices (usually battery-powered, they never relay). Node size grows
with the number of devices that depend on that node as a relay, so the workhorses of
your mesh stand out.

**Link quality is the colour of every line**: green links get 95%+ of their frames
through on the first try, red links under 70%. Line thickness is traffic volume, so a
thick red line is a real problem and a thin red one is a device that barely talks.
Devices whose own uplink is weak or bad also get a coloured halo, so trouble spots are
visible without reading a label. Hover any link for the exact numbers. With nothing
selected, the side panel lists every hop ranked worst first.

**Click any node** to open its detail panel: the full path back to the controller,
the quality of its link to its parent and of the links to each of its children,
identity and firmware, raw radio counters, capabilities, endpoint clusters and
bindings. The route is highlighted in the graph
at the same time, and everything else fades back. Click a hop in the route list to
jump to that device. `Esc` or a click on the background clears the selection.

**Toolbar.**

| Control | What it does |
| --- | --- |
| Weak links | Count of hops graded weak or bad — the headline health number |
| Search | Picks out devices matching name, model, manufacturer or address, and fades the rest of the mesh back |
| Bindings | Overlays cluster-level bindings (dashed) on top of the routing links |
| Stale routes | Shows routing-table entries whose device is no longer in the node list |
| All labels | Names every device instead of only the controller and routers |
| Layout | *Radial tree* (deterministic, one ring per hop, with guide rings) or *Force mesh* (physics, draggable nodes, no rings) |
| Fit | Zooms so the whole network is back in view |
| Load… | Next to the title — opens the drop zone again, to swap in another dump |

Scroll to zoom, drag the background to pan. Dragging a dump anywhere over the window
opens the drop zone, so swapping dumps never needs the toolbar.

## How link quality is measured

The dump carries no LQI or RSSI, so quality is derived from the TX counters each
device reports (`tx`, `txSuccess`, `txError`). Because every device has exactly one
parent relay, its success rate describes the link to that parent:

| Grade | TX success | Meaning |
| --- | --- | --- |
| Good | 95%+ | Frames get through first time |
| Fair | 85–95% | Some retrying |
| Weak | 70–85% | Retrying often — worth looking at |
| Bad | under 70% | Most frames need retries; expect lag and dropouts |
| Unknown | fewer than 30 transmissions | Not enough traffic to judge |

Two caveats worth keeping in mind:

- A **router's** counters also include the traffic it forwards to its own children, so
  read a router's grade as "this branch is struggling" rather than one exact hop.
- The counters are **cumulative since the controller last started**. A device that had
  a bad week and was then moved closer still carries the old failures in its average.

Those caveats aside, the numbers line up with physical reality: in a real network a
lamp far from the controller scored 64% while one sitting next to it scored 99% — and
the distant one still relayed for 11 devices at 94–99% each, the signature of a
well-placed relay with a long haul back to the controller.

## How the topology is derived

The dump has no neighbour/LQI table, but `controllerState.routes` gives, for every
network address, the ordered list of relays the controller routes through. Those
lists are prefix-consistent — the route to a relay is always the route of the device
behind it minus the last hop — so walking each route and connecting consecutive hops
rebuilds the whole tree. A device with an empty route array is a direct child of the
controller.

Two things worth knowing about real dumps:

- **Stale entries.** Routes sometimes point at network addresses that are no longer
  in `nodes` (a device that left or re-joined with a new address). They are drawn as
  dashed grey circles and counted separately as "stale".
- **Devices with no route.** A device present in `nodes` but absent from the routing
  table has not been routed to since the controller last started. It is drawn just
  outside the last ring and flagged "no route" in its panel.

## Layout

```
server.js          Express: hands out the static files, and nothing else
build.js           Gathers the same files into dist/ for deployment
lib/parse.js       Dump → graph model (nodes, links, paths, stats), plus the
                   secret-stripping. Runs in the browser and under Node.
public/            Frontend: index.html, style.css, app.js (D3 v7)
data/              Your Zigbee dumps, if you keep them here (gitignored)
dist/              Build output (gitignored)
.github/workflows/ deploy.yml — build and publish to GitHub Pages
```

There is no API: `lib/parse.js` is loaded straight into the page, so the parsing and
the stripping happen in the browser. It also still works as a Node module if you want
the graph model in a script:

```js
const { parseDump, stripSecrets } = require('./lib/parse');
const dump = JSON.parse(fs.readFileSync('data/zigbee_dump.txt', 'utf8'));
stripSecrets(dump);            // returns the names of the keys it removed
const graph = parseDump(dump);
```
