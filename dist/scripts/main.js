'use strict'; /* eslint-env browser */
(function () {
  'use strict';

  var app = {};
  var lastQueryLocation = new google.maps.LatLng({ lat: 0, lng: 0 });

  /* CONSTANTS */
  var GOOGLE_MAP_OPTIONS = {
    zoom: 16,
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
  app.controller = {
    initApp: initApp,
    loadPlaces: loadPlaces, // load places from Foursquare

    onClickPlace: onClickPlace, // handle sidebar clicks
    onClickMarker: onClickMarker, // handle map clicks

    addPlaces: addPlaces,
    removePlacesFromStart: removePlacesFromStart,
    removeAllPlaces: removeAllPlaces };


  /* MODEL */
  app.model = {
    map: null, // google map object

    places: ko.observableArray([]).extend({ rateLimit: 100 }), // main places storage
    placesHash: new Map(), // helps to search place from foursquare place id
    markers: new WeakMap() // helps to search place from google marker
  };

  /* VIEW MODEL*/
  app.viewModel = {
    //Selected place
    placeDetails: ko.observable(),
    isPlaceDetailsVisible: ko.observable(false),
    hidePlaceDetails: function hidePlaceDetails() {app.viewModel.isPlaceDetailsVisible(false);},

    // error message
    isFailureModalVisible: ko.observable(false),
    hideFailureModal: function hideFailureModal() {app.viewModel.isFailureModalVisible(false);},

    textFilter: ko.observable(''),

    filteredPlaces: ko.pureComputed(function () {
      var text = app.viewModel.textFilter().trim().toLowerCase(),
      places = app.model.places();
      if (!text) return places;

      return _.filter(places, function (place) {return place.name.toLowerCase().indexOf(text) !== -1;});
    }),

    isPlacesNotLoaded: ko.pureComputed(function () {
      var places = app.model.places();
      return places.length === 0;
    }),

    // show spinner?
    isLoading: ko.observable(false),

    onClickPlace: app.controller.onClickPlace };


  /**
                                                  *  create a map, add map listener
                                                  */
  function initApp() {
    // init google map

    var map = new google.maps.Map(document.getElementById('google-map'), GOOGLE_MAP_OPTIONS);
    app.model.map = map;

    // Try HTML5 geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude };


        app.controller.removeAllPlaces();
        map.setCenter(pos);
      }, function () {
        //handleLocationError
      });
    } else {
        // Browser doesn't support Geolocation
      }

    map.addListener('bounds_changed', _.throttle(app.controller.loadPlaces, 2000));
  }

  /**
     * load places from 4square
     */
  function loadPlaces() {
    var map = app.model.map;

    // dont ask 4square on big areas
    if (map.zoom < 16) return;

    //distance between this point and last request
    var distance = google.maps.geometry.spherical.computeDistanceBetween(lastQueryLocation, map.center);
    // don't load new data if point is too close to previous search
    if (distance < 1500) return;
    lastQueryLocation = map.center;
    app.viewModel.isLoading(true);

    // load data from foursquare
    //TODO idea, calculate radius from map zoom
    var FoursquareRequestOptions = {
      ll: map.center.lat() + ',' + map.center.lng(),
      radius: 2000,
      section: 'drinks',
      client_id: 'E54BQ11LCWJ15Q0FH4MELITI2CZQ5KSJOU53TNRARJ3HHNXN',
      client_secret: 'T4O0ZURMG00IGUTU4NKSQZ4DH0E5LGLMDAE20OJWPXMBD10Y',
      v: 20160909 };

    $.get('https://api.foursquare.com/v2/venues/explore', FoursquareRequestOptions, app.controller.addPlaces).
    fail(function () {
      app.viewModel.isFailureModalVisible(true);
    }).
    always(function () {
      app.viewModel.isLoading(false);
    });
  }

  /**
     * map place constructor
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

    this.marker.addListener('click', app.controller.onClickMarker);
  }

  /**
     * add places to the map
     * @param res - results from foursquare request
     */
  function addPlaces(res) {
    //app.controller.removeAllPlaces();

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

    app.viewModel.isLoading(false);
  }

  /**
     * remove N places form the beginning of tha places array
     * @param N
     */
  function removePlacesFromStart(N) {
    var place = void 0;
    for (var i = 0; i < N; i++) {
      place = app.model.places.shift();
      place.marker.setMap(null);
      app.model.placesHash.delete(place.stash.venue.id);
      if (app.viewModel.placeDetails() === place) app.viewModel.placeDetails(null);
    }
  }

  function removeAllPlaces() {
    var N = app.model.places().length;
    app.controller.removePlacesFromStart(N);
  }

  /**
     * user clicks on a place in the menu
     * @param place
     */
  function onClickPlace(place) {
    var oldSelected = app.viewModel.placeDetails();
    if (oldSelected === place) return;

    if (oldSelected) {
      oldSelected.isSelected(false);
      oldSelected.marker.setIcon(G_MARKER);
    }

    //add place to selected and show place details modal window
    place.isSelected(true);
    app.viewModel.placeDetails(place);
    app.viewModel.isPlaceDetailsVisible(true);

    // change marker icon and move map to this marker
    place.marker.setIcon(G_MARKER_SELECTED);
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
    app.controller.onClickPlace(place);
  }

  // init app after page loading
  $(function () {
    ko.applyBindings(app.viewModel);
    app.controller.initApp();
  });
})();
//# sourceMappingURL=data:application/json;base64,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Q0FBa0IsR0FBbEIsQ0FBc0IsSUFBdEIsQ0FBZDtBQUNBLFFBQUksVUFBSixDQUFlLFlBQWYsQ0FBNEIsS0FBNUI7QUFDRDs7QUFFRDtBQUNBLElBQUUsWUFBWTtBQUNaLE9BQUcsYUFBSCxDQUFpQixJQUFJLFNBQXJCO0FBQ0EsUUFBSSxVQUFKLENBQWUsT0FBZjtBQUNELEdBSEQ7QUFJRCxDQXBRRCIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWVudiBicm93c2VyICovXG4oZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgYXBwID0ge307XG4gIGxldCBsYXN0UXVlcnlMb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoe2xhdDogMCwgbG5nOiAwfSk7XG5cbiAgLyogQ09OU1RBTlRTICovXG4gIGNvbnN0IEdPT0dMRV9NQVBfT1BUSU9OUyA9IHtcbiAgICB6b29tOiAxNixcbiAgICBjZW50ZXI6IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoMzcuNzcwMzcwNiwgLTEyMi4zODcxMjI2KSxcbiAgICBtYXBUeXBlSWQ6IGdvb2dsZS5tYXBzLk1hcFR5cGVJZC5ST0FETUFQLFxuICAgIG1hcFR5cGVDb250cm9sOiBmYWxzZSxcbiAgICBzdHJlZXRWaWV3Q29udHJvbDogZmFsc2VcbiAgfTtcblxuICAvLyBnb29nbGUgbWFwIG1hcmtlcnNcbiAgY29uc3QgR19NQVJLRVIgPSB7XG4gICAgcGF0aDogJ00wLTQ4Yy05LjggMC0xNy43IDcuOC0xNy43IDE3LjQgMCAxNS41IDE3LjcgMzAuNiAxNy43IDMwLjZzMTcuNy0xNS40IDE3LjctMzAuNmMwLTkuNi03LjktMTcuNC0xNy43LTE3LjR6JyxcbiAgICBmaWxsQ29sb3I6ICcjNjA3ZDhiJyxcbiAgICBmaWxsT3BhY2l0eTogMC43LFxuICAgIHNjYWxlOiAwLjcsXG4gICAgc3Ryb2tlQ29sb3I6ICcjNjA3ZDhiJyxcbiAgICBzdHJva2VXZWlnaHQ6IDNcbiAgfTtcbiAgY29uc3QgR19NQVJLRVJfU0VMRUNURUQgPSB7XG4gICAgcGF0aDogJ00wLTQ4Yy05LjggMC0xNy43IDcuOC0xNy43IDE3LjQgMCAxNS41IDE3LjcgMzAuNiAxNy43IDMwLjZzMTcuNy0xNS40IDE3LjctMzAuNmMwLTkuNi03LjktMTcuNC0xNy43LTE3LjR6JyxcbiAgICBmaWxsQ29sb3I6ICcjMDA5Njg4JyxcbiAgICBmaWxsT3BhY2l0eTogMC44LFxuICAgIHNjYWxlOiAwLjgsXG4gICAgc3Ryb2tlQ29sb3I6ICcjMDA5Njg4JyxcbiAgICBzdHJva2VXZWlnaHQ6IDNcbiAgfTtcblxuXG4gIC8qIENPTlRST0xMRVIgKi9cbiAgYXBwLmNvbnRyb2xsZXIgPSB7XG4gICAgaW5pdEFwcDogaW5pdEFwcCxcbiAgICBsb2FkUGxhY2VzOiBsb2FkUGxhY2VzLCAgICAgICAgICAgLy8gbG9hZCBwbGFjZXMgZnJvbSBGb3Vyc3F1YXJlXG5cbiAgICBvbkNsaWNrUGxhY2U6IG9uQ2xpY2tQbGFjZSwgICAgICAvLyBoYW5kbGUgc2lkZWJhciBjbGlja3NcbiAgICBvbkNsaWNrTWFya2VyOiBvbkNsaWNrTWFya2VyLCAgICAgIC8vIGhhbmRsZSBtYXAgY2xpY2tzXG5cbiAgICBhZGRQbGFjZXM6IGFkZFBsYWNlcyxcbiAgICByZW1vdmVQbGFjZXNGcm9tU3RhcnQ6IHJlbW92ZVBsYWNlc0Zyb21TdGFydCxcbiAgICByZW1vdmVBbGxQbGFjZXM6IHJlbW92ZUFsbFBsYWNlcyxcbiAgfTtcblxuICAvKiBNT0RFTCAqL1xuICBhcHAubW9kZWwgPSB7XG4gICAgbWFwOiBudWxsLCAgICAgICAgICAgICAgICAgICAgICAvLyBnb29nbGUgbWFwIG9iamVjdFxuXG4gICAgcGxhY2VzOiBrby5vYnNlcnZhYmxlQXJyYXkoW10pLmV4dGVuZCh7cmF0ZUxpbWl0OiAxMDB9KSwgLy8gbWFpbiBwbGFjZXMgc3RvcmFnZVxuICAgIHBsYWNlc0hhc2g6IG5ldyBNYXAoKSwgICAgICAgICAgLy8gaGVscHMgdG8gc2VhcmNoIHBsYWNlIGZyb20gZm91cnNxdWFyZSBwbGFjZSBpZFxuICAgIG1hcmtlcnM6IG5ldyBXZWFrTWFwKCkgICAgICAgICAgLy8gaGVscHMgdG8gc2VhcmNoIHBsYWNlIGZyb20gZ29vZ2xlIG1hcmtlclxuICB9O1xuXG4gIC8qIFZJRVcgTU9ERUwqL1xuICBhcHAudmlld01vZGVsID0ge1xuICAgIC8vU2VsZWN0ZWQgcGxhY2VcbiAgICBwbGFjZURldGFpbHM6IGtvLm9ic2VydmFibGUoKSxcbiAgICBpc1BsYWNlRGV0YWlsc1Zpc2libGU6IGtvLm9ic2VydmFibGUoZmFsc2UpLFxuICAgIGhpZGVQbGFjZURldGFpbHM6ICgpID0+IHsgYXBwLnZpZXdNb2RlbC5pc1BsYWNlRGV0YWlsc1Zpc2libGUoZmFsc2UpIH0sXG5cbiAgICAvLyBlcnJvciBtZXNzYWdlXG4gICAgaXNGYWlsdXJlTW9kYWxWaXNpYmxlOiBrby5vYnNlcnZhYmxlKGZhbHNlKSxcbiAgICBoaWRlRmFpbHVyZU1vZGFsOiAoKSA9PiB7IGFwcC52aWV3TW9kZWwuaXNGYWlsdXJlTW9kYWxWaXNpYmxlKGZhbHNlKSB9LFxuXG4gICAgdGV4dEZpbHRlcjoga28ub2JzZXJ2YWJsZSgnJyksXG5cbiAgICBmaWx0ZXJlZFBsYWNlczoga28ucHVyZUNvbXB1dGVkKCgpID0+IHtcbiAgICAgIGxldCB0ZXh0ID0gYXBwLnZpZXdNb2RlbC50ZXh0RmlsdGVyKCkudHJpbSgpLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIHBsYWNlcyA9IGFwcC5tb2RlbC5wbGFjZXMoKTtcbiAgICAgIGlmICghdGV4dCkgcmV0dXJuIHBsYWNlcztcblxuICAgICAgcmV0dXJuIF8uZmlsdGVyKHBsYWNlcywgcGxhY2UgPT4gcGxhY2UubmFtZS50b0xvd2VyQ2FzZSgpLmluZGV4T2YodGV4dCkgIT09IC0xKTtcbiAgICB9KSxcblxuICAgIGlzUGxhY2VzTm90TG9hZGVkOiBrby5wdXJlQ29tcHV0ZWQoKCkgPT4ge1xuICAgICAgbGV0IHBsYWNlcyA9IGFwcC5tb2RlbC5wbGFjZXMoKTtcbiAgICAgIHJldHVybiBwbGFjZXMubGVuZ3RoID09PSAwO1xuICAgIH0pLFxuXG4gICAgLy8gc2hvdyBzcGlubmVyP1xuICAgIGlzTG9hZGluZzoga28ub2JzZXJ2YWJsZShmYWxzZSksXG5cbiAgICBvbkNsaWNrUGxhY2U6IGFwcC5jb250cm9sbGVyLm9uQ2xpY2tQbGFjZVxuICB9O1xuXG4gIC8qKlxuICAgKiAgY3JlYXRlIGEgbWFwLCBhZGQgbWFwIGxpc3RlbmVyXG4gICAqL1xuICBmdW5jdGlvbiBpbml0QXBwKCkge1xuICAgIC8vIGluaXQgZ29vZ2xlIG1hcFxuXG4gICAgY29uc3QgbWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ29vZ2xlLW1hcCcpLCBHT09HTEVfTUFQX09QVElPTlMpO1xuICAgIGFwcC5tb2RlbC5tYXAgPSBtYXA7XG5cbiAgICAvLyBUcnkgSFRNTDUgZ2VvbG9jYXRpb25cbiAgICBpZiAobmF2aWdhdG9yLmdlb2xvY2F0aW9uKSB7XG4gICAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uIChwb3NpdGlvbikge1xuICAgICAgICB2YXIgcG9zID0ge1xuICAgICAgICAgIGxhdDogcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlLFxuICAgICAgICAgIGxuZzogcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZVxuICAgICAgICB9O1xuXG4gICAgICAgIGFwcC5jb250cm9sbGVyLnJlbW92ZUFsbFBsYWNlcygpO1xuICAgICAgICBtYXAuc2V0Q2VudGVyKHBvcyk7XG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vaGFuZGxlTG9jYXRpb25FcnJvclxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IEdlb2xvY2F0aW9uXG4gICAgfVxuXG4gICAgbWFwLmFkZExpc3RlbmVyKCdib3VuZHNfY2hhbmdlZCcsIF8udGhyb3R0bGUoYXBwLmNvbnRyb2xsZXIubG9hZFBsYWNlcywgMjAwMCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIGxvYWQgcGxhY2VzIGZyb20gNHNxdWFyZVxuICAgKi9cbiAgZnVuY3Rpb24gbG9hZFBsYWNlcygpIHtcbiAgICBjb25zdCBtYXAgPSBhcHAubW9kZWwubWFwO1xuXG4gICAgLy8gZG9udCBhc2sgNHNxdWFyZSBvbiBiaWcgYXJlYXNcbiAgICBpZiAobWFwLnpvb20gPCAxNikgcmV0dXJuO1xuXG4gICAgLy9kaXN0YW5jZSBiZXR3ZWVuIHRoaXMgcG9pbnQgYW5kIGxhc3QgcmVxdWVzdFxuICAgIGxldCBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKGxhc3RRdWVyeUxvY2F0aW9uLCBtYXAuY2VudGVyKTtcbiAgICAvLyBkb24ndCBsb2FkIG5ldyBkYXRhIGlmIHBvaW50IGlzIHRvbyBjbG9zZSB0byBwcmV2aW91cyBzZWFyY2hcbiAgICBpZiAoZGlzdGFuY2UgPCAxNTAwKSByZXR1cm47XG4gICAgbGFzdFF1ZXJ5TG9jYXRpb24gPSBtYXAuY2VudGVyO1xuICAgIGFwcC52aWV3TW9kZWwuaXNMb2FkaW5nKHRydWUpO1xuXG4gICAgLy8gbG9hZCBkYXRhIGZyb20gZm91cnNxdWFyZVxuICAgIC8vVE9ETyBpZGVhLCBjYWxjdWxhdGUgcmFkaXVzIGZyb20gbWFwIHpvb21cbiAgICBjb25zdCBGb3Vyc3F1YXJlUmVxdWVzdE9wdGlvbnMgPSB7XG4gICAgICBsbDogbWFwLmNlbnRlci5sYXQoKSArICcsJyArIG1hcC5jZW50ZXIubG5nKCksXG4gICAgICByYWRpdXM6IDIwMDAsXG4gICAgICBzZWN0aW9uOiAnZHJpbmtzJyxcbiAgICAgIGNsaWVudF9pZDogJ0U1NEJRMTFMQ1dKMTVRMEZINE1FTElUSTJDWlE1S1NKT1U1M1ROUkFSSjNISE5YTicsXG4gICAgICBjbGllbnRfc2VjcmV0OiAnVDRPMFpVUk1HMDBJR1VUVTROS1NRWjRESDBFNUxHTE1EQUUyME9KV1BYTUJEMTBZJyxcbiAgICAgIHY6IDIwMTYwOTA5XG4gICAgfTtcbiAgICAkLmdldCgnaHR0cHM6Ly9hcGkuZm91cnNxdWFyZS5jb20vdjIvdmVudWVzL2V4cGxvcmUnLCBGb3Vyc3F1YXJlUmVxdWVzdE9wdGlvbnMsIGFwcC5jb250cm9sbGVyLmFkZFBsYWNlcylcbiAgICAgIC5mYWlsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYXBwLnZpZXdNb2RlbC5pc0ZhaWx1cmVNb2RhbFZpc2libGUodHJ1ZSk7XG4gICAgICB9KVxuICAgICAgLmFsd2F5cyhmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFwcC52aWV3TW9kZWwuaXNMb2FkaW5nKGZhbHNlKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIG1hcCBwbGFjZSBjb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0gaXRlbSAtIG9uZSBwbGFjZSBmcm9tIGZvdXJzcXVhcmUgQVBJIHJlc3BvbnNlXG4gICAqIEBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gUGxhY2UoaXRlbSkge1xuICAgIGNvbnN0IG1hcCA9IGFwcC5tb2RlbC5tYXA7XG4gICAgY29uc3QgbGF0ID0gaXRlbS52ZW51ZS5sb2NhdGlvbi5sYXQsXG4gICAgICBsbmcgPSBpdGVtLnZlbnVlLmxvY2F0aW9uLmxuZyxcbiAgICAgIG5hbWUgPSBpdGVtLnZlbnVlLm5hbWU7XG5cbiAgICB0aGlzLnN0YXNoID0gaXRlbTtcbiAgICB0aGlzLmxvY2F0aW9uID0ge2xhdCwgbG5nfTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuaXNTZWxlY3RlZCA9IGtvLm9ic2VydmFibGUoZmFsc2UpO1xuICAgIHRoaXMubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XG4gICAgICBtYXA6IG1hcCxcbiAgICAgIHBvc2l0aW9uOiBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKSxcbiAgICAgIGljb246IEdfTUFSS0VSLFxuICAgIH0pO1xuICAgIHRoaXMubWFya2VyLmFkZExpc3RlbmVyKCdjbGljaycsIGFwcC5jb250cm9sbGVyLm9uQ2xpY2tNYXJrZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIGFkZCBwbGFjZXMgdG8gdGhlIG1hcFxuICAgKiBAcGFyYW0gcmVzIC0gcmVzdWx0cyBmcm9tIGZvdXJzcXVhcmUgcmVxdWVzdFxuICAgKi9cbiAgZnVuY3Rpb24gYWRkUGxhY2VzKHJlcykge1xuICAgIC8vYXBwLmNvbnRyb2xsZXIucmVtb3ZlQWxsUGxhY2VzKCk7XG5cbiAgICByZXMucmVzcG9uc2UuZ3JvdXBzWzBdLml0ZW1zLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIGlmIChhcHAubW9kZWwucGxhY2VzSGFzaC5oYXMoaXRlbS52ZW51ZS5pZCkpIHJldHVybjsgLy8gZG9uJ3QgYWxsb3cgdG8gZG91YmxlIGl0ZW1zIG9uIHRoZSBtYXBcblxuICAgICAgY29uc3QgcGxhY2UgPSBuZXcgUGxhY2UoaXRlbSk7XG4gICAgICBhcHAubW9kZWwucGxhY2VzLnB1c2gocGxhY2UpO1xuICAgICAgYXBwLm1vZGVsLnBsYWNlc0hhc2guc2V0KGl0ZW0udmVudWUuaWQsIHBsYWNlKTtcbiAgICAgIGFwcC5tb2RlbC5tYXJrZXJzLnNldChwbGFjZS5tYXJrZXIsIHBsYWNlKTtcblxuICAgIH0pO1xuXG4gICAgLy8gbm90IG1vcmUgdGhhbiAxNTAgbWFya2VycyBvbiB0aGUgbWFwXG4gICAgbGV0IGxlbmd0aCA9IGFwcC5tb2RlbC5wbGFjZXMoKS5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCA+IDE1MCkgYXBwLmNvbnRyb2xsZXIucmVtb3ZlUGxhY2VzRnJvbVN0YXJ0KGxlbmd0aCAtIDE1MCk7XG5cbiAgICBhcHAudmlld01vZGVsLmlzTG9hZGluZyhmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogcmVtb3ZlIE4gcGxhY2VzIGZvcm0gdGhlIGJlZ2lubmluZyBvZiB0aGEgcGxhY2VzIGFycmF5XG4gICAqIEBwYXJhbSBOXG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVQbGFjZXNGcm9tU3RhcnQoTikge1xuICAgIGxldCBwbGFjZTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE47IGkrKykge1xuICAgICAgcGxhY2UgPSBhcHAubW9kZWwucGxhY2VzLnNoaWZ0KCk7XG4gICAgICBwbGFjZS5tYXJrZXIuc2V0TWFwKG51bGwpO1xuICAgICAgYXBwLm1vZGVsLnBsYWNlc0hhc2guZGVsZXRlKHBsYWNlLnN0YXNoLnZlbnVlLmlkKTtcbiAgICAgIGlmIChhcHAudmlld01vZGVsLnBsYWNlRGV0YWlscygpID09PSBwbGFjZSkgYXBwLnZpZXdNb2RlbC5wbGFjZURldGFpbHMobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlQWxsUGxhY2VzKCkge1xuICAgIGxldCBOID0gYXBwLm1vZGVsLnBsYWNlcygpLmxlbmd0aDtcbiAgICBhcHAuY29udHJvbGxlci5yZW1vdmVQbGFjZXNGcm9tU3RhcnQoTik7XG4gIH1cblxuICAvKipcbiAgICogdXNlciBjbGlja3Mgb24gYSBwbGFjZSBpbiB0aGUgbWVudVxuICAgKiBAcGFyYW0gcGxhY2VcbiAgICovXG4gIGZ1bmN0aW9uIG9uQ2xpY2tQbGFjZShwbGFjZSkge1xuICAgIGNvbnN0IG9sZFNlbGVjdGVkID0gYXBwLnZpZXdNb2RlbC5wbGFjZURldGFpbHMoKTtcbiAgICBpZiAob2xkU2VsZWN0ZWQgPT09IHBsYWNlKSByZXR1cm47XG5cbiAgICBpZihvbGRTZWxlY3RlZCkge1xuICAgICAgb2xkU2VsZWN0ZWQuaXNTZWxlY3RlZChmYWxzZSk7XG4gICAgICBvbGRTZWxlY3RlZC5tYXJrZXIuc2V0SWNvbihHX01BUktFUik7XG4gICAgfVxuXG4gICAgLy9hZGQgcGxhY2UgdG8gc2VsZWN0ZWQgYW5kIHNob3cgcGxhY2UgZGV0YWlscyBtb2RhbCB3aW5kb3dcbiAgICBwbGFjZS5pc1NlbGVjdGVkKHRydWUpO1xuICAgIGFwcC52aWV3TW9kZWwucGxhY2VEZXRhaWxzKHBsYWNlKTtcbiAgICBhcHAudmlld01vZGVsLmlzUGxhY2VEZXRhaWxzVmlzaWJsZSh0cnVlKTtcblxuICAgIC8vIGNoYW5nZSBtYXJrZXIgaWNvbiBhbmQgbW92ZSBtYXAgdG8gdGhpcyBtYXJrZXJcbiAgICBwbGFjZS5tYXJrZXIuc2V0SWNvbihHX01BUktFUl9TRUxFQ1RFRCk7XG4gICAgYXBwLm1vZGVsLm1hcC5wYW5UbyhwbGFjZS5sb2NhdGlvbik7XG5cbiAgICAvLyBoaWRlIHNpZGUgbWVudSBvbiBzbWFsbCBzY3JlZW5zIGFmdGVyIGNsaWNrXG4gICAgaWYgKHdpbmRvdy5tYXRjaE1lZGlhKCcobWF4LXdpZHRoOiA0MjZweCknKS5tYXRjaGVzKSB7XG4gICAgICAkKCcubWRsLWxheW91dF9fZHJhd2VyJykucmVtb3ZlQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICAgICQoJy5tZGwtbGF5b3V0X19vYmZ1c2NhdG9yJykucmVtb3ZlQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogdXNlciBjbGlja3Mgb24gYSBtYXAgbWFya2VyXG4gICAqL1xuICBmdW5jdGlvbiBvbkNsaWNrTWFya2VyKCkge1xuICAgIGNvbnN0IHBsYWNlID0gYXBwLm1vZGVsLm1hcmtlcnMuZ2V0KHRoaXMpO1xuICAgIGFwcC5jb250cm9sbGVyLm9uQ2xpY2tQbGFjZShwbGFjZSk7XG4gIH1cblxuICAvLyBpbml0IGFwcCBhZnRlciBwYWdlIGxvYWRpbmdcbiAgJChmdW5jdGlvbiAoKSB7XG4gICAga28uYXBwbHlCaW5kaW5ncyhhcHAudmlld01vZGVsKTtcbiAgICBhcHAuY29udHJvbGxlci5pbml0QXBwKCk7XG4gIH0pO1xufSkoKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
