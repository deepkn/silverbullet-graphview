//
// Settings added by Willem Hendriks
// (!) to be added to yaml or other settings config
//
//
// LABEL SETTINGS
const LABEL_MARGIN = 22; // margin between label-text and node, higher number -> more space
const LABEL_VISIBILITY_START_K = 1.5; // at this k, labels are still invisible
const LABEL_VISIBILITY_END_K = 5; // at this k, labels are fully visible
const LABEL_TRUNCATION_LENGTH = 20; // max length of word in label

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/disjoint-force-directed-graph
function ForceGraph({
  nodes, // an iterable of node objects (typically [{id}, …])
  links // an iterable of link objects (typically [{source, target}, …])
}, {
  nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
  nodeGroup, // given d in nodes, returns an (ordinal) value for color
  nodeGroups, // an array of ordinal values representing the node groups
  nodeTitle, // given d in nodes, a title string
  nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
  nodeStroke = "#fff", // node stroke color
  nodeStrokeWidth = 1.5, // node stroke width, in pixels
  nodeStrokeOpacity = 1, // node stroke opacity
  nodeStrength,
  linkSource = ({ source }) => source, // given d in links, returns a node identifier string
  linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
  linkStroke = "#999", // link stroke color
  linkStrokeOpacity = 0.6, // link stroke opacity
  linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
  linkStrokeLinecap = "round", // link stroke linecap
  linkStrength,
  colors = d3.schemeTableau10, // an array of color strings, for the node groups
  width = 640, // outer width, in pixels
  height = 400, // outer height, in pixels
  invalidation // when this promise resolves, stop the simulation
} = {}) {
  // Compute values.

  const N = d3.map(nodes, nodeId).map(intern);
  const C = d3.map(nodes, nodeConnectivity.bind(null, links));
  const COL = d3.map(nodes, d => d.color).map(intern);
  const CENTER = d3.map(nodes, d => d.isCenter || false);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_, i) => N[i];
  const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W = typeof linkStrokeWidth !== "function" ? null : d3.map(links, linkStrokeWidth);

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (_, i) => ({ id: N[i], connectivity: C[i], color: COL[i], isCenter: CENTER[i] }));
  links = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }));

  // Compute node connectivity
  function isConnecting(node, link) {
    return link.source == node.id || link.target == node.id;
  }

  function nodeConnectivity(links, node) {
    return links.reduce((acc, currentLink) => {
      return acc + (isConnecting(node, currentLink) ? 1 : 0);
    }, 0);
  }

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);
  var zoomLevel = 1;

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3.forceLink(links).id(({ index: i }) => N[i]);
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  const link = svg.append("g")
    .attr("stroke", linkStroke)
    .attr("stroke-opacity", linkStrokeOpacity)
    .attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
    .attr("stroke-linecap", linkStrokeLinecap)
    .selectAll("line")
    .data(links)
    .join("line");

  if (W) link.attr("stroke-width", ({ index: i }) => W[i]);

  // Scales for node size based on connectivity
  const nodeSizeScale = d3.scaleLinear()
    .domain([d3.min(C), d3.max(C)])
    .range([3, 12]);

  // scales for label size based on connectivity
  const labelSizeScale = d3.scaleLinear()
    .domain([d3.min(C), d3.max(C)])
    .range([0.6, 1.2]);

  const node = svg.append("g")
    .attr("stroke-opacity", nodeStrokeOpacity)
    .attr("stroke-width", nodeStrokeWidth)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", d => d.isCenter ? nodeSizeScale(d.connectivity) * 1.5 : nodeSizeScale(d.connectivity))
    .attr("stroke", d => d.isCenter ? "#d20103" : `#${d.color}`)
    .attr("stroke-width", d => d.isCenter ? 3 : nodeStrokeWidth)
    .attr("fill", d => `#${d.color}`)
    .on('mouseenter', mouseEnter)
    .on('mouseleave', mouseLeave)
    .on('click', function (event, d) {
      syscall('event.dispatch','graphview:navigateTo', d.id);
    });

  const labels = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .join('text')
    .text(d => {
      const id = "" + d.id;
      if (id.length < LABEL_TRUNCATION_LENGTH) return id
      else {
        const split = id.split('/')
        const last_element = split.pop()
        const result = split.map((e, i) => {
          return [...e].slice(0, Math.min(5, [...e].length)).join('');
        })
        result.push(last_element);
        return result.join('./');
      }
    })
    .attr('font-family', 'Sans,Arial')
    .attr('font-size', d => d.isCenter ? `${labelSizeScale(d.connectivity) * 1.2}em` : `${labelSizeScale(d.connectivity)}em`)
    .attr('font-weight', d => d.isCenter ? 'bold' : 'normal')
    .attr('fill', d => d.isCenter ? "#d20103" : `#${d.color}`)
    .attr('text-anchor', 'middle')
    .attr('class', 'svgtext')
    .on('click', function (event, d) {
      syscall('event.dispatch','graphview:navigateTo', d.id);
    });

  if (G) node.attr("fill", ({ index: i }) => color(G[i]));
  if (T) node.append("title").text(({ index: i }) => T[i]);

  // Handle invalidation.
  if (invalidation != null) invalidation.then(() => simulation.stop());

  function intern(value) {
    return value !== null && typeof value === "object" ? value.valueOf() : value;
  }

  const simulation = d3.forceSimulation(nodes)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .on("tick", ticked)
    .stop(); // Don't start the simulation automatically.

  // Note: This manual drawing of the simulation is necessary to fix broken zooming in the first seconds
  // of the page load while the simulation is running.
  simulation.tick(300); // Run the simulation for 300 ticks, but without drawing.
  ticked(); // Draw once after the simulation has stabilized.

  function ticked() {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    labels
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  }

  // Zoom
  function resizeNode(d, k) {
    // TODO: Make sure d has some information on the connectedness of a
    // node so that we can vary node sizes based on that.
    const baseSize = nodeSizeScale(d.connectivity);
    const centerMultiplier = d.isCenter ? 1.5 : 1;
    const min = baseSize * centerMultiplier;
    const cur = baseSize * centerMultiplier * Math.log(k);
    return Math.max(min, cur);
  }

  function mouseEnter(event, d) {
    // Get the subgraph for the node
    const subgraph = node_neighbors(d.id, nodes, links);

    const fadedStrokeOpacity = 0.2;

    // fade everything
    node.attr("stroke-opacity", fadedStrokeOpacity);
    node.attr("fill-opacity", fadedStrokeOpacity);
    link.attr("stroke-opacity", fadedStrokeOpacity);
    labels.attr("opacity", Math.min(fadedStrokeOpacity, opacity_activation(zoomLevel)));

    // Only highlight the subgraph.
    node
      .filter(n => subgraph.nodes.indexOf(n.index) > -1)
      .attr("stroke-opacity", nodeStrokeOpacity)
      .attr("fill-opacity", nodeStrokeOpacity)
    link
      .filter(l => subgraph.links.indexOf(l.index) > -1)
      .attr("stroke-opacity", linkStrokeOpacity);
    labels
      .filter(n => subgraph.nodes.indexOf(n.index) > -1)
      .attr("opacity", nodeStrokeOpacity);
  }

  function mouseLeave(event, d) {
    node.attr("stroke-opacity", nodeStrokeOpacity);
    node.attr("fill-opacity", nodeStrokeOpacity);
    link.attr("stroke-opacity", linkStrokeOpacity);
    labels.attr("opacity", opacity_activation(zoomLevel));
  }

  function zoomed(event) {
    const t = event.transform;
    zoomLevel = event.transform.k;
    const translate = "translate(" + t.x + "," + t.y + ")"
    node
      .attr("cx", d => d.x * t.k)
      .attr("cy", d => d.y * t.k)
      .attr("r", d => resizeNode(d, t.k))
      .attr('transform', translate);
    link
      .attr("x1", d => d.source.x * t.k)
      .attr("y1", d => d.source.y * t.k)
      .attr("x2", d => d.target.x * t.k)
      .attr("y2", d => d.target.y * t.k)
      .attr('transform', translate);
    labels
      .attr('transform', translate)
      .attr('x', d => d.x * t.k)
      .attr('y', d => d.y * t.k + LABEL_MARGIN + resizeNode(d, t.k))
      .attr('opacity', opacity_activation(event.transform.k));

  }

  const zoom = d3.zoom()
    .scaleExtent([1 / 2, 64])
    .on("zoom", zoomed);

  svg.call(zoom)
    .call(zoom.translateTo, 0, 0);


  return Object.assign(svg.node(), { scales: { color } });
}


