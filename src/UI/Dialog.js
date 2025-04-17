// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This class implements a draggable dalog box.
 * 
 */
Namespace.Dialog = class 
{   
    /**
     * @constructor
     * 
     * @param {HTMLElement} [parent=document.body] - The dialog's parent element.
     * @param {Number} width - The dialog width, in percentage units
     * @param {Number} height - The dialog height, in percentage units.
     * @param {String} [title] - Text to be displayed on the dialog's title bar.
     * @param {Boolean} [modal=false] - Whether the dialog is modal. (Currently only non-modal is supported.)
     * @param {String} [bkgndColor] - The dialog's background color.
     * @param {String} [titleBarColor] - The dialog's title bar color.
     */
    constructor(parent, width, height, title, modal, bkgndColor, titleBarColor)
    {
        this.parent        = parent || document.body;
        this.width         = width;
        this.height        = height;
        this.modal         = modal; // Not supported yet
        this.mainDiv       = null;
        this.startPos      = [0,0];  
        this.mouseDownLoc  = [0,0];  
        this.dragStartFunc = this._onDragStart.bind(this);
        this.dragMoveFunc  = this._onDragMove.bind(this);
        this.dragEndFunc   = this._onDragEnd.bind(this);
        this.onOk          = null;
        this.onCancel      = null;
        this.fontFamily    = 'verdana, arial, helvetica, sans-serif';

        // Create the user interface
        this._initUi( (title || ""), (bkgndColor || 'white'), (titleBarColor || bkgndColor || 'white') );      
    }


    /**
     * Lays out the UI.
     * @private
     * 
     * @param {String} [title] - Text to be displayed in the dialog's title bar.
     * @param {String} [bkgndColor] - The dialog's background color.
     * @param {String} [titleBarColor] - The dialog's title bar color.
     * 
     */
    _initUi(title, bkgndColor, titleBarColor)
    {
        const UiUtils = Namespace.UiUtils;

        // Container div
        this.mainDiv = UiUtils.CreateElement('div', 'dialog_maindiv', this.parent); 
        UiUtils.StyleElement(this.mainDiv, {display:'none', width:
            this.width.toString() + '%', height:this.height.toString() + '%', 
            left:((100 - this.width)/2).toString() + '%', 
            top:((100 - this.height)/2).toString() + '%', 
            zIndex:'10', backgroundColor:bkgndColor,
            border:'1px solid black'} );
            
        // Titlebar 
        const titleFontSize = (.03 * this.height).toString() + 'vh';
        this.titleDiv = UiUtils.CreateElement('div', 'dialog_titlediv', this.mainDiv); 
        this.titleDiv.innerHTML = title;
        UiUtils.StyleElement(this.titleDiv, {
            width:'95%',height:'5%',
            left:'0px', top:'0px', display:'flex', alignItems:'center', justifyContent:'center',
            backgroundColor:titleBarColor, fontSize:titleFontSize, fontFamily:this.fontFamily} 
        );
        this.titleDiv.className += ' noselect';
        this.titleDiv.addEventListener( 
            (UiUtils.isTouchDevice() ? 'touchstart' : 'mousedown'), this.dragStartFunc);  

        // Close button
        this.closeDiv = UiUtils.CreateElement('div', 'dialog_closediv', this.mainDiv); 
        this.closeDiv.innerHTML = 'X';
        UiUtils.StyleElement(this.closeDiv, {
            width:'5%', height:'5%', 
            right:'0px', top:'0px', display:'flex', alignItems:'center', justifyContent:'center',
            backgroundColor:titleBarColor, fontSize:titleFontSize, fontFamily:this.fontFamily} 
        );
        this.closeDiv.className += ' noselect';
        this.closeDiv.addEventListener( (UiUtils.isTouchDevice() ? 'touchstart' : 'click'), this._onTitleBarClose.bind(this) ); 
        this.closeDiv.addEventListener('mouseover', function() { this.closeDiv.style.fontWeight = 'bold'; }.bind(this) ); 
        this.closeDiv.addEventListener('mouseout',  function() { this.closeDiv.style.fontWeight = 'normal'; }.bind(this) ); 

        // User content div
        this.userDiv = UiUtils.CreateElement('div', 'dialog_userdiv', this.mainDiv); 
        UiUtils.StyleElement(this.userDiv, {bottom:'0px', left:'0px', width:'100%', height:'95%'} ); 
    }


    /**
     * Shows the dialog.
     * 
     * @param {Function} [onOk] - Function to invoke if the dialog's OK button is clicked.
     * @param {Function} [onCancel] - Function to invoke if the dialog is cancelled.
     * 
     */
    show(onOk, onCancel)
    {
        if (onOk) { this.onOk = onOk; }
        if (onCancel) { this.onCancel = onCancel; }

        this.mainDiv.style.display = 'inline-block';  
    }


    /**
     * Hides the dialog.
     * 
     */
    hide()
    {
        this.mainDiv.style.display = 'none';  
    }


    /**
     * Indicates whether the dialog is currenty shown.
     * 
     */
    isShown()
    {
        return this.mainDiv.style.display != 'none';  
    }


    /**
     * Handler for clicks on the dismiss button. (Sub-classes can override.)
     * @private
     * 
     */
    _onTitleBarClose()
    {
        if (this.onCancel) { this.onCancel(this); }
        this.hide();  
    }


    /**
     * Handler for drag-start events.
     * @private
     * 
     * @param {Event} event - Event info.
     * 
     */
    _onDragStart(event)
    {
        const mouseLoc = this._getEventCoordinates(event);
        if ( (mouseLoc[0] !== null) && (mouseLoc[1] !== null) ) 
        { 
            event.preventDefault();
            
            const rect = this.mainDiv.getBoundingClientRect();
            this.startPos = {x:rect.left, y:rect.top};
            this.mouseDownLoc = mouseLoc;

            document.addEventListener( (Namespace.UiUtils.isTouchDevice() ? 'touchmove' : 'mousemove'), this.dragMoveFunc );  
            document.addEventListener( (Namespace.UiUtils.isTouchDevice() ? 'touchend touchcancel' : 'mouseup'), this.dragEndFunc );  
        }
    }


    /**
     * Handler for drag-move events.
     * @private
     * 
     * @param {Event} event - Event info.
     * 
     */
    _onDragMove(event)
    {
        const mouseLoc = this._getEventCoordinates(event);
        if ( (mouseLoc[0] !== null) && (mouseLoc[1] !== null) ) 
        { 
            event.preventDefault();
            const w = parseFloat(this.mainDiv.style.width);
            const pw = this.parent.clientWidth || 1024;
            const ph = this.parent.clientHeight || 1024;
            const newX = Math.max(64-w, Math.min(pw-64, this.startPos.x + mouseLoc[0]-this.mouseDownLoc[0]));
            const newY = Math.max(0,    Math.min(ph-64, this.startPos.y + mouseLoc[1]-this.mouseDownLoc[1]));
            this.mainDiv.style.left = newX.toString() + 'px';  
            this.mainDiv.style.top  = newY.toString() + 'px';  
        }
    }


    /**
     * Handler for drag-end events.
     * @private
     * 
     * @param {Event} event - Event info.
     * 
     */
    // eslint-disable-next-line no-unused-vars
    _onDragEnd(event)
    {
        document.removeEventListener( (Namespace.UiUtils.isTouchDevice() ? 'touchmove' : 'mousemove'), this.dragMoveFunc );  
        document.removeEventListener( (Namespace.UiUtils.isTouchDevice() ? 'touchend touchcancel' : 'mouseup'), this.dragEndFunc );  
    }


    /**
     * Gets the coordinates from a given event.
     * @private
     * 
     * @param {Event} event - Event info.
     * 
     */
    _getEventCoordinates(event)
    {
        // Read the event coordinates
        let cx1 = event.clientX;
        let cy1 = event.clientY;

        if ( (typeof(cx1) == 'undefined') || (typeof(cy1) == 'undefined') || (cx1 === null) || (cy1 === null) ) {
            if ( this.isTouchDevice && event.originalEvent && event.originalEvent.targetTouches ) { 
                if (event.originalEvent.targetTouches.length > 0)  {
                    cx1 = event.originalEvent.targetTouches[0].clientX;
                    cy1 = event.originalEvent.targetTouches[0].clientY;
                }
            }
        }
        if ( (typeof(cx1) == 'undefined') || (typeof(cy1) == 'undefined') ) {
            cx1 = cy1 = null;
        }
        return [cx1, cy1];
    }

};

})( window.CopycatJS = window.CopycatJS || {} );


