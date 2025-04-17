// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This class encapsulates an ordered sequence of Letters.
 * 
 */
 Namespace.WorkspaceString = class 
 {
    /**
     * @constructor
     * 
     * @param {Workspace} wksp - The Workspace instance that will own the string.
     * @param {String} jstring - A javascript string to be wrapped.
     */
    constructor(wksp, jstring) 
    { 
        this.wksp    = wksp;
        this.jstring = jstring || "";
        this.letters = [];
        this.objects = []; // Letters and Groups
        this.bonds   = [];
        this.intraStringUnhappiness = 0;

        // Create a Letter object for each character in the string
        for (let i=0; i<jstring.length; i++) 
        {
            // Note that the letter position is 1-based:
            const letter = new Namespace.Letter(this, i+1); 

            // Append the Letter to my lists and to the Workspace
            this.objects.push(letter);
            this.letters.push(letter);
            wksp.objects.push(letter);
            letter.descriptions.forEach(descr => descr.build());
        }
    }

    
    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        if (!type) {
            return this.jstring;
        }
        else if (type === 1) {
            return '<WorkspaceString: ' + this.jstring + '>';
        }
        else {
            return this.jstring + ' with ' + this.letters.length.toString() +
                ' letters, ' + this.objects.length.toString() + ' objects, ' + 
                this.bonds.length.toString() + ' bonds.';
        }
    }


    /**
     * Returns the number of characters in the string.
     * 
     */
    get length() {
        return this.jstring.length;
    }


    /**
     * Updates the relative importances of all objects in the string,
     * based on their raw importances and the total number of objects.
     * 
     */
    updateRelativeImportances() 
    {
        const total = this.objects.reduce( function(a,b){return a + b.rawImportance;}, 0 ); 

        if (total === 0) {
            for (let obj of this.objects) { obj.relativeImportance = 0; }
        }
        else {
            for (let obj of this.objects) { obj.relativeImportance = obj.rawImportance / total; }
        }
    }


    /**
     * Sets the string's intraStringUnhappiness value to the 
     * average intraStringUnhappiness value of its objects.
     * 
     */
    updateIntraStringUnhappiness() 
    {
        if (this.objects.length === 0) {
            this.intraStringUnhappiness = 0;
        }
        else {
            const total = this.objects.reduce( function(a,b){return a + b.intraStringUnhappiness;}, 0 ); 
            this.intraStringUnhappiness = total / this.objects.length;
        }
    }


    /**
     * Seeks a Group in the string that matches a given group.
     * 
     * @param {Group} sought - The Group to match.
     */
    getEquivalentGroup(sought) 
    {
        return this.objects.find(obj =>
            (obj instanceof Namespace.Group) && (obj.sameAs(sought))) || null;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );