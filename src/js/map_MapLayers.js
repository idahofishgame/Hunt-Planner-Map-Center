var map, mapCenterLayer, infos = {}, visible = [];
require(["esri/map", 
	"esri/dijit/Scalebar",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/DynamicLayerInfo", "esri/layers/LayerDataSource",
	"esri/layers/LayerDrawingOptions", "esri/layers/TableDataSource",
	"esri/Color", "esri/renderers/SimpleRenderer",
	"esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol",
	"esri/dijit/Geocoder", 
	"esri/InfoTemplate", 
	"esri/graphic", 
	"esri/geometry/Multipoint", 
	"esri/symbols/PictureMarkerSymbol",
	"esri/dijit/Popup",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-style", 
	"dojo/query",	
	"dojo/on",
	"dojo/parser",
	"dojo/_base/array",
	"dojo/dnd/Source",
	"dijit/registry",
	"application/bootstrapmap", 
	"dojo/domReady!"], 
	function(Map, Scalebar, ArcGISDynamicMapServiceLayer, DynamicLayerInfo, LayerDataSource, LayerDrawingOptions, TableDataSource, Color, SimpleRenderer, SimpleFillSymbol, SimpleLineSymbol,Geocoder, InfoTemplate, Graphic, Multipoint, PictureMarkerSymbol, Popup, dom, domConstruct, domStyle, query, on, parser, arrayUtils, Source, registry, BootstrapMap) {
		parser.parse();
		
		//Get a reference to the ArcGIS Map class
		map = BootstrapMap.create("mapDiv",{
			basemap:"topo",
			center:[-114.52,45.50],
			zoom:6
		});
		
		var scalebar = new Scalebar({
			map: map,
			scalebarUnit: "dual"
		});
		
		// Create layer list
		var dynamicLayerInfo;
		var dndSource = new Source("layerList");
      dndSource.on("DndDrop", reorderLayers);

      mapCenterLayer = new ArcGISDynamicMapServiceLayer("https://fishandgame.idaho.gov/gis/rest/services/Data/Hunting/MapServer", { 
        "id": "hunting" 
      });
			
      mapCenterLayer.on("load", function() {
        /* dynamicLayerInfos = e.target.createDynamicLayerInfosFromLayerInfos(); 
        arrayUtils.forEach(dynamicLayerInfos, function(info) {
          var i = { 
            id: info.id,
            name: info.name,
            position: info.id
          };
          if ( arrayUtils.indexOf(mapCenterLayer.visibleLayers, info.id) > -1 ) {
            i.visible = true;
          } else {
            i.visible = false;
          }
          infos[info.id] = i;
        });
        infos.total = dynamicLayerInfos.length;
        e.target.setDynamicLayerInfos(dynamicLayerInfos, true); */
				if (mapCenterLayer.loaded) {
					buildLayerList(mapCenterLayer);
				}
				else {
					dojo.connect(mapCenterLayer, "onLoad", buildLayerList);
				}
      });
      // only create the layer list the first time update-end fires
      on.once(mapCenterLayer, "update-end", buildLayerList);
      // hide the loading icon when the dynamic layer finishes updating
      mapCenterLayer.on("update-end", hideLoading);
      map.addLayer(mapCenterLayer);
		
			function buildLayerList() {
        dndSource.clearItems();
        domConstruct.empty(dom.byId("layerList"));

      /*var layerNames = [];
        for ( info in infos ) {
          if ( !infos[info].hasOwnProperty("id") ) {
            continue;
          }
          // only want the layer's name, don't need the db name and owner name
          var nameParts = infos[info].name.split(".");
          var layerName = nameParts[nameParts.length - 1];
          var layerDiv = createToggle(layerName, infos[info].visible);
          layerNames[infos[info].position] = layerDiv;
        };
        dndSource.insertNodes(false, layerNames);*/
				
				var items = dojo.map(mapCenterLayer.layerInfos,function(info,index){
          if (info.defaultVisibility) {
            visible.push(info.id);
          }
          return "<input type='checkbox' class='list_item' checked='" + (info.defaultVisibility ? "checked" : "") + "' id='" + info.id + "' onclick='updateLayerVisibility();' /><label for='" + info.id + "'>" + info.name + "</label>";
        });

        dojo.byId("layerList").innerHTML = items.join();

        mapCenterLayer.setVisibleLayers(visible);
        map.addLayer(mapCenterLayer);
      }
			
			/* function toggleLayer(e) {
        showLoading();
        for ( info in infos ) {
          var i = infos[info];
          if ( i.name === e.target.name ) {
            i.visible = !i.visible;
          } 
        }
        mapCenterLayer.setDynamicLayerInfos(getVisibleLayers());
      } */
			
			function updateLayerVisibility() {
        var inputs = dojo.query(".list_item"), input;

        dojo.forEach(inputs,function(input){
          if (input.checked) {
              visible.push(input.id);
          }
          });
        //if there aren't any layers visible set the array to be -1
        if(visible.length === 0){
          visible.push(-1);
        }
        mapCenterLayer.setVisibleLayers(visible);
      }

      function reorderLayers() {
        showLoading();
        var newOrder = getVisibleLayers();
        mapCenterLayer.setDynamicLayerInfos(newOrder);
      }
			
			/* function getVisibleLayers() {
        // get layer name nodes, build an array corresponding to new layer order
        var layerOrder = [];
        query("#layerList .dojoDndItem label").forEach(function(n, idx) {
          for ( info in infos ) {
            var i = infos[info];
            if ( i.name === n.innerHTML ) {
              layerOrder[idx] = i.id;
              // keep track of a layer's position in the layer list
              i.position = idx;
              break;
            }
          }
        });
        // find the layer IDs for visible layer
        var ids = arrayUtils.filter(layerOrder, function(l) {
          return infos[l].visible;
        });
        // get the dynamicLayerInfos for visible layers
        var visible = arrayUtils.map(ids, function(id) {
          return dynamicLayerInfos[id];
        });
        return visible;
      }

      function createToggle(name, visible) {
        var div = domConstruct.create("div");
        var layerVis = domConstruct.create("input", {
          checked: visible,
          id: name,
          name: name,
          type: "checkbox"
        }, div);
        on(layerVis, "click", toggleLayer);
        var layerSpan = domConstruct.create("label", {
          for: name,
          innerHTML: name
        }, div);
        return div;
      } */

      function showLoading() {
        domStyle.set(dom.byId("loading"), "display", "inline-block");
      }

      function hideLoading() {
        domStyle.set(dom.byId("loading"), "display", "none");
      }
		
		// Create widget
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

		// Show modal dialog, hide nav
		$(document).ready(function(){
			// Close menu (THIS CODE DOESN'T SEEN NECESSARY AFTER I ADDED THE OFF-CANVAS SIDEBAR TOGGLE CODE BELOW.)
				//$('.nav a').on('click', function(){
				//$(".navbar-toggle").click();
			//});
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
			// layerList nav1 menu is selected
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
