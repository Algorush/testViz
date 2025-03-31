import React, { useEffect, useRef } from 'react';
import Globe from 'globe.gl';

const GlobeViz = ({ data, config }) => {
  const globeEl = useRef();
  const containerRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) {
      containerRef.current.innerHTML = '<p>No data available to render the globe.</p>';
      return;
    }

    let isZoomedIn = false;
    let selectedCountry = null;
    let countryName = null;

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error('WebGL context could not be created');
      }

      // Initialize globe
      const globe = new Globe(containerRef.current)
        .showAtmosphere(true)
        .backgroundColor('#f5f5f5')
        .pointOfView({ lat: 30, lng: -90, altitude: 2 });

      // Add point markers if coordinates are present in data
      if (data.some(d => d.lat !== undefined && d.lng !== undefined)) {
        globe
          .pointsData(data)
          .pointLat(d => d.lat)
          .pointLng(d => d.lng)
          .pointRadius(() => 0.3)
          .pointColor(() => '#ff6200')
          .pointAltitude(() => 0.01)
          .pointsMerge(false);
      }

      document.addEventListener('click', event => {
        if (!event.target.closest('canvas')) return;
        if (countryName) return;
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
            .onPolygonClick((polygon, event) => {
              event.stopPropagation();
              countryName = polygon.properties.ADMIN || polygon.properties.NAME;
              const center = getPolygonCenter(polygon.geometry);

              if (selectedCountry !== countryName) {
                selectedCountry = countryName;
                isZoomedIn = true;
                globe.controls().autoRotate = false;
                globe.pointOfView({ lat: center.lat, lng: center.lng, altitude: 0.7 }, 2000);
              } else {
                isZoomedIn = false;
                selectedCountry = null;
                resetView();
              }
              countryName = null;
            });
        })
        .catch(err => {
          console.error('Error loading polygons:', err);
        });

      globeEl.current = globe;
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.2;

      const handleResize = () => {
        if (containerRef.current && globeEl.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          globeEl.current.width(width);
          globeEl.current.height(height);
        }
      };
      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        if (globeEl.current) {
          globeEl.current._destructor();
        }
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('GlobeViz error:', error);
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

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default GlobeViz;
