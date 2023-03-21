// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tries to make a group out of the entire string.
 * 
 */
 Namespace.Codelets.GroupScout_WholeString = class extends Namespace.Codelets.CodeletBase
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
        super('group-scout--whole-string', ctx, urgency, birthdate);
        this.direction = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const wksp = ctx.workspace;

        // Choose either the initial or target string
        const string = ctx.randGen.choice([wksp.initialWString, wksp.targetWString]);
        
        // Find leftmost object & the highest group to which it belongs
        const lms = string.objects.filter(o => o.leftmost);
        let leftmost = lms.length ? lms[0] : null;
        if (!leftmost) { return; }
        while (leftmost.group && (leftmost.group.bondCategory == sn.sameness)) {
            leftmost = leftmost.group;
        }

        if (leftmost.spansString()) {
            // The object already spans the string - propose this object
            if (leftmost instanceof Namespace.Group) {
                const lmGroup = leftmost;
                ctx.coderack.proposeGroup(lmGroup.objectList, lmGroup.bondList,
                    lmGroup.groupCategory, lmGroup.directionCategory, lmGroup.facet);
            }
            else {
                ctx.coderack.proposeGroup([leftmost], [], sn.samenessGroup, null,
                    sn.letterCategory);
            }
            return;
        }

        let bonds = [];
        const objects = [leftmost];
        while (leftmost.rightBond) {
            bonds.push(leftmost.rightBond);
            leftmost = leftmost.rightBond.rightObject;
            objects.push(leftmost);
        }
        if (!leftmost.rightmost) { return; }

        // Choose a random bond from list
        const chosenBond = ctx.randGen.choice(bonds);
        bonds = this._possibleGroupBonds(chosenBond, bonds);
        if (!bonds.length) { return; }

        const groupCategory = chosenBond.category.getRelatedNode(sn.groupCategory);
        ctx.coderack.proposeGroup(
            objects, bonds, groupCategory, chosenBond.directionCategory, chosenBond.facet);
    }


    /**
     * From a given list of bonds, get bonds that match the chosen bond.
     * @private
     */
    _possibleGroupBonds(chosenBond, bonds)
    {
        const result = [];

        for (let bond of bonds) {
            if ((bond.category == chosenBond.category) && 
                (bond.directionCategory == chosenBond.directionCategory)) {
                    result.push(bond);
            }
            else {
                // A modified bond might be made
                if (bond.category == chosenBond.category) {
                    return [];  
                }
                if (bond.directionCategory == chosenBond.directionCategory) {
                    return [];  
                }
                if ([chosenBond.category, bond.category].includes(this.ctx.slipnet.sameness)) {
                    return [];
                }
                const newBond = new Namespace.Bond(bond.destination, bond.source, 
                    chosenBond.category, chosenBond.facet, bond.destDescriptor, 
                    bond.sourceDescriptor);
                result.push(newBond);
            }
        }
        return result;
    }

};

})( window.CopycatJS = window.CopycatJS || {} );