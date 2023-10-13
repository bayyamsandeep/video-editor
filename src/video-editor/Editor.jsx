import React, { useState } from 'react';
import { Row, Col, Tabs, Tab } from "react-bootstrap";

import Trim from './Trim';
import Merge from './Merge';
import Layer from './Layer';
import '../App.css';

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

const Editor = () => {
    const [activeTab, setActiveTab] = useState('trim');

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    }

    return <React.Fragment>
        <Row className='text-center m-0 p-0'>
            <Col>
                <h1 className='mb-3'>Video Editor</h1>
                <Tabs activeKey={activeTab} className="mb-1" onSelect={handleTabChange} >
                    {tabs.map((tabItem, index) => <Tab eventKey={tabItem.key} title={tabItem.label} key={index}>
                        {activeTab === 'trim' && <Trim />}
                        {activeTab === 'merge' && <Merge />}
                        {activeTab === 'layer' && <Layer />}
                    </Tab>)}
                </Tabs>
            </Col>
        </Row>
    </React.Fragment >
}

export default Editor;


