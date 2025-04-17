// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This is the base class for the Letter and Group classes.
 * 
 */
 Namespace.WorkspaceObject = class 
 {
    /**
     * @constructor
     * 
     * @param {WorkspaceString} str - The string that the Letter or Group is in.
     */
    constructor(str) 
    { 
        this.wksp = str.wksp;
        this.string = str;
        this.changed = false;
        
        this.descriptions = [];
        this.bonds = [];
        this.group = null;
        this.correspondence = null;
        this.replacement = null;

        this.leftBond = null;
        this.rightBond = null;
        this.rightIndex = 0;
        this.leftIndex = 0;
        this.leftmost = false;
        this.rightmost = false;

        this.rawImportance = 0;
        this.relativeImportance = 0;
        
        this.intraStringSalience = 0;
        this.interStringSalience = 0;
        this.totalSalience = 0;

        this.intraStringUnhappiness = 0;
        this.interStringUnhappiness = 0;
        this.totalUnhappiness = 0;
    }


    /**
     * Adds a set of descriptions to the object and to the workspace
     * 
     * @param {Array<Description>} descriptions - The descriptions to add.
     */
    addDescriptions(descriptions) 
    {
        // Take a copy, in case we are adding to our own descriptions
        const descriptionsToAdd = [...descriptions]; 

        for (let toAdd of descriptionsToAdd) 
        {
            const alreadyHaveIt = this.descriptions.some(d => d.sameAs(toAdd));
            if (!alreadyHaveIt) {
                const newDescr = new Namespace.Description(this, toAdd.descriptionType, toAdd.descriptor);
                newDescr.build(); // Adds newDescr to this.descriptions
            }
        }
    }
    
    
    /**
     * Calculates a happiness value for the object.
     * 
     * @private
     */
    _calculateIntraStringHappiness() 
    {
        if (this.spansString()) {
            return 100;
        }
        if (this.group) {
            return this.group.totalStrength;
        }
        const bondStrength = this.bonds.reduce((a,b) => a + b.totalStrength, 0);          
        return bondStrength / 6.0;
    }


    /**
     * Calculates a raw importance value for the object, 
     * which is the sum of all relevant description activations.
     * 
     * @private
     */
     _calculateRawImportance() 
     {
        let result = 0;
        for (let description of this.descriptions) {
            if (description.descriptionType.isFullyActive()) {
                result += description.descriptor.activation;
            } else {
                result += description.descriptor.activation / 20;
            }
        }
        if (this.group) {
            result *= 2/3;
        }
        if (this.changed) {
            result *= 2;
        }
        return result;
    }


    /**
     * Updates the object's importance, happiness, and salience values. 
     * 
     */
    updateValues()
    {
        this.rawImportance = this._calculateRawImportance();
        const intraStringHappiness = this._calculateIntraStringHappiness();
        this.intraStringUnhappiness = 100 - intraStringHappiness;

        let interStringHappiness = this.correspondence ? this.correspondence.totalStrength : 0;
        this.interStringUnhappiness = 100 - interStringHappiness;

        const averageHappiness = (intraStringHappiness + interStringHappiness) / 2;
        this.totalUnhappiness = 100 - averageHappiness;

        this.intraStringSalience = 0.2*this.relativeImportance + 0.8*this.intraStringUnhappiness;
        this.interStringSalience = 0.8*this.relativeImportance + 0.2*this.interStringUnhappiness;
        this.totalSalience = (this.intraStringSalience + this.interStringSalience) / 2;
    }


    /**
     * Returns The number of letters in this object.
     * 
     */
    letterSpan() 
    {
        return this.rightIndex - this.leftIndex + 1;
    }
    
    
    /**
     * Indicates whether this Letter or Group constitutes the entire string.
     * 
     */
    spansString()
    {
        return this.leftmost && this.rightmost;
    }


    /**
     * Indicates whether the object is contained within another object.
     * 
     * @param {WorkspaceObject} other - The object to test against. 
     */
    isWithin(other) 
    {
        return ((this.leftIndex >= other.leftIndex) && (this.rightIndex <= other.rightIndex));
    }


    /**
     * Indicates whether the object is strictly outside another object.
     * 
     * @param {WorkspaceObject} other - The object to test against. 
     */
    isOutsideOf(other) 
    {
        return (this.leftIndex > other.rightIndex || this.rightIndex < other.leftIndex);
    }


    /**
     * Indicates whether this object is beside another object.
     * 
     */
    isBeside(other) 
    {
        if (this.string != other.string) {
            return false;
        }
        return (this.leftIndex == other.rightIndex + 1) || (other.leftIndex == this.rightIndex + 1);
    }
    
    
    /**
     * Gets the fully-active descriptions of the object.
     * 
     */
    relevantDescriptions() 
    {
        return this.descriptions.filter( x => x.descriptionType.isFullyActive() ) ;
    }


    /**
     * Gets the fully-active distinguishing descriptors of the object.
     * 
     */
    relevantDistinguishingDescriptors( ) 
    {
        return this.relevantDescriptions().
            filter(x => this.isDistinguishingDescriptor(x.descriptor)).map(x => x.descriptor);
    }
    
    
    /**
     * Indicates whether this object is described by a given descriptor.
     * 
     * @param {SlipNode} sought - The descriptor to test against.
     */
    hasDescriptor(sought) 
    {
        return this.descriptions.some(x => x.descriptor == sought);
    }
    
    
    /**
     * Gets the descriptor of this object that matches a given 
     * description type.
     * 
     * @param {SlipNode} descriptionType - The description type to match. 
     */
    getDescriptor(descriptionType) 
    {
        const match = this.descriptions.find(d => d.descriptionType == descriptionType);
        return match ? match.descriptor : null;
    }


    /**
     * Gets the description type of this object that matches a 
     * given descriptor.
     * 
     * @param {SlipNode} descriptor - The descriptor to match. 
     */
    getDescriptionType(descriptor) 
    {
        const match = this.descriptions.find(d => d.descriptor == descriptor);
        return match ? match.descriptionType : null;
    }    


    /**
     * Indicates whether this object is the middle object in its string.
     * 
     */
    isMiddleObject( )
    {
        // (Only works for strings that are 3 chars long)
        let objectOnMyRightIsRightmost = false;
        let objectOnMyLeftIsLeftmost = false;
        for (let obj of this.string.objects) {
            if (obj.leftmost && (obj.rightIndex == this.leftIndex - 1)) {
                objectOnMyLeftIsLeftmost = true;
            }
            if (obj.rightmost && (obj.leftIndex == this.rightIndex + 1)) {
                objectOnMyRightIsRightmost = true;
            }
        }
        return objectOnMyRightIsRightmost && objectOnMyLeftIsLeftmost;
    }


    /**
     * Gets the groups that are common between this object and another one.
     * 
     * @param {WorkspaceObject} other - The object to test against.
     */
    getCommonGroups(other) 
    {
        return this.string.objects.filter( obj => this.isWithin(obj) && other.isWithin(obj) );
    }


    /**
     * Returns the distance, in nmber of letters, between this object 
     * and another.
     * 
     * @param {WorkspaceObject} other - The object to test against. 
     */
    letterDistance(other) 
    {
        if (this.string != other.string) {
            throw new Error("Cannot compare objects from different strings, in WorkspaceObject.letterDistance");
        }

        if (other.leftIndex > this.rightIndex) {
            return other.leftIndex - this.rightIndex;
        }
        if (this.leftIndex > other.rightIndex) {
            return this.leftIndex - other.rightIndex;
        }
        return 0;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This class provides several utility functions 
 * needed by the codelets. 
 * 
 */
 Namespace.Codelets.CodeletUtils = class
 {
    /**
     * Returns a quantized measure of urgency.
     * 
     * @param {Number} urgency - The input urgency.
     */
    static getUrgencyBin(urgency)
    {
        const numUrgencyBins = 7;
        const i = Math.floor(urgency) * numUrgencyBins / 100;
        return (i >= numUrgencyBins) ? numUrgencyBins : i + 1;  
    }


    /**
     * Returns a random  object from a given list, that is
     * not from the modified string. The probability of
     * choosing an object is weighted by its value of the
     * given attribute.
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {String} attribute - The attribute to use for weighting.
     * @param {Array} inObjects - The list of objects to choose from.
     * 
     */
    static chooseUnmodifiedObject(ctx, attribute, inObjects)
    {
        const candidates = inObjects.filter(o => o.string != ctx.workspace.modifiedWString);
        const weights = candidates.map( o => ctx.temperature.getAdjustedValue(o[attribute]) );
        return ctx.randGen.weightedChoice(candidates, weights);
    }

    
    /**
     * Returns a random nearest-neighbor of a given object.
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {WorkspaceObject} sourceObj - The input object.
     * 
     */
    static chooseNeighbor(ctx, sourceObj)
    {
        const candidates = ctx.workspace.objects.filter(o => o.isBeside(sourceObj));
        const weights = candidates.map( o => ctx.temperature.getAdjustedValue(o.intraStringSalience) );
        return ctx.randGen.weightedChoice(candidates, weights);
    }

    
    /**
     * Randomly selects an object from the initial or target string that
     * matches the given criterion.
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {String} relevanceCriterion - 'bondCategory' or 'bondDirection'.
     * @param {SlipNode} toMatch - The SlipNode to match.
     */
    static getScoutSource(ctx, relevanceCriterion, toMatch)
    {
        // Define a function to compute the relevance of a string.
        const relevance = function(string, criterion, nodeToMatch)
        {
            if ((criterion == 'bondCategory') && (string.objects.length == 1)) {
                return 0;
            }

            const nonSpanningObjs = string.objects.filter(o => !o.spansString());
            const numNonSpanningObjects = nonSpanningObjs.length;
            let numMatches = 0;
            if (criterion == 'bondCategory') {
                numMatches = nonSpanningObjs.filter(o => o.rightBond && (o.rightBond.category == nodeToMatch)).length;
            }
            else if (criterion == 'bondDirection') {
                numMatches = nonSpanningObjs.filter(o => o.rightBond && (o.rightBond.directionCategory == nodeToMatch)).length;
            }

            return (numNonSpanningObjects == 1) ? 100 * numMatches : (100 * numMatches) / (numNonSpanningObjects - 1);            
        };


        // Get relevance and unhappiness values.
        const wksp = ctx.workspace;
        const initialRelevance = relevance(wksp.initialWString, relevanceCriterion, toMatch);
        const targetRelevance = relevance(wksp.targetWString, relevanceCriterion, toMatch);
        const initialUnhappiness = wksp.initialWString.intraStringUnhappiness;
        const targetUnhappiness = wksp.targetWString.intraStringUnhappiness;
        const initials = initialRelevance + initialUnhappiness;
        const targets = targetRelevance + targetUnhappiness;

        // Choose a source object.
        let result;
        const Utils = Namespace.Codelets.CodeletUtils;
        if (ctx.randGen.weightedGreaterThan(targets, initials)) {
            result = Utils.chooseUnmodifiedObject(ctx, 'intraStringSalience',  wksp.targetWString.objects);
        }else {
            result = Utils.chooseUnmodifiedObject(ctx, 'intraStringSalience', wksp.initialWString.objects);
        }

        return result;
    }


    /**
     * Randomly selects a bond facet that is common to the 
     *  given source and destination objects.
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {WorkspaceObject} sourceObj - The source object.
     * @param {WorkspaceObject} destObj - The destination object.
     * 
     */
    static chooseBondFacet(ctx, sourceObj, destObj)
    {
        // The allowed bond facets:
        const bondFacets = [ctx.slipnet.letterCategory, ctx.slipnet.length];

        // Get the bond facets that are present in both source and destination.
        const sourceFacets = sourceObj.descriptions.map(d => d.descriptionType).filter(d => bondFacets.includes(d));

        const candidateFacets = destObj.descriptions.map(d => d.descriptionType).filter(d => sourceFacets.includes(d));

        // For each such facet, compute a support value based on both the facet's activation
        // and the number of objects in the source's string that share the facet.
        const facetWeights = [];
        const sourceSiblings = ctx.workspace.objects.filter(o => o.string == sourceObj.string);
        const siblingDescriptions = sourceSiblings.map(o => o.descriptions).flat();
        for (let facet of candidateFacets) {
            let supportCount = 0;
            for (let d of siblingDescriptions) {
                supportCount += (d.descriptionType == facet) ? 1 : 0;
            }
            const stringSupport = 100 * supportCount / (sourceSiblings.length || 1);
            facetWeights.push( (facet.activation + stringSupport)/2 );
        }

        return ctx.randGen.weightedChoice(candidateFacets, facetWeights);
    }


    /**
     * Probabilistically decides which of two given structures to return,
     * based on their strengths as well as external weight factors.
     *
     * @param {WorkspaceStructure} structure1 - The first structure.
     * @param {Number} weight1 - The weight factor for the first structure.
     * @param {WorkspaceStructure} structure2 - The second structure.
     * @param {Number} weight2 - The weight factor for the second structure.
     * 
     */
    static structureVsStructure(structure1, weight1, structure2, weight2)
    {
        const ctx = structure1.wksp.ctx;
        const temperature = ctx.temperature;

        structure1.updateStrength();
        structure2.updateStrength();
        const weightedStrength1 = temperature.getAdjustedValue(structure1.totalStrength * weight1);
        const weightedStrength2 = temperature.getAdjustedValue(structure2.totalStrength * weight2);

        return ctx.randGen.weightedGreaterThan(weightedStrength1, weightedStrength2);
    }


    /**
     * Pits the given structure against the given list of incompatible
     * structures, deciding probabilistically on a winner.
     * 
     * @param {WorkspaceStructure} structure - The structure to test.
     * @param {Number} structureWeight - The weight factor for the structure.
     * @param {Array<WorkspaceStructure>} incompatibles - The list of incompatible structures.
     * @param {Number} incompatiblesWeight - The weight factor for the incompatible structures. 
     * 
     */
    static fightItOut(structure, structureWeight, incompatibles, incompatiblesWeight)
    {
        if (!incompatibles || !incompatibles.length) {
            return true;
        }
        
        return incompatibles.every(incomp => 
            Namespace.Codelets.CodeletUtils.structureVsStructure(structure, structureWeight, incomp, incompatiblesWeight)
        );
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







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







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This class implements a draggable dalog box.
 * 
 */
Namespace.Dialog = class 
{   
    /**
     * @constructor
     * 
     * @param {HTMLElement} [parent=document.body] - The dialog's parent element.
     * @param {Number} width - The dialog width, in percentage units
     * @param {Number} height - The dialog height, in percentage units.
     * @param {String} [title] - Text to be displayed on the dialog's title bar.
     * @param {Boolean} [modal=false] - Whether the dialog is modal. (Currently only non-modal is supported.)
     * @param {String} [bkgndColor] - The dialog's background color.
     * @param {String} [titleBarColor] - The dialog's title bar color.
     */
    constructor(parent, width, height, title, modal, bkgndColor, titleBarColor)
    {
        this.parent        = parent || document.body;
        this.width         = width;
        this.height        = height;
        this.modal         = modal; // Not supported yet
        this.mainDiv       = null;
        this.startPos      = [0,0];  
        this.mouseDownLoc  = [0,0];  
        this.dragStartFunc = this._onDragStart.bind(this);
        this.dragMoveFunc  = this._onDragMove.bind(this);
        this.dragEndFunc   = this._onDragEnd.bind(this);
        this.onOk          = null;
        this.onCancel      = null;
        this.fontFamily    = 'verdana, arial, helvetica, sans-serif';

        // Create the user interface
        this._initUi( (title || ""), (bkgndColor || 'white'), (titleBarColor || bkgndColor || 'white') );      
    }


    /**
     * Lays out the UI.
     * @private
     * 
     * @param {String} [title] - Text to be displayed in the dialog's title bar.
     * @param {String} [bkgndColor] - The dialog's background color.
     * @param {String} [titleBarColor] - The dialog's title bar color.
     * 
     */
    _initUi(title, bkgndColor, titleBarColor)
    {
        const UiUtils = Namespace.UiUtils;

        // Container div
        this.mainDiv = UiUtils.CreateElement('div', 'dialog_maindiv', this.parent); 
        UiUtils.StyleElement(this.mainDiv, {display:'none', width:
            this.width.toString() + '%', height:this.height.toString() + '%', 
            left:((100 - this.width)/2).toString() + '%', 
            top:((100 - this.height)/2).toString() + '%', 
            zIndex:'10', backgroundColor:bkgndColor,
            border:'1px solid black'} );
            
        // Titlebar 
        const titleFontSize = (.03 * this.height).toString() + 'vh';
        this.titleDiv = UiUtils.CreateElement('div', 'dialog_titlediv', this.mainDiv); 
        this.titleDiv.innerHTML = title;
        UiUtils.StyleElement(this.titleDiv, {
            width:'95%',height:'5%',
            left:'0px', top:'0px', display:'flex', alignItems:'center', justifyContent:'center',
            backgroundColor:titleBarColor, fontSize:titleFontSize, fontFamily:this.fontFamily} 
        );
        this.titleDiv.className += ' noselect';
        this.titleDiv.addEventListener( 
            (UiUtils.isTouchDevice() ? 'touchstart' : 'mousedown'), this.dragStartFunc);  

        // Close button
        this.closeDiv = UiUtils.CreateElement('div', 'dialog_closediv', this.mainDiv); 
        this.closeDiv.innerHTML = 'X';
        UiUtils.StyleElement(this.closeDiv, {
            width:'5%', height:'5%', 
            right:'0px', top:'0px', display:'flex', alignItems:'center', justifyContent:'center',
            backgroundColor:titleBarColor, fontSize:titleFontSize, fontFamily:this.fontFamily} 
        );
        this.closeDiv.className += ' noselect';
        this.closeDiv.addEventListener( (UiUtils.isTouchDevice() ? 'touchstart' : 'click'), this._onTitleBarClose.bind(this) ); 
        this.closeDiv.addEventListener('mouseover', function() { this.closeDiv.style.fontWeight = 'bold'; }.bind(this) ); 
        this.closeDiv.addEventListener('mouseout',  function() { this.closeDiv.style.fontWeight = 'normal'; }.bind(this) ); 

        // User content div
        this.userDiv = UiUtils.CreateElement('div', 'dialog_userdiv', this.mainDiv); 
        UiUtils.StyleElement(this.userDiv, {bottom:'0px', left:'0px', width:'100%', height:'95%'} ); 
    }


    /**
     * Shows the dialog.
     * 
     * @param {Function} [onOk] - Function to invoke if the dialog's OK button is clicked.
     * @param {Function} [onCancel] - Function to invoke if the dialog is cancelled.
     * 
     */
    show(onOk, onCancel)
    {
        if (onOk) { this.onOk = onOk; }
        if (onCancel) { this.onCancel = onCancel; }

        this.mainDiv.style.display = 'inline-block';  
    }


    /**
     * Hides the dialog.
     * 
     */
    hide()
    {
        this.mainDiv.style.display = 'none';  
    }


    /**
     * Indicates whether the dialog is currenty shown.
     * 
     */
    isShown()
    {
        return this.mainDiv.style.display != 'none';  
    }


    /**
     * Handler for clicks on the dismiss button. (Sub-classes can override.)
     * @private
     * 
     */
    _onTitleBarClose()
    {
        if (this.onCancel) { this.onCancel(this); }
        this.hide();  
    }


    /**
     * Handler for drag-start events.
     * @private
     * 
     * @param {Event} event - Event info.
     * 
     */
    _onDragStart(event)
    {
        const mouseLoc = this._getEventCoordinates(event);
        if ( (mouseLoc[0] !== null) && (mouseLoc[1] !== null) ) 
        { 
            event.preventDefault();
            
            const rect = this.mainDiv.getBoundingClientRect();
            this.startPos = {x:rect.left, y:rect.top};
            this.mouseDownLoc = mouseLoc;

            document.addEventListener( (Namespace.UiUtils.isTouchDevice() ? 'touchmove' : 'mousemove'), this.dragMoveFunc );  
            document.addEventListener( (Namespace.UiUtils.isTouchDevice() ? 'touchend touchcancel' : 'mouseup'), this.dragEndFunc );  
        }
    }


    /**
     * Handler for drag-move events.
     * @private
     * 
     * @param {Event} event - Event info.
     * 
     */
    _onDragMove(event)
    {
        const mouseLoc = this._getEventCoordinates(event);
        if ( (mouseLoc[0] !== null) && (mouseLoc[1] !== null) ) 
        { 
            event.preventDefault();
            const w = parseFloat(this.mainDiv.style.width);
            const pw = this.parent.clientWidth || 1024;
            const ph = this.parent.clientHeight || 1024;
            const newX = Math.max(64-w, Math.min(pw-64, this.startPos.x + mouseLoc[0]-this.mouseDownLoc[0]));
            const newY = Math.max(0,    Math.min(ph-64, this.startPos.y + mouseLoc[1]-this.mouseDownLoc[1]));
            this.mainDiv.style.left = newX.toString() + 'px';  
            this.mainDiv.style.top  = newY.toString() + 'px';  
        }
    }


    /**
     * Handler for drag-end events.
     * @private
     * 
     * @param {Event} event - Event info.
     * 
     */
    // eslint-disable-next-line no-unused-vars
    _onDragEnd(event)
    {
        document.removeEventListener( (Namespace.UiUtils.isTouchDevice() ? 'touchmove' : 'mousemove'), this.dragMoveFunc );  
        document.removeEventListener( (Namespace.UiUtils.isTouchDevice() ? 'touchend touchcancel' : 'mouseup'), this.dragEndFunc );  
    }


    /**
     * Gets the coordinates from a given event.
     * @private
     * 
     * @param {Event} event - Event info.
     * 
     */
    _getEventCoordinates(event)
    {
        // Read the event coordinates
        let cx1 = event.clientX;
        let cy1 = event.clientY;

        if ( (typeof(cx1) == 'undefined') || (typeof(cy1) == 'undefined') || (cx1 === null) || (cy1 === null) ) {
            if ( this.isTouchDevice && event.originalEvent && event.originalEvent.targetTouches ) { 
                if (event.originalEvent.targetTouches.length > 0)  {
                    cx1 = event.originalEvent.targetTouches[0].clientX;
                    cy1 = event.originalEvent.targetTouches[0].clientY;
                }
            }
        }
        if ( (typeof(cx1) == 'undefined') || (typeof(cy1) == 'undefined') ) {
            cx1 = cy1 = null;
        }
        return [cx1, cy1];
    }

};

})( window.CopycatJS = window.CopycatJS || {} );










// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A Bond is a relation between Letters and/or Groups in the same string. 
 * For example, a letter-successorship relation between 'a' and 'b' in the string 'abc'.
 */
 Namespace.Bond = class {

    /**
     * @constructor
     * 
     * @param {WorkspaceObject} from - The source object of the bond.
     * @param {WorkspaceObject} to - The destination object of the bond.
     * @param {SlipNode} category - The bond category (successor, predecessor, or sameness).
     * @param {SlipNode} facet - The facet of the bond category (letterCategory or length).
     * @param {SlipNode} fromDescriptor - The facet's value for the source object, e.g. 'a'.
     * @param {SlipNode} toDescriptor - The facet's value for the destination object, e.g. 'b'.
     */
    constructor(from, to, category, facet, fromDescriptor, toDescriptor) 
    { 
        // WorkspaceStructure members
        this.wksp = from.wksp;
        this.string = from.string;
        this.totalStrength = 0;

        this.source = from;
        this.destination = to;
        this.category = category;
        this.facet = facet;
        this.sourceDescriptor = fromDescriptor;
        this.destDescriptor = toDescriptor;

        this.leftObject = this.source;
        this.rightObject = this.destination;
        this.directionCategory = this.wksp.ctx.slipnet.right;
        if (this.source.leftIndex > this.destination.rightIndex) {
            this.leftObject = this.destination;
            this.rightObject = this.source;
            this.directionCategory = this.wksp.ctx.slipnet.left;
        }
        if (fromDescriptor == toDescriptor){
            this.directionCategory = null;
        }
    }


    /**
     * Returns a string describing the object.
     */
    synopsis(type)
    {
        const s = this.source.synopsis(1) + ' to ' + 
        this.destination.synopsis(1) + ` (${this.category.name}, ` +
        `${this.facet.name}, ` + `${this.sourceDescriptor.name}, ` + 
        `${this.destDescriptor.name})`;

        return !type ? s : '<Bond: ' + s + '>';
    }

    
    /**
     * Adds the Bond to the workspace, the parent string, and the
     * source and destination objects. Activates its category and 
     * directionCategory concepts.
     * 
     */
    build()
    {
        this.wksp.structures.push(this);
        this.string.bonds.push(this);
        this.leftObject.bonds.push(this);
        this.rightObject.bonds.push(this);  
        this.leftObject.rightBond = this;
        this.rightObject.leftBond = this;

        this.category.activation = 100;
        if (this.directionCategory) {
            this.directionCategory.activation = 100;
        }
    }  


    /**
     * Removes the Bond from the workspace, the parent string, and the
     * source and destination objects.
     * 
     */
    break()
    {
        this.wksp.structures = this.wksp.structures.filter(s => s !== this);
        this.string.bonds = this.string.bonds.filter(s => s !== this);
        this.leftObject.bonds = this.leftObject.bonds.filter(s => s !== this);
        this.rightObject.bonds = this.rightObject.bonds.filter(s => s !== this);
        this.leftObject.rightBond = null;
        this.rightObject.leftBond = null;
    }


    /**
     * Creates a Bond like this one, except that the source and 
     * destination are swapped.
     */
    flippedVersion()
    {
        return new Namespace.Bond(
            this.destination, this.source,
            this.category.getRelatedNode(this.wksp.ctx.slipnet.opposite),
            this.facet, this.destDescriptor, this.sourceDescriptor
        );
    }
    
    
    /**
     * Updates the total strength value.
     * 
     */
    updateStrength()
    {
        // Calculate the internal strength.
        // (Bonds between objects of same type (ie. letter or group) are stronger than 
        // bonds between different types, and letter bonds are stronger than length bonds.)
        const compat = (this.source instanceof Namespace.Letter) == (this.destination instanceof Namespace.Letter) ? 1.0 : 0.7;
        const facetFactor = (this.facet == this.wksp.ctx.slipnet.letterCategory) ? 1.0 : 0.7;
        let internalStrength = Math.min(100, compat * facetFactor * this.category.bondDegreeOfAssociation() );

        // External strength:
        let externalStrength = 0;
        const supports = this.string.bonds.map(b => (b.string == this.source.string) &&
            (this.leftObject.letterDistance(b.leftObject) !== 0) &&
            (this.rightObject.letterDistance(b.rightObject) !== 0) &&
            (this.category == b.category) &&
            (this.directionCategory == b.directionCategory) ? 1 : 0);

        const nsupporters = supports.reduce((a, b) => a + b, 0);
        if (nsupporters > 0) {
            const density = 100 * Math.sqrt(this._localDensity());
            let supportFactor = Math.pow(0.6, (1/Math.pow(nsupporters,3)));
            supportFactor = Math.max(1.0, supportFactor);
            externalStrength = supportFactor * density;
        }

        // Total strength:
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }


    /**
     * Returns a measure of the density in the workspace strings of
     * bonds with the same bond-category and same direction-category 
     * as this bond.
     * 
     * @private
     */
    _localDensity()
    {
        let slotSum = 0;
        let supportSum = 0;
        
        for (let obj1 of this.wksp.objects.filter(o => o.string == this.string)) {
            for (let obj2 of this.wksp.objects.filter(o2 => obj1.isBeside(o2)) ) {
                slotSum += 1;
                for (const b of this.string.bonds.filter(b => b != this)) {
                    const sameCats = (b.category == this.category) && (b.directionCategory == this.directionCategory); 
                    const sameEnds = ((this.source == obj1) && (this.destination == obj2)) || ((this.source == obj2) && (this.destination == obj1));
                    if (sameCats && sameEnds) { supportSum += 1; }
                }
            }
        }
        return slotSum === 0 ? 0 : supportSum/slotSum;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    const CodeletUtils = Namespace.Codelets.CodeletUtils;

/**
 * @classdesc
 * The Coderack class manages a set of Codelets and their execution.
 * 
 */
 Namespace.Coderack = class {

    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     */
    constructor(ctx) 
    { 
        this.ctx = ctx;
        this.codelets = [];
        this.numCodeletsRun = 0;
        this.lastRunCodelet = null;
        this.factory = new Namespace.Codelets.CodeletFactory(ctx);
    }


    /**
     * Empties the list of codelets and sets the 
     * run counter to zero.
     * 
     */
    reset()
    {
        this.codelets = [];
        this.numCodeletsRun = 0;
    }


    /**
     * Posts a new batch of top-down and bottom-up codelets.
     * 
     */
    updateCodelets()
    {
        if (this.numCodeletsRun > 0) {
            this._postTopDownCodelets();
            this._postBottomUpCodelets();
        }
    }


    /**
     * Adds a new codelet to the coderack. If the coderack is full,
     * it will remove an old codelet to make room.
     * 
     */
    post(codelet) 
    {
        this.codelets.push(codelet);
        if (this.codelets.length > 100) 
        {
            // Choose an old codelet to remove, preferring lower urgency ones.
            const urgencies = this.codelets.map( c => (this.numCodeletsRun - c.birthdate) * (7.5 - c.urgency) );
            const toRemove = this.ctx.randGen.weightedChoice(this.codelets, urgencies);
            this.codelets = this.codelets.filter(c => c != toRemove);
        }
    }


    /**
     * Runs a randomly chosen codelet from the coderack.
     * The choice is weighted by urgency and temperature.
     * If the coderack is empty, it will first post a new batch of codelets.
     */
    chooseAndRunCodelet()
    {
        if (this.codelets.length === 0) 
        {
            // Post initial codelets
            const toPost = [];
            const nobjs = this.ctx.workspace.objects.length;
            if (nobjs === 0) {
                toPost.push( ['rule-scout', 1] );
            }
            else {
                toPost.push( ['bottom-up-bond-scout', 2*nobjs] );
                toPost.push( ['replacement-finder', 2*nobjs] );
                toPost.push( ['bottom-up-correspondence-scout', 2*nobjs] );
            }
            for (let item of toPost) {
                const codeletName = item[0];
                const numCopies = item[1];
                for (let c=0; c<numCopies; c++) {
                    this.post( this.factory.create(codeletName, 1, []) );
                }
            }
        }

        // Choose a codelet to run
        const chosen = this.ctx.randGen.weightedChoice(this.codelets, this.getCodeletRunProbabilities());
        this.codelets = this.codelets.filter(c => c != chosen);

        // Run it
        try {
            chosen.run();
            this.numCodeletsRun += 1;
            this.lastRunCodelet = chosen;
        } 
        catch (e) {
            this.ctx.reporter.error(e);
        }
    }


    /**
     * Calculates the probability of running each codelet, based
     * on its urgency and the current temperature.
     * 
     */
    getCodeletRunProbabilities()
    {
        const temperature = this.ctx.temperature.value();
        const scale = (100 - temperature + 10) / 15;

        let probs = this.codelets.map(c => Math.pow(c.urgency, scale));
        const totalProb = probs.reduce((a,b) => a+b, 0);

        return probs.map(p => p/totalProb);
    }


    /**
     * Posts codelets associated with fully-active nodes.
     * 
     * @private
     */
    _postTopDownCodelets()
    {
        const sn = this.ctx.slipnet;
        const topDownCodelets = new Map();
        topDownCodelets.set(sn.left, ['top-down-bond-scout--direction', 'top-down-group-scout--direction']);
        topDownCodelets.set(sn.right, ['top-down-bond-scout--direction', 'top-down-group-scout--direction']);
        topDownCodelets.set(sn.predecessor, ['top-down-bond-scout--category']);
        topDownCodelets.set(sn.successor, ['top-down-bond-scout--category']);
        topDownCodelets.set(sn.sameness, ['top-down-bond-scout--category']);
        topDownCodelets.set(sn.predecessorGroup, ['top-down-group-scout--category']);
        topDownCodelets.set(sn.successorGroup, ['top-down-group-scout--category']);
        topDownCodelets.set(sn.samenessGroup, ['top-down-group-scout--category']);
        topDownCodelets.set(sn.stringPositionCategory, ['top-down-description-scout']);
        topDownCodelets.set(sn.alphabeticPositionCategory, ['top-down-description-scout']);

        const random = this.ctx.randGen;
        topDownCodelets.forEach((codeletNames, node) => {
            if (node.activation >= 100) { 
                for (let codeletName of codeletNames) {
                    const prob = this._probabilityOfPosting(codeletName);
                    const howMany = this._howManyToPost(codeletName);
                    for (let i=0; i<howMany; i++) {
                        if (random.coinFlip(prob)) {
                            const urgency = CodeletUtils.getUrgencyBin(node.activation * node.depth/100);
                            const codelet = this.factory.create(codeletName, urgency, [node]);
                            this.post(codelet);
                        }
                    }
                }
            }
        });
    }


    /**
     * Posts bottom-up codelets randomly chosen from a fixed set.
     * 
     * @private 
     */
    _postBottomUpCodelets()
    {     
        const bottomUpCodelets = [
            'bottom-up-description-scout', 
            'bottom-up-bond-scout', 
            'group-scout--whole-string',
            'bottom-up-correspondence-scout', 
            'important-object-correspondence-scout', 
            'replacement-finder',
            'rule-scout', 
            'rule-translator', 
            'breaker'
        ];

        for (let codeletName of bottomUpCodelets) {

            const prob = this._probabilityOfPosting(codeletName);
            const howMany = this._howManyToPost(codeletName);

            let urgency = (codeletName == 'breaker') ? 1 : 3;
            if ((this.ctx.temperature.value() < 25) && codeletName.includes('translator')) { 
                urgency = 5; 
            }

            for (let i=0; i<howMany; i++) {
                if (this.ctx.randGen.coinFlip(prob)){
                    const codelet = this.factory.create(codeletName, urgency, []);
                    this.post(codelet);
                }
            }
        }
    }


    /**
     * Computes the probabilty of posting a given codelet type.
     * 
     * @private
     */
    _probabilityOfPosting(codeletName)
    {
        const wksp = this.ctx.workspace;
        if (codeletName == 'breaker') {
            return 1.0;
        }
        else if (codeletName.includes('replacement')) {
            const unreplaced = wksp.objects.filter(o => (o.string == wksp.initialWString) && (o instanceof Namespace.Letter) && !o.replacement);
            return (unreplaced.length > 0) ? 1.0 : 0.0;
        }
        else if (codeletName.includes('rule')) {
            return !wksp.rule ? 1.0 : wksp.rule.totalWeakness() / 100;
        }
        else if (codeletName.includes('correspondence')) {
            return wksp.interStringUnhappiness / 100;
        }
        else if (codeletName.includes('description')) {
            return Math.pow(this.ctx.temperature.value()/100, 2);
        }
        else {
            return wksp.intraStringUnhappiness / 100;
        }
    }


    /**
     * Computes the number of codelet of a given type to post.
     * 
     * @private
     */
    _howManyToPost(codeletName)
    {
        const random = this.ctx.randGen;
        const wksp = this.ctx.workspace;
        if ((codeletName == 'breaker') || codeletName.includes('description')) {
            return 1;
        }
        else if (codeletName.includes('translator')) {
            return wksp.rule ? 1 : 0;
        }
        else if (codeletName.includes('rule')) {
            return 2;
        }
        else if (codeletName.includes('group') ) {
            const numBonds = wksp.structures.filter(o => o instanceof Namespace.Bond).length;
            if (numBonds === 0) {
                return 0;
            }
        }
        else if (codeletName.includes('replacement') && !!wksp.rule) {
            return 0;
        }
        
        let number = 0;
        if (codeletName.includes('bond')) 
        {
            // Get the number of objects in the workspace with at least 
            // one open bond slot.
            const unrelated = wksp.objects.filter(o => 
                ((o.string == wksp.initialWString) || (o.string == wksp.targetWString)) &&
                !o.spansString() && 
                ((!o.leftBond && !o.leftmost) || (!o.rightBond && !o.rightmost)));
            number = unrelated.length;
        }
        if (codeletName.includes('group')) 
        {
            // Get the number of objects in the workspace that have no group.
            const ungrouped = wksp.objects.filter(o => ((o.string == wksp.initialWString) || (o.string == wksp.targetWString)) && !o.spansString() && !o.group);
            number = ungrouped.length;
        }
        if (codeletName.includes('replacement')) 
        {
            const unreplaced = wksp.objects.filter(o => (o.string == wksp.initialWString) && (o instanceof Namespace.Letter) && !o.replacement);
            number = unreplaced.length;
        }
        if (codeletName.includes('correspondence')) 
        {
            const uncorresp = wksp.objects.filter(o => ((o.string == wksp.initialWString) || (o.string == wksp.targetWString)) && !o.correspondence);
            number = uncorresp.length;
        }

        return (number < random.sqrtBlur(2.0)) ? 1 : (number < random.sqrtBlur(4.0)) ? 2 : 3;
    }


    /**
     * Posts a bond-strength-tester codelet for a bond with 
     * the given attributes.
     *  
     */
    proposeBond(source, destination, bondCategory, bondFacet, 
        sourceDescriptor, destDescriptor)
    {
        bondFacet.activation = 100;
        sourceDescriptor.activation = 100;
        destDescriptor.activation = 100;
        
        const bond = new Namespace.Bond(source, destination, bondCategory, bondFacet, sourceDescriptor, destDescriptor);
        const urgency = CodeletUtils.getUrgencyBin( bondCategory.bondDegreeOfAssociation() );
        const codelet = this.factory.create('bond-strength-tester', urgency, [bond]);
        
        this.post(codelet);
        
        return bond;
    }


    /**
     * Posts a description-strength-tester codelet for a Description with 
     * the given attributes.
     *  
     */    
    proposeDescription(obj, bondType, descriptor)
    {
        const description = new Namespace.Description(obj, bondType, descriptor);
        descriptor.activation = 100;

        const urgency = CodeletUtils.getUrgencyBin(bondType.activation);
        const codelet = this.factory.create('description-strength-tester', urgency, [description]);

        this.post(codelet);
        
        return description;
    }


    /**
     * Posts a correspondence-strength-tester codelet for a Correspondence with 
     * the given attributes.
     *  
     */  
    proposeCorrespondence(initialObject, targetObject, conceptMappings, flipTargetObject)
    {
        const correspondence = new Namespace.Correspondence(initialObject, targetObject, conceptMappings, flipTargetObject);

        conceptMappings.forEach(m => {
            m.initialDescType.activation = 100;
            m.initialDescriptor.activation = 100;
            m.targetDescType.activation = 100;
            m.targetDescriptor.activation = 100;
        });

        const mappings = correspondence.conceptMappings.filter(m => m.isDistinguishing());
        const numMappings = mappings.length;
        const urgency = CodeletUtils.getUrgencyBin(mappings.reduce((a,b) => a + b.strength(), 0) / (numMappings || 1));
        const codelet = this.factory.create('correspondence-strength-tester', urgency, [correspondence]);

        this.post(codelet);

        return correspondence;
    }


    /**
     * Posts a group-strength-tester codelet for a Group with 
     * the given attributes.
     *  
     */ 
    proposeGroup(objects, bondList, groupCategory, directionCategory, bondFacet)
    {
        const bondCategory = groupCategory.getRelatedNode(this.ctx.slipnet.bondCategory);
        bondCategory.activation = 100;
        if (directionCategory) { directionCategory.activation = 100; }
        
        const wstring = objects[0].string;
        const group = new Namespace.Group(wstring, groupCategory, directionCategory, bondFacet, objects, bondList);

        // Provide UI feedback.
        if (this.ctx.ui && !this.ctx.batchMode) {
            this.ctx.ui.workspaceUi.getStringGraphic(wstring).groupsGraphic.flashGrope(group);
        }

        const urgency = CodeletUtils.getUrgencyBin( bondCategory.bondDegreeOfAssociation() );
        const codelet = this.factory.create('group-strength-tester', urgency, [group]);

        this.post(codelet);
        
        return group;
    }


    /**
     * Posts a rule-strength-tester codelet for a Rule with 
     * the given attributes.
     *  
     */ 
    proposeRule(facet, description, category, relation)
    {
        const rule = new Namespace.Rule(this.ctx.workspace, facet, description, category, relation);
        rule.updateStrength();

        let depth = 0;
        if (description && relation) {
            const averageDepth = (description.depth + relation.depth) / 2;
            depth = 100 * Math.sqrt(averageDepth / 100);
        }
        const urgency = CodeletUtils.getUrgencyBin(depth);
        const codelet = this.factory.create('rule-strength-tester', urgency, [rule]);

        this.post(codelet);

        return rule;
    }

};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A ConceptMapping represents a "slippage" between two concepts,
 * for example "letter -> group" or "rightmost -> leftmost".
 * 
 */
 Namespace.ConceptMapping = class {

    /**
     * @constructor
     * 
     * @param {SlipNode} initialDescType - The description type of the first concept. For example, "objectCategory" or "stringPositionCategory".
     * @param {SlipNode} targetDescType - The description type of the slipped concept.
     * @param {SlipNode} initialDescriptor - The descriptor of the first concept. For example, "letter" or "rightmost".
     * @param {SlipNode} targetDescriptor - The descriptor of the slipped concept. For example, "group" or "leftmost".
     * @param {WorkspaceObject} initialObject - The initial object.
     * @param {WorkspaceObject} targetObject - The target object.
     * 
     */
    constructor(initialDescType, targetDescType, initialDescriptor, targetDescriptor, initialObject, targetObject) 
    { 
        this.slipnet = initialDescType.slipnet;
        this.initialDescType = initialDescType;
        this.targetDescType = targetDescType;
        this.initialDescriptor = initialDescriptor;
        this.targetDescriptor = targetDescriptor;
        this.initialObject = initialObject;
        this.targetObject = targetObject;
        this.label = initialDescriptor.getBondCategory(targetDescriptor);
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        const label = this.label ? this.label.name : 'Anonymous';
        
        const s0 = `${label} from ${this.initialDescriptor.synopsis(0)} to ` + `${this.targetDescriptor.synopsis(0)}`;
        const s1 = `<ConceptMapping: ${s0}>`;

        return !type ? s0 : s1;
    }


    /**
     * Returns a value representing the ease with which slippage can occur. 
     * 
     */
    slippability()
    {
        const association = this._degreeOfAssociation();
        if (association >= 100) {
            return 100;
        }

        const depth = (this.initialDescriptor.depth + this.targetDescriptor.depth) / 200;
        return association * (1 - depth * depth);
    }

    
    /** 
     * Returns a value representing the strength of the concept-mapping.
     * (The closer and the more general the nodes, the stronger the 
     * mapping is.)  
     * 
     */
    strength()
    {
        const association = this._degreeOfAssociation();
        if (association >= 100.0) {
            return 100;
        }
        const depth = (this.initialDescriptor.depth + this.targetDescriptor.depth) / 200;
        return association * (1 + depth * depth);
    }


    /**
     * Returns a measure of the degree of association between the two
     * descriptors.
     * 
     * @private
     */
    _degreeOfAssociation()
    {
        // Assumes the 2 descriptors are connected in the slipnet 
        // by at most 1 link.
        if (this.initialDescriptor == this.targetDescriptor) {
            return 100;
        }
        for (let link of this.initialDescriptor.lateralSlipLinks) {
            if (link.destination == this.targetDescriptor) {
                return link.degreeOfAssociation();
            }
        }
        return 0;
    }
    
    
    /**
     * Indicates whether this mapping can actually produce a slippage.
     * 
     */
    canSlip()
    {
        return ((this.label != this.slipnet.identity) && (this.label != this.slipnet.sameness));
    }
    
    
    /**
     * Indicates whether this object's descriptors uniquely identify its objects. 
     * 
     */
    isDistinguishing()
    {
        if ( (this.initialDescriptor == this.slipnet.whole) && (this.targetDescriptor == this.slipnet.whole) ) {
                return false;
        }
        else if (this.initialObject && this.targetObject) {
            return this.initialObject.isDistinguishingDescriptor(this.initialDescriptor) &&
                this.targetObject.isDistinguishingDescriptor(this.targetDescriptor);
        }
        else {
            return false;
        }
    }


    /**
     * Indicates whether this object is contained (by value) in a given 
     * list of mappings.
     * 
     * @param {Array<ConceptMapping>} mappings - The list of mappings to check.
     */
    isContainedIn(mappings)
    {
        return mappings.some(m => 
            (m.initialDescType == this.initialDescType) &&
            (m.targetDescType == this.targetDescType) &&
            (m.initialDescriptor == this.initialDescriptor) &&
            (m.targetDescriptor == this.targetDescriptor)
        );
    }


    /**
     * Indicates whether a given list of mappings contains at least one
     * mapping that is nearly identical to this one.
     * 
     * @param {Array<ConceptMapping>} mappings - The list of mappings to check.
     */
    isNearlyContainedIn(mappings)
    {
        return mappings.some(m =>
            (m.initialDescType == this.initialDescType) &&
            (m.targetDescType == this.targetDescType) &&
            (m.initialDescriptor == this.initialDescriptor)
        );
    }


    /**
     * Returns a ConceptMapping like this one but with the initial and   
     * target descriptions swapped.
     * 
     */
    symmetricVersion()
    {
        if (!this.canSlip()) {
            return this;
        }

        const bond = this.targetDescriptor.getBondCategory(this.initialDescriptor);
        if (bond != this.label) {
            return this;
        }

        return new Namespace.ConceptMapping(
            this.targetDescType, this.initialDescType, this.targetDescriptor, this.initialDescriptor, this.initialObject, this.targetObject);
    }


    /**
     * Indicates whether this mapping's descriptions are fully active. 
     *
     */
    isRelevant()
    {
        return ( this.initialDescType.isFullyActive() && this.targetDescType.isFullyActive() );
    }


    /**
     * Indicates whether either of this mapping's descriptors is 
     * linked to the corresponding descriptor in another mapping.
     *  
     * @param {ConceptMapping} other - The other mapping to compare to.
     */    
    isRelatedTo(other)
    {
        return (this.initialDescriptor.isRelatedTo(other.initialDescriptor) ||
            this.targetDescriptor.isRelatedTo(other.targetDescriptor));
    }
    
    
    /**
     * Indicates whether this mapping is incompatible with another one.
     * 
     * @param {ConceptMapping} other - The mapping to check.
     */
    isIncompatibleWith(other)
    {
        // Concept-mappings (a -> b) and (c -> d) are incompatible if a is
        // related to c or if b is related to d, and the a -> b relationship is
        // different from the c -> d relationship. 
        // E.g., rightmost -> leftmost is incompatible with right -> right.
        if (!this.isRelatedTo(other)) {
            return false;
        }
        if (!this.label || !other.label) {
            return false;
        }
        return (this.label != other.label);
    }


    /**
     * Indicates whether this mapping is compatible with another one.
     * 
     * @param {ConceptMapping} other - The mapping to check.
     */
    supports(other)
    {
        // Concept-mappings (a -> b) and (c -> d) support each other if a is
        // related to c and if b is related to d and the a -> b relationship is
        // the same as the c -> d relationship.  
        // E.g., rightmost -> rightmost supports right -> right and leftmost -> leftmost.
        if ((other.initialDescType == this.initialDescType) && (other.targetDescType == this.targetDescType) ) {
            return true;
        }

        // if the descriptors are not related return false
        if (!this.isRelatedTo(other)) {
            return false;
        }
        if (!this.label || !other.label) {
            return false;
        }
        return (this.label == other.label);
    }


    /**
     * Gets a list of ConceptMappings between two given objects,
     * consistent with the given descriptions
     * 
     * @param {WorkspaceObject} initialObject - The initial object.
     * @param {WorkspaceObject} targetObject - The target object.
     * @param {Array<Description>} initialDescriptions - Descriptions of the initial object.
     * @param {Array<Description>} targetDescriptions - Descriptions of the target object.
     *
     */
    static getMappings(initialObject, targetObject, initialDescriptions, targetDescriptions)
    {
        const mappings = [];
        for (let ini of initialDescriptions) {
            for (let targ of targetDescriptions) {
                if (ini.descriptionType == targ.descriptionType) {
                    if ((ini.descriptor == targ.descriptor) || ini.descriptor.isSlipLinkedTo(targ.descriptor)) {
                        mappings.push( new Namespace.ConceptMapping(
                            ini.descriptionType, targ.descriptionType, ini.descriptor, targ.descriptor, initialObject, targetObject) );
                    }
                }
            }
        }
        return mappings;
    }
};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This class is used to report information to the console.
 * 
 */
 Namespace.ConsoleReporter = class {

    /**
     * @constructor
     * 
     */
    constructor() 
    { }
  
       
    /**
     * Reports an informational message.
     */
    info(msg)
    {
        console.info(msg);
    }       
    

    /**
     * Reports a warning message.
     */
    warn(msg)
    {
        console.warn(msg);
    }    
    
       
    /**
     * Reports an error message.
     */
    error(msg)
    {
        console.error(msg);
    }    
    
 };


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";

/**
 * @classdesc
 * This is the main class for the Copycat algorithm. 
 * It contains the Slipnet, Workspace, and Coderack obects, and the main program loop. 
 * 
 */
 Namespace.Copycat = class {

    /**
     * @constructor
     * 
     * @param {Number|String} randSeed - A seed value for the random number generator.
     */
    constructor(args = {randSeed:42, omitGui:false}) 
    { 
        this.randGen     = new Namespace.RandGen(args.randSeed);
        this.temperature = new Namespace.Temperature();
        this.slipnet     = new Namespace.Slipnet();
        this.coderack    = new Namespace.Coderack(this);
        this.workspace   = new Namespace.Workspace(this);
        this.reporter    = new Namespace.ConsoleReporter();
        this.ui          = args.omitGui ? null : new Namespace.CopycatUi(this); // omitGui is used by unit tests
        this.batchMode   = false;
        this.batchSize   = 1000;
        this.batchCount  = 0;
        this.batchId     = 0;
        this.stepTimerId = null;
        this.stepDelay   = 50;

        this._setState('ready');
    }
    

    /**
     * Sets the input strings.
     * 
     * @param {String} initial - The initial string.
     * @param {String} modified - The modified string.
     * @param {String} target - The target string.
     */
    setStrings(initial, modified, target)
    {
        if (this.state == 'running') { 
            this.reporter.warn(`setStrings request ignored - Copycat is in ${this.state} state`);
            return; 
        }
        if (![initial, modified, target].every(this.checkInputString)) {
            this.reporter.warn(`setStrings request ignored - input strings must contain only letters`);
            return;
        }
        this.workspace.reset(initial, modified, target);
        this.reset();
    }


    /**
     * Checks whether an input string is valid (i.e., 
     * contains only letters).
     * 
     * @param {String} string - The string to check
     * 
     */
    checkInputString(string)
    {
        return string.length && !/[^a-z]/i.test(string);
    }


    /**
     * Toggles us in or out of batch mode.
     * 
     * @param {Boolean} value - The batchmode flag
     * 
     */
    toggleBatchMode(value)
    {
        this.ui.batchmodeUi.clearTable();
        this.reset();
        this.batchMode = value;
        this.ui._onBatchModeToggled();
    }


    /**
     * Seeds the random number generator.
     * 
     * @param {Number|String} randSeed - A seed value.
     */
    setRandSeed(seed) 
    {
        this.randGen = new Namespace.RandGen(seed);
    }
    

    /**
     * Sets the time delay between steps.
     * 
     * @param {Number} value - The time delay in milliseconds.
     */
    setStepDelay(value)
    {
        this.stepDelay = Math.max(0, value);
    }


    /**
     * Starts running the copycat algorithm with the current strings.
     * 
     */
    start()
    {
        if ((this.state != 'ready') && (this.state != 'done')) { 
            this.reporter.warn(`start request ignored - Copycat is in ${this.state} state`);
        }
        else {
            this.reset();
            this._setState('running');

            if (this.batchMode) {
                this.batchCount = 0;
                this.batchRun(); 
            } else {
                this._runNextCodelet();
            }
        } 
    }


    /**
     * Pauses copycat.
     * 
     */
    pause()
    {
        if (this.state != 'running') {
            this.reporter.warn(`pause request ignored - Copycat is in ${this.state} state`);
        }
        else {
            window.clearTimeout(this.stepTimerId);
            this.stepTimerId = null;
            this._setState('paused');
        }
    }


    /**
     * Resumes copycat if it is paused.
     * 
     */
    resume()
    {
        if (this.state != 'paused') {
            this.reporter.warn(`resume request ignored - Copycat is in ${this.state} state`);
        }
        else {
            this._setState('running');
            if (!this.batchMode) { this._runNextCodelet(); }
        }
    }


    /**
     * Executes a single codelet.
     * 
     */
    singleStep()
    {
        if ((this.state != 'ready') && (this.state != 'paused')) {
            this.reporter.warn(`singleStep request ignored - Copycat is in ${this.state} state`);
        }
        else {
            if (this.state != 'paused') { this._setState('paused'); }
            if (!this.batchMode) { this._runNextCodelet(); }
        }
    }


    /**
     * Resets copycat to its initial state
     * 
     */
    reset()
    {
        // Stop any further execution
        window.clearTimeout(this.stepTimerId);
        this.stepTimerId = null;

        // Reset everything 
        this.coderack.reset();
        this.slipnet.reset();
        this.temperature.reset(); 
        this.workspace.reset();

        this._setState('ready');
    }


    /**
     * Runs the next codelet and schedules a subsequent one.
     * @private
     */
    _runNextCodelet() 
    {
        if (this.batchMode) { return; }

        if (this.ui && !this.ui.workspaceUi.flasher.isIdle()) {
            this.stepTimerId = window.setTimeout( () => this._runNextCodelet(), 2*this.stepDelay );
            return;
        }

        const currentTime = this.coderack.numCodeletsRun;
        this.temperature.tryUnclamp(currentTime);

        // After every 5 codelets, we update everything, 
        if ((currentTime % 5) === 0) 
        {
            this.workspace.updateEverything();
            this.coderack.updateCodelets();
            this.slipnet.update(this.randGen, (currentTime == 245));
            this.temperature.set(this.workspace.calcTemperature());
        }

        // Run a codelet
        this.coderack.chooseAndRunCodelet();

        // Report progress
        this._notifyListeners();

        // Are we done?
        this.stepTimerId = null;
        if (!this.workspace.finalAnswer) 
        {
            if (this.state == 'running') {
                this.stepTimerId = window.setTimeout( this._runNextCodelet.bind(this), this.stepDelay ); 
            }   
        }
        else {
            this._setState('done');
        }
    }



    /**
     * Sets our state and notifys listeners.
     * @private
     * 
     */
    _setState(state)
    {
        this.state = state;
        this._notifyListeners();
    }


    /**
     * Notifies listeners of a change in state.
     * @private
     * 
     */
    _notifyListeners()
    {
        if (this.ui) { this.ui._onCopycatStateChange(); }
    }


    /** 
     * Runs the Copycat algorithm multiple times on a given input, 
     * and returns the resulting stats.
     *
     * @param {Number} maxIterations - The maximum number of times to run the solver.
     */
    async batchRun()
    {
        this.batchId++;
        const batchId = this.batchId;
        await new Promise(r => setTimeout(r, 250)); // Process ui events
        if (!this.batchMode || (batchId != this.batchId)) { return; }

        const resultsDict = {};
        let batchChunkSize = 5;

        // eslint-disable-next-line no-constant-condition
        while (this.batchCount < this.batchSize)
        {
            // Solve the problem batchCunkSize times
            for (let i = 0; i < batchChunkSize; i++)   
            {
                // Initialize everything
                this.coderack.reset();
                this.slipnet.reset();
                this.temperature.reset(); 
                this.workspace.reset();

                // Run codelets until an answer is obtained
                while (!this.workspace.finalAnswer)
                {
                    const currentTime = this.coderack.numCodeletsRun;
                    this.temperature.tryUnclamp(currentTime);
            
                    // Update evrything, after every 5 codelets
                    if ((currentTime % 5) === 0) 
                    {
                        this.workspace.updateEverything();
                        this.coderack.updateCodelets();
                        this.slipnet.update(this.randGen, (currentTime == 245));
                        this.temperature.set(this.workspace.calcTemperature());
                    }
            
                    // Run a codelet
                    this.coderack.chooseAndRunCodelet();
                }

                // Add the answer to our dictionary
                const answer = this.workspace.finalAnswer;
                const temp = this.temperature.lastUnclampedValue;
                const time = this.coderack.numCodeletsRun;
                const key = answer + ':' + this.workspace.rule?.synopsis(0) || '';           
                if ( !(key in resultsDict) ) {
                    resultsDict[key] = {'answer': answer, 'count': 0, 'sumtemp': 0, 'sumtime': 0, 'rule': this.workspace.rule?.synopsis(0) || ''}; 
                }
                resultsDict[key].count += 1;
                resultsDict[key].sumtemp += temp;
                resultsDict[key].sumtime += time;

                this.batchCount += 1;
            }

            // Display progress
            if (this.ui) { this.ui.batchmodeUi._onBatchResultsUpdated(resultsDict); }
            await new Promise(r => setTimeout(r, 250)); 
            if (!this.batchMode || (batchId != this.batchId)) { return; }

            // Are we done?
            if (this.batchCount < this.batchSize) 
            {
                while (this.state == 'paused') { 
                    await new Promise(r => setTimeout(r, 500)); 
                }
                if (!this.batchMode || (batchId != this.batchId)) { 
                    return; 
                }
                if ((this.state == 'ready') || (this.state == 'done')) {
                    break;
                } 
            }
        }

        this._setState('ready');
    }

};



})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The Correspondence class represents a connecion between an initial
 * WorkspaceObject and a target WorkspaceObject, based on a set of 
 * ConceptMappings between the Descriptions of the two objects. 
 */
 Namespace.Correspondence = class {

    /**
     * @constructor
     * @param {WorkspaceObject} objFromInitial - An object from the initial string.  
     * @param {WorkspaceObject} objFromTarget - The corresponding object in the target string.
     * @param {Array<ConceptMapping>} conceptMappings - The list of concept mappings underlying the correspondence.
     * @param {Boolean} flipTargetObject - Whether the target object should be flipped.
     */
    constructor(objFromInitial, objFromTarget, 
        conceptMappings, flipTargetObject) 
    { 
        // WorkspaceStructure members
        this.wksp = objFromInitial.wksp;
        this.string = null;
        this.totalStrength = 0;

        this.objFromInitial = objFromInitial;
        this.objFromTarget = objFromTarget;
        this.conceptMappings = conceptMappings || [];
        this.flipTargetObject = flipTargetObject;

        this.accessoryConceptMappings = []; //These are the symmetric 
        // concept-mappings (e.g.,"rightmost -> leftmost" becomes 
        // "leftmost -> rightmost in the accessory concept-mapping list. 
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        let s = this.objFromInitial.synopsis() +' <--> ' + this.objFromTarget.synopsis() + ' (';
        this.conceptMappings.forEach(cm => s += cm.synopsis(0) + ', ');
        s = s.substring(0, s.length-2) + ')';

        return !type ? s : '<Correspondence: ' + s + '>';
    }

    
    /**
     * Adds the Correspondence to its assigned objects, and to the
     * workspace. Updates the accessoryConceptMappings list, and 
     * activates the labels of all the concept mappings.
     * 
     */
    build()
    {
        this.wksp.structures.push(this);

        if (this.objFromInitial.correspondence) {
            this.objFromInitial.correspondence.break();
        }
        if (this.objFromTarget.correspondence) {
            this.objFromTarget.correspondence.break();
        }
        this.objFromInitial.correspondence = this;
        this.objFromTarget.correspondence = this;
        
        // Add mappings to the accessory-concept-mapping list, as follows:  
        // Add any bond-concept-mappings.  Also add the symmetric slippages 
        // of the bond-concept-mappings (if they are slippages) and of 
        // other relevant, distinguishing slippages.
        const relevantMappings = this.conceptMappings.filter(m => m.isDistinguishing() && m.isRelevant());
        for (let mapping of relevantMappings) {
            if (mapping.canSlip()) {
                this.accessoryConceptMappings.push(mapping.symmetricVersion());
            }
        }
        if ( (this.objFromInitial instanceof Namespace.Group) && (this.objFromTarget instanceof Namespace.Group) ) {
            const bondMappings = Namespace.ConceptMapping.getMappings(
                this.objFromInitial, this.objFromTarget, this.objFromInitial.bondDescriptions, this.objFromTarget.bondDescriptions);
                
            for (let mapping of bondMappings) {
                this.accessoryConceptMappings.push(mapping);
                if (mapping.canSlip()) {
                    this.accessoryConceptMappings.push(mapping.symmetricVersion());
                }
            }
        }

        // Activate the correspondence labels.
        this.conceptMappings.filter(m => m.label).forEach(m => m.label.activation = 100);
    }  


    /**
     * Removes the Correspondence from its assigned objects and from the
     * workspace. 
     */
    break()
    {
        this.wksp.structures = this.wksp.structures.filter(s => s !== this);
        this.objFromInitial.correspondence = null;
        this.objFromTarget.correspondence = null;
    }


    /**
     * Updates the total strength value.
     * 
     */
    updateStrength()
    {
        // Internal strength is A function of the number of concept mappings,
        // as well as their strength and how well they cohere.
        let internalStrength, externalStrength;
        const distinguishingMappings = this.conceptMappings.filter(m => m.isDistinguishing() && m.isRelevant());
        const numConceptMappings = distinguishingMappings.length;
        if (numConceptMappings < 1) {
            internalStrength = 0;
        }
        else {
            const avgStrength = distinguishingMappings.reduce((a,b) => a + b.strength(), 0) / numConceptMappings;
            const numConceptMappingsFctr = (numConceptMappings == 1) ? 0.8 : (numConceptMappings == 2) ? 1.2 : 1.6;
            const internalCoherenceFctr = this._isInternallyCoherent() ? 2.5 : 1.0;
            internalStrength = Math.min(100, avgStrength*internalCoherenceFctr*numConceptMappingsFctr);        
        }

        // External strength:
        if ((this.objFromInitial instanceof Namespace.Letter) && this.objFromInitial.spansString()) {
            externalStrength = 100;
        }
        else if ((this.objFromTarget instanceof Namespace.Letter) && this.objFromTarget.spansString()) {
            externalStrength = 100;
        }
        else {
            const wc = this.wksp.structures.filter(s => (s instanceof Namespace.Correspondence) && this._supports(s));
            const total = wc.reduce((a,b) => a + b.totalStrength, 0);
            externalStrength = Math.min(total, 100);
        }

        // Total strength:
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }


    /**
     * Indicates whether the Correspondence has the same assigned initial or
     * target object as the given one, or has any concept mappings that are  
     * incompatible with those of the given one.
     * 
     * @param {Correspondence} other - The Correspondence to compare with.
     */
    isIncompatibleWith(other)
    {
        if (!other) {
            return false;
        }
        if ((this.objFromInitial == other.objFromInitial) || (this.objFromTarget == other.objFromTarget)) {
            return true;
        }

        for (let mapping of this.conceptMappings) {
            for (let otherMapping of other.conceptMappings) {
                if (mapping.isIncompatibleWith(otherMapping)) {
                    return true;
                }
            }
        }
        return false;        
    }


    /**
     * Gets all concept mappings (including accessory concept mappings) that
     * permit slippage.
     * 
     */
    getSlippableMappings() 
    {
        const mappings = this.conceptMappings.filter(m => m.canSlip());
        mappings.push(...this.accessoryConceptMappings.filter(m => m.canSlip()));
        return mappings;
    }


    /**
     * Indicates whether the Correspondence has any concept mappings that
     * support the concept mappings in a given one.
     * 
     * @private
     */
    _supports(other)
    {
        if ( (this == other) || (this.objFromInitial == other.objFromInitial) ||
             (this.objFromTarget == other.objFromTarget) || this.isIncompatibleWith(other) ) {
                return false;
        }

        const thisDcMappings = this.conceptMappings.filter(m => m.isDistinguishing());
        const otherDcMappings = other.conceptMappings.filter(m => m.isDistinguishing());
        for (let mapping of thisDcMappings) {
            for (let otherMapping of otherDcMappings) {
                if (mapping.supports(otherMapping)) {
                    return true;
                }
            }
        }
        return false;
    }


    /**
     * Indicates Whether any pair of distinguishing mappings support 
     * each other.
     * 
     * @private
     */
    _isInternallyCoherent()
    {
        const mappings = this.conceptMappings.filter(m => m.isDistinguishing() && m.isRelevant());
        for (let i=0; i<mappings.length; i++) {
            for (let j=0; j<mappings.length; j++) {
                if (i !== j) {
                    if (mappings[i].supports(mappings[j])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This class encapsulates a description of a Letter or Group.
 * 
 * A description consists of a (descriptionType, descriptor) pair. Some examples are: 
 * <ul style="list-style: none;">
 *   <li> (objectCategory, letter) </li>
 *   <li> (letterCategory, a) </li>
 *   <li> (stringPositionCategory, leftmost) </li>
 *   <li> (groupCategory, samenessGroup) </li>
 * </ul>
 * 
 */
 Namespace.Description = class {

    /**
     * @constructor
     * 
     * @param {WorkspaceObject} obj - The object being described.
     * @param {SlipNode} descriptionType - The aspect being described, e.g., objectCategory.
     * @param {SlipNode} descriptor - The value of the aspect, e.g., letter.
     */
    constructor(obj, descriptionType, descriptor) 
    { 
        // WorkspaceStructure members
        this.wksp = obj.wksp;
        this.string = obj.string;
        this.totalStrength = 0;

        // Description members
        this.object = obj;
        this.descriptionType = descriptionType;
        this.descriptor = descriptor;
    }


    /**
     * Returns a string describing the object.
     */
    synopsis(type)
    {
        const wksp = this.wksp;
        let s = this.object.synopsis(1);

        if (this.object.string == wksp.initialWString) {
            s += ' in initial string';
        }
        else if (this.object.string == wksp.modifiedWString) {
            s += ' in modified string';
        }
        else if (this.object.string == wksp.targetWString) {
            s += ' in target string';
        }
        else  {
            s += ' in unknown string';
        }
        s += ', ' + this.descriptionType.name + ' == ' + this.descriptor.name;

        return !type ? s : '<Description: For ' + s + '>';
    }

    
    /**
     * Indicates whether this Description has the same descriptionType and
     * descriptor as another one.
     * 
     * @param {Description} other - The Description to compare with. 
     */
    sameAs(other) 
    {
        return ((other.descriptionType == this.descriptionType) && (other.descriptor == this.descriptor));
    }


    /**
     * Sets the activation of the descriptionType and descriptor to 100.
     * 
     */
    activate()
    {
        this.descriptionType.activation = 100;
        this.descriptor.activation = 100;
    }


    /**
     * Updates the total strength value.
     * 
     */
    updateStrength() 
    {
        // Internal strength
         let internalStrength = this.descriptor.depth;

        // Local support: Count the number of other objects in this 
        // object's string that are described like this one.
        let numDescribedLikeThis = 0;
        for (let other of this.string.objects.filter(o => o != this.object)) {
            if ( !this.object.isWithin(other) && !other.isWithin(this.object) ) {
                numDescribedLikeThis += other.descriptions.filter(od => od.descriptionType == this.descriptionType).length;
            }
        }
        const supportVals = [0, 20, 60, 90, 100]; 
        const localSupport = supportVals[Math.min(numDescribedLikeThis,4)];

        // External strength
        let externalStrength = (localSupport + this.descriptionType.activation)/2;

        // Total strength
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }
 

    /**
     * Activates the description and adds it to its owner's description list
     * and to the workspace.
     */
    build()
    {
        this.activate();
        if (!this.object.hasDescriptor(this.descriptor)) {
            this.object.descriptions.push(this);
        }
        if (!this.wksp.structures.includes(this)) {
            this.wksp.structures.push(this);   
        }
    }


    /**
     * Removes the Description from its owner's description list, and 
     * from the workspace structures list.
     */
    break()
    {
        this.wksp.structures = this.wksp.structures.filter(s => s !== this);
        this.object.descriptions = this.object.descriptions.filter(s => s !== this);
    }
       
 };


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A Group is a sequence of Letters or Groups in a WorkspaceString.
 * 
 */
 Namespace.Group = class extends Namespace.WorkspaceObject {

    /**
     * @constructor
     * 
     * @param {WorkspaceString} str - The string containing the grouped objects.
     * @param {SlipNode} groupCategory - The group category (successor or predecessor or sameness).
     * @param {SlipNode} dirCategory - The direction category (left or right or null).
     * @param {SlipNode} facet - The description type of the bonds in the Group. 
     * @param {Array<WorkspaceObject>} objectList - The objects in the Group. 
     * @param {Array<Bond>} bondList - The bonds in the Group.
     * 
     */
    constructor(str, groupCategory, dirCategory, facet, objectList, bondList) 
    { 
        super(str);

        // WorkspaceStructure member
        this.totalStrength = 0;

        this.groupCategory = groupCategory;
        this.directionCategory = dirCategory;
        this.facet = facet;
        this.objectList = objectList;
        this.bondList = bondList;
        this.bondCategory = this.groupCategory.getRelatedNode(this.wksp.ctx.slipnet.bondCategory);

        const leftObject = objectList[0];
        const rightObject = objectList[objectList.length-1];
        this.leftIndex = leftObject.leftIndex;
        this.leftmost = (this.leftIndex == 1);
        this.rightIndex = rightObject.rightIndex;
        this.rightmost = (this.rightIndex == this.string.length);

        this.descriptions = [];
        this.bondDescriptions = [];

        // Create and cache my descriptions
        this._addDescriptions();
    }


    /**
     * Creates and caches the descriptions of the Group.
     * @private
     */
    _addDescriptions()
    {
        const addDescription = function(group, descriptionType, descriptor) {
            group.descriptions.push( new Namespace.Description(group, descriptionType, descriptor) );
        };

        const sn = this.wksp.ctx.slipnet;
        if (this.bondList && this.bondList.length) {
            this.bondDescriptions.push( new Namespace.Description(this, sn.bondFacet, this.bondList[0].facet) );
        }
        this.bondDescriptions.push( new Namespace.Description(this, sn.bondCategory, this.bondCategory) );

        addDescription(this, sn.objectCategory, sn.group);
        addDescription(this, sn.groupCategory, this.groupCategory);

        if (!this.directionCategory) { // Occurs when groupCategory == samenessGroup 
            const letter = this.objectList[0].getDescriptor(this.facet);
            addDescription(this, this.facet, letter);
        }
        if (this.directionCategory) {
            addDescription(this, sn.directionCategory, this.directionCategory);
        }
        if (this.spansString()) {
            addDescription(this, sn.stringPositionCategory, sn.whole);
        }
        else if (this.leftmost) {
            addDescription(this, sn.stringPositionCategory, sn.leftmost);
        }
        else if (this.rightmost) {
            addDescription(this, sn.stringPositionCategory, sn.rightmost);
        }
        else if (this.isMiddleObject()) {
            addDescription(this, sn.stringPositionCategory, sn.middle);
        }
        
        // Maybe add a length description
        const ctx = this.wksp.ctx;
        const nobjs = this.objectList.length;
        if (nobjs < 6) {
            const exp = Math.pow(nobjs,3) * (100 - ctx.slipnet.length.activation) / 100;
            const val = ctx.temperature.getAdjustedProb( Math.pow(0.5, exp) );
            const prob = (val < 0.06) ? 0 : val;
            if (ctx.randGen.coinFlip(prob)) {
                addDescription(this, sn.length, sn.numbers[nobjs - 1]);
            }
        }
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        const l = this.leftIndex - 1;
        const r = this.rightIndex;
        const js = this.string.jstring.substring(l, r); 
        const s = 'group[' + l.toString() +',' + (r-1).toString() + '] == ' + js;

        return !type ? s : '<Group: ' + s + '>';
    }


    /**
     * Adds this Group to its parent string and to the workspace, 
     * and activates all its descriptions.
     * 
     */
    build()
    {
        this.wksp.objects.push(this);
        this.wksp.structures.push(this);
        this.string.objects.push(this);
        this.objectList.forEach( obj => obj.group = this );
        this.descriptions.forEach( descr => descr.build() );
    }


    /**
     * Disconnects the Group from its parent string and from the workspace,
     * and breaks all its bonds and descriptions.
     * 
     */
    break()
    {
        if (this.correspondence) {
            this.correspondence.break();
        }
        if (this.group) {
            this.group.break();
        }
        if (this.leftBond) {
            this.leftBond.break();
        }
        if (this.rightBond) {
            this.rightBond.break();
        }

        this.descriptions.slice().forEach( descr => descr.break() );
        this.objectList.forEach( obj => obj.group = null );

        this.wksp.structures = this.wksp.structures.filter(s => s !== this);
        this.wksp.objects = this.wksp.objects.filter(s => s !== this);
        this.string.objects = this.string.objects.filter(s => s !== this);
    }


    /**
     * Indicates whether this Group is the same (by value) as another one.
     * 
     * @param {Group} other - The Group to compare with. 
     */
    sameAs(other) 
    {
        if (this.leftIndex != other.leftIndex) {
            return false;
        }
        if (this.rightIndex != other.rightIndex) {
            return false;
        }
        if (this.groupCategory != other.groupCategory) {
            return false;
        }
        if (this.directionCategory != other.directionCategory) {
            return false;
        }
        if (this.facet != other.facet) {
            return false;
        }
        return true;
    }
    

    /**
     * Creates a Group like this one except that its direction,
     * and all its bond directions, are flipped
     * 
     */
    flippedVersion()
    {
        const sn = this.wksp.ctx.slipnet;
        const flippedBonds = this.bondList.map( b => b.flippedVersion() );
        const flippedGroupCat = this.groupCategory.getRelatedNode(sn.opposite);
        const flippedDirectionCat = this.directionCategory.getRelatedNode(sn.opposite);
        return new Namespace.Group(this.string, flippedGroupCat, flippedDirectionCat, this.facet, this.objectList, flippedBonds);
    }

    
    /**
     * Indicates whether the given descriptor uniquely identifies this Group
     * among all Groups in the parent string.
     * 
     * @param {SlipNode} descriptor - The descriptor to check.
     */
    isDistinguishingDescriptor(descriptor) 
    {
        let sn = this.wksp.ctx.slipnet;
        if ((descriptor == sn.letter) || (descriptor == sn.group) || sn.numbers.includes(descriptor)) {
            return false;
        }

        for (let obj of this.string.objects.filter(obj => (obj instanceof Namespace.Group) && (obj != this))) {
            if (obj.descriptions.some(d => d.descriptor == descriptor)) {
                return false;
            }
        }
        return true;
    }


    /**
     * Updates the total strength value.
     * 
     */
    updateStrength()
    {
        // Internal strength
        const sn = this.wksp.ctx.slipnet;
        const relatedBondAssociation = this.groupCategory.getRelatedNode(sn.bondCategory).degreeOfAssociation();

        const bondWeight = Math.pow(relatedBondAssociation, 0.98);
        const nobjs = this.objectList.length;
        const lengthFactor = (nobjs == 1) ? 5 : (nobjs == 2) ? 20 : (nobjs == 3) ? 60 : 90;

        const lengthWeight = 100 - bondWeight;
        let internalStrength = (relatedBondAssociation*bondWeight + lengthFactor*lengthWeight)/100;

        // External strength
        let externalStrength = this.spansString() ? 100 : this._localSupport();

        // Total strength
        const wti = internalStrength / 100;
        const wte = 1 - wti;
        this.totalStrength = wti*internalStrength + wte*externalStrength;
    }


    /**
     * Returns a measure of how much this group is supported 
     * by other similar Groups in the parent string.
     * 
     * @private
     */
    _localSupport()
    {
        const numSupporters = this._numberOfLocalSupportingGroups();
        if (numSupporters === 0) { return 0; }

        const supportFactor = Math.min(1, Math.pow(0.6, 1/Math.pow(numSupporters,3)) );
        const localDensity = numSupporters/(0.5*this.string.length);
        const densityFactor = 100 * Math.sqrt(localDensity);
        return densityFactor * supportFactor;
    }


    /**
     * Gets the number of groups in the parent string that are outside
     * this group but have the same category and direction as this group.
     *
     * @private 
     */
    _numberOfLocalSupportingGroups()
    {
        return this.string.objects.filter(obj => 
            (obj.groupCategory == this.groupCategory) && (obj.directionCategory == this.directionCategory) &&
            (obj instanceof Namespace.Group) && this.isOutsideOf(obj)).length;
    }

};



})( window.CopycatJS = window.CopycatJS || {} );







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







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * This class provides methods for generating random values 
 * and making random selections.
 * 
 */
 Namespace.RandGen = class {

    /**
     * @constructor
     * @param {Number|String} [seed=Date.now] - A seed for initializing
     *  the randomness generator.
     */
    constructor(seed) 
    { 
        // Initialize
        const strSeed = ((typeof(seed) !== "undefined") && (seed !== null)) ? 
            seed.toString() : Date.now().toString();

        const cyrSeed = Namespace.RandGen._get_seed_cyrb128(strSeed);
        this.rng = Namespace.RandGen._sfc32(...cyrSeed);
    }


    /**
     * Returns a random number in the range [0,1), sampled from 
     * a uniform distribution.
     * 
     * @returns A number in the range [0,1).
     */
    rand()
    {
        return this.rng();
    }


    /**
     * Returns true or false, with probabilities p and 1-p, respectively.
     * 
     * @param {Number} p - The probability of a 'true' result.
     * @returns true or false.
     */
    coinFlip(p = 0.5)
    {
        return this.rng() < p;
    }


    /**
     * Returns a random element from a given sequence.
     * 
     * @param {Indexable} seq - The sequence to select from.
     * @returns A random element from seq.
     */
    choice(seq)
    {
        const idx = Math.floor(this.rng()*seq.length);
        return seq[idx];
    }


    /**
     * Returns a random element from the given sequence, 
     * with weighted probabilities.
     * 
     * @param {Indexable} seq - The sequence to select from.
     * @param {Array<Number>} weights - The relative weights.
     * @returns A random element from seq.
     */
    weightedChoice(seq, weights)
    {
        if (!seq || !seq.length) {
            return null; // (Apparently, many callers rely on this behavior)
        }

        const N = seq.length;
        if ( N !== weights.length ){
            throw new Error("Incompatible array lengths, in RandGen.weightedChoice");
        }

        let csum = 0;
        const cumWeights = weights.map((csum = 0, n => csum += n));
        const r = this.rng() * cumWeights[N-1];
        let idx = N-1;
        for (let i=0; i<N; i++){
            if (r < cumWeights[i]) {
                idx = i;
                break;
            }
        }
        return seq[idx];
    }


    /**
     * Returns true or false, with probabilities a/(a+b) and 
     *   b/(a+b), respectively.
     * 
     * @param {Number} a - First number.
     * @param {Number} b - Second number.
     * @returns true or false.
     */
    weightedGreaterThan(a, b)
    {
        const sum = a + b;
        return (sum === 0) ? false : this.coinFlip(a/sum);
    }


    /**
     * Returns val +/- sqrt(val), where the sign is obtained randomly.
     * 
     * @param {Number} val - The value to process.
     * @returns val +/- sqrt(val).
     */
    sqrtBlur(val)
    {
        const sign = this.coinFlip() ? 1 : -1;
        return val + sign*Math.sqrt(val);
    }


    /**
     * This version of sqrtBlur matches the original lisp code,
     * and differs somewhat from the java & python versions.
     * We use the latter, but it doesn't seem to make much difference
     * in practice.
     * @private
     * 
     */
    _sqrtBlur2(val)
    {
        const blurAmount = Math.round(Math.sqrt(val));
        const sign = this.coinFlip() ? 1 : -1;
        return val + sign * this.rand() * (1 + blurAmount);
    }


    /**
     * Creates a 4-component seed for _sfc32, given an input seed.
     *   Reference: https://stackoverflow.com/questions/521295/
     * @private
     * 
     * @param {String} inSeed - The input seed.
     * @return {Array} A 4-component integer seed.
     */
    static _get_seed_cyrb128(inSeed) {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < inSeed.length; i++) {
            k = inSeed.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
    }


    /**
     * Returns a function that generates random numbers, seeded 
     *  with the given 4-component seed. 
     *  Reference: https://stackoverflow.com/questions/521295/
     * @private
     * 
     * @param {Number} a - 1st seed component.
     * @param {Number} b - 2nd seed component.
     * @param {Number} c - 3rd seed component.
     * @param {Number} d - 4th seed component.
     * @return {Function} A function that produces random numbers in 
     *   the range [0,1).
     */
    static _sfc32(a, b, c, d) {
        return function() {
          a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
          let t = (a + b) | 0;
          a = b ^ b >>> 9;
          b = c + (c << 3) | 0;
          c = (c << 21 | c >>> 11);
          d = d + 1 | 0;
          t = t + d | 0;
          c = c + t | 0;
          return (t >>> 0) / 4294967296;
        };
    }
};

})( window.CopycatJS = window.CopycatJS || {} );







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







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * A Rule describes a change from the initial to the modified string.
 * For example, "Replace the rightmost letter by its successor."
 * 
 */
 Namespace.Rule = class  {

    /**
     * @constructor
     * 
     * @param {Workspace} wksp - The Wokspace that will contain the Rule.
     * @param {SlipNode} facet - The descriptionType of the facet to be replaced. (e.g., letterCategory) 
     * @param {SlipNode} descriptor - The descriptor of the facet to be replaced. (e.g., rightmost)
     * @param {SlipNode} category - The category of the facet to be replaced. (e.g., letter)
     * @param {SlipNode} relation - The relation to be applied. (e.g., successor)
     */
    constructor(wksp, facet, descriptor, category, relation) 
    { 
        // WorkspaceStructure members
        this.wksp = wksp;
        this.string = null;        
        this.totalStrength = 0;

        this.facet = facet || null;
        this.descriptor = descriptor || null;
        this.category = category || null;
        this.relation = relation || null;
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        const s = !this.facet ? 'No change' : 'Replace ' + this.facet.name + 
            ' of ' + this.descriptor.name + ' ' + this.category.name + 
            ' by ' + this.relation.name;

        return !type ? s : '<Rule: ' + s + '>';
    }


    /**
     * Adds the Rule to the workspace, replacing any pre-existing one.
     * 
     */
    build()
    {
        const wksp = this.wksp;
        if (wksp.rule) { wksp.structures = wksp.structures.filter(s => s !== wksp.rule); }
        wksp.rule = this;
        wksp.structures.push(this);
        this.activate();
    }  


    /**
     * Removes the Rule from the workspace.
     * 
     */
    break()
    {
        const wksp = this.wksp;
        if (wksp.rule) {
            wksp.structures = wksp.structures.filter(s => s !== wksp.rule);
            wksp.rule = null;
        }
    }
    
    
    /**
     * Sets the activation buffer of all the Rule's nodes to 100.
     * 
     */
    activate()
    {
        if (this.relation) {
            this.relation.activation = 100;
        }
        if (this.facet) {
            this.facet.activation = 100;
        }
        if (this.category) {
            this.category.activation = 100;
        }
        if (this.descriptor) {
            this.descriptor.activation = 100;
        }       
    }


    /**
     * Indicates whether this Rule is the same (by value) as another one.
     * 
     * @param {Rule} other - The Rule to compare with. 
     */
    sameAs(other) 
    {
        if (!other) {
            return false;
        }
        return ( 
            (this.relation == other.relation) && (this.facet == other.facet) && 
            (this.category == other.category) && (this.descriptor == other.descriptor)
        );
    }
    

    /**
     * Returns a measure of the weakness of this Rule.
     * 
     */
    totalWeakness()
    {
        return 100 - Math.pow(this.totalStrength, 0.95);
    }
    
    
    /**
     * Updates the total strength value.
     * 
     */
    updateStrength()
    {
        // Internal strength
        let internalStrength = 0;
        if (!this.descriptor || !this.relation) {
            internalStrength = 50;
        }
        else
        {
            let avgDepth = Math.pow((this.descriptor.depth + this.relation.depth)/2, 1.1);

            let carryOn = true;
            let sharedDescriptorTerm = 0;
            const changedObjects = this.wksp.initialWString.objects.filter(o => o.changed);            
            if (changedObjects.length > 0) {
                const changedObj = changedObjects[0];
                if (changedObj && changedObj.correspondence) {
                    sharedDescriptorTerm = 100;
                    const slipnode = this.descriptor.applySlippages( this.wksp.getSlippableMappings() );
                    if (!changedObj.correspondence.objFromTarget.hasDescriptor(slipnode)) {
                        internalStrength = 0;
                        carryOn = false;
                    }
                }
            }
            if (carryOn) 
            {
                const conceptualHeight = (100 - this.descriptor.depth) / 10;
                const sharedDescriptorWeight = Math.pow(conceptualHeight, 1.4); 
                const depthDifference = 100 - Math.abs(this.descriptor.depth - this.relation.depth);
                const wtSum = 12 + 18 + sharedDescriptorWeight;
                internalStrength = (12*depthDifference + 18*avgDepth + sharedDescriptorWeight*sharedDescriptorTerm)/wtSum;
                internalStrength = Math.min(100, internalStrength);
            }
        }

        // Total strength 
        this.totalStrength = internalStrength;  // (External strength for a Rule is zero)
    }


    /**
     * Applies the Rule to the target string and returns the result.
     * 
     */
    applyRuleToTarget()
    {
        const wksp = this.wksp;
        if (!this.descriptor || !this.relation) {
            return wksp.targetWString.jstring;
        }

        const slippages = wksp.getSlippableMappings();
        this.category = this.category.applySlippages(slippages);
        this.facet = this.facet.applySlippages(slippages);
        this.descriptor = this.descriptor.applySlippages(slippages);
        this.relation = this.relation.applySlippages(slippages);
        
        // Generate the final string
        const changeds = wksp.targetWString.objects.filter(o => o.hasDescriptor(this.descriptor) && o.hasDescriptor(this.category));
        if (changeds.length === 0) {
            return wksp.targetWString.jstring;
        }
        else if (changeds.length > 1) {
            this.wksp.ctx.reporter.warn("Rule: More than one letter changed. Copycat can't solve problems like this right now.");
            return null;
        }
        else {
            const changed = changeds[0];
            const left = changed.leftIndex - 1;
            const right = changed.rightIndex;
            const ts = wksp.targetWString.jstring;
            const changedMiddle = this._changeSubString(ts.substring(left,right));
            if (changedMiddle === null) {
                return null;
            } else {
                return ts.substring(0,left) + changedMiddle + ts.substring(right);
            }
        }
    }


    /**
     * Applies the Rule's text tranformation to the part of the
     * target string that needs to change.
     * 
     * @private
     */
    _changeSubString(jString)
    {
        const sn = this.wksp.ctx.slipnet;
        
        if (this.facet == sn.length) {
            if (this.relation == sn.predecessor) {
                return jString.substring(0, jString.length-1);
            }
            else if (this.relation == sn.successor) {
                return jString + jString[0];
            }
            else {
                return jString;
            }
        }
        // Apply character changes
        if (this.relation == sn.predecessor) {
            if (jString.includes('a')) {
                return null;
            }
            else {
                const newChars = jString.split('').map( c => String.fromCharCode(c.charCodeAt(0) - 1) ); 
                return newChars.join('');
            }
        }
        else if (this.relation == sn.successor) {
            if (jString.includes('z')) {
                return null;
            }
            else {
                const newChars = jString.split('').map( c => String.fromCharCode(c.charCodeAt(0) + 1) ); 
                return newChars.join('');
            }
        }
        else {
            return this.relation.name.toLowerCase();
        }
    }
};



})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The SlipLink class represents a relation between two concepts. 
 * 
 */
 Namespace.SlipLink = class {

    /**
     * @constructor
     * 
     * @param {String} type - The link type ('category', 'property', 'instance', 'lateralSlip', or 'lateralNonSlip').
     * @param {SlipNode} source - The source node.
     * @param {SlipNode} destination - The destination node.
     * @param {SlipNode} [label=null] - A SlipNode that labels the link.
     * @param {Number} [length=0] - The "conceptual distance" between the source and destination nodes. Slippage 
     *   occurs more easily when this distance is smaller.
     */
    constructor(type, source, destination, label=null, length=0) 
    { 
        this.type = type;
        this.source = source;
        this.destination = destination;
        this.label = label;
        this.fixedLength = length;

        // Add this link to the source and destination nodes.
        source.outgoingLinks.push(this);
        destination.incomingLinks.push(this);            

        Object.freeze(this);
    }


    /**
     * Returns a string describing the object.
     * 
     */
    synopsis(type)
    {
        const s = `${this.source.synopsis(1)} to ` + 
          `${this.destination.synopsis(1)} (length=` + 
          `${this.fixedLength.toFixed(0)}` + 
          (this.label ? `, label=${this.label.name}` : '') + ')';

        return !type ? s : '<SlipLink: ' + s + '>';
    }
    
    
    /**
     * Returns a measure of the shortness of this link, or
     *  of its label if it has one.
     * 
     */
    degreeOfAssociation()
    {
        if ((this.fixedLength > 0) || !this.label) {
            return 100 - this.fixedLength;
        } 
        else { 
            return this.label.degreeOfAssociation();
        }
    }


    /**
     * Returns a measure of the shortness of this link, or
     *  of its label's intrinsic shortness if it has a label.
     * 
     */
    intrinsicDegreeOfAssociation()
    {
        if (this.fixedLength !== 0) {
            return 100 - this.fixedLength;
        }
        else if (this.label) {
            return 100 - this.label.intrinsicLinkLength;
        }
        else {
            return 0;
        }
    }


};

})( window.CopycatJS = window.CopycatJS || {} );







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

        // Once the Slipnet is constructed, only the following are mutable:
        this._mutables = {activation: 0, activationBuffer: 0, clampedHigh: false};

        Object.freeze(this);
    }


    /**
     * Freezes the class members that are meant to be immutable
     *
     */
    freezeConstants()
    {
        [this.incomingLinks, this.outgoingLinks, this.codelets].forEach( x => Object.freeze(x) );
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
        return this.outgoingLinks.filter(link => link.type == 'category'); 
    }


    /**
     * Returns the node's outgoing instance links.
     */
    get instanceLinks() 
    { 
        return this.outgoingLinks.filter(link => link.type == 'instance'); 
    }


    /**
     * Returns the node's outgoing property links.
     */
    get propertyLinks() 
    { 
        return this.outgoingLinks.filter(link => link.type == 'property'); 
    }


    /**
     * Returns the node's outgoing lateral slip links.
     */
    get lateralSlipLinks() 
    { 
        return this.outgoingLinks.filter(link => link.type == 'lateralSlip'); 
    }


    /** 
     * Returns the node's outgoing lateral non-slip links.
     */
    get lateralNonSlipLinks() 
    { 
        return this.outgoingLinks.filter(link => link.type == 'lateralNonSlip'); 
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
        this._mutables.activationBuffer -= this._mutables.activation * (1 - this.depth/100);
    }

    
    /**
     * If this node is fully active, increases the activation of 
     * it's downstream nodes. Otherwise, does nothing.
     * 
     */
    spreadActivation()
    {
        if (this.isFullyActive()) {
            this.outgoingLinks.forEach( link => 
                link.destination._mutables.activationBuffer += link.intrinsicDegreeOfAssociation() );
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
            this._mutables.activation = Math.min(100, Math.max(0, this._mutables.activation + this._mutables.activationBuffer));

            // Maybe jump to full activation.
            if ((this._mutables.activation > 55) && (this._mutables.activation != 100)) {
                const jumpProb = Math.pow(this._mutables.activation/100, 3);
                if ( randGen.coinFlip(jumpProb) ) { this._mutables.activation = 100; }
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
        return (this.categoryLinks.length > 0) ? this.categoryLinks[0].destination : null;
    }


    /**
     * Returns a measure of the shortness of links that are 
     * labeled by this node.
     * 
     */
    degreeOfAssociation()
    {
        const linkLength = this.isFullyActive() ? this.shrunkLinkLength : this.intrinsicLinkLength;
        return 100 - linkLength;
    }

    
    /**
     * Returns the degree of association that bonds of this  
     * node's category are considered to have.
     * 
     */
    bondDegreeOfAssociation()
    {
        const result = Math.min(100, 11.0 * Math.sqrt(this.degreeOfAssociation()) );
        
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
        return (this == other) || this.outgoingLinks.some(link => link.destination == other);
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







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The Temperature class keeps track of the workspace temperature.
 * 
 */
 Namespace.Temperature = class {

    /**
     * @constructor
     * 
     */
    constructor() 
    { 
        this.reset();
    }


    /**
     * Resets the temperature to 100 and clamps it until time = 30.
     * 
     */
    reset()
    {
        this.actualValue = 100;
        this.lastUnclampedValue = 100;
        this.clamped = true;
        this.clampTime = 30;
    }


    /**
     * Returns the current temperature value. 
     * 
     */   
    value() {
        return this.clamped ? 100 : this.actualValue;
    }


    /**
     * Sets the temperature to the given value, unless we
     * are currently clamped, in which case the value is cached.
     * 
     * @param {Number} value - The value to set. 
     */
    set(value) 
    {
        this.lastUnclampedValue = value;
        this.actualValue = this.clamped ? 100 : value;
    }


    /**
     * Clamps the temperature until the given time.
     * 
     * @param {Number} when - The time to unclamp. 
     */
    clampUntil(when)
    {
        this.clamped = true;
        this.clampTime = when;
    }


    /**
     * Unclamps the temperature if the given time is greater than
     * the clamping time.
     * 
     * @param {Number} currentTime - The current time.
     */

    tryUnclamp(currentTime) {
        if (this.clamped && (currentTime >= this.clampTime)) {
            this.clamped = false;
        }
    }


    /**
     * Adjusts the given value according to the current temperature.
     * (The value is raised to a power that decreases with temperature.)
     * 
     * @param {Number} input - The value to adjust.
     */
    getAdjustedValue(input)
    {
        const exp = (100 - this.value())/30 + 0.5;
        return Math.pow(input, exp);
    }


    /**
     * Ajusts the given probability value based on the current temperature.
     * If the temperature is 0, no adjustment is made. Otherwise, values 
     * above .5 are lowered and values below .5 are raised.
     * 
     * @param {Number} inProb - The probability to adjust. 
     */
    getAdjustedProb(inProb)
    {
        if (inProb === 0) { return 0; }
        if (inProb === 0.5) { return 0.5; }

        const temp = this.value();
        if (inProb < 0.5) {
            return 1 - this.getAdjustedProb(1 - inProb);
        }
        else {
            return Math.max(0.5, inProb*(1 - (10 - Math.sqrt(100 - temp))/100) );
        }
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";


/**
 * @classdesc
 * The Workspace is where Copycat builds its perceptual structures.
 * 
 */
 Namespace.Workspace = class {

    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     * @param {String} [initialString] - The 'A' in A:B -> C:D
     * @param {String} [modifiedString] - The 'B' in A:B -> C:D
     * @param {String} [targetString] - The 'C' in A:B -> C:D
     */
    constructor(ctx, initialString='abc', modifiedString='abd', targetString='pqr') 
    { 
        this.ctx = ctx;
        this.objects = [];
        this.structures = [];
        this.changedObject = null;
        this.rule = null;
        this.intraStringUnhappiness = 0;
        this.interStringUnhappiness = 0;

        this.initialWString  = new Namespace.WorkspaceString(this, initialString?.toLowerCase() || '');
        this.modifiedWString = new Namespace.WorkspaceString(this, modifiedString?.toLowerCase() || '');
        this.targetWString   = new Namespace.WorkspaceString(this, targetString?.toLowerCase() || '');
        this.finalAnswer     = null; // A javascript string
    }


    /**
     * Returns a string describing the object.
     */
    synopsis()
    {
        return '<Workspace: ' + this.initialWString.jstring + ':' + 
            this.modifiedWString.jstring + ' :: ' + this.targetWString.jstring  + ':?>';
    }


    /**
     * Resets the workspace to its initial state, optionally modifying the 
     * input strings.
     * 
     * @param {String} [initialString] - The 'A' in A:B -> C:D
     * @param {String} [modifiedString] - The 'B' in A:B -> C:D
     * @param {String} [targetString] - The 'C' in A:B -> C:D
     * 
     */
    reset(initialString=null, modifiedString=null, targetString=null)
    {
        // Clear the workspace
        this.finalAnswer = null;
        this.changedObject = null;
        this.objects = [];
        this.structures = [];
        this.rule = null;
        this.intraStringUnhappiness = 0;
        this.interStringUnhappiness = 0;
        
        // Create or reset the WorkspaceStrings
        this.initialWString  = new Namespace.WorkspaceString(this, initialString?.toLowerCase() || this.initialWString.jstring);
        this.modifiedWString = new Namespace.WorkspaceString(this, modifiedString?.toLowerCase() || this.modifiedWString.jstring);
        this.targetWString   = new Namespace.WorkspaceString(this, targetString?.toLowerCase() || this.targetWString.jstring);
    }


    /**
     * Updates the structure strengths, and the happiness, importance,
     * and salience of all objects and strings in the workspace.
     * 
     */
    updateEverything()
    {
        // Update structures
        for (let structure of this.structures) {
            structure.updateStrength();
        }

        // Update objects
        for (let obj of this.objects) {
            obj.updateValues();
        }

        // Update strings
        this.initialWString.updateRelativeImportances();
        this.targetWString.updateRelativeImportances();
        this.initialWString.updateIntraStringUnhappiness();
        this.targetWString.updateIntraStringUnhappiness();
    }


    /**
     * Updates the string unhappiness values and then uses them to 
     * calculate the current workspace temperature.
     * 
     */
    calcTemperature()
    {
        // First, update my happiness values
        this.intraStringUnhappiness = 
            Math.min(100, 0.5 * this.objects.map(o => o.relativeImportance * o.intraStringUnhappiness).reduce((a,b) => a+b, 0));
            
        this.interStringUnhappiness = 
            Math.min(100, 0.5 * this.objects.map(o => o.relativeImportance * o.interStringUnhappiness).reduce((a,b) => a+b, 0));
                
        const totalUnhappiness = 
            Math.min(100, 0.5 * this.objects.map(o => o.relativeImportance * o.totalUnhappiness).reduce((a,b) => a+b, 0));

        // Now, calculate the temperature
        let ruleWeakness = 100;
        if (this.rule) {
            this.rule.updateStrength();
            ruleWeakness = 100 - this.rule.totalStrength;
        }
        const temperature = 0.8*totalUnhappiness + 0.2*ruleWeakness;
        return temperature;
    }


    /**
     * Gets all the concept mappings in the workspace that permit slippage.
     * 
     */
    getSlippableMappings()
    {
        const result = [];
        if (this.changedObject && this.changedObject.correspondence) {
            result.push(...this.changedObject.correspondence.conceptMappings);
        }

        const corresps = this.initialWString.objects.filter(o => o.correspondence).map(o => o.correspondence);
        corresps.forEach( 
            corresp => result.push(...corresp.getSlippableMappings().filter(m => !m.isNearlyContainedIn(result))) 
        );

        return result;
    }

 };


})( window.CopycatJS = window.CopycatJS || {} );







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







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tries to build a proposed bond, fighting with any
 * incompatible structures if necessary.
 * 
 */
 Namespace.Codelets.BondBuilder = class extends Namespace.Codelets.CodeletBase
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
        super('bond-builder', ctx, urgency, birthdate);
        this.bond = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const bond = this.bond;
        bond.updateStrength();

        // Fizzle if the bond's objects are gone
        const wobjs = ctx.workspace.objects;
        if (!wobjs.includes(bond.source) || !wobjs.includes(bond.destination)) {
            return;
        }

        // Fizzle if the bond already exists
        if (bond.string.bonds.some(sbond => this._sameNeighbors(bond, sbond) && this._sameCategories(bond, sbond))) {
            bond.category.activation = 100;
            if (bond.directionCategory) { bond.directionCategory.activation = 100; }
            return;
        }

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            ctx.ui.workspaceUi.getStringGraphic(bond.string).bondsGraphic.flashProposed(bond);
        }

        // Fight it out with any incompatible bonds
        const Utils = Namespace.Codelets.CodeletUtils;
        const incompatibleBonds = bond.string.bonds.filter(b => this._sameNeighbors(bond,b));
        if (!Utils.fightItOut(bond, incompatibleBonds, 1.0, 1.0)) {
            return;
        }

        // Fight it out with any incompatible groups
        const incompatibleGroups = bond.source.getCommonGroups(bond.destination);
        if (!Utils.fightItOut(bond, incompatibleGroups, 1.0, 1.0)) {
            return;
        }

        // Fight it out with any incompatible correspondences
        const incompatibleCorrespondences = [];
        if (bond.leftObject.leftmost || bond.rightObject.rightmost) {
            if (bond.directionCategory) {
                const incompatibleCorrespondences = this._getIncompatibleCorrespondences(bond);
                if (incompatibleCorrespondences.length > 0) {
                    if (!Utils.fightItOut(bond, incompatibleCorrespondences, 2.0, 3.0)) {
                        return;
                    }
                }
            }
        }

        // We won! Destroy the incompatibles and build our bond.
        incompatibleBonds.forEach(x => x.break());
        incompatibleGroups.forEach(x => x.break());
        incompatibleCorrespondences.forEach(x => x.break());

        bond.build();
    }


    /**
     * Checks whether two bonds have the same neighbors.
     * @private
     * 
     */
    _sameNeighbors(bond1, bond2) 
    {
        return (bond1.leftObject == bond2.leftObject) && (bond1.rightObject == bond2.rightObject);
    }


    /**
     * Checks whether two bonds have the same categories.
     * @private
     * 
     */
    _sameCategories(bond1, bond2) 
    {
        return (bond1.category == bond2.category) && (bond1.directionCategory == bond2.directionCategory);
    }


    /**
     * Returns a list of correspondences that are incompatible with a given bond.
     * @private
     */
    _getIncompatibleCorrespondences(bond)
    {
        const incompatibles = [];
        if (bond.leftObject.leftmost && bond.leftObject.correspondence) 
        {
            const obj = (bond.string == bond.wksp.initialWString) ?
                bond.leftObject.correspondence.objFromTarget : bond.leftObject.correspondence.objFromInitial;

            if (obj.leftmost && obj.rightBond && obj.rightBond.directionCategory) {
                if (obj.rightBond.directionCategory != bond.directionCategory) {
                    incompatibles.push(bond.leftObject.correspondence);
                }
            }
        }
        if (bond.rightObject.rightmost && bond.rightObject.correspondence)
        {
            const obj = (bond.string == bond.wksp.initialWString) ?
                bond.rightObject.correspondence.objFromTarget : bond.rightObject.correspondence.objFromInitial;
                
            if (obj.rightmost && obj.leftBond && obj.leftBond.directionCategory) {
                if (obj.leftBond.directionCategory != bond.directionCategory) {
                    incompatibles.push(bond.rightObject.correspondence);
                }
            }
        }
        return incompatibles;
    }


};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tests the strength of a bond, and if it's strong enough,
 * may post a BondBuilder codelet.
 * 
 */
 Namespace.Codelets.BondStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('bond-strength-tester', ctx, urgency, birthdate);
        this.bond = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const coderack = ctx.coderack;
        const bond = this.bond;

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            ctx.ui.workspaceUi.getStringGraphic(bond.string).bondsGraphic.flashProposed(bond);
        }

        // Maybe fizzle, if the strength is too low
        bond.updateStrength();
        const strength = bond.totalStrength;
        const prob = ctx.temperature.getAdjustedProb(strength/100);
        if ( !ctx.randGen.coinFlip(prob) ) {
            return; 
        }

        // Post a BondBuilder codelet
        bond.facet.activation = 100;
        bond.sourceDescriptor.activation = 100;
        bond.destDescriptor.activation = 100;
        const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
        const newCodelet = ctx.coderack.factory.create('bond-builder', urgency, [bond]);
        coderack.post(newCodelet);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};
    const CodeletUtils = Namespace.Codelets.CodeletUtils;

