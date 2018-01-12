var lastDrag = null;
var changingHeading = null;
var leapInfo = null;
var isServerConnected = null;
var controller = null;
var options = null;
var isConnected = null;
var canDrag = true;
var	pano = null;
var panoOptions = null;
// panorama earth position
const earthPosition = {
	latitude: 51.8921804,
	longitude: 4.4180853
}
// how many degrees the heading should change when moving the right hand
const headingUpdateAmount = 1.5;
// how many degrees the pitch should change when moving the left hand
const pitchUpdateAmount = 1;
// how long it should wait after a throw before allowing image dragging after a throw
const dragBlockTimer = 0.1; 
// the minimum hand velocity to drag a image
const dragVelocityThreshold = 100;
// the minimum hand velocity to block dragging in one direction
// required to prevent inadvertent dragging as the hand returns to a particular position
const dragBlockVelocityThreshold = 800;

const directionEnum = {
	RIGHT: 'right',
	LEFT: 'left',
	UP: 'up',
	DOWN: 'down'
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

	var mapPosition = new google.maps.LatLng(earthPosition.latitude, earthPosition.longitude);

	panoOptions = {
		position: mapPosition,
		pov: {
			heading: 0,
		    pitch: 0
		}
	};

	pano = new google.maps.StreetViewPanorama(document.getElementById('panorama'), panoOptions);
}

function move() {
  var curr;
  for(i=0; i < pano.links.length; i++) {
    var differ = difference(pano.links[i]);
    if(curr == undefined) {
      curr = pano.links[i];
    }

    if(difference(curr) > difference(pano.links[i])) {
      curr = curr = pano.links[i];
    }
  }
  pano.setPano(curr.pano);
}

function difference(link) {
  return Math.abs(pano.pov.heading%360 - link.heading);
}

function difference2(link) {

    var diff = Math.abs(pano.pov.heading % 360 - link.heading);
    if(diff>180)
       diff=Math.abs(360-diff);

    return diff;

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

    if(!isConnected || !frame.valid || frame.id === 0) {
    	return;
    }

  	// Retrieves first hand - no need to get it by ID, since we're not fetching hand based time behaviour
  	if (frame.hands.length === 0) {
  		return;
  	}

  	var hand = frame.hands[0];

  	if (hand.type === 'right'){
  		updateHeading(hand);
  		changingHeading = true;
  	}
  	else {
  		moveForward(hand);
  		changingHeading = false;
  	}

  	// if there is at least another hand
  	if (frame.hands.length > 1){
  		var secondHand = frame.hands[1];

  		// make sure we don't repeat the heading control! (e.g., with 2 right hands)
  		if (!changingHeading && secondHand.type === 'right'){
  			updateHeading(secondHand);
  		}
  		// make sure we don't repeat the pitch control! (e.g., with 2 left hands)
  		else if (changingHeading && secondHand.type === 'left'){
  			moveForward(secondHand);
  		}

  	}

  	var pov = pano.getPov();
	pano.setPov(pov);
}

function updateHeading(hand){
	var velocityX = hand.palmVelocity[0];
	var velocityY = hand.palmVelocity[1];
	console.log(velocityY);
	// debug
	//console.log(velocityX);
	//console.log(velocityX);
	//console.log(dragVelocityThreshold);
	var canRotateCW = canDoGesture(directionEnum.RIGHT);
	var canRotateCCW = canDoGesture(directionEnum.LEFT);

	if (canRotateCW && velocityX > dragVelocityThreshold){
		updatePOV(true, -1.5);
		handleHighVelocity(directionEnum.RIGHT, velocityX);
		
	}
	else if (canRotateCCW && velocityX < -dragVelocityThreshold){
		updatePOV(true, 1.5);
		handleHighVelocity(directionEnum.LEFT, velocityX);
		
	}else if( velocityY < 0 && velocityY > -50){
		
	}
}

function moveForward(hand){
	var velocityZ = hand.palmVelocity[1];

	// debug
	//console.log(velocityY);
	console.log(velocityZ);
	//drive
	if(velocityZ < 0 && velocityZ > -10){
		console.log("drive");
		setTimeout(move(), 3000);
		
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

	if (days > 0 || hours > 0 || mins > 0 || seconds > dragBlockTimer) {
		return true;
	}

	return false;
}

function updatePOV(changeHeading, value){
	var pov = pano.getPov();

	var property = changeHeading ? 'heading' : 'pitch';

	pov[property] += value;
}

function handleHighVelocity(direction, velocity){
	if (velocity < -dragBlockVelocityThreshold || velocity > dragBlockVelocityThreshold){
		lastDrag[direction] = new Date();
	}
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
