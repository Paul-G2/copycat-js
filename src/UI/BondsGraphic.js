// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the bonds
 *   associated with a given string.
 * 
 */
Namespace.BondsGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {StringGraphic} stringGraphic - The parent graphic.
     * 
     */
    constructor(stringGraphic) 
    { 
        this.stringGraphic = stringGraphic; 
        this.wstring = stringGraphic.wstring;
        this.wkspUi = stringGraphic.wkspUi;
        this.bondGraphics = [];
        this.drawnBonds = [];
        this.cache = [];
    }


    /**
     * Utility method that indicates whether two Bonds
     * refer to the same source and destination objects.
     * @private 
     */
    _sameReferents(b1, b2) {
        return (b1.source === b2.source) &&
            (b1.destination === b2.destination);
    }

    /**
     * Draws the bond lines 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Get all the bonds that need to be drawn
        const wksp = this.wkspUi.workspace;
        const coderack = this.wkspUi.copycat.coderack;

        let builtBonds = wksp.structures.filter(s => 
            (s instanceof Namespace.Bond) && (s.source.string == this.wstring));

        let evaluatedBonds = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.BondStrengthTester) && 
            (c.bond.source.string == this.wstring)).map(c => c.bond);

        let proposedBonds = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.BondBuilder) && 
            (c.bond.source.string == this.wstring)).map(c => c.bond);

        // Remove duplicates and obsolete cases
        proposedBonds = proposedBonds.filter(p =>
            !evaluatedBonds.some(e => this._sameReferents(e,p)) && 
            !builtBonds.some(b => this._sameReferents(b,p)) &&
            wksp.structures.includes(p.leftObject) &&
            wksp.structures.includes(p.rightObject));

        evaluatedBonds = evaluatedBonds.filter(e =>
            !builtBonds.some(b => this._sameReferents(b,e)) &&
            wksp.structures.includes(e.leftObject) &&
            wksp.structures.includes(e.rightObject));
        
        // Draw them
        this.bondGraphics = [];
        proposedBonds.forEach( b => {
            const bg = this._getBondGraphic(b, 'proposed');
            bg.redraw(ctx);
            this.bondGraphics.push(bg);
        });

        evaluatedBonds.forEach( b => {
            const bg = this._getBondGraphic(b, 'evaluated');
            bg.redraw(ctx);
            this.bondGraphics.push(bg);
        });

        builtBonds.forEach( b => {
            const bg = this._getBondGraphic(b, 'built'); 
            bg.redraw(ctx);
            this.bondGraphics.push(bg);
        });   
        
        this.drawnBonds = proposedBonds.concat(evaluatedBonds, builtBonds);
    }


    /**
     * Gets or creates the graphic for a given bond.
     * @private
     */
    _getBondGraphic(bond, type)
    {
        let bondGraphic = this.cache.find(bg => bg.bond == bond);

        if (!bondGraphic) {
            bondGraphic = new Namespace.BondGraphic(bond, type, this);
            this.cache.push(bondGraphic);
            if (this.cache.length > 100) {
                this.cache.shift();
            }
        }

        bondGraphic.type = type;
        return bondGraphic;
    }


    /**
     * Flashes a proposed-Bond graphic.
     * 
     * @param {Bond} bond 
     * @param {Number} count 
     */
    flashProposed(bond, count=3) 
    {
        if (!this.drawnBonds.some(b => this._sameReferents(b, bond))) {
            const bondGraphic = 
                new Namespace.BondGraphic(bond, 'proposed', this);
            this.wkspUi.flash(bondGraphic, count);
        }
    }


    /**
     * Flashes a potential-Bond graphic.
     * 
     * @param {Correspondence} bond 
     * @param {Number} count 
     */
    flashGrope(bond, count=3)
    {
        if (!this.drawnBonds.some(b => this._sameReferents(b, bond))) {
            const bondGraphic = 
                new Namespace.BondGraphic(bond, 'grope', this);
            this.wkspUi.flash(bondGraphic, count);
        }        
    }
};


/**
 * @classdesc
 * This class is responsible for drawing a single Bond line.
 * 
 */
