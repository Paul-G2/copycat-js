// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tests the strength of a bond, and if it's strong enough,
 * may post a BondBuilder codelet.
 * 
 */
 Namespace.Codelets.BondStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('bond-strength-tester', ctx, urgency, birthdate);
        this.bond = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const coderack = ctx.coderack;
        const bond = this.bond;

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            ctx.ui.workspaceUi.getStringGraphic(bond.string).bondsGraphic.flashProposed(bond);
        }

        // Maybe fizzle, if the strength is too low
        bond.updateStrength();
        const strength = bond.totalStrength;
        const prob = ctx.temperature.getAdjustedProb(strength/100);
        if ( !ctx.randGen.coinFlip(prob) ) {
            return; 
        }

        // Post a BondBuilder codelet
        bond.facet.activation = 100;
        bond.sourceDescriptor.activation = 100;
        bond.destDescriptor.activation = 100;
        const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
        const newCodelet = ctx.coderack.factory.create('bond-builder', urgency, [bond]);
        coderack.post(newCodelet);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );