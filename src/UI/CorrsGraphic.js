// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing Correspondence graphics.
 * 
 */
Namespace.CorrsGraphic = class 
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
        this.targetString = workspaceUi.targetStringGraphic.wstring;

        this.drawnCorrs = [];
        this.cache = [];
    }


    /**
     * Utility method that indicates whether two Correspondences
     * refer to the same initial and target objects.
     * @private 
     */
    _sameReferents(corr1, corr2) {
        return (corr1.objFromInitial === corr2.objFromInitial) &&
            (corr1.objFromTarget === corr2.objFromTarget);
    }


    /**
     * Utility method that indicates whether a Correspondences
     * is between two string-spanning groups.
     * @private 
     */    
    _hasStringSpanningGroups(corr) {
        return (corr.objFromInitial instanceof Namespace.Group) &&
            (corr.objFromTarget instanceof Namespace.Group) &&
            (corr.objFromInitial.spansString()) &&
            (corr.objFromTarget.spansString());
    }


    /**
     * Draws the correspondence lines. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Check whether the input strings have changed
        const wkspUi = this.wkspUi;
        if ((this.initialString !== wkspUi.initialStringGraphic.wstring) ||
            (this.targetString !== wkspUi.targetStringGraphic.wstring)) {
                this.initialString = wkspUi.initialStringGraphic.wstring;
                this.targetString = wkspUi.targetStringGraphic.wstring;
                this.cache = [];
        }

        // Get all the correspondences that need to be drawn
        const copycat = this.wkspUi.copycat;
        const wksp = copycat.workspace;
        const coderack = copycat.coderack;

        let builtCorrs = copycat.workspace.structures.filter(s => 
            (s instanceof Namespace.Correspondence));

        let evaluatedCorrs = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.CorrespondenceStrengthTester)).
                map(c => c.correspondence);

        let proposedCorrs = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.CorrespondenceBuilder)). 
                map(c => c.correspondence);

        // Remove duplicates and obsolete cases
        proposedCorrs = proposedCorrs.filter(p =>
            !evaluatedCorrs.some(e => this._sameReferents(e,p)) &&
            !builtCorrs.some(b => this._sameReferents(b,p)) &&
            wksp.structures.includes(p.objFromInitial) &&
            wksp.structures.includes(p.objFromTarget));

        evaluatedCorrs = evaluatedCorrs.filter(e =>
            !builtCorrs.some(b => this._sameReferents(b,e)) &&
            wksp.structures.includes(e.objFromInitial) &&
            wksp.structures.includes(e.objFromTarget));
        
        // Draw them
        proposedCorrs.forEach(p => {
            this._getCorrGraphic(p, 'proposed').redraw(ctx);
        });

        evaluatedCorrs.forEach(e => {
            this._getCorrGraphic(e, 'evaluated').redraw(ctx);
        });

        // Draw the built correspondences, but drawm the string-spanning
        // one last.
        const ssBuiltCorrs = [];
        let i = 0;
        builtCorrs.forEach(b => {
            if (!this._hasStringSpanningGroups(b)) {
                this._getCorrGraphic(b, 'built').redraw(ctx, i++);
            }
            else { ssBuiltCorrs.push(b);}
        });
        ssBuiltCorrs.forEach(b => {
            this._getCorrGraphic(b, 'built').redraw(ctx, i++);
        });

        this.drawnCorrs = proposedCorrs.concat(evaluatedCorrs, builtCorrs);
    }


    /**
     * Gets or creates the graphic for a given correspondence.
     * @private
     */
    _getCorrGraphic(corresp, type)
    {
        let correspGraphic = this.cache.find(g => g.corresp == corresp);

        if (!correspGraphic) {
            correspGraphic = new Namespace.CorrGraphic(corresp, type, this);
            this.cache.push(correspGraphic);
            if (this.cache.length > 100) {
                this.cache.shift();
            }
        }
        correspGraphic.type = type;
        return correspGraphic;
    }


    /**
     * Flashes a proposed-Correspondence graphic.
     * 
     * @param {Correspondence} corresp - The correspondence to flash.
     * @param {Number} count - The number of times to flash.
     */
    flashProposed(corresp, count=3) 
    {
        if (!this.drawnCorrs.some(c => this._sameReferents(c, corresp))) {
            const correspGraphic = 
                new Namespace.CorrGraphic(corresp, 'proposed', this);
            this.wkspUi.flash(correspGraphic, count);
        }
    }


    /**
     * Flashes a potential-Correspondence graphic.
     * 
     * @param {Correspondence} corresp - The correspondence to flash.
     * @param {Number} count - The number of times to flash.
     */
    flashGrope(corresp, count=3)
    {
        if (!this.drawnCorrs.some(c => this._sameReferents(c, corresp))) {
            const correspGraphic = 
                new Namespace.CorrGraphic(corresp, 'grope', this);
            this.wkspUi.flash(correspGraphic, count);
        }        
    }
};


/**
 * @classdesc
 * This class is responsible for drawing a single Correspondence line.
 * 
 */
