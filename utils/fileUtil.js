import fs from "fs/promises";
import path from "path";

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJSON(filePath) {
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data);
}

export async function writeJSON(filePath, obj) {
  await fs.writeFile(filePath, JSON.stringify(obj, null, 2));
}
