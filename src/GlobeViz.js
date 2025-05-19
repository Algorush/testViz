import React, { useEffect, useRef } from 'react';
import Globe from 'globe.gl';

const GlobeViz = ({ data, config }) => {
  const globeEl = useRef();
  const containerRef = useRef();
  const worksheet = tableau.extensions.worksheetContent.worksheet;

  useEffect(() => {
    if (!data || data.length === 0) {
      containerRef.current.innerHTML = '<p>No data available to render the globe.</p>';
      return;
    }

    let isZoomedIn = false; 
    let selectedCountry = null;
    let countryName = null;
    let hoveredPolygon = null;
    let currentTupleId = null;

    let mousePosition = { x: 0, y: 0 };

    // update mouse position
    document.addEventListener("mousemove", (event) => {
      mousePosition.x = event.pageX;
      mousePosition.y = event.pageY;
    });

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error('WebGL context could not be created');
      }

      // Initialize globe
      var globe = new Globe(containerRef.current)
        .showAtmosphere(false)
        .backgroundColor('rgb(200, 200, 200)')
        .pointOfView({ lat: 30, lng: -90, altitude: config.defaultAltitude })
        .pointsData(data.filter(d => {
          const lat = parseFloat(d[config.latitude]);
          const lng = parseFloat(d[config.longitude]);
          return !isNaN(lat) && !isNaN(lng);
        }))
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius(0.3) // Flat circle size
        .pointColor(() => '#ff6200') // Orange circles
        .pointAltitude(0.011) // Flat on surface
        .pointsMerge(false); // Disable merging for distinct circles

        const globeMaterial = globe.globeMaterial();
        console.log("globe material", globeMaterial);
        globeMaterial.shininess = 1;
        globeMaterial.emissive.set('#000000');
        const oceanColor = config.oceanColor || 'black';
        globeMaterial.color.set(oceanColor);

      // Optional size scaling
      if (config.size) {
        const sizes = data.map(d => parseFloat(d[config.size]));
        const minSize = Math.min(...sizes);
        const maxSize = Math.max(...sizes);
        // const sizeScale = scaleLinear()
        //   .domain([minSize, maxSize])
        //   .range([0.2, 0.8]);
        globe.pointRadius(d => sizeScale(parseFloat(d[config.size])));
      }

    const hoverColor = config.hoverColor || 'rgb(255, 165, 0)';

    const hasCoordinates = data.some(d => d[config.latitude] && d[config.longitude]);
    const hasCountries = data.some(d => d[config.country]);

    if (hasCoordinates) {
      console.log("points data");
      globe
        .pointsData(data)
        .pointLat(d => parseFloat(d[config.latitude]))
        .pointLng(d => parseFloat(d[config.longitude]))
        .pointRadius(config.pointRadius)
        .pointColor(() => config.pointColor)
        .pointAltitude(config.pointAltitude);
    }

      document.addEventListener('click', event => {
          if (!event.target.closest('canvas')) return;
          if (countryName) return;
          resetView();
      });

      function resetView() {
        globe.controls().autoRotate = true;
        const currentView = globe.pointOfView();
        globe.pointOfView({ ...currentView, altitude: config.defaultAltitude }, 1000);
      }

      // Load polygon layer with error handling
      fetch('/ne_110m_admin_0_countries.geojson')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch countries.geojson');
          return res.json();
        })
        .then(countriesGeojson => {
          const validGeojson = countriesGeojson.features.filter(f =>
            f.geometry !== null && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
          );

          globe
            .polygonsData(validGeojson)
            .polygonGeoJsonGeometry(d => d.geometry)
            .polygonCapColor(() => 'rgb(240, 240, 240)')
            .polygonSideColor(() => 'rgb(243,243,243)')
            .polygonStrokeColor(() => '#aaa')
            .onPolygonClick((polygon, event) => {
              event.stopPropagation();
              countryName = polygon.properties.ADMIN || polygon.properties.NAME;
              const center = getPolygonCenter(polygon.geometry);

              if (selectedCountry !== countryName) {
                  selectedCountry = countryName;
                  isZoomedIn = true;
                  globe.controls().autoRotate = false;
                  globe.pointOfView({ lat: center.lat, lng: center.lng, altitude: config.zoomAltitude }, 2000);
              } else if (selectedCountry === countryName && isZoomedIn) {
                  isZoomedIn = false;
                  selectedCountry = null;
                  resetView();
              }
              countryName = null;
              applyTableauFilter(countryName);
            })
            .onPolygonHover((polygon) => {
                if (hoveredPolygon) {
                  hoveredPolygon.__previousColor = hoveredPolygon.__previousColor || 'rgb(240, 240, 240)';
                }           

                hoveredPolygon = polygon;
            
                globe
                  .polygonCapColor(d => (d === polygon ? hoverColor : d.__previousColor || 'rgb(240, 240, 240)'))
                  .polygonsTransitionDuration(200);

                if (polygon && polygon.properties) {
                  const countryName = polygon.properties.ADMIN || polygon.properties.NAME;
                  console.log("countryName ", countryName);

                  const countryData = data.find(d => { 
                    const countryFiled = config.country.toLowerCase();
                    if (d[countryFiled]) {
                      return d[countryFiled].toLowerCase() === countryName.toLowerCase()
                    }
                  });

                  if (!countryData) return;                  

                  currentTupleId = data.indexOf(countryData) + 1;

                  worksheet.hoverTupleAsync(currentTupleId, { 
                    tooltipAnchorPoint: { x: mousePosition.x, y: mousePosition.y }
                  })
                  .then(() => console.log('Tooltip shown for:', countryName))
                  .catch((error) => console.log('Error hovering:', error));
                }     
              })

            if (hasCountries) {
              const countryData = data.map(d => d[config.country]);
              globe.polygonsData(validGeojson.filter(f => countryData.includes(f.properties.ADMIN)));
            }
        })
        .catch(err => {
          console.error('Error loading polygons:', err);
        });

      // Mount the globe
      //globe();
      globeEl.current = globe;

      // rotation
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.2; 

      // Resize handler
      const handleResize = () => {
        if (containerRef.current && globeEl.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          globeEl.current.width(width);
          globeEl.current.height(height);
        }
      };
      window.addEventListener('resize', handleResize);
      handleResize(); // Initial resize

      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          console.log('Container resized:', width, height);
          globeEl.current.width(width);
          globeEl.current.height(height);
          globe.width(width).height(height);
        }
      });

      resizeObserver.observe(document.body);

      // Clean up
      return () => {
        if (globeEl.current) {
          globeEl.current._destructor();
        }
        window.removeEventListener('resize', handleResize);
        //clearInterval();
      };
    } catch (error) {
      console.error("GlobeViz error:", error);
      containerRef.current.innerHTML = `<p>Error rendering globe: ${error.message}</p>`;
    }
  }, [data, config]);

  function getPolygonCenter(geometry) {
    let latSum = 0, lngSum = 0, count = 0;

    if (geometry.type === 'Polygon') {
        geometry.coordinates[0].forEach(([lng, lat]) => {
            latSum += lat;
            lngSum += lng;
            count++;
        });
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
            polygon[0].forEach(([lng, lat]) => {
                latSum += lat;
                lngSum += lng;
                count++;
            });
        });
    }
    return { lat: latSum / count, lng: lngSum / count };
}

  const applyTableauFilter = (countryName) => {
    if (typeof tableau === 'undefined') {
      console.log('Tableau API not available');
      return;
    }

    if (worksheet) {
      worksheet.applyFilterAsync(
        'Country', // Adjust if your field name differs
        [countryName],
        tableau.FilterUpdateType.REPLACE
      ).then(() => {
        console.log(`Filter applied: ${countryName}`);
      }).catch(err => {
        console.error('Error applying filter:', err);
      });
    } else {
      console.error('Worksheet not found:');
    }
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
  );
};

export default GlobeViz;