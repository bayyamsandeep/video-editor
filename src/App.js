import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Row, Col, Tabs, Tab, Button } from "react-bootstrap";

import './App.css';

const tabs = [
    {
        key: 'trim',
        label: 'Trim'
    },
    {
        key: 'merge',
        label: 'Merge'
    },
    {
        key: 'layer',
        label: 'Layer'
    }
];

const App = () => {
    const ffmpegRef = useRef(new FFmpeg());
    const [loaded, setLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('trim');
    const [inputVideoFile, setInputVideoFile] = useState('');
    const [inputUrl, setInputUrl] = useState('');
    const [inputFileOne, setInputFileOne] = useState('');
    const [inputFileTwo, setInputFileTwo] = useState('');
    const [mergeInputUrlOne, setmergeInputUrlOne] = useState('');
    const [mergeInputUrlTwo, setmergeInputUrlTwo] = useState('');
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
        let file = e.target.files?.[0];
        if (name === 'inputVideo') {
            setInputVideoFile(file);
            setInputUrl(URL.createObjectURL(file))
        } else if (name === 'inputVideoOne') {
            setInputFileOne(file)
            setmergeInputUrlOne(URL.createObjectURL(file))
        } else if (name === 'inputVideoTwo') {
            setInputFileTwo(file)
            setmergeInputUrlTwo(URL.createObjectURL(file))
        } else if (name === 'overylayText') {
            setOverlayText(e.target.value)
        } else if (name === 'videoFile') {
            setVideoFile(file)
            setVideoUrl(URL.createObjectURL(file))
        }
    };

    const handleTabChange = (tabName) => {
        setActiveTab(tabName); setInputVideoFile(''); setInputUrl(''); setInputFileOne(''); setInputFileTwo(''); setmergeInputUrlOne(''); setmergeInputUrlTwo('');
        setOutputUrl(''); setProcessing(false)
    }

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

                    return ffmpeg.exec(['-i', inputFileOne.name, '-i', inputFileTwo.name, '-filter_complex', 'concat=n=2:v=1:a=1 [v] [a]', '-map', '[v]', '-map', '[a]', 'output.mp4']);
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

    const handleOverlay = async () => {
        let ffmpeg = ffmpegRef.current;
        let servicePromise, promiseArray = [];
        if (loaded) {
            setProcessing(true)

            const fontLink = `https://raw.githubusercontent.com/ffmpegwasm/testdata/master/arial.ttf`;
            const textFilter = `drawtext=fontfile=/arial.ttf:text='${overlayText}':x=100:y=100:fontsize=36:fontcolor=white`;

            servicePromise = fetchFile(videoFile).then(fileResp => ffmpeg.writeFile(videoFile.name, fileResp))
            promiseArray.push(servicePromise)

            servicePromise = fetchFile(fontLink).then(fomtResp => ffmpeg.writeFile('arial.ttf', fomtResp))
            promiseArray.push(servicePromise)

            Promise.all(promiseArray).then(_res => {
                return ffmpeg.exec(['-i', videoFile.name, '-vf', textFilter, 'output.mp4',]);
            }).finally(() => {
                ffmpeg.readFile('output.mp4').then(res => {
                    const url = URL.createObjectURL(new Blob([res.buffer], { type: 'video/mp4' }));
                    setOutputUrl(url);
                    setProcessing(false)
                });
            })
        }
    };

    const renderTrim = () => {
        return <React.Fragment>
            <Row>
                <Col>
                    <h3 className='text-primary'>Trim video</h3>
                    <div className='mb-3 mt-5'>
                        <input type='file' onChange={(e) => { handleChange(e, 'inputVideo') }} />
                    </div>
                </Col>
            </Row>
            <Row>
                <Col className='text-right'>
                    {inputUrl && <video controls src={inputUrl} width={'400px'} height={'400px'} />}
                </Col>
                <Col className='text-left d-flex justify-content-center align-items-center'>
                    {processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {!processing && outputUrl && <video controls src={outputUrl} width={'400px'} height={'400px'} />}
                </Col>
            </Row>
            <Button onClick={handleTrim} className='m-2' disabled={inputUrl.length === 0}>Trim Video</Button>
        </React.Fragment>
    }

    const renderMerge = () => {
        return <React.Fragment>
            <h3 className='text-primary mt-3'>Merge video</h3>
            <div className='mb-3 mt-5'>
                <input type='file' onChange={(e) => { handleChange(e, 'inputVideoOne') }} />
                <input type='file' onChange={(e) => { handleChange(e, 'inputVideoTwo') }} />
            </div>

            <Row>
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
        </React.Fragment>
    }

    const renderLayer = () => {
        return <React.Fragment>
            <Row>
                <Col>
                    <h3 className='text-primary'>Add Layer</h3>
                    <div className='mb-3 mt-5'>
                        <input type='file' onChange={(e) => { handleChange(e, 'videoFile') }} />
                    </div>
                    <div className='mb-3'>
                        <label className='fw-bold mb-1'>Overlay Text</label> <br />
                        <input type='text' onChange={(e) => { handleChange(e, 'overylayText') }} placeholder="Enter text to overlay" id='text-input' />
                    </div>
                </Col>
            </Row>
            <Row>
                <Col>
                    {videoUrl && <video controls src={videoUrl} width={'500px'} height={'450px'} />}
                </Col>
                <Col className='text-left d-flex justify-content-center align-items-center'>
                    {processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {!processing && outputUrl && <video controls src={outputUrl} width={'400px'} height={'400px'} />}
                </Col>
            </Row>
            <Button onClick={handleOverlay} className='m-2'>Add Layer</Button>

        </React.Fragment>

    }

    return <React.Fragment>
        <Row className='text-center'>
            <Col>
                <h1 className='mb-3'>Video Editor</h1>
                <Tabs activeKey={activeTab} className="mb-1" onSelect={handleTabChange} >
                    {tabs.map((tabItem, index) => <Tab eventKey={tabItem.key} title={tabItem.label} key={index}>
                        {activeTab === 'trim' && renderTrim()}
                        {activeTab === 'merge' && renderMerge()}
                        {activeTab === 'layer' && renderLayer()}
                    </Tab>)}
                </Tabs>
            </Col>
        </Row>
    </React.Fragment >
}

export default App;


