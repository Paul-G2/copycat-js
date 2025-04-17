// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet chooses a letter at random from the initial string, 
 * and marks it as changed if the letter at the same position in the 
 * modified string is different.  
 * 
 */
 Namespace.Codelets.ReplacementFinder = class extends Namespace.Codelets.CodeletBase
 {
    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {Number} urgency - The urgency of the codelet.
     * @param {Array} args - Arguments to pass to the codelet. (Empty for this codelet.)
     * @param {Number} birthdate - The birthdate of the codelet.
     */
    constructor(ctx, urgency, args, birthdate) 
    { 
        super('replacement-finder', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     * 
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const wksp = ctx.workspace;

        // Choose a random letter from the initial string
        const letters = wksp.initialWString.objects.filter(o => o instanceof Namespace.Letter);
        if ( letters.length < 1) { return; }

        const letterOfInitialString = ctx.randGen.choice(letters);
        if (letterOfInitialString.replacement) { return; }

        const position = letterOfInitialString.leftIndex;
        const modStringLength = wksp.modifiedWString.letters.length;
        const letterOfModifiedString = (position > modStringLength) ? null : wksp.modifiedWString.letters[position - 1];
        if (letterOfModifiedString == null) { return; }

        const initialAscii = wksp.initialWString.jstring[position - 1].codePointAt(0);
        const modifiedAscii = wksp.modifiedWString.jstring[position - 1].codePointAt(0);
        const diff = initialAscii - modifiedAscii;
        const relation = (diff == -1) ? sn.successor : (diff === 0) ? sn.sameness : (diff == 1) ? sn.predecessor : null;

        const repl = new Namespace.Replacement(letterOfInitialString, letterOfModifiedString, relation);
        letterOfInitialString.replacement = repl;
        if (relation != sn.sameness) {
            letterOfInitialString.changed = true;
            wksp.changedObject = letterOfInitialString;
        }
    }
};

})( window.CopycatJS = window.CopycatJS || {} );