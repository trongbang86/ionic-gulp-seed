describe('ApiService', function() {
	var service;

	beforeEach(module('IonicGulpSeed'));
	beforeEach(module('AppTemplate'));
	mockApiService();

	beforeEach(inject(function(ApiService){
		service = ApiService;
	}));

	it('should getEndpoint()', function() {
		expect(service.getEndpoint()).to.eq('http://localhost:3000');
	});
});