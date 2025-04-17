// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class draws the input widgets.
 * 
 */
Namespace.InputUi = class {

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
        this.msgTimerId = null;
        this.drawParams = {};

        this.bkgndColor = '#b3ddcc';
        this.inputFont = {family:'serif', weight: 'bold', style: 'italic', size: '3.5vmin'};
        this.inputFontColor = '#1581e7';
        this.answerFontColor = '#d20000';
        this.inputDisabledFontColor = '#6eb4f2';
        this.msgFontColor = '#d20000';
        this.inputBkgndColor = '#dfdfdf';
        
        this._buildUi();
    }


    /**
     * Creates the ui elements.
     * @private
     * 
     */
    _buildUi()
    {
        const UiUtils = Namespace.UiUtils;
        
        // Create the main div
        this.mainDiv = UiUtils.CreateElement('div', 
            'input-div', this.parentDiv, 
            {top:'0%', left:'0%', width:'100%', height:'100%',
            border:'1px solid black', borderLeft:'none', 
            background:this.bkgndColor}); 

        // Create the text-input elements
        const wa = this.initialStringInput = UiUtils.CreateElement('input',
            'initial-string-input', this.mainDiv, {left:'3%'}, {type:'text'});
        wa.onkeyup = this._onKeyup.bind(this);

        const wb = this.modifiedStringInput = UiUtils.CreateElement('input',
            'modified-string-input', this.mainDiv, {left:'27%'}, {type:'text'});
        wb.onkeyup = this._onKeyup.bind(this);

        const wc = this.targetStringInput = UiUtils.CreateElement('input',
            'target-string-input', this.mainDiv, {left:'55%'}, {type:'text'});
        wc.onkeyup = this._onKeyup.bind(this);

        const wd = this.answerStringInput = UiUtils.CreateElement('input',
            'answer-string-input', this.mainDiv, {left:'79%'}, {type:'text'});
        wd.readOnly = true;
        wd.className += " noselect";

        // Configure the text-input elements
        const font = this.inputFont;
        for (let w of [wa, wb, wc, wd]) {
            UiUtils.StyleElement(w, {top:'28%', width:'18%', height:'44%',
                textAlign:'center', border:'1px solid gray', 
                fontFamily: font.family, fontWeight: font.weight,
                fontStyle: font.style, fontSize: font.size, 
                color: (w == wd) ? this.answerFontColor : this.inputFontColor, 
                background:this.inputBkgndColor});
            w.setAttribute('spellcheck', 'false');
        }
        const wksp = this.copycat.workspace;
        this.initialStringInput.value = wksp.initialWString.jstring;
        this.modifiedStringInput.value = wksp.modifiedWString.jstring;
        this.targetStringInput.value = wksp.targetWString.jstring;
        this.answerStringInput.value = '?';

        // Arrpws
        this.arrowSpan1 = UiUtils.CreateElement('span', 
            'arrow-span1', this.mainDiv, 
            {top:'28%', left:'21%', width:'6%', height:'44%', display:'flex', 
            alignItems:'center', justifyContent:'center', 
            fontWeight: font.weight, fontStyle: font.style, 
            fontSize: font.size},
            {innerHTML:'<b>&#x2192;</b>'}); 
        this.arrowSpan1.className += " noselect";

        this.arrowSpan2 = UiUtils.CreateElement('span', 
            'arrow-span2', this.mainDiv, 
            {top:'28%', left:'73%', width:'6%', height:'44%', display:'flex', 
            alignItems:'center', justifyContent:'center', 
            fontWeight: font.weight, fontStyle: font.style, 
            fontSize: font.size},
            {innerHTML:'<b>&#x2192;</b>'}); 
        this.arrowSpan2.className += " noselect";

        // Message area
        this.messageDiv = UiUtils.CreateElement('div',
            'message-div', this.mainDiv,
            {top:'74%', left:'0%', width:'100%', height:'24%', display:'flex', 
            alignItems:'center', justifyContent:'center',
            fontWeight: font.weight, fontStyle: font.style, 
            fontSize: '3vmin', color:this.msgFontColor}); 
        this.messageDiv.className += " noselect";   

        // Colon separator
        this.colonDiv = UiUtils.CreateElement('div',
            'colon-div', this.mainDiv,
            {top:'0', left:'45%', width:'10%', height:'100%', display:'flex', 
            alignItems:'center', justifyContent:'center',  
            fontWeight: font.weight,
            fontSize: '6vmin', color:'#606060'});
        this.colonDiv.innerHTML = ':&hairsp;:';
        this.colonDiv.className += " noselect";
    }


    /**
     * Returns the strings that are currently entered in the 
     * input fields.
     * 
     */
    getInputStrings()
    {
        const rawStrings = [this.initialStringInput.value, this.modifiedStringInput.value, this.targetStringInput.value];
        const normStrings = rawStrings.map(s => s.trim().toLowerCase());

        this.initialStringInput.value = normStrings[0];
        this.modifiedStringInput.value = normStrings[1];
        this.targetStringInput.value = normStrings[2];

        return normStrings;
    }


    /**
     * Displays a message beneath the input widgets.
     * 
     */ 
    displayMessage(msg)
    {
        this.messageDiv.innerHTML = msg;
        if (this.msgTimerId !== null) {
            clearTimeout(this.msgTimerId);
        }
        this.msgTimerId = setTimeout(() => {
            this.messageDiv.innerHTML = '';
            this.msgTimerId = null;
        }, 1800);
    }


    /**
     * Handler for resize events.
     * @private
     * 
     */
    _onResize()
    {    
        // Nothing to do here.
    }


    /**
     * Handler for state change events.
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        const copycat = this.copycat;
        const ans = copycat.workspace.finalAnswer;
        this.answerStringInput.value = (copycat.batchMode) ? '?' : ans || '?';
        this._setInputsEnabled(copycat.state != 'running');
    } 


    /**
     * Handler for key-up events.
     * @private
     * 
     */
    _onKeyup(e)
    {
        if (e.key === 'Enter' || e.keyCode === 13) {
            this.copycatUi.workspaceHeaderUi._onResetBtnClick();
        }
    }


    /**
     * Enables or disables the input fields.
     * 
     * @private
     */
    _setInputsEnabled(enabled)
    {
        this.initialStringInput.disabled = !enabled;
        this.modifiedStringInput.disabled = !enabled;
        this.targetStringInput.disabled = !enabled;

        this.initialStringInput.style.color = enabled ? this.inputFontColor : this.inputDisabledFontColor;
        this.modifiedStringInput.style.color = enabled ? this.inputFontColor : this.inputDisabledFontColor;
        this.targetStringInput.style.color = enabled ? this.inputFontColor : this.inputDisabledFontColor;
    }
};


})( window.CopycatJS = window.CopycatJS || {} );
