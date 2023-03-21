// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This class provides several utility functions 
 * needed by the codelets. 
 * 
 */
 Namespace.Codelets.CodeletUtils = class
 {
    /**
     * Returns a quantized measure of urgency.
     * 
     * @param {Number} urgency - The input urgency.
     */
    static getUrgencyBin(urgency)
    {
        const numUrgencyBins = 7;
        const i = Math.floor(urgency) * numUrgencyBins / 100;
        return (i >= numUrgencyBins) ? numUrgencyBins : i + 1;  
    }


    /**
     * Returns a random  object from a given list, that is
     * not from the modified string. The probability of
     * choosing an object is weighted by its value of the
     * given attribute.
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {String} attribute - The attribute to use for weighting.
     * @param {Array} inObjects - The list of objects to choose from.
     * 
     */
    static chooseUnmodifiedObject(ctx, attribute, inObjects)
    {
        const candidates = inObjects.filter(o => o.string != ctx.workspace.modifiedWString);
        const weights = candidates.map( o => ctx.temperature.getAdjustedValue(o[attribute]) );
        return ctx.randGen.weightedChoice(candidates, weights);
    }

    
    /**
     * Returns a random nearest-neighbor of a given object.
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {WorkspaceObject} sourceObj - The input object.
     * 
     */
    static chooseNeighbor(ctx, sourceObj)
    {
        const candidates = ctx.workspace.objects.filter(o => o.isBeside(sourceObj));
        const weights = candidates.map( 
            o => ctx.temperature.getAdjustedValue(o.intraStringSalience) );

        return ctx.randGen.weightedChoice(candidates, weights);
    }

    
    /**
     * Randomly selects an object from the initial or target string that
     * matches the given criterion.
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {String} relevanceCriterion - 'bondCategory' or 'bondDirection'.
     * @param {SlipNode} toMatch - The SlipNode to match.
     */
    static getScoutSource(ctx, relevanceCriterion, toMatch)
    {
        // Define a function to compute the relevance of a string.
        const relevance = function(string, criterion, nodeToMatch)
        {
            if ((criterion == 'bondCategory') && (string.objects.length == 1)) {
                return 0;
            }

            const nonSpanningObjs = string.objects.filter(o => !o.spansString());
            const numNonSpanningObjects = nonSpanningObjs.length;
            let numMatches = 0;
            if (criterion == 'bondCategory') {
                numMatches = nonSpanningObjs.filter(o => 
                    o.rightBond && (o.rightBond.category == nodeToMatch)).length;
            }
            else if (criterion == 'bondDirection') {
                numMatches = nonSpanningObjs.filter(o => 
                    o.rightBond && (o.rightBond.directionCategory == nodeToMatch)).length;
            }

            return (numNonSpanningObjects == 1) ? 100 * numMatches :
                (100 * numMatches) / (numNonSpanningObjects - 1);            
        };


        // Get relevance and unhappiness values.
        const wksp = ctx.workspace;
        const initialRelevance = relevance(wksp.initialWString, relevanceCriterion, toMatch);
        const targetRelevance = relevance(wksp.targetWString, relevanceCriterion, toMatch);
        const initialUnhappiness = wksp.initialWString.intraStringUnhappiness;
        const targetUnhappiness = wksp.targetWString.intraStringUnhappiness;
        const initials = initialRelevance + initialUnhappiness;
        const targets = targetRelevance + targetUnhappiness;

        // Choose a source object.
        var result;
        if (ctx.randGen.weightedGreaterThan(targets, initials)) {
            result = Namespace.Codelets.CodeletUtils.chooseUnmodifiedObject(
                ctx, 'intraStringSalience',  wksp.targetWString.objects);
        }
        else {
            result = Namespace.Codelets.CodeletUtils.chooseUnmodifiedObject(
                ctx, 'intraStringSalience', wksp.initialWString.objects);
        }

        return result;
    }


    /**
     * Randomly selects a bond facet that is common to the 
     *  given source and destination objects.
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {WorkspaceObject} sourceObj - The source object.
     * @param {WorkspaceObject} destObj - The destination object.
     * 
     */
    static chooseBondFacet(ctx, sourceObj, destObj)
    {
        let sn = ctx.slipnet;

        // The allowed bond facets:
        const bondFacets = [sn.letterCategory, sn.length];

        // Get the bond facets that are present in both source and destination.
        const sourceFacets = sourceObj.descriptions.map(
            d => d.descriptionType).filter(d => bondFacets.includes(d));

        const candidateFacets = destObj.descriptions.map(
            d => d.descriptionType).filter(d => sourceFacets.includes(d));

        // For each such facet, compute a support value based on both the facet's activation
        // and the number of objects in the source's string that share the facet.
        const facetWeights = [];
        const sourceSiblings = ctx.workspace.objects.filter(o => o.string == sourceObj.string);
        const siblingDescriptions = sourceSiblings.map(o => o.descriptions).flat();
        for (let facet of candidateFacets) {
            let supportCount = 0;
            for (let d of siblingDescriptions) {
                supportCount += (d.descriptionType == facet) ? 1 : 0;
            }
            const stringSupport = 100 * supportCount / (sourceSiblings.length || 1);
            facetWeights.push( (facet.activation + stringSupport)/2 );
        }

        return ctx.randGen.weightedChoice(candidateFacets, facetWeights);
    }


    /**
     * Probabilistically decides which of two given structures to return,
     * based on their strengths as well as external weight factors.
     *
     * @param {WorkspaceStructure} structure1 - The first structure.
     * @param {Number} weight1 - The weight factor for the first structure.
     * @param {WorkspaceStructure} structure2 - The second structure.
     * @param {Number} weight2 - The weight factor for the second structure.
     * 
     */
    static structureVsStructure(structure1, weight1, structure2, weight2)
    {
        const ctx = structure1.ctx;
        const temperature = ctx.temperature;

        structure1.updateStrength();
        structure2.updateStrength();
        const weightedStrength1 = temperature.getAdjustedValue(structure1.totalStrength * weight1);
        const weightedStrength2 = temperature.getAdjustedValue(structure2.totalStrength * weight2);

        return ctx.randGen.weightedGreaterThan(weightedStrength1, weightedStrength2);
    }


    /**
     * Pits the given structure against the given list of incompatible
     * structures, deciding probabilistically on a winner.
     * 
     * @param {WorkspaceStructure} structure - The structure to test.
     * @param {Number} structureWeight - The weight factor for the structure.
     * @param {Array<WorkspaceStructure>} incompatibles - The list of 
     *      incompatible structures.
     * @param {Number} incompatiblesWeight - The weight factor for the
     *     incompatible structures. 
     * 
     */
    static fightItOut(structure, structureWeight, incompatibles, incompatiblesWeight)
    {
        if (!incompatibles || !incompatibles.length) {
            return true;
        }
        for (let incomp of incompatibles) {
            if (!Namespace.Codelets.CodeletUtils.structureVsStructure(
                structure, structureWeight, incomp, incompatiblesWeight)) {
                    return false;
            }
        }
        return true;
    }

};

})( window.CopycatJS = window.CopycatJS || {} );
