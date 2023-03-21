// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This is the top level container for the Copycat UI elements.
 * 
 */
Namespace.CopycatUi = class {

    /**
     * @constructor
     * 
     * @param {Copycat} copycat - The Copycat instance to watch.
     */
    constructor(copycat) 
    { 
        this.copycat = copycat;
        this.rafId = null;

        // Create the UI elements
        this.topbarUi = new Namespace.TopbarUi(this, 
            document.getElementById('topbar_area'));

        this.inputUi = new Namespace.InputUi(this, 
            document.getElementById('input_area'));
        
        this.workspaceHeaderUi = new Namespace.WorkspaceHeaderUi(this, 
            document.getElementById('workspace_header_area'));

        this.workspaceUi = new Namespace.WorkspaceUi(this, 
            document.getElementById('workspace_area'));

        this.slipnetUi = new Namespace.SlipnetUi(this, 
            document.getElementById('slipnet_area'));

        this.coderackUi = new Namespace.CoderackUi(this, 
            document.getElementById('coderack_area')); 

        this.uiList = [this.topbarUi, this.inputUi, this.workspaceHeaderUi, 
            this.workspaceUi, this.slipnetUi, this.coderackUi];

        // Listen for resize events
        const resizeFunc = this._onResize.bind(this);
        window.addEventListener('resize', resizeFunc);
        window.addEventListener('orientationchange', resizeFunc);

        // Do an initial rendering, after the DOM settles.
        setTimeout( resizeFunc, 250 );
        setTimeout( resizeFunc, 1500 );    
    }


    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this.uiList.forEach( 
            ui => ui._onCopycatStateChange() );
    }


    /**
     * Handler for resize events.
     * @private
     *
     */
    _onResize()
    { 
        if ( this.rafId ) { 
            window.cancelAnimationFrame(this.rafId); }

        this.rafId = window.requestAnimationFrame( 
            () => {          
                this.uiList.forEach( ui => ui._onResize() );
                this.rafId = null;
            }
        );
    }

};


})( window.CopycatJS = window.CopycatJS || {} );