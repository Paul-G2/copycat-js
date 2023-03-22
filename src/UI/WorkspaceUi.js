// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for displaying the state of the Workspace.
 * 
 */
Namespace.WorkspaceUi = class 
{
    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.copycat = copycatUi.copycat;
        this.workspace = this.copycat.workspace;
        this.parentDiv = parentDiv;

        // Specify colors
        this.groupColor = '#00ff00';
        this.bondColor = '#1581e7';
        this.correspColor = '#a020f0';
        this.letterColor = '#000000';
        this.answerLetterColor = '#d20000';
        this.replColor = '#964B00';
        this.ruleColor = '#d20000';
        this.descriptionColor = '#c0c0c0';
        this.activeDescriptionColor = '#909090';        

        // Create my canvas
        this.canvas = Namespace.UiUtils.CreateElement('canvas', 
            'wksp-canvas', parentDiv, {position:'absolute', 
            top:'0%', left:'0%', width:'100%', height:'100%', 
            border: '1px solid', borderTop:0, borderLeft:'none',
            background:'#fafafa', zIndex:1}
        );

        // Create my flasher
        this.flasher = new Namespace.Flasher(this);

        // Create my graphics objects
        this.initialStringGraphic = new Namespace.StringGraphic(this, 0);
        this.modifiedStringGraphic = new Namespace.StringGraphic(this, 1);
        this.answerStringGraphic = new Namespace.StringGraphic(this, 2);
        this.targetStringGraphic = new Namespace.StringGraphic(this, 3);
        this.arrowGraphic = new Namespace.ArrowGraphic(this);
        this.ruleGraphic = new Namespace.RuleGraphic(this);
        this.replacementsGraphic = new Namespace.ReplacementsGraphic(this);
        this.corrsGraphic = new Namespace.CorrsGraphic(this);
        
        this.allGraphics = [
            this.initialStringGraphic,
            this.modifiedStringGraphic,
            this.targetStringGraphic,
            this.answerStringGraphic,            
            this.arrowGraphic,
            this.ruleGraphic,
            this.replacementsGraphic,
            this.corrsGraphic
        ];
    }


    /**
     * Gets the StringGraphic object for a specified string.
     * 
     * @param {WorkspaceString} wstring - The string to search on.
     */
    getStringGraphic(wstring)
    {
        const wksp = this.workspace;
        return (wstring === wksp.initialWString) ? this.initialStringGraphic : 
            (wstring === wksp.targetWString) ? this.targetStringGraphic :
            (wstring === wksp.modifiedWString) ? this.modifiedStringGraphic :
            (wstring === wksp.answerWString) ? this.answerStringGraphic :
            null;
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

        // Resize the canvas if necessary
        if ( !UiUtils.RightsizeCanvas(canvas) ||
             !UiUtils.RightsizeCanvas(this.flasher.canvas)) { return; } 

        // Bounce out if the input strings haven't been set
        if (!this.copycat.workspace.initialWString) { return; }

        // Avoid redrawing while flashing
        if ( !this.flasher.isIdle() ) { return; }

        // Re-draw all the graphics
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.allGraphics.forEach( 
            g => g.redraw(ctx) 
        );
    }


    /**
     * Flashes the specified graphic item.
     * 
     * @param {Graphic} item - The item to flash.
     * @param {Number} flashCount - The number of times to flash.
     * 
     */
    flash(graphic, flashCount)    
    {
        this.flasher.flash(graphic, flashCount);
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );
