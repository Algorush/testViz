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

window.onload = () => {
  tableau.extensions.initializeAsync({configure: configure}).then(() => {
      console.log("Tableau Extensions API initialized");
      selectedWorksheet = tableau.extensions.worksheetContent.worksheet;
      setupDataChangeListener();
  }).catch((err) => {
      console.error("Error initializing:", err);
  });
};

function configure() {
  const popupUrl = 'config.html';
  tableau.extensions.ui.displayDialogAsync(popupUrl, JSON.stringify(selectedConfig), { height: 400, width: 400 })
    .then(payload => {
        selectedConfig = JSON.parse(payload);
        updateGlobe();
    })
        .catch(err => {
        console.error("Error opening config dialog:", err);
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
  if (window.globeInstance) {
    window.globeInstance.updateData(data, config);
  } else {
    const globeContainer = document.getElementById("globeViz");
    window.globeInstance = ReactDOM.render(React.createElement(Globe, { data, config }), globeContainer);
  }
}

function setupDataChangeListener() {
  selectedWorksheet.addEventListener(tableau.TableauEventType.DataChanged, () => {
    console.log("Data changed, updating globe...");
    updateGlobe();
  });
}
