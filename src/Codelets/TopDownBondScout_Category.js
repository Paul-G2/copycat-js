// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet seeks potential Bonds between 
 * neighboring object pairs in the initial or target string.
 * 
 */
 Namespace.Codelets.TopDownBondScout_Category = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-bond-scout--category', ctx, urgency, birthdate);
        this.category = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;
        const cat = this.category;

        const bondSource = CodeletUtils.getScoutSource(ctx, 'bondCategory', cat);

        const bondDest = CodeletUtils.chooseNeighbor(ctx, bondSource);
        if (!bondDest) { return; }

        // Provide UI feedback.
        if (ctx.ui && !ctx.batchMode) {
            const dummyBond = new Namespace.Bond(bondSource, bondDest, sn.sameness, sn.letterCategory, sn.letters[0], sn.letters[0]);
            ctx.ui.workspaceUi.getStringGraphic(dummyBond.string). bondsGraphic.flashGrope(dummyBond);
        }

        const bondFacet = CodeletUtils.chooseBondFacet(ctx, bondSource, bondDest);
        if (!bondFacet) { return; }

        const sourceDescriptor = bondSource.getDescriptor(bondFacet);
        const destDescriptor = bondDest.getDescriptor(bondFacet);

        let forwardBond = sourceDescriptor.getBondCategory(destDescriptor);
        let backwardBond = null;
        if (forwardBond == sn.identity) {
            forwardBond = sn.sameness;
            backwardBond = sn.sameness;
        } else {
            backwardBond = destDescriptor.getBondCategory(sourceDescriptor);
        }

        if (cat == forwardBond) {
            ctx.coderack.proposeBond(bondSource, bondDest, cat, bondFacet, sourceDescriptor, destDescriptor);
        }
        else if (cat == backwardBond) {
            ctx.coderack.proposeBond(bondDest, bondSource, cat, bondFacet, destDescriptor, sourceDescriptor);
        }
    }

};

})( window.CopycatJS = window.CopycatJS || {} );