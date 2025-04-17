// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The Letter class represents a single alphabetic character.
 * It inherits from WorkspaceObject.
 * 
 */
 Namespace.Letter = class extends Namespace.WorkspaceObject {

    /**
     * @constructor
     * 
     * @param {WorkspaceString} str - The string that the letter is in.
     * @param {Number} position - The (1-based) position of the letter within the string.
     */
    constructor(str, position) 
    { 
        super(str);
        this.char       = str.jstring.charAt(position-1);
        this.position   = position;
        this.leftIndex  = position;
        this.rightIndex = position;
        this.leftmost   = (position == 1);
        this.rightmost  = (position == str.length);

        // Create and cache my descriptions
        this._addDescriptions();
    }
    

    /**
     * Creates and caches the descriptions of the Letter.
     * @private
     */
    _addDescriptions()
    {
        const sn = this.wksp.ctx.slipnet;
        this.descriptions.push(new Namespace.Description(this, sn.objectCategory, sn.letter));

        const letterNode = sn.letters[this.string.jstring.toUpperCase().charCodeAt(this.position-1) - 'A'.charCodeAt(0)];
        this.descriptions.push(new Namespace.Description(this, sn.letterCategory, letterNode));

        if (this.string.length == 1) {
            this.descriptions.push( new Namespace.Description(this, sn.stringPositionCategory, sn.single) );
        }
        if (this.leftmost) {
            this.descriptions.push( new Namespace.Description(this, sn.stringPositionCategory, sn.leftmost) );
        }
        if (this.rightmost) {
            this.descriptions.push( new Namespace.Description(this, sn.stringPositionCategory, sn.rightmost) );
        }
        if (2*this.position == this.string.length + 1) {
            this.descriptions.push( new Namespace.Description(this, sn.stringPositionCategory, sn.middle) );
        }
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        return !type ? this.char : '<Letter: ' + this.char + '>';
    }


    /**
     * Indicates whether no other Letter in this Letter's string has a descriptor matching the given one.
     * 
     * @param {SlipNode} descriptor - The descriptor to match.
     */
    isDistinguishingDescriptor(descriptor) 
    {
        let sn = this.wksp.ctx.slipnet;
        if ((descriptor == sn.letter) || (descriptor == sn.group) || sn.numbers.includes(descriptor)) {
            return false;
        }
        
        if (this.string.objects.some(obj => (obj instanceof Namespace.Letter) && (obj != this) && 
            obj.descriptions.some(d => d.descriptor == descriptor))) {
            return false;
        }

        return true;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );