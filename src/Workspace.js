// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The Workspace is where Copycat builds its perceptual structures.
 * 
 */
 Namespace.Workspace = class {

    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     */
    constructor(ctx) 
    { 
        this.ctx = ctx;

        this.initialJString = '';
        this.modifiedJString = '';
        this.targetJString = '';

        this.initialWString = null;
        this.modifiedWString = null;
        this.targetWString = null;
        
        this.intraStringUnhappiness = 0;
        this.interStringUnhappiness = 0;

        this.finalAnswer = null;
        this.changedObject = null;
        this.rule = null;
        this.objects = [];
        this.structures = [];
    }


    /**
     * Returns a string describing the object.
     */
    synopsis()
    {
        return '<Workspace: ' + this.initialJString + ':' + 
            this.modifiedJString + ' :: ' + this.targetJString  + ':?>';
    }


    /**
     * Resets the workspace to its initial state, optionally modifying the 
     * input strings.
     * 
     * @param {String} [initialString] - The 'a' in a:b -> c:d
     * @param {String} [modifiedString] - The 'b' in a:b -> c:d
     * @param {String} [targetString] - The 'd' in a:b -> c:d
     * 
     */
    reset(initialString=null, modifiedString=null, targetString=null)
    {
        // Clear the workspace
        this.finalAnswer = null;
        this.changedObject = null;
        this.objects = [];
        this.structures = [];
        this.rule = null;
        this.intraStringUnhappiness = 0;
        this.interStringUnhappiness = 0;

        // Cache the problem-specification strings, or use the existing ones
        this.initialJString = 
            initialString ? initialString.toLowerCase() : this.initialJString;
        this.modifiedJString = 
            modifiedString ? modifiedString.toLowerCase() : this.modifiedJString;
        this.targetJString = 
            targetString ? targetString.toLowerCase() : this.targetJString;
        
        // Create (or re-create) the WorkspaceStrings
        this.initialWString = 
            new Namespace.WorkspaceString(this.ctx, this.initialJString);
        this.modifiedWString = 
            new Namespace.WorkspaceString(this.ctx, this.modifiedJString);
        this.targetWString = 
            new Namespace.WorkspaceString(this.ctx, this.targetJString);
    }


    /**
     * Updates the structure strengths, and the happiness, importance,
     * and salience of all objects and strings in the workspace.
     * 
     */
    updateEverything()
    {
        // Update structures
        for (let structure of this.structures) {
            structure.updateStrength();
        }

        // Update objects
        for (let obj of this.objects) {
            obj.updateValues();
        }

        // Update strings
        this.initialWString.updateRelativeImportances();
        this.targetWString.updateRelativeImportances();
        this.initialWString.updateIntraStringUnhappiness();
        this.targetWString.updateIntraStringUnhappiness();
    }


    /**
     * Updates the string unhappiness values and then uses them to 
     * calculate the current workspace temperature.
     * 
     */
    calcTemperature()
    {
        // First, update my happiness values
        this.intraStringUnhappiness = Math.min(100, 0.5 * this.objects.map(
            o => o.relativeImportance * o.intraStringUnhappiness).
                reduce((a,b) => a+b, 0));
            
        this.interStringUnhappiness = Math.min(100, 0.5 * this.objects.map(
            o => o.relativeImportance * o.interStringUnhappiness).
                reduce((a,b) => a+b, 0));
                
        const totalUnhappiness = Math.min(100, 0.5 * this.objects.map(
            o => o.relativeImportance * o.totalUnhappiness).
                reduce((a,b) => a+b, 0));

        // Now, calculate the temperature
        let ruleWeakness = 100;
        if (this.rule) {
            this.rule.updateStrength();
            ruleWeakness = 100 - this.rule.totalStrength;
        }
        const temperature = 0.8*totalUnhappiness + 0.2*ruleWeakness;
        return temperature;
    }


    /**
     * Gets all the concept mappings in the workspace that permit slippage.
     * 
     */
    getSlippableMappings()
    {
        const result = [];
        if (this.changedObject && this.changedObject.correspondence) {
            result.push(...this.changedObject.correspondence.conceptMappings);
        }

        const corresps = this.initialWString.objects.filter(
            o => o.correspondence).map(o => o.correspondence);
        corresps.forEach(corresp => 
            result.push(...corresp.getSlippableMappings().filter(
                m => !m.isNearlyContainedIn(result)))
        );

        return result;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );