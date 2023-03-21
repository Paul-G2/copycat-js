// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tries to build a proposed bond, fighting with any
 * incompatible structures if necessary.
 * 
 */
 Namespace.Codelets.BondBuilder = class extends Namespace.Codelets.CodeletBase
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
        super('bond-builder', ctx, urgency, birthdate);
        this.bond = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const bond = this.bond;
        bond.updateStrength();

        // Fizzle if the bond's objects are gone
        const wobjs = ctx.workspace.objects;
        if (!wobjs.includes(bond.source) || !wobjs.includes(bond.destination)) {
            return;
        }

        // Fizzle if the bond already exists
        for (let stringBond of bond.string.bonds) {
            if (this._sameNeighbors(bond, stringBond) && this._sameCategories(bond, stringBond)) {
                bond.category.activation = 100;
                if (bond.directionCategory) {
                    bond.directionCategory.activation = 100;
                }
                return;
            }
        }

        // Provide UI feedback
        if (ctx.ui) {
            ctx.ui.workspaceUi.getStringGraphic(bond.string).bondsGraphic.
                flashProposed(bond);
        }

        // Fight it out with any incompatible bonds
        const Utils = Namespace.Codelets.CodeletUtils;
        const incompatibleBonds = bond.string.bonds.filter(b => this._sameNeighbors(bond,b));
        if (!Utils.fightItOut(bond, incompatibleBonds, 1.0, 1.0)) {
            return;
        }

        // Fight it out with any incompatible groups
        const incompatibleGroups = bond.source.getCommonGroups(bond.destination);
        if (!Utils.fightItOut(bond, incompatibleGroups, 1.0, 1.0)) {
            return;
        }

        // Fight it out with any incompatible correspondences
        const incompatibleCorrespondences = [];
        if (bond.leftObject.leftmost || bond.rightObject.rightmost) {
            if (bond.directionCategory) {
                const incompatibleCorrespondences = this._getIncompatibleCorrespondences(bond);
                if (incompatibleCorrespondences.length > 0) {
                    if (!Utils.fightItOut(bond, incompatibleCorrespondences, 2.0, 3.0)) {
                        return;
                    }
                }
            }
        }

        // We won! Destroy the incompatibles ann build our bond.
        incompatibleBonds.forEach(x => x.break());
        incompatibleGroups.forEach(x => x.break());
        incompatibleCorrespondences.forEach(x => x.break());

        bond.build();
    }


    /**
     * Checks whether two bonds have the same neighbors.
     * @private
     * 
     */
    _sameNeighbors(bond1, bond2) 
    {
        return (bond1.leftObject == bond2.leftObject) &&
            (bond1.rightObject == bond2.rightObject);
    }


    /**
     * Checks whether two bonds have the same categories.
     * @private
     * 
     */
    _sameCategories(bond1, bond2) 
    {
        return (bond1.category == bond2.category) &&
            (bond1.directionCategory == bond2.directionCategory);
    }


    /**
     * Returns a list of correspondences that are incompatible with a given bond.
     * @private
     */
    _getIncompatibleCorrespondences(bond)
    {
        const incompatibles = [];
        if (bond.leftObject.leftmost && bond.leftObject.correspondence) 
        {
            const obj = (bond.string == bond.ctx.workspace.initial) ?
                bond.leftObject.correspondence.objFromTarget : bond.leftObject.correspondence.objFromInitial;
            if (obj.leftmost && obj.rightBond) {
                if (obj.rightBond.directionCategory && (obj.rightBond.directionCategory != bond.directionCategory)) {
                    incompatibles.push(bond.leftObject.correspondence);
                }
            }
        }
        if (bond.rightObject.rightmost && bond.rightObject.correspondence)
        {
            const obj = (bond.string == bond.ctx.workspace.initial) ?
                bond.rightObject.correspondence.objFromTarget : bond.rightObject.correspondence.objFromInitial;
            if (obj.rightmost && obj.leftBond) {
                if (obj.leftBond.directionCategory && (obj.leftBond.directionCategory != bond.directionCategory)) {
                    incompatibles.push(bond.rightObject.correspondence);
                }
            }
        }
        return incompatibles;
    }


};

})( window.CopycatJS = window.CopycatJS || {} );