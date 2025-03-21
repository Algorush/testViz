document.addEventListener('DOMContentLoaded', () => {

    const globe = new Globe(document.getElementById('globe-container'))
    .backgroundColor('#f5f5f5') // Светлый фон
    .pointOfView({ altitude: 3 }, 3000)
    .polygonCapColor(() => 'rgb(240, 240, 240)') // Матовые полигоны
    .polygonSideColor(() => 'rgb(200, 200, 200)')
    .polygonStrokeColor(() => '#aaa') // Нежный контур
    .showAtmosphere(false) // Отключаем атмосферу для чистого вида
    .pointOfView({ lat: 30, lng: -90, altitude: 2 })
    .pointLat('lat')
    .pointLng('lng')
    .pointRadius(0.3) // Flat circle size
    .pointColor(() => '#ff6200') // Orange circles
    .pointsMerge(false); // Disable merging for distinct circles

    // // Добавляем освещение для мягких теней
    // const renderer = globe.renderer();
    // renderer.shadowMap.enabled = true;

    // Загрузка GeoJSON
    fetch('/ne_110m_admin_0_countries.geojson')
    .then(res => {
        if (!res.ok) throw new Error('Ошибка загрузки countries.geojson');
        return res.json();
    })
    .then(countriesGeojson => {
        console.log("GeoJSON загружен:", countriesGeojson);
    
        // Фильтруем только допустимые геометрии
        const validGeojson = countriesGeojson.features.filter(f =>
            f.geometry !== null && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
        );
    
        // Отображаем полигоны на глобусе
        globe
            .polygonsData(validGeojson)
            //.polygonGeoJsonGeometry(d => d.geometry)
            //.polygonAltitude(0.01)
            .onPolygonClick((polygon) => {
                const countryName = polygon.properties.ADMIN || polygon.properties.NAME;
                console.log("Выбрана страна:", countryName);
                applyTableauFilter(countryName);
            })
            .onPolygonHover((polygon) => {
                // Изменение цвета полигона при наведении
            });
    })
    .catch(err => {
        console.error('Ошибка загрузки полигонов:', err);
    });
    
    function applyTableauFilter(country) {
    alert("Фильтр по стране: " + country);
    }


    const controls = globe.controls();
    controls.autoRotate = true; // Включаем авто-вращение
    controls.autoRotateSpeed = 1.2; 

    // const world = new Globe(document.getElementById('globe-container'))
    //   .globeImageUrl('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg')
    //   .pointOfView({ altitude: 4 }, 5000)
    //   .polygonCapColor(feat => 'rgba(200, 0, 0, 0.6)')
    //   .polygonSideColor(() => 'rgba(0, 100, 0, 0.05)')
    //   .polygonLabel(({ properties: d }) => `
    //       <b>${d.ADMIN} (${d.ISO_A2})</b> <br />
    //       Population: <i>${Math.round(+d.POP_EST / 1e4) / 1e2}M</i>
    //     `);

    // Auto-rotate
    // world.controls().autoRotate = true;
    // world.controls().autoRotateSpeed = 1.8;

    // fetch('/dist/countries.geojson').then(res => res.json()).then(countries => {
    //   world.polygonsData(countries.features.filter(d => d.properties.ISO_A2 !== 'AQ'));

    //   setTimeout(() => world
    //     .polygonsTransitionDuration(4000)
    //     .polygonAltitude(feat => Math.max(0.1, Math.sqrt(+feat.properties.POP_EST) * 7e-5))
    //   , 3000);
    // });

});
