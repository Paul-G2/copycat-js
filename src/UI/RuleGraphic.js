// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class draws the final Rule that copycat has found.
 * 
 */
Namespace.RuleGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent Ui.
     * 
     */
    constructor(workspaceUi) 
    {  
        this.wkspUi = workspaceUi; 
        this.wksp = workspaceUi.workspace; 
        this.drawParams = {};
    }


    /**
     * Draws the Rule text.
     * 
     */
    redraw(ctx)
    {
        if (!this.wksp.finalAnswer) { return; }

        const ruleText = this.wksp.rule ? this.wksp.rule.synopsis(0) : "";        
        if (ruleText) {
            this._updateDrawParams(ctx, ruleText);

            const dp = this.drawParams;
            ctx.strokeStyle = this.wkspUi.ruleColor;
            ctx.fillStyle = this.wkspUi.ruleColor;
            ctx.textAlign = 'center';
            ctx.setLineDash([]);
            ctx.font = dp.font;
            dp.textLines.forEach(line => ctx.fillText(line.text, line.x, line.y));

            ctx.beginPath();
            ctx.rect(...dp.rect1);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.rect(...dp.rect2);
            ctx.stroke();
        }
    }            


    /** 
     * Recalculates the drawing parameters for this object.
     * 
     * @private
     */
    _updateDrawParams(ctx, ruleText)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        const dp = this.drawParams;
        dp.canvasWidth = w; dp.canvasHeight = h;

        const targetStringDp = this.wkspUi.targetStringGraphic.drawParams;
        const fontSize = Math.max(10, Math.round(targetStringDp.fontSize/2)); 
        dp.font = 'italic ' + fontSize.toString() + 'px serif';

        dp.textLines = [];
        if (!ruleText) { return; }
            
        // Split the text into lines
        ctx.font = dp.font;
        let lines = [];
        let lineCount = 0;
        let tmpTxt = ruleText.split(" ");
        lines[lineCount] = [];
        for (let t = 0; t < tmpTxt.length; t++) {
            if (ctx.measureText(lines[lineCount].join(" ")).width > 0.33*w) {
                let lastItem = lines[lineCount].pop();
                lineCount++;
                lines[lineCount] = [lastItem];
            }
            lines[lineCount].push(tmpTxt[t]);
        }
        lines = lines.map(line => line.join(" "));
        const measures = lines.map(line => ctx.measureText(line));

        // Calculate the text line positions
        const xc = this.wkspUi.modifiedStringGraphic.drawParams.stringCenterX;
        const y0 = targetStringDp.baselineY + 6*fontSize;
        const yStep = 1.3 * fontSize; 
        dp.textLines = lines.map((line,i) => { 
            return {text:line, x:xc, y: y0 + i*yStep}; });

        // Calculate the bounding box locations
        const maxLineWidth = Math.max(...measures.map(m => m.width));
        const left = xc - 0.5*maxLineWidth;
        const top = y0 - measures[0].actualBoundingBoxAscent;
        const bbox = {x:left, y:top, w:maxLineWidth, h: y0 + yStep*(lines.length-1) - top};
        
        let inflate = 0.66 * fontSize;
        dp.rect1 = [bbox.x - inflate, bbox.y - inflate, bbox.w + 2*inflate, bbox.h + 2*inflate];
            
        inflate = 1.0 * fontSize;
        dp.rect2 = [bbox.x - inflate, bbox.y - inflate, bbox.w + 2*inflate, bbox.h + 2*inflate];
    }

};





})( window.CopycatJS = window.CopycatJS || {} );