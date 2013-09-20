# Overview
This library allows you to turn any div into a map.  It exposes an abstract layer of functionality for which engines are responsible for implementing the actual functionality.


# Included Engines
* Google Maps
* ESRI Maps

# Functions 
init = function(opts)

addPin = function(opts)

removePin = function(opts)

addEsriLayer = function(opts)

removeEsriLayer = function(opts)

addKmlLayer = function(opts)

removeKmlLayer = function(opts)

addGeometryLayer = function(opts)

removeGeometryLayer = function(opts)

redraw = function(opts) 

reset = function(opts) 

zoom = function(opts) 

zoomToLocation = function (opts) 

center = function(opts)

draw = function(opts) 

engine = function(opts) 

supportedEngines = function()

map = function()

getEarthRadius = function(opts)

radiansToDegrees = function(opts)

degreesToRadians = function(opts)

getLocation = function(successCallback, errorCallback)
