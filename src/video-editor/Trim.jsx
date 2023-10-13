import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Row, Col, Button } from "react-bootstrap";

import '../App.css';

const Trim = () => {
    const ffmpegRef = useRef(new FFmpeg());
    const [loaded, setLoaded] = useState(false);
    const [inputVideoFile, setInputVideoFile] = useState('');
    const [videoMeta, setVideoMeta] = useState(null);
    const [inputUrl, setInputUrl] = useState('');
    const [outputUrl, setOutputUrl] = useState('');
    const [processing, setProcessing] = useState(false);
    const [thumbNails, setThumbNails] = useState([]);
    const [trimStart, setTrimstart] = useState(undefined);
    const [trimEnd, setTrimEnd] = useState(undefined);
    const [thumbnailIsProcessing, setThumbnailIsProcessing] = useState(false);


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
                setTrimstart(0)
            });
        })
    }, [])

    const handleChange = (e, name) => {
        let file = e?.target?.files?.[0];
        if (name === 'inputVideo') {
            setInputVideoFile(file);
            setInputUrl(URL.createObjectURL(file))
        } else if (name === 'trimStart') {
            setTrimstart(e.target.value);
            console.log(name, trimStart)
        } else if (name === 'trimEnd') {
            setTrimEnd(e.target.value);
            console.log(name, trimEnd)
        }
    };

    const slide = (e, value) => {
        let sliderTrack = document.querySelector(".slider-track");
        if (value === "min") {
            setTrimstart(e.target.value)
            sliderTrack.style.background = `linear-gradient(to right, rgba(0,0,0,0.3),rgba(255,255,255,0.01)`;
        } else {
            setTrimEnd(e.target.value)
            sliderTrack.style.background = `linear-gradient(to left,rgba(255,255,255,0.01),rgba(0, 0,0,0.3)`;
        }
    }

    const handleLoadedData = (e) => {
        const el = e.target;
        const meta = {
            name: inputVideoFile.name,
            duration: el.duration,
            videoWidth: el.videoWidth,
            videoHeight: el.videoHeight
        };
        setTrimEnd(el.duration);
        setVideoMeta(meta);
        getThumbnails(meta)
    };

    const getThumbnails = ({ duration }) => {
        let ffmpeg = ffmpegRef.current;
        let servicePromise, promiseArray = [];
        if (loaded) {
            setThumbnailIsProcessing(true);
            let MAX_NUMBER_OF_IMAGES = 25;
            let NUMBER_OF_IMAGES = (duration < MAX_NUMBER_OF_IMAGES) ? duration : 25;
            let offset = (duration === MAX_NUMBER_OF_IMAGES) ? 1 : duration / NUMBER_OF_IMAGES;

            const arrayOfImageURIs = [];

            return fetchFile(inputVideoFile).then(fileResp => ffmpeg.writeFile(inputVideoFile.name, fileResp))
                .finally(() => {

                    [...new Array(NUMBER_OF_IMAGES)].forEach((image, idx) => {
                        let startTimeInSecs = toTimeString(Math.round(idx * offset), true);

                        ffmpeg.exec([
                            "-ss",
                            startTimeInSecs,
                            "-i",
                            inputVideoFile.name,
                            "-t",
                            "00:00:1.000",
                            "-vf",
                            `scale=150:-1`,
                            "-f", "image2",
                            `img${idx}.png`])

                        servicePromise = ffmpeg.readFile(`img${idx}.png`).then(res => {
                            const url = URL.createObjectURL(new Blob([res.buffer], { type: "image/png" }));
                            console.log('url', url)
                            arrayOfImageURIs.push(url);
                        });
                        promiseArray.push(servicePromise)
                    })

                    Promise.all(promiseArray).then(_res => {
                        setThumbnailIsProcessing(false);
                        setThumbNails(arrayOfImageURIs);
                    })
                })
        }
    };

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

    const handleTrim = () => {
        let ffmpeg = ffmpegRef.current;
        let servicePromise, promiseArray = [];
        if (loaded) {
            setProcessing(true)

            // Trim video from 10s to 15s

            servicePromise = fetchFile(inputVideoFile).then(fileResp => ffmpeg.writeFile(inputVideoFile.name, fileResp))
                .finally(() => {
                    //  trime the video to same video format

                    return ffmpeg.exec(['-ss', toTimeString(trimStart), '-to', toTimeString(trimEnd), '-i', inputVideoFile.name, '-c', 'copy', 'output.mp4'])

                    //  trime the video to different video format
                    // return ffmpeg.exec(['-i', inputVideoFile.name, '-ss', '00:00:10', '-to', '00:00:15', 'output.mkv']);
                });
            promiseArray.push(servicePromise)

            Promise.all(promiseArray).then(_res => {
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
                    <h3 className='text-primary'>Trim video</h3>
                    <div className='mb-3 mt-5'>
                        <input type='file' onChange={(e) => { handleChange(e, 'inputVideo') }} accept="video/*" />
                    </div>
                </Col>
            </Row>

            <div className='d-flex justify-content-center align-items-center'>
                {thumbnailIsProcessing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                {!thumbnailIsProcessing && thumbNails.length > 0 && <div>
                    <div className='thumbnails-container'>
                        <div className="slider-wrapper">
                            <div className="slider-container">
                                <div className="slider-track"></div>
                                <input type="range" min="0" max={String(videoMeta?.duration)} value={trimStart} id="slider-1"
                                    onChange={(e) => slide(e, "min")} />
                                <div className='px-1'>
                                    {thumbNails?.map((imgURL, id) => <div key={id} className='thumbnail-img-container'>
                                        <img src={imgURL} alt={`sample_video_thumbnail_${id}`} className='thumbnail-image' />
                                    </div>)}
                                </div>
                                <input type="range" min="0" max={String(videoMeta?.duration)} value={trimEnd} id="slider-2"
                                    onChange={(e) => slide(e, "max")} />
                            </div>
                        </div>
                        <span>{`${toTimeString(trimStart)} - ${toTimeString(trimEnd)}`}</span>
                    </div>
                </div>}
            </div>
            <Row className='m-0 p-0'>
                <Col className='text-right'>
                    {inputUrl && <video controls src={inputUrl} width={'400px'} height={'400px'} onLoadedMetadata={handleLoadedData} />}
                </Col>
                <Col className='text-left d-flex justify-content-center align-items-center'>
                    {processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {!processing && outputUrl && <video controls src={outputUrl} width={'400px'} height={'400px'} />}
                </Col>
            </Row>
            <Button onClick={handleTrim} className='m-2' disabled={inputUrl.length === 0}>Trim Video</Button>
        </React.Fragment>}
    </section>
}

export default Trim;


