// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A Bond is a relation between Letters and/or Groups in the same string. 
 * For example, a letter-successorship relation between 'a' and 'b' in the string 'abc'.
 */
 Namespace.Bond = class {

    /**
     * @constructor
     * 
     * @param {WorkspaceObject} from - The source object of the bond.
     * @param {WorkspaceObject} to - The destination object of the bond.
     * @param {SlipNode} category - The bond category (successor, predecessor, or sameness).
     * @param {SlipNode} facet - The facet of the bond category (letterCategory or length).
     * @param {SlipNode} fromDescriptor - The facet's value for the source object, e.g. 'a'.
     * @param {SlipNode} toDescriptor - The facet's value for the destination object, e.g. 'b'.
     */
    constructor(from, to, category, facet, fromDescriptor, toDescriptor) 
    { 
        // WorkspaceStructure members
        this.wksp = from.wksp;
        this.string = from.string;
        this.totalStrength = 0;

        this.source = from;
        this.destination = to;
        this.category = category;
        this.facet = facet;
        this.sourceDescriptor = fromDescriptor;
        this.destDescriptor = toDescriptor;

        this.leftObject = this.source;
        this.rightObject = this.destination;
        this.directionCategory = this.wksp.ctx.slipnet.right;
        if (this.source.leftIndex > this.destination.rightIndex) {
            this.leftObject = this.destination;
            this.rightObject = this.source;
            this.directionCategory = this.wksp.ctx.slipnet.left;
        }
        if (fromDescriptor == toDescriptor){
            this.directionCategory = null;
        }
    }


    /**
     * Returns a string describing the object.
     */
    synopsis(type)
    {
        const s = this.source.synopsis(1) + ' to ' + 
        this.destination.synopsis(1) + ` (${this.category.name}, ` +
        `${this.facet.name}, ` + `${this.sourceDescriptor.name}, ` + 
        `${this.destDescriptor.name})`;

        return !type ? s : '<Bond: ' + s + '>';
    }

    
    /**
     * Adds the Bond to the workspace, the parent string, and the
     * source and destination objects. Activates its category and 
     * directionCategory concepts.
     * 
     */
    build()
    {
        this.wksp.structures.push(this);
        this.string.bonds.push(this);
        this.leftObject.bonds.push(this);
        this.rightObject.bonds.push(this);  
        this.leftObject.rightBond = this;
        this.rightObject.leftBond = this;

        this.category.activation = 100;
        if (this.directionCategory) {
            this.directionCategory.activation = 100;
        }
    }  


    /**
     * Removes the Bond from the workspace, the parent string, and the
     * source and destination objects.
     * 
     */
    break()
    {
        this.wksp.structures = this.wksp.structures.filter(s => s !== this);
        this.string.bonds = this.string.bonds.filter(s => s !== this);
        this.leftObject.bonds = this.leftObject.bonds.filter(s => s !== this);
        this.rightObject.bonds = this.rightObject.bonds.filter(s => s !== this);
        this.leftObject.rightBond = null;
        this.rightObject.leftBond = null;
    }


    /**
     * Creates a Bond like this one, except that the source and 
     * destination are swapped.
     */
    flippedVersion()
    {
        return new Namespace.Bond(
            this.destination, this.source,
            this.category.getRelatedNode(this.wksp.ctx.slipnet.opposite),
            this.facet, this.destDescriptor, this.sourceDescriptor
        );
    }
    
    
    /**
     * Updates the total strength value.
     * 
     */
    updateStrength()
    {
        // Calculate the internal strength.
        // (Bonds between objects of same type (ie. letter or group) are stronger than 
        // bonds between different types, and letter bonds are stronger than length bonds.)
        const compat = (this.source instanceof Namespace.Letter) == (this.destination instanceof Namespace.Letter) ? 1.0 : 0.7;
        const facetFactor = (this.facet == this.wksp.ctx.slipnet.letterCategory) ? 1.0 : 0.7;
        let internalStrength = Math.min(100, compat * facetFactor * this.category.bondDegreeOfAssociation() );

        // External strength:
        let externalStrength = 0;
        const supports = this.string.bonds.map(b => (b.string == this.source.string) &&
            (this.leftObject.letterDistance(b.leftObject) !== 0) &&
            (this.rightObject.letterDistance(b.rightObject) !== 0) &&
            (this.category == b.category) &&
            (this.directionCategory == b.directionCategory) ? 1 : 0);

        const nsupporters = supports.reduce((a, b) => a + b, 0);
        if (nsupporters > 0) {
            const density = 100 * Math.sqrt(this._localDensity());
            let supportFactor = Math.pow(0.6, (1/Math.pow(nsupporters,3)));
            supportFactor = Math.max(1.0, supportFactor);
            externalStrength = supportFactor * density;
        }

        // Total strength:
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }


    /**
     * Returns a measure of the density in the workspace strings of
     * bonds with the same bond-category and same direction-category 
     * as this bond.
     * 
     * @private
     */
    _localDensity()
    {
        let slotSum = 0;
        let supportSum = 0;
        
        for (let obj1 of this.wksp.objects.filter(o => o.string == this.string)) {
            for (let obj2 of this.wksp.objects.filter(o2 => obj1.isBeside(o2)) ) {
                slotSum += 1;
                for (const b of this.string.bonds.filter(b => b != this)) {
                    const sameCats = (b.category == this.category) && (b.directionCategory == this.directionCategory); 
                    const sameEnds = ((this.source == obj1) && (this.destination == obj2)) || ((this.source == obj2) && (this.destination == obj1));
                    if (sameCats && sameEnds) { supportSum += 1; }
                }
            }
        }
        return slotSum === 0 ? 0 : supportSum/slotSum;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );