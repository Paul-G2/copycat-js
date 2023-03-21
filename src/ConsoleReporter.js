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