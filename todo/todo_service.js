const config = require("config.json");
const db = require("_helpers/db");
const Todo = db.Todo;

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: _delete,
};

async function getAll() {
  const todos = await Todo.find();
  return todos.map((x) => basicDetails(x));
}

async function getById(id) {
  const todo = await getTodo(id);
  return basicDetails(todo);
}

async function create(params) {
  const todo = new Todo(params);

  // save todo
  await todo.save();

  return basicDetails(todo);
}

async function update(id, params) {
  const todo = await getTodo(id);

  // copy params to todo and save
  Object.assign(todo, params);
  todo.dateUpdated = Date.now();
  await todo.save();

  return basicDetails(todo);
}

async function _delete(id) {
  const todo = await getTodo(id);
  await todo.remove();
}

// helper functions

async function getTodo(id) {
  if (!db.isValidId(id)) throw "Todo not found";
  const todo = await Todo.findById(id);
  if (!todo) throw "Todo not found";
  return todo;
}

function basicDetails(todo) {
  const { id, title, description, duration, dateCreated, dateUpdated } = todo;
  return {
    id,
    title,
    description,
    duration,
    dateCreated,
    dateUpdated,
  };
}
