// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for displaying the state of the Slipnet.
 * 
 */
Namespace.SlipnetUi = class {

    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts
     *  this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.parentDiv = parentDiv;
        this.copycat = copycatUi.copycat;
        this.title = "Slipnet Activation";
        this.nRows = 13;
        this.nCols = 5;
        this.drawParams = {};

        this.bkgndColor = '#fffbcc';
        this.circleColor = '#191970';
        this.titleColor = '#606060';

        this.canvas = Namespace.UiUtils.CreateElement('canvas',
            'slipnet-canvas', parentDiv, {position:'absolute', margin:'0', 
            padding:'0', top:'0%', left:'0%', width:'100%', height:'100%', 
            border: '1px solid', background:this.bkgndColor}
        ); 

        this.nodeInfoList = this._buildNodeInfoList(this.copycat.slipnet);
    }


    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this.redraw();
    } 


    /**
     * Handler for resize events.
     * @private
     *
     */
    _onResize()
    {    
        this.redraw();
    }


    /**
     * Updates the UI.
     * 
     */
    redraw()
    {
        const UiUtils = Namespace.UiUtils;
        const canvas = this.canvas;
        const ctx = canvas.getContext("2d");
        const drawLine = Namespace.UiUtils.DrawLine;
        const dp = this.drawParams;

        // Only if necessary, resize the canvas and clear it
        if ( !UiUtils.RightsizeCanvas(canvas) ) { return; } 
        const rescale = UiUtils.NeedToRescale(this.drawParams, ctx);
        if (rescale) {
            if (!this._updateDrawParams(ctx)) { return; }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the title 
            ctx.font = dp.titleFont;
            ctx.textAlign = "center";
            ctx.fillStyle = this.titleColor;
            ctx.fillText(this.title, dp.titleX, dp.titleY);
        }

        // Draw the circles and maybe their labels
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white'; // For the 'x' overlays
        ctx.textAlign = "center";
        
        const xr = dp.xRadius;
        for (let c=0; c<this.nCols; c++) {
            for (let r=0; r<this.nRows; r++) 
            {
                const n = c*this.nRows + r;
                const node = this.nodeInfoList[n].node;              
                if (!node) { continue; }

                // Erase the previous circle and draw the new one
                const cc = dp.circleCoords[c][r];
                const sq = dp.squareCoords[c][r];
                const radius = Math.max(2, dp.maxRadius * node.activation/100);               
                ctx.clearRect(sq.x, sq.y, sq.w, sq.h);
                ctx.fillStyle = this.circleColor; 
                ctx.beginPath();
                ctx.arc(cc.x, cc.y, radius, 0, 2*Math.PI);
                ctx.fill();
                if (node.isClampedHigh()) { 
                    drawLine(ctx, cc.x-xr, cc.y-xr, cc.x+xr, cc.y+xr);
                    drawLine(ctx, cc.x+xr, cc.y-xr, cc.x-xr, cc.y+xr);
                }

                // Maybe draw the label
                if (rescale) {
                    const nodeText = this.nodeInfoList[n].text;
                    const adjFontSize = (nodeText.length > 1) ? 
                        dp.labelFontSize : dp.labelFontSize + 1;
                    ctx.font = 'italic ' + adjFontSize.toString() + 'px serif';
                    ctx.fillStyle = 'black';
                    const tc = dp.textCoords[c][r];
                    ctx.fillText(nodeText, tc.x, tc.y);
                }
            }
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
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;
    
        // Title params
        dp.titleFontSize = Math.max(8, Math.round(Math.min(w/15, h/32)));
        dp.labelFontSize = Math.max(6, Math.round(dp.titleFontSize/2));
        dp.titleFont = 'italic bold ' + dp.titleFontSize.toString() + 'px Arial';
        ctx.font = dp.titleFont;
        let titleHeight = ctx.measureText(this.title).actualBoundingBoxAscent;
        dp.titleX = w/2;
        dp.titleY = 1.4 * titleHeight;
    
        // Grid params
        const nRows = this.nRows;
        const nCols = this.nCols;
        const topOffset = 1.3 * dp.titleFontSize;
        const cellHeight = Math.round((h-topOffset)/nRows);
        const cellWidthW = Math.round(w/4.6);
        const cellWidthN = 0.75 * cellWidthW;
        const cellWidths = 
            [cellWidthW, cellWidthW, cellWidthN, cellWidthN, cellWidthW];
        
        const mr = dp.maxRadius = 0.5*Math.min(cellWidthN, 0.6*cellHeight) - 1;
        dp.xRadius = dp.maxRadius/5;   
        
        dp.circleCoords = new Array(nCols);
        dp.squareCoords = new Array(nCols);
        dp.textCoords = new Array(nCols);
        for (let c=0; c<nCols; c++) { 
            dp.circleCoords[c] = new Array(nRows); 
            dp.squareCoords[c] = new Array(nRows);
            dp.textCoords[c] = new Array(nRows);
        }

        let prevCellRight = 0;
        for (let c=0; c<nCols; c++) {
            for (let r=0; r<nRows; r++) {
                const n = c*nRows + r;
                const node = this.nodeInfoList[n].node;               
                if (node) { 
                    const cx = prevCellRight + 0.5*cellWidths[c];
                    const cy = topOffset + r*cellHeight + dp.maxRadius + 1;
                    dp.circleCoords[c][r] = 
                        {x:cx, y:cy};
                    dp.squareCoords[c][r] = 
                        {x:cx-mr-1, y:cy-mr-1, w:2*mr+2, h:2*mr+2};
                    dp.textCoords[c][r] = 
                        {x:cx, y:cy + dp.maxRadius + dp.labelFontSize*0.85};
                }
            }
            prevCellRight += cellWidths[c];
        }
        return true;
    }

    
    /**
     * Builds the list of node info objects that will be used to draw the
     * activation circles.
     * 
     * @private 
     */
    _buildNodeInfoList(slipnet)
    {
        const sn = slipnet;

        const nodeInfoList = [
            {'node':sn.opposite, 'text':'Opposite'},
            {'node':sn.stringPositionCategory, 'text':'StringPos Cat'},
            {'node':sn.leftmost, 'text':'Leftmost'},
            {'node':sn.middle, 'text':'Middle'},
            {'node':sn.rightmost, 'text':'Rightmost'},
            {'node':sn.whole, 'text':'Whole'},
            {'node':sn.single, 'text':'Single'},
            {'node':sn.objectCategory, 'text':'Obj Cat'},
            {'node':sn.letter, 'text':'Letter'},
            {'node':sn.group, 'text':'Group'},
            {'node':sn.alphabeticPositionCategory, 'text':'AlphaPos Cat'},
            {'node':sn.first, 'text':'First'},
            {'node':sn.last, 'text':'Last'},
        
            {'node':sn.identity, 'text':'Identity'},
            {'node':sn.directionCategory, 'text':'Dir\'n Cat'},
            {'node':sn.left, 'text':'Left'},
            {'node':sn.right, 'text':'Right'},
            {'node':sn.bondCategory, 'text':'Bond Cat'},
            {'node':sn.predecessor, 'text':'Pred'},
            {'node':sn.successor, 'text':'Succ'},
            {'node':sn.sameness, 'text':'Same'},
            {'node':sn.groupCategory, 'text':'Group Cat'},
            {'node':sn.predecessorGroup, 'text':'Pred Group'},
            {'node':sn.successorGroup, 'text':'Succ Group'},
            {'node':sn.samenessGroup, 'text':'Same Group'},
            {'node':sn.letterCategory, 'text':'Letter Cat'},
             
            {'node':sn.letters[0], 'text':'a'},
            {'node':sn.letters[1], 'text':'b'},
            {'node':sn.letters[2], 'text':'c'},
            {'node':sn.letters[3], 'text':'d'},
            {'node':sn.letters[4], 'text':'e'},
            {'node':sn.letters[5], 'text':'f'},
            {'node':sn.letters[6], 'text':'g'},
            {'node':sn.letters[7], 'text':'h'},
            {'node':sn.letters[8], 'text':'i'},
            {'node':sn.letters[9], 'text':'j'},
            {'node':sn.letters[10], 'text':'k'},
            {'node':sn.letters[11], 'text':'l'},
            {'node':sn.letters[12], 'text':'m'},

            {'node':sn.letters[13], 'text':'n'},
            {'node':sn.letters[14], 'text':'o'},
            {'node':sn.letters[15], 'text':'p'},
            {'node':sn.letters[16], 'text':'q'},
            {'node':sn.letters[17], 'text':'r'},
            {'node':sn.letters[18], 'text':'s'},
            {'node':sn.letters[19], 'text':'t'},
            {'node':sn.letters[20], 'text':'u'},
            {'node':sn.letters[21], 'text':'v'},
            {'node':sn.letters[22], 'text':'w'},
            {'node':sn.letters[23], 'text':'x'},
            {'node':sn.letters[24], 'text':'y'},
            {'node':sn.letters[25], 'text':'z'},

            {'node':null, 'text':''},
            {'node':null, 'text':''},
            {'node':null, 'text':''},
            {'node':sn.length, 'text':'Length'},
            {'node':sn.numbers[0], 'text':'One'},
            {'node':sn.numbers[1], 'text':'Two'},
            {'node':sn.numbers[2], 'text':'Three'},
            {'node':sn.numbers[3], 'text':'Four'},
            {'node':sn.numbers[4], 'text':'Five'},
            {'node':sn.bondFacet, 'text':'Bond Facet'},
            {'node':null, 'text':''},
            {'node':null, 'text':''},
            {'node':null, 'text':''},      
        ];
        return nodeInfoList;
    }

};


})( window.CopycatJS = window.CopycatJS || {} );

