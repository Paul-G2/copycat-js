// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tries to build a proposed Description.
 * 
 */
 Namespace.Codelets.DescriptionBuilder = class extends Namespace.Codelets.CodeletBase
 {
    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {Number} urgency - The urgency of the codelet.
     * @param {Array} args - Arguments to pass to the codelet.
     * @param {Number} birthdate - The birthdate of the codelet.
     */
    constructor(ctx, urgency, args, birthdate) 
    { 
        super('description-builder', ctx, urgency, birthdate);
        this.description = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const descr = this.description;

        // Maybe fizzle
        if (!this.ctx.workspace.objects.includes(descr.object)) { return; }

        // Build or activate the description
        if (descr.object.hasDescriptor(descr.descriptor)) {
            descr.activate();
        }
        else {
            descr.build();
        }
    }
};

})( window.CopycatJS = window.CopycatJS || {} );