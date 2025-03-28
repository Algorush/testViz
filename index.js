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

};

function applyConfiguration() {
  if (!selectedWorksheet) {
    alert("No worksheet selected");
    return;
  }

  selectedWorksheet.getSummaryDataAsync().then(dataTable => {
    const formattedData = dataTable.data.map(row => {
      const rowData = {};
      const columnMap = {};
      
      dataTable.columns.forEach((col, idx) => {
        columnMap[col.fieldName] = idx;
      });

      if (selectedConfig.latField && selectedConfig.lonField) {
        rowData.lat = parseFloat(row[columnMap[selectedConfig.latField]].value);
        rowData.lng = parseFloat(row[columnMap[selectedConfig.lonField]].value);
      }

      if (selectedConfig.colorField) {
        rowData.color = row[columnMap[selectedConfig.colorField]]?.value;
      }

      if (selectedConfig.sizeField) {
        rowData.size = parseFloat(row[columnMap[selectedConfig.sizeField]]?.value);
      }

      if (selectedConfig.labelField) {
        rowData.label = row[columnMap[selectedConfig.labelField]]?.value;
      }

      return rowData;
    });

    console.log("Loaded Data:", formattedData);
    isConfigured = true;
    renderGlobeInWorksheet(formattedData, selectedConfig);
  }).catch(err => {
    console.error("Error fetching data from worksheet:", err);
  });
}

document.getElementById("applyConfigButton").addEventListener("click", applyConfiguration);

function renderGlobeInWorksheet(data, config) {
  const vizContainer = document.getElementById("globeViz");
  if (viz) {
    viz.dispose();
  }
  tableau.VizManager.createVizAsync(vizContainer, "Globe", { data, config }).then(newViz => {
    viz = newViz;
  });
}

function setupDataChangeListener() {
  selectedWorksheet.addEventListener(tableau.TableauEventType.DataChanged, () => {
    console.log("Data changed, updating globe...");
    applyConfiguration();
  });
}

let worksheet = null;



document.getElementById("saveButton").addEventListener("click", () => {
    const config = {
        latField: document.getElementById("latField").value,
        lonField: document.getElementById("lonField").value,
        colorField: document.getElementById("colorField").value,
        sizeField: document.getElementById("sizeField").value,
        labelField: document.getElementById("labelField").value
    };
    tableau.extensions.ui.closeDialog(JSON.stringify(config));
});

document.getElementById("cancelButton").addEventListener("click", () => {
    tableau.extensions.ui.closeDialog("");
});