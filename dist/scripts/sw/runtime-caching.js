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
/* eslint-env worker */
// global.toolbox is defined in a different script, sw-toolbox.js, which is part of the
// https://github.com/GoogleChrome/sw-toolbox project.
// That sw-toolbox.js script must be executed first, so it needs to be listed before this in the
// importScripts() call that the parent service worker makes.
(function (global) {
  'use strict';

  // See https://github.com/GoogleChrome/sw-toolbox/blob/6e8242dc328d1f1cfba624269653724b26fa94f1/README.md#toolboxroutergeturlpattern-handler-options
  // and https://github.com/GoogleChrome/sw-toolbox/blob/6e8242dc328d1f1cfba624269653724b26fa94f1/README.md#toolboxfastest
  // for more details on how this handler is defined and what the toolbox.fastest strategy does.
  global.toolbox.router.get('/(.*)', global.toolbox.fastest, {
    origin: /\.(?:googleapis|gstatic)\.com$/ });

})(self);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN3L3J1bnRpbWUtY2FjaGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiY0FBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDLFVBQVMsTUFBVCxFQUFpQjtBQUNoQjs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxTQUFPLE9BQVAsQ0FBZSxNQUFmLENBQXNCLEdBQXRCLENBQTBCLE9BQTFCLEVBQW1DLE9BQU8sT0FBUCxDQUFlLE9BQWxELEVBQTJEO0FBQ3pELFlBQVEsZ0NBRGlELEVBQTNEOztBQUdELENBVEQsRUFTRyxJQVRIIiwiZmlsZSI6InN3L3J1bnRpbWUtY2FjaGluZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICpcbiAqICBXZWIgU3RhcnRlciBLaXRcbiAqICBDb3B5cmlnaHQgMjAxNSBHb29nbGUgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqICBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqICBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICBodHRwczovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqICBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiAgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlXG4gKlxuICovXG4vKiBlc2xpbnQtZW52IHdvcmtlciAqL1xuLy8gZ2xvYmFsLnRvb2xib3ggaXMgZGVmaW5lZCBpbiBhIGRpZmZlcmVudCBzY3JpcHQsIHN3LXRvb2xib3guanMsIHdoaWNoIGlzIHBhcnQgb2YgdGhlXG4vLyBodHRwczovL2dpdGh1Yi5jb20vR29vZ2xlQ2hyb21lL3N3LXRvb2xib3ggcHJvamVjdC5cbi8vIFRoYXQgc3ctdG9vbGJveC5qcyBzY3JpcHQgbXVzdCBiZSBleGVjdXRlZCBmaXJzdCwgc28gaXQgbmVlZHMgdG8gYmUgbGlzdGVkIGJlZm9yZSB0aGlzIGluIHRoZVxuLy8gaW1wb3J0U2NyaXB0cygpIGNhbGwgdGhhdCB0aGUgcGFyZW50IHNlcnZpY2Ugd29ya2VyIG1ha2VzLlxuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9Hb29nbGVDaHJvbWUvc3ctdG9vbGJveC9ibG9iLzZlODI0MmRjMzI4ZDFmMWNmYmE2MjQyNjk2NTM3MjRiMjZmYTk0ZjEvUkVBRE1FLm1kI3Rvb2xib3hyb3V0ZXJnZXR1cmxwYXR0ZXJuLWhhbmRsZXItb3B0aW9uc1xuICAvLyBhbmQgaHR0cHM6Ly9naXRodWIuY29tL0dvb2dsZUNocm9tZS9zdy10b29sYm94L2Jsb2IvNmU4MjQyZGMzMjhkMWYxY2ZiYTYyNDI2OTY1MzcyNGIyNmZhOTRmMS9SRUFETUUubWQjdG9vbGJveGZhc3Rlc3RcbiAgLy8gZm9yIG1vcmUgZGV0YWlscyBvbiBob3cgdGhpcyBoYW5kbGVyIGlzIGRlZmluZWQgYW5kIHdoYXQgdGhlIHRvb2xib3guZmFzdGVzdCBzdHJhdGVneSBkb2VzLlxuICBnbG9iYWwudG9vbGJveC5yb3V0ZXIuZ2V0KCcvKC4qKScsIGdsb2JhbC50b29sYm94LmZhc3Rlc3QsIHtcbiAgICBvcmlnaW46IC9cXC4oPzpnb29nbGVhcGlzfGdzdGF0aWMpXFwuY29tJC9cbiAgfSk7XG59KShzZWxmKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
