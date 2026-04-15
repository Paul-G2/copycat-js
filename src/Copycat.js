// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";

/**
 * @classdesc
 * This is the main class for the Copycat algorithm. 
 * It contains the Slipnet, Workspace, and Coderack obects, and the main program loop. 
 * 
 */
 Namespace.Copycat = class {

    /**
     * @constructor
     * 
     * @param {Number|String} [randSeed=42] - A seed value for the random number generator.
     * @param {Boolean} [omitGui=false] - Whether to omit the GUI. Set to true during most unit tests.
     */
    constructor(args = {randSeed:42, omitGui:false}) 
    { 
        this.randGen     = new Namespace.RandGen(args.randSeed);
        this.reporter    = new Namespace.ConsoleReporter();
        this.temperature = new Namespace.Temperature();
        this.slipnet     = new Namespace.Slipnet();
        this.coderack    = new Namespace.Coderack(this);
        this.workspace   = new Namespace.Workspace(this);
        this.ui          = args.omitGui ? null : new Namespace.CopycatUi(this); 
        this.stepTimerId = null;
        this.stepDelay   = 50;
        this.batchMode   = false;
        this.batchSize   = 1000;
        this.batchChunk  = 5;
        this.batchCount  = 0;
        this.batchId     = 0;

        this._setState('ready');
    }
    

    /**
     * Sets the input strings from the UI, after checking that they are valid.
     * @private 
     * 
     */
    setInputStringsFromUi()
    {
        if (!this.ui) { return false; }

        if (this.state == 'running') { 
            this.reporter.warn(`setInputStringsFromUi request ignored - Copycat is in ${this.state} state`);
            return false; 
        }

        const wksp = this.workspace;
        const inputStrings = this.ui.inputUi.getInputStrings();
        const wkspStrings = [wksp.initialWString.jstring, wksp.modifiedWString.jstring, wksp.targetWString.jstring];
        const inputModified = !inputStrings.every((str, idx) => str.toLowerCase() == wkspStrings[idx]);
        
        if (!inputModified) { return true; }

        // Check that the input strings are non-empty and contain only letters 
        if (inputStrings.every( function(str) { return str.length && !/[^a-z]/i.test(str); }) ) {
            this.workspace.reset(...inputStrings);
            this.reset();
            return true;
        } else {
            this.ui.inputUi.displayMessage('Invalid input!');
            return false;
        }
    }


    /**
     * Toggles us in or out of batch mode.
     * 
     * @param {Boolean} value - The batchmode flag
     * 
     */
    toggleBatchMode(value)
    {
        this.reset();
        this.batchMode = value;
        this.ui?.batchmodeUi.clearTable();
        this.ui?._onBatchModeToggled();
    }


    /**
     * Seeds the random number generator.
     * 
     * @param {Number|String} randSeed - A seed value.
     */
    setRandSeed(seed) 
    {
        this.randGen = new Namespace.RandGen(seed);
    }
    

    /**
     * Sets the time delay between steps.
     * 
     * @param {Number} value - The time delay in milliseconds.
     */
    setStepDelay(value)
    {
        this.stepDelay = Math.max(0, value);
    }


    /**
     * Starts running the copycat algorithm with the current strings.
     * 
     */
    start()
    {
        if ((this.state != 'ready') && (this.state != 'done')) { 
            this.reporter.warn(`start request ignored - Copycat is in ${this.state} state`);
        }
        else {
            this.reset();
            this._setState('running');

            if (this.batchMode) {
                this.batchCount = 0;
                this.batchRun(); 
            } else {
                this._codeletLoop();
            }
        } 
    }


    /**
     * Pauses copycat.
     * 
     */
    pause()
    {
        if (this.state != 'running') {
            this.reporter.warn(`pause request ignored - Copycat is in ${this.state} state`);
        }
        else {
            window.clearTimeout(this.stepTimerId);
            this.stepTimerId = null;
            this._setState('paused');
        }
    }


    /**
     * Resumes copycat if it is paused.
     * 
     */
    resume()
    {
        if (this.state != 'paused') {
            this.reporter.warn(`resume request ignored - Copycat is in ${this.state} state`);
        }
        else {
            this._setState('running');
            if (!this.batchMode) { this._codeletLoop(); }
        }
    }


    /**
     * Executes a single codelet.
     * 
     */
    singleStep()
    {
        if ((this.state != 'ready') && (this.state != 'paused')) {
            this.reporter.warn(`singleStep request ignored - Copycat is in ${this.state} state`);
        }
        else {
            if (this.state != 'paused') { this._setState('paused'); }
            if (!this.batchMode) { this._codeletLoop(); }
        }
    }


    /**
     * Resets copycat to its initial state
     * 
     */
    reset()
    {
        // Stop any further execution
        window.clearTimeout(this.stepTimerId);
        this.stepTimerId = null;

        // Reset everything 
        this.coderack.reset();
        this.slipnet.reset();
        this.temperature.reset(); 
        this.workspace.reset();

        this._setState('ready');
    }


    /**
     * Runs the next codelet and schedules a subsequent one.
     * @private
     */
    _codeletLoop() 
    {
        if (this.batchMode) { return; }

        // Yield to the flasher, if it is active. 
        if (this.stepTimerId) { return; }
        if (this.ui && !this.ui.workspaceUi.flasher.isIdle()) {
            this.stepTimerId = window.setTimeout( 
                () => { this.stepTimerId = null; this._codeletLoop(); }, 2*this.stepDelay );
            return;
        }

        // After every 5 codelets, update everything, 
        const currentTime = this.coderack.numCodeletsRun;
        this.temperature.tryUnclamp(currentTime);        
        if ((currentTime % 5) === 0) 
        {
            this.workspace.updateEverything();
            this.coderack.updateCodelets();
            this.slipnet.update(this.randGen, (currentTime == 245));
            this.temperature.set(this.workspace.calcTemperature());
        }

        // Run a codelet
        this.coderack.chooseAndRunCodelet();

        // Display progress
        this.ui?.update();

        // Are we done?
        if (this.workspace.finalAnswer) { 
            this._setState('done'); 
        }
        else {
            if (this.state == 'running') {
                this.stepTimerId = window.setTimeout( 
                    () => { this.stepTimerId = null; this._codeletLoop(); }, this.stepDelay ); 
            }   
        }
    }



    /**
     * Sets our state and notifys listeners.
     * @private
     * 
     */
    _setState(state)
    {
        this.state = state;
        this.ui?.update();
    }


    /** 
     * Runs the Copycat algorithm multiple times on a given input, 
     * and returns the resulting stats.
     *
     * @param {Number} maxIterations - The maximum number of times to run the solver.
     */
    async batchRun()
    {
        this.batchId++;
        const batchId = this.batchId;

        // Pause to let the ui update
        await new Promise(r => setTimeout(r, 250)); 
        if (!this.batchMode || (batchId != this.batchId)) { return; }

        const resultsDict = {};
        while (this.batchCount < this.batchSize)
        {
            // Solve the problem batchChunk times
            for (let i = 0; i < this.batchChunk; i++)   
            {
                // Initialize everything
                this.coderack.reset();
                this.slipnet.reset();
                this.temperature.reset(); 
                this.workspace.reset();

                // Run codelets until an answer is obtained
                while (!this.workspace.finalAnswer)
                {
                    const currentTime = this.coderack.numCodeletsRun;
                    this.temperature.tryUnclamp(currentTime);
            
                    // Update evrything, after every 5 codelets
                    if ((currentTime % 5) === 0) 
                    {
                        this.workspace.updateEverything();
                        this.coderack.updateCodelets();
                        this.slipnet.update(this.randGen, (currentTime == 245));
                        this.temperature.set(this.workspace.calcTemperature());
                    }
            
                    // Run a codelet
                    this.coderack.chooseAndRunCodelet();
                }

                // Add the answer to our dictionary
                const answer = this.workspace.finalAnswer;
                const ruleStr = this.workspace.rule?.synopsis(0) || '';
                const key = answer + ':' + ruleStr;           
                if ( !(key in resultsDict) ) {
                    resultsDict[key] = {'answer': answer, 'count': 0, 'sumtemp': 0, 'sumtime': 0, 'rule': ruleStr}; 
                }
                resultsDict[key].count += 1;
                resultsDict[key].sumtemp += this.temperature.lastUnclampedValue;
                resultsDict[key].sumtime += this.coderack.numCodeletsRun;

                this.batchCount += 1;
            }

            // Display progress
            this.ui?.batchmodeUi.update(resultsDict);
            await new Promise(r => setTimeout(r, 250)); 
            if (!this.batchMode || (batchId != this.batchId)) { return; }

            // Are we done?
            if (this.batchCount < this.batchSize) 
            {
                while (this.state == 'paused') { 
                    await new Promise(r => setTimeout(r, 500)); 
                }
                if (!this.batchMode || (batchId != this.batchId)) { 
                    return; // Mode must have changed while we were paused
                }
                if ((this.state == 'ready') || (this.state == 'done')) {
                    break;
                } 
            }
        }

        this._setState('ready');
    }

};



})( window.CopycatJS = window.CopycatJS || {} );