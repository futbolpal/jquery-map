(function(MapEngine, window, undefined) {
	dojo.require("dijit.layout.BorderContainer");
	dojo.require("dijit.layout.ContentPane");
	dojo.require("esri.map");
	dojo.require("esri.layers.FeatureLayer");
	dojo.require("esri.layers.KMLLayer");
	dojo.require("esri.layers.agstiled");
	dojo.require("esri.layers.agsdynamic");
	dojo.require("esri.symbol");
	dojo.require("esri.graphic");
	dojo.require("esri.tasks.identify");
	dojo.require('esri.arcgis.Portal');
    dojo.require("esri.toolbars.draw");
	dojo.require("dojox.lang.aspect");
	dojo.require("dojox.gfx.shape");
	dojo.require("dojox.gfx.Moveable");
	dojo.require("dojo._base.Color");


	var EsriEngineDefaults = $.extend(true, {}, window.MapEngineDefaults, {
		map : {
			center : {
				lat : 39.8282, 
				lon : -98.5795,
			},
			type : null,
			zoom : 5,
			panControl : {
				visible : true,
				position : null,
			},
			zoomControl : {
				visible : true,
		    	style: 'small',
				position : "top-right",
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



	var handleMapEvent = function(type, evt){
		_t = this;
		if(evt.graphic){
			var attributes = evt.graphic.attributes;
			if(attributes.callbacks[type]){
				attributes.callbacks[type].call(_t, evt, attributes);
			}
		}
	}

	var toGeoJSON = function(geometry){
		return esriConverter().toGeoJson(geometry);
	}

	MapEngine.Esri = function(mapDiv, options, engineOptions){
		// Instance variables
		this._mapDiv = mapDiv;
		this._map = null;
		this._pins = {};
		this._esriLayers = {};
		this._kmlLayers = {};
		this._geometryLayers = {};
		this._defer = $.Deferred();

		var _t = this;
		var doInit = function(){
			var options =  {
				center : [EsriEngineDefaults.map.center.lon, EsriEngineDefaults.map.center.lat],
				logo : false,
				basemap : "streets",
				sliderPosition : EsriEngineDefaults.map.zoomControl.position,
				slider : EsriEngineDefaults.map.zoomControl.visible,
				sliderStyle : EsriEngineDefaults.map.zoomControl.style,
				zoom : EsriEngineDefaults.map.zoom,
			};
			//build map

			_t._map = new esri.Map(mapDiv,options);

			//build custom and PStuff layers
			dojo.connect(_t._map, "onLoad", function(evt) {
				_t._map.disableScrollWheelZoom();
				// _t._map.setLevel(8);

				_t._defer.resolve(_t._map);
			});

			dojo.connect(_t._map, "onClick", function(evt) {
				handleMapEvent("click", evt);
			});
			dojo.connect(_t._map, "onMouseDrag", function(evt) {
				handleMapEvent("drag", evt);
			});
			dojo.connect(_t._map, "onMouseDragStart", function(evt) {
				handleMapEvent("dragstart", evt);
			});
			dojo.connect(_t._map, "onMouseDragEnd", function(evt) {
				handleMapEvent("dragend", evt);
			});
		}
		dojo.ready(doInit);
	}

	/**
	 * Add a pin to the map 
	 * Returns the added pin object 
	 * fnOptions - object, see Esri defaults above (EsriEngineDefaults.pin)
	 */
	MapEngine.Esri.prototype.addPin = function(options, fnOptions){
		var fnAddPin = function(){
			var _t = this;
			var pinOptions = $.extend(true, {}, EsriEngineDefaults.pin, fnOptions);
			var pinsLayer = this._map.getLayer('pins');
			if(pinsLayer == null){
				pinsLayer = new esri.layers.GraphicsLayer({id : 'pins'});
				this._map.addLayer(pinsLayer);
				pinsLayer.show();
			}

			var symbol = new esri.symbol.SimpleMarkerSymbol();
			if(pinOptions.icon){
				symbol = new esri.symbol.PictureMarkerSymbol(
		            pinOptions.icon.url,
					pinOptions.icon.size.width,
					pinOptions.icon.size.height);
			}
			var point = new esri.geometry.Point(pinOptions.position.lon, pinOptions.position.lat);
			var graphic = new esri.Graphic(point, symbol);
			graphic.setAttributes(pinOptions);
			pinsLayer.add(graphic);

			if(pinOptions.draggable){
				dojo.connect(this._map, "onMouseDown", function(evt){
					if(evt.graphic == graphic){
						var dojoShape = evt.graphic.getDojoShape();
			        	var moveable = new dojox.gfx.Moveable(dojoShape);
						dojo.connect(moveable, "onMoveStop", function(mover) {
							var tx = dojoShape.getTransform();
							var startPoint = graphic.geometry;
							var endPoint = _t._map.toMap(_t._map.toScreen(startPoint).offset(tx.dx, tx.dy));
							dojoShape.setTransform(null);
							evt.graphic.setGeometry(endPoint);
						});
					}
				})
			}
		};


		var _t = this;
		this._defer.then(function(){
			fnAddPin.call(_t);
		});
	}

	MapEngine.Esri.prototype.removePin = function(options, pin){
		var fnRemovePin = function(){
			var pinsLayer = this._map.getLayer('pins');
			pinsLayer.remove(pin);
		}

		var _t = this;
		this._defer.then(function(){
			fnRemovePin.call(_t);
		});
	}

	/**
	 * fnOptions - object
	 * 	.type - See https://developers.arcgis.com/javascript/jsapi for esri.layers.<type> 
	 * 	.url - URL source 
	 * 	.opacity - Alpha scale for transparency
	 */ 
	MapEngine.Esri.prototype.addEsriLayer = function(options, fnOptions){
		var fnAddEsriLayer = function(){
			var type = fnOptions.type;
			var url = fnOptions.url;
			var opacity = fnOptions.opacity || 1;

			var layer = new esri.layers[type](url, {
				"id" : url,
				"opacity" : opacity
			});
			this._map.addLayer(layer);
		};

		var _t = this;
		this._defer.then(function(){
			fnAddEsriLayer.call(_t);
		});
	}

	MapEngine.Esri.prototype.removeEsriLayer = function(options, layer) {
		this._map.removeLayer(layer);
	}

	/**
	 * fnOptions - the function arguments 
	 * 	.url - The source URL for the KML data 
	 */
	MapEngine.Esri.prototype.addKmlLayer = function(options, fnOptions){
		var fnAddKmlLayer = function(){
			var url = fnOptions.url;

			var layer = new esri.layers.KMLLayer(url);
			this._map.addLayer(layer);
		};

		var _t = this;
		this._defer.then(function(){
			fnAddKmlLayer.call(_t);
		});
	}

	MapEngine.Esri.prototype.removeKmlLayer = function(options, layer) {
		var fnRemoveKmlLayer = function(){
			this._map.removeLayer(layer);
		}

		var _t = this;
		this._defer.then(function(){
			fnRemoveKmlLayer.call(_t);
		});
	}

	/**
	* map - The Esri map object
	* options - the global library options
	* fnOptions - the function arguments
	*	.region - the postgis geometry
	*	.options - the rendering options
	*		.fill - the fill options
	*			.color - the color [r,g,b,a]
	*		.outline - the outline options
	*			.color - the color [r,g,b,a]
	*			.stroke - the width 
	* Returns the graphic object
	**/
	MapEngine.Esri.prototype.addGeometryLayer = function(options, fnOptions){
		var fnAddGeometryLayer = function(){
			var region = fnOptions.region;
			var geomOptions = $.extend(true, {}, EsriEngineDefaults.geometry, fnOptions.options);

			var geomLayer = this._map.getLayer('geometries');
			if(geomLayer == null){
				geomLayer = new esri.layers.GraphicsLayer({id : 'geometries'});
				this._map.addLayer(geomLayer, 0);
				geomLayer.show();
			}

			var esriJSON = {};
			if(fnOptions.geoJSON){
				esriJSON = geoJsonConverter().toEsri(region);
				console.log(fnOptions,esriJSON)


				if(fnOptions.region.type == "LineString"){
					var poly = new esri.geometry.Polyline(esriJSON);
					var symbol = new esri.symbol.SimpleLineSymbol(
									esri.symbol.SimpleLineSymbol.STYLE_SOLID, 
									new dojo.Color(geomOptions.outline.color), geomOptions.outline.stroke);
					var graphic = new esri.Graphic(poly, symbol);
					graphic.setAttributes(region);
					geomLayer.add(graphic);
				} else {
					var poly = new esri.geometry.Polygon(esriJSON);
					var symbol = new esri.symbol.SimpleFillSymbol(
							esri.symbol.SimpleFillSymbol.STYLE_SOLID,
							new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, 
							new dojo.Color(geomOptions.outline.color), geomOptions.outline.stroke), //outline
							new dojo.Color(geomOptions.fill.color) //fill
						); 
					var graphic = new esri.Graphic(poly, symbol);
					graphic.setAttributes(region);
					geomLayer.add(graphic);
				}
			} else {
				esriJSON = { rings : []};
				$.each(region.coordinates, function(i, subpolies){
					var paths = [];
					$.each(subpolies, function(ii, subpoly){
						var path = [];
						$.each(subpoly, function(iii, coordinate){
							path.push([coordinate[0], coordinate[1]]);
						});
						esriJSON.rings.push(path);
					})
				});

				var poly = new esri.geometry.Polygon(esriJSON);
				var symbol = new esri.symbol.SimpleFillSymbol(
						esri.symbol.SimpleFillSymbol.STYLE_SOLID,
						new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, 
						new dojo.Color(geomOptions.outline.color), geomOptions.outline.stroke), //outline
						new dojo.Color(geomOptions.fill.color) //fill
					); 
				var graphic = new esri.Graphic(poly, symbol);
				graphic.setAttributes(region);
				geomLayer.add(graphic);
			} 
		};


		var _t = this;
		this._defer.then(function(){
			fnAddGeometryLayer.call(_t);
		});
	}

	MapEngine.Esri.prototype.removeGeometryLayer = function(options, layer){
		var fnRemoveGeometryLayer = function(){
			var geomLayer = this._map.getLayer('geometries');
			geomLayer.remove(layer);
		}

		var _t = this;
		this._defer.then(function(){
			fnRemoveGeometryLayer.call(_t);
		});
	}

	/**
	 * Nothing to do here 
	 */
	MapEngine.Esri.prototype.redraw = function(options, fnOptions) {
	}

	/** 
	 * Reset all implementation level information 
	 */
	MapEngine.Esri.prototype.reset = function(options) {
		this._pins = {};
		this._kmlLayers = {};
		this._esriLayers = {};
		this._geometryLayers = {};
	}

	/**
	 * Get or set the zoom level of the map 
	 *
	 * If fnOptions is set, set the center of the map 
	 * If fnOptions is undefined, return the center of the map 
	 * fnOptions - numeric zoom level 
	 */
	MapEngine.Esri.prototype.zoom = function(options, fnOptions) {
		if(fnOptions){
			this._map.setLevel(fnOptions);
			return fnOptions;
		}
		return this._map.getLevel();
	}

	/**
	 * Zoom the map to a particular coordinate, sets the zoom level to 22 
	 * 
	 * fnOptions - object 
	 * 	.lat - latitude 
	 * 	.lon - longitude 
	 */
	MapEngine.Esri.prototype.zoomToLocation = function(options, fnOptions){
		var location = fnOptions;

		var pt = esri.geometry.geographicToWebMercator(new esri.geometry.Point(location.lon, location.lat));
		this._map.centerAndZoom(pt, 22);

		return location;
	}

	/**
	 * Get or set the center of the map 
	 *
	 * If fnOptions is set, set the center of the map 
	 * If fnOptions is undefined, return the center of the map 
	 * fnOptions - object
	 * 	.lat - latitude 
	 * 	.lon - longitude
	 */
	MapEngine.Esri.prototype.center = function(options, fnOptions) {
		if(fnOptions){
			var point = new esri.geometry.Point(fnOptions.lon, fnOptions.lat);
			this._map.centerAt(point);
			return fnOptions;
		}
		return {
			lat : this._map.extent.getCenter().getLatitude(),
			lon : this._map.extent.getCenter().getLongitude(),
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
	MapEngine.Esri.prototype.draw = function(options, fnOptions) {
		var _t = this;

		var fnCallback = function(geometry){
			geometry = esri.geometry.webMercatorToGeographic(geometry);
			var geometryData = {
				id : 8,
				region : esriConverter().toGeoJson(geometry),
				geoJSON : true,
			}

			options.map.draw.callbacks.complete?
				options.map.draw.callbacks.complete.call(_t._mapDiv, geometryData, geometry):
				fnDefaultCallback.call(_t._mapDiv, geometryData);
		}

		var fnDefaultCallback = function(geometryData){
			$(_t._mapDiv).map("addGeometryLayer", geometryData);
		}	


		var fnGetModeConstant = function(modeStr){
			var mode = esri.toolbars.Draw.CIRCLE;
			switch(modeStr){
				case 'circle' : {
					mode = esri.toolbars.Draw.CIRCLE;
					break;
				}
				case 'point' : {
					mode = esri.toolbars.Draw.POINT;
					break;
				}
				case 'polygon' : {
					mode = esri.toolbars.Draw.POLYGON;
					break;
				}
				case 'polyline' : {
					mode = esri.toolbars.Draw.POLYLINE;
					break;
				}
				case 'rectangle' : {
					mode = esri.toolbars.Draw.RECTANGLE;
					break;
				}
			}
			return mode;
		}

		var fnDraw = function(){			
			if(typeof fnOptions === 'undefined'){
				return this._drawingManager !== null;
			} else if(!fnOptions && this._drawingManager){

				options.map.draw.enabled = false;

				this._drawingManager.deactivate();
				this._drawingManager = null;
				return;
			}

			if(typeof fnOptions === 'string'){
				options.map.draw.enabled = true;
				options.map.draw.type = fnOptions;

				console.log(fnGetModeConstant(options.map.draw.type))


				this._drawingManager = new esri.toolbars.Draw(this._map);
				this._drawingManager.activate(fnGetModeConstant(fnOptions));
        		dojo.connect(this._drawingManager, "onDrawEnd", fnCallback);
			} else if(typeof fnOptions === 'object'){
				options.map.draw = $.extend(true, {}, options.map.draw, fnOptions);
				if(options.map.draw.enabled){
					this._drawingManager = new esri.toolbars.Draw(this._map);
					this._drawingManager.activate(fnGetModeConstant(options.map.draw.type));
	        		dojo.connect(this._drawingManager, "onDrawEnd", fnCallback);
				}
			}
		}


		var _t = this;
		this._defer.then(function(){
			fnDraw.call(_t);
		});
	}

	MapEngine.Esri.prototype.showInfoWindow = function(options, fnOptions){
		var evt = fnOptions.evt;
		var title = fnOptions.title;
		var content = fnOptions.content;
		var size = fnOptions.size;

		this._map.infoWindow.hide();
		this._map.infoWindow.setTitle(title);
		this._map.infoWindow.setContent(content);
		this._map.infoWindow.resize(size.width, size.height);
		this._map.infoWindow.show(evt.screenPoint, this._map.getInfoWindowAnchor(evt.screenPoint));
	}
})(window.MapEngine = window.MapEngine || {}, window);