/**
 * @classdesc
 * This codelet looks for potential bonds between 
 * neighboring object pairs in the initial or target string.
 * 
 */
 Namespace.Codelets.BottomUpBondScout = class extends Namespace.Codelets.CodeletBase
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
        super('bottom-up-bond-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;

        // Choose a workspace object at random, based on intra-string salience.
        const bondSource = CodeletUtils.chooseUnmodifiedObject(ctx, 'intraStringSalience', ctx.workspace.objects);
        if (!bondSource) { return; }

        // Choose a neighboring object
        const bondDest = CodeletUtils.chooseNeighbor(ctx, bondSource);
        if (!bondDest) { return; }

        // Provide UI feedback.
        if (ctx.ui && !ctx.batchMode) {
            const dummyBond = new Namespace.Bond(bondSource, bondDest, sn.sameness, sn.letterCategory, sn.letters[0], sn.letters[0]);
            ctx.ui.workspaceUi.getStringGraphic(dummyBond.string).bondsGraphic.flashGrope(dummyBond);
        }

        // Choose a bond facet
        const bondFacet = CodeletUtils.chooseBondFacet(ctx, bondSource, bondDest);
        if (!bondFacet) { return; }
        
        // Get the bond category
        const sourceDescriptor = bondSource.getDescriptor(bondFacet);
        const destDescriptor = bondDest.getDescriptor(bondFacet);
        let bondCategory = sourceDescriptor.getBondCategory(destDescriptor);
        if (!bondCategory) {
            return;
        }
        if (bondCategory == ctx.slipnet.identity) { 
            bondCategory = ctx.slipnet.sameness; 
        }

        // Propose the bond
        ctx.coderack.proposeBond(bondSource, bondDest, bondCategory, bondFacet, sourceDescriptor, destDescriptor);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet looks for potential correspondences between 
 * objects in the initial and target strings.
 * 
 */
 Namespace.Codelets.BottomUpCorrespondenceScout = class extends Namespace.Codelets.CodeletBase
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
        super('bottom-up-correspondence-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const sn = ctx.slipnet;
        const Utils = Namespace.Codelets.CodeletUtils;

        // Choose an object from the initial string, based on salience.
        const objFromInitial = Utils.chooseUnmodifiedObject(ctx, 'interStringSalience', wksp.initialWString.objects);
        if (!objFromInitial) { return; }

        // Choose an object from the target string, based on salience.
        let objFromTarget = Utils.chooseUnmodifiedObject(ctx, 'interStringSalience', wksp.targetWString.objects);
        if (!objFromTarget) { return; }

        // Check that the initial and target objects are compatible.
        if (objFromInitial.spansString() != objFromTarget.spansString()) { return; }

        // Provide UI feedback.
        if (ctx.ui && !ctx.batchMode) {
            const dummyCorresp = new Namespace.Correspondence(objFromInitial, objFromTarget, [], false);
            ctx.ui.workspaceUi.corrsGraphic.flashGrope(dummyCorresp);
        }

        // Get concept mappings between the two objects.
        let conceptMappings = Namespace.ConceptMapping.getMappings(objFromInitial, objFromTarget,
            objFromInitial.relevantDescriptions(), objFromTarget.relevantDescriptions());
        if (!conceptMappings.length) { return; }

        // Check for slippability
        const slippageProbs = conceptMappings.map(m => ctx.temperature.getAdjustedProb( m.slippability()/100 ));
        const slippable = slippageProbs.some(p => ctx.randGen.coinFlip(p));
        if (!slippable) { return; }

        // Get any distinguishing mappings
        const distinguishingMappings = conceptMappings.filter( m => m.isDistinguishing() );
        if (!distinguishingMappings.length) { return; }
        
        // If both objects span the strings, then check to see if the string description needs to be flipped.
        let flipTargetObject = false;
        if (objFromInitial.spansString() && objFromTarget.spansString() && (sn.opposite.activation != 100)) 
        {
            const opposites = distinguishingMappings.filter(m => 
                (m.initialDescType == sn.stringPositionCategory) && (m.initialDescType != sn.bondFacet));

            if (opposites.every(m => m.label == sn.opposite)) {
                const initialDescTypes = opposites.map(m => m.initialDescType);
                if (initialDescTypes.includes(sn.directionCategory)) {
                    objFromTarget = objFromTarget.flippedVersion();
                    conceptMappings = Namespace.ConceptMapping.getMappings(objFromInitial, objFromTarget,
                        objFromInitial.relevantDescriptions(), objFromTarget.relevantDescriptions());
                    flipTargetObject = true;
                }
            }
        }
        
        // Propose a correspondence.
        ctx.coderack.proposeCorrespondence(objFromInitial, objFromTarget, conceptMappings, flipTargetObject);
    }


};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * 
 * Thic codelet seeks an appropriate Description for a randomly
 * selected workspace object.
 */
 Namespace.Codelets.BottomUpDescriptionScout = class extends Namespace.Codelets.CodeletBase
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
        super('bottom-up-description-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const Utils = Namespace.Codelets.CodeletUtils;

        // Choose a workspace object, based on salience.
        const chosenObject = Utils.chooseUnmodifiedObject(ctx, 'totalSalience', ctx.workspace.objects);
        if (!chosenObject) { return; }

        // Choose a relevant description by activation
        const descriptions = chosenObject.relevantDescriptions();
        const description = ctx.randGen.weightedChoice(descriptions, descriptions.map(d => d.activation));
        if (!description) { return; }

        // Choose one of the description's property links
        const propertyLinks = this._shortPropertyLinks(ctx, description.descriptor);
        if (!propertyLinks.length) { return; }
        
        const sWeights = propertyLinks.map(s => s.degreeOfAssociation() * s.destination.activation);
        const chosen = ctx.randGen.weightedChoice(propertyLinks, sWeights);
        const chosenProperty = chosen.destination;

        // Propose the description
        ctx.coderack.proposeDescription(chosenObject, chosenProperty.category(), chosenProperty);
    }



    /**
     * Returns a random subset a descriptor's property links, preferring
     * links that are short. 
     * @private
     * 
     */
    _shortPropertyLinks(ctx, descriptor)
    {
        const result = [];
        for (let propertyLink of descriptor.propertyLinks)  
        {
            const association = propertyLink.degreeOfAssociation() / 100;
            const prob = ctx.temperature.getAdjustedProb(association);
            if (ctx.randGen.coinFlip(prob)) { result.push(propertyLink); }
        }
        return result;
    }   

};

})( window.CopycatJS = window.CopycatJS || {} );







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
     * @param {Array} args - Arguments to pass to the codelet. (Empty for this codelet.)
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
        const structures = this.ctx.workspace.structures.filter(s => 
            (s instanceof Namespace.Group) || (s instanceof Namespace.Bond) || (s instanceof Namespace.Correspondence));
        if (!structures.length) { return; }

        const structure = randGen.choice(structures);
        const breakObjects = [structure];
        if (structure instanceof Namespace.Bond) {
            if (structure.source.group && (structure.source.group == structure.destination.group)) {
                breakObjects.push(structure.source.group);
            }
        }

        // Break the bond(s)
        for (let structure of breakObjects) {
            const breakProb = temperature.getAdjustedProb(structure.totalStrength/100);
            if (randGen.coinFlip(breakProb)) { return; }
        }
        breakObjects.forEach( (structure) => structure.break() );
    }
};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This class provides a factory method for creating codelets.
 * 
 */
 Namespace.Codelets.CodeletFactory = class
 {
    /**
     * @constructor
     * 
     * @param {Copycat} ctx - The Copycat instance.
     */
    constructor(ctx) 
    { 
        this.ctx = ctx;
    }


    /**
     * Creates a codelet given its name and constructor arguments.
     * 
     * @param {string} name - The name of the codelet.
     * @param {Number} urgency - The urgency of the codelet.
     * @param {Array} codeletArgs - Arguments to pass to the codelet.
     * @param {Number} birthdate - The birthdate of the codelet.
     * 
     */
    create(name, urgency, codeletArgs, birthdate)
    {
        if (!birthdate && birthdate !== 0) {
            birthdate = this.ctx.coderack.numCodeletsRun;
        }

        const NS = Namespace.Codelets;
        const ctorArgs = [this.ctx, urgency, codeletArgs, birthdate];

        let result = null;
        switch (name) 
        {
            case 'bond-builder':
                result = new NS.BondBuilder(...ctorArgs);
                break;

            case 'bond-strength-tester':
                result = new NS.BondStrengthTester(...ctorArgs);
                break;

            case 'bottom-up-bond-scout':
                result = new NS.BottomUpBondScout(...ctorArgs);
                break;
                
            case 'bottom-up-correspondence-scout':
                result = new NS.BottomUpCorrespondenceScout(...ctorArgs);
                break;

            case 'bottom-up-description-scout':
                result = new NS.BottomUpDescriptionScout(...ctorArgs);
                break;

            case 'breaker':
                result = new NS.Breaker(...ctorArgs);
                break;

            case 'correspondence-builder':                
                result = new NS.CorrespondenceBuilder(...ctorArgs);
                break;

            case 'correspondence-strength-tester':                
                result = new NS.CorrespondenceStrengthTester(...ctorArgs);
                break;

            case 'description-builder':
                result = new NS.DescriptionBuilder(...ctorArgs);
                break;

            case 'description-strength-tester':
                result = new NS.DescriptionStrengthTester(...ctorArgs);
                break;

            case 'group-builder':
                result = new NS.GroupBuilder(...ctorArgs);
                break;

            case 'group-strength-tester':
                result = new NS.GroupStrengthTester(...ctorArgs);
                break;

            case 'important-object-correspondence-scout':
                result = new NS.ImportantObjectCorrespondenceScout(...ctorArgs);
                break;

            case 'replacement-finder':
                result = new NS.ReplacementFinder(...ctorArgs);
                break;

            case 'rule-builder':
                result = new NS.RuleBuilder(...ctorArgs);
                break;

            case 'rule-scout':
                result = new NS.RuleScout(...ctorArgs);
                break;
                      
            case 'rule-strength-tester':
                result = new NS.RuleStrengthTester(...ctorArgs);
                break;

            case 'rule-translator':
                result = new NS.RuleTranslator(...ctorArgs);
                break;

            case 'top-down-bond-scout--category':
                result = new NS.TopDownBondScout_Category(...ctorArgs);
                break;
        
            case 'top-down-bond-scout--direction':
                result = new NS.TopDownBondScout_Direction(...ctorArgs);
                break;
        
            case 'top-down-description-scout':
                result = new NS.TopDownDescriptionScout(...ctorArgs);
                break;
    
            case 'top-down-group-scout--category':
                result = new NS.TopDownGroupScout_Category(...ctorArgs);
                break;
        
            case 'top-down-group-scout--direction':
                result = new NS.TopDownGroupScout_Direction(...ctorArgs);
                break;
            
            case 'group-scout--whole-string':               
                result = new NS.GroupScout_WholeString(...ctorArgs);
                break;

            default:
                    throw new Error('Unknown codelet name: ' + name);
        }
        return result;
    }
};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tries to build a proposed correspondence, fighting against 
 * competitors if necessary. 			    
 * 
 */
 Namespace.Codelets.CorrespondenceBuilder = class extends Namespace.Codelets.CodeletBase
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
        super('correspondence-builder', ctx, urgency, birthdate);
        this.correspondence = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const SvS = Namespace.Codelets.CodeletUtils.structureVsStructure;

        const corresp = this.correspondence;
        const objFromInitial = corresp.objFromInitial;
        const objFromTarget = corresp.objFromTarget;

        // If either of the two objects (or possibly a flipped version) no longer exists, then fizzle.
        const wantFlip = corresp.flipTargetObject;
        const flippedTargetObj = wantFlip ? objFromTarget.flippedVersion() : null;
        const objsExist = wksp.objects.includes(objFromInitial) && (wksp.objects.includes(objFromTarget) ||
            (wantFlip && wksp.targetWString.getEquivalentGroup(flippedTargetObj)));
        if (!objsExist) { return; }
        
        // If the correspondence already exists, activate its concept mapping labels,
        // and add relevant new ones, and fizzle.
        if (this._isReflexive(corresp))
        {
            const existing = objFromInitial.correspondence;
            for (let mapping of corresp.conceptMappings) {
                if (mapping.label) {
                    mapping.label.activation = 100;
                }
                if (!mapping.isContainedIn(existing.conceptMappings)) {
                    existing.conceptMappings.push(mapping);
                }
            }
            return;
        }
    
        // Fight incompatibles.
        // The weights for the fight depend on the letter-span of the objects.
        // This is one of the reasons the program prefers correspondences to groups rather than to letters.  
        // Another reason is that groups are more salient than letters, so they are more likely to be chosen by correspondence scouts.
        const incompatibles = wksp.initialWString.objects.filter(o =>
            o.correspondence && corresp.isIncompatibleWith(o.correspondence)).map(o => o.correspondence);
        if (incompatibles.length) {
            const correspSpan = corresp.objFromInitial.letterSpan() + corresp.objFromTarget.letterSpan();
            for (let incompat of incompatibles) {
                const incompatSpan = incompat.objFromInitial.letterSpan() + incompat.objFromTarget.letterSpan();
                if (!SvS(corresp, correspSpan, incompat, incompatSpan)) {
                    return;
                }
            }
        }

        // If there is an incompatible bond, then fight against it, and its group, if any. 
        let incompatibleBond;
        let incompatibleGroup;
        if ((objFromInitial.leftmost || objFromInitial.rightmost) && (objFromTarget.leftmost || objFromTarget.rightmost)) 
        {
            incompatibleBond = this._getIncompatibleBond(corresp);
            if (incompatibleBond) {
                if (!SvS(corresp, 3, incompatibleBond, 2)) {
                    return;
                }
                incompatibleGroup = objFromTarget.group;
                if (incompatibleGroup) {
                    if (!SvS(corresp, 3, incompatibleGroup, 2)) {
                        return;
                    }
                }
            }
        }

        // If there is an incompatible rule, fight against it
        let incompatibleRule;
        if (wksp.rule && this._incompatibleRuleCorrespondence(wksp.rule, corresp)) {
            incompatibleRule = wksp.rule;
            if (!SvS(corresp, 1, incompatibleRule, 1)) {
                return;
            }
        }

        incompatibles.forEach(x => x.break());
        if (incompatibleBond) {
            incompatibleBond.break();
        }
        if (incompatibleGroup) {
            incompatibleGroup.break();
        }
        if (incompatibleRule) {
            incompatibleRule.break();
        }
        corresp.build();
    }


    /**
     * Determines if the given rule and correspondence are incompatible.
     * @private
     * 
     */
    _incompatibleRuleCorrespondence(rule, corresp)
    {
        if (!rule || !corresp) {
            return false;
        }

        // Find changed object
        const changeds = this.ctx.workspace.initialWString.objects.filter(o => o.changed);
        if (!changeds.length) {
            return false;
        }

        const changed = changeds[0];
        if (corresp.objFromInitial != changed) {
            return false;
        }   

        // It is incompatible if the rule descriptor is not in the mapping list
        return corresp.conceptMappings.some(m => m.initialDescriptor == rule.descriptor);
    }


    /**
     * Gets the incompatible bond, if any, for the given correspondence.
     * @private
     * 
     */
    _getIncompatibleBond(corresp)
    {
        const sn = this.ctx.slipnet;

        const initialBond = corresp.objFromInitial.leftmost ? corresp.objFromInitial.rightBond :
            corresp.objFromInitial.rightmost ? corresp.objFromInitial.leftBond : null;
        if (!initialBond ) {
            return null;
        }

        const targetBond = corresp.objFromTarget.leftmost ? corresp.objFromTarget.rightBond :
            corresp.objFromTarget.rightmost ? corresp.objFromTarget.leftBond : null;
        if (!targetBond ) {
            return null;
        }

        if (initialBond.directionCategory && targetBond.directionCategory) {
            const mapping = new Namespace.ConceptMapping(sn.directionCategory, sn.directionCategory,
                initialBond.directionCategory, targetBond.directionCategory, null, null);
            if (corresp.conceptMappings.some(m => m.isIncompatibleWith(mapping))) {
                return targetBond;
            }
        }
        return null;
    }


    /**
     * Determines if the given correspondence is reflexive.
     * @private
     * 
     */
    _isReflexive(corresp)
    {
        const initial = corresp.objFromInitial;
        return initial.correspondence && (initial.correspondence.objFromTarget == corresp.objFromTarget);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tests the strength of a correspondence, and if it's 
 * strong enough, may post a CorrespondenceBuilder codelet.
 * 
 */
 Namespace.Codelets.CorrespondenceStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('correspondence-strength-tester', ctx, urgency, birthdate);
        this.correspondence = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const coderack = ctx.coderack;

        const corresp = this.correspondence;
        const objFromInitial = corresp.objFromInitial;
        const objFromTarget = corresp.objFromTarget;

        // If either of the two objects (or possibly a flipped version) no longer 
        // exists, then fizzle.
        const wantFlip = corresp.flipTargetObject;
        const flippedTargetObj = wantFlip ? objFromTarget.flippedVersion() : null;
        const objsExist = wksp.objects.includes(objFromInitial) && (wksp.objects.includes(objFromTarget) ||
            (wantFlip && wksp.targetWString.getEquivalentGroup(flippedTargetObj)));
        if (!objsExist) { return; }

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            ctx.ui.workspaceUi.corrsGraphic.flashProposed(corresp);
        }

        corresp.updateStrength();
        const strength = corresp.totalStrength;
        if (ctx.randGen.coinFlip( ctx.temperature.getAdjustedProb(strength/100) )) 
        { 
            // Activate the correspondence's mappings
            corresp.conceptMappings.forEach(m => {
                m.initialDescType.activation = 100;
                m.initialDescriptor.activation = 100;
                m.targetDescType.activation = 100;
                m.targetDescriptor.activation = 100;
            });

            const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
            const newCodelet = coderack.factory.create('correspondence-builder', urgency, [corresp]);
            coderack.post(newCodelet);
        }
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







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







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tests the strength of a Description, and if it's 
 * strong enough, may post a DescriptionBuilder codelet.
 * 
 */
 Namespace.Codelets.DescriptionStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('description-strength-tester', ctx, urgency, birthdate);
        this.description = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const coderack = ctx.coderack;
        const description = this.description;

        // Maybe fizzle, if the strength is too low
        description.descriptor.activation = 100;
        description.updateStrength();
        const strength = description.totalStrength;
        const prob = ctx.temperature.getAdjustedProb(strength/100);
        if (!ctx.randGen.coinFlip(prob)) { return; }

        // Post a DescriptionBuilder codelet
        const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
        const newCodelet = coderack.factory.create('description-builder', urgency, [description]);
        coderack.post(newCodelet);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};
    
