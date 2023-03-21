// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tries to build a proposed Rule, fighting with 
 * competitors if necessary.
 * 
 */
 Namespace.Codelets.RuleBuilder = class extends Namespace.Codelets.CodeletBase
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
        super('rule-builder', ctx, urgency, birthdate);
        this.rule = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const rule = this.rule;
        const Utils = Namespace.Codelets.CodeletUtils;

        // If this rule already exists, then fizzle. 
        if ( rule.sameAs(wksp.rule) ) {
            rule.activate();
            return;
        }

        // If the rule is too weak, then fizzle.
        rule.updateStrength();
        if (rule.totalStrength === 0) { return; }

        // If a different rule already exists, then fight.
        if (wksp.rule) {
            if (!Utils.structureVsStructure(rule, 1.0, wksp.rule, 1.0)) {
                return;
            }
        }

        // Build the rule
        rule.build();
    }

    
};

})( window.CopycatJS = window.CopycatJS || {} );