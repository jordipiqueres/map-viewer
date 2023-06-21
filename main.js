import './style.css';
import {Map, View} from 'ol';
import Draw from 'ol/interaction/Draw.js';
import {fromLonLat, toLonLat} from 'ol/proj.js';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import Overlay from 'ol/Overlay.js';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ.js';
import TileWMS from 'ol/source/TileWMS.js';
import Feature from 'ol/Feature';
import {ScaleLine, defaults as defaultControls} from 'ol/control.js';
import {Icon, Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';
import VectorSource from 'ol/source/Vector';
import WKT from 'ol/format/WKT.js';
import {getArea, getLength} from 'ol/sphere.js';
import {unByKey} from 'ol/Observable.js';
import {LineString, Polygon} from 'ol/geom.js';
import { getFreeBestRoute, getNodesBestRoute, getIsochronous, createPointerIcon, createLine, getDifference, getWayPoints } from './utils';




// TODO: https://codepen.io/daksamedia/pen/gVPLGY


import {
  DragPan,
  defaults as defaultInteractions,
} from 'ol/interaction.js';

const measure = { active: false };
const marker = { from: [], to: [], isIsoChronous: false, 
  isFree: false,
  isNodes: true };

const cartoBasemap = new TileLayer({
  source: new XYZ({
    url:
      'http://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png' +
      '?apikey=Your API key from https://www.thunderforest.com/docs/apikeys/ here',
  }),
});


const cartoBasemapLabels = new TileLayer({
  source: new XYZ({
    url:
      'http://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png' +
      '?apikey=Your API key from https://www.thunderforest.com/docs/apikeys/ here',
  }),
});


const tilewms = new TileWMS({
  url: 'http://localhost/geoserver/topp/wms',
  params: {'LAYERS': 'topp:streets', 'TILED': true},
  serverType: 'geoserver',
  // Countries have transparency, so do not fade tiles:
  transition: 0,
});


const tilegeoserver =  new TileLayer({
  source: tilewms
});

const tilewmsescolar = new TileWMS({
  url: 'http://localhost/geoserver/topp/wms',
  params: {'LAYERS': 'topp:pinto_centros_educativos', 'TILED': true},
  serverType: 'geoserver',
  // Countries have transparency, so do not fade tiles:
  transition: 0,
});


const tilegeoserverescolar =  new TileLayer({
  source: tilewmsescolar
});

const tilewmseportales = new TileWMS({
  url: 'http://localhost/geoserver/topp/wms',
  params: {'LAYERS': 'topp:pinto_portales', 'TILED': true},
  serverType: 'geoserver',
  // Countries have transparency, so do not fade tiles:
  transition: 0,
});


const tilegeoserverportales =  new TileLayer({
  source: tilewmseportales
});


// estils
const styles = {
  'Point': new Style({
    image: new CircleStyle({
      fill: new Fill({
        color: 'rgba(100,100,100,.8)',
      }),
      radius: 6,
      stroke: new Stroke({
        color: '#00ff00',
        width: 2,
      }),
    }),
  }),
  'Polygon': new Style({
      fill: new Fill({
        color: 'rgba(20,20,100,.2)',
      }),
      stroke: new Stroke({
        color: 'rgba(20,20,100,1)',
        width: 2,
      }),
  }),
  'LineString': new Style({
    stroke: new Stroke({
      color: '#f00',
      width: 3,
      }),
    }),
   'MultiLineStringDashed': new Style({
      stroke: new Stroke({
        color: 'blue',
        lineDash: [4],
        width: 2
      })
    }),
  'MultiLineString': [
    new Style({
      stroke: new Stroke({
        color: '#666666',
        width: 4,
      })
    }),
    new Style({
      stroke: new Stroke({
        color: '#ff0000',
        width: 2,
      }),
    })
  ],
  'iconaRed': new Style({
    image: new Icon({
      anchor: [0.5,128],
      scale: 0.25,
      anchorXUnits: 'fraction',
      anchorYUnits: 'pixels',
      src: 'icons/location-red.png'
    })
  }),
  'iconaGrey': new Style({
    image: new Icon({
      anchor: [0.5,128],
      scale: 0.25,
      anchorXUnits: 'fraction',
      anchorYUnits: 'pixels',
      src: 'icons/location-blue.png'
    })
  })
};

/********************************************* */
const sourceMeasure = new VectorSource();

const vectorMeasure = new VectorLayer({
  source: sourceMeasure,
  style: {
    'fill-color': 'rgba(255, 255, 0, 0.2)',
    'stroke-color': '#ffcc33',
    'stroke-width': 2,
    'circle-radius': 7,
    'circle-fill-color': '#ffcc33',
  },
});


/**
 * Currently drawn feature.
 * @type {import("../src/ol/Feature.js").default}
 */
let sketch;

/**
 * The help tooltip element.
 * @type {HTMLElement}
 */
let helpTooltipElement;

/**
 * Overlay to show the help messages.
 * @type {Overlay}
 */
let helpTooltip;

/**
 * The measure tooltip element.
 * @type {HTMLElement}
 */
let measureTooltipElement;

/**
 * Overlay to show the measurement.
 * @type {Overlay}
 */
let measureTooltip;

/**
 * Message to show when the user is drawing a polygon.
 * @type {string}
 */
const continuePolygonMsg = 'Click to continue drawing the polygon';

/**
 * Message to show when the user is drawing a line.
 * @type {string}
 */
const continueLineMsg = 'Click to continue drawing the line';

/**
 * Handle pointer move.
 * @param {import("../src/ol/MapBrowserEvent").default} evt The event.
 */
const pointerMoveHandler = function (evt) {
  console.log('safas');
  if (evt.dragging) {
    return;
  }
  /** @type {string} */
  let helpMsg = 'Click to start drawing';

  if (sketch) {
    const geom = sketch.getGeometry();
    if (geom instanceof Polygon) {
      helpMsg = continuePolygonMsg;
    } else if (geom instanceof LineString) {
      helpMsg = continueLineMsg;
    }
  }

  helpTooltipElement.innerHTML = helpMsg;
  helpTooltip.setPosition(evt.coordinate);

  helpTooltipElement.classList.remove('hidden');
};

/*************************************************** */

// vectorSources
const vectorSourcePoints = new VectorSource({
  features: [],
  wrapX: false,
});


const vectorSourceStrings = new VectorSource({
  features: [],
  wrapX: false,
});

const vectorSourcePolygons = new VectorSource({
  features: [],
  wrapX: false,
});



const vectorSourcePathStrings = new VectorSource({
  features: [],
  wrapX: false,
});


const vectorSourceIconesFrom = new VectorSource({
  features: [],
  wrapX: false,
});


const vectorSourceIconesTo = new VectorSource({
  features: [],
  wrapX: false,
});


const layerPoints = new VectorLayer({
  source: vectorSourcePoints,
  style: styles.Point,
});


const layerIconesFrom = new VectorLayer({
  source: vectorSourceIconesFrom,
  style: styles.iconaRed,
});


const layerIconesTo = new VectorLayer({
  source: vectorSourceIconesTo,
  style: styles.iconaGrey
});


const layerStrings = new VectorLayer({
  source: vectorSourceStrings,
  style: styles.MultiLineString,
});

const layerPolygons = new VectorLayer({
  source: vectorSourcePolygons,
  style: styles.Polygon,
});


const layerPathStrings = new VectorLayer({
  source: vectorSourcePathStrings,
  style: styles.MultiLineStringDashed,
});

const scaleBarControl = new ScaleLine({
  units: 'metric'
});


const map = new Map({
  target: 'map',
  controls: defaultControls().extend([scaleBarControl]),
  layers: [
    cartoBasemap,
    tilegeoserver,
    tilegeoserverportales,
    tilegeoserverescolar,
    layerPolygons,
    layerPoints,
    layerStrings,
    layerPathStrings,
    cartoBasemapLabels,
    layerIconesFrom,
    layerIconesTo,
    vectorMeasure
  ],
  view: new View({
    center: [-412147.6362010007, 4926778.3203900475],
    zoom: 15
  })
});


// drag action
let dragPan;
map.getInteractions().forEach(function(interaction) {
  console.log('interaction');
  if (interaction instanceof DragPan) {
    dragPan = interaction;  
  }
});


const originMarkerElement = document.getElementById('originMarker');
const endMarkerElement = document.getElementById('endMarker');

const isocronaElement = document.getElementById('isocrona');
const nodesRouteElement = document.getElementById('routing_nodes');
const freeRouteElement = document.getElementById('routing_free');
const measureElement = document.getElementById('measure');
const cleanMeasuresElement = document.getElementById('measureClear');

// drag pin
isocronaElement.addEventListener('click', function(evt) {
  marker.isIsoChronous = true;
  marker.isFree = false;
  marker.isNodes = false;
  console.info('clicked');
});


// drag pin
nodesRouteElement.addEventListener('click', function(evt) {
  marker.isIsoChronous = false;
  marker.isFree = false;
  marker.isNodes = true;
  console.info('clicked');
});

// drag pin
freeRouteElement.addEventListener('click', function(evt) {
  marker.isIsoChronous = false;
  marker.isFree = true;
  marker.isNodes = false;
  console.info('clicked');
});

// drag pin
originMarkerElement.addEventListener('mousedown', function(evt) {
  dragPan.setActive(false);
  originMarker.set('dragging', true);
  console.info('start dragging');
});

// measure measure
measureElement.addEventListener('mousedown', function(evt) {
  measure.active = !measure.active;
  console.info('start measuring');
});

cleanMeasuresElement.addEventListener('mousedown', function(evt) {
  vectorMeasure.getSource().clear();
  map.getOverlays().clear();
  console.info('clean measuring');
});


// drag pin
endMarkerElement.addEventListener('mousedown', function(evt) {
  dragPan.setActive(false);
  markeendMarkerr.set('dragging', true);
  console.info('start dragging');
});


const originMarker = new Overlay({
  position: [],
  positioning: 'center-center',
  element: originMarkerElement,
  stopEvent: false,
  dragging: false
});


map.addOverlay(originMarker);


const endMarker = new Overlay({
  position: [],
  positioning: 'center-center',
  element: endMarkerElement,
  stopEvent: false,
  dragging: false
});


map.addOverlay(endMarker);




map.on('pointermove', function(evt) {

  if (measure.active) {
    console.log('pointermove actived for measuring');
    pointerMoveHandler(evt);
  } else {
    if (originMarker.get('dragging') === true) {
      originMarker.setPosition(evt.coordinate);
    }
    if (endMarker.get('dragging') === true) {
      endMarker.setPosition(evt.coordinate);
    }
  }
});


/************************************************ */

map.getViewport().addEventListener('mouseout', function () {
  helpTooltipElement.classList.add('hidden');
});

const typeSelect = document.getElementById('type');

let draw; // global so we can remove it later

/**
 * Format length output.
 * @param {LineString} line The line.
 * @return {string} The formatted length.
 */
const formatLength = function (line) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
  } else {
    output = Math.round(length * 100) / 100 + ' ' + 'm';
  }
  return output;
};

/**
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
const formatArea = function (polygon) {
  const area = getArea(polygon);
  let output;
  if (area > 10000) {
    output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
  } else {
    output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
  }
  return output;
};

function addInteraction() {
  const type = typeSelect.value == 'area' ? 'Polygon' : 'LineString';
  draw = new Draw({
    source: sourceMeasure,
    type: type,
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 0, 0.2)',
      }),
      stroke: new Stroke({
        color: 'rgba(255, 255, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
      }),
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
          color: 'rgba(255, 255, 0, 0.7)',
        }),
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
      }),
    }),
  });
  map.addInteraction(draw);

  createMeasureTooltip();
  createHelpTooltip();

  let listener;
  draw.on('drawstart', function (evt) {
    console.log('drawstart');
    // set sketch
    sketch = evt.feature;

    /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
    let tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on('change', function (evt) {
      const geom = evt.target;
      let output;
      if (geom instanceof Polygon) {
        output = formatArea(geom);
        tooltipCoord = geom.getInteriorPoint().getCoordinates();
      } else if (geom instanceof LineString) {
        output = formatLength(geom);
        tooltipCoord = geom.getLastCoordinate();
      }
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });
  });

  draw.on('drawend', function () {
    console.log('drawend');
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    unByKey(listener);
  });
}

/**
 * Creates a new help tooltip
 */
function createHelpTooltip() {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }
  helpTooltipElement = document.createElement('div');
  helpTooltipElement.className = 'ol-tooltip hidden';
  helpTooltip = new Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left',
  });
  map.addOverlay(helpTooltip);
}

/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
  measureTooltip = new Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false,
    insertFirst: false,
  });
  map.addOverlay(measureTooltip);
}

/**
 * Let user change the geometry type.
 */
typeSelect.onchange = function () {
  map.removeInteraction(draw);
  addInteraction();
};



/************************************************ */


map.on('pointerup', function(evt) {
  if (originMarker.get('dragging') === true) {
    console.info('stop dragging, coordinate' + evt.coordinate);
    dragPan.setActive(true);
    originMarker.set('dragging', false);
    // popup.show(evt.coordinate,'Latitude :'+evt.coordinate[0]+', Longitude :'+ evt.coordinate[1]);
  }
  if (endMarker.get('dragging') === true) {
    console.info('stop dragging, coordinate' + evt.coordinate);
    dragPan.setActive(true);
    endMarker.set('dragging', false);
    // popup.show(evt.coordinate,'Latitude :'+evt.coordinate[0]+', Longitude :'+ evt.coordinate[1]);
  }
});


// onclick ma
map.on('click', async function(evt) {
  console.log('hey')

  if (measure.active === true) {
    addInteraction();
    return;
  } else {
    // map.removeInteraction(draw);
  }
  if (!marker.isIsoChronous) {
    if (marker.from.length === 0) {
      marker.from = evt.coordinate;
      originMarker.setPosition(evt.coordinate);
      originMarker.set('dragging', false);
      console.log(marker.from, toLonLat(marker.from));
      const point = createPointerIcon(marker.from);
      console.log(point);


      if (layerIconesFrom.getSource().getFeatures().length > 0) {
        layerIconesFrom.getSource().clear();
      }
      layerIconesFrom.getSource().addFeature(point);


    } else {
      marker.to = evt.coordinate;
      endMarker.setPosition(evt.coordinate);
      endMarker.set('dragging', false);
      console.log(marker.to, toLonLat(marker.to));
      const endpoint = createPointerIcon(marker.to);
    
      if (layerIconesTo.getSource().getFeatures().length > 0) {
        layerIconesTo.getSource().clear();
      }
      layerIconesTo.getSource().addFeature(endpoint);


      let routeData; // = await getBestRoute(toLonLat(marker.from).toString(), toLonLat(marker.to).toString());

      if (marker.isFree) {
        routeData = await getFreeBestRoute(toLonLat(marker.from).toString(), toLonLat(marker.to).toString());
      } else {
        routeData = await getNodesBestRoute(toLonLat(marker.from).toString(), toLonLat(marker.to).toString());
      }

      const points1 = await getWayPoints(toLonLat(marker.from).toString());
      const points2 = await getWayPoints(toLonLat(marker.to).toString());


      const routeGeomWKT = routeData.data[0].geom;
      const routeGeomWKT1 = points1.data[0].geom;
      const routeGeomWKT2 = points2.data[0].geom;

      if (!routeGeomWKT) {
        marker.from = [];
        marker.to = [];
      }

      try {
      const format = new WKT();
      const feature = format.readFeature(routeGeomWKT, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });

      const feature1 = format.readFeature(routeGeomWKT1, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });

      const feature2 = format.readFeature(routeGeomWKT2, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });
      layerStrings.getSource().clear();
      layerStrings.getSource().addFeature(feature);

      layerPoints.getSource().clear();
      layerPoints.getSource().addFeature(feature1);
      layerPoints.getSource().addFeature(feature2);
    } catch (error) {
      console.log(error);
      layerStrings.getSource().clear();
      layerPoints.getSource().clear();
      layerPathStrings.getSource().clear();
      layerPolygons.getSource().clear();
    }

      




      // const geom = feature.getGeometry().getCoordinates();
      // const firstCoord = geom[0];
      // const lastCoord = geom[geom.length - 1];


      const test = layerStrings.getSource();
      const feat = test.getClosestFeatureToCoordinate(marker.from);
      // const feat2 = feat.getFirstCoordinate();
      const firstCoord = feat.getGeometry().getClosestPoint(marker.from);
      const lastCoord = feat.getGeometry().getClosestPoint(marker.to);


      const arrayOrig = [marker.from, firstCoord];
      const arrayDest = [lastCoord, marker.to];
      const featOrig = createLine(arrayOrig);
      const featDest = createLine(arrayDest);
      layerPathStrings.getSource().clear();
      layerPolygons.getSource().clear();
      layerPathStrings.getSource().addFeature(featOrig);
      layerPathStrings.getSource().addFeature(featDest);






      marker.from = [];
      marker.to = [];
    }
  
  
    originMarker.set('dragging', false);
    endMarker.set('dragging', false);
  } else {
    // it is isochronous

    originMarker.setPosition(evt.coordinate);
    originMarker.set('dragging', false);
    const center = evt.coordinate;
    console.log(center);
    const point = createPointerIcon(center);
    console.log(point);


    if (layerIconesFrom.getSource().getFeatures().length > 0) {
      layerIconesFrom.getSource().clear();
    }
    layerIconesFrom.getSource().addFeature(point);
    layerPathStrings.getSource().clear();
    layerStrings.getSource().clear();
    layerPolygons.getSource().clear();

    
    const format = new WKT();
    

    const colors = [
      'rgba(242, 211, 73, 0.8)	',
      'rgba(217, 199, 83, 0.8)	',
      'rgba(193, 188, 93, 0.8)	',
      'rgba(169, 176, 103, 0.8)	',
      'rgba(145, 165, 113, 0.8)	',
      'rgba(120, 153, 123, 0.8)	',
      'rgba(96, 142, 133, 0.8)	',
      'rgba(72, 130, 143, 0.8)	',
      'rgba(48, 119, 153, 0.8)	',
      'rgba(24, 108, 163, 0.8)	',
  ];

  const colorsBorder = [
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
      'rgba(80, 80, 80, 0.8)	',
];

  const polRed = new Style({
    fill: new Fill({
      color: 'rgba(180,20,20,.4)',
    }),
    stroke: new Stroke({
      color: 'rgba(180,20,20,1)',
      width: 2,
    }),
});

  const polYellow = new Style({
    fill: new Fill({
      color: 'rgba(180,180,20,.4)',
    }),
    stroke: new Stroke({
      color: 'rgba(180,180,20,1)',
      width: 2,
    }),
});

  const polGreen = new Style({
    fill: new Fill({
      color: 'rgba(20,180,20,.4)',
    }),
    stroke: new Stroke({
      color: 'rgba(20,180,20,1)',
      width: 2,
    }),
});

const colorVariable = (color, colorsBorder) => {
  return new Style({
    fill: new Fill({
      color: color,
    }),
    stroke: new Stroke({
      color: colorsBorder,
      width: 1,
    }),
  });
}

/*
let [isochronousData1, isochronousData2, isochronousData3, isochronousData4, isochronousData5] = await Promise.all([
  getIsochronous(toLonLat(center).toString(), 600), 
  getIsochronous(toLonLat(center).toString(), 480),
  getIsochronous(toLonLat(center).toString(), 360),
  getIsochronous(toLonLat(center).toString(), 240),
  getIsochronous(toLonLat(center).toString(), 120)
]);


  colors.reverse();
  colorsBorder.reverse();
  //const isochronousData1 = await getIsochronous(toLonLat(center).toString(), 900);
  let routeGeomWKT = isochronousData1.data[0].geom;
  let feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });

  feature.setStyle(colorVariable(colors[0], colorsBorder[0]))
  layerPolygons.getSource().addFeature(feature);

*/


  

  //const isochronousData2 = await getIsochronous(toLonLat(center).toString(), 600);

  let isochronousData1 =  await getDifference(toLonLat(center).toString());
  let data = isochronousData1.data;
  console.log(data);
  let routeGeomWKT = data[0].geom;
  let feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[0], colorsBorder[0]))
  layerPolygons.getSource().addFeature(feature);

  routeGeomWKT = data[1].geom;
  feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[1], colorsBorder[1]))
  layerPolygons.getSource().addFeature(feature);

  routeGeomWKT = data[2].geom;
  feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[2], colorsBorder[2]))
  layerPolygons.getSource().addFeature(feature);

  routeGeomWKT = data[3].geom;
  feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[3], colorsBorder[3]))
  layerPolygons.getSource().addFeature(feature);

  routeGeomWKT = data[4].geom;
  feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[4], colorsBorder[4]))
  layerPolygons.getSource().addFeature(feature);

  routeGeomWKT = data[5].geom;
  feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[5], colorsBorder[5]))
  layerPolygons.getSource().addFeature(feature);

  routeGeomWKT = data[6].geom;
  feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[6], colorsBorder[6]))
  layerPolygons.getSource().addFeature(feature);

  routeGeomWKT = data[7].geom;
  feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[7], colorsBorder[7]))
  layerPolygons.getSource().addFeature(feature);

  routeGeomWKT = data[8].geom;
  feature = format.readFeature(routeGeomWKT, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  
  feature.setStyle(colorVariable(colors[8], colorsBorder[8]))
  layerPolygons.getSource().addFeature(feature);

  }
});
