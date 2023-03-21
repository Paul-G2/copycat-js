// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing Replacement lines.
 * 
 */
Namespace.ReplacementsGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent UI.
     * 
     */
    constructor(workspaceUi)
    { 
        this.wkspUi = workspaceUi;
        this.initialString = workspaceUi.initialStringGraphic.wstring;
        this.modifiedString = workspaceUi.modifiedStringGraphic.wstring;
        this.cache = [];
    }


    /**
     * Draws the replacement lines. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Check whether the input strings have changed
        const wkspUi = this.wkspUi;
        if ((this.initialString !== wkspUi.initialStringGraphic.wstring) ||
            (this.modifiedString !== wkspUi.modifiedStringGraphic.wstring)) {
                this.initialString = wkspUi.initialStringGraphic.wstring;
                this.modifiedString = wkspUi.modifiedStringGraphic.wstring;
                this.cache = [];
        }

        // Draw all the replacements that have been found so far
        const wksp = this.wkspUi.workspace;

        const replacements = wksp.initialWString.letters.map(
            ltr => ltr.replacement).filter(repl => !!repl);

        replacements.forEach(r => {
            this._getReplacementGraphic(r).redraw(ctx);
        });
    }


    /**
     * Gets or creates the graphic for a given Replacement object.
     * @private
     */
    _getReplacementGraphic(repl)
    {
        let replGraphic = this.cache.find(g => g.replacement == repl);

        if (!replGraphic) {
            replGraphic = new Namespace.ReplacementGraphic(repl, this);
            this.cache.push(replGraphic);
            if (this.cache.length > 25) {
                this.cache.shift();
            }
        }
        return replGraphic;
    }
};


/**
 * @classdesc
 * This class is responsible for drawing a single Replacement line.
 * 
 */
Namespace.ReplacementGraphic = class
{
    /**
     * @constructor
     * 
     * @param {Replacement} repl - The associated Replacement.
     * @param {CorrsGraphic} parent - The collection that owns this graphic.
     * 
     */
    constructor(repl, parent) 
    { 
        this.replacement = repl; 
        this.parent = parent;
        this.drawParams = {};
    }


    /**
     * Draws the Replacement line.
     * 
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        if ( Namespace.UiUtils.NeedToRescale(this.drawParams, ctx) ) {
            this._updateDrawParams(ctx);
        }

        const dp = this.drawParams;
        ctx.strokeStyle = this.parent.wkspUi.replColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.ellipse(dp.cx, dp.cy, dp.radX, dp.radY, 
            dp.rotAngle, dp.startAngle, dp.endAngle);
        ctx.stroke();        
    }


    /** 
     * Recalculates drawing parameters.
     * @private
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        const wkspUi = this.parent.wkspUi;
        const objA = this.replacement.objFromInitial;
        const objB = this.replacement.objFromModified;
        const initialGraphic = wkspUi.initialStringGraphic.getChildGraphic(objA);
        const modifiedGraphic = wkspUi.modifiedStringGraphic.getChildGraphic(objB);

        const pti = initialGraphic.drawParams.attachPoints['repl'];
        const ptm = modifiedGraphic.drawParams.attachPoints['repl'];
        dp.cx = (pti.x + ptm.x) / 2;
        dp.cy = Math.min(pti.y, ptm.y);
        dp.radX = Math.abs(ptm.x - pti.x) / 2;
        dp.radY = h/10;
        dp.rotAngle = 0;
        dp.startAngle = Math.PI;
        dp.endAngle = 2 * Math.PI;
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );