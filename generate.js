const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs')
const template = fs.readFileSync('./assets/template.html', { encoding: 'utf8' });

const resolutions = [2160, 2533];
const crf = [10, 23, 30, 40, 50];
const profiles = ['baseline', 'main', 'high'];
const levels = ['4', '4.1', '4.2', '5', '5.1', '5.2', '6', '6.1', '6.2'];
const aspectRatios = ['16:9', '10:16', '2:3'];
const framerates = [55,60];
let tries = [];

for (const resolution of resolutions) {
    for (const profile of profiles) {
        //for (const level of levels) {
            for (const framerate of framerates) {
                for (const aspectRatio of aspectRatios) {
                    tries.push({
                        resolution: resolution,
                        level: 'auto',
                        profile: profile,
                        fps: framerate,
                        aspectRatio: aspectRatio
                    });                    
                }
            }
        //}
    }
}

let runnerData = [];

let writeRunner = function() {
    const runner = fs.readFileSync('./assets/template_runner.html', { encoding: 'utf8' });
    fs.writeFileSync('./index.html', runner.replace('[{}]', JSON.stringify(runnerData)));
    console.log('Done! Now go forth and test.');
};

let transcode = function(options) {

    let path = './assets/transcodes/' + options.profile + '_' + options.level + '_' + options.resolution + '_' + options.aspectRatio + '_' + options.fps + '.mp4';
    let templatePath = './pages/' + options.profile + '_' + options.level + '_' + options.resolution + '_' + options.aspectRatio + '_' + options.fps + '.html';

    if (fs.existsSync(path)) {
        console.log('Transcode already exists');

        // add runner data
        runnerData.push({
            src: path,
            codec: 'h264',
            profile: options.profile,
            level: options.level,
            resolution: options.resolution,
            aspectRatio: options.aspectRatio,
            fps: options.fps
        });

        if(tries.length) {
            transcode(tries.shift());
        } else {
            writeRunner();
        }
        return;
      }

    let command = ffmpeg('./assets/source.mp4')
        .format('mp4')
        .duration(5)
        .outputOptions([
            '-an', // strip audio
            '-crf 23',
            '-profile:v ' + options.profile,
            /* '-pix_fmt yuv420p', */
            '-movflags +faststart'
        ])
        .videoCodec('libx264')
        .fps(options.fps)
        .size(options.resolution + 'x?')
        .aspect(options.aspectRatio)
        .autopad('yellow')
        .output(path)
        .on('end', function(commandLine) {
            console.log('Transcode succeeded');

            // add runner data
            runnerData.push({
                src: path,
                codec: 'h264',
                profile: options.profile,
                level: options.level,
                resolution: options.resolution,
                aspectRatio: options.aspectRatio,
                fps: options.fps
            });

            // write HTML test page
            fs.writeFileSync(
                templatePath,
                template
                    .replace('{{videoSrc}}', '.' + path)
                    .replace('{{codec}}', 'h264')
                    .replace('{{profile}}', options.profile)
                    .replace('{{level}}', options.level)
                    .replace('{{resolution}}', options.resolution)
                    .replace('{{aspectRatio}}', options.aspectRatio)
                    .replace('{{fps}}', options.fps)
            );

            if(tries.length) {
                transcode(tries.shift());
            } else {
                writeRunner();
            }
        })
        .run();

};

transcode(tries.shift());