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
    var i, l;
    for(i = 0, l = this.size(); i < l; i++) {
      fun(this.todoListItems[i], i);
    }
  };

  TodoItemCollection.prototype.eachFiltered = function(filter, fun) {
    var i, l;
    this.each(function(todo, i) {
      if ((filter === 'all') || (filter === 'completed' && todo.completed) || 
        (filter === 'active' && !todo.completed)) {
          fun(todo, i);
      }
    });
  };

  TodoItemCollection.prototype.completedItems = function() {
    var complete = 0;
    this.each(function(item) {
      if(item.completed) complete++;
    });
    return complete;
  };

  TodoItemCollection.prototype.incompleteItems = function() {
    return this.size() - this.completedItems();
  };

  TodoItemCollection.prototype.add = function (title) {
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
    var i,l;
    for(i=0,l=this.todoListItems.length;i<l;i++) {
      var item = this.todoListItems[i];
      if (item.id == id) return item;
    }
    return null;
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
    var newList = [];
    this.each(function(item) {
      if (!item.completed) newList.push(item);
    });
    this.todoListItems = newList;
    todoItemCollection.save();
  };

  function TodoView(collection) {
    this.collection = collection;
    // binding all event handlers to this object
    this._onCheckboxChange = this._onCheckboxChange.bind(this);
    this._onEditItem = this._onEditItem.bind(this);
    this._onEditItemEnd = this._onEditItemEnd.bind(this);
    this._onInputEditItemKeypress = this._onInputEditItemKeypress.bind(this);
    this._onDeleteClick = this._onDeleteClick.bind(this);
    this._onRemoveAllCompleted = this._onRemoveAllCompleted.bind(this);
    this._onToggleAll = this._onToggleAll.bind(this);
    this._onNewTodoKeyPress = this._onNewTodoKeyPress.bind(this);
    this.render = this.render.bind(this);

    // binding to the collection change event
    this.collection.onChange(this.render);
    // binding global UI event handlers
    document.getElementById('toggle-all').addEventListener('change', this._onToggleAll, false);
    document.getElementById('new-todo').addEventListener('keypress', this._onNewTodoKeyPress, false);
    window.addEventListener('hashchange', this.render, false);
    this.render();
  }

  TodoView.prototype.render = function() {
    this._renderList();
    this._renderFooter();
  };
  TodoView.prototype._createTextElement = function (el, text) {
    var element = document.createElement(el);
    element.appendChild(document.createTextNode(text));
    return element;
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
      var item = document.createElement("li");
      item.id = "li_" + todo.id;
      if (todo.completed) {
        item.className += "completed";
      }
      var _this = this;
      // checkbox
      var checkbox = document.createElement('input');
      checkbox.className = "toggle";
      checkbox.type = "checkbox";
      checkbox.addEventListener('change', this._onCheckboxChange);
      checkbox.checked = todo.completed;
      checkbox.setAttribute('data-todo-id', todo.id);

      // label
      var label = this._createTextElement('label', todo.title);
      label.addEventListener('dblclick', this._onEditItem);
      label.setAttribute('data-todo-id', todo.id);

      // delete button
      deleteButton = document.createElement('button');
      deleteButton.className = 'destroy';
      deleteButton.setAttribute('data-todo-id', todo.id);
      deleteButton.addEventListener('click', this._onDeleteClick);

      // div wrapper
      var divDisplay = document.createElement('div');
      divDisplay.className = "view";
      divDisplay.appendChild(checkbox);
      divDisplay.appendChild(label);
      divDisplay.appendChild(deleteButton);

      item.appendChild(divDisplay);
      return item;
  };

  TodoView.prototype._renderList = function() {
    var filter = this._currentFilter();
    var list = document.getElementById('todo-list');
    list.innerHTML = "";
    var _this = this;
    this.collection.eachFiltered(filter, function(todo) {
      list.appendChild(_this._createTodoItemElement(todo));
    });
    document.getElementById('toggle-all').checked =
      (this.collection.incompleteItems() === 0);
  };

  TodoView.prototype._createTodoStats = function (incomplete) {
    var todoCount = document.createElement('span');
    todoCount.id = "todo-count";
    var count = this._createTextElement('strong', incomplete);
    todoCount.appendChild(count);
    var items = (incomplete == 1) ? "item" : "items";
    todoCount.appendChild(
      document.createTextNode(" " + items + " left")
    );
    return todoCount;
  };

  TodoView.prototype._createFilter = function(name, value, current) {
    var filter = document.createElement("li");
    var filterLink = this._createTextElement('a', name);
    filterLink.href="#" + value;
    if (current == value) filterLink.className = "selected";
    filter.appendChild(filterLink);
    return filter;
  };

  TodoView.prototype._createFilters = function(filter) {
    var filterList = document.createElement('ul');
    filterList.id = "filters";
    filterList.appendChild(this._createFilter('All', 'all', filter));
    filterList.appendChild(this._createFilter('Active', 'active', filter));
    filterList.appendChild(this._createFilter('Completed', 'completed', filter));
    return filterList;
  };

  TodoView.prototype._createClearCompletedButton = function(completed) {
      var button = this._createTextElement('button',
        "Clear completed (" + completed + ")"
      );
      button.id = 'clear-completed';
      button.addEventListener('click',
        this._onRemoveAllCompleted, false);
      return button;
  };

  TodoView.prototype._renderFooter = function() {
    var len = this.collection.size();
    var completed = this.collection.completedItems();
    var footer = document.getElementById('footer');
    footer.innerHTML = "";
    footer.appendChild(this._createTodoStats(len - completed));
    if (len > 0 && (completed > 0)) {
      footer.appendChild(this._createFilters(this._currentFilter()));
      footer.appendChild(this._createClearCompletedButton(completed));
    }
  };

  TodoView.prototype._onCheckboxChange = function(event) {
    console.log(this);
    var checkbox = event.target;
    var id = checkbox.getAttribute('data-todo-id');
    this.collection.updateStatus(id, checkbox.checked);
  };

  TodoView.prototype._onEditItem = function(event) {
    var label = event.target;
    var id = label.getAttribute('data-todo-id');
    var todo = this.collection.getById(id);
    var li = document.getElementById('li_' + id);
    var input = document.createElement('input');
    input.setAttribute('data-todo-id', id);
    input.className = "edit";
    input.value = todo.title;
    input.addEventListener('keypress', this._onInputEditItemKeypress);
    input.addEventListener('blur', this._onEditItemEnd);
    li.appendChild(input);
    li.className = "editing";
    input.focus();
  };

  TodoView.prototype._onEditItemEnd = function(event) {
    var input = event.target;
    var text = input.value.trim();
    var id = input.getAttribute('data-todo-id');
    this.collection.updateText(id, text);
  };

  TodoView.prototype._onInputEditItemKeypress = function(event) {
    if (event.keyCode === 13) this._onEditItemEnd(event);
  };

  TodoView.prototype._onDeleteClick = function(event) {
    var button = event.target;
    var id = button.getAttribute('data-todo-id');
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
      var todoField = document.getElementById('new-todo');
      var text = todoField.value.trim();
      if (text !== '') {
        this.collection.add(todoField.value);
        todoField.value = "";
      }
    }
  };
  window.addEventListener('load', windowLoadHandler, false);
  function windowLoadHandler() {
    todoItemCollection = new TodoItemCollection();
    view = new TodoView(todoItemCollection);
  }
}());
