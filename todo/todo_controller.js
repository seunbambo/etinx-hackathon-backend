const express = require("express");
const router = express.Router();
const Joi = require("@hapi/joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const todoService = require("./todo_service");
const userService = require("../users/user_service");

// routes
router.get("/", getAll);
router.get("/:id", authorize(), getById);
router.post("/", authorize(), createSchema, create);
router.put("/:id", authorize(), updateSchema, update);
router.delete("/:id", authorize(), _delete);

module.exports = router;

function authenticateSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function getAll(req, res, next) {
  todoService
    .getAll()
    .then((todos) => res.json(todos))
    .catch((err) => next(err));
}

function getById(req, res, next) {
  // todos can get their own todo and admins can get any todo
  if (req.params.id !== req.todo.id && req.todo.role !== Role.Admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  todoService
    .getById(req.params.id)
    .then((todo) => (todo ? res.json(todo) : res.sendStatus(404)))
    .catch((err) => next(err));
}

function createSchema(req, res, next) {
  const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    duration: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function create(req, res, next) {
  todoService
    .create(req.body)
    .then((todo) => res.json(todo))
    .catch((err) => next(err));
}

function updateSchema(req, res, next) {
  const schemaRules = {
    title: Joi.string().required(),
    description: Joi.string().required(),
    duration: Joi.number().required(),
  };

  const schema = Joi.object(schemaRules).with("password", "confirmPassword");
  validateRequest(req, next, schema);
}

function update(req, res, next) {
  // // todos can update their own todo and admins can update any todo
  // if (req.params.id !== req.todo.id && req.todo.role !== Role.Admin) {
  //   return res.status(401).json({ message: "Unauthorized" });
  // }

  todoService
    .update(req.params.id, req.body)
    .then((todo) => res.json(todo))
    .catch((err) => next(err));
}

function _delete(req, res, next) {
  // todos can delete their own todo and admins can delete any todo
  if (req.params.id !== req.todo.id && req.todo.role !== Role.Admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  todoService
    .delete(req.params.id)
    .then(() => res.json({ message: "Todo deleted successfully" }))
    .catch((err) => next(err));
}
