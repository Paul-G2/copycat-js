// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A Rule describes a change from the initial to the modified string.
 * For example, "Replace the rightmost letter by its successor."
 * 
 */
 Namespace.Rule = class  {

    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {SlipNode} facet - The descriptionType of the facet to be 
     *      replaced. (e.g., letterCategory) 
     * @param {SlipNode} descriptor - The descriptor of the facet to be 
     *      replaced. (e.g., rightmost)
     * @param {SlipNode} category - The category of the facet to be 
     *      replaced. (e.g., letter)
     * @param {SlipNode} relation - The relation to be applied. 
     *      (e.g., successor)
     */
    constructor(ctx, facet, descriptor, category, relation) 
    { 
        // WorkspaceStructure members
        this.ctx = ctx;
        this.string = null;        
        this.totalStrength = 0;

        this.facet = facet || null;
        this.descriptor = descriptor || null;
        this.category = category || null;
        this.relation = relation || null;
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        const s = !this.facet ? 'No change' : 'Replace ' + this.facet.name + 
            ' of ' + this.descriptor.name + ' ' + this.category.name + 
            ' by ' + this.relation.name;

        return !type ? s : '<Rule: ' + s + '>';
    }


    /**
     * Adds the Rule to the workspace, replacing any pre-existing one.
     * 
     */
    build()
    {
        const wksp = this.ctx.workspace;
        if (wksp.rule) {
            wksp.structures = wksp.structures.filter(s => s !== wksp.rule);
        }
        wksp.rule = this;
        wksp.structures.push(this);
        this.activate();
    }  


    /**
     * Removes the Rule from the workspace.
     * 
     */
    break()
    {
        const wksp = this.ctx.workspace;
        if (wksp.rule) {
            wksp.structures = wksp.structures.filter(s => s !== wksp.rule);
            wksp.rule = null;
        }
    }
    
    
    /**
     * Sets the activation buffer of all the Rule's nodes to 100.
     * 
     */
    activate()
    {
        if (this.relation) {
            this.relation.activation = 100;
        }
        if (this.facet) {
            this.facet.activation = 100;
        }
        if (this.category) {
            this.category.activation = 100;
        }
        if (this.descriptor) {
            this.descriptor.activation = 100;
        }       
    }


    /**
     * Indicates whether this Rule is the same (by value) as another one.
     * 
     * @param {Rule} other - The Rule to compare with. 
     */
    sameAs(other) 
    {
        if (!other) {
            return false;
        }
        return ( 
            (this.relation == other.relation) && 
            (this.facet == other.facet) && 
            (this.category == other.category) && 
            (this.descriptor == other.descriptor) 
        );
    }
    

    /**
     * Returns a measure of the weakness of this Rule.
     * 
     */
    totalWeakness()
    {
        return 100 - Math.pow(this.totalStrength, 0.95);
    }
    
    
    /**
     * Updates the total strength value.
     * 
     */
    updateStrength()
    {
        // Internal strength
        const wksp = this.ctx.workspace;
        let internalStrength = 0;
        if (!this.descriptor || !this.relation) {
            internalStrength = 50;
        }
        else
        {
            let avgDepth = (this.descriptor.depth + this.relation.depth) / 2;
            avgDepth = Math.pow(avgDepth, 1.1);

            let carryOn = true;
            let sharedDescriptorTerm = 0;
            const changedObjects = wksp.initialWString.objects.filter(
                o => o.changed);            
            if (changedObjects.length > 0) {
                const changed = changedObjects[0];
                if (changed && changed.correspondence) {
                    sharedDescriptorTerm = 100;
                    const targetObject = changed.correspondence.objFromTarget;
                    const slippages = wksp.getSlippableMappings();
                    const slipnode = this.descriptor.applySlippages(slippages);
                    if (!targetObject.hasDescriptor(slipnode)) {
                        internalStrength = 0;
                        carryOn = false;
                    }
                }
            }
            if (carryOn) 
            {
                const conceptualHeight = (100 - this.descriptor.depth) / 10;
                const sharedDescriptorWeight = Math.pow(conceptualHeight, 1.4); 
                const depthDifference = 100 - Math.abs(
                    this.descriptor.depth - this.relation.depth);
                const wtSum = 12 + 18 + sharedDescriptorWeight;
                internalStrength = (12*depthDifference + 18*avgDepth + 
                    sharedDescriptorWeight*sharedDescriptorTerm)/wtSum;
                internalStrength = Math.min(100, internalStrength);
            }
        }

        // External strength
        const externalStrength = internalStrength;

        // Total strength
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }


    /**
     * Applies the Rule to the target string and returns the result.
     * 
     */
    applyRuleToTarget()
    {
        const wksp = this.ctx.workspace;
        if (!this.descriptor || !this.relation) {
            return wksp.targetJString;
        }

        const slippages = wksp.getSlippableMappings();
        this.category = this.category.applySlippages(slippages);
        this.facet = this.facet.applySlippages(slippages);
        this.descriptor = this.descriptor.applySlippages(slippages);
        this.relation = this.relation.applySlippages(slippages);
        
        // Generate the final string
        const changeds = wksp.targetWString.objects.filter(o => 
            o.hasDescriptor(this.descriptor) && o.hasDescriptor(this.category));
        if (changeds.length === 0) {
            return wksp.targetJString;
        }
        else if (changeds.length > 1) {
            this.ctx.reporter.warn("Rule: More than one letter changed. " + 
            "Sorry, Copycat can't solve problems like this right now.");
            return null;
        }
        else {
            const changed = changeds[0];
            const left = changed.leftIndex - 1;
            const right = changed.rightIndex;
            const ts = wksp.targetJString;
            const changedMiddle = this._changeSubString(ts.substring(left,right));
            if (changedMiddle === null) {
                return null;
            }
            else {
                return ts.substring(0,left) + changedMiddle + ts.substring(right);
            }
        }
    }


    /**
     * Applies the Rule's text tranformation to the part of the
     * target string that needs to change.
     * 
     * @private
     */
    _changeSubString(jString)
    {
        const sn = this.ctx.slipnet;
        
        if (this.facet == sn.length) {
            if (this.relation == sn.predecessor) {
                return jString.substring(0, jString.length-1);
            }
            else if (this.relation == sn.successor) {
                return jString + jString[0];
            }
            else {
                return jString;
            }
        }
        // Apply character changes
        if (this.relation == sn.predecessor) {
            if (jString.includes('a')) {
                return null;
            }
            else {
                const chars = jString.split(''); 
                const newChars = chars.map(
                    c => String.fromCharCode(c.charCodeAt(0) - 1)); 
                return newChars.join('');
            }
        }
        else if (this.relation == sn.successor) {
            if (jString.includes('z')) {
                return null;
            }
            else {
                const chars = jString.split(''); 
                const newChars = chars.map(
                    c => String.fromCharCode(c.charCodeAt(0) + 1)); 
                return newChars.join('');
            }
        }
        else {
            return this.relation.name.toLowerCase();
        }
    }
};



})( window.CopycatJS = window.CopycatJS || {} );