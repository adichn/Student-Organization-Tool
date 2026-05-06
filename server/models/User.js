import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

// Hash before every save that touches the password field
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method — never expose the raw hash; use this to compare
UserSchema.methods.matchPassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default model("User", UserSchema);
