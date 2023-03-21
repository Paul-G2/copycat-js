// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet attempts to translate a Rule by applying the 
 * slippages that have been built in the workspace.
 * 
 */
 Namespace.Codelets.RuleTranslator = class extends Namespace.Codelets.CodeletBase
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
        super('rule-translator', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const rule = wksp.rule;

        // If we don't have a rule, then fizzle. 
        if (!rule) { return; }

        let bondDensity = 1.0;
        const totalLength = wksp.initialWString.length + wksp.targetWString.length;
        if (totalLength > 2) {
            const numBonds = wksp.initialWString.bonds.length + wksp.targetWString.bonds.length;
            bondDensity = Math.min(1.0, numBonds/(totalLength - 2));
        }
        const weights = 
            bondDensity > 0.8 ? [5, 150, 5, 2, 1, 1, 1, 1, 1, 1] :
            bondDensity > 0.6 ? [2, 5, 150, 5, 2, 1, 1, 1, 1, 1] :
            bondDensity > 0.4 ? [1, 2, 5, 150, 5, 2, 1, 1, 1, 1] :
            bondDensity > 0.2 ? [1, 1, 2, 5, 150, 5, 2, 1, 1, 1] :
                                [1, 1, 1, 2, 5, 150, 5, 2, 1, 1];

        const oneToTen = Array.from({length: 10}, (_, i) => i + 1);
        const cutoff = 10.0 * ctx.randGen.weightedChoice(oneToTen, weights);

        if (cutoff >= ctx.temperature.actualValue) {
            const result = wksp.rule.applyRuleToTarget();
            if (result) {
                wksp.finalAnswer = result;
            }
            else {
                ctx.temperature.clampUntil(ctx.coderack.numCodeletsRun + 100);
            }
        }
    }

    
};

})( window.CopycatJS = window.CopycatJS || {} );