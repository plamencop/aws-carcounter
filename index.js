/*
 * Copyright 2010-2015 Amazon.com, Inc. or its affilfiates. All Rights Reserved.
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
var myThingName = 'Hack4DFuture_QTPi';
mythingstate = {
  "state": {
    "reported": {
      "ip": "unknown"
    }
  }
}

//app deps
var awsIot = require('aws-iot-device-sdk');
const thingShadow = awsIot.thingShadow;
const isUndefined = require('./node_modules/aws-iot-device-sdk/common/lib/is-undefined');
//const cmdLineProcess   = require('./node_modules/aws-iot-device-sdk/examples/lib/cmdline');

//begin module

"use strict";


var thingShadows = awsIot.thingShadow({
   keyPath: './certs/032ea8d26e-private.pem.key',
  certPath: './certs/032ea8d26e-certificate.pem.crt',
    caPath: './certs/rootCA.pem',
  clientId: 'macbook',
    region: 'us-east-1'
});

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

	if (carsDetected > 0)
	{

	mythingstate = {
 	 "state": {
    		"reported": {
			"carsDetected" : carsDetected,
			"cars" : cars
    				}
 	 	}
	};
		console.log("send");
		var response = thingShadows.update(myThingName,  mythingstate);
		console.log(response);
		thingShadows.publish('topic/parkingFender', 
                  'Someone is using your parking lot!');
	}


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


function processTest() {

  thingShadows.on('connect', function() {
  console.log("Connected...");
  console.log("Registering...");
  thingShadows.register( myThingName );
  

  // An update right away causes a timeout error, so we wait about 2 seconds
  setTimeout( function() {
    console.log("Updating my IP address...");
    clientTokenIP = thingShadows.update(myThingName, mythingstate);
    console.log("Update:" + clientTokenIP);
  }, 2500 );

  // Code below just logs messages for info/debugging
  thingShadows.on('status',
    function(thingName, stat, clientToken, stateObject) {
       console.log('received '+stat+' on '+thingName+': '+
                   JSON.stringify(stateObject));
    });

  thingShadows.on('update',
      function(thingName, stateObject) {
         console.log('received update '+' on '+thingName+': '+
                     JSON.stringify(stateObject));
      });

  thingShadows.on('delta',
      function(thingName, stateObject) {
         console.log('received delta '+' on '+thingName+': '+
                     JSON.stringify(stateObject));
      });

  thingShadows.on('timeout',
      function(thingName, clientToken) {
         console.log('received timeout for '+ clientToken)
      });

  thingShadows
    .on('close', function() {
      console.log('close');
    });
  thingShadows
    .on('reconnect', function() {
      console.log('reconnect');
    });
  thingShadows
    .on('offline', function() {
      console.log('offline');
    });
  thingShadows
    .on('error', function(error) {
      console.log('error', error);
    });

});	

}


if (require.main === module) {
    processTest();
  /*cmdLineProcess('connect to the AWS IoT service and demonstrate thing shadow APIs, test modes 1-2',
                 process.argv.slice(2), processTest );*/
}

