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

  // Check to make sure service workers are supported in the current browser,
  // and that the current page is accessed from a secure origin. Using a
  // service worker from an insecure origin will trigger JS console errors. See
  // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
  var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
      // [::1] is the IPv6 localhost address.
      window.location.hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      window.location.hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
    );

  if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || isLocalhost)) {
    navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
      // Check to see if there's an updated version of service-worker.js with
      // new files to cache:
      // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-registration-update-method
      if (typeof registration.update === 'function') {
        registration.update();
      }

      // updatefound is fired if service-worker.js changes.
      registration.onupdatefound = function() {
        // updatefound is also fired the very first time the SW is installed,
        // and there's no need to prompt for a reload at that point.
        // So check here to see if the page is already controlled,
        // i.e. whether there's an existing service worker.
        if (navigator.serviceWorker.controller) {
          // The updatefound event implies that registration.installing is set:
          // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
          var installingWorker = registration.installing;

          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                // At this point, the old content will have been purged and the
                // fresh content will have been added to the cache.
                // It's the perfect time to display a "New content is
                // available; please refresh." message in the page's interface.
                break;

              case 'redundant':
                throw new Error('The installing ' +
                                'service worker became redundant.');

              default:
                // Ignore
            }
          };
        }
      };
    }).catch(function(e) {
      console.error('Error during service worker registration:', e);
    });
  }

  // Your custom JavaScript goes here

})();

const app = {};

app.model = {
   map: null, // google map object
   places: ko.observableArray([]), // places marked on the map
};

app.controller = {

};

$(function() {
  ko.applyBindings(app.model);
  initMap();

});


function initMap() {
  var myOptions = {
    zoom: 13,
    center: new google.maps.LatLng(37.7703706, -122.3871226),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  app.model.map = new google.maps.Map(document.getElementById('google-map'), myOptions);
  var map = app.model.map;
  marker = new google.maps.Marker({map: map, position: new google.maps.LatLng(37.7703706, -122.3871226)});
  infowindow = new google.maps.InfoWindow({content: '<strong>PathFind</strong>'});
  google.maps.event.addListener(marker, 'click', function () {
    infowindow.open(map, marker);
  });

  map.addListener('bounds_changed', _.debounce(loadBars, 3000));

  //infowindow.open(map, marker);

  function loadBars() {
    console.log('bounds_changed', map);
    var lat = map.center.lat(),
      lng = map.center.lng();
    console.log('lat', lat, 'lng', lng);

    // dont ask 4square on big areas
    if (map.zoom < 17) return;

    $.get('https://api.foursquare.com/v2/venues/explore', {
      ll: lat + ',' + lng,
      radius: 2000,
      section: 'drinks',
      client_id: 'E54BQ11LCWJ15Q0FH4MELITI2CZQ5KSJOU53TNRARJ3HHNXN',
      client_secret: 'T4O0ZURMG00IGUTU4NKSQZ4DH0E5LGLMDAE20OJWPXMBD10Y',
      v: 20160815
    }, function (res) {

      app.model.places.removeAll();
      console.log(app.model.places());
      console.log('4 square', res);
      console.log(res.response.groups[0].items.map(function(item){
        var lat = item.venue.location.lat,
          lng = item.venue.location.lng,
          name = item.venue.name;
        var place = {
          marker: new google.maps.Marker({map: map, position: new google.maps.LatLng(lat, lng)}),
          data: item
        };
        app.model.places.push(place);

        return name + ': ' + lat + ',' + lng;
      }));
      console.log('after add', app.model.places());
    });
  }
}
