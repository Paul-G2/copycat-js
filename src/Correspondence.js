// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The Correspondence class represents a connecion between an initial
 * WorkspaceObject and a target WorkspaceObject, based on a set of 
 * ConceptMappings between the Descriptions of the two objects. 
 */
 Namespace.Correspondence = class {

    /**
     * @constructor
     * @param {WorkspaceObject} objFromInitial - An object from the initial string.  
     * @param {WorkspaceObject} objFromTarget - The corresponding object in the target string.
     * @param {Array<ConceptMapping>} conceptMappings - The list of concept mappings underlying the correspondence.
     * @param {Boolean} flipTargetObject - Whether the target object should be flipped.
     */
    constructor(objFromInitial, objFromTarget, 
        conceptMappings, flipTargetObject) 
    { 
        // WorkspaceStructure members
        this.wksp = objFromInitial.wksp;
        this.string = null;
        this.totalStrength = 0;

        this.objFromInitial = objFromInitial;
        this.objFromTarget = objFromTarget;
        this.conceptMappings = conceptMappings || [];
        this.flipTargetObject = flipTargetObject;

        this.accessoryConceptMappings = []; //These are the symmetric 
        // concept-mappings (e.g.,"rightmost -> leftmost" becomes 
        // "leftmost -> rightmost in the accessory concept-mapping list. 
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        let s = this.objFromInitial.synopsis() +' <--> ' + this.objFromTarget.synopsis() + ' (';
        this.conceptMappings.forEach(cm => s += cm.synopsis(0) + ', ');
        s = s.substring(0, s.length-2) + ')';

        return !type ? s : '<Correspondence: ' + s + '>';
    }

    
    /**
     * Adds the Correspondence to its assigned objects, and to the
     * workspace. Updates the accessoryConceptMappings list, and 
     * activates the labels of all the concept mappings.
     * 
     */
    build()
    {
        this.wksp.structures.push(this);

        if (this.objFromInitial.correspondence) {
            this.objFromInitial.correspondence.break();
        }
        if (this.objFromTarget.correspondence) {
            this.objFromTarget.correspondence.break();
        }
        this.objFromInitial.correspondence = this;
        this.objFromTarget.correspondence = this;
        
        // Add mappings to the accessory-concept-mapping list, as follows:  
        // Add any bond-concept-mappings.  Also add the symmetric slippages 
        // of the bond-concept-mappings (if they are slippages) and of 
        // other relevant, distinguishing slippages.
        const relevantMappings = this.conceptMappings.filter(m => m.isDistinguishing() && m.isRelevant());
        for (let mapping of relevantMappings) {
            if (mapping.canSlip()) {
                this.accessoryConceptMappings.push(mapping.symmetricVersion());
            }
        }
        if ( (this.objFromInitial instanceof Namespace.Group) && (this.objFromTarget instanceof Namespace.Group) ) {
            const bondMappings = Namespace.ConceptMapping.getMappings(
                this.objFromInitial, this.objFromTarget, this.objFromInitial.bondDescriptions, this.objFromTarget.bondDescriptions);
                
            for (let mapping of bondMappings) {
                this.accessoryConceptMappings.push(mapping);
                if (mapping.canSlip()) {
                    this.accessoryConceptMappings.push(mapping.symmetricVersion());
                }
            }
        }

        // Activate the correspondence labels.
        this.conceptMappings.filter(m => m.label).forEach(m => m.label.activation = 100);
    }  


    /**
     * Removes the Correspondence from its assigned objects and from the
     * workspace. 
     */
    break()
    {
        this.wksp.structures = this.wksp.structures.filter(s => s !== this);
        this.objFromInitial.correspondence = null;
        this.objFromTarget.correspondence = null;
    }


    /**
     * Updates the total strength value.
     * 
     */
    updateStrength()
    {
        // Internal strength is A function of the number of concept mappings,
        // as well as their strength and how well they cohere.
        let internalStrength, externalStrength;
        const distinguishingMappings = this.conceptMappings.filter(m => m.isDistinguishing() && m.isRelevant());
        const numConceptMappings = distinguishingMappings.length;
        if (numConceptMappings < 1) {
            internalStrength = 0;
        }
        else {
            const avgStrength = distinguishingMappings.reduce((a,b) => a + b.strength(), 0) / numConceptMappings;
            const numConceptMappingsFctr = (numConceptMappings == 1) ? 0.8 : (numConceptMappings == 2) ? 1.2 : 1.6;
            const internalCoherenceFctr = this._isInternallyCoherent() ? 2.5 : 1.0;
            internalStrength = Math.min(100, avgStrength*internalCoherenceFctr*numConceptMappingsFctr);        
        }

        // External strength:
        if ((this.objFromInitial instanceof Namespace.Letter) && this.objFromInitial.spansString()) {
            externalStrength = 100;
        }
        else if ((this.objFromTarget instanceof Namespace.Letter) && this.objFromTarget.spansString()) {
            externalStrength = 100;
        }
        else {
            const wc = this.wksp.structures.filter(s => (s instanceof Namespace.Correspondence) && this._supports(s));
            const total = wc.reduce((a,b) => a + b.totalStrength, 0);
            externalStrength = Math.min(total, 100);
        }

        // Total strength:
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }


    /**
     * Indicates whether the Correspondence has the same assigned initial or
     * target object as the given one, or has any concept mappings that are  
     * incompatible with those of the given one.
     * 
     * @param {Correspondence} other - The Correspondence to compare with.
     */
    isIncompatibleWith(other)
    {
        if (!other) {
            return false;
        }
        if ((this.objFromInitial == other.objFromInitial) || (this.objFromTarget == other.objFromTarget)) {
            return true;
        }

        for (let mapping of this.conceptMappings) {
            for (let otherMapping of other.conceptMappings) {
                if (mapping.isIncompatibleWith(otherMapping)) {
                    return true;
                }
            }
        }
        return false;        
    }


    /**
     * Gets all concept mappings (including accessory concept mappings) that
     * permit slippage.
     * 
     */
    getSlippableMappings() 
    {
        const mappings = this.conceptMappings.filter(m => m.canSlip());
        mappings.push(...this.accessoryConceptMappings.filter(m => m.canSlip()));
        return mappings;
    }


    /**
     * Indicates whether the Correspondence has any concept mappings that
     * support the concept mappings in a given one.
     * 
     * @private
     */
    _supports(other)
    {
        if ( (this == other) || (this.objFromInitial == other.objFromInitial) ||
             (this.objFromTarget == other.objFromTarget) || this.isIncompatibleWith(other) ) {
                return false;
        }

        const thisDcMappings = this.conceptMappings.filter(m => m.isDistinguishing());
        const otherDcMappings = other.conceptMappings.filter(m => m.isDistinguishing());
        for (let mapping of thisDcMappings) {
            for (let otherMapping of otherDcMappings) {
                if (mapping.supports(otherMapping)) {
                    return true;
                }
            }
        }
        return false;
    }


    /**
     * Indicates Whether any pair of distinguishing mappings support 
     * each other.
     * 
     * @private
     */
    _isInternallyCoherent()
    {
        const mappings = this.conceptMappings.filter(m => m.isDistinguishing() && m.isRelevant());
        for (let i=0; i<mappings.length; i++) {
            for (let j=0; j<mappings.length; j++) {
                if (i !== j) {
                    if (mappings[i].supports(mappings[j])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );