import React from "react";
import ReactDOM from "react-dom/client";
import Globe from "./GlobeViz";

var config = {};
var currentWorksheet = null;
var processedData = [];

export async function initExtension() {
  let vizRendered = false;
  tableau.extensions.initializeAsync({ configure: configure })
  .then(() => {
      console.log("Tableau Extension initialized");

      currentWorksheet = tableau.extensions.worksheetContent.worksheet;

      tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, (settingsEvent) => {
        const settings = settingsEvent.newSettings ?? {};
        console.log("Settings changed:", settings);
        renderGlobe(processedData, config);
        updateWorksheet(settings);
      });
      
      updateWorksheet();
  })
  .catch(err => console.error("Tableau Extension initialization error:", err));

  function updateWorksheet(settings) {
    const newSettings = settings || tableau.extensions.settings.getAll();
  
    const fullConfig = JSON.parse(newSettings["config"]|| "{}");
    const currentConfig = fullConfig[currentWorksheet.name] || {};  
  
    config = {
      latitude: currentConfig.latitude || "Latitude",
      longitude: currentConfig.longitude || "Longitude",
      country: currentConfig.country || "Country",
      size: currentConfig.size || null,
      color: currentConfig.color || null,
      oceanColor: currentConfig.oceanColor || 'rgb(200, 200, 200)',
      hoverColor: currentConfig.hoverColor || '#FF0000',
      pointColor: currentConfig.pointColor || "#ff6200",
      pointRadius: parseFloat(currentConfig.pointRadius) || 0.3,
      pointAltitude: parseFloat(currentConfig.pointAltitude) || 0.011,
      zoomAltitude: parseFloat(currentConfig.zoomAltitude) || 0.7,
      defaultAltitude: parseFloat(currentConfig.defaultAltitude) || 2,
    };
  
    currentWorksheet.getSummaryDataAsync()
    .then(dataTable => {
      console.log("Data table:", dataTable);
        const processedData = processTableauData(dataTable);
  
        if (!processedData) {
            console.warn("No suitable data found. Please open settings.");
            return;
        }
  
        console.log(`Data prepared for rendering (${processedData.type}):`, processedData.data);
        config.type = processedData.type;
        renderGlobe(processedData.data, config);
        vizRendered = true;
    })
    .catch(err => console.error("Error fetching data:", err));
  }

  // Setup interactivity events
  onresize = () => {
    if (vizRendered) renderGlobe(processedData, config);
  };
}

window.onload = () => {
  initExtension();
}

/**
 * Processes Tableau worksheet data and determines whether to use latitude/longitude or country names.
 * @param {Object} dataTable - Tableau dataTable object.
 * @returns {Object|null} Processed data object with type and formatted data or null if invalid.
 */
function processTableauData(dataTable) {
    const columns = dataTable.columns.map(col => col.fieldName);
    console.log("Loaded fields:", columns);

    const fullConfig = JSON.parse(tableau.extensions.settings.get("config") || "{}");
    const currentConfig = fullConfig[currentWorksheet.name] || {};   

    console.log("Current config:", currentConfig);
    const latField = currentConfig.latitude || columns.find(colName => colName.match(/(L|l)atitude/));
    const lonField = currentConfig.longitude || columns.find(colName => colName.match(/(L|l)ongitude/));
    const sizeField = currentConfig.size;
    const colorField = currentConfig.color;
    const countryField = currentConfig.country || columns.find(colName => colName.match(/(C|c)ountry/));

    let configType = "";

    if (latField && lonField && columns.includes(latField) && columns.includes(lonField)) {
        // Use latitude and longitude
        processedData = dataTable.data.map(row => ({
            latitude: parseFloat(row[columns.indexOf(latField)].value),
            longitude: parseFloat(row[columns.indexOf(lonField)].value),
            size: sizeField && columns.includes(sizeField) ? parseFloat(row[columns.indexOf(sizeField)].value) : 1,
            country: countryField && columns.includes(countryField) ? row[columns.indexOf(countryField)].value : null
        }));
        configType = "coordinates";
        console.log("coordinates");
    } else if (countryField && columns.includes(countryField)) {
        // Use country names
        processedData = dataTable.data.map(row => ({
            country: row[columns.indexOf(countryField)].value,
            size: sizeField && columns.includes(sizeField) ? parseFloat(row[columns.indexOf(sizeField)].value) : 1,
        }));
        configType = "countries";
        console.log("countries");
    } else {
        console.warn("No suitable data found. Please open settings.");
        return null;
    }
    console.log("Processed data:", processedData);
    return { type: configType, data: processedData };
}

/**
 * Opens the configuration panel where users can select field names for latitude, longitude, etc.
 */
function configure() {
    tableau.extensions.ui.displayDialogAsync("config.html", "", { height: 500, width: 400 })
        .then(() => {
          
          console.log("Configuration saved, reloading data...");
            
        })
        .catch((err) => {
          if (err.errorCode === tableau.ErrorCodes.DialogClosedByUser) {
            //updateWorksheet();
            console.warn("User closed the configuration dialog.");
          } else {
            console.error("Error opening config.html:", err.message);
          }
        });
}

let globeRoot = null;

function renderGlobe(data, config) {
  const globeContainer = document.getElementById("globeViz");

  if (!globeRoot) {
    globeRoot = ReactDOM.createRoot(globeContainer);
  }

  globeRoot.render(<Globe data={data} config={config}/>);
}
