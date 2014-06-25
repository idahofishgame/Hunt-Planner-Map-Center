require(["esri/map",
	"esri/dijit/LocateButton",
	"esri/dijit/Scalebar",
	"esri/geometry/webMercatorUtils",
	"esri/dijit/BasemapGallery",
	"esri/arcgis/utils",
	"esri/layers/FeatureLayer",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/dijit/Geocoder",
	"esri/tasks/LegendLayer",
	"esri/tasks/GeometryService",
	"esri/dijit/Measurement",
	"esri/toolbars/draw",
	"esri/graphic",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/symbols/TextSymbol",
	"esri/Color",
	"esri/symbols/Font",
	"esri/tasks/PrintParameters",
	"esri/tasks/PrintTemplate",
	"esri/tasks/PrintTask",
	"esri/InfoTemplate", 
	"esri/geometry/Multipoint", 
	"esri/symbols/PictureMarkerSymbol",
	"esri/dijit/Popup",
	"agsjs/dijit/TOC",
	"dojo/_base/connect",
	"dojo/dom",
	"dojo/parser",
	"dijit/registry",
	"dojo/on",
	"dojo/query",
	"application/bootstrapmap",
	"dijit/form/Button",
	"dojo/fx",
	"dojo/domReady!"], 
	function(Map, LocateButton, Scalebar, webMercatorUtils, BasemapGallery, arcgisUtils, FeatureLayer, ArcGISDynamicMapServiceLayer, Geocoder, LegendLayer, GeometryService, Measurement, Draw, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, TextSymbol, Color, Font, PrintParameters, PrintTemplate, PrintTask, InfoTemplate, Multipoint, PictureMarkerSymbol, Popup, TOC, connect, dom, parser, registry, on, query, BootstrapMap) {
		
		// call the parser to create the dijit layout dijits
		parser.parse(); // note djConfig.parseOnLoad = false;
		
		//Get a reference to the ArcGIS Map class
		map = BootstrapMap.create("mapDiv",{
			basemap:"topo",
			center:[-114.52,45.50],
			zoom:6
		});
		
		//LocateButton will zone to where you are.  Tracking is enabled and the button becomes a toggle that creates an event to watch for location changes.
		var locateSymbol = new PictureMarkerSymbol({
			"url": "src/images/red-pin.png",
			"height": 30,
			"width": 30
		});
		geoLocate = new LocateButton({
        map: map,
				symbol: locateSymbol
				//useTracking: true
      }, "LocateButton");
      geoLocate.startup();
		
		//add scalebar
		scalebar = new Scalebar({
			map: map,
			scalebarUnit: "dual"
		});
		
		//add coordinate viewer
		 map.on("load", function() {
		//after map loads, connect to listen to mouse move & drag events
			map.on("mouse-move", showCoordinates);
			map.on("mouse-drag", showCoordinates);
		});
		
		//hide the loading icon
		$(window).load(function(){
			$("#loading").hide();
		});
		
		function showCoordinates(evt) {
			//the map is in web mercator but display coordinates in geographic (lat, long)
			var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
			//display mouse coordinates
			dom.byId("info").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);
		}
		
		//add the basemap gallery, in this case we'll display maps from ArcGIS.com including bing maps
		basemapGallery = new BasemapGallery({
			showArcGISBasemaps: true,
			map: map
		}, "basemapDiv");
		basemapGallery.startup();
		
		basemapGallery.on("error", function(msg) {
			console.log("basemap gallery error:  ", msg);
		});
		
		//add layers (or groups of layers) to the map.
		huntLayers = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/Hunting/MapServer",
			{id:"huntLayers"});

		//add the Table of Contents.  Layers can be toggled on/off. Symbology is displayed.  Each "layer group" has a transparency slider.
		map.on('layers-add-result', function(evt){
			// overwrite the default visibility of service.
			// TOC will honor the overwritten value.
			//huntLayers.setVisibleLayers([..., ..., ]);
			//try {
				toc = new TOC({
					map: map,
					layerInfos: [{
						layer: huntLayers,
						title: "Hunt Related Layers",
						//collapsed: false, // whether this root layer should be collapsed initially, default false.
						slider: true // whether to display a transparency slider.
					}]
					}, 'tocDiv');
				toc.startup();
				
				toc.on('load', function(){
					if (console) 
						console.log('TOC loaded');
				});
		});
		
		map.addLayers([huntLayers]);
		
		//toggle layers/on by click layer label (as well as checking checkbox)
		$(".agsjsTOCContent").click (function(){
			// What to put here?!?
			return;
		});
			
		// Create geocoder widget
		var geocoder = new Geocoder({
			maxLocations: 10,
			autoComplete: true,
			arcgisGeocoder: true,
			map: map
		},"geosearch");        
		geocoder.startup();
		geocoder.on("select", geocodeSelect);
		geocoder.on("findResults", geocodeResults);
		geocoder.on("clear", clearFindGraphics);

		// Geosearch functions
		on(dom.byId("btnGeosearch"),"click", geosearch);
		on(dom.byId("btnClear"),"click", clearFindGraphics);

		map.on("load", function(e){
			map.infoWindow.offsetY = 35;
			map.enableScrollWheelZoom();
		});
		
		function geosearch() {
			var def = geocoder.find();
			def.then(function(res){
				geocodeResults(res);
			});
		}

		function geocodeSelect(item) {
			var g = (item.graphic ? item.graphic : item.result.feature);
			g.setSymbol(sym);
			addPlaceGraphic(item.result,g.symbol);
		}

		function geocodeResults(places) {
			places = places.results;
			if (places.length > 0) {
				clearFindGraphics();
				var symbol = sym;
				// Create and add graphics with pop-ups
				for (var i = 0; i < places.length; i++) {
					addPlaceGraphic(places[i], symbol);
				}
				zoomToPlaces(places);
			} else {
				alert("Sorry, address or place not found.");
			}
		}
		
		function addPlaceGraphic(item,symbol)  {
			var place = {};
			var attributes,infoTemplate,pt,graphic;
			pt = item.feature.geometry;
			place.address = item.name;
			// Graphic components
			attributes = { address:place.address, lat:pt.getLatitude().toFixed(2), lon:pt.getLongitude().toFixed(2) };   
			infoTemplate = new InfoTemplate("${address}","Latitude: ${lat}<br/>Longitude: ${lon}");
			graphic = new Graphic(pt,symbol,attributes,infoTemplate);
			// Add to map
			map.graphics.add(graphic);  
		}
							
		function zoomToPlaces(places) {
			var multiPoint = new Multipoint(map.spatialReference);
			for (var i = 0; i < places.length; i++) {
				//multiPoint.addPoint(places[i].location);
				multiPoint.addPoint(places[i].feature.geometry);
			}
			map.setExtent(multiPoint.getExtent().expand(2.0));
		}

		function clearFindGraphics() {
			map.infoWindow.hide();
			map.graphics.clear();
		}

		function createPictureSymbol(url, xOffset, yOffset, size) {
			return new PictureMarkerSymbol(
			{
					"angle": 0,
					"xoffset": xOffset, "yoffset": yOffset, "type": "esriPMS",
					"url": url,  
					"contentType": "image/png",
					"width":size, "height": size
			});
		}

		var sym = createPictureSymbol("src/images/blue-pin.png", 0, 12, 35);
		
		//the user inputs a long, lat coordinate and a flag icon is added to that location and the location is centered and zoomed to on the map.
		$("#btnCoordZoom").click (function(){
			console.log("Go to Coordinate");
			zoomToCoordinate();
		});
		
		function zoomToCoordinate(){
			var flagGraphic;
			if(flagGraphic) {
						 map.graphics.remove(flagGraphic);
					}
			var longitude = $("#longitudeInput").val();
			var latitude = $("#latitudeInput").val();
			var symbol = new esri.symbol.PictureMarkerSymbol("src/images/flag.png",16,16);
			var pt = new esri.geometry.Point(longitude, latitude);
			flagGraphic = new esri.Graphic(pt, symbol);
			map.graphics.add(flagGraphic);
			map.centerAndZoom(pt, 12);
		}
	
		//add the measurement tools
		//esriConfig.defaults.geometryService = new GeometryService("https://fishandgame.idaho.gov/gis/rest/services/Utilities/Geometry/GeometryServer");
		var pms = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE,
			new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([255, 0, 0, .55], 1)));
			pms.setColor(new Color([255, 0, 0, .55]));
			pms.setSize("8");
		var sls = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SHORTDASHDOTDOT,
			new Color([255, 0, 0, .55]), 3);
		
		var measurement = new Measurement({
			map: map,
			lineSymbol:sls,
			pointSymbol:pms
		}, dom.byId("measurementDiv"));
		measurement.startup();
		
		/*$("#measurementModal").draggable({
			handle:".modal-header"
		});*/
		
		dojo.connect(measurement, "onMeasureEnd", function () {
			var resultValue = measurement.resultValue.domNode.innerHTML;
			var copyResultValue = document.getElementById('Results');
			copyResultValue.innerHTML = resultValue;
			$("#measureResultsDiv").show();
			$("#measureResultsDiv").effect("highlight", {color: 'yellow'}, 3000);
			$("#clearMeasureResults").click(function(){
				$("#measureResultsDiv").hide();
			});
		});
	
		//add the Draw toolbar.
		map.on("load", createToolbar);
		
		$("#btnClearGraphic").click (function(){
			map.graphics.clear();
			$("#drawModal").modal('toggle');
			return;
		});
	
		// loop through all dijits, connect onClick event
		// listeners for buttons to activate drawing tools
		registry.forEach(function(d) {
			// d is a reference to a dijit
			// could be a layout container or a button
			if ( d.declaredClass === "dijit.form.Button" ) {
				d.on("click", activateTool);
			}
		});

		//change the tooltip text for the Draw.POINT tool.
		esri.bundle.toolbars.draw.addPoint = "Click to add text to the map.";
		
		function activateTool() {
			var tool;
			if (this.label === "Add Text") {
			console.log ("Add Text");
			toolbar.activate(Draw.POINT);
			} else {
			tool = this.label.toUpperCase().replace(/ /g, "_");
			toolbar.activate(Draw[tool]);
			}
			$("#drawModal").modal('toggle');
		}

		function createToolbar(themap) {
			toolbar = new Draw(map);
			toolbar.on("draw-end", addToMap);
		}

		function addToMap(evt) {
			var symbol;
			var userText = $("#userTextBox").val();
			toolbar.deactivate();
			switch (evt.geometry.type) {
				case "point":
					symbol= new TextSymbol($("#userTextBox").val()).setColor(
						new Color([255, 0, 0])).setFont(
						new Font("16pt").setWeight(Font.WEIGHT_BOLD)).setHorizontalAlignment("left");
					break;
				case "multipoint":
					symbol = new SimpleMarkerSymbol();
					break;
				case "polyline":
					symbol = new SimpleLineSymbol();
					break;
				default:
					symbol = new SimpleFillSymbol();
					break;
			}
			
			var graphic = new Graphic(evt.geometry, symbol);
			map.graphics.add(graphic);
		}

	//Create PDF using PrintTask	
  $("#btnPDF").click (function(){
		console.log("Start Printing");
    submitPrint(); 
  });
		
	function submitPrint() {
	var printParams = new PrintParameters();
		printParams.map = map;
	var status = dojo.byId("printStatus");
		status.innerHTML = "Creating PDF Map...";
		
	var template = new PrintTemplate();
	var printTitle = $("#txtTitle").val();
	console.log("printTitle= " + printTitle);
	template.layoutOptions = {
		"titleText": printTitle
	};
	template.format = "PDF";
	template.layout = "Custom_IDFG_PrintTemplate_Landscape_8x11";
	printParams.template = template;
	
	var printServiceUrl ='https://fishandgame.idaho.gov/gis/rest/services/CustomIDFG_WebExportWebMapTask/GPServer/Export%20Web%20Map';
  var printTask = new esri.tasks.PrintTask(printServiceUrl);	
	
	var deferred = printTask.execute(printParams);
      deferred.addCallback(function (response){
        console.log("response = " + response.url);       
        status.innerHTML = "";
		    //open the map PDF or image in a new browser window.
        window.open(response.url.replace("sslifwisiis","fishandgame.idaho.gov"));
				$("#pdfModal").modal('hide');
      });
	  
      deferred.addErrback(function (error) {
        console.log("Print Task Error = " + error);
        status.innerHTML = "Print Error" + error;
      });
	};
	
	// Show modal dialog, hide nav
	$(document).ready(function(){
		// Close menu (THIS CODE DOESN'T SEEN NECESSARY AFTER I ADDED THE OFF-CANVAS SIDEBAR TOGGLE CODE BELOW.)
			//$('.nav a').on('click', function(){
			//$(".navbar-toggle").click();
		//});
		// hunt nav1 menu is selected
		$("#huntNav1").click(function(e){
			$("#huntModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// hunt nav2 menu is selected
		$("#huntNav2").click(function(e){
			$("#huntModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		/* layerList nav1 menu is selected
		$("#layerListNav1").click(function(e){
			$("#layerListModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// layerList nav2 menu is selected
		$("#layerListNav2").click(function(e){
			$("#layerListModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});*/
		// legend nav1 menu is selected
		$("#legendNav1").click(function(e){
			$("#legendModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// legend nav2 menu is selected
		$("#legendNav2").click(function(e){
			$("#legendModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// basemap nav 1 menu is selected
		$("#basemapNav1").click(function(e){
			$("#basemapModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// basemap nav2 menu is selected
		$("#basemapNav2").click(function(e){
			$("#basemapModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// Geosearch nav1 menu is selected
		$("#geosearchNav1").click(function(e){
			$("#geosearchModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// Geosearch nav2 menu is selected
		$("#geosearchNav2").click(function(e){
			$("#geosearchModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// measurement nav1 menu is selected
		$("#measurementNav1").click(function(e){
			$("#measurementModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// measurement nav2 menu is selected
		$("#measurementNav2").click(function(e){
			$("#measurementModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// draw nav1 menu is selected
		$("#drawNav1").click(function(e){
			$("#drawModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// draw nav2 menu is selected
		$("#drawNav2").click(function(e){
			$("#drawModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});	
		// pdf nav1 menu is selected
		$("#pdfNav1").click(function(e){
			$("#pdfModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// pdf nav2 menu is selected
		$("#pdfNav2").click(function(e){
			$("#pdfModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
/* off-canvas sidebar toggle */
			$('[data-toggle=offcanvas]').click(function() {
					$(this).toggleClass('visible-xs text-center');
					$(this).find('i').toggleClass('glyphicon-chevron-right glyphicon-chevron-left');
					$('.row-offcanvas').toggleClass('active');
					$('#lg-menu').toggleClass('#sidebar hidden-xs').toggleClass('#sidebar visible-xs');
					$('#xs-menu').toggleClass('#sidebar visible-xs').toggleClass('#sidebar hidden-xs');
					/*$('#btnShow').toggle();*/
			});
			
		});
		
		
});