/**
 * @classdesc
 * This codelet tries to build a proposed Group, fighting against 
 * competitors if necessary. 	
 * 
 */
 Namespace.Codelets.GroupBuilder = class extends Namespace.Codelets.CodeletBase
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
        super('group-builder', ctx, urgency, birthdate);
        this.group = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const sn = ctx.slipnet;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;
        const group = this.group;

        // If an equivalent group already exists, just activate it.
        const equivalent = group.string.getEquivalentGroup(group);
        if (equivalent) {
            group.descriptions.forEach(d => d.descriptor.activation = 100);
            equivalent.addDescriptions(group.descriptions);
            return;
        }

        // Check to see if all objects are still there
        if (group.objectList.some(o => !wksp.objects.includes(o))) {
            return;
        }

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            ctx.ui.workspaceUi.getStringGraphic(group.string).groupsGraphic.flashProposed(group);
        }

        // Check to see if bonds have the same direction
        const incompatibleBonds = [];
        if (group.objectList.length > 1) {
            let previous = group.objectList[0];
            for (let obj of group.objectList.slice(1)) {
                const leftBond = obj.leftBond;
                if (leftBond) {
                    if (leftBond.leftObject == previous) {
                        continue;
                    }
                    if (leftBond.directionCategory == group.directionCategory) {
                        continue;
                    }
                    incompatibleBonds.push(leftBond);
                }
                previous = obj;
            }

            const n = group.objectList.length;
            let next = group.objectList[n-1];
            for (let i=n-2; i>=0; i--) { // Don't use reverse(), as it changes the array
                const obj = group.objectList[i];
                const rightBond = obj.rightBond;
                if (rightBond) {
                    if (rightBond.rightObject == next) {
                        continue;
                    }
                    if (rightBond.directionCategory == group.directionCategory) {
                        continue;
                    }
                    incompatibleBonds.push(rightBond);
                }
                next = obj;
            }
        }

        // If incompatible bonds exist then fight
        group.updateStrength();
        if (!CodeletUtils.fightItOut(group, incompatibleBonds, 1.0, 1.0)) {
            return;
        }

        // If incompatible groups exist then fight
        const incompatibleGroups = this._getIncompatibleGroups(group);
        if (!CodeletUtils.fightItOut(group, incompatibleGroups, 1.0, 1.0)) {
            return;
        }

        // Break incompatible bonds
        incompatibleBonds.forEach(b => b.break());

        // Create new bonds
        let source, dest;
        group.bondList = [];
        for (let i=1; i<group.objectList.length; i++) {
            const object1 = group.objectList[i - 1];
            const object2 = group.objectList[i];
            if (!object1.rightBond) {
                [source, dest] = (group.directionCategory == sn.right) ? [object1, object2] : [object2, object1];
                const category = group.groupCategory.getRelatedNode(sn.bondCategory);
                const facet = group.facet;
                const newBond = new Namespace.Bond(source, dest, category, facet, source.getDescriptor(facet), dest.getDescriptor(facet));
                newBond.build();
            }
            group.bondList.push(object1.rightBond);
        }
        incompatibleGroups.forEach(g => g.break());
        group.build();
        group.descriptions.forEach(d => d.descriptor.activation = 100);
    }


    /**
     * Gets all groups that have an object in common with 
     * the given one.
     * @private
     */
    _getIncompatibleGroups(group)
    {
        const result = [];
        for (let obj of group.objectList) {
            while (obj.group) {
                if (obj.group != group) {
                    result.push(obj.group);
                    obj = obj.group;
                }
            }
        }
        return result;
    }    


};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tries to make a group out of the entire string.
 * 
 */
 Namespace.Codelets.GroupScout_WholeString = class extends Namespace.Codelets.CodeletBase
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
        super('group-scout--whole-string', ctx, urgency, birthdate);
        this.direction = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const wksp = ctx.workspace;

        // Choose either the initial or target string
        const string = ctx.randGen.choice([wksp.initialWString, wksp.targetWString]);
        
        // Find leftmost object & the highest group to which it belongs
        const lms = string.objects.filter(o => o.leftmost);
        let leftmost = lms.length ? lms[0] : null;
        if (!leftmost) { return; }
        while (leftmost.group && (leftmost.group.bondCategory == sn.sameness)) {
            leftmost = leftmost.group;
        }

        if (leftmost.spansString()) {
            // The object already spans the string - propose this object
            if (leftmost instanceof Namespace.Group) {
                const lmGroup = leftmost;
                ctx.coderack.proposeGroup(lmGroup.objectList, lmGroup.bondList,
                    lmGroup.groupCategory, lmGroup.directionCategory, lmGroup.facet);
            }
            else {
                ctx.coderack.proposeGroup([leftmost], [], sn.samenessGroup, null, sn.letterCategory);
            }
            return;
        }

        let bonds = [];
        const objects = [leftmost];
        while (leftmost.rightBond) {
            bonds.push(leftmost.rightBond);
            leftmost = leftmost.rightBond.rightObject;
            objects.push(leftmost);
        }
        if (!leftmost.rightmost) { return; }

        // Choose a random bond from list
        const chosenBond = ctx.randGen.choice(bonds);
        bonds = this._possibleGroupBonds(chosenBond, bonds);
        if (!bonds.length) { return; }

        const groupCategory = chosenBond.category.getRelatedNode(sn.groupCategory);
        ctx.coderack.proposeGroup(objects, bonds, groupCategory, chosenBond.directionCategory, chosenBond.facet);
    }


    /**
     * From a given list of bonds, get bonds that match the chosen bond.
     * @private
     */
    _possibleGroupBonds(chosenBond, bonds)
    {
        const result = [];

        for (let bond of bonds) {
            if ((bond.category == chosenBond.category) && 
                (bond.directionCategory == chosenBond.directionCategory)) {
                    result.push(bond);
            }
            else {
                // A modified bond might be made
                if (bond.category == chosenBond.category) {
                    return [];  
                }
                if (bond.directionCategory == chosenBond.directionCategory) {
                    return [];  
                }
                if ([chosenBond.category, bond.category].includes(this.ctx.slipnet.sameness)) {
                    return [];
                }
                const newBond = new Namespace.Bond(bond.destination, bond.source, chosenBond.category, 
                    chosenBond.facet, bond.destDescriptor, bond.sourceDescriptor);
                result.push(newBond);
            }
        }
        return result;
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tests the strength of a Group, and if it's strong enough,
 * posts a GroupBuilder codelet.
 * 
 */
 Namespace.Codelets.GroupStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('group-strength-tester', ctx, urgency, birthdate);
        this.group = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const coderack = ctx.coderack;
        const group = this.group;

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            ctx.ui.workspaceUi.getStringGraphic(group.string).groupsGraphic.flashProposed(group);
        }

        // Maybe fizzle, if the strength is too low
        group.updateStrength();
        const strength = group.totalStrength;
        const prob = ctx.temperature.getAdjustedProb(strength/100);
        if (!ctx.randGen.coinFlip(prob)) { return; }

        // Post a GroupBuilder codelet
        group.groupCategory.getRelatedNode(ctx.slipnet.bondCategory).activation = 100;
        if (group.directionCategory) { group.directionCategory.activation = 100; }
        const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
        const newCodelet = ctx.coderack.factory.create('group-builder', urgency, [group]);
        coderack.post(newCodelet);
    }

    
    

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};
    

/**
 * @classdesc
 * This codelet chooses an object and its description from the initial string,
 * and looks for an object in the target string with the same description or
 * slipped description. It then tries to propose a Correspondence between 
 * the two objects.
 */
 Namespace.Codelets.ImportantObjectCorrespondenceScout = class extends Namespace.Codelets.CodeletBase
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
        super('important-object-correspondence-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const sn = ctx.slipnet;
        const Utils = Namespace.Codelets.CodeletUtils;

        // Choose an object from the initial string, based on salience.
        const objFromInitial = Utils.chooseUnmodifiedObject(ctx, 'relativeImportance', wksp.initialWString.objects);
        if (!objFromInitial) { return; }

        const descriptors = objFromInitial.relevantDistinguishingDescriptors();
        const weights = descriptors.map( d => ctx.temperature.getAdjustedValue(d.depth) );
        const descriptor = ctx.randGen.weightedChoice(descriptors, weights);
        if (!descriptor) { return; }
        
        let initialDescriptor = descriptor;
        for (let m of wksp.getSlippableMappings()) {
            if (m.initialDescriptor == descriptor) {
                initialDescriptor = m.targetDescriptor;
                break;
            }
        }
        const targetCandidates = wksp.targetWString.objects.filter(
            o => o.relevantDescriptions().some(d => d.descriptor == initialDescriptor));
        if (!targetCandidates.length) { return; }

        let objFromTarget = Utils.chooseUnmodifiedObject(ctx, 'interStringSalience', targetCandidates);
        if (objFromInitial.spansString() != objFromTarget.spansString()) { return; }

        // Provide UI feedback
        if (ctx.ui && !ctx.batchMode) {
            const dummyCorresp = new Namespace.Correspondence(
                objFromInitial, objFromTarget, [], false);
            ctx.ui.workspaceUi.corrsGraphic.flashGrope(dummyCorresp);
        }

        // Get the posible concept mappings
        let conceptMappings = Namespace.ConceptMapping.getMappings(
            objFromInitial, objFromTarget, objFromInitial.relevantDescriptions(),
            objFromTarget.relevantDescriptions());

        // Check for slippability
        const slippageProbs = conceptMappings.map(
            m => ctx.temperature.getAdjustedProb( m.slippability()/100 ));
        const slippable = slippageProbs.some(p => ctx.randGen.coinFlip(p));
        if (!slippable) { return; }

        // Find out if any are distinguishing
        const distinguishingMappings = conceptMappings.filter(m => m.isDistinguishing());
        if (!distinguishingMappings.length) { return; }

        // If both objects span the strings, check to see if the
        // string description needs to be flipped
        const opposites = distinguishingMappings.filter(m =>
            (m.initialDescType == sn.stringPositionCategory) && (m.initialDescType != sn.bondFacet));
        const initialDescriptionTypes = opposites.map(m => m.initialDescType);
        let flipTargetObject = false;
        if (objFromInitial.spansString() && objFromTarget.spansString() && (sn.opposite.activation != 100) &&
            initialDescriptionTypes.includes(sn.directionCategory) && opposites.every(m => m.label == sn.opposite) ) {
                objFromTarget = objFromTarget.flippedVersion();
                conceptMappings = Namespace.ConceptMapping.getMappings( objFromInitial, objFromTarget, 
                    objFromInitial.relevantDescriptions(), objFromTarget.relevantDescriptions() );
                flipTargetObject = true;
        }

        ctx.coderack.proposeCorrespondence(objFromInitial, objFromTarget, conceptMappings, flipTargetObject);
    }


};

})( window.CopycatJS = window.CopycatJS || {} );







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







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet tries to build a proposed Rule, fighting with 
 * competitors if necessary.
 * 
 */
 Namespace.Codelets.RuleBuilder = class extends Namespace.Codelets.CodeletBase
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
        super('rule-builder', ctx, urgency, birthdate);
        this.rule = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;
        const rule = this.rule;
        const Utils = Namespace.Codelets.CodeletUtils;

        // If this rule already exists, then fizzle. 
        if ( rule.sameAs(wksp.rule) ) {
            rule.activate();
            return;
        }

        // If the rule is too weak, then fizzle.
        rule.updateStrength();
        if (rule.totalStrength === 0) { return; }

        // If a different rule already exists, then fight.
        if ( !wksp.rule || Utils.structureVsStructure(rule, 1.0, wksp.rule, 1.0)) {
            rule.build();
        }       
    }

    
};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};


