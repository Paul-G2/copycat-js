// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
     

/**
 * @classdesc
 * The Slipnet models a set of interrelated concepts,
 * as a network of nodes connected by links.
 */
Namespace.Slipnet = class {

    /**
     * @constructor
     */
     constructor()
    { 
        // Declare data members
        this.nodes = [];
        this.links = [];
        this.letters = [];
        this.numbers = [];

        // Build the network
        this._createNodes();
        this._createLinks();
        this.reset();

        // Freeze almost everything (because the slipnet structure is static; 
        // only the node activations and link strengths change over time).
        this.nodes.forEach( node => node.freezeConstants() ); 
        [this.nodes, this.links, this.letters, this.numbers].forEach( arr => Object.freeze(arr) );
        Object.freeze(this);
    }


    /**
     * Resets all nodes to their initial states.
     * 
     */
    reset() 
    {
        // Reset every node
        this.nodes.forEach( node => node.reset() );

        // The following concepts are considered "very relevant" a priori:
        this.letterCategory.clampHigh();
        this.stringPositionCategory.clampHigh();
    }


    /**
     * Decays, spreads, and updates all the node activations.
     * 
     * @param {RandGen} randGen - A randomness generator.
     * @param {Boolean} unclamp - Whether to unclamp the initially-clamped nodes.
     */
    update(randGen, unclamp)
    {
        // Unclamp the initially-clamped nodes, if requested. 
        if (unclamp) {
            this.letterCategory.unclamp();
            this.stringPositionCategory.unclamp();
        }

        // Note that we change only the buffer values, not the 
        // actual activations, until all nodes have been updated:

        // Decay the node activations
        this.nodes.forEach( node => node.decayActivation() );

        // Spread each node's activation to its linked neighbors
        this.nodes.forEach( node => node.spreadActivation() ); 

        // Update each node from its activation buffer
        this.nodes.forEach( node => node.syncActivation(randGen) );
    }


    /**
     * Creates the Slipnet nodes.
     * 
     * @private
     */
    _createNodes()
    {
        // Letter nodes
        const atoz = 'abcdefghijklmnopqrstuvwxyz';
        for (let i=0; i<atoz.length; i++) {
            this.letters.push( this._addNode(atoz.charAt(i), atoz.charAt(i).toUpperCase(), 10) );
        }

        // Number nodes
        const nums = '12345';
        for (let i=0; i<nums.length; i++) {
            this.numbers.push( this._addNode(nums.charAt(i), 
            nums.charAt(i), 30) );
        }

        // String positions
        this.leftmost = this._addNode('leftmost', 'lmost', 40);
        this.rightmost = this._addNode('rightmost', 'rmost', 40);
        this.middle = this._addNode('middle', 'mid', 40);
        this.single = this._addNode('single', 'single', 40);
        this.whole = this._addNode('whole', 'whole', 40);

        // Alphabetic positions
        this.first = this._addNode('first', 'first', 60);
        this.last = this._addNode('last', 'last', 60);

        // Directions
        this.left = this._addNode('left', 'left', 40);
        this.right = this._addNode('right', 'right', 40);

        // Bond types
        this.predecessor = this._addNode('predecessor', 'pred', 50, 60);
        this.successor = this._addNode('successor', 'succ', 50, 60);
        this.sameness = this._addNode('sameness','same',  80);

        // Group types
        this.predecessorGroup = this._addNode('predecessorGroup', 'predGrp', 50);
        this.successorGroup = this._addNode('successorGroup', 'succGrp', 50);
        this.samenessGroup = this._addNode('samenessGroup', 'sameGrp', 80);

        // Other relations
        this.identity = this._addNode('identity', 'iden', 90);
        this.opposite = this._addNode('opposite', 'opp', 90, 80);

        // Objects
        this.letter = this._addNode('letter', 'letter', 20);
        this.group = this._addNode('group', 'group', 80);

        // Categories
        this.letterCategory = this._addNode('letterCategory', 'letCat', 30);
        this.stringPositionCategory = this._addNode('stringPositionCategory', 'strPosCat', 70);
        this.alphabeticPositionCategory = this._addNode('alphabeticPositionCategory', 'alphPosCat', 80);
        this.directionCategory = this._addNode('directionCategory', 'dirCat', 70);
        this.bondCategory = this._addNode('bondCategory', 'bndCat', 80);
        this.groupCategory = this._addNode('groupCategory', 'grpCat', 80);
        this.length = this._addNode('length', 'len', 60);
        this.objectCategory = this._addNode('objectCategory', 'objCat', 90);
        this.bondFacet = this._addNode('bondFacet', 'bndFac', 90);
    }


    /**
     * Creates the Slipnet links.
     * 
     * @private
     */
    _createLinks()
    {
        // Link letters and numbers to their neighbors
        for (let nodeSet of [this.letters, this.numbers]) {
            let previous = nodeSet[0];
            for (let node of nodeSet.slice(1))
            {
                this._addLink('lateralNonSlip', previous, node, this.successor, 0);
                this._addLink('lateralNonSlip', node, previous, this.predecessor, 0);
                previous = node;
            }            
        }

        // Letter-letterCategory links
        this.letters.forEach( letter => this._addCategoryInstanceLinks(this.letterCategory, letter, 97) );

        this._addLink('category', this.letterCategory, this.samenessGroup, null, 50); 

        // Length-number links
        this.numbers.forEach( number => this._addCategoryInstanceLinks(this.length, number, 100) );

        // Groups
        const groups = [this.predecessorGroup, this.successorGroup, this.samenessGroup];
        groups.forEach( group => {this._addLink('lateralNonSlip', group, this.length, null, 95);} );

        // Opposites
        const opposites = [
            [this.first, this.last],
            [this.leftmost, this.rightmost],
            [this.left, this.right],
            [this.successor, this.predecessor],
            [this.successorGroup, this.predecessorGroup],
        ];
        opposites.forEach( opp => this._addSymmetricLinks('lateralSlip', opp[0], opp[1], this.opposite, 0) );

        // Properties
        this._addLink('property', this.letters[0], this.first, null, 75);
        this._addLink('property', this.letters[this.letters.length-1], this.last, null, 75);

        // Instance <-> category links
        const icPairs = [           
            [this.objectCategory, this.letter],
            [this.objectCategory, this.group],
            [this.stringPositionCategory, this.leftmost],
            [this.stringPositionCategory, this.rightmost],
            [this.stringPositionCategory, this.middle],
            [this.stringPositionCategory, this.single],
            [this.stringPositionCategory, this.whole],
            [this.alphabeticPositionCategory, this.first],
            [this.alphabeticPositionCategory, this.last],
            [this.directionCategory, this.left],
            [this.directionCategory, this.right],
            [this.bondCategory, this.predecessor],
            [this.bondCategory, this.successor],
            [this.bondCategory, this.sameness],
            [this.groupCategory, this.predecessorGroup],
            [this.groupCategory, this.successorGroup],
            [this.groupCategory, this.samenessGroup],
            [this.bondFacet, this.letterCategory],
            [this.bondFacet, this.length],
        ];
        icPairs.forEach( pair => this._addCategoryInstanceLinks(pair[0], pair[1], 100) );

        // Link bonds to their groups
        this._addLink('lateralNonSlip', this.sameness, this.samenessGroup, this.groupCategory, 30);
        this._addLink('lateralNonSlip', this.successor, this.successorGroup, this.groupCategory, 60);
        this._addLink('lateralNonSlip', this.predecessor, this.predecessorGroup, this.groupCategory, 60);

        // Link bond groups to their bonds
        this._addLink('lateralNonSlip', this.samenessGroup, this.sameness, this.bondCategory, 90);
        this._addLink('lateralNonSlip', this.successorGroup, this.successor, this.bondCategory, 90);
        this._addLink('lateralNonSlip', this.predecessorGroup, this.predecessor, this.bondCategory, 90);
        
        // Letter category to length
        this._addSymmetricLinks('lateralSlip', this.letterCategory, this.length, null, 95);

        // Letter to group
        this._addSymmetricLinks('lateralSlip', this.letter, this.group, null, 90);

        // Direction-position, direction-neighbor, position-neighbor
        this._addSymmetricLinks('lateralNonSlip', this.left, this.leftmost, null, 90);
        this._addSymmetricLinks('lateralNonSlip', this.right, this.rightmost, null, 90);
        this._addSymmetricLinks('lateralNonSlip', this.right, this.leftmost, null, 100);
        this._addSymmetricLinks('lateralNonSlip', this.left, this.rightmost, null, 100);
        this._addSymmetricLinks('lateralNonSlip', this.leftmost, this.first, null, 100);
        this._addSymmetricLinks('lateralNonSlip', this.rightmost, this.first, null, 100);
        this._addSymmetricLinks('lateralNonSlip', this.leftmost, this.last, null, 100);
        this._addSymmetricLinks('lateralNonSlip', this.rightmost, this.last, null, 100);

        // Other
        this._addSymmetricLinks('lateralSlip', this.single, this.whole, null, 90);
    }


    /**
     * Adds a node to the Slipnet.
     * 
     * @private
     */
    _addNode(name, shortName, depth, length=0)
    {
        const node = new Namespace.SlipNode(this, name, shortName, depth, length);
        this.nodes.push(node);
        return node;
    }


    /**
     * Adds a link to the Slipnet.
     * 
     * @private
     */
    _addLink(type, source, destination, label, length)
    {
        const link = new Namespace.SlipLink(type, source, destination, label, length);
        this.links.push(link);
    }


    /**
     * Links a pair of nodes bi-directionally.
     * 
     * @private
     */
    _addSymmetricLinks(type, source, destination, label, length) 
    {
        this._addLink(type, source, destination, label, length);
        this._addLink(type, destination, source, label, length);
    }


    /**
     * Creates links between an (instance, category) pair.
     * 
     * @private
     */
    _addCategoryInstanceLinks(category, instance, instanceLength) 
    {
        const categoryLength = category.depth - instance.depth;
        this._addLink('instance', category, instance, null, instanceLength); 
        this._addLink('category', instance, category, null, categoryLength); 
    }

};



})( window.CopycatJS = window.CopycatJS || {} );