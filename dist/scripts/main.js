'use strict'; /*!
               *
               *  Web Starter Kit
               *  Copyright 2015 Google Inc. All rights reserved.
               *
               *  Licensed under the Apache License, Version 2.0 (the "License");
               *  you may not use this file except in compliance with the License.
               *  You may obtain a copy of the License at
               *
               *    https://www.apache.org/licenses/LICENSE-2.0
               *
               *  Unless required by applicable law or agreed to in writing, software
               *  distributed under the License is distributed on an "AS IS" BASIS,
               *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
               *  See the License for the specific language governing permissions and
               *  limitations under the License
               *
               */
/* eslint-env browser */
(function () {
  'use strict';

  // Your custom JavaScript goes here
  var app = {};
  var lastQueryLocation = new google.maps.LatLng({ lat: 0, lng: 0 });

  /* CONSTANTS */
  var GOOGLE_MAP_OPTIONS = {
    zoom: 13,
    center: new google.maps.LatLng(37.7703706, -122.3871226),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    streetViewControl: false };


  // google map markers
  var G_MARKER = {
    path: 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
    fillColor: '#607d8b',
    fillOpacity: 0.7,
    scale: 0.7,
    strokeColor: '#607d8b',
    strokeWeight: 3 };

  var G_MARKER_SELECTED = {
    path: 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
    fillColor: '#009688',
    fillOpacity: 0.8,
    scale: 0.8,
    strokeColor: '#009688',
    strokeWeight: 3 };



  /* CONTROLLER */
  app.controller = {};

  /* MODEL */
  app.model = {
    map: null, // google map object

    places: ko.observableArray([]).extend({ rateLimit: 100 }), // main places storage
    placesHash: new Map(), // helps to search place from foursquare place id
    markers: new WeakMap(), // helps to search place from google marker
    selectedPlaces: new Set(), // places marked on the map todo not in use now

    //Selected place
    placeInFocus: ko.observable(),
    isPlaceInFocusVisible: ko.observable(false),
    hideDetailsModal: function hideDetailsModal() {app.model.isPlaceInFocusVisible(false);},

    // error message
    isFailureModalVisible: ko.observable(false),
    hideFailureModal: function hideFailureModal() {app.model.isFailureModelVisible(false);},

    textFilter: ko.observable(''),

    filteredPlaces: ko.pureComputed(function () {
      var text = app.model.textFilter().trim().toLowerCase(),
      places = app.model.places();
      if (!text) return places;

      return _.filter(places, function (place) {return place.name.toLowerCase().indexOf(text) !== -1;});
    }),

    isPlacesNotLoaded: ko.pureComputed(function () {
      var places = app.model.places();
      console.log('places', places.length);
      return places.length === 0;
    }),

    // show spinner?
    isLoading: ko.observable(false),

    // click on a place in menu handler
    onClickPlace: onClickPalace,

    // click on a map marker handler
    onClickMarker: onClickMarker };


  /**
                                     *  create a map, add map listener
                                     */
  app.controller.initApp = function initApp() {
    // init google map

    var map = new google.maps.Map(document.getElementById('google-map'), GOOGLE_MAP_OPTIONS);
    app.model.map = map;

    // Try HTML5 geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude };


        map.setCenter(pos);
      }, function () {
        //handleLocationError
      });
    } else {
        // Browser doesn't support Geolocation
      }

    map.addListener('bounds_changed', _.throttle(app.controller.loadPlaces, 3000));
  };

  /**
      * load bars from 4square
      */
  app.controller.loadPlaces = function loadPlaces() {
    var map = app.model.map;

    // dont ask 4square on big areas
    if (map.zoom < 16) return;

    //distance between this point and last request
    var distance = google.maps.geometry.spherical.computeDistanceBetween(lastQueryLocation, map.center);
    // don't load new data if point is too close to previous search
    if (distance < 1000) return;
    lastQueryLocation = map.center;
    app.model.isLoading(true);

    // load data from foursquare
    //TODO idea, calculate radius from map zoom
    var lat = map.center.lat(),
    lng = map.center.lng();
    var FoursquareRequestOptions = {
      ll: lat + ',' + lng,
      radius: 2000,
      section: 'drinks',
      client_id: 'E54BQ11LCWJ15Q0FH4MELITI2CZQ5KSJOU53TNRARJ3HHNXN',
      client_secret: 'T4O0ZURMG00IGUTU4NKSQZ4DH0E5LGLMDAE20OJWPXMBD10Y',
      v: 20160909 };

    $.get('https://api.foursquare.com/v2/venues/explore', FoursquareRequestOptions, app.controller.addPlaces).
    fail(function () {
      app.model.isFailureModelVisible(true);
    }).
    always(function () {
      app.model.isLoading(false);
    });
  };


  /**
      * add places to the map
      * @param res - results from foursquare request
      */
  app.controller.addPlaces = function (res) {
    //app.model.places.removeAll();

    res.response.groups[0].items.forEach(function (item) {
      if (app.model.placesHash.has(item.venue.id)) return; // don't allow to double items on the map

      var place = new Place(item);
      app.model.places.push(place);
      app.model.placesHash.set(item.venue.id, place);
      app.model.markers.set(place.marker, place);

    });

    // not more than 150 markers on the map
    var length = app.model.places().length;
    if (length > 150) app.controller.removePlacesFromStart(length - 150);

    app.model.isLoading(false);
  };

  /**
      * remove N places form the beginning of Array
      * @param N
        */
  app.controller.removePlacesFromStart = function (N) {
    var place = void 0;
    for (var i = 0; i < N; i++) {
      place = app.model.places.shift();
      place.marker.setMap(null);
      app.model.placesHash.delete(place.stash.venue.id);
      if (app.model.placeInFocus() === place) app.model.placeInFocus(null);
    }
  };

  /**
      * map place
      * @param item - one place from foursquare API response
      * @constructor
      */
  function Place(item) {
    var map = app.model.map;
    var lat = item.venue.location.lat,
    lng = item.venue.location.lng,
    name = item.venue.name;

    this.stash = item;
    this.location = { lat: lat, lng: lng };
    this.name = name;
    this.isSelected = ko.observable(false);
    this.marker = new google.maps.Marker({
      map: map,
      position: new google.maps.LatLng(lat, lng),
      icon: G_MARKER });

    this.marker.addListener('click', onClickMarker);
  }

  /**
     * user clicks on a place in the menu
     * @param place
     */
  function onClickPalace(place) {
    if (app.model.selectedPlaces.has(place)) return;

    // remove all selected
    var _iteratorNormalCompletion = true;var _didIteratorError = false;var _iteratorError = undefined;try {for (var _iterator = app.model.selectedPlaces[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {var selected = _step.value;
        selected.isSelected(false);
        selected.marker.setIcon(G_MARKER);
        app.model.selectedPlaces.delete(selected);
      }

      //add place to selected
    } catch (err) {_didIteratorError = true;_iteratorError = err;} finally {try {if (!_iteratorNormalCompletion && _iterator.return) {_iterator.return();}} finally {if (_didIteratorError) {throw _iteratorError;}}}place.isSelected(true);
    app.model.selectedPlaces.add(place);

    // change marker icon and show place details modal window
    place.marker.setIcon(G_MARKER_SELECTED);
    app.model.placeInFocus(place);
    app.model.isPlaceInFocusVisible(true);

    app.model.map.panTo(place.location);

    // hide side menu on small screens after click
    if (window.matchMedia('(max-width: 426px)').matches) {
      $('.mdl-layout__drawer').removeClass('is-visible');
      $('.mdl-layout__obfuscator').removeClass('is-visible');
    }
  }

  /**
     * user clicks on a map marker
     */
  function onClickMarker() {
    var place = app.model.markers.get(this);
    onClickPalace(place);
  }

  // init app after loading page
  $(function () {
    ko.applyBindings(app.model);
    app.controller.initApp();
  });
})();
//# sourceMappingURL=data:application/json;base64,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QztBQUNEO0FBQ0Y7O0FBRUQ7OztBQUdBLFdBQVMsYUFBVCxHQUF5QjtBQUN2QixRQUFNLFFBQVEsSUFBSSxLQUFKLENBQVUsT0FBVixDQUFrQixHQUFsQixDQUFzQixJQUF0QixDQUFkO0FBQ0Esa0JBQWMsS0FBZDtBQUNEOztBQUVEO0FBQ0EsSUFBRSxZQUFXO0FBQ1gsT0FBRyxhQUFILENBQWlCLElBQUksS0FBckI7QUFDQSxRQUFJLFVBQUosQ0FBZSxPQUFmO0FBQ0QsR0FIRDtBQUlELENBOVBEIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiFcbiAqXG4gKiAgV2ViIFN0YXJ0ZXIgS2l0XG4gKiAgQ29weXJpZ2h0IDIwMTUgR29vZ2xlIEluYy4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqICB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgaHR0cHM6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqICBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiAgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqICBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZVxuICpcbiAqL1xuLyogZXNsaW50LWVudiBicm93c2VyICovXG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBZb3VyIGN1c3RvbSBKYXZhU2NyaXB0IGdvZXMgaGVyZVxuICBjb25zdCBhcHAgPSB7fTtcbiAgbGV0IGxhc3RRdWVyeUxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyh7bGF0OiAwLCBsbmc6IDB9KTtcblxuICAvKiBDT05TVEFOVFMgKi9cbiAgY29uc3QgR09PR0xFX01BUF9PUFRJT05TID0ge1xuICAgIHpvb206IDEzLFxuICAgIGNlbnRlcjogbmV3IGdvb2dsZS5tYXBzLkxhdExuZygzNy43NzAzNzA2LCAtMTIyLjM4NzEyMjYpLFxuICAgIG1hcFR5cGVJZDogZ29vZ2xlLm1hcHMuTWFwVHlwZUlkLlJPQURNQVAsXG4gICAgbWFwVHlwZUNvbnRyb2w6IGZhbHNlLFxuICAgIHN0cmVldFZpZXdDb250cm9sOiBmYWxzZVxuICB9O1xuXG4gIC8vIGdvb2dsZSBtYXAgbWFya2Vyc1xuICBjb25zdCBHX01BUktFUiA9IHtcbiAgICBwYXRoOiAnTTAtNDhjLTkuOCAwLTE3LjcgNy44LTE3LjcgMTcuNCAwIDE1LjUgMTcuNyAzMC42IDE3LjcgMzAuNnMxNy43LTE1LjQgMTcuNy0zMC42YzAtOS42LTcuOS0xNy40LTE3LjctMTcuNHonLFxuICAgIGZpbGxDb2xvcjogJyM2MDdkOGInLFxuICAgIGZpbGxPcGFjaXR5OiAwLjcsXG4gICAgc2NhbGU6IDAuNyxcbiAgICBzdHJva2VDb2xvcjogJyM2MDdkOGInLFxuICAgIHN0cm9rZVdlaWdodDogM1xuICB9O1xuICBjb25zdCBHX01BUktFUl9TRUxFQ1RFRCA9IHtcbiAgICBwYXRoOiAnTTAtNDhjLTkuOCAwLTE3LjcgNy44LTE3LjcgMTcuNCAwIDE1LjUgMTcuNyAzMC42IDE3LjcgMzAuNnMxNy43LTE1LjQgMTcuNy0zMC42YzAtOS42LTcuOS0xNy40LTE3LjctMTcuNHonLFxuICAgIGZpbGxDb2xvcjogJyMwMDk2ODgnLFxuICAgIGZpbGxPcGFjaXR5OiAwLjgsXG4gICAgc2NhbGU6IDAuOCxcbiAgICBzdHJva2VDb2xvcjogJyMwMDk2ODgnLFxuICAgIHN0cm9rZVdlaWdodDogM1xuICB9O1xuXG5cbiAgLyogQ09OVFJPTExFUiAqL1xuICBhcHAuY29udHJvbGxlciA9IHt9O1xuXG4gIC8qIE1PREVMICovXG4gIGFwcC5tb2RlbCA9IHtcbiAgICBtYXA6IG51bGwsICAgICAgICAgICAgICAgICAgICAgIC8vIGdvb2dsZSBtYXAgb2JqZWN0XG5cbiAgICBwbGFjZXM6IGtvLm9ic2VydmFibGVBcnJheShbXSkuZXh0ZW5kKHsgcmF0ZUxpbWl0OiAxMDAgfSksIC8vIG1haW4gcGxhY2VzIHN0b3JhZ2VcbiAgICBwbGFjZXNIYXNoOiBuZXcgTWFwKCksICAgICAgICAgIC8vIGhlbHBzIHRvIHNlYXJjaCBwbGFjZSBmcm9tIGZvdXJzcXVhcmUgcGxhY2UgaWRcbiAgICBtYXJrZXJzOiBuZXcgV2Vha01hcCgpLCAgICAgICAgIC8vIGhlbHBzIHRvIHNlYXJjaCBwbGFjZSBmcm9tIGdvb2dsZSBtYXJrZXJcbiAgICBzZWxlY3RlZFBsYWNlczogbmV3IFNldCgpLCAgICAgIC8vIHBsYWNlcyBtYXJrZWQgb24gdGhlIG1hcCB0b2RvIG5vdCBpbiB1c2Ugbm93XG5cbiAgICAvL1NlbGVjdGVkIHBsYWNlXG4gICAgcGxhY2VJbkZvY3VzOiBrby5vYnNlcnZhYmxlKCksXG4gICAgaXNQbGFjZUluRm9jdXNWaXNpYmxlOiBrby5vYnNlcnZhYmxlKGZhbHNlKSxcbiAgICBoaWRlRGV0YWlsc01vZGFsOiAoKSA9PiB7YXBwLm1vZGVsLmlzUGxhY2VJbkZvY3VzVmlzaWJsZShmYWxzZSl9LFxuXG4gICAgLy8gZXJyb3IgbWVzc2FnZVxuICAgIGlzRmFpbHVyZU1vZGFsVmlzaWJsZToga28ub2JzZXJ2YWJsZShmYWxzZSksXG4gICAgaGlkZUZhaWx1cmVNb2RhbDogKCkgPT4ge2FwcC5tb2RlbC5pc0ZhaWx1cmVNb2RlbFZpc2libGUoZmFsc2UpfSxcblxuICAgIHRleHRGaWx0ZXI6IGtvLm9ic2VydmFibGUoJycpLFxuXG4gICAgZmlsdGVyZWRQbGFjZXM6IGtvLnB1cmVDb21wdXRlZCgoKSA9PiB7XG4gICAgICBsZXQgdGV4dCA9IGFwcC5tb2RlbC50ZXh0RmlsdGVyKCkudHJpbSgpLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgcGxhY2VzID0gYXBwLm1vZGVsLnBsYWNlcygpO1xuICAgICAgaWYgKCF0ZXh0KSByZXR1cm4gcGxhY2VzO1xuXG4gICAgICByZXR1cm4gXy5maWx0ZXIocGxhY2VzLCBwbGFjZSA9PiBwbGFjZS5uYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZih0ZXh0KSAhPT0gLTEgKTtcbiAgICB9KSxcblxuICAgIGlzUGxhY2VzTm90TG9hZGVkOiBrby5wdXJlQ29tcHV0ZWQoKCkgPT4ge1xuICAgICAgbGV0IHBsYWNlcyA9IGFwcC5tb2RlbC5wbGFjZXMoKTtcbiAgICAgIGNvbnNvbGUubG9nKCdwbGFjZXMnLCBwbGFjZXMubGVuZ3RoKTtcbiAgICAgIHJldHVybiBwbGFjZXMubGVuZ3RoID09PSAwO1xuICAgIH0pLFxuXG4gICAgLy8gc2hvdyBzcGlubmVyP1xuICAgIGlzTG9hZGluZzoga28ub2JzZXJ2YWJsZShmYWxzZSksXG5cbiAgICAvLyBjbGljayBvbiBhIHBsYWNlIGluIG1lbnUgaGFuZGxlclxuICAgIG9uQ2xpY2tQbGFjZTogb25DbGlja1BhbGFjZSxcblxuICAgIC8vIGNsaWNrIG9uIGEgbWFwIG1hcmtlciBoYW5kbGVyXG4gICAgb25DbGlja01hcmtlcjogb25DbGlja01hcmtlcixcbiAgfTtcblxuICAvKipcbiAgICogIGNyZWF0ZSBhIG1hcCwgYWRkIG1hcCBsaXN0ZW5lclxuICAgKi9cbiAgYXBwLmNvbnRyb2xsZXIuaW5pdEFwcCA9IGZ1bmN0aW9uIGluaXRBcHAoKSB7XG4gICAgLy8gaW5pdCBnb29nbGUgbWFwXG5cbiAgICBjb25zdCBtYXAgPSAgbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ29vZ2xlLW1hcCcpLCBHT09HTEVfTUFQX09QVElPTlMpO1xuICAgIGFwcC5tb2RlbC5tYXAgPSBtYXA7XG5cbiAgICAvLyBUcnkgSFRNTDUgZ2VvbG9jYXRpb25cbiAgICBpZiAobmF2aWdhdG9yLmdlb2xvY2F0aW9uKSB7XG4gICAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG4gICAgICAgIHZhciBwb3MgPSB7XG4gICAgICAgICAgbGF0OiBwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGUsXG4gICAgICAgICAgbG5nOiBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlXG4gICAgICAgIH07XG5cbiAgICAgICAgbWFwLnNldENlbnRlcihwb3MpO1xuICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vaGFuZGxlTG9jYXRpb25FcnJvclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IEdlb2xvY2F0aW9uXG4gICAgfVxuXG4gICAgbWFwLmFkZExpc3RlbmVyKCdib3VuZHNfY2hhbmdlZCcsIF8udGhyb3R0bGUoYXBwLmNvbnRyb2xsZXIubG9hZFBsYWNlcywgMzAwMCkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBsb2FkIGJhcnMgZnJvbSA0c3F1YXJlXG4gICAqL1xuICBhcHAuY29udHJvbGxlci5sb2FkUGxhY2VzID0gZnVuY3Rpb24gbG9hZFBsYWNlcygpIHtcbiAgICBjb25zdCBtYXAgPSBhcHAubW9kZWwubWFwO1xuXG4gICAgLy8gZG9udCBhc2sgNHNxdWFyZSBvbiBiaWcgYXJlYXNcbiAgICBpZiAobWFwLnpvb20gPCAxNikgcmV0dXJuO1xuXG4gICAgLy9kaXN0YW5jZSBiZXR3ZWVuIHRoaXMgcG9pbnQgYW5kIGxhc3QgcmVxdWVzdFxuICAgIGxldCBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKGxhc3RRdWVyeUxvY2F0aW9uLCBtYXAuY2VudGVyKTtcbiAgICAvLyBkb24ndCBsb2FkIG5ldyBkYXRhIGlmIHBvaW50IGlzIHRvbyBjbG9zZSB0byBwcmV2aW91cyBzZWFyY2hcbiAgICBpZiAoZGlzdGFuY2UgPCAxMDAwKSByZXR1cm47XG4gICAgbGFzdFF1ZXJ5TG9jYXRpb24gPSBtYXAuY2VudGVyO1xuICAgIGFwcC5tb2RlbC5pc0xvYWRpbmcodHJ1ZSk7XG5cbiAgICAvLyBsb2FkIGRhdGEgZnJvbSBmb3Vyc3F1YXJlXG4gICAgLy9UT0RPIGlkZWEsIGNhbGN1bGF0ZSByYWRpdXMgZnJvbSBtYXAgem9vbVxuICAgIGNvbnN0IGxhdCA9IG1hcC5jZW50ZXIubGF0KCksXG4gICAgICAgICAgbG5nID0gbWFwLmNlbnRlci5sbmcoKTtcbiAgICBjb25zdCBGb3Vyc3F1YXJlUmVxdWVzdE9wdGlvbnMgPSB7XG4gICAgICBsbDogbGF0ICsgJywnICsgbG5nLFxuICAgICAgcmFkaXVzOiAyMDAwLFxuICAgICAgc2VjdGlvbjogJ2RyaW5rcycsXG4gICAgICBjbGllbnRfaWQ6ICdFNTRCUTExTENXSjE1UTBGSDRNRUxJVEkyQ1pRNUtTSk9VNTNUTlJBUkozSEhOWE4nLFxuICAgICAgY2xpZW50X3NlY3JldDogJ1Q0TzBaVVJNRzAwSUdVVFU0TktTUVo0REgwRTVMR0xNREFFMjBPSldQWE1CRDEwWScsXG4gICAgICB2OiAyMDE2MDkwOVxuICAgIH07XG4gICAgJC5nZXQoJ2h0dHBzOi8vYXBpLmZvdXJzcXVhcmUuY29tL3YyL3ZlbnVlcy9leHBsb3JlJywgRm91cnNxdWFyZVJlcXVlc3RPcHRpb25zLCBhcHAuY29udHJvbGxlci5hZGRQbGFjZXMpXG4gICAgICAuZmFpbChmdW5jdGlvbigpe1xuICAgICAgICBhcHAubW9kZWwuaXNGYWlsdXJlTW9kZWxWaXNpYmxlKHRydWUpO1xuICAgICAgfSlcbiAgICAgIC5hbHdheXMoZnVuY3Rpb24oKSB7XG4gICAgICAgIGFwcC5tb2RlbC5pc0xvYWRpbmcoZmFsc2UpO1xuICAgICAgfSk7XG4gIH07XG5cblxuICAvKipcbiAgICogYWRkIHBsYWNlcyB0byB0aGUgbWFwXG4gICAqIEBwYXJhbSByZXMgLSByZXN1bHRzIGZyb20gZm91cnNxdWFyZSByZXF1ZXN0XG4gICAqL1xuICBhcHAuY29udHJvbGxlci5hZGRQbGFjZXMgPSBmdW5jdGlvbihyZXMpIHtcbiAgICAvL2FwcC5tb2RlbC5wbGFjZXMucmVtb3ZlQWxsKCk7XG5cbiAgICByZXMucmVzcG9uc2UuZ3JvdXBzWzBdLml0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgaWYoYXBwLm1vZGVsLnBsYWNlc0hhc2guaGFzKGl0ZW0udmVudWUuaWQpKSByZXR1cm47IC8vIGRvbid0IGFsbG93IHRvIGRvdWJsZSBpdGVtcyBvbiB0aGUgbWFwXG5cbiAgICAgIGNvbnN0IHBsYWNlID0gbmV3IFBsYWNlKGl0ZW0pO1xuICAgICAgYXBwLm1vZGVsLnBsYWNlcy5wdXNoKHBsYWNlKTtcbiAgICAgIGFwcC5tb2RlbC5wbGFjZXNIYXNoLnNldChpdGVtLnZlbnVlLmlkLCBwbGFjZSk7XG4gICAgICBhcHAubW9kZWwubWFya2Vycy5zZXQocGxhY2UubWFya2VyLCBwbGFjZSk7XG5cbiAgICB9KTtcblxuICAgIC8vIG5vdCBtb3JlIHRoYW4gMTUwIG1hcmtlcnMgb24gdGhlIG1hcFxuICAgIGxldCBsZW5ndGggPSBhcHAubW9kZWwucGxhY2VzKCkubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggPiAxNTApIGFwcC5jb250cm9sbGVyLnJlbW92ZVBsYWNlc0Zyb21TdGFydChsZW5ndGggLSAxNTApO1xuXG4gICAgYXBwLm1vZGVsLmlzTG9hZGluZyhmYWxzZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIHJlbW92ZSBOIHBsYWNlcyBmb3JtIHRoZSBiZWdpbm5pbmcgb2YgQXJyYXlcbiAgICogQHBhcmFtIE5cbiAgICAgKi9cbiAgYXBwLmNvbnRyb2xsZXIucmVtb3ZlUGxhY2VzRnJvbVN0YXJ0ID0gZnVuY3Rpb24gKE4pIHtcbiAgICBsZXQgcGxhY2U7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBOOyBpKyspIHtcbiAgICAgIHBsYWNlID0gYXBwLm1vZGVsLnBsYWNlcy5zaGlmdCgpO1xuICAgICAgcGxhY2UubWFya2VyLnNldE1hcChudWxsKTtcbiAgICAgIGFwcC5tb2RlbC5wbGFjZXNIYXNoLmRlbGV0ZShwbGFjZS5zdGFzaC52ZW51ZS5pZCk7XG4gICAgICBpZiAoYXBwLm1vZGVsLnBsYWNlSW5Gb2N1cygpID09PSBwbGFjZSkgYXBwLm1vZGVsLnBsYWNlSW5Gb2N1cyhudWxsKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIG1hcCBwbGFjZVxuICAgKiBAcGFyYW0gaXRlbSAtIG9uZSBwbGFjZSBmcm9tIGZvdXJzcXVhcmUgQVBJIHJlc3BvbnNlXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gUGxhY2UoaXRlbSkge1xuICAgIGNvbnN0IG1hcCA9IGFwcC5tb2RlbC5tYXA7XG4gICAgY29uc3QgbGF0ID0gaXRlbS52ZW51ZS5sb2NhdGlvbi5sYXQsXG4gICAgICAgICAgbG5nID0gaXRlbS52ZW51ZS5sb2NhdGlvbi5sbmcsXG4gICAgICAgICAgbmFtZSA9IGl0ZW0udmVudWUubmFtZTtcblxuICAgIHRoaXMuc3Rhc2ggPSBpdGVtO1xuICAgIHRoaXMubG9jYXRpb24gPSB7bGF0LCBsbmd9O1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5pc1NlbGVjdGVkID0ga28ub2JzZXJ2YWJsZShmYWxzZSk7XG4gICAgdGhpcy5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcbiAgICAgIG1hcDogbWFwLFxuICAgICAgcG9zaXRpb246IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpLFxuICAgICAgaWNvbjogR19NQVJLRVIsXG4gICAgfSk7XG4gICAgdGhpcy5tYXJrZXIuYWRkTGlzdGVuZXIoJ2NsaWNrJywgb25DbGlja01hcmtlcik7XG4gIH1cblxuICAvKipcbiAgICogdXNlciBjbGlja3Mgb24gYSBwbGFjZSBpbiB0aGUgbWVudVxuICAgKiBAcGFyYW0gcGxhY2VcbiAgICovXG4gIGZ1bmN0aW9uIG9uQ2xpY2tQYWxhY2UocGxhY2UpIHtcbiAgICBpZiAoYXBwLm1vZGVsLnNlbGVjdGVkUGxhY2VzLmhhcyhwbGFjZSkpIHJldHVybjtcblxuICAgIC8vIHJlbW92ZSBhbGwgc2VsZWN0ZWRcbiAgICBmb3IgKGxldCBzZWxlY3RlZCBvZiBhcHAubW9kZWwuc2VsZWN0ZWRQbGFjZXMpIHtcbiAgICAgIHNlbGVjdGVkLmlzU2VsZWN0ZWQoZmFsc2UpO1xuICAgICAgc2VsZWN0ZWQubWFya2VyLnNldEljb24oR19NQVJLRVIpO1xuICAgICAgYXBwLm1vZGVsLnNlbGVjdGVkUGxhY2VzLmRlbGV0ZShzZWxlY3RlZCk7XG4gICAgfVxuXG4gICAgLy9hZGQgcGxhY2UgdG8gc2VsZWN0ZWRcbiAgICBwbGFjZS5pc1NlbGVjdGVkKHRydWUpO1xuICAgIGFwcC5tb2RlbC5zZWxlY3RlZFBsYWNlcy5hZGQocGxhY2UpO1xuXG4gICAgLy8gY2hhbmdlIG1hcmtlciBpY29uIGFuZCBzaG93IHBsYWNlIGRldGFpbHMgbW9kYWwgd2luZG93XG4gICAgcGxhY2UubWFya2VyLnNldEljb24oR19NQVJLRVJfU0VMRUNURUQpO1xuICAgIGFwcC5tb2RlbC5wbGFjZUluRm9jdXMocGxhY2UpO1xuICAgIGFwcC5tb2RlbC5pc1BsYWNlSW5Gb2N1c1Zpc2libGUodHJ1ZSk7XG5cbiAgICBhcHAubW9kZWwubWFwLnBhblRvKHBsYWNlLmxvY2F0aW9uKTtcblxuICAgIC8vIGhpZGUgc2lkZSBtZW51IG9uIHNtYWxsIHNjcmVlbnMgYWZ0ZXIgY2xpY2tcbiAgICBpZih3aW5kb3cubWF0Y2hNZWRpYSgnKG1heC13aWR0aDogNDI2cHgpJykubWF0Y2hlcykge1xuICAgICAgJCgnLm1kbC1sYXlvdXRfX2RyYXdlcicpLnJlbW92ZUNsYXNzKCdpcy12aXNpYmxlJyk7XG4gICAgICAkKCcubWRsLWxheW91dF9fb2JmdXNjYXRvcicpLnJlbW92ZUNsYXNzKCdpcy12aXNpYmxlJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHVzZXIgY2xpY2tzIG9uIGEgbWFwIG1hcmtlclxuICAgKi9cbiAgZnVuY3Rpb24gb25DbGlja01hcmtlcigpIHtcbiAgICBjb25zdCBwbGFjZSA9IGFwcC5tb2RlbC5tYXJrZXJzLmdldCh0aGlzKTtcbiAgICBvbkNsaWNrUGFsYWNlKHBsYWNlKTtcbiAgfVxuXG4gIC8vIGluaXQgYXBwIGFmdGVyIGxvYWRpbmcgcGFnZVxuICAkKGZ1bmN0aW9uKCkge1xuICAgIGtvLmFwcGx5QmluZGluZ3MoYXBwLm1vZGVsKTtcbiAgICBhcHAuY29udHJvbGxlci5pbml0QXBwKCk7XG4gIH0pO1xufSkoKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==