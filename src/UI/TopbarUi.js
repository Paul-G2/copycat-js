// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class draws the title bar at the top of the screen.
 * 
 */
Namespace.TopbarUi = class {

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
        this.drawParams = {};

        this._buildUi(parentDiv);  
    }


    /**
     * Creates the ui elements.
     * @private
     * 
     */
    _buildUi()
    {
        const UiUtils = Namespace.UiUtils;

        this.mainDiv = UiUtils.CreateElement('div', 
            'topbar-div', this.parentDiv, 
            {position:'absolute', top:'0%', left:'0%', width:'100%', 
            height:'100%', background:'#bfcbdf'}
        );     
             
        this.logoImg = UiUtils.CreateElement('img', 'logo', this.mainDiv, 
            {width:'auto', top:0, height:'100%', left:'1vh'}, 
            {src:'./cc_logo.png'}
        );
        this.logoImg.className += " noselect";

        this.titleSpan = UiUtils.CreateElement('span', 'title-span', 
            this.mainDiv, {top:'0%', height:'100%', left:'10vh', width:'auto%', 
            display:'flex', alignItems:'center', justifyContent:'left',
            color:'#404040', fontFamily:'Arial', fontWeight:'bold', 
            fontStyle:'italic', fontSize: '4.25vh'}
        ); 
        this.titleSpan.innerHTML = 'Copycat';
        this.titleSpan.className += " noselect";
    }


    /**
     * Handler for state change events.
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        // Nothing to do here
    }


    /**
     * Handler for resize events.
     * @private
     * 
     */
    _onResize()
    {    
        // Nothing to do here
    }
};


})( window.CopycatJS = window.CopycatJS || {} );
