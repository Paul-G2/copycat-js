// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This is the base class for the Letter and Group classes.
 * 
 */
 Namespace.WorkspaceObject = class 
 {
    /**
     * @constructor
     * 
     * @param {WorkspaceString} str - The string that the Letter 
     *   or Group is in.
     */
    constructor(str) 
    { 
        this.ctx = str.ctx;
        this.string = str;
        this.changed = false;
        
        this.descriptions = [];
        this.bonds = [];
        this.group = null;
        this.correspondence = null;
        this.replacement = null;

        this.leftBond = null;
        this.rightBond = null;
        this.rightIndex = 0;
        this.leftIndex = 0;
        this.leftmost = false;
        this.rightmost = false;

        this.rawImportance = 0;
        this.relativeImportance = 0;
        
        this.intraStringSalience = 0;
        this.interStringSalience = 0;
        this.totalSalience = 0;

        this.intraStringUnhappiness = 0;
        this.interStringUnhappiness = 0;
        this.totalUnhappiness = 0;
    }


    /**
     * Adds a set of descriptions to the object and to the workspace
     * 
     * @param {Array<Description>} descriptions - The descriptions to add.
     */
    addDescriptions(descriptions) 
    {
        // Take a copy, in case we are adding to our own descriptions
        const descriptionsToAdd = [...descriptions]; 

        for (let toAdd of descriptionsToAdd) 
        {
            const alreadyHaveIt = this.descriptions.some(d => d.sameAs(toAdd));

            if (!alreadyHaveIt) {
                const newDescr = new Namespace.Description(
                    this, toAdd.descriptionType, toAdd.descriptor);
                newDescr.build();
            }
        }
    }
    
    
    /**
     * Calculates a happiness value for the object.
     * 
     * @private
     */
    _calculateIntraStringHappiness() 
    {
        if (this.spansString()) {
            return 100;
        }
        if (this.group) {
            return this.group.totalStrength;
        }
        const bondStrength = this.bonds.reduce((a,b) => a + b.totalStrength, 0);          
        return bondStrength / 6.0;
    }


    /**
     * Calculates a raw importance value for the object, 
     * which is the sum of all relevant description activations.
     * 
     * @private
     */
     _calculateRawImportance() 
     {
        let result = 0;
        for (let description of this.descriptions) {
            if (description.descriptionType.isFullyActive()) {
                result += description.descriptor.activation;
            }
            else {
                result += description.descriptor.activation / 20;
            }
        }
        if (this.group) {
            result *= 2/3;
        }
        if (this.changed) {
            result *= 2;
        }
        return result;
    }


    /**
     * Updates the object's importance, happiness, and salience values. 
     * 
     */
    updateValues()
    {
        this.rawImportance = this._calculateRawImportance();
        const intraStringHappiness = this._calculateIntraStringHappiness();
        this.intraStringUnhappiness = 100 - intraStringHappiness;

        let interStringHappiness = 
            this.correspondence ? this.correspondence.totalStrength : 0;
        this.interStringUnhappiness = 100 - interStringHappiness;

        const averageHappiness = 
            (intraStringHappiness + interStringHappiness) / 2;
        this.totalUnhappiness = 100 - averageHappiness;

        this.intraStringSalience = 
            0.2*this.relativeImportance + 0.8*this.intraStringUnhappiness;
        this.interStringSalience = 
            0.8*this.relativeImportance + 0.2*this.interStringUnhappiness;
        this.totalSalience = 
            (this.intraStringSalience + this.interStringSalience) / 2;
    }


    /**
     * Returns The number of letters in this object.
     * 
     */
    letterSpan() 
    {
        return this.rightIndex - this.leftIndex + 1;
    }
    
    
    /**
     * Indicates whether this Letter or Group constitutes the entire string.
     * 
     */
    spansString()
    {
        return this.leftmost && this.rightmost;
    }


    /**
     * Indicates whether the object is contained within another object.
     * 
     * @param {WorkspaceObject} other - The object to test against. 
     */
    isWithin(other) 
    {
        return (this.leftIndex >= other.leftIndex &&
                this.rightIndex <= other.rightIndex);
    }


    /**
     * Indicates whether the object is strictly outside another object.
     * 
     * @param {WorkspaceObject} other - The object to test against. 
     */
    isOutsideOf(other) 
    {
        return (this.leftIndex > other.rightIndex ||
                this.rightIndex < other.leftIndex);
    }


    /**
     * Indicates whether this object is beside another object.
     * 
     */
    isBeside(other) 
    {
        if (this.string != other.string) {
            return false;
        }
        return (this.leftIndex == other.rightIndex + 1) ||
            (other.leftIndex == this.rightIndex + 1);
    }
    
    
    /**
     * Gets the fully-active descriptions of the object.
     * 
     */
    relevantDescriptions() 
    {
        return this.descriptions.filter( 
            x => x.descriptionType.isFullyActive() ) ;
    }


    /**
     * Gets the fully-active distinguishing descriptors of the object.
     * 
     */
    relevantDistinguishingDescriptors( ) 
    {
        return this.relevantDescriptions().filter( 
            x => this.isDistinguishingDescriptor(x.descriptor) ).
                map( x => x.descriptor );
    }
    
    
    /**
     * Indicates whether this object is described by a given descriptor.
     * 
     * @param {SlipNode} sought - The descriptor to test against.
     */
    hasDescriptor(sought) 
    {
        return this.descriptions.some(x => x.descriptor == sought);
    }
    
    
    /**
     * Gets the descriptor of this object that matches a given 
     * description type.
     * 
     * @param {SlipNode} descriptionType - The description type to match. 
     */
    getDescriptor(descriptionType) 
    {
        const match = this.descriptions.find(
            d => d.descriptionType == descriptionType);

        return match ? match.descriptor : null;
    }


    /**
     * Gets the description type of this object that matches a 
     * given descriptor.
     * 
     * @param {SlipNode} descriptor - The descriptor to match. 
     */
    getDescriptionType(descriptor) 
    {
        const match = this.descriptions.find(
            d => d.descriptor == descriptor);

        return match ? match.descriptionType : null;
    }    


    /**
     * Indicates whether this object is the middle object in its string.
     * 
     */
    isMiddleObject( )
    {
        // (Only works for strings that are 3 chars long)
        let objectOnMyRightIsRightmost = false;
        let objectOnMyLeftIsLeftmost = false;
        for (let obj of this.string.objects) {
            if (obj.leftmost && (obj.rightIndex == this.leftIndex - 1)) {
                objectOnMyLeftIsLeftmost = true;
            }
            if (obj.rightmost && (obj.leftIndex == this.rightIndex + 1)) {
                objectOnMyRightIsRightmost = true;
            }
        }
        return objectOnMyRightIsRightmost && objectOnMyLeftIsLeftmost;
    }


    /**
     * Gets the groups that are common between this object and another one.
     * 
     * @param {WorkspaceObject} other - The object to test against.
     */
    getCommonGroups(other) 
    {
        return this.string.objects.filter( obj => 
            this.isWithin(obj) && other.isWithin(obj) );
    }


    /**
     * Returns the distance, in nmber of letters, between this object 
     * and another.
     * 
     * @param {WorkspaceObject} other - The object to test against. 
     */
    letterDistance(other) 
    {
        if (this.string != other.string) {
            throw new Error("Cannot compare objects from different strings, " + 
                "in WorkspaceObject.letterDistance");
        }

        if (other.leftIndex > this.rightIndex) {
            return other.leftIndex - this.rightIndex;
        }
        if (this.leftIndex > other.rightIndex) {
            return this.leftIndex - other.rightIndex;
        }
        return 0;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );