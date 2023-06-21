

import Feature from 'ol/Feature';
import {LineString, MultiLineString, Point} from 'ol/geom';
import {Icon, Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style';


const request = (url) => {
    return new Promise((resolve, reject) => {
        
        fetch(url)
        .then(response => {
          if (!response.ok) {
            reject(new Error('Error al obtener los datos'));
            // throw new Error('Error al obtener los datos');
          }
          return response.json();
        })
        .then(data => {
          console.log(data);
          resolve(data);
        })
        .catch(error => {
          console.error(error);
          reject(new Error(error));
        });
     
    });
  };


  const createPointerIcon = function(coordinates) {


    const iconFeature = new Feature(
          new Point(coordinates)
      );
 
    //const iconStyle = new Style(style);
 
    // iconFeature.setStyle(iconStyle);


    //layer.getSource().clear();
    //layer.getSource().addFeature(iconFeature);
 
    return iconFeature;
  };


  const createLine = function(coordinates) {


    const iconFeature = new Feature(
      new LineString(coordinates)
      );
 
    //const iconStyle = new Style(style);
 
    // iconFeature.setStyle(iconStyle);


    //layer.getSource().clear();
    //layer.getSource().addFeature(iconFeature);
 
    return iconFeature;
  };




const getFreeBestRoute = async (origin, destination) => {

    const url = `http://localhost:3000/routes/freeroute?from=${origin}&to=${destination}`;
    const result = await request(url);
    console.log(result);
    return result;
}

const getNodesBestRoute = async (origin, destination) => {

  const url = `http://localhost:3000/routes/nodesroute?from=${origin}&to=${destination}`;
  const result = await request(url);
  console.log(result);
  return result;
}

const getIsochronous = async (origin, time) => {

    const url = `http://localhost:3000/routes/isocrones?center=${origin}&time=${(time ?? 300)}`;
    const result = await request(url);
    console.log(result);
    return result;
}

const getDifference = async (origin, time) => {

  const url = `http://localhost:3000/routes/difference?center=${origin}&time=${(time ?? 300)}`;
  const result = await request(url);
  console.log(result);
  return result;
}


const getWayPoints = async (origin, buffer) => {

  const url = `http://localhost:3000/routes/waypoints?center=${origin}&buffer=${(buffer ?? 250)}`;
  const result = await request(url);
  console.log(result);
  return result;
}


export  { getFreeBestRoute, getNodesBestRoute, getWayPoints, getIsochronous, createPointerIcon, createLine, getDifference }