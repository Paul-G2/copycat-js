// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for displaying transient animated graphics.
 * 
 */
Namespace.Flasher = class 
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
        this.copycat = workspaceUi.copycat;

        // Create my flash canvas
        this.canvas = Namespace.UiUtils.CreateElement('canvas', 
            'flash-canvas', this.wkspUi.parentDiv, {position:'absolute', 
            top:'0%', left:'0%', width:'100%', height:'100%', 
            border: '1px solid', borderTop:0, borderLeft:'none',
            zIndex:2}
        );

        this.canvasCtx = this.canvas.getContext("2d");
        this.flashables = [];
        this.state = 'idle';
        this.rafId = null;
    }


    /**
     * Flashes a graphic a specified number of times.
     * 
     * @param {Graphic} graphic - The graphic to flash.
     * @param {Number} flashCount - The number of times to flash.
     *
     */
    flash(graphic, flashCount)
    {
        if (flashCount <= 0) { return; }
        if (this.copycat.stepDelay < 10) { return;} // Don't flash if we're trying to run fast

        this.flashables.push( {graphic:graphic, flashCount:flashCount} );

        if (this.state == 'idle') { 
            this.state = 'running';
            this._animationLoop();
        }     
    }


    /**
     * Indicated whether the animation loop is idle.
     * 
     */
    isIdle()
    {
        return (this.state == 'idle');
    }


    /**
     * Runs the animation loop.
     * 
     */
    _animationLoop()
    { 
        window.requestAnimationFrame( () => 
        {          
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw the first-in-line item
            const f = this.flashables[0];
            f.graphic.redraw(this.canvasCtx);
            f.flashCount--;
            if (f.flashCount <= 0) {
                this.flashables.shift();
            }

            // Erase everything after a delay
            setTimeout( () => {
                window.requestAnimationFrame( () => {    
                    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    if (this.flashables.length === 0) {
                        this.state = 'idle';
                        this.wkspUi.redraw();
                    } else {
                        setTimeout(
                            () => { this._animationLoop(); }, 
                            Math.min(100, 1.5*this.copycat.stepDelay)
                        );
                    }
                });
            },  Math.min(100, 1.5*this.copycat.stepDelay));
        });        
    }

};


})( window.CopycatJS = window.CopycatJS || {} );