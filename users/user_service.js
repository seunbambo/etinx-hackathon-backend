const config = require("config.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const sendEmail = require("_helpers/send-email");
const db = require("_helpers/db");
const Role = require("_helpers/role");
const User = db.User;

module.exports = {
  authenticate,
  register,
  verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getAll,
  getById,
  create,
  update,
  delete: _delete,
};

async function authenticate({ email, password }) {
  const user = await User.findOne({ email, isVerified: true });
  if (user && bcrypt.compareSync(password, user.passwordHash)) {
    // return basic details and auth token
    const token = jwt.sign({ sub: user.id, id: user.id }, config.secret);
    return { ...basicDetails(user), token };
  }
}

async function register(params, origin) {
  // validate
  if (await User.findOne({ email: params.email })) {
    // send already registered error in email to prevent user enumeration
    return sendAlreadyRegisteredEmail(params.email, origin);
  }

  // create user object
  const user = new User(params);

  // first registered user is an admin
  const isFirstUser = (await User.countDocuments({})) === 0;
  user.role = isFirstUser ? Role.Admin : Role.User;
  user.verificationToken = generateToken();
  user.isVerified = false;

  // hash password
  if (params.password) {
    user.passwordHash = hash(params.password);
  }

  // save user
  await user.save();

  // send email
  sendVerificationEmail(user, origin);
}

async function verifyEmail({ token }) {
  const user = await User.findOne({ verificationToken: token });

  if (!user) throw "Verification failed";

  user.isVerified = true;
  await user.save();
}

async function forgotPassword({ email }, origin) {
  const user = await User.findOne({ email });

  // always return ok response to prevent email enumeration
  if (!user) return;

  // create reset token that expires after 24 hours
  user.resetToken = generateToken();
  user.resetTokenExpiry = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  ).toISOString();
  user.save();

  // send email
  sendPasswordResetEmail(user, origin);
}

async function validateResetToken({ token }) {
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) throw "Invalid token";
}

async function resetPassword({ token, password }) {
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: new Date() },
  });

  if (!user) throw "Invalid token";

  // update password and remove reset token
  user.passwordHash = hash(password);
  user.isVerified = true;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();
}

async function getAll() {
  const users = await User.find();
  return users.map((x) => basicDetails(x));
}

async function getById(id) {
  const user = await getUser(id);
  return basicDetails(user);
}

async function create(params) {
  // validate
  if (await User.findOne({ email: params.email })) {
    throw 'Email "' + params.email + '" is already registered';
  }

  const user = new User(params);
  user.isVerified = true;

  // hash password
  if (params.password) {
    user.passwordHash = hash(params.password);
  }

  // save user
  await user.save();

  return basicDetails(user);
}

async function update(id, params) {
  const user = await getUser(id);

  // validate
  if (
    user.email !== params.email &&
    (await User.findOne({ email: params.email }))
  ) {
    throw 'Email "' + params.email + '" is already taken';
  }

  // hash password if it was entered
  if (params.password) {
    params.passwordHash = hash(params.password);
  }

  // copy params to user and save
  Object.assign(user, params);
  user.dateUpdated = Date.now();
  await user.save();

  return basicDetails(user);
}

async function _delete(id) {
  const user = await getUser(id);
  await user.remove();
}

// helper functions

async function getUser(id) {
  if (!db.isValidId(id)) throw "User not found";
  const user = await User.findById(id);
  if (!user) throw "User not found";
  return user;
}

function hash(password) {
  return bcrypt.hashSync(password, 10);
}

function generateToken() {
  return crypto.randomBytes(40).toString("hex");
}

function basicDetails(user) {
  const {
    id,
    title,
    firstName,
    lastName,
    email,
    role,
    dateCreated,
    dateUpdated,
  } = user;
  return {
    id,
    title,
    firstName,
    lastName,
    email,
    role,
    dateCreated,
    dateUpdated,
  };
}

function sendVerificationEmail(user, origin) {
  let message;
  if (origin) {
    const verifyUrl = `${origin}/user/verify-email?token=${user.verificationToken}`;
    message = `<p>Please click the below link to verify your email address:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  } else {
    message = `<p>Please use the below token to verify your email address with the <code>/user/verify-email</code> api route:</p>
                   <p><code>${user.verificationToken}</code></p>`;
  }

  sendEmail({
    to: user.email,
    subject: "Sign-up Verification API - Verify Email",
    html: `<h4>Verify Email</h4>
               <p>Thanks for registering!</p>
               ${message}`,
  });
}

function sendAlreadyRegisteredEmail(email, origin) {
  let message;
  if (origin) {
    message = `<p>If you don't know your password please visit the <a href="${origin}/user/forgot-password">forgot password</a> page.</p>`;
  } else {
    message = `<p>If you don't know your password you can reset it via the <code>/user/forgot-password</code> api route.</p>`;
  }

  sendEmail({
    to: email,
    subject: "Sign-up Verification API - Email Already Registered",
    html: `<h4>Email Already Registered</h4>
               <p>Your email <strong>${email}</strong> is already registered.</p>
               ${message}`,
  });
}

function sendPasswordResetEmail(user, origin) {
  let message;
  if (origin) {
    const resetUrl = `${origin}/user/reset-password?token=${user.resetToken}`;
    message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
  } else {
    message = `<p>Please use the below token to reset your password with the <code>/user/reset-password</code> api route:</p>
                   <p><code>${user.resetToken}</code></p>`;
  }

  sendEmail({
    to: user.email,
    subject: "Sign-up Verification API - Reset Password",
    html: `<h4>Reset Password Email</h4>
               ${message}`,
  });
}
