// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This class encapsulates a description of a Letter or Group.
 * 
 * A description consists of a (descriptionType, descriptor) pair. Some 
 * examples are: 
 * <ul style="list-style: none;">
 *   <li> (objectCategory, letter) </li>
 *   <li> (letterCategory, a) </li>
 *   <li> (stringPositionCategory, leftmost) </li>
 *   <li> (groupCategory, samenessGroup) </li>
 * </ul>
 * 
 */
 Namespace.Description = class {

    /**
     * @constructor
     * 
     * @param {WorkspaceObject} obj - The object being described.
     * @param {SlipNode} descriptionType - The aspect being described, 
     * e.g., objectCategory.
     * @param {SlipNode} descriptor - The value of the aspect, e.g., letter.
     */
    constructor(obj, descriptionType, descriptor) 
    { 
        // WorkspaceStructure members
        this.ctx = obj.ctx;
        this.string = obj.string;
        this.totalStrength = 0;

        // Description members
        this.object = obj;
        this.descriptionType = descriptionType;
        this.descriptor = descriptor;
    }


    /**
     * Returns a string describing the object.
     */
    synopsis(type)
    {
        const wksp = this.ctx.workspace;
        let s = this.object.synopsis(1);

        if (this.object.string == wksp.initialWString) {
            s += ' in initial string';
        }
        else if (this.object.string == wksp.modifiedWString) {
            s += ' in modified string';
        }
        else if (this.object.string == wksp.targetWString) {
            s += ' in target string';
        }
        else  {
            s += ' in unknown string';
        }
        s += ', ' + this.descriptionType.name + ' == ' + this.descriptor.name;

        return !type ? s : '<Description: For ' + s + '>';
    }

    
    /**
     * Indicates whether this Description has the same descriptionType and
     * descriptor as another one.
     * 
     * @param {Description} other - The Description to compare with. 
     */
    sameAs(other) 
    {
        return ((other.descriptionType == this.descriptionType) && 
            (other.descriptor == this.descriptor));
    }


    /**
     * Sets the activation of the descriptionType and descriptor to 100.
     * 
     */
    activate()
    {
        this.descriptionType.activation = 100;
        this.descriptor.activation = 100;
    }


    /**
     * Updates the total strength value.
     * 
     */
    updateStrength() 
    {
        // Internal strength
         let internalStrength = this.descriptor.depth;

        // Local support: Count the number of other objects in this 
        // object's string that are described like this one.
        let numDescribedLikeThis = 0;
        for (let other of this.string.objects.filter(o => o != this.object)) {
            if ( !this.object.isWithin(other) && !other.isWithin(this.object) ) {
                for (let od of other.descriptions) {
                    if (od.descriptionType == this.descriptionType) {
                        numDescribedLikeThis += 1;
                    }
                }
            }
        }
        const supportVals = [0, 20, 60, 90, 100]; 
        const localSupport = supportVals[Math.min(numDescribedLikeThis,4)];

        // External strength
        let externalStrength = (localSupport + this.descriptionType.activation)/2;

        // Total strength
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }
 

    /**
     * Activates the description and adds it to its owner's description list
     * and to the workspace.
     */
    build()
    {
        this.activate();
        if (!this.object.hasDescriptor(this.descriptor)) {
            this.object.descriptions.push(this);
        }

        const wksp = this.ctx.workspace;
        if (!wksp.structures.includes(this)) {
            wksp.structures.push(this);   
        }
    }


    /**
     * Removes the Description from its owner's description list, and 
     * from the workspace structures list.
     */
    break()
    {
        this.ctx.workspace.structures = 
            this.ctx.workspace.structures.filter(s => s !== this);
        
        this.object.descriptions = 
            this.object.descriptions.filter(s => s !== this);
    }
       
 };


})( window.CopycatJS = window.CopycatJS || {} );