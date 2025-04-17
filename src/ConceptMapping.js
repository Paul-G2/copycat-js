// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A ConceptMapping represents a "slippage" between two concepts,
 * for example "letter -> group" or "rightmost -> leftmost".
 * 
 */
 Namespace.ConceptMapping = class {

    /**
     * @constructor
     * 
     * @param {SlipNode} initialDescType - The description type of the first concept. For example, "objectCategory" or "stringPositionCategory".
     * @param {SlipNode} targetDescType - The description type of the slipped concept.
     * @param {SlipNode} initialDescriptor - The descriptor of the first concept. For example, "letter" or "rightmost".
     * @param {SlipNode} targetDescriptor - The descriptor of the slipped concept. For example, "group" or "leftmost".
     * @param {WorkspaceObject} initialObject - The initial object.
     * @param {WorkspaceObject} targetObject - The target object.
     * 
     */
    constructor(initialDescType, targetDescType, initialDescriptor, targetDescriptor, initialObject, targetObject) 
    { 
        this.slipnet = initialDescType.slipnet;
        this.initialDescType = initialDescType;
        this.targetDescType = targetDescType;
        this.initialDescriptor = initialDescriptor;
        this.targetDescriptor = targetDescriptor;
        this.initialObject = initialObject;
        this.targetObject = targetObject;
        this.label = initialDescriptor.getBondCategory(targetDescriptor);
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        const label = this.label ? this.label.name : 'Anonymous';
        
        const s0 = `${label} from ${this.initialDescriptor.synopsis(0)} to ` + `${this.targetDescriptor.synopsis(0)}`;
        const s1 = `<ConceptMapping: ${s0}>`;

        return !type ? s0 : s1;
    }


    /**
     * Returns a value representing the ease with which slippage can occur. 
     * 
     */
    slippability()
    {
        const association = this._degreeOfAssociation();
        if (association >= 100) {
            return 100;
        }

        const depth = (this.initialDescriptor.depth + this.targetDescriptor.depth) / 200;
        return association * (1 - depth * depth);
    }

    
    /** 
     * Returns a value representing the strength of the concept-mapping.
     * (The closer and the more general the nodes, the stronger the 
     * mapping is.)  
     * 
     */
    strength()
    {
        const association = this._degreeOfAssociation();
        if (association >= 100.0) {
            return 100;
        }
        const depth = (this.initialDescriptor.depth + this.targetDescriptor.depth) / 200;
        return association * (1 + depth * depth);
    }


    /**
     * Returns a measure of the degree of association between the two
     * descriptors.
     * 
     * @private
     */
    _degreeOfAssociation()
    {
        // Assumes the 2 descriptors are connected in the slipnet 
        // by at most 1 link.
        if (this.initialDescriptor == this.targetDescriptor) {
            return 100;
        }
        for (let link of this.initialDescriptor.lateralSlipLinks) {
            if (link.destination == this.targetDescriptor) {
                return link.degreeOfAssociation();
            }
        }
        return 0;
    }
    
    
    /**
     * Indicates whether this mapping can actually produce a slippage.
     * 
     */
    canSlip()
    {
        return ((this.label != this.slipnet.identity) && (this.label != this.slipnet.sameness));
    }
    
    
    /**
     * Indicates whether this object's descriptors uniquely identify its objects. 
     * 
     */
    isDistinguishing()
    {
        if ( (this.initialDescriptor == this.slipnet.whole) && (this.targetDescriptor == this.slipnet.whole) ) {
                return false;
        }
        else if (this.initialObject && this.targetObject) {
            return this.initialObject.isDistinguishingDescriptor(this.initialDescriptor) &&
                this.targetObject.isDistinguishingDescriptor(this.targetDescriptor);
        }
        else {
            return false;
        }
    }


    /**
     * Indicates whether this object is contained (by value) in a given 
     * list of mappings.
     * 
     * @param {Array<ConceptMapping>} mappings - The list of mappings to check.
     */
    isContainedIn(mappings)
    {
        return mappings.some(m => 
            (m.initialDescType == this.initialDescType) &&
            (m.targetDescType == this.targetDescType) &&
            (m.initialDescriptor == this.initialDescriptor) &&
            (m.targetDescriptor == this.targetDescriptor)
        );
    }


    /**
     * Indicates whether a given list of mappings contains at least one
     * mapping that is nearly identical to this one.
     * 
     * @param {Array<ConceptMapping>} mappings - The list of mappings to check.
     */
    isNearlyContainedIn(mappings)
    {
        return mappings.some(m =>
            (m.initialDescType == this.initialDescType) &&
            (m.targetDescType == this.targetDescType) &&
            (m.initialDescriptor == this.initialDescriptor)
        );
    }


    /**
     * Returns a ConceptMapping like this one but with the initial and   
     * target descriptions swapped.
     * 
     */
    symmetricVersion()
    {
        if (!this.canSlip()) {
            return this;
        }

        const bond = this.targetDescriptor.getBondCategory(this.initialDescriptor);
        if (bond != this.label) {
            return this;
        }

        return new Namespace.ConceptMapping(
            this.targetDescType, this.initialDescType, this.targetDescriptor, this.initialDescriptor, this.initialObject, this.targetObject);
    }


    /**
     * Indicates whether this mapping's descriptions are fully active. 
     *
     */
    isRelevant()
    {
        return ( this.initialDescType.isFullyActive() && this.targetDescType.isFullyActive() );
    }


    /**
     * Indicates whether either of this mapping's descriptors is 
     * linked to the corresponding descriptor in another mapping.
     *  
     * @param {ConceptMapping} other - The other mapping to compare to.
     */    
    isRelatedTo(other)
    {
        return (this.initialDescriptor.isRelatedTo(other.initialDescriptor) ||
            this.targetDescriptor.isRelatedTo(other.targetDescriptor));
    }
    
    
    /**
     * Indicates whether this mapping is incompatible with another one.
     * 
     * @param {ConceptMapping} other - The mapping to check.
     */
    isIncompatibleWith(other)
    {
        // Concept-mappings (a -> b) and (c -> d) are incompatible if a is
        // related to c or if b is related to d, and the a -> b relationship is
        // different from the c -> d relationship. 
        // E.g., rightmost -> leftmost is incompatible with right -> right.
        if (!this.isRelatedTo(other)) {
            return false;
        }
        if (!this.label || !other.label) {
            return false;
        }
        return (this.label != other.label);
    }


    /**
     * Indicates whether this mapping is compatible with another one.
     * 
     * @param {ConceptMapping} other - The mapping to check.
     */
    supports(other)
    {
        // Concept-mappings (a -> b) and (c -> d) support each other if a is
        // related to c and if b is related to d and the a -> b relationship is
        // the same as the c -> d relationship.  
        // E.g., rightmost -> rightmost supports right -> right and leftmost -> leftmost.
        if ((other.initialDescType == this.initialDescType) && (other.targetDescType == this.targetDescType) ) {
            return true;
        }

        // if the descriptors are not related return false
        if (!this.isRelatedTo(other)) {
            return false;
        }
        if (!this.label || !other.label) {
            return false;
        }
        return (this.label == other.label);
    }


    /**
     * Gets a list of ConceptMappings between two given objects,
     * consistent with the given descriptions
     * 
     * @param {WorkspaceObject} initialObject - The initial object.
     * @param {WorkspaceObject} targetObject - The target object.
     * @param {Array<Description>} initialDescriptions - Descriptions of the initial object.
     * @param {Array<Description>} targetDescriptions - Descriptions of the target object.
     *
     */
    static getMappings(initialObject, targetObject, initialDescriptions, targetDescriptions)
    {
        const mappings = [];
        for (let ini of initialDescriptions) {
            for (let targ of targetDescriptions) {
                if (ini.descriptionType == targ.descriptionType) {
                    if ((ini.descriptor == targ.descriptor) || ini.descriptor.isSlipLinkedTo(targ.descriptor)) {
                        mappings.push( new Namespace.ConceptMapping(
                            ini.descriptionType, targ.descriptionType, ini.descriptor, targ.descriptor, initialObject, targetObject) );
                    }
                }
            }
        }
        return mappings;
    }
};


})( window.CopycatJS = window.CopycatJS || {} );