/**
 * @classdesc
 * This codelet tries to propose a Rule based on the descriptions
 * of the initial string's changed letter and its replacement.
 * 
 */
 Namespace.Codelets.RuleScout = class extends Namespace.Codelets.CodeletBase
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
        super('rule-scout', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const wksp = ctx.workspace;
        const coderack = ctx.coderack;

        // If not all replacements have been found, then fizzle.
        const numUnreplaced = wksp.objects.filter(o => 
            (o.string == wksp.initialWString) && (o instanceof Namespace.Letter) && !o.replacement).length;
        if (numUnreplaced !== 0) { return; }

        const changedObjects = wksp.initialWString.objects.filter(o => o.changed);
        
        // If there are no changed objects, propose a rule with no changes
        if (!changedObjects.length) {
            coderack.proposeRule();
            return;
        }
    
        // Generate a list of distinguishing descriptions for the first object
        let objectList = [];
        const changed = changedObjects[changedObjects.length-1];
        const position = changed.getDescriptor(sn.stringPositionCategory);
        if (position) {
            objectList.push(position);
        }

        const letter = changed.getDescriptor(sn.letterCategory);
        const otherObjectsOfSameLetter = wksp.initialWString.objects.filter(o => (o != changed) && o.getDescriptionType(letter));
        if (!otherObjectsOfSameLetter.length) {
            objectList.push(letter);
        }

        if (changed.correspondence) {
            const targetObject = changed.correspondence.objFromTarget;
            const newList = [];
            const slippages = wksp.getSlippableMappings();
            for (let node of objectList) {
                node = node.applySlippages(slippages);
                if (targetObject.hasDescriptor(node) && targetObject.isDistinguishingDescriptor(node)) {
                    newList.push(node);
                }
            }
            objectList = newList; 
        }
        if (!objectList.length) { return; }

        // Choose the relation 
        let weights = objectList.map(o => ctx.temperature.getAdjustedValue(o.depth));
        const descriptor = ctx.randGen.weightedChoice(objectList, weights);
        
        objectList = [];
        if (changed.replacement.relation) { objectList.push(changed.replacement.relation); }
        objectList.push(changed.replacement.objFromModified.getDescriptor(sn.letterCategory));
        weights = objectList.map(o => ctx.temperature.getAdjustedValue(o.depth));
        const relation = ctx.randGen.weightedChoice(objectList, weights);

        coderack.proposeRule(sn.letterCategory, descriptor, sn.letter, relation);        
    }
};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet calculates a proposed Rule's strength, and decides
 * whether or not to post a RuleBuilder codelet.
 */
 Namespace.Codelets.RuleStrengthTester = class extends Namespace.Codelets.CodeletBase
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
        super('rule-strength-tester', ctx, urgency, birthdate);
        this.rule = args[0]; 
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const coderack = ctx.coderack;
        const rule = this.rule;

        // Maybe fizzle, if the strength is too low
        rule.updateStrength();
        const strength = rule.totalStrength;
        const prob = ctx.temperature.getAdjustedProb(strength/100);
        if (!ctx.randGen.coinFlip(prob)) { return; }

        // Post a RuleBuilder codelet
        const urgency = Namespace.Codelets.CodeletUtils.getUrgencyBin(strength);
        const newCodelet = ctx.coderack.factory.create('rule-builder', urgency, [rule]);
        coderack.post(newCodelet);
    }

    
    

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet attempts to translate a Rule by applying the 
 * slippages that have been built in the workspace.
 * 
 */
 Namespace.Codelets.RuleTranslator = class extends Namespace.Codelets.CodeletBase
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
        super('rule-translator', ctx, urgency, birthdate);
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const wksp = ctx.workspace;

        // If we don't have a rule, then fizzle. 
        if (!wksp.rule) { return; }

        let bondDensity = 1.0;
        const totalLength = wksp.initialWString.length + wksp.targetWString.length;
        if (totalLength > 2) {
            const numBonds = wksp.initialWString.bonds.length + wksp.targetWString.bonds.length;
            bondDensity = Math.min(1.0, numBonds/(totalLength - 2));
        }
        const weights = 
            bondDensity > 0.8 ? [5, 150, 5, 2, 1, 1, 1, 1, 1, 1] :
            bondDensity > 0.6 ? [2, 5, 150, 5, 2, 1, 1, 1, 1, 1] :
            bondDensity > 0.4 ? [1, 2, 5, 150, 5, 2, 1, 1, 1, 1] :
            bondDensity > 0.2 ? [1, 1, 2, 5, 150, 5, 2, 1, 1, 1] :
                                [1, 1, 1, 2, 5, 150, 5, 2, 1, 1];

        const oneToTen = Array.from({length: 10}, (_, i) => i + 1);
        const cutoff = 10.0 * ctx.randGen.weightedChoice(oneToTen, weights);

        if (cutoff >= ctx.temperature.actualValue) {
            const result = wksp.rule.applyRuleToTarget();
            if (result) {
                wksp.finalAnswer = result;
            } else {
                ctx.temperature.clampUntil(ctx.coderack.numCodeletsRun + 100);
            }
        }
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet seeks potential Bonds between 
 * neighboring object pairs in the initial or target string.
 * 
 */
 Namespace.Codelets.TopDownBondScout_Category = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-bond-scout--category', ctx, urgency, birthdate);
        this.category = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;
        const cat = this.category;

        const bondSource = CodeletUtils.getScoutSource(ctx, 'bondCategory', cat);

        const bondDest = CodeletUtils.chooseNeighbor(ctx, bondSource);
        if (!bondDest) { return; }

        // Provide UI feedback.
        if (ctx.ui && !ctx.batchMode) {
            const dummyBond = new Namespace.Bond(bondSource, bondDest, sn.sameness, sn.letterCategory, sn.letters[0], sn.letters[0]);
            ctx.ui.workspaceUi.getStringGraphic(dummyBond.string). bondsGraphic.flashGrope(dummyBond);
        }

        const bondFacet = CodeletUtils.chooseBondFacet(ctx, bondSource, bondDest);
        if (!bondFacet) { return; }

        const sourceDescriptor = bondSource.getDescriptor(bondFacet);
        const destDescriptor = bondDest.getDescriptor(bondFacet);

        let forwardBond = sourceDescriptor.getBondCategory(destDescriptor);
        let backwardBond = null;
        if (forwardBond == sn.identity) {
            forwardBond = sn.sameness;
            backwardBond = sn.sameness;
        } else {
            backwardBond = destDescriptor.getBondCategory(sourceDescriptor);
        }

        if (cat == forwardBond) {
            ctx.coderack.proposeBond(bondSource, bondDest, cat, bondFacet, sourceDescriptor, destDescriptor);
        }
        else if (cat == backwardBond) {
            ctx.coderack.proposeBond(bondDest, bondSource, cat, bondFacet, destDescriptor, sourceDescriptor);
        }
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet seeks potential Bonds between 
 * neighboring object pairs in the initial or target string.
 * 
 */
 Namespace.Codelets.TopDownBondScout_Direction = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-bond-scout--direction', ctx, urgency, birthdate);
        this.bondDirection = args[0]; // left or right
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;

        const bondSource = CodeletUtils.getScoutSource(ctx, 'bondDirection', this.bondDirection);

        const bondDest = this._chooseDirectedNeighbor(bondSource);
        if (!bondDest) { return; }

        // Provide UI feedback.
        if (ctx.ui && !ctx.batchMode) {
            const sn = ctx.slipnet;
            const dummyBond = new Namespace.Bond(bondSource, bondDest, sn.sameness, sn.letterCategory, sn.letters[0], sn.letters[0]);
            ctx.ui.workspaceUi.getStringGraphic(dummyBond.string). bondsGraphic.flashGrope(dummyBond);
        }

        const bondFacet = CodeletUtils.chooseBondFacet(ctx, bondSource, bondDest);
        if (!bondFacet) { return; }

        const sourceDescriptor = bondSource.getDescriptor(bondFacet);
        const destDescriptor = bondDest.getDescriptor(bondFacet);

        let category = sourceDescriptor.getBondCategory(destDescriptor);
        if (!category) { return; }
        
        if (category == ctx.slipnet.identity) { category = ctx.slipnet.sameness; }

        // Propose the bond
        ctx.coderack.proposeBond(bondSource, bondDest, category, bondFacet, sourceDescriptor, destDescriptor);
    }



    /**
     * Chooses a neighbor of the given object in the given direction.
     * @private
     */
    _chooseDirectedNeighbor(source)
    {
        const ctx = this.ctx;
        let objects = [];

        if (this.bondDirection == ctx.slipnet.left) {
            objects = ctx.workspace.objects.filter(o => (o.string == source.string) && (source.leftIndex == o.rightIndex + 1));
        } else {
            objects = ctx.workspace.objects.filter(o => (o.string == source.string) && (source.rightIndex == o.leftIndex - 1));
        }

        const weights = objects.map( o => ctx.temperature.getAdjustedValue(o.intraStringSalience) );
        return ctx.randGen.weightedChoice(objects, weights);
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * Thic codelet seeks an appropriate Description for a randomly
 * selected workspace object.
 * 
 */
 Namespace.Codelets.TopDownDescriptionScout = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-description-scout', ctx, urgency, birthdate);
        this.descriptionType = args[0]; // e.g., stringPositionCategory, alphabeticPositionCategory
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const Utils = Namespace.Codelets.CodeletUtils;

        // Choose a workspace object, based on salience.
        const chosenObject = Utils.chooseUnmodifiedObject(ctx, 'totalSalience', ctx.workspace.objects);
        if (!chosenObject) { return; }

        // Choose one of the object's descriptions
        const descriptions = this._getPossibleDescriptions(chosenObject, this.descriptionType);
        if (!descriptions || !descriptions.length) { return; }

        const weights = descriptions.map(d => d.activation);
        const chosenDescription = ctx.randGen.weightedChoice(descriptions, weights);

        // Propose the description
        ctx.coderack.proposeDescription(chosenObject, chosenDescription.category(), chosenDescription);
    }

    
    /**
     * Gets appropriate descriptions of an object, that match a given description type.
     * 
     * @param {WorkspaceObject} obj - The object to describe
     * @param {SlipNode} descriptionType - The description type to test against.
     * 
     * @private
     */
    _getPossibleDescriptions(obj, descriptionType) 
    {
        const sn = this.ctx.slipnet;
        const descriptions = [];
        for (let link of descriptionType.instanceLinks) {
            const node = link.destination;
            if ((node == sn.first) && obj.hasDescriptor(sn.letters[0])) {
                descriptions.push(node);
            }
            else if ((node == sn.last) && obj.hasDescriptor(sn.letters[sn.letters.length-1])) {
                descriptions.push(node);
            }
            else if ((node == sn.middle) && obj.isMiddleObject()) {
                descriptions.push(node);
            }
            for (let i=1; i<=sn.numbers.length; i++) {
                if ((node == sn.numbers[i-1]) && (obj instanceof Namespace.Group)) {
                    if (obj.objectList.length == i) { descriptions.push(node); }
                }
            }
        }
        return descriptions;
    }

};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet seeks potential Groups in the initial and target strings.
 * 
 */
 Namespace.Codelets.TopDownGroupScout_Category = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-group-scout--category', ctx, urgency, birthdate);
        this.groupCategory = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;

        const cat = this.groupCategory.getRelatedNode(sn.bondCategory);
        if (!cat) { return; }
        
        let source = CodeletUtils.getScoutSource(ctx, 'bondCategory', cat);
        if (!source || source.spansString()) { return; }
        
        let direction = source.leftmost ? sn.right : source.rightmost ? sn.left :
            ctx.randGen.weightedChoice([sn.left, sn.right], [sn.left.activation, sn.right.activation]);
        
        let firstBond = (direction == sn.left) ? source.leftBond : source.rightBond;

        if (!firstBond || (firstBond.category != cat)) {
            // Check  other side of object
            firstBond = (direction == sn.right) ? source.leftBond : source.rightBond;
            if (!firstBond || (firstBond.category != cat)) {
                if ((cat == sn.sameness) && (source instanceof Namespace.Letter)) {
                    if (ctx.randGen.coinFlip(this._singleLetterGroupProbability(source))) { 
                        // Propose a single-letter group
                        ctx.coderack.proposeGroup([source], [], sn.samenessGroup, null, sn.letterCategory);
                        return;
                    }
                }
            }
            return;
        }

        direction = firstBond.directionCategory;
        let search = true;
        let bondFacet = null;
        // Find leftmost object in group with these bonds
        while (search) {
            search = false;
            if (!source.leftBond) {
                continue;
            }
            if (source.leftBond.category != cat) {
                continue;
            }
            if (source.leftBond.directionCategory != direction) {
                if (source.leftBond.directionCategory) {    
                    continue;
                }
            }
            if (!bondFacet || (bondFacet == source.leftBond.facet)) {
                bondFacet = source.leftBond.facet;
                direction = source.leftBond.directionCategory;
                source = source.leftBond.leftObject;
                search = true;
            }
        }

        // Find rightmost object in group with these bonds
        search = true;
        let destination = source;
        while (search) {
            search = false;
            if (!destination.rightBond) {
                continue;
            }
            if (destination.rightBond.category != cat) {
                continue;
            }
            if (destination.rightBond.directionCategory != direction) {
                if (destination.rightBond.directionCategory) {
                    continue;
                }
            }
            if (!bondFacet || (bondFacet == destination.rightBond.facet)) {
                bondFacet = destination.rightBond.facet;
                direction = source.rightBond.directionCategory;
                destination = destination.rightBond.rightObject;
                search = true;
            }
        }
        if (destination == source) { return; }

        const objects = [source];
        const bonds = [];
        while (source != destination) {
            bonds.push(source.rightBond);
            objects.push(source.rightBond.rightObject);
            source = source.rightBond.rightObject;
        }
        ctx.coderack.proposeGroup(objects, bonds, this.groupCategory, direction, bondFacet);
    }



    /**
     * Calculates the probability of a single letter group.
     * @private
     */
    _singleLetterGroupProbability(letter)
    {
        const sn = this.ctx.slipnet;
        const group = new Namespace.Group(letter.string, sn.samenessGroup, null, sn.letterCategory, [letter], []);

        const numSupporters = group._numberOfLocalSupportingGroups();
        if (numSupporters === 0) {
            return 0.0;
        }

        const exp = (numSupporters == 1) ? 4.0 : (numSupporters == 2) ? 2.0 : 1.0;
        const support = group._localSupport() / 100;
        const activation = sn.length.activation / 100;
        const supportedActivation = Math.pow((support * activation), exp);
        return this.ctx.temperature.getAdjustedProb(supportedActivation);
    }
};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    Namespace.Codelets = Namespace.Codelets || {};

/**
 * @classdesc
 * This codelet seeks potential Groups in the initial and target strings.
 * 
 */
 Namespace.Codelets.TopDownGroupScout_Direction = class extends Namespace.Codelets.CodeletBase
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
        super('top-down-group-scout--direction', ctx, urgency, birthdate);
        this.direction = args[0];
    }


    /**
     * Runs the codelet.
     */
    run()
    {
        const ctx = this.ctx;
        const sn = ctx.slipnet;
        const CodeletUtils = Namespace.Codelets.CodeletUtils;

        let direction = this.direction;
        let source = CodeletUtils.getScoutSource(ctx, 'bondDirection', direction);
        if (!source || source.spansString()) { return; }
        
        const myDir = source.leftmost ? sn.right : source.rightmost ? sn.left : 
            ctx.randGen.weightedChoice([sn.left, sn.right], [sn.left.activation, sn.right.activation]);
        
        let firstBond = (myDir == sn.left) ? source.leftBond : source.rightBond;
        if (firstBond && !firstBond.directionCategory) {
            direction = null;
        }

        if (!firstBond || (firstBond.directionCategory != direction)) {
            firstBond = (myDir == sn.right) ? source.leftBond : source.rightBond;
            if (firstBond && !firstBond.directionCategory) {
                direction = null;
            }
            if (!firstBond || (firstBond.directionCategory != direction)) { return; }
        }

        const category = firstBond.category;
        if (!category) { return; }

        const groupCategory = category.getRelatedNode(sn.groupCategory);
        let bondFacet = null;
        // Find the leftmost object in group with these bonds
        let search = true;
        while (search) {
            search = false;
            if (!source.leftBond) {
                continue;
            }
            if (source.leftBond.category != category) {
                continue;
            }
            if (source.leftBond.directionCategory != direction) {
                if (source.leftBond.directionCategory) {    
                    continue;
                }
            }
            if (!bondFacet || (bondFacet == source.leftBond.facet)) {
                bondFacet = source.leftBond.facet;
                direction = source.leftBond.directionCategory;
                source = source.leftBond.leftObject;
                search = true;
            }
        }

        // Find rightmost object in group with these bonds
        search = true;
        let destination = source;
        while (search) {
            search = false;
            if (!destination.rightBond) {
                continue;
            }
            if (destination.rightBond.category != category) {
                continue;
            }
            if (destination.rightBond.directionCategory != direction) {
                if (destination.rightBond.directionCategory) {
                    continue;
                }
            }
            if (!bondFacet || (bondFacet == destination.rightBond.facet)) {
                bondFacet = destination.rightBond.facet;
                direction = source.rightBond.directionCategory;
                destination = destination.rightBond.rightObject;
                search = true;
            }
        }
        if (destination == source) { return; }

        const objects = [source];
        const bonds = [];
        while (source != destination) {
            bonds.push(source.rightBond);
            objects.push(source.rightBond.rightObject);
            source = source.rightBond.rightObject;
        }
        ctx.coderack.proposeGroup(objects, bonds, groupCategory, direction, bondFacet);

    }
};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class draws the string-to-corresponding-string arrows.
 * 
 */
Namespace.ArrowGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent Ui.
     */
    constructor(workspaceUi) 
    { 
        this.wkspUi = workspaceUi; 
        this.drawParams = {};
    }


    /**
     * Draws the arrows.
     *
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        if (Namespace.UiUtils.NeedToRescale(this.drawParams, ctx)) { this._updateDrawParams(ctx);}

        const dp = this.drawParams;
        ctx.strokeStyle = this.wkspUi.letterColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        
        for (let line of dp.lines) {
            Namespace.UiUtils.DrawLine(ctx, line.xa, line.ya, line.xb, line.yb);
        }      
    }


    /** 
     * Recalculates the drawing parameters for this object.
     * 
     * @private
     */
     _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        const dp = this.drawParams;
        dp.canvasWidth = w; dp.canvasHeight = h;
       
        let cx = w/2;
        let cy = h/3 - h/80;
        let sz = w/25;
        dp.lines = [];

        dp.lines.push({xa: cx-0.5*sz, ya: cy-0.08*sz, xb: cx+0.34*sz, yb: cy-0.08*sz});
        dp.lines.push({xa: cx-0.5*sz, ya: cy+0.08*sz, xb: cx+0.34*sz, yb: cy+0.08*sz});
        dp.lines.push({xa: cx+0.1*sz, ya: cy-0.2*sz, xb: cx+0.5*sz, yb: cy});
        dp.lines.push({xa: cx+0.1*sz, ya: cy+0.2*sz, xb: cx+0.5*sz, yb: cy});

        cy = 2*h/3 - h/80;
        dp.lines.push({xa: cx-0.5*sz, ya: cy-0.08*sz, xb: cx+0.34*sz, yb: cy-0.08*sz});
        dp.lines.push({xa: cx-0.5*sz, ya: cy+0.08*sz, xb: cx+0.34*sz, yb: cy+0.08*sz});
        dp.lines.push({xa: cx+0.1*sz, ya: cy-0.2*sz, xb: cx+0.5*sz, yb: cy});
        dp.lines.push({xa: cx+0.1*sz, ya: cy+0.2*sz, xb: cx+0.5*sz, yb: cy});
    }               
};





})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for displaying the batch-mode user interface.
 * 
 */
Namespace.BatchmodeUi = class 
{
    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.parentDiv = parentDiv;      

        this.bkgndColor = '#fafafa';
        this.fontColor = '#606060';

        this._buildUi();

    }


/**
     * Creates the ui elements.
     * @private
     * 
     */
    _buildUi()
    {
        const UiUtils = Namespace.UiUtils;

        this.parentDiv.style.background = this.bkgndColor;
        this.parentDiv.style.borderTop = '1px solid';

        this.ctrlsDiv = UiUtils.CreateElement('div', 
            'batchmode-ctrls-div', this.parentDiv, {position:'absolute', 
            top:'0%', left:'0%', right:'82%', height:(6/0.85.toString())+'%', background:this.bkgndColor}
        );

        this.goBtn = UiUtils.CreateElement('button', 'go_btn', 
            this.ctrlsDiv, {width:'15%', height:'80%', top:'24%', left:'31%', border:0, background:this.bkgndColor});
        this.goBtn.innerHTML = '<img class="button-img" src="./btn_play.png" border="0" width="100% height="auto">';
        this.goBtn.onclick = this._onGoBtnClick.bind(this);
        this.goBtn.className += " noselect";

        this.pauseBtn = UiUtils.CreateElement('button', 'pause_btn', 
            this.ctrlsDiv, {width:'15%', height:'80%', top:'24%', left:'54%', border:0, background:this.bkgndColor});
        this.pauseBtn.innerHTML = '<img class="button-img" src="./btn_pause.png" border="0" width="100% height="auto">';
        this.pauseBtn.onclick = this._onPauseBtnClick.bind(this);
        this.pauseBtn.className += " noselect";

        this.resetBtn = UiUtils.CreateElement('button', 'reset_btn', 
            this.ctrlsDiv, {width:'15%', height:'80%', top:'24%', left:'77%', border:0, background:this.bkgndColor});
        this.resetBtn.innerHTML = '<img class="button-img" src="./btn_reset.png" border="0" width="100% height="auto">';
        this.resetBtn.onclick = this._onResetBtnClick.bind(this);
        this.resetBtn.className += " noselect";

        this.progressDiv = UiUtils.CreateElement('div', 
            'batchmode-progress-div', this.parentDiv, {position:'absolute', top:'0%', right:'10%', width:'18%', 
            height:(6/0.85.toString())+'%', background:this.bkgndColor, display:'flex', alignItems:'center', justifyContent:'right',
            color:'#404040', fontFamily:'Arial', fontWeight:'normal', fontSize: '2vh'}
        );

        this.tableDiv = UiUtils.CreateElement('div', 'batchmode-table-div', this.parentDiv, {position:'absolute', 
            top:'15%', left:'10%', width:'80%', height:'70%', background:this.bkgndColor, borderBottom:'1px solid black',
            overflowX:'auto', overflowY:'scroll'});
        this._createTable(this.tableDiv, 15, 5);
    }    
    
    
    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this._updateEnabledState();
    }


    /**
     * Handler for resize events.
     * @private
     *
     */
    _onResize()
    {   
        // Nothing to do here
    }


    /**
     * Handler for go button clicks.
     * @private
     * 
     */
    _onGoBtnClick()
    {
        const copycat = this.copycatUi.copycat;

        if (this.copycatUi.checkInputStrings()) {
            if (copycat.state == 'ready' || copycat.state == 'done') {
                copycat.start();
            }
            else if (copycat.state == 'paused') {
                copycat.resume();
            }
        }        
    }


    /**
     * Handler for pause button clicks.
     * @private
     * 
     */
    _onPauseBtnClick()
    {
        this.copycatUi.copycat.pause();
    }


    /**
     * Handler for reset button clicks.
     * @private
     * 
     */
    _onResetBtnClick()
    {
        const copycat = this.copycatUi.copycat;
        if ( (copycat.state != 'running') && this.copycatUi.checkInputStrings()) {
            this.clearTable();
            copycat.reset();
        }
    }
    
    
    /**
     * Updates the enabled/disabled state of the control buttons,
     * based on the current copycat state.
     * @private
     * 
     */
    _updateEnabledState()
    {
        const setEnabled = function(ctrl, enabled) { 
            ctrl.disabled = !enabled; 
            ctrl.style.opacity = enabled ? '1.0' : '0.4';
        };

        [this.goBtn, this.pauseBtn, this.resetBtn].forEach( ctrl => setEnabled(ctrl, true) );

        switch (this.copycatUi.copycat.state) 
        {
            case 'ready':
                setEnabled(this.pauseBtn, false);
                break;
            case 'paused':
                setEnabled(this.pauseBtn, false);
                break;
            case 'running':
                setEnabled(this.goBtn, false);
                setEnabled(this.resetBtn, false);
                break;
            case 'done':
                setEnabled(this.pauseBtn, false);
                break;
            default:
                break;
        }
    }

    /**
     * Handler for batchmode-toggle events
     * @private
     * 
     */    
    _onBatchResultsUpdated(resultsDict)
    {
        const ctx = this.copycatUi.copycat;
        if ( ctx.batchMode ) 
        {
            this.clearTable();
        
            let r = 1;
            const sortedResults = Object.values(resultsDict).sort((a,b) => b.count - a.count);
            
            const tbl = this.resultsTable;
            for (const result of sortedResults) {
                if (r >= tbl.rows.length) {  this._addTableRow(); }
                tbl.rows[r].cells[0].innerHTML = '&nbsp;' + result.count;
                tbl.rows[r].cells[1].innerHTML = '&nbsp;' + result.answer;
                tbl.rows[r].cells[2].innerHTML = '&nbsp;' + result.rule;
                tbl.rows[r].cells[3].innerHTML = '&nbsp;' + (result.sumtemp/result.count).toFixed(0);
                tbl.rows[r].cells[4].innerHTML = '&nbsp;' + (result.sumtime/result.count).toFixed(0);
                r += 1;
            }

            this.progressDiv.innerHTML = 'Run:&nbsp;&nbsp;' + ctx.batchCount + ' / ' + ctx.batchSize;
        }
    }
    

    _createTable(parentDiv, nRows, nCols) 
    {
        this.resultsTable = Namespace.UiUtils.CreateElement('table', 'batchmode_results_tbl', 
            parentDiv, {width:'100%', height:'100%', background:'#fffbcc',
                border: '1px solid blue', borderCollapse: 'collapse'
            });

        const colWidths = ['8%', '20%', '56%', '8%', '8%'];
        const colLabels = ['Freq.', 'Answer', 'Rule', 'Avg. Temp.', 'Avg. # Codelets'];

        const header = this.resultsTable.createTHead();
        const headerRow = header.insertRow();
        headerRow.style.height = '5vh';
        headerRow.style.fontFamily = 'Arial';
        headerRow.style.fontWeight = 'bold'; 
        headerRow.style.background = '#ffe5e0';
        for (let c = 0; c < nCols; c++) {
            const cell = headerRow.insertCell();
            cell.innerHTML = '&nbsp;' + colLabels[c];  
            cell.style.border = '1px solid blue';
            cell.style.borderCollapse = 'collapse';
            cell.style.width = colWidths[c];
            if ((c==3) || (c ==4)) { cell.style.textAlign = 'center'; }         
        }

        for (let r = 0; r < nRows; r++) { this._addTableRow(); }
    }


    /** 
     * Adds a new row to the results table.
     * 
     */
    _addTableRow()
    {
        const tbl = this.resultsTable;
        const nCols = tbl.rows[0].cells.length;
        const firstRow = tbl.rows[0];

        const tr = tbl.insertRow();
        tr.style.height = '4vh';
        tr.style.fontFamily = 'Arial';
        for (let c = 0; c < nCols; c++) {
            const td = tr.insertCell();
            td.style.border = '1px solid blue';
            td.style.borderCollapse = 'collapse';
            td.style.width = firstRow.cells[c].style.width;
            td.innerHTML = '&nbsp;';
            if (firstRow.cells[c].innerHTML.toLowerCase().includes('answer')) {
                td.style.fontFamily = 'serif';
                td.style.fontStyle = 'italic';
                td.style.fontSize = 'larger';
            }        
        }        
    }


    /**
     * Clears the results table.
     *  
     */
    clearTable() 
    {
        const nTableRows = this.resultsTable.rows.length;
        for (let r = 1; r < nTableRows; r++) {
            const nTableCols = this.resultsTable.rows[r].cells.length;
            for (let c = 0; c < nTableCols; c++) {
                this.resultsTable.rows[r].cells[c].innerHTML = '';
            }
        }

        this.progressDiv.innerHTML = '';
    }
};


})( window.CopycatJS = window.CopycatJS || {} );








// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the bonds
 *   associated with a given string.
 * 
 */
Namespace.BondsGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {StringGraphic} stringGraphic - The parent graphic.
     * 
     */
    constructor(stringGraphic) 
    { 
        this.stringGraphic = stringGraphic; 
        this.wstring = stringGraphic.wstring;
        this.wkspUi = stringGraphic.wkspUi;
        this.bondGraphics = [];
        this.drawnBonds = [];
        this.cache = [];
    }


    /**
     * Utility method that indicates whether two Bonds
     * refer to the same source and destination objects.
     * @private 
     */
    _sameReferents(b1, b2) {
        return (b1.source === b2.source) && (b1.destination === b2.destination);
    }

    /**
     * Draws the bond lines 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Get all the bonds that need to be drawn
        const wksp = this.wkspUi.workspace;
        const coderack = this.wkspUi.copycat.coderack;

        let builtBonds = wksp.structures.filter(s => (s instanceof Namespace.Bond) && (s.source.string == this.wstring));

        let evaluatedBonds = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.BondStrengthTester) && (c.bond.source.string == this.wstring)).map(c => c.bond);

        let proposedBonds = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.BondBuilder) && (c.bond.source.string == this.wstring)).map(c => c.bond);

        // Remove duplicates and obsolete cases
        proposedBonds = proposedBonds.filter(p =>
            !evaluatedBonds.some(e => this._sameReferents(e,p)) && 
            !builtBonds.some(b => this._sameReferents(b,p)) &&
            wksp.structures.includes(p.leftObject) &&
            wksp.structures.includes(p.rightObject));

        evaluatedBonds = evaluatedBonds.filter(e =>
            !builtBonds.some(b => this._sameReferents(b,e)) &&
            wksp.structures.includes(e.leftObject) &&
            wksp.structures.includes(e.rightObject));
        
        // Draw them
        this.bondGraphics = [];
        proposedBonds.forEach( b => {
            const bg = this._getBondGraphic(b, 'proposed');
            bg.redraw(ctx);
            this.bondGraphics.push(bg);
        });

        evaluatedBonds.forEach( b => {
            const bg = this._getBondGraphic(b, 'evaluated');
            bg.redraw(ctx);
            this.bondGraphics.push(bg);
        });

        builtBonds.forEach( b => {
            const bg = this._getBondGraphic(b, 'built'); 
            bg.redraw(ctx);
            this.bondGraphics.push(bg);
        });   
        
        this.drawnBonds = proposedBonds.concat(evaluatedBonds, builtBonds);
    }


    /**
     * Gets or creates the graphic for a given bond.
     * @private
     */
    _getBondGraphic(bond, type)
    {
        let bondGraphic = this.cache.find(bg => bg.bond == bond);

        if (!bondGraphic) {
            bondGraphic = new Namespace.BondGraphic(bond, type, this);
            this.cache.push(bondGraphic);
            if (this.cache.length > 100) {
                this.cache.shift();
            }
        }

        bondGraphic.type = type;
        return bondGraphic;
    }


    /**
     * Flashes a proposed-Bond graphic.
     * 
     * @param {Bond} bond 
     * @param {Number} count 
     */
    flashProposed(bond, count=3) 
    {
        if (!this.drawnBonds.some(b => this._sameReferents(b, bond))) {
            const bondGraphic = new Namespace.BondGraphic(bond, 'proposed', this);
            this.wkspUi.flash(bondGraphic, count);
        }
    }


    /**
     * Flashes a potential-Bond graphic.
     * 
     * @param {Correspondence} bond 
     * @param {Number} count 
     */
    flashGrope(bond, count=3)
    {
        if (!this.drawnBonds.some(b => this._sameReferents(b, bond))) {
            const bondGraphic = new Namespace.BondGraphic(bond, 'grope', this);
            this.wkspUi.flash(bondGraphic, count);
        }        
    }
};


/**
 * @classdesc
 * This class is responsible for drawing a single Bond line.
 * 
 */
