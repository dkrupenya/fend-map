## Overview

The App is based on [Web Starter Kit](https://developers.google.com/web/starter-kit) boilerplate.
The app shows nearest pubs using data from foursquare API.

## How to run project
Open ``index.html`` from dist folder. You can open this file in browser or configure any simple [http-server](https://github.com/indexzero/http-server).

## How to build project from sources
* clone repository
* install node 4.5.0
* install gulp ``npm install -g gulp``
* open project folder and execute ``npm install`` command
* execute ``gulp`` command
* open ``index.html`` from dist folder.

These steps were tested under Ubuntu 16.04. Seems it should work on Mac but I'm not sure about Windows.

## Quickstart
When you open the app you will see some markers on a map and a list with places in side panel.
You can click on map markers and menu list items to observe place details.
Search allows you to filter the markers list.

If you don't see any markers on the map, please, pan the map to a nearest town. 
The markers will not be loaded if the map is too zoomed out, because it can exceed my API request limits.

#### Note
Requirements demand me to hardcode some data but it breaks a concept of this application. 
This app should dynamically load nearest places and later I will add functionality to observe who else can be looking for a bar near you.   

## License
Apache 2.0  
