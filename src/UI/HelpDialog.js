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
     * @param {HTMLElement} parent - The html div that hosts
     *  the dialog.
     */
    constructor(parent) 
    {
        super(parent, 65, 80, 'Copycat Help', false, '#d5bfa2', '#c09f72');
        this._buildUi();
    }


    _buildUi()
    {
        this.textDiv = Namespace.UiUtils.CreateElement('div', 'text-div',
            this.userDiv, {top:'3%', left:'3%', width:'94%', height:'94%',
            fontSize:'1.7vh', fontFamily:this.fontFamily});

        this.textDiv.innerHTML =
        '<p>Copycat is a computer model of human analogy-making.</p>' + 
        '<p>It tries to solve letter puzzles of the form "<b><i>abc</i></b> is to <b><i>abd</i></b> as <b><i>ijk</i></b> is to what?"</p>' +
        '<p>You can enter puzzle strings in the green upper-left area, then click the <i>play</i> button to watch Copycat "think" about ' +
        'a solution. You can also pause, single-step, reset, and adjust the speed of the thinking.</p>' +

        '<p>Some interesting examples to try are:</p>' +
        '<ul>' +
        '<li> <b><i>abc</b></i> &#x2192; <b><i>abd</b></i>, &nbsp; <b><i>kji</b></i> &#x2192; ?</li>' +
        '<li> <b><i>abc</b></i> &#x2192; <b><i>abd</b></i>, &nbsp; <b><i>iijjkk</b></i> &#x2192; ? </li>' +
        '<li> <b><i>abc</b></i> &#x2192; <b><i>abd</b></i>, &nbsp; <b><i>mrrjjj</b></i> &#x2192; ?</li>' +
        '</ul>' +

        '<p>While it&rsquo;s running, Copycat displays the bonds it finds between adjacent letters (as blue lines), ' +
        'the correspondences it finds between the initial and target strings (as purple jagged lines), ' + 
        'groups that it thinks may be important (as green boxes), descriptions of all the letters ' +
        '(gray text) and other information. A flashing graphic indicates a structure that Copycat is considering ' + 
        ' but hasn&rsquo;t yet committed to.</p>' + 

        '<p>The thermometer indicates how "happy" Copycat is with its current progress; lower temperatures ' + 
        'imply greater happiness.</p>' +

        '<p>In the yellow <i>Slipnet</i> area, Copycat&rsquo;s built-in concepts are shown in a grid. ' + 
        'The size of the dot over each concept indicates how important that concept is to Copycat at the current moment.</p>' +

        '<p>The pink <i>Coderack</i> area displays a list of the subroutines or "codelets" that Copycat ' +
        'uses to perform its work. The number of each type of codelet currently in Copycat&rsquo;s stack in shown in a dynamical ' +
        'bar graph.</p>' +

        '<br/>' +
        '<p>For (much) more information, check out the book <i>Fluid Concepts and Creative Analogies</i> by Douglas Hofstadter et. al.</p>';
    }

};

})( window.CopycatJS = window.CopycatJS || {} );




