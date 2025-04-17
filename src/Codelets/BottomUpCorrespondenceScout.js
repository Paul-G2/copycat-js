// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet looks for potential correspondences between 
 * objects in the initial and target strings.
 * 
 */
 Namespace.Codelets.BottomUpCorrespondenceScout = class extends Namespace.Codelets.CodeletBase
 {
    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {Number} urgency - The urgency of the codelet.
     * @param {Array} args - Arguments to pass to the codelet. (Empty for this codelet.)
     * @param {Number} birthdate - The birthdate of the codelet.
     */
    constructor(ctx, urgency, args, birthdate) 
    { 
        super('bottom-up-correspondence-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const sn = ctx.slipnet;
        const Utils = Namespace.Codelets.CodeletUtils;

        // Choose an object from the initial string, based on salience.
        const objFromInitial = Utils.chooseUnmodifiedObject(ctx, 'interStringSalience', wksp.initialWString.objects);
        if (!objFromInitial) { return; }

        // Choose an object from the target string, based on salience.
        let objFromTarget = Utils.chooseUnmodifiedObject(ctx, 'interStringSalience', wksp.targetWString.objects);
        if (!objFromTarget) { return; }

        // Check that the initial and target objects are compatible.
        if (objFromInitial.spansString() != objFromTarget.spansString()) { return; }

        // Provide UI feedback.
        if (ctx.ui && !ctx.batchMode) {
            const dummyCorresp = new Namespace.Correspondence(objFromInitial, objFromTarget, [], false);
            ctx.ui.workspaceUi.corrsGraphic.flashGrope(dummyCorresp);
        }

        // Get concept mappings between the two objects.
        let conceptMappings = Namespace.ConceptMapping.getMappings(objFromInitial, objFromTarget,
            objFromInitial.relevantDescriptions(), objFromTarget.relevantDescriptions());
        if (!conceptMappings.length) { return; }

        // Check for slippability
        const slippageProbs = conceptMappings.map(m => ctx.temperature.getAdjustedProb( m.slippability()/100 ));
        const slippable = slippageProbs.some(p => ctx.randGen.coinFlip(p));
        if (!slippable) { return; }

        // Get any distinguishing mappings
        const distinguishingMappings = conceptMappings.filter( m => m.isDistinguishing() );
        if (!distinguishingMappings.length) { return; }
        
        // If both objects span the strings, then check to see if the string description needs to be flipped.
        let flipTargetObject = false;
        if (objFromInitial.spansString() && objFromTarget.spansString() && (sn.opposite.activation != 100)) 
        {
            const opposites = distinguishingMappings.filter(m => 
                (m.initialDescType == sn.stringPositionCategory) && (m.initialDescType != sn.bondFacet));

            if (opposites.every(m => m.label == sn.opposite)) {
                const initialDescTypes = opposites.map(m => m.initialDescType);
                if (initialDescTypes.includes(sn.directionCategory)) {
                    objFromTarget = objFromTarget.flippedVersion();
                    conceptMappings = Namespace.ConceptMapping.getMappings(objFromInitial, objFromTarget,
                        objFromInitial.relevantDescriptions(), objFromTarget.relevantDescriptions());
                    flipTargetObject = true;
                }
            }
        }
        
        // Propose a correspondence.
        ctx.coderack.proposeCorrespondence(objFromInitial, objFromTarget, conceptMappings, flipTargetObject);
    }


};

})( window.CopycatJS = window.CopycatJS || {} );