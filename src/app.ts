import express from "express";
import passport from "passport";
import { apiRouters } from "./shared/infra/http/routers";
import * as loaders from "./loaders";
import UserModel from "./shared/infra/database/mongodb/user.model";

const cors = require("cors");

export const app = express();
app.use(cors());
app.use(express.json());

const secret = process.env.SESSION_SECRET;
const expressSession = require("express-session")({
  secret,
  resave: false,
  saveUninitialized: false,
});

app.use(expressSession);

loaders.bootstrap("Node Backend App");

app.use(passport.initialize());
app.use(passport.session());

passport.use(UserModel.createStrategy());
passport.serializeUser(UserModel.serializeUser());
passport.deserializeUser(UserModel.deserializeUser());

app.use("/", apiRouters);
