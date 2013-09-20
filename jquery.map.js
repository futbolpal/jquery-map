(function($, window, undefined) {
	window.MapEngineDefaults = {
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
		    	style: null,
				position : null,
			},
			draw : {
				enabled : false,
				type : null,
				options : {},
				callbacks : {
					complete : null,
				}
			}
		}, 
		pin : {
			clickable : true,
			draggable : true,
			position : {
				lat : 0,
				lon : 0,
			},
			icon : {
				url : null,
				anchor : null,
				origin : null,
				scaledSize : null,
				size : null,
			},
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
		},
	};

	var defaultOptions = {
		enabledEngines : [],
		engine : "Google",
		engineOptions : {},
		map : MapEngineDefaults.map,
		mapData : {
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

	exports.reset = function(opts) {
		this._options.mapData = {};

		this._instance.reset(this._options, opts);

		$(this).map("redraw");
		return $(this);
	}

	exports.zoom = function(opts) {
		var zoom = this._instance.zoom(this._options, opts);
		if(typeof opts === 'undefined'){
			return zoom;
		} else {
			return $(this);
		}
	}

	exports.zoomToLocation = function (opts) {
		var zoom = this._instance.zoomToLocation(this._options, opts);
		return $(this);
	}


	exports.center = function(opts) {
		var center = this._instance.center(this._options, opts);
		if(typeof opts === 'undefined'){
			return center;
		} else {
			return $(this);
		}
	}

	/**
	* opts - a boolean or an array of options
	**/
	exports.draw = function(opts) {
		var mode = this._instance.draw(this._options, opts);
		if(typeof opts === 'undefined'){
			return mode;
		} else {
			return $(this);
		}
	}

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

	exports.supportedEngines = function(){
		return supportedEngines;
	}

	exports.map = function(){
		return this._map;
	}


	exports.getEarthRadius = function(opts){
		if(opts === 'miles')
			return 3959;
		if(opts === 'meters')
			return 6371;
	}

	exports.radiansToDegrees = function(opts){
		return opts * (180.0 / Math.PI);
	}

	exports.degreesToRadians = function(opts){
		return opts * (Math.PI / 180.0);
	}

	exports.getLocation = function(successCallback, errorCallback){
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
		}

	}

	$.fn.map = function(action_or_options, options){
		var e = this[0];
		if(typeof action_or_options === 'string'){
			return exports[action_or_options].call(e, options);
		} else {
			return exports.init.call(e, action_or_options);
		}
	}

	$(document).ready(function(){
		$.each(supportedEngines, function(i, engine){
			if(typeof window.MapEngine[engine] === 'undefined'){
				console.warn("'$1' map engine not found".replace("$1", engine));
			}
		})
	});
})(jQuery, window);