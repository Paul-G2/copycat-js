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
     * @param {String} [initialString] - The 'A' in A:B -> C:D
     * @param {String} [modifiedString] - The 'B' in A:B -> C:D
     * @param {String} [targetString] - The 'C' in A:B -> C:D
     */
    constructor(ctx, initialString='abc', modifiedString='abd', targetString='pqr') 
    { 
        this.ctx = ctx;
        this.objects = [];
        this.structures = [];
        this.changedObject = null;
        this.rule = null;
        this.intraStringUnhappiness = 0;
        this.interStringUnhappiness = 0;

        this.initialWString  = new Namespace.WorkspaceString(this, initialString?.toLowerCase() || '');
        this.modifiedWString = new Namespace.WorkspaceString(this, modifiedString?.toLowerCase() || '');
        this.targetWString   = new Namespace.WorkspaceString(this, targetString?.toLowerCase() || '');
        this.finalAnswer     = null; // A javascript string
    }


    /**
     * Returns a string describing the object.
     */
    synopsis()
    {
        return '<Workspace: ' + this.initialWString.jstring + ':' + 
            this.modifiedWString.jstring + ' :: ' + this.targetWString.jstring  + ':?>';
    }


    /**
     * Resets the workspace to its initial state, optionally modifying the 
     * input strings.
     * 
     * @param {String} [initialString] - The 'A' in A:B -> C:D
     * @param {String} [modifiedString] - The 'B' in A:B -> C:D
     * @param {String} [targetString] - The 'C' in A:B -> C:D
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
        
        // Create or reset the WorkspaceStrings
        this.initialWString  = new Namespace.WorkspaceString(this, initialString?.toLowerCase() || this.initialWString.jstring);
        this.modifiedWString = new Namespace.WorkspaceString(this, modifiedString?.toLowerCase() || this.modifiedWString.jstring);
        this.targetWString   = new Namespace.WorkspaceString(this, targetString?.toLowerCase() || this.targetWString.jstring);
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
        this.intraStringUnhappiness = 
            Math.min(100, 0.5 * this.objects.map(o => o.relativeImportance * o.intraStringUnhappiness).reduce((a,b) => a+b, 0));
            
        this.interStringUnhappiness = 
            Math.min(100, 0.5 * this.objects.map(o => o.relativeImportance * o.interStringUnhappiness).reduce((a,b) => a+b, 0));
                
        const totalUnhappiness = 
            Math.min(100, 0.5 * this.objects.map(o => o.relativeImportance * o.totalUnhappiness).reduce((a,b) => a+b, 0));

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

        const corresps = this.initialWString.objects.filter(o => o.correspondence).map(o => o.correspondence);
        corresps.forEach( 
            corresp => result.push(...corresp.getSlippableMappings().filter(m => !m.isNearlyContainedIn(result))) 
        );

        return result;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );