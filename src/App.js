import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

import './App.css';

const App = () => {
    const [loaded, setLoaded] = useState(false);
    const ffmpegRef = useRef(new FFmpeg());
    const [inputVideoFile, setInputVideoFile] = useState('');
    const [inputUrl, setInputUrl] = useState('');
    const [outputUrl, setOutputUrl] = useState('');
    const [processing, setProcessing] = useState(false);
    const [inputFileOne, setInputFileOne] = useState('');
    const [inputFileTwo, setInputFileTwo] = useState('');
    const [mergeInputUrlOne, setmergeInputUrlOne] = useState('');
    const [mergeInputUrlTwo, setmergeInputUrlTwo] = useState('');
    const [mergeOutputUrl, setmergeOutputUrl] = useState('');
    const [mode, setMode] = useState('')

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
        console.log('e', e, name)
        let file = e.target.files[0];
        console.log(file);
        if (name === 'inputVideo') {
            setInputVideoFile(file);
            setInputUrl(URL.createObjectURL(file))
        } else if (name === 'inputVideoOne') {
            setInputFileOne(file)
            setmergeInputUrlOne(URL.createObjectURL(file))
        } else if (name === 'inputVideoTwo') {
            setInputFileTwo(file)
            setmergeInputUrlTwo(URL.createObjectURL(file))
        }
    };

    const handleTrim = () => {
        let ffmpeg = ffmpegRef.current;
        let servicePromise, promiseArray = [];
        if (loaded) {
            setProcessing(true)
            setMode('trim')

            // Trim video from 10s to 15s

            servicePromise = fetchFile(inputVideoFile).then(fileResp => ffmpeg.writeFile(inputVideoFile.name, fileResp))
                .finally(() => {
                    return ffmpeg.exec(['-i', inputVideoFile.name, '-ss', '00:00:10', '-to', '00:00:15', 'output.mp4'])
                });
            promiseArray.push(servicePromise)

            Promise.all(promiseArray).then(_res => {
                ffmpeg.readFile('output.mp4').then(res => {
                    const url = URL.createObjectURL(new Blob([res.buffer], { type: 'video/mp4' }));
                    console.log('url', url, res)
                    setOutputUrl(url);
                    setProcessing(false)
                });
            })

        }
    };

    const handleMerge = async () => {
        let ffmpeg = ffmpegRef.current
        let servicePromise, promiseArray = [];
        if (loaded) {
            setProcessing(true)
            setMode('merge')
            // Merge videos

            ffmpeg.writeFile(inputFileOne.name, await fetchFile(inputFileOne));
            ffmpeg.writeFile(inputFileTwo.name, await fetchFile(inputFileTwo));

            await ffmpeg.exec(['-i', inputFileOne.name, '-i', inputFileTwo.name, '-filter_complex', 'concat=n=2:v=1:a=1 [v] [a]', '-map', '[v]', '-map', '[a]', 'output.mp4']);

            ffmpeg.readFile('output.mp4').then(res => {
                const url = URL.createObjectURL(new Blob([res.buffer], { type: 'video/mp4' }));
                console.log('mergeUrl', url)
                setmergeOutputUrl(url);
                setProcessing(false)
            });
        }
    };

    return <React.Fragment>
        <div className='text-center'>
            {/* <h1 className='text-center'>Video Editor</h1> */}
            <h3 className='text-primary'>Trim video</h3>
            <div className='mb-3 mt-5'>
                <input type='file' onChange={(e) => { handleChange(e, 'inputVideo') }} />
            </div>

            <div className='row'>
                <div className='col text-right'>
                    {inputUrl && <video controls src={inputUrl} width={'400px'} height={'400px'} />}
                </div>
                <div className='col text-left d-flex justify-content-center align-items-center'>
                    {mode === 'trim' && processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {mode === 'trim' && !processing && outputUrl && <video controls src={outputUrl} width={'400px'} height={'400px'} />}
                </div>
            </div>
            <button onClick={handleTrim} className='m-2'>Trim Video</button>


            {/* Mege Video */}

            <h3 className='text-secondary mt-3'>Merge video</h3>

            <div className='mb-3 mt-5'>
                <input type='file' onChange={(e) => { handleChange(e, 'inputVideoOne') }} />
                <input type='file' onChange={(e) => { handleChange(e, 'inputVideoTwo') }} />
            </div>

            <div className='row'>
                <div className='col text-right'>
                    <div>
                        <span>
                            {mergeInputUrlOne && <video controls src={mergeInputUrlOne} width={'400px'} height={'400px'} />}
                        </span>
                        <span>
                            {mergeInputUrlTwo && <video controls src={mergeInputUrlTwo} width={'400px'} height={'400px'} />}
                        </span>
                    </div>
                </div>
                <div className='col text-left d-flex justify-content-center align-items-center'>
                    {mode === 'merge' && processing && <i className="fa fa-spinner fa-3x text-primary" aria-hidden="true"></i>}
                    {mode === 'merge' && !processing && mergeOutputUrl && <video controls src={mergeOutputUrl} width={'400px'} height={'400px'} />}
                </div>
            </div>
            <button onClick={handleMerge} className='m-2'>Merge Video</button>
        </div>
    </React.Fragment >
}

export default App;


