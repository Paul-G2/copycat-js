// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tries to break a randomly selected bond, 
 * group, or correspondence in the workspace.
 * 
 */
 Namespace.Codelets.Breaker = class extends Namespace.Codelets.CodeletBase
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
        super('breaker', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const randGen = this.ctx.randGen;
        const temperature = this.ctx.temperature;

        // Maybe fizzle
        const fizzleProb = (1 - temperature.value()/100);
        if (randGen.coinFlip(fizzleProb)) { return; }

        // Choose a Group or Bond or Correspondence at random
        const structures = [];
        for (let s of this.ctx.workspace.structures) {
            if ((s instanceof Namespace.Group) || (s instanceof Namespace.Bond) || 
                (s instanceof Namespace.Correspondence)) {
                structures.push(s);
            }
        }
        if (!structures.length) { return; }

        const structure = randGen.choice(structures);
        const breakObjects = [structure];
        if (structure instanceof Namespace.Bond){
            if (structure.source.group && (structure.source.group == structure.destination.group)) {
                breakObjects.push(structure.source.group);
            }
        }

        // Break the bond(s)
        for (let structure of breakObjects) {
            const breakProb = temperature.getAdjustedProb(structure.totalStrength/100);
            if (randGen.coinFlip(breakProb)) { return; }
        }
        breakObjects.forEach( 
            (structure) => structure.break() );
    }
};

})( window.CopycatJS = window.CopycatJS || {} );