function opacity_activation(zoom_level) {
  /* Summary: returns opacity value, depending on zoom level k
   *
   * opacity is a value betwen [0,1] where 0 is invisible
   *
   * Description: A linear opacity activation function.
   * - for LABEL_VISIBILITY_START_K (and below) -> 0 (invisible)
   * - for LABEL_VISIBILITY_END_K (and above) -> 1 (fully visible)
   * - between: linear
   *
   *  ASCII are of activation function: ____/----
   *
   */

  if (zoom_level <= LABEL_VISIBILITY_START_K) {
    return 0;
  }
  if (zoom_level >= LABEL_VISIBILITY_END_K) {
    return 1;
  }

  const linear_opacity = (zoom_level - LABEL_VISIBILITY_START_K) / (LABEL_VISIBILITY_END_K - LABEL_VISIBILITY_START_K);

  return linear_opacity;
}

function node_neighbors(nodeId, nodes, links) {
  // Get the links for the given 'nodeId'.
  const newlinks = links.filter(link => link.source.id === nodeId);

  // Get the linked nodes to 'nodeId' from the filtered links.
  var newnodes = newlinks.map(link => nodes.find(newnode => newnode.id === link.target.id));
  newnodes.push(nodes.find(node => node.id === nodeId));

  return {
    nodes: newnodes.map(node => node.index),
    links: newlinks.map(link => link.index)
  };
}
