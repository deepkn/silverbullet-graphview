import { editor, space, system } from "@silverbulletmd/silverbullet/syscalls";
import { asset } from "@silverbulletmd/silverbullet/syscalls";
import { StateProvider } from "stateprovider";
import { ColorMap, ColorMapBuilder } from "colormap";
import type { SpaceGraph } from "./model.ts";
import { readGraphviewSettings } from "utils";
import { GraphIgnore } from "graphignore";

const stateProvider = new StateProvider("showGraphView");
const localStateProvider = new StateProvider("showLocalGraphView");
const colorMapBuilder = new ColorMapBuilder();

// Toggle Graph View and sync state
export async function toggleGraphView() {
  await stateProvider.toggleGraphViewStatus();
  await localStateProvider.setGraphViewStatus(false); // Ensure local is off
  if (await stateProvider.getGraphViewStatus()) {
    const name = await editor.getCurrentPage();
    await renderGraph(name, false);
  } else {
    await editor.hidePanel("lhs");
  }
}

// Toggle Local Graph View and sync state
export async function toggleLocalGraphView() {
  await localStateProvider.toggleGraphViewStatus();
  await stateProvider.setGraphViewStatus(false); // Ensure global is off
  if (await localStateProvider.getGraphViewStatus()) {
    const name = await editor.getCurrentPage();
    await renderGraph(name, true);
  } else {
    await editor.hidePanel("lhs");
  }
}

// if something changes, redraw
export async function updateGraphView() {
  const name = await editor.getCurrentPage();
  const isLocalMode = await localStateProvider.getGraphViewStatus();
  const isGlobalMode = await stateProvider.getGraphViewStatus();
  
  if (isLocalMode) {
    await renderGraph(name, true);
  } else if (isGlobalMode) {
    await renderGraph(name, false);
  }
}

// render function into the LHS-Panel
async function renderGraph(page: any, isLocalMode: boolean = false) {
  // https://github.com/d3/d3-force
  const graph = await buildGraph(page);
  const graph_json = JSON.stringify(graph);
  const css = await asset.readAsset("graphview", "assets/style.css", "utf8");
  const d3js = await asset.readAsset("graphview", "assets/d3.js", "utf8");
  const d3forcejs = await asset.readAsset("graphview", "assets/d3-force.js", "utf8");
  const d3forcegraph = await asset.readAsset(
    "graphview",
    "assets/force-graph.js",
    "utf8",
  );
  const graphfns = await script(graph_json, page, isLocalMode);
  const panelStatus = isLocalMode ? await localStateProvider.getGraphViewStatus() : await stateProvider.getGraphViewStatus();
  
  if (panelStatus) {
    const expandButton = isLocalMode ? `
      <div id="local-graph-controls" style="position: absolute; top: 10px; right: 10px; z-index: 1000;">
        <button id="expand-btn" onclick="expandGraph()" style="padding: 8px 12px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-bottom: 5px; display: block; width: 100%;">Expand</button>
        <button id="reset-btn" onclick="resetLocalGraph()" style="padding: 6px 12px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; margin-bottom: 5px; display: block; width: 100%;">Reset</button>
        <div id="level-indicator" style="background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-align: center;">Level: 1</div>
      </div>` : '';
    await editor.showPanel(
      "lhs",
      1, // panel flex property
      `<html>
        <head>
          <style>${css}</style>
        </head>
        <body>
          ${expandButton}
          <div id="graph"></div>
        </body>
      </html>`,
      `
       ${d3js}
       ${d3forcejs}
       ${d3forcegraph}
       ${graphfns}
      `, // Script (java script as string)
    );
  }
}

