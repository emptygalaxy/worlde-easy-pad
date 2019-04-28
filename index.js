var midi = require('midi');

// Set up a new input.
var input;

// Count the available input ports.
let deviceName	= 'WORLDE easy pad';

let STATUS_SLIDER = 240;
let STATUS_PAD = 153;
let STATUS_CONTROL = 185;

let CONTROL_REFRESH = 49;
let CONTROL_PREVIOUS = 47;
let CONTROL_NEXT = 48;
let CONTROL_RECORD = 44;
let CONTROL_STOP = 46;
let CONTROL_PLAY = 45;

let EVENT_OPEN = 'open';
let EVENT_CLOSE = 'close';
let EVENT_PAD_DOWN  = 'pad down';
let EVENT_PAD_UP  = 'pad up';
let EVENT_BUTTON_DOWN  = 'button down';
let EVENT_BUTTON_UP  = 'button up';
let EVENT_BAR_UPDATE  = 'update';
let EVENT_PAGE_CHANGE = 'change page';


var tbarDirection = 1;
var tbarForward	= true;

var _eventListeners = {};



function open()
{
    input = new midi.input();
    var length = input.getPortCount();
    var deviceIndex	= -1;
    for(var i=0; i<length; i++)
    {
    	if(input.getPortName(i) == deviceName) {
    		deviceIndex = i;
    		break;
    	}
    }

    if(deviceIndex > -1)
    {
    	// Configure a callback.
    	input.on('message', handleMessage);

    	// Open the first available input port.
    	input.openPort(deviceIndex);
        
        dispatchEvent(EVENT_OPEN);

    	// Sysex, timing, and active sensing messages are ignored
    	// by default. To enable these message types, pass false for
    	// the appropriate type in the function below.
    	// Order: (Sysex, Timing, Active Sensing)
    	// For example if you want to receive only MIDI Clock beats
    	// you should use
    	// input.ignoreTypes(true, false, true)
    	input.ignoreTypes(false, false, false);
    }
}

function handleMessage(deltaTime, message)
{
    // The message is an array of numbers corresponding to the MIDI bytes:
    //   [status, data1, data2]
    // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
    // information interpreting the messages.
    // console.log('m:' + message + ' d:' + deltaTime);
    
    var status = message[0];
    
    switch(status)
    {
        case STATUS_SLIDER:
            var subStatus = message[1];
            switch(subStatus)
            {
                case 127:
                    var tbarValue = (message[6] / 127);
                    var bouncedValue = tbarForward ? tbarValue : (1 - tbarValue);
                    
                    dispatchEvent(EVENT_BAR_UPDATE, bouncedValue);
                    
                    if(tbarValue == 1)
                        tbarForward = false;
                    if(tbarValue == 0)
                        tbarForward = true;
                break;
                case 66:
                    var page = message[9];
                    dispatchEvent(EVENT_PAGE_CHANGE, page);
                break;
            }
            break;
            
        case STATUS_PAD:
            var padDown = message[2] > 0;
            var padIndex = translatePadIndex(message[1]);
            
            if(padIndex > -1)
                dispatchEvent(padDown ? EVENT_PAD_DOWN : EVENT_PAD_UP, padIndex);
            else
                dispatchEvent(padDown ? EVENT_BUTTON_DOWN : EVENT_BUTTON_UP, message[1]);
        break;
        
        case STATUS_CONTROL:
            var controlDown = message[2] > 0;
            var controlIndex = message[1];
            
            if(controlDown)
            {
                switch(controlIndex)
                {
                    case CONTROL_REFRESH: console.log('refresh'); break;
                    case CONTROL_PREVIOUS: console.log('previous'); break;
                    case CONTROL_NEXT: console.log('next'); break;
                    case CONTROL_RECORD: console.log('record'); break;
                    case CONTROL_STOP: console.log('stop'); break;
                    case CONTROL_PLAY: console.log('play'); break;
                    
                    default:
                        console.log('Control ' + controlIndex);
                        break;
                }
            }
            
        break;
        
        default:
            console.log('m:' + message);
        break;
    }
}



function close()
{
	// Close the port when done.
	input.closePort();
    
    dispatchEvent(EVENT_CLOSE);
}


function translatePadIndex(n)
{
	var indexes	= [39, 48, 45, 43, 51, 49, 36, 38, 40, 42, 44, 46];
	var index	= indexes.indexOf(n);
	
	if(index > -1)
		return index + 1;
	
	return -1;
}

function on(event, callback)
{
    _eventListeners[event]  = callback;
}

function dispatchEvent(event, arguments)
{
    if(_eventListeners[event])
    {
        _eventListeners[event](arguments);
    }
}

exports.open = open;
exports.close = close;
exports.on = on;