Namespace.BondGraphic = class
{
    /**
     * @constructor
     * 
     * @param {Bond} bond - The associated bond.
     * @param {String} type - The type ('proposed', 'evaluated', or 'built').
     * @param {BondsGraphic} parent - The collection that owns this graphic.
     * 
     */
    constructor(bond, type, parent) 
    { 
        this.bond = bond; 
        this.type = type;
        this.parent = parent;
        this.drawParams = {};
    }


    /**
     * Draws the bond line.
     * 
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        const UiUtils = Namespace.UiUtils;
        if ( UiUtils.NeedToRescale(this.drawParams, ctx)) {
            if (!this._updateDrawParams(ctx)) { return; }
        }

        const dp = this.drawParams;
        ctx.strokeStyle = this.parent.wkspUi.bondColor;
        ctx.lineWidth = 1;
        ctx.setLineDash(dp.lineDash[this.type]);

        if (this.type == 'grope') {
            UiUtils.DrawLines(ctx, dp.gropeLineA);
            UiUtils.DrawLines(ctx, dp.gropeLineB);
        }
        else {
            ctx.beginPath();
            ctx.moveTo(dp.pta.x, dp.pta.y);
            ctx.quadraticCurveTo(dp.ptc.x, dp.ptc.y, dp.ptb.x, dp.ptb.y);
            ctx.stroke();

            ctx.setLineDash([]);
            Namespace.UiUtils.DrawLines(ctx, dp.arrowLines);
        }
    }


    /** 
     * Recalculates drawing parameters.
     * @private
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        const bond = this.bond;
        const parent = this.parent;

        // Get the start and ednp points of the bond line
        const leftObjGraphic = parent.stringGraphic. getChildGraphic(bond.leftObject);
        const rightObjGraphic = parent.stringGraphic.getChildGraphic(bond.rightObject);
        if (!leftObjGraphic || !rightObjGraphic) { 
            dp.canvasWidth = dp.canvasHeight = 0;
            return false; 
        }

        dp.pta = leftObjGraphic.drawParams.attachPoints.bondR1;
        dp.ptb = rightObjGraphic.drawParams.attachPoints.bondL1;

        // Get the control point (for drawing a curved line)
        const sn = parent.wkspUi.copycat.slipnet;
        const stringDp = parent.stringGraphic.drawParams;
        const bump = bond.directionCategory == sn.right ? 1.0*stringDp.fontSize : 0.4*stringDp.fontSize;
        dp.ptc = {x: (dp.pta.x + dp.ptb.x)/2, y: Math.min(dp.pta.y, dp.ptb.y) - bump};

        // Calculate the grope lines
        const CalcZigzagLine = Namespace.UiUtils.CalcZigzagLine;
        const gBump =  0.25*stringDp.fontSize;
        const ptg = {x: (dp.pta.x + dp.ptb.x)/2, y: (dp.pta.y + dp.ptb.y)/2 - gBump};
        dp.gropeLineA = CalcZigzagLine(ctx, dp.pta.x, dp.pta.y, dp.pta.x + 0.8*(ptg.x - dp.pta.x), dp.pta.y + 0.8*(ptg.y - dp.pta.y));
        dp.gropeLineB = CalcZigzagLine(ctx, dp.ptb.x, dp.ptb.y, dp.ptb.x + 0.8*(ptg.x - dp.ptb.x), dp.ptb.y + 0.8*(ptg.y - dp.ptb.y));

        // Calculate the arrow points
        dp.arrowLines = [];
        const arrowScale = h/125;
        const ptab = {x: dp.pta.x/4 + dp.ptc.x/2 + dp.ptb.x/4,  y: dp.pta.y/4 + dp.ptc.y/2 + dp.ptb.y/4};
        if (bond.directionCategory == sn.right) {
            let ptaa = {x: ptab.x - arrowScale, y:ptab.y - 0.9*arrowScale};
            let ptac = {x: ptab.x - arrowScale, y:ptab.y + 0.9*arrowScale};
            dp.arrowLines.push(ptaa, ptab, ptac);
        }
        else if (bond.directionCategory == sn.left) {
            let ptaa = {x: ptab.x + arrowScale, y:ptab.y - 0.9*arrowScale};
            let ptac = {x: ptab.x + arrowScale, y:ptab.y + 0.9*arrowScale};
            dp.arrowLines.push(ptaa, ptab, ptac);
        }

        const chsp = stringDp.charSpacing;
        dp.lineDash = {
            proposed: [Math.max(1, chsp/16), Math.max(1, chsp/16)],
            evaluated: [Math.max(1, chsp/4), Math.max(1, chsp/4)],
            grope:[],
            built: []
        };

        return true;
    }
    
};

})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class implements a UI for displaying the state of the Coderack.
 * 
 */
Namespace.CoderackUi = class {

    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.parentDiv = parentDiv;
        this.copycat = copycatUi.copycat;
        this.title = "Coderack";
        this.drawParams = {};

        this.bkgndColor = '#ffe5e0';
        this.titleColor = '#606060';
        this.colNameColor ='#404040';

        this.canvas =  Namespace.UiUtils.CreateElement('canvas', 
            'coderack-canvas', parentDiv, {position:'absolute', 
            margin:'0', padding:'0', top:'0%', left:'0%', width:'100%', 
            height:'100%', border: '1px solid', background:this.bkgndColor}
        );  

        this.codeletList = this._buildCodeletList();
        this.codeletDict = Object.fromEntries(
            this.codeletList.map((x,i) => [x.id, i]));
    }


    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this.redraw();
    }    

    
    /**
     * Handler for resize events.
     * @private
     * 
     */
    _onResize()
    {    
        this.redraw();
    }


    /**
     * Updates the UI.
     * 
     */
    redraw()
    {
        const UiUtils = Namespace.UiUtils;
        const canvas = this.canvas;
        const ctx = canvas.getContext("2d");
        const dp = this.drawParams;

        // Only if necessary, resize the canvas and clear it
        if ( !UiUtils.RightsizeCanvas(canvas) ) { return; } 
        const rescale = UiUtils.NeedToRescale(this.drawParams, ctx);
        if (rescale) {
            if (!this._updateDrawParams(ctx)) { return; }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the title 
            ctx.font = dp.titleFont;
            ctx.textAlign = "center";
            ctx.fillStyle = this.titleColor;
            ctx.fillText(this.title, dp.titleX, dp.titleY);

            // Draw the column headers
            ctx.font = dp.colHeaderFont;
            ctx.fillStyle = this.colNameColor;
            ctx.fillText("#", dp.col0hdr.x, dp.col0hdr.y);
            ctx.fillText("Codelet",  dp.col1hdr.x, dp.col1hdr.y);
            ctx.fillText("Prob.",  dp.col2hdr.x, dp.col2hdr.y);

            // Draw the codelet names
            ctx.font = dp.codeletFont;
            ctx.textAlign = "left";  
            dp.textLines.forEach(line => ctx.fillText(...line) );
        }
        else{
            ctx.clearRect(...dp.countRect);
            ctx.clearRect(...dp.barGraphsRect);
        }

        // Draw the grid
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        for (let line of dp.gridLines) {
            UiUtils.DrawLine(ctx, line.xa, line.ya, line.xb, line.yb);
        }

        // Draw the codelet counts
        const coderack = this.copycat.coderack;
        let counts = new Array(this.codeletList.length).fill(0);
        coderack.codelets.forEach(codelet => counts[this.codeletDict[codelet.name]]++ );
        let totalCodelets = counts.reduce((a,b) => a+b, 0);
        ctx.fillStyle = 'black';
        ctx.textAlign = "center";
        for (let r=0; r<dp.nRows; r++) {
            let count = (r == dp.nRows-1) ? totalCodelets : counts[r];          
            ctx.fillText(count.toString(), ...dp.countCoords[r]);
        }

        // Draw the last-run-codelet indicator
        if (coderack.lastRunCodelet) {
            const row = this.codeletDict[coderack.lastRunCodelet.name];
            const verts = dp.lastRunIndicatorCoords[row];
            ctx.fillStyle = 'black';
            ctx.beginPath();   
            ctx.moveTo(...verts[0]);  
            ctx.lineTo(...verts[1]); 
            ctx.lineTo(...verts[2]); 
            ctx.closePath(); 
            ctx.fill();            
        }

        // Draw the bar graphs
        let probs = coderack.getCodeletRunProbabilities();
        const groupedProbs = Object.fromEntries(
            this.codeletList.map(x => [x.id, 0]));
        for (let i=0; i<probs.length; i++) {
            groupedProbs[coderack.codelets[i].name] += probs[i];
        }
        ctx.fillStyle = 'black';
        for (let r=0; r<dp.nRows-1; r++) {    
            let prob = groupedProbs[this.codeletList[r].id];
            let bar = dp.bars[r];
            ctx.beginPath();
            ctx.fillRect(bar.l, bar.t, Math.min(1, 1.2*prob)*bar.w, bar.h);
            ctx.stroke();
        }
    }


    /** 
     * Recalculates the drawing parameters for this object.
     * 
     * @private
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;
    
        // Title params
        let fontSize = Math.max(8, Math.round(Math.min(w/9, h/32)));
        dp.titleFont = 'italic bold ' + fontSize.toString() + 'px Arial';
        ctx.font = dp.titleFont;
        let titleHeight = ctx.measureText(this.title).actualBoundingBoxAscent;
        dp.titleX = w/2;
        dp.titleY = 1.4*titleHeight;

        // Column header paramss
        const column0Width = Math.round(0.125*w);
        const column1Width = Math.round(0.475*w);
        const column2Width = Math.round(w - column0Width - column1Width);
        fontSize = Math.round(0.6*fontSize);
        dp.colHeaderFont = 'italic bold ' + fontSize.toString() + 'px serif';
        dp.col0hdr = {}; dp.col1hdr = {}; dp.col2hdr = {};
        dp.col0hdr.y = dp.col1hdr.y = dp.col2hdr.y = 3.4 * titleHeight;
        dp.col0hdr.x = column0Width/2;
        dp.col1hdr.x = column0Width + column1Width/2;
        dp.col2hdr.x = column0Width + column1Width + column2Width/2;

        // Grid params
        dp.tableTopOffset = 3.7 * titleHeight;
        dp.nRows = this.codeletList.length + 1;
        dp.cellHeight = (h - dp.tableTopOffset)/dp.nRows;
        dp.gridLines = [];
        for (let r=0; r<dp.nRows; r++) {
            let y = Math.round(dp.tableTopOffset + r*dp.cellHeight) + 0.5;
            let x = (r == 0) ? w : 0.6*w;
            dp.gridLines.push({xa:0, ya:y, xb:x, yb:y});
        }
        let x = Math.round(column0Width) + 0.5;
        dp.gridLines.push({xa:x, ya:dp.tableTopOffset, xb:x, yb:h});
        x = Math.round(column0Width + column1Width) + 0.5;
        dp.gridLines.push({xa:x, ya:dp.tableTopOffset, xb:x, yb:h});        

        // Bar graph region
        dp.barGraphsRect = [x+1, dp.tableTopOffset+1, w-x-1, h - dp.tableTopOffset-1];

        // Codelet-counts region
        dp.countRect = [1, dp.tableTopOffset+1, column0Width-1, h - dp.tableTopOffset-1];

        // Codelet font size
        const measureString = "Important-object"; // longest codelet word
        fontSize = Math.round(Math.min(w/18, dp.cellHeight/3.4) * 4/3);
        ctx.font = fontSize.toString() + 'px Verdana';
        let meas = ctx.measureText(measureString);
        while ((meas.width > 0.95*column1Width) || (meas.actualBoundingBoxAscent > dp.cellHeight/3)) {
            fontSize--;
            ctx.font = fontSize.toString() + 'px Verdana';
            meas = ctx.measureText(measureString);
            if (fontSize <= 6) { break; }
        }
        dp.codeletFont = ctx.font;

        // Codelet names
        const dh = (dp.cellHeight - 2.4*meas.actualBoundingBoxAscent)/2;
        x = column0Width + 4;
        dp.textLines = [];
        for (let r=0; r<dp.nRows; r++) 
        { 
            let codeletLines = (r < dp.nRows-1) ? this.codeletList[r].text.split('/') : ['Total'];
            let cellTop = dp.tableTopOffset + r*dp.cellHeight;
            if (codeletLines.length == 1) {
                let y = cellTop + 0.5*dp.cellHeight + 0.5*meas.actualBoundingBoxAscent;
                dp.textLines.push([codeletLines[0], x, y]);
            }
            else {
                let y = cellTop + dh + meas.actualBoundingBoxAscent;
                dp.textLines.push([codeletLines[0], x, y]);
                y += 1.4*meas.actualBoundingBoxAscent;
                dp.textLines.push([codeletLines[1], x, y]);
            }
        } 

        // Codelet-count coordinates
        dp.countCoords = [];
        for (let r=0; r<dp.nRows; r++) {
            let y = dp.tableTopOffset + (r + 0.5)*dp.cellHeight + 0.5*meas.actualBoundingBoxAscent;
            dp.countCoords.push([column0Width/2, y]);
        }

        // Last-run indicator coordinates
        dp.lastRunIndicatorCoords = [];
        for (let r=0; r<dp.nRows; r++) {
            const y0 = dp.tableTopOffset + r*dp.cellHeight + 1;
            const y1 = y0 + dp.cellHeight/3;
            const x0 = (2/3)*column0Width;
            const x1 = column0Width;
            dp.lastRunIndicatorCoords.push([[x0,y0], [x1,y0], [x1,y1]]);
        }

        // Bar graph coordinates
        const barLeft = column0Width + column1Width + 1;
        const barHeight = 0.8 * dp.cellHeight;
        dp.bars = [];
        for (let r=0; r<dp.nRows-1; r++) {    
            let cellTop = dp.tableTopOffset + r*dp.cellHeight;
            dp.bars.push({l:barLeft, t:cellTop + 0.1*dp.cellHeight, w:0.4*w, h:barHeight});
        }
        return true;
    }


    /**
     * Builds the list of known codelets.
     * @private
     */
    _buildCodeletList()
    {
        const codeletList = [
            {id:'bottom-up-bond-scout', text: 'Bottom-up/bond scout'},
            {id:'top-down-bond-scout--category', text: 'Top-down bond/categ. scout'},
            {id:'top-down-bond-scout--direction', text: 'Top-down bond/dir\'n scout'},
            {id:'bond-strength-tester', text: 'Bond strength/tester'},
            {id:'bond-builder', text: 'Bond builder'},

            {id:'bottom-up-description-scout', text: 'Bottom-up/descrip. scout'},
            {id:'top-down-description-scout', text: 'Top-down/descrip. scout'},
            {id:'description-strength-tester', text: 'Description/strength tester'},
            {id:'description-builder', text: 'Description/builder'},

            {id:'group-scout--whole-string', text: 'Whole-string/group scout'},
            {id:'top-down-group-scout--category', text: 'Top-down group/categ. scout'},
            {id:'top-down-group-scout--direction', text: 'Top-down group/dir\'n scout'},
            {id:'group-strength-tester', text: 'Group strength/tester'},
            {id:'group-builder', text: 'Group builder'},

            {id:'bottom-up-correspondence-scout', text: 'Bottom-up/corresp. scout'},
            {id:'important-object-correspondence-scout', text: 'Important-object/corresp. scout'},
            {id:'correspondence-strength-tester', text: 'Correspondence/strength tester'},
            {id:'correspondence-builder', text: 'Correspondence/builder'},

            {id:'replacement-finder', text: 'Replacement/finder'},

            {id:'rule-scout', text: 'Rule scout'},
            {id:'rule-strength-tester', text: 'Rule strength/tester'},
            {id:'rule-builder', text: 'Rule builder'},            
            {id:'rule-translator', text: 'Rule translator'},     
            
            {id:'breaker', text: 'Breaker'}
        ];
        return codeletList;
    }
};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This is the top level container for the Copycat UI elements.
 * 
 */
Namespace.CopycatUi = class {

    /**
     * @constructor
     * 
     * @param {Copycat} copycat - The Copycat instance to be visualized.
     */
    constructor(copycat) 
    { 
        this.copycat = copycat;
        this.rafId = null;

        // Create the UI elements
        this.topbarUi          = new Namespace.TopbarUi(this, document.getElementById('topbar_area'));
        this.inputUi           = new Namespace.InputUi(this, document.getElementById('input_area'));
        this.workspaceHeaderUi = new Namespace.WorkspaceHeaderUi(this, document.getElementById('workspace_header_area'));
        this.workspaceUi       = new Namespace.WorkspaceUi(this, document.getElementById('workspace_area'));
        this.slipnetUi         = new Namespace.SlipnetUi(this, document.getElementById('slipnet_area'));
        this.coderackUi        = new Namespace.CoderackUi(this, document.getElementById('coderack_area')); 
        this.batchmodeUi       = new Namespace.BatchmodeUi(this, document.getElementById('batchmode_area')); 

        this.singleModeUiList  = [this.topbarUi, this.inputUi, this.workspaceHeaderUi, this.workspaceUi, this.slipnetUi, this.coderackUi];
        this.batchModeUiList   = [this.topbarUi, this.inputUi, this.batchmodeUi];
        this.uiList = this.singleModeUiList;

        // Listen for resize events
        const resizeFunc = this._onResize.bind(this);
        window.addEventListener('resize', resizeFunc);
        window.addEventListener('orientationchange', resizeFunc);

        // Do an initial rendering, after the DOM settles.
        setTimeout( resizeFunc, 250 );
        setTimeout( resizeFunc, 1500 );    
    }


    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this.uiList.forEach( ui => ui._onCopycatStateChange() );
    }


    /**
     * Handler for batchmode-toggle events
     * @private
     * 
     */
    _onBatchModeToggled()
    {
        this.batchmodeUi.parentDiv.style.display = this.copycat.batchMode ? 'block' : 'none';

        [this.workspaceHeaderUi, this.workspaceUi, this.slipnetUi, this.coderackUi].forEach( 
            ui => ui.parentDiv.style.display = this.copycat.batchMode ? 'none' : 'block');

        this.inputUi.parentDiv.style.width = this.copycat.batchMode ? '100%' : '60%';

        this.uiList = this.copycat.batchMode ? this.batchModeUiList : this.singleModeUiList;
        this._onCopycatStateChange();
        this._onResize();
    }


    /**
     * Handler for resize events.
     * @private
     *
     */
    _onResize()
    { 
        if ( this.rafId ) { window.cancelAnimationFrame(this.rafId); }

        this.rafId = window.requestAnimationFrame( () => {          
                this.uiList.forEach( ui => ui._onResize() );
                this.rafId = null;
            }
        );
    }


    /**
     * Makes sure that all input strings are valid.
     * @private 
     * 
     */
    checkInputStrings()
    {
        const wksp = this.copycat.workspace;
        const inputStrings = this.inputUi.getInputStrings();
        const wkspStrings = [wksp.initialWString.jstring, wksp.modifiedWString.jstring, wksp.targetWString.jstring];
        const inputModified = !inputStrings.every((str, idx) => str.toLowerCase() == wkspStrings[idx]);
        
        if (inputModified) {
            if (inputStrings.every(this.copycat.checkInputString)) {
                this.copycat.setStrings(...inputStrings);
                return true;
            } else {
                this.inputUi.displayMessage('Invalid input!');
                return false;
            }
        }
        else {
            return true;
        }
    }

};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing Correspondence graphics.
 * 
 */
Namespace.CorrsGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent UI.
     * 
     */
    constructor(workspaceUi)
    { 
        this.wkspUi = workspaceUi;
        this.initialString = workspaceUi.initialStringGraphic.wstring;
        this.targetString = workspaceUi.targetStringGraphic.wstring;

        this.drawnCorrs = [];
        this.cache = [];
    }


    /**
     * Utility method that indicates whether two Correspondences
     * refer to the same initial and target objects.
     * @private 
     */
    _sameReferents(corr1, corr2) {
        return (corr1.objFromInitial === corr2.objFromInitial) && (corr1.objFromTarget === corr2.objFromTarget);
    }


    /**
     * Utility method that indicates whether a Correspondences
     * is between two string-spanning groups.
     * @private 
     */    
    _hasStringSpanningGroups(corr) {
        return (corr.objFromInitial instanceof Namespace.Group) && (corr.objFromTarget instanceof Namespace.Group) &&
               (corr.objFromInitial.spansString()) && (corr.objFromTarget.spansString());
    }


    /**
     * Draws the correspondence lines. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Check whether the input strings have changed
        const wkspUi = this.wkspUi;
        if ((this.initialString !== wkspUi.initialStringGraphic.wstring) || (this.targetString !== wkspUi.targetStringGraphic.wstring)) {
            this.initialString = wkspUi.initialStringGraphic.wstring;
            this.targetString = wkspUi.targetStringGraphic.wstring;
            this.cache = [];
        }

        // Get all the correspondences that need to be drawn
        const copycat = this.wkspUi.copycat;
        const wksp = copycat.workspace;
        const coderack = copycat.coderack;

        let builtCorrs = copycat.workspace.structures.filter(s => (s instanceof Namespace.Correspondence));

        let evaluatedCorrs = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.CorrespondenceStrengthTester)).map(c => c.correspondence);

        let proposedCorrs = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.CorrespondenceBuilder)).map(c => c.correspondence);

        // Remove duplicates and obsolete cases
        proposedCorrs = proposedCorrs.filter(p =>
            !evaluatedCorrs.some(e => this._sameReferents(e,p)) &&
            !builtCorrs.some(b => this._sameReferents(b,p)) &&
            wksp.structures.includes(p.objFromInitial) &&
            wksp.structures.includes(p.objFromTarget));

        evaluatedCorrs = evaluatedCorrs.filter(e =>
            !builtCorrs.some(b => this._sameReferents(b,e)) &&
            wksp.structures.includes(e.objFromInitial) &&
            wksp.structures.includes(e.objFromTarget));
        
        // Draw them
        proposedCorrs.forEach(p => {
            this._getCorrGraphic(p, 'proposed').redraw(ctx);
        });

        evaluatedCorrs.forEach(e => {
            this._getCorrGraphic(e, 'evaluated').redraw(ctx);
        });

        // Draw the built correspondences, but drawm the string-spanning
        // one last.
        const ssBuiltCorrs = [];
        let i = 0;
        builtCorrs.forEach(b => {
            if (!this._hasStringSpanningGroups(b)) {
                this._getCorrGraphic(b, 'built').redraw(ctx, i++);
            }
            else { ssBuiltCorrs.push(b);}
        });
        ssBuiltCorrs.forEach(b => {
            this._getCorrGraphic(b, 'built').redraw(ctx, i++);
        });

        this.drawnCorrs = proposedCorrs.concat(evaluatedCorrs, builtCorrs);
    }


    /**
     * Gets or creates the graphic for a given correspondence.
     * @private
     */
    _getCorrGraphic(corresp, type)
    {
        let correspGraphic = this.cache.find(g => g.corresp == corresp);

        if (!correspGraphic) {
            correspGraphic = new Namespace.CorrGraphic(corresp, type, this);
            this.cache.push(correspGraphic);
            if (this.cache.length > 100) {this.cache.shift(); }
        }
        correspGraphic.type = type;
        return correspGraphic;
    }


    /**
     * Flashes a proposed-Correspondence graphic.
     * 
     * @param {Correspondence} corresp - The correspondence to flash.
     * @param {Number} count - The number of times to flash.
     */
    flashProposed(corresp, count=3) 
    {
        if (!this.drawnCorrs.some(c => this._sameReferents(c, corresp))) {
            const correspGraphic = new Namespace.CorrGraphic(corresp, 'proposed', this);
            this.wkspUi.flash(correspGraphic, count);
        }
    }


    /**
     * Flashes a potential-Correspondence graphic.
     * 
     * @param {Correspondence} corresp - The correspondence to flash.
     * @param {Number} count - The number of times to flash.
     */
    flashGrope(corresp, count=3)
    {
        if (!this.drawnCorrs.some(c => this._sameReferents(c, corresp))) {
            const correspGraphic = new Namespace.CorrGraphic(corresp, 'grope', this);
            this.wkspUi.flash(correspGraphic, count);
        }        
    }
};


/**
 * @classdesc
 * This class is responsible for drawing a single Correspondence line.
 * 
 */
Namespace.CorrGraphic = class
{
    /**
     * @constructor
     * 
     * @param {Correspondence} corr - The associated correspondence.
     * @param {String} type - The type ('proposed', 'evaluated', or 'built').
     * @param {CorrsGraphic} parent - The collection that owns this graphic.
     * 
     */
    constructor(corr, type, parent) 
    { 
        this.corr = corr; 
        this.type = type;
        this.parent = parent;
        this.drawParams = {};
    }


    /**
     * Draws the correspondence line.
     * 
     */
    redraw(ctx, index=0)
    {
        // Update our drawing parameters if necessary
        const UiUtils = Namespace.UiUtils;
        if ( UiUtils.NeedToRescale(this.drawParams, ctx) ) {
            if (!this._updateDrawParams(ctx)) { return; }
        }

        const dp = this.drawParams;
        ctx.strokeStyle = this.parent.wkspUi.correspColor;
        ctx.lineWidth = 1;
        ctx.setLineDash(dp.lineDash[this.type]);

        if (this.type == 'grope') {
            const n = Math.round(dp.zigzagLinePts.length/3);
            UiUtils.DrawLines(ctx, dp.zigzagLinePts.slice(0, n));
            UiUtils.DrawLines(ctx, dp.zigzagLinePts.slice(2*n));
        }
        else if (this.type != 'built') {
            UiUtils.DrawLines(ctx, dp.straightLinePts);
        } 
        else {
            // Draw the correspondence line, with its footnote
            // number overlaid
            UiUtils.DrawLines(ctx, dp.zigzagLinePts);
            ctx.fillStyle = 'yellow';
            ctx.fillRect(...dp.labelRect);
            ctx.textAlign = 'center';  
            ctx.fillStyle = this.parent.wkspUi.correspColor;
            ctx.font = dp.footnumFont;
            ctx.fillText((index+1).toString(), dp.labelPosX, dp.labelPosY); 
            
            // Now draw the footnote text
            ctx.font = dp.footnoteFont;
            ctx.textAlign = 'left';  

            const xOffset = dp.hasStringSpanningGroups ? 0: index * dp.textSpacingX;
            ctx.fillText((index+1).toString(), dp.footnotePosX + xOffset, dp.footnotePosY);
            const cms = this.corr.conceptMappings.concat(this.corr.accessoryConceptMappings);
            cms.sort( (a, b) => b.initialDescriptor.depth - a.initialDescriptor.depth);
            cms.forEach((cm, n) => {
                const text = cm.initialDescriptor.shortName + ' ' +
                    String.fromCharCode(8594) + ' ' + cm.targetDescriptor.shortName;
                ctx.fillText(text, dp.textPosX + xOffset, dp.textPosY + n*dp.textSpacingY);
            });
        }
    }


    /** 
     * Recalculates drawing parameters.
     * @private
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        const objA = this.corr.objFromInitial;
        const objB = this.corr.objFromTarget;
        dp.hasStringSpanningGroups = this.parent._hasStringSpanningGroups(this.corr);

        const wkspUi = this.parent.wkspUi;
        const initialGraphic = wkspUi.initialStringGraphic.getChildGraphic(objA);
        const targetGraphic = wkspUi.targetStringGraphic.getChildGraphic(objB);
        if (!initialGraphic || !targetGraphic) { 
            dp.canvasWidth = dp.canvasHeight = 0;
            return false; 
        }

        dp.zigzagLinePts = [];
        const CalcZigzagLine = Namespace.UiUtils.CalcZigzagLine;
        let [pti, ptt, ptb, ptc] = [null, null, null, null];
        if (dp.hasStringSpanningGroups) {
            pti = initialGraphic.drawParams.attachPoints['correspRight'];
            ptt = targetGraphic.drawParams.attachPoints['correspRight'];
            ptb = {x: pti.x + w/24, y: pti.y};
            ptc = {x: ptb.x, y: ptt.y};
            dp.zigzagLinePts = dp.zigzagLinePts.concat(CalcZigzagLine(ctx, pti.x, pti.y, ptb.x, ptb.y));
            dp.zigzagLinePts = dp.zigzagLinePts.concat(CalcZigzagLine(ctx, ptb.x, ptb.y, ptc.x, ptc.y));
            dp.zigzagLinePts = dp.zigzagLinePts.concat(CalcZigzagLine(ctx, ptc.x, ptc.y, ptt.x, ptt.y));
            dp.straightLinePts = [pti, ptb, ptc, ptt];
        }
        else {
            pti = initialGraphic.drawParams.attachPoints['correspBtm'];
            ptt = targetGraphic.drawParams.attachPoints['correspTop'];
            dp.zigzagLinePts = CalcZigzagLine(ctx, pti.x, pti.y, ptt.x, ptt.y);
            dp.straightLinePts = [pti, ptt];
        }

        const sz = wkspUi.initialStringGraphic.drawParams.maxCharAscent/20;
        dp.lineDash = {
            proposed: [Math.max(2, 2*sz), Math.max(8, 8*sz)],
            evaluated: [Math.max(8, 8*sz), Math.max(6, 6*sz)],
            grope: [],
            built: []
        };

        dp.textFontSize = Math.round(wkspUi.targetStringGraphic.drawParams.fontSize/2.25);
        dp.footnoteFont = 'italic ' + dp.textFontSize.toString() + 'px serif';

        if (!dp.hasStringSpanningGroups) {
            dp.textPosX = w/20;
            dp.textPosY = 0.85*h;
            dp.labelPosX = 0.7*pti.x + 0.3*ptt.x;
            dp.labelPosY = 0.7*pti.y + 0.3*ptt.y;
        } else {
            dp.textPosX = ptb.x + dp.textFontSize;
            dp.textPosY = 0.75*ptb.y + 0.25*ptc.y;
            dp.labelPosX = 0.50*ptb.x + 0.50*ptc.x;
            dp.labelPosY = 0.50*ptb.y + 0.50*ptc.y;
        }
        dp.textSpacingX = 8 * dp.textFontSize;
        dp.textSpacingY = 1.2 * dp.textFontSize;
        dp.footnotePosX = dp.textPosX - 0.5*dp.textFontSize;
        dp.footnotePosY = dp.textPosY - 0.5*dp.textFontSize;
        dp.labelRect = [dp.labelPosX - 0.7*dp.textFontSize, dp.labelPosY - 1.1*dp.textFontSize,
            1.4*dp.textFontSize, 1.4*dp.textFontSize];
        dp.footnumFont = 'italic bold ' + (dp.textFontSize+2).toString() + 'px serif';

        return true;
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the Descriptions of 
 * letters in a given string.
 * 
 */
Namespace.DescriptionsGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {StringGraphic} stringGraphic - The parent graphic.
     * 
     */
    constructor(stringGraphic) 
    { 
        this.stringGraphic = stringGraphic; 
        this.wstring = stringGraphic.wstring;
        this.wkspUi = stringGraphic.wkspUi;

        this.descriptionGraphics = stringGraphic.lettersGraphic.letterGraphics.map(
            lg => new Namespace.DescriptionGraphic(lg, this));
    }


    /**
     * Draws the descriptions. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        this.descriptionGraphics.forEach(g => g.redraw(ctx));                    
    }
};


/**
 * @classdesc
 * This class draws a single Description.
 * 
 */
Namespace.DescriptionGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {LetterGraphic} lg - The associated LetterGraphic.
     * @param {DescriptionsGraphic} parent - The DescriptionsGraphic that 
     *     owns this object.
     */
    constructor(lg, parent) 
    { 
        this.letterGraphic = lg;
        this.parent = parent;
        this.drawParams = {};
    }

    /**
     * Draws the Description graphics. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        if (Namespace.UiUtils.NeedToRescale(this.drawParams, ctx)) {
            this._updateDrawParams(ctx);
        }
        
        const wkspUi = this.parent.wkspUi;
        const dp = this.drawParams; 
        ctx.textAlign = 'left';
        ctx.fillStyle = wkspUi.descriptionColor;

        const descrips = this.letterGraphic.letter.descriptions;
        for (let i=0; i<descrips.length; i++) {
            const descriptor = descrips[i].descriptor;
            ctx.font = descriptor.isFullyActive() ? dp.boldFont : dp.normalFont;
            ctx.fillStyle = descriptor.isFullyActive() ? wkspUi.activeDescriptionColor : wkspUi.descriptionColor;
            ctx.fillText(descriptor.shortName, dp.x, dp.y - i*1.2*dp.fontSize);
        }
    }            


    /** 
     * Recalculates the drawing parameters for this object.
     * @private
     * 
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        // Set the font parameters
        const letterDp = this.letterGraphic.drawParams;
        const stringDp = this.letterGraphic.parent.stringGraphic.drawParams;
        dp.fontSize = Math.round(letterDp.fontSize/2.5);
        dp.normalFont = 'italic ' + dp.fontSize.toString() + 'px serif';
        dp.boldFont = 'italic bold ' + dp.fontSize.toString() + 'px serif';
   
        dp.x = letterDp.bbox.l;
        dp.y = stringDp.top - letterDp.fontSize;
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for displaying transient animated graphics.
 * 
 */
Namespace.Flasher = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent Ui.
     *
     */
    constructor(workspaceUi) 
    { 
        this.wkspUi = workspaceUi;
        this.copycat = workspaceUi.copycat;

        // Create my flash canvas
        this.canvas = Namespace.UiUtils.CreateElement('canvas', 
            'flash-canvas', this.wkspUi.parentDiv, {position:'absolute', 
            top:'0%', left:'0%', width:'100%', height:'100%', 
            border: '1px solid', borderTop:0, borderLeft:'none',
            zIndex:2}
        );

        this.canvasCtx = this.canvas.getContext("2d");
        this.flashables = [];
        this.state = 'idle';
        this.rafId = null;
    }


    /**
     * Flashes a graphic a specified number of times.
     * 
     * @param {Graphic} graphic - The graphic to flash.
     * @param {Number} flashCount - The number of times to flash.
     *
     */
    flash(graphic, flashCount)
    {
        if (flashCount <= 0) { return; }
        if (this.copycat.stepDelay < 10) { return;} // Don't flash if we're trying to run fast

        this.flashables.push( {graphic:graphic, flashCount:flashCount} );

        if (this.state == 'idle') { 
            this.state = 'running';
            this._animationLoop();
        }     
    }


    /**
     * Indicated whether the animation loop is idle.
     * 
     */
    isIdle()
    {
        return (this.state == 'idle');
    }


    /**
     * Runs the animation loop.
     * 
     */
    _animationLoop()
    { 
        window.requestAnimationFrame( () => 
        {          
            this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw the first-in-line item
            const f = this.flashables[0];
            f.graphic.redraw(this.canvasCtx);
            f.flashCount--;
            if (f.flashCount <= 0) {
                this.flashables.shift();
            }

            // Erase everything after a delay
            setTimeout( () => {
                window.requestAnimationFrame( () => {    
                    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    if (this.flashables.length === 0) {
                        this.state = 'idle';
                        this.wkspUi.redraw();
                    } else {
                        setTimeout(
                            () => { this._animationLoop(); }, 
                            Math.min(100, 1.5*this.copycat.stepDelay)
                        );
                    }
                });
            },  Math.min(100, 1.5*this.copycat.stepDelay));
        });        
    }

};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the Group boxes
 *   associated with a given string.
 * 
 */
Namespace.GroupsGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {StringGraphic} stringGraphic - The parent graphic.
     * 
     */
    constructor(stringGraphic) 
    { 
        this.stringGraphic = stringGraphic; 
        this.wstring = stringGraphic.wstring;
        this.wkspUi = stringGraphic.wkspUi;
        this.groupGraphics = [];
        this.drawnGroups = [];
        this.cache = [];
    }

    /**
     * Utility method that indicates whether two Groups
     * refer to the same objects.
     * @private 
     */
    _sameReferents(g1, g2) {
        return (g1.leftObject === g2.leftObject) && (g1.rightObject === g2.rightObject);
    }


    /**
     * Draws the group boxes 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Get all the groups that need to be drawn
        const wksp = this.stringGraphic.wkspUi.workspace;
        const coderack = this.stringGraphic.wkspUi.copycat.coderack;

        let builtGroups = wksp.structures.filter(s => 
            (s instanceof Namespace.Group) && (s.string == this.wstring));

        let evaluatedGroups = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.GroupStrengthTester) && 
            (c.group.string == this.wstring)).map(c => c.group);

        let proposedGroups = coderack.codelets.filter(c =>
            (c instanceof Namespace.Codelets.GroupBuilder) && 
            (c.group.string == this.wstring)).map(c => c.group);

        // Remove duplicates
        proposedGroups = proposedGroups.filter(g =>
            !evaluatedGroups.some(e => this._sameReferents(e,g)) && 
            !builtGroups.some(b => this._sameReferents(b,g)));

        evaluatedGroups = evaluatedGroups.filter(g =>
            !builtGroups.some(b => this._sameReferents(b,g)));
        
        // Draw them
        this.groupGraphics = [];
        proposedGroups.forEach( g => { 
            const gg = this._getGroupGraphic(g, 'proposed');
            gg.redraw(ctx);
            this.groupGraphics.push(gg);
        });

        evaluatedGroups.forEach( g => { 
            const gg = this._getGroupGraphic(g, 'evaluated');
            gg.redraw(ctx);
            this.groupGraphics.push(gg);
        });

        builtGroups.forEach( g => { 
            const gg = this._getGroupGraphic(g, 'built');
            gg.redraw(ctx);
            this.groupGraphics.push(gg);
        });

        this.drawnGroups = proposedGroups.concat(evaluatedGroups, builtGroups);
    }


    /**
     * Gets or creates the graphic for a given group.
     * @private
     */
    _getGroupGraphic(group, type)
    {
        let groupGraphic = this.cache.find(gg => gg.group == group);

        if (!groupGraphic) {
            groupGraphic = new Namespace.GroupGraphic(group, type, this);
            this.cache.push(groupGraphic);
            if (this.cache.length > 100) { this.cache.shift(); }
        }

        groupGraphic.type = type;
        return groupGraphic;
    }


    /**
     * Flashes a proposed-Group graphic.
     * 
     * @param {Group} group - The group to flash.
     * @param {Number} count - The number of times to flash.
     */
    flashProposed(group, count=3) 
    {
        if (!this.drawnGroups.some(c => this._sameReferents(c, group))) {
            const groupGraphic = new Namespace.GroupGraphic(group, 'proposed', this);
            this.wkspUi.flash(groupGraphic, count);
        }
    }


    /**
     * Flashes a potential-Group graphic.
     * 
     * @param {Group} group - The group to flash.
     * @param {Number} count - The number of times to flash.
     */
    flashGrope(group, count=3)
    {
        if (!this.drawnGroups.some(c => this._sameReferents(c, group))) {
            const groupGraphic = new Namespace.GroupGraphic(group, 'grope', this);
            this.wkspUi.flash(groupGraphic, count);
        }        
    }
};


