(function() {

  function TodoItem(title, completed) {
    this.title = title;
    this.completed = completed;
    this.id = this._getUuid();
  }

  TodoItem.prototype._getUuid = function() {
    var i, random,
      uuid = '';
    for ( i = 0; i < 32; i++ ) {
      random = Math.random() * 16 | 0;
      if ( i === 8 || i === 12 || i === 16 || i === 20 ) {
        uuid += '-';
      }
      uuid += ( i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random) ).toString( 16 );
    }
    return uuid;
  };

  function TodoItemCollection() {
    this.todoListItems = [];
    this.changeObservers = [];
    this._load();
    return this;
  }

  TodoItemCollection.prototype.onChange = function(fun) {
    this.changeObservers.push(fun);
  };

  TodoItemCollection.prototype.changed = function() {
    var i,l;
    for(i=0,l=this.changeObservers.length;i<l;i++) {
      this.changeObservers[i]();
    }
  };

  TodoItemCollection.prototype.size = function() {
    return this.todoListItems.length;
  };

  TodoItemCollection.prototype.each = function(fun) {
    _(this.todoListItems).each(fun, this);
  };

  TodoItemCollection.prototype.eachFiltered = function(filter, fun) {
    _(this.todoListItems).chain().select(function(todo) {
      return ((filter === 'all') || (filter === 'completed' && todo.completed) || 
        (filter === 'active' && !todo.completed)) 
    }).each(fun, this);
  };

  TodoItemCollection.prototype.completedItems = function() {
    return _(this.todoListItems).select(function(item) {
      return item.completed;
    }).length
  };

  TodoItemCollection.prototype.incompleteItems = function() {
    return this.size() - this.completedItems();
  };

  TodoItemCollection.prototype.add = function (title) {
    console.log(title);
    this.todoListItems.push(new TodoItem(title, false));
    this.save();
  };

  TodoItemCollection.prototype.save = function() {
    localStorage.setItem('todo-list', JSON.stringify(this.todoListItems));
    this.changed();
  };

  TodoItemCollection.prototype._migrateData = function() {
    var i,l;
    this.each(function(item, i) {
      if (typeof(item) === 'string') {
        this.todoListItems[i] = new TodoItem(item, false);
      }
      if (typeof(item.id) === 'undefined') {
        this.todoListItems[i] = new TodoItem(item.title, item.completed);
      }
    });
  };

  TodoItemCollection.prototype._load = function() {
    var stored = localStorage.getItem('todo-list');
    if (stored) {
      this.todoListItems = JSON.parse(stored);
      this._migrateData();
    }
    this.changed();
  };

  TodoItemCollection.prototype.getById = function(id) {
    return _(this.todoListItems).find(function(item) {
      return (item.id === id);
    })
  };
  
  TodoItemCollection.prototype.getIndexById = function(id) {
    for(i=0,l=this.todoListItems.length;i<l;i++) {
      var item = this.todoListItems[i];
      if (item.id == id) return i;
    }
    return -1;
  };

  TodoItemCollection.prototype.updateText = function(id, text) {
    if (text === '') {
      this.destroy(id);
      return;
    }
    var todo = this.getById(id);
    if(todo) {
      todo.title = text;
      this.save();
    }
  };
  TodoItemCollection.prototype.updateStatus = function(id, status) {
    var todo = this.getById(id);
    if(todo) {
      todo.completed = status;
      this.save();
    }
  };

  TodoItemCollection.prototype.destroy = function(id) {
    var index = this.getIndexById(id);
    if (index > -1) {
      this.todoListItems.splice(index, 1);
      this.save();
    }
  };

  TodoItemCollection.prototype.toggleAll = function(status) {
    this.each(function(item) {
      item.completed = status;
    });
    this.save();
  };

  TodoItemCollection.prototype.clearCompleted = function(status) {
    this.todoListItems = _(this.todoListItems).filter(function(item) {
      return !item.completed
    });
    this.save();
  };

  function TodoView(collection) {
    this.collection = collection;
    // binding all event handlers to this object
    _(this).bindAll(
      '_onCheckboxChange',
      '_onEditItem',
      '_onEditItemEnd',
      '_onInputEditItemKeypress',
      '_onDeleteClick',
      '_onRemoveAllCompleted',
      '_onToggleAll',
      '_onNewTodoKeyPress',
      'render'
    );
    // binding to the collection change event
    this.collection.onChange(this.render);
    // binding global UI event handlers
    $('#toggle-all').change(this._onToggleAll);
    $('#new-todo').keypress(this._onNewTodoKeyPress);
    $(window).on('hashchange', this.render);

    this.render();
  }

  TodoView.prototype.render = function() {
    this._renderList();
    this._renderFooter();
  };
  
  TodoView.prototype._currentFilter = function() {
    var filter = "all";
    if (
      location.hash !== '' &&
      location.hash.match(/^#(all|completed|active)$/)
    ) {
      filter = location.hash.substr(1);
    }
    return filter;
  };

  TodoView.prototype._createTodoItemElement = function(todo) {
      window.renderedTemplate = _.template($('#item-template').text(), todo);
      var item = $(_.template($('#item-template').html(), todo).trim());
      item.on('change', "input[type='checkbox']", this._onCheckboxChange);
      item.on('dblclick', "label", this._onEditItem);
      item.on('click', "button.destroy", this._onDeleteClick);      
      return item;
  };

  TodoView.prototype._renderList = function() {
    var filter = this._currentFilter();
    var list = $('#todo-list');
    list.html('');
    var _this = this;
    this.collection.eachFiltered(filter, function(todo) {
      list.append(_this._createTodoItemElement(todo));
    });
    $('#toggle-all').attr('checked', (this.collection.incompleteItems() === 0));
  };

  TodoView.prototype._renderFooter = function() {
    var len = this.collection.size();
    var completed = this.collection.completedItems();
    var footer = $('#footer');
    var filter = this._currentFilter();
    var incomplete = len - completed;
    footer.html(_.template($('#footer-template').html(), {
      incomplete: incomplete,
      completed: completed,
      itemsPluralForm: (incomplete == 1) ? "item" : "items",
      showFilters: len > 0 && (completed > 0),
      filters: [
        {name: 'All', value: 'all', className: filter === 'all' ? 'selected' : '' },
        {name: 'Active', value: 'active', className: filter === 'active' ? 'selected' : '' },
        {name: 'Completed', value: 'completed', className: filter === 'completed' ? 'selected' : '' }
      ]
    }).trim());
    footer.on('click', '#clear-completed', this._onRemoveAllCompleted);
  };

  TodoView.prototype._onCheckboxChange = function(event) {
    var checkbox = event.target;
    var id = $(checkbox).data('todo-id');
    this.collection.updateStatus(id, checkbox.checked);
  };

  TodoView.prototype._onEditItem = function(event) {
    var label = $(event.target);
    var id = label.data('todo-id');
    var todo = this.collection.getById(id);
    var li = $('#li_' + id);
    var input = $(_.template($('#edit-template').html(), todo).trim());
    $(input).on('keypress', this._onInputEditItemKeypress);
    $(input).on('blur', this._onEditItemEnd);
    li.append(input);
    li.addClass("editing");
    input.focus();
  };

  TodoView.prototype._onEditItemEnd = function(event) {
    var input = $(event.target);
    var text = input.val().trim();
    var id = input.data('todo-id');
    this.collection.updateText(id, text);
  };

  TodoView.prototype._onInputEditItemKeypress = function(event) {
    if (event.keyCode === 13) this._onEditItemEnd(event);
  };

  TodoView.prototype._onDeleteClick = function(event) {
    var button = $(event.target);
    var id = button.data('todo-id');
    this.collection.destroy(id);
  };

  TodoView.prototype._onToggleAll = function(event) {
    var toggle = event.target;
    this.collection.toggleAll(toggle.checked);
  };

  TodoView.prototype._onRemoveAllCompleted = function(event) {
    this.collection.clearCompleted();
  };

  TodoView.prototype._onNewTodoKeyPress = function(event) {
    if (event.keyCode === 13) {
      var todoField = $('#new-todo');
      var text = todoField.val().trim();
      if (text !== '') {
        this.collection.add(text);
        todoField.val("");
      }
    }
  };
  window.addEventListener('load', windowLoadHandler, false);
  function windowLoadHandler() {
    todoItemCollection = new TodoItemCollection();
    view = new TodoView(todoItemCollection);
  }
}());
