angular.module('internApp', ['ui.bootstrap', 'ngRoute'])
.factory('authService', function() {
	var authService = {

		getToken: function() {
			return localStorage.getItem("token");
		},

		setToken: function(token) {
			localStorage.setItem("token", token);
		},

		generateHeader: function() {
			return {
				"Authorization": "Bearer " + this.getToken()
			};
		},
		deleteToken: function() {
			localStorage.removeItem("token");
		}
	}

	return authService;
})
.factory('apiService', ['authService', '$http', function(authService, $http) {
	var baseURL = "http://qi.local";

	var apiService = {
		//  No auth
		authenticate: function(data, successHandler, errorHandler) {
			$http({
				method: 'POST',
				url: baseURL + "/auth",
				data: data
			}).then(function(response) {
				authService.setToken(response.data.token)
				successHandler(response);
			}, function(response) {
				errorHandler(response);
			});
		},

		createUser: function(data, successHandler, errorHandler) {
			$http({
				method: 'POST',
				url: baseURL + "/users",
				data: data
			}).then(function(response) {
				authService.setToken(response.data.token)
				successHandler(response)
			}, function(response) {
				errorHandler(response);
			});
		},

		//  all these use the auth service
		logout: function(successHandler, errorHandler) {
			$http({
				method: 'DELETE',
				url: baseURL + "/auth"
			}).then(function(response) {
				successHandler(response)
			}, function(response) {
				errorHandler(response);
			});
		},

		getNotes: function(successHandler, errorHandler) {
			$http({
				method: 'GET',
				url: baseURL + "/notes",
				headers: authService.generateHeader(),
			}).then(function(response) {

				var notes = response.data.notes;
				//  Javascript sucks
				for (var i = 0; i < notes.length; i++) {
					notes[i].completed = notes[i].completed == 1;
				};

				successHandler(notes)
			}, function(response) {
				errorHandler(response);
			});
		},

		createNote: function(noteData, successHandler, errorHandler) {
			$http({
				method: 'POST',
				url: baseURL + "/notes",
				data: noteData,
				headers: authService.generateHeader(),
			}).then(function(response) {
				successHandler(response)
			}, function(response) {
				errorHandler(response);
			});
		},

		updateNote: function(noteData, successHandler, errorHandler) {
			$http({
				method: 'PUT',
				url: baseURL + "/notes/" + noteData.id,
				headers: authService.generateHeader(),
				data: noteData
			}).then(function(response) {
				successHandler(response)
			}, function(response) {
				errorHandler(response);
			});
		},

		deleteNote: function(noteId, successHandler, errorHandler) {
			$http({
				method: 'DELETE',
				url: baseURL + "/notes/" + noteId,
				headers: authService.generateHeader(),
			}).then(function(response) {
				successHandler()
			}, function(response) {
				errorHandler(response);
			});
		}
	}

	return apiService;
}])
.controller('SignInController', ['$scope', '$location', 'apiService', function($scope, $location, apiService) {

	$scope.register = function() {
		apiService.createUser($scope.user, function(response) {
			$location.path('/home');
		}, function(response) {
			console.log(response);
		})
	}

	$scope.signIn = function() {
		apiService.authenticate($scope.login, function(response) {
			$location.path('/home');
		}, function(response) {
			console.log(response);
		})
	}
}])
.controller('HomeController', ['$scope', '$location', '$uibModal', 'apiService', function($scope, $location, $uibModal, apiService) {
	apiService.getNotes(function (notes) {
		$scope.notes = notes;
	}, function(response) {
		console.log("bad");
	});

	$scope.editNote = function(note) {
		var parentScope = $scope;
	    var modalInstance = $uibModal.open({
			templateUrl: 'templates/createModal.html',

			controller: function($scope) {
				$scope.header = "Edit this Note";
				$scope.note = note;
				$scope.title = note.title;
				$scope.description = note.description;

				$scope.dismiss = function() {
					modalInstance.close()
				}

				$scope.handleNote = function() {
					$scope.note.title = $scope.title;
					$scope.note.description = $scope.description;

					parentScope.updateNote($scope.note);
					modalInstance.close()
				}
			}
	    });
	}

	$scope.toggleComplete = function(note) {
		apiService.updateNote(note, function() {
			
		}, function() {
			//note.completed = !note.completed;
		})
	}

	$scope.removeNote = function(note_id) {
		apiService.deleteNote(note_id, function() {

			var index = $scope.notes.findIndex(function(note) {
				return note_id == note.id
			});

			$scope.notes.splice(index, 1);
		}, function(response) {
			console.log("failed to delete note");
		})
	}

	$scope.createNote = function(note) {
	
		apiService.createNote(note, function(response) {

			note.completed = false;
			note.id = $scope.notes.length + 1;
			$scope.notes.push(note);

		}, function(response) {
			console.log(response);
		})
	}

	$scope.updateNote = function(note) {
		apiService.updateNote(note, function(response) {
			var index = $scope.notes.findIndex(function(tsk) {
				return tsk.id == note.id
			});

			$scope.notes[index] = note;
		}, function(response) {
			console.log(response);
		});
	}

	$scope.addNote = function() {
		//  Not sure this is kosher
		var parentScope = $scope;

	    var modalInstance = $uibModal.open({
			templateUrl: 'templates/createModal.html',

			controller: function($scope) {
				$scope.header = "Add a Note"

				$scope.dismiss = function() {
					modalInstance.close()
				}

				$scope.handleNote = function() {
					parentScope.createNote({
						title: $scope.title,
						description: $scope.description
					});

					modalInstance.close()
				}
			}
	    });
	}
}])
.config(function($routeProvider, $locationProvider) {
	$locationProvider.hashPrefix('');

	$routeProvider
		.when('/', {
			templateUrl: 'templates/register.html',
			controller: 'SignInController'
		})
		.when('/home', {
			templateUrl: 'templates/home.html',
			controller: 'HomeController'
		});
});