Namespace.BondGraphic = class
{
    /**
     * @constructor
     * 
     * @param {Bond} bond - The associated bond.
     * @param {String} type - The type ('proposed', 'evaluated', or 'built').
     * @param {BondsGraphic} parent - The collection that owns this graphic.
     * 
     */
    constructor(bond, type, parent) 
    { 
        this.bond = bond; 
        this.type = type;
        this.parent = parent;
        this.drawParams = {};
    }


    /**
     * Draws the bond line.
     * 
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        const UiUtils = Namespace.UiUtils;
        if ( UiUtils.NeedToRescale(this.drawParams, ctx)) {
            this._updateDrawParams(ctx);
        }

        const dp = this.drawParams;
        ctx.strokeStyle = this.parent.wkspUi.bondColor;
        ctx.lineWidth = 1;
        ctx.setLineDash(dp.lineDash[this.type]);

        if (this.type == 'grope') {
            UiUtils.DrawLines(ctx, dp.gropeLineA);
            UiUtils.DrawLines(ctx, dp.gropeLineB);
        }
        else {
            ctx.beginPath();
            ctx.moveTo(dp.pta.x, dp.pta.y);
            ctx.quadraticCurveTo(dp.ptc.x, dp.ptc.y, dp.ptb.x, dp.ptb.y);
            ctx.stroke();

            ctx.setLineDash([]);
            Namespace.UiUtils.DrawLines(ctx, dp.arrowLines);
        }
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

        const bond = this.bond;
        const parent = this.parent;

        // Get the start and ednp points of the bond line
        const leftObjGraphic = parent.stringGraphic. getChildGraphic(bond.leftObject);
        const rightObjGraphic = parent.stringGraphic.getChildGraphic(bond.rightObject);
        dp.pta = leftObjGraphic.drawParams.attachPoints.bondR1;
        dp.ptb = rightObjGraphic.drawParams.attachPoints.bondL1;

        // Get the control point (for drawing a curved line)
        const sn = parent.wkspUi.copycat.slipnet;
        const stringDp = parent.stringGraphic.drawParams;
        const bump = bond.directionCategory == sn.right ? 
            1.0*stringDp.fontSize : 0.4*stringDp.fontSize;
        dp.ptc = {x: (dp.pta.x + dp.ptb.x)/2, y: Math.min(dp.pta.y, dp.ptb.y) - bump};

        // Calculate the grope lines
        const CalcZigzagLine = Namespace.UiUtils.CalcZigzagLine;
        const gBump =  0.25*stringDp.fontSize;
        const ptg = {x: (dp.pta.x + dp.ptb.x)/2, y: (dp.pta.y + dp.ptb.y)/2 - gBump};
        dp.gropeLineA = CalcZigzagLine(ctx, dp.pta.x, dp.pta.y, 
            dp.pta.x + 0.8*(ptg.x - dp.pta.x), dp.pta.y + 0.8*(ptg.y - dp.pta.y));
        dp.gropeLineB = CalcZigzagLine(ctx, dp.ptb.x, dp.ptb.y,
            dp.ptb.x + 0.8*(ptg.x - dp.ptb.x), dp.ptb.y + 0.8*(ptg.y - dp.ptb.y));

        // Calculate the arrow points
        dp.arrowLines = [];
        const arrowScale = h/125;
        const ptab = {x: dp.pta.x/4 + dp.ptc.x/2 + dp.ptb.x/4, 
                      y: dp.pta.y/4 + dp.ptc.y/2 + dp.ptb.y/4};
        if (bond.directionCategory == sn.right) {
            let ptaa = {x: ptab.x - arrowScale, y:ptab.y - 0.9*arrowScale};
            let ptac = {x: ptab.x - arrowScale, y:ptab.y + 0.9*arrowScale};
            dp.arrowLines.push(ptaa, ptab, ptac);
        }
        else if (bond.directionCategory == sn.left) {
            let ptaa = {x: ptab.x + arrowScale, y:ptab.y - 0.9*arrowScale};
            let ptac = {x: ptab.x + arrowScale, y:ptab.y + 0.9*arrowScale};
            dp.arrowLines.push(ptaa, ptab, ptac);
        }

        const chsp = stringDp.charSpacing;
        dp.lineDash = {
            proposed: [Math.max(1, chsp/16), Math.max(1, chsp/16)],
            evaluated: [Math.max(1, chsp/4), Math.max(1, chsp/4)],
            grope:[],
            built: []
        };

    }
    
};

})( window.CopycatJS = window.CopycatJS || {} );