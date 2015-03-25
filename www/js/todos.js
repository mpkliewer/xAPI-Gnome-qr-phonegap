$(function() {

	Parse.$ = jQuery;
  // Initialize Parse with your Parse application javascript keys - Parse.initialize("your-application-id", "your-javascript-key");
	Parse.initialize("Y4IkC78famIP7txt01B3kQmrjm0b19SqYyed8jxR", "QdaBkWXDgW0t2c8pHgdkiDo9C7hKvK18eHj35rKR");

	nfcApp.initialize();

	var tincan = new TinCan({
		recordStores: [{
			endpoint: "https://cloud.scorm.com/tc/3GBY5QUCKC/sandbox/", // Dave Smith's SCORM Cloud account
			auth: "Basic eHlRZURpZG8wYXBWbm9JUnRZczpoM3F1NzJaaXRsMU5wdGpqd21J",
			allowFail: false
		},
		{
			endpoint: "https://cloud.scorm.com/tc/58WJPIFQVJ/sandbox/", // TorranceLearning SCORM Cloud account
			auth: "Basic NThXSlBJRlFWSjpNQk56NnF3c0tNWFQ5aTFiVFBnaE9EcGwxRzRHTmNpS3p1MFhxakZN",
			allowFail: false
		}
		],
		context: {	}
	});	

  // Todo Model
  // Parse's "Object" is analogous to Backbone's "Model"
  // ----------
  // MK added
//  var currentUser;
//  if (Parse.User.current()) {
//	  currentUser = Parse.User.current().attributes.username;
//  }
  // Our basic Todo model has `content`, `order`, and `done` attributes.
  //var Todo = Parse.Object.extend("Gnome_" + currentUser, {
  var Todo = Parse.Object.extend("Gnomes", {
    // Default attributes for the todo.
    defaults: {
      content: "empty todo...",
      done: false,
	  assigned:false,
	  QR:false
    },

    // Ensure that each todo created has `content`.
    initialize: function() {
      if (!this.get("content")) {
        this.set({"content": this.defaults.content});
      }
    },

    // Toggle the `done` state of this todo item.
    finish: function() {
      this.save({done: !this.get("done")});
    }
	, //MK added
	tincanCreate: function() {
	  //TinCan goes here?
	  	var username = Parse.User.current().attributes.username;
		var email = Parse.User.current().attributes.email;
		var checklistItem = this._serverData.content;	
		
		console.log("tincanCreate function - " + checklistItem);
		
		// MK initial test
		tincan.sendStatement({
				actor: {
					name: username,
					mbox: email
				},
				verb: {
					id: "http://adlnet.gov/expapi/verbs/completed",
					display: {und: "completed"}
				},
				target: {
					id: "http://www.torrancelearning.com/xapi/gnome",
					definition: {
						name: {und: checklistItem},
						description: {und: "Right now, this is a manual checklist item."},
					}					
				}
			}
		);		
		
	}
	
  });

  // This is the transient application state, not persisted on Parse
  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });

  // Todo Collection
  // ---------------

  var TodoList = Parse.Collection.extend({

    // Reference to this collection's model.
    model: Todo,

    // Filter down the list of all todo items that are finished.
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

    // Filter down the list to only todo items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Todos are sorted by their original insertion order.
    comparator: function(todo) {
      return todo.get('order');
    }

  });

  // Todo Item View
  // --------------

  // The DOM element for a todo item...
  var TodoView = Parse.View.extend({

    //... is a list tag.
    tagName:  "li",

    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),

    // The DOM events specific to an item.
    events: {
      "click .finishBtn"              	: "toggleDone",
      "click .view"             		: "popup",
      //"dblclick label.todo-content" 	: "edit",
      //"click .todo-destroy"   			: "clear",
      //"keypress .edit"      			: "updateOnEnter",
      //"blur .edit"          			: "close"
    },
	
    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a Todo and a TodoView in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
 //     _.bindAll(this, 'render', 'close', 'remove');
      _.bindAll(this, 'render', 'remove');
      this.model.bind('change', this.render);
      this.model.bind('destroy', this.remove);
    },
	
	popup: function() {
		//alert("pop");
		
		alert(this.model.get('moreInfo'));		

	},
	
    // Re-render the contents of the todo item.
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      //this.input = this.$('.edit');
	  
	  // $('.sortable').sortable(); // MK added (jquery.sortable.js) - may be nice at some point to manually sort items...
	  
