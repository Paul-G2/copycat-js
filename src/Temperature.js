// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The Temperature class keeps track of the workspace temperature.
 * 
 */
 Namespace.Temperature = class {

    /**
     * @constructor
     * 
     */
    constructor() 
    { 
        this.reset();
    }


    /**
     * Resets the temperature to 100 and clamps it until time = 30.
     * 
     */
    reset()
    {
        this.actualValue = 100;
        this.lastUnclampedValue = 100;
        this.clamped = true;
        this.clampTime = 30;
    }


    /**
     * Returns the current temperature value. 
     * 
     */   
    value() {
        return this.clamped ? 100 : this.actualValue;
    }


    /**
     * Sets the temperature to the given value, unless we
     * are currently clamped, in which case the value is cached.
     * 
     * @param {Number} value - The value to set. 
     */
    set(value) 
    {
        this.lastUnclampedValue = value;
        this.actualValue = this.clamped ? 100 : value;
    }


    /**
     * Clamps the temperature until the given time.
     * 
     * @param {Number} when - The time to unclamp. 
     */
    clampUntil(when)
    {
        this.clamped = true;
        this.clampTime = when;
    }


    /**
     * Unclamps the temperature if the given time is greater than
     * the clamping time.
     * 
     * @param {Number} currentTime - The current time.
     */

    tryUnclamp(currentTime) {
        if (this.clamped && (currentTime >= this.clampTime)) {
            this.clamped = false;
        }
    }


    /**
     * Adjusts the given value according to the current temperature.
     * (The value is raised to a power that decreases with temperature.)
     * 
     * @param {Number} input - The value to adjust.
     */
    getAdjustedValue(input)
    {
        const exp = (100 - this.value())/30 + 0.5;
        return Math.pow(input, exp);
    }


    /**
     * Ajusts the given probability value based on the current temperature.
     * If the temperature is 0, no adjustment is made. Otherwise, values 
     * above .5 are lowered and values below .5 are raised.
     * 
     * @param {Number} inProb - The probability to adjust. 
     */
    getAdjustedProb(inProb)
    {
        if (inProb === 0) { return 0; }
        if (inProb === 0.5) { return 0.5; }

        const temp = this.value();
        if (inProb < 0.5) {
            return 1 - this.getAdjustedProb(1 - inProb);
        }
        else {
            return Math.max(0.5, inProb*(1 - (10 - Math.sqrt(100 - temp))/100) );
        }
    }

};

})( window.CopycatJS = window.CopycatJS || {} );