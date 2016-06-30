/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
//Environment Configuration

var awsIot = require('aws-iot-device-sdk');

var device = awsIot.device({
   keyPath: 'b15f15c88b-private.pem.key',
  certPath: 'b15f15c88b-certificate.pem.crt',
    caPath: 'rootCA.pem',
  clientId: 'Zoroark',
    region: 'us-east-1' 
});

exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.f301f81c-ad1d-4cb5-904d-892a5cc31d3e") {
             context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("SetMessageIntent" === intentName) {
        setMessage(intent, session, callback);
    } else if ("SetColorIntent" === intentName) {
        setColor(intent, session, callback);
    } else if ("SetDisplayIntent" === intentName) {
        setDisplay(intent, session, callback);
    } else if ("GetDisplayIntent" === intentName) {
        getDisplay(intent, session, false, callback);
    } else if ("GetColorIntent" === intentName) {
        getDisplay(intent, session, true, callback);
    } else if ("ClearDisplayIntent" === intentName) {
        clearDisplay(intent, session, true, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getWelcomeResponse(callback);
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        handleSessionEndRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome to CrystalPlate";
    var speechOutput = "This is Crystal Plate. You can ask me to write something to the plate " + 
        "or ask me, what's on the plate?";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "You can tell me what to put on the display by saying, " +
        "write bring an umbrella today";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle = "Session Ended";
    var speechOutput = "Thank you for using the crystal plate. Have a nice day!";
    // Setting this to true ends the session and exits the skill.
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

/**
 * Sets the color on the display and prepares the speech to reply to the user.
 */
function setColor(intent, session, callback) {
    var cardTitle = intent.name;
    var newColorSlot = intent.slots.Color;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    if (newColorSlot) {
        var newColor = newColorSlot.value;
        var color = colorToRGB(newColor);
        if (color === undefined) {
            shouldEndSession = false;
            speechOutput = "I'm not sure what this color is. Please try again";
            repromptText = "I'm not sure what this color is. You can tell me what " +
                "color to set the display by saying, change the display color to red";
            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            return;
        }
        repromptText = "";
        speechOutput = "The display has been set to the color " + newColor + ". Thanks for using crystal plate.";
        var publishmessage = JSON.stringify({
            state: {
                desired: {
                    color: {
                        r: color[0],
                        g: color[1],
                        b: color[2]
                    }
                }
            }
        })
        device.publish('$aws/things/Zorua/shadow/update', publishmessage,{qos: 1},function() {
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    } else {
        shouldEndSession = false;
        speechOutput = "I'm not sure what this color is. Please try again";
        repromptText = "I'm not sure what this color is. You can tell me what " +
            "color to set the display by saying, change the display color to red";
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

/**
 * Sets the message on the display and prepares the speech to reply to the user.
 */
function setMessage(intent, session, callback) {
    var cardTitle = intent.name;
    var newMessageSlot = intent.slots.Message;
    var newMessage = newMessageSlot.value;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";
    repromptText = "You can find out what's on the display by saying, what's on the display? ";
    speechOutput = newMessage + " has been written to the display. What color do you want to set the display to?";
    if (newMessageSlot) {
        var publishmessage = JSON.stringify({
            state: {
                desired: {
                    msg: newMessage
                }
            }
        })
        device.publish('$aws/things/Zorua/shadow/update', publishmessage,{qos: 1},function() {
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    } else {
        speechOutput = "I'm not sure what to set as the message. Please try again";
        repromptText = "I'm not sure what to make the message. You can tell me what " +
            "to put on the display by saying, write pick up some milk on the display";
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

/**
 * Sets the message and color on the display and prepares the speech to reply to the user.
 */
function setDisplay(intent, session, callback) {
    var cardTitle = intent.name;
    var newMessageSlot = intent.slots.Message;
    var newMessage = newMessageSlot.value;
    var newColorSlot = intent.slots.Color;
    var newColor = newColorSlot.value;
    var color = colorToRGB(newColor);
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = newMessage + " has been written to the display in " + newColor + ". Thanks for using crystal plate.";
    if (newMessageSlot && color) {
        var publishmessage = JSON.stringify({
            state: {
                desired: {
                    msg: newMessage,
                    color: {
                        r: color[0],
                        g: color[1],
                        b: color[2]
                    }
                }
            }
        })
        device.publish('$aws/things/Zorua/shadow/update', publishmessage,{qos: 1},function() {
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    } else if (newMessageSlot) {
        var publishmessage = JSON.stringify({
            state: {
                desired: {
                    msg: newMessage,
                    color: {
                        r: 0,
                        g: 1,
                        b: 1
                    }
                }
            }
        })
        shouldEndSession = false;
        speechOutput = "I set the display message to " + newMessage + ", but I " +
            "couldn't figure out what color you wanted. Please let me know what " +
            "color you want to use";
        repromptText = "I'm not sure what color to set the display to. I've set " +
            "the background color to teal for now, but you can tell me what " +
            "color to put on the display by saying, make the display red";
        device.publish('$aws/things/Zorua/shadow/update', publishmessage,{qos: 1},function() {
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    } else {
        shouldEndSession = false;
        speechOutput = "I'm not sure what to set as the message. Please try again";
        repromptText = "I'm not sure what to put on the display. You can tell me what " +
            "to put on the display by saying, write pick up some milk on the display in red";
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function clearDisplay(intent, session, callback) {
    var cardTitle = intent.name;
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "The display has been cleared. Thanks for using crystal plate.";
    var repromptText = "";
    var publishmessage = JSON.stringify({
        state: {
            desired: {
                msg: "",
                color: {
                    r: 0,
                    g: 0,
                    b: 0
                }
            }
        }
    })
    device.publish('$aws/things/Zorua/shadow/update', publishmessage,{qos: 1},function() {
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

/**
 * Sets the message on the display and prepares the speech to reply to the user.
 */
function getDisplay(intent, session, coloronly, callback) {
    var publishmessage = JSON.stringify({});
    device.on('message', function (topic, message) {
        var cardTitle = intent.name;
        var sessionAttributes = {};
        var shouldEndSession = false;
        var data = JSON.parse(message);
        var message = data['state']['reported']['msg'];
        var color = RGBToColor([data['state']['reported']['color']['r'],
                    data['state']['reported']['color']['g'], 
                    data['state']['reported']['color']['b']]);
        var speechOutput = "The display has " + message + " written on it in " + color;
        var repromptText = "Want to change it? Tell me by saying, write I'll be back at five on the display";
        if (coloronly) {
            speechOutput = "The display color is " + color;
            repromptText = "Want to change it? Tell me by saying, change the display color to blue";
            if (color === "blue") repromptText = "Want to change it? Tell me by saying, change the display color to red";
        }
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    })
    device.subscribe('$aws/things/Zorua/shadow/get/accepted',undefined, function() {
        device.publish('$aws/things/Zorua/shadow/get', publishmessage, {qos: 1});
    })
}

function createFavoriteColorAttributes(favoriteColor) {
    return {
        favoriteColor: favoriteColor
    };
}



// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "CrystalPlate - " + title,
            content: "CrystalPlate - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function colorToRGB(colortext) {
    var color = [0,0,0];
    switch (colortext) {
        case "green":
            color[1] = 1;
            break;
        case "red":
            color[0] = 1;
            break;
        case "blue":
            color[2] = 1;
            break;
        case "yellow":
            color[0] = 1;
            color[1] = 1;
            break;
        case "purple":
            color[0] = 1;
            color[2] = 1;
            break;
        case "teal":
            color[1] = 1;
            color[2] = 1;
            break;
        case "black":
            break;
        case "white":
            color[0] = 1;
            color[1] = 1;
            color[2] = 1;
            break;
        default:
            color = undefined;
    }
    return color;
}
function RGBToColor(color) {
    if (color[0]) {
        if (color[1]) {
            if (color[2]) return "white";
            return "yellow";
        }
        if (color[2]) return "purple";
        return "red";
    }
    if (color[1]) {
        if (color[2]) return "teal";
        return "green";
    }
    if (color[2]) return "blue";
    return "black"
}