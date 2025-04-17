// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for displaying the batch-mode user interface.
 * 
 */
Namespace.BatchmodeUi = class 
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
        this.parentDiv = parentDiv;      

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

        this.parentDiv.style.background = this.bkgndColor;
        this.parentDiv.style.borderTop = '1px solid';

        this.ctrlsDiv = UiUtils.CreateElement('div', 
            'batchmode-ctrls-div', this.parentDiv, {position:'absolute', 
            top:'0%', left:'0%', right:'82%', height:(6/0.85.toString())+'%', background:this.bkgndColor}
        );

        this.goBtn = UiUtils.CreateElement('button', 'go_btn', 
            this.ctrlsDiv, {width:'15%', height:'80%', top:'24%', left:'31%', border:0, background:this.bkgndColor});
        this.goBtn.innerHTML = '<img class="button-img" src="./btn_play.png" border="0" width="100% height="auto">';
        this.goBtn.onclick = this._onGoBtnClick.bind(this);
        this.goBtn.className += " noselect";

        this.pauseBtn = UiUtils.CreateElement('button', 'pause_btn', 
            this.ctrlsDiv, {width:'15%', height:'80%', top:'24%', left:'54%', border:0, background:this.bkgndColor});
        this.pauseBtn.innerHTML = '<img class="button-img" src="./btn_pause.png" border="0" width="100% height="auto">';
        this.pauseBtn.onclick = this._onPauseBtnClick.bind(this);
        this.pauseBtn.className += " noselect";

        this.resetBtn = UiUtils.CreateElement('button', 'reset_btn', 
            this.ctrlsDiv, {width:'15%', height:'80%', top:'24%', left:'77%', border:0, background:this.bkgndColor});
        this.resetBtn.innerHTML = '<img class="button-img" src="./btn_reset.png" border="0" width="100% height="auto">';
        this.resetBtn.onclick = this._onResetBtnClick.bind(this);
        this.resetBtn.className += " noselect";

        this.progressDiv = UiUtils.CreateElement('div', 
            'batchmode-progress-div', this.parentDiv, {position:'absolute', top:'0%', right:'10%', width:'18%', 
            height:(6/0.85.toString())+'%', background:this.bkgndColor, display:'flex', alignItems:'center', justifyContent:'right',
            color:'#404040', fontFamily:'Arial', fontWeight:'normal', fontSize: '2vh'}
        );

        this.tableDiv = UiUtils.CreateElement('div', 'batchmode-table-div', this.parentDiv, {position:'absolute', 
            top:'15%', left:'10%', width:'80%', height:'70%', background:this.bkgndColor, borderBottom:'1px solid black',
            overflowX:'auto', overflowY:'scroll'});
        this._createTable(this.tableDiv, 15, 5);
    }    
    
    
    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this._updateEnabledState();
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


    /**
     * Handler for go button clicks.
     * @private
     * 
     */
    _onGoBtnClick()
    {
        const copycat = this.copycatUi.copycat;

        if (this.copycatUi.checkInputStrings()) {
            if (copycat.state == 'ready' || copycat.state == 'done') {
                copycat.start();
            }
            else if (copycat.state == 'paused') {
                copycat.resume();
            }
        }        
    }


    /**
     * Handler for pause button clicks.
     * @private
     * 
     */
    _onPauseBtnClick()
    {
        this.copycatUi.copycat.pause();
    }


    /**
     * Handler for reset button clicks.
     * @private
     * 
     */
    _onResetBtnClick()
    {
        const copycat = this.copycatUi.copycat;
        if ( (copycat.state != 'running') && this.copycatUi.checkInputStrings()) {
            this.clearTable();
            copycat.reset();
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
        const setEnabled = function(ctrl, enabled) { 
            ctrl.disabled = !enabled; 
            ctrl.style.opacity = enabled ? '1.0' : '0.4';
        };

        [this.goBtn, this.pauseBtn, this.resetBtn].forEach( ctrl => setEnabled(ctrl, true) );

        switch (this.copycatUi.copycat.state) 
        {
            case 'ready':
                setEnabled(this.pauseBtn, false);
                break;
            case 'paused':
                setEnabled(this.pauseBtn, false);
                break;
            case 'running':
                setEnabled(this.goBtn, false);
                setEnabled(this.resetBtn, false);
                break;
            case 'done':
                setEnabled(this.pauseBtn, false);
                break;
            default:
                break;
        }
    }

    /**
     * Handler for batchmode-toggle events
     * @private
     * 
     */    
    _onBatchResultsUpdated(resultsDict)
    {
        const ctx = this.copycatUi.copycat;
        if ( ctx.batchMode ) 
        {
            this.clearTable();
        
            let r = 1;
            const sortedResults = Object.values(resultsDict).sort((a,b) => b.count - a.count);
            
            const tbl = this.resultsTable;
            for (const result of sortedResults) {
                if (r >= tbl.rows.length) {  this._addTableRow(); }
                tbl.rows[r].cells[0].innerHTML = '&nbsp;' + result.count;
                tbl.rows[r].cells[1].innerHTML = '&nbsp;' + result.answer;
                tbl.rows[r].cells[2].innerHTML = '&nbsp;' + result.rule;
                tbl.rows[r].cells[3].innerHTML = '&nbsp;' + (result.sumtemp/result.count).toFixed(0);
                tbl.rows[r].cells[4].innerHTML = '&nbsp;' + (result.sumtime/result.count).toFixed(0);
                r += 1;
            }

            this.progressDiv.innerHTML = 'Run:&nbsp;&nbsp;' + ctx.batchCount + ' / ' + ctx.batchSize;
        }
    }
    

    _createTable(parentDiv, nRows, nCols) 
    {
        this.resultsTable = Namespace.UiUtils.CreateElement('table', 'batchmode_results_tbl', 
            parentDiv, {width:'100%', height:'100%', background:'#fffbcc',
                border: '1px solid blue', borderCollapse: 'collapse'
            });

        const colWidths = ['8%', '20%', '56%', '8%', '8%'];
        const colLabels = ['Freq.', 'Answer', 'Rule', 'Avg. Temp.', 'Avg. # Codelets'];

        const header = this.resultsTable.createTHead();
        const headerRow = header.insertRow();
        headerRow.style.height = '5vh';
        headerRow.style.fontFamily = 'Arial';
        headerRow.style.fontWeight = 'bold'; 
        headerRow.style.background = '#ffe5e0';
        for (let c = 0; c < nCols; c++) {
            const cell = headerRow.insertCell();
            cell.innerHTML = '&nbsp;' + colLabels[c];  
            cell.style.border = '1px solid blue';
            cell.style.borderCollapse = 'collapse';
            cell.style.width = colWidths[c];
            if ((c==3) || (c ==4)) { cell.style.textAlign = 'center'; }         
        }

        for (let r = 0; r < nRows; r++) { this._addTableRow(); }
    }


    /** 
     * Adds a new row to the results table.
     * 
     */
    _addTableRow()
    {
        const tbl = this.resultsTable;
        const nCols = tbl.rows[0].cells.length;
        const firstRow = tbl.rows[0];

        const tr = tbl.insertRow();
        tr.style.height = '4vh';
        tr.style.fontFamily = 'Arial';
        for (let c = 0; c < nCols; c++) {
            const td = tr.insertCell();
            td.style.border = '1px solid blue';
            td.style.borderCollapse = 'collapse';
            td.style.width = firstRow.cells[c].style.width;
            td.innerHTML = '&nbsp;';
            if (firstRow.cells[c].innerHTML.toLowerCase().includes('answer')) {
                td.style.fontFamily = 'serif';
                td.style.fontStyle = 'italic';
                td.style.fontSize = 'larger';
            }        
        }        
    }


    /**
     * Clears the results table.
     *  
     */
    clearTable() 
    {
        const nTableRows = this.resultsTable.rows.length;
        for (let r = 1; r < nTableRows; r++) {
            const nTableCols = this.resultsTable.rows[r].cells.length;
            for (let c = 0; c < nTableCols; c++) {
                this.resultsTable.rows[r].cells[c].innerHTML = '';
            }
        }

        this.progressDiv.innerHTML = '';
    }
};


})( window.CopycatJS = window.CopycatJS || {} );
