// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tests the strength of a correspondence, and if it's 
 * strong enough, may post a CorrespondenceBuilder codelet.
 * 
 */
 Namespace.Codelets.CorrespondenceStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('correspondence-strength-tester', ctx, urgency, birthdate);
        this.correspondence = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const coderack = ctx.coderack;

        const corresp = this.correspondence;
        const objFromInitial = corresp.objFromInitial;
        const objFromTarget = corresp.objFromTarget;

        // If either of the two objects (or possibly a flipped version) no longer 
        // exists, then fizzle.
        const wantFlip = corresp.flipTargetObject;
        const flippedTargetObj = wantFlip ? objFromTarget.flippedVersion() : null;
        const objsExist = wksp.objects.includes(objFromInitial) && (wksp.objects.includes(objFromTarget) ||
            (wantFlip && wksp.targetWString.getEquivalentGroup(flippedTargetObj)));
        if (!objsExist) { return; }

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            ctx.ui.workspaceUi.corrsGraphic.flashProposed(corresp);
        }

        corresp.updateStrength();
        const strength = corresp.totalStrength;
        if (ctx.randGen.coinFlip( ctx.temperature.getAdjustedProb(strength/100) )) 
        { 
            // Activate the correspondence's mappings
            corresp.conceptMappings.forEach(m => {
                m.initialDescType.activation = 100;
                m.initialDescriptor.activation = 100;
                m.targetDescType.activation = 100;
                m.targetDescriptor.activation = 100;
            });

            const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
            const newCodelet = coderack.factory.create('correspondence-builder', urgency, [corresp]);
            coderack.post(newCodelet);
        }
    }

};

})( window.CopycatJS = window.CopycatJS || {} );