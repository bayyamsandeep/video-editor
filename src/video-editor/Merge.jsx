import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Row, Col, Button } from "react-bootstrap";

import '../App.css';

const Merge = () => {
    const ffmpegRef = useRef(new FFmpeg());
    const [loaded, setLoaded] = useState(false);
    const [inputFileOne, setInputFileOne] = useState('');
    const [inputFileTwo, setInputFileTwo] = useState('');
    const [mergeInputUrlOne, setmergeInputUrlOne] = useState('');
    const [mergeInputUrlTwo, setmergeInputUrlTwo] = useState('');
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
        if (name === 'inputVideoOne') {
            setInputFileOne(file)
            setmergeInputUrlOne(URL.createObjectURL(file))
        } else if (name === 'inputVideoTwo') {
            setInputFileTwo(file)
            setmergeInputUrlTwo(URL.createObjectURL(file))
        }
    };

    const getFileFormat = (filename) => {
        return filename.split('.').pop().toLowerCase();
    }

    const handleMerge = () => {
        let ffmpeg = ffmpegRef.current;
        let servicePromise, promiseArray = [];
        if (loaded) {
            setProcessing(true)
            // Merge videos

            servicePromise = fetchFile(inputFileOne).then((respOne) => ffmpeg.writeFile(inputFileOne.name, respOne));
            promiseArray.push(servicePromise)

            servicePromise = fetchFile(inputFileTwo).then((respTwo) => ffmpeg.writeFile(inputFileTwo.name, respTwo));
            promiseArray.push(servicePromise)

            Promise.all(promiseArray).then(_res => {
                if (getFileFormat(inputFileOne.name) === getFileFormat(inputFileTwo.name)) {
                    // videos with same video format and codec with out re-encoding

                    const listFileContent = `file '${inputFileOne.name}'\nfile '${inputFileTwo.name}'`;
                    ffmpeg.writeFile('list.txt', new TextEncoder().encode(listFileContent));
                    return ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'output.mp4']);
                } else {
                    // videos with different video format/codec with re-encoding
                    return ffmpeg.exec(['-i', inputFileOne.name, '-i', inputFileTwo.name, '-filter_complex', 'concat=n=2:v=1:a=1 [v] [a]', '-map', '[v]', '-map', '[a]', '-preset', 'ultrafast', 'output.mp4']);
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
            <h3 className='text-primary mt-3'>Merge video</h3>
            <div className='mb-3 mt-5'>
                <input type='file' onChange={(e) => { handleChange(e, 'inputVideoOne') }} accept="video/*" />
                <input type='file' onChange={(e) => { handleChange(e, 'inputVideoTwo') }} accept="video/*" />
            </div>

            <Row className='m-0 p-0'>
                <Col className='col text-right'>
                    <div>
                        <span>
                            {mergeInputUrlOne && <video controls src={mergeInputUrlOne} width={'400px'} height={'400px'} />}
                        </span>
                        <span>
                            {mergeInputUrlTwo && <video controls src={mergeInputUrlTwo} width={'400px'} height={'400px'} />}
                        </span>
                    </div>
                </Col>
                <Col className='col text-left d-flex justify-content-center align-items-center'>
                    {processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {!processing && outputUrl && <video controls src={outputUrl} width={'400px'} height={'400px'} />}
                </Col>
            </Row>
            <Button onClick={handleMerge} className='m-2' disabled={mergeInputUrlOne.length === 0 || mergeInputUrlTwo.length === 0}>Merge Video</Button>
        </React.Fragment>}
    </section>
}

export default Merge;


