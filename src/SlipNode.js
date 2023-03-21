// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A SlipNode represents a "platonic concept" in Copycat.
 * 
 * 
 */
Namespace.SlipNode = class {
    
    /**
     * @constructor
     * 
     * @param {Slipnet} slipnet - The network that this node belongs to.
     * @param {String} name - A name for the node.
     * @param {String} shortName - An abbreviated name for the node.
     * @param {Number} depth - The "conceptual depth" of the concept represented
     *     by this node. It controls the decay rate of the node's activation. 
     * @param {Number} intrinsicLinkLength - The intrinsic length of any links 
     *    labeled by this node.
     */
    constructor(slipnet, name, shortName, depth, intrinsicLinkLength=0) 
    { 
        this.slipnet = slipnet;
        this.name = name;
        this.shortName = shortName;
        this.depth = depth;      
        this.intrinsicLinkLength = intrinsicLinkLength;    
        
        this.shrunkLinkLength = intrinsicLinkLength * 0.4;
        this.incomingLinks = [];
        this.outgoingLinks = [];
        this.codelets = [];

        // Once the Slipnet is constructed, only the following are mutable:
        this._mutables = {
            activation: 0,
            activationBuffer: 0,
            clampedHigh: false
        };

        Object.freeze(this);
    }


    /**
     * Freezes the class members that are meant to be immutable
     *
     */
    freezeConstants()
    {
        [this.incomingLinks, this.outgoingLinks, this.codelets].forEach(
            x => Object.freeze(x) );
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        return !type ? this.name : '<SlipNode: ' + this.name +'>';
    }


    /**
     * Resets the node's activation to zero, and unclamps it.
     */
    reset()
    {
        this._mutables.activation = 0;
        this._mutables.activationBuffer = 0;
        this._mutables.clampedHigh = false;
    }


    /**
     * Returns the node's outgoing category links.
     */
    get categoryLinks() 
    { 
        return this.outgoingLinks.filter(
            link => link.type == 'category'); 
    }


    /**
     * Returns the node's outgoing instance links.
     */
    get instanceLinks() 
    { 
        return this.outgoingLinks.filter(
            link => link.type == 'instance'); 
    }


    /**
     * Returns the node's outgoing property links.
     */
    get propertyLinks() 
    { 
        return this.outgoingLinks.filter(
            link => link.type == 'property'); 
    }


    /**
     * Returns the node's outgoing lateral slip links.
     */
    get lateralSlipLinks() 
    { 
        return this.outgoingLinks.filter(
            link => link.type == 'lateralSlip'); 
    }


    /** 
     * Returns the node's outgoing lateral non-slip links.
     */
    get lateralNonSlipLinks() 
    { 
        return this.outgoingLinks.filter(
            link => link.type == 'lateralNonSlip'); 
    }


    /**
     * Returns the node's current activation value.
     */
    get activation() 
    { 
        return this._mutables.activation; 
    }


    /**
     * Sets the node's activation <i>buffer</i> value. 
     * (The actual activation value is updated from the buffer 
     * when syncActivation() is called.)
     */
    set activation(value) 
    { 
        this._mutables.activationBuffer = value; 
    } 
    

    /**
     * Indicates whether this node is fully active.
     * 
     */
    isFullyActive()
    {
        return this._mutables.activation > (100 - 1e-5);
    }


    /**
     * Sets the node's activation to 100, and clamps it there.
     * 
     */
    clampHigh()
    {
        this._mutables.activation = 100;
        this._mutables.clampedHigh = true;
    }
    
    
    /**
     * Unclamps the node's activation (so that its value can change).
     * 
     */
    unclamp()
    {
        this._mutables.clampedHigh = false;
    }

    
    /**
     * Indicates whether this node's activation is locked at 100.
     * 
     */
    isClampedHigh() 
    { 
        return this._mutables.clampedHigh; 
    }


    /**
     * Decays the node's activation, based on its conceptual depth.
     * 
     */
    decayActivation()
    {
        this._mutables.activationBuffer -= 
            this._mutables.activation * (1 - this.depth/100);
    }

    
    /**
     * If this node is fully active, increases the activation of 
     * it's downstream nodes. Otherwise, does nothing.
     * 
     */
    spreadActivation()
    {
        if (this.isFullyActive()) {
            this.outgoingLinks.forEach(link => 
                link.destination._mutables.activationBuffer += 
                    link.intrinsicDegreeOfAssociation() );
        }
    }


    /**
     * Updates the node's actual activation with its buffered value,
     * then proabilistically decides whether to jump to full activation.
     *  
     */
    syncActivation(randGen)
    {
        if (!this.isClampedHigh()) 
        {
            // Add the buffer value to the current activation, and 
            // clamp to [0,100] range.
            this._mutables.activation = Math.min(100, Math.max(0, 
                this._mutables.activation + this._mutables.activationBuffer));

            // Maybe jump to full activation.
            if ((this._mutables.activation > 55) && 
                (this._mutables.activation != 100)) {
                    const jumpProb = Math.pow(this._mutables.activation/100, 3);
                    if ( randGen.coinFlip(jumpProb) ) {
                        this._mutables.activation = 100;
                    }
            }
        }
        else {
            this._mutables.activation = 100;
        }

        // Clear the buffer.
        this._mutables.activationBuffer = 0;
    }
    
    
    /**
     * Returns the category that this node belongs to, if any. 
     * For example, "leftmost" belongs to the string-position category.  
     * (In the current Slipnet, each node belongs to at most one category.)
     */
    category()
    {
        return (this.categoryLinks.length > 0) ? 
            this.categoryLinks[0].destination : null;
    }


    /**
     * Returns a measure of the shortness of links that are 
     * labeled by this node.
     * 
     */
    degreeOfAssociation()
    {
        const linkLength = this.isFullyActive() ? 
            this.shrunkLinkLength : this.intrinsicLinkLength;
        return 100 - linkLength;
    }

    
    /**
     * Returns the degree of association that bonds of this  
     * node's category are considered to have.
     * 
     */
    bondDegreeOfAssociation()
    {
        const result = Math.min(100, 
                11.0 * Math.sqrt(this.degreeOfAssociation()) );
        
        return result;
    }

    
    /**
     * Indicates whether a given node is among this node's outgoing links.
     * 
     * @param {SlipNode} other - The node to test. 
     */
    isLinkedTo(other)
    {
        return this.outgoingLinks.some(link => link.destination == other);
    }


    /**
     * Indicates whether a given node is among this node's lateral slip links.
     * 
     * @param {SlipNode} other - The node to test. 
     */
    isSlipLinkedTo(other)
    {
        return this.lateralSlipLinks.some(link => link.destination == other);
    }


    /**
     * Indicates whether a given node is downstream-linked to this one
     * (or is the same as this one). 
     * 
     * @param {SlipNode} other - The node to test. 
     */
    isRelatedTo(other)
    {
        return (this == other) || 
            this.outgoingLinks.some(link => link.destination == other);
    }


    /**
     * Returns the node that is linked to this one
     * via a link that is labeled by the given relation. 
     * If no such node is found, returns null.
     * 
     * @param {SlipNode} relation - The relation to match. 
     */
    getRelatedNode(relation)
    {
        if (relation == this.slipnet.identity) {
            return this;
        }

        for (let link of this.outgoingLinks) {
            if (link.label && (link.label == relation)) {
                return link.destination;
            }
        }

        return null;
    }


    /**
     * Returns the label of the downstream link between this node and 
     * a given one, or null if there is no such link.
     * 
     * @param {SlipNode} destinationNode - The node to match.
     */
    getBondCategory(destinationNode)
    {
        if (destinationNode == this) {
            return this.slipnet.identity;
        }
        else {
            for (let link of this.outgoingLinks) {
                if (link.destination == destinationNode) {
                    return link.label;
                }
            }
        }
        return null;
    }


    /**
     * Iterates through a given set of ConceptMappings, applies the first one
     * that pertains to to this node, and returns the resulting slipped node. 
     * If no mapping pertains, then this node is returned.
     * 
     * @param {Array<ConceptMappings>} slippages - The ConceptMappings to try. 
     */
    applySlippages(slippages)
    {
        for (let s of slippages) {
            if (this == s.initialDescriptor) {
                return s.targetDescriptor;
            }
        }
        return this;
    }

};

})( window.CopycatJS = window.CopycatJS || {} );