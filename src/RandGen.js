// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This class provides methods for generating random values 
 * and making random selections.
 * 
 */
 Namespace.RandGen = class {

    /**
     * @constructor
     * @param {Number|String} [seed=Date.now] - A seed for initializing
     *  the randomness generator.
     */
    constructor(seed) 
    { 
        // Initialize
        const strSeed = ((typeof(seed) !== "undefined") && (seed !== null)) ? 
            seed.toString() : Date.now().toString();

        const cyrSeed = Namespace.RandGen._get_seed_cyrb128(strSeed);
        this.rng = Namespace.RandGen._sfc32(...cyrSeed);
    }


    /**
     * Returns a random number in the range [0,1), sampled from 
     * a uniform distribution.
     * 
     * @returns A number in the range [0,1).
     */
    rand()
    {
        return this.rng();
    }


    /**
     * Returns true or false, with probabilities p and 1-p, respectively.
     * 
     * @param {Number} p - The probability of a 'true' result.
     * @returns true or false.
     */
    coinFlip(p = 0.5)
    {
        return this.rng() < p;
    }


    /**
     * Returns a random element from a given sequence.
     * 
     * @param {Indexable} seq - The sequence to select from.
     * @returns A random element from seq.
     */
    choice(seq)
    {
        const idx = Math.floor(this.rng()*seq.length);
        return seq[idx];
    }


    /**
     * Returns a random element from the given sequence, 
     * with weighted probabilities.
     * 
     * @param {Indexable} seq - The sequence to select from.
     * @param {Array<Number>} weights - The relative weights.
     * @returns A random element from seq.
     */
    weightedChoice(seq, weights)
    {
        if (!seq || !seq.length) {
            // Apparently, many callers rely on this behavior.
            return null;
        }

        const N = seq.length;
        if ( N !== weights.length ){
            throw new Error("Incompatible array lengths, " + 
                "in RandGen.weightedChoice");
        }

        let csum = 0;
        const cumWeights = weights.map((csum = 0, n => csum += n));

        const r = this.rng() * cumWeights[N-1];
        let idx = N-1;
        for (let i=0; i<N; i++){
            if (r < cumWeights[i]) {
                idx = i;
                break;
            }
        }
        return seq[idx];
    }


    /**
     * Returns true or false, with probabilities a/(a+b) and 
     *   b/(a+b), respectively.
     * 
     * @param {Number} a - First number.
     * @param {Number} b - Second number.
     * @returns true or false.
     */
    weightedGreaterThan(a, b)
    {
        const sum = a + b;
        return (sum === 0) ? false : this.coinFlip(a/sum);
    }


    /**
     * Returns val +/- sqrt(val), where the sign is obtained randomly.
     * 
     * @param {Number} val - The value to process.
     * @returns val +/- sqrt(val).
     */
    sqrtBlur(val)
    {
        const sign = this.coinFlip() ? 1 : -1;
        return val + sign*Math.sqrt(val);
    }


    /**
     * This version of sqrtBlur matches the original lisp code,
     * and differs somewhat from the java & python versions.
     * We use the latter, but it doesn't seem to make much difference
     * in practice.
     * @private
     * 
     */
    _sqrtBlur2(val)
    {
        const blurAmount = Math.round(Math.sqrt(val));
        const sign = this.coinFlip() ? 1 : -1;
        return val + sign * this.rand() * (1 + blurAmount);
    }


    /**
     * Creates a 4-component seed for _sfc32, given an input seed.
     *   Reference: https://stackoverflow.com/questions/521295/
     * @private
     * 
     * @param {String} inSeed - The input seed.
     * @return {Array} A 4-component integer seed.
     */
    static _get_seed_cyrb128(inSeed) {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < inSeed.length; i++) {
            k = inSeed.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
    }


    /**
     * Returns a function that generates random numbers, seeded 
     *  with the given 4-component seed. 
     *  Reference: https://stackoverflow.com/questions/521295/
     * @private
     * 
     * @param {Number} a - 1st seed component.
     * @param {Number} b - 2nd seed component.
     * @param {Number} c - 3rd seed component.
     * @param {Number} d - 4th seed component.
     * @return {Function} A function that produces random numbers in 
     *   the range [0,1).
     */
    static _sfc32(a, b, c, d) {
        return function() {
          a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
          var t = (a + b) | 0;
          a = b ^ b >>> 9;
          b = c + (c << 3) | 0;
          c = (c << 21 | c >>> 11);
          d = d + 1 | 0;
          t = t + d | 0;
          c = c + t | 0;
          return (t >>> 0) / 4294967296;
        };
    }
};

})( window.CopycatJS = window.CopycatJS || {} );