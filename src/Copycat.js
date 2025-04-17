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
     * @param {Number|String} randSeed - A seed value for the random number generator.
     */
    constructor(args = {randSeed:42, omitGui:false}) 
    { 
        this.randGen     = new Namespace.RandGen(args.randSeed);
        this.temperature = new Namespace.Temperature();
        this.slipnet     = new Namespace.Slipnet();
        this.coderack    = new Namespace.Coderack(this);
        this.workspace   = new Namespace.Workspace(this);
        this.reporter    = new Namespace.ConsoleReporter();
        this.ui          = args.omitGui ? null : new Namespace.CopycatUi(this); // omitGui is used by unit tests
        this.batchMode   = false;
        this.batchSize   = 1000;
        this.batchCount  = 0;
        this.batchId     = 0;
        this.stepTimerId = null;
        this.stepDelay   = 50;

        this._setState('ready');
    }
    

    /**
     * Sets the input strings.
     * 
     * @param {String} initial - The initial string.
     * @param {String} modified - The modified string.
     * @param {String} target - The target string.
     */
    setStrings(initial, modified, target)
    {
        if (this.state == 'running') { 
            this.reporter.warn(`setStrings request ignored - Copycat is in ${this.state} state`);
            return; 
        }
        if (![initial, modified, target].every(this.checkInputString)) {
            this.reporter.warn(`setStrings request ignored - input strings must contain only letters`);
            return;
        }
        this.workspace.reset(initial, modified, target);
        this.reset();
    }


    /**
     * Checks whether an input string is valid (i.e., 
     * contains only letters).
     * 
     * @param {String} string - The string to check
     * 
     */
    checkInputString(string)
    {
        return string.length && !/[^a-z]/i.test(string);
    }


    /**
     * Toggles us in or out of batch mode.
     * 
     * @param {Boolean} value - The batchmode flag
     * 
     */
    toggleBatchMode(value)
    {
        this.ui.batchmodeUi.clearTable();
        this.reset();
        this.batchMode = value;
        this.ui._onBatchModeToggled();
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
                this._runNextCodelet();
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
            if (!this.batchMode) { this._runNextCodelet(); }
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
            if (!this.batchMode) { this._runNextCodelet(); }
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
    _runNextCodelet() 
    {
        if (this.batchMode) { return; }

        if (this.ui && !this.ui.workspaceUi.flasher.isIdle()) {
            this.stepTimerId = window.setTimeout( () => this._runNextCodelet(), 2*this.stepDelay );
            return;
        }

        const currentTime = this.coderack.numCodeletsRun;
        this.temperature.tryUnclamp(currentTime);

        // After every 5 codelets, we update everything, 
        if ((currentTime % 5) === 0) 
        {
            this.workspace.updateEverything();
            this.coderack.updateCodelets();
            this.slipnet.update(this.randGen, (currentTime == 245));
            this.temperature.set(this.workspace.calcTemperature());
        }

        // Run a codelet
        this.coderack.chooseAndRunCodelet();

        // Report progress
        this._notifyListeners();

        // Are we done?
        this.stepTimerId = null;
        if (!this.workspace.finalAnswer) 
        {
            if (this.state == 'running') {
                this.stepTimerId = window.setTimeout( this._runNextCodelet.bind(this), this.stepDelay ); 
            }   
        }
        else {
            this._setState('done');
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
        this._notifyListeners();
    }


    /**
     * Notifies listeners of a change in state.
     * @private
     * 
     */
    _notifyListeners()
    {
        if (this.ui) { this.ui._onCopycatStateChange(); }
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
        await new Promise(r => setTimeout(r, 250)); // Process ui events
        if (!this.batchMode || (batchId != this.batchId)) { return; }

        const resultsDict = {};
        let batchChunkSize = 5;

        // eslint-disable-next-line no-constant-condition
        while (this.batchCount < this.batchSize)
        {
            // Solve the problem batchCunkSize times
            for (let i = 0; i < batchChunkSize; i++)   
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
                const temp = this.temperature.lastUnclampedValue;
                const time = this.coderack.numCodeletsRun;
                const key = answer + ':' + this.workspace.rule?.synopsis(0) || '';           
                if ( !(key in resultsDict) ) {
                    resultsDict[key] = {'answer': answer, 'count': 0, 'sumtemp': 0, 'sumtime': 0, 'rule': this.workspace.rule?.synopsis(0) || ''}; 
                }
                resultsDict[key].count += 1;
                resultsDict[key].sumtemp += temp;
                resultsDict[key].sumtime += time;

                this.batchCount += 1;
            }

            // Display progress
            if (this.ui) { this.ui.batchmodeUi._onBatchResultsUpdated(resultsDict); }
            await new Promise(r => setTimeout(r, 250)); 
            if (!this.batchMode || (batchId != this.batchId)) { return; }

            // Are we done?
            if (this.batchCount < this.batchSize) 
            {
                while (this.state == 'paused') { 
                    await new Promise(r => setTimeout(r, 500)); 
                }
                if (!this.batchMode || (batchId != this.batchId)) { 
                    return; 
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