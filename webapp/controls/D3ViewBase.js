sap.ui.define([
  "jquery.sap.global",
  "sap/ui/core/Control",
  "sap/ui/core/HTML",
  "sap/ui/core/ResizeHandler",
  "sap/ui/core/mvc/OverrideExecution"
], function(jquery, Control, HTML, ResizeHandler, OverrideExecution) {
  "use strict";
  
  const D3ViewBase = Control.extend("rsh.controls.D3ViewBase", {
    metadata: {
      methods: { // Interface from the perspective of the extension:
        "draw": {
          public: true,
          final: false, // default
          abstract:true,
          overrideExecution: OverrideExecution.Instead, // default
        }
      },      
      aggregations: {
        // prerendered hidden content, rendering svg on each renderer call is to expensive
        // idea: ui5 renders only the svg tag
        //       after ui5 rendering, svg is generated from d3
        //       browser rendering run then on the complete svg
        _svg: {
          type: "sap.ui.core.HTML",
          multiple:false,
          visibility:"hidden"
        },
        /*
        items : {
          type: "sap.ui.base.ManagedObject",
          multiple:true,
          singularName:"item"
        }
        */
      },
      /*
      defaultAggregation:"items",
      */
      properties: {
        data:"object",
        width:{type: "sap.ui.core.CSSSize", defaultValue: "100%"} ,
        height:{type: "sap.ui.core.CSSSize", defaultValue: "100%"} 
      }
    },

    draw : function(width, height, data) {},

    _onResize: function() {
      /*
      const height = this.$().height();
      const width = this.$().width();
      console.log(`D3ViewBase:onResize ${width}x${height}`);

      const data = this.getData()
      this.draw(width, height, data);
      */
 // get width/height with container selector (body also works)
    // or use other method of calculating desired values
      const svg = d3.select(`#${this._svgId}`) 

    //var width = $(`#${this._svgId}`).width(); 
    //var height = $(`#${this._svgId}`).height(); maybe i neew width, heigt from the enclosing div
      const width = this.$().width(); 
      const height = this.$().height(); 
      console.log(`D3View:_onResize ${width}x${height}`);

      // set attrs and 'resume' force 
      svg.attr('width', width);
      svg.attr('height', height);
      svg.attr("viewBox", [0, 0, width, height])
 
      this.onResize()
    },

    init: function() {
      Control.prototype.init.apply(this,arguments);
      console.log("D3ViewBase:init")
      const svg =   new HTML({
          //content: `<svg style="display: inline-block;position:absolute;top:0;left:0;width:100%;height:100%;border: 1px solid lightgray;"></svg>`
          //content: `<svg style="display: inline-block;position:relative;top:0;left:0;width:auto;height:auto;border: 1px solid lightgray;"></svg>`
          //content: `<svg style="display:block;position:relative;top:0;left:0;width:100%;height:100%;padding:0;margin:0;overflow:'clip'"></svg>`
          content: `<svg style="display:block;overflow:'hide'"></svg>`
        })
      this._svgId = svg.getId()
      console.log("svg.id=",this._svgId)
      this.setAggregation("_svg", svg)
      this._resizeHandler = ResizeHandler.register(this, this._onResize.bind(this));
    },

    exit: function() {
      Control.prototype.exit.apply(this, arguments);
      console.log("D3ViewBase:exit")
      ResizeHandler.deregister(this._resizeHandler);
    },

    onAfterRendering: function() {
      Control.prototype.onAfterRendering.apply(this,arguments)
      const that = this
//      setTimeout(() => {
        // wait a cycle, maybe the size is correctly computed than
        console.log("D3ViewBase:onAfterRendering", that.getId(),that.$().height())
        const height = that.$().height();
        const width = that.$().width();
        const data = that.getData()
        that.draw(width, height, data);
        that._onResize()
 //     }, 0)
    },

    renderer: {
      apiVersion:2,
      render : (renderManager, control) => {
        console.log("D3ViewBase:render")
        renderManager.openStart('div', control);
        renderManager.style("display", "flex");
        renderManager.style("align-items", "center");
        renderManager.style("justify-content", "center");
        console.log(`control widthxheight = ${control.getWidth()}x${control.getHeight()}`)
        renderManager.style("width",  control.getWidth());
        renderManager.style("height", control.getHeight());
        renderManager.style("padding", "0");
        //renderManager.style("padding-bottom", "100%");
        renderManager.style("vertical-align", "center");
        renderManager.style("horizontal-align", "center");
        renderManager.style("overflow", "hide");
        renderManager.openEnd();
        renderManager.renderControl(control.getAggregation("_svg"))
        renderManager.close('div');
      }
    }
  });

  return D3ViewBase; 
});