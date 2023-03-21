// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A Group is a sequence of Letters or Groups in a WorkspaceString.
 * 
 */
 Namespace.Group = class extends Namespace.WorkspaceObject {

    /**
     * @constructor
     * 
     * @param {WorkspaceString} str - The string containing the 
     *     grouped objects.
     * @param {SlipNode} groupCategory - The group category (successor or 
     *     predecessor or sameness).
     * @param {SlipNode} dirCategory - The direction category (left or 
     *      right or null).
     * @param {SlipNode} facet - The description type of the 
     *      bonds in the Group. 
     * @param {Array<WorkspaceObject>} objectList - The objects in the Group. 
     * @param {Array<Bond>} bondList - The bonds in the Group.
     * 
     */
    constructor(str, groupCategory, dirCategory, facet, objectList, bondList) 
    { 
        super(str);

        // WorkspaceStructure member
        this.totalStrength = 0;

        this.groupCategory = groupCategory;
        this.directionCategory = dirCategory;
        this.facet = facet;
        this.objectList = objectList;
        this.bondList = bondList;
        this.bondCategory = this.groupCategory.getRelatedNode(
            this.ctx.slipnet.bondCategory);

        const leftObject = objectList[0];
        const rightObject = objectList[objectList.length-1];
        this.leftIndex = leftObject.leftIndex;
        this.leftmost = (this.leftIndex == 1);
        this.rightIndex = rightObject.rightIndex;
        this.rightmost = (this.rightIndex == this.string.length);

        this.descriptions = [];
        this.bondDescriptions = [];

        // Create and cache my descriptions
        this._addDescriptions();
    }


    /**
     * Creates and caches the descriptions of the Group.
     * @private
     */
    _addDescriptions()
    {
        const addDescription = function(group, descriptionType, descriptor) {
            group.descriptions.push( 
                new Namespace.Description(group, descriptionType, descriptor)
            );
        };

        const sn = this.ctx.slipnet;
        if (this.bondList && this.bondList.length) {
            this.bondDescriptions.push( 
                new Namespace.Description(
                    this, sn.bondFacet, this.bondList[0].facet));
        }
        this.bondDescriptions.push(
            new Namespace.Description(this, sn.bondCategory, this.bondCategory));

        addDescription(this, sn.objectCategory, sn.group);
        addDescription(this, sn.groupCategory, this.groupCategory);

        if (!this.directionCategory) { // Occurs when groupCategory == samenessGroup 
            const letter = this.objectList[0].getDescriptor(this.facet);
            addDescription(this, this.facet, letter);
        }
        if (this.directionCategory) {
            addDescription(this, sn.directionCategory, this.directionCategory);
        }
        if (this.spansString()) {
            addDescription(this, sn.stringPositionCategory, sn.whole);
        }
        else if (this.leftmost) {
            addDescription(this, sn.stringPositionCategory, sn.leftmost);
        }
        else if (this.rightmost) {
            addDescription(this, sn.stringPositionCategory, sn.rightmost);
        }
        else if (this.isMiddleObject()) {
            addDescription(this, sn.stringPositionCategory, sn.middle);
        }
        
        // Maybe add a length description
        const nobjs = this.objectList.length;
        if (nobjs < 6) {
            const exp = Math.pow(nobjs,3) * 
                (100 - this.ctx.slipnet.length.activation) / 100;
            const val = this.ctx.temperature.getAdjustedProb( Math.pow(0.5, exp) );
            const prob = (val < 0.06) ? 0 : val;
            if (this.ctx.randGen.coinFlip(prob)) {
                addDescription(this, sn.length, sn.numbers[nobjs - 1]);
            }
        }
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        const l = this.leftIndex - 1;
        const r = this.rightIndex;
        const js = this.string.jstring.substring(l, r); 
        const s = 'group[' + l.toString() +',' + (r-1).toString() + '] == ' + js;

        return !type ? s : '<Group: ' + s + '>';
    }


    /**
     * Adds this Group to its parent string and to the workspace, 
     * and activates all its descriptions.
     * 
     */
    build()
    {
        const wksp = this.ctx.workspace;
        wksp.objects.push(this);
        wksp.structures.push(this);
        this.string.objects.push(this);
        this.objectList.forEach( obj => obj.group = this );
        this.descriptions.forEach( descr => descr.build() );
    }


    /**
     * Disconnects the Group from its parent string and from the workspace,
     * and breaks all its bonds and descriptions.
     * 
     */
    break()
    {
        if (this.correspondence) {
            this.correspondence.break();
        }
        if (this.group) {
            this.group.break();
        }
        if (this.leftBond) {
            this.leftBond.break();
        }
        if (this.rightBond) {
            this.rightBond.break();
        }

        this.descriptions.slice().forEach( descr => descr.break() );
        this.objectList.forEach( obj => obj.group = null );

        const wksp = this.ctx.workspace;
        wksp.structures = wksp.structures.filter(s => s !== this);
        wksp.objects = wksp.objects.filter(s => s !== this);
        this.string.objects = this.string.objects.filter(s => s !== this);
    }


    /**
     * Indicates whether this Group is the same (by value) as another one.
     * 
     * @param {Group} other - The Group to compare with. 
     */
    sameAs(other) 
    {
        if (this.leftIndex != other.leftIndex) {
            return false;
        }
        if (this.rightIndex != other.rightIndex) {
            return false;
        }
        if (this.groupCategory != other.groupCategory) {
            return false;
        }
        if (this.directionCategory != other.directionCategory) {
            return false;
        }
        if (this.facet != other.facet) {
            return false;
        }
        return true;
    }
    

    /**
     * Creates a Group like this one except that its direction,
     * and all its bond directions, are flipped
     * 
     */
    flippedVersion()
    {
        const sn = this.ctx.slipnet;
        const flippedBonds = this.bondList.map( b => b.flippedVersion() );
        const flippedGroupCat = this.groupCategory.getRelatedNode(sn.opposite);
        const flippedDirectionCat = 
            this.directionCategory.getRelatedNode(sn.opposite);
        return new Namespace.Group(this.string, flippedGroupCat, 
            flippedDirectionCat, this.facet, this.objectList, flippedBonds);
    }

    
    /**
     * Indicates whether the given descriptor uniquely identifies this Group
     * among all Groups in the parent string.
     * 
     * @param {SlipNode} descriptor - The descriptor to check.
     */
    isDistinguishingDescriptor(descriptor) 
    {
        let sn = this.ctx.slipnet;
        if ((descriptor == sn.letter) || (descriptor == sn.group) || 
            sn.numbers.includes(descriptor)) {
                return false;
        }

        for (let obj of this.string.objects) {
            if ((obj instanceof Namespace.Group) && (obj != this)) {
                for (let descr of obj.descriptions) {
                    if (descr.descriptor == descriptor) {
                        return false;
                    }
                }
            }
        }
        return true;
    }


    /**
     * Updates the total strength value.
     * 
     */
    updateStrength()
    {
        // Internal strength
        const sn = this.ctx.slipnet;
        const relatedBondAssociation = this.groupCategory.getRelatedNode(
            sn.bondCategory).degreeOfAssociation();

        const bondWeight = Math.pow(relatedBondAssociation, 0.98);
        const nobjs = this.objectList.length;
        const lengthFactor = (nobjs == 1) ? 5 : (nobjs == 2) ? 
            20 : (nobjs == 3) ? 60 : 90;

        const lengthWeight = 100 - bondWeight;
        let internalStrength = (relatedBondAssociation*bondWeight + 
            lengthFactor*lengthWeight)/100;

        // External strength
        let externalStrength = this.spansString() ? 100 : this._localSupport();

        // Total strength
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }


    /**
     * Returns a measure of how much this group is supported 
     * by other similar Groups in the parent string.
     * 
     * @private
     */
    _localSupport()
    {
        const numSupporters = this._numberOfLocalSupportingGroups();
        if (numSupporters === 0) { return 0; }

        const supportFactor = Math.min(1, 
            Math.pow(0.6, 1/Math.pow(numSupporters,3)) );
        const localDensity = numSupporters/(0.5*this.string.length);
        const densityFactor = 100 * Math.sqrt(localDensity);
        return densityFactor * supportFactor;
    }


    /**
     * Gets the number of groups in the parent string that are outside
     * this group but have the same category and direction as this group.
     *
     * @private 
     */
    _numberOfLocalSupportingGroups()
    {
        let numSupporters = 0;
        for (let obj of this.string.objects) {
            if ((obj instanceof Namespace.Group) && this.isOutsideOf(obj)) {
                if (obj.groupCategory == this.groupCategory && 
                    obj.directionCategory == this.directionCategory) {
                        numSupporters += 1;
                }
            }
        }
        return numSupporters;
    }

};



})( window.CopycatJS = window.CopycatJS || {} );