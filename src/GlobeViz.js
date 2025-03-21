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
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error('WebGL context could not be created');
      }

      // Initialize globe
      globe = Globe({ contextOptions: { webgl2: false } })
        .globeImageUrl('/images/earth-day.png')
        .backgroundColor('#ffffff')
        .pointOfView({ lat: 30, lng: -90, altitude: 2 })
        .pointsData(data)
        .pointLat('lat')
        .pointLng('lng')
        .pointRadius(0.3) // Flat circle size
        .pointColor(() => '#ff6200') // Orange circles
        .pointAltitude(0) // Flat on surface
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

      // Load polygon layer with error handling
      fetch('/countries.geojson')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch countries.geojson');
          return res.json();
        })
        .then(countriesGeojson => {
          console.log("GeoJSON загружен:", countriesGeojson);
          if (!countriesGeojson.features || !Array.isArray(countriesGeojson.features)) {
            throw new Error("Неверный формат GeoJSON (нет features)");
          }
      
          const firstFeature = countriesGeojson.features[0];
          console.log("Первая геометрия:", firstFeature.geometry);
      
          globe
            .polygonsData(countriesGeojson.features)
            .polygonGeojsonGeometry(d => d.geometry || console.error("Ошибка: нет geometry в", d))
            .polygonCapColor(() => 'rgba(0, 0, 0, 0.2)') // Slightly more visible
            .polygonSideColor(() => 'rgba(0, 0, 0, 0.4)')
            .polygonStrokeColor(() => '#666666')
            .polygonAltitude(0.01) // Minimal elevation
            .onPolygonClick((polygon) => {
              const countryName = polygon.properties.ADMIN || polygon.properties.NAME;
              applyTableauFilter(countryName);
            });
        })
        .catch(err => {
          console.error('Error loading polygons:', err);
        });

      // Mount the globe
      globe(containerRef.current);
      globeEl.current = globe;

      // Faster rotation
      let currentLng = -90;
      const rotationInterval = setInterval(() => {
        currentLng = (currentLng + 2) % 360; // 20°/s
        globe.pointOfView({
          lat: 30,
          lng: currentLng,
          altitude: 2
        });
      }, 100);

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