describe('ApiService', function() {
	var service;

	beforeEach(module('IonicGulpSeed'));
	beforeEach(module('AppTemplate'));

	beforeEach(inject(function(ApiService){
		service = ApiService;
		mockApiService(service);
	}));

	it('should getEndpoint()', function() {
		expect(service.getEndpoint()).to.eq('http://localhost:3000');
	});
});