/**
 * @classdesc
 * This class is responsible for drawing a single Group box.
 * 
 */
Namespace.GroupGraphic = class
{
    /**
     * @constructor
     * 
     * @param {Group} group - The associated group.
     * @param {String} type - The type ('proposed', 'evaluated', or 'built').
     * @param {GroupsGraphic} parent - The collection that owns this graphic.
     * 
     */
    constructor(group, type, parent) 
    { 
        this.group = group; 
        this.type = type;
        this.parent = parent;
        this.drawParams = {};
    }


    /**
     * Draws the group box.
     * 
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        const UiUtils = Namespace.UiUtils;
        if ( UiUtils.NeedToRescale(this.drawParams, ctx) ) {
            this._updateDrawParams(ctx);
        }

        const dp = this.drawParams;
        ctx.strokeStyle = this.parent.wkspUi.groupColor;
        ctx.lineWidth = 1;
        ctx.setLineDash(dp.lineDash[this.type]);

        if (this.type == 'grope') {
            UiUtils.DrawLines(ctx, dp.zigzagLeftPts);
            UiUtils.DrawLines(ctx, dp.zigzagRightPts);
        }
        else {
            ctx.beginPath();
            ctx.rect(dp.x, dp.y, dp.w, dp.h);
            ctx.stroke();
            
            ctx.setLineDash([]);
            UiUtils.DrawLines(ctx, dp.arrowLines);
        }
    }


    /** 
     * Recalculates drawing parameters.
     * @private
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        const group = this.group;
        const stringGraphic = this.parent.stringGraphic;
        const letterGraphics = stringGraphic.lettersGraphic.letterGraphics;
        const stringDp = stringGraphic.drawParams;
        const leftLetterDp = letterGraphics[group.leftIndex-1].drawParams;
        const rightLetterDp = letterGraphics[group.rightIndex-1].drawParams;

        let [l, t, r, b] = [
            leftLetterDp.bbox.l, stringDp.baselineY - stringDp.maxCharAscent,
            rightLetterDp.bbox.r, stringDp.baselineY + stringDp.maxCharDescent];  

        const letterSpan = group.letterSpan();
        const chsp = stringDp.charSpacing;
        const xinflate = chsp * (letterSpan - 1) / 11;
        const yinflate = (h/6) * (letterSpan - 1) / 10;
        dp.x = l - xinflate;
        dp.y = t - yinflate;
        dp.w = r - l + 2*xinflate;
        dp.h = b - t + 2*yinflate;

        dp.zigzagLeftPts = [];
        dp.zigzagRightPts = [];
        const CalcZigzagLine = Namespace.UiUtils.CalcZigzagLine;
        let pta = {x: dp.x + dp.w/4, y:dp.y};
        let ptb = {x: dp.x, y: dp.y};
        let ptc = {x: dp.x, y: dp.y + dp.h};
        let ptd = {x: dp.x + dp.w/4, y: dp.y + dp.h};
        dp.zigzagLeftPts = dp.zigzagLeftPts.concat(
            CalcZigzagLine(ctx, pta.x, pta.y, ptb.x, ptb.y));
        dp.zigzagLeftPts = dp.zigzagLeftPts.concat(
            CalcZigzagLine(ctx, ptb.x, ptb.y, ptc.x, ptc.y));
        dp.zigzagLeftPts = dp.zigzagLeftPts.concat(
            CalcZigzagLine(ctx, ptc.x, ptc.y, ptd.x, ptd.y));

        pta = {x: dp.x + 3*dp.w/4, y:dp.y};
        ptb = {x: dp.x + dp.w, y: dp.y};
        ptc = {x: dp.x + dp.w, y: dp.y + dp.h};
        ptd = {x: dp.x + 3*dp.w/4, y: dp.y + dp.h};
        dp.zigzagRightPts = dp.zigzagRightPts.concat( CalcZigzagLine(ctx, pta.x, pta.y, ptb.x, ptb.y) );
        dp.zigzagRightPts = dp.zigzagRightPts.concat( CalcZigzagLine(ctx, ptb.x, ptb.y, ptc.x, ptc.y) );
        dp.zigzagRightPts = dp.zigzagRightPts.concat( CalcZigzagLine(ctx, ptc.x, ptc.y, ptd.x, ptd.y) );

        const sn = this.parent.wkspUi.copycat.slipnet;
        dp.arrowLines = [];
        if (group.directionCategory == sn.right) {
            let ptb = {x: dp.x + 0.45*dp.w, y:dp.y};
            let pta = {x: ptb.x - h/50, y:ptb.y - h/80};
            let ptc = {x: ptb.x - h/50, y:ptb.y + h/80};
            dp.arrowLines.push(pta, ptb, ptc);
        }
        else if (group.directionCategory == sn.left) {
            let ptb = {x: dp.x + 0.55*dp.w, y:dp.y};
            let pta = {x: ptb.x + h/50, y:ptb.y - h/80};
            let ptc = {x: ptb.x + h/50, y:ptb.y + h/80};
            dp.arrowLines.push(pta, ptb, ptc);
        }

        dp.lineDash = {
            proposed: [Math.max(1, chsp/16), Math.max(1, chsp/16)],
            evaluated: [Math.max(1, chsp/4), Math.max(1, chsp/4)],
            grope: [],
            built: []
        };

        dp.attachPoints = {
            correspTop: {x: dp.x + dp.w/2, y: dp.y},
            correspBtm: {x: dp.x + dp.w/2, y: dp.y + dp.h},
            correspRight: {x: dp.x + dp.w, y: dp.y + dp.h/2},
            bondR1: {x: dp.x + 0.55*dp.w , y: dp.y - stringDp.maxCharAscent/4},
            bondL1: {x: dp.x + 0.45*dp.w , y: dp.y - stringDp.maxCharAscent/4}
        };
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";

/**
 * @classdesc
 * This class implements a dialog for displaying help info.
 * 
 */
Namespace.HelpDialog = class extends Namespace.Dialog
{

    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parent - The html div that hosts the dialog.
     */
    constructor(parent) 
    {
        super(parent, 65, 80, 'Copycat Help', false, '#d5bfa2', '#c09f72');
        this._buildUi();
    }


    _buildUi()
    {
        Namespace.UiUtils.StyleElement(this.userDiv, {overflowX:'auto', overflowY:'scroll'});

        this.textDiv = Namespace.UiUtils.CreateElement('div', 'text-div',
            this.userDiv, {left:'3%', width:'94%', height:'100%', fontSize:'20px', fontFamily:this.fontFamily}
        );

        this.textDiv.innerHTML =
        '<p></p>' + 
        '<p>Copycat is a computer model of human analogy-making.</p>' + 
        '<p>It tries to solve letter puzzles of the form "<b><i>abc</i></b> is to <b><i>abd</i></b> as <b><i>ijk</i></b> is to what?"</p>' +
        '<p>You can enter puzzle strings in the green upper-left area, then click the <i>play</i> button to watch Copycat "think." ' +  
        'You can also pause, single-step, reset, and adjust the speed of the demo.</p>' +

        '<p>Some interesting examples to try are:</p>' +
        '<ul>' +
            '<li> <b><i>abc</b></i> &#x2192; <b><i>abd</b></i>, &nbsp; <b><i>kji</b></i> &#x2192; ?</li>' +
            '<li> <b><i>abc</b></i> &#x2192; <b><i>abd</b></i>, &nbsp; <b><i>iijjkk</b></i> &#x2192; ? </li>' +
            '<li> <b><i>abc</b></i> &#x2192; <b><i>abd</b></i>, &nbsp; <b><i>mrrjjj</b></i> &#x2192; ?</li>' +
        '</ul>' +

        '<p>The algorithm is probabilistic, so you may get different results each time you run it.</p>' + 

        '<p>While running, Copycat displays</p>' +
        '<ul>' +
            '<li> bonds it finds between adjacent letters, as blue lines</li>' +
            '<li> correspondences it finds between the initial and target strings, as purple jagged lines</li>' + 
            '<li> groups that it thinks may be important, as green boxes</li>' +
            '<li> descriptions of all the letters, in gray text</li>' +
        '</ul>' +

        'A flashing graphic indicates a structure that Copycat is considering but hasn&rsquo;t yet committed to.</p>' + 
        
        '<p>The thermometer shows how "happy" Copycat is with its current progress; lower temperatures ' + 
        'imply greater happiness.</p>' +

        '<p>In the yellow <i>Slipnet</i> area, Copycat&rsquo;s built-in concepts are shown in a grid. ' + 
        'The size of the dot over each concept indicates how important that concept is to Copycat at the current moment.</p>' +

        '<p>The pink <i>Coderack</i> area displays the list of subroutines or "codelets" that Copycat ' +
        'uses to perform its work. The number of each type of codelet currently in the coderack is shown in a dynamical ' +
        'bar graph. The last-run codelet is indicated by a black triangle.</p>' +

        '<p>For (much) more information, check out the book <i>Fluid Concepts and Creative Analogies</i> by Douglas Hofstadter et al.</p>';
    }

};

})( window.CopycatJS = window.CopycatJS || {} );












// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class draws the input widgets.
 * 
 */
Namespace.InputUi = class {

    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts
     *  this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.parentDiv = parentDiv;
        this.copycat = copycatUi.copycat;
        this.msgTimerId = null;
        this.drawParams = {};

        this.bkgndColor = '#b3ddcc';
        this.inputFont = {family:'serif', weight: 'bold', style: 'italic', size: '3.5vmin'};
        this.inputFontColor = '#1581e7';
        this.answerFontColor = '#d20000';
        this.inputDisabledFontColor = '#6eb4f2';
        this.msgFontColor = '#d20000';
        this.inputBkgndColor = '#dfdfdf';
        
        this._buildUi();
    }


    /**
     * Creates the ui elements.
     * @private
     * 
     */
    _buildUi()
    {
        const UiUtils = Namespace.UiUtils;
        
        // Create the main div
        this.mainDiv = UiUtils.CreateElement('div', 
            'input-div', this.parentDiv, 
            {top:'0%', left:'0%', width:'100%', height:'100%',
            border:'1px solid black', borderLeft:'none', 
            background:this.bkgndColor}); 

        // Create the text-input elements
        const wa = this.initialStringInput = UiUtils.CreateElement('input',
            'initial-string-input', this.mainDiv, {left:'3%'}, {type:'text'});
        wa.onkeyup = this._onKeyup.bind(this);

        const wb = this.modifiedStringInput = UiUtils.CreateElement('input',
            'modified-string-input', this.mainDiv, {left:'27%'}, {type:'text'});
        wb.onkeyup = this._onKeyup.bind(this);

        const wc = this.targetStringInput = UiUtils.CreateElement('input',
            'target-string-input', this.mainDiv, {left:'55%'}, {type:'text'});
        wc.onkeyup = this._onKeyup.bind(this);

        const wd = this.answerStringInput = UiUtils.CreateElement('input',
            'answer-string-input', this.mainDiv, {left:'79%'}, {type:'text'});
        wd.readOnly = true;
        wd.className += " noselect";

        // Configure the text-input elements
        const font = this.inputFont;
        for (let w of [wa, wb, wc, wd]) {
            UiUtils.StyleElement(w, {top:'28%', width:'18%', height:'44%',
                textAlign:'center', border:'1px solid gray', 
                fontFamily: font.family, fontWeight: font.weight,
                fontStyle: font.style, fontSize: font.size, 
                color: (w == wd) ? this.answerFontColor : this.inputFontColor, 
                background:this.inputBkgndColor});
            w.setAttribute('spellcheck', 'false');
        }
        const wksp = this.copycat.workspace;
        this.initialStringInput.value = wksp.initialWString.jstring;
        this.modifiedStringInput.value = wksp.modifiedWString.jstring;
        this.targetStringInput.value = wksp.targetWString.jstring;
        this.answerStringInput.value = '?';

        // Arrpws
        this.arrowSpan1 = UiUtils.CreateElement('span', 
            'arrow-span1', this.mainDiv, 
            {top:'28%', left:'21%', width:'6%', height:'44%', display:'flex', 
            alignItems:'center', justifyContent:'center', 
            fontWeight: font.weight, fontStyle: font.style, 
            fontSize: font.size},
            {innerHTML:'<b>&#x2192;</b>'}); 
        this.arrowSpan1.className += " noselect";

        this.arrowSpan2 = UiUtils.CreateElement('span', 
            'arrow-span2', this.mainDiv, 
            {top:'28%', left:'73%', width:'6%', height:'44%', display:'flex', 
            alignItems:'center', justifyContent:'center', 
            fontWeight: font.weight, fontStyle: font.style, 
            fontSize: font.size},
            {innerHTML:'<b>&#x2192;</b>'}); 
        this.arrowSpan2.className += " noselect";

        // Message area
        this.messageDiv = UiUtils.CreateElement('div',
            'message-div', this.mainDiv,
            {top:'74%', left:'0%', width:'100%', height:'24%', display:'flex', 
            alignItems:'center', justifyContent:'center',
            fontWeight: font.weight, fontStyle: font.style, 
            fontSize: '3vmin', color:this.msgFontColor}); 
        this.messageDiv.className += " noselect";   

        // Colon separator
        this.colonDiv = UiUtils.CreateElement('div',
            'colon-div', this.mainDiv,
            {top:'0', left:'45%', width:'10%', height:'100%', display:'flex', 
            alignItems:'center', justifyContent:'center',  
            fontWeight: font.weight,
            fontSize: '6vmin', color:'#606060'});
        this.colonDiv.innerHTML = ':&hairsp;:';
        this.colonDiv.className += " noselect";
    }


    /**
     * Returns the strings that are currently entered in the 
     * input fields.
     * 
     */
    getInputStrings()
    {
        const rawStrings = [this.initialStringInput.value, this.modifiedStringInput.value, this.targetStringInput.value];
        const normStrings = rawStrings.map(s => s.trim().toLowerCase());

        this.initialStringInput.value = normStrings[0];
        this.modifiedStringInput.value = normStrings[1];
        this.targetStringInput.value = normStrings[2];

        return normStrings;
    }


    /**
     * Displays a message beneath the input widgets.
     * 
     */ 
    displayMessage(msg)
    {
        this.messageDiv.innerHTML = msg;
        if (this.msgTimerId !== null) {
            clearTimeout(this.msgTimerId);
        }
        this.msgTimerId = setTimeout(() => {
            this.messageDiv.innerHTML = '';
            this.msgTimerId = null;
        }, 1800);
    }


    /**
     * Handler for resize events.
     * @private
     * 
     */
    _onResize()
    {    
        // Nothing to do here.
    }


    /**
     * Handler for state change events.
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        const copycat = this.copycat;
        const ans = copycat.workspace.finalAnswer;
        this.answerStringInput.value = (copycat.batchMode) ? '?' : ans || '?';
        this._setInputsEnabled(copycat.state != 'running');
    } 


    /**
     * Handler for key-up events.
     * @private
     * 
     */
    _onKeyup(e)
    {
        if (e.key === 'Enter' || e.keyCode === 13) {
            this.copycatUi.workspaceHeaderUi._onResetBtnClick();
        }
    }


    /**
     * Enables or disables the input fields.
     * 
     * @private
     */
    _setInputsEnabled(enabled)
    {
        this.initialStringInput.disabled = !enabled;
        this.modifiedStringInput.disabled = !enabled;
        this.targetStringInput.disabled = !enabled;

        this.initialStringInput.style.color = enabled ? this.inputFontColor : this.inputDisabledFontColor;
        this.modifiedStringInput.style.color = enabled ? this.inputFontColor : this.inputDisabledFontColor;
        this.targetStringInput.style.color = enabled ? this.inputFontColor : this.inputDisabledFontColor;
    }
};


})( window.CopycatJS = window.CopycatJS || {} );








// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the letters of a given string.
 * 
 */
Namespace.LettersGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {StringGraphic} stringGraphic - The parent graphic.
     * 
     */
    constructor(stringGraphic) 
    { 
        this.stringGraphic = stringGraphic; 
        this.wkspUi = stringGraphic.wkspUi;

        // Create my letter graphics
        this.letterGraphics = [];

        if (stringGraphic.quadrant != 2) {
            const wstring = this.stringGraphic.wstring;
            for (let i=0; i<wstring.length; i++) {
                this.letterGraphics.push( new Namespace.LetterGraphic(wstring.letters[i], i, this) );
            }
        }
        else {
            const jstring = this.stringGraphic.jstring;
            for (let i=0; i<jstring.length; i++) {
                this.letterGraphics.push( new Namespace.LetterGraphic(jstring[i], i, this) );
            }        
        }

    }


    /**
     * Draws the letters. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        this.letterGraphics.forEach(lg => lg.redraw(ctx));                    
    }
};


/**
 * @classdesc
 * This class draws a single letter from a WorkspaceString.
 * 
 */
Namespace.LetterGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {Letter} letter - The wrapped letter.
     * @param {Number} index - The letter's index in its string.
     * @param {StringGraphic} parent - The StringGraphic that owns this object.
     */
    constructor(letter, index, parent) 
    { 
        if (letter instanceof Namespace.Letter) {
            this.letter = letter;
            this.char = letter.char;
        } else {
            this.letter = null;
            this.char = letter;
        }

        this.index = index;
        this.parent = parent;
        this.stringGraphic = parent.stringGraphic;
        this.wkspUi = parent.wkspUi;
        this.drawParams = {};
    }


    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        if (Namespace.UiUtils.NeedToRescale(this.drawParams, ctx)) {
            this._updateDrawParams(ctx);
        }

        const wkspUi = this.wkspUi;
        const dp = this.drawParams; 
        ctx.font = dp.font;
        ctx.textAlign = 'left';
        ctx.fillStyle = (this.stringGraphic == wkspUi.answerStringGraphic) ? wkspUi.answerLetterColor : wkspUi.letterColor;
        ctx.fillText(this.char, dp.x, dp.y);
    }            


    /** 
     * Recalculates the drawing parameters for this object.
     * @private
     * 
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        // Set the font parameters
        const stringDp = this.parent.stringGraphic.drawParams;
        dp.fontSize = stringDp.fontSize;
        dp.font = stringDp.font;
        ctx.font = dp.font; // Must set the font before measuring text
    
        // Calculate the letter's bounding box
        const charMetrics = ctx.measureText(this.char);
        dp.charWidth = charMetrics.actualBoundingBoxLeft + charMetrics.actualBoundingBoxRight;
        const charHeight = charMetrics.fontBoundingBoxAscent;
    
        dp.x = (this.index === 0) ? stringDp.stringStartX :
            this.parent.letterGraphics[this.index-1].drawParams.bbox.r + stringDp.charSpacing;
        dp.y = stringDp.baselineY;

        dp.bbox = {
            l: dp.x - 0.5*charMetrics.actualBoundingBoxDescent, 
            r: dp.x - 0.5*charMetrics.actualBoundingBoxDescent + dp.charWidth,
            t: dp.y - charMetrics.actualBoundingBoxAscent,
            b: dp.y + charMetrics.actualBoundingBoxDescent
        };

        dp.attachPoints = {
            correspTop: {x: (dp.bbox.l + dp.bbox.r)/2 , y: dp.bbox.t-charHeight/4},
            correspBtm: {x: (dp.bbox.l + dp.bbox.r)/2 , y: dp.bbox.b+charHeight/4},
            correspRight: {x: dp.bbox.r+charHeight/4, y: (dp.bbox.t + dp.bbox.b)/2},
            repl: {x: (dp.bbox.l + dp.bbox.r)/2 , y: stringDp.top - charHeight/4},
            bondR1: {x: dp.bbox.r + charHeight/12, y: stringDp.top + charHeight/3},
            bondL1: {x: dp.bbox.l , y: stringDp.top + charHeight/3}
        };
    }
    
};





})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing Replacement lines.
 * 
 */
Namespace.ReplacementsGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent UI.
     * 
     */
    constructor(workspaceUi)
    { 
        this.wkspUi = workspaceUi;
        this.initialString = workspaceUi.initialStringGraphic.wstring;
        this.modifiedString = workspaceUi.modifiedStringGraphic.wstring;
        this.cache = [];
    }


    /**
     * Draws the replacement lines. 
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas context
     *   to draw on.
     */
    redraw(ctx)
    {
        // Check whether the input strings have changed
        const wkspUi = this.wkspUi;
        if ((this.initialString !== wkspUi.initialStringGraphic.wstring) ||
            (this.modifiedString !== wkspUi.modifiedStringGraphic.wstring)) {
                this.initialString = wkspUi.initialStringGraphic.wstring;
                this.modifiedString = wkspUi.modifiedStringGraphic.wstring;
                this.cache = [];
        }

        // Draw all the replacements that have been found so far
        const wksp = this.wkspUi.workspace;
        const replacements = wksp.initialWString.letters.map(ltr => ltr.replacement).filter(repl => !!repl);
        replacements.forEach(r => { this._getReplacementGraphic(r).redraw(ctx); });
    }


    /**
     * Gets or creates the graphic for a given Replacement object.
     * @private
     */
    _getReplacementGraphic(repl)
    {
        let replGraphic = this.cache.find(g => g.replacement == repl);

        if (!replGraphic) {
            replGraphic = new Namespace.ReplacementGraphic(repl, this);
            this.cache.push(replGraphic);
            if (this.cache.length > 25) {
                this.cache.shift();
            }
        }
        return replGraphic;
    }
};


/**
 * @classdesc
 * This class is responsible for drawing a single Replacement line.
 * 
 */
Namespace.ReplacementGraphic = class
{
    /**
     * @constructor
     * 
     * @param {Replacement} repl - The associated Replacement.
     * @param {CorrsGraphic} parent - The collection that owns this graphic.
     * 
     */
    constructor(repl, parent) 
    { 
        this.replacement = repl; 
        this.parent = parent;
        this.drawParams = {};
    }


    /**
     * Draws the Replacement line.
     * 
     */
    redraw(ctx)
    {
        // Update our drawing parameters if necessary
        if ( Namespace.UiUtils.NeedToRescale(this.drawParams, ctx) ) {
            if (!this._updateDrawParams(ctx)) { return; }
        }

        const dp = this.drawParams;
        ctx.strokeStyle = this.parent.wkspUi.replColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.ellipse(dp.cx, dp.cy, dp.radX, dp.radY, dp.rotAngle, dp.startAngle, dp.endAngle);
        ctx.stroke();        
    }


    /** 
     * Recalculates drawing parameters.
     * @private
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        const wkspUi = this.parent.wkspUi;
        const objA = this.replacement.objFromInitial;
        const objB = this.replacement.objFromModified;
        const initialGraphic = wkspUi.initialStringGraphic.getChildGraphic(objA);
        const modifiedGraphic = wkspUi.modifiedStringGraphic.getChildGraphic(objB);
        if (!initialGraphic || !modifiedGraphic) { 
            dp.canvasWidth = dp.canvasHeight = 0;
            return false; 
        }

        const pti = initialGraphic.drawParams.attachPoints['repl'];
        const ptm = modifiedGraphic.drawParams.attachPoints['repl'];
        dp.cx = (pti.x + ptm.x) / 2;
        dp.cy = Math.min(pti.y, ptm.y);
        dp.radX = Math.abs(ptm.x - pti.x) / 2;
        dp.radY = h/10;
        dp.rotAngle = 0;
        dp.startAngle = Math.PI;
        dp.endAngle = 2 * Math.PI;

        return true;
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class draws the final Rule that copycat has found.
 * 
 */
Namespace.RuleGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent Ui.
     * 
     */
    constructor(workspaceUi) 
    {  
        this.wkspUi = workspaceUi; 
        this.wksp = workspaceUi.workspace; 
        this.drawParams = {};
    }


    /**
     * Draws the Rule text.
     * 
     */
    redraw(ctx)
    {
        if (!this.wksp.finalAnswer) { return; }

        const ruleText = this.wksp.rule ? this.wksp.rule.synopsis(0) : "";        
        if (ruleText) {
            this._updateDrawParams(ctx, ruleText);

            const dp = this.drawParams;
            ctx.strokeStyle = this.wkspUi.ruleColor;
            ctx.fillStyle = this.wkspUi.ruleColor;
            ctx.textAlign = 'center';
            ctx.setLineDash([]);
            ctx.font = dp.font;
            dp.textLines.forEach(line => ctx.fillText(line.text, line.x, line.y));

            ctx.beginPath();
            ctx.rect(...dp.rect1);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.rect(...dp.rect2);
            ctx.stroke();
        }
    }            


    /** 
     * Recalculates the drawing parameters for this object.
     * 
     * @private
     */
    _updateDrawParams(ctx, ruleText)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        const dp = this.drawParams;
        dp.canvasWidth = w; dp.canvasHeight = h;

        const targetStringDp = this.wkspUi.targetStringGraphic.drawParams;
        const fontSize = Math.max(10, Math.round(targetStringDp.fontSize/2)); 
        dp.font = 'italic ' + fontSize.toString() + 'px serif';

        dp.textLines = [];
        if (!ruleText) { return; }
            
        // Split the text into lines
        ctx.font = dp.font;
        let lines = [];
        let lineCount = 0;
        let tmpTxt = ruleText.split(" ");
        lines[lineCount] = [];
        for (let t = 0; t < tmpTxt.length; t++) {
            if (ctx.measureText(lines[lineCount].join(" ")).width > 0.33*w) {
                let lastItem = lines[lineCount].pop();
                lineCount++;
                lines[lineCount] = [lastItem];
            }
            lines[lineCount].push(tmpTxt[t]);
        }
        lines = lines.map(line => line.join(" "));
        const measures = lines.map(line => ctx.measureText(line));

        // Calculate the text line positions
        const xc = this.wkspUi.modifiedStringGraphic.drawParams.stringCenterX;
        const y0 = targetStringDp.baselineY + 6*fontSize;
        const yStep = 1.3 * fontSize; 
        dp.textLines = lines.map((line,i) => { 
            return {text:line, x:xc, y: y0 + i*yStep}; });

        // Calculate the bounding box locations
        const maxLineWidth = Math.max(...measures.map(m => m.width));
        const left = xc - 0.5*maxLineWidth;
        const top = y0 - measures[0].actualBoundingBoxAscent;
        const bbox = {x:left, y:top, w:maxLineWidth, h: y0 + yStep*(lines.length-1) - top};
        
        let inflate = 0.66 * fontSize;
        dp.rect1 = [bbox.x - inflate, bbox.y - inflate, bbox.w + 2*inflate, bbox.h + 2*inflate];
            
        inflate = 1.0 * fontSize;
        dp.rect2 = [bbox.x - inflate, bbox.y - inflate, bbox.w + 2*inflate, bbox.h + 2*inflate];
    }

};





})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for displaying the state of the Slipnet.
 * 
 */
Namespace.SlipnetUi = class {

    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts
     *  this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.parentDiv = parentDiv;
        this.copycat = copycatUi.copycat;
        this.title = "Slipnet Activation";
        this.nRows = 13;
        this.nCols = 5;
        this.drawParams = {};

        this.bkgndColor = '#fffbcc';
        this.circleColor = '#191970';
        this.titleColor = '#606060';

        this.canvas = Namespace.UiUtils.CreateElement('canvas',
            'slipnet-canvas', parentDiv, {position:'absolute', margin:'0', 
            padding:'0', top:'0%', left:'0%', width:'100%', height:'100%', 
            border: '1px solid', background:this.bkgndColor}
        ); 

        this.nodeInfoList = this._buildNodeInfoList(this.copycat.slipnet);
    }


    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this.redraw();
    } 


    /**
     * Handler for resize events.
     * @private
     *
     */
    _onResize()
    {    
        this.redraw();
    }


    /**
     * Updates the UI.
     * 
     */
    redraw()
    {
        const UiUtils = Namespace.UiUtils;
        const canvas = this.canvas;
        const ctx = canvas.getContext("2d");
        const drawLine = Namespace.UiUtils.DrawLine;
        const dp = this.drawParams;

        // Only if necessary, resize the canvas and clear it
        if ( !UiUtils.RightsizeCanvas(canvas) ) { return; } 
        const rescale = UiUtils.NeedToRescale(this.drawParams, ctx);
        if (rescale) {
            if (!this._updateDrawParams(ctx)) { return; }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the title 
            ctx.font = dp.titleFont;
            ctx.textAlign = "center";
            ctx.fillStyle = this.titleColor;
            ctx.fillText(this.title, dp.titleX, dp.titleY);
        }

        // Draw the circles and maybe their labels
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white'; // For the 'x' overlays
        ctx.textAlign = "center";
        
        const xr = dp.xRadius;
        for (let c=0; c<this.nCols; c++) {
            for (let r=0; r<this.nRows; r++) 
            {
                const n = c*this.nRows + r;
                const node = this.nodeInfoList[n].node;              
                if (!node) { continue; }

                // Erase the previous circle and draw the new one
                const cc = dp.circleCoords[c][r];
                const sq = dp.squareCoords[c][r];
                const radius = Math.max(2, dp.maxRadius * node.activation/100);               
                ctx.clearRect(sq.x, sq.y, sq.w, sq.h);
                ctx.fillStyle = this.circleColor; 
                ctx.beginPath();
                ctx.arc(cc.x, cc.y, radius, 0, 2*Math.PI);
                ctx.fill();
                if (node.isClampedHigh()) { 
                    drawLine(ctx, cc.x-xr, cc.y-xr, cc.x+xr, cc.y+xr);
                    drawLine(ctx, cc.x+xr, cc.y-xr, cc.x-xr, cc.y+xr);
                }

                // Maybe draw the label
                if (rescale) {
                    const nodeText = this.nodeInfoList[n].text;
                    const adjFontSize = (nodeText.length > 1) ? 
                        dp.labelFontSize : dp.labelFontSize + 1;
                    ctx.font = 'italic ' + adjFontSize.toString() + 'px serif';
                    ctx.fillStyle = 'black';
                    const tc = dp.textCoords[c][r];
                    ctx.fillText(nodeText, tc.x, tc.y);
                }
            }
        }
    }


    /** 
     * Recalculates the drawing parameters for this object.
     * 
     * @private
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;
    
        // Title params
        dp.titleFontSize = Math.max(8, Math.round(Math.min(w/15, h/32)));
        dp.labelFontSize = Math.max(6, Math.round(dp.titleFontSize/2));
        dp.titleFont = 'italic bold ' + dp.titleFontSize.toString() + 'px Arial';
        ctx.font = dp.titleFont;
        let titleHeight = ctx.measureText(this.title).actualBoundingBoxAscent;
        dp.titleX = w/2;
        dp.titleY = 1.4 * titleHeight;
    
        // Grid params
        const nRows = this.nRows;
        const nCols = this.nCols;
        const topOffset = 1.3 * dp.titleFontSize;
        const cellHeight = Math.round((h-topOffset)/nRows);
        const cellWidthW = Math.round(w/4.6);
        const cellWidthN = 0.75 * cellWidthW;
        const cellWidths = 
            [cellWidthW, cellWidthW, cellWidthN, cellWidthN, cellWidthW];
        
        const mr = dp.maxRadius = 0.5*Math.min(cellWidthN, 0.6*cellHeight) - 1;
        dp.xRadius = dp.maxRadius/5;   
        
        dp.circleCoords = new Array(nCols);
        dp.squareCoords = new Array(nCols);
        dp.textCoords = new Array(nCols);
        for (let c=0; c<nCols; c++) { 
            dp.circleCoords[c] = new Array(nRows); 
            dp.squareCoords[c] = new Array(nRows);
            dp.textCoords[c] = new Array(nRows);
        }

        let prevCellRight = 0;
        for (let c=0; c<nCols; c++) {
            for (let r=0; r<nRows; r++) {
                const n = c*nRows + r;
                const node = this.nodeInfoList[n].node;               
                if (node) { 
                    const cx = prevCellRight + 0.5*cellWidths[c];
                    const cy = topOffset + r*cellHeight + dp.maxRadius + 1;
                    dp.circleCoords[c][r] = {x:cx, y:cy};
                    dp.squareCoords[c][r] = {x:cx-mr-1, y:cy-mr-1, w:2*mr+2, h:2*mr+2};
                    dp.textCoords[c][r] = {x:cx, y:cy + dp.maxRadius + dp.labelFontSize*0.85};
                }
            }
            prevCellRight += cellWidths[c];
        }
        return true;
    }

    
    /**
     * Builds the list of node info objects that will be used to draw the
     * activation circles.
     * 
     * @private 
     */
    _buildNodeInfoList(slipnet)
    {
        const sn = slipnet;

        const nodeInfoList = [
            {'node':sn.opposite, 'text':'Opposite'},
            {'node':sn.stringPositionCategory, 'text':'StringPos Cat'},
            {'node':sn.leftmost, 'text':'Leftmost'},
            {'node':sn.middle, 'text':'Middle'},
            {'node':sn.rightmost, 'text':'Rightmost'},
            {'node':sn.whole, 'text':'Whole'},
            {'node':sn.single, 'text':'Single'},
            {'node':sn.objectCategory, 'text':'Obj Cat'},
            {'node':sn.letter, 'text':'Letter'},
            {'node':sn.group, 'text':'Group'},
            {'node':sn.alphabeticPositionCategory, 'text':'AlphaPos Cat'},
            {'node':sn.first, 'text':'First'},
            {'node':sn.last, 'text':'Last'},
        
            {'node':sn.identity, 'text':'Identity'},
            {'node':sn.directionCategory, 'text':'Dir\'n Cat'},
            {'node':sn.left, 'text':'Left'},
            {'node':sn.right, 'text':'Right'},
            {'node':sn.bondCategory, 'text':'Bond Cat'},
            {'node':sn.predecessor, 'text':'Pred'},
            {'node':sn.successor, 'text':'Succ'},
            {'node':sn.sameness, 'text':'Same'},
            {'node':sn.groupCategory, 'text':'Group Cat'},
            {'node':sn.predecessorGroup, 'text':'Pred Group'},
            {'node':sn.successorGroup, 'text':'Succ Group'},
            {'node':sn.samenessGroup, 'text':'Same Group'},
            {'node':sn.letterCategory, 'text':'Letter Cat'},
             
            {'node':sn.letters[0], 'text':'a'},
            {'node':sn.letters[1], 'text':'b'},
            {'node':sn.letters[2], 'text':'c'},
            {'node':sn.letters[3], 'text':'d'},
            {'node':sn.letters[4], 'text':'e'},
            {'node':sn.letters[5], 'text':'f'},
            {'node':sn.letters[6], 'text':'g'},
            {'node':sn.letters[7], 'text':'h'},
            {'node':sn.letters[8], 'text':'i'},
            {'node':sn.letters[9], 'text':'j'},
            {'node':sn.letters[10], 'text':'k'},
            {'node':sn.letters[11], 'text':'l'},
            {'node':sn.letters[12], 'text':'m'},

            {'node':sn.letters[13], 'text':'n'},
            {'node':sn.letters[14], 'text':'o'},
            {'node':sn.letters[15], 'text':'p'},
            {'node':sn.letters[16], 'text':'q'},
            {'node':sn.letters[17], 'text':'r'},
            {'node':sn.letters[18], 'text':'s'},
            {'node':sn.letters[19], 'text':'t'},
            {'node':sn.letters[20], 'text':'u'},
            {'node':sn.letters[21], 'text':'v'},
            {'node':sn.letters[22], 'text':'w'},
            {'node':sn.letters[23], 'text':'x'},
            {'node':sn.letters[24], 'text':'y'},
            {'node':sn.letters[25], 'text':'z'},

            {'node':null, 'text':''},
            {'node':null, 'text':''},
            {'node':null, 'text':''},
            {'node':sn.length, 'text':'Length'},
            {'node':sn.numbers[0], 'text':'One'},
            {'node':sn.numbers[1], 'text':'Two'},
            {'node':sn.numbers[2], 'text':'Three'},
            {'node':sn.numbers[3], 'text':'Four'},
            {'node':sn.numbers[4], 'text':'Five'},
            {'node':sn.bondFacet, 'text':'Bond Facet'},
            {'node':null, 'text':''},
            {'node':null, 'text':''},
            {'node':null, 'text':''},      
        ];
        return nodeInfoList;
    }

};


})( window.CopycatJS = window.CopycatJS || {} );









// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the workspace strings
 * along with their bonds, groups, and descriptions.
 * 
 */
Namespace.StringGraphic = class 
{
    /**
     * @constructor
     * 
     * @param {WorkspaceUi} workspaceUi - The parent Ui.
     * @param {Number} quadrant - The string's quadrant.
     * 
     */
    constructor(workspaceUi, quadrant) 
    {   
        this.wkspUi = workspaceUi; 
        this.quadrant = quadrant;
        this.wstring = null;
        this.jstring = ""; 

        this.lettersGraphic = null;
        this.descriptionsGraphic = null;
        this.bondsGraphic = null;
        this.groupsGraphic = null; 

        this.drawParams = {};

        this._updateStringFromWorkspace();
        this._createChildGraphics();
    }


    /**
     * Creates the child graphics objects.
     * @private
     * 
     */
    _createChildGraphics()
    {
        this.lettersGraphic = new Namespace.LettersGraphic(this);

        if (this.quadrant != 2) {
            this.descriptionsGraphic = new Namespace.DescriptionsGraphic(this);
            this.bondsGraphic = new Namespace.BondsGraphic(this);
            this.groupsGraphic = new Namespace.GroupsGraphic(this);
        }
    }


    /**
     * Gets the LetterGraphic or GroupGraphic associated with
     * a given Letter or Group.
     * 
     * @param {Letter|Group} wrappedObject - The search key. 
     */
    getChildGraphic(wrappedObject)
    {
        if (wrappedObject instanceof Namespace.Letter) {
            return this.lettersGraphic.letterGraphics.find( lg => lg.letter == wrappedObject );
        }
        else if (wrappedObject instanceof Namespace.Group) {
            return this.groupsGraphic.groupGraphics.find( g => g.group == wrappedObject );
        }
        return null;
    }

    
    /**
     * Redraws everything 
     * 
     */
    redraw(ctx)
    {
        // Check whether our wrapped string has changed
        let stringChanged = false;
        if ( this._updateStringFromWorkspace() ) {
            this._createChildGraphics();
            stringChanged = true;
        }

        // Update our drawing parameters if necessary
        const UiUtils = Namespace.UiUtils;
        if (stringChanged || UiUtils.NeedToRescale(this.drawParams, ctx)) {
            this._updateDrawParams(ctx);
        }
      
        // Draw our child graphics 
        // (Note that the drawing logic assumes the drawing order shown here.)
        [this.lettersGraphic, this.descriptionsGraphic, this.groupsGraphic, this.bondsGraphic].forEach( g => { 
            if (g) { g.redraw(ctx); }
        });
    }

    
    /** 
     * Check whether the wrapped string has changed.
     * @private
     * 
     */
    _updateStringFromWorkspace()
    {
        const wksp = this.wkspUi.workspace;
        const q = this.quadrant;

        let changed = false;
        if (q == 2) {
            const jstring = wksp.finalAnswer || '?';
            if (this.jstring != jstring) {
                this.jstring = jstring;
                changed = true;
            }
        }
        else {
            const wstring = (q == 0) ? wksp.initialWString : 
                (q == 1) ? wksp.modifiedWString : wksp.targetWString;
            if (this.wstring != wstring) {
                this.wstring = wstring;
                this.jstring = wstring ? wstring.jstring : '';
                changed = true;
            }
        }
        return changed;
    }


    /** 
     * Recalculates the drawing parameters.
     * @private
     * 
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        
        const wksp = this.wkspUi.workspace;
        const inputStrings = [wksp.initialWString, wksp.modifiedWString,
            wksp.targetWString];
        const maxChars = Math.max(...inputStrings.map(s => s.jstring.length));
        dp.fontSize = Math.round(1.1*Math.min(h/18, w/(2.5*maxChars))); 
        dp.font = 'italic bold ' + dp.fontSize.toString() + 'px serif';
        ctx.font = dp.font; // Must set the font before measuring text

        dp.baselineY = (this.quadrant < 2) ? h/3 : 2*h/3;
        
        dp.emWidth = ctx.measureText('m').width;
        
        dp.stringCenterX = (this.quadrant == 0 || this.quadrant == 3) ? w/4 - w/80 : 3*w/4 + w/80;
            
        const charMetrics = this.jstring.split('').map( c => ctx.measureText(c) );
        const sumOfCharWidths = charMetrics.reduce( (a,b) => a + b.actualBoundingBoxLeft + b.actualBoundingBoxRight, 0 );
        
        const nChars = this.jstring.length;
        dp.charSpacing = Math.min(5*sumOfCharWidths/nChars, (0.40*w - sumOfCharWidths)/(nChars-1));

        dp.stringWidth = sumOfCharWidths + dp.charSpacing*(nChars-1);
        dp.stringStartX = dp.stringCenterX - dp.stringWidth/2;

        dp.maxCharAscent = Math.max(...(charMetrics.map(m => m.actualBoundingBoxAscent)));
        dp.maxCharDescent = Math.max(...(charMetrics.map(m => m.actualBoundingBoxDescent)));
        dp.top = dp.baselineY - dp.maxCharAscent;
    }
};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class draws the title bar at the top of the screen.
 * 
 */
Namespace.TopbarUi = class {

    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts
     *  this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.parentDiv = parentDiv;
        this.copycat = copycatUi.copycat;
        this.drawParams = {};

        this._buildUi(parentDiv);  
    }


    /**
     * Creates the ui elements.
     * @private
     * 
     */
    _buildUi()
    {
        const UiUtils = Namespace.UiUtils;

        this.mainDiv = UiUtils.CreateElement('div', 
            'topbar-div', this.parentDiv, 
            {position:'absolute', top:'0%', left:'0%', width:'100%', 
            height:'100%', background:'#bfcbdf'}
        );     
             
        this.logoImg = UiUtils.CreateElement('img', 'logo', this.mainDiv, 
            {width:'auto', top:0, height:'100%', left:'1vh'}, 
            {src:'./cc_logo.png'}
        );
        this.logoImg.className += " noselect";

        this.titleSpan = UiUtils.CreateElement('span', 'title-span', 
            this.mainDiv, {top:'0%', height:'100%', left:'10vh', width:'auto', 
            display:'flex', alignItems:'center', justifyContent:'left',
            color:'#404040', fontFamily:'Arial', fontWeight:'bold', 
            fontStyle:'italic', fontSize: '4.25vh'}
        ); 
        this.titleSpan.innerHTML = 'Copycat';
        this.titleSpan.className += " noselect";

        this.helpBtn = UiUtils.CreateElement('button', 'help-btn',
            this.mainDiv, {top:'22%', height:'56%', right:'2vh', width:'10vh',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#404040', fontFamily:'Arial', fontWeight:'normal',
            fontSize: '3vh', background:'#dfdfdf', border:'1px solid #404040' }
        );
        this.helpBtn.innerHTML = '&nbsp;&nbsp;Help&nbsp;&nbsp;';
        this.helpBtn.className += " noselect";
        this.helpBtn.onclick = this._onHelpBtnClick.bind(this);

        this.batchModeBtn = UiUtils.CreateElement('button', 'batchmode-btn',
            this.mainDiv, {top:'22%', height:'56%', right:'15vh', width:'auto',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#404040', fontFamily:'Arial', fontWeight:'normal',
            fontSize: '1.4vh', background:'#dfdfdf', border:'1px solid #404040' }
        );
        this.batchModeBtn.innerHTML = '&nbsp;Toggle&nbsp;<br>&nbsp;Batch Mode&nbsp;';
        this.batchModeBtn.className += " noselect";
        this.batchModeBtn.onclick = this._onBatchModeBtnClick.bind(this);

        this.helpDialog = new Namespace.HelpDialog(document.getElementById('app_area'));
    }


    /**
     * Handler for state change events.
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        const running = (this.copycat.state == 'running');
        this.batchModeBtn.disabled = running; 
        this.batchModeBtn.style.opacity = running ? '0.4' : '1.0';
    }


    /**
     * Handler for resize events.
     * @private
     * 
     */
    _onResize()
    {    
        // Nothing to do here
    }


    /**
     * Handler for help-button clicks.
     * @private
     * 
     */
    _onHelpBtnClick()
    {    
        if (this.helpDialog.isShown()) {
            this.helpDialog.hide();
        }
        else {
            this.helpDialog.show();
        }
    }


    /**
     * Handler for batchmode-button clicks.
     * @private
     * 
     */
    _onBatchModeBtnClick()
    {    
        this.copycat.toggleBatchMode(!this.copycat.batchMode);
    }

};


})( window.CopycatJS = window.CopycatJS || {} );








// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class provides several utility functions needed by the UI classes.
 * 
 */
Namespace.UiUtils = class {
    constructor() { }
};


/**
 * Creates an html element and appends it to the parent.
 *
 */
Namespace.UiUtils.CreateElement = function(type, id, parent, styles, props) 
{
    const elem = document.createElement(type);
    elem.id = id;
    if (parent) { parent.append(elem); }

    if (styles) {
        for (let styName in styles) {
            if (Object.prototype.hasOwnProperty.call(styles, styName)) {
                let val = styles[styName];
                if (typeof val === 'number') { val = val.toString() + 'px'; }
                elem.style[styName] = val;
            }
        }
    }
    if (props) {
        for (let propName in props) {
            if (Object.prototype.hasOwnProperty.call(props, propName)) {
                elem[propName] = props[propName];
            }
        }        
    }

    // Set some default styles
    if (!styles || !Object.prototype.hasOwnProperty.call(styles, 'position')) { elem.style.position = 'absolute'; }
    if (!styles || !Object.prototype.hasOwnProperty.call(styles, 'margin'))   { elem.style.margin = '0px'; }
    if (!styles || !Object.prototype.hasOwnProperty.call(styles, 'padding'))  { elem.style.padding = '0px'; }

    return elem;
};


/**
 * Applies styling to an html element
 * @static
 * 
 */
Namespace.UiUtils.StyleElement = function(elem, styles) 
{
    for (let propName in styles) {
        if (Object.prototype.hasOwnProperty.call(styles, propName)) {
            let val = styles[propName];
            if (typeof val === 'number') { val = val.toString() + 'px'; }
            elem.style[propName] = val;
        }
    }

    // Set some default styles
    if (!Object.prototype.hasOwnProperty.call(styles, 'position')) { elem.style.position = 'absolute'; }
    if (!Object.prototype.hasOwnProperty.call(styles, 'margin'))   { elem.style.margin = '0px'; }
    if (!Object.prototype.hasOwnProperty.call(styles, 'padding'))  { elem.style.padding = '0px'; }

    return elem;
};


/**
 * Tries to determine whether we're on a touch device.
 * @static
 * 
 */
Namespace.UiUtils.isTouchDevice = function()
{
    // This test is fallible, but it seems to be the best we can do.
    return ( ('ontouchstart' in document.documentElement) || window.navigator.msMaxTouchPoints );
};


/** 
 * Resizes a given canvas's raster to match its display size.
 *
 */
Namespace.UiUtils.RightsizeCanvas = function(canv)
{
    const clientWidth = Math.round(canv.clientWidth);
    const clientHeight = Math.round(canv.clientHeight);
    if ( (clientWidth < 1) || (clientHeight < 1) ) { return false; }

    const dpr = 1.33125007; //window.devicePixelRatio || 1;
    const requiredCanvasWidth = Math.round(dpr * clientWidth);
    const requiredCanvasHeight = Math.round(dpr * clientHeight);

    if ( (canv.width != requiredCanvasWidth) || 
        (canv.height != requiredCanvasHeight) ) { 
            canv.width = requiredCanvasWidth;  
            canv.height = requiredCanvasHeight;
            //canv.getContext('2d').scale(dpr, dpr);
            canv.setAttribute('width', requiredCanvasWidth.toString() + 'px'); 
            canv.setAttribute('height', requiredCanvasHeight.toString() + 'px'); 
    } 
    return true;
};  


/** 
 * Checks whether the canvas size has changed.
 *
 */
Namespace.UiUtils.NeedToRescale = function(drawParams, context)
{
    const dp = drawParams;

    if (!dp || !dp.canvasWidth || !dp.canvasHeight) {
        return true; 
    }
    else {
        return (context.canvas.width != dp.canvasWidth) || 
            (context.canvas.height != dp.canvasHeight);
    }
};  


/**
 * Draws a line on a canvas.
 *
 */
Namespace.UiUtils.DrawLine = function(ctx, xa, ya, xb, yb)
{
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xb, yb);
    ctx.stroke();
};


/**
 * Draws a sequence of lines on a canvas.
 *
 */
Namespace.UiUtils.DrawLines = function(ctx, pts)
{
    if (!pts || (pts.length < 2)) { return; }
    
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1; i<pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
};


/**
 * Computes the vertices of a zig-zag line.
 *
 */
Namespace.UiUtils.CalcZigzagLine = function(ctx, xa, ya, xb, yb)
{
    const [w, h] = [ctx.canvas.width, ctx.canvas.height];
    const ampl = Math.min(w,h) * 0.004;  
    const perpOffsets = [0, ampl, 0, -ampl];
    
    const ab = { x: xb-xa, y: yb-ya };
    const abLen = Math.sqrt(ab.x*ab.x + ab.y*ab.y);
    const abDir = { x: ab.x/abLen, y: ab.y/abLen };
    const perpDir = { x: abDir.y, y: -abDir.x };

    const nCycles = Math.round(abLen /(4*ampl)) + 0.5;
    const qw = abLen / (4*nCycles); 
    
    const points = [];
    for (let i=0; i<4*nCycles; i++) {
        const perpOffset = perpOffsets[i%4];
        const p = { x: xa + i*abDir.x*qw, y: ya + i*abDir.y*qw };
        p.x += perpOffset * perpDir.x;
        p.y += perpOffset * perpDir.y;
        points.push(p);
    }
    points.push({ x: xb, y: yb });

    return points;
};


})( window.CopycatJS = window.CopycatJS || {} );







// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for drawing the Workspace header area.
 */
Namespace.WorkspaceHeaderUi = class 
{
    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.parentDiv = parentDiv;
        this.copycat = copycatUi.copycat;
        this.title = "Workspace";
        this.drawParams = {};

        this.bkgndColor = '#fafafa';
        this.fontColor = '#606060';

        this._buildUi();
    }


    /**
     * Creates the ui elements.
     * @private
     * 
     */
    _buildUi()
    {
        const UiUtils = Namespace.UiUtils;

        this.ctrlsDiv = UiUtils.CreateElement('div', 
            'workspace-header-ctrls-div', this.parentDiv, {position:'absolute', 
            top:'0%', left:'0%', right:'70%', height:'100%', 
            background:this.bkgndColor, borderTop:'1px solid'}
        );
        
        this.canvas = UiUtils.CreateElement('canvas', 
            'workspace-header-canvas', this.parentDiv, {position:'absolute', 
            top:'0%', left:'30%', width:'70%', height:'100%', 
            background:this.bkgndColor, borderTop: '1px solid'}
        );
        
        this.stepBtn = UiUtils.CreateElement('button', 'step_btn', 
            this.ctrlsDiv, {width:'15%', height:'40%', top:'12%', left:'8%',
            border:0, background:this.bkgndColor});
        this.stepBtn.innerHTML = 
            '<img class="button-img" src="./btn_step.png" border="0" width="100% height="auto">';
        this.stepBtn.onclick = this._onStepBtnClick.bind(this);
        this.stepBtn.className += " noselect";

        this.goBtn = UiUtils.CreateElement('button', 'go_btn', 
            this.ctrlsDiv, {width:'15%', height:'40%', top:'12%', left:'31%',
            border:0, background:this.bkgndColor});
        this.goBtn.innerHTML = 
            '<img class="button-img" src="./btn_play.png" border="0" width="100% height="auto">';
        this.goBtn.onclick = this._onGoBtnClick.bind(this);
        this.goBtn.className += " noselect";

        this.pauseBtn = UiUtils.CreateElement('button', 'pause_btn', 
            this.ctrlsDiv, {width:'15%', height:'40%', top:'12%', left:'54%',
            border:0, background:this.bkgndColor});
        this.pauseBtn.innerHTML = 
            '<img class="button-img" src="./btn_pause.png" border="0" width="100% height="auto">';
        this.pauseBtn.onclick = this._onPauseBtnClick.bind(this);
        this.pauseBtn.className += " noselect";

        this.resetBtn = UiUtils.CreateElement('button', 'reset_btn', 
            this.ctrlsDiv, {width:'15%', height:'40%', top:'12%', left:'77%',
            border:0, background:this.bkgndColor});
        this.resetBtn.innerHTML = 
            '<img class="button-img" src="./btn_reset.png" border="0" width="100% height="auto">';
        this.resetBtn.onclick = this._onResetBtnClick.bind(this);
        this.resetBtn.className += " noselect";

        this.speedSlider = UiUtils.CreateElement('input', 'speed_slider',
            this.ctrlsDiv, {width:'70%', height:'10%', top:'60%', left:'15%',
            accentColor:this.fontColor},
            {type:'range', min:1, max:100, value:55});
        this.speedSlider.draggable = true;
        this.speedSlider.ondragstart = function(e) { 
            e.preventDefault(); 
            e.stopImmediatePropagation();};
        this.speedSlider.oninput = this._onSpeedSliderChange.bind(this);
        this.speedSlider.className += " noselect";

        this.speedSliderLabel = UiUtils.CreateElement('span', 'speed-slider-label',
            this.ctrlsDiv, {width:'100%', height:'17%', top:'77%', left:'0%',
            display:'flex', alignItems:'center', justifyContent:'center',
            font:'italic bold 18px Arial', color:this.fontColor});
        this.speedSliderLabel.innerHTML = 'Speed';
        this.speedSliderLabel.className += " noselect";
    }


    /**
     * Handler for go button clicks.
     * @private
     * 
     */
    _onGoBtnClick()
    {
        const copycat = this.copycat;

        if (this.copycatUi.checkInputStrings()) {
            if (copycat.state == 'ready' || copycat.state == 'done') {
                copycat.start();
            }
            else if (copycat.state == 'paused') {
                copycat.resume();
            }
        }        
    }


    /**
     * Handler for single-step button clicks.
     * @private
     * 
     */
    _onStepBtnClick()
    {
        if (this.copycatUi.checkInputStrings()) {
            this.copycat.singleStep();
        }
    }


    /**
     * Handler for pause button clicks.
     * @private
     * 
     */
    _onPauseBtnClick()
    {
        this.copycat.pause();
    }


    /**
     * Handler for reset button clicks.
     * @private
     * 
     */
    _onResetBtnClick()
    {
        if ( (this.copycat.state != 'running') && this.copycatUi.checkInputStrings()) {
            this.copycat.reset();
        }
    }


    /**
     * Handler for speed-slider changes.
     * @private
     * 
     */
    _onSpeedSliderChange()
    {
        const sv = this.speedSlider.value;
        const delay = (sv == this.speedSlider.max) ? 0 : 1000/(1 + sv*sv/100);
        this.copycat.setStepDelay(delay);
    }


    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this.redraw();
        this._updateEnabledState();
    }


    /**
     * Handler for resize events.
     * @private
     *
     */
    _onResize()
    {    
        this.redraw();
    }


    /**
     * Updates the enabled/disabled state of the control buttons,
     * based on the current copycat state.
     * @private
     * 
     */
    _updateEnabledState()
    {
        const setEnabled = function(ctrl, enabled) { 
            ctrl.disabled = !enabled; 
            ctrl.style.opacity = enabled ? '1.0' : '0.4';
        };

        [this.stepBtn, this.goBtn, this.pauseBtn, this.resetBtn].forEach( ctrl => setEnabled(ctrl, true) );

        switch (this.copycat.state) 
        {
            case 'ready':
                setEnabled(this.pauseBtn, false);
                break;
            case 'paused':
                setEnabled(this.pauseBtn, false);
                break;
            case 'running':
                setEnabled(this.stepBtn, false);
                setEnabled(this.goBtn, false);
                setEnabled(this.resetBtn, false);
                break;
            case 'done':
                setEnabled(this.stepBtn, false);
                setEnabled(this.pauseBtn, false);
                break;
            default:
                break;
        }
    }


    /**
     * Updates the UI.
     * 
     */
    redraw()
    {
        const UiUtils = Namespace.UiUtils;
        const canvas = this.canvas;
        const ctx = canvas.getContext("2d");
        const dp = this.drawParams;

        // Only if necessary, resize the canvas and clear it
        if ( !UiUtils.RightsizeCanvas(canvas) ) { return; } 
        const rescale = UiUtils.NeedToRescale(this.drawParams, ctx);

        if (rescale) {
            if (!this._updateDrawParams(ctx)) { return; }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw the title.
            ctx.font = dp.titleFont;
            ctx.textAlign = "center";
            ctx.fillStyle = dp.titleFontColor;
            ctx.fillText(this.title, ...dp.titleLoc);

            // Maintain the button-image aspect ratios.
            const buttonImgs = document.getElementsByClassName("button-img");
            for (let img of buttonImgs) {               
                img.style.width = dp.btnImgWidth;
                img.style.height = dp.btnImgHeight;
            }

            // Resize the speed slider label
            UiUtils.StyleElement(this.speedSliderLabel, 
                {fontSize:dp.speedSliderFontSize});

            // Draw the thermometer Bulb
            ctx.lineWidth = 1;
            ctx.fillStyle = "red";
            ctx.strokeStyle = 'black';
            ctx.beginPath();
            ctx.arc(dp.bulbCtr.x, dp.bulbCtr.y, dp.bulbRadius, 0, 2*Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(dp.bulbCtr.x, dp.bulbCtr.y, dp.bulbRadius, 0.464, 5.820);
            ctx.stroke();
            
            // Endcap
            ctx.beginPath();
            ctx.arc(dp.bulbCtr.x + dp.stemLength, dp.bulbCtr.y, 
                dp.stemRadius, 1.5*Math.PI, 0.5*Math.PI);
            ctx.stroke();

            // Tick marks
            dp.tickMarks.forEach(t => UiUtils.DrawLine(ctx, ...t));
        }

        // Draw the number of codelets run
        const copycat = this.copycat;
        const numCodeletsRun = copycat.coderack.numCodeletsRun;
        ctx.font = dp.subTitleFont;
        ctx.fillStyle = dp.titleFontColor;
        ctx.clearRect(...dp.subTitleRect);
        ctx.fillText('(Codelets run: ' + numCodeletsRun.toString() + ')', ...dp.subTitleLoc);

        // Draw the thermometer stem
        const temperature = Math.max(0, Math.min(100, copycat.temperature.value().toFixed(0))); 
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'black';
        ctx.clearRect(...dp.hgRect);
        ctx.fillRect(dp.hgRect[0], dp.hgRect[1], (dp.hgRect[2]-1)*(temperature/100), dp.hgRect[3]);
        UiUtils.DrawLine(ctx, ...dp.hgTopLine);
        UiUtils.DrawLine(ctx, ...dp.hgBtmLine);
               
        // Draw the temperature value
        ctx.font = dp.tempFont;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        ctx.clearRect(...dp.tempTextRect);
        ctx.fillText(temperature.toString(), ...dp.tempTextLocation); 
    }


    /** 
     * Recalculates the drawing parameters for this object.
     * 
     * @private
     */
    _updateDrawParams(ctx)
    {
        const [w, h] = [ctx.canvas.width, ctx.canvas.height];
        if ((w < 1) || (h < 1)) { return false; }

        const dp = this.drawParams;
        dp.canvasWidth = w;  dp.canvasHeight = h;

        // Maintain the button-image aspect ratios.
        dp.btnImgWidth = 'auto';
        dp.btnImgHeight = '100%';
        const img = document.getElementsByClassName("button-img")[0];
        if (img.parentNode.clientHeight > img.parentNode.clientWidth) { 
            dp.btnImgWidth = '100%';
            dp.btnImgHeight = 'auto';
        }

        // Speed slider font size
        dp.speedSliderFontSize = Math.round(0.15*h);

        // Title
        dp.titleFontColor = this.fontColor;
        dp.titleFontSize = Math.round(Math.min(0.35*h, 0.0875*w));
        dp.titleFont = 'italic bold ' + dp.titleFontSize.toString() + 'px Arial';
        dp.titleLoc = [(2/7)*w, 0.45*h];
        const titleMetrics = ctx.measureText(this.title);
        
        // Subtitle
        dp.subTitleFontSize = Math.round(dp.titleFontSize/2);
        dp.subTitleFont = 'italic bold ' + dp.subTitleFontSize.toString() + 'px Arial';
        dp.subTitleLoc = [dp.titleLoc[0], dp.titleLoc[1] + 1.85*dp.subTitleFontSize];
        let rectTop = dp.titleLoc[1] + titleMetrics.actualBoundingBoxDescent + 1;
        dp.subTitleRect = [0, rectTop, 0.7*w - h/12 - 1, h - rectTop];
        
        // Thermometer
        dp.bulbCtr = {x:0.70*w, y:0.5*h};
        dp.bulbRadius = h/12;
        dp.stemLength = 0.225*w;
        dp.stemRadius= dp.bulbRadius/2;

        // Thermometer tickmarks
        let x = dp.bulbCtr.x + 1.5*dp.bulbRadius;
        let dx = (dp.stemLength - 1.5*dp.bulbRadius)/8;
        let ya = dp.bulbCtr.y - dp.stemRadius;
        let yb1 = ya - dp.stemRadius;
        let yb2 = yb1 - 0.7*dp.stemRadius;
        dp.tickMarks = [];
        for (let i=0; i<9; i++) {
            dp.tickMarks.push([x, ya, x, (i%4 == 0) ? yb2 : yb1]);
            x += dx;
        }

        // Thermometer text
        const tempFontSize = Math.round(2*dp.bulbRadius);
        dp.tempFont = 'italic ' + tempFontSize.toString() + 'px Arial';
        dp.tempTextLocation = [dp.bulbCtr.x + dp.stemLength/2,
            dp.bulbCtr.y + 1.5*tempFontSize]; 
        rectTop = dp.bulbCtr.y + dp.bulbRadius + 2;
        dp.tempTextRect = [dp.bulbCtr.x, rectTop, w - dp.bulbCtr.x, h - rectTop];
        
        // Thermometer stem
        x = dp.bulbCtr.x;
        let y = dp.bulbCtr.y - dp.stemRadius;
        dp.hgRect = [x, y, dp.stemLength, 2*dp.stemRadius];
        dp.hgTopLine = [x + 0.866*dp.bulbRadius, y, x + dp.stemLength, y];
        y += 2*dp.stemRadius;
        dp.hgBtmLine = [x + 0.866*dp.bulbRadius, y, x + dp.stemLength, y];

        return true;
    }
   
};


})( window.CopycatJS = window.CopycatJS || {} );








// eslint-disable-next-line no-shadow-restricted-names, no-unused-vars, no-extra-semi
;(function(Namespace, undefined) {
    "use strict";
    
    
/**
 * @classdesc
 * This class is responsible for displaying the state of the Workspace.
 * 
 */
Namespace.WorkspaceUi = class 
{
    /**
     * @constructor
     * 
     * @param {CopycatUi} copycatUi - The parent Ui.
     * @param {HTMLElement} parentDiv - The html div that hosts this ui.
     */
    constructor(copycatUi, parentDiv) 
    { 
        this.copycatUi = copycatUi;
        this.copycat = copycatUi.copycat;
        this.workspace = this.copycat.workspace;
        this.parentDiv = parentDiv;

        // Specify colors
        this.groupColor = '#00ff00';
        this.bondColor = '#1581e7';
        this.correspColor = '#a020f0';
        this.letterColor = '#000000';
        this.answerLetterColor = '#d20000';
        this.replColor = '#964B00';
        this.ruleColor = '#d20000';
        this.descriptionColor = '#c0c0c0';
        this.activeDescriptionColor = '#909090';        

        // Create my canvas
        this.canvas = Namespace.UiUtils.CreateElement('canvas', 
            'wksp-canvas', parentDiv, {position:'absolute', 
            top:'0%', left:'0%', width:'100%', height:'100%', 
            border: '1px solid', borderTop:0, borderLeft:'none',
            background:'#fafafa', zIndex:1}
        );

        // Create my flasher
        this.flasher = new Namespace.Flasher(this);

        // Create my graphics objects
        this.initialStringGraphic = new Namespace.StringGraphic(this, 0);
        this.modifiedStringGraphic = new Namespace.StringGraphic(this, 1);
        this.answerStringGraphic = new Namespace.StringGraphic(this, 2);
        this.targetStringGraphic = new Namespace.StringGraphic(this, 3);
        this.arrowGraphic = new Namespace.ArrowGraphic(this);
        this.ruleGraphic = new Namespace.RuleGraphic(this);
        this.replacementsGraphic = new Namespace.ReplacementsGraphic(this);
        this.corrsGraphic = new Namespace.CorrsGraphic(this);
        
        this.allGraphics = [
            this.initialStringGraphic,
            this.modifiedStringGraphic,
            this.targetStringGraphic,
            this.answerStringGraphic,            
            this.arrowGraphic,
            this.ruleGraphic,
            this.replacementsGraphic,
            this.corrsGraphic
        ];
    }


    /**
     * Gets the StringGraphic object for a specified string.
     * 
     * @param {WorkspaceString} wstring - The string to search on.
     */
    getStringGraphic(wstring)
    {
        const wksp = this.workspace;
        return (wstring === wksp.initialWString) ? this.initialStringGraphic : 
            (wstring === wksp.targetWString) ? this.targetStringGraphic :
            (wstring === wksp.modifiedWString) ? this.modifiedStringGraphic :
            (wstring === wksp.answerWString) ? this.answerStringGraphic :
            null;
    }


    /**
     * Handler for state-change events
     * @private
     * 
     */
    _onCopycatStateChange()
    {
        this.redraw();
    }


    /**
     * Handler for resize events.
     * @private
     *
     */
    _onResize()
    {   
        this.redraw();
    }


    /**
     * Updates the UI.
     * 
     */
    redraw()
    {
        const UiUtils = Namespace.UiUtils;
        const canvas = this.canvas;
        const ctx = canvas.getContext("2d");

        // Resize the canvas if necessary
        if ( !UiUtils.RightsizeCanvas(canvas) || !UiUtils.RightsizeCanvas(this.flasher.canvas)) { return; } 

        // Bounce out if the input strings haven't been set
        if (!this.copycat.workspace.initialWString) { return; }

        // Avoid redrawing while flashing
        if ( !this.flasher.isIdle() ) { return; }

        // Re-draw all the graphics
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.allGraphics.forEach( g => g.redraw(ctx) );
    }


    /**
     * Flashes the specified graphic item.
     * 
     * @param {Graphic} item - The item to flash.
     * @param {Number} flashCount - The number of times to flash.
     * 
     */
    flash(graphic, flashCount)    
    {
        this.flasher.flash(graphic, flashCount);
    }
    
};


})( window.CopycatJS = window.CopycatJS || {} );








