/*
 * Copyright 2010-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

//node.js deps

//npm deps

//app deps
var awsIot = require('aws-iot-device-sdk');
const thingShadow = awsIot.thingShadow;
const isUndefined = require('./node_modules/aws-iot-device-sdk/common/lib/is-undefined');
//const cmdLineProcess   = require('./node_modules/aws-iot-device-sdk/examples/lib/cmdline');

//begin module

"use strict";

var Cylon = require("cylon");
var carsDetected = 0;
var cars = { };

Cylon.robot({
  connections: {
    opencv: { adaptor: "opencv" }
  },

  devices: {
    window: { driver: "window" },
    camera: {
      driver: "camera",
      camera: 0,
      haarcascade: __dirname + "/data/hogcascade_cars_sideview.xml"
     //haarcascade: __dirname + "/data/lbpcascade_cars_frontbackview.xml"

    }
  },

  work: function(my) {
    // We setup our face detection when the camera is ready to
    // display images, we use `once` instead of `on` to make sure
    // other event listeners are only registered once.
    my.camera.once("cameraReady", function() {
      console.log("The camera is ready!");

      // We add a listener for the facesDetected event
      // here, we will get (err, image/frame, faces) params back in
      // the listener function that we pass.
      // The faces param is an array conaining any face detected
      // in the frame (im).
      my.camera.on("facesDetected", function(err, im, faces) {
	if (err) { console.log(err); }

	carsDetected = faces.length;
	cars = faces;
        // We loop through the faces and manipulate the image
        // to display a square in the coordinates for the detected
        // faces.
        for (var i = 0; i < faces.length; i++) {
          var face = faces[i];
          im.rectangle(
            [face.x, face.y],
            [face.x + face.width, face.y + face.height],
            [0, 255, 0],
            2
          );
        }

 // The second to last param is the color of the rectangle
        // as an rgb array e.g. [r,g,b].
        // Once the image has been updated with rectangles around
        // the faces detected, we display it in our window.
        my.window.show(im, 40);

        // After displaying the updated image we trigger another
        // frame read to ensure the fastest processing possible.
        // We could also use an interval to try and get a set
        // amount of processed frames per second, see below.
        my.camera.readFrame();
      });

	// We listen for frameReady event, when triggered
      // we start the face detection passing the frame
      // that we just got from the camera feed.
      my.camera.on("frameReady", function(err, im) {
        if (err) { console.log(err); }
	carsDetected = 0;
	cars = { };
        my.camera.detectFaces(im);
      });

      my.camera.readFrame();
    });
  }
}).start();



function processTest( args ) {
//
// The thing module exports the thing class through which we
// can register and unregister interest in thing shadows, perform
// update/get/delete operations on them, and receive delta updates
// when the cloud state differs from the device state.
//
/*
const thingShadows = thingShadow({
  keyPath: args.privateKey,
  certPath: args.clientCert,
  caPath: args.caCert,
  clientId: args.clientId,
  region: args.region,
  reconnectPeriod: args.reconnectPeriod
});
*/
var thingShadows = awsIot.thingShadow({
   keyPath: './certs/032ea8d26e-private.pem.key',
  certPath: './certs/032ea8d26e-certificate.pem.crt',
    caPath: './certs/rootCA.pem',
  clientId: 'macbook',
    region: 'us-east-1'
});

//
// Track operations in here using clientTokens as indices.
//
var operationCallbacks = { };

var role='DEVICE';

if (args.testMode===1)
{
   role='MOBILE APP';
}
var rgbValues={ carsDetected: false, cars : {} };

var mobileAppOperation='update';
//
// Simulate the interaction of a mobile device and a remote thing via the
// AWS IoT service.  The remote thing will be a dimmable color lamp, where
// the individual RGB channels can be set to an intensity between 0 and 255.  
// One process will simulate each side, with testMode being used to distinguish 
// between the mobile app (1) and the remote thing (2).  The mobile app
// will wait a random number of seconds and then change the LED lamp's values;
// the LED lamp will synchronize with them upon receipt of an .../update/delta.
//
thingShadows
  .on('connect', function() {
    console.log('connected to things instance, registering thing name');

    if (args.testMode === 1)
    {
       thingShadows.register( 'carcounter', { ignoreDeltas: true,
                                              persistentSubscribe: true } );
    }
    else
    {
       thingShadows.register( 'carcounter' );
    }
    var rgbLedLampState = { };

    var opFunction = function() {
       if (args.testMode === 1)
       {
//
// The mobile app sets new values for the LED lamp.
//
          /*rgbValues.red   = Math.floor(Math.random() * 255);
          rgbValues.green = Math.floor(Math.random() * 255);
          rgbValues.blue  = Math.floor(Math.random() * 255);
	  rgbValues.name = "WALK";*/

	  rgbValues.carsDetected = carsDetected;
	  rgbValues.cars = cars;

          rgbLedLampState={state: { desired: rgbValues }};
       }

       var clientToken;
 
       if (args.testMode === 1)
       {
          if (mobileAppOperation === 'update') 
          {
             	clientToken = thingShadows[mobileAppOperation]('carcounter',
                                                            rgbLedLampState );
          }
          else // mobileAppOperation === 'get'
          {
             clientToken = thingShadows[mobileAppOperation]('carcounter' );
          }

          operationCallbacks[clientToken] = { operation: mobileAppOperation,
                                              cb: null };
//
// Force the next operation back to update in case we had to do a get after
// a 'rejected' status.
//
          mobileAppOperation = 'update';
       }
       else
       {
//
// The device gets the latest state from the thing shadow after connecting.
//
          clientToken = thingShadows.get('carcounter');
          operationCallbacks[clientToken] = { operation: 'get', cb: null };
       }
       if (args.testMode === 1)
       {
          operationCallbacks[clientToken].cb =
             function( thingName, operation, statusType, stateObject ) {

                console.log(role+':'+operation+' '+statusType+' on '+thingName+': '+
                            JSON.stringify(stateObject));
//
// If this operation was rejected, force a 'get' as the next operation; it is
// probably a version conflict, and it can be resolved by simply getting the
// latest thing shadow.
//
                if (statusType !== 'accepted')
                {
                   mobileAppOperation = 'get';
                }
                opFunction();
             };
       }
       else
       {

          operationCallbacks[clientToken].cb =
             function( thingName, operation, statusType, stateObject ) { 

                console.log(role+':'+operation+' '+statusType+' on '+thingName+': '+
                            JSON.stringify(stateObject));
             };
       }
    };
    opFunction();
    });
thingShadows 
  .on('close', function() {
    console.log('close');
    thingShadows.unregister( 'carcounter' );
  });
thingShadows 
  .on('reconnect', function() {
    console.log('reconnect');
    if (args.testMode === 1)
    {
       thingShadows.register( 'carcounter', { ignoreDeltas: true,
                                              persistentSubscribe: true } );
    }
    else
    {
       thingShadows.register( 'carcounter' );
    }
  });
thingShadows 
  .on('offline', function() {
    console.log('offline');
  });
thingShadows
  .on('error', function(error) {
    console.log('error', error);
  });
thingShadows
  .on('message', function(topic, payload) {
    console.log('message', topic, payload.toString());
  });
thingShadows
  .on('status', function(thingName, stat, clientToken, stateObject) {
      if (!isUndefined( operationCallbacks[clientToken] ))
      {
         setTimeout( function() {
         operationCallbacks[clientToken].cb( thingName, 
              operationCallbacks[clientToken].operation,
              stat,
              stateObject );

         delete operationCallbacks[clientToken];
         }, 2000 );
      }
      else
      {
         console.warn( 'status:unknown clientToken \''+clientToken+'\' on \''+
                       thingName+'\'' );
      }
  });
//
// Only the simulated device is interested in delta events.
//
if (args.testMode===2)
{
   thingShadows
     .on('delta', function(thingName, stateObject) {
         console.log(role+':delta on '+thingName+': '+
                     JSON.stringify(stateObject));
         rgbValues=stateObject.state;
     });
}

thingShadows
  .on('timeout', function(thingName, clientToken) {
      if (!isUndefined( operationCallbacks[clientToken] ))
      {
         operationCallbacks[clientToken].cb( thingName,
              operationCallbacks[clientToken].operation,
              'timeout',
              { } );
         delete operationCallbacks[clientToken];
      }
      else
      {
         console.warn( 'timeout:unknown clientToken \''+clientToken+'\' on \''+
                       thingName+'\'' );
      }
  });
}

//module.exports = cmdLineProcess;

if (require.main === module) {
    processTest({testMode : 1});
  /*cmdLineProcess('connect to the AWS IoT service and demonstrate thing shadow APIs, test modes 1-2',
                 process.argv.slice(2), processTest );*/
}
