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




