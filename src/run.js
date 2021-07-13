/* eslint-disable node/no-unpublished-require */
'use strict';

const fs = require('fs');
const spawn = require('child_process').spawn;
const tmp = require('tmp');
const chalk = require('chalk');
const colorGreen = chalk.default.bgGreen;
const colorBlue = chalk.default.bgBlue;
const colorRed = chalk.default.bgRedBright;
const colorYellow = chalk.default.bgYellowBright;

module.exports = function devtoolsToVideo(args) {
  if (args.input === '') {
    messageError('Input file not defined. Did you forget to set -i?');
    throw new Error();
  }

  if (args.output === '') {
    messageError('Output file not defined. Did you forget to set -o?');
    throw new Error();
  }

  try {
    if (fs.existsSync(args.input)) {
      // just checking
    }
  } catch (error) {
    messageError('Input file does not appear to exist.');
    throw new Error();
  }

  let timeline;
  try {
    timeline = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  } catch (error) {
    messageError(
      `Cannot parse ${args.input}. Maybe it's not a Chrome DevTools JSON file?`,
    );
    throw new Error();
  }
  // Depends on how you grab it meh
  const events = timeline.traceEvents || timeline;
  const screenshots = events.filter(event => event.name === 'Screenshot');
  if (screenshots.length === 0) {
    messageError(
      'Trace contains no screenshots. Did you make sure screenshots were enabled before recording your trace?',
    );
    throw new Error();
  }

  messageInfo(
    ' STARTING UP ',
    'Checking environment and setting up params.',
    colorYellow,
  );

  // setup our video
  const framesPerSecond = args.frames || 60;
  const msPerFrame = Math.round(1000000 / framesPerSecond);

  // determine is this is a multipass
  let multipassVideo = true;
  if (args.hideClock && args.label !== '') {
    multipassVideo = false;
  }

  // if we have no lable or clock, just dump the video
  let stageOneFileOutputName;
  if (multipassVideo) {
    stageOneFileOutputName = tmp.tmpNameSync({
      prefix: 'JDR-DEVTOOLS-',
      postfix: '.mp4',
    });
  } else {
    stageOneFileOutputName = args.output;
  }

  messageInfo(' CONVERT ', 'Spawning FFMPEG worker with open pipe.');
  const videoPassOne = spawn(
    'ffmpeg',
    [
      '-framerate',
      `${framesPerSecond}`,
      '-f',
      'image2pipe',
      '-vcodec',
      'mjpeg',
      '-i',
      '-',
      '-hide_banner',
      '-loglevel',
      'panic',
      `${stageOneFileOutputName}`,
    ],
    {
      stdio: ['pipe', 'inherit', 'inherit'],
    },
  );

  // we may have to repeat the same screenshot in our video because nothing
  // painted/changed during a specific period in the trace so we store a outside
  // reference
  let repeatBuffer;

  let timestampTarget = screenshots[0].ts;

  messageInfo(
    ' CONVERT ',
    'Begin piping screenshots from DevTools trace to FFMPEG.',
  );

  // Let's send some screenshots to the pipe This is largely a riff off of Kris
  // Selden's trace-to-mp4.js gist (mad props)
  // https://gist.github.com/krisselden/bf98fb0c192fcb73ed32e79c0a7972d2
  for (const screenshot of screenshots) {
    // loop frames until we've hit the next new frame
    while (timestampTarget < screenshot.ts) {
      videoPassOne.stdin.write(repeatBuffer);
      timestampTarget += msPerFrame;
    }

    // new frame, cache it and write to the pipe
    if (screenshot.args.snapshot !== '') {
      repeatBuffer = Buffer.from(screenshot.args.snapshot, 'base64');
      videoPassOne.stdin.write(repeatBuffer);
    }
    timestampTarget += msPerFrame;
  }

  // There is a case where the last frame is the main body render on some sites,
  // which results in a strange early cut of the video (well, it just looks
  // weird). Add 1 second of padding of the last frame
  for (let index = 0; index < framesPerSecond; index++) {
    videoPassOne.stdin.write(repeatBuffer);
  }

  // close the pipe
  videoPassOne.stdin.end();

  videoPassOne.on('close', () => {
    if (multipassVideo) {
      messageInfo(
        ' SCREENSHOTS ',
        `Processed ${screenshots.length} screenshots into video file.`,
      );
      messageInfo(' CONVERT ', 'DevTools trace successfully converted to MP4.');
      messageInfo(' LABEL PASS ', 'Adding label and time scale to MP4.');
      let secondDrawText = '';
      if (args.label !== '') {
        secondDrawText = `, drawtext=text='${args.label}':fontcolor=white:fontsize=18:x=(w-tw)/2:y=h-45-(th/2)`;
      }

      // This is a quick usage of filter_complex with presentation time to put
      // in the bottom time scale. The downside is there is much control, but it
      // gets the job done in a pinch. WebPageTest is more concise than I am:
      // WPO-Foundation/webpagetest/blob/26e3cf0/www/video/render.php#L567
      const videoPassTwo = spawn(
        'ffmpeg',
        [
          '-i',
          `${stageOneFileOutputName}`,
          '-filter_complex',
          `[0:v]pad=iw:ih+60:0:0:color=black, drawtext=text='%{pts\\:hms}':fontcolor=white:fontsize=24:x=(w-tw)/2:y=h-25-(th/2)${secondDrawText}`,
          '-hide_banner',
          '-loglevel',
          'panic',
          `${args.output}`,
        ],
        {
          stdio: ['pipe', 'inherit', 'inherit'],
        },
      );

      videoPassTwo.on('close', () => {
        messageInfo(
          ' LABEL PASS ',
          'Finished adding label and time scale to MP4.',
        );
        messageComplete(args.output);
      });
    } else {
      messageComplete(stageOneFileOutputName);
    }
  });
};

function messageComplete(filename) {
  console.log(
    `${colorGreen(
      ' COMPLETE ',
    )} DevTools trace to video is now complete! You file ${filename} is ready`,
  );
}

function messageError(message) {
  console.log(`${colorRed(' ERROR ')} ${message}`);
}

function messageInfo(heading, message, color = colorBlue) {
  console.log(`${color(heading)} ${message}`);
}
