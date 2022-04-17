function StackedBarChart(svg, innerRadius) {

    var self = this;

    self.svg - svg;
    self.width = +svg.attr("width");
    self.height = +svg.attr("height");
    self.outerRadius = Math.min(self.width, self.height) * 0.35;
    self.data = [];
    self.filters = [];

    self.g = svg.append("g").attr("transform", "translate(" + self.width / 2 + "," + self.height * 0.5 + ")");

    self.x = d3.scaleBand()
        .range([0, 2 * Math.PI])
        .align(0);

    self.y = d3.scaleRadial()
        .range([innerRadius, self.outerRadius]);

    self.z = d3.scaleOrdinal()
        .range(["color-1", "color-2", "color-3", "color-4", 'color-5', "color-6", "color-7", "color-8"]);

    this.addLegend = function () {
        d3.select("#legend").selectAll("div")
            .data(self.z.domain())
            .enter()
            .append("div")
            .attr("class", function (d) {
                return self.z(d);
            })
            .html(function (d) {
                return '<label class="container selected">' + d + '<span class="checkmark"></span></label>'
            })
            .on("click", function (d) {
                var countSelected = d3.selectAll('label.selected').size()
                var label = d3.select(this).select('label')
                var select = !label.classed("selected")
                // Don't alow all the options to be completely deselected
                // if (countSelected > 1 || select) {
                label.classed("selected", select)
                select ? self.removeFilter(d) : self.addFilter(d)
                // }

            })
    }

    this.labelDegrees = function (label) {
        return ((self.x(label) + self.x.bandwidth() / 2) * 180 / Math.PI - 90)
    }

    this.draw = function () {
        // Format dataset into the object expected by d3 radial scale
        self.data.columns = dataset.explainedByColumns;
        dataset.forEach(function (d) {
            if (typeof (d.properties['happinessScore']) !== 'undefined') {
                var obj = d.properties;
                // Ensure sum of all explainedCols match the total happiness score
                // If not, normalise the values
                if (obj['explainedByTotal'] != obj['happinessScore']) {
                    var diferential = d.properties['happinessScore'] / obj['explainedByTotal']
                    self.data.columns.forEach(function (column) {
                        obj[column] *= diferential
                    });
                }
                obj['id'] = d.id;
                self.data.push(obj)
            }
        });

        self.data.sort(function (a, b) {
            return d3.descending(a.happinessScore, b.happinessScore)
        });

        self.x.domain(self.data.map(function (d) { return d['name']; }));

        self.y.domain([0, d3.max(self.data, function (d) { return d.happinessScore; })]);

        self.z.domain(self.data.columns);

        var stack = d3.stack()
            .keys(self.data.columns)

        self.addLegend();

        self.g.selectAll("g.bar-group")
            .data(stack(self.data))
            .enter().append("g")
            .attr("class", function (d) {
                return 'bar-group ' + self.z(d.key)
            })
            .selectAll("path.bar")
            .data(function (d) { return d; })
            .enter().append("path")
            .attr("class", function (d) {
                return 'bar country-' + d.data.id;
            })
            .on("mouseover", function (d) {
                rotateMapToCentroid(d.data.centroid)
                highlightCountry(d.data)
            })
            .on("mouseout", function (d) {
                unHighlightCountry(d.data)
            })
            .attr("d", d3.arc()
                .innerRadius(function (d) {
                    return self.y(d[0]);
                })
                .outerRadius(function (d) {
                    return self.y(d[1]);
                })
                .startAngle(function (d) {
                    return self.x(d.data['name']);
                })
                .endAngle(function (d) {
                    return self.x(d.data['name']) + self.x.bandwidth();
                })
                .padAngle(0.01)
                .padRadius(innerRadius)
            );

        var labelRadius = self.outerRadius + 65

        var label = self.g.append("g")
            .selectAll("g.label")
            .data(self.data)
            .enter()
            .append("g")
            .attr("text-anchor", function (d, i) {
                return self.labelDegrees(d.name) > 90 ? "end" : "start";
            })
            .attr("class", function (d) {
                return 'label country-' + d.id
            })
            .attr("transform", function (d) {
                return "rotate(" + self.labelDegrees(d.name) + ")translate(" + labelRadius + ",0)";
            })
            .on("mouseover", function (d) {
                rotateMapToCentroid(d.centroid)
                highlightCountry(d)
            })
            .on("mouseout", function (d) {
                unHighlightCountry(d)
            })

        label.append("text")
            .attr("transform", function (d) {
                return self.labelDegrees(d.name) > 90 ? "rotate(180)translate(0,3)" : "rotate(0)translate(0,3)";
            })
            .text(function (d) { return d.name; })
    }

    this.addFilter = function (category) {
        this.filters.push(category)
        this.filterChart()
    }

    this.removeFilter = function (category) {
        this.filters.splice(this.filters.indexOf(category), 1)
        this.filterChart()
    }

    this.filterChart = function () {

        var sortColumns = []
        self.data.columns.forEach(function (column) {
            if (self.filters.indexOf(column) == -1) {
                sortColumns.push(column)
            }

        });
        self.data.sort(function (a, b) {
            var aTotal = 0, bTotal = 0
            sortColumns.forEach(function (column) {
                aTotal += a[column]
                bTotal += b[column]
            });
            return d3.descending(aTotal, bTotal)
        });

        // Create a copy. Is this really the best way of doing this!?!
        var dataCopy = JSON.parse(JSON.stringify(self.data));

        // If a filter has been applied, hide the bar by setting length to zero
        dataCopy.forEach(function (d, i) {
            self.filters.forEach(function (filter) {
                d[filter] = 0
            });
        })

        self.x.domain(dataCopy.map(function (d) { return d['name']; }));
        self.y.domain([0, d3.max(dataCopy, function (d) { return d.happinessScore; })]);

        var stack = d3.stack().keys(self.data.columns)

        self.g.selectAll("g.bar-group")
            .data(stack(dataCopy))
            .selectAll("path.bar")
            .data(function (d) { return d; })
            .attr("class", function (d) {
                return 'bar country-' + d.data.id;
            })

        self.g.selectAll("g.bar-group")
            .selectAll(".bar")
            .transition()
            .duration(20)
            .attr("d", d3.arc()
                .innerRadius(function (d) {
                    return self.y(d[0]);
                })
                .outerRadius(function (d) {
                    return self.y(d[1]);
                })
                .startAngle(function (d) {
                    return self.x(d.data['name']);
                })
                .endAngle(function (d) {
                    return self.x(d.data['name']) + self.x.bandwidth();
                })
                .padAngle(0.01)
                .padRadius(innerRadius)
            )

        self.g.selectAll("g.label")
            .data(dataCopy)
            .attr("class", function (d) {
                return 'label country-' + d.id
            })
            .select('text')
            .text(function (d) { return d.name; })
            .attr("transform", function (d) {
                return self.labelDegrees(d.name) > 90 ? "rotate(180)translate(0,3)" : "rotate(0)translate(0,3)";
            })
    }

}