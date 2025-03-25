import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import GlobeViz from './GlobeViz';
import './index.css';

(function () {
  const initialize = () => {
    if (typeof tableau !== 'undefined') {
      tableau.extensions.initializeAsync().then(() => {
        ReactDOM.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
          document.getElementById('root')
        );
      }).catch(error => {
        console.error("Error initializing Tableau Viz extension:", error);
      });
    } else {
      ReactDOM.render(
        <React.StrictMode>
          <div className="browser-mode">
            <h2>Tableau Globe Viz Extension - Browser Mode</h2>
            <p>This extension is designed to run inside Tableau.</p>
          </div>
        </React.StrictMode>,
        document.getElementById('root')
      );
    }
  };

  if (document.readyState !== 'loading') {
    initialize();
  } else {
    document.addEventListener('DOMContentLoaded', initialize);
  }
})();

function App() {
  const [data, setData] = useState([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState(null);
  const [config, setConfig] = useState({
    lat: '',
    lon: '',
    location: '',
    color: '',
    size: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    tableau.extensions.initializeAsync().then(() => {
      let dashboard = tableau.extensions.dashboardContent.dashboard;
      setSelectedWorksheet(dashboard.worksheets[0]); // Выбираем первый лист по умолчанию
    });
  }, []);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const applyConfiguration = () => {
    if (!config.lat || !config.lon || !config.location) {
      alert('Please enter Latitude, Longitude, and Location.');
      return;
    }
    setIsConfigured(true);
  };

  return (
    <div className="app-container">
      {!isConfigured ? (
        <div className="config-panel">
          <h2>Configure Globe Visualization</h2>
          
          <div className="form-group">
            <label>Latitude (required)</label>
            <input type="text" name="lat" value={config.lat} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Longitude (required)</label>
            <input type="text" name="lon" value={config.lon} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Country/State/City (required)</label>
            <input type="text" name="location" value={config.location} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Color</label>
            <input type="text" name="color" value={config.color} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Size</label>
            <input type="text" name="size" value={config.size} onChange={handleChange} />
          </div>
          
          <button className="apply-btn" onClick={applyConfiguration}>Apply Configuration</button>
        </div>
      ) : (
        <div className="viz-container">
          <button className="back-btn" onClick={() => setIsConfigured(false)}>Back to Configuration</button>
          <GlobeViz data={config} />
        </div>
      )}
    </div>
  );
}

export default App;
