var Cylon = require('cylon');

Cylon.robot({
  connections: {
    opencv: { adaptor: 'opencv' }
  },


  devices: {
    window: { driver: 'window' },
    camera: {
      driver: 'camera',
      camera: 0,
      haarcascade: __dirname + "haarcascade_frontalface_alt.xml"
    }
  },

  work: function(my) {
    my.camera.once('cameraReady', function() {
      console.log('The camera is ready!')

      // We listen for frame ready event, when triggered
      // we display the frame/image passed as an argument
      // and we tell the window to wait 40 milliseconds
      my.camera.on('frameReady', function(err, im) {
        console.log("FRAMEREADY!");
        my.window.show(im, 40);
      });

      // Here we have two options to start reading frames from
      // the camera feed.
      // 1. As fast as possible triggering the next frame read
      //    in the listener for frameReady, if you need video
      //    as smooth as possible uncomment #my.camera.readFrame()
      //    in the listener above and the one below this comment.
      //
      // my.camera.readFrame()
      //
      // 2. Use an interval of time to try and get aset amount
      //    of frames per second  (FPS), in the next example
      //    we are trying to get 1 frame every 50 milliseconds
      //    (20 FPS).
      //
      every(50, function() { my.camera.readFrame(); });
    });
  }
});

Cylon.start();
