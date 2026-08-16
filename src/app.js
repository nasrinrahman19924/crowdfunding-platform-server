const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const routes = require("./routes");
const creditRoutes = require("./routes/credit.routes");
const reportRoutes = require("./routes/report.routes");


const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Crowdfunding Platform API is running 🚀");
});

app.use("/api", routes);
app.use("/api/credits", creditRoutes);
app.use("/api/reports", reportRoutes);

module.exports = app;
