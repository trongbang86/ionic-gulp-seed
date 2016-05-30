
function mockApiService() {	
	var fakeUrl = 'http://localhost:3000';
	beforeEach(module(function($provide){  
		$provide.value('ApiService', {
			getEndpoint: function() {
				console.log('ApiService.getEndpoint() - ' + 
					'Using fakeUrl:' + fakeUrl);
				return fakeUrl;
			},
			url: function(url) {
				console.log('ApiService.url() - ' + 
					'Using fakeUrl:' + fakeUrl + 
					' - url:' + url);
				return fakeUrl + url;
			}
		});
		
	}));

}

function enableLogging() {


	var $log;	
	// Inject the $log service
	beforeEach(function(){
		var injector = angular.injector(['ng']);
		$log = injector.get('$log');
		module(function($provide){
			$provide.value('$log', $log);
		});
	});

	// Log debug messages in Karma
	afterEach(function(){  
	  for (var i in $log.debug.logs) {
	  	console.log('DEBUG:' + $log.debug.logs[i]);
	  }
	});
}

function enableRealHttp() {

	beforeEach(function () {
	    var i = angular.injector(["ng"]),
	        rs = i.get("$rootScope");
	    var http = i.get("$http");

	    module(function ($provide) {
	        $provide.value("$http", http);
	        $provide.value("$rootScope", rs);
	    });
	}); 
}