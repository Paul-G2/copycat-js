// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This is the base class for all codelets.
 * 
 */
 Namespace.Codelets.CodeletBase = class
 {
    /**
     * @constructor
     */
    constructor(name, ctx, urgency, birthdate) 
    { 
        this.name = name;
        this.ctx = ctx;
        this.urgency = urgency;
        this.birthdate = birthdate;
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        return !type ? this.name : '<Codelet: ' + this.name + '>';
    }
};

})( window.CopycatJS = window.CopycatJS || {} );