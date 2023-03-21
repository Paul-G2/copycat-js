// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};
    const CodeletUtils = Namespace.Codelets.CodeletUtils;

/**
 * @classdesc
 * This codelet looks for potential bonds between 
 * neighboring object pairs in the initial or target string.
 * 
 */
 Namespace.Codelets.BottomUpBondScout = class extends Namespace.Codelets.CodeletBase
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
        super('bottom-up-bond-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const Utils = Namespace.Codelets.CodeletUtils;

        // Choose a workspace object at random, based on intra-string salience.
        const bondSource = Utils.chooseUnmodifiedObject(ctx, 'intraStringSalience', ctx.workspace.objects);
        if (!bondSource) { return; }

        // Choose a neighboring object
        const bondDest = Utils.chooseNeighbor(ctx, bondSource);
        if (!bondDest) { return; }

        // Provide UI feedback.
        if (ctx.ui) {
            const dummyBond = new Namespace.Bond(bondSource, bondDest, 
                sn.sameness, sn.letterCategory, sn.letters[0], sn.letters[0]);
            ctx.ui.workspaceUi.getStringGraphic(dummyBond.string).
                bondsGraphic.flashGrope(dummyBond);
        }

        // Choose a bond facet
        const bondFacet = CodeletUtils.chooseBondFacet(ctx, bondSource, bondDest);
        if (!bondFacet) { return; }
        
        // Get the bond category
        const sourceDescriptor = bondSource.getDescriptor(bondFacet);
        const destDescriptor = bondDest.getDescriptor(bondFacet);
        let bondCategory = sourceDescriptor.getBondCategory(destDescriptor);
        if (!bondCategory) {
            return;
        }
        if (bondCategory == ctx.slipnet.identity) { 
            bondCategory = ctx.slipnet.sameness; 
        }

        // Propose the bond
        ctx.coderack.proposeBond(bondSource, bondDest, bondCategory, bondFacet,
            sourceDescriptor, destDescriptor);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );