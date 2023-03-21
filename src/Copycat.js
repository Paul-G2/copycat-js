// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";

/**
 * @classdesc
 * This is the main class for the Copycat algorithm. 
 * It contains the Slipnet, Workspace, and Coderack obects, and 
 * the main program loop. 
 * 
 */
 Namespace.Copycat = class {

    /**
     * @constructor
     * 
     * @param {Boolean} useGui - Whether to use a graphical user interface.
     * @param {Number|String} randSeed - A seed value for the random
     *   number generator.
     */
    constructor(
        {useGui=true, randSeed=42}) 
    { 
        this.randGen = new Namespace.RandGen(randSeed);
        this.temperature = new Namespace.Temperature();
        this.slipnet = new Namespace.Slipnet();
        this.coderack = new Namespace.Coderack(this);
        this.workspace = new Namespace.Workspace(this);
        this.workspace.reset('abc', 'abd', 'pqr');
        this.reporter = new Namespace.ConsoleReporter();
        this.ui = useGui ? new Namespace.CopycatUi(this) : null;
        
        this.stepTimerId = null;
        this.stepDelay = 50;
        this.runCompletionCallback = null;
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
            this.reporter.warn(`setStrings request ignored - ` +
              `Copycat is in ${this.state} state`);
            return; 
        }
        if (![initial, modified, target].every(this.checkInputString)) {
            this.reporter.warn(`setStrings request ignored - ` +
              `input strings must contain only letters`);
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
        return  string.length && !/[^a-z]/i.test(string);
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
     * @param {Function} [completionCallback] - A function to call when
     *   the run is completed.
     */
    start(completionCallback=null)
    {
        if ((this.state != 'ready') && (this.state != 'done')) { 
            this.reporter.warn(`start request ignored - ` +
              `Copycat is in ${this.state} state`);
        }
        else {
            this.runCompletionCallback = completionCallback;
            this.reset();
            this._setState('running');
            this._runNextCodelet();
        } 
    }


    /**
     * Pauses copycat.
     * 
     */
    pause()
    {
        if (this.state != 'running') {
            this.reporter.warn(`pause request ignored - ` +
              `Copycat is in ${this.state} state`);
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
            this.reporter.warn(`resume request ignored -  ` +
             `Copycat is in ${this.state} state`);
        }
        else {
            this._setState('running');
            this._runNextCodelet();
        }
    }


    /**
     * Executes a single codelet.
     * 
     */
    singleStep()
    {
        if ((this.state != 'ready') && (this.state != 'paused')) {
            this.reporter.warn(`singleStep request ignored -  ` +
              `Copycat is in ${this.state} state`);
        }
        else {
            if (this.state != 'paused') { 
                this._setState('paused'); }
            this._runNextCodelet();
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
        if (this.ui && !this.ui.workspaceUi.flasher.isIdle()) {
            this.stepTimerId = window.setTimeout(
                () => this._runNextCodelet(), 2*this.stepDelay);
            return;
        }

        const currentTime = this.coderack.numCodeletsRun;
        this.temperature.tryUnclamp(currentTime);

        // After every few codelets, we update everything, 
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
                this.stepTimerId = window.setTimeout(
                    this._runNextCodelet.bind(this), this.stepDelay); 
            }   
        }
        else {
            this._setState('done');
            if (this.runCompletionCallback) { 
                this.runCompletionCallback(); 
                this.runCompletionCallback = null;
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
     * @param {String} initial - The initial string.
     * @param {String} modified - The modified string.
     * @param {String} target - The target string.
     * @param {Number} numIterations - The number of times to run the algorithm.
     */
    batchRun(initial, modified, target, numIterations)
    {
        // Disable the gui while we run
        const ui = this.ui;
        this.ui = null;

        const answerDict = {};
        for (let iter=0; iter<numIterations; iter++)
        {
            // Initialize everything
            this.coderack.reset();
            this.slipnet.reset();
            this.temperature.reset(); 
            this.workspace.reset(initial, modified, target);

            // Run codelets until an answer is obtained
            while (!this.workspace.finalAnswer)
            {
                const currentTime = this.coderack.numCodeletsRun;
                this.temperature.tryUnclamp(currentTime);
        
                // Update evrything, after every few codelets
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
            if ( !(answer in answerDict) ) {
                answerDict[answer] = {'count': 0, 'sumtemp': 0, 'sumtime': 0}; 
            }
            answerDict[answer].count += 1;
            answerDict[answer].sumtemp += temp;
            answerDict[answer].sumtime += time;
        }

        // Compute overall stats
        for (const key of Object.keys(answerDict)) {
            const ans = answerDict[key];
            ans.avgtemp = ans.sumtemp / ans.count;
            ans.avgtime = ans.sumtime / ans.count;
        }
        this.reporter.info(answerDict);

        // Re-enable the gui
        this.ui = ui;
        
        return answerDict;
    }

};



})( window.CopycatJS = window.CopycatJS || {} );