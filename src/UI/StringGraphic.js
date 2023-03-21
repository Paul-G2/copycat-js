// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the workspace strings
 * along with their bonds, groups, and descriptions.
 * 
 */
Namespace.StringGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent Ui.
     * @param {Number} quadrant - The string's quadrant.
     * 
     */
    constructor(workspaceUi, quadrant) 
    {   
        this.wkspUi = workspaceUi; 
        this.quadrant = quadrant;
        this.wstring = null;
        this.jstring = ""; 

        this.lettersGraphic = null;
        this.descriptionsGraphic = null;
        this.bondsGraphic = null;
        this.groupsGraphic = null; 

        this.drawParams = {};

        this._updateStringFromWorkspace();
        this._createChildGraphics();
    }


    /**
     * Creates the child graphics objects.
     * @private
     * 
     */
    _createChildGraphics()
    {
        this.lettersGraphic = new Namespace.LettersGraphic(this);

        if (this.quadrant != 2) {
            this.descriptionsGraphic = new Namespace.DescriptionsGraphic(this);
            this.bondsGraphic = new Namespace.BondsGraphic(this);
            this.groupsGraphic = new Namespace.GroupsGraphic(this);
        }
    }


    /**
     * Gets the LetterGraphic or GroupGraphic associated with
     * a given Letter or Group.
     * 
     * @param {Letter|Group} wrappedObject - The search key. 
     */
    getChildGraphic(wrappedObject)
    {
        if (wrappedObject instanceof Namespace.Letter) {
            return this.lettersGraphic.letterGraphics.find( 
                lg => lg.letter == wrappedObject );
        }
        else if (wrappedObject instanceof Namespace.Group) {
            return this.groupsGraphic.groupGraphics.find( 
                g => g.group == wrappedObject );
        }
        return null;
    }

    
    /**
     * Redraws everything 
     * 
     */
    redraw(ctx)
    {
        // Check whether our wrapped string has changed
        let stringChanged = false;
        if ( this._updateStringFromWorkspace() ) {
            this._createChildGraphics();
            stringChanged = true;
        }

        // Update our drawing parameters if necessary
        const UiUtils = Namespace.UiUtils;
        if (stringChanged || UiUtils.NeedToRescale(this.drawParams, ctx)) {
            this._updateDrawParams(ctx);
        }
      
        // Draw our child graphics 
        // (Note that the drawing logic assumes the drawing order shown here.)
        [this.lettersGraphic, this.descriptionsGraphic, 
            this.groupsGraphic, this.bondsGraphic].forEach( g => { 
                if (g) { g.redraw(ctx); }
            }
        );
    }

    
    /** 
     * Check whether the wrapped string has changed.
     * @private
     * 
     */
    _updateStringFromWorkspace()
    {
        const wksp = this.wkspUi.workspace;
        const q = this.quadrant;

        let changed = false;
        if (q == 2) {
            const jstring = wksp.finalAnswer || '?';
            if (this.jstring != jstring) {
                this.jstring = jstring;
                changed = true;
            }
        }
        else {
            const wstring = (q == 0) ? wksp.initialWString : 
                (q == 1) ? wksp.modifiedWString : wksp.targetWString;
            if (this.wstring != wstring) {
                this.wstring = wstring;
                this.jstring = wstring ? wstring.jstring : '';
                changed = true;
            }
        }
        return changed;
    }


    /** 
     * Recalculates the drawing parameters.
     * @private
     * 
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        
        const wksp = this.wkspUi.workspace;
        const inputStrings = [wksp.initialWString, wksp.modifiedWString,
            wksp.targetWString];
        const maxChars = Math.max(...inputStrings.map(s => s.jstring.length));
        dp.fontSize = Math.round(1.1*Math.min(h/18, w/(2.5*maxChars))); 
        dp.font = 'italic bold ' + dp.fontSize.toString() + 'px serif';
        ctx.font = dp.font; // Must set the font before measuring text

        dp.baselineY = (this.quadrant < 2) ? h/3 : 2*h/3;
        
        dp.emWidth = ctx.measureText('m').width;
        
        dp.stringCenterX = (this.quadrant == 0 || this.quadrant == 3) ? 
            w/4 - w/80 : 3*w/4 + w/80;
            
        const charMetrics = this.jstring.split('').map(
            c => ctx.measureText(c) );
        const sumOfCharWidths = charMetrics.reduce( (a,b) => 
            a + b.actualBoundingBoxLeft + b.actualBoundingBoxRight, 0 );
        
        const nChars = this.jstring.length;
        dp.charSpacing = Math.min(5*sumOfCharWidths/nChars, 
            (0.40*w - sumOfCharWidths)/(nChars-1));

        dp.stringWidth = sumOfCharWidths + dp.charSpacing*(nChars-1);
        dp.stringStartX = dp.stringCenterX - dp.stringWidth/2;

        dp.maxCharAscent = Math.max(
            ...(charMetrics.map(m => m.actualBoundingBoxAscent)));
        dp.maxCharDescent = Math.max(
            ...(charMetrics.map(m => m.actualBoundingBoxDescent)));
        dp.top = dp.baselineY - dp.maxCharAscent;
    }
};


})( window.CopycatJS = window.CopycatJS || {} );