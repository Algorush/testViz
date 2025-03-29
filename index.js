//import { createRoot } from 'react-dom/client';

let selectedWorksheet = null;
let selectedConfig = {
  latField: "",
  lonField: "",
  colorField: "",
  sizeField: "",
  labelField: ""
};
let isConfigured = false;
let viz = null;
let globeRoot = null;


window.onload = () => {
  const contextMenus = {
    "configure": () => {
      const popupUrl = 'config.html';
      
      tableau.extensions.ui.displayDialogAsync(popupUrl, JSON.stringify(selectedConfig), { 
        height: 400, 
        width: 400 
      })
      .then(payload => {
        selectedConfig = JSON.parse(payload);
        updateGlobe();
      })
      .catch(err => {
        console.error("Error opening config dialog:", err);
      });
    }
  };
  tableau.extensions.initializeAsync(contextMenus).then(() => {
      console.log("Tableau Extensions API initialized");
      selectedWorksheet = tableau.extensions.worksheetContent.worksheet;
      setupDataChangeListener();
  }).catch((err) => {
      console.error("Error initializing:", err);
  });
}

function updateGlobe() {
  if (!selectedWorksheet) {
    console.error("No worksheet selected");
    return;
  }

  selectedWorksheet.getSummaryDataAsync().then(dataTable => {
    const columnMap = {};
    dataTable.columns.forEach((col, idx) => {
      columnMap[col.fieldName] = idx;
    });

    const formattedData = dataTable.data.map(row => ({
      lat: selectedConfig.latField ? parseFloat(row[columnMap[selectedConfig.latField]]?.value) : null,
      lng: selectedConfig.lonField ? parseFloat(row[columnMap[selectedConfig.lonField]]?.value) : null,
      color: selectedConfig.colorField ? row[columnMap[selectedConfig.colorField]]?.value : null,
      size: selectedConfig.sizeField ? parseFloat(row[columnMap[selectedConfig.sizeField]]?.value) : null,
      label: selectedConfig.labelField ? row[columnMap[selectedConfig.labelField]]?.value : null
    }));

    console.log("Updated Globe Data:", formattedData);
    renderGlobe(formattedData, selectedConfig);
  }).catch(err => {
    console.error("Error fetching data from worksheet:", err);
  });
}

function renderGlobe(data, config) {
    const globeContainer = document.getElementById("globeViz");

    if (!globeRoot) {
        globeRoot = createRoot(globeContainer);
        globeRoot.render(<Globe data={data} config={config} />);
    } else {
        globeRoot.render(<Globe data={data} config={config} />);
    }
}

function setupDataChangeListener() {
  selectedWorksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, () => {
    console.log("Data changed, updating globe...");
    updateGlobe();
  });
}

function populateConfigOptions() {
  if (!selectedWorksheet) return;

  selectedWorksheet.getSummaryDataAsync().then(dataTable => {
    const columns = dataTable.columns.map(col => col.fieldName);
    const fields = ["latField", "lonField", "colorField", "sizeField", "labelField"];
    
    fields.forEach(field => {
      const selectElement = document.getElementById(field);
      if (selectElement) {
        selectElement.innerHTML = "";
        columns.forEach(colName => {
          const option = document.createElement("option");
          option.value = colName;
          option.textContent = colName;
          selectElement.appendChild(option);
        });
      }
    });
  }).catch(err => {
    console.error("Error fetching columns for configuration:", err);
  });
}