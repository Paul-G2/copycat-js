// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet seeks potential Groups in the initial and target strings.
 * 
 */
 Namespace.Codelets.TopDownGroupScout_Direction = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-group-scout--direction', ctx, urgency, birthdate);
        this.direction = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;

        let direction = this.direction;
        let source = CodeletUtils.getScoutSource(ctx, 'bondDirection', direction);
        if (!source || source.spansString()) { return; }
        
        const myDir = source.leftmost ? sn.right : source.rightmost ? sn.left : 
            ctx.randGen.weightedChoice([sn.left, sn.right], [sn.left.activation, sn.right.activation]);
        
        let firstBond = (myDir == sn.left) ? source.leftBond : source.rightBond;
        if (firstBond && !firstBond.directionCategory) {
            direction = null;
        }

        if (!firstBond || (firstBond.directionCategory != direction)) {
            firstBond = (myDir == sn.right) ? source.leftBond : source.rightBond;
            if (firstBond && !firstBond.directionCategory) {
                direction = null;
            }
            if (!firstBond || (firstBond.directionCategory != direction)) { return; }
        }

        const category = firstBond.category;
        if (!category) { return; }

        const groupCategory = category.getRelatedNode(sn.groupCategory);
        let bondFacet = null;
        // Find the leftmost object in group with these bonds
        let search = true;
        while (search) {
            search = false;
            if (!source.leftBond) {
                continue;
            }
            if (source.leftBond.category != category) {
                continue;
            }
            if (source.leftBond.directionCategory != direction) {
                if (source.leftBond.directionCategory) {    
                    continue;
                }
            }
            if (!bondFacet || (bondFacet == source.leftBond.facet)) {
                bondFacet = source.leftBond.facet;
                direction = source.leftBond.directionCategory;
                source = source.leftBond.leftObject;
                search = true;
            }
        }

        // Find rightmost object in group with these bonds
        search = true;
        let destination = source;
        while (search) {
            search = false;
            if (!destination.rightBond) {
                continue;
            }
            if (destination.rightBond.category != category) {
                continue;
            }
            if (destination.rightBond.directionCategory != direction) {
                if (destination.rightBond.directionCategory) {
                    continue;
                }
            }
            if (!bondFacet || (bondFacet == destination.rightBond.facet)) {
                bondFacet = destination.rightBond.facet;
                direction = source.rightBond.directionCategory;
                destination = destination.rightBond.rightObject;
                search = true;
            }
        }
        if (destination == source) { return; }

        const objects = [source];
        const bonds = [];
        while (source != destination) {
            bonds.push(source.rightBond);
            objects.push(source.rightBond.rightObject);
            source = source.rightBond.rightObject;
        }
        ctx.coderack.proposeGroup(objects, bonds, groupCategory, direction, bondFacet);

    }
};

})( window.CopycatJS = window.CopycatJS || {} );