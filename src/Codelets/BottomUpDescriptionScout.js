// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * 
 * Thic codelet seeks an appropriate Description for a randomly
 * selected workspace object.
 */
 Namespace.Codelets.BottomUpDescriptionScout = class extends Namespace.Codelets.CodeletBase
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
        super('bottom-up-description-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const Utils = Namespace.Codelets.CodeletUtils;

        // Choose a workspace object, based on salience.
        const chosenObject = Utils.chooseUnmodifiedObject(ctx, 'totalSalience', ctx.workspace.objects);
        if (!chosenObject) { return; }

        // Choose a relevant description by activation
        const descriptions = chosenObject.relevantDescriptions();
        const dWeights = descriptions.map(d => d.activation);
        const description = ctx.randGen.weightedChoice(descriptions, dWeights);
        if (!description) { return; }

        // Choose one of the description's property links
        const propertyLinks = this._shortPropertyLinks(ctx, description.descriptor);
        if (!propertyLinks.length) { return; }
        
        const sWeights = propertyLinks.map(s => s.degreeOfAssociation() * s.destination.activation);
        const chosen = ctx.randGen.weightedChoice(propertyLinks, sWeights);
        const chosenProperty = chosen.destination;

        // Propose the description
        ctx.coderack.proposeDescription(chosenObject, chosenProperty.category(), chosenProperty);
    }



    /**
     * Returns a random subset a descriptor's property links, preferring
     * links that are short. 
     * @private
     * 
     */
    _shortPropertyLinks(ctx, descriptor)
    {
        const result = [];
        for (let propertyLink of descriptor.propertyLinks)  
        {
            const association = propertyLink.degreeOfAssociation() / 100;
            const prob = ctx.temperature.getAdjustedProb(association);
            if (ctx.randGen.coinFlip(prob)) {
                result.push(propertyLink);
            }
        }
        return result;
    }   

};

})( window.CopycatJS = window.CopycatJS || {} );