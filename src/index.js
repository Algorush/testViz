import React from 'react';
import ReactDOM from 'react-dom';
import GlobeViz from './GlobeViz';
import './index.css';

// Initialize the extension
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
        console.error("Error initializing Tableau extension:", error);
      });
    } else {
      ReactDOM.render(
        <React.StrictMode>
          <div className="browser-mode">
            <h2>Tableau Globe Extension - Browser Mode</h2>
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

// Main App component
function App() {
  const [worksheetNames, setWorksheetNames] = React.useState([]);
  const [selectedWorksheet, setSelectedWorksheet] = React.useState('');
  const [dimensions, setDimensions] = React.useState([]);
  const [measures, setMeasures] = React.useState([]);
  const [selectedConfig, setSelectedConfig] = React.useState({
    latField: '',
    lonField: '',
    colorField: '',
    sizeField: '',
    labelField: '',
    worksheetName: ''
  });
  const [data, setData] = React.useState([]);
  const [isConfigured, setIsConfigured] = React.useState(false);

  // Fetch worksheet names on load
  React.useEffect(() => {
    if (typeof tableau === 'undefined') return;
    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const worksheets = dashboard.worksheets;
    setWorksheetNames(worksheets.map(ws => ws.name));
  }, []);

  // Handle worksheet selection and fetch fields
  const handleWorksheetChange = (e) => {
    const name = e.target.value;
    setSelectedWorksheet(name);
    setSelectedConfig({ ...selectedConfig, worksheetName: name });
    setDimensions([]); // Reset fields
    setMeasures([]);

    if (!name) return;

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const worksheet = dashboard.worksheets.find(ws => ws.name === name);
    if (worksheet) {
      worksheet.getSummaryDataAsync({ maxRows: 1 }).then(dataTable => {
        const dims = dataTable.columns.filter(col => col.dataType === 'string');
        const meas = dataTable.columns.filter(col => ['float', 'integer', 'real'].includes(col.dataType));
        setDimensions(dims.map(col => ({ name: col.fieldName, dataType: col.dataType })));
        setMeasures(meas.map(col => ({ name: col.fieldName, dataType: col.dataType })));
      }).catch(err => {
        console.error('Error fetching worksheet fields:', err);
      });
    }
  };

  // Apply configuration and fetch data
  const applyConfiguration = () => {
    if (!selectedWorksheet || !selectedConfig.latField || !selectedConfig.lonField) {
      alert('Please select a worksheet and at least latitude and longitude fields');
      return;
    }

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const worksheet = dashboard.worksheets.find(ws => ws.name === selectedWorksheet);
    
    if (worksheet) {
      worksheet.getSummaryDataAsync().then(dataTable => {
        const formattedData = dataTable.data.map(row => {
          const rowData = {};
          
          // Map each column to its index for faster lookup
          const columnMap = {};
          dataTable.columns.forEach((col, idx) => {
            columnMap[col.fieldName] = idx;
          });
          
          // Add lat/lon fields (required)
          const latIdx = columnMap[selectedConfig.latField];
          const lonIdx = columnMap[selectedConfig.lonField];
          rowData.lat = parseFloat(row[latIdx].value);
          rowData.lng = parseFloat(row[lonIdx].value);
          
          // Add optional fields if selected
          if (selectedConfig.colorField) {
            const colorIdx = columnMap[selectedConfig.colorField];
            rowData.color = row[colorIdx].value;
          }
          
          if (selectedConfig.sizeField) {
            const sizeIdx = columnMap[selectedConfig.sizeField];
            rowData.size = parseFloat(row[sizeIdx].value);
          }
          
          if (selectedConfig.labelField) {
            const labelIdx = columnMap[selectedConfig.labelField];
            rowData.label = row[labelIdx].value;
          }
          
          // Add all original data for tooltips and future use
          dataTable.columns.forEach((col, idx) => {
            rowData[col.fieldName] = row[idx].value;
          });
          
          return rowData;
        });
        
        setData(formattedData);
        setIsConfigured(true);
      }).catch(err => {
        console.error('Error fetching data:', err);
      });
    }
  };

  return (
    <div className="app-container">
      {!isConfigured ? (
        <div className="config-panel">
          <h2>Configure Globe Visualization</h2>
          
          <div className="form-group">
            <label>Select Worksheet</label>
            <select value={selectedWorksheet} onChange={handleWorksheetChange}>
              <option value="">-- Select Worksheet --</option>
              {worksheetNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          
          {selectedWorksheet && (
            <>
              <div className="form-group">
                <label>Latitude Field (required)</label>
                <select 
                  value={selectedConfig.latField} 
                  onChange={e => setSelectedConfig({...selectedConfig, latField: e.target.value})}
                >
                  <option value="">-- Select Field --</option>
                  {dimensions.concat(measures)
                    .filter(field => ['float', 'integer', 'real'].includes(field.dataType))
                    .map(field => (
                      <option key={field.name} value={field.name}>{field.name}</option>
                    ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Longitude Field (required)</label>
                <select 
                  value={selectedConfig.lonField} 
                  onChange={e => setSelectedConfig({...selectedConfig, lonField: e.target.value})}
                >
                  <option value="">-- Select Field --</option>
                  {dimensions.concat(measures)
                    .filter(field => ['float', 'integer', 'real'].includes(field.dataType))
                    .map(field => (
                      <option key={field.name} value={field.name}>{field.name}</option>
                    ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Color Field (optional)</label>
                <select 
                  value={selectedConfig.colorField} 
                  onChange={e => setSelectedConfig({...selectedConfig, colorField: e.target.value})}
                >
                  <option value="">-- None --</option>
                  {dimensions.concat(measures).map(field => (
                    <option key={field.name} value={field.name}>{field.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Size Field (optional)</label>
                <select 
                  value={selectedConfig.sizeField} 
                  onChange={e => setSelectedConfig({...selectedConfig, sizeField: e.target.value})}
                >
                  <option value="">-- None --</option>
                  {measures.map(field => (
                    <option key={field.name} value={field.name}>{field.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Label Field (optional)</label>
                <select 
                  value={selectedConfig.labelField} 
                  onChange={e => setSelectedConfig({...selectedConfig, labelField: e.target.value})}
                >
                  <option value="">-- None --</option>
                  {dimensions.map(field => (
                    <option key={field.name} value={field.name}>{field.name}</option>
                  ))}
                </select>
              </div>
              
              <button className="apply-btn" onClick={applyConfiguration}>
                Apply Configuration
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="viz-container">
          <button 
            className="back-btn" 
            onClick={() => setIsConfigured(false)}
          >
            Back to Configuration
          </button>
          <GlobeViz 
            data={data} 
            config={selectedConfig} 
          />
        </div>
      )}
    </div>
  );
}