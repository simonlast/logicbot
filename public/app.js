
var play = function(pjs) {

	//style
	var bkg = pjs.color(250);
	var PartColor = pjs.color(60,172);
	var fontSize = 60;

	//vars
	var parts = [];
	var groups = [];
	//new part dragged
	var currPart = null;
	//part activated
	var centerPart = null;
	var center;

	var translated;
	var a_translated;
	var mouse;

	var gridSize;
	var gridStroke;

	var edge = 1/3;

	var multiTouch = false;

	var controlDimen;

	var types;
	var typeDict;

	//modes
	var attachMode = false;
	var showMenu = true;

	//physical constants
	var K = .02;
	var G = 20000;
	var maxAccel = 2;
	var maxFloatV = 4;
	var snapDist;
	var floatMultiplier = .37;
	var defaultFallSpeed = 1;

	pjs.setupScreen = function(){
		pjs.size(pjs.screenWidth, pjs.screenHeight);
		var ratio = pjs.height/pjs.width;
		snapDist = pjs.width*ratio/4;

		gridSize = pjs.width*ratio/15;
		gridStroke = pjs.width*ratio/200;

		mouse = new pjs.PVector();

		types = [
			{
				name: 'Button',
				constructor: Button,
				color: pjs.color(99,136,142),
				help: "Press a Button to start a chain reaction, activating everything it is connected to."
			},
			{
				name: 'Thruster',
				constructor: Thruster,
				color: pjs.color(232,179,119),
				help: "When activated, a Thruster will move in the direction of the button that activated it."
			},
			{
				name: 'AndGate',
				constructor: AndGate,
				color: pjs.color(147,181,159),
				help: "An AND Gate will only activate if all of its inputs are active."
			},
			{
				name: 'NotGate',
				constructor: NotGate,
				color: pjs.color(237,212,142),
				help: "A NOT Gate will only activate if it hasn't been activated by any other button."
			},
			{
				name: 'OrGate',
				constructor: OrGate,
				color: pjs.color(200,220,142),
				help: "An OR gate will activate if any of its inputs are active."
			},
			{
				name: 'DeleteButton',
				constructor: DeleteButton,
				color: pjs.color(214,120,97),
				help: "Drag the DeleteButton over another button to delete it."
			},
			{
				name: 'AttachButton',
				constructor: AttachButton,
				color: pjs.color(180),
				help: "Use the attach button to connect two buttons by dragging from one to another."
			}
		];

		center = new pjs.PVector();

		typeDict = {};

		var cols = Math.ceil(types.length/4);
		controlDimen = new pjs.PVector(80 * cols + 100, pjs.height);
		var rows = Math.floor(controlDimen.y / 120);

		var j = 0;
		var y = 0;

		for(var i=0; i<types.length; i++){
			if((i+1)%(rows+1) == 0){
				j++;
				y = 0;
			}
			var curr = types[i];
			typeDict[curr.name] = curr
			curr.pos = new pjs.PVector(controlDimen.x/cols*(j) + 67, y + 80);
			y += (controlDimen.y/rows);
		}

		console.log(typeDict);

		translated = new pjs.PVector(pjs.width/2, pjs.height/2);
		a_translated = new pjs.PVector(pjs.width/2, pjs.height/2);

	};

	pjs.setup = function(){
		
		pjs.setupScreen();

		pjs.noStroke();
		pjs.smooth();
		pjs.textAlign(pjs.CENTER);
		
		var b = new Button(0,0,100);
		centerPart = b;
		parts.push(b);

	};

	pjs.draw = function(){
		pjs.background(bkg);

		if(!currPart)
			adjustTranslation();

		mouse.x = pjs.mouseX - translated.x;
		mouse.y = pjs.mouseY - translated.y;

		pjs.pushMatrix();
		pjs.translate(translated.x,translated.y);

		drawGrid();

		for(var i = 0; i<parts.length; i++) {
			parts[i].setupTick();
		}
		if(currPart){
			currPart.drawLinks();
			currPart.drawPossibleLinks();
		}

		center.x = 0;
		center.y = 0;

		for(var i = 0; i<parts.length; i++) {
			parts[i].render();
			center.add(parts[i].pos);
		}

		center.div(parts.length);

		if(currPart){
			currPart.render();
			
		}

		for(var i = 0; i<parts.length; i++) {
			parts[i].finish();
		}

		pjs.popMatrix();

		
		if(showMenu)
			drawMenu();
		
	};

	var drawGrid = function(){
		pjs.fill(235);
		
		var minX = Math.round((-1*translated.x)/gridSize)*gridSize + gridSize/2;
		var maxX = pjs.width - translated.x;
		for(var x = minX; x < maxX; x+=gridSize){
			pjs.rect(x, -1*translated.y , gridStroke, pjs.height);
		}

		var minY = Math.round((-1*translated.y)/gridSize)*gridSize + gridSize/2;
		var maxY = pjs.height - translated.y;
		for(var y = minY; y < maxY; y+=gridSize){
			pjs.rect(-1*translated.x, y , pjs.width, gridStroke);
		}
	
	};

	pjs.toggleMenu = function(){
		showMenu = !showMenu;
	}

	var drawMenu = function(){

		pjs.fill(172,100);
		pjs.rect(0,0,controlDimen.x, controlDimen.y);
		pjs.textSize(18);

		for(var i=0; i<types.length; i++){
			var curr = types[i];
			
			pjs.fill(curr.color);
			pjs.ellipse(curr.pos.x, curr.pos.y, 80,80);
			pjs.fill(100,172);
			pjs.text(curr.name, curr.pos.x, curr.pos.y-45);
		}


	};

	pjs.mousePressed = function(){

		if(parts.length <= 0 || multiTouch){
			return;
		}

		mouse.x = pjs.mouseX - translated.x;
		mouse.y = pjs.mouseY - translated.y;

		if(attachMode){
			activateAttach();
			return;
		}

		if(showMenu && mouse.x <= (controlDimen.x-translated.x)){
			activateController();
			return;
		}

		var minPart = findNearestPart(parts, mouse);


		if(minPart && minPart.dist < snapDist){
			if(attachMode){
				currPart.attachFrom(minPart.el);
			}else{
				minPart.el.active = true;
			}
			//update help
			document.getElementById('info').innerHTML = typeDict[minPart.el.type].help;
		}
	};

	pjs.mouseReleased = function(){

		if(attachMode){
			attachRelease();
			return;
		}

		//deactivate all
		for(var i=0; i<parts.length; i++){
			parts[i].active = false;
		}

		if(currPart){
			currPart.attach();
			currPart = null;
		}
		
		
	};

	/*
	pjs.touchMove = function(touchEvent){
		multiTouch = true;
  		for (var i = 0; i < touchEvent.touches.length; i++) {
    		var x = touchEvent.touches[i].offsetX;
    		var y = touchEvent.touches[i].offsetY;
    		mouse.x = x - translated.x;
			mouse.y = y - translated.y;
    		var minPart = parts[0];
			var minDist = pjs.PVector.dist(mouse, parts[0].part.pos);

			if(parts.length > 1){
				for(var i=1; i<parts.length; i++){		
					var currDist = pjs.PVector.dist(mouse,parts[i].part.pos);
					if(currDist < minDist){
						minDist = currDist;
						minPart = parts[i];
					}
				}
			}
			if(minDist < snapDist){
				minPart.active = true; 
	  		}
	  	}
  	};
	*/
	
	var activateAttach = function(){
		console.log("activateAttach");
		var nearest = findNearestPart(parts, currPart.pos);

		if(nearest && nearest.dist < snapDist){
			currPart.attached.from = nearest.el;
		}

		console.log(currPart.attached);

	};

	var attachRelease = function(){
		console.log("attachRelease");

		currPart.timesUsed++;

		if(currPart.timesUsed <= 1){
			return;
		}else if(currPart.timesUsed == 2){
			console.log(currPart.attached);
			if(currPart.attached.to){
				currPart.finish();
				currPart = null;
				attachMode = false;
			}
		}else{
			currPart = null;
			attachMode = false;
		}

	};

	var activateController = function(){

		var tmouse = new pjs.PVector(pjs.mouseX, pjs.mouseY);

		var minType = findNearestPart(types, tmouse);

		if(minType && minType.dist < snapDist){
			//update help
			document.getElementById('info').innerHTML = typeDict[minType.el.name].help;
			currPart = new minType.el.constructor(mouse.x, mouse.y, 80);
		}
	}

	/*
	* arr: an array of objects with a pos vector
	* vec: a vector
	*/
	var findNearestPart = function(arr, vec){
		if(arr.length == 0){
			return null;
		}

		var minT = arr[0];
		var minDist = pjs.PVector.dist(vec, arr[0].pos);

		if(arr.length > 1){
			for(var i=1; i<arr.length; i++){		
				var currDist = pjs.PVector.dist(vec,arr[i].pos);
				if(currDist < minDist){
					minDist = currDist;
					minT = arr[i];
				}
			}
		}

		return {
			el: minT,
			dist: minDist
		};
	};

	var adjustTranslation = function(){
		//var center = centerPart.pos;
		/*var screenPos = new pjs.PVector(center.x + translated.x,
			center.y + translated.y);
		if(screenPos.x < pjs.width*edge){
			translated.x = pjs.width*edge - center.x;
		}else if(screenPos.x > pjs.width*(1-edge)){
			translated.x = pjs.width*(1-edge) - center.x;
		}
		if(screenPos.y < pjs.height*edge){
			translated.y = pjs.height*edge - center.y;
		}else if(screenPos.y > pjs.height*(1-edge)){
			translated.y = pjs.height*(1-edge) - center.y;
		}*/

		a_translated.x = pjs.width/2 - center.x;
		a_translated.y = pjs.height/2 - center.y;

		translated.x += (a_translated.x - translated.x)*.05;
		translated.y += (a_translated.y - translated.y)*.05;

	};

	var Part = Class.create({

		initialize: function(x, y, rad){
			this.pos = new pjs.PVector(x, y);
			this.lastPos = new pjs.PVector();
			this.v = new pjs.PVector();
			this.a = new pjs.PVector();
			this.rot = 0;
			this.neighbors = []; //adjacent, not necessarily connected

			this.rad = rad;
			this.clickable = true;
			//used during drag phase
			this.minPart;
			this.active = false;
			this.connected = []; //connected in circuit

			//chainReacted this tick
			this.reacted = false;
		},

		setupTick: function(){
			this.reacted = false;
			this.drawLinks();
			//this.drawPossibleLinks();
		},

		tick: function(){
			this.lastPos.x = this.pos.x;
			this.lastPos.y = this.pos.y;

			//attract neighbors
			for(var i=0; i<this.neighbors.length; i++){
				var curr = this.neighbors[i];
				this.hooke(curr);
			}

			//repel all
			for(var i=0; i<parts.length; i++){
				var curr = parts[i];
				if(curr != this){
					this.coloumb(curr);
				}
			}
			
			//drag
			this.v.mult(.9);
			
			this.limitAccel();
			this.v.add(this.a);
			this.pos.add(this.v);


			this.a.x = 0;
			this.a.y = 0;
		},

		hooke: function(other){
			var fromOrig = pjs.PVector.sub(this.pos,other.pos);
			fromOrig.mult(-1*K)
			this.a.x += fromOrig.x;
			this.a.y += fromOrig.y;
		},

		coloumb: function(other){
			var dist = pjs.PVector.dist(other.pos, this.pos);
			var accel = new pjs.PVector(this.pos.x, this.pos.y);
			accel.sub(other.pos);
			accel.normalize();
			accel.mult(G/(dist*dist));
			this.a.add(accel);
		},

		limitAccel: function(){
			if(this.a.x > maxAccel){
					this.a.x = maxAccel;
			}
			else if(this.a.x < -1*maxAccel){
					this.a.x = -1*maxAccel;
			}

			if(this.a.y > maxAccel){
					this.a.y = maxAccel;
			}
			else if(this.a.y < -1*maxAccel){
					this.a.y = -1*maxAccel;
			}
		},

		drawPossibleLinks: function(){
			if(parts.length == 0)
				return;

			var minPart = findNearestPart(parts, this.pos);

			if(minPart && minPart.dist < snapDist){
				this.drawLink(minPart.el.pos, this.pos);
				this.minPart = minPart.el;
			}else{
				this.minPart = null;
			}
		},

		drawLink: function(from, to){
			pjs.fill(80,100);
			var diff = pjs.PVector.sub(from, to);
			diff.normalize();
			diff.mult(this.rad/4);
			pjs.triangle(from.x - diff.y, from.y + diff.x, 
				from.x + diff.y, from.y - diff.x,
				to.x, to.y);
		},

		drawLinks: function(){

			for(var i=0; i<this.connected.length; i++){
				this.drawLink(this.pos,this.connected[i].pos);
			}
		},

		render: function(){

			if(!currPart)
				this.tick();

			if(this == currPart){
				this.pos.x = mouse.x;
				this.pos.y = mouse.y;
			}
			
			pjs.pushMatrix();
			pjs.translate(this.pos.x, this.pos.y);
			pjs.rotate(this.rot + this.v.x/50);
			pjs.ellipse(0, 0, this.rad, this.rad);
			pjs.popMatrix();

		},

		connect: function(other){
			//connect parts in graph
			if(this.neighbors.indexOf(other) == -1)
				this.neighbors.push(other);
			if(other.neighbors.indexOf(this) == -1)
				other.neighbors.push(this);

			//only directionally connect parent
			if(this.connected.indexOf(other) == -1)
				this.connected.push(other);
		},

		disconnect: function(other){

			var th = this;

			other.neighbors = other.neighbors.filter(function(o){
				console.log(o != th);
				return o != th;
			});

			other.connected = other.connected.filter(function(o){
				return o != th;
			});
		},

		disconnectAll: function(){
			for(var i=0; i<this.neighbors.length; i++){
				var curr = this.neighbors[i];
				this.disconnect(curr);
			}
		},

		chainReact: function(source){
			if(this.reacted){
				return;
			}
			this.reacted = true;
			//continue reaction
			for(var i=0; i<this.connected.length; i++){
				var curr = this.connected[i];
				curr.chainReact(this);
			}
			/*pjs.stroke(100,172);
			pjs.strokeWeight(5);
			pjs.line(this.pos.x, this.pos.y - this.rad, this.pos.x, this.pos.y + this.rad);
			pjs.noStroke();*/
			//pjs.fill(172,172);
			//pjs.ellipse(this.pos.x, this.pos.y, this.rad+10, this.rad+10);
		},

		finish: function(){

		},

		attach: function(){
			if(this.minPart){
				parts.push(this);
				this.minPart.connect(this);
			}
		}
		

	});

	//button part
	var Button = Class.create(Part, {
		type: 'Button',
		render: function($super){

			if(this.active){
				this.chainReact(this);	
				pjs.fill(84,115,115);
			}else{
				pjs.fill(typeDict['Button'].color);
			}

			$super();
		}

	});

	var Thruster = Class.create(Part, {
		type: 'Thruster',
		render: function($super){
			pjs.fill(typeDict['Thruster'].color);
			$super();
		},

		chainReact: function($super, source){
			//thrust
			if(!this.reacted){
				var diff = pjs.PVector.sub(source.pos, this.pos);
				diff.normalize();
				this.a.add(diff);
				$super(source);
			}
		}

	});

	var NotGate = Class.create(Part, {
		type:'NotGate',
		initialize: function($super, x, y, rad){
			this.on = true;
			$super(x, y, rad);
		},

		drawLinks: function($super){
			this.on = true;
			$super();
		},

		render: function($super){
			pjs.fill(typeDict[this.type].color);
			$super();
		},

		chainReact: function($super, source, callOrig){
			//thrust
			if(callOrig)
				$super(source);
			this.on = false;
		},

		finish: function(){
			if(this.on)
				this.chainReact(this, true);
		}

	});

	var DeleteButton = Class.create(Part, {
		type:'DeleteButton',
		initialize: function($super, x, y, rad){
			this.on = true;
			$super(x, y, rad);
		},

		drawLinks: function($super){
			this.on = true;
			$super();
		},

		render: function($super){
			pjs.fill(typeDict[this.type].color);
			$super();
		},

		chainReact: function($super, source, callOrig){
			return;
		},

		attach: function(){
			if(this.minPart && this.minPart != centerPart){
				this.minPart.disconnectAll();
				console.log(parts);
				var minPart = this.minPart
				parts = parts.filter(function(o){
					return o != minPart;
				});
				console.log(parts);
			}
		},

		drawLink: function(from, to){
			pjs.fill(typeDict[this.type].color,100);
			var diff = pjs.PVector.sub(from, to);
			diff.normalize();
			diff.mult(this.rad/4);
			pjs.triangle(from.x - diff.y, from.y + diff.x, 
				from.x + diff.y, from.y - diff.x,
				to.x, to.y);
		},

	});

	var AttachButton = Class.create(Part, {
		type:'AttachButton',
		initialize: function($super, x, y, rad){
			this.on = true;
			this.timesUsed = 0;
			attachMode = true;
			this.attached = {
				from: null,
				to: null
			};
			$super(x, y, 40);
		},

		drawLinks: function($super){
			this.on = true;
			$super();
		},

		render: function($super){
			pjs.fill(typeDict[this.type].color);
			$super();
		},

		chainReact: function($super, source, callOrig){
			return;
		},

		attach: function(){
			return;
		},

		drawPossibleLinks: function($super){
			if(this.attached.from){
				var minPart = findNearestPart(parts, this.pos);

				if(minPart && minPart.dist < snapDist && minPart.el != this.attached.from){
					this.attached.to = minPart.el;
					this.drawLink(this.attached.from.pos, minPart.el.pos);
				}else{
					this.attached.to = null;
					this.drawLink(this.attached.from.pos, this.pos);
				}

				console.log(this.attached);
			}else{
				$super();
			}
		},

		finish: function(){
			console.log(this.attached.from);
			console.log(this.attached.to);
			if(this.attached.from && this.attached.to){
				console.log("connect");
				this.attached.from.connect(this.attached.to);
			}
		}

	});

	var AndGate = Class.create(Part, {
		type:'AndGate',
		initialize: function($super, x, y, rad){
			this.on = true;
			this.numActivated = 0;
			$super(x, y, rad);
		},

		setupTick: function($super){
			this.numActivated = 0;
			$super();
		},

		drawLinks: function($super){
			this.on = true;
			$super();
		},

		render: function($super){
			pjs.fill(typeDict[this.type].color);
			$super();
		},

		chainReact: function($super, source){
			this.numActivated++;
			var num = 0;
			for(var i=0; i<this.neighbors.length; i++){
				if(this.neighbors[i].connected.indexOf(this) != -1){
					num++;
				}
			}
			//console.log(this.numActivated + ", " +num);
			if(this.numActivated == num){
				$super(this);

			}
			
		}

	});

	var OrGate = Class.create(Part, {
		type:'OrGate',
		render: function($super){
			pjs.fill(typeDict[this.type].color);
			$super();
		},

	});

};

var canvas = document.getElementById("pcanvas");
var pjs = new Processing(canvas, play);

window.onresize = function(event) {
   pjs.setupScreen();
}

