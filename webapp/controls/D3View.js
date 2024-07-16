sap.ui.define([
  "rsh/watchlist/ui5/controls/D3ViewBase"
], function(D3ViewBase) {

    function _monthDiff(d1, d2) {
        const _d1 = d1 || new Date()
        const _d2 = d2 || new Date()
        let months;
        months = (_d2.getFullYear() - _d1.getFullYear()) * 12;
        months -= _d1.getMonth() + 1;
        months += _d2.getMonth();
        return months <= 0 ? 0 : months;
    }

  const D3View = D3ViewBase.extend("rsh.watchlist.ui5.controls.D3View", {
    /*
    overrides: {
      draw : function(width, height, data) {
        console.log("implementd1");
      },
      onResiz : function(width, height, data) {
        console.log("implementd1");
      }
    },
    */
    renderer: {}
  });
  // example from 
    D3View.prototype.onResize = function() {
      console.log("D3View:onResize")
    }

    D3View.prototype.draw = function(aWidth, aHeight, data) {
      console.log(`D3View:draw ${aWidth}x${aHeight}`);
      console.log(data)
      // d3 globaly imported in index.html

      if(!data || data.length == 0) return

      d3.selectAll("svg > g > *").remove()

      const svgWidth = aWidth, svgHeight = aHeight;   
      const margin = { top: 20, right: 20, bottom: 30, left: 50 }; 
      const width = svgWidth - margin.left - margin.right;  
      const height = svgHeight - margin.top - margin.bottom;

      const svg = d3.select(`#${this._svgId}`) 
                    .attr("width", svgWidth)
                    .attr("height", svgHeight)
                    .attr("preserveAspectRatio", "xMinYMin meet")
                    .attr("viewBox", [0, 0, svgWidth, svgHeight])
//                    .attr("style", "max-width: 100%; height: 100%; height: intrinsic;");


      const g = svg.append("g")
                    .attr("transform",
                          "translate(" + margin.left + "," + margin.top + ")");

      // Declare the x (horizontal position) scale.
      const xs = d3.scaleTime().rangeRound([0, width])
      const dateRange = d3.extent(data, d => d.date)
      xs.domain(dateRange);

      // Declare the y (vertical position) scale.
      const ys = d3.scaleLinear().rangeRound([height, 0]);
      ys.domain(d3.extent(data, function(d) { return d.value }));

      // Declare the line generator.
      const line = d3.line()
                  .x(d => xs(d.date))   
                  .y(d => ys(d.value));   
                  
      
      // Add the x-axis.
      const numMonths = _monthDiff(dateRange[0], dateRange[1])
      g.append("g")
        .attr("transform", `translate(0,${height})`)
        //.call(d3.axisBottom(xs))
        //.call(d3.axisBottom(xs).ticks(width / numMonths ).tickSizeOuter(0))
        .call(d3.axisBottom(xs).ticks(numMonths ).tickSizeOuter(0))
        //.select(".domain").remove();

      // nicer y-aches
      g.append("g")
        .call(d3.axisLeft(ys))
        //.call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
          .attr("x2", width)
          .attr("stroke-opacity", 0.1))
        .append("text")
          .attr("transform", "rotate(-90)")
          //.attr("x", 0)
          //.attr("y", 10)
          .attr("dy", "2em")
          .attr("text-anchor", "end")
          .attr("fill", "currentColor")
          .text("Close ($)");


      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        //.attr("stroke-linejoin", "round")
        //.attr("stroke-linecap", "round")
        .attr("stroke-width", 1.1)
        .attr("d", line)
  }

  return D3View
})