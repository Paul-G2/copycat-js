// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};
    
/**
 * @classdesc
 * This codelet tries to build a proposed Group, fighting against 
 * competitors if necessary. 	
 * 
 */
 Namespace.Codelets.GroupBuilder = class extends Namespace.Codelets.CodeletBase
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
        super('group-builder', ctx, urgency, birthdate);
        this.group = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const sn = ctx.slipnet;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;
        const group = this.group;

        // If an equivalent group already exists, just activate it.
        const equivalent = group.string.getEquivalentGroup(group);
        if (equivalent) {
            group.descriptions.forEach(d => d.descriptor.activation = 100);
            equivalent.addDescriptions(group.descriptions);
            return;
        }

        // Check to see if all objects are still there
        for (let o of group.objectList) {
            if (!wksp.objects.includes(o)) { return; }
        }

        // Provide UI feedback
        if (ctx.ui) {
            ctx.ui.workspaceUi.getStringGraphic(group.string).
                groupsGraphic.flashProposed(group);
        }

        // Check to see if bonds have the same direction
        const incompatibleBonds = [];
        if (group.objectList.length > 1) {
            let previous = group.objectList[0];
            for (let obj of group.objectList.slice(1)) {
                const leftBond = obj.leftBond;
                if (leftBond) {
                    if (leftBond.leftObject == previous) {
                        continue;
                    }
                    if (leftBond.directionCategory == group.directionCategory) {
                        continue;
                    }
                    incompatibleBonds.push(leftBond);
                }
                previous = obj;
            }

            const n = group.objectList.length;
            let next = group.objectList[n-1];
            for (let i=n-2; i>=0; i--) { // Don't use reverse(); it changes the array
                const obj = group.objectList[i];
                const rightBond = obj.rightBond;
                if (rightBond) {
                    if (rightBond.rightObject == next) {
                        continue;
                    }
                    if (rightBond.directionCategory == group.directionCategory) {
                        continue;
                    }
                    incompatibleBonds.push(rightBond);
                }
                next = obj;
            }
        }

        // If incompatible bonds exist then fight
        group.updateStrength();
        if (!CodeletUtils.fightItOut(group, incompatibleBonds, 1.0, 1.0)) {
            return;
        }

        // If incompatible groups exist then fight
        const incompatibleGroups = this._getIncompatibleGroups(group);
        if (!CodeletUtils.fightItOut(group, incompatibleGroups, 1.0, 1.0)) {
            return;
        }

        // Break incompatible bonds
        incompatibleBonds.forEach(b => b.break());

        // Create new bonds
        var source, destination;
        group.bondList = [];
        for (let i=1; i<group.objectList.length; i++) {
            const object1 = group.objectList[i - 1];
            const object2 = group.objectList[i];
            if (!object1.rightBond) {
                [source, destination] = 
                    (group.directionCategory == sn.right) ? [object1, object2] : [object2, object1];
                const category = group.groupCategory.getRelatedNode(sn.bondCategory);
                const facet = group.facet;
                const newBond = new Namespace.Bond(source, destination, category, facet,
                    source.getDescriptor(facet), destination.getDescriptor(facet));
                newBond.build();
            }
            group.bondList.push(object1.rightBond);
        }
        incompatibleGroups.forEach(g => g.break());
        group.build();
        group.descriptions.forEach(d => d.descriptor.activation = 100);
    }


    /**
     * Gets all groups that have an object in common with 
     * the given one.
     * @private
     */
    _getIncompatibleGroups(group)
    {
        const result = [];
        for (let obj of group.objectList) {
            while (obj.group) {
                if (obj.group != group) {
                    result.push(obj.group);
                    obj = obj.group;
                }
            }
        }
        return result;
    }    


};

})( window.CopycatJS = window.CopycatJS || {} );