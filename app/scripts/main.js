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

  app.controller = {};

  app.model = {
    map: null, // google map object
    places: ko.observableArray([]), // places marked on the map
    placesHash: new Map(),
    markers: new WeakMap(),
    selectedPlaces: new Set(),

    placeInFocus: ko.observable(),
    isPlaceInFocusVisible: ko.observable(false),
    hideDetailsModal: () => {app.model.isPlaceInFocusVisible(false)},

    isFailureModelVisible: ko.observable(false),
    hideFailureModal: () => {app.model.isFailureModelVisible(false)},

    textFilter: ko.observable(''),

    filteredPlaces: ko.pureComputed(() => {
      let text = app.model.textFilter().trim().toLowerCase(),
          places = app.model.places();
      if (!text) return places;

      return _.filter(places, place => place.name.toLowerCase().indexOf(text) !== -1 );
    }),

    isLoading: ko.observable(false),

    onClickPlace: onClickPalace,
    onClickMarker: onClickMarker,
  };

  app.controller.initApp = function initApp() {
    // init google map
    const myOptions = {
      zoom: 13,
      center: new google.maps.LatLng(37.7703706, -122.3871226),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false
    };
    const map =  new google.maps.Map(document.getElementById('google-map'), myOptions);
    app.model.map = map;

    map.addListener('bounds_changed', _.throttle(app.controller.loadPlaces, 3000));
  };

  app.controller.loadPlaces = function loadPlaces() {
    const map = app.model.map;
    console.log('bounds_changed', map);

    // dont ask 4square on big areas
    if (map.zoom < 16) return;

    const lat = map.center.lat(),
          lng = map.center.lng();

    //distance between this point and last request
    let distance = google.maps.geometry.spherical.computeDistanceBetween(lastQueryLocation, map.center);
    // don't load new data if point is too close to previous search
    if (distance < 1000) return;
    lastQueryLocation = map.center;
    console.log('lat', lat, 'lng', lng, 'dist', distance);
    //TODO idea, calculate radius from map zoom
    const requestOptions = {
      ll: lat + ',' + lng,
      radius: 2000,
      section: 'drinks',
      client_id: 'E54BQ11LCWJ15Q0FH4MELITI2CZQ5KSJOU53TNRARJ3HHNXN',
      client_secret: 'T4O0ZURMG00IGUTU4NKSQZ4DH0E5LGLMDAE20OJWPXMBD10Y',
      v: 20160909
    };
    app.model.isLoading(true);
    $.get('https://api.foursquare.com/v2/venues/explore', requestOptions, app.controller.addPlaces)
      .fail(function(){
        //todo say user smth
        app.model.isFailureModelVisible(true);
      })
      .always(function() {
        console.log('finish');
        app.model.isLoading(false);
      });
  };

  app.controller.addPlaces = function(res) {
    //app.model.places.removeAll();
    console.log('4 square', res);
    console.log('4 square Items: ', res.response.groups[0].items);
    res.response.groups[0].items.forEach(function(item) {
      if(app.model.placesHash.has(item.venue.id)) return; // don't allow to repeat items

      const place = new Place(item);
      app.model.places.push(place);
      console.log('item.venue.id', item.venue.id);
      app.model.placesHash.set(item.venue.id, place);
      app.model.markers.set(place.marker, place);

    });
    console.log('after add', app.model.places());
    app.model.isLoading(false);
  };


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

  function onClickPalace(place) {
    console.log('click place', place);
    if (app.model.selectedPlaces.has(place)) return;
    // remove all selected
    for (let selected of app.model.selectedPlaces) {
      console.log('selected', selected);
      selected.isSelected(false);
      selected.marker.setIcon(G_MARKER);
      app.model.selectedPlaces.delete(selected);
    }
    //add place to selected
    place.isSelected(true);
    app.model.selectedPlaces.add(place);
    place.marker.setIcon(G_MARKER_SELECTED);
    app.model.placeInFocus(place);
    app.model.isPlaceInFocusVisible(true);

    app.model.map.panTo(place.location);

    // hide side menu on small screens
    if(window.matchMedia('(max-width: 426px)').matches) {
      $('.mdl-layout__drawer').removeClass('is-visible');
      $('.mdl-layout__obfuscator').removeClass('is-visible');
    }
  }

  function onClickMarker() {
    console.log('marker click', this);
    const place = app.model.markers.get(this);
    onClickPalace(place);
  }

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


  $(function() {
    ko.applyBindings(app.model);
    app.controller.initApp();
  });
})();