// Embed script
async function script(graph: any, currentPage: string, isLocalMode: boolean = false) {
  return `
    const fullGraph = ${graph};
    const currentPage = "${currentPage}";
    const isLocalMode = ${isLocalMode};
    let expansionLevel = 1; // Start with immediate neighbors only
    let visibleGraph = fullGraph;

    console.log('Graph loaded - Nodes: ', fullGraph.nodes.length, 'Links: ', fullGraph.links.length, 'Current page:', currentPage, 'Local mode:', isLocalMode);

    const graph_div = document.querySelector('#graph');
    
    let chart;
    
    // Function to get neighbors at a specific distance
    function getNeighborsAtDistance(nodeId, distance, nodes, links) {
      // Check if the center node exists in the graph
      const centerNodeExists = nodes.some(node => node.id === nodeId);
      if (!centerNodeExists) {
        console.warn('Center node not found in graph:', nodeId);
        return []; // Return empty if center node doesn't exist
      }
      
      let currentLevel = new Set([nodeId]);
      let allNeighbors = new Set([nodeId]);
      
      for (let level = 0; level < distance; level++) {
        let nextLevel = new Set();
        for (let node of currentLevel) {
          // Find all directly connected nodes (bidirectional)
          links.forEach(link => {
            if (link.source === node && !allNeighbors.has(link.target)) {
              nextLevel.add(link.target);
              allNeighbors.add(link.target);
            }
            if (link.target === node && !allNeighbors.has(link.source)) {
              nextLevel.add(link.source);
              allNeighbors.add(link.source);
            }
          });
        }
        currentLevel = nextLevel;
        if (currentLevel.size === 0) break; // No more neighbors to expand
      }
      
      return Array.from(allNeighbors);
    }
    
    // Function to filter graph for local view
    function getLocalGraph(centerNode, level) {
      if (!isLocalMode) return fullGraph;
      
      const visibleNodeIds = getNeighborsAtDistance(centerNode, level, fullGraph.nodes, fullGraph.links);
      
      // If no nodes found (e.g., isolated node or non-existent node), show at least the center node
      if (visibleNodeIds.length === 0) {
        const centerNodeExists = fullGraph.nodes.some(node => node.id === centerNode);
        if (centerNodeExists) {
          visibleNodeIds.push(centerNode);
        }
      }
      
      const visibleNodes = fullGraph.nodes.filter(node => visibleNodeIds.includes(node.id));
      const visibleLinks = fullGraph.links.filter(link => 
        visibleNodeIds.includes(link.source) && visibleNodeIds.includes(link.target)
      );
      
      return { nodes: visibleNodes, links: visibleLinks };
    }
    
    // Function to reset local graph to initial state
    function resetLocalGraph() {
      if (!isLocalMode) return;
      expansionLevel = 1;
      
      // Update level indicator
      const levelIndicator = document.getElementById('level-indicator');
      if (levelIndicator) {
        levelIndicator.textContent = \`Level: \${expansionLevel}\`;
      }
      
      visibleGraph = getLocalGraph(currentPage, expansionLevel);
      createChart();
    }
    
    // Function to expand the local graph
    function expandGraph() {
      if (!isLocalMode) return;
      expansionLevel++;
      
      // Update level indicator
      const levelIndicator = document.getElementById('level-indicator');
      if (levelIndicator) {
        levelIndicator.textContent = \`Level: \${expansionLevel}\`;
      }
      
      visibleGraph = getLocalGraph(currentPage, expansionLevel);
      createChart();
    }
    
    // Make functions globally available
    window.expandGraph = expandGraph;
    window.resetLocalGraph = resetLocalGraph;
    
    function createChart() {
      // Remove the existing chart object from the DOM
      graph_div.innerHTML = '';
      
      // Use visible graph in local mode, full graph otherwise
      const graphToRender = isLocalMode ? getLocalGraph(currentPage, expansionLevel) : fullGraph;

      // In local mode, enhance the center node to make it stand out
      if (isLocalMode) {
        graphToRender.nodes.forEach(node => {
          if (node.id === currentPage) {
            node.isCenter = true;
          }
        });
      }
    
      // Create a new chart object with the updated dimensions
      chart = ForceGraph(graphToRender, {
        nodeId: d => d.id,
        nodeTitle: d => d.id,
        nodeStrokeOpacity: 0.75,
        height: window.innerHeight,
        width: window.innerWidth,
      });
    
      // Add the new chart object to the DOM
      graph_div.appendChild(chart);
    }
    
    // Initialize the graph
    if (isLocalMode) {
      visibleGraph = getLocalGraph(currentPage, expansionLevel);
    }
    createChart();

    function handleResize() {
      // Check if the dimensions have actually changed
      if (window.innerHeight-10 !== chart.height || window.innerWidth-10 !== chart.width) {
        // Recreate/redraw the chart object
        createChart();
      }
    }
        
    let timeout = false;
    // Add an event listener to the window object that listens for the resize event
    window.addEventListener('resize', () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleResize, 250);
    });
  `;
}

// Build a SpaceGraph object from the current space
async function buildGraph(name: string): Promise<SpaceGraph> {
    // Get all pages in space
  const pages = await system.invokeFunction("index.queryLuaObjects", "page", {});
  const graphignore = new GraphIgnore();
  await graphignore.init(pages);
  const nodeNames = pages
    .filter(graphignore.pagefilter.bind(graphignore))
    .map(({ name }) => {
      return name;
    });

  // NOTE: This may result to the same link showing multiple times
  //       if the same page has multiple references to another page.
  const pageLinks = await system.invokeFunction("index.queryLuaObjects", "link", {});
  const links = pageLinks
    .filter(graphignore.linkfilter.bind(graphignore))
    .map((link) => {
      var linktarget = link.toPage;
      if (link.hasOwnProperty("toPage") && !nodeNames.includes(link.toPage)) {
        // Add nodes for non-existing pages which are linked to
        nodeNames.push(link.toPage);
      } else if (link.hasOwnProperty("toFile")) {
	      // Link to a file - add a corresponding node to the graph.
        nodeNames.push(link.toFile);
        linktarget = link.toFile;
      }
      return { "source": link.page, "target": linktarget };
    });

  const darkmode = await stateProvider.darkMode();
  await colorMapBuilder.init(pages, darkmode);
  const colors: ColorMap[] = colorMapBuilder.build();
  const default_color = await readGraphviewSettings("default_color");

  const builtin_default_color = darkmode ? "bfbfbf" : "000000";
  const nodes = nodeNames.map((name) => {
    // if page in colors → map color code to page name
    let color = default_color ? default_color : builtin_default_color;
    if (colors.find((c) => c.page === name)) {
      color = colors.find((c) => c.page === name)!.color;
    }
    return { "id": name, "color": color };
  });

  return { "nodes": nodes, "links": links };
}
