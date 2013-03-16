(function() {

  var todoListItems = [];

  function TodoItem(title, completed) {
    function getUuid() {
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
    }
    this.title = title;
    this.completed = completed;
    this.id = getUuid();
  }

  function completedItems() {
    var i, l, complete = 0;
    for(i = 0, l = todoListItems.length; i < l; i++) {
      if(todoListItems[i].completed) complete++;
    }
    return complete;
  }

  function incompleteItems() {
    return todoListItems.length - completedItems();
  }

  // render support functions

  function createTextElement(el, text) {
    var element = document.createElement(el);
    element.appendChild(document.createTextNode(text));
    return element;
  }

  function createTodoItemElement(todo) {
      var item = document.createElement("li");
      item.id = "li_" + todo.id;
      if (todo.completed) {
        item.className += "completed";
      }
      // checkbox
      var checkbox = document.createElement('input');
      checkbox.className = "toggle";
      checkbox.type = "checkbox";
      checkbox.addEventListener('change', checkboxChangeHandler);
      checkbox.checked = todo.completed;
      checkbox.setAttribute('data-todo-id', todo.id);

      // label
      var label = createTextElement('label', todo.title);
      label.addEventListener('dblclick', editItemHandler);
      label.setAttribute('data-todo-id', todo.id);

      // delete button
      deleteButton = document.createElement('button');
      deleteButton.className = 'destroy';
      deleteButton.setAttribute('data-todo-id', todo.id);
      deleteButton.addEventListener('click', deleteClickHandler);

      // div wrapper
      var divDisplay = document.createElement('div');
      divDisplay.className = "view";
      divDisplay.appendChild(checkbox);
      divDisplay.appendChild(label);
      divDisplay.appendChild(deleteButton);

      item.appendChild(divDisplay);
      return item;
  }

  function shouldShowItem(todo, filter) {
    return (filter === 'completed' && todo.completed) || 
    (filter === 'active' && !todo.completed);
  }

  function renderList() {
    var i;
    var len = todoListItems.length;
    var filter = currentFilter();
    var list = document.getElementById('todo-list');
    list.innerHTML="";
    for(i=0;i<len;i++) {
      var todo = todoListItems[i];
      if (!shouldShowItem(todo, filter)) continue;
      list.appendChild(createTodoItemElement(todo));
    }
    document.getElementById('toggle-all').checked = (incompleteItems() === 0);
  }

  function createTodoStats(incomplete) {
    var todoCount = document.createElement('span');
    todoCount.id = "todo-count";
    var count = createTextElement('strong', incomplete);
    todoCount.appendChild(count);
    var items = (incomplete == 1) ? "item" : "items";
    todoCount.appendChild(
      document.createTextNode(" " + items + " left")
    );
    return todoCount;
  }

  function createFilter(name, value, current) {
    var filter = document.createElement("li");
    var filterLink = createTextElement('a', name);
    filterLink.href="#" + value;
    if (current == value) filterLink.className = "selected";
    filter.appendChild(filterLink);
    return filter;
  }

  function createFilters(filter) {
    var filterList = document.createElement('ul');
    filterList.id = "filters";
    filterList.appendChild(createFilter('All', 'all', filter));
    filterList.appendChild(createFilter('Active', 'active', filter));
    filterList.appendChild(createFilter('Completed', 'completed', filter));
    return filterList;
  }

  function createClearCompletedButton(completed) {
      var button = createTextElement('button',
        "Clear completed (" + completed + ")"
      );
      button.id = 'clear-completed';
      button.addEventListener('click',
        removeAllCompletedHandler, false);
      return button;
  }

  function renderFooter() {
    var len = todoListItems.length;
    var completed = completedItems();
    var footer = document.getElementById('footer');
    footer.innerHTML = "";
    footer.appendChild(createTodoStats(len - completed));
    if (len > 0 && (completed > 0)) {
      footer.appendChild(createFilters(currentFilter()));
      footer.appendChild(createClearCompletedButton(completed));
    }
  }

  function currentFilter() {
    var filter = "all";
    if (
      location.hash !== '' &&
      location.hash.match(/^#(all|completed|active)$/)
    ) {
      filter = location.hash.substr(1);
    }
    return filter;
  }

  function redrawList() {
    renderList();
    renderFooter();
  }

  function addToList(title) {
    var todo = new TodoItem(title, false);
    todoListItems.push(todo);
    saveList();
  }

  function migrateData() {
    var i,l;
    for (i=0,l=todoListItems.length;i<l;i++) {
      item = todoListItems[i];
      if (typeof(item) === 'string') {
        todoListItems[i] = new TodoItem(item, false);
      }
      if (typeof(item.id) === 'undefined') {
        todoListItems[i] = new TodoItem(item.title, item.completed);
      }
    }
  }

  function reloadList(item) {
    var stored = localStorage.getItem('todo-list');
    if (stored) {
      todoListItems = JSON.parse(stored);
      migrateData();
    }
    redrawList();
  }

  function getTodoById(id) {
    var i,l;
    for(i=0,l=todoListItems.length;i<l;i++) {
      if (todoListItems[i].id == id) return todoListItems[i];
    }
    return null;
  }
  function getTodoIndexById(id) {
    var i,l;
    for(i=0,l=todoListItems.length;i<l;i++) {
      if (todoListItems[i].id == id) return i;
    }
    return -1;
  }

  function editTodo(id, text) {
    var todo = getTodoById(id);
    if(todo) {
      todo.title = text;
      saveList();
      redrawList();
    }
  }
  function deleteTodo(id) {
    var index = getTodoIndexById(id);
    if (index > -1) {
      todoListItems.splice(index, 1);
      saveList();
      redrawList();
    }
  }
  function saveList() {
    localStorage.setItem('todo-list', JSON.stringify(todoListItems));
  }

  function checkboxChangeHandler(event) {
    var checkbox = event.target;
    var id = checkbox.getAttribute('data-todo-id');
    var todo = getTodoById(id);
    todo.completed = checkbox.checked;
    saveList();
    redrawList();
  }
  function editItemHandler(event) {
    var label = event.target;
    var id = label.getAttribute('data-todo-id');
    var todo = getTodoById(id);
    var li = document.getElementById('li_' + id);
    var input = document.createElement('input');
    input.setAttribute('data-todo-id', id);
    input.className = "edit";
    input.value = todo.title;
    input.addEventListener('keypress', inputEditItemKeypressHandler);
    input.addEventListener('blur', inputEditItemBlurHandler);
    li.appendChild(input);
    li.className = "editing";
    input.focus();
  }
  function inputEditItemKeypressHandler(event) {
    if (event.keyCode === 13) {
      var input = event.target;
      var text = input.value.trim();
      var id = input.getAttribute('data-todo-id');
      if (text === '') {
        deleteTodo(id);
      } else {
        editTodo(id, text);
      }
    }
  }
  function inputEditItemBlurHandler(event) {
    var input = event.target;
    var text = input.value.trim();
    var id = input.getAttribute('data-todo-id');
    if (text === '') {
      deleteTodo(id);
    } else {
      editTodo(id, text);
    }
  }

  function deleteClickHandler(event) {
    var button = event.target;
    var id = button.getAttribute('data-todo-id');
    deleteTodo(id);
  }

  function toggleAllHandler(event) {
    var i,l;
    var toggle = event.target;
    for(i=0,l=todoListItems.length;i<l;i++) {
      todoListItems[i].completed = toggle.checked;
    }
    saveList();
    redrawList();
  }

  function removeAllCompletedHandler(event) {
    var i,l;
    var newList = [];
    var toggle = event.target;
    for(i=0,l=todoListItems.length;i<l;i++) {
      if (!todoListItems[i].completed) {
        newList.push(todoListItems[i]);
      }
    }
    todoListItems = newList;
    saveList();
    redrawList();
  }

  function newTodoKeyPressHandler(event) {
    if (event.keyCode === 13) {
      var todoField = document.getElementById('new-todo');
      var text = todoField.value.trim();
      if (text !== '') {
        addToList(todoField.value);
        redrawList();
        todoField.value = "";
      }
    }
  }

  window.addEventListener('load', windowLoadHandler, false);
  function windowLoadHandler() {
    reloadList();
    document.getElementById('toggle-all').addEventListener('change', toggleAllHandler, false);
    document.getElementById('new-todo').addEventListener('keypress', newTodoKeyPressHandler, false);
    window.addEventListener('hashchange', redrawList, false);
  }
}());
