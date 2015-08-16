function newGraph (selector, width, height) {
    var links = []
    var nodes = {}
    var svg = null;

    function addNode(nodeName) {
	nodes[nodeName] = {name: nodeName}
    }

    function addEdge(from, to, label) {
	link = {source: nodes[from], target: nodes[to], type: (label || 'suit')}
	// For some reason, links.push(link) results in some numeric properties being
	// converted to NaN. No idea why.
	links = links.concat([link])
    }

    function plotGraph (svg, vertices, edges) {
	svg.html("")

	var force = d3.layout.force()
	    .nodes(d3.values(vertices))
	    .links(edges)
	    .size([width, height])
	    .linkDistance(60)
	    .charge(-300)
	    .on("tick", tick)
	    .start();

	// Per-type markers, as they don't inherit styles.
	svg.append("defs").selectAll("marker")
	    .data(["suit", "licensing", "resolved"])
	    .enter().append("marker")
	    .attr("id", function(d) { return d; })
	    .attr("viewBox", "0 -5 10 10")
	    .attr("refX", 15)
	    .attr("refY", -1.5)
	    .attr("markerWidth", 5)
	    .attr("markerHeight", 5)
	    .attr("orient", "auto")
	    .append("path")
	    .attr("d", "M0,-5L10,0L0,5");

	var path = svg.append("g").selectAll("path")
	    .data(force.links())
	    .enter().append("path")
	    .attr("class", function(d) { return "link " + d.type; })
	    .attr("marker-end", function(d) { return "url(#" + d.type + ")"; });

	var circle = svg.append("g").selectAll("circle")
	    .data(force.nodes())
	    .enter().append("circle")
	    .attr("r", 6)
	    .call(force.drag);

	var text = svg.append("g").selectAll("text")
	    .data(force.nodes())
	    .enter().append("text")
	    .attr("x", 8)
	    .attr("y", ".31em")
	    .text(function(d) { return d.name; });

	// Use elliptical arc path segments to doubly-encode directionality.
	function tick() {
	    path.attr("d", linkArc);
	    circle.attr("transform", transform);
	    text.attr("transform", transform);
	}

	function linkArc(d) {
	    var dx = d.target.x - d.source.x,
	    dy = d.target.y - d.source.y,
	    dr = Math.sqrt(dx * dx + dy * dy);
	    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
	}

	function transform(d) {
	    return "translate(" + d.x + "," + d.y + ")";
	}
    }

    svg = d3.select(selector).append("svg")
	.attr("width", width)
	.attr("height", height);

    function refresh() {
	plotGraph(svg, nodes, links)
    }

    return {
	// insert :: [String] -> [{from, to, label?}] -> Map String String -> IO ()
	insert: function (nodeNames, edges, data) {
	    nodeNames.forEach(addNode)
	    edges.forEach(function (e) {
		addEdge(e.from, e.to, e.label)
	    });
	    refresh()
	},
	// refresh :: () -> IO ()
	refresh: refresh,
    }
}

function eventSource (uri, bindings) {
    var stream = new EventSource(uri)
    stream.onopen = function (e) { console.log("Stream OPENED!")}
    stream.onerror = function (e) { console.log("Stream ERRORED!")}
    stream.onmessage = function (e) {
	var res = e.data
	var callback = bindings[res.action]
	if (callback) {
	    callback(res)
	} else {
	    console.log("UNHANDLED MESSAGE", res);
	}
    }
    return stream;
}

var g = null;

document.addEventListener("DOMContentLoaded", function () {
    g = newGraph("body", 1280, 800)
})
