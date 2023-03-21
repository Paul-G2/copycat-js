// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tries to build a proposed correspondence, fighting against 
 * competitors if necessary. 			    
 * 
 */
 Namespace.Codelets.CorrespondenceBuilder = class extends Namespace.Codelets.CodeletBase
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
        super('correspondence-builder', ctx, urgency, birthdate);
        this.correspondence = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const SvS = Namespace.Codelets.CodeletUtils.structureVsStructure;

        const corresp = this.correspondence;
        const objFromInitial = corresp.objFromInitial;
        const objFromTarget = corresp.objFromTarget;

        // If either of the two objects (or possibly a flipped version) no longer 
        // exists, then fizzle.
        const wantFlip = corresp.flipTargetObject;
        const flippedTargetObj = wantFlip ? objFromTarget.flippedVersion() : null;
        const objsExist = wksp.objects.includes(objFromInitial) && (wksp.objects.includes(objFromTarget) ||
            (wantFlip && wksp.targetWString.getEquivalentGroup(flippedTargetObj)));
        if (!objsExist) { return; }
        
        // If the correspondence already exists, activate its concept mapping labels,
        // and add relevant new ones, and fizzle.
        if (this._isReflexive(corresp))
        {
            const existing = objFromInitial.correspondence;
            for (let mapping of corresp.conceptMappings) {
                if (mapping.label) {
                    mapping.label.activation = 100;
                }
                if (!mapping.isContainedIn(existing.conceptMappings)) {
                    existing.conceptMappings.push(mapping);
                }
            }
            return;
        }
    
        // Fight incompatibles.
        // The weights for the fight depend on the letter-span of the objects.
        // This is one of the reasons the program prefers correspondences to groups 
        // rather than to letters.  Another reason is that groups are more salient
        // than letters, so they are more likely to be chosen by correspondence scouts.
        const incompatibles = wksp.initialWString.objects.filter(o =>
            o.correspondence && corresp.isIncompatibleWith(o.correspondence)).
            map(o => o.correspondence);
        if (incompatibles && incompatibles.length) 
        {
            const correspSpan = corresp.objFromInitial.letterSpan() + corresp.objFromTarget.letterSpan();
            for (let incompat of incompatibles) {
                const incompatSpan = incompat.objFromInitial.letterSpan() + incompat.objFromTarget.letterSpan();
                if (!SvS(corresp, correspSpan, incompat, incompatSpan)) {
                    return;
                }
            }
        }

        // If there is an incompatible bond, then fight against it, and its
        // group, if any. 
        var incompatibleBond;
        var incompatibleGroup;
        if ((objFromInitial.leftmost || objFromInitial.rightmost) &&
                (objFromTarget.leftmost || objFromTarget.rightmost)) 
        {
            incompatibleBond = this._getIncompatibleBond(corresp);
            if (incompatibleBond) {
                if (!SvS(corresp, 3, incompatibleBond, 2)) {
                    return;
                }
                incompatibleGroup = objFromTarget.group;
                if (incompatibleGroup) {
                    if (!SvS(corresp, 3, incompatibleGroup, 2)) {
                        return;
                    }
                }
            }
        }

        // If there is an incompatible rule, fight against it
        var incompatibleRule;
        if (wksp.rule && this._incompatibleRuleCorrespondence(wksp.rule, corresp)) {
            incompatibleRule = wksp.rule;
            if (!SvS(corresp, 1, incompatibleRule, 1)) {
                return;
            }
        }

        incompatibles.forEach(x => x.break());
        if (incompatibleBond) {
            incompatibleBond.break();
        }
        if (incompatibleGroup) {
            incompatibleGroup.break();
        }
        if (incompatibleRule) {
            incompatibleRule.break();
        }
        corresp.build();
    }


    /**
     * Determines if the given rule and correspondence are incompatible.
     * @private
     * 
     */
    _incompatibleRuleCorrespondence(rule, corresp)
    {
        if (!rule || !corresp) {
            return false;
        }

        // Find changed object
        const changeds = this.ctx.workspace.initialWString.objects.filter(o => o.changed);
        if (!changeds.length) {
            return false;
        }

        const changed = changeds[0];
        if (corresp.objFromInitial != changed) {
            return false;
        }   

        // It is incompatible if the rule descriptor is not in the mapping list
        return corresp.conceptMappings.some(m => m.initialDescriptor == rule.descriptor);
    }


    /**
     * Gets the incompatible bond, if any, for the given correspondence.
     * @private
     * 
     */
    _getIncompatibleBond(corresp)
    {
        const sn = this.ctx.slipnet;

        const initialBond = corresp.objFromInitial.leftmost ? corresp.objFromInitial.rightBond :
            corresp.objFromInitial.rightmost ? corresp.objFromInitial.leftBond : null;
        if (!initialBond ) {
            return null;
        }

        const targetBond = corresp.objFromTarget.leftmost ? corresp.objFromTarget.rightBond :
            corresp.objFromTarget.rightmost ? corresp.objFromTarget.leftBond : null;
        if (!targetBond ) {
            return null;
        }

        if (initialBond.directionCategory && targetBond.directionCategory) {
            const mapping = new Namespace.ConceptMapping(
                sn.directionCategory, sn.directionCategory,
                initialBond.directionCategory, targetBond.directionCategory,
                null, null);
            for (let cm of corresp.conceptMappings) {
                if (cm.isIncompatibleWith(mapping)) {
                    return targetBond;
                }
            }
        }
        return null;
    }


    /**
     * Determines if the given correspondence is reflexive.
     * @private
     * 
     */
    _isReflexive(corresp)
    {
        const initial = corresp.objFromInitial;
        return initial.correspondence && 
            (initial.correspondence.objFromTarget == corresp.objFromTarget);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );