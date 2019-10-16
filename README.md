[![npm version](https://badge.fury.io/js/%40justinribeiro%2Fdevtools-to-video.svg)](https://badge.fury.io/js/%40justinribeiro%2Fdevtools-to-video)

# devtools-to-video

> Output a video file from screenshot frames within a Chrome DevTools JSON trace file.

![image](https://user-images.githubusercontent.com/643503/66878963-26095700-ef71-11e9-96e7-7977b4f73577.png)

Example video output from tool: [justinribeiro.com @ 3G Slow, Moto G4](https://www.youtube.com/watch?v=guJLfqTFfIw)

## Install

```sh
npm i @justinribeiro/devtools-to-video
# or
yarn global add @justinribeiro/devtools-to-video
```

After install, run the command with `-h` to see usage information:

```sh
➜ devtools-to-video -h


  DEVTOOLS-TO-VIDEO
  Output a video file from screenshot frames within a Chrome DevTools JSON trace file.
  Usage: `devtools-to-video [options ...]`


Global Options

  -i, --input string    File path to Chrome DevTools trace JSON file.
  -o, --output string   Output file name for video file.
  -c, --hideClock       If set, hides the time scale clock on the output video file.
  -l, --label string    If set, adds the label above the time scale clock in the output video file.
  -f, --frames number   Sets the frames per second of the output video.
  -h, --help            Print out helpful usage information for this program.
  -v, --version         Print out current program version number.

Version

  0.1.0
```

## Sample command

```sh
➜ devtools-to-video -i Profile-20191015T174036.json -o sample5.mp4 -l '3G Slow @ Moto G4'
 STARTING UP  Checking environment and setting up params.
 CONVERT  Spawning FFMPEG worker with open pipe.
 CONVERT  Begin piping screenshots from DevTools trace to FFMPEG.
 SCREENSHOTS  Processed 24 screenshots into video file.
 CONVERT  DevTools trace successfully converted to MP4.
 LABEL PASS  Adding label and time scale to MP4.
 LABEL PASS  Finished adding label and time scale to MP4.
 COMPLETE  DevTools trace to video is now complete! You file sample5.mp4 is ready
```

## Credit where credit is due

1. WebPageTest does this [way cooler](https://github.com/WPO-Foundation/webpagetest/blob/26e3cf0/www/video/render.php#L567).
2. Kris Selden's [trace-to-mp4.js gist](https://gist.github.com/krisselden/bf98fb0c192fcb73ed32e79c0a7972d2) (mad props)
3. FFMPEG...we're had some adventures haven't we?
