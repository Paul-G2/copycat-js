// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tests the strength of a Description, and if it's 
 * strong enough, may post a DescriptionBuilder codelet.
 * 
 */
 Namespace.Codelets.DescriptionStrengthTester = class extends Namespace.Codelets.CodeletBase
 {
    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {Number} urgency - The urgency of the codelet.
     * @param {Array} args - Arguments to pass to the codelet.
     * @param {Number} birthdate - The birthdate of the codelet.
     */
    constructor(ctx, urgency, args, birthdate) 
    { 
        super('description-strength-tester', ctx, urgency, birthdate);
        this.description = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const coderack = ctx.coderack;
        const description = this.description;

        // Maybe fizzle, if the strength is too low
        description.descriptor.activation = 100;
        description.updateStrength();
        const strength = description.totalStrength;
        const prob = ctx.temperature.getAdjustedProb(strength/100);
        if (!ctx.randGen.coinFlip(prob)) { return; }

        // Post a DescriptionBuilder codelet
        const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
        const newCodelet = coderack.factory.create('description-builder', urgency, [description]);
        coderack.post(newCodelet);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );