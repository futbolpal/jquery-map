/**
 * This class outlines an abstract interface to handle 
 * any number of Javascript map implementations.  It provides 
 * a common language, terminology, and option set, while still allowing
 * implementation specific attributes to be handled
 */
(function($, window, undefined) {
	window.MapEngineDefaults = {
		// Map initialization defaults 
		map : {
			center : { //Center the map over the USA
				lat : 39.8282, 
				lon : -98.5795,
			},
			type : null,
			zoom : 5, //Set the zoom level to 5 centers continental USA
			//Start with the pan control ON in the default postition
			panControl : { 
				visible : true,
				position : null,
			},
			//Start with the zoom control on with the default style and position
			zoomControl : { 
				visible : true,
		    	style: null,
				position : null,
			},
			//Start with drawing mode disabled 
			draw : {
				enabled : false,
				type : null,
				options : {},
				callbacks : {
					complete : null,
				}
			}
		}, 
		// This structure outlines default values and expected 
		// structure for a pin object 
		pin : {
			clickable : true, //Pins are clickable by default 
			draggable : true, //Pins are draggable by default 
			position : { 	  //Override this to set your pin position 
				lat : 0,
				lon : 0,
			},
			// This structure represents the rendering options for a pin 
			icon : {
				url : null,
				anchor : null,
				origin : null,
				scaledSize : null,
				size : { width : null, height : null },
			},
			// Override your callbacks in this part of your structure
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
		// This structure outlines how to set options for a GeoJSON geometry
		// layer.  
		geometry : {
			outline : {
				color : [255, 0, 0, 1],
				stroke : 2,
			},
			fill : {
				color : [255, 0, 0, .2],
			}
		},
	};

	var defaultOptions = {
		enabledEngines : [], 			//Allow only a subset of discovered engines
		engine : "Google", 				//Default to the Google Maps engine 
		engineOptions : {},
		map : MapEngineDefaults.map,	//Map option defaults
		mapData : {						//Agnostic map state data
			pins : {},
			kmlLayers : {},
			esriLayers : {},
			geometryLayers : {},
		}
	};
	var supportedEngines = ["Esri", "Google"];

	var exports = {};
	exports.init = function(opts){
		_t = this;
		_t._options = $.extend(true, {}, defaultOptions, opts);
		_t._instance = new MapEngine[_t._options.engine](
			_t,
			_t._options, 
			_t._options.engineOptions[_t._options.engine]
		);
		$(this).map("draw", _t._options.map.draw);

		return $(this);
	}

	/**
	 * Add a pin to the map 
	 * opts is an Object - see defaults above window.MapEngineDefaults.pins
	 *
	 * $('#map_div').map("addPin", {...});
	 */
	exports.addPin = function(opts){
		this._instance.addPin(this._options, opts);
		this._options.mapData.pins[opts.id] = opts;
		return $(this);
	}


	exports.removePin = function(opts){
		var object = this._options.engineOptions[this._options.engine].objects.pins[opts];

		delete this._options.mapData.pins[opts];

		this._instance.removePin(this._options, object);
		return $(this);
	}

	/** 
	 * Add an ESRI layer to the map 
	 *
	 * $('#map_div').map("addEsriLayer", {...});
	 */
	exports.addEsriLayer = function(opts){
		this._instance.addEsriLayer(this._options, opts);
		this._options.mapData.esriLayers[opts.id] = opts;
		return $(this);
	}


	exports.removeEsriLayer = function(opts){
		var object = this._options.mapData.esriLayers[opts];
		delete this._options.mapData.esriLayers[opts];

		this._instance.removeEsriLayer(this._options, object);
		return $(this);
	}

	/**
	 * Add a Kml Layer to the map 
	 * opts - Object 
	 * 	.url - URL for where the Kml layer can be retrieved
	 *
	 * $('#map_div').map("addKmlLayer", {...}');
	 */
	exports.addKmlLayer = function(opts){
		this._instance.addKmlLayer(this._options, opts);
		this._options.mapData.kmlLayers[opts.id] = opts;
		return $(this);
	}


	exports.removeKmlLayer = function(opts){
		var layer = this._options.mapData.kmlLayers[opts];
		delete this._options.mapData.kmlLayers[opts];
		this._instance.removeKmlLayer(this._options, layer);
		return $(this);
	}

	/** 
	 * Adds a GeoJSON geometry to the map 
     * fnOptions - the function arguments
	 *	.region - the postgis geometry
	 *	.options - the rendering options
	 *		.fill - the fill options
	 *			.color - the color [r,g,b,a]
	 *		.outline - the outline options
	 *			.color - the color [r,g,b,a]
	 *			.stroke - the width 
	 *
	 * $('#map_div').map("addGeometryLayer", {...});
	 */
	exports.addGeometryLayer = function(opts){
		this._instance.addGeometryLayer(this._options, opts);
		this._options.mapData.geometryLayers[opts.id] = opts;

		return $(this);
	}


	exports.removeGeometryLayer = function(opts){
		var layer = this._options.mapData.geometryLayers[opts];
		delete this._options.mapData.geometryLayers[opts];
		this._instance.removeGeometryLayer(this._options, layer);
		return $(this);
	}

	/**
	 * Perform a complete redraw of the map and all the state data 
	 */
	exports.redraw = function(opts) {
		var _t = this;

		// Update pins
		$.each(this._options.mapData.pins, function(i, pin){
			$(_t).map("addPin" , pin);
		});

		// Update esris
		$.each(this._options.mapData.esriLayers, function(i, layer){
			$(_t).map("addEsriLayer", layer);
		});

		// Update Kmls
		$.each(this._options.mapData.kmlLayers, function(i, layer){
			$(_t).map("addKmlLayer", layer);
		});

		// Update geometries
		$.each(this._options.mapData.geometryLayers, function(i, layer){
			$(_t).map("addGeometryLayer", layer);
		});

		// Update center
		$(this).map("center", this._options.map.center);

		// Update zoom 
		$(this).map("zoom", this._options.map.zoom);

		this._instance.redraw(this._options, opts);

		return $(this);
	}

	/**
	 * Reset the map state and all underlying implementation state data 
	 */
	exports.reset = function(opts) {
		this._options.mapData = {};

		this._instance.reset(this._options, opts);

		$(this).map("redraw");
		return $(this);
	}

	/** 
	 * Sets or retrieves current zoom level 
	 */
	exports.zoom = function(opts) {
		var zoom = this._instance.zoom(this._options, opts);
		if(typeof opts === 'undefined'){
			return zoom;
		} else {
			return $(this);
		}
	}

	/** 
	 * Zooms to a location
	 * opts - object 
	 * 	- lat - latitude to zoom to 
	 * 	- lon - longitude to zoom to 
	 */
	exports.zoomToLocation = function (opts) {
		var zoom = this._instance.zoomToLocation(this._options, opts);
		return $(this);
	}


	/** 
	 * Get or set the center of the map 
	 * If opts is set, set the center of the map 
	 * If opts is undefined, get the center of the map 
	 *
	 * - opts Object 
	 *   .lat - latitude to center on 
	 *   .lon - longitude to center on 
	 */
	exports.center = function(opts) {
		var center = this._instance.center(this._options, opts);
		if(typeof opts === 'undefined'){
			return center;
		} else {
			return $(this);
		}
	}

	/** 
	 * Manage the draw mode of the map 
	 *
	 * If opts is set, set the drawing mode accordingly 
	 * If opts is null, return true if in drawing mode, false otherwise 
	 * If opts is false, turn off drawing mode 
	 *
	 * opts - string 
	 * 		'circle' - Allow the user to draw circles 
	 * 		'point' - Allow the user to place points 
	 * 		'polygon' - Allow the user to create a polygon by drawing a series of lines 
	 * 		'polyline' - Allow the user to draw a line by setting a series of points 
	 * 		'rectangle'	- Allow the user to draw a rectangle 
	 * opts - object
	 * 	.type - see string options above
	 */
	exports.draw = function(opts) {
		var mode = this._instance.draw(this._options, opts);
		if(typeof opts === 'undefined'){
			return mode;
		} else {
			return $(this);
		}
	}

	/** 
	 * Change the underlying engine used for rendering 
	 *
	 * - opts input parameter 
	 *   - String: name of engine to use.  The engine will
	 *   be instantiated with defaults 
	 *   - Object: 
	 *   	opts.engine - the name of the engine to use 
	 */
	exports.engine = function(opts) {
		var newEngine = null;
		if(typeof opts === 'string' && supportedEngines.indexOf(opts) >= 0) {
			newEngine = opts;
		} else if(typeof opts === 'object' && supportedEngines.indexOf(opts.engine) >= 0){
			newEngine = opts.engine;
		} else if(typeof opts !== 'undefined') {
			console.warn(opts + " is not a valid engine parameter");
		}
		if(newEngine && this._options.engine != newEngine){
			$(this).empty();
			this._options.map.center = $(this).map("center");
			this._options.map.zoom = $(this).map("zoom");
			this._options.engine = newEngine;
			$(this).map("init", this._options).map("redraw");
			return $(this);
		}
		return this._options.engine;
	}

	/**
	 * Returns an array of engines supported 
	 */
	exports.supportedEngines = function(){
		return supportedEngines;
	}

	/**
	 * Returns the engine implementation of
	 * the map object.
	 */
	exports.map = function(){
		return this._map;
	}


	/**
	 * Return the earth's radius.  
	 *
	 * opts - 'miles' or 'meters'
	 */
	exports.getEarthRadius = function(opts){
		if(opts === 'miles')
			return 3959;
		if(opts === 'meters')
			return 6371;
	}

	/**
	 * This function accepts a value in radians 
	 * and returns its degrees equivalent
	 */
	exports.radiansToDegrees = function(opts){
		return opts * (180.0 / Math.PI);
	}

	/**
	 * This function accepts a value in degrees 
	 * and returns its radians equivalent
	 */
	exports.degreesToRadians = function(opts){
		return opts * (Math.PI / 180.0);
	}

	/**
	 * This function triggers the browser to prompt for
	 * permission to access the users location.  The two callbacks 
	 * represent the two possible outcome scenarios for the browser 
	 * call.  See standard javascript documentation online for details.
	 */
	exports.getLocation = function(successCallback, errorCallback){
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
		}

	}

	/*
	 * This function exposes the API in jQuery widget style.  
	 *
	 * It allows the consumer of this library to say:
	 * $('#map_div').map("addPin", {<pin data>})
	 */
	$.fn.map = function(action_or_options, options){
		var e = this[0];
		if(typeof action_or_options === 'string'){
			return exports[action_or_options].call(e, options);
		} else {
			return exports.init.call(e, action_or_options);
		}
	}

	/**
	 * This function runs when the page is fully loaded.  Triggered
	 * by jQuery.  
	 *  
	 * Loop through through the supportedEngines array and ensure all of the 
	 * engines are porperly initialized.  That is, the files should exist 
	 * and be included in addition to this script
	 */
	$(document).ready(function(){
		$.each(supportedEngines, function(i, engine){
			if(typeof window.MapEngine[engine] === 'undefined'){
				console.warn("'$1' map engine not found".replace("$1", engine));
			}
		})
	});
})(jQuery, window);