//		if (this.model.get('QR')===true) {
//			this.$(".unique").val(this.model.get('uniqueID')); //uniqueID
//			//console.log(this.model.get('content'));
//		}
		
	  //MK added - assigns classes to items flagged "true" in Parse for styling and JS hooks.
		var classes = {
         	"done": "completed",
        	"assigned": "assigned",
   			"QR": "qr",
		};
	
		for (var key in classes) {
			if (classes.hasOwnProperty(key)) {
				if (this.model.get(key)===true) {
					if (key==="done") {
						$(this.el).addClass(classes[key]);
						break; // only add "completed" class and break out of loop
					}
					else if (key==="QR") {
						this.$(".unique").val(this.model.get('uniqueID'));	//assign hidden input value to Parse uniqueID value
						$(this.el).addClass(classes[key]);
					}
					else {
						$(this.el).addClass(classes[key]);
					}
				}
			}
		}
		
		if (this.model.get('assigned')===false) { // MK - I could also add a column in Parse for manual items, I suppose...
			if (this.model.get('done')===false) {
//				var manualCheck = document.createElement('input');
//				$('div.view').append(manualCheck);
				$('<input>').attr({type:'checkbox', class:'finishBtn'}).appendTo(this.el);
				//$(this.el).addClass("finishBtn");
			}
		}

		
//		if (this.model.get('done')===true) { 
//			$(this.el).addClass("completed");
//		}		
//		if (this.model.get('assigned')===true) { 
//			$(this.el).addClass("assigned");
//		}
		
	  //MK added - disables manual completion of assigned items
//		if (this.model.get('assigned')===true || this.model.get('done')===true) { 
//			this.$('.finishBtn').remove();
//			this.$('.todo-destroy').remove();
//		}
//		else {}	

		//MK added - converts URLs in strings to actual links using Autolinker.js
		var autolinker = new Autolinker( {
			newWindow : true,
			truncate  : 30,
			className : "autolinks"
		} );
		
		var listContent = $(this.el).html();
		listContent = autolinker.link( listContent );
		$(this.el).html(listContent);
		//console.log($(this.el).html());
		
      return this;
    }, // end render function
	
    // Toggle the `"done"` state of the model.
    toggleDone: function() {
   		this.model.finish();
		$(this.el).removeClass('assigned');
		
		//this.model.tincanCreate();
    },

    // Switch this view into `"editing"` mode, displaying the input field.
//    edit: function() {
//		if (this.model.get('assigned')===false) { //MK added to allow editing manual items, but disable for assigned items
//	      $(this.el).addClass("editing");
//    	  this.input.focus();
//		}
//		else {}
//    },

    // Close the `"editing"` mode, saving changes to the todo.
//    close: function() {
//      this.model.save({content: this.input.val()});
//      $(this.el).removeClass("editing");
//    },

    // If you hit `enter`, we're through editing the item.
//    updateOnEnter: function(e) {
//      if (e.keyCode == 13) this.close();
//    },

    // Remove the item, destroy the model.
