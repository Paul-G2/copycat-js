// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the Group boxes
 *   associated with a given string.
 * 
 */
Namespace.GroupsGraphic = class 
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
        this.groupGraphics = [];
        this.drawnGroups = [];
        this.cache = [];
    }

    /**
     * Utility method that indicates whether two Groups
     * refer to the same objects.
     * @private 
     */
    _sameReferents(g1, g2) {
        return (g1.leftObject === g2.leftObject) && (g1.rightObject === g2.rightObject);
    }


    /**
     * Draws the group boxes 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Get all the groups that need to be drawn
        const wksp = this.stringGraphic.wkspUi.workspace;
        const coderack = this.stringGraphic.wkspUi.copycat.coderack;

        let builtGroups = wksp.structures.filter(s => 
            (s instanceof Namespace.Group) && (s.string == this.wstring));

        let evaluatedGroups = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.GroupStrengthTester) && 
            (c.group.string == this.wstring)).map(c => c.group);

        let proposedGroups = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.GroupBuilder) && 
            (c.group.string == this.wstring)).map(c => c.group);

        // Remove duplicates
        proposedGroups = proposedGroups.filter(g =>
            !evaluatedGroups.some(e => this._sameReferents(e,g)) && 
            !builtGroups.some(b => this._sameReferents(b,g)));

        evaluatedGroups = evaluatedGroups.filter(g =>
            !builtGroups.some(b => this._sameReferents(b,g)));
        
        // Draw them
        this.groupGraphics = [];
        proposedGroups.forEach( g => { 
            const gg = this._getGroupGraphic(g, 'proposed');
            gg.redraw(ctx);
            this.groupGraphics.push(gg);
        });

        evaluatedGroups.forEach( g => { 
            const gg = this._getGroupGraphic(g, 'evaluated');
            gg.redraw(ctx);
            this.groupGraphics.push(gg);
        });

        builtGroups.forEach( g => { 
            const gg = this._getGroupGraphic(g, 'built');
            gg.redraw(ctx);
            this.groupGraphics.push(gg);
        });

        this.drawnGroups = proposedGroups.concat(evaluatedGroups, builtGroups);
    }


    /**
     * Gets or creates the graphic for a given group.
     * @private
     */
    _getGroupGraphic(group, type)
    {
        let groupGraphic = this.cache.find(gg => gg.group == group);

        if (!groupGraphic) {
            groupGraphic = new Namespace.GroupGraphic(group, type, this);
            this.cache.push(groupGraphic);
            if (this.cache.length > 100) { this.cache.shift(); }
        }

        groupGraphic.type = type;
        return groupGraphic;
    }


    /**
     * Flashes a proposed-Group graphic.
     * 
     * @param {Group} group - The group to flash.
     * @param {Number} count - The number of times to flash.
     */
    flashProposed(group, count=3) 
    {
        if (!this.drawnGroups.some(c => this._sameReferents(c, group))) {
            const groupGraphic = new Namespace.GroupGraphic(group, 'proposed', this);
            this.wkspUi.flash(groupGraphic, count);
        }
    }


    /**
     * Flashes a potential-Group graphic.
     * 
     * @param {Group} group - The group to flash.
     * @param {Number} count - The number of times to flash.
     */
    flashGrope(group, count=3)
    {
        if (!this.drawnGroups.some(c => this._sameReferents(c, group))) {
            const groupGraphic = new Namespace.GroupGraphic(group, 'grope', this);
            this.wkspUi.flash(groupGraphic, count);
        }        
    }
};


/**
 * @classdesc
 * This class is responsible for drawing a single Group box.
 * 
 */
