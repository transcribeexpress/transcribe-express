import { readFileSync } from "fs";
import { storagePut } from "./server/storage.ts";

const fileBuffer = readFileSync("/home/ubuntu/webdev-static-assets/neon_symbol_transparent.png");
const { url } = await storagePut(
  "brand/neon-symbol-transparent-v3.png",
  fileBuffer,
  "image/png"
);
console.log("Uploaded:", url);
