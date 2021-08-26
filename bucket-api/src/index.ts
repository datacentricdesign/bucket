import { Bucket } from "./Bucket";
import { Log } from "./Logger";

const bucket = new Bucket();
bucket.start();

process.on("SIGTERM", () => {
  bucket.stop().then(() => {
    Log.info("Bucket API Grafully stopped.");
    process.exit();
  });
});

process.on("SIGINT", () => {
  bucket.stop().then(() => {
    Log.info("Bucket API Grafully stopped.");
    process.exit();
  });
});
