import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Row, Col, Button } from "react-bootstrap";

import '../App.css';

const Trim = () => {
    const ffmpegRef = useRef(new FFmpeg());
    const [loaded, setLoaded] = useState(false);
    const [inputVideoFile, setInputVideoFile] = useState('');
    const [inputUrl, setInputUrl] = useState('');
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
        if (name === 'inputVideo') {
            setInputVideoFile(file);
            setInputUrl(URL.createObjectURL(file))
        }
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

                    return ffmpeg.exec(['-ss', '00:00:00', '-to', '00:00:15', '-i', inputVideoFile.name, '-c', 'copy', 'output.mp4'])

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
            <Row className='m-0 p-0'>
                <Col className='text-right'>
                    {inputUrl && <video controls src={inputUrl} width={'400px'} height={'400px'} />}
                </Col>
                <Col className='text-left d-flex justify-content-center align-items-center'>
                    {processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {!processing && outputUrl && <video controls src={outputUrl} width={'400px'} height={'400px'} />}
                </Col>
            </Row>
            <Button onClick={handleTrim} className='m-2' disabled={inputUrl.length === 0}>Trim Video</Button>
        </React.Fragment>}
    </section >
}

export default Trim;


