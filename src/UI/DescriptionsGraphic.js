// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the Descriptions of 
 * letters in a given string.
 * 
 */
Namespace.DescriptionsGraphic = class 
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

        this.descriptionGraphics = 
            stringGraphic.lettersGraphic.letterGraphics.map(
                lg => new Namespace.DescriptionGraphic(lg, this));
    }


    /**
     * Draws the descriptions. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        this.descriptionGraphics.forEach(g => g.redraw(ctx));                    
    }
};


/**
 * @classdesc
 * This class draws a single Description.
 * 
 */
Namespace.DescriptionGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {LetterGraphic} lg - The associated LetterGraphic.
     * @param {DescriptionsGraphic} parent - The DescriptionsGraphic that 
     *     owns this object.
     */
    constructor(lg, parent) 
    { 
        this.letterGraphic = lg;
        this.parent = parent;
        this.drawParams = {};
    }

    /**
     * Draws the Description graphics. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        if (Namespace.UiUtils.NeedToRescale(this.drawParams, ctx)) {
            this._updateDrawParams(ctx);
        }
        
        const wkspUi = this.parent.wkspUi;
        const dp = this.drawParams; 
        ctx.textAlign = 'left';
        ctx.fillStyle = wkspUi.descriptionColor;

        const descrips = this.letterGraphic.letter.descriptions;
        for (let i=0; i<descrips.length; i++) {
            const descriptor = descrips[i].descriptor;
            ctx.font =  descriptor.isFullyActive() ? dp.boldFont : dp.normalFont;
            ctx.fillStyle = descriptor.isFullyActive() ? 
                wkspUi.activeDescriptionColor : wkspUi.descriptionColor;
            ctx.fillText(descriptor.shortName, dp.x, 
                dp.y - i*1.2*dp.fontSize);
        }
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
        const letterDp = this.letterGraphic.drawParams;
        const stringDp = this.letterGraphic.parent.stringGraphic.drawParams;
        dp.fontSize = Math.round(letterDp.fontSize/2.5);
        dp.normalFont = 'italic ' + dp.fontSize.toString() + 'px serif';
        dp.boldFont = 'italic bold ' + dp.fontSize.toString() + 'px serif';
   
        dp.x = letterDp.bbox.l;
        dp.y = stringDp.top - letterDp.fontSize;
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );