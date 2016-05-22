function mockApiService(ApiService) {
	var apiService = sinon.mock(ApiService);
	apiService.expects('getEndpoint').returns('http://localhost:3000');
	return apiService;
}