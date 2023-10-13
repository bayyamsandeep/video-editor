import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Row, Col, Button } from "react-bootstrap";

import '../App.css';

const Layer = () => {
    const ffmpegRef = useRef(new FFmpeg());
    const [loaded, setLoaded] = useState(false);
    const [overlayMode, setOverlayMode] = useState('text');
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
        }
    };

    const handleOverlay = async () => {
        let ffmpeg = ffmpegRef.current;
        let servicePromise, promiseArray = [];
        if (loaded) {
            setProcessing(true)

            const fontLink = `https://raw.githubusercontent.com/ffmpegwasm/testdata/master/arial.ttf`;
            const textFilter = `drawtext=fontfile=/arial.ttf:text='${overlayText}':x=100:y=100:fontsize=100:fontcolor=red`;

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
                    return ffmpeg.exec(['-i', videoFile.name, '-i', overlayImage.name, '-filter_complex', '[1]scale=50:50[b];[0][b] overlay=(main_w-overlay_w)-50:y=(main_h-overlay_h)-80', '-preset', 'ultrafast', 'output.mp4']);
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
                        {overlayMode === 'text' ? <div>
                            <label className='fw-bold mb-1'>Overlay Text</label> <br />
                            <input type='text' onChange={(e) => { handleChange(e, 'overylayText') }} placeholder="Enter text to overlay" id='text-input' />
                        </div> :
                            <input type='file' onChange={(e) => { handleChange(e, 'overlayImage') }} accept="image/*" />}
                    </div>
                    {overlaySrc?.length > 0 && <div className='overlay-img-container text-center'>
                        <img src={overlaySrc.default || overlaySrc} alt='overlay' className='overlay-image' />
                    </div>}
                </Col>
            </Row>
            <Row className='m-0 p-0'>
                <Col>
                    {videoUrl && <video controls src={videoUrl} width={'500px'} height={'450px'} />}
                </Col>
                <Col className='text-left d-flex justify-content-center align-items-center'>
                    {processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {!processing && outputUrl && <video controls src={outputUrl} width={'500px'} height={'450px'} />}
                </Col>
            </Row>
            <Button onClick={handleOverlay} className='m-2' disabled={validateAddLayer()}>Add Layer</Button>
        </React.Fragment>}
    </section>
}

export default Layer;


