tableau.extensions.initializeDialogAsync().then(() => {
    console.log("Config dialog initialized.");

    const worksheet = tableau.extensions.worksheetContent.worksheet;

    // get field names
    const fieldNames = worksheet.getDataSourceAsync()
        .then(ds => ds.fields.map(field => field.name))
        .catch(err => {
            console.error("Error fetching field names:", err);
            return [];
        });

    fieldNames.then(names => {
        console.log("Available fields:", names);

        populateDropdown("latitude", names);
        populateDropdown("longitude", names);
        populateDropdown("size", names, true);
        populateDropdown("color", names, true);
        populateDropdown("country", names);

        document.getElementById("applyConfigButton").addEventListener("click", saveConfig);
    });
});

/**
* Populates a dropdown (`select`) with field options.
* @param {string} id - The ID of the `<select>` element.
* @param {string[]} fieldNames - The available field names.
* @param {boolean} [optional=false] - Whether the field is optional.
*/
function populateDropdown(id, fieldNames, optional = false) {
  const select = document.getElementById(id);
  select.innerHTML = optional ? '<option value="">None</option>' : "";

  fieldNames.forEach(field => {
      const option = document.createElement("option");
      option.value = field;
      option.textContent = field;
      select.appendChild(option);
  });

  // Restore previous selection
  const savedValue = tableau.extensions.settings.get(id);
  if (savedValue) {
      select.value = savedValue;
  }
}

/**
* Saves user selections to Tableau settings.
*/
function saveConfig() {
  tableau.extensions.settings.set("latitude", document.getElementById("latitude").value);
  tableau.extensions.settings.set("longitude", document.getElementById("longitude").value);
  tableau.extensions.settings.set("size", document.getElementById("size").value);
  tableau.extensions.settings.set("color", document.getElementById("color").value);
  tableau.extensions.settings.set("country", document.getElementById("country").value);

  tableau.extensions.settings.saveAsync().then(() => {
      console.log("Settings saved.");
      tableau.extensions.ui.closeDialog("");
  });
}