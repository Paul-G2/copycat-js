// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};
    

/**
 * @classdesc
 * This codelet chooses an object and its description from the initial string,
 * and looks for an object in the target string with the same description or
 * slipped description. It then tries to propose a Correspondence between 
 * the two objects.
 */
 Namespace.Codelets.ImportantObjectCorrespondenceScout = class extends Namespace.Codelets.CodeletBase
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
        super('important-object-correspondence-scout', ctx, urgency, birthdate);
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
        const objFromInitial = Utils.chooseUnmodifiedObject(ctx, 'relativeImportance', 
            wksp.initialWString.objects);
        if (!objFromInitial) { return; }

        const descriptors = objFromInitial.relevantDistinguishingDescriptors();
        const weights = descriptors.map( d => ctx.temperature.getAdjustedValue(d.depth) );
        const descriptor = ctx.randGen.weightedChoice(descriptors, weights);
        if (!descriptor) { return; }
        
        let initialDescriptor = descriptor;
        for (let m of wksp.getSlippableMappings()) {
            if (m.initialDescriptor == descriptor) {
                initialDescriptor = m.targetDescriptor;
            }
        }
        const targetCandidates = [];
        for (let obj of wksp.targetWString.objects) {
            for (let descr of obj.relevantDescriptions()) {
                if (descr.descriptor == initialDescriptor) {
                    targetCandidates.push(obj);
                }
            }
        }
        if (!targetCandidates.length) { return; }

        let objFromTarget = Utils.chooseUnmodifiedObject(ctx, 'interStringSalience', targetCandidates);
        if (objFromInitial.spansString() != objFromTarget.spansString()) { return; }

        // Provide UI feedback
        if (this.ctx.ui) {
            const dummyCorresp = new Namespace.Correspondence(
                objFromInitial, objFromTarget, [], false);
            this.ctx.ui.workspaceUi.corrsGraphic.flashGrope(dummyCorresp);
        }

        // Get the posible concept mappings
        let conceptMappings = Namespace.ConceptMapping.getMappings(
            objFromInitial, objFromTarget, objFromInitial.relevantDescriptions(),
            objFromTarget.relevantDescriptions());

        // Check for slippability
        const slippageProbs = conceptMappings.map(
            m => ctx.temperature.getAdjustedProb( m.slippability()/100 ));
        const slippable = slippageProbs.some(p => ctx.randGen.coinFlip(p));
        if (!slippable) { return; }

        // Find out if any are distinguishing
        const distinguishingMappings = conceptMappings.filter(m => m.isDistinguishing());
        if (!distinguishingMappings.length) { return; }

        // If both objects span the strings, check to see if the
        // string description needs to be flipped
        const opposites = distinguishingMappings.filter(m =>
            (m.initialDescType == sn.stringPositionCategory) &&
                m.initialDescType != sn.bondFacet);
        const initialDescriptionTypes = opposites.map(m => m.initialDescType);
        let flipTargetObject = false;
        if (objFromInitial.spansString() && objFromTarget.spansString() &&
            initialDescriptionTypes.includes(sn.directionCategory) &&
              opposites.every(m => m.label == sn.opposite) && (sn.opposite.activation != 100)) {
                objFromTarget = objFromTarget.flippedVersion();
                conceptMappings = Namespace.ConceptMapping.getMappings(
                    objFromInitial, objFromTarget, objFromInitial.relevantDescriptions(),
                    objFromTarget.relevantDescriptions()
                );
                flipTargetObject = true;
        }

        ctx.coderack.proposeCorrespondence(
            objFromInitial, objFromTarget, conceptMappings, flipTargetObject);
    }


};

})( window.CopycatJS = window.CopycatJS || {} );