Namespace.GroupGraphic = class
{
    /**
     * @constructor
     * 
     * @param {Group} group - The associated group.
     * @param {String} type - The type ('proposed', 'evaluated', or 'built').
     * @param {GroupsGraphic} parent - The collection that owns this graphic.
     * 
     */
    constructor(group, type, parent) 
    { 
        this.group = group; 
        this.type = type;
        this.parent = parent;
        this.drawParams = {};
    }


    /**
     * Draws the group box.
     * 
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        const UiUtils = Namespace.UiUtils;
        if ( UiUtils.NeedToRescale(this.drawParams, ctx) ) {
            this._updateDrawParams(ctx);
        }

        const dp = this.drawParams;
        ctx.strokeStyle = this.parent.wkspUi.groupColor;
        ctx.lineWidth = 1;
        ctx.setLineDash(dp.lineDash[this.type]);

        if (this.type == 'grope') {
            UiUtils.DrawLines(ctx, dp.zigzagLeftPts);
            UiUtils.DrawLines(ctx, dp.zigzagRightPts);
        }
        else {
            ctx.beginPath();
            ctx.rect(dp.x, dp.y, dp.w, dp.h);
            ctx.stroke();
            
            ctx.setLineDash([]);
            UiUtils.DrawLines(ctx, dp.arrowLines);
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

        const group = this.group;
        const stringGraphic = this.parent.stringGraphic;
        const letterGraphics = stringGraphic.lettersGraphic.letterGraphics;
        const stringDp = stringGraphic.drawParams;
        const leftLetterDp = letterGraphics[group.leftIndex-1].drawParams;
        const rightLetterDp = letterGraphics[group.rightIndex-1].drawParams;

        let [l, t, r, b] = [
            leftLetterDp.bbox.l, stringDp.baselineY - stringDp.maxCharAscent,
            rightLetterDp.bbox.r, stringDp.baselineY + stringDp.maxCharDescent];  

        const letterSpan = group.letterSpan();
        const chsp = stringDp.charSpacing;
        const xinflate = chsp * (letterSpan - 1) / 11;
        const yinflate = (h/6) * (letterSpan - 1) / 10;
        dp.x = l - xinflate;
        dp.y = t - yinflate;
        dp.w = r - l + 2*xinflate;
        dp.h = b - t + 2*yinflate;

        dp.zigzagLeftPts = [];
        dp.zigzagRightPts = [];
        const CalcZigzagLine = Namespace.UiUtils.CalcZigzagLine;
        let pta = {x: dp.x + dp.w/4, y:dp.y};
        let ptb = {x: dp.x, y: dp.y};
        let ptc = {x: dp.x, y: dp.y + dp.h};
        let ptd = {x: dp.x + dp.w/4, y: dp.y + dp.h};
        dp.zigzagLeftPts = dp.zigzagLeftPts.concat(
            CalcZigzagLine(ctx, pta.x, pta.y, ptb.x, ptb.y));
        dp.zigzagLeftPts = dp.zigzagLeftPts.concat(
            CalcZigzagLine(ctx, ptb.x, ptb.y, ptc.x, ptc.y));
        dp.zigzagLeftPts = dp.zigzagLeftPts.concat(
            CalcZigzagLine(ctx, ptc.x, ptc.y, ptd.x, ptd.y));

        pta = {x: dp.x + 3*dp.w/4, y:dp.y};
        ptb = {x: dp.x + dp.w, y: dp.y};
        ptc = {x: dp.x + dp.w, y: dp.y + dp.h};
        ptd = {x: dp.x + 3*dp.w/4, y: dp.y + dp.h};
        dp.zigzagRightPts = dp.zigzagRightPts.concat( CalcZigzagLine(ctx, pta.x, pta.y, ptb.x, ptb.y) );
        dp.zigzagRightPts = dp.zigzagRightPts.concat( CalcZigzagLine(ctx, ptb.x, ptb.y, ptc.x, ptc.y) );
        dp.zigzagRightPts = dp.zigzagRightPts.concat( CalcZigzagLine(ctx, ptc.x, ptc.y, ptd.x, ptd.y) );

        const sn = this.parent.wkspUi.copycat.slipnet;
        dp.arrowLines = [];
        if (group.directionCategory == sn.right) {
            let ptb = {x: dp.x + 0.45*dp.w, y:dp.y};
            let pta = {x: ptb.x - h/50, y:ptb.y - h/80};
            let ptc = {x: ptb.x - h/50, y:ptb.y + h/80};
            dp.arrowLines.push(pta, ptb, ptc);
        }
        else if (group.directionCategory == sn.left) {
            let ptb = {x: dp.x + 0.55*dp.w, y:dp.y};
            let pta = {x: ptb.x + h/50, y:ptb.y - h/80};
            let ptc = {x: ptb.x + h/50, y:ptb.y + h/80};
            dp.arrowLines.push(pta, ptb, ptc);
        }

        dp.lineDash = {
            proposed: [Math.max(1, chsp/16), Math.max(1, chsp/16)],
            evaluated: [Math.max(1, chsp/4), Math.max(1, chsp/4)],
            grope: [],
            built: []
        };

        dp.attachPoints = {
            correspTop: {x: dp.x + dp.w/2, y: dp.y},
            correspBtm: {x: dp.x + dp.w/2, y: dp.y + dp.h},
            correspRight: {x: dp.x + dp.w, y: dp.y + dp.h/2},
            bondR1: {x: dp.x + 0.55*dp.w , y: dp.y - stringDp.maxCharAscent/4},
            bondL1: {x: dp.x + 0.45*dp.w , y: dp.y - stringDp.maxCharAscent/4}
        };
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );