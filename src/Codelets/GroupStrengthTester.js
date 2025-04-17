// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tests the strength of a Group, and if it's strong enough,
 * posts a GroupBuilder codelet.
 * 
 */
 Namespace.Codelets.GroupStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('group-strength-tester', ctx, urgency, birthdate);
        this.group = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const coderack = ctx.coderack;
        const group = this.group;

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            ctx.ui.workspaceUi.getStringGraphic(group.string).groupsGraphic.flashProposed(group);
        }

        // Maybe fizzle, if the strength is too low
        group.updateStrength();
        const strength = group.totalStrength;
        const prob = ctx.temperature.getAdjustedProb(strength/100);
        if (!ctx.randGen.coinFlip(prob)) { return; }

        // Post a GroupBuilder codelet
        group.groupCategory.getRelatedNode(ctx.slipnet.bondCategory).activation = 100;
        if (group.directionCategory) { group.directionCategory.activation = 100; }
        const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
        const newCodelet = ctx.coderack.factory.create('group-builder', urgency, [group]);
        coderack.post(newCodelet);
    }

    
    

};

})( window.CopycatJS = window.CopycatJS || {} );