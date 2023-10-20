import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Row, Col, Button } from "react-bootstrap";
import { WaveSurfer, WaveForm, Region } from "wavesurfer-react";
import RegionsPlugin from "wavesurfer.js/dist/plugin/wavesurfer.regions.min";
import TimelinePlugin from "wavesurfer.js/dist/plugin/wavesurfer.timeline.min";
import CursorPlugin from "wavesurfer.js/dist/plugin/wavesurfer.cursor.min";

import '../App.css';

const pluginsData = [
    {
        plugin: RegionsPlugin,
        options: { dragSelection: true }
    },
    {
        plugin: TimelinePlugin,
        options: {
            container: "#timeline"
        }
    },
    {
        plugin: CursorPlugin
    }
];

const regionsData = [
    {
        id: "audioTrim_1",
        start: 5,
        end: 25,
        color: "rgba(39, 142, 245, 0.5)",
    }
]


const Trim = () => {
    const ffmpegRef = useRef(new FFmpeg());
    const wavesurferRef = useRef();
    const [loaded, setLoaded] = useState(false);
    const [videoMeta, setVideoMeta] = useState(null);
    const [audioMeta, setAudioMeta] = useState(null);
    const [inputVideoFile, setInputVideoFile] = useState('');
    const [inputAudioFile, setInputAudioFile] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [outputUrl, setOutputUrl] = useState('');
    const [processing, setProcessing] = useState(false);
    const [plugins, setPlugins] = useState(pluginsData);
    const [regions, setRegions] = useState([]);
    const [showWave, setShowWave] = useState(false);
    const [isAudioPlay, setIsAudioPlay] = useState(false);

    useEffect(() => {
        let servicePromise, promiseArray = [];
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd'
        const ffmpeg = ffmpegRef.current;

        ffmpeg.on('log', ({ message }) => {
            // messageRef.current.innerHTML = message;
            console.log(message);
        });

        servicePromise = toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        promiseArray.push(servicePromise)
        servicePromise = toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        promiseArray.push(servicePromise)

        Promise.all(promiseArray).then(([coreURL, wasmURL]) => {
            ffmpeg.load({ coreURL, wasmURL }).then(() => {
                console.log('loaded')
                setLoaded(true);
            });
        })
    }, [])

    const handleChange = (e, name) => {
        let file = e?.target?.files?.[0];
        if (name === 'inputVideo') {
            setInputVideoFile(file);
            setVideoUrl(URL.createObjectURL(file))
        } else if (name === 'inputAudio') {
            setInputAudioFile(file);
            console.log('audio', file)
            setAudioUrl(URL.createObjectURL(file))
            const audio = new Audio(URL.createObjectURL(file));
            audio.addEventListener('loadedmetadata', () => {
                const meta = {
                    name: inputAudioFile.name,
                    duration: audio.duration,
                };
                setAudioMeta(meta);
                setShowWave(true)
                audio.remove();
            });
        }
    };

    const handleLoadedData = (e) => {
        const el = e.target;
        const meta = {
            name: inputVideoFile.name,
            duration: el.duration,
            videoWidth: el.videoWidth,
            videoHeight: el.videoHeight
        };
        setVideoMeta(meta);
    };

    const handleWSMount = (waveSurfer) => {
        if (waveSurfer.markers) {
            waveSurfer.clearMarkers();
        }
        wavesurferRef.current = waveSurfer;

        if (wavesurferRef.current) {
            wavesurferRef.current.load(audioUrl);
            regionsData[0].start = 0;
            regionsData[0].end = audioMeta.duration
            setRegions(regionsData)

            wavesurferRef.current.on("ready", () => {
                console.log("WaveSurfer is ready");
            });

            wavesurferRef.current.on("loading", (data) => {
                console.log("loading --> ", data);
            });

            if (window) {
                window.surferidze = wavesurferRef.current;
            }
        }
    }

    const handleAudioPlay = () => {
        wavesurferRef.current.playPause();
        setIsAudioPlay(!isAudioPlay)
    }

    const handleRegionUpdate = (region) => {
        regionsData[0].start = region.start;
        regionsData[0].end = region.end
        setRegions(regionsData)
    }

    const toTimeString = (sec, showMilliSeconds) => {
        sec = parseFloat(sec);
        let hours = Math.floor(sec / 3600); // get hours
        let minutes = Math.floor((sec - hours * 3600) / 60); // get minutes
        let seconds = sec - hours * 3600 - minutes * 60; //  get seconds
        // add 0 if value < 10; Example: 2 => 02
        if (hours < 10) {
            hours = "0" + hours;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        let maltissaRegex = /\..*$/; // matches the decimal point and the digits after it e.g if the number is 4.567 it matches .567

        let millisec = String(seconds).match(maltissaRegex);
        return (
            hours +
            ":" +
            minutes +
            ":" +
            String(seconds).replace(maltissaRegex, "") +
            (showMilliSeconds ? (millisec ? millisec[0] : ".000") : "")
        );
    };

    const handleAddMusic = () => {
        let ffmpeg = ffmpegRef.current;
        let servicePromise, promiseArray = [];
        let audioData = regions[0];
        let inputAudio = inputAudioFile.name;

        if (loaded) {
            setProcessing(true)

            // Add Music to video

            servicePromise = fetchFile(inputVideoFile).then(fileResp => ffmpeg.writeFile(inputVideoFile.name, fileResp))
            promiseArray.push(servicePromise)

            if (audioData.start !== 0 && audioData.end !== audioMeta.duration) {
                servicePromise = fetchFile(inputAudioFile).then(fileResp => ffmpeg.writeFile(inputAudioFile.name, fileResp))
                    .finally(() => {
                        inputAudio = 'trimmedAudio.mp3'
                        return ffmpeg.exec(['-ss', toTimeString(audioData.start), '-to', toTimeString(audioData.end), '-i', inputAudioFile.name, '-c', 'copy', 'trimmedAudio.mp3'])
                    });
                promiseArray.push(servicePromise)
            } else {
                servicePromise = fetchFile(inputAudioFile).then(fileResp => ffmpeg.writeFile(inputAudioFile.name, fileResp))
                promiseArray.push(servicePromise)
            }

            Promise.all(promiseArray).then(_res => {
                if (videoMeta.duration === audioMeta.duration) {
                    return ffmpeg.exec(["-i", inputVideoFile.name, "-i", inputAudio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "output.mp4"])
                } else {
                    return ffmpeg.exec(["-i", inputVideoFile.name, "-i", inputAudio, "-af", `afade=out:st=${videoMeta.duration}:d=2`, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-shortest", "output.mp4"])
                }

            }).finally(() => {
                ffmpeg.readFile('output.mp4').then(res => {
                    const url = URL.createObjectURL(new Blob([res.buffer], { type: 'video/mp4' }));
                    setOutputUrl(url);
                    setProcessing(false)
                });
            })

        }
    };

    return <section>
        {!loaded && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
        {loaded && <React.Fragment>
            <Row className='m-0 p-0'>
                <Col>
                    <h3 className='text-primary'>Add Music to video</h3>
                    <div className='mb-3 mt-5'>
                        <label className='me-3 fw-bold'>Video</label>
                        <input type='file' onChange={(e) => { handleChange(e, 'inputVideo') }} accept="video/*" />
                    </div>
                    <div className='mb-3 mt-5'>
                        <label className='me-3 fw-bold'>Audio</label>
                        <input type='file' onChange={(e) => { handleChange(e, 'inputAudio') }} accept="audio/*" />
                    </div>
                    {audioUrl && showWave && <div className='wave-surfer-container'>
                        <WaveSurfer plugins={plugins} onMount={handleWSMount}>
                            <WaveForm id="waveform" cursorColor="transparent">
                                {regions.map((regionProps) => (
                                    <Region
                                        onUpdateEnd={handleRegionUpdate}
                                        key={regionProps.id}
                                        {...regionProps}
                                    />
                                ))}
                            </WaveForm>
                            <div id="timeline" />
                        </WaveSurfer>
                        <div>
                            <Button onClick={handleAudioPlay} className='m-2'>
                                {isAudioPlay ? 'Pause' : 'Play'}
                            </Button>
                        </div>
                    </div>}
                </Col>
            </Row>
            <Row className='m-0 p-0'>
                <Col className='text-right'>
                    {videoUrl && <video controls src={videoUrl} width={'400px'} height={'400px'} onLoadedMetadata={handleLoadedData} />}
                </Col>
                <Col className='text-left d-flex justify-content-center align-items-center'>
                    {processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {!processing && outputUrl && <video controls src={outputUrl} width={'400px'} height={'400px'} />}
                </Col>
            </Row>
            <Button onClick={handleAddMusic} className='m-2' disabled={videoUrl.length === 0}>Add Music</Button>
        </React.Fragment>}
    </section>
}

export default Trim;


