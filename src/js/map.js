﻿let map;
require([
        "esri/config",
        "esri/urlUtils",
        "esri/arcgis/utils",
        "esri/map",
        "esri/dijit/LocateButton",
        "esri/dijit/Scalebar",
        "esri/request",
        "esri/geometry/scaleUtils",
        "esri/renderers/SimpleRenderer",
        "esri/renderers/UniqueValueRenderer",
        "esri/symbols/PictureMarkerSymbol",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/TextSymbol",
        "esri/symbols/Font",
        "esri/Color",
        "esri/geometry/Point",
        "esri/geometry/Multipoint",
        "esri/geometry/webMercatorUtils",
        "esri/layers/FeatureLayer",
        "esri/layers/CSVLayer",
        "esri/layers/LabelClass",
        "esri/layers/GraphicsLayer",
        "esri/layers/ArcGISTiledMapServiceLayer",
        "esri/layers/VectorTileLayer",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/ArcGISImageServiceLayer",
        "esri/layers/DynamicLayerInfo",
        "esri/layers/WMSLayer",
        "esri/dijit/LayerList",
        "esri/dijit/BasemapLayer",
        "esri/dijit/Basemap",
        "esri/dijit/BasemapGallery",
        "esri/InfoTemplate",
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
        esriConfig, urlUtils, arcgisUtils, Map, LocateButton, Scalebar, request, scaleUtils, SimpleRenderer, UniqueValueRenderer, PictureMarkerSymbol,
        SimpleMarkerSymbol, SimpleFillSymbol, SimpleLineSymbol, TextSymbol, Font, Color, Point, Multipoint, webMercatorUtils,
        FeatureLayer, CSVLayer, LabelClass, GraphicsLayer, ArcGISTiledMapServiceLayer, VectorTileLayer, ArcGISDynamicMapServiceLayer,
        ArcGISImageServiceLayer, DynamicLayerInfo, WMSLayer, LayerList, BasemapLayer, Basemap, BasemapGallery, InfoTemplate, QueryTask, Query, Search,
        Extent, GeometryService, Measurement, Draw, Graphic, PrintParameters, PrintTemplate, PrintTask, dom, domClass, domConstruct,
        JSON, on, parser, query, sniff, connect, arrayUtils, lang, registry
    ) {
        //Proxy settings
        // esriConfig.defaults.io.proxyUrl = "https://idfg.idaho.gov/ifwis/gis_proxy/proxy.ashx?";
        // esriConfig.defaults.io.alwaysUseProxy = false;
        esriConfig.defaults.io.corsDetection = false;
        esri.config.defaults.io.corsEnabledServers.push('https://gis.idfg.idaho.gov/portal');

        // call the parser to create the dijit layout dijits
        parser.parse(); // note djConfig.parseOnLoad = false;

        //hide the loading icon after the window has loaded.
        $(window).load(function () {
            $("#loading").hide();
            clearFileInputField(uploadForm);
        });

        //IE will sometimes not hide the loading icon after the window has loaded.  Set timer to hide loading icon.
        setTimeout(function () {
            $("#loading").hide();
        }, 5000);

        //Get a reference to the ArcGIS Map class
        map = new Map("mapDiv", {
            center: [-114.52, 45.50],
            zoom: 6,
            basemap: "topo",
            autoResize: true,
            showLabels: true //very important that this must be set to true for labels to show up!
        });

        //You cannot set the default basemap to a vector basemap using the map reference above.
        //Workaround = add vectorTileLayer over hillshade initially and just remove once the basemap is changed.
        // var defaultBasemap1 = new ArcGISTiledMapServiceLayer("https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer");
        // var defaultBasemap2 = new VectorTileLayer("https://www.arcgis.com/sharing/rest/content/items/86d5ed4b6dc741de9dad5f0fbe09ae95/resources/styles/root.json?f=pjson");
        // map.addLayers([defaultBasemap1, defaultBasemap2]);

        //LocateButton will zoom to where you are.  If tracking is enabled and the button becomes a toggle that creates an event to watch for location changes.
        var locateSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([215, 73, 255, 0.8]), 8),
            new Color([199, 0, 255, 0.8]));

        let geoLocate = new LocateButton({
            map: map,
            symbol: locateSymbol,
            scale: 36111.909643
            //useTracking: true
        }, "LocateButton");
        geoLocate.startup();

        //add scalebar
        let scalebar = new Scalebar({
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

        function deg_to_dms(deg) {
            var d = Math.floor(deg);
            var minfloat = (deg - d) * 60;
            var m = Math.floor(minfloat);
            var secfloat = (minfloat - m) * 60;
            var s = Math.round(secfloat);

            if (s === 60) {
                m++;
                s = 0;
            }
            if (m === 60) {
                d++;
                m = 0;
            }
            return ("" + d + '&deg;' + m + '\'' + s + '" ');
        }


        // Show coordinates as the user scrolls around the map. In Desktop, it displays where ever the mouse is hovering.  In mobile, the user must tap the screen to get the coordinates.
        // Class 'dms' will determine whether coordinates are displayed in DD or DMS when showCoordinates() executes
        $("#info1").on("click", function () {
            $("#info1").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
            $("#info1").toggleClass("dms");

        });

        function showCoordinates(evt) {
            //the map is in web mercator but display coordinates in geographic (lat, long) & UTM NAD 83 Zone 11 & 12
            var utm11SR = new esri.SpatialReference({
                wkid: 102205
            });
            var utm12SR = new esri.SpatialReference({
                wkid: 102206
            });
            var gsvc = new esri.tasks.GeometryService("//tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
            var mp = webMercatorUtils.webMercatorToGeographic(evt.mapPoint);
            //display mouse coordinates
            //convert DD to DMS
            let y = deg_to_dms(mp.y);
            let x = deg_to_dms(mp.x);
            if ($('#info1').hasClass("dms")) {
                $("#info1").html(y + 'N' + ", " + x + 'E')
            } else {
                $("#info1").html("WGS84 DD: " + mp.x.toFixed(3) + ", " + mp.y.toFixed(3));
            }
            if (mp.x <= -114 && mp.x >= -120) { //if hovering in zone 11
                gsvc.project([evt.mapPoint], utm11SR, function (result) {
                    $("#info2").show();
                    $("#info2").html("NAD83 UTM 11T: " + result[0].x.toFixed() + ', ' + result[0].y.toFixed());
                });
            } else if (mp.x > -114 && mp.x <= -108) { //if hovering in zone 12
                gsvc.project([evt.mapPoint], utm12SR, function (result) {
                    $("#info2").show();
                    $("#info2").html("NAD83 UTM 12T: 0" + result[0].x.toFixed() + ', ' + result[0].y.toFixed());
                });
            } else {
                $("#info2").hide();
            }
        }

        //add the basemap gallery, in this case we'll display maps from ArcGIS.com
        let basemapGallery = new BasemapGallery({
            showArcGISBasemaps: false,
            map: map,
        }, "basemapDiv");
        basemapGallery.startup();

        basemapGallery.on("error", function (msg) {
            console.log("basemap gallery error:  ", msg);
        });

        //Add the World Topo basemap to the basemap gallery.
        var worldTopo = new BasemapLayer({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"
        });
        var worldTopoBasemap = new Basemap({
            layers: [worldTopo],
            title: "Esri World Topographic",
            thumbnailUrl: "src/images/world_topo.png"
        });
        basemapGallery.add(worldTopoBasemap);

        //Add the Imagery with Labels basemap to the basemap gallery.
        var Imagery = new BasemapLayer({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
        });

        var imageryBasemap = new Basemap({
            layers: [Imagery],
            title: "Esri Satellite Imagery",
            thumbnailUrl: "src/images/world_imagery.png"
        });
        basemapGallery.add(imageryBasemap);

        //Add the USA Topo basemap to the basemap gallery.
        var usaTopo = new BasemapLayer({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer"
        });
        var usaBasemap = new Basemap({
            layers: [usaTopo],
            title: "Esri USGS Topographic",
            thumbnailUrl: "src/images/usa_topo.jpg"
        });
        basemapGallery.add(usaBasemap);

        //Add the USGS topo basemap to the basemap gallery.
        var usgsTopo = new BasemapLayer({
            url: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer"
        });
        var usgsTopoBasemap = new Basemap({
            layers: [usgsTopo],
            title: "USGS National Map",
            thumbnailUrl: "src/images/usgstopo.jpg"
        });
        basemapGallery.add(usgsTopoBasemap);

        //Add the World Topo Vector basemap to the basemap gallery.
        var Hillshade = new BasemapLayer({
            url: "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer"
        });
        var worldTopoHigh = new BasemapLayer({
            styleUrl: "https://www.arcgis.com/sharing/rest/content/items/86d5ed4b6dc741de9dad5f0fbe09ae95/resources/styles/root.json?f=pjson",
            type: "VectorTileLayer"
        });
        var worldTopoHighBasemap = new Basemap({
            layers: [Hillshade, worldTopoHigh],
            title: "Esri Hi-Res World Topographic",
            thumbnailUrl: "src/images/topoHigh.jpg"
        });
        basemapGallery.add(worldTopoHighBasemap);

        var Reference = new BasemapLayer({
            styleUrl: "https://www.arcgis.com/sharing/rest/content/items/af6063d6906c4eb589dfe03819610660/resources/styles/root.json?f=pjson",
            type: "VectorTileLayer"
        });
        var imageryLabelBasemap = new Basemap({
            layers: [Imagery, Reference],
            title: "Esri Imagery w/Labels",
            thumbnailUrl: "src/images/imageryLabels.jpg"
        });
        basemapGallery.add(imageryLabelBasemap);

        //Remove the default "basemaps" if one of the other basemaps are selected.
        // $("#basemapDiv").click(function () {
        // 	//Remove the default "basemap" layers once a user has selected a basemap.
        // 	defaultBasemap1.hide();
        // 	defaultBasemap2.hide();
        // });

        //You cannot print vector basemaps. :(  Disable the 'Create Map!' button when they are selected.
        // if (defaultBasemap1.visible == true || defaultBasemap2.visible === true) {
        // 	$("#btnPDF").prop('disabled', true);
        // 	$("#pdfNote").hide();
        // 	$("#wrongBasemap").show();
        // }
        // $("#galleryNode_basemap_4, #galleryNode_basemap_5").click(function () {
        // 	$("#btnPDF").prop('disabled', true);
        // 	$("#pdfNote").hide();
        // 	$("#wrongBasemap").show();
        // 	//Enable the 'Create Map!' button when printable basemaps are selected.
        // });
        // $("#galleryNode_basemap_0, #galleryNode_basemap_1, #galleryNode_basemap_2, #galleryNode_basemap_3").click(function () {
        // 	$("#btnPDF").prop('disabled', false);
        // 	$("#pdfNote").show();
        // 	$("#wrongBasemap").hide();
        // });

        //Create popups for certain layers.
        var controlledHuntPopupTemplate = new InfoTemplate();
        controlledHuntPopupTemplate.setTitle("${BigGame} Controlled Hunt Area");
        controlledHuntPopupTemplate.setContent(
            "<b>Hunt Area: </b>${HuntArea}<br/>" +
            "<b>Area Note: </b>${AreaNote}<br/>"
        );
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
        var _furbearerHuntResInfoTemplate = new InfoTemplate();
        _furbearerHuntResInfoTemplate.setTitle("Furbearer Hunting Restrictions");
        _furbearerHuntResInfoTemplate.setContent(
            "<b>Area: </b>${Closed_Are}<br/>" +
            "<b>Restriction: </b>${Comments}</br>"
        );
        var airstripsPopupTemplate = new InfoTemplate();
        airstripsPopupTemplate.setTitle("FAA Airport/Airstrip Info");
        airstripsPopupTemplate.setContent(
            "<b>Name: </b>${FULLNAME}</br>" +
            "<b>Location: </b>${CITY_NAME}</br>" +
            "<b>Type: </b>${LAN_FA_TY}</br>"
        );
        var campgroundPopupTemplate = new InfoTemplate();
        campgroundPopupTemplate.setTitle("Campground Info");
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
        var roadClosurePopupTemplate = new InfoTemplate();
        roadClosurePopupTemplate.setTitle("Road Closure Info");
        roadClosurePopupTemplate.setContent(
            "<b>Road/Trail #: </b>${ID}</br>" +
            "<b>Name: </b>${NAME}</br>" +
            "<b>Jurisdiction: </b>${JURISDICTION}</br>" +
            "<b>Office: </b>${OFFICE}</br>" +
            "<b>Office Phone #: </b>${OFFICE_PHONE}</br>" +
            "<b>Sheriff Phone #: </b>${SHERIFF_PHONE}</br>" +
            "<a style='cursor:pointer;' href='${Alerts}' target='_blank'>Alert Info</a>"
        );
        var closurePopupTemplate = new InfoTemplate();
        closurePopupTemplate.setTitle("Fire Closure Info");
        closurePopupTemplate.setContent(
            "<b>Name: </b>${NAME}<br/>" +
            "<b>Effective Date: </b>${UPDATE_}<br/>" +
            "<a style='cursor:pointer;' href='${URL}' target='_blank'>InciWeb Description</a>"
        );
        var perimeterPopupTemplate = new InfoTemplate();
        perimeterPopupTemplate.setTitle("{fire_name} Fire");
        perimeterPopupTemplate.setContent(
            "<b>Acres: </b>${gisacres}<br/>" +
            "<b>Active (Y/N): </b>${active}<br/>" +
            "<b><a target='_blank' href=//inciweb.nwcg.gov/incident/${inciwebid}>Click for InciWeb Information</a></b>"
        );
        var fireReportPopupTemplate = new InfoTemplate();
        fireReportPopupTemplate.setTitle("Active Fire Report");
        fireReportPopupTemplate.setContent(
            "<b>${name} Fire</b><br>${size}<br>${contained}% contained<br><br><a target='_blank' href='" + 'https://inciweb.nwcg.gov/' + "${url}'>View Wildfire on Inciweb</a><br><br><em>Last Updated: ${updated}</em>"
        );

        var significantClosuresPopupTemplate = new InfoTemplate();
        significantClosuresPopupTemplate.setTitle("Closure Info");

        significantClosuresPopupTemplate.setContent(
            "<b>Name: </b>${NAME}<br/>" +
            "<b>Effective Date: </b>${UPDATE_}<br/>" +
            "<a style='cursor:pointer;' href='${URL}' target='_blank'>View on InciWeb</a>"
        );

        var largeTractsPopupTemplate = new InfoTemplate();
        largeTractsPopupTemplate.setTitle("${Access} Access");
        largeTractsPopupTemplate.setContent(getTractsContent);

        function getTractsContent(tract) {
            var content = "<b>Official name</b>: " + tract.attributes.Partnership + " <br/>";
            content += "<b>Partner</b>: " + tract.attributes.AgreementWith + " <br/>";

            switch (tract.attributes.AgreementWith) {
                case ("PotlachDeltic"):
                    content = +"Access to hunt, fish, view wildlife is allowed under IDFG agreement. Contact PotlatchDeltic for OHV, camping, etc.<hr/>";
                    break;
                default:
                    if (tract.attributes.Access !== "Restricted") {
                        content += "Access to hunt, fish, view wildlife is allowed under IDFG agreement.<br/>";
                    } else {
                        content += "Access is not allowed under the IDFG agreement.<br/>";
                    }
            }

            return content += "<a href='" + tract.attributes.IDFGMoreInfo + "'><br/>More information</a><br/>" +
                "<br/>" +
                "<b>Last Updated:</b> " + getFormattedDate(new Date(tract.attributes.last_edited_date));
        }

        function getFormattedDate(date) {
            var year = date.getFullYear();

            var month = (1 + date.getMonth()).toString();
            month = month.length > 1 ? month : "0" + month;

            var day = date.getDate().toString();
            day = day.length > 1 ? day : "0" + day;

            return month + "/" + day + "/" + year;
        }

        function getUrlVars() {
            var vars = {};
            window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
                vars[key] = value;
            });
            return vars;
        }

        var params = getUrlVars();

        if (!params.hunt && !params.admin && !params.reference && !params.wildlife) {
            params.hunt = 1;
        }

        // HUNT RELATED LAYERS GROUP //
        let gameMgmtUnits = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/GameManagementUnits/FeatureServer/0", {
            id: "Game_Management_Units",
            visible: (1 & params.hunt) !== 0
        });
        let gmuMotorizedHuntRules = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/GMUsWithMotorizedHuntingRules/FeatureServer/0", {
            id: "GMUs_with_Motorized_Hunting_Rules",
            visible: (2 & params.hunt) !== 0
        });

        let elkMgmtZones = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ElkManagementZones/FeatureServer/0", {
            id: "Elk_Management_Zones",
            visible: (4 & params.hunt) !== 0
        });
        let controlledHuntAntelope = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ControlledHunts_All/FeatureServer/0", {
            id: "Controlled_Hunt_Areas_-_Antelope",
            outFields: ["BigGame", "HuntArea", "AreaNote"],
            infoTemplate: controlledHuntPopupTemplate,
            visible: (8 & params.hunt) !== 0
        });
        controlledHuntAntelope.setDefinitionExpression("Year = 2019 AND BigGame = 'Pronghorn'");

        let controlledHuntBear = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ControlledHunts_All/FeatureServer/0", {
            id: "Controlled_Hunt_Areas_-_Bear",
            outFields: ["BigGame", "HuntArea", "AreaNote"],
            infoTemplate: controlledHuntPopupTemplate,
            visible: (16 & params.hunt) !== 0
        });
        controlledHuntBear.setDefinitionExpression("Year = 2019 AND BigGame = 'Bear'");

        let controlledHuntBighorn = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ControlledHunts_All/FeatureServer/0", {
            id: "Controlled_Hunt_Areas_-_Bighorn Sheep",
            outFields: ["BigGame", "HuntArea", "AreaNote"],
            infoTemplate: controlledHuntPopupTemplate,
            visible: (32 & params.hunt) !== 0
        });
        controlledHuntBighorn.setDefinitionExpression("Year = 2019 AND BigGame LIKE '%Sheep'");

        let controlledHuntDeer = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ControlledHunts_All/FeatureServer/0", {
            id: "Controlled_Hunt_Areas_-_Deer",
            outFields: ["BigGame", "HuntArea", "AreaNote"],
            infoTemplate: controlledHuntPopupTemplate,
            visible: (64 & params.hunt) !== 0,
        });
        controlledHuntDeer.setDefinitionExpression("Year = 2019 AND BigGame = 'Deer'");

        let controlledHuntElk = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ControlledHunts_All/FeatureServer/0", {
            id: "Controlled_Hunt_Areas_-_Elk",
            outFields: ["BigGame", "HuntArea", "AreaNote"],
            infoTemplate: controlledHuntPopupTemplate,
            visible: (128 & params.hunt) !== 0
        });
        controlledHuntElk.setDefinitionExpression("Year = 2019 AND BigGame = 'Elk'");

        let controlledHuntGoat = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ControlledHunts_All/FeatureServer/0", {
            id: "Controlled_Hunt_Areas_-_Mountain_Goat",
            outFields: ["BigGame", "HuntArea", "AreaNote"],
            infoTemplate: controlledHuntPopupTemplate,
            visible: (256 & params.hunt) !== 0
        });
        controlledHuntGoat.setDefinitionExpression("Year = 2019 AND BigGame = 'Goat'");

        let controlledHuntMoose = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ControlledHunts_All/FeatureServer/0", {
            id: "Controlled_Hunt_Areas_-_Moose",
            outFields: ["BigGame", "HuntArea", "AreaNote"],
            infoTemplate: controlledHuntPopupTemplate,
            visible: (512 & params.hunt) !== 0
        });
        controlledHuntMoose.setDefinitionExpression("Year = 2019 AND BigGame = 'Moose'");

        let controlledHuntTurkey = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/ControlledHunts_Turkey/FeatureServer/0", {
            id: "Controlled_Hunt_Areas_-_Turkey",
            outFields: ["BigGame", "HuntArea", "AreaNote"],
            infoTemplate: controlledHuntPopupTemplate,
            visible: (1024 & params.hunt) !== 0
        });
        //controlledHuntTurkey.setDefinitionExpression("Year = 2019 AND BigGame = 'Turkey'");

        let huntingRestrictionsBigGame = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/AreasWithHuntingRestrictions/FeatureServer/0", {
            id: "Areas_with_Big_Game_Hunting_Restrictions",
            outFields: ["*"],
            infoTemplate: _bigGameHuntResInfoTemplate,
            visible: (2048 & params.hunt) !== 0
        });

        let huntingRestrictionsGameBird = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/AreasWithHuntingRestrictions/FeatureServer/1", {
            id: "Areas_with_Upland_Game_and_Turkey_Hunting_Restrictions",
            outFields: ["*"],
            infoTemplate: _uplandGameBirdTurkeyHuntResInfoTemplate,
            visible: (4096 & params.hunt) !== 0
        });

        let huntingRestrictionsUplandGame = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/AreasWithHuntingRestrictions/FeatureServer/2", {
            id: "Areas_with_Upland_Game_Hunting_Restrictions",
            outFields: ["*"],
            infoTemplate: _uplandGameHuntResInfoTemplate,
            visible: (8192 & params.hunt) !== 0
        });

        let huntingRestrictionsWaterfowl = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/AreasWithHuntingRestrictions/FeatureServer/3", {
            id: "Areas_with_Waterfowl_Hunting_Restrictions",
            outFields: ["*"],
            infoTemplate: _waterfowlHuntResInfoTemplate,
            visible: (16384 & params.hunt) !== 0
        });

        let huntingRestrictionsFurbearer = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/AreasWithHuntingRestrictions/FeatureServer/4", {
            id: "Areas_with_Furbearer_Hunting_Restrictions",
            outFields: ["*"],
            infoTemplate: _furbearerHuntResInfoTemplate,
            visible: (32768 & params.hunt) !== 0
        });

        let wildlifeTracts = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/South_Central_Idaho_Wildlife_Tracts/FeatureServer/0", {
            id: "Wildlife_Tracts",
            visible: false
        });

        let wolfMgmtZones = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/Wolf_Management_Zones/FeatureServer/0", {
            id: "Wolf_Management_Zones",
            visible: false
        });


        // ADMINISTRATIVE BOUNDARIES LAYER GROUP //
        let regionsLayer = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/Administrative_Regions/FeatureServer/0", {
            id: "Fish_and_Game_Regions",
            visible: (1 & params.admin) !== 0
        });

        let countiesLayer = new FeatureLayer("https://gis2.idaho.gov/arcgis/rest/services/IdahoAGOL/Idaho_Counties/MapServer/1", {
            id: "counties",
            outFields: ["*"],
            visible: (2 & params.admin) !== 0
        });
        var countyLabel = new TextSymbol().setColor(new Color([0, 0, 0]));
        var countyFont = new esri.symbol.Font();
        countyFont.setSize("10pt");
        countyFont.setFamily("arial");
        countyFont.setWeight(Font.WEIGHT_BOLD);
        countyLabel.setFont(countyFont);
        countyLabel.setHaloColor(new Color([255, 255, 255]));
        countyLabel.setHaloSize(1);
        var countyjson = {
            "labelExpressionInfo": {
                "value": "{NAME}"
            },
            minScale: 2500000
        };
        var countyLabelClass = new LabelClass(countyjson);
        countyLabelClass.symbol = countyLabel;
        countiesLayer.setLabelingInfo([countyLabelClass]);

        let wildernessLayer = new FeatureLayer("https://gisservices.cfc.umt.edu/arcgis/rest/services/ProtectedAreas/National_Wilderness_Preservation_System/FeatureServer/0", {
            id: "wilderness",
            opacity: 0.4,
            outFields: ["*"],
            visible: (64 & params.admin) !== 0
        });
        wildernessLayer.setDefinitionExpression("STATE IN ('ID','ID/MT','ID/OR')");
        var wildfill = new SimpleFillSymbol().setColor(new Color([76, 115, 0]));
        var wildernessRenderer = new SimpleRenderer(wildfill);
        wildernessLayer.setRenderer(wildernessRenderer);
        var wildernessLabel = new TextSymbol().setColor(new Color([47, 79, 79]));
        var wildernessFont = new esri.symbol.Font();
        wildernessFont.setSize("9pt");
        wildernessFont.setFamily("arial");
        wildernessFont.setWeight(Font.WEIGHT_BOLD);
        wildernessLabel.setFont(wildernessFont);
        wildernessLabel.setHaloColor(new Color([238, 232, 170]));
        wildernessLabel.setHaloSize(1);
        var wildjson = {
            "labelExpressionInfo": {
                "value": "{NAME}"
            },
            minScale: 2500000
        };
        var wildernessLabelClass = new LabelClass(wildjson);
        wildernessLabelClass.symbol = wildernessLabel;
        wildernessLayer.setLabelingInfo([wildernessLabelClass]);

        let rangerDistrictLayer = new FeatureLayer("https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_RangerDistricts_01/MapServer/1", {
            id: "rangerDistricts",
            opacity: 0.5,
            outFields: ["*"],
            maxScale: 0,
            minScale: 0,
            visible: false
        });
        rangerDistrictLayer.setDefinitionExpression("DISTRICTNAME in ('Bonners Ferry Ranger District','Sandpoint Ranger District','St. Joe Ranger District','Coeur d''Alene River Ranger District','North Fork Ranger District','Lochsa/Powell Ranger District','Moose Creek Ranger District','Red River Ranger District','West Fork Ranger District','Hells Canyon National Recreation Area','Council Ranger District','New Meadows Ranger District','McCall Ranger District','Krassell Ranger District','Leadore Ranger District','Salmon-Cobalt Ranger District','Challis-Yankee Fork Ranger District','Cascade Ranger District','Weiser Ranger District','Emmett Ranger District','Lowman Ranger District','Idaho City Ranger District','Mountain Home Ranger District','Sawtooth National Recreation Area','Fairfield Ranger District','Ketchum Ranger District','Lost River Ranger District','Dubois Ranger District','Ashton/Island Park Ranger District','Teton Basin Ranger District','Palisades Ranger District','Soda Springs Ranger District','Montpelier Ranger District','Westside Ranger District','Minidoka Ranger District','Priest Lake Ranger District','Salmon River Ranger District', 'Middle Fork Ranger District')");

        var rangerfill = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH,
                new Color([38, 115, 0]), 1), new Color([233, 255, 190])
        );
        var rangerRenderer = new SimpleRenderer(rangerfill);
        rangerDistrictLayer.setRenderer(rangerRenderer);
        var rangerLabel = new TextSymbol().setColor(new Color([38, 115, 0]));
        var rangerFont = new esri.symbol.Font();
        rangerFont.setSize("9pt");
        rangerFont.setFamily("arial");
        rangerFont.setWeight(Font.WEIGHT_BOLD);
        rangerLabel.setFont(wildernessFont);
        rangerLabel.setHaloColor(new Color([233, 255, 190]));
        rangerLabel.setHaloSize(1);
        var rangerjson = {
            "labelExpressionInfo": {
                "value": "{DISTRICTNAME}"
            },
            minScale: 2500000
        };
        var rangerLabelClass = new LabelClass(rangerjson);
        rangerLabelClass.symbol = rangerLabel;
        rangerDistrictLayer.setLabelingInfo([rangerLabelClass]);

        let usfsAdminLayer = new FeatureLayer("https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0", {
            id: "usfsAdmin",
            opacity: 0.5,
            outFields: ["*"],
            visible: (16 & params.admin) !== 0,
            maxScale: 0,
            minScale: 0
        });

        usfsAdminLayer.setDefinitionExpression("FORESTNAME in ('Idaho Panhandle National Forests','Kootenai National Forest','Nez Perce-Clearwater National Forest','Bitterroot National Forest','Payette National Forest','Salmon-Challis National Forest','Boise National Forest','Sawtooth National Forest','Caribou-Targhee National Forest','Wallowa-Whitman National Forest')");

        let usfsAdminfill = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([38, 115, 0]), 2), new Color([233, 255, 190])
        );
        var usfsAdminRenderer = new SimpleRenderer(usfsAdminfill);
        usfsAdminLayer.setRenderer(usfsAdminRenderer);
        var usfsAdminLabel = new TextSymbol().setColor(new Color([38, 115, 0]));
        var usfsAdminFont = new esri.symbol.Font();
        usfsAdminFont.setSize("10pt");
        usfsAdminFont.setFamily("arial");
        usfsAdminFont.setWeight(Font.WEIGHT_BOLD);
        usfsAdminLabel.setFont(usfsAdminFont);
        usfsAdminLabel.setHaloColor(new Color([233, 255, 190]));
        usfsAdminLabel.setHaloSize(1);
        var usfsAdminjson = {
            "labelExpressionInfo": {
                "value": "{FORESTNAME}"
            },
            minScale: 2500000
        };
        let usfsAdminLabelClass = new LabelClass(usfsAdminjson);
        usfsAdminLabelClass.symbol = usfsAdminLabel;
        usfsAdminLayer.setLabelingInfo([usfsAdminLabelClass]);

        let blmFieldOfficeLayer = new FeatureLayer("https://gis.blm.gov/arcgis/rest/services/admin_boundaries/BLM_Natl_AdminUnit/MapServer/3", {
            id: "blmFieldOffice",
            visible: (8 & params.admin) !== 0
        });

        blmFieldOfficeLayer.setDefinitionExpression("ADMIN_ST = 'ID'");

        var blmOfill = new SimpleLineSymbol(SimpleLineSymbol.STYLE_LONGDASHDOT, new Color([132, 0, 168]), 2);
        var blmORenderer = new SimpleRenderer(blmOfill);
        blmFieldOfficeLayer.setRenderer(blmORenderer);
        var blmOLabel = new TextSymbol().setColor(new Color([132, 0, 168]));
        var blmOFont = new esri.symbol.Font();
        blmOFont.setSize("9pt");
        blmOFont.setFamily("arial");
        blmOFont.setWeight(Font.WEIGHT_BOLD);
        blmOLabel.setFont(wildernessFont);
        blmOLabel.setHaloColor(new Color([255, 255, 255]));
        blmOLabel.setHaloSize(1);
        var blmOjson = {
            "labelExpressionInfo": {
                "value": "{ADMU_NAME}"
            },
            minScale: 2500000
        };
        var blmOLabelClass = new LabelClass(blmOjson);
        blmOLabelClass.symbol = blmOLabel;
        blmFieldOfficeLayer.setLabelingInfo([blmOLabelClass]);

        var quadLayers = new ArcGISDynamicMapServiceLayer("https://cloud.insideidaho.org/arcgis/rest/services/location/location/MapServer", {
            id: "Quad_Map_Boundaries",
            visible: (4 & params.admin) !== 0
        });

        // REFERENCE LAYERS GROUP //

        let surfaceMgmtLayer = new ArcGISTiledMapServiceLayer("https://tiles.arcgis.com/tiles/FjJI5xHF2dUPVrgK/arcgis/rest/services/BLM_Surface_Management/MapServer", {
            id: "State_&_Federal_Land_Management",
            opacity: 0.7,
            visible: (512 & params.reference) !== 0
        });

        let accessYes = new FeatureLayer("https://gis.idfg.idaho.gov/server/rest/services/Access/MapServer/1", {
            id: "Access_Yes!_ Properties",
            visible: (256 & params.reference) !== 0
        });
        accessYes.setDefinitionExpression("IFWIS_Wildlife.dbo.VU_YES_Active.BidID IS NOT NULL");

        let wmaLayer = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/WildlifeManagementAreas/FeatureServer/0", {
            id: "WMAs",
            visible: (32 & params.reference) !== 0
        });

        let tractsLayer = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/Access_Agreements_with_Idaho_Fish_and_Game/FeatureServer/0", {
            id: "Large_Tracts_Access",
            outFields: ["AgreementWith", "Partnership", "Accesss", "last_edited_date", "IDFGMoreInfo"],
            visible: (64 & params.reference) !== 0,
            infoTemplate: largeTractsPopupTemplate
        });

        let endowmentLayer = new FeatureLayer("https://gis1.idl.idaho.gov/arcgis/rest/services/State_Lands_with_Identified_Public_Access/FeatureServer/0", {
            id: "Endowment_Lands_Access",
            visible: (128 & params.reference) !== 0
        });

        let landCoverLayer = new ArcGISImageServiceLayer("https://utility.arcgis.com/usrsvcs/servers/9a9d92e2b6b749e0be6e47461a50c822/rest/services/USA_NLCD_2011/ImageServer", {
            id: "Land_Cover",
            opacity: 0.4,
            visible: false
        });

        let mvumLayers = new ArcGISDynamicMapServiceLayer("https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer", {
            id: "USFS_MVUM_Roads",
            visible: (16 & params.reference) !== 0
        });
        mvumLayers.setVisibleLayers([0, 1, 2]);
        var mvumLayersDefinitions = [];
        let exp = "FORESTNAME in ('Idaho Panhandle National Forests','Kootenai National Forest','Nez Perce-Clearwater National Forest','Bitterroot National Forest','Payette National Forest','Salmon-Challis National Forest','Boise National Forest','Sawtooth National Forest','Caribou-Targhee National Forest','Wallowa-Whitman National Forest')";
        mvumLayersDefinitions[1] = exp;
        mvumLayersDefinitions[2] = exp;

        let trailLayers = new ArcGISDynamicMapServiceLayer("https://gis2.idaho.gov/arcgis/rest/services/DPR/Idaho_Trails_Map/MapServer", {
            id: "Roads_&_Trails_(zoom_in_to_activate)",
            visible: (9 & params.reference) !== 0,
        });
        trailLayers.setVisibleLayers([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);


        let roadClosureLayer = new FeatureLayer("https://gis2.idaho.gov/arcgis/rest/services/DPR/Idaho_Trails_Map/MapServer/1", {
            id: "Road_and_Trail_Closures_(zoom_in_to_activate)",
            outFields: ["*"],
            visible: (4 & params.reference) !== 0,
            infoTemplate: roadClosurePopupTemplate
        });

        let campgroundLayer = new FeatureLayer("https://gis2.idaho.gov/arcgis/rest/services/ADM/Campgrounds/MapServer/0", {
            id: "Campgrounds",
            outFields: ["*"],
            visible: (2 & params.reference) !== 0,
            infoTemplate: campgroundPopupTemplate
        });

        let airstripsLayer = new FeatureLayer("https://maps3.arcgisonline.com/arcgis/rest/services/A-16/RITA-BTS_Public_Airports_in_the_USA/MapServer/2", {
            id: "FAA_Airstrips",
            outFields: ["*"],
            infoTemplate: airstripsPopupTemplate,
            maxScale: 0,
            minScale: 0,
            visible: (1 & params.reference) !== 0
        });
        airstripsLayer.setDefinitionExpression("STATE_NAME IN ('IDAHO')");

        // FIRE-RELATED AND CLOSURE LAYERS GROUP //
        let EmergencyWildfireClosuresLyr = new FeatureLayer("https://services.arcgis.com/FjJI5xHF2dUPVrgK/arcgis/rest/services/Emergency_Wildfire_Closures/FeatureServer/0", {
            id: "Fire_Emergency_Closure_Areas",
            outFields: ['*'],
            visible: (1 & params.wildlife) !== 0,
            infoTemplate: significantClosuresPopupTemplate
        });

        let CurrentYearFirePerimeters = new FeatureLayer("https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/2", {
            id: "Current_Year_Fire_Perimeters",
            outFields: ['*'],
            visible: (2 & params.wildlife) !== 0
        });

        let InactiveFirePermimetersLyrs = new FeatureLayer("https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/4", {
            id: "Inactive_Fire_Perimeters",
            outFields: ['gisacres', 'active', 'incidentname', 'inciwebid'],
            visible: (8 & params.wildlife) !== 0,
            infoTemplate: perimeterPopupTemplate
        });
        let HistoricFirePerimeterLyr = new FeatureLayer("https://rmgsc.cr.usgs.gov/ArcGIS/rest/services/geomac_dyn/MapServer/27", {
            id: "Past_Fire_Perimeters",
            opacity: "0.7",
            visible: (16 & params.wildlife) !== 0
        });
        HistoricFirePerimeterLyr.setDefinitionExpression("year_ in ('2013','2014','2015','2016', '2017', '2018')");

        let ModisFireLyr = new FeatureLayer("https://wildfire.cr.usgs.gov/arcgis/rest/services/geomac_fires/MapServer/3", {
            id: "MODIS_Fire_Detection",
            visible: (4 & params.wildlife) !== 0
        });

        var InciWebActiveFireLyr = new CSVLayer("https://idfg.idaho.gov/ifwis/maps/realtime/fire/csv/inciweb.csv", {
            // var InciWebActiveFireLyr = new CSVLayer("/inciweb.csv", {
            id: "Active_Fire_Report",
            visible: false,
            infoTemplate: fireReportPopupTemplate
        });

        let incidentRenderer = new UniqueValueRenderer(new PictureMarkerSymbol("src/images/marker_other.png", 21, 25), 'type');
        incidentRenderer.addValue("Wildfire", new PictureMarkerSymbol("src/images/marker_fire.png", 21, 25));
        incidentRenderer.addValue("Burned Area Emergency Response", new PictureMarkerSymbol("src/images/marker_baer.png", 21, 25));
        incidentRenderer.addValue("Prescribed Fire", new PictureMarkerSymbol("src/images/marker_rx.png", 21, 25));
        InciWebActiveFireLyr.setRenderer(incidentRenderer);

        map.addLayers([landCoverLayer, surfaceMgmtLayer, wildernessLayer, gmuMotorizedHuntRules, CurrentYearFirePerimeters,
            ModisFireLyr, HistoricFirePerimeterLyr, InactiveFirePermimetersLyrs, EmergencyWildfireClosuresLyr, InciWebActiveFireLyr,
            usfsAdminLayer, rangerDistrictLayer, blmFieldOfficeLayer, quadLayers, countiesLayer, wmaLayer, tractsLayer, endowmentLayer,
            regionsLayer, gameMgmtUnits, huntingRestrictionsBigGame, huntingRestrictionsGameBird, huntingRestrictionsUplandGame,
            huntingRestrictionsWaterfowl, huntingRestrictionsFurbearer, controlledHuntAntelope, controlledHuntBear, controlledHuntBighorn,
            controlledHuntDeer, controlledHuntElk, controlledHuntGoat, controlledHuntMoose, controlledHuntTurkey, wolfMgmtZones,
            elkMgmtZones, wildlifeTracts, accessYes, trailLayers, mvumLayers, roadClosureLayer, campgroundLayer, airstripsLayer
        ]);

        //Add a table of contents using the layerList widget for each layer group. Layers can be toggled on/off. Symbology is displayed. Slider supports user-defined layer transparency.
        var huntLayers = [{
            layer: huntingRestrictionsFurbearer,
            title: "Areas with Hunting Restrictions - Furbearer"
        }, {
            layer: huntingRestrictionsWaterfowl,
            title: "Areas with Hunting Restrictions - Waterfowl"
        }, {
            layer: huntingRestrictionsUplandGame,
            title: "Areas with Hunting Restrictions - Upland Game"
        }, {
            layer: huntingRestrictionsGameBird,
            title: "Areas with Hunting Restrictions - Upland Game Bird & Turkey"
        }, {
            layer: huntingRestrictionsBigGame,
            title: "Areas with Hunting Restrictions - Big Game"
        }, {
            layer: controlledHuntTurkey,
            title: "Controlled Hunt Areas - Turkey"
        }, {
            layer: controlledHuntMoose,
            title: "Controlled Hunt Areas - Moose"
        }, {
            layer: controlledHuntGoat,
            title: "Controlled Hunt Areas - Mountain Goat"
        }, {
            layer: controlledHuntElk,
            title: "Controlled Hunt Areas - Elk"
        }, {
            layer: controlledHuntDeer,
            title: "Controlled Hunt Areas - Deer"
        }, {
            layer: controlledHuntBighorn,
            title: "Controlled Hunt Areas - Bighorn Sheep"
        }, {
            layer: controlledHuntBear,
            title: "Controlled Hunt Areas - Black Bear"
        }, {
            layer: controlledHuntAntelope,
            title: "Controlled Hunt Areas - Antelope"
        }, {
            layer: elkMgmtZones,
            title: "Elk Management Zones"
        }, {
            layer: gmuMotorizedHuntRules,
            title: "GMUs with Motorized Hunting Rules"
        }, {
            layer: gameMgmtUnits,
            title: "Game Management Units"
        }];

        var huntingLayerList = new LayerList({
            map: map,
            removeUnderscores: true,
            showLegend: true,
            showOpacitySlider: true,
            showSubLayers: false,
            layers: huntLayers
        }, "tocDiv1");
        huntingLayerList.startup();

        var administrativeLayers = [{
            layer: wildernessLayer,
            title: "Wilderness Areas"
        }, {
            layer: rangerDistrictLayer,
            title: "USFS Ranger Districts"
        }, {
            layer: usfsAdminLayer,
            title: "USFS Administrative Boundaries"
        }, {
            layer: blmFieldOfficeLayer,
            title: "BLM Field Office Boundaries"
        }, {
            layer: quadLayers,
            title: "USGS Quad Map Boundaries"
        }, {
            layer: countiesLayer,
            title: "Counties"
        }, {
            layer: regionsLayer,
            title: "Fish and Game Regions"
        }];

        var administrativeLayerList = new LayerList({
            map: map,
            removeUnderscores: true,
            showLegend: true,
            showSubLayers: true,
            showOpacitySlider: true,
            layers: administrativeLayers
        }, "tocDiv2");
        administrativeLayerList.startup();


        var trailLandLayers = [{
            layer: surfaceMgmtLayer,
            title: "State & Federal Land Management"
        }, {
            layer: accessYes,
            title: "Access Yes! Properties"
        }, {
            layer: endowmentLayer,
            title: "Endowment Lands Access"
        }, {
            layer: tractsLayer,
            title: "Large Tracts Access"
        }, {
            layer: wmaLayer,
            title: "Wildlife Management Areas"
        }, {
            layer: mvumLayers,
            title: "USFS Motor Vehicle Use (zoom in to activate)"
        }, {
            layer: trailLayers,
            title: "Roads & Trails (zoom in to activate)"
        }, {
            layer: roadClosureLayer,
            title: "Emergency Road & Trail Closures (zoom in to activate)"
        }, {
            layer: campgroundLayer,
            title: "Campgrounds"
        }, {
            layer: airstripsLayer,
            title: "FAA Airports/Airstrips"
        }];

        var trailLandLayerList = new LayerList({
            map: map,
            removeUnderscores: true,
            showLegend: true,
            showOpacitySlider: true,
            showSubLayers: false,
            layers: trailLandLayers
        }, "tocDiv3");
        trailLandLayerList.startup();

        trailLandLayerList.on("load", function () {
            //Add disclaimer and layer source information.
            $("label[for=tocDiv3_checkbox_0]").after("<div class='disclaimer'>IMPORTANT: Please be sure to obtain landowner permission before entering or crossing private lands. State & federal land management data maintained by BLM (2013). <a href='//cloud.insideidaho.org/webApps/metadataViewer/default.aspx?path=%5c%5cintranet.rocket.net%5cinsideprod%5cdata%5canonymous%5cblm%5cRLTY_SMA_PUB_24K_POLY.shp.xml' target='_blank'>Learn More</a></div>");
            $("label[for=tocDiv3_checkbox_2]").after("<div class='disclaimer'>IMPORTANT: Know before you go! Please respect access rules. Access agreements are generally for wildlife recreation activities: hunting, fishing, trapping, and wildlife watching. Other uses may be restricted. <b>Access can change quickly. Observe posted signs</b>. <a href=' https://idfg.idaho.gov/access/endowment' target='_blank'>Learn More</a></div>");
            $("label[for=tocDiv3_checkbox_3]").after("<div class='disclaimer'>IMPORTANT: Know before you go! Please respect access rules. Selecting an area on the map gives more information. Access agreements are generally for wildlife recreation activities: hunting, fishing, trapping, and wildlife watching. Other uses may be restricted. <b>Access can change quickly. Observe posted signs</b>. <a href=' https://idfg.idaho.gov/access/large-tracts' target='_blank'>Learn More</a></div>");
            // $("label[for=tocDiv3_checkbox_1]").after("<div class='disclaimer'>Endowment lands data maintained by Idaho Dept. of Lands (2017). This layer shows which endowment lands designated as Yes or No Known Public Access. <a href='//www.arcgis.com/home/item.html?id=eabf22046eb64525b0ccfd64a099e6eb#overview' target='_blank'>Learn More</a></div>");
            // $("label[for=tocDiv3_checkbox_3]").after("<div class='disclaimer'>Land Cover data maintained by the Multi-Resolution Land Characteristics Consortium. <a href='//www.mrlc.gov/index.php' target='_blank'>Learn More</a></div>");
            $("label[for=tocDiv3_checkbox_5]").after("<div class='disclaimer'>Motor vehicle Use data maintained by USFS. <a href='//www.fs.fed.us/visit/maps/mvum-faq' target='_blank'>Learn More</a></div>");
            $("label[for=tocDiv3_checkbox_6]").after("<div class='disclaimer'>Public roads & trails data maintained by IDPR. <a href='//www.trails.idaho.gov/trails/' target='_blank'>Learn More</a></div>");
            $("label[for=tocDiv3_checkbox_7]").after("<div class='disclaimer'>Public road & trail closure data maintained by IDPR. <a href='//www.trails.idaho.gov/trails/' target='_blank'>Learn More</a></div>");
            $("label[for=tocDiv3_checkbox_8]").after("<div class='disclaimer'>Campground data maintained by IDPR. <a href='//parksandrecreation.idaho.gov/activities/camping' target='_blank'>Learn More</a></div>");
            $("label[for=tocDiv3_checkbox_9]").after("<div class='disclaimer'>Airport data created by the FAA. <a href='https://www.arcgis.com/home/item.html?id=2814d2774a3d43cda1bcb6671ad6fac0' target='_blank'>Learn More</a></div>");
            $("#TOCNode_significantClosures_1").before("<div class='disclaimer'>Please contact USFS national forests and BLM districts for all public road and trail closures.</div>");

            disableRoadsTrails();
            disableERoadsTrails();
            disableUsfsMotor();
            // $("label[for=significantClosure0Checkbox]").after("<div class='sigClosureNote'>Permission-seekers may contact <a href='mailto:info@wilksdevelopment.com?Subject=Idaho%20Sportsmen%20Access%20,%20Attention:%20Jordan.' target='_blank'>info@wilksdevelopment.com</a>.  <a href='http://www.idahocountyfreepress.com/news/2017/apr/05/wilks-ranch-now-largest-single-landowner-idaho-cou/' target='_blank'>Learn More</a></div>");
            // $("label[for=significantClosure1Checkbox]").after("<div class='sigClosureNote'>Closed until December 31, 2018. <a href='https://www.fs.usda.gov/detail/boise/news-events/?cid=FSEPRD555239' target='_blank'>Learn More</a></div>");
        });

        let fireClosureLayers = [{
            layer: HistoricFirePerimeterLyr,
            title: "Historic Fire Perimeters"
        }, {
            layer: InactiveFirePermimetersLyrs,
            title: "Inactive Fire Perimeters"
        }, {
            layer: ModisFireLyr,
            title: "MODIS Fire Detections"
        }, {
            layer: CurrentYearFirePerimeters,
            title: "Current Year Fire Perimeters"
        }, {
            layer: EmergencyWildfireClosuresLyr,
            title: "Fire Emergency Closure Areas"
        }, {
            layer: InciWebActiveFireLyr,
            title: "Active Fire Report"
        }];

        var fireClosureLayerList = new LayerList({
            map: map,
            removeUnderscores: true,
            showLegend: true,
            showSubLayers: true,
            showOpacitySlider: true,
            layers: fireClosureLayers
        }, "tocDiv4");
        fireClosureLayerList.startup();

        function enableRoadsTrails() {
            $("label[for=tocDiv3_checkbox_6]").css("color", "black");
            $("label[for=tocDiv3_checkbox_6]").text("Roads & Trails");
            $("#tocDiv3_checkbox_6").attr("disabled", false);
        }

        function disableRoadsTrails() {
            $("label[for=tocDiv3_checkbox_6]").css("color", "#ccc");
            $("label[for=tocDiv3_checkbox_6]").text("Roads & Trails (zoom in to activate)");
            $("#tocDiv3_checkbox_6").attr("disabled", true);
        }

        function enableERoadsTrails() {
            $("label[for=tocDiv3_checkbox_7]").css("color", "black");
            $("label[for=tocDiv3_checkbox_7]").text("Emergency Road & Trail Closures");
            $("#tocDiv3_checkbox_7").attr("disabled", false);
        }

        function disableERoadsTrails() {
            $("label[for=tocDiv3_checkbox_7]").css("color", "#ccc");
            $("label[for=tocDiv3_checkbox_7]").text("Emergency Road & Trail Closures (zoom in to activate)");
            $("#tocDiv3_checkbox_7").attr("disabled", true);
        }

        function enableUsfsMotor() {
            $("label[for=tocDiv3_checkbox_5]").css("color", "black");
            $("label[for=tocDiv3_checkbox_5]").text("USFS Motor Vehicle Use");
            $("#tocDiv3_checkbox_5").attr("disabled", false);
        }

        function disableUsfsMotor() {
            $("label[for=tocDiv3_checkbox_5]").css("color", "#ccc");
            $("label[for=tocDiv3_checkbox_5]").text("USFS Motor Vehicle Use (zoom in to activate)");
            $("#tocDiv3_checkbox_5").attr("disabled", true);
        }

        //Change the Roads & Trails (and closures) layer label depending on map scale.
        map.on("extent-change", function () {
            let mapScale = map.getScale();
            // let mapLevel = map.getLevel();
            //console.log("Map Level: " + mapLevel);
            //console.log("Map Scale: " + mapScale);

            // Edit selectors at bottom of file to fix these
            if (mapScale < 4622324) {
                enableRoadsTrails();
                enableERoadsTrails();
            } else {
                disableRoadsTrails();
                disableERoadsTrails();
            }
            if (mapScale < 288895) {
                enableUsfsMotor();
            } else {
                disableUsfsMotor();
            }
        });


        //uncheck fire Layer Checkboxes
        $("#EmergencyWildfireClosuresLyrCheckbox").prop("checked", false);
        $("#fireLayer1Checkbox").prop("checked", false);
        $("#InactiveFirePermimetersLyrsCheckbox").prop("checked", false);
        $("#HistoricFirePerimeterLyrCheckbox").prop("checked", false);
        $("#ModisFireLyrCheckbox").prop("checked", false);
        $("#InciWebActiveFireLyrCheckbox").prop("checked", false);
        $("#significantClosure0Checkbox").prop("checked", false);
        $("#significantClosure1Checkbox").prop("checked", false);

        // Code automatically expands layer options after clicking layer checkbox
        // setTimeout allows for layer lists to initialize before adding the event listener.
        setTimeout(() => {
            let esriLayers = Array.from(document.getElementsByClassName("esriLayer"));
            esriLayers.forEach(l => {
                let c = l.childNodes[0].firstChild.children[0];
                let s = c.nextElementSibling;
                c.addEventListener("click", () => {
                    if (c.checked) {
                        l.className += " esriListExpand";
                        s.className = "esriToggleButton esri-icon-down";
                    }
                });
            });
        }, 2000);

        //toggle EmergencyWildfireClosuresLyr on/off when checkbox is toggled on/off
        $("#EmergencyWildfireClosuresLyrCheckbox").change(function () {
            if ($(this).prop("checked")) {
                EmergencyWildfireClosuresLyr.show();
            } else {
                EmergencyWildfireClosuresLyr.hide();
            }
        });
        //toggle fireLayer1 on/off when checkbox is toggled on/off
        $("#fireLayer1Checkbox").change(function () {
            if ($(this).prop("checked")) {
                InciWebActiveFireLyr.show();
            } else {
                InciWebActiveFireLyr.hide();
            }
        });
        //toggle InactiveFirePermimetersLyrs on/off when checkbox is toggled on/off
        $("#InactiveFirePermimetersLyrsCheckbox").change(function () {
            if ($(this).prop("checked")) {
                InactiveFirePermimetersLyrs.show();
            } else {
                InactiveFirePermimetersLyrs.hide();
            }
        });
        //toggle HistoricFirePerimeterLyr on/off when checkbox is toggled on/off
        $("#HistoricFirePerimeterLyrCheckbox").change(function () {
            if ($(this).prop("checked")) {
                HistoricFirePerimeterLyr.show();
            } else {
                HistoricFirePerimeterLyr.hide();
            }
        });
        //toggle ModisFireLyr on/off when checkbox is toggled on/off
        $("#ModisFireLyrCheckbox").change(function () {
            if ($(this).prop("checked")) {
                ModisFireLyr.show();
            } else {
                ModisFireLyr.hide();
            }
        });
        //toggle InciWebActiveFireLyr on/off when checkbox is toggled on/off
        $("#InciWebActiveFireLyrCheckbox").change(function () {
            if ($(this).prop("checked")) {
                InciWebActiveFireLyr.show();
            } else {
                InciWebActiveFireLyr.hide();
            }
        });
        //toggle wilksClosure on/off when checkbox is toggled on/off
        // $("#significantClosure0Checkbox").change(function () {
        // 	if ($(this).prop("checked")) {
        // 		wilksClosure.show();
        // 	} else {
        // 		wilksClosure.hide();
        // 	}
        // });
        //toggle pioneerSalvageClosure on/off when checkbox is toggled on/off
        $("#significantClosure1Checkbox").change(function () {
            if ($(this).prop("checked")) {
                pioneerSalvageClosure.show();
            } else {
                pioneerSalvageClosure.hide();
            }
        });


        //Enable mobile scrolling by calling $('.selectpicker').selectpicker('mobile'). The method for detecting the browser is left up to the user. This enables the device's native menu for select menus.
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
            $('.selectpicker').selectpicker('mobile');
        }

        //function to get variable values from the URL to query for hunt planner hunt area and/or zoom to a specific center coordinate and zoom level if using a "shared" map view link.
        function getVariableByName(name) {
            let searchString = window.location.search.substring(1);
            let vars = searchString.split("&");
            for (let i = 0; i < vars.length; i++) {
                var variableName = vars[i].split('=');
                if (variableName[0] == name) {
                    return variableName[1]
                }
            }
        }

        //get the variables of areaID (hunt area, IOG area, or Access Yes! area), layerID (which layer to apply the ID query to), and label (what will appear in the legend).
        let areaID, layerID, label, urlZoom, urlX, urlY;
        window.onload = function () {
            areaID = getVariableByName('val');
            layerID = getVariableByName('lyr');
            label = getVariableByName('lbl');
            urlZoom = getVariableByName('zoom');
            urlX = getVariableByName('X');
            urlY = getVariableByName('Y');

            if (typeof label != 'undefined') {
                let res = decodeURIComponent(label);
                label = res.split('+').join(' ');
            } else {
                label = "";
            }

            if (typeof areaID != 'undefined') {
                doQuery(areaID, layerID, label);
            }
            $("#queryLabel1").text(label);
            $("#queryLabel1Div").show();

            if (typeof urlZoom != 'undefined') {
                var point = new Point(urlX, urlY, new esri.SpatialReference({
                    wkid: 4326
                }));
                map.setLevel(urlZoom);
                map.centerAt(point);
            }
        };

        //toggle query layer on/off when checkbox is toggled on/off
        $("#queryCheckbox").change(function () {
            if ($(this).prop("checked")) {
                queryLayer.show();
                queryLabelLayer.show();
            } else {
                queryLayer.hide();
                queryLabelLayer.hide();
            }
        });

        let gmuID, elkID, chuntID, waterfowlID, gameDistributionID, newHighlight, newHighlight1, newHighlight2,
            newHighlight3, newHighlight3Hatched, newHighlight4, newHighlight5;

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
                    gmuTypeValue += $(this).val() + ",";
                });
                //Remove trailing comma
                gmuID = gmuTypeValue.substring(0, gmuTypeValue.length - 1);
                //var layerID = "3";
                var label0 = $("#gmu option:selected").map(function () {
                    return $(this).text();
                }).get();
                var label = label0.join(", ");

                if (typeof label == 'undefined') {
                    label = label;
                } else {
                    label = "Selected GMU";
                }

                if (typeof gmuID != 'undefined') {
                    doQuery1(gmuID, label);
                }
                $("#queryLabel1").text(label);
                $("#queryLabel1Div").show();

                //Create a KML of the user-selected GMUs, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
                var gmuKMLlink = "https://gis.idfg.idaho.gov/server/rest/services/Hunting/MapServer/3/query?where=ID in (" + gmuID + ")&outfields=NAME&f=kmz";
                $("#gmuKML").attr("href", gmuKMLlink);
                $("#gmuKML").show();
            }

            if ($("#elkzone").val()) {
                var elkzoneTypeValue = "";
                $("#elkzone option:selected").each(function () {
                    elkzoneTypeValue += $(this).val() + ",";
                });
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
                    label = "Selected Elk Zone";
                }
                if (typeof elkID != 'undefined') {
                    doQuery2(elkID, label);
                }
                $("#queryLabel2").text(label);
                $("#queryLabel2Div").show();

                //Create a KML of the user-selected Elk Zones, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
                var elkzoneKMLlink = "https://gis.idfg.idaho.gov/server/rest/services/Hunting/MapServer/1/query?where=ID in (" + elkID + ")&outfields=NAME&returnGeometry=true&outSR=4326&f=kmz";
                $("#elkzoneKML").attr("href", elkzoneKMLlink);
                $("#elkzoneKML").show();
            }

            if ($("#chunt").val()) {
                var chuntTypeValue = "";
                $("#chunt option:selected").each(function () {
                    chuntTypeValue += $(this).val() + ",";
                });
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
                $("#kmlNav2").show();
                $("#kmlNav1").effect("highlight", {
                        color: 'yellow'
                    },
                    3000
                );
                $("#kmlNav2").effect("highlight", {
                        color: 'yellow'
                    },
                    3000
                );
                //Create a KML of the user-selected controlled hunts, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
                var chuntKMLlink = "https://gis.idfg.idaho.gov/server/rest/services/Hunting/MapServer/0/query?where=AreaID in (" + chuntID + ")&outfields=NAME&f=kmz";
                $("#chuntKML").attr("href", chuntKMLlink);
                $("#chuntKML").show();
            }

            if ($("#waterfowl").val()) {
                var waterfowlTypeValue = "";
                $("#waterfowl option:selected").each(function () {
                    waterfowlTypeValue += $(this).val() + ",";
                });
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
                    label = "Selected Hunt Areas";
                }
                if (typeof waterfowlID != 'undefined') {
                    doQuery4(waterfowlID, label);
                }
                $("#queryLabel4").text(label);
                $("#queryLabel4Div").show();

                //Create a KML of the user-selected waterfowl hunt areas, show the 'Download Highlighted Areas as KML' tool, and highlight it for a short period to get the users attention.
                var waterfowlKMLlink = "https://gis.idfg.idaho.gov/server/rest/services/Hunting/MapServer/0/query?where=ID in (" + waterfowlID + ")&outfields=NAME&f=kmz";
                $("#waterfowlKML").attr("href", waterfowlKMLlink);
                $("#waterfowlKML").show();
            }

            if ($("#gameDistribution").val()) {
                var gameDistributionTypeValue = "";
                $("#gameDistribution option:selected").each(function () {
                    gameDistributionTypeValue += $(this).val() + ",";
                });
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
                var gameDistributionKMLlink = "https://gis.idfg.idaho.gov/server/rest/services/Species/Distribution/MapServer/3/query?where=TaxonID in (" + gameDistributionID + ")&outfields=StateCommonName&returnGeometry=true&outSR=4326&f=kmz";
                $("#gameDistributionKML").attr("href", gameDistributionKMLlink);
                $("#gameDistributionKML").show();
            }

            if ($("#gmu").val() != null || $("#elkzone").val() != null || $("#chunt").val() != null || $("#waterfowl").val() != null ||
                $("#gameDistribution").val() != null) {
                $("#kmlNav1").show();
                $("#kmlNav2").show();
            }

            $('#btnClearHighlighted').show();

        });

        $("#btnClearHighlighted").click(function () {
            $('#btnClearHighlighted').hide();
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
        });

        let newHighlightHatched = new SimpleFillSymbol(SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([154, 32, 219]), 3),
            new Color([154, 32, 219])
        );

        let QueryLayers = [
            "https://gis.idfg.idaho.gov/server/rest/services/Hunting/MapServer/0",                                   // Hunt Areas
            "https://gis.idfg.idaho.gov/server/rest/services/Outfitters/MapServer/0",                                // OGLB Areas
            "https://gis.idfg.idaho.gov/server/rest/services/Access/MapServer/1",                                    // Access Yes
            "https://gis.idfg.idaho.gov/server/rest/services/Hunting/MapServer/3",                                   // GMUs
            "https://gis.idfg.idaho.gov/server/rest/services/Hunting/MapServer/1",                                   // Elk Zones
            "https://gis.idfg.idaho.gov/server/rest/services/Hunting/MapServer/4",                                   // Controlled Hunts
            "https://services.arcgis.com/FjJI5xHF2dUPVrgK/ArcGIS/rest/services/WaterfowlHuntAreas/FeatureServer/0",  // Waterfowl Hunt Areas:huntID
            "https://gis.idfg.idaho.gov/server/rest/services/Species/Distribution/MapServer/3"                       // Distribution:TaxonID
        ];

        function doQuery(areaID, layerID, label) {
            // Update field to query by for some layers.
            let dID = [
                "ID",
                "ID",
                "ID",
                "ID",
                "AreaID",
                "ID",
                "huntID",
                "TaxonID"
            ];

            //initialize query tasks
            let newQueryTask = new QueryTask(QueryLayers[layerID]);

            //initialize query
            let newQuery = new Query();
            newQuery.returnGeometry = true;
            newQuery.outFields = ["*"];
            newHighlight = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([154, 32, 219]), 3),
                new Color([154, 32, 219, 0.1])
            );
            newQuery.where = dID[layerID] + " IN (" + areaID + ")";
            newQueryTask.execute(newQuery, showResults);
        }

        function doQuery1(gmuID, label) {
            //initialize query tasks
            let newQueryTask1 = new QueryTask(QueryLayers[3]);

            //initialize query
            let newQuery1 = new Query();
            newQuery1.returnGeometry = true;
            newQuery1.outFields = ["ID", "NAME"];
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
            let newQueryTask2 = new QueryTask(QueryLayers[4]);

            //initialize query
            let newQuery2 = new Query();
            newQuery2.returnGeometry = true;
            newQuery2.outFields = ["ID", "NAME"];
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
            let newQueryTask3 = new QueryTask(QueryLayers[5]);

            //initialize query
            let newQuery3 = new Query();
            newQuery3.returnGeometry = true;
            newQuery3.outFields = ["FLAG", "AreaID", "BigGame", "HuntArea"];
            newHighlight3 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([18, 237, 18]), 3),
                new Color([18, 237, 18, 0.1])
            );
            newHighlight3Hatched = new SimpleFillSymbol(SimpleFillSymbol.STYLE_BACKWARD_DIAGONAL,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([18, 237, 18]), 3),
                new Color([18, 237, 18, 0.3])
            );
            newQuery3.where = "AreaID IN (" + chuntID + ")";
            newQueryTask3.execute(newQuery3, showResults3);
        }

        function doQuery4(waterfowlID, label) {
            //initialize query tasks
            let newQueryTask4 = new QueryTask(QueryLayers[6]);

            //initialize query
            let newQuery4 = new Query();
            newQuery4.returnGeometry = true;
            newQuery4.outFields = ["huntID", "Area_Name"];
            newHighlight4 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 157, 0]), 3),
                new Color([255, 157, 0, 0.1])
            );

            newQuery4.where = "huntID IN (" + waterfowlID + ")";
            newQueryTask4.execute(newQuery4, showResults4);
        }

        function doQuery5(gameDistributionID, label) {
            //initialize query tasks
            let newQueryTask5 = new QueryTask(QueryLayers[7]);

            //initialize query
            let newQuery5 = new Query();
            newQuery5.returnGeometry = true;
            newQuery5.outFields = ["TaxonID", "StateSciName", "StateCommonName"];
            newHighlight5 = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 0, 225]), 3),
                new Color([255, 0, 225, 0.1])
            );

            newQuery5.where = "TaxonID IN (" + gameDistributionID + ")";
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
                if (newGraphic.attributes.FLAG == 1) {
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
                textSymbol.setColor(new esri.Color([0, 0, 0]));
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
                let queryMapLabel1 = "UNIT " + newGraphic1.attributes.NAME;
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
            for (var i = 0, il = newFeatures3.length; i < il; i++) {
                //Get the current feature from the featureSet.
                //Feature is a graphic
                var geometry = featureSet.geometry;
                var newGraphic3 = newFeatures3[i];
                var polyExtent = newGraphic3.geometry.getExtent();
                var polyCenter = polyExtent.getCenter();
                if (newGraphic3.attributes.FLAG == 1) {
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
                textSymbol.setColor(new esri.Color([0, 0, 0]));
                textSymbol.setFont(font);
                textSymbol.setHorizontalAlignment("center");
                textSymbol.setVerticalAlignment("middle");
                textSymbol.setOffset(17, 0);
                //Add label at the selected area center.
                var pt = new Point(polyCenter, map.spatialReference);
                var queryMapLabel3Graphic = new Graphic(pt, textSymbol);
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
            for (var i = 0, il = newFeatures4.length; i < il; i++) {
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
                textSymbol.setColor(new esri.Color([232, 146, 18]));
                textSymbol.setFont(font);
                textSymbol.setHorizontalAlignment("center");
                textSymbol.setVerticalAlignment("middle");
                textSymbol.setOffset(17, 0);
                //Add label at the selected area center.
                var pt = new Point(polyCenter, map.spatialReference);
                var queryMapLabel4Graphic = new Graphic(pt, textSymbol);
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
            for (var i = 0, il = newFeatures5.length; i < il; i++) {
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

        function zoomToState() {
            var stateExtent = new esri.geometry.Extent(-119.925, 40.439, -109.137, 50.199);
            map.setExtent(stateExtent);
            $("#loading").hide();
        }

        //Allow users to add GPX data to the map.  Other formats may be added later, such as KML.
        var layer, name;
        var layers = [];
        var portalUrl = 'https://www.arcgis.com';

        on(dom.byId("uploadForm"), "change", function (evt) {
            var fileName = evt.target.value.toLowerCase();
            if (sniff("ie")) { //filename is full path in IE so extract the file name
                var arr = fileName.split("\\");
                fileName = arr[arr.length - 1];
            }
            if (fileName.indexOf(".gpx") !== -1) { //is file a gpx - if not notify user
                generateFeatureCollection(fileName);
                $('#btnClearUpload').show();
            } else {
                $("#upload-status").html('<p style="color:red">INVALID FILE TYPE. Choose a .gpx file</p>');
            }
        });

        function generateFeatureCollection(fileName) {
            name = fileName.split(".");
            //Chrome and IE add c:\fakepath to the value - we need to remove it
            //See this link for more info: http://davidwalsh.name/fakepath
            name = name[0].replace("c:\\fakepath\\", "");

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
            var extent = scaleUtils.getExtentForScale(map, 40000);
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
                    outfields: ["*"],
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
                            new Color([0, 0, 0]), 1),
                        new Color([255, 0, 0]));
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
            if (layer.geometryType == 'esriGeometryPoint') {
                $("#uploadLabel1Div").show();
            }
            if (layer.geometryType == 'esriGeometryPolyline') {
                $("#uploadLabel2Div").show();
            }
        }

        //Clear the gpx upload form file name.
        function clearFileInputField(tagId) {
            dojo.byId(tagId).innerHTML = dojo.byId(tagId).innerHTML;
        }

        function layerVisibility(layer) {
            (layer.visible) ? layer.hide() : layer.show();
        }

        //Clear the uploaded GPX files from the map.
        $("#btnClearUpload").click(function () {
            $("#btnClearUpload").hide();
            jQuery.each(layers, function (index, value) {
                layerVisibility(layers[index]);
            });

            $("#uploadLabelDiv").hide();
            $("#uploadLabel1Div").hide();
            $("#uploadLabel2Div").hide();
            $("#uploadCheckbox").prop('checked', false);
        });

        //toggle GPX layers on/off when checkbox is toggled on/off
        $("#uploadCheckbox").change(function () {
            jQuery.each(layers, function (index, value) {
                layerVisibility(layers[index]);
            });
        });

        //Create a search box.
        var search = new Search({
            map: map,
            enableInfoWindow: false
        }, "geosearch");

        $('.searchInput').on('input', () => {
            let content = $('.searchInput').val();
            if (content.length > 0) {
                $('#btnGeosearch').prop('disabled', false);
            } else {
                $('#btnGeosearch').prop('disabled', true);
            }
        });

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
        $("#btnClearPlace").click(function () {
            search.clear();
            $('#btnClearPlace').hide();
        });

        search.on('search-results', () => {
            $('#btnClearPlace').show();
        });

        //the user inputs a long, lat coordinate and a flag icon is added to that location and the location is centered and zoomed to on the map.
        $("#btnCoordZoom").click(function () {
            zoomToCoordinate();
        });

        //zoom to the coordinate and add a graphic
        function zoomToCoordinate() {
            var zoomToGraphic;
            var longitude = $("#longitudeInput").val();
            var latitude = $("#latitudeInput").val();
            var symbol = new PictureMarkerSymbol('http://js.arcgis.com/3.19/esri/dijit/Search/images/search-pointer.png', 35, 35);
            var pt = new Point(longitude, latitude);
            var labelSymbol = new TextSymbol(longitude + ", " + latitude);
            labelSymbol.setColor(new Color("black"));
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
        $("#btnClear").click(function () {
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
            lineSymbol: sls,
            pointSymbol: pms
        }, dom.byId("measurementDiv"));
        measurement.startup();


        $("#clearMeasureResults").click(function () {
            measurement.clearResult();
            $("#measureResultsDiv").hide();
            $('#clearMeasureResults').hide();
        });

        //Clear the measurement results div when starting a new measurement.
        measurement.on("measure-start", function () {
            $("#Results").empty();
        });

        //Add tool instructions in measure window.
        measurement.on("tool-change", function () {
            let measureTool = measurement.getTool();
            measureTool = measureTool.toolName;
            if (measureTool === "area") {
                $("#MeasureInstructions").html("<h3 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to polygon. Double-click/tap to finish.</h3>");
            } else if (measureTool === "distance") {
                $("#MeasureInstructions").html("<h3 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to the line. Double-click/tap to finish.</h3>");
            } else if (measureTool === "location") {
                $("#MeasureInstructions").html("<h3 class='red'>Click or tap a location on the map to add a point.</h3>");
            }
        });

        //Disable popups when the measurement window is uncollapsed.
        $('#measureCollapse').on('show.bs.collapse', function () {
            map.setInfoWindowOnClick(false);
        });

        //Show the measurement results in the bottom right-hand corner.
        measurement.on("measure-end", function () {
            $('#clearMeasureResults').show();
            let measureTool = measurement.getTool();
            measureTool = measureTool.toolName;
            //measurement.setTool(measurement.activeTool, false);  //THIS WILL SHUT THE ACTIVE TOOL OFF.
            let resultValue = measurement.resultValue.domNode.innerHTML;
            let c = measurement.markerLatitude;
            c = c.innerHTML;
            let d = measurement.markerLongitude;
            d = d.innerHTML;
            let locationXY = c + ", " + d;
            let copyResultValue = document.getElementById('Results');
            if (measureTool === "location") {
                copyResultValue.innerHTML = locationXY;
            } else {
                copyResultValue.innerHTML = resultValue;
            }
            $("#measureResultsDiv").effect("highlight", {
                color: 'yellow'
            }, 3000);
        });

        //When the measure tool is collapes, deactive all measure tools, clear the results, and enable popups.
        $('#measureCollapse').on('hide.bs.collapse', function () {
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
        registry.forEach(function (d) {
            // d is a reference to a dijit
            // could be a layout container or a button
            if (d.declaredClass === "dijit.form.Button") {
                d.on("click", activateTool);
            }
        });

        $('#userTextBox').on('input', () => {
            let content = $('#userTextBox').val();
            if (content.length > 0) {
                $('.txt-btn').show();
            } else {

                $('.txt-btn').hide();
            }
        });

        function activateTool() {
            $('#userTextBox').prop('disabled', true);
            $('#DrawInstructions').show();
            var tool;
            /* if (this.label === "Add Text") {
            toolbar.activate(Draw.POINT);
            } else { */
            tool = this.name.toUpperCase().replace(/ /g, "_");
            toolbar.activate(Draw[tool]);
            //}
            if (tool === "FREEHAND_POLYGON") {
                $("#DrawInstructions").html("<h3 class='red'>Press down to start and let go to finish</h3>");
            } else if (tool === "POLYGON") {
                $("#DrawInstructions").html("<h3 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to polygon. Double-click/tap to finish.</h3>");
            } else if (tool === "POINT") {
                $("#DrawInstructions").html("<h3 class='red'>Click or tap a location on the map to add a point.</h3>");
            } else if (tool === "MULTI_POINT") {
                $("#DrawInstructions").html("<h3 class='red'>Click/tap a location on the map to start adding points. Double-click/tap to finish.</h3>");
            } else if (tool === "POLYLINE") {
                $("#DrawInstructions").html("<h3 class='red'>Click/tap to start drawing. Then continue to click/tap to add vertices to the line. Double-click/tap to finish.</h3>");
            } else if (tool === "FREEHAND_POLYLINE" || tool === "FREEHAND POLYGON") {
                $("#DrawInstructions").html("<h3 class='red'>Press down to start and let go to finish.</h3>");
            } else if (tool === "CIRCLE") {
                $("#DrawInstructions").html("<h3 class='red'>Click/tap to add a circle or press down to start and let go to finish.</h3>");
            } else if (tool === "TEXT") {
                $("#DrawInstructions").html("<h3 class='red'>Click/tap map to add text.</h3>");
            }
        }

        function createToolbar(themap) {
            toolbar = new Draw(map);
            toolbar.on("draw-end", (res) => {
                addToMap(res);

                $('#userTextBox').prop('disabled', false);
                $('#DrawInstructions').hide();
                $('#btnClearGraphic').show();
            });
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
                            new Color([255, 114, 0]), 0.5),
                        new Color([255, 114, 0]));
                    break;
                case "polyline":
                    symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([255, 114, 0]), 2);
                    break;
                default:
                    symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                        new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                            new Color([255, 114, 0]), 2),
                        new Color([255, 114, 0, 0.25]));
                    break;
            }
            var drawGraphic = new Graphic(evt.geometry, symbol);
            drawToolbarLayer.add(drawGraphic);
        }

        //fire the text graphic in a separate graphics layer than the other draw symbols otherwise it will show as just a point when using the PrintTask GP Tool.
        $("#dijit_form_Button_6_label").on("click", (res) => {
            drawPoint(res);
        });

        //active the draw.POINT tool
        var pointTool;

        function drawPoint() {
            //change the tooltip text for the Draw.POINT tool.
            esri.bundle.toolbars.draw.addPoint = "Click to add text to the map.";
            pointTool = new Draw(map);
            pointTool.activate(Draw.POINT);
            pointTool.on("draw-end", (res) => {
                addText(res);
                $('#userTextBox').prop('disabled', false);
                $('#DrawInstructions').hide();
                $('#btnClearText').show();
            });
        }

        //add text to the point
        function addText(evt) {
            pointTool.deactivate();
            var userText = $("#userTextBox").val();
            var textSymbol = new TextSymbol(userText);
            textSymbol.setColor(new esri.Color("black"));
            var font = new esri.symbol.Font();
            font.setSize("14pt");
            font.setFamily("Helvetica");
            font.setWeight(Font.WEIGHT_BOLD);
            textSymbol.setFont(font);
            var textGraphic = new Graphic(evt.geometry, textSymbol);
            drawTextLayer.add(textGraphic);
        }

        //clear all shape graphics
        $("#btnClearGraphic").click(function () {
            drawToolbarLayer.clear();
            $('#btnClearGraphic').hide();
        });
        //clear all text graphics
        $("#btnClearText").click(function () {
            drawTextLayer.clear();
            $("#btnClearText").hide();
        });

        //Disable popups when the draw window is uncollapsed.
        $('#drawCollapse').on('show.bs.collapse', function () {
            map.setInfoWindowOnClick(false);
        });
        //Enable popups when the draw window is uncollapsed.
        $('#drawCollapse').on('hide.bs.collapse', function () {
            map.setInfoWindowOnClick(true);
            $("#DrawInstructions").html("");
        });

        //Create PDF using PrintTask
        $("#btnPDF").click(function () {
            $("#div_for_pdf").hide();
            $("#printStatus").text("Creating Map...");
            submitPrint();
            $('#btnPDF').hide();
        });

        function submitPrint() {
            var printParams = new PrintParameters();
            printParams.map = map;
            // var status = dojo.byId("printStatus");
            $('#printStatus').show();
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
                dpi: 96,
                width: 420,
                height: 650,
            };
            printParams.template = template;

            //Generic Export Web Map Task//
            var printServiceUrl = 'https://gis.idfg.idaho.gov/server/rest/services/Geoprocessing/ExportWebMap2/GPServer/Export%20Web%20Map';
            //Custom IDFG Export Web Map Task//
            var printTask = new esri.tasks.PrintTask(printServiceUrl);

            var deferred = printTask.execute(printParams);
            deferred.addCallback(function (response) {
                let url = response.url;
                // status.innerHTML = "";

                //open the map PDF or image in a new browser window.;
                if (typeof (PDFwindow) == 'undefined') {
                    $("#div_for_pdf").html("<a href='" + url + "'>GET MAP</a>");
                    $("#div_for_pdf a").attr('target', '_blank');
                    $("#div_for_pdf").click(function () {
                        $("#div_for_pdf").hide();
                    });
                } else {
                    window.open(new_url_for_map, '_blank');
                }
                $("#div_for_pdf").show();
                $('#btnPDF').show();
                $("#loadingPrint").hide();
                $("#printStatus").hide();
            });

            deferred.addErrback(function (error) {
                console.log("Print Task Error = " + error);
                // status.innerHTML = "Whoops!  Something went wrong!  Please try again later.";
                $("#printStatus").text("Whoops!  Something went wrong!  Please try again later.");
                $("#printStatus").show();
                $("#printStatus").attr("class", 'red');
                $("#loadingPrint").hide();
                $("#btnPDF").show();
                setTimeout(() => {
                    $("#printStatus").hide()
                }, 5000);
            });
            $("#pdfCollapse").on('hide.bs.collapse', function () {
                $("#printStatus").hide();
            });
        }

        // Show modal dialog, hide nav
        $(document).ready(function () {
            // legend nav1 menu is selected
            $("#legendNav1").click(function (e) {
                $("#legendCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#legendCollapse').on('show.bs.collapse', function () {
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
            $("#basemapNav1").click(function (e) {
                $("#basemapCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#basemapCollapse').on('show.bs.collapse', function () {
                $("#legendCollapse").removeClass("in");
                $("#huntCollapse").removeClass("in");
                $("#kmlCollapse").removeClass("in");
                $("#uploadCollapse").removeClass("in");
                $("#geosearchCollapse").removeClass("in");
                $("#measureCollapse").removeClass("in");
                $("#drawCollapse").removeClass("in");
                $("#pdfCollapse").removeClass("in");
            });
            // hunt nav1 menu is selected
            $("#huntNav1").click(function (e) {
                $("#huntCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#huntCollapse').on('show.bs.collapse', function () {
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
            $("#kmlNav1").click(function (e) {
                $("#kmlCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#kmlCollapse').on('show.bs.collapse', function () {
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
            $("#uploadNav1").click(function (e) {
                $("#uploadCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#uploadCollapse').on('show.bs.collapse', function () {
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
            $("#geosearchNav1").click(function (e) {
                $("#geosearchCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#geosearchCollapse').on('show.bs.collapse', function () {
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
            $("#measurementNav1").click(function (e) {
                $("#measureCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#measureCollapse').on('show.bs.collapse', function () {
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
            $("#drawNav1").click(function (e) {
                $("#drawCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#drawCollapse').on('show.bs.collapse', function () {
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
            $("#pdfNav1").click(function (e) {
                $("#pdfCollapse").collapse('toggle');
            });
            //Close other tools when opened.
            $('#pdfCollapse').on('show.bs.collapse', function () {
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
            $("#helpNav1").click(function (e) {
                $("#helpModal").modal("show");

            });
            // disclaimer is clicked
            $("#disclaimer").click(function (e) {
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

        let sidebar = $("#sidebar");
        $('#ReturnBtn').on("click", function () {
            collapse(sidebar);
        });

        $("#expandSidebar").on("click", function () {
            if (!$("#sidebar").hasClass("collapse")) {
                collapse($(sidebar));
            } else {
                expand($(sidebar));
            }
        });

        $(window).on("resize", function () {
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
            $("#expandSidebar").removeClass("glyphicon-menu-left");
            $("#expandSidebar").addClass("glyphicon-list");
            $("#mapView").css({
                "display": "block"
            });
        }

        function expand(el) {
            $(el).removeClass("collapse");
            $("#mapView").removeClass("fullScreen");
            $("#mapView").addClass("splitScreen");
            $("#expandSidebar").removeClass("glyphicon-list");
            $("#expandSidebar").addClass("glyphicon-menu-left");
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
        window.onkeydown = function (e) {
            if (e.keyCode === 112) {
                var win = window.open('https://idfg.idaho.gov/ifwis/huntplanner/mapcenter/HelpDocV2/IDFG%20Hunt%20Planner%20Map%20Center%20Help%20Documentation.html', '_blank');
                if (win) {
                    //Browser has allowed it to be opened
                    win.focus();
                } else {
                    //Browser has blocked it
                    alert('Please allow popups for this website');
                }
            }
        };
    });

