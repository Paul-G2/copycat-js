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
     * @param {Number} position - The position of the letter within the 
     *   string. (Note: The position is 1-based)
     */
    constructor(str, position) 
    { 
        super(str);
        this.char = str.jstring.charAt(position-1);
        this.position = position;
        this.leftIndex = position;
        this.rightIndex = position;
        this.leftmost = (position == 1);
        this.rightmost = (position == str.length);

        // Create and cache my descriptions
        this._addDescriptions();
    }
    

    /**
     * Creates and caches the descriptions of the Letter.
     * @private
     */
    _addDescriptions()
    {
        const sn = this.ctx.slipnet;
        this.descriptions.push(
            new Namespace.Description(this, sn.objectCategory, sn.letter));

        const us = this.string.jstring.toUpperCase();
        const charCodeA = 'A'.charCodeAt(0);
        this.descriptions.push(
            new Namespace.Description(this, sn.letterCategory, 
                sn.letters[us.charCodeAt(this.position-1) - charCodeA]));

        const length = this.string.length;
        if (length == 1) {
            this.descriptions.push( new Namespace.Description(
                this, sn.stringPositionCategory, sn.single));
        }
        if (this.leftmost) {
            this.descriptions.push( new Namespace.Description(
                this, sn.stringPositionCategory, sn.leftmost));
        }
        if (this.rightmost) {
            this.descriptions.push( new Namespace.Description(
                this, sn.stringPositionCategory, sn.rightmost));
        }
        if (this.position * 2 == length + 1) {
            this.descriptions.push( new Namespace.Description(
                this, sn.stringPositionCategory, sn.middle));
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
     * Indicates whether no other Letter in this Letter's string 
     * has the same descriptor.
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
            if ((obj instanceof Namespace.Letter) && (obj != this)) {
                for (let descr of obj.descriptions) {
                    if (descr.descriptor == descriptor) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );