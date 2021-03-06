// Verl2d Colours

//Copyright (c) 2013 Peter Corbett

//Permission is hereby granted, free of charge, to any person obtaining a copy
//of this software and associated documentation files (the "Software"), to deal
//in the Software without restriction, including without limitation the rights
//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//copies of the Software, and to permit persons to whom the Software is
//furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in
//all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//THE SOFTWARE.

// A variant on verl2d that clusters similar colours together.

// Set up HTML 5 stuff
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

// Set up various constants
// Verlet time resolution
var timeStep = 0.1;
var ts2 = timeStep * timeStep;
// Time steps per displayed frame
var cycles = 10;

// Width of wall in pixels, strength of wall - force constant of springs
// that line wall
var wallwidth = 10.0;
var wallk = 10.0;

// Gravitational acceleration
var gravacc = 0.0;
// particle-particle gravity
var gravc = 1.0;
// Resistance - Multiply raw value by time step
var resist = 0;
// Heating - add random thermal motion each step
var heat = 0.0;
// Resistance when in contact with walls
var coldwall = 0.5 * timeStep;
// Heating when in contact with walls
var hotwall = 0;
// Lennard-Jones constant
var ljm = 0.1;

// Repulsion exponent
var rexp = 12;
// Colour constants
// Colour force constant
var colk = 10;
// Colour force exponent
var coldexp = 2;
// Colour distance constant
var coldk = 1;
// Colour distance exponent
var coldexp = 1;

// Is the top of the arena closed?
var cclosed = 0;

// Generation
// Arena width and height
var gwidth = 640;
var gheight = 480;

var number = [];
var m = [];
var vm = [];
var c = [];
var cb = [];
var r = [];
var pol = [];
var ch = [];

// Runtime variables
var items = [];
var interacts = [];
var itemDict = {};

var nframes = 0;
var lost = 0;

// Read the HTML form
function readform() {
	gravc = parseFloat(document.getElementById("gravc").value);
	gravacc = parseFloat(document.getElementById("gravacc").value);
	ljm = parseFloat(document.getElementById("ljm").value);
	rexp = parseFloat(document.getElementById("rexp").value);
	resist = parseFloat(document.getElementById("resist").value) * timeStep;
	coldwall = parseFloat(document.getElementById("coldwall").value) * timeStep;
	heat = parseFloat(document.getElementById("heat").value) * Math.sqrt(timeStep);
	hotwall = parseFloat(document.getElementById("hotwall").value) * Math.sqrt(timeStep);
	timeStep = parseFloat(document.getElementById("timeStep").value);
	ts2 = timeStep * timeStep;
	cycles = parseInt(document.getElementById("cycles").value);
	wallk = parseFloat(document.getElementById("wallk").value);
	wallwidth = parseInt(document.getElementById("wallwidth").value);
	colk = parseFloat(document.getElementById("colk").value);
	colexp = parseFloat(document.getElementById("colexp").value);
	coldk = parseFloat(document.getElementById("coldk").value);
	coldexp = parseFloat(document.getElementById("coldexp").value);

	
	gwidth = parseFloat(document.getElementById("gwidth").value);
	gheight = parseFloat(document.getElementById("gheight").value);

	number[0] = parseInt(document.getElementById("p1n").value);
	m[0] = parseFloat(document.getElementById("p1m").value);
	ch[0] = parseFloat(document.getElementById("p1ch").value);
	r[0] = parseFloat(document.getElementById("p1r").value);
	pol[0] = parseFloat(document.getElementById("p1pol").value);
	vm[0] = parseFloat(document.getElementById("p1vm").value);
	
	cclosed = document.getElementById("closed").checked ? 1 : 0;
}

// Some initial clearing-up which is unlikely to have a huge effect
function presetup() {
	canvas.width = gwidth;
	canvas.height = gheight;
	
	items = [];
	interacts = [];
	itemDict = {};
}

// Setup - this could vary from version to version
function setup() {
	
	var id = 0;
	for(var j=0;j<number.length;j++) {	
		for(var i=0;i<number[j];i++) {
			// Modified wall width
			var mww = wallwidth + r[j];
			// Modified canvas width
			var mwidth = canvas.width - (2*mww);
			// Modified canvas height
			var mheight = canvas.height - (2*mww);
			var x = (Math.random()*mwidth)+mww;
			var y = (Math.random()*mheight)+mww;
			
			var red = Math.floor(Math.random()*255);
			var green = Math.floor(Math.random()*255);
			var blue = Math.floor(Math.random()*255);
			
			c[j] = "rgb("+red+","+green+","+blue+")";
			//c[j] = red.toString(16)+green.toString(16)+blue.toString(16);
			//c[j] = (red + (256*green) + (65536*blue)).toString(16);
			cb[j] = "rgb("+Math.floor(red/2)+","+Math.floor(green/2)+","+Math.floor(blue/2)+")";
			
			items.push({id:id,x:x,y:y,xv:(Math.random()-0.5)*vm[j],yv:(Math.random()-0.5)*vm[j],c:c[j],cb:cb[j],r:r[j],m:m[j],ch:ch[j],pol:pol[j],red:red,green:green,blue:blue});
			id++;
		}
	}
	// Now, check to see if particles are too close to each other
	var conflict = 1;
	while(conflict > 0) {
		conflict = 0;
		// For all particles...
		for(var i=0;i<items.length-1;i++) {
			for(var j=i+1;j<items.length;j++) {
				var a = items[i];
				var b = items[j];
				// Distance by Pythagoras
				var dist = Math.sqrt(((a.x-b.x)*(a.x-b.x)) + ((a.y-b.y)*(a.y-b.y)));
				// A little bit of ovelap isn't too bad
				if(dist < (a.r + b.r)*0.8) {
					// Ease particles apart by 1 pixel
					a.x -= (b.x-a.x)/dist;
					a.y -= (b.y-a.y)/dist;
					b.x -= (a.x-b.x)/dist;
					b.y -= (a.y-b.y)/dist;
					// Note that easing was needed
					conflict++;
					// Confine particles within the walls.
					a.x = Math.max(a.x, wallwidth + a.r + 1);
					a.x = Math.min(a.x, canvas.width-wallwidth - a.r - 1);
					a.y = Math.max(a.y, wallwidth + a.r + 1);
					a.y = Math.min(a.y, canvas.height-wallwidth - a.r -1 );
					b.x = Math.max(b.x, wallwidth + b.r + 1);
					b.x = Math.min(b.x, canvas.width-wallwidth - b.r - 1);
					b.y = Math.max(b.y, wallwidth + b.r + 1);
					b.y = Math.min(b.y, canvas.height-wallwidth - b.r - 1);
				}
			}
		}
	}
	
}

// Some standard end-of-setup functions 
function endsetup() {
	itemDict = {};
		for(var i=0;i<items.length;i++) {
		// The verlet integration that I'm using uses implicit velocites, so
		// calculate "previous" positions from velocities
		items[i].ox = items[i].x - (items[i].xv * timeStep);
		items[i].oy = items[i].y - (items[i].yv * timeStep);
		itemDict[items[i].id] = items[i];
		//
		items[i].live = 1;
	}
	nframes = 0;
	lost = 0;
} 

// Update a frame - several cycles of Verlet propagation
function update(mod) {
	var tt = Date.now();
	// Several cycles
	for(var iter=0;iter<cycles;iter++) {
		// Reset the accelerations
		for(var i=0;i<items.length;i++) {
			var item = items[i];
			item.xa = 0;
			item.ya = 0;
		}
		// Look at specific interactions - so far I've only implemented springs
		for(var i=0;i<interacts.length;i++) {
			// find what interacts
			var ina = interacts[i];
			var a = itemDict[ina.a];
			var b = itemDict[ina.b];
			if(a.live * b.live == 1) {
				// Calculate distance
				var dist = Math.sqrt(((a.x-b.x)*(a.x-b.x)) + ((a.y-b.y)*(a.y-b.y)));
				if(ina.r == -1) ina.r = dist;
				// Calculate force by Hookes' law - ut tensio sic vis
				var f = (dist - ina.r)*ina.k;
				// Force by distance - convenience;
				var fbd = f / dist;
				// f=ma => a = f/m, partition force in proportion to x and y distances.
				a.xa += (fbd/a.m) * (b.x-a.x);
				a.ya += (fbd/a.m) * (b.y-a.y);
				b.xa += (fbd/b.m) * (a.x-b.x);
				b.ya += (fbd/b.m) * (a.y-b.y);			
			}
		}
		var a;
		var b;
		var dist;
		var ljr;
		var dr;
		var dr6;
		var f;
		// Generic item-item interactions
		// We're assuming everything in items is live.
		for(var i=0;i<items.length-1;i++) {
			a = items[i];
			for(var j=i+1;j<items.length;j++) {
				b = items[j];
				// Distance
				dist = Math.sqrt(((a.x-b.x)*(a.x-b.x)) + ((a.y-b.y)*(a.y-b.y)));

				// Lennard-Jones.
				// ljr = sum of lennard-jones radii, dr = distance ration, dr6 is for calculation convenience
				ljr = a.r + b.r;
				dr = ljr / dist;
				// Lennard-Jones force - repulsion only
				f = -ljm*a.pol*b.pol*(Math.pow(dr,rexp))//-2*dr6);
				// Colour interactions
				var cdist = Math.sqrt(((a.red-b.red)*(a.red-b.red))+
				((a.green-b.green)*(a.green-b.green))+
				((a.blue-b.blue)*(a.blue-b.blue)))+coldk;
				f += Math.pow(dr,colexp) * colk /Math.pow(cdist,coldexp);
				// No Charge f -= Math.pow(dist,-2) * a.ch * b.ch * esm;
				// Particle-particle gravity
				f += Math.pow(dist,-2) * a.m * b.m * gravc;
				
				// Force by distance - convenience;
				var fbd = f / dist;
				// f=ma => a = f/m, partition force in proportion to x and y distances.
				a.xa += (fbd/a.m) * (b.x-a.x);
				a.ya += (fbd/a.m) * (b.y-a.y);
				b.xa += (fbd/b.m) * (a.x-b.x);
				b.ya += (fbd/b.m) * (a.y-b.y);			
			}
		}
	
		var nitems = [];
		// Lots of things to do per item
		for(var i=0;i<items.length;i++) {
			var item = items[i];
			var bad = 0;
			var onwall = 0;
			// See if the item is on a wall. If so, apply a force (as if the wall is covered in
			// springs and take a note for heating and cooling.
			if(item.x < wallwidth+item.r) {
				item.xa += (wallk/item.m) * (wallwidth+item.r-item.x);
				onwall = 1;
			}
			if(item.x > canvas.width - wallwidth-item.r) {
				item.xa += (wallk/item.m) * ((canvas.width-wallwidth-item.r)-item.x);
				onwall = 1;
			}
			// cclosed - the top wall may be absent, to allow evaporation
			if(cclosed == 1 && item.y < wallwidth+item.r) {
				item.ya += (wallk/item.m) * (wallwidth+item.r-item.y);
				onwall = 1;
			}
			if(item.y > canvas.height - wallwidth-item.r) {
				item.ya += (wallk/item.m) * ((canvas.height-wallwidth-item.r)-item.y);
				onwall = 1;
			}		
			// Apply downward gravitational acceleration
			item.ya += gravacc;
		
			// If an item is on a wall, then maybe heat it up or cool it down.
			var thisheat = heat;
			var res = resist;
			if(onwall == 1) {
				thisheat = hotwall;
				res = coldwall;
			}
		
			// Heating - add random motion. Doing this lots of times will result in a Gaussian
			// so the exact distribution isn't important (maybe we want one of those pathological
			// distributions such as a Lorentzian...)
			if(thisheat > 0) {
				item.ya += (Math.random()-0.5)*2 * thisheat;
				item.xa += (Math.random()-0.5)*2 * thisheat;
			}
		
			// Take a note of where the item was...
			var oox = item.x;
			var ooy = item.y;
			// Verlet integration - apply the acceleration to the new position. Use the old
			// position to (effectively) calculate velocity. Model "cooling" by applying resistance -
			// multiply "velocity" by (1 - resistance).
			item.x = ((2-res)*item.x) - ((1-res)*item.ox) + (item.xa * ts2);
			item.y = ((2-res)*item.y) - ((1-res)*item.oy) + (item.ya * ts2);
			// and now update the old positions
			item.ox = oox;
			item.oy = ooy;
			if(cclosed == 0 && item.y <= wallwidth+item.r) bad = 1
			// Have we exited the arena altogether?
			if(item.x < 0 || item.x > canvas.width) {
				bad = 1;
			}
			if(item.y < 0 || item.y > canvas.height) {
				bad = 1;
			}
			// Build a new list of live items
			if(bad == 0) {
				nitems.push(item);
			} else {
				item.live = 0;
				lost++;
			}
		}
		items = nitems;
	}
	nframes++;
	if(nframes % 10 == 0) {
		var e = document.getElementById("status");
		e.innerHTML = "calculation time per frame " + (Date.now()-tt) + " ms";
		if(lost > 0) e.innerHTML += " Lost particles: " + lost;
	}
}

// Draw a frame
function render() {
	// Background
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	// Per item
	for(var i=0;i<items.length;i++) {
		var item = items[i];
		ctx.fillStyle = item.c;
		ctx.strokeStyle = item.cb;
		ctx.lineWidth=1;
		ctx.beginPath();
		ctx.arc(item.x, item.y, item.r, 0, Math.PI*2);
		ctx.fill();
		ctx.stroke();
	}
	
	// Spring interactions
	for(var i=0;i<interacts.length;i++) {
		var ia = itemDict[interacts[i].a];
		var ib = itemDict[interacts[i].b];
		ctx.beginPath();
		ctx.strokeStyle = '#fff';
		ctx.lineWidth=1;
		ctx.moveTo(ia.x, ia.y);
		ctx.lineTo(ib.x, ib.y);
		ctx.stroke();
	}
}

// Do a frame
function run() {
	update((Date.now() - time) / 1000);
	render();
	time = Date.now();
}

// Set up
function reset() {
	readform();
	presetup();
	setup();
	endsetup();
}

reset();

var time = Date.now();
setInterval(run, 20);