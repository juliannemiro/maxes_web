import * as dotenv from 'dotenv';
import * as path from 'path';

const nodeEnv = process.env.NODE_ENV || "development";
const entorno = process.env.APP_ENV || (nodeEnv === "production" ? "produccion" : "desarrollo");

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });

const archivoEntorno =
    entorno === "produccion"
        ? path.resolve(__dirname, "../.env.produccion")
        : path.resolve(__dirname, "../.env.desarrollo");

dotenv.config({ path: archivoEntorno, override: true });

if (process.env.APP_ENV === "local") {
    dotenv.config({ path: path.resolve(__dirname, "../.env.desarrollo"), override: true });
}

import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import cors from "cors";
import routes from "./routes/index";

const app = express();
const port = process.env.PORT || 4785;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const corsConfig = {
    credentials: true,
    origin: true,
};
app.use(cors(corsConfig));
app.use(helmet());

// Mount API routes
app.use("/", routes);

app.listen(port, () => {
    console.log(`Server started on port ${port} in ${nodeEnv} mode!`);
});
export default app;
