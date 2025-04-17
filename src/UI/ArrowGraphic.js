// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class draws the string-to-corresponding-string arrows.
 * 
 */
Namespace.ArrowGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent Ui.
     */
    constructor(workspaceUi) 
    { 
        this.wkspUi = workspaceUi; 
        this.drawParams = {};
    }


    /**
     * Draws the arrows.
     *
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        if (Namespace.UiUtils.NeedToRescale(this.drawParams, ctx)) { this._updateDrawParams(ctx);}

        const dp = this.drawParams;
        ctx.strokeStyle = this.wkspUi.letterColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        
        for (let line of dp.lines) {
            Namespace.UiUtils.DrawLine(ctx, line.xa, line.ya, line.xb, line.yb);
        }      
    }


    /** 
     * Recalculates the drawing parameters for this object.
     * 
     * @private
     */
     _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        const dp = this.drawParams;
        dp.canvasWidth = w; dp.canvasHeight = h;
       
        let cx = w/2;
        let cy = h/3 - h/80;
        let sz = w/25;
        dp.lines = [];

        dp.lines.push({xa: cx-0.5*sz, ya: cy-0.08*sz, xb: cx+0.34*sz, yb: cy-0.08*sz});
        dp.lines.push({xa: cx-0.5*sz, ya: cy+0.08*sz, xb: cx+0.34*sz, yb: cy+0.08*sz});
        dp.lines.push({xa: cx+0.1*sz, ya: cy-0.2*sz, xb: cx+0.5*sz, yb: cy});
        dp.lines.push({xa: cx+0.1*sz, ya: cy+0.2*sz, xb: cx+0.5*sz, yb: cy});

        cy = 2*h/3 - h/80;
        dp.lines.push({xa: cx-0.5*sz, ya: cy-0.08*sz, xb: cx+0.34*sz, yb: cy-0.08*sz});
        dp.lines.push({xa: cx-0.5*sz, ya: cy+0.08*sz, xb: cx+0.34*sz, yb: cy+0.08*sz});
        dp.lines.push({xa: cx+0.1*sz, ya: cy-0.2*sz, xb: cx+0.5*sz, yb: cy});
        dp.lines.push({xa: cx+0.1*sz, ya: cy+0.2*sz, xb: cx+0.5*sz, yb: cy});
    }               
};





})( window.CopycatJS = window.CopycatJS || {} );