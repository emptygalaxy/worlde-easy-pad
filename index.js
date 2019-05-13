const midi = require('midi');

// Set up a new input.
let input;

// Device name (to find the device in list of MIDI devices)
const deviceName	= 'WORLDE easy pad';
const padIndexes = [39, 48, 45, 43, 51, 49, 36, 38, 40, 42, 44, 46];
const padNumber = padIndexes.length;

const STATUS_SLIDER = 240;
const STATUS_PAD = 153;
const STATUS_CONTROL = 185;

const CONTROL_REFRESH = 49;
const CONTROL_PREVIOUS = 47;
const CONTROL_NEXT = 48;
const CONTROL_RECORD = 44;
const CONTROL_STOP = 46;
const CONTROL_PLAY = 45;

const EVENT_OPEN = 'open';
const EVENT_CLOSE = 'close';
const EVENT_PAD_DOWN  = 'pad down';
const EVENT_PAD_UP  = 'pad up';
const EVENT_PAGED_PAD_DOWN  = 'page pad down';
const EVENT_PAGED_PAD_UP  = 'page pad up';
const EVENT_BUTTON_DOWN  = 'button down';
const EVENT_BUTTON_UP  = 'button up';
const EVENT_BAR_UPDATE  = 'update';
const EVENT_PAGE_CHANGE = 'change page';

let tbarForward	= true;
let page = 0;

let _eventListeners = {};


/**
 *
 */
function open()
{
    input = new midi.input();
    const length = input.getPortCount();
    let deviceIndex	= -1;
    for(let i=0; i<length; i++)
    {
    	if(input.getPortName(i) === deviceName)
    	{
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

/**
 *
 * @param {number} deltaTime
 * @param {Array<number>} message
 */
function handleMessage(deltaTime, message)
{
    // The message is an array of numbers corresponding to the MIDI bytes:
    //   [status, data1, data2]
    // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
    // information interpreting the messages.
    // console.log('m:' + message + ' d:' + deltaTime);

    const status = message[0];
    
    switch(status)
    {
        case STATUS_SLIDER:
            const subStatus = message[1];
            switch(subStatus)
            {
                case 127:
                    let tbarValue = (message[6] / 127);
                    let bouncedValue = tbarForward ? tbarValue : (1 - tbarValue);
                    
                    dispatchEvent(EVENT_BAR_UPDATE, bouncedValue);
                    
                    if(tbarValue === 1)
                        tbarForward = false;
                    if(tbarValue === 0)
                        tbarForward = true;
                break;
                case 66:
                    page = message[9];
                    dispatchEvent(EVENT_PAGE_CHANGE, page);
                break;
            }
            break;
            
        case STATUS_PAD:
            const padDown = message[2] > 0;
            const padIndex = translatePadIndex(message[1]);
            
            if(padIndex > -1) {
                dispatchEvent(padDown ? EVENT_PAD_DOWN : EVENT_PAD_UP, padIndex);

                const padIndexWithPage = (page * padNumber) + padIndex;
                dispatchEvent(padDown ? EVENT_PAGED_PAD_DOWN : EVENT_PAGED_PAD_UP, padIndexWithPage);
            }
            else
                dispatchEvent(padDown ? EVENT_BUTTON_DOWN : EVENT_BUTTON_UP, message[1]);
        break;
        
        case STATUS_CONTROL:
            const controlDown = message[2] > 0;
            const controlIndex = message[1];
            
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


/**
 *
 */
function close()
{
	// Close the port when done.
	input.closePort();
    
    dispatchEvent(EVENT_CLOSE);
}


/**
 *
 * @param {number} n
 * @return {number}
 */
function translatePadIndex(n)
{
	const index	= padIndexes.indexOf(n);
	
	if(index > -1)
		return index + 1;
	
	return -1;
}

/**
 *
 * @param {string} event
 * @param {function} callback
 */
function on(event, callback)
{
    _eventListeners[event]  = callback;
}

/**
 *
 * @param {string} event
 * @param {null|Array|number} arguments
 */
function dispatchEvent(event, arguments=null)
{
    if(_eventListeners[event])
    {
        _eventListeners[event](arguments);
    }
}

exports.open = open;
exports.close = close;
exports.on = on;