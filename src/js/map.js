require(["esri/map",
	"esri/dijit/LocateButton",
	"esri/dijit/Scalebar",
	"esri/geometry/webMercatorUtils",
	"esri/dijit/BasemapLayer",
	"esri/dijit/Basemap",
	"esri/dijit/BasemapGallery",
	"agsjs/layers/GoogleMapsLayer",
	"esri/arcgis/utils",
	"esri/layers/FeatureLayer",
	"esri/layers/GraphicsLayer", 
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/ImageParameters",
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
	"esri/dijit/PopupTemplate",
	"esri/tasks/QueryTask",
	"esri/tasks/query",
	"agsjs/dijit/TOC",
	"dojo/_base/connect",
	"dojo/dom",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/parser",
	"dijit/registry",
	"dojo/on",
	"dojo/query",
	"application/bootstrapmap",
	"dijit/form/Button",
	"dojo/fx",
	"dojo/domReady!"], 
	function(Map, LocateButton, Scalebar, webMercatorUtils, BasemapLayer, Basemap, BasemapGallery, GoogleMapsLayer, arcgisUtils, FeatureLayer, GraphicsLayer, ArcGISDynamicMapServiceLayer, ImageParameters, Geocoder, LegendLayer, GeometryService, Measurement, Draw, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, TextSymbol, Color, Font, PrintParameters, PrintTemplate, PrintTask, InfoTemplate, Multipoint, PictureMarkerSymbol, Popup, PopupTemplate, QueryTask, Query, TOC, connect, dom, domClass, domConstruct, parser, registry, on, query, BootstrapMap) {
		

		// call the parser to create the dijit layout dijits
		parser.parse(); // note djConfig.parseOnLoad = false;
		
		//create a popup div
		var popup = Popup({
				titleInBody: false
		},domConstruct.create("div"));
		
		//Get a reference to the ArcGIS Map class
		map = BootstrapMap.create("mapDiv",{
			basemap:"topo",
			center:[-114.52,45.50],
			zoom:6,
			infoWindow: popup
		});
		
		//create a domClass to customize the look of the popup window
		domClass.add(map.infoWindow.domNode, "myTheme");

		//LocateButton will zoom to where you are.  If tracking is enabled and the button becomes a toggle that creates an event to watch for location changes.
		var locateSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
			new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
			new Color([215,73,255, 0.8]), 8),
			new Color ([199,0,255, 0.8]));
		
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
		
		var placeLayer, zoomToLayer, zoomToLabelLayer, drawToolbarLayer, drawTextLayer;
		
		 map.on("load", function() {
		//after map loads, connect to listen to mouse move & drag events
			map.on("mouse-move", showCoordinates);
			map.on("mouse-drag", showCoordinates);
		//add graphics layer for the hunt areas query
			queryLayer = new GraphicsLayer();
			map.addLayer(queryLayer);
		//add graphics layers for graphic outputs from the various tools (Place Search, Coordinate Search w/label, Draw shapes, Draw text)	
			placeLayer = new GraphicsLayer();
			map.addLayer(placeLayer);
			zoomToLayer = new GraphicsLayer();
			map.addLayer(zoomToLayer);
			zoomToLabelLayer = new GraphicsLayer();
			map.addLayer(zoomToLabelLayer);
			//graphics layers for toolbar shapes and text.  Must be separated into different layers or they will not print properly on the map.
			drawToolbarLayer = new GraphicsLayer();
			map.addLayer(drawToolbarLayer);
			drawTextLayer = new GraphicsLayer();	
			map.addLayer(drawTextLayer);
			map.reorderLayer(drawTextLayer,1);
		});
		
		//hide the loading icon
		$(window).load(function(){
			$("#loading").hide();
		});
		
		//show coordinates as the user scrolls around the map. In Desktop, it displays where ever the mouse is hovering.  In mobile, the user must tap the screen to get the coordinates.
		function showCoordinates(evt) {
			//the map is in web mercator but display coordinates in geographic (lat, long)
			var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
			//display mouse coordinates
			dom.byId("info").innerHTML = mp.x.toFixed(3) + ", " + mp.y.toFixed(3);
		}
		
		//add the basemap gallery, in this case we'll display maps from ArcGIS.com including bing maps
		basemapGallery = new BasemapGallery({
			showArcGISBasemaps: true,
			map: map,
		}, "basemapDiv");
		basemapGallery.startup();
		
		basemapGallery.on("error", function(msg) {
			console.log("basemap gallery error:  ", msg);
		});
		
		$("#basemapDiv").click (function(){
			console.log("BasemapDiv Clicked");
			map.removeLayer(googleLayer);
			$("#basemapModal").modal('hide');
		});
		
		$(".esriBasemapGalleryNode").click (function(){
			$("#basemapModal").modal('hide');
		});
		
		//Add the USA Topo basemap to the basemap gallery.
		var layer = new esri.dijit.BasemapLayer({url:"http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer"});
		var basemap = new esri.dijit.Basemap({
			layers:[layer],
			title:"USGS Topo",
			thumbnailUrl:"src/images/usa_topo.jpg"
		});
		basemapGallery.add(basemap);
		
		//Add Google Map basemap layers
		googleLayer = new agsjs.layers.GoogleMapsLayer({
			id: 'google',
			apiOptions: {
				v: '3.6' // use a specific version is recommended for production system. 
			},
			mapOptions: {
				streetViewControl: false // use false if do not want street view. Default is true.
			}
		});
				
		$("#googleRoads").click (function(){
				console.log ("Clicked Google Roads");
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_ROADMAP);
		});
		
		$("#googleSatellite").click (function(){
				console.log ("Clicked Google Satellite");
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_SATELLITE);
		});
		
		$("#googleHybrid").click (function(){
				console.log ("Clicked Google Hybrid");
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_HYBRID);
		});
		
		$("#googleTerrain").click (function(){
				console.log ("Clicked Google Terrain");
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_TERRAIN);
		});
						
		//popup window template for the surface management feature layer
		/* var surfMgmtPopupTemplate = new PopupTemplate({
			title: "Land Management Info",
			description: "{AGNCY_NAME}",
			fieldInfos:[{
				fieldName: "AGNCY_NAME", visible: true
				}]
			}); */

		//popup window template for the Campground feature layer
		var campgroundPopupTemplate = new PopupTemplate({
			title: "Campground Info",
			fieldInfos:[{
				fieldName: "NAME", visible: true,
				fieldName: "Phone", visible: true,
				fieldName: "Rate", visible: true,
				fieldName: "Season", visible: true,
				fieldName: "Sites", visible: true,
				fieldName: "Max_Length", visible: true,
				fieldName: "Type", visible: true,
				fieldName: "URL", visible: true
				}]
			});	
		campgroundPopupTemplate.setContent(
			"<b>Name: </b>${NAME}<br/>" +
			"<b>Phone: </b>${Phone}</br>" +
			"<b>Fee/Rate: </b>${Rate}</br>" +
			"<b>Season: </b>${Season}</br>" +
			"<b># of Sites: </b>${Sites}</br>" +
			"<b>Max # of Days at Site*: </b>${Max_Length}</br>" +
			"<b>* </b> 0 = No Limit</br>" +
			"<b>Site Administrator: </b>${Type}</br>"
		);
		
		//popup window template for the fire closure feature layer
		var closurePopupTemplate = new PopupTemplate({
			title: "Fire Closure Info",
			fieldInfos:[{
				fieldName: "NAME", visible: true,
				fieldName: "URL", visible: true,
				fieldName: "UPDATE_", visible: true
				}]
			});
		closurePopupTemplate.setContent(
			"<b>Name: </b>${NAME}<br/>" +
			"<b>Effective Date: </b>${UPDATE_}<br/>" +
			"<a style='cursor:pointer;' href='${URL}' target='_blank'>InciWeb Description</a>"
		);
		
		//popup window template for the fire perimeter feature layer
		var perimeterPopupTemplate = new PopupTemplate({
			title: "{fire_name} Fire",
			fieldInfos:[{
				fieldName: "fire_name", visible: true,
				fieldName: "acres", visible: true,
				fieldName: "active", visible: true, 
				}]
			});
		perimeterPopupTemplate.setContent(
			"<b>Acres: </b>${acres}<br/>" +
			"<b>Active (Y/N): </b>${active}</br>"
		);
		
		//add layers (or groups of layers) to the map.
		huntLayers = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/Hunting/MapServer",
			{id:"Hunt Area"});
		adminLayers = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/AdministrativeBoundaries/MapServer",
			{id:"Adminstrative Boundary"});
		surfaceMgmtLayer = new FeatureLayer("https://fishandgame.idaho.gov/gis/rest/services/Basemaps/SurfaceMgmt_WildlifeTracts/MapServer/0",
			{
				id:"Surface Management",
				opacity: 0.5
				//outFields:["*"],
				//infoTemplate:surfMgmtPopupTemplate
			});
		trailLayers = new ArcGISDynamicMapServiceLayer("http://gis2.idaho.gov/arcgis/rest/services/DPR/IDTrailsSimple/MapServer",
			{id:"Trails and Roads"});
		campgroundLayer = new FeatureLayer("https://gis2.idaho.gov/arcgis/rest/services/ADM/Campgrounds/MapServer/0",
			{
				id:"Campgrounds",
				outFields:["*"],
				infoTemplate:campgroundPopupTemplate
			});
		fireLayer0 = new FeatureLayer("https://fishandgame.idaho.gov/gis/rest/services/External/InciWeb_FireClosures/MapServer/0",
			{
				id:"Fire Closure",
				outFields:['NAME', 'URL', 'UPDATE_'],
				infoTemplate:closurePopupTemplate
			});
		fireLayer1 = new FeatureLayer("http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/1",
			{id:"Large Fires",});	
		fireLayer2 = new FeatureLayer("http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/2",
			{
				id:"Fire Perimeter",
				outFields:['acres', 'active', 'fire_name'],
				infoTemplate:perimeterPopupTemplate
			});
		fireLayer3 = new FeatureLayer("http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/3",
			{id:"MODIS Fire Detection"});	
		
		//add the Table of Contents.  Layers can be toggled on/off. Symbology is displayed.  Each "layer group" has a transparency slider.
		map.on('layers-add-result', function(evt){
			// overwrite the default visibility of service. TOC will honor the overwritten value.
			trailLayers.setVisibleLayers([2,3,4,5,6,7,8,9,10,11]);
				toc = new TOC({
					map: map,
					layerInfos: [{
						layer: huntLayers,
						title: "Hunt Related Layers",
						collapsed: false, // whether this root layer should be collapsed initially, default false.
						slider: true // whether to display a transparency slider.
					}, {
						layer: adminLayers,
						title: "Administrative Boundaries",
						collapsed:true,
						slider: true
					}, {
						layer: surfaceMgmtLayer,
						title: "Land Management Layer",
						collapsed: true,
						slider:true
					}, {
						layer: trailLayers,
						title: "Motorized & Non-motorized Trails",
						collapsed: true,
						slider: true
					}, {
						layer: campgroundLayer,
						title: "Campgrounds",
						collapsed: true,
						slider: true	
					}]
					}, 'tocDiv');
				toc.startup();
				
				toc.on('load', function(){
					if (console) 
						console.log('TOC loaded');
					//toggle layers/on by click root/layer labels (as well as checking checkbox)
					$('.agsjsTOCServiceLayerLabel').click(function(){
						$(this).siblings('span').children('input').click();
					});
					//$('.agsjsTOCRootLayerLabel').click(function(){
						//$(this).siblings('span').children('input').click();
					//});
				});
		});
		
		map.addLayers([surfaceMgmtLayer, adminLayers, fireLayer3, fireLayer2, fireLayer0, huntLayers, trailLayers, campgroundLayer]);
		adminLayers.hide(); //So none of the layers are "on" when the map loads.
		surfaceMgmtLayer.hide();
		trailLayers.hide();
		campgroundLayer.hide();
		fireLayer0.hide();
		fireLayer1.hide();
		fireLayer2.hide();
		fireLayer3.hide();
		map.reorderLayer(surfaceMgmtLayer, 0);
		
		
		//function to get variable values from the URL to query for hunt planner hunt area.
		function getVariableByName(name) {
			var query = window.location.search.substring(1);
			var vars = query.split("&");
			for (var i=0; i < vars.length;i++){
				var variableName = vars[i].split('=');
				if (variableName[0] == name)
				{
					return variableName[1]
				}
			}
		}
		
		//get the variables of areaID (hunt area, IOG area, or Access Yes! area), layerID (which layer to apply the ID query to), and label (what will appear in the legend)	
		window.onload = function(){
			//set the dropdown lists back to default value ("None").
			$("#gmu").val('420'); //420 = value of none
			$("#elkzone").val('420');
			$("#chunt").val('420');
			var areaID = getVariableByName('val');
			var layerID = getVariableByName('lyr');
			var label = getVariableByName('lbl');
			if (typeof label != 'undefined'){
				var cleanLabel = label.split('+').join(' ');
				label = cleanLabel;
			} else {
				label = "Selected Hunt Area";
			}
			if (typeof areaID != 'undefined'){
				doQuery(areaID, layerID, label);
			}
			$("#queryLabel").text(label);
		}
		
		//toggle query layer on/off when checkbox is toggled on/off
		$("#queryCheckbox").change(function(){	
		 if ($(this).prop('checked')) {
		  queryLayer.show();
		  console.log("QUERY SHOW");
		 } else {
		  queryLayer.hide();
		  console.log("QUERY HIDE");
		 }
		});
		//uncheck fire Layer Checkboxes
		$("#fireLayersCheckbox").prop("checked", false);
		$("#fireLayer0Checkbox").prop("checked", false);
		$("#fireLayer1Checkbox").prop("checked", false);
		$("#fireLayer2Checkbox").prop("checked", false);
		$("#fireLayer3Checkbox").prop("checked", false);
		//toggle all fireLayers off when the fireLayersCheckbox is unchecked.
		$("#fireLayersCheckbox").change(function(){	
		 if ($(this).prop('checked')== false) { 
				fireLayer0.hide();
				fireLayer1.hide();
				fireLayer2.hide();
				fireLayer3.hide();
				$("#fireLayer0Checkbox").prop("checked", false);
				$("#fireLayer1Checkbox").prop("checked", false);
				$("#fireLayer2Checkbox").prop("checked", false);
				$("#fireLayer3Checkbox").prop("checked", false);
		 }
		});
		  //toggle fireLayer0 on/off when checkbox is toggled on/off
			$("#fireLayer0Checkbox").change(function(){	
			 if ($(this).prop('checked')) {
				fireLayer0.show();
				$("#fireLayersCheckbox").prop("checked", true);
			 } else {
				fireLayer0.hide();
			 }
			});
			//toggle fireLayer1 on/off when checkbox is toggled on/off
			$("#fireLayer1Checkbox").change(function(){	
			 if ($(this).prop('checked')) {
				fireLayer1.show();
				$("#fireLayersCheckbox").prop("checked", true);
			 } else {
				fireLayer1.hide();
			 }
			});
			//toggle fireLayer2 on/off when checkbox is toggled on/off
			$("#fireLayer2Checkbox").change(function(){	
				 if ($(this).prop('checked')) {
					fireLayer2.show();
					$("#fireLayersCheckbox").prop("checked", true);
				 } else {
					fireLayer2.hide();
				 }
			});
			//toggle fireLayer3 on/off when checkbox is toggled on/off
			$("#fireLayer3Checkbox").change(function(){	
				 if ($(this).prop('checked')) {
					fireLayer3.show();
					$("#fireLayersCheckbox").prop("checked", true);
				 } else {
					fireLayer3.hide();
				 }
			});		
			
		//get variable values from the dropdown lists in the hunt modal window and run doQuery.
		$(".target1").change(function(){
			$("#elkzone").val('420');
			$("#chunt").val('420');
			var gmu = $('#gmu').val();
			var areaID = gmu;
			var layerID = "0";
			var label = $("#gmu option:selected").text();
			console.log ("GMU ID: " + areaID + ", GMU LABEL: " + label);
			
			if (typeof label != 'undefined'){
				label = label;
			} else {
				label = "Selected Hunt Area";
			}
			if (typeof areaID != 'undefined'){
				doQuery(areaID, layerID, label);
			}
			$("#queryLabel").text(label);
			
			$("#huntModal").modal('hide');
		});
		
		
		$(".target2").change(function(){
			$("#gmu").val('420');
			$("#chunt").val('420');
			var elkzone = $('#elkzone').val();
			var areaID = elkzone;
			var layerID = "0";
			var label = ($("#elkzone option:selected").text()) + " Elk Zone";
			console.log ("ELK ZONE ID: " + areaID + ", ELK ZONE LABEL: " + label);
			
			if (typeof label != 'undefined'){
				label = label;
			} else {
				label = "Selected Hunt Area";
			}
			if (typeof areaID != 'undefined'){
				doQuery(areaID, layerID, label);
			}
			$("#queryLabel").text(label);
			
			$("#huntModal").modal('hide');
		});
		
		$(".target3").change(function(){
			$("#elkzone").val('420');
			$("#gmu").val('420');
			var chunt = $('#chunt').val();
			var areaID = chunt;
			var layerID = "0";
			var label = $("#chunt option:selected").text();
			console.log ("CHUNT ID: " + areaID + ", CHUNT LABEL: " + label);
			
			if (typeof label != 'undefined'){
				label = label;
			} else {
				label = "Selected Hunt Area";
			}
			if (typeof areaID != 'undefined'){
				doQuery(areaID, layerID, label);
			}
			$("#queryLabel").text(label);
			
			$("#huntModal").modal('hide');
		});
		
		$("#btnClearHighlighted").click(function(){
			queryLayer.clear();
			$("#queryLabelDiv").hide();
			$("#gmu").val('420');
			$("#elkzone").val('420');
			$("#chunt").val('420');
		})

		
		function doQuery(areaID, layerID, label) {
			//initialize query tasks
			newQueryTask = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/HuntPlanner_V2/MapServer/" + layerID);

			//initialize query
			newQuery = new Query();
			newQuery.returnGeometry = true;
			newQuery.outFields = ["ID"]
			newHighlight = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([154,32,219]), 3),
				new Color([154,32,219,0.1])
			);
			newQuery.where = "ID = '"+ areaID + "'"
			console.log ("Area Query " + newQuery.where + ", LayerID = " + layerID);
			newQueryTask.execute (newQuery, showResults);
		}
			
		function showResults(featureSet) {
			//remove all query layer graphics
			queryLayer.clear();

			//Performance enhancer - assign featureSet array to a single variable.
			var newFeatures = featureSet.features;

			//Loop through each feature returned
			for (var i=0, il=newFeatures.length; i<il; i++) {
				//Get the current feature from the featureSet.
				//Feature is a graphic
				var newGraphic = newFeatures[i];
				newGraphic.setSymbol(newHighlight);

				//Set the infoTemplate.
				//newGraphic.setInfoTemplate(infoTemplate);

				//Add graphic to the map graphics layer.
				queryLayer.add(newGraphic);
				
				//Zoom to graphics extent.
				var selectionExtent = esri.graphicsExtent(newFeatures);
				map.setExtent(selectionExtent.expand(1.25), true);
			}
			
			//Populate the queryLabel Div that will show the query result label in the legend.
			$("#queryLabelDiv").show();
			$("#queryCheckbox").prop('checked', true);
		}

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

		// Geosearch functions
		$("#btnGeosearch").click (function(){
		geosearch();
		});

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
				clearPlaceLayer();
				
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
		
		var sym = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 28,
			new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
			new Color([255,255,255]), 2),
			new Color ([29,0,255]));

		//add graphic to show geocode results
		function addPlaceGraphic(item,symbol)  {
			var place = {};
			var attributes,infoTemplate,pt, graphic;
			pt = item.feature.geometry;
			place.address = item.name;
			// Graphic components
			attributes = { address:place.address, lat:pt.getLatitude().toFixed(2), lon:pt.getLongitude().toFixed(2) };   
			infoTemplate = new InfoTemplate("${address}","Latitude: ${lat}<br/>Longitude: ${lon}");
			console.log("placeLayer loaded");
			graphic = new Graphic(pt,symbol,attributes,infoTemplate);
			// Add to map
			placeLayer.add(graphic);  
		}
		
		//clear place search graphics layer
		$("#btnClearPlace").click (function(){
				placeLayer.clear();
		});
		
		//zoom to place searched for.
		function zoomToPlaces(places) {
			var multiPoint = new Multipoint(map.spatialReference);
			for (var i = 0; i < places.length; i++) {
				//multiPoint.addPoint(places[i].location);
				multiPoint.addPoint(places[i].feature.geometry);
			}
			map.setExtent(multiPoint.getExtent().expand(2.0));
		}
		
		//the user inputs a long, lat coordinate and a flag icon is added to that location and the location is centered and zoomed to on the map.
		$("#btnCoordZoom").click (function(){
			zoomToCoordinate();
		});
		
		//zoom to the coordinate and add a graphic
		function zoomToCoordinate(){
			var zoomToGraphic;
			//if(zoomToGraphic) {
						 //zoomToLayer.remove(zoomToGraphic);
					//}
			var longitude = $("#longitudeInput").val();
			var latitude = $("#latitudeInput").val();
			var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 28,
			new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
			new Color([255,255,255]), 2),
			new Color ([0,0,0]));
			var pt = new esri.geometry.Point(longitude, latitude);
			var labelSymbol = new TextSymbol(longitude + ", " + latitude);
			labelSymbol.setColor (new esri.Color("black"));
			var font = new Font();
			font.setSize("14pt");
			font.setFamily("Helvetica");
			font.setWeight(Font.WEIGHT_BOLD);
			labelSymbol.setFont(font);
			labelSymbol.setHorizontalAlignment("left");
			labelSymbol.setVerticalAlignment("middle");
			labelSymbol.setOffset(17, 0);
			console.log("zoomToLabel: " + longitude + ", " + latitude);
			zoomToGraphic = new Graphic(pt, symbol);
			zoomToLabel = new Graphic(pt, labelSymbol);
			zoomToLayer.add(zoomToGraphic);
			zoomToLabelLayer.add(zoomToLabel);
			map.centerAndZoom(pt, 12);
		}
		
		//clear coordinate search graphics layer
		$("#btnClear").click (function(){
			zoomToLayer.clear();
			zoomToLabelLayer.clear();
		});

		//add the measurement tools
		//esriConfig.defaults.geometryService = new GeometryService("https://fishandgame.idaho.gov/gis/rest/services/Utilities/Geometry/GeometryServer");
		var pms = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
			new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([165, 24, 221, .55], 1)));
			pms.setColor(new Color([165, 24, 221, .55]));
			pms.setSize("8");
		var sls = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
			new Color([165, 24, 221, .55]), 3);
		
		var measurement = new Measurement({
			map: map,
			lineSymbol:sls,
			pointSymbol:pms
		}, dom.byId("measurementDiv"));
		measurement.startup();
		
		/*$("#measurementModal").draggable({
			handle:".modal-header"
		});*/
		
		measurement.on("measure-end", function () {
			console.log(measurement.activeTool);
			measurement.setTool(measurement.activeTool, false);
			var resultValue = measurement.resultValue.domNode.innerHTML;
			var copyResultValue = document.getElementById('Results');
			copyResultValue.innerHTML = resultValue;
			$("#measureResultsDiv").show();
			$("#measureResultsDiv").effect("highlight", {color: 'yellow'}, 3000);
			$("#clearMeasureResults").click(function(){
				measurement.clearResult();
				$("#measureResultsDiv").hide();	
			});
		});

		//add the Draw toolbar.
		var toolbar;
		map.on("load", createToolbar);
	
		// loop through all dijits, connect onClick event
		// listeners for buttons to activate drawing tools
		registry.forEach(function(d) {
			// d is a reference to a dijit
			// could be a layout container or a button
			if ( d.declaredClass === "dijit.form.Button" ) {
				d.on("click", activateTool);
			}
		});
		
		function activateTool() {
			var tool;
			/* if (this.label === "Add Text") {
			console.log ("Add Text");
			toolbar.activate(Draw.POINT);
			} else { */
			tool = this.label.toUpperCase().replace(/ /g, "_");
			toolbar.activate(Draw[tool]);
			//}
			$("#drawModal").modal('toggle');
		}

		function createToolbar(themap) {
			toolbar = new Draw(map);
			toolbar.on("draw-end", addToMap);
		}

		function addToMap(evt) {
			var symbol;
			toolbar.deactivate();
			switch (evt.geometry.type) {
				/*case "point":
					symbol= new TextSymbol($("#userTextBox").val()).setColor(
						new Color([255, 0, 0])).setFont(
						new Font("16pt").setWeight(Font.WEIGHT_BOLD)).setHorizontalAlignment("left");
					break;*/
				case "multipoint":
					symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 15,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([255,255,0]),0.5),
						new Color([255,255,0]));
					break;
				case "polyline":
					symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([255,255,0]),2);
					break;
				default:
					symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
					new Color([255,255,0]),2),
					new Color([255,255,0,0.25]));
					break; 
			}
			var drawGraphic = new Graphic(evt.geometry, symbol);
			drawToolbarLayer.add(drawGraphic);
		}
		
		
		//fire the text graphic in a separate graphics layer than the other draw symbols otherwise it will show as just a point when using the PrintTask GP Tool.
		$("#dijit_form_Button_10_label").on("click", drawPoint);
		
		//active the draw.POINT tool
		var pointTool;
		function drawPoint(){
			//change the tooltip text for the Draw.POINT tool.
			esri.bundle.toolbars.draw.addPoint = "Click to add text to the map.";
			pointTool = new Draw(map);
			console.log("Activate point tool");
			pointTool.activate(Draw.POINT);
			pointTool.on("draw-end", addText);
		}
		//add text to the point
		function addText(evt){
			pointTool.deactivate();
			var userText = $("#userTextBox").val();
			var textSymbol= new TextSymbol(userText);
			textSymbol.setColor (new esri.Color("black"));
			var font = new Font();
			font.setSize("14pt");
			font.setFamily("Helvetica");
			font.setWeight(Font.WEIGHT_BOLD);
			textSymbol.setFont(font);
			var textGraphic = new Graphic(evt.geometry, textSymbol);
			drawTextLayer.add(textGraphic);
		};
		
	//clear all shape graphics
	$("#btnClearGraphic").click (function(){
		drawToolbarLayer.clear();
	});
	//clear all text graphics
	$("#btnClearText").click (function(){
		drawTextLayer.clear();
	});
		
	//Create PDF using PrintTask	
  $("#btnPDF").click (function(){
		console.log("Start Printing");
    submitPrint(); 
  });
	
	$("#pdfModal").on('hidden.bs.modal', function(){
		dojo.byId("printStatus").innerHTML = "";
	});
		
	function submitPrint() {
	var printParams = new PrintParameters();
		printParams.map = map;
		var status = dojo.byId("printStatus");
		status.innerHTML = "Creating PDF Map...";
		$("#loadingPrint").show();
		
	var template = new PrintTemplate();
	var printTitle = $("#txtTitle").val();
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
				var PDFwindow = window.open(response.url.replace("sslifwisiis","fishandgame.idaho.gov"));
				if (typeof(PDFwindow) == 'undefined') {
					alert("Your browser tried to open the PDF in a new window.  Although this is a safe file, your security settings prevented it from being opened in a new window. Please disable your pop-up blocker and try creating a PDF again.");
				}
				$("#pdfModal").modal('hide');
				$("#loadingPrint").hide();
      });
	  
      deferred.addErrback(function (error) {
        console.log("Print Task Error = " + error);
        status.innerHTML = error;
				
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
		// help nav1 menu is selected
		$("#helpNav1").click(function(e){
			$("#helpModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// help nav2 menu is selected
		$("#helpNav2").click(function(e){
			$("#helpModal").modal("show"); 
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
