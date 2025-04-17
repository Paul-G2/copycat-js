// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * Thic codelet seeks an appropriate Description for a randomly
 * selected workspace object.
 * 
 */
 Namespace.Codelets.TopDownDescriptionScout = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-description-scout', ctx, urgency, birthdate);
        this.descriptionType = args[0]; // e.g., stringPositionCategory, alphabeticPositionCategory
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

        // Choose one of the object's descriptions
        const descriptions = this._getPossibleDescriptions(chosenObject, this.descriptionType);
        if (!descriptions || !descriptions.length) { return; }

        const weights = descriptions.map(d => d.activation);
        const chosenDescription = ctx.randGen.weightedChoice(descriptions, weights);

        // Propose the description
        ctx.coderack.proposeDescription(chosenObject, chosenDescription.category(), chosenDescription);
    }

    
    /**
     * Gets appropriate descriptions of an object, that match a given description type.
     * 
     * @param {WorkspaceObject} obj - The object to describe
     * @param {SlipNode} descriptionType - The description type to test against.
     * 
     * @private
     */
    _getPossibleDescriptions(obj, descriptionType) 
    {
        const sn = this.ctx.slipnet;
        const descriptions = [];
        for (let link of descriptionType.instanceLinks) {
            const node = link.destination;
            if ((node == sn.first) && obj.hasDescriptor(sn.letters[0])) {
                descriptions.push(node);
            }
            else if ((node == sn.last) && obj.hasDescriptor(sn.letters[sn.letters.length-1])) {
                descriptions.push(node);
            }
            else if ((node == sn.middle) && obj.isMiddleObject()) {
                descriptions.push(node);
            }
            for (let i=1; i<=sn.numbers.length; i++) {
                if ((node == sn.numbers[i-1]) && (obj instanceof Namespace.Group)) {
                    if (obj.objectList.length == i) { descriptions.push(node); }
                }
            }
        }
        return descriptions;
    }

};

})( window.CopycatJS = window.CopycatJS || {} );