'use strict';

/**
 * @ngdoc service
 * @name IonicGulpSeed.ApiService
 * @description
 * # ApiService
 * Retrieves correct api to make requests against.
 * Uses settings from API_ENDPOINT defined in /config/apiEndpoint.js
 *
 * Usage example: $http({
 *                      url: ApiService.getEndPoint() + '/things',
 *                      method: 'GET'
 *                 })
 *
 */
angular.module('IonicGulpSeed')
    .factory('ApiService', function($window, $http, API_ENDPOINT, $log) {

        var _api = API_ENDPOINT;
        var endpoint = _api.port ? (_api.host + ':' + _api.port + _api.path) : (_api.host + _api.path);

        // activate for basic auth
        if (_api.needsAuth) {
            $http.defaults.headers.common.Authorization = 'Basic ' + $window.btoa(_api.username + ':' + _api.password);
        }

        // public api
        return {
            getEndpoint: getEndpoint,
            url: url
        };

        function getEndpoint() { 
            return endpoint; 
        }
        function url(url) {
            $log.debug('Calling ApiService.url() ' + 
                'with endpont:' + endpoint);
            return endpoint + url;
        }

    });

