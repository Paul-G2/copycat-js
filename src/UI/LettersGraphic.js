// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the letters of a given string.
 * 
 */
Namespace.LettersGraphic = class 
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
        this.wkspUi = stringGraphic.wkspUi;

        // Create my letter graphics
        this.letterGraphics = [];

        if (stringGraphic.quadrant != 2) {
            const wstring = this.stringGraphic.wstring;
            for (let i=0; i<wstring.length; i++) {
                this.letterGraphics.push( 
                    new Namespace.LetterGraphic(wstring.letters[i], i, this) );
            }
        }
        else {
            const jstring = this.stringGraphic.jstring;
            for (let i=0; i<jstring.length; i++) {
                this.letterGraphics.push( 
                    new Namespace.LetterGraphic(jstring[i], i, this) );
            }        
        }

    }


    /**
     * Draws the letters. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        this.letterGraphics.forEach(lg => lg.redraw(ctx));                    
    }
};


/**
 * @classdesc
 * This class draws a single letter from a WorkspaceString.
 * 
 */
Namespace.LetterGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {Letter} letter - The wrapped letter.
     * @param {Number} index - The letter's index in its string.
     * @param {StringGraphic} parent - The StringGraphic that owns this object.
     */
    constructor(letter, index, parent) 
    { 
        if (letter instanceof Namespace.Letter) {
            this.letter = letter;
            this.char = letter.char;
        } else {
            this.letter = null;
            this.char = letter;
        }

        this.index = index;
        this.parent = parent;
        this.stringGraphic = parent.stringGraphic;
        this.wkspUi = parent.wkspUi;
        this.drawParams = {};
    }


    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        if (Namespace.UiUtils.NeedToRescale(this.drawParams, ctx)) {
            this._updateDrawParams(ctx);
        }

        const wkspUi = this.wkspUi;
        const dp = this.drawParams; 
        ctx.font = dp.font;
        ctx.textAlign = 'left';
        ctx.fillStyle = (this.stringGraphic == wkspUi.answerStringGraphic) ? 
            wkspUi.answerLetterColor : wkspUi.letterColor;
        ctx.fillText(this.char, dp.x, dp.y);
    }            


    /** 
     * Recalculates the drawing parameters for this object.
     * @private
     * 
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        // Set the font parameters
        const stringDp = this.parent.stringGraphic.drawParams;
        dp.fontSize = stringDp.fontSize;
        dp.font = stringDp.font;
        ctx.font = dp.font; // Must set the font before measuring text
    
        // Calculate the letter's bounding box
        const charMetrics = ctx.measureText(this.char);
        dp.charWidth = charMetrics.actualBoundingBoxLeft + 
            charMetrics.actualBoundingBoxRight;
        const charHeight = charMetrics.fontBoundingBoxAscent;
    
        dp.x = (this.index === 0) ? stringDp.stringStartX :
            this.parent.letterGraphics[this.index-1].drawParams.bbox.r + 
            stringDp.charSpacing;
        dp.y = stringDp.baselineY;

        dp.bbox = {
            l: dp.x - 0.5*charMetrics.actualBoundingBoxDescent, 
            r: dp.x - 0.5*charMetrics.actualBoundingBoxDescent + dp.charWidth,
            t: dp.y - charMetrics.actualBoundingBoxAscent,
            b: dp.y + charMetrics.actualBoundingBoxDescent
        };

        dp.attachPoints = {
            correspTop: {x: (dp.bbox.l + dp.bbox.r)/2 , y: dp.bbox.t-charHeight/4},
            correspBtm: {x: (dp.bbox.l + dp.bbox.r)/2 , y: dp.bbox.b+charHeight/4},
            correspRight: {x: dp.bbox.r+charHeight/4, y: (dp.bbox.t + dp.bbox.b)/2},
            repl: {x: (dp.bbox.l + dp.bbox.r)/2 , y: stringDp.top - charHeight/4},
            bondR1: {x: dp.bbox.r + charHeight/12, y: stringDp.top + charHeight/3},
            bondL1: {x: dp.bbox.l , y: stringDp.top + charHeight/3}
        };
    }
    
};





})( window.CopycatJS = window.CopycatJS || {} );