var lastDragXPTO = null;
var lastDrag = null;
var leapInfo = null;
var isServerConnected = null;
var controller = null;
var options = null;
var isConnected = null;
var canDrag = true;
var	pano = null;
var	earthPosition = null
var panoOptions = null;
// how long it should wait after a throw before allowing image dragging after a throw
const throwTimer = 0.1; 
// the minimum velocity to drag a image
const dragVelocityThreshold = 200;
// the minimum velocity to throw
const throwVelocityThreshold = 1000;
// should be the same as data-throwable value
const throwVelocity = 1.5;

const directionEnum = {
	RIGHT: 1,
	LEFT: 2,
	UP: 3,
	DOWN: 4
};

init();

function init()
{
	this.prepareStreetMap();

	this.prepareLeapMotion();
}

function prepareStreetMap()
{
	lastDrag = {
		right: new Date(),
		left: new Date(),
		up: new Date(),
		down: new Date()
	};

	lastDragXPTO = {
		heading: new Date(),
		pitch: new Date()
	};

	earthPosition = new google.maps.LatLng(38.897526, -77.0370613);

	panoOptions = {
		position: earthPosition,
		pov: {
			heading: 0,
		    pitch: 0
		}
	};

	pano = new google.maps.StreetViewPanorama(document.getElementById('panorama'), panoOptions);
}

function prepareLeapMotion()
{
	leapInfo = this.leapInfo = document.getElementById('leapInfo');
	isServerConnected = false;
	isConnected: true;
	options = {enableGestures: false};

	// give initial feedback regarding leap motion controller
	updateInfo();

	controller = new Leap.Controller();
	controller.connect();

	controller.on('streamingStarted', (function(){
		isConnected = true;
		updateInfo();
	}));

	controller.on('deviceStopped', (function(){
		isConnected = false;
		updateInfo();
	}));

	controller.on('connect', (function()
	{
		isServerConnected = true;
		updateInfo();
	}));

	Leap.loop(options, onFrame);
}

function updateInfo()
{
	if(!isServerConnected)
	{
		leapInfo.innerHTML = 'Waiting for the Leap Motion Controller server...';
		leapInfo.style.display = 'block';
	}
	else if(isConnected)
	{
		leapInfo.innerHTML = '';
		leapInfo.style.display = 'none';
	}
	else if(!isConnected)
	{
		leapInfo.innerHTML = 'Please connect your Leap Motion Controller if you want to use it.';
		leapInfo.style.display = 'block';
	}
}

function onFrame(frame)
{
	//console.log("Frame event for frame " + frame.id);

    if(!isConnected || !frame.valid) return;

  	// Retrieves first hand - no need to get it by ID, since we're not fetching hand based time behaviour
  	if (frame.hands.length > 0) {

  		hand = frame.hands[0];

  		if (extendedFingersCount(hand) < 4){
  			//return;
  		}

  		var velocityX = hand.palmVelocity[0];
  		var velocityY = hand.palmVelocity[1];

  		// debug
  		//console.log(velocityY);

  		var pov = pano.getPov();

  		//var canDragX = canDoGesture(true);
  		//var canDragY = canDoGesture(false);

		var canRotateCW = canDoGesture(directionEnum.RIGHT);
		var canRotateCCW = canDoGesture(directionEnum.LEFT);

		if (canRotateCW && velocityX > dragVelocityThreshold){
			updatePOV(true, -1.5);
			handleHighVelocity(true, velocityX);
  		}
  		else if (canRotateCCW && velocityX < -dragVelocityThreshold){
  			updatePOV(true, 1.5);
  			handleHighVelocity(false, velocityX);
  		}
  		
  		//var canRotateUp = canDoGesture(directionEnum.UP);
  		//var canRotateDown = canDoGesture(directionEnum.DOWN);

  		if (velocityY > dragVelocityThreshold){
  			updatePOV(false, -1);
  			//handleHighVelocity();
  		}
  		else if (velocityY < -dragVelocityThreshold){
  			updatePOV(false, 1);
  		}

  		pano.setPov(pov);
  	}
}

function updatePOV(changeHeading, value){
	var pov = pano.getPov();

	var property = changeHeading ? 'heading' : 'pitch';

	pov[property] += value;
}

function handleHighVelocity(clockwise, velocity){
	if (velocity < -throwVelocityThreshold || velocity > throwVelocityThreshold){
		var property = clockwise ? 'right' : 'left';
		lastDrag[property] = new Date();
	}
}

function canDoGesture(direction)
{
	var now = new Date(); 

	// if we are trying to move clockwise (right), 
	// we need to make sure the latest counter-clockwise (left) gesture 
	// didn't occur while in the timer interval and vice-versa
	// same deal with rotating up and down
	var mirror = mirrorDirection(direction);

	var diff = now.getTime() - mirror.getTime();

	var days = Math.floor(diff / (1000 * 60 * 60 * 24));
	diff -=  days * (1000 * 60 * 60 * 24);

	var hours = Math.floor(diff / (1000 * 60 * 60));
	diff -= hours * (1000 * 60 * 60);

	var mins = Math.floor(diff / (1000 * 60));
	diff -= mins * (1000 * 60);

	var seconds = Math.floor(diff / (1000));
	diff -= seconds * (1000);

	if (days > 0 || hours > 0 || mins > 0 || seconds > throwTimer) {
		return true;
	}

	return false;
}

function mirrorDirection(rotationDirection){
	switch(rotationDirection){
		case directionEnum.RIGHT:
			return lastDrag.left;
		case directionEnum.LEFT:
			return lastDrag.right;
		case directionEnum.UP:
			return lastDrag.down;
		case directionEnum.DOWN:
			return lastDrag.up;
		default:
			throw new Error('invalid direction');
	}
}

function extendedFingersCount(hand)
{
	var count = 0;
	hand.fingers.forEach(function(finger){
	    if (finger.extended) {
	    	count++;
	    };
	});
	return count;
}