Namespace.CorrGraphic = class
{
    /**
     * @constructor
     * 
     * @param {Correspondence} corr - The associated correspondence.
     * @param {String} type - The type ('proposed', 'evaluated', or 'built').
     * @param {CorrsGraphic} parent - The collection that owns this graphic.
     * 
     */
    constructor(corr, type, parent) 
    { 
        this.corr = corr; 
        this.type = type;
        this.parent = parent;
        this.drawParams = {};
    }


    /**
     * Draws the correspondence line.
     * 
     */
    redraw(ctx, index=0)
    {
        // Update our drawing parameters if necessary
        const UiUtils = Namespace.UiUtils;
        if ( UiUtils.NeedToRescale(this.drawParams, ctx) ) {
            this._updateDrawParams(ctx);
        }

        const dp = this.drawParams;
        ctx.strokeStyle = this.parent.wkspUi.correspColor;
        ctx.lineWidth = 1;
        ctx.setLineDash(dp.lineDash[this.type]);

        if (this.type == 'grope') {
            const n = Math.round(dp.zigzagLinePts.length/3);
            UiUtils.DrawLines(ctx, dp.zigzagLinePts.slice(0, n));
            UiUtils.DrawLines(ctx, dp.zigzagLinePts.slice(2*n));
        }
        else if (this.type != 'built') {
            UiUtils.DrawLines(ctx, dp.straightLinePts);
        } 
        else {
            // Draw the correspondence line, with its footnote
            // number overlaid
            UiUtils.DrawLines(ctx, dp.zigzagLinePts);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(...dp.labelRect);
            ctx.textAlign = 'center';  
            ctx.fillStyle = this.parent.wkspUi.correspColor;
            ctx.font = dp.footnumFont;
            ctx.fillText((index+1).toString(), dp.labelPosX, dp.labelPosY); 
            
            // Now draw the footnote text
            ctx.font = dp.footnoteFont;
            ctx.textAlign = 'left';  

            const xOffset = dp.hasStringSpanningGroups ? 0:
                index * dp.textSpacingX;
            ctx.fillText((index+1).toString(), 
                dp.footnotePosX + xOffset, dp.footnotePosY);
            const cms = this.corr.conceptMappings.concat(
                this.corr.accessoryConceptMappings);
            cms.sort( (a, b) => 
                b.initialDescriptor.depth - a.initialDescriptor.depth);
            cms.forEach((cm, n) => {
                const text = cm.initialDescriptor.shortName + ' ' +
                    String.fromCharCode(8594) + ' ' + 
                    cm.targetDescriptor.shortName;
                ctx.fillText(text, dp.textPosX + xOffset, 
                    dp.textPosY + n*dp.textSpacingY);
            });
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

        const objA = this.corr.objFromInitial;
        const objB = this.corr.objFromTarget;
        dp.hasStringSpanningGroups = this.parent._hasStringSpanningGroups(this.corr);

        const wkspUi = this.parent.wkspUi;
        const initialGraphic = wkspUi.initialStringGraphic.getChildGraphic(objA);
        const targetGraphic = wkspUi.targetStringGraphic.getChildGraphic(objB);

        dp.zigzagLinePts = [];
        const CalcZigzagLine = Namespace.UiUtils.CalcZigzagLine;
        let [pti, ptt, ptb, ptc] = [null, null, null, null];
        if (dp.hasStringSpanningGroups) {
            pti = initialGraphic.drawParams.attachPoints['correspRight'];
            ptt = targetGraphic.drawParams.attachPoints['correspRight'];
            ptb = {x: pti.x + w/24, y: pti.y};
            ptc = {x: ptb.x, y: ptt.y};
            dp.zigzagLinePts = dp.zigzagLinePts.concat(
                CalcZigzagLine(ctx, pti.x, pti.y, ptb.x, ptb.y));
            dp.zigzagLinePts = dp.zigzagLinePts.concat(
                CalcZigzagLine(ctx, ptb.x, ptb.y, ptc.x, ptc.y));
            dp.zigzagLinePts = dp.zigzagLinePts.concat(
                CalcZigzagLine(ctx, ptc.x, ptc.y, ptt.x, ptt.y));
            dp.straightLinePts = [pti, ptb, ptc, ptt];
        }
        else {
            pti = initialGraphic.drawParams.attachPoints['correspBtm'];
            ptt = targetGraphic.drawParams.attachPoints['correspTop'];
            dp.zigzagLinePts = CalcZigzagLine(ctx, pti.x, pti.y, ptt.x, ptt.y);
            dp.straightLinePts = [pti, ptt];
        }

        const sz = wkspUi.initialStringGraphic.drawParams.maxCharAscent/20;
        dp.lineDash = {
            proposed: [Math.max(2, 2*sz), Math.max(8, 8*sz)],
            evaluated: [Math.max(8, 8*sz), Math.max(6, 6*sz)],
            grope: [],
            built: []
        };

        dp.textFontSize = Math.round(
            wkspUi.targetStringGraphic.drawParams.fontSize/2.25);
        dp.footnoteFont = 'italic ' + dp.textFontSize.toString() + 'px serif';

        if (!dp.hasStringSpanningGroups) {
            dp.textPosX = w/20;
            dp.textPosY = 0.85*h;
            dp.labelPosX = 0.7*pti.x + 0.3*ptt.x;
            dp.labelPosY = 0.7*pti.y + 0.3*ptt.y;
        } else {
            dp.textPosX = ptb.x + dp.textFontSize;
            dp.textPosY = 0.75*ptb.y + 0.25*ptc.y;
            dp.labelPosX = 0.50*ptb.x + 0.50*ptc.x;
            dp.labelPosY = 0.50*ptb.y + 0.50*ptc.y;
        }
        dp.textSpacingX = 8 * dp.textFontSize;
        dp.textSpacingY = 1.2 * dp.textFontSize;
        dp.footnotePosX = dp.textPosX - 0.5*dp.textFontSize;
        dp.footnotePosY = dp.textPosY - 0.5*dp.textFontSize;
        dp.labelRect = [dp.labelPosX - 0.7*dp.textFontSize,
            dp.labelPosY - 1.1*dp.textFontSize,
            1.4*dp.textFontSize, 1.4*dp.textFontSize];
        dp.footnumFont = 'italic bold ' + (dp.textFontSize+2).toString() + 'px serif';
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );