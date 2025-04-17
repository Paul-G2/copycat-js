// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The SlipLink class represents a relation between two concepts. 
 * 
 */
 Namespace.SlipLink = class {

    /**
     * @constructor
     * 
     * @param {String} type - The link type ('category', 'property', 'instance', 'lateralSlip', or 'lateralNonSlip').
     * @param {SlipNode} source - The source node.
     * @param {SlipNode} destination - The destination node.
     * @param {SlipNode} [label=null] - A SlipNode that labels the link.
     * @param {Number} [length=0] - The "conceptual distance" between the source and destination nodes. Slippage 
     *   occurs more easily when this distance is smaller.
     */
    constructor(type, source, destination, label=null, length=0) 
    { 
        this.type = type;
        this.source = source;
        this.destination = destination;
        this.label = label;
        this.fixedLength = length;

        // Add this link to the source and destination nodes.
        source.outgoingLinks.push(this);
        destination.incomingLinks.push(this);            

        Object.freeze(this);
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        const s = `${this.source.synopsis(1)} to ` + 
          `${this.destination.synopsis(1)} (length=` + 
          `${this.fixedLength.toFixed(0)}` + 
          (this.label ? `, label=${this.label.name}` : '') + ')';

        return !type ? s : '<SlipLink: ' + s + '>';
    }
    
    
    /**
     * Returns a measure of the shortness of this link, or
     *  of its label if it has one.
     * 
     */
    degreeOfAssociation()
    {
        if ((this.fixedLength > 0) || !this.label) {
            return 100 - this.fixedLength;
        } 
        else { 
            return this.label.degreeOfAssociation();
        }
    }


    /**
     * Returns a measure of the shortness of this link, or
     *  of its label's intrinsic shortness if it has a label.
     * 
     */
    intrinsicDegreeOfAssociation()
    {
        if (this.fixedLength !== 0) {
            return 100 - this.fixedLength;
        }
        else if (this.label) {
            return 100 - this.label.intrinsicLinkLength;
        }
        else {
            return 0;
        }
    }


};

})( window.CopycatJS = window.CopycatJS || {} );