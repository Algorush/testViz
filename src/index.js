import React from "react";
import ReactDOM from "react-dom/client";
import Globe from "./GlobeViz";

var config = {};
const currentWorksheet = null;

window.onload = () => {
  tableau.extensions.initializeAsync({ configure: configure })
    .then(() => {
        console.log("Tableau Extension initialized");

        currentWorksheet = tableau.extensions.worksheetContent.worksheet;

        const settings = tableau.extensions.settings.getAll();
        console.log("Settings:", settings);

        config = {
          latitude: settings.latitude || "lat",
          longitude: settings.longitude || "lng",
          country: settings.country || "Country",
          size: settings.size || null,
          color: settings.color || null,
          pointColor: settings.pointColor || "#ff6200",
          pointRadius: parseFloat(settings.pointRadius) || 0.3,
          pointAltitude: parseFloat(settings.pointAltitude) || 0.011,
          zoomAltitude: parseFloat(settings.zoomAltitude) || 0.7,
          defaultAltitude: parseFloat(settings.defaultAltitude) || 2,
        };

        worksheet.getSummaryDataAsync()
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
          })
          .catch(err => console.error("Error fetching data:", err));
    })
    .catch(err => console.error("Tableau Extension initialization error:", err));
}

/**
 * Processes Tableau worksheet data and determines whether to use latitude/longitude or country names.
 * @param {Object} dataTable - Tableau dataTable object.
 * @returns {Object|null} Processed data object with type and formatted data or null if invalid.
 */
function processTableauData(dataTable) {
    const columns = dataTable.columns.map(col => col.fieldName);
    console.log("Loaded fields:", columns);

    const latField = tableau.extensions.settings.get("latitude");
    const lonField = tableau.extensions.settings.get("longitude");
    const sizeField = tableau.extensions.settings.get("size");
    const colorField = tableau.extensions.settings.get("color");
    const countryField = tableau.extensions.settings.get("country");

    let processedData = [];
    let configType = "";

    if (latField && lonField && columns.includes(latField) && columns.includes(lonField)) {
        // Use latitude and longitude
        processedData = dataTable.data.map(row => ({
            latitude: parseFloat(row[columns.indexOf(latField)].value),
            longitude: parseFloat(row[columns.indexOf(lonField)].value),
            size: sizeField && columns.includes(sizeField) ? parseFloat(row[columns.indexOf(sizeField)].value) : 1,
            color: colorField && columns.includes(colorField) ? row[columns.indexOf(colorField)].value : "blue"
        }));
        configType = "coordinates";
        console.log("coordinates");
    } else if (countryField && columns.includes(countryField)) {
        // Use country names
        processedData = dataTable.data.map(row => ({
            country: row[columns.indexOf(countryField)].value,
            size: sizeField && columns.includes(sizeField) ? parseFloat(row[columns.indexOf(sizeField)].value) : 1,
            color: colorField && columns.includes(colorField) ? row[columns.indexOf(colorField)].value : "blue"
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
        .catch(err => {            
          console.error("Configuration error:", err);            
        });
}

let globeRoot = null;

function renderGlobe(data, config) {
  const globeContainer = document.getElementById("globeViz");

  if (!globeRoot) {
    globeRoot = ReactDOM.createRoot(globeContainer);
  }

  globeRoot.render(<Globe data={data} config={config} worksheetRef={currentWorksheet} />);
}
