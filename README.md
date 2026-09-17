# Homey Zigbee Visualizer

A small local web app that turns a Homey Zigbee network dump into an interactive map
of your mesh: every device, the links between them, and the exact route the
controller uses to reach each one.

## Run it

```bash
npm install
# save your Homey Zigbee dump into data/ first — see below
npm start
```

Then open <http://localhost:3000>. `npm start` picks up the newest dump in `data/`.

Dumps are not kept in this repo: they list every device in your home, its IEEE
address and your network ids, so `data/` is gitignored.

To point at a dump somewhere else:

```bash
node server.js path/to/another_dump.txt
PORT=4000 node server.js       # or pick another port
```

The dump is re-read on every request, so after replacing the file you only need the
**Reload** button in the toolbar.

## Getting a dump out of Homey

Homey Pro → **Settings → Zigbee → (developer page)** and save the JSON payload that
lists `controllerState` and `nodes`. That is exactly the file this tool expects.

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
| Search | Highlights devices matching name, model, manufacturer or address |
| Bindings | Overlays cluster-level bindings (dashed) on top of the routing links |
| Stale routes | Shows routing-table entries whose device is no longer in the node list |
| All labels | Names every device instead of only the controller and routers |
| Layout | *Radial tree* (deterministic, one ring per hop) or *Force mesh* (physics, draggable nodes) |
| Fit | Zooms so the whole network is back in view |
| Reload | Re-reads the dump file from disk |

Scroll to zoom, drag the background to pan.

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
server.js          Express server: static files + /api/network
lib/parse.js       Dump → graph model (nodes, links, paths, stats)
public/            Frontend: index.html, style.css, app.js (D3 v7)
data/              Your Zigbee dumps
```

`GET /api/network` returns the parsed model, so you can also use it as a plain JSON
API from a script.
