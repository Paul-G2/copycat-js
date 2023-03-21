// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tries to propose a Rule based on the descriptions
 * of the initial string's changed letter and its replacement.
 * 
 */
 Namespace.Codelets.RuleScout = class extends Namespace.Codelets.CodeletBase
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
        super('rule-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const wksp = ctx.workspace;
        const coderack = ctx.coderack;

        // If not all replacements have been found, then fizzle.
        const numUnreplaced = wksp.objects.filter(o => (o.string == wksp.initialWString) &&
            (o instanceof Namespace.Letter) && !o.replacement).length;
        if (numUnreplaced !== 0) { return; }

        const changedObjects = wksp.initialWString.objects.filter(o => o.changed);
        
        // If there are no changed objects, propose a rule with no changes
        if (!changedObjects.length) {
            coderack.proposeRule();
            return;
        }
    
        // Generate a list of distinguishing descriptions for the first object
        const changed = changedObjects[changedObjects.length-1];
        let objectList = [];
        const position = changed.getDescriptor(sn.stringPositionCategory);
        if (position) {
            objectList.push(position);
        }

        const letter = changed.getDescriptor(sn.letterCategory);
        const otherObjectsOfSameLetter = wksp.initialWString.objects.filter(o =>
            (o != changed) && o.getDescriptionType(letter));
        if (!otherObjectsOfSameLetter.length) {
            objectList.push(letter);
        }

        if (changed.correspondence) {
            const targetObject = changed.correspondence.objFromTarget;
            const newList = [];
            const slippages = wksp.getSlippableMappings();
            for (let node of objectList) {
                node = node.applySlippages(slippages);
                if (targetObject.hasDescriptor(node)) {
                    if (targetObject.isDistinguishingDescriptor(node)) {
                        newList.push(node);
                    }
                }
            }
            objectList = newList; 
        }
        if (!objectList.length) { return; }

        // Choose the relation 
        let weights = objectList.map(o => ctx.temperature.getAdjustedValue(o.depth));
        const descriptor = ctx.randGen.weightedChoice(objectList, weights);
        objectList = [];
        if (changed.replacement.relation) {
            objectList.push(changed.replacement.relation);
        }
        objectList.push(changed.replacement.objFromModified.getDescriptor(sn.letterCategory));
        weights = objectList.map(o => ctx.temperature.getAdjustedValue(o.depth));
        const relation = ctx.randGen.weightedChoice(objectList, weights);

        coderack.proposeRule(sn.letterCategory, descriptor, sn.letter, relation);        
    }
};

})( window.CopycatJS = window.CopycatJS || {} );