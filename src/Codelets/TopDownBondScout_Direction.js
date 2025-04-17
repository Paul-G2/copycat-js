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
 Namespace.Codelets.TopDownBondScout_Direction = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-bond-scout--direction', ctx, urgency, birthdate);
        this.bondDirection = args[0]; // left or right
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;

        const bondSource = CodeletUtils.getScoutSource(ctx, 'bondDirection', this.bondDirection);

        const bondDest = this._chooseDirectedNeighbor(bondSource);
        if (!bondDest) { return; }

        // Provide UI feedback.
        if (ctx.ui && !ctx.batchMode) {
            const sn = ctx.slipnet;
            const dummyBond = new Namespace.Bond(bondSource, bondDest, sn.sameness, sn.letterCategory, sn.letters[0], sn.letters[0]);
            ctx.ui.workspaceUi.getStringGraphic(dummyBond.string). bondsGraphic.flashGrope(dummyBond);
        }

        const bondFacet = CodeletUtils.chooseBondFacet(ctx, bondSource, bondDest);
        if (!bondFacet) { return; }

        const sourceDescriptor = bondSource.getDescriptor(bondFacet);
        const destDescriptor = bondDest.getDescriptor(bondFacet);

        let category = sourceDescriptor.getBondCategory(destDescriptor);
        if (!category) { return; }
        
        if (category == ctx.slipnet.identity) { category = ctx.slipnet.sameness; }

        // Propose the bond
        ctx.coderack.proposeBond(bondSource, bondDest, category, bondFacet, sourceDescriptor, destDescriptor);
    }



    /**
     * Chooses a neighbor of the given object in the given direction.
     * @private
     */
    _chooseDirectedNeighbor(source)
    {
        const ctx = this.ctx;
        let objects = [];

        if (this.bondDirection == ctx.slipnet.left) {
            objects = ctx.workspace.objects.filter(o => (o.string == source.string) && (source.leftIndex == o.rightIndex + 1));
        } else {
            objects = ctx.workspace.objects.filter(o => (o.string == source.string) && (source.rightIndex == o.leftIndex - 1));
        }

        const weights = objects.map( o => ctx.temperature.getAdjustedValue(o.intraStringSalience) );
        return ctx.randGen.weightedChoice(objects, weights);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );