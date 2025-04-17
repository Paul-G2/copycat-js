// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The Replacement class encapsulates a relation (sameness, predecessor, or 
 * successor) between a Letter in the initial string and a Letter in the
 * modified string.
 * 
 */
 Namespace.Replacement = class {

    /**
     * @constructor
     * 
     * @param {Letter} objFromInitial - A letter from the initial string.
     * @param {Letter} objFromModified - A letter from the modified string.
     * @param {SlipNode} relation - The relation between the two letters.
     * 
     */
    constructor(objFromInitial, objFromModified, relation) 
    { 
        // WorkspaceStructure members
        this.wksp = objFromInitial.wksp;
        this.string = objFromInitial.string;
        this.totalStrength = 0;

        this.objFromInitial = objFromInitial;
        this.objFromModified = objFromModified;
        this.relation = relation;
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        let s = this.objFromInitial.synopsis() + ' -> ' +
            this.objFromModified.synopsis() + ' (' + 
            (this.relation ? this.relation.name : 'null') + ')';

        return !type ? s : '<Replacement: ' + s + '>';
    }

};


})( window.CopycatJS = window.CopycatJS || {} );