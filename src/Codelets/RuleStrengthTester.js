// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet calculates a proposed Rule's strength, and decides
 * whether or not to post a RuleBuilder codelet.
 */
 Namespace.Codelets.RuleStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('rule-strength-tester', ctx, urgency, birthdate);
        this.rule = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const coderack = ctx.coderack;
        const rule = this.rule;

        // Maybe fizzle, if the strength is too low
        rule.updateStrength();
        const strength = rule.totalStrength;
        const prob = ctx.temperature.getAdjustedProb(strength/100);
        if (!ctx.randGen.coinFlip(prob)) { return; }

        // Post a RuleBuilder codelet
        const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
        const newCodelet = ctx.coderack.factory.create('rule-builder', urgency, [rule]);
        coderack.post(newCodelet);
    }

    
    

};

})( window.CopycatJS = window.CopycatJS || {} );