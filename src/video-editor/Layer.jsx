import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Row, Col, Button } from "react-bootstrap";
import { Rnd } from 'react-rnd';

import '../App.css';

const Layer = () => {
    const ffmpegRef = useRef(new FFmpeg());
    const [loaded, setLoaded] = useState(false);
    const [videoMeta, setVideoMeta] = useState(null);
    const [overlayMode, setOverlayMode] = useState('text');
    const [overlayPostion, setPosition] = useState({ x: 0, y: 0 })
    const [overlaySize, setOVerlaySize] = useState({ width: 100, height: 50 })
    const [widthScale, setWidthScale] = useState(0)
    const [heightScale, setHeightScale] = useState(0)
    const [overlayImage, setOverlayImage] = useState('');
    const [overlaySrc, setOverlaySrc] = useState('');
    const [overlayText, setOverlayText] = useState('');
    const [videoFile, setVideoFile] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [outputUrl, setOutputUrl] = useState('');
    const [processing, setProcessing] = useState(false);

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
        if (name === 'overylayText') {
            setOverlayText(e.target.value)
        } else if (name === 'videoFile') {
            setVideoFile(file)
            setVideoUrl(URL.createObjectURL(file))
        } else if (name === 'overlayMode') {
            setOverlayMode(e)
        } else if (name === 'overlayImage') {
            setOverlayImage(file)
            setOverlaySrc(URL.createObjectURL(file))
            setOVerlaySize({ width: 150, height: 150 })
        }
    };

    const handleOverlay = async () => {
        let ffmpeg = ffmpegRef.current;
        let servicePromise, promiseArray = [];
        if (loaded) {
            setProcessing(true)

            let fontSize = (60 * widthScale);

            console.log('fontSize', fontSize)

            let xAxis = (overlayPostion.x * widthScale)
            let yAxis = (overlayPostion.y * heightScale)

            let overlayWidth = (parseInt(overlaySize.width) * widthScale)
            let overlayHeight = (parseInt(overlaySize.height) * heightScale)


            const fontLink = `https://raw.githubusercontent.com/ffmpegwasm/testdata/master/arial.ttf`;
            const textFilter = `drawtext=fontfile=/arial.ttf:text='${overlayText}':x=${xAxis}:y=${yAxis}:fontsize=${fontSize}:fontcolor=red`;

            servicePromise = fetchFile(videoFile).then(fileResp => ffmpeg.writeFile(videoFile.name, fileResp))
            promiseArray.push(servicePromise)

            if (overlayMode === 'text') {
                servicePromise = fetchFile(fontLink).then(fomtResp => ffmpeg.writeFile('arial.ttf', fomtResp))
                promiseArray.push(servicePromise)
            }

            if (overlayMode === 'image') {
                servicePromise = fetchFile(overlayImage).then(fileResp => ffmpeg.writeFile(overlayImage.name, fileResp))
                promiseArray.push(servicePromise)
            }

            Promise.all(promiseArray).then(_res => {
                if (overlayMode === 'text') {
                    return ffmpeg.exec(['-i', videoFile.name, '-vf', textFilter, '-preset', 'ultrafast', 'output.mp4',]);
                } else if (overlayMode === 'image') {
                    return ffmpeg.exec(['-i', videoFile.name, '-i', overlayImage.name, '-filter_complex', `[1]scale=${overlayWidth}:${overlayHeight}[b];[0][b] overlay=${xAxis}:${yAxis}`,
                        '-preset', 'ultrafast', 'output.mp4']);
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

    const validateAddLayer = () => {
        return videoUrl.length === 0 ||
            (overlayMode === 'text' ? (overlayText.length === 0) : (overlaySrc.length === 0))
    }

    const handleLoadedData = (e) => {
        const el = e.target;
        const meta = {
            duration: el.duration,
            videoWidth: el.videoWidth,
            videoHeight: el.videoHeight
        };
        let parent = document.getElementById('video-parent');

        let widthScale = (el.videoWidth / parent.clientWidth);
        let heightScale = (el.videoHeight / parent.clientHeight);

        setVideoMeta(meta);
        setWidthScale(widthScale)
        setHeightScale(heightScale)
    };

    const onDragStop = (e, d) => {
        setPosition({ x: d.x, y: d.y });
    }

    return <section>
        {!loaded && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
        {loaded && <React.Fragment>
            <Row className='m-0 p-0'>
                <Col>
                    <h3 className='text-primary'>Add Layer</h3>
                    <div className='mb-3 mt-3'>
                        <input type='file' onChange={(e) => { handleChange(e, 'videoFile') }} accept="video/*" />
                    </div>
                    <div className='mb-2'>
                        <input type="radio" id="text" name="overlayMode" value="text" className='mx-1' checked={overlayMode === 'text'}
                            onChange={() => handleChange('text', 'overlayMode')} />
                        <label htmlFor="text" className='me-3'>Text</label>
                        <input type="radio" id="image" name="overlayMode" value="image" className='ms-3 me-1' checked={overlayMode === 'image'}
                            onChange={() => handleChange('image', 'overlayMode')}
                        />
                        <label htmlFor="image">Image</label>
                    </div>
                    <div className='mb-2'>
                        {overlayMode !== 'text' && <input type='file'
                            onChange={(e) => { handleChange(e, 'overlayImage') }} accept="image/*" />}
                    </div>
                </Col>
            </Row>
            <Row className='m-0 p-0'>
                <Col>
                    {videoUrl && <div className='overlay-content-container' id="video-parent">
                        <video controls src={videoUrl} width={'500px'} height={'450px'} onLoadedMetadata={handleLoadedData} />
                        <Rnd className='overlay-layout'
                            position={overlayPostion}
                            size={overlaySize}
                            onDragStop={(e, d) => onDragStop(e, d)}
                            onResizeStop={(e, direction, ref, delta, position) => {
                                setOVerlaySize({
                                    width: ref.style.width,
                                    height: ref.style.height,
                                    ...position
                                });
                            }}
                            bounds="parent">

                            {overlayMode === 'text' &&
                                <input type='text' onChange={(e) => { handleChange(e, 'overylayText') }}
                                    placeholder="Enter text to overlay" id='text-input' />
                            }

                            {overlaySrc?.length > 0 && <div className='overlay-img-container text-center'
                                style={{ width: overlaySize.width, height: overlaySize.height }}>
                                <img src={overlaySrc.default || overlaySrc} alt='overlay' className='overlay-image' />
                            </div>}
                        </Rnd>
                    </div>}
                </Col>
                <Col className='text-left d-flex justify-content-center align-items-center'>
                    {processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {!processing && outputUrl && <div className='overlay-content-container'>
                        <video controls src={outputUrl} width={'500px'} height={'450px'} />
                    </div>}
                </Col>
            </Row>
            <Button onClick={handleOverlay} className='m-2' disabled={validateAddLayer()}>Add Layer</Button>
        </React.Fragment>
        }
    </section >
}

export default Layer;


