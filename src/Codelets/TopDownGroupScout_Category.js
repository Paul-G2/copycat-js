// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet seeks potential Groups in the initial and target strings.
 * 
 */
 Namespace.Codelets.TopDownGroupScout_Category = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-group-scout--category', ctx, urgency, birthdate);
        this.groupCategory = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;

        const cat = this.groupCategory.getRelatedNode(sn.bondCategory);
        if (!cat) { return; }
        
        let source = CodeletUtils.getScoutSource(ctx, 'bondCategory', cat);
        if (!source || source.spansString()) { return; }
        
        let direction = source.leftmost ? sn.right : source.rightmost ? sn.left :
            ctx.randGen.weightedChoice([sn.left, sn.right], [sn.left.activation, sn.right.activation]);
        
        let firstBond = (direction == sn.left) ? source.leftBond : source.rightBond;

        if (!firstBond || (firstBond.category != cat)) {
            // Check  other side of object
            firstBond = (direction == sn.right) ? source.leftBond : source.rightBond;
            if (!firstBond || (firstBond.category != cat)) {
                if ((cat == sn.sameness) && (source instanceof Namespace.Letter)) {
                    if (ctx.randGen.coinFlip(this._singleLetterGroupProbability(source))) { 
                        // Propose a single-letter group
                        ctx.coderack.proposeGroup([source], [], sn.samenessGroup, null, sn.letterCategory);
                        return;
                    }
                }
            }
            return;
        }

        direction = firstBond.directionCategory;
        let search = true;
        let bondFacet = null;
        // Find leftmost object in group with these bonds
        while (search) {
            search = false;
            if (!source.leftBond) {
                continue;
            }
            if (source.leftBond.category != cat) {
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
            if (destination.rightBond.category != cat) {
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
        ctx.coderack.proposeGroup(objects, bonds, this.groupCategory, direction, bondFacet);
    }



    /**
     * Calculates the probability of a single letter group.
     * @private
     */
    _singleLetterGroupProbability(letter)
    {
        const sn = this.ctx.slipnet;
        const group = new Namespace.Group(letter.string, sn.samenessGroup,
            null, sn.letterCategory, [letter], []);

        const numSupporters = group._numberOfLocalSupportingGroups();
        if (numSupporters === 0) {
            return 0.0;
        }

        const exp = (numSupporters == 1) ? 4.0 : (numSupporters == 2) ? 2.0 : 1.0;
        const support = group._localSupport() / 100;
        const activation = sn.length.activation / 100;
        const supportedActivation = Math.pow((support * activation), exp);
        return this.ctx.temperature.getAdjustedProb(supportedActivation);
    }
};

})( window.CopycatJS = window.CopycatJS || {} );