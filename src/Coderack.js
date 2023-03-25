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
            // Choose an old codelet to remove from the coderack, 
            // preferring lower urgency ones.
            const urgencies = this.codelets.map(c => 
                (this.numCodeletsRun - c.birthdate) * (7.5 - c.urgency));
            const oldCodelet = 
                this.ctx.randGen.weightedChoice(this.codelets, urgencies);
            this.codelets = this.codelets.filter(c => c != oldCodelet);
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
        const chosen = this.ctx.randGen.weightedChoice(
            this.codelets, this.getCodeletRunProbabilities());
        this.codelets = this.codelets.filter(c => c != chosen);

        // Run it
        try{
            this.numCodeletsRun += 1;
            chosen.run();
            this.lastRunCodelet = chosen;
        } catch (e) {
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
        probs = probs.map(p => p/totalProb);
        return probs;
    }


    /**
     * Posts codelets associated with fully-active nodes.
     * 
     * @private
     */
    _postTopDownCodelets()
    {
        const random = this.ctx.randGen;
        for (let node of this.ctx.slipnet.nodes) {
            if (node.activation >= 100) { 
                for (let codeletName of node.codelets) {
                    const prob = this._probabilityOfPosting(codeletName);
                    const howMany = this._howManyToPost(codeletName);
                    for (let i=0; i<howMany; i++) {
                        if (random.coinFlip(prob)) {
                            const urgency = CodeletUtils.getUrgencyBin(
                                (node.activation * node.depth / 100));
                            const codelet = this.factory.create(
                                codeletName, urgency, [node]);
                            this.post(codelet);
                        }
                    }
                }
            }
        }
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
            if ((this.ctx.temperature.value() < 25) && 
                codeletName.includes('translator')) { 
                    urgency = 5; 
            }

            for (let i=0; i<howMany; i++) {
                if (this.ctx.randGen.coinFlip(prob)){
                    const codelet = 
                        this.factory.create(codeletName, urgency, []);
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
            const unreplaced = wksp.objects.filter(o => 
                (o.string == wksp.initialWString) &&
                (o instanceof Namespace.Letter) && 
                !o.replacement);
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
            const numBonds = wksp.structures.filter(
                o => o instanceof Namespace.Bond).length;
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
            const ungrouped = wksp.objects.filter(o => 
                ((o.string == wksp.initialWString) || (o.string == wksp.targetWString)) &&
                !o.spansString() && !o.group);
            number = ungrouped.length;
        }
        if (codeletName.includes('replacement')) 
        {
            const unreplaced = wksp.objects.filter(o => (o.string == wksp.initialWString) &&
                (o instanceof Namespace.Letter) && !o.replacement);
            number = unreplaced.length;
        }
        if (codeletName.includes('correspondence')) 
        {
            const uncorresp = wksp.objects.filter(o => 
                ((o.string == wksp.initialWString) || (o.string == wksp.targetWString)) &&
                !o.correspondence);
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
        
        const bond = new Namespace.Bond(source, destination, bondCategory,
            bondFacet, sourceDescriptor, destDescriptor);
        
        const urgency = CodeletUtils.getUrgencyBin( 
            bondCategory.bondDegreeOfAssociation() );

        const codelet = this.factory.create(
            'bond-strength-tester', urgency, [bond]);
        
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
        const description = new Namespace.Description(
            obj, bondType, descriptor);
            
        descriptor.activation = 100;

        const urgency = CodeletUtils.getUrgencyBin(bondType.activation);

        const newCodelet = this.factory.create(
            'description-strength-tester', urgency, [description]);

        this.post(newCodelet);
        
        return description;
    }


    /**
     * Posts a correspondence-strength-tester codelet for a Correspondence with 
     * the given attributes.
     *  
     */  
    proposeCorrespondence(initialObject, targetObject, 
        conceptMappings, flipTargetObject)
    {
        const correspondence = new Namespace.Correspondence(initialObject, 
            targetObject, conceptMappings, flipTargetObject);

        conceptMappings.forEach(m => {
            m.initialDescType.activation = 100;
            m.initialDescriptor.activation = 100;
            m.targetDescType.activation = 100;
            m.targetDescriptor.activation = 100;
        });

        const mappings = correspondence.conceptMappings.filter(
            m => m.isDistinguishing());
        const numMappings = mappings.length;

        const urgency = CodeletUtils.getUrgencyBin(
             mappings.reduce((a,b) => a + b.strength(), 0) / (numMappings || 1));

        const newCodelet = this.factory.create(
            'correspondence-strength-tester', urgency, [correspondence]);

        this.post(newCodelet);

        return correspondence;
    }


    /**
     * Posts a group-strength-tester codelet for a Group with 
     * the given attributes.
     *  
     */ 
    proposeGroup(objects, bondList, groupCategory, directionCategory, bondFacet)
    {
        const bondCategory = groupCategory.getRelatedNode(
            this.ctx.slipnet.bondCategory);
        bondCategory.activation = 100;
        if (directionCategory) { directionCategory.activation = 100; }
        
        const wstring = objects[0].string;
        const group = new Namespace.Group(wstring, groupCategory, 
            directionCategory, bondFacet, objects, bondList);

        // Provide UI feedback.
        if (this.ctx.ui) {
            this.ctx.ui.workspaceUi.getStringGraphic(wstring).
                groupsGraphic.flashGrope(group);
        }

        const urgency = CodeletUtils.getUrgencyBin( 
            bondCategory.bondDegreeOfAssociation() );

        const newCodelet = this.factory.create(
            'group-strength-tester', urgency, [group]);

        this.post(newCodelet);
        
        return group;
    }


    /**
     * Posts a rule-strength-tester codelet for a Rule with 
     * the given attributes.
     *  
     */ 
    proposeRule(facet, description, category, relation)
    {
        const rule = new Namespace.Rule(this.ctx, 
            facet, description, category, relation);
        rule.updateStrength();

        let depth = 0;
        if (description && relation) {
            const averageDepth = (description.depth + relation.depth) / 2;
            depth = 100 * Math.sqrt(averageDepth / 100);
        }
        const urgency = CodeletUtils.getUrgencyBin(depth);

        const newCodelet = this.factory.create(
            'rule-strength-tester', urgency, [rule]);

        this.post(newCodelet);

        return rule;
    }

};


})( window.CopycatJS = window.CopycatJS || {} );