// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the Workspace
 *   header area.
 * 
 */
Namespace.WorkspaceHeaderUi = class 
{
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
        this.title = "Workspace";
        this.drawParams = {};

        this.bkgndColor = '#fafafa';
        this.fontColor = '#606060';

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

        this.ctrlsDiv = UiUtils.CreateElement('div', 
            'workspace-header-ctrls-div', this.parentDiv, {position:'absolute', 
            top:'0%', left:'0%', right:'70%', height:'100%', 
            background:this.bkgndColor, borderTop:'1px solid'}
        );
        
        this.canvas = UiUtils.CreateElement('canvas', 
            'workspace-header-canvas', this.parentDiv, {position:'absolute', 
            top:'0%', left:'30%', width:'70%', height:'100%', 
            background:this.bkgndColor, borderTop: '1px solid'}
        );
        
        this.stepBtn = UiUtils.CreateElement('button', 'step_btn', 
            this.ctrlsDiv, {width:'15%', height:'40%', top:'12%', left:'8%',
            border:0, background:this.bkgndColor});
        this.stepBtn.innerHTML = 
            '<img class="button-img" src="./btn_step.png" border="0" width="100% height="auto">';
        this.stepBtn.onclick = this._onStepBtnClick.bind(this);
        this.stepBtn.className += " noselect";

        this.goBtn = UiUtils.CreateElement('button', 'go_btn', 
            this.ctrlsDiv, {width:'15%', height:'40%', top:'12%', left:'31%',
            border:0, background:this.bkgndColor});
        this.goBtn.innerHTML = 
            '<img class="button-img" src="./btn_play.png" border="0" width="100% height="auto">';
        this.goBtn.onclick = this._onGoBtnClick.bind(this);
        this.goBtn.className += " noselect";

        this.pauseBtn = UiUtils.CreateElement('button', 'pause_btn', 
            this.ctrlsDiv, {width:'15%', height:'40%', top:'12%', left:'54%',
            border:0, background:this.bkgndColor});
        this.pauseBtn.innerHTML = 
            '<img class="button-img" src="./btn_pause.png" border="0" width="100% height="auto">';
        this.pauseBtn.onclick = this._onPauseBtnClick.bind(this);
        this.pauseBtn.className += " noselect";

        this.resetBtn = UiUtils.CreateElement('button', 'reset_btn', 
            this.ctrlsDiv, {width:'15%', height:'40%', top:'12%', left:'77%',
            border:0, background:this.bkgndColor});
        this.resetBtn.innerHTML = 
            '<img class="button-img" src="./btn_reset.png" border="0" width="100% height="auto">';
        this.resetBtn.onclick = this._onResetBtnClick.bind(this);
        this.resetBtn.className += " noselect";

        this.speedSlider = UiUtils.CreateElement('input', 'speed_slider',
            this.ctrlsDiv, {width:'70%', height:'10%', top:'60%', left:'15%',
            accentColor:this.fontColor},
            {type:'range', min:1, max:100, value:55});
        this.speedSlider.draggable = true;
        this.speedSlider.ondragstart = function(e) { 
            e.preventDefault(); 
            e.stopImmediatePropagation();};
        this.speedSlider.oninput = this._onSpeedSliderChange.bind(this);
        this.speedSlider.className += " noselect";

        this.speedSliderLabel = UiUtils.CreateElement('span', 'speed-slider-label',
            this.ctrlsDiv, {width:'100%', height:'17%', top:'77%', left:'0%',
            display:'flex', alignItems:'center', justifyContent:'center',
            font:'italic bold 18px Arial', color:this.fontColor});
        this.speedSliderLabel.innerHTML = 'Speed';
        this.speedSliderLabel.className += " noselect";
    }


    /**
     * Handler for go button clicks.
     * @private
     * 
     */
    _onGoBtnClick()
    {
        const copycat = this.copycat;

        if (this._checkInputStrings()) {
            if (copycat.state == 'ready' || copycat.state == 'done') {
                copycat.start();
            }
            else if (copycat.state == 'paused') {
                copycat.resume();
            }
        }        
    }


    /**
     * Handler for single-step button clicks.
     * @private
     * 
     */
    _onStepBtnClick()
    {
        if (this._checkInputStrings()) {
            this.copycat.singleStep();
        }
    }


    /**
     * Handler for pause button clicks.
     * @private
     * 
     */
    _onPauseBtnClick()
    {
        this.copycat.pause();
    }


    /**
     * Handler for reset button clicks.
     * @private
     * 
     */
    _onResetBtnClick()
    {
        if ( (this.copycat.state != 'running') && this._checkInputStrings()) {
            this.copycat.reset();
        }
    }


    /**
     * Handler for speed-slider changes.
     * @private
     * 
     */
    _onSpeedSliderChange()
    {
        const sv = this.speedSlider.value;
        const delay = (sv == this.speedSlider.max) ? 0 : 1000/(1 + sv*sv/100);
        this.copycat.setStepDelay(delay);
    }


    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this.redraw();
        this._updateEnabledState();
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
     * Checks whether all input strings are valid.
     * @private 
     * 
     */
    _checkInputStrings()
    {
        const wksp = this.copycat.workspace;
        const inputStrings = this.copycatUi.inputUi.getInputStrings();
        const wkspStrings = [wksp.initialJString, wksp.modifiedJString, wksp.targetJString];
        const inputModified = !inputStrings.every((str, idx) => str.toLowerCase() == wkspStrings[idx]);
        
        if (inputModified) {
            if (inputStrings.every(this.copycat.checkInputString)) {
                this.copycat.setStrings(...inputStrings);
                return true;
            }   
            else {
                this.copycatUi.inputUi.displayMessage('Invalid input!');
                return false;
            }
        }
        else {
            return true;
        }
    }

 
    /**
     * Updates the enabled/disabled state of the control buttons,
     * based on the current copycat state.
     * @private
     * 
     */
    _updateEnabledState()
    {
        const controls = [this.stepBtn, this.goBtn, this.pauseBtn, this.resetBtn];
        for (let ctrl of controls) {
            this._setEnabled(ctrl, true);
        }

        switch (this.copycat.state) 
        {
            case 'ready':
                this._setEnabled(this.pauseBtn, false);
                break;
            case 'paused':
                this._setEnabled(this.pauseBtn, false);
                break;
            case 'running':
                this._setEnabled(this.stepBtn, false);
                this._setEnabled(this.goBtn, false);
                this._setEnabled(this.resetBtn, false);
                break;
            case 'done':
                this._setEnabled(this.stepBtn, false);
                this._setEnabled(this.pauseBtn, false);
                break;
            default:
                break;
        }
    }


    /**
     * Enables or disables a given UI element.
     * @private
     * 
     */
    _setEnabled(element, enabled)
    {
        element.disabled = !enabled;
        element.style.opacity = enabled ? '1.0' : '0.4';
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
        const dp = this.drawParams;

        // Only if necessary, resize the canvas and clear it
        if ( !UiUtils.RightsizeCanvas(canvas) ) { return; } 
        const rescale = UiUtils.NeedToRescale(this.drawParams, ctx);

        if (rescale) {
            if (!this._updateDrawParams(ctx)) { return; }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the title.
            ctx.font = dp.titleFont;
            ctx.textAlign = "center";
            ctx.fillStyle = dp.titleFontColor;
            ctx.fillText(this.title, ...dp.titleLoc);

            // Maintain the button-image aspect ratios.
            const buttonImgs = document.getElementsByClassName("button-img");
            for (let img of buttonImgs) {               
                img.style.width = dp.btnImgWidth;
                img.style.height = dp.btnImgHeight;
            }

            // Resize the speed slider label
            UiUtils.StyleElement(this.speedSliderLabel, 
                {fontSize:dp.speedSliderFontSize});

            // Draw the thermometer Bulb
            ctx.lineWidth = 1;
            ctx.fillStyle = "red";
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            ctx.arc(dp.bulbCtr.x, dp.bulbCtr.y, dp.bulbRadius, 0, 2*Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(dp.bulbCtr.x, dp.bulbCtr.y, dp.bulbRadius, 0.464, 5.820);
            ctx.stroke();
            
            // Endcap
            ctx.beginPath();
            ctx.arc(dp.bulbCtr.x + dp.stemLength, dp.bulbCtr.y, 
                dp.stemRadius, 1.5*Math.PI, 0.5*Math.PI);
            ctx.stroke();

            // Tick marks
            dp.tickMarks.forEach(t => UiUtils.DrawLine(ctx, ...t));
        }

        // Draw the number of codelets run
        const copycat = this.copycat;
        const numCodeletsRun = copycat.coderack.numCodeletsRun;
        ctx.font = dp.subTitleFont;
        ctx.fillStyle = dp.titleFontColor;
        ctx.clearRect(...dp.subTitleRect);
        ctx.fillText('(Codelets run: ' + numCodeletsRun.toString() + ')', 
            ...dp.subTitleLoc);

        // Draw the thermometer stem
        const temperature = Math.max(0, Math.min(100, 
            copycat.temperature.value().toFixed(0))); 
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'black';
        ctx.clearRect(...dp.hgRect);
        ctx.fillRect(dp.hgRect[0], dp.hgRect[1], 
            (dp.hgRect[2]-1)*(temperature/100), dp.hgRect[3]);
        UiUtils.DrawLine(ctx, ...dp.hgTopLine);
        UiUtils.DrawLine(ctx, ...dp.hgBtmLine);
               
        // Draw the temperature value
        ctx.font = dp.tempFont;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        ctx.clearRect(...dp.tempTextRect);
        ctx.fillText(temperature.toString(), ...dp.tempTextLocation); 
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

        // Maintain the button-image aspect ratios.
        dp.btnImgWidth = 'auto';
        dp.btnImgHeight = '100%';
        const img = document.getElementsByClassName("button-img")[0];
        if (img.parentNode.clientHeight > img.parentNode.clientWidth) { 
            dp.btnImgWidth = '100%';
            dp.btnImgHeight = 'auto';
        }

        // Speed slider font size
        dp.speedSliderFontSize = Math.round(0.15*h);

        // Title
        dp.titleFontColor = this.fontColor;
        dp.titleFontSize = Math.round(Math.min(0.35*h, 0.0875*w));
        dp.titleFont = 'italic bold ' + dp.titleFontSize.toString() + 'px Arial';
        dp.titleLoc = [(2/7)*w, 0.45*h];
        const titleMetrics = ctx.measureText(this.title);
        
        // Subtitle
        dp.subTitleFontSize = Math.round(dp.titleFontSize/2);
        dp.subTitleFont = 'italic bold ' + dp.subTitleFontSize.toString() + 'px Arial';
        dp.subTitleLoc = [dp.titleLoc[0], dp.titleLoc[1] + 1.85*dp.subTitleFontSize];
        let rectTop = dp.titleLoc[1] + titleMetrics.actualBoundingBoxDescent + 1;
        dp.subTitleRect = [0, rectTop, 0.7*w - h/12 - 1, h - rectTop];
        
        // Thermometer
        dp.bulbCtr = {x:0.70*w, y:0.5*h};
        dp.bulbRadius = h/12;
        dp.stemLength = 0.225*w;
        dp.stemRadius= dp.bulbRadius/2;

        // Thermometer tickmarks
        let x = dp.bulbCtr.x + 1.5*dp.bulbRadius;
        let dx = (dp.stemLength - 1.5*dp.bulbRadius)/8;
        let ya = dp.bulbCtr.y - dp.stemRadius;
        let yb1 = ya - dp.stemRadius;
        let yb2 = yb1 - 0.7*dp.stemRadius;
        dp.tickMarks = [];
        for (let i=0; i<9; i++) {
            dp.tickMarks.push([x, ya, x, (i%4 == 0) ? yb2 : yb1]);
            x += dx;
        }

        // Thermometer text
        const tempFontSize = Math.round(2*dp.bulbRadius);
        dp.tempFont = 'italic ' + tempFontSize.toString() + 'px Arial';
        dp.tempTextLocation = [dp.bulbCtr.x + dp.stemLength/2,
            dp.bulbCtr.y + 1.5*tempFontSize]; 
        rectTop = dp.bulbCtr.y + dp.bulbRadius + 2;
        dp.tempTextRect = [dp.bulbCtr.x, rectTop, w - dp.bulbCtr.x, h - rectTop];
        
        // Thermometer stem
        x = dp.bulbCtr.x;
        let y = dp.bulbCtr.y - dp.stemRadius;
        dp.hgRect = [x, y, dp.stemLength, 2*dp.stemRadius];
        dp.hgTopLine = [x + 0.866*dp.bulbRadius, y, x + dp.stemLength, y];
        y += 2*dp.stemRadius;
        dp.hgBtmLine = [x + 0.866*dp.bulbRadius, y, x + dp.stemLength, y];

        return true;
    }
   
};


})( window.CopycatJS = window.CopycatJS || {} );
