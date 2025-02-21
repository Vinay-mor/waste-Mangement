// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

// src/components/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold">
            Waste Prediction Analysis
          </Link>
          <div className="flex space-x-4">
            <Link to="/" className="px-3 py-2 rounded-md hover:bg-blue-700">
              Home
            </Link>
            <Link to="/upload" className="px-3 py-2 rounded-md hover:bg-blue-700">
              Upload
            </Link>
            <Link to="/dashboard" className="px-3 py-2 rounded-md hover:bg-blue-700">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

// src/pages/Home.js
import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Waste Generation Prediction System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload your historical waste data and get accurate predictions using AI
        </p>
        <Link
          to="/upload"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Get Started
        </Link>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard
          title="Multiple AI Models"
          description="Uses LSTM, Prophet, and ARIMA models for accurate predictions"
        />
        <FeatureCard
          title="Interactive Visualizations"
          description="Dynamic charts and graphs to analyze trends and patterns"
        />
        <FeatureCard
          title="Comprehensive Analysis"
          description="Detailed metrics and performance indicators"
        />
      </div>
    </div>
  );
}

// src/pages/Upload.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Upload() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      // Store the prediction results in localStorage or state management
      localStorage.setItem('predictionResults', JSON.stringify(data));
      navigate('/dashboard');
    } catch (err) {
      setError('Error uploading file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Upload Data</h2>
        
        <div className="space-y-4">
          <input
            type="file"
            onChange={handleFileChange}
            accept=".csv"
            className="w-full p-2 border rounded"
          />
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          {file && (
            <div className="text-sm text-gray-600">
              Selected file: {file.name}
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Upload and Generate Predictions'}
          </button>
        </div>
      </div>
    </div>
  );
}

// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function Dashboard() {
  const [data, setData] = useState(null);
  const [selectedModel, setSelectedModel] = useState('prophet');

  useEffect(() => {
    const results = JSON.parse(localStorage.getItem('predictionResults'));
    if (results) {
      setData(results);
    }
  }, []);

  if (!data) {
    return <div className="text-center py-12">No prediction data available</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Prediction Results</h2>
        
        <div className="mb-4">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="border rounded p-2"
          >
            <option value="prophet">Prophet</option>
            <option value="lstm">LSTM</option>
            <option value="arima">ARIMA</option>
          </select>
        </div>
        
        <div className="h-96">
          <LineChart
            width={800}
            height={400}
            data={[...data.historical_data, ...data.predictions]}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="waste"
              stroke="#8884d8"
              name="Historical"
            />
            <Line
              type="monotone"
              dataKey={`${selectedModel}_prediction`}
              stroke="#82ca9d"
              name="Prediction"
            />
          </LineChart>
        </div>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-xl font-bold mb-4">Model Performance</h3>
            <div>
              <p>RMSE: {data.metrics[selectedModel]?.rmse.toFixed(2)}</p>
              <p>R² Score: {data.metrics[selectedModel]?.r2.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-xl font-bold mb-4">Feature Importance</h3>
            <div>
              {data.feature_importance.map((feature) => (
                <p key={feature.feature}>
                  {feature.feature}: {feature.importance.toFixed(2)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
