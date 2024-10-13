import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js';
import { Container, Row, Col, Form, Button, Table, Alert, Spinner } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import backgroundImage from '../assets/img/background.jpg';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const AnalysisPage = () => {
    // State variables for file upload and preview
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [fileError, setFileError] = useState('');

    // State variables for user inputs
    const [stateOptions, setStateOptions] = useState([]);
    const [selectedState, setSelectedState] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // State variables for analysis results
    const [pieData, setPieData] = useState({});
    const [barData, setBarData] = useState({});
    const [highestCountCrime, setHighestCountCrime] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch state options from the backend on component mount
    useEffect(() => {
        axios.get('http://localhost:8007/states')
            .then(response => {
                setStateOptions(response.data.states);
            })
            .catch(error => {
                console.error('Error fetching states:', error);
                setError('Error fetching state options. Please try again.');
            });
    }, []);

    // Handler for file upload
    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        const fileExtension = uploadedFile.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'csv'].includes(fileExtension)) {
            setFileError('Invalid file format. Please upload an Excel or CSV file.');
            setFile(null);
            setPreviewData([]);
            return;
        }

        setFileError('');
        setFile(uploadedFile);

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = event.target.result;
            let workbook;

            try {
                workbook = XLSX.read(data, { type: fileExtension === 'csv' ? 'binary' : 'array' });
            } catch (error) {
                console.error('Error reading file:', error);
                setFileError('Error reading the file. Please ensure it is a valid Excel or CSV file.');
                setPreviewData([]);
                return;
            }

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) {
                setFileError('The uploaded file is empty.');
                setPreviewData([]);
                return;
            }

            setPreviewData(jsonData);
        };

        if (fileExtension === 'csv') {
            reader.readAsBinaryString(uploadedFile);
        } else {
            reader.readAsArrayBuffer(uploadedFile);
        }
    };

    // Handler for performing analysis
    const handleAnalyze = () => {
        if (!file) {
            setError('Please upload a crime dataset.');
            return;
        }
        if (!selectedState || !selectedYear) {
            setError('Please select both state and year for analysis.');
            return;
        }

        setError('');
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('state', selectedState);
        formData.append('year', selectedYear);

        axios.post('http://localhost:8007/crime-analysis', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        .then(response => {
            const { pie_data, bar_data, highest_count_crime } = response.data;

            // Prepare Pie Chart Data
            setPieData({
                labels: Object.keys(pie_data),
                datasets: [{
                    data: Object.values(pie_data),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#8A2BE2', '#4BC0C0', '#FF7F50', '#7FFF00'],
                }],
            });

            // Prepare Bar Chart Data
            setBarData({
                labels: Object.keys(bar_data),
                datasets: [{
                    label: 'Crime Count',
                    data: Object.values(bar_data),
                    backgroundColor: '#007bff',
                }],
            });

            setHighestCountCrime(highest_count_crime);
            setLoading(false);
        })
        .catch(error => {
            console.error('Error during analysis:', error);
            setError(`Error performing analysis: ${error.response?.data?.message || error.message}`);
            setLoading(false);
        });
    };

    // Handler to clear only the charts and analysis results
    const handleClear = () => {
        setPieData({});
        setBarData({});
        setHighestCountCrime('');
    };

    // Generate year options dynamically (e.g., from 2000 to current year)
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: currentYear - 1999 }, (_, i) => 2000 + i);

    // Chart Options with Custom Fonts
    const chartOptions = {
        plugins: {
            legend: {
                labels: {
                    font: {
                        size: 16, // Adjust this value as needed
                        family: 'Arial', // Specify the font family
                        weight: 'bold', // Specify the font weight
                    },
                    color: 'white', // Set font color to white
                },
            },
            tooltip: {
                titleFont: {
                    size: 14,
                    family: 'Arial',
                    weight: 'bold',
                },
                bodyFont: {
                    size: 12,
                    family: 'Arial',
                },
                bodyColor: 'white', // Set tooltip font color to white
                titleColor: 'white', // Set tooltip title color to white
            },
        },
        scales: {
            x: {
                ticks: {
                    font: {
                        size: 14,
                        family: 'Arial',
                    },
                    color: 'white', // Set x-axis font color to white
                },
            },
            y: {
                ticks: {
                    font: {
                        size: 14,
                        family: 'Arial',
                    },
                    color: 'white', // Set y-axis font color to white
                },
            },
        },
    };

    return (
        <div>
            {/* File Upload Section with Background Image */}
            <div style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', padding: '50px 0' }}>
                <Container className="my-5">
                    <h1 className="text-center mb-4" style={{ color: 'white' }}>Crime Data Analysis</h1>

                    {/* File Upload Section */}
                    <Row className="mb-4 justify-content-center">
                        <Col md={8}>
                            <Form.Group controlId="formFile" className="mb-3">
                                <Form.Label style={{ color: 'white' }}><strong>Upload Crime Dataset (Excel or CSV)</strong></Form.Label>
                                <Form.Control type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                                {fileError && <Alert variant="danger" className="mt-2">{fileError}</Alert>}
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Data Preview Section */}
                    {previewData.length > 0 && (
                        <Row className="mb-4 justify-content-center">
                            <Col md={8}>
                                <h4 style={{ color: 'white' }}>Data Preview:</h4>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <Table striped bordered hover size="sm">
                                        <thead>
                                            <tr>
                                                {previewData[0].map((header, idx) => (
                                                    <th key={idx}>{header}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.slice(1, 6).map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {row.map((cell, cellIndex) => (
                                                        <td key={cellIndex}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {previewData.length > 6 && (
                                                <tr>
                                                    <td colSpan={previewData[0].length}>...and more rows</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Col>
                        </Row>
                    )}
                </Container>
            </div>

            {/* Analysis Section with Background Image */}
            <div style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', padding: '50px 0' }}>
                <Container>
                    {/* User Inputs Section */}
                    {file && (
                        <Row className="mb-4 justify-content-center">
                            <Col md={8}>
                                <Form.Group controlId="formState" className="mb-3">
                                    <Form.Label style={{ color: 'white' }}><strong>Select State</strong></Form.Label>
                                    <Form.Control as="select" value={selectedState} onChange={e => setSelectedState(e.target.value)}>
                                        <option value="">Select State</option>
                                        {stateOptions.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </Form.Control>
                                </Form.Group>
                            </Col>

                            <Col md={8}>
                                <Form.Group controlId="formYear" className="mb-3">
                                    <Form.Label style={{ color: 'white' }}><strong>Select Year</strong></Form.Label>
                                    <Form.Control as="select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                                        <option value="">Select Year</option>
                                        {yearOptions.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </Form.Control>
                                </Form.Group>
                            </Col>

                            <Col md={8}>
                                <Button variant="primary" onClick={handleAnalyze} disabled={loading}>
                                    {loading ? <Spinner animation="border" size="sm" /> : 'Analyze'}
                                </Button>
                                {error && <Alert variant="danger" className="mt-2">{error}</Alert>}
                                {pieData.labels && (
                                    <Button variant="secondary" onClick={handleClear} className="ms-2">
                                        Clear
                                    </Button>
                                )}
                            </Col>
                        </Row>
                    )}

                    {/* Analysis Results Section */}
                    {pieData.labels && (
                        <Row className="mb-4 justify-content-center">
                            <Col md={6}>
                                <h4 style={{ color: 'white' }}>Crime Type Distribution (Pie Chart):</h4>
                                <Pie data={pieData} options={chartOptions} />
                            </Col>
                            <Col md={6}>
                                <h4 style={{ color: 'white' }}>Crime Counts by Type (Bar Chart):</h4>
                                <Bar data={barData} options={chartOptions} />
                                {highestCountCrime && (
                                    <div className="mt-3" style={{ color: 'white' }}>
                                        <strong>Highest Crime Count:</strong> {highestCountCrime}
                                    </div>
                                )}
                            </Col>
                        </Row>
                    )}
                </Container>
            </div>
        </div>
    );
};

export default AnalysisPage;
