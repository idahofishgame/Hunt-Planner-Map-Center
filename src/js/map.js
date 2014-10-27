require(["esri/urlUtils",
	"esri/map",
	"esri/config",
	"esri/SpatialReference",
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
	"esri/layers/WMSLayer",
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
	"esri/geometry/Point",
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
	function(urlUtils, Map, esriConfig, SpatialReference, LocateButton, Scalebar, webMercatorUtils, BasemapLayer, Basemap, BasemapGallery, GoogleMapsLayer, arcgisUtils, FeatureLayer, GraphicsLayer, ArcGISDynamicMapServiceLayer, WMSLayer, ImageParameters, Geocoder, LegendLayer, GeometryService, Measurement, Draw, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, TextSymbol, Color, Font, PrintParameters, PrintTemplate, PrintTask, InfoTemplate, Point, Multipoint, PictureMarkerSymbol, Popup, PopupTemplate, QueryTask, Query, TOC, connect, dom, domClass, domConstruct, parser, registry, on, query, BootstrapMap) {
		
		//Proxy settings
		esriConfig.defaults.io.proxyUrl = "http://fishandgame.idaho.gov/ifwis/gis_proxy/proxy.ashx?";
		esriConfig.defaults.io.alwaysUseProxy = false;
		
		urlUtils.addProxyRule({
			urlPrefix: "http://fishandgame.idaho.gov",
			proxyUrl: "http://fishandgame.idaho.gov/ifwis/gis_proxy/proxy.ashx"
    });
		
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
		
		//hide the loading icon after the window has loaded.
		$(window).load(function(){
			$("#loading").hide();
		});
		
		//show coordinates as the user scrolls around the map. In Desktop, it displays where ever the mouse is hovering.  In mobile, the user must tap the screen to get the coordinates.
		function showCoordinates(evt) {
			//the map is in web mercator but display coordinates in geographic (lat, long)
			var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
			//display mouse coordinates
			$("#info").html(mp.x.toFixed(3) + ", " + mp.y.toFixed(3));
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
			//If a google basemap was previously selected, remove it to see the esri basemap (google maps are ' on top of' esri maps)
			map.removeLayer(googleLayer);
			$("#basemapModal").modal('hide');
		});
		
		$(".esriBasemapGalleryNode").click (function(){
			$("#basemapModal").modal('hide');
		});
		
		//Add the USA Topo basemap to the basemap gallery. It is not part of the gallery by default.  You can add other esri or custom basemaps.
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
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_ROADMAP);
		});
		
		$("#googleSatellite").click (function(){
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_SATELLITE);
		});
		
		$("#googleHybrid").click (function(){
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_HYBRID);
		});
		
		$("#googleTerrain").click (function(){
				map.addLayer(googleLayer);
				map.reorderLayer(googleLayer, 1);
				googleLayer.setMapTypeId(agsjs.layers.GoogleMapsLayer.MAP_TYPE_TERRAIN);
		});

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
			{id:"Hunt_Area"});
		adminLayers = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/AdministrativeBoundaries/MapServer",
			{id:"Adminstrative Boundary"});
		surfaceMgmtLayer = new FeatureLayer("https://fishandgame.idaho.gov/gis/rest/services/Basemaps/SurfaceMgmt_WildlifeTracts/MapServer/0",
			{
				id:"Surface_Management",
				opacity: 0.5
			});
		trailLayers = new ArcGISDynamicMapServiceLayer("http://gis2.idaho.gov/arcgis/rest/services/DPR/IDTrailsSimple/MapServer",
			{id:"Trails_and_Roads"});
		campgroundLayer = new FeatureLayer("https://gis2.idaho.gov/arcgis/rest/services/ADM/Campgrounds/MapServer/0",
			{
				id:"Campgrounds",
				outFields:["*"],
				infoTemplate:campgroundPopupTemplate
			});
		fireLayer0 = new FeatureLayer("https://fishandgame.idaho.gov/gis/rest/services/External/InciWeb_FireClosures/MapServer/0",
			{
				id:"Fire_Closure",
				outFields:['NAME', 'URL', 'UPDATE_'],
				infoTemplate:closurePopupTemplate
			});	
		fireLayer2 = new FeatureLayer("http://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/2",
			{
				id:"Fire_Perimeter",
				outFields:['acres', 'active', 'fire_name'],
				infoTemplate:perimeterPopupTemplate
			});
		esriConfig.defaults.io.corsEnabledServers.push("activefiremaps.fs.fed.us");
    fireLayer3 = new WMSLayer("http://activefiremaps.fs.fed.us/cgi-bin/mapserv.exe?map=conus.map&",{
        id:"MODIS_Fire_Detection",
				opacity:"0.5",
				version:"1.1.1",
        visibleLayers:[4],
        format:"png"
    });
	
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
						title: "Roads & Trails",
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
					//toggle layers/on by click root/layer labels (as well as checking checkbox)
					$('.agsjsTOCServiceLayerLabel').click(function(){
						$(this).siblings('span').children('input').click();
					});
					$("#TOCNode_Surface_Management .agsjsTOCRootLayerLabel").append("<div class='disclaimer'>Maintained by BLM. <a href='http://cloud.insideidaho.org/webApps/metadataViewer/default.aspx?path=G%3a%5cdata%5canonymous%5cblm%5cRLTY_SMA_PUB_24K_POLY.shp.xml' target='_blank'>Learn More</a></div>");
					$("#TOCNode_Trails_and_Roads .agsjsTOCRootLayerLabel").append("<div class='disclaimer'>Maintained by IDPR. <a href='http://www.trails.idaho.gov/trails/' target='_blank'>Learn More</a></div>");
					$("#TOCNode_Campgrounds .agsjsTOCRootLayerLabel").append("<div class='disclaimer'>Maintained by IDPR. <a href='http://parksandrecreation.idaho.gov/activities/camping' target='_blank'>Learn More</a></div>");
					$("#TOCNode_fireLayers_2 .agsjsTOCServiceLayerLabel").append("<div class='disclaimer'>Maintained by GeoMAC. <a href='http://wildfire.usgs.gov/geomac/' target='_blank'>Learn More</a></div>");
					$("#TOCNode_fireLayers_3 .agsjsTOCServiceLayerLabel").append("<div class='disclaimer'>Maintained by USFS-RSAC. <a href='http://activefiremaps.fs.fed.us/' target='_blank'>Learn More</a></div>");
/* 					$('.agsjsTOCRootLayerLabel').click(function(){
						$(this).siblings('span').children('input').click();
					}); */
				});
		});
		
		map.addLayers([surfaceMgmtLayer, adminLayers, fireLayer3, fireLayer2, fireLayer0, huntLayers, trailLayers, campgroundLayer]);
		adminLayers.hide(); //So none of the layers are "on" except the GMU layer when the map loads.
		surfaceMgmtLayer.hide();
		trailLayers.hide();
		campgroundLayer.hide();
		fireLayer0.hide();
		fireLayer2.hide();
		fireLayer3.hide();
		map.reorderLayer(surfaceMgmtLayer, 0);
		
		//Enable mobile scrolling by calling $('.selectpicker').selectpicker('mobile'). The method for detecting the browser is left up to the user. This enables the device's native menu for select menus.
		if( /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ) {
			$('.selectpicker').selectpicker('mobile');
		}
		
		//function to get variable values from the URL to query for hunt planner hunt area and/or zoom to a specific center coordinate and zoom level if using a "shared" map view link.
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
		
		//get the variables of areaID (hunt area, IOG area, or Access Yes! area), layerID (which layer to apply the ID query to), and label (what will appear in the legend).
		var areaID, layerID, label, urlZoom, urlX, urlY, homeURL, zoomLevel, centerpoint, cX, cY, newURL, extentI, extentC;	
		window.onload = function(){
			$('.selectpicker').selectpicker('val', '');
			areaID = getVariableByName('val');
			layerID = getVariableByName('lyr');
			label = getVariableByName('lbl');
			urlZoom = getVariableByName('zoom');
			urlX = getVariableByName('X');
			urlY = getVariableByName('Y');
			if (typeof label != 'undefined'){
				var cleanLabel = label.split('+').join(' ');
				label = cleanLabel;
			} else {
				label = "Selected Hunt Area";
			}
			if (typeof areaID != 'undefined'){
				doQuery(areaID, layerID, label);
			}
			$("#queryLabel1").text(label);
			$("#queryLabel1Div").show();
			
			if (typeof urlZoom != 'undefined'){
				var point = new Point(urlX, urlY, new SpatialReference({ wkid: 4326}));
				map.setLevel(urlZoom);
				map.centerAt(point);
			}
			//Create a url for "sharing" the current map view by getting the zoom and map center coordinate variables for the current extent.
			homeURL = window.location.href;
			zoomLevel = map.getZoom();
			centerpoint = webMercatorUtils.webMercatorToGeographic(map.extent.getCenter());
			cX = parseFloat(centerpoint.x.toFixed(3));
			cY = parseFloat(centerpoint.y.toFixed(3));
			newURL ="?zoom=" + zoomLevel + "&X=" + cX + "&Y=" + cY;
			//If the url contains an lyr parameter.
			if (window.location.href.indexOf("lyr") > 0){
				$("#viewURL").append(homeURL);
			//If url has no lyr parameter.	
			} else {	
				$("#viewURL").empty();
				homeURL = window.location.href;
				$("#viewURL").append(homeURL + newURL);
			}
		};
		
		//On extent change, change the share url zoom and coordinate parameters and refresh the "share" url.
		map.on("extent-change", function(){
			if (window.location.href.indexOf("lyr") > 0){
				$("#viewURL").empty();
				$("#viewURL").append(homeURL);
			} else {
				$("#viewURL").empty();
				homeURL = window.location.href;
				zoomLevel = map.getZoom();
				centerpoint = webMercatorUtils.webMercatorToGeographic(map.extent.getCenter());
				cX = parseFloat(centerpoint.x.toFixed(3));
				cY = parseFloat(centerpoint.y.toFixed(3));
				newURL ="?zoom=" + zoomLevel + "&X=" + cX + "&Y=" + cY;
				$("#viewURL").append(homeURL + newURL);
			}
		});
		
		//toggle query layer on/off when checkbox is toggled on/off
		$("#queryCheckbox").change(function(){	
		 if ($(this).prop('checked')) {
		  queryLayer.show();
		 } else {
		  queryLayer.hide();
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
		
		var gmuID, elkID, chuntID, waterfowlID, gameDistributionID, newHighlight1, newHighlight2, newHighlight3, newHighlight4, newHighlight5;
		$("#btnQuery").click(function(){
		
			$("#loading").show();
			
			queryLayer.clear();
			$("#queryLabel1Div").hide();
			$("#queryLabel2Div").hide();
			$("#queryLabel3Div").hide();
			$("#queryLabel4Div").hide();
			$("#queryLabel5Div").hide();
			
			//get variable values from the dropdown lists in the hunt modal window and run doQuery.
			if ($("#gmu").val()){
				var gmuTypeValue = "";
				$("#gmu option:selected").each(function() {
					gmuTypeValue += "'" + $(this).val() + "',";
				})
			//Remove trailing comma
				gmuID = gmuTypeValue.substring(0,gmuTypeValue.length - 1);
				var layerID = "0";
				var label0 = $("#gmu option:selected").map(function(){
					return $(this).text();
				}).get();
				var label = label0.join(", ");
				
				if (typeof label != 'undefined'){
					label = label;
				} else {
					label = "Selected Hunt Area";
				}
				if (typeof gmuID != 'undefined'){
					doQuery1(gmuID, layerID, label);
				}
				$("#queryLabel1").text(label);
				$("#queryLabel1Div").show();
			}
			
			if ($("#elkzone").val()){
				var elkzoneTypeValue = "";
				$("#elkzone option:selected").each(function() {
					elkzoneTypeValue += "'" + $(this).val() + "',";
				})
			//Remove trailing comma
				elkID = elkzoneTypeValue.substring(0,elkzoneTypeValue.length - 1);
				var layerID = "0";
				var label0 = $("#elkzone option:selected").map(function(){
					return $(this).text();
				}).get();
				var label = "Elk Zones: " + label0.join(", ");
				
				if (typeof label != 'undefined'){
					label = label;
				} else {
					label = "Selected Hunt Area";
				}
				if (typeof elkID != 'undefined'){
					doQuery2(elkID, layerID, label);
				}
				$("#queryLabel2").text(label);
				$("#queryLabel2Div").show();
			}
			
			if ($("#chunt").val()){
				var chuntTypeValue = "";
				$("#chunt option:selected").each(function() {
					chuntTypeValue += "'" + $(this).val() + "',";
				})
			//Remove trailing comma
				chuntID = chuntTypeValue.substring(0,chuntTypeValue.length - 1);
				var layerID = "0";
				var label0 = $("#chunt option:selected").map(function(){
					return $(this).text();
				}).get();
				var label = label0.join(", ");
				
				if (typeof label != 'undefined'){
					label = label;
				} else {
					label = "Selected Hunt Area";
				}
				if (typeof chuntID != 'undefined'){
					doQuery3(chuntID, layerID, label);
				}
				$("#queryLabel3").text(label);
				$("#queryLabel3Div").show();
			}
			
			if ($("#waterfowl").val()){
				var waterfowlTypeValue = "";
				$("#waterfowl option:selected").each(function() {
					waterfowlTypeValue += "'" + $(this).val() + "',";
				})
			//Remove trailing comma
				waterfowlID = waterfowlTypeValue.substring(0,waterfowlTypeValue.length - 1);
				var layerID = "0";
				var label0 = $("#waterfowl option:selected").map(function(){
					return $(this).text();
				}).get();
				var label = label0.join(", ");
				
				if (typeof label != 'undefined'){
					label = label;
				} else {
					label = "Selected Hunt Area";
				}
				if (typeof waterfowlID != 'undefined'){
					doQuery4(waterfowlID, layerID, label);
				}
				$("#queryLabel4").text(label);
				$("#queryLabel4Div").show();
			}
			
			if ($("#gameDistribution").val()){
				var gameDistributionTypeValue = "";
				$("#gameDistribution option:selected").each(function() {
					gameDistributionTypeValue += "'" + $(this).val() + "',";
				})
			//Remove trailing comma
				gameDistributionID = gameDistributionTypeValue.substring(0,gameDistributionTypeValue.length - 1);
				var layerID = "3";
				var label0 = $("#gameDistribution option:selected").map(function(){
					return $(this).text();
				}).get();
				var label = label0.join(", ") + " General Distribution";
				
				if (typeof label != 'undefined'){
					label = label;
				} else {
					label = "Selected Game Distribution";
				}
				if (typeof gameDistributionID != 'undefined'){
					doQuery5(gameDistributionID, layerID, label);
				}
				$("#queryLabel5").text(label);
				$("#queryLabel5Div").show();
			}
			
			$("#huntModal").modal('hide');
		});
			
		$("#btnClearHighlighted").click(function(){
			queryLayer.clear();
			$("#queryLabelDiv").hide();
			$('.selectpicker').selectpicker('val', '');
			$("#queryLabel1Div").hide();
			$("#queryLabel2Div").hide();
			$("#queryLabel3Div").hide();
			$("#queryLabel4Div").hide();
			$("#queryLabel5Div").hide();
		})
		
		function doQuery(areaID, layerID, label) {
			//initialize query tasks
			newQueryTask1 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/HuntPlanner_V2/MapServer/" + layerID);

			//initialize query
			newQuery1 = new Query();
			newQuery1.returnGeometry = true;
			newQuery1.outFields = ["ID"]
			newHighlight = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([154,32,219]), 3),
				new Color([154,32,219,0.1])
			);
			
			newQuery1.where = "ID IN (" + areaID + ")";
			newQueryTask1.execute (newQuery1, showResults);
		}
		
		function doQuery1(gmuID, layerID, label) {
			//initialize query tasks
			newQueryTask1 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/HuntPlanner_V2/MapServer/" + layerID);

			//initialize query
			newQuery1 = new Query();
			newQuery1.returnGeometry = true;
			newQuery1.outFields = ["ID"]
			newHighlight1 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([154,32,219]), 3),
				new Color([154,32,219,0.1])
			);
			
			newQuery1.where = "ID IN (" + gmuID + ")";
			newQueryTask1.execute (newQuery1, showResults1);
		}
		
		function doQuery2(elkID, layerID, label) {
			//initialize query tasks
			newQueryTask2 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/HuntPlanner_V2/MapServer/" + layerID);

			//initialize query
			newQuery2 = new Query();
			newQuery2.returnGeometry = true;
			newQuery2.outFields = ["ID"]
			newHighlight2 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([0,255,255]), 3),
				new Color([0,255,255,0.1])
			);
			
			newQuery2.where = "ID IN (" + elkID + ")";
			newQueryTask2.execute (newQuery2, showResults2);
		}
		
		function doQuery3(chuntID, layerID, label) {
			//initialize query tasks
			newQueryTask3 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/HuntPlanner_V2/MapServer/" + layerID);

			//initialize query
			newQuery3 = new Query();
			newQuery3.returnGeometry = true;
			newQuery3.outFields = ["ID"]
			newHighlight3 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([18,237,18]), 3),
				new Color([18,237,18,0.1])
			);
			
			newQuery3.where = "ID IN (" + chuntID + ")";
			newQueryTask3.execute (newQuery3, showResults3);
		}
		
		function doQuery4(waterfowlID, layerID, label) {
			//initialize query tasks
			newQueryTask4 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/HuntPlanner_V2/MapServer/" + layerID);

			//initialize query
			newQuery4 = new Query();
			newQuery4.returnGeometry = true;
			newQuery4.outFields = ["ID"]
			newHighlight4 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([255,157,0]), 3),
				new Color([255,157,0,0.1])
			);
			
			newQuery4.where = "ID IN (" + waterfowlID + ")";
			newQueryTask4.execute (newQuery4, showResults4);
		}

		function doQuery5(gameDistributionID, layerID, label) {
			//initialize query tasks
			newQueryTask5 = new QueryTask("https://fishandgame.idaho.gov/gis/rest/services/Apps/HuntPlanner_V2/MapServer/" + layerID);

			//initialize query
			newQuery5 = new Query();
			newQuery5.returnGeometry = true;
			newQuery5.outFields = ["ID"]
			newHighlight5 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([255,0,225]), 3),
				new Color([255,0,225,0.1])
			);
			
			newQuery5.where = "ID IN (" + gameDistributionID + ")";
			newQueryTask5.execute (newQuery5, showResults5);
		}
			
		function showResults(featureSet) {
			//Performance enhancer - assign featureSet array to a single variable.
			var newFeatures = featureSet.features;

			//Loop through each feature returned
			for (var i=0, il=newFeatures.length; i<il; i++) {
				//Get the current feature from the featureSet.
				//Feature is a graphic
				var newGraphic = newFeatures[i];
				newGraphic.setSymbol(newHighlight);

				//Add graphic to the map graphics layer.
				queryLayer.add(newGraphic);
				
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
			for (var i=0, il=newFeatures1.length; i<il; i++) {
				//Get the current feature from the featureSet.
				//Feature is a graphic
				var newGraphic1 = newFeatures1[i];
				newGraphic1.setSymbol(newHighlight1);

				//Add graphic to the map graphics layer.
				queryLayer.add(newGraphic1);
				
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
			for (var i=0, il=newFeatures2.length; i<il; i++) {
				//Get the current feature from the featureSet.
				//Feature is a graphic
				var newGraphic2 = newFeatures2[i];
				newGraphic2.setSymbol(newHighlight2);

				//Add graphic to the map graphics layer.
				queryLayer.add(newGraphic2);
				
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
				var newGraphic3 = newFeatures3[i];
				newGraphic3.setSymbol(newHighlight3);

				//Add graphic to the map graphics layer.
				queryLayer.add(newGraphic3);
				
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
				var newGraphic4 = newFeatures4[i];
				newGraphic4.setSymbol(newHighlight4);

				//Add graphic to the map graphics layer.
				queryLayer.add(newGraphic4);
				
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
			var attributes,pt, graphic;
			pt = item.feature.geometry;
			place.address = item.name;
			// Graphic components
			attributes = { address:place.address, lat:pt.getLatitude().toFixed(2), lon:pt.getLongitude().toFixed(2) };   
			//infoTemplate = new InfoTemplate("${address}","Latitude: ${lat}<br/>Longitude: ${lon}"); !!!WILL NOT PRINT IF INFOTEMPLATE IS USED!!!
			graphic = new Graphic(pt,symbol,attributes);
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
		
		measurement.on("measure-end", function () {
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
			$("#div_for_pdf").hide();
			submitPrint(); 
		});
		
		$("#pdfModal").on('hidden.bs.modal', function(){
			dojo.byId("printStatus").innerHTML = "";
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
						$("#div_for_pdf").click(function(){
							$("#pdfModal").modal('hide');
							$("#div_for_pdf").html("");
						});
					} else {
						window.open(new_url_for_map);
						$("#pdfModal").modal('hide');
					}
					$("#div_for_pdf").show();
					$("#loadingPrint").hide();
					
				});
			
				deferred.addErrback(function (error) {
					console.log("Print Task Error = " + error);
			
					status.innerHTML = error;				
      });
	};
	
	// Show modal dialog, hide nav
	$(document).ready(function(){
		//populate the Game Distribution dropdown with JSON vars.
		$.each(gameAnimalList, function(){
			$('#gameDistribution').append('<option value="' + this.ID + '">' + this.NAME + '</option>');
		});
		// legend nav1 menu is selected
		$("#legendNav1").click(function(e){
			$("#legendCollapse").collapse('toggle');
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// legend nav2 menu is selected
		$("#legendNav2").click(function(e){
			$("#legendCollapse").collapse('toggle');
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
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
		// share nav1 menu is selected
		$("#shareNav1").click(function(e){
			$("#shareModal").modal("show"); 
			// Bootstrap work-around
			$("body").css("margin-right","0px");
			$(".navbar").css("margin-right","0px");
		});
		// share nav2 menu is selected
		$("#shareNav2").click(function(e){
			$("#shareModal").modal("show"); 
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
})