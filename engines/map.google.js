(function(MapEngine, window, undefined) {
	var GoogleEngineDefaults = $.extend(true, {}, window.MapEngineDefaults, {
		map : {
			center : {
				lat : 39.8282, 
				lon : -98.5795,
			},
			type : google.maps.MapTypeId.ROADMAP,
			zoom : 5,
			panControl : {
				visible : true,
				position : google.maps.ControlPosition.RIGHT_TOP,
			},
			zoomControl : {
				visible : true,
		    	style: google.maps.ZoomControlStyle.LARGE,
				position : google.maps.ControlPosition.RIGHT_TOP,
			}
		}, 
		pin : {
			clickable : true,
			draggable : true,
			position : {
				lat : 0,
				lon : 0,
			},
			icon : null,
			callbacks : {
				click : null,
				dragstart : null,
				dragend : null,
				drag : null,
				mousedown : null,
				mouseout : null,
				mouseover : null,
				mouseup : null,
			},
		},
		geometry : {
			outline : {
				color : [255, 0, 0, 1],
				stroke : 2,
			},
			fill : {
				color : [255, 0, 0, .2],
			}
		}
	});


	/** 
	 * Private helper function 
	 * Convert RGB color array to 'rgb(x,y,z)'
	 */
	var toRgbString = function(colorArray){
		return "rgb($1,$2,$3)"
					.replace("$1", colorArray[0])
					.replace("$2", colorArray[1])
					.replace("$3", colorArray[2]);
	}

	/** 
	 * Private helper function 
	 * Convert RGBa color array to 'rgb(x,y,z, a)'
	 */
	var toRgbaString = function(colorArray){
		return "rgba($1,$2,$3,$4)"
					.replace("$1", colorArray[0])
					.replace("$2", colorArray[1])
					.replace("$3", colorArray[2])
					.replace("$4", colorArray[3]);
	}

	var geoJSONToOverlay = function(geoJSON, options){
		return new GeoJSON(geoJSON, options);
	}

	var overlayToGeoJSON = function(overlay, type){

		var geoJSONType = null;
		var coordinates = [];
		switch(type){
			case google.maps.drawing.OverlayType.CIRCLE: {
				geoJSONType = "Polygon";
				var resolution = 75;
				var circleLat = (overlay.getRadius() / 3963189) / (Math.PI / 180);
				var circleLng = circleLat / Math.cos( overlay.getCenter().lat() * (Math.PI / 180));
			 
				// 2PI = 360 degrees, +1 so that the end points meet
				for (var i = 0; i < resolution; i++) { 
					var theta = Math.PI * (i / (resolution / 2)); 
					var vertexLat =  overlay.getCenter().lat() + (circleLat * Math.sin(theta)); 
					var vertexLng =  overlay.getCenter().lng() + (circleLng * Math.cos(theta));
					coordinates.push( [ vertexLng, vertexLat ] );
				}
				coordinates.push(coordinates[0]);
				coordinates = [ coordinates ];
				break;
			}
			case google.maps.drawing.OverlayType.MARKER: {
				geoJSONType = "Point";
				coordinates = [overlay.getPosition().lng(), overlay.getPosition().lat()];
				break;
			}
			case google.maps.drawing.OverlayType.POLYGON: {
				geoJSONType = "Polygon";
				var path = overlay.getPath().forEach(function(element, index){
					coordinates.push([element.lng(), element.lat()]);
				});
				coordinates.push(coordinates[0]);
				coordinates = [ coordinates ];
				break;
			}
			case google.maps.drawing.OverlayType.POLYLINE: {
				geoJSONType = "LineString";
				var path = overlay.getPath().forEach(function(element, index){
					coordinates.push([element.lng(), element.lat()]);
				});
				break;
			}
			case google.maps.drawing.OverlayType.RECTANGLE: {
				geoJSONType = "Polygon";
				var boundsSW = overlay.getBounds().getSouthWest();
				var boundsNE = overlay.getBounds().getNorthEast();
				var nw = [boundsSW.lng(), boundsNE.lat()];
				var ne = [boundsNE.lng(), boundsNE.lat()];
				var se = [boundsNE.lng(), boundsSW.lat()];
				var sw = [boundsSW.lng(), boundsSW.lat()];
				coordinates = [ coordinates.concat(nw,ne,se,sw) ];
				break;
			}
		}
		var geoJSON = {
			type : geoJSONType,
			coordinates : coordinates,
		}

		console.log(geoJSON);
		window.test = geoJSON;
		return geoJSON;
	}

	MapEngine.Google = function(mapDiv, options, engineOptions){
		// Instance variables
		this._map = null;
		this._mapDiv = mapDiv;
		this._drawingManager = null;
		this._pins = {};
		this._esriLayers = {};
		this._kmlLayers = {};
		this._geometryLayers = {};

		var defaultEngineOptions = {
			zoom: GoogleEngineDefaults.map.zoom,
			center: new google.maps.LatLng(GoogleEngineDefaults.map.center.lat,GoogleEngineDefaults.map.center.lon),
			mapTypeId: GoogleEngineDefaults.map.type,
		    panControl: GoogleEngineDefaults.map.panControl.visible,
		    panControlOptions: {
		    	position: GoogleEngineDefaults.map.panControl.position,
		    },
		    zoomControl: GoogleEngineDefaults.map.zoomControl.visible,
		    zoomControlOptions: {
		    	style: GoogleEngineDefaults.map.zoomControl.style,
		    	position: GoogleEngineDefaults.map.zoomControl.position,
		    },
		};
		engineOptions = $.extend(true, {}, defaultEngineOptions, engineOptions);

		this._map = new google.maps.Map(mapDiv, engineOptions);
	}

	/**
	 * Add a pin to the map 
	 * Returns the added pin object 
	 * fnOptions - object, see Esri defaults above (GoogleEngineDefaults.pin)
	 */
	MapEngine.Google.prototype.addPin = function(options, pinOptions){
		var _t = this;
		var pinOptions = $.extend(true, {}, GoogleEngineDefaults.pin, pinOptions);
		var marker = new google.maps.Marker();

		if(pinOptions.icon){
	        var icon = {};
	        icon.url = pinOptions.icon.url;
	        icon.size = new google.maps.Size(pinOptions.icon.size.width,pinOptions.icon.size.height);
	        if(pinOptions.icon.scaledSize)
	        	icon.scaledSize = new google.maps.Size(pinOptions.icon.scaledSize.width,pinOptions.icon.scaledSize.height);
	        if(pinOptions.icon.origin)
	            icon.origin = new google.maps.Point(pinOptions.icon.origin.x, pinOptions.icon.origin.y);
	        if(pinOptions.icon.anchor)
	            icon.anchor = new google.maps.Point(pinOptions.icon.anchor.x,pinOptions.icon.anchor.y);
	        marker.setIcon(icon);
	    }
		marker.setMap(this._map);
		marker.setDraggable(pinOptions.draggable);
		marker.setClickable(pinOptions.clickable);
		marker.setPosition(new google.maps.LatLng(pinOptions.position.lat, pinOptions.position.lon));

		$.each(pinOptions.callbacks, function(evt, callback){
			if(!callback) return;
			google.maps.event.addListener(marker, evt, function(evt){
				callback.call(_t, evt, pinOptions);
			});
		});

		this._pins[pinOptions.id] = marker;
	}

	/**
	 * fnOptions - object
	 * 	.id - ID of pin to remove 
	 */
	MapEngine.Google.prototype.removePin = function(options, fnOptions){
		this._pins[fnOptions.id].setMap(null);
		delete this._pins[fnOptions.id];
	}

	/**
	 * Google maps does not support adding proprietary ESRI Layers 
	 */
	MapEngine.Google.prototype.addEsriLayer = function(options, fnOptions){
		console.warn("Function not supported");
	}

	MapEngine.Google.prototype.removeEsriLayer = function(options, layer){
		console.warn("Function not supported");
	}

	MapEngine.Google.prototype.addKmlLayer = function(options, fnOptions){
		var url = fnOptions.url;
		var layer = new google.maps.KmlLayer({
			url: url,
			preserveViewport: true,
		});
		layer.setMap(this._map);

		this._kmlLayers[fnOptions.id] = layer;
	}

	/**
	 * fnOptions - object
	 * 	.id - ID of kml layer to remove 
	 */
	MapEngine.Google.prototype.removeKmlLayer = function(options, fnOptions){
		this._kmlLayers[fnOptions.id].setMap(null);
		delete this._kmlLayers[fnOptions.id];
	}

	/**
	* map - The google map object
	* options - the global library options
	* fnOptions - the function arguments
	*	.region - the postgis geometry
	*	.options - the rendering options
	*		.fill - the fill options
	*			.color - the color [r,g,b,a]
	*		.outline - the outline options
	*			.color - the color [r,g,b,a]
	*			.stroke - the width 
	* Returns the geometry as an array of shapes
	**/
	MapEngine.Google.prototype.addGeometryLayer = function(options, fnOptions){
		var _t = this;
		var region = fnOptions.region;
		var geomOptions = $.extend(true, {}, GoogleEngineDefaults.geometry, fnOptions.options);

		var polyOptions = {
		    strokeColor: toRgbString(geomOptions.outline.color),
		    strokeOpacity: geomOptions.outline.color[3] || 0,
		    strokeWeight: geomOptions.outline.stroke,
		    fillColor: toRgbString(geomOptions.fill.color),
		    fillOpacity: geomOptions.fill.color[3] || 0,
		}

		if(fnOptions.geoJSON){
			var shapes = geoJSONToOverlay(region, polyOptions);
			console.log(shapes);
			if(typeof shapes.length === 'undefined'){
				shapes.setMap(_t._map);
			} else {
				$.each(shapes, function(i, shape){
					if(typeof shape.length === 'undefined')
						shape.setMap(_t._map);
					else {
						$.each(shape, function(i, _shape){
							_shape.setMap(_t._map);		
						})
					}
				});
			}
		} else {
			var shapes = [];
			$.each(region.coordinates, function(i, subpolies){
				var paths = [];

				$.each(subpolies, function(i, subpoly){
					var path = [];
					$.each(subpoly, function(i, coordinate){
						path.push(new google.maps.LatLng(coordinate[1],coordinate[0]));
					});
					paths.push(path);
				});

				polyOptions.paths = paths;
				var shape = new google.maps.Polygon(polyOptions);
				shape.setMap(_t._map);
				shapes.push(shape);
			});
		}
	}

	/**
	 * fnOptions - object
	 * 	.id - ID of geometry layer to remove 
	 */
	MapEngine.Google.prototype.removeGeometryLayer = function(options, fnOptions){
		$.each(this._geometryLayers[fnOptions.id], function(i, shape){
			shape.setMap(null);
		});
		delete this._geometryLayers[fnOptions.id];
	}

	/*
	 * Nothing to do here
	 */
	MapEngine.Google.prototype.redraw = function(options, fnOptions) {
	}

	/**
	 * Reset implementation level state information 
	 */
	MapEngine.Google.prototype.reset = function(options, fnOptions) {
		this._pins = {};
		this._kmlLayers = {};
		this._esriLayers = {};
		this._geometryLayers = {};
	}

	/**
	 * If fnOptions is set, set the zoom.  
	 * If fnOptions is null, return the zoom 
	 * fnOptions - numeric zoom level 
	 */
	MapEngine.Google.prototype.zoom = function(options, fnOptions) {
		if(fnOptions){
			this._map.setZoom(fnOptions);
			return fnOptions;
		}
		return this._map.getZoom();
	}

	/**
	 * Sets the zoom location on the map 
	 * fnOptions - object 
	 * 	.lat - latitude 
	 * 	.lon - longitude
	 */
	MapEngine.Google.prototype.zoomToLocation = function(options, fnOptions) {
		var location = fnOptions;
		if(location){
			this._map.setCenter(new google.maps.LatLng(fnOptions.lat,fnOptions.lon));
		}
	}

	/**
	 * If fnOptions is set, set the center of the map 
	 * If fnOptions is null, get the center of the map 
	 * fnOptions - object 
	 * 	.lat - latitude 
	 * 	.lon - longitude
	 */
	MapEngine.Google.prototype.center = function(options, fnOptions) {
		if(fnOptions){
			this._map.setCenter(new google.maps.LatLng(fnOptions.lat,fnOptions.lon));
			return fnOptions;
		}
		return {
			lat : this._map.getCenter().lat(),
			lon : this._map.getCenter().lng(),
		}
	}

	/** 
	 * If fnOptions is set, set the drawing mode accordingly 
	 * If fnOptions is null, return true if in drawing mode, false otherwise 
	 * If fnOptions is false, turn off drawing mode 
	 * fnOptions - string 
	 * 		'circle' - Allow the user to draw circles 
	 * 		'point' - Allow the user to place points 
	 * 		'polygon' - Allow the user to create a polygon by drawing a series of lines 
	 * 		'polyline' - Allow the user to draw a line by setting a series of points 
	 * 		'rectangle'	- Allow the user to draw a rectangle 
	 * 	fnOptions - object
	 * 	.type - see string options above
	 */
	MapEngine.Google.prototype.draw = function(options, fnOptions) {
		if(typeof fnOptions === 'undefined'){
			return this._drawingManager !== null;
		} else if(!fnOptions && this._drawingManager){
			this._drawingManager.setMap(null);
			this._drawingManager = null;
			return;
		}
		var _t = this;

		var fnCallback = function(event){
			event.overlay.setMap(null);
			var geometryData = {
				id : 8,
				region : overlayToGeoJSON(event.overlay, event.type),
				geoJSON : true,
			}

			options.map.draw.callbacks.complete?
				options.map.draw.callbacks.complete.call(_t._mapDiv, geometryData, event.overlay):
				fnDefaultCallback.call(_t._mapDiv, geometryData);

		}
		var fnDefaultCallback = function(geometryData){
			$(_t._mapDiv).map("addGeometryLayer", geometryData);
		}

		var fnGetModeConstant = function(type){
			var mode = google.maps.drawing.OverlayType.CIRCLE;
			switch(type){
				case 'circle' : {
					mode = google.maps.drawing.OverlayType.CIRCLE;
					break;
				}
				case 'point' : {
					mode = google.maps.drawing.OverlayType.MARKER;
					break;
				}
				case 'polygon' : {
					mode = google.maps.drawing.OverlayType.POLYGON;
					break;
				}
				case 'polyline' : {
					mode = google.maps.drawing.OverlayType.POLYLINE;
					break;
				}
				case 'rectangle' : {
					mode = google.maps.drawing.OverlayType.RECTANGLE;
					break;
				}
			}
			return mode;
		}

		this._drawingManager = new google.maps.drawing.DrawingManager();
		if(typeof fnOptions === 'string'){
			mode = fnGetModeConstant(fnOptions);
			options.map.draw.type = fnOptions;
			options.map.draw.enabled = true;

			this._drawingManager.setDrawingMode(mode);
			this._drawingManager.setMap(this._map);

			google.maps.event.addListener(this._drawingManager, 'overlaycomplete', fnCallback);
		} else if(typeof fnOptions === 'object'){
			options.map.draw = $.extend(true, {}, options.map.draw, fnOptions);

			if(options.map.draw.enabled){
				mode = fnGetModeConstant(fnOptions.type);

				this._drawingManager.setDrawingMode(mode);
				this._drawingManager.setMap(this._map);

				google.maps.event.addListener(this._drawingManager, 'overlaycomplete', fnCallback);
			}
		}
	}

	/**
	 * Handle the implementation details of an info window 
	 * fnOptions - object 
	 * 	evt - Event containing latlng of where the user clicked 
	 * 	title - (unused) 
	 * 	content - HTML content 
	 * 	size - (unused)
	 */
	MapEngine.Google.prototype.showInfoWindow = function(options, fnOptions){
		//TODO, store infoWindow in map storage
		var evt = fnOptions.evt;
		var title = fnOptions.title;
		var content = fnOptions.content;
		var size = fnOptions.size;

	    infoWindow = new google.maps.InfoWindow({
	    	position : evt.latLng,
	        content : content,
	        pixelOffset : new google.maps.Size(0, 0)
	    });
	    infoWindow.open(this._map);
	}
})(window.MapEngine = window.MapEngine || {}, window);
