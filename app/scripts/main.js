/*!
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
(function() {
  'use strict';

  // Your custom JavaScript goes here
  const app = {};
  let lastQueryLocation = new google.maps.LatLng({lat: 0, lng: 0});

  /* CONSTANTS */
  const GOOGLE_MAP_OPTIONS = {
    zoom: 13,
    center: new google.maps.LatLng(37.7703706, -122.3871226),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    streetViewControl: false
  };

  // google map markers
  const G_MARKER = {
    path: 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
    fillColor: '#607d8b',
    fillOpacity: 0.7,
    scale: 0.7,
    strokeColor: '#607d8b',
    strokeWeight: 3
  };
  const G_MARKER_SELECTED = {
    path: 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
    fillColor: '#009688',
    fillOpacity: 0.8,
    scale: 0.8,
    strokeColor: '#009688',
    strokeWeight: 3
  };


  /* CONTROLLER */
  app.controller = {};

  /* MODEL */
  app.model = {
    map: null,                      // google map object

    places: ko.observableArray([]).extend({ rateLimit: 100 }), // main places storage
    placesHash: new Map(),          // helps to search place from foursquare place id
    markers: new WeakMap(),         // helps to search place from google marker
    selectedPlaces: new Set(),      // places marked on the map todo not in use now

    //Selected place
    placeInFocus: ko.observable(),
    isPlaceInFocusVisible: ko.observable(false),
    hideDetailsModal: () => {app.model.isPlaceInFocusVisible(false)},

    // error message
    isFailureModalVisible: ko.observable(false),
    hideFailureModal: () => {app.model.isFailureModelVisible(false)},

    textFilter: ko.observable(''),

    filteredPlaces: ko.pureComputed(() => {
      let text = app.model.textFilter().trim().toLowerCase(),
          places = app.model.places();
      if (!text) return places;

      return _.filter(places, place => place.name.toLowerCase().indexOf(text) !== -1 );
    }),

    isPlacesNotLoaded: ko.pureComputed(() => {
      let places = app.model.places();
      console.log('places', places.length);
      return places.length === 0;
    }),

    // show spinner?
    isLoading: ko.observable(false),

    // click on a place in menu handler
    onClickPlace: onClickPalace,

    // click on a map marker handler
    onClickMarker: onClickMarker,
  };

  /**
   *  create a map, add map listener
   */
  app.controller.initApp = function initApp() {
    // init google map

    const map =  new google.maps.Map(document.getElementById('google-map'), GOOGLE_MAP_OPTIONS);
    app.model.map = map;

    // Try HTML5 geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        map.setCenter(pos);
      }, function() {
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
    const map = app.model.map;

    // dont ask 4square on big areas
    if (map.zoom < 16) return;

    //distance between this point and last request
    let distance = google.maps.geometry.spherical.computeDistanceBetween(lastQueryLocation, map.center);
    // don't load new data if point is too close to previous search
    if (distance < 1000) return;
    lastQueryLocation = map.center;
    app.model.isLoading(true);

    // load data from foursquare
    //TODO idea, calculate radius from map zoom
    const lat = map.center.lat(),
          lng = map.center.lng();
    const FoursquareRequestOptions = {
      ll: lat + ',' + lng,
      radius: 2000,
      section: 'drinks',
      client_id: 'E54BQ11LCWJ15Q0FH4MELITI2CZQ5KSJOU53TNRARJ3HHNXN',
      client_secret: 'T4O0ZURMG00IGUTU4NKSQZ4DH0E5LGLMDAE20OJWPXMBD10Y',
      v: 20160909
    };
    $.get('https://api.foursquare.com/v2/venues/explore', FoursquareRequestOptions, app.controller.addPlaces)
      .fail(function(){
        app.model.isFailureModelVisible(true);
      })
      .always(function() {
        app.model.isLoading(false);
      });
  };


  /**
   * add places to the map
   * @param res - results from foursquare request
   */
  app.controller.addPlaces = function(res) {
    //app.model.places.removeAll();

    res.response.groups[0].items.forEach(function(item) {
      if(app.model.placesHash.has(item.venue.id)) return; // don't allow to double items on the map

      const place = new Place(item);
      app.model.places.push(place);
      app.model.placesHash.set(item.venue.id, place);
      app.model.markers.set(place.marker, place);

    });

    // not more than 150 markers on the map
    let length = app.model.places().length;
    if (length > 150) app.controller.removePlacesFromStart(length - 150);

    app.model.isLoading(false);
  };

  /**
   * remove N places form the beginning of Array
   * @param N
     */
  app.controller.removePlacesFromStart = function (N) {
    let place;
    for (let i = 0; i < N; i++) {
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
    const map = app.model.map;
    const lat = item.venue.location.lat,
          lng = item.venue.location.lng,
          name = item.venue.name;

    this.stash = item;
    this.location = {lat, lng};
    this.name = name;
    this.isSelected = ko.observable(false);
    this.marker = new google.maps.Marker({
      map: map,
      position: new google.maps.LatLng(lat, lng),
      icon: G_MARKER,
    });
    this.marker.addListener('click', onClickMarker);
  }

  /**
   * user clicks on a place in the menu
   * @param place
   */
  function onClickPalace(place) {
    if (app.model.selectedPlaces.has(place)) return;

    // remove all selected
    for (let selected of app.model.selectedPlaces) {
      selected.isSelected(false);
      selected.marker.setIcon(G_MARKER);
      app.model.selectedPlaces.delete(selected);
    }

    //add place to selected
    place.isSelected(true);
    app.model.selectedPlaces.add(place);

    // change marker icon and show place details modal window
    place.marker.setIcon(G_MARKER_SELECTED);
    app.model.placeInFocus(place);
    app.model.isPlaceInFocusVisible(true);

    app.model.map.panTo(place.location);

    // hide side menu on small screens after click
    if(window.matchMedia('(max-width: 426px)').matches) {
      $('.mdl-layout__drawer').removeClass('is-visible');
      $('.mdl-layout__obfuscator').removeClass('is-visible');
    }
  }

  /**
   * user clicks on a map marker
   */
  function onClickMarker() {
    const place = app.model.markers.get(this);
    onClickPalace(place);
  }

  // init app after loading page
  $(function() {
    ko.applyBindings(app.model);
    app.controller.initApp();
  });
})();
