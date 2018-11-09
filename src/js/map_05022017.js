require([
	"esri/config",
	"esri/urlUtils",
	"esri/map",
	"esri/dijit/LocateButton",
	"esri/dijit/Scalebar",
	"esri/request",
	"esri/geometry/scaleUtils",
	"esri/layers/FeatureLayer",
	"esri/renderers/SimpleRenderer",
	"esri/symbols/PictureMarkerSymbol",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/TextSymbol",
	"esri/symbols/Font",
	"esri/Color",
	"esri/geometry/Point",
	"esri/geometry/Multipoint", 
	"esri/arcgis/utils",
	"esri/geometry/webMercatorUtils",
	"esri/layers/GraphicsLayer",
	"esri/dijit/LayerList",
	"esri/layers/ArcGISTiledMapServiceLayer",
	"esri/layers/VectorTileLayer",
	"esri/dijit/BasemapLayer",
	"esri/dijit/Basemap",
	"esri/dijit/BasemapGallery",
	"esri/dijit/Popup",
	"esri/InfoTemplate",
	"esri/dijit/PopupTemplate",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/WMSLayer",
	"esri/tasks/QueryTask",
	"esri/tasks/query",
	"esri/dijit/Search",
	"esri/geometry/Extent",
	"esri/tasks/GeometryService",
	"esri/dijit/Measurement",
	"esri/toolbars/draw",
	"esri/graphic",
	"esri/tasks/PrintParameters",
	"esri/tasks/PrintTemplate",
	"esri/tasks/PrintTask",
	"dojo/dom",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/json",
	"dojo/on",
	"dojo/parser",
	"dojo/query",
	"dojo/sniff",
	"dojo/_base/connect",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dijit/registry",
	"dojo/domReady!"
],
	function (
	esriConfig, urlUtils, Map, LocateButton, Scalebar, request, scaleUtils, FeatureLayer, SimpleRenderer, PictureMarkerSymbol, SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, TextSymbol, Font, Color, Point, Multipoint, arcgisUtils, webMercatorUtils, GraphicsLayer, LayerList, ArcGISTiledMapServiceLayer, VectorTileLayer, BasemapLayer, Basemap, BasemapGallery, Popup, InfoTemplate, PopupTemplate, ArcGISDynamicMapServiceLayer, WMSLayer, QueryTask, Query, Search, Extent, GeometryService, Measurement, Draw, Graphic, PrintParameters, PrintTemplate, PrintTask, dom, domClass, domConstruct, JSON, on, parser, query, sniff, connect, arrayUtils, lang, registry
) {
		//Proxy settings
 		esriConfig.defaults.io.proxyUrl = "https://fishandgame.idaho.gov/ifwis/gis_proxy/proxy.ashx?";
		esriConfig.defaults.io.alwaysUseProxy = false;
		esriConfig.defaults.io.corsDetection = false;
		/*
		 urlUtils.addProxyRule({
		 urlPrefix: "http://wildfire.cr.usgs.gov/",
		 proxyUrl: "https://fishandgame.idaho.gov/ifwis/gis_proxy/proxy.ashx"
		 });*/

		// call the parser to create the dijit layout dijits
		parser.parse(); // note djConfig.parseOnLoad = false;

		//hide the loading icon after the window has loaded.
		$(window).load(function () {
				$("#loading").hide();
				clearFileInputField(uploadForm);
		});

		setTimeout(function(){
				$("#loading").hide();
		}, 5000);

		//create a popup div
		var popup = new Popup({
				titleInBody: false
		}, domConstruct.create("div"));

		//Get a reference to the ArcGIS Map class
		map = Map("mapDiv", {

				center: [-114.52, 45.50],
				zoom: 6,
				autoResize: true,
				infoWindow: popup
		});
		
 		var defaultBasemap1 = new ArcGISTiledMapServiceLayer("https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer");
		var defaultBasemap2 = new VectorTileLayer("https://www.arcgis.com/sharing/rest/content/items/86d5ed4b6dc741de9dad5f0fbe09ae95/resources/styles/root.json?f=pjson");
		map.addLayers([defaultBasemap1,defaultBasemap2]);

		//create a domClass to customize the look of the popup window
		domClass.add(map.infoWindow.domNode, "myTheme");

		//LocateButton will zoom to where you are.  If tracking is enabled and the button becomes a toggle that creates an event to watch for location changes.
		var locateSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
						new Color([215, 73, 255, 0.8]), 8),
				new Color([199, 0, 255, 0.8]));

		geoLocate = new LocateButton({
				map: map,
				symbol: locateSymbol,
				scale: 36111.909643
				//useTracking: true
		}, "LocateButton");
		geoLocate.startup();

		//add scalebar
		scalebar = new Scalebar({
				map: map,
				scalebarUnit: "dual"
		});

		var queryLayer, queryLabelLayer, placeLayer, zoomToLayer, zoomToLabelLayer, drawToolbarLayer, drawTextLayer;
		map.on("load", function () {
				//after map loads, connect to listen to mouse move & drag events
				map.on("mouse-move", showCoordinates);
				map.on("mouse-drag", showCoordinates);
				//add graphics layer for the hunt areas queries
				queryLayer = new GraphicsLayer();
				map.addLayer(queryLayer);
				queryLabelLayer = new GraphicsLayer();
				map.addLayer(queryLabelLayer);
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
				map.reorderLayer(drawTextLayer, 1);
		});

		//show coordinates as the user scrolls around the map. In Desktop, it displays where ever the mouse is hovering.  In mobile, the user must tap the screen to get the coordinates.
		function showCoordinates(evt) {
				//the map is in web mercator but display coordinates in geographic (lat, long) & UTM NAD 27 Zone 11 & 12
				var utm11SR = new esri.SpatialReference({wkid: 26711});
				var utm12SR = new esri.SpatialReference({wkid: 26712});
				var gsvc = new esri.tasks.GeometryService("//tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
				var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
				//display mouse coordinates
				$("#info1").html("WGS84 DD: " + mp.x.toFixed(3) + ", " + mp.y.toFixed(3));
				if (mp.x <= -114 && mp.x >= -120) { //if hovering in zone 11
						gsvc.project([evt.mapPoint], utm11SR, function (result) {
								$("#info2").show();
								$("#info2").html("NAD27 UTM 11T: " + result[0].x.toFixed() + ', ' + result[0].y.toFixed());
						});
				} else if (mp.x > -114 && mp.x <= -108) { //if hovering in zone 12
						gsvc.project([evt.mapPoint], utm12SR, function (result) {
								$("#info2").show();
								$("#info2").html("NAD27 UTM 12T: 0" + result[0].x.toFixed() + ', ' + result[0].y.toFixed());
						});
				} else {
						$("#info2").hide();
				}
		}

		//add the basemap gallery, in this case we'll display maps from ArcGIS.com
		basemapGallery = new BasemapGallery({
				showArcGISBasemaps: false,
				map: map,
		}, "basemapDiv");
		basemapGallery.startup();

		basemapGallery.on("error", function (msg) {
				console.log("basemap gallery error:  ", msg);
		});

		//Add the World Topo basemap to the basemap gallery.
		var worldTopo = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"});
		var worldTopoBasemap = new Basemap({
				layers: [worldTopo],
				title: "Esri World Topographic",
				thumbnailUrl: "src/images/world_topo.png"
		});
		basemapGallery.add(worldTopoBasemap);
		
		//Add the Imagery basemap to the basemap gallery.
		 var Imagery = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"});
		 var imageryBasemap = new Basemap({
				layers: [Imagery],
				title: "Esri Satellite Imagery",
				thumbnailUrl: "src/images/world_imagery.png"
		 });
		 basemapGallery.add(imageryBasemap);

		//Add the USA Topo basemap to the basemap gallery.
		var usgsTopo = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer"});
		var usgsBasemap = new Basemap({
				layers: [usgsTopo],
				title: "Esri USGS Topographic",
				thumbnailUrl: "src/images/usa_topo.jpg"
		});
		basemapGallery.add(usgsBasemap);
		
		//Add the USGS topo basemap to the basemap gallery.
		var usgsTopo = new BasemapLayer({url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer"});
		var usgsTopoBasemap = new Basemap({
				layers: [usgsTopo],
				title: "USGS National Map",
				thumbnailUrl: "src/images/usgstopo.jpg"
		});
		basemapGallery.add(usgsTopoBasemap);
		
		//Add the World Topo Vector basemap to the basemap gallery.
		 var Hillshade = new BasemapLayer({url: "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer"});
		 var worldTopoHigh = new BasemapLayer({
				styleUrl: "https://www.arcgis.com/sharing/rest/content/items/86d5ed4b6dc741de9dad5f0fbe09ae95/resources/styles/root.json?f=pjson",
				type: "VectorTileLayer"
		 });
		 var worldTopoHighBasemap = new Basemap({
				layers: [Hillshade,worldTopoHigh],
				title: "Esri Hi-Res World Topographic",
				thumbnailUrl: "src/images/topoHigh.jpg"
		 });
		 basemapGallery.add(worldTopoHighBasemap);

		//Add the Imagery with Labels basemap to the basemap gallery.
		 var Imagery = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"});
		 var Reference = new BasemapLayer({
				styleUrl: "https://www.arcgis.com/sharing/rest/content/items/af6063d6906c4eb589dfe03819610660/resources/styles/root.json?f=pjson",
				type: "VectorTileLayer"
		 });
		 var imageryLabelBasemap = new Basemap({
				layers: [Imagery,Reference],
				title: "Esri Imagery w/Labels",
				thumbnailUrl: "src/images/imageryLabels.jpg"
		 });
		 basemapGallery.add(imageryLabelBasemap);
		 
/* 		//Add the World Navigation (simple - like Google Maps) basemap to the basemap gallery.
		 var simple = new BasemapLayer({
				styleUrl: "https://www.arcgis.com/sharing/rest/content/items/e19e9330bf08490ca8353d76b5e2e658/resources/styles/root.json?f=pjson",
				type: "VectorTileLayer"
		 });
		 var simpleBasemap = new Basemap({
				layers: [simple],
				title: "Esri Hi-Resolution Simple",
				thumbnailUrl: "src/images/simple.jpg"
		 });
		 basemapGallery.add(simpleBasemap); */

/* 		//Add the National Geographic basemap to the basemap gallery.
		var natGeo = new BasemapLayer({url: "https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer"});
		var natGeoBasemap = new Basemap({
				layers: [natGeo],
				title: "Esri Natl Geographic",
				thumbnailUrl: "src/images/natl_geo.png"
		});
		basemapGallery.add(natGeoBasemap); */
		
/* 		//Add the OpenStreetMap basemap to the basemap gallery.
		var osm = new Basemap({
			layers: [new BasemapLayer({
				type: "OpenStreetMap"
			})],
			id: "osm",
			title: "Open Street Map",
			thumbnailUrl: "src/images/osm.jpg"
		});
		basemapGallery.add(osm); */
			
		//Remove the default "basemaps" if one of the other basemaps are selected.
		/* $("#basemapDiv").click(function () {
				//Remove the default "basemap" layers once a user has selected a basemap.
				map.removeLayer(defaultBasemap1);
				map.removeLayer(defaultBasemap2);
		}); */
	
		//You cannot print vector basemaps. :(  Disable the 'Create Map!' button when they are selected.
		/* if (defaultBasemap1.visible == true || defaultBasemap1.visible === true )
			{
				$("#btnPDF").prop('disabled', true);
				$("#pdfNote").hide();
				$("#wrongBasemap").show();
			}
		$("#galleryNode_basemap_4, #galleryNode_basemap_5").click(function() {
			$("#btnPDF").prop('disabled', true);
			$("#pdfNote").hide();
			$("#wrongBasemap").show();
		
		//Enable the 'Create Map!' button when printable basemaps are selected.
		});
		$("#galleryNode_basemap_0, #galleryNode_basemap_1, #galleryNode_basemap_2, #galleryNode_basemap_3").click(function() {
			$("#btnPDF").prop('disabled', false);
			$("#pdfNote").show();
			$("#wrongBasemap").hide();
		}); */
		
		//infoTemplate for the Big Game hunting restrictions layer
		var _bigGameHuntResInfoTemplate = new InfoTemplate();
		_bigGameHuntResInfoTemplate.setTitle("Big Game Hunting Restriction");
		_bigGameHuntResInfoTemplate.setContent(
				"<b>Area: </b>${Closed_Are}<br/>" +
				"<b>Restriction: </b>${Comments}</br>"
		);
		var _uplandGameBirdTurkeyHuntResInfoTemplate = new InfoTemplate();
		_uplandGameBirdTurkeyHuntResInfoTemplate.setTitle("Upland Game Bird/Turkey Hunting Restriction");
		_uplandGameBirdTurkeyHuntResInfoTemplate.setContent(
				"<b>Area: </b>${Closed_Are}<br/>" +
				"<b>Restriction: </b>${Comments}</br>"
		);
		var _uplandGameHuntResInfoTemplate = new InfoTemplate();
		_uplandGameHuntResInfoTemplate.setTitle("Upland Game Hunting Restriction");
		_uplandGameHuntResInfoTemplate.setContent(
				"<b>Area: </b>${Closed_Are}<br/>" +
				"<b>Restriction: </b>${Comments}</br>"
		);
		var _waterfowlHuntResInfoTemplate = new InfoTemplate();
		_waterfowlHuntResInfoTemplate.setTitle("Waterfowl Hunting Restriction");
		_waterfowlHuntResInfoTemplate.setContent(
				"<b>Area: </b>${Closed_Are}<br/>" +
				"<b>Restriction: </b>${Comments}</br>"
		);

		//popup window template for the Campground feature layer
		var campgroundPopupTemplate = new PopupTemplate({
				title: "Campground Info",
				fieldInfos: [{
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
				"<b>Number of Sites: </b>${Sites}</br>" +
				"<b>Max # of Days at Site*: </b>${Max_Length}</br>" +
				"<b>* </b> 0 = No Limit</br>" +
				"<b>Site Administrator: </b>${Type}</br>"
		);

		//popup window template for the fire closure feature layer.
		var closurePopupTemplate = new PopupTemplate({
				title: "Fire Closure Info",
				fieldInfos: [{
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

		//popup window template for the fire perimeter feature layer. NO WILDFIRES AT THIS TIME.  Keep for next year.
	 /*  var perimeterPopupTemplate = new PopupTemplate({
				title: "{fire_name} Fire",
				fieldInfos: [{
						fieldName: "incidentname", visible: true,
						fieldName: "gisacres", visible: true,
						fieldName: "active", visible: true,
						fieldName: "inciwebid", visible: true
				}]
		});
		perimeterPopupTemplate.setContent(
				"<b>Acres: </b>${gisacres}<br/>" +
				"<b>Active (Y/N): </b>${active}</br/>" +
				"<b><a target='_blank' href=//inciweb.nwcg.gov/incident/${inciwebid}>Click for InciWeb Information</a></b>"
		); */

		//add layers (or groups of layers) to the map.
		huntLayers = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/Hunting/MapServer",
			 {id: "Hunt_Related_Layers"});
		huntLayers.setInfoTemplates({
			13: {infoTemplate: _bigGameHuntResInfoTemplate},
			14: {infoTemplate: _uplandGameBirdTurkeyHuntResInfoTemplate},
			15: {infoTemplate: _uplandGameHuntResInfoTemplate},
			16: {infoTemplate: _waterfowlHuntResInfoTemplate}
		});						
		adminLayers = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/AdministrativeBoundaries/MapServer",
			 {id: "Administrative_Boundaries"});
/* 		surfaceMgmtLayer = new esri.layers.ArcGISTiledMapServiceLayer("https://gis.blm.gov/arcgis/rest/services/lands/BLM_Natl_SMA_Cached_without_PriUnk/MapServer",
		{
			id: "Land_Management_Layer",
			opacity: 0.5
		}); */
		surfaceMgmtLayer = new esri.layers.ArcGISTiledMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Basemaps/SurfaceMgmt_BLMsymbology/MapServer",
		{
			id: "Land_Management_Layer",
			opacity: 0.7
		});
		var trailLayers = new ArcGISDynamicMapServiceLayer("https://gis2.idaho.gov/arcgis/rest/services/DPR/Idaho_Trails_Map/MapServer",
			{id:"Roads_&_Trails_(zoom_in_to_activate)"});
		trailLayers.setVisibleLayers([4,5,6,7,8,9,10,11,12,13]);
		campgroundLayer = new FeatureLayer("https://gis2.idaho.gov/arcgis/rest/services/ADM/Campgrounds/MapServer/0",
			{
				id: "Campgrounds",
				outFields: ["*"],
				infoTemplate: campgroundPopupTemplate
			});
		fireLayer0 = new FeatureLayer("https://fishandgame.idaho.gov/gis/rest/services/External/InciWeb_FireClosures/MapServer/0",
			{
				id: "Fire_Emergency_Closure_Areas",
				outFields: ['NAME', 'URL', 'UPDATE_'],
				infoTemplate: closurePopupTemplate
			});
		/* fireLayer1 = new FeatureLayer("https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/2",
			{
				id: "Active_Fire_Perimeter",
				outFields: ['gisacres', 'active', 'incidentname', 'inciwebid'],
				infoTemplate: perimeterPopupTemplate
			});
		fireLayer2 = new FeatureLayer("https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/4",
			{
				id: "Inactive_Fire_Perimeters",
				outFields: ['gisacres', 'active', 'incidentname', 'inciwebid'],
				infoTemplate: perimeterPopupTemplate
			}); */
		fireLayer3 = new FeatureLayer("https://rmgsc.cr.usgs.gov/ArcGIS/rest/services/geomac_dyn/MapServer/23",
			{
			id: "Past_Fire_Perimeters",
			opacity: "0.7"
			});
 		fireLayer4 = new WMSLayer("https://fsapps.nwcg.gov/afm/cgi-bin/mapserv.exe?map=conus.map&", {
			id: "MODIS_Fire_Detection",
			opacity: "0.4",
			version: "1.1.1",
			visibleLayers: [4,5,6],
			format: "png"
		});
		
		fireLayer3.setDefinitionExpression("year_ in ('2012','2013','2014','2015','2016')");
		map.addLayers([surfaceMgmtLayer, fireLayer4, fireLayer3, fireLayer0, adminLayers, huntLayers, trailLayers, campgroundLayer]);
		adminLayers.hide(); //So none of the layers are "on" except the GMU layer when the map loads.
		surfaceMgmtLayer.hide();
		trailLayers.hide();
		campgroundLayer.hide();
		fireLayer0.hide();
		fireLayer3.hide();
		fireLayer4.hide();

		//Add a table of contents using the layerList widget. Layers can be toggled on/off. Symbology is displayed.  Each "layer group" has a transparency slider.
		var layerList = new LayerList({
			map: map,
			removeUnderscores: true,
			showLegend: true,
			showSubLayers: true,
			showOpacitySlider: true,
			layers: [
				{
					layer: surfaceMgmtLayer
				}, {
					layer: trailLayers
				}, {
					layer: campgroundLayer
				}, {
					layer: adminLayers
				}, {
					layer: huntLayers
				}
			]
		}, "tocDiv");
		layerList.startup();
		
		layerList.on("load", function() {
			//Expand the Hunt Related Layers group on load.
			//layerList._layersNode.firstElementChild.className += " esriListExpand";
			//Add disclaimer and layer source information.
			$("#tocDiv_checkbox_2").before("<div class='disclaimer'>IMPORTANT: Please be sure to obtain landowner permission before entering or crossing private lands. Land surface management data maintained by BLM. <a href='//cloud.insideidaho.org/webApps/metadataViewer/default.aspx?path=%5c%5cintranet.rocket.net%5cinsideprod%5cdata%5canonymous%5cblm%5cRLTY_SMA_PUB_24K_POLY.shp.xml' target='_blank'>Learn More</a></div>");
			$("#tocDiv_checkbox_1").before("<div class='disclaimer'>Roads & trails data maintained by IDPR. <a href='//www.trails.idaho.gov/trails/' target='_blank'>Learn More</a></div>");
			$("#tocDiv_checkbox_0").before("<div class='disclaimer'>Campground data maintained by IDPR. <a href='//parksandrecreation.idaho.gov/activities/camping' target='_blank'>Learn More</a></div>");
			$("#fireLayersCheckbox").before("<div class='disclaimer'>Please contact USFS national forests for all road and trail closures.</div");
			$("label[for=tocDiv_checkbox_1]").css("color", "#ccc");
		});
		
		//uncheck fire Layer Checkboxes
		$("#fireLayersCheckbox").prop("checked", false);
		$("#fireLayer0Checkbox").prop("checked", false);
		$("#fireLayer3Checkbox").prop("checked", false);
		$("#fireLayer4Checkbox").prop("checked", false);
		//toggle all fireLayers off when the fireLayersCheckbox is unchecked.
		$("#fireLayersCheckbox").change(function () {
				if ($(this).prop('checked')) {
						fireLayer0.show();
						fireLayer3.show();
						fireLayer4.show();
						$("#fireLayer0Checkbox").prop("checked", true);
						$("#fireLayer3Checkbox").prop("checked", true);
						$("#fireLayer4Checkbox").prop("checked", true);
						} else {
						fireLayer0.hide();
						fireLayer3.hide();
						fireLayer4.hide();					
						$("#fireLayer0Checkbox").prop("checked", false);
						$("#fireLayer3Checkbox").prop("checked", false);
						$("#fireLayer4Checkbox").prop("checked", false);
				}
		});
		//toggle fireLayer0 on/off when checkbox is toggled on/off
		$("#fireLayer0Checkbox").change(function () {
			if ($(this).prop('checked')) {
					fireLayer0.show();
					$("#fireLayersCheckbox").prop("checked", true);
			} else {
					fireLayer0.hide();
					$("#fireLayersCheckbox").prop("checked", false);
			}
		});
		//toggle fireLayer3 on/off when checkbox is toggled on/off
		$("#fireLayer3Checkbox").change(function () {
			if ($(this).prop('checked')) {
					fireLayer3.show();
					$("#fireLayersCheckbox").prop("checked", true);
			} else {
					fireLayer3.hide();
					$("#fireLayersCheckbox").prop("checked", false);
			}
		});
		//toggle fireLayer4 on/off when checkbox is toggled on/off
		$("#fireLayer4Checkbox").change(function () {
			if ($(this).prop('checked')) {
					fireLayer4.show();
					$("#fireLayersCheckbox").prop("checked", true);
			} else {
					fireLayer4.hide();
					$("#fireLayersCheckbox").prop("checked", false);
			}
		});

		//Enable mobile scrolling by calling $('.selectpicker').selectpicker('mobile'). The method for detecting the browser is left up to the user. This enables the device's native menu for select menus.
		if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
				$('.selectpicker').selectpicker('mobile');
		}

		//function to get variable values from the URL to query for hunt planner hunt area and/or zoom to a specific center coordinate and zoom level if using a "shared" map view link.
		function getVariableByName(name) {
				var query = window.location.search.substring(1);
				var vars = query.split("&");
				for (var i = 0; i < vars.length; i++) {
						var variableName = vars[i].split('=');
						if (variableName[0] == name) {
								return variableName[1]
						}
				}
		}

		//get the variables of areaID (hunt area, IOG area, or Access Yes! area), layerID (which layer to apply the ID query to), and label (what will appear in the legend).
		var areaID, layerID, label, urlZoom, urlX, urlY, homeURL, zoomLevel, centerpoint, cX, cY, newURL, extentI, extentC;
		window.onload = function () {
			$('.selectpicker').selectpicker('val', '');
			areaID = getVariableByName('val');
			layerID = getVariableByName('lyr');
			label = getVariableByName('lbl');
			urlZoom = getVariableByName('zoom');
			urlX = getVariableByName('X');
			urlY = getVariableByName('Y');
			if (typeof label != 'undefined') {
					var str = label;
					var res = label.replace("%26", "&");
					var cleanLabel = res.split('+').join(' ');
					label = cleanLabel;
			} else {
					label = "Selected Hunt Area";
			}
			if (typeof areaID != 'undefined') {
					doQuery(areaID, layerID, label);
			}
			$("#queryLabel1").text(label);
			$("#queryLabel1Div").show();

			if (typeof urlZoom != 'undefined') {
					var point = new Point(urlX, urlY, new esri.SpatialReference({wkid: 4326}));
					map.setLevel(urlZoom);
					map.centerAt(point);
			}
		};

		//Change the Roads & Trails layer label depending on map scale.
		map.on("extent-change", function () {
				mapScale = map.getScale();
				if (mapScale < 4622324){
					$("label[for=tocDiv_checkbox_1]").css("color", "black");
					$("label[for=tocDiv_checkbox_1]").text("Roads & Trails");
				} else {
					$("label[for=tocDiv_checkbox_1]").css("color", "#ccc");
					$("label[for=tocDiv_checkbox_1]").text("Roads & Trails (zoom in to activate)");
				}
		});

		//toggle query layer on/off when checkbox is toggled on/off
		$("#queryCheckbox").change(function () {
				if ($(this).prop('checked')) {
						queryLayer.show();
						queryLabelLayer.show();
				} else {
						queryLayer.hide();
						queryLabelLayer.hide();
				}
		});

		var gmuID, elkID, chuntID, waterfowlID, gameDistributionID, newHighlight1, newHighlight2, newHighlight3, newHighlight4, newHighlight5;

		$("#btnQuery").click(function () {

				$("#loading").show();

				queryLayer.clear();
				queryLabelLayer.clear();
				$("#queryLabel1Div").hide();
				$("#queryLabel2Div").hide();
				$("#queryLabel3Div").hide();
				$("#queryLabel4Div").hide();
				$("#queryLabel5Div").hide();
				$("#kmlNav1").hide();
				$("#kmlNav2").hide();

				//get variable values from the dropdown lists in the hunt collapse window and run doQuery.
				if ($("#gmu").val()) {
						var gmuTypeValue = "";
						$("#gmu option:selected").each(function () {
								gmuTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						gmuID = gmuTypeValue.substring(0, gmuTypeValue.length - 1);
						//var layerID = "3";
						var label0 = $("#gmu option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = label0.join(", ");

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Hunt Area";
						}
						if (typeof gmuID != 'undefined') {
								doQuery1(gmuID, label);
						}
						$("#queryLabel1").text(label);
						$("#queryLabel1Div").show();

						//Create a KML of the user-selected GMUs, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var gmuKMLlink = "//fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/3/query?where=ID in (" + gmuID +
								")&outfields=NAME&f=kmz"
						$("#gmuKML").attr("href", gmuKMLlink);
						$("#gmuKML").show();
				}

				if ($("#elkzone").val()) {
						var elkzoneTypeValue = "";
						$("#elkzone option:selected").each(function () {
								elkzoneTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						elkID = elkzoneTypeValue.substring(0, elkzoneTypeValue.length - 1);
						//var layerID = "4";
						var label0 = $("#elkzone option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = "Elk Zones: " + label0.join(", ");

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Hunt Area";
						}
						if (typeof elkID != 'undefined') {
								doQuery2(elkID, label);
						}
						$("#queryLabel2").text(label);
						$("#queryLabel2Div").show();

						//Create a KML of the user-selected Elk Zones, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var elkzoneKMLlink = "https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/4/query?where=ID in (" +
								elkID + ")&outfields=NAME&f=kmz"
						$("#elkzoneKML").attr("href", elkzoneKMLlink);
						$("#elkzoneKML").show();
				}

				if ($("#chunt").val()) {
						var chuntTypeValue = "";
						$("#chunt option:selected").each(function () {
								chuntTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						chuntID = chuntTypeValue.substring(0, chuntTypeValue.length - 1);
						//var layerID = "5";
						var label0 = $("#chunt option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = label0.join(", ");

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Hunt Area";
						}
						if (typeof chuntID != 'undefined') {
								doQuery3(chuntID, label);
						}
						$("#queryLabel3").text(label);
						$("#queryLabel3Div").show();

						//Create a KML of the user-selected controlled hunts, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var chuntKMLlink = "https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/5/query?where=AreaID in (" +
								chuntID + ")&outfields=BigGame,HuntArea&f=kmz"
						$("#chuntKML").attr("href", chuntKMLlink);
						$("#chuntKML").show();
				}

				if ($("#waterfowl").val()) {
						var waterfowlTypeValue = "";
						$("#waterfowl option:selected").each(function () {
								waterfowlTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						waterfowlID = waterfowlTypeValue.substring(0, waterfowlTypeValue.length - 1);
						//var layerID = "6";
						var label0 = $("#waterfowl option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = label0.join(", ");

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Hunt Area";
						}
						if (typeof waterfowlID != 'undefined') {
								doQuery4(waterfowlID, label);
						}
						$("#queryLabel4").text(label);
						$("#queryLabel4Div").show();

						//Create a KML of the user-selected waterfowl hunt areas, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var waterfowlKMLlink = "https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/6/query?where=ID in (" +
								waterfowlID + ")&outfields=Area_Name&f=kmz"
						$("#waterfowlKML").attr("href", waterfowlKMLlink);
						$("#waterfowlKML").show();
				}

				if ($("#gameDistribution").val()) {
						var gameDistributionTypeValue = "";
						$("#gameDistribution option:selected").each(function () {
								gameDistributionTypeValue += "'" + $(this).val() + "',";
						})
						//Remove trailing comma
						gameDistributionID = gameDistributionTypeValue.substring(0, gameDistributionTypeValue.length - 1);
						//var layerID = "7";
						var label0 = $("#gameDistribution option:selected").map(function () {
								return $(this).text();
						}).get();
						var label = label0.join(", ") + " General Distribution";

						if (typeof label != 'undefined') {
								label = label;
						} else {
								label = "Selected Game Distribution";
						}
						if (typeof gameDistributionID != 'undefined') {
								doQuery5(gameDistributionID, label);
						}
						$("#queryLabel5").text(label);
						$("#queryLabel5Div").show();

						//Create a KML of the user-selected game animal distributions, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
						var gameDistributionKMLlink = "https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/7/query?where=ID in (" +
								gameDistributionID + ")&outfields=NAME&f=kmz"
						$("#gameDistributionKML").attr("href", gameDistributionKMLlink);
						$("#gameDistributionKML").show();
				}

				if ($("#gmu").val() != null || $("#elkzone").val() != null || $("#chunt").val() != null || $("#waterfowl").val() != null ||
						$("#gameDistribution").val() != null) {
						$("#kmlNav1").show();
						$("#kmlNav2").show();
						$("#kmlNav1").effect("highlight", {color: 'yellow'}, 3000);
						$("#kmlNav2").effect("highlight", {color: 'yellow'}, 3000);
				}
		});

		$("#btnClearHighlighted").click(function () {
				queryLayer.clear();
				queryLabelLayer.clear();
				$("#queryLabelDiv").hide();
				$('.selectpicker').selectpicker('val', '');
				$("#queryLabel1Div").hide();
				$("#queryLabel2Div").hide();
				$("#queryLabel3Div").hide();
				$("#queryLabel4Div").hide();
				$("#queryLabel5Div").hide();
				$("#kmlNav1").hide();
				$("#kmlCollapse").hide();
				$("#gmuKML").hide();
				$("#elkzoneKML").hide();
				$("#chuntKML").hide();
				$("#waterfowlKML").hide();
				$("#gameDistributionKML").hide();
		})

		function doQuery(areaID, layerID, label) {
				//initialize query tasks
				newQueryTask = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/" + layerID);

				//initialize query
				newQuery = new Query();
				newQuery.returnGeometry = true;
				newQuery.outFields = ["*"]
				newHighlight = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([154,32,219]), 3),
						new Color([154,32,219,0.1])
				);
				newHighlightHatched = new SimpleFillSymbol(SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([154,32,219]), 3),
						new Color([154,32,219])
				);

				newQuery.where = "ID IN (" + areaID + ")";
				newQueryTask.execute(newQuery, showResults);
		}

		function doQuery1(gmuID, label) {
				//initialize query tasks
				newQueryTask1 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/3");

				//initialize query
				newQuery1 = new Query();
				newQuery1.returnGeometry = true;
				newQuery1.outFields = ["ID", "NAME"]
				newHighlight1 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([154, 32, 219]), 3),
						new Color([154, 32, 219, 0.1])
				);

				newQuery1.where = "ID IN (" + gmuID + ")";
				newQueryTask1.execute(newQuery1, showResults1);
		}

		function doQuery2(elkID, label) {
				//initialize query tasks
				newQueryTask2 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/4");

				//initialize query
				newQuery2 = new Query();
				newQuery2.returnGeometry = true;
				newQuery2.outFields = ["ID", "NAME"]
				newHighlight2 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([0, 255, 255]), 3),
						new Color([0, 255, 255, 0.1])
				);

				newQuery2.where = "ID IN (" + elkID + ")";
				newQueryTask2.execute(newQuery2, showResults2);
		}

		function doQuery3(chuntID, label) {
				//initialize query tasks
				newQueryTask3 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/5");

				//initialize query
				newQuery3 = new Query();
				newQuery3.returnGeometry = true;
				newQuery3.outFields = ["FLAG", "AreaID", "BigGame", "HuntArea"]
				newHighlight3 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([18, 237, 18]), 3),
						new Color([18, 237, 18, 0.1])
				);
				newHighlight3Hatched = new SimpleFillSymbol(SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([18, 237, 18]), 3),
						new Color([18, 237, 18])
				);

				newQuery3.where = "AreaID IN (" + chuntID + ")";
				newQueryTask3.execute(newQuery3, showResults3);
		}

		function doQuery4(waterfowlID, label) {
				//initialize query tasks
				newQueryTask4 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/6");

				//initialize query
				newQuery4 = new Query();
				newQuery4.returnGeometry = true;
				newQuery4.outFields = ["ID", "Area_Name"]
				newHighlight4 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([255, 157, 0]), 3),
						new Color([255, 157, 0, 0.1])
				);

				newQuery4.where = "ID IN (" + waterfowlID + ")";
				newQueryTask4.execute(newQuery4, showResults4);
		}

		function doQuery5(gameDistributionID, label) {
				//initialize query tasks
				newQueryTask5 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/MapCenterQueryLayers/MapServer/7");

				//initialize query
				newQuery5 = new Query();
				newQuery5.returnGeometry = true;
				newQuery5.outFields = ["ID", "SCINAME", "NAME"]
				newHighlight5 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
						new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
								new Color([255, 0, 225]), 3),
						new Color([255, 0, 225, 0.1])
				);

				newQuery5.where = "ID IN (" + gameDistributionID + ")";
				newQueryTask5.execute(newQuery5, showResults5);
		}

		//Funtion to open the hunting restrictions dialog if a hunter has queried a "flagged" hunt.
		function showAlert() {
				$("#huntWarningModal").modal('show');
		}

		function showResults(featureSet) {
				//Performance enhancer - assign featureSet array to a single variable.
				var newFeatures = featureSet.features;
				//Loop through each feature returned
				for (var i = 0, il = newFeatures.length; i < il; i++) {
						//Get the current feature from the featureSet.
						//Feature is a graphic
						var geometry = featureSet.geometry;
						var newGraphic = newFeatures[i];
						var polyExtent = newGraphic.geometry.getExtent();
						var polyCenter = polyExtent.getCenter();
						newGraphic.setSymbol(newHighlight);
						var queryMapLabel = label;

						//Add graphic to the map graphics layer.
						queryLayer.add(newGraphic);

						//If the selected hunt is "flagged" aka has further restrictions, give it hatched symbology as well.
						if (newGraphic.attributes.FLAG == 1){
								newGraphic.setSymbol(newHighlightHatched);
								showAlert();
						} else {
								newGraphic.setSymbol(newHighlight);
						}

						//Add label to the graphics.
						var font = new esri.symbol.Font();
						font.setSize("10pt");
						font.setFamily("Helvetica");
						font.setWeight(Font.WEIGHT_BOLD);
						var textSymbol = new TextSymbol(queryMapLabel);
						textSymbol.setColor(new esri.Color([0,0,0]));
						textSymbol.setFont(font);
						textSymbol.setHorizontalAlignment("center");
						textSymbol.setVerticalAlignment("middle");
						textSymbol.setOffset(17, 0);
						//Add label at the selected area center.
						var pt = new Point(polyCenter, map.spatialReference);
						var queryMapLabelGraphic = new Graphic(pt, textSymbol);
						queryLabelLayer.add(queryMapLabelGraphic);

						var selectionExtent = esri.graphicsExtent(newFeatures);
						map.setExtent(selectionExtent.expand(1.25), true);

						//Zoom to graphics extent.
						if (urlZoom == '') {
								var selectionExtent = esri.graphicsExtent(newFeatures);
								map.setExtent(selectionExtent.expand(1.25), true);
						}
				}

				//Populate the queryLabel Div that will show the query result label in the legend.
				$("#queryLabelDiv").show();
				$("#queryCheckbox").prop('checked', true);
		}

		function showResults1(featureSet) {
				//Performance enhancer - assign featureSet array to a single variable.
				var newFeatures1 = featureSet.features;
				//Loop through each feature returned
				for (var i = 0, il = newFeatures1.length; i < il; i++) {
					//Get the current feature from the featureSet.
					//Feature is a graphic
					var geometry = featureSet.geometry;
					var newGraphic1 = newFeatures1[i];
					var polyExtent = newGraphic1.geometry.getExtent();
					var polyCenter = polyExtent.getCenter();
					newGraphic1.setSymbol(newHighlight1);
					queryMapLabel1 = "UNIT " + newGraphic1.attributes.NAME;
					//Add graphic to the map graphics layer.
					queryLayer.add(newGraphic1);

					//Add label to the graphics.
					var font = new esri.symbol.Font();
					font.setSize("10pt");
					font.setFamily("Helvetica");
					font.setWeight(Font.WEIGHT_BOLD);
					var textSymbol = new TextSymbol(queryMapLabel1);
					textSymbol.setColor(new esri.Color([154, 32, 219]));
					textSymbol.setFont(font);
					textSymbol.setHorizontalAlignment("center");
					textSymbol.setVerticalAlignment("middle");
					textSymbol.setOffset(17, 0);
					//Add label at the selected area center.
					var pt = new Point(polyCenter, map.spatialReference);
					var queryMapLabel1Graphic = new Graphic(pt, textSymbol);
					queryLabelLayer.add(queryMapLabel1Graphic);

					//Zoom to full extent.
					zoomToState();
				}

				//Populate the queryLabel Div that will show the query result label in the legend.
				$("#queryLabelDiv").show();
				$("#queryCheckbox").prop('checked', true);
		}

		function showResults2(featureSet) {
				//Performance enhancer - assign featureSet array to a single variable.
				var newFeatures2 = featureSet.features;
				//Loop through each feature returned
				for (var i = 0, il = newFeatures2.length; i < il; i++) {
					//Get the current feature from the featureSet.
					//Feature is a graphic
					var geometry = featureSet.geometry;
					var newGraphic2 = newFeatures2[i];
					var polyExtent = newGraphic2.geometry.getExtent();
					var polyCenter = polyExtent.getCenter();
					newGraphic2.setSymbol(newHighlight2);
					var queryMapLabel2 = newGraphic2.attributes.NAME + " Elk Zone";
					//Add graphic to the map graphics layer.
					queryLayer.add(newGraphic2);

					//Add label to the graphics.
					var font = new esri.symbol.Font();
					font.setSize("10pt");
					font.setFamily("Helvetica");
					font.setWeight(Font.WEIGHT_BOLD);
					var textSymbol = new TextSymbol(queryMapLabel2);
					textSymbol.setColor(new esri.Color([30, 201, 201]));
					textSymbol.setFont(font);
					textSymbol.setHorizontalAlignment("center");
					textSymbol.setVerticalAlignment("middle");
					textSymbol.setOffset(17, 0);
					//Add label at the selected area center.
					var pt = new Point(polyCenter, map.spatialReference);
					var queryMapLabel2Graphic = new Graphic(pt, textSymbol);
					queryLabelLayer.add(queryMapLabel2Graphic);

					//Zoom to full extent.
					zoomToState();
				}

				//Populate the queryLabel Div that will show the query result label in the legend.
				$("#queryLabelDiv").show();
				$("#queryCheckbox").prop('checked', true);
		}



	function showResults3(featureSet) {
		//Performance enhancer - assign featureSet array to a single variable.
		var newFeatures3 = featureSet.features;
		//Loop through each feature returned
		for (var i=0, il=newFeatures3.length; i<il; i++) {
			//Get the current feature from the featureSet.
			//Feature is a graphic
			var geometry = featureSet.geometry;
			var newGraphic3 = newFeatures3[i];
			var polyExtent = newGraphic3.geometry.getExtent();
			var polyCenter = polyExtent.getCenter();
			if (newGraphic3.attributes.FLAG == 1){
				newGraphic3.setSymbol(newHighlight3Hatched);
									showAlert();
			} else {
				newGraphic3.setSymbol(newHighlight3);
			}
			var queryMapLabel3 = newGraphic3.attributes.BigGame + " - " + newGraphic3.attributes.HuntArea;

			//Add graphic to the map graphics layer.
			queryLayer.add(newGraphic3);
			
			//Add label to the graphics.		
			var font = new esri.symbol.Font();
			font.setSize("10pt");
			font.setFamily("Helvetica");
			font.setWeight(Font.WEIGHT_BOLD);
			var textSymbol = new TextSymbol(queryMapLabel3);
			textSymbol.setColor (new esri.Color([0,0,0]));
			textSymbol.setFont(font);
			textSymbol.setHorizontalAlignment("center");
			textSymbol.setVerticalAlignment("middle");
			textSymbol.setOffset(17, 0);
			//Add label at the selected area center.
			var pt = new Point(polyCenter,map.spatialReference);
			var queryMapLabel3Graphic = new Graphic (pt, textSymbol);
			//queryLabelLayer.add(queryMapLabel3Graphic);
			
			//Zoom to full extent.
			zoomToState();
		}
		//Populate the queryLabel Div that will show the query result label in the legend.
		$("#queryLabelDiv").show();
		$("#queryCheckbox").prop('checked', true);
	}

	function showResults4(featureSet) {
		//Performance enhancer - assign featureSet array to a single variable.
		var newFeatures4 = featureSet.features;
		//Loop through each feature returned
		for (var i=0, il=newFeatures4.length; i<il; i++) {
			//Get the current feature from the featureSet.
			//Feature is a graphic
			var geometry = featureSet.geometry;
			var newGraphic4 = newFeatures4[i];
			var polyExtent = newGraphic4.geometry.getExtent();
			var polyCenter = polyExtent.getCenter();
			newGraphic4.setSymbol(newHighlight4);
			var queryMapLabel4 = newGraphic4.attributes.Area_Name;
			//Add graphic to the map graphics layer.
			queryLayer.add(newGraphic4);
			
			//Add label to the graphics.		
			var font = new esri.symbol.Font();
			font.setSize("10pt");
			font.setFamily("Helvetica");
			font.setWeight(Font.WEIGHT_BOLD);
			var textSymbol = new TextSymbol(queryMapLabel4);
			textSymbol.setColor (new esri.Color([232,146,18]));
			textSymbol.setFont(font);
			textSymbol.setHorizontalAlignment("center");
			textSymbol.setVerticalAlignment("middle");
			textSymbol.setOffset(17, 0);
			//Add label at the selected area center.
			var pt = new Point(polyCenter,map.spatialReference);
			var queryMapLabel4Graphic = new Graphic (pt, textSymbol);
			queryLabelLayer.add(queryMapLabel4Graphic);
			
			//Zoom to full extent.
			zoomToState();
		}
	
		//Populate the queryLabel Div that will show the query result label in the legend.
		$("#queryLabelDiv").show();
		$("#queryCheckbox").prop('checked', true);
	}

	function showResults5(featureSet) {
		//Performance enhancer - assign featureSet array to a single variable.
		var newFeatures5 = featureSet.features;

		//Loop through each feature returned
		for (var i=0, il=newFeatures5.length; i<il; i++) {
			//Get the current feature from the featureSet.
			//Feature is a graphic
			var newGraphic5 = newFeatures5[i];
			newGraphic5.setSymbol(newHighlight5);

			//Add graphic to the map graphics layer.
			queryLayer.add(newGraphic5);
			
			//Zoom to full extent.
			zoomToState();
		}
		
		//Populate the queryLabel Div that will show the query result label in the legend.
		$("#queryLabelDiv").show();
		$("#queryCheckbox").prop('checked', true);
	}

	function zoomToState(){
		var stateExtent = new esri.geometry.Extent(-119.925, 40.439, -109.137, 50.199);
		map.setExtent(stateExtent);
		$("#loading").hide();
	};

	//Allow users to add GPX data to the map.  Other formats may be added later, such as KML.
	var layer, name;
	var layers=[];
	var portalUrl = 'https://www.arcgis.com';

	 on(dom.byId("uploadForm"), "change", function (evt) {
		var fileName = evt.target.value.toLowerCase();
		if (sniff("ie")) { //filename is full path in IE so extract the file name
			var arr = fileName.split("\\");
			fileName = arr[arr.length - 1];
		}
		if (fileName.indexOf(".gpx") !== -1) {//is file a gpx - if not notify user 
			generateFeatureCollection(fileName);
		}else{
			$("#upload-status").html('<p style="color:red">INVALID FILE TYPE. Choose a .gpx file</p>');
	 }
	});

	function generateFeatureCollection(fileName) {     
		name = fileName.split(".");
		//Chrome and IE add c:\fakepath to the value - we need to remove it
		//See this link for more info: http://davidwalsh.name/fakepath
		name = name[0].replace("c:\\fakepath\\","");
		
		$("#upload-status").html("<b>Loading… </b>" + name); 
		
		//Define the input params for generate see the rest doc for details
		//http://www.arcgis.com/apidocs/rest/index.html?generate.html
		var params = {
			'name': name,
			'targetSR': map.spatialReference,
			'maxRecordCount': 1000,
			'enforceInputFileSizeLimit': true,
			'enforceOutputJsonSizeLimit': true
		};
		//generalize features for display Here we generalize at 1:40,000 which is approx 10 meters 
		//This should work well when using web mercator.  
		var extent = scaleUtils.getExtentForScale(map,40000); 
		var resolution = extent.getWidth() / map.width;
		params.generalize = true;
		params.maxAllowableOffset = resolution;
		params.reducePrecision = true;
		params.numberOfDigitsAfterDecimal = 0;
		
		var myContent = {
			'filetype': 'gpx',
			'publishParameters': JSON.stringify(params),
			'f': 'json',
			'callback.html': 'textarea'
		};
		//use the rest generate operation to generate a feature collection from the zipped shapefile 
		request({
			url: portalUrl + '/sharing/rest/content/features/generate',
			content: myContent,
			form: dom.byId('uploadForm'),
			handleAs: 'json',
			load: lang.hitch(this, function (response) {
				if (response.error) {
					errorHandler(response.error);
					return;
				}
				var layerName = response.featureCollection.layers[0].layerDefinition.name;
				$("#upload-status").html("<b>Loaded: </b>" + layerName);
				addGPXToMap(response.featureCollection);
			}),
			error: lang.hitch(this, errorHandler)
		});
	}
	function errorHandler(error) {
		$("#upload-status").html("<p style='color:red'>" + error.message + "</p>");
	}
	
	function addGPXToMap(featureCollection) {
		//add the GPX to the map and zoom to the feature collection extent
		//If you want to persist the feature collection when you reload browser you could store the collection in 
		//local storage by serializing the layer using featureLayer.toJson()  see the 'Feature Collection in Local Storage' sample
		//for an example of how to work with local storage. 
		var fullExtent;
		layers = [];
		arrayUtils.forEach(featureCollection.layers, function (layer) {
			var infoTemplate = new InfoTemplate("", "${*}");
			infoTemplate.setTitle(name + " Attributes");
			layer = new FeatureLayer(layer, {
				outfields:["*"],
				infoTemplate: infoTemplate
			});
			//change default symbol if desired. Comment this out and the layer will draw with the default symbology
			changeRenderer(layer);
			fullExtent = fullExtent ? fullExtent.union(layer.fullExtent) : layer.fullExtent;
			layers.push(layer);
			
		});
		map.addLayers(layers);
		map.setExtent(fullExtent.expand(1.25), true);
		$("#upload-status").html("");
		clearFileInputField('uploadForm');
		$("#uploadLabelDiv").show();
		$("#uploadCheckbox").prop('checked', true);
	}
	
	function changeRenderer(layer) {
		//change the default symbol for the feature collection for polygons and points
		var symbol = null;
		switch (layer.geometryType) {
		case 'esriGeometryPoint':
			symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
					new Color([0,0,0]), 1),
					new Color ([255,0,0]));
			break;
		case 'esriGeometryPolygon':
			symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, 
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, 
				new Color([255, 0, 0]), 1), 
				new Color([255, 0, 0]));
			break;
		}
		if (symbol) {
			layer.setRenderer(new SimpleRenderer(symbol));
		}
		if (layer.geometryType == 'esriGeometryPoint'){
			$("#uploadLabel1Div").show();
		}
			if (layer.geometryType == 'esriGeometryPolyline'){
			$("#uploadLabel2Div").show();
		}
	}

	//Clear the gpx upload form file name.
	function clearFileInputField(tagId){ 
		dojo.byId(tagId).innerHTML = dojo.byId(tagId).innerHTML;
	}

	function layerVisibility(layer) {
		(layer.visible) ? layer.hide() : layer.show();
	}
		
	//Clear the uploaded GPX files from the map.
	$("#btnClearUpload").click (function(){
		jQuery.each(layers, function(index, value){
				layerVisibility(layers[index]);
			});
			
		$("#uploadLabelDiv").hide();
		$("#uploadLabel1Div").hide();
		$("#uploadLabel2Div").hide();
		$("#uploadCheckbox").prop('checked', false);
	});

	//toggle GPX layers on/off when checkbox is toggled on/off
	$("#uploadCheckbox").change(function(){	
		jQuery.each(layers, function(index, value){
			layerVisibility(layers[index]);
		});
	});		

	//Create a search box.
		var search = new Search({
			map: map,
			enableInfoWindow: false
	  }, "geosearch");
		
		//Create extent to limit search
		var extent = new Extent({
		  "spatialReference": {
				"wkid": 102100
				},
			"xmin": -13039873.23,
			"xmax": -12316737.55,
			"ymin": 5149759.51,
			"ymax": 6295543.43
		});

    //set the source's searchExtent to the extent specified above   
    search.sources[0].searchExtent = extent;
		
	  search.startup();
		
	//clear place search graphics layer
	$("#btnClearPlace").click (function(){
			search.clear();
	});
	
	//the user inputs a long, lat coordinate and a flag icon is added to that location and the location is centered and zoomed to on the map.
	$("#btnCoordZoom").click (function(){
		zoomToCoordinate();
	});

	//zoom to the coordinate and add a graphic
	function zoomToCoordinate(){
		var zoomToGraphic;
		var longitude = $("#longitudeInput").val();
		var latitude = $("#latitudeInput").val();
		var symbol = new PictureMarkerSymbol('http://js.arcgis.com/3.19/esri/dijit/Search/images/search-pointer.png', 35, 35);
		var pt = new Point(longitude, latitude);
		var labelSymbol = new TextSymbol(longitude + ", " + latitude);
		labelSymbol.setColor (new Color("black"));
		var font = new Font();
		font.setSize("14pt");
		font.setFamily("Helvetica");
		font.setWeight(Font.WEIGHT_BOLD);
		labelSymbol.setFont(font);
		labelSymbol.setHorizontalAlignment("left");
		labelSymbol.setVerticalAlignment("middle");
		labelSymbol.setOffset(17, 0);
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
		longitude = $("#longitudeInput").val("");
		latitude = $("#latitudeInput").val("");
	});

	//add the measurement tools
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

	$("#clearMeasureResults").click(function(){
		measurement.clearResult();
		$("#measureResultsDiv").hide();
	});

	//Clear the measurement results div when starting a new measurement.
	measurement.on("measure-start", function() {
		$("#Results").empty();
	});
	
	//Add tool instructions in measure window.
	measurement.on("tool-change", function(){
		var measureTool = measurement.getTool();
		measureTool = measureTool.toolName;
			if(measureTool === "area"){
				$("#MeasureInstructions").html("<h4 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to polygon. Double-click/tap to finish.</h4>");
			} else if(measureTool === "distance"){
				$("#MeasureInstructions").html("<h4 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to the line. Double-click/tap to finish.</h4>");
			} else if (measureTool === "location"){
				$("#MeasureInstructions").html("<h4 class='red'>Click or tap a location on the map to add a point.</h4>");
			}	
	});
	
	//Disable popups when the measurement window is uncollapsed.
	$('#measureCollapse').on('show.bs.collapse', function(){
		 map.setInfoWindowOnClick(false);
	});

	//Show the measurement results in the bottom right-hand corner.
	measurement.on("measure-end", function () {
		var measureTool = measurement.getTool();
		measureTool = measureTool.toolName;
		//measurement.setTool(measurement.activeTool, false);  //THIS WILL SHUT THE ACTIVE TOOL OFF.
		var resultValue = measurement.resultValue.domNode.innerHTML;
		c = measurement.markerLatitude;
		c = c.innerHTML;
		d = measurement.markerLongitude;
		d = d.innerHTML;
		locationXY = c + ", " + d;
		var copyResultValue = document.getElementById('Results');
		if(measureTool === "location"){
			copyResultValue.innerHTML = locationXY;
		}else{
			copyResultValue.innerHTML = resultValue;
		}
		$("#measureResultsDiv").effect("highlight", {color: 'yellow'}, 3000);
	});

	//When the measure tool is collapes, deactive all measure tools, clear the results, and enable popups. 
	$('#measureCollapse').on('hide.bs.collapse', function(){
		map.setInfoWindowOnClick(true);
		measurement.clearResult();
		measurement.setTool("area", false);
		measurement.setTool("distance", false);
		measurement.setTool("location", false);
		console.log("Popups should be enabled");
		$("#measureResultsDiv").hide();
		$("#MeasureInstructions").html("");
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
		toolbar.activate(Draw.POINT);
		} else { */
		tool = this.name.toUpperCase().replace(/ /g, "_");
		toolbar.activate(Draw[tool]);
		//}	
		if(tool === "FREEHAND_POLYGON"){
			$("#DrawInstructions").html("<h4 class='red'>Press down to start and let go to finish</h4>");
		} else if(tool === "POLYGON"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to polygon. Double-click/tap to finish.</h4>");
		} else if (tool === "POINT"){
			$("#DrawInstructions").html("<h4 class='red'>Click or tap a location on the map to add a point.</h4>");
		} else if (tool === "MULTI_POINT"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap a location on the map to start adding points. Double-click/tap to finish.</h4>");
		} else if (tool === "POLYLINE"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to the line. Double-click/tap to finish.</h4>");
		} else if (tool === "FREEHAND_POLYLINE" || tool === "FREEHAND POLYGON"){
			$("#DrawInstructions").html("<h4 class='red'>Press down to start and let go to finish.</h4>");
		} else if (tool === "CIRCLE"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap to add a circle or press down to start and let go to finish.</h4>");
		} else if (tool === "TEXT"){
			$("#DrawInstructions").html("<h4 class='red'>Click/tap to add text to the map.</h4>");
		}
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
					new Color([255,114,0]),0.5),
					new Color([255,114,0]));
				break;
			case "polyline":
				symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
					new Color([255,114,0]),2);
				break;
			default:
				symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([255,114,0]),2),
				new Color([255,114,0,0.25]));
				break; 
		}
		var drawGraphic = new Graphic(evt.geometry, symbol);
		drawToolbarLayer.add(drawGraphic);
	}

	//fire the text graphic in a separate graphics layer than the other draw symbols otherwise it will show as just a point when using the PrintTask GP Tool.
	$("#dijit_form_Button_6_label").on("click", drawPoint);

	//active the draw.POINT tool
	var pointTool;
	function drawPoint(){
		//change the tooltip text for the Draw.POINT tool.
		esri.bundle.toolbars.draw.addPoint = "Click to add text to the map.";
		pointTool = new Draw(map);
		pointTool.activate(Draw.POINT);
		pointTool.on("draw-end", addText);
	}
	//add text to the point
	function addText(evt){
		pointTool.deactivate();
		var userText = $("#userTextBox").val();
		var textSymbol= new TextSymbol(userText);
		textSymbol.setColor (new esri.Color("black"));
		var font = new esri.symbol.Font();
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
	
	//Disable popups when the draw window is uncollapsed.
	$('#drawCollapse').on('show.bs.collapse', function(){
		 map.setInfoWindowOnClick(false);
	});
	//Enable popups when the draw window is uncollapsed.
	$('#drawCollapse').on('hide.bs.collapse', function(){
		map.setInfoWindowOnClick(true);
		$("#DrawInstructions").html("");
	});

	//Create PDF using PrintTask	
	$("#btnPDF").click (function(){
		$("#div_for_pdf").hide();
		submitPrint();
	});

	function submitPrint() {
		var printParams = new PrintParameters();
		printParams.map = map;
		var status = dojo.byId("printStatus");
		status.innerHTML = "Creating Map...";
		$("#loadingPrint").show();
		
		var template = new PrintTemplate();
		var printTitle = $("#txtTitle").val();
		template.layoutOptions = {
			"titleText": printTitle
		};
		var format = $("#format").val();
		template.format = format;
		var layout = $("#layout").val();
		template.layout = layout;
		template.exportOptions = {
			dpi: 300
		};
		printParams.template = template;
		
		var printServiceUrl ='https://fishandgame.idaho.gov/gis/rest/services/Custom_IDFG_ExportWebMapTask/GPServer/Export%20Web%20Map';
		/* var printServiceUrl ='https://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task'; */
		var printTask = new esri.tasks.PrintTask(printServiceUrl);	

		var deferred = printTask.execute(printParams);
		deferred.addCallback(function (response){  
			//alert(JSON.stringify(response));		
			status.innerHTML = "";
			//open the map PDF or image in a new browser window.
			var new_url_for_map = response.url.replace("sslifwisiis","fishandgame.idaho.gov");
			var currentTime = new Date();
			var unique_PDF_url = new_url_for_map += "?ts="+currentTime.getTime();
			//PDFwindow = window.open(new_url_for_map);
			if (typeof(PDFwindow) == 'undefined') {
				$("#div_for_pdf").html("<a href='" + unique_PDF_url + "'>CLICK HERE TO DOWNLOAD YOUR MAP</a><br/><br/>");
				$("#div_for_pdf a").attr('target', '_blank');
				$("#div_for_pdf a").attr("class", 'red');
				$("#div_for_pdf").click(function(){
					$("#div_for_pdf").html("");
				});
			} else {
				window.open(new_url_for_map);
			}
			$("#div_for_pdf").show();
			$("#loadingPrint").hide();
		});
		
		deferred.addErrback(function (error) {
			console.log("Print Task Error = " + error);
			status.innerHTML = "Whoops!  Something went wrong!  Please try again later.";
			$("#printStatus").show();
			$("#printStatus").attr("class", 'red');
			$("#loadingPrint").hide();
		});
		$("#pdfCollapse").on('hide.bs.collapse', function(){
			$("#printStatus").hide();
		});
	};
				
	// Show modal dialog, hide nav
	$(document).ready(function(){
		//populate the GMU dropdown with JSON vars.
		var gmuList = [{"ID":"1","NAME":"UNIT 1"},{"ID":"2","NAME":"UNIT 2"},{"ID":"3","NAME":"UNIT 3"},{"ID":"4","NAME":"UNIT 4"},{"ID":"5","NAME":"UNIT 4A"},{"ID":"6","NAME":"UNIT 5"},{"ID":"7","NAME":"UNIT 6"},{"ID":"8","NAME":"UNIT 7"},{"ID":"9","NAME":"UNIT 8"},{"ID":"10","NAME":"UNIT 8A"},{"ID":"11","NAME":"UNIT 9"},{"ID":"13","NAME":"UNIT 10"},{"ID":"14","NAME":"UNIT 10A"},{"ID":"15","NAME":"UNIT 11"},{"ID":"16","NAME":"UNIT 11A"},{"ID":"17","NAME":"UNIT 12"},{"ID":"18","NAME":"UNIT 13"},{"ID":"19","NAME":"UNIT 14"},{"ID":"20","NAME":"UNIT 15"},{"ID":"21","NAME":"UNIT 16"},{"ID":"22","NAME":"UNIT 16A"},{"ID":"23","NAME":"UNIT 17"},{"ID":"24","NAME":"UNIT 18"},{"ID":"25","NAME":"UNIT 19"},{"ID":"26","NAME":"UNIT 19A"},{"ID":"27","NAME":"UNIT 20"},{"ID":"28","NAME":"UNIT 20A"},{"ID":"29","NAME":"UNIT 21"},{"ID":"30","NAME":"UNIT 21A"},{"ID":"31","NAME":"UNIT 22"},{"ID":"32","NAME":"UNIT 23"},{"ID":"33","NAME":"UNIT 24"},{"ID":"34","NAME":"UNIT 25"},{"ID":"35","NAME":"UNIT 26"},{"ID":"36","NAME":"UNIT 27"},{"ID":"37","NAME":"UNIT 28"},{"ID":"38","NAME":"UNIT 29"},{"ID":"39","NAME":"UNIT 30"},{"ID":"40","NAME":"UNIT 30A"},{"ID":"41","NAME":"UNIT 31"},{"ID":"42","NAME":"UNIT 32"},{"ID":"43","NAME":"UNIT 32A"},{"ID":"44","NAME":"UNIT 33"},{"ID":"45","NAME":"UNIT 34"},{"ID":"46","NAME":"UNIT 35"},{"ID":"47","NAME":"UNIT 36"},{"ID":"48","NAME":"UNIT 36A"},{"ID":"49","NAME":"UNIT 36B"},{"ID":"50","NAME":"UNIT 37"},{"ID":"51","NAME":"UNIT 37A"},{"ID":"52","NAME":"UNIT 38"},{"ID":"53","NAME":"UNIT 39"},{"ID":"54","NAME":"UNIT 40"},{"ID":"55","NAME":"UNIT 41"},{"ID":"56","NAME":"UNIT 42"},{"ID":"57","NAME":"UNIT 43"},{"ID":"58","NAME":"UNIT 44"},{"ID":"59","NAME":"UNIT 45"},{"ID":"60","NAME":"UNIT 46"},{"ID":"61","NAME":"UNIT 47"},{"ID":"62","NAME":"UNIT 48"},{"ID":"63","NAME":"UNIT 49"},{"ID":"64","NAME":"UNIT 50"},{"ID":"65","NAME":"UNIT 51"},{"ID":"66","NAME":"UNIT 52"},{"ID":"67","NAME":"UNIT 52A"},{"ID":"68","NAME":"UNIT 53"},{"ID":"69","NAME":"UNIT 54"},{"ID":"70","NAME":"UNIT 55"},{"ID":"71","NAME":"UNIT 56"},{"ID":"72","NAME":"UNIT 57"},{"ID":"73","NAME":"UNIT 58"},{"ID":"74","NAME":"UNIT 59"},{"ID":"75","NAME":"UNIT 59A"},{"ID":"76","NAME":"UNIT 60"},{"ID":"77","NAME":"UNIT 60A"},{"ID":"78","NAME":"UNIT 61"},{"ID":"79","NAME":"UNIT 62"},{"ID":"80","NAME":"UNIT 62A"},{"ID":"81","NAME":"UNIT 63"},{"ID":"82","NAME":"UNIT 63A"},{"ID":"83","NAME":"UNIT 64"},{"ID":"84","NAME":"UNIT 65"},{"ID":"85","NAME":"UNIT 66"},{"ID":"86","NAME":"UNIT 66A"},{"ID":"87","NAME":"UNIT 67"},{"ID":"88","NAME":"UNIT 68"},{"ID":"89","NAME":"UNIT 68A"},{"ID":"90","NAME":"UNIT 69"},{"ID":"91","NAME":"UNIT 70"},{"ID":"92","NAME":"UNIT 71"},{"ID":"93","NAME":"UNIT 72"},{"ID":"94","NAME":"UNIT 73"},{"ID":"95","NAME":"UNIT 73A"},{"ID":"96","NAME":"UNIT 74"},{"ID":"97","NAME":"UNIT 75"},{"ID":"98","NAME":"UNIT 76"},{"ID":"99","NAME":"UNIT 77"},{"ID":"100","NAME":"UNIT 78"},];
		$.each(gmuList, function(){
			$('#gmu').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		//populate the Elk Zone dropdown with JSON vars.
		var ElkZoneList = [{"ID":"93","NAME":"Bannock"},{"ID":"2","NAME":"Bear River"},{"ID":"3","NAME":"Beaverhead"},{"ID":"5","NAME":"Big Desert"},{"ID":"6","NAME":"Boise River"},{"ID":"7","NAME":"Brownlee"},{"ID":"8","NAME":"Diamond Creek"},{"ID":"9","NAME":"Dworshak"},{"ID":"10","NAME":"Elk City"},{"ID":"11","NAME":"Hells Canyon"},{"ID":"12","NAME":"Island Park"},{"ID":"13","NAME":"Lemhi"},{"ID":"14","NAME":"Lolo"},{"ID":"15","NAME":"McCall"},{"ID":"16","NAME":"Middle Fork"},{"ID":"52","NAME":"Owyhee"},{"ID":"18","NAME":"Palisades"},{"ID":"19","NAME":"Palouse"},{"ID":"20","NAME":"Panhandle"},{"ID":"21","NAME":"Pioneer"},{"ID":"22","NAME":"Salmon"},{"ID":"23","NAME":"Sawtooth"},{"ID":"24","NAME":"Selway"},{"ID":"4","NAME":"Smoky - Bennett"},{"ID":"26","NAME":"Snake River"},{"ID":"60","NAME":"South Hills"},{"ID":"28","NAME":"Tex Creek"},{"ID":"29","NAME":"Weiser River"},];
		$.each(ElkZoneList, function(){
			$('#elkzone').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		//populate the Waterfowl Hunt Areas dropdown with JSON vars.
		var waterfowlList = [{"ID":"1","NAME":"Canada Goose Area 1"},{"ID":"2","NAME":"Canada Goose Area 2"},{"ID":"3","NAME":"Canada Goose Area 3"},{"ID":"4","NAME":"Duck Area 1"},{"ID":"5","NAME":"Duck Area 2"},{"ID":"6","NAME":"Light Goose Area 1"},{"ID":"7","NAME":"Light Goose Area 2"},{"ID":"8","NAME":"Light Goose Area 3"},{"ID":"9","NAME":"White-fronted Goose Area 1"},{"ID":"10","NAME":"White-fronted Goose Area 2"},{"ID":"11","NAME":"Sandhill Crane Area 1"},{"ID":"12","NAME":"Sandhill Crane Area 2"},{"ID":"13","NAME":"Sandhill Crane Area 3"},{"ID":"14","NAME":"Sandhill Crane Area 4"},{"ID":"15","NAME":"Sandhill Crane Area 5"},];
		$.each(waterfowlList, function(){
			$('#waterfowl').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		//populate the Game Distribution dropdown with JSON vars.
		var gameAnimalList = [{"ID":"730","NAME":"American Badger"},{"ID":"693","NAME":"American Beaver"},{"ID":"362","NAME":"American Coot"},{"ID":"500","NAME":"American Crow"},{"ID":"723","NAME":"American Marten"},{"ID":"306","NAME":"American Wigeon"},{"ID":"318","NAME":"Barrow's Goldeneye"},{"ID":"719","NAME":"Black Bear"},{"ID":"301","NAME":"Blue-Winged Teal"},{"ID":"736","NAME":"Bobcat"},{"ID":"319","NAME":"Bufflehead"},{"ID":"747","NAME":"California Bighorn Sheep"},{"ID":"356","NAME":"California Quail"},{"ID":"295","NAME":"Canada Goose"},{"ID":"307","NAME":"Canvasback"},{"ID":"345","NAME":"Chukar"},{"ID":"302","NAME":"Cinnamon Teal"},{"ID":"352","NAME":"Columbian Sharp-Tailed Grouse"},{"ID":"317","NAME":"Common Goldeneye"},{"ID":"321","NAME":"Common Merganser"},{"ID":"722","NAME":"Common Raccoon"},{"ID":"397","NAME":"Common Snipe"},{"ID":"-700","NAME":"Deer"},{"ID":"348","NAME":"Dusky Grouse"},{"ID":"305","NAME":"Eurasian Wigeon"},{"ID":"304","NAME":"Gadwall"},{"ID":"344","NAME":"Gray Partridge"},{"ID":"310","NAME":"Greater Scaup"},{"ID":"297","NAME":"Green-Winged Teal"},{"ID":"313","NAME":"Harlequin Duck"},{"ID":"320","NAME":"Hooded Merganser"},{"ID":"311","NAME":"Lesser Scaup"},{"ID":"299","NAME":"Mallard"},{"ID":"727","NAME":"Mink"},{"ID":"740","NAME":"Moose"},{"ID":"656","NAME":"Mountain Cottontail"},{"ID":"745","NAME":"Mountain Goat"},{"ID":"734","NAME":"Mountain Lion"},{"ID":"746","NAME":"Mountain Sheep"},{"ID":"428","NAME":"Mourning Dove"},{"ID":"738","NAME":"Mule Deer"},{"ID":"708","NAME":"Muskrat"},{"ID":"354","NAME":"Northern Bobwhite"},{"ID":"300","NAME":"Northern Pintail"},{"ID":"733","NAME":"Northern River Otter"},{"ID":"303","NAME":"Northern Shoveler"},{"ID":"743","NAME":"Pronghorn"},{"ID":"660","NAME":"Pygmy Rabbit"},{"ID":"717","NAME":"Red Fox"},{"ID":"322","NAME":"Red-Breasted Merganser"},{"ID":"308","NAME":"Redhead"},{"ID":"309","NAME":"Ring-Necked Duck"},{"ID":"346","NAME":"Ring-Necked Pheasant"},{"ID":"293","NAME":"Ross's Goose"},{"ID":"323","NAME":"Ruddy Duck"},{"ID":"349","NAME":"Ruffed Grouse"},{"ID":"350","NAME":"Sage Grouse"},{"ID":"363","NAME":"Sandhill Crane"},{"ID":"292","NAME":"Snow Goose"},{"ID":"657","NAME":"Snowshoe Hare"},{"ID":"347","NAME":"Spruce Grouse"},{"ID":"737","NAME":"Wapiti Or Elk"},{"ID":"739","NAME":"White-Tailed Deer"},{"ID":"353","NAME":"Wild Turkey"},{"ID":"296","NAME":"Wood Duck"},];
		$.each(gameAnimalList, function(){
			$('#gameDistribution').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		// legend nav1 menu is selected
		$("#legendNav1").click(function(e){
			$("#legendCollapse").collapse('toggle');
		});
		//Close other tools when opened.
		$('#legendCollapse').on('show.bs.collapse', function(){
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// basemap nav 1 menu is selected
		$("#basemapNav1").click(function(e){
			$("#basemapCollapse").collapse('toggle');
		});
		//Close other tools when opened.
		$('#basemapCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");;
			$("#pdfCollapse").removeClass("in");
		});
		// hunt nav1 menu is selected
		$("#huntNav1").click(function(e){
			$("#huntCollapse").collapse('toggle');
		});
		//Close other tools when opened.
		$('#huntCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");		
		});
		// kml nav1 menu is selected
		$("#kmlNav1").click(function(e){
			$("#kmlCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#kmlCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// upload nav1 menu is selected
		$("#uploadNav1").click(function(e){
			$("#uploadCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#uploadCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// Geosearch nav1 menu is selected
		$("#geosearchNav1").click(function(e){
			$("#geosearchCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#geosearchCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
			// measurement nav1 menu is selected
		$("#measurementNav1").click(function(e){
			$("#measureCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#measureCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// draw nav1 menu is selected
		$("#drawNav1").click(function(e){
			$("#drawCollapse").collapse('toggle');  
		});
		//Close other tools when opened.
		$('#drawCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
			$("#pdfCollapse").removeClass("in");
		});
		// pdf nav1 menu is selected
		$("#pdfNav1").click(function(e){
			$("#pdfCollapse").collapse('toggle'); 
		});
		//Close other tools when opened.
		$('#pdfCollapse').on('show.bs.collapse', function(){
			$("#legendCollapse").removeClass("in");
			$("#basemapCollapse").removeClass("in");
			$("#huntCollapse").removeClass("in");
			$("#uploadCollapse").removeClass("in");
			$("#geosearchCollapse").removeClass("in");
			$("#measureCollapse").removeClass("in");
			$("#drawCollapse").removeClass("in");
			$("#kmlCollapse").removeClass("in");
		});
		// help nav1 menu is selected
		$("#helpNav1").click(function(e){
			$("#helpModal").modal("show"); 

		});
		// disclaimer is clicked
		$("#disclaimer").click(function(e){
			$("#disclaimerModal").modal("show");
		});

		if ($(window).width() < 500) {
			collapse($("#sidebar"));
			$(".controlBtns").css({
				"width": "100%",
				"position": "fixed"
			});
			$("#ReturnBtn").show();
		} else {
			expand($("#sidebar"));
			$(".controlBtns").css({
				"width": "35%",
				"position": "relative"
			});
			$("#ReturnBtn").hide();
		}
	});
	
	var sidebar = $("#sidebar");
	$('#ReturnBtn').on("click", function() {
			collapse(sidebar);
	});
	
	$("#expandSidebar").on("click", function() {
		if (!$("#sidebar").hasClass("collapse")) {
				collapse(sidebar);
		} else {
				expand($(sidebar));
		}
	});

	$(window).on("resize", function() {
			if ($(this).width() < 500) {
				$(".controlBtns").css({
					"width": "100%",
					"position": "fixed"
				});
				$("#ReturnBtn").show();
				if (!$("#sidebar").hasClass("collapse")) {
						$("#mapView").css({
								"display": "none"
						});
				}
			} else {
				$('#ReturnBtn').hide();
				$(".controlBtns").css({
						"width": "35%",
						"position": "relative"
				});
				$("#mapView").css({
						"display": "block"
				});
			}
	});

	function collapse(el) {
			$(el).addClass("collapse");
			$("#mapView").addClass("fullScreen");
			$("#mapView").removeClass("splitScreen");
			$("#expandSidebar").addClass("glyphicon-chevron-right");
			$("#expandSidebar").removeClass("glyphicon-chevron-left");
			$("#mapView").css({
					"display": "block"
			});
	}

	function expand(el) {
			$(el).removeClass("collapse");
			$("#mapView").removeClass("fullScreen");
			$("#mapView").addClass("splitScreen");
			$("#expandSidebar").removeClass("glyphicon-chevron-right");
			$("#expandSidebar").addClass("glyphicon-chevron-left");
			if ($(window).width() < 500) {
					$("#mapView").css({
							"display": "none"
					});
			} else {
					$("#mapView").css({
							"display": "block"
					});
			}
	}
	
	//Keypress event to launch help document
	window.onkeydown = function(e) {
		if (e.keyCode === 112) {
			var win = window.open('https://idfg.idaho.gov/ifwis/huntplanner/mapcenter/HelpDocV2/IDFG%20Hunt%20Planner%20Map%20Center%20V2%20Help%20Documentation.html', '_blank');
			if (win) {
					//Browser has allowed it to be opened
					win.focus();
			} else {
					//Browser has blocked it
					alert('Please allow popups for this website');
			}
		}
	};		
})