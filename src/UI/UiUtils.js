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
    var elem = document.createElement(type);
    elem.id = id;
    if (parent) { parent.append(elem); }

    if (styles) {
        for (var styName in styles) {
            if (Object.prototype.hasOwnProperty.call(styles, styName)) {
                var val = styles[styName];
                if (typeof val === 'number') { val = val.toString() + 'px'; }
                elem.style[styName] = val;
            }
        }
    }
    if (props) {
        for (var propName in props) {
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
    for (var propName in styles) {
        if (Object.prototype.hasOwnProperty.call(styles, propName)) {
            var val = styles[propName];
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