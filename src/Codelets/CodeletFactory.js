// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This class provides a factory method for creating codelets.
 * 
 */
 Namespace.Codelets.CodeletFactory = class
 {
    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     */
    constructor(ctx) 
    { 
        this.ctx = ctx;
    }


    /**
     * Creates a codelet given its name, passing
     * the given arguments to the codelet constructor.
     * 
     * @param {string} name - The name of the codelet.
     * @param {Number} urgency - The urgency of the codelet.
     * @param {Array} codeletArgs - Arguments to pass to the codelet.
     * @param {Number} birthdate - The birthdate of the codelet.
     * 
     */
    create(name, urgency, codeletArgs, birthdate)
    {
        if (!birthdate && birthdate !== 0) {
            birthdate = this.ctx.coderack.numCodeletsRun;
        }

        const NS = Namespace.Codelets;
        const ctorArgs = [this.ctx, urgency, codeletArgs, birthdate];

        let result = null;
        switch (name) 
        {
            case 'bond-builder':
                result = new NS.BondBuilder(...ctorArgs);
                break;

            case 'bond-strength-tester':
                result = new NS.BondStrengthTester(...ctorArgs);
                break;

            case 'bottom-up-bond-scout':
                result = new NS.BottomUpBondScout(...ctorArgs);
                break;
                
            case 'bottom-up-correspondence-scout':
                result = new NS.BottomUpCorrespondenceScout(...ctorArgs);
                break;

            case 'bottom-up-description-scout':
                result = new NS.BottomUpDescriptionScout(...ctorArgs);
                break;

            case 'breaker':
                result = new NS.Breaker(...ctorArgs);
                break;

            case 'correspondence-builder':                
                result = new NS.CorrespondenceBuilder(...ctorArgs);
                break;

            case 'correspondence-strength-tester':                
                result = new NS.CorrespondenceStrengthTester(...ctorArgs);
                break;

            case 'description-builder':
                result = new NS.DescriptionBuilder(...ctorArgs);
                break;

            case 'description-strength-tester':
                result = new NS.DescriptionStrengthTester(...ctorArgs);
                break;

            case 'group-builder':
                result = new NS.GroupBuilder(...ctorArgs);
                break;

            case 'group-strength-tester':
                result = new NS.GroupStrengthTester(...ctorArgs);
                break;

            case 'important-object-correspondence-scout':
                result = new NS.ImportantObjectCorrespondenceScout(...ctorArgs);
                break;

            case 'replacement-finder':
                result = new NS.ReplacementFinder(...ctorArgs);
                break;

            case 'rule-builder':
                result = new NS.RuleBuilder(...ctorArgs);
                break;

            case 'rule-scout':
                result = new NS.RuleScout(...ctorArgs);
                break;
                      
            case 'rule-strength-tester':
                result = new NS.RuleStrengthTester(...ctorArgs);
                break;

            case 'rule-translator':
                result = new NS.RuleTranslator(...ctorArgs);
                break;

            case 'top-down-bond-scout--category':
                result = new NS.TopDownBondScout_Category(...ctorArgs);
                break;
        
            case 'top-down-bond-scout--direction':
                result = new NS.TopDownBondScout_Direction(...ctorArgs);
                break;
        
            case 'top-down-description-scout':
                result = new NS.TopDownDescriptionScout(...ctorArgs);
                break;
    
            case 'top-down-group-scout--category':
                result = new NS.TopDownGroupScout_Category(...ctorArgs);
                break;
        
            case 'top-down-group-scout--direction':
                result = new NS.TopDownGroupScout_Direction(...ctorArgs);
                break;
            
            case 'group-scout--whole-string':               
                result = new NS.GroupScout_WholeString(...ctorArgs);
                break;

            default:
                    throw new Error('Unknown codelet name: ' + name);
        }
        return result;
    }
};

})( window.CopycatJS = window.CopycatJS || {} );