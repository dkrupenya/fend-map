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

  app.controller = {};

  app.model = {
    map: null, // google map object
    places: ko.observableArray([]), // places marked on the map
    markers: new WeakMap(),
    selectedPlaces: new Set(),

    onClickPlace: onClickPalace,
    onClickMarker: onClickMarker,
  };

  app.controller.initApp = function initApp() {
    // init google map
    const myOptions = {
      zoom: 13,
      center: new google.maps.LatLng(37.7703706, -122.3871226),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    const map =  new google.maps.Map(document.getElementById('google-map'), myOptions);
    app.model.map = map;

    map.addListener('bounds_changed', _.throttle(app.controller.loadPlaces, 3000));
  };

  app.controller.loadPlaces = function loadPlaces() {
    const map = app.model.map;
    console.log('bounds_changed', map);

    // dont ask 4square on big areas
    if (map.zoom < 17) return;

    const lat = map.center.lat(),
          lng = map.center.lng();
    console.log('lat', lat, 'lng', lng);
    //TODO idea, calculate radius from map zoom
    const requestOptions = {
      ll: lat + ',' + lng,
      radius: 2000,
      section: 'drinks',
      client_id: 'E54BQ11LCWJ15Q0FH4MELITI2CZQ5KSJOU53TNRARJ3HHNXN',
      client_secret: 'T4O0ZURMG00IGUTU4NKSQZ4DH0E5LGLMDAE20OJWPXMBD10Y',
      v: 20160815
    };
    $.get('https://api.foursquare.com/v2/venues/explore', requestOptions, app.controller.addPlaces);
  };

  app.controller.addPlaces = function(res) {
    //app.model.places.removeAll();
    console.log('4 square', res);
    console.log('4 square Items: ',res.response.groups[0].items);
    res.response.groups[0].items.map(function(item) {

      const place = new Place(item);
      app.model.places.push(place);
      app.model.markers.set(place.marker, place);

      return place.name + ': ' + place.location.lat + ',' + place.location.lng;
    });
    console.log('after add', app.model.places());
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
    //add this to selected
    place.isSelected(true);
    app.model.selectedPlaces.add(place);
    place.marker.setIcon(G_MARKER_SELECTED);
  }

  function onClickMarker() {
    console.log('marker click', this);
    const place = app.model.markers.get(this);
    onClickPalace(place);
  }

  const G_MARKER = {
    path: 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
    fillColor: 'blue',
    fillOpacity: 0.8,
    scale: 0.8,
    strokeColor: 'blue',
    strokeWeight: 3
  };

  const G_MARKER_SELECTED = {
    path: 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
    fillColor: 'green',
    fillOpacity: 0.8,
    scale: 0.8,
    strokeColor: 'green',
    strokeWeight: 3
  };


  $(function() {
    ko.applyBindings(app.model);
    app.controller.initApp();
  });
})();
