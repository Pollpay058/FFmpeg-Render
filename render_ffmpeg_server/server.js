
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/create', async (req, res) => {
    const { image_url, audio_url, subtitle_url } = req.body;
    const tempId = uuidv4();
    const output = `video_${tempId}.mp4`;
    const imagePath = `/tmp/${tempId}_image.jpg`;
    const audioPath = `/tmp/${tempId}_audio.mp3`;
    const subtitlePath = `/tmp/${tempId}_subtitles.srt`;

    try {
        const download = async (url, path) => {
            const response = await axios({ url, responseType: 'stream' });
            await new Promise((resolve, reject) => {
                const stream = fs.createWriteStream(path);
                response.data.pipe(stream);
                stream.on('finish', resolve);
                stream.on('error', reject);
            });
        };

        await download(image_url, imagePath);
        await download(audio_url, audioPath);
        await download(subtitle_url, subtitlePath);

        ffmpeg()
            .input(imagePath)
            .loop()
            .input(audioPath)
            .inputOptions('-shortest')
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-preset fast',
                '-tune stillimage',
                `-vf subtitles=${subtitlePath}`
            ])
            .output(`/tmp/${output}`)
            .on('end', () => {
                res.sendFile(`/tmp/${output}`);
            })
            .on('error', (err) => {
                console.error(err);
                res.status(500).send('FFmpeg error');
            })
            .run();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error downloading or processing files');
    }
});

app.get('/', (req, res) => {
    res.send('FFmpeg server running');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
