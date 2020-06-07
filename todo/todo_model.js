const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const schemaTodo = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  dateCreated: { type: Date, default: Date.now },
  dateUpdated: { type: Date },
});

schemaTodo.set("toJSON", {
  virtuals: true,
  versionKey: false,
});

module.exports = mongoose.model("Todo", schemaTodo);
