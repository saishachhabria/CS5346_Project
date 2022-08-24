function Globe(svg, radius) {

    var dragSensitivity = 0.30; // Amount globe moves on drag. Posibly tweak based on size?
    var width = +svg.attr("width");
    var height = +svg.attr("height");

    var projection = d3.geoOrthographic()
        .scale(radius)
        .rotate([0, 0])
        .translate([width / 2, height / 2])
        .clipAngle(90);

    var path = d3.geoPath().projection(projection);

    var dragging = function (d) {
        var rotate = projection.rotate();
        projection.rotate([d3.event.x * dragSensitivity, -d3.event.y * dragSensitivity, rotate[2]]);
        svg.selectAll("path.map").attr("d", path);
    }

    var subject = function (d) {
        var rotate = projection.rotate();
        return { x: rotate[0] / dragSensitivity, y: -rotate[1] / dragSensitivity };
    }

    var drag = d3.drag()
        .subject(subject)
        .on("start", function () {
            d3.event.sourceEvent.stopPropagation(); // silence other listeners
            if (d3.event.sourceEvent.which == 1)
                dragInitiated = true;
        })
        .on("drag", dragging);

    this.draw = function () {
        //Create a container in which all pan-able elements will live
        var map = svg.append("g")
            .call(drag);  //Bind the dragging behavior

        //Create a new, invisible background rect to catch drag events
        map.append("circle")
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("r", radius)
            .attr("class", "map-background")

        map.selectAll("path")
            .data(dataset)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", function (d) {
                return 'map country-' + d.id
            })
            // Event handlers
            .on("mouseover", function (d) {
                if (d.properties.happinessScore) {
                    highlightCountry(d)
                }
            })
            .on("mouseout", function (d) {
                unHighlightCountry(d)
            })
            .on("click", function (d) {
                showCountryInfo(d)
            })

    }

    this.rotateToCentroid = function (centroid) {
        (function transition() {
            d3.transition()
                .duration(1500)
                .tween("rotate", function () {
                    var r = d3.interpolate(projection.rotate(), [-centroid[0], -centroid[1]]);
                    return function (t) {
                        projection.rotate(r(t));
                        svg.selectAll("path.map").attr("d", path)
                    };
                })
        })();
    }

}