//    clear: function() {
//      this.model.destroy();
//    },

  });

  // The Application
  // ---------------

  // The main view that lets a user manage their todo items
  var ManageTodosView = Parse.View.extend({

    // Our template for the line of statistics at the bottom of the app.
    statsTemplate: _.template($('#stats-template').html()),

    // Delegated events for creating new items, and clearing completed ones.
    events: {
	  "click #startScan"		: "scanQR", // MK added
	  "click #refreshBtn"		: "refreshData", // MK added
      //"keypress #new-todo"		: "createOnEnter",
      //"click #clear-completed"	: "clearCompleted",
      //"click #toggle-all"		: "toggleAllComplete",
      "click .log-out"			: "logOut",
      "click ul#filters a"		: "selectFilter"
    },

    el: ".content",

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved to Parse.
    initialize: function() {
      var self = this;

//      _.bindAll(this, 'scanQR', 'refreshData', 'addOne', 'addAll', 'addSome', 'render', 'toggleAllComplete', 'logOut', 'createOnEnter');
      _.bindAll(this, 'scanQR', 'refreshData', 'addOne', 'addAll', 'addSome', 'render', 'logOut');

      // Main todo management template
      this.$el.html(_.template($("#manage-todos-template").html()));
      
	  $('.title h1').html(Parse.User.current().attributes.username + "'s checklist");
	  
      //this.input = this.$("#new-todo");
      //this.allCheckbox = this.$("#toggle-all")[0];

      // Create our collection of Todos
      this.todos = new TodoList;

      // Setup the query for the collection to look for todos from the current user
      this.todos.query = new Parse.Query(Todo);
      this.todos.query.equalTo("user", Parse.User.current());
        
      this.todos.bind('add',     this.addOne);
      this.todos.bind('reset',   this.addAll);
      this.todos.bind('all',     this.render);

      // Fetch all the todo items for this user
      this.todos.fetch();
	  
      state.on("change", this.filter, this);
	  
	  // MK NFC test
				
				
    }, // end initialize

	//MK added QR scanning
	scanQR: function() {
		if (!window.cordova) {alert("nope")}
		cordova.plugins.barcodeScanner.scan(
			function (result) {
				var scanQRText = result.text,
					qrListItem = this.$(".qr p").addClass('finishBtn'),
					//qrItems = this.$(".qr .todo-content");
					qrItems = this.$(".qr .unique");
					//alert(qrListItem);
				for (i=0; i < qrItems.length; i++) {
					//var qrItemText = qrItems[i].innerHTML;
					var qrItemText = qrItems[i].value;
					if (scanQRText === qrItemText) {
						qrListItem[i].click();
						
					}				
				};
			}, 
			function (error) { alert("Scanning failed: " + error); }		
		);
	},	
	
	refreshData: function() {
		this.initialize();
	},
	
    // Logs out the user and shows the login view
    logOut: function(e) {
      Parse.User.logOut();
      new LogInView();
      this.undelegateEvents();
      delete this;
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      var done = this.todos.done().length;
      var remaining = this.todos.remaining().length;

      this.$('#todo-stats').html(this.statsTemplate({
        total:      this.todos.length,
        done:       done,
        remaining:  remaining
      }));

      this.delegateEvents();

      //this.allCheckbox.checked = !remaining;
    },

    // Filters the list based on which type of filter is selected
    selectFilter: function(e) {
      var el = $(e.target);
      var filterValue = el.attr("id");
      state.set({filter: filterValue});
      Parse.history.navigate(filterValue);
    },

    filter: function() {
      var filterValue = state.get("filter");
      this.$("ul#filters a").removeClass("selected");
      this.$("ul#filters a#" + filterValue).addClass("selected");
      if (filterValue === "all") {
        this.addAll();
      } else if (filterValue === "completed") {
        this.addSome(function(item) { return item.get('done') });
      } else {
        this.addSome(function(item) { return !item.get('done') });
      }
    },

    // Resets the filters to display all todos
    resetFilters: function() {
      this.$("ul#filters a").removeClass("selected");
      this.$("ul#filters a#all").addClass("selected");
      this.addAll();
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(todo) {
      var view = new TodoView({model: todo});
      this.$("#todo-list").append(view.render().el);
    },

    // Add all items in the Todos collection at once.
    addAll: function(collection, filter) {
      this.$("#todo-list").html("");
      this.todos.each(this.addOne);
    },

    // Only adds some todos, based on a filtering function that is passed in
    addSome: function(filter) {
      var self = this;
      this.$("#todo-list").html("");
      this.todos.chain().filter(filter).each(function(item) { self.addOne(item) });
    },

    // If you hit return in the main input field, create new Todo model
//    createOnEnter: function(e) {
//      var self = this;
//	  var username = Parse.User.current().attributes.username; //MK added
//      if (e.keyCode != 13) return;
//
//      this.todos.create({
//		assigned:  false, //MK added
//		name: 	 username, //MK added
//        content: this.input.val(),
//        order:   this.todos.nextOrder(),
//        done:    false,
//        user:    Parse.User.current(),
//        ACL:     new Parse.ACL(Parse.User.current())
//      });
//
//      this.input.val('');
//      this.resetFilters();
//    },

    // Clear all done todo items, destroying their models.
//    clearCompleted: function() {
//      _.each(this.todos.done(), function(todo){ todo.destroy(); });
//      return false;
//    },
//
//    toggleAllComplete: function () {
////      var done = this.allCheckbox.checked;
////      this.todos.each(function (todo) { todo.save({'done': done}); });
//    }
  });

  var LogInView = Parse.View.extend({
    events: {
      "submit form.login-form": "logIn",
      "submit form.signup-form": "signUp"
    },

    el: ".content",
    
    initialize: function() {
      _.bindAll(this, "logIn", "signUp");
      this.render();
    },

    logIn: function(e) {
      var self = this;
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();
      
      Parse.User.logIn(username, password, {
        success: function(user) {
          new ManageTodosView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".login-form .error").html("Invalid username or password. Please try again.").show();
          self.$(".login-form button").removeAttr("disabled");
        }
      });

      this.$(".login-form button").attr("disabled", "disabled");

      return false;
    },

    signUp: function(e) {
      var self = this;
      var username = this.$("#signup-username").val();
      var email = this.$("#signup-email").val(); // MK added
      var password = this.$("#signup-password").val();
	  
//	  user = new Parse.User();
//	  user.set("email", email);
      
//    Parse.User.signUp(username, password, { ACL: new Parse.ACL() }, {
      Parse.User.signUp(username, password, { email: email }, {
        success: function(user) {
          new ManageTodosView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".signup-form .error").html(_.escape(error.message)).show();
          self.$(".signup-form button").removeAttr("disabled");
        }
      });

      this.$(".signup-form button").attr("disabled", "disabled");

      return false;
    },

    render: function() {
      this.$el.html(_.template($("#login-template").html()));
      this.delegateEvents();
    }
  });

  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#todoapp"),

    initialize: function() {
      this.render();
    },

    render: function() {
      if (Parse.User.current()) {
		//currentUser = Parse.User.current().attributes.username;  
        new ManageTodosView();
      } else {
        new LogInView();
      }
    }
  });

  var AppRouter = Parse.Router.extend({
    routes: {
      "all": "all",
      "active": "active",
      "completed": "completed"
    },

    initialize: function(options) {
    },

    all: function() {
      state.set({ filter: "all" });
    },

    active: function() {
      state.set({ filter: "active" });
    },

    completed: function() {
      state.set({ filter: "completed" });
    }
  });

  var state = new AppState;

  new AppRouter;
  new AppView;
  Parse.history.start();
});
