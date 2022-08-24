var dataset;

var svg = d3.select("svg"),
	innerRadius = 120;

var globe = new Globe(svg, innerRadius - 2)
var bar = new StackedBarChart(svg, innerRadius)

function highlightCountry(d) {
	// d3.selectAll('.highlight').classed("highlight", false);
	d3.selectAll('.country-' + d.id).classed("highlight", true);
}

function unHighlightCountry(d) {
	d3.selectAll('.highlight').classed("highlight", false);
}

function rotateMapToCentroid(centroid) {
	globe.rotateToCentroid(centroid);
}

queue()
	.defer(d3.json, "./data/world-110m.json")
	.defer(d3.tsv, "./data/world-110m-country-names.tsv")
	.defer(d3.csv, "./data/compiled.csv")
	.await(ready);

function ready(error, worldTopologyData, countryNamesData, qualityOfLifeData) {
    
    // worldTopologyData --> countries-10m.json
    // countryNamesData --> world-110m-country-names.tsv
    
    // Just throw an error if there's a problem
    if (error) throw error;

    dataset = topojson.feature(worldTopologyData, worldTopologyData.objects.countries).features;
    
    // Amalgamate all the data into one dataset
    countryNamesByID = {}
    countryNamesData.forEach(function (d) {
        countryNamesByID[d.id] = d.name;
    });

    qualityOfLifeByName = {}
    qualityOfLifeData.forEach(function (d, i) {
        d['rank'] = i;
        qualityOfLifeByName[d['Country']] = d
    });

    dataset.explainedByColumns = qualityOfLifeData.columns.splice(3)

    var countryName, qualityOfLife
    dataset.forEach(function (d, i) {
        countryName = countryNamesByID[d.id];
        qualityOfLife = qualityOfLifeByName[countryName];
        // Getting country names
        dataset[i]['properties']['name'] = countryName;
        // For rotating the globe on country selection
        dataset[i]['properties']['centroid'] = d3.geoCentroid(d);

        if (typeof (qualityOfLife) !== 'undefined') 
        {
            dataset[i]['properties']['happinessScore'] = parseFloat(qualityOfLife['Quality of Life Index']);
            dataset[i]['properties']['rank'] = parseFloat(qualityOfLife['rank']) + 1;
            var total = 240;
            dataset.explainedByColumns.forEach(function (column) {
                dataset[i]['properties'][column] = parseFloat(qualityOfLife[column]);
                // Rank, Country,
                // Quality of Life Index
                // Purchasing Power Index
                // Safety Index
                // Health Care Index
                // Cost of Living Index
                // Property Price to Income Ratio
                // Traffic Commute Time Index
                // Pollution Index
                // Climate Index
                
                // Formula: index.main = Math.max(0, 100 + purchasingPowerInclRentIndex / 2.5 - (housePriceToIncomeRatio * 1.0) - costOfLivingIndex / 10 + safetyIndex / 2.0 + healthIndex / 2.5 - trafficTimeIndex / 2.0 - pollutionIndex * 2.0 / 3.0 + climateIndex / 3.0);
                
                if (column == 'Purchasing Power Index') {
                    total += dataset[i]['properties'][column] / 2.5;
                }
                else if (column == 'Property Price to Income Ratio') {
                    total -= dataset[i]['properties'][column];
                }
                else if (column == 'Cost of Living Index') {
                    total -= dataset[i]['properties'][column]/10;
                }
                else if (column == 'Safety Index') {
                    total += dataset[i]['properties'][column]/2.0;
                }
                else if (column == 'Health Care Index') {
                    total += dataset[i]['properties'][column]/2.5;
                }
                else if (column == 'Traffic Commute Time Index') {
                    total -= dataset[i]['properties'][column]/2.0;
                }
                else if (column == 'Pollution Index') {
                    total += dataset[i]['properties'][column]*2.0/3.0;
                }
                else if (column == 'Climate Index') {
                    total += dataset[i]['properties'][column]/3.0;
                }
            });
            dataset[i]['properties']['explainedByTotal'] = Math.max(0, total);
        }
    });

    globe.draw()
    bar.draw()
}
