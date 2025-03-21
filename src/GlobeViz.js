import React, { useEffect, useRef } from 'react';
import Globe from 'globe.gl';
import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

const GlobeViz = ({ data, config }) => {
  const globeEl = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) {
      containerRef.current.innerHTML = '<p>No data available to render the globe.</p>';
      return;
    }

    let globe;
    let isZoomedIn = false; 
    let selectedCountry = null;
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error('WebGL context could not be created');
      }

      // Initialize globe
      globe = Globe({ contextOptions: { webgl2: false } })
        .showAtmosphere(false)
        .backgroundColor('#f5f5f5')
        .pointOfView({ lat: 30, lng: -90, altitude: 2 })
        .pointsData(data)
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius(0.3) // Flat circle size
        .pointColor(() => '#ff6200') // Orange circles
        .pointAltitude(0.011) // Flat on surface
        .pointsMerge(false); // Disable merging for distinct circles

      // Optional size scaling
      if (config.sizeField) {
        const sizes = data.map(d => parseFloat(d[config.sizeField]));
        const minSize = Math.min(...sizes);
        const maxSize = Math.max(...sizes);
        const sizeScale = scaleLinear()
          .domain([minSize, maxSize])
          .range([0.2, 0.8]);
        globe.pointRadius(d => sizeScale(parseFloat(d[config.sizeField])));
      }

      document.addEventListener('click', event => {
          if (!event.target.closest('canvas')) return;
          if (!selectedCountry) return;
          resetView();
      });

      function resetView() {
        globe.controls().autoRotate = true;
        const currentView = globe.pointOfView();
        globe.pointOfView({ ...currentView, altitude: 3 }, 1000);
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
            .polygonSideColor(() => 'rgb(200, 200, 200)')
            .polygonStrokeColor(() => '#aaa')
            .polygonLabel(d => d.properties.ADMIN)
            .onPolygonClick((polygon) => {
              const countryName = polygon.properties.ADMIN || polygon.properties.NAME;
              const center = getPolygonCenter(polygon.geometry);

              if (!isZoomedIn || (selectedCountry !== countryName)) {
                selectedCountry = countryName;
                globe.controls().autoRotate = false;
                globe.pointOfView({ lat: center.lat, lng: center.lng, altitude: 0.7 }, 2000);
              } else if (selectedCountry === countryName) {
                  resetView();
              }
              isZoomedIn = !isZoomedIn;

              applyTableauFilter(countryName);
            });
        })
        .catch(err => {
          console.error('Error loading polygons:', err);
        });

      // Mount the globe
      globe(containerRef.current);
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

      // Clean up
      return () => {
        if (globeEl.current) {
          globeEl.current._destructor();
        }
        window.removeEventListener('resize', handleResize);
        clearInterval(rotationInterval);
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

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const worksheet = dashboard.worksheets.find(ws => ws.name === config.worksheetName);
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
      console.error('Worksheet not found:', config.worksheetName);
    }
  };

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default GlobeViz;